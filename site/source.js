/* Site chrome — the complete source for any demo on the component wall. Not part of any pack.

   For one demo it reads the pack's own files (tokens.css, base.css, component CSS, the pack's
   script and AGENTS.md) and returns:
     html    the demo markup, exactly as it appears in <pack>/components.html
     css     exactly the CSS that markup needs: the component rules whose classes it uses (with
             their comments, media queries and keyframes), the base layer, and only the tokens
             those rules reference — light and dark, resolved through every var() chain
     js      the pack's behaviour file, when the markup relies on it (indicators, tabs, sliders…)
     file    one self-contained HTML file with all of the above inlined — it runs as-is
     prompt  a brief for an AI assistant: what to rebuild, the pack's rules, and the file

   UISource.build(packId, compId, demoId) → Promise<{ html, css, js, file, prompt, info }>
   UISource.highlight(code, lang)         → HTML string with token spans (html | css | js) */
(function () {
  var W = window.UIWall;
  /* Per-pack facts — summary, fonts, the markup that needs the pack's script (site.hooks) and the
     dark-theme hint — come from packs.json through UIWall.byId. */
  var VARIANT_HOOKS = "[data-accent-set], [data-tone-set], [data-appearance]";

  function get(url) {
    return fetch(url).then(function (r) { if (!r.ok) throw new Error(url + " → " + r.status); return r.text(); });
  }

  /* ---------- A small CSS parser that keeps the source text (comments, indentation) ---------- */
  function skipComment(text, i) { var e = text.indexOf("*/", i + 2); return e < 0 ? text.length : e + 2; }
  function parse(text) {
    var nodes = [], i = 0, n = text.length;
    while (i < n) {
      while (i < n && /\s/.test(text.charAt(i))) i++;
      if (i >= n) break;
      var ls = text.lastIndexOf("\n", i - 1) + 1, indent = text.slice(ls, i);
      if (/\S/.test(indent)) indent = "";
      if (text.substr(i, 2) === "/*") {
        var ce = skipComment(text, i);
        nodes.push({ type: "comment", raw: text.slice(i, ce), indent: indent });
        i = ce; continue;
      }
      var j = i, paren = 0, q = null, c;
      while (j < n) {
        c = text.charAt(j);
        if (q) { if (c === "\\") j++; else if (c === q) q = null; }
        else if (c === '"' || c === "'") q = c;
        else if (c === "/" && text.charAt(j + 1) === "*") { j = skipComment(text, j); continue; }
        else if (c === "(") paren++;
        else if (c === ")") paren--;
        else if (!paren && (c === "{" || c === ";")) break;
        j++;
      }
      if (j >= n) break;
      var prelude = text.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, "").trim();
      if (text.charAt(j) === ";") { nodes.push({ type: "stmt", prelude: prelude, raw: text.slice(i, j + 1), indent: indent }); i = j + 1; continue; }
      var k = j + 1, depth = 1;
      q = null;
      while (k < n && depth) {
        c = text.charAt(k);
        if (q) { if (c === "\\") k++; else if (c === q) q = null; }
        else if (c === '"' || c === "'") q = c;
        else if (c === "/" && text.charAt(k + 1) === "*") { k = skipComment(text, k); continue; }
        else if (c === "{") depth++;
        else if (c === "}") depth--;
        k++;
      }
      var node = { type: "block", prelude: prelude, body: text.slice(j + 1, k - 1), raw: text.slice(i, k), indent: indent };
      if (/^@(media|supports|layer|container)\b/i.test(prelude)) node.children = parse(node.body);
      nodes.push(node);
      i = k;
    }
    return nodes;
  }

  /* Split on top-level commas (not inside :is(), [attr="a,b"], …). */
  function splitTop(s) {
    var out = [], depth = 0, q = null, start = 0;
    for (var i = 0; i < s.length; i++) {
      var c = s.charAt(i);
      if (q) { if (c === q) q = null; continue; }
      if (c === '"' || c === "'") q = c;
      else if (c === "(" || c === "[") depth++;
      else if (c === ")" || c === "]") depth--;
      else if (c === "," && !depth) { out.push(s.slice(start, i)); start = i + 1; }
    }
    out.push(s.slice(start));
    return out.map(function (x) { return x.trim(); }).filter(Boolean);
  }

  /* Does this selector apply to the demo? true: every pack class it names is in the markup;
     false: it needs a class the markup doesn't have; null: it names no pack class (a global rule).
     :not() never requires anything; :is()/:where() need just one of their alternatives. */
  function selectorFits(sel, used, prefix) {
    var fail = false, out = "", i = 0;
    while (i < sel.length) {
      var m = /^:(not|is|where|matches)\(/.exec(sel.slice(i));
      if (!m) { out += sel.charAt(i++); continue; }
      var start = i + m[0].length, depth = 1, j = start;
      while (j < sel.length && depth) { if (sel.charAt(j) === "(") depth++; else if (sel.charAt(j) === ")") depth--; j++; }
      var inner = sel.slice(start, j - 1);
      if (m[1] !== "not") {
        var alts = splitTop(inner).map(function (a) { return selectorFits(a, used, prefix); });
        if (alts.length && alts.every(function (r) { return r === false; })) fail = true;
      }
      i = j;
    }
    if (fail) return false;
    var cls = (out.replace(/\[[^\]]*\]/g, "").match(/\.-?[_a-zA-Z][\w-]*/g) || [])
      .map(function (c) { return c.slice(1); })
      .filter(function (c) { return c.indexOf(prefix + "-") === 0; });
    if (!cls.length) return null;
    return cls.every(function (c) { return used[c]; });
  }
  function ruleFits(prelude, used, prefix) {
    var any = false, global = true;
    splitTop(prelude).forEach(function (sel) {
      var r = selectorFits(sel, used, prefix);
      if (r === true) any = true;
      if (r !== null) global = false;
    });
    return any ? "yes" : global ? "global" : "no";
  }

  /* Keep the rules `keep(prelude)` accepts, each with the comment right above it, inside their
     original @media / @supports wrappers. */
  function pick(nodes, keep) {
    var out = [], taken = [];
    nodes.forEach(function (nd, idx) {
      if (nd.type !== "block") return;
      if (nd.children) {
        var inner = pick(nd.children, keep);
        if (inner.length) out.push(nd.indent + nd.prelude + " {\n" + inner.join("\n") + "\n" + nd.indent + "}");
        return;
      }
      if (nd.prelude.charAt(0) === "@" || !keep(nd.prelude)) return;
      var txt = nd.indent + nd.raw, prev = nodes[idx - 1];
      if (prev && prev.type === "comment" && prev.raw.length < 700 && taken.indexOf(idx - 1) < 0 && idx - 1 > 0) {
        txt = prev.indent + prev.raw + "\n" + txt;
        taken.push(idx - 1);
      }
      out.push(txt);
    });
    return out;
  }
  function atBlocks(nodes, kind) {
    var out = [];
    (function walk(list) {
      list.forEach(function (nd) {
        if (nd.type !== "block") return;
        if (nd.children) walk(nd.children);
        else if (nd.prelude.toLowerCase().indexOf("@" + kind) === 0) out.push(nd);
      });
    })(nodes);
    return out;
  }

  /* ---------- Tokens: keep only the custom properties the CSS reaches, in every theme block ---------- */
  function tokenBlocks(text) {
    var blocks = [];
    (function walk(list, wrap) {
      list.forEach(function (nd) {
        if (nd.type !== "block") return;
        if (nd.children) { walk(nd.children, nd.prelude); return; }
        var lines = nd.body.split("\n").filter(function (l) { return l.trim(); }).map(function (l) {
          var m = /^\s*(--[\w-]+)\s*:\s*([\s\S]*?);/.exec(l);
          return { raw: l.replace(/^\s+/, ""), name: m ? m[1] : null, value: m ? m[2] : "" };
        });
        blocks.push({ wrap: wrap || null, selector: nd.prelude, lines: lines });
      });
    })(parse(text), null);
    return blocks;
  }
  function varsIn(text) {
    var out = {}, re = /var\(\s*(--[\w-]+)/g, m;
    while ((m = re.exec(text))) out[m[1]] = true;
    return out;
  }
  function resolveTokens(blocks, seedText, withVariants) {
    var need = varsIn(seedText), grew = true;
    var use = blocks.filter(function (b) {
      var variant = /data-(accent|tone|density|contrast|motion)/.test(b.selector);
      return !variant || withVariants;
    });
    while (grew) {
      grew = false;
      use.forEach(function (b) {
        b.lines.forEach(function (l) {
          if (!l.name || !need[l.name]) return;
          Object.keys(varsIn(l.value)).forEach(function (v) { if (!need[v]) { need[v] = true; grew = true; } });
        });
      });
    }
    var count = 0, out = [];
    use.forEach(function (b) {
      var lines = b.lines.filter(function (l) { return l.name ? need[l.name] : true; });
      if (!lines.some(function (l) { return l.name; })) return;
      if (b.selector === ":root") count = lines.filter(function (l) { return l.name; }).length;
      var pad = b.wrap ? "    " : "  ", close = b.wrap ? "  }" : "}";
      var block = (b.wrap ? "  " : "") + b.selector + " {\n" + lines.map(function (l) { return pad + l.raw; }).join("\n") + "\n" + close;
      out.push(b.wrap ? b.wrap + " {\n" + block + "\n}" : block);
    });
    return { css: out.join("\n\n"), count: count };
  }

  /* ---------- Per-pack files (fetched and parsed once) ---------- */
  var packs = {};
  function packFiles(p) {
    if (packs[p]) return packs[p];
    var entry = p + "/css/" + p + ".css";
    packs[p] = get(entry).then(function (text) {
      var imports = [], re = /@import\s+url\(\s*["']?([^"')]+)["']?\s*\)/g, m;
      while ((m = re.exec(text))) imports.push(new URL(m[1], new URL(entry, location.href)).href);
      return Promise.all([
        Promise.all(imports.map(function (u) { return get(u).then(function (t) { return { url: u, text: t }; }); })),
        W.byId[p] && W.byId[p].js ? get(p + "/js/" + p + ".js").catch(function () { return ""; }) : "",
        get(p + "/AGENTS.md").catch(function () { return ""; })
      ]);
    }).then(function (r) {
      var files = r[0].map(function (f) {
        var rel = f.url.slice(f.url.indexOf("/" + p + "/") + 1);
        return { path: rel, name: rel.split("/").pop(), text: f.text, nodes: /tokens\.css$/.test(rel) ? null : parse(f.text) };
      });
      var tokens = files.filter(function (f) { return /tokens\.css$/.test(f.path); })[0];
      return {
        tokens: tokens ? tokenBlocks(tokens.text) : [],
        tokensPath: tokens ? tokens.path : p + "/tokens/tokens.css",
        base: files.filter(function (f) { return /\/base\.css$/.test(f.path); })[0],
        comps: files.filter(function (f) { return f.nodes && !/\/base\.css$/.test(f.path); }),
        js: r[1],
        rules: rulesFrom(r[2])
      };
    });
    return packs[p];
  }
  function rulesFrom(md) {
    var parts = md.split(/\n(?=## )/), out = [];
    parts.forEach(function (s) { if (/^## [^\n]*rules/i.test(s)) out.push(s.trim()); });
    return out.join("\n\n");
  }

  /* ---------- Build ---------- */
  function classesOf(html, extra) {
    var used = {};
    (extra || []).forEach(function (c) { used[c] = true; });
    var re = /\bclass\s*=\s*"([^"]*)"/g, m;
    while ((m = re.exec(html))) m[1].split(/\s+/).forEach(function (c) { if (c) used[c] = true; });
    return used;
  }
  function banner(title) { return "/* ==== " + title + " " + new Array(Math.max(4, 86 - title.length)).join("=") + " */"; }
  function kb(text) { return (new Blob([text]).size / 1024).toFixed(1) + " KB"; }
  function lines(text) { return text.split("\n").length; }

  // A built source holds the pack's CSS + JS text; keep the last dozen so a long browse stays light.
  var built = {}, order = [];
  function build(p, c, d) {
    var hit = W.demo(p, c, d);
    if (!hit) return Promise.reject(new Error("unknown demo"));
    var key = p + "/" + c + "/" + hit.demo.id;
    if (built[key]) { order.splice(order.indexOf(key), 1); order.push(key); return built[key]; }
    order.push(key);
    if (order.length > 12) delete built[order.shift()];
    built[key] = packFiles(p).then(function (pk) {
      var pack = W.byId[p], comp = hit.component, dm = hit.demo;
      var html = dm.html;
      var used = classesOf(html, dm.classes);
      var frag = document.createElement("template");
      frag.innerHTML = '<div class="' + dm.classes.join(" ") + '">' + html + "</div>";
      var needsJs = !!pk.js && !!pack.hooks && !!frag.content.firstChild.querySelector(pack.hooks);
      var variants = !!frag.content.querySelector(VARIANT_HOOKS);

      /* Component rules, file by file; keyframes and @property they reference come along. */
      var sections = [], picked = "";
      pk.comps.forEach(function (f) {
        var rules = pick(f.nodes, function (pre) { return ruleFits(pre, used, p) === "yes"; });
        if (!rules.length) return;
        var text = rules.join("\n\n");
        picked += text;
        // One file per component (Clay): its header comment documents the usage, so keep it.
        if (pk.comps.length > 1 && f.nodes[0] && f.nodes[0].type === "comment") text = f.nodes[0].raw + "\n\n" + text;
        sections.push({ title: (pk.comps.length > 1 ? f.name.replace(/\.css$/, "").replace(/^./, function (x) { return x.toUpperCase(); }) : comp.title) + " — from " + f.path, text: text });
      });
      var base = pk.base ? pick(pk.base.nodes, function (pre) { return ruleFits(pre, used, p) !== "no"; }).join("\n\n") : "";
      var all = pk.comps.concat(pk.base ? [pk.base] : []);
      var frames = [];
      all.forEach(function (f) {
        atBlocks(f.nodes, "keyframes").forEach(function (k) {
          var name = k.prelude.replace(/^@(-webkit-)?keyframes\s+/i, "").trim();
          if (new RegExp("animation(-name)?\\s*:[^;{}]*\\b" + name.replace(/[-]/g, "\\-") + "\\b").test(picked + base) && frames.indexOf(k.raw) < 0) frames.push(k.raw);
        });
        atBlocks(f.nodes, "property").forEach(function (k) {
          var name = k.prelude.replace(/^@property\s+/i, "").trim();
          if ((picked + base).indexOf(name) >= 0 && frames.indexOf(k.raw) < 0) frames.unshift(k.raw);
        });
      });
      if (frames.length) sections.push({ title: "Animations — from " + p + "/css", text: frames.join("\n\n") });

      var compCss = sections.map(function (s) { return banner(s.title) + "\n" + s.text; }).join("\n\n");
      var tokens = resolveTokens(pk.tokens, compCss + base + html, variants);
      var css = [
        banner(pack.name + " tokens — only the ones this component uses (from " + pk.tokensPath + ")") + "\n" + tokens.css,
        base ? banner("Base — from " + (pk.base ? pk.base.path : "")) + "\n" + base : "",
        compCss
      ].filter(Boolean).join("\n\n") + "\n";

      /* Icons the markup uses, as an inline sprite. */
      var ids = {}, re = /href="#([\w-]+)"/g, m;
      while ((m = re.exec(html))) ids[m[1]] = true;
      var symbols = Object.keys(ids).map(function (id) { return (W.data[p].symbols || {})[id]; }).filter(Boolean);
      var sprite = symbols.length ? '<svg aria-hidden="true" style="position:absolute;width:0;height:0;overflow:hidden">\n' +
        symbols.map(function (s) { return "  " + s.replace(/\s*xmlns="[^"]*"/, ""); }).join("\n") + "\n</svg>\n" : "";

      var title = pack.name + " · " + comp.title + (comp.demos.length > 1 ? " — " + dm.label : "");
      var indented = html.split("\n").map(function (l) { return l ? "  " + l : l; }).join("\n");
      var file = "<!doctype html>\n<html lang=\"en\">\n<head>\n" +
        "<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n" +
        "<title>" + title + "</title>\n" +
        "<!-- " + title + ", from the " + pack.name + " design language (UI Design Languages). Everything it needs is inlined below:\n" +
        "     tokens, base, component CSS" + (needsJs ? ", the behaviour script" : "") + (symbols.length ? " and icons" : "") + ". Open it in a browser — no build, no dependencies." +
        (!/data-theme="dark"/.test(tokens.css) ? "" : pack.darkHint && needsJs
          ? "\n     Dark theme: " + pack.darkHint + "."
          : "\n     Dark theme: add data-theme=\"dark\" (or \"auto\") to <html>.") + " -->\n" +
        "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n" +
        pack.fonts.map(function (u) {
          return "<link rel=\"stylesheet\" href=\"" + u + "\" media=\"print\" onload=\"this.media='all'\">\n" +
            "<noscript><link rel=\"stylesheet\" href=\"" + u + "\"></noscript>\n";
        }).join("") +
        "<style>\n" + css + "\n" + banner("Preview layout only — centres the demo; not part of " + pack.name) + "\n" +
        "body { min-height: 100vh; display: grid; place-items: center; padding: 48px 20px; }\n" +
        ".demo { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 18px 22px; width: min(100%, 760px); padding: 40px 28px; }\n" +
        (c === "compare" ? ".spec { display: flex; flex-direction: column; gap: 16px; }\n.line { display: flex; align-items: center; justify-content: space-between; gap: 12px; }\n.line--start { justify-content: flex-start; flex-wrap: wrap; }\n.demo > article { width: min(100%, 360px); }\n" : "") +
        "</style>\n</head>\n<body>\n" + sprite +
        "<main class=\"" + ["demo"].concat(dm.classes).join(" ") + "\">\n" + indented + "\n</main>\n" +
        (needsJs ? "<script>\n" + pk.js.replace(/<\/script/gi, "<\\/script") + "\n</script>\n" : "") +
        "</body>\n</html>\n";

      var site = new URL("./", location.href).href;
      var prompt = [
        "Rebuild this UI component exactly: the " + comp.title + (comp.demos.length > 1 ? " (" + dm.label + ")" : "") + " from the " + pack.name + " design language.",
        "",
        pack.name + ": " + pack.summary + " " + comp.title + ": " + comp.summary,
        "",
        "What \"exactly\" means:",
        "- Keep the structure, the ." + p + "-* class names and every aria-* attribute. The CSS" + (needsJs ? " and the script" : "") + " key off them (aria-selected, aria-pressed, aria-current, :disabled).",
        "- Every color, radius, shadow, size and duration comes from the var(--" + p + "-*) tokens in the file below. Don't introduce new values.",
        "- Keep every state and the motion between them: hover, pressed (:active), keyboard focus (:focus-visible), selected, disabled. Respect prefers-reduced-motion the way the CSS does.",
        needsJs ? "- Behaviour (sliding indicators, keyboard arrows, toggles, sliders) comes from " + p + ".js, inlined at the end of the file. Keep it, or reproduce exactly what it does."
          : "- There is no JavaScript: every state is pure CSS.",
        "- Porting to React, Vue, Svelte or a native stack: keep the same classes and attributes and drive aria-selected / aria-current / aria-pressed from state" + (needsJs ? "; the script picks up components rendered later and follows attribute changes." : "."),
        "- Use the fonts linked in the file.",
        "",
        pk.rules ? pack.name + " rules (from " + p + "/AGENTS.md):\n\n" + pk.rules + "\n" : "",
        "Reference implementation: one complete, working HTML file. Open it in a browser to see the target, then match it.",
        "",
        "```html",
        file.trim(),
        "```",
        "",
        "Source library: " + site + p + "/ (tokens/tokens.json is the source of truth for every value)."
      ].join("\n");

      return {
        html: html, css: css, js: needsJs ? pk.js : "", file: file, prompt: prompt,
        info: {
          title: title, fileName: p + "-" + comp.id + (comp.demos.length > 1 ? "-" + dm.id : "") + ".html",
          htmlFrom: c === "compare" ? "site/compare/" + p + ".html" : p + "/components.html",
          cssFrom: sections.map(function (s) { return s.title.split(" — from ")[1]; }).filter(function (v, i, a) { return a.indexOf(v) === i; }),
          tokenCount: tokens.count, jsFrom: needsJs ? p + "/js/" + p + ".js" : "",
          size: { html: kb(html), css: kb(css), js: needsJs ? kb(pk.js) : "", file: kb(file) },
          lines: { html: lines(html), css: lines(css), js: needsJs ? lines(pk.js) : 0, file: lines(file) }
        }
      };
    });
    built[key].catch(function () { delete built[key]; });
    return built[key];
  }

  /* ---------- Highlighting (tiny, regex-based; output is escaped) ---------- */
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function wrap(cls, s) { return '<span class="t-' + cls + '">' + esc(s) + "</span>"; }
  function hlCss(code) {
    return code.replace(/(\/\*[\s\S]*?\*\/)|("[^"\n]*"|'[^'\n]*')|(@[\w-]+)|(--[\w-]+)|(#[0-9a-fA-F]{3,8}\b)|(-?\b\d*\.?\d+(?:px|em|rem|ms|s|%|deg|vw|vh|fr)?\b)|([\w-]+)(?=\s*:[^;{}]*;)|([^\s{};:,()]+)(?=[^{};]*\{)|([\s\S])/g,
      function (all, com, str, at, prop, hex, num, decl, sel, other) {
        if (com) return wrap("c", com);
        if (str) return wrap("s", str);
        if (at) return wrap("k", at);
        if (prop) return wrap("v", prop);
        if (hex || num) return wrap("n", all);
        if (decl) return wrap("a", decl);
        if (sel) return wrap("t", sel);
        return esc(other);
      });
  }
  function hlHtml(code) {
    return code.replace(/(<!--[\s\S]*?-->)|(<\/?)([\w-]+)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?>)|([^<]+)|([\s\S])/g,
      function (all, com, open, tag, attrs, close, text, other) {
        if (com) return wrap("c", com);
        if (tag) {
          var a = (attrs || "").replace(/(\s+)([^\s=>\/]+)(?:(\s*=\s*)("[^"]*"|'[^']*'|[^\s>]+))?/g, function (x, sp, name, eq, val) {
            return sp + wrap("a", name) + (eq ? esc(eq) + wrap("s", val) : "");
          });
          return wrap("p", open) + wrap("t", tag) + a + wrap("p", close);
        }
        return esc(text || other);
      });
  }
  var JS_KW = /^(var|let|const|function|return|if|else|for|while|do|new|this|typeof|instanceof|in|of|true|false|null|undefined|try|catch|finally|throw|break|continue|switch|case|default)$/;
  function hlJs(code) {
    return code.replace(/(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)|([\s\S])/g,
      function (all, com, str, num, word, other) {
        if (com) return wrap("c", com);
        if (str) return wrap("s", str);
        if (num) return wrap("n", num);
        if (word) return JS_KW.test(word) ? wrap("k", word) : esc(word);
        return esc(other);
      });
  }
  function hlFile(code) {
    var out = "", re = /(<style>)([\s\S]*?)(<\/style>)|(<script>)([\s\S]*?)(<\/script>)/g, last = 0, m;
    while ((m = re.exec(code))) {
      out += hlHtml(code.slice(last, m.index));
      out += m[1] ? hlHtml(m[1]) + hlCss(m[2]) + hlHtml(m[3]) : hlHtml(m[4]) + hlJs(m[5]) + hlHtml(m[6]);
      last = re.lastIndex;
    }
    return out + hlHtml(code.slice(last));
  }
  function highlight(code, lang) {
    if (lang === "css") return hlCss(code);
    if (lang === "js") return hlJs(code);
    if (lang === "file") return hlFile(code);
    return hlHtml(code);
  }

  window.UISource = { build: build, highlight: highlight, _parse: parse, _ruleFits: ruleFits };
})();
