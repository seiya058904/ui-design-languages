/* Site chrome — inertial smooth scrolling for the library pages (Lenis-style, no dependency).
   Wheel input moves a target; the scroller eases toward it every frame with a frame-rate
   independent damp, so a wheel notch glides instead of jumping. Works on the page and on any
   large scroll container under the pointer (nested panes chain to their parent at the edge, like
   native scrolling). In-page anchor links glide too.
   Left native on purpose: touch, keyboard, scrollbar drag, horizontal / pinch gestures, small
   scroll boxes (code panels, menus), scroll-snap containers, modal dialogs, pages shown inside
   an iframe (so wheel chaining from homepage previews keeps working), reduced motion, and any
   element marked [data-native-scroll].

   Not part of any Style Pack: delete the <script> tag when copying a pack folder.
   <script src="../site/smooth-scroll.js" defer></script> */
(function () {
  if (window.self !== window.top) return;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduce && reduce.matches) return;

  var LAMBDA = 7.5;      // damping per second: higher settles faster (Lenis' lerp 0.1 ≈ 6)
  var MIN_BOX = 320;     // scroll boxes shorter than this stay native
  var root = document.scrollingElement || document.documentElement;
  var active = null;     // { el, current, target, anchor }
  var last = 0;
  var raf = 0;

  root.style.scrollBehavior = "auto"; // CSS smooth scrolling would fight the per-frame writes

  function overflowY(el) { return getComputedStyle(el).overflowY; }
  function maxScroll(el) { return el.scrollHeight - el.clientHeight; }
  function canMove(el, dy) {
    var pos = el === (active && active.el) ? active.target : el.scrollTop;
    return dy > 0 ? pos < maxScroll(el) - 1 : pos > 0;
  }
  function rootLocked() {
    return overflowY(document.documentElement) === "hidden" || (document.body && overflowY(document.body) === "hidden");
  }

  /* The element that should take this wheel step: the nearest ancestor (through shadow roots)
     that scrolls vertically and still has room in that direction; else the page. null = native. */
  function pick(e, dy) {
    var path = e.composedPath ? e.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (!el || el.nodeType !== 1) continue;
      if (el === document.documentElement || el === document.body) break;
      if (el.hasAttribute("data-native-scroll")) return null;
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      var tag = el.tagName;
      var oy = overflowY(el);
      if (tag !== "TEXTAREA" && tag !== "SELECT" && oy !== "auto" && oy !== "scroll" && oy !== "overlay") continue;
      if (!canMove(el, dy)) continue;            // at its edge: chain to the parent
      if (tag === "TEXTAREA" || tag === "SELECT" || el.clientHeight < MIN_BOX) return null;
      var snap = getComputedStyle(el).scrollSnapType;
      if (snap && snap !== "none") return null;
      return el;
    }
    if (rootLocked() || !canMove(root, dy)) return null;
    return root;
  }

  function write(el, y) {
    try { el.scrollTo({ top: y, behavior: "instant" }); } catch (err) { el.scrollTop = y; }
  }

  function frame(now) {
    raf = 0;
    if (!active) return;
    var dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    var a = active;
    if (a.anchor) {
      var t = Math.min(1, (now - a.anchor.start) / a.anchor.duration);
      a.current = a.anchor.from + (a.target - a.anchor.from) * (1 - Math.pow(2, -10 * t)) / (1 - Math.pow(2, -10));
      if (t >= 1) a.current = a.target;
    } else {
      a.current += (a.target - a.current) * (1 - Math.exp(-LAMBDA * dt));
      if (Math.abs(a.target - a.current) < 0.5) a.current = a.target;
    }
    write(a.el, a.current);
    a.expect = a.el.scrollTop;
    if (a.current === a.target) { active = null; return; }
    raf = requestAnimationFrame(frame);
  }

  function run(el, target, anchor) {
    if (!active || active.el !== el) {
      active = { el: el, current: el.scrollTop, target: el.scrollTop, expect: el.scrollTop };
    }
    active.target = Math.max(0, Math.min(maxScroll(el), target));
    active.anchor = anchor || null;
    if (anchor) anchor.from = active.current;
    if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }

  function stop() {
    active = null;
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }

  window.addEventListener("wheel", function (e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey) return;      // pinch / zoom
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;          // horizontal gesture
    try { if (document.querySelector("dialog:modal")) return; } catch (err) { /* :modal unsupported */ }
    var el = pick(e, dy);
    if (!el) return;
    e.preventDefault();
    var base = active && active.el === el && !active.anchor ? active.target : el.scrollTop;
    run(el, base + dy);
  }, { passive: false });

  /* Something else moved the scroller (keyboard, scrollbar, find-in-page): hand control back. */
  document.addEventListener("scroll", function (e) {
    if (!active) return;
    var el = e.target === document ? root : e.target;
    if (el !== active.el) return;
    if (Math.abs(el.scrollTop - active.expect) > 2) stop();
  }, true);
  window.addEventListener("pointerdown", function (e) {
    if (active && e.target === document.documentElement) stop();    // grabbing the page scrollbar
  });
  window.addEventListener("keydown", function (e) {
    if (active && /^(Arrow|Page|Home|End| )/.test(e.key)) stop();
  });

  /* Same-page anchor links glide to their section (honours scroll-margin-top). */
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href^='#']");
    if (!a) return;
    var hash = a.getAttribute("href");
    var target = hash === "#" ? null : document.getElementById(decodeURIComponent(hash.slice(1)));
    if (hash !== "#" && !target) return;
    e.preventDefault();
    var y = 0;
    if (target) {
      var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      y = target.getBoundingClientRect().top + root.scrollTop - margin;
    }
    var distance = Math.abs(y - root.scrollTop);
    run(root, y, { start: performance.now(), duration: Math.min(1400, 600 + distance / 6) });
    if (history.pushState) history.pushState(null, "", hash === "#" ? location.pathname + location.search : hash);
    if (target) {
      if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute("tabindex", "-1");
      target.focus({ preventScroll: true });
    }
  });
})();
