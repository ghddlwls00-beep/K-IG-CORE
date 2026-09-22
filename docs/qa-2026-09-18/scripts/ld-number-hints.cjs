#!/usr/bin/env node
/**
 * #51 — LISTENING 대본에서 한 자리·10·100 숫자가 든 문장(과정 전체)마다, 그 강의 힌트 칩이 그 문장에 **문장별로**
 * 뜨는지(앱 pickHintsFor 와 같은 규칙 — lib/expectations.cjs hintsForSentence) 아니면 안전장치로 **힌트 전체**가
 * 뜨는지를 센다. 그리고 힌트가 그 수를 낱말로 적은 곳(five miles)을 찾는다.
 *
 *   node ld-number-hints.cjs          표 + 합계
 *   node ld-number-hints.cjs --json
 *
 * 소유자 결정(2026-09-23): 문장은 그대로 두고, 힌트가 낱말로 쓴 곳을 숫자로 바꾼다(five miles → 5 miles).
 * 힌트는 화면 글자라 소리를 내지 않는다(LdLearningView 의 재생 호출은 모두 영어 대본·연음 조각).
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const WORD = { 1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine", 10: "ten", 100: "hundred" };
const SMALL = /(?<![\d,.:$])\b(10|100|[1-9])\b(?![\d,.:%])/g;

const rows = [];
for (const [id, script] of Object.entries(E.ldScripts)) {
  const file = path.join(REPO, "content/lessons/ld", `${id}.json`);
  if (!fs.existsSync(file)) continue;
  const hints = ((JSON.parse(fs.readFileSync(file, "utf8")).blocks || []).find((b) => b.type === "hints") || {}).text || "";
  const chunks = E.hintChunks(hints);
  for (const r of script) {
    const nums = String(r.en).match(SMALL) || [];
    if (!nums.length) continue;
    const shown = E.hintsForSentence(r.en, chunks);
    const fallback = shown === chunks && chunks.length > 0; // hintsForSentence 는 안전장치일 때 받은 배열을 그대로 돌려준다
    const spelledChunks = chunks.filter((c) => nums.some((n) => new RegExp(`\\b${WORD[n]}\\b`, "i").test(c)));
    rows.push({ id, n: r.n, en: r.en, nums, chunks: chunks.length, shown: shown.length, fallback, spelledChunks });
  }
}
if (process.argv.includes("--json")) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
const spelled = rows.filter((r) => r.spelledChunks.length);
console.log(`한 자리·10·100 숫자가 든 문장 ${rows.length}개 (강의 ${new Set(rows.map((r) => r.id)).size}개)`);
console.log(`  힌트 칩이 문장별로 뜸 ${rows.filter((r) => !r.fallback && r.shown).length} · 안전장치로 힌트 전체가 뜸 ${rows.filter((r) => r.fallback).length} · 칩 없음 ${rows.filter((r) => !r.shown).length}`);
console.log(`  같은 강의 힌트가 그 수를 낱말로 쓴 문장 ${spelled.length}개:`);
for (const r of spelled) console.log(`   ${r.id} n=${r.n} [${r.nums.join(",")}] ${r.fallback ? "안전장치(전체 " + r.chunks + "개)" : `문장별 ${r.shown}개`} · 낱말 칩 ${JSON.stringify(r.spelledChunks)}\n        ${r.en.slice(0, 110)}`);
