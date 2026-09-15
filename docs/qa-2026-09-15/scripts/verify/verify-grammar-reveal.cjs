// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// Grammar Step 1 / Step 2 reveal isolation verification.
// Usage: node verify-grammar-reveal.cjs <base-url>
const { spawn } = require("child_process");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9339);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = `C:/Users/ghddl/AppData/Local/Temp/kqedge-kiggram`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL = `${BASE}/grammar1/gh1-006`;
const STORE = "kig:grammar:work:grammar1/gh1-006";

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

const HELP = `window.__q = (() => {
  const W = (ms) => new Promise(r => setTimeout(r, ms));
  const txt = () => (document.querySelector('main')?.innerText || '');
  const count = (s) => txt().split(s).length - 1;
  const click = (t) => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').includes(t)); if (!b) return false; b.click(); return true; };
  const state = () => ({
    // innerText reflects text-transform: uppercase, so this renders as MODEL ANSWER.
    compModelAnswers: count('MODEL ANSWER'),
    compHide: count('🔒 정답 가리기'),
    compAsk: count('💡 정답 확인'),
    clozeHide: count('🔒 빈칸 가리기'),
    clozeAsk: count('💡 빈칸 정답 확인'),
    clozeInputs: document.querySelectorAll('main input[placeholder="___"]').length,
  });
  return { W, txt, count, click, state };
})();`;

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
  await tab.eval(HELP);
  await tab.eval(`__q.W(0)`);
  const ready = await tab.eval(`(async () => { for (let i=0;i<80;i++){ if ((document.querySelector('main')?.innerText||'').length>300) return true; await __q.W(300);} return false; })()`);
  if (!ready) {
    console.log("page did not hydrate");
    proc.kill();
    process.exit(2);
  }

  // ---- Scenario A: reveal everything in Step 1, then look at Step 2 --------
  const before = await tab.eval(`__q.state()`);
  await tab.eval(`__q.click('전체 정답 보기')`);
  await sleep(500);
  const compRevealed = await tab.eval(`__q.state()`);
  check(
    "Step 1: 전체 정답 보기 reveals the composition answers",
    compRevealed.compModelAnswers > 0,
    `modelAnswers=${compRevealed.compModelAnswers} (was ${before.compModelAnswers})`,
  );

  await tab.eval(`__q.click('Step 2 · 빈칸 완성')`);
  await sleep(600);
  const clozeAfter = await tab.eval(`__q.state()`);
  check(
    "Step 2: blanks are NOT revealed by Step 1",
    clozeAfter.clozeHide === 0 && clozeAfter.clozeInputs > 0,
    `clozeHide=${clozeAfter.clozeHide} inputs=${clozeAfter.clozeInputs} clozeAsk=${clozeAfter.clozeAsk}`,
  );

  // ---- Scenario B: reveal one blank in Step 2, then look at Step 1 ---------
  await tab.eval(`__q.click('빈칸 정답 확인')`);
  await sleep(500);
  const clozeOne = await tab.eval(`__q.state()`);
  check(
    "Step 2: per-item reveal still works",
    clozeOne.clozeHide === 1,
    `clozeHide=${clozeOne.clozeHide}`,
  );

  await tab.eval(`__q.click('Step 1 · 영작 훈련')`);
  await sleep(600);
  const compAfter = await tab.eval(`__q.state()`);
  check(
    "Step 1: Step 1's own reveals survive the round trip",
    compAfter.compModelAnswers === compRevealed.compModelAnswers && compAfter.compModelAnswers > 0,
    `modelAnswers=${compAfter.compModelAnswers}`,
  );

  // ---- Scenario C: fresh lesson, Step 2 reveal must not touch Step 1 -------
  await tab.eval(`localStorage.removeItem(${JSON.stringify(STORE)})`);
  await tab.send("Page.reload");
  await sleep(3500);
  await tab.eval(HELP);
  await tab.eval(`(async () => { for (let i=0;i<80;i++){ if ((document.querySelector('main')?.innerText||'').length>300) return true; await __q.W(300);} return false; })()`);
  await tab.eval(`__q.click('Step 2 · 빈칸 완성')`);
  await sleep(600);
  await tab.eval(`__q.click('빈칸 정답 확인')`);
  await sleep(500);
  const clozeFresh = await tab.eval(`__q.state()`);
  await tab.eval(`__q.click('Step 1 · 영작 훈련')`);
  await sleep(600);
  const compFresh = await tab.eval(`__q.state()`);
  check(
    "Step 1: a Step 2 reveal does not leak into Step 1",
    compFresh.compModelAnswers === 0 && clozeFresh.clozeHide === 1,
    `step1ModelAnswers=${compFresh.compModelAnswers} step2Hide=${clozeFresh.clozeHide}`,
  );

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  proc.kill();
  process.exit(failed.length ? 1 : 0);
})();
