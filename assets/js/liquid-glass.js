/* Politics Hub APS — liquid glass
 *
 * Materials:
 *  1. Header and buttons: very clear "regular" glass that bends what is behind it like a lens
 *     (gentle magnification + strong bending at the rim + slight colour fringing).
 *     Modelled on the "Regular Glass" preset of liquid-glass.ybouane.com.
 *  2. Cards, stats and other panels: the layered glass of codepen.io/Petr-Knoll/pen/QwWLZdx,
 *     with a pointer-driven tilt; photos get a solid 3D frame with a moving glare.
 *  3. Dropdown menus: tinted blue "dark glass" (CSS only, see liquid-glass.css).
 *
 * How the lens works in each browser
 *  - Chrome, Edge, Brave, Opera ("backdrop" mode): an SVG displacement map applied through
 *    backdrop-filter bends the real page behind the glass.
 *  - Safari and Firefox ("mirror" mode): they cannot bend the backdrop, so the lens bends a live
 *    copy of what is behind it instead — the header gets a copy of the page that slides with the
 *    scroll; buttons get a copy of their section's background. Network lines are copied with
 *    <use>, so they keep moving; a live 3D scene is left visible through a window in the copy.
 *  - Reduced transparency / contrast preferences: no lens, solid surfaces.
 *  Testing: add ?lg=mirror (or ?lg=backdrop / ?lg=none) to any page URL to force a mode.
 *
 * Layers injected inside every glass element (all aria-hidden, pointer-events: none):
 *   .lg-shadow   soft ring shadow projected under a button (codepen .button-shadow)
 *   .lg-refract  lens layer (backdrop mode) / holder of the copy (mirror mode, buttons)
 *   .lg-body     the button's clear body redrawn above the copy (mirror mode)
 *   .lg-rim      conic outline that catches light (codepen button::after)
 *   .lg-shine    specular sweep + pointer light (codepen span::after)
 */
