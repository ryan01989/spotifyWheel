/*
 * SpotifyWheel exploded view: highlights the parts that belong to the section being read.
 *
 * Markup:
 *   <figure class="sw-exploded" data-src="exploded/" aria-label="Exploded view of SpotifyWheel">
 *     <img src="exploded/assembled.webp" alt="SpotifyWheel">   <!-- fallback before JS / without JS -->
 *     <figcaption></figcaption>
 *   </figure>
 *   <script src="exploded/exploded.js" defer></script>
 *
 * The highlighted section follows scrolling (sections are found by id) and changes on nav-link clicks.
 */
(() => {
  // ---- which parts light up for each section (ids must match the page's section ids) -------------
  const BUILD = ['wheel', 'shell', 'plate', 'holder', 'hall', 'ring', 'bracket', 'gear',
                 'standoffs', 'scr_standoff', 'scr_holder', 'scr_boards', 'inserts'];
  const SECTIONS = {
    'see-it-in-action': { mode: 'assembled' },
    'how-it-works':     { mode: 'focus', primary: ['motor', 'gear', 'ring', 'magnets', 'hall'],
                          caption: 'Motor, gears, magnets and hall sensors' },
    'build':            { mode: 'focus', primary: BUILD, ghost: ['display'], caption: 'Printed parts and fasteners' },
    'software':         { mode: 'focus', primary: ['display', 'pi', 'tb'], screen: true,
                          caption: 'Display, Pi Zero 2 W and TB6612' },
    'hardware':         { mode: 'focus', primary: ['pi', 'tb'], lift: ['pi', 'tb'],
                          secondary: ['motor', 'gear', 'bearing', 'magnets', 'display'],
                          caption: 'Pi Zero 2 W, TB6612 and the parts they drive' },
    'what-went-wrong':  { mode: 'assembled' },
    'make-it-yourself': { mode: 'assembled' },
  };
  const DEFAULT = { mode: 'assembled' };       // above the first section
  const GAP = 36;                              // dimmed parts above/below the highlight step away by this (canvas px)
  const LIFT_PX = 14;                          // extra lift for the strongest-emphasis parts (canvas px)
  const SPY_LINE = 0.35;                       // a section is "current" once its top passes 35% of the viewport
  const NARROW = '(max-width: 767px)';         // phones: just show the assembled device

  function init(fig) {
    const base = (fig.dataset.src || 'exploded/').replace(/\/?$/, '/');
    fetch(base + 'manifest.json').then(r => r.json()).then(m => build(fig, base, m));
  }

  function build(fig, base, m) {
    // stage covers the union of every layer at rest and fully collapsed, plus the assembled image
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const grow = (b, dx = 0, dy = 0) => {
      if (!b) return;
      x0 = Math.min(x0, b.x + dx); y0 = Math.min(y0, b.y + dy);
      x1 = Math.max(x1, b.x + b.w + dx); y1 = Math.max(y1, b.y + b.h + dy);
    };
    m.layers.forEach(l => { grow(l.base, 0, -GAP - LIFT_PX); grow(l.base, 0, GAP); grow(l.base, l.collapse[0], l.collapse[1]); });
    grow(m.assembled);
    const pad = 12; x0 -= pad; y0 -= pad; x1 += pad; y1 += pad;
    const SW = x1 - x0, SH = y1 - y0;

    const stage = document.createElement('div');
    stage.className = 'sw-stage';
    stage.style.aspectRatio = `${SW} / ${SH}`;
    const place = (el, b) => {
      el.style.left = `${(b.x - x0) / SW * 100}%`; el.style.top = `${(b.y - y0) / SH * 100}%`;
      el.style.width = `${b.w / SW * 100}%`;
    };
    const img = (b, cls) => {
      const i = new Image(); i.src = base + b.src; i.alt = ''; i.decoding = 'async';
      i.className = cls; place(i, b); return i;
    };

    // all part layers live in one group so the exploded view can fade as a single picture
    const group = document.createElement('div'); group.className = 'sw-parts'; stage.appendChild(group);
    const parts = {};                     // name -> { els: [...], collapse }
    const overlays = [];
    m.layers.forEach(l => {
      const els = [];
      const wrapB = img(l.base, 'sw-layer'); els.push(wrapB); group.appendChild(wrapB);
      if (l.base_on) { const on = img(l.base_on, 'sw-layer sw-screen-on'); els.push(on); group.appendChild(on); }
      if (l.overlay) { const o = img(l.overlay, 'sw-layer sw-overlay'); els.push(o); overlays.push(o); }
      if (l.overlay_on) { const o = img(l.overlay_on, 'sw-layer sw-overlay sw-screen-on'); els.push(o); overlays.push(o); }
      parts[l.name] = { els, collapse: l.collapse, cy: l.base.y + l.base.h / 2, y0: l.base.y, y1: l.base.y + l.base.h };
    });
    overlays.forEach(o => group.appendChild(o));     // overlays always sit above every base layer
    const asm = img(m.assembled, 'sw-assembled'); stage.appendChild(asm);

    const fallback = fig.querySelector(':scope > img');
    fig.insertBefore(stage, fig.firstChild);
    if (fallback) fallback.remove();
    fig.classList.add('sw-ready');
    const cap = fig.querySelector('figcaption');

    // ---- apply a state ------------------------------------------------------------------------
    let scale = 1;
    const measure = () => { scale = stage.clientWidth / SW; apply(current, true); };
    let current = null, leaveTimer = 0;
    function apply(state, force) {
      if (state === current && !force) return;
      const wasAssembled = fig.classList.contains('is-assembled');
      current = state;
      const assembled = state.mode === 'assembled';
      // coming out of the assembled view gets its own timing (see .sw-leaving in exploded.css)
      clearTimeout(leaveTimer);
      if (wasAssembled && !assembled) {
        fig.classList.add('sw-leaving');
        leaveTimer = setTimeout(() => fig.classList.remove("sw-leaving"), 1700);
      } else if (assembled) fig.classList.remove('sw-leaving');
      fig.classList.toggle('is-assembled', assembled);
      fig.classList.toggle('is-screen-on', !!state.screen);
      const prim = new Set(state.primary || []), sec = new Set(state.secondary || []), lift = new Set(state.lift || []);
      const ghost = new Set(state.ghost || []);
      // vertical span of the highlighted parts: dimmed parts outside it step away to give it room
      let top = Infinity, bot = -Infinity;
      for (const [n, p] of Object.entries(parts)) if (prim.has(n) || sec.has(n)) { top = Math.min(top, p.y0); bot = Math.max(bot, p.y1); }
      for (const [name, p] of Object.entries(parts)) {
        let k = 0, dy = 0, role = 'dim';
        if (assembled) { k = 1; role = 'asm'; }
        else if (prim.has(name)) { role = 'primary'; if (lift.has(name)) dy = -LIFT_PX; }
        else if (sec.has(name)) { role = 'secondary'; }
        else {
          if (ghost.has(name)) role = 'ghost';          // dimmed and see-through
          if (p.cy < top) dy = -GAP; else if (p.cy > bot) dy = GAP;
        }
        const tx = p.collapse[0] * k * scale, ty = (p.collapse[1] * k + dy) * scale;
        for (const el of p.els) {
          el.style.transform = `translate(${tx.toFixed(2)}px, ${ty.toFixed(2)}px)`;
          el.dataset.role = role;
          if (role === 'primary' && lift.has(name)) el.dataset.lift = ''; else delete el.dataset.lift;
        }
      }
      if (cap) cap.textContent = state.caption || '';
      fig.setAttribute('aria-label', 'Exploded view of SpotifyWheel' + (state.caption ? ': ' + state.caption : ''));
    }

    // ---- which section is current ------------------------------------------------------------
    const ids = Object.keys(SECTIONS).filter(id => document.getElementById(id));
    const narrow = window.matchMedia(NARROW);
    function spy() {
      if (narrow.matches) return apply(DEFAULT);
      const line = window.innerHeight * SPY_LINE;
      let best = null, bestTop = -Infinity;
      for (const id of ids) {
        const top = document.getElementById(id).getBoundingClientRect().top;
        if (top <= line && top > bestTop) { best = id; bestTop = top; }
      }
      apply(best ? SECTIONS[best] : DEFAULT);
    }
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; spy(); }); }
    }, { passive: true });
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      const id = a && a.getAttribute('href').slice(1);
      if (id && SECTIONS[id] && !narrow.matches) apply(SECTIONS[id]);   // respond immediately; scrolling confirms it
    });
    narrow.addEventListener('change', spy);
    new ResizeObserver(measure).observe(stage);
    scale = stage.clientWidth / SW || 1;
    spy();
  }

  const start = () => document.querySelectorAll('figure.sw-exploded').forEach(init);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
