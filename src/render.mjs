// Renders every page from content JSON. Pure: no files, no network — the same code runs in
// build.mjs on the computer and in the admin cloud function, so both produce identical pages.
//   C        — { 'site.json': {...}, 'prices.json': {...}, 'zal-edison.json': {...}, ... }
//   versions — { slot: short content hash } for photo URLs
// Returns { files: [{ path, html }], unused: [price keys shown nowhere] }.
export function render(C, versions) {
  const site = C['site.json'];
  const halls = structuredClone(C['halls.json']);
  const photos = C['photos.json'];
  const prices = C['prices.json'];
  for (const [k, tiers] of Object.entries(prices.halls)) halls[k].tiers = tiers;
  const usedPriceKeys = new Set();
  // the body below is not indented on purpose: its template literals are the HTML itself

const money = (n) => new Intl.NumberFormat('ru-RU').format(n).replace(/\u00a0/g, ' ');
const fromPrice = (h) => Math.min(...h.tiers.map((t) => t.price));
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PAGE_FILES = Object.keys(C).filter((f) => f.startsWith('zal-') || ['oborudovanie.json', 'pravila_i_cena.json', 'kak-najti.json', 'fotosfera.json', 'sertifikaty.json', 'raspisanie.json'].includes(f));
const ported = new Set(PAGE_FILES.map((f) => f.replace('.json', '')));
const hallUrl = (h) => (ported.has(h.pageSlug) ? `/${h.pageSlug}/` : `${site.oldSite}/${h.pageSlug}`);
const slugUrl = (slug) => (ported.has(slug) ? `/${slug}/` : `${site.oldSite}/${slug}`);
const navUrl = (n) => (n.href ? n.href : slugUrl(n.slug));

function priceStr(key) {
  const it = prices.items[key];
  if (!it) throw new Error(`unknown price key: ${key}`);
  usedPriceKeys.add(key);
  return it.unit === 'percent' ? `${it.price}%` : `${money(it.price)}\u00a0₽`;
}
// text with {{price_key}} and {{link:/url|label}} tokens
function inline(text) {
  return esc(text)
    .replace(/\{\{link:([^|}]+)\|([^}]+)\}\}/g, (_, u, l) => `<a href="${u}">${l}</a>`)
    .replace(/\{\{([a-z0-9_]+)\}\}/g, (_, k) => priceStr(k));
}
const UNIT = prices.units;
const unitLabel = (u) => UNIT[u] || '';

function photo(slot, { eager = false, cls = '' } = {}) {
  const p = photos[slot];
  if (!p) throw new Error(`no photo slot: ${slot}`);
  // content hash in the URL: a replaced photo shows at once, not after the browser cache expires
  const v = versions[slot];
  if (!v) throw new Error(`no file for slot: ${slot}`);
  return `<figure class="ph ${cls}" style="--r:${p.ratio}"><img src="/photos/${slot}.jpg?v=${v}" alt="${esc(p.alt)}" ${eager ? '' : 'loading="lazy" '}decoding="async"></figure>`;
}

