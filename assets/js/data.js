/* ==========================================================================
   ROSE VALER — Datos de la tienda
   Todo lo editable está aquí: configuración, envíos, categorías y productos.
   Los precios, stock y textos de producto son DE EJEMPLO (fotos de prototipo).
   ========================================================================== */

export const CONFIG = {
  tienda: 'Rose Valer',
  locale: 'es-ES',
  moneda: 'EUR',
  iva: 0.21, // precios con IVA incluido

  // PENDIENTE de confirmar con la tienda
  envioGratisDesde: 50,
  devolucionDias: 30,

  // Zonas de envío según el código postal (prefijo de 2 cifras)
  zonas: {
    peninsula: {
      nombre: 'Península',
      metodos: [
        { id: 'estandar', nombre: 'Envío estándar', detalle: '2–4 días laborables', precio: 4.95, dias: [2, 4], gratisDesde: 50 },
        { id: 'expres', nombre: 'Envío exprés', detalle: '24–48 h laborables', precio: 8.95, dias: [1, 2] },
      ],
    },
    baleares: {
      nombre: 'Islas Baleares',
      prefijos: ['07'],
      metodos: [
        { id: 'estandar', nombre: 'Envío estándar', detalle: '3–5 días laborables', precio: 7.95, dias: [3, 5], gratisDesde: 80 },
      ],
    },
    canarias: {
      nombre: 'Canarias, Ceuta y Melilla',
      prefijos: ['35', '38', '51', '52'],
      aviso: 'Los envíos a esta zona pueden conllevar trámites de aduanas (DUA).',
      metodos: [
        { id: 'estandar', nombre: 'Envío estándar', detalle: '5–8 días laborables', precio: 12.95, dias: [5, 8] },
      ],
    },
  },

  // Formas de pago que se mostrarán cuando se conecte la pasarela (Stripe, Redsys, PayPal…)
  pagos: [
    { id: 'tarjeta', nombre: 'Tarjeta', detalle: 'Visa, Mastercard, Amex' },
    { id: 'bizum', nombre: 'Bizum', detalle: 'Pago desde tu móvil' },
    { id: 'paypal', nombre: 'PayPal', detalle: 'Con tu cuenta PayPal' },
  ],

  // Códigos de descuento. Vacío = no se muestra el campo en el checkout.
  // Ejemplo: { 'CODIGO10': { tipo: 'porcentaje', valor: 10 } }
  cupones: {},

  // Datos de contacto (vacío = pendiente; la web oculta lo que falte)
  contacto: { email: '', whatsapp: '', telefono: '', instagram: '', tiktok: '', pinterest: '' },

  anuncios: [
    'Envío gratis en pedidos desde 50 €',
    'Devoluciones gratuitas durante 30 días',
    'Nueva colección Otoño — Invierno 2026',
  ],
};

export const CATEGORIES = [
  { id: 'abrigos', name: 'Abrigos y blazers', short: 'Abrigos', img: 'abrigo-camel' },
  { id: 'punto', name: 'Punto', short: 'Punto', img: 'jersey-trenzado-crema' },
  { id: 'camisas', name: 'Camisas', short: 'Camisas', img: 'camisa-rosa-empolvado' },
  { id: 'vestidos', name: 'Vestidos y monos', short: 'Vestidos', img: 'vestido-saten-moka' },
  { id: 'pantalones', name: 'Pantalones', short: 'Pantalones', img: 'pantalon-palazzo-rayas' },
  { id: 'basicos', name: 'Sudaderas y básicos', short: 'Básicos', img: 'sudadera-capucha-arena' },
  { id: 'bolsos', name: 'Bolsos', short: 'Bolsos', img: 'bolso-asa-marfil' },
];

// Prendas que combinan entre categorías (para "Completa el look")
export const COMBINA = {
  abrigos: ['camisas', 'pantalones', 'vestidos', 'bolsos'],
  punto: ['pantalones', 'camisas', 'bolsos'],
  camisas: ['pantalones', 'abrigos', 'punto'],
  vestidos: ['abrigos', 'bolsos', 'punto'],
  pantalones: ['camisas', 'punto', 'abrigos'],
  basicos: ['pantalones', 'abrigos', 'bolsos'],
  bolsos: ['vestidos', 'abrigos', 'camisas'],
};

