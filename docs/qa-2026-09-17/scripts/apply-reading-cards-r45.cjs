#!/usr/bin/env node
/**
 * READING pr122 cards for the passage rewritten by apply-reading-passages-r45.cjs (run that
 * first). Cards whose word left the passage (received, encouraged, produced, demand,
 * self-sufficient, recent, dropped, farmers) are replaced with words of the new text.
 *   node apply-reading-cards-r45.cjs [--dry-run]
 */
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);

ed.cards("pr122", "890795f910", [
  "exports|export|n.|수출, 수출품", "earned|earn|v.|(돈을) 벌다", "major|major|adj.|주요한", "crop|crop|n.|작물 (export crop 수출 작물)", "coffee|coffee|n.|커피",
  "agreement|agreement|n.|협정 (international agreement 국제 협정)", "international|international|adj.|국제적인", "prices|price|n.|가격", "countries|country|n.|나라",
  "market|market|n.|시장 (world market 세계 시장)", "buyers|buyer|n.|구매자", "result|result|n.|결과 (as a result 그 결과)", "lowest|low|adj.|가장 낮은",
  "factors|factor|n.|요인",
]);

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lesson: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
