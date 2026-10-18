/* ==========================================================================
   Tienda: catálogo con categorías, filtros (talla, color, precio, stock,
   ofertas), orden, búsqueda y densidad de rejilla. Todo queda en la URL,
   así que cualquier vista filtrada se puede compartir o guardar.
   ========================================================================== */
import { PRODUCTS, CATEGORIES, COLORS, catById, stockTotal } from './data.js';
import { $, $$, reduced, norm, esc, icon, cardHTML, miniHTML, toEl, initUI } from './ui.js';
import { initFX } from './fx.js';
import { runIntro } from './intro.js';
import * as store from './store.js';

initUI();

const grid = $('[data-shop-grid]');
const empty = $('[data-shop-empty]');
const form = $('[data-filters-form]');
const prices = PRODUCTS.map((p) => p.price);
const PMIN = Math.floor(Math.min(...prices) / 5) * 5;
const PMAX = Math.ceil(Math.max(...prices) / 5) * 5;
const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'Única'];
const usedColors = [...new Set(PRODUCTS.map((p) => p.color))];
const SORTS = ['destacados', 'novedades', 'precio-asc', 'precio-desc'];

/* ---------- estado desde la URL ---------- */
const params = new URLSearchParams(location.search);
const list = (k) => (params.get(k) || '').split(',').filter(Boolean);
const state = {
  cat: catById(params.get('cat')) ? params.get('cat') : '',
  q: params.get('q') || '',
  sizes: list('talla').filter((s) => SIZES.includes(s)),
  colors: list('color').filter((c) => COLORS[c]),
  min: Math.max(PMIN, Number(params.get('min')) || PMIN),
  max: Math.min(PMAX, Number(params.get('max')) || PMAX),
  stock: params.get('stock') === '1',
  sale: params.get('oferta') === '1',
  sort: SORTS.includes(params.get('orden')) ? params.get('orden') : 'destacados',
};
let cols = 4;
try { cols = Number(localStorage.getItem('rv:cols')) || 4; } catch { /* sin almacenamiento */ }

function writeURL() {
  const p = new URLSearchParams();
  if (state.cat) p.set('cat', state.cat);
  if (state.q) p.set('q', state.q);
  if (state.sizes.length) p.set('talla', state.sizes.join(','));
  if (state.colors.length) p.set('color', state.colors.join(','));
  if (state.min > PMIN) p.set('min', state.min);
  if (state.max < PMAX) p.set('max', state.max);
  if (state.stock) p.set('stock', '1');
  if (state.sale) p.set('oferta', '1');
  if (state.sort !== 'destacados') p.set('orden', state.sort);
  const qs = p.toString();
  history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
}

/* ---------- filtrado y orden ---------- */
function results({ ignoreCat = false } = {}) {
  const terms = norm(state.q).split(/\s+/).filter(Boolean);
  let out = PRODUCTS.filter((p) => {
    if (!ignoreCat && state.cat && p.cat !== state.cat) return false;
    if (state.sizes.length && !state.sizes.some((s) => p.sizes[s] > 0)) return false;
    if (state.colors.length && !state.colors.includes(p.color)) return false;
    if (p.price < state.min || p.price > state.max) return false;
    if (state.stock && !stockTotal(p)) return false;
    if (state.sale && !(p.compareAt > p.price)) return false;
    if (terms.length) {
      const text = norm(`${p.name} ${catById(p.cat).name} ${COLORS[p.color].name} ${p.desc}`);
      if (!terms.every((t) => text.includes(t))) return false;
    }
    return true;
  });
  if (state.sort === 'novedades') out = out.sort((a, b) => b.added.localeCompare(a.added));
  if (state.sort === 'precio-asc') out = out.sort((a, b) => a.price - b.price);
  if (state.sort === 'precio-desc') out = out.sort((a, b) => b.price - a.price);
  // los agotados siempre al final
  return out.sort((a, b) => (stockTotal(b) > 0) - (stockTotal(a) > 0));
}

