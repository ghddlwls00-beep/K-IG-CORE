#!/usr/bin/env node
/**
 * Follow-up found by verify-listening-fixes.cjs: the same Korean typos the audit listed for one
 * row also appear in other rounds ("마크 퉤인" d166 #5 · d167 #3, "성냥곽" d159 #4 · #7 · d218 #2,
 * "유모어" d162 #2).
 * Korean only — no speech clip changes. States the expected number of hits; writes nothing
 * if the count differs.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");
const RULES = [
  [/퉤인/g, "트웨인", 2],
  [/성냥곽/g, "성냥갑", 3],
  [/유모어/g, "유머", 1],
];
const s = JSON.parse(fs.readFileSync(SCRIPTS, "utf8"));
const problems = [];
for (const [re, to, expected] of RULES) {
  let hits = 0;
  for (const rows of Object.values(s)) for (const r of rows) r.ko = r.ko.replace(re, () => { hits++; return to; });
  if (hits !== expected) problems.push(`${re} hit ${hits}×, expected ${expected}`);
}
if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
console.log("Korean follow-up written");
