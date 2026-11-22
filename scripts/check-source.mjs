#!/usr/bin/env node
// Source check — proves the component wall's "Single file" export is complete.
// For every demo in every <pack>/components.html it builds the self-contained file with
// site/source.js (inside the real components page), then renders both that file and the original
// demo (site/demo.html, which links the pack's full CSS and JS) in headless Chrome and compares
// the computed styles of every element and its ::before / ::after — in light and dark.
// Any difference means the export missed a rule, a token or the script.
// Zero dependencies: a tiny static server + the Chrome DevTools protocol over Node's WebSocket.
//
// Usage:
//   node scripts/check-source.mjs              # all packs, light + dark
//   node scripts/check-source.mjs clay lilac   # only these packs
//   node scripts/check-source.mjs --light      # skip the dark pass
//   node scripts/check-source.mjs --component=dialog
//   CHROME_PATH=/path/to/chrome node scripts/check-source.mjs
// Exit code 1 if any demo differs.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname, dirname, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith("--"));
const lightOnly = args.includes("--light");
const comp = args.find((a) => a.startsWith("--component="))?.slice(12);
const CHROME = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome not found — set CHROME_PATH."); process.exit(1); }

/* ---------- static server; built single files are served from memory under /__source/ ---------- */
const built = new Map();
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".md": "text/markdown" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (p.startsWith("/__source/")) {
      const body = built.get(p.slice(10));
      if (body == null) throw new Error("not built");
      res.writeHead(200, { "content-type": "text/html" });
      return res.end(body);
    }
    if (p.endsWith("/")) p += "index.html";
    const file = join(root, p);
    if (!file.startsWith(root + sep)) throw new Error("outside root");
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------- Chrome ---------- */
const profile = mkdtempSync(join(tmpdir(), "uidl-source-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
const browserWs = await new Promise((resolve, reject) => {
  let buf = "";
  chrome.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
  setTimeout(() => reject(new Error("Chrome did not start within 15s")), 15000);
});
const port = new URL(browserWs).port;
const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener("open", r, { once: true }));
let id = 0;
const pending = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((m) => { if (m.error) throw new Error(`${method}: ${m.error.message}`); return m.result; });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(expression, timeout = 10000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) { try { if (await evaluate(expression)) return true; } catch { /* page still loading */ } await sleep(100); }
  return false;
}
async function open(url, ready) {
  await send("Page.navigate", { url });
  await sleep(150);
  await waitFor(`document.readyState === "complete" && ${ready}`);
  await evaluate("document.fonts ? document.fonts.ready.then(() => true) : true");
  await sleep(350); // indicators place themselves on the next frames
}

/* ---------- what gets compared ---------- */
const PROPS = ["display", "color", "background-color", "background-image", "box-shadow", "border-top-left-radius", "border-top-width", "border-top-style", "border-top-color",
  "font-family", "font-size", "font-weight", "letter-spacing", "line-height", "padding-top", "padding-left", "opacity", "cursor", "text-transform", "outline-style", "filter",
  "transition-duration", "transition-timing-function"];
const PSEUDO = ["content", "background-color", "background-image", "box-shadow", "opacity", "border-top-left-radius", "transform"];
const collect = (sel) => `(() => {
  const root = document.querySelector(${JSON.stringify(sel)}); if (!root) return null;
  const P = ${JSON.stringify(PROPS)}, Q = ${JSON.stringify(PSEUDO)};
  return [...root.querySelectorAll("*")].filter((e) => !(e.closest("svg") && e.tagName.toLowerCase() !== "svg")).map((e) => {
    const cs = getComputedStyle(e), b = getComputedStyle(e, "::before"), a = getComputedStyle(e, "::after");
    const o = { tag: e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.split(" ")[0] : "") };
    P.forEach((p) => (o[p] = cs.getPropertyValue(p)));
    Q.forEach((p) => { o["::before " + p] = b.getPropertyValue(p); o["::after " + p] = a.getPropertyValue(p); });
    return o;
  });
})()`;
// Both pages: show dialogs open (the catalog frame does), and for the dark pass switch the theme
// with transitions off so nothing is caught mid-fade.
const prep = (dark) => `(() => {
  document.querySelectorAll("dialog").forEach((d) => d.setAttribute("open", ""));
  document.getAnimations().forEach((a) => { try { a.finish(); } catch (e) { /* infinite loops can't finish */ } });
  ${dark ? `const s = document.createElement("style"); s.textContent = "*, *::before, *::after { transition: none !important; }"; document.head.appendChild(s);
  document.documentElement.setAttribute("data-theme", "dark");` : ""}
  return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(true))));
})()`;
function diff(a, b, dark) {
  if (!a || !b) return [`root missing (${!!a}, ${!!b})`];
  if (a.length !== b.length) return [`element count ${a.length} vs ${b.length}`];
  const out = [];
  a.forEach((ea, i) => {
    for (const k of Object.keys(ea)) {
      if (k === "tag" || (dark && k.startsWith("transition"))) continue;
      if (ea[k] !== b[i][k]) out.push(`${ea.tag} ${k}: ${String(ea[k]).slice(0, 90)}  ≠  ${String(b[i][k]).slice(0, 90)}`);
    }
  });
  return out;
}

let failed = 0, checked = 0;
try {
  /* Build every single file inside the real components page. */
  await open(`${base}/components.html`, `!!window.UISource && !!window.UIWall && document.querySelectorAll(".wcard").length > 0`);
  const list = await evaluate(`(async () => {
    const out = [];
    for (const p of UIWall.packs) {
      const pk = UIWall.data[p.id]; if (!pk) continue;
      for (const c of pk.order) for (const d of pk.items[c].demos) {
        const s = await UISource.build(p.id, c, d.id);
        out.push({ p: p.id, c, d: d.id, file: s.file, dark: /data-theme="dark"/.test(s.css) });
      }
    }
    return out;
  })()`);
  const demos = list.filter((x) => (!only.length || only.includes(x.p)) && (!comp || x.c === comp));
  if (!demos.length) throw new Error("no demos found");
  for (const x of demos) built.set(`${x.p}--${x.c}--${x.d}.html`, x.file);

  for (const x of demos) {
    const key = `${x.p}/${x.c}/${x.d}`, file = `${base}/__source/${x.p}--${x.c}--${x.d}.html`;
    const ref = `${base}/site/demo.html?p=${x.p}&c=${x.c}&d=${x.d}`;
    for (const dark of lightOnly || !x.dark ? [false] : [false, true]) {
      await open(ref, `!!document.querySelector(".demo__stage")`);
      await evaluate(prep(dark));
      const A = await evaluate(collect(".demo__stage"));
      await open(file, `!!document.querySelector("main.demo")`);
      await evaluate(prep(dark));
      const B = await evaluate(collect("main.demo"));
      const d = diff(A, B, dark);
      checked++;
      if (d.length) { failed++; console.log(`DIFF  ${key}${dark ? " (dark)" : ""} — ${d.length}\n      ${d.slice(0, 6).join("\n      ")}`); }
    }
  }
  console.log(`\n${checked - failed}/${checked} renders identical across ${demos.length} demos${lightOnly ? " (light only)" : " (light + dark)"}.`);
} catch (e) {
  console.error("check-source failed:", e.message);
  failed = failed || 1;
} finally {
  ws.close();
  chrome.kill();
  server.close();
  await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold the profile on Windows */ }
}
process.exit(failed ? 1 : 0);
