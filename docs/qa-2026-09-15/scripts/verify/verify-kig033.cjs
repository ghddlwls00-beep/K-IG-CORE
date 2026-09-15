// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-033 verification: one click on "마스터 체크" must master the card, the quiz
// path must still require MASTERY_STREAK answers, and a correct answer must
// never demote a mastered card.
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));

// --- current implementation -------------------------------------------------
const now = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));

// --- the pre-fix implementation, straight out of git -----------------------
// 11ef719 is the revision before the KIG-033 fix; pinning it keeps the
// "the old code really did behave this way" half of the test meaningful.
const tmpDir = path.join(__dirname, "..", "out", "old");
fs.mkdirSync(tmpDir, { recursive: true });
const oldSrc = execSync("git show 11ef719:src/lib/vocaUtils.ts", { cwd: REPO }).toString();
fs.writeFileSync(path.join(tmpDir, "vocaUtilsOld.ts"), oldSrc);
const before = loadTs(path.join(tmpDir, "vocaUtilsOld.ts"));

const results = [];
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  results.push({ name, ok, actual, expected });
}

// 1. The defect: the old button needed 3 clicks because it went through the
//    quiz progression. One click only reached Box 2.
let oldCards = {};
for (let i = 0; i < 3; i++) oldCards = before.updateLeitnerCard(oldCards, "home", "집", true);
check("old: box after 3 clicks", oldCards.home.box, 3);
check("old: streak after 3 clicks", oldCards.home.streak, 3);

// 2. Fixed: one click masters.
let cards = {};
cards = now.setLeitnerMastery(cards, "home", "집", true);
check("new: box after 1 click", cards.home.box, 3);
check("new: streak after 1 click", cards.home.streak, 1);

// 3. The button still un-masters on a second click.
cards = now.setLeitnerMastery(cards, "home", "집", false);
check("new: box after un-master click", cards.home.box, 1);
check("new: streak after un-master click", cards.home.streak, 0);

// 4. Regression: the quiz path is unchanged — 3 correct answers to master.
let quiz = {};
for (let i = 0; i < 2; i++) quiz = now.updateLeitnerCard(quiz, "home", "집", true);
check("quiz: box after 2 correct", quiz.home.box, 2);
quiz = now.updateLeitnerCard(quiz, "home", "집", true);
check("quiz: box after 3 correct", quiz.home.box, 3);
quiz = now.updateLeitnerCard(quiz, "home", "집", false);
check("quiz: wrong answer drops to box 1", quiz.home.box, 1);

// 5. Regression: answering a hand-mastered card correctly must not demote it.
let manual = now.setLeitnerMastery({}, "home", "집", true);
const afterCorrect = now.updateLeitnerCard(manual, "home", "집", true);
check("hand-mastered + correct stays box 3", afterCorrect.home.box, 3);
const afterWrong = now.updateLeitnerCard(manual, "home", "집", false);
check("hand-mastered + wrong drops to box 1", afterWrong.home.box, 1);

// 6. Same demotion bug in the old code, for the record.
const oldManual = { home: { word: "home", meaning: "집", box: 3, lastTestedAt: 0, streak: 0 } };
check(
  "old: hand-mastered + correct demoted to box 2 (bug)",
  before.updateLeitnerCard(oldManual, "home", "집", true).home.box,
  2,
);

// 7. MASTERY_STREAK must match the quiz threshold actually in force.
let n = 0;
let probe = {};
while (n < 10) {
  probe = now.updateLeitnerCard(probe, "w", "뜻", true);
  n++;
  if (probe.w.box === 3) break;
}
check("MASTERY_STREAK constant", now.MASTERY_STREAK, n);

const failed = results.filter((r) => !r.ok);
for (const r of results) console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}  -> ${JSON.stringify(r.actual)}`);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
