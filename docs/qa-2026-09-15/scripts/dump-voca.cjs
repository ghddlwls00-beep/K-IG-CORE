#!/usr/bin/env node
/**
 * Print the VOCA dictionary in batches for reading.
 *
 *   node docs/qa-2026-09-15/scripts/dump-voca.cjs 0 200
 *
 * Every gloss is read, not sampled. Screening rules were tried first and could
 * not do this job: romanising the Korean back to find transliterations returned
 * 컴퓨터, 피아노 and 카메라, which are the correct Korean words, while missing
 * nothing the audit had not already found; "one-character gloss" returned 폭,
 * 힘 and 섬; "ends in a particle" returned 고대의 and 남극의. Telling a loanword
 * that IS the Korean word from one that is a lazy transliteration takes Korean,
 * not a pattern.
 *
 * A 100-word sample put the remaining error rate near 1% outright wrong and
 * about 9% imperfect — on 3,517 unreviewed entries that is roughly 35 and 315.
 * The owner's decision was to read all of them.
 *
 * Sorted, so a batch is a stable range across runs.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const dict = JSON.parse(fs.readFileSync(path.join(ROOT, "content/voca_dictionary.json"), "utf8"));
const words = Object.keys(dict).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
const gloss = (w) => String(dict[w]?.meaning ?? dict[w]?.korean ?? "").trim();

const from = Number(process.argv[2] || 0);
const to = Number(process.argv[3] || from + 200);

console.log(`${from + 1}~${Math.min(to, words.length)} / ${words.length}`);
for (let i = from; i < Math.min(to, words.length); i++) {
  console.log(`${String(i + 1).padStart(4)} ${words[i].padEnd(22)}${gloss(words[i])}`);
}
