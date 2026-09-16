#!/usr/bin/env node
/**
 * Print the Korean/English pairs of the realigned LISTENING lessons for reading.
 *
 *   node docs/qa-2026-09-15/scripts/dump-ld-pairs.cjs 0 10   # 1~10번째 레슨
 *   node docs/qa-2026-09-15/scripts/dump-ld-pairs.cjs d006
 *
 * The 85 lessons whose Korean and recording had different sentence counts were
 * paired by an alignment that allows gaps. Its score says the pairing is
 * plausible, not that each row is right — a lesson can score well while two
 * rows in the middle are swapped. For something being sold, that has to be
 * read, so this prints it in a form a person can read straight through.
 *
 * Order is by the order they were aligned in, which puts the lessons the
 * alignment was least sure about first.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const preview = fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-align-preview.md"), "utf8");

// The preview records which lessons this pass touched, and with what score.
const realigned = [...preview.matchAll(/^### (d\d+)\s+\(점수 (\d+)/gm)]
  .map((m) => ({ id: m[1], score: Number(m[2]) }))
  .sort((a, b) => a.score - b.score);

const arg = process.argv[2];
if (arg && /^d\d+$/.test(arg)) {
  const rows = scripts[arg] || [];
  const s = realigned.find((r) => r.id === arg);
  console.log(`=== ${arg} (점수 ${s ? s.score : "?"}) · ${rows.length}행`);
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(2)} KO ${r.ko}`);
    console.log(`     EN ${r.en}`);
  }
  process.exit(0);
}

const from = Number(arg || 0);
const to = Number(process.argv[3] || from + 10);
console.log(`정렬한 레슨 ${realigned.length}개 중 ${from + 1}~${Math.min(to, realigned.length)}번째 (점수 낮은 순)\n`);
for (const { id, score } of realigned.slice(from, to)) {
  const rows = scripts[id] || [];
  console.log(`=== ${id} (점수 ${score}) · ${rows.length}행`);
  for (const r of rows) {
    console.log(`  ${String(r.n).padStart(2)} KO ${r.ko}`);
    console.log(`     EN ${r.en}`);
  }
  console.log("");
}
