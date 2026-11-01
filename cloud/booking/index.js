// Booking window backend for the hidden test page /test-bron/ (Yandex Cloud Functions, Node.js, no dependencies).
// It is the Yandex-side twin of the three public doors of the BroniOS Worker (broni-auth, Cloudflare): the same
// answers, so the window (BroniOS widget/index.html, ?worker=<this function's address>) works unchanged.
//   GET  /public/config   — hours, step, halls
//   GET  /public/busy     — busy intervals only (no names, no phones)
//   POST /public/request  — a request: an event «🌐 ЗАЯВКА …» in the hall's Google calendar
// Why Google stays: the studio books by hand in the iPhone Calendar, which is synced with Google Calendar, and
// AppEvent reads the same calendars. So the window reads busy time from Google and writes requests to Google;
// the event shows up on Alexey's phone by itself. Only the place where the code runs changes.
//
// Settings (function environment variables, Alexey types them into the console himself, never into a repo):
//   PUBLIC_BOOKING_MODE  — must be "test", otherwise every door answers 404 (same switch as the Worker; it
//                          stays "test" while the calendars below are the test ones)
//   GOOGLE_SA_JSON       — service-account key (the JSON file as text, or its base64). The three hall calendars must
//                          be shared with the service account's e-mail with «Making changes to events»
//     — or —
//   GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN — the OAuth way of the Worker (same client id as in the Worker)
//   ORIGINS              — optional, comma-separated extra page addresses allowed to call the function
// Spam guards as in the Worker: hidden field, ≤ 3 requests per phone per hour, ≤ 5 requests per address per
// minute. The counters live in memory, so the function should run as one instance (like tomsonform).
const crypto = require('node:crypto');

const OAUTH_CLIENT_ID = '809339045814-jjvh7mifdeu2llm5tnmvfqif92cnf8tk.apps.googleusercontent.com';
const TZ_OFFSET = '+07:00'; // Tomsk has no summer time
const HOURS = { open: '08:00', close: '23:00' };
const STEP_MIN = 30;
const MIN_MINUTES = 60;
const MAX_MINUTES = 12 * 60;
const MAX_DAYS = 90;
const HALL_ALIAS = { sfera: 'sphere' }; // the site says «sfera», the calendars say «sphere»
const HALLS = [{ id: 'sphere', name: 'Сфера' }, { id: 'edison', name: 'Эдисон' }, { id: 'vegas', name: 'Вегас' }];
// TEST calendars, the same ids as broni-auth/src/index.js HALL_CALENDARS. Switching to the working calendars is a
// deliberate edit here and in the Worker, not an accident.
const CALENDARS = {
  sphere: '5cd94eec5d9e29ae224dd1d75f8e6d06ce2234570ed22aeb1011df2d996ee5f3@group.calendar.google.com',
  edison: '6f89fde3c9c8fb16463cae64d30e92f3f3b96a3cf9fe3784dcf6d8d7f5616c13@group.calendar.google.com',
  vegas: '8a5d49e1c87dd7cd07e6ee9382732b9515df65b334de1558f3bf6028617ed975@group.calendar.google.com',
};
const ORIGINS = ['https://alexeynovopashin-lab.github.io', 'https://tomson.website.yandexcloud.net',
  'https://novopashin.ru', 'https://www.novopashin.ru', 'https://studiotomson.ru', 'https://www.studiotomson.ru',
  'https://xn--l1acbbod.xn--p1ai', 'https://www.xn--l1acbbod.xn--p1ai', 'http://localhost:8791']
  .concat((process.env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean));

// ---------- small helpers ----------

