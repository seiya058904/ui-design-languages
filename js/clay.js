/* Clay UI — optional behaviour (no dependencies).
   The CSS works without this file; it only wires up:
   - tablists (.clay-segmented / .clay-tabs): click + arrow keys move aria-selected
   - toggle chips (.clay-chip[aria-pressed]): click flips aria-pressed
   - dialogs: [data-clay-open="#id"] opens a <dialog>, [data-clay-close] closes it */
(function () {
  function selectTab(tab) {
    var list = tab.closest('[role="tablist"]');
    if (!list) return;
    list.querySelectorAll('[role="tab"]').forEach(function (t) {
      var on = t === tab;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.tabIndex = on ? 0 : -1;
      var panelId = t.getAttribute("aria-controls");
      if (panelId) {
        var panel = document.getElementById(panelId);
        if (panel) panel.hidden = !on;
      }
    });
  }

  document.addEventListener("click", function (e) {
    var tab = e.target.closest('[role="tab"]');
    if (tab) selectTab(tab);

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
    var tab = e.target.closest && e.target.closest('[role="tab"]');
    if (!tab || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
    var tabs = Array.prototype.slice.call(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    var i = tabs.indexOf(tab) + (e.key === "ArrowRight" ? 1 : -1);
    var next = tabs[(i + tabs.length) % tabs.length];
    next.focus();
    selectTab(next);
    e.preventDefault();
  });
})();