function shell({ title, description, body, current }) {
  const items = site.nav
    .map((n) => `<li><a href="${esc(navUrl(n))}"${current === n.label ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)
    .join('');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="theme-color" content="#f5f1ea">
<link rel="preload" href="/fonts/playfair-cyr.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="topline"><div class="wrap"><span>${esc(site.city)} · ${esc(site.address)}</span><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></div></div>
<header class="brand"><a href="/"><span class="label">${esc(site.tagline)}</span><span class="word">${esc(site.name)}</span></a></header>
<nav class="main" aria-label="Основное меню"><div class="wrap"><button class="menu-btn" aria-expanded="false" aria-controls="menu">Меню</button><ul id="menu">${items}</ul></div></nav>
${body}
<footer><div class="wrap">
<div class="word">${esc(site.name)}</div>
<div class="col"><span class="label">Адрес</span><p>${esc(site.city)}, ${esc(site.address)}</p></div>
<div class="col"><span class="label">Телефон</span><p><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></p></div>
${site.nav.some((n) => n.slug && !ported.has(n.slug)) ? `<p class="note">${esc(site.footerNote)}</p>` : ''}
</div></footer>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

function hallCard(h) {
  return `<article class="hall">
${photo(h.photo)}
<div class="body">
<span class="num">№ ${h.number}</span>
<h3>${esc(h.name)}</h3>
<p class="label kicker">${esc(h.kicker)}</p>
<p class="blurb">${esc(h.blurb)}</p>
<dl class="specs"><div><dt>Площадь</dt><dd>${esc(h.area)}</dd></div><div><dt>Потолки</dt><dd>${esc(h.ceiling)}</dd></div><div><dt>Свет</dt><dd>${esc(h.light)}</dd></div></dl>
<p class="price">от ${money(fromPrice(h))} ₽<small>за час</small></p>
<div class="acts"><a class="btn solid" href="${esc(hallUrl(h))}">Смотреть зал</a></div>
</div>
</article>`;
}

function home() {
  const c = C['home.json'];
  const h1 = c.cover.headline.map((l, i) => (i === c.cover.italicLine ? `<em>${esc(l)}</em>` : esc(l))).join('<br>');
  const body = `<main>
<section class="wrap cover">
<div class="text"><div><span class="label">${esc(c.cover.label)}</span><h1>${h1}</h1></div>
<p class="lead">${esc(c.cover.lead)}</p>
<div class="actions"><a class="btn solid" href="#zaly">Выбрать зал</a><a class="btn" href="${slugUrl('kak-najti')}">Как найти</a></div></div>
<div class="fig">${photo(c.cover.photo, { eager: true })}<figcaption>${esc(c.cover.caption)}</figcaption></div>
</section>
<div class="wrap"><div class="facts">${c.facts.map((f) => `<div><b>${esc(f.value)}</b><span class="label">${esc(f.label)}</span></div>`).join('')}</div></div>
<section class="wrap" id="zaly">
<div class="sec-head"><h2>${esc(c.hallsTitle)}</h2><span class="label">Выберите зал</span></div>
${Object.values(halls).map(hallCard).join('\n')}
</section>
<section class="band">${photo(c.band.photo)}<blockquote><div class="wrap"><p>${esc(c.band.quote)}</p><cite>${esc(c.band.by)}</cite></div></blockquote></section>
<section class="wrap visit"><h2>${esc(c.visit.title)}</h2><div class="info"><p>${esc(c.visit.text)}</p><a class="btn" href="${slugUrl('kak-najti')}">Схема проезда</a></div></section>
</main>`;
  return shell({ title: c.title, description: c.description, body });
}

function hallPage(file) {
  const c = C[file];
  const h = halls[c.hall];
  const g = c.gallery;
  const tiers = h.tiers.map((t) => `<li><span>${esc(t.people)}</span><span><b>${money(t.price)}</b> <small>₽ / час</small></span></li>`).join('');
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/#zaly">Залы</a> / ${esc(h.name)}</span></div>
<section class="wrap title">
<div class="t"><span class="label">Зал № ${h.number} · ${esc(h.kicker)}</span><h1>${esc(h.name)}</h1></div>
<div class="prices"><span class="label">Стоимость аренды</span><ul class="tiers">${tiers}</ul><p class="price-note">${esc(c.priceNote)} <a href="${slugUrl('pravila_i_cena')}">Правила</a></p></div>
</section>
<section class="wrap hero">${photo(c.photo, { eager: true })}</section>
<section class="wrap about">
<p class="lede">${esc(c.lede)}</p>
<div class="side"><dl>${c.facts.map((f) => `<dt>${esc(f.label)}</dt><dd>${esc(f.value)}</dd>`).join('')}</dl><ul>${c.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul></div>
</section>
<section class="wrap gallery">
<div class="sec-head" style="padding-top:0"><h2 style="font-size:clamp(32px,4.4vw,60px)">${esc(c.galleryTitle)}</h2><span class="label">Нажмите, чтобы увеличить</span></div>
${g.opening ? `<button class="open wide" aria-label="Открыть фото">${photo(g.opening, { cls: 'wide' })}</button>` : ''}
<div class="cols">${g.columns.map((s) => `<button class="open" aria-label="Открыть фото" style="--r:${photos[s].ratio}">${photo(s)}</button>`).join('')}</div>
${g.closing ? `<button class="open wide" aria-label="Открыть фото">${photo(g.closing, { cls: 'wide' })}</button>` : ''}
</section>
<section class="booking" id="bron"><div class="wrap grid">
<div class="intro"><span class="label">Онлайн-бронь</span><h2>${esc(c.booking.title)}</h2>${c.booking.steps.map((s) => `<p>${esc(s)}</p>`).join('')}<p>${esc(c.booking.after)}</p></div>
<div class="frame"><iframe src="${esc(c.booking.widget)}" title="Календарь бронирования, зал ${esc(h.name)}" height="${c.booking.height}" loading="lazy"></iframe></div>
</div></section>
</main>
<dialog class="lb" aria-label="Просмотр фото"><div class="stage"><img alt=""></div><button class="x" aria-label="Закрыть">×</button><button class="p" aria-label="Назад">‹</button><button class="n" aria-label="Вперёд">›</button></dialog>`;
  return { path: `${h.pageSlug}/index.html`, html: shell({ title: c.title, description: c.description, body, current: 'Залы' }) };
}

function tierTable(h) {
  return `<table class="ptable"><caption>${esc(h.name)}</caption><thead><tr>${h.tiers.map((t) => `<th>${esc(t.people)}</th>`).join('')}</tr></thead><tbody><tr>${h.tiers.map((t) => `<td>${money(t.price)} ₽<small> / час</small></td>`).join('')}</tr></tbody></table>`;
}

function eqPrice(item) {
  if (item.tiers) return item.tiers.map((t) => { const p = prices.items[t.price]; usedPriceKeys.add(t.price); return `<span class="pr"><b>${money(p.price)} ₽</b><small>${t.qty} шт · ${unitLabel(p.unit)}</small></span>`; }).join('');
  if (item.free) return `<span class="pr free"><b>бесплатно</b></span>`;
  if (item.price) { const p = prices.items[item.price]; usedPriceKeys.add(item.price); return `<span class="pr"><b>${money(p.price)} ₽</b><small>${unitLabel(p.unit)}</small></span>`; }
  return '';
}

function equipmentPage() {
  const c = C['oborudovanie.json'];
  const videos = C['videos.json'] || {};
  const chips = c.groups.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join('');
  const watch = (i) => {
    const src = videos[i.id] && vkEmbed(videos[i.id]);
    return src ? `<button class="eq-play" data-video="${esc(src)}" data-title="${esc(i.name)}"><span aria-hidden="true">▶</span> <i>Смотреть </i>в работе</button>` : '';
  };
  const card = (i) => `<article class="eq-card${i.qty === 0 ? ' soon' : ''}" id="${esc(i.id)}">
<div class="eq-pic">${i.photo ? photo(i.photo) : ''}${watch(i)}</div>
<h3>${esc(i.name)}</h3>${i.desc ? `<p>${esc(i.desc)}</p>` : ''}
<div class="eq-foot"><span class="eq-qty">${i.qty ? `${i.qty} шт` : 'скоро'}</span><span class="eq-price">${eqPrice(i)}</span></div>
</article>`;
  const swatch = (i) => `<li class="eq-swatch">${i.photo ? photo(i.photo) : ''}<span>${esc(i.name)}${i.qty > 1 ? `<small> · ${i.qty} шт</small>` : ''}</span>${watch(i)}</li>`;
  const groups = c.groups.map((g) => {
    const rows = !g.compact
      ? `<div class="eq-cards">${g.items.map(card).join('')}</div>`
      : g.items.some((i) => i.photo)
        ? `<ul class="eq-swatches">${g.items.map(swatch).join('')}</ul>`
        : `<ul class="chips">${g.items.map((i) => `<li>${esc(i.name)}${i.qty > 1 ? `<small> · ${i.qty} шт</small>` : ''}</li>`).join('')}</ul>`;
    return `<section class="eq-group" id="${g.id}"><h2>${esc(g.title)}</h2>${g.note ? `<p class="eq-note">${esc(g.note)}</p>` : ''}${rows}</section>`;
  }).join('\n');
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / Оборудование</span></div>
<section class="wrap page-title"><h1>${esc(c.heading)}</h1><div class="pt-side"><p class="lede-s">${esc(c.lede)}</p><p class="pt-note">${esc(c.note)}</p></div></section>
<div class="wrap"><nav class="chips-nav" aria-label="Разделы">${chips}</nav>${groups}</div>
</main>
<dialog class="vd" aria-label="Видео"><div class="vd-box"><div class="vd-head"><span class="vd-title"></span><button class="vd-x" aria-label="Закрыть">×</button></div><div class="vd-frame"></div></div></dialog>`;
  return { path: 'oborudovanie/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Оборудование' }) };
}

function rulesPage() {
  const c = C['pravila_i_cena.json'];
  const block = (b) => {
    if (b.p) return `<p>${inline(b.p)}</p>`;
    if (b.ul) return `<ul>${b.ul.map((t) => `<li>${inline(t)}</li>`).join('')}</ul>`;
    if (b.h) return `<h3>${esc(b.h)}</h3>`;
    if (b.halls) return `<div class="ptables">${Object.values(halls).map(tierTable).join('')}</div>`;
    throw new Error('unknown rules block');
  };
  const secs = c.sections.map((s) => `<section class="rule" id="p${esc(s.n.replace(/[^0-9а-я]/gi, '-'))}"><div class="rule-h"><span class="num">${esc(s.n)}</span><h2>${esc(s.title)}</h2></div><div class="rule-b">${s.blocks.map(block).join('')}</div></section>`).join('\n');
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / Правила</span></div>
<section class="wrap page-title"><h1>${esc(c.heading)}</h1><div class="pt-side"><p class="lede-s">${esc(c.lede)}</p></div></section>
<div class="wrap rules">${secs}</div>
</main>`;
  return { path: 'pravila_i_cena/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Правила' }) };
}


