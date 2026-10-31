# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-31 (SEO step 1 of 3: live check + Webmaster/Search Console verification, Mac session).

## Now
The new site is the main site. **studiotomson.ru** (main domain, bought 2026-10-26) and **novopashin.ru** open it by https;
**томсон.рф** and www switched on 2026-10-26 23:59 Tomsk to a 301 redirect to studiotomson.ru (details at steps 7A/7B below).
Vigbo is untouched and paid until June (rollback in minutes). Mirror buckets: `novopashin.ru`, `studiotomson.ru`; `deploy.py`
and the admin write to all three. AppEvent widget works on the new domains (Alexey 2026-10-10; Mac measurement 2026-10-26).
Form → `tomsonform` → Alexey's mailbox. Admin `/admin/` tabs: Цены, Фото, Ролики, Афиша, Портфолио.
**Source of 7A/7B:** Mac branch `claude/step7a-studiotomson` (merged to main 2026-10-28). Live results are the Mac step's own measurements.

## SEO step 1 of 3 — DONE 2026-10-31 (Mac, measured by curl and a 375 px browser pane)
- studiotomson.ru: `/`, `/fotograf/`, `/uslugi/semejnyj-portret/`, `/sitemap.xml`, `/robots.txt` 200; 18 of 18 sitemap URLs 200, all on studiotomson.ru.
- http:// and https://www → one 301 → https://studiotomson.ru (path kept); http://www → two 301 (https first, bucket behaviour).
- томсон.рф, www, their `/fotograf/` → 301 → studiotomson.ru, same path (http → two 301). novopashin.ru: NO redirect, 200 itself (decision 2a);
  its canonical/og:url point to studiotomson.ru. Canonical + og:url on home and `/fotograf/` = studiotomson.ru.
- Certificate LE (YR1) for studiotomson.ru + www valid till 2027-01-24. 375 px: home and `/fotograf/` scrollWidth 375 (no sideways scroll).
- AppEvent widget on `/zal-edison/` loads (halls, week, free slots), no console errors. Form shown on home and `/fotograf/`;
  `tomsonform` answers studiotomson.ru and www (CORS), foreign origin POST 403 (preflight shows `*` from the platform, harmless). No real letter sent.
- Verification: Yandex Webmaster (Alexey's account, was empty) and Google Search Console (`photostudiothomson@gmail.com`, URL-prefix property,
  was empty) — new files `yandex_1130dbf34f601660.html`, `google7908c5357ea65d6d.html` in `src/root/`, deployed, 200 on all three addresses.
  Google: «Право собственности подтверждено»; Yandex: owner, file method, 31.10.2026 (Alexey pressed «Подтвердить»; seen in the cabinet).
- Next for «переезд»: томсон.рф is in neither cabinet — add and verify it there first (its old files are still in `src/root/`, but the site now
  redirects, so verification may need DNS TXT: Alexey's word). Sitemap not submitted in the cabinets (not in this step).

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
1. Mail both ways on томсон.рф and novopashin.ru (MX untouched since the switch; needs his test letters).
2. «Переезд» томсон.рф → studiotomson.ru in Webmaster / Search Console: studiotomson.ru verified 2026-10-31, томсон.рф not yet in the cabinets.
2a. DECIDED 2026-10-28 (Alexey): «novopashin.ru заменю на studiotomson.ru» (understood: he replaces his own links, e.g. Instagram; inference, not asked).
   novopashin.ru stays working untouched until he says «пора»; then a small step: 301 novopashin.ru → studiotomson.ru (bucket redirect, DNS stays).
2c. DONE 2026-10-31: Alexey «Да, выкладывай всё» — `/test-bron/` (heading «Окно брони») and `_src/render.mjs` of main deployed to all three.
2b. DECIDED 2026-10-10 (Alexey): NO redirect of novopashin.ru root to `/fotograf/`. For now novopashin.ru is
   the address people use to book the studio (and is linked from his Instagram): leave the home page as is,
   keep it stable (no downtime, keep URLs). Not a priority; ask again only if he raises it.
3. Genre «Свадебная фотосессия»: mark it in «Портфолио» or decide to drop the genre.
4. Pinterest code for the place prepared in the page.
5. First school videos in the admin (no videos = no «Видео» block on the page).
6. INN for the privacy policy; a lawyer's read of it before the main switch.

## Not verified
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
   Deploy 2026-10-31 (SEO step 1): all three buckets equal to main (641 unchanged + 4 uploaded).
   DONE 2026-10-26 by the agent via `yc` (Alexey: «сам сделай»): new versions of the two functions from the same code
   (`--source-version-id`) with env copied from the old version (secrets never printed): `tomsonadmin` d4eb97gsohhc3hhn1nvm
   (+ MIRRORS=novopashin.ru,studiotomson.ru), `tomsonform` d4eakhdkskj4cail9k8p (ORIGINS + studiotomson.ru, www). Measured by curl:
   both answer for studiotomson.ru, www, novopashin.ru, test address; a foreign origin gets 403. Old versions d4ecdhu8k70djd2i5ak4 /
   d4ehukaq9h2j5enru6f1 stay as rollback (create a version from them with `--source-version-id`; set-tag failed once).
   DONE 2026-10-26: Alexey changed a price in studiotomson.ru/admin/ (Vegas 16–30: 8100 → 8200), it reached all three buckets,
   he put it back (8100 on all three, measured); test letter from the form on studiotomson.ru arrived in his mailbox (his word).
   7A is CLOSED (branch merged 2026-10-28; `/test-bron/` + `_src/render.mjs` deployed 2026-10-31; canonical = studiotomson.ru, the main domain).
   Rollback: delete zone `studiotomson-ru` or NS back at reg.ru; buckets can stay; томсон.рф and novopashin.ru untouched.
7B. SWITCHED 2026-10-26 23:59 Tomsk (Alexey: «можно сделать сейчас»): zone `tomson-rf` apex A → ANAME `xn--l1acbbod.xn--p1ai.website.yandexcloud.net.`, www CNAME → `www.…website…` (both 300).
   Measured after: Google and Cloudflare answer 213.180.193.247 within 10 s; via that IP https://томсон.рф/<path> and www → 301 → studiotomson.ru, 18 of 18 sitemap pages end in 200, cert valid; old Vigbo pages (svadby, light-plan…) 301 → 404.
   NOT measured yet: mail both ways (MX untouched, needs Alexey), Yandex Webmaster / Search Console «переезд» (Alexey's cabinets), a clean look from a phone off Wi-Fi.
   Preparation before the switch (zone copy of Vigbo, NS at reg.ru, certificate `fpq48lj43cgrm83v6u2s`, redirect buckets): DECISIONS 2026-10-26.
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
