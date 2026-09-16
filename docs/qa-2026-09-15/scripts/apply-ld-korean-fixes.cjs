#!/usr/bin/env node
/**
 * Apply the hand-written LISTENING Korean corrections.
 *
 *   node docs/qa-2026-09-15/scripts/apply-ld-korean-fixes.cjs [--write]
 *
 * These are the pairs that were shifted by a slot: every Korean entry is a whole
 * sentence, so nothing looks broken, but the sentence sits beside the wrong
 * English. d008 #3 carries only the first half of its English and the second
 * half is the whole of #4; the rest of the lesson follows one place behind.
 *
 * They are written by hand because neither automatic route reaches them. The
 * boundary checks ask whether an entry finishes its sentence, and these do.
 * Re-splitting by character proportion puts them back exactly where they are —
 * run against d008, d011 and d025 it changed nothing — and on lessons of short
 * facts it makes things worse: it shifted d002 by one and had to be reverted.
 *
 * What found them is the numbers a translation has to keep: "about 20 acres only
 * 5 miles from town" is "약 20 에이커… 불과 5마일", so an English figure the
 * Korean lacks means the two are probably not the same sentence.
 *
 * THE TEXT IS MOVED, NEVER REWRITTEN. Per lesson, the corrected entries joined
 * together must contain exactly the characters the current ones do — same
 * characters, different boundaries. A lesson that fails is skipped, so a typo in
 * the corrections file cannot quietly edit the textbook.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const FILE = path.join(ROOT, "content/ld_english_scripts.json");
const FIXES = path.join(ROOT, "docs/qa-2026-09-15/ld-korean-fixes.json");
const WRITE = process.argv.includes("--write");

const scripts = JSON.parse(fs.readFileSync(FILE, "utf8"));
const { lessons } = JSON.parse(fs.readFileSync(FIXES, "utf8"));

const bag = (s) => String(s).replace(/\s+/g, "").split("").sort().join("");

let applied = 0, rows = 0, skipped = 0;
for (const [id, spec] of Object.entries(lessons)) {
  const list = scripts[id];
  if (!Array.isArray(list)) { console.error(`🔴 ${id}: 없습니다.`); skipped++; continue; }

  const touched = Object.keys(spec.ko);
  const idx = new Map(list.map((r, i) => [String(r.n), i]));
  const missing = touched.filter((n) => !idx.has(n));
  if (missing.length) { console.error(`🔴 ${id}: 번호 ${missing.join(", ")} 가 없습니다.`); skipped++; continue; }

  const beforeText = touched.map((n) => String(list[idx.get(n)].ko ?? "")).join(" ");
  const afterText = touched.map((n) => spec.ko[n]).join(" ");
  if (bag(beforeText) !== bag(afterText)) {
    console.error(`🔴 ${id}: 글자가 달라집니다 — 옮기기가 아니라 고쳐쓰기입니다. 건너뜁니다.`);
    const b = bag(beforeText), a = bag(afterText);
    console.error(`     전 ${b.length}자 · 후 ${a.length}자`);
    skipped++;
    continue;
  }

  console.log(`\n=== ${id}  ${spec.why}`);
  for (const n of touched) {
    const i = idx.get(n);
    const was = String(list[i].ko ?? "");
    if (was === spec.ko[n]) continue;
    console.log(`  #${n.padStart(2)} EN ${String(list[i].en ?? "").slice(0, 78)}`);
    console.log(`      전 ${was.slice(0, 78)}`);
    console.log(`      후 ${spec.ko[n].slice(0, 78)}`);
    list[i].ko = spec.ko[n];
    rows++;
  }
  applied++;
}

console.log(`\n모드        : ${WRITE ? "WRITE" : "dry run"}`);
console.log(`적용 레슨   : ${applied}`);
console.log(`바뀐 줄     : ${rows}`);
if (skipped) console.log(`🔴 건너뜀   : ${skipped}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(skipped ? 1 : 0); }
fs.writeFileSync(FILE, JSON.stringify(scripts, null, 1), "utf8");
console.log("\n✅ 기록했습니다.");
process.exit(skipped ? 1 : 0);
