/* ==========================================================================
   Interfaz común a todas las páginas: cabecera, menú, capas (cesta, favoritos,
   buscador, vista rápida), tarjetas de producto, avisos y formulario de newsletter.
   ========================================================================== */
import { CONFIG, CATEGORIES, PRODUCTS, COMBINA, byId, catById, colorOf, stockTotal } from './data.js';
import * as store from './store.js';

/* ---------- utilidades ---------- */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const html = document.documentElement;
export const reduced = () => html.classList.contains('rm');
export const finePointer = matchMedia('(hover: hover) and (pointer: fine)');

const money = new Intl.NumberFormat(CONFIG.locale, { style: 'currency', currency: CONFIG.moneda });
export const fmt = (n) => money.format(n);
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Ruta normalizada: Cloudflare Pages sirve /tienda en vez de /tienda.html y / en vez de /index.html */
export const pagePath = (path = location.pathname) => path.replace(/\.html$/, '').replace(/\/index$/, '/') || '/';
export const toEl = (markup) => { const t = document.createElement('template'); t.innerHTML = markup.trim(); return t.content.firstElementChild; };

/* ---------- imágenes ---------- */
const IMG = 'assets/img/';
export const srcP = (id, i = 1) => `${IMG}${id}-${i}.webp`;
export const srcsetP = (id) => `${IMG}${id}-0.webp 480w, ${IMG}${id}-1.webp 800w, ${IMG}${id}-2.webp 1200w`;
export const srcsetE = (id) => `${IMG}${id}-0.webp 640w, ${IMG}${id}-1.webp 1080w, ${IMG}${id}-2.webp 1600w`;
export const productUrl = (p) => `producto.html?p=${p.id}`;

/* ---------- piezas de marcado ---------- */
export const icon = (name, cls = '') => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

export const favBtn = (p, cls = '') =>
  `<button type="button" class="fav-btn ${cls}" data-fav="${p.id}" aria-pressed="${store.isFav(p.id)}" aria-label="Guardar ${esc(p.name)} en favoritos">${icon('heart', 'i-off')}${icon('heart-fill', 'i-on')}</button>`;

export const priceHTML = (p) =>
  `${p.compareAt > p.price ? `<s>${fmt(p.compareAt)}</s>` : ''}${fmt(p.price)}`;

export function badgesHTML(p) {
  const total = stockTotal(p);
  if (!total) return '<span class="badge badge--out">Agotado</span>';
  const out = [];
  if (p.compareAt > p.price) out.push(`<span class="badge badge--sale">-${Math.round((1 - p.price / p.compareAt) * 100)} %</span>`);
  if (p.isNew) out.push('<span class="badge">Nuevo</span>');
  if (total <= 3) out.push('<span class="badge badge--low">Últimas unidades</span>');
  return out.join('');
}

export const CARD_SIZES = '(min-width: 1100px) 23vw, (min-width: 768px) 31vw, 48vw';

export function cardHTML(p, { sizes = CARD_SIZES, eager = false } = {}) {
  const c = colorOf(p);
  const total = stockTotal(p);
  const sizeBtns = Object.entries(p.sizes)
    .map(([s, n]) => `<button type="button" data-add="${p.id}" data-size="${s}"${n ? '' : ' disabled'} aria-label="Añadir ${esc(p.name)}, talla ${s}">${s}</button>`)
    .join('');
  return `<article class="card${total ? '' : ' is-out'}" data-id="${p.id}">
    <div class="card__visual" style="--bg:${p.bg}">
      <a class="card__media" href="${productUrl(p)}" tabindex="-1" aria-hidden="true" data-vt>
        <img src="${srcP(p.id, 0)}" srcset="${srcsetP(p.id)}" sizes="${sizes}" width="480" height="600" alt="" loading="${eager ? 'eager' : 'lazy'}" decoding="async">
      </a>
      <div class="card__badges">${badgesHTML(p)}</div>
      ${favBtn(p, 'card__fav')}
      ${total ? `<div class="card__quick"><p>Añadir talla</p><div class="card__sizes">${sizeBtns}</div></div>
      <button class="card__plus" type="button" data-quick="${p.id}" aria-label="Elegir talla de ${esc(p.name)}">${icon('plus')}</button>` : ''}
    </div>
    <div class="card__info">
      <h3 class="card__name"><a href="${productUrl(p)}" data-vt>${esc(p.name)}</a></h3>
      <p class="card__price">${priceHTML(p)}</p>
      <p class="card__meta"><span class="swatch-dot" style="--c:${c.hex}"></span>${c.name}</p>
    </div>
  </article>`;
}

