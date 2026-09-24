// Admin cloud function (Yandex Cloud Functions, Node.js). The admin page at /admin/ calls it.
// Checks Alexey's password, saves new prices or a photo into the bucket, re-renders every page
// with _src/render.mjs taken from the same bucket and uploads the pages. The site itself is
// static: this function runs only when Alexey presses «Опубликовать».
//
// Settings (function environment variables):
//   ADMIN_PASSWORD  — the password; Alexey types it into the console himself
//   ORIGINS         — optional, comma-separated extra site addresses allowed to call the function
// Bucket access: the function's service account (IAM token from the context). For a local test
// run, AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY switch it to a signed static key instead.
const crypto = require('node:crypto');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

const BUCKET = 'tomson';
const HOST = 'storage.yandexcloud.net';
const ORIGINS = ['https://tomson.website.yandexcloud.net', 'https://xn--l1acbbod.xn--p1ai', 'https://www.xn--l1acbbod.xn--p1ai']
  .concat((process.env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean));
const MAX_PHOTO = 2.5 * 1024 * 1024; // the page shrinks photos to 1800 px first; the request limit is 3.5 MB
const NO_CACHE = 'no-cache';

// ---------- bucket ----------

const sha256 = (d) => crypto.createHash('sha256').update(d).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

