/* Components browser (site chrome, not part of any pack).
   Source of truth: each pack's own catalog page, <pack>/components.html — real components grouped
   by <section data-component>, each with demos (<div data-demo>) whose .demo__stage holds the live
   markup. Every demo is rendered in its own frame (site/demo.html) with the pack's CSS, fonts, icons
   and JS at natural size, so what you see is the component itself, interactive. The code shown is
   the stage markup from that same file. */
(function () {
  var PACKS = [
    { id: "clay", name: "Clay", dot: "#A8E6CF", font: "font-family:Inter,sans-serif;font-weight:700;letter-spacing:-0.045em" },
    { id: "lilac", name: "Lilac", dot: "#7C55FF", font: "font-family:'Cormorant Garamond',serif;font-weight:500;letter-spacing:0.04em;text-transform:uppercase" },
    { id: "atelier", name: "Atelier", dot: "#2F7BF5", font: "font-family:Archivo,sans-serif;font-weight:800;font-stretch:112%;text-transform:uppercase;letter-spacing:0" },
    { id: "tactile", name: "Tactile", dot: "#2C8C8F", font: "font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;letter-spacing:-0.04em" },
    { id: "sketch", name: "Sketch", dot: "#A9C7EC", font: "font-family:Itim,sans-serif;font-weight:400;letter-spacing:0" }
  ];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var packsEl = $("[data-packs]"), listEl = $("[data-list]"), demosEl = $("[data-demos]"), othersEl = $("[data-others]"), search = $("[data-search]");
  var state = { pack: null, comp: null, layout: "desktop", opts: {}, item: null };
  var catalogs = {};   // id -> Promise<{ items: [{ id, title, summary, demos: [{ id, label, html }] }] }>
  var frames = [];     // { el, pack }

  function packOf(id) { return PACKS.filter(function (p) { return p.id === id; })[0]; }

  /* ---------- catalog parsing ---------- */
  function dedent(html) {
    var lines = html.replace(/\t/g, "  ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join("\n");
  }
  function load(id) {
    if (catalogs[id]) return catalogs[id];
    catalogs[id] = fetch(id + "/components.html").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "text/html");
      var items = Array.prototype.map.call(doc.querySelectorAll("[data-component]"), function (sec) {
        var h = sec.querySelector("h2"), p = sec.querySelector(":scope > p");
        return {
          id: sec.getAttribute("data-component"),
          title: h ? h.textContent.trim() : sec.getAttribute("data-component"),
          summary: p ? p.textContent.trim() : "",
          demos: Array.prototype.map.call(sec.querySelectorAll("[data-demo]"), function (dm) {
            var label = dm.querySelector("h3");
            return { id: dm.getAttribute("data-demo"), label: label ? label.textContent.trim() : "", html: dedent(dm.querySelector(".demo__stage").innerHTML) };
          })
        };
      });
      return { items: items };
    });
    return catalogs[id];
  }

  /* ---------- preview options (theme + variants) from packs.json ---------- */
  var registry = fetch("packs.json").then(function (r) { return r.json(); }).then(function (d) {
    var map = {};
    (d.packs || d).forEach(function (p) {
      var files = (p.tokens || []).join(" ");
      var opts = [];
      Object.keys(p.variants || {}).forEach(function (attr) {
        var values = p.variants[attr];
        if (!Array.isArray(values) || attr === "motion") return;
        if (attr === "theme") { opts.unshift({ attr: "theme", values: ["light", "dark"], def: "light" }); return; }
        var def = values.filter(function (v) { return files.indexOf("tokens." + attr + "-" + v + ".json") === -1; })[0] || values[0];
        opts.push({ attr: attr, values: values, def: def });
      });
      map[p.id] = opts;
    });
    return map;
  }).catch(function () { return {}; });
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  /* Attributes for a pack's frames: the theme applies to every pack that has one; variants only to the current pack. */
  function attrsFor(packId, map) {
    var out = {};
    (map[packId] || []).forEach(function (o) {
      var chosen = o.attr === "theme" ? state.opts.theme : packId === state.pack ? (state.opts[packId] || {})[o.attr] : null;
      out[o.attr] = chosen && chosen !== o.def ? chosen : "";
    });
    return out;
  }
  function pushAttrs() {
    registry.then(function (map) {
      frames.forEach(function (f) { if (f.el.contentWindow) f.el.contentWindow.postMessage({ type: "demo-attrs", attrs: attrsFor(f.pack, map) }, "*"); });
    });
  }
  function optValue(o) { return (o.attr === "theme" ? state.opts.theme : (state.opts[state.pack] || {})[o.attr]) || o.def; }
  function setOpt(o, v) {
    if (o.attr === "theme") state.opts.theme = v;
    else (state.opts[state.pack] = state.opts[state.pack] || {})[o.attr] = v;
    renderOpts();
    pushAttrs();
  }
  function seg(label, pairs, isOn, onPick) {
    var g = document.createElement("div");
    g.className = "seg";
    g.setAttribute("role", "group");
    g.setAttribute("aria-label", label);
    pairs.forEach(function (pair) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = pair[1];
      b.setAttribute("aria-pressed", String(isOn(pair[0])));
      b.addEventListener("click", function () { onPick(pair[0]); });
      g.appendChild(b);
    });
    return g;
  }
  function renderOpts() {
    var host = $("[data-opts]");
    registry.then(function (map) {
      host.innerHTML = "";
      (map[state.pack] || []).forEach(function (o) {
        if (o.attr === "theme") {
          host.appendChild(seg("Theme", o.values.map(function (v) { return [v, cap(v)]; }), function (v) { return optValue(o) === v; }, function (v) { setOpt(o, v); }));
          return;
        }
        var label = document.createElement("label");
        label.className = "opt";
        label.innerHTML = "<span></span><select></select>";
        label.querySelector("span").textContent = cap(o.attr);
        var sel = label.querySelector("select");
        o.values.forEach(function (v) { var op = document.createElement("option"); op.value = v; op.textContent = cap(v); sel.appendChild(op); });
        sel.value = optValue(o);
        sel.addEventListener("change", function () { setOpt(o, sel.value); });
        host.appendChild(label);
      });
      host.appendChild(seg("Layout", [["desktop", "Desktop"], ["phone", "Phone"]], function (v) { return state.layout === v; }, function (v) {
        state.layout = v;
        demosEl.classList.toggle("is-phone", v === "phone");
        renderOpts();
      }));
    });
  }

  /* ---------- frames ---------- */
  function makeFrame(packId, compId, demoId, title) {
    var f = document.createElement("iframe");
    f.className = "demo-frame";
    f.title = title;
    f.loading = "lazy";
    registry.then(function (map) {
      var qs = new URLSearchParams({ p: packId, c: compId, d: demoId });
      var a = attrsFor(packId, map);
      Object.keys(a).forEach(function (k) { if (a[k]) qs.set(k, a[k]); });
      f.src = "site/demo.html?" + qs.toString();
    });
    frames.push({ el: f, pack: packId });
    return f;
  }
  window.addEventListener("message", function (e) {
    if (!e.data || e.data.type !== "demo-size") return;
    frames.forEach(function (f) { if (f.el.contentWindow === e.source) f.el.style.height = Math.max(60, e.data.h) + "px"; });
  });
  function dropFrames(container) {
    frames = frames.filter(function (f) { return !container.contains(f.el); });
    container.innerHTML = "";
  }

  /* ---------- copy ---------- */
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

  /* ---------- rendering ---------- */
  function renderPacks() {
    packsEl.innerHTML = "";
    PACKS.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "lang";
      a.href = "#/" + p.id + (state.comp ? "/" + state.comp : "");
      a.innerHTML = '<i style="background:' + p.dot + '"></i><span style="' + p.font + '"></span>';
      a.querySelector("span").textContent = p.name;
      if (p.id === state.pack) a.setAttribute("aria-current", "true");
      packsEl.appendChild(a);
    });
  }
  function renderList(cat) {
    if (search.value.trim()) { runSearch(); return; }
    listEl.innerHTML = "";
    cat.items.forEach(function (it) {
      var li = document.createElement("li"), a = document.createElement("a");
      a.href = "#/" + state.pack + "/" + it.id;
      a.textContent = it.title;
      if (it.id === state.comp) a.setAttribute("aria-current", "page");
      li.appendChild(a);
      listEl.appendChild(li);
    });
  }
  function renderDemos(pack, item) {
    dropFrames(demosEl);
    item.demos.forEach(function (dm) {
      var card = document.createElement("article");
      card.className = "demo";
      card.innerHTML =
        '<header class="demo__head"><h2></h2><div class="seg" role="group" aria-label="View"><button type="button" aria-pressed="true" data-v="preview">Preview</button><button type="button" aria-pressed="false" data-v="code">Code</button></div>' +
        '<button class="pill pill--sm" type="button" data-copy-demo><span>Copy</span></button></header>' +
        '<div class="demo__view"></div><pre class="demo__code" hidden><code></code></pre>';
      card.querySelector("h2").textContent = dm.label;
      card.querySelector("code").textContent = dm.html;
      card.querySelector(".demo__view").appendChild(makeFrame(pack.id, item.id, dm.id, pack.name + " " + item.title + ": " + dm.label));
      card.querySelectorAll("[data-v]").forEach(function (b) {
        b.addEventListener("click", function () {
          var code = b.getAttribute("data-v") === "code";
          card.querySelectorAll("[data-v]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
          card.querySelector(".demo__view").hidden = code;
          card.querySelector(".demo__code").hidden = !code;
        });
      });
      card.querySelector("[data-copy-demo]").addEventListener("click", function () { copy(this, dm.html); });
      demosEl.appendChild(card);
    });
  }
  function renderOthers(item) {
    dropFrames(othersEl);
    $(".cmp__related").hidden = true;
    PACKS.forEach(function (p) {
      if (p.id === state.pack) return;
      var slot = document.createElement("article");
      slot.className = "other";
      othersEl.appendChild(slot);
      load(p.id).then(function (cat) {
        var match = cat.items.filter(function (it) { return it.id === item.id; })[0];
        if (!match || !match.demos.length || state.comp !== item.id) { slot.remove(); return; }
        $(".cmp__related").hidden = false;
        slot.innerHTML = '<a class="other__head" href="#/' + p.id + "/" + match.id + '"><b style="' + p.font + '"></b><span></span></a><div class="other__view"></div>';
        slot.querySelector("b").textContent = p.name;
        slot.querySelector("span").textContent = match.demos[0].label;
        slot.querySelector(".other__view").appendChild(makeFrame(p.id, match.id, match.demos[0].id, p.name + " " + match.title));
      }, function () { slot.remove(); });
    });
  }
  function setPager(el, it) {
    if (!it) { el.hidden = true; return; }
    el.hidden = false;
    el.href = "#/" + state.pack + "/" + it.id;
    el.querySelector("span").textContent = it.title;
  }
  function render() {
    var pack = packOf(state.pack);
    load(pack.id).then(function (cat) {
      var i = 0;
      cat.items.some(function (it, n) { if (it.id === state.comp) { i = n; return true; } return false; });
      var item = cat.items[i];
      state.comp = item.id;
      state.item = item;
      renderPacks();
      renderList(cat);
      $("[data-crumb]").innerHTML = '<span style="' + pack.font + '"></span> · Components';
      $("[data-crumb] span").textContent = pack.name;
      $("[data-title]").textContent = item.title;
      $("[data-sub]").textContent = item.summary + " Live " + pack.name + " components: hover, press and type. Code comes from " + pack.id + "/components.html.";
      document.title = item.title + " · " + pack.name + " · UI Design Languages";
      $("[data-act=open]").href = pack.id + "/components.html#" + item.id;
      setPager($("[data-prev]"), cat.items[i - 1]);
      setPager($("[data-next]"), cat.items[i + 1]);
      renderOpts();
      renderDemos(pack, item);
      renderOthers(item);
    }).catch(function () {
      renderPacks();
      $("[data-crumb]").textContent = "Could not load " + pack.id + "/components.html. Open this page over http (GitHub Pages or a local server), not file://.";
    });
  }
  function route() {
    var parts = location.hash.replace(/^#\/?/, "").split("/");
    var pack = packOf(parts[0]) ? parts[0] : PACKS[0].id;
    var comp = parts[1] || state.comp; // switching language keeps the component when it exists there
    if (pack === state.pack && comp === state.comp) return;
    state.pack = pack;
    state.comp = comp;
    render();
  }

  /* ---------- search across every language ---------- */
  function runSearch() {
    var q = search.value.trim().toLowerCase();
    if (!q) { load(state.pack).then(renderList); return; }
    Promise.all(PACKS.map(function (p) { return load(p.id).then(function (c) { return { pack: p, items: c.items }; }, function () { return { pack: p, items: [] }; }); })).then(function (groups) {
      if (search.value.trim().toLowerCase() !== q) return;
      listEl.innerHTML = "";
      var total = 0;
      groups.forEach(function (g) {
        var hits = g.items.filter(function (it) { return (it.title + " " + it.summary).toLowerCase().indexOf(q) !== -1; });
        var inCode = g.items.filter(function (it) { return hits.indexOf(it) === -1 && it.demos.some(function (d) { return d.html.toLowerCase().indexOf(q) !== -1; }); });
        hits = hits.concat(inCode);
        if (!hits.length) return;
        var head = document.createElement("li");
        head.className = "cmp__group";
        head.innerHTML = '<span style="' + g.pack.font + '"></span>';
        head.firstChild.textContent = g.pack.name;
        listEl.appendChild(head);
        hits.forEach(function (it) {
          var li = document.createElement("li"), a = document.createElement("a");
          a.href = "#/" + g.pack.id + "/" + it.id;
          a.textContent = it.title;
          if (inCode.indexOf(it) !== -1) { var m = document.createElement("small"); m.textContent = "in markup"; a.appendChild(m); }
          if (g.pack.id === state.pack && it.id === state.comp) a.setAttribute("aria-current", "page");
          li.appendChild(a);
          listEl.appendChild(li);
          total++;
        });
      });
      if (!total) {
        var li = document.createElement("li");
        li.className = "cmp__empty";
        li.textContent = "Nothing matches “" + q + "”. Try button, toggle, card or table.";
        listEl.appendChild(li);
      }
    });
  }
  search.addEventListener("input", runSearch);
  search.addEventListener("keydown", function (e) {
    var first = listEl.querySelector("a");
    if (e.key === "Enter" && first) { location.hash = first.getAttribute("href"); e.preventDefault(); }
    if (e.key === "ArrowDown" && first) { first.focus(); e.preventDefault(); }
    if (e.key === "Escape") { search.value = ""; runSearch(); search.blur(); }
  });

  /* ---------- keyboard: left/right previous / next, "/" search ---------- */
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
    if (t && (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable)) return;
    if (e.key === "/") { search.focus(); search.select(); e.preventDefault(); return; }
    var link = e.key === "ArrowLeft" ? $("[data-prev]") : e.key === "ArrowRight" ? $("[data-next]") : null;
    if (link && !link.hidden) { location.hash = link.getAttribute("href"); e.preventDefault(); }
  });

  $("[data-act=ai]").addEventListener("click", function () {
    if (!state.item) return;
    var pack = packOf(state.pack), root = new URL("./", location.href).href;
    var text = "Build with the " + pack.name + " design language from the UI Design Languages library: the " + state.item.title + " component.\n" +
      "First read " + root + pack.id + "/DESIGN.md and " + root + pack.id + "/AGENTS.md. Link " + root + pack.id + "/css/" + pack.id + ".css (and " + root + pack.id + "/js/" + pack.id + ".js for interactive parts) plus the fonts named in DESIGN.md.\n" +
      "Use only ." + pack.id + "-* classes and var(--" + pack.id + "-*) tokens; page CSS is for layout only. Reference markup from " + pack.id + "/components.html:\n\n" +
      state.item.demos.map(function (d) { return "<!-- " + d.label + " -->\n" + d.html; }).join("\n\n");
    copy(this, text);
  });

  window.addEventListener("hashchange", route);
  route();
})();
