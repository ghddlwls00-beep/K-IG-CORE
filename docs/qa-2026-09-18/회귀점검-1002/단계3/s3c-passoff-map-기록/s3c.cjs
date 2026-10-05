// 회귀 점검 1002 단계 3 보충 2 (rc1002-s3c) — PASS-OFF TOPIC 1: pg01-2 · pg01-3 완료 전/뒤 상태 · 끝 칸 · 구성도 다시 채우기 끝까지
// 같은 AI 계열이 만들고 점검함 — 독립 검수 아님. 스크래치 대본(저장소 도구는 require 만 · 바꾸지 않음).
//   node s3c.cjs <state|endbar|map-desktop|map-mobile|map-reload> --port 9975 --out <jsonl> [--viewports desktop,mobile] [--label 완료 전]
// 읽기: GET /api/progress/passoff-grammar(요약만) · 기기의 학습 기록 요약(이용권 id · 토큰 · 쿠키 · 요청 본문 출력 0).
// 쓰기: map-* 모드의 '결과 보기'가 앱 스스로 보내는 POST /api/progress/passoff-grammar { mapRefillTopic: 1 } (+ 틀린 칸 강의의
//   복습 앞당기기 — POST /api/learning/passoff-grammar) 뿐. 모두 data-changes.jsonl 에 by "rc1002-s3c".
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
process.env.KIG_REPO = REPO;
const S = path.join(REPO, "docs/qa-2026-09-18/scripts");
const H = require(path.join(S, "lib/harness.cjs"));
const P = require(path.join(S, "lib/passoff-expect.cjs"));

