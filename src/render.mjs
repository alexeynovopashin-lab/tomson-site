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
if (C['fotograf.json']) ported.add('fotograf');
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

// Messenger glyphs: own simple outlines (no brand artwork); a channel with an empty href is not shown.
const CHANNEL_ICONS = {
  whatsapp: '<path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5z"/><path d="M9 8.5c-.3 1.6 1.6 4.6 4.5 5.7.8.3 1.7-.3 1.9-1l-1.8-1-.8.7c-.9-.4-1.8-1.3-2.2-2.2l.7-.8-1-1.8c-.5.1-1.1.2-1.3.4z"/>',
  telegram: '<path d="M20.5 4 3.5 10.6l5.2 1.9 1.9 5.6 2.7-3.3 4.6 3.4z"/><path d="m8.7 12.5 11-7.3-8.4 9.3"/>',
  max: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M8 16V8.5l4 4.5 4-4.5V16"/>',
  vk: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><path d="M7 9l2.2 5.2M12 14.2V9m0 3 3-3m-3 3 3.2 2.2"/>',
  instagram: '<rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17" cy="7" r=".6"/>',
};
function channelLinks(cls) {
  const list = (site.channels || []).filter((ch) => ch.href && CHANNEL_ICONS[ch.id]);
  if (!list.length) return '';
  return `<ul class="${cls}">${list
    .map((ch) => `<li><a href="${esc(ch.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(ch.label)} (откроется в новой вкладке)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CHANNEL_ICONS[ch.id]}</svg><span>${esc(ch.label)}</span></a></li>`)
    .join('')}</ul>`;
}

// Phone header: next to «Меню» a strip that scrolls sideways (like Kinfolk, Esquire): the pages
// listed in site.json → quick, then the messengers as icons. Hidden on wide screens (full menu there).
function quickStrip() {
  const pages = (site.quick || []).map((slug) => site.nav.find((n) => n.slug === slug)).filter(Boolean)
    .map((n) => `<a href="${esc(navUrl(n))}">${esc(n.label)}</a>`);
  const chans = (site.channels || []).filter((ch) => ch.href && CHANNEL_ICONS[ch.id])
    .map((ch) => `<a class="q-ic" href="${esc(ch.href)}" target="_blank" rel="noopener noreferrer" aria-label="${esc(ch.label)} (откроется в новой вкладке)"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${CHANNEL_ICONS[ch.id]}</svg></a>`);
  const find = SEARCH.title ? [`<a class="q-ic" href="${SEARCH_URL}" aria-label="${esc(SEARCH.title)}">${SEARCH_ICON}</a>`] : [];
  const all = pages.concat(find, chans);
  return all.length ? `<div class="quick" role="group" aria-label="Быстрые ссылки">${all.join('')}</div>` : '';
}

function contactsBlock() {
  const links = channelLinks('channels');
  if (!links) return '';
  return `<section class="wrap contacts" id="kontakty">
