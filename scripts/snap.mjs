#!/usr/bin/env node
// Visual check — screenshots the library homepage and every language's styleguide and example
// pages at desktop and mobile widths in a real (headless) Chrome, and flags horizontal overflow,
// script errors, console.error, failed or 404 requests from this site, and empty live sections. After the
// desktop capture it presses every control once (a fixed walk on the two site pages) and flags script errors.
// The three site pages are also rendered in both site themes and guarded: header height vs --top-h, pressed /
// current chrome keeping 4.5:1 contrast under hover, no tabbables in a closed off-canvas, no chrome clipped at the edge.
// Zero dependencies: a tiny static server + the Chrome DevTools protocol over Node's WebSocket.
//
// Usage:
//   node scripts/snap.mjs                    # everything at 1280 and 390
//   node scripts/snap.mjs lilac atelier      # only these languages
//   node scripts/snap.mjs --widths=1440,768,375
//   CHROME_PATH=/path/to/chrome node scripts/snap.mjs
//   node scripts/snap.mjs --thumbs           # homepage JPEG thumbnails → site/assets/thumbs/ (640×400 and 336×210 -sm;
//                                              examples and styleguides also 1280×800 -lg for the viewer;
//                                              --thumbs=sm or --thumbs=lg makes only that size)
//   node scripts/snap.mjs --thumbs=home      # the homepage's stills → site/assets/home/ (tray tiles and
//                                              "Same markup" cards, light and dark), photographed from the
//                                              live render on site/capture.html
// Output: .snapshots/<language>/<page>@<width>.png (git-ignored). Exit code 1 if any page overflows or errors.
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
const thumbsArg = args.find((a) => a === "--thumbs" || a.startsWith("--thumbs="));
const thumbs = !!thumbsArg;
const thumbsSmOnly = thumbsArg === "--thumbs=sm";
const thumbsLgOnly = thumbsArg === "--thumbs=lg"; // only the 1280×800 -lg posters
const thumbsHome = thumbsArg === "--thumbs=home"; // only the homepage stills
const jobs = Math.max(1, Math.min(6, +(args.find((a) => a.startsWith("--jobs="))?.slice(7) || 4)));
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
// Ports Chrome and Node's fetch / WebSocket refuse to connect to (the WHATWG "bad port" list). A random port
// can land on one, so the static server and Chrome's DevTools port are picked again when that happens.
const BAD_PORTS = new Set([1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720, 1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668, 6669, 6679, 6697, 10080]);
for (;;) {
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  if (!BAD_PORTS.has(server.address().port)) break;
  await new Promise((r) => server.close(r));
}
const base = `http://127.0.0.1:${server.address().port}`;

/* ---------- pages ---------- */
const langs = (await readdir(root, { withFileTypes: true }))
  .filter((d) => d.isDirectory() && existsSync(join(root, d.name, "tokens", "tokens.json")))
  .map((d) => d.name)
  .filter((n) => !only.length || only.includes(n));
const sitePages = [{ group: "_site", path: "index.html" }, { group: "_site", path: "components.html" }, { group: "_site", path: "component.html" }];
const pages = thumbs ? [] : !only.length || only.includes("site") ? sitePages : [];
for (const lang of langs) {
  pages.push({ group: lang, path: `${lang}/index.html` });
  // catalogs are checked like any page, but the homepage has no thumbnails for them
  if (!thumbs && existsSync(join(root, lang, "components.html"))) pages.push({ group: lang, path: `${lang}/components.html` });
  const ex = join(root, lang, "examples");
  if (existsSync(ex)) for (const f of (await readdir(ex)).sort()) if (f.endsWith(".html")) pages.push({ group: lang, path: `${lang}/examples/${f}` });
}

