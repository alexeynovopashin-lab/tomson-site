Workspace rules: ~/Documents/workspace/CLAUDE.md

# tomson_site — new website of the photo studio «Томсон» (Tomsk)

Replaces the Vigbo site (томсон.рф = xn--l1acbbod.xn--p1ai, novopashin.ru → same
site). Written from scratch, magazine-style layout. Russian audience → hosted
in Yandex Cloud (catalog + bucket `tomson`, test address
https://tomson.website.yandexcloud.net, see `ws:INDEX.md` → Region mirrors). Context and open questions:
Claude memory `tomson-site-migration`, `ws:30_agents/_all.md` («Yandex Cloud и сайт студии»).

## Status
Test build uploaded by hand to the `tomson` bucket (no commits, no GitHub, domains still on Vigbo, deploy via `deploy.py`). Built and deployed to the test address: home, `zal-edison`, `zal-sfera`, `zal-vegas`,
`oborudovanie`, `pravila_i_cena` (same slugs as the old site; slash-less URLs 302 to them).
Not built: contacts (`kak-najti`), photo school, services, schedule, admin (photos + prices). Nav links to pages that are not ported point to the old site
(`content/site.json` → `oldSite`); `build.mjs` switches a hall link to the new
page when `content/zal-<name>.json` exists.

## Layout
- `content/prices.json` — the ONLY place with numbers (hall tiers + `items` with unit, `check` = unverified).
  Texts reference prices by key: `{{pets}}` in rules text, `price` key in `oborudovanie.json`; build
  fails on an unknown key and warns on keys shown nowhere. Change a price → `node build.mjs` → every page.
- `content/*.json` — ALL texts, prices, nav, photo alt/ratio. Alexey decided
  (2026-09-21): texts live in separate files, edited by the agent on request.
- `photos/<slot>.jpg` — one file per place on a page (slot). Alexey wants to
  replace photos himself through an admin panel (photos only): upload a file →
  it lands in the same slot, layout unchanged (ratio in `content/photos.json`,
  `object-fit: cover`). Panel is NOT built yet.
- `src/` — `style.css`, `site.js`, self-hosted fonts (Playfair Display, Manrope).
- `build.mjs` — `node build.mjs` → `dist/` (static, root-absolute paths).
- Deploy: `node build.mjs && python3 deploy.py [--dry-run]` uploads changed files of `dist/` to bucket
  `tomson` (S3 API, keys in `~/.config/tomson/s3.env`, made by Alexey, never in a repo). No deletes.
  Test address: https://tomson.website.yandexcloud.net (verify with `curl`, files arrive with a delay).
- Preview: `preview_start tomson-site` (port 8791, serves `dist/`; entry lives in
  `light_plan:.claude/launch.json`). Browser caches CSS: hard-reload after a build.

## Booking
The AppEvent widget (iframe, `content/zal-*.json` → `booking.widget`) stays as is
for launch (Alexey, 2026-09-21). It is grey and unstyled — the main pain; fixing
it waits for AppEvent's answer about official API access, else BroniOS.
Payment is manual: request → Telegram/email to Alexey → chat → receipt → manual
confirm. Do not add acquiring.

## Do not
- Put secrets or bank details in this repo (repos are public). Card numbers from
  the client chat templates stay out.
- Publish anywhere before Alexey says so (Yandex bucket, GitHub, DNS).
- Copy Vigbo fonts/Geometria; photos were taken from Vigbo with Alexey's permission
  (2000 px versions, resized to 1800 px, q82).
