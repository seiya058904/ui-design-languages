/* Atelier — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators (iOS-style glide) for .atelier-pills, .atelier-segmented and .atelier-nav
   - tablists: click + ←/→/Home/End move aria-selected; nav: plain clicks move aria-current="page"
   - sliders: keep --fill and a linked <output for="id"> in sync
   - dialogs: [data-atelier-open="#id"] / [data-atelier-close]
   - appearance: theme, accent, density, radius, motion and contrast, stored in localStorage
     ("atelier-appearance") and applied to <html>. Controls declare what they change:
       <button data-appearance="theme" data-value="dark">          (light | dark | auto)
       <button data-appearance="accent" data-value="violet">       (cobalt | violet | cyan | green | orange)
       <input type="range" data-appearance="density" min="0" max="2">  (cozy | balanced | compact)
       <input type="range" data-appearance="radius" min="8" max="24" step="4">
       <input type="checkbox" data-appearance="motion">            (checked = reduced)
       <input type="checkbox" data-appearance="contrast">          (checked = high)
     Other open pages and iframes of the same site update live through the storage event.
   Hooks: window.AtelierUI.setAppearance({ accent: "green" }), .getAppearance(), .refresh(el), .initIndicators(root) */
(function () {
  var P = "atelier";
  var GROUPS = [
    { list: "." + P + "-pills", item: "." + P + "-pills__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = GROUPS[0].list + ", " + GROUPS[1].list;
  var TAB_ITEM = GROUPS[0].item + ", " + GROUPS[1].item;
  var NAV_ITEM = GROUPS[2].item;

  function groupOf(list) { for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i]; return null; }
  function items(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST) === list; }) : [];
  }
  function refresh(list) {
    var g = groupOf(list);
    if (!g) return;
    var active = items(list).filter(function (el) { return el.matches(g.active); })[0];
    var s = list.style;
    if (!active) { s.setProperty("--" + P + "-indicator-o", "0"); return; }
    s.setProperty("--" + P + "-indicator-o", "1");
    s.setProperty("--" + P + "-indicator-x", active.offsetLeft + "px");
    s.setProperty("--" + P + "-indicator-y", active.offsetTop + "px");
    s.setProperty("--" + P + "-indicator-w", active.offsetWidth + "px");
    s.setProperty("--" + P + "-indicator-h", active.offsetHeight + "px");
  }
  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST) ? [scope] : scope.querySelectorAll(LIST);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__atelierIndicator) return;
      list.__atelierIndicator = true;
      list.classList.add("has-indicator");
      refresh(list);
      requestAnimationFrame(function () { requestAnimationFrame(function () { list.classList.add("is-animated"); }); });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { refresh(list); });
        ro.observe(list);
        items(list).forEach(function (el) { ro.observe(el); });
      }
      new MutationObserver(function () { refresh(list); }).observe(list, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
    });
  }
  function selectTab(tab) {
    var list = tab.closest(TAB_LIST);
    if (!list) return;
    items(list).forEach(function (t) {
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
    var list = link.closest(LIST);
    if (!list) return;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  /* ---------- Sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    input.style.setProperty("--fill", ((v - min) / (max - min)) * 100 + "%");
    if (input.id) document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
  }

  /* ---------- Appearance ---------- */
  var KEY = P + "-appearance";
  var DEFAULTS = { theme: "light", accent: "cobalt", density: "balanced", radius: 16, motion: "full", contrast: "normal" };
  var DENSITY = ["cozy", "balanced", "compact"];
  function read() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (err) { s = {}; }
    var out = {};
    for (var k in DEFAULTS) out[k] = s[k] != null ? s[k] : DEFAULTS[k];
    return out;
  }
  var state = read();
  function attr(name, value, fallback) {
    var d = document.documentElement;
    if (value === fallback) d.removeAttribute(name); else d.setAttribute(name, value);
  }
  function apply() {
    attr("data-theme", state.theme, "light");
    attr("data-accent", state.accent, "cobalt");
    attr("data-density", state.density, "balanced");
    attr("data-motion", state.motion, "full");
    attr("data-contrast", state.contrast, "normal");
    if (+state.radius === DEFAULTS.radius) document.documentElement.style.removeProperty("--" + P + "-radius-base");
    else document.documentElement.style.setProperty("--" + P + "-radius-base", state.radius + "px");
    syncControls();
  }
  function syncControls() {
    document.querySelectorAll("[data-appearance]").forEach(function (el) {
      var key = el.getAttribute("data-appearance");
      if (!(key in state)) return;
      if (el.type === "checkbox") {
        el.checked = key === "motion" ? state.motion === "reduced" : key === "contrast" ? state.contrast === "high" : !!state[key];
      } else if (el.type === "range") {
        el.value = key === "density" ? DENSITY.indexOf(state.density) : state[key];
        syncSlider(el);
        var stops = el.getAttribute("aria-describedby") && document.getElementById(el.getAttribute("aria-describedby"));
        if (stops) Array.prototype.forEach.call(stops.children, function (c, i) {
          c.classList.toggle("is-current", key === "density" ? i === DENSITY.indexOf(state.density) : c.textContent.trim() === String(state[key]));
        });
      } else {
        var on = el.getAttribute("data-value") === String(state[key]);
        if (el.matches(TAB_ITEM)) { el.setAttribute("aria-selected", on ? "true" : "false"); el.classList.toggle("is-active", on); el.tabIndex = on ? 0 : -1; }
        else el.setAttribute("aria-pressed", on ? "true" : "false");
      }
    });
  }
  function setAppearance(patch) {
    for (var k in patch) if (k in DEFAULTS) state[k] = patch[k];
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* not remembered */ }
    apply();
    document.dispatchEvent(new CustomEvent(P + ":appearance", { detail: Object.assign({}, state) }));
  }
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    state = read();
    apply();
  });

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t.matches) return;
    if (t.matches("." + P + "-slider")) syncSlider(t);
    var key = t.getAttribute("data-appearance");
    if (key === "density") setAppearance({ density: DENSITY[+t.value] || "balanced" });
    else if (key === "radius") setAppearance({ radius: +t.value });
  });
  document.addEventListener("change", function (e) {
    var key = e.target.getAttribute && e.target.getAttribute("data-appearance");
    if (key === "motion") setAppearance({ motion: e.target.checked ? "reduced" : "full" });
    else if (key === "contrast") setAppearance({ contrast: e.target.checked ? "high" : "normal" });
  });
  document.addEventListener("click", function (e) {
    var tab = e.target.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);

    var navItem = e.target.closest(NAV_ITEM);
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }

    var ap = e.target.closest("[data-appearance][data-value]");
    if (ap) { var patch = {}; patch[ap.getAttribute("data-appearance")] = ap.getAttribute("data-value"); setAppearance(patch); }

    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal) dlg.showModal(); }
    var closer = e.target.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(); }
  });
  document.addEventListener("keydown", function (e) {
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(TAB_LIST)).filter(function (t) { return !t.disabled; });
    var i = all.indexOf(tab), step = keys[e.key];
    var next = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(i + step + all.length) % all.length];
    next.focus();
    selectTab(next);
    if (next.hasAttribute("data-appearance")) next.click();
    e.preventDefault();
  });

  function boot() {
    apply();
    document.querySelectorAll("." + P + "-slider").forEach(syncSlider);
    initIndicators(document);
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initIndicators(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.AtelierUI = {
    initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider,
    setAppearance: setAppearance, getAppearance: function () { return Object.assign({}, state); }
  };
})();
