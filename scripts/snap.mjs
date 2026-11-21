#!/usr/bin/env node
// Visual check — screenshots the library homepage and every language's styleguide and example
// pages at desktop and mobile widths in a real (headless) Chrome, and flags horizontal overflow.
// Zero dependencies: a tiny static server + the Chrome DevTools protocol over Node's WebSocket.
//
// Usage:
//   node scripts/snap.mjs                    # everything at 1280 and 390
//   node scripts/snap.mjs lilac atelier      # only these languages
//   node scripts/snap.mjs --widths=1440,768,375
//   CHROME_PATH=/path/to/chrome node scripts/snap.mjs
// Output: .snapshots/<language>/<page>@<width>.png (git-ignored). Exit code 1 if any page overflows.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname, dirname, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const widths = (args.find((a) => a.startsWith("--widths="))?.slice(9) || "1280,390").split(",").map(Number);
const only = args.filter((a) => !a.startsWith("--"));
const CHROME = process.env.CHROME_PATH || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
].find((p) => existsSync(p));
if (!CHROME) { console.error("Chrome not found — set CHROME_PATH."); process.exit(1); }

/* ---------- static server (so fetch, localStorage and relative URLs behave like GitHub Pages) ---------- */
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".md": "text/markdown" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
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

/* ---------- pages ---------- */
const langs = (await readdir(root, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "tokens", "tokens.json")))
  .map((d) => d.name)
  .filter((n) => !only.length || only.includes(n));
const pages = only.length ? [] : [{ group: "_site", path: "index.html" }];
for (const lang of langs) {
  pages.push({ group: lang, path: `${lang}/index.html` });
  const ex = join(root, lang, "examples");
  if (existsSync(ex)) for (const f of (await readdir(ex)).sort()) if (f.endsWith(".html")) pages.push({ group: lang, path: `${lang}/examples/${f}` });
}

/* ---------- Chrome ---------- */
const profile = mkdtempSync(join(tmpdir(), "uidl-snap-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
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
const listeners = new Set();
ws.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
  else if (m.method) listeners.forEach((fn) => fn(m));
});
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); })
  .then((m) => { if (m.error) throw new Error(`${method}: ${m.error.message}`); return m.result; });
const nextEvent = (name) => new Promise((r) => { const fn = (m) => { if (m.method === name) { listeners.delete(fn); r(m); } }; listeners.add(fn); });
const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;

await send("Page.enable");
let overflowing = 0;
try {
  for (const page of pages) {
    for (const width of widths) {
      const metrics = (height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await metrics(900);
      const loaded = nextEvent("Page.loadEventFired");
      await send("Page.navigate", { url: `${base}/${page.path}` });
      await loaded;
      await evaluate("document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 700)))");
      const overflow = await evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      const height = await evaluate("Math.min(document.documentElement.scrollHeight, 9000)");
      await metrics(height);
      await evaluate("new Promise((r) => setTimeout(r, 400))");
      const { data } = await send("Page.captureScreenshot", { format: "png" });
      const name = page.path.replace(/^[^/]+\/(?=.)/, page.group === "_site" ? "" : "").replace(/\//g, "_").replace(/\.html$/, "");
      const out = join(root, ".snapshots", page.group, `${page.group === "_site" ? name : name.replace(`${page.group}_`, "")}@${width}.png`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(data, "base64"));
      if (overflow > 1) overflowing++;
      console.log(`${overflow > 1 ? `OVERFLOW ${overflow}px` : "ok"}\t${page.path} @${width}\t→ ${relative(root, out)}`);
      if (overflow > 1) {
        // Name the innermost elements that stick out past the viewport, so the fix is obvious.
        const culprits = await evaluate(`(() => {
          const vw = document.documentElement.clientWidth, out = [];
          const clipped = (el) => { for (let p = el.parentElement; p; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o !== "visible") return p.getBoundingClientRect().right <= vw + 1; } return false; };
          for (const el of document.body.querySelectorAll("*")) {
            const r = el.getBoundingClientRect();
            if (r.right <= vw + 1 || r.width === 0 || clipped(el)) continue;
            if ([...el.children].some((c) => c.getBoundingClientRect().right > vw + 1)) continue;
            const cls = el.getAttribute("class");
            out.push(el.tagName.toLowerCase() + (cls ? "." + cls.trim().split(/\\s+/).join(".") : "") + " (right " + Math.round(r.right) + "px)");
            if (out.length === 5) break;
          }
          return out;
        })()`);
        culprits.forEach((c) => console.log(`\t  ↳ ${c}`));
      }
    }
  }
} finally {
  ws.close();
  chrome.kill();
  server.close();
  setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch { /* Chrome may still hold the temp profile */ } }, 500);
}
console.log(overflowing ? `\n${overflowing} page/width combination(s) overflow horizontally.` : "\nNo horizontal overflow.");
process.exitCode = overflowing ? 1 : 0;
