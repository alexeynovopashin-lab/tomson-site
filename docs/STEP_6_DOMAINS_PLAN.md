# Step 6 — domains: research and plan (2026-10-05)

Research only: nothing changed in DNS, reg.ru, Vigbo or the cloud. The switch = step 7,
only on Alexey's word. «мерено» = checked today with dig/curl/whois; «док» = Yandex Cloud
docs read today; «не мерено» = not checked.

## What is there now (мерено 2026-10-05)
| | томсон.рф (`xn--l1acbbod.xn--p1ai`) | novopashin.ru |
|---|---|---|
| Registrar, paid till | reg.ru, 2027-05-18 | reg.ru, 2027-05-13 |
| DNS servers (NS) | `ns1/ns2.vigbo.site` — **DNS lives at Vigbo** | same |
| Site (A) | 158.255.3.212 (Vigbo), www → same | same |
| Mail (MX) | `mx.yandex.net` | `mx.yandex.ru` |
| SPF (TXT) | `v=spf1 +a +mx +ip4:138.201.250.159 ~all` | same `+include:sendgrid.net` |
| DKIM / DMARC | none | none |
| Behaviour | http → https, main address | its own copy of the site, **not** a redirect |

Consequence: all records, mail included, sit on Vigbo's DNS servers. If the Vigbo
subscription ends while NS still point there, both the site AND the mail go dark. So
moving NS away from Vigbo is needed in any option.

Old Vigbo pages (sitemap, 17): 10 are on the new site with the same address
(`/zal-edison` → 302 → `/zal-edison/` → 200, мерено on the test address). 7 are not:
`svadby`, `portrety`, `lesha+katja`, `petja+julja`, `vybor-kamery`, `camerateka`,
`light-plan` → today 404 with the bucket's bare English error page (no own 404 page).

## Facts from the docs (док, yandex.cloud/ru/docs/storage)
- Own domain on a bucket: **bucket name must equal the domain**; DNS points to
  `<domain>.website.yandexcloud.net`. Bucket `tomson` cannot be renamed → a new bucket
  `xn--l1acbbod.xn--p1ai` (name fits the rules: latin, digits, dots, hyphens, 21 chars).
- A domain without www (apex) can't be a CNAME; Yandex Cloud DNS has **ANAME** for it.
  reg.ru's own DNS has no ANAME (из памяти, не мерено).
- HTTPS: Certificate Manager, free Let's Encrypt certificate, attached to the bucket.
  Certificate Manager itself is free. Punycode (.рф) is not mentioned in the docs; Let's
  Encrypt does issue for IDN (общеизвестно, на Яндексе не мерено).
- A bucket can «redirect all requests to another host» and has routing rules by path
  prefix (for the 7 missing pages).
- Cloud DNS: queries 37.94 ₽ per million; zone price not found on the page (не мерено,
  expected tens of rubles a month). A small site = thousands of queries a month.

## Code that changes with a new bucket (из кода)
- `deploy.py:20` `BUCKET = "tomson"`; `cloud/admin/index.js:17` `BUCKET = 'tomson'` →
  new function version (console ZIP, entry `index.handler`, same env ADMIN_PASSWORD).
- CORS lists in both functions already contain `https://xn--l1acbbod.xn--p1ai` and www;
  novopashin.ru is not there → it must redirect, otherwise form and admin fail on it.
- Prices/photos/videos/events live in the bucket: copy `tomson` → new bucket in full
  (incl. `_src/`) right before the switch, admin edits frozen for that hour.

## Options
**A. Everything in Yandex Cloud DNS + bucket named as the domain (recommended).**
Zones томсон.рф and novopashin.ru in Cloud DNS with the same MX/SPF; ANAME
томсон.рф → new bucket; www.томсон.рф, novopashin.ru, www.novopashin.ru → small
redirect-only buckets → `https://томсон.рф`. LE certificates for all four names. In
reg.ru Alexey changes NS from vigbo.site to Yandex's (`ns1/ns2.yandexcloud.net`, не мерено).
+ one place for everything, apex works, rollback by one record. − 4 new buckets + one
function version; NS change propagates up to 24–72 h (both sites answer meanwhile).

**B. Cloud DNS + Cloud CDN in front of the existing bucket `tomson`.** No new bucket, no
code change; CDN carries domains and certificate. − CDN is paid per GB and caches: an
admin edit may show late unless cache rules are tuned; whether ANAME can point to a CDN
resource — не мерено. More moving parts for a 1 MB-per-page site.

**C. DNS at reg.ru (free), site on www.томсон.рф only.** www = CNAME to bucket
`www.xn--l1acbbod.xn--p1ai`; bare томсон.рф via reg.ru «переадресация» (exists? price?
HTTPS on it? — не мерено). − the main address becomes www, apex HTTPS doubtful.
Listed for completeness; not advised.

## Order for step 7 (option A), each step reversible
1. Cloud DNS zones built with copies of MX/SPF (+ old A 158.255.3.212 at first) — nothing
   changes for visitors yet. Check: `dig @ns1.yandexcloud.net томсон.рф MX` = mx.yandex.net.
2. New buckets, copy of the site, certificates issued (DNS validation inside Cloud DNS).
3. Alexey changes NS in reg.ru → wait, check mail (send himself a letter) and the old site.
4. In the zone: A → ANAME to the bucket (TTL 300). Check https, form, admin, prices.
5. novopashin.ru → redirect. Vigbo stays paid ≥ 1 month.

## Rollback
- Fast (minutes): in Cloud DNS put back `A 158.255.3.212` instead of the ANAME — Vigbo
  serves the old site while it is paid and still has the domains attached.
- Full (hours): NS back to `ns1/ns2.vigbo.site` in reg.ru.
- Mail is untouched in every step as long as MX/SPF are copied before step 3.

## Questions for Alexey (his call)
1. novopashin.ru: redirect to томсон.рф (the plan above), or is it your photographer site
   (the 7 pages: weddings, portraits, couples, cameras, Light Plan)?
2. The 7 not-ported pages: redirect to the home page, keep a 404, or port them?
3. Vigbo: when does the paid period end? It is the rollback.
4. Who does reg.ru: you in the reg.ru panel (NS change takes 2 minutes), I prepare the rest.

## Not part of the switch, noticed
- No own 404 page (bare English bucket error). Small, before the switch.
- No DKIM/DMARC on mail: letters may land in spam. Can be added in Cloud DNS later.
- Admin/form functions' CORS is fine for томсон.рф, but `https://www.…` must redirect,
  not serve, to keep one address.
