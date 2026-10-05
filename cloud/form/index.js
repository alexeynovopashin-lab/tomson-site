// Request form cloud function (Yandex Cloud Functions, Node.js). The form on the site posts here;
// the function emails the request to Alexey through Yandex Mail (SMTP, app password).
// Separate from tomsonadmin on purpose: this one is public and needs no bucket, no admin password.
// No dependencies: the SMTP talk is a few lines over node:tls. Code changes ship as a new function
// version (console → function → Редактор), the environment variables stay as they are.
//
// Settings (function environment variables, Alexey types them into the console himself):
//   SMTP_USER      — the Yandex mailbox that sends, full address
//   SMTP_PASSWORD  — its app password (Яндекс ID → Безопасность → Пароли приложений → Почта)
//   MAIL_TO        — where requests go, comma-separated; default SMTP_USER
//   ORIGINS        — optional, comma-separated extra site addresses allowed to call the function
// Spam guard: a hidden field people never fill (bots do), a minimum time on the page, a rate
// limit per address and per hour. The limits live in memory, so the function is set to one
// instance (scaling policy); a fresh instance starts with clean counters, which is acceptable.
const tls = require('node:tls');
const crypto = require('node:crypto');

const ORIGINS = ['https://tomson.website.yandexcloud.net', 'https://xn--l1acbbod.xn--p1ai', 'https://www.xn--l1acbbod.xn--p1ai']
  .concat((process.env.ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean));
const SMTP_HOST = 'smtp.yandex.ru';
const SMTP_PORT = 465;
const PER_IP = { max: 3, ms: 10 * 60e3 };   // 3 requests from one address in 10 minutes
const PER_HOUR = 30;                        // all addresses together
const MIN_FILL_MS = 3000;                   // faster than this is a script, not a person
const LIMITS = { name: 80, phone: 40, interest: 60, message: 2000 };

// ---------- rate limit ----------

const hits = new Map(); // ip -> [times]
let hourly = [];
function limited(ip, now) {
  hourly = hourly.filter((t) => now - t < 3600e3);
  const mine = (hits.get(ip) || []).filter((t) => now - t < PER_IP.ms);
  if (hits.size > 5000) hits.clear();
  if (mine.length >= PER_IP.max || hourly.length >= PER_HOUR) return true;
  mine.push(now);
  hits.set(ip, mine);
  hourly.push(now);
  return false;
}

