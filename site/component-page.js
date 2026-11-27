/* Dedicated component page controller (site chrome).
   Renders any pack/component/demo at ?p=<pack>&c=<comp>[&d=<demo>] with:
   - Persistent searchable directory sidebar + SPA-style navigation
   - Cross-language switcher for shared components (including "compare" / Weekly report)
   - Live stage with demo tabs, pack accent/tone variants, Light/Dark, Full/768px/375px viewport, Replay
   - Immediately visible syntax-highlighted source tabs (HTML/CSS/JS/Single file) + AI prompt + download */
(function () {
  var W = window.UIWall, S = window.UISource;
  var KIND = {
    compare: "patterns",
    button: "actions", input: "inputs", slider: "inputs", stepper: "inputs", dial: "inputs", calendar: "inputs",
    selection: "choices", segmented: "choices", tabs: "choices", chips: "choices", appearance: "choices", menu: "choices", filter: "choices", widget: "choices", mood: "choices",
    alert: "feedback", progress: "feedback", dialog: "feedback", tooltip: "feedback", timer: "feedback", scope: "feedback", garden: "feedback",
    card: "content", avatar: "content", table: "content", elevation: "content", material: "content", glass: "content", board: "content", accordion: "content",
    deck: "content", notes: "content", media: "content", ticket: "content",
    navigation: "navigation", command: "navigation", dock: "navigation", flow: "navigation"
  };
  var KINDS = [["patterns", "Patterns"], ["actions", "Actions"], ["inputs", "Inputs"], ["choices", "Choices"], ["feedback", "Feedback"], ["content", "Content"], ["navigation", "Navigation"]];
  var SWATCH_COLORS = { violet: "#7C55FF", cobalt: "#2F7BF5", cyan: "#38BDF8", green: "#10B981", emerald: "#10B981", orange: "#FF4F00", sand: "#EEE6D9", stone: "#D5D7DC" };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var side = $("[data-cp-side]"), scrim = $("[data-cp-scrim]"), menuBtn = $("[data-cp-menu]");
  var searchEl = $("[data-cp-search]"), clearEl = $("[data-cp-search-clear]");
  var langsEl = $("[data-cp-langs]"), navEl = $("[data-cp-nav]");
  var viewEl = $("[data-cp-view]"), wrapEl = $("[data-cp-wrap]"), srcBox = $(".cp-source");
  var srcTabs = $("[data-src-tabs]"), srcCode = $("[data-src-code]"), srcMeta = $("[data-src-meta]"), srcPre = $(".src__code");

  var allItems = [];
  var filteredItems = [];
  var dirState = { lang: "all", query: "" };
  var state = { pack: "clay", comp: "button", demo: "", theme: "light", vp: "full", attrs: {} };
  var src = { data: null, tab: "html", key: "" };
  var frame = null, early = null, readyResolve = null;
  var pageReady = new Promise(function (r) { readyResolve = r; });
  if (window.UISite) UISite.ready = function () { return pageReady; };

  /* ---------- Sidebar mobile toggle (a modal drawer ≤960) ---------- */
  var mq = window.matchMedia ? window.matchMedia("(max-width: 960px)") : { matches: false };
  var INERT = ".top, .cp-mobile-bar, .cp-main, .foot";
  function reduced() { return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function setSidebarOpen(open, restoreFocus) {
    if (!side) return;
    open = !!open && mq.matches;
    var was = side.classList.contains("is-open");
    side.classList.toggle("is-open", open);
    if (scrim) scrim.classList.toggle("is-open", open);
    if (menuBtn) menuBtn.setAttribute("aria-expanded", String(open));
    document.documentElement.classList.toggle("has-drawer", open);
    if (open) { side.setAttribute("role", "dialog"); side.setAttribute("aria-modal", "true"); side.setAttribute("aria-label", "Component directory"); }
    else { side.removeAttribute("role"); side.removeAttribute("aria-modal"); }
    $$(INERT).forEach(function (n) { n.inert = open; });
    if (open && !was && searchEl) searchEl.focus({ preventScroll: true });
    if (!open && was && restoreFocus && menuBtn) menuBtn.focus({ preventScroll: true });
  }
  if (menuBtn) menuBtn.addEventListener("click", function () { setSidebarOpen(!side.classList.contains("is-open")); });
  if (scrim) scrim.addEventListener("click", function () { setSidebarOpen(false, true); });
  if ($("[data-cp-side-close]")) $("[data-cp-side-close]").addEventListener("click", function () { setSidebarOpen(false, true); });
  if (mq.addEventListener) mq.addEventListener("change", function () { setSidebarOpen(false); });

  /* After an in-page navigation: bring the title into view when it is above the fold; optionally move focus to it. */
  function settleView(focusTitle) {
    var h = $("[data-cp-title]");
    var top = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-h")) || 64;
    if (h.getBoundingClientRect().top < top) {
      if (window.UIScroll && !reduced()) UIScroll.to(0); else window.scrollTo(0, 0);
    }
    if (focusTitle) h.focus({ preventScroll: true });
  }

  /* ---------- Directory index ---------- */
  function buildIndex() {
    allItems = [];
    W.packs.forEach(function (p) {
      var pk = W.data[p.id];
      if (!pk) return;
      pk.order.forEach(function (cid) {
        var comp = pk.items[cid];
        if (!comp || !comp.demos.length) return;
        var kind = KIND[cid] || "content";
        allItems.push({
          pack: p.id, packName: p.name, dot: p.dot,
          comp: cid, title: comp.title, kind: kind,
          demo: comp.demos[0].id,
          words: [p.name, p.id, comp.title, cid, kind].join(" ").toLowerCase()
        });
      });
    });
  }

  function buildLangFilter() {
    if (!langsEl) return;
    langsEl.innerHTML = "";
    var list = [{ id: "all", name: "All" }].concat(W.packs.map(function (p) { return { id: p.id, name: p.name, dot: p.dot }; }));
    list.forEach(function (it) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("data-lang", it.id);
      b.setAttribute("aria-pressed", String(dirState.lang === it.id));
      b.innerHTML = (it.dot ? '<i style="background:' + it.dot + '"></i>' : "") + "<span></span>";
      b.querySelector("span").textContent = it.name;
      b.addEventListener("click", function () {
        dirState.lang = it.id;
        $$("button", langsEl).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        renderNav();
      });
      langsEl.appendChild(b);
    });
  }

  function renderNav() {
    if (!navEl) return;
    var tokens = dirState.query ? dirState.query.split(/\s+/).filter(Boolean) : null;
    filteredItems = allItems.filter(function (it) {
      if (dirState.lang !== "all" && it.pack !== dirState.lang) return false;
      if (tokens) {
        for (var i = 0; i < tokens.length; i++) if (it.words.indexOf(tokens[i]) < 0) return false;
      }
      return true;
    });

    navEl.innerHTML = "";
    if (!filteredItems.length) {
      var empty = document.createElement("p");
      empty.className = "cp-nav__empty";
      empty.textContent = "No matching components.";
      navEl.appendChild(empty);
      updatePager();
      return;
    }

    KINDS.forEach(function (k) {
      var group = filteredItems.filter(function (it) { return it.kind === k[0]; });
      if (!group.length) return;
      var wrap = document.createElement("div");
      wrap.className = "cp-nav__group";
      var h = document.createElement("div");
      h.className = "cp-nav__cat";
      h.textContent = k[1];
      wrap.appendChild(h);
      var ul = document.createElement("div");
      ul.className = "cp-nav__list";
      group.forEach(function (it) {
        var a = document.createElement("a");
        a.className = "cp-nav__item";
        a.href = "?p=" + encodeURIComponent(it.pack) + "&c=" + encodeURIComponent(it.comp);
        a.setAttribute("data-nav-pack", it.pack);
        a.setAttribute("data-nav-comp", it.comp);
        a.style.setProperty("--c", it.dot);
        var active = it.pack === state.pack && it.comp === state.comp;
        if (active) a.setAttribute("aria-current", "page");
        a.innerHTML = '<span class="cp-nav__name"><i style="background:' + it.dot + '"></i><b></b></span><span class="cp-nav__pack"></span>';
        a.querySelector("b").textContent = it.title;
        a.querySelector("b").style.fontWeight = "inherit";
        a.querySelector(".cp-nav__pack").textContent = dirState.lang === "all" ? it.packName : "";
        a.addEventListener("click", function (e) {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
          e.preventDefault();
          var wasOpen = side.classList.contains("is-open");
          setSidebarOpen(false);
          selectComponent(it.pack, it.comp, null, "push");
          settleView(wasOpen);
        });
        ul.appendChild(a);
      });
      wrap.appendChild(ul);
      navEl.appendChild(wrap);
    });
    updatePager();
  }

  function scrollActiveIntoView() {
    if (!navEl) return;
    var active = navEl.querySelector('.cp-nav__item[aria-current="page"]');
    if (!active) return;
    var top = active.offsetTop - navEl.offsetTop;
    var bottom = top + active.offsetHeight;
    if (top < navEl.scrollTop || bottom > navEl.scrollTop + navEl.clientHeight) {
      navEl.scrollTop = Math.max(0, top - Math.round((navEl.clientHeight - active.offsetHeight) / 2));
    }
  }

  function syncNavCurrent() {
    if (!navEl) return;
    $$(".cp-nav__item", navEl).forEach(function (a) {
      var on = a.getAttribute("data-nav-pack") === state.pack && a.getAttribute("data-nav-comp") === state.comp;
      if (on) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
    scrollActiveIntoView();
  }

  function updatePager() {
    var pager = $(".cp-pager"), prevEl = $("[data-cp-prev]"), nextEl = $("[data-cp-next]");
    if (!prevEl || !nextEl) return;
    function at(l) { for (var i = 0; i < l.length; i++) if (l[i].pack === state.pack && l[i].comp === state.comp) return i; return -1; }
    // The neighbours come from the filtered list; when the current component is filtered out, from everything.
    var list = filteredItems.length > 1 && at(filteredItems) >= 0 ? filteredItems : allItems;
    if (pager) pager.hidden = list.length <= 1;
    if (list.length <= 1) return;
    var idx = Math.max(0, at(list));
    function wire(el, titleSel, it) {
      el.href = "?p=" + encodeURIComponent(it.pack) + "&c=" + encodeURIComponent(it.comp);
      $(titleSel).textContent = it.packName + " · " + it.title;
      el.onclick = function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        selectComponent(it.pack, it.comp, null, "push");
        settleView(true);
      };
    }
    wire(prevEl, "[data-cp-prev-title]", list[(idx - 1 + list.length) % list.length]);
    wire(nextEl, "[data-cp-next-title]", list[(idx + 1) % list.length]);
  }

  /* ---------- Source code viewer ---------- */
  function renderSource() {
    var d = src.data;
    srcTabs.querySelectorAll("[data-src]").forEach(function (b) {
      var t = b.getAttribute("data-src"), on = t === src.tab;
      b.setAttribute("aria-selected", String(on));
      b.tabIndex = on ? 0 : -1;
      b.disabled = !!d && t === "js" && !d.js;
      if (t === "js") b.textContent = b.disabled ? "No JS" : "JS";
    });
    srcPre.setAttribute("aria-labelledby", "cp-tab-" + src.tab);
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
    src.key = key;
    // Keep the old code on screen, dimmed, until the new one arrives (no blank flash between demos).
    if (src.data) srcBox.classList.add("is-stale"); else renderSource();
    return S.build(packId, comp.id, dm.id).then(function (d) {
      if (src.key !== key) return d;
      srcBox.classList.remove("is-stale");
      if (src.data === d) return d;
      src.data = d;
      if (src.tab === "js" && !d.js) src.tab = "html";
      renderSource();
      return d;
    }, function () {
      if (src.key !== key) return;
      srcBox.classList.remove("is-stale");
      srcCode.textContent = "The source files could not be loaded. Open this page over http (GitHub Pages or a local server).";
    });
  }

  /* ---------- Preview stage ---------- */
  function syncStageTools(p) {
    var darkBtn = $('[data-cp-wtheme="dark"]'), lightBtn = $('[data-cp-wtheme="light"]');
    if (lightBtn && darkBtn) {
      lightBtn.disabled = p.tone === "dark";
      lightBtn.title = p.tone === "dark" ? p.name + " is dark-only" : "";
      darkBtn.disabled = !p.dark;
      darkBtn.title = !p.dark ? p.name + " is light-only" : "";
      lightBtn.setAttribute("aria-pressed", String(state.theme !== "dark"));
      darkBtn.setAttribute("aria-pressed", String(state.theme === "dark"));
    }
    $$("[data-cp-vp] button").forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.getAttribute("data-vp") === state.vp));
    });
    [wrapEl, viewEl].forEach(function (n) {
      if (!n) return;
      n.classList.toggle("is-tablet", state.vp === "tablet");
      n.classList.toggle("is-mobile", state.vp === "mobile");
    });
  }

  function renderVariants(p) {
    var box = $("[data-cp-variants]");
    if (!box) return;
    box.innerHTML = "";
    var attr = p.variants && p.variants.accent ? "accent" : p.variants && p.variants.tone ? "tone" : "";
    var list = attr ? p.variants[attr] : [];
    if (!list || list.length < 2) { box.hidden = true; return; }
    box.hidden = false;
    var defVal = list[0];
    list.forEach(function (val) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "cp-variant";
      b.style.background = SWATCH_COLORS[val] || p.dot;
      b.setAttribute("aria-label", attr + ": " + val);
      b.title = val.charAt(0).toUpperCase() + val.slice(1);
      var cur = state.attrs[attr] || defVal;
      b.setAttribute("aria-pressed", String(cur === val));
      b.addEventListener("click", function () {
        state.attrs[attr] = val === defVal ? "" : val;
        $$("button", box).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        if (frame && frame.contentWindow) {
          var payload = {};
          payload[attr] = state.attrs[attr];
          frame.contentWindow.postMessage({ type: "demo-attrs", attrs: payload }, "*");
        }
        syncIsolatedUrl();
      });
      box.appendChild(b);
    });
  }

  function syncIsolatedUrl() {
    var iso = $("[data-cp-isolated]");
    if (!iso) return;
    var qs = new URLSearchParams({ p: state.pack, c: state.comp, d: state.demo });
    if (state.theme === "dark" && W.byId[state.pack] && W.byId[state.pack].dark) qs.set("theme", "dark");
    Object.keys(state.attrs).forEach(function (k) { if (state.attrs[k]) qs.set(k, state.attrs[k]); });
    iso.href = "site/demo.html?" + qs.toString();
  }

  /* One iframe per mount. A new one is laid over the old and revealed on its first size report (so it is never
     blank), then the old ones go; the wrapper's pixel height is the only thing that animates. */
  function mountFrame(srcUrl, title) {
    $$(".cp-frame:not(.is-ready)", wrapEl).forEach(function (f) { f.remove(); });
    var f = document.createElement("iframe"), shown = false, resolveDone;
    var done = new Promise(function (r) { resolveDone = r; });
    f.className = "cp-frame";
    f.title = title;
    f.reveal = function () {
      if (shown || !f.isConnected) return;
      shown = true; clearTimeout(timer);
      f.classList.add("is-ready");
      setTimeout(function () { while (f.previousElementSibling) f.previousElementSibling.remove(); }, 220);
      resolveDone();
    };
    var timer = setTimeout(f.reveal, 3500);
    f.src = srcUrl;
    wrapEl.appendChild(f);
    frame = f;
    return { frame: f, done: done, src: srcUrl };
  }

  function showDemo(packId, comp, dm, historyMode) {
    state.demo = dm.id;
    $$("[data-cp-demos] button").forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-demo") === dm.id)); });
    var qs = new URLSearchParams({ p: packId, c: comp.id, d: dm.id });
    if (state.theme === "dark" && W.byId[packId].dark) qs.set("theme", "dark");
    Object.keys(state.attrs).forEach(function (k) { if (state.attrs[k]) qs.set(k, state.attrs[k]); });
    var srcUrl = "site/demo.html?" + qs.toString(), title = W.byId[packId].name + " " + comp.title + ": " + dm.label;
    // The frame started straight from the URL before the directory arrived is reused when it matches.
    var m = early && early.frame.isConnected && early.src === srcUrl ? early : mountFrame(srcUrl, title);
    early = null;
    frame = m.frame; frame.title = title;
    syncIsolatedUrl();

    var url = "?p=" + encodeURIComponent(packId) + "&c=" + encodeURIComponent(comp.id) + "&d=" + encodeURIComponent(dm.id);
    if (historyMode === "push" && location.search !== url) history.pushState({ p: packId, c: comp.id, d: dm.id }, "", url);
    else if (historyMode === "replace") history.replaceState({ p: packId, c: comp.id, d: dm.id }, "", url);

    return Promise.all([m.done, loadSource(packId, comp, dm)]);
  }

  function renderSiblings(compId) {
    var wrap = $("[data-cp-siblings-wrap]"), box = $("[data-cp-siblings]");
    if (!wrap || !box) return;
    box.innerHTML = "";
    var peers = W.packs.filter(function (p) { return W.data[p.id] && W.data[p.id].items[compId]; });
    wrap.hidden = peers.length < 2;
    peers.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "cp-sib";
      a.href = "?p=" + encodeURIComponent(p.id) + "&c=" + encodeURIComponent(compId);
      if (p.id === state.pack) a.setAttribute("aria-current", "page");
      a.innerHTML = '<i style="background:' + p.dot + '"></i><span></span>';
      a.querySelector("span").textContent = p.name;
      a.addEventListener("click", function (e) {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
        e.preventDefault();
        selectComponent(p.id, compId, null, "push");
        settleView(false);
        var cur = $('[data-cp-siblings] [aria-current="page"]');
        if (cur) cur.focus({ preventScroll: true });
      });
      box.appendChild(a);
    });
  }

  function selectComponent(packId, compId, demoId, historyMode) {
    // An unknown pack / component / demo falls back step by step instead of dumping you on the default.
    var hit = W.demo(packId, compId, demoId), fell = false;
    if (!hit) {
      fell = true;
      hit = W.demo(packId, compId, null);
      var pk = W.data[packId];
      if (!hit && pk) for (var i = 0; i < pk.order.length && !hit; i++) hit = W.demo(packId, pk.order[i], null);
      if (!hit) { packId = W.packs[0].id; hit = W.demo(packId, "button", null); }
    }
    compId = hit.component.id;
    var p = W.byId[packId], comp = hit.component, packChanged = state.pack !== packId;
    state.pack = packId;
    state.comp = comp.id;
    if (packChanged) {
      state.attrs = {};
      state.theme = p.tone === "dark" ? "dark" : "light";
    }
    document.title = p.name + " · " + comp.title + " · UI Design Languages";
    $("[data-cp-pack-link]").textContent = p.name;
    $("[data-cp-pack-link]").href = "components.html#" + p.id;
    $("[data-cp-crumb]").textContent = comp.title;
    $("[data-cp-mobile-crumb]").textContent = p.name + " · " + comp.title;
    $("[data-cp-tag]").innerHTML = '<i style="background:' + p.dot + '"></i><b style="' + p.font + '"></b>';
    $("[data-cp-tag] b").textContent = p.name;
    $("[data-cp-title]").textContent = comp.title;
    $("[data-cp-sub]").textContent = comp.summary;
    $("[data-cp-catalog]").href = comp.id === "compare" ? "components.html#" + p.id : p.id + "/components.html#" + comp.id;

    var demosBox = $("[data-cp-demos]");
    demosBox.innerHTML = "";
    comp.demos.forEach(function (dm) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = dm.label;
      b.setAttribute("data-demo", dm.id);
      b.addEventListener("click", function () { showDemo(packId, comp, dm, "replace"); });
      demosBox.appendChild(b);
    });
    demosBox.hidden = comp.demos.length < 2;

    renderVariants(p);
    syncStageTools(p);
    renderSiblings(comp.id);
    syncNavCurrent();
    updatePager();
    var statusEl = $("[data-cp-status]");
    if (statusEl) statusEl.textContent = fell ? "Showing " + p.name + " · " + comp.title : p.name + " " + comp.title;

    return showDemo(packId, comp, hit.demo, historyMode);
  }

  /* ---------- Stage & Action Events ---------- */
  $$("[data-cp-wtheme]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.disabled) return;
      state.theme = b.getAttribute("data-cp-wtheme");
      var p = W.byId[state.pack];
      syncStageTools(p);
      syncIsolatedUrl();
      if (frame && frame.contentWindow && p && p.dark) {
        frame.contentWindow.postMessage({ type: "demo-attrs", attrs: { theme: state.theme === "dark" ? "dark" : "" } }, "*");
      }
    });
  });
  $$("[data-cp-vp] button").forEach(function (b) {
    b.addEventListener("click", function () {
      state.vp = b.getAttribute("data-vp");
      syncStageTools(W.byId[state.pack]);
    });
  });
  if ($("[data-cp-replay]")) {
    $("[data-cp-replay]").addEventListener("click", function () {
      var hit = W.demo(state.pack, state.comp, state.demo);
      if (hit) showDemo(state.pack, hit.component, hit.demo, "none");
    });
  }

  function withSource(fn) { S.build(state.pack, state.comp, state.demo).then(fn, function () {}); }
  $("[data-src-copy]").addEventListener("click", function () { var b = this; withSource(function (d) { UISite.feedback(b, UISite.copy(d[src.tab] || "")); }); });
  $("[data-cp-ai]").addEventListener("click", function () { var b = this; withSource(function (d) { UISite.feedback(b, UISite.copy(d.prompt)); }); });
  $("[data-cp-file]").addEventListener("click", function () { var b = this; withSource(function (d) { UISite.feedback(b, UISite.copy(d.file)); }); });
  $("[data-cp-share]").addEventListener("click", function () { UISite.feedback(this, UISite.copy(location.href), "Copied"); });
  $("[data-cp-dl]").addEventListener("click", function () {
    var b = this;
    withSource(function (d) {
      var url = URL.createObjectURL(new Blob([d.file], { type: "text/html" }));
      var a = document.createElement("a");
      a.href = url; a.download = d.info.fileName;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      b.title = d.info.fileName;
      UISite.feedback(b, true, "Saved");
    });
  });

  window.addEventListener("message", function (e) {
    if (!frame || e.source !== frame.contentWindow || !e.data || e.data.type !== "demo-size") return;
    // The wrapper's min-height holds the floor; its height transition glides between demos.
    wrapEl.style.height = Math.max(0, e.data.h) + "px";
    frame.reveal();
  });

  /* ---------- Directory Search & Shortcuts ---------- */
  function syncSearchUi() {
    if (!searchEl) return;
    var has = !!searchEl.value;
    if (searchEl.parentElement) searchEl.parentElement.classList.toggle("has-value", has);
    if (clearEl) clearEl.hidden = !has;
  }
  if (searchEl) {
    searchEl.addEventListener("input", function () {
      syncSearchUi();
      dirState.query = searchEl.value.trim().toLowerCase();
      renderNav();
    });
    if (clearEl) {
      clearEl.addEventListener("click", function () {
        searchEl.value = "";
        dirState.query = "";
        syncSearchUi();
        renderNav();
        searchEl.focus();
      });
    }
    searchEl.addEventListener("keydown", function (e) {
      var first = $(".cp-nav__item", navEl);
      if (first && e.key === "ArrowDown") { e.preventDefault(); first.focus(); return; }
      if (first && e.key === "Enter") { e.preventDefault(); first.click(); return; }
      if (e.key === "Escape" && searchEl.value) {
        searchEl.value = "";
        dirState.query = "";
        syncSearchUi();
        renderNav();
        e.stopPropagation();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && side && side.classList.contains("is-open")) { setSidebarOpen(false, true); return; }
      var t = e.target;
      var isCmdK = (e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K");
      var isSlash = e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));
      if (!isCmdK && !isSlash) return;
      e.preventDefault();
      if (window.matchMedia && window.matchMedia("(max-width: 960px)").matches) setSidebarOpen(true);
      searchEl.focus();
      searchEl.select();
    });
  }

  if (navEl) navEl.addEventListener("keydown", function (e) {
    var a = e.target.closest && e.target.closest(".cp-nav__item");
    if (!a || (e.key !== "ArrowDown" && e.key !== "ArrowUp")) return;
    e.preventDefault();
    var items = $$(".cp-nav__item", navEl), n = items.indexOf(a) + (e.key === "ArrowDown" ? 1 : -1);
    if (n < 0) searchEl.focus(); else if (n < items.length) items[n].focus();
  });

  /* ---------- Boot & History ---------- */
  function parseQuery() {
    var q = new URLSearchParams(location.search);
    return { p: q.get("p") || "clay", c: q.get("c") || "button", d: q.get("d") || "" };
  }
  // Start the preview iframe straight from the URL; the directory data only reconciles it afterwards.
  (function () {
    var q = parseQuery(), id = /^[a-z0-9_-]+$/i;
    if (/^[a-z]+$/.test(q.p) && id.test(q.c) && id.test(q.d)) {
      var u = "site/demo.html?" + new URLSearchParams({ p: q.p, c: q.c, d: q.d }).toString();
      early = mountFrame(u, "Component preview");
    }
  })();
  W.ready().then(function () {
    buildIndex();
    buildLangFilter();
    var init = parseQuery();
    state.pack = "";
    renderNav();
    return selectComponent(init.p, init.c, init.d, "replace");
  }).then(function () {
    document.body.classList.remove("cp-loading");
    readyResolve();
  }).catch(function () {
    document.body.classList.remove("cp-loading");
    $("[data-cp-title]").textContent = "Component could not be loaded";
    $("[data-cp-sub]").textContent = "Open this site over http (GitHub Pages or a local server), not file://.";
    readyResolve();
  });

  window.addEventListener("popstate", function () {
    var q = parseQuery();
    selectComponent(q.p, q.c, q.d, "none");
  });
})();