/* ---------- Chrome ---------- */
async function launch(attempt) {
  const dir = mkdtempSync(join(tmpdir(), "uidl-snap-"));
  const proc = spawn(CHROME, ["--headless=new", "--disable-gpu", "--disable-background-timer-throttling", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "--hide-scrollbars", "--remote-debugging-port=0", `--user-data-dir=${dir}`, "about:blank"], { stdio: ["ignore", "ignore", "pipe"] });
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
async function connectTab(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  // If the DevTools connection drops, fail every waiting call instead of hanging forever.
  ws.addEventListener("close", () => { for (const r of pending.values()) r({ error: { message: "DevTools connection closed" } }); pending.clear(); });
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
  return { ws, listeners, send, nextEvent, evaluate };
}

const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
const browser = await connectTab(version.webSocketDebuggerUrl);
const openSockets = [browser.ws];
/* Close Chrome and wait until it has really exited before removing its temp profile (on Windows a
   profile still held by Chrome can't be deleted, and leftovers pile up in the temp folder). */
async function shutdown() {
  for (const s of openSockets) { try { s.close(); } catch { /* already closed */ } }
  server.close();
  const exited = chrome.exitCode !== null ? Promise.resolve() : new Promise((r) => chrome.once("exit", r));
  chrome.kill();
  await Promise.race([exited, new Promise((r) => setTimeout(r, 5000))]);
  try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch { /* leave it to the OS temp cleanup */ }
}
// Jump finite entrance animations (ring fills, dialog pops) to their end and freeze infinite loops
// (marquees, auroras), so captures are deterministic and a tall headless viewport isn't repainted every frame.
// Scroll-triggered reveals and scroll-linked tilts are shown in their final state.
const SETTLE = "document.getAnimations().forEach((a) => { try { if (a.effect && a.effect.getComputedTiming().endTime !== Infinity) a.finish(); else a.pause(); } catch (e) {} }); document.querySelectorAll('.rise, .reveal-words, .wcard').forEach((el) => el.classList.add('is-in', 'is-revealed')); document.documentElement.setAttribute('data-static', ''); document.querySelectorAll('.show, .show .frame, .show__body').forEach((el) => el.style.setProperty('--p', 1))";
// Wait for web fonts, but never for long: a stalled font request must not hang the run (the capture then
// shows fallback type, which is better than no check at all).
const FONTS_READY = "Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]).then(() => new Promise((r) => setTimeout(r, 900)))";
// Lazy iframes below the fold would stay blank in a beyond-viewport capture.
const EAGER = "document.querySelectorAll('iframe[loading=lazy]').forEach((f) => { f.loading = 'eager'; })";
// The homepage builds its live sections on demand; build them now and wait (no-op on other pages).
const LIVE_READY = "Promise.race([window.UISite && UISite.ready ? UISite.ready().then(() => true) : Promise.resolve(true), new Promise((r) => setTimeout(() => r(false), 15000))])";
// A load event can stall forever (a hanging font or CDN request); never wait on it for more than 20s.
const LOAD_TIMEOUT = 20000;

/* ---------- console / network guard (per worker tab) ----------
   While a page loads, any script error, console.error, HTTP ≥ 400 or failed request from this server fails
   the run. Outside requests (web fonts, CDNs) only warn: a slow or blocked font host is not a page bug.
   During the interaction pass (below) only script errors count: switching previews and reopening the
   drawer cancel in-flight frame loads on purpose. */
function attachGuard(tab) {
  const guard = { phase: "load", errors: [], warnings: [], urls: new Map() };
  tab.listeners.add((m) => {
    const p = m.params || {};
    if (m.method === "Runtime.exceptionThrown") {
      const d = p.exceptionDetails || {};
      guard.errors.push(`script error: ${((d.exception && d.exception.description) || d.text || "").split("\n")[0]}${d.url ? ` (${d.url.replace(base, "")})` : ""}`);
    } else if (m.method === "Runtime.consoleAPICalled" && p.type === "error") {
      guard.errors.push(`console.error: ${(p.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 240)}`);
    } else if (m.method === "Page.javascriptDialogOpening") {
      tab.send("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
    } else if (guard.phase !== "load") {
      return;
    } else if (m.method === "Network.requestWillBeSent") {
      guard.urls.set(p.requestId, p.request.url);
    } else if (m.method === "Network.responseReceived" && p.response.status >= 400) {
      (p.response.url.startsWith(base) ? guard.errors : guard.warnings).push(`HTTP ${p.response.status} ${p.response.url.replace(base, "")}`);
    } else if (m.method === "Network.loadingFailed" && !p.canceled) {
      const url = guard.urls.get(p.requestId) || "?";
      (url.startsWith(base) ? guard.errors : guard.warnings).push(`${p.errorText} ${url.replace(base, "")}`);
    }
  });
  const reset = () => { guard.phase = "load"; guard.errors = []; guard.warnings = []; guard.urls.clear(); };
  return { guard, reset };
}

/* ---------- interaction pass (1280 only, after the capture) ----------
   Pack pages: press every button, tab, switch, checkbox, radio, summary and in-page link once (forms never
   submit, links never leave, downloads are skipped, dialogs are closed again), then forget anything saved.
   Site pages: a fixed walk through their controls. */
function packFuzz() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  document.addEventListener("submit", (e) => e.preventDefault(), true);
  document.addEventListener("click", (e) => { const a = e.target.closest && e.target.closest("a[href]"); if (a && !a.getAttribute("href").startsWith("#")) e.preventDefault(); }, true);
  const sel = 'button, [role="tab"], [role="switch"], [role="option"], [role="menuitem"], [role="menuitemradio"], input[type="checkbox"], input[type="radio"], summary, a[href^="#"]';
  const els = [...document.querySelectorAll(sel)].filter((el) => !el.matches("[download], [data-dr-dl]"));
  return (async () => {
    let n = 0;
    for (const el of els) {
      if (!el.isConnected || el.disabled) continue;
      try { el.click(); n++; } catch (e) { /* reported by the page if it throws */ }
      document.querySelectorAll("dialog[open]").forEach((d) => { try { d.close(); } catch (e) { /* closing */ } });
      if (n % 8 === 0) await sleep(16);
    }
    await sleep(500);
    try { localStorage.clear(); sessionStorage.clear(); } catch (e) { /* storage blocked */ }
    return n + " controls";
  })();
}
function homeFlow() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  return (async () => {
    // Shelf: open every book (pointer and keyboard paths) and put them back.
    const books = [...document.querySelectorAll("[data-shelf] > li")];
    for (const li of books) { li.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" })); await sleep(140); }
    document.querySelector("[data-shelf]")?.dispatchEvent(new PointerEvent("pointerleave", { pointerType: "mouse" }));
    for (const li of books) li.firstElementChild.focus();
    document.activeElement?.blur();
    // Viewer: every language, then every preview tab inside each.
    const picks = [...document.querySelectorAll("[data-pick]")].filter((a) => a.closest("[data-viewer]"));
    for (const a of picks) { a.click(); await sleep(60); }
    const tabs = [...document.querySelectorAll(".frame .seg button")];
    for (const b of tabs) { b.click(); await sleep(120); }
    document.querySelectorAll(".frame").forEach((f) => f.querySelector(".seg button").click());
    picks[0]?.click();
    // Same markup: dark, then light again; then the site theme, there and back.
    for (const t of document.querySelectorAll("[data-theme-pick]")) { t.click(); await sleep(200); }
    document.querySelector('[data-theme-pick="light"]')?.click();
    for (let i = 0; i < 2; i++) { document.querySelector("[data-site-theme-toggle]")?.click(); await sleep(400); }
    const copy = document.querySelector("[data-copy]");
    if (copy) copy.click();
    await sleep(1500);
    return books.length + " books, " + picks.length + " languages, " + tabs.length + " preview tabs";
  })();
}
function wallFlow() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  return (async () => {
    const cards = [...document.querySelectorAll(".wcard")];
    if (cards.length < 90) throw new Error("expected >= 90 wall cards, saw " + cards.length);
    const bad = cards.filter((c) => !c.querySelector(".wcard__code[href^='component.html?']"));
    if (bad.length) throw new Error(bad.length + " wall cards missing component.html link");
    $('[data-style="braun"]')?.click(); await sleep(200);
    $('[data-kind="patterns"]')?.click(); await sleep(200);
    $('[data-style="all"]')?.click(); await sleep(200);
    for (let i = 0; i < 2; i++) { $("[data-site-theme-toggle]")?.click(); await sleep(350); }
    $('[data-wtheme="dark"]')?.click(); await sleep(200);
    $('[data-wtheme="light"]')?.click(); await sleep(200);
    const search = $("[data-search]");
    for (const q of ["slider", "compare", "zzzz"]) { search.value = q; search.dispatchEvent(new Event("input", { bubbles: true })); await sleep(250); }
    $("[data-reset]")?.click(); await sleep(350);
    return cards.length + " cards";
  })();
}
function componentFlow() {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const $ = (s) => document.querySelector(s);
  return (async () => {
    const waitReady = async () => {
      for (let k = 0; k < 40; k++) {
        await sleep(100);
        const f = $("[data-cp-view] iframe");
        if (f && f.classList.contains("is-ready") && !/Collecting/.test($("[data-src-code]")?.textContent || "")) break;
      }
    };
    await waitReady();
    const sib = $("[data-cp-siblings] a:not([aria-current])");
    if (sib) { sib.click(); await waitReady(); }
    for (const b of document.querySelectorAll("[data-cp-demos] button")) { b.click(); await sleep(200); }
    $('[data-cp-wtheme="dark"]')?.click(); await sleep(200);
    $('[data-cp-wtheme="light"]')?.click(); await sleep(200);
    for (const v of document.querySelectorAll("[data-vp]")) { v.click(); await sleep(120); }
    $('[data-vp="full"]')?.click();
    for (const s of document.querySelectorAll("[data-src-tabs] [data-src]")) if (!s.disabled) { s.click(); await sleep(40); }
    $("[data-src-copy]")?.click();
    $("[data-cp-replay]")?.click(); await sleep(250);
    $("[data-cp-next]")?.click(); await waitReady();
    if (!$("[data-src-code]")?.textContent.trim()) throw new Error("component source panel stayed empty");
    return ($("[data-cp-title]")?.textContent || "").trim();
  })();
}
const FLOWS = { "index.html": homeFlow, "components.html": wallFlow, "component.html": componentFlow };