export const COLORS = {
  arena: { name: 'Arena', hex: '#D9C6AE' },
  negro: { name: 'Negro', hex: '#1E1B1A' },
  camel: { name: 'Camel', hex: '#B88A5E' },
  blanco: { name: 'Blanco roto', hex: '#F3F0EA' },
  teja: { name: 'Teja', hex: '#B5654A' },
  crema: { name: 'Crema', hex: '#EDE3D2' },
  rosa: { name: 'Rosa empolvado', hex: '#E5C2BE' },
  moka: { name: 'Moka', hex: '#8E6E5D' },
  beige: { name: 'Beige', hex: '#D6C8B0' },
  rayas: { name: 'Rayas', hex: '#E9E7E3' },
  azul: { name: 'Azul claro', hex: '#AFC3D6' },
  gris: { name: 'Gris jaspeado', hex: '#BEBBB7' },
  conac: { name: 'Coñac', hex: '#8A5A3C' },
  marfil: { name: 'Marfil', hex: '#EEE7D9' },
};

const S = (xs, s, m, l, xl) => ({ XS: xs, S: s, M: m, L: l, XL: xl });
const UNICA = (n) => ({ 'Única': n });

/* Campos: id (también nombre de imagen), name, cat, price, compareAt (precio anterior),
   color, sizes {talla: stock}, isNew, added (fecha), bg (fondo mientras carga),
   desc, details[], care, fit */
