// ============================================================
// PideFácil — Lógica de confirmación Wompi (wompi-checkout.html)
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

// ── Build osp-table (misma lógica que app.js _buildOspTable) ──
function _buildOspTableCo(items) {
  // items: [{name, qty, total, image?}]
  let rows = '';
  items.forEach((item, idx) => {
    const cls   = idx % 2 === 1 ? ' class="osp-alt"' : '';
    const nm    = item.name && item.name.length > 26 ? item.name.slice(0, 24) + '…' : (item.name || '—');
    const thumb = item.image ? `<img class="osp-thumb" src="${item.image}" alt="" width="32" height="32" loading="lazy" decoding="async">` : '';
    rows += `<tr${cls}><td class="osp-name">${thumb}<span>${nm}</span></td><td class="osp-qty">×${item.qty}</td><td class="osp-sub">${fmtPrice(item.total)}</td></tr>`;
  });
  return `<table class="osp-table"><thead><tr><th class="osp-th-name">Producto</th><th class="osp-th-qty">Cant.</th><th class="osp-th-sub">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ── Render order items ─────────────────────────────────────
function renderItems(od, totalAmount) {
  const body = document.getElementById('itemsBody');
  let html   = '';

  // Preferir od.items (array estructurado guardado en localStorage)
  if (od.items && od.items.length) {
    html += _buildOspTableCo(od.items.map(i => ({
      name:  i.product ? i.product.name  : (i.name  || '—'),
      qty:   i.product ? i.qty           : (i.qty   || 1),
      total: i.product ? i.product.price * i.qty : (i.total || 0),
      image: i.product ? i.product.image : (i.image || null),
    })));
  } else {
    // Fallback: mostrar summaryHtml si no hay items estructurados
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

// ── POST order to backend ──────────────────────────────────
const _FIXED_SELLER_ID = 'd59ea1a4-5841-4740-950a-fb501a46ebae';

function _getCyUserCo() { try { return JSON.parse(localStorage.getItem('cy_user') || '{}'); } catch(_) { return {}; } }

function _toApiProductCo(p) {
  return {
    id: p.id, name: p.name, description: p.description || '',
    price: p.price, originalPrice: p.originalPrice ?? p.oldPrice ?? null,
    featured: p.featured || false, image: p.image, category: p.category,
    seller: p.seller, note: p.note ?? null, tags: p.tags || '',
    stock: p.stock === 'ok' ? null : (p.stock ?? null),
    active: p.active !== undefined ? p.active : true,
    dropshippingUrl: p.dropshippingUrl ?? p.dropshipping_url ?? null,
    dropshippingPrice: p.dropshippingPrice ?? p.dropshipping_price ?? null,
    maxDeliveryTime: p.maxDeliveryTime ?? null,
    customOptions: p.customOptions ?? p.badges ?? [],
  };
}

async function postOrderToBackend(od, wompiId, wompiStatus) {
  // Guard: only post once per Wompi reference to avoid duplicates on refresh
  const sentKey = 'cy_wompi_api_sent_' + od.ref;
  if (localStorage.getItem(sentKey)) return;
  localStorage.setItem(sentKey, '1');

  // Only register approved or pending payments
  if (wompiStatus === 'declined' || wompiStatus === 'voided' || wompiStatus === 'error') return;

  try {
    const _cu   = _getCyUserCo();
    const lat    = parseFloat(_cu.lat) || 0;
    const lng    = parseFloat(_cu.lng) || 0;
    const userId = _cu.id || _FIXED_SELLER_ID;
    const fullItems = od.fullItems || [];
    const body = {
      id:             crypto.randomUUID(),
      sellerId:       _FIXED_SELLER_ID,
      buyerId:        userId,
      products:       fullItems.map(i => ({
        product:         _toApiProductCo(i.product),
        quantity:        i.qty,
        selectedOptions: {},
      })),
      status:         'PENDIENTE',
      address:        od.dir,
      paymentType:    'WOMPI',
      changeFrom:     0,
      location:       [lat, lng],
      deliveryPrice:  0,
      couponCode:     od.couponCode || null,
      discountAmount: od.discountAmount || null,
    };
    const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : API_BASE;
    const res = await fetch(`${apiBase}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) console.warn('[checkout] postOrderToBackend HTTP', res.status, await res.text().catch(() => ''));
    else console.log('[checkout] Orden registrada en backend OK');
  } catch (e) {
    // Remove guard so a retry is possible on next page load
    localStorage.removeItem(sentKey);
    console.warn('[checkout] postOrderToBackend error:', e);
  }
}

// ── WhatsApp send ──────────────────────────────────────────
let _pending = null;
let _waSent  = false;

function sendOrderWhatsApp() {
  if (!_pending) return;
  const wompiParams = getWompiParams();
  const ui          = statusUI(wompiParams.status);
  const { ref, od } = _pending;

  // Save to history only on first send
  if (!_waSent) {
    saveOrderToHistory({
      id: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
      date: new Date().toISOString(),
      type: 'wompi', pago: 'Wompi',
      nombre: od.nom, direccion: od.dir,
      total: od.totalAmount, totalFmt: od.totalFmt || ('$' + Number(od.totalAmount).toLocaleString('es-CO')),
      items: od.items || [], itemsBlock: od.itemsBlock, summaryHtml: od.summaryHtml,
      wompiRef: ref, wompiId: wompiParams.id || null, wompiStatus: wompiParams.status || null,
    });
    _waSent = true;
    // Change button to "Reenviar" so user knows it already went
    const btn = document.getElementById('btnConfirmWa');
    if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" style="width:18px;height:18px" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Reenviar por WhatsApp';
  }

  const msg = buildOrderMessage({
    saludo: 'confirmo mi pedido', itemsBlock: od.itemsBlock, nom: od.nom, dir: od.dir,
    pago: 'Wompi', wompiRef: ref, wompiId: wompiParams.id, statusLabel: ui.label,
    mapLat: parseFloat(localStorage.getItem('cy_delivery_lat')) || null,
    mapLng: parseFloat(localStorage.getItem('cy_delivery_lng')) || null,
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

  // ── Register order in backend (fire-and-forget, once per ref) ──
  postOrderToBackend({ ...od, ref }, params.status, params.id);

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

  // ── Auto-open WhatsApp for approved / pending payments ──
  // (declined / voided / error never auto-send)
  if (params.status !== 'declined' && params.status !== 'voided' && params.status !== 'error') {
    // Small delay so the page finishes rendering before the browser switches tabs
    setTimeout(sendOrderWhatsApp, 600);
  }
}

document.addEventListener('DOMContentLoaded', init);
