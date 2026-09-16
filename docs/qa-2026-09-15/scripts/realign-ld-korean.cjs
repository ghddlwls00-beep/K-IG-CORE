#!/usr/bin/env node
/**
 * Re-cut the LISTENING Korean on sentence boundaries, to match the English.
 *
 *   node docs/qa-2026-09-15/scripts/realign-ld-korean.cjs            # dry run
 *   node docs/qa-2026-09-15/scripts/realign-ld-korean.cjs --write
 *   node docs/qa-2026-09-15/scripts/realign-ld-korean.cjs --only d237,d010
 *
 * The English was rebuilt from the recordings, so each entry is now a whole
 * sentence. The Korean was left on the ORIGINAL page's line breaks, which fall
 * mid-sentence — and the side-by-side view pairs the two by index. So a learner
 * reads an English sentence and gets a translation that starts halfway through
 * the previous one:
 *
 *   d237 #2  EN  It is one thing to watch the gleaming silver form of an
 *                airplane overhead, but it is quite another to face the
 *                prospect of boarding that same plane yourself.
 *            KO  …전혀 별개의 것이다. 굉장히 염려하면서 비행기에 타고 자신의 자리에 앉아
 *                                     ↑ this clause belongs to #3
 *
 * Measured before this ran: 77 Korean entries did not finish a sentence and 71
 * began with the remainder of the one before, across 45 of 276 lessons.
 *
 * HOW THE CUT IS CHOSEN. Both texts are the same passage in the same order, so
 * the Korean is split into sentences and each is assigned to the English entry
 * whose share of the passage covers it — by character position, not by counting
 * sentences, because one English sentence often corresponds to two Korean ones
 * and vice versa. Every Korean sentence lands somewhere and none is dropped:
 * the join of the output equals the join of the input, which is asserted.
 *
 * ENGLISH IS NOT TOUCHED — but clips still have to be rebuilt.
 *
 * `generate-azure-ava.mjs:252` collects EVERY string in this file, Korean
 * included, so the translations are spoken too and their clips are keyed on the
 * Korean. Re-cutting the Korean therefore invalidates clips even though not one
 * English character changes: 62 went missing on the run that produced this
 * comment. Leaving the English alone protects the English clips, nothing more.
 *
 * So after --write:
 *     node scripts/generate-azure-ava.mjs --dry-run   # pending > 0 is expected
 *     node scripts/generate-azure-ava.mjs --concurrency 4
 *     node scripts/upload-azure-ava-r2.mjs
 *     node scripts/generate-azure-ava.mjs --dry-run   # pending: 0
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const FILE = path.join(ROOT, "content/ld_english_scripts.json");
const WRITE = process.argv.includes("--write");
const ONLY = (() => {
  const i = process.argv.indexOf("--only");
  return i >= 0 && process.argv[i + 1] ? new Set(process.argv[i + 1].split(",")) : null;
})();

const scripts = JSON.parse(fs.readFileSync(FILE, "utf8"));

/** A Korean sentence ends on a final ending, optionally followed by punctuation. */
const ENDS_SENTENCE = /(다|요|까|죠|네|군|자|오|음|임)[.!?"'”’]*\s*$|[.!?]\s*$/;

/**
 * Split Korean prose into sentences.
 *
 * Splitting on "." alone breaks on the abbreviations and numerals the textbook
 * uses ("Mr.", "1931년 11월 12일", "5마일"), so the cut is made after a final
 * ending — 다/요/까/죠 and friends — optionally carrying its punctuation and any
 * closing quote with it.
 */
function splitKorean(text) {
  const out = [];
  const re = /[^.!?]*?(?:(?:다|요|까|죠|네|군|자|오|음|임)[.!?][")'”’]*|[.!?][")'”’]*)(?=\s|$)/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const piece = text.slice(last, m.index + m[0].length).trim();
    if (piece) out.push(piece);
    last = m.index + m[0].length;
  }
  const tail = text.slice(last).trim();
  if (tail) out.push(tail);
  return out.length ? out : [text.trim()];
}

let changedLessons = 0, changedRows = 0, skipped = 0;
const report = [];

for (const id of Object.keys(scripts)) {
  if (ONLY && !ONLY.has(id)) continue;
  const rows = scripts[id];
  if (!Array.isArray(rows) || rows.length === 0) continue;

  const needs = rows.some((r, i) => {
    const ko = String(r.ko ?? "").trim();
    if (!ko) return false;
    if (!ENDS_SENTENCE.test(ko) && i < rows.length - 1) return true;
    const prev = i > 0 ? String(rows[i - 1].ko ?? "").trim() : "";
    return Boolean(prev) && !ENDS_SENTENCE.test(prev);
  });
  if (!needs) continue;

  const before = rows.map((r) => String(r.ko ?? "").trim());
  const joined = before.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
  const sentences = splitKorean(joined);

  // Assign by share of the passage: an English entry that carries 30% of the
  // English carries the Korean sentences sitting in that 30% of the Korean.
  const enLens = rows.map((r) => String(r.en ?? "").length);
  const enTotal = enLens.reduce((a, b) => a + b, 0) || 1;
  const bounds = [];
  let acc = 0;
  for (const L of enLens) { acc += L; bounds.push(acc / enTotal); }

  const koTotal = sentences.reduce((a, s) => a + s.length, 0) || 1;
  const buckets = rows.map(() => []);
  let pos = 0;
  for (const sent of sentences) {
    const mid = (pos + sent.length / 2) / koTotal;
    let slot = bounds.findIndex((b) => mid <= b);
    if (slot < 0) slot = rows.length - 1;
    buckets[slot].push(sent);
    pos += sent.length;
  }

  // An empty slot would leave an English sentence with no translation at all,
  // which is worse than a misaligned one. Pull from the fullest neighbour.
  for (let i = 0; i < buckets.length; i++) {
    if (buckets[i].length) continue;
    // `i - 1` is -1 at the first slot, and `donor === i - 1` would then be true
    // for the "no donor" case and index buckets[-1].
    const donor = buckets[i - 1]?.length > 1 ? i - 1 : (buckets[i + 1]?.length > 1 ? i + 1 : -1);
    if (donor < 0) continue; // nothing to lend; the guard below rejects the lesson
    if (donor < i) buckets[i].unshift(buckets[donor].pop());
    else buckets[i].push(buckets[donor].shift());
  }

  const after = buckets.map((b) => b.join(" ").trim());

  // Nothing may be lost or invented.
  const norm = (s) => s.replace(/\s+/g, "");
  if (norm(after.join(" ")) !== norm(joined)) {
    console.error(`🔴 ${id}: 재조합 결과가 원문과 다릅니다. 건너뜁니다.`);
    skipped++;
    continue;
  }
  if (after.some((x) => !x)) {
    console.error(`🔴 ${id}: 번역이 비는 칸이 생깁니다. 건너뜁니다.`);
    skipped++;
    continue;
  }

  const rowsChanged = after.filter((x, i) => x !== before[i]).length;
  if (!rowsChanged) continue;
  changedLessons++;
  changedRows += rowsChanged;
  report.push({ id, rows: rowsChanged, before, after, en: rows.map((r) => String(r.en ?? "")) });
  for (let i = 0; i < rows.length; i++) rows[i].ko = after[i];
}

console.log(`모드            : ${WRITE ? "WRITE" : "dry run"}`);
console.log(`재정렬 레슨      : ${changedLessons}`);
console.log(`바뀐 줄          : ${changedRows}`);
if (skipped) console.log(`🔴 건너뛴 레슨   : ${skipped}`);

for (const r of report.slice(0, 3)) {
  console.log(`\n=== ${r.id}`);
  for (let i = 0; i < r.after.length; i++) {
    if (r.before[i] === r.after[i]) continue;
    console.log(`  #${i + 1} EN ${r.en[i].slice(0, 80)}`);
    console.log(`      전 ${r.before[i].slice(0, 80)}`);
    console.log(`      후 ${r.after[i].slice(0, 80)}`);
  }
}

if (!WRITE) {
  console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
  process.exit(0);
}
fs.writeFileSync(FILE, JSON.stringify(scripts, null, 1), "utf8");
console.log("\n✅ 기록했습니다. 영어는 한 글자도 바뀌지 않았습니다.");
console.log("🔴 그래도 음성 클립을 다시 구우세요 — 생성기가 한국어도 수집합니다:");
console.log("     node scripts/generate-azure-ava.mjs --dry-run");
console.log("     node scripts/generate-azure-ava.mjs --concurrency 4");
console.log("     node scripts/upload-azure-ava-r2.mjs");
