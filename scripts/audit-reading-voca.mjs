import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const readingDir = path.join(projectRoot, "content/lessons/reading");
const centralVocaPath = path.join(projectRoot, "src/lib/readingVocabulary.json");
const centralSentsPath = path.join(projectRoot, "src/lib/readingSentences.json");

console.log("=================================================");
console.log("  K-IG READING 256 LEXICAL BUILDER AUDIT SUITE   ");
console.log("=================================================\n");

let passed = true;
const errors = [];
let totalLessons = 0;
let totalCards = 0;

const tagCounts = {
  중학기초: 0,
  수능: 0,
  TOEIC: 0,
  TOEFL: 0,
};

const posCounts = {};

if (!fs.existsSync(centralVocaPath)) {
  console.error("FAIL: src/lib/readingVocabulary.json does not exist!");
  process.exit(1);
}

if (!fs.existsSync(centralSentsPath)) {
  console.error("FAIL: src/lib/readingSentences.json does not exist!");
  process.exit(1);
}

const centralVoca = JSON.parse(fs.readFileSync(centralVocaPath, "utf8"));
const centralSents = JSON.parse(fs.readFileSync(centralSentsPath, "utf8"));

const keys = Object.keys(centralVoca);
if (keys.length !== 256) {
  errors.push(`Central vocabulary has ${keys.length} keys, expected exactly 256.`);
  passed = false;
}

for (let unit = 1; unit <= 256; unit++) {
  totalLessons++;
  const lessonKey = `pr${String(unit).padStart(3, "0")}`;

  const mainPath = path.join(readingDir, `${lessonKey}.json`);
  const scriptPath = path.join(readingDir, `${lessonKey}-1.json`);

  if (!fs.existsSync(mainPath)) {
    errors.push(`[${lessonKey}] Missing main file: ${mainPath}`);
    passed = false;
    continue;
  }
  if (!fs.existsSync(scriptPath)) {
    errors.push(`[${lessonKey}] Missing script companion file: ${scriptPath}`);
    passed = false;
    continue;
  }

  const mainData = JSON.parse(fs.readFileSync(mainPath, "utf8"));
  const scriptData = JSON.parse(fs.readFileSync(scriptPath, "utf8"));

  const voca = centralVoca[lessonKey];
  const mainVoca = mainData.readingVocabulary;
  const scriptVoca = scriptData.readingVocabulary;

  // 1. Length check: exactly 14 keywords
  if (!Array.isArray(voca) || voca.length !== 14) {
    errors.push(`[${lessonKey}] Central voca has ${voca?.length ?? 0} cards (expected 14)`);
    passed = false;
    continue;
  }

  if (!Array.isArray(mainVoca) || mainVoca.length !== 14) {
    errors.push(`[${lessonKey}] mainData.readingVocabulary has ${mainVoca?.length ?? 0} cards (expected 14)`);
    passed = false;
  }

  if (!Array.isArray(scriptVoca) || scriptVoca.length !== 14) {
    errors.push(`[${lessonKey}] scriptData.readingVocabulary has ${scriptVoca?.length ?? 0} cards (expected 14)`);
    passed = false;
  }

  totalCards += voca.length;

  // 2. Card-level integrity & uniqueness checks
  const wordsSeen = new Set();
  const lemmasSeen = new Set();

  voca.forEach((item, idx) => {
    if (!item.word || typeof item.word !== "string") {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing or invalid word field`);
      passed = false;
    }
    if (!item.lemma || typeof item.lemma !== "string") {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing or invalid lemma field: ${item.word}`);
      passed = false;
    }
    if (!item.partOfSpeech || typeof item.partOfSpeech !== "string") {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing POS for: ${item.word}`);
      passed = false;
    }
    if (!item.korean || item.korean === "지문 핵심 어휘" || item.korean.trim() === "") {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing or placeholder Korean translation for: ${item.word}`);
      passed = false;
    }
    if (typeof item.score !== "number" || item.score <= 0) {
      errors.push(`[${lessonKey} Card #${idx + 1}] Invalid score for: ${item.word}`);
      passed = false;
    }
    if (!item.reason || typeof item.reason !== "string") {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing selection reason for: ${item.word}`);
      passed = false;
    }
    if (!Array.isArray(item.examTags)) {
      errors.push(`[${lessonKey} Card #${idx + 1}] Missing examTags array for: ${item.word}`);
      passed = false;
    }

    if (wordsSeen.has(item.word)) {
      errors.push(`[${lessonKey}] Duplicate word found: ${item.word}`);
      passed = false;
    }
    if (lemmasSeen.has(item.lemma)) {
      errors.push(`[${lessonKey}] Duplicate lemma found: ${item.lemma} (word: ${item.word})`);
      passed = false;
    }
    wordsSeen.add(item.word);
    lemmasSeen.add(item.lemma);

    if (Array.isArray(item.examTags)) {
      item.examTags.forEach((tag) => {
        if (tagCounts[tag] !== undefined) {
          tagCounts[tag]++;
        }
      });
    }

    const pos = item.partOfSpeech || "unknown";
    posCounts[pos] = (posCounts[pos] || 0) + 1;
  });
}

console.log(`Audited Lessons: ${totalLessons} / 256`);
console.log(`Total Lexical Cards: ${totalCards} (Target: 3,584)`);
console.log("\n--- Pedagogical & Exam Tag Distribution ---");
console.log(`  중학기초 (Middle School Basic): ${tagCounts["중학기초"]} cards`);
console.log(`  수능 (CSAT Academic):           ${tagCounts["수능"]} cards`);
console.log(`  TOEIC (Practical English):      ${tagCounts["TOEIC"]} cards`);
console.log(`  TOEFL / AWL (Academic/Campus):  ${tagCounts["TOEFL"]} cards`);

console.log("\n--- Part of Speech Distribution ---");
for (const [pos, count] of Object.entries(posCounts)) {
  console.log(`  ${pos.padEnd(6)}: ${count} cards (${((count / totalCards) * 100).toFixed(1)}%)`);
}

if (!passed || errors.length > 0) {
  console.error(`\n❌ AUDIT FAILED with ${errors.length} errors:`);
  errors.slice(0, 30).forEach((err) => console.error(" - " + err));
  if (errors.length > 30) {
    console.error(` ... and ${errors.length - 30} more errors.`);
  }
  process.exit(1);
} else {
  console.log("\n✅ ALL CHECKS PASSED: Every single lesson has exactly 14 high-yield, curated keywords!");
  process.exit(0);
}
