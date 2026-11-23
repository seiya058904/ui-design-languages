/* Obsidian / Glass — optional behaviour (no dependencies). The CSS works without it; this adds:
   - liquid indicators for .obsidian-tabs, .obsidian-segmented and .obsidian-nav: the edge that leads
     moves first and the other follows, so the light stretches and gathers (data-obsidian-dir)
   - tablists: click + ←/→/Home/End move aria-selected and show the matching aria-controls panel;
     nav and pagination: plain clicks move aria-current="page"
   - sliders: keep --obsidian-value on input.obsidian-slider and its <output> in sync
   - menus: .obsidian-menu opens on click / ↓, arrows move, Enter picks, Esc or a click outside closes;
     picking an option fires "obsidian:select" (detail: { value, label }) on the menu
   - rim light: panels and cards catch the light where the pointer is (--obsidian-mx / --obsidian-my)
   - dialogs: [data-obsidian-open="#id"] / [data-obsidian-close]; toasts and alerts: [data-obsidian-dismiss]
   - command search: ⌘K / Ctrl+K focuses the first .obsidian-command field
   - accent: [data-accent-set="cyan|emerald|violet"] switches <html data-accent>, remembered in
     localStorage "obsidian-accent"; fires "obsidian:accentchange"
   Hooks: window.ObsidianUI.refresh(list), .initIndicators(root), .setAccent(name), .syncSlider(input), .setValue(el, n) */
