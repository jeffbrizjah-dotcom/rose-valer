/* Páginas sencillas (p. ej. 404): solo la interfaz común y los efectos */
import { initUI } from './ui.js';
import { initFX } from './fx.js';

initUI();
initFX();
document.documentElement.classList.add('is-ready', 'intro-done');
