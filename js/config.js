// ============================================================
// PideFacil — Configuración global compartida
// Edita SOLO este archivo para cambiar teléfono, Wompi, etc.
// ============================================================

const WA_PHONE   = '573213421697';
const STORE_NAME = 'PideFacil';
const ORDERS_KEY = 'cy_orders_history';

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
const DELIVERY_CITY  = 'Medellín';    // <── ciudad principal de entrega
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
    publicKey:    'pub_test_AJwwVnKMkBtahpgfizo6x44ZZ64XfmHd',
    integrityKey: 'test_integrity_j4FgZZzlGfbSarhaeqhjx4UqgzDym4iC',
    checkoutUrl:  'https://checkout.wompi.co/p/',
  },
  prod: {
    publicKey:    'pub_prod_fboTzzBItNEd4ftjNsk7GLcrjuuwvPaZ',
    integrityKey: 'prod_integrity_F1KDvo3ItFpC2Z90TlY3LOT2d59u0odY',
    checkoutUrl:  'https://checkout.wompi.co/p/',
  },
};

const WOMPI = {
  enabled:      true,
  env:          WOMPI_ENV,
  publicKey:    _WOMPI_ENVS[WOMPI_ENV].publicKey,
  integrityKey: _WOMPI_ENVS[WOMPI_ENV].integrityKey,
  checkoutUrl:  _WOMPI_ENVS[WOMPI_ENV].checkoutUrl,
  currency:     'COP',
  redirectUrl:  'https://pidefacil.shop/wompi-checkout.html',
};
