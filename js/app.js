// ============================================================
// PideFácil — Lógica principal (index.html)
// Requiere: js/config.js, js/utils.js
// ============================================================

// ===== IN-FLIGHT REQUEST DEDUPLICATION =====
// Prevents multiple simultaneous fetches to the same URL from hitting the network twice.
const _inflightRequests = new Map();
function dedupFetch(url, options) {
  const key = (options?.method || 'GET') + ':' + url;
  if (_inflightRequests.has(key)) return _inflightRequests.get(key);
  const promise = fetch(url, options).finally(() => _inflightRequests.delete(key));
  _inflightRequests.set(key, promise);
  return promise;
}

// ===== FETCH INTERCEPTOR — 429 Too Many Requests =====
(function () {
  const _origFetch = window.fetch;
  window.fetch = async function (...args) {
    const res = await _origFetch.apply(this, args);
    if (res.status === 429) {
      try {
        const clone = res.clone();
        const body  = await clone.json();
        show429Alert(body.retryAfterSeconds ?? null);
      } catch (_) {
        show429Alert(null);
      }
    }
    return res;
  };
})();

function show429Alert(seconds) {
  if (document.getElementById('alert429')) return;
  const el = document.createElement('div');
  el.id = 'alert429';
  el.innerHTML = `
    <div id="alert429Box">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="36" height="36" style="color:#f15200;flex-shrink:0"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
      <strong style="font-size:17px;font-family:var(--font-head)">Demasiadas solicitudes</strong>
      <p id="alert429Msg" style="font-size:14px;color:var(--text-secondary);text-align:center;margin:0"></p>
    </div>`;
  document.body.appendChild(el);

  const msgEl = document.getElementById('alert429Msg');

  if (!seconds) {
    msgEl.innerHTML = 'Por favor esperá unos segundos e intentá nuevamente.<br><br>'
      + '<button onclick="location.reload()" style="margin-top:4px;padding:8px 20px;background:#F15200;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer">Intentar ahora</button>';
    return;
  }

  let remaining = seconds;
  const update = () => {
    msgEl.innerHTML = remaining > 0
      ? `Por favor intentá de nuevo en <strong>${remaining} segundo${remaining === 1 ? '' : 's'}</strong>.`
      : 'Recargando...';
    if (remaining <= 0) setTimeout(() => location.reload(), 600);
  };
  update();
  const iv = setInterval(() => {
    remaining--;
    update();
    if (remaining <= 0) clearInterval(iv);
  }, 1000);
}

const SELLER = 'PideFácil';

let PRODUCTS = [];
const _productCache = new Map(); // id → normalizedProduct
let _apiHasMore = false;
let _apiPage    = 0;

// ===== STATE =====
let cart         = JSON.parse(localStorage.getItem('cy_cart')    || '[]');
let wishlist     = JSON.parse(localStorage.getItem('cy_wish')    || '[]');
let checkedItems = new Set(JSON.parse(localStorage.getItem('cy_checked') || 'null') || cart.map(i => i.id));
let _cartZoneUnavailIds = new Set(); // IDs in cart that can't be ordered from current zone
let currentCategory = 'all', currentPriceFilter = 'all', currentSearch = '', currentSort = 'popular';
let bannerIdx = 0;
let buyNowProduct = null;
let repeatOrderItems = null; // array of {product, qty} — set by repeatOrder(), bypasses the cart
let filteredList = [], pageOffset = 0, isLoadingMore = false, gridObserver = null;
const PAGE_SIZE = 12;

// ===== PROMOTED PRODUCTS =====
let PROMOTED = [];
let _gridRenderedCount = 0; // reset on each applyFilters; drives promoted injection
let _promoShownCount   = 0; // stops injecting once all promoted products have been shown once
let _aboveFoldCount    = 0; // first N cards get eager loading + fetchpriority=high for LCP
const PROMO_EVERY = 6;      // inject promoted cards every N regular cards

// ===== POPUP AD =====
let POPUP_AD = null;
let _promoPopAction = null;
let _popupQueue = [];   // array of popup objects pending to show
const POPUP_DISMISSED_PREFIX = 'cy_popup_'; // key per popup: cy_popup_{id}

// ===== GEOLOCATION PERMISSION =====
const GEO_PREF_KEY  = 'pf_geo_pref';   // 'granted' | 'denied'
const GEO_CACHE_KEY = 'pf_geo_cache';  // { lat, lng, address }
let _geoCoords = null; // { lat, lng } — set when GPS granted

// ===== COUPONS =====
// Coupons are now validated against the API — no local array needed.
let _appliedCoupon    = null;
let _currentOrderTotal = 0;
function _setSummaryTotal(val) {
  _currentOrderTotal = val;
  const hdr = document.getElementById('orderSummaryTotal');
  if (hdr) hdr.textContent = 'Total: ' + fmtPrice(val);
}

// ===== RECENTLY VIEWED =====
const RECENT_KEY = 'cy_recent';
const RECENT_MAX = 7;

// ===== ZONE AVAILABILITY =====
/**
 * Calls backend to find which of the given product IDs are NOT available
 * at the user's current delivery location.
 * Returns a Set of unavailable IDs (empty Set if no geo coords or on error).
 * Results are cached for the current JS session to avoid redundant requests.
 */
const _zoneAvailCache = new Map(); // key: sorted-ids+lat+lng → Set of unavail IDs
async function _checkZoneAvail(ids) {
  if (!ids || !ids.length || !_geoCoords) return new Set();
  const { lat, lng } = _geoCoords;
  const key = ids.slice().sort().join(',') + '|' + lat.toFixed(5) + ',' + lng.toFixed(5);
  if (_zoneAvailCache.has(key)) return _zoneAvailCache.get(key);
  try {
    const res = await fetch(
      `${API_BASE}/api/products/pidefacil/zone-available?lat=${lat}&lng=${lng}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ids) }
    );
    if (!res.ok) return new Set();
    const available = new Set(await res.json());
    const unavail = new Set(ids.filter(id => !available.has(id)));
    _zoneAvailCache.set(key, unavail);
    return unavail;
  } catch (_) { return new Set(); }
}
/** Clears zone availability cache (call when user changes delivery address) */
function _clearZoneAvailCache() { _zoneAvailCache.clear(); }
function _getVisitorId() {
  let vid = localStorage.getItem('pf_vid');
  if (!vid) { vid = crypto.randomUUID(); localStorage.setItem('pf_vid', vid); }
  return vid;
}
function _getSessionId() {
  let sid = sessionStorage.getItem('pf_sid');
  if (!sid) { sid = crypto.randomUUID(); sessionStorage.setItem('pf_sid', sid); }
  return sid;
}

// ===== TESTER MODE (per-device in production) =====
// Controlled from admin only. Storefront reads this flag and skips tracking/writes.
const TESTER_MODE_KEY = 'pf_tester_mode_v1';

function _isTesterModeEnabled() {
  return localStorage.getItem(TESTER_MODE_KEY) === '1';
}

function _setTesterModeEnabled(enabled) {
  localStorage.setItem(TESTER_MODE_KEY, enabled ? '1' : '0');
}

function _renderTesterModeBadge() {
  if (!_isTesterModeEnabled()) return;
  if (document.getElementById('pfTesterModeBadge')) return;
  const el = document.createElement('div');
  el.id = 'pfTesterModeBadge';
  el.textContent = 'MODO PRUEBA · SIN ESTADISTICAS';
  el.style.cssText = [
    'position:fixed', 'right:10px', 'bottom:10px', 'z-index:99999',
    'background:#b91c1c', 'color:#fff', 'border-radius:999px',
    'padding:8px 12px', 'font-size:10px', 'font-weight:800',
    'letter-spacing:.08em', 'text-transform:uppercase',
    'box-shadow:0 4px 14px rgba(0,0,0,.25)',
    'pointer-events:none'
  ].join(';');
  document.body.appendChild(el);
}

function trackEvent(eventType, context) {
  if (_isTesterModeEnabled()) return; // don't pollute real analytics from tester devices
  fetch(`${API_BASE}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: _getVisitorId(), sessionId: _getSessionId(), eventType, context: context || {} })
  }).catch(() => {});
}

// ===== UTM TRACKING =====
const UTM_KEY = 'pf_utm';

function _captureUTM() {
  const params = new URLSearchParams(location.search);
  const source = params.get('utm_source');
  if (source) {
    // Fresh UTM in URL — store / overwrite
    localStorage.setItem(UTM_KEY, source.toLowerCase().trim());
  }
  // Return whatever we have (url param or stored fallback)
  return localStorage.getItem(UTM_KEY) || 'direct';
}

function _getUTMSource() {
  return localStorage.getItem(UTM_KEY) || 'direct';
}

function _trackUTMEntry() {
  const params = new URLSearchParams(location.search);
  const source = params.get('utm_source');
  if (!source) return; // no UTM in URL — nothing to track
  const clean = source.toLowerCase().trim();
  // Store/overwrite in localStorage for future sessions
  localStorage.setItem(UTM_KEY, clean);
  // Deduplicate per session+source so refreshing the same link doesn't spam the DB
  const sessionKey = 'pf_utm_' + clean;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, '1');
  trackEvent('UTM_ENTRY', { utm_source: clean, url: location.href, referrer: document.referrer || 'directo' });
}

// ===== MAP STATE =====
let _leafletLoaded  = false;
let _mapInstance    = null;
let _mapMarker      = null;
let _googleLoaded   = false;
let _googleMap      = null;
let _googleMarker   = null;
let _deliveryLat    = null;
let _deliveryLng    = null;
let _mapConfirmed   = false;
let _lastGeoDir     = '';
let _mapFieldInited = false;

// Texto centralizado de la pregunta del mapa
const MAP_Q_DEFAULT = '¿Aquí te entregamos el pedido?';

// Auto-detect city via IP geolocation (no permission required).
// Updates DELIVERY_CITY silently; runs concurrently with product fetch.

// ── Delivery address modal ────────────────────────────────────────────────
// Instead of asking for GPS permission, we ask the user to enter their
// delivery address up-front. This gives us the correct lat/lng for product
// zone filtering AND pre-fills the order form later.

let _pfGeoMap    = null;  // google.maps.Map inside the address modal
let _pfGeoMarker = null;  // draggable AdvancedMarkerElement inside the modal
let _pfGeoLat    = null;  // lat confirmed in the modal
let _pfGeoLng    = null;  // lng confirmed in the modal

/**
 * Returns a Promise that resolves once the delivery address is known or skipped:
 *   - Immediately when the user already confirmed an address in a prior session.
 *   - After the user confirms/skips the address modal for first-time visitors.
 *   - Immediately if the user already skipped this session (sessionStorage flag).
 */
function _waitForGeoDecision() {
  const geoModalEnabled = typeof GEO_ADDRESS_MODAL_ENABLED === 'boolean' ? GEO_ADDRESS_MODAL_ENABLED : true;

  // If initial address modal is disabled by config, continue normal load flow.
  // Keep cached coords when available, but never block with the modal.
  if (!geoModalEnabled) {
    try {
      const pref = localStorage.getItem(GEO_PREF_KEY);
      if (pref === 'granted') {
        const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
        if (cached) _geoCoords = { lat: cached.lat, lng: cached.lng };
      }
    } catch (_) {}
    return Promise.resolve();
  }

  const pref = localStorage.getItem(GEO_PREF_KEY);

  if (pref === 'granted') {
    try {
      const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
      if (cached) {
        _geoCoords = { lat: cached.lat, lng: cached.lng };
        return Promise.resolve();
      }
    } catch (_) {}
    // No valid cache — show modal
    localStorage.removeItem(GEO_PREF_KEY);
  }

  // If user already skipped this browser session, don't nag again
  if (sessionStorage.getItem('pf_geo_skip')) return Promise.resolve();

  return new Promise(resolve => _showAddressModal(resolve));
}

function _showAddressModal(onDecision) {
  if (document.getElementById('pfGeoModal')) return;
  const overlay = document.createElement('div');
  overlay.id = 'pfGeoModal';
  overlay.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99990',
    'background:rgba(0,0,0,.52)',
    'display:flex', 'align-items:flex-end', 'justify-content:center',
    'padding:0 0 env(safe-area-inset-bottom,0)',
    'backdrop-filter:blur(3px)', '-webkit-backdrop-filter:blur(3px)',
    'animation:pfGeoFadeIn .22s ease',
  ].join(';');

  overlay.innerHTML = `
    <style>
      @keyframes pfGeoFadeIn  { from{opacity:0}   to{opacity:1} }
      @keyframes pfGeoSlideUp { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
      #pfGeoBox {
        background: var(--bg-card, #fff);
        border-radius: 20px 20px 0 0;
        padding: 24px 20px 28px;
        max-width: 520px; width: 100%;
        box-shadow: 0 -4px 32px rgba(0,0,0,.18);
        animation: pfGeoSlideUp .3s cubic-bezier(.4,0,.2,1);
        font-family: var(--font-body, 'DM Sans', sans-serif);
        max-height: 92dvh; overflow-y: auto;
      }
      #pfGeoBox .ga-icon { font-size: 36px; text-align:center; margin-bottom:10px; }
      #pfGeoBox h3 {
        font-family: var(--font-head, 'Plus Jakarta Sans', sans-serif);
        font-size: 17px; font-weight: 800;
        color: var(--text-primary, #111827);
        margin: 0 0 6px; text-align: center;
      }
      #pfGeoBox .ga-sub {
        font-size: 13px; color: var(--text-secondary, #4B5563);
        text-align: center; margin: 0 0 18px; line-height: 1.5;
      }
      #pfGeoBox .ga-row {
        display: flex; gap: 8px; margin-bottom: 12px;
      }
      #pfGeoAddrInput {
        flex: 1; padding: 12px 14px;
        border: 1.5px solid var(--border, #E5E7EB); border-radius: 12px;
        font-family: var(--font-body, sans-serif); font-size: 14px;
        color: var(--text-primary, #111827); background: var(--bg, #f9fafb);
        outline: none; transition: border-color .18s;
      }
      #pfGeoAddrInput:focus { border-color: var(--primary, #F15200); }
      #pfGeoBtnSearch {
        padding: 12px 16px;
        background: var(--primary, #F15200); color: #fff;
        border: none; border-radius: 12px;
        font-size: 14px; font-weight: 700; cursor: pointer;
        white-space: nowrap; transition: background .18s;
      }
      #pfGeoBtnSearch:hover { background: var(--primary-dark, #CC4500); }
      #pfGeoBtnSearch:disabled { background: #d1d5db; cursor: default; }
      #pfGeoMapEl {
        display: none; width: 100%; height: 220px;
        border-radius: 14px; overflow: hidden;
        margin-bottom: 12px; border: 1.5px solid var(--border, #E5E7EB);
      }
      #pfGeoMapHint {
        display: none; font-size: 12px;
        color: var(--text-secondary, #6B7280);
        text-align: center; margin-bottom: 14px;
      }
      #pfGeoStatus {
        font-size: 13px; color: var(--primary, #F15200);
        text-align: center; min-height: 20px; margin-bottom: 10px;
      }
      #pfGeoBtnConfirm {
        width: 100%; padding: 14px;
        background: var(--primary, #F15200); color: #fff;
        border: none; border-radius: 12px;
        font-family: var(--font-head, sans-serif);
        font-size: 15px; font-weight: 700;
        cursor: pointer; margin-bottom: 10px;
        transition: background .18s, opacity .18s;
      }
      #pfGeoBtnConfirm:hover:not(:disabled) { background: var(--primary-dark, #CC4500); }
      #pfGeoBtnConfirm:disabled { opacity: .45; cursor: default; }
      #pfGeoBtnSkip {
        width: 100%; padding: 12px;
        background: transparent; color: var(--text-muted, #767676);
        border: 1.5px solid var(--border, #E5E7EB); border-radius: 12px;
        font-family: var(--font-body, sans-serif);
        font-size: 14px; font-weight: 600;
        cursor: pointer; transition: border-color .18s;
      }
      #pfGeoBtnSkip:hover { border-color: var(--text-muted, #9ca3af); }
    </style>
    <div id="pfGeoBox">
      <div class="ga-icon">🏠</div>
      <h3>Dirección de entrega</h3>
      <p class="ga-sub">Algunos productos solo están disponibles en ciertas zonas. Ingresa tu dirección para ver el catálogo completo.</p>
      <div class="ga-row">
        <input id="pfGeoAddrInput" type="text" placeholder="Ej: Calle 10 #5-23, El Prado"
          autocomplete="street-address" enterkeyhint="search">
        <button id="pfGeoBtnSearch">Buscar</button>
      </div>
      <div id="pfGeoStatus"></div>
      <div id="pfGeoMapEl"></div>
      <p id="pfGeoMapHint">📌 Mueve el pin para ajustar la ubicación exacta</p>
      <button id="pfGeoBtnConfirm" disabled>Confirmar dirección</button>
      <button id="pfGeoBtnSkip">Ahora no, lo elijo al pedir</button>
    </div>`;

  document.body.appendChild(overlay);

  const inp        = document.getElementById('pfGeoAddrInput');
  const btnSearch  = document.getElementById('pfGeoBtnSearch');
  const btnConfirm = document.getElementById('pfGeoBtnConfirm');
  const btnSkip    = document.getElementById('pfGeoBtnSkip');
  const statusEl   = document.getElementById('pfGeoStatus');
  const mapHint    = document.getElementById('pfGeoMapHint');

  // Restore previously saved address (if any) as placeholder
  const prevDir = getCyUser().dir || '';
  if (prevDir) inp.value = prevDir;

  async function _doSearch() {
    const addr = inp.value.trim();
    if (!addr) { inp.focus(); return; }
    btnSearch.disabled = true;
    btnConfirm.disabled = true;
    statusEl.textContent = 'Buscando dirección…';
    _pfGeoLat = null; _pfGeoLng = null;
    try {
      const found = await geocodeGoogle(addr);
      if (!found) { statusEl.textContent = '⚠️ No encontramos esa dirección. Intenta ser más específico.'; btnSearch.disabled = false; return; }
      _pfGeoLat = found.lat; _pfGeoLng = found.lng;
      statusEl.textContent = found.precision === 'city' ? '⚠️ Solo encontramos la ciudad. Ajusta el pin.' : '✅ Dirección encontrada. Confirma el pin.';
      await _renderAddressModalMap(_pfGeoLat, _pfGeoLng);
      btnConfirm.disabled = false;
    } catch (e) {
      statusEl.textContent = '⚠️ Error al buscar. Verifica tu conexión.';
    }
    btnSearch.disabled = false;
  }

  btnSearch.addEventListener('click', _doSearch);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); _doSearch(); } });

  btnConfirm.addEventListener('click', () => {
    if (!_pfGeoLat) return;
    // Read final pin position (user may have dragged it)
    if (_pfGeoMarker) {
      const pos = _pfGeoMarker.position;
      if (pos) { _pfGeoLat = +pos.lat; _pfGeoLng = +pos.lng; }
    }
    const addr = inp.value.trim();
    _geoCoords = { lat: _pfGeoLat, lng: _pfGeoLng };
    localStorage.setItem(GEO_PREF_KEY, 'granted');
    localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat: _pfGeoLat, lng: _pfGeoLng, address: addr }));
    setCyUser({ dir: addr, lat: _pfGeoLat, lng: _pfGeoLng });
    trackEvent('GEO_ADDRESS_SET', { lat: +_pfGeoLat.toFixed(5), lng: +_pfGeoLng.toFixed(5), address: addr });
    _clearZoneAvailCache();
    _closeGeoModal();
    if (onDecision) onDecision();
  });

  btnSkip.addEventListener('click', () => {
    sessionStorage.setItem('pf_geo_skip', '1');
    trackEvent('GEO_SKIPPED', { url: location.href });
    _closeGeoModal();
    if (onDecision) onDecision();
  });

  // Auto-search if we had a saved address
  if (prevDir) setTimeout(_doSearch, 200);
  // No auto-focus: on mobile it opens the keyboard and hides the field
}

async function _renderAddressModalMap(lat, lng) {
  const container = document.getElementById('pfGeoMapEl');
  const hint      = document.getElementById('pfGeoMapHint');
  if (!container) return;
  await loadGoogleMaps();
  container.style.display = 'block';
  if (hint) hint.style.display = 'block';
  if (_pfGeoMap) {
    _pfGeoMap.setCenter({ lat, lng });
    if (_pfGeoMarker) _pfGeoMarker.position = { lat, lng };
    return;
  }
  _pfGeoMap = new google.maps.Map(container, {
    center: { lat, lng }, zoom: 16,
    mapTypeControl: false, streetViewControl: false,
    fullscreenControl: false, gestureHandling: 'cooperative',
    mapId: 'DEMO_MAP_ID'
  });
  const _pin = document.createElement('div');
  _pin.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#F15200;border:3px solid #fff;box-sizing:border-box;cursor:grab';
  _pfGeoMarker = new google.maps.marker.AdvancedMarkerElement({
    position: { lat, lng }, map: _pfGeoMap,
    content: _pin, gmpDraggable: true, title: 'Tu dirección de entrega'
  });
  _pfGeoMarker.addListener('dragend', e => {
    _pfGeoLat = e.latLng.lat();
    _pfGeoLng = e.latLng.lng();
  });
}

