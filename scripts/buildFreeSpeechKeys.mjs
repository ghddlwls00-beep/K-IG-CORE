#!/usr/bin/env node
/**
 * SEC-02 — which pre-generated speech clips may be served WITHOUT a licence.
 *
 * WHY THIS EXISTS. `src/lib/mediaAccess.ts` let every clip under
 * `/audio/azure-ava/v1/` through, on the theory that a clip's key is a hash of
 * its sentence and the sentences of a locked lesson are behind the page gate.
 * That theory assumed the sentences were secret. They are not: the repository
 * that holds `content/` is public, and so is the hash function. Measured on
 * production 2026-09-16, 19 of 20 clips for four locked lessons answered 206
 * to an anonymous Range request.
 *
 * THE GATE NOW ASKS "IS THIS CLIP ONE A FREE LESSON SPEAKS?" and this file is
 * how it knows. Everything a free preview lesson can speak is collected here,
 * hashed with the SAME normalisation and key function the browser uses, and
 * written to `src/lib/generated/freeSpeechKeys.json`. A key in that list is
 * public; any other clip needs a licence session.
 *
 * THE COLLECTION IS THE GENERATOR'S: both call `scripts/lib/spoken-texts.cjs`,
 * the one definition of what a page speaks (7단계 7-2 — they used to share a
 * copied `SPEECH_KEYS` list that also took Korean READING / GRAMMAR text and
 * VOCA meanings no page speaks). If they drift, the failure is a free lesson
 * going silent for anonymous visitors — the same failure RE-004 hit with
 * STUDENT's `s1-1-1.mp3`. So the probe
 * `docs/qa-2026-09-15/scripts/verify/verify-speech-gate.cjs` fetches the free
 * clips anonymously from a running server and fails if any is denied.
 *
 * `prebuild` and `predev` run this, like `buildValidRoutes.mjs`, and the file
 * is committed so that a bare `npx next build` (which skips `prebuild`) still
 * has a list. No timestamp is written: an unchanged `content/` must yield a
 * byte-identical file.
 *
 * BUG-019 (2026-09-23) — the same walk also writes
 * `src/lib/generated/freeMediaKeys.json`: the EXACT media objects the free
 * lessons list in `audio[]` / `video[]` ("audio/student/s1-1-1.mp3" …). The
 * media gate used to call a lesson free when its file name, with trailing
 * "-<number>" parts removed, was a free id — so "audio/ld/d001-999.mp3" counted
 * as d001. Matching the object key against this list closes that without
 * locking the free lessons' own files, whose names carry such suffixes.
 *
 *   node scripts/buildFreeSpeechKeys.mjs            # regenerate
 *   node scripts/buildFreeSpeechKeys.mjs --check    # exit 1 if a file is stale
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS = path.join(ROOT, "content", "lessons");
const OUT_FILE = path.join(ROOT, "src", "lib", "generated", "freeSpeechKeys.json");
const CHECK = process.argv.includes("--check");

const { spokenTexts, pairIdOf } = createRequire(import.meta.url)(path.join(ROOT, "scripts", "lib", "spoken-texts.cjs"));

/**
 * Only modules without runtime imports can be transpiled alone. Each of the
 * modules loaded below has none; if one gains an import this throws instead of
 * silently returning an empty export.
 */
function loadTsModule(relativePath) {
  const file = path.join(ROOT, relativePath);
  const req = createRequire(import.meta.url);
  const ts = req(path.join(ROOT, "node_modules", "typescript"));
  const js = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function("module", "exports", "require", js)(mod, mod.exports, req);
  return mod.exports;
}

const { FREE_PREVIEW_LESSON_IDS } = loadTsModule("src/lib/license.ts");
const { normalizeUnifiedSpeechText, unifiedSpeechKey } = loadTsModule("src/lib/unifiedSpeech.ts");
const { vocaSpeechForm, vocaWordSpeech, readingWordSpeech } = loadTsModule("src/lib/vocaSpeech.ts");
const { getCollocation } = loadTsModule("src/lib/vocaUtils.ts");
const { generateLiaisonPoints, firstSlashAlternative } = loadTsModule("src/lib/listeningUtils.ts");
const { extractSentencesForAudio } = loadTsModule("src/lib/lessonAudioText.ts");
// per-page spoken forms (src/lib/lessonSpeechForm.ts) — a Korean word written in romanization is said in Korean
// (소유자 결정 2026-09-25; the free STUDENT s1-2 among them)
const { lessonSpeechForm } = loadTsModule("src/lib/lessonSpeechForm.ts");

for (const [name, fn] of Object.entries({
  normalizeUnifiedSpeechText,
  unifiedSpeechKey,
  vocaSpeechForm,
  getCollocation,
  generateLiaisonPoints,
  extractSentencesForAudio,
  firstSlashAlternative,
  vocaWordSpeech,
  readingWordSpeech,
  lessonSpeechForm,
})) {
  if (typeof fn !== "function") throw new Error(`${name} did not load — the free clip list would be wrong`);
}

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

