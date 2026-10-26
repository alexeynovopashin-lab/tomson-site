# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-26 (step 7A closed: studiotomson.ru opens the site; 7B waits for the night).

## Now
The new site is live on the test address https://tomson.website.yandexcloud.net and, since
2026-10-06, on **novopashin.ru** (Alexey: «все шло с моего согласия, novopashin.ru работает»;
mirror bucket `novopashin.ru`, `www` redirects 301, https certificate attached, MX/SPF kept in
the new DNS zone). Domain томсон.рф is still on Vigbo until the night switch Alexey announced («томсон.рф переедет ночью, когда город будет спать», 2026-10-06; date not given). Vigbo paid until June, rollback exists:
`docs/STEP_6_DOMAINS_PLAN.md`). Main domain chosen: studiotomson.ru (purchase not confirmed in chat as of 2026-10-10).
**2026-10-10 (Alexey):** томсон.рф has NOT moved. The AppEvent widget works in production on novopashin.ru and real orders already come through it, so a hard domain binding is unlikely; the studiotomson.ru check in step 7 stays as insurance.
Booking = AppEvent iframe. Form → `tomsonform` → Alexey's mailbox. Admin `/admin/` has tabs
Цены, Фото, Ролики, Афиша, Портфолио; `deploy.py` and the admin write to both buckets.