function _closeGeoModal() {
  const el = document.getElementById('pfGeoModal');
  if (el) el.remove();
  // Clean up map instance so it can be recreated fresh if shown again
  _pfGeoMap = null; _pfGeoMarker = null; _pfGeoLat = null; _pfGeoLng = null;
}
// ── End delivery address modal ─────────────────────────────────────────────
function _showCountryBlock(countryName) {
  // Deshabilitar scroll en html y body
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  
  const el = document.createElement('div');
  el.id = 'countryBlockOverlay';
  el.style.cssText = [
    'position:fixed', 'inset:0', 'z-index:99999',
    'background:rgba(15,23,42,0.97)',
    'display:flex', 'flex-direction:column',
    'align-items:center', 'justify-content:center',
    'padding:32px', 'text-align:center',
    "font-family:'Plus Jakarta Sans',system-ui,sans-serif",
    'overflow-y:auto',  // permite scroll dentro del overlay si es necesario
    'touch-action:none'  // previene scroll en mobile
  ].join(';');
  el.innerHTML = `
    <div style="font-size:22px;font-weight:800;color:#f1f5f9;margin-bottom:10px;line-height:1.3">
      Solo disponible en Colombia
    </div>
    <div style="font-size:14px;color:#94a3b8;max-width:320px;line-height:1.6;margin-bottom:20px">
      Esta tienda opera únicamente dentro de Colombia.<br>
      Tu ubicación detectada es <strong style="color:#cbd5e1">${countryName}</strong>.
    </div>
    <div style="font-size:12px;color:#64748b;max-width:340px;line-height:1.7;background:rgba(100,112,139,0.15);padding:14px 16px;border-radius:10px;border-left:3px solid #64748b">
      <div style="font-weight:700;color:#cbd5e1;margin-bottom:6px">💡 ¿Estás en Colombia?</div>
      Si estás en Colombia pero ves este mensaje, probablemente tengas una VPN, proxy o herramienta que oculta tu ubicación real. Intenta:
      <ul style="margin:8px 0;padding-left:20px;text-align:left">
        <li>Desactivar tu VPN temporalmente</li>
        <li>Limpiar cookies del navegador</li>
        <li>Recargar la página</li>
      </ul>
    </div>`;
  
  document.body.appendChild(el);
  
  // Prevenir scroll con eventos
  function preventScroll(e) {
    e.preventDefault();
  }
  
  el.addEventListener('wheel', e => {
    // Permitir scroll dentro del overlay, pero no propagarlo al fondo
    if (e.target.closest('#countryBlockOverlay')) {
      const scrollable = el.scrollHeight > el.clientHeight;
      if (!scrollable) e.preventDefault();
    }
  });
  
  document.addEventListener('wheel', preventScroll, { passive: false });
  document.addEventListener('touchmove', preventScroll, { passive: false });
}

async function _detectCity() {
  const cityTrackKey = 'pf_city_ip_tracked';
  const services = [
    {
      url: 'https://ipapi.co/json/',
      parse: d => ({
        ip:           d.ip,
        country_name: d.country_name,
        country_code: d.country_code,
        region:       d.region,
        city:         d.city,
        postal:       d.postal,
        latitude:     d.latitude,
        longitude:    d.longitude,
        org:          d.org || '',
        ok:           !d.error && !!d.country_code,
      }),
    },
    {
      url: 'https://ipinfo.io/json',
      parse: d => ({
        ip:           d.ip,
        country_name: d.country,
        country_code: d.country,
        region:       d.region,
        city:         d.city,
        postal:       d.postal,
        latitude:     d.loc ? d.loc.split(',')[0] : null,
        longitude:    d.loc ? d.loc.split(',')[1] : null,
        org:          d.org || '',
        ok:           !!d.country,
      }),
    },
  ];

  for (const svc of services) {
    try {
      const res = await fetch(svc.url, { cache: 'force-cache' });
      if (!res.ok) continue;
      const raw  = await res.json();
      const data = svc.parse(raw);
      if (!data.ok) continue;

      console.groupCollapsed('%c📍 IP Geolocation', 'color:#3b82f6;font-weight:700');
      console.log('Fuente:      ', svc.url);
      console.log('IP:          ', data.ip);
      console.log('País:        ', data.country_name, `(${data.country_code})`);
      console.log('Departamento:', data.region);
      console.log('Ciudad:      ', data.city);
      console.log('CP:          ', data.postal || '—');
      console.log('Coords:      ', `${data.latitude}, ${data.longitude}`);
      console.log('Org:         ', data.org || '—');
      console.groupEnd();

      if (data.country_code !== 'CO') {
        _showCountryBlock(data.country_name ?? 'otro país');
        return;
      }
      if (data.city) {
        DELIVERY_CITY = data.city;
        console.log('%c📍 DELIVERY_CITY →', 'color:#3b82f6;font-weight:700', DELIVERY_CITY);
        _updateCityGreeting();
        if (!sessionStorage.getItem(cityTrackKey)) {
          sessionStorage.setItem(cityTrackKey, '1');
          trackEvent('CITY_IP_DETECTED', {
            city: data.city,
            region: data.region,
            country: data.country_code,
            source: svc.url,
            ip: data.ip || null
          });
        }
      }
      return;
    } catch (_) {
      // try next service
    }
  }
  console.warn('📍 IP Geolocation: todos los servicios fallaron — usando ciudad por defecto →', DELIVERY_CITY);
}

document.addEventListener('DOMContentLoaded', async () => {
  _renderTesterModeBadge();
  _detectCity(); // fire-and-forget; resolves before user finishes typing address
  // Track link open immediately — before any geo decision or loading
  if (!sessionStorage.getItem('pf_pv')) {
    sessionStorage.setItem('pf_pv', '1');
    const utmSource = _captureUTM();
    trackEvent('PAGE_VIEW', { referrer: document.referrer || 'directo', url: location.href, utm_source: utmSource });
  }
  _trackUTMEntry();
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(PAGE_SIZE).fill(0).map(buildSkeleton).join('');
  // Wait for the user's geo decision before loading products so the correct
  // lat/lng (or no coords) is sent with the very first product request.
  await _waitForGeoDecision();
  try {
    const _geoSuffix = _geoCoords ? `&lat=${_geoCoords.lat}&lng=${_geoCoords.lng}` : '';
    const res = await dedupFetch(`${API_BASE}/api/products/pidefacil/paged?page=0&size=${PAGE_SIZE}${_geoSuffix}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const _initData = await res.json();
    PRODUCTS  = _cacheProducts(_initData.content);
    _apiHasMore = _initData.hasMore;
    _apiPage    = 0;
  } catch (e) {
    console.error('Error cargando productos:', e);
    grid.innerHTML = '<div class="no-results"><div class="no-results-icon">⚠️</div><h3>Error al cargar</h3><p>Recarga la página</p></div>';
  }
  // Fetch secondary resources in parallel
  const [_rpRes, _rbRes, _rppRes] = await Promise.allSettled([
    dedupFetch(`${API_BASE}/api/promoted-ads/visible`),
    dedupFetch(`${API_BASE}/api/banners/visible`),
    dedupFetch(`${API_BASE}/api/popup-ads/visible`),
  ]);
  try {
    if (_rpRes.status === 'fulfilled' && _rpRes.value.ok) PROMOTED = await _rpRes.value.json();
  } catch (_) {}
  try {
    if (_rbRes.status === 'fulfilled' && _rbRes.value.ok) renderSbnrBanners(await _rbRes.value.json());
  } catch (_) {}
  try {
    if (_rppRes.status === 'fulfilled' && _rppRes.value.ok) {
      const popups = await _rppRes.value.json();
      _popupQueue = popups.filter(d => d && d.id && localStorage.getItem(POPUP_DISMISSED_PREFIX + d.id) !== '1');
    }
  } catch (_) {}
  initBanner();
  renderOffers();
  applyFilters();
  // Hide loader with smooth scale+fade animation
  const _loader = document.getElementById('pageLoader');
  if (_loader) {
    _loader.classList.add('hiding');
    setTimeout(() => { _loader.classList.add('hidden'); }, 650);
    document.body.style.overflow = '';
  }
  updateCartUI();
  updateWishUI();
  initSearch();
  applySavedTheme();
  handleWompiReturn();
  initMapField();
  initCategories();
  renderRecentlyViewed();
  if (_popupQueue.length) _showNextPopup();
  _handleProductDeepLink();
  _handleOrderDeepLink();
  _handleCollectionDeepLink();
  // Track page view (once per session) — already fired at DOMContentLoaded, skip here
  // Track UTM entry — already fired at DOMContentLoaded, skip here
  // Scroll-to-top button visibility
  const _scrollBtn = document.getElementById('btnScrollTop');
  if (_scrollBtn) {
    window.addEventListener('scroll', () => {
      _scrollBtn.classList.toggle('visible', window.scrollY > 320);
    }, { passive: true });
    _scrollBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    _scrollBtn.addEventListener('touchend', e => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, { passive: false });
  }

  // Scroll depth tracking — fires SCROLL_DEPTH at 25/50/75/100% milestones (once per session each)
  (function() {
    const milestones = [25, 50, 75, 100];
    const fired = new Set();
    function onDepthScroll() {
      const scrolled = window.scrollY + window.innerHeight;
      const total    = document.documentElement.scrollHeight;
      if (total <= window.innerHeight) return; // page fits in viewport, skip
      const pct = Math.round((scrolled / total) * 100);
      milestones.forEach(m => {
        if (!fired.has(m) && pct >= m) {
          fired.add(m);
          trackEvent('SCROLL_DEPTH', { pct: m });
        }
      });
    }
    window.addEventListener('scroll', onDepthScroll, { passive: true });
  })();
});

// ===== MAP / GEOCODING =====

/**
 * Normaliza la respuesta de /api/products al shape interno que usa la app.
 * Campos nuevos → internos:
 *   originalPrice → oldPrice
 *   customOptions → badges (array de strings: 'top', 'new', etc.)
 *   stock null    → 'ok'  (null = disponible)
 *   active false  → filtrado antes de llegar aquí
 */
function normalizeProduct(raw) {
  return {
    id:          raw.id,
    name:        raw.name,
    description: raw.description || '',
    price:       raw.price,
    oldPrice:    raw.originalPrice || null,
    image:       raw.image,
    category:    raw.category,               // UUID — coincide con el id que usan los botones de categoría
    seller:      raw.seller,                 // UUID — usado para agrupar en el carrito
    badges:      (raw.customOptions || []).map(b => typeof b === 'string' ? b : (b.value || b.code || b.name || '')).filter(Boolean),
    stock:       raw.stock === null ? 'ok' : (raw.stock || 'ok'),
    rating:      0,
    sales:       0,
    featured:    raw.featured || false,
    tags:        raw.tags || '',
  };
}

/**
 * Normaliza y almacena una lista de productos crudos de la API en el cache.
 * Devuelve el array normalizado.
 */
function _cacheProducts(rawList) {
  const normalized = (rawList || []).filter(p => p.active !== false).map(normalizeProduct);
  normalized.forEach(p => _productCache.set(p.id, p));
  return normalized;
}

function initMapField() {
  if (_mapFieldInited) return;
  _mapFieldInited = true;
  if (!MAPS_ENABLED) return;  // feature flag
  const inp = document.getElementById('inputDireccion');
  if (!inp) return;
  inp.addEventListener('blur', () => {
    const dir = inp.value.trim();
    if (!dir || dir === _lastGeoDir) return;
    _lastGeoDir = dir;
    geocodeAddress(dir);
  });
}

/**
 * Normaliza direcciones colombianas para Nominatim.
 * Ej: "Cr 99 # 65 - 265" → "Carrera 99 65 265"
 */
function normalizeColAddress(raw) {
  return raw
    .replace(/\bCr\.?/gi,       'Carrera')
    .replace(/\bCll?\.?/gi,     'Calle')
    .replace(/\bDg\.?/gi,       'Diagonal')
    .replace(/\bTv\.?/gi,       'Transversal')
    .replace(/\bAv\.?/gi,       'Avenida')
    .replace(/\bAk\.?/gi,       'Autopista')
    .replace(/#/g,               ' ')
    .replace(/\s*-\s*/g,         ' ')
    .replace(/\s+/g,             ' ')
    .trim();
}

/** Extrae sólo la parte "Carrera/Calle N" de una dirección normalizada. */
function extractStreet(norm) {
  const m = norm.match(/^(Carrera|Calle|Diagonal|Transversal|Avenida|Autopista)\s+\d+[A-Z]?/i);
  return m ? m[0] : null;
}

/** Llama a Nominatim para una sola query; devuelve el primer resultado o null. */
async function nominatimFetch(q) {
  const url  = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=co`;
  const res  = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'PideFácil/1.0' } });
  const data = await res.json();
  return data.length ? data[0] : null;
}

/**
 * Geocodifica con cascada de 4 niveles:
 *  1. Dirección completa normalizada + ciudad
 *  2. Dirección completa normalizada + Colombia
 *  3. Sólo la calle (sin número de puerta) + ciudad  ← resuelve "Carrera 99, Medellín"
 *  4. Ciudad sola  ← fallback garantizado
 * Devuelve { result, precision: 'address'|'street'|'city' }
 */
async function geocodeCascade(address) {
  const norm   = normalizeColAddress(address);
  const city   = (typeof DELIVERY_CITY !== 'undefined' && DELIVERY_CITY) ? DELIVERY_CITY : 'Colombia';
  const street = extractStreet(norm);

  let result;

  result = await nominatimFetch(`${norm}, ${city}, Colombia`);
  if (result) return { result, precision: 'address' };

  result = await nominatimFetch(`${norm}, Colombia`);
  if (result) return { result, precision: 'address' };

  if (street) {
    result = await nominatimFetch(`${street}, ${city}, Colombia`);
    if (result) return { result, precision: 'street' };
  }

  // City-center fallback — always succeeds for known cities
  result = await nominatimFetch(`${city}, Colombia`);
  if (result) return { result, precision: 'city' };

  return null;
}

async function geocodeAddress(address) {
  if (!MAPS_ENABLED) return;  // feature flag

  _mapConfirmed = false;
  _deliveryLat  = null;
  _deliveryLng  = null;

  // Ocultar el enlace mientras geocodifica
  const viewLink = document.getElementById('mapViewLink');
  if (viewLink) viewLink.style.display = 'none';

  // Resetear el wrap si estaba abierto
  const wrap = document.getElementById('mapConfirmWrap');
  if (wrap) wrap.classList.remove('visible');

  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  let precision = 'address';
  try {
    if (useGoogle) {
      const found = await geocodeGoogle(address);
      if (!found) return;
      _deliveryLat = found.lat;
      _deliveryLng = found.lng;
      precision    = found.precision;
    } else {
      const found = await geocodeCascade(address);
      if (!found) return;
      _deliveryLat = parseFloat(found.result.lat);
      _deliveryLng = parseFloat(found.result.lon);
      precision    = found.precision;
    }
  } catch (e) {
    return;
  }

  // Coordenadas listas — mostrar enlace pequeño
  if (viewLink) {
    viewLink.style.display = 'inline-flex';
    viewLink.dataset.precision = precision;
  }
}

/**
 * If the user previously confirmed an address (with pin adjustment), use those
 * exact saved coords directly — no re-geocoding needed.
 * Returns true when saved coords were applied, false when caller must geocode.
 */
function _useSavedCoordsForMap() {
  if (!MAPS_ENABLED) return false;
  try {
    const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
    if (!cached || !cached.lat || !cached.lng) return false;
    _lastGeoDir  = document.getElementById('inputDireccion')?.value.trim() || '';
    _deliveryLat = cached.lat;
    _deliveryLng = cached.lng;
    const viewLink = document.getElementById('mapViewLink');
    if (viewLink) { viewLink.style.display = 'inline-flex'; viewLink.dataset.precision = 'address'; }
    return true;
  } catch (_) { return false; }
}

// Llamado al hacer clic en "Ver mapa (opcional)"
async function expandMap() {
  const wrap      = document.getElementById('mapConfirmWrap');
  const loadingEl = document.getElementById('mapLoadingEl');
  const mapEl     = document.getElementById('mapEl');
  const badge     = document.getElementById('mapConfirmedBadge');
  const viewLink  = document.getElementById('mapViewLink');
  if (!wrap || _deliveryLat === null) return;

  // Ocultar enlace mientras se carga
  if (viewLink) viewLink.style.display = 'none';

  wrap.classList.add('visible');
  loadingEl.style.display = 'flex';
  loadingEl.innerHTML     = '<div class="spin"></div> Cargando mapa…';
  mapEl.style.display     = 'none';
  badge.classList.remove('visible');

  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  try {
    if (useGoogle) {
      await loadGoogleMaps();
      loadingEl.style.display = 'none';
      mapEl.style.display     = 'block';
      renderGoogleMap(_deliveryLat, _deliveryLng);
      enableMapDrag();
    } else {
      await loadLeaflet();
      loadingEl.style.display = 'none';
      mapEl.style.display     = 'block';
      renderDeliveryMap(_deliveryLat, _deliveryLng);
      enableMapDrag();
    }
  } catch (e) {
    loadingEl.innerHTML = '⚠️ No se pudo cargar el mapa. Puedes continuar sin él.';
  }
}

function collapseMap() {
  const wrap     = document.getElementById('mapConfirmWrap');
  const viewLink = document.getElementById('mapViewLink');
  if (wrap) wrap.classList.remove('visible');
  if (viewLink && _deliveryLat !== null) viewLink.style.display = 'inline-flex';
}

function loadLeaflet() {
  if (_leafletLoaded) return Promise.resolve();
  return new Promise(resolve => {
    if (document.getElementById('leaflet-css')) { _leafletLoaded = true; resolve(); return; }
    const css = document.createElement('link');
    css.id   = 'leaflet-css';
    css.rel  = 'stylesheet';
    css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(css);
    const js  = document.createElement('script');
    js.src    = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    js.onload = () => { _leafletLoaded = true; resolve(); };
    document.head.appendChild(js);
  });
}

function renderDeliveryMap(lat, lng) {
  if (_mapInstance) {
    _mapInstance.setView([lat, lng], 16);
    _mapMarker.setLatLng([lat, lng]);
    _mapMarker.dragging.disable();
    setTimeout(() => _mapInstance.invalidateSize(), 120);
    return;
  }
  _mapInstance = L.map('mapEl', { zoomControl: true, scrollWheelZoom: false })
    .setView([lat, lng], 16);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(_mapInstance);

  // Custom pin
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:var(--primary,#F15200);border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.35)"></div>`,
    iconSize: [32, 32], iconAnchor: [16, 32],
  });
  _mapMarker = L.marker([lat, lng], { draggable: false, icon }).addTo(_mapInstance);
  _mapMarker.on('dragend', e => {
    const p = e.target.getLatLng();
    _deliveryLat = p.lat;
    _deliveryLng = p.lng;
  });
  setTimeout(() => _mapInstance.invalidateSize(), 120);
}

