/* ==========================================================================
   Página de inicio: hero con carrusel y puntos "compra el look", categorías
   con imagen que sigue al cursor, novedades con pestañas y lookbook horizontal.
   ========================================================================== */
import { CATEGORIES, PRODUCTS, LOOKS, byId } from './data.js';
import { $, $$, html, reduced, finePointer, fmt, esc, icon, cardHTML, srcP, srcsetE, initUI } from './ui.js';
import { initFX, reveal, tabsInk, addJob } from './fx.js';
import { runIntro } from './intro.js';

/* ---------- carrusel del hero ---------- */
function initSlider() {
  const root = $('[data-slider]');
  if (!root) return { start() {} };
  const slides = $$('[data-slide]', root);
  const bars = $('[data-slide-bars]', root);
  const caption = $('[data-slide-caption]', root);
  const current = $('[data-slide-current]', root);
  const DUR = 6500;
  let i = 0, timer = 0, started = 0, remaining = DUR, paused = false, running = false, visible = true;

  bars.innerHTML = slides.map((_, n) => `<button type="button" aria-label="Ver look ${n + 1}"><i></i></button>`).join('');
  const barBtns = [...bars.children];
  root.style.setProperty('--dur', `${DUR}ms`);

  const paintBars = () => barBtns.forEach((b, n) => {
    b.classList.toggle('is-done', n < i);
    b.classList.remove('is-active');
    if (n === i) { void b.offsetWidth; b.classList.add('is-active'); }
    b.setAttribute('aria-current', n === i);
  });

  const go = (n, dir = n > i ? 'next' : 'prev') => {
    n = (n + slides.length) % slides.length;
    if (n === i) return;
    root.dataset.dir = dir;
    const prev = slides[i];
    slides.forEach((s) => s.classList.remove('is-prev'));
    prev.classList.remove('is-active');
    prev.classList.add('is-prev');
    slides[n].classList.add('is-active');
    setTimeout(() => prev.classList.remove('is-prev'), 1250);
    i = n;
    current.textContent = String(i + 1).padStart(2, '0');
    caption.classList.add('is-swap');
    setTimeout(() => { caption.textContent = slides[i].dataset.caption; caption.classList.remove('is-swap'); }, 350);
    paintBars();
    schedule(DUR);
  };

  function schedule(ms) {
    clearTimeout(timer);
    remaining = ms;
    if (!running || paused || !visible || reduced()) return;
    started = performance.now();
    timer = setTimeout(() => go(i + 1, 'next'), ms);
  }
  const pause = () => {
    if (paused) return;
    paused = true;
    clearTimeout(timer);
    remaining = Math.max(0, remaining - (performance.now() - started));
    root.classList.add('is-paused');
  };
  const resume = () => {
    if (!paused) return;
    paused = false;
    root.classList.remove('is-paused');
    schedule(remaining);
  };

  $('[data-slide-next]', root).addEventListener('click', () => go(i + 1, 'next'));
  $('[data-slide-prev]', root).addEventListener('click', () => go(i - 1, 'prev'));
  barBtns.forEach((b, n) => b.addEventListener('click', () => go(n)));
  root.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') pause(); });
  root.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') resume(); });
  root.addEventListener('focusin', pause);
  root.addEventListener('focusout', (e) => { if (!root.contains(e.relatedTarget)) resume(); });
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(i + 1, 'next');
    if (e.key === 'ArrowLeft') go(i - 1, 'prev');
  });

  // deslizar con el dedo
  let x0 = null, y0 = 0;
  root.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
  root.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) go(i + (dx < 0 ? 1 : -1), dx < 0 ? 'next' : 'prev');
  });

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible) schedule(remaining); else clearTimeout(timer);
    root.classList.toggle('is-paused', !visible || paused);
  }).observe(root);
  document.addEventListener('visibilitychange', () => (document.hidden ? pause() : resume()));

  // tarjetas de los puntos "compra el look"
  $$('.hotspot[data-quick]', root).forEach((h) => {
    const p = byId(h.dataset.quick);
    if (!p) return h.remove();
    if (parseFloat(h.style.getPropertyValue('--x')) > 55) h.classList.add('is-left');
    h.insertAdjacentHTML('beforeend', `<span class="hotspot__card" aria-hidden="true"><b>${esc(p.name)}</b><span>${fmt(p.price)} <u>Ver prenda</u></span></span>`);
  });

  return {
    start() { running = true; paintBars(); schedule(DUR); },
  };
}

