/* Terrarium / Earth — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators for .terrarium-segmented (terracotta pill), .terrarium-tabs (moss marker) and
     .terrarium-nav (moss pill), swaying into place on the organic spring
   - tablists: click + ←/→/Home/End move aria-selected and show the matching aria-controls panel;
     nav and pagination: plain clicks move aria-current="page"
   - chips: .terrarium-chip[aria-pressed] toggles; inside [data-terrarium-single] only one stays on
   - sliders: keep --terrarium-value on input.terrarium-slider and its <output> in sync
   - dialogs: [data-terrarium-open="#id"] / [data-terrarium-close]; toasts and alerts: [data-terrarium-dismiss]
   - theme: [data-theme-set="light|dark|auto"] or a [data-theme-toggle] button / checkbox switches
     <html data-theme>, remembered in localStorage "terrarium-theme"; fires "terrarium:themechange"
   Hooks: window.TerrariumUI.setValue(el, n), .toast(title, text), .refresh(list), .setTheme(name), .selectTab(tab) */
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

  function groupOf(list) { for (var i = 0; i < LISTS.length; i++) if (list.matches(LISTS[i].list)) return LISTS[i]; return null; }
  function itemsOf(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST_SEL) === list; }) : [];
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
    var g = groupOf(list), s = list.style;
    var on = itemsOf(list).filter(function (el) { return g.tab ? el.matches('[aria-selected="true"], .is-active') : el.matches('[aria-current="page"], [aria-current="true"], .is-active'); })[0];
    if (!on || on.offsetParent === null) { s.setProperty("--" + P + "-indicator-o", "0"); return; }
    s.setProperty("--" + P + "-indicator-o", "1");
    s.setProperty("--" + P + "-indicator-x", on.offsetLeft + "px");
    s.setProperty("--" + P + "-indicator-y", on.offsetTop + "px");
    s.setProperty("--" + P + "-indicator-w", on.offsetWidth + "px");
    s.setProperty("--" + P + "-indicator-h", on.offsetHeight + "px");
  }
  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST_SEL) ? [scope] : scope.querySelectorAll(LIST_SEL);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__terrariumIndicator) return;
      list.__terrariumIndicator = true;
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
    refresh(list);
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

  /* ---------- values: rings, bars, sliders ---------- */
  function setValue(el, n) {
    var v = Math.max(0, Math.min(100, Math.round(n)));
    el.style.setProperty("--" + P + "-value", String(v));
    if (el.getAttribute("role") === "progressbar") el.setAttribute("aria-valuenow", String(v));
    if (el.getAttribute("role") === "img" && el.hasAttribute("data-label")) el.setAttribute("aria-label", v + "% " + el.getAttribute("data-label"));
  }
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    input.style.setProperty("--" + P + "-value", String(Math.round((v - min) / (max - min) * 100)));
    var outs = [];
    var range = input.closest("." + P + "-range");
    if (range) outs = Array.prototype.slice.call(range.querySelectorAll("output"));
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
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
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });
  document.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("input[data-theme-toggle]")) setTheme(e.target.checked ? "dark" : "light"); });
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
    if (chip && !chip.disabled) {
      var group = chip.closest("[data-" + P + "-single]");
      if (group) group.querySelectorAll("." + P + "-chip[aria-pressed]").forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      else chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }
    var themeSet = t.closest("[data-theme-set]");
    if (themeSet) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = t.closest("button[data-theme-toggle]");
    if (themeToggle) setTheme(isDark() ? "light" : "dark");
    var opener = t.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = t.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(closer.value || closer.getAttribute("data-" + P + "-close") || ""); }
    var dismiss = t.closest("[data-" + P + "-dismiss]");
    if (dismiss) { var box = dismiss.closest("." + P + "-toast, ." + P + "-alert"); if (box) box.hidden = true; }
  });
  document.addEventListener("keydown", function (e) {
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
    document.querySelectorAll("." + P + "-slider").forEach(syncSlider);
    initIndicators(document);
    var q = false;
    new MutationObserver(function () {
      if (q) return;
      q = true;
      requestAnimationFrame(function () { q = false; initIndicators(document); document.querySelectorAll("." + P + "-slider").forEach(syncSlider); });
    }).observe(document.body, { childList: true, subtree: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { document.querySelectorAll(LIST_SEL).forEach(refresh); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.TerrariumUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, setValue: setValue, syncSlider: syncSlider, toast: toast, setTheme: setTheme };
})();