<div class="contacts-head"><span class="label">${esc(site.name)}</span><h2>${esc(site.contactsTitle)}</h2><p>${esc(site.contactsLead)}</p></div>
<div class="contacts-body"><p class="contacts-line"><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></p><p class="contacts-addr">${esc(site.city)}, ${esc(site.address)}</p>${links}</div>
</section>`;
}

// Privacy policy: on only once content/privacy.json names the operator; then the page, the footer
// link and the consent tick-box in the request form all appear together.
const privacy = C['privacy.json'];
const privacyOn = !!(privacy && privacy.operator);
const PRIVACY_URL = '/politika/';

// Search engines and link previews: canonical address, og: tags, the studio card on the home page.
// All absolute URLs hang on site.json → siteUrl (the main domain); without it these tags are left out.
const SEARCH = site.search || {};
const SEARCH_URL = '/poisk/';
const SEARCH_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5 5"/></svg>';
const pagesSeen = []; // { url, title } of every page rendered so far: the search page reads them
const urlOf = (path) => '/' + path.replace(/index\.html$/, '');
function seoHead({ title, description, url, image, imageAbs }) {
  if (!site.siteUrl) return '';
  const abs = site.siteUrl + url;
  if (!image && !imageAbs) image = C['home.json'].cover.photo; // pages without a picture of their own share the home cover
  const img = imageAbs ? site.siteUrl + imageAbs : image && versions[image] ? `${site.siteUrl}/photos/${image}.jpg?v=${versions[image]}` : '';
  const tags = [`<link rel="canonical" href="${esc(abs)}">`,
    `<meta property="og:type" content="website">`, `<meta property="og:locale" content="ru_RU">`,
    `<meta property="og:site_name" content="${esc(site.seoName || site.name)}">`,
    `<meta property="og:title" content="${esc(title)}">`, `<meta property="og:description" content="${esc(description)}">`,
    `<meta property="og:url" content="${esc(abs)}">`];
  if (img) tags.push(`<meta property="og:image" content="${esc(img)}">`, `<meta name="twitter:card" content="summary_large_image">`);
  if (url === '/') {
    // the studio card for Yandex / Google: name, address, phone, messengers
    const card = { '@context': 'https://schema.org', '@type': 'LocalBusiness', name: site.seoName || site.name, url: site.siteUrl + '/',
      telephone: site.phoneHref, image: img || undefined,
      address: { '@type': 'PostalAddress', streetAddress: site.address, addressLocality: site.city, addressCountry: 'RU' },
      sameAs: (site.channels || []).filter((ch) => ch.href).map((ch) => ch.href) };
    tags.push(`<script type="application/ld+json">${JSON.stringify(card).replace(/</g, '\\u003c')}</script>`);
  }
  return tags.join('\n') + '\n';
}
const page = (path, o) => ({ path, html: shell({ ...o, path }), ...(o.noindex ? { noindex: true } : {}) });

function shell({ title, description, body, current, path, image, imageAbs, noindex }) {
  const url = urlOf(path);
  pagesSeen.push({ url, title });
  const items = site.nav
    .map((n) => `<li><a href="${esc(navUrl(n))}"${current === n.label ? ' aria-current="page"' : ''}>${esc(n.label)}</a></li>`)
    .join('') + (SEARCH.title ? `<li class="nav-search"><a href="${SEARCH_URL}"${current === 'search' ? ' aria-current="page"' : ''} aria-label="${esc(SEARCH.title)}">${SEARCH_ICON}<span>${esc(SEARCH.menu)}</span></a></li>` : '');
  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : seoHead({ title, description, url, image, imageAbs })}<meta name="theme-color" content="#f5f1ea">
<link rel="preload" href="/fonts/playfair-cyr.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="topline"><div class="wrap"><span>${esc(site.city)} · ${esc(site.address)}</span><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></div></div>
<header class="brand"><a href="/"><span class="label">${esc(site.tagline)}</span><span class="word">${esc(site.name)}</span></a></header>
<nav class="main" aria-label="Основное меню"><div class="wrap"><button class="menu-btn" aria-expanded="false" aria-controls="menu">Меню</button>${quickStrip()}<ul id="menu">${items}</ul></div></nav>
${body}
<footer><div class="wrap">
<div class="word">${esc(site.name)}</div>
<div class="col"><span class="label">Адрес</span><p>${esc(site.city)}, ${esc(site.address)}</p></div>
<div class="col"><span class="label">Телефон</span><p><a href="tel:${site.phoneHref}">${esc(site.phone)}</a></p></div>
${privacyOn ? `<div class="col legal-link"><a href="${PRIVACY_URL}">${esc(privacy.footerLink)}</a></div>` : ''}
${channelLinks('channels') ? `<div class="col chan"><span class="label">Мессенджеры</span>${channelLinks('channels')}</div>` : ''}
${site.nav.some((n) => n.slug && !ported.has(n.slug)) ? `<p class="note">${esc(site.footerNote)}</p>` : ''}
</div></footer>
<script src="/site.js" defer></script>
</body>
</html>
`;
}

