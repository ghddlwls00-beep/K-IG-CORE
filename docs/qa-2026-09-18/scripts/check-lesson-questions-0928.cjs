#!/usr/bin/env node
/**
 * 2026-09-28 새 문제 — LISTENING 1단계 '들은 내용 확인' · READING 4단계 '이해 문제'(src/components/LessonQuestions.tsx)를 실제로
 * 눌러 보는 검사. 로컬 운영 빌드의 무료 강의(/ld/d001 · /ld/d001-1 · /reading/pr001)를 빈 브라우저로 연다(이용권 없음 — 서버 쓰기 없음).
 * 기대값은 앱과 같은 방법으로 읽은 문제 파일(content.ts getLessonQuestions — content/questions/<과정>/<id>.json)과 강의 글.
 *
 *   $env:BASE = "http://localhost:3210"; $env:KIG_PROFILE_SOURCE = "<빈 폴더>"; node check-lesson-questions-0928.cjs [--break verdict|evidence|hide|engine|persist|lock|early]
 *   --break: 기대값 하나를 일부러 뒤집어 FAIL 이 나는지 본다(exit 1 이 나야 맞음).
 *   [--clone <사본 이름>] [--port <디버깅 포트>] (2026-10-04 — 동시에 도는 일꾼마다 따로. 기본 questions0928 · 9607)
 *
 *   A  잠긴 강의(d003 · pr003)를 로그아웃으로 받은 HTML: 잠금 화면 표시 있음 · 그 강의 문제 글(물음 · 보기) 0
 *   L1 d001 1단계: '들은 내용 확인' — 파일의 물음 그대로 · 차례대로 · 보기 4개씩 · 플레이어 아래
 *   L2 오답 하나 고름: 판정 wrong · 보기 모두 잠김 · 정답 보기에 정답 표시 · '정답은 ③번이에요.' · 근거 버튼 = 파일의 근거 줄 · 고르기만으로는 소리 0
 *   L3 근거 버튼 → 그 줄 소리 · 이 기기 기록(kig-questions:ld/d001) · 공통 엔진 기록(kind question · lesson · 첫 시도)
 *   L4 다시 열어도 답 그대로 · 대본 쪽 d001-1 도 같은 문제 · 같은 기록
 *   L5 모두 풀면 'N문제 중 k개 맞힘' · '다시 풀기' → 답 지움 · 다시 고르면 엔진에 첫 시도 아님
 *   L6 단계를 옮겨도 소리 없음(1→2→1 — 2026-09-28 사장님 규칙)
 *   R1 pr001 4단계: 재기 전 문제 없음 — 기다림 한 줄([data-comprehension="waiting"]) · 재는 동안 숨음 · '다 읽었어요' 뒤 보임(파일 그대로)
 *      (2026-10-08 UI검토-1007 4장 6 — 그 전에는 '재기 전 보임' · --break early 가 그 옛 기대)
 *   R2 정답 고름: right · 근거 = 파일의 근거 문장(강의 readingSentences 의 영어 · 번역 그대로) · 엔진 기록
 *   R3 (2026-10-08) 실제로 한 번 잰 뒤 다시 열면 4단계 문제가 바로 보임
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
// content.ts reads content/ from process.cwd() — run from anywhere (설계 세션이 짚음 09-29: scripts/ 에서 돌리면 TypeError)
process.chdir(H.REPO);

const BREAK = process.argv.includes("--break") ? process.argv[process.argv.indexOf("--break") + 1] : "";
// seeds and clears this browser's storage — made for the LOCAL build with a logged-out profile (like check-voca-0927)
if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(H.BASE) && !process.argv.includes("--allow-remote")) {
  console.error(`멈춤: BASE=${H.BASE} — 이 검사는 로컬 운영 빌드(http://localhost:3210)와 빈 브라우저용입니다. 다른 곳이면 --allow-remote.`);
  process.exit(2);
}
const content = H.loadTs(path.join(H.REPO, "src/lib/content.ts"));
const OUT = path.join(H.OUT, "lesson-questions-0928");
fs.mkdirSync(OUT, { recursive: true });
const MARKS = ["①", "②", "③", "④"];

let fails = 0;
const rows = [];
const check = (id, ok, note) => { rows.push({ id, ok, note }); if (!ok) fails++; console.log(`${ok ? "PASS" : "FAIL"}  ${id} — ${note}`); };
const J = JSON.stringify;
const q = (sel) => `document.querySelector(${J(sel)})`;
const store = (tab, key) => tab.eval(`(() => { try { return JSON.parse(localStorage.getItem(${J(key)}) || 'null'); } catch (e) { return null; } })()`).catch(() => null);
const sounded = (log) => log.some((e) => e.ev === "play()" || e.ev === "playing" || (e.ev === "tts.speak" && (e.text || "").trim()));
const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();

/** what the page shows of its questions */
const shown = (tab) => tab.eval(`(() => {
  const s = document.querySelector('[data-lesson-questions]');
  if (!s) return null;
  const r = s.getBoundingClientRect();
  return {
    visible: r.width > 0 && r.height > 0,
    counter: (s.querySelector('h3')?.nextElementSibling?.textContent || '').trim(),
    again: !!s.querySelector('[data-action="questions-again"]'),
    items: [...s.querySelectorAll('[data-question]')].map((li) => ({
      id: li.getAttribute('data-question'),
      verdict: li.getAttribute('data-verdict'),
      prompt: (li.querySelector('p')?.textContent || '').replace(/\\s+/g, ' ').trim(),
      options: [...li.querySelectorAll('[data-option]')].map((b) => ({ text: (b.textContent || '').trim(), disabled: b.disabled, success: /\\btext-success\\b/.test(b.className), danger: /\\btext-danger\\b/.test(b.className) })),
      result: (li.querySelector('[data-question-result] p')?.textContent || '').trim(),
      lines: [...li.querySelectorAll('[data-action="play-evidence"]')].map((b) => Number(b.getAttribute('data-line'))),
      evidence: [...li.querySelectorAll('[data-question-evidence] p[lang="en"]')].map((p) => (p.textContent || '').replace(/\\s+/g, ' ').trim()),
      evidenceKo: [...li.querySelectorAll('[data-question-evidence] p:not([lang])')].map((p) => (p.textContent || '').replace(/\\s+/g, ' ').trim()).filter((t) => t !== '근거'),
    })),
  };
})()`).catch(() => null);