const argv = process.argv.slice(2);
const MODE = argv[0];
const arg = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : d; };
const PORT = Number(arg("--port", 9975));
if (PORT < 9975 || PORT > 9979) { console.error("port 9975~9979 only"); process.exit(2); }
const OUTF = arg("--out", path.join(__dirname, `s3c-${MODE}.jsonl`));
const VIEWPORTS = arg("--viewports", "desktop,mobile").split(",");
const LABEL = arg("--label", "");
const CLONE = "rc1002-s3b"; // 앞 일꾼의 사본 그대로
const BY = "rc1002-s3c";
const COURSE = "passoff-grammar";
const tx = (s) => String(s || "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const FAKE = /\b(hows|whens|buts|wheres|saids|alway|untils|veries|ands|evens|withs|abouts|throughs|becauses|sinces|quicklies|nevers|wents|tooks|gots|whats|whos|whys)\b/i;
const NET_HOOK = `(() => { if (window.__s3bNet) return; window.__s3bNet = []; const of = window.fetch; window.fetch = function (input, init) { const url = typeof input === 'string' ? input : (input && input.url) || ''; const method = (init && init.method) || (input && input.method) || 'GET'; const p = of.apply(this, arguments); if (/\\/api\\//.test(url)) p.then((r) => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: r.status, t: Date.now() }), () => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: -1, t: Date.now() })); return p; }; })()`;

// topic 1 as the lesson files have it (title from the list; rule line + first ① sentence, drawn through the lesson's gloss).
// 고침(첫 실행 뒤): 앱(src/lib/passoffReview.ts passoffMapData)은 공개 레슨 파일(content/lessons)의 첫 anchors 문장을 쓴다 —
// 유료 보충(content/private … .paid.json)이 앞에 붙는 ① 첫 문장(pg01-1 'I have a nice family.')이 아님. 그래서 레슨 파일에서 읽음.
const T1 = ["pg01-1", "pg01-2", "pg01-3"].map((id) => {
  const e = P.expectedPassoff(id, { licensed: true });
  const L = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
  const first = L.blocks.find((b) => b.type === "anchors").items[0];
  return { id, rule: tx(e.gloss(e.rule.title)), sentence: tx(e.gloss(first.en)), sentenceRaw: first.en, firstSeenInStep1: e.anchors[0].en };
});
const PLANS = arg("--plans", null);
const TITLES = { "pg01-1": "1인칭", "pg01-2": "2인칭", "pg01-3": "3인칭" };

const rows = [];
function row(r) { rows.push(r); fs.appendFileSync(OUTF, JSON.stringify({ at: new Date().toISOString(), ...r }) + "\n"); console.log(`${r.verdict.padEnd(7)} ${r.viewport} · ${r.screen} · ${r.what} — ${String(r.saw).slice(0, 400)}`); }

async function freeMemOk() {
  const { execFileSync } = require("child_process");
  for (;;) {
    const kb = Number(execFileSync("powershell.exe", ["-NoProfile", "-Command", "(Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory"], { encoding: "utf8" }).trim());
    if (kb / 1024 / 1024 >= 0.9) { console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB`); return; }
    console.log(`free memory ${(kb / 1024 / 1024).toFixed(2)} GB < 0.9 — waiting 60 s`);
    await H.sleep(60000);
  }
}

async function progressGet(tab) {
  return await tab.eval(`fetch('/api/progress/passoff-grammar', { credentials: 'same-origin', cache: 'no-store' }).then(async (r) => {
    if (!r.ok) return { status: r.status };
    const b = await r.json(); const p = b.progress || {};
    const lessons = p.lessons || {};
    const done = Object.keys(lessons).filter((k) => lessons[k] && lessons[k].completed);
    const t1 = (p.topics || []).find((t) => t.topic === 1) || null;
    const t2 = (p.topics || []).find((t) => t.topic === 2) || null;
    return { status: r.status, completed: done, everyTopicOpen: p.everyTopicOpen, mapRefillRequired: p.mapRefillRequired,
      topic1: t1 && { completedCount: t1.completedCount, requiredCount: t1.requiredCount, lastLessonCompleted: t1.lastLessonCompleted, mapRefilled: t1.mapRefilled, unlocked: t1.unlocked },
      topic2: t2 && { unlocked: t2.unlocked, mapRefilled: t2.mapRefilled, completedCount: t2.completedCount } };
  }).catch((e) => ({ status: -1, error: String(e) }))`).catch((e) => ({ error: e.message }));
}

const RECORD = `(() => {
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('kig-learning:passoff-grammar'));
  return keys.map((k) => { let r = null; try { r = JSON.parse(localStorage.getItem(k)); } catch (e) {}
    if (!r) return { which: k.includes('@') ? 'licence' : 'free', parsed: false };
    const items = Object.entries(r.items || {});
    const byLesson = {}; const due = {}; let wrong = 0, lapses = 0;
    for (const [key, s] of items) { byLesson[s.lessonId] = (byLesson[s.lessonId] || 0) + 1; due[s.dueDay] = (due[s.dueDay] || 0) + 1; if (s.lastCorrect === false) wrong++; if (s.lapses > 0) lapses++; }
    const logBy = {}; for (const l of r.log || []) { const kk = (l.where || '?') + ':' + (l.effect || '?'); logBy[kk] = (logBy[kk] || 0) + 1; }
    return { which: k.includes('@') ? 'licence' : 'free', lessons: Object.fromEntries(Object.entries(r.lessons || {}).map(([id, v]) => [id, v && v.day])), items: items.length, byLesson, dueDays: due, wrongNow: wrong, withLapses: lapses, log: (r.log || []).length, logBy, lastStudyDay: r.lastStudyDay || null };
  });
})()`;

async function page(tab, url, viewport) {
  await H.setViewport(tab, viewport);
  const ld = await H.load(tab, url, { marker: null });
  await H.waitFor(tab, `(() => { const m = document.querySelector('main'); return !!m && !/불러오고 있어요/.test(m.innerText || '') && (m.innerText || '').length > 40; })()`, 15000);
  await H.sleep(3000);
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  return { ld, snap, text: snap ? tx(snap.text) : "" };
}
function romanAll(text) {
  const out = [];
  for (const k of ["passoff-grammar/__none__", "passoff-grammar/pg01-1", "passoff-grammar/pg01-2", "passoff-grammar/pg01-3"]) for (const h of P.romanOnScreen(k, text)) if (!out.some((o) => o.text === h.text)) out.push(h);
  return out;
}
function common(name, viewport, snap, tab) {
  const ev = H.events(tab);
  const roman = snap ? romanAll(snap.text) : [];
  const fake = snap ? (snap.text.match(FAKE) || []) : [];
  const bad = ev.badResponses || [];
  row({ viewport, screen: name, what: "4xx/5xx · 콘솔 오류 · 예외 · 넘침 · 오류 화면", expect: "모두 0", saw: `4xx/5xx ${bad.length}${bad.length ? " " + bad.slice(0, 3).map((r) => `${r.status} ${String(r.url).replace(H.BASE, "")}`).join(" · ") : ""} · 콘솔 ${ev.console.length}${ev.console.length ? " " + JSON.stringify(ev.console.slice(0, 2)).slice(0, 200) : ""} · 예외 ${ev.exceptions.length}${ev.exceptions.length ? " " + String(ev.exceptions[0]).slice(0, 160) : ""} · 넘침 ${snap && snap.overflowX} · 오류 화면 ${snap && snap.errorScreen} · 새 글(undefined 등) ${snap && snap.leak}`, verdict: !bad.length && !ev.exceptions.length && snap && !snap.overflowX && !snap.errorScreen && !snap.leak ? (ev.console.length ? "INFO" : "PASS") : "FAIL" });
  row({ viewport, screen: name, what: "로마자 한국어 낱말 · 'Busan(부산)' 꼴 · 가짜 낱말(whens 등)", expect: "0", saw: `로마자 ${roman.length}${roman.length ? " " + roman.slice(0, 2).map((r) => r.text).join(" · ") : ""} · 가짜 낱말 ${fake.length}${fake.length ? " " + fake.join(",") : ""}`, verdict: roman.length || fake.length ? "FAIL" : "PASS" });
}

const LIST_INFO = `(() => { const m = document.querySelector('main'); const t = (m.innerText || '').replace(/\\s+/g, ' ');
  const pr = t.match(/학습 진도율[^%]{0,40}%?\\)?/); const s0 = document.querySelector('#section-0');
  const mr = document.querySelector('[data-passoff-map-row="1"]'); const mn = document.querySelector('[data-passoff-map-next]');
  const rowOf = (id) => { const a = document.querySelector('main a[href="/passoff-grammar/' + id + '"]'); const li = a && (a.closest('li') || a); return li ? li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 80) : null; };
  return { progressLine: pr ? pr[0] : null, topic1: s0 ? s0.innerText.replace(/\\s+/g, ' ').trim().slice(0, 260) : null,
    rows: { 'pg01-1': rowOf('pg01-1'), 'pg01-2': rowOf('pg01-2'), 'pg01-3': rowOf('pg01-3') },
    mapRow: mr ? { text: mr.innerText.replace(/\\s+/g, ' ').trim(), waiting: mr.hasAttribute('data-passoff-map-row-waiting'), href: (mr.querySelector('a') || {}).getAttribute ? mr.querySelector('a').getAttribute('href') : null } : null,
    mapNext: mn ? mn.innerText.replace(/\\s+/g, ' ').trim() : null }; })()`;

async function readState(tab, viewport, label) {
  const L = await page(tab, "/passoff-grammar", viewport);
  await tab.eval(`(() => { for (const b of document.querySelectorAll('main [id^="section-"] > button[aria-expanded="false"]')) b.click(); })()`).catch(() => {});
  await H.sleep(800);
  const list = await tab.eval(LIST_INFO).catch((e) => ({ error: e.message }));
  const prog = await progressGet(tab);
  const rec = await tab.eval(RECORD).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "목록 /passoff-grammar", what: `${label}: 진행률 · TOPIC 1 · 강의 줄 · 구성도 입구`, expect: "—", saw: JSON.stringify(list), verdict: "INFO" });
  row({ viewport, screen: "GET /api/progress/passoff-grammar", what: `${label}: 서버 진도(읽기만)`, expect: "—", saw: JSON.stringify(prog), verdict: "INFO" });
  row({ viewport, screen: "기기 학습 기록(서버에서 받은 사본)", what: `${label}: 요약(읽기만)`, expect: "—", saw: JSON.stringify(rec), verdict: "INFO" });
  common("목록", viewport, L.snap, tab);
  const M = await page(tab, "/passoff-grammar/map?topic=1", viewport);
  const mi = await tab.eval(`(() => { const m = document.querySelector('main'); return { stage: (document.querySelector('[data-passoff-map-stage]') || {}).dataset ? (document.querySelector('[data-passoff-map-stage]') || { dataset: {} }).dataset.passoffMapStage || null : null, waiting: !!document.querySelector('[data-passoff-map-waiting]'), text: (m.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 500) }; })()`).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "구성도 /passoff-grammar/map?topic=1", what: `${label}: 구성도 화면(열기만)`, expect: "—", saw: JSON.stringify(mi), verdict: "INFO" });
  common("구성도(열기)", viewport, M.snap, tab);
  return { list, prog, rec, mi };
}

// ── the map refill ──
const MAP = `(() => { const st = document.querySelector('[data-passoff-map-stage]'); if (!st) return null; const T = (e) => (e.innerText || '').replace(/\\s+/g, ' ').trim();
  const btn = (re) => [...st.querySelectorAll('button')].find((b) => re.test(T(b)));
  const nx = btn(/^(다음|다음 칸|결과 보기)$/);
  return { stage: st.dataset.passoffMapStage, box: st.dataset.passoffMapBox || null, h2: (st.querySelector('h2') || {}).innerText || null,
    focus: document.activeElement ? (document.activeElement.tagName + ':' + T(document.activeElement).slice(0, 30)) : null,
    progress: (st.querySelector('[role=progressbar]') ? st.querySelector('[role=progressbar]').getAttribute('aria-valuenow') + '/' + st.querySelector('[role=progressbar]').getAttribute('aria-valuemax') : null),
    boxes: [...st.querySelectorAll('ol[aria-label="구성도 칸"] button')].map((b) => b.getAttribute('aria-label')),
    chips: [...st.querySelectorAll('[aria-label="강의 칩"] button')].map(T),
    rules: [...st.querySelectorAll('[role=group][aria-labelledby="map-rule"] button')].map((b) => ({ t: T(b), on: b.getAttribute('aria-pressed') === 'true' })),
    sentences: [...st.querySelectorAll('[role=group][aria-labelledby="map-sentence"] button')].map((b) => ({ t: T(b), on: b.getAttribute('aria-pressed') === 'true', lang: b.getAttribute('lang') })),
    next: nx ? { t: T(nx), disabled: nx.disabled } : null,
    results: [...st.querySelectorAll('[data-passoff-map-result]')].map((li) => ({ r: li.dataset.passoffMapResult, t: T(li) })),
    status: (st.querySelector('section [role=status]') || {}).innerText || null,
    saved: st.querySelector('[data-passoff-map-saved]') ? T(st.querySelector('[data-passoff-map-saved]')) : null,
    notTaken: st.querySelector('[data-passoff-map-not-taken]') ? T(st.querySelector('[data-passoff-map-not-taken]')) : null,
    alert: st.querySelector('[role=alert]') ? T(st.querySelector('[role=alert]')) : null,
    forward: st.querySelector('[data-passoff-map-forward]') ? T(st.querySelector('[data-passoff-map-forward]')) : null,
    saving: /기록하고 있어요/.test(T(st)),
    audioControls: [...document.querySelectorAll('main button')].filter((b) => /듣기|재생|소리/.test((b.getAttribute('aria-label') || '') + T(b))).length,
    inputs: document.querySelectorAll('main input:not([type=hidden]), main textarea').length,
    text: T(st).slice(0, 700) }; })()`;
const readMap = (tab) => tab.eval(MAP).catch((e) => ({ error: e.message }));
const clickIn = (tab, sel, text) => H.click(tab, `[...document.querySelectorAll(${JSON.stringify(sel)})].find((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)})`, { settle: 350 });
const chip = (tab, title) => clickIn(tab, '[data-passoff-map-stage] [aria-label="강의 칩"] button', title);
const boxBtn = (tab, i) => H.click(tab, `document.querySelectorAll('[data-passoff-map-stage] ol[aria-label="구성도 칸"] button')[${i}]`, { settle: 350 });
const pickRule = (tab, lessonId) => clickIn(tab, '[data-passoff-map-stage] [role=group][aria-labelledby="map-rule"] button', T1.find((l) => l.id === lessonId).rule);
const pickSentence = (tab, lessonId) => clickIn(tab, '[data-passoff-map-stage] [role=group][aria-labelledby="map-sentence"] button', T1.find((l) => l.id === lessonId).sentence);
const press = (tab, text) => clickIn(tab, '[data-passoff-map-stage] button, [data-passoff-map-stage] a', text);

async function mapLayout(tab, viewport, where, rec) {
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  const small = await tab.eval(`[...document.querySelectorAll('[data-passoff-map-stage] button, [data-passoff-map-stage] a[href]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44); }).map((e) => (e.innerText || e.getAttribute('aria-label') || '').replace(/\\s+/g, ' ').trim().slice(0, 30) + ' ' + Math.round(e.getBoundingClientRect().width) + 'x' + Math.round(e.getBoundingClientRect().height))`).catch(() => []);
  rec.push({ where, overflowX: snap && snap.overflowX, leak: snap && snap.leak, errorScreen: snap && snap.errorScreen, clipped: snap && snap.clippedText, small, text: snap ? snap.text : "" });
  return snap;
}

/**
 * plan: "wrong"  — 칸 1 에 2인칭 · 칸 2 에 1인칭(뒤바꿈) · 칸 2 의 대표 문장은 3인칭 것(틀림) · 칸 3 맞음 → 1/3, 틀린 칸 강의 1인칭 · 2인칭
 *                  (도중에: 놓은 칸 눌러 빼기 · '다음 칸' 이 고르기 전 꺼짐 · '이전' 으로 돌아가 고른 것 남는지)
 *       "right"  — 모두 맞음 → 3/3
 */
async function mapRun(tab, viewport, plan) {
  const screen = `구성도 다시 채우기(${plan === "wrong" ? "틀린 답 섞기" : "모두 맞는 답"})`;
  const layouts = [];
  await tab.eval("window.__s3bNet && (window.__s3bNet.length = 0)").catch(() => {});
  await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  let s = await readMap(tab);
  const placeOk = s && s.stage === "place" && s.boxes.length === 3 && s.boxes.every((b) => /비어 있음/.test(b)) && s.chips.length === 3 && s.next && s.next.disabled;
  const chipOrder = s ? s.chips.join(" · ") : "";
  row({ viewport, screen, what: "처음: 빈 칸 3 · 강의 칩 3(강의 순서와 다름) · '다음' 꺼짐 · 입력 칸 0 · 소리 단추 0", expect: "그대로", saw: JSON.stringify({ boxes: s && s.boxes, chips: s && s.chips, next: s && s.next, progress: s && s.progress, inputs: s && s.inputs, audioControls: s && s.audioControls, h1: s && s.text.slice(0, 60) }), verdict: placeOk && chipOrder !== "1인칭 · 2인칭 · 3인칭" ? "PASS" : "FAIL" });
  await mapLayout(tab, viewport, "놓기(처음)", layouts);
  const order = plan === "wrong" ? ["pg01-2", "pg01-1", "pg01-3"] : ["pg01-1", "pg01-2", "pg01-3"];
  await chip(tab, TITLES[order[0]]);
  await chip(tab, TITLES[order[1]]);
  if (plan === "wrong") {
    // take box 2 out by pressing it, then put it back
    s = await readMap(tab);
    const before = s.boxes[1];
    await boxBtn(tab, 1);
    const sOut = await readMap(tab);
    row({ viewport, screen, what: "놓은 칸 2 를 누름 → 빠짐 · 칩이 돌아옴", expect: "칸 2 비어 있음 · 칩에 다시 보임", saw: `${before} → ${sOut.boxes[1]} · 칩 ${sOut.chips.join(" · ")}`, verdict: /비어 있음/.test(sOut.boxes[1]) && sOut.chips.includes(TITLES[order[1]]) ? "PASS" : "FAIL" });
    await chip(tab, TITLES[order[1]]);
  }
  await chip(tab, TITLES[order[2]]);
  s = await readMap(tab);
  const placedOk = s.boxes.every((b, i) => b.includes(TITLES[order[i]])) && s.chips.length === 0 && s.next && !s.next.disabled;
  row({ viewport, screen, what: `강의 놓기: ${order.map((id) => TITLES[id]).join(" → ")}`, expect: "칸 1~3 에 놓임 · 칩 0 · '다음' 켜짐", saw: JSON.stringify({ boxes: s.boxes, chips: s.chips, next: s.next, progress: s.progress }), verdict: placedOk ? "PASS" : "FAIL" });
  await press(tab, "다음");
  // box by box
  for (let box = 0; box < 3; box++) {
    s = await readMap(tab);
    const placed = order[box];
    const head = s && s.stage === "pick" && String(s.box) === String(box + 1) && (s.h2 || "").includes(TITLES[placed]);
    const ruleSet = s ? s.rules.map((r) => r.t) : [];
    const sentSet = s ? s.sentences.map((r) => r.t) : [];
    const rulesOk = T1.every((l) => ruleSet.includes(l.rule)) && ruleSet.length === 3;
    const sentsOk = T1.every((l) => sentSet.includes(l.sentence)) && sentSet.length === 3 && s.sentences.every((x) => x.lang === "en");
    row({ viewport, screen, what: `칸 ${box + 1} 화면: 머리 '${box + 1}. ${TITLES[placed]}' · 문법 설명 3 · 대표 문장 3(레슨 글 그대로 · 한국어 낱말은 한글) · 고르기 전 '${box < 2 ? "다음 칸" : "결과 보기"}' 꺼짐 · 머리에 초점`,
      expect: "그대로", saw: JSON.stringify({ h2: s && s.h2, focus: s && s.focus, progress: s && s.progress, rules: ruleSet, sentences: sentSet, next: s && s.next }),
      verdict: head && rulesOk && sentsOk && s.next && s.next.disabled && /^H2/.test(s.focus || "") ? "PASS" : "FAIL" });
    await mapLayout(tab, viewport, `칸 ${box + 1}`, layouts);
    const ruleFor = placed;
    const sentFor = plan === "wrong" && box === 1 ? "pg01-3" : placed;
    await pickRule(tab, ruleFor);
    const s1 = await readMap(tab);
    const halfOff = s1.next && s1.next.disabled;
    await pickSentence(tab, sentFor);
    s = await readMap(tab);
    row({ viewport, screen, what: `칸 ${box + 1}: 문법 설명 '${T1.find((l) => l.id === ruleFor).rule}' · 대표 문장 '${T1.find((l) => l.id === sentFor).sentence}'${sentFor !== placed ? " (일부러 틀림)" : ""}`,
      expect: "누른 것만 눌림 표시 · 하나만 고르면 아직 꺼짐 · 둘 다 고르면 켜짐", saw: JSON.stringify({ rulesOn: s.rules.filter((r) => r.on).map((r) => r.t), sentencesOn: s.sentences.filter((r) => r.on).map((r) => r.t), afterOne: s1.next, afterTwo: s.next }),
      verdict: halfOff && s.next && !s.next.disabled && s.rules.filter((r) => r.on).length === 1 && s.sentences.filter((r) => r.on).length === 1 && s.rules.find((r) => r.on).t === T1.find((l) => l.id === ruleFor).rule && s.sentences.find((r) => r.on).t === T1.find((l) => l.id === sentFor).sentence ? "PASS" : "FAIL" });
    if (plan === "wrong" && box === 1) {
      await press(tab, "이전");
      const back = await readMap(tab);
      const kept = back.stage === "pick" && String(back.box) === "1" && back.rules.some((r) => r.on && r.t === T1.find((l) => l.id === order[0]).rule) && back.sentences.some((r) => r.on && r.t === T1.find((l) => l.id === order[0]).sentence);
      row({ viewport, screen, what: "칸 2 에서 '이전' → 칸 1 · 고른 것 남음 → '다음 칸' 으로 칸 2(고른 것 남음)", expect: "그대로", saw: JSON.stringify({ box: back.box, h2: back.h2, rulesOn: back.rules.filter((r) => r.on).map((r) => r.t), sentencesOn: back.sentences.filter((r) => r.on).map((r) => r.t) }), verdict: kept ? "PASS" : "FAIL" });
      await press(tab, "다음 칸");
      const again = await readMap(tab);
      row({ viewport, screen, what: "다시 칸 2", expect: "칸 2 · 고른 것 남음", saw: JSON.stringify({ box: again.box, rulesOn: again.rules.filter((r) => r.on).length, sentencesOn: again.sentences.filter((r) => r.on).length }), verdict: String(again.box) === "2" && again.rules.some((r) => r.on) && again.sentences.some((r) => r.on) ? "PASS" : "FAIL" });
    }
    if (box < 2) await press(tab, "다음 칸");
  }
  const tPress = Date.now();
  const pr = await press(tab, "결과 보기");
  let r = null;
  for (let k = 0; k < 60; k++) { r = await readMap(tab); if (r && r.stage === "result" && !r.saving) break; await H.sleep(250); }
  const net = ((await tab.eval("window.__s3bNet || []").catch(() => [])) || []).map((x) => `${x.method} ${x.path} ${x.status} +${x.t - tPress}ms`);
  // 기록은 실제로 결과 화면에 닿았거나 저장 요청이 나갔을 때만
  if ((r && r.stage === "result") || net.some((x) => /^POST /.test(x))) H.logDataChange({ course: COURSE, id: "map?topic=1", action: `rc1002-s3c: PASS-OFF TOPIC 1 '구성도 다시 채우기' 결과 보기(${viewport} · ${plan === "wrong" ? "틀린 답 섞기 — 칸 1 · 2 틀림 → 틀린 칸 강의 1인칭 · 2인칭 문항을 복습에 앞당김(내일부터)" : "모두 맞음"}) — 서버 진도에 TOPIC 1 구성도 다시 채우기 기록(POST mapRefillTopic 1 · 되돌릴 길 없음)`, by: BY, detail: `눌림 ${pr.ok} · ${net.join(" · ")}` });
  await mapLayout(tab, viewport, "결과", layouts);
  const wantRight = plan === "wrong" ? 1 : 3;
  const resOk = r && r.stage === "result" && new RegExp(`칸 3개 중 ${wantRight}개를 맞혔어요`).test(r.text) && r.results.length === 3 &&
    (plan === "wrong"
      ? r.results[0].r === "missed" && /놓은 강의: 2인칭/.test(r.results[0].t) && !/문법 설명|대표 문장/.test(r.results[0].t)
        && r.results[1].r === "missed" && /놓은 강의: 1인칭/.test(r.results[1].t) && r.results[1].t.includes(`1인칭의 대표 문장: ${T1[0].sentence}`) && !/문법 설명/.test(r.results[1].t)
        && r.results[2].r === "ok"
      : r.results.every((x) => x.r === "ok"));
  row({ viewport, screen, what: `결과(칸마다 맞음/틀림 · 틀린 칸은 놓은 강의 · 바른 문장)`, expect: plan === "wrong" ? "1/3 · 칸 1 '놓은 강의: 2인칭' · 칸 2 '놓은 강의: 1인칭' + '1인칭의 대표 문장: I have a nice family.' · 칸 3 맞음" : "3/3 · 모두 맞음", saw: JSON.stringify({ text: r && r.text.slice(0, 400), results: r && r.results, focus: r && r.focus }), verdict: resOk ? "PASS" : "FAIL" });
  const saveOk = r && r.saved === "기록했어요." && !r.notTaken && !r.alert &&
    net.some((x) => /^POST \/api\/progress\/passoff-grammar 200/.test(x)) && !net.some((x) => / (4|5)\d\d /.test(x) || / -1 /.test(x));
  row({ viewport, screen, what: "기록(서버) · 저장 요청 상태", expect: "'기록했어요.'(모든 대주제가 열린 이용권이라 '열렸어요' 없음) · POST progress 200", saw: JSON.stringify({ saved: r && r.saved, notTaken: r && r.notTaken, alert: r && r.alert, net }), verdict: saveOk ? "PASS" : "FAIL" });
  if (plan === "wrong") {
    const fwd = r && r.forward;
    row({ viewport, screen, what: "틀린 칸 강의 복습 안내", expect: "'틀린 칸의 강의(1인칭 · 2인칭) …' 줄 + POST /api/learning 200", saw: JSON.stringify({ forward: fwd, learningPosts: net.filter((x) => /learning/.test(x)) }), verdict: fwd && /1인칭 · 2인칭/.test(fwd) && net.some((x) => /^POST \/api\/learning\/passoff-grammar 200/.test(x)) ? "PASS" : "FAIL" });
  } else {
    row({ viewport, screen, what: "모두 맞으면 복습 안내 없음", expect: "안내 줄 없음", saw: JSON.stringify({ forward: r && r.forward }), verdict: r && !r.forward ? "PASS" : "FAIL" });
  }
  const audio = ((await H.audioLog(tab).catch(() => [])) || []).filter((e) => e.ev === "play()" || e.ev === "tts.speak");
  // 첫 손짓의 소리 길 깨우기(src/lib/speech.ts unlockMobileAudio — 소리 없는 SILENT_WAV data: · 빈 글 ' ' 의 tts)는 소리가 아님
  const warm = (e) => (e.ev === "play()" && /^data:/.test(e.src || "")) || (e.ev === "tts.speak" && !(e.text || "").trim());
  const real = audio.filter((e) => !warm(e));
  row({ viewport, screen, what: "소리", expect: "구성도에는 소리 단추가 없음(설계) · 저절로 나는 소리 0(첫 손짓의 소리 없는 깨우기는 셈 안 함)", saw: `소리 단추 ${r && r.audioControls} · 재생 요청 ${audio.length}${audio.length ? " " + JSON.stringify(audio.map((e) => ({ ev: e.ev, src: String(e.src || "").slice(0, 40), text: e.text }))) : ""} · 깨우기 뺀 실제 ${real.length}`, verdict: r && r.audioControls === 0 && !real.length ? "NA" : "FAIL" });
  row({ viewport, screen, what: "한글로 쓴 답", expect: "구성도는 누르기만(입력 칸 0) — 쓸 칸 없음. 한국어 낱말이 든 문장(3인칭 'He is 대한.')은 한글로 그려짐", saw: `입력 칸 ${r && r.inputs} · 3인칭 대표 문장 보기 '${T1[2].sentence}' (레슨 원문 '${T1[2].sentenceRaw}')`, verdict: r && r.inputs === 0 && T1[2].sentence.includes("대한") ? "NA" : "FAIL" });
  // layouts
  const lb = layouts.filter((l) => l.overflowX || l.leak || l.errorScreen || (l.clipped || []).length);
  row({ viewport, screen, what: `화면 ${layouts.length}곳(${layouts.map((l) => l.where).join(" · ")}): 넘침 · 잘린 글 · 새 글 · 오류 화면 · 44px 미만 누를 것`, expect: "0", saw: `${lb.length ? lb.map((l) => `${l.where}: 넘침 ${l.overflowX} · 잘림 ${(l.clipped || []).join(",")} · 새 글 ${l.leak}`).join(" / ") : "0"} · 작은 누를 것 ${JSON.stringify(layouts.filter((l) => l.small.length).map((l) => `${l.where}: ${l.small.slice(0, 3).join(", ")}`))}`, verdict: lb.length ? "FAIL" : layouts.some((l) => l.small.length) ? "INFO" : "PASS" });
  const allText = layouts.map((l) => l.text).join("\n");
  common(screen, viewport, { text: allText, overflowX: layouts.some((l) => l.overflowX), errorScreen: layouts.some((l) => l.errorScreen), leak: (layouts.find((l) => l.leak) || {}).leak || null }, tab);
  return r;
}

async function mapMode(tab, viewport, plans) {
  await H.setViewport(tab, viewport);
  await H.load(tab, "/passoff-grammar/map?topic=1", { marker: null });
  await H.waitFor(tab, `!!document.querySelector('[data-passoff-map-stage], [data-passoff-map-waiting], [data-passoff-map-note]')`, 15000);
  await H.sleep(2000);
  const first = await readMap(tab);
  if (!first) {
    const t = await tab.eval(`(document.querySelector('main') || {}).innerText || ''`).catch(() => "");
    row({ viewport, screen: "구성도", what: "열기", expect: "놓기 화면", saw: tx(t).slice(0, 300), verdict: "BLOCKED" });
    return;
  }
  const h = await tab.eval(`({ h1: (document.querySelector('h1') || {}).innerText, label: ((document.querySelector('main header p') || {}).innerText || '') })`).catch(() => ({}));
  row({ viewport, screen: "구성도", what: "열기(강의 다 마친 뒤)", expect: "'구성도 다시 채우기' · 'TOPIC 1. 인칭' · 놓기 화면", saw: JSON.stringify(h), verdict: /구성도 다시 채우기/.test(h.h1 || "") && /TOPIC 1/.test(h.label || "") ? "PASS" : "FAIL" });
  for (let i = 0; i < plans.length; i++) {
    if (i > 0) {
      await press(tab, "다시 하기");
      const s = await readMap(tab);
      row({ viewport, screen: "구성도 다시 채우기", what: "'다시 하기'", expect: "놓기 화면 · 빈 칸 3 · 칩 3", saw: JSON.stringify({ stage: s && s.stage, boxes: s && s.boxes, chips: s && s.chips, focus: s && s.focus }), verdict: s && s.stage === "place" && s.boxes.every((b) => /비어 있음/.test(b)) && s.chips.length === 3 ? "PASS" : "FAIL" });
    }
    await mapRun(tab, viewport, plans[i]);
    const prog = await progressGet(tab);
    row({ viewport, screen: "GET /api/progress/passoff-grammar", what: `구성도 ${plans[i]} 뒤 서버 진도(읽기만)`, expect: "topic1.mapRefilled true", saw: JSON.stringify(prog), verdict: prog && prog.topic1 && prog.topic1.mapRefilled === true ? "PASS" : "FAIL" });
  }
  const rec = await tab.eval(RECORD).catch((e) => ({ error: e.message }));
  row({ viewport, screen: "기기 학습 기록(사본)", what: "구성도 뒤 요약(읽기만)", expect: "—", saw: JSON.stringify(rec), verdict: "INFO" });
}

async function mapReload(tab, viewport) {
  // after the map: the map page afresh (this device's storage cleared), the server's record, the list's entry
  await H.setViewport(tab, viewport);
  const M = await page(tab, "/passoff-grammar/map?topic=1", viewport);
  const s = await readMap(tab);
  row({ viewport, screen: "구성도(새로고침 — 저장소 비운 새 쪽)", what: "다 채운 뒤 다시 열기", expect: "구성도를 다시 할 수 있음(놓기 화면 — 설계: 기록은 목록 '마침'과 서버에)", saw: JSON.stringify({ stage: s && s.stage, boxes: s && s.boxes, text: s && s.text.slice(0, 200) }), verdict: s && s.stage === "place" ? "INFO" : "FAIL" });
  common("구성도(새로고침)", viewport, M.snap, tab);
  const st = await readState(tab, viewport, "구성도 뒤 새로고침");
  const ok = st.prog && st.prog.topic1 && st.prog.topic1.mapRefilled === true && st.list && st.list.mapRow && /마침/.test(st.list.mapRow.text) && !st.list.mapRow.waiting;
  row({ viewport, screen: "목록 구성도 입구 + 서버", what: "구성도 뒤 새로고침에도 유지", expect: "목록 '구성도 다시 채우기 대주제 끝 마침' · GET mapRefilled true", saw: JSON.stringify({ mapRow: st.list && st.list.mapRow, mapNext: st.list && st.list.mapNext, topic1: st.prog && st.prog.topic1 }), verdict: ok ? "PASS" : "FAIL" });
}

async function endbar(tab, viewport) {
  const END = `(() => { const s = document.querySelector('main section[aria-label="강의 마치기"]'); if (!s) return null; return (s.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 200); })()`;
  for (const id of ["pg01-2", "pg01-3"]) {
    await H.setViewport(tab, viewport);
    await H.load(tab, `/passoff-grammar/${id}`, { marker: H.MARKERS["passoff-grammar"] });
    await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000);
    const seen = [];
    for (const t of [3, 8]) { await H.sleep(t === 3 ? 3000 : 5000); seen.push(`${t}s: ${await tab.eval(END).catch(() => null)}`); }
    row({ viewport, screen: `강의 ${id}(저장소 비운 새 쪽으로 직접 열기)`, what: "완료한 강의의 끝 칸(3 · 8초)", expect: "'학습 완료함'(서버 완료) — 앞 일꾼 틀림 1 이 같은지", saw: seen.join(" ┃ "), verdict: seen.some((x) => /학습 완료함/.test(x)) ? "PASS" : "FAIL" });
    common(`강의 ${id}(끝 칸)`, viewport, await tab.eval(H.SNAPSHOT).catch(() => null), tab);
  }
}

(async () => {
  await freeMemOk();
  const browser = await H.startBrowser(CLONE, PORT);
  let tab;
  try {
    tab = await H.openTab(browser, { clean: true });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: NET_HOOK });
    if (MODE === "state") { for (const vp of VIEWPORTS) await readState(tab, vp, LABEL || "상태"); }
    else if (MODE === "endbar") { for (const vp of VIEWPORTS) await endbar(tab, vp); }
    else if (MODE === "map-desktop") await mapMode(tab, "desktop", PLANS ? PLANS.split(",") : ["wrong", "right"]);
    else if (MODE === "map-mobile") await mapMode(tab, "mobile", PLANS ? PLANS.split(",") : ["right"]);
    else if (MODE === "map-reload") { for (const vp of VIEWPORTS) await mapReload(tab, vp); }
    else { console.error("mode?"); process.exit(2); }
  } finally {
    if (tab) await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const t = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
  console.log("끝:", JSON.stringify(t));
})();
