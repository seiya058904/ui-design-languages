/* Sketch — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators for .sketch-tabs, .sketch-pills, .sketch-segmented (drawn box / hatched pill)
     and .sketch-nav (box with corner brackets)
   - tablists: click + ←/→/Home/End move aria-selected; nav: plain clicks move aria-current="page"
   - sliders: keep --fill-n on .sketch-range and the bubble / <output for> text in sync
   - steppers: − / + buttons inside .sketch-stepper change the <output> (data-min / data-max)
   - toggle chips (.sketch-chip[aria-pressed]) and single-choice swatch pickers ([data-pick-group])
   - dialogs: [data-sketch-open="#id"] / [data-sketch-close]
   Hooks: window.SketchUI.refresh(el), .initIndicators(root), .syncSlider(input) */
(function () {
  var P = "sketch";
  var GROUPS = [
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-pills", item: "." + P + "-pills__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = GROUPS.slice(0, 3).map(function (g) { return g.list; }).join(", ");
  var TAB_ITEM = GROUPS.slice(0, 3).map(function (g) { return g.item; }).join(", ");
  var NAV_ITEM = GROUPS[3].item;

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
      if (list.__sketchIndicator) return;
      list.__sketchIndicator = true;
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
    var list = link.closest(GROUPS[3].list);
    if (!list) return;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var host = input.closest("." + P + "-range") || input;
    host.style.setProperty("--fill-n", String((v - min) / (max - min)));
    var outs = Array.prototype.slice.call(host.querySelectorAll ? host.querySelectorAll("output") : []);
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
    var ticks = host.querySelector && host.querySelector("." + P + "-range__ticks");
    if (ticks) Array.prototype.forEach.call(ticks.children, function (t) { t.classList.toggle("is-current", t.textContent.trim() === String(input.value)); });
  }

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
    var pick = e.target.closest("[data-pick-group] [aria-pressed]");
    if (pick) pick.closest("[data-pick-group]").querySelectorAll("[aria-pressed]").forEach(function (b) { b.setAttribute("aria-pressed", String(b === pick)); });
    var step = e.target.closest("." + P + "-stepper button");
    if (step) {
      var box = step.closest("." + P + "-stepper"), out = box.querySelector("output");
      var dir = step === box.querySelector("button") ? -1 : 1;
      var min = box.hasAttribute("data-min") ? +box.getAttribute("data-min") : -Infinity;
      var max = box.hasAttribute("data-max") ? +box.getAttribute("data-max") : Infinity;
      out.textContent = String(Math.min(max, Math.max(min, (parseFloat(out.textContent) || 0) + dir)));
    }
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
    var i = all.indexOf(tab), stepK = keys[e.key];
    var next = stepK === "first" ? all[0] : stepK === "last" ? all[all.length - 1] : all[(i + stepK + all.length) % all.length];
    next.focus();
    selectTab(next);
    e.preventDefault();
  });

  function boot() {
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

  window.SketchUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider };
})();
