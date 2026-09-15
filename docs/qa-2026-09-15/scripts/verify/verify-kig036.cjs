// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-036 verification.
// Usage: node verify-kig036.cjs <base-url>
const { spawn } = require("child_process");
const fs = require("fs");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9337);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kig036v`;
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

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

const ready = `new Promise(r => { const e = Date.now() + 45000; (function w(){ const m = document.querySelector('main'); if (m && (m.innerText||'').length > 200) return r(1); if (Date.now()>e) return r(0); setTimeout(w, 250); })(); })`;

const NAVSTATE = `(() => {
  const nav = document.querySelector('header nav[aria-label="Courses"]');
  const navVisible = !!nav && getComputedStyle(nav).display !== 'none';
  const burger = [...document.querySelectorAll('header button')].find(b => (b.getAttribute('aria-label')||'').startsWith('메뉴'));
  const burgerVisible = !!burger && getComputedStyle(burger).display !== 'none';
  const out = { navVisible, burgerVisible, overflowPx: navVisible ? nav.scrollWidth - nav.clientWidth : null,
    clipped: [], labels: [] };
  if (navVisible) {
    const nr = nav.getBoundingClientRect();
    for (const a of nav.querySelectorAll('a')) {
      const r = a.getBoundingClientRect();
      out.labels.push((a.textContent||'').trim());
      if (r.right > nr.right + 1 || r.right > window.innerWidth + 1) out.clipped.push((a.textContent||'').trim());
    }
  }
  return out;
})()`;

const DRAWER = `(async () => {
  const burger = [...document.querySelectorAll('header button')].find(b => (b.getAttribute('aria-label')||'').startsWith('메뉴'));
  burger.click();
  await new Promise(r => setTimeout(r, 600));
  const aside = document.querySelector('aside');
  if (!aside) return { opened: false, labels: [] };
  const labels = [...aside.querySelectorAll('nav a')].map(a => (a.textContent||'').trim());
  return { opened: true, labels };
})()`;

const STEPTABS = `(() => {
  const nav = [...document.querySelectorAll('nav')].find(n => (n.getAttribute('aria-label')||'').includes('단계'));
  if (!nav) return null;
  const clipped = [];
  const texts = [];
  for (const b of nav.querySelectorAll('button')) {
    texts.push((b.textContent||'').trim());
    for (const el of b.querySelectorAll('*')) {
      const t = (el.textContent||'').trim();
      if (!t || el.children.length) continue;
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0)
        clipped.push(t + ' [' + el.clientWidth + '<' + el.scrollWidth + ']');
    }
  }
  return { count: texts.length, texts, clipped };
})()`;

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

  async function go(path, width) {
    await tab.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await tab.send("Page.navigate", { url: `${BASE}${path}` });
    await sleep(2500);
    await tab.eval(ready);
    await sleep(1200);
  }

  // ---- the invariant that matters: if the row is shown, it must not clip ----
  // and if it is hidden, the drawer must offer every tab.
  const TAB_COUNT = 8; // src/lib/tabs.ts
  const WIDTHS = [768, 800, 1024, 1152, 1280, 1300, 1366, 1600];
  for (const w of WIDTHS) {
    await go("/reading/pr001", w);
    const s = await tab.eval(NAVSTATE);
    if (s.navVisible) {
      check(
        `${w}px: row visible, nothing clipped`,
        s.overflowPx === 0 && s.clipped.length === 0 && s.labels.length === TAB_COUNT,
        `overflow=${s.overflowPx} labels=${s.labels.length} clipped=[${s.clipped}]`,
      );
    } else {
      const d = await tab.eval(DRAWER);
      check(
        `${w}px: row hidden, drawer offers all ${TAB_COUNT} tabs`,
        s.burgerVisible && d.opened && d.labels.length === TAB_COUNT,
        `burger=${s.burgerVisible} drawer=${d.labels.length} missing=[${["CNN NEWS", "GVA 독해"].filter((n) => !d.labels.includes(n))}]`,
      );
    }
  }

  // ---- 375px: step tabs readable in the two long-label views ----
  await go("/ld/d001", 375);
  const ldTabs = await tab.eval(STEPTABS);
  check(
    "375px: LISTENING step tabs not clipped",
    ldTabs && ldTabs.clipped.length === 0 && ldTabs.count === 5,
    `count=${ldTabs && ldTabs.count} clipped=${JSON.stringify(ldTabs && ldTabs.clipped)}`,
  );

  await go("/student/s1-1", 375);
  const stTabs = await tab.eval(STEPTABS);
  check(
    "375px: STUDENT step tabs not clipped",
    stTabs && stTabs.clipped.length === 0 && stTabs.count === 3,
    `count=${stTabs && stTabs.count} clipped=${JSON.stringify(stTabs && stTabs.clipped)}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  fs.writeFileSync(
    path.join(__dirname, "..", "out", `kig036-${BASE.includes("vercel") ? "prod" : "local"}.json`,
    JSON.stringify({ BASE, results, ldTabs, stTabs }, null, 2),
  );
  proc.kill();
  process.exit(failed.length ? 1 : 0);
})();
