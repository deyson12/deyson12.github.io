// ============================================================
// PideFacil — Lógica principal (index.html)
// Requiere: js/config.js, js/utils.js
// ============================================================

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
    msgEl.textContent = 'Por favor esperá unos segundos e intentá nuevamente.';
    setTimeout(() => location.reload(), 8000);
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

const SELLER = 'PideFacil';

let PRODUCTS = [];

// ===== STATE =====
let cart         = JSON.parse(localStorage.getItem('cy_cart')    || '[]');
let wishlist     = JSON.parse(localStorage.getItem('cy_wish')    || '[]');
let checkedItems = new Set(JSON.parse(localStorage.getItem('cy_checked') || 'null') || cart.map(i => i.id));
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
const PROMO_EVERY = 6;      // inject promoted cards every N regular cards

// ===== POPUP AD =====
let POPUP_AD = null;
let _promoPopAction = null;
const POPUP_DISMISSED_KEY = 'cy_popup_id'; // single key; value = last dismissed popup id

// ===== COUPONS =====
let COUPONS = [];
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

// ===== ANALYTICS TRACKING =====
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
function trackEvent(eventType, context) {
  fetch(`${API_BASE}/api/analytics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: _getVisitorId(), sessionId: _getSessionId(), eventType, context: context || {} })
  }).catch(() => {});
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

document.addEventListener('DOMContentLoaded', async () => {
  const grid = document.getElementById('productsGrid');
  grid.innerHTML = Array(PAGE_SIZE).fill(0).map(buildSkeleton).join('');
  try {
    const res = await fetch(`${API_BASE}/api/products/pidefacil`);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    PRODUCTS = (await res.json())
      .filter(p => p.active !== false)
      .map(normalizeProduct);
  } catch (e) {
    console.error('Error cargando productos:', e);
    grid.innerHTML = '<div class="no-results"><div class="no-results-icon">⚠️</div><h3>Error al cargar</h3><p>Recarga la página</p></div>';
  }
  try {
    const rp = await fetch('promoted/products.json');
    if (rp.ok) PROMOTED = await rp.json();
  } catch (_) { /* sin productos promocionados */ }
  try {
    const rc = await fetch('promoted/coupons.json');
    if (rc.ok) COUPONS = await rc.json();
  } catch (_) {}
  try {
    const rb = await fetch('promoted/banners.json');
    if (rb.ok) renderSbnrBanners(await rb.json());
  } catch (_) {}
  try {
    const rpp = await fetch('promoted/popup.json');
    if (rpp.ok) {
      const d = await rpp.json();
      if (d && d.id) {
        if (d.idProduct) {
          const matched = PROMOTED.find(p => p.id === d.idProduct);
          POPUP_AD = matched
            ? { ...matched, id: d.id, type: 'product', badge: d.badge || matched.badge || '' }
            : d;
        } else {
          POPUP_AD = d;
        }
      }
    }
  } catch (_) {}
  initBanner();
  renderOffers();
  applyFilters();
  // Hide loader
  const _loader = document.getElementById('pageLoader');
  if (_loader) { _loader.classList.add('hidden'); document.body.style.overflow = ''; }
  updateCartUI();
  updateWishUI();
  initSearch();
  applySavedTheme();
  handleWompiReturn();
  initMapField();
  initCategories();
  renderRecentlyViewed();
  if (POPUP_AD) showPromoPopup();
  // Track page view (once per session)
  if (!sessionStorage.getItem('pf_pv')) {
    sessionStorage.setItem('pf_pv', '1');
    trackEvent('PAGE_VIEW', { referrer: document.referrer || 'directo', url: location.href });
  }
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
  const res  = await fetch(url, { headers: { 'Accept-Language': 'es', 'User-Agent': 'PideFacil/1.0' } });
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

  const wrap        = document.getElementById('mapConfirmWrap');
  const loadingEl   = document.getElementById('mapLoadingEl');
  const mapEl       = document.getElementById('mapEl');
  const badge       = document.getElementById('mapConfirmedBadge');
  const confirmBtns = document.getElementById('mapConfirmBtns');
  const hint        = document.getElementById('mapConfirmHint');
  const btnConfirm  = document.getElementById('btnMapConfirm');
  const question    = document.getElementById('mapQuestion');
  if (!wrap) return;

  // Show loading state
  wrap.classList.add('visible');
  loadingEl.style.display = 'flex';
  loadingEl.innerHTML     = '<div class="spin"></div> Buscando dirección…';
  mapEl.style.display     = 'none';
  badge.classList.remove('visible');
  confirmBtns.style.display = 'flex';
  hint.classList.remove('visible');
  btnConfirm.classList.remove('visible');
  question.textContent = '¿Tu domicilio llega aquí?';

  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  try {
    if (useGoogle) {
      const found = await geocodeGoogle(address);
      if (!found) { loadingEl.innerHTML = '⚠️ No se pudo cargar el mapa. Puedes continuar sin él.'; return; }
      _deliveryLat = found.lat;
      _deliveryLng = found.lng;
      loadingEl.style.display = 'none';
      mapEl.style.display     = 'block';
      await loadGoogleMaps();
      renderGoogleMap(_deliveryLat, _deliveryLng);
      if (found.precision === 'city') {
        question.textContent = 'No encontramos la dirección exacta. Mueve el pin a tu ubicación:';
        enableMapDrag();
      } else {
        question.textContent = '¿Tu domicilio llega aquí?';
      }
    } else {
      const found = await geocodeCascade(address);
      if (!found) { loadingEl.innerHTML = '⚠️ No se pudo cargar el mapa. Puedes continuar sin él.'; return; }
      _deliveryLat = parseFloat(found.result.lat);
      _deliveryLng = parseFloat(found.result.lon);
      loadingEl.style.display = 'none';
      mapEl.style.display     = 'block';
      await loadLeaflet();
      renderDeliveryMap(_deliveryLat, _deliveryLng);
      if (found.precision === 'address') {
        question.textContent = '¿Tu domicilio llega aquí?';
      } else if (found.precision === 'street') {
        question.textContent = 'Encontramos la calle. ¿El pin está en el lugar correcto?';
      } else {
        question.textContent = 'No encontramos la dirección exacta. Mueve el pin a tu ubicación:';
        enableMapDrag();
      }
    }
  } catch (e) {
    loadingEl.innerHTML = '⚠️ No se pudo cargar el mapa. Puedes continuar sin él.';
  }
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
    s.src    = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&callback=_gmapsReady`;
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
  const tryQ = async q => {
    const url  = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    return (data.status === 'OK' && data.results.length) ? data.results[0].geometry.location : null;
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
    _googleMarker.setPosition({ lat, lng });
    _googleMarker.setDraggable(false);
    return;
  }
  _googleMap = new google.maps.Map(el, {
    center: { lat, lng },
    zoom: 16,
    gestureHandling: 'cooperative',
  });
  _googleMarker = new google.maps.Marker({
    position: { lat, lng },
    map: _googleMap,
    draggable: false,
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      scale: 10,
      fillColor: '#F15200',
      fillOpacity: 1,
      strokeColor: '#ffffff',
      strokeWeight: 3,
    },
  });
  _googleMarker.addListener('dragend', () => {
    const pos = _googleMarker.getPosition();
    _deliveryLat = pos.lat();
    _deliveryLng = pos.lng();
  });
}

