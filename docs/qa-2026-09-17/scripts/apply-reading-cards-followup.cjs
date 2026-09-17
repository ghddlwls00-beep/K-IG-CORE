#!/usr/bin/env node
/**
 * READING vocabulary cards — follow-up from the part-of-speech cross-check (RV-00): four idiom
 * cards were tagged n. but their meaning read as a verb ("(make fun of) ~을 놀리다"). The noun's
 * own meaning now comes first and the idiom follows in brackets, like the other idiom cards.
 * The other 13 cards of each lesson stay exactly as they are.
 *   node apply-reading-cards-followup.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const { createCardEditor } = require("./lib-reading-cards.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createCardEditor(REPO);

const fix = (id, hash, line) => {
  const word = line.split("|")[0];
  const current = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8")).readingVocabulary;
  ed.cards(id, hash, current.map((c) => (c.word === word ? line : `=${c.word}`)));
};
fix("pr074", "96081682c4", "amends|amends|n.|보상, 사죄 (make amends 잘못을 바로잡다)");
fix("pr172", "5004a13865", "hand|hand|n.|손 (go hand in hand 함께 가다, 밀접하게 연관되다)");
fix("pr213", "ebf8b6a5a4", "fun|fun|n.|재미, 장난 (make fun of ~을 놀리다)");
fix("pr255", "73a84ecbde", "pace|pace|n.|속도 (keep pace 보조를 맞추다)");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
console.log(`${r.lessons} lessons: kept ${r.stats.kept}, corrected ${r.stats.changed}, replaced ${r.stats.replaced} — ${DRY ? "checked (--dry-run)" : "written"}`);
