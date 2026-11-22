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
//   node scripts/snap.mjs --thumbs           # 640×400 JPEG thumbnails for the homepage → site/assets/thumbs/
// Output: .snapshots/<language>/<page>@<width>.png (git-ignored). Exit code 1 if any page overflows.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { join, extname, dirname, relative, sep } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { inflateSync, deflateSync, crc32 } from "node:zlib";

/* ---------- minimal PNG decode / encode, to stitch slice captures into one page image ---------- */
function decodePNG(buf) {
  let pos = 8, width = 0, height = 0, type = 6;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos), name = buf.toString("ascii", pos + 4, pos + 8), d = buf.subarray(pos + 8, pos + 8 + len);
    if (name === "IHDR") { width = d.readUInt32BE(0); height = d.readUInt32BE(4); type = d[9]; }
    else if (name === "IDAT") idat.push(d);
    else if (name === "IEND") break;
    pos += 12 + len;
  }
  const bpp = type === 6 ? 4 : 3, stride = width * bpp, raw = inflateSync(Buffer.concat(idat)), out = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)], src = y * (stride + 1) + 1, o = y * stride;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? out[o + x - bpp] : 0, b = y ? out[o - stride + x] : 0, c = x >= bpp && y ? out[o - stride + x - bpp] : 0;
      let v = raw[src + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      out[o + x] = v & 255;
    }
  }
  return { width, height, bpp, data: out };
}
function encodePNG({ width, height, bpp, data }) {
  const stride = width * bpp, raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) data.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  const chunk = (name, d) => {
    const b = Buffer.alloc(12 + d.length);
    b.writeUInt32BE(d.length, 0); b.write(name, 4, "ascii"); d.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + d.length)), 8 + d.length);
    return b;
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = bpp === 4 ? 6 : 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}
function stitch(slices) {
  const parts = slices.map(decodePNG), first = parts[0];
  return encodePNG({ width: first.width, height: parts.reduce((h, p) => h + p.height, 0), bpp: first.bpp, data: Buffer.concat(parts.map((p) => p.data)) });
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const widths = (args.find((a) => a.startsWith("--widths="))?.slice(9) || "1280,390").split(",").map(Number);
const only = args.filter((a) => !a.startsWith("--"));
const thumbs = args.includes("--thumbs");
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
const sitePages = [{ group: "_site", path: "index.html" }, { group: "_site", path: "components.html" }];
const pages = thumbs ? [] : !only.length || only.includes("site") ? sitePages : [];
for (const lang of langs) {
  pages.push({ group: lang, path: `${lang}/index.html` });
  if (existsSync(join(root, lang, "components.html"))) pages.push({ group: lang, path: `${lang}/components.html` });
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
// Jump finite entrance animations (ring fills, dialog pops) to their end and freeze infinite loops
// (marquees, auroras), so captures are deterministic and a tall headless viewport isn't repainted every frame.
// Scroll-triggered reveals and scroll-linked tilts are shown in their final state.
const SETTLE = "document.getAnimations().forEach((a) => { try { if (a.effect && a.effect.getComputedTiming().endTime !== Infinity) a.finish(); else a.pause(); } catch (e) {} }); document.querySelectorAll('.rise, .reveal-words, .wcard').forEach((el) => el.classList.add('is-in', 'is-revealed')); document.documentElement.setAttribute('data-static', ''); document.querySelectorAll('.show, .show .frame, .show__body').forEach((el) => el.style.setProperty('--p', 1))";
// Lazy iframes below the fold would stay blank in a beyond-viewport capture.
const EAGER = "document.querySelectorAll('iframe[loading=lazy]').forEach((f) => { f.loading = 'eager'; })";

await send("Page.enable");
let overflowing = 0;
if (thumbs) {
  // Viewport-only captures at half density: real renders, small enough to ship with the site.
  try {
    for (const page of pages) {
      await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: 0.5, mobile: false });
      const loaded = nextEvent("Page.loadEventFired");
      await send("Page.navigate", { url: `${base}/${page.path}` });
      await loaded;
      await evaluate("document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 900)))");
      await evaluate(SETTLE);
      const { data } = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 });
      const name = page.path.replace(`${page.group}/`, "").replace(/\//g, "-").replace(/\.html$/, "");
      const out = join(root, "site", "assets", "thumbs", `${page.group}-${name}.jpg`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(data, "base64"));
      console.log(`thumb	${page.path}	→ ${relative(root, out)}`);
    }
  } finally { ws.close(); chrome.kill(); server.close(); }
  process.exit(0);
}
try {
  for (const page of pages) {
    for (const width of widths) {
      const metrics = (height) => send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
      await metrics(900);
      const loaded = nextEvent("Page.loadEventFired");
      await send("Page.navigate", { url: `${base}/${page.path}` });
      await loaded;
      await evaluate(EAGER);
      await evaluate(SETTLE);
      await evaluate("document.fonts.ready.then(() => new Promise((r) => setTimeout(r, 900)))");
      const overflow = await evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
      const height = await evaluate("Math.min(document.documentElement.scrollHeight, 9000)");
      await evaluate(SETTLE);
      await evaluate("new Promise((r) => setTimeout(r, 1200))"); // let reveal transitions finish so slices match
      // Capture beyond the viewport (no 100vh reflow), in slices: one full-page capture of a page with
      // many live iframes and components exceeds headless Chrome's raster budget and never returns.
      const slices = [];
      for (let y = 0; y < height; y += 1800) {
        const clip = { x: 0, y, width, height: Math.min(1800, height - y), scale: 1 };
        slices.push(Buffer.from((await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip })).data, "base64"));
      }
      const png = slices.length === 1 ? slices[0] : stitch(slices);
      const name = page.path.replace(/^[^/]+\/(?=.)/, page.group === "_site" ? "" : "").replace(/\//g, "_").replace(/\.html$/, "");
      const out = join(root, ".snapshots", page.group, `${page.group === "_site" ? name : name.replace(`${page.group}_`, "")}@${width}.png`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, png);
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
