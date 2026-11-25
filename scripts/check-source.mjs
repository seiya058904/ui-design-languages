#!/usr/bin/env node
// Source check — proves the component wall's "Single file" export is complete.
// For every demo in every <pack>/components.html it builds the self-contained file with
// site/source.js (inside the real components page), then renders both that file and the original
// demo (site/demo.html, which links the pack's full CSS and JS) in headless Chrome and compares
// the computed styles of every element and its ::before / ::after — in light and dark.
// Any difference means the export missed a rule, a token or the script.
// Web fonts are blocked during the check: computed styles (font-family included) are the same with or
// without them, and a slow or stalled font request can't hold the page's scripts back or hang the run.
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
const jobs = Math.max(1, Math.min(8, +(args.find((a) => a.startsWith("--jobs="))?.slice(7) || 4)));
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
// Ports Chrome and Node's fetch / WebSocket refuse to connect to (the WHATWG "bad port" list). A random port
// can land on one, so the static server and Chrome's DevTools port are picked again when that happens.
const BAD_PORTS = new Set([1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]);
for (;;) {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  if (!BAD_PORTS.has(server.address().port)) break;
  await new Promise((r) => server.close(r));
}
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------- Chrome ---------- */
async function launch(attempt) {
  const dir = mkdtempSync(join(tmpdir(), "uidl-source-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    proc.stderr.on("data", (d) => { buf += d; const m = buf.match(/DevTools listening on (ws:\/\/\S+)/); if (m) resolve(m[1]); });
    setTimeout(() => reject(new Error("Chrome did not start within 15s")), 15000);
  });
  const p = +new URL(wsUrl).port;
  if (!BAD_PORTS.has(p) || attempt >= 4) return { proc, dir, p };
  const gone = new Promise((r) => proc.once("exit", r));
  proc.kill();
  await Promise.race([gone, new Promise((r) => setTimeout(r, 5000))]);
  try { rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* left to the OS temp cleanup */ }
  return launch(attempt + 1);
}
const { proc: chrome, dir: profile, p: port } = await launch(1);
async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("close", () => { for (const r of pending.values()) r({ error: { message: "DevTools connection closed" } }); pending.clear(); });
  ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
    .then((m) => { if (m.error) throw new Error(`${method}: ${m.error.message}`); return m.result; });
  const evaluate = async (expression) => {
    const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  async function waitFor(expression, timeout = 10000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) { try { if (await evaluate(expression)) return true; } catch { /* page still loading */ } await sleep(35); }
    return false;
  }
  async function open(url, ready) {
    await send("Page.navigate", { url });
    await sleep(30);
    await waitFor(`document.readyState === "complete" && ${ready}`);
    // never wait on fonts for more than a few seconds (they're blocked anyway; this is belt and braces)
    await evaluate("document.fonts ? Promise.race([document.fonts.ready.then(() => true), new Promise((r) => setTimeout(() => r(false), 4000))]) : true");
    await sleep(220); // indicators place themselves on the next frames
  }
  return { ws, send, evaluate, open };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = await connect(version.webSocketDebuggerUrl);
const initialTarget = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
const mainTab = await connect(initialTarget.webSocketDebuggerUrl);
const workerTabs = [mainTab];

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
  await mainTab.send("Network.enable");
  await mainTab.send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] });
  /* Build every single file inside the real components page. */
  await mainTab.open(`${base}/components.html`, `!!window.UISource && !!window.UIWall && document.querySelectorAll(".wcard").length > 0`);
  // The files stay in the page and come over one at a time: all of them in a single reply is several MB,
  // more than one DevTools message carries reliably.
  const list = await mainTab.evaluate(`(async () => {
    const out = [];
    window.__uidlBuilt = {};
    for (const p of UIWall.packs) {
      const pk = UIWall.data[p.id]; if (!pk) continue;
      for (const c of pk.order) for (const d of pk.items[c].demos) {
        const s = await UISource.build(p.id, c, d.id);
        window.__uidlBuilt[p.id + "--" + c + "--" + d.id] = s.file;
        out.push({ p: p.id, c, d: d.id, dark: /data-theme="dark"/.test(s.css) });
      }
    }
    return out;
  })()`);
  const demos = list.filter((x) => (!only.length || only.includes(x.p)) && (!comp || x.c === comp));
  if (!demos.length) throw new Error("no demos found");
  for (const x of demos) {
    const name = `${x.p}--${x.c}--${x.d}`;
    built.set(`${name}.html`, await mainTab.evaluate(`window.__uidlBuilt[${JSON.stringify(name)}]`));
  }

  /* Open extra worker tabs in their own headless windows (newWindow: true) so every tab is visible and fires rAF at full speed. */
  const nWorkers = Math.min(jobs, demos.length);
  for (let w = 1; w < nWorkers; w++) {
    const { targetId } = await browser.send("Target.createTarget", { url: "about:blank", newWindow: true });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const t = targets.find((x) => x.id === targetId);
    const tab = await connect(t.webSocketDebuggerUrl);
    await tab.send("Network.enable");
    await tab.send("Network.setBlockedURLs", { urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"] });
    workerTabs.push(tab);
  }

  let nextIdx = 0;
  async function worker(tab) {
    for (;;) {
      const idx = nextIdx++;
      if (idx >= demos.length) return;
      const x = demos[idx];
      const key = `${x.p}/${x.c}/${x.d}`, file = `${base}/__source/${x.p}--${x.c}--${x.d}.html`;
      const ref = `${base}/site/demo.html?p=${x.p}&c=${x.c}&d=${x.d}`;
      const doDark = !lightOnly && x.dark;

      // Navigate once per page and capture light, then dark on the same loaded DOM.
      await tab.open(ref, `!!document.querySelector(".demo__stage")`);
      await tab.evaluate(prep(false));
      const aLight = await tab.evaluate(collect(".demo__stage"));
      let aDark = null;
      if (doDark) {
        await tab.evaluate(prep(true));
        aDark = await tab.evaluate(collect(".demo__stage"));
      }

      await tab.open(file, `!!document.querySelector("main.demo")`);
      await tab.evaluate(prep(false));
      const bLight = await tab.evaluate(collect("main.demo"));
      let bDark = null;
      if (doDark) {
        await tab.evaluate(prep(true));
        bDark = await tab.evaluate(collect("main.demo"));
      }

      const dLight = diff(aLight, bLight, false);
      checked++;
      if (dLight.length) { failed++; console.log(`DIFF  ${key} — ${dLight.length}\n      ${dLight.slice(0, 6).join("\n      ")}`); }
      if (doDark) {
        const dDark = diff(aDark, bDark, true);
        checked++;
        if (dDark.length) { failed++; console.log(`DIFF  ${key} (dark) — ${dDark.length}\n      ${dDark.slice(0, 6).join("\n      ")}`); }
      }
    }
  }
  await Promise.all(workerTabs.map(worker));
  console.log(`\n${checked - failed}/${checked} renders identical across ${demos.length} demos${lightOnly ? " (light only)" : " (light + dark)"}.`);
} catch (e) {
  console.error("check-source failed:", e.message);
  failed = failed || 1;
} finally {
  // Wait for Chrome to exit before removing its temp profile (Windows keeps it locked until then).
  for (const tab of workerTabs) { try { tab.ws.close(); } catch { /* already closed */ } }
  try { browser.ws.close(); } catch { /* already closed */ }
  server.close();
  const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await Promise.race([exited, sleep(5000)]);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* leave it to the OS temp cleanup */ }
}
process.exit(failed ? 1 : 0);
