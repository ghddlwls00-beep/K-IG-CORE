#!/usr/bin/env node
/**
 * 7단계 7-1 b — the tap-dictation words the audit assembles must be words the APP accepts.
 *
 * STUDENT sentences write alternatives with a slash ("He/She is a very talented artist, too.").
 * The app builds the tiles and the answer key from the RAW sentence (StudentLearningView →
 * generateWordBank(s.text)); one of the pair is right, both together is wrong (CNT-01, 9/16).
 * The audit used to hand the same function a CLEANED sentence (the slash already turned into a
 * space), so it assembled "He She is a very talented artist too" — and s3-3 · s3-4 came back
 * FAIL although the app was doing what was decided.
 *
 * For every routed STUDENT lesson and every English sentence of its first "sentences" block:
 *   audit words = expectations.cjs tileWordsAll (what drive-generic assembles)
 *   app answer  = generateWordBank(raw).acceptedWordSequences, checked with the app's own
 *                 verifyAnyWordSequence; the tiles must also hold every audit word.
 * Expected: 0 sentences where the app would refuse the audit's words or lack a tile.
 *
 *   --break=cleaned   use the OLD audit input (slash → space) for the audit words.
 *                     Must report refusals and exit 1 — proves this check can fail.
 *
 * exit 0 = every sentence accepted · 1 = at least one refused (or the break run, as it should)
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const E = require("./lib/expectations.cjs");
const L = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "cleaned") { console.error(`unknown --break=${BREAK}`); process.exit(2); }

const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const ids = ((routes.lessons || {}).student || []).slice().sort();
if (!ids.length) { console.error("validRoutes has no STUDENT lessons — nothing checked"); process.exit(2); }

const isKo = (s) => /[가-힣]/.test(s);
// the old audit input — docs/qa-2026-09-18/scripts/lib/expectations.cjs cleanItemText + clean, before 7단계
const oldClean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim().replace(/\s+/g, " ").trim();

let sentences = 0, slashed = 0, refused = 0, missingTile = 0, countMismatch = 0;
const lines = [];
for (const id of ids) {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, `content/lessons/student/${id}.json`), "utf8"));
  const block = (d.blocks || []).find((b) => b.type === "sentences");
  const raws = ((block && block.items) || []).map((it) => it && it.text).filter((t) => typeof t === "string" && t.trim() && !isKo(t));
  const auditSets = BREAK === "cleaned"
    ? raws.map((r) => L.generateWordBank(oldClean(r), []).correctWords)
    : (E.expected("student", id).tileWordsAll || []);
  if (auditSets.length !== raws.length) { countMismatch++; lines.push(`${id}: audit has ${auditSets.length} sentence(s), the app has ${raws.length}`); }
  raws.forEach((raw, i) => {
    sentences++;
    if (raw.includes("/")) slashed++;
    const bank = L.generateWordBank(raw, []);
    const words = auditSets[i] || [];
    const ok = L.verifyAnyWordSequence(words, bank.acceptedWordSequences);
    const pool = bank.allTiles.map((t) => t.word.toLowerCase());
    const lacks = words.filter((w) => { const k = pool.indexOf(w.toLowerCase()); if (k < 0) return true; pool.splice(k, 1); return false; });
    if (!ok) { refused++; lines.push(`${id} #${i + 1} REFUSED · audit "${words.join(" ")}" · app accepts "${bank.acceptedWordSequences.map((w) => w.join(" ")).join('" | "')}"`); }
    if (lacks.length) { missingTile++; lines.push(`${id} #${i + 1} NO TILE for ${lacks.join(", ")}`); }
  });
}
console.log(`STUDENT lessons ${ids.length} · English sentences ${sentences} (with a slash ${slashed})${BREAK ? ` · BREAK=${BREAK}` : ""}`);
console.log(`app refuses the audit's words: ${refused} · audit word without a tile: ${missingTile} · sentence-count mismatch: ${countMismatch}`);
for (const l of lines.slice(0, 40)) console.log("  " + l);
if (lines.length > 40) console.log(`  … ${lines.length - 40} more`);
process.exitCode = refused || missingTile || countMismatch ? 1 : 0;
