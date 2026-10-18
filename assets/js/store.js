/* ==========================================================================
   Estado de la tienda: cesta, favoritos, vistos recientemente y pedidos.
   Se guarda en localStorage y se sincroniza entre pestañas.
   ========================================================================== */
import { CONFIG, byId } from './data.js';

const KEYS = { cart: 'rv:cart', favs: 'rv:favs', recent: 'rv:recent', orders: 'rv:orders' };
const listeners = new Set();

const read = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* modo privado o sin espacio */ }
};

let cart = sanitize(read(KEYS.cart, []));
let favs = read(KEYS.favs, []).filter(byId);

// Descarta líneas de productos/tallas que ya no existen y ajusta al stock disponible
function sanitize(items) {
  return items.flatMap((it) => {
    const p = byId(it.id);
    const stock = p?.sizes[it.size];
    if (!stock) return [];
    return [{ id: it.id, size: it.size, qty: Math.max(1, Math.min(it.qty | 0, stock)) }];
  });
}

const emit = (type, detail) => listeners.forEach((fn) => fn(type, detail));
const saveCart = (type, detail) => { write(KEYS.cart, cart); emit(type, detail); };

export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));

/* ---------- cesta ---------- */
export const lineKey = (id, size) => `${id}|${size}`;
export const getCart = () => cart.map((it) => ({ ...it, key: lineKey(it.id, it.size), product: byId(it.id) }));
export const cartCount = () => cart.reduce((n, it) => n + it.qty, 0);
export const subtotal = () => cart.reduce((s, it) => s + byId(it.id).price * it.qty, 0);

/** Añade unidades respetando el stock. Devuelve las unidades realmente añadidas. */
export function addToCart(id, size, qty = 1) {
  const p = byId(id);
  const stock = p?.sizes[size] ?? 0;
  const line = cart.find((it) => it.id === id && it.size === size);
  const current = line?.qty ?? 0;
  const added = Math.max(0, Math.min(qty, stock - current));
  if (!added) return 0;
  if (line) line.qty += added; else cart.push({ id, size, qty: added });
  saveCart('cart:add', { id, size, qty: added });
  return added;
}

export function setQty(key, qty) {
  const line = cart.find((it) => lineKey(it.id, it.size) === key);
  if (!line) return;
  if (qty <= 0) return removeLine(key);
  line.qty = Math.min(qty, byId(line.id).sizes[line.size]);
  saveCart('cart:update', { key });
}

export function removeLine(key) {
  const i = cart.findIndex((it) => lineKey(it.id, it.size) === key);
  if (i < 0) return null;
  const [removed] = cart.splice(i, 1);
  saveCart('cart:remove', { ...removed, index: i });
  return { ...removed, index: i };
}

/** Deshacer un borrado devolviendo la línea a su posición */
export function restoreLine({ id, size, qty, index }) {
  if (cart.some((it) => it.id === id && it.size === size)) return;
  cart.splice(Math.min(index, cart.length), 0, { id, size, qty });
  saveCart('cart:update', {});
}

export function clearCart() { cart = []; saveCart('cart:clear'); }

export const maxQty = (key) => {
  const line = cart.find((it) => lineKey(it.id, it.size) === key);
  return line ? byId(line.id).sizes[line.size] : 0;
};

/* ---------- envío ---------- */
export const freeShippingLeft = (amount = subtotal()) => Math.max(0, CONFIG.envioGratisDesde - amount);

/* ---------- favoritos ---------- */
export const getFavs = () => favs.map(byId).filter(Boolean);
export const isFav = (id) => favs.includes(id);
export function toggleFav(id) {
  favs = isFav(id) ? favs.filter((f) => f !== id) : [id, ...favs];
  write(KEYS.favs, favs);
  emit('favs', { id, active: isFav(id) });
  return isFav(id);
}

/* ---------- vistos recientemente ---------- */
export const getRecent = (exclude) => read(KEYS.recent, []).filter((id) => id !== exclude).map(byId).filter(Boolean);
export function pushRecent(id) {
  write(KEYS.recent, [id, ...read(KEYS.recent, []).filter((r) => r !== id)].slice(0, 8));
}

/* ---------- pedidos (simulados hasta conectar la pasarela) ---------- */
export const getOrders = () => read(KEYS.orders, []);
export function saveOrder(order) {
  write(KEYS.orders, [order, ...getOrders()].slice(0, 30));
}

/* ---------- sincronización entre pestañas ---------- */
window.addEventListener('storage', (e) => {
  if (e.key === KEYS.cart) { cart = sanitize(read(KEYS.cart, [])); emit('cart:sync'); }
  if (e.key === KEYS.favs) { favs = read(KEYS.favs, []).filter(byId); emit('favs'); }
});