// ---------- mail ----------

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');
const header = (s) => `=?UTF-8?B?${b64(s)}?=`;
const addr = (s) => String(s || '').trim();
const okAddr = (s) => /^[^\s<>@,"]+@[^\s<>@,"]+\.[^\s<>@,"]+$/.test(s);

function message({ from, to, subject, text }) {
  const body = b64(text.replace(/\r?\n/g, '\r\n')).replace(/.{76}/g, '$&\r\n');
  return [
    `From: ${header('Сайт «Томсон»')} <${from}>`,
    `To: ${to.join(', ')}`,
    `Subject: ${header(subject)}`,
    `Date: ${new Date().toUTCString().replace('GMT', '+0000')}`,
    `Message-ID: <${crypto.randomUUID()}@${from.split('@')[1]}>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

// Plain SMTP over TLS: each command waits for its reply code; a wrong code stops with an error.
function sendMail({ user, pass, to, subject, text }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host: SMTP_HOST, port: SMTP_PORT, servername: SMTP_HOST });
    sock.setTimeout(15000, () => sock.destroy(new Error('smtp timeout')));
    sock.on('error', reject);
    let buf = '';
    let waiter = null;
    sock.on('data', (d) => {
      buf += d.toString('utf8');
      const lines = buf.split('\r\n');
      const last = lines.findIndex((l) => /^\d{3} /.test(l)); // multi-line replies end with "250 "
      if (last < 0 || !waiter) return;
      const reply = lines.slice(0, last + 1).join('\n');
      buf = lines.slice(last + 1).join('\r\n');
      const w = waiter; waiter = null; w(reply);
    });
    // name = what goes to the log on failure; never the command itself (it may carry the password)
    const step = (cmd, want, name) => new Promise((res, rej) => {
      waiter = (reply) => (reply.slice(0, 3) === want ? res(reply) : rej(new Error(`smtp ${name}: ${reply.slice(0, 200)}`)));
      if (cmd !== null) sock.write(cmd + '\r\n');
    });
    (async () => {
      await step(null, '220', 'greeting');
      await step('EHLO tomson-site', '250', 'ehlo');
      await step('AUTH LOGIN', '334', 'auth');
      await step(b64(user), '334', 'user');
      await step(b64(pass), '235', 'password');
      await step(`MAIL FROM:<${user}>`, '250', 'from');
      for (const r of to) await step(`RCPT TO:<${r}>`, '250', 'to');
      await step('DATA', '354', 'data');
      // dot-stuffing is not needed: the body is base64, no line starts with "."
      await step(message({ from: user, to, subject, text }) + '\r\n.', '250', 'message');
      sock.end('QUIT\r\n');
    })().then(resolve, (e) => { sock.destroy(); reject(e); });
  });
}

// ---------- request ----------

const clean = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '').trim().slice(0, max);

function readForm(req) {
  const f = {
    name: clean(req.name, LIMITS.name).replace(/\s+/g, ' '),
    phone: clean(req.phone, LIMITS.phone).replace(/\s+/g, ' '),
    interest: clean(req.interest, LIMITS.interest).replace(/\s+/g, ' '),
    message: clean(req.message, LIMITS.message),
    page: clean(req.page, 200),
  };
  if (!f.name || (f.phone.match(/\d/g) || []).length < 5) return null; // the page checks this too
  return f;
}

module.exports.handler = async (event) => {
  const headers = event.headers || {};
  const origin = headers.Origin || headers.origin || '';
  const cors = ORIGINS.includes(origin) ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {};
  const reply = (statusCode, obj) => ({ statusCode, headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(obj) });
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Max-Age': '86400' }, body: '' };
  if (event.httpMethod !== 'POST') return reply(405, { error: 'method' });
  if (!cors['Access-Control-Allow-Origin']) return reply(403, { error: 'origin' });

  let req;
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString() : event.body;
    if (String(raw || '').length > 20000) return reply(413, { error: 'size' });
    req = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'json' });
  }
  // trap: the hidden field is filled or the form went out too fast. The bot is told «sent»,
  // so it has no reason to try again; no mail is made.
  if (clean(req.website, 200) || !(Number(req.elapsed) >= MIN_FILL_MS)) return reply(200, { ok: true });

  const form = readForm(req);
  if (!form) return reply(400, { error: 'fields' });

  const ip = ((event.requestContext || {}).identity || {}).sourceIp || 'unknown';
  if (limited(ip, Date.now())) return reply(429, { error: 'rate' });

  const user = addr(process.env.SMTP_USER);
  const pass = process.env.SMTP_PASSWORD || '';
  const to = (process.env.MAIL_TO || user).split(',').map(addr).filter(okAddr);
  if (!okAddr(user) || !pass || !to.length) {
    console.error('form: SMTP_USER / SMTP_PASSWORD / MAIL_TO are not set');
    return reply(500, { error: 'setup' });
  }
  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tomsk' });
  const text = [
    `Имя: ${form.name}`,
    `Телефон: ${form.phone}`,
    `Интересует: ${form.interest || '—'}`,
    '',
    form.message || '(без сообщения)',
    '',
    '—',
    `Отправлено ${when} (Томск) со страницы ${form.page || '—'}`,
  ].join('\n');
  try {
    await sendMail({ user, pass, to, subject: `Заявка с сайта: ${form.interest || form.name}`, text });
    return reply(200, { ok: true });
  } catch (e) {
    console.error('form: mail failed', String(e.message).slice(0, 300));
    return reply(502, { error: 'mail' });
  }
};