const pageHead = (crumb, c) => `<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / ${esc(crumb)}</span></div>
<section class="wrap page-title"><h1>${esc(c.heading)}</h1><div class="pt-side"><p class="lede-s">${esc(c.lede)}</p></div></section>`;
const telLink = (href, label) => `<a href="tel:${href}">${esc(label)}</a>`;
const galleryBlock = (slots) => `<div class="cols">${slots.map((s) => `<button class="open" aria-label="Открыть фото" style="--r:${photos[s].ratio}">${photo(s)}</button>`).join('')}</div>`;
const LIGHTBOX = '<dialog class="lb" aria-label="Просмотр фото"><div class="stage"><img alt=""></div><button class="x" aria-label="Закрыть">×</button><button class="p" aria-label="Назад">‹</button><button class="n" aria-label="Вперёд">›</button></dialog>';

function findPage() {
  const c = C['kak-najti.json'];
  const body = `<main>
${pageHead('Как найти', c)}
<section class="wrap find">
<div class="find-map"><iframe src="${esc(c.map)}" title="Фотостудия Томсон на Яндекс Картах" loading="lazy" allowfullscreen></iframe></div>
<div class="find-info">
<div class="find-contact"><span class="label">Телефон</span><p class="find-phone">${telLink(site.phoneHref, site.phone)}</p>${c.hours.map((h) => `<p>${esc(h)}</p>`).join('')}</div>
<h2>${esc(c.stepsTitle)}</h2>
<ol class="steps">${c.steps.map((t) => `<li>${esc(t)}</li>`).join('')}</ol>
<p>${esc(c.alt)}</p>
<p class="warn">${esc(c.closed)}</p>
</div>
</section>
<section class="wrap find-photos">${c.photos.map((p) => `<figure class="find-ph">${photo(p.slot)}<figcaption>${esc(p.caption)}</figcaption></figure>`).join('')}</section>
</main>`;
  return { path: 'kak-najti/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Как найти' }) };
}

