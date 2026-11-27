/* Component wall (site chrome). One page: a masonry wall of live demos from every language.
   Filter by language (the wall gathers onto that language's own canvas) or by kind; open a card
   for its demos and code in a drawer. Rendering comes from site/wall.js (real markup, no images). */
(function () {
  var W = window.UIWall;
  /* Which demos each language puts on the wall: packs.json → site.wall. */
  var KIND = { compare: "patterns", button: "actions", input: "inputs", slider: "inputs", stepper: "inputs", dial: "inputs", calendar: "inputs",
    selection: "choices", segmented: "choices", tabs: "choices", chips: "choices", appearance: "choices", menu: "choices", filter: "choices", widget: "choices", mood: "choices",
    alert: "feedback", progress: "feedback", dialog: "feedback", tooltip: "feedback", timer: "feedback", scope: "feedback", garden: "feedback",
    card: "content", avatar: "content", table: "content", elevation: "content", material: "content", glass: "content", board: "content", accordion: "content",
    deck: "content", notes: "content", media: "content", ticket: "content",
    navigation: "navigation", command: "navigation", dock: "navigation", flow: "navigation" };
  var KINDS = [["all", "All"], ["patterns", "Patterns"], ["actions", "Actions"], ["inputs", "Inputs"], ["choices", "Choices"], ["feedback", "Feedback"], ["content", "Content"], ["navigation", "Navigation"]];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var grid = $("[data-grid]"), stylesEl = $("[data-styles]"), catsEl = $("[data-cats]"), backdrops = $("[data-backdrops]"), note = $("[data-note]"), search = $("[data-search]"), searchClear = $("[data-search-clear]"), emptyBox = $("[data-empty]"), emptyText = $("[data-empty-text]"), resetBtn = $("[data-reset]");
  var barCount = $("[data-bar-count]"), barReset = $("[data-bar-reset]"), backTop = $("[data-back-top]");
  var cwSection = $(".cw"), statusEl = $("[data-status]");
  var state = { style: "all", kind: "all", theme: "light", query: "" };
  var cards = [];
  var lastColW = -1;
  var goneTimer = 0, flyTimer = 0, holdTimer = 0, gridH = 0, applyGen = 0;
  var reduced = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : { matches: false };

  /* ---------- build ---------- */
  function interleave() {
    var lists = W.packs.map(function (p) { return p.wall.concat([["compare", "weekly-report"]]).map(function (pk) { return [p.id].concat(pk); }); });
    var out = [], i = 0, more = true;
    while (more) {
      more = false;
      lists.forEach(function (l) { if (l[i]) { out.push(l[i]); more = true; } });
      i++;
    }
    return out;
  }
  var CODE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 7-5 5 5 5M15 7l5 5-5 5"/></svg>';
  function createCardMeta(packId, compId, demoId) {
    var hit = W.demo(packId, compId, demoId), p = W.byId[packId];
    if (!hit) return null;
    var kind = KIND[compId] || "content";
    var words = [p.name, p.id, hit.component.title, compId, hit.demo.label, kind].join(" ").toLowerCase();
    return { el: null, pack: packId, comp: compId, demo: demoId, kind: kind, words: words, shown: true, vis: undefined, inDom: false, laid: false, x: 0, y: 0, h: 0 };
  }
  function ensureEl(c) {
    if (c.el) return c.el;
    var hit = W.demo(c.pack, c.comp, c.demo), p = W.byId[c.pack];
    var card = document.createElement("article");
    card.className = "wcard";
    card.setAttribute("data-pack", c.pack);
    card.setAttribute("data-kind", c.kind);
    card.style.setProperty("--glow", p.dot);
    if (lastColW > 0) card.style.width = lastColW + "px";
    var inner = document.createElement("div");
    inner.className = "wcard__in";
    var stage = W.stage(c.pack, c.comp, c.demo);
    inner.appendChild(stage);
    var href = "component.html?p=" + encodeURIComponent(c.pack) + "&c=" + encodeURIComponent(c.comp) + "&d=" + encodeURIComponent(c.demo);
    var bar = document.createElement("div");
    bar.className = "wcard__bar";
    bar.innerHTML = '<a class="wcard__tag" href="' + href + '" tabindex="-1"><i></i><b></b><span></span></a><a class="wcard__code" href="' + href + '">' + CODE_ICON + "<span>Code</span></a>";
    bar.querySelector("i").style.background = p.dot;
    bar.querySelector("b").setAttribute("style", p.font);
    bar.querySelector("b").textContent = p.name;
    bar.querySelector(".wcard__tag span").textContent = hit.component.title;
    bar.querySelector(".wcard__code").setAttribute("aria-label", "Open " + p.name + " " + hit.component.title + " page and code");
    inner.appendChild(bar);
    card.appendChild(inner);

    /* Spotlight container: driven by one delegated pointermove on grid (zero per-card listeners). */
    var spot = document.createElement("span"), dot = document.createElement("i");
    spot.className = "wcard__spot"; spot.setAttribute("aria-hidden", "true");
    spot.appendChild(dot); stage.appendChild(spot);
    card.__spotStage = stage;
    card.__spotDot = dot;

    if (!c.shown) {
      card.classList.add("is-out", "is-gone");
      card.setAttribute("aria-hidden", "true");
      card.inert = true;
    } else {
      card.setAttribute("aria-hidden", "false");
      card.inert = false;
    }
    c.el = card;
    return card;
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
  /* The language filter's glider. Reads layout, so it runs after the masonry writes (next frame), never
     between them: reading here first used to force a full layout of all 96 live cards. */
  var glideRaf = 0, glideScroll = false;
  function glideSoon(scrollIntoView) {
    glideScroll = glideScroll || !!scrollIntoView;
    if (glideRaf) return;
    glideRaf = requestAnimationFrame(function () { glideRaf = 0; var s = glideScroll; glideScroll = false; glide(s); });
  }
  function glide(scrollIntoView) {
    var on = stylesEl.querySelector('[aria-pressed="true"]'), g = stylesEl.querySelector(".cw-filter__glider");
    if (!on || !g) return;
    stylesEl.classList.toggle("is-scrollable", stylesEl.scrollWidth > stylesEl.clientWidth + 1); // the edge fade only while there is more to scroll
    g.style.width = on.offsetWidth + "px";
    g.style.transform = "translate3d(" + on.offsetLeft + "px,0,0)";
    if (scrollIntoView && on.scrollIntoView) on.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", inline: "nearest", block: "nearest" });
  }
  function syncFilters(scrollActive) {
    stylesEl.querySelectorAll("[data-style]").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-style") === state.style)); });
    var tokens = state.query ? state.query.split(/\s+/) : null;
    var per = {}, any = 0;
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      if ((state.style === "all" || c.pack === state.style) && matchesTokens(c, tokens)) { per[c.kind] = (per[c.kind] || 0) + 1; any++; }
    }
    catsEl.querySelectorAll("[data-kind]").forEach(function (b) {
      var k = b.getAttribute("data-kind");
      b.setAttribute("aria-pressed", String(k === state.kind));
      b.disabled = any > 0 && k !== "all" && !per[k]; // nothing matches the search at all: keep every chip usable
    });
    glideSoon(scrollActive);
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
  var colHeights = [], lastCols = 0, lastGap = 0, lastGridW = 0, lastBleed = -1;
  function columns() {
    var width = grid.clientWidth;
    if (!width) return null;
    var cols = width >= 1100 ? 3 : width >= 860 ? 2 : 1, gap = width >= 860 ? 20 : 16;
    /* The language canvas bleeds out around the grid by the page margin (never past it), so cards never move on filter. */
    var bleed = Math.max(12, Math.min(40, Math.round((document.documentElement.clientWidth - width) / 2 - 8)));
    if (bleed !== lastBleed) { lastBleed = bleed; cwSection.style.setProperty("--cw-bleed", bleed + "px"); }
    return { width: width, cols: cols, gap: gap, colW: (width - gap * (cols - 1)) / cols };
  }
  /* mode "flip": a card visible before AND after, with its old or new spot near the viewport, glides (moves under
     1.5 viewports); every other card is placed instantly. */
  function placeBatch(list, cols, gap, colW, mode) {
    if (!list.length) return;
    var cardHeights = new Array(list.length);
    // A card still held back (display:none) keeps the height it was last measured at: reading it would lay it out now.
    for (var r = 0; r < list.length; r++) cardHeights[r] = list[r].h && list[r].el.classList.contains("is-gone") ? list[r].h : list[r].el.offsetHeight;
    var gridTop = 0, vh = 0;
    if (mode === "flip") { gridTop = grid.getBoundingClientRect().top; vh = window.innerHeight; }
    var near = function (y, h) { return gridTop + y + h > -vh * 0.25 && gridTop + y < vh * 1.25; };
    for (var p = 0; p < list.length; p++) {
      var c = list[p];
      var col = 0;
      for (var j = 1; j < cols; j++) if (colHeights[j] < colHeights[col]) col = j;
      var nx = col * (colW + gap), ny = colHeights[col];
      colHeights[col] += cardHeights[p] + gap;
      if (nx !== c.x || ny !== c.y || !c.laid) {
        var fly = mode === "flip" && c.was && c.laid && Math.abs(ny - c.y) + Math.abs(nx - c.x) < vh * 1.5 && (near(c.y, cardHeights[p]) || near(ny, cardHeights[p]));
        c.el.classList.toggle("is-fly", fly);
        c.x = nx; c.y = ny;
        if (!c.laid) { c.laid = true; c.el.classList.add("is-laid"); }
        c.el.style.transform = "translate3d(" + nx + "px," + ny + "px,0)";
      }
      c.h = cardHeights[p];
    }
    var maxH = 0;
    for (var m = 0; m < cols; m++) if (colHeights[m] > maxH) maxH = colHeights[m];
    gridH = Math.max(0, maxH - gap);
    grid.style.height = gridH + "px";
  }
  function layout(appendOnly, mode) {
    var g = columns();
    if (!g) return;
    var cols = g.cols, gap = g.gap, colW = g.colW;
    lastGridW = g.width;

    // Fast path during batched boot: when column geometry hasn't changed, measure & place ONLY the new batch.
    if (appendOnly && appendOnly.length && colW === lastColW && cols === lastCols && gap === lastGap && colHeights.length === cols) {
      var addShown = [];
      for (var a = 0; a < appendOnly.length; a++) if (appendOnly[a].shown && appendOnly[a].inDom) addShown.push(appendOnly[a]);
      placeBatch(addShown, cols, gap, colW);
      return;
    }

    colHeights = [];
    for (var i = 0; i < cols; i++) colHeights.push(0);
    lastCols = cols; lastGap = gap;

    var shown = [];
    for (var k = 0; k < cards.length; k++) if (cards[k].shown && cards[k].inDom) shown.push(cards[k]);

    // Phase 1: Batch write widths only when colW changed
    if (colW !== lastColW) {
      var colWpx = colW + "px";
      for (var w = 0; w < cards.length; w++) if (cards[w].el) { cards[w].el.style.width = colWpx; if (!cards[w].shown) cards[w].h = 0; }
      lastColW = colW;
    }

    // Phase 2 & 3: Batch read visible card heights and place them
    placeBatch(shown, cols, gap, colW, mode);
    if (!shown.length) { gridH = 0; grid.style.height = "0px"; }
  }
  function apply(animate) {
    clearTimeout(goneTimer);
    clearTimeout(holdTimer);
    clearTimeout(flyTimer);
    document.body.setAttribute("data-wall-style", state.style);
    backdrops.querySelectorAll(".cw-backdrop").forEach(function (b) { b.classList.toggle("is-on", b.getAttribute("data-pack") === state.style); });
    cwSection.classList.toggle("is-unified", state.style !== "all");
    cwSection.classList.toggle("is-light-only", !!W.byId[state.style] && !W.byId[state.style].dark);
    cwSection.classList.toggle("is-dark-canvas", !!W.byId[state.style] && W.byId[state.style].tone === "dark");

    var tokens = state.query ? state.query.split(/\s+/) : null;
    var n = 0, toShow = [], toHide = [];
    for (var i = 0; i < cards.length; i++) {
      var c = cards[i];
      var vis = (state.style === "all" || c.pack === state.style) && (state.kind === "all" || c.kind === state.kind) && matchesTokens(c, tokens);
      c.shown = vis;
      c.was = c.vis === true;
      if (vis) n++;
      if (c.vis === vis) continue; // only touch the cards whose state changes
      var first = c.vis === undefined;
      c.vis = vis;
      if (!c.el) continue; // detached cards apply their visibility when lazily mounted in ensureEl()
      if (vis) toShow.push(c); else if (!first) toHide.push(c);
    }
    /* Few cards change: the staying ones glide, new ones fade in, leaving ones fade out. Many change (a language,
       a broad search): everything lands at once under a short cross-fade instead of 100 cards in flight. */
    var mode = !animate || reduced.matches ? "none" : toShow.length + toHide.length > 24 ? "fade" : "flip";
    /* A big batch of newly shown, already measured cards: the first dozen appear now, the rest a few per frame, so
       the switch never lays out ~90 live stages in one go (their spots are already known from the cached heights). */
    var later = [], gen = ++applyGen;
    toShow.forEach(function (c, k) {
      var el = c.el;
      if (mode !== "flip" && k >= 12 && c.h && el.classList.contains("is-gone")) { later.push(c); if (el.inert) { el.setAttribute("aria-hidden", "false"); el.inert = false; } return; }
      el.classList.remove("is-gone", "is-out");
      el.classList.add("is-in");
      if (el.inert) { el.setAttribute("aria-hidden", "false"); el.inert = false; }
      if (mode === "flip") { el.style.setProperty("--i", Math.min(k, 8)); el.classList.add("is-fresh"); }
    });
    toHide.forEach(function (c) {
      c.el.classList.add("is-out");
      c.el.setAttribute("aria-hidden", "true");
      c.el.inert = true;
    });
    var oldH = gridH;
    layout(null, mode);
    if (later.length) (function drip() {
      requestAnimationFrame(function () {
        if (gen !== applyGen) return;
        later.splice(0, 10).forEach(function (c) { if (c.shown) c.el.classList.remove("is-gone", "is-out"), c.el.classList.add("is-in"); });
        if (later.length) drip();
      });
    })();
    if (mode === "flip") {
      if (oldH > gridH) { grid.style.height = oldH + "px"; holdTimer = setTimeout(function () { grid.style.height = gridH + "px"; }, 240); }
      flyTimer = setTimeout(function () {
        grid.querySelectorAll(".is-fly, .is-fresh").forEach(function (el) { el.classList.remove("is-fly", "is-fresh"); });
      }, 700);
    } else if (mode === "fade" && grid.animate) {
      grid.animate([{ opacity: 0.25 }, { opacity: 1 }], { duration: 140, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
    }
    // Filtered-out cards leave painting/layout once their 140ms fade finishes (at once when nothing animates).
    var gone = function () { for (var j = 0; j < cards.length; j++) if (!cards[j].shown && cards[j].el) cards[j].el.classList.add("is-gone"); };
    if (mode === "flip") goneTimer = setTimeout(gone, 170); else gone();

    var p = W.byId[state.style];
    grid.classList.toggle("is-empty", n === 0);
    if (emptyBox) {
      emptyBox.hidden = n > 0;
      if (n === 0 && emptyText) {
        emptyText.textContent = state.query
          ? "Nothing matches “" + state.query + "”" + (p ? " in " + p.name : "") + ". Try a component (slider, menu, dial) or a language name."
          : "No components match the current filter.";
      }
    }
    if (n === 0) note.textContent = "";
    else if (state.query) note.textContent = n + (n === 1 ? " component matches" : " components match") + " “" + state.query + "”" + (p ? " in " + p.name : "") + ".";
    else {
      var langs = {};
      cards.forEach(function (x) { if (x.shown) langs[x.pack] = true; });
      var L = Object.keys(langs).length, one = n === 1;
      note.textContent = p
        ? n + " " + p.name + (one ? " component" : " components") + ", on " + p.name + "'s own canvas. Open " + (one ? "it" : "any of them") + " for its complete source."
        : n + (one ? " component" : " components") + " from " + L + (L === 1 ? " language" : " languages") + ", all live. Open " + (one ? "it" : "any card") + " for its complete source.";
    }
    if (barCount) {
      var filtered = state.style !== "all" || state.kind !== "all" || !!state.query;
      barCount.textContent = filtered ? n + " / " + cards.length : n + " live";
    }
    if (barReset) barReset.hidden = state.style === "all" && state.kind === "all" && !state.query;
    /* One always-present live region announces the result (or the empty state), not the 96 live cards. */
    if (statusEl) {
      var msg = n === 0 && emptyText ? emptyText.textContent : note.textContent;
      if (statusEl.textContent !== msg) statusEl.textContent = msg;
    }
  }
  var raf = 0;
  function relayout() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; layout(); glideSoon(false); }); }

  /* ---------- reveal & offscreen pause (cards are observed as they enter the page) ---------- */
  function reveal() {
    if (!("IntersectionObserver" in window)) return null;
    var queue = 0, pend = new Map(), idle = 0;
    var ioIn = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        ioIn.unobserve(el);
        if (el.classList.contains("is-in")) return;
        var delay = (queue++ % 4) * 30;
        setTimeout(function () { el.classList.add("is-in"); }, delay);
        setTimeout(function () { queue = Math.max(0, queue - 1); }, 500);
      });
    }, { rootMargin: "240px 0px 240px 0px" });
    /* Pausing off-screen cards restyles every descendant, so it waits for idle time; resuming is immediate. */
    var flush = function () { idle = 0; pend.forEach(function (_, el) { el.classList.add("is-offscreen"); }); pend.clear(); };
    var ioPause = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { pend.delete(e.target); e.target.classList.remove("is-offscreen"); }
        else pend.set(e.target, true);
      });
      if (pend.size && !idle) idle = window.requestIdleCallback ? requestIdleCallback(flush, { timeout: 500 }) : setTimeout(flush, 200);
    }, { rootMargin: "600px 0px 600px 0px" });
    return { observe: function (el) { ioIn.observe(el); ioPause.observe(el); } };
  }

  /* ---------- theme ---------- */
  document.querySelectorAll("[data-wtheme]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.theme = b.getAttribute("data-wtheme");
      document.querySelectorAll("[data-wtheme]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      W.setTheme(state.theme);
      setTimeout(relayout, 60);
    });
  });

  /* ---------- hash ----------
     #clay                    filters the wall to one language
     #clay/button[/demo]      redirects to dedicated component.html page
     #all/clay/button[/demo]  redirects to dedicated component.html page */
  function openComponentPage(packId, compId, demoId) {
    var pick = demoId ? null : W.byId[packId].wall.filter(function (pk) { return pk[0] === compId; })[0];
    var d = demoId || (pick ? pick[1] : "");
    // The wall page is mid view-transition when this runs: end it so the redirect doesn't abort an animation half-way.
    if (window.__uiVT) { try { window.__uiVT.skipTransition(); } catch (e) {} }
    location.replace("component.html?p=" + encodeURIComponent(packId) + "&c=" + encodeURIComponent(compId) + (d ? "&d=" + encodeURIComponent(d) : ""));
  }
  function fromHash() {
    var parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
    if (!parts.length) return;
    if (parts[0] === "all" && W.byId[parts[1]] && parts[2]) {
      openComponentPage(parts[1], parts[2], parts[3]);
      return;
    }
    if (W.byId[parts[0]]) {
      if (parts[1]) {
        openComponentPage(parts[0], parts[1], parts[2]);
      } else if (state.style !== parts[0]) {
        state.style = parts[0]; syncFilters(true); apply(true);
      }
    }
  }

  /* ---------- search: type to narrow the wall; "/" or ⌘K focuses it, Esc clears ---------- */
  function syncSearchUi() {
    if (!search) return;
    var has = !!search.value;
    if (search.parentElement) search.parentElement.classList.toggle("has-value", has);
    if (searchClear) searchClear.hidden = !has;
  }
  var searchTimer = 0;
  function runSearch() {
    clearTimeout(searchTimer);
    state.query = search.value.trim().toLowerCase();
    syncFilters(false);
    apply(true);
  }
  if (search) {
    // The input itself is instant; the wall re-filters once typing pauses.
    search.addEventListener("input", function () {
      syncSearchUi();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(runSearch, 120);
    });
    if (searchClear) {
      searchClear.addEventListener("click", function () {
        search.value = "";
        syncSearchUi();
        runSearch();
        search.focus();
      });
    }
    search.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && search.value) { search.value = ""; syncSearchUi(); runSearch(); e.stopPropagation(); }
    });
    document.addEventListener("keydown", function (e) {
      var t = e.target;
      var isCmdK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      var isSlash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (!isCmdK && !isSlash) return;
      e.preventDefault();
      search.focus();
      search.select();
    });
  }
  function resetAll() {
    clearTimeout(searchTimer);
    state.style = "all"; state.kind = "all"; state.query = "";
    if (search) { search.value = ""; syncSearchUi(); }
    if (location.hash) history.replaceState(null, "", location.pathname + location.search);
    syncFilters(true);
    apply(true);
    if (search) search.focus({ preventScroll: true }); // the Reset button just hid itself: keep focus somewhere real
  }
  if (resetBtn) resetBtn.addEventListener("click", resetAll);
  if (barReset) barReset.addEventListener("click", resetAll);

  var cwHero = $(".cw-hero"), heroTitle = $(".cw-hero h1");
  if (backTop && cwHero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { backTop.classList.toggle("is-shown", !es[0].isIntersecting); }).observe(cwHero);
    backTop.addEventListener("click", function () {
      if (window.UIScroll) UIScroll.to(0);
      else window.scrollTo({ top: 0, behavior: reduced.matches ? "auto" : "smooth" });
      // The button is about to hide: land focus on the page title once the scroll settles.
      var land = function () { if (heroTitle) heroTitle.focus({ preventScroll: true }); };
      if (reduced.matches || !("onscrollend" in window)) setTimeout(land, reduced.matches ? 0 : 800);
      else window.addEventListener("scrollend", land, { once: true });
    });
  }

  /* ---------- sticky bar gets a frosted background once it sticks (sentinel IO, zero scroll read) ---------- */
  var bar = $("[data-bar]");
  /* The bar sticks under the header, whose height is --top-h (64px, or two rows on phones). */
  var topH = function () { return parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-h")) || 64; };
  if (bar) {
    if ("IntersectionObserver" in window) {
      var barSent = document.createElement("div"), barIo = null;
      barSent.setAttribute("aria-hidden", "true");
      barSent.style.cssText = "position:relative;height:1px;margin-bottom:-1px;pointer-events:none";
      bar.parentNode.insertBefore(barSent, bar);
      var watchBar = function () {
        if (barIo) barIo.disconnect();
        barIo = new IntersectionObserver(function (es) {
          bar.classList.toggle("is-stuck", !es[0].isIntersecting);
        }, { rootMargin: "-" + (topH() + 1) + "px 0px 0px 0px" });
        barIo.observe(barSent);
      };
      watchBar();
      var phone = window.matchMedia && window.matchMedia("(max-width: 760px)");
      if (phone && phone.addEventListener) phone.addEventListener("change", watchBar);
    } else {
      var stuck = function () { bar.classList.toggle("is-stuck", bar.getBoundingClientRect().top <= topH() + 1); };
      window.addEventListener("scroll", stuck, { passive: true });
      stuck();
    }
  }

  /* Phones: the bar tucks away while reading down and returns on any upward scroll or when something in it has focus. */
  if (bar && window.matchMedia) {
    var small = window.matchMedia("(max-width: 760px)"), lastY = window.scrollY, tuckTicking = false;
    var untuck = function () { bar.classList.remove("is-tucked"); };
    window.addEventListener("scroll", function () {
      if (tuckTicking) return;
      tuckTicking = true;
      requestAnimationFrame(function () {
        tuckTicking = false;
        var y = window.scrollY, dy = y - lastY;
        if (!small.matches || y < 120) { untuck(); lastY = y; return; }
        if (dy > 6) { bar.classList.add("is-tucked"); lastY = y; }
        else if (dy < -6) { untuck(); lastY = y; }
      });
    }, { passive: true });
    bar.addEventListener("focusin", untuck);
  }

  /* ---------- boot ---------- */
  /* Every card's metadata is built at once (cheap), so counts, filters, search and deep links know the whole
     wall from the start. Live DOM subtrees are created and laid out lazily a small batch per frame
     (append-only masonry measures only the newly inserted batch), so 96 live components never block the page
     in one long task. The packs' scripts load once every card is in. */
  var BATCH = 3, BOX = 10, wallDone = null; // cards per frame (at most), and the ms a frame may spend building them
  var wallReady = new Promise(function (resolve) { wallDone = resolve; });
  if (window.UISite) UISite.ready = function () { return wallReady; }; // checks wait for the whole wall
  W.ready().then(function () {
    interleave().forEach(function (pk) {
      var c = createCardMeta(pk[0], pk[1], pk[2]);
      if (c) cards.push(c);
    });
    var total = document.querySelector("[data-total]");
    if (total) total.textContent = cards.length;
    buildFilters();
    var start = location.hash.replace(/^#\/?/, "").split("/");
    if (W.byId[start[0]] && !start[1]) state.style = start[0]; // only a bare #clay filters; deep links keep the whole wall
    syncFilters(false);

    var io = reveal(), ro = null, byEl = new WeakMap();
    if ("ResizeObserver" in window) {
      /* Also the measuring pass for freshly mounted cards: sizes arrive here, in the render step, where layout is
         already clean — reading them inside the boot task would force a full layout per batch. */
      ro = new ResizeObserver(function (entries) {
        var fresh = [], again = false;
        for (var i = 0; i < entries.length; i++) {
          var t = entries[i].target;
          if (t === grid) { if (Math.round(entries[i].contentRect.width) !== lastGridW) again = true; continue; }
          var cardObj = byEl.get(t);
          if (!cardObj) continue;
          if (!cardObj.laid) { if (cardObj.shown && cardObj.inDom) fresh.push(cardObj); continue; }
          var nh = entries[i].borderBoxSize && entries[i].borderBoxSize[0] ? Math.round(entries[i].borderBoxSize[0].blockSize) : Math.round(entries[i].contentRect.height);
          if (cardObj.shown && nh && nh !== cardObj.h) again = true;
        }
        if (again) relayout();
        else if (fresh.length) layout(fresh);
      });
      ro.observe(grid);
    } else window.addEventListener("resize", relayout, { passive: true });

    apply(false); // decides which cards are on show and initializes column geometry
    var pending = cards.filter(function (c) { return c.shown; }).concat(cards.filter(function (c) { return !c.shown; }));
    function insert() {
      var frag = document.createDocumentFragment(), batch = [], t0 = performance.now();
      while (pending.length && batch.length < BATCH && (!batch.length || performance.now() - t0 < BOX)) {
        var c = pending.shift(), el = ensureEl(c);
        if (!io) el.classList.add("is-in");
        c.inDom = true;
        frag.appendChild(el);
        batch.push(c);
      }
      grid.appendChild(frag);
      if (ro) batch.forEach(function (c) { byEl.set(c.el.firstChild, c); ro.observe(c.el.firstChild); }); else layout(batch);
      if (io) batch.forEach(function (c) { io.observe(c.el); });
    }
    insert();
    glideSoon(false);
    fromHash(); // a deep-linked card opens now: its drawer doesn't wait for the rest of the wall
    (function more() {
      if (!pending.length) {
        W.scripts().then(function () { layout(); glideSoon(false); requestAnimationFrame(function () { grid.classList.add("is-settled"); wallDone(); }); });
        if (!ro && document.fonts) document.fonts.ready.then(relayout);
        return;
      }
      requestAnimationFrame(function () { insert(); more(); });
    })();
    window.addEventListener("hashchange", fromHash);
  }).catch(function () {
    wallDone();
    note.textContent = "The component catalogs could not be loaded. Open this page over http (GitHub Pages or a local server), not file://.";
    if (statusEl) statusEl.textContent = note.textContent;
  });
})();