/** Lazy-carga la API de Google Maps JS (requiere GOOGLE_MAPS_KEY en config.js). */
function loadGoogleMaps() {
  if (_googleLoaded && typeof google !== 'undefined' && google.maps) return Promise.resolve();
  if (document.getElementById('google-maps-js')) {
    return new Promise(resolve => { window._gmapsReady = () => { _googleLoaded = true; resolve(); }; });
  }
  return new Promise((resolve, reject) => {
    window._gmapsReady = () => { _googleLoaded = true; resolve(); };
    const s  = document.createElement('script');
    s.id     = 'google-maps-js';
    s.src    = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&loading=async&libraries=marker&callback=_gmapsReady`;
    s.async  = true;
    s.defer  = true;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * Geocodifica con Google Geocoding API.
 * Intenta primero dirección + ciudad, luego ciudad sola como fallback.
 * Devuelve { lat, lng, precision: 'address'|'city' } o null.
 */
async function geocodeGoogle(address) {
  const city = (typeof DELIVERY_CITY !== 'undefined' && DELIVERY_CITY) ? DELIVERY_CITY : 'Colombia';

  // fetch con timeout y reintentos para tolerar ERR_QUIC_PROTOCOL_ERROR / network idle
  const fetchWithRetry = async (url, { timeoutMs = 8000, retries = 2 } = {}) => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        return res;
      } catch (err) {
        clearTimeout(timer);
        if (attempt === retries) throw err;
        // pequeña espera antes del siguiente intento (500 ms, 1000 ms, …)
        await new Promise(r => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  };

  const tryQ = async q => {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_KEY}`;
    try {
      const res  = await fetchWithRetry(url);
      const data = await res.json();
      return (data.status === 'OK' && data.results.length) ? data.results[0].geometry.location : null;
    } catch {
      return null;
    }
  };

  let loc = await tryQ(`${address}, ${city}, Colombia`);
  if (loc) return { lat: loc.lat, lng: loc.lng, precision: 'address' };
  loc = await tryQ(`${city}, Colombia`);
  if (loc) return { lat: loc.lat, lng: loc.lng, precision: 'city' };
  return null;
}

/** Crea o actualiza el mapa de Google Maps con un marcador arrastrable. */
function renderGoogleMap(lat, lng) {
  const el = document.getElementById('mapEl');
  if (_googleMap) {
    _googleMap.setCenter({ lat, lng });
    _googleMarker.position = { lat, lng };
    _googleMarker.gmpDraggable = false;
    return;
  }
  _googleMap = new google.maps.Map(el, {
    center: { lat, lng },
    zoom: 16,
    gestureHandling: 'cooperative',
    mapId: 'DEMO_MAP_ID'
  });
  const _pinEl = document.createElement('div');
  _pinEl.style.cssText = 'width:20px;height:20px;border-radius:50%;background:#F15200;border:3px solid #fff;box-sizing:border-box;';
  _googleMarker = new google.maps.marker.AdvancedMarkerElement({
    position: { lat, lng },
    map: _googleMap,
    content: _pinEl,
    gmpDraggable: false,
    title: ''
  });
  _googleMarker.addListener('dragend', (e) => {
    _deliveryLat = e.latLng.lat();
    _deliveryLng = e.latLng.lng();
  });
}

function enableMapDrag() {
  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  if (useGoogle) {
    if (_googleMarker) _googleMarker.gmpDraggable = true;
  } else {
    if (!_mapMarker) return;
    _mapMarker.dragging.enable();
    const el = _mapMarker.getElement();
    if (el) { el.style.cursor = 'grab'; el.style.transition = 'transform .2s'; }
  }
}

function resetMapState() {
  _mapConfirmed = false;
  _deliveryLat  = null;
  _deliveryLng  = null;
  _lastGeoDir   = '';
  const wrap = document.getElementById('mapConfirmWrap');
  if (wrap) wrap.classList.remove('visible');
  const mapEl = document.getElementById('mapEl');
  if (mapEl) mapEl.style.display = 'none';
}

// ===== SBNR BANNERS =====
function renderSbnrBanners(banners) {
  const container = document.getElementById('sbnrContainer');
  if (!container) return;
  const visible = banners.filter(b => b.visible);
  if (!visible.length) { container.innerHTML = ''; container.classList.add('sbnr-empty'); return; }
  container.classList.remove('sbnr-empty');

  const renderSlide = b => renderBannerTemplate(b);

  const multi = visible.length > 1;
  const dots = multi ? visible.map((_, i) => `<button class="sbnr-dot${i === 0 ? ' active' : ''}" onclick="_sbnrGoTo(${i})" aria-label="Banner ${i + 1}"></button>`).join('') : '';
  container.innerHTML = `
    <div class="sbnr-carousel" id="sbnrCarousel">
      <div class="sbnr-carousel-viewport">
        <div class="sbnr-track" id="sbnrTrack">
          ${visible.map(renderSlide).join('')}
        </div>
      </div>
      ${multi ? `<div class="sbnr-dots" id="sbnrDots">${dots}</div>
      <button class="sbnr-arrow sbnr-arrow-prev" onclick="_sbnrGoTo(_sbnrIdx - 1)" aria-label="Banner anterior">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </button>
      <button class="sbnr-arrow sbnr-arrow-next" onclick="_sbnrGoTo(_sbnrIdx + 1)" aria-label="Banner siguiente">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
      </button>` : ''}
    </div>`;
  _sbnrIdx = 0;
  _sbnrTotal = visible.length;
  if (multi) {
    // Autoavance cada 5 s — pausa al hacer hover
    clearInterval(_sbnrTimer);
    _sbnrTimer = setInterval(() => _sbnrGoTo(_sbnrIdx + 1), 5000);
    setTimeout(() => {
      const carousel = document.getElementById('sbnrCarousel');
      if (!carousel) return;
      carousel.addEventListener('mouseenter', () => clearInterval(_sbnrTimer));
      carousel.addEventListener('mouseleave', () => {
        clearInterval(_sbnrTimer);
        _sbnrTimer = setInterval(() => _sbnrGoTo(_sbnrIdx + 1), 5000);
      });
    }, 0);
  }
  window._sbnrData = banners;
}

let _sbnrIdx = 0, _sbnrTotal = 0, _sbnrTimer = null;

window._sbnrGoTo = function(n) {
  _sbnrIdx = ((n % _sbnrTotal) + _sbnrTotal) % _sbnrTotal;
  const track = document.getElementById('sbnrTrack');
  if (track) track.style.transform = `translateX(-${_sbnrIdx * 100}%)`;
  document.querySelectorAll('.sbnr-dot').forEach((d, i) => d.classList.toggle('active', i === _sbnrIdx));
  // Reinicia el timer al navegar manualmente
  clearInterval(_sbnrTimer);
  _sbnrTimer = setInterval(() => _sbnrGoTo(_sbnrIdx + 1), 5000);
};
window._sbnrAct = function(id, btnIdx) {
  if (!window._sbnrData) return;
  const b = window._sbnrData.find(x => x.id === id);
  if (!b) return;
  const btn = btnIdx === 0 ? b.btn1 : b.btn2;
  if (btn.action === 'filterCategory') filterCategory(btn.args[0], btn.args[1]);
  else if (btn.action === 'openBannerPopup') openBannerPopup(btn.args[0], btn.args[1]);
  else if (btn.action === 'collection') openBannerPopup('collection:' + btn.args[0], btn.args[1]);
};

// ===== BANNER =====
function initBanner() {
  const slides = document.querySelectorAll('.banner-slide');
  const dots   = document.getElementById('bannerDots');
  if (!slides.length || !dots) return;
  slides.forEach((_, i) => {
    const b = document.createElement('button');
    b.className = 'banner-dot' + (i === 0 ? ' active' : '');
    b.onclick = () => goSlide(i);
    dots.appendChild(b);
  });
  setInterval(() => goSlide((bannerIdx + 1) % slides.length), 4500);
}
function goSlide(n) {
  const slides = document.querySelectorAll('.banner-slide'), dots = document.querySelectorAll('.banner-dot');
  if (!slides.length) return;
  slides[bannerIdx].classList.remove('active'); dots[bannerIdx].classList.remove('active');
  bannerIdx = n; slides[n].classList.add('active'); dots[n].classList.add('active');
}
function prevSlide() { const n = document.querySelectorAll('.banner-slide').length; goSlide((bannerIdx - 1 + n) % n); }
function nextSlide() { const n = document.querySelectorAll('.banner-slide').length; goSlide((bannerIdx + 1) % n); }
function scrollCarousel(id, dir) {
  const el = document.getElementById(id);
  const w  = (el.querySelector('.product-card')?.offsetWidth || 180) + 10;
  el.scrollBy({ left: dir * w * 2, behavior: 'smooth' });
}

// ===== HELPERS =====
function stars(r) { const f = Math.floor(r), h = r % 1 >= .5 ? 1 : 0; return '⭐'.repeat(f) + (h ? '✨' : '') + '☆'.repeat(5 - f - h); }
function calcDiscount(p) { return (p.oldPrice && p.oldPrice > p.price) ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0; }

// ===== BUILD CARD =====
function buildCard(p, extra = '', aboveFold = false) {
  const cartItem = cart.find(c => c.id === p.id), inCart = !!cartItem, inWish = wishlist.includes(p.id);
  const disc = calcDiscount(p);
  const badgeList = [];
  if (disc > 0) badgeList.push(`<span class="badge badge-offer">${disc}% OFF</span>`);
  p.badges.forEach(b => {
    if (b === 'top') badgeList.push('<span class="badge badge-top">🏆 TOP</span>');
    else if (b === 'new') badgeList.push('<span class="badge badge-new">Nuevo</span>');
  });
  if (!badgeList.some(b => b.includes('badge-new')) && /\bnew\b/i.test(p.tags || ''))
    badgeList.push('<span class="badge badge-new">Nuevo</span>');
  return `<div class="product-card ${extra}" onclick="openProduct('${p.id}')">
    <div class="card-img-wrap">
      <img class="card-img" src="${p.image}" alt="${p.name}" width="300" height="300" loading="${aboveFold ? 'eager' : 'lazy'}"${aboveFold ? ' fetchpriority="high"' : ''} decoding="${aboveFold ? 'sync' : 'async'}" onload="this.classList.add('img-loaded')" onerror="this.classList.add('img-loaded')">
      <div class="badge-wrap">${badgeList.join('')}</div>
      <button class="card-wishlist ${inWish ? 'active' : ''}" data-wish-id="${p.id}" onclick="toggleWish(event,'${p.id}')" aria-label="${inWish ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${inWish}">
        <svg viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5" fill="${inWish ? 'var(--primary)' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <div class="card-seller">Ref: ${p.id.slice(0, 8)}</div>
      <div class="card-name">${p.name}</div>
      <!--div class="card-stars">${stars(p.rating)}<span class="star-count">(${p.sales})</span></div-->
      <div class="card-prices">
        <span class="card-price">${fmtPrice(p.price)}</span>
        ${disc > 0 ? `<span class="card-old-price">${fmtPrice(p.oldPrice)}</span><span class="card-discount">-${disc}%</span>` : ''}
      </div>
      ${p.stock === 'low' ? '<div class="low-stock">Últimas unidades</div>' : ''}
      <div class="card-actions" onclick="event.stopPropagation()">
        <div id="btnCart${p.id}">
          ${inCart
            ? `<div class="card-qty-ctrl"><button class="card-qty-btn" onclick="changeQty('${p.id}',-1)" aria-label="Reducir cantidad">−</button><span class="card-qty-num" aria-live="polite">${cartItem.qty}</span><button class="card-qty-btn" onclick="changeQty('${p.id}',1)" aria-label="Aumentar cantidad">+</button></div>`
            : `<button class="btn btn-cart" onclick="addToCart('${p.id}', event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`
          }
        </div>
        <button class="btn btn-buy-now" onclick="buyNow('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Pedir ahora
        </button>
      </div>
    </div>
  </div>`;
}

function buildMiniCard(p) {
  const disc = calcDiscount(p);
  return `<div class="mini-card" onclick="openProduct('${p.id}')">
    <img class="mini-card-img" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" onload="this.classList.add('img-loaded')" onerror="this.classList.add('img-loaded')">
    <div class="mini-card-body">
      <div class="mini-card-name">${p.name}</div>
      <div>
        <span class="mini-card-price">${fmtPrice(p.price)}</span>
        ${disc > 0 ? `<span class="mini-card-old">${fmtPrice(p.oldPrice)}</span>` : ''}
      </div>
    </div>
  </div>`;
}

function buildRecentCard(p) {
  const cartItem = cart.find(c => c.id === p.id), inCart = !!cartItem, inWish = wishlist.includes(p.id);
  const disc = calcDiscount(p);
  return `<div class="recent-hcard" onclick="openProduct('${p.id}')">
    <div class="recent-hcard-img-wrap">
      <img class="recent-hcard-img" src="${p.image}" alt="${p.name}" loading="lazy" decoding="async" onload="this.classList.add('img-loaded')" onerror="this.classList.add('img-loaded')">
      ${disc > 0 ? `<span class="recent-hcard-disc">-${disc}%</span>` : ''}
      <button class="card-wishlist ${inWish ? 'active' : ''}" data-wish-id="${p.id}" onclick="toggleWish(event,'${p.id}')" aria-label="Favorito">
        <svg viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5" fill="${inWish ? 'var(--primary)' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="recent-hcard-body">
      <div class="recent-hcard-name">${p.name}</div>
      <div class="recent-hcard-prices">
        <span class="card-price">${fmtPrice(p.price)}</span>
        ${disc > 0 ? `<span class="card-old-price">${fmtPrice(p.oldPrice)}</span>` : ''}
      </div>
      ${p.stock === 'low' ? '<div class="low-stock">Últimas unidades</div>' : ''}
      <div class="recent-hcard-actions" onclick="event.stopPropagation()">
        <div id="btnCart${p.id}">
          ${inCart
            ? `<div class="card-qty-ctrl"><button class="card-qty-btn" onclick="changeQty('${p.id}',-1)" aria-label="Reducir">−</button><span class="card-qty-num" aria-live="polite">${cartItem.qty}</span><button class="card-qty-btn" onclick="changeQty('${p.id}',1)" aria-label="Aumentar">+</button></div>`
            : `<button class="btn btn-cart" onclick="addToCart('${p.id}', event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`
          }
        </div>
        <button class="btn btn-buy-now" onclick="buyNow('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Pedir ahora
        </button>
      </div>
    </div>
  </div>`;
}

function promoWaUrl(p) {
  const disc = (p.oldPrice && p.oldPrice > p.price)
    ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0;
  const msg = encodeURIComponent(
    `Hola ${p.sellerName}! Vi tu producto en PideFácil:\n\n` +
    `*${p.name}*\n` +
    `Precio: ${fmtPrice(p.price)}` +
    (disc > 0 ? ` (antes ${fmtPrice(p.oldPrice)}, -${disc}%)` : '') +
    `\n\n¿Está disponible?`
  );
  return `https://wa.me/${p.sellerPhone}?text=${msg}`;
}

function buildPromotedCard(p) {
  const disc = (p.oldPrice && p.oldPrice > p.price)
    ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0;
  const waUrl = promoWaUrl(p);
  return `<div class="product-card promoted-card new-in" onclick="openPromotedProduct('${p.id}')">
    <div class="card-img-wrap">
      <img class="card-img" src="${p.image}" alt="${p.name}" width="300" height="300" loading="lazy" decoding="async" onload="this.classList.add('img-loaded')" onerror="this.classList.add('img-loaded')">
      ${disc > 0 ? `<div class="badge-wrap"><span class="badge badge-offer">${disc}% OFF</span></div>` : ''}
      <div class="promo-label">Patrocinado</div>
    </div>
    <div class="card-body">
      <div class="card-seller promo-seller-name">${p.sellerName}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-prices">
        <span class="card-price">${fmtPrice(p.price)}</span>
        ${disc > 0 ? `<span class="card-old-price">${fmtPrice(p.oldPrice)}</span><span class="card-discount">-${disc}%</span>` : ''}
      </div>
      <div class="card-actions">
        ${p.badge ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;color:#92400E;background:#FFF7ED;border-radius:6px;padding:3px 7px;margin-bottom:6px;line-height:1.4;white-space:nowrap"><svg viewBox="0 0 24 24" width="10" height="10" fill="#F15200" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>Solo en <strong style="margin-left:2px">${p.badge}</strong></span>` : ''}
        <a class="btn btn-promo-wa" href="${waUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
          Contactar
        </a>
      </div>
    </div>
  </div>`;
}

function openPromotedProduct(id) {
  closeBannerPopup();
  const p = PROMOTED.find(x => x.id === id);
  if (!p) return;
  const disc = (p.oldPrice && p.oldPrice > p.price)
    ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0;
  const waUrl = promoWaUrl(p);
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-grid">
      <div class="modal-gallery">
        <img class="modal-main-img" src="${p.image}" alt="${p.name}" decoding="async">
      </div>
      <div class="modal-info">
        <div class="modal-seller" style="display:flex;align-items:center;gap:7px">
          <span class="promo-badge-modal">Patrocinado</span>
          ${p.badge ? `<span class="badge badge-top" style="font-size:11px"><svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" style="flex-shrink:0"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>${p.badge}</span>` : ''}
          <span>${p.sellerName}</span>
        </div>
        <h2 class="modal-name">${p.name}</h2>
        <div class="modal-price-wrap">
          <span class="modal-price">${fmtPrice(p.price)}</span>
          ${disc > 0 ? `<span class="modal-old">${fmtPrice(p.oldPrice)}</span><span class="modal-off">-${disc}%</span>` : ''}
        </div>
        ${buildModalDesc(p.description)}
        ${p.badge ? `<div style="display:flex;align-items:flex-start;gap:8px;background:#FFF7ED;border-left:3px solid #F15200;border-radius:0 8px 8px 0;padding:9px 12px;margin-top:12px;font-size:12px;color:#92400E;line-height:1.5"><svg viewBox="0 0 24 24" width="14" height="14" fill="#F15200" style="flex-shrink:0;margin-top:1px"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>Disponible solo en <strong>${p.badge}</strong>. Asegúrate de estar dentro de la zona de cobertura antes de realizar tu pedido.</span></div>` : ''}
        <div class="modal-actions" style="margin-top:16px">
          <a class="btn btn-promo-wa" href="${waUrl}" target="_blank" rel="noopener noreferrer" style="width:100%;padding:12px;font-size:14px;text-decoration:none">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            Contactar por WhatsApp
          </a>
        </div>
        <p class="modal-ref" style="margin-top:12px">Producto patrocinado · Vendedor externo a PideFácil</p>
      </div>
    </div>`;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  initModalZoom();
}

function getVisiblePromoted() {
  // Returns promoted items visible for the current category filter.
  // categoryId === null / undefined → show in all. Otherwise only when currentCategory matches or is 'all'.
  return PROMOTED.filter(p =>
    p.categoryId == null || currentCategory === 'all' || p.categoryId === currentCategory
  );
}

function weavePromoted(batch) {
  const visible = getVisiblePromoted();
  if (!visible.length) return batch.map(p => buildCard(p, 'new-in', _aboveFoldCount++ < 6)).join('');
  const html = [];
  batch.forEach(p => {
    html.push(buildCard(p, 'new-in', _aboveFoldCount++ < 6));
    _gridRenderedCount++;
    if (_promoShownCount < visible.length && _gridRenderedCount % PROMO_EVERY === 0) {
      html.push(buildPromotedCard(visible[_promoShownCount]));
      _promoShownCount++;
    }
  });
  return html.join('');
}

async function renderOffers() {
  try {
    const _geoSuffix = _geoCoords ? `&lat=${_geoCoords.lat}&lng=${_geoCoords.lng}` : '';
    const res = await fetch(`${API_BASE}/api/products/pidefacil/offers?page=0&size=20${_geoSuffix}`);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const offers = _cacheProducts(data.content);
    const hasOffers = offers.length > 0;
    document.getElementById('offersContainer').innerHTML = offers.map(p => buildCard(p)).join('');
    const zone = document.getElementById('dealsZone');
    const bnr = document.getElementById('bnr3El');
    if (zone) zone.style.display = hasOffers ? '' : 'none';
    if (bnr) bnr.style.display = hasOffers ? '' : 'none';
  } catch (_) {
    const zone = document.getElementById('dealsZone');
    const bnr = document.getElementById('bnr3El');
    if (zone) zone.style.display = 'none';
    if (bnr) bnr.style.display = 'none';
  }
}

const SKEL_LOAD_MORE_COUNT = 4; // skeleton cards shown while fetching next page

function _appendSkeletons(grid, count) {
  const frag = document.createDocumentFragment();
  for (let i = 0; i < count; i++) {
    const div = document.createElement('div');
    div.className = 'skel-more-item';
    div.innerHTML = buildSkeleton();
    frag.appendChild(div);
  }
  grid.appendChild(frag);
}

function _removeSkeletons(grid) {
  grid.querySelectorAll('.skel-more-item').forEach(el => el.remove());
}

function buildSkeleton() {
  return `<div class="skel-card">
    <div class="skel-img"></div>
    <div class="skel-body">
      <div class="skel-line w60"></div>
      <div class="skel-line w80"></div>
      <div class="skel-line w80"></div>
      <div class="skel-line w40"></div>
      <div class="skel-btn" style="margin-top:6px"></div>
    </div>
  </div>`;
}

function fixLoadedImages(container) {
  container.querySelectorAll('.card-img').forEach(img => { if (img.complete) img.classList.add('img-loaded'); });
}

function setupGridObserver() {
  if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
  if (!_apiHasMore) return;
  const sentinel = document.getElementById('gridSentinel');
  gridObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '400px 0px' });
  gridObserver.observe(sentinel);
}

function loadMore() {
  if (isLoadingMore || !_apiHasMore) return;
  isLoadingMore = true;
  // Show skeleton cards immediately so the user sees feedback while fetching
  _appendSkeletons(document.getElementById('productsGrid'), SKEL_LOAD_MORE_COUNT);
  _fetchGridPage(_apiPage + 1);
}

async function _fetchGridPage(page) {
  const grid = document.getElementById('productsGrid');
  if (page === 0) {
    grid.innerHTML = Array(Math.min(PAGE_SIZE, 6)).fill(0).map(buildSkeleton).join('');
  }
  const params = new URLSearchParams({ page, size: PAGE_SIZE });
  if (currentCategory !== 'all') params.set('category', currentCategory);
  if (currentSearch) params.set('search', currentSearch);
  const sortParam = currentSort === 'price-asc' ? 'price_asc'
    : currentSort === 'price-desc' ? 'price_desc' : 'popular';
  params.set('sort', sortParam);
  if (_geoCoords) { params.set('lat', _geoCoords.lat); params.set('lng', _geoCoords.lng); }
  try {
    const res = await fetch(`${API_BASE}/api/products/pidefacil/paged?${params}`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    let batch = _cacheProducts(data.content);
    if (currentPriceFilter !== 'all') {
      const [mn, mx] = currentPriceFilter.split('-').map(Number);
      batch = batch.filter(p => p.price >= (mn || 0) && (mx ? p.price <= mx : true));
    }
    _apiHasMore = data.hasMore;
    _apiPage    = data.page;
    PRODUCTS    = [..._productCache.values()];
    if (page === 0) {
      filteredList = batch;
      pageOffset   = batch.length;
      const total  = data.totalElements;
      document.getElementById('productCount').textContent = `${total} producto${total !== 1 ? 's' : ''}`;
      if (!batch.length) {
        grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><h3>Sin resultados</h3><p>Intenta otra búsqueda o categoría</p></div>`;
        if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
        return;
      }
      grid.innerHTML = weavePromoted(batch);
      fixLoadedImages(grid);
      setupGridObserver();
    } else {
      filteredList = [...filteredList, ...batch];
      pageOffset   = filteredList.length;
      _removeSkeletons(grid);
      const wrap = document.createElement('div');
      wrap.innerHTML = weavePromoted(batch);
      while (wrap.firstChild) grid.appendChild(wrap.firstChild);
      fixLoadedImages(grid);
      setupGridObserver(); // re-observe only if hasMore
    }
  } catch (e) {
    _removeSkeletons(grid);
    if (page === 0) {
      grid.innerHTML = '<div class="no-results"><div class="no-results-icon">⚠️</div><h3>Error al cargar</h3><p>Recarga la página</p></div>';
    }
  } finally {
    isLoadingMore = false;
  }
}

