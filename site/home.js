/* Homepage behaviour (site chrome only). */
(function () {
  /* Header gains a frosted background once the page scrolls. */
  var top = document.querySelector(".top");
  function onScroll() { top.classList.toggle("is-scrolled", window.scrollY > 8); }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* Scale fixed-size live pages (1280×800 frames, 360×470 specimens) to their containers. */
  function fit(view) {
    var iframe = view.querySelector("iframe");
    var base = parseFloat(iframe.getAttribute("width")) || 1280;
    iframe.style.transform = "scale(" + view.clientWidth / base + ")";
  }
  var views = document.querySelectorAll(".frame__view, .same__view");
  views.forEach(fit);
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { fit(e.target); }); });
    views.forEach(function (v) { ro.observe(v); });
  }

  /* Example / Styleguide switch in each browser frame. */
  document.querySelectorAll(".frame").forEach(function (frame) {
    var iframe = frame.querySelector("iframe"), url = frame.querySelector(".frame__url"), open = frame.querySelector(".frame__open");
    frame.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        frame.querySelectorAll(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var src = b.getAttribute("data-src");
        iframe.src = src;
        url.textContent = src;
        open.href = src;
      });
    });
  });

  /* Copy buttons: data-copy holds the text, or data-copy-from points at an element. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy], [data-copy-from]");
    if (!b) return;
    var text = b.getAttribute("data-copy") || (document.querySelector(b.getAttribute("data-copy-from")) || {}).textContent || "";
    var label = b.querySelector("span") || b;
    var original = label.textContent;
    function done(ok) {
      b.classList.toggle("is-copied", ok);
      label.textContent = ok ? "Copied" : "Copy failed";
      setTimeout(function () { label.textContent = original; b.classList.remove("is-copied"); }, 1600);
    }
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(false); });
    else {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var ok = false; try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
      ta.remove(); done(ok);
    }
  });
})();
