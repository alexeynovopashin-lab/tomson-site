// «Совиная почта» (/sova/): the owl flies in and drops an envelope → tap the seal → pull the letter up.
// Ported from dr_invites/src/template.html (Alexey's owl, envelope and paper); sounds left out.
// ?letter = finished letter at once, ?landed = envelope on the ground (design checks).
(function () {
// owl sheet geometry, from dr_invites/tools/assets_info.json
const A = {
  owl: { lw: { x: 0, y: 6, w: 374, h: 245 }, rw: { x: 364, y: 0, w: 364, h: 254 }, body: { x: 232, y: 122, w: 268, h: 281 },
    head: { x: 308, y: 111, w: 126, h: 104 }, beak: { x: 360, y: 169, w: 22, h: 36 } },
  owl_size: [729, 402], lw_pivot: [94, 51], rw_pivot: [4, 52], head_pivot: [371.0, 206.68], beak_tip: [371.0, 188.8],
  env1: { w: 1000, h: 700 }, env3: { w: 1000, h: 1136 }
};
const root = document.documentElement;
// the season is over: the page leads to the hall instead of a stale invitation
const until = root.dataset.until;
if (until && new Date().toISOString().slice(0, 10) > until) { location.replace(root.dataset.home || '/'); return; }

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const stage = $('stage'), owl = $('owl'), owlBeak = $('owlBeak'), envBox = $('envBox'), letter = $('letter'), hint = $('hint');
const ease = {
  outCubic: t => 1 - Math.pow(1 - t, 3),
  inCubic: t => t * t * t,
  inQuad: t => t * t,
  inOut: t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
};
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (t, a = 0, b = 1) => Math.max(a, Math.min(b, t));
let vw, vh, E, H, restTop, so;
const OW = A.owl_size[0], OH = A.owl_size[1];

function layout() {
  vw = innerWidth; vh = innerHeight;
  E = Math.min(vw * .86, 400);
  H = E * A.env3.h / A.env3.w;
  restTop = Math.round((vh - H) / 2 + vh * .07);
  Object.assign(envBox.style, { left: ((vw - E) / 2) + 'px', top: restTop + 'px', width: E + 'px', height: H + 'px' });
  $('closed').style.height = (E * A.env1.h / A.env1.w) + 'px';
  so = Math.min(vw * .98, 400) / OW;
  for (const o of [owl, owlBeak]) { o.style.width = OW + 'px'; o.style.height = OH + 'px'; }
  for (const k of ['lw', 'rw', 'body', 'head', 'beak']) {
    const p = A.owl[k], im = stage.querySelector('.' + k);
    Object.assign(im.style, { left: p.x + 'px', top: p.y + 'px', width: p.w + 'px', height: p.h + 'px' });
    if (k === 'head' || k === 'beak') im.style.transformOrigin = (A.head_pivot[0] - p.x) + 'px ' + (A.head_pivot[1] - p.y) + 'px';
  }
  owl.querySelector('.lw').style.transformOrigin = A.lw_pivot[0] + '% ' + A.lw_pivot[1] + '%';
  owl.querySelector('.rw').style.transformOrigin = A.rw_pivot[0] + '% ' + A.rw_pivot[1] + '%';
  hint.style.top = (restTop + H + 18) + 'px';
}
layout();

// atmosphere: floating candles and rising embers
(function fx() {
  const f = $('fx');
  const pos = [[8, 9], [24, 17], [44, 7], [63, 19], [82, 10], [14, 30], [74, 31], [52, 26], [91, 24]];
  pos.forEach(([x, y], i) => {
    const d = document.createElement('div'); d.className = 'cwrap';
    d.style.cssText = `left:${x}%;top:${y}%;width:${7 + (i % 3) * 1.5}px;animation-delay:${-i * .9}s;animation-duration:${5 + (i % 4)}s`;
    d.innerHTML = '<img src="/sova/candle.webp" alt="">';
    f.appendChild(d);
  });
  for (let i = 0; i < 16; i++) {
    const e = document.createElement('div'); e.className = 'ember';
    e.style.cssText = `left:${8 + Math.random() * 84}%;bottom:${3 + Math.random() * 22}%;animation-duration:${6 + Math.random() * 7}s;animation-delay:${-Math.random() * 12}s`;
    f.appendChild(e);
  }
})();

// flight of the owl
const lw = owl.querySelector('.lw'), rw = owl.querySelector('.rw');
const CL = { x: A.beak_tip[0], y: A.beak_tip[1] - 3 };   // where the letter is held, in owl sheet px
const wc = () => 150 * so;                                // carried envelope width
const closedCenterLocal = () => ({ x: E / 2, y: H - E * A.env1.h / A.env1.w / 2 });
let landed = false, ready = false, opened = false, t0;

function setOwl(cx, cy, s, rot) {
  owlBeak.style.transform = owl.style.transform = `translate(${cx - OW / 2 * s}px,${cy - OH / 2 * s}px) scale(${s}) rotate(${rot}deg)`;
}
const headImg = owl.querySelector('.head'), beakImg = owlBeak.querySelector('.beak');
function headPose(t) {   // the head looks around a little and dips when the wings go up
  const w = t * 0.00628;
  return { rot: 5 * Math.sin(w * .5 + .6) + 2 * Math.sin(w * 1.5), dy: 3.2 * Math.sin(w + 1.2 + Math.PI) };
}
function flap(t) {
  const hp = headPose(t), ht = `translateY(${hp.dy}px) rotate(${hp.rot}deg)`;
  headImg.style.transform = ht; beakImg.style.transform = ht;
  const a = 6 + 22 * Math.sin(t * 0.00628 + 1.2);
  lw.style.transform = `rotate(${a}deg)`;
  rw.style.transform = `rotate(${-a}deg)`;
}
function setEnv(cx, cy, k, rot) {
  const c = closedCenterLocal();
  const rc = { x: vw / 2, y: restTop + c.y };
  envBox.style.transformOrigin = `${c.x}px ${c.y}px`;
  envBox.style.transform = `translate(${cx - rc.x}px,${cy - rc.y}px) rotate(${rot}deg) scale(${k})`;
}

const T_HOVER = 2300, T_REL = 2650, T_LAND = 3400, T_OUT = 4600;
function flight(now) {
  const t = now - t0;
  const hover = { x: vw / 2, y: vh * .26 };
  const start = { x: vw * 1.25, y: -OH * so * .6 };
  let ox, oy, os = so, orot = 0;
  if (t < T_HOVER) {
    const p = ease.outCubic(t / T_HOVER);
    ox = lerp(start.x, hover.x, p); oy = lerp(start.y, hover.y, p) + Math.sin(t * .006) * 5 * (1 - p);
    orot = lerp(-10, 0, p);
  } else if (t < T_REL) {
    ox = hover.x; oy = hover.y + Math.sin(t * .006) * 5;
  } else {
    const p = ease.inCubic(clamp((t - T_REL) / (T_OUT - T_REL)));
    ox = lerp(hover.x, -vw * .35, p); oy = lerp(hover.y + Math.sin(T_REL * .006) * 5, -vh * .28, p);
    os = so * lerp(1, .55, p); orot = lerp(0, -14, p);
  }
  setOwl(ox, oy, os, orot);
  flap(t);

  if (t < T_REL) {
    const cxl = ox - OW / 2 * os + CL.x * os, cyl = oy - OH / 2 * os + CL.y * os;
    const w = wc(), h = w * A.env1.h / A.env1.w;
    setEnv(cxl, cyl + h / 2 + headPose(t).dy * os, w / E, Math.sin(t * .005) * 4 - headPose(t).rot * .6);
  } else if (t < T_LAND) {
    const w = wc(), h = w * A.env1.h / A.env1.w;
    const sx = hover.x + (CL.x - OW / 2) * so, sy = hover.y + Math.sin(T_REL * .006) * 5 + (CL.y - OH / 2) * so + h / 2;
    const ry = restTop + closedCenterLocal().y;
    const p = clamp((t - T_REL) / (T_LAND - T_REL));
    const fall = ease.inQuad(clamp(p / .72));
    let y = lerp(sy, ry, fall);
    if (p > .72) { const q = (p - .72) / .28; y = ry - Math.sin(q * Math.PI) * 14; }
    setEnv(lerp(sx, vw / 2, ease.outCubic(p)), y, lerp(w / E, 1, ease.inOut(clamp(p / .72))), lerp(Math.sin(T_REL * .005) * 5, 0, ease.outCubic(p)));
  } else if (!landed) {
    landed = true; envBox.style.transform = 'none';
    hint.classList.add('on'); $('glow').classList.add('on'); ready = true;
  }
  if (t < T_OUT + 200) requestAnimationFrame(flight);
  else owl.style.display = owlBeak.style.display = 'none';
}

// opening
function fade(el, to, ms) {
  return el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: to }], { duration: ms, fill: 'forwards', easing: 'ease-in-out' }).finished;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
