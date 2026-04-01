// ============================================================
// PideFacil — Lógica de confirmación Wompi (wompi-checkout.html)
// Requiere: js/config.js, js/utils.js
// ============================================================

// ── Helpers ────────────────────────────────────────────────
function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

// ── Read URL params (Wompi attaches id, status, etc.) ──────
function getWompiParams() {
  const sp = new URLSearchParams(window.location.search);
  return {
    wref:   sp.get('wref')   || sp.get('reference') || '',
    id:     sp.get('id')     || '',
    status: (sp.get('status') || '').toLowerCase(),
    amount: sp.get('amount-in-cents') || '',
  };
}

// ── Map Wompi status to UI ─────────────────────────────────
function statusUI(status) {
  const map = {
    approved: { icon: '✅', title: '¡Pago aprobado!',         sub: 'Tu pago fue procesado con éxito. Confirma tu pedido por WhatsApp para coordinar el envío.', chip: 'wompi-chip-approved', label: 'APROBADO' },
    pending:  { icon: '⏳', title: 'Pago en proceso',          sub: 'Tu pago está siendo procesado. Una vez aprobado te confirmaremos por WhatsApp.',             chip: 'wompi-chip-pending',  label: 'EN PROCESO' },
    declined: { icon: '❌', title: 'Pago rechazado',           sub: 'El pago no pudo completarse. Puedes intentarlo de nuevo o elegir otro método de pago.',      chip: 'wompi-chip-declined', label: 'RECHAZADO' },
    voided:   { icon: '⛔', title: 'Pago anulado',             sub: 'La transacción fue anulada.',                                                                 chip: 'wompi-chip-declined', label: 'ANULADO' },
    error:    { icon: '⚠️', title: 'Error en el pago',         sub: 'Ocurrió un problema. Intenta más tarde o elige otro método.',                                 chip: 'wompi-chip-declined', label: 'ERROR' },
  };
  return map[status] || { icon: '🔐', title: 'Pago pendiente de confirmación', sub: 'Por favor confirma tu pedido por WhatsApp para continuar.', chip: 'wompi-chip-unknown', label: 'DESCONOCIDO' };
}

// ── Render order items ─────────────────────────────────────
function renderItems(od, totalAmount) {
  const body   = document.getElementById('itemsBody');
  let html     = '';
  const lineRe = /\(REF:([A-Z0-9]+)\)\s+\*(.+?)\*[\r\n]+\s+(\d+)\s+und\s+x\s+\$[\d.,]+\s+=\s+(\$[\d.,]+)/g;
  let m, found = false;
  while ((m = lineRe.exec(od.itemsBlock)) !== null) {
    found = true;
    html += `<div class="order-item">
      <div style="flex:1;min-width:0">
        <div class="order-item-ref">REF: ${m[1]}</div>
        <div class="order-item-name">${m[2]}</div>
        <div class="order-item-meta">
          <span class="order-item-qty">${m[3]} unidad${m[3] > 1 ? 'es' : ''}</span>
          <span class="order-item-price">${m[4]}</span>
        </div>
      </div>
    </div>`;
  }
  if (!found) {
    html += `<div style="font-size:13px;color:var(--text-secondary);line-height:1.7">${od.summaryHtml || 'Pedido confirmado'}</div>`;
  }
  html += `<div class="order-total-row grand"><span>Total</span><span>${od.totalFmt || fmtPrice(totalAmount)}</span></div>`;
  body.innerHTML = html;
}

// ── Render delivery ────────────────────────────────────────
function renderDelivery(od) {
  document.getElementById('deliveryBody').innerHTML = `
    <div class="info-row"><span class="info-row-icon">👤</span><div><div class="info-row-label">A nombre de</div><div class="info-row-val">${od.nom || '—'}</div></div></div>
    <div class="info-row"><span class="info-row-icon">📍</span><div><div class="info-row-label">Dirección</div><div class="info-row-val">${od.dir || '—'}</div></div></div>
  `;
}

