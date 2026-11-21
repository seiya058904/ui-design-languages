/* Clay UI — optional behaviour (no dependencies).
   The CSS works without this file; it adds:
   - sliding indicators: one mint pill / bar / raised tile glides to the active item
     (iOS-style) in segmented controls, underline tabs and the sidebar nav
   - tablists (.clay-segmented / .clay-tabs): click + arrow keys move aria-selected
   - nav (.clay-nav): click moves aria-current="page"
   - toggle chips (.clay-chip[aria-pressed]): click flips aria-pressed
   - dialogs: [data-clay-open="#id"] opens a <dialog>, [data-clay-close] closes it
   - theme: [data-theme-set="light|dark|auto"] picks a theme, [data-theme-toggle] flips
     light/dark; the choice is remembered (localStorage "clay-theme") and fires a
     "clay:themechange" event. Add the one-line restore script from the README to <head>
     to avoid a flash of the wrong theme.

   Frameworks (React, Vue, Svelte…): just render aria-selected="true" / aria-current="page"
   (or .is-active) on the active item. Groups added later are picked up automatically and
   attribute changes from your own code move the indicator. Manual hooks:
   window.ClayUI.initIndicators(root), window.ClayUI.refresh(group), window.ClayUI.selectTab(tab). */
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
        requestAnimationFrame(function () { list.classList.add("is-animated"); });
      });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { refresh(list); });
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

    var chip = e.target.closest(".clay-chip[aria-pressed]");
    if (chip && !chip.disabled) {
      chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
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
    // Aliases kept for the earlier tabs-only API
    initTabs: initIndicators,
    refreshTabs: refresh
  };
})();
