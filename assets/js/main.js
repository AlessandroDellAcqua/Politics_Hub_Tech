// Politics Hub APS — accessible glass navigation and animated networks
(function () {
  var SVGNS = "http://www.w3.org/2000/svg";
  var motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- adaptive glass navigation ---------- */
  var header = document.querySelector('.site-header');
  function onScroll() {
    if (!header) return;
    if (window.scrollY > 60) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.site-nav');
  var mobile = window.matchMedia('(max-width: 1080px)');
  var subButtons = document.querySelectorAll('.sub-toggle');

  function setSubmenu(button, open) {
    button.setAttribute('aria-expanded', String(open));
    button.parentElement.classList.toggle('open', open);
  }
  function closeSubmenus() {
    subButtons.forEach(function (button) { setSubmenu(button, false); });
  }
  function setMenu(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    nav.inert = mobile.matches && !open;
    if (!open) closeSubmenus();
  }
  if (toggle && nav) {
    setMenu(false);
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    document.addEventListener('click', function (event) {
      if (!header.contains(event.target)) setMenu(false);
    });
    header.addEventListener('focusout', function (event) {
      if (!header.contains(event.relatedTarget)) setMenu(false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var openSub = nav.querySelector('.sub-toggle[aria-expanded="true"]');
      if (openSub) {
        setSubmenu(openSub, false);
        openSub.focus();
      } else if (nav.classList.contains('open')) {
        setMenu(false);
        toggle.focus();
      }
    });
    mobile.addEventListener('change', function () { setMenu(false); });
  }
  subButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      var open = button.getAttribute('aria-expanded') !== 'true';
      closeSubmenus();
      setSubmenu(button, open);
    });
    button.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        closeSubmenus();
        setSubmenu(button, true);
        button.parentElement.querySelector('.sub a').focus();
      }
    });
    button.parentElement.addEventListener('focusout', function (event) {
      if (!button.parentElement.contains(event.relatedTarget)) setSubmenu(button, false);
    });
  });

  /* ---------- anno nel footer ---------- */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ---------- rete animata ---------- */
  function el(name, attrs) {
    var e = document.createElementNS(SVGNS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function poly7(cx, cy, r) {
    var p = [];
    for (var i = 0; i < 7; i++) {
      var a = (-90 + i * (360 / 7)) * Math.PI / 180;
      p.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
    }
    return p.join(" ");
  }

  function buildNetwork(svg, opts) {
    var nodes = opts.nodes, links = opts.links, t = opts.theme, labeled = opts.labeled;
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var gLinks = el("g", {}), gNodes = el("g", {}), gLabels = el("g", {});
    svg.appendChild(gLinks); svg.appendChild(gNodes); svg.appendChild(gLabels);

    var lineEls = links.map(function (l) {
      var a = nodes[l[0]], b = nodes[l[1]];
      var ln = el("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: t.edge, "stroke-width": opts.edgeW || 1 });
      gLinks.appendChild(ln);
      return { ln: ln, a: a, b: b };
    });

    nodes.forEach(function (n) {
      n.phase = Math.random() * Math.PI * 2;
      n.amp = n.kind === "hub" ? 0 : (opts.amp || 6) * (0.5 + Math.random());
      n.spd = 0.35 + Math.random() * 0.4;
      n.cx = n.x; n.cy = n.y;
      if (n.kind === "hub") {
        n.halo = el("circle", { cx: n.x, cy: n.y, r: n.r * 2.1, fill: t.hub, opacity: 0.16 });
        gNodes.appendChild(n.halo);
        n.dot = el("circle", { cx: n.x, cy: n.y, r: n.r, fill: t.hub });
        gNodes.appendChild(n.dot);
        n.mark = el("polygon", { points: poly7(n.x, n.y, n.r * 0.62), fill: "#fff" });
        gNodes.appendChild(n.mark);
      } else if (n.kind === "idea") {
        n.dot = el("circle", { cx: n.x, cy: n.y, r: n.r, fill: "none", stroke: t.idea, "stroke-width": 2.2 });
        gNodes.appendChild(n.dot);
      } else if (n.kind === "event") {
        n.dot = el("circle", { cx: n.x, cy: n.y, r: n.r, fill: t.event });
        gNodes.appendChild(n.dot);
      } else {
        n.dot = el("circle", { cx: n.x, cy: n.y, r: n.r, fill: t.person, opacity: 0.9 });
        gNodes.appendChild(n.dot);
      }
      if (labeled && n.label) {
        var below = (n.kind === "event" || n.kind === "hub");
        var ly = below ? (n.y + n.r + 22) : (n.y - n.r - 12);
        var col = n.kind === "event" ? t.eventLabel : (n.kind === "hub" ? t.hubLabel : t.ideaLabel);
        var fs = n.kind === "hub" ? 21 : (n.kind === "event" ? 17 : 18);
        var ff = n.kind === "hub" ? "var(--serif)" : "var(--sans)";
        var tx = el("text", { x: n.x, y: ly, "text-anchor": "middle", "font-family": ff, "font-size": fs, fill: col });
        tx.textContent = n.label;
        gLabels.appendChild(tx);
        n.label_el = tx; n.label_below = below;
      }
    });

    var t0 = null, frameId = null, visible = false;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var tm = (ts - t0) / 1000;
      nodes.forEach(function (n) {
        if (n.kind === "hub") {
          if (n.halo) {
            var pr = n.r * (2.0 + 0.35 * Math.sin(tm * 1.4));
            n.halo.setAttribute("r", pr);
            n.halo.setAttribute("opacity", (0.20 - 0.12 * Math.abs(Math.sin(tm * 1.4))).toFixed(3));
          }
          return;
        }
        n.cx = n.x + Math.sin(tm * n.spd + n.phase) * n.amp;
        n.cy = n.y + Math.cos(tm * n.spd * 0.9 + n.phase) * n.amp;
        n.dot.setAttribute("cx", n.cx.toFixed(2));
        n.dot.setAttribute("cy", n.cy.toFixed(2));
        if (n.label_el) {
          n.label_el.setAttribute("x", n.cx.toFixed(2));
          n.label_el.setAttribute("y", (n.label_below ? (n.cy + n.r + 22) : (n.cy - n.r - 12)).toFixed(2));
        }
      });
      lineEls.forEach(function (o) {
        o.ln.setAttribute("x1", o.a.cx.toFixed(2)); o.ln.setAttribute("y1", o.a.cy.toFixed(2));
        o.ln.setAttribute("x2", o.b.cx.toFixed(2)); o.ln.setAttribute("y2", o.b.cy.toFixed(2));
      });
      frameId = requestAnimationFrame(frame);
    }
    function syncAnimation() {
      var active = visible && !document.hidden && !motion.matches;
      if (active && frameId === null) frameId = requestAnimationFrame(frame);
      else if (!active && frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
    }
    if ('IntersectionObserver' in window) {
      var observer = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        syncAnimation();
      });
      observer.observe(svg);
    } else {
      visible = true;
      syncAnimation();
    }
    document.addEventListener('visibilitychange', syncAnimation);
    motion.addEventListener('change', syncAnimation);
  }

  function scatter(w, h, count, maxd) {
    var ns = [], i;
    for (i = 0; i < count; i++) {
      ns.push({ x: 40 + Math.random() * (w - 80), y: 40 + Math.random() * (h - 80), r: 1.6 + Math.random() * 2.6, kind: "person" });
    }
    var ls = [];
    for (i = 0; i < ns.length; i++) {
      for (var j = i + 1; j < ns.length; j++) {
        var dx = ns[i].x - ns[j].x, dy = ns[i].y - ns[j].y;
        if (dx * dx + dy * dy < maxd * maxd) ls.push([i, j]);
      }
    }
    return { nodes: ns, links: ls };
  }

  var THEMES = {
    hero:  { edge: "rgba(150,195,230,0.20)", person: "rgba(180,215,240,0.75)", idea: "#5CA9DD", event: "#5CA9DD", hub: "#5CA9DD" },
    paper: { edge: "rgba(30,111,168,0.10)",  person: "rgba(30,111,168,0.28)",  idea: "#1E6FA8", event: "#1E6FA8", hub: "#1E6FA8" },
    dark:  { edge: "rgba(140,190,225,0.16)", person: "rgba(160,205,235,0.5)",  idea: "#5CA9DD", event: "#5CA9DD", hub: "#5CA9DD" }
  };

  // Texture: ogni sezione chiara riceve una rete sottile e chiara, così il vetro ha qualcosa da mostrare.
  THEMES.thin = { edge: "rgba(92,169,221,0.16)", person: "rgba(92,169,221,0.34)", idea: "#5CA9DD", event: "#5CA9DD", hub: "#5CA9DD" };
  document.querySelectorAll('main .section').forEach(function (section) {
    var own = Array.prototype.some.call(section.children, function (c) { return c.matches && c.matches('svg.net-bg'); });
    if (own) return;
    var svg = el('svg', { 'aria-hidden': 'true', 'data-net': 'thin', 'data-count': '20', 'data-amp': '6' });
    svg.setAttribute('class', 'net-bg net-thin');
    section.insertBefore(svg, section.firstChild);
  });

  // reti di sfondo: qualsiasi <svg data-net="hero|paper|dark|thin" data-count data-amp>
  document.querySelectorAll('svg[data-net]').forEach(function (svg) {
    var theme = THEMES[svg.getAttribute('data-net')] || THEMES.dark;
    var count = parseInt(svg.getAttribute('data-count') || '26', 10);
    var amp = parseFloat(svg.getAttribute('data-amp') || '7');
    if (!svg.getAttribute('viewBox')) svg.setAttribute('viewBox', '0 0 1200 700');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    var thin = svg.getAttribute('data-net') === 'thin';
    var s = scatter(1200, 700, count, thin ? 230 : 200);
    if (thin) s.nodes.forEach(function (n) { n.r = 1 + Math.random() * 1.4; });
    buildNetwork(svg, { nodes: s.nodes, links: s.links, labeled: false, amp: amp, edgeW: thin ? 0.55 : 0.8, theme: theme });
  });

  // rete leggera automatica negli hero delle pagine interne
  document.querySelectorAll('.page-hero').forEach(function (hero) {
    if (hero.querySelector('svg')) return;
    var svg = el('svg', { viewBox: '0 0 1200 420', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': 'true' });
    svg.setAttribute('class', 'net-auto');
    hero.insertBefore(svg, hero.firstChild);
    var s = scatter(1200, 420, 20, 190);
    buildNetwork(svg, { nodes: s.nodes, links: s.links, labeled: false, amp: 6, edgeW: 0.8, theme: THEMES.dark });
  });

  // rete principale con etichette (homepage): i dati arrivano da window.PH_MAIN_NET
  var mainSvg = document.getElementById('mainNet');
  if (mainSvg && window.PH_MAIN_NET) {
    buildNetwork(mainSvg, {
      nodes: window.PH_MAIN_NET.nodes,
      links: window.PH_MAIN_NET.links,
      labeled: true, amp: 7, edgeW: 1.4,
      theme: {
        edge: "#C4DBEE", person: "#5CA9DD", idea: "#1E6FA8", event: "#1E6FA8", hub: "#124E7C",
        ideaLabel: "#2f6a97", eventLabel: "#3d5670", hubLabel: "#0B2A45"
      }
    });
  }
})();
