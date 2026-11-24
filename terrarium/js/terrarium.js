/* Terrarium / Earth — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators for .terrarium-segmented (terracotta pill), .terrarium-tabs (moss marker) and
     .terrarium-nav (moss pill), swaying into place on the organic spring
   - tablists, nav & pagination, chips, sliders, dialogs, toasts, theme
   - gardens (.terrarium-garden), watering calendars (.terrarium-calendar), mood dials (.terrarium-mood)
   Hooks: window.TerrariumUI.setValue(el, n), .toast(title, text), .refresh(list), .setTheme(name), .selectTab(tab), .setMood(el, i) */
(function () {
  var P = "terrarium";
  var LISTS = [
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", tab: true },
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", tab: true },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", tab: false }
  ];
  var LIST_SEL = LISTS.map(function (g) { return g.list; }).join(", ");
  var TAB_ITEM = "." + P + "-segmented__item, ." + P + "-tabs__item";
  var TABLISTS = "." + P + "-segmented, ." + P + "-tabs";

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }
  function ownsControl(el) {
    if (!isWallHost()) return true;
    var st = el.closest && el.closest("[data-pack-stage]");
    return !!st && st.getAttribute("data-pack-stage") === P;
  }

  function groupOf(list) { for (var i = 0; i < LISTS.length; i++) if (list.matches(LISTS[i].list)) return LISTS[i]; return null; }
  function itemsOf(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST_SEL) === list; }) : [];
  }

  function measure(list) {
    var g = groupOf(list);
    if (!g) return null;
    var on = itemsOf(list).filter(function (el) { return g.tab ? el.matches('[aria-selected="true"], .is-active') : el.matches('[aria-current="page"], [aria-current="true"], .is-active'); })[0];
    if (!on || on.offsetParent === null) return { o: "0" };
    return { o: "1", x: on.offsetLeft + "px", y: on.offsetTop + "px", w: on.offsetWidth + "px", h: on.offsetHeight + "px" };
  }
  function applyMetrics(list, m) {
    if (!m) return;
    var prev = list.__terrariumMetrics;
    if (prev && prev.o === m.o && prev.x === m.x && prev.y === m.y && prev.w === m.w && prev.h === m.h) return;
    list.__terrariumMetrics = m;
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
    var lists = scope.matches && scope.matches(LIST_SEL) ? [scope] : scope.querySelectorAll(LIST_SEL);
    var fresh = [];
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__terrariumIndicator) return;
      list.__terrariumIndicator = true;
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
        new MutationObserver(function () { if (!l.__terrariumUpdating) refresh(l); }).observe(l, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
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
    var list = tab.closest(TABLISTS);
    if (!list) return;
    list.__terrariumUpdating = true;
    itemsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    refresh(list);
    Promise.resolve().then(function () { list.__terrariumUpdating = false; });
  }
  function selectNavItem(link) {
    var list = link.closest("." + P + "-nav");
    if (!list) return;
    list.__terrariumUpdating = true;
    itemsOf(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__terrariumUpdating = false; });
  }

  /* ---------- values: rings, bars, sliders ---------- */
  function setValue(el, n) {
    var v = Math.max(0, Math.min(100, Math.round(n)));
    var vs = String(v);
    if (el.style.getPropertyValue("--" + P + "-value") !== vs) el.style.setProperty("--" + P + "-value", vs);
    if (el.getAttribute("role") === "progressbar") el.setAttribute("aria-valuenow", vs);
    if (el.getAttribute("role") === "img" && el.hasAttribute("data-label")) el.setAttribute("aria-label", v + "% " + el.getAttribute("data-label"));
  }
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var pct = String(Math.round((v - min) / (max - min) * 100));
    if (input.style.getPropertyValue("--" + P + "-value") !== pct) input.style.setProperty("--" + P + "-value", pct);
    var outs = [];
    var range = input.closest("." + P + "-range");
    if (range) outs = Array.prototype.slice.call(range.querySelectorAll("output"));
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) {
      var txt = input.value + (o.getAttribute("data-suffix") || "");
      if (o.textContent !== txt) o.textContent = txt;
    });
  }
  function initSliders(root) {
    (root || document).querySelectorAll("." + P + "-slider").forEach(function (s) {
      if (s.__terrariumSlider) return;
      s.__terrariumSlider = true;
      syncSlider(s);
    });
  }

  /* ---------- toasts ---------- */
  function toast(title, text, opts) {
    var host = document.querySelector("[data-" + P + "-toasts]");
    if (!host) return null;
    var t = document.createElement("div");
    t.className = P + "-toast";
    t.setAttribute("role", "status");
    t.innerHTML = '<span class="' + P + '-toast__icon"><svg class="' + P + '-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12.5 10.2 16.5 18 8"/></svg></span><p class="' + P + '-toast__title"><span></span><span class="' + P + '-toast__text"></span></p><button class="' + P + '-toast__close" type="button" aria-label="Dismiss" data-' + P + '-dismiss><svg class="' + P + '-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17"/></svg></button>';
    t.querySelector("." + P + "-toast__title > span").textContent = title;
    t.querySelector("." + P + "-toast__text").textContent = text || "";
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, (opts && opts.duration) || 3800);
    return t;
  }

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
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });

  /* ---------- garden ---------- */
  var WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six"];
  function tendGarden(g) {
    var boxes = Array.prototype.slice.call(g.querySelectorAll("." + P + "-garden__list input[type=checkbox]"));
    if (!boxes.length) return;
    var done = boxes.filter(function (b) { return b.checked; }).length, left = boxes.length - done;
    var pct = Math.round(done / boxes.length * 100);
    setValue(g, pct);
    var ring = g.querySelector("." + P + "-ring");
    if (ring) setValue(ring, pct);
    var note = g.querySelector("." + P + "-garden__note");
    if (note) note.textContent = left === 0 ? "Today is fully tended. Lovely." : (left === 1 ? "One more" : (WORDS[left] || left) + " more") + " and today is fully tended.";
  }

  /* ---------- watering calendar ---------- */
  function countStreak(cal) {
    var days = Array.prototype.slice.call(cal.querySelectorAll("." + P + "-calendar__day"));
    var today = days.filter(function (d) { return d.getAttribute("aria-current") === "date"; })[0];
    var i = today ? days.indexOf(today) : days.length - 1, n = 0;
    if (today && today.getAttribute("aria-pressed") !== "true") i--;
    for (; i >= 0 && days[i].getAttribute("aria-pressed") === "true"; i--) n++;
    var out = cal.querySelector("." + P + "-calendar__streak b");
    if (out) out.textContent = String(n);
  }

  /* ---------- mood dial ---------- */
  function setMood(dial, i) {
    var opts = Array.prototype.slice.call(dial.querySelectorAll("." + P + "-mood__option"));
    i = Math.max(0, Math.min(opts.length - 1, i));
    opts.forEach(function (o, k) { o.setAttribute("aria-checked", k === i ? "true" : "false"); o.tabIndex = k === i ? 0 : -1; });
    dial.style.setProperty("--" + P + "-mood", String(i));
    dial.setAttribute("data-mood", String(i));
    var label = dial.querySelector("." + P + "-mood__label");
    if (label && opts[i]) label.textContent = opts[i].getAttribute("data-label") || opts[i].textContent.trim();
    dial.dispatchEvent(new CustomEvent(P + ":mood", { bubbles: true, detail: { index: i, label: label ? label.textContent : "" } }));
  }

  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]") && ownsControl(e.target)) setTheme(e.target.checked ? "dark" : "light");
    var g = e.target.closest && e.target.closest("." + P + "-garden");
    if (g) tendGarden(g);
  });
  document.addEventListener("click", function (e) {
    var day = e.target.closest && e.target.closest("." + P + "-calendar__day");
    if (day && !day.disabled) {
      day.setAttribute("aria-pressed", day.getAttribute("aria-pressed") === "true" ? "false" : "true");
      var cal = day.closest("." + P + "-calendar");
      if (cal) countStreak(cal);
    }
    var mood = e.target.closest && e.target.closest("." + P + "-mood__option");
    if (mood) { var md = mood.closest("." + P + "-mood"); if (md) setMood(md, Array.prototype.indexOf.call(md.querySelectorAll("." + P + "-mood__option"), mood)); }
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
    if (chip && !chip.disabled) {
      var group = chip.closest("[data-" + P + "-single]");
      if (group) group.querySelectorAll("." + P + "-chip[aria-pressed]").forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      else chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }
    var themeSet = t.closest("[data-theme-set]");
    if (themeSet && ownsControl(themeSet)) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = t.closest("button[data-theme-toggle]");
    if (themeToggle && ownsControl(themeToggle)) setTheme(isDark() ? "light" : "dark");
    var opener = t.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = t.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(closer.value || closer.getAttribute("data-" + P + "-close") || ""); }
    var dismiss = t.closest("[data-" + P + "-dismiss]");
    if (dismiss) { var box = dismiss.closest("." + P + "-toast, ." + P + "-alert"); if (box) box.hidden = true; }
  });
  document.addEventListener("keydown", function (e) {
    var mopt = e.target.closest && e.target.closest("." + P + "-mood__option");
    if (mopt && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Home" || e.key === "End")) {
      var dl = mopt.closest("." + P + "-mood"), opts = Array.prototype.slice.call(dl.querySelectorAll("." + P + "-mood__option"));
      var at = opts.indexOf(mopt), to = e.key === "Home" ? 0 : e.key === "End" ? opts.length - 1 : at + (e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : -1);
      to = Math.max(0, Math.min(opts.length - 1, to));
      setMood(dl, to);
      opts[to].focus();
      e.preventDefault();
      return;
    }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = itemsOf(tab.closest(TABLISTS)).filter(function (x) { return !x.disabled; });
    if (!all.length) return;
    var i = all.indexOf(tab), s = keys[e.key];
    var to2 = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(i + s + all.length) % all.length];
    to2.focus();
    selectTab(to2);
    if (to2.hasAttribute("data-theme-set") && ownsControl(to2)) setTheme(to2.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncThemeControls();
    initSliders(document);
    initIndicators(document);
    var added = [], q = false;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) if (nodes[j].nodeType === 1) added.push(nodes[j]);
      }
      if (!added.length || q) return;
      q = true;
      requestAnimationFrame(function () {
        q = false;
        var batch = added.splice(0, added.length);
        for (var k = 0; k < batch.length; k++) {
          var n = batch[k];
          if (n.isConnected) { initIndicators(n); initSliders(n); }
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { document.querySelectorAll(LIST_SEL).forEach(queueSnap); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TerrariumUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, setValue: setValue, syncSlider: syncSlider, toast: toast, setTheme: setTheme, setMood: setMood };
})();
