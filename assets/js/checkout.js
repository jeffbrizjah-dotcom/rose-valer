/* ==========================================================================
   Checkout en 3 pasos: datos y dirección → método de entrega → pago.
   - Zona y provincia se detectan solas por el código postal.
   - Envío y fechas de entrega según la zona; gratis al superar el umbral.
   - Lo escrito se conserva si se recarga la página (sessionStorage).
   - La pasarela de pago está PENDIENTE: el pedido se registra como prueba.
   ========================================================================== */
import { CONFIG, colorOf } from './data.js';
import { $, $$, reduced, fmt, esc, icon, srcP, isEmail, toast, initUI } from './ui.js';
import * as store from './store.js';

initUI();

const PROVINCIAS = ['', 'Álava', 'Albacete', 'Alicante', 'Almería', 'Ávila', 'Badajoz', 'Islas Baleares', 'Barcelona', 'Burgos', 'Cáceres',
  'Cádiz', 'Castellón', 'Ciudad Real', 'Córdoba', 'A Coruña', 'Cuenca', 'Girona', 'Granada', 'Guadalajara', 'Gipuzkoa', 'Huelva', 'Huesca',
  'Jaén', 'León', 'Lleida', 'La Rioja', 'Lugo', 'Madrid', 'Málaga', 'Murcia', 'Navarra', 'Ourense', 'Asturias', 'Palencia', 'Las Palmas',
  'Pontevedra', 'Salamanca', 'Santa Cruz de Tenerife', 'Cantabria', 'Segovia', 'Sevilla', 'Soria', 'Tarragona', 'Teruel', 'Toledo',
  'Valencia', 'Valladolid', 'Bizkaia', 'Zamora', 'Zaragoza', 'Ceuta', 'Melilla']; // índice = prefijo del código postal

const form = $('[data-co-form]');
const SAVE_KEY = 'rv:checkout';
let placed = false; // tras confirmar, la cesta vacía no debe mostrar el aviso de "cesta vacía"
const state = { step: 1, zone: 'peninsula', ship: null, pay: CONFIG.pagos[0].id, coupon: null };

/* ---------- utilidades ---------- */
const zoneFor = (cp) => {
  const pre = String(cp).slice(0, 2);
  return Object.entries(CONFIG.zonas).find(([, z]) => z.prefijos?.includes(pre))?.[0] || 'peninsula';
};
const fmtDay = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
function addBusinessDays(n) { const d = new Date(); while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() % 6) n--; } return d; }
const eta = ([a, b]) => `${fmtDay.format(addBusinessDays(a))} – ${fmtDay.format(addBusinessDays(b))}`;
const methods = () => CONFIG.zonas[state.zone].metodos;
const shipPrice = (m, sub = store.subtotal()) => (m.gratisDesde && sub >= m.gratisDesde ? 0 : m.precio);

function totals() {
  const sub = store.subtotal();
  const m = methods().find((x) => x.id === state.ship);
  const ship = m ? shipPrice(m, sub) : null;
  let discount = 0;
  if (state.coupon) {
    const c = CONFIG.cupones[state.coupon];
    discount = c.tipo === 'porcentaje' ? Math.round(sub * c.valor) / 100 : Math.min(sub, c.valor);
  }
  const total = Math.max(0, sub - discount + (ship || 0));
  return { sub, ship, discount, total, tax: total - total / (1 + CONFIG.iva) };
}

