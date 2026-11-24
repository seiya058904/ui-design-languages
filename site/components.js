/* Component wall (site chrome). One page: a masonry wall of live demos from every language.
   Filter by language (the wall gathers onto that language's own canvas) or by kind; open a card
   for its demos and code in a drawer. Rendering comes from site/wall.js (real markup, no images). */
(function () {
  var W = window.UIWall;
  /* Which demos each language puts on the wall: packs.json → site.wall. */
  var KIND = { button: "actions", input: "inputs", slider: "inputs", stepper: "inputs", dial: "inputs", calendar: "inputs",
    selection: "choices", segmented: "choices", tabs: "choices", chips: "choices", appearance: "choices", menu: "choices", filter: "choices", widget: "choices", mood: "choices",
    alert: "feedback", progress: "feedback", dialog: "feedback", tooltip: "feedback", timer: "feedback", scope: "feedback", garden: "feedback",
    card: "content", avatar: "content", table: "content", elevation: "content", material: "content", glass: "content", board: "content", accordion: "content",
    deck: "content", notes: "content", media: "content", ticket: "content",
    navigation: "navigation", command: "navigation", dock: "navigation", flow: "navigation" };
  var KINDS = [["all", "All"], ["actions", "Actions"], ["inputs", "Inputs"], ["choices", "Choices"], ["feedback", "Feedback"], ["content", "Content"], ["navigation", "Navigation"]];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var grid = $("[data-grid]"), stylesEl = $("[data-styles]"), catsEl = $("[data-cats]"), backdrops = $("[data-backdrops]"), note = $("[data-note]"), search = $("[data-search]");
  var cwSection = $(".cw");
  var state = { style: "all", kind: "all", theme: "light", query: "" };
  var cards = [];
  var lastColW = -1;
  var animTimer = 0;
  var goneTimer = 0;

  /* ---------- build ---------- */
  function interleave() {
    var lists = W.packs.map(function (p) { return p.wall.map(function (pk) { return [p.id].concat(pk); }); });
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      lists.forEach(function (l) { if (l[i]) { out.push(l[i]); more = true; } });
      i++;
    }
    return out;
  }
  var CODE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg>';
  function buildCard(packId, compId, demoId) {
    var hit = W.demo(packId, compId, demoId), p = W.byId[packId];
    if (!hit) return null;
    var kind = KIND[compId] || "content";
    var card = document.createElement("article");
    card.className = "wcard";
    card.setAttribute("data-pack", packId);
    card.setAttribute("data-kind", kind);
    card.style.setProperty("--glow", p.dot);
    var inner = document.createElement("div");
    inner.className = "wcard__in";
    var stage = W.stage(packId, compId, demoId);
    inner.appendChild(stage);
    var bar = document.createElement("div");
    bar.className = "wcard__bar";
    bar.innerHTML = '<button class="wcard__tag" type="button"><i></i><b></b><span></span></button><button class="wcard__code" type="button">' + CODE_ICON + "</button>";
    bar.querySelector("i").style.background = p.dot;
    bar.querySelector("b").setAttribute("style", p.font);
    bar.querySelector("b").textContent = p.name;
    bar.querySelector("span").textContent = hit.component.title;
    bar.querySelector(".wcard__code").setAttribute("aria-label", "Code for " + p.name + " " + hit.component.title);
    bar.querySelectorAll("button").forEach(function (b) { b.addEventListener("click", function () { openDrawer(packId, compId, demoId); }); });
    inner.appendChild(bar);
    card.appendChild(inner);

    /* Spotlight container: driven by one delegated pointermove on grid (zero per-card listeners). */
    var spot = document.createElement("span"), dot = document.createElement("i");
    spot.className = "wcard__spot"; spot.setAttribute("aria-hidden", "true");
    spot.appendChild(dot); stage.appendChild(spot);
    card.__spotStage = stage;
    card.__spotDot = dot;

    var words = [p.name, p.id, hit.component.title, compId, hit.demo.label, kind].join(" ").toLowerCase();
    return { el: card, pack: packId, comp: compId, demo: demoId, kind: kind, words: words, shown: true, x: 0, y: 0 };
  }

  /* Delegated hover spotlight across all 96 cards (caches active stage rect, 1 rAF per frame). */
  if (grid && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
    var spotCard = null, spotRect = null, spotEv = null, spotRaf = 0;
    var clearSpotRect = function () { spotRect = null; };
    window.addEventListener("scroll", clearSpotRect, { passive: true });
    window.addEventListener("resize", clearSpotRect, { passive: true });
    grid.addEventListener("pointermove", function (e) {
      var card = e.target.closest && e.target.closest(".wcard");
      if (!card || !card.__spotDot) return;
      if (card !== spotCard) { spotCard = card; spotRect = null; }
      spotEv = e;
      if (spotRaf) return;
      spotRaf = requestAnimationFrame(function () {
        spotRaf = 0;
        if (!spotCard || !spotEv) return;
        if (!spotRect) spotRect = spotCard.__spotStage.getBoundingClientRect();
        spotCard.__spotDot.style.transform = "translate3d(" + Math.round(spotEv.clientX - spotRect.left) + "px," + Math.round(spotEv.clientY - spotRect.top) + "px,0)";
      });
    }, { passive: true });
    grid.addEventListener("pointerleave", function () { spotCard = null; spotRect = null; });
  }

  function buildFilters() {
    var counts = {};
    cards.forEach(function (c) { counts[c.pack] = (counts[c.pack] || 0) + 1; });
    var items = [{ id: "all", name: "All", count: cards.length }].concat(W.packs.map(function (p) { return { id: p.id, name: p.name, font: p.font, dot: p.dot, count: counts[p.id] || 0 }; }));
    stylesEl.innerHTML = '<span class="cw-filter__glider" aria-hidden="true"></span>';
    items.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-style", it.id);
      b.setAttribute("aria-pressed", String(state.style === it.id));
      b.innerHTML = (it.dot ? '<i style="background:' + it.dot + '"></i>' : "") + '<b></b><small></small>';
      var name = b.querySelector("b");
      name.textContent = it.name;
      if (it.font) name.setAttribute("style", it.font);
      b.querySelector("small").textContent = it.count;
      b.addEventListener("click", function () { setStyle(it.id); });
      stylesEl.appendChild(b);
    });
    catsEl.innerHTML = "";
    KINDS.forEach(function (k) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-kind", k[0]);
      b.setAttribute("aria-pressed", String(state.kind === k[0]));
      b.textContent = k[1];
      b.addEventListener("click", function () { state.kind = k[0]; syncFilters(); apply(true); });
      catsEl.appendChild(b);
    });
    backdrops.innerHTML = "";
    W.packs.forEach(function (p) {
      var layer = document.createElement("div");
      var bd = p.backdrop || {};
      layer.className = "cw-backdrop" + (bd["class"] ? " " + bd["class"] : "");
      layer.setAttribute("data-pack", p.id);
      if (bd.style || !bd["class"]) layer.setAttribute("style", bd.style || p.page);
      backdrops.appendChild(layer);
    });
  }
  function glide(scrollIntoView) {
    var on = stylesEl.querySelector('[aria-pressed="true"]'), g = stylesEl.querySelector(".cw-filter__glider");
    if (!on || !g) return;
    g.style.width = on.offsetWidth + "px";
    g.style.transform = "translate3d(" + on.offsetLeft + "px,0,0)";
    if (scrollIntoView && on.scrollIntoView) on.scrollIntoView({ behavior: "smooth", inline: "nearest", block: "nearest" });
  }
  function syncFilters(scrollActive) {
    stylesEl.querySelectorAll("[data-style]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-style") === state.style)); });
    var tokens = state.query ? state.query.split(/\s+/) : null;
    catsEl.querySelectorAll("[data-kind]").forEach(function (b) {
      var k = b.getAttribute("data-kind"), n = 0;
      for (var i = 0; i < cards.length; i++) {
        var c = cards[i];
        if ((state.style === "all" || c.pack === state.style) && (k === "all" || c.kind === k) && matchesTokens(c, tokens)) n++;
      }
      b.setAttribute("aria-pressed", String(k === state.kind));
      b.disabled = n === 0 && k !== "all";
    });
    glide(scrollActive);
  }
  function setStyle(id) {
    state.style = id;
    /* Fix: only reset kind if a specific language has no cards of that kind ("all" always keeps kind). */
    if (id !== "all" && state.kind !== "all" && !cards.some(function (c) { return c.pack === id && c.kind === state.kind; })) state.kind = "all";
    syncFilters(true);
    var hash = id === "all" ? "" : "#" + id;
    if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
    apply(true);
  }

  /* ---------- masonry (strict batched read/write — 1 layout instead of 96 forced reflows) ---------- */
  function matchesTokens(c, tokens) {
    if (!tokens) return true;
    for (var i = 0; i < tokens.length; i++) if (c.words.indexOf(tokens[i]) < 0) return false;
    return true;
  }
  function layout() {
    var width = grid.clientWidth;
    if (!width) return;
    var cols = width >= 1060 ? 3 : width >= 660 ? 2 : 1, gap = width >= 660 ? 20 : 16;
    var colW = (width - gap * (cols - 1)) / cols;
    var heights = [];
    for (var i = 0; i < cols; i++) heights.push(0);

    var shown = [];
    for (var k = 0; k < cards.length; k++) if (cards[k].shown) shown.push(cards[k]);

    // Phase 1: Batch write widths only when colW changed
    if (colW !== lastColW) {
      var colWpx = colW + "px";
      for (var w = 0; w < cards.length; w++) cards[w].el.style.width = colWpx;
      lastColW = colW;
    }

    // Phase 2: Batch read all visible card heights (single layout pass)
    var cardHeights = new Array(shown.length);
    for (var r = 0; r < shown.length; r++) cardHeights[r] = shown[r].el.offsetHeight;

    // Phase 3: Compute positions and batch write transforms (zero interleaved reads)
    for (var p = 0; p < shown.length; p++) {
      var c = shown[p];
      var col = 0;
      for (var j = 1; j < cols; j++) if (heights[j] < heights[col]) col = j;
      c.x = col * (colW + gap);
      c.y = heights[col];
      heights[col] += cardHeights[p] + gap;
      c.el.style.transform = "translate3d(" + c.x + "px," + c.y + "px,0)";
    }
    var maxH = 0;
    for (var m = 0; m < cols; m++) if (heights[m] > maxH) maxH = heights[m];
    grid.style.height = Math.max(0, maxH - gap) + "px";
  }
  function apply(animate) {
    clearTimeout(animTimer);
    clearTimeout(goneTimer);
    if (animate) {
      grid.classList.add("is-animating");
      animTimer = setTimeout(function () { grid.classList.remove("is-animating"); }, 700);
    } else {
      grid.classList.remove("is-animating");
    }
    document.body.setAttribute("data-wall-style", state.style);
    backdrops.querySelectorAll(".cw-backdrop").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-pack") === state.style); });
    cwSection.classList.toggle("is-unified", state.style !== "all");
    cwSection.classList.toggle("is-light-only", !!W.byId[state.style] && !W.byId[state.style].dark);
    cwSection.classList.toggle("is-dark-canvas", !!W.byId[state.style] && W.byId[state.style].tone === "dark");

    var tokens = state.query ? state.query.split(/\s+/) : null;
    var n = 0;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var vis = (state.style === "all" || c.pack === state.style) && (state.kind === "all" || c.kind === state.kind) && matchesTokens(c, tokens);
      c.shown = vis;
      if (vis) {
        n++;
        c.el.classList.remove("is-gone", "is-out");
        c.el.setAttribute("aria-hidden", "false");
        c.el.inert = false;
      } else {
        c.el.classList.add("is-out");
        c.el.setAttribute("aria-hidden", "true");
        c.el.inert = true;
      }
    }
    layout();
    // Hide filtered-out cards from painting/compositing once their 280ms fade finishes.
    goneTimer = setTimeout(function () {
      for (var j = 0; j < cards.length; j++) if (!cards[j].shown) cards[j].el.classList.add("is-gone");
    }, animate ? 320 : 0);

    var p = W.byId[state.style];
    if (state.query && !n) note.textContent = "Nothing matches “" + state.query + "”" + (p ? " in " + p.name : "") + ". Try a component (slider, menu, dial) or a language name.";
    else if (state.query) note.textContent = n + (n === 1 ? " component matches" : " components match") + " “" + state.query + "”" + (p ? " in " + p.name : "") + ".";
    else note.textContent = p ? n + " " + p.name + " components, on " + p.name + "'s own canvas. Open any of them for its complete source." : n + " components from " + W.packs.length + " languages, all live. Open any card for its complete source.";
  }
  var raf = 0;
  function relayout() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; layout(); glide(false); }); }

  /* ---------- reveal & offscreen pause ---------- */
  function reveal() {
    if (!("IntersectionObserver" in window)) { cards.forEach(function (c) { c.el.classList.add("is-in"); }); return; }
    var queue = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var el = e.target;
        el.classList.toggle("is-offscreen", !e.isIntersecting);
        if (!e.isIntersecting || el.classList.contains("is-in")) return;
        var delay = (queue++ % 6) * 55;
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        setTimeout(function () { queue = Math.max(0, queue - 1); }, 500);
      });
    }, { rootMargin: "160px 0px 160px 0px" });
    cards.forEach(function (c) { io.observe(c.el); });
  }

  /* ---------- drawer ---------- */
  var drawer = $("[data-drawer]"), frame = null, lastFocus = null, current = null, closeTimer = 0;
  function copy(btn, text) {
    var label = btn.querySelector("span") || btn;
    if (!btn.__origCopyLabel) btn.__origCopyLabel = label.textContent;
    clearTimeout(btn.__copyTimer);
    function done(ok) {
      label.textContent = ok ? "Copied" : "Copy failed";
      btn.classList.toggle("is-copied", ok);
      btn.__copyTimer = setTimeout(function () { label.textContent = btn.__origCopyLabel; btn.classList.remove("is-copied"); }, 1500);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove(); done(ok);
    }
  }
  /* Source panel: HTML / CSS / JS / single file for the demo on show (site/source.js builds it). */
  var S = window.UISource, src = { data: null, tab: "html", key: "" };
  var srcTabs = $("[data-src-tabs]"), srcCode = $("[data-src-code]"), srcMeta = $("[data-src-meta]"), srcPre = $(".src__code");
  function renderSource() {
    var d = src.data;
    srcTabs.querySelectorAll("[data-src]").forEach(function (b) {
      var t = b.getAttribute("data-src"), on = t === src.tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      b.disabled = !!d && t === "js" && !d.js;
      b.title = b.disabled ? "This demo needs no JavaScript" : "";
    });
    if (!d) { srcCode.textContent = "Collecting the source…"; srcMeta.textContent = ""; return; }
    var i = d.info, t = src.tab;
    srcCode.innerHTML = S.highlight(d[t] || "", t);
    srcPre.scrollTop = 0; srcPre.scrollLeft = 0;
    srcMeta.textContent = t === "html" ? "The demo markup from " + i.htmlFrom + " · " + i.lines.html + " lines"
      : t === "css" ? i.tokenCount + " tokens, the base layer and the rules from " + i.cssFrom.join(", ") + " · " + i.lines.css + " lines · " + i.size.css
      : t === "js" ? i.jsFrom + ", the behaviour this markup relies on · " + i.lines.js + " lines · " + i.size.js
      : "Runs on its own: tokens, base, component CSS" + (d.js ? ", script" : "") + " and icons, all inlined · " + i.size.file;
  }
  function setSrcTab(t) {
    if (src.data && t === "js" && !src.data.js) return;
    src.tab = t;
    renderSource();
  }
  srcTabs.addEventListener("click", function (e) { var b = e.target.closest("[data-src]"); if (b && !b.disabled) setSrcTab(b.getAttribute("data-src")); });
  srcTabs.addEventListener("keydown", function (e) {
    var list = Array.prototype.filter.call(srcTabs.querySelectorAll("[data-src]"), function (b) { return !b.disabled; });
    if (!list.length) return;
    var i = list.indexOf(document.activeElement), n = i;
    if (e.key === "ArrowRight") n = (i + 1) % list.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + list.length) % list.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = list.length - 1;
    else return;
    e.preventDefault();
    list[n].focus();
    setSrcTab(list[n].getAttribute("data-src"));
  });
  function loadSource(packId, comp, dm) {
    var key = packId + "/" + comp.id + "/" + dm.id;
    src.key = key; src.data = null;
    if (src.tab === "js") src.tab = "html";
    renderSource();
    S.build(packId, comp.id, dm.id).then(function (d) {
      if (src.key !== key) return;
      src.data = d;
      if (src.tab === "js" && !d.js) src.tab = "html";
      renderSource();
    }, function () {
      if (src.key !== key) return;
      srcCode.textContent = "The source files could not be loaded. Open this page over http (GitHub Pages or a local server).";
    });
  }

  function showDemo(packId, comp, dm) {
    current = { pack: packId, comp: comp, demo: dm };
    $("[data-dr-tabs]").querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-demo") === dm.id)); });
    var view = $("[data-dr-view]");
    view.innerHTML = "";
    frame = document.createElement("iframe");
    frame.className = "drawer__frame";
    frame.title = W.byId[packId].name + " " + comp.title + ": " + dm.label;
    var qs = new URLSearchParams({ p: packId, c: comp.id, d: dm.id });
    if (state.theme === "dark" && W.byId[packId].dark) qs.set("theme", "dark");
    frame.src = "site/demo.html?" + qs.toString();
    view.appendChild(frame);
    loadSource(packId, comp, dm);
  }
  function openDrawer(packId, compId, demoId, fromHash) {
    var hit = W.demo(packId, compId, demoId);
    if (!hit) return;
    clearTimeout(closeTimer); // prevent a pending close timer from hiding a freshly reopened drawer
    var p = W.byId[packId], comp = hit.component;
    if (drawer.hidden) lastFocus = document.activeElement;
    $("[data-dr-tag]").innerHTML = '<i style="background:' + p.dot + '"></i><b style="' + p.font + '"></b>';
    $("[data-dr-tag] b").textContent = p.name;
    $("[data-dr-title]").textContent = comp.title;
    $("[data-dr-sub]").textContent = comp.summary;
    $("[data-dr-open]").href = p.id + "/components.html#" + comp.id;
    var tabs = $("[data-dr-tabs]");
    tabs.innerHTML = "";
    comp.demos.forEach(function (dm) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = dm.label;
      b.setAttribute("data-demo", dm.id);
      b.addEventListener("click", function () { showDemo(packId, comp, dm); });
      tabs.appendChild(b);
    });
    tabs.hidden = comp.demos.length < 2;
    showDemo(packId, comp, hit.demo);
    drawer.hidden = false;
    document.documentElement.classList.add("has-drawer");
    requestAnimationFrame(function () { drawer.classList.add("is-open"); });
    $(".drawer__close").focus({ preventScroll: true });
    if (!fromHash) history.replaceState(null, "", "#" + packId + "/" + compId);
  }
  function closeDrawer() {
    if (drawer.hidden) return;
    drawer.classList.remove("is-open");
    document.documentElement.classList.remove("has-drawer");
    clearTimeout(closeTimer);
    closeTimer = setTimeout(function () {
      drawer.hidden = true;
      $("[data-dr-view]").innerHTML = "";
      frame = null;
    }, 380);
    history.replaceState(null, "", state.style === "all" ? location.pathname + location.search : "#" + state.style);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  drawer.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  window.addEventListener("message", function (e) {
    if (!frame || e.source !== frame.contentWindow || !e.data || e.data.type !== "demo-size") return;
    frame.style.height = Math.max(160, e.data.h) + "px";
  });
  function withSource(fn) {
    if (!current) return;
    S.build(current.pack, current.comp.id, current.demo.id).then(fn, function () {});
  }
  $("[data-src-copy]").addEventListener("click", function () { var b = this; withSource(function (d) { copy(b, d[src.tab] || ""); }); });
  $("[data-dr-ai]").addEventListener("click", function () { var b = this; withSource(function (d) { copy(b, d.prompt); }); });
  $("[data-dr-file]").addEventListener("click", function () { var b = this; withSource(function (d) { copy(b, d.file); }); });
  $("[data-dr-dl]").addEventListener("click", function () {
    var b = this;
    withSource(function (d) {
      var url = URL.createObjectURL(new Blob([d.file], { type: "text/html" }));
      var a = document.createElement("a");
      a.href = url; a.download = d.info.fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      var label = b.querySelector("span");
      if (!b.__origDlLabel) b.__origDlLabel = label.textContent;
      clearTimeout(b.__dlTimer);
      label.textContent = "Saved " + d.info.fileName;
      b.__dlTimer = setTimeout(function () { label.textContent = b.__origDlLabel; }, 1800);
    });
  });

  /* ---------- theme ---------- */
  document.querySelectorAll("[data-wtheme]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.theme = b.getAttribute("data-wtheme");
      document.querySelectorAll("[data-wtheme]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      W.setTheme(state.theme);
      if (frame && frame.contentWindow && current && W.byId[current.pack].dark) frame.contentWindow.postMessage({ type: "demo-attrs", attrs: { theme: state.theme === "dark" ? "dark" : "" } }, "*");
      setTimeout(relayout, 60);
    });
  });

  /* ---------- hash: #clay filters, #clay/button opens a card ---------- */
  function fromHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    if (W.byId[parts[0]]) {
      if (state.style !== parts[0]) { state.style = parts[0]; syncFilters(true); apply(true); }
      if (parts[1]) {
        var pick = W.byId[parts[0]].wall.filter(function (pk) { return pk[0] === parts[1]; })[0];
        openDrawer(parts[0], parts[1], pick ? pick[1] : null, true);
      }
    }
  }

  /* ---------- search: type to narrow the wall; "/" focuses it, Esc clears ---------- */
  if (search) {
    var queued = 0;
    search.addEventListener("input", function () {
      if (queued) return;
      queued = requestAnimationFrame(function () {
        queued = 0;
        state.query = search.value.trim().toLowerCase();
        syncFilters(false);
        apply(true);
      });
    });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && search.value) { search.value = ""; state.query = ""; syncFilters(false); apply(true); e.stopPropagation(); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      var t = e.target;
      if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !drawer.hidden) return;
      e.preventDefault();
      search.focus();
      search.select();
    });
  }

  /* ---------- sticky bar gets a frosted background once it sticks (sentinel IO, zero scroll read) ---------- */
  var bar = $("[data-bar]");
  if (bar) {
    if ("IntersectionObserver" in window) {
      var barSent = document.createElement("div");
      barSent.setAttribute("aria-hidden", "true");
      barSent.style.cssText = "position:relative;height:1px;margin-bottom:-1px;pointer-events:none";
      bar.parentNode.insertBefore(barSent, bar);
      new IntersectionObserver(function (es) {
        bar.classList.toggle("is-stuck", !es[0].isIntersecting);
      }, { rootMargin: "-65px 0px 0px 0px" }).observe(barSent);
    } else {
      var stuck = function () { bar.classList.toggle("is-stuck", bar.getBoundingClientRect().top <= 65); };
      window.addEventListener("scroll", stuck, { passive: true });
      stuck();
    }
  }

  /* ---------- boot ---------- */
  W.ready().then(function () {
    var frag = document.createDocumentFragment();
    interleave().forEach(function (pk) {
      var c = buildCard(pk[0], pk[1], pk[2]);
      if (c) { cards.push(c); frag.appendChild(c.el); }
    });
    grid.appendChild(frag);
    var total = document.querySelector("[data-total]");
    if (total) total.textContent = cards.length;
    buildFilters();
    var start = location.hash.replace(/^#\/?/, "").split("/")[0];
    if (W.byId[start]) state.style = start;
    syncFilters(false);
    apply(false);
    reveal();
    W.scripts().then(function () { relayout(); fromHash(); });
    if (document.fonts) document.fonts.ready.then(relayout);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var t = entries[i].target;
          if (t === grid) { relayout(); return; }
          var card = t.parentElement;
          if (card && !card.classList.contains("is-out")) { relayout(); return; }
        }
      });
      ro.observe(grid);
      cards.forEach(function (c) { ro.observe(c.el.firstChild); });
    } else window.addEventListener("resize", relayout, { passive: true });
    window.addEventListener("hashchange", fromHash);
  }).catch(function () {
    note.textContent = "The component catalogs could not be loaded. Open this page over http (GitHub Pages or a local server), not file://.";
  });
})();
