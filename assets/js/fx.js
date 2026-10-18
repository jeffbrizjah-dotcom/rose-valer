/* ==========================================================================
   Efectos: apariciones al hacer scroll, texto dividido, parallax, cinta con
   inercia, texto que se ilumina, botones magnéticos e indicador de pestañas.
   Un único bucle requestAnimationFrame que solo trabaja con lo visible.
   ========================================================================== */
import { $$, reduced, finePointer } from './ui.js';

/* ---------- bucle único ---------- */
const jobs = new Set();
let raf = 0;
let last = performance.now();
const loop = (now) => {
  const dt = Math.min(64, now - last);
  last = now;
  jobs.forEach((fn) => fn(dt));
  raf = jobs.size ? requestAnimationFrame(loop) : 0;
};
export function addJob(fn) {
  jobs.add(fn);
  if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); }
  return () => jobs.delete(fn);
}

/* Velocidad de scroll compartida (px por fotograma, suavizada) */
export const scroll = { y: scrollY, v: 0, dir: 1 };
let prevY = scrollY;
addEventListener('scroll', () => {
  scroll.y = scrollY;
  const d = scrollY - prevY;
  prevY = scrollY;
  scroll.v = scroll.v * .6 + d * .4;
  if (d) scroll.dir = Math.sign(d);
}, { passive: true });

/* Activa una tarea solo mientras su elemento está en pantalla */
function whileVisible(el, fn, margin = '10% 0px') {
  let stop = null;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !stop) stop = addJob(fn);
    else if (!e.isIntersecting && stop) { stop(); stop = null; }
  }, { rootMargin: margin }).observe(el);
}

/* ---------- apariciones ---------- */
const revealIO = 'IntersectionObserver' in window ? new IntersectionObserver((entries) => {
  let n = 0;
  entries.forEach((e) => {
    if (!e.isIntersecting) return;
    const el = e.target;
    if (!el.style.getPropertyValue('--d') && !el.hasAttribute('data-split')) el.style.setProperty('--d', `${(n++ % 6) * 0.08}s`);
    el.classList.add('is-in');
    revealIO.unobserve(el);
  });
}, { rootMargin: '0px 0px -8% 0px', threshold: 0 }) : null;

export function reveal(root = document) {
  $$('[data-reveal]:not(.is-in), [data-split]:not(.is-in)', root).forEach((el) => {
    if (reduced() || !revealIO) el.classList.add('is-in');
    else revealIO.observe(el);
  });
}

/* ---------- texto dividido en palabras ---------- */
function wrapWords(node, counter, cls = 'w') {
  [...node.childNodes].forEach((child) => {
    if (child.nodeType === 3) {
      const parts = child.textContent.split(/(\s+)/);
      const frag = document.createDocumentFragment();
      parts.forEach((part) => {
        if (!part) return;
        if (/^\s+$/.test(part)) { frag.append(document.createTextNode(part)); return; }
        const w = document.createElement('span');
        w.className = cls;
        w.style.setProperty('--wi', counter.i++);
        if (cls === 'w' && counter.inner !== false) {
          const inner = document.createElement('span');
          inner.textContent = part;
          w.append(inner);
        } else w.textContent = part;
        frag.append(w);
      });
      child.replaceWith(frag);
    } else if (child.nodeType === 1 && child.tagName !== 'BR' && child.tagName !== 'svg') {
      wrapWords(child, counter, cls);
    }
  });
}
export function split(root = document) {
  $$('[data-split]:not([data-split-done])', root).forEach((el) => {
    el.setAttribute('data-split-done', '');
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    wrapWords(el, { i: 0 });
    [...el.children].forEach((c) => c.setAttribute('aria-hidden', 'true'));
  });
}

