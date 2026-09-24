#!/usr/bin/env node
/**
 * GRAMMAR's automatic grading, tested on the live page — the one thing the sweep never reached.
 *
 * The writing box in Step 1 is SELF-scored: the learner presses O or X, so there is no machine
 * verdict there, and the sweep kept reading the self-scoring panel and recording a failure. The
 * automatic grading lives in "Step 4 · 종합 평가", where the learner fills the sheet and presses
 * "🎯 전체 시험 채점하기"; each question then shows ✓ 정답 (100점), △ 부분 정답 (70점) or ✕ 오답 (0점),
 * from gradeAgainstReferences in src/lib/grammarGrading.ts.
 *
 * This fills every question with THE LESSON'S OWN MODEL ANSWER and submits. A model answer that
 * does not come back as 정답 is unfair to the learner by definition, whatever the reason.
 *
 *   node check-grammar-exam.cjs [--course grammar1] [--ids gh1-050] [--limit N] [--port 9640] [--clone <사본 이름>] [--tag <결과 이름>] [--all-alts [--break]]
 * Output: out/grammar-exam.json
 *
 * 최종 관문 관문 4(2026-09-25): 전에는 문항마다 다른 정답 [0] 하나만 넣었다 — 결정 C(다른 정답 3,233 더함) 뒤에는 다른 정답 11,976 중 4,592 만 본다.
 * --all-alts: 문항마다 다른 정답 [0] · [1] · … 을 차례로(k 번째 채점에 k 번째 다른 정답이 있는 문항만) 넣고 채점 — 강의마다 (가장 많은 다른 정답 수)번.
 *   만점 아닌 답 · 막힌 강의가 있으면 exit 1(이 모드에서만 — 옛 모드의 exit 는 그대로 0).
 * --break(--all-alts 와 같이): 메모리에서만, 처음 도는 강의에서 다른 정답이 둘 이상인 첫 문항의 [1] 을 틀린 영어로 바꿈 → 둘째 채점에서 잡혀
 *   exit 1 이어야 한다([0] 만 보던 옛 모드는 이것을 못 잡는다).
 */
const fs = require("fs");
const path = require("path");
const H = require("./lib/harness.cjs");
const E = require("./lib/expectations.cjs");

const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const COURSES = arg("--course", null) ? [arg("--course", null)] : ["grammar1", "grammar2"];
const ONLY = arg("--ids", null) ? new Set(arg("--ids", "").split(",")) : null;
const LIMIT = Number(arg("--limit", 0)) || 0;
const PORT = Number(arg("--port", 9640));
// 이용권 프로필 사본 이름(lib/profile.cjs — 원본은 건드리지 않음). 기본 'grammar-exam' 사본은 9/22 에 만든 채 남아 있어 그 뒤 이용권 표가 바뀐 운영에서
// 모든 강의가 '페이지가 뜨지 않음' 이 됨(2026-09-25 최종 관문) — 새 이름을 주면 원본에서 새로 복사한다.
const CLONE = arg("--clone", "grammar-exam");
const ALL_ALTS = process.argv.includes("--all-alts");
const BREAK = ALL_ALTS && process.argv.includes("--break");
const BROKEN_ALT = "Nothing on this sheet is the answer.";
const OUT = path.join(__dirname, "../out");
const TAG = arg("--tag", BREAK ? "break" : null); // 결과 파일 이름을 따로(시험 돌리기가 관문 결과 grammar-exam.json 을 덮지 않게)
const DEST = path.join(OUT, TAG ? `grammar-exam-${TAG}.json` : "grammar-exam.json");

// React tracks its own value on the DOM node, so assigning .value is ignored. Go through the
// native setter and fire the event React listens for, exactly as typing would.
const FILL = (pairs) => `(() => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  const pairs = ${JSON.stringify(pairs)};
  let filled = 0, missing = [];
  for (const [label, value] of pairs) {
    const el = document.querySelector('input[aria-label=' + JSON.stringify(label + '번 시험 답안') + ']');
    if (!el) { missing.push(label); continue; }
    set.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    filled++;
  }
  return { filled, missing };
})()`;

// GRAMMAR I 홀수 번호 쪽(/grammar1/gh1-007 등 97쪽)은 운영에서 짝수 쪽으로 넘어간다(307). 전에는 넘어간 주소를 기다리지 않아 97쪽이 '페이지가 뜨지 않음'
// (9/22 결과 BLOCKED 97). drive-generic 과 같게 넘어갈 곳을 먼저 알아 그 주소를 기다리고, 넘어간 곳을 이미 같은 답으로 쟀으면 그 결과를 쓴다(답이 다르면 다시 잼).
async function resolveRedirect(url) {
  for (let hop = 0, cur = H.BASE + url; hop < 5; hop++) {
    const r = await fetch(cur, { redirect: "manual" }).catch(() => null);
    if (!r) return url;
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).href; continue; }
    return new URL(cur).pathname;
  }
  return url;
}