(function () {
  var P = "obsidian";
  var LISTS = [
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", tab: true },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", tab: true },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", tab: false }
  ];
  var LIST_SEL = LISTS.map(function (g) { return g.list; }).join(", ");
  var TAB_ITEM = "." + P + "-tabs__item, ." + P + "-segmented__item";

  function groupOf(list) { for (var i = 0; i < LISTS.length; i++) if (list.matches(LISTS[i].list)) return LISTS[i]; return null; }
  function itemsOf(list) {
    var g = groupOf(list);
    return g ? Array.prototype.filter.call(list.querySelectorAll(g.item), function (el) { return el.closest(LIST_SEL) === list; }) : [];
  }
  function activeOf(list) {
    var g = groupOf(list);
    return itemsOf(list).filter(function (el) { return g.tab ? el.matches('[aria-selected="true"], .is-active') : el.matches('[aria-current="page"], [aria-current="true"], .is-active'); })[0];
  }

  /* ---------- liquid indicators ---------- */
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
    var on = activeOf(list), s = list.style;
    if (!on || on.offsetParent === null) { s.setProperty("--" + P + "-indicator-o", "0"); return; }
    var l = on.offsetLeft, t = on.offsetTop;
    var r = list.clientWidth - (l + on.offsetWidth), b = list.clientHeight - (t + on.offsetHeight);
    var prev = list.__obsidianPos;
    if (prev) {
      var dir = Math.abs(t - prev.t) > Math.abs(l - prev.l) ? (t > prev.t ? "down" : "up") : (l > prev.l ? "right" : l < prev.l ? "left" : list.getAttribute("data-" + P + "-dir"));
      if (dir) list.setAttribute("data-" + P + "-dir", dir);
    }
    list.__obsidianPos = { l: l, t: t };
    s.setProperty("--" + P + "-indicator-o", "1");
    s.setProperty("--" + P + "-indicator-l", l + "px");
    s.setProperty("--" + P + "-indicator-r", r + "px");
    s.setProperty("--" + P + "-indicator-t", t + "px");
    s.setProperty("--" + P + "-indicator-b", b + "px");
  }
  function initIndicators(root) {
    var scope = root || document;
    var lists = scope.matches && scope.matches(LIST_SEL) ? [scope] : scope.querySelectorAll(LIST_SEL);
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__obsidianIndicator) return;
      list.__obsidianIndicator = true;
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
    var list = tab.closest("." + P + "-tabs, ." + P + "-segmented");
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

  /* ---------- sliders ---------- */
  function setValue(el, n) { el.style.setProperty("--" + P + "-value", String(Math.round(n))); }
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    setValue(input, (v - min) / (max - min) * 100);
    var outs = [];
    var range = input.closest("." + P + "-range");
    if (range) outs = Array.prototype.slice.call(range.querySelectorAll("output"));
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
  }

  /* ---------- menus ---------- */
  function menuParts(menu) {
    return { button: menu.querySelector("[aria-haspopup]"), list: menu.querySelector("." + P + "-menu__list"), items: Array.prototype.slice.call(menu.querySelectorAll("." + P + "-menu__item")) };
  }
  function openMenu(menu, focusFirst) {
    var m = menuParts(menu);
    if (!m.button) return;
    closeMenus(menu);
    m.button.setAttribute("aria-expanded", "true");
    menu.classList.add("is-open");
    if (focusFirst) { var sel = m.items.filter(function (i) { return i.getAttribute("aria-selected") === "true"; })[0] || m.items[0]; if (sel) sel.focus(); }
  }
  function closeMenu(menu, refocus) {
    var m = menuParts(menu);
    if (!m.button || m.button.getAttribute("aria-expanded") !== "true") return;
    m.button.setAttribute("aria-expanded", "false");
    menu.classList.remove("is-open");
    if (refocus) m.button.focus();
  }
  function closeMenus(except) { document.querySelectorAll("." + P + "-menu.is-open").forEach(function (mm) { if (mm !== except) closeMenu(mm); }); }
  function pick(item) {
    var menu = item.closest("." + P + "-menu"), m = menuParts(menu);
    if (item.getAttribute("role") === "option") {
      m.items.forEach(function (i) { i.setAttribute("aria-selected", i === item ? "true" : "false"); });
      var label = m.button.querySelector("[data-" + P + "-label]");
      if (label) label.textContent = item.textContent.trim();
    }
    closeMenu(menu, true);
    menu.dispatchEvent(new CustomEvent(P + ":select", { bubbles: true, detail: { value: item.getAttribute("data-value") || item.textContent.trim(), label: item.textContent.trim(), item: item } }));
  }

  /* ---------- accent ---------- */
  var ACCENT_KEY = P + "-accent";
  function currentAccent() { return document.documentElement.getAttribute("data-accent") || "cyan"; }
  function syncAccentControls() {
    var a = currentAccent();
    document.querySelectorAll("[data-accent-set]").forEach(function (b) {
      var on = b.getAttribute("data-accent-set") === a;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; }
      else if (b.getAttribute("role") === "radio" || b.getAttribute("role") === "menuitemradio") b.setAttribute("aria-checked", on ? "true" : "false");
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setAccent(name) {
    if (!name || name === "cyan") document.documentElement.removeAttribute("data-accent");
    else document.documentElement.setAttribute("data-accent", name);
    try { localStorage.setItem(ACCENT_KEY, name || "cyan"); } catch (err) { /* not remembered */ }
    syncAccentControls();
    document.dispatchEvent(new CustomEvent(P + ":accentchange", { detail: { accent: name || "cyan" } }));
  }

  /* ---------- rim light ---------- */
  var lit = [], queued = null;
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    queued = e;
    if (lit.pending) return;
    lit.pending = true;
    requestAnimationFrame(function () {
      lit.pending = false;
      var ev = queued, el = ev.target && ev.target.closest ? ev.target.closest("." + P + "-card, ." + P + "-panel") : null;
      while (el) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--" + P + "-mx", (ev.clientX - r.left).toFixed(0) + "px");
        el.style.setProperty("--" + P + "-my", (ev.clientY - r.top).toFixed(0) + "px");
        el = el.parentElement && el.parentElement.closest("." + P + "-card, ." + P + "-panel");
      }
    });
  }, { passive: true });

  /* ---------- events ---------- */
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });
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
    var menuBtn = t.closest("." + P + "-menu > [aria-haspopup]");
    if (menuBtn) { var menu = menuBtn.parentElement; if (menuBtn.getAttribute("aria-expanded") === "true") closeMenu(menu); else openMenu(menu); }
    else if (!t.closest("." + P + "-menu__list")) closeMenus();
    var item = t.closest("." + P + "-menu__item");
    if (item && !item.disabled) pick(item);
    var accent = t.closest("[data-accent-set]");
    if (accent) setAccent(accent.getAttribute("data-accent-set"));
    var opener = t.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = t.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(closer.value || closer.getAttribute("data-" + P + "-close") || ""); }
    var dismiss = t.closest("[data-" + P + "-dismiss]");
    if (dismiss) { var box = dismiss.closest("." + P + "-toast, ." + P + "-alert"); if (box) box.hidden = true; }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
      var field = document.querySelector("." + P + "-command input");
      if (field) { e.preventDefault(); field.focus(); field.select(); }
      return;
    }
    var mi = e.target.closest && e.target.closest("." + P + "-menu");
    if (mi) {
      var m = menuParts(mi), i = m.items.indexOf(document.activeElement);
      if (e.key === "Escape") { closeMenu(mi, true); e.preventDefault(); return; }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!mi.classList.contains("is-open")) { openMenu(mi, true); return; }
        var n = e.key === "ArrowDown" ? (i + 1) % m.items.length : (i - 1 + m.items.length) % m.items.length;
        if (i < 0) n = 0;
        m.items[n].focus();
        return;
      }
      if (e.key === "Tab") closeMenu(mi);
    }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = itemsOf(tab.closest("." + P + "-tabs, ." + P + "-segmented")).filter(function (x) { return !x.disabled; });
    var k = all.indexOf(tab), s = keys[e.key];
    var to = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(k + s + all.length) % all.length];
    to.focus();
    selectTab(to);
    if (to.hasAttribute("data-accent-set")) setAccent(to.getAttribute("data-accent-set"));
    e.preventDefault();
  });

  function boot() {
    syncAccentControls();
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

  window.ObsidianUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider, setValue: setValue, setAccent: setAccent, openMenu: openMenu, closeMenu: closeMenu };
})();
