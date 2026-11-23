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

  /* ---------- Focus timer ---------- */
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
    t.style.setProperty("--value", String(Math.round((st.left / st.total) * 1000) / 10));
    var out = t.querySelector("." + P + "-timer__time");
    if (out) out.textContent = clock(st.left);
  }
  function runTimer(t, on) {
    var st = timerOf(t), btn = t.querySelector('[data-' + P + '-timer="run"]');
    clearInterval(st.id);
    st.id = 0;
    t.classList.toggle("is-running", on);
    if (btn) btn.setAttribute("aria-pressed", on ? "true" : "false");
    if (!on) return;
    if (st.left <= 0) st.left = st.total;
    t.classList.remove("is-done");
    st.last = Date.now();
    st.id = setInterval(function () {
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
      renderTimer(t);
    }, 250);
  }
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
    setTimeout(function () {
      setDepths(stack, dir > 0 ? order.slice(1).concat([mover]) : [mover].concat(order.slice(0, -1)));
      mover.removeAttribute("data-fling");
      setTimeout(function () { stack.__lilacBusy = false; }, still ? 0 : 120);
    }, still ? 0 : 300);
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

    var timerBtn = e.target.closest("[data-" + P + "-timer]");
    if (timerBtn) timerAction(timerBtn);
    var deckBtn = e.target.closest("[data-" + P + "-deck]");
    if (deckBtn) { var dk = deckBtn.closest("." + P + "-deck"); if (dk) dealStack(dk, deckBtn.getAttribute("data-" + P + "-deck") === "prev" ? -1 : 1); }

    var opener = e.target.closest("[data-" + P + "-open]");
    if (opener) {
      var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open"));
      if (dlg && dlg.showModal) dlg.showModal();
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

  window.LilacUI = { initIndicators: initIndicators, refresh: refresh, selectTab: selectTab, selectNavItem: selectNavItem, setAccent: setAccent, setTheme: setTheme, syncSlider: syncSlider,
    runTimer: function (el, on) { runTimer(el, on !== false); }, resetTimer: function (el) { var b = el.querySelector('[data-' + P + '-timer="reset"]'); if (b) timerAction(b); },
    dealDeck: function (el, dir) { dealStack(el, dir === "prev" || dir < 0 ? -1 : 1); } };
})();
