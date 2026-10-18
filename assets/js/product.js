/* ==========================================================================
   Ficha de producto: galería (carrusel en móvil, mosaico en escritorio) con
   visor ampliado, selector de talla con stock, cantidad, entrega estimada,
   barra fija de compra, "Completa el look" y vistos recientemente.
   ========================================================================== */
import { CONFIG, PRODUCTS, COMBINA, byId, catById, colorOf, stockTotal } from './data.js';
import { $, $$, reduced, fmt, esc, icon, cardHTML, miniHTML, favBtn, priceHTML, badgesHTML, srcP, srcsetP, sizePicker, addWithFeedback, openLayer, initUI } from './ui.js';
import { initFX } from './fx.js';
import { runIntro } from './intro.js';
import * as store from './store.js';

initUI();

const p = byId(new URLSearchParams(location.search).get('p'));
const info = $('[data-pdp-info]');
const gallery = $('[data-gallery]');

/* Fechas de entrega estimadas (días laborables) */
function addBusinessDays(n, from = new Date()) {
  const d = new Date(from);
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; }
  return d;
}
const fmtDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
export const etaText = ([a, b]) => `entre el ${fmtDay.format(addBusinessDays(a))} y el ${fmtDay.format(addBusinessDays(b))}`;

function notFound() {
  document.title = 'Producto no encontrado — Rose Valer';
  $('.pdp__grid').innerHTML = `<div class="pdp-404" style="grid-column:1/-1">
    <svg viewBox="9 9.2 416.6 434.6" class="empty__mono" aria-hidden="true"><use href="#rv-mono"/></svg>
    <h1 class="display">Esta prenda ya no está disponible</h1>
    <p class="note">Puede que el enlace haya cambiado. Echa un vistazo al resto de la tienda.</p>
    <a class="btn btn--dark" href="tienda.html"><span>Ir a la tienda</span>${icon('arrow')}</a></div>`;
  $('.pdp-more')?.remove();
}

/* ---------- galería ---------- */
// Con una sola foto de prototipo, las vistas 2 y 3 son encuadres de detalle de la misma imagen.
const VIEWS = [
  { z: 1, pos: '50% 30%', label: 'Vista principal' },
  { z: 1.7, pos: '50% 38%', label: 'Detalle del tejido' },
  { z: 1.9, pos: '50% 72%', label: 'Detalle del acabado' },
];
function renderGallery() {
  gallery.innerHTML = `
    <div class="pdp__badges">${badgesHTML(p)}</div>
    <div class="gal" data-gal>
      ${VIEWS.map((v, i) => `<button type="button" class="gal__item" style="--bg:${p.bg};--z:${v.z};--pos:${v.pos}" data-zoom="${i}" aria-label="Ampliar imagen: ${v.label}">
        <img ${i === 0 ? 'class="pdp-main-img" fetchpriority="high"' : 'loading="lazy"'} src="${srcP(p.id, i ? 2 : 1)}" srcset="${srcsetP(p.id)}"
          sizes="${i === 0 ? '(min-width: 900px) 56vw, 100vw' : '(min-width: 900px) 28vw, 100vw'}" width="800" height="1000" alt="${esc(p.name)} — ${v.label}" decoding="async">
        <span class="gal__zoom" aria-hidden="true">${icon('zoom')}</span>
      </button>`).join('')}
    </div>
    <div class="gal__dots" aria-hidden="true">${VIEWS.map((_, i) => `<i${i ? '' : ' class="is-on"'}></i>`).join('')}</div>
    <span class="gal__count" aria-hidden="true"><b data-gal-n>1</b> / ${VIEWS.length}</span>`;

  // puntos del carrusel en móvil
  const gal = $('[data-gal]');
  const dots = $$('.gal__dots i');
  const n = $('[data-gal-n]');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const i = [...gal.children].indexOf(e.target);
    dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
    n.textContent = i + 1;
  }), { root: gal, threshold: .6 });
  [...gal.children].forEach((el) => io.observe(el));

  gal.addEventListener('click', (e) => {
    const item = e.target.closest('[data-zoom]');
    if (item) openLightbox(Number(item.dataset.zoom), item);
  });
}

