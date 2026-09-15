// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// LISTENING Step 1 quiz: once the answer is revealed the choice must be locked.
// Usage: node verify-ld-quiz-lock.cjs <base-url>
const { spawn } = require("child_process");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9340);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kigld`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = `${BASE}/ld/d001`;
const STORE = "kig:ld:mastery:ld/d001";

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
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
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
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout: 90000 });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

// Step 1 option buttons are the only left-aligned, p-3 padded buttons in main.
const HELP = `window.__opts = () => {
  const all = [...document.querySelectorAll('main button')].filter(
    (b) => ((b.className || '').includes('text-left') && (b.className || '').includes('p-3')));
  const groups = new Map();
  for (const b of all) { const p = b.parentElement; if (!groups.has(p)) groups.set(p, []); groups.get(p).push(b); }
  return [...groups.values()][0] || [];
};
window.__probe = () => {
  const first = window.__opts();
  return {
    count: first.length,
    labels: first.map((b) => (b.textContent || '').trim()),
    disabled: first.map((b) => b.disabled),
    redStruck: first.filter((b) => (b.className || '').includes('line-through')).map((b) => (b.textContent || '').trim()),
    green: first.filter((b) => (b.className || '').includes('border-emerald-500')).map((b) => (b.textContent || '').trim()),
  };
};
window.__click = (i) => { const first = window.__opts(); if (first[i]) { first[i].click(); return true; } return false; };
window.__stored = () => { try { return JSON.parse(localStorage.getItem(${JSON.stringify(STORE)}) || '{}').selectedAnswers || null; } catch { return 'parse-error'; } };`;

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

(async () => {
  const proc = spawn(EDGE, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--disable-extensions",
    "--window-size=1280,900",
    "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      if (r.ok) break;
    } catch {}
    await sleep(500);
  }
  const tab = await Tab.open();
  await tab.send("Page.enable");
  await tab.send("Runtime.enable");
  await tab.send("Page.navigate", { url: URL });
  await sleep(3000);
  await tab.eval(`localStorage.removeItem(${JSON.stringify(STORE)})`);
  await tab.send("Page.reload");
  await sleep(3000);
  const ready = await tab.eval(
    `(async () => { for (let i=0;i<80;i++){ const m=document.querySelector('main'); if (m && (m.innerText||'').length>300) return true; await new Promise(r=>setTimeout(r,300)); } return false; })()`,
  );
  if (!ready) {
    console.log("page did not hydrate");
    proc.kill();
    process.exit(2);
  }
  await tab.eval(HELP);

  const start = await tab.eval(`window.__probe()`);
  check("found the first Step 1 quiz options", start.count >= 3, `count=${start.count} labels=${JSON.stringify(start.labels)}`);
  if (start.count < 3) {
    proc.kill();
    process.exit(2);
  }

  // First click answers the question and reveals the key.
  await tab.eval(`window.__click(0)`);
  await sleep(900);
  const afterFirst = await tab.eval(`({ sel: window.__stored(), q: window.__probe() })`);
  check(
    "first choice is recorded and the answer is revealed",
    afterFirst.sel && afterFirst.sel["0"] === 0 && afterFirst.q.green.length === 1,
    `stored=${JSON.stringify(afterFirst.sel)} green=${JSON.stringify(afterFirst.q.green)}`,
  );

  // Second click on a different option must change nothing.
  await tab.eval(`window.__click(1)`);
  await sleep(900);
  const afterSecond = await tab.eval(`({ sel: window.__stored(), q: window.__probe() })`);
  check(
    "second click cannot change the answer",
    afterSecond.sel && afterSecond.sel["0"] === 0,
    `stored=${JSON.stringify(afterSecond.sel)} (expected {"0":0})`,
  );
  check(
    "options are disabled after submitting",
    afterSecond.q.disabled.every(Boolean),
    `disabled=${JSON.stringify(afterSecond.q.disabled)}`,
  );
  check(
    "the marked wrong answer does not move to the newly clicked option",
    JSON.stringify(afterSecond.q.redStruck) === JSON.stringify(afterFirst.q.redStruck),
    `before=${JSON.stringify(afterFirst.q.redStruck)} after=${JSON.stringify(afterSecond.q.redStruck)}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  proc.kill();
  process.exit(failed.length ? 1 : 0);
})();
