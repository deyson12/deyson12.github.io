// ============================================================
// PideFacil — Configuración global compartida
// Edita SOLO este archivo para cambiar teléfono, Wompi, etc.
// ============================================================

const WA_PHONE   = '573136090247';
const STORE_NAME = 'PideFacil';
const ORDERS_KEY = 'cy_orders_history';

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
const WOMPI_ENV = 'prod'; // <── 'test' | 'prod'

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
  redirectUrl:  'https://ventas7lunas.shop/wompi-checkout.html',
};
