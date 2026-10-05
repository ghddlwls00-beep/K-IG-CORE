// fix2-app 화면 확인 — 로컬 무료 강의(BASE, 기본 http://localhost:3341) · 이용권 없음 · 이 기기 기록만 바뀜.
//   P1 PASS-OFF 무료 복습 끝 화면 '오늘 더 할 수 있는 문항 N' = 다시 열었을 때의 복습 수 · 목록 '오늘 복습' 줄
//   P5 다시 풀기 영작의 '낱말의 첫 글자'(pg01-1:p13 'I live in Seoul.' → 'I l___ i_ 서울.')
//   P4 LISTENING d001-1 · READING pr001-1 완료 → 목록 진행률 · 본 강의 줄 / 본 쪽에서 취소 → 둘 다 풀림 / 옛 '-1' 만 기록도 셈
// 화면 둘(데스크톱 · 휴대폰). 같은 AI 계열 — 독립 검수 아님.
const path = require("path");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const { load } = require("./tsreq.cjs");
const BASE = process.env.BASE || "http://localhost:3341";
const PORT = Number(process.env.PORT || 9941);
const OUT = path.join(__dirname, "screen-fix2-app.jsonl");
fs.writeFileSync(OUT, "");
const rows = [];
const row = (viewport, what, ok, saw) => {
  const r = { viewport, what, verdict: ok ? "PASS" : "FAIL", saw };
  rows.push(r);
  fs.appendFileSync(OUT, JSON.stringify(r) + "\n");
  console.log(`${r.verdict}  ${viewport} · ${what} — ${typeof saw === "string" ? saw : JSON.stringify(saw)}`);
};

const engine = load("src/lib/learning/engine.ts");
function seedRecord() {
  // 5일 전에 마친 무료 강의 두 개의 문항 13개 — 사흘 넘게 쉼 → 오늘 계획은 '복습 10개부터'(10) · 3개는 오늘 더 남음
  const at = Date.now() - 5 * 86_400_000;
  const r = engine.emptyRecord("passoff-grammar");
  engine.applyLessonDone(r, "pg01-1", at, [
    ...["p13", "p9", "p10", "p11", "p12", "p14"].map((id) => ({ key: `pg01-1:${id}`, kind: "produce" })),
    { key: "pg01-1:t1", kind: "transfer" },
    { key: "pg01-1:t2", kind: "transfer" },
  ]);
  engine.applyLessonDone(r, "pg01-2", at, ["p1", "p2", "p3", "p4", "p5"].map((id) => ({ key: `pg01-2:${id}`, kind: "produce" })));
  return r;
}

const state = (tab) => tab.eval(`(() => document.querySelector('[data-review-step]')?.getAttribute('data-review-step') || null)()`);
const clickText = (tab, re) =>
  tab.eval(`(() => { const b = [...document.querySelectorAll('button')].find((x) => ${re}.test(x.textContent.trim()) && !x.disabled); if (!b) return false; b.click(); return true; })()`);