function enableMapDrag() {
  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  if (useGoogle) {
    if (_googleMarker) _googleMarker.setDraggable(true);
  } else {
    if (!_mapMarker) return;
    _mapMarker.dragging.enable();
    const el = _mapMarker.getElement();
    if (el) { el.style.cursor = 'grab'; el.style.transition = 'transform .2s'; }
  }
  document.getElementById('mapConfirmBtns').style.display = 'none';
  document.getElementById('mapConfirmHint').classList.add('visible');
  document.getElementById('btnMapConfirm').classList.add('visible');
  document.getElementById('mapQuestion').textContent = 'Arrastra el pin a tu ubicación exacta:';
}

function confirmMapLocation() {
  if (!_deliveryLat) return;
  const useGoogle = (typeof MAPS_PROVIDER !== 'undefined' && MAPS_PROVIDER === 'google');
  if (useGoogle) {
    if (_googleMarker) {
      const pos    = _googleMarker.getPosition();
      _deliveryLat = pos.lat();
      _deliveryLng = pos.lng();
      _googleMarker.setDraggable(false);
    }
  } else {
    if (_mapMarker) {
      const pos    = _mapMarker.getLatLng();
      _deliveryLat = pos.lat;
      _deliveryLng = pos.lng;
      _mapMarker.dragging.disable();
    }
  }
  _mapConfirmed = true;
  setCyUser({ lat: _deliveryLat, lng: _deliveryLng });

  document.getElementById('mapConfirmBtns').style.display = 'none';
  document.getElementById('mapConfirmHint').classList.remove('visible');
  document.getElementById('btnMapConfirm').classList.remove('visible');
  document.getElementById('mapConfirmedBadge').classList.add('visible');
  document.getElementById('mapQuestion').textContent = '';
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

// ===== SBNR BANNERS (from promoted/banners.json) =====
function renderSbnrBanners(banners) {
  const container = document.getElementById('sbnrContainer');
  if (!container) return;
  container.innerHTML = banners.filter(b => b.visible).map(b => {
    const innerStyle = `background:${b.bg};`;
    const labelStyle = `color:${b.labelColor};`;
    const emStyle    = `color:${b.accentColor};`;
    const btnStyle   = `background:${b.btnBg};color:${b.btnColor};`;
    return `<div class="sbnr">
  <div class="sbnr-inner" style="${innerStyle}">
    <div class="sbnr-deco">${b.deco}</div>
    <div class="sbnr-deco2">${b.deco2}</div>
    <div class="sbnr-label" style="${labelStyle}">${b.label}</div>
    <h2 class="sbnr-title">${b.title}<br><em style="${emStyle}">${b.titleEm}</em></h2>
    <p class="sbnr-sub">${b.sub}</p>
    <div class="sbnr-btns">
      <button class="sbnr-btn" style="${btnStyle}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
      <button class="sbnr-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
    </div>
  </div>
</div>`;
  }).join('');
  window._sbnrData = banners;
}
window._sbnrAct = function(id, btnIdx) {
  if (!window._sbnrData) return;
  const b = window._sbnrData.find(x => x.id === id);
  if (!b) return;
  const btn = btnIdx === 0 ? b.btn1 : b.btn2;
  if (btn.action === 'filterCategory') filterCategory(btn.args[0], btn.args[1]);
  else if (btn.action === 'openBannerPopup') openBannerPopup(btn.args[0], btn.args[1]);
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
function buildCard(p, extra = '') {
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
      <img class="card-img" src="${p.image}" alt="${p.name}" width="300" height="300" loading="lazy" decoding="async" onload="this.classList.add('img-loaded')" onerror="this.classList.add('img-loaded')">
      <div class="badge-wrap">${badgeList.join('')}</div>
      <button class="card-wishlist ${inWish ? 'active' : ''}" data-wish-id="${p.id}" onclick="toggleWish(event,'${p.id}')" aria-label="${inWish ? 'Quitar de favoritos' : 'Agregar a favoritos'}" aria-pressed="${inWish}">
        <svg viewBox="0 0 24 24" stroke="var(--primary)" stroke-width="2.5" fill="${inWish ? 'var(--primary)' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <div class="card-seller">Ref: ${p.id.slice(0, 8)}</div>
      <div class="card-name">${p.name}</div>
      <div class="card-stars">${stars(p.rating)}<span class="star-count">(${p.sales})</span></div>
      <div class="card-prices">
        <span class="card-price">${fmtPrice(p.price)}</span>
        ${disc > 0 ? `<span class="card-old-price">${fmtPrice(p.oldPrice)}</span><span class="card-discount">-${disc}%</span>` : ''}
      </div>
      ${p.stock === 'low' ? '<div class="low-stock">Últimas unidades</div>' : ''}
      <div class="card-actions" onclick="event.stopPropagation()">
        <div id="btnCart${p.id}">
          ${inCart
            ? `<div class="card-qty-ctrl"><button class="card-qty-btn" onclick="changeQty('${p.id}',-1)" aria-label="Reducir cantidad">−</button><span class="card-qty-num" aria-live="polite">${cartItem.qty}</span><button class="card-qty-btn" onclick="changeQty('${p.id}',1)" aria-label="Aumentar cantidad">+</button></div>`
            : `<button class="btn btn-cart" onclick="addToCart('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`
          }
        </div>
        <button class="btn btn-buy-now" onclick="buyNow('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Comprar ya
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
            : `<button class="btn btn-cart" onclick="addToCart('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`
          }
        </div>
        <button class="btn btn-buy-now" onclick="buyNow('${p.id}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Comprar ya
        </button>
      </div>
    </div>
  </div>`;
}

function promoWaUrl(p) {
  const disc = (p.oldPrice && p.oldPrice > p.price)
    ? Math.round((p.oldPrice - p.price) / p.oldPrice * 100) : 0;
  const msg = encodeURIComponent(
    `Hola ${p.sellerName}! Vi tu producto en PideFacil:\n\n` +
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
          <span>${p.sellerName}</span>
        </div>
        <h2 class="modal-name">${p.name}</h2>
        <div class="modal-price-wrap">
          <span class="modal-price">${fmtPrice(p.price)}</span>
          ${disc > 0 ? `<span class="modal-old">${fmtPrice(p.oldPrice)}</span><span class="modal-off">-${disc}%</span>` : ''}
        </div>
        ${buildModalDesc(p.description)}
        <div class="modal-actions" style="margin-top:16px">
          <a class="btn btn-promo-wa" href="${waUrl}" target="_blank" rel="noopener noreferrer" style="width:100%;padding:12px;font-size:14px;text-decoration:none">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            Contactar por WhatsApp
          </a>
        </div>
        <p class="modal-ref" style="margin-top:12px">Producto patrocinado · Vendedor externo a PideFacil</p>
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
  if (!visible.length) return batch.map(p => buildCard(p, 'new-in')).join('');
  const html = [];
  batch.forEach(p => {
    html.push(buildCard(p, 'new-in'));
    _gridRenderedCount++;
    if (_promoShownCount < visible.length && _gridRenderedCount % PROMO_EVERY === 0) {
      html.push(buildPromotedCard(visible[_promoShownCount]));
      _promoShownCount++;
    }
  });
  return html.join('');
}

function renderOffers() {
  const offers = PRODUCTS
    .filter(p => p.oldPrice && p.oldPrice > p.price)
    .sort((a, b) => calcDiscount(b) - calcDiscount(a));
  const hasOffers = offers.length > 0;
  document.getElementById('offersContainer').innerHTML = offers.map(p => buildCard(p)).join('');
  const sec = document.getElementById('offersSection');
  const bnr = document.getElementById('bnr3El');
  if (sec) sec.style.display = hasOffers ? '' : 'none';
  if (bnr) bnr.style.display = hasOffers ? '' : 'none';
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
  if (pageOffset >= filteredList.length) return;
  const sentinel = document.getElementById('gridSentinel');
  gridObserver = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) loadMore();
  }, { rootMargin: '400px 0px' });
  gridObserver.observe(sentinel);
}

function loadMore() {
  if (isLoadingMore || pageOffset >= filteredList.length) return;
  isLoadingMore = true;
  const grid  = document.getElementById('productsGrid');
  const batch = filteredList.slice(pageOffset, pageOffset + PAGE_SIZE);
  const wrap  = document.createElement('div');
  wrap.innerHTML = weavePromoted(batch);
  while (wrap.firstChild) grid.appendChild(wrap.firstChild);
  fixLoadedImages(grid);
  pageOffset += batch.length;
  isLoadingMore = false;
  if (pageOffset >= filteredList.length && gridObserver) { gridObserver.disconnect(); gridObserver = null; }
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
function applyFilters() {
  let l = [...PRODUCTS];
  if (currentCategory !== 'all') l = l.filter(p => p.category === currentCategory);
  if (currentSearch) l = l.filter(p =>
    norm(p.name).includes(norm(currentSearch)) ||
    norm(p.tags).includes(norm(currentSearch)) ||
    p.id.substring(0, 8).toLowerCase().includes(currentSearch)
  );
  if (currentPriceFilter !== 'all') {
    const [mn, mx] = currentPriceFilter.split('-').map(Number);
    l = l.filter(p => p.price >= (mn || 0) && (mx ? p.price <= mx : true));
  }
  switch (currentSort) {
    case 'price-asc':  l.sort((a, b) => a.price - b.price); break;
    case 'price-desc': l.sort((a, b) => b.price - a.price); break;
    case 'newest':     l.sort((a, b) => (b.badges.includes('new') ? 1 : 0) - (a.badges.includes('new') ? 1 : 0)); break;
    default:           l.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }
  filteredList       = l;
  pageOffset         = 0;
  _gridRenderedCount = 0;
  _promoShownCount   = 0;
  renderFirstBatch();
}

function filterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  applyFilters();
  document.getElementById('gridSectionHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (cat !== 'all') trackEvent('CATEGORY_FILTER', { category: cat });
}
function hamFilterCategory(cat, btn) {
  currentCategory = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  document.querySelectorAll('.ham-cat-btn').forEach(b => b.classList.toggle('active', b.dataset.cat === cat));
  applyFilters();
  closeHamDrawer();
  document.getElementById('gridSectionHeader').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function openHamDrawer()  { document.getElementById('hamDrawer').classList.add('open'); document.getElementById('hamOverlay').classList.add('open'); document.body.style.overflow = 'hidden'; }

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
      `<button class="cat-btn" data-cat="${c.code}" onclick="filterCategory('${c.id}',this)">${c.name}</button>`;
    const makeHamBtn = c =>
      `<button class="ham-cat-btn" data-cat="${c.code}" onclick="hamFilterCategory('${c.id}',this)">${c.name}</button>`;

    if (navInner)    navInner.innerHTML    = todoBtnNav + cats.map(makeNavBtn).join('');
    if (hamContainer) hamContainer.innerHTML = todoBtnHam + cats.map(makeHamBtn).join('');
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
function renderSearchDropdown(q) {
  const dd = document.getElementById('searchDropdown');
  const ql = norm(q);
  const results = PRODUCTS.filter(p => norm(p.name).includes(ql) || norm(p.category).includes(ql) || p.id.substring(0, 8).toLowerCase().includes(ql)).slice(0, 5);
  if (!results.length) {
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
    return;
  }
  dd.innerHTML = results.map(p =>
    `<div class="search-drop-item" onmousedown="openProduct('${p.id}');document.getElementById('searchInput').value='';closeSearchDropdown()">
      <img class="search-drop-img" src="${p.image}" alt="${p.name}" width="42" height="42" loading="lazy" decoding="async">
      <div class="search-drop-info"><div class="search-drop-name">${p.name}</div><div class="search-drop-price">${fmtPrice(p.price)}</div></div>
    </div>`
  ).join('');
  dd.classList.add('open');
  document.getElementById('searchBackdrop')?.classList.add('open');
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

function addToCart(id) {
  const p = PRODUCTS.find(x => x.id === id), ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else { cart.push({ ...p, qty: 1 }); checkedItems.add(id); }
  saveCart(); updateCartUI(); updateAllBtns(); bumpBadge();
  showToast(ex ? `+1 ${p.name.split(' ')[0]}` : `Agregado: ${p.name.split(' ').slice(0, 3).join(' ')}`, ex ? '🛒' : '✅');
  trackRecent(id);
  trackEvent('CART_ADD', { productId: p?.id, name: p?.name, price: p?.price, qty: ex ? ex.qty : 1 });
}

function updateAllBtns() {
  PRODUCTS.forEach(p => {
    const ci = cart.find(c => c.id === p.id);
    document.querySelectorAll(`#btnCart${p.id}`).forEach(wrap => {
      wrap.innerHTML = ci
        ? `<div class="card-qty-ctrl"><button class="card-qty-btn" onclick="changeQty('${p.id}',-1)" aria-label="Reducir cantidad">−</button><span class="card-qty-num" aria-live="polite">${ci.qty}</span><button class="card-qty-btn" onclick="changeQty('${p.id}',1)" aria-label="Aumentar cantidad">+</button></div>`
        : `<button class="btn btn-cart" onclick="addToCart('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 2 3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg> Agregar</button>`;
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
  const sel = getSelectedTotal();
  document.getElementById('cartSubtotal').textContent = fmtPrice(sel);
  document.getElementById('cartTotal').textContent    = fmtPrice(sel);
  document.getElementById('fabTotal').textContent     = fmtPrice(sel);
  renderCartPanel();
}
function updateCartUI() {
  const n = getCount(), sel = getSelectedTotal();
  document.getElementById('cartBadge').textContent     = n;
  document.getElementById('cartCountPill').textContent = n;
  document.getElementById('cartSubtotal').textContent  = fmtPrice(sel);
  document.getElementById('cartTotal').textContent     = fmtPrice(sel);
  document.getElementById('fabTotal').textContent      = fmtPrice(sel);
  n > 0 ? document.getElementById('fabCart').classList.add('visible') : document.getElementById('fabCart').classList.remove('visible');
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
    const selSub = items.filter(i => checkedItems.has(i.id)).reduce((s, i) => s + i.price * i.qty, 0);
    return `<div class="seller-group">
      <div class="seller-group-header">
        <div class="seller-avatar">${seller[0]}</div>
        <span class="seller-name">${seller}</span>
        <span class="seller-subtotal">${fmtPrice(selSub)}</span>
      </div>
      ${items.map(item => {
        const checked = checkedItems.has(item.id);
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

// ===== ORDER POPUP =====
function openOrderPopup() {
  trackEvent('CHECKOUT_START', { itemCount: cart.length, total: cart.reduce((s,i) => s + i.price * i.qty, 0) });
  // repeatOrderItems mode: use a fixed item list, ignore the regular cart
  if (repeatOrderItems) {
    const items = repeatOrderItems;
    const totalAmount = items.reduce((s, i) => s + i.product.price * i.qty, 0);
    let summary = '';
    items.forEach(i => { summary += `• ${i.product.name} ×${i.qty} — ${fmtPrice(i.product.price * i.qty)}<br>`; });
    document.getElementById('orderSummary').innerHTML = summary;
    _setSummaryTotal(totalAmount);
  } else {
    const selected = getCheckedItems();
    if (!selected.length) { showToast('Selecciona al menos un producto', '⚠️'); return; }
    const g = {}; selected.forEach(i => { if (!g[i.seller]) g[i.seller] = []; g[i.seller].push(i); });
    let summary = '';
    Object.entries(g).forEach(([seller, items]) => {
      summary += `🏪 ${seller}<br>`;
      items.forEach(i => { summary += `&nbsp;&nbsp;• ${i.name} ×${i.qty} — ${fmtPrice(i.price * i.qty)}<br>`; });
    });
    document.getElementById('orderSummary').innerHTML = summary;
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

  // Auto-geocode saved address
  resetMapState();
  const mapWrap = document.getElementById('mapConfirmWrap');
  if (mapWrap) mapWrap.style.display = MAPS_ENABLED ? '' : 'none';
  const savedDir = _cu0.dir || '';
  if (MAPS_ENABLED && savedDir) { _lastGeoDir = ''; setTimeout(() => geocodeAddress(savedDir), 400); }
}

function closeOrderPopup() {
  buyNowProduct = null;
  repeatOrderItems = null;
  document.getElementById('orderOverlay').classList.remove('open');
  document.body.style.overflow = '';
  resetMapState();
}
function handleOrderOverlayClick(e) { if (e.target === document.getElementById('orderOverlay')) closeOrderPopup(); }
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
  const txt = `Hola, necesito ayuda. Tuve un error al intentar hacer un pedido en PideFacil. Nombre: ${name}. Celular: ${phone}. Por favor ayudame a completar mi pedido.`;
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
async function postOrderToApi({ fullItems, address, paymentType }) {
  const _cu   = getCyUser();
  const lat    = parseFloat(_cu.lat) || 0;
  const lng    = parseFloat(_cu.lng) || 0;
  const userId = _cu.id || _FIXED_SELLER_ID;
  const body = {
    id:            crypto.randomUUID(),
    sellerId:      _FIXED_SELLER_ID,
    buyerId:       userId,
    products:      fullItems.map(i => ({
      product:         _toApiProduct(i.product),
      quantity:        i.qty,
      selectedOptions: {},
    })),
    status:        'PENDIENTE',
    address,
    paymentType,
    changeFrom:    0,
    location:      [lat, lng],
    deliveryPrice: 0,
  };
  try {
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

async function sendWhatsappOrder() {
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

  setCyUser({ dir, name: nom, phone });

  // ── Guest checkout: register if first time ──────────────
  try {
    await ensureGuestUser(nom, phone);
  } catch (e) {
    openRegisterError(nom, phone);
    return;
  }

  // ── Auto-confirm map if user didn't do it manually ───────
  if (!_mapConfirmed && _mapMarker) {
    const pos = _mapMarker.getLatLng();
    _deliveryLat  = pos.lat;
    _deliveryLng  = pos.lng;
    _mapConfirmed = true;
    setCyUser({ lat: _deliveryLat, lng: _deliveryLng });
    document.getElementById('mapConfirmBtns').style.display = 'none';
    document.getElementById('mapConfirmHint').classList.remove('visible');
    document.getElementById('btnMapConfirm').classList.remove('visible');
    document.getElementById('mapConfirmedBadge').classList.add('visible');
    document.getElementById('mapQuestion').textContent = '';
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
    submitWithWompi({ dir, nom, totalAmount: finalTotal, totalFmt: fmtPrice(finalTotal), itemsBlock, summaryHtml, selectedIds, bpId, items: orderItems, fullItems });
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

  postOrderToApi({ fullItems, address: dir, paymentType: 'TRANSFERENCIA' });

  buyNowProduct = null;
  repeatOrderItems = null;
  closeOrderPopup();
  window.open(`https://wa.me/${WA_PHONE}?text=${encodeURIComponent(msg)}`, '_blank');
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
  const amountCents = od.totalAmount * 100;
  const hashInput   = `${ref}${amountCents}${WOMPI.currency}${WOMPI.integrityKey}`;
  const buf         = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(hashInput));
  const hash        = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  localStorage.setItem('cy_wompi_pending', JSON.stringify({ ref, od }));
  const redirectUrl = (WOMPI.redirectUrl || window.location.origin + window.location.pathname) + '?wref=' + encodeURIComponent(ref);
  const url = `${WOMPI.checkoutUrl}?public-key=${encodeURIComponent(WOMPI.publicKey)}&currency=${WOMPI.currency}&amount-in-cents=${amountCents}&reference=${encodeURIComponent(ref)}&signature:integrity=${hash}&redirect-url=${encodeURIComponent(redirectUrl)}`;
  buyNowProduct = null;
  closeOrderPopup();
  window.location.href = url;
}