/* ---------- visor ampliado ---------- */
function openLightbox(i, trigger) {
  const stage = $('[data-lightbox-stage]');
  const v = VIEWS[i];
  stage.classList.remove('is-zoom');
  stage.innerHTML = `<img src="${srcP(p.id, 2)}" width="1200" height="1500" alt="${esc(p.name)} — ${v.label}">`;
  const img = stage.firstElementChild;
  // Con ratón: clic para ampliar y mover el cursor para recorrer la foto
  const pan = (e) => {
    if (!stage.classList.contains('is-zoom')) { img.style.translate = ''; return; }
    const r = stage.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    const w = img.offsetWidth, h = img.offsetHeight;
    const tx = w > r.width ? -(px * (w - r.width)) - r.width / 2 : -w / 2;
    const ty = h > r.height ? -(py * (h - r.height)) - r.height / 2 : -h / 2;
    img.style.translate = `${tx.toFixed(1)}px ${ty.toFixed(1)}px`;
  };
  stage.onclick = (e) => {
    if (!matchMedia('(hover: hover)').matches) return;
    stage.classList.toggle('is-zoom');
    pan(e);
  };
  stage.onpointermove = pan;
  openLayer('lightbox', trigger);
}

/* ---------- información y compra ---------- */
let picker;
function renderInfo() {
  const c = colorOf(p);
  const cat = catById(p.cat);
  const total = stockTotal(p);
  const free = CONFIG.envioGratisDesde;
  const std = CONFIG.zonas.peninsula.metodos[0];
  info.innerHTML = `
    <div class="pdp__head">
      <p class="eyebrow">${cat.name}${p.isNew ? ' · Nuevo' : ''}</p>
      <h1 class="pdp__title">${esc(p.name)}</h1>
      <p class="pdp__price">${priceHTML(p)}${p.compareAt > p.price ? `<span class="badge badge--sale">-${Math.round((1 - p.price / p.compareAt) * 100)} %</span>` : ''}</p>
      <p class="pdp__tax">IVA incluido · Envío gratis desde ${fmt(free)}</p>
    </div>
    <p class="pdp__desc">${esc(p.desc)}</p>
    <div class="opt">
      <div class="opt__head"><span>Color: <b>${c.name}</b></span></div>
      <div class="opt__color"><span class="opt__swatch" style="--c:${c.hex}" role="img" aria-label="${c.name}"></span></div>
    </div>
    ${total ? `
    <div class="opt" data-size-opt>
      <div class="opt__head"><span>Talla: <b data-size-label></b></span><button type="button" class="opt__link" data-open="sizes">${icon('ruler')}Guía de tallas</button></div>
      <div class="size-grid" role="radiogroup" aria-label="Talla"></div>
      <p class="opt__msg" data-size-msg aria-live="polite"></p>
    </div>
    <div class="atc" data-atc>
      <div class="qty qty--lg" role="group" aria-label="Cantidad">
        <button type="button" data-q="-1" aria-label="Quitar una unidad" disabled>${icon('minus')}</button>
        <output data-qv>1</output>
        <button type="button" data-q="1" aria-label="Añadir una unidad">${icon('plus')}</button>
      </div>
      <button type="button" class="btn btn--dark" data-add-main><span>Añadir a la cesta</span>${icon('bag')}</button>
      ${favBtn(p)}
    </div>` : `
    <div class="atc"><button type="button" class="btn btn--dark is-disabled" disabled><span>Agotado</span></button>${favBtn(p)}</div>
    <p class="note">Esta prenda está agotada. Guárdala en favoritos para no perderla de vista.</p>`}
    <ul class="pdp__ship">
      <li>${icon('truck')}<span>Recíbelo <b>${etaText(std.dias)}</b> con envío estándar (península).</span></li>
      <li>${icon('return')}<span>Devoluciones gratuitas durante ${CONFIG.devolucionDias} días.</span></li>
      <li>${icon('lock')}<span>Pago seguro con tarjeta, Bizum o PayPal.</span></li>
    </ul>
    <div class="accordion">
      <details open><summary>Detalles y ajuste${icon('plus')}</summary><div><ul>${p.details.map((d) => `<li>${esc(d)}</li>`).join('')}</ul><p>${esc(p.fit)}</p></div></details>
      <details><summary>Composición y cuidados${icon('plus')}</summary><div><p>${esc(p.care)}</p><p class="note">Composición exacta pendiente de confirmar por la tienda.</p></div></details>
      <details><summary>Envíos y devoluciones${icon('plus')}</summary><div><p>Envío estándar a península por ${fmt(std.precio)} (gratis desde ${fmt(free)}) y exprés en 24–48 h. Tienes ${CONFIG.devolucionDias} días para devolverlo. <a href="ayuda.html#envios">Más información</a>.</p></div></details>
    </div>`;

  if (!total) return;
  let qty = 1;
  const qv = $('[data-qv]', info);
  const [minus, plus] = $$('[data-q]', info);
  const syncQty = () => {
    const size = picker?.get();
    const inCart = size ? (store.getCart().find((it) => it.id === p.id && it.size === size)?.qty || 0) : 0;
    const max = size ? Math.max(1, p.sizes[size] - inCart) : 9;
    qty = Math.min(qty, max);
    qv.textContent = qty;
    minus.disabled = qty <= 1;
    plus.disabled = qty >= max;
  };
  picker = sizePicker($('[data-size-opt]', info), p, { onChange: () => { syncQty(); syncSticky(); } });
  minus.addEventListener('click', () => { qty--; syncQty(); });
  plus.addEventListener('click', () => { qty++; syncQty(); });
  $('[data-add-main]', info).addEventListener('click', (e) => buy(e.currentTarget, qty));
  store.subscribe((type) => { if (type.startsWith('cart')) syncQty(); });
}

