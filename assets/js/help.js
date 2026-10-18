/* ==========================================================================
   Ayuda: pestañas por #enlace (envíos, devoluciones, tallas, FAQ, pedidos,
   contacto, legal), tabla de envíos desde la configuración y pedidos guardados.
   ========================================================================== */
import { CONFIG, byId } from './data.js';
import { $, $$, reduced, fmt, esc, icon, srcP, isEmail, toast, initUI } from './ui.js';
import { initFX } from './fx.js';
import { runIntro } from './intro.js';
import * as store from './store.js';

initUI();

/* ---------- pestañas ---------- */
const tabs = $$('[data-help-tab]');
const panels = $$('[data-help-panel]');
function show(id, focus = false) {
  if (!panels.some((p) => p.dataset.helpPanel === id)) id = 'envios';
  panels.forEach((p) => { p.hidden = p.dataset.helpPanel !== id; });
  tabs.forEach((t) => t.setAttribute('aria-current', t.dataset.helpTab === id));
  const active = tabs.find((t) => t.dataset.helpTab === id);
  active?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced() ? 'auto' : 'smooth' });
  if (focus) $(`[data-help-panel="${id}"] h2`)?.focus({ preventScroll: true });
}
$$('[data-help-panel] h2').forEach((h) => h.setAttribute('tabindex', '-1'));
$('[data-help-nav]').addEventListener('click', (e) => {
  const t = e.target.closest('[data-help-tab]');
  if (!t) return;
  e.preventDefault();
  history.replaceState(null, '', `#${t.dataset.helpTab}`);
  show(t.dataset.helpTab, true);
  const top = $('.help__grid').getBoundingClientRect().top + scrollY - 90;
  if (scrollY > top) scrollTo({ top, behavior: reduced() ? 'auto' : 'smooth' });
});
// enlaces internos dentro de los textos (p. ej. "ver Contacto")
document.addEventListener('click', (e) => {
  const a = e.target.closest('.help-panels a[href^="#"]');
  if (!a) return;
  e.preventDefault();
  history.replaceState(null, '', a.getAttribute('href'));
  show(a.getAttribute('href').slice(1), true);
});
addEventListener('hashchange', () => show(location.hash.slice(1), true));
show(location.hash.slice(1));

/* ---------- tabla de envíos ---------- */
$('[data-ship-table]').insertAdjacentHTML('beforeend', `
  <thead><tr><th scope="col">Método</th><th scope="col">Plazo</th><th scope="col">Precio</th></tr></thead>
  <tbody>${Object.values(CONFIG.zonas).map((z) => `
    <tr class="zone"><td colspan="3">${z.nombre}</td></tr>
    ${z.metodos.map((m) => `<tr><td>${m.nombre}</td><td>${m.detalle}</td><td>${fmt(m.precio)}${m.gratisDesde ? ` · gratis desde ${fmt(m.gratisDesde)}` : ''}</td></tr>`).join('')}`).join('')}
  </tbody>`);
$('[data-return-days]').textContent = CONFIG.devolucionDias;

/* ---------- mis pedidos ---------- */
const fmtDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const orders = store.getOrders();
$('[data-orders]').innerHTML = orders.length
  ? orders.map((o) => `<article class="order">
      <div class="order__head"><div><b>${esc(o.id)}</b><br><span>${fmtDate.format(new Date(o.date))}</span></div><span class="order__status">${o.test ? 'Pedido de prueba' : 'Recibido'}</span></div>
      <div class="order__thumbs">${o.items.map((it) => (byId(it.id) ? `<img src="${srcP(it.id, 0)}" alt="${esc(it.name)}, talla ${it.size}" width="52" height="65" loading="lazy">` : '')).join('')}</div>
      <div class="order__foot"><span>${((n) => `${n} ${n === 1 ? 'prenda' : 'prendas'}`)(o.items.reduce((n, it) => n + it.qty, 0))} · ${esc(o.shipping.metodo)} · Llegada ${o.shipping.llegada}</span><b>${fmt(o.totals.total)}</b></div>
    </article>`).join('')
  : `<div class="empty"><svg viewBox="9 9.2 416.6 434.6" class="empty__mono" aria-hidden="true"><use href="#rv-mono"/></svg>
      <p>Aún no has hecho ningún pedido desde este dispositivo.</p>
      <a class="btn btn--dark" href="tienda.html"><span>Ir a la tienda</span>${icon('arrow')}</a></div>`;

/* ---------- contacto ---------- */
const c = CONFIG.contacto;
const channels = [
  c.whatsapp && `<a class="chip" href="https://wa.me/${c.whatsapp.replace(/\D/g, '')}" target="_blank" rel="noopener">${icon('chat')} WhatsApp</a>`,
  c.email && `<a class="chip" href="mailto:${c.email}">${icon('chat')} ${esc(c.email)}</a>`,
  c.telefono && `<a class="chip" href="tel:${c.telefono.replace(/\s/g, '')}">${icon('chat')} ${esc(c.telefono)}</a>`,
].filter(Boolean);
$('[data-channels]').innerHTML = channels.join('');

const form = $('[data-contact-form]');
const RULES = {
  nombre: (v) => (v.trim().length < 2 ? 'Escribe tu nombre' : ''),
  email: (v) => (!isEmail(v) ? 'Escribe un correo válido' : ''),
  motivo: (v) => (!v ? 'Elige un motivo' : ''),
  mensaje: (v) => (v.trim().length < 10 ? 'Cuéntanos un poco más (mínimo 10 caracteres)' : ''),
};
const check = (name) => {
  const el = form.elements[name];
  const msg = RULES[name](el.value);
  const field = el.closest('.field');
  field.classList.toggle('is-invalid', !!msg);
  field.querySelector('.field__err').textContent = msg;
  el.setAttribute('aria-invalid', !!msg);
  return !msg;
};
Object.keys(RULES).forEach((n) => form.elements[n].addEventListener('blur', () => form.elements[n].value && check(n)));
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const bad = Object.keys(RULES).filter((n) => !check(n));
  if (bad.length) { form.elements[bad[0]].focus(); return; }
  const f = form.elements;
  if (c.email) {
    const body = `${f.mensaje.value}\n\n— ${f.nombre.value} (${f.email.value})${f.pedido.value ? `\nPedido: ${f.pedido.value}` : ''}`;
    location.href = `mailto:${c.email}?subject=${encodeURIComponent(`[Web] ${f.motivo.value}`)}&body=${encodeURIComponent(body)}`;
    return;
  }
  toast({ title: 'Formulario listo', text: 'Falta conectar el correo de la tienda para recibir los mensajes.', iconName: 'chat', timeout: 6000 });
});

initFX();
runIntro().then(() => document.documentElement.classList.add('is-ready'));