/* ---------- resumen ---------- */
function renderSummary() {
  const items = store.getCart();
  $('[data-sum-items]').innerHTML = items.map((it) => `<li class="co-item">
    <span class="co-item__img" style="background:${it.product.bg}"><img src="${srcP(it.id, 0)}" alt="" width="480" height="600" loading="lazy"><b>${it.qty}</b></span>
    <span class="co-item__name"><b>${esc(it.product.name)}</b><span>${colorOf(it.product).name} · Talla ${it.size}</span></span>
    <span class="co-item__price">${fmt(it.product.price * it.qty)}</span></li>`).join('');
  const t = totals();
  $('[data-sum-totals]').innerHTML = `
    <div><dt>Subtotal</dt><dd>${fmt(t.sub)}</dd></div>
    ${t.discount ? `<div><dt>Descuento (${esc(state.coupon)})</dt><dd>−${fmt(t.discount)}</dd></div>` : ''}
    <div class="${t.ship === null ? 'is-muted' : t.ship === 0 ? 'is-free' : ''}"><dt>Envío</dt><dd>${t.ship === null ? 'Se calcula en el paso 2' : t.ship === 0 ? 'Gratis' : fmt(t.ship)}</dd></div>
    <div class="totals__total"><dt>Total</dt><dd>${fmt(t.total)}</dd></div>
    <p class="totals__tax">Incluye ${fmt(t.tax)} de IVA</p>`;
  $('[data-sum-total-mini]').textContent = fmt(t.total);
  $('[data-place-total]').textContent = fmt(t.total);
}

/* ---------- validación ---------- */
const RULES = {
  email: (v) => (!v ? 'Escribe tu correo electrónico' : !isEmail(v) ? 'Este correo no parece válido' : ''),
  nombre: (v) => (v.trim().length < 2 ? 'Escribe tu nombre' : ''),
  apellidos: (v) => (v.trim().length < 2 ? 'Escribe tus apellidos' : ''),
  direccion: (v) => (v.trim().length < 5 ? 'Escribe la calle y el número' : !/\d/.test(v) ? 'Añade el número de la calle' : ''),
  cp: (v) => (!/^\d{5}$/.test(v) ? 'El código postal tiene 5 cifras' : (+v.slice(0, 2) < 1 || +v.slice(0, 2) > 52) ? 'Este código postal no existe en España' : ''),
  ciudad: (v) => (v.trim().length < 2 ? 'Escribe tu población' : ''),
  provincia: (v) => (!v ? 'Elige tu provincia' : ''),
  telefono: (v) => (!/^(\+?34)?[6789]\d{8}$/.test(v.replace(/[\s.-]/g, '')) ? 'Escribe un teléfono de 9 cifras' : ''),
};
function check(name, show = true) {
  const input = form.elements[name];
  const field = input.closest('.field');
  const msg = RULES[name](input.value);
  if (show) {
    field.classList.toggle('is-invalid', !!msg);
    field.classList.toggle('is-valid', !msg);
    const err = field.querySelector('.field__err');
    if (err) err.textContent = msg;
    input.setAttribute('aria-invalid', !!msg);
  }
  return !msg;
}
Object.keys(RULES).forEach((name) => {
  const input = form.elements[name];
  input.addEventListener('blur', () => { if (input.value) { input.dataset.touched = '1'; check(name); } });
  input.addEventListener('input', () => { if (input.dataset.touched) check(name); save(); });
  input.addEventListener('change', () => { input.dataset.touched = '1'; check(name); save(); });
});

/* ---------- código postal → provincia y zona ---------- */
const cp = form.elements.cp;
cp.addEventListener('input', () => {
  cp.value = cp.value.replace(/\D/g, '').slice(0, 5);
  if (cp.value.length !== 5) return;
  const prov = PROVINCIAS[+cp.value.slice(0, 2)];
  if (prov) { form.elements.provincia.value = prov; check('provincia'); }
  setZone(zoneFor(cp.value));
});
function setZone(z) {
  const changed = z !== state.zone;
  state.zone = z;
  const note = $('[data-zone-note]');
  const zone = CONFIG.zonas[z];
  note.hidden = z === 'peninsula';
  note.textContent = z === 'peninsula' ? '' : `Envío a ${zone.nombre}. ${zone.aviso || 'Los plazos de entrega son algo mayores.'}`;
  if (changed) { state.ship = null; renderMethods(); renderSummary(); }
}