/* ---------- categorías ---------- */
function initCategories() {
  const list = $('[data-cats]');
  if (!list) return;
  list.innerHTML = CATEGORIES.map((c, n) => {
    const count = PRODUCTS.filter((p) => p.cat === c.id).length;
    return `<li class="cat-row" data-reveal style="--d:${(n * .05).toFixed(2)}s"><a href="tienda.html?cat=${c.id}" data-img="${srcP(c.img, 1)}">
      <span class="cat-row__idx">${String(n + 1).padStart(2, '0')}</span>
      <span class="cat-row__img"><img src="${srcP(c.img, 0)}" srcset="${srcP(c.img, 0)} 480w, ${srcP(c.img, 1)} 800w" sizes="(min-width: 768px) 28vw, 44vw" width="480" height="600" alt="" loading="lazy" decoding="async"></span>
      <span class="cat-row__name">${c.name}</span>
      <span class="cat-row__count">${count} ${count === 1 ? 'prenda' : 'prendas'}</span>
      <span class="cat-row__arrow">${icon('arrow')}</span>
    </a></li>`;
  }).join('');

  // imagen que sigue al cursor (escritorio con ratón)
  const follower = $('[data-cats-follower]');
  const inner = follower?.firstElementChild;
  const desktop = matchMedia('(min-width: 1024px)');
  if (!follower || !finePointer.matches || reduced()) return;
  const imgs = new Map();
  let tx = 0, ty = 0, x = 0, y = 0, stop = null;
  const move = () => {
    x += (tx - x) * .14;
    y += (ty - y) * .14;
    const tilt = Math.max(-8, Math.min(8, (tx - x) * .04));
    follower.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
  };
  list.addEventListener('pointermove', (e) => {
    if (!desktop.matches) return;
    tx = e.clientX + 28;
    ty = e.clientY - follower.offsetHeight / 2;
  });
  list.addEventListener('pointerenter', (e) => {
    if (!desktop.matches) return;
    x = tx = e.clientX + 28;
    y = ty = e.clientY - follower.offsetHeight / 2;
    follower.classList.add('is-on');
    stop = stop || addJob(move);
  });
  list.addEventListener('pointerleave', () => {
    follower.classList.remove('is-on');
    setTimeout(() => { if (!follower.classList.contains('is-on') && stop) { stop(); stop = null; } }, 500);
  });
  list.addEventListener('pointerover', (e) => {
    const a = e.target.closest('a[data-img]');
    if (!a || !desktop.matches) return;
    let img = imgs.get(a.dataset.img);
    if (!img) {
      img = new Image();
      img.src = a.dataset.img;
      img.alt = '';
      img.decoding = 'async';
      inner.append(img);
      imgs.set(a.dataset.img, img);
    }
    inner.append(img); // la última queda encima y se revela desde abajo
    inner.querySelectorAll('img.is-on').forEach((i) => { if (i !== img) setTimeout(() => i.classList.remove('is-on'), 700); });
    requestAnimationFrame(() => img.classList.add('is-on'));
  });
}

