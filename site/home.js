/* Homepage behaviour (site chrome only). */

/* UISite — shared by the homepage and the component wall (both load this file first).
   UISite.copy(text)                   → Promise<boolean>: Clipboard API, or a hidden textarea when the API is
                                          missing or refuses (unfocused document, permissions policy, http)
   UISite.feedback(btn, result, okText) → shows "Copied" / "Copy failed" (or okText) on the button for 1.6s
   UISite.ready()                       → Promise: builds the homepage's live sections now and resolves once
                                          the live tray and the "Same markup" cards are on the page */
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
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Header gains a frosted background once the page scrolls (sentinel IntersectionObserver, zero scroll read). */
  var top = document.querySelector(".top");
  if (top) {
    if ("IntersectionObserver" in window) {
      var sent = document.createElement("div");
      sent.setAttribute("aria-hidden", "true");
      sent.style.cssText = "position:absolute;top:0;left:0;width:1px;height:8px;pointer-events:none";
      document.body.insertBefore(sent, document.body.firstChild);
      new IntersectionObserver(function (es) {
        top.classList.toggle("is-scrolled", !es[0].isIntersecting);
      }).observe(sent);
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
    var refit = function () { var keep = title.style.cssText.replace(/font-size:[^;]+;?/g, ""); title.setAttribute("style", keep); fitTitle(); };
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
    var settle = function () {
      if (shelf.classList.contains("is-set")) return;
      shelf.classList.add("is-set");
      setTimeout(function () { shelf.classList.add("is-settled"); }, 1100);
    };
    if (reduce) settle();
    else Promise.race([document.fonts ? document.fonts.ready : Promise.resolve(), new Promise(function (r) { setTimeout(r, 400); })]).then(function () { requestAnimationFrame(settle); });

    if (!mobile.matches) {
      slots.forEach(function (li) {
        li.addEventListener("pointerenter", function (e) {
          if (e.pointerType === "touch") return;
          clearTimeout(intentTimer);
          // A short intent delay: sweeping across the shelf doesn't fan every book open on the way.
          intentTimer = setTimeout(function () { openSlot(li); }, open ? 70 : 40);
        });
      });
      shelf.addEventListener("pointerleave", function () {
        clearTimeout(intentTimer);
        closeTimer = setTimeout(function () { openSlot(null); }, 260);
      });
    }
    shelf.addEventListener("focusin", function (e) { var li = e.target.closest("li"); if (li) openSlot(li); });
    shelf.addEventListener("focusout", function (e) { if (!shelf.contains(e.relatedTarget)) openSlot(null); });
    // Covers arrive early when the page goes idle (they are small posters), or as soon as the shelf is used.
    var idle = window.requestIdleCallback || function (fn) { return setTimeout(fn, 1200); };
    window.addEventListener("load", function () { idle(loadCovers, { timeout: 2500 }); });
    if (mobile.matches) {
      loadCovers();
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

  /* ---------- Languages: one live viewer, nine entries ----------
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

  /* ---------- Browser frames: live pages scaled to fit, at most two resident at a time ---------- */
  function fit(view) {
    var iframe = view.querySelector("iframe");
    if (!iframe || !view.clientWidth) return;
    var base = parseFloat(iframe.getAttribute("width")) || 1280;
    iframe.style.transform = "scale(" + view.clientWidth / base + ")";
  }
  var views = $$(".frame__view");
  views.forEach(fit);
  if (views.length && "ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { fit(e.target); }); });
    views.forEach(function (v) { ro.observe(v); });
  }
  var MAX_LIVE = 2, liveQueue = [], inViewSet = new Set();
  function cancelActivate(view) { if (view.__activateTimer) { clearTimeout(view.__activateTimer); view.__activateTimer = 0; } }
  function unloadFrame(view) {
    cancelActivate(view);
    var iframe = view.querySelector("iframe");
    if (!iframe) return;
    view.classList.remove("is-live");
    if (iframe.getAttribute("src")) iframe.removeAttribute("src");
    var idx = liveQueue.indexOf(view);
    if (idx >= 0) liveQueue.splice(idx, 1);
  }
  function pruneFrames(keep) {
    while (liveQueue.length > MAX_LIVE) {
      var victim = null;
      for (var i = 0; i < liveQueue.length; i++) if (liveQueue[i] !== keep && !inViewSet.has(liveQueue[i])) { victim = liveQueue[i]; break; }
      if (!victim) break;
      unloadFrame(victim);
    }
  }
  function activateFrame(view, forceSrc) {
    cancelActivate(view);
    if (document.documentElement.hasAttribute("data-static") && !forceSrc) return;
    var iframe = view.querySelector("iframe");
    if (!iframe) return;
    var want = forceSrc || iframe.getAttribute("data-src");
    if (!want) return;
    var idx = liveQueue.indexOf(view);
    if (idx >= 0) liveQueue.splice(idx, 1);
    liveQueue.push(view);
    if (iframe.getAttribute("src") !== want) {
      view.classList.remove("is-live");
      iframe.onload = function () { if (iframe.getAttribute("src") === want) view.classList.add("is-live"); };
      iframe.setAttribute("src", want);
    } else if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
      view.classList.add("is-live");
    }
    pruneFrames(view);
  }
  /* A live page parses on this page's main thread (same-origin frames share the renderer), which drops
     frames if it happens mid-scroll. So a frame in view goes live only once scrolling has settled; the
     static poster is visible meanwhile, and hovering or pressing a frame makes it live at once. */
  var lastScroll = 0, SETTLE_MS = 450;
  window.addEventListener("scroll", function () { lastScroll = performance.now(); }, { passive: true });
  function scheduleActivate(view) {
    cancelActivate(view);
    var iframe = view.querySelector("iframe");
    if (iframe && iframe.getAttribute("src") === iframe.getAttribute("data-src")) { activateFrame(view); return; }
    var tick = function () {
      view.__activateTimer = 0;
      if (!inViewSet.has(view)) return;
      var still = performance.now() - lastScroll;
      if (still < SETTLE_MS) { view.__activateTimer = setTimeout(tick, SETTLE_MS - still + 20); return; }
      activateFrame(view);
    };
    view.__activateTimer = setTimeout(tick, 240);
  }
  if (views.length && "IntersectionObserver" in window) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { inViewSet.add(e.target); fit(e.target); scheduleActivate(e.target); }
        else { inViewSet.delete(e.target); cancelActivate(e.target); pruneFrames(null); }
      });
    }, { rootMargin: "40px 0px" });
    views.forEach(function (v) {
      fio.observe(v);
      v.addEventListener("pointerenter", function () { activateFrame(v); }, { passive: true });
      v.addEventListener("pointerdown", function () { activateFrame(v); }, { passive: true });
    });
  } else {
    views.forEach(function (v) { activateFrame(v); });
  }
  /* Example / Styleguide / Components switch in each browser frame. */
  $$(".frame").forEach(function (frame) {
    var view = frame.querySelector(".frame__view");
    var iframe = frame.querySelector("iframe"), url = frame.querySelector(".frame__url"), openLink = frame.querySelector(".frame__open");
    $$(".seg button", frame).forEach(function (b) {
      b.addEventListener("click", function () {
        $$(".seg button", frame).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var src = b.getAttribute("data-src");
        // The poster follows the tab: styleguides and examples have one; a catalog shows the bare frame until it is live.
        var poster = view.querySelector(".frame__poster"), name = src.replace(/\//g, "-").replace(/\.html$/, "");
        if (poster) {
          poster.hidden = /components\.html$/.test(src);
          if (!poster.hidden) {
            poster.srcset = /\/examples\//.test(src) ? "site/assets/thumbs/" + name + ".jpg 640w, site/assets/thumbs/" + name + "-lg.jpg 1280w" : "";
            poster.src = "site/assets/thumbs/" + name + ".jpg";
          }
        }
        iframe.setAttribute("data-src", src);
        activateFrame(view, src);
        url.textContent = src;
        openLink.href = src;
      });
    });
  });

  /* ---------- Live sections: the tray of real components and the "Same markup" cards ---------- */
  function nextTask() { return new Promise(function (r) { setTimeout(r, 0); }); }

  /* Tray: each tile names its demo (pack/component/demo) and is rendered by site/wall.js — real markup,
     the pack's own CSS and JS, no iframes. Built only when the section comes near. */
  var tray = document.querySelector("[data-tray]");
  function buildTray() {
    if (!tray || !window.UIWall) return Promise.resolve();
    return UIWall.ready().then(function () {
      $$("[data-pick]", tray).forEach(function (item) {
        var pk = item.getAttribute("data-pick").split("/"), st = UIWall.stage(pk[0], pk[1], pk[2]), p = UIWall.byId[pk[0]], hit = UIWall.demo(pk[0], pk[1], pk[2]);
        if (!st) { item.hidden = true; return; } // a demo that no longer exists: hidden here, reported by scripts/snap.mjs
        item.appendChild(st);
        var tag = document.createElement("a");
        tag.className = "tag";
        tag.href = "components.html#" + pk[0] + "/" + pk[1];
        tag.innerHTML = '<i style="background:' + p.dot + '"></i><b style="' + p.font + '"></b><span></span>';
        tag.querySelector("b").textContent = p.name;
        tag.querySelector("span").textContent = hit.component.title;
        tag.setAttribute("aria-label", p.name + " " + hit.component.title + " on the component wall");
        item.appendChild(tag);
      });
    });
  }

  /* "Same markup": each card is the identical HTML from site/compare/<pack>.html, rendered inline with
     the pack's own CSS and JS (no iframe), scaled from its 360px design width to the column. */
  var compares = $$("[data-compare]");
  function fitCompare(list) {
    var items = [];
    list.forEach(function (v) { if (v.firstElementChild && items.indexOf(v) < 0) items.push(v); });
    var scales = items.map(function (v) { return v.clientWidth / 360; });
    items.forEach(function (v, i) { v.firstElementChild.style.transform = "scale(" + scales[i] + ")"; });
    var heights = items.map(function (v) { return v.firstElementChild.offsetHeight; });
    items.forEach(function (v, i) { var h = Math.ceil(heights[i] * scales[i]) + "px"; if (v.style.height !== h) v.style.height = h; });
  }
  function buildCompare() {
    if (!compares.length || !window.UIWall) return Promise.resolve();
    var cro = "ResizeObserver" in window ? new ResizeObserver(function (es) {
      fitCompare(es.map(function (e) { return e.target.closest ? e.target.closest("[data-compare]") || e.target : e.target; }));
    }) : null;
    return UIWall.ready().then(function () {
      return Promise.all(compares.map(function (view) {
        var id = view.getAttribute("data-compare"), p = UIWall.byId[id];
        if (!p) return Promise.resolve();
        return fetch("site/compare/" + id + ".html").then(function (r) { return r.text(); }).then(function (text) {
          var doc = new DOMParser().parseFromString(text, "text/html");
          var wrap = doc.querySelector(".wrap");
          var pad = (doc.querySelector("style") || {}).textContent || "";
          var m = pad.match(/\.wrap\s*\{\s*padding:\s*([^;]+);/);
          var inner = document.createElement("div");
          inner.className = "same__inner";
          inner.setAttribute("style", p.root + ";" + (p.page || "") + ";padding:" + (m ? m[1] : "22px"));
          inner.innerHTML = wrap.innerHTML.replace(/min-height:\s*100vh;?/g, "");
          inner.addEventListener("click", UIWall.inertLinks);
          view.appendChild(inner);
        }).catch(function () {});
      })).then(function () {
        fitCompare(compares);
        if (cro) compares.forEach(function (view) { if (view.firstElementChild) { cro.observe(view); cro.observe(view.firstElementChild); } });
      });
    });
  }
  /* The code line above the cards follows the card you point at: same markup, another prefix. */
  var code = document.querySelector(".same-code");
  if (code) {
    var showPrefix = function (fig) {
      var id = fig.getAttribute("data-prefix");
      $$("[data-prefix]", code).forEach(function (b) { b.textContent = id; });
      code.style.setProperty("--pc", "color-mix(in srgb, " + fig.style.getPropertyValue("--pc") + " 72%, #fff)");
    };
    $$(".same figure").forEach(function (fig) {
      fig.addEventListener("pointerenter", function () { showPrefix(fig); });
      fig.addEventListener("focusin", function () { showPrefix(fig); });
    });
    showPrefix(document.querySelector(".same figure"));
  }
  /* Light / dark for every live component on the page: the packs answer <html data-theme>. */
  $$("[data-theme-pick]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.getAttribute("data-theme-pick");
      $$("[data-theme-pick]").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      if (window.UIWall) UIWall.setTheme(t);
      requestAnimationFrame(function () { fitCompare(compares); });
    });
  });

  /* Both live sections, then each pack's script once (it wires up the components it finds). */
  var livePromise = null;
  function buildLive() {
    if (!livePromise) {
      livePromise = buildTray().then(nextTask).then(buildCompare).then(nextTask).then(function () {
        if (window.UIWall && (tray || compares.length)) return UIWall.scripts();
      }).catch(function () {});
    }
    return livePromise;
  }
  UISite.ready = buildLive;
  /* Built on demand, so the first screen loads nothing it doesn't show: whichever comes first of the first
     scroll / key / touch (then as a section comes within a screen), a deep link below the hero, an idle
     moment after load, or 4s after the DOM is ready (load may never fire when a font host stalls). */
  if (tray || compares.length) {
    var kick = function () { buildLive(); };
    var near = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
      if (es.some(function (e) { return e.isIntersecting; })) { near.disconnect(); kick(); }
    }, { rootMargin: "100% 0px" }) : null;
    var INTENT = ["scroll", "wheel", "touchstart", "keydown"];
    var arm = function () {
      INTENT.forEach(function (type) { window.removeEventListener(type, arm, true); });
      if (!near) { kick(); return; }
      [document.getElementById("live"), document.getElementById("same")].forEach(function (el) { if (el) near.observe(el); });
    };
    INTENT.forEach(function (type) { window.addEventListener(type, arm, { capture: true, passive: true }); });
    if (location.hash.length > 1) kick();
    var idleKick = window.requestIdleCallback || function (fn) { return setTimeout(fn, 300); };
    window.addEventListener("load", function () { idleKick(kick, { timeout: 2000 }); });
    var fallback = function () { setTimeout(kick, 4000); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fallback); else fallback();
  }
})();
