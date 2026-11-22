/* Components browser (site chrome, not part of any pack).
   Every entry is a specimen from a language's own styleguide. The preview is that styleguide page,
   loaded in an iframe and cropped to the specimen, so it renders with the language's real CSS, JS,
   fonts and background, and stays interactive. The code is the specimen's markup read from the
   styleguide source file (the same file users copy), so preview and code cannot drift.
   Specimens are found with the selector the styleguide already gives site/code-view.js. */
(function () {
  var PACKS = [
    { id: "clay", name: "Clay", dot: "#A8E6CF", font: "font-family:Inter,sans-serif;font-weight:700;letter-spacing:-0.045em" },
    { id: "lilac", name: "Lilac", dot: "#7C55FF", font: "font-family:'Cormorant Garamond',serif;font-weight:500;letter-spacing:0.04em;text-transform:uppercase" },
    { id: "atelier", name: "Atelier", dot: "#2F7BF5", font: "font-family:Archivo,sans-serif;font-weight:800;font-stretch:112%;text-transform:uppercase;letter-spacing:0" },
    { id: "tactile", name: "Tactile", dot: "#2C8C8F", font: "font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;letter-spacing:-0.04em" },
    { id: "sketch", name: "Sketch", dot: "#A9C7EC", font: "font-family:Itim,sans-serif;font-weight:400;letter-spacing:0" }
  ];
  /* Loose categories so "the same idea" can be found across languages whose sections are named differently. */
  var CATS = [
    /colou?r|palette|swatch|token|foundation/i,
    /typograph|type scale|token|foundation/i,
    /button|control|component/i,
    /input|field|form|search|control|component/i,
    /tab|segment/i,
    /toggle|checkbox|selection|switch|radio|control|component/i,
    /progress|ring|step|slider/i,
    /alert|notification|toast|feedback|dialog|banner/i,
    /card|profile|data/i,
    /nav|sidebar|pagination|breadcrumb/i,
    /spacing|radius|elevation|layer|shadow|foundation/i,
    /chip|badge|tag|avatar/i
  ];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var packsEl = $("[data-packs]"), listEl = $("[data-list]"), frame = $("[data-frame]"), viewBox = $("[data-view-box]"), stage = $("[data-stage]");
  var codeBox = $("[data-code]"), codeText = $("[data-code-text]");
  var sources = {};      // id -> Promise<{ selector, skip, items: [{ title, slug, html, anchor }] }>
  var state = { pack: null, slug: null, view: "preview" };
  var minis = {};        // id -> { link, box, iframe }

  /* ---------- source parsing ---------- */
  function clean(node, skip) {
    node.querySelectorAll("[data-code-view], code-view-toggle, code-view-panel").forEach(function (n) { n.remove(); });
    if (skip) node.querySelectorAll(skip).forEach(function (n) { n.remove(); });
    return node;
  }
  function dedent(html) {
    var lines = html.replace(/\t/g, "  ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join("\n").replace(/\n{3,}/g, "\n\n");
  }
  function titleOf(el, skip, toggleIn) {
    var t = (toggleIn && el.querySelector(toggleIn)) || (skip && el.querySelector(skip));
    if (!t) return "Untitled";
    t = t.cloneNode(true);
    t.querySelectorAll("small, span").forEach(function (n) { n.remove(); });
    return t.textContent.replace(/\s+/g, " ").replace(/^\d+[.)]?\s*/, "").trim() || "Untitled";
  }
  function load(id) {
    if (sources[id]) return sources[id];
    sources[id] = fetch(id + "/index.html").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "text/html");
      var script = doc.querySelector("script[data-selector]");
      var selector = script.getAttribute("data-selector"), skip = script.getAttribute("data-skip") || "", toggleIn = script.getAttribute("data-toggle-in") || "";
      var seen = {};
      var items = Array.prototype.map.call(doc.querySelectorAll(selector), function (el, i) {
        var title = titleOf(el, skip, toggleIn);
        var slug = title.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item";
        seen[slug] = (seen[slug] || 0) + 1;
        if (seen[slug] > 1) slug += "-" + seen[slug];
        var idEl = el.id ? el : el.querySelector("[id]");
        return { index: i, title: title, slug: slug, anchor: idEl ? idEl.id : "", html: dedent(clean(el.cloneNode(true), skip).innerHTML) };
      });
      return { selector: selector, items: items };
    });
    return sources[id];
  }

  /* ---------- cropping a live styleguide to one specimen ---------- */
  function prepare(iframe) {
    var doc = iframe.contentDocument;
    if (!doc || !doc.head) return null;
    if (!doc.getElementById("cmp-isolate")) {
      var st = doc.createElement("style");
      st.id = "cmp-isolate";
      st.textContent = "code-view-toggle,code-view-panel{display:none!important}html,body{overflow:hidden!important}";
      doc.head.appendChild(st);
    }
    return doc;
  }
  function crop(box, iframe, selector, index, maxW, maxScale) {
    var doc = prepare(iframe);
    if (!doc) return;
    var el = doc.querySelectorAll(selector)[index];
    if (!el) return;
    var sh = Math.min(doc.documentElement.scrollHeight, 20000); // cap: never chase a growing page
    if (Math.abs((parseFloat(iframe.style.height) || 0) - sh) > 1) iframe.style.height = sh + "px";
    var r = el.getBoundingClientRect();
    var pad = 14;
    var x = Math.max(0, r.left - pad), y = Math.max(0, r.top - pad);
    // Some specimens let content spill past their box (a row of states); crop to what is drawn.
    var cw = Math.max(r.width, el.scrollWidth), ch = Math.max(r.height, el.scrollHeight);
    var w = Math.min(cw + pad * 2, iframe.offsetWidth - x), h = ch + pad * 2;
    var s = Math.min(maxScale, maxW / w);
    iframe.style.transform = "scale(" + s + ") translate(" + -x + "px," + -y + "px)";
    box.style.width = Math.round(w * s) + "px";
    box.style.height = Math.round(h * s) + "px";
  }
  function watch(iframe, recrop) {
    iframe.addEventListener("load", function () {
      var win = iframe.contentWindow;
      recrop();
      try { win.document.fonts.ready.then(recrop); } catch (e) { /* older engines */ }
      setTimeout(recrop, 600);
      setTimeout(recrop, 1600);
      if (win.ResizeObserver) {
        var t = 0;
        new win.ResizeObserver(function () { clearTimeout(t); t = setTimeout(recrop, 60); }).observe(win.document.body);
      }
    });
  }

  /* Layout width for the live page: the desktop styleguide, or its phone layout on small screens. */
  function layoutWidth() { return stage.clientWidth < 640 ? 390 : 1280; }

  var mainRecrop = function () {};
  function showPreview(item, data) {
    var want = state.pack + "/index.html";
    var lw = layoutWidth();
    frame.style.width = lw + "px";
    mainRecrop = function () { crop(viewBox, frame, data.selector, item.index, stage.clientWidth - (stage.clientWidth < 640 ? 16 : 56), 1); };
    if (frame.getAttribute("data-src") !== want) {
      frame.setAttribute("data-src", want);
      viewBox.classList.add("is-loading");
      frame.onload = function () { viewBox.classList.remove("is-loading"); };
      frame.src = want;
    } else {
      mainRecrop();
    }
  }
  watch(frame, function () { mainRecrop(); });
  if ("ResizeObserver" in window) {
    var lastW = 0;
    new ResizeObserver(function () {
      if (Math.abs(stage.clientWidth - lastW) < 2) return;
      lastW = stage.clientWidth;
      var lw = layoutWidth();
      if (frame.style.width !== lw + "px") frame.style.width = lw + "px";
      setTimeout(mainRecrop, 30);
    }).observe(stage);
  }

  /* ---------- related minis ---------- */
  function related(title) {
    var cats = CATS.filter(function (re) { return re.test(title); });
    var host = $("[data-minis]");
    PACKS.forEach(function (p) {
      var m = minis[p.id];
      if (p.id === state.pack) { if (m) m.link.hidden = true; return; }
      load(p.id).then(function (data) {
        var match = null;
        cats.some(function (re) { return data.items.some(function (it) { if (re.test(it.title)) { match = it; return true; } return false; }); });
        if (!m) {
          var link = document.createElement("a");
          link.className = "mini";
          link.innerHTML = '<span class="mini__view"><iframe tabindex="-1" aria-hidden="true" loading="lazy"></iframe></span><span class="mini__cap"><b style="' + p.font + '"></b><span></span></span>';
          host.appendChild(link);
          m = minis[p.id] = { link: link, box: link.querySelector(".mini__view"), iframe: link.querySelector("iframe"), recrop: function () {} };
          m.link.querySelector("b").textContent = p.name;
          m.iframe.style.width = "1280px";
          watch(m.iframe, function () { m.recrop(); });
          m.iframe.src = p.id + "/index.html";
        }
        if (!match) { m.link.hidden = true; return; }
        m.link.hidden = false;
        m.link.href = "#/" + p.id + "/" + match.slug;
        m.link.setAttribute("aria-label", p.name + ": " + match.title);
        m.link.querySelector(".mini__cap span").textContent = match.title;
        m.recrop = function () { crop(m.box, m.iframe, data.selector, match.index, m.link.clientWidth - 2, 0.42); };
        m.recrop();
        $(".cmp__related").hidden = false;
      });
    });
    $(".cmp__related").hidden = !cats.length;
  }

  /* ---------- rendering ---------- */
  function renderPacks() {
    packsEl.innerHTML = "";
    PACKS.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "lang";
      a.href = "#/" + p.id;
      a.innerHTML = '<i style="background:' + p.dot + '"></i><span style="' + p.font + '"></span>';
      a.querySelector("span").textContent = p.name;
      if (p.id === state.pack) a.setAttribute("aria-current", "true");
      packsEl.appendChild(a);
    });
  }
  function renderList(data) {
    listEl.innerHTML = "";
    data.items.forEach(function (it) {
      var li = document.createElement("li");
      var a = document.createElement("a");
      a.href = "#/" + state.pack + "/" + it.slug;
      a.textContent = it.title;
      if (it.slug === state.slug) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      listEl.appendChild(li);
    });
    var cur = listEl.querySelector("[aria-current]");
    if (cur && cur.scrollIntoView && listEl.scrollHeight > listEl.clientHeight) {
      var top = cur.offsetTop - listEl.clientHeight / 2;
      listEl.scrollTop = Math.max(0, top);
    }
  }
  function setPager(el, it) {
    if (!it) { el.hidden = true; return; }
    el.hidden = false;
    el.href = "#/" + state.pack + "/" + it.slug;
    el.querySelector("span").textContent = it.title;
  }
  function render() {
    var pack = PACKS.filter(function (p) { return p.id === state.pack; })[0];
    renderPacks();
    load(pack.id).then(function (data) {
      var i = 0;
      data.items.some(function (it, n) { if (it.slug === state.slug) { i = n; return true; } return false; });
      var item = data.items[i];
      state.slug = item.slug;
      renderList(data);
      $("[data-crumb]").innerHTML = '<span style="' + pack.font + '"></span> · Components';
      $("[data-crumb] span").textContent = pack.name;
      $("[data-title]").textContent = item.title;
      $("[data-sub]").textContent = (i + 1) + " of " + data.items.length + " in the " + pack.name + " styleguide. The markup below is copied straight from " + pack.id + "/index.html.";
      document.title = item.title + " · " + pack.name + " · UI Design Languages";
      codeText.textContent = item.html;
      $("[data-codefile]").textContent = pack.id + "/index.html";
      var open = $("[data-act=open]");
      open.href = pack.id + "/index.html" + (item.anchor ? "#" + item.anchor : "");
      setPager($("[data-prev]"), data.items[i - 1]);
      setPager($("[data-next]"), data.items[i + 1]);
      showPreview(item, data);
      related(item.title);
      state.item = item;
    }).catch(function () {
      $("[data-crumb]").textContent = "Could not load " + pack.id + "/index.html. Open this page over http (GitHub Pages or a local server), not file://.";
    });
  }
  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var pack = PACKS.some(function (p) { return p.id === parts[0]; }) ? parts[0] : PACKS[0].id;
    var changed = pack !== state.pack || parts[1] !== state.slug;
    state.pack = pack;
    state.slug = parts[1] || null;
    if (changed) render();
  }

  /* ---------- controls ---------- */
  document.querySelectorAll("[data-view]").forEach(function (b) {
    b.addEventListener("click", function () {
      state.view = b.getAttribute("data-view");
      document.querySelectorAll("[data-view]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      stage.hidden = state.view !== "preview";
      codeBox.hidden = state.view !== "code";
      if (!stage.hidden) setTimeout(mainRecrop, 30);
    });
  });
  function copy(btn, text) {
    var label = btn.querySelector("span") || btn, original = label.textContent;
    function done(ok) { label.textContent = ok ? "Copied" : "Copy failed"; btn.classList.toggle("is-copied", ok); setTimeout(function () { label.textContent = original; btn.classList.remove("is-copied"); }, 1500); }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      ta.remove(); done(ok);
    }
  }
  $("[data-act=copy]").addEventListener("click", function () { if (state.item) copy(this, state.item.html); });
  $("[data-act=ai]").addEventListener("click", function () {
    if (!state.item) return;
    var pack = PACKS.filter(function (p) { return p.id === state.pack; })[0];
    var root = new URL("./", location.href).href;
    var text = "Recreate the " + pack.name + " component \"" + state.item.title + "\" from the UI Design Languages library.\n" +
      "First read " + root + pack.id + "/DESIGN.md and " + root + pack.id + "/AGENTS.md. Link " + root + pack.id + "/css/" + pack.id + ".css (and " + root + pack.id + "/js/" + pack.id + ".js for interactive parts) plus the fonts named in DESIGN.md.\n" +
      "Use only ." + pack.id + "-* classes and var(--" + pack.id + "-*) tokens; page CSS is for layout only. Reference markup from " + pack.id + "/index.html:\n\n" + state.item.html;
    copy(this, text);
  });

  window.addEventListener("hashchange", route);
  route();
})();
