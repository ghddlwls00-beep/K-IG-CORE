// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Headless Edge (CDP) UI harness: renders every in-scope lesson as an entitled user,
// executes section features, records console/network/JS errors and audio playback.
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const BASE = process.env.QA_BASE || "http://127.0.0.1:3100";
const PORT = Number(process.env.QA_CDP_PORT || 9333);
const WORKERS = Number(process.env.QA_WORKERS || 3);
const PLAN = process.env.QA_PLAN || "LIFE";
const ONLY = process.env.QA_ONLY ? new RegExp(process.env.QA_ONLY) : null;
const OUTFILE = path.join(__dirname, "out", process.env.QA_OUT || `ui-${PLAN}.jsonl`);
const secrets = JSON.parse(fs.readFileSync(path.join(__dirname, "qa-secrets.json"), "utf8"));
const lic = secrets.tokens[PLAN];
let expected = JSON.parse(fs.readFileSync(path.join(__dirname, "out", "expected.json"), "utf8"));
if (ONLY) expected = expected.filter((e) => ONLY.test(`${e.section}:${e.id}`));
const done = new Set(fs.existsSync(OUTFILE) ? fs.readFileSync(OUTFILE, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)).map((r) => r.url) : []);
const todo = expected.filter((e) => !done.has(e.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const profile = `C:/Users/ghddl/AppData/Local/Temp/kqedge-${PLAN}`;

async function launch() {
  const proc = spawn(EDGE, [
    "--headless=new", `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
    "--autoplay-policy=no-user-gesture-required", "--mute-audio", "--no-first-run", "--disable-extensions",
    "--window-size=1280,900", "about:blank",
  ], { stdio: "ignore" });
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch(`http://127.0.0.1:${PORT}/json/version`); if (r.ok) return { proc, info: await r.json() }; } catch {}
    await sleep(500);
  }
  throw new Error("edge did not start");
}

class Tab {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.onmessage = (m) => this.onMsg(JSON.parse(m.data)); }
  static async open() {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/new?about:blank`, { method: "PUT" })).json();
    const ws = new WebSocket(t.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
    const tab = new Tab(ws);
    tab.targetId = t.id;
    return tab;
  }
  onMsg(msg) {
    if (msg.id && this.pending.has(msg.id)) { const { res, rej } = this.pending.get(msg.id); this.pending.delete(msg.id); msg.error ? rej(new Error(msg.error.message)) : res(msg.result); return; }
    for (const h of this.handlers) h(msg);
  }
  send(method, params = {}) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params })); return new Promise((res, rej) => { this.pending.set(id, { res, rej }); setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error(`timeout ${method}`)); } }, 150000); }); }
  async eval(expr, timeout = 60000) {
    const r = await this.send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true, timeout });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  }
}

const INSTRUMENT = `
(() => {
  window.__ev = []; window.__errs = [];
  const t0 = Date.now();
  const seen = new WeakSet();
  const op = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const el = this;
    if (!seen.has(el)) { seen.add(el); ['playing','ended','error'].forEach(e => el.addEventListener(e, () => window.__ev.push([Date.now()-t0, e, (el.currentSrc||el.src||'').split('/').pop().slice(0,40), el.error && el.error.code]))); }
    window.__ev.push([Date.now()-t0, 'play()', (el.src||'').split('/').pop().slice(0,40)]);
    return op.apply(this, arguments).catch(e => { window.__ev.push([Date.now()-t0, 'reject', String(e).slice(0,60)]); throw e; });
  };
  if (window.speechSynthesis) { const os = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__ev.push([Date.now()-t0, 'synth', u.text]); return os(u); }; }
  window.addEventListener('error', e => window.__errs.push('onerror: ' + e.message));
  window.addEventListener('unhandledrejection', e => window.__errs.push('unhandled: ' + String(e.reason && (e.reason.stack || e.reason)).slice(0,200)));
})();`;

// ---- in-page helpers & per-section checks -------------------------------------------------
const PAGE_LIB = `
window.__qa = (() => {
  const W = (ms) => new Promise(r => setTimeout(r, ms));
  const main = () => document.querySelector('main');
  const txt = () => (main()?.innerText || '').replace(/\\s+/g, ' ');
  const btn = (t, root) => [...(root||document).querySelectorAll('button')].find(b => b.textContent.includes(t));
  const norm = (s) => (s||'').replace(/\\s+/g, ' ').trim();
  async function waitFor(fn, ms = 60000) { const end = Date.now() + ms; while (Date.now() < end) { try { const v = fn(); if (v) return v; } catch {} await W(250); } return null; }
  async function playCheck(clickFn, ms = 15000) {
    const n = window.__ev.length; clickFn();
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const seg = window.__ev.slice(n);
      if (seg.some(e => e[1] === 'playing')) return { ok: true, src: seg.find(e => e[1]==='playing')[2] };
      if (seg.some(e => e[1] === 'error' || (e[1] === 'synth' && e[2] !== ' '))) return { ok: false, seg: seg.map(e => e[1]+':'+e[2]) };
      await W(150);
    }
    return { ok: false, timeout: true, seg: window.__ev.slice(n).map(e => e[1]+':'+e[2]) };
  }
  const missing = (list) => { const t = txt(); return list.filter(s => s && !t.includes(norm(s))); };
  async function solveTiles(bankFinder, words, checkLabel, okText) {
    for (const w of words) { const t = bankFinder().find(b => !b.disabled && b.textContent.trim() === w); if (!t) return { ok: false, missingTile: w }; t.click(); await W(30); }
    const b = btn(checkLabel); if (!b) return { ok: false, noCheckButton: true };
    b.click(); await W(400);
    return { ok: txt().includes(okText) };
  }
  return { W, main, txt, btn, norm, waitFor, playCheck, missing, solveTiles };
})();`;

const CHECKS = {
  STUDENT: (e) => `(async () => { const q=__qa; const r={};
    r.ready = !!(await q.waitFor(() => q.btn('Step 1. 블라인드 리스닝')));
    if (!r.ready) { r.paywall = q.txt().includes('이용권'); r.h1 = document.querySelector('h1')?.textContent; return r; }
    r.sentenceCards = (q.main().innerText.match(/Sentence #\\d+/g)||[]).length;
    q.btn('👁️ 전체 보기').click(); await q.W(250);
    r.missingEn = q.missing(${JSON.stringify(e.en)}); r.missingKo = q.missing(${JSON.stringify(e.ko)});
    const sb = q.main().querySelector('button[title="문장 듣기"]');
    r.play = sb ? await q.playCheck(() => sb.click(), 20000) : { ok:false, noButton:true };
    q.btn('Step 2').click(); await q.W(400);
    r.dictHeader = (q.txt().match(/문장 1 \\/ (\\d+)/)||[])[1];
    const bank = () => { const lab=[...q.main().querySelectorAll('span')].find(s=>s.textContent.startsWith('단어 보관함')); return lab ? [...lab.parentElement.querySelectorAll('button')] : []; };
    r.dictSolve = await q.solveTiles(bank, ${JSON.stringify(e.firstWords)}, '정답 확인', '정답입니다!');
    q.btn('Step 3').click(); await q.W(300);
    r.completeBtn = !!(q.btn('이 강의 학습 완료') || q.btn('학습 완료됨'));
    return r; })()`,
  VOCA: (e) => `(async () => { const q=__qa; const r={};
    r.ready = !!(await q.waitFor(() => q.btn('덩어리 매트릭스')));
    if (!r.ready) { r.paywall = q.txt().includes('이용권'); return r; }
    r.topPlayer = (q.txt().match(/1\\/(\\d+)/)||[])[1];
    const all = q.btn('단어 펼쳐보기'); if (all) { all.click(); await q.W(250); }
    const cards = [...q.main().querySelectorAll('div.cursor-pointer')].filter(d => d.querySelector('span.font-mono.text-\\\\[16px\\\\]'));
    r.cards = cards.length; const cardWords = cards.map(c => c.querySelector('span.font-mono.text-\\\\[16px\\\\]').textContent);
    r.placeholderMeanings = cards.filter(c => [...c.querySelectorAll('span')].pop().textContent.trim() === '단어').map(c => c.querySelector('span.font-mono.text-\\\\[16px\\\\]').textContent);
    const exp = ${JSON.stringify(e.words)}; r.missingWords = exp.filter(w => !cardWords.includes(w));
    r.collocationGeneric = q.txt().includes('vital role of');
    r.play = cards[0] ? await q.playCheck(() => cards[0].click()) : { ok:false, noCards:true };
    q.btn('액티브 인출').click(); await q.W(300); r.recall = (q.main().textContent.match(/Question #1 \\/ (\\d+)/)||[])[1];
    const opt = [...q.main().querySelectorAll('button')].find(b => b.querySelector('span.font-mono') && /^A\\.$/.test(b.querySelector('span.font-mono').textContent.trim()));
    if (opt) { opt.click(); await q.W(200); r.recallAnswered = !!q.btn('다음 문제 풀기'); }
    q.btn('AI 발음 & 오답노트').click(); await q.W(300); r.leitner = (q.txt().match(/전체 \\((\\d+)\\)/)||[])[1];
    q.btn('60초 타임어택').click(); await q.W(300); const st = q.btn('도전 시작하기'); if (st) { st.click(); await q.W(300); } r.speedStarted = /⏳ \\d+s/.test(q.txt());
    return r; })()`,
  GRAMMAR: (e) => `(async () => { const q=__qa; const r={};
    r.ready = !!(await q.waitFor(() => q.btn('Step 1 · 영작 훈련')));
    if (!r.ready) { r.paywall = q.txt().includes('이용권'); return r; }
    r.itemCount = (q.txt().match(/총 (\\d+)개 문항/)||[])[1];
    q.btn('전체 정답 보기').click(); await q.W(300);
    const items = ${JSON.stringify(e.items)};
    r.missingKo = q.missing(items.map(i => i.ko)); r.missingEn = q.missing(items.map(i => i.en));
    const pb = q.btn('영어 정답 발음'); r.play = pb ? await q.playCheck(() => pb.click()) : { ok:false, noButton:true };
    q.btn('Step 1 · 영작 훈련').click(); await q.W(200); q.btn('전체 정답 가리기').click(); await q.W(200);
    q.btn('Step 2 · 빈칸 완성').click(); await q.W(300); r.clozeInputs = q.main().querySelectorAll('input[placeholder="___"]').length;
    q.btn('Step 3 · 구문 각인').click(); await q.W(300);
    q.btn('Step 4 · 종합 평가').click(); await q.W(300);
    const setVal=(el,v)=>{const s=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; s.call(el,v); el.dispatchEvent(new Event('input',{bubbles:true}));};
    const inputs=[...q.main().querySelectorAll('input[placeholder="답안을 입력하세요..."]')]; r.examInputs = inputs.length;
    inputs.forEach((inp,i)=>setVal(inp, items[i] ? items[i].en : ''));
    await q.W(300); const sb = q.btn('전체 시험 채점하기'); if (sb) { sb.click(); await q.W(400); }
    r.examScoreWithModelAnswers = (q.txt().match(/최종 획득 점수 (\\d+)점/)||[])[1];
    const b = q.btn('답안 다시 수정하기'); if (b) b.click();
    window.confirm = () => true; q.btn('Step 1 · 영작 훈련').click(); await q.W(200); const rs = q.btn('모든 작성 내용 초기화'); if (rs) rs.click();
    return r; })()`,
  LISTENING: (e) => `(async () => { const q=__qa; const r={};
    r.ready = !!(await q.waitFor(() => q.btn('전체 본문 듣기')));
    if (!r.ready) { r.paywall = q.txt().includes('이용권'); return r; }
    r.sentenceCount = (q.txt().match(/(\\d+)개 문장 완성 코스웨어/)||[])[1];
    r.topPlayer = (q.txt().match(/ 1\\/(\\d+) /)||[])[1];
    r.quizQuestions = [...q.main().querySelectorAll('h4')].filter(h=>/^Q\\d/.test(h.textContent)).length;
    q.btn('다음: Step 2').click(); await q.W(400);
    const bank = () => { const s=[...q.main().querySelectorAll('span')].find(s=>s.textContent.startsWith('단어 블록 뱅크')); return s ? [...s.closest('div').parentElement.querySelectorAll('.flex.flex-wrap.gap-2\\\\.5 button')] : []; };
    r.dictSolve = await q.solveTiles(bank, ${JSON.stringify(e.firstWords)}, '✓ 정답 채점하기', '정답입니다!');
    q.btn('다음: Step 3').click(); await q.W(300); r.liaisonSelectOptions = q.main().querySelector('select')?.options.length;
    q.btn('다음: Step 4').click(); await q.W(300); r.shadowCounter = (q.txt().match(/1 \\/ (\\d+)/)||[])[1];
    q.btn('다음: Step 5').click(); await q.W(300);
    r.missingEn = q.missing(${JSON.stringify(e.en)}); r.missingKo = q.missing(${JSON.stringify(e.ko)});
    const pb = [...q.main().querySelectorAll('button[title="개별 문장 청취"]')][0];
    r.play = pb ? await q.playCheck(() => pb.click()) : { ok: false, noButton: true };
    return r; })()`,
  READING: (e) => `(async () => { const q=__qa; const r={};
    r.ready = !!(await q.waitFor(() => q.btn('Step 1 · 속독 챌린지')));
    if (!r.ready) { r.paywall = q.txt().includes('이용권'); return r; }
    r.sentenceCount = (q.txt().match(/(\\d+)개 핵심 문장/)||[])[1];
    r.passageSpans = q.main().querySelectorAll('[data-sentence-id]').length;
    r.missingEn = q.missing(${JSON.stringify(e.en)});
    const s1 = q.main().querySelector('[data-sentence-id]');
    r.play = s1 ? await q.playCheck(() => s1.click()) : { ok:false, noSpan:true };
    q.btn('Step 2 · 핵심 어휘').click(); await q.W(300); r.vocabCards = q.main().querySelectorAll('button[title="발음 듣기"]').length;
    q.btn('Step 3 · 독해 퀴즈').click(); await q.W(300);
    r.quiz = [...q.main().querySelectorAll('h3')].filter(h=>/^Q\\d/.test(h.textContent)).length;
    const clozeP = [...q.main().querySelectorAll('p.font-serif')].filter(p => p.closest('.rounded-xl') && p.parentElement.querySelector('button'));
    r.cloze = clozeP.length; r.clozeUnmasked = clozeP.filter(p=>!p.textContent.includes('_______')).map(p=>p.textContent.slice(0,60));
    q.btn('Step 4 · 원문 대조').click(); await q.W(300);
    r.missingKo = q.missing(${JSON.stringify(e.ko)});
    return r; })()`,
};

async function worker(tab, queue, stats) {
  const events = { console: [], net: [], exc: [] };
  tab.handlers.push((m) => {
    if (m.method === "Runtime.exceptionThrown") events.exc.push((m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || "").slice(0, 300));
    if (m.method === "Runtime.consoleAPICalled" && ["error", "warning", "assert"].includes(m.params.type)) events.console.push(`${m.params.type}: ${m.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300)}`);
    if (m.method === "Log.entryAdded" && m.params.entry.level === "error") events.console.push(`log: ${m.params.entry.text.slice(0, 200)} ${m.params.entry.url || ""}`);
    if (m.method === "Network.responseReceived" && m.params.response.status >= 400) events.net.push(`${m.params.response.status} ${m.params.response.url.slice(0, 160)}`);
    if (m.method === "Network.loadingFailed" && !m.params.canceled) events.net.push(`FAILED ${m.params.errorText} ${m.params.type}`);
  });
  while (queue.length) {
    const e = queue.shift();
    events.console = []; events.net = []; events.exc = [];
    const t0 = Date.now();
    let res, err;
    for (let attempt = 1; attempt <= 3; attempt++) {
      err = undefined;
      try {
        if (attempt === 1) await tab.send("Page.navigate", { url: BASE + e.url });
        await sleep(attempt === 1 ? 300 : 2500);
        await tab.eval(`new Promise(r => { if (document.readyState === 'complete') r(1); else addEventListener('load', () => r(1), { once: true }); })`, 140000);
        await tab.eval(PAGE_LIB);
        const key = e.section.startsWith("GRAMMAR") ? "GRAMMAR" : e.section;
        res = await tab.eval(CHECKS[key](e), 140000);
        res.errs = await tab.eval("window.__errs");
        if (attempt > 1) res.retriedAfterReload = attempt - 1;
        break;
      } catch (x) {
        err = String(x.message || x).slice(0, 300);
        if (!/navigated or closed|context was destroyed|Cannot find context/i.test(err)) break;
      }
    }
    const row = { section: e.section, id: e.id, url: e.url, ms: Date.now() - t0, res, err, exc: [...events.exc], console: events.console.filter((c) => !/Download the React DevTools|\[Fast Refresh\]|\[HMR\]/.test(c)).slice(0, 12), net: [...new Set(events.net)].slice(0, 12) };
    fs.appendFileSync(OUTFILE, JSON.stringify(row) + "\n");
    stats.done++;
    if (stats.done % 20 === 0) console.log(`${stats.done}/${stats.total} (${Math.round((Date.now() - stats.t0) / 1000)}s)`);
  }
}

(async () => {
  const { proc } = await launch();
  try {
    const boot = await Tab.open();
    await boot.send("Network.enable");
    await boot.send("Network.setCookie", { name: "kig_license_session", value: lic.token, domain: "127.0.0.1", path: "/", httpOnly: true, sameSite: "Lax" });
    await boot.send("Page.navigate", { url: BASE + "/robots.txt" });
    await sleep(3000);
    await boot.eval(`localStorage.clear(); localStorage.setItem('kig:device:id:v1', ${JSON.stringify(lic.deviceId)}); localStorage.setItem('kig:device:name:v1','QA harness'); localStorage.setItem('kig:license:v1', ${JSON.stringify(JSON.stringify({ maskedKey: lic.maskedKey, licenseId: lic.licenseId, plan: lic.plan, activatedAt: Date.now(), expiresAt: lic.expiresAt, token: lic.token }))}); 'ok'`); // BUG-018: the browser keeps the token + masked code, never the code
    const tabs = [];
    for (let i = 0; i < WORKERS; i++) {
      const t = await Tab.open();
      for (const d of ["Runtime.enable", "Page.enable", "Network.enable", "Log.enable"]) await t.send(d);
      await t.send("Page.addScriptToEvaluateOnNewDocument", { source: INSTRUMENT });
      tabs.push(t);
    }
    const queue = [...todo];
    const stats = { done: 0, total: queue.length, t0: Date.now() };
    console.log(`plan ${PLAN}: ${queue.length} lessons to run (${done.size} already done)`);
    await Promise.all(tabs.map((t) => worker(t, queue, stats)));
    console.log("finished");
  } finally {
    proc.kill();
  }
})().catch((e) => { console.error("HARNESS FAILED", e); process.exit(1); });