let overflowing = 0, broken = 0;
if (thumbsHome) {
  // Every tile and card rendered live on site/capture.html, photographed one by one (2x tiles, 1.5x cards).
  try {
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    const tab = await connectTab(target.webSocketDebuggerUrl);
    openSockets.push(tab.ws);
    await tab.send("Page.enable");
    await tab.send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
    const loaded = Promise.race([tab.nextEvent("Page.loadEventFired"), new Promise((r) => setTimeout(r, LOAD_TIMEOUT))]);
    await tab.send("Page.navigate", { url: `${base}/site/capture.html` });
    await loaded;
    const shots = await tab.evaluate("window.CAPTURE.then((list) => list.map((s, i) => { s.el.id = 'cap' + i; return { name: s.name, id: s.el.id, dark: s.dark }; }))");
    if (!Array.isArray(shots)) throw new Error("site/capture.html did not render (" + shots + ")");
    const shoot = async (shot, suffix) => {
      const r = await tab.evaluate(`(() => { const b = document.getElementById("${shot.id}").getBoundingClientRect(); return { x: b.left + scrollX, y: b.top + scrollY, width: b.width, height: b.height }; })()`);
      const scale = shot.name.startsWith("tray-") ? 2 : 1.5;
      const { data } = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: 80, captureBeyondViewport: true, clip: { ...r, scale } });
      const out = join(root, "site", "assets", "home", `${shot.name}${suffix}.jpg`);
      await mkdir(dirname(out), { recursive: true });
      await writeFile(out, Buffer.from(data, "base64"));
      console.log(`still	${shot.name}${suffix}	${Math.round(r.width * scale)}×${Math.round(r.height * scale)}	→ ${relative(root, out)}`);
    };
    for (const shot of shots) await shoot(shot, "");
    await tab.evaluate("window.CAPTURE_THEME('dark')");
    for (const shot of shots.filter((s) => s.dark)) await shoot(shot, "-dark");
  } finally { await shutdown(); }
  process.exit(0);
}
if (thumbs) {
  // Viewport-only captures at half density: real renders, small enough to ship with the site.
  try {
    const target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === "page");
    const tab = await connectTab(target.webSocketDebuggerUrl);
    openSockets.push(tab.ws);
    await tab.send("Page.enable");
    const pageLoad = () => Promise.race([tab.nextEvent("Page.loadEventFired"), new Promise((r) => setTimeout(r, LOAD_TIMEOUT))]);
    const specs = thumbsSmOnly ? [["-sm", 0.2625]] : [["", 0.5], ["-sm", 0.2625]];
    for (const page of pages) {
      const isExample = page.path.includes("/examples/") || /^[a-z]+\/index\.html$/.test(page.path);
      const list = thumbsLgOnly ? (isExample ? [["-lg", 1]] : []) : !thumbsSmOnly && isExample ? [["-lg", 1], ...specs] : specs;
      if (!list.length) continue;
      await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: list[0][1], mobile: false });
      const loaded = pageLoad();
      await tab.send("Page.navigate", { url: `${base}/${page.path}` });
      await loaded;
      await tab.evaluate(FONTS_READY);
      await tab.evaluate(SETTLE);
      const name = page.path.replace(`${page.group}/`, "").replace(/\//g, "-").replace(/\.html$/, "");
      // 640×400 for the shelf covers and frame posters, 1280×800 (-lg) for the viewer at full width,
      // 336×210 (-sm) for the dark theme's moving wall, where a tile is 168px wide.
      for (let i = 0; i < list.length; i++) {
        const [suffix, scale] = list[i];
        if (i > 0) {
          await tab.send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 800, deviceScaleFactor: scale, mobile: false });
          await tab.evaluate("new Promise((r) => setTimeout(r, 200))");
        }
        const { data } = await tab.send("Page.captureScreenshot", { format: "jpeg", quality: suffix === "-lg" ? 72 : suffix ? 58 : 82 });
        const out = join(root, "site", "assets", "thumbs", `${page.group}-${name}${suffix}.jpg`);
        await mkdir(dirname(out), { recursive: true });
        await writeFile(out, Buffer.from(data, "base64"));
        console.log(`thumb\t${page.path}\t→ ${relative(root, out)}`);
      }
    }
  } finally { await shutdown(); }
  process.exit(0);
}


