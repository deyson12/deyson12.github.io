// ============================================================
// PideFacil — Configuración global compartida
// Edita SOLO este archivo para cambiar teléfono, Wompi, etc.
// ============================================================

const WA_PHONE   = '573136090247';
const STORE_NAME = 'PideFacil';
const ORDERS_KEY = 'cy_orders_history';

// ── Wompi — pagos en línea (tarjeta / PSE) ──────────────────
// enabled: true  = activa el flujo de pago Wompi
//          false = solo WhatsApp (transferencia / efectivo)
// publicKey    → panel.wompi.co → "Llaves API"
// integrityKey → panel.wompi.co → "Llave de integridad"
const WOMPI = {
  enabled:      true,
  publicKey:    'pub_test_AJwwVnKMkBtahpgfizo6x44ZZ64XfmHd',
  integrityKey: 'test_integrity_j4FgZZzlGfbSarhaeqhjx4UqgzDym4iC',
  currency:     'COP',
  redirectUrl:  'https://ventas7lunas.shop/wompi-checkout.html',
};
