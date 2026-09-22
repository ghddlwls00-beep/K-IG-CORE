#!/usr/bin/env node
/**
 * GRAMMAR 정답 후보를 앱의 실제 채점기(src/lib/grammarGrading.ts gradeAgainstReferences)로
 * 지금 파일의 모범 답안 + 대체 답안에 대해 채점한다. 대체 답안을 넣기 전·후를 숫자로 남기기 위한 것.
 *
 *   node grade-candidates.cjs grammar1 gh1-021 24 "Am I not your friend?" "Aren't I your friend?"
 *
 * 출력: 후보마다 exact / partial / incorrect. 파일의 문항은 앱과 같은 정리(cleanText)를 거친다.
 */
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const E = require("./lib/expectations.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));

const [course, id, n, ...candidates] = process.argv.slice(2);
const item = E.itemsOf(E.lesson(course, id)).find((it) => String(it.n) === String(n));
if (!item) { console.error(`${course}/${id} n=${n} 없음`); process.exit(2); }
const refs = [item.text, ...item.alternatives];
console.log(`${course}/${id} n=${n} · 모범 ${JSON.stringify(item.text)} · 대체 ${JSON.stringify(item.alternatives)}`);
for (const c of candidates) console.log(`   ${grading.gradeAgainstReferences(c, refs).padEnd(9)} ← ${JSON.stringify(c)}`);