/* ---------- site guards (both site themes, no screenshots) ----------
   Site pages are rendered in the grey booth and the dark gallery at every width and checked for what
   the default capture cannot see: header height vs --top-h, pressed/current chrome losing contrast on
   hover, tabbable elements inside a closed off-canvas, and chrome clipped at the viewport edge
   (overflow-x: clip hides it from the scrollWidth test). Every failure names the element. */
const SITE_THEMES = ["booth", "gallery"];
const GUARD_JS = `(() => {
  const out = [];
  const vw = document.documentElement.clientWidth;
  const desc = (el) => { let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = (el.getAttribute("class") || "").trim(); if (c) s += "." + c.split(/\\s+/).slice(0, 3).join("."); const t = (el.getAttribute("aria-label") || el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 24); return s + (t ? ' "' + t + '"' : ""); };
  const stage = (el) => !!el.closest(".wstage, [data-pack-stage], .tray__stage, .same__view, .hero-wall, .shelf, .viewer__stage, .cp-frame-wrap, iframe, .cw-backdrop");
  const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (!el.checkVisibility || el.checkVisibility({ visibilityProperty: true, opacityProperty: true })); };
  // I-01: sticky header height must equal --top-h
  const top = document.querySelector(".top"), topH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--top-h"));
  if (top && topH && Math.abs(top.getBoundingClientRect().height - topH) > 1) out.push("[top-h] .top is " + Math.round(top.getBoundingClientRect().height) + "px tall but --top-h is " + topH + "px");
  // Q-02: closed off-canvas targets must not leave tabbable descendants
  for (const b of document.querySelectorAll("[aria-expanded=false][aria-controls]")) {
    const t = document.getElementById(b.getAttribute("aria-controls")); if (!t) continue;
    const q = t.getBoundingClientRect(), on = shown(t) && q.right > 1 && q.left < innerWidth - 1;
    if (on) continue;
    const bad = [...t.querySelectorAll('a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])')].filter((f) => f.tabIndex >= 0 && !f.disabled && !f.closest("[inert]") && getComputedStyle(f).visibility !== "hidden");
    if (bad.length) out.push("[closed-drawer] #" + t.id + " is closed but has " + bad.length + " tabbable element(s), first: " + desc(bad[0]));
  }
  // chrome clipped at the viewport edge (clip / hidden ancestors do not excuse it; scrollers do)
  const inScroller = (el) => { for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) { const o = getComputedStyle(p).overflowX; if (o === "auto" || o === "scroll") return true; } return false; };
  const seen = new Set();
  for (const el of document.body.querySelectorAll("a, button, input, select, h1, h2, h3, p, label, summary, [role=tab]")) {
    if (el.closest("svg, [aria-hidden=true], [inert], [hidden]") || stage(el) || !shown(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !inScroller(el)) { const k = desc(el); if (!seen.has(k) && seen.size < 6) { seen.add(k); out.push("[edge-clip] " + k + " spans " + Math.round(r.left) + ".." + Math.round(r.right) + "px of a " + vw + "px viewport"); } }
  }
  return out;
})()`;
// Candidates for the hover-contrast guard: pressed / selected / current chrome controls.
const PRESSED_JS = `(() => {
  const sel = '[aria-pressed="true"], [aria-selected="true"], [aria-current]:not([aria-current="false"]), .is-active, .is-selected';
  const out = [];
  document.querySelectorAll("[data-gd]").forEach((n) => n.removeAttribute("data-gd"));
  for (const el of document.querySelectorAll(sel)) {
    if (el.closest(".wstage, [data-pack-stage], .tray__stage, .same__view, .hero-wall, .shelf, iframe, [aria-hidden=true], [inert], [hidden]")) continue;
    if (!el.matches("a, button, [role=tab], [role=option], li, summary") || !(el.textContent || "").trim()) continue;
    const r = el.getBoundingClientRect(); if (!r.width || !r.height || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue;
    el.setAttribute("data-gd", String(out.length));
    out.push(out.length);
    if (out.length >= 14) break;
  }
  return out;
})()`;
const HOVER_CONTRAST_JS = (i) => `(() => {
  const el = document.querySelector('[data-gd="${i}"]'); if (!el) return null;
  const rgba = (s) => { const m = s.match(/rgba?\\(([^)]+)\\)/); if (!m) return { r: 0, g: 0, b: 0, a: 0 }; const v = m[1].split(/[ ,\\/]+/).filter(Boolean).map(Number); return { r: v[0], g: v[1], b: v[2], a: v[3] === undefined ? 1 : v[3] }; };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const chain = []; let grad = false;
  /* Positioned siblings under the label (sliding gliders, pills) paint its real background; hit-testing would miss
     them (pointer-events: none), so find them by geometry, then walk the ancestors. */
  const R = el.getBoundingClientRect(), cx = R.left + R.width / 2, cy = R.top + R.height / 2, under = [], up = [];
  for (let a = el.parentElement, d = 0; a && d < 3; a = a.parentElement, d++) for (const c of a.children) { if (c === el || c.contains(el)) continue; const q = c.getBoundingClientRect(); if (q.left <= cx && cx <= q.right && q.top <= cy && cy <= q.bottom && getComputedStyle(c).position !== "static") under.push(c); }
  for (let a = el.parentElement; a; a = a.parentElement) up.push(a);
  for (const n of [el, ...under, ...up]) { const s = getComputedStyle(n); const c = rgba(s.backgroundColor); if (c.a > 0) chain.push(c); if (s.backgroundImage !== "none" && !/url\\(/.test(s.backgroundImage)) grad = true; if (c.a >= 0.99) break; }
  let bg = { r: 255, g: 255, b: 255, a: 1 }; for (let k = chain.length - 1; k >= 0; k--) bg = over(chain[k], bg);
  const cs = getComputedStyle(el), fg = rgba(cs.color); if (rgba(cs.webkitTextFillColor).a === 0 && cs.webkitTextFillColor !== cs.color) return null;
  const f = over(fg, bg), L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
  const size = parseFloat(cs.fontSize), need = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700) ? 3 : 4.5;
  let s = el.tagName.toLowerCase(); if (el.id) s += "#" + el.id; const c = (el.getAttribute("class") || "").trim(); if (c) s += "." + c.split(/\\s+/).slice(0, 3).join(".");
  return ratio < need && !(grad && ratio > 3) ? "[hover-contrast] " + s + ' "' + el.textContent.trim().replace(/\\s+/g, " ").slice(0, 24) + '" is ' + ratio.toFixed(2) + ":1 (needs " + need + ") while hovered" : null;
})()`;