// Request form: posts to the form cloud function (site.json → formApi), texts in form.json.
// preset = the «interest» option chosen in advance (the photo school page picks the school).
function requestForm(preset) {
  const f = C['form.json'];
  if (!f || !site.formApi) return '';
  const opts = (preset && !f.interests.includes(preset) ? [preset, ...f.interests] : f.interests).map((t) => `<option${t === preset ? ' selected' : ''}>${esc(t)}</option>`).join('');
  const id = (k) => `rf-${k}`;
  return `<section class="wrap rform-sec" id="zayavka">
<div class="rform-head"><span class="label">${esc(f.label)}</span><h2>${esc(f.title)}</h2><p>${esc(f.lead)}</p></div>
<form class="rform" data-api="${esc(site.formApi)}" data-sending="${esc(f.sending)}" data-sent="${esc(f.sent)}" data-err-fields="${esc(f.errorFields)}" data-err-rate="${esc(f.errorRate)}" data-err-agree="${esc(f.errorAgree || '')}" data-err="${esc(f.error)} ${esc(site.phone)}" novalidate>
<div class="rf-row"><label for="${id('name')}">${esc(f.fields.name)}</label><input id="${id('name')}" name="name" autocomplete="name" maxlength="80" required></div>
<div class="rf-row"><label for="${id('phone')}">${esc(f.fields.phone)}</label><input id="${id('phone')}" name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="40" required></div>
<div class="rf-row rf-wide"><label for="${id('interest')}">${esc(f.fields.interest)}</label><select id="${id('interest')}" name="interest">${opts}</select></div>
<div class="rf-row rf-wide"><label for="${id('message')}">${esc(f.fields.message)}</label><textarea id="${id('message')}" name="message" rows="4" maxlength="2000" placeholder="${esc(f.messagePlaceholder)}"></textarea></div>
<div class="rf-trap" aria-hidden="true"><label>Сайт<input name="website" tabindex="-1" autocomplete="off"></label></div>
${privacyOn ? `<div class="rf-row rf-wide rf-agree"><label><input type="checkbox" name="agree" required> <span>${esc(privacy.agree)} <a href="${PRIVACY_URL}" target="_blank" rel="noopener">${esc(privacy.agreeLink)}</a></span></label></div>` : ''}
<div class="rf-foot rf-wide"><button class="btn solid" type="submit">${esc(f.button)}</button>${privacyOn ? '' : `<p class="rf-consent">${esc(f.consent)}</p>`}</div>
<p class="rf-status rf-wide" role="status" aria-live="polite"></p>
</form>
</section>`;
}

function hallCard(h) {
  const url = esc(hallUrl(h));
  // photo and name lead to the hall page like the button does; the photo link is hidden from keyboard and screen readers (the name link is the same address)
  const pic = photo(h.photo).replace(/(<img[^>]*>)/, `<a class="hall-link" href="${url}" tabindex="-1" aria-hidden="true">$1</a>`);
  return `<article class="hall">
${pic}
<div class="body">
<span class="num">№ ${h.number}</span>
<h3><a class="hall-link" href="${url}">${esc(h.name)}</a></h3>
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
${SVC ? `<section class="wrap" id="foto"><div class="sec-head"><h2>${esc(SVC.homeTitle)}</h2><a class="label" href="/fotograf/">${esc(SVC.homeLink)}</a></div><p class="svc-lede">${esc(SVC.homeLede)}</p>${svcGrid(SVC.list)}</section>` : ''}
<section class="band">${photo(c.band.photo)}<blockquote><div class="wrap"><p>${esc(c.band.quote)}</p><cite>${esc(c.band.by)}</cite></div></blockquote></section>
<section class="wrap visit"><h2>${esc(c.visit.title)}</h2><div class="info"><p>${esc(c.visit.text)}</p><a class="btn" href="${slugUrl('kak-najti')}">Схема проезда</a></div></section>
${contactsBlock()}
${requestForm()}
</main>`;
  return shell({ title: c.title, description: c.description, body, path: 'index.html', image: c.cover.photo });
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
${PORT_ON ? seriesBlock(seriesIn(h.pageSlug), `Фотосессии в зале ${h.name}`, 'Смотреть съёмку и узнать цену') : ''}
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
  return page(`${h.pageSlug}/index.html`, { title: c.title, description: c.description, body, current: 'Залы', image: c.photo });
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
  return page('oborudovanie/index.html', { title: c.title, description: c.description, body, current: 'Оборудование' });
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
  return page('pravila_i_cena/index.html', { title: c.title, description: c.description, body, current: 'Правила' });
}


const pageHead = (crumb, c) => `<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / ${esc(crumb)}</span></div>
<section class="wrap page-title"><h1>${esc(c.heading)}</h1><div class="pt-side"><p class="lede-s">${esc(c.lede)}</p></div></section>`;
const telLink = (href, label) => `<a href="tel:${href}">${esc(label)}</a>`;
const galleryBlock = (slots) => `<div class="cols">${slots.map((s) => `<button class="open" aria-label="Открыть фото" style="--r:${photos[s].ratio}">${photo(s)}</button>`).join('')}</div>`;
const LIGHTBOX = '<dialog class="lb" aria-label="Просмотр фото"><div class="stage"><img alt=""></div><button class="x" aria-label="Закрыть">×</button><button class="p" aria-label="Назад">‹</button><button class="n" aria-label="Вперёд">›</button></dialog>';

