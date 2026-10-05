# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-05 (step 3 built and live on the test address; step 3 accepted by Alexey).

## Now
All 11 pages are live on the test address https://tomson.website.yandexcloud.net
(home, 3 halls, equipment with pictures and VK videos, rules, kak-najti, fotosfera
with announcements, sertifikaty, raspisanie). Admin `/admin/` works: tabs Цены, Фото,
Ролики, Афиша; password is Alexey's own. Domains томсон.рф and novopashin.ru are
still on Vigbo. Booking = AppEvent iframe. Request form (home + photo school) → cloud
function `tomsonform` → email to Alexey's Yandex mailbox; first real letter arrived 2026-10-05.

## Platform (since 2026-10-05)
The site becomes a platform for photo studios and schools on the Event OS core:
`docs/PLATFORM_ARCHITECTURE.md` (draft v0.1, decisions in DECISIONS.md). Open for
Alexey: legal entity for subscriptions. Platform stage 1 (separate Tomson data from the
engine, Opus, private repo first) starts only AFTER the site launch below (Alexey's card
«Сначала сайт», 2026-10-05). Platform work is not part of the launch steps.

## Decided (Alexey's words, see DECISIONS.md)
- Prices only Alexey changes; admin on the site by password, works from any device.
- Equipment: pictures on every item; demo videos on VK Video over a darkened page.
- Photo school keeps its big banner and announcements (past ones stay visible).
- Feedback: a form whose submissions go to Alexey by email. Contacts: WhatsApp, VK,
  Instagram, Telegram, Max — all of them.
- The work moves to a Claude Project with the orchestrator scheme; it needs a GitHub repo.

## Waiting for Alexey
1. (done 2026-10-05) GitHub repo exists and the Project sees it.
2. (done 2026-10-05) Mail for the form: his Yandex mailbox sends to itself (option A);
   Postbox (option C) after the step 7 switch — only function settings change then.
3. (done 2026-10-05) Channel links given: WhatsApp `wa.me/79618878078`, Telegram `t.me/studiotomson`,
   Max (profile link), VK `vk.com/studiotomson`, Instagram `instagram.com/studiotomson`.
   All five links opened by Alexey 2026-10-05 («все ссылки рабочие»; Max gives 403 to curl, works in a browser).
4. Is the entrance via «Метрофитнес» still closed? (page «Как найти» says so + photo)
5. Prices marked `check` in the admin: DP600II 50, SL200III 300, Spotlight 26° 300,
   certificate rent 1 h/2 h/3 h (1 500/3 000/4 500); photographer 5 500 and 3 000/h.
6. Years of the three May school events (without a year they always show as past).
7. Phone check of all pages — his remarks go in ONE numbered list, a separate step.
   Remarks so far (2026-10-05, phone, screenshot of the photo school page header):
   1. Phone header: the bar with «МЕНЮ» has a lot of empty space on the right; put buttons there
      DONE 2026-10-05, Alexey's choice: a sideways-scrolling strip like Kinfolk/Esquire, with
      «Расписание», «Как найти» and the messenger icons (`content/site.json` → `quick`, `quickStrip()`
      in `src/render.mjs`). Hidden above 820 px, where the full menu shows.
   2. Desktop, home «Залы»: the hall photo and the hall name must be links too, same address as
      the «Смотреть зал» button (they duplicate it). DONE 2026-10-05. Alexey walked all pages on
      the phone: «все ок».

## Launch steps (one at a time, Mac, sizes are guesses)
1. DONE. GitHub: history pushed, repo connected to the Project.
2. DONE 2026-10-05. Request form + email. Function `tomsonform` (folder tomson, public,
   one instance; env SMTP_USER / SMTP_PASSWORD typed by Alexey). Code `cloud/form/index.js`
   ships as a new version via console editor or `yc ... version create` WITH the same env
   (a version without env breaks the form). Accepted by the orchestrator
   2026-10-05 (letter received; trap and empty form make no mail; rate limit proven only on
   the bench). The form code reaches main by PR (branch `claude/step2-form`): until it is
   merged a deploy from main would drop the form.
3a. BUILT 2026-10-05 (Alexey: «сделать, у нас на нынешнем сайте есть»; operator = he as a
   self-employed person, no INN for now — «добавим завтра, надо искать»). Page `/politika/`
   from `content/privacy.json` (own text: the Vigbo one is a generic template with no operator,
   no phone, no form), footer link on every page, required tick-box «согласен(на)» in both
   forms (client-side only; the cloud function does not check it). Empty `operator` in
   privacy.json = the whole thing is off. Open: INN (add to section 1), a lawyer's read before
   the switch, retention has no number («пока нужна для ответа»), «серверы в России» not
   claimed in the text. Contact email = studio mailbox (Alexey, 2026-10-05).
3. DONE 2026-10-05 (Alexey: «устраивает»). On the test address. «Контакты» block on the home
   page (before the form) + «Мессенджеры» row in the footer of all 10 pages. Links live in
   `content/site.json` → `channels` (empty `href` = icon not shown); glyphs are own outlines in
   `src/render.mjs` (`CHANNEL_ICONS`), style at the end of `src/style.css`. Each link opens in
   a new tab and has a text label. Branch `claude/step3-contacts`, no PR yet (his word): until it is merged into main, a deploy from main would drop the contacts block.
4. DONE 2026-10-05: content checks. Entrance via «Метрофитнес» still closed (text kept); prices
   confirmed (DP600II 100, SL200III 300, Spotlight 300, certificates 1 600/3 200/4 800);
   photographer 5 500/h only (3 000 was outdated); May events dated 2026.
5. Phone check (Alexey walks all 11 pages on his phone) → numbered remarks list → one fix
   step per list, never inside the step that built the page. Known already: the photo school
   page is 404–412 px wide on a 375 px phone (caption under the poster), older than step 2.
6. RESEARCH DONE 2026-10-05 → `docs/STEP_6_DOMAINS_PLAN.md` (option A recommended; 4 questions
   to Alexey; DNS sits on Vigbo NS incl. mail MX). Was: domains research (Opus 5.5, no changes in DNS): how to attach томсон.рф and
   novopashin.ru to the bucket (bucket name rule, certificate, CDN: from memory, NOT
   verified), keep the mail MX alive, redirects for old Vigbo links, rollback plan.
   Output: a plan with 2–3 options for Alexey. The switch itself = step 7.
7. The switch (Opus 5.5): only on his explicit word, with the rollback plan ready.
8. Optional after launch: admin hardening (lockout, access log; Opus), housekeeping
   (INDEX region-mirror row, cloud cost note for Alexey).

## Traps (details in Claude memory `tomson-site-migration`, not visible to the Project)
- The bucket is the main copy of prices/photos/videos/events: always `deploy.py`.
- Cloud console: «internal error» toasts are false alarms; verify with `curl`.
- Hidden browser pane draws no frames: measure with numbers.