function renderFirstBatch() {
  const grid = document.getElementById('productsGrid');
  document.getElementById('productCount').textContent = `${filteredList.length} producto${filteredList.length !== 1 ? 's' : ''}`;
  if (!filteredList.length) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><h3>Sin resultados</h3><p>Intenta otra búsqueda o categoría</p></div>`;
    if (gridObserver) { gridObserver.disconnect(); gridObserver = null; }
    return;
  }
  grid.innerHTML = weavePromoted(filteredList.slice(0, PAGE_SIZE));
  fixLoadedImages(grid);
  pageOffset = Math.min(PAGE_SIZE, filteredList.length);
  setupGridObserver();
}

// ===== FILTERS =====
async function applyFilters() {
  _gridRenderedCount = 0;
  _promoShownCount   = 0;
  _aboveFoldCount    = 0;
  await _fetchGridPage(0);
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  applyFilters();
  document.getElementById('gridSectionHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (cat !== 'all') {
    history.replaceState(null, '', '?cat=' + encodeURIComponent(cat));
    trackEvent('CATEGORY_FILTER', { category: cat });
  } else {
    history.replaceState(null, '', location.pathname);
  }
}
function hamFilterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.ham-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  applyFilters();
  closeHamDrawer();
  document.getElementById('gridSectionHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (cat !== 'all') history.replaceState(null, '', '?cat=' + encodeURIComponent(cat));
  else history.replaceState(null, '', location.pathname);
}
function openHamDrawer()  { document.getElementById('hamDrawer').classList.add('open'); document.getElementById('hamOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; _updateUserGreeting(); }

// ===== CATEGORIES =====
async function initCategories() {
  // Lazy-load Iconify web component for icon rendering
  if (!document.getElementById('iconify-script')) {
    const s = document.createElement('script');
    s.id  = 'iconify-script';
    s.src = 'https://code.iconify.design/iconify-icon/2.1.0/iconify-icon.min.js';
    document.head.appendChild(s);
  }

  const todoBtnNav = `<button class="cat-btn active" data-cat="all" onclick="filterCategory('all',this)">Todo</button>`;
  const todoBtnHam = `<button class="ham-cat-btn active" data-cat="all" onclick="hamFilterCategory('all',this)">Todo</button>`;

  const navInner    = document.getElementById('categoriesInner');
  const hamContainer = document.getElementById('hamCategoriesContainer');

  try {
    const res  = await fetch(`${API_BASE}/api/categories/active`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const cats = (await res.json()).sort((a, b) => a.order - b.order);

    const makeNavBtn = c =>
      `<button class="cat-btn" data-cat="${c.id}" onclick="filterCategory('${c.id}',this)">${c.name}</button>`;
    const makeHamBtn = c =>
      `<button class="ham-cat-btn" data-cat="${c.id}" onclick="hamFilterCategory('${c.id}',this)">${c.name}</button>`;

    if (navInner)    navInner.innerHTML    = todoBtnNav + cats.map(makeNavBtn).join('');
    if (hamContainer) hamContainer.innerHTML = todoBtnHam + cats.map(makeHamBtn).join('');

    // Restore category from URL (?cat=UUID) after buttons are rendered
    const _savedCat = new URLSearchParams(location.search).get('cat');
    if (_savedCat && cats.some(c => c.id === _savedCat)) {
      currentCategory = _savedCat;
      document.querySelectorAll('.cat-btn,.ham-cat-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.cat === _savedCat));
      applyFilters();
    }
  } catch (e) {
    console.warn('No se pudieron cargar las categorías desde la API:', e);
    // Fallback: show only the "Todo" button so the UI isn't broken
    if (navInner)    navInner.innerHTML    = todoBtnNav;
    if (hamContainer) hamContainer.innerHTML = todoBtnHam;
  }
}
function closeHamDrawer() { document.getElementById('hamDrawer').classList.remove('open'); document.getElementById('hamOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function toggleThemeAndClose() { toggleTheme(); }
function filterPrice(range, btn) {
  currentPriceFilter = range;
  document.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyFilters();
}
function sortProducts() { currentSort = document.getElementById('sortSelect').value; applyFilters(); }

let sTo;
function initSearch() {
  const inp = document.getElementById('searchInput');
  inp.addEventListener('input', function () {
    clearTimeout(sTo);
    const q = this.value.trim();
    if (!q || q.length < 3) { closeSearchDropdown(); return; }
    sTo = setTimeout(() => renderSearchDropdown(q), 1500);
  });
  inp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { closeSearchDropdown(); clearTimeout(sTo); currentSearch = this.value.toLowerCase().trim(); applyFilters(); }
    if (e.key === 'Escape') { closeSearchDropdown(); this.value = ''; }
  });
  inp.addEventListener('blur',  () => setTimeout(closeSearchDropdown, 150));
  inp.addEventListener('focus', function () { const q = this.value.trim(); if (q && q.length >= 3) renderSearchDropdown(q); });
}
function handleSearch() { closeSearchDropdown(); currentSearch = document.getElementById('searchInput').value.toLowerCase().trim(); applyFilters(); }

let lastSearchQuery = '';
let lastLoggedQuery = '';
function norm(s) { return (s ?? '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, ''); }
async function renderSearchDropdown(q) {
  const dd = document.getElementById('searchDropdown');
  try {
    const _sr = await fetch(`${API_BASE}/api/products/pidefacil/search/${encodeURIComponent(q.trim())}?limit=5`);
    if (!_sr.ok) throw new Error('empty');
    const results = await _sr.json();
    if (!results || !results.length) throw new Error('empty');
    results.forEach(p => { if (!_productCache.has(p.id)) _productCache.set(p.id, normalizeProduct(p)); });
    if (q !== lastLoggedQuery) { lastLoggedQuery = q; trackEvent('SEARCH_WITH_RESULTS', { query: q, count: results.length }); }
    dd.innerHTML = results.map(p =>
      `<div class="search-drop-item" onmousedown="openProduct('${p.id}');document.getElementById('searchInput').value='';closeSearchDropdown()">
        <img class="search-drop-img" src="${p.image}" alt="${p.name}" width="42" height="42" loading="lazy" decoding="async">
        <div class="search-drop-info"><div class="search-drop-name">${p.name}</div><div class="search-drop-price">${fmtPrice(p.price)}</div></div>
      </div>`
    ).join('');
    dd.classList.add('open');
    document.getElementById('searchBackdrop')?.classList.add('open');
  } catch (_) {
    lastSearchQuery = q;
    dd.innerHTML = `<div class="search-drop-empty"><span class="search-drop-empty-icon">🔍</span><div class="search-drop-empty-text"><span>No encontramos resultados para <strong>"${q}"</strong></span><button class="search-drop-request-btn" onmousedown="openRequestModal()">¿Lo conseguimos para ti? Solicítalo aquí →</button></div></div>`;
    dd.classList.add('open'); document.getElementById('searchBackdrop')?.classList.add('open');
    if (q !== lastLoggedQuery) {
      lastLoggedQuery = q;
      fetch(`${API_BASE}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'PRODUCTO_SIN_REGISTRO', context: q })
      }).catch(() => {});
      trackEvent('SEARCH_NO_RESULTS', { query: q });
    }
  }
}
function closeSearchDropdown() { document.getElementById('searchDropdown')?.classList.remove('open'); document.getElementById('searchBackdrop')?.classList.remove('open'); document.getElementById('searchBackdrop')?.classList.remove('open'); }

// ===== CART =====
function saveCart() {
  localStorage.setItem('cy_cart',    JSON.stringify(cart));
  localStorage.setItem('cy_checked', JSON.stringify([...checkedItems]));
}
function getCheckedItems()  { return cart.filter(i => checkedItems.has(i.id)); }
function getSelectedTotal() { return getCheckedItems().reduce((s, i) => s + i.price * i.qty, 0); }
function getCount()         { return cart.reduce((s, i) => s + i.qty, 0); }

function removePurchasedFromCartByIds(ids) {
  const uniq = [...new Set((ids || []).filter(Boolean))];
  if (!uniq.length) return 0;
  const before = cart.length;
  cart = cart.filter(i => !uniq.includes(i.id));
  uniq.forEach(id => checkedItems.delete(id));
  const removed = before - cart.length;
  if (removed > 0) {
    saveCart();
    updateCartUI();
    renderCartPanel();
    updateAllBtns();
  }
  return removed;
}

function flyToCart(originEl) {
  const fab = document.getElementById('fabCart');
  if (!originEl || !fab) return;
  const fabVisible = fab.classList.contains('visible');
  const targetEl = fab;
  const from = originEl.getBoundingClientRect();
  const to   = targetEl.getBoundingClientRect();
  const startX = from.left + from.width  / 2;
  const startY = from.top  + from.height / 2;
  const endX   = to.left   + to.width    / 2;
  const endY   = to.top    + to.height   / 2;
  const cpX    = (startX + endX) / 2;
  const cpY    = Math.min(startY, endY) - 90;
  const el = document.createElement('div');
  el.className = 'fly-add';
  el.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="17" height="17"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`;
  el.style.left = (startX - 19) + 'px';
  el.style.top  = (startY - 19) + 'px';
  document.body.appendChild(el);
  const duration = 620;
  const start = performance.now();
  function step(now) {
    const t = Math.min((now - start) / duration, 1);
    const e = t < .5 ? 2*t*t : -1+(4-2*t)*t;
    const bx = (1-e)*(1-e)*startX + 2*(1-e)*e*cpX + e*e*endX;
    const by = (1-e)*(1-e)*startY + 2*(1-e)*e*cpY + e*e*endY;
    el.style.left      = (bx - 19) + 'px';
    el.style.top       = (by - 19) + 'px';
    el.style.opacity   = t > .72 ? String(1 - (t - .72) / .28) : '1';
    el.style.transform = `scale(${1 - t * .45})`;
    if (t < 1) { requestAnimationFrame(step); }
    else {
      el.remove();
      if (fab) {
        fab.classList.remove('fab-catch');
        void fab.offsetWidth;
        fab.classList.add('fab-catch');
      }
    }
  }
  requestAnimationFrame(step);
}

function addToCart(id, e) {
  flyToCart(e?.currentTarget || e?.target);
  const p = _productCache.get(id), ex = cart.find(x => x.id === id);
  if (!p) return;
  if (ex) ex.qty++;
  else { cart.push({ ...p, qty: 1 }); }
  checkedItems.add(id); // always (re-)select on explicit add — shows FAB and updates total
  saveCart(); updateCartUI(); updateAllBtns(); bumpBadge();
  showToast(ex ? `+1 ${p.name.split(' ')[0]}` : `Agregado: ${p.name.split(' ').slice(0, 3).join(' ')}`, ex ? '🛒' : '✅');
  trackEvent('CART_ADD', { productId: p?.id, name: p?.name, price: p?.price, qty: ex ? ex.qty : 1 });
}

function updateAllBtns() {
  _productCache.forEach(p => {
    const ci = cart.find(c => c.id === p.id);
    document.querySelectorAll(`#btnCart${p.id}`).forEach(wrap => {
      wrap.innerHTML = ci
        ? `<div class="card-qty-ctrl"><button class="card-qty-btn" onclick="changeQty('${p.id}',-1)" aria-label="Reducir cantidad">−</button><span class="card-qty-num" aria-live="polite">${ci.qty}</span><button class="card-qty-btn" onclick="changeQty('${p.id}',1)" aria-label="Aumentar cantidad">+</button></div>`
        : `<button class="btn btn-cart" onclick="addToCart('${p.id}', event)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`;
    });
  });
}

function removeFromCart(id) {
  const p = cart.find(c => c.id === id);
  cart = cart.filter(c => c.id !== id);
  checkedItems.delete(id);
  saveCart(); updateCartUI(); renderCartPanel(); updateAllBtns();
  trackEvent('CART_REMOVE', { productId: id, name: p?.name });
}
function clearCart() {
  if (!cart.length) return;
  cart = []; checkedItems.clear();
  saveCart(); updateCartUI(); renderCartPanel(); updateAllBtns(); renderOffers(); applyFilters();
  showToast('Carrito limpiado', '🗑️');
}
function changeQty(id, d) {
  const i = cart.find(c => c.id === id); if (!i) return;
  i.qty += d;
  if (i.qty <= 0) { removeFromCart(id); return; }
  if (d > 0) checkedItems.add(id); // re-select on explicit + press
  saveCart(); updateCartUI(); renderCartPanel(); updateAllBtns();
}
function toggleSelectAll(checked) {
  if (checked) cart.forEach(i => checkedItems.add(i.id));
  else checkedItems.clear();
  saveCart(); updateCartUI();
}
function toggleCheck(id) {
  if (checkedItems.has(id)) checkedItems.delete(id); else checkedItems.add(id);
  saveCart();
  updateCartUI();
}
function updateCartUI() {
  const n = getCount(), sel = getSelectedTotal();
  document.getElementById('cartBadge').textContent     = n;
  document.getElementById('cartCountPill').textContent = n;
  document.getElementById('cartTotal').textContent     = fmtPrice(sel);
  document.getElementById('fabTotal').textContent      = fmtPrice(sel);
  sel > 0 ? document.getElementById('fabCart').classList.add('visible') : document.getElementById('fabCart').classList.remove('visible');
  renderCartPanel();
}

function renderCartPanel() {
  const body          = document.getElementById('cartItems');
  const empty         = document.getElementById('cartEmpty');
  const footer        = document.getElementById('cartFooter');
  const clearBtn      = document.getElementById('btnClearCart');
  const selectAllWrap = document.getElementById('cartSelectAll');
  const checkAll      = document.getElementById('checkAll');

  if (!cart.length) {
    empty.style.display = 'flex'; body.innerHTML = '';
    footer.style.display = 'none'; clearBtn.style.display = 'none';
    if (selectAllWrap) selectAllWrap.style.display = 'none';
    return;
  }
  empty.style.display = 'none'; footer.style.display = 'flex';
  clearBtn.style.display = 'flex';
  if (selectAllWrap) selectAllWrap.style.display = 'flex';
  if (checkAll) {
    const allChecked  = cart.every(i => checkedItems.has(i.id));
    const someChecked = cart.some(i => checkedItems.has(i.id));
    checkAll.checked       = allChecked;
    checkAll.indeterminate = !allChecked && someChecked;
  }
  const g = {};
  cart.forEach(i => { if (!g[i.seller]) g[i.seller] = []; g[i.seller].push(i); });

  body.innerHTML = Object.entries(g).map(([seller, items]) => {
    return `<div class="seller-group">
      ${items.map(item => {
        const isActive = true;
        const checked  = checkedItems.has(item.id);
        const zoneUnavail = _cartZoneUnavailIds.has(item.id);
        if (!isActive) {
          return `<div class="cart-item cart-item--unavailable">
          <div class="cart-item-check"><input type="checkbox" disabled style="opacity:0;pointer-events:none"></div>
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" width="58" height="58" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-unavailable-badge">⚠️ Ya no está disponible</div>
            <div class="cart-item-controls">
              <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Quitar
              </button>
            </div>
          </div>
        </div>`;
        }
        if (zoneUnavail) {
          return `<div class="cart-item cart-item--zone-unavail">
          <div class="cart-item-check"><input type="checkbox" disabled title="No disponible en tu zona"></div>
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" width="58" height="58" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price" style="color:var(--text-muted)">${fmtPrice(item.price * item.qty)}</div>
            <div class="cart-item-zone-badge">📍 No disponible en tu zona</div>
            <div class="cart-item-controls">
              <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Quitar
              </button>
            </div>
          </div>
        </div>`;
        }
        return `<div class="cart-item${checked ? '' : ' unchecked'}">
          <div class="cart-item-check"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleCheck('${item.id}')" title="Incluir en pedido"></div>
          <img class="cart-item-img" src="${item.image}" alt="${item.name}" width="58" height="58" loading="lazy" decoding="async">
          <div class="cart-item-info">
            <div class="cart-item-name">${item.name}</div>
            <div class="cart-item-price">${fmtPrice(item.price * item.qty)}</div>
            <div class="cart-item-controls">
              <button class="qty-btn" onclick="changeQty('${item.id}',-1)" aria-label="Reducir cantidad">−</button>
              <span class="qty-num" aria-live="polite">${item.qty}</span>
              <button class="qty-btn" onclick="changeQty('${item.id}',1)" aria-label="Aumentar cantidad">+</button>
              <button class="btn-remove" onclick="removeFromCart('${item.id}')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>Quitar
              </button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }).join('');
}

// ===== ORDER SUMMARY TABLE HELPER =====
function _buildOspTable(groups) {
  // groups: [{seller: string|null, items: [{name, qty, total, image?}]}]
  const hasSellers = groups.some(g => g.seller);
  let rows = '';
  groups.forEach((g) => {
    g.items.forEach((item, idx) => {
      const cls = idx % 2 === 1 ? ' class="osp-alt"' : '';
      const nm = item.name.length > 26 ? item.name.slice(0, 24) + '…' : item.name;
      const thumb = item.image ? `<img class="osp-thumb" src="${item.image}" alt="" width="32" height="32" loading="lazy" decoding="async">` : '';
      rows += `<tr${cls}><td class="osp-name">${thumb}<span>${nm}</span></td><td class="osp-qty">×${item.qty}</td><td class="osp-sub">${fmtPrice(item.total)}</td></tr>`;
    });
  });
  return `<table class="osp-table"><thead><tr><th class="osp-th-name">Producto</th><th class="osp-th-qty">Cant.</th><th class="osp-th-sub">Total</th></tr></thead><tbody>${rows}</tbody></table>`;
}