/* ---------- tarjetas reutilizables (las imágenes no se recargan al filtrar) ---------- */
const sizesAttr = () => `(min-width: 1024px) ${Math.round(100 / cols)}vw, (min-width: 768px) 31vw, 48vw`;
const cards = new Map(PRODUCTS.map((p, i) => [p.id, toEl(cardHTML(p, { sizes: sizesAttr(), eager: i < 4 }))]));

function renderGrid(items) {
  const first = new Map();
  if (!reduced()) [...grid.children].forEach((el) => first.set(el.dataset.id, el.getBoundingClientRect()));
  grid.replaceChildren(...items.map((p) => cards.get(p.id)));
  empty.hidden = items.length > 0;
  if (reduced()) return;
  [...grid.children].forEach((el, i) => {
    const f = first.get(el.dataset.id);
    if (f) {
      const l = el.getBoundingClientRect();
      const dx = f.left - l.left, dy = f.top - l.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
      }
    } else {
      el.animate([{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 650, delay: Math.min(i, 10) * 45, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    }
  });
}

/* ---------- cabecera de la tienda ---------- */
function renderHead(count) {
  const cat = catById(state.cat);
  const title = state.q ? `«${state.q}»` : cat ? cat.name : state.sale ? 'Ofertas' : state.sort === 'novedades' ? 'Novedades' : 'Tienda';
  $('[data-shop-title]').innerHTML = state.q ? `<em>${esc(title)}</em>` : esc(title);
  document.title = `${state.q ? `Resultados para ${state.q}` : title} — Rose Valer`;
  $('[data-shop-count]').textContent = count;
  const sep = $('[data-crumb-sep]'), current = $('[data-crumb-current]');
  const showCrumb = cat || state.q;
  sep.hidden = current.hidden = !showCrumb;
  current.textContent = state.q ? 'Búsqueda' : cat?.name || '';

  // categorías con su número de resultados
  const base = results({ ignoreCat: true });
  $('[data-shop-cats]').innerHTML = [{ id: '', name: 'Todo' }, ...CATEGORIES].map((c) => {
    const n = c.id ? base.filter((p) => p.cat === c.id).length : base.length;
    const on = state.cat === c.id;
    return `<button type="button" class="chip${on ? ' is-active' : ''}" role="tab" aria-selected="${on}" data-cat="${c.id}">${c.id ? c.short : c.name} <small>${n}</small></button>`;
  }).join('');
}

/* ---------- filtros activos ---------- */
function renderActive() {
  const chips = [];
  if (state.q) chips.push(['q', '', `Búsqueda: ${state.q}`]);
  state.sizes.forEach((s) => chips.push(['talla', s, `Talla ${s}`]));
  state.colors.forEach((c) => chips.push(['color', c, COLORS[c].name]));
  if (state.min > PMIN || state.max < PMAX) chips.push(['precio', '', `${state.min} € – ${state.max} €`]);
  if (state.stock) chips.push(['stock', '', 'Con stock']);
  if (state.sale) chips.push(['oferta', '', 'Ofertas']);
  $('[data-active-filters]').innerHTML = chips.map(([k, v, label]) =>
    `<button type="button" class="chip" data-unset="${k}" data-v="${esc(v)}" aria-label="Quitar filtro ${esc(label)}">${esc(label)} ${icon('close')}</button>`).join('');
  const n = chips.filter(([k]) => k !== 'q').length;
  const badge = $('[data-filter-count]');
  badge.textContent = n;
  badge.hidden = !n;
}

/* ---------- formulario de filtros ---------- */
function buildFilters() {
  $('[data-f-sizes]').innerHTML = SIZES.map((s) =>
    `<label><input type="checkbox" name="talla" value="${s}"${state.sizes.includes(s) ? ' checked' : ''}><span>${s}</span></label>`).join('');
  $('[data-f-colors]').innerHTML = usedColors.map((c) =>
    `<label><input type="checkbox" name="color" value="${c}"${state.colors.includes(c) ? ' checked' : ''}><span style="--c:${COLORS[c].hex}">${COLORS[c].name}</span></label>`).join('');
  const min = $('[data-range-min]'), max = $('[data-range-max]');
  [min, max].forEach((r) => { r.min = PMIN; r.max = PMAX; });
  min.value = state.min;
  max.value = state.max;
  $('[data-f-stock]').checked = state.stock;
  $('[data-f-sale]').checked = state.sale;
  paintRange();
}
function paintRange() {
  const min = $('[data-range-min]'), max = $('[data-range-max]');
  const a = ((min.value - PMIN) / (PMAX - PMIN)) * 100, b = ((max.value - PMIN) / (PMAX - PMIN)) * 100;
  const box = $('[data-f-price]');
  box.style.setProperty('--a', `${a}%`);
  box.style.setProperty('--b', `${b}%`);
  $('[data-range-min-label]').textContent = `${min.value} €`;
  $('[data-range-max-label]').textContent = `${max.value} €`;
}
form.addEventListener('input', (e) => {
  const min = $('[data-range-min]'), max = $('[data-range-max]');
  if (e.target === min && +min.value > +max.value - 5) min.value = +max.value - 5;
  if (e.target === max && +max.value < +min.value + 5) max.value = +min.value + 5;
  paintRange();
  state.sizes = $$('input[name="talla"]:checked', form).map((i) => i.value);
  state.colors = $$('input[name="color"]:checked', form).map((i) => i.value);
  state.min = +min.value;
  state.max = +max.value;
  state.stock = $('[data-f-stock]').checked;
  state.sale = $('[data-f-sale]').checked;
  update();
});
form.addEventListener('submit', (e) => e.preventDefault());

function clearAll() {
  Object.assign(state, { q: '', sizes: [], colors: [], min: PMIN, max: PMAX, stock: false, sale: false });
  buildFilters();
  update();
}

/* ---------- eventos ---------- */
$('[data-shop-cats]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-cat]');
  if (!b) return;
  state.cat = b.dataset.cat;
  update();
  b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced() ? 'auto' : 'smooth' });
});
$('[data-active-filters]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-unset]');
  if (!b) return;
  const { unset: k, v } = b.dataset;
  if (k === 'q') state.q = '';
  if (k === 'talla') state.sizes = state.sizes.filter((s) => s !== v);
  if (k === 'color') state.colors = state.colors.filter((c) => c !== v);
  if (k === 'precio') { state.min = PMIN; state.max = PMAX; }
  if (k === 'stock') state.stock = false;
  if (k === 'oferta') state.sale = false;
  buildFilters();
  update();
});
$$('[data-clear-filters]').forEach((b) => b.addEventListener('click', clearAll));
const sort = $('[data-sort]');
sort.value = state.sort;
sort.addEventListener('change', () => { state.sort = sort.value; update(); });

