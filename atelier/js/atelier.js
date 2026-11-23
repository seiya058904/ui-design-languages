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
     Other open pages and iframes of the same site update live through the storage event. Discrete
     changes cross-fade through the View Transitions API where available (not with reduced motion).
   - command palette (.atelier-command): typing filters the results (text + data-keywords), ↑/↓ and the
     pointer move one gliding highlight, ↵ or a click runs the item and fires "atelier:command"
   - filter bar (.atelier-filterbar): operators cycle through data-ops, × folds a capsule away, Clear
     removes them all; F (outside text fields) focuses [data-atelier-filter-add]
   - menus (.atelier-menu): the trigger's aria-expanded opens the panel; ↓/↑ to open and move, Home/End,
     Esc and outside clicks close; menuitemcheckbox toggles aria-checked; fires "atelier:menu"
   Hooks: window.AtelierUI.setAppearance({ accent: "green" }), .getAppearance(), .refresh(el), .initIndicators(root) */
(function () {
  var P = "atelier";
  var GROUPS = [
    { list: "." + P + "-pills", item: "." + P + "-pills__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' },
    { list: "." + P + "-command__list", item: "." + P + "-command__item", active: '[aria-selected="true"]' }
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
      settle(function () { refresh(list); list.classList.add("is-animated"); });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { snapTo(list); });
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
    var discrete = false;
    for (var k in patch) if (k in DEFAULTS && k !== "radius" && String(patch[k]) !== String(state[k])) discrete = true;
    function run() {
      for (var key in patch) if (key in DEFAULTS) state[key] = patch[key];
      try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* not remembered */ }
      apply();
      document.dispatchEvent(new CustomEvent(P + ":appearance", { detail: Object.assign({}, state) }));
    }
    // A theme or accent change cross-fades the whole page once (snapshot → new state, 220ms) instead of
    // every element repainting its own transition. Radius drags stay direct.
    var calm = state.motion === "reduced" || patch.motion === "reduced" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (discrete && !calm && document.startViewTransition && document.visibilityState === "visible") document.startViewTransition(run);
    else run();
  }
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    state = read();
    apply();
  });

  /* ---------- Command palette ---------- */
  var CMD_ITEM = "." + P + "-command__item";
  function commandItems(cmd) {
    return Array.prototype.filter.call(cmd.querySelectorAll(CMD_ITEM), function (el) { return !el.hidden && el.getAttribute("aria-disabled") !== "true"; });
  }
  function selectCommand(cmd, item, scroll) {
    Array.prototype.forEach.call(cmd.querySelectorAll(CMD_ITEM), function (el) { el.setAttribute("aria-selected", el === item ? "true" : "false"); });
    var input = cmd.querySelector("." + P + "-command__search input");
    if (input) { if (item && item.id) input.setAttribute("aria-activedescendant", item.id); else input.removeAttribute("aria-activedescendant"); }
    if (item && scroll && item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
  }
  function filterCommand(cmd) {
    var input = cmd.querySelector("." + P + "-command__search input");
    var q = (input && input.value || "").trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean), any = false;
    Array.prototype.forEach.call(cmd.querySelectorAll(CMD_ITEM), function (el) {
      var hay = (el.textContent + " " + (el.getAttribute("data-keywords") || "")).toLowerCase();
      var show = words.every(function (w) { return hay.indexOf(w) >= 0; });
      el.hidden = !show;
      if (show) any = true;
    });
    Array.prototype.forEach.call(cmd.querySelectorAll("." + P + "-command__group"), function (g) {
      var n = g.nextElementSibling, vis = false;
      while (n && !n.matches("." + P + "-command__group")) { if (n.matches(CMD_ITEM) && !n.hidden) { vis = true; break; } n = n.nextElementSibling; }
      g.hidden = !vis;
    });
    var empty = cmd.querySelector("." + P + "-command__empty");
    if (empty) {
      empty.hidden = any;
      var echo = empty.querySelector("[data-query]");
      if (echo) echo.textContent = input ? input.value : "";
    }
    var cur = cmd.querySelector(CMD_ITEM + '[aria-selected="true"]');
    if (!cur || cur.hidden) selectCommand(cmd, commandItems(cmd)[0] || null, true);
    var list = cmd.querySelector("." + P + "-command__list");
    if (list) refresh(list);
  }
  function runCommand(cmd, item) {
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    item.classList.remove("is-run");
    void item.offsetWidth;
    item.classList.add("is-run");
    var label = item.cloneNode(true);
    Array.prototype.forEach.call(label.querySelectorAll("." + P + "-command__keys, ." + P + "-command__hint"), function (n) { n.remove(); });
    cmd.dispatchEvent(new CustomEvent(P + ":command", { bubbles: true, detail: { item: item, value: item.getAttribute("data-value") || label.textContent.trim() } }));
  }
  document.addEventListener("pointerover", function (e) {
    var item = e.target.closest && e.target.closest(CMD_ITEM);
    if (!item || item.getAttribute("aria-selected") === "true" || item.getAttribute("aria-disabled") === "true") return;
    var cmd = item.closest("." + P + "-command");
    if (cmd) selectCommand(cmd, item, false);
  });

  /* ---------- Filter bar ---------- */
  function syncFilterbar(bar) {
    var left = bar.querySelectorAll("." + P + "-filter:not(.is-leaving)").length;
    var empty = bar.querySelector("." + P + "-filterbar__empty"), clear = bar.querySelector("." + P + "-filterbar__clear");
    if (empty) empty.hidden = left > 0;
    if (clear) clear.hidden = left === 0;
  }
  function removeFilter(filter) {
    var bar = filter.closest("." + P + "-filterbar");
    if (!bar || filter.classList.contains("is-leaving")) return;
    var focusNext = filter.contains(document.activeElement);
    filter.classList.add("is-leaving");
    syncFilterbar(bar);
    setTimeout(function () {
      var next = filter.nextElementSibling;
      filter.remove();
      if (focusNext) {
        var target = (next && next.matches("." + P + "-filter") && next.querySelector("." + P + "-filter__remove")) || bar.querySelector("[data-" + P + "-filter-add]");
        if (target) target.focus();
      }
    }, 140);
  }

  /* ---------- Menus ---------- */
  function menuTrigger(menu) { return menu.querySelector('[aria-haspopup="menu"]'); }
  function menuItems(menu) {
    return Array.prototype.filter.call(menu.querySelectorAll("." + P + "-menu__item"), function (i) { return !i.disabled && i.getAttribute("aria-disabled") !== "true"; });
  }
  function setMenu(menu, open, focus) {
    var trig = menuTrigger(menu);
    if (!trig) return;
    trig.setAttribute("aria-expanded", open ? "true" : "false");
    if (open && focus) { var list = menuItems(menu); var it = focus === "last" ? list[list.length - 1] : list[0]; if (it) it.focus(); }
    if (!open && focus) trig.focus();
  }
  function closeMenus(except) {
    document.querySelectorAll("." + P + "-menu").forEach(function (m) {
      var trig = menuTrigger(m);
      if (m !== except && trig && trig.getAttribute("aria-expanded") === "true" && !m.classList.contains(P + "-menu--static")) setMenu(m, false);
    });
  }

  document.addEventListener("input", function (e) {
    var t = e.target;
    if (!t.matches) return;
    if (t.matches("." + P + "-command__search input")) { var cmd = t.closest("." + P + "-command"); if (cmd) filterCommand(cmd); }
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

    var cmdItem = e.target.closest(CMD_ITEM);
    if (cmdItem) { var cmd = cmdItem.closest("." + P + "-command"); if (cmd) { selectCommand(cmd, cmdItem, false); runCommand(cmd, cmdItem); } }

    var op = e.target.closest("." + P + "-filter__op[data-ops]");
    if (op) {
      var ops = op.getAttribute("data-ops").split("|"), at = ops.indexOf(op.textContent.trim());
      op.textContent = ops[(at + 1) % ops.length];
      op.classList.remove("is-flip");
      void op.offsetWidth;
      op.classList.add("is-flip");
    }
    var rm = e.target.closest("." + P + "-filter__remove");
    if (rm) removeFilter(rm.closest("." + P + "-filter"));
    var clr = e.target.closest("." + P + "-filterbar__clear");
    if (clr) { var bar = clr.closest("." + P + "-filterbar"); if (bar) bar.querySelectorAll("." + P + "-filter").forEach(removeFilter); }

    var menu = e.target.closest("." + P + "-menu");
    var trig = e.target.closest('[aria-haspopup="menu"]');
    if (menu && trig && menuTrigger(menu) === trig) {
      var open = trig.getAttribute("aria-expanded") !== "true";
      closeMenus(menu);
      setMenu(menu, open, open && e.detail === 0 ? "first" : null);
    } else if (menu && e.target.closest("." + P + "-menu__item")) {
      var mi = e.target.closest("." + P + "-menu__item");
      if (!mi.disabled && mi.getAttribute("aria-disabled") !== "true") {
        if (mi.getAttribute("role") === "menuitemcheckbox") mi.setAttribute("aria-checked", mi.getAttribute("aria-checked") === "true" ? "false" : "true");
        else if (!menu.classList.contains(P + "-menu--static")) setMenu(menu, false, true);
        menu.dispatchEvent(new CustomEvent(P + ":menu", { bubbles: true, detail: { item: mi, value: mi.getAttribute("data-value") || mi.textContent.trim() } }));
      }
    }
    if (!menu) closeMenus(null);

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
    var t = e.target;
    /* Command palette input */
    if (t.matches && t.matches("." + P + "-command__search input")) {
      var cmd = t.closest("." + P + "-command"), list = commandItems(cmd), cur = cmd.querySelector(CMD_ITEM + '[aria-selected="true"]'), i = list.indexOf(cur);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.length) selectCommand(cmd, list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length], true);
        e.preventDefault();
      } else if (e.key === "Enter") { if (cur && !cur.hidden) runCommand(cmd, cur); e.preventDefault(); }
      else if (e.key === "Escape" && t.value) { t.value = ""; filterCommand(cmd); e.preventDefault(); e.stopPropagation(); }
      return;
    }
    /* Menus */
    var menu = t.closest && t.closest("." + P + "-menu");
    if (menu) {
      var trig = menuTrigger(menu), items = menuItems(menu), idx = items.indexOf(document.activeElement), isOpen = trig && trig.getAttribute("aria-expanded") === "true";
      if (t === trig && (e.key === "ArrowDown" || e.key === "ArrowUp")) { closeMenus(menu); setMenu(menu, true, e.key === "ArrowUp" ? "last" : "first"); e.preventDefault(); return; }
      if (idx >= 0) {
        var move = { ArrowDown: idx + 1, ArrowUp: idx - 1, Home: 0, End: items.length - 1 }[e.key];
        if (move !== undefined) { items[(move + items.length) % items.length].focus(); e.preventDefault(); return; }
        if (e.key === "Tab" && !menu.classList.contains(P + "-menu--static")) setMenu(menu, false);
      }
      if (e.key === "Escape" && isOpen) { setMenu(menu, false, true); e.preventDefault(); e.stopPropagation(); return; }
    }
    /* F focuses the add button of a filter bar in view (outside text fields, no modifiers) */
    if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
      // Only a filter bar that is on screen answers, and focusing it never scrolls the page.
      var add = Array.prototype.filter.call(document.querySelectorAll("[data-" + P + "-filter-add]"), function (b) {
        var r = b.getBoundingClientRect();
        return b.offsetParent && r.bottom > 0 && r.top < window.innerHeight;
      })[0];
      if (add) { add.focus({ preventScroll: true }); e.preventDefault(); return; }
    }
    var tab = t.closest && t.closest(TAB_ITEM);
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
    document.querySelectorAll("." + P + "-filterbar").forEach(syncFilterbar);
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
    setAppearance: setAppearance, getAppearance: function () { return Object.assign({}, state); },
    filterCommand: filterCommand, openMenu: function (m) { setMenu(m, true, "first"); }, closeMenu: function (m) { setMenu(m, false); }
  };
})();
