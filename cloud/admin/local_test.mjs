// Local test bench for the admin function: no cloud involved.
//   node cloud/admin/local_test.mjs <folder>
// <folder> plays the bucket (start from a copy of dist/). Serves it at http://127.0.0.1:8794/
// and runs the function at http://127.0.0.1:8794/fn, so open
//   http://127.0.0.1:8794/admin/?api=http://127.0.0.1:8794/fn      password: localtest123
import { createServer } from 'node:http';
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, statSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { createRequire } from 'node:module';

const dir = process.argv[2];
if (!dir || !existsSync(join(dir, '_src/manifest.json'))) throw new Error('usage: node local_test.mjs <copy of dist/>');
const PORT = 8794;
process.env.ADMIN_PASSWORD = 'localtest123';
process.env.ORIGINS = `http://127.0.0.1:${PORT}`;
delete process.env.AWS_ACCESS_KEY_ID;

// the bucket: storage.yandexcloud.net/tomson/<key> -> <dir>/<key>
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, opt = {}) => {
  const m = String(url).match(/^https:\/\/storage\.yandexcloud\.net\/tomson\/(.+)$/);
  if (!m) return realFetch(url, opt);
  const key = decodeURIComponent(m[1]);
  const file = join(dir, key);
  const h = opt.headers || {};
  if (h['X-YaCloud-SubjectToken'] !== 'fake-token') return new Response('no token', { status: 403 });
  if (opt.method === 'GET') return existsSync(file) ? new Response(readFileSync(file)) : new Response('NoSuchKey', { status: 404 });
  if (opt.method === 'PUT') {
    mkdirSync(dirname(file), { recursive: true });
    const src = h['x-amz-copy-source'];
    if (src) {
      const from = join(dir, decodeURIComponent(src.replace(/^\/tomson\//, '')));
      if (!existsSync(from)) return new Response('NoSuchKey', { status: 404 });
      copyFileSync(from, file);
    } else writeFileSync(file, opt.body);
    console.log('  PUT', key, src ? `(copy of ${src})` : '');
    return new Response('', { status: 200 });
  }
  return new Response('method', { status: 405 });
};

const { handler } = createRequire(import.meta.url)('./index.js');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };

createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  if (url.pathname === '/fn') {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const out = await handler(
      { httpMethod: req.method, headers: req.headers, body: Buffer.concat(chunks).toString(), isBase64Encoded: false },
      { token: { access_token: 'fake-token' } },
    );
    res.writeHead(out.statusCode, out.headers);
    return res.end(out.body);
  }
  let file = join(dir, decodeURIComponent(url.pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); return res.end('not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
  res.end(readFileSync(file));
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/admin/?api=http://127.0.0.1:${PORT}/fn`));