function letterGeom() {
  const Lw = Math.min(vw * .95, 460);
  letter.style.width = Lw + 'px';
  $('txt').style.fontSize = Math.max(13.5, Math.min(Lw / 25, 18)) + 'px';
  const inn = $('paper').querySelector('.pm .inner'); inn.style.paddingTop = (Lw * .02) + 'px'; inn.style.paddingBottom = (Lw * .05) + 'px';
  return { Lw, Lh: $('paper').offsetHeight };
}
let G = null, P = 0, pullReady = false, done = false, drag = null, wheelT = null;

async function open() {
  if (!ready || opened) return; opened = true;
  hint.classList.add('off'); $('glow').classList.remove('on'); $('glow').style.opacity = 0;
  envBox.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(-1.4deg) translateY(2px)' }, { transform: 'rotate(1deg)' }, { transform: 'rotate(0)' }], { duration: 520 });
  fade($('k2'), 1, 380); await sleep(260); fade($('k1'), 0, 260);   // the seal is torn off
  await sleep(520);
  $('k3').style.opacity = 0; fade($('k3'), 1, 380); await sleep(120); fade($('closed'), 0, 330);   // the flap opens
  await sleep(500);
  setupPull();
}

// the letter is pulled out by the finger (or wheel): p = 0 inside the envelope .. 1 read
function setupPull() {
  const { Lw, Lh } = letterGeom();
  const foldY = restTop + H * (819 / 2137);           // top edge of the front face
  const s0 = Math.min(1, (E * .84) / Lw);
  const endScale = Math.min(1, vh * .97 / Lh);
  G = { Lh, foldY, s0, endScale, startTop: foldY - 18, endTop: foldY - Lh * s0 * .46, finalTop: Math.max(vh * .02, (vh - Lh * endScale) / 2) };
  Object.assign(letter.style, { visibility: 'visible', opacity: 1, transformOrigin: '50% 0' });
  draw(0);
  hint.innerHTML = '';
  hint.append(document.createTextNode(root.dataset.pull || ''));
  const arr = document.createElement('span'); arr.className = 'arr'; arr.textContent = '↑'; hint.append(arr);
  hint.classList.remove('off'); hint.classList.add('on');
  pullReady = true;
}
function draw(p) {
  P = p;
  const r = ease.inOut(clamp(p / .5)), g = ease.inOut(clamp((p - .5) / .5));
  const sc = lerp(G.s0, G.endScale, g);
  const top = p < .5 ? lerp(G.startTop, G.endTop, r) : lerp(G.endTop, G.finalTop, g);
  letter.style.top = top + 'px';
  letter.style.transform = `translate(-50%,0) scale(${sc})`;
  const hidden = Math.max(0, (top + G.Lh * sc) - G.foldY) / sc * (1 - g);
  letter.style.clipPath = g >= 1 ? 'none' : `inset(0 0 ${hidden}px 0)`;
  envBox.style.transform = `translateY(${vh * .5 * g}px) rotate(${5 * g}deg)`;
  envBox.style.opacity = 1 - g;
  stage.classList.toggle('letter-on', g > .02);
  hint.classList.toggle('off', p > .04);
}
function animateTo(target, ms) {
  const from = P, t1 = performance.now();
  return new Promise(res => {
    (function step(n) {
      const k = clamp((n - t1) / ms);
      draw(lerp(from, target, ease.outCubic(k)));
      k < 1 ? requestAnimationFrame(step) : res();
    })(t1);
  });
}
async function settle(fast) {
  const target = (P > .3 || (fast && P > .12)) ? 1 : 0;
  await animateTo(target, 150 + 650 * Math.abs(target - P));
  if (target === 1) finish();
}
async function finish() {
  if (done) return; done = true; hint.classList.add('off');
  stage.style.touchAction = 'auto';
  try { localStorage.setItem('sova_seen', '1'); } catch (e) {}   // the next visit offers «Сразу к письму»
  for (const l of document.querySelectorAll('.ln')) { l.classList.add('show'); await sleep(l.classList.contains('det') ? 520 : 440); }
}
stage.addEventListener('pointerdown', e => {
  if (!pullReady || done) return;
  drag = { y: e.clientY, p0: P, ly: e.clientY, lt: performance.now(), v: 0 };
  try { stage.setPointerCapture(e.pointerId); } catch (x) {}
});
stage.addEventListener('pointermove', e => {
  if (!drag) return;
  const now = performance.now(), dt = Math.max(1, now - drag.lt);
  drag.v = .7 * drag.v + .3 * ((drag.ly - e.clientY) / dt);   // px/ms, up is positive
  drag.ly = e.clientY; drag.lt = now;
  draw(clamp(drag.p0 + (drag.y - e.clientY) / (vh * .5)));
  if (P >= 1) { drag = null; finish(); }
});
const endDrag = () => { if (!drag) return; const fast = drag.v > .6; drag = null; settle(fast); };
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('wheel', e => {
  if (!pullReady || done) return; e.preventDefault();
  draw(clamp(P + e.deltaY / (vh * .8)));
  clearTimeout(wheelT); wheelT = setTimeout(() => settle(false), 140);
}, { passive: false });
addEventListener('keydown', e => {
  if (pullReady && !done && ['ArrowUp', 'ArrowDown', ' ', 'Enter'].includes(e.key)) { e.preventDefault(); animateTo(e.key === 'ArrowDown' ? 0 : 1, 700).then(() => P >= 1 && finish()); }
  else if (ready && !opened && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(); }
});
envBox.addEventListener('click', open);
envBox.addEventListener('touchend', e => { e.preventDefault(); open(); }, { passive: false });

