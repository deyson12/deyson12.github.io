/**
 * banner-templates.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Registro de plantillas de banner.
 * Para agregar una nueva plantilla:
 *   1. Agrega una entrada en BANNER_TEMPLATES con una key única.
 *   2. Implementa la función render(b) que recibe el BannerDTO y retorna HTML.
 *   3. Asegúrate de que los estilos CSS del template existan en app.css.
 *   4. En la BD, usa esa key como valor del campo `template` del banner.
 *
 * Campos del BannerDTO disponibles en render(b):
 *   b.id, b.bg, b.labelColor, b.accentColor, b.btnBg, b.btnColor,
 *   b.deco, b.deco2, b.label, b.title, b.titleEm, b.sub,
 *   b.btn1 { text, action, args }, b.btn2 { text, action, args },
 *   b.template
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BANNER_TEMPLATES = {

  // ─── GLOW (default) ────────────────────────────────────────────────────────
  // Fondo oscuro con punto de luz central y anillos concéntricos.
  // Ideal para banners nocturnos / premium.
  'glow': {
    label: 'Glow',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const btnStyle = `background:${b.btnBg};color:${b.btnColor};`;
      const tagStyle = `background:${acc}30;border-color:${acc}70;color:${b.labelColor || acc};`;
      return `<div class="sbnr">
  <div class="sbnr-glow" style="background:${b.bg}">
    <div class="sbnr-glow-spot" style="background:radial-gradient(circle,${acc}60 0%,transparent 70%)"></div>
    <div class="sbnr-glow-ring" style="border-color:${acc}38"></div>
    <div class="sbnr-glow-ring2"></div>
    <div class="sbnr-glow-content">
      <span class="sbnr-glow-tag" style="${tagStyle}">${b.label}</span>
      <h2 class="sbnr-glow-title" style="text-shadow:0 0 40px ${acc}66">${b.title}<br><em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-glow-sub">${b.sub}</p>
      <div class="sbnr-glow-btns">
        <button class="sbnr-glow-btn" style="${btnStyle}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-deco">${b.deco}</div>
  </div>
</div>`;
    }
  },

  // ─── NEON DARK ─────────────────────────────────────────────────────────────
  // Fondo negro puro con línea de acento superior, título outline y emoji lateral.
  // Ideal para banners tech / noche.
  'neon-dark': {
    label: 'Neon Dark',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-o4">
    <div class="sbnr-o4-line" style="background:linear-gradient(90deg,transparent 0%,${acc} 30%,${acc}aa 60%,transparent 100%)"></div>
    <div class="sbnr-o4-line2"></div>
    <div class="sbnr-o4-content">
      <div class="sbnr-o4-tag" style="color:${acc}">${b.label}</div>
      <h2 class="sbnr-o4-title">${b.title}<br><em style="-webkit-text-stroke:1.5px ${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-o4-sub">${b.sub}</p>
      <div class="sbnr-o4-btns">
        <button class="sbnr-o4-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-o4-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-o4-emoji">${b.deco}</div>
  </div>
</div>`;
    }
  },

  // ─── FROSTED LIGHT ─────────────────────────────────────────────────────────
  // Fondo cálido degradado con blobs de color y tarjeta glassmorphism central.
  // Ideal para banners de día / marcas frescas.
  'frosted': {
    label: 'Frosted Light',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-o5">
    <div class="sbnr-o5-bg" style="background:${b.bg}"></div>
    <div class="sbnr-o5-blob" style="background:radial-gradient(circle,${acc}30 0%,transparent 70%)"></div>
    <div class="sbnr-o5-blob2"></div>
    <div class="sbnr-o5-card">
      <span class="sbnr-o5-tag" style="background:${acc}">${b.label}</span>
      <h2 class="sbnr-o5-title">${b.title}<br><em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-o5-sub">${b.sub}</p>
      <div class="sbnr-o5-btns">
        <button class="sbnr-o5-btn" style="background:${acc};box-shadow:0 4px 14px ${acc}55" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-o5-ghost" style="color:${acc};border-color:${acc}55" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── DIAGONAL SPLIT ────────────────────────────────────────────────────────
  // Grid dividido en dos columnas con corte diagonal (clip-path).
  // Lado izquierdo con texto, lado derecho con emoji y patrón de rayas.
  'diagonal-split': {
    label: 'Diagonal Split',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-o6">
    <div class="sbnr-o6-left">
      <span class="sbnr-o6-tag">${b.label}</span>
      <h2 class="sbnr-o6-title">${b.title}<br><em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-o6-sub">${b.sub}</p>
      <div class="sbnr-o6-btns">
        <button class="sbnr-o6-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-o6-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-o6-right" style="background:${acc}">
      <div class="sbnr-o6-strips"></div>
      <span class="sbnr-o6-emoji">${b.deco}</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── MARQUEE STRIP ─────────────────────────────────────────────────────────
  // Banda superior con texto desplazándose, contenido izquierdo + emoji derecho.
  // Ideal para lanzamientos, drops, colecciones nuevas.
  'marquee': {
    label: 'Marquee Strip',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const tick = Array(10).fill(`${b.label}&emsp;·&emsp;`).join('');
      return `<div class="sbnr">
  <div class="sbnr-mk" style="background:${b.bg}">
    <div class="sbnr-mk-strip" style="background:${acc}">
      <div class="sbnr-mk-marquee">
        <span class="sbnr-mk-inner">${tick}</span>
        <span class="sbnr-mk-inner" aria-hidden="true">${tick}</span>
      </div>
    </div>
    <div class="sbnr-mk-body">
      <div class="sbnr-mk-left">
        <h2 class="sbnr-mk-title">${b.title}<br><em style="color:${acc}">${b.titleEm}</em></h2>
        <p class="sbnr-mk-sub">${b.sub}</p>
        <div class="sbnr-mk-btns">
          <button class="sbnr-mk-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
          <button class="sbnr-mk-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
        </div>
      </div>
      <div class="sbnr-mk-deco">${b.deco}</div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── BRUTALIST ─────────────────────────────────────────────────────────────
  // Fondo plano con barra lateral de acento, tipografía oversized, botones flat.
  // Ideal para ventas agresivas / estética editorial dura.
  'brutalist': {
    label: 'Brutalist',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const tc  = b.labelColor  || '#111827';
      return `<div class="sbnr">
  <div class="sbnr-br">
    <div class="sbnr-br-bar" style="background:${acc}"></div>
    <div class="sbnr-br-bg" style="background:${b.bg}"></div>
    <div class="sbnr-br-content">
      <span class="sbnr-br-tag" style="background:${acc}">${b.label}</span>
      <h2 class="sbnr-br-title" style="color:${tc}">${b.title}<br><em style="-webkit-text-stroke:2px ${acc};color:transparent">${b.titleEm}</em></h2>
      <p class="sbnr-br-sub" style="color:${tc};opacity:.55">${b.sub}</p>
      <div class="sbnr-br-btns">
        <button class="sbnr-br-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-br-ghost" style="border-color:${acc};color:${acc}" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-br-deco">${b.deco}</div>
  </div>
</div>`;
    }
  },

  // ─── AURORA ────────────────────────────────────────────────────────────────
  // Fondo muy oscuro con blobs animados de color y grilla sutil.
  // Emoji flotante derecho. Premium / tech / cinematic.
  'aurora': {
    label: 'Aurora',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-au" style="background:${b.bg}">
    <div class="sbnr-au-blob1" style="background:radial-gradient(circle,${acc}50 0%,transparent 65%)"></div>
    <div class="sbnr-au-blob2" style="background:radial-gradient(circle,${acc}30 0%,transparent 65%)"></div>
    <div class="sbnr-au-blob3"></div>
    <div class="sbnr-au-grid"></div>
    <div class="sbnr-au-content">
      <div class="sbnr-au-eyebrow" style="border-color:${acc}55;color:${acc}">
        <span class="sbnr-au-dot" style="background:${acc}"></span>${b.label}
      </div>
      <h2 class="sbnr-au-title">${b.title}<br><em style="background:linear-gradient(90deg,${acc},${acc}88);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${b.titleEm}</em></h2>
      <p class="sbnr-au-sub">${b.sub}</p>
      <div class="sbnr-au-btns">
        <button class="sbnr-au-btn" style="background:linear-gradient(135deg,${acc},${acc}bb);box-shadow:0 4px 20px ${acc}55" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-au-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-au-right">
      <div class="sbnr-au-orb" style="background:radial-gradient(circle,${acc}35 20%,transparent 70%)"></div>
      <span class="sbnr-au-emoji">${b.deco}</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── MAGAZINE EDITORIAL ────────────────────────────────────────────────────
  // Columna izquierda coloreada con label vertical, derecha blanca editorial.
  // Inspirado en revistas de moda / lujo. Ideal para colecciones especiales.
  'magazine': {
    label: 'Magazine Editorial',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-mag">
    <div class="sbnr-mag-left" style="background:${b.bg}">
      <span class="sbnr-mag-vert" style="color:${b.labelColor || '#fff'}">${b.label}</span>
      <span class="sbnr-mag-decoL">${b.deco}</span>
    </div>
    <div class="sbnr-mag-right">
      <div class="sbnr-mag-rule" style="background:${acc}"></div>
      <div class="sbnr-mag-issue" style="color:${acc}">— ${b.label}</div>
      <h2 class="sbnr-mag-title">${b.title}&nbsp;<strong style="color:${acc}">${b.titleEm}</strong></h2>
      <p class="sbnr-mag-sub">${b.sub}</p>
      <div class="sbnr-mag-btns">
        <button class="sbnr-mag-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-mag-ghost" style="border-color:${acc}55;color:${acc}" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── SPOTLIGHT ─────────────────────────────────────────────────────────────
  // Fondo oscuro con cono de luz cenital, grilla de puntos, contenido centrado.
  // Efecto escénico / teatral. Ideal para novedades y destacados.
  'spotlight': {
    label: 'Spotlight',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-spot" style="background:${b.bg}">
    <div class="sbnr-spot-cone" style="background:conic-gradient(from 260deg at 50% -10%,transparent 25deg,${acc}22 55deg,transparent 85deg)"></div>
    <div class="sbnr-spot-dots"></div>
    <div class="sbnr-spot-content">
      <div class="sbnr-spot-badge" style="background:${acc}20;border-color:${acc}50;color:${acc}">${b.label}</div>
      <h2 class="sbnr-spot-title">${b.title}&nbsp;<em style="background:linear-gradient(90deg,${acc},#ffb347);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${b.titleEm}</em></h2>
      <p class="sbnr-spot-sub">${b.sub}</p>
      <div class="sbnr-spot-btns">
        <button class="sbnr-spot-btn" style="background:${acc};box-shadow:0 0 24px ${acc}60" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-spot-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-spot-deco">${b.deco}</div>
  </div>
</div>`;
    }
  },

  // ─── RETRO WAVE ────────────────────────────────────────────────────────────
  // Estética synthwave 80s: scanlines, grilla de perspectiva, título degradado.
  // Ideal para ofertas especiales, eventos nocturnos, ediciones limitadas.
  'retro': {
    label: 'Retro Wave',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-rw">
    <div class="sbnr-rw-bg" style="background:${b.bg}"></div>
    <div class="sbnr-rw-scan"></div>
    <div class="sbnr-rw-grid"></div>
    <div class="sbnr-rw-sun" style="background:linear-gradient(to bottom,${acc} 0%,${acc}00 100%);box-shadow:0 0 60px ${acc}44"></div>
    <div class="sbnr-rw-content">
      <div class="sbnr-rw-tag" style="background:linear-gradient(90deg,${acc},#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${b.label}</div>
      <h2 class="sbnr-rw-title" style="text-shadow:0 0 30px ${acc}88">${b.title}<br><em style="background:linear-gradient(90deg,${acc},#ff69b4,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text">${b.titleEm}</em></h2>
      <p class="sbnr-rw-sub">${b.sub}</p>
      <div class="sbnr-rw-btns">
        <button class="sbnr-rw-btn" style="background:linear-gradient(90deg,${acc},#a855f7);box-shadow:0 4px 20px ${acc}55" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-rw-ghost" style="border-color:${acc}66;color:rgba(255,255,255,.65)" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-rw-deco">${b.deco}</div>
  </div>
</div>`;
    }
  },

  // ─── PILL ──────────────────────────────────────────────────────────────────
  // Centrado minimalista: badge pill animado + título limpio + botones outlined.
  // Estética Apple / SaaS. Ideal para anuncios elegantes.
  'pill': {
    label: 'Pill',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const isDark = b.bg && (b.bg.includes('#0') || b.bg.includes('dark') || b.bg.includes('1a') || b.bg.includes('11') || b.bg.includes('12') || b.bg.includes('18'));
      const tc = isDark ? '#fff' : (b.labelColor || '#111827');
      const sub = isDark ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.45)';
      return `<div class="sbnr">
  <div class="sbnr-pill" style="background:${b.bg};position:relative">
    <div class="sbnr-pill-noise"></div>
    <div class="sbnr-pill-content">
      <div class="sbnr-pill-badge" style="background:${acc}18;border:1px solid ${acc}40;color:${acc}">
        <span class="sbnr-pill-dot" style="background:${acc}"></span>${b.label}
      </div>
      <h2 class="sbnr-pill-title" style="color:${tc}">${b.title}&ensp;<em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-pill-sub" style="color:${sub}">${b.sub}</p>
      <div class="sbnr-pill-btns">
        <button class="sbnr-pill-btn" style="background:${acc};box-shadow:0 4px 18px ${acc}44" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-pill-ghost" style="border-color:${acc}55;color:${acc}" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── SIDE STAT ─────────────────────────────────────────────────────────────
  // Número/stat enorme en columna izquierda coloreada, contenido editorial derecho.
  // Ideal para descuentos, ediciones limitadas, conteos. Corporativo y directo.
  'side-stat': {
    label: 'Side Stat',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const parts = b.deco.match(/^(\d+)(.*)$/) || [b.deco, b.deco, ''];
      const num  = parts[1];
      const unit = parts[2] || b.deco;
      const showAsNum = /^\d/.test(b.deco);
      return `<div class="sbnr">
  <div class="sbnr-ss">
    <div class="sbnr-ss-left" style="background:${acc}">
      <div class="sbnr-ss-num" style="color:#fff">${showAsNum ? num : b.deco}</div>
      ${showAsNum ? `<div class="sbnr-ss-unit" style="color:rgba(255,255,255,.75)">${unit}</div>` : ''}
      <div class="sbnr-ss-bg-deco">${showAsNum ? '' : ''}</div>
    </div>
    <div class="sbnr-ss-right">
      <div class="sbnr-ss-tag" style="color:${acc}">${b.label}</div>
      <h2 class="sbnr-ss-title">${b.title}&ensp;<em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-ss-sub">${b.sub}</p>
      <div class="sbnr-ss-btns">
        <button class="sbnr-ss-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-ss-ghost" style="border-color:${acc}55;color:${acc}" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── DUO TONE ──────────────────────────────────────────────────────────────
  // Fondo sólido oscuro con línea de acento superior. Título grande y centrado.
  // Minimalista y muy impactante. Ideal para colecciones, lanzamientos.
  'duo-tone': {
    label: 'Duo Tone',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-duo">
    <div class="sbnr-duo-bg" style="background:${b.bg}"></div>
    <div class="sbnr-duo-line" style="background:linear-gradient(90deg,transparent,${acc},transparent)"></div>
    <div class="sbnr-duo-content">
      <div class="sbnr-duo-label" style="background:${acc}20;color:${acc}">${b.label}</div>
      <h2 class="sbnr-duo-title">${b.title}&ensp;<em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-duo-sub">${b.sub}</p>
      <div class="sbnr-duo-btns">
        <button class="sbnr-duo-btn" style="background:${acc};box-shadow:0 4px 20px ${acc}50" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-duo-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── INK ───────────────────────────────────────────────────────────────────
  // Título gigante que llena el banner. Label arriba, subtítulo y CTA abajo.
  // Máxima jerarquía tipográfica. Extremo y memorable.
  'ink': {
    label: 'Ink',
    render(b) {
      const acc = b.accentColor || '#F15200';
      return `<div class="sbnr">
  <div class="sbnr-ink">
    <div class="sbnr-ink-bg" style="background:${b.bg}"></div>
    <div class="sbnr-ink-accent-bar" style="background:${acc}"></div>
    <div class="sbnr-ink-top">
      <span class="sbnr-ink-label">${b.label}</span>
      <span class="sbnr-ink-num">— ${b.deco}</span>
    </div>
    <div class="sbnr-ink-mid">
      <h2 class="sbnr-ink-title">${b.title}<br><em style="color:${acc}">${b.titleEm}</em></h2>
    </div>
    <div class="sbnr-ink-bottom">
      <p class="sbnr-ink-sub">${b.sub}</p>
      <div class="sbnr-ink-btns">
        <button class="sbnr-ink-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-ink-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── BORDER FRAME ──────────────────────────────────────────────────────────
  // Marco interior de acento con esquinas decorativas. Contenido centrado.
  // Sofisticado y elegante. Ideal para luxury brands / eventos especiales.
  'border-frame': {
    label: 'Border Frame',
    render(b) {
      const acc = b.accentColor || '#F15200';
      const isDark = b.bg && (b.bg.includes('#0') || b.bg.includes('1a') || b.bg.includes('11') || b.bg.includes('12') || b.bg.includes('18'));
      const tc  = isDark ? '#fff' : (b.labelColor || '#111827');
      const sub = isDark ? 'rgba(255,255,255,.45)' : 'rgba(0,0,0,.4)';
      return `<div class="sbnr">
  <div class="sbnr-frame">
    <div class="sbnr-frame-bg" style="background:${b.bg}"></div>
    <div class="sbnr-frame-border" style="border-color:${acc}30"></div>
    <div class="sbnr-frame-corner sbnr-frame-corner-tl" style="border-color:${acc}"></div>
    <div class="sbnr-frame-corner sbnr-frame-corner-tr" style="border-color:${acc}"></div>
    <div class="sbnr-frame-corner sbnr-frame-corner-bl" style="border-color:${acc}"></div>
    <div class="sbnr-frame-corner sbnr-frame-corner-br" style="border-color:${acc}"></div>
    <div class="sbnr-frame-content">
      <div class="sbnr-frame-label" style="color:${acc}">${b.label}</div>
      <h2 class="sbnr-frame-title" style="color:${tc}">${b.title}&ensp;<em style="color:${acc}">${b.titleEm}</em></h2>
      <p class="sbnr-frame-sub" style="color:${sub}">${b.sub}</p>
      <div class="sbnr-frame-btns">
        <button class="sbnr-frame-btn" style="background:${acc};box-shadow:0 4px 16px ${acc}44;color:#000" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-frame-ghost" style="border-color:${acc}55;color:${acc}" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── BENTO GRID ────────────────────────────────────────────────────────────
  // Layout de cuadrícula asimétrica. Panel principal con acento + dos celdas stats.
  'bento-grid': {
    label: 'Bento Grid',
    render(b) {
      const acc = b.accentColor || '#e94560';
      return `<div class="sbnr">
  <div class="sbnr-bento" style="background:${b.bg || '#0f0f0f'}">
    <div class="sbnr-bento-main" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)">
      <span class="sbnr-bento-deco">${b.deco || '🛒'}</span>
      <div class="sbnr-bento-tag" style="border-color:${acc};color:${acc}">${b.label}</div>
      <h2 class="sbnr-bento-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <p class="sbnr-bento-sub">${b.sub}</p>
      <button class="sbnr-bento-btn" style="background:${acc}" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
    </div>
    <div class="sbnr-bento-cell" style="background:${acc}">
      <span class="sbnr-bento-cell-icon">⚡</span>
      <span class="sbnr-bento-cell-label">Velocidad</span>
      <span class="sbnr-bento-cell-value">Express</span>
    </div>
    <div class="sbnr-bento-cell" style="background:#10b981">
      <span class="sbnr-bento-cell-icon">💚</span>
      <span class="sbnr-bento-cell-label">Oferta</span>
      <span class="sbnr-bento-cell-value">Hasta 40%</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── NEON NIGHT ────────────────────────────────────────────────────────────
  // Fondo negro con grilla perspectivada, blobs de luz, título con gradiente.
  'neon-night': {
    label: 'Neon Night',
    render(b) {
      const acc = b.accentColor || '#a855f7';
      return `<div class="sbnr">
  <div class="sbnr-neon" style="background:${b.bg || '#07040f'}">
    <div class="sbnr-neon-grid"></div>
    <div class="sbnr-neon-glow-l"></div>
    <div class="sbnr-neon-glow-r"></div>
    <div class="sbnr-neon-content">
      <div class="sbnr-neon-eyebrow">Edición especial</div>
      <h2 class="sbnr-neon-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <p class="sbnr-neon-sub">${b.sub}</p>
      <div class="sbnr-neon-btns">
        <button class="sbnr-neon-primary" style="background:linear-gradient(135deg,${acc},#ec4899)" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-neon-ghost" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-neon-deco" style="filter:drop-shadow(0 0 22px ${acc}88)">${b.deco || '✨'}</div>
  </div>
</div>`;
    }
  },

  // ─── LIQUID GRADIENT ───────────────────────────────────────────────────────
  // Fondo gradiente orgánico con blobs morfantes animados. Emojis flotantes.
  'liquid-gradient': {
    label: 'Liquid Gradient',
    render(b) {
      const e1 = b.deco || '🥑';
      const e2 = b.deco2 || '🍊';
      return `<div class="sbnr">
  <div class="sbnr-liquid" style="background:linear-gradient(135deg,#ff6b35 0%,#f7931e 35%,#fcdd63 70%,#4ecdc4 100%)">
    <div class="sbnr-liquid-blob1"></div>
    <div class="sbnr-liquid-blob2"></div>
    <div class="sbnr-liquid-content">
      <div class="sbnr-liquid-badge">${b.label}</div>
      <h2 class="sbnr-liquid-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <p class="sbnr-liquid-sub">${b.sub}</p>
      <div class="sbnr-liquid-btns">
        <button class="sbnr-liquid-white" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-liquid-glass" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-liquid-deco">
      <span class="sbnr-liquid-em1">${e1}</span>
      <span class="sbnr-liquid-em2">${e2}</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── GLASSMORPHISM ─────────────────────────────────────────────────────────
  // Fondo degradado azul-índigo con vidrio esmerilado central y pills laterales.
  'glassmorphism': {
    label: 'Glassmorphism',
    render(b) {
      return `<div class="sbnr">
  <div class="sbnr-glass" style="background:linear-gradient(145deg,#0ea5e9 0%,#6366f1 50%,#8b5cf6 100%)">
    <div class="sbnr-glass-bg-circles">
      <div class="sbnr-glass-c1"></div>
      <div class="sbnr-glass-c2"></div>
      <div class="sbnr-glass-c3"></div>
    </div>
    <div class="sbnr-glass-card">
      <span class="sbnr-glass-tag">✦ Colección Premium</span>
      <h2 class="sbnr-glass-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <p class="sbnr-glass-sub">${b.sub}</p>
      <div class="sbnr-glass-btns">
        <button class="sbnr-glass-solid" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-glass-outline" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-glass-right">
      <div class="sbnr-glass-pill"><span>🚀</span><span>Envío gratis</span></div>
      <div class="sbnr-glass-pill"><span>⭐</span><span>4.9/5</span></div>
      <div class="sbnr-glass-pill"><span>🔒</span><span>Seguro</span></div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── RETRO POP ─────────────────────────────────────────────────────────────
  // Fondo crema con patrón de puntos. Tipografía retro con highlight. Panel naranja.
  'retro-pop': {
    label: 'Retro Pop',
    render(b) {
      return `<div class="sbnr">
  <div class="sbnr-retro">
    <div class="sbnr-retro-left">
      <div class="sbnr-retro-dots-bg"></div>
      <span class="sbnr-retro-label">🔥 Ofertón</span>
      <h2 class="sbnr-retro-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <p class="sbnr-retro-sub">${b.sub}</p>
      <div class="sbnr-retro-btns">
        <button class="sbnr-retro-dark" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-retro-light" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-retro-right">
      <span class="sbnr-retro-emoji">${b.deco || '🛍️'}</span>
      <span class="sbnr-retro-price">${b.sub.includes('$') ? b.sub.split(' ').pop() : 'Desde $9.900'}</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── CINEMATIC ─────────────────────────────────────────────────────────────
  // Split 50/50: izquierda negra con scanlines, derecha verde con hexágonos.
  'cinematic': {
    label: 'Cinematic Split',
    render(b) {
      return `<div class="sbnr">
  <div class="sbnr-cinematic">
    <div class="sbnr-cinematic-left">
      <div class="sbnr-cinematic-scanlines"></div>
      <div class="sbnr-cinematic-number">01</div>
      <span class="sbnr-cinematic-tag">★ Nuevo ingreso</span>
      <h2 class="sbnr-cinematic-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <div class="sbnr-cinematic-divider"></div>
      <p class="sbnr-cinematic-sub">${b.sub}</p>
      <div class="sbnr-cinematic-btns">
        <button class="sbnr-cinematic-green" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-cinematic-wire" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-cinematic-right">
      <div class="sbnr-cinematic-img-bg"></div>
      <div class="sbnr-cinematic-hexes">
        <div class="sbnr-cinematic-hex"></div>
        <div class="sbnr-cinematic-hex"></div>
        <div class="sbnr-cinematic-hex"></div>
      </div>
      <div class="sbnr-cinematic-content">
        <div class="sbnr-cinematic-num">3-5 Días</div>
        <div class="sbnr-cinematic-label">Entrega</div>
      </div>
    </div>
  </div>
</div>`;
    }
  },

  // ─── PASTEL EDITORIAL ──────────────────────────────────────────────────────
  // Fondo lavanda con barra morada degradada. Estilo editorial. Círculo animado.
  'pastel-editorial': {
    label: 'Pastel Editorial',
    render(b) {
      return `<div class="sbnr">
  <div class="sbnr-pastel">
    <div class="sbnr-pastel-noise"></div>
    <div class="sbnr-pastel-line"></div>
    <div class="sbnr-pastel-content">
      <div class="sbnr-pastel-kicker">Tendencia del mes</div>
      <h2 class="sbnr-pastel-title">${b.title}<br><em>${b.titleEm}</em></h2>
      <div class="sbnr-pastel-hr"></div>
      <p class="sbnr-pastel-sub">${b.sub}</p>
      <div class="sbnr-pastel-btns">
        <button class="sbnr-pastel-fill" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
        <button class="sbnr-pastel-muted" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
      </div>
    </div>
    <div class="sbnr-pastel-deco">
      <div class="sbnr-pastel-circle"></div>
      <span class="sbnr-pastel-emoji">${b.deco || '🌸'}</span>
    </div>
  </div>
</div>`;
    }
  },

  // ─── STRIPE TICKER ────────────────────────────────────────────────────────
  // Banda ticker animada en ámbar, cuerpo negro, líneas verticales.
  'stripe-ticker': {
    label: 'Stripe Ticker',
    render(b) {
      const tickerText = b.label || 'Oferta especial';
      return `<div class="sbnr">
  <div class="sbnr-ticker">
    <div class="sbnr-ticker-strip">
      <div class="sbnr-ticker-track">
        <span class="sbnr-ticker-item">${tickerText}</span>
        <span class="sbnr-ticker-item">Nuevos productos</span>
        <span class="sbnr-ticker-item">Descuentos activos</span>
        <span class="sbnr-ticker-item">Pago fácil</span>
        <span class="sbnr-ticker-item">Garantía total</span>
        <span class="sbnr-ticker-item">${tickerText}</span>
        <span class="sbnr-ticker-item">Nuevos productos</span>
        <span class="sbnr-ticker-item">Descuentos activos</span>
        <span class="sbnr-ticker-item">Pago fácil</span>
        <span class="sbnr-ticker-item">Garantía total</span>
      </div>
    </div>
    <div class="sbnr-ticker-body">
      <div class="sbnr-ticker-lines"></div>
      <div class="sbnr-ticker-left">
        <div class="sbnr-ticker-pretitle">Sólo por hoy</div>
        <h2 class="sbnr-ticker-title">${b.title}<br><em>${b.titleEm}</em></h2>
        <p class="sbnr-ticker-sub">${b.sub}</p>
        <div class="sbnr-ticker-btns">
          <button class="sbnr-ticker-amber" onclick="_sbnrAct('${b.id}',0)">${b.btn1.text}</button>
          <button class="sbnr-ticker-dim" onclick="_sbnrAct('${b.id}',1)">${b.btn2.text}</button>
        </div>
      </div>
      <div class="sbnr-ticker-right">
        <div class="sbnr-ticker-stat">
          <div class="sbnr-ticker-stat-val">Hasta 30%</div>
          <div class="sbnr-ticker-stat-lbl">Descuento</div>
        </div>
      </div>
    </div>
  </div>
</div>`;
    }
  },

};

/**
 * Renders a banner using its template field.
 * Falls back to 'glow' if the template key is unknown or missing.
 * @param {Object} b - BannerDTO
 * @returns {string} HTML string
 */
function renderBannerTemplate(b) {
  const key = b.template && BANNER_TEMPLATES[b.template] ? b.template : 'glow';
  return BANNER_TEMPLATES[key].render(b);
}
