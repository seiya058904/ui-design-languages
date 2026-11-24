/* Tactile — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators for .tactile-segmented (raised tile), .tactile-tabs (teal key in a groove) and
     .tactile-nav (pressed well)
   - chips: .tactile-chip[aria-pressed] flips on click; .tactile-chip__remove takes an input chip away
   - dials (.tactile-dial): drag around the face, arrows / PageUp / PageDown / Home / End on the knob, or
     [data-tactile-dial="-1|1"] buttons; keeps --tactile-dial (0–1), aria-valuenow / -valuetext and the
     readout in sync and fires input / change on the knob
   - tablists: click + ←/→/Home/End move aria-selected; nav: plain clicks move aria-current="page"
   - sliders: keep --fill / --fill-n on .tactile-range (or the input) and the bubble / <output for> text
   - selectable lists: click a .tactile-list__item to move aria-selected
   - dialogs: [data-tactile-open="#id"] / [data-tactile-close]
   - tone: [data-tone-set="sand|stone"] switches <html data-tone>, remembered in localStorage
   - theme: [data-theme-set="light|dark|auto"] or a [data-theme-toggle] button / checkbox switches
     <html data-theme>, remembered in localStorage "tactile-theme"; fires "tactile:themechange"
   Hooks: window.TactileUI.refresh(el), .initIndicators(root), .setTone(name), .setTheme(name), .syncSlider(input) */
