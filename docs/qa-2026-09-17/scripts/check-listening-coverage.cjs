#!/usr/bin/env node
/**
 * LISTENING — does the lesson script contain every sentence the recording says?
 *
 * Ground truth: docs/qa-2026-09-15/evidence/ld-transcripts.json (speech-to-text
 * of each round's real audio; only the needed keys are read). Each transcript
 * sentence is looked for in the round's English script (content/ld_english_scripts.json)
 * with a loose match (lower-case, punctuation removed, ≥ 80% of its words in order
 * within the script). Also flags script sentences that the recording does not say.
 *
 * Output: out/content/listening-coverage.json and a per-round summary.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const transcripts = require(path.join(REPO, "docs/qa-2026-09-15/evidence/ld-transcripts.json"));
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));

const words = (s) => (s || "").toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
const sentences = (s) =>
  (s || "")
    .replace(/^\s*\d{1,3}\.\s*/, "")
    .split(/(?<=[.?!])\s+(?=[A-Z0-9"“])/)
    .map((x) => x.trim())
    .filter((x) => words(x).length >= 3);

// fraction of `needle` words found in order inside `hay`
function inOrderRatio(needle, hay) {
  let j = 0;
  let hit = 0;
  for (const w of needle) {
    const k = hay.indexOf(w, j);
    if (k >= 0) {
      hit++;
      j = k + 1;
    }
  }
  return needle.length ? hit / needle.length : 1;
}

const report = {};
let missingTotal = 0;
let extraTotal = 0;
const roundsWithMissing = [];
for (const id of Object.keys(scripts).sort()) {
  const t = transcripts[id];
  if (!t) continue;
  const scriptText = scripts[id].map((r) => r.en).join(" ");
  const scriptWords = words(scriptText);
  const recWords = words(t.text);
  const missing = sentences(t.text).filter((s) => inOrderRatio(words(s), scriptWords) < 0.8);
  const extra = sentences(scriptText).filter((s) => inOrderRatio(words(s), recWords) < 0.8);
  if (missing.length || extra.length) report[id] = { missing, extra };
  missingTotal += missing.length;
  extraTotal += extra.length;
  if (missing.length) roundsWithMissing.push(`${id}(${missing.length})`);
}
fs.writeFileSync(path.join(__dirname, "../out/content/listening-coverage.json"), JSON.stringify(report, null, 1));
console.log(`rounds checked: ${Object.keys(scripts).length}`);
console.log(`recording sentences missing from script: ${missingTotal} in ${roundsWithMissing.length} rounds`);
console.log(`script sentences the recording does not say: ${extraTotal}`);
console.log(roundsWithMissing.join(" "));
