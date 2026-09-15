#!/usr/bin/env node
/**
 * KIG-006 — apply the approved `text` + `alternatives` split to the lesson JSON.
 *
 * RE-RUNNABLE BY DESIGN. Do NOT run this today.
 *
 * `scripts/extract.mjs` (around line 465) OVERWRITES each lesson JSON wholesale
 * when the source archive is re-extracted, which erases any hand-written
 * `alternatives`. So this script is built to be run AFTER a re-extraction: it
 * re-derives the split from the SENTENCE TEXT THAT IS IN THE FILE and rewrites
 * it, rather than depending on any state from the previous run.
 *
 * It is IDEMPOTENT: an item that already carries `text` + `alternatives` is
 * re-derived from its `text` (the author's wording), not re-split, so running it
 * twice produces the same file.
 *
 *   node docs/qa-2026-09-15/scripts/apply-kig006.cjs            # dry run (default)
 *   node docs/qa-2026-09-15/scripts/apply-kig006.cjs --write    # apply
 *   node docs/qa-2026-09-15/scripts/apply-kig006.cjs --write --course grammar1
 *
 * Exit codes: 0 = clean (dry run or write), 1 = verification failed.
 */
const fs = require("fs");
const path = require("path");

// KIG_ROOT_OVERRIDE lets the script run against a COPY of the tree, so the
// write path can be exercised end to end without touching content/.
const ROOT = process.env.KIG_ROOT_OVERRIDE
  ? path.resolve(process.env.KIG_ROOT_OVERRIDE)
  : path.resolve(__dirname, "../../..");
const LESSONS = path.join(ROOT, "content/lessons");
const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은

const argv = process.argv.slice(2);
const WRITE = argv.includes("--write");
const COURSE = (() => {
  const i = argv.indexOf("--course");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : null;
})();

/* ------------------------------------------------------ load the engine ---- */
/**
 * The resolver is imported from report-kig006.cjs so there is exactly ONE
 * implementation. That file is a script, not a module, so it is sliced at the
 * point where it stops defining helpers and starts writing evidence files, and
 * the slice is evaluated IN MEMORY with a `module.exports` appended. A copy
 * would drift; this cannot.
 *
 * Two things about how it is sliced, both deliberate:
 *
 *  - IN MEMORY, not through a temp file. An earlier version wrote the slice
 *    next to this script and deleted it in a `finally`, which left a stray
 *    `_eng-tmp.cjs` behind whenever the process was killed — and that file then
 *    rode along on a `git add -A`. Nothing is written to disk now, so there is
 *    nothing to clean up. `__dirname` is passed through because the engine
 *    resolves `evidence/` relative to it.
 *
 *  - The cut is at the "write out" banner, NOT at check (6). Cutting later let
 *    the report's evidence-writing section execute, so this script — whose own
 *    report line reads "dry run (no files touched)" — rewrote
 *    kig006-classification.md / kig006-polluted.md / kig006-alternatives.json
 *    on every run. Dry run now means dry.
 */
function loadEngine() {
  const enginePath = path.join(__dirname, "report-kig006.cjs");
  // The shebang has to go: `require` strips it, `new Function` does not.
  const raw = fs.readFileSync(enginePath, "utf8").replace(/^#!.*\n/, "");
  const CUT = "/* ---------------------------------------------------------------- write out */";
  const cut = raw.indexOf(CUT);
  if (cut < 0) throw new Error("engine slice marker not found in report-kig006.cjs");
  const body =
    raw.slice(0, cut) +
    "\nmodule.exports = { propose, resolveMultiParen, parseAltMarker, tokenizeParens, isDetachedDeterminer, kindFor };\n";
  const mod = { exports: {} };
  new Function("module", "exports", "require", "__dirname", body)(
    mod,
    mod.exports,
    require,
    __dirname
  );
  return mod.exports;
}

const engine = loadEngine();
const { propose, kindFor } = engine;

/* ------------------------------------------------------------- helpers ----- */
const hasParen = (s) => typeof s === "string" && s.includes("(");

/**
 * KIG-006 is about ENGLISH model answers. Two shapes must be left alone:
 *  - a KOREAN prompt carrying its own bracketed aside (glosses on the question
 *    page: "내가 그것을 너와 공유하지 않았나(너에게 나누어주지 …");
 *  - a CNN glossary line ("antelope: (아프리카,아시아 산(産)의) 영양(羚羊)"), which
 *    is a dictionary entry, not a sentence.
 *
 * The "(혹은 …)" MARKER is not Korean prose — it is the author's "or" notation —
 * so it is removed before the Hangul test. Without that step every
 * cross-product cell was rejected as if it were a Korean prompt, because the
 * marker itself is written in Hangul. 132 cells in GRAMMAR I/II (every
 * "(혹은 …)" row in the corpus) were skipped that way, which meant the
 * parenthetical was never split and shipped into `text` — where the TTS reads
 * the bracket out loud and a learner who types the correct sentence is graded
 * wrong. That is the failure mode the engine treats as the worst one, and it
 * was reachable only because the filter never let those cells through.
 *
 * A cell whose ONLY Hangul is the marker is an English answer; a Korean prompt
 * keeps its Hangul after the marker is removed and is still excluded.
 */
const HAS_HANGUL = /[\uAC00-\uD7AF]/;
const withoutMarker = (s) => String(s).split(ALT_MARK).join("");
const isEnglishAnswer = (s) =>
  typeof s === "string" &&
  s.length > 0 &&
  !HAS_HANGUL.test(withoutMarker(s)) &&
  hasParen(s);

/** Lesson ids whose page carries an English `text` we must rewrite. */
function lessonFiles() {
  const out = [];
  const courses = COURSE ? [COURSE] : fs.readdirSync(LESSONS);
  for (const c of courses) {
    const dir = path.join(LESSONS, c);
    if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) continue;
    for (const f of fs.readdirSync(dir)) {
      if (f.endsWith(".json")) out.push({ course: c, file: path.join(dir, f) });
    }
  }
  return out;
}

