// Bench for the booking function without network and without Google: the calendar is a list in memory.
// Run: node cloud/booking/local_test.mjs
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const fn = require('./index.js');

const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const sa = { client_email: 'booking@test.iam.gserviceaccount.com', private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }) };
process.env.PUBLIC_BOOKING_MODE = 'test';
process.env.GOOGLE_SA_JSON = Buffer.from(JSON.stringify(sa)).toString('base64'); // base64 form

let events = [];
let urls = []; // calendars the function touched
let tokenCalls = 0;
let lastAssertion = '';
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u === 'https://oauth2.googleapis.com/token') {
    tokenCalls++;
    lastAssertion = String(init.body.get('assertion') || '');
    return new Response(JSON.stringify({ access_token: 'fake', expires_in: 3600 }), { status: 200 });
  }
  if (!u.includes('googleapis.com/calendar')) throw new Error('unexpected fetch ' + u);
  urls.push(decodeURIComponent(u));
  if ((init.method || 'GET') === 'POST') {
    const body = JSON.parse(init.body);
    const ev = { id: 'e' + (events.length + 1), start: { dateTime: body.start.dateTime + '+07:00' }, end: { dateTime: body.end.dateTime + '+07:00' }, summary: body.summary, description: body.description };
    events.push(ev);
    return new Response(JSON.stringify(ev), { status: 200 });
  }
  return new Response(JSON.stringify({ items: events }), { status: 200 });
};

const GH = 'https://alexeynovopashin-lab.github.io';
const call = (path, method = 'GET', body, ip = '1.1.1.1', origin = GH) => {
  const [p, qs] = path.split('?');
  const queryStringParameters = Object.fromEntries(new URLSearchParams(qs || ''));
  return fn.handler({ httpMethod: method, path: '/f4eXXXX' + p, queryStringParameters, headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined, requestContext: { identity: { sourceIp: ip } } });
};
const parse = (r) => JSON.parse(r.body);
const future = (days) => new Date(Date.now() + 7 * 3600000 + days * 86400000).toISOString().slice(0, 10);
const ok = { hall: 'edison', date: future(3), start: '12:00', end: '14:00', guests: 4, name: 'Тест Тестов', phone: '8 913 000-11-22', consent: true, price: 3200 };

// off without the variable; preflight answers anyway
process.env.PUBLIC_BOOKING_MODE = '';
assert.equal((await call('/public/config')).statusCode, 404);
process.env.PUBLIC_BOOKING_MODE = 'test';
assert.equal((await call('/public/config')).statusCode, 200);
const pre = await call('/public/request', 'OPTIONS');
assert.equal(pre.statusCode, 204);
assert.equal(pre.headers['Access-Control-Allow-Origin'], GH);
// a stranger's page gets no CORS permission
assert.equal((await call('/public/config', 'GET', null, '1.1.1.1', 'https://evil.example')).headers['Access-Control-Allow-Origin'], undefined);
// the address with no path works through ?op=
const viaOp = await fn.handler({ httpMethod: 'GET', headers: { Origin: GH }, queryStringParameters: { op: 'config' } });
assert.equal(viaOp.statusCode, 200);
assert.deepEqual(parse(await call('/public/config')).halls.map((h) => h.id), ['sphere', 'edison', 'vegas']);

// a request makes an event and shows nothing foreign; the token is signed by the service account
let r = await call('/public/request', 'POST', ok);
assert.equal(r.statusCode, 200); assert.equal(events.length, 1);
assert.match(events[0].summary, /ЗАЯВКА Тест Тестов \+7 913 000-11-22/);
assert.match(events[0].description, /Телефон: \+7 913 000-11-22/);
assert.equal(lastAssertion.split('.').length, 3);
assert.equal(JSON.parse(Buffer.from(lastAssertion.split('.')[1], 'base64url')).iss, sa.client_email);
const callsAfterFirst = tokenCalls;

// busy time is visible as an interval without names; the token is reused
r = await call(`/public/busy?hall=edison&from=${ok.date}&to=${ok.date}`);
assert.deepEqual(parse(r).busy, [{ date: ok.date, start: '12:00', end: '14:00' }]);
assert.equal(tokenCalls, callsAfterFirst);
// «sfera» from the site is the calendar «sphere»
assert.equal(parse(await call(`/public/busy?hall=sfera&from=${ok.date}&to=${ok.date}`)).hall, 'sphere');

// an event over midnight is cut by days
events.push({ id: 'n', start: { dateTime: `${future(5)}T22:00:00+07:00` }, end: { dateTime: `${future(6)}T01:00:00+07:00` } });
assert.deepEqual(parse(await call(`/public/busy?hall=edison&from=${future(5)}&to=${future(6)}`)).busy.slice(-2),
  [{ date: future(5), start: '22:00', end: '24:00' }, { date: future(6), start: '00:00', end: '01:00' }]);

