/* Zine / Brutal — optional behaviour (no dependencies). The CSS works without it; this adds:
   - tablists (.zine-tabs folder tabs, .zine-segmented): click + ←/→/Home/End move aria-selected and
     show the matching aria-controls panel
   - menus and pagination: plain clicks move aria-current="page"
   - chips: .zine-chip[aria-pressed] latches; inside [data-zine-single] only one stays down
   - sliders: keep --zine-value on input.zine-slider and its <output> in sync
   - sortable tables: a .zine-sort button in a <th> sorts the rows (numbers, sizes and dates aware)
     and flips aria-sort
   - dialogs: [data-zine-open="#id"] / [data-zine-close]; toasts and alerts: [data-zine-dismiss]
   - tickets (.zine-ticket): the stub tears off along the perforation (.is-torn) and the sheet is
     stamped; [data-zine-reprint] brings a fresh stub back
   - sticker boards (.zine-board): drag a .zine-slap to move it (lifts while held, slaps down on drop),
     arrow keys nudge the focused one (Shift = further); the one you touch comes to the top
   - theme: [data-theme-set="light|dark|auto"] or a [data-theme-toggle] button / checkbox switches
     <html data-theme>, remembered in localStorage "zine-theme"; fires "zine:themechange"
   Hooks: window.ZineUI.selectTab(tab), .sort(th, dir), .toast(title, text, opts), .setTheme(name), .syncSlider(input) */