export const PRODUCTS = [
  {
    id: 'conjunto-sastre-arena', name: 'Blazer Sastre Arena', cat: 'abrigos', price: 119, color: 'arena',
    sizes: S(2, 4, 5, 3, 1), isNew: true, added: '2026-10-12', bg: '#e5dad2',
    desc: 'Blazer de corte recto con hombro suave y solapa fina. Pensado para llevarse con su pantalón a juego o romper el traje con un vaquero.',
    details: ['Corte recto, ligeramente amplio', 'Botón único en el delantero', 'Bolsillos con solapa', 'Forro interior ligero'],
    care: 'Limpieza en seco recomendada. Planchar a temperatura baja.', fit: 'La modelo mide 1,74 m y lleva la talla S.',
  },
  {
    id: 'blazer-sastre-negro', name: 'Blazer Sastre Negro', cat: 'abrigos', price: 109, color: 'negro',
    sizes: S(3, 5, 0, 4, 2), isNew: false, added: '2026-09-02', bg: '#c8c3bf',
    desc: 'El blazer negro que lo resuelve todo: estructurado, con largo a la cadera y un patrón limpio que estiliza.',
    details: ['Largo a la cadera', 'Cierre con botón', 'Hombreras suaves', 'Bolsillos delanteros'],
    care: 'Limpieza en seco. No usar secadora.', fit: 'Talla habitual. Si dudas entre dos, elige la mayor para un efecto oversize.',
  },
  {
    id: 'abrigo-camel', name: 'Abrigo Largo Camel', cat: 'abrigos', price: 149, color: 'camel',
    sizes: S(1, 3, 4, 2, 0), isNew: true, added: '2026-10-10', bg: '#c4c0ba',
    desc: 'Abrigo largo de líneas puras en tono camel. Un clásico de invierno que eleva cualquier look, de un vestido a unos vaqueros.',
    details: ['Largo por debajo de la rodilla', 'Solapa de muesca', 'Bolsillos laterales', 'Abertura trasera'],
    care: 'Limpieza en seco. Guardar en percha ancha.', fit: 'Patrón amplio pensado para llevar prendas de punto debajo.',
  },
  {
    id: 'gabardina-blanca', name: 'Gabardina Doble Botonadura', cat: 'abrigos', price: 119, color: 'blanco',
    sizes: S(2, 0, 3, 3, 1), isNew: false, added: '2026-09-20', bg: '#c2cacf',
    desc: 'Gabardina de doble botonadura con cinturón. Ligera, luminosa y perfecta para los días de entretiempo.',
    details: ['Doble botonadura', 'Cinturón a juego', 'Charreteras en los hombros', 'Tejido con tratamiento repelente'],
    care: 'Lavado a máquina a 30 °C en ciclo delicado.', fit: 'Talla habitual.',
  },
  {
    id: 'bomber-teja', name: 'Bomber Ligera Teja', cat: 'abrigos', price: 69, compareAt: 89, color: 'teja',
    sizes: S(0, 2, 3, 1, 2), isNew: false, added: '2026-08-28', bg: '#d3bdb4',
    desc: 'Bomber ligera en un tono teja cálido, con puños y bajo elásticos. El toque de color para tus básicos.',
    details: ['Cremallera frontal', 'Puños y bajo de canalé', 'Bolsillo en la manga', 'Forro ligero'],
    care: 'Lavado a máquina a 30 °C. No usar secadora.', fit: 'Corte relajado.',
  },
  {
    id: 'jersey-trenzado-crema', name: 'Jersey Ochos Crema', cat: 'punto', price: 69, color: 'crema',
    sizes: S(2, 4, 4, 2, 1), isNew: true, added: '2026-10-14', bg: '#e5ded6',
    desc: 'Jersey de punto grueso con ochos clásicos y cuello alto. Cálido, suave y con una caída generosa.',
    details: ['Punto de ochos', 'Cuello perkins', 'Hombro caído', 'Puños de canalé'],
    care: 'Lavado a mano en agua fría. Secar en horizontal.', fit: 'Oversize. Para un ajuste más ceñido, elige una talla menos.',
  },
  {
    id: 'cardigan-arena', name: 'Cárdigan Suave Arena', cat: 'punto', price: 65, color: 'arena',
    sizes: S(1, 3, 2, 2, 0), isNew: false, added: '2026-09-15', bg: '#d8d3cd',
    desc: 'Cárdigan de punto suave con botones, para llevar abierto sobre una camiseta o abrochado como jersey.',
    details: ['Punto fino y suave', 'Botones en el delantero', 'Bolsillos de parche', 'Bajo de canalé'],
    care: 'Lavado a mano o programa de lana a 30 °C.', fit: 'Talla habitual, ligeramente amplio.',
  },
  {
    id: 'top-crochet-marfil', name: 'Poncho Crochet Marfil', cat: 'punto', price: 45, color: 'marfil',
    sizes: UNICA(5), isNew: true, added: '2026-10-08', bg: '#e0dbd5',
    desc: 'Poncho de crochet hecho con punto calado y flecos en el bajo. Ligero, bohemio y fácil de combinar.',
    details: ['Punto calado de crochet', 'Escote en pico', 'Flecos en el bajo', 'Talla única'],
    care: 'Lavado a mano. Secar en horizontal.', fit: 'Talla única, se adapta de la XS a la L.',
  },
  {
    id: 'camisa-rosa-empolvado', name: 'Camisa Rosa Empolvado', cat: 'camisas', price: 49, color: 'rosa',
    sizes: S(3, 5, 4, 3, 2), isNew: true, added: '2026-10-11', bg: '#e8dcd8',
    desc: 'Camisa de manga corta abullonada en rosa empolvado. Femenina y luminosa, con un largo ideal para meter por dentro.',
    details: ['Manga corta abullonada', 'Cuello camisero', 'Botonadura delantera', 'Tejido fluido'],
    care: 'Lavado a máquina a 30 °C. Planchar del revés.', fit: 'Talla habitual.',
  },
  {
    id: 'camisa-oversize-blanca', name: 'Camisa Oversize Popelín', cat: 'camisas', price: 45, color: 'blanco',
    sizes: S(2, 4, 5, 4, 2), isNew: false, added: '2026-09-05', bg: '#e4e0db',
    desc: 'Camisa blanca oversize de popelín. Se lleva sola como vestido camisero o abierta sobre un top.',
    details: ['Popelín de algodón', 'Corte oversize largo', 'Cuello mao', 'Puños con botón'],
    care: 'Lavado a máquina a 40 °C.', fit: 'Muy amplia: elige tu talla habitual o una menos.',
  },
  {
    id: 'camisa-lino-crema', name: 'Camisa Lino Crema', cat: 'camisas', price: 55, color: 'crema',
    sizes: S(1, 2, 3, 2, 1), isNew: false, added: '2026-09-25', bg: '#dddbd8',
    desc: 'Camisa de lino en tono crema con caída natural. Fresca, elegante y con ese arrugado que solo da el lino.',
    details: ['Lino', 'Cuello camisero clásico', 'Bolsillo en el pecho', 'Bajo redondeado'],
    care: 'Lavado a máquina a 30 °C. Planchar húmeda.', fit: 'Corte relajado.',
  },
  {
    id: 'vestido-saten-moka', name: 'Vestido Satén Moka', cat: 'vestidos', price: 79, color: 'moka',
    sizes: S(2, 3, 3, 1, 0), isNew: true, added: '2026-10-13', bg: '#d7cfcb',
    desc: 'Vestido largo de satén en tono moka con tirantes finos. Fluido, sensual y con un brillo sutil.',
    details: ['Satén fluido', 'Tirantes finos ajustables', 'Largo midi-maxi', 'Escote recto'],
    care: 'Lavado a mano en agua fría. No retorcer.', fit: 'Ajuste al cuerpo. Elige tu talla habitual.',
  },
  {
    id: 'vestido-punto-negro', name: 'Vestido Punto Negro', cat: 'vestidos', price: 69, color: 'negro',
    sizes: S(2, 3, 4, 3, 2), isNew: false, added: '2026-09-10', bg: '#cfc6be',
    desc: 'Vestido de punto fino en negro, de manga larga y largo midi. Cómodo de día, elegante de noche.',
    details: ['Punto fino elástico', 'Manga larga', 'Cuello redondo', 'Largo midi'],
    care: 'Lavado a máquina a 30 °C, programa delicado.', fit: 'Ajustado y elástico.',
  },
  {
    id: 'mono-utilitario-beige', name: 'Mono Utilitario Beige', cat: 'vestidos', price: 85, color: 'beige',
    sizes: S(1, 2, 2, 1, 1), isNew: false, added: '2026-09-18', bg: '#d1cbbf',
    desc: 'Mono de inspiración utilitaria con bolsillos de parche y cinturón. Una sola prenda, un look completo.',
    details: ['Bolsillos de parche', 'Cuello camisero', 'Cinturón a juego', 'Pernera recta'],
    care: 'Lavado a máquina a 30 °C.', fit: 'Corte relajado.',
  },
  {
    id: 'pantalon-palazzo-rayas', name: 'Pantalón Palazzo Rayas', cat: 'pantalones', price: 55, color: 'rayas',
    sizes: S(2, 4, 3, 2, 1), isNew: true, added: '2026-10-09', bg: '#f1eeeb',
    desc: 'Pantalón palazzo de tiro alto con rayas diplomáticas. Alarga la silueta y se mueve contigo.',
    details: ['Tiro alto', 'Pernera ancha', 'Pinzas delanteras', 'Cierre con cremallera'],
    care: 'Lavado a máquina a 30 °C.', fit: 'Talla habitual.',
  },
  {
    id: 'vaquero-recto-claro', name: 'Vaquero Pitillo Lavado Claro', cat: 'pantalones', price: 59, color: 'azul',
    sizes: S(3, 4, 5, 3, 0), isNew: false, added: '2026-08-30', bg: '#e6e9e9',
    desc: 'Vaquero pitillo de tiro medio en lavado claro, con un denim elástico que se adapta y no da de sí.',
    details: ['Denim elástico', 'Tiro medio', 'Cinco bolsillos', 'Largo tobillero'],
    care: 'Lavar del revés a 30 °C.', fit: 'Ajustado. Talla habitual.',
  },
  {
    id: 'jogger-gris', name: 'Jogger Felpa Gris', cat: 'pantalones', price: 45, color: 'gris',
    sizes: S(2, 5, 6, 4, 3), isNew: false, added: '2026-09-01', bg: '#e9e5e1',
    desc: 'Jogger de felpa con cintura elástica y puños. Comodidad absoluta con un acabado cuidado.',
    details: ['Felpa perchada', 'Cintura elástica con cordón', 'Bolsillos laterales', 'Puños en el bajo'],
    care: 'Lavado a máquina a 30 °C.', fit: 'Corte relajado.',
  },
  {
    id: 'sudadera-capucha-arena', name: 'Sudadera Capucha Arena', cat: 'basicos', price: 59, color: 'arena',
    sizes: S(2, 3, 4, 3, 2), isNew: true, added: '2026-10-07', bg: '#cdc5ba',
    desc: 'Sudadera con capucha en tono arena, de felpa gruesa y tacto suave. El básico más cálido del armario.',
    details: ['Felpa gruesa', 'Capucha forrada', 'Hombro caído', 'Bolsillo canguro'],
    care: 'Lavado a máquina a 30 °C, del revés.', fit: 'Oversize.',
  },
  {
    id: 'sudadera-blanca', name: 'Sudadera Esencial Blanca', cat: 'basicos', price: 49, color: 'blanco',
    sizes: S(3, 5, 5, 4, 3), isNew: false, added: '2026-08-25', bg: '#eae5e4',
    desc: 'Sudadera de cuello redondo en blanco roto. Limpia, versátil y con un gramaje que mantiene la forma.',
    details: ['Felpa de gramaje alto', 'Cuello redondo', 'Puños y bajo de canalé'],
    care: 'Lavado a máquina a 30 °C.', fit: 'Talla habitual, ligeramente amplia.',
  },
  {
    id: 'camiseta-organica', name: 'Camiseta Esencial', cat: 'basicos', price: 25, color: 'blanco',
    sizes: S(4, 6, 6, 5, 4), isNew: false, added: '2026-08-20', bg: '#e8e5e2',
    desc: 'La camiseta blanca perfecta: algodón con cuerpo, cuello que no se deforma y un corte recto que sienta bien a todos.',
    details: ['Algodón de tacto denso', 'Cuello redondo reforzado', 'Corte recto'],
    care: 'Lavado a máquina a 40 °C.', fit: 'Talla habitual.',
  },
  {
    id: 'bolso-mini-conac', name: 'Bolso Mini Coñac', cat: 'bolsos', price: 59, color: 'conac',
    sizes: UNICA(4), isNew: true, added: '2026-10-06', bg: '#d6cbc4',
    desc: 'Bolso mini de asas cortas en tono coñac, con bandolera desmontable para llevarlo a mano o cruzado.',
    details: ['Asas cortas', 'Bandolera desmontable', 'Cierre magnético', 'Bolsillo interior'],
    care: 'Limpiar con un paño seco.', fit: 'Medidas: pendiente de confirmar.',
  },
  {
    id: 'bolso-asa-marfil', name: 'Bolso Asa Marfil', cat: 'bolsos', price: 89, color: 'marfil',
    sizes: UNICA(2), isNew: false, added: '2026-09-12', bg: '#d8d3cc',
    desc: 'Bolso estructurado en marfil con asa superior y cierre de giro dorado. Pequeño gran protagonista.',
    details: ['Asa superior', 'Cierre de giro dorado', 'Bandolera ajustable', 'Interior forrado'],
    care: 'Limpiar con un paño seco.', fit: 'Medidas: pendiente de confirmar.',
  },
];

export const LOOKS = [
  { img: 'look-2', title: 'Blanco y denim', products: ['camisa-oversize-blanca', 'vaquero-recto-claro'] },
  { img: 'studio-2', title: 'Tonos tierra', products: ['mono-utilitario-beige', 'vestido-saten-moka'], wide: true },
  { img: 'look-4', title: 'Negro absoluto', products: ['blazer-sastre-negro', 'vestido-punto-negro'] },
  { img: 'look-1', title: 'Luz de mañana', products: ['camisa-lino-crema', 'cardigan-arena'] },
  { img: 'look-5', title: 'Ciudad de noche', products: ['gabardina-blanca', 'bolso-asa-marfil'] },
  { img: 'look-6', title: 'Fin de semana', products: ['sudadera-blanca', 'jogger-gris'] },
];

/* ---------- utilidades de datos ---------- */
export const byId = (id) => PRODUCTS.find((p) => p.id === id);
export const catById = (id) => CATEGORIES.find((c) => c.id === id);
export const colorOf = (p) => COLORS[p.color];
export const stockTotal = (p) => Object.values(p.sizes).reduce((a, b) => a + b, 0);
export const sizesOf = (p) => Object.keys(p.sizes);