// overlap 409; back to back (14:00–15:00) is allowed
assert.equal((await call('/public/request', 'POST', { ...ok, start: '13:00', end: '15:00', phone: '89130001133' }, '2.2.2.2')).statusCode, 409);
assert.equal((await call('/public/request', 'POST', { ...ok, start: '14:00', end: '15:00', phone: '89130001144' }, '3.3.3.3')).statusCode, 200);

// input checks
const bad = async (patch, status = 400) => assert.equal((await call('/public/request', 'POST', { ...ok, phone: '89130002200', ...patch }, '9.' + Math.random())).statusCode, status, JSON.stringify(patch));
await bad({ start: '12:15' });
await bad({ start: '12:00', end: '12:30' });
await bad({ start: '07:00', end: '09:00' });
await bad({ start: '22:00', end: '23:30' });
await bad({ date: future(-1) });
await bad({ date: future(200) });
await bad({ phone: '123' });
await bad({ name: '' });
await bad({ guests: 99 });
await bad({ consent: false });
await bad({ hall: 'nope' });
assert.equal((await fn.handler({ httpMethod: 'POST', path: '/x/public/request', headers: { Origin: GH }, body: '{not json', requestContext: {} })).statusCode, 400);

// bot trap: «accepted», no event
const before = events.length;
assert.equal((await call('/public/request', 'POST', { ...ok, website: 'spam' }, '4.4.4.4')).statusCode, 200);
assert.equal(events.length, before);

// per-phone limit: the fourth request in an hour is refused
for (let i = 0; i < 3; i++) assert.equal((await call('/public/request', 'POST', { ...ok, date: future(10 + i), phone: '89130007777' }, `5.5.${i}.1`)).statusCode, 200);
assert.equal((await call('/public/request', 'POST', { ...ok, date: future(20), phone: '89130007777' }, '6.6.6.6')).statusCode, 429);

// per-address limit: the sixth request from one address in a minute
for (let i = 0; i < 5; i++) await call('/public/request', 'POST', { ...ok, website: 'x' }, '7.7.7.7');
assert.equal((await call('/public/request', 'POST', ok, '7.7.7.7')).statusCode, 429);

// ---- working Vegas calendar, only inside the test window (fail-closed) ----
const LIVE = 'live-vegas@group.calendar.google.com';
process.env.VEGAS_CALENDAR_ID = LIVE;
const vegas = { ...ok, hall: 'vegas', phone: '89130003300', start: '08:00', end: '09:00', date: future(4) };
// no window: Vegas is not served at all, other halls still use the test calendars
delete process.env.TEST_WINDOW;
assert.equal((await call('/public/request', 'POST', vegas, '10.0.0.1')).statusCode, 400);
assert.equal((await call(`/public/busy?hall=vegas&from=${vegas.date}&to=${vegas.date}`, 'GET', null, '10.0.0.2')).statusCode, 400);
urls = [];
assert.equal((await call('/public/request', 'POST', { ...ok, phone: '89130004400', date: future(7) }, '10.0.0.3')).statusCode, 200);
assert.ok(!urls.some((x) => x.includes(LIVE)), 'edison must not touch the working Vegas calendar');
// a window shorter than the minimum hour is ignored (normal hours come back), so Vegas stays closed
process.env.TEST_WINDOW = '08:00-08:30';
assert.equal((await call('/public/request', 'POST', vegas, '10.0.0.4')).statusCode, 400);
// with the window: config shows it, a request inside goes to the working calendar, outside is refused
process.env.TEST_WINDOW = '08:00-09:00';
assert.deepEqual(parse(await call('/public/config', 'GET', null, '10.0.0.5')).hours, { open: '08:00', close: '09:00' });
urls = [];
assert.equal((await call('/public/request', 'POST', vegas, '10.0.0.6')).statusCode, 200);
assert.ok(urls.some((x) => x.includes(`/calendars/${LIVE}/events`) && !x.includes('?')), 'the event is written to the working calendar');
assert.equal((await call('/public/request', 'POST', { ...vegas, phone: '89130005500', start: '12:00', end: '14:00' }, '10.0.0.7')).statusCode, 400);
assert.equal((await call('/public/request', 'POST', { ...vegas, phone: '89130006600', start: '08:00', end: '10:00' }, '10.0.0.8')).statusCode, 400);
assert.equal((await call(`/public/busy?hall=vegas&from=${vegas.date}&to=${vegas.date}`, 'GET', null, '10.0.0.9')).statusCode, 200);
// the night window works the same way
process.env.TEST_WINDOW = '22:00-23:00';
assert.equal((await call('/public/request', 'POST', { ...vegas, phone: '89130007700', start: '22:00', end: '23:00', date: future(8) }, '10.0.1.1')).statusCode, 200);
assert.equal((await call('/public/request', 'POST', { ...vegas, phone: '89130008800', start: '08:00', end: '09:00', date: future(8) }, '10.0.1.2')).statusCode, 400);
console.log('booking function: all checks passed');
