#!/usr/bin/env node
/**
 * How far the shipped LISTENING English is from what the recordings actually say.
 *
 *   node docs/qa-2026-09-15/scripts/compare-ld-transcripts.cjs
 *   node docs/qa-2026-09-15/scripts/compare-ld-transcripts.cjs d010   # 한 레슨 상세
 *
 * Read-only. Writes a review table to evidence/.
 *
 * The comparison is per LESSON, not per row, on purpose. The shipped rows follow
 * the textbook's display line breaks, which fall mid-sentence, so a row and a
 * spoken sentence are not the same unit and lining them up one-to-one would
 * report differences that are only a matter of where a line ended. Comparing the
 * lesson's whole text against the whole transcript measures what is actually at
 * stake: whether the English a learner reads is the English on the recording.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const T = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-script-diff.md");

const transcripts = JSON.parse(fs.readFileSync(T, "utf8"));
const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const only = process.argv[2];

/** Words that carry meaning; the ratio is meaningless on "the" and "of". */
const STOP = new Set("a an the of to in on at and or but is are was were be been am i you he she it we they this that these those for with as his her their my your".split(" "));
const words = (s) => String(s).toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
const content = (s) => words(s).filter((w) => !STOP.has(w));

/** Share of the recording's content words that appear in the shipped text. */
function coverage(said, shipped) {
  const have = new Set(content(shipped));
  const want = content(said);
  if (!want.length) return 1;
  let hit = 0;
  for (const w of want) if (have.has(w)) hit++;
  return hit / want.length;
}

const rows = [];
for (const id of Object.keys(transcripts).sort()) {
  const said = transcripts[id].text || "";
  const shipped = (scripts[id] || []).map((r) => r.en).join(" ");
  if (!said || !shipped) continue;
  rows.push({
    id,
    cov: coverage(said, shipped),
    saidWords: content(said).length,
    shippedWords: content(shipped).length,
    said,
    shipped,
    seconds: transcripts[id].durationSeconds,
  });
}

if (only) {
  const r = rows.find((x) => x.id === only);
  if (!r) { console.error(`${only} 없음`); process.exit(1); }
  console.log(`${r.id} · ${r.seconds}초 · 일치율 ${(r.cov * 100).toFixed(0)}%\n`);
  console.log("=== 음성이 말하는 것 ===");
  for (const s of r.said.split(/(?<=[.?!])\s+/)) console.log(`  ${s}`);
  console.log("\n=== 사이트가 내보내는 것 ===");
  for (const x of scripts[only]) console.log(`  #${x.n} ${x.en}`);
  process.exit(0);
}

rows.sort((a, b) => a.cov - b.cov);
const band = (lo, hi) => rows.filter((r) => r.cov >= lo && r.cov < hi).length;

console.log(`레슨 ${rows.length}개 · 음성 ${Math.round(rows.reduce((a, b) => a + b.seconds, 0) / 60)}분\n`);
console.log("음성과의 일치율 분포");
console.log(`  90% 이상   ${String(band(0.9, 1.01)).padStart(4)}   거의 같음`);
console.log(`  70 ~ 90%   ${String(band(0.7, 0.9)).padStart(4)}   부분적으로 다름`);
console.log(`  50 ~ 70%   ${String(band(0.5, 0.7)).padStart(4)}   상당히 다름`);
console.log(`  50% 미만   ${String(band(0, 0.5)).padStart(4)}   🔴 사실상 다른 내용`);
const avg = rows.reduce((a, b) => a + b.cov, 0) / rows.length;
console.log(`\n평균 일치율 : ${(avg * 100).toFixed(1)}%`);

console.log("\n가장 어긋난 10개");
for (const r of rows.slice(0, 10)) {
  console.log(`  ${r.id}  ${(r.cov * 100).toFixed(0)}%  (음성 ${r.saidWords}단어 / 사이트 ${r.shippedWords}단어)`);
}

const L = [];
L.push("# LISTENING 영어 스크립트 — 음성 대조표");
L.push("");
L.push("> 현재 사이트의 영어는 한국어 대본을 줄 단위로 기계 번역한 것입니다.");
L.push("> 교재에는 영어 정답이 없으므로(영작이 과제), **음성이 유일한 원본**입니다.");
L.push("> 아래 '음성'은 원본 녹음을 Azure 로 전사한 것입니다.");
L.push("");
L.push(`레슨 ${rows.length}개 · 평균 일치율 ${(avg * 100).toFixed(1)}%`);
L.push("");
L.push("| 레슨 | 일치율 | 음성이 말하는 것 | 사이트가 내보내는 것 |");
L.push("|---|---|---|---|");
const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
for (const r of rows) {
  L.push(`| ${r.id} | ${(r.cov * 100).toFixed(0)}% | ${esc(r.said)} | ${esc(r.shipped)} |`);
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);
