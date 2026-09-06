import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const readingDir = path.join(projectRoot, "content/lessons/reading");
const centralJsonPath = path.join(projectRoot, "src/lib/readingSentences.json");

console.log("=================================================");
console.log("  K-IG READING 256 LESSONS COMPREHENSIVE AUDIT   ");
console.log("=================================================\n");

let passed = true;
let totalLessons = 0;
let totalSentences = 0;
const errors = [];
const seenIds = new Set();

// 1. Verify central dictionary exists
if (!fs.existsSync(centralJsonPath)) {
  console.error("FAIL: src/lib/readingSentences.json does not exist!");
  process.exit(1);
}

const centralData = JSON.parse(fs.readFileSync(centralJsonPath, "utf8"));

// 2. Audit each lesson pr001 ~ pr256
for (let unit = 1; unit <= 256; unit++) {
  totalLessons++;
  const lessonKey = `pr${String(unit).padStart(3, "0")}`;
  const padUnit = String(unit).padStart(3, "0");

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

  const mainSents = mainData.readingSentences;
  const scriptSents = scriptData.readingSentences;
  const centralSents = centralData[lessonKey];

  if (!Array.isArray(mainSents) || mainSents.length === 0) {
    errors.push(`[${lessonKey}] mainData.readingSentences is empty or not an array`);
    passed = false;
    continue;
  }
  if (!Array.isArray(scriptSents) || scriptSents.length === 0) {
    errors.push(`[${lessonKey}] scriptData.readingSentences is empty or not an array`);
    passed = false;
    continue;
  }
  if (!Array.isArray(centralSents) || centralSents.length === 0) {
    errors.push(`[${lessonKey}] centralData[${lessonKey}] is empty or not an array`);
    passed = false;
    continue;
  }

  if (mainSents.length !== scriptSents.length || mainSents.length !== centralSents.length) {
    errors.push(
      `[${lessonKey}] Length mismatch between files: main=${mainSents.length}, script=${scriptSents.length}, central=${centralSents.length}`
    );
    passed = false;
  }

  // Check each sentence
  for (let i = 0; i < mainSents.length; i++) {
    totalSentences++;
    const s = mainSents[i];
    const expectedId = `reading-${padUnit}-s${String(i + 1).padStart(3, "0")}`;

    if (s.id !== expectedId) {
      errors.push(`[${lessonKey}] Sentence id mismatch at [${i}]: got ${s.id}, expected ${expectedId}`);
      passed = false;
    }

    if (seenIds.has(s.id)) {
      errors.push(`[${lessonKey}] Duplicate sentence ID detected: ${s.id}`);
      passed = false;
    }
    seenIds.add(s.id);

    if (!s.english || typeof s.english !== "string" || s.english.trim().length === 0) {
      errors.push(`[${lessonKey}] Empty English text in sentence ${s.id}`);
      passed = false;
    }

    if (!s.korean || typeof s.korean !== "string" || s.korean.trim().length === 0) {
      errors.push(`[${lessonKey}] Empty Korean text in sentence ${s.id}`);
      passed = false;
    }

    // Check companion equality
    const sc = scriptSents[i];
    if (sc.id !== s.id || sc.english !== s.english || sc.korean !== s.korean) {
      errors.push(`[${lessonKey}] Companion script sentence mismatch at ${s.id}`);
      passed = false;
    }

    // Test hover query: simulate finding sentence by id
    const foundInCentral = centralSents.find((cs) => cs.id === s.id);
    if (!foundInCentral || foundInCentral.korean !== s.korean) {
      errors.push(`[${lessonKey}] Hover query test failed for ID ${s.id}`);
      passed = false;
    }
  }
}

console.log(`Audited Lessons:     ${totalLessons} / 256`);
console.log(`Audited JSON Files:  512 / 512`);
console.log(`Total Aligned Sents: ${totalSentences}`);
console.log(`Unique Sentence IDs: ${seenIds.size}`);
console.log(`Total Errors:        ${errors.length}`);

if (errors.length > 0) {
  console.error("\nErrors encountered during audit:");
  errors.slice(0, 30).forEach((err) => console.error(" - " + err));
  if (errors.length > 30) {
    console.error(` ... and ${errors.length - 30} more errors.`);
  }
  process.exit(1);
} else {
  console.log("\n=================================================");
  console.log("  ALL 256 READING LESSONS PASSED 100% PARITY!     ");
  console.log("  1:1 EN-KO Alignment & Unique ID Match Verified   ");
  console.log("=================================================");
  process.exit(0);
}
