# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-10 (Alexey: томсон.рф not moved; novopashin.ru already takes real orders).

## Now
The new site is live on the test address https://tomson.website.yandexcloud.net and, since
2026-10-06, on **novopashin.ru** (Alexey: «все шло с моего согласия, novopashin.ru работает»;
mirror bucket `novopashin.ru`, `www` redirects 301, https certificate attached, MX/SPF kept in
the new DNS zone). Domain томсон.рф is still on Vigbo until the night switch Alexey announced («томсон.рф переедет ночью, когда город будет спать», 2026-10-06; date not given). Vigbo paid until June, rollback exists:
`docs/STEP_6_DOMAINS_PLAN.md`). Main domain chosen: studiotomson.ru (purchase not confirmed in chat as of 2026-10-10).
**2026-10-10 (Alexey):** томсон.рф has NOT moved. The AppEvent widget works in production on novopashin.ru and real orders already come through it, so a hard domain binding is unlikely; the studiotomson.ru check in step 7 stays as insurance.
Booking = AppEvent iframe. Form → `tomsonform` → Alexey's mailbox. Admin `/admin/` has tabs
Цены, Фото, Ролики, Афиша, Портфолио; `deploy.py` and the admin write to both buckets.

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
7. The switch of the main domain (Opus 5.5), night window announced by Alexey, date open.
   Starting prompt: `docs/STEP_7_SWITCH_PROMPT.md`. Alexey 2026-10-06: studiotomson.ru bought today = MAIN;
   томсон.рф → 301 to it; novopashin.ru = photographer's site; no mail arrives on томсон.рф, the AppEvent
   widget is what matters. Widget is confirmed working in production on novopashin.ru (2026-10-10);
   step still checks it on studiotomson.ru as insurance. Night/time and the studiotomson.ru purchase are still open.
   Advice in it: change NS in reg.ru a day or two BEFORE the night, the night itself is one record.
   Needs item 2 of «Waiting» (or a decision to keep томсон.рф as main) and the checklist above. Rollback ready (plan doc). Postbox for the form mail after it.
8. Optional after launch: admin hardening (lockout, access log; Opus), housekeeping (INDEX
   region-mirror row, cloud cost note for Alexey), mark the Vigbo plan end date (June).

## Traps (details in Claude memory `tomson-site-migration`, not visible to the Project)
- The bucket is the main copy of prices/photos/videos/events/portfolio: always `deploy.py`.
- Cloud console: «internal error» toasts are false alarms; verify with `curl`.
- Archives of the two functions look alike: the admin archive was once uploaded into `tomsonform`
  (form answered «неверный пароль»). Name archives by function and check by `curl` after upload.
- Hidden browser pane draws no frames: measure with numbers. Port 53 on the Mac can be
  intercepted: DNS lookups from the Mac are not proof of a server fault.
