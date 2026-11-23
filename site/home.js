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
  var views = document.querySelectorAll(".frame__view");
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

/* ---------- Motion (homepage + component wall): word reveals, rising blocks, hero parallax,
   scroll-linked frames, live marquee and count-ups. Everything stops at prefers-reduced-motion. ---------- */
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
  heads.forEach(split);

  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.classList.add(e.target.classList.contains("reveal-words") ? "is-revealed" : "is-in");
      if (e.target.hasAttribute("data-count")) countUp(e.target);
    });
  }, { rootMargin: "0px 0px -10% 0px" }) : null;

  /* Grid items rise in with a small stagger. */
  [".same figure", ".way", ".legal > p"].forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el, n) { el.classList.add("rise"); el.style.setProperty("--d", n); });
  });
  function start() {
    heads.forEach(function (h) { if (!h.hasAttribute("data-reveal-on-scroll")) h.classList.add("is-revealed"); else if (io) io.observe(h); else h.classList.add("is-revealed"); });
    document.querySelectorAll(".rise").forEach(function (el) {
      if (el.closest("[data-hero], .cw-hero")) el.classList.add("is-in");
      else if (io) io.observe(el); else el.classList.add("is-in");
    });
    document.querySelectorAll("[data-count]").forEach(function (el) { if (io) io.observe(el); });
  }
  if (document.fonts && document.fonts.ready) Promise.race([document.fonts.ready, new Promise(function (r) { setTimeout(r, 700); })]).then(start);
  else start();

  function countUp(el) {
    var to = +el.getAttribute("data-count"), t0 = performance.now(), dur = 1400;
    if (reduce || !to) { el.textContent = to; return; }
    (function tick(t) {
      var k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 4);
      el.textContent = Math.round(to * e);
      if (k < 1) requestAnimationFrame(tick);
    })(t0);
  }

  if (reduce) return;

  /* Sections out of view pause their loops (wall, aurora, marquee, beam): nothing animates unseen. */
  if ("IntersectionObserver" in window) {
    var pio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { e.target.classList.toggle("is-paused", !e.isIntersecting); });
    }, { rootMargin: "120px 0px" });
    document.querySelectorAll("[data-hero], .cw-hero, .live").forEach(function (el) { pio.observe(el); });
  }

  /* Hero: the page wall leans toward the pointer, and a soft light follows it. Both are moved with
     transforms on their own elements, so a pointer move never restyles the rest of the hero. */
  var hero = document.querySelector("[data-hero]");
  if (hero && window.matchMedia("(hover: hover)").matches) {
    var plane = hero.querySelector(".wall__plane");
    var glow = document.createElement("div"), light = document.createElement("i");
    glow.className = "hero__glow"; glow.setAttribute("aria-hidden", "true");
    glow.appendChild(light);
    hero.insertBefore(glow, hero.firstChild);
    var pending = null, queued = false;
    var lean = function (px, py) {
      if (plane) plane.style.transform = "translateX(-48%) translate3d(" + (px * -18).toFixed(1) + "px," + (py * -12).toFixed(1) + "px,0) rotateX(" + (16 - py * 5).toFixed(2) + "deg) rotateZ(" + (14 + px * 4).toFixed(2) + "deg)";
    };
    hero.addEventListener("pointermove", function (e) {
      pending = e;
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var r = hero.getBoundingClientRect(), ev = pending;
        var x = ev.clientX - r.left, y = ev.clientY - r.top;
        lean(x / r.width * 2 - 1, y / r.height * 2 - 1);
        light.style.transform = "translate3d(" + x.toFixed(0) + "px," + (y + 40).toFixed(0) + "px,0)";
        glow.classList.add("is-on");
      });
    });
    hero.addEventListener("pointerleave", function () { lean(0, 0); glow.classList.remove("is-on"); });
  }

  /* Showcases: frames tilt up out of the page and land flat as they scroll in. --p goes on the frame
     and the copy themselves (small subtrees), not on the whole section. */
  var shows = Array.prototype.slice.call(document.querySelectorAll(".show")).map(function (m) {
    return { el: m, parts: Array.prototype.slice.call(m.querySelectorAll(".show__media .frame, .show__body")), p: -1 };
  });
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var still = document.documentElement.hasAttribute("data-static"); // screenshot mode: final state
      var vh = window.innerHeight;
      shows.forEach(function (s) {
        var p = 1;
        if (!still) {
          var r = s.el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > vh + 200) return; // off screen: leave it as it is
          p = Math.max(0, Math.min(1, (vh - r.top) / (vh * 0.7)));
          p = 1 - Math.pow(1 - p, 3);
        }
        p = Math.round(p * 1000) / 1000;
        if (p === s.p) return;
        s.p = p;
        s.parts.forEach(function (el) { el.style.setProperty("--p", p); });
      });
    });
  }
  if (shows.length) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
  }

  /* "Same markup": each card is the identical HTML from site/compare/<pack>.html, rendered inline with
     the pack's own CSS and JS (no iframe), scaled from its 360px design width to the column. */
  var compares = document.querySelectorAll("[data-compare]");
  if (compares.length && window.UIWall) {
    var fitCompare = function (view) {
      var inner = view.firstElementChild;
      if (!inner) return;
      var s = view.clientWidth / 360;
      inner.style.transform = "scale(" + s + ")";
      view.style.height = Math.ceil(inner.offsetHeight * s) + "px";
    };
    var cro = "ResizeObserver" in window ? new ResizeObserver(function (es) { es.forEach(function (e) { fitCompare(e.target.closest ? e.target.closest("[data-compare]") || e.target : e.target); }); }) : null;
    UIWall.ready().then(function () { compares.forEach(function (view) {
      var id = view.getAttribute("data-compare"), p = UIWall.byId[id];
      if (!p) return;
      fetch("site/compare/" + id + ".html").then(function (r) { return r.text(); }).then(function (text) {
        var doc = new DOMParser().parseFromString(text, "text/html");
        var wrap = doc.querySelector(".wrap");
        var pad = (doc.querySelector("style") || {}).textContent || "";
        var m = pad.match(/\.wrap\s*\{\s*padding:\s*([^;]+);/);
        var inner = document.createElement("div");
        inner.className = "same__inner";
        inner.setAttribute("style", p.root + ";" + (p.page || "") + ";padding:" + (m ? m[1] : "22px"));
        inner.innerHTML = wrap.innerHTML.replace(/min-height:\s*100vh;?/g, "");
        view.appendChild(inner);
        fitCompare(view);
        if (cro) { cro.observe(view); cro.observe(inner); }
        UIWall.scripts();
      });
    }); });
  }

  /* Live marquee: real components from every language (site/wall.js). */
  var rows = document.querySelectorAll("[data-marquee]");
  if (rows.length && window.UIWall) {
    var ROWS = [
      [["clay", "button", "variants"], ["braun", "slider", "rotary-dial"], ["lilac", "selection", "toggle"], ["zine", "tabs", "folder-tabs"], ["atelier", "tabs", "pill-tabs"], ["obsidian", "card", "kpi-card"], ["tactile", "selection", "switch"], ["terrarium", "card", "feature-card"], ["sketch", "tabs", "folder-tabs"], ["clay", "segmented", "segmented-control"], ["zine", "chips", "stickers"], ["atelier", "appearance", "accent-swatches"]],
      [["lilac", "progress", "ring-and-steps"], ["obsidian", "tabs", "pill-tabs"], ["sketch", "chips", "badges-and-status"], ["terrarium", "progress", "ring"], ["tactile", "button", "states"], ["braun", "progress", "led-meter"], ["atelier", "button", "variants"], ["zine", "button", "variants"], ["clay", "selection", "toggle"], ["obsidian", "selection", "switches"], ["tactile", "segmented", "segmented-tabs"], ["terrarium", "segmented", "segmented"], ["braun", "segmented", "keys"], ["lilac", "button", "variants"]]
    ];
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
      });
      UIWall.scripts();
    });
  }
})();
