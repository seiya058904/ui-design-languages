/* Homepage and component-wall chrome (site only, never a pack).
   The homepage shows the languages as stills and links to the live pages: nothing on it loads a pack's CSS
   or JS, so nothing live competes with scrolling. The component wall (site/components.js) is the live place.

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
  S.feedback = function (btn, result, okText) {
    var label = btn.querySelector("span") || btn;
    if (btn.__label == null) btn.__label = label.textContent;
    clearTimeout(btn.__feedbackTimer);
    return Promise.resolve(result).then(function (ok) {
      label.textContent = ok ? okText || "Copied" : "Copy failed";
      btn.classList.toggle("is-copied", !!ok);
      btn.classList.toggle("is-failed", !ok);
      btn.__feedbackTimer = setTimeout(function () {
        label.textContent = btn.__label;
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
  function fitTitle() {
    if (!title) return;
    title.style.fontSize = "";
    var base = parseFloat(getComputedStyle(title).fontSize), w = title.clientWidth, ratio = 1;
    $$(":scope > span", title).forEach(function (line) { if (line.scrollWidth > 0) ratio = Math.min(ratio, w / line.scrollWidth); });
    if (ratio < 1) title.style.fontSize = (base * ratio * 0.995).toFixed(2) + "px";
  }
  function refit() {
    if (!title) return;
    title.setAttribute("style", title.style.cssText.replace(/font-size:[^;]+;?/g, ""));
    fitTitle();
  }
  var typeShown = null, swapTimer = 0;
  function setType(css) {
    if (!title || css === typeShown) return;
    typeShown = css;
    var apply = function () { title.setAttribute("style", css || ""); fitTitle(); title.classList.remove("is-swapping"); };
    clearTimeout(swapTimer);
    if (reduce) { apply(); return; }
    title.classList.add("is-swapping");
    swapTimer = setTimeout(apply, 110);
  }
  if (title) {
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(refit);
    refit();
    window.addEventListener("resize", function () { requestAnimationFrame(refit); }, { passive: true });
  }

  if (shelf) {
    var slots = $$(":scope > li", shelf), covers = $$("img[data-src]", shelf), open = null, closeTimer = 0, intentTimer = 0;
    var coversLoaded = false;
    var loadCovers = function () {
      if (coversLoaded) return;
      coversLoaded = true;
      covers.forEach(function (img) { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); });
    };
    var openSlot = function (li) {
      clearTimeout(closeTimer);
      if (li === open) return;
      loadCovers();
      open = li;
      slots.forEach(function (s) { s.classList.toggle("is-open", s === li); });
      setType(li ? li.firstElementChild.getAttribute("data-type") : null);
    };
    // The books are set on the shelf one after another, once the type has arrived (or 400ms passed).
    var shelfSet, shelfReady = new Promise(function (r) { shelfSet = r; });
    UISite.ready = function () { return shelfReady; };
    var settle = function () {
      if (shelf.classList.contains("is-set")) return;
      shelf.classList.add("is-set");
      shelfSet();
      setTimeout(function () { shelf.classList.add("is-settled"); }, 1100);
    };
    if (reduce) settle();
    else Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 400); })]).then(function () { requestAnimationFrame(settle); });

    if (!mobile.matches) {
      // Scrolling past the shelf with the pointer on it is not pointing at a book: a book opens only once
      // the page is still (opening re-lays out the hero and re-sets the headline, never mid-scroll).
      var lastScroll = -1e4;
      window.addEventListener("scroll", function () { lastScroll = performance.now(); }, { passive: true });
      var tryOpen = function (li) {
        var still = performance.now() - lastScroll;
        if (still < 200) { intentTimer = setTimeout(function () { tryOpen(li); }, 210 - still); return; }
        if (li.matches(":hover")) openSlot(li);
      };
      slots.forEach(function (li) {
        li.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "touch") return;
          clearTimeout(intentTimer);
          // A short intent delay: sweeping across the shelf doesn't fan every book open on the way.
          intentTimer = setTimeout(function () { tryOpen(li); }, open ? 70 : 40);
        });
      });
      shelf.addEventListener("pointerleave", function () {
        clearTimeout(intentTimer);
        closeTimer = setTimeout(function () { openSlot(null); }, 260);
      });
    }
    shelf.addEventListener("focusin", function (e) { var li = e.target.closest("li"); if (li) openSlot(li); });
    shelf.addEventListener("focusout", function (e) { if (!shelf.contains(e.relatedTarget)) openSlot(null); });
    // Covers arrive early when the page goes idle (they are small posters), or as soon as the shelf is used;
    // never while the gallery theme hides the shelf.
    var shelfShown = function () { return root.getAttribute("data-site-theme") !== "gallery"; };
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    window.addEventListener("load", function () { idle(function () { if (shelfShown()) loadCovers(); }, { timeout: 2500 }); });
    themeHooks.push(function () { if (shelfShown() && mobile.matches) loadCovers(); });
    if (mobile.matches) {
      if (shelfShown()) loadCovers();
      // On a phone the shelf is a row you swipe: the book in the middle sets the headline.
      if ("IntersectionObserver" in window) {
        var seen = new IntersectionObserver(function (es) {
          es.forEach(function (e) { if (e.isIntersecting) setType(e.target.firstElementChild.getAttribute("data-type")); });
        }, { root: shelf, rootMargin: "0px -45% 0px -45%" });
        var armed = false;
        shelf.addEventListener("scroll", function () { if (armed) return; armed = true; slots.forEach(function (li) { seen.observe(li); }); }, { passive: true });
      }
    }
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
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-orientation", "vertical");
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
      select(picks[j].getAttribute("data-pick"), true);
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
    $$(".seg button", frame).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".seg button", frame).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var src = b.getAttribute("data-src"), name = "site/assets/thumbs/" + src.replace(/\//g, "-").replace(/\.html$/, "");
        shot.srcset = name + ".jpg 640w, " + name + "-lg.jpg 1280w";
        shot.src = name + ".jpg";
        view.href = openLink.href = src;
        url.textContent = src;
      });
    });
  });

  /* Stills further down are fetched and decoded while the page is idle, one per idle slot, so none of them is
     decoded for the first time in the middle of a scroll (skipped when the reader asked to save data). */
  if (viewer || document.querySelector("[data-tray]")) {
    var saveData = navigator.connection && navigator.connection.saveData;
    var idleSlot = window.requestIdleCallback || function (fn) { return setTimeout(fn, 200); };
    var warm = function () {
      var queue = $$(".show.is-active .frame__shot, .tray img, .same__view img").filter(function (img) { return img.loading === "lazy"; });
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
  if (code) {
    var showPrefix = function (fig) {
      $$("[data-prefix]", code).forEach(function (b) { b.textContent = fig.getAttribute("data-prefix"); });
      code.style.setProperty("--pc", "color-mix(in srgb, " + fig.style.getPropertyValue("--pc") + " 72%, #fff)");
    };
    $$(".same figure").forEach(function (fig) {
      fig.addEventListener("pointerenter", function () { showPrefix(fig); });
      fig.addEventListener("focusin", function () { showPrefix(fig); });
    });
    showPrefix(document.querySelector(".same figure"));
  }
  /* Light / dark swaps every card's still; languages without a dark theme keep theirs. */
  $$("[data-theme-pick]").forEach(function (b) {
    b.addEventListener("click", function () {
      var dark = b.getAttribute("data-theme-pick") === "dark";
      $$("[data-theme-pick]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      $$(".same__view img[data-dark]").forEach(function (img) {
        if (!img.__light) img.__light = img.getAttribute("src");
        img.loading = "eager";
        img.src = dark ? img.getAttribute("data-dark") : img.__light;
      });
    });
  });

  /* ---------- Site theme: booth ⇄ gallery ---------- */
  var KEY = "uidl-site-theme", meta = document.querySelector('meta[name="theme-color"]');
  function themeNow() { return root.getAttribute("data-site-theme") === "gallery" ? "gallery" : "booth"; }
  function syncTheme() {
    var dark = themeNow() === "gallery";
    $$("[data-site-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", String(dark));
      b.title = dark ? "Grey booth theme" : "Dark gallery theme";
    });
    if (meta) meta.setAttribute("content", dark ? "#0F0F11" : "#C9C9C6");
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