export const miniHTML = (p, { add = true } = {}) => `<div class="mini">
    <div class="mini__visual">
      <a class="mini__img" href="${productUrl(p)}" style="background:${p.bg}"><img src="${srcP(p.id, 0)}" width="480" height="600" alt="" loading="lazy" decoding="async"></a>
      ${add && stockTotal(p) ? `<button class="mini__add" type="button" data-quick="${p.id}" aria-label="Añadir ${esc(p.name)}">${icon('plus')}</button>` : ''}
    </div>
    <a href="${productUrl(p)}">${esc(p.name)}</a><b>${fmt(p.price)}</b>
  </div>`;

/* ---------- capas (dialog) ---------- */
let lockCount = 0;
const lock = () => { if (lockCount++ === 0) html.classList.add('is-locked'); };
const unlock = () => { lockCount = Math.max(0, lockCount - 1); if (!lockCount) html.classList.remove('is-locked'); };

function afterTransition(el, fn, max = 900) {
  let done = false;
  const end = (e) => { if (e && e.target !== el) return; if (done) return; done = true; el.removeEventListener('transitionend', end); fn(); };
  el.addEventListener('transitionend', end);
  setTimeout(end, reduced() ? 0 : max);
}

export function openLayer(id, trigger) {
  const d = document.getElementById(id);
  if (!d || d.open) return d;
  const menu = $('#menu');
  if (menu?.open && id !== 'menu') closeLayer(menu, { restoreFocus: false });
  d._trigger = trigger || document.activeElement;
  d.showModal();
  lock();
  d.dispatchEvent(new CustomEvent('layer:open'));
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
  return d;
}

export function closeLayer(d, { restoreFocus = true } = {}) {
  if (typeof d === 'string') d = document.getElementById(d);
  if (!d?.open || d._closing) return;
  d._closing = true;
  d.classList.remove('is-open');
  afterTransition(d, () => {
    d._closing = false;
    d.close();
    unlock();
    if (restoreFocus && d._trigger?.isConnected) d._trigger.focus({ preventScroll: true });
    d.dispatchEvent(new CustomEvent('layer:close'));
  }, d.id === 'menu' ? 900 : 700);
}

function initLayers() {
  $$('dialog').forEach((d) => {
    d.addEventListener('cancel', (e) => { e.preventDefault(); closeLayer(d); });
    d.addEventListener('click', (e) => {
      if (e.target !== d) return;
      const r = d.getBoundingClientRect();
      const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      if (outside) closeLayer(d);
    });
  });
  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      const target = opener.dataset.open;
      if (target === 'menu') positionMenuOrigin(opener);
      openLayer(target, opener);
      return;
    }
    const closer = e.target.closest('[data-close]');
    if (closer) closeLayer(closer.closest('dialog'));
  });
}

/* ---------- avisos ---------- */
export function toast({ title, text = '', img, action, onAction, href, timeout = 4200, iconName }) {
  const box = $('[data-toasts]');
  if (!box) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.innerHTML = `${img ? `<img src="${img}" alt="" width="44" height="55">` : iconName ? icon(iconName) : ''}
    <p>${esc(title)}${text ? `<small>${esc(text)}</small>` : ''}</p>
    ${action ? (href ? `<a href="${href}">${esc(action)}</a>` : `<button type="button">${esc(action)}</button>`) : ''}`;
  const kill = () => { t.classList.add('is-out'); t.addEventListener('animationend', () => t.remove(), { once: true }); setTimeout(() => t.remove(), 600); };
  t.querySelector('button')?.addEventListener('click', () => { onAction?.(); kill(); });
  box.append(t);
  while (box.children.length > 3) box.firstElementChild.remove();
  let timer = setTimeout(kill, timeout);
  t.addEventListener('pointerenter', () => clearTimeout(timer));
  t.addEventListener('pointerleave', () => { timer = setTimeout(kill, 1800); });
}

/* ---------- contadores ---------- */
function bump(el) { el.classList.remove('is-bump'); void el.offsetWidth; el.classList.add('is-bump'); }
function updateCounts(animate) {
  const c = store.cartCount();
  const f = store.getFavs().length;
  $$('[data-cart-count]').forEach((el) => { el.textContent = c; el.hidden = !c; if (animate === 'cart' && c) bump(el); });
  $$('[data-fav-count]').forEach((el) => { el.textContent = f; el.hidden = !f; if (animate === 'favs' && f) bump(el); });
  $$('[data-cart-count-label]').forEach((el) => { el.textContent = c ? `(${c})` : ''; });
  $$('[data-fav-count-label]').forEach((el) => { el.textContent = f ? `(${f})` : ''; });
}