// ===== ORDER POPUP =====
function openOrderPopup() {
  trackEvent('CHECKOUT_START', { itemCount: cart.length, total: cart.reduce((s,i) => s + i.price * i.qty, 0) });
  // repeatOrderItems mode: use a fixed item list, ignore the regular cart
  if (repeatOrderItems) {
    const items = repeatOrderItems;
    const totalAmount = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    const summary = _buildOspTable([{seller: null, items: items.map(i => ({name: i.product.name, qty: i.qty, total: i.product.price * i.qty, image: i.product.image}))}]);
    document.getElementById('orderSummary').innerHTML = summary;
    _setSummaryTotal(totalAmount);
  } else {
    const selected = getCheckedItems();
    if (!selected.length) { showToast('Selecciona al menos un producto', '⚠️'); return; }

    // getCheckedItems() already excludes inactive products — no need to block or delete here
    const g = {}; selected.forEach(i => { if (!g[i.seller]) g[i.seller] = []; g[i.seller].push(i); });
    const groups = Object.entries(g).map(([seller, items]) => ({seller, items: items.map(i => ({name: i.name, qty: i.qty, total: i.price * i.qty, image: i.image}))}));
    document.getElementById('orderSummary').innerHTML = _buildOspTable(groups);
    _setSummaryTotal(getSelectedTotal());
  }

  const _cu0 = getCyUser();
  document.getElementById('inputDireccion').value = _cu0.dir   || '';
  document.getElementById('inputNombre').value    = _cu0.name  || '';
  document.getElementById('inputCelular').value   = _cu0.phone || '';
  const _psel = document.getElementById('inputPago');
  _psel.innerHTML = `<option value="">-- Seleccionar --</option>${WOMPI.enabled ? '<option value="Wompi">💳 Tarjeta / PSE</option>' : ''}<option value="Transferencia">🏦 Transferencia bancaria</option>`;
  _psel.value = '';
  document.getElementById('inputCambio').value = '';
  document.getElementById('cambioWrap').style.display = 'none';
  const _chkCupon = document.getElementById('chkCupon');
  if (_chkCupon) { _chkCupon.checked = false; document.getElementById('cuponWrap').style.display = 'none'; }
  document.getElementById('inputCupon').value = '';
  document.getElementById('cuponFeedback').textContent = ''; document.getElementById('cuponFeedback').className = 'cupon-feedback';
  _appliedCoupon = null;
  const _panel = document.getElementById('orderSummaryPanel');
  if (_panel) _panel.removeAttribute('open');
  updateOrderBtn();
  document.getElementById('orderOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Show delivery notice with hybrid policy:
  // first 7 days => once per session; after that => once every 7 days.
  const _noticeEl = document.getElementById('deliveryNotice');
  if (_noticeEl) {
    _noticeEl.style.display = _shouldShowDeliveryNotice() ? 'flex' : 'none';
  }

  // Use saved confirmed coords if available, otherwise fall back to geocoding the address text
  const savedDir = _cu0.dir || '';
  resetMapState();
  const mapWrap = document.getElementById('mapConfirmWrap');
  if (mapWrap) mapWrap.style.display = MAPS_ENABLED ? '' : 'none';
  if (!_useSavedCoordsForMap() && savedDir) { _lastGeoDir = ''; setTimeout(() => geocodeAddress(savedDir), 400); }
}

function closeOrderPopup() {
  buyNowProduct = null;
  repeatOrderItems = null;
  _orderLoading(false);
  document.getElementById('orderOverlay').classList.remove('open');
  document.body.style.overflow = '';
  resetMapState();
}
function handleOrderOverlayClick(e) { if (e.target === document.getElementById('orderOverlay')) closeOrderPopup(); }

const _DELIVERY_NOTICE_FIRST_SEEN_KEY = 'pf_delivery_notice_first_seen_v1';
const _DELIVERY_NOTICE_LAST_SEEN_KEY  = 'pf_delivery_notice_last_seen_v1';
const _DELIVERY_NOTICE_SESSION_KEY    = 'pf_delivery_notice_session_seen_v1';
const _DAY_MS = 24 * 60 * 60 * 1000;

function _markDeliveryNoticeSeen(now = Date.now()) {
  if (!localStorage.getItem(_DELIVERY_NOTICE_FIRST_SEEN_KEY)) {
    localStorage.setItem(_DELIVERY_NOTICE_FIRST_SEEN_KEY, String(now));
  }
  localStorage.setItem(_DELIVERY_NOTICE_LAST_SEEN_KEY, String(now));
  sessionStorage.setItem(_DELIVERY_NOTICE_SESSION_KEY, '1');
}

function _shouldShowDeliveryNotice() {
  const now = Date.now();
  const firstSeen = Number(localStorage.getItem(_DELIVERY_NOTICE_FIRST_SEEN_KEY) || 0);

  // First ever exposure: show now.
  if (!firstSeen) {
    _markDeliveryNoticeSeen(now);
    return true;
  }

  const ageMs = now - firstSeen;
  const inFirstWeek = ageMs < (7 * _DAY_MS);

  if (inFirstWeek) {
    if (sessionStorage.getItem(_DELIVERY_NOTICE_SESSION_KEY)) return false;
    _markDeliveryNoticeSeen(now);
    return true;
  }

  const lastSeen = Number(localStorage.getItem(_DELIVERY_NOTICE_LAST_SEEN_KEY) || 0);
  if (!lastSeen || (now - lastSeen) >= (7 * _DAY_MS)) {
    _markDeliveryNoticeSeen(now);
    return true;
  }
  return false;
}

function _dismissDeliveryNotice() {
  _markDeliveryNoticeSeen();
  const el = document.getElementById('deliveryNotice');
  if (el) el.style.display = 'none';
}
function onPaymentChange() {
  document.getElementById('cambioWrap').style.display =
    document.getElementById('inputPago').value === 'Efectivo' ? 'flex' : 'none';
  updateOrderBtn();
}
function fmtCambioInput(el) {
  const raw = el.value.replace(/\D/g, '');
  el.value = raw ? Number(raw).toLocaleString('es-CO') : '';
}
function fmtCelularInput(el) {
  el.value = el.value.replace(/\D/g, '').slice(0, 10);
}

// ===== ORDER API =====
const _FIXED_SELLER_ID = 'd59ea1a4-5841-4740-950a-fb501a46ebae';
const CY_USER_KEY = 'cy_user';
function getCyUser()        { try { return JSON.parse(localStorage.getItem(CY_USER_KEY) || '{}'); } catch(_) { return {}; } }
function setCyUser(patch)   { localStorage.setItem(CY_USER_KEY, JSON.stringify({ ...getCyUser(), ...patch })); }

/**
 * Registra al usuario como guest la primera vez.
 * Si ya existe un userId en localStorage lo retorna directamente.
 * El userId real se extrae del JWT que devuelve el backend.
 * Lanza un error si la API falla.
 */
async function ensureGuestUser(name, phone) {
  if (_isTesterModeEnabled()) {
    const testerId = getCyUser().id || ('tester-' + crypto.randomUUID());
    setCyUser({ id: testerId });
    return testerId;
  }
  const emailPrefix = 'user' + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  const storedPhone = getCyUser().phone;
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      password: 'guess_checkout',
      email:    `${emailPrefix}@noapply.com`,
      phone,
      image:    '',
    }),
  });
  if (!res.ok) throw new Error('register_failed');
  const data = await res.json();

  // Extract userId from the returned JWT payload
  const token = data.token ?? data.jwt ?? data.accessToken ?? data;
  let userId = null;
  if (typeof token === 'string') {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      userId = payload.userId ?? payload.user_id ?? payload.sub ?? null;
    } catch (_) {}
  }
  // Fallback: if the response contains userId directly
  if (!userId) userId = data.userId ?? data.user_id ?? data.id ?? null;
  if (!userId) throw new Error('register_no_userid');

  setCyUser({ id: userId });
  return userId;
}

function openRegisterError(name, phone) {
  const txt = `Hola, necesito ayuda. Tuve un error al intentar hacer un pedido en PideFácil. Nombre: ${name}. Celular: ${phone}. Por favor ayudame a completar mi pedido.`;
  document.getElementById('regErrWaBtn').href = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(txt)}`;
  document.getElementById('regErrOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeRegisterError() {
  document.getElementById('regErrOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

/** Convierte el producto normalizado (interno) al shape que espera la API. */
function _toApiProduct(p) {
  return {
    id:                p.id,
    name:              p.name,
    description:       p.description || '',
    price:             p.price,
    originalPrice:     p.originalPrice ?? p.oldPrice ?? null,
    featured:          p.featured || false,
    image:             p.image,
    category:          p.category,
    seller:            p.seller,
    note:              p.note ?? null,
    tags:              p.tags || '',
    stock:             p.stock === 'ok' ? null : (p.stock ?? null),
    active:            p.active !== undefined ? p.active : true,
    dropshippingUrl:   p.dropshippingUrl ?? p.dropshipping_url ?? null,
    dropshippingPrice: p.dropshippingPrice ?? p.dropshipping_price ?? null,
    maxDeliveryTime:   p.maxDeliveryTime ?? null,
    customOptions:     p.customOptions ?? p.badges ?? [],
  };
}

/**
 * Envía el pedido a la API backend. Fire-and-forget: los errores se loguean
 * pero no bloquean el flujo de WhatsApp/Wompi.
 * @param {{ fullItems: Array<{product, qty}>, address: string, paymentType: string }} opts
 */
async function postOrderToApi({ fullItems, address, paymentType, couponCode, discountAmount, lat, lng }) {
  if (_isTesterModeEnabled()) {
    console.info('postOrderToApi skipped: tester mode enabled on this device');
    return;
  }
  try {
    const _cu   = getCyUser();
    const orderLat = lat || parseFloat(_cu.lat) || 0;
    const orderLng = lng || parseFloat(_cu.lng) || 0;
    const userId = _cu.id || _FIXED_SELLER_ID;
    const body = {
      id:             crypto.randomUUID(),
      sellerId:       _FIXED_SELLER_ID,
      buyerId:        userId,
      products:       fullItems.map(i => ({
        product:         _toApiProduct(i.product),
        quantity:        i.qty,
        selectedOptions: {},
      })),
      status:         'PENDIENTE',
      address,
      paymentType,
      changeFrom:     0,
      location:       [orderLat, orderLng],
      deliveryPrice:  0,
      couponCode:     couponCode || null,
      discountAmount: discountAmount || null,
    };
    const res = await fetch(`${API_BASE}/api/orders`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    });
    if (!res.ok) console.warn('postOrderToApi: HTTP', res.status, await res.text().catch(() => ''));
  } catch (e) {
    console.warn('postOrderToApi error:', e);
  }
}

function _orderLoading(show) {
  const el = document.getElementById('orderLoadingOverlay');
  if (!el) return;
  el.style.display = show ? 'flex' : 'none';
  const btn = document.getElementById('btnSendOrder');
  if (btn) {
    const tncOk = document.getElementById('chkTnc')?.checked ?? true;
    btn.disabled = show || !tncOk;
  }
}

async function sendWhatsappOrder() {
  if (!(document.getElementById('chkTnc')?.checked)) {
    showToast('Debes aceptar los Términos y Condiciones para continuar', '');
    document.getElementById('chkTnc')?.focus();
    return;
  }

  const dir    = document.getElementById('inputDireccion').value.trim();
  const nom    = document.getElementById('inputNombre').value.trim();
  const phone  = document.getElementById('inputCelular').value.replace(/\D/g, '');
  const pago   = document.getElementById('inputPago').value;
  const cambio = document.getElementById('inputCambio').value.trim();

  if (!dir)  { showToast('Ingresa la dirección de entrega', '');   document.getElementById('inputDireccion').focus(); return; }
  if (!nom)  { showToast('Ingresa el nombre del destinatario', ''); document.getElementById('inputNombre').focus(); return; }
  if (!/^3\d{9}$/.test(phone)) { showToast('Ingresa un celular colombiano válido, ej: 3001234567', ''); document.getElementById('inputCelular').focus(); return; }
  if (!pago) { showToast('Selecciona el método de pago', '');       document.getElementById('inputPago').focus(); return; }
  if (pago === 'Efectivo' && !cambio) { showToast('Ingresa el valor con que vas a pagar', ''); document.getElementById('inputCambio').focus(); return; }

  // Open placeholder tab early to reduce popup blocking on mobile browsers.
  // Only for WhatsApp flow; Wompi has its own redirect.
  let waPopup = null;
  if (pago !== 'Wompi') {
    waPopup = window.open('', '_blank');
    if (waPopup && !waPopup.closed) {
      try {
        waPopup.document.title = 'Abriendo WhatsApp...';
        waPopup.document.body.style.cssText = 'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;padding:16px;color:#334155';
        waPopup.document.body.innerHTML = '<div style="font-size:14px">Redirigiendo a WhatsApp...</div>';
      } catch (_) {
        // Ignore cross-browser quirks in about:blank placeholder.
      }
    }
  }

  setCyUser({ dir, name: nom, phone });

  _orderLoading(true);

  // ── Guest checkout: async for WhatsApp, blocking for Wompi ──────────────
  let _guestReadyPromise = Promise.resolve();
  if (pago === 'Wompi') {
    try {
      await ensureGuestUser(nom, phone);
    } catch (e) {
      _orderLoading(false);
      openRegisterError(nom, phone);
      return;
    }
  } else {
    // For WhatsApp checkout, do not block UX on guest registration.
    _guestReadyPromise = ensureGuestUser(nom, phone).catch((e) => {
      console.warn('ensureGuestUser (background) error:', e);
      return null;
    });
  }

  try {
  if (!_mapConfirmed) {
    const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
    if (useGoogle && _googleMarker) {
      const pos     = _googleMarker.position;
      _deliveryLat  = typeof pos.lat === 'function' ? pos.lat() : pos.lat;
      _deliveryLng  = typeof pos.lng === 'function' ? pos.lng() : pos.lng;
      _googleMarker.gmpDraggable = false;
    } else if (!useGoogle && _mapMarker) {
      const pos     = _mapMarker.getLatLng();
      _deliveryLat  = pos.lat;
      _deliveryLng  = pos.lng;
      _mapMarker.dragging.disable();
    }
    // Even if there's no marker, keep whatever _deliveryLat/_deliveryLng was geocoded
    if (_deliveryLat && _deliveryLng) {
      _mapConfirmed = true;
      setCyUser({ lat: _deliveryLat, lng: _deliveryLng });
      const badge = document.getElementById('mapConfirmedBadge');
      if (badge) badge.classList.add('visible');
      const q = document.getElementById('mapQuestion');
      if (q) q.textContent = '';
    }
  }

  // Track geo confirmation on checkout submit (even if address was set before)
  const _checkoutGeoLat = Number(_deliveryLat ?? getCyUser().lat);
  const _checkoutGeoLng = Number(_deliveryLng ?? getCyUser().lng);
  if (Number.isFinite(_checkoutGeoLat) && Number.isFinite(_checkoutGeoLng)) {
    trackEvent('GEO_ADDRESS_CONFIRMED_AT_CHECKOUT', {
      lat: +_checkoutGeoLat.toFixed(5),
      lng: +_checkoutGeoLng.toFixed(5),
      address: dir,
      paymentType: pago
    });
  }

  // ── Compute totals and build item blocks ─────────────────
  let itemsBlock = '', totalAmount = 0, summaryHtml = '', selectedIds = [], bpId = null, orderItems = [], fullItems = [];

  if (buyNowProduct) {
    const p = buyNowProduct; bpId = p.id; totalAmount = p.price;
    orderItems  = [{ id: p.id, name: p.name, qty: 1, price: p.price }];
    fullItems   = [{ product: p, qty: 1 }];
    summaryHtml = p.name + ' &times; 1 &mdash; <strong>' + fmtPrice(p.price) + '</strong>';
    itemsBlock  = buildItemLine(p.id, p.name, 1, p.price);
  } else if (repeatOrderItems) {
    const items = repeatOrderItems;
    totalAmount = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    orderItems  = items.map(i => ({ id: i.product.id, name: i.product.name, qty: i.qty, price: i.product.price }));
    fullItems   = items;
    summaryHtml = items.map(i => i.product.name + ' &times;' + i.qty + ' &mdash; <strong>' + fmtPrice(i.product.price * i.qty) + '</strong>').join('<br>');
    items.forEach(i => { itemsBlock += buildItemLine(i.product.id, i.product.name, i.qty, i.product.price); });
  } else {
    const selected = getCheckedItems(); selectedIds = selected.map(i => i.id); totalAmount = getSelectedTotal();
    const g = {}; selected.forEach(i => { if (!g[i.seller]) g[i.seller] = { items: [] }; g[i.seller].items.push(i); });
    Object.entries(g).forEach(([, grp]) => { grp.items.forEach(p => { itemsBlock += buildItemLine(p.id, p.name, p.qty, p.price); }); });
    summaryHtml = selected.map(i => i.name + ' &times;' + i.qty + ' &mdash; <strong>' + fmtPrice(i.price * i.qty) + '</strong>').join('<br>');
    orderItems  = selected.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price }));
    fullItems   = selected.map(({ qty, ...prod }) => ({ product: prod, qty }));
  }

  // ── Apply coupon ─────────────────────────────────────
  const cuponDisc  = calcCouponDiscount(totalAmount);
  const finalTotal = totalAmount - cuponDisc;
  const cuponLine  = cuponDisc > 0
    ? ('\nCup\u00f3n ' + _appliedCoupon.code + ': -' + fmtPrice(cuponDisc))
    : '';
  itemsBlock += '\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501' + cuponLine + '\n*TOTAL: ' + fmtPrice(finalTotal) + '*\n\n';

  // ── WOMPI ──────────────────────────────────────────────
  if (pago === 'Wompi') {
    await submitWithWompi({ dir, nom, totalAmount: finalTotal, totalFmt: fmtPrice(finalTotal), itemsBlock, summaryHtml, selectedIds, bpId, items: orderItems, fullItems, couponCode: _appliedCoupon?.code || null, discountAmount: cuponDisc || null });
    return;
  }

  // ── WHATSAPP ────────────────────────────────────────────
  const msg = buildOrderMessage({ saludo: 'quiero hacer un pedido', itemsBlock, nom, dir, pago, cambio,
    mapLat: _deliveryLat, mapLng: _deliveryLng });

  saveOrderToHistory({
    id: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    date: new Date().toISOString(),
    type: 'whatsapp', pago, nombre: nom, direccion: dir,
    total: finalTotal, totalFmt: fmtPrice(finalTotal),
    items: orderItems, itemsBlock, summaryHtml,
    wompiRef: null, wompiId: null, wompiStatus: null,
  });

  _guestReadyPromise.finally(() => {
    postOrderToApi({
      fullItems,
      address: dir,
      paymentType: 'TRANSFERENCIA',
      couponCode: _appliedCoupon?.code || null,
      discountAmount: cuponDisc || null,
      lat: _deliveryLat,
      lng: _deliveryLng,
    });
  });

  const _orderCity = (
    (dir && String(dir).split(',')[0].trim()) ||
    (getCyUser().dir ? String(getCyUser().dir).split(',')[0].trim() : '') ||
    (typeof DELIVERY_CITY !== 'undefined' ? DELIVERY_CITY : '') ||
    'Desconocida'
  );
  trackEvent('ORDER_PLACED', { total: finalTotal, itemCount: orderItems.length, paymentType: 'whatsapp', city: _orderCity });

  // Record coupon use (fire-and-forget)
  if (_appliedCoupon?.code && !_isTesterModeEnabled()) {
    fetch(`${API_BASE}/api/coupons/use/${encodeURIComponent(_appliedCoupon.code)}`, { method: 'POST' }).catch(() => {});
  }

  // Marketing consent (fire-and-forget — async, never blocks checkout)
  if (document.getElementById('chkMarketing')?.checked && !_isTesterModeEnabled()) {
    fetch(`${API_BASE}/api/marketing-consents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, name: nom, channel: 'WHATSAPP' })
    }).catch(() => {});
  }

  buyNowProduct = null;
  repeatOrderItems = null;
  closeOrderPopup();

  const purchasedIds = bpId
    ? [bpId]
    : (selectedIds.length
        ? selectedIds
        : fullItems.map(i => i?.product?.id).filter(Boolean));
  removePurchasedFromCartByIds(purchasedIds);

  const waUrl = `https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`;
  if (waPopup && !waPopup.closed) {
    try {
      waPopup.location.href = waUrl;
    } catch (_) {
      const opened = window.open(waUrl, '_blank');
      if (!opened) window.location.href = waUrl;
    }
  } else {
    const opened = window.open(waUrl, '_blank');
    if (!opened) window.location.href = waUrl;
  }

  } catch (err) {
    console.error('[PideFácil] Error al procesar pedido:', err);
    if (waPopup && !waPopup.closed) {
      try { waPopup.close(); } catch (_) {}
    }
    _orderLoading(false);
    showToast('Ocurrió un error al enviar el pedido. Intenta de nuevo.', '❌');
  }
}

// ===== WOMPI =====
function updateOrderBtn() {
  const val = document.getElementById('inputPago')?.value || '';
  const btn = document.getElementById('btnSendOrder');
  if (!btn) return;
  const waIcon = `<svg viewBox="0 0 24 24" style="width:20px;height:20px"><path fill="#25D366" d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>`;
  if (val === 'Wompi') {
    btn.style.background = '#4f46e5';
    btn.innerHTML = `<svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> Continuar al pago con Wompi`;
  } else {
    btn.style.background = '';
    btn.innerHTML = waIcon + ' Enviar pedido por WhatsApp';
  }
}