(function () {
  var P = "zine";
  var TABLISTS = "." + P + "-tabs, ." + P + "-segmented";
  var TAB_ITEM = "." + P + "-tabs__item, ." + P + "-segmented__item";

  function itemsOf(list) {
    return Array.prototype.filter.call(list.querySelectorAll(TAB_ITEM), function (el) { return el.closest(TABLISTS) === list; });
  }
  function selectTab(tab) {
    var list = tab.closest(TABLISTS);
    if (!list) return;
    itemsOf(list).forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.classList.toggle("is-active", on);
      t.tabIndex = on ? 0 : -1;
      var panel = t.getAttribute("aria-controls") && document.getElementById(t.getAttribute("aria-controls"));
      if (panel) panel.hidden = !on;
    });
  }
  function setCurrent(link, selector) {
    var list = link.parentElement;
    Array.prototype.forEach.call(list.querySelectorAll(selector), function (el) {
      if (el === link) el.setAttribute("aria-current", "page"); else el.removeAttribute("aria-current");
    });
  }

  /* ---------- sliders ---------- */
  function syncSlider(input) {
    var min = parseFloat(input.min || 0), max = parseFloat(input.max || 100), v = parseFloat(input.value);
    input.style.setProperty("--" + P + "-value", String((v - min) / (max - min) * 100));
    var outs = [];
    var range = input.closest("." + P + "-range");
    if (range) outs = Array.prototype.slice.call(range.querySelectorAll("output"));
    if (input.id) outs = outs.concat(Array.prototype.slice.call(document.querySelectorAll('output[for~="' + input.id + '"]')));
    outs.forEach(function (o) { o.textContent = input.value + (o.getAttribute("data-suffix") || ""); });
  }

  /* ---------- sortable tables ---------- */
  var UNITS = { kb: 1e3, mb: 1e6, gb: 1e9, tb: 1e12 };
  function key(cell) {
    var raw = (cell.getAttribute("data-sort") || cell.textContent).trim();
    var size = /^([\d.]+)\s*(kb|mb|gb|tb)$/i.exec(raw);
    if (size) return parseFloat(size[1]) * UNITS[size[2].toLowerCase()];
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return Date.parse(raw);
    var n = parseFloat(raw.replace(/[,\s]/g, ""));
    return !isNaN(n) && /^[-+]?[\d.,\s]+%?$/.test(raw) ? n : raw.toLowerCase();
  }
  function sort(th, dir) {
    var table = th.closest("table"), body = table.tBodies[0];
    if (!body) return;
    var col = Array.prototype.indexOf.call(th.parentElement.children, th);
    var next = dir || (th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending");
    Array.prototype.forEach.call(th.parentElement.children, function (h) { if (h !== th) h.removeAttribute("aria-sort"); });
    th.setAttribute("aria-sort", next);
    var rows = Array.prototype.slice.call(body.rows);
    rows.sort(function (a, b) {
      var x = key(a.cells[col]), y = key(b.cells[col]);
      var r = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y));
      return next === "ascending" ? r : -r;
    });
    rows.forEach(function (r) { body.appendChild(r); });
    table.dispatchEvent(new CustomEvent(P + ":sort", { bubbles: true, detail: { column: col, direction: next } }));
  }

  /* ---------- toasts ---------- */
  function toast(title, text, opts) {
    opts = opts || {};
    var host = document.querySelector("[data-" + P + "-toasts]");
    if (!host) return null;
    var t = document.createElement("div");
    t.className = P + "-toast" + (opts.lime ? " " + P + "-toast--lime" : "");
    t.setAttribute("role", "status");
    t.innerHTML = '<svg class="' + P + '-toast__icon" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="3"/><path d="m10 16.5 4 4 8-9" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="square"/></svg><div><p class="' + P + '-toast__title"></p><p class="' + P + '-toast__text"></p></div><button class="' + P + '-toast__close" type="button" aria-label="Dismiss" data-' + P + '-dismiss><svg class="' + P + '-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg></button>';
    t.querySelector("." + P + "-toast__title").textContent = title;
    t.querySelector("." + P + "-toast__text").textContent = text || "";
    host.appendChild(t);
    setTimeout(function () { t.remove(); }, opts.duration || 3800);
    return t;
  }

  /* ---------- theme ---------- */
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

  /* ---------- events ---------- */
  document.addEventListener("input", function (e) { if (e.target.matches && e.target.matches("." + P + "-slider")) syncSlider(e.target); });
  document.addEventListener("change", function (e) { if (e.target.matches && e.target.matches("input[data-theme-toggle]")) setTheme(e.target.checked ? "dark" : "light"); });
  /* ---------- tickets ---------- */
  function tear(ticket, on) {
    ticket.classList.toggle("is-torn", on);
    var stub = ticket.querySelector("." + P + "-ticket__stub");
    if (stub) stub.setAttribute("aria-hidden", on ? "true" : "false");
    var again = ticket.parentElement && ticket.parentElement.querySelector("[data-" + P + "-reprint]");
    if (again) { again.hidden = !on; if (on) again.focus({ preventScroll: true }); else if (stub) stub.focus({ preventScroll: true }); }
  }

  /* ---------- sticker board ---------- */
  var held = null, topZ = 10;
  function raise(el) { el.style.setProperty("--z", String(++topZ)); }
  function slap(el) { el.classList.remove("is-slapped"); void el.offsetWidth; el.classList.add("is-slapped"); }
  document.addEventListener("pointerdown", function (e) {
    var st = e.target.closest && e.target.closest("." + P + "-slap");
    if (!st || e.button > 0) return;
    var board = st.closest("." + P + "-board");
    if (!board) return;
    var b = board.getBoundingClientRect(), r = st.getBoundingClientRect();
    held = { el: st, board: board, dx: e.clientX - r.left, dy: e.clientY - r.top, moved: false, x0: e.clientX, y0: e.clientY };
    raise(st);
    st.classList.add("is-held");
    try { st.setPointerCapture(e.pointerId); } catch (err) { /* old browsers */ }
    e.preventDefault();
    st.focus({ preventScroll: true });
  });
  document.addEventListener("pointermove", function (e) {
    if (!held) return;
    if (!held.moved && Math.hypot(e.clientX - held.x0, e.clientY - held.y0) < 3) return;
    held.moved = true;
    var b = held.board.getBoundingClientRect(), w = held.el.offsetWidth, h = held.el.offsetHeight;
    var x = Math.max(-w * 0.3, Math.min(b.width - w * 0.7, e.clientX - b.left - held.dx));
    var y = Math.max(-h * 0.3, Math.min(b.height - h * 0.7, e.clientY - b.top - held.dy));
    held.el.style.setProperty("--x", (x / b.width * 100).toFixed(2) + "%");
    held.el.style.setProperty("--y", (y / b.height * 100).toFixed(2) + "%");
  });
  function drop() {
    if (!held) return;
    held.el.classList.remove("is-held");
    slap(held.el);
    held = null;
  }
  document.addEventListener("pointerup", drop);
  document.addEventListener("pointercancel", drop);

  document.addEventListener("click", function (e) {
    var t = e.target;
    var stub = t.closest("." + P + "-ticket__stub");
    if (stub) { var tk = stub.closest("." + P + "-ticket"); if (tk && !tk.classList.contains("is-torn")) tear(tk, true); }
    var reprint = t.closest("[data-" + P + "-reprint]");
    if (reprint) { var host = reprint.parentElement && reprint.parentElement.querySelector("." + P + "-ticket.is-torn"); if (host) tear(host, false); }
    var tab = t.closest(TAB_ITEM);
    if (tab && !tab.disabled) selectTab(tab);
    var item = t.closest("." + P + "-menu__item");
    if (item && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) {
      setCurrent(item, "." + P + "-menu__item");
      if (item.getAttribute("href") === "#") e.preventDefault();
    }
    var page = t.closest("." + P + "-pagination > a");
    if (page && /^\d+$/.test(page.textContent.trim())) {
      setCurrent(page, "a");
      if (page.getAttribute("href") === "#") e.preventDefault();
    }
    var chip = t.closest("." + P + "-chip[aria-pressed]");
    if (chip && !chip.disabled) {
      var group = chip.closest("[data-" + P + "-single]");
      if (group) group.querySelectorAll("." + P + "-chip[aria-pressed]").forEach(function (c) { c.setAttribute("aria-pressed", c === chip ? "true" : "false"); });
      else chip.setAttribute("aria-pressed", chip.getAttribute("aria-pressed") === "true" ? "false" : "true");
    }
    var sorter = t.closest("." + P + "-sort");
    if (sorter) { var th = sorter.closest("th"); if (th) sort(th); }
    var themeSet = t.closest("[data-theme-set]");
    if (themeSet) setTheme(themeSet.getAttribute("data-theme-set"));
    var themeToggle = t.closest("button[data-theme-toggle]");
    if (themeToggle) setTheme(isDark() ? "light" : "dark");
    var opener = t.closest("[data-" + P + "-open]");
    if (opener) { var dlg = document.querySelector(opener.getAttribute("data-" + P + "-open")); if (dlg && dlg.showModal && !dlg.open) dlg.showModal(); }
    var closer = t.closest("[data-" + P + "-close]");
    if (closer) { var d = closer.closest("dialog"); if (d) d.close(closer.value || closer.getAttribute("data-" + P + "-close") || ""); }
    var dismiss = t.closest("[data-" + P + "-dismiss]");
    if (dismiss) { var box = dismiss.closest("." + P + "-toast, ." + P + "-alert"); if (box) box.hidden = true; }
  });
  document.addEventListener("keydown", function (e) {
    var st = e.target.closest && e.target.closest("." + P + "-board ." + P + "-slap");
    var move = st && { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (move) {
      var board = st.closest("." + P + "-board"), step = e.shiftKey ? 8 : 2;
      var x = parseFloat(st.style.getPropertyValue("--x") || getComputedStyle(st).getPropertyValue("--x")) || 0;
      var y = parseFloat(st.style.getPropertyValue("--y") || getComputedStyle(st).getPropertyValue("--y")) || 0;
      st.style.setProperty("--x", Math.max(-10, Math.min(90, x + move[0] * step)).toFixed(2) + "%");
      st.style.setProperty("--y", Math.max(-10, Math.min(85, y + move[1] * step)).toFixed(2) + "%");
      raise(st);
      e.preventDefault();
      return;
    }
    if (st && (e.key === "Enter" || e.key === " ")) { raise(st); slap(st); e.preventDefault(); return; }
    var tab = e.target.closest && e.target.closest(TAB_ITEM);
    if (!tab) return;
    var keys = { ArrowRight: 1, ArrowLeft: -1, Home: "first", End: "last" };
    if (!(e.key in keys)) return;
    var all = itemsOf(tab.closest(TABLISTS)).filter(function (x) { return !x.disabled; });
    var i = all.indexOf(tab), s = keys[e.key];
    var to = s === "first" ? all[0] : s === "last" ? all[all.length - 1] : all[(i + s + all.length) % all.length];
    to.focus();
    selectTab(to);
    if (to.hasAttribute("data-theme-set")) setTheme(to.getAttribute("data-theme-set"));
    e.preventDefault();
  });

  function boot() {
    syncThemeControls();
    document.querySelectorAll("." + P + "-slider").forEach(syncSlider);
    new MutationObserver(function () { document.querySelectorAll("." + P + "-slider").forEach(syncSlider); }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  window.ZineUI = { selectTab: selectTab, sort: sort, toast: toast, setTheme: setTheme, syncSlider: syncSlider, tear: function (el, on) { tear(el, on !== false); } };
})();
