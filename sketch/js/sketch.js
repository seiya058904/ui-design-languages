/* Sketch — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators for .sketch-tabs, .sketch-pills, .sketch-segmented (drawn box / hatched pill)
     and .sketch-nav (box with corner brackets)
   - tablists: click + ←/→/Home/End move aria-selected; nav: plain clicks move aria-current="page"
   - sliders: keep --fill-n on .sketch-range and the bubble / <output for> text in sync
   - steppers: − / + buttons inside .sketch-stepper change the <output> (data-min / data-max)
   - toggle chips (.sketch-chip[aria-pressed]) and single-choice swatch pickers ([data-pick-group])
   - dialogs: [data-sketch-open="#id"] / [data-sketch-close]
   - sticky notes: the pin (.sketch-sticky__pin[aria-pressed]) flips on click
   - flow (.sketch-flow): clicking a node makes it the current step; earlier ones are marked done
   - doodle pads (.sketch-doodle): draw with any pointer (the line thins as it speeds up), pick the pen
     from [data-sketch-pen], [data-sketch-doodle="clear"] wipes the paper; data-sample draws a starter
   Hooks: window.SketchUI.refresh(el), .initIndicators(root), .syncSlider(input) */
(function () {
  var P = "sketch";
  var GROUPS = [
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-pills", item: "." + P + "-pills__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = GROUPS.slice(0, 3).map(function (g) { return g.list; }).join(", ");
  var TAB_ITEM = GROUPS.slice(0, 3).map(function (g) { return g.item; }).join(", ");
  var NAV_ITEM = GROUPS[3].item;

  function groupOf(list) { for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i]; return null; }
  function items(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST) === list; }) : [];
  }
  /* Layout changes (resize, fonts) move an indicator instantly; only a new selection glides. */
  function snapTo(list) {
    var on = list.classList.contains("is-animated");
    if (on) list.classList.remove("is-animated");
    refresh(list);
    if (on) { void list.offsetWidth; list.classList.add("is-animated"); }
  }
  /* Turn indicator transitions on only once the page has settled (loaded, fonts ready), after a final
     measurement — so an indicator never glides in from a stale first-frame position on load. */
  function settle(fn) {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var loaded = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r, { once: true }); });
    Promise.all([fonts, loaded]).then(function () { requestAnimationFrame(function () { requestAnimationFrame(fn); }); });
  }
  function refresh(list) {
    var g = groupOf(list);
    if (!g) return;
    var active = items(list).filter(function (el) { return el.matches(g.active); })[0];
    var s = list.style;
    if (!active) { s.setProperty("--" + P + "-indicator-o", "0"); return; }
    s.setProperty("--" + P + "-indicator-o", "1");
    s.setProperty("--" + P + "-indicator-x", active.offsetLeft + "px");
    s.setProperty("--" + P + "-indicator-y", active.offsetTop + "px");
    s.setProperty("--" + P + "-indicator-w", active.offsetWidth + "px");
    s.setProperty("--" + P + "-indicator-h", active.offsetHeight + "px");
  }
  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST) ? [scope] : scope.querySelectorAll(LIST);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__sketchIndicator) return;
      list.__sketchIndicator = true;
      list.classList.add("has-indicator");
      refresh(list);
      settle(function () { refresh(list); list.classList.add("is-animated"); });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { snapTo(list); });
        ro.observe(list);
        items(list).forEach(function (el) { ro.observe(el); });
      }
      new MutationObserver(function () { refresh(list); }).observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
    });
  }
  function selectTab(tab) {
    var list = tab.closest(TAB_LIST);
    if (!list) return;
    items(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    refresh(list);
  }
  function selectNavItem(link) {
    var list = link.closest(GROUPS[3].list);
    if (!list) return;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var host = input.closest("." + P + "-range") || input;
    host.style.setProperty("--fill-n", String((v - min) / (max - min)));
    var outs = Array.prototype.slice.call(host.querySelectorAll ? host.querySelectorAll("output") : []);
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
    var ticks = host.querySelector && host.querySelector("." + P + "-range__ticks");
    if (ticks) Array.prototype.forEach.call(ticks.children, function (t) { t.classList.toggle("is-current", t.textContent.trim() === String(input.value)); });
  }

  /* ---------- Doodle pad ---------- */
  function penColor(name) {
    var cs = getComputedStyle(document.documentElement);
    var strong = cs.getPropertyValue("--" + P + "-color-" + name + "-strong").trim();
    return strong || cs.getPropertyValue("--" + P + "-color-" + (name || "ink")).trim() || "#2B2A27";
  }
  function padState(pad) {
    if (pad.__sketchDoodle) return pad.__sketchDoodle;
    var canvas = pad.querySelector("." + P + "-doodle__canvas");
    var st = pad.__sketchDoodle = { canvas: canvas, ctx: canvas.getContext("2d"), w: 0, h: 0, pen: "ink", last: null };
    var picked = pad.querySelector('[data-' + P + '-pen][aria-pressed="true"]');
    if (picked) st.pen = picked.getAttribute("data-" + P + "-pen");
    fitPad(pad);
    if ("ResizeObserver" in window) new ResizeObserver(function () { fitPad(pad); }).observe(canvas);
    return st;
  }
  /* Match the canvas to its box at device resolution; whatever was drawn is carried over. */
  function fitPad(pad) {
    var st = pad.__sketchDoodle, c = st.canvas, r = c.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (!w || !h || (w === c.width && h === c.height)) return;
    var keep = null;
    if (c.width && c.height) { keep = document.createElement("canvas"); keep.width = c.width; keep.height = c.height; keep.getContext("2d").drawImage(c, 0, 0); }
    c.width = w; c.height = h;
    st.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    st.ctx.lineCap = "round";
    st.ctx.lineJoin = "round";
    if (keep) st.ctx.drawImage(keep, 0, 0, keep.width / dpr, keep.height / dpr);
    st.w = r.width; st.h = r.height;
    // A starter doodle (data-sample) is drawn the first time the pad has a real size.
    if (pad.hasAttribute("data-sample") && !st.sampled) { st.sampled = true; drawSample(pad); }
  }
  function stroke(st, from, to, width) {
    var ctx = st.ctx;
    ctx.strokeStyle = penColor(st.pen);
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(from.mx, from.my);
    ctx.quadraticCurveTo(from.x, from.y, to.mx, to.my);
    ctx.stroke();
  }
  function point(e, canvas) {
    var r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, t: e.timeStamp || Date.now() };
  }
  function drawSample(pad) {
    var st = padState(pad), w = st.w, h = st.h;
    if (!w || !h) return;
    var ctx = st.ctx, i, j, a, n;
    function line(points, pen, wMax) {
      ctx.strokeStyle = penColor(pen);
      for (var k = 1; k < points.length; k++) {
        ctx.lineWidth = wMax - Math.abs(Math.sin(k / 7)) * 0.8;
        ctx.beginPath(); ctx.moveTo(points[k - 1][0], points[k - 1][1]); ctx.lineTo(points[k][0], points[k][1]); ctx.stroke();
      }
    }
    // a doodled daisy: five looped petals round a small centre, a stem and one leaf, then a wavy line
    var cx = w * 0.3, cy = h * 0.4, R = Math.min(w, h) * 0.2;
    for (n = 0; n < 5; n++) {
      var base = (n / 5) * Math.PI * 2 - Math.PI / 2, pts = [];
      for (i = 0; i <= 28; i++) {
        a = (i / 28) * Math.PI * 2;
        var px = Math.cos(a) * R * 0.5 + R * 0.62, py = Math.sin(a) * R * 0.27;
        var rx = px * Math.cos(base) - py * Math.sin(base), ry = px * Math.sin(base) + py * Math.cos(base);
        pts.push([cx + rx + Math.sin(i * 1.9 + n) * 0.6, cy + ry + Math.cos(i * 1.3 + n) * 0.6]);
      }
      line(pts, "ink", 2.2);
    }
    var ring = [];
    for (i = 0; i <= 24; i++) { a = (i / 24) * Math.PI * 2.1; ring.push([cx + Math.cos(a) * R * 0.2, cy + Math.sin(a) * R * 0.2]); }
    line(ring, "ink", 2.4);
    var stem = [];
    for (j = 0; j <= 20; j++) stem.push([cx + Math.sin(j / 6) * 4, cy + R * 1.1 + (j / 20) * (h * 0.92 - cy - R * 1.1)]);
    line(stem, "ink", 2);
    var leaf = [];
    for (i = 0; i <= 20; i++) { a = (i / 20) * Math.PI; leaf.push([cx + 2 + Math.sin(a) * 18 + i * 0.9, cy + R * 1.75 - Math.sin(a) * 9 - i * 0.6]); }
    line(leaf, "ink", 1.8);
    var wave = [];
    for (i = 0; i <= 60; i++) wave.push([w * 0.55 + (i / 60) * w * 0.37, h * 0.58 + Math.sin(i / 4.2) * 7 + Math.sin(i * 2.3) * 0.7]);
    line(wave, "brand", 2.4);
    pad.classList.add("has-ink");
  }
  document.addEventListener("pointerdown", function (e) {
    var paper = e.target.closest && e.target.closest("." + P + "-doodle__paper");
    if (!paper || (e.pointerType === "mouse" && e.button !== 0)) return;
    var pad = paper.closest("." + P + "-doodle"), st = padState(pad);
    var p = point(e, st.canvas);
    p.mx = p.x; p.my = p.y;
    st.last = p;
    st.width = 2.6;
    if (paper.setPointerCapture) paper.setPointerCapture(e.pointerId);
    st.ctx.fillStyle = penColor(st.pen);
    st.ctx.beginPath(); st.ctx.arc(p.x, p.y, 1.3, 0, Math.PI * 2); st.ctx.fill();
    pad.classList.add("has-ink");
    e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    var paper = e.target.closest && e.target.closest("." + P + "-doodle__paper");
    var pad = paper && paper.closest("." + P + "-doodle"), st = pad && pad.__sketchDoodle;
    if (!st || !st.last) return;
    var p = point(e, st.canvas), q = st.last;
    var dist = Math.hypot(p.x - q.x, p.y - q.y), dt = Math.max(1, p.t - q.t);
    if (dist < 1.2) return;
    // faster strokes come out thinner, like a felt-tip skimming the paper; eased so it never jumps
    var target = Math.max(1.1, Math.min(3.2, 3.4 - (dist / dt) * 1.1));
    st.width = st.width * 0.7 + target * 0.3;
    p.mx = (q.x + p.x) / 2; p.my = (q.y + p.y) / 2;
    stroke(st, q, p, st.width);
    st.last = p;
  });
  function lift(e) {
    document.querySelectorAll("." + P + "-doodle").forEach(function (pad) { if (pad.__sketchDoodle) pad.__sketchDoodle.last = null; });
  }
  document.addEventListener("pointerup", lift);
  document.addEventListener("pointercancel", lift);

  /* ---------- Flow ---------- */
  function setFlowStep(li) {
    var list = li.parentElement, items2 = Array.prototype.slice.call(list.children), at = items2.indexOf(li);
    items2.forEach(function (x, i) {
      x.classList.toggle("is-done", i < at);
      if (i === at) x.setAttribute("aria-current", "step"); else x.removeAttribute("aria-current");
    });
  }

  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });
  document.addEventListener("click", function (e) {
    var tab = e.target.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);
    var navItem = e.target.closest(NAV_ITEM);
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }
    var chip = e.target.closest("." + P + "-chip[aria-pressed], ." + P + "-sticky__pin[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    var node = e.target.closest("." + P + "-flow__node");
    if (node && node.parentElement && node.parentElement.closest("." + P + "-flow")) setFlowStep(node.parentElement);
    var pen = e.target.closest("[data-" + P + "-pen]");
    if (pen) { var pd = pen.closest("." + P + "-doodle"); if (pd) padState(pd).pen = pen.getAttribute("data-" + P + "-pen"); }
    var wipe = e.target.closest('[data-' + P + '-doodle="clear"]');
    if (wipe) {
      var pad = wipe.closest("." + P + "-doodle");
      if (pad) { var st = padState(pad); st.ctx.save(); st.ctx.setTransform(1, 0, 0, 1, 0, 0); st.ctx.clearRect(0, 0, st.canvas.width, st.canvas.height); st.ctx.restore(); pad.classList.remove("has-ink"); }
    }
    var pick = e.target.closest("[data-pick-group] [aria-pressed]");
    if (pick) pick.closest("[data-pick-group]").querySelectorAll("[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === pick)); });
    var step = e.target.closest("." + P + "-stepper button");
    if (step) {
      var box = step.closest("." + P + "-stepper"), out = box.querySelector("output");
      var dir = step === box.querySelector("button") ? -1 : 1;
      var min = box.hasAttribute("data-min") ? +box.getAttribute("data-min") : -Infinity;
      var max = box.hasAttribute("data-max") ? +box.getAttribute("data-max") : Infinity;
      out.textContent = String(Math.min(max, Math.max(min, (parseFloat(out.textContent) || 0) + dir)));
    }
    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal) dlg.showModal(); }
    var closer = e.target.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(); }
  });
  document.addEventListener("keydown", function (e) {
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(TAB_LIST)).filter(function (t) { return !t.disabled; });
    var i = all.indexOf(tab), stepK = keys[e.key];
    var next = stepK === "first" ? all[0] : stepK === "last" ? all[all.length - 1] : all[(i + stepK + all.length) % all.length];
    next.focus();
    selectTab(next);
    e.preventDefault();
  });

  function boot() {
    document.querySelectorAll("." + P + "-slider").forEach(syncSlider);
    // pads with a starter doodle draw it as soon as layout gives them a size (see fitPad)
    document.querySelectorAll("." + P + "-doodle[data-sample]").forEach(function (pad) { padState(pad); });
    initIndicators(document);
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initIndicators(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.SketchUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider };
})();
