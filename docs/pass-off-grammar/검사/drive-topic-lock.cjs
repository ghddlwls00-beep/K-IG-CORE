#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 대주제 순서 잠금을 실제 브라우저(헤드리스 Edge 390×844)로 (설계 §5 · 코드 단계 C · 그 점검 반영).
 * 코드 단계 C 의 세션 스크래치 drive-c.cjs 를 저장소로 옮긴 것(점검: 다음 세션 · 사장님이 다시 돌릴 수 있게).
 *
 * 준비는 check-progress-live.mjs 와 같음 — 버리는 시험 비밀값 JSON {LICENSE_SALT, LICENSE_SECRET, ADMIN_PIN,
 * ADMIN_SESSION_SECRET} 을 환경에 넣고 이 작업 트리에서 `npx next dev -p 3461`(R2 값 없이 — 로컬 대체 저장소 data/*.json).
 * 끝나면 data/license-devices.json · data/passoff-progress.json 을 지운다. 비밀값 파일은 커밋하지 않는다.
 *   node docs/pass-off-grammar/검사/drive-topic-lock.cjs --secrets <json> [--base http://localhost:3461] [--break=<아래>]
 *
 *   D1 이용권 없음: 목록 — TOPIC 1 '첫 두 레슨 무료 체험' · TOPIC 2 '이용권 등록 후 열림'(이용권 없는 사람에게 'TOPIC 1을 마치면' 이라고 하지 않음)
 *   D2 STUDENT 이용권(새것): 목록 — '서버에 저장됨' · TOPIC 1 학습 가능 · 해금 기준 · TOPIC 2 'TOPIC 1을 마치면 열림' · 잠금 배지 ·
 *      카드 'TOPIC 1을 마치면 열림' · '해금 조건 보기' · 가로 넘침 0
 *   D3 pg01-1 · pg01-2 는 API 로, pg01-3 은 레슨 화면 5단계를 끝까지 → 화면이 서버에 완료를 보냄
 *   D4 목록 — 'TOPIC 2가 열렸어요.'(점검 3: 2 는 받침 없음) · TOPIC 1 '대주제 완료' · '3 / N개 완료' · TOPIC 2 학습 가능
 *   D5 다시 열면 알림 없음
 *   D6 잠금 화면 pg03-1 'TOPIC 2를 마치면 열려요' · 기기에 남은 완료(pg02-1~3)를 보내면 서버 답으로 레슨이 열림
 *   D7 잠금 화면 가로 넘침 0 · 누를 곳 44px · 콘솔 오류 0(음성 파일이 없어 나는 502 제외)
 *   D8 점검 6: 쪽을 다시 열 때 서버 답이 늦어도 — 기기에 둔 지난 답으로 TOPIC 2~3 이 바로 열려 보임 · 둔 답이 없으면
 *      '진도 확인 중…'(잠김으로 그렸다가 바뀌지 않음)
 *   D9 점검 1(사장님 1분 확인 그대로): 관리자 '진도 초기화' 뒤 같은 기기의 목록 = 서버 기록(0 / N · ✓ 0 · TOPIC 2 잠김 — 잠금과
 *      같은 말), 끝낸 레슨 화면에 '기록되지 않았어요', 잠금 화면에 '아직 기록되지 않은 레슨 … 이 기기에서 마침', 그 레슨을
 *      '처음부터 다시 하기'로 다시 마치면 서버에 기록됨
 *   D10 점검 9: 기기 대기열 — 다른 이용권으로 끝낸 완료는 이 이용권으로 안 보냄(서버에 안 남음 · 대기열에 그대로) · 대주제가
 *      안 열려 거절된 완료는 목록에 안 세고, 그 대주제가 잠긴 동안 기다리다가 열렸다는 답(관리자 수동 해금)이 오면 한 번 더 보내 기록됨
 *
 *   깨기(각각 exit 1 이어야 — 검사가 실패할 수 있음):
 *     --break=seen            알림을 이미 본 것으로 둠 → D4a FAIL
 *     --break=no-pending      D6 에서 남은 완료를 안 넣음 → D6b FAIL
 *     --break=topic-lock-off  서버 답을 '모두 열림'(unlockedThrough 99)으로 바꿔 받음 — 목록 잠금 표시가 없는 판 → D2c · D2d FAIL
 *     --break=no-cache        D8 전에 기기에 둔 답을 지움 → D8a FAIL
 *     --break=no-reset        D9 에서 초기화를 안 누름 → D9a FAIL
 *     --break=same-licence    D10 의 '다른 이용권' 완료를 이 이용권 것으로 적어 넣음(보내져야 하는 판) → D10a FAIL
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const ORIGIN = arg("base", "http://localhost:3461");
const BREAK = arg("break", "");
const BREAKS = ["seen", "no-pending", "topic-lock-off", "no-cache", "no-reset", "same-licence"];
if (BREAK && !BREAKS.includes(BREAK)) {
  console.error(`모르는 깨기: ${BREAK} — ${BREAKS.join(" · ")}`);
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN)) {
  console.error(`로컬 서버에만 씁니다 — ${ORIGIN}`);
  process.exit(2);
}
const secretsFile = arg("secrets");
if (!secretsFile || !fs.existsSync(secretsFile)) {
  console.error("--secrets <json> 가 필요합니다(서버를 켤 때 넣은 버리는 시험 비밀값)");
  process.exit(2);
}
const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
const BASE = ORIGIN + "/passoff-grammar/";

const load = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", js)(m, m.exports);
  return m.exports;
};
const { viewBlocks } = load("src/lib/passoffView.ts");
const { cutSets } = load("src/lib/passoffLesson.ts");
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const total = index.lessons.length;
const titleOf = (id) => (index.lessons.find((l) => l.id === id) || {}).title || id;

const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const cs = crypto.createHmac("sha256", sec.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${cs}`;
};

function lessonView(id) {
  const L = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
  const blocks = viewBlocks(L.blocks);
  const drill = blocks.find((b) => b.type === "drill");
  return {
    anchors: blocks.find((b) => b.type === "anchors").items,
    rule: blocks.find((b) => b.type === "rule"),
    forms: (drill.select || []).filter((s) => !s.reserve),
    produce: drill.produce || [],
    transfers: drill.transfer || [],
    sets: cutSets(drill.produce || []),
  };
}

// ── what the page runs before its own scripts: a hand on the progress API (a slow answer, or — broken on purpose —
// an answer that opens every topic), switched from localStorage so each step can turn it on and off
const FETCH_HAND = `(() => {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!url.includes("/api/progress/passoff-grammar")) return real(input, init);
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    const delay = Number(localStorage.getItem("drive:passoff-get-delay") || 0);
    if (method === "GET" && delay) await new Promise((r) => setTimeout(r, delay));
    const res = await real(input, init);
    if (localStorage.getItem("drive:passoff-open-all") !== "1") return res;
    const data = await res.clone().json().catch(() => null);
    if (!data || !data.progress) return res;
    data.progress.unlockedThrough = 99;
    return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json" } });
  };
})();`;

// ── page snippets (as stage B's drive.cjs)
const clickIn = (n, text, exact = true) => `(() => {
  const sec = document.querySelector('section[aria-labelledby="passoff-step-${n}"]');
  const b = [...sec.querySelectorAll('button')].find(x => (${exact} ? x.textContent.trim() === ${JSON.stringify(text)} : x.textContent.trim().startsWith(${JSON.stringify(text)})) && !x.disabled && x.getAttribute('aria-disabled') !== 'true' && !x.closest('[hidden]'));
  if (!b) return 'no ' + ${JSON.stringify(text)};
  b.click(); return 'clicked';
})()`;
const clickTab = (i) => `(() => { const b = [...document.querySelectorAll('nav[aria-label="학습 단계"] button')][${i}]; b.click(); return true; })()`;
const setField = (n, selector, value) => `(() => {
  const el = document.querySelector('section[aria-labelledby="passoff-step-${n}"] ${selector}');
  if (!el) return 'no field';
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()`;
const workOf = (id) => `JSON.parse(localStorage.getItem('kig:passoff:work:passoff-grammar/${id}') || 'null')`;
const MAIN_TEXT = `(document.querySelector('main') || document.body).innerText.replace(/\\s+/g, ' ')`;
/** a section of the course list: its header text (title · status line · badge) */
const SECTION = (i) => `(() => { const s = document.getElementById('section-${i}'); return s ? s.querySelector('button[aria-expanded]').innerText.replace(/\\s+/g, ' ').trim() : null; })()`;
const HEAD = `document.querySelector('h2') ? document.querySelector('h2').innerText.replace(/\\s+/g, ' ') : ''`;
const API_GET = `fetch('/api/progress/passoff-grammar', { cache: 'no-store' }).then(r => r.json())`;
const OVERFLOW = `document.documentElement.scrollWidth > window.innerWidth + 1`;
const SMALL = `(() => { const out = []; for (const el of document.querySelectorAll('main a[href], main button')) { const r = el.getBoundingClientRect(); if (r.width && r.height && (r.width < 44 || r.height < 44)) out.push((el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); } return out; })()`;

async function revealAll(tab, count) {
  for (let i = 0; i < count; i++) {
    await sleep(2150);
    const r = await tab.eval(clickIn(1, "영어 보기"));
    if (r !== "clicked") return i;
  }
  return count;
}
async function finishRule(tab, rule) {
  await tab.eval(clickTab(1));
  await sleep(300);
  if (rule.discovery) {
    await tab.eval(`(() => { const g = document.querySelector('#passoff-discovery').parentElement.querySelector('[role=group] button'); g.click(); return true; })()`);
    await sleep(300);
  }
  if (rule.check) {
    await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="passoff-rule-check"]'); const b = [...sec.querySelectorAll('[role=group] button')][${rule.check.answer}]; b.click(); return true; })()`);
    await sleep(300);
  }
}
async function answerForm(tab, lesson, id) {
  const item = lesson.forms.find((f) => f.id === id);
  if (item.kind === "select") {
    for (const i of item.answer) {
      await tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="낱말 고르기"]'); const el = [...g.children][${i}]; if (el.tagName === 'BUTTON') el.click(); return true; })()`);
      await sleep(120);
      if (item.labels && item.labels.length) {
        const k = item.answer.indexOf(i);
        const label = Array.isArray(item.labelAnswer) ? item.labelAnswer[k] : item.labelAnswer;
        await tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="이름표 고르기"]'); const b = [...g.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)}); b.click(); return true; })()`);
        await sleep(120);
      }
    }
    return tab.eval(clickIn(3, "확인"));
  }
  if (item.kind === "choice") {
    return tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="보기"]'); const b = [...g.querySelectorAll('button')][${item.answer}]; b.click(); return 'clicked'; })()`);
  }
  await tab.eval(setField(3, "input", item.answer[0]));
  await sleep(100);
  return tab.eval(clickIn(3, "확인"));
}
const done = (work, key, id) => Boolean(work && work[key][id] && work[key][id].done);
function formHead(lesson, work) {
  const ids = lesson.forms.map((f) => f.id);
  const kept = ((work && work.formQueue) || []).filter((id) => ids.includes(id) && !done(work, "form", id));
  return (kept.length ? kept : ids.filter((id) => !done(work, "form", id)))[0];
}
function composeHead(lesson, work, list) {
  const setIndex = Math.min((work && work.composeSet) || 0, Math.max(0, lesson.sets.length - 1));
  const ids = list === "transferQueue" ? lesson.transfers.map((t) => t.id) : (lesson.sets[setIndex] || []).map((p) => p.id);
  const kept = ((work && work[list]) || []).filter((id) => ids.includes(id) && !done(work, "compose", id));
  return (kept.length ? kept : ids.filter((id) => !done(work, "compose", id)))[0];
}
/** the five steps of one lesson, every answer right — on the page already open */
async function finishSteps(tab, id) {
  const L = lessonView(id);
  await revealAll(tab, L.anchors.length);
  await finishRule(tab, L.rule);
  await tab.eval(clickTab(2));
  await sleep(400);
  for (let k = 0; k < L.forms.length + 1; k++) {
    const head = formHead(L, await tab.eval(workOf(id)));
    if (!head) break;
    await answerForm(tab, L, head);
    await sleep(300);
    await tab.eval(clickIn(3, "다음"));
    await sleep(450);
  }
  await tab.eval(clickTab(3));
  await sleep(400);
  for (let k = 0; k < L.produce.length + L.sets.length + 2; k++) {
    const head = composeHead(L, await tab.eval(workOf(id)), "composeQueue");
    if (!head) {
      const r = await tab.eval(clickIn(4, "다음 세트"));
      await sleep(500);
      if (r !== "clicked") break;
      continue;
    }
    await tab.eval(setField(4, "textarea", L.produce.find((p) => p.id === head).en));
    await tab.eval(clickIn(4, "확인"));
    await sleep(300);
    await tab.eval(clickIn(4, "다음 문장"));
    await sleep(450);
  }
  await tab.eval(clickTab(4));
  await sleep(400);
  for (let k = 0; k < L.transfers.length; k++) {
    const head = composeHead(L, await tab.eval(workOf(id)), "transferQueue");
    if (!head) break;
    await tab.eval(setField(5, "textarea", L.transfers.find((p) => p.id === head).en));
    await tab.eval(clickIn(5, "확인"));
    await sleep(300);
    await tab.eval(clickIn(5, "다음 문장"));
    await sleep(450);
  }
  if (L.rule.check) {
    await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="passoff-wrap-check"]'); const b = [...sec.querySelectorAll('[role=group] button')][${L.rule.check.answer}]; b.click(); return true; })()`);
    await sleep(900);
  }
  return tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.includes('레슨 완료')`);
}
async function finishLesson(tab, id) {
  await tab.goto(BASE + id, 1800);
  return finishSteps(tab, id);
}
async function waitFor(tab, expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expr).catch(() => false)) return true;
    await sleep(250);
  }
  return false;
}

const results = [];
const check = (label, ok, detail) => {
  results.push({ label, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ""}`);
};