function buy(btn, qty = 1) {
  const size = picker.get();
  if (!size) {
    $('[data-size-opt]').scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    picker.shake();
    return;
  }
  addWithFeedback({ p, size, qty, btn, from: $('.pdp-main-img') });
}

/* ---------- barra fija de compra ---------- */
const sticky = $('[data-sticky-atc]');
function syncSticky() {
  if (!sticky || !picker) return;
  const size = picker.get();
  $('[data-sticky-size]', sticky).textContent = size ? `Talla ${size}` : 'Elige tu talla';
}
function initSticky() {
  const atc = $('[data-atc]');
  if (!sticky || !atc || !stockTotal(p)) return;
  $('[data-sticky-atc-body]', sticky).innerHTML = `
    <img src="${srcP(p.id, 0)}" alt="" width="44" height="55">
    <div class="sticky-atc__name"><b>${esc(p.name)}</b><span>${fmt(p.price)} · <span data-sticky-size></span></span></div>
    <button type="button" class="btn btn--dark" data-sticky-add><span>Añadir</span>${icon('bag')}</button>`;
  syncSticky();
  $('[data-sticky-add]', sticky).addEventListener('click', (e) => buy(e.currentTarget, 1));
  new IntersectionObserver(([e]) => {
    const on = !e.isIntersecting && e.boundingClientRect.top < 0;
    sticky.classList.toggle('is-on', on);
    sticky.setAttribute('aria-hidden', !on);
    sticky.inert = !on;
  }).observe(atc);
  sticky.inert = true;
}

/* ---------- relacionados y recientes ---------- */
function renderRelated() {
  const box = $('[data-related]');
  const combos = COMBINA[p.cat] || [];
  const pool = PRODUCTS.filter((x) => x.id !== p.id && stockTotal(x));
  const picks = [...combos.flatMap((cat) => pool.filter((x) => x.cat === cat).slice(0, 1)), ...pool.filter((x) => x.cat === p.cat)];
  box.innerHTML = [...new Set(picks)].slice(0, 4).map((x) => cardHTML(x)).join('');
}
function renderRecent() {
  const items = store.getRecent(p.id);
  if (!items.length) return;
  $('[data-recent-rail]').innerHTML = items.map((x) => miniHTML(x)).join('');
  $('[data-recent]').hidden = false;
}

/* ---------- SEO ---------- */
function seo() {
  const desc = `${p.name} de Rose Valer. ${p.desc}`;
  document.title = `${p.name} — Rose Valer`;
  document.querySelector('meta[name="description"]')?.setAttribute('content', desc.slice(0, 158));
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', `${p.name} — Rose Valer`);
  const ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, description: p.desc, image: new URL(srcP(p.id, 2), location.href).href,
    brand: { '@type': 'Brand', name: 'Rose Valer' }, color: colorOf(p).name, sku: p.id,
    offers: { '@type': 'Offer', priceCurrency: 'EUR', price: p.price, availability: `https://schema.org/${stockTotal(p) ? 'InStock' : 'OutOfStock'}`, url: location.href },
  });
  document.head.append(ld);
  const crumbs = $('[data-pdp-crumbs]');
  crumbs.insertAdjacentHTML('beforeend', `<span aria-hidden="true">/</span><a href="tienda.html?cat=${p.cat}">${catById(p.cat).name}</a><span aria-hidden="true">/</span><span aria-current="page">${esc(p.name)}</span>`);
}

/* ---------- arranque ---------- */
if (!p) notFound();
else {
  seo();
  renderGallery();
  renderInfo();
  initSticky();
  renderRelated();
  renderRecent();
  store.pushRecent(p.id);
}
initFX();
runIntro().then(() => document.documentElement.classList.add('is-ready'));
