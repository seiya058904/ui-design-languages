/* Homepage, component-wall and component-page chrome (site only, never a pack).
   #styles on the homepage shows full-page stills; #live and #same hydrate live interactive stages
   using site/wall.js once either section comes near the viewport (or the page is idle after load).

   UISite — shared by the homepage, the component wall and the component page (each loads this file first).
   UISite.copy(text)                   → Promise<boolean>: Clipboard API, or a hidden textarea when the API is
                                          missing or refuses (unfocused document, permissions policy, http)
   UISite.feedback(btn, result, okText) → shows "Copied" / "Failed" (or okText) on the button for 1.6s without
                                          changing its width, and announces the result in the page's one status
                                          region. Buttons labelled "Copy…" (and any [data-feedback="okText"]) reserve
                                          the room up front; any other button has its width pinned on first use.
   UISite.say(text)                     → announces text in that shared role="status" region
   UISite.ready()                       → Promise: resolves once the page's own content is in place (the wall
                                          replaces it with its own); scripts/snap.mjs waits on it
   UISite.theme(name?)                  → the site theme, "gallery" (dark, the default) or "booth" (grey); with a
                                          name, switches and remembers it. <html data-site-theme> is set before first
                                          paint. Each theme has its own hero: the gallery's moving wall, the booth's shelf. */
window.UISite = window.UISite || {};
(function (S) {
  function legacyCopy(text) {
    var ta = document.createElement("textarea"), active = document.activeElement, ok = false;
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;opacity:0;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    try { ok = document.execCommand("copy"); } catch (err) { ok = false; }
    ta.remove();
    if (active && active.focus) active.focus({ preventScroll: true });
    return ok;
  }
  S.copy = function (text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  };

  /* One polite live region per page, in place before anything is announced (a region added at the moment of
     speaking is often missed). Clearing first lets the same message be announced twice in a row. */
  var region = null, sayTimer = 0;
  function statusRegion() {
    if (region || !document.body) return region;
    region = document.querySelector("[data-site-status]");
    if (!region) {
      region = document.createElement("p");
      region.className = "sr-only";
      region.setAttribute("role", "status");
      region.setAttribute("data-site-status", "");
      document.body.appendChild(region);
    }
    return region;
  }
  S.say = function (text) {
    var el = statusRegion();
    if (!el) return;
    el.textContent = "";
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { el.textContent = text; }, 60);
  };

  /* The label reserves the width of its feedback text ([data-fb], site.css), so "Copy" → "Copied" never moves
     anything. A text-only button gets its text wrapped in a span first. */
  function prepare(btn, okText) {
    if (btn.__fb) return btn.__fb;
    var label = btn.querySelector("span");
    if (!label) {
      label = document.createElement("span");
      Array.prototype.slice.call(btn.childNodes).forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) label.appendChild(n); });
      btn.appendChild(label);
    }
    label.setAttribute("data-fb", okText || btn.getAttribute("data-feedback") || "Copied");
    label.setAttribute("data-fb-rest", label.textContent.trim());
    btn.__fb = { label: label, text: label.textContent };
    return btn.__fb;
  }
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>';
  S.feedback = function (btn, result, okText) {
    if (!btn.__fb) btn.style.minWidth = btn.getBoundingClientRect().width + "px"; // not prepared up front: pin today's width
    var fb = prepare(btn, okText), svg = btn.querySelector("svg");
    if (svg && btn.__svg == null) btn.__svg = svg.outerHTML;
    clearTimeout(btn.__feedbackTimer);
    return Promise.resolve(result).then(function (ok) {
      fb.label.textContent = ok ? okText || "Copied" : "Failed";
      var cur = btn.querySelector("svg");
      if (cur && btn.__svg) cur.outerHTML = ok ? CHECK_SVG : btn.__svg;
      btn.classList.toggle("is-copied", !!ok);
      btn.classList.toggle("is-failed", !ok);
      S.say(ok ? (okText || "Copied to clipboard") : "Copy failed");
      btn.__feedbackTimer = setTimeout(function () {
        fb.label.textContent = fb.text;
        var now = btn.querySelector("svg");
        if (now && btn.__svg) now.outerHTML = btn.__svg;
        btn.classList.remove("is-copied", "is-failed");
      }, 1600);
      return ok;
    });
  };
  /* Every copy button already on the page (outside live pack stages) reserves its room now. */
  function prepareAll() {
    statusRegion();
    Array.prototype.forEach.call(document.querySelectorAll("button"), function (b) {
      if (b.closest(".wstage, .same__inner")) return;
      var label = b.querySelector("span"), text = (label || b).textContent.trim();
      if (b.hasAttribute("data-feedback") || /^copy\b/i.test(text)) prepare(b);
    });
  }
  prepareAll(); // what is parsed so far (this file loads at the end of <body>), then whatever later scripts add
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", prepareAll);
  if (!S.ready) S.ready = function () { return Promise.resolve(); };
})(window.UISite);