function privacyPage() {
  const c = privacy;
  const contact = `${c.email ? `письмом на ${c.email}, ` : ''}по телефону ${site.phone} или в мессенджеры, указанные на сайте`;
  const fill = (t) => esc(t).replace('{operator}', esc(c.operator)).replace('{city}', esc(site.city)).replace('{address}', esc(site.address)).replace(/\{contact\}/g, esc(contact));
  const body = `<main>
${pageHead('Политика', c)}
<section class="wrap legal">
${c.sections.map((s) => `<h2>${esc(s.h)}</h2>${s.p.map((t) => `<p>${fill(t)}</p>`).join('')}`).join('\n')}
</section>
</main>`;
  return page('politika/index.html', { title: c.title, description: c.description, body, current: '' });
}

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
  return page('kak-najti/index.html', { title: c.title, description: c.description, body, current: 'Как найти' });
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
  return page('raspisanie/index.html', { title: c.title, description: c.description, body, current: 'Расписание' });
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
${SVC ? `<section class="wrap" id="fotosemka"><div class="sec-head"><h2>${esc(SVC.studioBlockTitle)}</h2></div><p class="svc-lede">${esc(SVC.studioBlockLede)} <a href="/fotograf/">О фотографе</a></p>${svcGrid(SVC.list)}</section>` : ''}
</main>`;
  return page('sertifikaty/index.html', { title: c.title, description: c.description, body, current: 'Услуги' });
}

// Site search: no service and no index file. site.js loads the pages listed here when someone
// searches and looks through their text, so prices and announcements edited in the admin are found at once.
// Photographer landing (/fotograf/) and photo services (/uslugi/<slug>/). One service list
// (services.json) feeds the landing, each service page and the block on the studio «Услуги» page.
// Portfolio series (portfolio.json, made by tools/portfolio.py) live outside photo slots:
// hashed files under /photos/p/<series>/, thumbnails in t/, not replaced from the admin.
const PORT_ON = !!C['portfolio.json'];
const PORT = Object.fromEntries((C['portfolio.json'] || []).map((x) => [x.id, x]));
// series shown in a place ('fotograf' or a service slug), in the order of portfolio.json
const seriesIn = (place) => (C['portfolio.json'] || []).filter((x) => x.places.includes(place)).map((x) => x.id);
const SVC = C['services.json'];
const FG = C['fotograf.json'];
// «Записаться» leads to the schedule (Alexey 2026-10-06: the form button worked badly there);
// next to it: the phone and the messengers
const bookActions = (extra = '') => `<div class="actions book"><a class="btn solid" href="${slugUrl('raspisanie')}">Записаться</a><a class="btn" href="tel:${site.phoneHref}">${esc(site.phone)}</a>${extra}${channelLinks('channels book-ch')}</div>`;
const svcUrl = (k) => `/${SVC.base}/${k.slug}/`;
function pf(id, i, { eager = false } = {}) {
  const ser = PORT[id];
  if (!ser || !ser.photos[i]) throw new Error(`no portfolio photo: ${id} #${i}`);
  const p = ser.photos[i];
  return `<figure class="ph" style="--r:${p.r}"><img src="/photos/p/${id}/t/${p.f}.jpg" data-full="/photos/p/${id}/${p.f}.jpg" alt="${esc(ser.alt)}, фото ${i + 1}" ${eager ? '' : 'loading="lazy" '}decoding="async"></figure>`;
}
function seriesGallery(id, preview, { head = true } = {}) {
  const ser = PORT[id];
  if (!ser) throw new Error(`no portfolio series: ${id}`);
  const n = ser.photos.length;
  if (!n) return '';
  const btn = (p, i) => `<button class="open${preview && i >= preview ? ' more' : ''}" aria-label="Открыть фото ${i + 1}" style="--r:${p.r}">${pf(id, i)}</button>`;
  return `<section class="wrap gallery series" id="${esc(id)}">${head ? `<div class="sec-head" style="padding-top:clamp(28px,4vw,56px)"><h3 class="series-h">${esc(ser.title)}</h3><span class="label">${n} фото</span></div>` : ''}
<div class="cols">${ser.photos.map(btn).join('')}</div>
${preview && n > preview ? `<button class="btn show-all" type="button">Показать все ${n} фото</button>` : ''}</section>`;
}
// genre card: the cover of the genre's first series, or an empty frame until there is one
function svcCard(k) {
  const first = seriesIn(k.slug).find((id) => PORT[id].photos.length);
  const pic = first ? `<img src="/photos/p/${first}/t/${PORT[first].photos[0].f}.jpg" alt="" loading="lazy" decoding="async">` : `<span class="svc-soon-l">${esc(SVC.soonShort)}</span>`;
  return `<a class="svc" href="${svcUrl(k)}"><span class="svc-pic">${pic}</span><span class="svc-n">${esc(k.name)}</span><span class="svc-t">${esc(k.short)}</span><span class="svc-go" aria-hidden="true">→</span></a>`;
}
// places a series can be pinned to (admin «Портфолио»): the landing, a service, a hall
const hallBySlug = Object.fromEntries(Object.values(halls).map((h) => [h.pageSlug, h]));
const seriesUrl = (id) => `/raboty/${id}/`;
const locLabel = Object.fromEntries((SVC.locations || []).map((l) => [l.slug, l.label]));
// «где снято» as words: «зал Сфера», «на улице»
const whereTags = (x) => x.places.map((pl) => (hallBySlug[pl] ? `зал ${hallBySlug[pl].name}` : locLabel[pl] ? locLabel[pl].toLowerCase() : null)).filter(Boolean);
function seriesCard(id) {
  const x = PORT[id];
  const tags = whereTags(x);
  return `<a class="sc" href="${seriesUrl(id)}"><span class="sc-pic"><img src="/photos/p/${id}/t/${x.photos[0].f}.jpg" alt="${esc(x.alt)}" loading="lazy" decoding="async"></span><span class="sc-t">${esc(x.title)}</span><span class="label">${x.photos.length} фото${tags.length ? ' · ' + esc(tags.join(', ')) : ''}</span></a>`;
}
function seriesBlock(ids, title, note) {
  ids = ids.filter((id) => PORT[id].photos.length);
  if (!ids.length) return '';
  return `<section class="wrap series-block"><div class="sec-head"><h2>${esc(title)}</h2>${note ? `<span class="label">${esc(note)}</span>` : ''}</div><div class="sc-grid">${ids.map(seriesCard).join('')}</div></section>`;
}
const svcGrid = (list) => `<div class="svc-grid">${list.map(svcCard).join('')}</div>`;

