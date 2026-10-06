# Step 6c — photographer landing + photo services (plan, 2026-10-06)

## Alexey's words (2026-10-06, literally)
- «Адрес: /fotograf», «текст забери с вигбо», контакты — «контакты студии».
- «на страничке фотографа надо сделать одностраничный лендинг фотографа, продающая страница,
  серии отдельными галереями».
- «Я хочу добавить услуги фотостудии: Свадебная фотосессия, Семейный портрет, Фотопрогулка,
  Бизнес портрет, Коллективная фотосессия, Корпоративный портрет, предметная фотография.
  Создай разделы, а я соберу портфолио. Эти услуги должны перекликаться между страницами
  фотографа и услугами фотостудии. Все это надо SEO оптимизировать для релевантной выдачи
  поисковиками по запросам фотосессия томск, фотограф томск и тд.»
- Earlier: svadby, portrety, lesha+katja, petja+julja → photographer page; novopashin.ru → it.

## What Vigbo has (мерено 2026-10-06, saved in scratch, nothing downloaded to the repo)
- `svadby`: heading «Свадебные серии» — 9 tiles (Костя+Аня, Саша+Алёна, Игорь+Аля, Вадим+Катя,
  Витя+Рената, Влад+Анна, Lovestory, Лёша+Катя, Петя+Юля); only the last two link to galleries.
  4 packages: Минимальный 4 ч / 300–400 фото / 20 000 ₽; Средний 7 ч / 400–600 / 35 000 ₽;
  Оптимальный 9 ч / 600–900 / 45 000 ₽; Максимальный 12 ч / 900–1200 / 60 000 ₽. Each: meetings
  and consultations, processing of all photos, Yandex Disk (or a flash drive from «Средний»),
  30–50 photos in 7–10 days; all in 1–2 months; any package + hours, max 16 h.
- Galleries (2000 px on Vigbo CDN): Лёша+Катя 90, Петя+Юля 66, Портреты 41 photos.
- No «about the photographer» text anywhere on Vigbo: a selling page needs new copy.

## Shared data (both options)
One list `content/services.json` (7 services: slug, name, short text, price, portfolio series,
`ready` flag). The photographer landing and the studio «Услуги» page both render from it, so a
service changed once shows in both places. Prices go to `prices.json` as usual (`check` until
Alexey confirms). A service without portfolio shows «портфолио скоро» and stays out of search.

## Fork 1 — how services live (SEO), Alexey's call
- A. Each service its own page `/uslugi/<slug>/` («Свадебная фотосессия в Томске»), `/fotograf/`
  = the landing with short blocks linking to them. + one page per query («свадебный фотограф
  томск», «семейная фотосессия томск») — search engines rank such pages higher; − 7 pages of text
  and photos to fill. Empty pages hidden from search until `ready`.
- B. One landing `/fotograf/`, services as sections with anchors. + fast, one page; − one page
  competes for all queries, mostly ranks for «фотограф томск», weak for the specific ones.
Recommended: A (rolls out service by service as the portfolio arrives).

## Fork 2 — how Alexey adds portfolio
- 1. Folders on the Mac (one folder per series) → the agent adds them in a deploy. + nothing new
  to build; − every new series goes through a session.
- 2. Admin tab «Портфолио»: create a series, upload many photos, reorder. + he does it from the
  phone; − new admin feature and a new function version (photo upload today accepts only fixed slots).
Recommended: start with 1, build 2 when the first services are filled.

## Open questions
1. Fork 1: A or B?  2. Fork 2: 1 or 2?
3. Wedding packages 20/35/45/60 thousand — current? (shown with `check` until confirmed)
4. Vigbo «Портреты» (41 photos): which service — семейный, бизнес, or a general «Портрет» series?
5. Copy: the agent drafts the selling text (who, approach, how it goes, CTA) for Alexey to edit.

## SEO for «фотосессия томск», «фотограф томск» (из опыта, не мерено)
On the site: «Томск» in title/H1/description of every service page, LocalBusiness card (done in
6b), links between studio and photographer pages, alt texts. Off the site and usually the bigger
lever for local queries: Яндекс Бизнес / Карты card of the studio with photos and reviews, region
«Томск» in Yandex Webmaster — Alexey's accounts.
