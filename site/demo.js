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

  var reportRaf = 0;
  function reportNow() {
    reportRaf = 0;
    var h = Math.ceil(document.body.getBoundingClientRect().height);
    parent.postMessage({ type: "demo-size", h: h }, "*");
  }
  function report() {
    if (!reportRaf) reportRaf = requestAnimationFrame(reportNow);
  }

  // Placeholder links in demos (href="#") would jump this frame to its top.
  document.addEventListener("click", function (e) { var a = e.target.closest && e.target.closest('a[href="#"]'); if (a) e.preventDefault(); });

  fetch(base).then(function (r) { if (!r.ok) throw new Error(r.status); return r.text(); }).then(function (text) {
    var doc = new DOMParser().parseFromString(text, "text/html");
    // DOMParser documents run without scripting, so <noscript> fallbacks parse as real elements: skip them.
    // Web fonts stay non-blocking (media="print" until loaded) so a stalled font host never blanks the frame;
    // the pack's own stylesheets apply at once.
    doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], style').forEach(function (n) {
      if (n.closest("noscript")) return;
      var copy = document.importNode(n, true);
      if (n.getAttribute("href")) copy.setAttribute("href", new URL(n.getAttribute("href"), base).href);
      if (copy.rel === "stylesheet") {
        copy.removeAttribute("onload");
        if (/fonts\.googleapis\.com/.test(copy.href)) {
          copy.media = "print";
          copy.onload = function () { copy.media = "all"; report(); };
        } else copy.media = "all";
      }
      document.head.appendChild(copy);
    });
    var frameCss = document.createElement("style");
    frameCss.textContent = "html,body{margin:0;min-height:0!important}body{padding:16px!important;overflow:hidden}.demo__stage{margin:0}";
    document.head.appendChild(frameCss);

    var symbol = doc.body.querySelector("svg symbol");
    if (symbol) document.body.appendChild(document.importNode(symbol.closest("svg"), true));

    var safeId = /^[a-z0-9_-]+$/i;
    var demo = (safeId.test(c || "") && safeId.test(d || ""))
      ? doc.querySelector('[data-component="' + c + '"] [data-demo="' + d + '"]')
      : null;
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
      // Some packs restore a saved appearance onto <html> when their script loads (Atelier does);
      // the theme / variant this frame was asked for wins.
      s.onload = function () { ATTRS.forEach(function (a) { if (q.get(a)) root.setAttribute("data-" + a, q.get(a)); }); };
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
