// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-036 measurement: report real clipping at a given viewport.
// Usage: node measure-kig036.cjs <base-url> <width> [path]
const { spawn } = require("child_process");

const BASE = process.argv[2] || "http://localhost:3100";
const WIDTH = Number(process.argv[3] || 375);
const P = process.argv[4] || "/reading/pr001";
const PORT = Number(process.env.QA_CDP_PORT || 9335);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kig036`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const out = { width: window.innerWidth, docScrollWidth: document.documentElement.scrollWidth, hOverflow: document.documentElement.scrollWidth > window.innerWidth };

  // --- top navigation ------------------------------------------------------
  const nav = document.querySelector('header nav[aria-label="Courses"]');
  if (nav) {
    const nr = nav.getBoundingClientRect();
    out.topNav = {
      visible: getComputedStyle(nav).display !== 'none',
      clientWidth: nav.clientWidth,
      scrollWidth: nav.scrollWidth,
      overflowPx: nav.scrollWidth - nav.clientWidth,
      rectLeft: Math.round(nr.left),
      rectRight: Math.round(nr.right),
      viewport: window.innerWidth,
      links: [...nav.querySelectorAll('a')].map(a => {
        const r = a.getBoundingClientRect();
        return {
          label: (a.textContent||'').trim(),
          left: Math.round(r.left),
          right: Math.round(r.right),
          clippedRight: Math.round(r.right) > nr.right + 1,
          clippedLeft: Math.round(r.left) < nr.left - 1,
          offscreen: Math.round(r.right) > window.innerWidth + 1 || Math.round(r.left) < -1,
        };
      }),
    };
  } else out.topNav = null;

  // --- step tabs (any nav whose label mentions 단계) -------------------------
  const stepNav = [...document.querySelectorAll('nav')].find(n => (n.getAttribute('aria-label')||'').includes('단계'));
  if (stepNav) {
    out.stepTabs = [...stepNav.querySelectorAll('button')].map(b => {
      const label = b.querySelector('span:last-child');
      const br = b.getBoundingClientRect();
      return {
        text: (b.textContent||'').trim(),
        btnWidth: Math.round(br.width),
        btnScrollWidth: b.scrollWidth,
        btnOverflowPx: b.scrollWidth - b.clientWidth,
        labelScrollWidth: label ? label.scrollWidth : null,
        labelClientWidth: label ? label.clientWidth : null,
        labelOverflowPx: label ? label.scrollWidth - label.clientWidth : null,
        clipped: b.scrollWidth > b.clientWidth + 1,
      };
    });
  } else out.stepTabs = null;

  // --- any element whose text overflows its own box in main ---------------
  const over = [];
  for (const el of document.querySelectorAll('main *')) {
    if (el.children.length) continue;
    const t = (el.textContent||'').trim();
    if (!t || t.length < 4) continue;
    if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
      over.push({ tag: el.tagName, text: t.slice(0, 40), clientWidth: el.clientWidth, scrollWidth: el.scrollWidth });
    }
  }
  out.overflowingTextNodes = over.slice(0, 15);
  out.overflowingTextCount = over.length;
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
  await tab.send("Emulation.setDeviceMetricsOverride", {
    width: WIDTH,
    height: 900,
    deviceScaleFactor: 1,
    mobile: WIDTH < 768,
  });
  await tab.send("Page.navigate", { url: `${BASE}${P}` });
  await sleep(4000);
  await tab.eval(
    `new Promise(r => { const e = Date.now() + 60000; (function w(){ if (document.querySelector('main') && (document.querySelector('main').innerText||'').length > 300) return r(1); if (Date.now()>e) return r(0); setTimeout(w, 300); })(); })`,
  );
  await sleep(1500);

  const m = await tab.eval(MEASURE);
  console.log(JSON.stringify(m, null, 1));
  proc.kill();
})();