(function () {
  'use strict';

  var SVGNS = 'http://www.w3.org/2000/svg';
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var simpleGlass = window.matchMedia('(prefers-reduced-transparency: reduce), (prefers-contrast: more), (forced-colors: active)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ---------- Header lettering adapts to what is behind it ---------- */
  var header = document.querySelector('.site-header');
  var headerFrame = null;
  var DARK = '.hero, .page-hero, .manifesto-band, .site-footer, .banner-dark, .banner-5x1000, .event-panel.layout-hero';
  function updateHeader() {
    headerFrame = null;
    if (!header) return;
    header.classList.toggle('scrolled', window.scrollY > 60);
    var rect = header.getBoundingClientRect();
    var dark = 0, media = false, samples = [0.2, 0.5, 0.8];
    samples.forEach(function (f) {
      var hit = document.elementsFromPoint(rect.left + rect.width * f, rect.top + rect.height / 2)
        .find(function (el) { return !header.contains(el); });
      if (!hit) return;
      if (hit.closest(DARK)) dark++;
      // A 3D scene, photo or video can be bright even inside a dark section: be careful there.
      if (/^(CANVAS|IMG|VIDEO)$/.test(hit.tagName) || hit.closest('#hero-bulb-scene, .projects-bulb-stage')) media = true;
    });
    header.classList.toggle('over-dark', dark >= 2);
    header.classList.toggle('over-media', media);
  }
  function scheduleHeader() { if (headerFrame === null) headerFrame = requestAnimationFrame(updateHeader); }
  updateHeader();
  window.addEventListener('scroll', scheduleHeader, { passive: true });
  window.addEventListener('resize', scheduleHeader, { passive: true });

  /* ---------- Which elements are glass ---------- */
  var BUTTONS = '.btn, .hero .badge, .scroll-cue span';
  var PANELS = '.card, .stat, .contact-card, .event-panel:not(.layout-hero), .featured-article, .newsletter-box';
  // Photographs: standalone ones get their own 3D frame; those inside a panel move with it.
  var PHOTOS = '.gallery img, .member img, .article-cover';
  var INNER_PHOTOS = '.card > .thumb';
  var PHOTO_BOXES = '.event-panel .ev-img, .featured-article .fa-img';

  var canRefract = (function () {
    var ua = navigator.userAgent;
    var chromium = !!(navigator.userAgentData && navigator.userAgentData.brands &&
      navigator.userAgentData.brands.some(function (b) { return /Chromium/i.test(b.brand); }));
    if (!chromium) chromium = /Chrome\/\d+/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    return chromium && !!(window.CSS && CSS.supports && CSS.supports('backdrop-filter', 'url(#lg)'));
  })();
  // Safari and Firefox cannot bend the backdrop, but they can bend an element's own content.
  // There the lens is given a live copy of what lies behind it ("mirror" mode).
  var canFilter = !!(window.CSS && CSS.supports && CSS.supports('filter', 'url(#lg)'));
  var MODE = simpleGlass.matches ? 'none' : canRefract ? 'backdrop' : canFilter ? 'mirror' : 'none';
  var forced = /[?&]lg=(mirror|backdrop|none)\b/.exec(location.search);   // for testing: ?lg=mirror
  if (forced) MODE = forced[1];
  if (window.PH_LG_MODE) MODE = window.PH_LG_MODE;
  document.documentElement.classList.add(MODE === 'backdrop' ? 'lg-refracts' : MODE === 'mirror' ? 'lg-mirrors' : 'lg-clear-only');

  function layer(el, cls) {
    var s = document.createElement('span');
    s.className = cls;
    s.setAttribute('aria-hidden', 'true');
    el.insertBefore(s, el.firstChild);
    return s;
  }
  function install(el, kind) {
    if (el.classList.contains('lg')) return;
    el.classList.add('lg', 'lg-' + kind);
    layer(el, 'lg-shine');
    layer(el, 'lg-rim');
    var refract = layer(el, 'lg-refract');
    if (kind === 'button') { layer(el, 'lg-body'); layer(el, 'lg-shadow'); }
    if (kind === 'header' || kind === 'button') {
      if (MODE === 'backdrop') watch(el, refract);
      else if (MODE === 'mirror') mirrors.push({ el: el, layer: kind === 'header' ? headerLens() : refract, kind: kind });
    }
    if (kind === 'panel' && el.classList.contains('stat')) countUp(el);
  }
  function wrap(img, cls, glare) {
    if (img.parentNode && img.parentNode.classList && img.parentNode.classList.contains(cls)) return;
    var w = document.createElement('span');
    w.className = cls;
    img.parentNode.insertBefore(w, img);
    w.appendChild(img);
    if (glare) {
      var g = document.createElement('span');
      g.className = 'lg-glare';
      g.setAttribute('aria-hidden', 'true');
      w.appendChild(g);
    }
  }
  function installPhotos(root) {
    function each(sel, fn) {
      if (root.matches && root.matches(sel)) fn(root);
      root.querySelectorAll(sel).forEach(fn);
    }
    each(PHOTOS, function (img) { wrap(img, 'lg-photo', true); });
    each(INNER_PHOTOS, function (img) { wrap(img, 'lg-frame', false); });
    each(PHOTO_BOXES, function (box) { box.classList.add('lg-frame-box'); });
  }
  function installAll(root) {
    if (!root.querySelectorAll) return;
    installPhotos(root);
    [[BUTTONS, 'button'], [PANELS, 'panel']].forEach(function (pair) {
      if (root.matches && root.matches(pair[0])) install(root, pair[1]);
      root.querySelectorAll(pair[0]).forEach(function (el) { install(el, pair[1]); });
    });
  }

  /* ---------- Header refraction: displacement map ---------- */
  var defs = null, built = {};
  function ensureDefs() {
    if (defs) return defs;
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    defs = document.createElementNS(SVGNS, 'defs');
    svg.appendChild(defs);
    document.body.appendChild(svg);
    return defs;
  }
  // The lens. Every pixel samples the background a little closer to the centre:
  //  - dome: a gentle, even magnification of the whole pane (a thick convex slab)
  //  - rim:  strong bending across the bevel, so the edge gathers and warps what is behind
  // Offsets are encoded in red (x) and green (y); 128 means "no offset".
  var MAGNIFY = 0.07;
  function lensMap(w, h, radius, bevel) {
    var hw = w / 2, hh = h / 2, r = Math.min(radius, hw, hh);
    var vx = new Float32Array(w * h), vy = new Float32Array(w * h), maxLen = 1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var px = x + 0.5 - hw, py = y + 0.5 - hh;
        var qx = Math.abs(px) - (hw - r), qy = Math.abs(py) - (hh - r);
        var dist, nx, ny;
        if (qx > 0 && qy > 0) { var L = Math.sqrt(qx * qx + qy * qy) || 1; dist = r - L; nx = qx / L; ny = qy / L; }
        else if (qx > qy) { dist = r - qx; nx = 1; ny = 0; }
        else { dist = r - qy; nx = 0; ny = 1; }
        nx *= px < 0 ? -1 : 1; ny *= py < 0 ? -1 : 1;
        var t = Math.min(1, Math.max(0, dist) / bevel);
        var rim = dist < bevel ? bevel * 0.8 * Math.pow(1 - t, 2.2) : 0;
        var i = y * w + x;
        vx[i] = -nx * rim - px * MAGNIFY;
        vy[i] = -ny * rim - py * MAGNIFY;
        var len = Math.max(Math.abs(vx[i]), Math.abs(vy[i]));
        if (len > maxLen) maxLen = len;
      }
    }
    var scale = Math.ceil(maxLen * 2 + 2);
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var ctx = c.getContext('2d');
    var img = ctx.createImageData(w, h), d = img.data;
    for (var j = 0; j < w * h; j++) {
      d[j * 4] = 127.5 + vx[j] / scale * 255;
      d[j * 4 + 1] = 127.5 + vy[j] / scale * 255;
      d[j * 4 + 2] = 128; d[j * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
    return { url: c.toDataURL(), scale: scale };
  }
  // The header uses a shallower bevel (flat middle band) so the page behind it stays calm
  // under its lettering; buttons are fully domed.
  function filterFor(w, h, radius, soft) {
    var key = w + 'x' + h + 'r' + radius + (soft ? 's' : '');
    var bevelK = soft ? 0.38 : 0.5;
    if (built[key]) return built[key];
    var bevel = Math.max(8, Math.min(40, Math.round(Math.min(w, h) * bevelK)));   // zRadius 40
    var lens = lensMap(w, h, radius, bevel);
    var scale = lens.scale, ca = 0.02, id = 'lg-' + key;                          // chromatic aberration
    var src = soft ? 'soft' : 'SourceGraphic';
    var f = document.createElementNS(SVGNS, 'filter');
    f.setAttribute('id', id);
    f.setAttribute('x', '0'); f.setAttribute('y', '0');
    f.setAttribute('width', w); f.setAttribute('height', h);
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.innerHTML =
      '<feImage href="' + lens.url + '" xlink:href="' + lens.url + '" x="0" y="0" width="' + w + '" height="' + h + '" preserveAspectRatio="none" result="map"/>' +
      (soft ? '<feGaussianBlur in="SourceGraphic" stdDeviation="' + soft + '" result="soft"/>' : '') +
      '<feDisplacementMap in="' + src + '" in2="map" scale="' + (scale * (1 + ca)).toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="dr"/>' +
      '<feColorMatrix in="dr" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r"/>' +
      '<feDisplacementMap in="' + src + '" in2="map" scale="' + scale + '" xChannelSelector="R" yChannelSelector="G" result="dg"/>' +
      '<feColorMatrix in="dg" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="g"/>' +
      '<feDisplacementMap in="' + src + '" in2="map" scale="' + (scale * (1 - ca)).toFixed(2) + '" xChannelSelector="R" yChannelSelector="G" result="db"/>' +
      '<feColorMatrix in="db" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="b"/>' +
      '<feBlend in="r" in2="g" mode="screen" result="rg"/>' +
      '<feBlend in="rg" in2="b" mode="screen"/>';
    ensureDefs().appendChild(f);
    built[key] = id;
    return id;
  }
  function apply(el, refract) {
    var w = Math.round(refract.offsetWidth), h = Math.round(refract.offsetHeight);
    if (w < 8 || h < 8) return;
    var radius = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    radius = Math.min(Math.round(radius), Math.floor(Math.min(w, h) / 2));
    var soft = el.classList.contains('site-header') ? 1.2 : 0;
    var value = 'url(#' + filterFor(w, h, radius, soft) + ') saturate(1.3)';
    refract.style.backdropFilter = value;
    refract.style.webkitBackdropFilter = value;
    el.classList.add('lg-bends');
  }
  function watch(el, refract) {
    if ('ResizeObserver' in window) {
      new ResizeObserver(function () {
        if (refract.__f) cancelAnimationFrame(refract.__f);
        refract.__f = requestAnimationFrame(function () { apply(el, refract); });
      }).observe(refract);
    } else apply(el, refract);
  }

  /* ---------- Mirror lens (Safari, Firefox) ----------
   * The lens bends a live copy of what lies behind the glass:
   *  - header:  a copy of the whole page (main + footer), slid under the bar as you scroll
   *  - buttons: a copy of their section's background and network lines
   * Network lines are drawn with <use>, so the copies move with the real animation. */
  var mirrors = [];
  var NETS = 'svg[data-net], svg.net-auto, #mainNet';
  var netCount = 0;
  function tagNetworks() {
    document.querySelectorAll(NETS).forEach(function (svg) {
      if (svg.hasAttribute('data-lg-net') || svg.closest('.lg-refract')) return;
      var g = document.createElementNS(SVGNS, 'g');
      g.id = 'lg-net-' + (++netCount);
      while (svg.firstChild) g.appendChild(svg.firstChild);
      svg.appendChild(g);
      svg.setAttribute('data-lg-net', g.id);
    });
  }
  function liveCopy(node) {
    var c = node.cloneNode(true);
    var nets = c.matches && c.matches('[data-lg-net]') ? [c] : [];
    nets = nets.concat(Array.prototype.slice.call(c.querySelectorAll('[data-lg-net]')));
    nets.forEach(function (svg) {
      var id = svg.getAttribute('data-lg-net');
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      var use = document.createElementNS(SVGNS, 'use');
      use.setAttribute('href', '#' + id);
      use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#' + id);
      svg.appendChild(use);
      svg.removeAttribute('data-lg-net');
    });
    c.querySelectorAll('script, noscript, canvas, iframe, video, .lg-shadow, .lg-body').forEach(function (e) { e.remove(); });
    c.querySelectorAll('.lg-refract').forEach(function (e) { e.innerHTML = ''; e.removeAttribute('style'); });
    c.querySelectorAll('[id]').forEach(function (e) { e.removeAttribute('id'); });
    c.querySelectorAll('[data-bulb-project]').forEach(function (e) { e.removeAttribute('data-bulb-project'); });
    c.querySelectorAll('img[loading]').forEach(function (e) { e.removeAttribute('loading'); });
    c.querySelectorAll('a, button, input, select, textarea').forEach(function (e) { e.setAttribute('tabindex', '-1'); });
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.inert = true;
    return c;
  }
  function setLens(item) {
    var l = item.layer;
    var w = Math.round(l.offsetWidth), h = Math.round(l.offsetHeight);
    if (w < 8 || h < 8) return false;
    var radius = parseFloat(getComputedStyle(item.el).borderTopLeftRadius) || 0;
    radius = Math.min(Math.round(radius), Math.floor(Math.min(w, h) / 2));
    l.style.filter = 'url(#' + filterFor(w, h, radius, item.kind === 'header' ? 1.2 : 0) + ') saturate(1.3)';
    return true;
  }
  var HOSTS = 'section, .hero, .page-hero, .manifesto-band, .banner-dark, .banner-5x1000, .event-panel, .site-footer';
  var DECOR = '.hero-bg, .hero-tint, svg.net-bg, svg.net-auto';
  function isPainted(cs) {
    return cs.backgroundImage !== 'none' || !/rgba\(0, 0, 0, 0\)|transparent/.test(cs.backgroundColor);
  }
  function buildButton(item) {
    var el = item.el, l = item.layer;
    l.innerHTML = '';
    // The nearest ancestor that paints a background or carries decorative layers.
    var host = el.parentElement ? el.parentElement.closest(HOSTS) : null;
    while (host && !isPainted(getComputedStyle(host)) &&
           !Array.prototype.some.call(host.children, function (ch) { return ch.matches(DECOR); })) {
      host = host.parentElement ? host.parentElement.closest(HOSTS) : null;
    }
    var stage = document.createElement('div');
    stage.className = 'lg-stage';
    var er = el.getBoundingClientRect();
    if (host) {
      var hr = host.getBoundingClientRect(), cs = getComputedStyle(host);
      var bodyBg = getComputedStyle(document.body).backgroundColor;
      stage.style.cssText =
        'left:' + (hr.left - er.left) + 'px;top:' + (hr.top - er.top) + 'px;' +
        'width:' + hr.width + 'px;height:' + hr.height + 'px;' +
        'background-color:' + (isPainted(cs) ? cs.backgroundColor : bodyBg) + ';' +
        'background-image:' + cs.backgroundImage + ';background-size:' + cs.backgroundSize + ';' +
        'background-position:' + cs.backgroundPosition + ';background-repeat:' + cs.backgroundRepeat + ';';
      Array.prototype.forEach.call(host.children, function (ch) {
        if (ch.matches(DECOR)) stage.appendChild(liveCopy(ch));
      });
    } else {
      stage.style.cssText = 'inset:0;background:' + getComputedStyle(document.body).backgroundColor;
    }
    l.appendChild(stage);
    setLens(item);
  }
  // The header's lens lives at the end of <body>, fixed exactly behind the bar, so the copy of
  // the page never comes before the real page in the document (scripts keep finding the originals).
  var headerStage = null, lensEl = null;
  function headerLens() {
    if (!lensEl) {
      lensEl = document.createElement('div');
      lensEl.className = 'lg-header-lens';
      lensEl.setAttribute('aria-hidden', 'true');
      lensEl.inert = true;
      document.body.appendChild(lensEl);
    }
    return lensEl;
  }
  function asDiv(el) {                    // a copy of <main> must not be a second <main>
    if (el.tagName !== 'MAIN') return el;
    var d = document.createElement('div');
    d.className = el.className;
    while (el.firstChild) d.appendChild(el.firstChild);
    return d;
  }
  function buildHeader(item) {
    var l = item.layer;
    l.innerHTML = '';
    fitLens();
    var stage = document.createElement('div');
    stage.className = 'lg-stage lg-page';
    ['main', '.site-footer'].forEach(function (sel) {
      var src = document.querySelector(sel);
      if (!src) return;
      var r = src.getBoundingClientRect();
      var c = asDiv(liveCopy(src));
      c.style.position = 'absolute';
      c.style.margin = '0';
      c.style.left = (r.left + window.scrollX) + 'px';
      c.style.top = (r.top + window.scrollY) + 'px';
      c.style.width = r.width + 'px';
      stage.appendChild(c);
    });
    // A live 3D scene (the bulb) cannot be copied: leave a window in the copy so the real
    // scene shows through the glass instead of disappearing under it.
    var holes = Array.prototype.filter.call(document.querySelectorAll('main canvas'), function (cv) {
      return !cv.closest('.lg-refract') && cv.offsetWidth > 0 && cv.offsetHeight > 0;
    }).map(function (cv) {
      var r = cv.getBoundingClientRect();
      return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
    });
    if (holes.length) {
      var docW = document.documentElement.scrollWidth, docH = document.documentElement.scrollHeight;
      var layers = ['linear-gradient(#000,#000)'], sizes = [docW + 'px ' + docH + 'px'], pos = ['0 0'];
      holes.forEach(function (hole) {
        layers.push('linear-gradient(#000,#000)');
        sizes.push(hole.w + 'px ' + hole.h + 'px');
        pos.push(hole.x + 'px ' + hole.y + 'px');
      });
      stage.style.width = docW + 'px';
      stage.style.height = docH + 'px';
      ['webkitMask', 'mask'].forEach(function (p) {
        stage.style[p + 'Image'] = layers.join(',');
        stage.style[p + 'Size'] = sizes.join(',');
        stage.style[p + 'Position'] = pos.join(',');
        stage.style[p + 'Repeat'] = 'no-repeat';
      });
      stage.style.webkitMaskComposite = 'xor';
      stage.style.maskComposite = 'exclude';
    }
    l.appendChild(stage);
    headerStage = stage;
    syncHeader();
    setLens(item);
  }
  function fitLens() {
    if (!lensEl || !header) return;
    var hr = header.getBoundingClientRect();
    lensEl.style.left = hr.left + 'px';
    lensEl.style.top = hr.top + 'px';
    lensEl.style.width = hr.width + 'px';
    lensEl.style.height = hr.height + 'px';
    lensEl.style.borderRadius = getComputedStyle(header).borderTopLeftRadius;
  }
  function syncHeader() {
    if (!headerStage || !header) return;
    var hr = header.getBoundingClientRect();
    if (lensEl && (Math.abs(parseFloat(lensEl.style.top) - hr.top) > 0.5 || Math.abs(parseFloat(lensEl.style.width) - hr.width) > 0.5)) fitLens();
    headerStage.style.transform = 'translate3d(' + (-hr.left - window.scrollX) + 'px,' + (-hr.top - window.scrollY) + 'px,0)';
  }
  var rebuildTimer = null;
  function rebuildMirrors() {
    rebuildTimer = null;
    tagNetworks();
    mirrors.forEach(function (item) {
      if (!item.el.isConnected) return;
      if (item.kind === 'header') buildHeader(item); else buildButton(item);
    });
  }
  function scheduleMirrors(delay) {
    if (MODE !== 'mirror') return;
    if (rebuildTimer) clearTimeout(rebuildTimer);
    rebuildTimer = setTimeout(rebuildMirrors, delay || 250);
  }
  if (MODE === 'mirror') {
    var syncFrame = null;
    window.addEventListener('scroll', function () {
      if (syncFrame === null) syncFrame = requestAnimationFrame(function () { syncFrame = null; syncHeader(); });
    }, { passive: true });
    window.addEventListener('resize', function () { scheduleMirrors(300); }, { passive: true });
    window.addEventListener('load', function () { scheduleMirrors(50); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { scheduleMirrors(50); });
  }

  /* ---------- Stats: numbers count up once, the first time they are seen ---------- */
  function countUp(stat) {
    var num = stat.querySelector('.num');
    if (!num) return;
    var node = Array.prototype.find.call(num.childNodes, function (n) { return n.nodeType === 3 && /\d/.test(n.nodeValue); });
    if (!node) return;
    var target = parseInt(node.nodeValue.replace(/\D/g, ''), 10);
    if (!target || motion.matches || !('IntersectionObserver' in window)) return;
    var fmt = function (v) { return String(v); };
    node.nodeValue = fmt(0);
    var io = new IntersectionObserver(function (entries) {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      var start = null, dur = 1500 + Math.min(900, target / 20);
      (function step(ts) {
        if (start === null) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 4);
        node.nodeValue = fmt(Math.round(target * eased));
        if (p < 1) requestAnimationFrame(step); else stat.classList.add('lg-counted');
      })(performance.now());
    }, { threshold: 0.4 });
    io.observe(stat);
  }

  /* ---------- Panels respond to the pointer: tilt, light and a parallax lift ---------- */
  var active = null, frame = null, px = 0, py = 0;
  var PROPS = ['--tilt-x', '--tilt-y', '--glow-x', '--glow-y', '--angle-1', '--par-x', '--par-y', '--shadow-x'];
  function paint() {
    frame = null;
    if (!active || !active.isConnected) return;
    var b = active.getBoundingClientRect();
    var x = Math.max(0, Math.min(1, (px - b.left) / b.width));
    var y = Math.max(0, Math.min(1, (py - b.top) / b.height));
    var nx = x * 2 - 1, ny = y * 2 - 1;
    var max = active.classList.contains('stat') ? 7 : active.classList.contains('lg-photo') ? 7 : 4.5;   // degrees
    active.style.setProperty('--tilt-x', (-ny * max).toFixed(2) + 'deg');
    active.style.setProperty('--tilt-y', (nx * max).toFixed(2) + 'deg');
    active.style.setProperty('--glow-x', (x * 100).toFixed(1) + '%');
    active.style.setProperty('--glow-y', (y * 100).toFixed(1) + '%');
    active.style.setProperty('--angle-1', (-75 + nx * 55 + ny * 20).toFixed(1) + 'deg');
    active.style.setProperty('--par-x', (nx * 4).toFixed(2) + 'px');
    active.style.setProperty('--par-y', (ny * 4).toFixed(2) + 'px');
    active.style.setProperty('--shadow-x', (-nx * 10).toFixed(1) + 'px');
  }
  function release() {
    if (!active) return;
    var el = active; active = null;
    el.classList.remove('lg-hot');
    PROPS.forEach(function (p) { el.style.removeProperty(p); });
  }
  document.addEventListener('pointermove', function (e) {
    if (!finePointer.matches || motion.matches || e.pointerType === 'touch') return;
    var t = e.target instanceof Element ? e.target.closest('.lg-panel, .lg-photo') : null;
    if (t !== active) { release(); active = t; if (t) t.classList.add('lg-hot'); }
    if (!active) return;
    px = e.clientX; py = e.clientY;
    if (frame === null) frame = requestAnimationFrame(paint);
  }, { passive: true });
  document.addEventListener('pointerleave', release);
  window.addEventListener('blur', release);

  /* ---------- Start, and cover content added later (events, articles) ---------- */
  function start() {
    if (header) install(header, 'header');
    installAll(document);
    var main = document.querySelector('main');
    if (main && 'MutationObserver' in window) {
      new MutationObserver(function (records) {
        var changed = false;
        records.forEach(function (rec) {
          if (rec.type === 'characterData') { changed = true; return; }
          rec.addedNodes.forEach(function (n) {
            if (n.nodeType !== 1 || n.namespaceURI === SVGNS) return;
            if (/(^| )lg-/.test(n.className)) return;
            changed = true;
            if (n.tagName !== 'IMG') installAll(n);
          });
        });
        if (changed) scheduleMirrors(400);            // keep the header's copy of the page current
      }).observe(main, { childList: true, subtree: true, characterData: true });
    }
    if (MODE === 'mirror') rebuildMirrors();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
