#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — the course index, built from the lesson files that exist (설계 §2 · §7).
 *
 * WHY A SCRIPT. The other courses' indexes (content/courses/<slug>.json) were written once, by the
 * extractor, from the legacy menus. PASS-OFF GRAMMAR's lessons are being written now, a few at a
 * time (content/lessons/passoff-grammar/pgNN-M.json), so its index is derived from the files that
 * are actually there. Run it again whenever a lesson file is added; `prebuild` and `predev` run it
 * first, before buildValidRoutes reads the index.
 *
 * TWO STEPS, IN THIS ORDER:
 *   1. Each free preview lesson (license.ts FREE_PREVIEW_LESSON_IDS["passoff-grammar"]) gives up its
 *      `paidStudent: true` items to content/private/passoff-grammar/<id>.paid.json — the page adds
 *      them back only for a licence (src/lib/passoffSupplement.ts says why). A lesson with none is
 *      left byte for byte as it is.
 *   2. content/courses/passoff-grammar.json: one group per textbook topic ("TOPIC 2. 동사의 현재형",
 *      as `title` and `label` both — studentProgress-style code reads `label`), the lessons in order
 *      pg01-1 · pg01-2 · …, and each lesson summary shaped like the other courses' (types.ts
 *      LessonSummary). Array order is the prev/next order.
 *
 * IT REFUSES TO WRITE A LIST THAT LOOKS WRONG, as buildValidRoutes.mjs does — a failed build is safe,
 * a course list that disagrees with the server is not:
 *   - a file whose name is not pgNN-M, or whose id · course · variant disagree with it;
 *   - two lessons of one topic with different topic labels;
 *   - lessons on disk but the first two cards are not the free preview ids. The course list marks
 *     the first two cards of the first section free by POSITION (CourseDashboard isFreePreviewLesson)
 *     while the server gates by ID, so both must name the same two lessons;
 *   - no lesson file at all — courses.ts lists the course, so the build needs its free lessons.
 *
 *   node scripts/buildPassoffIndex.mjs                    # split, then write the index
 *   node scripts/buildPassoffIndex.mjs --check            # write nothing; exit 1 if a file would change
 *   node scripts/buildPassoffIndex.mjs --content <dir>    # another content root (lessons/ · private/ · courses/ under it) — for tests
 *
 * No timestamp is written: unchanged lesson files give a byte-identical index.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const COURSE = "passoff-grammar";
const CONTENT = process.argv.includes("--content") ? path.resolve(process.argv[process.argv.indexOf("--content") + 1]) : path.join(ROOT, "content");
const LESSON_DIR = path.join(CONTENT, "lessons", COURSE);
const PRIVATE_DIR = path.join(CONTENT, "private", COURSE);
const OUT_FILE = path.join(CONTENT, "courses", `${COURSE}.json`);
const CHECK = process.argv.includes("--check");
const ID = /^pg(\d{2})-(\d+)$/;

/** Only modules without runtime imports can be transpiled alone (license.ts · passoffSupplement.ts). */
function loadTsModule(relativePath) {
  const req = createRequire(import.meta.url);
  const ts = req(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, req);
  return mod.exports;
}

const { FREE_PREVIEW_LESSON_IDS } = loadTsModule("src/lib/license.ts");
const { splitPaidItems, mergePaidEntries, itemIdsOf } = loadTsModule("src/lib/passoffSupplement.ts");
for (const [name, v] of Object.entries({ FREE_PREVIEW_LESSON_IDS, splitPaidItems, mergePaidEntries, itemIdsOf })) {
  if (!v) throw new Error(`${name} did not load — the index and the free/paid split would be wrong`);
}
const FREE = [...(FREE_PREVIEW_LESSON_IDS[COURSE] || [])];
if (FREE.length !== 2) throw new Error(`FREE_PREVIEW_LESSON_IDS["${COURSE}"] should name the two free lessons — it has ${FREE.length}`);

