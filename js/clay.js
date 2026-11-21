/* Clay UI — optional behaviour (no dependencies).
   The CSS works without this file; it adds:
   - tablists (.clay-segmented / .clay-tabs): click + arrow keys move aria-selected,
     and a single indicator glides to the active tab (iOS-style)
   - toggle chips (.clay-chip[aria-pressed]): click flips aria-pressed
   - dialogs: [data-clay-open="#id"] opens a <dialog>, [data-clay-close] closes it

   Frameworks (React, Vue, Svelte…): just render aria-selected="true" (or .is-active)
   on the active tab. Tablists added later are picked up automatically, and changing
   the attribute from your own code moves the indicator. Manual hooks:
   window.ClayUI.initTabs(rootElement) and window.ClayUI.refreshTabs(tablistElement). */
(function () {
  var LIST = ".clay-segmented, .clay-tabs";
  var ITEM = ".clay-segmented__item, .clay-tabs__item";
  var ACTIVE = '[aria-selected="true"], .is-active';

  function items(list) {
    return Array.prototype.filter.call(list.querySelectorAll(ITEM), function (el) {
      return el.closest(LIST) === list; // ignore nested tablists
    });
  }

  /* Move the indicator to the active tab (positions come from layout, so any width works). */
  function refreshTabs(list) {
    var active = items(list).filter(function (el) { return el.matches(ACTIVE); })[0];
    if (!active) {
      list.style.setProperty("--clay-indicator-w", "0px");
      return;
    }
    list.style.setProperty("--clay-indicator-x", active.offsetLeft + "px");
    list.style.setProperty("--clay-indicator-w", active.offsetWidth + "px");
  }

  function initTabs(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST) ? [scope] : scope.querySelectorAll(LIST);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__clayTabs) return;
      list.__clayTabs = true;
      list.classList.add("has-indicator");
      refreshTabs(list);
      // Turn transitions on only after the first placement, so nothing slides in on page load.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { list.classList.add("is-animated"); });
      });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { refreshTabs(list); });
        ro.observe(list);
        items(list).forEach(function (el) { ro.observe(el); }); // web fonts, label changes
      }
      new MutationObserver(function () { refreshTabs(list); }).observe(list, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ["aria-selected", "class"]
      });
    });
  }

  function selectTab(tab) {
    var list = tab.closest(LIST);
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
    refreshTabs(list);
  }

  document.addEventListener("click", function (e) {
    var tab = e.target.closest(ITEM);
    if (tab && !tab.disabled) selectTab(tab);

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
    var tab = e.target.closest && e.target.closest(ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(LIST)).filter(function (t) { return !t.disabled; });
    var i = all.indexOf(tab);
    var step = keys[e.key];
    var next = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(i + step + all.length) % all.length];
    next.focus();
    selectTab(next);
    e.preventDefault();
  });

  function boot() {
    initTabs(document);
    // Pick up tablists rendered later (SPAs, dialogs, templates). Batched to one pass per frame.
    var queued = false;
    new MutationObserver(function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; initTabs(document); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ClayUI = { initTabs: initTabs, refreshTabs: refreshTabs, selectTab: selectTab };
})();