async function submitWithWompi(od) {
  const ref         = 'PF-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const amountCents = Math.round(od.totalAmount * 100); // entero exacto, sin decimales flotantes

  trackEvent('WOMPI_START', { total: od.totalAmount, itemCount: od.orderItems?.length ?? 0 });

  console.log('[WOMPI-DBG] === submitWithWompi START ===');
  console.log('[WOMPI-DBG] env:         ', WOMPI.env);
  console.log('[WOMPI-DBG] publicKey:   ', WOMPI.publicKey);
  console.log('[WOMPI-DBG] currency:    ', WOMPI.currency);
  console.log('[WOMPI-DBG] ref:         ', ref);
  console.log('[WOMPI-DBG] totalAmount: ', od.totalAmount);
  console.log('[WOMPI-DBG] amountCents: ', amountCents);
  console.log('[WOMPI-DBG] API_BASE:    ', API_BASE);

  // El hash de integridad se genera en el backend para no exponer integrityKey en el cliente
  let hash;
  try {
    const reqBody = { ref, amountCents, currency: WOMPI.currency, env: WOMPI.env };
    console.log('[WOMPI-DBG] POST /api/wompi/signature body:', JSON.stringify(reqBody));
    const sigRes = await fetch(`${API_BASE}/api/wompi/signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reqBody),
    });
    console.log('[WOMPI-DBG] signature response status:', sigRes.status);
    const sigJson = await sigRes.json();
    console.log('[WOMPI-DBG] signature response body:', JSON.stringify(sigJson));
    if (!sigRes.ok) throw new Error('signature error: ' + JSON.stringify(sigJson));
    hash = sigJson.hash;
    console.log('[WOMPI-DBG] hash recibido: ', hash);
  } catch (e) {
    console.error('[WOMPI-DBG] Error obteniendo firma Wompi', e);
    showToast('Error iniciando pago. Intenta de nuevo.', 'error');
    return;
  }
  localStorage.setItem('cy_wompi_pending', JSON.stringify({ ref, od }));
  // Use clean redirect URL — Wompi appends its own params and may not preserve custom query params
  const redirectUrl = WOMPI.redirectUrl || window.location.origin + window.location.pathname;
  const url = `${WOMPI.checkoutUrl}?public-key=${encodeURIComponent(WOMPI.publicKey)}&currency=${WOMPI.currency}&amount-in-cents=${amountCents}&reference=${encodeURIComponent(ref)}&signature:integrity=${hash}&redirect-url=${encodeURIComponent(redirectUrl)}`;
  console.log('[WOMPI-DBG] URL final Wompi:');
  console.log('[WOMPI-DBG]', url);
  console.log('[WOMPI-DBG] === submitWithWompi END ===');
  buyNowProduct = null;
  closeOrderPopup();
  window.location.href = url;
}

function handleWompiReturn() {
  const sp = new URLSearchParams(window.location.search);
  const wompiId     = sp.get('id')               || '';
  const wompiStatus = (sp.get('status') || '').toLowerCase();
  const wompiAmount = sp.get('amount-in-cents')  || '';
  // Wompi always appends 'id' to the redirect URL — use it as the detection signal
  if (!wompiId) return;
  window.history.replaceState({}, document.title, window.location.pathname);
  const raw = localStorage.getItem('cy_wompi_pending');
  if (!raw) return;
  const pending = JSON.parse(raw);
  const enriched = { ...pending, wompiId, wompiStatus, wompiAmount };
  localStorage.setItem('cy_wompi_pending', JSON.stringify(enriched));
  const { od } = pending;
  document.getElementById('wompiResultRef').textContent     = 'Referencia: ' + pending.ref;
  document.getElementById('wompiResultSummary').innerHTML   = od.summaryHtml + `<br><br><strong>Total: ${od.totalFmt}</strong>`;
  document.getElementById('wompiResultName').textContent    = `Para: ${od.nom}  ·  ${od.dir}`;
  document.getElementById('wompiResultOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function confirmWompiPayment() {
  const raw = localStorage.getItem('cy_wompi_pending');
  if (!raw) { closeWompiResult(); return; }
  const pending = JSON.parse(raw);
  const { ref, od } = pending;

  saveOrderToHistory({
    id: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase(),
    date: new Date().toISOString(),
    type: 'wompi', pago: 'Wompi', nombre: od.nom, direccion: od.dir,
    total: od.totalAmount, totalFmt: od.totalFmt,
    items: od.items || [], itemsBlock: od.itemsBlock, summaryHtml: od.summaryHtml,
    wompiRef: ref, wompiId: pending.wompiId || null, wompiStatus: pending.wompiStatus || null,
  });

  localStorage.removeItem('cy_wompi_pending');

  postOrderToApi({ fullItems: od.fullItems || [], address: od.dir, paymentType: 'WOMPI', couponCode: od.couponCode || null, discountAmount: od.discountAmount || null });

  const statusLabel = pending.wompiStatus ? pending.wompiStatus.toUpperCase() : null;
  const savedLat = parseFloat(getCyUser().lat) || null;
  const savedLng = parseFloat(getCyUser().lng) || null;
  const msg = buildOrderMessage({
    saludo: 'confirmo mi pedido', itemsBlock: od.itemsBlock, nom: od.nom, dir: od.dir,
    pago: 'Wompi', wompiRef: ref, wompiId: pending.wompiId, statusLabel,
    mapLat: savedLat, mapLng: savedLng,
  });

  const purchasedIds = od.bpId
    ? [od.bpId]
    : (od.selectedIds?.length
        ? od.selectedIds
        : (od.fullItems || []).map(i => i?.product?.id).filter(Boolean));
  removePurchasedFromCartByIds(purchasedIds);
  // Record coupon use (fire-and-forget)
  if (_appliedCoupon?.code && !_isTesterModeEnabled()) {
    fetch(`${API_BASE}/api/coupons/use/${encodeURIComponent(_appliedCoupon.code)}`, { method: 'POST' }).catch(() => {});
  }
  closeWompiResult();
  const _orderCity = (
    (od.dir && String(od.dir).split(',')[0].trim()) ||
    (getCyUser().dir ? String(getCyUser().dir).split(',')[0].trim() : '') ||
    (typeof DELIVERY_CITY !== 'undefined' ? DELIVERY_CITY : '') ||
    'Desconocida'
  );
  trackEvent('ORDER_PLACED', { total: od.totalAmount, itemCount: od.orderItems?.length ?? 0, paymentType: 'wompi', city: _orderCity });
  window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  showToast('¡Pedido confirmado! Te contactaremos pronto 🙌', '');
}

function closeWompiResult() { document.getElementById('wompiResultOverlay').classList.remove('open'); document.body.style.overflow = ''; }

function cancelWompiPayment() {
  const raw     = localStorage.getItem('cy_wompi_pending');
  const pending = raw ? JSON.parse(raw) : null;
  localStorage.removeItem('cy_wompi_pending');
  closeWompiResult();
  if (!pending) return;
  const { od } = pending;
  setTimeout(() => {
    buyNowProduct = od.bpId ? (_productCache.get(od.bpId) || null) : null;
    openOrderPopup();
    setTimeout(() => {
      document.getElementById('inputDireccion').value = od.dir || '';
      document.getElementById('inputNombre').value    = od.nom || '';
    }, 150);
  }, 350);
}

// ===== BUY NOW =====
function buyNow(id) {
  buyNowProduct = _productCache.get(id);
  const p = buyNowProduct;
  document.getElementById('orderSummary').innerHTML = _buildOspTable([{seller: null, items: [{name: p.name, qty: 1, total: p.price, image: p.image}]}]);
  _setSummaryTotal(p.price);
  const _cu2 = getCyUser();
  document.getElementById('inputDireccion').value   = _cu2.dir  || '';
  document.getElementById('inputNombre').value      = _cu2.name || '';
  const _bpsel = document.getElementById('inputPago');
  _bpsel.innerHTML = `<option value="">-- Seleccionar --</option>${WOMPI.enabled ? '<option value="Wompi">💳 Tarjeta / PSE (Wompi)</option>' : ''}<option value="Transferencia">🏦 Transferencia bancaria</option>`;
  _bpsel.value = '';
  document.getElementById('inputCambio').value = '';
  document.getElementById('cambioWrap').style.display = 'none';
  const _chkCupon2 = document.getElementById('chkCupon');
  if (_chkCupon2) { _chkCupon2.checked = false; document.getElementById('cuponWrap').style.display = 'none'; }
  document.getElementById('inputCupon').value = '';
  document.getElementById('cuponFeedback').textContent = ''; document.getElementById('cuponFeedback').className = 'cupon-feedback';
  _appliedCoupon = null;
  const _panel2 = document.getElementById('orderSummaryPanel');
  if (_panel2) _panel2.removeAttribute('open');
  updateOrderBtn();
  document.getElementById('orderOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';

  // Use saved confirmed coords if available, otherwise fall back to geocoding the address text
  const savedDir2 = _cu2.dir || '';
  resetMapState();
  const mapWrap2 = document.getElementById('mapConfirmWrap');
  if (mapWrap2) mapWrap2.style.display = MAPS_ENABLED ? '' : 'none';
  if (!_useSavedCoordsForMap() && savedDir2) { _lastGeoDir = ''; setTimeout(() => geocodeAddress(savedDir2), 400); }
}

// ===== CART PANEL =====
function openCart()  {
  document.getElementById('cartOverlay').classList.add('open');
  document.getElementById('cartPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Async zone check — re-renders panel once we know which items are unavailable
  _refreshCartZoneUnavail();
}
async function _refreshCartZoneUnavail() {
  if (!cart.length || !_geoCoords) {
    // All available: restore any previously-unchecked zone items
    cart.forEach(i => checkedItems.add(i.id));
    _cartZoneUnavailIds = new Set();
    saveCart(); renderCartPanel(); return;
  }
  const ids = cart.map(i => i.id);
  const unavail = await _checkZoneAvail(ids);
  const prev = _cartZoneUnavailIds;
  // Items that just became available again → re-check them
  prev.forEach(id => { if (!unavail.has(id)) checkedItems.add(id); });
  // Items that just became unavailable → uncheck so they don’t slip into the order
  unavail.forEach(id => checkedItems.delete(id));
  _cartZoneUnavailIds = unavail;
  saveCart();
  renderCartPanel();
}
function closeCart() { document.getElementById('cartOverlay').classList.remove('open'); document.getElementById('cartPanel').classList.remove('open'); document.body.style.overflow = ''; }

// ===== WISH PANEL =====
function openWish() {
  renderWishPanel();
  document.getElementById('wishOverlay').classList.add('open');
  document.getElementById('wishPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeWish() {
  document.getElementById('wishOverlay').classList.remove('open');
  document.getElementById('wishPanel').classList.remove('open');
  document.body.style.overflow = '';
}
function clearWish() {
  if (!wishlist.length) return;
  wishlist = [];
  localStorage.setItem('cy_wish', JSON.stringify(wishlist));
  updateWishUI(); renderWishPanel(); renderOffers(); applyFilters();
  showToast('Favoritos borrados', '🗑️');
}
function updateWishUI() {
  const n     = wishlist.length;
  const badge = document.getElementById('wishBadge');
  badge.textContent = n;
  badge.classList.toggle('visible', n > 0);
  const pill = document.getElementById('wishCountPill');
  if (pill) pill.textContent = n;
  const btnClear = document.getElementById('btnClearWish');
  if (btnClear) btnClear.style.display = n ? 'flex' : 'none';
  const hb  = document.getElementById('hamBadge');
  const hwc = document.getElementById('hamWishCount');
  if (hb)  { hb.textContent = n;  hb.classList.toggle('visible', n > 0); }
  if (hwc) { hwc.textContent = n; hwc.classList.toggle('visible', n > 0); }
}
async function renderWishPanel() {
  const container = document.getElementById('wishItems');
  if (!wishlist.length) {
    container.innerHTML = `<div class="wish-empty"><div class="wish-empty-icon">🤍</div><p>Aún no tienes favoritos</p><p style="font-size:11px;text-align:center">Toca el corazón en cualquier producto para guardarlo aquí</p></div>`;
    return;
  }
  const _wMissing = wishlist.filter(id => !_productCache.has(id));
  if (_wMissing.length) {
    try {
      const _wr = await fetch(`${API_BASE}/api/products/pidefacil/by-ids`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_wMissing)
      });
      if (_wr.ok) _cacheProducts(await _wr.json());
    } catch (_) {}
  }
  // Check zone availability for all wishlist items at once
  const unavailIds = await _checkZoneAvail([...wishlist]);
  container.innerHTML = wishlist.map(id => {
    const p = _productCache.get(id);
    if (!p) return '';
    const inCart = cart.some(c => c.id === id);
    const zoneUnavail = unavailIds.has(id);
    if (zoneUnavail) {
      return `<div class="wish-item wish-item--zone-unavail">
      <img class="wish-item-img" src="${p.image}" alt="${p.name}" width="80" height="80" loading="lazy" decoding="async" onclick="closeWish();openProduct('${p.id}')">
      <div class="wish-item-info">
        <div class="wish-item-name" onclick="closeWish();openProduct('${p.id}')">${p.name}</div>
        <div style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap">
          <span class="wish-item-price">${fmtPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="wish-item-old">${fmtPrice(p.oldPrice)}</span>` : ''}
        </div>
        <div class="wish-item-zone-badge">📍 No disponible en tu zona</div>
        <div class="wish-item-actions">
          <button class="wish-btn-remove" title="Quitar de favoritos" aria-label="Quitar de favoritos" onclick="toggleWish(event,'${p.id}');">💔</button>
        </div>
      </div>
    </div>`;
    }
    return `<div class="wish-item">
      <img class="wish-item-img" src="${p.image}" alt="${p.name}" width="80" height="80" loading="lazy" decoding="async" onclick="closeWish();openProduct('${p.id}')">
      <div class="wish-item-info">
        <div class="wish-item-name" onclick="closeWish();openProduct('${p.id}')">${p.name}</div>
        <div style="display:flex;align-items:baseline;gap:4px;flex-wrap:wrap">
          <span class="wish-item-price">${fmtPrice(p.price)}</span>
          ${p.oldPrice ? `<span class="wish-item-old">${fmtPrice(p.oldPrice)}</span>` : ''}
        </div>
        <div class="wish-item-actions">
          <button class="wish-btn-buy" onclick="closeWish();buyNow('${p.id}')">
            ⚡ Pedir ahora
          </button>
          <button class="wish-btn-cart ${inCart ? 'added' : ''}" onclick="addToCart('${p.id}', event);renderWishPanel()">
            ${inCart ? '✓ En carrito' : '🛒 Al carrito'}
          </button>
          <button class="wish-btn-remove" title="Quitar de favoritos" aria-label="Quitar de favoritos" onclick="toggleWish(event,'${p.id}');">💔</button>
        </div>
      </div>
    </div>`;
  }).join('');
  updateWishUI();
}

// ===== WISHLIST =====
function toggleWish(e, id) {
  e.stopPropagation();
  const i = wishlist.indexOf(id);
  const _wp = PRODUCTS.find(x => x.id === id);
  const _wn = _wp?.name ?? null;
  if (i > -1) { wishlist.splice(i, 1); showToast('Eliminado de favoritos', '💔'); trackEvent('WISH_REMOVE', { productId: id, name: _wn }); }
  else         { wishlist.push(id);     showToast('Guardado en favoritos',   '❤️'); trackEvent('WISH_ADD',    { productId: id, name: _wn }); }
  localStorage.setItem('cy_wish', JSON.stringify(wishlist));
  updateWishUI();
  // Update heart buttons in-place — no grid re-render needed
  const inWish = wishlist.includes(id);
  document.querySelectorAll(`.card-wishlist[data-wish-id="${id}"]`).forEach(btn => {
    btn.classList.toggle('active', inWish);
    const svg = btn.querySelector('svg');
    if (svg) svg.setAttribute('fill', inWish ? 'var(--primary)' : 'none');
  });
  const mBtn = document.getElementById('modalWishBtn');
  if (mBtn) {
    mBtn.className = `btn btn-wish${inWish ? ' active' : ''}`;
    mBtn.setAttribute('style', 'width:100%;padding:12px;font-size:14px');
    const txt = document.getElementById('modalWishText');
    if (txt) txt.textContent = inWish ? 'En favoritos' : 'Guardar en favoritos';
    mBtn.querySelector('svg').setAttribute('fill',   inWish ? '#fff' : 'none');
    mBtn.querySelector('svg').setAttribute('stroke', inWish ? '#fff' : 'var(--primary)');
  }
  if (document.getElementById('wishPanel').classList.contains('open')) renderWishPanel();
}

// ===== PRODUCT MODAL =====
async function _handleCollectionDeepLink() {
  const slug = new URLSearchParams(location.search).get('c');
  if (!slug) return;
  try {
    const res = await fetch(`${API_BASE}/api/collections/slug/${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const col = await res.json();
    openBannerPopup('collection:' + slug, col.title || slug);
  } catch (_) {}
}

function _handleProductDeepLink() {
  const id = new URLSearchParams(location.search).get('p');
  if (!id) return;
  const isShort = id.length <= 8;
  const found = isShort
    ? [..._productCache.values()].find(x => x.id.startsWith(id))
    : _productCache.get(id);
  if (found) { openProduct(found.id); return; }
  const url = isShort
    ? `${API_BASE}/api/products/resolve/${id}`
    : `${API_BASE}/api/products/${id}`;
  fetch(url)
    .then(r => r.ok ? r.json() : null)
    .then(raw => { if (raw) { const p = normalizeProduct(raw); _productCache.set(p.id, p); openProduct(p.id); } })
    .catch(() => {});
}

async function _handleOrderDeepLink() {
  const orderId = new URLSearchParams(location.search).get('pedido');
  if (!orderId) return;
  const cached = (window._apiOrdersHistory || []).find(o => o.id === orderId);
  if (cached) { openOrderDetail(window._apiOrdersHistory.indexOf(cached)); return; }
  try {
    const res = await fetch(`${API_BASE}/api/orders/${orderId}`);
    if (!res.ok) return;
    const ord = await res.json();
    window._apiOrdersHistory = [ord, ...(window._apiOrdersHistory || [])];
    openOrderDetail(0);
  } catch (_) {}
}

async function openProduct(id) {
  closeBannerPopup();
  let p = _productCache.get(id);
  if (!p) {
    try {
      const _r = await fetch(`${API_BASE}/api/products/${id}`);
      if (_r.ok) { p = normalizeProduct(await _r.json()); _productCache.set(p.id, p); }
    } catch (_) {}
  }
  if (!p) return;
  trackRecent(id);
  history.replaceState(null, '', '?p=' + id);
  trackEvent('PRODUCT_VIEW', { productId: p.id, name: p.name, category: p.category, price: p.price });
  const inWish = wishlist.includes(id);
  const similar = [..._productCache.values()].filter(x => x.category === p.category && x.id !== id).slice(0, 20);
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-grid">
      <div class="modal-gallery">
        <img class="modal-main-img" id="modalMainImg" src="${p.image}" alt="${p.name}" decoding="async">
      </div>
      <div class="modal-info">
        <div class="modal-seller">${typeof STORE_NAME !== 'undefined' ? STORE_NAME : 'PideFácil'}</div>
        <h2 class="modal-name">${p.name}</h2>
        <div class="modal-price-wrap">
          <span class="modal-price">${fmtPrice(p.price)}</span>
          ${p.oldPrice && p.oldPrice > p.price ? `<span class="modal-old">${fmtPrice(p.oldPrice)}</span><span class="modal-off">-${calcDiscount(p)}%</span>` : ''}
        </div>
        ${p.stock === 'low' ? '<div class="low-stock" style="font-size:12px">⚠️ Últimas unidades</div>' : ''}
        ${buildModalDesc(p.description)}
        <p class="modal-ref">REF: ${p.id.substring(0, 8).toUpperCase()}</p>
        <div class="modal-actions">
          <button class="btn btn-cart" style="width:100%;padding:12px;font-size:14px" onclick="addToCart('${p.id}', event);closeModal()">Agregar al carrito</button>
          <button class="btn btn-wa" style="width:100%;padding:12px;font-size:14px" onclick="buyNow('${p.id}')">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px"><path fill="#25D366" d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            Comprar por WhatsApp
          </button>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:2px">
            <button class="btn btn-wish ${inWish ? 'active' : ''}" id="modalWishBtn" style="padding:9px 8px;font-size:12.5px;justify-content:center;gap:6px" onclick="toggleWish(event,'${p.id}')">
              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" stroke-width="2" fill="${inWish ? 'currentColor' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span id="modalWishText">${inWish ? 'En favoritos' : 'Favoritos'}</span>
            </button>
            <button style="display:flex;align-items:center;justify-content:center;gap:6px;padding:9px 8px;font-size:12.5px;font-family:inherit;font-weight:600;background:var(--bg);border:1.5px solid var(--border);color:var(--text-secondary);border-radius:var(--radius-md);cursor:pointer" onclick="shareProduct('${p.id}')">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              Compartir
            </button>
          </div>
        </div>
      </div>
    </div>
    ${similar.length ? `<div class="similar-title"><span>Productos similares</span><span class="similar-more" onclick="scrollSimilar(1)">Ver más <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></div><div class="similar-nav"><button class="similar-nav-btn similar-nav-prev" onclick="scrollSimilar(-1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg></button><div class="similar-scroll" id="similarScroll">${similar.map(s => buildMiniCard(s)).join('')}</div><button class="similar-nav-btn similar-nav-next" onclick="scrollSimilar(1)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg></button></div>` : ''}`;
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  initModalZoom();
}
// ===== IMAGE HOVER ZOOM (desktop only) =====
function initModalZoom() {
  const hoverOK = window.matchMedia('(hover:hover)').matches;
  if (!hoverOK) return;
  setTimeout(() => {
    const gallery = document.querySelector('.modal-gallery');
    const img     = document.querySelector('.modal-main-img');
    if (!gallery || !img) { console.warn('[zoom] elementos no encontrados, abortando'); return; }
    const SCALE = 2.5;
    // Warm-up: instant zoom-in + zoom-out off-screen to force GPU rasterization at full res
    img.style.willChange = 'transform';
    img.style.transition = 'none';
    img.style.transform = `scale(${SCALE})`;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        img.style.transform = 'scale(1)';
      });
    });
    gallery.addEventListener('mouseenter', () => {
      gallery.classList.add('zooming');
    });
    gallery.addEventListener('mousemove', e => {
      const r  = img.getBoundingClientRect();
      const xp = Math.min(100, Math.max(0, (e.clientX - r.left) / r.width  * 100)).toFixed(2);
      const yp = Math.min(100, Math.max(0, (e.clientY - r.top)  / r.height * 100)).toFixed(2);
      img.style.transformOrigin = `${xp}% ${yp}%`;
      img.style.transform = `scale(${SCALE})`;
    });
    gallery.addEventListener('mouseleave', () => {
      gallery.classList.remove('zooming');
      img.style.transform = 'scale(1)';
      img.style.transformOrigin = '50% 50%';
    });
  }, 50);
}

