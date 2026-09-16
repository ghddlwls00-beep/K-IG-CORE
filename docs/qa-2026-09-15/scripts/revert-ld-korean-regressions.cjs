#!/usr/bin/env node
/**
 * Put back the Korean of the lessons the realignment made worse.
 *
 *   node docs/qa-2026-09-15/scripts/revert-ld-korean-regressions.cjs [--write]
 *
 * `realign-ld-korean.cjs` re-cut the Korean of 33 lessons so it would line up
 * with the rebuilt English. Judged on the boundary checks it was written
 * against, all 33 improved. Judged on whether each pair is actually the same
 * sentence, four got worse — because the script re-derived EVERY boundary in a
 * lesson from character proportions, when the lesson had only one bad boundary
 * to begin with.
 *
 *   d002 had ONE break (the address ran across #4 and #5) and eight entries
 *   that were otherwise correct. Re-cutting all eight shifted the lesson by one:
 *
 *     #3 EN  I live in that house over there. I live on Clayton Street.
 *            The number is 1490.
 *        전  나는 저 너머의 저 집에서 삽니다. 나는 클레이턴 가에서 삽니다.
 *            그 번지(호)는 1490입니다.          ← exactly right
 *        후  나는 클레이턴 가에서 삽니다. … 나의 주소는 클레이턴가 1490번지입니다.
 *                                              ← #4's sentence pulled in
 *
 * Proportional assignment holds when the two languages track each other in
 * length. In a lesson of short factual sentences — an address, two birth years,
 * a job — they do not, and a small drift moves a whole sentence into the wrong
 * slot.
 *
 * So these four go back to what they were. The other 29 stay: measured pair by
 * pair on numbers and length, they went from 16 suspect pairs to 4.
 *
 * The detector is the numbers a translation has to keep. "My grandfather's
 * about 60" is "약 60이다"; if the English has a figure the Korean does not,
 * they are probably not the same sentence. That catches what the
 * sentence-boundary checks cannot see, which is how these four were found.
 */
const fs = require("node:fs");
const path = require("node:path");
const cp = require("node:child_process");

const ROOT = path.resolve(__dirname, "../../..");
const FILE = path.join(ROOT, "content/ld_english_scripts.json");
const WRITE = process.argv.includes("--write");

/** Lessons the realignment made worse, with the score that says so. */
const REGRESSED = {
  d002: "0 → 3  주소·생년이 한 칸씩 밀림",
  d007: "1 → 2  결혼·출생 연도가 한 칸씩 밀림",
  d121: "0 → 1",
  d178: "2 → 3",
};

const BEFORE_REF = "ffa71ef"; // the commit before realign-ld-korean.cjs ran

const now = JSON.parse(fs.readFileSync(FILE, "utf8"));
const before = JSON.parse(
  cp.execSync(`git show ${BEFORE_REF}:content/ld_english_scripts.json`, {
    cwd: ROOT, maxBuffer: 1 << 28, encoding: "utf8",
  }),
);

const nums = (t) => [...String(t).matchAll(/\b\d[\d,.]*\b/g)].map((m) => m[0].replace(/[.,]$/, ""));
const score = (rows) => {
  let bad = 0;
  for (const r of rows || []) {
    const en = String(r.en ?? ""), ko = String(r.ko ?? "");
    if (!en || !ko) continue;
    const missing = nums(en).filter((x) => !nums(ko).includes(x));
    const ratio = ko.length / (en.length || 1);
    if (missing.length || ratio < 0.25 || ratio > 1.3) bad++;
  }
  return bad;
};

let restored = 0;
for (const [id, why] of Object.entries(REGRESSED)) {
  const a = before[id], b = now[id];
  if (!a || !b) { console.error(`🔴 ${id}: 한쪽에 없습니다. 건너뜁니다.`); continue; }
  if (a.length !== b.length) { console.error(`🔴 ${id}: 문장 수가 다릅니다 (${a.length} vs ${b.length}). 건너뜁니다.`); continue; }

  // English must be identical on both sides — this restores translations only,
  // and touching the English would invalidate its clips.
  const enSame = a.every((r, i) => String(r.en ?? "") === String(b[i].en ?? ""));
  if (!enSame) { console.error(`🔴 ${id}: 영어가 다릅니다. 건너뜁니다.`); continue; }

  const sBefore = score(a), sAfter = score(b);
  console.log(`  ${id}  의심 ${sAfter} → ${sBefore}   ${why}`);
  if (sBefore >= sAfter) { console.log(`     ⚪ 되돌려도 나아지지 않습니다. 건너뜁니다.`); continue; }

  for (let i = 0; i < b.length; i++) b[i].ko = a[i].ko;
  restored++;
}

console.log(`\n모드        : ${WRITE ? "WRITE" : "dry run"}`);
console.log(`되돌린 레슨 : ${restored} / ${Object.keys(REGRESSED).length}`);

let total = 0;
for (const id of Object.keys(now)) total += score(now[id]);
console.log(`전체 의심 쌍 : ${total}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }
fs.writeFileSync(FILE, JSON.stringify(now, null, 1), "utf8");
console.log("\n✅ 기록했습니다.");
console.log("🔴 한국어도 음성으로 나갑니다 — 클립을 다시 구우세요:");
console.log("     node scripts/generate-azure-ava.mjs --dry-run");
