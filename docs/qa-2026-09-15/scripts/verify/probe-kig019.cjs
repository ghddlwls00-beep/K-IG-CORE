// [QA handoff] Written for the 2026-09-15 audit follow-up (group A fixes).
// Paths below point at the machine the fixes were made on. Before running, replace:
//   REPO -> absolute path of this repository
// Run with: node <this file>   (Node 20+; needs the repo's own node_modules)
//
// Browser probes take a base URL as argv[2]. Pass the production URL as well:
// a probe that does not fail on the un-fixed build proves nothing.
// KIG-019 probe: VOCA active-recall quiz can present more than one correct option.
// Uses the app's real generator (tsload) so we measure shipped behaviour.
const fs = require("fs");
const path = require("path");

const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));

const vocaUtils = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const vocaDict = JSON.parse(
  fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"),
);

function getMeaning(word) {
  if (!word) return "";
  const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
  return vocaDict[word]?.meaning || vocaDict[clean]?.meaning || "단어";
}

const dir = path.join(REPO, "content/lessons/phonics");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && !/-1\.json$/.test(f));

const ambiguousLessons = [];
const misgraded = [];
let totalWords = 0;

for (const f of files.sort()) {
  const lesson = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const grid = (lesson.blocks || []).find((b) => b.type === "wordgrid");
  const rows = grid?.rows ?? [];
  const words = rows.flat().map((w) => (w || "").trim()).filter(Boolean);
  if (words.length === 0) continue;
  totalWords += words.length;

  const dictMap = {};
  for (const w of words) dictMap[w.toLowerCase().trim()] = { meaning: getMeaning(w) };

  const byMeaning = {};
  for (const w of words) {
    const m = getMeaning(w);
    (byMeaning[m] = byMeaning[m] || []).push(w);
  }
  const collisions = Object.entries(byMeaning).filter(([, ws]) => ws.length > 1);
  if (collisions.length) {
    ambiguousLessons.push({ lesson: f.replace(".json", ""), collisions });
  }

  const lessonMis = new Map();
  for (let run = 0; run < 120; run++) {
    const qs = vocaUtils.generateActiveRecallQuizzes(words, dictMap);
    for (const q of qs) {
      const correctText = q.options[q.correctIndex];
      let n = 0;
      if (q.questionType === "ko-to-en") {
        n = q.options.filter((o) => getMeaning(o) === q.correctMeaning).length;
      } else {
        n = q.options.filter((o) => o === correctText).length;
      }
      if (n > 1) {
        const key = `${q.questionType}|${q.word}`;
        if (!lessonMis.has(key)) {
          lessonMis.set(key, {
            type: q.questionType,
            word: q.word,
            meaning: q.correctMeaning,
            options: q.options,
            alsoCorrect: q.options.filter(
              (o) => o !== correctText && getMeaning(o) === q.correctMeaning,
            ),
          });
        }
      }
    }
  }
  if (lessonMis.size) {
    misgraded.push({ lesson: f.replace(".json", ""), cases: [...lessonMis.values()] });
  }
}

const out = {
  lessonsScanned: files.length,
  wordsScanned: totalWords,
  lessonsWithMeaningCollisions: ambiguousLessons.length,
  lessonsWithMultiCorrectQuiz: misgraded.length,
  ambiguousLessons,
  misgraded,
};
fs.writeFileSync(
  path.join(__dirname, "..", "out", process.argv[2] || "kig019-after.json"),
  JSON.stringify(out, null, 2),
);
console.log("lessonsScanned:", out.lessonsScanned, "wordsScanned:", out.wordsScanned);
console.log("lessonsWithMeaningCollisions:", out.lessonsWithMeaningCollisions);
console.log("lessonsWithMultiCorrectQuiz:", out.lessonsWithMultiCorrectQuiz);
console.log("sample collisions:", JSON.stringify(ambiguousLessons.slice(0, 6), null, 1));
console.log("sample misgraded:", JSON.stringify(misgraded.slice(0, 3), null, 1));
