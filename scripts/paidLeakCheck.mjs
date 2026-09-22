#!/usr/bin/env node
/**
 * PAID CONTENT MUST NOT BE IN A PUBLIC FILE — the release condition "공개 파일에 유료 본문 0건".
 *
 * The rule is the audit's own, from `docs/qa-2026-09-18/scripts/probe-bundle-leak-all.cjs`:
 *   - every string of every PAID lesson whose flattened form (letters, digits and Hangul
 *     only) is 20 characters or longer — English and Korean, LISTENING script lines from
 *     content/ld_english_scripts.json, READING vocabulary records (word + lemma), and each
 *     VOCA word-grid row joined in order;
 *   - minus the strings that also exist in a FREE lesson (those are public anyway);
 *   - searched for in the flattened text of the public file.
 * Three differences, each written down where it applies: the probe also skips strings that
 * appear in the rendered home page, which a build cannot render (stricter here); this check
 * ignores case (stricter here); and it skips the course index's lesson titles, which the
 * public course pages list to anyone (see paidNeedles).
 *
 * WHY IT EXISTS (BUG-011, 2026-09-23). Putting each VOCA lesson's word list into
 * public/search-index.json made English-word search work — and published 934 word-grid
 * rows of 193 paid VOCA lessons (the probe's count). `scripts/buildSearchIndex.mjs` now
 * runs this on the index it writes and fails the build on a single hit.
 *
 * Do not make a hit go away by reordering, sorting or splitting the data: that fools the
 * check without removing the content.
 *
 *   node scripts/paidLeakCheck.mjs public/search-index.json [--json]   exit 1 on any hit
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"]; // as the probe
const MIN = 20;

/** Transpile a TS module that has no runtime imports (license.ts) — as buildFreeSpeechKeys.mjs does. */
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

/** The probe's normaliser: decode \uXXXX escapes, keep letters, digits and Hangul. */
export const flat = (s) =>
  String(s || "")
    .replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/[^A-Za-z0-9가-힣]+/g, "");

function collectStrings(v, out) {
  if (typeof v === "string") out.push(v);
  else if (Array.isArray(v)) for (const x of v) collectStrings(x, out);
  else if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v)) if (!/^(id|type|audio|src|image|href|slug|course)$/i.test(k)) collectStrings(x, out);
}

let cache = null;
/** Needles of every paid lesson, grouped by lesson, with the free strings removed. */
export function paidNeedles() {
  if (cache) return cache;
  const { isFreePreviewLesson } = loadTsModule("src/lib/license.ts");
  const routes = JSON.parse(fs.readFileSync(path.join(ROOT, "src/lib/generated/validRoutes.json"), "utf8"));
  const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
  const lessonNeedles = (course, id) => {
    const file = path.join(ROOT, "content/lessons", course, `${id}.json`);
    if (!fs.existsSync(file)) return [];
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    const out = [];
    collectStrings(d, out);
    if (course === "ld") for (const r of scripts[id.replace(/-1$/, "")] || []) out.push(r.en, r.ko);
    const needles = out.map((s) => ({ kind: "text", raw: s, f: flat(s) })).filter((n) => n.f.length >= MIN);
    if (course === "reading") for (const v of d.readingVocabulary || []) needles.push({ kind: "vocab-record", raw: v.word, f: "word" + flat(v.word) + "lemma" + flat(v.lemma) });
    for (const b of d.blocks || []) if (b.type === "wordgrid") for (const row of b.rows || []) {
      const f = flat(row.join(" "));
      if (f.length >= MIN) needles.push({ kind: "grid-row", raw: row.join(" "), f });
    }
    return needles;
  };
  const publicStrings = new Set();
  for (const c of COURSES) for (const id of routes.lessons[c] || []) if (isFreePreviewLesson(c, id)) for (const n of lessonNeedles(c, id)) publicStrings.add(n.f.toLowerCase());
  /**
   * The course index (content/courses/<course>.json) is what the public course pages list to
   * anyone: each lesson's title, label and menu name. Those strings are public by design,
   * like a free lesson's. Without this the check flags STUDENT's 145 lesson titles
   * ("Personality - Outgoing Person (성격 - 외향적인 성격)"), which the probe also counted and
   * the audit's tooling notes (docs/qa-2026-09-18/maps/tooling.md, T-16) identify as public
   * metadata rather than paid body text. Everything inside a lesson file stays checked.
   */
  const listed = [];
  for (const c of COURSES) {
    const file = path.join(ROOT, "content/courses", `${c}.json`);
    if (!fs.existsSync(file)) continue;
    collectStrings(JSON.parse(fs.readFileSync(file, "utf8")), listed);
  }
  // Matched as a SUBSTRING, ignoring case — the probe treats the home page's text the same way.
  // A lesson body line can be the very words of its public title ("to become an interpreter."
  // inside "My Dream - To Become an Interpreter"), which is not a leak.
  const listedText = listed.map((s) => flat(s).toLowerCase()).join("#");
  const byLesson = [];
  for (const c of COURSES) for (const id of routes.lessons[c] || []) {
    if (isFreePreviewLesson(c, id)) continue;
    const seen = new Set();
    const needles = lessonNeedles(c, id)
      .map((n) => ({ ...n, f: n.f.toLowerCase() }))
      .filter((n) => !publicStrings.has(n.f) && !listedText.includes(n.f) && !seen.has(n.f) && seen.add(n.f));
    byLesson.push({ course: c, id, needles });
  }
  cache = byLesson;
  return cache;
}

/**
 * Every paid needle found in `text`. A 20-character window set filters, `includes` confirms.
 * Case is ignored (stricter than the probe): the index keeps a lower-cased copy of its text
 * in `searchText`, where a case-sensitive search would miss a copied line.
 */
export function findPaidLeaks(text) {
  const hay = flat(text).toLowerCase();
  const windows = new Set();
  for (let i = 0; i + MIN <= hay.length; i++) windows.add(hay.slice(i, i + MIN));
  const hits = [];
  let needles = 0;
  const lessons = new Set();
  for (const { course, id, needles: list } of paidNeedles()) {
    for (const n of list) {
      needles++;
      if (!windows.has(n.f.slice(0, MIN)) || !hay.includes(n.f)) continue;
      hits.push({ course, id, kind: n.kind, text: String(n.raw).slice(0, 80) });
      lessons.add(`${course}/${id}`);
    }
  }
  const byCourse = {};
  for (const h of hits) byCourse[h.course] = (byCourse[h.course] || 0) + 1;
  return { needles, rows: hits.length, lessons: lessons.size, byCourse, hits };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const file = process.argv[2];
  if (!file) throw new Error("usage: node scripts/paidLeakCheck.mjs <public file>");
  const r = findPaidLeaks(fs.readFileSync(path.resolve(file), "utf8"));
  if (process.argv.includes("--json")) console.log(JSON.stringify(r, null, 1));
  else {
    console.log(`${file}: paid strings checked ${r.needles} · found ${r.rows} row(s) from ${r.lessons} paid lesson(s) ${JSON.stringify(r.byCourse)}`);
    for (const h of r.hits.slice(0, 8)) console.log(`  ${h.course}/${h.id} ${h.kind}: ${h.text}`);
  }
  process.exit(r.rows ? 1 : 0);
}
