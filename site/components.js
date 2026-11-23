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
  var state = { style: "all", kind: "all", theme: "light", query: "" };
  var cards = [];

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
    var card = document.createElement("article");
    card.className = "wcard";
    card.setAttribute("data-pack", packId);
    card.setAttribute("data-kind", KIND[compId] || "content");
    card.style.setProperty("--glow", p.dot);
    var inner = document.createElement("div");
    inner.className = "wcard__in";
    inner.appendChild(W.stage(packId, compId, demoId));
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
    /* Spotlight: one small element moved by transform, once per frame, so the pointer never
       restyles the demo itself. */
    var stage = inner.firstChild, spot = document.createElement("span"), dot = document.createElement("i");
    spot.className = "wcard__spot"; spot.setAttribute("aria-hidden", "true");
    spot.appendChild(dot); stage.appendChild(spot);
    var at = null, queued = false;
    card.addEventListener("pointermove", function (e) {
      at = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var r = stage.getBoundingClientRect();
        dot.style.transform = "translate3d(" + (at.clientX - r.left).toFixed(0) + "px," + (at.clientY - r.top).toFixed(0) + "px,0)";
      });
    });
    // what the search box matches: language, component, demo and kind
    var words = [p.name, p.id, hit.component.title, compId, hit.demo.label, KIND[compId] || "content"].join(" ").toLowerCase();
    return { el: card, pack: packId, comp: compId, demo: demoId, words: words };
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
  function glide() {
    var on = stylesEl.querySelector('[aria-pressed="true"]'), g = stylesEl.querySelector(".cw-filter__glider");
    if (!on || !g) return;
    g.style.width = on.offsetWidth + "px";
    g.style.transform = "translateX(" + on.offsetLeft + "px)";
  }
  function syncFilters() {
    stylesEl.querySelectorAll("[data-style]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-style") === state.style)); });
    catsEl.querySelectorAll("[data-kind]").forEach(function (b) {
      var k = b.getAttribute("data-kind");
      var n = cards.filter(function (c) { return (state.style === "all" || c.pack === state.style) && (k === "all" || c.el.getAttribute("data-kind") === k) && matches(c); }).length;
      b.setAttribute("aria-pressed", String(k === state.kind));
      b.disabled = n === 0 && k !== "all";
    });
    glide();
  }
  function setStyle(id) {
    state.style = id;
    if (state.kind !== "all" && !cards.some(function (c) { return c.pack === id && c.el.getAttribute("data-kind") === state.kind; })) state.kind = "all";
    syncFilters();
    var hash = id === "all" ? "" : "#" + id;
    if (location.hash !== hash) history.replaceState(null, "", hash || location.pathname + location.search);
    apply(true);
  }

  /* ---------- masonry ---------- */
  function matches(c) {
    if (!state.query) return true;
    return state.query.split(/s+/).every(function (w) { return c.words.indexOf(w) >= 0; });
  }
  function visible(c) { return (state.style === "all" || c.pack === state.style) && (state.kind === "all" || c.el.getAttribute("data-kind") === state.kind) && matches(c); }
  function layout() {
    var width = grid.clientWidth;
    var cols = width >= 1060 ? 3 : width >= 660 ? 2 : 1, gap = width >= 660 ? 20 : 16;
    var colW = (width - gap * (cols - 1)) / cols;
    var heights = [];
    for (var i = 0; i < cols; i++) heights.push(0);
    var shown = cards.filter(visible);
    shown.forEach(function (c) { c.el.style.width = colW + "px"; });
    shown.forEach(function (c) {
      var col = heights.indexOf(Math.min.apply(null, heights));
      c.x = col * (colW + gap);
      c.y = heights[col];
      c.el.style.transform = "translate(" + c.x + "px," + c.y + "px)";
      heights[col] += c.el.offsetHeight + gap;
    });
    cards.forEach(function (c) { if (!visible(c)) c.el.style.transform = "translate(" + (c.x || 0) + "px," + (c.y || 0) + "px)"; });
    grid.style.height = Math.max(0, Math.max.apply(null, heights) - gap) + "px";
  }
  function apply(animate) {
    grid.classList.toggle("is-animating", !!animate);
    document.body.setAttribute("data-wall-style", state.style);
    backdrops.querySelectorAll(".cw-backdrop").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-pack") === state.style); });
    $(".cw").classList.toggle("is-unified", state.style !== "all");
    $(".cw").classList.toggle("is-light-only", !!W.byId[state.style] && !W.byId[state.style].dark); // e.g. paper-only Sketch
    $(".cw").classList.toggle("is-dark-canvas", !!W.byId[state.style] && W.byId[state.style].tone === "dark"); // e.g. dark-first Obsidian
    cards.forEach(function (c) { c.el.classList.toggle("is-out", !visible(c)); c.el.setAttribute("aria-hidden", String(!visible(c))); c.el.inert = !visible(c); });
    layout();
    var n = cards.filter(visible).length;
    var p = W.byId[state.style];
    if (state.query && !n) note.textContent = "Nothing matches “" + state.query + "”" + (p ? " in " + p.name : "") + ". Try a component (slider, menu, dial) or a language name.";
    else if (state.query) note.textContent = n + (n === 1 ? " component matches" : " components match") + " “" + state.query + "”" + (p ? " in " + p.name : "") + ".";
    else note.textContent = p ? n + " " + p.name + " components, on " + p.name + "'s own canvas. Open any of them for its complete source." : n + " components from " + W.packs.length + " languages, all live. Open any card for its complete source.";
  }
  var raf = 0;
  function relayout() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; layout(); glide(); }); }

  /* ---------- reveal ---------- */
  function reveal() {
    if (!("IntersectionObserver" in window)) { cards.forEach(function (c) { c.el.classList.add("is-in"); }); return; }
    var queue = 0;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        io.unobserve(e.target);
        var delay = (queue++ % 6) * 70;
        setTimeout(function () { e.target.classList.add("is-in"); }, delay);
        setTimeout(function () { queue = Math.max(0, queue - 1); }, 600);
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    cards.forEach(function (c) { io.observe(c.el); });
  }

  /* ---------- drawer ---------- */
  var drawer = $("[data-drawer]"), frame = null, lastFocus = null, current = null;
  function copy(btn, text) {
    var label = btn.querySelector("span") || btn, original = label.textContent;
    function done(ok) { label.textContent = ok ? "Copied" : "Copy failed"; btn.classList.toggle("is-copied", ok); setTimeout(function () { label.textContent = original; btn.classList.remove("is-copied"); }, 1500); }
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
    var p = W.byId[packId], comp = hit.component;
    lastFocus = document.activeElement;
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
    setTimeout(function () { drawer.hidden = true; $("[data-dr-view]").innerHTML = ""; frame = null; }, 420);
    history.replaceState(null, "", state.style === "all" ? location.pathname + location.search : "#" + state.style);
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  drawer.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) closeDrawer(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  window.addEventListener("message", function (e) {
    if (!frame || e.source !== frame.contentWindow || !e.data || e.data.type !== "demo-size") return;
    frame.style.height = Math.max(160, e.data.h) + "px";
  });
  /* Copy / download act on whatever is built; a click before it's ready waits for it. */
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
      var label = b.querySelector("span"), was = label.textContent;
      label.textContent = "Saved " + d.info.fileName;
      setTimeout(function () { label.textContent = was; }, 1800);
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
      if (state.style !== parts[0]) { state.style = parts[0]; syncFilters(); apply(true); }
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
        syncFilters();
        apply(true);
      });
    });
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && search.value) { search.value = ""; state.query = ""; syncFilters(); apply(true); e.stopPropagation(); }
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

  /* ---------- sticky bar gets a frosted background once it sticks ---------- */
  var bar = $("[data-bar]");
  function stuck() { bar.classList.toggle("is-stuck", bar.getBoundingClientRect().top <= 65); }
  window.addEventListener("scroll", stuck, { passive: true });
  stuck();

  /* ---------- boot ---------- */
  W.ready().then(function () {
    interleave().forEach(function (pk) {
      var c = buildCard(pk[0], pk[1], pk[2]);
      if (c) { cards.push(c); grid.appendChild(c.el); }
    });
    var total = document.querySelector("[data-total]");
    if (total) total.textContent = cards.length;
    buildFilters();
    var start = location.hash.replace(/^#\/?/, "").split("/")[0];
    if (W.byId[start]) state.style = start;
    syncFilters();
    apply(false);
    reveal();
    W.scripts().then(function () { relayout(); fromHash(); });
    if (document.fonts) document.fonts.ready.then(relayout);
    if ("ResizeObserver" in window) {
      var ro = new ResizeObserver(relayout);
      ro.observe(grid);
      cards.forEach(function (c) { ro.observe(c.el.firstChild); });
    } else window.addEventListener("resize", relayout);
    window.addEventListener("hashchange", fromHash);
  }).catch(function () {
    note.textContent = "The component catalogs could not be loaded. Open this page over http (GitHub Pages or a local server), not file://.";
  });
})();