(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var saveData = navigator.connection && navigator.connection.saveData;
  var root = document.documentElement;
  var themeHooks = []; // fn(name, heroInView, later): runs inside the theme swap; heavy work goes into later[]
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var idle = function (fn, timeout) { return window.requestIdleCallback ? requestIdleCallback(fn, { timeout: timeout || 1500 }) : setTimeout(fn, 200); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var topH = function () { return parseFloat(getComputedStyle(root).getPropertyValue("--top-h")) || 64; };

  /* Header gains a frosted background once the page scrolls (sentinel IntersectionObserver, zero scroll read). */
  var top = document.querySelector(".top");
  if (top) {
    if ("IntersectionObserver" in window) {
      var sent = document.createElement("div");
      sent.setAttribute("aria-hidden", "true");
      sent.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none";
      document.body.insertBefore(sent, document.body.firstChild);
      new IntersectionObserver(function (es) { top.classList.toggle("is-scrolled", !es[0].isIntersecting); }).observe(sent);
    } else {
      var onTopScroll = function () { top.classList.toggle("is-scrolled", window.scrollY > 8); };
      onTopScroll();
      window.addEventListener("scroll", onTopScroll, { passive: true });
    }
  }

  /* Copy buttons: data-copy holds the text, or data-copy-from points at an element. */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy], [data-copy-from]");
    if (!b) return;
    var text = b.getAttribute("data-copy") || (document.querySelector(b.getAttribute("data-copy-from")) || {}).textContent || "";
    UISite.feedback(b, UISite.copy(text));
  });

  /* ---------- Hero: the shelf and the specimen headline ----------
     Pointing at (or focusing) a book opens its cover; once the pointer rests on it, the headline cross-fades
     into that language's own type (packs.json site.label, via the book's data-type). Leaving puts them back. */
  var title = document.querySelector("[data-specimen]");
  var shelf = document.querySelector("[data-shelf]");
  var mobile = window.matchMedia ? window.matchMedia("(max-width: 760px)") : { matches: false };
  var boothShown = function () { return root.getAttribute("data-site-theme") !== "gallery"; };
  var fitted = {}; // spec → font-size that fits the column ("" when the spec fits as is)
  var typeShown = null, typeTimer = 0, swapTimer = 0;
  function fitSize() {
    var base = parseFloat(getComputedStyle(title).fontSize), w = title.clientWidth, ratio = 1;
    $$(":scope > span", title).forEach(function (line) { if (line.scrollWidth > 0) ratio = Math.min(ratio, w / line.scrollWidth); });
    return ratio < 1 ? (base * ratio * 0.995).toFixed(2) + "px" : "";
  }
  function fit(css) { // apply a spec, measuring it once per width
    var key = css || "";
    title.setAttribute("style", key);
    if (!(key in fitted)) fitted[key] = fitSize();
    if (fitted[key]) title.style.fontSize = fitted[key];
  }
  function refit() { // width or fonts changed: forget the sizes and fit only what is shown (the gallery hides it)
    if (!title || !boothShown()) return;
    fitted = {};
    fit(typeShown);
  }
  function warmFits() { // measure every book's spec ahead of the first hover, in one go (no paint in between)
    if (!title || !shelf || !boothShown() || mobile.matches) return;
    var shown = title.getAttribute("style") || "";
    $$(":scope > li > a", shelf).forEach(function (a) {
      var key = a.getAttribute("data-type") || "";
      if (key in fitted) return;
      title.setAttribute("style", key);
      fitted[key] = fitSize();
    });
    title.setAttribute("style", shown);
  }
  function swapType(css) {
    if (!title || css === typeShown) return;
    typeShown = css;
    clearTimeout(swapTimer);
    if (reduce) { fit(css); return; }
    title.classList.add("is-swapping"); // out over --dur-1, then the new face comes in over --dur-2
    swapTimer = setTimeout(function () { fit(typeShown); title.classList.remove("is-swapping"); }, 140);
  }
  function setType(css, now) { // a resting pointer swaps after 120ms; focus, touch and leaving swap at once
    clearTimeout(typeTimer);
    if (now) swapType(css); else typeTimer = setTimeout(function () { swapType(css); }, 120);
  }
  if (title) {
    refit();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    window.addEventListener("resize", function () { requestAnimationFrame(refit); }, { passive: true });
  }

  var shelfSet, shelfReady = new Promise(function (r) { shelfSet = r; });
  if (shelf) {
    var slots = $$(":scope > li", shelf), covers = $$("img[data-src]", shelf), openIdx = -1, closeTimer = 0, intentTimer = 0;
    var coversLoaded = false, fitsWarm = false;
    var loadCovers = function () {
      if (coversLoaded) return;
      coversLoaded = true;
      covers.forEach(function (img) {
        var set = img.getAttribute("data-srcset");
        if (set) { img.srcset = set; img.removeAttribute("data-srcset"); }
        img.src = img.getAttribute("data-src");
        img.removeAttribute("data-src");
        if (img.decode) img.decode().catch(function () {});
      });
    };
    function layoutShelf() { // whole pixels only: no blurry spines, no hairline seams
      if (mobile.matches) return;
      var W = shelf.clientWidth;
      if (!W) return;
      var N = slots.length, gap = 8;
      var openW = Math.min(556, Math.max(300, Math.round(W * 0.42)));
      var spineStep = (W - openW) / (N - 1);
      var spineW = Math.round(spineStep - gap);
      var closedW = (W - (N - 1) * gap) / N;
      shelf.style.setProperty("--open-w", openW + "px");
      shelf.style.setProperty("--spine-w", spineW + "px");
      for (var i = 0; i < N; i++) {
        var li = slots[i];
        var x, clipR, y = 0, spineShift = 0;
        if (openIdx < 0) {
          x = i * (closedW + gap);
          clipR = openW - closedW;
          spineShift = (closedW - spineW) / 2;
        } else {
          x = i <= openIdx ? i * (spineStep) : openW + gap + (i - 1) * spineStep;
          clipR = i === openIdx ? -12 : (openW - spineW);
          y = i === openIdx ? -10 : 0;
        }
        li.style.zIndex = String(i === openIdx ? N + 3 : i + 1);
        li.style.setProperty("--x", Math.round(x) + "px");
        li.style.setProperty("--y", y + "px");
        var book = li.firstElementChild;
        if (book) book.style.clipPath = "inset(-12px " + Math.round(clipR) + "px -18px -12px)";
        var spine = book && book.querySelector(".book__spine");
        if (spine) spine.style.transform = "translate3d(" + Math.round(spineShift) + "px,0,0)";
        li.classList.toggle("is-open", i === openIdx);
      }
    }
    var openSlot = function (li, now) {
      clearTimeout(closeTimer);
      var idx = li ? slots.indexOf(li) : -1;
      if (idx === openIdx) return;
      if (idx >= 0) loadCovers();
      openIdx = idx;
      layoutShelf();
      setType(li ? li.firstElementChild.getAttribute("data-type") : null, now || !li);
    };
    var settle = function () {
      layoutShelf();
      if (shelf.classList.contains("is-set")) return;
      shelf.classList.add("is-set");
      shelfSet();
      setTimeout(function () { shelf.classList.add("is-settled"); }, 900);
    };
    layoutShelf();
    if ("ResizeObserver" in window) {
      new ResizeObserver(function () { layoutShelf(); }).observe(shelf);
    } else {
      window.addEventListener("resize", layoutShelf, { passive: true });
    }
    // The books are set on the shelf once the faces are in, but never more than 150ms after this point.
    if (reduce) settle();
    else Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), wait(150)]).then(function () { requestAnimationFrame(settle); });

    // Scrolling past the shelf with the pointer on it is not pointing at a book: pause only briefly right after scroll.
    var lastScroll = -1e4;
    window.addEventListener("scroll", function () { lastScroll = performance.now(); }, { passive: true });
    var tryOpen = function (li) {
      if (mobile.matches) return;
      var still = performance.now() - lastScroll;
      if (still < 90) { intentTimer = setTimeout(function () { tryOpen(li); }, 100 - still); return; }
      openSlot(li);
    };
    slots.forEach(function (li) {
      li.addEventListener("pointerenter", function (e) {
        if (mobile.matches || e.pointerType === "touch") return;
        if (!fitsWarm) { fitsWarm = true; idle(warmFits, 100); } // off the hover's own frame
        clearTimeout(intentTimer);
        clearTimeout(closeTimer);
        if (performance.now() - lastScroll < 90) {
          intentTimer = setTimeout(function () { tryOpen(li); }, 95);
        } else {
          openSlot(li);
        }
      });
    });
    shelf.addEventListener("pointerleave", function (e) {
      if (mobile.matches || e.pointerType === "touch") return;
      clearTimeout(intentTimer);
      clearTimeout(typeTimer);
      closeTimer = setTimeout(function () { openSlot(null); }, 160);
    });
    shelf.addEventListener("focusin", function (e) { var li = e.target.closest("li"); if (li && !mobile.matches) openSlot(li, true); });
    shelf.addEventListener("focusout", function (e) { if (!shelf.contains(e.relatedTarget)) openSlot(null); });
    // Touch on the wide shelf (no hover to preview with): the first tap opens a book, a second tap on it follows
    // the link. What was open is noted when the touch begins, before the tap's own focus opens the book.
    var tapOpen = null;
    shelf.addEventListener("pointerdown", function (e) { if (e.pointerType === "touch" || e.pointerType === "pen") tapOpen = openIdx; }, { passive: true });
    shelf.addEventListener("click", function (e) {
      var book = e.target.closest && e.target.closest(".book"), was = tapOpen;
      tapOpen = null;
      if (!book || was === null || mobile.matches) return;
      if (slots.indexOf(book.parentNode) !== was) { e.preventDefault(); openSlot(book.parentNode, true); }
    });
    document.addEventListener("pointerdown", function (e) {
      if (openIdx >= 0 && e.pointerType === "touch" && !mobile.matches && !shelf.contains(e.target)) openSlot(null);
    }, { passive: true });

    // Covers arrive immediately whenever the booth is shown (or idle), so the first hover never pops in blank;
    // the other headline specs are measured while the page is idle too.
    window.addEventListener("load", function () { idle(function () { if (boothShown()) { loadCovers(); if (!fitsWarm) { fitsWarm = true; warmFits(); } } }, 1200); });
    themeHooks.push(function (name, heroInView, later) {
      if (name === "gallery") return;
      loadCovers();
      var replay = !reduce && heroInView;
      if (replay) shelf.classList.remove("is-set", "is-settled"); // the books wait for their entrance
      later.push(function () {
        // Place the books where they belong without sliding there (the shelf was hidden: no geometry yet).
        shelf.classList.add("is-placing");
        layoutShelf();
        void shelf.offsetWidth;
        shelf.classList.remove("is-placing");
        refit();
        if (replay) {
          shelf.classList.add("is-set");
          setTimeout(function () { shelf.classList.add("is-settled"); }, 900);
        }
      });
    });
    if (boothShown()) loadCovers();

    var ioMobile = null;
    var setupMobileShelf = function () {
      if (!mobile.matches) {
        if (ioMobile) { ioMobile.disconnect(); ioMobile = null; }
        layoutShelf();
        return;
      }
      if (boothShown()) loadCovers();
      if ("IntersectionObserver" in window && !ioMobile) {
        ioMobile = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) setType(e.target.firstElementChild.getAttribute("data-type"), true); });
        }, { root: shelf, rootMargin: "0px -45% 0px -45%" });
        var armed = false;
        shelf.addEventListener("scroll", function () { if (armed || !ioMobile) return; armed = true; slots.forEach(function (li) { ioMobile.observe(li); }); }, { passive: true });
      }
    };
    setupMobileShelf();
    if (mobile.addEventListener) mobile.addEventListener("change", function () { openSlot(null); setupMobileShelf(); });
  } else {
    shelfSet();
  }

  /* ---------- Gallery hero: the moving wall ----------
     The headline's words rise one after another, the copy follows, and the wall of real page renders is
     made from its template — only while the gallery theme is on (the booth never downloads it). */
  var wallHero = document.querySelector("[data-hero-wall]");
  var wallSlot = null;
  if (wallHero) {
    wallSlot = wallHero.querySelector("[data-wall]");
    var wallTpl = document.getElementById("wall-tpl");
    var wallHeads = $$(".reveal-words", wallHero), wallRises = $$(".rise", wallHero);
    if (!reduce) wallHeads.forEach(function (el) {
      var i = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (n) {
          if (n.nodeType === 3) {
            var frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach(function (part) {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
              var w = document.createElement("span"), inner = document.createElement("span");
              w.className = "w"; inner.textContent = part; inner.style.setProperty("--i", i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.parentNode.replaceChild(frag, n);
          } else if (n.nodeType === 1) walk(n);
        });
      })(el);
    });
    var fillWall = function () { if (wallTpl && wallSlot && !wallSlot.firstElementChild) wallSlot.appendChild(wallTpl.content.cloneNode(true)); };
    var reveal = function () {
      wallHeads.forEach(function (el) { el.classList.add("is-revealed"); });
      wallRises.forEach(function (el) { el.classList.add("is-in"); });
    };
    var startWall = function () { if (root.getAttribute("data-site-theme") !== "gallery") return; fillWall(); reveal(); };
    // The entrance waits for the headline's face, but never more than 120ms; the hidden state gets one frame first.
    var startSoon = function () { requestAnimationFrame(function () { requestAnimationFrame(startWall); }); };
    var faceReady = !document.fonts || !document.fonts.check || document.fonts.check('600 16px "Geist"');
    if (reduce) startWall();
    else if (faceReady) startSoon();
    else Promise.race([document.fonts.ready, wait(120)]).then(startSoon);
    themeHooks.push(function (name, heroInView, later) {
      if (name !== "gallery") return;
      fillWall();
      if (reduce || !heroInView) { reveal(); return; } // off-screen: no replay, just the final state
      wallHeads.concat(wallRises).forEach(function (el) { el.classList.remove("is-revealed", "is-in"); });
      later.push(function () { void wallHero.offsetWidth; reveal(); });
    });
  }

  /* ---------- Languages: one viewer, nine entries ----------
     Without script every language is a section of its own; with it the index becomes a tab list and only
     the selected language is shown. Books and #<id> links select a language before the page scrolls to it. */
  var viewer = document.querySelector("[data-viewer]");
  var picks = viewer ? $$("[data-pick]", viewer) : [];
  var panels = viewer ? $$(".show", viewer) : [];
  var current = null;
  function select(id, focus) {
    var panel = document.getElementById(id);
    if (!panel || panels.indexOf(panel) < 0) return false;
    current = id;
    picks.forEach(function (a) {
      var on = a.getAttribute("data-pick") === id;
      a.setAttribute("aria-selected", String(on));
      a.tabIndex = on ? 0 : -1;
      if (on && focus) a.focus();
      if (on && a.parentNode.scrollWidth > a.parentNode.clientWidth) {
        var p = a.parentNode, l = a.offsetLeft - (p.clientWidth - a.offsetWidth) / 2;
        p.scrollTo({ left: l, behavior: reduce ? "auto" : "smooth" });
      }
    });
    panels.forEach(function (s) { s.classList.toggle("is-active", s === panel); });
    return true;
  }
  if (viewer && picks.length) {
    var list = viewer.querySelector("[data-viewer-index]");
    var tablet = window.matchMedia ? window.matchMedia("(max-width: 1100px)") : { matches: false };
    var syncOri = function () { list.setAttribute("aria-orientation", tablet.matches ? "horizontal" : "vertical"); };
    list.setAttribute("role", "tablist");
    syncOri();
    if (tablet.addEventListener) tablet.addEventListener("change", syncOri);
    picks.forEach(function (a) {
      var id = a.getAttribute("data-pick");
      a.id = "tab-" + id;
      a.setAttribute("role", "tab");
      a.setAttribute("aria-controls", id);
      var panel = document.getElementById(id);
      if (panel) {
        panel.setAttribute("data-name", panel.getAttribute("aria-label") || ""); // the frames below still need it
        panel.setAttribute("role", "tabpanel");
        panel.setAttribute("aria-labelledby", a.id);
        panel.removeAttribute("aria-label");
      }
      a.addEventListener("click", function (e) {
        e.preventDefault();
        select(id);
        if (history.replaceState) history.replaceState(null, "", "#" + id);
        var r = viewer.getBoundingClientRect(), h = topH();
        if (r.top < h + 12 && window.UIScroll) UIScroll.to(window.scrollY + r.top - h - 20);
      });
    });
    list.addEventListener("keydown", function (e) {
      var i = picks.indexOf(document.activeElement);
      if (i < 0) return;
      var n = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key], j = -1;
      if (n) j = (i + n + picks.length) % picks.length;
      else if (e.key === "Home") j = 0;
      else if (e.key === "End") j = picks.length - 1;
      if (j < 0) return;
      e.preventDefault();
      var nextId = picks[j].getAttribute("data-pick");
      select(nextId, true);
      if (history.replaceState) history.replaceState(null, "", "#" + nextId);
    });
    viewer.classList.add("is-ready");
    var fromHash = function () { var h = decodeURIComponent(location.hash.slice(1)); return h && select(h); };
    if (!fromHash()) select(picks[0].getAttribute("data-pick"));
    else requestAnimationFrame(function () { document.getElementById(current).scrollIntoView(); });
    window.addEventListener("hashchange", fromHash);
    // A book (or any #<id> link) selects its language first, so the page can scroll to a visible panel.
    document.addEventListener("click", function (e) {
      if (e.defaultPrevented) return;
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && !a.hasAttribute("data-pick")) select(decodeURIComponent(a.getAttribute("href").slice(1)));
    });
  }

  /* Each frame is a still of a live page and a link to it: Example / Styleguide swap the still. */
  $$(".frame").forEach(function (frame) {
    var view = frame.querySelector(".frame__view"), shot = frame.querySelector(".frame__shot");
    var url = frame.querySelector(".frame__url"), openLink = frame.querySelector(".frame__open");
    var hint = frame.querySelector(".frame__hint");
    var show = frame.closest(".show");
    var showName = show ? show.getAttribute("data-name") || show.getAttribute("aria-label") || "" : "";
    function thumbBase(src) { return "site/assets/thumbs/" + src.replace(/\//g, "-").replace(/\.html$/, ""); }
    $$(".seg button", frame).forEach(function (b) {
      var warmAlt = function () {
        var name = thumbBase(b.getAttribute("data-src"));
        var pre = new Image();
        pre.src = name + "-lg.jpg";
      };
      b.addEventListener("pointerenter", warmAlt, { once: true });
      b.addEventListener("focus", warmAlt, { once: true });
      b.addEventListener("click", function () {
        if (b.getAttribute("aria-pressed") === "true") return;
        $$(".seg button", frame).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var src = b.getAttribute("data-src"), name = thumbBase(src);
        var isGuide = b.textContent.trim().toLowerCase() === "styleguide";
        var nextSrcset = name + ".jpg 640w, " + name + "-lg.jpg 1280w";
        if (!reduce) shot.classList.add("is-swapping");
        var doneSwap = function () { shot.classList.remove("is-swapping"); };
        shot.addEventListener("load", doneSwap, { once: true });
        shot.addEventListener("error", doneSwap, { once: true });
        shot.srcset = nextSrcset;
        shot.src = name + ".jpg";
        if (shot.complete) doneSwap();
        shot.alt = showName + (isGuide ? " styleguide" : " example page");
        view.setAttribute("aria-label", "Open the " + showName + (isGuide ? " styleguide" : " example page"));
        if (hint && hint.firstChild && hint.firstChild.nodeType === 3) hint.firstChild.textContent = isGuide ? "Open live styleguide " : "Open live example ";
        view.href = openLink.href = src;
        url.textContent = src;
      });
    });
  });

  /* Clickable color swatches: copy the hex value on click with instant tooltip feedback. */
  document.addEventListener("click", function (e) {
    var sw = e.target.closest && e.target.closest(".swatches .swatch[data-hex]");
    if (!sw) return;
    var hex = sw.getAttribute("data-hex");
    UISite.copy(hex).then(function (ok) {
      UISite.say(ok ? "Copied " + hex : "Copy failed");
      if (!ok) return;
      clearTimeout(sw.__copyTimer);
      sw.classList.add("is-copied");
      sw.__copyTimer = setTimeout(function () { sw.classList.remove("is-copied"); }, 1400);
    });
  });

  /* Keep what the reader is looking at in place while work above it changes heights: the first section, tile
     or card starting below the header is measured before and after, and the page scrolls by the difference. */
  function keepPlace(work) {
    var h = topH(), anchor = null, before = 0;
    var marks = $$("main > section, [data-tray] > li, .same figure");
    for (var i = 0; i < marks.length; i++) {
      var r = marks[i].getBoundingClientRect();
      if (r.height && r.top >= h) { anchor = marks[i]; before = r.top; break; }
    }
    work();
    if (!anchor) return;
    var d = anchor.getBoundingClientRect().top - before;
    if (Math.abs(d) > 0.5) window.scrollBy({ top: d, behavior: "instant" });
  }

  /* Hydrate #live (#tray) and #same ([data-compare]) into live interactive stages when UIWall is present: as soon
     as either section is within one viewport, or once the page is idle after load, whichever comes first. Still
     and stage share one box (site.css), so the swap moves nothing; keepPlace() guards the rest. */
  var trayItems = $$("[data-tray] > li[data-pick]");
  var cmpViews = $$("[data-compare]");
  var liveHomeReady = Promise.resolve(), startLive = null;
  if ((trayItems.length || cmpViews.length) && window.UIWall) {
    var liveGate = new Promise(function (r) { startLive = r; });
    liveHomeReady = liveGate.then(function () { return UIWall.ready(); }).then(function () {
      var offscreenTargets = [];
      function attachSpot(host, stage) {
        var spot = document.createElement("span"), dot = document.createElement("i");
        spot.className = "stage-spot";
        spot.setAttribute("aria-hidden", "true");
        spot.appendChild(dot);
        stage.appendChild(spot);
        host.__spotStage = stage;
        host.__spotDot = dot;
      }
      var jobs = [];
      trayItems.forEach(function (li) {
        jobs.push(function () {
          var pick = (li.getAttribute("data-pick") || "").split("/");
          var stageHost = li.querySelector(".tray__stage");
          if (pick.length !== 3 || !stageHost) return;
          var st = UIWall.stage(pick[0], pick[1], pick[2]);
          if (!st) return;
          var pack = UIWall.byId && UIWall.byId[pick[0]];
          if (pack && pack.dot) li.style.setProperty("--pc", pack.dot);
          attachSpot(li, st);
          stageHost.innerHTML = "";
          stageHost.appendChild(st);
          offscreenTargets.push(li);
        });
      });
      cmpViews.forEach(function (view) {
        jobs.push(function () {
          var packId = view.getAttribute("data-compare");
          var st = UIWall.stage(packId, "compare", "weekly-report");
          if (!st) return;
          attachSpot(view.closest("figure") || view, st);
          var badge = view.querySelector(".same__badge");
          view.innerHTML = "";
          view.appendChild(st);
          if (badge) view.appendChild(badge);
          offscreenTargets.push(view);
        });
      });
      // Two stages per task, then yield: each task styles and lays out only what it added, so no long task
      // blocks input while twenty live stages arrive.
      var pause = function () { return window.scheduler && scheduler.yield ? scheduler.yield() : wait(0); };
      var build = function () {
        if (!jobs.length) return Promise.resolve();
        keepPlace(function () { jobs.splice(0, 2).forEach(function (job) { job(); }); });
        return pause().then(build);
      };
      return build().then(function () { return offscreenTargets; });
    }).then(function (offscreenTargets) {
      if (!reduce && window.matchMedia && window.matchMedia("(hover: hover)").matches) {
        var spotHost = null, spotRect = null, spotEv = null, spotRaf = 0;
        var clearSpotRect = function () { spotRect = null; };
        window.addEventListener("scroll", clearSpotRect, { passive: true });
        window.addEventListener("resize", clearSpotRect, { passive: true });
        [document.querySelector("[data-tray]"), document.querySelector(".same")].forEach(function (container) {
          if (!container) return;
          container.addEventListener("pointermove", function (e) {
            var host = e.target.closest && e.target.closest(".tray__item, .same figure");
            if (!host || !host.__spotDot) return;
            if (host !== spotHost) { spotHost = host; spotRect = null; }
            spotEv = e;
            if (spotRaf) return;
            spotRaf = requestAnimationFrame(function () {
              spotRaf = 0;
              if (!spotHost || !spotEv || !spotHost.__spotStage) return;
              if (!spotRect) spotRect = spotHost.__spotStage.getBoundingClientRect();
              spotHost.__spotDot.style.transform = "translate3d(" + Math.round(spotEv.clientX - spotRect.left) + "px," + Math.round(spotEv.clientY - spotRect.top) + "px,0)";
            });
          }, { passive: true });
          container.addEventListener("pointerleave", function () { spotHost = null; spotRect = null; });
        });
      }
      if ("IntersectionObserver" in window && offscreenTargets.length) {
        var offIo = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.target.classList.toggle("is-offscreen", !e.isIntersecting); });
        }, { rootMargin: "200px 0px" });
        offscreenTargets.forEach(function (el) { offIo.observe(el); });
      }
      return UIWall.scripts();
    });
    var liveSecs = [document.getElementById("live"), document.getElementById("same")].filter(Boolean);
    if ("IntersectionObserver" in window && liveSecs.length) {
      var liveIo = new IntersectionObserver(function (es) {
        if (es.some(function (e) { return e.isIntersecting; })) { liveIo.disconnect(); startLive(); }
      }, { rootMargin: "100% 0px" });
      liveSecs.forEach(function (s) { liveIo.observe(s); });
    } else startLive();
    window.addEventListener("load", function () { idle(startLive, 4000); });
  }
  if (shelf || trayItems.length || cmpViews.length) {
    UISite.ready = function () { if (startLive) startLive(); return Promise.all([shelfReady, liveHomeReady]); };
  }

  /* Stills further up (#styles) are fetched and decoded while the page is idle. */
  if (viewer && !saveData) {
    var warm = function () {
      var queue = $$(".show.is-active .frame__shot").filter(function (img) { return img.loading === "lazy"; });
      (function next() {
        var img = queue.shift();
        if (!img) return;
        img.loading = "eager";
        (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () { idle(next, 1500); });
      })();
    };
    window.addEventListener("load", function () { idle(warm, 3000); });
  }

  /* ---------- "Same markup" ---------- */
  /* The code line above the cards follows the card you rest on (150ms) or focus: same markup, another prefix. */
  var code = document.querySelector(".same-code");
  var currentPrefix = "clay";
  if (code) {
    var showPrefix = function (fig) {
      if (!fig) return;
      currentPrefix = fig.getAttribute("data-prefix") || "clay";
      $$("[data-prefix]", code).forEach(function (b) { b.textContent = currentPrefix; });
      code.style.setProperty("--pc", "color-mix(in srgb, " + fig.style.getPropertyValue("--pc") + " 72%, #fff)");
    };
    var dwell = 0;
    $$(".same figure").forEach(function (fig) {
      fig.addEventListener("pointerenter", function () { clearTimeout(dwell); dwell = setTimeout(function () { showPrefix(fig); }, 150); });
      fig.addEventListener("pointerleave", function () { clearTimeout(dwell); });
      fig.addEventListener("focusin", function () { clearTimeout(dwell); showPrefix(fig); });
    });
    showPrefix(document.querySelector(".same figure"));
    var sameCopy = code.querySelector("[data-same-copy]");
    if (sameCopy) {
      sameCopy.addEventListener("click", function () {
        var snippet = '<button class="' + currentPrefix + '-btn ' + currentPrefix + '-btn--primary">Schedule</button>';
        UISite.feedback(sameCopy, UISite.copy(snippet));
      });
    }
  }
  /* Light / dark switches the live pack themes on every stage of the page (or swaps the stills if unhydrated). */
  var sameGrid = document.querySelector(".same");
  $$("[data-theme-pick]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dark = b.getAttribute("data-theme-pick") === "dark";
      $$("[data-theme-pick]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (sameGrid) sameGrid.classList.toggle("is-dark", dark);
      if (window.UIWall && UIWall.setTheme) UIWall.setTheme(dark ? "dark" : "light");
      $$(".same__view img[data-dark]").forEach(function (img) {
        if (!img.__light) img.__light = img.getAttribute("src");
        img.loading = "eager";
        img.src = dark ? img.getAttribute("data-dark") : img.__light;
      });
    });
  });

  /* ---------- Scroll-spy for homepage section nav links (aria-current; the last link once the page ends) ---------- */
  var spyLinks = $$('.top nav a[href^="#"]').map(function (a) {
    var id = a.getAttribute("href").slice(1);
    var sec = document.getElementById(id);
    return sec ? { a: a, sec: sec } : null;
  }).filter(Boolean);
  if (spyLinks.length && "IntersectionObserver" in window) {
    var visibleSecs = new Set(), atEnd = false;
    var markSpy = function () {
      var hit = atEnd ? spyLinks[spyLinks.length - 1] : spyLinks.filter(function (x) { return visibleSecs.has(x.sec); })[0];
      spyLinks.forEach(function (x) {
        var on = !!hit && x === hit;
        x.a.classList.toggle("is-current", on);
        if (on) x.a.setAttribute("aria-current", "true"); else x.a.removeAttribute("aria-current");
      });
    };
    var spyIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) visibleSecs.add(e.target); else visibleSecs.delete(e.target);
      });
      markSpy();
    }, { rootMargin: "-25% 0px -55% 0px" });
    spyLinks.forEach(function (x) { spyIo.observe(x.sec); });
    var foot = document.querySelector(".foot");
    if (foot) new IntersectionObserver(function (es) { atEnd = es[0].isIntersecting; markSpy(); }).observe(foot);
  }

  /* ---------- Site theme: grey (booth) ⇄ dark (gallery) ----------
     The toggle keeps one name ("Dark theme") and reports its state with aria-pressed; the title says what a press
     does. The swap keeps the reader's place (the two heroes differ in height) and leaves layout work to the next
     frame, so the view transition starts at once. */
  var KEY = "uidl-site-theme", meta = document.querySelector('meta[name="theme-color"]');
  function themeNow() { return root.getAttribute("data-site-theme") === "gallery" ? "gallery" : "booth"; }
  function syncTheme() {
    var dark = themeNow() === "gallery";
    $$("[data-site-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(dark));
      b.setAttribute("aria-label", "Dark theme");
      b.title = dark ? "Switch to grey theme" : "Switch to dark theme";
    });
    if (meta) meta.setAttribute("content", dark ? "#0F0F11" : "#E6E5E0");
  }
  function readingAnchor() { // the first section still showing below the header
    var h = topH(), secs = $$("main > section");
    for (var i = 0; i < secs.length; i++) {
      var r = secs[i].getBoundingClientRect();
      if (r.height && r.bottom > h + 1) return { el: secs[i], top: r.top, hero: secs[i].hasAttribute("data-hero") };
    }
    return null;
  }
  function setTheme(name, save) {
    if (save) { try { localStorage.setItem(KEY, name); } catch (e) { /* storage blocked: this visit only */ } }
    if (name === themeNow()) return;
    var anchor = readingAnchor(), heroInView = !anchor || anchor.hero, later = [];
    var swap = function () {
      root.setAttribute("data-site-theme", name);
      syncTheme();
      themeHooks.forEach(function (fn) { fn(name, heroInView, later); });
    };
    var keep = function () { // one read after the swap, before the new view is shown
      if (!anchor || anchor.hero) return;
      var d = anchor.el.getBoundingClientRect().top - anchor.top;
      if (Math.abs(d) > 0.5) window.scrollBy({ top: d, behavior: "instant" });
    };
    var finish = function () {
      requestAnimationFrame(function () {
        later.forEach(function (fn) { fn(); });
        // The two themes set type in different faces: fit the headline again once the new one has arrived.
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
      });
    };
    if (document.startViewTransition && !reduce) {
      var vt = document.startViewTransition(swap);
      vt.updateCallbackDone.then(keep).then(finish, finish);
    } else {
      swap(); keep(); finish();
    }
  }
  UISite.theme = function (name) { if (name === "booth" || name === "gallery") setTheme(name, true); return themeNow(); };
  syncTheme();
  /* The other theme's faces are fetched while idle after load (or when the toggle is approached), so a switch
     never waits on the network. */
  var otherWarm = false;
  var warmOther = function () {
    if (otherWarm || !document.fonts || !document.fonts.load) return;
    otherWarm = true;
    (themeNow() === "gallery"
      ? ['500 16px "Funnel Display"', '400 16px "Funnel Sans"', '500 16px "Funnel Sans"', '600 16px "Funnel Sans"']
      : ['400 16px "Geist"', '500 16px "Geist"', '600 16px "Geist"', '400 16px "Geist Mono"']
    ).forEach(function (f) { document.fonts.load(f).catch(function () {}); });
  };
  if (!saveData) window.addEventListener("load", function () { idle(warmOther, 3000); });
  $$("[data-site-theme-toggle]").forEach(function (b) {
    b.addEventListener("pointerenter", warmOther);
    b.addEventListener("focus", warmOther);
    b.addEventListener("click", function () { setTheme(themeNow() === "gallery" ? "booth" : "gallery", true); });
  });

  /* ---------- Gallery lighting: aurora pauses out of view; a soft light follows the pointer ---------- */
  if (reduce) return;
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.target.classList.toggle("is-paused", !e.isIntersecting); });
    }, { rootMargin: "120px 0px" });
    $$("[data-hero], .cw-hero").forEach(function (el) { pio.observe(el); });
  }
  /* The gallery hero's wall leans toward the pointer under a soft light. Both follow with time-based damping
     (the lean by 1 − e^(−9·dt), the light by 1 − e^(−18·dt): the same feel at any frame rate), self-stopping,
     with cached rects: no getBoundingClientRect() per pointermove, no CSS transition fighting the inline transform. */
  if (wallHero && window.matchMedia("(hover: hover)").matches) {
    var glow = document.createElement("div"), light = document.createElement("i");
    glow.className = "hero__glow"; glow.setAttribute("aria-hidden", "true");
    glow.appendChild(light);
    wallHero.insertBefore(glow, wallHero.firstChild);
    var hr = null, gr = null, tx = 0, ty = 0, cx = 0, cy = 0, lx = 0, ly = 0, gx = 0, gy = 0, rafId = 0, lastT = 0;
    var clearRects = function () { hr = null; gr = null; };
    window.addEventListener("resize", clearRects, { passive: true });
    window.addEventListener("scroll", clearRects, { passive: true });
    var stepHero = function (now) {
      rafId = 0;
      var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
      lastT = now;
      var kLean = 1 - Math.exp(-9 * dt), kLight = 1 - Math.exp(-18 * dt);
      cx += (tx - cx) * kLean; cy += (ty - cy) * kLean;
      gx += (lx - gx) * kLight; gy += (ly - gy) * kLight;
      var moving = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002 || Math.abs(lx - gx) > 0.5 || Math.abs(ly - gy) > 0.5;
      if (!moving) { cx = tx; cy = ty; gx = lx; gy = ly; lastT = 0; }
      var plane = wallSlot && wallSlot.querySelector(".wall__plane");
      if (plane) plane.style.transform = "translate3d(calc(-48% + " + (cx * -18).toFixed(1) + "px)," + (cy * -12).toFixed(1) + "px,0) perspective(1800px) rotateX(" + (16 - cy * 5).toFixed(2) + "deg) rotateZ(" + (14 + cx * 4).toFixed(2) + "deg)";
      light.style.transform = "translate3d(" + gx.toFixed(1) + "px," + gy.toFixed(1) + "px,0)";
      if (moving) rafId = requestAnimationFrame(stepHero);
    };
    wallHero.addEventListener("pointermove", function (e) {
      if (!hr) { hr = wallHero.getBoundingClientRect(); gr = glow.getBoundingClientRect(); }
      tx = Math.max(-1, Math.min(1, ((e.clientX - hr.left) / hr.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - hr.top) / hr.height) * 2 - 1));
      lx = Math.round(e.clientX - gr.left);
      ly = Math.round(e.clientY - gr.top);
      if (!glow.classList.contains("is-on")) { gx = lx; gy = ly; glow.classList.add("is-on"); } // fades in where the pointer is
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    }, { passive: true });
    wallHero.addEventListener("pointerleave", function () {
      tx = 0; ty = 0;
      glow.classList.remove("is-on");
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    });
  }
})();