/* ---------- imagen que vuela a la cesta ---------- */
export function flyToCart(fromEl, src) {
  if (reduced() || !fromEl) return;
  const hdr = $('[data-hdr]');
  hdr?.classList.remove('is-hidden');
  html.classList.remove('hdr-hidden');
  const target = $$('[data-open="cart"]').find((el) => {
    const r = el.getBoundingClientRect();
    return r.width && r.bottom > 0 && !el.closest('dialog');
  });
  if (!target) return;
  const a = fromEl.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const img = new Image();
  img.src = src;
  img.className = 'fly-img';
  img.alt = '';
  document.body.append(img);
  const sx = a.left + a.width / 2 - 32, sy = a.top + a.height / 2 - 40;
  const ex = b.left + b.width / 2 - 32, ey = b.top + b.height / 2 - 40;
  img.animate([
    { transform: `translate(${sx}px, ${sy}px) scale(1.1)`, opacity: 0 },
    { transform: `translate(${sx}px, ${sy - 30}px) scale(1)`, opacity: 1, offset: .15 },
    { transform: `translate(${(sx + ex) / 2}px, ${Math.min(sy, ey) - 90}px) scale(.62) rotate(-8deg)`, opacity: 1, offset: .55 },
    { transform: `translate(${ex}px, ${ey}px) scale(.14) rotate(0deg)`, opacity: .3 },
  ], { duration: 950, easing: 'cubic-bezier(.55, 0, .25, 1)' }).finished.then(() => img.remove(), () => img.remove());
}