const pad = (n) => String(n).padStart(2, '0');
const toMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const isHHMM = (v) => /^([01]\d|2[0-3]):[0-5]\d$/.test(v || '');
const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || '') && !Number.isNaN(Date.parse(v + 'T00:00:00Z'));
const cleanText = (v, max) => String(v || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
// Tomsk time as a shifted UTC date: the offset is constant.
function tomskParts(ms) {
  const d = new Date(ms + 7 * 3600000);
  return { date: `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`, time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` };
}
// Russian phone to 11 digits starting with 7 (the Worker's telFull, Russian branch).
function telFull(v) {
  const raw = String(v || '');
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  if (/^\s*\+/.test(raw)) return d;
  if (d.length > 2 && d.slice(0, 2) === '00') return d.slice(2);
  if (d.length === 11 && d[0] === '8') return '7' + d.slice(1);
  if (d.length === 10) return '7' + d;
  return d;
}
function hallOf(id) {
  const key = HALL_ALIAS[id] || id;
  const hall = HALLS.find((h) => h.id === key);
  return hall && CALENDARS[key] ? { ...hall, calendarId: CALENDARS[key] } : null;
}

// ---------- Google access ----------

let cached = { token: '', until: 0 };
const b64url = (b) => Buffer.from(b).toString('base64url');

function serviceAccount() {
  const raw = (process.env.GOOGLE_SA_JSON || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')); } catch { return null; }
}

async function accessToken() {
  if (cached.token && Date.now() < cached.until) return cached.token;
  const sa = serviceAccount();
  let body;
  if (sa && sa.client_email && sa.private_key) {
    const now = Math.floor(Date.now() / 1000);
    const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/calendar',
      aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
    const sig = crypto.createSign('RSA-SHA256').update(`${head}.${claim}`).sign(sa.private_key).toString('base64url');
    body = new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${head}.${claim}.${sig}` });
  } else if (process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN) {
    body = new URLSearchParams({ client_id: OAUTH_CLIENT_ID, client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN, grant_type: 'refresh_token' });
  } else {
    throw new Error('Google access is not set: GOOGLE_SA_JSON or GOOGLE_CLIENT_SECRET + GOOGLE_REFRESH_TOKEN');
  }
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) throw new Error('Google token: ' + (data.error_description || data.error || res.status));
  cached = { token: data.access_token, until: Date.now() + ((data.expires_in || 3600) - 120) * 1000 };
  return cached.token;
}

