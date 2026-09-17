#!/usr/bin/env node
/**
 * READING pr095 (R-45): apply-reading-passages-065.cjs framed the IMF report "In 1998", but the
 * reported speech kept present forms ("said that … will begin", "warned that they have to give
 * up", "recover from the present economic hardships"). In a lesson that learners copy, a past
 * reporting verb takes back-shifted forms: would begin, would have to, their hardships.
 * Korean already reads as reported past speech; only #3's 현재의 is aligned.
 *   node apply-reading-passages-r45-pr095.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);

ed.en("pr095", 1, "will begin to get better", "would begin to get better");
ed.en("pr095", 2, "that they have to give up", "that they would have to give up");
ed.en("pr095", 3, "from the present economic hardships", "from their economic hardships");
ed.ko("pr095", 3, "현재의 경제적 곤경으로부터 어려운 경제가 회복될 것이라고", "어려움을 겪는 경제들이 당시의 경제적 곤경에서 회복될 것이라고");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lesson — ${DRY ? "checked (--dry-run)" : "written"}`);
