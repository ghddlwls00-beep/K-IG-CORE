#!/usr/bin/env node
/**
 * Does every LISTENING row hold the English that belongs to ITS Korean?
 *
 *   node docs/qa-2026-09-15/scripts/verify/verify-ld-alignment.cjs
 *   node docs/qa-2026-09-15/scripts/verify/verify-ld-alignment.cjs d191
 *
 * This exists because two rebuild passes shipped misaligned lessons and neither
 * was caught before deploy. The first paired by position on equal sentence
 * counts; the second by a cross-language score. Both produced lessons where the
 * Korean described one thing and the English beside it another — d191 was off by
 * three rows, showing "Can I help you?" against "나는 내가 어디로 가기를
 * 원하는지 설명했고 …". Equal counts and a plausible score are not evidence of
 * correspondence.
 *
 * HOW IT CHECKS, WITHOUT COMPARING LANGUAGES. Every row's ORIGINAL English (at
 * 59b37b5, before either pass) was a translation of that row's Korean. So:
 *
 *   1. find which original rows a current row's KOREAN covers — Korean to
 *      Korean, on character shingles so spacing does not matter;
 *   2. check the row's current ENGLISH against the joined original English of
 *      exactly those rows — English to English.
 *
 * ROW MERGES ARE EXPECTED, NOT FAILURES. The textbook breaks sentences across
 * display lines, so a correct rebuild joins those rows back together. An earlier
 * version of this check compared each row against a SINGLE original row and
 * reported 50 lessons as broken when every one of them was right — the merged
 * row's English legitimately spans two originals. Mapping to the covered SET is
 * the difference between a check and a false alarm.
 *
 * A row fails when some other stretch of the lesson matches its English better
 * than the stretch its own Korean came from.
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../../..");
const BASE = "59b37b5";
const only = process.argv.find((a) => /^d\d+$/.test(a));

const now = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const before = JSON.parse(
  execSync(`git show ${BASE}:content/ld_english_scripts.json`, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 28 })
    .replace(/^﻿/, ""),
);

const EN_STOP = new Set(("a an the of to in on at and or but is are was were be been being am i you he she it we they "
  + "this that these those for with as his her their my your there here not no do does did have has had will would can "
  + "could so if then than very much many more most some any all from by about into out up down over under").split(" "));
const stem = (w) => w.replace(/(ies)$/, "y").replace(/(es|s)$/, "").replace(/(ed|ing)$/, "");
const enBag = (s) => new Set(String(s).toLowerCase().replace(/[^a-z0-9'\s]/g, " ").split(/\s+/)
  .filter((w) => w.length > 2 && !EN_STOP.has(w)).map(stem));
/** Korean on 2-character shingles: spacing differs between the two versions. */
const koShingles = (s) => {
  const t = String(s).replace(/[^가-힯0-9A-Za-z]/g, "");
  const out = new Set();
  for (let i = 0; i + 2 <= t.length; i++) out.add(t.slice(i, i + 2));
  return out;
};
const dice = (A, B) => {
  if (!A.size || !B.size) return 0;
  let h = 0;
  for (const x of A) if (B.has(x)) h++;
  return (2 * h) / (A.size + B.size);
};
const contains = (A, B) => {
  if (!B.size) return 0;
  let h = 0;
  for (const x of B) if (A.has(x)) h++;
  return h / B.size;
};

let lessons = 0, failedLessons = 0, rowsChecked = 0, rowsFailed = 0;
const failures = [];

for (const id of Object.keys(now).sort()) {
  if (only && id !== only) continue;
  const cur = now[id] || [], old = before[id] || [];
  if (!cur.length || !old.length) continue;
  lessons++;

  const oldKo = old.map((r) => koShingles(r.ko));
  const oldEn = old.map((r) => r.en);
  let lessonBad = 0;

  for (const row of cur) {
    const kb = koShingles(row.ko);
    if (kb.size < 8) continue;
    // Which original rows does this row's Korean cover? A merged row covers
    // several; take every original whose text is largely inside this row.
    const covered = [];
    oldKo.forEach((ok, i) => { if (ok.size >= 6 && contains(kb, ok) >= 0.75) covered.push(i); });
    if (!covered.length) continue;
    rowsChecked++;

    const eb = enBag(row.en);
    const own = dice(eb, enBag(covered.map((i) => oldEn[i]).join(" ")));

    // Compare against every other window of the same size elsewhere in the
    // lesson. If one of those fits better, this row is holding someone else's
    // English.
    const width = covered.length;
    let best = own, bestAt = covered[0];
    for (let s = 0; s + width <= old.length; s++) {
      if (s === covered[0]) continue;
      const score = dice(eb, enBag(oldEn.slice(s, s + width).join(" ")));
      if (score > best) { best = score; bestAt = s; }
    }
    if (best - own > 0.20) {
      rowsFailed++;
      lessonBad++;
      if (failures.length < 12) {
        failures.push({
          id, n: row.n, off: bestAt - covered[0],
          ko: row.ko, en: row.en, shouldBe: covered.map((i) => oldEn[i]).join(" "),
        });
      }
    }
  }
  if (lessonBad) failedLessons++;
}

console.log(`레슨 ${lessons}개 · 검사한 행 ${rowsChecked}개`);
console.log(`${rowsFailed ? "🔴" : "✅"} 영어가 제 자리에 없는 행 : ${rowsFailed}  (${failedLessons}개 레슨)\n`);
for (const f of failures) {
  console.log(`  ${f.id} #${f.n}   ${f.off > 0 ? "+" : ""}${f.off}칸`);
  console.log(`    KO      ${String(f.ko).slice(0, 78)}`);
  console.log(`    지금 EN ${String(f.en).slice(0, 78)}`);
  console.log(`    원래 EN ${String(f.shouldBe).slice(0, 78)}`);
}
process.exit(rowsFailed ? 1 : 0);
