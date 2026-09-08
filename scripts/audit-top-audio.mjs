#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS_ROOT = path.join(ROOT, "content", "lessons");
const AVA_ROOT = path.join(ROOT, "public", "audio", "azure-ava", "v1");
const remoteArg = process.argv.find((arg) => arg.startsWith("--remote-base="));
const REMOTE_BASE = remoteArg ? remoteArg.slice("--remote-base=".length).replace(/\/+$/, "") : "";
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
const pairedByTarget = new Map(
  lessons
    .filter(({ lesson }) => lesson.pairId)
    .map(({ lesson }) => [`${lesson.course}:${lesson.pairId}`, lesson]),
);

function queueFor(lesson) {
  const pair = lesson.pairId
    ? byId.get(`${lesson.course}:${lesson.pairId}`)
    : pairedByTarget.get(`${lesson.course}:${lesson.id}`);
  const pairBlocks = pair?.blocks;
  let target = lesson.variant === "script" && pairBlocks?.length ? pairBlocks : lesson.blocks;

  const ldScript = LD_SCRIPTS[lesson.id] || (pair ? LD_SCRIPTS[pair.id] : null);
  if (lesson.course === "ld" && ldScript?.length) {
    return ldScript.map((item) => normalize(item.en)).filter(Boolean);
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
    if (paired?.items?.[0]?.text) {
      const mainIsEnglish = Boolean(main?.items?.[0]?.text && isEnglish(main.items[0].text));
      if (!mainIsEnglish && isEnglish(paired.items[0].text)) target = pairBlocks;
      else if (mainIsEnglish) target = lesson.blocks;
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


  const legacyNarration = target
    .filter((block) => block.type === "instruction" || block.type === "hints")
    .map((block) => normalize(block.text))
    .filter((text) => /[A-Za-z\u3131-\u318e\u3400-\u9fff\uac00-\ud7a3]/u.test(text));
  if (legacyNarration.length) return legacyNarration;

  const paragraphs = target.filter((block) => block.type === "paragraph");
  return paragraphs.map((block) => normalize(block.text)).filter(Boolean);
}

const failures = [];
const remoteChecks = [];
const courseStats = new Map();
let auditedLessons = 0;
let queuedClips = 0;
let originalTracks = 0;

function topAudioFor(lesson) {
  const deduped = (lesson.audio || []).filter(
    (item, index, all) => all.findIndex((candidate) => candidate.src === item.src) === index,
  );
  if (lesson.course === "grammar1") {
    const english =
      deduped.find((item) => {
        const match = item.src.match(/gh1-(\d+)/);
        return match ? Number.parseInt(match[1], 10) % 2 !== 0 : false;
      }) || deduped.at(-1);
    return english ? [english] : [];
  }
  if (lesson.course === "middle" && deduped.length > 1) return [deduped[0]];
  if (["man", "woman", "student", "chinese"].includes(lesson.course) && deduped.length > 1) {
    return [];
  }
  return deduped;
}

function localPublicFile(src) {
  if (!src || /^https?:\/\//i.test(src)) return null;
  return path.join(ROOT, "public", src.replace(/^\/+/, ""));
}

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

  // Lessons without a sentence queue rely entirely on their original top MP3.
  // Verify those files too, otherwise a missing legacy track would leave the
  // player with no Ava fallback and no audible output.
  if (queue.length === 0) {
    for (const track of topAudioFor(lesson)) {
      originalTracks += 1;
      const audioFile = localPublicFile(track.src);
      if (audioFile && (!fs.existsSync(audioFile) || fs.statSync(audioFile).size < 1_000)) {
        if (REMOTE_BASE) remoteChecks.push({ source: path.relative(ROOT, file), src: track.src });
        else failures.push(`${path.relative(ROOT, file)}: missing original ${track.src}`);
      }
    }
  }

  if (lesson.course === "reading") {
    const expected = lesson.readingSentences?.length || 0;
    if (expected > 0 && queue.length !== expected) {
      failures.push(`${lesson.course}/${lesson.id}: queue ${queue.length}, expected ${expected}`);
    }
  }

  for (const text of queue) {
    const audioFile = path.join(AVA_ROOT, `${speechKey(text)}.mp3`);
    if (!fs.existsSync(audioFile) || fs.statSync(audioFile).size < 1_000) {
      const src = `/audio/azure-ava/v1/${path.basename(audioFile)}`;
      if (REMOTE_BASE) remoteChecks.push({ source: path.relative(ROOT, file), src });
      else failures.push(`${path.relative(ROOT, file)}: missing Ava ${path.basename(audioFile)} (${JSON.stringify(text)})`);
    }
  }
}

if (REMOTE_BASE && remoteChecks.length) {
  const unique = [...new Map(remoteChecks.map((item) => [item.src, item])).values()];
  const workers = Array.from({ length: Math.min(24, unique.length) }, async () => {
    while (unique.length) {
      const item = unique.pop();
      try {
        const response = await fetch(`${REMOTE_BASE}${item.src}`, {
          method: "HEAD",
          signal: AbortSignal.timeout(30_000),
        });
        const size = Number(response.headers.get("content-length") || 0);
        if (!response.ok || (size > 0 && size < 1_000)) {
          failures.push(`${item.source}: remote ${response.status} ${item.src}`);
        }
      } catch (error) {
        failures.push(`${item.source}: remote error ${item.src} (${error.message})`);
      }
    }
  });
  await Promise.all(workers);
}

console.log("=================================================");
console.log(" K-IG TOP AUDIO COMPLETE-QUEUE AUDIT (CNN 제외)");
console.log("=================================================");
console.log(`Audited lessons : ${auditedLessons.toLocaleString("en-US")}`);
console.log(`Queued Ava clips: ${queuedClips.toLocaleString("en-US")}`);
console.log(`Original tracks : ${originalTracks.toLocaleString("en-US")}`);
if (REMOTE_BASE) console.log(`Remote checks   : ${remoteChecks.length.toLocaleString("en-US")}`);
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
