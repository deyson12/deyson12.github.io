// ============================================================
// PideFácil — Configuración global compartida
// Edita SOLO este archivo para cambiar teléfono, Wompi, etc.
// ============================================================

const WA_PHONE   = '573213421697';
const STORE_NAME = 'PideFácil';
const ORDERS_KEY = 'cy_orders_history';

// ── Datos de la tienda (factura / tirilla) ────────────────
const STORE_LOGO      = '';                   // <── URL del logo (dejar vacío para omitir)
const STORE_PHONE_DISPLAY = '321 342 1697';   // <── teléfono legible en la factura
const STORE_INSTAGRAM = '@pidefacil.shop';    // <── handle de Instagram (o '')
const STORE_WEBSITE   = 'pidefacil.shop';     // <── sitio web (o '')
const STORE_EMAIL     = '';                   // <── correo de contacto (o '')
const STORE_ADDRESS_DISPLAY = '';             // <── dirección física (o '')

// ── Mapa de entrega ───────────────────────────────────────
// MAPS_ENABLED:    true  = muestra mapa de confirmación al pedir
//                 false = desactiva el mapa (solo texto de dirección)
// MAPS_PROVIDER:  'leaflet' = OpenStreetMap + Nominatim (gratis, sin API key)
//                'google'  = Google Maps + Google Geocoding (más preciso,
//                             requiere API key con Maps JS API y Geocoding API
//                             habilitados en console.cloud.google.com)
// DELIVERY_CITY:  ciudad que se agrega al geocoding para mayor
//                precisión. Ej: 'Bogotá', 'Medellín', 'Cali'
// GOOGLE_MAPS_KEY: tu API key de Google (solo se usa si MAPS_PROVIDER='google')
// ────────────────────────────────────────
// ── API Backend ──────────────────────────────────────────────
// API_ENV: 'local' → http://localhost:8080
//          'prod'  → URL de producción en Cloud Run
// ─────────────────────────────────────────────────────────────
const API_ENV = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'local' : 'prod'; // auto

const _API_URLS = {
  local: 'http://localhost:8080',
  prod:  'https://ventas-7-lunas-back-241033954184.southamerica-east1.run.app',
};
const API_BASE = _API_URLS[API_ENV] || _API_URLS.local;

const MAPS_ENABLED   = true;          // <── true | false
const MAPS_PROVIDER  = 'google';     // <── 'leaflet' | 'google'
let   DELIVERY_CITY  = 'Medellín';    // <── ciudad principal de entrega (se auto-detecta por IP al cargar)
const GOOGLE_MAPS_KEY = 'AIzaSyCZDKgSFqjayBMohK8lawKi2KPf8HLWdnM';           // <── API key de Google (si usas 'google')

// ── Wompi — pagos en línea (tarjeta / PSE) ──────────────────
// enabled:     true  = activa el flujo de pago Wompi
//              false = solo WhatsApp (transferencia / efectivo)
//
// WOMPI_ENV:   'test' → Sandbox  (pruebas,  sin cobros reales)
//              'prod' → Producción (cobros reales, PDN)
//
// Para pasar a producción:
//   1. Cambia WOMPI_ENV a 'prod'
//   2. Llena publicKey y integrityKey de la sección prod con tus
//      llaves reales de panel.wompi.co → "Llaves API"
// ────────────────────────────────────────────────────────────
const WOMPI_ENV = ['localhost', '127.0.0.1'].includes(window.location.hostname) ? 'test' : 'prod'; // auto

const _WOMPI_ENVS = {
  test: {
    publicKey:   'pub_test_gBIJZcgVdmv5iluo0lnk7w7WSiQ5GcFe',
    checkoutUrl: 'https://checkout.wompi.co/p/',
  },
  prod: {
    publicKey:   'pub_prod_BSbBJ5Dpy3Zjk5IGmOmFZrq8hF98pOXS',
    checkoutUrl: 'https://checkout.wompi.co/p/',
  },
};

const WOMPI = {
  enabled:     true,
  env:         WOMPI_ENV,
  publicKey:   _WOMPI_ENVS[WOMPI_ENV].publicKey,
  checkoutUrl: _WOMPI_ENVS[WOMPI_ENV].checkoutUrl,
  currency:    'COP',
  redirectUrl: 'https://pidefacil.shop/wompi-checkout.html',
};

// ── Dev environment badges ────────────────────────────────────
// Shown only on localhost/127.0.0.1. Warns if local is hitting prod APIs.
(function() {
  const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
  if (!isLocal) return;

  const apiIsProd   = typeof API_BASE  !== 'undefined' && API_BASE.includes('run.app');
  const wompiIsProd = typeof WOMPI_ENV !== 'undefined' && WOMPI_ENV === 'prod';

  const badges = [];
  if (apiIsProd) {
    badges.push({ text: 'LOCAL · API PDN', color: '#ef4444', title: 'Estás en local pero apuntando a la API de producción' });
  } else {
    badges.push({ text: 'LOCAL', color: '#6366f1', title: 'Ambiente local — API local (seguro)' });
  }
  if (wompiIsProd) {
    badges.push({ text: 'WOMPI · PDN', color: '#f59e0b', title: '⚠️ Wompi apunta a producción — los cobros son REALES' });
  }

  const wrap = document.createElement('div');
  wrap.style.cssText = [
    'position:fixed', 'top:50%', 'left:10px', 'z-index:99999',
    'display:flex', 'flex-direction:column', 'gap:5px',
    'pointer-events:none',
    'transform:translateY(-50%)',
  ].join(';');

  badges.forEach(b => {
    const el = document.createElement('div');
    el.title = b.title;
    el.textContent = b.text;
    el.style.cssText = [
      `background:${b.color}`,
      'color:#fff',
      'border:none',
      'font-family:ui-monospace,monospace',
      'font-size:13px',
      'font-weight:800',
      'letter-spacing:.12em',
      'text-transform:uppercase',
      'padding:7px 16px',
      'border-radius:8px',
      'pointer-events:auto',
      'cursor:default',
      'line-height:1',
      'box-shadow:0 2px 10px rgba(0,0,0,.35)',
    ].join(';');
    wrap.appendChild(el);
  });

  // Wait for body to be available
  if (document.body) {
    document.body.appendChild(wrap);
  } else {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(wrap));
  }
})();
