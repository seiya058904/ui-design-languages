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
  var reduceQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (reduceQuery && reduceQuery.matches) return;

  var LAMBDA = 8.0;      // damping per second: responsive yet silky
  var MIN_BOX = 320;     // scroll boxes shorter than this stay native
  var root = document.scrollingElement || document.documentElement;
  var active = null;     // { el, current, target, anchor, writing }
  var last = 0;
  var raf = 0;
  var dialogs = document.getElementsByTagName("dialog"); // live O(1) HTMLCollection

  root.style.scrollBehavior = "auto"; // CSS smooth scrolling would fight the per-frame writes

  function overflowY(el) { return getComputedStyle(el).overflowY; }
  function maxScroll(el) { return el.scrollHeight - el.clientHeight; }
  function canMove(el, dy) {
    var pos = el === (active && active.el) ? active.target : el.scrollTop;
    return dy > 0 ? pos < maxScroll(el) - 1 : pos > 0;
  }
  function rootLocked() {
    var htmlStyle = document.documentElement.classList.contains("has-drawer") ? "hidden" : overflowY(document.documentElement);
    return htmlStyle === "hidden" || (document.body && overflowY(document.body) === "hidden");
  }
  function hasOpenModal() {
    if (!dialogs.length) return false;
    for (var i = 0; i < dialogs.length; i++) {
      if (dialogs[i].open) {
        try { if (dialogs[i].matches(":modal")) return true; } catch (err) { return true; }
      }
    }
    return false;
  }

  /* Cache wheel target resolution briefly to avoid composedPath + getComputedStyle on every 120Hz tick. */
  var pickCache = { target: null, dir: 0, el: null, time: 0 };

  /* The element that should take this wheel step: the nearest ancestor (through shadow roots)
     that scrolls vertically and still has room in that direction; else the page. null = native. */
  function pick(e, dy) {
    var dir = dy > 0 ? 1 : -1;
    var now = e.timeStamp || performance.now();
    if (pickCache.target === e.target && pickCache.dir === dir && now - pickCache.time < 120) {
      if (!pickCache.el) return null;
      if (pickCache.el === root ? (!rootLocked() && canMove(root, dy)) : canMove(pickCache.el, dy)) return pickCache.el;
    }

    var resolved = null;
    var path = e.composedPath ? e.composedPath() : [];
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (!el || el.nodeType !== 1) continue;
      if (el === document.documentElement || el === document.body) break;
      if (el.hasAttribute("data-native-scroll")) { resolved = null; break; }
      var tag = el.tagName;
      if (tag === "PRE" && el.scrollHeight > el.clientHeight + 1) { resolved = null; break; } // keep code blocks crisp & native
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      var oy = overflowY(el);
      if (tag !== "TEXTAREA" && tag !== "SELECT" && oy !== "auto" && oy !== "scroll" && oy !== "overlay") continue;
      if (!canMove(el, dy)) continue;            // at its edge: chain to the parent
      if (tag === "TEXTAREA" || tag === "SELECT" || el.clientHeight < MIN_BOX) { resolved = null; break; }
      var snap = getComputedStyle(el).scrollSnapType;
      if (snap && snap !== "none") { resolved = null; break; }
      resolved = el;
      break;
    }
    if (!resolved && i < path.length && (path[i] === document.documentElement || path[i] === document.body)) {
      if (!rootLocked() && canMove(root, dy)) resolved = root;
    } else if (!resolved && i === path.length) {
      if (!rootLocked() && canMove(root, dy)) resolved = root;
    }

    pickCache.target = e.target;
    pickCache.dir = dir;
    pickCache.el = resolved;
    pickCache.time = now;
    return resolved;
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
    a.expect = a.current;
    a.writing = true;
    write(a.el, a.current);
    a.writing = false;
    if (a.current === a.target) { active = null; return; }
    raf = requestAnimationFrame(frame);
  }

  function run(el, target, anchor) {
    if (!active || active.el !== el) {
      var pos = el.scrollTop;
      active = { el: el, current: pos, target: pos, expect: pos, writing: false };
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
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || (reduceQuery && reduceQuery.matches)) return;
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 16;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    if (!dy || Math.abs(e.deltaX) > Math.abs(dy)) return;          // horizontal gesture
    if (hasOpenModal()) return;
    var el = pick(e, dy);
    if (!el) return;
    e.preventDefault();
    var base = active && active.el === el && !active.anchor ? active.target : el.scrollTop;
    run(el, base + dy);
  }, { passive: false });

  /* Something else moved the scroller (keyboard, scrollbar, find-in-page): hand control back. */
  document.addEventListener("scroll", function (e) {
    if (!active || active.writing) return;
    var el = e.target === document ? root : e.target;
    if (el !== active.el) return;
    if (Math.abs(el.scrollTop - active.expect) > 3) stop();
  }, { capture: true, passive: true });
  window.addEventListener("pointerdown", function (e) {
    if (active && e.target === document.documentElement) stop();    // grabbing the page scrollbar
  }, { passive: true });
  window.addEventListener("keydown", function (e) {
    if (active && /^(Arrow|Page|Home|End| )/.test(e.key)) stop();
  });

  /* Same-page anchor links glide to their section (honours scroll-margin-top). */
  window.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest && e.target.closest("a[href^='#']");
    if (!a) return;
    var hash = a.getAttribute("href");
    if (hash === "#") { e.preventDefault(); return; }
    var target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    var margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    var y = target.getBoundingClientRect().top + root.scrollTop - margin;
    if (reduceQuery && reduceQuery.matches) {
      write(root, y);
    } else {
      var distance = Math.abs(y - root.scrollTop);
      run(root, y, { start: performance.now(), duration: Math.min(1200, 520 + distance / 7) });
    }
    if (history.pushState) history.pushState(null, "", hash);
    if (!target.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });
})();