/** "\r\n" or "\n" — a checkout on this machine has CRLF (core.autocrlf), a fresh write LF; compare without it. */
const same = (a, b) => a !== null && b !== null && a.replace(/\r\n/g, "\n") === b.replace(/\r\n/g, "\n");
const readText = (file) => (fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null);
/** Keep a lesson file's own indentation when it is rewritten, so the diff shows only the move. */
const indentOf = (text) => (/^\{\r?\n(\s+)"/.exec(text || "") || [null, "  "])[1];

const problems = [];
const notes = [];
const writes = []; // [file, text, what]

// --- the lesson files ---------------------------------------------------------------------------
const files = fs.existsSync(LESSON_DIR) ? fs.readdirSync(LESSON_DIR).filter((f) => f.endsWith(".json")).sort() : [];
if (files.length === 0) {
  problems.push(
    `no lesson file in content/lessons/${COURSE}/ — courses.ts lists the course, so the build needs at least its free lessons (${FREE.join(", ")})`,
  );
}

const lessons = [];
for (const f of files) {
  const id = f.slice(0, -".json".length);
  const m = ID.exec(id);
  if (!m) {
    problems.push(`${f}: not a lesson name (pgNN-M) — every file in content/lessons/${COURSE}/ becomes a page`);
    continue;
  }
  const file = path.join(LESSON_DIR, f);
  const text = fs.readFileSync(file, "utf8");
  let d;
  try {
    d = JSON.parse(text);
  } catch (e) {
    problems.push(`${f}: not valid JSON (${e.message}) — half written? run again when it is saved`);
    continue;
  }
  if (d.id !== id) problems.push(`${f}: id is "${d.id}", the file name says "${id}"`);
  if (d.course !== COURSE) problems.push(`${f}: course is "${d.course}", not "${COURSE}"`);
  if (d.variant !== "main") problems.push(`${f}: variant is "${d.variant}" — PASS-OFF GRAMMAR lessons are all "main" (데이터-형식.md)`);
  const topic = Number(m[1]);
  const link = Number(m[2]);
  if (d.unit !== topic) notes.push(`${f}: unit ${d.unit} ≠ topic ${topic} in the name (the index uses the name)`);
  if (d.order !== link) notes.push(`${f}: order ${d.order} ≠ link ${link} in the name (the index uses the name)`);
  if (!String(d.title || "").trim()) notes.push(`${f}: no title`);
  if (!String(d.menuLabel || "").trim()) notes.push(`${f}: no menuLabel`);
  if (!String(d.label || "").trim()) notes.push(`${f}: no topic label — the section is called "TOPIC ${topic}"`);
  lessons.push({ id, topic, link, file, text, d });
}
lessons.sort((a, b) => a.topic - b.topic || a.link - b.link);

// --- step 1: the free lessons' paid STUDENT items move to the server-only supplement ------------
const supplementCounts = {};
for (const id of FREE) {
  const lesson = lessons.find((l) => l.id === id);
  if (!lesson) continue; // reported below with the free-preview check
  const { blocks, entries } = splitPaidItems(lesson.d.blocks || []);
  const privateFile = path.join(PRIVATE_DIR, `${id}.paid.json`);
  const storedText = readText(privateFile);
  let stored = null;
  if (storedText !== null) {
    try {
      stored = JSON.parse(storedText);
    } catch (e) {
      problems.push(`content/private/${COURSE}/${id}.paid.json: not valid JSON (${e.message})`);
      continue;
    }
  }
  const merged = mergePaidEntries(stored?.items || [], entries, itemIdsOf(blocks));
  supplementCounts[id] = merged.length;
  if (merged.length || storedText !== null) {
    const supplement = {
      lesson: id,
      note:
        "무료 체험 레슨의 유료 STUDENT 문항 — 이용권이 이 과정을 열 때만 서버가 붙인다(src/lib/passoffContent.ts). " +
        "scripts/buildPassoffIndex.mjs 가 레슨 파일의 paidStudent: true 문항을 옮겨 적는다. 고칠 때는 레슨 파일에 paidStudent: true 로 다시 넣고 스크립트를 돌리거나 여기서 고친다.",
      items: merged,
    };
    const next = JSON.stringify(supplement, null, 2) + "\n";
    if (!same(storedText, next)) writes.push([privateFile, next, `${merged.length} paid item(s) held back from the free page`]);
  }
  if (entries.length) {
    // the supplement is written before the lesson (see the write loop) — a crash in between loses nothing
    const next = JSON.stringify({ ...lesson.d, blocks }, null, indentOf(lesson.text)) + "\n";
    writes.push([lesson.file, next, `${entries.length} paidStudent item(s) moved out: ${entries.map((e) => e.item.id).join(", ")}`]);
    lesson.d = { ...lesson.d, blocks };
  }
  // what the free file will hold after the write — nothing marked paid may stay
  if (JSON.stringify(blocks).includes('"paidStudent":true')) problems.push(`${id}: a paidStudent item is still in the free file after the split`);
}

// --- the free preview agreement ------------------------------------------------------------------
if (lessons.length) {
  const firstTwo = lessons.slice(0, 2).map((l) => l.id);
  if (firstTwo.join() !== FREE.join()) {
    problems.push(
      `the first two cards would be ${firstTwo.join(" · ") || "(none)"}, the free preview ids are ${FREE.join(" · ")} — ` +
        "the course list would call one lesson free and the server another",
    );
  }
}

// --- step 2: the index ---------------------------------------------------------------------------
const groups = [];
for (const l of lessons) {
  const label = String(l.d.label || "").trim() || `TOPIC ${l.topic}`;
  let g = groups.find((x) => x.topic === l.topic);
  if (!g) {
    g = { topic: l.topic, title: label, label, lessons: [] };
    groups.push(g);
  } else if (g.label !== label) {
    problems.push(`TOPIC ${l.topic}: "${g.label}" (${g.lessons[0]}) and "${label}" (${l.id}) — one topic, one label`);
  }
  g.lessons.push(l.id);
}
const index = {
  course: COURSE,
  tab: COURSE,
  lessonCount: lessons.length,
  groups: groups.map(({ title, label, lessons: ids }) => ({ title, label, lessons: ids })),
  lessons: lessons.map(({ id, topic, link, d }) => ({
    id,
    title: d.title ?? id,
    label: d.label ?? null,
    series: d.series ?? "pg",
    variant: "main",
    unit: topic,
    part: typeof d.part === "number" ? d.part : null,
    order: link,
    hasAudio: Array.isArray(d.audio) && d.audio.length > 0,
    menuLabel: d.menuLabel ?? null,
  })),
};
const indexText = JSON.stringify(index, null, 1) + "\n";
if (!same(readText(OUT_FILE), indexText)) writes.push([OUT_FILE, indexText, `${lessons.length} lessons in ${groups.length} topic(s)`]);

// --- refuse, check or write ---------------------------------------------------------------------
const rel = (f) => path.relative(ROOT, f).replace(/\\/g, "/");
if (problems.length) {
  console.error("buildPassoffIndex: refusing to write — fix these first");
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
if (CHECK) {
  if (writes.length) {
    for (const [file, , what] of writes) console.error(`  stale: ${rel(file)} — ${what}`);
    console.error("buildPassoffIndex: run node scripts/buildPassoffIndex.mjs");
    process.exit(1);
  }
  console.log(`buildPassoffIndex: up to date (${lessons.length} lessons, ${groups.length} topics)`);
} else {
  for (const [file, text, what] of writes) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
    console.log(`  wrote ${rel(file)} — ${what}`);
  }
  console.log(
    `buildPassoffIndex: ${writes.length ? "written" : "unchanged"} — ${lessons.length} lessons in ${groups.length} topic(s) · ` +
      `free ${FREE.join(" · ")} · held back ${Object.entries(supplementCounts).map(([id, n]) => `${id} ${n}`).join(" · ") || "none"}`,
  );
}
for (const n of notes) console.log(`  note: ${n}`);