/* ---------- métodos de envío y pago ---------- */
function renderMethods() {
  const sub = store.subtotal();
  if (!methods().some((m) => m.id === state.ship)) state.ship = methods()[0].id;
  $('[data-ship-methods]').innerHTML = methods().map((m) => {
    const price = shipPrice(m, sub);
    const toFree = m.gratisDesde && price ? m.gratisDesde - sub : 0;
    return `<label class="option">
      <input type="radio" name="envio" value="${m.id}"${m.id === state.ship ? ' checked' : ''}>
      <span class="option__radio" aria-hidden="true"></span>
      <span class="option__body"><b>${m.nombre}</b><span>${m.detalle} · Llega ${eta(m.dias)}</span>${toFree > 0 ? `<em>Gratis si añades ${fmt(toFree)} más</em>` : ''}</span>
      <span class="option__price${price ? '' : ' is-free'}">${price ? fmt(price) : 'Gratis'}</span>
    </label>`;
  }).join('');
}
$('[data-ship-methods]').addEventListener('change', (e) => { state.ship = e.target.value; renderSummary(); save(); });

$('[data-pay-methods]').innerHTML = CONFIG.pagos.map((m) => `<label class="option">
  <input type="radio" name="pago" value="${m.id}"${m.id === state.pay ? ' checked' : ''}>
  <span class="option__radio" aria-hidden="true"></span>
  <span class="option__body"><b>${m.nombre}</b><span>${m.detalle}</span></span>
  <span class="option__price">Próximamente</span></label>`).join('');
$('[data-pay-methods]').addEventListener('change', (e) => { state.pay = e.target.value; });

/* ---------- pasos ---------- */
const steps = $$('[data-step]');
function goTo(n) {
  state.step = n;
  steps.forEach((s) => {
    const k = +s.dataset.step;
    if (k < n) s.classList.add('is-done');
    s.classList.toggle('is-open', k === n);
    const edit = s.querySelector('[data-step-edit]');
    if (edit) edit.hidden = !(s.classList.contains('is-done') && k !== n);
  });
  $$('[data-co-progress] li').forEach((li, i) => {
    li.classList.toggle('is-current', i + 1 === n);
    li.classList.toggle('is-done', i + 1 < n);
  });
  resume();
  const open = steps[n - 1];
  setTimeout(() => {
    const top = open.getBoundingClientRect().top + scrollY - 20;
    if (open.getBoundingClientRect().top < 0 || open.getBoundingClientRect().top > innerHeight * .6) scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
    open.querySelector('input:not([type="hidden"]), select, button')?.focus({ preventScroll: true });
  }, 60);
  save();
}
function resume() {
  const f = form.elements;
  $('[data-step-resume="1"]').innerHTML = `${esc(f.nombre.value)} ${esc(f.apellidos.value)} · ${esc(f.email.value)}<br>${esc(f.direccion.value)}${f.direccion2.value ? `, ${esc(f.direccion2.value)}` : ''} · ${esc(f.cp.value)} ${esc(f.ciudad.value)} (${esc(f.provincia.value)})`;
  const m = methods().find((x) => x.id === state.ship);
  if (m) $('[data-step-resume="2"]').innerHTML = `${m.nombre} · Llega ${eta(m.dias)} · ${shipPrice(m) ? fmt(shipPrice(m)) : 'Gratis'}`;
}
form.addEventListener('click', (e) => {
  const next = e.target.closest('[data-next]');
  if (next) {
    const n = +next.dataset.next;
    if (n === 1) {
      const names = Object.keys(RULES);
      const bad = names.filter((k) => !check(k));
      if (bad.length) { form.elements[bad[0]].focus(); return; }
      setZone(zoneFor(cp.value));
      renderMethods();
    }
    goTo(n + 1);
    return;
  }
  const edit = e.target.closest('[data-step-edit]');
  if (edit) goTo(+edit.dataset.stepEdit);
});

