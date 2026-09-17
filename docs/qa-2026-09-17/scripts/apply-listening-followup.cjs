#!/usr/bin/env node
/**
 * Follow-up to apply-listening.cjs: spots the re-run of the hint-word check found after it.
 * A hint word the learner is shown must be what the dictation answer says.
 *
 *  - d122 hint "annual": the corrected #5 no longer says "annual population growth"
 *  - d060 hint "fatal": the recording and the script say "deadly"
 *  - d063 #8 "#2 in the top 20": the hint (and the speaker) say "number two"
 *  - d030 #6 "it said $4.95": the story's point is that the tag said 495 ($495) and the
 *    narrator misread it as $4.95 — the hint gives both "495" and "4 dollars and 95 cents",
 *    and the Korean says "495라고"
 *
 * Every edit states the current text; nothing is written if one differs.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const SCRIPTS = path.join(REPO, "content/ld_english_scripts.json");

const ROWS = [
  ["d063", "8", "en", "that was #2 in the top 20.", "that was number two in the top 20."],
  ["d030", "6", "en", "I read the price tag and it said $4.95.", "I read the price tag and it said 495."],
];
const HINTS = [
  ["d122", "Africa annual population growth", "Africa population growth"],
  ["d060", "harmless fatal", "harmless deadly"],
];

const problems = [];
const raw = fs.readFileSync(SCRIPTS, "utf8");
if (JSON.stringify(JSON.parse(raw), null, 1) !== raw) problems.push("scripts file does not round-trip");
const s = JSON.parse(raw);
for (const [id, n, field, from, to] of ROWS) {
  const r = s[id].find((x) => x.n === n);
  if (!r || r[field].split(from).length !== 2) { problems.push(`${id} #${n} ${field}: "${from}" not exactly once`); continue; }
  r[field] = r[field].replace(from, () => to);
}
const writes = [];
for (const [id, from, to] of HINTS) {
  const file = path.join(REPO, "content/lessons/ld", `${id}.json`);
  const text = fs.readFileSync(file, "utf8");
  if (text.split(from).length !== 2) { problems.push(`${id}.json: "${from}" not exactly once`); continue; }
  writes.push([file, text.replace(from, () => to)]);
}
if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
fs.writeFileSync(SCRIPTS, JSON.stringify(s, null, 1));
for (const [file, text] of writes) fs.writeFileSync(file, text);
console.log(`rows ${ROWS.length}, hints ${HINTS.length} — written`);
