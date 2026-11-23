/* Clay UI — optional behaviour (no dependencies).
   The CSS works without this file; it adds:
   - sliding indicators: one mint pill / bar / raised tile glides to the active item
     (iOS-style) in segmented controls, underline tabs and the sidebar nav
   - tablists (.clay-segmented / .clay-tabs): click + arrow keys move aria-selected
   - nav (.clay-nav): click moves aria-current="page"
   - toggle chips and widget tiles (.clay-chip[aria-pressed], .clay-widget[aria-pressed]): click flips aria-pressed
   - sliders (.clay-slider): keep --clay-value (0–100) and any <output for="id"> in sync
   - steppers (.clay-stepper): the keys step the number input (press and hold to repeat), the digits
     pop on each change, and a key at the end of the range gets aria-disabled="true"
   - dialogs: [data-clay-open="#id"] opens a <dialog>, [data-clay-close] closes it
   - theme: [data-theme-set="light|dark|auto"] picks a theme, [data-theme-toggle] flips
     light/dark; the choice is remembered (localStorage "clay-theme") and fires a
     "clay:themechange" event. Add the one-line restore script from the README to <head>
     to avoid a flash of the wrong theme.

   Frameworks (React, Vue, Svelte…): just render aria-selected="true" / aria-current="page"
   (or .is-active) on the active item. Groups added later are picked up automatically and
   attribute changes from your own code move the indicator. Manual hooks:
   window.ClayUI.initIndicators(root), window.ClayUI.refresh(group), window.ClayUI.selectTab(tab),
   window.ClayUI.syncSlider(input), window.ClayUI.syncStepper(group). */