function fotografPage() {
  const c = FG;
  const landing = seriesIn('fotograf');
  // the chosen cover, or the first photo of the first series if that series was removed in the admin
  const cover = PORT[c.cover.series] && PORT[c.cover.series].photos[c.cover.index] ? c.cover : landing[0] ? { series: landing[0], index: 0 } : null;
  const h1 = c.headline.map((l, i) => (i === c.italicLine ? `<em>${esc(l)}</em>` : esc(l))).join('<br>');
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / ${esc(c.crumb)}</span></div>
<section class="wrap cover">
<div class="text"><div><span class="label">${esc(c.kicker)}</span><h1><span class="fg-name">${esc(c.name)}</span>${h1}</h1></div>
<p class="lead">${esc(c.lead)}</p>
<div class="actions"><a class="btn solid" href="${slugUrl('raspisanie')}">${esc(c.ctaPrimary)}</a><a class="btn" href="#raboty">${esc(c.ctaSecondary)}</a></div></div>
<div class="fig">${cover ? pf(cover.series, cover.index, { eager: true }) : ''}</div>
</section>
<div class="wrap"><div class="facts facts-3">${c.facts.map((f) => `<div><b>${esc(f.value)}</b><span class="label">${esc(f.label)}</span></div>`).join('')}</div></div>
<section class="wrap fg-about"><h2>${esc(c.aboutTitle)}</h2><div>${c.about.map((t) => `<p>${esc(t)}</p>`).join('')}</div></section>
<section class="wrap" id="uslugi"><div class="sec-head"><h2>${esc(c.servicesTitle)}</h2><span class="label">${esc(c.servicesNote)}</span></div>${svcGrid(SVC.list)}</section>
<div id="raboty">${seriesBlock(landing, c.seriesTitle, c.seriesNote)}</div>
<section class="wrap fg-process"><h2>${esc(c.processTitle)}</h2><ol>${c.process.map((s) => `<li><b>${esc(s.h)}</b><p>${esc(s.t)}</p></li>`).join('')}</ol></section>
<section class="wrap visit"><h2>${esc(c.studioTitle)}</h2><div class="info"><p>${esc(c.studioText)}</p><a class="btn" href="/#zaly">Залы студии</a></div></section>
${contactsBlock()}
${requestForm(c.formPreset)}
</main>
${LIGHTBOX}`;
  return page('fotograf/index.html', { title: c.title, description: c.description, body, current: 'Фотограф', image: null, imageAbs: cover && `/photos/p/${cover.series}/${PORT[cover.series].photos[cover.index].f}.jpg` });
}

function servicePage(k) {
  const series = seriesIn(k.slug);
  const pkgs = k.packages ? `<section class="wrap pkgs"><div class="sec-head" style="padding-top:0"><h2>${esc(k.packagesTitle)}</h2><span class="label">${esc(k.packagesNote)}</span></div>
<div class="pkg-grid">${k.packages.map((p) => `<article class="pkg"><h3>${esc(p.name)}</h3><p class="pkg-h">${esc(p.hours)} · ${esc(p.photos)}</p><ul>${p.items.map((t) => `<li>${esc(t)}</li>`).join('')}</ul><p class="pkg-price">${priceStr(p.price)}</p></article>`).join('')}</div>
<p class="pkg-foot">${esc(k.packagesFoot)}</p></section>` : '';
  const price = k.price ? `<p class="svc-price"><b>${priceStr(k.price)}</b> — ${esc(SVC.priceNote)}</p>` : '';
  const works = series.length ? seriesBlock(series, 'Работы', 'Нажмите, чтобы посмотреть съёмку целиком')
    : `<section class="wrap svc-soon"><p>${esc(SVC.soon)}</p><a class="btn" href="/fotograf/#raboty">Работы фотографа</a></section>`;
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/fotograf/">${esc(FG.crumb)}</a> / ${esc(k.name)}</span></div>
<section class="wrap page-title"><h1>${esc(k.h1)}</h1><div class="pt-side"><p class="lede-s">${esc(k.lede)}</p></div></section>
<section class="wrap fg-about svc-about"><div>${k.text.map((t) => `<p>${esc(t)}</p>`).join('')}${price}</div>${bookActions()}</section>
${pkgs}
${works}
<section class="wrap"><div class="sec-head"><h2>${esc(SVC.otherTitle)}</h2><a class="label" href="/fotograf/">Фотограф Алексей Новопашин</a></div>${svcGrid(SVC.list.filter((x) => x !== k))}</section>
${contactsBlock()}
${requestForm(k.name)}
</main>
${LIGHTBOX}`;
  return page(`${SVC.base}/${k.slug}/index.html`, { title: k.title, description: k.description, body, current: 'Фотограф', noindex: !series.length, imageAbs: series[0] && `/photos/p/${series[0]}/${PORT[series[0]].photos[0].f}.jpg` });
}

