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
 * THE COLLECTION MIRRORS `scripts/generate-azure-ava.mjs`, not the other way
 * round: the generator decides what exists in the bucket, this decides what is
 * free, and both walk the lesson JSON with the same `SPEECH_KEYS`. If they
 * drift, the failure is a free lesson going silent for anonymous visitors —
 * the same failure RE-004 hit with STUDENT's `s1-1-1.mp3`. So the probe
 * `docs/qa-2026-09-15/scripts/verify/verify-speech-gate.cjs` fetches the free
 * clips anonymously from a running server and fails if any is denied.
 *
 * `prebuild` and `predev` run this, like `buildValidRoutes.mjs`, and the file
 * is committed so that a bare `npx next build` (which skips `prebuild`) still
 * has a list. No timestamp is written: an unchanged `content/` must yield a
 * byte-identical file.
 *
 *   node scripts/buildFreeSpeechKeys.mjs            # regenerate
 *   node scripts/buildFreeSpeechKeys.mjs --check    # exit 1 if the file is stale
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = path.resolve(import.meta.dirname, "..");
const LESSONS = path.join(ROOT, "content", "lessons");
const OUT_FILE = path.join(ROOT, "src", "lib", "generated", "freeSpeechKeys.json");
const CHECK = process.argv.includes("--check");

/** Same set as scripts/generate-azure-ava.mjs — every field a view can speak. */
const SPEECH_KEYS = new Set([
  "text",
  "en",
  "ko",
  "english",
  "korean",
  "word",
  "lemma",
  "phrase",
  "meaning",
  "searchWord",
  "hanzi",
]);

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
const { vocaSpeechForm } = loadTsModule("src/lib/vocaSpeech.ts");
const { getCollocation } = loadTsModule("src/lib/vocaUtils.ts");
const { generateLiaisonPoints } = loadTsModule("src/lib/listeningUtils.ts");

for (const [name, fn] of Object.entries({
  normalizeUnifiedSpeechText,
  unifiedSpeechKey,
  vocaSpeechForm,
  getCollocation,
  generateLiaisonPoints,
})) {
  if (typeof fn !== "function") throw new Error(`${name} did not load — the free clip list would be wrong`);
}

const readJson = (file) => (fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : null);

function isSpeakable(text) {
  return /[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(text);
}

/**
 * Mirror of the generator's walk: speakable fields, word grids, and each line
 * of a multi-line value.
 *
 * Each value is ALSO added with a leading item number removed. GRAMMAR's
 * `cleanText()` strips "1. " before speaking, so gh1-009 stores "1. I was
 * poor." while the free lesson gh1-008 requests the clip for "I was poor." —
 * found in independent review: that clip answered 403 to anonymous visitors.
 */
function collectValue(value, key, output, inWordGrid = false) {
  if (typeof value === "string") {
    if (SPEECH_KEYS.has(key) || inWordGrid) {
      const add = (v) => {
        output.add(v);
        const unnumbered = v.replace(/^\s*\d+[.)]\s*/, "");
        if (unnumbered !== v) output.add(unnumbered);
      };
      add(value);
      if (value.includes("\n")) for (const line of value.split(/\r?\n/)) add(line);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectValue(item, key, output, inWordGrid);
    return;
  }
  if (!value || typeof value !== "object") return;
  const wordGrid = inWordGrid || value.type === "wordgrid";
  for (const [childKey, childValue] of Object.entries(value)) {
    collectValue(childValue, childKey, output, wordGrid && childKey === "rows");
  }
}

const raw = new Set();
const ldScripts = readJson(path.join(ROOT, "content", "ld_english_scripts.json")) || {};
const dictionary = readJson(path.join(ROOT, "content", "voca_dictionary.json")) || {};
let lessonsSeen = 0;

for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
  // CNN keeps its original broadcast audio and never requests a generated clip.
  if (course === "cnn") continue;
  for (const id of ids) {
    const lesson = readJson(path.join(LESSONS, course, `${id}.json`));
    if (!lesson) throw new Error(`free preview lesson ${course}/${id} has no file — FREE_PREVIEW_LESSON_IDS is stale`);
    lessonsSeen += 1;
    collectValue(lesson, "", raw);

    if (course === "ld") {
      // The LISTENING view reads its English from the supplemental script file,
      // keyed by the base id (`d001-1` -> `d001`). Only the English is spoken;
      // the clinic's liaison cards are the runtime output of the same engine
      // the view calls, so run it rather than guess.
      const rows = ldScripts[id.replace(/-1$/, "")] || [];
      for (const row of rows) {
        if (!row?.en) continue;
        collectValue({ en: row.en }, "", raw);
        if (/[A-Za-z]/.test(row.en) && row.en.trim().split(/\s+/).length > 2) {
          for (const card of generateLiaisonPoints(row.en)) if (card?.original) raw.add(card.original);
        }
      }
    }

    if (course === "phonics") {
      const grid = (lesson.blocks || []).find((b) => b?.type === "wordgrid");
      for (const word of (grid?.rows || []).flat().map((w) => (w || "").trim()).filter(Boolean)) {
        const entry = dictionary[word] || dictionary[word.toLowerCase()];
        if (entry?.meaning) raw.add(entry.meaning);
        raw.add(entry?.searchWord || word);
        const collocation = getCollocation(word, entry?.searchWord);
        if (collocation?.phrase) raw.add(collocation.phrase);
      }
    }
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
if (keys.size < 300) throw new Error(`only ${keys.size} free clip keys — the walk collected almost nothing`);
if (keys.size > 5000) throw new Error(`${keys.size} free clip keys — that is not a preview, something paid leaked in`);

const json = JSON.stringify(output, null, 2) + "\n";
if (CHECK) {
  const current = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, "utf8") : "";
  if (current !== json) {
    console.error(`${path.relative(ROOT, OUT_FILE)} is stale — run: node scripts/buildFreeSpeechKeys.mjs`);
    process.exit(1);
  }
  console.log(`${path.relative(ROOT, OUT_FILE)} is current (${keys.size} keys)`);
} else {
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, json);
  console.log(`wrote ${path.relative(ROOT, OUT_FILE)}: ${lessonsSeen} free lessons, ${keys.size} clip keys`);
}