function isSpeakable(text) {
  return /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(text);
}

const raw = new Set();
const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json")) || {};
const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json")) || {};
const fns = { vocaSpeechForm, getCollocation, generateLiaisonPoints, extractSentencesForAudio, firstSlashAlternative, vocaWordSpeech, readingWordSpeech, lessonSpeechForm };
let lessonsSeen = 0;

for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
  // CNN keeps its original broadcast audio and never requests a generated clip.
  if (course === "cnn") continue;
  const index = readJson(path.join(ROOT, "content", "courses", `${course}.json`))?.lessons || [];
  for (const id of ids) {
    const lesson = readJson(path.join(LESSONS, course, `${id}.json`));
    if (!lesson) throw new Error(`free preview lesson ${course}/${id} has no file — FREE_PREVIEW_LESSON_IDS is stale`);
    lessonsSeen += 1;
    // What this page speaks (scripts/lib/spoken-texts.cjs) — including what its
    // pair lends it: a Korean GRAMMAR page speaks its English partner's answers
    // (gh1-008 → gh1-009). The pair must be free too, or the page's own speaker
    // buttons would ask for clips a visitor may not hear.
    const pairId = pairIdOf(course, id, index);
    if (pairId && !ids.includes(pairId)) throw new Error(`free preview lesson ${course}/${id} speaks its pair ${pairId}, which is not free — FREE_PREVIEW_LESSON_IDS must list both`);
    const pair = pairId ? { id: pairId, ...(readJson(path.join(LESSONS, course, `${pairId}.json`)) || {}) } : null;
    for (const text of spokenTexts({ course, id, lesson, pair, ldScripts, dictionary, fns })) raw.add(text);
  }
}

const keys = new Set();
for (const value of raw) {
  const clean = normalizeUnifiedSpeechText(vocaSpeechForm(String(value)));
  if (clean && isSpeakable(clean)) keys.add(unifiedSpeechKey(clean));
}

const output = { lessons: lessonsSeen, count: keys.size, keys: [...keys].sort() };

// --- assertions: a wrong list here silences free lessons or leaks paid ones ---
if (lessonsSeen < 20) throw new Error(`only ${lessonsSeen} free lessons collected — expected the whole preview set`);
// 264 keys since 7단계 7-2 (the free pages' spoken text only — the old walk's 517 included Korean
// READING/GRAMMAR text and VOCA meanings no page speaks). Every clip the audit sweeps recorded on a
// free page (3,091 requests) is in the 264.
if (keys.size < 200) throw new Error(`only ${keys.size} free clip keys — the walk collected almost nothing`);
if (keys.size > 5000) throw new Error(`${keys.size} free clip keys — that is not a preview, something paid leaked in`);

// --- BUG-019: the media objects the free lessons list, for an exact match ---
const MEDIA_OUT_FILE = path.join(ROOT, "src", "lib", "generated", "freeMediaKeys.json");
const mediaKeys = new Set();
let mediaLessons = 0;
for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
  // CNN is included here: its two free clips are videos, and the course is
  // left working exactly as it is.
  for (const id of ids) {
    const lesson = readJson(path.join(LESSONS, course, `${id}.json`));
    if (!lesson) throw new Error(`free preview lesson ${course}/${id} has no file — FREE_PREVIEW_LESSON_IDS is stale`);
    mediaLessons += 1;
    for (const media of [...(lesson.audio || []), ...(lesson.video || [])]) {
      const src = String(media?.src || "");
      if (/^\/(audio|video)\//.test(src)) mediaKeys.add(src.slice(1));
    }
  }
}
if (mediaKeys.size < 20) throw new Error(`only ${mediaKeys.size} free media keys — a free lesson would lose its audio`);
if (mediaKeys.size > 200) throw new Error(`${mediaKeys.size} free media keys — that is not a preview, something paid leaked in`);
const mediaOutput = { lessons: mediaLessons, count: mediaKeys.size, keys: [...mediaKeys].sort() };

const outputs = [
  [OUT_FILE, JSON.stringify(output, null, 2) + "\n", `${lessonsSeen} free lessons, ${keys.size} clip keys`],
  [MEDIA_OUT_FILE, JSON.stringify(mediaOutput, null, 2) + "\n", `${mediaLessons} free lessons, ${mediaKeys.size} media keys`],
];
if (CHECK) {
  let stale = false;
  for (const [file, json, what] of outputs) {
    const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
    if (current !== json) {
      console.error(`${path.relative(ROOT, file)} is stale — run: node scripts/buildFreeSpeechKeys.mjs`);
      stale = true;
    } else {
      console.log(`${path.relative(ROOT, file)} is current (${what})`);
    }
  }
  if (stale) process.exit(1);
} else {
  for (const [file, json, what] of outputs) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, json);
    console.log(`wrote ${path.relative(ROOT, file)}: ${what}`);
  }
}