// One page per series (/raboty/<id>/): the whole shoot, then what such a shoot costs.
function seriesPage(x) {
  const svcs = SVC.list.filter((k) => x.places.includes(k.slug));
  const hs = x.places.filter((pl) => hallBySlug[pl]).map((pl) => hallBySlug[pl]);
  const away = x.places.filter((pl) => locLabel[pl]);
  const tagLinks = [...svcs.map((k) => `<a href="${svcUrl(k)}">${esc(k.name)}</a>`), ...hs.map((h) => `<a href="${esc(hallUrl(h))}">Зал ${esc(h.name)}</a>`), ...away.map((pl) => esc(locLabel[pl]))];
  const where = hs.length ? ` в зале ${hs.map((h) => h.name).join(' / ')}` : away.length ? ` — ${locLabel[away[0]].toLowerCase()}` : '';
  const offer = `<section class="wrap offer"><div><span class="label">${esc(SVC.offerLabel)}</span><h2>${esc(SVC.offerTitle)}</h2>
<p class="offer-price"><b>${priceStr('photo_hour')}</b> ${esc(SVC.offerHour)}</p>
${away.length ? `<p class="offer-hall">${esc(SVC.offerAway)}</p>` : ''}
${hs.map((h) => `<p class="offer-hall">${esc(SVC.offerHall.replace('{hall}', h.name))} <a href="${esc(hallUrl(h))}#bron">от ${money(fromPrice(h))} ₽ в час</a></p>`).join('')}</div>
${bookActions(svcs[0] ? `<a class="btn" href="${svcUrl(svcs[0])}">${esc(svcs[0].name)}</a>` : '')}</section>`;
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/fotograf/#raboty">Работы</a> / ${esc(x.title)}</span></div>
<section class="wrap page-title"><h1>${esc(x.title)}</h1><div class="pt-side"><p class="lede-s">${x.photos.length} фото${tagLinks.length ? ' · ' + tagLinks.join(' · ') : ''}</p></div></section>
${seriesGallery(x.id, 0, { head: false })}
${offer}
${requestForm(svcs[0] ? svcs[0].name : FG.formPreset)}
</main>
${LIGHTBOX}`;
  const title = `${x.title} — ${svcs[0] ? svcs[0].name.toLowerCase() : 'фотосессия'}${where} | фотограф Алексей Новопашин, Томск`;
  const description = `${x.alt}: ${x.photos.length} фото. ${svcs[0] ? svcs[0].name : 'Фотосессия'} в Томске${where}, фотограф Алексей Новопашин. Стоимость съёмки и запись.`;
  return page(`raboty/${x.id}/index.html`, { title, description, body, current: 'Фотограф', noindex: !x.photos.length, imageAbs: x.photos[0] && `/photos/p/${x.id}/${x.photos[0].f}.jpg` });
}

function searchPage() {
  const list = pagesSeen.filter((p) => p.url !== SEARCH_URL);
  const body = `<main>
<div class="wrap crumbs"><span class="label"><a href="/">Студия</a> / ${esc(SEARCH.title)}</span></div>
<section class="wrap page-title"><h1>${esc(SEARCH.title)}</h1><div class="pt-side"><p class="lede-s">${esc(SEARCH.lede)}</p></div></section>
<section class="wrap search">
<form class="sform" role="search" action="${SEARCH_URL}" method="get"><label class="sr" for="sq">${esc(SEARCH.title)}</label><input id="sq" type="search" name="q" placeholder="${esc(SEARCH.placeholder)}" autocomplete="off" enterkeyhint="search"><button class="btn solid" type="submit">${esc(SEARCH.button)}</button></form>
<p class="s-status" aria-live="polite" data-none="${esc(SEARCH.none)}" data-found="${esc(SEARCH.found)}" data-loading="${esc(SEARCH.loading)}" data-err="${esc(SEARCH.error)}"></p>
<ol class="s-results" data-pages="${esc(JSON.stringify(list))}"></ol>
<noscript><p>${esc(SEARCH.noscript)}</p></noscript>
</section>
</main>`;
  return page('poisk/index.html', { title: SEARCH.pageTitle, description: SEARCH.description, body, current: 'search' });
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
${requestForm(C['form.json'] && C['form.json'].schoolPreset)}
<section class="wrap gallery"><div class="sec-head" style="padding-top:0"><h2 style="font-size:clamp(32px,4.4vw,60px)">${esc(c.galleryTitle)}</h2><span class="label">${esc(c.galleryNote)}</span></div>${galleryBlock(c.gallery)}</section>
</main>
${LIGHTBOX}`;
  return page('fotosfera/index.html', { title: c.title, description: c.description, body, current: 'Фотошкола', image: c.banner });
}

  const files = [{ path: 'index.html', html: home() }];
  for (const f of PAGE_FILES.filter((n) => n.startsWith('zal-'))) files.push(hallPage(f));
  files.push(equipmentPage(), rulesPage(), findPage(), schedulePage(), servicesPage(), schoolPage());
  if (privacyOn) files.push(privacyPage());
  if (FG && SVC) files.push(fotografPage(), ...SVC.list.map(servicePage), ...(C['portfolio.json'] || []).map(seriesPage));
  if (SEARCH.title) files.push(searchPage()); // last: it lists every page rendered before it
  const unused = Object.keys(prices.items).filter((k) => !usedPriceKeys.has(k));
  // non-HTML files that change with content: the sitemap follows which service pages are open to search
  const other = [];
  if (site.siteUrl) {
    const locs = files.filter((f) => !f.noindex && f.path !== 'poisk/index.html').map((f) => `<url><loc>${site.siteUrl}${urlOf(f.path)}</loc></url>`);
    other.push({ path: 'sitemap.xml', type: 'application/xml; charset=utf-8', body: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.join('\n')}\n</urlset>\n` });
  }
  return { files, unused, other };
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
export const ADMIN_FILES = ['prices.json', 'videos.json', 'events.json', 'portfolio.json'];
const userError = (msg) => Object.assign(new Error(msg), { user: true });

export function adminEdit(C, req) {
  if (req.action === 'prices') return editPrices(C, req);
  if (req.action === 'videos') return editVideos(C, req);
  if (req.action === 'events') return editEvents(C, req);
  if (req.action === 'portfolio') return editPortfolio(C, req);
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

// Portfolio from the admin: the whole list of series in the order wanted. Photo files are uploaded
// one by one before this (function action 'pfile' → photos/p/<series>/<hash>.jpg); here only the
// list, titles and places change. Places: 'fotograf' (the landing) or a service slug.
export const seriesIdOk = (id) => /^[a-z0-9][a-z0-9-]{0,58}[a-z0-9]$/.test(String(id));
function editPortfolio(C, req) {
  const old = C['portfolio.json'] || [];
  const byId = Object.fromEntries(old.map((x) => [x.id, x]));
  const placesOk = new Set(['fotograf', ...(C['services.json'] ? C['services.json'].list.map((k) => k.slug) : []), ...Object.values(C['halls.json']).map((h) => h.pageSlug), ...((C['services.json'] || {}).locations || []).map((l) => l.slug)]);
  const text = (v, max, label) => {
    const t = String(v ?? '').replace(/\s+/g, ' ').trim();
    if (!t) throw userError(`${label}: заполните поле`);
    if (t.length > max) throw userError(`${label}: слишком длинно, до ${max} знаков`);
    return t;
  };
  if (!Array.isArray(req.series) || req.series.length > 60) throw userError('список серий не прочитался, обновите страницу');
  const used = new Set();
  const list = req.series.map((x, i) => {
    const title = text(x.title, 60, `Серия ${i + 1}, название`);
    if (!seriesIdOk(x.id) || used.has(x.id)) throw userError(`${title}: неверный номер серии, обновите страницу`);
    used.add(x.id);
    if (!Array.isArray(x.photos) || x.photos.length > 400) throw userError(`${title}: список фото не прочитался`);
    const photos = x.photos.map((p) => {
      if (!/^[0-9a-f]{10}$/.test(p.f) || !/^\d{1,2}(\.\d{1,3})?\/\d{1,2}$/.test(p.r)) throw userError(`${title}: фото не прочиталось, обновите страницу`);
      return { f: p.f, r: p.r };
    });
    const places = [...new Set((x.places || []).filter((pl) => placesOk.has(pl)))];
    return { id: x.id, title, alt: text(x.alt || title, 120, `${title}, подпись`), places, photos };
  });
  const changes = [];
  for (const x of list) {
    const p = byId[x.id];
    if (!p) { changes.push(`Новая серия: ${x.title}, ${x.photos.length} фото`); continue; }
    const was = new Set(p.photos.map((f) => f.f)), now = new Set(x.photos.map((f) => f.f));
    const add = x.photos.filter((f) => !was.has(f.f)).length, del = p.photos.filter((f) => !now.has(f.f)).length;
    const what = [];
    if (p.title !== x.title || p.alt !== x.alt) what.push('название');
    if (add) what.push(`+${add} фото`);
    if (del) what.push(`−${del} фото`);
    if (p.places.join() !== x.places.join()) what.push('где показывать');
    if (!add && !del && p.photos.map((f) => f.f).join() !== x.photos.map((f) => f.f).join()) what.push('порядок фото');
    if (what.length) changes.push(`${x.title}: ${what.join(', ')}`);
  }
  for (const p of old) if (!used.has(p.id)) changes.push(`Убрана серия: ${p.title} (файлы фото остались в хранилище)`);
  if (!changes.length && list.map((x) => x.id).join() !== old.map((x) => x.id).join()) changes.push('Изменён порядок серий');
  C['portfolio.json'] = list;
  return { changes, files: changes.length ? ['portfolio.json'] : [] };
}