function handleWompiReturn() {
  const sp = new URLSearchParams(window.location.search);
  const wref = sp.get('wref');
  if (!wref) return;
  const wompiId     = sp.get('id')               || '';
  const wompiStatus = (sp.get('status') || '').toLowerCase();
  const wompiAmount = sp.get('amount-in-cents')  || '';
  window.history.replaceState({}, document.title, window.location.pathname);
  const raw = localStorage.getItem('cy_wompi_pending');
  if (!raw) return;
  const pending = JSON.parse(raw);
  if (pending.ref !== decodeURIComponent(wref)) return;
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

  postOrderToApi({ fullItems: od.fullItems || [], address: od.dir, paymentType: 'WOMPI' });

  const statusLabel = pending.wompiStatus ? pending.wompiStatus.toUpperCase() : null;
  const savedLat = parseFloat(getCyUser().lat) || null;
  const savedLng = parseFloat(getCyUser().lng) || null;
  const msg = buildOrderMessage({
    saludo: 'confirmo mi pedido', itemsBlock: od.itemsBlock, nom: od.nom, dir: od.dir,
    pago: 'Wompi', wompiRef: ref, wompiId: pending.wompiId, statusLabel,
    mapLat: savedLat, mapLng: savedLng,
  });

  if (!od.bpId && od.selectedIds?.length) {
    od.selectedIds.forEach(id => { cart = cart.filter(c => c.id !== id); checkedItems.delete(id); });
    saveCart(); updateCartUI(); renderCartPanel();
  }
  closeWompiResult();
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
    buyNowProduct = od.bpId ? (PRODUCTS.find(x => x.id === od.bpId) || null) : null;
    openOrderPopup();
    setTimeout(() => {
      document.getElementById('inputDireccion').value = od.dir || '';
      document.getElementById('inputNombre').value    = od.nom || '';
    }, 150);
  }, 350);
}