/**
 * Rewrite ONE sentence item.
 *
 * The English side lives on the paired `script` page; the Korean side on the
 * `main` page. Only an item whose `text` still has a parenthetical is touched.
 *
 * Idempotence: when the item already carries `alternatives`, the split is
 * re-derived from `text` — which by then is the author's bare wording — so the
 * result is stable across runs.
 */
function splitItem(item, kindFor) {
  if (!item || typeof item.text !== "string") return null;
  if (!hasParen(item.text)) return null; // already split, or nothing to do
  const en = item.text;
  const kind = kindFor(en);
  const p = propose(kind, en);
  if (!p || !p.text || hasParen(p.text)) return null;
  const alts = (p.alternatives || []).filter((a) => a && a !== p.text && !hasParen(a));
  return {
    text: p.text,
    alternatives: [...new Set(alts)],
    // A gloss ("maiden name(family name: last name)") is an explanatory aside,
    // not an answer form, so it carries no terminator by design. Check (4) in
    // report-kig006.cjs exempts it for the same reason.
    gloss: !!p.gloss,
    sourceTerminator: SOURCE_TERMINATOR(en),
  };
}

/* ------------------------------------------------------- terminator gate --- */
/**
 * The terminator the SOURCE cell ends with ("?" / "." / "!"), or "" when the
 * cell carries none. A "(혹은 …)" marker can sit before the sentence's own
 * terminator, so this takes the LAST terminator in the cell rather than the
 * first — and it looks past the periods inside abbreviations like "U.S.".
 */
const SOURCE_TERMINATOR = (s) => {
  const m = String(s).match(/[.?!](?=[^.?!]*$)/);
  return m ? m[0] : "";
};

/** The terminator a produced string ends with, or "". */
const RESULT_TERMINATOR = (s) => {
  const m = String(s).match(/([.?!])\s*$/);
  return m ? m[1] : "";
};

/* ------------------------------------------------------------- classify ---- */
// `kindFor` now lives in report-kig006.cjs (the engine) and is pulled from the
// same slice as `propose`, so the writer and the verifier's check (8) cannot
// disagree about what kind a cell is. See the note above `kindFor` there.

/* ---------------------------------------------------------------- main ----- */
const stats = {
  files: 0,
  items: 0,
  changed: 0,
  // `text` and `alternatives` are counted apart on purpose. `text` is what the
  // speech clips are keyed on (a hash of the sentence), so rewriting it
  // invalidates that sentence's clip; merely ADDING an alternative does not.
  // Reporting the two as one number is how an earlier session concluded "no
  // clip impact" about a pass that in fact rewrote 297 sentences.
  textChanged: 0,
  altOnly: 0,
  skippedNoParen: 0,
  unresolved: [],
  terminatorDrift: [],
  byCourse: {},
};

// Writes are DEFERRED until every file has been examined, so that a terminator
// failure anywhere stops the whole run from touching `content/`. Writing as the
// loop goes would let an earlier file be committed before a later one failed.
const pendingWrites = [];

