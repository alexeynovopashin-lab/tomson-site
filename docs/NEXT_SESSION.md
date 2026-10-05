# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-05 (launch split into steps; Alexey chose «Сначала сайт» before platform stage 1).

## Now
All 11 pages are live on the test address https://tomson.website.yandexcloud.net
(home, 3 halls, equipment with pictures and VK videos, rules, kak-najti, fotosfera
with announcements, sertifikaty, raspisanie). Admin `/admin/` works: tabs Цены, Фото,
Ролики, Афиша; password is Alexey's own. Domains томсон.рф and novopashin.ru are
still on Vigbo. Booking = AppEvent iframe.

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
2. Mail for the form (needed for step 2): which address receives requests, which Yandex
   mailbox sends. He types the Yandex app password into the function settings himself.
3. Telegram and Max links (step 3). Known: Instagram `studiotomson`, VK `williamthomson`,
   WhatsApp `wa.me/79618878078`.
4. Is the entrance via «Метрофитнес» still closed? (page «Как найти» says so + photo)
5. Prices marked `check` in the admin: DP600II 50, SL200III 300, Spotlight 26° 300,
   certificate rent 1 h/2 h/3 h (1 500/3 000/4 500); photographer 5 500 and 3 000/h.
6. Years of the three May school events (without a year they always show as past).
7. Phone check of all pages — his remarks go in ONE numbered list, a separate step.

## Launch steps (one at a time, Mac, sizes are guesses)
1. DONE. GitHub: history pushed, repo connected to the Project.
2. NEXT. Feedback form + email via the cloud function (cloud, mail, secrets: Opus 5.5).
   ~4 files. Starting prompt: `docs/STEP_2_FORM_PROMPT.md`. Needs answer 2 (the step asks
   him first if he has not given it). Live only on the test address.
3. Contacts block + footer with 5 messengers (code, Sonnet 5.5). ~4 files. Needs answer 3.
   Does not depend on step 2: may go first if the mail answer is late.
4. Content checks before the switch (data, Sonnet 5.5): answers 4–6 into the content.
   Small; skip if Alexey has no answers yet, the switch does not wait for them unless he says.
5. Phone check (Alexey walks all 11 pages on his phone) → numbered remarks list →
   one fix step per list, never inside the step that built the page.
6. Domains RESEARCH (Opus 5.5, no changes in DNS): how to attach томсон.рф and
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