function schedulePage() {
  const c = C['raspisanie.json'];
  const body = `<main>
${pageHead('Расписание', c)}
<section class="booking" id="bron"><div class="wrap grid">
<div class="intro"><span class="label">Онлайн-бронь</span><h2>Календарь залов</h2>${c.steps.map((t) => `<p>${esc(t)}</p>`).join('')}<p>Залы: ${Object.values(halls).map((h) => `<a href="${esc(hallUrl(h))}">${esc(h.name)}</a>`).join(', ')}.</p></div>
<div class="frame"><iframe src="${esc(c.widget)}" title="Календарь бронирования залов" height="${c.height}" loading="lazy"></iframe></div>
</div></section>
</main>`;
  return { path: 'raspisanie/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Расписание' }) };
}

function servicesPage() {
  const c = C['sertifikaty.json'];
  const cards = c.cards.map((k) => `<article class="cert">
<div class="cert-ph">${photo(k.photo)}</div>
<div class="cert-b"><span class="label">Подарочный сертификат</span><h2>${esc(k.title)}</h2>
<ul class="cert-rows">${k.rows.map(([l, key]) => `<li><span>${esc(l)}</span><b>${priceStr(key)}</b></li>`).join('')}</ul>
${k.text ? `<p>${esc(k.text)}</p>` : ''}</div>
</article>`).join('');
  const body = `<main>
${pageHead('Услуги', c)}
<section class="wrap certs">${cards}</section>
<section class="wrap cert-buy"><p>${esc(c.buy)}</p><a class="btn solid" href="tel:${site.phoneHref}">${esc(site.phone)}</a></section>
</main>`;
  return { path: 'sertifikaty/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Услуги' }) };
}