(async () => {
  const profile = path.join(require("os").tmpdir(), `kig-drive-topic-lock-${Date.now()}`);
  const { proc, port } = await launch({ port: 9463, profile });
  const tab = await Tab.open(port);
  try {
    await tab.viewport("mobile");
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: FETCH_HAND });

    // D1 no licence
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    const s0 = await tab.eval(SECTION(0));
    const s1 = await tab.eval(SECTION(1));
    check("D1 이용권 없음: TOPIC 1 '첫 두 레슨 무료 체험' · TOPIC 2 '이용권 등록 후 열림'", /첫 두 레슨 무료 체험/.test(s0) && /이용권 등록 후 열림/.test(s1) && !/마치면 열림/.test(s1) && !(await tab.eval(MAIN_TEXT)).includes("서버에 저장됨"), { s0, s1 });

    // a STUDENT pass on this browser, as the licence window would do it
    const key = makeKey("STU1Y");
    const activated = await tab.eval(`(async () => {
      const dev = localStorage.getItem('kig:device:id:v1');
      const r = await fetch('/api/license/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, deviceId: dev, deviceName: 'topic lock drive' }) });
      const d = await r.json();
      if (!d.success) return d.error || r.status;
      localStorage.setItem('kig:license:v1', JSON.stringify({ maskedKey: d.maskedKey, licenseId: d.licenseId, plan: d.plan, activatedAt: d.activatedAt || Date.now(), expiresAt: d.expiresAt, token: d.licenseToken }));
      return 'ok';
    })()`);
    if (activated !== "ok") throw new Error(`activation failed: ${activated}`);
    const licenseId = await tab.eval(`JSON.parse(localStorage.getItem('kig:license:v1')).licenseId`);
    if (BREAK === "seen") await tab.eval(`localStorage.setItem('kig:passoff:seen-topic:${licenseId}', '99'), true`);
    if (BREAK === "topic-lock-off") await tab.eval(`localStorage.setItem('drive:passoff-open-all', '1'), true`);

    // D2 the list with a fresh licence
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    const a0 = await tab.eval(SECTION(0));
    const a1 = await tab.eval(SECTION(1));
    check("D2a '서버에 저장됨'", (await tab.eval(MAIN_TEXT)).includes("서버에 저장됨"));
    check("D2b TOPIC 1: 학습 가능 · '레슨 3개와 마지막 레슨을 마치면 다음 대주제'", /학습 가능/.test(a0) && /레슨 3개와 마지막 레슨을 마치면 다음 대주제/.test(a0), a0);
    check("D2c TOPIC 2: 'TOPIC 1을 마치면 열림' · '잠금' 배지", /TOPIC 1을 마치면 열림/.test(a1) && /잠금/.test(a1), a1);
    await tab.eval(`document.querySelector('#section-1 button[aria-expanded]').click(), true`);
    await sleep(500);
    const cards = await tab.eval(`[...document.querySelectorAll('#section-1 li')].map(li => li.innerText.replace(/\\s+/g, ' '))`);
    check("D2d TOPIC 2 카드: 'TOPIC 1을 마치면 열림' · '해금 조건 보기'", cards.length > 0 && cards.every((c) => c.includes("TOPIC 1을 마치면 열림") && c.includes("해금 조건 보기")), cards[0]);
    check("D2e 목록 가로 넘침 0", (await tab.eval(OVERFLOW)) === false);
    if (BREAK === "topic-lock-off") await tab.eval(`localStorage.removeItem('drive:passoff-open-all'), true`);

    // D3 pg01-1 · pg01-2 by the API, pg01-3 through its five steps
    const pre = await tab.eval(`fetch('/api/progress/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: [{ lessonId: 'pg01-1', completed: true }, { lessonId: 'pg01-2', completed: true }] }) }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    const finished = await finishLesson(tab, "pg01-3");
    check("D3a pg01-3 레슨 화면 5단계 끝 — '레슨 완료'", finished === true && pre === 1, { pre, finished });
    const synced = await waitFor(tab, `${API_GET}.then(d => d.progress.lessons['pg01-3'] && d.progress.unlockedThrough === 2)`);
    const state = await tab.eval(`${API_GET}.then(d => ({ u: d.progress.unlockedThrough, pg013: d.progress.lessons['pg01-3'] || null }))`);
    check("D3b 화면이 완료를 서버에 보냄 → unlockedThrough 2 (레슨 화면 → PassoffProgressProvider → API)", synced, state);
    const pending = await tab.eval(`localStorage.getItem('kig:passoff:pending:v1')`);
    check("D3c 기기의 보낼 목록이 비워짐", pending === "[]", pending);

    // D4 back to the list
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    const toast = await waitFor(tab, `[...document.querySelectorAll('[role=status]')].some(e => e.innerText.includes('TOPIC 2가 열렸어요.'))`, 6000);
    check("D4a 'TOPIC 2가 열렸어요.'", toast);
    const b0 = await tab.eval(SECTION(0));
    const b1 = await tab.eval(SECTION(1));
    const head = await tab.eval(HEAD);
    check("D4b TOPIC 1 '대주제 완료' · '완료' / TOPIC 2 '학습 가능'", /대주제 완료/.test(b0) && /완료/.test(b0) && /학습 가능/.test(b1) && !/잠금/.test(b1), { b0, b1 });
    check(`D4c 진도율 '3 / ${total}개 완료'(pg01-1 · pg01-2 는 서버에서 온 완료)`, head.includes(`3 / ${total}개 완료`), head);
    await sleep(5600); // the notice's five seconds — then it counts as said

    // D5 not again
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(800);
    const again = await tab.eval(`[...document.querySelectorAll('[role=status]')].some(e => e.innerText.includes('열렸어요'))`);
    check("D5 다시 열면 알림 없음", again === false);

    // D6 the lock screen, and a completion still on this device
    await tab.goto(BASE + "pg03-1", 2000);
    const lockText = await tab.eval(MAIN_TEXT);
    check("D6a pg03-1 잠금 화면 'TOPIC 2를 마치면 열려요' · 지금 대주제 TOPIC 2 · 아직 기록되지 않은 레슨 3", lockText.includes("순차 학습 잠금") && lockText.includes("TOPIC 2를 마치면 열려요") && lockText.includes(index.groups[1].label) && ["pg02-1", "pg02-2", "pg02-3"].every((id) => lockText.includes(titleOf(id))), lockText.slice(0, 200));
    check("D7a 잠금 화면: 가로 넘침 0 · 누를 곳 44px 미만 0", (await tab.eval(OVERFLOW)) === false && (await tab.eval(SMALL)).length === 0, await tab.eval(SMALL));
    if (BREAK !== "no-pending") {
      await tab.eval(`localStorage.setItem('kig:passoff:pending:v1', JSON.stringify(['pg02-1','pg02-2','pg02-3'].map((lessonId, i) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() + i, licence: ${JSON.stringify(licenseId)} })))), true`);
    }
    await tab.goto(BASE + "pg03-1", 500);
    const opened = await waitFor(tab, `${MAIN_TEXT}.includes('예문 떠올리기') && !${MAIN_TEXT}.includes('순차 학습 잠금')`, 12000);
    check("D6b 기기에 남은 완료(pg02-1~3)를 보내고 서버 답으로 레슨이 열림(router.refresh)", opened, (await tab.eval(MAIN_TEXT)).slice(0, 120));

    // D8 점검 6 — a page opened again while the server's answer is slow
    await tab.goto(ORIGIN + "/passoff-grammar", 2500); // the list asks once, so this device keeps the answer (TOPIC 3 open)
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    if (BREAK === "no-cache") await tab.eval(`Object.keys(localStorage).filter(k => k.startsWith('kig:passoff:answer:')).forEach(k => localStorage.removeItem(k)), true`);
    await tab.eval(`localStorage.setItem('drive:passoff-get-delay', '7000'), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 300);
    const early = await waitFor(tab, `(${SECTION(2)} || '').includes('학습 가능')`, 4000);
    const e2 = await tab.eval(SECTION(2));
    const syncing = (await tab.eval(MAIN_TEXT)).includes("진도를 서버와 맞추는 중");
    check("D8a 서버 답이 오기 전(7초 늦춤): 기기에 둔 지난 답으로 TOPIC 3 '학습 가능'(잠김으로 그리지 않음)", early && syncing && !/마치면 열림/.test(e2), { e2, syncing });
    await tab.eval(`Object.keys(localStorage).filter(k => k.startsWith('kig:passoff:answer:')).forEach(k => localStorage.removeItem(k)), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 300);
    const checking = await waitFor(tab, `(${SECTION(2)} || '').includes('진도 확인 중')`, 4000);
    const c2 = await tab.eval(SECTION(2));
    check("D8b 둔 답이 없는 기기: 서버 답 전에는 '진도 확인 중…' · '확인 중'(TOPIC 2~ 를 잠김으로 그리지 않음)", checking && /확인 중/.test(c2) && !/마치면 열림/.test(c2), c2);
    await tab.eval(`localStorage.removeItem('drive:passoff-get-delay'), true`);

    // D9 점검 1 — the owner resets this code; the same phone opens the list again
    const login = await tab.eval(`fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: ${JSON.stringify(sec.ADMIN_PIN)} }) }).then(r => r.json()).then(d => d.success)`);
    let reset = "skipped";
    if (BREAK !== "no-reset") {
      reset = await tab.eval(`fetch('/api/admin/passoff-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, action: 'reset' }) }).then(r => r.json()).then(d => d.progress.unlockedThrough + '/' + d.progress.completedLessons)`);
    }
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const r0 = await tab.eval(SECTION(0));
    const r1 = await tab.eval(SECTION(1));
    const rHead = await tab.eval(HEAD);
    const deviceStillHas = await tab.eval(`JSON.parse(localStorage.getItem('kig:progress:completed') || '{}')['passoff-grammar:pg01-3'] === true`);
    check(`D9a 초기화 뒤 같은 기기 목록 = 서버 기록: '0 / ${total}개 완료' · TOPIC 1 완료 0 · TOPIC 2 'TOPIC 1을 마치면 열림'(기기 기록 pg01-3 은 남아 있어도)`,
      login === true && rHead.includes(`0 / ${total}개 완료`) && !/개 완료/.test(r0.replace(/총 \d+개 레슨/, "")) && /TOPIC 1을 마치면 열림/.test(r1) && deviceStillHas,
      { reset, rHead, r0, r1, deviceStillHas });
    await tab.goto(BASE + "pg01-3", 1800);
    await tab.eval(clickTab(4));
    await waitFor(tab, `document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.includes('기록되지 않았어요')`, 6000);
    const view = await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.replace(/\\s+/g, ' ')`);
    check("D9b 끝낸 레슨 pg01-3 화면: '레슨 완료' 와 함께 '이 이용권의 진도에는 아직 이 레슨이 기록되지 않았어요'", view.includes("레슨 완료") && view.includes("기록되지 않았어요") && view.includes("처음부터 다시 하기"), view.slice(-160));
    await tab.goto(BASE + "pg02-1", 1800);
    const lock2 = await tab.eval(MAIN_TEXT);
    check("D9c 잠금 화면 pg02-1: 아직 기록되지 않은 레슨에 '3인칭 … 이 기기에서 마침' · 다시 하기 안내", lock2.includes("TOPIC 1을 마치면 열려요") && lock2.includes("아직 기록되지 않은 레슨") && lock2.includes("이 기기에서 마침") && lock2.includes("처음부터 다시 하기"), lock2.slice(0, 260));
    // the way back: 'start again' on pg01-3 and its five steps once more
    await tab.goto(BASE + "pg01-3", 1800);
    await tab.eval(`window.confirm = () => true, true`);
    await tab.eval(clickTab(4));
    await sleep(400);
    await tab.eval(clickIn(5, "처음부터 다시 하기"));
    await sleep(800);
    const redone = await finishSteps(tab, "pg01-3");
    const recorded = await waitFor(tab, `${API_GET}.then(d => Boolean(d.progress.lessons['pg01-3'] && d.progress.lessons['pg01-3'].completed))`);
    check("D9d '처음부터 다시 하기' 로 pg01-3 을 다시 마치면 서버에 기록됨", redone === true && recorded, { redone, recorded });

    // D10 점검 9 — the queue belongs to the licence each completion was finished under
    const QUEUE = `JSON.parse(localStorage.getItem('kig:passoff:pending:v1') || '[]')`;
    const other = BREAK === "same-licence" ? licenseId : "another-licence-on-this-device";
    await tab.eval(`localStorage.setItem('kig:passoff:pending:v1', JSON.stringify([
      { lessonId: 'pg01-1', clientUpdatedAt: Date.now(), licence: ${JSON.stringify(other)} },
      { lessonId: 'pg05-1', clientUpdatedAt: Date.now() + 1, licence: ${JSON.stringify(licenseId)} },
    ])), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const server10 = await tab.eval(`${API_GET}.then(d => ({ pg011: Boolean(d.progress.lessons['pg01-1']), pg051: Boolean(d.progress.lessons['pg05-1']), u: d.progress.unlockedThrough }))`);
    const queue1 = await tab.eval(QUEUE);
    const head10 = await tab.eval(HEAD);
    check("D10a 다른 이용권으로 끝낸 pg01-1 은 안 보냄(서버에 없음 · 대기열에 그대로)", !server10.pg011 && queue1.some((i) => i.lessonId === "pg01-1" && i.licence === other), { server10, queue1 });
    check(`D10b 대주제가 안 열린 pg05-1 은 서버가 거절 → 대기열에 '한 번 더' 표시 · 목록에 안 셈('1 / ${total}' — pg01-3 만)`,
      !server10.pg051 && queue1.some((i) => i.lessonId === "pg05-1" && i.refused === true) && head10.includes(`1 / ${total}개 완료`), { queue1, head10 });
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const queue2 = await tab.eval(QUEUE);
    check("D10c TOPIC 5 가 아직 잠긴 동안 pg05-1 은 기다림(다시 열어도 대기열에 그대로 · 안 보냄)", queue2.some((i) => i.lessonId === "pg05-1" && i.refused === true), queue2);
    // the owner opens TOPIC 5 by hand: the next answer shows it open, and the waiting completion goes once more
    const opened5 = await tab.eval(`fetch('/api/admin/passoff-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, action: 'setTopic', topic: 5 }) }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    const went = await waitFor(tab, `${API_GET}.then(d => Boolean(d.progress.lessons['pg05-1'] && d.progress.lessons['pg05-1'].completed))`, 8000);
    const queue3 = await tab.eval(QUEUE);
    check("D10d 관리자가 TOPIC 5 까지 열면 기다리던 pg05-1 이 서버에 기록되고 대기열에서 빠짐 · 다른 이용권 것은 그대로",
      opened5 === 5 && went && !queue3.some((i) => i.lessonId === "pg05-1") && queue3.some((i) => i.lessonId === "pg01-1"), { opened5, went, queue3 });

    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/502|Failed to load resource/.test(e));
    check("D7b 콘솔 오류 · 예외 0(음성 파일 502 제외)", errs.length === 0, errs.slice(0, 5));
  } finally {
    await tab.close();
    proc.kill();
    await sleep(800);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${results.length - bad.length}/${results.length} ok`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
