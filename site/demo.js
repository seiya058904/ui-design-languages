/* Site chrome — demo frame. Loads one demo stage from <pack>/components.html (the pack's own
   catalog of real components) and renders it with that pack's stylesheets, fonts, icon sprite and
   JS, at natural size. The parent page (components.html) sizes the iframe from the height this
   frame reports, and can switch theme / variants with a "demo-attrs" message. */
(function () {
  var q = new URLSearchParams(location.search);
  var p = q.get("p"), c = q.get("c"), d = q.get("d");
  var root = document.documentElement;
  var ATTRS = ["theme", "accent", "tone", "density", "contrast"];
  ATTRS.forEach(function (a) { if (q.get(a)) root.setAttribute("data-" + a, q.get(a)); });
  if (!/^[a-z]+$/.test(p || "")) return;
  var base = new URL("../" + p + "/components.html", location.href);

  function report() {
    var h = Math.ceil(document.body.getBoundingClientRect().height);
    parent.postMessage({ type: "demo-size", h: h }, "*");
  }

  fetch(base).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style').forEach(function (n) {
      var copy = document.importNode(n, true);
      if (n.getAttribute("href")) copy.setAttribute("href", new URL(n.getAttribute("href"), base).href);
      document.head.appendChild(copy);
    });
    var frameCss = document.createElement("style");
    frameCss.textContent = "html,body{margin:0;min-height:0!important}body{padding:16px!important;overflow:hidden}.demo__stage{margin:0}";
    document.head.appendChild(frameCss);

    var symbol = doc.body.querySelector("svg symbol");
    if (symbol) document.body.appendChild(document.importNode(symbol.closest("svg"), true));

    var demo = doc.querySelector('[data-component="' + c + '"] [data-demo="' + d + '"]');
    if (!demo) { document.body.textContent = "Demo not found."; report(); return; }
    var stage = document.importNode(demo.querySelector(".demo__stage"), true);
    if (demo.getAttribute("data-min-height")) stage.style.minHeight = demo.getAttribute("data-min-height") + "px";
    document.body.appendChild(stage);

    // Show dialogs open without stealing focus from the parent page; the button reopens them.
    if (demo.hasAttribute("data-open-dialog")) stage.querySelectorAll("dialog").forEach(function (dl) { dl.setAttribute("open", ""); });

    var src = doc.querySelector('script[src$="js/' + p + '.js"]');
    if (src) {
      var s = document.createElement("script");
      s.src = new URL(src.getAttribute("src"), base).href;
      document.body.appendChild(s);
    }
    if ("ResizeObserver" in window) new ResizeObserver(report).observe(document.body);
    report();
    if (document.fonts) document.fonts.ready.then(report);
  }).catch(function () {
    document.body.textContent = "Could not load " + p + "/components.html (open this site over http, not file://).";
    report();
  });

  window.addEventListener("message", function (e) {
    var m = e.data;
    if (!m || m.type !== "demo-attrs" || e.source !== parent) return;
    Object.keys(m.attrs || {}).forEach(function (a) {
      if (ATTRS.indexOf(a) === -1) return;
      if (m.attrs[a]) root.setAttribute("data-" + a, m.attrs[a]);
      else root.removeAttribute("data-" + a);
    });
    setTimeout(report, 50);
  });
})();
