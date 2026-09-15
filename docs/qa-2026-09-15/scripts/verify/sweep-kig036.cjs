// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-036 sweep: measure clipping across views and viewports in one Edge run.
// Usage: node sweep-kig036.cjs <base-url>
const { spawn } = require("child_process");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9336);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kig036s`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CASES = [
  ["/reading/pr001", 375],
  ["/reading/pr001", 800],
  ["/phonics/mv1-01", 375],
  ["/phonics/mv1-01", 800],
  ["/ld/d001", 375],
  ["/ld/d001", 800],
  ["/grammar1/gh1-006", 375],
  ["/grammar1/gh1-006", 800],
  ["/student/s1-1", 375],
  ["/student/s1-1", 800],
  ["/reading/pr001", 768],
  ["/reading/pr001", 1024],
];

class Tab {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    ws.onmessage = (m) => {
      const msg = JSON.parse(m.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { res, rej } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
      }
    };
  }
  static async open() {
    const t = await (
      await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })
    ).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    return new Tab(ws);
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((res, rej) => {
      this.pending.set(id, { res, rej });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          rej(new Error(`timeout ${method}`));
        }
      }, 120000);
    });
  }
  async eval(expr) {
    const r = await this.send("Runtime.evaluate", {
      expression: expr,
      awaitPromise: true,
      returnByValue: true,
      timeout: 90000,
    });
    if (r.exceptionDetails)
      throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const MEASURE = `
(() => {
  const out = { hOverflow: document.documentElement.scrollWidth > window.innerWidth };
  const nav = document.querySelector('header nav[aria-label="Courses"]');
  if (nav && getComputedStyle(nav).display !== 'none') {
    const nr = nav.getBoundingClientRect();
    out.nav = {
      overflowPx: nav.scrollWidth - nav.clientWidth,
      lastRight: Math.round([...nav.querySelectorAll('a')].slice(-1)[0]?.getBoundingClientRect().right ?? 0),
      navRight: Math.round(nr.right),
      clipped: [...nav.querySelectorAll('a')].filter(a => a.getBoundingClientRect().right > nr.right + 1).map(a => (a.textContent||'').trim()),
      offscreen: [...nav.querySelectorAll('a')].filter(a => a.getBoundingClientRect().right > window.innerWidth + 1).map(a => (a.textContent||'').trim()),
    };
  }
  const stepNav = [...document.querySelectorAll('nav')].find(n => (n.getAttribute('aria-label')||'').includes('단계'));
  if (stepNav) {
    out.tabs = [...stepNav.querySelectorAll('button')].map(b => ({
      t: (b.textContent||'').trim(),
      over: b.scrollWidth - b.clientWidth,
    }));
  }
  const over = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length) continue;
    const t = (el.textContent||'').trim();
    if (!t || t.length < 3) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
      over.push(t.slice(0, 32) + ' [' + el.clientWidth + '<' + el.scrollWidth + ']');
  }
  out.overflowingText = over.slice(0, 8);
  out.overflowCount = over.length;
  return out;
})();`;

(async () => {
  const proc = spawn(
    EDGE,
    [
      "--headless=new",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--disable-extensions",
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let up = false;
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) {
        up = true;
        break;
      }
    } catch {}
    await sleep(500);
  }
  if (!up) throw new Error("edge did not start");

  const tab = await Tab.open();
  await tab.send("Page.enable");
  await tab.send("Runtime.enable");

  for (const [p, width] of CASES) {
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await tab.send("Page.navigate", { url: `${BASE}${p}` });
    await sleep(2500);
    await tab.eval(
      `new Promise(r => { const e = Date.now() + 45000; (function w(){ const m = document.querySelector('main'); if (m && (m.innerText||'').length > 200) return r(1); if (Date.now()>e) return r(0); setTimeout(w, 250); })(); })`,
    );
    await sleep(1200);
    let m;
    try {
      m = await tab.eval(MEASURE);
    } catch (e) {
      console.log(`${p} @${width}  ERROR ${e.message}`);
      continue;
    }
    const navBad = m.nav ? `navOverflow=${m.nav.overflowPx}px clipped=[${m.nav.clipped}] offscreen=[${m.nav.offscreen}]` : "nav=hidden";
    const tabsBad = (m.tabs || []).filter((t) => t.over > 0).map((t) => `${t.t}(${t.over}px)`);
    console.log(
      `${p} @${width}  hOverflow=${m.hOverflow}  ${navBad}  tabClipped=[${tabsBad.join(", ")}]  textOverflow=${m.overflowCount}${m.overflowingText.length ? " " + JSON.stringify(m.overflowingText) : ""}`,
    );
  }
  proc.kill();
})();
