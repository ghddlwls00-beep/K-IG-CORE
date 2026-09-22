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
 *   node check-grammar-exam.cjs [--course grammar1] [--ids gh1-050] [--limit N] [--port 9640]
 * Output: out/grammar-exam.json
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
const OUT = path.join(__dirname, "../out");
const DEST = path.join(OUT, "grammar-exam.json");

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
  const browser = await H.startBrowser("grammar-exam", PORT);
  const tab = await H.openTab(browser);
  await H.setViewport(tab, "desktop");

  const results = [];
  const problems = [];
  let lessons = 0;

  for (const course of COURSES) {
    for (const p of E.pages(course)) {
      if (ONLY && !ONLY.has(p.id)) continue;
      const exp = E.expected(course, p.id);
      if (!exp.answers.length) continue;
      if (LIMIT && lessons >= LIMIT) break;
      lessons++;

      const loaded = await H.load(tab, p.url, { marker: H.MARKERS[course] });
      if (!loaded.rendered) { results.push({ course, id: p.id, status: "BLOCKED", note: "페이지가 뜨지 않음" }); continue; }

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
      const altPairs = exp.answers.filter((a) => (a.alternatives || []).length).map((a) => [String(a.n), a.alternatives[0]]);
      let altNotExact = [];
      if (altPairs.length) {
        const again = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /답안 다시 수정하기/.test(b.innerText || ''))`, { settle: 500 });
        if (again.ok) {
          const fill2 = await tab.eval(FILL(altPairs)).catch(() => ({ filled: 0 }));
          if (fill2.filled) {
            const submit2 = await H.click(tab, `[...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || ''))`, { settle: 900 });
            if (submit2.ok) {
              const rows2 = (await tab.eval(READ).catch(() => [])) || [];
              const wanted = new Set(altPairs.map(([n]) => String(n)));
              altNotExact = rows2.filter((r) => wanted.has(String(r.n)) && r.verdict && !/✓ 정답/.test(r.verdict));
              for (const r of altNotExact) {
                const a = exp.answers.find((x) => String(x.n) === String(r.n));
                problems.push({ kind: "alternative", course, id: p.id, n: r.n, verdict: r.verdict, modelAnswer: a ? a.text : "(?)", typed: r.typed, alternatives: a ? a.alternatives : [] });
              }
            }
          }
        }
      }

      results.push({
        course, id: p.id,
        status: !graded.length ? "BLOCKED" : notExact.length || altNotExact.length ? "FAIL" : "PASS",
        note: `${fill.filled}/${pairs.length} 칸 입력 · 채점 ${graded.length}문항 · 모범답안인데 정답 아님 ${notExact.length} · 대체답안 ${altPairs.length}개 중 정답 아님 ${altNotExact.length}`,
        missingInputs: fill.missing,
      });
      // This test writes into the audit licence's own saved work, which the command allows and
      // requires to be logged: the lesson keeps answers and a submitted flag in localStorage.
      H.logDataChange({ what: "GRAMMAR 모의 시험 답안·채점 상태", where: `${course}/${p.id} localStorage`, why: "자동 채점이 모범 답안과 대체 답안을 정답으로 인정하는지 실제 화면에서 확인", reversible: "강의 화면의 ↺ 전체 초기화 로 지워짐" });

      const last = results[results.length - 1];
      console.log(`${String(results.length).padStart(4)} ${course}/${p.id} ${last.status} — ${last.note}`);
    }
  }

  const counts = results.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {});
  fs.writeFileSync(DEST, JSON.stringify({ at: new Date().toISOString(), lessons: results.length, counts, problems, results }, null, 1));
  console.log(`\n강의 ${results.length}개 — ${JSON.stringify(counts)}`);
  console.log(`모범 답안인데 정답 처리되지 않은 문항: ${problems.length}건 (강의 ${new Set(problems.map((p) => p.id)).size}개)`);
  for (const p of problems.slice(0, 10)) console.log(`   ${p.course}/${p.id} ${p.n}번 "${String(p.modelAnswer).slice(0, 70)}" → ${p.verdict}`);
  console.log(`\n→ ${DEST}`);
  browser.proc.kill();
})().catch((e) => { console.error(e); process.exit(1); });