/* ---------- selector de talla (vista rápida y ficha) ---------- */
export function sizePicker(root, p, { onChange } = {}) {
  const grid = $('.size-grid', root);
  const label = $('[data-size-label]', root);
  const msg = $('[data-size-msg]', root);
  const entries = Object.entries(p.sizes);
  let selected = entries.length === 1 && entries[0][1] ? entries[0][0] : null;
  grid.innerHTML = entries.map(([s, n]) =>
    `<button type="button" class="size-btn${n && n <= 2 ? ' is-low' : ''}" role="radio" aria-checked="${s === selected}" data-s="${s}"${n ? '' : ' disabled'} aria-label="Talla ${s}${n ? (n <= 2 ? ', últimas unidades' : '') : ', agotada'}">${s}</button>`
  ).join('');
  const sync = () => {
    $$('.size-btn', grid).forEach((b) => b.setAttribute('aria-checked', b.dataset.s === selected));
    if (label) label.textContent = selected || 'Elige tu talla';
    if (msg) {
      msg.classList.remove('is-err');
      const n = selected ? p.sizes[selected] : 0;
      msg.textContent = selected && n <= 2 ? `¡Solo ${n === 1 ? 'queda 1 unidad' : `quedan ${n} unidades`} en talla ${selected}!` : '';
    }
    onChange?.(selected);
  };
  grid.addEventListener('click', (e) => {
    const b = e.target.closest('.size-btn');
    if (!b || b.disabled) return;
    selected = b.dataset.s;
    sync();
  });
  grid.addEventListener('keydown', (e) => {
    if (!['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(e.key)) return;
    e.preventDefault();
    const btns = $$('.size-btn:not(:disabled)', grid);
    const i = btns.indexOf(document.activeElement);
    const next = btns[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length];
    next?.focus();
    next?.click();
  });
  sync();
  return {
    get: () => selected,
    shake(text = 'Selecciona una talla') {
      if (msg) { msg.textContent = text; msg.classList.add('is-err'); }
      grid.classList.remove('is-shake'); void grid.offsetWidth; grid.classList.add('is-shake');
      grid.querySelector('.size-btn:not(:disabled)')?.focus({ preventScroll: true });
    },
  };
}

/** Añade a la cesta con todo el feedback visual. Devuelve true si se añadió. */
export function addWithFeedback({ p, size, qty = 1, btn, from }) {
  const added = store.addToCart(p.id, size, qty);
  if (!added) {
    toast({ title: 'No queda más stock', text: `Ya tienes en la cesta todas las unidades de la talla ${size}.`, iconName: 'bag' });
    return false;
  }
  if (btn) {
    const label = btn.querySelector('span');
    const original = label?.innerHTML;
    btn.classList.add('is-loading');
    setTimeout(() => {
      btn.classList.remove('is-loading');
      btn.classList.add('is-done');
      if (label) label.innerHTML = 'Añadido a la cesta';
      setTimeout(() => { btn.classList.remove('is-done'); if (label) label.innerHTML = original; }, 1600);
    }, reduced() ? 0 : 380);
  }
  flyToCart(from || btn, srcP(p.id, 0));
  toast({
    title: 'Añadido a tu cesta', text: `${p.name} · Talla ${size}${added > 1 ? ` · ${added} uds.` : ''}`,
    img: srcP(p.id, 0), action: 'Ver cesta', onAction: () => openLayer('cart'),
  });
  return true;
}

/* ---------- cabecera ---------- */
function initHeader() {
  const hdr = $('[data-hdr]');
  if (!hdr) return;
  const dark = $$('[data-theme="dark"]');
  let lastY = scrollY;
  let ticking = false;
  const setHidden = (v) => { hdr.classList.toggle('is-hidden', v); html.classList.toggle('hdr-hidden', v); };
  const update = () => {
    ticking = false;
    const y = scrollY;
    hdr.classList.toggle('is-scrolled', y > 8);
    if (html.classList.contains('is-locked')) return;
    if (y > 320 && y > lastY + 6 && !hdr.classList.contains('is-mega')) setHidden(true);
    else if (y < lastY - 6 || y < 320) setHidden(false);
    lastY = y;
    const probe = hdr.offsetHeight / 2;
    hdr.classList.toggle('is-dark', dark.some((s) => { const r = s.getBoundingClientRect(); return r.top <= probe && r.bottom >= probe; }));
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  update();

  // enlace activo
  $$('.hdr__link').forEach((a) => {
    const url = new URL(a.href);
    if (url.hash || pagePath(url.pathname) !== pagePath()) return;
    if (url.search === location.search || (!url.search && !location.search.includes('orden=novedades'))) a.classList.add('is-current');
  });

  // cinta de anuncios
  const msgs = $$('[data-announce] p');
  if (msgs.length > 1 && !reduced()) {
    let i = 0;
    setInterval(() => {
      if (document.hidden) return;
      const cur = msgs[i];
      i = (i + 1) % msgs.length;
      cur.classList.replace('is-active', 'is-leaving');
      msgs[i].classList.add('is-active');
      setTimeout(() => cur.classList.remove('is-leaving'), 900);
    }, 4600);
  }

  // mega menú (solo con ratón)
  const trigger = $('[data-mega-trigger]');
  const mega = $('[data-mega]');
  if (!trigger || !mega) return;
  let tOpen, tClose;
  const open = () => { clearTimeout(tClose); tOpen = setTimeout(() => { hdr.classList.add('is-mega'); trigger.setAttribute('aria-expanded', 'true'); }, 70); };
  const close = (delay = 180) => { clearTimeout(tOpen); tClose = setTimeout(() => { hdr.classList.remove('is-mega'); trigger.setAttribute('aria-expanded', 'false'); }, delay); };
  [trigger.parentElement, mega].forEach((el) => {
    el.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') open(); });
    el.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') close(); });
  });
  trigger.addEventListener('focus', open);
  hdr.addEventListener('focusout', (e) => { if (!hdr.contains(e.relatedTarget)) close(0); });
  hdr.addEventListener('keydown', (e) => { if (e.key === 'Escape' && hdr.classList.contains('is-mega')) { close(0); trigger.focus(); } });
}

/* ---------- listas de categorías (mega, pie, menú) ---------- */
const countIn = (cat) => PRODUCTS.filter((p) => p.cat === cat).length;
function fillCategoryLinks() {
  $$('[data-cat-links]').forEach((ul) => {
    const inMega = !!ul.closest('.mega');
    ul.insertAdjacentHTML('beforeend', CATEGORIES.map((c) =>
      `<li><a href="tienda.html?cat=${c.id}">${c.name}${inMega ? ` <small>${countIn(c.id)}</small>` : ''}</a></li>`).join(''));
  });
  const menuCats = $('[data-menu-cats]');
  if (menuCats) {
    menuCats.innerHTML = `<li style="--i:0"><a href="tienda.html"><span class="menu__cat-all">${icon('grid-2')}</span><b>Ver todo</b><small>${PRODUCTS.length}</small></a></li>` +
      CATEGORIES.map((c, i) => `<li style="--i:${i + 1}"><a href="tienda.html?cat=${c.id}"><img src="${srcP(c.img, 0)}" alt="" width="52" height="64" loading="lazy" decoding="async"><b>${c.name}</b><small>${countIn(c.id)}</small></a></li>`).join('');
  }
  $$('[data-count-new]').forEach((el) => { el.textContent = PRODUCTS.filter((p) => p.isNew).length; });
}

/* ---------- menú móvil / tablet ---------- */
function positionMenuOrigin(btn) {
  const menu = $('#menu');
  if (!menu || !btn) return;
  const r = btn.getBoundingClientRect();
  menu.style.setProperty('--ox', `${r.left + r.width / 2}px`);
  menu.style.setProperty('--oy', `${r.top + r.height / 2}px`);
}
function initMenu() {
  const menu = $('#menu');
  if (!menu) return;
  const burger = $('[data-open="menu"]');
  const panels = $$('[data-panel]', menu);
  const show = (name) => {
    panels.forEach((p) => {
      const cur = p.dataset.panel === name;
      p.classList.toggle('is-current', cur);
      p.classList.toggle('is-behind', !cur && p.dataset.panel === 'root');
      p.inert = !cur;
    });
    const target = panels.find((p) => p.dataset.panel === name);
    requestAnimationFrame(() => target?.querySelector('a, button')?.focus({ preventScroll: true }));
  };
  menu.addEventListener('click', (e) => {
    const go = e.target.closest('[data-panel-go]');
    if (go) { show(go.dataset.panelGo); return; }
    if (e.target.closest('[data-panel-back]')) { show('root'); return; }
    const link = e.target.closest('a[data-close-on-click]');
    if (link) {
      const url = new URL(link.href);
      if (pagePath(url.pathname) === pagePath() && url.hash) {
        e.preventDefault();
        closeLayer(menu, { restoreFocus: false });
        setTimeout(() => $(url.hash)?.scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }), 350);
      }
    }
  });
  menu.addEventListener('layer:open', () => { show('root'); burger?.setAttribute('aria-expanded', 'true'); });
  menu.addEventListener('layer:close', () => burger?.setAttribute('aria-expanded', 'false'));
  matchMedia('(min-width: 1024px)').addEventListener('change', (e) => { if (e.matches && menu.open) closeLayer(menu); });
}

/* ---------- cesta ---------- */
function renderShip(box, sub) {
  if (!box) return;
  if (!store.cartCount()) { box.innerHTML = ''; return; }
  const left = store.freeShippingLeft(sub);
  box.classList.toggle('is-free', !left);
  box.innerHTML = `<p>${icon('truck')}${left ? `Te faltan <b>&nbsp;${fmt(left)}&nbsp;</b> para el envío gratis` : '¡Enhorabuena! Tu envío es <b>&nbsp;gratis</b>'}</p>
    <div class="ship__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${CONFIG.envioGratisDesde}" aria-valuenow="${Math.min(sub, CONFIG.envioGratisDesde).toFixed(2)}" aria-label="Progreso hacia el envío gratis"><i style="--p:${Math.min(1, sub / CONFIG.envioGratisDesde)}"></i></div>`;
}

function upsellFor(items) {
  const inCart = new Set(items.map((it) => it.id));
  const cats = items.length ? COMBINA[items[0].product.cat] : ['abrigos', 'punto'];
  return PRODUCTS.filter((p) => !inCart.has(p.id) && stockTotal(p) && cats.includes(p.cat)).slice(0, 2);
}

function lineHTML(it) {
  const p = it.product, c = colorOf(p), max = p.sizes[it.size];
  return `<div class="line" data-key="${it.key}">
    <a class="line__img" href="${productUrl(p)}" style="background:${p.bg}"><img src="${srcP(p.id, 0)}" width="480" height="600" alt="" loading="lazy" decoding="async"></a>
    <div class="line__body">
      <div class="line__top"><a class="line__name" href="${productUrl(p)}">${esc(p.name)}</a><span class="line__price">${fmt(p.price * it.qty)}</span></div>
      <p class="line__meta">${c.name} · Talla ${it.size} · ${fmt(p.price)}</p>
      ${it.qty >= max ? `<p class="line__warn">Has añadido todas las unidades disponibles</p>` : ''}
      <div class="line__actions">
        <div class="qty" role="group" aria-label="Cantidad">
          <button type="button" data-qty="-1" aria-label="Quitar una unidad">${icon('minus')}</button>
          <output aria-live="polite">${it.qty}</output>
          <button type="button" data-qty="1" aria-label="Añadir una unidad"${it.qty >= max ? ' disabled' : ''}>${icon('plus')}</button>
        </div>
        <button type="button" class="line__remove" data-remove>Eliminar</button>
      </div>
    </div>
  </div>`;
}

function renderCart() {
  const body = $('[data-cart-body]');
  if (!body) return;
  const items = store.getCart();
  const sub = store.subtotal();
  renderShip($('[data-ship]'), sub);
  const focusKey = document.activeElement?.closest?.('.line')?.dataset.key;
  const focusAttr = document.activeElement?.dataset?.qty ?? (document.activeElement?.hasAttribute?.('data-remove') ? 'rm' : null);
  const ups = upsellFor(items);
  body.innerHTML = items.length
    ? items.map(lineHTML).join('') + (ups.length ? `<div class="upsell"><p class="eyebrow">Combínalo con</p><div class="upsell__list">${ups.map((p) => miniHTML(p)).join('')}</div></div>` : '')
    : `<div class="drawer__empty"><svg class="mono" viewBox="9 9.2 416.6 434.6" aria-hidden="true"><use href="#rv-mono"/></svg>
        <h3 class="h3">Tu cesta está vacía</h3><p>Descubre las novedades de la temporada y encuentra tu próxima prenda favorita.</p>
        <a class="btn btn--dark" href="tienda.html"><span>Ir a la tienda</span>${icon('arrow')}</a></div>
       <div class="upsell"><p class="eyebrow">Te pueden gustar</p><div class="upsell__list">${ups.map((p) => miniHTML(p)).join('')}</div></div>`;
  const foot = $('[data-cart-foot]');
  foot.innerHTML = items.length ? `
    <div class="sum-row sum-row--total"><span>Subtotal</span><b>${fmt(sub)}</b></div>
    <p class="drawer__note">IVA incluido. Los gastos de envío se calculan en el siguiente paso.</p>
    <div class="drawer__btns">
      <a class="btn btn--dark btn--block" href="checkout.html"><span>Tramitar pedido</span>${icon('lock')}</a>
      <button class="btn btn--outline btn--block" type="button" data-close><span>Seguir comprando</span></button>
    </div>` : '';
  if (focusKey) {
    const line = body.querySelector(`.line[data-key="${CSS.escape(focusKey)}"]`);
    const el = focusAttr === 'rm' ? line?.querySelector('[data-remove]') : line?.querySelector(`[data-qty="${focusAttr}"]`);
    (el && !el.disabled ? el : line?.querySelector('[data-qty="-1"]'))?.focus({ preventScroll: true });
  }
}

function initCart() {
  const body = $('[data-cart-body]');
  if (!body) return;
  body.addEventListener('click', (e) => {
    const line = e.target.closest('.line');
    if (!line) return;
    const key = line.dataset.key;
    const q = e.target.closest('[data-qty]');
    if (q) {
      const cur = store.getCart().find((it) => it.key === key)?.qty ?? 0;
      const next = cur + Number(q.dataset.qty);
      if (next <= 0) return removeWithUndo(line, key);
      store.setQty(key, next);
      return;
    }
    if (e.target.closest('[data-remove]')) removeWithUndo(line, key);
  });
  $('#cart')?.addEventListener('layer:open', renderCart);
}

function removeWithUndo(line, key) {
  const it = store.getCart().find((x) => x.key === key);
  line.classList.add('is-removing');
  setTimeout(() => {
    const removed = store.removeLine(key);
    if (removed) toast({ title: 'Prenda eliminada', text: `${it.product.name} · Talla ${it.size}`, img: srcP(it.id, 0), action: 'Deshacer', onAction: () => store.restoreLine(removed) });
  }, reduced() ? 0 : 320);
}

/* ---------- favoritos ---------- */
function renderFavs() {
  const body = $('[data-favs-body]');
  if (!body) return;
  const favs = store.getFavs();
  body.innerHTML = favs.length
    ? favs.map((p) => `<div class="line" data-id="${p.id}">
        <a class="line__img" href="${productUrl(p)}" style="background:${p.bg}"><img src="${srcP(p.id, 0)}" width="480" height="600" alt="" loading="lazy" decoding="async"></a>
        <div class="line__body">
          <div class="line__top"><a class="line__name" href="${productUrl(p)}">${esc(p.name)}</a><span class="line__price">${fmt(p.price)}</span></div>
          <p class="line__meta">${colorOf(p).name}${stockTotal(p) ? '' : ' · Agotado'}</p>
          <div class="line__actions">
            ${stockTotal(p) ? `<button type="button" class="btn btn--dark btn--sm" data-quick="${p.id}"><span>Añadir a la cesta</span></button>` : '<span></span>'}
            <button type="button" class="line__remove" data-fav="${p.id}" aria-pressed="true">Quitar</button>
          </div>
        </div></div>`).join('')
    : `<div class="drawer__empty"><svg class="mono" viewBox="9 9.2 416.6 434.6" aria-hidden="true"><use href="#rv-mono"/></svg>
        <h3 class="h3">Aún no tienes favoritos</h3><p>Pulsa el corazón de cualquier prenda para guardarla aquí y no perderla de vista.</p>
        <a class="btn btn--dark" href="tienda.html"><span>Explorar la tienda</span>${icon('arrow')}</a></div>`;
}

/* ---------- vista rápida ---------- */
export function openQuick(pid, trigger) {
  const p = byId(pid);
  const body = $('[data-quick-body]');
  if (!p || !body) return;
  const c = colorOf(p);
  body.innerHTML = `
    <div class="quick__media" style="background:${p.bg}">
      <img src="${srcP(p.id, 1)}" srcset="${srcsetP(p.id)}" sizes="(min-width: 768px) 480px, 100vw" width="800" height="1000" alt="${esc(p.name)}">
      <div class="pdp__badges">${badgesHTML(p)}</div>
    </div>
    <div class="quick__info">
      <div class="pdp__head">
        <p class="eyebrow">${catById(p.cat).name}</p>
        <h2 class="h3" id="quick-title">${esc(p.name)}</h2>
        <p class="pdp__price">${priceHTML(p)}</p>
      </div>
      <div class="opt">
        <div class="opt__head"><span>Color: <b>${c.name}</b></span></div>
        <div class="opt__color"><span class="opt__swatch" style="--c:${c.hex}"></span></div>
      </div>
      <div class="opt">
        <div class="opt__head"><span>Talla: <b data-size-label></b></span><button type="button" class="opt__link" data-open="sizes">${icon('ruler')}Guía de tallas</button></div>
        <div class="size-grid" role="radiogroup" aria-label="Talla"></div>
        <p class="opt__msg" data-size-msg aria-live="polite"></p>
      </div>
      <div class="atc">
        <button type="button" class="btn btn--dark" data-quick-add><span>Añadir a la cesta</span>${icon('bag')}</button>
        ${favBtn(p)}
      </div>
      <a class="quick__more" href="${productUrl(p)}">Ver todos los detalles</a>
    </div>`;
  const picker = sizePicker(body, p);
  $('[data-quick-add]', body).addEventListener('click', (e) => {
    const size = picker.get();
    if (!size) return picker.shake();
    const ok = addWithFeedback({ p, size, btn: e.currentTarget, from: $('.quick__media img', body) });
    if (ok) setTimeout(() => closeLayer('quick', { restoreFocus: true }), reduced() ? 0 : 700);
  });
  openLayer('quick', trigger);
}

/* ---------- buscador ---------- */
function initSearch() {
  const dlg = $('#search');
  const input = $('[data-search-input]');
  const results = $('[data-search-results]');
  if (!dlg || !input) return;
  let sel = -1;
  const index = PRODUCTS.map((p) => ({ p, text: norm(`${p.name} ${catById(p.cat).name} ${colorOf(p).name} ${p.desc}`) }));
  const highlight = (name, terms) => {
    let out = esc(name);
    terms.forEach((t) => {
      const i = norm(out).indexOf(t);
      if (i >= 0 && t.length > 1) out = `${out.slice(0, i)}<mark>${out.slice(i, i + t.length)}</mark>${out.slice(i + t.length)}`;
    });
    return out;
  };
  const run = () => {
    const q = input.value.trim();
    const terms = norm(q).split(/\s+/).filter(Boolean);
    sel = -1;
    if (!terms.length) { results.innerHTML = ''; return; }
    const found = index.filter(({ text }) => terms.every((t) => text.includes(t))).map(({ p }) => p);
    results.innerHTML = found.length
      ? `<div class="search__head"><span>${found.length} ${found.length === 1 ? 'resultado' : 'resultados'}</span><a class="link-arrow" href="tienda.html?q=${encodeURIComponent(q)}">Ver todos ${icon('arrow')}</a></div>
         <div class="search__grid">${found.slice(0, 12).map((p, i) => `<a class="search__item" role="option" id="sr-${i}" aria-selected="false" href="${productUrl(p)}">
            <span class="mini__img" style="background:${p.bg}"><img src="${srcP(p.id, 0)}" width="480" height="600" alt="" loading="lazy"></span>
            <span>${highlight(p.name, terms)}</span><b>${fmt(p.price)}</b></a>`).join('')}</div>`
      : `<p class="search__none">No encontramos nada para «${esc(q)}». Prueba con otra palabra, como «abrigo» o «camisa».</p>`;
  };
  let t;
  input.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 110); });
  input.addEventListener('keydown', (e) => {
    const items = $$('.search__item', results);
    if (!items.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(e.key)) return;
    if (e.key === 'Enter') { if (sel >= 0) { e.preventDefault(); items[sel].click(); } return; }
    e.preventDefault();
    sel = (sel + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items.forEach((el, i) => el.setAttribute('aria-selected', i === sel));
    input.setAttribute('aria-activedescendant', items[sel].id);
    items[sel].scrollIntoView({ block: 'nearest' });
  });
  $$('[data-term]', dlg).forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.term; run(); input.focus(); }));
  dlg.addEventListener('layer:open', () => setTimeout(() => input.focus(), 60));
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && !e.target.closest('input, textarea, select, [contenteditable]') && !document.querySelector('dialog[open]')) {
      e.preventDefault();
      openLayer('search');
    }
  });
}

