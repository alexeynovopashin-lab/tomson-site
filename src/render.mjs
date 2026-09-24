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
const PAGE_FILES = Object.keys(C).filter((f) => f.startsWith('zal-') || ['oborudovanie.json', 'pravila_i_cena.json'].includes(f));
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
<p class="note">${esc(site.footerNote)}</p>
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
<div class="actions"><a class="btn solid" href="#zaly">Выбрать зал</a><a class="btn" href="${site.oldSite}/kak-najti">Как найти</a></div></div>
<div class="fig">${photo(c.cover.photo, { eager: true })}<figcaption>${esc(c.cover.caption)}</figcaption></div>
</section>
<div class="wrap"><div class="facts">${c.facts.map((f) => `<div><b>${esc(f.value)}</b><span class="label">${esc(f.label)}</span></div>`).join('')}</div></div>
<section class="wrap" id="zaly">
<div class="sec-head"><h2>${esc(c.hallsTitle)}</h2><span class="label">Выберите зал</span></div>
${Object.values(halls).map(hallCard).join('\n')}
</section>
<section class="band">${photo(c.band.photo)}<blockquote><div class="wrap"><p>${esc(c.band.quote)}</p><cite>${esc(c.band.by)}</cite></div></blockquote></section>
<section class="wrap visit"><h2>${esc(c.visit.title)}</h2><div class="info"><p>${esc(c.visit.text)}</p><a class="btn" href="${site.oldSite}/kak-najti">Схема проезда</a></div></section>
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
  const chips = c.groups.map((g) => `<a href="#${g.id}">${esc(g.title)}</a>`).join('');
  const groups = c.groups.map((g) => {
    const rows = g.compact
      ? `<ul class="chips">${g.items.map((i) => `<li>${esc(i.name)}${i.qty > 1 ? `<small> · ${i.qty} шт</small>` : ''}</li>`).join('')}</ul>`
      : `<div class="eq">${g.items.map((i) => `<div class="eq-row${i.qty === 0 ? ' soon' : ''}"><div class="eq-name"><h3>${esc(i.name)}</h3>${i.desc ? `<p>${esc(i.desc)}</p>` : ''}</div><div class="eq-qty">${i.qty ? `${i.qty} шт` : ''}</div><div class="eq-price">${eqPrice(i)}</div></div>`).join('')}</div>`;
    return `<section class="eq-group" id="${g.id}"><h2>${esc(g.title)}</h2>${g.note ? `<p class="eq-note">${esc(g.note)}</p>` : ''}${rows}</section>`;
  }).join('\n');
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / Оборудование</span></div>
<section class="wrap page-title"><h1>${esc(c.heading)}</h1><div class="pt-side"><p class="lede-s">${esc(c.lede)}</p><p class="pt-note">${esc(c.note)}</p></div></section>
<div class="wrap"><nav class="chips-nav" aria-label="Разделы">${chips}</nav>${groups}</div>
</main>`;
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

  const files = [{ path: 'index.html', html: home() }];
  for (const f of PAGE_FILES.filter((n) => n.startsWith('zal-'))) files.push(hallPage(f));
  files.push(equipmentPage(), rulesPage());
  const unused = Object.keys(prices.items).filter((k) => !usedPriceKeys.has(k));
  return { files, unused };
}