function sigv4(method, key, headers, body) {
  const now = new Date().toISOString().replace(/[-:]|\.\d{3}/g, '');
  const date = now.slice(0, 8);
  const scope = `${date}/ru-central1/s3/aws4_request`;
  const h = { ...headers, host: HOST, 'x-amz-date': now, 'x-amz-content-sha256': sha256(body) };
  const names = Object.keys(h).map((n) => n.toLowerCase()).sort();
  const lower = Object.fromEntries(Object.entries(h).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const path = '/' + BUCKET + '/' + key.split('/').map(encodeURIComponent).join('/');
  const canon = [method, path, '', names.map((n) => `${n}:${lower[n]}\n`).join(''), names.join(';'), lower['x-amz-content-sha256']].join('\n');
  const toSign = ['AWS4-HMAC-SHA256', now, scope, sha256(canon)].join('\n');
  let k = hmac('AWS4' + process.env.AWS_SECRET_ACCESS_KEY, date);
  for (const part of ['ru-central1', 's3', 'aws4_request']) k = hmac(k, part);
  const sig = crypto.createHmac('sha256', k).update(toSign).digest('hex');
  delete h.host;
  h.Authorization = `AWS4-HMAC-SHA256 Credential=${process.env.AWS_ACCESS_KEY_ID}/${scope}, SignedHeaders=${names.join(';')}, Signature=${sig}`;
  return h;
}

function bucket(token) {
  async function call(method, key, { body = '', headers = {} } = {}) {
    const h = process.env.AWS_ACCESS_KEY_ID ? sigv4(method, key, headers, body) : { ...headers, 'X-YaCloud-SubjectToken': token };
    const url = `https://${HOST}/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const r = await fetch(url, { method, headers: h, body: method === 'GET' ? undefined : body });
    if (!r.ok) throw new Error(`bucket ${method} ${key}: ${r.status} ${(await r.text()).slice(0, 300)}`);
    return r;
  }
  return {
    getJson: async (key) => (await call('GET', key)).json(),
    getText: async (key) => (await call('GET', key)).text(),
    put: (key, body, type) => call('PUT', key, { body, headers: { 'Content-Type': type, 'Cache-Control': NO_CACHE } }),
    // keeps the previous version of a file before it is overwritten
    archive: (key, stamp) => call('PUT', `_src/archive/${stamp}/${key}`, {
      headers: { 'x-amz-copy-source': `/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}` },
    }),
  };
}

// ---------- pages ----------

async function renderer(b) {
  const code = await b.getText('_src/render.mjs');
  const file = `/tmp/render-${sha256(code).slice(0, 12)}.mjs`;
  if (!fs.existsSync(file)) fs.writeFileSync(file, code);
  return (await import(pathToFileURL(file).href)).render;
}

async function loadContent(b) {
  const manifest = await b.getJson('_src/manifest.json');
  const C = {};
  await Promise.all(manifest.content.map(async (f) => { C[f] = await b.getJson(`_src/content/${f}`); }));
  return { manifest, C };
}

async function publishPages(b, C, manifest) {
  const render = await renderer(b);
  const { files } = render(C, manifest.versions); // throws on a broken price key: nothing is uploaded
  await Promise.all(files.map((f) => b.put(f.path, f.html, 'text/html; charset=utf-8')));
  return files.map((f) => f.path);
}

// ---------- actions ----------

function checkPrice(v, label) {
  if (!Number.isInteger(v) || v < 0 || v > 1_000_000) throw new UserError(`${label}: цена должна быть целым числом рублей`);
  return v;
}

async function savePrices(b, req, stamp) {
  const { manifest, C } = await loadContent(b);
  const prices = C['prices.json'];
  const changes = [];
  for (const [hk, vals] of Object.entries(req.halls || {})) {
    const tiers = prices.halls[hk];
    if (!tiers || !Array.isArray(vals) || vals.length !== tiers.length) throw new UserError('зал или ступени не совпадают с сайтом, обновите страницу');
    tiers.forEach((t, i) => {
      const n = checkPrice(vals[i], `${C['halls.json'][hk].name}, ${t.people}`);
      if (n !== t.price) changes.push(`${C['halls.json'][hk].name}, ${t.people}: ${t.price} → ${n}`);
      t.price = n;
    });
  }
  for (const [k, upd] of Object.entries(req.items || {})) {
    const it = prices.items[k];
    if (!it) throw new UserError('такой позиции уже нет на сайте, обновите страницу');
    if ('price' in upd) {
      const n = checkPrice(upd.price, it.label);
      if (it.unit === 'percent' && n > 100) throw new UserError(`${it.label}: процент больше 100`);
      if (n !== it.price) { changes.push(`${it.label}: ${it.price} → ${n}`); delete it.check; }
      it.price = n;
    }
    if (upd.check === false && it.check) { changes.push(`${it.label}: цена ${it.price} проверена`); delete it.check; }
  }
  if (!changes.length) return { changes };
  await b.archive('_src/content/prices.json', stamp);
  const pages = await publishPages(b, C, manifest); // pages first: if rendering fails, prices stay as they were
  await b.put('_src/content/prices.json', JSON.stringify(prices, null, 2) + '\n', 'application/json');
  return { changes, pages };
}

async function savePhoto(b, req, stamp) {
  const { manifest, C } = await loadContent(b);
  const slot = String(req.slot || '');
  if (!C['photos.json'][slot]) throw new UserError('нет такого места для фото');
  const jpeg = Buffer.from(String(req.data || ''), 'base64');
  if (jpeg.length < 1000 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) throw new UserError('файл не похож на JPEG');
  if (jpeg.length > MAX_PHOTO) throw new UserError('фото больше 2,5 МБ после сжатия');
  const key = `photos/${slot}.jpg`;
  await b.archive(key, stamp);
  await b.put(key, jpeg, 'image/jpeg');
  manifest.versions[slot] = crypto.createHash('md5').update(jpeg).digest('hex').slice(0, 8);
  const pages = await publishPages(b, C, manifest);
  await b.put('_src/manifest.json', JSON.stringify(manifest, null, 2) + '\n', 'application/json');
  return { changes: [`Фото ${slot} заменено`], pages, version: manifest.versions[slot] };
}

// ---------- http ----------

class UserError extends Error {}

function passwordOk(given) {
  const want = process.env.ADMIN_PASSWORD || '';
  if (want.length < 10) return false; // not configured, or too short to be left open to the internet
  return crypto.timingSafeEqual(Buffer.from(sha256(String(given || '')), 'hex'), Buffer.from(sha256(want), 'hex'));
}

module.exports.handler = async (event, context) => {
  const origin = (event.headers || {}).Origin || (event.headers || {}).origin || '';
  const cors = ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  const reply = (statusCode, obj) => ({ statusCode, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Max-Age': '86400' }, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'только POST' });
  if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'чужой адрес' });

  let req;
  try {
    req = JSON.parse(event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString() : event.body);
  } catch {
    return reply(400, { error: 'не удалось прочитать запрос' });
  }
  if (!passwordOk(req.password)) {
    await new Promise((r) => setTimeout(r, 1500)); // slows down guessing
    return reply(401, { error: 'неверный пароль' });
  }
  const b = bucket(context && context.token && context.token.access_token);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    // login also proves the function can reach the bucket, so a broken setup shows up at once
    if (req.action === 'check') { await b.getJson('_src/manifest.json'); return reply(200, { ok: true }); }
    if (req.action === 'prices') return reply(200, { ok: true, ...(await savePrices(b, req, stamp)) });
    if (req.action === 'photo') return reply(200, { ok: true, ...(await savePhoto(b, req, stamp)) });
    return reply(400, { error: 'нет такого действия' });
  } catch (e) {
    if (e instanceof UserError) return reply(400, { error: e.message });
    console.error(e);
    return reply(500, { error: 'сайт не изменился: ошибка на сервере', detail: String(e.message).slice(0, 300) });
  }
};