// start
function whenLoaded(fn) { if (document.readyState === 'complete') fn(); else addEventListener('load', fn); }
function showLetter() {   // finished letter at once: «Сразу к письму», reduced motion, ?letter
  done = true; stage.style.touchAction = 'auto';
  owl.style.display = owlBeak.style.display = envBox.style.display = hint.style.display = 'none';
  $('gate').classList.add('off');
  const { Lh } = letterGeom();
  const es = Math.min(1, vh * .97 / Lh);
  Object.assign(letter.style, { visibility: 'visible', opacity: 1, top: Math.max(vh * .02, (vh - Lh * es) / 2) + 'px', transform: `translate(-50%,0) scale(${es})`, transformOrigin: '50% 0' });
  stage.classList.add('letter-on');
  document.querySelectorAll('.ln').forEach(l => l.classList.add('show'));
}
function begin() {
  $('gate').classList.add('off'); stage.classList.add('started');
  t0 = performance.now(); requestAnimationFrame(flight);
}
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
const skip = $('skip');
skip.addEventListener('click', e => { e.preventDefault(); started = true; whenLoaded(showLetter); });
let started = false;
if (Q.has('letter') || calm) whenLoaded(showLetter);
else if (Q.has('landed')) {
  ready = true; landed = true; owl.style.display = owlBeak.style.display = 'none';
  envBox.style.transform = 'none'; hint.classList.add('on'); $('glow').classList.add('on');
  stage.classList.add('started'); $('gate').classList.add('off');
} else {
  // the owl starts once its pieces, the envelope, the paper and the fonts are decoded, so a slow network never
  // starts a flight with missing parts; safety: 8 s, then it flies anyway
  try { if (localStorage.getItem('sova_seen') === '1') skip.hidden = false; } catch (e) {}
  const pics = [...document.querySelectorAll('#owl img, #owlBeak img, #envBox img, #paper img')];
  const fonts = ['italic 20px PF', '20px PF'].map(f => document.fonts ? document.fonts.load(f, 'Аа').catch(() => {}) : null);
  const go = () => { if (started) return; started = true; setTimeout(begin, 700); };
  Promise.all([...pics.map(i => i.decode().catch(() => {})), ...fonts]).then(go);
  setTimeout(go, 8000);
}
addEventListener('resize', () => { if (!opened) layout(); });
})();