(function () {
  /* Every group that gets a sliding indicator */
  var GROUPS = [
    { list: ".clay-segmented", item: ".clay-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: ".clay-tabs", item: ".clay-tabs__item", active: '[aria-selected="true"], .is-active' },
    { list: ".clay-nav", item: ".clay-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = ".clay-segmented, .clay-tabs";
  var TAB_ITEM = ".clay-segmented__item, .clay-tabs__item";

  function groupOf(list) {
    for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i];
    return null;
  }

  function items(list) {
    var g = groupOf(list);
    if (!g) return [];
    return Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) {
      return el.closest(LIST) === list; // ignore nested groups
    });
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
  /* Move the indicator to the active item (positions come from layout, so any size works). */
  function refresh(list) {
    var g = groupOf(list);
    if (!g) return;
    var active = items(list).filter(function (el) { return el.matches(g.active); })[0];
    var s = list.style;
    if (!active) {
      s.setProperty("--clay-indicator-o", "0");
      return;
    }
    s.setProperty("--clay-indicator-o", "1");
    s.setProperty("--clay-indicator-x", active.offsetLeft + "px");
    s.setProperty("--clay-indicator-y", active.offsetTop + "px");
    s.setProperty("--clay-indicator-w", active.offsetWidth + "px");
    s.setProperty("--clay-indicator-h", active.offsetHeight + "px");
  }

  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST) ? [scope] : scope.querySelectorAll(LIST);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__clayIndicator) return;
      list.__clayIndicator = true;
      list.classList.add("has-indicator");
      refresh(list);
      // Turn transitions on only after the first placement, so nothing slides in on page load.
      requestAnimationFrame(function () {
        settle(function () { refresh(list); list.classList.add("is-animated"); });
      });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { snapTo(list); });
        ro.observe(list);
        items(list).forEach(function (el) { ro.observe(el); }); // web fonts, label changes
      }
      new MutationObserver(function () { refresh(list); }).observe(list, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-selected", "aria-current", "class"]
      });
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
      var panelId = t.getAttribute("aria-controls");
      if (panelId) {
        var panel = document.getElementById(panelId);
        if (panel) panel.hidden = !on;
      }
    });
    refresh(list);
  }

  /* ---------- Theme ---------- */
  var THEME_KEY = "clay-theme";
  var darkQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function currentTheme() { return document.documentElement.getAttribute("data-theme") || "light"; }
  function isDark() {
    var t = currentTheme();
    return t === "dark" || (t === "auto" && !!darkQuery && darkQuery.matches);
  }
  function syncThemeControls() {
    var t = currentTheme();
    document.querySelectorAll("[data-theme-set]").forEach(function (b) {
      var on = b.getAttribute("data-theme-set") === t;
      if (b.matches(TAB_ITEM)) {
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.classList.toggle("is-active", on);
        b.tabIndex = on ? 0 : -1;
      } else {
        b.setAttribute("aria-pressed", on ? "true" : "false");
      }
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      b.setAttribute("aria-pressed", isDark() ? "true" : "false");
    });
  }
  function setTheme(t) {
    var el = document.documentElement;
    if (t === "light") el.removeAttribute("data-theme");
    else el.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (err) { /* private mode: theme just isn't remembered */ }
    syncThemeControls();
    document.dispatchEvent(new CustomEvent("clay:themechange", { detail: { theme: t, dark: isDark() } }));
  }
  if (darkQuery && darkQuery.addEventListener) {
    darkQuery.addEventListener("change", function () {
      if (currentTheme() !== "auto") return;
      syncThemeControls();
      document.dispatchEvent(new CustomEvent("clay:themechange", { detail: { theme: "auto", dark: isDark() } }));
    });
  }

  /* ---------- Sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
    input.style.setProperty("--clay-value", String(Math.round(pct * 100) / 100));
    if (input.id) {
      document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) {
        o.textContent = input.value + (o.getAttribute("data-suffix") || "");
      });
    }
  }

  /* ---------- Steppers ---------- */
  function stepperInput(group) { return group && group.querySelector(".clay-stepper__value"); }
  function syncStepper(group) {
    var input = stepperInput(group);
    if (!input) return;
    var v = parseFloat(input.value);
    var min = input.min !== "" ? parseFloat(input.min) : -Infinity, max = input.max !== "" ? parseFloat(input.max) : Infinity;
    group.querySelectorAll(".clay-stepper__btn[data-step]").forEach(function (b) {
      var down = parseFloat(b.getAttribute("data-step")) < 0;
      var off = input.disabled || (down ? v <= min : v >= max);
      if (off) b.setAttribute("aria-disabled", "true"); else b.removeAttribute("aria-disabled");
    });
  }
  function stepBy(btn) {
    var group = btn.closest(".clay-stepper"), input = stepperInput(group);
    if (!input || input.disabled || btn.disabled || btn.getAttribute("aria-disabled") === "true") return false;
    var step = parseFloat(input.step) || 1, dir = parseFloat(btn.getAttribute("data-step")) || 0;
    var v = (parseFloat(input.value) || 0) + dir * step;
    if (input.min !== "") v = Math.max(parseFloat(input.min), v);
    if (input.max !== "") v = Math.min(parseFloat(input.max), v);
    v = Math.round(v * 1e6) / 1e6;
    if (String(v) === input.value) return false;
    input.value = String(v);
    input.classList.remove("is-bump");
    void input.offsetWidth; // restart the pop
    input.classList.add("is-bump");
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    syncStepper(group);
    return true;
  }
  /* Press and hold a key to keep stepping (after a short pause, then faster). The click that ends a
     hold doesn't step again; keyboard clicks (detail 0) always step once. */
  var hold = null;
  function stopTimer() { if (hold && hold.t) { clearTimeout(hold.t); hold.t = 0; } }
  document.addEventListener("pointerdown", function (e) {
    var btn = e.target.closest && e.target.closest(".clay-stepper__btn[data-step]");
    stopTimer();
    hold = null;
    if (!btn || e.button !== 0) return;
    var h = hold = { btn: btn, fired: false, t: 0 };
    (function repeat(delay) {
      h.t = setTimeout(function () {
        h.fired = true;
        if (stepBy(btn)) repeat(Math.max(60, delay * 0.8)); else h.t = 0;
      }, delay);
    })(420);
  });
  document.addEventListener("pointerup", stopTimer);
  document.addEventListener("pointercancel", stopTimer);
  document.addEventListener("pointerleave", function (e) { if (hold && e.target === hold.btn) stopTimer(); }, true);
  window.addEventListener("blur", stopTimer);

  function selectNavItem(link) {
    var list = link.closest(".clay-nav");
    if (!list) return;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  document.addEventListener("click", function (e) {
    var tab = e.target.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);

    // Plain left clicks only, so "open in new tab" doesn't move the highlight.
    var navItem = e.target.closest(".clay-nav__item");
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }

    var themeSet = e.target.closest("[data-theme-set]");
    if (themeSet) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = e.target.closest("[data-theme-toggle]");
    if (themeToggle) setTheme(isDark() ? "light" : "dark");

    var chip = e.target.closest(".clay-chip[aria-pressed], .clay-widget[aria-pressed]");
    if (chip && !chip.disabled) {
      chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }

    var stepKey = e.target.closest(".clay-stepper__btn[data-step]");
    if (stepKey) {
      var held = e.detail > 0 && hold && hold.btn === stepKey && hold.fired;
      stopTimer();
      hold = null;
      if (!held) stepBy(stepKey);
    }

    var opener = e.target.closest("[data-clay-open]");
    if (opener) {
      var dlg = document.querySelector(opener.getAttribute("data-clay-open"));
      if (dlg && dlg.showModal) dlg.showModal();
    }

    var closer = e.target.closest("[data-clay-close]");
    if (closer) {
      var d = closer.closest("dialog");
      if (d) d.close();
    }
  });

  document.addEventListener("input", function (e) {
    var el = e.target;
    if (!el.matches) return;
    if (el.matches(".clay-slider")) syncSlider(el);
    else if (el.matches(".clay-stepper__value")) syncStepper(el.closest(".clay-stepper"));
  });
  document.addEventListener("change", function (e) {
    var el = e.target;
    if (el.matches && el.matches(".clay-stepper__value")) syncStepper(el.closest(".clay-stepper"));
  });

  document.addEventListener("keydown", function (e) {
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(TAB_LIST)).filter(function (t) { return !t.disabled; });
    var i = all.indexOf(tab);
    var step = keys[e.key];
    var next = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(i + step + all.length) % all.length];
    next.focus();
    selectTab(next);
    e.preventDefault();
  });

  function boot() {
    syncThemeControls();
    initIndicators(document);
    document.querySelectorAll(".clay-slider").forEach(syncSlider);
    document.querySelectorAll(".clay-stepper").forEach(syncStepper);
    // Pick up groups rendered later (SPAs, dialogs, templates). Batched to one pass per frame.
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initIndicators(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ClayUI = {
    initIndicators: initIndicators,
    refresh: refresh,
    selectTab: selectTab,
    selectNavItem: selectNavItem,
    setTheme: setTheme,
    isDark: isDark,
    syncSlider: syncSlider,
    syncStepper: syncStepper,
    // Aliases kept for the earlier tabs-only API
    initTabs: initIndicators,
    refreshTabs: refresh
  };
})();
