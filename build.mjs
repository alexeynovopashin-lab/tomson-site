// Static build: content/*.json + src/* + photos/* -> dist/
// Pages are rendered by src/render.mjs, the same code the admin cloud function runs.
// dist/_src/ carries what the function needs to rebuild pages after a price or photo change.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { render, ADMIN_FILES } from './src/render.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dist = join(root, 'dist');

const C = {};
for (const f of readdirSync(join(root, 'content')).filter((n) => n.endsWith('.json'))) {
  C[f] = JSON.parse(readFileSync(join(root, 'content', f), 'utf8'));
}
const versions = {};
for (const slot of Object.keys(C['photos.json'])) {
  versions[slot] = createHash('md5').update(readFileSync(join(root, 'photos', `${slot}.jpg`))).digest('hex').slice(0, 8);
}

const { files, unused } = render(C, versions);

const out = (path, data) => {
  mkdirSync(dirname(join(dist, path)), { recursive: true });
  writeFileSync(join(dist, path), data);
};
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(join(root, 'src/fonts'), join(dist, 'fonts'), { recursive: true });
cpSync(join(root, 'src/img'), join(dist, 'img'), { recursive: true });
cpSync(join(root, 'photos'), join(dist, 'photos'), { recursive: true });
for (const f of ['style.css', 'site.js']) cpSync(join(root, 'src', f), join(dist, f));
for (const { path, html } of files) out(path, html);
cpSync(join(root, 'admin/index.html'), join(dist, 'admin/index.html'));
for (const [f, data] of Object.entries(C)) out(`_src/content/${f}`, JSON.stringify(data, null, 2) + '\n');
out('_src/manifest.json', JSON.stringify({ content: Object.keys(C), adminFiles: ADMIN_FILES, versions }, null, 2) + '\n');
cpSync(join(root, 'src/render.mjs'), join(dist, '_src/render.mjs'));

if (unused.length) console.warn('price keys not shown anywhere:', unused.join(', '));
console.log('built', readdirSync(dist).join(' '));