const density = $('[data-density]');
const paintDensity = () => {
  grid.dataset.cols = cols;
  $$('button', density).forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.cols) === cols));
  const s = sizesAttr();
  cards.forEach((el) => el.querySelector('.card__media img').sizes = s);
};
density.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cols]');
  if (!b) return;
  cols = Number(b.dataset.cols);
  try { localStorage.setItem('rv:cols', cols); } catch { /* sin almacenamiento */ }
  const first = new Map([...grid.children].map((el) => [el.dataset.id, el.getBoundingClientRect()]));
  paintDensity();
  if (reduced()) return;
  [...grid.children].forEach((el) => {
    const f = first.get(el.dataset.id), l = el.getBoundingClientRect();
    el.animate([{ transform: `translate(${f.left - l.left}px, ${f.top - l.top}px) scale(${f.width / l.width})`, transformOrigin: 'top left' }, { transform: 'none', transformOrigin: 'top left' }], { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' });
  });
});

/* ---------- vistos recientemente ---------- */
function renderRecent() {
  const items = store.getRecent();
  const box = $('[data-recent]');
  if (!items.length) return;
  $('[data-recent-rail]').innerHTML = items.map((p) => miniHTML(p)).join('');
  box.hidden = false;
}

/* ---------- ciclo ---------- */
function update() {
  const items = results();
  renderHead(items.length);
  renderActive();
  renderGrid(items);
  $('[data-filter-result]').textContent = items.length;
  writeURL();
}

buildFilters();
paintDensity();
update();
renderRecent();
initFX();
runIntro().then(() => document.documentElement.classList.add('is-ready'));