/* ---------- novedades con pestañas ---------- */
function initNews() {
  const grid = $('[data-news-grid]');
  const tabs = $('[data-news-tabs]');
  if (!grid) return;
  const byDate = [...PRODUCTS].sort((a, b) => b.added.localeCompare(a.added));
  const pick = (tab) => (tab === 'all' ? byDate : byDate.filter((p) => p.cat === tab)).slice(0, 8);
  const draw = (list, animate) => {
    grid.innerHTML = list.map((p) => cardHTML(p)).join('');
    if (!animate) return;
    [...grid.children].forEach((el, n) => {
      el.classList.add('is-entering');
      setTimeout(() => el.classList.remove('is-entering'), 40 + n * 55);
    });
  };
  draw(pick('all'));
  const moveInk = tabsInk(tabs);
  let busy = false;
  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab || tab.classList.contains('is-active') || busy) return;
    $$('[data-tab]', tabs).forEach((t) => { const on = t === tab; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
    moveInk();
    tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced() ? 'auto' : 'smooth' });
    if (reduced()) return draw(pick(tab.dataset.tab));
    busy = true;
    grid.style.minHeight = `${grid.offsetHeight}px`;
    [...grid.children].forEach((el) => el.classList.add('is-leaving'));
    setTimeout(() => {
      draw(pick(tab.dataset.tab), true);
      requestAnimationFrame(() => { grid.style.minHeight = ''; });
      busy = false;
    }, 320);
  });
}

/* ---------- lookbook horizontal ---------- */
function initLookbook() {
  const section = $('[data-lookbook]');
  const track = $('[data-look-track]');
  if (!section || !track) return;
  track.innerHTML = LOOKS.map((l, n) => {
    const prods = l.products.map(byId).filter(Boolean);
    return `<article class="look${l.wide ? ' look--wide' : ''}">
      <div class="look__media">
        <span class="look__num">Look ${String(n + 1).padStart(2, '0')}</span>
        <img src="assets/img/${l.img}-1.webp" srcset="${srcsetE(l.img)}" sizes="(min-width: 1024px) ${l.wide ? 46 : 26}vw, ${l.wide ? 92 : 78}vw" width="1080" height="1620" alt="Look ${n + 1}: ${esc(l.title)}" loading="lazy" decoding="async">
      </div>
      <h3 class="look__title">${l.title.replace(/(\S+)$/, '<em>$1</em>')}</h3>
      <div class="look__chips">${prods.map((p) => `<button type="button" class="look__chip" data-quick="${p.id}"><span>${esc(p.name)}</span><b>${fmt(p.price)}</b><i>${icon('plus')}</i></button>`).join('')}</div>
    </article>`;
  }).join('');

  const viewport = $('[data-look-viewport]');
  const bar = $('[data-look-progress]');
  const desktop = matchMedia('(min-width: 1024px)');
  let max = 0, stop = null, io = null;

  const measure = () => {
    const pin = desktop.matches && !reduced();
    section.classList.toggle('is-pinned', pin);
    track.style.transform = '';
    if (!pin) { section.style.removeProperty('--pin-h'); return; }
    max = Math.max(0, track.scrollWidth - innerWidth);
    section.style.setProperty('--pin-h', `${innerHeight + max}px`);
  };
  let cur = 0;
  const frame = () => {
    const r = section.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (r.height - innerHeight || 1)));
    cur += (p - cur) * .16;
    if (Math.abs(p - cur) < .0005) cur = p;
    track.style.transform = `translate3d(${(-cur * max).toFixed(1)}px,0,0)`;
    bar.parentElement.style.setProperty('--p', cur.toFixed(4));
  };
  const bind = () => {
    io?.disconnect();
    stop?.(); stop = null;
    if (section.classList.contains('is-pinned')) {
      io = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && !stop) stop = addJob(frame);
        else if (!e.isIntersecting && stop) { stop(); stop = null; }
      });
      io.observe(section);
    } else {
      const onScroll = () => {
        const m = viewport.scrollWidth - viewport.clientWidth;
        bar.parentElement.style.setProperty('--p', m > 0 ? (viewport.scrollLeft / m).toFixed(4) : 0);
      };
      viewport.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
  };
  measure();
  bind();
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { measure(); bind(); }, 150); }, { passive: true });
  desktop.addEventListener('change', () => { measure(); bind(); });
  // recalcular cuando carguen las imágenes (cambian el ancho real)
  $$('img', track).forEach((img) => img.addEventListener('load', () => { clearTimeout(rt); rt = setTimeout(measure, 100); }, { once: true }));
}

/* ---------- arranque ---------- */
initUI();
const slider = initSlider();
initCategories();
initNews();
initLookbook();
initFX();
reveal();
runIntro().then(() => {
  html.classList.add('is-ready');
  slider.start();
});
