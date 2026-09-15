// [QA handoff] KIG-005 browser verification — GRAMMAR exam scoring.
//
// README completion condition:
//   gh1-006 Step 4 에서  a -> 오답(0점),  모범답안 그대로 -> 정답(100점),
//   단어 하나 틀린 문장 -> 부분정답.
//
// Reuses the CDP Tab harness from verify-grammar-reveal.cjs.
// Pass the production (un-fixed) URL as well — a probe that does not fail on the
// old build proves nothing.
//
// Usage: node verify-kig005-browser.cjs <base-url>
const { spawn } = require("child_process");

const BASE = process.argv[2] || "http://localhost:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9341);
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const PROFILE = "C:/Users/ghddl/AppData/Local/Temp/kqedge-kig005";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const URL_ = `${BASE}/grammar1/gh1-006`;
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

// Helpers injected into the page. `setAnswer` drives React's controlled input.
const HELP = `window.__q = (() => {
  const W = (ms) => new Promise(r => setTimeout(r, ms));
  const txt = () => (document.querySelector('main')?.innerText || '');
  const count = (s) => txt().split(s).length - 1;
  const click = (t) => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').includes(t)); if (!b) return false; b.click(); return true; };
  const setAnswer = (idx, value) => {
    const inputs = [...document.querySelectorAll('main input[type="text"]')].filter(i => !i.disabled);
    const el = inputs[idx];
    if (!el) return false;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  };
  const inputCount = () => [...document.querySelectorAll('main input[type="text"]')].filter(i => !i.disabled).length;
  const state = () => ({
    exact: count('✓ 정답 (100점)'),
    partial: count('△ 부분 정답 (70점)'),
    incorrect: count('✕ 오답 (0점)'),
    scoreLine: (txt().match(/최종 획득 점수\\s*(\\d+)점/) || [])[1] || null,
    partialSummary: (txt().match(/부분 일치:\\s*(\\d+)개/) || [])[1] || null,
    exactSummary: (txt().match(/정답 일치:\\s*(\\d+)개/) || [])[1] || null,
    inputs: inputCount(),
  });
  return { W, txt, count, click, setAnswer, inputCount, state };
})();`;

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  " + detail : ""}`);
};

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
  await tab.send("Page.navigate", { url: URL_ });
  await sleep(3000);
  await tab.eval(`localStorage.removeItem(${JSON.stringify(STORE)})`);
  await tab.send("Page.reload");
  await sleep(3000);
  await tab.eval(HELP);

  const ready = await tab.eval(
    `(async () => { for (let i=0;i<80;i++){ if ((document.querySelector('main')?.innerText||'').length>300) return true; await __q.W(300);} return false; })()`,
  );
  if (!ready) {
    console.log("page did not hydrate");
    proc.kill();
    process.exit(2);
  }

  // Enter the exam step.
  await tab.eval(
    `(async () => {
       const s = [...document.querySelectorAll('button')].find(b => (b.textContent||'').includes('Step 4'));
       if (s) s.click();
       await __q.W(800);
       return true;
     })()`,
  );
  await sleep(1200);
  const nInputs = await tab.eval(`__q.inputCount()`);
  check("Step 4 renders answer inputs", nInputs > 0, `inputs=${nInputs}`);

  // ---- Attack 1: a single letter must score 0 -------------------------------
  await tab.eval(`__q.setAnswer(0, 'a')`);
  await tab.eval(`__q.setAnswer(1, 'e')`);
  await tab.eval(`__q.setAnswer(2, 'you')`);
  await sleep(300);
  await tab.eval(`__q.click('전체 시험 채점하기')`);
  await sleep(1500);
  const after = await tab.eval(`__q.state()`);

  check(
    "single-letter 'a'/one-word 'you' score 0, not 70",
    Number(after.partialSummary) === 0,
    `부분 일치=${after.partialSummary}개, 획득 점수=${after.scoreLine}점`,
  );

  // Model answers are only rendered AFTER submitting, so read them now.
  // The label and the answer sit on separate lines:
  //   "모범 답안:" / "I am Korean." / "🔊 발음 청취"
  const models = await tab.eval(
    `(() => {
       const lines = (document.querySelector('main')?.innerText || '').split('\\n').map(l => l.trim());
       const out = [];
       for (let i = 0; i < lines.length; i++) {
         if (lines[i].startsWith('모범 답안')) {
           for (let j = i + 1; j < lines.length; j++) {
             if (!lines[j] || lines[j].startsWith('모범 답안')) break;
             if (lines[j].includes('발음 청취')) continue;
             out.push(lines[j]);
             break;
           }
         }
       }
       return out;
     })()`,
  );
  check(
    "model answers are readable after submitting",
    Array.isArray(models) && models.length > 0,
    `found=${models && models.length}`,
  );

  // ---- Attack 2: the model answer verbatim must score 100 -------------------
  if (Array.isArray(models) && models.length) {
    await tab.eval(
      `(async () => { localStorage.removeItem(${JSON.stringify(STORE)}); return true; })()`,
    );
    await tab.send("Page.reload");
    await sleep(4000);
    await tab.eval(HELP);
    await tab.eval(
      `(async () => { for (let i=0;i<40;i++){ if ((document.querySelector('main')?.innerText||'').length>300) break; await __q.W(300);} const s=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Step 4')); if(s)s.click(); await __q.W(1000); return true; })()`,
    );
    await sleep(1200);
    const n2 = await tab.eval(`__q.inputCount()`);
    for (let i = 0; i < Math.min(models.length, n2); i++) {
      await tab.eval(`__q.setAnswer(${i}, ${JSON.stringify(models[i])})`);
    }
    await sleep(300);
    await tab.eval(`__q.click('전체 시험 채점하기')`);
    await sleep(1500);
    const verbatim = await tab.eval(`__q.state()`);
    check(
      "verbatim model answers score 100",
      Number(verbatim.exactSummary) > 0 && Number(verbatim.partialSummary) === 0,
      `정답 일치=${verbatim.exactSummary}개, 부분 일치=${verbatim.partialSummary}개, 획득 점수=${verbatim.scoreLine}점`,
    );
  }

  // ---- Attack 3: one wrong word must stay partial --------------------------
  if (Array.isArray(models) && models.length) {
    await tab.eval(
      `(async () => { localStorage.removeItem(${JSON.stringify(STORE)}); return true; })()`,
    );
    await tab.send("Page.reload");
    await sleep(4000);
    await tab.eval(HELP);
    await tab.eval(
      `(async () => { for (let i=0;i<40;i++){ if ((document.querySelector('main')?.innerText||'').length>300) break; await __q.W(300);} const s=[...document.querySelectorAll('button')].find(b=>(b.textContent||'').includes('Step 4')); if(s)s.click(); await __q.W(1000); return true; })()`,
    );
    await sleep(1200);
    const n3 = await tab.eval(`__q.inputCount()`);
    const broken = models.map((m) => {
      const w = m.split(" ");
      const i = w.findIndex((x) => x.replace(/[^A-Za-z]/g, "").length > 3);
      const at = i >= 0 ? i : 0;
      w[at] = w[at] + "x";
      return w.join(" ");
    });
    for (let i = 0; i < Math.min(broken.length, n3); i++) {
      await tab.eval(`__q.setAnswer(${i}, ${JSON.stringify(broken[i])})`);
    }
    await sleep(300);
    await tab.eval(`__q.click('전체 시험 채점하기')`);
    await sleep(1500);
    const typo = await tab.eval(`__q.state()`);
    check(
      "one misspelled word keeps partial credit",
      Number(typo.partialSummary) > 0,
      `정답 일치=${typo.exactSummary}개, 부분 일치=${typo.partialSummary}개, 획득 점수=${typo.scoreLine}점`,
    );
  }

  const passed = results.filter((r) => r.ok).length;
  console.log("");
  console.log(`${passed}/${results.length} PASS  (${BASE})`);
  proc.kill();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => {
  console.error(e);
  process.exit(3);
});