(function () {
  var P = "tactile";
  var GROUPS = [
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' },
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", active: '[aria-selected="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = GROUPS[0].list + ", " + GROUPS[2].list;
  var TAB_ITEM = GROUPS[0].item + ", " + GROUPS[2].item, NAV_ITEM = GROUPS[1].item;

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }
  function ownsControl(el) {
    if (!isWallHost()) return true;
    var st = el.closest && el.closest("[data-pack-stage]");
    return !!st && st.getAttribute("data-pack-stage") === P;
  }

  function groupOf(list) { for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i]; return null; }
  function items(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST) === list; }) : [];
  }

  function measure(list) {
    var g = groupOf(list);
    if (!g) return null;
    var active = items(list).filter(function (el) { return el.matches(g.active); })[0];
    if (!active) return { o: "0" };
    return { o: "1", x: active.offsetLeft + "px", y: active.offsetTop + "px", w: active.offsetWidth + "px", h: active.offsetHeight + "px" };
  }
  function applyMetrics(list, m) {
    if (!m) return;
    var prev = list.__tactileMetrics;
    if (prev && prev.o === m.o && prev.x === m.x && prev.y === m.y && prev.w === m.w && prev.h === m.h) return;
    list.__tactileMetrics = m;
    var s = list.style;
    s.setProperty("--" + P + "-indicator-o", m.o);
    if (m.o === "0") return;
    s.setProperty("--" + P + "-indicator-x", m.x);
    s.setProperty("--" + P + "-indicator-y", m.y);
    s.setProperty("--" + P + "-indicator-w", m.w);
    s.setProperty("--" + P + "-indicator-h", m.h);
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
    var lists = scope.matches && scope.matches(LIST) ? [scope] : scope.querySelectorAll(LIST);
    var fresh = [];
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__tactileIndicator) return;
      list.__tactileIndicator = true;
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
        items(list).forEach(function (el) { roMap.set(el, list); sharedRO.observe(el); });
      }
      (function (l) {
        new MutationObserver(function () { if (!l.__tactileUpdating) refresh(l); }).observe(l, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
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
  function selectTab(tab) {
    var list = tab.closest(TAB_LIST);
    if (!list) return;
    list.__tactileUpdating = true;
    items(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    refresh(list);
    Promise.resolve().then(function () { list.__tactileUpdating = false; });
  }
  function selectNavItem(link) {
    var list = link.closest(GROUPS[1].list);
    if (!list) return;
    list.__tactileUpdating = true;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__tactileUpdating = false; });
  }

  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var n = (v - min) / (max - min);
    var host = input.closest("." + P + "-range") || input;
    var pct = n * 100 + "%", ns = String(n);
    if (host.style.getPropertyValue("--fill") !== pct) host.style.setProperty("--fill", pct);
    if (host.style.getPropertyValue("--fill-n") !== ns) host.style.setProperty("--fill-n", ns);
    var outputs = host.querySelectorAll ? Array.prototype.slice.call(host.querySelectorAll("output")) : [];
    if (input.id) outputs = outputs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outputs.forEach(function (o) {
      var txt = input.value + (o.getAttribute("data-suffix") || "");
      if (o.textContent !== txt) o.textContent = txt;
    });
  }

  var TONE_KEY = P + "-tone";
  function currentTone() {
    if (isWallHost()) {
      var st = document.querySelector('[data-pack-stage="' + P + '"]');
      return (st && st.getAttribute("data-tone")) || "sand";
    }
    return document.documentElement.getAttribute("data-tone") || "sand";
  }
  function syncToneControls() {
    var t = currentTone();
    document.querySelectorAll("[data-tone-set]").forEach(function (b) {
      if (!ownsControl(b)) return;
      var on = b.getAttribute("data-tone-set") === t;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setTone(name) {
    if (isWallHost()) {
      document.querySelectorAll('[data-pack-stage="' + P + '"]').forEach(function (st) {
        if (!name || name === "sand") st.removeAttribute("data-tone"); else st.setAttribute("data-tone", name);
      });
    } else {
      if (!name || name === "sand") document.documentElement.removeAttribute("data-tone");
      else document.documentElement.setAttribute("data-tone", name);
      try { localStorage.setItem(TONE_KEY, name || "sand"); } catch (err) { /* not remembered */ }
    }
    syncToneControls();
  }

  /* ---------- Theme ---------- */
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
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]") && ownsControl(e.target)) setTheme(e.target.checked ? "dark" : "light");
  });

  /* ---------- Dials ---------- */
  function dialParts(dial) { return { knob: dial.querySelector("." + P + "-dial__knob"), out: dial.querySelector("." + P + "-dial__readout b") }; }
  function dialRange(knob) {
    var min = parseFloat(knob.getAttribute("aria-valuemin")), max = parseFloat(knob.getAttribute("aria-valuemax"));
    return { min: isNaN(min) ? 0 : min, max: isNaN(max) ? 100 : max, step: parseFloat(knob.getAttribute("data-step")) || 1 };
  }
  function fmtDial(v, step) { var d = (String(step).split(".")[1] || "").length; return v.toFixed(d); }
  function setDial(dial, value, commit) {
    var p = dialParts(dial), knob = p.knob;
    if (!knob) return;
    var r = dialRange(knob);
    var v = Math.min(r.max, Math.max(r.min, Math.round((value - r.min) / r.step) * r.step + r.min));
    var unit = knob.getAttribute("data-unit") || "";
    var text = fmtDial(v, r.step);
    var changed = String(v) !== String(parseFloat(knob.getAttribute("aria-valuenow")));
    knob.setAttribute("aria-valuenow", text);
    knob.setAttribute("aria-valuetext", text + (unit === "°" ? " °C" : unit ? " " + unit : ""));
    var norm = String(Math.round(((v - r.min) / (r.max - r.min)) * 10000) / 10000);
    if (dial.style.getPropertyValue("--" + P + "-dial") !== norm) dial.style.setProperty("--" + P + "-dial", norm);
    if (p.out && p.out.textContent !== text + unit) p.out.textContent = text + unit;
    if (changed) knob.dispatchEvent(new Event("input", { bubbles: true }));
    if (commit) knob.dispatchEvent(new Event("change", { bubbles: true }));
  }
  function dialValue(knob) { return parseFloat(knob.getAttribute("aria-valuenow")) || 0; }
  /* Drag: caches face centre on pointerdown (zero getBoundingClientRect per pointermove) and clamps
     the bottom dead-zone cleanly without wrapping across min/max. */
  var drag = null;
  document.addEventListener("pointerdown", function (e) {
    var face = e.target.closest && e.target.closest("." + P + "-dial__face");
    if (!face || e.button !== 0) return;
    var dial = face.closest("." + P + "-dial");
    if (!dial || dial.classList.contains("is-disabled")) return;
    var knob = dialParts(dial).knob;
    var rect = face.getBoundingClientRect();
    var r = dialRange(knob);
    var startDeg = ((dialValue(knob) - r.min) / (r.max - r.min)) * 270 - 135;
    drag = { dial: dial, face: face, knob: knob, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2, lastDeg: startDeg };
    dial.classList.add("is-dragging");
    if (face.setPointerCapture) face.setPointerCapture(e.pointerId);
    dragTo(e);
    if (e.pointerType !== "mouse") e.preventDefault();
  });
  function dragTo(e) {
    var dx = e.clientX - drag.cx, dy = e.clientY - drag.cy;
    if (dx * dx + dy * dy < 64) return;
    var deg = Math.atan2(dx, -dy) * 180 / Math.PI;
    // Prevent snapping straight across the bottom dead zone from one stop to the opposite stop.
    if (Math.abs(deg) > 135) deg = drag.lastDeg >= 0 ? 135 : -135;
    drag.lastDeg = deg;
    var r = dialRange(drag.knob);
    setDial(drag.dial, r.min + ((deg + 135) / 270) * (r.max - r.min), false);
  }
  document.addEventListener("pointermove", function (e) { if (drag) dragTo(e); });
  function endDrag() {
    if (!drag) return;
    drag.dial.classList.remove("is-dragging");
    drag.knob.dispatchEvent(new Event("change", { bubbles: true }));
    drag = null;
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });
  document.addEventListener("click", function (e) {
    var tab = e.target.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);
    var navItem = e.target.closest(NAV_ITEM);
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }
    var chip = e.target.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    var chipX = e.target.closest("." + P + "-chip__remove");
    if (chipX) {
      var gone = chipX.closest("." + P + "-chip"), nextFocus = gone && (gone.nextElementSibling || gone.previousElementSibling);
      if (gone) {
        gone.classList.add("is-leaving");
        setTimeout(function () {
          gone.remove();
          var f = nextFocus && (nextFocus.matches("button") ? nextFocus : nextFocus.querySelector("button"));
          if (f) f.focus();
        }, 180);
      }
    }
    var dialBtn = e.target.closest("[data-" + P + "-dial]");
    if (dialBtn) {
      var dl = dialBtn.closest("." + P + "-dial"), kn = dl && dialParts(dl).knob;
      if (kn && !dl.classList.contains("is-disabled")) setDial(dl, dialValue(kn) + (parseFloat(dialBtn.getAttribute("data-" + P + "-dial")) || 0) * dialRange(kn).step, true);
    }
    var row = e.target.closest("." + P + "-list__item");
    if (row) {
      row.parentElement.querySelectorAll("." + P + "-list__item").forEach(function (r) { r.setAttribute("aria-selected", r === row ? "true" : "false"); });
    }
    var tone = e.target.closest("[data-tone-set]");
    if (tone && ownsControl(tone)) setTone(tone.getAttribute("data-tone-set"));
    var themeSet = e.target.closest("[data-theme-set]");
    if (themeSet && ownsControl(themeSet)) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = e.target.closest("button[data-theme-toggle]");
    if (themeToggle && ownsControl(themeToggle)) setTheme(isDark() ? "light" : "dark");
    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = e.target.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(); }
  });
  document.addEventListener("keydown", function (e) {
    var knob = e.target.closest && e.target.closest("." + P + "-dial__knob");
    if (knob) {
      var dl = knob.closest("." + P + "-dial"), r = dialRange(knob), v = dialValue(knob), big = Math.max(r.step, (r.max - r.min) / 10);
      var next = { ArrowUp: v + r.step, ArrowRight: v + r.step, ArrowDown: v - r.step, ArrowLeft: v - r.step, PageUp: v + big, PageDown: v - big, Home: r.min, End: r.max }[e.key];
      if (next !== undefined && dl && !dl.classList.contains("is-disabled")) { setDial(dl, next, true); e.preventDefault(); }
      return;
    }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(TAB_LIST)).filter(function (t) { return !t.disabled; });
    if (!all.length) return;
    var i = all.indexOf(tab), step = keys[e.key];
    var next2 = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(i + step + all.length) % all.length];
    next2.focus();
    selectTab(next2);
    if (next2.hasAttribute("data-tone-set") && ownsControl(next2)) setTone(next2.getAttribute("data-tone-set"));
    if (next2.hasAttribute("data-theme-set") && ownsControl(next2)) setTheme(next2.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncToneControls();
    syncThemeControls();
    document.querySelectorAll("." + P + "-slider").forEach(syncSlider);
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
        for (var k = 0; k < batch.length; k++) if (batch[k].isConnected) initIndicators(batch[k]);
      });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TactileUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider, setTone: setTone, setTheme: setTheme, setDial: function (el, v) { setDial(el, v, true); } };
})();
