#!/usr/bin/env node
/**
 * GRAMMAR 문항 하나에 답을 넣어 **앱의 실제 채점기**로 잰다 — src/lib/grammarGrading.ts gradeAgainstReferences
 * (참조 = 지금 파일의 모범 답안 + 대체 답안). 6단계에서 대체 답안을 더하거나 모범 답안을 바꿀 때 전후를 재는 도구.
 *
 *   node grade-item.cjs grammar1 gh1-016 10 "How do you get there?" "How do I get there?"
 *   node grade-item.cjs --file <plan.json>      [{ "course", "lesson", "n", "answers": [...], "expect"?: "exact" }, …]
 *
 * lesson 은 학습자가 푸는 한국어 쪽 페이지 id (gh1-016 · gh1-016-1 …). 참조는 그 짝 영어 페이지에서 온다.
 * --file 에 expect 를 주면 결과가 다를 때 exit 1 (예: 더한 대체 답안은 "exact", 일부러 틀린 대조는 "incorrect").
 */
const path = require("path");
const fs = require("fs");
const E = require("./lib/expectations.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));

function refsOf(course, lesson, n) {
  const exp = E.expected(course, lesson);
  const a = exp.answers.find((x) => String(x.n) === String(n));
  return a ? [a.text, ...(a.alternatives || [])] : null;
}
function grade(course, lesson, n, answer) {
  const refs = refsOf(course, lesson, n);
  if (!refs) return { verdict: "문항 없음", refs: [] };
  return { verdict: String(grading.gradeAgainstReferences(answer, refs)), refs };
}

const args = process.argv.slice(2);
if (args[0] === "--file") {
  const plan = JSON.parse(fs.readFileSync(args[1], "utf8"));
  let bad = 0, total = 0;
  for (const p of plan) {
    for (const ans of p.answers) {
      total++;
      const r = grade(p.course, p.lesson, p.n, ans);
      const ok = !p.expect || r.verdict === p.expect;
      if (!ok) bad++;
      console.log(`${ok ? " " : "✗"} ${p.lesson} #${p.n} ${r.verdict.padEnd(9)} ${ans}${p.expect ? `  (기대 ${p.expect})` : ""}`);
    }
  }
  console.log(`${total}개 중 기대와 다름 ${bad}`);
  process.exit(bad ? 1 : 0);
} else {
  const [course, lesson, n, ...answers] = args;
  const refs = refsOf(course, lesson, n);
  console.log(`${lesson} #${n} 참조: ${refs ? refs.map((r) => `"${r}"`).join(" | ") : "(문항 없음)"}`);
  for (const a of answers) console.log(`  ${grade(course, lesson, n, a).verdict.padEnd(9)} ${a}`);
}
