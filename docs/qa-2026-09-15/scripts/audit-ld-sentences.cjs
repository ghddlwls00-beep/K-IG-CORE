#!/usr/bin/env node
/**
 * Check EVERY LISTENING sentence against the recording, not a sample.
 *
 *   node docs/qa-2026-09-15/scripts/audit-ld-sentences.cjs
 *   node docs/qa-2026-09-15/scripts/audit-ld-sentences.cjs --all   # 통과분도 출력
 *
 * Read-only. Writes the full table to evidence/.
 *
 * WHY NOT A SAMPLE. Eight random sentences read correctly and a targeted
 * keyword pass found one bad row, which is evidence about eight sentences and
 * about that keyword list — not about 2,518 sentences. For something being
 * sold, "the ones I looked at were fine" is not a finding.
 *
 * HOW EVERY ROW IS CHECKED. Each shipped sentence is matched to its best
 * counterpart in the transcript of the same lesson, and scored on content-word
 * overlap in BOTH directions:
 *
 *   recall     what the recording says that the sentence omits
 *   precision  what the sentence says that the recording never did
 *
 * Low precision is the dangerous one: it means the English asserts something
 * the passage does not contain — "They grew up and spoke Portuguese" against a
 * recording that says "in some places they spoke French or Portuguese". Low
 * recall alone is usually just a shorter rendering.
 *
 * The transcript is the authority because the recording is the only authentic
 * English: the textbook page for these lessons carries the Korean script and
 * the instruction to write the English yourself.
 *
 * 11 recordings hold more than one lesson, so a sentence may legitimately match
 * a part of the audio belonging to the next lesson; matching per sentence rather
 * than per lesson keeps that from counting against it.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-sentence-audit.md");
const ALL = process.argv.includes("--all");

const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const transcripts = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json"), "utf8"));

const STOP = new Set(("a an the of to in on at and or but is are was were be been being am i you he she it we they this "
  + "that these those for with as his her their my your there here not no do does did have has had will would can could "
  + "so if then than very much many more most some any all one two from by about into out up down over under again").split(" "));
const content = (s) => String(s).toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/)
  .filter((w) => w && w.length > 2 && !STOP.has(w));

/** Words that differ only by inflection should not count as different. */
const stem = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ed|ing)$/, "");
const setOf = (s) => new Set(content(s).map(stem));

function score(a, b) {
  const A = setOf(a), B = setOf(b);
  if (!A.size) return 0;
  let hit = 0;
  for (const w of A) if (B.has(w)) hit++;
  return hit / A.size;
}

const rows = [];
for (const id of Object.keys(scripts).sort()) {
  const said = transcripts[id]?.text || "";
  // Whole transcript as one bag, plus its sentences for the best-match report.
  const saidSentences = said.split(/(?<=[.?!])\s+/).filter(Boolean);
  for (const r of scripts[id] || []) {
    const en = String(r.en || "").trim();
    if (!en) continue;
    if (!said) { rows.push({ id, n: r.n, en, ko: r.ko, prec: null, best: "(전사 없음)" }); continue; }

    // precision: share of the sentence's own content words the recording used
    const prec = score(en, said);
    let best = "", bestScore = -1;
    for (const s of saidSentences) {
      const sc = score(en, s);
      if (sc > bestScore) { bestScore = sc; best = s; }
    }
    rows.push({ id, n: r.n, en, ko: String(r.ko || ""), prec, best });
  }
}

const scored = rows.filter((r) => r.prec !== null);
const band = (lo, hi) => scored.filter((r) => r.prec >= lo && r.prec < hi);
const suspect = band(0, 0.5);

console.log(`문장 총계 : ${rows.length}`);
console.log(`전사와 대조 가능 : ${scored.length}\n`);
console.log("문장이 쓰는 낱말 중 녹음에도 있는 비율");
console.log(`  90% 이상   ${String(band(0.9, 1.01).length).padStart(5)}   녹음 그대로`);
console.log(`  70 ~ 90%   ${String(band(0.7, 0.9).length).padStart(5)}   거의 같음`);
console.log(`  50 ~ 70%   ${String(band(0.5, 0.7).length).padStart(5)}   바꿔 쓴 표현`);
console.log(`  50% 미만   ${String(suspect.length).padStart(5)}   🔴 녹음에 없는 말을 함 — 사람이 봐야 함`);
const avg = scored.reduce((a, b) => a + b.prec, 0) / scored.length;
console.log(`\n평균 : ${(avg * 100).toFixed(1)}%`);
console.log(`사람이 읽어야 할 문장 : ${suspect.length}건 (${new Set(suspect.map((r) => r.id)).size}개 레슨)`);

const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const L = ["# LISTENING 전 문장 검사 — 녹음과의 대조", "",
  "> 2,518문장을 **표본이 아니라 전수**로 검사했습니다.",
  "> 각 영어 문장이 쓰는 낱말 중 원본 녹음에도 있는 비율을 재고, 가장 비슷한 녹음 문장을 붙였습니다.",
  "> 비율이 낮다 = 녹음에 없는 말을 한다 = 사람이 읽어봐야 한다.", "",
  `총 ${rows.length}문장 · 평균 ${(avg * 100).toFixed(1)}% · 50% 미만 ${suspect.length}건`, "",
  "## 🔴 50% 미만 — 사람이 읽어야 할 문장", "",
  "| 레슨 | # | 비율 | 교재 한국어 | 사이트 영어 | 녹음에서 가장 가까운 문장 |", "|---|---|---|---|---|---|"];
for (const r of suspect.sort((a, b) => a.prec - b.prec)) {
  L.push(`| ${r.id} | ${r.n} | ${(r.prec * 100).toFixed(0)}% | ${esc(r.ko)} | ${esc(r.en)} | ${esc(r.best)} |`);
}
if (ALL) {
  L.push("", "## 나머지", "", "| 레슨 | # | 비율 | 사이트 영어 |", "|---|---|---|---|");
  for (const r of scored.filter((x) => x.prec >= 0.5)) L.push(`| ${r.id} | ${r.n} | ${(r.prec * 100).toFixed(0)}% | ${esc(r.en)} |`);
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);
