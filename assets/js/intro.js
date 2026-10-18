/* ==========================================================================
   Intro (preloader) — solo la primera visita de cada sesión.
   1) El monograma RV se "llena" de abajo arriba con el progreso REAL de carga
      (fuentes + imagen principal), con contador y barra.
   2) Se abre una ventana en el centro que pasa fotos de la colección como un
      flipbook.
   3) La ventana crece hasta ocupar exactamente el hueco de la foto del hero
      y la intro se desvanece: la última foto ES la del hero (transición sin cortes).
   ========================================================================== */
import { html, reduced } from './ui.js';

const FLIP = ['hero-2-0', 'col-main-0', 'jersey-trenzado-crema-0', 'abrigo-camel-0', 'vestido-saten-moka-0'];
const MIN_MS = 1400;  // duración mínima para que la animación respire
const MAX_MS = 6000;  // nunca bloquear más de esto aunque algo tarde en cargar

const imgReady = (img) => new Promise((res) => {
  if (img.complete && img.naturalWidth) return res();
  img.addEventListener('load', res, { once: true });
  img.addEventListener('error', res, { once: true });
}).then(() => img.decode?.().catch(() => {}));

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const done = (el) => {
  html.classList.add('intro-done');
  try { sessionStorage.setItem('rv:intro', '1'); } catch { /* sin almacenamiento */ }
  el?.remove();
};

export async function runIntro() {
  const el = document.getElementById('intro');
  if (!el || html.classList.contains('no-intro')) { done(el); return false; }
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  scrollTo(0, 0);

  const count = el.querySelector('[data-intro-count]');
  const stage = el.querySelector('.intro__stage');
  const meta = el.querySelector('.intro__meta');
  const frame = el.querySelector('.intro__frame');
  const hero = document.querySelector('[data-intro-target]');

  const flips = reduced() ? [] : FLIP.map((n) => { const i = new Image(); i.alt = ''; i.decoding = 'async'; i.src = `assets/img/${n}.webp`; return i; });
  const tasks = [document.fonts?.ready || Promise.resolve(), ...(hero ? [imgReady(hero)] : []), ...flips.map(imgReady)];
  let loaded = 0;
  tasks.forEach((t) => t.then(() => { loaded++; }));

  // 1) progreso
  await new Promise((resolve) => {
    const t0 = performance.now();
    let shown = 0;
    const tick = (now) => {
      const elapsed = now - t0;
      const real = loaded / tasks.length;
      let goal = Math.min(real, elapsed / (reduced() ? 250 : MIN_MS));
      if (elapsed > MAX_MS) goal = 1;
      shown += (goal - shown) * .09;
      if (goal === 1 && 1 - shown < .004) shown = 1;
      count.textContent = Math.round(shown * 100);
      el.style.setProperty('--p', `${(shown * 100).toFixed(2)}%`);
      el.style.setProperty('--p01', shown.toFixed(4));
      if (shown < 1) requestAnimationFrame(tick); else resolve();
    };
    requestAnimationFrame(tick);
  });

  if (reduced()) {
    html.classList.add('is-ready');
    el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250, fill: 'forwards' }).finished.then(() => done(el));
    return true;
  }

  // 2) flipbook en la ventana central
  stage.style.opacity = '0';
  stage.style.transform = 'translateY(-24px) scale(.96)';
  meta.style.opacity = '0';
  const finalImg = new Image();
  finalImg.alt = '';
  finalImg.src = hero ? (hero.currentSrc || hero.src) : flips[0].src;
  frame.append(...flips, finalImg);
  await wait(180);
  frame.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }], { duration: 650, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' });
  for (const img of flips) {
    frame.querySelectorAll('img.is-on').forEach((i) => i.classList.remove('is-on'));
    img.classList.add('is-on');
    await wait(150);
  }
  frame.querySelectorAll('img.is-on').forEach((i) => i.classList.remove('is-on'));
  finalImg.classList.add('is-on');
  await wait(120);

  // 3) la ventana crece hasta el hueco del hero
  const from = frame.getBoundingClientRect();
  const targetEl = document.querySelector('.hero__slides');
  const to = targetEl ? targetEl.getBoundingClientRect() : { left: 0, top: 0, width: innerWidth, height: innerHeight };
  const radius = targetEl ? getComputedStyle(targetEl).borderRadius : '0px';
  Object.assign(frame.style, { translate: 'none', left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, aspectRatio: 'auto', clipPath: 'none' });
  frame.getAnimations().forEach((a) => a.cancel());
  setTimeout(() => el.classList.add('is-fading'), 260);
  setTimeout(() => html.classList.add('is-ready'), 520);
  await frame.animate([
    { left: `${from.left}px`, top: `${from.top}px`, width: `${from.width}px`, height: `${from.height}px`, borderRadius: '4px' },
    { left: `${to.left}px`, top: `${to.top}px`, width: `${to.width}px`, height: `${to.height}px`, borderRadius: radius },
  ], { duration: 1050, easing: 'cubic-bezier(.76,0,.24,1)', fill: 'forwards' }).finished;

  if (!targetEl) await el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease', fill: 'forwards' }).finished;
  done(el);
  return true;
}
