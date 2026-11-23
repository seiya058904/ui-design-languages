/* Braun / Field — optional behaviour (no dependencies). The CSS works without it; this adds:
   - rotary dial: drag around (or up/down), wheel, ←/→/↑/↓ (1), PgUp/PgDn (10), Home/End — one detent
     per step. Keeps --braun-value on .braun-dial, aria-valuenow/-valuetext, and every <output for="id">.
     Fires a bubbling "input" event on the knob (and "change" when a drag or key press ends).
   - fader: keeps --braun-value on input.braun-fader and its <output for> text in sync
   - keys and tabs (role=tablist): click + ←/→/Home/End move aria-selected and show the matching
     aria-controls panel; tabs and the sidebar nav get a travelling needle
   - nav: plain clicks move aria-current="page"; pagination keys too
   - chips: .braun-chip[aria-pressed] latches on click
   - dialogs: [data-braun-open="#id"] / [data-braun-close]; alerts and toasts: [data-braun-dismiss]
   - theme: [data-theme-set="light|dark|auto"] or a [data-theme-toggle] button / checkbox switches
     <html data-theme>, remembered in localStorage "braun-theme"; fires "braun:themechange"
   Hooks: window.BraunUI.setDial(el, value), .setMeter(el, value), .refresh(list), .setTheme(name) */
