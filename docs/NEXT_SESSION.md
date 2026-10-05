# NEXT_SESSION — tomson_site

Owner: the orchestrator (Claude Project). Rewrite, do not append; ≤ ~100 lines.
Last rewrite: 2026-10-05 (seed written before the Project existed).

## Now
All 11 pages are live on the test address https://tomson.website.yandexcloud.net
(home, 3 halls, equipment with pictures and VK videos, rules, kak-najti, fotosfera
with announcements, sertifikaty, raspisanie). Admin `/admin/` works: tabs Цены, Фото,
Ролики, Афиша; password is Alexey's own. Domains томсон.рф and novopashin.ru are
still on Vigbo. Booking = AppEvent iframe.

## Decided (Alexey's words, see DECISIONS.md)
- Prices only Alexey changes; admin on the site by password, works from any device.
- Equipment: pictures on every item; demo videos on VK Video over a darkened page.
- Photo school keeps its big banner and announcements (past ones stay visible).
- Feedback: a form whose submissions go to Alexey by email. Contacts: WhatsApp, VK,
  Instagram, Telegram, Max — all of them.
- The work moves to a Claude Project with the orchestrator scheme; it needs a GitHub repo.

## Waiting for Alexey
1. GitHub repo `alexeynovopashin-lab/tomson-site` (he creates it empty; a Mac step pushes).
2. Mail for the form: which address receives, which Yandex mailbox sends (default plan:
   Yandex app password typed by him into the function settings).
3. Telegram and Max links. Known from the old site: Instagram `studiotomson`,
   VK `williamthomson`, WhatsApp `wa.me/79618878078`.
4. Is the entrance via «Метрофитнес» still closed? (page «Как найти» says so + photo)
5. Prices marked `check` in the admin: DP600II 50, SL200III 300, Spotlight 26° 300,
   certificate rent 1 h/2 h/3 h (1 500/3 000/4 500); photographer 5 500 and 3 000/h.
6. Phone check of all pages — his remarks go in ONE numbered list, a separate step.
7. Years of the three May school events (without a year they always show as past).

## Step backlog (sizes are guesses, model in brackets)
1. GitHub: push history, connect repo to the Project, first sync (docs, Sonnet).
2. Feedback form + email via the cloud function (code, cloud, secrets: Opus). Needs answer 2.
3. Contacts block + footer with 5 messengers (code, Sonnet). Needs answer 3.
4. Domains: first RESEARCH how to attach томсон.рф / novopashin.ru to the bucket
   (bucket name, certificate, CDN — from memory, NOT verified), keep the mail MX on
   Yandex alive, plan the switch with a rollback; the switch itself only on his word (Opus).
5. Phone-check list step (after his remarks).
6. Admin hardening: lockout after wrong passwords, access log (Opus). Optional.
7. Housekeeping: INDEX region-mirror row, cloud cost note for Alexey.

## Traps (details in Claude memory `tomson-site-migration`, not visible to the Project)
- The bucket is the main copy of prices/photos/videos/events: always `deploy.py`.
- Cloud console: «internal error» toasts are false alarms; verify with `curl`.
- Hidden browser pane draws no frames: measure with numbers.