for (const { course, file } of lessonFiles()) {
  let data;
  try {
    data = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (e) {
    stats.unresolved.push({ file, why: "unparseable JSON: " + e.message });
    continue;
  }
  let dirty = false;
  for (const block of data.blocks || []) {
    if (block.type !== "sentences" || !Array.isArray(block.items)) continue;
    for (const item of block.items) {
      stats.items++;
      if (!item || typeof item.text !== "string") continue;
      // A sentence item that already carries `alternatives` has been through
      // this script before: re-deriving from the (now bare) `text` would be a
      // no-op, so counting it as "clean" keeps the report honest.
      if (!isEnglishAnswer(item.text)) {
        stats.skippedNoParen++;
        continue;
      }
      const split = splitItem(item, kindFor);
      if (!split) {
        stats.unresolved.push({ file: path.basename(file), n: item.n, en: item.text });
        continue;
      }
      // The source cell's own terminator must survive into `text` and into
      // every answer alternative. A "?" quietly becoming "." turns a question
      // into a statement on screen and in the audio, and nothing downstream
      // would catch it: the engine's own check (4) only compares alternatives
      // against `text`, so if `text` itself lost the "?" both sides read "."
      // and it passes. This is the only place that compares against the SOURCE.
      if (split.sourceTerminator) {
        if (RESULT_TERMINATOR(split.text) !== split.sourceTerminator) {
          stats.terminatorDrift.push({
            file: path.basename(file),
            n: item.n,
            what: "text",
            want: split.sourceTerminator,
            got: split.text,
          });
        }
        for (const alt of split.gloss ? [] : split.alternatives) {
          if (RESULT_TERMINATOR(alt) !== split.sourceTerminator) {
            stats.terminatorDrift.push({
              file: path.basename(file),
              n: item.n,
              what: "alt",
              want: split.sourceTerminator,
              got: alt,
            });
          }
        }
      }
      const textChanged = item.text !== split.text;
      const altChanged =
        JSON.stringify(item.alternatives) !== JSON.stringify(split.alternatives);
      if (textChanged || altChanged) {
        item.text = split.text;
        if (split.alternatives.length) item.alternatives = split.alternatives;
        else delete item.alternatives;
        stats.changed++;
        if (textChanged) stats.textChanged++;
        else stats.altOnly++;
        dirty = true;
        stats.byCourse[course] = (stats.byCourse[course] || 0) + 1;
      }
    }
  }
  stats.files++;
  if (dirty) pendingWrites.push({ file, data });
}

// Deferred so a failure anywhere in the corpus blocks EVERY write, not just the
// ones after it.
if (WRITE && !stats.unresolved.length && !stats.terminatorDrift.length) {
  for (const { file, data } of pendingWrites) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2) + "\n", "utf8");
  }
}

/* --------------------------------------------------------------- report ---- */
console.log(`mode               : ${WRITE ? "WRITE" : "dry run (no files touched)"}`);
console.log(`course filter      : ${COURSE || "all"}`);
console.log(`lesson files read  : ${stats.files}`);
console.log(`sentence items     : ${stats.items}`);
console.log(`already clean      : ${stats.skippedNoParen}`);
console.log(`items to rewrite   : ${stats.changed}`);
console.log(`    text changed   : ${stats.textChanged}   <- invalidates this many speech clips`);
console.log(`    alternatives   : ${stats.altOnly}   (added without touching text; no clip impact)`);
for (const [c, n] of Object.entries(stats.byCourse)) console.log(`    ${c.padEnd(12)} ${n}`);
if (stats.textChanged > 0) {
  console.log(
    `\n🔴 ${stats.textChanged} sentences get new text. Clips are keyed on a hash of the text,\n` +
      `   so those clips no longer match. Run the audio pass in the same change:\n` +
      `     node scripts/generate-azure-ava.mjs --dry-run   # pending should be ~${stats.textChanged}\n` +
      `     node scripts/generate-azure-ava.mjs --concurrency 4\n` +
      `     node scripts/upload-azure-ava-r2.mjs\n` +
      `     node scripts/generate-azure-ava.mjs --dry-run   # pending: 0\n` +
      `   Requires .env.local (AZURE_SPEECH_KEY/REGION + R2). See PROGRESS.md §3.`
  );
}
if (stats.unresolved.length) {
  console.log(`\nUNRESOLVED (${stats.unresolved.length}) — a paren survived; fix before applying:`);
  for (const u of stats.unresolved.slice(0, 25)) {
    console.log(`    ${u.file} #${u.n || "?"}: ${u.en}`);
  }
  if (stats.unresolved.length > 25) console.log(`    … and ${stats.unresolved.length - 25} more`);
}
if (stats.terminatorDrift.length) {
  console.log(
    `\nTERMINATOR DRIFT (${stats.terminatorDrift.length}) — the source cell's own "?"/"!"/"." did not survive:`
  );
  for (const d of stats.terminatorDrift.slice(0, 25)) {
    console.log(`    ${d.file} #${d.n} [${d.what}] want "${d.want}" got "${d.got}"`);
  }
  if (stats.terminatorDrift.length > 25) {
    console.log(`    … and ${stats.terminatorDrift.length - 25} more`);
  }
  console.log("    Nothing was written. A question must not ship as a statement.");
}
if (!WRITE) console.log("\nRe-run with --write to apply. Nothing was written.");
else if (!stats.unresolved.length && !stats.terminatorDrift.length) {
  console.log(`\nwrote ${pendingWrites.length} lesson file(s).`);
}
process.exit(stats.unresolved.length || stats.terminatorDrift.length ? 1 : 0);
