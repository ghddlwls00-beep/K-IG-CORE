#!/usr/bin/env node
/**
 * Follow-up found while checking the riddle-answer screen (verify-ld-riddle-ui.cjs): the form
 * the audit listed for d037 #2 (L-30, "The Dr. looked") also appears in d143 #6 and d171 #7.
 * "Dr." is a title before a name; on its own it is "the doctor", and that is what a learner
 * hears and should write. English changes, so clips are regenerated after this.
 * States the current text; writes nothing if one differs.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");
const ROWS = [
  ["d143", "6", "The Dr. finally completed", "The doctor finally completed"],
  ["d171", "7", "The Dr. in the emergency room", "The doctor in the emergency room"],
];
const s = JSON.parse(fs.readFileSync(SCRIPTS, "utf8"));
const problems = [];
for (const [id, n, from, to] of ROWS) {
  const r = s[id].find((x) => x.n === n);
  if (!r || r.en.split(from).length !== 2) { problems.push(`${id} #${n}: "${from}" not exactly once`); continue; }
  r.en = r.en.replace(from, () => to);
}
const left = Object.entries(s).flatMap(([id, rows]) => rows.filter((r) => /\b[Tt]he Dr\.|\bDr\. (?![A-Z])/.test(r.en)).map((r) => `${id} #${r.n}`));
if (left.length) problems.push(`"the Dr." still in ${left.join(", ")}`);
if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
console.log(`${ROWS.length} rows — written`);
