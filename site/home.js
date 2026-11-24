/* Homepage behaviour (site chrome only). */
(function () {
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

  /* Scale fixed-size live pages (1280×800 frames) to their containers, and activate/hibernate iframes
     on demand so at most MAX_LIVE iframes stay resident in memory while scrolling the homepage. */
  function fit(view) {
    var iframe = view.querySelector("iframe");
    if (!iframe) return;
    var base = parseFloat(iframe.getAttribute("width")) || 1280;
    iframe.style.transform = "scale(" + view.clientWidth / base + ")";
  }
  var views = Array.prototype.slice.call(document.querySelectorAll(".frame__view"));
  views.forEach(fit);
  if (views.length && "ResizeObserver" in window) {
    var ro = new ResizeObserver(function (entries) { entries.forEach(function (e) { fit(e.target); }); });
    views.forEach(function (v) { ro.observe(v); });
  }

  var MAX_LIVE = 2;
  var liveQueue = [];
  var inViewSet = new Set();

  function cancelActivate(view) {
    if (view.__activateTimer) { clearTimeout(view.__activateTimer); view.__activateTimer = 0; }
  }
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
      for (var i = 0; i < liveQueue.length; i++) {
        if (liveQueue[i] !== keep && !inViewSet.has(liveQueue[i])) { victim = liveQueue[i]; break; }
      }
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
      iframe.onload = function () {
        if (iframe.getAttribute("src") === want) view.classList.add("is-live");
      };
      iframe.setAttribute("src", want);
    } else if (iframe.contentDocument && iframe.contentDocument.readyState === "complete") {
      view.classList.add("is-live");
    }
    pruneFrames(view);
  }
  function scheduleActivate(view) {
    cancelActivate(view);
    var iframe = view.querySelector("iframe");
    if (iframe && iframe.getAttribute("src") === iframe.getAttribute("data-src")) { activateFrame(view); return; }
    // Wait briefly so rapid scrolling past showcases doesn't load 7 iframes mid-scroll;
    // the crisp static poster is already visible immediately.
    view.__activateTimer = setTimeout(function () {
      view.__activateTimer = 0;
      if (inViewSet.has(view)) activateFrame(view);
    }, 240);
  }

  if (views.length && "IntersectionObserver" in window) {
    var fio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          inViewSet.add(e.target);
          scheduleActivate(e.target);
        } else {
          inViewSet.delete(e.target);
          cancelActivate(e.target);
          pruneFrames(null);
        }
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
  document.querySelectorAll(".frame").forEach(function (frame) {
    var view = frame.querySelector(".frame__view");
    var iframe = frame.querySelector("iframe"), url = frame.querySelector(".frame__url"), open = frame.querySelector(".frame__open");
    frame.querySelectorAll(".seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        frame.querySelectorAll(".seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        var src = b.getAttribute("data-src");
        iframe.setAttribute("data-src", src);
        activateFrame(view, src);
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
    if (!b.__origCopyLabel) b.__origCopyLabel = label.textContent;
    clearTimeout(b.__copyTimer);
    function done(ok) {
      b.classList.toggle("is-copied", ok);
      label.textContent = ok ? "Copied" : "Copy failed";
      b.__copyTimer = setTimeout(function () { label.textContent = b.__origCopyLabel; b.classList.remove("is-copied"); }, 1600);
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

/* ---------- Motion & live showcase sections (homepage + component wall): word reveals, rising blocks,
   "Same markup" cards, live marquee, hero parallax and scroll-linked frames.
   Content always renders even at prefers-reduced-motion; only continuous motion stops. ---------- */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Split headings into words that rise out of a mask. */
  function split(el) {
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
  }
  var heads = Array.prototype.slice.call(document.querySelectorAll(".reveal-words"));
  if (!reduce) heads.forEach(split);

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add(e.target.classList.contains("reveal-words") ? "is-revealed" : "is-in");
      if (e.target.hasAttribute("data-count")) countUp(e.target);
    });
  }, { rootMargin: "0px 0px -8% 0px" }) : null;

  /* Grid items rise in with a small stagger. */
  [".same figure", ".way", ".legal > p"].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, n) { el.classList.add("rise"); el.style.setProperty("--d", n); });
  });
  function start() {
    heads.forEach(function (h) { if (reduce || !h.hasAttribute("data-reveal-on-scroll") || !io) h.classList.add("is-revealed"); else io.observe(h); });
    document.querySelectorAll(".rise").forEach(function (el) {
      if (reduce || el.closest("[data-hero], .cw-hero") || !io) el.classList.add("is-in");
      else io.observe(el);
    });
    if (!reduce) document.querySelectorAll("[data-count]").forEach(function (el) { if (io) io.observe(el); });
  }
  if (!reduce && document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 260); })]).then(start);
  else start();

  function countUp(el) {
    var to = +el.getAttribute("data-count"), t0 = performance.now(), dur = 1200;
    if (reduce || !to) { el.textContent = to; return; }
    (function tick(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  /* "Same markup": each card is the identical HTML from site/compare/<pack>.html, rendered inline with
     the pack's own CSS and JS (no iframe), scaled from its 360px design width to the column.
     Always built regardless of prefers-reduced-motion. */
  var compares = Array.prototype.slice.call(document.querySelectorAll("[data-compare]"));
  if (compares.length && window.UIWall) {
    var fitCompare = function (view) {
      var inner = view.firstElementChild;
      if (!inner) return;
      var s = view.clientWidth / 360;
      inner.style.transform = "scale(" + s + ")";
      view.style.height = Math.ceil(inner.offsetHeight * s) + "px";
    };
    var cro = "ResizeObserver" in window ? new ResizeObserver(function (es) {
      es.forEach(function (e) { fitCompare(e.target.closest ? e.target.closest("[data-compare]") || e.target : e.target); });
    }) : null;
    UIWall.ready().then(function () {
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
          fitCompare(view);
          if (cro) { cro.observe(view); cro.observe(inner); }
        }).catch(function () {});
      }));
    }).then(function () { UIWall.scripts(); });
  }

  /* Live marquee: real components from every language (site/wall.js). Always built; under reduced
     motion renders one scrollable strip without duplicated track or continuous animation. */
  var rows = Array.prototype.slice.call(document.querySelectorAll("[data-marquee]"));
  if (rows.length && window.UIWall) {
    var ROWS = [
      [["clay", "stepper", "stepper"], ["braun", "slider", "rotary-dial"], ["lilac", "timer", "focus-timer"], ["zine", "ticket", "tear-off-ticket"], ["atelier", "card", "project-card"], ["obsidian", "dock", "floating-dock"], ["tactile", "dial", "thermostat"], ["terrarium", "garden", "habit-garden"], ["sketch", "notes", "doodle-pad"], ["clay", "button", "variants"], ["zine", "tabs", "folder-tabs"], ["obsidian", "card", "kpi-card"], ["atelier", "tabs", "pill-tabs"]],
      [["braun", "progress", "peak-meters"], ["lilac", "progress", "ring-and-steps"], ["obsidian", "media", "now-playing"], ["sketch", "flow", "flow-card"], ["terrarium", "mood", "mood-dial"], ["tactile", "chips", "filter-chips"], ["atelier", "filter", "filter-capsules"], ["zine", "board", "sticker-board"], ["clay", "slider", "slider"], ["lilac", "card", "profile-card"], ["braun", "progress", "led-meter"], ["terrarium", "progress", "ring"], ["tactile", "selection", "switch"], ["sketch", "tabs", "folder-tabs"]]
    ];
    // Hold the marquee still while dragging a dial, slider or sticker even if the pointer leaves the row.
    var dragRow = null;
    rows.forEach(function (row) {
      row.addEventListener("pointerdown", function () { dragRow = row; row.classList.add("is-dragging"); });
    });
    var endMarqueeDrag = function () { if (dragRow) { dragRow.classList.remove("is-dragging"); dragRow = null; } };
    window.addEventListener("pointerup", endMarqueeDrag);
    window.addEventListener("pointercancel", endMarqueeDrag);

    UIWall.ready().then(function () {
      rows.forEach(function (row) {
        var track = row.querySelector(".marquee__track"), set = document.createDocumentFragment();
        ROWS[+row.getAttribute("data-marquee")].forEach(function (pk) {
          var st = UIWall.stage(pk[0], pk[1], pk[2]), p = UIWall.byId[pk[0]], hit = UIWall.demo(pk[0], pk[1], pk[2]);
          if (!st) return;
          var card = document.createElement("div");
          card.className = "mq-card";
          card.appendChild(st);
          var tag = document.createElement("a");
          tag.className = "mq-tag";
          tag.href = "components.html#" + pk[0] + "/" + pk[1];
          tag.innerHTML = '<i style="background:' + p.dot + '"></i><b style="' + p.font + '"></b><span></span>';
          tag.querySelector("b").textContent = p.name;
          tag.querySelector("span").textContent = hit.component.title;
          card.appendChild(tag);
          set.appendChild(card);
        });
        track.appendChild(set);
        if (!reduce) {
          // A second, identical copy makes the loop seamless; it is hidden from assistive tech and has no ids.
          Array.prototype.slice.call(track.children).forEach(function (card) {
            var clone = card.cloneNode(true);
            clone.setAttribute("aria-hidden", "true");
            clone.querySelectorAll("[id]").forEach(function (n) { n.removeAttribute("id"); });
            clone.querySelectorAll("[for]").forEach(function (n) { n.removeAttribute("for"); });
            clone.querySelectorAll("input[type=radio]").forEach(function (n) { n.name += "-copy"; });
            clone.querySelectorAll("a, button, input, select, textarea").forEach(function (n) { n.tabIndex = -1; });
            clone.querySelectorAll(".wstage").forEach(function (st) { st.addEventListener("click", UIWall.inertLinks); }); // cloneNode drops listeners
            track.appendChild(clone);
          });
          requestAnimationFrame(function () { row.style.setProperty("--mq-dur", Math.max(40, track.scrollWidth / 2 / 45) + "s"); });
        }
      });
      UIWall.scripts();
    });
  }

  if (reduce) return;

  /* Sections out of view pause their loops (wall, aurora, marquee, beam): nothing animates unseen. */
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-paused", !e.isIntersecting); });
    }, { rootMargin: "120px 0px" });
    document.querySelectorAll("[data-hero], .cw-hero, .live").forEach(function (el) { pio.observe(el); });
  }

  /* Hero: the page wall leans smoothly toward the pointer (rAF-damped, self-stopping, cached rects —
     zero getBoundingClientRect() per pointermove and no CSS transition fighting inline transforms). */
  var hero = document.querySelector("[data-hero]");
  if (hero && window.matchMedia("(hover: hover)").matches) {
    var plane = hero.querySelector(".wall__plane");
    var glow = document.createElement("div"), light = document.createElement("i");
    glow.className = "hero__glow"; glow.setAttribute("aria-hidden", "true");
    glow.appendChild(light);
    hero.insertBefore(glow, hero.firstChild);

    var hr = null, gr = null;
    var tx = 0, ty = 0, cx = 0, cy = 0, lx = 0, ly = 0, rafId = 0, lightDirty = false;
    var clearRects = function () { hr = null; gr = null; };
    window.addEventListener("resize", clearRects, { passive: true });
    window.addEventListener("scroll", clearRects, { passive: true });

    function stepHero() {
      rafId = 0;
      cx += (tx - cx) * 0.1;
      cy += (ty - cy) * 0.1;
      var moving = Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002;
      if (!moving) { cx = tx; cy = ty; }
      if (plane) {
        plane.style.transform =
          "translate3d(calc(-48% + " + (cx * -18).toFixed(1) + "px)," + (cy * -12).toFixed(1) + "px,0) perspective(1800px) rotateX(" + (16 - cy * 5).toFixed(2) + "deg) rotateZ(" + (14 + cx * 4).toFixed(2) + "deg)";
      }
      if (lightDirty) {
        lightDirty = false;
        light.style.transform = "translate3d(" + lx + "px," + ly + "px,0)";
      }
      if (moving) rafId = requestAnimationFrame(stepHero);
    }

    hero.addEventListener("pointermove", function (e) {
      if (!hr) { hr = hero.getBoundingClientRect(); gr = glow.getBoundingClientRect(); }
      tx = Math.max(-1, Math.min(1, ((e.clientX - hr.left) / hr.width) * 2 - 1));
      ty = Math.max(-1, Math.min(1, ((e.clientY - hr.top) / hr.height) * 2 - 1));
      lx = Math.round(e.clientX - gr.left);
      ly = Math.round(e.clientY - gr.top);
      lightDirty = true;
      glow.classList.add("is-on");
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    }, { passive: true });

    hero.addEventListener("pointerleave", function () {
      tx = 0; ty = 0;
      glow.classList.remove("is-on");
      if (!rafId) rafId = requestAnimationFrame(stepHero);
    });
  }

  /* Showcases: frames glide cleanly into place as they scroll in. Reads all rects first, then writes
     only changed --p values, and settles cards cleanly to p=1 once scrolled past the top. */
  var shows = Array.prototype.slice.call(document.querySelectorAll(".show")).map(function (m) {
    return { el: m, parts: Array.prototype.slice.call(m.querySelectorAll(".show__media .frame, .show__body")), p: -1 };
  });
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var still = document.documentElement.hasAttribute("data-static");
      var vh = window.innerHeight;
      var updates = [];
      for (var i = 0; i < shows.length; i++) {
        var s = shows[i], p = 1;
        if (!still) {
          var r = s.el.getBoundingClientRect();
          if (r.bottom < -120) p = 1;
          else if (r.top > vh + 120) p = 0;
          else {
            p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.65)));
            p = 1 - Math.pow(1 - p, 3);
          }
        }
        p = Math.round(p * 1000) / 1000;
        if (p !== s.p) { s.p = p; updates.push(s); }
      }
      for (var j = 0; j < updates.length; j++) {
        var u = updates[j];
        for (var k = 0; k < u.parts.length; k++) u.parts[k].style.setProperty("--p", u.p);
      }
    });
  }
  if (shows.length) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }
})();