## Test booking page (BroniOS, Q-034 in platform_hub)
Hidden page `/test-bron/` (`content/test-bron.json`, `testBronPage()` in `src/render.mjs`) is already in main (PR #17).
Checked 2026-10-10 in a local build: noindex, not in sitemap, not linked from other pages, widget iframe of BroniOS with hall and
prices from the site. MEASURED 2026-10-26: `/test-bron/` answers 200 on the test address and novopashin.ru (someone deployed it; who and when not known) and the live widget/Worker is not checked from the cloud.
Do not build a second test page. Replacing the AppEvent widget on the live site is a separate step, only on Alexey's word.

## Platform (since 2026-10-05)
Platform for photo studios and schools on the Event OS core: `docs/PLATFORM_ARCHITECTURE.md`
(decisions in DECISIONS.md). Platform stage 1 starts only AFTER the site launch (Alexey's card
«Сначала сайт»). Platform work is not part of the launch steps.

## Done (details in DECISIONS.md and the step reports)
1. GitHub repo, connected to the Project.
2. Request form + email (`tomsonform`), accepted 2026-10-05.
3. Contacts block and footer with five messengers; privacy policy `/politika/` + consent tick-box.
4. Content checks (entrance closed, prices, photographer 5 500 ₽/h, 2026 events).
5. Phone check, two remarks fixed; Alexey: «все ок».
6. Domains: plan, novopashin.ru switched (mirror, DNS zone, certificate, www redirect, two cloud
   functions reloaded); site search and SEO files (6b); `/fotograf/` landing, 7 service pages,
   portfolio tab (6c); school page: camera picker widget and VK/YouTube video switch.
   Report: `docs/STEP_6_REPORT_2026-10-06.md` (written from memory; early steps in one line).
   Branch `claude/step6b-seo` is on GitHub (no secrets found); PR to main opened by the orchestrator.

## Waiting for Alexey
1. Say «да» to merging the step 6 PR (until merged, a Mac session that starts from `main` would
   have OLD code: single bucket, no photographer pages. Do not deploy from such a checkout).
2. Buy studiotomson.ru (said 2026-10-06 he would; not confirmed; main domain; tags and sitemap already use it). Also: the night/time of step 7.
2b. DECIDED 2026-10-10 (Alexey): NO redirect of novopashin.ru root to `/fotograf/`. For now novopashin.ru is
   the address people use to book the studio (and is linked from his Instagram): leave the home page as is,
   keep it stable (no downtime, keep URLs). Not a priority; ask again only if he raises it.
3. Genre «Свадебная фотосессия»: mark it in «Портфолио» or decide to drop the genre.
4. Pinterest code for the place prepared in the page.
5. First school videos in the admin (no videos = no «Видео» block on the page).
6. INN for the privacy policy; a lawyer's read of it before the main switch.

## Not verified (carry into the pre-switch checklist)
- Live results of step 6 (200s, www redirect, https on novopashin.ru) are the Mac step's own
  measurements: the cloud container cannot reach the site.
- VK and YouTube video playback on the school page (players black in the preview pane).
- Certificate auto-renewal; mail on novopashin.ru after the DNS change (send a test both ways).
- Rate limit of the form in the cloud (proven on the bench only).
- School page is 404–412 px wide on a 375 px phone (older than step 2) — a fix step.
- `CLAUDE.md` is 75 lines on the step 6 branch (rule: ≤ 60) — trim in the next Mac step.

## Launch steps still open
7A. DONE 2026-10-26 (Mac session «Переключение томсон.рф», branch `claude/step7a-studiotomson`).
   Done and measured: zone `studiotomson-ru` (ANAME → bucket, www CNAME, no MX), registry NS = ns1/ns2.yandexcloud.net
   (Alexey set them), bucket `studiotomson.ru` = copy of `tomson` (bucket-to-bucket, nothing new published),
   `www.studiotomson.ru` → 301 https://studiotomson.ru/<path>, LE certificate `fpqdqk4104u421hvk8ev` ISSUED till
   2027-01-24, managed (Yandex renews while the `_acme-challenge` CNAMEs stay). 25 of 27 addresses 200 by https
   (`/zal-edison` 302 → slash, `/svadby` 404 — same as the test address). AppEvent widget loads on
   studiotomson.ru/zal-edison/ with halls and the week schedule (no booking made). `deploy.py` MIRRORS and the
   admin code default list studiotomson.ru; HEAD retry added in deploy.py (1 HEAD in ~1700 hung 120 s).
   Dry run 2026-10-26: 641 files identical in all three buckets; 2 differ in all three alike (`_src/render.mjs`,
   `test-bron/index.html`: main is newer than the live site) — NOT deployed, needs Alexey's word.
   DONE 2026-10-26 by the agent via `yc` (Alexey: «сам сделай»): new versions of the two functions from the same code
   (`--source-version-id`) with env copied from the old version (secrets never printed): `tomsonadmin` d4eb97gsohhc3hhn1nvm
   (+ MIRRORS=novopashin.ru,studiotomson.ru), `tomsonform` d4eakhdkskj4cail9k8p (ORIGINS + studiotomson.ru, www). Measured by curl:
   both answer for studiotomson.ru, www, novopashin.ru, test address; a foreign origin gets 403. Old versions d4ecdhu8k70djd2i5ak4 /
   d4ehukaq9h2j5enru6f1 stay as rollback (create a version from them with `--source-version-id`; set-tag failed once).
   DONE 2026-10-26: Alexey changed a price in studiotomson.ru/admin/ (Vegas 16–30: 8100 → 8200), it reached all three buckets,
   he put it back (8100 on all three, measured); test letter from the form on studiotomson.ru arrived in his mailbox (his word).
   7A is CLOSED. Not done: PR of `claude/step7a-studiotomson` (waits for Alexey's word); `/test-bron/` + `_src/render.mjs` of main
   are not deployed (differ in all three buckets alike; needs his word); canonical question above.
   Rollback: delete zone `studiotomson-ru` or NS back at reg.ru; buckets can stay; томсон.рф and novopashin.ru untouched.
   Open question to Alexey: canonical/sitemap point to studiotomson.ru since step 6 (no SEO branch sets
   novopashin.ru); now that studiotomson.ru opens, that is no longer a dead address.
7B. IN PROGRESS 2026-10-26 (window ~23:43 Tomsk, Alexey: «через 4 часа» at 19:43). PREPARED, visitors see nothing yet:
   zone `tomson-rf` (copy of Vigbo: A 158.255.3.212 TTL 300, MX 10 mx.yandex.net., SPF TXT, www CNAME → apex, two `_acme-challenge`),
   registry NS = ns1/ns2.yandexcloud.net since 19:59 (Alexey, reg.ru; before it: ns1/ns2.gophotoweb.com — NOT vigbo.site),
   Google+Cloudflare saw Yandex NS by 21:11, mail/SPF/A answered from the new zone (measured via DoH and digwebinterface),
   LE certificate `fpq48lj43cgrm83v6u2s` (томсон.рф + www) ISSUED 21:38 till 2027-01-24, attached to buckets
   `xn--l1acbbod.xn--p1ai` and `www.xn--l1acbbod.xn--p1ai` (redirect-all → https://studiotomson.ru, path kept, 301;
   measured via bucket IP 213.180.193.247: 12 of 12 in a row 301 with valid cert).
   NIGHT STEP (only with Alexey's word): zone `tomson-rf`: delete A at apex, add ANAME apex → `xn--l1acbbod.xn--p1ai.website.yandexcloud.net.` (300),
   replace www CNAME → `www.xn--l1acbbod.xn--p1ai.website.yandexcloud.net.` (300). Then check, mail both ways, Webmaster/Search Console «переезд» (Alexey's cabinets).
   ROLLBACK (minutes): `yc dns zone delete-records --name tomson-rf` ANAME + add `A 158.255.3.212` 300 and www CNAME → apex.
   FULL rollback (hours): reg.ru NS back to ns1.gophotoweb.com / ns2.gophotoweb.com. Do NOT delete the domain in Vigbo.
   Old Vigbo pages (svadby, portrety, lesha+katja, petja+julja, vybor-kamery, camerateka, light-plan) → 404 on studiotomson.ru (decided earlier; svadby etc. may later go to /fotograf/).
8. Optional after launch: admin hardening (lockout, access log; Opus), housekeeping (INDEX
   region-mirror row, cloud cost note for Alexey), mark the Vigbo plan end date (June).

## Traps (details in Claude memory `tomson-site-migration`, not visible to the Project)
- The bucket is the main copy of prices/photos/videos/events/portfolio: always `deploy.py`.
- Cloud console: «internal error» toasts are false alarms; verify with `curl`.
- Archives of the two functions look alike: the admin archive was once uploaded into `tomsonform`
  (form answered «неверный пароль»). Name archives by function and check by `curl` after upload.
- Hidden browser pane draws no frames: measure with numbers. Port 53 on the Mac can be
  intercepted: DNS lookups from the Mac are not proof of a server fault.