function schoolPage() {
  const c = C['fotosfera.json'];
  const events = C['events.json'] || [];
  // announcements: the page lists them in the order saved; site.js moves past ones down and marks them
  const eventCard = (e) => `<article class="ev" id="${esc(e.id)}"${e.date ? ` data-date="${esc(e.date)}"` : ' data-past'}>
${e.photo && versions[e.photo] ? `<figure class="ph" style="--r:1/1"><img src="/photos/${e.photo}.jpg?v=${versions[e.photo]}" alt="${esc(e.kind + ' ' + e.title)}" loading="lazy" decoding="async"></figure>` : ''}
<div class="ev-b"><p class="ev-when"><b>${esc(e.day)}</b> ${esc(e.time || '')}<span class="ev-past">прошло</span></p>
<h3><span>${esc(e.kind)}</span> ${esc(e.title)}</h3><p>${esc(e.text)}</p><p class="ev-place">${esc(e.place)}</p></div>
</article>`;
  const strip = (slots) => `<section class="wrap strip">${slots.map((s) => photo(s)).join('')}</section>`;
  const course = (k, i) => `<article class="course${i % 2 ? ' flip' : ''}">
${photo(k.photo)}
<div class="course-b"><span class="label">${esc(k.kicker)}</span><h2>${esc(k.name)}</h2>${k.text.map((t) => `<p>${esc(t)}</p>`).join('')}
<details class="program"><summary>Программа курса · ${k.program.length} ${k.program.length % 10 === 1 && k.program.length % 100 !== 11 ? 'тема' : 'тем'}</summary><ol>${k.program.map((t) => `<li>${esc(t)}</li>`).join('')}</ol></details></div>
</article>`;
  const body = `<main>
<section class="school-banner" style="--bg:url('/photos/${c.banner}.jpg?v=${versions[c.banner]}')" role="img" aria-label="${esc(photos[c.banner].alt)}">
<div class="sb-in"><img class="sb-logo" src="/img/sfera-logo.png" alt="" width="300" height="300"><h1 class="sr">${esc(c.heading)}</h1>
<p class="sb-lede">${esc(c.lede)}</p><p class="sb-mission">${esc(c.mission)}</p>
<div class="actions"><a class="btn solid" href="#zapis">Записаться</a><a class="btn light" href="#kursy">Курсы и цены</a></div></div>
</section>
${events.length ? `<section class="wrap events" id="afisha"><div class="sec-head"><h2>${esc(c.eventsTitle)}</h2><span class="label">${esc(c.eventsNote)}</span></div>
<div class="ev-list">${events.map(eventCard).join('')}</div></section>` : ''}
<section class="wrap courses" id="kursy">${c.courses.map(course).join('')}</section>
${strip(c.strips[0])}
<section class="wrap learn"><div><h2>${esc(c.learnTitle)}</h2><ul>${c.learn.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div><div class="vision">${c.vision.map((t) => `<p>${esc(t)}</p>`).join('')}</div></section>
<section class="wrap packs"><div class="sec-head" style="padding-top:0"><h2>Стоимость</h2><span class="label">Рассрочка — раз в неделю</span></div>
<div class="pack-grid">${c.packages.map((k) => `<article class="pack"><span class="label">${esc(k.kicker)}</span><h3>${esc(k.name)}</h3><p class="pack-price">${priceStr(k.price)}</p><p class="pack-n">${esc(k.lessons)}</p><ul>${k.notes.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></article>`).join('')}</div></section>
${strip(c.strips[1])}
<section class="wrap faq"><h2>Вопрос — ответ</h2>${c.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</section>
<section class="wrap teacher"><span class="label">Преподаватель</span><h2>${esc(c.teacher.name)}</h2><p>${esc(c.teacher.text)}</p></section>
<section class="school-cta" id="zapis"><div class="wrap cta-grid"><div><h2>${esc(c.contact.cta)}</h2><p class="cta-phone">${telLink(c.contact.phoneHref, c.contact.phone)}</p><p>${esc(c.contact.address)}</p></div>${photo(c.contact.photo)}</div></section>
<section class="wrap gallery"><div class="sec-head" style="padding-top:0"><h2 style="font-size:clamp(32px,4.4vw,60px)">${esc(c.galleryTitle)}</h2><span class="label">${esc(c.galleryNote)}</span></div>${galleryBlock(c.gallery)}</section>
</main>
${LIGHTBOX}`;
  return { path: 'fotosfera/index.html', html: shell({ title: c.title, description: c.description, body, current: 'Фотошкола' }) };
}

  const files = [{ path: 'index.html', html: home() }];
  for (const f of PAGE_FILES.filter((n) => n.startsWith('zal-'))) files.push(hallPage(f));
  files.push(equipmentPage(), rulesPage(), findPage(), schedulePage(), servicesPage(), schoolPage());
  const unused = Object.keys(prices.items).filter((k) => !usedPriceKeys.has(k));
  return { files, unused };
}