(function () {
  var P = "braun";
  var INDICATED = "." + P + "-tabs, ." + P + "-nav";
  var TABLISTS = "." + P + "-keys, ." + P + "-tabs";
  var TAB_ITEM = "." + P + "-keys__item, ." + P + "-tabs__item";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- travelling needles (tabs: horizontal, nav: vertical) ---------- */
  function itemsOf(list) {
    var sel = list.matches("." + P + "-nav") ? "." + P + "-nav__item" : TAB_ITEM;
    return Array.prototype.filter.call(list.querySelectorAll(sel), function (el) { return el.closest(INDICATED + ", " + TABLISTS) === list; });
  }
  /* Layout changes (resize, fonts) move an indicator instantly; only a new selection glides. */
  function snapTo(list) {
    var on = list.classList.contains("is-animated");
    if (on) list.classList.remove("is-animated");
    refresh(list);
    if (on) { void list.offsetWidth; list.classList.add("is-animated"); }
  }
  /* Turn indicator transitions on only once the page has settled (loaded, fonts ready), after a final
     measurement — so an indicator never glides in from a stale first-frame position on load. */
  function settle(fn) {
    var fonts = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    var loaded = document.readyState === "complete" ? Promise.resolve() : new Promise(function (r) { window.addEventListener("load", r, { once: true }); });
    Promise.all([fonts, loaded]).then(function () { requestAnimationFrame(function () { requestAnimationFrame(fn); }); });
  }
  function refresh(list) {
    var nav = list.matches("." + P + "-nav");
    var on = itemsOf(list).filter(function (el) { return nav ? el.matches('[aria-current="page"], [aria-current="true"], .is-active') : el.matches('[aria-selected="true"], .is-active'); })[0];
    var s = list.style;
    if (!on) { s.setProperty("--" + P + "-indicator-o", "0"); return; }
    s.setProperty("--" + P + "-indicator-o", "1");
    if (nav) {
      s.setProperty("--" + P + "-indicator-y", on.offsetTop + 4 + "px");
      s.setProperty("--" + P + "-indicator-h", Math.max(0, on.offsetHeight - 8) + "px");
    } else {
      s.setProperty("--" + P + "-indicator-x", on.offsetLeft + "px");
      s.setProperty("--" + P + "-indicator-w", on.offsetWidth + "px");
    }
  }
  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(INDICATED) ? [scope] : scope.querySelectorAll(INDICATED);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__braunIndicator) return;
      list.__braunIndicator = true;
      list.classList.add("has-indicator");
      refresh(list);
      settle(function () { refresh(list); list.classList.add("is-animated"); });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { snapTo(list); });
        ro.observe(list);
        itemsOf(list).forEach(function (el) { ro.observe(el); });
      }
      new MutationObserver(function () { refresh(list); }).observe(list, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
    });
  }

  /* ---------- tablists: keys and tabs ---------- */
  function selectTab(tab) {
    var list = tab.closest(TABLISTS);
    if (!list) return;
    itemsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    if (list.matches(INDICATED)) refresh(list);
  }
  function selectNavItem(link) {
    var list = link.closest("." + P + "-nav");
    if (!list) return;
    itemsOf(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  /* ---------- rotary dial ---------- */
  function dialParts(el) {
    var knob = el.matches("." + P + "-dial__knob") ? el : el.querySelector("." + P + "-dial__knob");
    return knob ? { knob: knob, dial: knob.closest("." + P + "-dial") || knob } : null;
  }
  function num(v, d) { var n = parseFloat(v); return isNaN(n) ? d : n; }
  function decimals(n) { return (String(n).split(".")[1] || "").length; }
  /* An <output>: data-scale multiplies the value (tenths → units), data-decimals fixes the places, data-suffix appends. */
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
    var v = +Math.min(max, Math.max(min, Math.round(value / step) * step)).toFixed(dec);
    var prev = num(k.getAttribute("aria-valuenow"), min);
    k.setAttribute("aria-valuenow", String(v));
    var unit = k.getAttribute("data-unit") || "";
    k.setAttribute("aria-valuetext", v.toFixed(dec) + (unit ? " " + unit : ""));
    p.dial.style.setProperty("--" + P + "-value", String((v - min) / (max - min) * 100));
    if (k.id) document.querySelectorAll('output[for~="' + k.id + '"]').forEach(function (o) { o.textContent = format(v, o, dec); });
    if (v !== prev && !(opts && opts.silent)) k.dispatchEvent(new Event("input", { bubbles: true }));
  }
  function getDial(k) { return num(k.getAttribute("aria-valuenow"), 0); }
  function commit(k) { k.dispatchEvent(new Event("change", { bubbles: true })); }

  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var k = e.target.closest && e.target.closest("." + P + "-dial__knob");
    if (!k || e.button > 0 || k.getAttribute("aria-disabled") === "true") return;
    var r = k.getBoundingClientRect();
    drag = { k: k, cx: r.left + r.width / 2, cy: r.top + r.height / 2, y: e.clientY, start: getDial(k), last: null, mode: null, x0: e.clientX };
    k.classList.add("is-dragging");
    try { k.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    k.focus({ preventScroll: true });
    e.preventDefault();
  });
  document.addEventListener("pointermove", function (e) {
    if (!drag) return;
    var k = drag.k, min = num(k.getAttribute("aria-valuemin"), 0), max = num(k.getAttribute("aria-valuemax"), 100);
    var dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
    // Close to the centre, turning is ambiguous: use vertical travel (up = more), like a studio knob.
    if (!drag.mode) drag.mode = Math.hypot(dx, dy) > 24 ? "turn" : Math.abs(e.clientY - drag.y) > 3 ? "slide" : null;
    if (drag.mode === "slide") {
      setDial(k, drag.start + (drag.y - e.clientY) * (max - min) / 180);
    } else if (drag.mode === "turn") {
      var a = Math.atan2(dx, -dy) * 180 / Math.PI; // 0° at 12 o'clock, clockwise
      a = Math.max(-135, Math.min(135, a));
      if (drag.last !== null && Math.abs(a - drag.last) > 200) return; // ignore the jump across the dead zone at the bottom
      drag.last = a;
      setDial(k, min + (a + 135) / 270 * (max - min));
    }
  });
  function endDrag() { if (!drag) return; drag.k.classList.remove("is-dragging"); commit(drag.k); drag = null; }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  /* Wheel turns a knob one detent per notch. Bound to each knob (not the document) so page scrolling
     everywhere else stays passive. */
  function onWheel(e) {
    var k = e.currentTarget;
    e.preventDefault();
    setDial(k, getDial(k) + (e.deltaY < 0 ? 1 : -1) * num(k.getAttribute("data-step"), 1));
    clearTimeout(k.__braunWheel);
    k.__braunWheel = setTimeout(function () { commit(k); }, 250);
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
    input.style.setProperty("--" + P + "-value", String((v - min) / (max - min) * 100));
    if (input.id) document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) { o.textContent = format(v, o, decimals(input.step || 1)); });
  }

  /* ---------- meters ---------- */
  function setMeter(el, value) {
    var v = Math.max(0, Math.min(100, value));
    el.style.setProperty("--" + P + "-value", String(v));
    el.setAttribute("aria-valuenow", String(Math.round(v)));
  }

  /* ---------- theme ---------- */
  var THEME_KEY = P + "-theme";
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;
  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function isDark() { var t = currentTheme(); return t === "dark" || (t === "auto" && !!darkQuery && darkQuery.matches); }
  function syncThemeControls() {
    var t = currentTheme();
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      var on = b.getAttribute("data-theme-set") === t;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      if (b.type === "checkbox") b.checked = isDark(); else b.setAttribute("aria-pressed", isDark() ? "true" : "false");
    });
  }
  function setTheme(t) {
    if (!t || t === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t || "light"); } catch (err) { /* not remembered */ }
    syncThemeControls();
    document.dispatchEvent(new CustomEvent(P + ":themechange", { detail: { theme: t || "light", dark: isDark() } }));
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", function () { if (currentTheme() === "auto") syncThemeControls(); });

  /* ---------- events ---------- */
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-fader")) syncFader(e.target); });
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]")) setTheme(e.target.checked ? "dark" : "light");
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
    var chip = t.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    var themeSet = t.closest("[data-theme-set]");
    if (themeSet) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = t.closest("button[data-theme-toggle]");
    if (themeToggle) setTheme(isDark() ? "light" : "dark");
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
    var i = all.indexOf(tab), s = keys[e.key];
    var to = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(i + s + all.length) % all.length];
    to.focus();
    selectTab(to);
    if (to.hasAttribute("data-theme-set")) setTheme(to.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncThemeControls();
    initDials(document);
    document.querySelectorAll("." + P + "-fader").forEach(syncFader);
    initIndicators(document);
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initIndicators(document); initDials(document); document.querySelectorAll("." + P + "-fader").forEach(syncFader); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.BraunUI = { setDial: setDial, setMeter: setMeter, refresh: refresh, initIndicators: initIndicators, selectTab: selectTab, selectNavItem: selectNavItem, syncFader: syncFader, setTheme: setTheme, reduceMotion: reduce };
})();