/* ---------- botones magnéticos ---------- */
function magnetic(root = document) {
  if (!finePointer.matches || reduced()) return;
  $$('[data-magnetic]', root).forEach((el) => {
    let r;
    el.addEventListener('pointerenter', () => { r = el.getBoundingClientRect(); el.style.transition = 'translate .25s cubic-bezier(.16,1,.3,1)'; });
    el.addEventListener('pointermove', (e) => {
      if (!r) return;
      const x = (e.clientX - (r.left + r.width / 2)) * .22;
      const y = (e.clientY - (r.top + r.height / 2)) * .32;
      el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    el.addEventListener('pointerleave', () => { el.style.transition = 'translate .7s cubic-bezier(.16,1,.3,1)'; el.style.translate = ''; r = null; });
  });
}

/* ---------- parallax ---------- */
function parallax(root = document) {
  if (reduced()) return;
  $$('[data-parallax]', root).forEach((el) => {
    const speed = parseFloat(el.dataset.parallax) || .1;
    let cur = 0;
    whileVisible(el, () => {
      const r = el.parentElement.getBoundingClientRect();
      const target = (r.top + r.height / 2 - innerHeight / 2) * -speed;
      cur += (target - cur) * .14;
      if (Math.abs(target - cur) > .05) el.style.translate = `0 ${cur.toFixed(2)}px`;
    }, '20% 0px');
  });
}

/* ---------- cinta infinita con inercia ---------- */
function marquee(root = document) {
  $$('[data-marquee]', root).forEach((wrap) => {
    const track = wrap.querySelector('[data-marquee-track]');
    const group = track.firstElementChild;
    const fill = () => {
      const need = Math.ceil((innerWidth * 2) / group.offsetWidth) + 1;
      while (track.children.length < need) {
        const c = group.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        track.append(c);
      }
    };
    fill();
    addEventListener('resize', fill, { passive: true });
    if (reduced()) return;
    let x = 0;
    let speed = 0;
    whileVisible(wrap, (dt) => {
      const w = group.offsetWidth;
      const boost = Math.min(Math.abs(scroll.v) * .9, 28);
      speed += ((0.55 + boost) * scroll.dir - speed) * .08;
      x -= speed * (dt / 16.67);
      if (x <= -w) x += w;
      if (x > 0) x -= w;
      track.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    });
  });
}

/* ---------- texto que se ilumina al hacer scroll ---------- */
function scrub(root = document) {
  $$('[data-scrub]', root).forEach((el) => {
    wrapWords(el, { i: 0, inner: false }, 'w');
    const words = $$('.w', el);
    if (reduced()) { words.forEach((w) => w.classList.add('is-on')); return; }
    let lit = -1;
    whileVisible(el, () => {
      const r = el.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (innerHeight * .82 - r.top) / (r.height + innerHeight * .3)));
      const n = Math.round(p * words.length);
      if (n === lit) return;
      words.forEach((w, i) => w.classList.toggle('is-on', i < n));
      lit = n;
    }, '0px');
  });
}

/* ---------- distintivo giratorio que acelera con el scroll ---------- */
function spin(root = document) {
  $$('[data-spin]', root).forEach((el) => {
    const anim = el.querySelector('.badge-spin__text')?.getAnimations?.()[0];
    if (!anim || reduced()) return;
    let rate = 1;
    whileVisible(el, () => {
      const target = 1 + Math.min(Math.abs(scroll.v) * .35, 9);
      rate += (target - rate) * .08;
      anim.playbackRate = rate * (scroll.dir < 0 ? -1 : 1);
    });
  });
}

/* ---------- indicador deslizante de pestañas ---------- */
export function tabsInk(tabs) {
  const ink = tabs.querySelector('.tab__ink');
  if (!ink) return () => {};
  const move = () => {
    const a = tabs.querySelector('.tab.is-active');
    if (!a) return;
    ink.style.setProperty('--w', `${a.offsetWidth}px`);
    ink.style.setProperty('--x', `${a.offsetLeft}px`);
  };
  move();
  addEventListener('resize', move, { passive: true });
  document.fonts?.ready.then(move);
  return move;
}

/* ---------- arranque ---------- */
export function initFX(root = document) {
  split(root);
  reveal(root);
  magnetic(root);
  parallax(root);
  marquee(root);
  scrub(root);
  spin(root);
}
