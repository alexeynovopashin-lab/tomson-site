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
// files that must sit at the site root: Yandex Webmaster / Google Search Console ownership (copied from Vigbo)
cpSync(join(root, 'src/root'), dist, { recursive: true });
// robots.txt and sitemap.xml: built here, not in render.mjs — the admin function uploads render output as HTML,
// and the page list does not change with prices or photos
const siteUrl = C['site.json'].siteUrl;
const pageUrls = files.map((f) => '/' + f.path.replace(/index\.html$/, '')).filter((u) => u !== '/poisk/');
out('robots.txt', `User-agent: *\nDisallow: /admin/\nDisallow: /_src/\nDisallow: /poisk/\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);
if (siteUrl) out('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pageUrls.map((u) => `<url><loc>${siteUrl}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
for (const [f, data] of Object.entries(C)) out(`_src/content/${f}`, JSON.stringify(data, null, 2) + '\n');
out('_src/manifest.json', JSON.stringify({ content: Object.keys(C), adminFiles: ADMIN_FILES, versions }, null, 2) + '\n');
cpSync(join(root, 'src/render.mjs'), join(dist, '_src/render.mjs'));

if (unused.length) console.warn('price keys not shown anywhere:', unused.join(', '));
console.log('built', readdirSync(dist).join(' '));