// ===== BUY NOW =====
function buyNow(id) {
  buyNowProduct = PRODUCTS.find(x => x.id === id);
  const p = buyNowProduct;
  let summary = `• ${p.name} &mdash; ${fmtPrice(p.price)}<br>`;
  if (p.oldPrice) summary += `<small style="color:var(--text-muted);text-decoration:line-through">${fmtPrice(p.oldPrice)}</small><br>`;
  document.getElementById('orderSummary').innerHTML = summary;
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

  // Auto-geocode saved address
  resetMapState();
  const mapWrap2 = document.getElementById('mapConfirmWrap');
  if (mapWrap2) mapWrap2.style.display = MAPS_ENABLED ? '' : 'none';
  const savedDir2 = _cu2.dir || '';
  if (MAPS_ENABLED && savedDir2) { _lastGeoDir = ''; setTimeout(() => geocodeAddress(savedDir2), 400); }
}

// ===== CART PANEL =====
function openCart()  { document.getElementById('cartOverlay').classList.add('open');    document.getElementById('cartPanel').classList.add('open');    document.body.style.overflow = 'hidden'; }
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
function renderWishPanel() {
  const container = document.getElementById('wishItems');
  if (!wishlist.length) {
    container.innerHTML = `<div class="wish-empty"><div class="wish-empty-icon">🤍</div><p>Aún no tienes favoritos</p><p style="font-size:11px;text-align:center">Toca el corazón en cualquier producto para guardarlo aquí</p></div>`;
    return;
  }
  container.innerHTML = wishlist.map(id => {
    const p      = PRODUCTS.find(x => x.id === id);
    if (!p) return '';
    const inCart = cart.some(c => c.id === id);
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
            ⚡ Comprar ahora
          </button>
          <button class="wish-btn-cart ${inCart ? 'added' : ''}" onclick="addToCart('${p.id}');renderWishPanel()">
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
  trackRecent(id);
  const i = wishlist.indexOf(id);
  if (i > -1) { wishlist.splice(i, 1); showToast('Eliminado de favoritos', '💔'); }
  else         { wishlist.push(id);     showToast('Guardado en favoritos',   '❤️'); }
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
function openProduct(id) {
  closeBannerPopup();
  trackRecent(id);
  const p      = PRODUCTS.find(x => x.id === id);
  trackEvent('PRODUCT_VIEW', { productId: p?.id, name: p?.name, category: p?.categoryId, price: p?.price });
  const inWish = wishlist.includes(id);
  const similar = PRODUCTS.filter(x => x.category === p.category && x.id !== id).slice(0, 20);
  document.getElementById('modalBody').innerHTML = `
    <div class="modal-grid">
      <div class="modal-gallery">
        <img class="modal-main-img" id="modalMainImg" src="${p.image}" alt="${p.name}" decoding="async">
      </div>
      <div class="modal-info">
        <div class="modal-seller">${typeof STORE_NAME !== 'undefined' ? STORE_NAME : 'PideFacil'}</div>
        <h2 class="modal-name">${p.name}</h2>
        <div class="modal-price-wrap">
          <span class="modal-price">${fmtPrice(p.price)}</span>
          ${p.oldPrice && p.oldPrice > p.price ? `<span class="modal-old">${fmtPrice(p.oldPrice)}</span><span class="modal-off">-${calcDiscount(p)}%</span>` : ''}
        </div>
        ${p.stock === 'low' ? '<div class="low-stock" style="font-size:12px">⚠️ Últimas unidades</div>' : ''}
        ${buildModalDesc(p.description)}
        <p class="modal-ref">REF: ${p.id.substring(0, 8).toUpperCase()}</p>
        <div class="modal-actions">
          <button class="btn btn-cart" style="width:100%;padding:12px;font-size:14px" onclick="addToCart('${p.id}');closeModal()">Agregar al carrito</button>
          <button class="btn btn-wish ${inWish ? 'active' : ''}" id="modalWishBtn" style="width:100%;padding:12px;font-size:14px" onclick="toggleWish(event,'${p.id}')">
            <svg viewBox="0 0 24 24" stroke="${inWish ? '#fff' : 'var(--primary)'}" stroke-width="2" fill="${inWish ? '#fff' : 'none'}"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span id="modalWishText">${inWish ? 'En favoritos' : 'Guardar en favoritos'}</span>
          </button>
          <button class="btn btn-wa" style="width:100%;padding:12px;font-size:14px" onclick="buyNow('${p.id}')">
            <svg viewBox="0 0 24 24" style="width:18px;height:18px"><path fill="#25D366" d="M12 0C5.373 0 0 5.373 0 12c0 2.025.507 3.967 1.399 5.671L.1 23.9l6.499-1.699A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0z"/><path fill="#fff" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/></svg>
            Comprar por WhatsApp
          </button>
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
    let moveCount = 0;
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
function closeModal() { document.getElementById('modalOverlay').classList.remove('open'); document.body.style.overflow = ''; }
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
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) {}
  const body     = document.getElementById('ordersBody');
  const pill     = document.getElementById('ordersCountPill');
  const clearBtn = document.getElementById('btnClearOrders');
  if (pill)     pill.textContent      = hist.length;
  if (clearBtn) clearBtn.style.display = hist.length ? 'flex' : 'none';
  if (!hist.length) {
    body.innerHTML = `<div class="orders-empty">
      <div class="orders-empty-icon">📋</div>
      <p style="font-weight:600;font-family:var(--font-head)">Sin pedidos aún</p>
      <p style="font-size:11px;text-align:center;max-width:240px;line-height:1.6">Cuando hagas tu primer pedido, aparecerá aquí con todos los detalles.</p>
    </div>`;
    return;
  }
  body.innerHTML = hist.map((ord, idx) => {
    const items    = ord.items || [];
    const itemsHtml = items.length
      ? items.map(it => `<div class="ord-item-row"><span class="ord-item-name">${it.name} ×${it.qty}</span><span class="ord-item-price">$${(it.price * it.qty).toLocaleString('es-CO')}</span></div>`).join('')
      : `<div style="font-size:12px;color:var(--text-muted)">${(ord.summaryHtml || 'Detalle no disponible').replace(/<[^>]*>/g, ' ')}</div>`;
    const wompiExtra = (ord.type === 'wompi' || ord.pago === 'Wompi') ? `
      ${ord.wompiRef ? `<div class="ord-info-row"><span class="ord-info-icon">🧾</span><span>Ref: <span class="ord-info-mono">${ord.wompiRef}</span></span></div>` : ''}
      ${ord.wompiId  ? `<div class="ord-info-row"><span class="ord-info-icon">🔢</span><span>ID Trans: <span class="ord-info-mono">${ord.wompiId}</span></span></div>` : ''}
    ` : '';
    const displayRef = ord.wompiRef || ord.id;
    return `<div class="ord-card">
      <div class="ord-card-head" onclick="toggleOrdCard(this)">
        <div style="flex:1;min-width:0">
          <div class="ord-card-ref">${displayRef}</div>
          <div class="ord-card-date">${fmtDateOrder(ord.date)}</div>
        </div>
        ${ordStatusChip(ord)}
        <button class="ord-toggle-btn" onclick="toggleOrdCard(this)" title="Ver / ocultar detalles">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      </div>
      <div class="ord-card-collapsible">
        <div class="ord-card-items">
          ${itemsHtml}
          <div class="ord-total-row"><span>Total</span><span>${ord.totalFmt}</span></div>
        </div>
        <div class="ord-card-info">
          <div class="ord-info-row"><span class="ord-info-icon">👤</span><span>${ord.nombre}</span></div>
          <div class="ord-info-row"><span class="ord-info-icon">📍</span><span>${ord.direccion}</span></div>
          <div class="ord-info-row"><span class="ord-info-icon">💳</span><span>${ord.pago}</span></div>
          ${wompiExtra}
        </div>
        <div class="ord-card-actions">
          <button class="btn-repeat-order" onclick="repeatOrder(${idx})">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/></svg>
            Repetir pedido
          </button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openOrdersHistory() {
  renderOrdersHistory();
  document.getElementById('ordersOverlay').classList.add('open');
  document.getElementById('ordersPanel').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function repeatOrder(idx) {
  let hist = [];
  try { hist = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); } catch (e) {}
  const ord = hist[idx];
  if (!ord) return;

  // Build items from current PRODUCTS catalog (use current prices)
  const items = (ord.items || []).reduce((acc, it) => {
    const product = PRODUCTS.find(p => p.id === it.id);
    if (product) acc.push({ product, qty: it.qty });
    return acc;
  }, []);

  if (!items.length) { showToast('Los productos de este pedido ya no están disponibles', '⚠️'); return; }

  repeatOrderItems = items; // bypass cart entirely

  closeOrdersHistory();
  setTimeout(() => {
    openOrderPopup();
    setTimeout(() => {
      if (ord.direccion) document.getElementById('inputDireccion').value = ord.direccion;
      if (ord.nombre)    document.getElementById('inputNombre').value    = ord.nombre;
    }, 150);
  }, 300);
}

function closeOrdersHistory() {
  document.getElementById('ordersOverlay').classList.remove('open');
  document.getElementById('ordersPanel').classList.remove('open');
  document.body.style.overflow = '';
}
function clearOrdersHistory() {
  if (!confirm('¿Borrar todo el historial de pedidos? Esta acción no se puede deshacer.')) return;
  localStorage.removeItem(ORDERS_KEY);
  renderOrdersHistory();
  showToast('Historial borrado', '🗑️');
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
function openBannerPopup(filter, title) {
  const products = filter === 'offer'
    ? PRODUCTS.filter(p => p.oldPrice && p.oldPrice > p.price)
    : PRODUCTS.filter(p => p.category === filter);
  document.getElementById('bnrPopupTitle').textContent = title;
  document.getElementById('bnrPopupGrid').innerHTML    = products.map(p => buildCard(p)).join('');
  document.getElementById('bnrPopupOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeBannerPopup() { document.getElementById('bnrPopupOverlay').classList.remove('open'); document.body.style.overflow = ''; }
function handleBnrPopupClick(e) { if (e.target === document.getElementById('bnrPopupOverlay')) closeBannerPopup(); }

document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeModal(); closeCart(); closeOrderPopup(); closeBannerPopup(); closeSearchDropdown(); closeMoreMenu(); closePromoPopup(); } });

// ===== MORE MENU =====
function toggleMoreMenu() {
  const dd = document.getElementById('moreMenuDropdown');
  const open = dd.classList.toggle('open');
  document.getElementById('moreMenuBtn').classList.toggle('active', open);
  if (open) setTimeout(() => document.addEventListener('click', _moreMenuOutside, { once: true }), 0);
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
function showPromoPopup() {
  const ad = POPUP_AD;
  if (!ad || !ad.id) return;
  if (localStorage.getItem(POPUP_DISMISSED_KEY) === ad.id) return;
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
  const disc = (ad.oldPrice && ad.oldPrice > ad.price)
    ? Math.round((ad.oldPrice - ad.price) / ad.oldPrice * 100) : 0;
  document.getElementById('ppProductImg').src            = ad.image || '';
  document.getElementById('ppProductName').textContent   = ad.name || '';
  document.getElementById('ppProductBadge').textContent  = ad.badge || '';
  const descEl = document.getElementById('ppProductDesc');
  descEl.textContent = ad.description || '';
  descEl.style.display = ad.description ? '' : 'none';
  document.getElementById('ppProductPrice').textContent  = fmtPrice(ad.price);
  document.getElementById('ppProductSeller').textContent = ad.sellerName || '';
  const oldEl  = document.getElementById('ppProductOld');
  const discEl = document.getElementById('ppProductDisc');
  const ribbon = document.getElementById('ppProductRibbon');
  if (ad.oldPrice && disc > 0) {
    oldEl.textContent    = fmtPrice(ad.oldPrice);
    discEl.textContent   = '-' + disc + '%';
    discEl.style.display = '';
    ribbon.style.display = '';
  } else {
    oldEl.textContent    = '';
    discEl.style.display = 'none';
    ribbon.style.display = 'none';
  }
  document.getElementById('ppProductWa').href = promoWaUrl(ad);
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
  // Always overwrite the single key with the current popup id
  if (POPUP_AD && POPUP_AD.id) localStorage.setItem(POPUP_DISMISSED_KEY, POPUP_AD.id);
  closePromoPopup();
}
function promoPopCta() {
  closePromoPopup();
  if (_promoPopAction) filterCategory(_promoPopAction, null);
}

// ===== RECENTLY VIEWED =====
function trackRecent(id) {
  if (!id || !PRODUCTS.find(p => p.id === id)) return;
  let recent = [];
  try { recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (_) {}
  recent = [id, ...recent.filter(x => x !== id)].slice(0, RECENT_MAX);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  renderRecentlyViewed();
}
function renderRecentlyViewed() {
  let ids = [];
  try { ids = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (_) {}
  const products = ids.map(id => PRODUCTS.find(p => p.id === id)).filter(Boolean);
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
function applyCupon() {
  const raw  = (document.getElementById('inputCupon').value || '').trim().toUpperCase();
  const fb   = document.getElementById('cuponFeedback');
  if (!raw) { fb.textContent = ''; fb.className = 'cupon-feedback'; _appliedCoupon = null; _refreshSummaryDiscount(); return; }
  const found = COUPONS.find(c => c.code.toUpperCase() === raw);
  if (!found) {
    fb.textContent = 'Cup\u00f3n no v\u00e1lido';
    fb.className   = 'cupon-feedback err';
    _appliedCoupon = null;
  } else {
    fb.textContent = '\u2705 ' + found.label + ' aplicado';
    fb.className   = 'cupon-feedback ok';
    _appliedCoupon = found;
  }
  _refreshSummaryDiscount();
}
function calcCouponDiscount(total) {
  if (!_appliedCoupon) return 0;
  if (_appliedCoupon.type === 'percent') return Math.round(total * _appliedCoupon.value / 100);
  if (_appliedCoupon.type === 'fixed')   return Math.min(_appliedCoupon.value, total);
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
    row.innerHTML = '\uD83C\uDFF7\uFE0F Cup\u00f3n <strong>' + _appliedCoupon.code + '</strong>: -' + fmtPrice(disc);
    row.style.cssText = 'color:var(--secondary);font-size:13px;margin-top:6px;';
    el.appendChild(row);
    if (hdr2) hdr2.textContent = 'Total: ' + fmtPrice(_currentOrderTotal - disc);
  } else {
    if (hdr2) hdr2.textContent = 'Total: ' + fmtPrice(_currentOrderTotal);
  }
}