/* ---------- cupón (solo si hay códigos configurados) ---------- */
const coupon = $('[data-coupon]');
if (Object.keys(CONFIG.cupones).length) {
  coupon.hidden = false;
  coupon.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = coupon.coupon.value.trim().toUpperCase();
    const msg = $('[data-coupon-msg]');
    const ok = !!CONFIG.cupones[code];
    state.coupon = ok ? code : null;
    msg.className = `coupon__msg ${ok ? 'is-ok' : 'is-err'}`;
    msg.textContent = ok ? 'Código aplicado' : 'Este código no es válido';
    renderSummary();
  });
}

/* ---------- guardar progreso ---------- */
function save() {
  const data = Object.fromEntries([...new FormData(form)].filter(([k]) => !['terms', 'envio', 'pago'].includes(k)));
  try { sessionStorage.setItem(SAVE_KEY, JSON.stringify({ data, ship: state.ship })); } catch { /* sin almacenamiento */ }
}
function restore() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(SAVE_KEY));
    if (!saved) return;
    Object.entries(saved.data || {}).forEach(([k, v]) => {
      const el = form.elements[k];
      if (!el || el instanceof RadioNodeList) return;
      if (el.type === 'checkbox') el.checked = v === 'on'; else el.value = v;
    });
    if (cp.value.length === 5) state.zone = zoneFor(cp.value);
    state.ship = saved.ship;
  } catch { /* nada guardado */ }
}

