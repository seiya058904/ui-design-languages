/* Braun / Field — optional behaviour (no dependencies). The CSS works without it; this adds:
   - rotary dial: drag around (or up/down), wheel, ←/→/↑/↓ (1), PgUp/PgDn (10), Home/End — one detent
     per step. Keeps --braun-value on .braun-dial, aria-valuenow/-valuetext, and every <output for="id">.
   - fader: keeps --braun-value on input.braun-fader and its <output for> text in sync
   - keys and tabs (role=tablist): click + ←/→/Home/End move aria-selected and show aria-controls panel
   - nav & pagination: plain clicks move aria-current="page"
   - chips, dialogs, alerts/toasts, theme
   - live meters (.braun-meter--live) and oscilloscope (.braun-scope) with automatic offscreen / hidden pause
   Hooks: window.BraunUI.setDial(el, value), .setMeter(el, value), .runSignal(key, on), .runScope(scope, on),
   .setWave(scope, type), .refresh(list), .setTheme(name) */
(function () {
  var P = "braun";
  var INDICATED = "." + P + "-tabs, ." + P + "-nav";
  var TABLISTS = "." + P + "-keys, ." + P + "-tabs";
  var TAB_ITEM = "." + P + "-keys__item, ." + P + "-tabs__item";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }
  function ownsControl(el) {
    if (!isWallHost()) return true;
    var st = el.closest && el.closest("[data-pack-stage]");
    return !!st && st.getAttribute("data-pack-stage") === P;
  }

  /* ---------- travelling needles (tabs: horizontal, nav: vertical) ---------- */
  function itemsOf(list) {
    var sel = list.matches("." + P + "-nav") ? "." + P + "-nav__item" : TAB_ITEM;
    return Array.prototype.filter.call(list.querySelectorAll(sel), function (el) { return el.closest(INDICATED + ", " + TABLISTS) === list; });
  }
  function measure(list) {
    var nav = list.matches("." + P + "-nav");
    var on = itemsOf(list).filter(function (el) { return nav ? el.matches('[aria-current="page"], [aria-current="true"], .is-active') : el.matches('[aria-selected="true"], .is-active'); })[0];
    if (!on) return { nav: nav, o: "0" };
    return nav
      ? { nav: true, o: "1", y: on.offsetTop + 4 + "px", h: Math.max(0, on.offsetHeight - 8) + "px" }
      : { nav: false, o: "1", x: on.offsetLeft + "px", w: on.offsetWidth + "px" };
  }
  function applyMetrics(list, m) {
    if (!m) return;
    var prev = list.__braunMetrics;
    if (prev && prev.o === m.o && prev.x === m.x && prev.y === m.y && prev.w === m.w && prev.h === m.h) return;
    list.__braunMetrics = m;
    var s = list.style;
    s.setProperty("--" + P + "-indicator-o", m.o);
    if (m.o === "0") return;
    if (m.nav) {
      s.setProperty("--" + P + "-indicator-y", m.y);
      s.setProperty("--" + P + "-indicator-h", m.h);
    } else {
      s.setProperty("--" + P + "-indicator-x", m.x);
      s.setProperty("--" + P + "-indicator-w", m.w);
    }
  }
  function refresh(list) { applyMetrics(list, measure(list)); }

  var snapSet = new Set(), snapRaf = 0;
  function flushSnap() {
    snapRaf = 0;
    var lists = Array.from(snapSet);
    snapSet.clear();
    var restore = [];
    for (var i = 0; i < lists.length; i++) {
      if (lists[i].classList.contains("is-animated")) { lists[i].classList.remove("is-animated"); restore.push(lists[i]); }
    }
    var ms = lists.map(measure);
    for (var j = 0; j < lists.length; j++) applyMetrics(lists[j], ms[j]);
    if (restore.length) {
      requestAnimationFrame(function () {
        for (var k = 0; k < restore.length; k++) restore[k].classList.add("is-animated");
      });
    }
  }
  function queueSnap(list) {
    snapSet.add(list);
    if (!snapRaf) snapRaf = requestAnimationFrame(flushSnap);
  }
  var roMap = new WeakMap();
  var sharedRO = "ResizeObserver" in window ? new ResizeObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var list = roMap.get(entries[i].target);
      if (list) queueSnap(list);
    }
  }) : null;

  var settledPromise = null;
  function whenSettled() {
    if (settledPromise) return settledPromise;
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var loaded = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r, { once: true }); });
    settledPromise = Promise.all([fonts, loaded]);
    return settledPromise;
  }

  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(INDICATED) ? [scope] : scope.querySelectorAll(INDICATED);
    var fresh = [];
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__braunIndicator) return;
      list.__braunIndicator = true;
      list.classList.add("has-indicator");
      fresh.push(list);
    });
    if (!fresh.length) return;
    var ms = fresh.map(measure);
    for (var i = 0; i < fresh.length; i++) {
      var list = fresh[i];
      applyMetrics(list, ms[i]);
      if (sharedRO) {
        roMap.set(list, list);
        sharedRO.observe(list);
        itemsOf(list).forEach(function (el) { roMap.set(el, list); sharedRO.observe(el); });
      }
      (function (l) {
        new MutationObserver(function () { if (!l.__braunUpdating) refresh(l); }).observe(l, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
      })(list);
    }
    whenSettled().then(function () {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          var ms2 = fresh.map(measure);
          for (var j = 0; j < fresh.length; j++) {
            applyMetrics(fresh[j], ms2[j]);
            fresh[j].classList.add("is-animated");
          }
        });
      });
    });
  }

  /* ---------- tablists: keys and tabs ---------- */
  function selectTab(tab) {
    var list = tab.closest(TABLISTS);
    if (!list) return;
    list.__braunUpdating = true;
    itemsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (list.matches(INDICATED)) refresh(list);
    Promise.resolve().then(function () { list.__braunUpdating = false; });
  }
  function selectNavItem(link) {
    var list = link.closest("." + P + "-nav");
    if (!list) return;
    list.__braunUpdating = true;
    itemsOf(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__braunUpdating = false; });
  }

  /* ---------- rotary dial ---------- */
  function dialParts(el) {
    var knob = el.matches("." + P + "-dial__knob") ? el : el.querySelector("." + P + "-dial__knob");
    return knob ? { knob: knob, dial: knob.closest("." + P + "-dial") || knob } : null;
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function decimals(n) { return (String(n).split(".")[1] || "").length; }
  function format(v, o, dec) {
    var sc = o.getAttribute("data-scale"), d = o.getAttribute("data-decimals");
    if (sc) { v = v * parseFloat(sc); dec = Math.max(dec, decimals(sc)); }
    if (d !== null) dec = +d;
    return v.toFixed(dec) + (o.getAttribute("data-suffix") || "");
  }
  function setDial(el, value, opts) {
    var p = dialParts(el);
    if (!p) return;
    var k = p.knob;
    var min = num(k.getAttribute("aria-valuemin"), 0), max = num(k.getAttribute("aria-valuemax"), 100), step = num(k.getAttribute("data-step"), 1);
    var dec = decimals(step);
    var raw = Math.min(max, Math.max(min, value));
    var v = +Math.min(max, Math.max(min, Math.round(raw / step) * step)).toFixed(dec);
    var prev = num(k.getAttribute("aria-valuenow"), min);
    var visual = opts && opts.smooth ? raw : v;
    k.setAttribute("aria-valuenow", String(v));
    var unit = k.getAttribute("data-unit") || "";
    k.setAttribute("aria-valuetext", v.toFixed(dec) + (unit ? " " + unit : ""));
    var pct = String((visual - min) / (max - min) * 100);
    if (p.dial.style.getPropertyValue("--" + P + "-value") !== pct) p.dial.style.setProperty("--" + P + "-value", pct);
    if (k.id) document.querySelectorAll('output[for~="' + k.id + '"]').forEach(function (o) { var txt = format(v, o, dec); if (o.textContent !== txt) o.textContent = txt; });
    if (v !== prev && !(opts && opts.silent)) {
      if (!(opts && opts.smooth)) {
        p.dial.classList.remove("is-tick");
        requestAnimationFrame(function () { p.dial.classList.add("is-tick"); });
      }
      if (drag && drag.touch && navigator.vibrate) { try { navigator.vibrate(2); } catch (err) { /* not allowed */ } }
      k.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
  function getDial(k) { return num(k.getAttribute("aria-valuenow"), 0); }
  function commit(k) { k.dispatchEvent(new Event("change", { bubbles: true })); }

  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var k = e.target.closest && e.target.closest("." + P + "-dial__knob");
    if (!k || e.button > 0 || k.getAttribute("aria-disabled") === "true") return;
    var p = dialParts(k), r = k.getBoundingClientRect();
    var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    var dx = e.clientX - cx, dy = e.clientY - cy;
    drag = {
      k: k, dial: p.dial, cx: cx, cy: cy,
      x0: e.clientX, y0: e.clientY, start: getDial(k),
      prevAngle: Math.atan2(dx, -dy) * 180 / Math.PI, accAngle: 0,
      mode: Math.hypot(dx, dy) < 22 ? "slide" : "turn",
      touch: e.pointerType === "touch"
    };
    k.classList.add("is-dragging");
    p.dial.classList.add("is-dragging");
    p.dial.classList.remove("is-tick");
    try { k.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    // Let mouse pointerdown focus natively (keeps :focus-visible off while allowing arrow keys);
    // only suppress default browser gestures on touch/pen.
    if (e.pointerType !== "mouse") e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var k = drag.k, min = num(k.getAttribute("aria-valuemin"), 0), max = num(k.getAttribute("aria-valuemax"), 100);
    if (drag.mode === "slide") {
      setDial(k, drag.start + (drag.y0 - e.clientY) * (max - min) / 180, { smooth: true });
    } else {
      var dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
      if (Math.hypot(dx, dy) < 8) return;
      var cur = Math.atan2(dx, -dy) * 180 / Math.PI;
      var da = cur - drag.prevAngle;
      if (da > 180) da -= 360; else if (da < -180) da += 360;
      drag.prevAngle = cur;
      drag.accAngle += da;
      var raw = Math.max(min, Math.min(max, drag.start + (drag.accAngle / 270) * (max - min)));
      drag.accAngle = ((raw - drag.start) / (max - min)) * 270;
      setDial(k, raw, { smooth: true });
    }
  });
  function endDrag() {
    if (!drag) return;
    var k = drag.k, dial = drag.dial;
    k.classList.remove("is-dragging");
    dial.classList.remove("is-dragging");
    drag = null;
    setDial(k, getDial(k), { silent: true });
    commit(k);
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  function onWheel(e) {
    var k = e.currentTarget;
    e.preventDefault();
    var step = num(k.getAttribute("data-step"), 1);
    if (e.deltaMode !== 0 || Math.abs(e.deltaY) >= 50) {
      k.__braunWheelAcc = 0;
      setDial(k, getDial(k) + (e.deltaY < 0 ? 1 : -1) * step);
    } else {
      k.__braunWheelAcc = (k.__braunWheelAcc || 0) + e.deltaY;
      if (Math.abs(k.__braunWheelAcc) >= 20) {
        var steps = Math.trunc(k.__braunWheelAcc / 20);
        k.__braunWheelAcc -= steps * 20;
        setDial(k, getDial(k) - steps * step);
      }
    }
    clearTimeout(k.__braunWheel);
    k.__braunWheel = setTimeout(function () { k.__braunWheelAcc = 0; commit(k); }, 250);
  }
  function initDials(root) {
    (root || document).querySelectorAll("." + P + "-dial__knob").forEach(function (k) {
      if (k.__braunDial) return;
      k.__braunDial = true;
      k.addEventListener("wheel", onWheel, { passive: false });
      setDial(k, getDial(k), { silent: true });
    });
  }

  /* ---------- fader ---------- */
  function syncFader(input) {
    var min = num(input.min, 0), max = num(input.max, 100), v = num(input.value, 0);
    var pct = String((v - min) / (max - min) * 100);
    if (input.style.getPropertyValue("--" + P + "-value") !== pct) input.style.setProperty("--" + P + "-value", pct);
    if (input.id) document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) {
      var txt = format(v, o, decimals(input.step || 1));
      if (o.textContent !== txt) o.textContent = txt;
    });
  }
  function initFaders(root) {
    (root || document).querySelectorAll("." + P + "-fader").forEach(function (f) {
      if (f.__braunFader) return;
      f.__braunFader = true;
      syncFader(f);
    });
  }

  /* ---------- meters (cached CSS timing tokens, zero per-tick getComputedStyle) ---------- */
  var msCache = {};
  function cssMs(name, fallback) {
    if (name in msCache) return msCache[name];
    var v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--" + P + "-motion-" + name));
    return (msCache[name] = isNaN(v) ? fallback : v);
  }
  function setMeter(el, value) {
    var v = Math.max(0, Math.min(100, value));
    var vs = String(Math.round(v * 10) / 10);
    if (el.style.getPropertyValue("--" + P + "-value") !== vs) el.style.setProperty("--" + P + "-value", vs);
    var rounded = String(Math.round(v));
    if (el.getAttribute("aria-valuenow") !== rounded) el.setAttribute("aria-valuenow", rounded);
    var peak = el.__braunPeakEl !== undefined ? el.__braunPeakEl : (el.__braunPeakEl = el.querySelector("." + P + "-meter__peak"));
    if (!peak) return;
    var st = el.__braunPeak || (el.__braunPeak = { p: 0, cur: 0, until: 0, t: 0 });
    st.cur = v;
    var now = performance.now();
    if (v >= st.p) { st.p = v; st.until = now + cssMs("duration-peak-hold", 900); }
    el.style.setProperty("--" + P + "-peak", String(st.p));
    if (!st.t) st.t = setTimeout(function fall() {
      st.t = 0;
      if (!el.isConnected) return;
      if (performance.now() >= st.until) st.p = Math.max(st.cur, st.p - 100 / 24);
      el.style.setProperty("--" + P + "-peak", String(st.p));
      if (st.p > st.cur + 0.01) st.t = setTimeout(fall, cssMs("duration-decay-step", 60));
    }, cssMs("duration-decay-step", 60));
  }
  var signals = [];
  function signalTargets(key) {
    var scope = key.closest("." + P + "-card, section, [data-" + P + "-module]") || document;
    return Array.prototype.slice.call(scope.querySelectorAll("." + P + "-meter--live"));
  }
  function runSignal(key, on) {
    key.setAttribute("aria-pressed", on ? "true" : "false");
    var meters = signalTargets(key);
    signals = signals.filter(function (s2) { if (s2.key === key) { clearInterval(s2.id); return false; } return true; });
    if (!on) { meters.forEach(function (m) { setMeter(m, 0); }); return; }
    var lv = meters.map(function () { return 40; }), t = 0;
    var id = setInterval(function () {
      if (!key.isConnected) { clearInterval(id); return; }
      if (document.hidden) return;
      t++;
      meters.forEach(function (m, i) {
        var beat = t % 9 === 0 ? 26 : 0, drift = Math.sin((t + i * 7) / 6) * 14;
        lv[i] = Math.max(6, Math.min(100, lv[i] * 0.55 + (58 + drift + beat + (Math.random() - 0.5) * 22) * 0.45));
        setMeter(m, lv[i]);
      });
    }, reduce ? 400 : 70);
    signals.push({ key: key, id: id });
  }

  /* ---------- oscilloscope (cached SVG nodes + auto-pause when hidden or offscreen) ---------- */
  function wave(type, x) {
    var p = x - Math.floor(x);
    if (type === "square") return p < 0.5 ? 0.9 : -0.9;
    if (type === "saw") return 1.8 * p - 0.9;
    return Math.sin(2 * Math.PI * x) * 0.9;
  }
  function tracePath(type, phase, cycles, amp, wobble) {
    var d = "", n = 200;
    for (var i = 0; i <= n; i++) {
      var y = 100 - wave(type, phase + (i / n) * cycles) * amp * 80 + (wobble ? Math.sin(i * 1.7 + phase * 40) * wobble : 0);
      d += (i ? "L" : "M") + (i * 2) + " " + y.toFixed(1);
    }
    return d;
  }
  function scopeOf(el) { var sc = el.closest("[data-" + P + "-module]") || el.closest("." + P + "-card") || el.parentElement; return sc && sc.querySelector("." + P + "-scope"); }
  var scopeIO = "IntersectionObserver" in window ? new IntersectionObserver(function (entries) {
    for (var i = 0; i < entries.length; i++) {
      var sc = entries[i].target, st = sc.__braunScope;
      if (!st) continue;
      st.visible = entries[i].isIntersecting;
      if (st.visible && st.run && !st.raf && !document.hidden) pumpScope(sc);
    }
  }, { rootMargin: "100px 0px" }) : null;

  function scopeState(scope) {
    if (scope.__braunScope) return scope.__braunScope;
    var st = scope.__braunScope = {
      type: "sine", run: false, visible: true, phase: 0, raf: 0, last: 0, prev: "",
      line: scope.querySelector("." + P + "-scope__line"),
      ghost: scope.querySelector("." + P + "-scope__ghost"),
      vpp: scope.querySelector("[data-" + P + "-reading=vpp]"),
      freq: scope.querySelector("[data-" + P + "-reading=freq]")
    };
    if (scopeIO) scopeIO.observe(scope);
    return st;
  }
  function drawScope(scope, d) {
    var st = scopeState(scope);
    if (st.ghost) st.ghost.setAttribute("d", st.prev || d);
    if (st.line) st.line.setAttribute("d", d);
    st.prev = d;
  }
  function setWave(scope, type) {
    var st = scopeState(scope);
    st.type = type;
    if (st.freq) st.freq.textContent = type === "square" ? "220" : type === "saw" ? "330" : "440";
    if (!st.run) { st.prev = ""; drawScope(scope, tracePath(type, 0, 2.5, 1, 0)); }
  }
  var activeScopes = new Set();
  function pumpScope(scope) {
    var st = scopeState(scope);
    cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (!st.run || !st.visible || document.hidden || !scope.isConnected) return;
    var still = reduce;
    function frame(t) {
      st.raf = 0;
      if (!st.run || !st.visible || document.hidden || !scope.isConnected) return;
      if (!st.last || t - st.last >= (still ? 500 : 33)) {
        st.phase = (st.phase + (still ? 0.25 : 0.035)) % 1;
        var amp = 0.92 + Math.sin(t / 900) * 0.06;
        drawScope(scope, tracePath(st.type, st.phase, 2.5, amp, 0.8));
        if (st.vpp) st.vpp.textContent = (3.2 * amp / 0.92).toFixed(2);
        st.last = t;
      }
      st.raf = requestAnimationFrame(frame);
    }
    st.raf = requestAnimationFrame(frame);
  }
  function runScope(scope, on) {
    var st = scopeState(scope);
    st.run = on;
    cancelAnimationFrame(st.raf);
    st.raf = 0;
    if (on) { activeScopes.add(scope); pumpScope(scope); }
    else activeScopes.delete(scope);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) activeScopes.forEach(pumpScope);
  });

  /* ---------- theme ---------- */
  var THEME_KEY = P + "-theme";
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function isDark() { var t = currentTheme(); return t === "dark" || (t === "auto" && !!darkQuery && darkQuery.matches); }
  function syncThemeControls() {
    var t = currentTheme();
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      if (!ownsControl(b)) return;
      var on = b.getAttribute("data-theme-set") === t;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      if (!ownsControl(b)) return;
      if (b.type === "checkbox") b.checked = isDark(); else b.setAttribute("aria-pressed", isDark() ? "true" : "false");
    });
  }
  function setTheme(t) {
    if (!t || t === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    if (!isWallHost()) {
      try { localStorage.setItem(THEME_KEY, t || "light"); } catch (err) { /* not remembered */ }
    }
    syncThemeControls();
    document.dispatchEvent(new CustomEvent(P + ":themechange", { detail: { theme: t || "light", dark: isDark() } }));
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", function () { if (currentTheme() === "auto") syncThemeControls(); });

  /* ---------- events ---------- */
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-fader")) syncFader(e.target); });
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]") && ownsControl(e.target)) setTheme(e.target.checked ? "dark" : "light");
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    var tab = t.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);
    var navItem = t.closest("." + P + "-nav__item");
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }
    var page = t.closest("." + P + "-pagination > a");
    if (page && /^\d+$/.test(page.textContent.trim())) {
      page.parentElement.querySelectorAll("a").forEach(function (a) { if (a === page) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); });
      if (page.getAttribute("href") === "#") e.preventDefault();
    }
    var sig = t.closest("[data-" + P + "-signal]");
    if (sig && !sig.disabled) runSignal(sig, sig.getAttribute("aria-pressed") !== "true");
    var runKey = t.closest('[data-' + P + '-scope="run"]');
    if (runKey && !runKey.disabled) {
      var sc = scopeOf(runKey), on = runKey.getAttribute("aria-pressed") !== "true";
      runKey.setAttribute("aria-pressed", on ? "true" : "false");
      if (sc) runScope(sc, on);
    }
    var waveKey = t.closest("[data-" + P + "-wave]");
    if (waveKey && !waveKey.disabled) { var sw = scopeOf(waveKey); if (sw) setWave(sw, waveKey.getAttribute("data-" + P + "-wave")); }
    var chip = t.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    var themeSet = t.closest("[data-theme-set]");
    if (themeSet && ownsControl(themeSet)) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = t.closest("button[data-theme-toggle]");
    if (themeToggle && ownsControl(themeToggle)) setTheme(isDark() ? "light" : "dark");
    var opener = t.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = t.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(closer.value || closer.getAttribute("data-" + P + "-close") || ""); }
    var dismiss = t.closest("[data-" + P + "-dismiss]");
    if (dismiss) { var box = dismiss.closest("." + P + "-alert, ." + P + "-toast"); if (box) box.hidden = true; }
  });
  document.addEventListener("keydown", function (e) {
    var k = e.target.closest && e.target.closest("." + P + "-dial__knob");
    if (k) {
      var step = num(k.getAttribute("data-step"), 1), v = getDial(k), next = null;
      var min = num(k.getAttribute("aria-valuemin"), 0), max = num(k.getAttribute("aria-valuemax"), 100);
      if (e.key === "ArrowRight" || e.key === "ArrowUp") next = v + step;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = v - step;
      else if (e.key === "PageUp") next = v + step * 10;
      else if (e.key === "PageDown") next = v - step * 10;
      else if (e.key === "Home") next = min;
      else if (e.key === "End") next = max;
      if (next !== null) { e.preventDefault(); setDial(k, next); commit(k); }
      return;
    }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = itemsOf(tab.closest(TABLISTS)).filter(function (x) { return !x.disabled; });
    if (!all.length) return;
    var i = all.indexOf(tab), s = keys[e.key];
    var to = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(i + s + all.length) % all.length];
    to.focus();
    selectTab(to);
    if (to.hasAttribute("data-theme-set") && ownsControl(to)) setTheme(to.getAttribute("data-theme-set"));
    if (to.hasAttribute("data-" + P + "-wave")) { var sw = scopeOf(to); if (sw) setWave(sw, to.getAttribute("data-" + P + "-wave")); }
    e.preventDefault();
  });

  function boot() {
    syncThemeControls();
    initDials(document);
    initFaders(document);
    initIndicators(document);
    var added = [], queued = false;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) if (nodes[j].nodeType === 1) added.push(nodes[j]);
      }
      if (!added.length || queued) return;
      queued = true;
      requestAnimationFrame(function () {
        queued = false;
        var batch = added.splice(0, added.length);
        for (var k = 0; k < batch.length; k++) {
          var n = batch[k];
          if (n.isConnected) { initIndicators(n); initDials(n); initFaders(n); }
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.BraunUI = { runSignal: runSignal, runScope: function (el, on) { runScope(el, on !== false); }, setWave: setWave, setDial: setDial, setMeter: setMeter, refresh: refresh, initIndicators: initIndicators, selectTab: selectTab, selectNavItem: selectNavItem, syncFader: syncFader, setTheme: setTheme, reduceMotion: reduce };
})();
