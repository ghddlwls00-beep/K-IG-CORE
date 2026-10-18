#!/usr/bin/env node
/**
 * LECTURE — checks that the app's pieces agree with the data (2026-10-17, docs/lecture/만들기-기록.md).
 *
 *   node scripts/lecture/check-lecture-app.mjs [--media <folder>] [--break=<name>]
 *
 *   1. chapters   src/lib/lectureChapters.ts lectureChapterOf (the browser's lock · the lesson route · the end bar) gives
 *                 every one of the 200 ids the chapter content/courses/lecture.json puts it in (the server's lock)
 *   2. names      curriculumPresentation: title '중등 영어독해 N강' · chapter line 'K장 · 중등 영어독해 a~b강' — no English
 *   3. free       generated/freeMediaKeys.json holds exactly the free lectures' page images and pen files (lm001 · lm002),
 *                 and no other lecture key
 *   4. public     no '/audio/lecture/' path and no 'lecture/<id>/p' key in public/ or src/lib/generated/validRoutes.json
 *   5. timeline   (when the local copy of the media is there — .lecture-media/, git-ignored) src/lib/lecturePen.ts builds
 *                 every lecture's timeline with as many segments as its lesson file says, in time order, ending by its length
 *   6. plans      license.ts planOpensCourse: 1M · 1Y · LIFE open LECTURE, the STUDENT passes do not
 *
 * --break=<chapters|names|free|public|timeline|plans> breaks the input of that check on purpose; the check must then FAIL
 * (exit 1) — the proof that it can fail.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i > -1 && args[i + 1] ? args[i + 1] : fallback;
};
const MEDIA = path.resolve(ROOT, arg("--media", ".lecture-media"));
const BREAK = (args.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);

const req = createRequire(import.meta.url);
const ts = req(path.join(ROOT, "node_modules", "typescript"));
function loadTs(rel) {
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, req);
  return mod.exports;
}
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const { lectureChapterOf, LECTURE_STEP_SECTIONS, lectureStepOpen } = loadTs("src/lib/lectureChapters.ts");
const { formatLessonPresentation, formatGroupTitle } = loadTs("src/lib/curriculumPresentation.ts");
const { FREE_PREVIEW_LESSON_IDS } = loadTs("src/lib/license.ts");
const { buildLectureTimeline } = loadTs("src/lib/lecturePen.ts");

const index = readJson("content/courses/lecture.json");
const problems = [];
const results = [];
const check = (name, fn) => {
  const before = problems.length;
  fn();
  results.push(`${problems.length === before ? "PASS" : "FAIL"}  ${name}`);
};

check("1 chapters — lectureChapterOf = the index's chapter, all 200", () => {
  let seen = 0;
  index.groups.forEach((group, i) => {
    for (const id of group.lessons) {
      seen += 1;
      const want = BREAK === "chapters" && id === "lh001" ? i + 2 : i + 1;
      const got = lectureChapterOf(id);
      if (got !== want) problems.push(`chapters: ${id} → ${got}, index says ${want}`);
    }
  });
  if (seen !== 200 || index.groups.length !== 20) problems.push(`chapters: ${index.groups.length} chapters · ${seen} lectures (want 20 · 200)`);
  for (const bad of ["lm000", "lm101", "lh1", "a1-1", "lmx01"]) if (lectureChapterOf(bad) !== null) problems.push(`chapters: '${bad}' is not a lecture id`);
});

check("1b sections — 뼈대세우기 · 문장구조론 · 알파오메가 · 영어독해 in that order; the one-by-one lists as lectureChapters.ts has them", () => {
  const keys = (index.sections || []).map((s) => s.key).join(",");
  if (keys !== "lb,ls,la,reading") problems.push(`sections: ${keys} (want lb,ls,la,reading)`);
  for (const s of LECTURE_STEP_SECTIONS) {
    const inIndex = (index.sections || []).find((x) => x.key === s.key);
    const want = BREAK === "sections" && s.key === "ls" ? [...s.lessons, "ls006"] : s.lessons;
    if (JSON.stringify(inIndex?.lessons) !== JSON.stringify(want)) problems.push(`sections: ${s.key} lessons differ between lecture.json and lectureChapters.ts`);
    if (inIndex?.gate !== "lesson") problems.push(`sections: ${s.key} gate ${inIndex?.gate}`);
    // the one-by-one rule: the first open; each next one only after the one before it
    s.lessons.forEach((id, i) => {
      if (lectureStepOpen(id, () => false) !== (i === 0)) problems.push(`sections: ${id} open with nothing finished = ${i !== 0}`);
      if (i > 0 && !lectureStepOpen(id, (b) => b === s.lessons[i - 1])) problems.push(`sections: ${id} closed after ${s.lessons[i - 1]} finished`);
    });
  }
  const reading = (index.sections || []).find((x) => x.key === "reading");
  if (reading?.gate !== "chapter" || reading.lessons.length !== 200) problems.push(`sections: 영어독해 ${reading?.gate} · ${reading?.lessons.length}`);
  if (index.lessonCount !== index.lessons.length || index.lessons.length !== (index.sections || []).reduce((n, s) => n + s.lessons.length, 0)) problems.push("sections: lesson counts differ");
});

check("2 names — titles and chapter lines in Korean only", () => {
  for (const lesson of index.lessons.filter((l) => /^l[mh]/.test(l.id))) {
    const pres = formatLessonPresentation("lecture", BREAK === "names" && lesson.id === "lm005" ? { ...lesson, label: "Chapter 1" } : lesson);
    const book = lesson.id.startsWith("lm") ? "중등" : "고등";
    const n = Number(lesson.id.slice(2));
    const chapter = lectureChapterOf(lesson.id);
    const first = Math.floor((n - 1) / 10) * 10 + 1;
    if (pres.title !== `${book} 영어독해 ${n}강`) problems.push(`names: ${lesson.id} title '${pres.title}'`);
    if (pres.subtitle !== `${chapter}장 · ${book} 영어독해 ${first}~${first + 9}강`) problems.push(`names: ${lesson.id} line '${pres.subtitle}'`);
    if (/[A-Za-z]/.test(pres.title + pres.subtitle + pres.code)) problems.push(`names: ${lesson.id} has English`);
  }
  index.groups.forEach((group, i) => {
    const head = formatGroupTitle("lecture", group.title);
    if (!head.startsWith(`${i + 1}장 · `)) problems.push(`names: chapter ${i + 1} head '${head}'`);
  });
  for (const s of LECTURE_STEP_SECTIONS) {
    for (const id of s.lessons) {
      const lesson = index.lessons.find((l) => l.id === id);
      const pres = formatLessonPresentation("lecture", lesson ?? { id });
      if (pres.title !== `${s.title} ${Number(id.slice(2))}강` || pres.subtitle !== s.title) problems.push(`names: ${id} '${pres.title}' · '${pres.subtitle}'`);
    }
  }
});

check("3 free — freeMediaKeys has exactly the free lectures' files", () => {
  const free = FREE_PREVIEW_LESSON_IDS.lecture || [];
  // each section's 1·2강 (사장님 2026-10-19)
  const wantFree = (index.sections || []).flatMap((s) => s.lessons.slice(0, 2)).sort();
  if (JSON.stringify([...free].sort()) !== JSON.stringify(wantFree)) problems.push(`free: FREE_PREVIEW_LESSON_IDS.lecture = ${JSON.stringify(free)} (want ${wantFree.join(",")})`);
  const want = new Set();
  for (const id of free) {
    const lesson = readJson(`content/lessons/lecture/${id}.json`);
    // a voiced lecture's pen and voice carry ?v=; a free lecture's voice is as open as its pages and pen
    for (const m of [...lesson.lecture.pages, lesson.lecture.pen, ...(lesson.lecture.audio ? [lesson.lecture.audio] : [])]) want.add(m.src.split("?")[0].slice(1));
  }
  let keys = readJson("src/lib/generated/freeMediaKeys.json").keys.filter((k) => k.startsWith("audio/lecture/"));
  if (BREAK === "free") keys = [...keys, "audio/lecture/lm003/pen.json"];
  for (const k of want) if (!keys.includes(k)) problems.push(`free: ${k} missing — the free lecture would be locked`);
  for (const k of keys) if (!want.has(k)) problems.push(`free: ${k} is listed — a paid lecture's file would be open to anyone`);
});

check("4 public — no lecture media path in public files", () => {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const f = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!["audio", "video"].includes(e.name)) walk(f);
      } else if (/\.(json|js|html|txt|xml|css|svg|webmanifest)$/i.test(e.name)) files.push(f);
    }
  };
  walk(path.join(ROOT, "public"));
  files.push(path.join(ROOT, "src", "lib", "generated", "validRoutes.json"));
  const pattern = /audio\/lecture\/|lecture\/l[mhbsa]\d{3}\/(p\d{3}\.jpg|pen\.json|voice\.mp3)/;
  for (const f of files) {
    let text = fs.readFileSync(f, "utf8");
    if (BREAK === "public" && f.endsWith("search-index.json")) text += "/audio/lecture/lm050/pen.json";
    if (pattern.test(text)) problems.push(`public: ${path.relative(ROOT, f)} holds a lecture media path`);
  }
  if (fs.existsSync(path.join(ROOT, "public", "audio", "lecture"))) problems.push("public: public/audio/lecture exists — paid files must stay in the private bucket");
});

check("6 plans — only an all-pass opens LECTURE (a STUDENT pass does not)", () => {
  const { planOpensCourse } = loadTs("src/lib/license.ts");
  for (const plan of ["1M", "1Y", "LIFE"]) if (!planOpensCourse(plan, "lecture")) problems.push(`plans: ${plan} does not open LECTURE`);
  for (const plan of ["STU", "STU1M", "STU1Y", "STULIFE"]) {
    const opens = BREAK === "plans" && plan === "STU1Y" ? true : planOpensCourse(plan, "lecture");
    if (opens) problems.push(`plans: ${plan} opens LECTURE — 사장님 '올패스로만'`);
  }
});

check("5 timeline — every local pen file builds, counts match the lesson files", () => {
  const dir = path.join(MEDIA, "audio", "lecture");
  if (!fs.existsSync(dir)) {
    results.push("      (no local media copy — skipped)");
    return;
  }
  let built = 0;
  for (const lesson of index.lessons) {
    const file = path.join(dir, lesson.id, "pen.json");
    if (!fs.existsSync(file)) {
      problems.push(`timeline: ${lesson.id} has no local pen.json`);
      continue;
    }
    const pen = JSON.parse(fs.readFileSync(file, "utf8"));
    if (BREAK === "timeline" && lesson.id === "lm010") pen.strokes = pen.strokes.slice(1);
    const data = readJson(`content/lessons/lecture/${lesson.id}.json`).lecture;
    const timeline = buildLectureTimeline(pen);
    built += 1;
    if (timeline.segT.length !== data.pen.segments) problems.push(`timeline: ${lesson.id} ${timeline.segT.length} segments, lesson file says ${data.pen.segments}`);
    if (timeline.strokes.length !== data.pen.strokes) problems.push(`timeline: ${lesson.id} ${timeline.strokes.length} strokes, lesson file says ${data.pen.strokes}`);
    for (let k = 1; k < timeline.segT.length; k++) if (timeline.segT[k] < timeline.segT[k - 1]) { problems.push(`timeline: ${lesson.id} not in time order`); break; }
    const last = timeline.segT[timeline.segT.length - 1] ?? 0;
    if (last * timeline.unitSec > data.durationSec + 0.5) problems.push(`timeline: ${lesson.id} ends at ${(last * timeline.unitSec).toFixed(1)}s, after ${data.durationSec}s`);
    // (the stage is 1020 × 1190: the page 20 px down — a note at the page's very foot reaches 1210 on 문장구조론, drawn to the edge)
    if (pen.canvas.w > 1020 || pen.canvas.h > 1220) problems.push(`timeline: ${lesson.id} canvas ${pen.canvas.w}×${pen.canvas.h} is larger than the view's stage 1020×1170`);
    const pages = new Set(data.pages.map((p) => p.page));
    for (const [, page] of timeline.pageEvents) if (!pages.has(page)) problems.push(`timeline: ${lesson.id} turns to page ${page}, which its lesson file does not list`);
  }
  results.push(`      ${built} timelines built`);
});

for (const line of results) console.log(line);
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`);
  for (const p of problems.slice(0, 40)) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(BREAK ? `\n--break=${BREAK} did NOT fail — the check is broken` : "\nall pass");
if (BREAK) process.exit(2);
