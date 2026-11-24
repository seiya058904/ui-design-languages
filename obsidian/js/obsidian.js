/* Obsidian / Glass — optional behaviour (no dependencies). The CSS works without it; this adds:
   - liquid indicators for .obsidian-tabs, .obsidian-segmented, .obsidian-nav and .obsidian-dock
   - tablists: click + ←/→/Home/End move aria-selected and show the matching aria-controls panel;
     nav and pagination: plain clicks move aria-current="page"
   - sliders: keep --obsidian-value on input.obsidian-slider and its <output> in sync
   - menus: .obsidian-menu opens on click / ↓, arrows move, Enter picks, Esc or a click outside closes
   - rim light: cards and panels catch the light where the pointer is (rAF-damped, cached rects,
     targets the hovered surface directly so it never causes cascading ancestor subtree recalcs)
   - dock (.obsidian-dock), media (.obsidian-media), dialogs, command search (⌘K / Ctrl+K), accent
   Hooks: window.ObsidianUI.refresh(list), .initIndicators(root), .setAccent(name), .syncSlider(input), .setValue(el, n) */
(function () {
  var P = "obsidian";
  var LISTS = [
    { list: "." + P + "-tabs", item: "." + P + "-tabs__item", tab: true },
    { list: "." + P + "-segmented", item: "." + P + "-segmented__item", tab: true },
    { list: "." + P + "-nav", item: "." + P + "-nav__item", tab: false },
    { list: "." + P + "-dock", item: "." + P + "-dock__item", tab: false }
  ];
  var LIST_SEL = LISTS.map(function (g) { return g.list; }).join(", ");
  var TAB_ITEM = "." + P + "-tabs__item, ." + P + "-segmented__item";

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }
  function ownsControl(el) {
    if (!isWallHost()) return true;
    var st = el.closest && el.closest("[data-pack-stage]");
    return !!st && st.getAttribute("data-pack-stage") === P;
  }

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
  function measure(list) {
    var on = activeOf(list);
    if (!on || on.offsetParent === null) return { o: "0" };
    var l = on.offsetLeft, t = on.offsetTop;
    var r = list.clientWidth - (l + on.offsetWidth), b = list.clientHeight - (t + on.offsetHeight);
    return { o: "1", l: l, r: r, t: t, b: b };
  }
  function applyMetrics(list, m) {
    if (!m) return;
    var prev = list.__obsidianMetrics;
    if (prev && prev.o === m.o && prev.l === m.l && prev.r === m.r && prev.t === m.t && prev.b === m.b) return;
    var s = list.style;
    if (m.o === "0") { list.__obsidianMetrics = m; s.setProperty("--" + P + "-indicator-o", "0"); return; }
    if (prev && prev.o === "1") {
      var dir = Math.abs(m.t - prev.t) > Math.abs(m.l - prev.l) ? (m.t > prev.t ? "down" : "up") : (m.l > prev.l ? "right" : m.l < prev.l ? "left" : list.getAttribute("data-" + P + "-dir"));
      if (dir) list.setAttribute("data-" + P + "-dir", dir);
    }
    list.__obsidianMetrics = m;
    s.setProperty("--" + P + "-indicator-o", "1");
    s.setProperty("--" + P + "-indicator-l", m.l + "px");
    s.setProperty("--" + P + "-indicator-r", m.r + "px");
    s.setProperty("--" + P + "-indicator-t", m.t + "px");
    s.setProperty("--" + P + "-indicator-b", m.b + "px");
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
    var lists = scope.matches && scope.matches(LIST_SEL) ? [scope] : scope.querySelectorAll(LIST_SEL);
    var fresh = [];
    Array.prototype.forEach.call(lists, function (list) {
      if (list.__obsidianIndicator) return;
      list.__obsidianIndicator = true;
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
        itemsOf(list).forEach(function (el) { roMap.set(el, list); sharedRO.observe(el); });
      }
      (function (l) {
        new MutationObserver(function () { if (!l.__obsidianUpdating) refresh(l); }).observe(l, { subtree: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"] });
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
    var list = tab.closest("." + P + "-tabs, ." + P + "-segmented");
    if (!list) return;
    list.__obsidianUpdating = true;
    itemsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
    refresh(list);
    Promise.resolve().then(function () { list.__obsidianUpdating = false; });
  }
  function selectNavItem(link) {
    var list = link.closest("." + P + "-nav");
    if (!list) return;
    list.__obsidianUpdating = true;
    itemsOf(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__obsidianUpdating = false; });
  }

  /* ---------- sliders ---------- */
  function setValue(el, n) {
    var v = String(Math.round(n));
    if (el.style.getPropertyValue("--" + P + "-value") !== v) el.style.setProperty("--" + P + "-value", v);
  }
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    setValue(input, (v - min) / (max - min) * 100);
    var outs = [];
    var range = input.closest("." + P + "-range");
    if (range) outs = Array.prototype.slice.call(range.querySelectorAll("output"));
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) {
      var txt = input.value + (o.getAttribute("data-suffix") || "");
      if (o.textContent !== txt) o.textContent = txt;
    });
  }
  function initSliders(root) {
    (root || document).querySelectorAll("." + P + "-slider").forEach(function (s) {
      if (s.__obsidianSlider) return;
      s.__obsidianSlider = true;
      syncSlider(s);
    });
  }

  /* ---------- dock ---------- */
  function selectDockItem(item) {
    var dock = item.closest("." + P + "-dock");
    if (!dock) return;
    dock.__obsidianUpdating = true;
    itemsOf(dock).forEach(function (el) { if (el === item) el.setAttribute("aria-current", "true"); else el.removeAttribute("aria-current"); });
    refresh(dock);
    Promise.resolve().then(function () { dock.__obsidianUpdating = false; });
  }

  /* ---------- media ---------- */
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return Math.floor(sec / 60) + ":" + (sec % 60 < 10 ? "0" : "") + (sec % 60); }
  function syncMedia(card) {
    var seek = card.querySelector("." + P + "-media__seek"), times = card.querySelectorAll("." + P + "-media__time span");
    if (!seek) return;
    syncSlider(seek);
    if (times[0]) times[0].textContent = mmss(parseFloat(seek.value));
    if (times[1]) times[1].textContent = mmss(parseFloat(seek.max || 100));
  }
  function playMedia(card, on) {
    var key = card.querySelector("." + P + "-media__play"), seek = card.querySelector("." + P + "-media__seek");
    clearInterval(card.__obsidianPlay);
    card.__obsidianPlay = 0;
    card.classList.toggle("is-playing", on);
    if (key) { key.setAttribute("aria-pressed", on ? "true" : "false"); key.setAttribute("aria-label", on ? "Pause" : "Play"); }
    if (!on || !seek) return;
    card.__obsidianPlay = setInterval(function () {
      if (!card.isConnected) { playMedia(card, false); return; }
      if (document.hidden) return;
      var max = parseFloat(seek.max || 100), v = parseFloat(seek.value) + 1;
      if (v > max) { v = max; playMedia(card, false); }
      seek.value = String(v);
      syncMedia(card);
    }, 1000);
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
      if (!ownsControl(b)) return;
      var on = b.getAttribute("data-accent-set") === a;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.tabIndex = on ? 0 : -1; }
      else if (b.getAttribute("role") === "radio" || b.getAttribute("role") === "menuitemradio") b.setAttribute("aria-checked", on ? "true" : "false");
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setAccent(name) {
    if (isWallHost()) {
      document.querySelectorAll('[data-pack-stage="' + P + '"]').forEach(function (st) {
        if (!name || name === "cyan") st.removeAttribute("data-accent"); else st.setAttribute("data-accent", name);
      });
    } else {
      if (!name || name === "cyan") document.documentElement.removeAttribute("data-accent");
      else document.documentElement.setAttribute("data-accent", name);
      try { localStorage.setItem(ACCENT_KEY, name || "cyan"); } catch (err) { /* not remembered */ }
    }
    syncAccentControls();
    document.dispatchEvent(new CustomEvent(P + ":accentchange", { detail: { accent: name || "cyan" } }));
  }

  /* ---------- rim light (cached rect, innermost glass surface only, rAF-damped, zero layout per move) ---------- */
  var rimTarget = null, rimRect = null, rimTx = 0, rimTy = 0, rimCx = 0, rimCy = 0, rimRaf = 0, rimInit = false;
  var clearRimRect = function () { rimRect = null; };
  window.addEventListener("scroll", clearRimRect, { passive: true });
  window.addEventListener("resize", clearRimRect, { passive: true });

  function stepRim() {
    rimRaf = 0;
    if (!rimTarget || !rimTarget.isConnected) return;
    rimCx += (rimTx - rimCx) * 0.28;
    rimCy += (rimTy - rimCy) * 0.28;
    var moving = Math.abs(rimTx - rimCx) > 1 || Math.abs(rimTy - rimCy) > 1;
    if (!moving) { rimCx = rimTx; rimCy = rimTy; }
    var xStr = Math.round(rimCx) + "px", yStr = Math.round(rimCy) + "px";
    if (rimTarget.__rimX !== xStr || rimTarget.__rimY !== yStr) {
      rimTarget.__rimX = xStr;
      rimTarget.__rimY = yStr;
      rimTarget.style.setProperty("--" + P + "-mx", xStr);
      rimTarget.style.setProperty("--" + P + "-my", yStr);
    }
    if (moving) rimRaf = requestAnimationFrame(stepRim);
  }
  document.addEventListener("pointermove", function (e) {
    if (e.pointerType === "touch") return;
    var el = e.target && e.target.closest ? e.target.closest("." + P + "-card, ." + P + "-panel") : null;
    if (!el) return;
    if (el !== rimTarget) {
      rimTarget = el;
      rimRect = el.getBoundingClientRect();
      rimInit = true;
    } else if (!rimRect) {
      rimRect = el.getBoundingClientRect();
    }
    rimTx = e.clientX - rimRect.left;
    rimTy = e.clientY - rimRect.top;
    if (rimInit) { rimCx = rimTx; rimCy = rimTy; rimInit = false; }
    if (!rimRaf) rimRaf = requestAnimationFrame(stepRim);
  }, { passive: true });

  /* ---------- events ---------- */
  document.addEventListener("input", function (e) {
    if (!e.target.matches) return;
    if (e.target.matches("." + P + "-media__seek")) { var mc = e.target.closest("." + P + "-media"); if (mc) syncMedia(mc); }
    else if (e.target.matches("." + P + "-slider")) syncSlider(e.target);
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    var tab = t.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);
    var dockItem = t.closest("." + P + "-dock__item");
    if (dockItem && !dockItem.disabled) selectDockItem(dockItem);
    var play = t.closest("." + P + "-media__play");
    if (play) { var card = play.closest("." + P + "-media"); if (card) playMedia(card, play.getAttribute("aria-pressed") !== "true"); }
    var skip = t.closest("[data-" + P + "-skip]");
    if (skip) {
      var mcard = skip.closest("." + P + "-media"), sk = mcard && mcard.querySelector("." + P + "-media__seek");
      if (sk) { sk.value = String(Math.max(0, Math.min(parseFloat(sk.max || 100), parseFloat(sk.value) + parseFloat(skip.getAttribute("data-" + P + "-skip"))))); syncMedia(mcard); }
    }
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
    if (accent && ownsControl(accent)) setAccent(accent.getAttribute("data-accent-set"));
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
        if (!m.items.length) return;
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
    if (!all.length) return;
    var k = all.indexOf(tab), s = keys[e.key];
    var to = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(k + s + all.length) % all.length];
    to.focus();
    selectTab(to);
    if (to.hasAttribute("data-accent-set") && ownsControl(to)) setAccent(to.getAttribute("data-accent-set"));
    e.preventDefault();
  });

  function boot() {
    syncAccentControls();
    initSliders(document);
    initIndicators(document);
    var added = [], q = false;
    new MutationObserver(function (muts) {
      for (var i = 0; i < muts.length; i++) {
        var nodes = muts[i].addedNodes;
        for (var j = 0; j < nodes.length; j++) if (nodes[j].nodeType === 1) added.push(nodes[j]);
      }
      if (!added.length || q) return;
      q = true;
      requestAnimationFrame(function () {
        q = false;
        var batch = added.splice(0, added.length);
        for (var k = 0; k < batch.length; k++) {
          var n = batch[k];
          if (n.isConnected) { initIndicators(n); initSliders(n); }
        }
      });
    }).observe(document.body, { childList: true, subtree: true });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { document.querySelectorAll(LIST_SEL).forEach(queueSnap); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ObsidianUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, syncSlider: syncSlider, setValue: setValue, setAccent: setAccent, openMenu: openMenu, closeMenu: closeMenu };
})();
