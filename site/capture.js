/* Site chrome — builds the homepage's live stills on site/capture.html (see the comment there).
   window.CAPTURE → Promise<[{ name, el, dark }]>: every tile and card, rendered and wired by its pack's JS.
   window.CAPTURE_THEME(theme) → Promise: switches the packs to "light" / "dark" and lets them settle. */
(function () {
  var host = document.querySelector("[data-cap]");
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  function tile(pick, wide) {
    var pk = pick.split("/"), st = UIWall.stage(pk[0], pk[1], pk[2]);
    if (!st) throw new Error("no demo " + pick);
    var box = document.createElement("div");
    box.className = "cap-tile" + (wide ? " cap-tile--wide" : "");
    box.appendChild(st);
    host.appendChild(box);
    return { name: "tray-" + pk[0] + "-" + pk[2], el: box, dark: false };
  }
  /* The identical markup of site/compare/<pack>.html, inline with the pack's own CSS and JS. */
  function card(id) {
    var p = UIWall.byId[id];
    return fetch("site/compare/" + id + ".html").then(function (r) { return r.text(); }).then(function (text) {
      var doc = new DOMParser().parseFromString(text, "text/html");
      var pad = (doc.querySelector("style") || {}).textContent || "";
      var m = pad.match(/\.wrap\s*\{\s*padding:\s*([^;]+);/);
      var box = document.createElement("div");
      box.className = "cap-same";
      var inner = document.createElement("div");
      inner.className = "same__inner";
      inner.setAttribute("style", p.root + ";" + (p.page || "") + ";padding:" + (m ? m[1] : "22px"));
      inner.innerHTML = doc.querySelector(".wrap").innerHTML.replace(/min-height:\s*100vh;?/g, "");
      box.appendChild(inner);
      host.appendChild(box);
      return { name: "same-" + id, el: box, dark: p.dark && p.tone !== "dark" };
    });
  }

  window.CAPTURE = UIWall.ready().then(function () {
    return fetch("index.html").then(function (r) { return r.text(); });
  }).then(function (text) {
    var home = new DOMParser().parseFromString(text, "text/html"), shots = [];
    home.querySelectorAll(".tray__item[data-pick]").forEach(function (li) { shots.push(tile(li.getAttribute("data-pick"), li.classList.contains("tray__item--wide"))); });
    return Promise.all(Array.prototype.map.call(home.querySelectorAll("[data-compare]"), function (v) { return card(v.getAttribute("data-compare")); }))
      .then(function (cards) { return shots.concat(cards); });
  }).then(function (shots) {
    return UIWall.scripts().then(function () {
      return Promise.race([document.fonts.ready, wait(8000)]);
    }).then(function () { return wait(900); }).then(function () { return shots; });
  });
  window.CAPTURE_THEME = function (theme) {
    UIWall.setTheme(theme);
    return wait(700);
  };
})();