function buildModalDesc(text) {
  if (!text || text.length <= 180) return `<p class="modal-desc">${text || ''}</p>`;
  return `<p class="modal-desc modal-desc-collapsed" id="modalDescEl">${text}</p><button class="btn-modal-desc-more" id="modalDescToggle" onclick="toggleModalDesc()">Ver más ▾</button>`;
}
function toggleModalDesc() {
  const el  = document.getElementById('modalDescEl');
  const btn = document.getElementById('modalDescToggle');
  const collapsed = el.classList.toggle('modal-desc-collapsed');
  btn.style.opacity = '0';
  setTimeout(() => { btn.textContent = collapsed ? 'Ver más ▾' : 'Ver menos ▴'; btn.style.opacity = '1'; }, 200);
}
function scrollSimilar(dir) {
  const el   = document.getElementById('similarScroll'); if (!el) return;
  const card = el.querySelector('.mini-card');
  el.scrollBy({ left: dir * ((card ? card.offsetWidth : 130) + 10) * 3, behavior: 'smooth' });
}
function switchThumb(el, src) {
  document.querySelectorAll('.modal-thumb').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  const img = document.getElementById('modalMainImg');
  img.style.opacity = '0';
  setTimeout(() => { img.src = src; img.style.opacity = '1'; }, 180);
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
  // Restore ?cat= if active, otherwise clean to pathname
  const catParam = currentCategory && currentCategory !== 'all'
    ? '?cat=' + encodeURIComponent(currentCategory) : location.pathname;
  history.replaceState(null, '', catParam);
}

