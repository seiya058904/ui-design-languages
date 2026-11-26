/* Homepage, component-wall and component-page chrome (site only, never a pack).
   #styles on the homepage shows full-page stills; #live and #same hydrate live interactive stages
   using site/wall.js once UISite.ready() waits for them.

   UISite — shared by the homepage and the component wall (both load this file first).
   UISite.copy(text)                   → Promise<boolean>: Clipboard API, or a hidden textarea when the API is
                                          missing or refuses (unfocused document, permissions policy, http)
   UISite.feedback(btn, result, okText) → shows "Copied" / "Copy failed" (or okText) on the button for 1.6s
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
  var CHECK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7"/></svg>';
  S.feedback = function (btn, result, okText) {
    var label = btn.querySelector("span") || btn;
    var svg = btn.querySelector("svg");
    if (btn.__label == null) btn.__label = label.textContent;
    if (svg && btn.__svg == null) btn.__svg = svg.outerHTML;
    clearTimeout(btn.__feedbackTimer);
    return Promise.resolve(result).then(function (ok) {
      label.textContent = ok ? okText || "Copied" : "Copy failed";
      if (ok && svg && btn.__svg) svg.outerHTML = CHECK_SVG;
      btn.classList.toggle("is-copied", !!ok);
      btn.classList.toggle("is-failed", !ok);
      btn.__feedbackTimer = setTimeout(function () {
        label.textContent = btn.__label;
        var curSvg = btn.querySelector("svg");
        if (curSvg && btn.__svg) curSvg.outerHTML = btn.__svg;
        btn.classList.remove("is-copied", "is-failed");
      }, 1600);
      return ok;
    });
  };
  if (!S.ready) S.ready = function () { return Promise.resolve(); };
})(window.UISite);

(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var root = document.documentElement;
  var themeHooks = []; // called after the site theme changes
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

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
     Pointing at (or focusing) a book opens its cover and sets the headline in that language's own type,
     taken from packs.json (site.label) via the book's data-type. Leaving the shelf puts the books back. */
  var title = document.querySelector("[data-specimen]");
  var shelf = document.querySelector("[data-shelf]");
  var mobile = window.matchMedia ? window.matchMedia("(max-width: 760px)") : { matches: false };
  var fittedSizes = {};
  function measureTitle(css) {
    if (!title) return "";
    title.setAttribute("style", css || "");
    var base = parseFloat(getComputedStyle(title).fontSize), w = title.clientWidth, ratio = 1;
    $$(":scope > span", title).forEach(function (line) { if (line.scrollWidth > 0) ratio = Math.min(ratio, w / line.scrollWidth); });
    return ratio < 1 ? (base * ratio * 0.995).toFixed(2) + "px" : "";
  }
  function fitAllTitles() {
    if (!title) return;
    var activeCss = typeShown || "";
    fittedSizes = {};
    var specs = [""];
    if (shelf) $$(":scope > li > a", shelf).forEach(function (a) { var t = a.getAttribute("data-type"); if (t && specs.indexOf(t) < 0) specs.push(t); });
    specs.forEach(function (css) { fittedSizes[css] = measureTitle(css); });
    title.setAttribute("style", activeCss);
    if (fittedSizes[activeCss]) title.style.fontSize = fittedSizes[activeCss];
  }
  function applyFittedTitle(css) {
    if (!title) return;
    var key = css || "";
    title.setAttribute("style", key);
    if (fittedSizes[key]) title.style.fontSize = fittedSizes[key];
  }
  function refit() {
    if (!title) return;
    fitAllTitles();
  }
  var typeShown = null;
  function setType(css) {
    if (!title || css === typeShown) return;
    typeShown = css;
    applyFittedTitle(css);
  }
  if (title) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    refit();
    window.addEventListener("resize", function () { requestAnimationFrame(refit); }, { passive: true });
  }

  var shelfSet, shelfReady = new Promise(function (r) { shelfSet = r; });
  if (shelf) {
    var slots = $$(":scope > li", shelf), covers = $$("img[data-src]", shelf), openIdx = -1, closeTimer = 0, intentTimer = 0;
    var coversLoaded = false;
    var loadCovers = function () {
      if (coversLoaded) return;
      coversLoaded = true;
      covers.forEach(function (img) {
        img.src = img.getAttribute("data-src");
        img.removeAttribute("data-src");
        if (img.decode) img.decode().catch(function () {});
      });
    };
    function layoutShelf() {
      if (mobile.matches) return;
      var W = shelf.clientWidth;
      if (!W) return;
      var N = slots.length, gap = 8;
      var openW = Math.min(556, Math.max(300, Math.round(W * 0.42)));
      var spineStep = (W - openW) / (N - 1);
      var spineW = spineStep - gap;
      var closedW = (W - (N - 1) * gap) / N;
      shelf.style.setProperty("--open-w", openW + "px");
      shelf.style.setProperty("--spine-w", spineW.toFixed(2) + "px");
      for (var i = 0; i < N; i++) {
        var li = slots[i];
        var x, clipR, y = 0, spineShift = 0;
        if (openIdx < 0) {
          x = i * (closedW + gap);
          clipR = openW - closedW;
          spineShift = (closedW - spineW) / 2;
        } else {
          x = i <= openIdx ? i * (spineW + gap) : openW + gap + (i - 1) * (spineW + gap);
          clipR = i === openIdx ? -12 : (openW - spineW);
          y = i === openIdx ? -10 : 0;
        }
        li.style.zIndex = String(i === openIdx ? N + 3 : i + 1);
        li.style.setProperty("--x", x.toFixed(2) + "px");
        li.style.setProperty("--y", y + "px");
        var book = li.firstElementChild;
        if (book) book.style.clipPath = "inset(-12px " + clipR.toFixed(2) + "px -18px -12px)";
        var spine = book && book.querySelector(".book__spine");
        if (spine) spine.style.transform = "translate3d(" + spineShift.toFixed(2) + "px,0,0)";
        li.classList.toggle("is-open", i === openIdx);
      }
    }
    var openSlot = function (li) {
      clearTimeout(closeTimer);
      var idx = li ? slots.indexOf(li) : -1;
      if (idx === openIdx) return;
      if (idx >= 0) loadCovers();
      openIdx = idx;
      layoutShelf();
      setType(li ? li.firstElementChild.getAttribute("data-type") : null);
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
    if (reduce) settle();
    else Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 400); })]).then(function () { requestAnimationFrame(settle); });

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
        clearTimeout(intentTimer);
        clearTimeout(closeTimer);
        if (performance.now() - lastScroll < 90) {
          intentTimer = setTimeout(function () { tryOpen(li); }, 95);
        } else {
          openSlot(li);
        }
      });
    });
    shelf.addEventListener("pointerleave", function () {
      if (mobile.matches) return;
      clearTimeout(intentTimer);
      closeTimer = setTimeout(function () { openSlot(null); }, 160);
    });
    shelf.addEventListener("focusin", function (e) { var li = e.target.closest("li"); if (li && !mobile.matches) openSlot(li); });
    shelf.addEventListener("focusout", function (e) { if (!shelf.contains(e.relatedTarget)) openSlot(null); });

    // Covers arrive immediately whenever the booth is shown (or idle), so the first hover never pops in blank.
    var shelfShown = function () { return root.getAttribute("data-site-theme") !== "gallery"; };
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 600); };
    window.addEventListener("load", function () { idle(function () { if (shelfShown()) loadCovers(); }, { timeout: 1200 }); });
    themeHooks.push(function () {
      if (!shelfShown()) return;
      loadCovers();
      layoutShelf();
      if (!reduce) {
        shelf.classList.remove("is-set", "is-settled");
        void shelf.offsetWidth;
        requestAnimationFrame(function () {
          layoutShelf();
          shelf.classList.add("is-set");
          setTimeout(function () { shelf.classList.add("is-settled"); }, 900);
        });
      }
    });
    if (shelfShown()) loadCovers();

    var ioMobile = null;
    var setupMobileShelf = function () {
      if (!mobile.matches) {
        if (ioMobile) { ioMobile.disconnect(); ioMobile = null; }
        layoutShelf();
        return;
      }
      if (shelfShown()) loadCovers();
      if ("IntersectionObserver" in window && !ioMobile) {
        ioMobile = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) setType(e.target.firstElementChild.getAttribute("data-type")); });
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
  if (wallHero) {
    var wallSlot = wallHero.querySelector("[data-wall]"), wallTpl = document.getElementById("wall-tpl");
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
    var showWall = function (replay) {
      if (root.getAttribute("data-site-theme") !== "gallery") return;
      if (wallTpl && !wallSlot.firstElementChild) wallSlot.appendChild(wallTpl.content.cloneNode(true));
      var els = wallHeads.concat(wallRises);
      if (replay) { els.forEach(function (el) { el.classList.remove("is-revealed", "is-in"); }); void wallHero.offsetWidth; }
      wallHeads.forEach(function (el) { el.classList.add("is-revealed"); });
      wallRises.forEach(function (el) { el.classList.add("is-in"); });
    };
    if (reduce) showWall(false);
    else Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 260); })]).then(function () { showWall(false); });
    themeHooks.push(function () { showWall(true); });
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
      if (panel) { panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", a.id); panel.removeAttribute("aria-label"); }
      a.addEventListener("click", function (e) {
        e.preventDefault();
        select(id);
        if (history.replaceState) history.replaceState(null, "", "#" + id);
        var r = viewer.getBoundingClientRect();
        var topH = parseFloat(getComputedStyle(root).getPropertyValue("--top-h")) || 64;
        if (r.top < topH + 12 && window.UIScroll) UIScroll.to(window.scrollY + r.top - topH - 20);
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
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (a && !a.hasAttribute("data-pick")) select(decodeURIComponent(a.getAttribute("href").slice(1)));
    });
  }

  /* Each frame is a still of a live page and a link to it: Example / Styleguide swap the still. */
  $$(".frame").forEach(function (frame) {
    var view = frame.querySelector(".frame__view"), shot = frame.querySelector(".frame__shot");
    var url = frame.querySelector(".frame__url"), openLink = frame.querySelector(".frame__open");
    var hint = frame.querySelector(".frame__hint");
    var showName = (frame.closest(".show") && frame.closest(".show").getAttribute("aria-label")) || "";
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
      if (!ok) return;
      clearTimeout(sw.__copyTimer);
      sw.classList.add("is-copied");
      sw.__copyTimer = setTimeout(function () { sw.classList.remove("is-copied"); }, 1400);
    });
  });

  /* Hydrate #live (#tray) and #same ([data-compare]) into live interactive stages when UIWall is present */
  var trayItems = $$("[data-tray] > li[data-pick]");
  var cmpViews = $$("[data-compare]");
  var liveHomeReady = Promise.resolve();
  if ((trayItems.length || cmpViews.length) && window.UIWall) {
    liveHomeReady = UIWall.ready().then(function () {
      var offscreenTargets = [];
      trayItems.forEach(function (li) {
        var pick = (li.getAttribute("data-pick") || "").split("/");
        var stageHost = li.querySelector(".tray__stage");
        if (pick.length !== 3 || !stageHost) return;
        var st = UIWall.stage(pick[0], pick[1], pick[2]);
        if (!st) return;
        stageHost.innerHTML = "";
        stageHost.appendChild(st);
        offscreenTargets.push(li);
      });
      cmpViews.forEach(function (view) {
        var packId = view.getAttribute("data-compare");
        var st = UIWall.stage(packId, "compare", "weekly-report");
        if (!st) return;
        var badge = view.querySelector(".same__badge");
        view.innerHTML = "";
        view.appendChild(st);
        if (badge) view.appendChild(badge);
        offscreenTargets.push(view);
      });
      if ("IntersectionObserver" in window && offscreenTargets.length) {
        var offIo = new IntersectionObserver(function (es) {
          es.forEach(function (e) { e.target.classList.toggle("is-offscreen", !e.isIntersecting); });
        }, { rootMargin: "200px 0px" });
        offscreenTargets.forEach(function (el) { offIo.observe(el); });
      }
      return UIWall.scripts();
    });
  }
  if (shelf || trayItems.length || cmpViews.length) {
    UISite.ready = function () { return Promise.all([shelfReady, liveHomeReady]); };
  }

  /* Stills further up (#styles) are fetched and decoded while the page is idle. */
  if (viewer) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var idleSlot = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
    var warm = function () {
      var queue = $$(".show.is-active .frame__shot").filter(function (img) { return img.loading === "lazy"; });
      (function next() {
        var img = queue.shift();
        if (!img) return;
        img.loading = "eager";
        (img.decode ? img.decode() : Promise.resolve()).catch(function () {}).then(function () { idleSlot(next, { timeout: 1500 }); });
      })();
    };
    if (!saveData) window.addEventListener("load", function () { idleSlot(warm, { timeout: 3000 }); });
  }

  /* ---------- "Same markup" ---------- */
  /* The code line above the cards follows the card you point at: same markup, another prefix. */
  var code = document.querySelector(".same-code");
  var currentPrefix = "clay";
  if (code) {
    var showPrefix = function (fig) {
      if (!fig) return;
      currentPrefix = fig.getAttribute("data-prefix") || "clay";
      $$("[data-prefix]", code).forEach(function (b) { b.textContent = currentPrefix; });
      code.style.setProperty("--pc", "color-mix(in srgb, " + fig.style.getPropertyValue("--pc") + " 72%, #fff)");
    };
    $$(".same figure").forEach(function (fig) {
      fig.addEventListener("pointerenter", function () { showPrefix(fig); });
      fig.addEventListener("focusin", function () { showPrefix(fig); });
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
  /* Light / dark toggles live pack themes on the stages (or swaps fallback stills if unhydrated). */
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

  /* ---------- Scroll-spy for homepage section nav links ---------- */
  var spyLinks = $$('.top nav a[href^="#"]').map(function (a) {
    var id = a.getAttribute("href").slice(1);
    var sec = document.getElementById(id);
    return sec ? { a: a, sec: sec } : null;
  }).filter(Boolean);
  if (spyLinks.length && "IntersectionObserver" in window) {
    var visibleSecs = new Set();
    var spyIo = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) visibleSecs.add(e.target); else visibleSecs.delete(e.target);
      });
      var hit = spyLinks.filter(function (x) { return visibleSecs.has(x.sec); })[0];
      spyLinks.forEach(function (x) { x.a.classList.toggle("is-current", !!hit && x === hit); });
    }, { rootMargin: "-25% 0px -55% 0px" });
    spyLinks.forEach(function (x) { spyIo.observe(x.sec); });
  }

  /* ---------- Site theme: booth ⇄ gallery ---------- */
  var KEY = "uidl-site-theme", meta = document.querySelector('meta[name="theme-color"]');
  function themeNow() { return root.getAttribute("data-site-theme") === "gallery" ? "gallery" : "booth"; }
  function syncTheme() {
    var dark = themeNow() === "gallery";
    var label = dark ? "Switch to light studio theme" : "Switch to dark gallery theme";
    $$("[data-site-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(dark));
      b.setAttribute("aria-label", label);
      b.title = label;
    });
    if (meta) meta.setAttribute("content", dark ? "#0F0F11" : "#E6E5E0");
  }
  function setTheme(name, save) {
    if (save) { try { localStorage.setItem(KEY, name); } catch (e) { /* storage blocked: this visit only */ } }
    if (name === themeNow()) return;
    var go = function () {
      root.setAttribute("data-site-theme", name);
      syncTheme();
      refit();
      themeHooks.forEach(function (fn) { fn(name); });
      // The two themes set type in different faces: measure again once the new one has arrived.
      if (document.fonts && document.fonts.ready) requestAnimationFrame(function () { document.fonts.ready.then(function () { refit(); window.dispatchEvent(new Event("resize")); }); });
    };
    if (document.startViewTransition && !reduce) document.startViewTransition(go); else go();
  }
  UISite.theme = function (name) { if (name === "booth" || name === "gallery") setTheme(name, true); return themeNow(); };
  syncTheme();
  $$("[data-site-theme-toggle]").forEach(function (b) {
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
  /* The gallery hero's wall leans toward the pointer under a soft light (rAF-damped, self-stopping, cached
     rects: no getBoundingClientRect() per pointermove, no CSS transition fighting the inline transform). */
  if (wallHero && window.matchMedia("(hover: hover)").matches) {
    var glow = document.createElement("div"), light = document.createElement("i");
    glow.className = "hero__glow"; glow.setAttribute("aria-hidden", "true");
    glow.appendChild(light);
    wallHero.insertBefore(glow, wallHero.firstChild);
    var hr = null, gr = null, tx = 0, ty = 0, cx = 0, cy = 0, lx = 0, ly = 0, rafId = 0, lightDirty = false;
    var clearRects = function () { hr = null; gr = null; };
    window.addEventListener("resize", clearRects, { passive: true });
    window.addEventListener("scroll", clearRects, { passive: true });
    var stepHero = function () {
      rafId = 0;
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      var moving = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002;
      if (!moving) { cx = tx; cy = ty; }
      var plane = wallSlot.querySelector(".wall__plane");
      if (plane) plane.style.transform = "translate3d(calc(-48% + " + (cx * -18).toFixed(1) + "px)," + (cy * -12).toFixed(1) + "px,0) perspective(1800px) rotateX(" + (16 - cy * 5).toFixed(2) + "deg) rotateZ(" + (14 + cx * 4).toFixed(2) + "deg)";
      if (lightDirty) { lightDirty = false; light.style.transform = "translate3d(" + lx + "px," + ly + "px,0)"; }
      if (moving) rafId = requestAnimationFrame(stepHero);
    };
    wallHero.addEventListener("pointermove", function (e) {
      if (!hr) { hr = wallHero.getBoundingClientRect(); gr = glow.getBoundingClientRect(); }
      tx = Math.max(-1, Math.min(1, ((e.clientX - hr.left) / hr.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - hr.top) / hr.height) * 2 - 1));
      lx = Math.round(e.clientX - gr.left);
      ly = Math.round(e.clientY - gr.top);
      lightDirty = true;
      glow.classList.add("is-on");
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    }, { passive: true });
    wallHero.addEventListener("pointerleave", function () {
      tx = 0; ty = 0;
      glow.classList.remove("is-on");
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    });
  }
})();
