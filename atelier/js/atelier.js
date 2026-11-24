/* Atelier — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators (iOS-style glide) for .atelier-pills, .atelier-segmented and .atelier-nav
   - tablists: click + ←/→/Home/End move aria-selected; nav: plain clicks move aria-current="page"
   - sliders: keep --fill and a linked <output for="id"> in sync
   - dialogs: [data-atelier-open="#id"] / [data-atelier-close]
   - appearance: theme, accent, density, radius, motion and contrast, stored in localStorage
     ("atelier-appearance") and applied to <html>.
   - command palette (.atelier-command): typing filters the results, ↑/↓ and pointer move highlight, ↵ runs
   - filter bar (.atelier-filterbar): operators cycle through data-ops, × folds away, Clear removes all
   - menus (.atelier-menu): aria-expanded opens panel, ↓/↑/Home/End/Esc navigate and close
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

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }

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
    var prev = list.__atelierMetrics;
    if (prev && prev.o === m.o && prev.x === m.x && prev.y === m.y && prev.w === m.w && prev.h === m.h) return;
    list.__atelierMetrics = m;
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
      if (list.__atelierIndicator) return;
      list.__atelierIndicator = true;
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
        new MutationObserver(function () { if (!l.__atelierUpdating) refresh(l); }).observe(l, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
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
    list.__atelierUpdating = true;
    items(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    refresh(list);
    Promise.resolve().then(function () { list.__atelierUpdating = false; });
  }
  function selectNavItem(link) {
    var list = link.closest(LIST);
    if (!list) return;
    list.__atelierUpdating = true;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__atelierUpdating = false; });
  }

  /* ---------- Sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var fill = ((v - min) / (max - min)) * 100 + "%";
    if (input.style.getPropertyValue("--fill") !== fill) input.style.setProperty("--fill", fill);
    if (input.id) document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) {
      var txt = input.value + (o.getAttribute("data-suffix") || "");
      if (o.textContent !== txt) o.textContent = txt;
    });
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
  var state = isWallHost() ? Object.assign({}, DEFAULTS) : read();
  function attr(name, value, fallback) {
    var d = document.documentElement;
    if (value === fallback) d.removeAttribute(name); else d.setAttribute(name, value);
  }
  function apply() {
    if (!isWallHost()) {
      attr("data-theme", state.theme, "light");
      attr("data-accent", state.accent, "cobalt");
      attr("data-density", state.density, "balanced");
      attr("data-motion", state.motion, "full");
      attr("data-contrast", state.contrast, "normal");
      if (+state.radius === DEFAULTS.radius) document.documentElement.style.removeProperty("--" + P + "-radius-base");
      else document.documentElement.style.setProperty("--" + P + "-radius-base", state.radius + "px");
    } else {
      // On multi-pack wall pages, scope appearance demos to Atelier's own stages only.
      document.querySelectorAll('[data-pack-stage="' + P + '"]').forEach(function (st) {
        if (state.accent === "cobalt") st.removeAttribute("data-accent"); else st.setAttribute("data-accent", state.accent);
        if (state.density === "balanced") st.removeAttribute("data-density"); else st.setAttribute("data-density", state.density);
      });
    }
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
      if (!isWallHost()) {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (err) { /* not remembered */ }
      }
      apply();
      document.dispatchEvent(new CustomEvent(P + ":appearance", { detail: Object.assign({}, state) }));
    }
    var calm = state.motion === "reduced" || patch.motion === "reduced" || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (!isWallHost() && discrete && !calm && document.startViewTransition && document.visibilityState === "visible") document.startViewTransition(run);
    else run();
  }
  window.addEventListener("storage", function (e) {
    if (e.key !== KEY || isWallHost()) return;
    state = read();
    apply();
  });

  /* ---------- Command palette ---------- */
  var CMD_ITEM = "." + P + "-command__item";
  function commandItems(cmd) {
    return Array.prototype.filter.call(cmd.querySelectorAll(CMD_ITEM), function (el) { return !el.hidden && el.getAttribute("aria-disabled") !== "true"; });
  }
  function selectCommand(cmd, item, scroll) {
    var list = cmd.querySelector("." + P + "-command__list");
    if (list) list.__atelierUpdating = true;
    Array.prototype.forEach.call(cmd.querySelectorAll(CMD_ITEM), function (el) { el.setAttribute("aria-selected", el === item ? "true" : "false"); });
    var input = cmd.querySelector("." + P + "-command__search input");
    if (input) { if (item && item.id) input.setAttribute("aria-activedescendant", item.id); else input.removeAttribute("aria-activedescendant"); }
    if (item && scroll && item.scrollIntoView) item.scrollIntoView({ block: "nearest" });
    if (list) {
      refresh(list);
      Promise.resolve().then(function () { list.__atelierUpdating = false; });
    }
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
    else {
      var list = cmd.querySelector("." + P + "-command__list");
      if (list) refresh(list);
    }
  }
  function runCommand(cmd, item) {
    if (!item || item.getAttribute("aria-disabled") === "true") return;
    item.classList.remove("is-run");
    requestAnimationFrame(function () { item.classList.add("is-run"); });
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
  var FILTER_PRESETS = [
    { field: "Cycle", ops: "is|is not", value: "Sprint 14" },
    { field: "Label", ops: "is|is not|includes", value: "Frontend" },
    { field: "Due", ops: "before|after|is", value: "Friday" }
  ];
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
    var saved = filter.cloneNode(true);
    saved.classList.remove("is-leaving", "is-entering");
    (bar.__atelierRemoved || (bar.__atelierRemoved = [])).push(saved);
    filter.classList.add("is-leaving");
    syncFilterbar(bar);
    setTimeout(function () {
      var next = filter.nextElementSibling;
      filter.remove();
      if (focusNext) {
        var target = (next && next.matches("." + P + "-filter") && next.querySelector("." + P + "-filter__remove")) || bar.querySelector("[data-" + P + "-filter-add]");
        if (target) target.focus();
      }
    }, 150);
  }
  function makeFilter(preset) {
    var el = document.createElement("div");
    el.className = P + "-filter";
    el.innerHTML =
      '<span class="' + P + '-filter__field">' + preset.field + "</span>" +
      '<button class="' + P + '-filter__op" type="button" data-ops="' + preset.ops + '">' + preset.ops.split("|")[0] + "</button>" +
      '<span class="' + P + '-filter__value">' + preset.value + "</span>" +
      '<button class="' + P + '-filter__remove" type="button" aria-label="Remove ' + preset.field + ' filter">×</button>';
    return el;
  }
  function addFilter(bar) {
    var el = bar.__atelierRemoved && bar.__atelierRemoved.length ? bar.__atelierRemoved.shift() : null;
    if (!el) {
      var active = Array.prototype.map.call(bar.querySelectorAll("." + P + "-filter__field"), function (f) { return f.textContent.trim(); });
      var next = FILTER_PRESETS.filter(function (p) { return active.indexOf(p.field) < 0; })[0];
      if (!next) return;
      el = makeFilter(next);
    }
    el.classList.add("is-entering");
    var anchor = bar.querySelector("." + P + "-filterbar__empty") || bar.querySelector("[data-" + P + "-filter-add]");
    bar.insertBefore(el, anchor || null);
    syncFilterbar(bar);
    bar.dispatchEvent(new CustomEvent(P + ":filteradd", { bubbles: true, detail: { filter: el } }));
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
      requestAnimationFrame(function () { op.classList.add("is-flip"); });
    }
    var rm = e.target.closest("." + P + "-filter__remove");
    if (rm) removeFilter(rm.closest("." + P + "-filter"));
    var clr = e.target.closest("." + P + "-filterbar__clear");
    if (clr) { var bar = clr.closest("." + P + "-filterbar"); if (bar) bar.querySelectorAll("." + P + "-filter").forEach(removeFilter); }
    var add = e.target.closest("[data-" + P + "-filter-add]");
    if (add) { var fbar = add.closest("." + P + "-filterbar"); if (fbar) addFilter(fbar); }

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
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = e.target.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(); }
  });
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t.matches && t.matches("." + P + "-command__search input")) {
      var cmd = t.closest("." + P + "-command"), list = commandItems(cmd), cur = cmd.querySelector(CMD_ITEM + '[aria-selected="true"]'), i = list.indexOf(cur);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        if (list.length) selectCommand(cmd, list[(i + (e.key === "ArrowDown" ? 1 : -1) + list.length) % list.length], true);
        e.preventDefault();
      } else if (e.key === "Enter") { if (cur && !cur.hidden) runCommand(cmd, cur); e.preventDefault(); }
      else if (e.key === "Escape" && t.value) { t.value = ""; filterCommand(cmd); e.preventDefault(); e.stopPropagation(); }
      return;
    }
    var menu = t.closest && t.closest("." + P + "-menu");
    if (menu) {
      var trig = menuTrigger(menu), mItems = menuItems(menu), idx = mItems.indexOf(document.activeElement), isOpen = trig && trig.getAttribute("aria-expanded") === "true";
      if (t === trig && (e.key === "ArrowDown" || e.key === "ArrowUp")) { closeMenus(menu); setMenu(menu, true, e.key === "ArrowUp" ? "last" : "first"); e.preventDefault(); return; }
      if (idx >= 0 && mItems.length) {
        var move = { ArrowDown: idx + 1, ArrowUp: idx - 1, Home: 0, End: mItems.length - 1 }[e.key];
        if (move !== undefined) { mItems[(move + mItems.length) % mItems.length].focus(); e.preventDefault(); return; }
        if (e.key === "Tab" && !menu.classList.contains(P + "-menu--static")) setMenu(menu, false);
      }
      if (e.key === "Escape" && isOpen) { setMenu(menu, false, true); e.preventDefault(); e.stopPropagation(); return; }
    }
    if ((e.key === "f" || e.key === "F") && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
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
    var all = items(tab.closest(TAB_LIST)).filter(function (x) { return !x.disabled; });
    if (!all.length) return;
    var idx2 = all.indexOf(tab), step = keys[e.key];
    var next = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(idx2 + step + all.length) % all.length];
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

  window.AtelierUI = {
    initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider,
    setAppearance: setAppearance, getAppearance: function () { return Object.assign({}, state); },
    filterCommand: filterCommand, openMenu: function (m) { setMenu(m, true, "first"); }, closeMenu: function (m) { setMenu(m, false); }
  };
})();
