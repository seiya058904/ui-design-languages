/* Site chrome — "Code" toggle for styleguide specimens (React Bits–style preview + code).
   Not part of any Style Pack: it renders inside a Shadow DOM, so pack CSS can't style it and it
   can't leak into the pack. The code shown is the specimen's markup read from the page's own
   source file (the exact file users copy), so preview and code never drift. Offline (file://)
   it falls back to the live DOM with JS-added indicator state removed.

   <script src="../site/code-view.js" data-selector=".lilac-study > section" data-skip=".lilac-eyebrow"></script> */
(function () {
  var script = document.currentScript;
  var selector = script && script.getAttribute("data-selector");
  if (!selector) return;
  var skip = script.getAttribute("data-skip") || "";
  var targets = Array.prototype.slice.call(document.querySelectorAll(selector));
  var sourceDoc = null;

  function loadSource() {
    if (sourceDoc !== null) return Promise.resolve(sourceDoc);
    return fetch(location.href, { cache: "force-cache" })
      .then(function (r) { return r.ok ? r.text() : ""; })
      .catch(function () { return ""; })
      .then(function (text) {
        sourceDoc = text ? new DOMParser().parseFromString(text, "text/html") : false;
        return sourceDoc;
      });
  }

  function clean(node) {
    node.querySelectorAll("[data-code-view]").forEach(function (n) { n.remove(); });
    if (skip) node.querySelectorAll(skip).forEach(function (n) { n.remove(); });
    node.querySelectorAll("[class]").forEach(function (n) {
      n.classList.remove("has-indicator", "is-animated");
      if (!n.getAttribute("class")) n.removeAttribute("class");
    });
    node.querySelectorAll("[style]").forEach(function (n) {
      var keep = n.getAttribute("style").split(";").filter(function (d) { return d.trim() && !/--[a-z]+-indicator-/.test(d); });
      if (keep.length) n.setAttribute("style", keep.join(";")); else n.removeAttribute("style");
    });
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

  var CSS =
    ":host{display:block;margin-top:18px;font:500 12px/1.4 ui-sans-serif,system-ui,-apple-system,'Segoe UI',sans-serif;color:inherit}" +
    "button{font:inherit;cursor:pointer}" +
    ".toggle{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border:1px solid currentColor;border-radius:6px;background:transparent;color:inherit;opacity:.62}" +
    ".toggle:hover,.toggle[aria-expanded=true]{opacity:1}" +
    ".toggle:focus-visible,.copy:focus-visible{outline:2px solid #4c8dff;outline-offset:2px}" +
    ".panel{margin-top:10px;border-radius:10px;background:#15171c;color:#e6e7ea;overflow:hidden;text-align:left}" +
    ".bar{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid #2a2d35;color:#9aa0ab}" +
    ".copy{padding:4px 10px;border:1px solid #3a3e48;border-radius:6px;background:#22252c;color:#e6e7ea}" +
    ".copy:hover{background:#2c3039}" +
    "pre{margin:0;padding:14px 16px;max-height:360px;overflow:auto;font:12.5px/1.55 ui-monospace,'SF Mono',Consolas,'Liberation Mono',monospace;white-space:pre;tab-size:2}" +
    "[hidden]{display:none!important}";

  targets.forEach(function (el, index) {
    var host = document.createElement("div");
    host.setAttribute("data-code-view", "");
    var root = host.attachShadow({ mode: "open" });
    root.innerHTML =
      "<style>" + CSS + "</style>" +
      '<button class="toggle" type="button" aria-expanded="false">&lt;/&gt; Code</button>' +
      '<div class="panel" hidden><div class="bar"><span>HTML — uses this pack\'s CSS</span><button class="copy" type="button">Copy</button></div><pre><code></code></pre></div>';
    el.appendChild(host);

    var toggle = root.querySelector(".toggle");
    var panel = root.querySelector(".panel");
    var code = root.querySelector("code");
    var copy = root.querySelector(".copy");

    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      panel.hidden = !open;
      if (open && !code.textContent) {
        code.textContent = "Loading…";
        loadSource().then(function (doc) {
          var source = doc && doc.querySelectorAll(selector)[index];
          var node = clean((source || el).cloneNode(true));
          code.textContent = dedent(node.innerHTML);
        });
      }
    });

    copy.addEventListener("click", function () {
      var text = code.textContent;
      function done() { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy"; }, 1400); }
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(done, done);
      else {
        var range = document.createRange();
        range.selectNodeContents(code);
        var sel = root.getSelection ? root.getSelection() : window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        try { document.execCommand("copy"); } catch (err) { /* user can copy the selection */ }
        done();
      }
    });
  });
})();