async function siteGuards(tab, page, width, theme) {
  const errs = [];
  const { identifier } = await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: `try{localStorage.setItem("uidl-site-theme","${theme}")}catch(e){}` });
  try {
    await tab.send("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    const loaded = Promise.race([tab.nextEvent("Page.loadEventFired"), new Promise((r) => setTimeout(r, LOAD_TIMEOUT))]);
    await tab.send("Page.navigate", { url: `${base}/${page.path}` });
    await loaded;
    await tab.evaluate(EAGER);
    await tab.evaluate(LIVE_READY);
    await tab.evaluate(FONTS_READY);
    await tab.evaluate(SETTLE);
    const got = await tab.evaluate(GUARD_JS);
    errs.push(...(got || []));
    const idx = await tab.evaluate(PRESSED_JS);
    for (const i of idx || []) {
      const c = await tab.evaluate(`(() => { const el = document.querySelector('[data-gd="${i}"]'); el.scrollIntoView({ block: "center", behavior: "instant" }); const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
      if (!c) continue;
      await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: c.x, y: c.y });
      await new Promise((r) => setTimeout(r, 360));
      const bad = await tab.evaluate(HOVER_CONTRAST_JS(i));
      if (bad) errs.push(bad);
    }
    await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  } finally {
    await tab.send("Page.removeScriptToEvaluateOnNewDocument", { identifier }).catch(() => {});
  }
  return [...new Set(errs)].map((e) => `${e} [${theme}]`);
}

try {
  // Run worker tabs in isolated incognito browser contexts so localStorage mutations during packFuzz never bleed across pages.
  const nWorkers = Math.min(jobs, pages.length);
  const workers = [];
  for (let w = 0; w < nWorkers; w++) {
    const { browserContextId } = await browser.send("Target.createBrowserContext", { disposeOnDetach: true });
    const { targetId } = await browser.send("Target.createTarget", { url: "about:blank", browserContextId, newWindow: true });
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const t = targets.find((x) => x.id === targetId);
    const tab = await connectTab(t.webSocketDebuggerUrl);
    openSockets.push(tab.ws);
    await tab.send("Page.enable");
    await tab.send("Runtime.enable");
    await tab.send("Network.enable");
    await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true }); // focus events fire as in a focused window
    workers.push({ tab, ...attachGuard(tab) });
  }

  let nextIdx = 0;
  async function runWorker({ tab, guard, reset }) {
    const pageLoad = () => Promise.race([tab.nextEvent("Page.loadEventFired"), new Promise((r) => setTimeout(r, LOAD_TIMEOUT))]);
    for (;;) {
      const idx = nextIdx++;
      if (idx >= pages.length) return;
      const page = pages[idx];
      for (const width of widths) {
        const logs = [];
        const metrics = (height) => tab.send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: width < 600 });
        await metrics(900);
        reset();
        const loaded = pageLoad();
        await tab.send("Page.navigate", { url: `${base}/${page.path}` });
        await loaded;
        await tab.evaluate(EAGER);
        if (!(await tab.evaluate(LIVE_READY))) guard.errors.push("live sections did not finish building within 15s");
        const missing = await tab.evaluate("(() => { const out = []; const cmp = document.querySelectorAll('[data-compare]').length; if (cmp && document.querySelectorAll('[data-compare] .wstage').length !== cmp) out.push('a Same-markup card did not hydrate live'); const tray = document.querySelector('[data-tray]'); if (tray && tray.querySelectorAll('.wstage').length !== tray.children.length) out.push('a tray tile did not hydrate live'); if (document.querySelector('[data-hero]') && document.querySelectorAll('iframe').length) out.push('the homepage must load zero iframes'); const shelf = document.querySelector('[data-shelf]'); if (shelf && !shelf.classList.contains('is-set')) out.push('shelf books were never set'); const top = document.querySelector('.top'), topH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--top-h')); if (top && topH && Math.abs(top.getBoundingClientRect().height - topH) > 1.5) out.push('sticky header is ' + Math.round(top.getBoundingClientRect().height) + 'px tall but --top-h is ' + topH + 'px (the sticky bar and anchors would slide under it)'); return out; })()");
        guard.errors.push(...missing);
        // Pointing at something must never move the page: every hover handler is run and the layout compared.
        const hoverShift = await tab.evaluate(`(() => {
          const abs = (el) => { let y = 0; for (let n = el; n; n = n.offsetParent) y += n.offsetTop; return y; };
          const blocks = [...document.querySelectorAll("main > section, .section__head, .same, .tray, .viewer, .cw-grid")];
          const sig = () => blocks.map(abs).join(",") + "|" + document.documentElement.scrollHeight;
          const ref = sig(), out = [];
          for (const el of document.querySelectorAll(".same figure, .tray__item, .names a, .viewer__index a, .wcard")) {
            el.dispatchEvent(new PointerEvent("pointerover", { bubbles: true })); el.dispatchEvent(new PointerEvent("pointerenter"));
            if (sig() !== ref) { out.push("pointing at " + (el.dataset.prefix || el.dataset.pick || el.getAttribute("href") || el.className) + " moves the layout"); break; }
          }
          return out;
        })()`);
        guard.errors.push(...(hoverShift || []));
        await tab.evaluate(SETTLE);
        await tab.evaluate(FONTS_READY);
        const overflow = await tab.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth");
        const height = await tab.evaluate("Math.min(document.documentElement.scrollHeight, 9000)");
        await tab.evaluate(SETTLE);
        await tab.evaluate("new Promise((r) => setTimeout(r, 1200))"); // let reveal transitions finish so slices match
        // Capture beyond the viewport (no 100vh reflow), in slices: one full-page capture of a page with
        // many live iframes and components exceeds headless Chrome's raster budget and never returns.
        const slices = [];
        for (let y = 0; y < height; y += 1800) {
          const clip = { x: 0, y, width, height: Math.min(1800, height - y), scale: 1 };
          slices.push(Buffer.from((await tab.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip })).data, "base64"));
        }
        const png = slices.length === 1 ? slices[0] : stitch(slices);
        const name = page.path.replace(/^[^/]+\/(?=.)/, page.group === "_site" ? "" : "").replace(/\//g, "_").replace(/\.html$/, "");
        const out = join(root, ".snapshots", page.group, `${page.group === "_site" ? name : name.replace(`${page.group}_`, "")}@${width}.png`);
        await mkdir(dirname(out), { recursive: true });
        await writeFile(out, png);
        if (overflow > 1) overflowing++;
        logs.push(`${overflow > 1 ? `OVERFLOW ${overflow}px` : "ok"}\t${page.path} @${width}\t→ ${relative(root, out)}`);
        if (overflow > 1) {
          // Name the innermost elements that stick out past the viewport, so the fix is obvious.
          const culprits = await tab.evaluate(`(() => {
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
          culprits.forEach((c) => logs.push(`\t  ↳ ${c}`));
        }
        if (width === widths[0]) {
          // Interaction pass: script errors only (see the guard above).
          guard.phase = "interact";
          const flow = FLOWS[page.path] || (page.group === "_site" ? null : packFuzz);
          const did = flow ? await Promise.race([tab.evaluate(`(${flow.toString()})()`), new Promise((r) => setTimeout(() => r("timed out after 60s"), 60000))]) : "";
          if (did) logs.push(`\t  pressed ${did}`);
          if (/timed out/.test(did)) guard.errors.push(`interaction pass ${did}`);
          await new Promise((r) => setTimeout(r, 300));
        }
        [...new Set(guard.warnings)].forEach((w) => logs.push(`\t  warn  ${w}`));
        const errs = [...new Set(guard.errors)];
        if (errs.length) {
          broken++;
          logs.push(`ERRORS\t${page.path} @${width}`);
          errs.forEach((e) => logs.push(`\t  ✗ ${e}`));
        }
        console.log(logs.join("\n"));
      }
      if (page.group === "_site") {
        const gl = [];
        for (const theme of SITE_THEMES) for (const width of widths) {
          reset();
          const errs = await siteGuards(tab, page, width, theme);
          if (errs.length) { broken++; gl.push(`ERRORS\t${page.path} @${width} (guards, ${theme})`); errs.forEach((e) => gl.push(`\t  ✗ ${e}`)); }
        }
        if (gl.length) console.log(gl.join("\n"));
      }
    }
  }
  await Promise.all(workers.map(runWorker));
} finally {
  await shutdown();
}
console.log(overflowing ? `\n${overflowing} page/width combination(s) overflow horizontally.` : "\nNo horizontal overflow.");
console.log(broken ? `${broken} page/width combination(s) logged script errors, failed requests or empty live sections.` : "No script errors, failed requests or 404s.");
process.exitCode = overflowing || broken ? 1 : 0;