async function open(tab, url, marker) {
  await H.load(tab, url, { marker });
  await H.waitFor(tab, `Boolean(document.querySelector('[data-lesson-questions], [data-comprehension]'))`, 15000);
  await H.sleep(400);
}

(async () => {
  const ldQs = content.getLessonQuestions("ld", "d001", (content.getLdEnglishScript("d001") || []).length) || [];
  const ldLines = content.getLdEnglishScript("d001") || [];
  const rdLesson = content.getLesson("reading", "pr001");
  const rdSentences = rdLesson.readingSentences || [];
  const rdQs = content.getLessonQuestions("reading", "pr001", rdSentences.length) || [];
  if (!ldQs.length || !rdQs.length) {
    console.error(`문제 파일이 없음: content/questions/ld/d001.json ${ldQs.length} · reading/pr001.json ${rdQs.length}`);
    process.exit(2);
  }

  // A — a locked lesson's HTML carries none of its questions (no browser: a plain logged-out request)
  for (const [course, id] of [["ld", BREAK === "lock" ? "d001" : "d003"], ["reading", BREAK === "lock" ? "pr001" : "pr003"]]) {
    const lines = course === "ld" ? (content.getLdEnglishScript(id) || []).length : (content.getLesson(course, id)?.readingSentences || []).length;
    const qs = content.getLessonQuestions(course, id, lines) || [];
    const res = await fetch(`${H.BASE}/${course}/${id}`, { redirect: "manual" });
    const html = await res.text();
    const needles = qs.flatMap((x) => [x.prompt, ...x.options]).filter((t) => t.length >= 4);
    const found = needles.filter((t) => html.includes(t) || html.includes(J(t).slice(1, -1)));
    check(`A ${course}/${id} 잠긴 강의 HTML`, qs.length > 0 && H.PAYWALL_RE.test(html) && found.length === 0, `HTTP ${res.status} · 문제 ${qs.length} · 잠금 표시 ${H.PAYWALL_RE.test(html)} · 문제 글 ${found.length}/${needles.length}${found.length ? ` (예: ${found[0]})` : ""}`);
  }

  // 2026-10-04 회귀 점검 단계 0: 여러 일꾼이 동시에 돌 때 각자의 사본 · 포트(기본은 전과 같음)
  const argOf = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
  const browser = await H.startBrowser(argOf("--clone", "questions0928"), Number(argOf("--port", 9607)));
  const tab = await H.openTab(browser);
  await H.setViewport(tab, "mobile");
  try {
    await open(tab, "/ld/d001", H.MARKERS.ld);
    await tab.eval("localStorage.clear(); sessionStorage.clear()");
    await open(tab, "/ld/d001", H.MARKERS.ld);

    // L1 — the file's questions, in order, under the Step 1 player
    let s = await shown(tab);
    const wantPrompts = ldQs.map((x, i) => `${i + 1}. ${x.prompt}`);
    const place = await tab.eval(`(() => { const p = document.querySelector('[data-step-panel="1"] [data-ld-passage]'); const s = document.querySelector('[data-step-panel="1"] [data-lesson-questions]'); return !!(p && s && (p.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)); })()`);
    check("L1 d001 1단계 '들은 내용 확인' — 파일의 물음 · 차례 · 보기 4개 · 플레이어 아래", !!s && s.visible && place === true && J(s.items.map((x) => x.prompt)) === J(wantPrompts) && s.items.every((x, i) => J(x.options.map((o) => o.text)) === J(ldQs[i].options.map((o, k) => `${MARKS[k]}${o}`))), s ? `${s.items.length}문제 · ${s.items.map((x) => x.prompt).join(" / ").slice(0, 120)} · 플레이어 아래 ${place}` : "문제 없음");

    // L2 — a wrong pick
    const q1 = ldQs[0];
    const wrong = (q1.answer + 1) % 4;
    await H.audioLog(tab, { clear: true });
    await H.click(tab, q(`[data-question="${q1.id}"] [data-option="${wrong}"]`), { settle: 900 });
    const pickLog = await H.audioLog(tab);
    s = await shown(tab);
    const it = s && s.items[0];
    const wantLines = q1.evidence.filter((n) => ldLines[n - 1] && ldLines[n - 1].en).map((n) => (BREAK === "evidence" ? n + 1 : n));
    const wantVerdict = BREAK === "verdict" ? "right" : "wrong";
    check(
      "L2 오답: wrong · 보기 잠김 · 정답 표시 · '정답은 N번이에요.' · 근거 버튼 = 파일의 근거 줄 · 고르기만으로 소리 0",
      !!it && it.verdict === wantVerdict && it.options.every((o) => o.disabled) && it.options[q1.answer].success && it.options[wrong].danger && it.result === `정답은 ${MARKS[q1.answer]}번이에요.` && J(it.lines) === J(wantLines) && !sounded(pickLog),
      it ? `판정 ${it.verdict} · 잠김 ${it.options.filter((o) => o.disabled).length}/4 · 정답 표시 ${it.options[q1.answer].success} · 고른 오답 표시 ${it.options[wrong].danger} · '${it.result}' · 근거 줄 ${J(it.lines)}(파일 ${J(q1.evidence)}) · 고를 때 소리 ${sounded(pickLog)}` : "문제 없음",
    );

    // L3 — the evidence line plays; the device record and the engine
    await H.audioLog(tab, { clear: true });
    await H.click(tab, q(`[data-question="${q1.id}"] [data-action="play-evidence"]`), { settle: 1500 });
    const evLog = await H.audioLog(tab);
    const rec = await store(tab, "kig-questions:ld/d001");
    const eng = await store(tab, "kig-learning:ld");
    const entry = eng && (eng.log || []).filter((e) => e.item === q1.id).pop();
    const wantKind = BREAK === "engine" ? "line" : "question";
    check(
      "L3 근거 버튼 → 소리 · 이 기기 기록 · 엔진 기록(kind question · lesson · 첫 시도)",
      sounded(evLog) && !!rec && rec.picks && rec.picks[q1.id] === wrong && rec.first && rec.first[q1.id] === wrong && !!entry && entry.kind === wantKind && entry.where === "lesson" && entry.effect === "lesson" && entry.correct === false && entry.firstTry === true,
      `근거 소리 ${sounded(evLog)}(${evLog.filter((e) => e.ev === "tts.speak" || e.ev === "play()").map((e) => (e.text || e.src || "").slice(0, 40)).join(" | ")}) · 기록 ${J(rec)} · 엔진 ${J(entry && { item: entry.item, kind: entry.kind, where: entry.where, effect: entry.effect, correct: entry.correct, firstTry: entry.firstTry })}`,
    );

    // L4 — a reload keeps it; the script page shares it
    await open(tab, "/ld/d001", H.MARKERS.ld);
    const again = await shown(tab);
    await open(tab, "/ld/d001-1", H.MARKERS.ld);
    const script = await shown(tab);
    const kept = BREAK === "persist" ? undefined : "wrong";
    check(
      "L4 다시 열어도 답 그대로 · 대본 쪽 d001-1 도 같은 문제 · 같은 기록",
      !!again && again.items[0].verdict === kept && again.counter === `1 / ${ldQs.length}` && !!script && J(script.items.map((x) => x.prompt)) === J(wantPrompts) && script.items[0].verdict === "wrong",
      `다시 열기: ${again ? `${again.items[0].verdict} · '${again.counter}'` : "없음"} · d001-1: ${script ? `${script.items.length}문제 · 1번 ${script.items[0].verdict}` : "없음"}`,
    );

    // L5 — all answered → score and '다시 풀기'; a pick after it is not a first try
    for (const x of ldQs.slice(1)) await H.click(tab, q(`[data-question="${x.id}"] [data-option="${x.answer}"]`), { settle: 400 });
    const full = await shown(tab);
    await H.click(tab, q('[data-action="questions-again"]'), { settle: 500 });
    const cleared = await shown(tab);
    await H.click(tab, q(`[data-question="${q1.id}"] [data-option="${q1.answer}"]`), { settle: 500 });
    const eng2 = await store(tab, "kig-learning:ld");
    const second = eng2 && (eng2.log || []).filter((e) => e.item === q1.id).pop();
    check(
      "L5 모두 풀면 'N문제 중 k개 맞힘' · '다시 풀기' → 답 지움 · 다시 고르면 첫 시도 아님",
      !!full && full.counter === `${ldQs.length}문제 중 ${ldQs.length - 1}개 맞힘` && full.again && !!cleared && cleared.items.every((x) => !x.verdict) && !cleared.again && !!second && second.correct === true && second.firstTry === false,
      `다 푼 뒤 '${full && full.counter}' · 다시 풀기 ${full && full.again} → 판정 남은 것 ${cleared ? cleared.items.filter((x) => x.verdict).length : "?"} · 다시 고른 기록 ${J(second && { correct: second.correct, firstTry: second.firstTry })}`,
    );

    // L6 — a step change never starts sound
    await H.audioLog(tab, { clear: true });
    await H.click(tab, q('[data-ld-view] [data-step-tab="2"]'), { settle: 1500 });
    await H.click(tab, q('[data-ld-view] [data-step-tab="1"]'), { settle: 1500 });
    const moveLog = await H.audioLog(tab);
    const back1 = await tab.eval(`document.querySelector('[data-ld-view]')?.getAttribute('data-step')`);
    check("L6 단계를 옮겨도 소리 없음(1→2→1)", back1 === "1" && !sounded(moveLog), `돌아온 단계 ${back1} · 소리 ${sounded(moveLog)}`);

    // R1 — READING Step 4 (UI검토-1007 4장 6 · 사장님 답 10-07 23:01 · 2026-10-08): before '읽기 시작' NO question — one line waiting for
    // '다 읽었어요' ([data-comprehension="waiting"]); hidden while timing; after '다 읽었어요' (this one is too fast — pressed, so it opens)
    // the file's questions. It was 'shown before the run'. --break early: the old expectation (shown before) — must FAIL.
    await open(tab, "/reading/pr001", H.MARKERS.reading);
    await H.click(tab, q('[data-reading-view] [data-step-tab="4"]'), { settle: 700 });
    const before = await shown(tab);
    const waiting = await tab.eval(`(() => { const s = document.querySelector('[data-step-panel="4"] [data-comprehension]'); return s ? { kind: s.getAttribute('data-comprehension'), line: (s.textContent || '').replace(/\\s+/g, ' ').trim() } : null; })()`).catch(() => null);
    await H.click(tab, q('[data-action="start-reading"]'), { settle: 700 });
    const during = await shown(tab);
    await H.click(tab, q('[data-action="finish-reading"]'), { settle: 900 });
    const after = await shown(tab);
    const wantRd = rdQs.map((x, i) => `${i + 1}. ${x.prompt}`);
    const hiddenWhileTiming = BREAK === "hide" ? !!during : !during;
    const beforeOk = BREAK === "early"
      ? !!before && before.visible && J(before.items.map((x) => x.prompt)) === J(wantRd)
      : !before && !!waiting && waiting.kind === "waiting" && /다 읽었어요/.test(waiting.line);
    check(
      "R1 pr001 4단계: 재기 전 문제 없음(기다림 한 줄) · 재는 동안 숨음 · '다 읽었어요' 뒤 보임(파일 그대로)",
      beforeOk && hiddenWhileTiming && !!after && after.visible && J(after.items.map((x) => x.prompt)) === J(wantRd),
      `재기 전 ${before ? `문제 ${before.items.length}(없어야)` : "문제 없음"} · 자리 ${waiting ? `${waiting.kind} '${waiting.line.slice(0, 40)}'` : "없음"} · 재는 동안 ${during ? "보임" : "숨음"} · 끝난 뒤 ${after ? `${after.items.length}문제 · ${after.items.map((x) => x.prompt).join(" / ").slice(0, 80)}` : "없음"}`,
    );

    // R2 — a right pick shows the file's evidence sentences as the lesson has them
    const rq = rdQs[rdQs.length - 1];
    await H.click(tab, q(`[data-question="${rq.id}"] [data-option="${rq.answer}"]`), { settle: 700 });
    const rs = await shown(tab);
    const ri = rs && rs.items.find((x) => x.id === rq.id);
    const wantEn = rq.evidence.map((n) => norm(`${n}. ${rdSentences[n - 1].english}`));
    const wantKo = rq.evidence.map((n) => norm(rdSentences[n - 1].korean));
    const reng = await store(tab, "kig-learning:reading");
    const rentry = reng && (reng.log || []).filter((e) => e.item === rq.id).pop();
    check(
      "R2 정답: right · 근거 = 파일의 근거 문장(영어 · 번역 그대로) · 엔진 기록",
      !!ri && ri.verdict === "right" && ri.result === "맞았어요." && J(ri.evidence) === J(wantEn) && J(ri.evidenceKo) === J(wantKo) && !!rentry && rentry.kind === "question" && rentry.correct === true,
      ri ? `판정 ${ri.verdict} · '${ri.result}' · 근거 ${ri.evidence.length}(${(ri.evidence[0] || "").slice(0, 50)}…) · 번역 ${ri.evidenceKo.length} · 엔진 ${J(rentry && { kind: rentry.kind, correct: rentry.correct })}` : "문제 없음",
    );

    // R3 (UI검토-1007 4장 6 · 2026-10-08) — a lesson read before opens its questions at once: one real timed reading
    // (lib/reading-page.cjs MEASURE_ONCE), then a reload → Step 4 shows the questions with no second '다 읽었어요'. A fresh visit
    // with nothing on record stays folded (R1).
    const RDP = require("./lib/reading-page.cjs");
    const measured = await tab.eval(RDP.MEASURE_ONCE).catch((e) => ({ ok: false, why: String(e && e.message) }));
    await open(tab, "/reading/pr001", H.MARKERS.reading);
    await H.click(tab, q('[data-reading-view] [data-step-tab="4"]'), { settle: 700 });
    const reopened = await tab.eval(`(() => { const s = document.querySelector('[data-step-panel="4"] [data-comprehension]'); return s ? s.getAttribute('data-comprehension') : null; })()`).catch(() => null);
    const again4 = await shown(tab);
    check("R3 실제로 잰 뒤 다시 열면 4단계 문제가 바로 보임('다 읽었어요' 다시 안 눌러도)", !!(measured && measured.ok) && reopened === "questions" && !!again4 && again4.visible && J(again4.items.map((x) => x.prompt)) === J(wantRd),
      `잼 ${measured && measured.ok ? "됨" : `못 함(${measured && measured.why})`} · 다시 연 4단계 자리 ${reopened} · 문제 ${again4 ? again4.items.length : 0}`);
  } catch (e) {
    check("RUN", false, `예외 ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`);
  } finally {
    fs.writeFileSync(path.join(OUT, `result${BREAK ? "-break-" + BREAK : ""}.json`), JSON.stringify({ at: new Date().toISOString(), base: H.BASE, break: BREAK || null, rows }, null, 2));
    await tab.close().catch(() => {});
    browser.proc.kill();
  }
  console.log(`\n${rows.filter((r) => r.ok).length}/${rows.length} PASS${BREAK ? ` (--break ${BREAK}: FAIL 이 나야 맞음)` : ""}`);
  process.exit(fails ? 1 : 0);
})();
