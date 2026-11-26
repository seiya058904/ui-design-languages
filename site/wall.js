/* Site chrome — live component engine shared by the homepage marquee and the component wall.
   It reads the registry (packs.json) and each pack's own catalog (<pack>/components.html), and renders
   real demos straight into this page: every pack's CSS applies to the page (all classes are prefixed, so
   they coexist). A page may link them in <head> up front (the component wall does); any it doesn't is
   linked here on demand, before site/site.css, and its fonts are added without blocking rendering. Icon
   sprites are merged with per-pack ids, and the packs' JS is loaded once in parallel. No screenshots,
   no iframes. Not part of any pack.

   UIWall.ready()            → Promise: reads packs.json, links what is missing and waits for every pack's
                               stylesheet (never for fonts), then reads every pack's catalog and icon sprite
   UIWall.demo(pack, c, d)   → { component, demo } data or null
   UIWall.stage(pack, c, d)  → a live element (.wstage) for that demo (with collision-free ids/names)
   UIWall.packs / .byId      → the registry from packs.json (after ready)
   UIWall.scripts()          → loads each pack's own JS once in parallel (after ready) */
(function () {
  /* Mark multi-pack host pages so individual packs don't fight over global <html> theme/accent state. */
  document.documentElement.setAttribute("data-wall-host", "");

  var PACKS = [];
  var byId = {};
  var styled = []; // one promise per pack: its entry stylesheet has applied (or failed, or 5s passed)
  function register(list) {
    list.forEach(function (pk) {
      if (!pk.site || byId[pk.id]) return;
      var s = pk.site, theme = (pk.variants && pk.variants.theme) || [];
      var p = {
        id: pk.id, name: pk.name, summary: pk.summary || "", status: pk.status || "",
        fonts: (pk.fonts || []).map(function (f) { return f.url; }).filter(Boolean),
        js: !!(pk.entry && pk.entry.js), dark: theme.indexOf("dark") >= 0, variants: pk.variants || {},
        dot: s.dot || "#999", font: s.label || "", root: s.root || "", canvas: s.canvas || "", page: s.page || "",
        backdrop: s.backdrop || null, hooks: s.hooks || "", darkHint: s.darkHint || "", wall: s.wall || [], tone: s.tone || ""
      };
      PACKS.push(p);
      byId[p.id] = p;
      styled.push(linkAssets(pk));
    });
  }
  /* Resolves once the stylesheet has applied — or failed, or 5s passed: a missing sheet never hangs the wall. */
  function applied(link) {
    if (link.sheet) return Promise.resolve();
    return new Promise(function (resolve) {
      var t = setTimeout(resolve, 5000);
      function done() { clearTimeout(t); resolve(); }
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
    });
  }
  function linkAssets(pk) {
    var head = document.head, chrome = head.querySelector('link[href$="site/site.css"]');
    var css = pk.entry && pk.entry.css, sheet = css ? head.querySelector('link[href$="' + css + '"]') : null;
    if (css && !sheet) {
      sheet = document.createElement("link");
      sheet.rel = "stylesheet"; sheet.href = css;
      head.insertBefore(sheet, chrome);
    }
    var loaded = Array.prototype.map.call(head.querySelectorAll('link[href*="fonts.googleapis.com/css"]'), function (x) { return x.href; }).join(" ");
    (pk.fonts || []).forEach(function (f) {
      if (!f.url || loaded.indexOf("family=" + String(f.family || "").replace(/ /g, "+")) >= 0) return;
      // Fonts never block: the link applies once it has loaded, and nothing waits for it.
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = f.url; l.media = "print";
      l.onload = function () { l.media = "all"; };
      head.insertBefore(l, chrome);
    });
    return sheet ? applied(sheet) : Promise.resolve();
  }
  var data = {};

  function dedent(html) {
    var lines = html.replace(/\t/g, "  ").split("\n");
    while (lines.length && !lines[0].trim()) lines.shift();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
    var min = Infinity;
    lines.forEach(function (l) { if (l.trim()) min = Math.min(min, l.match(/^ */)[0].length); });
    if (!isFinite(min)) min = 0;
    return lines.map(function (l) { return l.slice(min); }).join("\n");
  }

  var sprite = null;
  function addSymbols(packId, doc) {
    if (!sprite) {
      sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      sprite.setAttribute("aria-hidden", "true");
      sprite.setAttribute("style", "position:absolute;width:0;height:0;overflow:hidden");
      document.body.insertBefore(sprite, document.body.firstChild);
    }
    var frag = document.createDocumentFragment();
    doc.querySelectorAll("symbol[id]").forEach(function (s) {
      var copy = document.importNode(s, true);
      copy.id = packId + "--" + s.id;
      frag.appendChild(copy);
    });
    sprite.appendChild(frag);
  }
  /* Icons are referenced as #i-name inside each pack; give them pack-scoped ids on this shared page. */
  function scopeIcons(html, packId) { return html.replace(/(<use\b[^>]*\bhref=")#/g, "$1#" + packId + "--"); }

  var parseQueue = Promise.resolve();
  function load(packId) {
    return Promise.all([
      fetch(packId + "/components.html").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }),
      fetch("site/compare/" + packId + ".html").then(function (r) { return r.ok ? r.text() : ""; }).catch(function () { return ""; })
    ]).then(function (pair) {
      var text = pair[0], cmpText = pair[1];
      // Serialize catalog DOMParser calls across macrotasks so 9 concurrent parses never pile into one long task.
      var job = parseQueue.then(function () {
        return new Promise(function (r) { setTimeout(r, 0); });
      }).then(function () {
        var doc = new DOMParser().parseFromString(text, "text/html");
        var items = {}, order = [];
        doc.querySelectorAll("[data-component]").forEach(function (sec) {
          var id = sec.getAttribute("data-component");
          var h = sec.querySelector("h2"), p = sec.querySelector(":scope > p");
          order.push(id);
          items[id] = {
            id: id,
            title: h ? h.textContent.trim() : id,
            summary: p ? p.textContent.trim() : "",
            demos: Array.prototype.map.call(sec.querySelectorAll("[data-demo]"), function (dm) {
              var st = dm.querySelector(".demo__stage"), label = dm.querySelector("h3");
              return {
                id: dm.getAttribute("data-demo"),
                label: label ? label.textContent.trim() : "",
                html: dedent(st.innerHTML),
                classes: Array.prototype.filter.call(st.classList, function (c) { return c !== "demo__stage"; }),
                dialog: dm.hasAttribute("data-open-dialog")
              };
            })
          };
        });
        if (cmpText) {
          var cmpDoc = new DOMParser().parseFromString(cmpText, "text/html");
          var art = cmpDoc.querySelector("article");
          if (art) {
            order.push("compare");
            items["compare"] = {
              id: "compare",
              title: "Weekly report",
              summary: "Same composite card markup across all nine design languages: status badge, segmented frequency control, input, toggle switch and actions.",
              demos: [{
                id: "weekly-report",
                label: "Weekly report",
                html: dedent(art.outerHTML),
                classes: packId === "clay" ? ["clay-board"] : [],
                dialog: false
              }]
            };
          }
        }
        var symbols = {};
        doc.querySelectorAll("symbol[id]").forEach(function (sym) { symbols[sym.id] = sym.outerHTML; });
        data[packId] = { items: items, order: order, symbols: symbols };
        addSymbols(packId, doc);
      });
      parseQueue = job.catch(function () {});
      return job;
    });
  }

  /* Parallel download + deterministic insertion-order execution (async = false). */
  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
      s.async = false;
      s.onload = s.onerror = function () { resolve(); };
      document.body.appendChild(s);
    });
  }
  /* Atelier's JS restores its own saved appearance onto <html>; this shared page keeps the defaults. */
  function resetAppearance() {
    var d = document.documentElement;
    ["data-accent", "data-density", "data-motion", "data-contrast", "data-tone"].forEach(function (a) { d.removeAttribute(a); });
    d.style.removeProperty("--atelier-radius-base");
    var t = d.getAttribute("data-wall-theme");
    if (t) d.setAttribute("data-theme", t); else d.removeAttribute("data-theme");
  }

  var readyPromise = null;
  function ready() {
    if (readyPromise) return readyPromise;
    readyPromise = fetch("packs.json").then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }).then(function (reg) {
      register(reg.packs || []);
      return Promise.all([Promise.all(styled)].concat(PACKS.map(function (p) { return load(p.id).catch(function () {}); })));
    });
    return readyPromise;
  }
  var scriptsPromise = null;
  function scripts() {
    if (scriptsPromise) return scriptsPromise;
    scriptsPromise = ready().then(function () {
      return Promise.all(PACKS.filter(function (p) { return p.js; }).map(function (p) {
        return loadScript(p.id + "/js/" + p.id + ".js");
      }));
    }).then(resetAppearance);
    return scriptsPromise;
  }

  /* Demo links are placeholders (href="#"): following them would throw the page back to the top. */
  function inertLinks(e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  }

  function demo(packId, compId, demoId) {
    var pk = data[packId]; if (!pk) return null;
    var comp = pk.items[compId]; if (!comp) return null;
    var dm = demoId ? comp.demos.filter(function (d) { return d.id === demoId; })[0] : comp.demos[0];
    return dm ? { component: comp, demo: dm } : null;
  }

  /* Scope ids, id-references and radio group names inside rendered live stages so multiple packs and
     cloned marquee stages never collide (raw source in data[packId] stays untouched for UISource). */
  var stageSeq = 0;
  function scopeStageDom(el, packId) {
    var prefix = "ws" + (++stageSeq) + "-";
    var idMap = {};
    el.querySelectorAll("[id]").forEach(function (n) {
      var old = n.id;
      if (!old) return;
      idMap[old] = prefix + old;
      n.id = idMap[old];
    });
    var keys = Object.keys(idMap);
    if (keys.length) {
      ["for", "aria-controls", "aria-labelledby", "aria-describedby"].forEach(function (attr) {
        el.querySelectorAll("[" + attr + "]").forEach(function (n) {
          var val = n.getAttribute(attr);
          if (!val) return;
          var next = val.split(/\s+/).map(function (tok) { return idMap[tok] || tok; }).join(" ");
          if (next !== val) n.setAttribute(attr, next);
        });
      });
      var openAttr = "data-" + packId + "-open";
      el.querySelectorAll("[" + openAttr + "]").forEach(function (n) {
        var sel = n.getAttribute(openAttr);
        if (sel && sel.charAt(0) === "#" && idMap[sel.slice(1)]) n.setAttribute(openAttr, "#" + idMap[sel.slice(1)]);
      });
      // Also rewrite url(#id) in inline SVG gradients/masks if any
      el.querySelectorAll("[fill^='url(#'], [stroke^='url(#'], [clip-path^='url(#']").forEach(function (n) {
        ["fill", "stroke", "clip-path"].forEach(function (a) {
          var v = n.getAttribute(a);
          if (!v) return;
          var m = /^url\(#([^)]+)\)$/.exec(v);
          if (m && idMap[m[1]]) n.setAttribute(a, "url(#" + idMap[m[1]] + ")");
        });
      });
    }
    el.querySelectorAll('input[type="radio"][name]').forEach(function (n) {
      n.name = prefix + n.name;
    });
  }

  function stage(packId, compId, demoId) {
    var hit = demo(packId, compId, demoId);
    if (!hit) return null;
    var p = byId[packId];
    var el = document.createElement("div");
    el.className = ["wstage"].concat(hit.demo.classes).join(" ");
    el.setAttribute("data-pack-stage", packId);
    el.setAttribute("data-comp", compId);
    el.setAttribute("style", p.root + (p.canvas ? ";" + p.canvas : ""));
    el.innerHTML = scopeIcons(hit.demo.html, packId);
    scopeStageDom(el, packId);
    el.addEventListener("click", inertLinks);
    return el;
  }
  function setTheme(theme) {
    var d = document.documentElement;
    if (theme === "dark") { d.setAttribute("data-wall-theme", "dark"); d.setAttribute("data-theme", "dark"); }
    else { d.removeAttribute("data-wall-theme"); d.removeAttribute("data-theme"); }
  }

  window.UIWall = { packs: PACKS, byId: byId, ready: ready, scripts: scripts, demo: demo, stage: stage, data: data, setTheme: setTheme, inertLinks: inertLinks };
})();