const READ = `(() => {
  const out = [];
  for (const row of document.querySelectorAll('main div')) {
    const q = row.querySelector(':scope > div > div > span.font-mono');
    if (!q || !/^Q.+\\.$/.test((q.innerText || '').trim())) continue;
    const badge = row.querySelector(':scope > div > div > span[class*="rounded-md"]');
    const input = row.querySelector('input[aria-label$="번 시험 답안"]');
    if (!input) continue;
    out.push({ n: (q.innerText || '').trim().replace(/^Q|\\.$/g, ''), verdict: badge ? (badge.innerText || '').trim() : null, typed: input.value });
  }
  return out;
})()`;

(async () => {
  const browser = await H.startBrowser(CLONE, PORT);
  const tab = await H.openTab(browser);
  await H.setViewport(tab, "desktop");

  const results = [];
  const problems = [];
  let lessons = 0, altTried = 0, broken = null;
  const tested = new Map(); // 잰 쪽 주소 → { answersKey, status }

  for (const course of COURSES) {
    for (const p of E.pages(course)) {
      if (ONLY && !ONLY.has(p.id)) continue;
      const exp = E.expected(course, p.id);
      if (!exp.answers.length) continue;
      if (LIMIT && lessons >= LIMIT) break;
      lessons++;
      if (BREAK && !broken) {
        const a = exp.answers.find((x) => (x.alternatives || []).length >= 2);
        if (a) { a.alternatives = [...a.alternatives]; broken = { course, id: p.id, n: String(a.n), was: a.alternatives[1] }; a.alternatives[1] = BROKEN_ALT; console.log(`(깨기) ${course}/${p.id} ${a.n}번 다른 정답 [1] "${broken.was}" → "${BROKEN_ALT}"`); }
      }

      const finalPath = await resolveRedirect(p.url);
      const answersKey = JSON.stringify(exp.answers);
      const sameAs = finalPath !== p.url && tested.get(finalPath);
      if (sameAs && sameAs.answersKey === answersKey) {
        results.push({ course, id: p.id, status: sameAs.status, redirect: finalPath, note: `${finalPath} 로 넘어감 · 답(모범 · 다른 정답 ${exp.answers.length}문항)이 그 쪽과 같아 그 결과 그대로`, alternatives: 0, alternativesRead: 0 });
        console.log(`${String(results.length).padStart(4)} ${course}/${p.id} ${sameAs.status} — → ${finalPath} 와 같은 답`);
        continue;
      }
      const loaded = await H.load(tab, p.url, { marker: H.MARKERS[course], expectPath: finalPath !== p.url ? finalPath : null });
      if (!loaded.rendered) { results.push({ course, id: p.id, status: "BLOCKED", note: `페이지가 뜨지 않음${finalPath !== p.url ? ` (→ ${finalPath})` : ""}` }); continue; }

      const mode = await H.click(tab, `[...document.querySelectorAll('main button, nav button')].find((b) => /종합 평가/.test(b.innerText || ''))`, { settle: 700 });
      if (!mode.ok) { results.push({ course, id: p.id, status: "BLOCKED", note: `"Step 4 · 종합 평가" 를 열 수 없음: ${mode.reason}` }); continue; }

      // GrammarLearningView saves answers and the submitted flag to localStorage and restores
      // them, so a lesson visited before comes back already graded and has no submit button.
      // Put it back into editing first.
      await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /답안 다시 수정하기/.test(b.innerText || ''))`, { settle: 400 }).catch(() => {});

      const pairs = exp.answers.map((a) => [String(a.n), a.text]);
      const fill = await tab.eval(FILL(pairs)).catch((e) => ({ filled: 0, missing: [], error: e.message }));
      if (!fill.filled) { results.push({ course, id: p.id, status: "BLOCKED", note: `답안 칸을 찾지 못함 (${fill.error || "입력 0개"})` }); continue; }

      const submit = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || ''))`, { settle: 900 });
      if (!submit.ok) { results.push({ course, id: p.id, status: "BLOCKED", note: `채점 버튼을 누를 수 없음: ${submit.reason}` }); continue; }

      const rows = (await tab.eval(READ).catch(() => [])) || [];
      const graded = rows.filter((r) => r.verdict);
      const notExact = graded.filter((r) => !/✓ 정답/.test(r.verdict));
      for (const r of notExact) {
        const a = exp.answers.find((x) => String(x.n) === String(r.n));
        problems.push({ kind: "model-answer", course, id: p.id, n: r.n, verdict: r.verdict, modelAnswer: a ? a.text : "(?)", typed: r.typed, alternatives: a ? a.alternatives : [] });
      }

      // Second pass: the ALTERNATIVE answers. The page itself offers them to the learner
      // ("또는: …"), so an alternative that is not accepted is a promise the grading breaks.
      // This is where MAX_ANSWER_LEN_RATIO in src/lib/grammarGrading.ts bites: an alternative
      // longer than the model answer by more than 15% is rejected however correct it is.
      const rounds = ALL_ALTS ? Math.max(0, ...exp.answers.map((a) => (a.alternatives || []).length)) : 1;
      let altNotExact = [], altCount = 0, altRead = 0, roundsBlocked = 0;
      for (let k = 0; k < rounds; k++) {
        const altPairs = exp.answers.filter((a) => (a.alternatives || []).length > k).map((a) => [String(a.n), a.alternatives[k]]);
        if (!altPairs.length) continue;
        altCount += altPairs.length;
        const again = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /답안 다시 수정하기/.test(b.innerText || ''))`, { settle: 500 });
        if (!again.ok) { roundsBlocked++; continue; }
        const fill2 = await tab.eval(FILL(altPairs)).catch(() => ({ filled: 0 }));
        if (!fill2.filled) { roundsBlocked++; continue; }
        const submit2 = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || ''))`, { settle: 900 });
        if (!submit2.ok) { roundsBlocked++; continue; }
        const rows2 = (await tab.eval(READ).catch(() => [])) || [];
        const want = new Map(altPairs.map(([n, v]) => [String(n), v]));
        // 이번 채점에 넣은 답이 칸에 그대로 있는 줄만 센다(칸을 못 채운 문항을 앞 채점의 답으로 세지 않게)
        const seen = rows2.filter((r) => want.has(String(r.n)) && r.verdict && String(r.typed).trim() === String(want.get(String(r.n))).trim());
        altRead += seen.length;
        const bad = seen.filter((r) => !/✓ 정답/.test(r.verdict));
        altNotExact.push(...bad);
        for (const r of bad) {
          const a = exp.answers.find((x) => String(x.n) === String(r.n));
          problems.push({ kind: "alternative", course, id: p.id, n: r.n, round: k, verdict: r.verdict, modelAnswer: a ? a.text : "(?)", typed: r.typed, alternatives: a ? a.alternatives : [] });
        }
      }
      altTried += altRead;

      results.push({
        course, id: p.id,
        status: !graded.length || (ALL_ALTS && (roundsBlocked || altRead < altCount)) ? "BLOCKED" : notExact.length || altNotExact.length ? "FAIL" : "PASS",
        note: `${fill.filled}/${pairs.length} 칸 입력 · 채점 ${graded.length}문항 · 모범답안인데 정답 아님 ${notExact.length} · 대체답안 ${altCount}개(${ALL_ALTS ? `전부 · 채점 ${rounds}번` : "문항마다 [0]"}) 중 읽음 ${altRead} · 정답 아님 ${altNotExact.length}${roundsBlocked ? ` · 막힌 채점 ${roundsBlocked}` : ""}`,
        missingInputs: fill.missing,
        alternatives: altCount, alternativesRead: altRead,
      });
      tested.set(finalPath, { answersKey, status: results[results.length - 1].status });
      // This test writes into the audit licence's own saved work, which the command allows and
      // requires to be logged: the lesson keeps answers and a submitted flag in localStorage.
      H.logDataChange({ what: "GRAMMAR 모의 시험 답안·채점 상태", where: `${course}/${p.id} localStorage`, why: "자동 채점이 모범 답안과 대체 답안을 정답으로 인정하는지 실제 화면에서 확인", reversible: "강의 화면의 ↺ 전체 초기화 로 지워짐" });

      const last = results[results.length - 1];
      console.log(`${String(results.length).padStart(4)} ${course}/${p.id} ${last.status} — ${last.note}`);
    }
  }

  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  const altTotal = results.reduce((a, r) => a + (r.alternatives || 0), 0);
  fs.writeFileSync(DEST, JSON.stringify({ at: new Date().toISOString(), base: H.BASE || process.env.BASE || "https://k-ig-core.vercel.app", allAlts: ALL_ALTS, broken, lessons: results.length, counts, alternatives: altTotal, alternativesRead: altTried, problems, results }, null, 1));
  console.log(`\n강의 ${results.length}개 — ${JSON.stringify(counts)}`);
  console.log(`모범 · 대체 답안인데 정답 처리되지 않은 문항: ${problems.length}건 (강의 ${new Set(problems.map((p) => p.id)).size}개) · 모범 ${problems.filter((p) => p.kind === "model-answer").length} · 대체 ${problems.filter((p) => p.kind === "alternative").length}`);
  console.log(`대체 답안 ${altTotal}개(${ALL_ALTS ? "전부" : "문항마다 [0]"}) 중 채점을 읽은 것 ${altTried}${BREAK ? ` · 깨기 ${broken ? `${broken.course}/${broken.id} ${broken.n}번 [1]` : "넣을 문항 없음"}` : ""}`);
  for (const p of problems.slice(0, 10)) console.log(`   ${p.course}/${p.id} ${p.n}번 "${String(p.typed || p.modelAnswer).slice(0, 70)}" → ${p.verdict}`);
  console.log(`\n→ ${DEST}`);
  browser.proc.kill();
  if (ALL_ALTS) process.exit(problems.length || counts.BLOCKED || (BREAK && !broken) ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