const typeInto = (tab, text) =>
  tab.eval(`(() => { const t = document.querySelector('[data-review-item] textarea'); if (!t) return false;
    const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(t, ${JSON.stringify(text)});
    t.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);

async function review(tab, viewport) {
  await tab.goto(`${BASE}/passoff-grammar/review`, 2500);
  const progress = await tab.eval(`(() => { const p = document.querySelector('[role=progressbar]'); return p ? Number(p.getAttribute('aria-valuemax')) : null; })()`);
  let clue = null;
  for (let guard = 0; guard < 80; guard += 1) {
    const s = await state(tab);
    if (s === "done") break;
    if (s === "items") {
      const item = await tab.eval(`(() => { const d = document.querySelector('[data-review-item]'); return d ? { key: d.getAttribute('data-review-item'), mode: d.getAttribute('data-review-mode') } : null; })()`);
      if (!item) { await sleep(300); continue; }
      // 시험: 일부러 틀린 답 하나 → 바로 다음
      if (!(await typeInto(tab, "x wrong"))) { await sleep(300); continue; }
      await sleep(150);
      await clickText(tab, /^확인$/);
      await sleep(350);
      continue;
    }
    if (s === "results") {
      // p13 이 든 결과면 다시 풀기(첫 글자 도움을 보려고), 아니면 그냥 이어서
      const hasP13 = await tab.eval(`!!document.querySelector('[data-review-result="pg01-1:p13"]')`);
      if (hasP13 && clue === null) await clickText(tab, /^틀린 문항 다시 풀기/);
      else if (!(await clickText(tab, /^다시 풀지 않고/))) await clickText(tab, /^(이어서 복습|복습 마치기)$/);
      await sleep(500);
      continue;
    }
    if (s === "again") {
      const key = await tab.eval(`document.querySelector('[data-review-item]')?.getAttribute('data-review-item') || null`);
      if (key === "pg01-1:p13" && clue === null) {
        await clickText(tab, /^도움 받기$/);
        await sleep(300);
        clue = await tab.eval(`(() => { const p = document.querySelector('[data-passoff-first-letters]'); return p ? { text: p.textContent, ko: [...p.querySelectorAll('[lang=ko]')].map((x) => x.textContent) } : null; })()`);
      }
      // 끝까지: 도움 받기 → 정답 보기 → 다음 문장
      for (let i = 0; i < 6; i += 1) {
        if (await clickText(tab, /^다음 문장$/)) break;
        if (await clickText(tab, /^정답 보기$/)) { await sleep(200); continue; }
        await clickText(tab, /^도움 받기$/);
        await sleep(250);
      }
      await sleep(400);
      continue;
    }
    await sleep(400);
  }
  await sleep(1500);
  const end = await tab.eval(`(() => { const s = document.querySelector('[aria-labelledby=review-done]'); if (!s) return null;
    const dts = [...s.querySelectorAll('dt')].map((d) => [d.textContent.trim(), d.nextElementSibling?.textContent.trim()]);
    return { heading: s.querySelector('h2')?.textContent.trim(), rows: Object.fromEntries(dts), more: s.querySelector('[data-review-more-today]')?.getAttribute('data-review-more-today') ?? null }; })()`);
  return { progress, end, clue };
}

async function passoff(tab, viewport) {
  await tab.goto(`${BASE}/passoff-grammar`, 1500);
  await tab.eval(`(() => { localStorage.clear(); localStorage.setItem('kig-learning:passoff-grammar', ${JSON.stringify(JSON.stringify(seedRecord()))}); })()`);
  await tab.goto(`${BASE}/passoff-grammar`, 2000);
  const listBefore = await tab.eval(`document.querySelector('[data-passoff-review-entry]')?.textContent.trim() || null`);
  const first = await review(tab, viewport);
  row(viewport, "P1 첫 복습 열기 — '복습 10개부터'(사흘 넘게 쉼)", first.progress === 10, { list: listBefore, progress: first.progress });
  row(viewport, "P1 끝 화면 '오늘 더 할 수 있는 문항' 줄", first.end && first.end.rows["오늘 더 할 수 있는 문항"] === "3개" && first.end.more === "3", first.end);
  row(viewport, "P5 다시 풀기 첫 글자 도움 pg01-1:p13 — 한국어 낱말은 한글", first.clue && first.clue.text === "I l___ i_ 서울." && first.clue.ko.join() === "서울", first.clue);
  await tab.goto(`${BASE}/passoff-grammar`, 2000);
  const listAfter = await tab.eval(`(() => { const e = document.querySelector('[data-passoff-review-entry]'); return e ? { kind: e.getAttribute('data-passoff-review-entry'), text: e.textContent.trim() } : null; })()`);
  row(viewport, "P1 목록도 '오늘 복습'(남은 것 있음)", listAfter && listAfter.kind === "due", listAfter);
  const second = await review(tab, viewport);
  row(viewport, "P1 다시 열면 복습 수 = 끝 화면 N(3)", second.progress === 3, { progress: second.progress });
  row(viewport, "P1 두 번째 끝 화면 — 남은 것 0 이면 줄 없음 · 내일 줄은 그대로", second.end && !("오늘 더 할 수 있는 문항" in second.end.rows) && "내일 올 문항" in second.end.rows, second.end);
  await tab.goto(`${BASE}/passoff-grammar`, 2000);
  const listLast = await tab.eval(`document.querySelector('[data-passoff-review-entry]')?.getAttribute('data-passoff-review-entry') || null`);
  row(viewport, "P1 목록 '오늘 복습 없음'", listLast === "none", listLast);
}

async function listCount(tab, course) {
  await tab.goto(`${BASE}/${course}`, 1800);
  return tab.eval(`(() => { const p = [...document.querySelectorAll('p')].find((x) => /학습 진도율/.test(x.textContent)); const m = p && p.textContent.match(/학습 진도율:\\s*(\\d+)\\s*\\/\\s*(\\d+)/); return m ? Number(m[1]) : null; })()`);
}
async function rowDone(tab, course, id) {
  // 구간을 펼쳐 그 강의 줄을 읽음(완료 표시 data 또는 글)
  await tab.eval(`(() => { for (const b of document.querySelectorAll('button[aria-expanded="false"]')) b.click(); })()`);
  await sleep(600);
  return tab.eval(`(() => { const li = document.querySelector('[data-lesson-id="${id}"]'); if (!li) return null; return { text: li.textContent.replace(/\\s+/g, ' ').trim().slice(0, 120), done: /완료/.test(li.textContent) }; })()`);
}
const endBar = (tab) => tab.eval(`(() => { const b = document.querySelector('section[aria-label="강의 마치기"] button[aria-pressed]'); return b ? { pressed: b.getAttribute('aria-pressed'), label: b.getAttribute('aria-label'), disabled: b.disabled } : null; })()`);

async function pairCourse(tab, viewport, course, main) {
  const script = `${main}-1`;
  await tab.goto(`${BASE}/${course}`, 1200);
  await tab.eval(`localStorage.clear()`);
  const zero = await listCount(tab, course);
  // 옛 기기 기록: '-1' 만 완료
  await tab.eval(`localStorage.setItem('kig:progress:completed', JSON.stringify({ "${course}:${script}": true }))`);
  const legacy = await listCount(tab, course);
  const legacyRow = await rowDone(tab, course, main);
  row(viewport, `P4 ${course} 옛 기록 '${script}' 만 완료 → 목록 1 · 본 강의 줄 완료`, zero === 0 && legacy === 1 && legacyRow && legacyRow.done, { zero, legacy, row: legacyRow });
  // 본 쪽에서 완료로 보이고, 거기서 취소 → 둘 다 풀림
  await tab.goto(`${BASE}/${course}/${main}`, 2500);
  const onMain = await endBar(tab);
  row(viewport, `P4 ${course}/${main} 본 쪽 끝 단추 '학습 완료함'`, onMain && onMain.pressed === "true", onMain);
  await clickText(tab, /학습 완료함/);
  await sleep(500);
  const stored = await tab.eval(`localStorage.getItem('kig:progress:completed')`);
  const afterUndo = await listCount(tab, course);
  row(viewport, `P4 본 쪽에서 취소 → 두 쪽 기록 모두 지움 · 목록 0`, afterUndo === 0 && !/${main}/.test(stored || ""), { stored, afterUndo });
  // '-1' 쪽에서 완료 — 완료 단추의 문(학습 한 번)은 이 기기 연습 기록으로 엶: LISTENING 받아쓰기 한 줄 확인 · READING 4단계 한 번 읽기
  const gateSeed =
    course === "ld"
      ? [`kig:ld:mastery:ld/${script}`, { v: 2, checked: { 0: true } }]
      : [`kig:reading:speed:v1:reading/${main}`, { v: 1, first: null, again: { wpm: 180, ms: 60000, at: new Date().toISOString() } }];
  await tab.eval(`localStorage.setItem(${JSON.stringify(gateSeed[0])}, ${JSON.stringify(JSON.stringify(gateSeed[1]))})`);
  await tab.goto(`${BASE}/${course}/${script}`, 2500);
  let bar = await endBar(tab);
  let pressedOnScript = false;
  if (bar && !bar.disabled) {
    await clickText(tab, /^이 강의 학습 완료$/);
    pressedOnScript = true;
  }
  await sleep(500);
  bar = await endBar(tab);
  const count = await listCount(tab, course);
  const r2 = await rowDone(tab, course, main);
  row(viewport, `P4 ${script} 에서 '이 강의 학습 완료' → 목록 진행률 1 · 본 강의 줄 완료`, pressedOnScript ? count === 1 && r2 && r2.done : null, { pressedOnScript, gate: bar, count, row: r2 });
}

(async () => {
  const profile = path.join(__dirname, `edge-${PORT}`);
  const { proc } = await launch({ port: PORT, profile });
  try {
    for (const viewport of ["desktop", "mobile"]) {
      const tab = await Tab.open(PORT);
      await tab.viewport(viewport);
      try {
        await passoff(tab, viewport);
        await pairCourse(tab, viewport, "ld", "d001");
        await pairCourse(tab, viewport, "reading", "pr001");
        const ev = tab.events;
        row(viewport, "예외 · 콘솔 오류 · 4xx/5xx", !ev.exceptions.length && !ev.console.length && !ev.badResponses.length, { exceptions: ev.exceptions.slice(0, 3), console: ev.console.slice(0, 3), bad: ev.badResponses.slice(0, 3) });
      } finally {
        await tab.eval(`localStorage.clear()`).catch(() => {});
        await tab.close();
      }
    }
  } finally {
    proc.kill();
  }
  const fail = rows.filter((r) => r.verdict === "FAIL").length;
  console.log(`\n${rows.length - fail}/${rows.length} PASS (FAIL ${fail})`);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
