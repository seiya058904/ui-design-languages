/* Lilac — optional behaviour (no dependencies). The CSS works without it; this adds:
   - sliding indicators (iOS-style glide) for .lilac-segmented, .lilac-tabs, .lilac-nav, .lilac-bottom-nav
   - tablists: click + ←/→/Home/End move aria-selected; navs: plain clicks move aria-current="page"
   - sliders: keeps --fill and a linked <output for="id"> in sync
   - toggle chips (.lilac-chip[aria-pressed]) and dialogs ([data-lilac-open="#id"], [data-lilac-close])
   - focus timers (.lilac-timer): [data-lilac-timer="run|reset|add"] start / pause (aria-pressed), reset,
     add data-seconds; --value (0–100) empties the ring; fires "lilac:timerdone" at zero
   - card decks (.lilac-deck): [data-lilac-deck="next|prev"] deal the top card off and let it float
     under the pile (or draw the bottom one back up); ←/→ inside the deck do the same
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

  function isWallHost() { return document.documentElement.hasAttribute("data-wall-host"); }
  function ownsControl(el) {
    if (!isWallHost()) return true;
    var st = el.closest && el.closest("[data-pack-stage]");
    return !!st && st.getAttribute("data-pack-stage") === P;
  }

  function groupOf(list) {
    for (var i = 0; i < GROUPS.length; i++) if (list.matches(GROUPS[i].list)) return GROUPS[i];
    return null;
  }
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
    var prev = list.__lilacMetrics;
    if (prev && prev.o === m.o && prev.x === m.x && prev.y === m.y && prev.w === m.w && prev.h === m.h) return;
    list.__lilacMetrics = m;
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
      if (list.__lilacIndicator) return;
      list.__lilacIndicator = true;
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
        new MutationObserver(function () { if (!l.__lilacUpdating) refresh(l); }).observe(l, {
          subtree: true, childList: true, attributes: true, attributeFilter: ["aria-selected", "aria-current", "class"]
        });
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
    list.__lilacUpdating = true;
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
    Promise.resolve().then(function () { list.__lilacUpdating = false; });
  }

  function selectNavItem(link) {
    var list = link.closest(LIST);
    if (!list) return;
    list.__lilacUpdating = true;
    items(list).forEach(function (el) {
      if (el === link) el.setAttribute("aria-current", "page");
      else el.removeAttribute("aria-current");
      el.classList.toggle("is-active", el === link);
    });
    refresh(list);
    Promise.resolve().then(function () { list.__lilacUpdating = false; });
  }

  /* ---------- Sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    var fill = ((v - min) / (max - min)) * 100 + "%";
    if (input.style.getPropertyValue("--fill") !== fill) input.style.setProperty("--fill", fill);
    if (input.id) {
      document.querySelectorAll('output[for~="' + input.id + '"]').forEach(function (o) {
        var txt = input.value + (o.getAttribute("data-suffix") || "");
        if (o.textContent !== txt) o.textContent = txt;
      });
    }
  }

  /* ---------- Focus timer ---------- */
  var activeTimers = new Set();
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function clock(sec) { sec = Math.max(0, Math.ceil(sec)); return pad2(Math.floor(sec / 60)) + ":" + pad2(sec % 60); }
  function timerOf(t) {
    if (!t.__lilacTimer) {
      var total = parseFloat(t.getAttribute("data-duration")) || 1500;
      var left = parseFloat(t.getAttribute("data-remaining"));
      t.__lilacTimer = { base: total, total: total, left: isNaN(left) ? total : left, id: 0, last: 0 };
    }
    return t.__lilacTimer;
  }
  function renderTimer(t) {
    var st = timerOf(t);
    var val = String(Math.round((st.left / st.total) * 1000) / 10);
    if (t.style.getPropertyValue("--value") !== val) t.style.setProperty("--value", val);
    var out = t.querySelector("." + P + "-timer__time");
    var txt = clock(st.left);
    if (out && out.textContent !== txt) out.textContent = txt;
  }
  function runTimer(t, on) {
    var st = timerOf(t), btn = t.querySelector('[data-' + P + '-timer="run"]');
    clearInterval(st.id);
    st.id = 0;
    activeTimers.delete(t);
    t.classList.toggle("is-running", on);
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!on) return;
    if (st.left <= 0) st.left = st.total;
    t.classList.remove("is-done");
    st.last = Date.now();
    activeTimers.add(t);
    st.id = setInterval(function () {
      if (!t.isConnected) { runTimer(t, false); return; }
      var now = Date.now();
      st.left -= (now - st.last) / 1000;
      st.last = now;
      if (st.left <= 0) {
        st.left = 0;
        renderTimer(t);
        runTimer(t, false);
        t.classList.add("is-done");
        t.dispatchEvent(new CustomEvent(P + ":timerdone", { bubbles: true }));
        return;
      }
      if (!document.hidden) renderTimer(t);
    }, 250);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) activeTimers.forEach(renderTimer);
  });
  function timerAction(btn) {
    var t = btn.closest("." + P + "-timer");
    if (!t) return;
    var st = timerOf(t), act = btn.getAttribute("data-" + P + "-timer");
    if (act === "run") runTimer(t, !st.id);
    else if (act === "reset") { runTimer(t, false); st.total = st.left = st.base; t.classList.remove("is-done"); renderTimer(t); }
    else if (act === "add") {
      st.left += parseFloat(btn.getAttribute("data-seconds")) || 300;
      st.total = Math.max(st.total, st.left);
      renderTimer(t);
    }
  }

  /* ---------- Card deck ---------- */
  function stackCards(stack) { return Array.prototype.slice.call(stack.querySelectorAll("." + P + "-deck__card")); }
  function depthOf(c) { return parseFloat(c.style.getPropertyValue("--i")) || 0; }
  function setDepths(stack, order) {
    var all = stackCards(stack);
    order.forEach(function (c, i) {
      c.style.setProperty("--i", String(i));
      if (i === 0) { c.removeAttribute("aria-hidden"); c.inert = false; }
      else { c.setAttribute("aria-hidden", "true"); c.inert = true; }
    });
    var count = stack.querySelector("." + P + "-deck__count b");
    if (count) count.textContent = pad2(all.indexOf(order[0]) + 1);
  }
  function dealStack(stack, dir) {
    if (stack.__lilacBusy) return;
    var order = stackCards(stack).sort(function (a, b) { return depthOf(a) - depthOf(b); });
    if (order.length < 2) return;
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var mover = dir > 0 ? order[0] : order[order.length - 1];
    stack.__lilacBusy = true;
    mover.setAttribute("data-fling", dir > 0 ? "out" : "in");
    // Aligned with CSS 320ms fling transition so cards settle seamlessly without snapping early.
    setTimeout(function () {
      setDepths(stack, dir > 0 ? order.slice(1).concat([mover]) : [mover].concat(order.slice(0, -1)));
      mover.removeAttribute("data-fling");
      setTimeout(function () { stack.__lilacBusy = false; }, still ? 0 : 140);
    }, still ? 0 : 320);
  }

  /* ---------- Accent ---------- */
  var ACCENT_KEY = P + "-accent";
  function currentAccent() {
    if (isWallHost()) {
      var st = document.querySelector('[data-pack-stage="' + P + '"]');
      return (st && st.getAttribute("data-accent")) || "violet";
    }
    return document.documentElement.getAttribute("data-accent") || "violet";
  }
  function syncAccentControls() {
    var a = currentAccent();
    document.querySelectorAll("[data-accent-set]").forEach(function (b) {
      if (!ownsControl(b)) return;
      var on = b.getAttribute("data-accent-set") === a;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function setAccent(name) {
    if (isWallHost()) {
      document.querySelectorAll('[data-pack-stage="' + P + '"]').forEach(function (st) {
        if (!name || name === "violet") st.removeAttribute("data-accent"); else st.setAttribute("data-accent", name);
      });
    } else {
      if (!name || name === "violet") document.documentElement.removeAttribute("data-accent");
      else document.documentElement.setAttribute("data-accent", name);
      try { localStorage.setItem(ACCENT_KEY, name || "violet"); } catch (err) { /* not remembered */ }
    }
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
      if (!ownsControl(b)) return;
      var on = b.getAttribute("data-theme-set") === t;
      if (b.matches(TAB_ITEM)) { b.setAttribute("aria-selected", on ? "true" : "false"); b.classList.toggle("is-active", on); b.tabIndex = on ? 0 : -1; }
      else b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-theme-toggle]").forEach(function (b) {
      if (!ownsControl(b)) return;
      if (b.type === "checkbox") b.checked = isDark(); else b.setAttribute("aria-pressed", isDark() ? "true" : "false");
    });
  }
  function setTheme(t) {
    if (!t || t === "light") document.documentElement.removeAttribute("data-theme");
    else document.documentElement.setAttribute("data-theme", t);
    if (!isWallHost()) {
      try { localStorage.setItem(THEME_KEY, t || "light"); } catch (err) { /* not remembered */ }
    }
    syncThemeControls();
    document.dispatchEvent(new CustomEvent(P + ":themechange", { detail: { theme: t || "light", dark: isDark() } }));
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener("change", function () { if (currentTheme() === "auto") syncThemeControls(); });
  document.addEventListener("change", function (e) {
    if (e.target.matches && e.target.matches("input[data-theme-toggle]") && ownsControl(e.target)) setTheme(e.target.checked ? "dark" : "light");
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
    if (accent && ownsControl(accent)) setAccent(accent.getAttribute("data-accent-set"));
    var themeSet = e.target.closest("[data-theme-set]");
    if (themeSet && ownsControl(themeSet)) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = e.target.closest("button[data-theme-toggle]");
    if (themeToggle && ownsControl(themeToggle)) setTheme(isDark() ? "light" : "dark");

    var chip = e.target.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");

    var timerBtn = e.target.closest("[data-" + P + "-timer]");
    if (timerBtn) timerAction(timerBtn);
    var deckBtn = e.target.closest("[data-" + P + "-deck]");
    if (deckBtn) { var dk = deckBtn.closest("." + P + "-deck"); if (dk) dealStack(dk, deckBtn.getAttribute("data-" + P + "-deck") === "prev" ? -1 : 1); }

    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) {
      var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open"));
      if (dlg && dlg.showModal && !dlg.open) dlg.showModal();
    }
    var closer = e.target.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(); }
  });

  document.addEventListener("keydown", function (e) {
    var stk = e.target.closest && !e.target.closest(TAB_ITEM) && e.target.closest("." + P + "-deck");
    if (stk && (e.key === "ArrowRight" || e.key === "ArrowLeft") && !/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) {
      dealStack(stk, e.key === "ArrowLeft" ? -1 : 1);
      e.preventDefault();
      return;
    }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = items(tab.closest(TAB_LIST)).filter(function (t) { return !t.disabled; });
    if (!all.length) return;
    var i = all.indexOf(tab), step = keys[e.key];
    var next = step === "first" ? all[0] : step === "last" ? all[all.length - 1] : all[(i + step + all.length) % all.length];
    next.focus();
    selectTab(next);
    if (next.hasAttribute("data-accent-set") && ownsControl(next)) setAccent(next.getAttribute("data-accent-set"));
    if (next.hasAttribute("data-theme-set") && ownsControl(next)) setTheme(next.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncAccentControls();
    syncThemeControls();
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

  window.LilacUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, setAccent: setAccent, setTheme: setTheme, syncSlider: syncSlider,
    runTimer: function (el, on) { runTimer(el, on !== false); }, resetTimer: function (el) { var b = el.querySelector('[data-' + P + '-timer="reset"]'); if (b) timerAction(b); },
    dealDeck: function (el, dir) { dealStack(el, dir === "prev" || dir < 0 ? -1 : 1); } };
})();