/* ---------- confirmar pedido ---------- */
form.addEventListener('submit', (e) => {
  e.preventDefault();
  // Intro dentro de un campo: avanzar de paso en vez de confirmar el pedido
  if (state.step < 3) { $(`[data-next="${state.step}"]`).click(); return; }
  const terms = $('[data-terms]');
  const termsErr = $('[data-terms-err]');
  if (!terms.checked) {
    $('[data-terms-wrap]').classList.add('is-invalid');
    termsErr.textContent = 'Necesitamos que aceptes las condiciones para continuar';
    terms.focus();
    return;
  }
  const btn = $('[data-place-order]');
  btn.classList.add('is-loading');
  const f = form.elements;
  const m = methods().find((x) => x.id === state.ship);
  const t = totals();
  const now = new Date();
  const order = {
    id: `RV-${now.getFullYear().toString().slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    date: now.toISOString(),
    test: true,
    items: store.getCart().map((it) => ({ id: it.id, name: it.product.name, size: it.size, qty: it.qty, price: it.product.price })),
    customer: { email: f.email.value.trim(), nombre: f.nombre.value.trim(), apellidos: f.apellidos.value.trim(), telefono: f.telefono.value.trim() },
    address: { direccion: f.direccion.value.trim(), direccion2: f.direccion2.value.trim(), cp: f.cp.value, ciudad: f.ciudad.value.trim(), provincia: f.provincia.value, zona: CONFIG.zonas[state.zone].nombre },
    shipping: { metodo: m.nombre, precio: t.ship, llegada: eta(m.dias) },
    payment: CONFIG.pagos.find((x) => x.id === state.pay)?.nombre,
    totals: t,
  };
  setTimeout(() => {
    placed = true;
    store.saveOrder(order);
    store.clearCart();
    try { sessionStorage.removeItem(SAVE_KEY); } catch { /* sin almacenamiento */ }
    showDone(order);
  }, reduced() ? 0 : 900);
});

function showDone(o) {
  $('[data-co-main]').hidden = true;
  const box = $('[data-co-done]');
  box.hidden = false;
  box.innerHTML = `
    <svg class="done__check" viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="44" pathLength="1"/><path d="M28 47.5 40.5 60 64 34" pathLength="1"/></svg>
    <p class="done__num">Pedido <b>${o.id}</b></p>
    <h1 class="display">¡Gracias, <em>${esc(o.customer.nombre)}</em>!</h1>
    <p class="lead">Hemos registrado tu pedido. Te enviaremos la confirmación y el seguimiento a <b>${esc(o.customer.email)}</b>.</p>
    <p class="demo-note">Pedido de prueba: la pasarela de pago aún no está conectada y no se ha realizado ningún cobro.</p>
    <div class="done__grid">
      <div class="done__card"><h3>Tu pedido</h3>
        <ul class="co-sum__items">${o.items.map((it) => `<li class="co-item"><span class="co-item__img"><img src="${srcP(it.id, 0)}" alt="" width="480" height="600"><b>${it.qty}</b></span>
          <span class="co-item__name"><b>${esc(it.name)}</b><span>Talla ${it.size}</span></span><span class="co-item__price">${fmt(it.price * it.qty)}</span></li>`).join('')}</ul>
        <dl class="totals">
          <div><dt>Subtotal</dt><dd>${fmt(o.totals.sub)}</dd></div>
          <div class="${o.totals.ship ? '' : 'is-free'}"><dt>Envío</dt><dd>${o.totals.ship ? fmt(o.totals.ship) : 'Gratis'}</dd></div>
          <div class="totals__total"><dt>Total</dt><dd>${fmt(o.totals.total)}</dd></div>
        </dl>
      </div>
      <div class="done__card"><h3>Entrega</h3>
        <p>${esc(o.customer.nombre)} ${esc(o.customer.apellidos)}<br>${esc(o.address.direccion)}${o.address.direccion2 ? `, ${esc(o.address.direccion2)}` : ''}<br>${esc(o.address.cp)} ${esc(o.address.ciudad)} (${esc(o.address.provincia)})<br>${esc(o.customer.telefono)}</p>
        <h3>Método</h3><p>${esc(o.shipping.metodo)} · Llegada estimada: <b>${o.shipping.llegada}</b></p>
        <h3>Pago</h3><p>${esc(o.payment || '')} (pendiente de pasarela)</p>
      </div>
    </div>
    <div class="done__btns">
      <a class="btn btn--dark" href="tienda.html"><span>Seguir comprando</span>${icon('arrow')}</a>
      <a class="link-u" href="ayuda.html#pedidos">Ver mis pedidos</a>
    </div>`;
  scrollTo({ top: 0, behavior: 'auto' });
  toast({ title: 'Pedido registrado', text: o.id, iconName: 'check' });
}

/* ---------- resumen plegable en móvil ---------- */
const sum = $('[data-co-summary]');
$('[data-sum-toggle]').addEventListener('click', (e) => {
  const open = sum.classList.toggle('is-open');
  e.currentTarget.setAttribute('aria-expanded', open);
  $('[data-sum-toggle-label]').textContent = open ? 'Ocultar resumen del pedido' : 'Ver resumen del pedido';
});

/* ---------- arranque ---------- */
function init() {
  if (placed) return;
  if (!store.cartCount()) {
    if ($('[data-co-done]').hidden) { $('[data-co-main]').hidden = true; $('[data-co-empty]').hidden = false; }
    return;
  }
  $('[data-co-main]').hidden = false;
  $('[data-co-empty]').hidden = true;
  renderSummary();
}
$('[data-provinces]').insertAdjacentHTML('beforeend', PROVINCIAS.filter(Boolean).slice().sort((a, b) => a.localeCompare(b, 'es')).map((p) => `<option>${p}</option>`).join(''));
restore();
setZone(state.zone);
renderMethods();
$('[data-terms]').addEventListener('change', (e) => { if (e.target.checked) { $('[data-terms-wrap]').classList.remove('is-invalid'); $('[data-terms-err]').textContent = ''; } });
init();
store.subscribe((type) => { if (type.startsWith('cart') && $('[data-co-done]').hidden) { init(); renderMethods(); resume(); } });
document.documentElement.classList.add('is-ready', 'intro-done');
