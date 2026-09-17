#!/usr/bin/env node
/**
 * READING, step 1 of the passage fixes — mechanical whitespace left by the PDF conversion,
 * in every sentence of all 256 passages (English and Korean):
 *   - line breaks inside a sentence ("some less,\n\nbut that all music") → one space
 *   - runs of spaces → one space, leading/trailing spaces trimmed
 *   - English only: a space before , . ? ! ; : (" ,", "earlier .") removed
 * Nothing else. Word-level PDF spaces in Korean ("마 지막") are a later, separate step.
 *
 *   node apply-reading-whitespace.cjs --dry-run   counts and samples, nothing written
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);
const samples = [];
const hits = ed.everySentence((s, id) => {
  for (const field of ["english", "korean"]) {
    const before = s[field];
    let t = before.replace(/\s*\n+\s*/g, " ").replace(/[ \t ]{2,}/g, " ").trim();
    if (field === "english") t = t.replace(/(\w|["'”’)]) +([,.?!;:])(?=\s|$|["”’])/g, "$1$2");
    if (t !== before) {
      s[field] = t;
      if (samples.length < 12) samples.push(`${id} ${field}: ${JSON.stringify(before.slice(0, 90))} → ${JSON.stringify(t.slice(0, 90))}`);
    }
  }
});
const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`sentences changed: ${hits} in ${r.lessons} lessons`);
for (const x of samples) console.log("  " + x);
console.log(DRY ? "--dry-run: nothing written" : "written");
