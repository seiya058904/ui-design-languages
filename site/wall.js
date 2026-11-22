/* Site chrome — live component engine shared by the homepage marquee and the component wall.
   It reads each pack's own catalog (<pack>/components.html), and renders real demos straight into
   this page: the five packs' CSS are linked in <head> (all classes are prefixed, so they coexist),
   their icon sprites are merged with per-pack ids, and their JS is loaded once. No screenshots,
   no iframes. Not part of any pack.

   UIWall.ready()            → Promise, resolves when catalogs, sprites and pack JS are in place
   UIWall.demo(pack, c, d)   → { component, demo } data or null
   UIWall.stage(pack, c, d)  → a live element (.wstage) for that demo
   UIWall.packs              → registry (name, dot color, display font, root type styles) */
(function () {
  var PACKS = [
    { id: "clay", fonts: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap", name: "Clay", dot: "#A8E6CF", font: "font-family:Inter,sans-serif;font-weight:700;letter-spacing:-0.045em",
      root: "font-family:var(--clay-font-family-sans);color:var(--clay-color-text);font-size:var(--clay-font-size-body);line-height:1.5", canvas: "", page: "background:var(--clay-color-board)" },
    { id: "lilac", fonts: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Manrope:wght@400;500;600;700&display=swap", name: "Lilac", dot: "#7C55FF", font: "font-family:'Cormorant Garamond',serif;font-weight:500;letter-spacing:0.04em;text-transform:uppercase",
      root: "font-family:var(--lilac-font-family-sans);color:var(--lilac-color-text);font-size:var(--lilac-font-size-body);line-height:1.5", canvas: "", page: "background:var(--lilac-color-canvas)" },
    { id: "atelier", fonts: "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,400..800&display=swap", name: "Atelier", dot: "#2F7BF5", font: "font-family:Archivo,sans-serif;font-weight:800;font-stretch:112%;text-transform:uppercase;letter-spacing:0",
      root: "font-family:var(--atelier-font-family-sans);color:var(--atelier-color-text);font-size:var(--atelier-font-size-body);line-height:1.5", canvas: "background:var(--atelier-color-canvas)", page: "background:var(--atelier-color-canvas)" },
    { id: "tactile", fonts: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap", name: "Tactile", dot: "#2C8C8F", font: "font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;letter-spacing:-0.04em",
      root: "font-family:var(--tactile-font-family-sans);color:var(--tactile-color-text);font-size:var(--tactile-font-size-body);line-height:1.5", canvas: "background:var(--tactile-color-surface)", page: "background:var(--tactile-color-surface)" },
    { id: "sketch", fonts: "https://fonts.googleapis.com/css2?family=Itim&family=Patrick+Hand&display=swap", name: "Sketch", dot: "#A9C7EC", font: "font-family:Itim,sans-serif;font-weight:400;letter-spacing:0",
      root: "font-family:var(--sketch-font-family-hand);color:var(--sketch-color-ink);font-size:var(--sketch-font-size-body);line-height:1.4", canvas: "", page: "background:var(--sketch-paper-grain),var(--sketch-color-paper)" }
  ];
  var byId = {};
  PACKS.forEach(function (p) { byId[p.id] = p; });
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
    readyPromise = Promise.all(PACKS.map(function (p) { return load(p.id).catch(function () {}); }));
    return readyPromise;
  }
  var scriptsPromise = null;
  function scripts() {
    if (scriptsPromise) return scriptsPromise;
    scriptsPromise = PACKS.reduce(function (chain, p) {
      return chain.then(function () { return loadScript(p.id + "/js/" + p.id + ".js"); });
    }, Promise.resolve()).then(resetAppearance);
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
