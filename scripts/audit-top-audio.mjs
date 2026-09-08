#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS_ROOT = path.join(ROOT, "content", "lessons");
const AVA_ROOT = path.join(ROOT, "public", "audio", "azure-ava", "v1");
const LD_SCRIPTS = JSON.parse(
  fs.readFileSync(path.join(ROOT, "content", "ld_english_scripts.json"), "utf8"),
);

function normalize(text) {
  return String(text || "")
    .replace(/^\s*\d+[.)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/:{2,}/g, " ")
    .replace(/-{2,}/g, " ")
    .replace(/[…]+/g, " ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speechKey(text) {
  const clean = normalize(text);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }
  const hex = (value) => (value >>> 0).toString(16).padStart(8, "0");
  return `${clean.length.toString(36)}-${hex(first)}${hex(second)}`;
}

function isEnglish(text) {
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin > hangul;
}

function lessonFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return lessonFiles(full);
    return entry.isFile() && entry.name.endsWith(".json") ? [full] : [];
  });
}

const lessons = lessonFiles(LESSONS_ROOT).map((file) => ({
  file,
  lesson: JSON.parse(fs.readFileSync(file, "utf8")),
}));
const byId = new Map(lessons.map(({ lesson }) => [`${lesson.course}:${lesson.id}`, lesson]));

function queueFor(lesson) {
  const pair = lesson.pairId ? byId.get(`${lesson.course}:${lesson.pairId}`) : null;
  const pairBlocks = pair?.blocks;
  let target = lesson.variant === "script" && pairBlocks?.length ? pairBlocks : lesson.blocks;

  if (lesson.course === "ld" && LD_SCRIPTS[lesson.id]?.length) {
    return LD_SCRIPTS[lesson.id].map((item) => normalize(item.en)).filter(Boolean);
  }
  const reading = lesson.readingSentences?.length ? lesson.readingSentences : pair?.readingSentences;
  if (lesson.course === "reading" && reading?.length) {
    return reading.map((item) => normalize(item.english)).filter(Boolean);
  }

  const grid = target.find((block) => block.type === "wordgrid");
  if (grid?.rows) return grid.rows.flat().map(normalize).filter(Boolean);

  if (lesson.course !== "chinese") {
    const main = lesson.blocks.find((block) => block.type === "sentences");
    const paired = pairBlocks?.find((block) => block.type === "sentences");
    if (main?.items?.[0]?.text && paired?.items?.[0]?.text) {
      if (!isEnglish(main.items[0].text) && isEnglish(paired.items[0].text)) target = pairBlocks;
      else if (isEnglish(main.items[0].text)) target = lesson.blocks;
    }
  }

  const sentenceBlock = target.find((block) => block.type === "sentences");
  if (sentenceBlock?.items?.length) {
    return sentenceBlock.items.map((item) => normalize(item.text)).filter(Boolean);
  }

  if (["man", "woman", "student"].includes(lesson.course)) {
    const paragraphs = target.filter((block) => block.type === "paragraph");
    const usable = paragraphs.map((block) => normalize(block.text)).filter((text) => {
      if (!text || text.includes("K-IG") || text.includes("<font") || text.includes("한/영")) return false;
      if (/^Chapter\s+\d/i.test(text) || text.endsWith(":")) return false;
      if (text === "Greeting and Introduction" || text === "My Personal and Educational Background") return false;
      return isEnglish(text);
    });
    if (usable.length) return usable;
  }

  const paragraphs = target.filter((block) => block.type === "paragraph");
  return paragraphs.map((block) => normalize(block.text)).filter(Boolean);
}

const failures = [];
const courseStats = new Map();
let auditedLessons = 0;
let queuedClips = 0;

for (const { file, lesson } of lessons) {
  if (lesson.course === "cnn") continue;
  auditedLessons += 1;
  const queue = queueFor(lesson);
  queuedClips += queue.length;
  const stat = courseStats.get(lesson.course) || { lessons: 0, queued: 0, originalOnly: 0 };
  stat.lessons += 1;
  stat.queued += queue.length;
  if (queue.length === 0 && lesson.audio?.length) stat.originalOnly += 1;
  courseStats.set(lesson.course, stat);

  if (lesson.course === "reading") {
    const expected = lesson.readingSentences?.length || 0;
    if (expected > 0 && queue.length !== expected) {
      failures.push(`${lesson.course}/${lesson.id}: queue ${queue.length}, expected ${expected}`);
    }
  }

  for (const text of queue) {
    const audioFile = path.join(AVA_ROOT, `${speechKey(text)}.mp3`);
    if (!fs.existsSync(audioFile) || fs.statSync(audioFile).size < 1_000) {
      failures.push(`${path.relative(ROOT, file)}: missing Ava ${path.basename(audioFile)}`);
    }
  }
}

console.log("=================================================");
console.log(" K-IG TOP AUDIO COMPLETE-QUEUE AUDIT (CNN 제외)");
console.log("=================================================");
console.log(`Audited lessons : ${auditedLessons.toLocaleString("en-US")}`);
console.log(`Queued Ava clips: ${queuedClips.toLocaleString("en-US")}`);
for (const [course, stat] of [...courseStats].sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`${course.padEnd(10)} lessons=${String(stat.lessons).padStart(4)} clips=${String(stat.queued).padStart(5)} original-only=${String(stat.originalOnly).padStart(4)}`);
}
console.log(`Failures        : ${failures.length}`);
if (failures.length) {
  for (const failure of failures.slice(0, 100)) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("ALL TOP AUDIO QUEUES AND AVA FILES PASSED");
}
