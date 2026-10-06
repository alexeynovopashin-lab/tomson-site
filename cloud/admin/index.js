// Admin cloud function (Yandex Cloud Functions, Node.js). The admin page at /admin/ calls it.
// Checks Alexey's password, applies the edit to content in the bucket, re-renders every page
// with _src/render.mjs taken from the same bucket and uploads the pages. The site itself is
// static: this function runs only when Alexey presses «Опубликовать».
// What an edit means (prices, videos, …) lives in render.mjs → adminEdit, so new kinds of edits
// ship with a normal deploy; this file only needs a new version for auth, bucket or photo changes.
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
    put: (key, body, type, cache = NO_CACHE) => call('PUT', key, { body, headers: { 'Content-Type': type, 'Cache-Control': cache } }),
    // keeps the previous version of a file before it is overwritten
    archive: (key, stamp) => call('PUT', `_src/archive/${stamp}/${key}`, {
      headers: { 'x-amz-copy-source': `/${BUCKET}/${key.split('/').map(encodeURIComponent).join('/')}` },
    }).catch((e) => { if (!/ 404 /.test(e.message)) throw e; }), // nothing to keep yet: first photo of a new place
  };
}

// ---------- pages ----------

async function siteModule(b) {
  const code = await b.getText('_src/render.mjs');
  const file = `/tmp/render-${sha256(code).slice(0, 12)}.mjs`;
  if (!fs.existsSync(file)) fs.writeFileSync(file, code);
  return import(pathToFileURL(file).href);
}

async function loadContent(b) {
  const manifest = await b.getJson('_src/manifest.json');
  const C = {};
  await Promise.all(manifest.content.map(async (f) => { C[f] = await b.getJson(`_src/content/${f}`); }));
  return { manifest, C };
}

async function publishPages(b, C, manifest, mod) {
  const { files, other } = (mod || (await siteModule(b))).render(C, manifest.versions); // throws on a broken price key: nothing is uploaded
  await Promise.all(files.map((f) => b.put(f.path, f.html, 'text/html; charset=utf-8')));
  await Promise.all((other || []).map((o) => b.put(o.path, o.body, o.type))); // sitemap.xml (since 2026-10-06)
  return files.map((f) => f.path);
}

// ---------- actions ----------

async function saveEdit(b, req, stamp) {
  const [{ manifest, C }, mod] = await Promise.all([loadContent(b), siteModule(b)]);
  const { changes, files, ...extra } = mod.adminEdit(C, req);
  if (!files.length) return { changes, ...extra };
  const isNew = (f) => !manifest.content.includes(f);
  await Promise.all(files.filter((f) => !isNew(f)).map((f) => b.archive(`_src/content/${f}`, stamp)));
  const pages = await publishPages(b, C, manifest, mod); // pages first: if rendering fails, content stays as it was
  await Promise.all(files.map((f) => b.put(`_src/content/${f}`, JSON.stringify(C[f], null, 2) + '\n', 'application/json')));
  if (files.some(isNew)) {
    manifest.content.push(...files.filter(isNew));
    await b.put('_src/manifest.json', JSON.stringify(manifest, null, 2) + '\n', 'application/json');
  }
  return { changes, pages, ...extra };
}

async function savePhoto(b, req, stamp) {
  const [{ manifest, C }, mod] = await Promise.all([loadContent(b), siteModule(b)]);
  const slot = String(req.slot || '');
  const ok = mod.photoSlotOk ? mod.photoSlotOk(C, slot) : !!C['photos.json'][slot];
  if (!ok || !/^[a-z0-9-]{1,60}$/.test(slot)) throw new UserError('нет такого места для фото');
  const jpeg = Buffer.from(String(req.data || ''), 'base64');
  if (jpeg.length < 1000 || jpeg[0] !== 0xff || jpeg[1] !== 0xd8 || jpeg[2] !== 0xff) throw new UserError('файл не похож на JPEG');
  if (jpeg.length > MAX_PHOTO) throw new UserError('фото больше 2,5 МБ после сжатия');
  const key = `photos/${slot}.jpg`;
  await b.archive(key, stamp);
  await b.put(key, jpeg, 'image/jpeg');
  manifest.versions[slot] = crypto.createHash('md5').update(jpeg).digest('hex').slice(0, 8);
  const pages = await publishPages(b, C, manifest, mod);
  await b.put('_src/manifest.json', JSON.stringify(manifest, null, 2) + '\n', 'application/json');
  return { changes: [`Фото ${slot} заменено`], pages, version: manifest.versions[slot] };
}

// Portfolio photo (version of 2026-10-06): the admin page sends the 1600 px photo and its 700 px
// thumbnail, already shrunk (the canvas drops EXIF). The file name is the content hash, so the same
// photo sent twice lands on the same file and a cached URL never shows a different picture. The
// series list itself is saved afterwards by the 'portfolio' edit (render.mjs → editPortfolio).
const MAX_THUMB = 600 * 1024;
const YEAR = 'public, max-age=31536000, immutable';
async function savePortfolioFile(b, req) {
  const series = String(req.series || '');
  if (!/^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(series)) throw new UserError('неверный номер серии');
  const full = Buffer.from(String(req.full || ''), 'base64'), thumb = Buffer.from(String(req.thumb || ''), 'base64');
  const isJpeg = (j) => j.length > 1000 && j[0] === 0xff && j[1] === 0xd8 && j[2] === 0xff;
  if (!isJpeg(full) || !isJpeg(thumb)) throw new UserError('файл не похож на JPEG');
  if (full.length > MAX_PHOTO || thumb.length > MAX_THUMB) throw new UserError('фото слишком большое после сжатия');
  const f = crypto.createHash('md5').update(full).digest('hex').slice(0, 10);
  const mod = await siteModule(b); // the name prefix lives in render.mjs, so it changes with a normal deploy
  const n = String(mod.PHOTO_PREFIX || '').replace(/[^a-z0-9_-]/g, '') + f;
  await b.put(`photos/p/${series}/${n}.jpg`, full, 'image/jpeg', YEAR);
  await b.put(`photos/p/${series}/t/${n}.jpg`, thumb, 'image/jpeg', YEAR);
  return { f, n };
}

// ---------- http ----------

class UserError extends Error {
  constructor(msg) { super(msg); this.user = true; }
}

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
    if (req.action === 'photo') return reply(200, { ok: true, ...(await savePhoto(b, req, stamp)) });
    if (req.action === 'pfile') return reply(200, { ok: true, ...(await savePortfolioFile(b, req)) });
    return reply(200, { ok: true, ...(await saveEdit(b, req, stamp)) });
  } catch (e) {
    if (e.user) return reply(400, { error: e.message });
    console.error(e);
    return reply(500, { error: 'сайт не изменился: ошибка на сервере', detail: String(e.message).slice(0, 300) });
  }
};