/* ---------- newsletter ---------- */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const isEmail = (v) => EMAIL_RE.test(String(v).trim());
function initNewsletter() {
  $$('[data-news-form]').forEach((form) => {
    const msg = $('[data-news-msg]', form);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = form.email.value.trim();
      if (!isEmail(email)) {
        form.classList.add('is-invalid');
        msg.textContent = 'Revisa tu correo: parece que falta algo.';
        form.email.focus();
        return;
      }
      form.classList.remove('is-invalid');
      try { localStorage.setItem('rv:news', JSON.stringify([...new Set([...(JSON.parse(localStorage.getItem('rv:news')) || []), email])])); } catch { /* sin almacenamiento */ }
      msg.textContent = '¡Gracias! Ya formas parte del círculo Rose Valer.';
      form.reset();
    });
    form.email.addEventListener('input', () => { if (form.classList.contains('is-invalid') && isEmail(form.email.value)) { form.classList.remove('is-invalid'); msg.textContent = ''; } });
  });
}

/* ---------- botón volver arriba ---------- */
function initToTop() {
  const btn = $('[data-to-top]');
  if (!btn) return;
  let ticking = false;
  const update = () => {
    ticking = false;
    const max = document.documentElement.scrollHeight - innerHeight;
    btn.classList.toggle('is-on', scrollY > innerHeight * 1.2);
    btn.style.setProperty('--p', max > 0 ? (scrollY / max).toFixed(3) : 0);
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  btn.addEventListener('click', () => scrollTo({ top: 0, behavior: reduced() ? 'auto' : 'smooth' }));
}

/* ---------- datos de contacto y año ---------- */
function fillContact() {
  const c = CONFIG.contacto;
  const map = {
    instagram: c.instagram && `https://instagram.com/${c.instagram.replace(/^@/, '')}`,
    tiktok: c.tiktok && `https://www.tiktok.com/@${c.tiktok.replace(/^@/, '')}`,
    pinterest: c.pinterest && `https://pinterest.com/${c.pinterest}`,
  };
  $$('[data-social]').forEach((a) => {
    const href = map[a.dataset.social];
    if (href) { a.href = href; a.hidden = false; a.target = '_blank'; a.rel = 'noopener'; }
  });
  $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

/* ---------- delegación global ---------- */
function initDelegation() {
  document.addEventListener('click', (e) => {
    const fav = e.target.closest('[data-fav]');
    if (fav) {
      e.preventDefault();
      const p = byId(fav.dataset.fav);
      const on = store.toggleFav(p.id);
      if (on && !fav.closest('#favs')) toast({ title: 'Guardado en favoritos', text: p.name, img: srcP(p.id, 0), action: 'Ver', onAction: () => openLayer('favs') });
      return;
    }
    const quick = e.target.closest('[data-quick]');
    if (quick) { e.preventDefault(); openQuick(quick.dataset.quick, quick); return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      e.preventDefault();
      const p = byId(add.dataset.add);
      addWithFeedback({ p, size: add.dataset.size, from: add.closest('.card')?.querySelector('.card__media img') || add });
      return;
    }
    // transición compartida tarjeta → ficha de producto
    const vt = e.target.closest('a[data-vt]');
    if (vt && 'startViewTransition' in document) {
      $$('.pdp-main-img, [style*="view-transition-name"]').forEach((el) => { el.style.viewTransitionName = ''; });
      const img = vt.closest('.card')?.querySelector('.card__media img');
      if (img) img.style.viewTransitionName = 'product-image';
    }
  });
  // al volver atrás con la caché del navegador, limpiar nombres de transición
  addEventListener('pageshow', () => $$('.card__media img').forEach((img) => { img.style.viewTransitionName = ''; }));
}

/* ---------- arranque ---------- */
let started = false;
export function initUI() {
  if (started) return;
  started = true;
  initLayers();
  initHeader();
  fillCategoryLinks();
  initMenu();
  initCart();
  initSearch();
  initNewsletter();
  initToTop();
  fillContact();
  initDelegation();
  $('#favs')?.addEventListener('layer:open', renderFavs);
  updateCounts();
  store.subscribe((type, detail) => {
    updateCounts(type === 'cart:add' ? 'cart' : type === 'favs' && detail?.active ? 'favs' : null);
    if (type.startsWith('cart')) { if ($('#cart')?.open) renderCart(); }
    if (type === 'favs') {
      $$('[data-fav]').forEach((b) => { if (b.matches('.fav-btn')) b.setAttribute('aria-pressed', store.isFav(b.dataset.fav)); });
      if ($('#favs')?.open) renderFavs();
    }
  });
}