// VK Video: accepts a page link (vkvideo.ru/video-1_2, vk.com/video?z=video-1_2) or the
// «Экспортировать → код для вставки» iframe; returns the player address or null.
// The embed code carries a hash that some videos need, so it is the surest input.
export function vkEmbed(input) {
  let s = String(input || '').trim().replace(/&amp;/g, '&');
  const src = s.match(/src=["']([^"']+)["']/);
  if (src) s = src[1];
  let oid, id, hash;
  const ext = s.match(/video_ext\.php\?([^"'\s<>]+)/);
  if (ext) {
    const q = new URLSearchParams(ext[1]);
    [oid, id, hash] = [q.get('oid'), q.get('id'), q.get('hash')];
  } else {
    const m = s.match(/^https?:\/\/(?:m\.)?(?:vkvideo\.ru|vk\.com|vk\.ru)\/.*?video(-?\d+)_(\d+)/);
    if (m) [oid, id] = [m[1], m[2]];
  }
  if (!/^-?\d{1,12}$/.test(oid || '') || !/^\d{1,12}$/.test(id || '')) return null;
  const h = hash && /^[0-9a-f]{6,32}$/.test(hash) ? `&hash=${hash}` : '';
  return `https://vkvideo.ru/video_ext.php?oid=${oid}&id=${id}${h}&hd=2&autoplay=1`;
}

// Edits from the admin page, applied by the cloud function to content loaded from the bucket.
// Lives here, next to the pages, so a new kind of edit ships with a normal deploy instead of a
// new function version. Returns { changes: [text], files: [content files that changed] };
// throws an Error with .user = true for a mistake Alexey can fix himself.
export const ADMIN_FILES = ['prices.json', 'videos.json', 'events.json'];
const userError = (msg) => Object.assign(new Error(msg), { user: true });

export function adminEdit(C, req) {
  if (req.action === 'prices') return editPrices(C, req);
  if (req.action === 'videos') return editVideos(C, req);
  if (req.action === 'events') return editEvents(C, req);
  throw userError('нет такого действия');
}

function editPrices(C, req) {
  const prices = C['prices.json'], halls = C['halls.json'], changes = [];
  const price = (v, label) => {
    if (!Number.isInteger(v) || v < 0 || v > 1_000_000) throw userError(`${label}: цена должна быть целым числом рублей`);
    return v;
  };
  for (const [hk, vals] of Object.entries(req.halls || {})) {
    const tiers = prices.halls[hk];
    if (!tiers || !Array.isArray(vals) || vals.length !== tiers.length) throw userError('зал или ступени не совпадают с сайтом, обновите страницу');
    tiers.forEach((t, i) => {
      const n = price(vals[i], `${halls[hk].name}, ${t.people}`);
      if (n !== t.price) changes.push(`${halls[hk].name}, ${t.people}: ${t.price} → ${n}`);
      t.price = n;
    });
  }
  for (const [k, upd] of Object.entries(req.items || {})) {
    const it = prices.items[k];
    if (!it) throw userError('такой позиции уже нет на сайте, обновите страницу');
    if ('price' in upd) {
      const n = price(upd.price, it.label);
      if (it.unit === 'percent' && n > 100) throw userError(`${it.label}: процент больше 100`);
      if (n !== it.price) { changes.push(`${it.label}: ${it.price} → ${n}`); delete it.check; }
      it.price = n;
    }
    if (upd.check === false && it.check) { changes.push(`${it.label}: цена ${it.price} проверена`); delete it.check; }
  }
  return { changes, files: changes.length ? ['prices.json'] : [] };
}

function editVideos(C, req) {
  const videos = (C['videos.json'] = C['videos.json'] || {}), changes = [];
  const items = Object.fromEntries(C['oborudovanie.json'].groups.flatMap((g) => g.items).map((i) => [i.id, i]));
  for (const [id, raw] of Object.entries(req.videos || {})) {
    const it = items[id];
    if (!it) throw userError('такой позиции уже нет на сайте, обновите страницу');
    const text = String(raw || '').trim();
    if (!text) {
      if (videos[id]) { delete videos[id]; changes.push(`${it.name}: ролик убран`); }
      continue;
    }
    const src = vkEmbed(text);
    if (!src) throw userError(`${it.name}: не похоже на ссылку VK Видео. Вставьте код из «Поделиться → Экспортировать» или ссылку на ролик`);
    const keep = src.replace(/&hd=2&autoplay=1$/, '');
    if (videos[id] !== keep) { changes.push(`${it.name}: ${videos[id] ? 'ролик заменён' : 'ролик добавлен'}`); videos[id] = keep; }
  }
  return { changes, files: changes.length ? ['videos.json'] : [] };
}

// Places a photo can be uploaded to from the admin: page slots plus one per announcement.
export function photoSlotOk(C, slot) {
  return !!C['photos.json'][slot] || (C['events.json'] || []).some((e) => e.photo === slot);
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
export const eventDay = (iso) => { const [, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]}`; };

// Announcements of the photo school. The admin sends the whole list; ids of new ones are made here.
function editEvents(C, req) {
  const old = C['events.json'] || [];
  const byId = Object.fromEntries(old.map((e) => [e.id, e]));
  const text = (v, max, label, need) => {
    const t = String(v ?? '').replace(/\s+/g, ' ').trim();
    if (need && !t) throw userError(`${label}: заполните поле`);
    if (t.length > max) throw userError(`${label}: слишком длинно, до ${max} знаков`);
    return t;
  };
  if (!Array.isArray(req.events) || req.events.length > 60) throw userError('список мероприятий не прочитался, обновите страницу');
  const used = new Set();
  const list = req.events.map((e, i) => {
    const title = text(e.title, 80, `Мероприятие ${i + 1}, название`, true);
    const date = String(e.date || '');
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw userError(`${title}: дата не прочиталась`);
    let id = byId[e.id] ? e.id : `ev-${(date || 'b-d').replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6)}`;
    if (used.has(id)) throw userError('два мероприятия с одним номером, обновите страницу');
    used.add(id);
    const prev = byId[id] || {};
    return {
      id, date,
      day: date ? eventDay(date) : text(prev.day || e.day, 30, `${title}, дата`, true),
      time: text(e.time, 30, `${title}, время`),
      kind: text(e.kind, 40, `${title}, вид`),
      title,
      text: text(e.text, 600, `${title}, описание`),
      place: text(e.place, 120, `${title}, место`),
      photo: prev.photo || (id.startsWith('ev-') ? id : ''),
    };
  });
  const changes = [];
  for (const e of list) {
    const p = byId[e.id];
    if (!p) changes.push(`Добавлено: ${e.kind} ${e.title}`);
    else if (JSON.stringify(p) !== JSON.stringify(e)) changes.push(`Изменено: ${e.kind} ${e.title}`);
  }
  for (const p of old) if (!used.has(p.id)) changes.push(`Удалено: ${p.kind} ${p.title}`);
  if (!changes.length && list.map((e) => e.id).join() !== old.map((e) => e.id).join()) changes.push('Изменён порядок');
  C['events.json'] = list;
  return { changes, files: changes.length ? ['events.json'] : [], ids: list.map((e) => e.id) };
}
