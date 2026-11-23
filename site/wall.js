/* Site chrome — live component engine shared by the homepage marquee and the component wall.
   It reads the registry (packs.json) and each pack's own catalog (<pack>/components.html), and renders
   real demos straight into this page: every pack's CSS is linked in <head> (all classes are prefixed,
   so they coexist; a pack the page doesn't link yet is linked automatically), their icon sprites are
   merged with per-pack ids, and their JS is loaded once. No screenshots, no iframes. Not part of any pack.

   UIWall.ready()            → Promise: reads packs.json, then every pack's catalog and icon sprite
   UIWall.demo(pack, c, d)   → { component, demo } data or null
   UIWall.stage(pack, c, d)  → a live element (.wstage) for that demo
   UIWall.packs / .byId      → the registry from packs.json (after ready): name, dot, label font,
                               stage styles, backdrop, script hooks, wall picks, fonts, dark support, tone
   UIWall.scripts()          → loads each pack's own JS once (after ready) */
(function () {
  /* The registry is packs.json: every pack with a "site" block shows up here (see siteFields there).
     PACKS and byId are filled in place by ready(), so references taken early stay valid. */
  var PACKS = [];
  var byId = {};
  function register(list) {
    list.forEach(function (pk) {
      if (!pk.site || byId[pk.id]) return;
      var s = pk.site, theme = (pk.variants && pk.variants.theme) || [];
      var p = {
        id: pk.id, name: pk.name, summary: pk.summary || "", status: pk.status || "",
        fonts: (pk.fonts || []).map(function (f) { return f.url; }).filter(Boolean),
        js: !!(pk.entry && pk.entry.js), dark: theme.indexOf("dark") >= 0,
        dot: s.dot || "#999", font: s.label || "", root: s.root || "", canvas: s.canvas || "", page: s.page || "",
        backdrop: s.backdrop || null, hooks: s.hooks || "", darkHint: s.darkHint || "", wall: s.wall || [], tone: s.tone || ""
      };
      PACKS.push(p);
      byId[p.id] = p;
      linkAssets(pk);
    });
  }
  /* A pack registered after this page was written still renders: link its stylesheet before the site
     chrome (so site.css keeps the last word) and any font family the page doesn't load yet. */
  function linkAssets(pk) {
    var head = document.head, chrome = head.querySelector('link[href$="site/site.css"]');
    var css = pk.entry && pk.entry.css;
    if (css && !head.querySelector('link[href$="' + css + '"]')) {
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = css;
      head.insertBefore(l, chrome);
    }
    var loaded = Array.prototype.map.call(head.querySelectorAll('link[href*="fonts.googleapis.com/css"]'), function (x) { return x.href; }).join(" ");
    (pk.fonts || []).forEach(function (f) {
      if (!f.url || loaded.indexOf("family=" + String(f.family || "").replace(/ /g, "+")) >= 0) return;
      var l = document.createElement("link");
      l.rel = "stylesheet"; l.href = f.url;
      head.insertBefore(l, chrome);
    });
  }
  var data = {};   // pack -> { items: { [component]: { title, summary, demos: [{ id, label, html, classes }] } }, order: [] }

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
    doc.querySelectorAll("symbol[id]").forEach(function (s) {
      var copy = document.importNode(s, true);
      copy.id = packId + "--" + s.id;
      sprite.appendChild(copy);
    });
  }
  /* Icons are referenced as #i-name inside each pack; give them pack-scoped ids on this shared page. */
  function scopeIcons(html, packId) { return html.replace(/(<use\b[^>]*\bhref=")#/g, "$1#" + packId + "--"); }

  function load(packId) {
    return fetch(packId + "/components.html").then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
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
      var symbols = {};
      doc.querySelectorAll("symbol[id]").forEach(function (sym) { symbols[sym.id] = sym.outerHTML; });
      data[packId] = { items: items, order: order, symbols: symbols };
      addSymbols(packId, doc);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = src;
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
      return Promise.all(PACKS.map(function (p) { return load(p.id).catch(function () {}); }));
    });
    return readyPromise;
  }
  var scriptsPromise = null;
  function scripts() {
    if (scriptsPromise) return scriptsPromise;
    scriptsPromise = ready().then(function () {
      return PACKS.reduce(function (chain, p) {
        return p.js ? chain.then(function () { return loadScript(p.id + "/js/" + p.id + ".js"); }) : chain;
      }, Promise.resolve());
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
  function stage(packId, compId, demoId) {
    var hit = demo(packId, compId, demoId);
    if (!hit) return null;
    var p = byId[packId];
    var el = document.createElement("div");
    el.className = ["wstage"].concat(hit.demo.classes).join(" ");
    el.setAttribute("style", p.root + (p.canvas ? ";" + p.canvas : ""));
    el.innerHTML = scopeIcons(hit.demo.html, packId);
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