// Busy intervals of a hall for the given days, in local time. An event over midnight is cut by days.
async function busyIntervals(calendarId, fromDate, toDate) {
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?timeMin=${encodeURIComponent(fromDate + 'T00:00:00' + TZ_OFFSET)}&timeMax=${encodeURIComponent(toDate + 'T23:59:59' + TZ_OFFSET)}` +
    '&singleEvents=true&orderBy=startTime&maxResults=250';
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (!res.ok) throw new Error(`Calendar HTTP ${res.status}`);
  const data = await res.json();
  const out = [];
  for (const ev of data.items || []) {
    if (ev.status === 'cancelled' || !ev.start?.dateTime || !ev.end?.dateTime) continue;
    const s = tomskParts(Date.parse(ev.start.dateTime));
    const e = tomskParts(Date.parse(ev.end.dateTime));
    if (s.date === e.date) { out.push({ date: s.date, start: s.time, end: e.time }); continue; }
    out.push({ date: s.date, start: s.time, end: '24:00' });
    out.push({ date: e.date, start: '00:00', end: e.time });
  }
  return out;
}

// ---------- limits (in memory) ----------

const hits = new Map(); // key -> [times]
function limited(key, max, ms, now = Date.now()) {
  if (hits.size > 5000) hits.clear();
  const mine = (hits.get(key) || []).filter((t) => now - t < ms);
  if (mine.length >= max) { hits.set(key, mine); return true; }
  mine.push(now);
  hits.set(key, mine);
  return false;
}
const seenPhone = (phone, now = Date.now()) => (hits.get('p:' + phone) || []).filter((t) => now - t < 3600e3).length;
const notePhone = (phone, now = Date.now()) => hits.set('p:' + phone, [...(hits.get('p:' + phone) || []).filter((t) => now - t < 3600e3), now]);

// ---------- doors ----------

async function doConfig(reply) {
  return reply(200, { mode: 'test', tz: 'Asia/Tomsk', hours: HOURS, stepMin: STEP_MIN, minMinutes: MIN_MINUTES, maxDays: MAX_DAYS,
    halls: HALLS.map((h) => ({ id: h.id, name: h.name })) });
}

async function doBusy(reply, q) {
  const hall = hallOf(q.hall);
  const from = q.from, to = q.to;
  if (!hall || !isDate(from) || !isDate(to) || to < from) return reply(400, { error: 'Bad request' });
  if ((Date.parse(to) - Date.parse(from)) / 86400000 > 45) return reply(400, { error: 'Range too long' });
  return reply(200, { hall: hall.id, busy: await busyIntervals(hall.calendarId, from, to) });
}

async function doRequest(reply, b) {
  if (!b || typeof b !== 'object') return reply(400, { error: 'Bad request' });
  if (b.website) return reply(200, { ok: true }); // bot trap: «accepted», nothing is made
  const hall = hallOf(b.hall);
  const name = cleanText(b.name, 60);
  const phone = telFull(b.phone);
  const guests = Number(b.guests);
  const note = cleanText(b.note, 300);
  if (!hall) return reply(400, { error: 'Зал не найден' });
  if (name.length < 2) return reply(400, { error: 'Укажите имя' });
  if (!(phone.length === 11 && phone[0] === '7')) return reply(400, { error: 'Проверьте номер телефона' });
  if (!Number.isInteger(guests) || guests < 1 || guests > 30) return reply(400, { error: 'Проверьте число гостей' });
  if (b.consent !== true) return reply(400, { error: 'Нужно согласие с правилами' });
  if (!isDate(b.date) || !isHHMM(b.start) || !isHHMM(b.end)) return reply(400, { error: 'Проверьте дату и время' });

  const s = toMin(b.start), e = toMin(b.end), len = e - s;
  if (s % STEP_MIN || e % STEP_MIN) return reply(400, { error: 'Время должно быть кратно получасу' });
  if (len < MIN_MINUTES || len > MAX_MINUTES) return reply(400, { error: 'Минимум один час' });
  if (s < toMin(HOURS.open) || e > toMin(HOURS.close)) {
    return reply(400, { error: `Онлайн-запись с ${HOURS.open} до ${HOURS.close}. Нужно раньше или позже — напишите администратору` });
  }
  const now = tomskParts(Date.now());
  if (b.date < now.date || (b.date === now.date && s <= toMin(now.time))) return reply(400, { error: 'Это время уже прошло' });
  if ((Date.parse(b.date) - Date.parse(now.date)) / 86400000 > MAX_DAYS) return reply(400, { error: 'Слишком далёкая дата' });

  if (seenPhone(phone) >= 3) return reply(429, { error: 'Слишком много заявок с этого номера, попробуйте позже' });

  // The server checks overlaps, not the window: the time may be taken while the client filled the form.
  const busy = await busyIntervals(hall.calendarId, b.date, b.date);
  if (busy.some((x) => x.date === b.date && toMin(x.start) < e && s < toMin(x.end))) return reply(409, { error: 'busy' });
  notePhone(phone);

  const phoneShown = `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9, 11)}`;
  const price = Number(b.price);
  const description = [
    `Зал: ${hall.name}`,
    `Телефон: ${phoneShown}`,
    `Гостей: ${guests}`,
    'Оплата: -',
    'Статус: заявка с сайта (тест), ждёт подтверждения администратора',
    Number.isFinite(price) && price > 0 ? `Стоимость по расчёту окна: ${price} ₽ (не проверено сервером)` : '',
    note ? `Пожелание клиента: ${note}` : '',
    '',
    'Создано окном брони на сайте · тестовый стенд, сервис в Яндекс Облаке',
  ].filter(Boolean).join('\n');

  const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(hall.calendarId)}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: `🌐 ЗАЯВКА ${name} ${phoneShown}`,
      description,
      start: { dateTime: `${b.date}T${b.start}:00`, timeZone: 'Asia/Tomsk' },
      end: { dateTime: `${b.date}T${b.end}:00`, timeZone: 'Asia/Tomsk' },
    }),
  });
  const ev = await res.json().catch(() => ({}));
  if (!res.ok || !ev.id) {
    console.error('booking: calendar write failed', res.status, JSON.stringify(ev).slice(0, 200));
    return reply(502, { error: 'Не удалось записать заявку, попробуйте ещё раз' });
  }
  return reply(200, { ok: true, hall: hall.id, date: b.date, start: b.start, end: b.end });
}

// ---------- entry ----------

module.exports.handler = async (event) => {
  const headers = event.headers || {};
  const origin = headers.Origin || headers.origin || '';
  const cors = ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  const reply = (statusCode, obj) => ({ statusCode, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' }, body: '' };
  }
  if (process.env.PUBLIC_BOOKING_MODE !== 'test') return reply(404, { error: 'Not found' });

  // The door is the end of the path (…/public/busy); ?op=busy works too if the address has no path.
  const q = event.queryStringParameters || {};
  const path = String(event.path || event.url || '').split('?')[0];
  const door = (path.match(/\/public\/(config|busy|request)\/?$/) || [])[1] || q.op;
  const ip = ((event.requestContext || {}).identity || {}).sourceIp || 'unknown';
  try {
    if (door === 'config' && event.httpMethod === 'GET') return await doConfig(reply);
    if (door === 'busy' && event.httpMethod === 'GET') {
      if (limited('busy:' + ip, 60, 60e3)) return reply(429, { error: 'Too many requests' });
      return await doBusy(reply, q);
    }
    if (door === 'request' && event.httpMethod === 'POST') {
      if (limited('req:' + ip, 5, 60e3)) return reply(429, { error: 'Слишком часто, подождите минуту' });
      let body = null;
      try {
        const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body;
        if (String(raw || '').length > 20000) return reply(413, { error: 'size' });
        body = JSON.parse(raw);
      } catch { /* answered below as Bad request */ }
      return await doRequest(reply, body);
    }
    return reply(404, { error: 'Not found' });
  } catch (e) {
    console.error('booking:', String(e.message).slice(0, 300));
    return reply(500, { error: 'Сервис брони временно недоступен' });
  }
};

module.exports._test = { hits }; // the bench resets the counters between cases
