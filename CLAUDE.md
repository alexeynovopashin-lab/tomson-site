Workspace rules: ~/Documents/workspace/CLAUDE.md

# tomson_site — new website of the photo studio «Томсон» (Tomsk)

Replaces the Vigbo site (томсон.рф = xn--l1acbbod.xn--p1ai, novopashin.ru → same site), magazine layout,
hosted in Yandex Cloud (bucket `tomson`, https://tomson.website.yandexcloud.net, `ws:INDEX.md` → Region
mirrors). Context: memory `tomson-site-migration`, `ws:30_agents/_all.md` («Yandex Cloud и сайт студии»).

## Status
Local git only (no GitHub), domains still on Vigbo. All 11 pages built and live on the test address
(home, 3 halls, equipment, rules, kak-najti, fotosfera, sertifikaty, raspisanie; old slugs kept).
No links to the old site remain. Admin `/admin/` works (prices, photos, equipment videos; Alexey's password).

## The site is the main copy of prices and photos
Alexey edits them in `/admin/` (any device). The page reads `/_src/…` and posts to the cloud
function `tomsonadmin` (`cloud/admin/index.js`, folder `tomson`, public, service account
`deploytomson`, env `ADMIN_PASSWORD` — Alexey's own since 2026-09-25, never ask for it; its form in the
console shows it in plain text: no screenshots below «Точка входа»). It writes admin-owned content
(`render.mjs` → `ADMIN_FILES`: prices.json, videos.json) or `photos/<slot>.jpg`, re-renders pages
with `_src/render.mjs` from the bucket, keeps the old file in `_src/archive/<time>/`. So:
- ALWAYS `python3 deploy.py` (pull → build → push), never upload `dist/` another way:
  a stale local `prices.json` would overwrite his prices. After a pull, commit the pulled files
  («Из админки: …»). Never edit `content/prices.json` by hand without pulling first.
- `src/render.mjs` is shared by `build.mjs`, the function and the admin page (`adminEdit` = what an
  edit means, `vkEmbed` = VK link check), so layout and new kinds of edits ship by a normal deploy.
  Only auth/bucket/photo changes in `cloud/admin/index.js` need a new function version (console →
  function → Редактор → ZIP-архив, entry `index.handler`).
- Bench without the cloud: `node cloud/admin/local_test.mjs <copy of dist>` (8794).

## Layout
- `content/prices.json` — the ONLY place with numbers (hall tiers + `items` with unit, `check` = unverified).
  Texts reference prices by key: `{{pets}}` in rules text, `price` key in `oborudovanie.json`; build
  fails on an unknown key and warns on keys shown nowhere. Change a price → `node build.mjs` → every page.
- `content/*.json` — ALL texts, prices, nav, photo alt/ratio; texts edited by the agent on request.
- Equipment: `content/oborudovanie.json` items have `id` (anchor, video key) and `photo` (`eq-<id>`,
  66 pictures from Vigbo; stands have none — Vigbo had blank placeholders). `content/videos.json`
  {id: VK player URL} → «Смотреть в работе» button, player over the page (`site.js`).
- `photos/<slot>.jpg` — one file per place on a page (slot); replaced from the admin (shrunk to
  1800 px in the browser), layout unchanged (ratio in `content/photos.json`, `object-fit: cover`).
  Pages link `?v=<md5 8>` so a new photo shows at once.
- `src/` — `style.css`, `site.js`, self-hosted fonts (Playfair Display, Manrope).
- `build.mjs` — `node build.mjs` → `dist/` (static, root-absolute paths) + `dist/_src/` for the function.
- Deploy: `python3 deploy.py [--dry-run] [--pull-only]` uploads changed files of `dist/` to bucket
  `tomson` (S3 API, keys in `~/.config/tomson/s3.env`, made by Alexey, never in a repo). No deletes.
  HTML/JSON are `no-cache`, photos a year (versioned URLs).
- Preview: `preview_start tomson-site` (8791, `dist/`; entry in `light_plan:.claude/launch.json`).

## Booking
AppEvent iframe (`content/zal-*.json` → `booking.widget`) stays as is for launch (2026-09-21);
restyling waits for AppEvent's answer about official API access, else BroniOS.
Payment is manual: request → Telegram/email to Alexey → chat → receipt → manual
confirm. Do not add acquiring.

## Do not
- Put secrets or bank details in this repo (repos are public), incl. card numbers from chat templates.
- Publish anywhere before Alexey says so (Yandex bucket, GitHub, DNS).
- Copy Vigbo fonts/Geometria; photos were taken from Vigbo with Alexey's permission (resized, q82).
