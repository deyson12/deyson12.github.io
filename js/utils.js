// ============================================================
// PideFacil — Utilidades compartidas (index + wompi-checkout)
// ============================================================

/** Formatea un número como precio COP. */
function fmtPrice(n) {
  return '$' + Number(n).toLocaleString('es-CO');
}

/** Formatea una fecha ISO legible en español. */
function fmtDateOrder(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
  } catch (e) { return iso; }
}

/**
 * Genera una línea de ítem en el formato WhatsApp estándar.
 * (REF:XXXXXXXX) *Nombre*\n  qty und x $price = $total\n\n
 */
function buildItemLine(id, name, qty, price) {
  return `(REF:${id.slice(0, 8)}) *${name}*\n  ${qty} und x ${fmtPrice(price)} = ${fmtPrice(price * qty)}\n\n`;
}

/**
 * Construye el mensaje de WhatsApp unificado para todos los flujos.
 *
 * @param {object} opts
 * @param {string}  opts.saludo       'quiero hacer un pedido' | 'confirmo mi pedido'
 * @param {string}  opts.itemsBlock   Bloque de ítems (buildItemLine * n + separador + TOTAL)
 * @param {string}  opts.nom          Nombre del destinatario
 * @param {string}  opts.dir          Dirección de entrega
 * @param {string}  [opts.pago]       Método de pago (ej. 'Wompi', 'Efectivo', etc.)
 * @param {string}  [opts.cambio]     Valor con el que paga en efectivo (para devuelta)
 * @param {string}  [opts.wompiRef]   Referencia de la transacción Wompi
 * @param {string}  [opts.wompiId]    ID de la transacción Wompi
 * @param {string}  [opts.statusLabel] Etiqueta legible del estado Wompi (ej. 'APROBADO')
 * @param {number}  [opts.mapLat]     Latitud confirmada por el usuario
 * @param {number}  [opts.mapLng]     Longitud confirmada por el usuario
 */
function buildOrderMessage({ saludo = 'quiero hacer un pedido', itemsBlock = '', nom = '', dir = '',
  pago, cambio, wompiRef, wompiId, statusLabel, mapLat, mapLng } = {}) {
  let msg = `Hola, ${saludo} en *${STORE_NAME}*\n`;
  msg += `━━━━━━━━━━━━━━\n\n`;
  msg += itemsBlock;
  msg += `*A nombre de:* ${nom}\n`;
  msg += `*Dirección de entrega:* ${dir}\n`;
  if (pago) {
    msg += `*Método de pago:* ${pago}\n`;
    if (pago === 'Efectivo' && cambio) msg += `*Paga con:* $${cambio} (requiere devuelta)\n`;
  }
  if (statusLabel) msg += `*Estado del pago:* ${statusLabel}\n`;
  if (wompiRef)    msg += `*Referencia:* ${wompiRef}\n`;
  if (wompiId)     msg += `*ID Transacción:* ${wompiId}\n`;

  if (mapLat && mapLng) {
    const lat = Number(mapLat).toFixed(6);
    const lng = Number(mapLng).toFixed(6);
    msg += `*Ubicación exacta:* https://maps.google.com/?q=${lat},${lng}\n`;
  }

  msg += `\nGracias`;
  return msg;
}

/** Guarda un pedido en el historial local (máx. 100). */
function saveOrderToHistory(record) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) {}
  hist.unshift(record);
  if (hist.length > 100) hist = hist.slice(0, 100);
  localStorage.setItem(ORDERS_KEY, JSON.stringify(hist));
}
