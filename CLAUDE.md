Workspace rules: ~/Documents/workspace/CLAUDE.md

# tomson_site — new website of the photo studio «Томсон» (Tomsk)

Replaces the Vigbo site (томсон.рф = xn--l1acbbod.xn--p1ai, novopashin.ru → same
site). Written from scratch, magazine-style layout. Russian audience → hosted
in Yandex Cloud (catalog + bucket `tomson`, test address
https://tomson.website.yandexcloud.net, see `ws:INDEX.md` → Region mirrors). Context and open questions:
Claude memory `tomson-site-migration`, `ws:30_agents/_all.md` («Yandex Cloud и сайт студии»).

## Status
Local git only (no GitHub), domains still on Vigbo. Built and deployed to the test address: home, `zal-edison`, `zal-sfera`, `zal-vegas`,
`oborudovanie`, `pravila_i_cena` (same slugs as the old site; slash-less URLs 302 to them).
Admin `/admin/` works (prices + photos, Alexey's password). Not built: contacts (`kak-najti`), photo school, services, schedule. Nav links to pages that are not ported point to the old site
(`content/site.json` → `oldSite`); `build.mjs` switches a hall link to the new
page when `content/zal-<name>.json` exists.

## The site is the main copy of prices and photos
Alexey edits them in `/admin/` (any device). The page reads `/_src/…` and posts to the cloud
function `tomsonadmin` (`cloud/admin/index.js`, folder `tomson`, public, service account
`deploytomson`, env `ADMIN_PASSWORD` — Alexey's own since 2026-09-25, never ask for it). The function writes
`_src/content/prices.json` or `photos/<slot>.jpg`, re-renders pages with `_src/render.mjs`
from the bucket, keeps the old file in `_src/archive/<time>/`. So:
- ALWAYS `python3 deploy.py` (pull → build → push), never upload `dist/` another way:
  a stale local `prices.json` would overwrite his prices. After a pull, commit the pulled files
  («Из админки: …»). Never edit `content/prices.json` by hand without pulling first.
- `src/render.mjs` is shared by `build.mjs` and the function (uploaded as `_src/render.mjs`), so
  a layout change reaches the function by a normal deploy. `cloud/admin/index.js` changes need a
  new function version (console → function → Редактор → ZIP-архив, entry `index.handler`).
- Test bench without the cloud: `node cloud/admin/local_test.mjs <copy of dist>` (port 8794).

## Layout
- `content/prices.json` — the ONLY place with numbers (hall tiers + `items` with unit, `check` = unverified).
  Texts reference prices by key: `{{pets}}` in rules text, `price` key in `oborudovanie.json`; build
  fails on an unknown key and warns on keys shown nowhere. Change a price → `node build.mjs` → every page.
- `content/*.json` — ALL texts, prices, nav, photo alt/ratio. Alexey decided
  (2026-09-21): texts live in separate files, edited by the agent on request.
- `photos/<slot>.jpg` — one file per place on a page (slot); replaced from the admin (shrunk to
  1800 px in the browser), layout unchanged (ratio in `content/photos.json`, `object-fit: cover`).
  Pages link `?v=<md5 8>` so a new photo shows at once.
- `src/` — `style.css`, `site.js`, self-hosted fonts (Playfair Display, Manrope).
- `build.mjs` — `node build.mjs` → `dist/` (static, root-absolute paths) + `dist/_src/` for the function.
- Deploy: `python3 deploy.py [--dry-run] [--pull-only]` uploads changed files of `dist/` to bucket
  `tomson` (S3 API, keys in `~/.config/tomson/s3.env`, made by Alexey, never in a repo). No deletes.
  HTML/JSON are `no-cache`, photos a year (versioned URLs).
- Preview: `preview_start tomson-site` (port 8791, serves `dist/`; entry lives in
  `light_plan:.claude/launch.json`). Browser caches CSS: hard-reload after a build.

## Booking
AppEvent iframe (`content/zal-*.json` → `booking.widget`) stays as is for launch (2026-09-21);
restyling waits for AppEvent's answer about official API access, else BroniOS.
Payment is manual: request → Telegram/email to Alexey → chat → receipt → manual
confirm. Do not add acquiring.

## Do not
- Put secrets or bank details in this repo (repos are public). Card numbers from
  the client chat templates stay out.
- Publish anywhere before Alexey says so (Yandex bucket, GitHub, DNS).
- Copy Vigbo fonts/Geometria; photos were taken from Vigbo with Alexey's permission
  (2000 px versions, resized to 1800 px, q82).
