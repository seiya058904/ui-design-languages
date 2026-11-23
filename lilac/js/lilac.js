/* Lilac — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators (iOS-style glide) for .lilac-segmented, .lilac-tabs, .lilac-nav, .lilac-bottom-nav
   - tablists: click + ←/→/Home/End move aria-selected; navs: plain clicks move aria-current="page"
   - sliders: keeps --fill and a linked <output for="id"> in sync
   - toggle chips (.lilac-chip[aria-pressed]) and dialogs ([data-lilac-open="#id"], [data-lilac-close])
   - accent: [data-accent-set="violet|cobalt"] switches <html data-accent>, remembered in localStorage
   - theme: [data-theme-set="light|dark|auto"] or a [data-theme-toggle] button / checkbox switches
     <html data-theme>, remembered in localStorage "lilac-theme"; fires "lilac:themechange"

   Frameworks: render aria-selected / aria-current yourself; indicators follow attribute changes and
   pick up components rendered later. Hooks: window.LilacUI.refresh(el), .initIndicators(root), .setAccent(name), .setTheme(name). */
(function () {
  var P = "lilac";
  var GROUPS = [
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", active: '[aria-selected="true"], .is-active' },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' },
    { list: "." + P + "-bottom-nav", item: "." + P + "-bottom-nav__item", active: '[aria-current="page"], [aria-current="true"], .is-active' }
  ];
  var LIST = GROUPS.map(function (g) { return g.list; }).join(", ");
  var TAB_LIST = GROUPS[0].list + ", " + GROUPS[1].list;
  var TAB_ITEM = GROUPS[0].item + ", " + GROUPS[1].item;
  var NAV_ITEM = GROUPS[2].item + ", " + GROUPS[3].item;

  function groupOf(list) {
    for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i];
    return null;
  }
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
      if (list.__lilacIndicator) return;
      list.__lilacIndicator = true;
      list.classList.add("has-indicator");
      refresh(list);
      settle(function () { refresh(list); list.classList.add("is-animated"); });
      if ("ResizeObserver" in window) {
        var ro = new ResizeObserver(function () { snapTo(list); });
        ro.observe(list);
        items(list).forEach(function (el) { ro.observe(el); });
      }
      new MutationObserver(function () { refresh(list); }).observe(list, {
        subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"]
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
      var panel = panelId && document.getElementById(panelId);
      if (panel) panel.hidden = !on;
    });
    refresh(list);
  }

  function selectNavItem(link) {
    var list = link.closest(LIST);
    if (!list) return;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
  }

  /* ---------- Sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    input.style.setProperty("--fill", ((v - min) / (max - min)) * 100 + "%");
    if (input.id) {
      document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) {
        o.textContent = input.value + (o.getAttribute("data-suffix") || "");
      });
    }
  }

  /* ---------- Accent ---------- */
  var ACCENT_KEY = P + "-accent";
  function syncAccentControls() {
    var a = document.documentElement.getAttribute("data-accent") || "violet";
    document.querySelectorAll("[data-accent-set]").forEach(function (b) {
      var on = b.getAttribute("data-accent-set") === a;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setAccent(name) {
    if (!name || name === "violet") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", name);
    try { localStorage.setItem(ACCENT_KEY, name || "violet"); } catch (err) { /* not remembered */ }
    syncAccentControls();
  }


  /* ---------- Theme ---------- */
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
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]")) setTheme(e.target.checked ? "dark" : "light");
  });

  document.addEventListener("input", function (e) {
    if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target);
  });

  document.addEventListener("click", function (e) {
    var tab = e.target.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);

    var navItem = e.target.closest(NAV_ITEM);
    if (navItem && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      selectNavItem(navItem);
      if (navItem.getAttribute("href") === "#") e.preventDefault();
    }

    var accent = e.target.closest("[data-accent-set]");
    if (accent) setAccent(accent.getAttribute("data-accent-set"));
    var themeSet = e.target.closest("[data-theme-set]");
    if (themeSet) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = e.target.closest("button[data-theme-toggle]");
    if (themeToggle) setTheme(isDark() ? "light" : "dark");

    var chip = e.target.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");

    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) {
      var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open"));
      if (dlg && dlg.showModal) dlg.showModal();
    }
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
    if (next.hasAttribute("data-accent-set")) setAccent(next.getAttribute("data-accent-set"));
    if (next.hasAttribute("data-theme-set")) setTheme(next.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncAccentControls();
    syncThemeControls();
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

  window.LilacUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, setAccent: setAccent, setTheme: setTheme, syncSlider: syncSlider };
})();