function shareProduct(id) {
  const p = _productCache.get(id);
  if (!p) return;
  const base = window.location.origin + window.location.pathname;
  const link = base + '?p=' + id.substring(0, 8);
  const text = `¡Mira este producto en PideFácil! 🛍️\n*${p.name}* — ${fmtPrice(p.price)}\n${link}`;
  if (navigator.share) {
    navigator.share({ title: p.name, text: `${p.name} — ${fmtPrice(p.price)}`, url: link }).catch(() => {});
  } else {
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
  }
}
function handleModalClick(e) { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

// ===== REQUEST PRODUCT =====
function openRequestModal(q) {
  const query = q || lastSearchQuery || '';
  const ta = document.getElementById('reqDesc');
  const ni = document.getElementById('reqName');
  if (ta) { ta.value = query; ta.classList.remove('req-error'); }
  if (ni) { ni.value = ''; ni.classList.remove('req-error'); }
  closeSearchDropdown();
  document.getElementById('reqOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => ta && ta.focus(), 350);
}
function closeRequestModal() { document.getElementById('reqOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function handleReqOverlayClick(e) { if (e.target.id === 'reqOverlay') closeRequestModal(); }
function submitProductRequest() {
  const ta   = document.getElementById('reqDesc');
  const ni   = document.getElementById('reqName');
  const desc = ta.value.trim();
  if (!desc) { ta.classList.add('req-error'); ta.focus(); setTimeout(() => ta.classList.remove('req-error'), 600); return; }
  const name = ni.value.trim();
  let msg = `¡Hola! Estoy buscando un producto que no encontré en el catálogo:\n\n*${desc}*`;
  if (name) msg += `\n\nMi nombre: ${name}`;
  msg += `\n\n¿Me pueden ayudar a conseguirlo?`;
  window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
  closeRequestModal();
  showToast('¡Solicitud enviada! Te contactamos pronto 🙌', '');
}

// ===== TOAST =====
function showToast(msg, icon = '') {
  const w = document.getElementById('toastContainer'), t = document.createElement('div');
  t.className = 'toast'; t.innerHTML = `${icon} ${msg}`; w.appendChild(t);
  setTimeout(() => { t.classList.add('removing'); setTimeout(() => t.remove(), 300); }, 2200);
}
function bumpBadge() { const b = document.getElementById('cartBadge'); b.classList.add('bump'); setTimeout(() => b.classList.remove('bump'), 400); }

// ===== ORDER HISTORY =====
function ordStatusChip(record) {
  if (record.type === 'wompi' || record.pago === 'Wompi') {
    const s = (record.wompiStatus || '').toLowerCase();
    if (s === 'approved') return `<span class="ord-status-chip osc-approved">✅ APROBADO</span>`;
    if (s === 'pending')  return `<span class="ord-status-chip osc-pending">⏳ EN PROCESO</span>`;
    if (s === 'declined' || s === 'voided') return `<span class="ord-status-chip osc-declined">❌ RECHAZADO</span>`;
    return `<span class="ord-status-chip osc-pending">💳 WOMPI</span>`;
  }
  return ''; // Sin badge para pedidos WhatsApp
}

function toggleOrdCard(el) {
  const card = el.closest('.ord-card');
  const body = card.querySelector('.ord-card-collapsible');
  const btn  = card.querySelector('.ord-toggle-btn');
  const open = body.style.display === 'block';
  body.style.display = open ? 'none' : 'block';
  btn.classList.toggle('open', !open);
}

function renderOrdersHistory() {
  // Shows loading state; actual data fetched in openOrdersHistory
}

async function _fetchAndRenderOrders() {
  const body     = document.getElementById('ordersBody');
  const pill     = document.getElementById('ordersCountPill');
  const clearBtn = document.getElementById('btnClearOrders');
  if (clearBtn) clearBtn.style.display = 'none';

  const cu = getCyUser();
  const buyerId = cu?.id;
  if (!buyerId) {
    if (pill) pill.textContent = '0';
    body.innerHTML = `<div class="orders-empty">
      <div class="orders-empty-icon">📋</div>
      <p style="font-weight:600;font-family:var(--font-head)">Sin pedidos aún</p>
      <p style="font-size:11px;text-align:center;max-width:240px;line-height:1.6">Cuando hagas tu primer pedido, aparecerá aquí con todos los detalles.</p>
    </div>`;
    return;
  }

  body.innerHTML = `<div class="orders-empty"><div class="orders-empty-icon" style="font-size:28px">⏳</div><p style="font-weight:600">Cargando pedidos…</p></div>`;

  let hist = [];
  try {
    const res = await fetch(`${API_BASE}/api/orders/buyer/${buyerId}`);
    if (res.ok) hist = await res.json();
  } catch (e) {
    // fall through to empty state
  }

  if (pill) pill.textContent = hist.length;

  if (!hist.length) {
    body.innerHTML = `<div class="orders-empty">
      <div class="orders-empty-icon">📋</div>
      <p style="font-weight:600;font-family:var(--font-head)">Sin pedidos aún</p>
      <p style="font-size:11px;text-align:center;max-width:240px;line-height:1.6">Cuando hagas tu primer pedido, aparecerá aquí con todos los detalles.</p>
    </div>`;
    return;
  }

  const statusChip = (s) => {
    const map = {
      CONFIRMADO:              `<span class="ord-status-chip osc-approved">✅ CONFIRMADO</span>`,
      PENDIENTE:               `<span class="ord-status-chip osc-pending">⏳ PENDIENTE</span>`,
      CANCELADO:               `<span class="ord-status-chip osc-declined">❌ CANCELADO</span>`,
      CANCELADO_AUTOMATICAMENTE: `<span class="ord-status-chip osc-declined">❌ CANCELADO</span>`,
      ENVIADO:                 `<span class="ord-status-chip osc-approved">🚚 ENVIADO</span>`,
      RECIBIDO:                `<span class="ord-status-chip osc-approved">📦 RECIBIDO</span>`
    };
    return map[s] ?? `<span class="ord-status-chip osc-pending">${s}</span>`;
  };

  body.innerHTML = hist.map((ord, idx) => {
    const items     = ord.products ?? [];
    const total     = items.reduce((s, p) => s + (p.unitPrice != null ? Number(p.unitPrice) : (p.product?.price ?? 0)) * (p.quantity ?? 1), 0);
    const itemsHtml = items.length
      ? items.map(p => `<div class="ord-item-row"><span class="ord-item-name">${p.product?.name ?? '—'} ×${p.quantity}</span><span class="ord-item-price">$${((p.unitPrice != null ? Number(p.unitPrice) : (p.product?.price ?? 0)) * p.quantity).toLocaleString('es-CO')}</span></div>`).join('')
      : `<div style="font-size:12px;color:var(--text-muted)">Sin detalle</div>`;
    const displayRef = 'Ref: ' + (ord.id ?? '').substring(0, 8) + ': ';
    return `<div class="ord-card">
      <div class="ord-card-head" onclick="toggleOrdCard(this)">
        <div style="flex:1;min-width:0">
          <div class="ord-card-ref">${displayRef} <span style="font-weight:800;color:var(--primary)">$${total.toLocaleString('es-CO')}</span></div>
          <div class="ord-card-date">${fmtDateOrder(ord.createdAt)}</div>
        </div>
        ${statusChip(ord.status)}
        <button class="ord-toggle-btn" onclick="toggleOrdCard(this)" title="Ver / ocultar detalles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="ord-card-collapsible">
        <div class="ord-card-items">
          ${itemsHtml}
          <div class="ord-total-row"><span>Total</span><span>$${total.toLocaleString('es-CO')}</span></div>
        </div>
        <div class="ord-card-info">
          <div class="ord-info-row"><span class="ord-info-icon">👤</span><span>${ord.buyer?.name ?? '—'}</span></div>
          <div class="ord-info-row"><span class="ord-info-icon">📍</span><span>${ord.address ?? '—'}</span></div>
          <div class="ord-info-row"><span class="ord-info-icon">💳</span><span>${ord.paymentType ?? '—'}</span></div>
        </div>
        <div class="ord-card-actions">
          <button class="btn-repeat-order" onclick="repeatOrderFromApi(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Repetir pedido
          </button>
          <button class="btn-repeat-order" style="border-color:var(--border);color:var(--text-secondary);margin-top:4px" onclick="openOrderDetail(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Ver detalle completo
          </button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Store for repeatOrderFromApi lookup
  window._apiOrdersHistory = hist;
}

function openOrderDetail(idx) {
  const hist = window._apiOrdersHistory || [];
  const ord  = hist[idx];
  if (!ord) return;

  const items = ord.products ?? [];
  const total = items.reduce((s, p) => s + (p.unitPrice != null ? Number(p.unitPrice) : (p.product?.price ?? 0)) * (p.quantity ?? 1), 0);

  const statusChip = (s) => {
    const map = {
      CONFIRMADO:              `<span class="ord-status-chip osc-approved">✅ CONFIRMADO</span>`,
      PENDIENTE:               `<span class="ord-status-chip osc-pending">⏳ PENDIENTE</span>`,
      CANCELADO:               `<span class="ord-status-chip osc-declined">❌ CANCELADO</span>`,
      CANCELADO_AUTOMATICAMENTE:`<span class="ord-status-chip osc-declined">❌ CANCELADO</span>`,
      ENVIADO:                 `<span class="ord-status-chip osc-approved">🚚 ENVIADO</span>`,
      RECIBIDO:                `<span class="ord-status-chip osc-approved">📦 RECIBIDO</span>`
    };
    return map[s] ?? `<span class="ord-status-chip osc-pending">${s}</span>`;
  };

  const itemsHtml = items.length
    ? items.map(p => {
        const price = (p.unitPrice != null ? Number(p.unitPrice) : (p.product?.price ?? 0));
        const img   = p.product?.image
          ? `<img class="ord-detail-item-img" src="${p.product.image}" alt="" loading="lazy">`
          : `<div class="ord-detail-item-img" style="display:flex;align-items:center;justify-content:center;font-size:18px">📦</div>`;
        return `<div class="ord-detail-item-row">
          ${img}
          <span class="ord-detail-item-name">${p.product?.name ?? '—'}</span>
          <span class="ord-detail-item-qty">×${p.quantity}</span>
          <span class="ord-detail-item-price">$${(price * p.quantity).toLocaleString('es-CO')}</span>
        </div>`;
      }).join('')
    : `<div style="font-size:12px;color:var(--text-muted)">Sin detalle de productos</div>`;

  document.getElementById('ordDetailTitle').textContent = `Pedido del ${fmtDateOrder(ord.createdAt)}`;
  document.getElementById('ordDetailRef').textContent   = 'Ref: ' + (ord.id ?? '').toUpperCase();

  document.getElementById('ordDetailBody').innerHTML = `
    <div class="ord-detail-section">
      <div class="ord-detail-section-title">Estado</div>
      <div class="ord-detail-status-row">
        ${statusChip(ord.status)}
        <span style="font-size:12px;color:var(--text-muted)">${fmtDateOrder(ord.createdAt)}</span>
      </div>
    </div>
    <div class="ord-detail-section">
      <div class="ord-detail-section-title">Productos (${items.length})</div>
      ${itemsHtml}
      <div class="ord-detail-total-row"><span>Total</span><span>$${total.toLocaleString('es-CO')}</span></div>
    </div>
    <div class="ord-detail-section">
      <div class="ord-detail-section-title">Datos de entrega</div>
      <div class="ord-detail-info-row"><span class="ord-detail-info-icon">👤</span><span>${ord.buyer?.name ?? '—'}</span></div>
      <div class="ord-detail-info-row"><span class="ord-detail-info-icon">📞</span><span>${ord.buyer?.phone ?? ord.buyerPhone ?? '—'}</span></div>
      <div class="ord-detail-info-row"><span class="ord-detail-info-icon">📍</span><span>${ord.address ?? '—'}</span></div>
      <div class="ord-detail-info-row"><span class="ord-detail-info-icon">💳</span><span>${ord.paymentType ?? '—'}</span></div>
      ${ord.notes ? `<div class="ord-detail-info-row"><span class="ord-detail-info-icon">💬</span><span>${ord.notes}</span></div>` : ''}
    </div>`;

  document.getElementById('ordDetailFooter').innerHTML = `
    <button class="btn-ord-detail-repeat" onclick="closeOrderDetail();repeatOrderFromApi(${idx})">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
      Repetir este pedido
    </button>
    <button class="btn-ord-detail-repeat" style="border-color:var(--border);color:var(--text-secondary)" onclick="_copyOrderLink('${ord.id}')">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      Copiar enlace del pedido
    </button>`;

  const overlay = document.getElementById('ordDetailOverlay');
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Push deep-link URL so it can be shared
  const sp = new URLSearchParams(location.search);
  sp.set('pedido', ord.id);
  history.pushState({pedido: ord.id}, '', `${location.pathname}?${sp}`);
}

function closeOrderDetail() {
  const overlay = document.getElementById('ordDetailOverlay');
  if (overlay) overlay.classList.remove('open');
  document.body.style.overflow = 'hidden'; // orders panel still open
  // Remove deep-link param from URL without adding a history entry
  const sp = new URLSearchParams(location.search);
  sp.delete('pedido');
  const newUrl = sp.toString() ? `${location.pathname}?${sp}` : location.pathname;
  history.replaceState(null, '', newUrl);
}

function _copyOrderLink(orderId) {
  const sp = new URLSearchParams(location.search);
  sp.set('pedido', orderId);
  const url = `${location.origin}${location.pathname}?${sp}`;
  navigator.clipboard.writeText(url)
    .then(() => showToast('Enlace copiado', '🔗'))
    .catch(() => {
      // Fallback for browsers without clipboard API
      const ta = document.createElement('textarea');
      ta.value = url; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Enlace copiado', '🔗');
    });
}

function openOrdersHistory() {
  document.getElementById('ordersOverlay').classList.add('open');
  document.getElementById('ordersPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
  _fetchAndRenderOrders();
}

async function repeatOrderFromApi(idx) {
  const hist = window._apiOrdersHistory || [];
  const ord  = hist[idx];
  if (!ord) return;

  const _pIds     = (ord.products ?? []).map(p => p.product?.id).filter(Boolean);
  const _rMissing = _pIds.filter(id => !_productCache.has(id));
  if (_rMissing.length) {
    try {
      const _rr = await fetch(`${API_BASE}/api/products/pidefacil/by-ids`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(_rMissing)
      });
      if (_rr.ok) _cacheProducts(await _rr.json());
    } catch (_) {}
  }

  const items = (ord.products ?? []).reduce((acc, p) => {
    const product = _productCache.get(p.product?.id);
    if (product) acc.push({ product, qty: p.quantity ?? 1 });
    return acc;
  }, []);

  if (!items.length) { showToast('Los productos de este pedido ya no están disponibles', '⚠️'); return; }

  repeatOrderItems = items;
  closeOrdersHistory();
  setTimeout(() => {
    openOrderPopup();
    setTimeout(() => {
      if (ord.address) document.getElementById('inputDireccion').value = ord.address;
      if (ord.buyer?.name) document.getElementById('inputNombre').value = ord.buyer.name;
    }, 150);
  }, 300);
}

function repeatOrder(idx) { repeatOrderFromApi(idx); }

function closeOrdersHistory() {
  document.getElementById('ordersOverlay').classList.remove('open');
  document.getElementById('ordersPanel').classList.remove('open');
  document.body.style.overflow = '';
}
function clearOrdersHistory() {
  // Orders are now stored in the backend — nothing to clear locally
}

// ===== THEME =====
function applySavedTheme() {
  const t = localStorage.getItem('cy_theme');
  if (t) document.documentElement.dataset.theme = t;
  syncThemeIcon();
}
function syncThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  // dropdown icons
  const ms = document.getElementById('moreIconSun'),  mm = document.getElementById('moreIconMoon');
  if (ms) ms.style.display = dark ? 'block' : 'none';
  if (mm) mm.style.display = dark ? 'none'  : 'block';
  syncHamThemeIcons();
}
function syncHamThemeIcons() {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  const sun  = document.getElementById('hamIconSun');
  const moon = document.getElementById('hamIconMoon');
  if (sun)  sun.style.display  = dark ? 'block' : 'none';
  if (moon) moon.style.display = dark ? 'none'  : 'block';
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme === 'dark';
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  localStorage.setItem('cy_theme', document.documentElement.dataset.theme);
  syncThemeIcon();
}

// ===== BANNER POPUP =====
async function openBannerPopup(filter, title) {
  document.getElementById('bnrPopupTitle').textContent = title;
  document.getElementById('bnrPopupGrid').innerHTML    = Array(4).fill(0).map(buildSkeleton).join('');
  document.getElementById('bnrPopupOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  let products = [];
  try {
    if (filter === 'offer') {
      const _geoOffer = _geoCoords ? `&lat=${_geoCoords.lat}&lng=${_geoCoords.lng}` : '';
      const _or = await fetch(`${API_BASE}/api/products/pidefacil/offers?page=0&size=50${_geoOffer}`);
      if (_or.ok) products = _cacheProducts((await _or.json()).content);
    } else if (filter && filter.startsWith('collection:')) {
      const slug = filter.slice('collection:'.length);
      // UNA SOLA PETICIÓN que devuelve colección + todos los productos
      const _colRes = await fetch(`${API_BASE}/api/collections/slug/${encodeURIComponent(slug)}/with-products`);
      if (_colRes.ok) {
        const col = await _colRes.json();
        if (col.products && col.products.length) {
          products = col.products.map(r => { const p = normalizeProduct(r); _productCache.set(p.id, p); return p; });
        }
      }
    } else {
      const _geoCat = _geoCoords ? `&lat=${_geoCoords.lat}&lng=${_geoCoords.lng}` : '';
      const _cr = await fetch(`${API_BASE}/api/products/pidefacil/paged?category=${encodeURIComponent(filter)}&page=0&size=50${_geoCat}`);
      if (_cr.ok) products = _cacheProducts((await _cr.json()).content);
    }
  } catch (_) {}
  document.getElementById('bnrPopupGrid').innerHTML = products.length
    ? products.map(p => buildCard(p)).join('')
    : '<p style="text-align:center;padding:24px;color:var(--text-muted)">No hay productos en esta colección.</p>';
}
function closeBannerPopup() { document.getElementById('bnrPopupOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function handleBnrPopupClick(e) { if (e.target === document.getElementById('bnrPopupOverlay')) closeBannerPopup(); }

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); closeOrderPopup(); closeBannerPopup(); closeSearchDropdown(); closeMoreMenu(); closePromoPopup(); } });

// ===== MORE MENU =====
function _updateUserGreeting() {
  const cu   = getCyUser();
  const name = cu?.name;
  const hasId = !!cu?.id;
  const firstName = name ? name.split(' ')[0] : null;

  // More-menu dropdown greeting
  const mmWrap = document.getElementById('moreMenuUserGreeting');
  if (mmWrap) {
    const nameEl   = document.getElementById('moreMenuGreetName');
    const avatarEl = document.getElementById('moreMenuGreetAvatar');
    if (firstName) {
      if (nameEl)   nameEl.textContent   = 'Hola, ' + firstName + '!';
      if (avatarEl) { avatarEl.textContent = firstName[0].toUpperCase(); avatarEl.style.display = 'flex'; }
      mmWrap.style.display = 'block';
    } else {
      if (nameEl)   nameEl.textContent   = '';
      if (avatarEl) avatarEl.style.display = 'none';
      // wrapper visibility decided by _updateCityGreeting
    }
  }

  // Ham drawer greeting
  const hamWrap = document.getElementById('hamUserGreeting');
  if (hamWrap) {
    const nameEl   = document.getElementById('hamGreetName');
    const avatarEl = document.getElementById('hamGreetAvatar');
    if (firstName) {
      if (nameEl)   nameEl.textContent   = 'Hola, ' + firstName + '!';
      if (avatarEl) { avatarEl.textContent = firstName[0].toUpperCase(); avatarEl.style.display = 'flex'; }
      hamWrap.style.display = 'block';
    } else {
      if (nameEl)   nameEl.textContent   = '';
      if (avatarEl) avatarEl.style.display = 'none';
      // wrapper visibility decided by _updateCityGreeting
    }
  }

  // City pill — shown regardless of login state
  _updateCityGreeting();
  const showPedidos = d => { const el = document.getElementById(d); if (el) el.style.display = hasId ? '' : 'none'; };
  showPedidos('btnMoreMisPedidos');
  showPedidos('btnHamMisPedidos');
}

function _updateCityGreeting() {
  if (!DELIVERY_CITY) return;
  const cu        = getCyUser();
  const hasName   = !!(cu?.name);
  // Prefer the saved address shortname over the raw city
  const label = cu?.dir ? cu.dir.split(',')[0].trim() : DELIVERY_CITY;
  // More-menu city
  const mmCityWrap = document.getElementById('moreMenuGreetCity');
  const mmCityText = document.getElementById('moreMenuGreetCityText');
  const mmWrap     = document.getElementById('moreMenuUserGreeting');
  if (mmCityWrap && mmCityText) {
    mmCityText.textContent  = label;
    mmCityText.style.fontSize = hasName ? '11px' : '13px';
    mmCityText.style.fontWeight = hasName ? '600' : '700';
    mmCityWrap.style.display = 'flex';
    if (mmWrap) mmWrap.style.display = 'block';
  }
  // Ham drawer city
  const hamCityWrap = document.getElementById('hamGreetCity');
  const hamCityText = document.getElementById('hamGreetCityText');
  const hamWrap     = document.getElementById('hamUserGreeting');
  if (hamCityWrap && hamCityText) {
    hamCityText.textContent   = label;
    hamCityText.style.fontSize = hasName ? '12px' : '15px';
    hamCityText.style.fontWeight = hasName ? '600' : '700';
    hamCityWrap.style.display = 'flex';
    if (hamWrap) hamWrap.style.display = 'block';
  }
}

// ===== ADDRESS POPOVER CARD ==========================================
let _addrPopoverMap    = null;
let _addrPopoverMarker = null;
let _addrPopoverLat    = null;
let _addrPopoverLng    = null;

function openAddrPopover(evt) {
  evt && evt.stopPropagation();
  closeMoreMenu();

  const current    = document.getElementById('addrPopoverCurrent');
  const input      = document.getElementById('addrPopoverInput');
  const status     = document.getElementById('addrPopoverStatus');
  const editRow    = document.getElementById('addrEditRow');
  const mapEl      = document.getElementById('addrPopoverMapEl');
  const mapHint    = document.getElementById('addrPopoverMapHint');
  const confirmBtn = document.getElementById('addrPopoverConfirmBtn');
  if (!current) return;

  // Reset edit state
  _addrPopoverLat = null; _addrPopoverLng = null;
  _addrPopoverMap = null; _addrPopoverMarker = null;
  input.value = '';
  if (status) status.textContent = '';
  mapEl.style.display = 'none';
  mapEl.innerHTML = '';
  if (mapHint) mapHint.style.display = 'none';
  confirmBtn.style.display = 'none';
  confirmBtn.disabled = true; confirmBtn.style.opacity = '.45';
  editRow.style.display = 'none';

  // Show current address with "Cambiar" link
  const cu = getCyUser();
  const savedAddr = cu.dir || '';
  const MAX_ADDR_CHARS = 52;
  if (savedAddr) {
    const addrDisplay = savedAddr.length > MAX_ADDR_CHARS ? savedAddr.slice(0, MAX_ADDR_CHARS) + '…' : savedAddr;
    current.innerHTML =
      `<span style="font-size:13px;color:var(--text-primary,#111827);font-weight:600;flex:1;min-width:0;word-break:break-word" title="${savedAddr}">${addrDisplay}</span>` +
      `<a href="#" id="addrPopoverChangeLnk" onclick="_addrPopoverShowEdit(event)"
         style="font-size:12px;font-weight:700;color:var(--primary,#F15200);text-decoration:underline;white-space:nowrap;flex-shrink:0;margin-left:6px">Cambiar</a>`;
    // Render saved map immediately (non-blocking)
    try {
      const cached = JSON.parse(localStorage.getItem(GEO_CACHE_KEY) || 'null');
      if (cached && cached.lat && cached.lng) {
        _addrPopoverLat = cached.lat; _addrPopoverLng = cached.lng;
        loadGoogleMaps().then(() => _addrPopoverRenderMap(cached.lat, cached.lng));
      }
    } catch (_) {}
  } else {
    current.innerHTML = `<span style="color:var(--text-muted,#9ca3af);font-size:13px">No tienes una dirección guardada todavía.</span>`;
    // Auto-show edit row when no address
    editRow.style.display = 'flex';
    input.placeholder = 'Ej: Calle 10 #5-23, El Prado';
  }

  const overlay = document.getElementById('addrModalOverlay');
  overlay.style.display = 'flex';
  // No auto-focus: on mobile it opens the keyboard and hides the field
}

function _addrPopoverShowEdit(evt) {
  if (evt) { evt.preventDefault(); evt.stopPropagation(); }
  const editRow = document.getElementById('addrEditRow');
  const input   = document.getElementById('addrPopoverInput');
  if (!editRow) return;
  editRow.style.display = 'flex';
  const cu = getCyUser();
  input.value = cu.dir || '';
  input.placeholder = 'Nueva dirección…';
  setTimeout(() => { input.focus(); input.select(); }, 80);
}

function closeAddrPopover() {
  const overlay = document.getElementById('addrModalOverlay');
  if (overlay) overlay.style.display = 'none';
  _addrPopoverMap = null; _addrPopoverMarker = null;
  _addrPopoverLat = null; _addrPopoverLng = null;
}
function _addrModalOverlayClick(e) {
  if (e.target === document.getElementById('addrModalOverlay')) closeAddrPopover();
}

async function _addrPopoverSearch() {
  const input      = document.getElementById('addrPopoverInput');
  const status     = document.getElementById('addrPopoverStatus');
  const searchBtn  = document.getElementById('addrPopoverSearchBtn');
  const confirmBtn = document.getElementById('addrPopoverConfirmBtn');
  const addr = input.value.trim();
  if (!addr) { input.focus(); return; }

  searchBtn.disabled = true;
  confirmBtn.disabled = true; confirmBtn.style.opacity = '.45';
  status.textContent = 'Buscando…';
  _addrPopoverLat = null; _addrPopoverLng = null;

  try {
    const found = await geocodeGoogle(addr);
    if (!found) {
      status.textContent = '⚠️ No encontramos esa dirección. Intenta ser más específico.';
      searchBtn.disabled = false;
      return;
    }
    _addrPopoverLat = found.lat; _addrPopoverLng = found.lng;
    status.textContent = found.precision === 'city'
      ? '⚠️ Solo encontramos la ciudad. Ajusta el pin.'
      : '✅ Encontrada. Ajusta el pin si quierés ↓';
    await _addrPopoverRenderMap(_addrPopoverLat, _addrPopoverLng);
    confirmBtn.style.display = 'block';
    confirmBtn.disabled = false; confirmBtn.style.opacity = '1';
  } catch (e) {
    status.textContent = '⚠️ Error al buscar. Verifica tu conexión.';
  }
  searchBtn.disabled = false;
}

async function _addrPopoverRenderMap(lat, lng) {
  const el   = document.getElementById('addrPopoverMapEl');
  const hint = document.getElementById('addrPopoverMapHint');
  if (!el) return;
  await loadGoogleMaps();
  el.style.display = 'block';
  if (hint) hint.style.display = 'block';
  if (_addrPopoverMap) {
    _addrPopoverMap.setCenter({ lat, lng });
    if (_addrPopoverMarker) _addrPopoverMarker.position = { lat, lng };
    return;
  }
  _addrPopoverMap = new google.maps.Map(el, {
    center: { lat, lng }, zoom: 16,
    mapTypeControl: false, streetViewControl: false,
    fullscreenControl: false, gestureHandling: 'cooperative',
    mapId: 'DEMO_MAP_ID',
  });
  const _pin = document.createElement('div');
  _pin.style.cssText = 'width:18px;height:18px;border-radius:50%;background:#F15200;border:3px solid #fff;box-sizing:border-box;cursor:grab';
  _addrPopoverMarker = new google.maps.marker.AdvancedMarkerElement({
    position: { lat, lng }, map: _addrPopoverMap,
    content: _pin, gmpDraggable: true, title: 'Tu dirección de entrega',
  });
  _addrPopoverMarker.addListener('dragend', e => {
    _addrPopoverLat = e.latLng.lat();
    _addrPopoverLng = e.latLng.lng();
    // Allow confirming the pin-dragged position even without a text search
    const confirmBtn = document.getElementById('addrPopoverConfirmBtn');
    if (confirmBtn) { confirmBtn.style.display = 'block'; confirmBtn.disabled = false; confirmBtn.style.opacity = '1'; }
  });
}

function _addrPopoverConfirm() {
  if (!_addrPopoverLat) return;
  // Read final dragged position
  if (_addrPopoverMarker) {
    const pos = _addrPopoverMarker.position;
    if (pos) {
      _addrPopoverLat = typeof pos.lat === 'function' ? pos.lat() : +pos.lat;
      _addrPopoverLng = typeof pos.lng === 'function' ? pos.lng() : +pos.lng;
    }
  }
  const addr = document.getElementById('addrPopoverInput').value.trim() || getCyUser().dir || '';
  _geoCoords = { lat: _addrPopoverLat, lng: _addrPopoverLng };
  localStorage.setItem(GEO_PREF_KEY, 'granted');
  localStorage.setItem(GEO_CACHE_KEY, JSON.stringify({ lat: _addrPopoverLat, lng: _addrPopoverLng, address: addr }));
  setCyUser({ dir: addr, lat: _addrPopoverLat, lng: _addrPopoverLng });
  trackEvent('GEO_ADDRESS_CHANGED', { lat: +_addrPopoverLat.toFixed(5), lng: +_addrPopoverLng.toFixed(5), address: addr });
  DELIVERY_CITY = addr.split(',')[0].trim() || DELIVERY_CITY;
  _updateCityGreeting();
  _clearZoneAvailCache();   // coords changed — invalidate all zone checks
  closeAddrPopover();
  // Reload first page of products with new coords
  applyFilters();
}
// ===== END ADDRESS POPOVER ==========================================

function toggleMoreMenu() {
  const dd = document.getElementById('moreMenuDropdown');
  const open = dd.classList.toggle('open');
  document.getElementById('moreMenuBtn').classList.toggle('active', open);
  if (open) { _updateUserGreeting(); setTimeout(() => document.addEventListener('click', _moreMenuOutside, { once: true }), 0); }
}
function closeMoreMenu() {
  document.getElementById('moreMenuDropdown')?.classList.remove('open');
  document.getElementById('moreMenuBtn')?.classList.remove('active');
}
function _moreMenuOutside(e) {
  if (!document.getElementById('moreMenu')?.contains(e.target)) closeMoreMenu();
  else if (document.getElementById('moreMenuDropdown')?.classList.contains('open'))
    setTimeout(() => document.addEventListener('click', _moreMenuOutside, { once: true }), 0);
}

// ===== POPUP AD =====
function _showNextPopup() {
  if (!_popupQueue.length) return;
  POPUP_AD = _popupQueue[0];
  showPromoPopup();
}
function showPromoPopup() {
  const ad = POPUP_AD;
  if (!ad || !ad.id) return;
  if (ad.type === 'product') _showProductPopup(ad);
  else _showBannerPopup(ad);
}
function _showBannerPopup(ad) {
  document.getElementById('ppBannerBadge').textContent = ad.badge || '';
  document.getElementById('ppBannerTitle').textContent = ad.title || '';
  document.getElementById('ppBannerSub').textContent   = ad.subtitle || '';
  const img  = document.getElementById('ppBannerImg');
  const hero = document.getElementById('ppBannerHero');
  if (ad.image) { img.src = ad.image; hero.style.display = ''; }
  else { hero.style.display = 'none'; }
  document.getElementById('ppBannerCta').textContent = ad.cta || 'Ver más';
  _promoPopAction = ad.ctaAction || null;
  setTimeout(() => {
    document.getElementById('ppBannerOverlay').classList.add('open');
    _lockPromoScroll();
  }, 800);
}
function _showProductPopup(ad) {
  // ctaAction holds the promoted-ad UUID; look it up from the already-loaded PROMOTED cache
  const p = (ad.ctaAction && PROMOTED.find(x => x.id === ad.ctaAction)) || null;
  if (!p) { console.warn('popup product not found in PROMOTED:', ad.ctaAction); return; }
  const disc = (p.oldPrice && p.oldPrice > p.price)
    ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0;
  document.getElementById('ppProductImg').src            = p.image || '';
  document.getElementById('ppProductName').textContent   = p.name || '';
  document.getElementById('ppProductBadge').textContent  = p.badge || ad.badge || '';
  const descEl = document.getElementById('ppProductDesc');
  descEl.textContent = p.description || '';
  descEl.style.display = p.description ? '' : 'none';
  document.getElementById('ppProductPrice').textContent  = fmtPrice(p.price);
  document.getElementById('ppProductSeller').textContent = p.sellerName || '';
  const oldEl  = document.getElementById('ppProductOld');
  const discEl = document.getElementById('ppProductDisc');
  const ribbon = document.getElementById('ppProductRibbon');
  if (p.oldPrice && disc > 0) {
    oldEl.textContent    = fmtPrice(p.oldPrice);
    discEl.textContent   = '-' + disc + '%';
    discEl.style.display = '';
    ribbon.style.display = '';
  } else {
    oldEl.textContent    = '';
    discEl.style.display = 'none';
    ribbon.style.display = 'none';
  }
  document.getElementById('ppProductWa').href = promoWaUrl(p);
  setTimeout(() => {
    document.getElementById('ppProductOverlay').classList.add('open');
    _lockPromoScroll();
  }, 800);
}
let _promoScrollY = 0;
function _lockPromoScroll() {
  _promoScrollY = window.scrollY;
  document.body.style.position   = 'fixed';
  document.body.style.top        = `-${_promoScrollY}px`;
  document.body.style.width      = '100%';
  document.body.style.overflowY  = 'scroll';
}
function _unlockPromoScroll() {
  document.body.style.position  = '';
  document.body.style.top       = '';
  document.body.style.width     = '';
  document.body.style.overflowY = '';
  window.scrollTo(0, _promoScrollY);
}
function closePromoPopup() {
  document.getElementById('ppBannerOverlay').classList.remove('open');
  document.getElementById('ppProductOverlay').classList.remove('open');
  _unlockPromoScroll();
}
function handlePromoPopClick(e) {
  const id = e.target?.id;
  if (id === 'ppBannerOverlay' || id === 'ppProductOverlay') closePromoPopup();
}
function dismissPromoPopupForever() {
  if (POPUP_AD && POPUP_AD.id) localStorage.setItem(POPUP_DISMISSED_PREFIX + POPUP_AD.id, '1');
  _popupQueue.shift();
  closePromoPopup();
  if (_popupQueue.length) setTimeout(_showNextPopup, 600);
}
function promoPopCta() {
  closePromoPopup();
  if (_promoPopAction) filterCategory(_promoPopAction, null);
}

// ===== RECENTLY VIEWED =====
function trackRecent(id) {
  if (!id) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (_) {}
  recent = [id, ...recent.filter(x => x !== id)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  renderRecentlyViewed();
}
async function renderRecentlyViewed() {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (_) {}
  const missing = ids.filter(id => !_productCache.has(id));
  if (missing.length) {
    try {
      const _br = await fetch(`${API_BASE}/api/products/pidefacil/by-ids`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(missing)
      });
      if (_br.ok) _cacheProducts(await _br.json());
    } catch (_) {}
  }
  // Hide products not available in the user's delivery zone
  const unavail = await _checkZoneAvail(ids);
  const products = ids
    .filter(id => !unavail.has(id))
    .map(id => _productCache.get(id)).filter(Boolean);
  const sec = document.getElementById('recentSection');
  if (!sec) return;
  if (!products.length) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  const ctaCard = `<div class="recent-cta-card" onclick="document.getElementById('productsGrid').scrollIntoView({behavior:'smooth'})">
    <div class="recent-cta-icon">🛍️</div>
    <div class="recent-cta-text">Ver catálogo completo</div>
    <div class="recent-cta-arrow">→</div>
  </div>`;
  document.getElementById('recentContainer').innerHTML =
    products.map(p => `<div class="recent-item-wrap">
      <button class="btn-remove-recent" onclick="removeRecent('${p.id}')" aria-label="Quitar" title="Quitar">×</button>
      ${buildRecentCard(p)}
    </div>`).join('') + ctaCard;
}
function removeRecent(id) {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (_) {}
  ids = ids.filter(x => x !== id);
  localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  renderRecentlyViewed();
}
function clearRecentlyViewed() {
  localStorage.removeItem(RECENT_KEY);
  renderRecentlyViewed();
}

// ===== COUPONS =====
async function applyCupon() {
  const raw = (document.getElementById('inputCupon').value || '').trim().toUpperCase();
  const fb  = document.getElementById('cuponFeedback');
  const btn = document.querySelector('.btn-apply-cupon');

  if (!raw) {
    fb.textContent = ''; fb.className = 'cupon-feedback';
    _appliedCoupon = null; _refreshSummaryDiscount(); return;
  }

  fb.textContent = 'Verificando\u2026'; fb.className = 'cupon-feedback';
  if (btn) btn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/api/coupons/validate/${encodeURIComponent(raw)}`);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || (res.status === 404 ? 'C\u00f3digo no v\u00e1lido' : 'Error al validar'));
    }
    const coupon = await res.json();

    // Check minOrder against current cart total
    if (coupon.minOrder && _currentOrderTotal < coupon.minOrder) {
      throw new Error(`Pedido m\u00ednimo $${Number(coupon.minOrder).toLocaleString('es-CO')} para usar este c\u00f3digo`);
    }

    _appliedCoupon = {
      code:  coupon.code,
      type:  coupon.discType,     // 'PERCENT' | 'FIXED'
      value: Number(coupon.discValue),
      label: coupon.label,
      id:    coupon.id
    };
    fb.textContent = '\u2705 ' + coupon.label + ' aplicado';
    fb.className   = 'cupon-feedback ok';
  } catch (e) {
    fb.textContent = e.message;
    fb.className   = 'cupon-feedback err';
    _appliedCoupon = null;
  } finally {
    if (btn) btn.disabled = false;
  }
  _refreshSummaryDiscount();
}
function calcCouponDiscount(total) {
  if (!_appliedCoupon) return 0;
  if (_appliedCoupon.type === 'PERCENT') return Math.round(total * _appliedCoupon.value / 100);
  if (_appliedCoupon.type === 'FIXED')   return Math.min(_appliedCoupon.value, total);
  return 0;
}
function _refreshSummaryDiscount() {
  const el = document.getElementById('orderSummary');
  if (!el) return;
  const existing = document.getElementById('cuponDiscountRow');
  if (existing) existing.remove();
  const disc = calcCouponDiscount(_currentOrderTotal);
  const hdr2 = document.getElementById('orderSummaryTotal');
  if (disc > 0) {
    const row = document.createElement('div');
    row.id        = 'cuponDiscountRow';
    row.innerHTML = `<span style="color:var(--text-muted);font-size:11px">🏷️ Cupón <strong style="color:var(--text-primary)">${_appliedCoupon.code}</strong></span><span style="color:#059669;font-weight:700;font-size:13px">−${fmtPrice(disc)}</span>`;
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:7px 0 2px;border-top:1px dashed var(--border);margin-top:6px;';
    el.appendChild(row);
    if (hdr2) hdr2.textContent = 'Total: ' + fmtPrice(_currentOrderTotal - disc);
  } else {
    if (hdr2) hdr2.textContent = 'Total: ' + fmtPrice(_currentOrderTotal);
  }
}
