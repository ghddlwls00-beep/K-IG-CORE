#!/usr/bin/env node
/**
 * LISTENING clock times written with a dot ("6.15", "11.30") — found while re-checking L-54
 * (d095 "8.40 A.m."). Azure Ava reads a dotted number as a decimal ("six point one five"),
 * the round hints write the time with a colon (d016 "9:15", d025 "11:30", d069 "3:20"), and
 * American English writes 6:15. Money ("$4.95") is left alone.
 *
 * Each row's current English is stated; nothing is written if one differs.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");

// [id, n, times in that row in order]
const ROWS = [
  ["d006", "6", ["6.15", "6.45", "7.15"]],
  ["d016", "2", ["3.30"]],
  ["d016", "4", ["9.15"]],
  ["d021", "3", ["8.30"]],
  ["d023", "5", ["9.30"]],
  ["d025", "5", ["11.30"]],
  ["d063", "1", ["9.30"]],
  ["d069", "1", ["3.20"]],
  ["d072", "7", ["3.45"]],
  ["d095", "2", ["9.30"]],
];

const raw = fs.readFileSync(SCRIPTS, "utf8");
const s = JSON.parse(raw);
const problems = [];
let n = 0;
for (const [id, rowN, times] of ROWS) {
  const r = s[id].find((x) => x.n === rowN);
  const found = (r?.en.match(/\b\d{1,2}\.\d{2}\b(?!\d)/g) || []).filter((t) => !r.en.includes(`$${t}`));
  if (JSON.stringify(found) !== JSON.stringify(times)) { problems.push(`${id} #${rowN}: dotted times ${JSON.stringify(found)}, expected ${JSON.stringify(times)}`); continue; }
  for (const t of times) { r.en = r.en.replace(t, t.replace(".", ":")); n++; }
}
const left = [];
for (const [id, rows] of Object.entries(s)) for (const r of rows) {
  for (const t of r.en.match(/(?<!\$)\b\d{1,2}\.\d{2}\b/g) || []) left.push(`${id} #${r.n} ${t}`);
}
if (left.length) problems.push(`dotted times still present after the change: ${left.join(", ")}`);
if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
console.log(`${n} clock times in ${ROWS.length} rows now use a colon — written`);
