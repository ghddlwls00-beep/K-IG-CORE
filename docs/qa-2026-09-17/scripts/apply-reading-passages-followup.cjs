#!/usr/bin/env node
/**
 * READING passages — follow-up found by the cross-checks after the card pass:
 *  - pr165 #4 KO lost the slash of "true―false": "참 거짓이나" → "참/거짓이나"
 *  - pr063, pr133, pr165, pr187: no earlier fix touched these lessons, so their instruction
 *    blocks (the text fallback) still held the old PDF copy — cut off mid-sentence (pr063 EN,
 *    pr133 KO), or with the exam markers "(A)" "(B)" (pr187 KO). Rewritten from the sentences like
 *    every other lesson; no sentence changes except the pr165 slash.
 *   node apply-reading-passages-followup.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);

ed.ko("pr165", 4, "참 거짓이나", "참/거짓이나");
for (const id of ["pr063", "pr133", "pr187"]) ed.touch(id);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons — ${DRY ? "checked (--dry-run)" : "written"}`);