// ── Render payment info ────────────────────────────────────
function renderPayment(ref, wompiId, status, rawAmount) {
  const amountCOP = rawAmount ? fmtPrice(Math.round(Number(rawAmount) / 100)) : '—';
  document.getElementById('paymentBody').innerHTML = `
    <div class="info-row"><span class="info-row-icon">💳</span><div><div class="info-row-label">Método</div><div class="info-row-val">Wompi (Tarjeta / PSE)</div></div></div>
    ${wompiId ? `<div class="info-row"><span class="info-row-icon">🔢</span><div><div class="info-row-label">ID Transacción Wompi</div><div class="info-row-val" style="font-family:monospace;font-size:12px">${wompiId}</div></div></div>` : ''}
    <div class="info-row"><span class="info-row-icon">🧾</span><div><div class="info-row-label">Referencia del pedido</div><div class="info-row-val" style="font-family:monospace;font-size:12px">${ref}</div></div></div>
    ${rawAmount ? `<div class="info-row"><span class="info-row-icon">💰</span><div><div class="info-row-label">Monto cobrado</div><div class="info-row-val">${amountCOP}</div></div></div>` : ''}
  `;
}

// ── WhatsApp send ──────────────────────────────────────────
let _pending = null;

function sendOrderWhatsApp() {
  if (!_pending) return;
  const wompiParams = getWompiParams();
  const ui          = statusUI(wompiParams.status);
  const { ref, od } = _pending;

  saveOrderToHistory({
    id: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    date: new Date().toISOString(),
    type: 'wompi', pago: 'Wompi',
    nombre: od.nom, direccion: od.dir,
    total: od.totalAmount, totalFmt: od.totalFmt || ('$' + Number(od.totalAmount).toLocaleString('es-CO')),
    items: od.items || [], itemsBlock: od.itemsBlock, summaryHtml: od.summaryHtml,
    wompiRef: ref, wompiId: wompiParams.id || null, wompiStatus: wompiParams.status || null,
  });

  const msg = buildOrderMessage({
    saludo: 'confirmo mi pedido', itemsBlock: od.itemsBlock, nom: od.nom, dir: od.dir,
    pago: 'Wompi', wompiRef: ref, wompiId: wompiParams.id, statusLabel: ui.label,
  });
  window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
}

// ── Main init ──────────────────────────────────────────────
function init() {
  const params = getWompiParams();
  const raw    = localStorage.getItem('cy_wompi_pending');
  let pending  = null;

  if (raw) {
    try { pending = JSON.parse(raw); } catch (e) {}
  }

  const incomingRef = params.wref || params.id;
  if (!pending || (incomingRef && pending.ref !== decodeURIComponent(incomingRef))) {
    if (!pending) { hide('stateLoader'); show('stateError'); return; }
  }

  _pending = pending;
  const { ref, od } = pending;

  const enriched = { ...pending, wompiStatus: params.status, wompiId: params.id, resolvedAt: new Date().toISOString() };
  localStorage.setItem('cy_wompi_pending', JSON.stringify(enriched));

  const ui = statusUI(params.status);

  document.getElementById('statusIcon').textContent  = ui.icon;
  document.getElementById('statusTitle').textContent = ui.title;
  document.getElementById('statusSub').textContent   = ui.sub;

  const row = document.getElementById('statusWompiRow');
  row.innerHTML = `<span class="wompi-chip ${ui.chip}">${ui.label}</span>`;

  document.getElementById('statusRef').textContent          = ref;
  document.getElementById('statusRefWrap').style.display    = 'inline-flex';

  renderItems(od, od.totalAmount);
  renderDelivery(od);
  renderPayment(ref, params.id, params.status, params.amount);

  const actions = document.querySelector('.actions');
  if (params.status === 'declined' || params.status === 'voided' || params.status === 'error') {
    const alert = document.createElement('div');
    alert.className = 'alert alert-err';
    alert.innerHTML = `<span class="alert-icon">⚠️</span><span>El pago no fue aprobado. Puedes volver al catálogo y hacer el pedido de nuevo eligiendo otro método de pago.</span>`;
    actions.prepend(alert);
    document.getElementById('btnConfirmWa').disabled    = true;
    document.getElementById('btnConfirmWa').textContent = 'Pago no completado';
  } else if (params.status === 'pending' || !params.status) {
    const alert = document.createElement('div');
    alert.className = 'alert alert-warn';
    alert.innerHTML = `<span class="alert-icon">⏳</span><span>El pago aún está procesándose. Puedes enviar el pedido ahora y te confirmaremos cuando se apruebe.</span>`;
    actions.prepend(alert);
  } else if (params.status === 'approved') {
    const alert = document.createElement('div');
    alert.className = 'alert alert-ok';
    alert.innerHTML = `<span class="alert-icon">✅</span><span>Pago aprobado. Envía tu pedido por WhatsApp para que coordinemos el envío.</span>`;
    actions.prepend(alert);
  }

  hide('stateLoader');
  show('stateContent');
}

document.addEventListener('DOMContentLoaded', init);
