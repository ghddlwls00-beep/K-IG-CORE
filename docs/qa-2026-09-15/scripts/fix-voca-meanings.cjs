#!/usr/bin/env node
/**
 * Correct the 360 VOCA meanings the 2026-09-15 audit flagged.
 *
 *   node docs/qa-2026-09-15/scripts/fix-voca-meanings.cjs           # 미리보기
 *   node docs/qa-2026-09-15/scripts/fix-voca-meanings.cjs --write
 *
 * WHERE THE RIGHT ANSWER COMES FROM. Not the textbook: its VOCA pages carry the
 * English word and nothing else. Measured across all 201 phonics files in the
 * archive, the average page holds 21 Hangul characters and every one of them is
 * the title or the menu — there is no gloss anywhere. The Korean meanings were
 * generated later, which is why "live" reads 라이브 and "see" reads 참조.
 *
 * READING's vocabulary cards do come from the textbook and cover 880 of the
 * 3,877 headwords; 870 of those agree with the dictionary. That confirms the
 * dictionary is mostly sound and locates a few of the bad ones, but it cannot
 * speak for the other 2,997.
 *
 * So these are corrections to the audit's proposals, each read before being
 * accepted. The proposals were right in substance; what needed changing was
 * that some carried a note to the reviewer rather than a meaning a learner can
 * read — "3월 (월 이름 목록 안)", "절약하는 (economic과 구별)", "회색 (현재
 * '회색회색')". A gloss is what appears on the card, so it has to read as one.
 *
 * WHAT IS NOT TOUCHED. The headwords. `calender` and `ancesto` are misspelled in
 * the textbook itself (for `calendar` and `ancestor`), and `gray(grey)` and
 * `colo(u)r` carry the book's bracket notation. Changing a headword changes what
 * the lesson looks up, and the brackets are RE-005's subject. Both are recorded
 * for the owner instead.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const DICT = path.join(ROOT, "content/voca_dictionary.json");
const DEFECTS = path.join(ROOT, "docs/qa-2026-09-15/evidence/voca-meaning-defects.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/voca-corrections.md");

/**
 * Proposals rewritten as glosses. The audit's wording is kept wherever it
 * already reads as one; these are the ones that did not.
 */
const CLEANED = {
  // A parenthetical aimed at the reviewer, not the learner.
  march: "3월; 행진하다",
  may: "5월; ~해도 된다",
  saw: "톱; see의 과거형",
  notebook: "공책",
  economical: "절약하는",
  disinterested: "사심 없는, 공평한",
  historic: "역사적으로 중요한",
  regretful: "후회하는",
  against: "~에 반대하여",
  affair: "일, 사건",
  ecstasy: "황홀경",
  "gray(grey)": "회색",
  "autumn(=fall)": "가을",
  // A second sense the audit put in brackets; a semicolon is how the rest of
  // this dictionary separates senses.
  fly: "날다; 파리",
  cold: "추운; 감기",
  race: "경주; 인종",
  tire: "지치게 하다; 타이어",
  // The proposal was the note "철자 오류 (calendar)" — a meaning still has to go
  // on the card, and the headword itself is left alone.
  calender: "달력",
  ancesto: "조상",
};

/** Headword problems that are the textbook's, for the owner to rule on. */
const HEADWORD_NOTES = [
  ["calender", "calendar 의 철자 오류. 교재가 그렇게 적었습니다."],
  ["ancesto", "ancestor 에서 글자가 잘렸습니다. 교재가 그렇게 적었습니다."],
];

const dict = JSON.parse(fs.readFileSync(DICT, "utf8"));
const defects = Object.values(JSON.parse(fs.readFileSync(DEFECTS, "utf8")));

const meaningKey = (entry) => ("meaning" in entry ? "meaning" : "korean");
const changes = [];
const skipped = [];

for (const d of defects) {
  const entry = dict[d.word];
  if (!entry) { skipped.push({ ...d, why: "표제어 없음" }); continue; }
  const key = meaningKey(entry);
  const now = String(entry[key] ?? "").trim();
  // Only rewrite what the audit actually saw. If it reads differently now,
  // something changed since and the proposal may no longer fit.
  if (now !== d.shown) { skipped.push({ ...d, now, why: "현재 뜻이 감사 시점과 다름" }); continue; }
  const to = CLEANED[d.word] ?? String(d.suggested ?? "").trim();
  if (!to) { skipped.push({ ...d, why: "제안 없음" }); continue; }
  if (to === now) { skipped.push({ ...d, why: "이미 같음" }); continue; }
  changes.push({ word: d.word, key, from: now, to, cls: d.class, lessons: d.lessons });
}

// A gloss carrying a reviewer's aside would ship to the card as written.
const leaked = changes.filter((c) => /현재\s*['"]|와 구별|과 구별|목록 안/.test(c.to));
if (leaked.length) {
  console.error("🔴 중단: 아래 뜻에 검토용 주석이 남아 있습니다. CLEANED 에 추가하세요.");
  for (const c of leaked) console.error(`   ${c.word}  "${c.to}"`);
  process.exit(1);
}

const byClass = {};
for (const c of changes) (byClass[c.cls] ||= []).push(c);

console.log(`고칠 것 : ${changes.length} / ${defects.length}`);
console.log(`건너뜀  : ${skipped.length}`);
for (const [cls, list] of Object.entries(byClass).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${cls.padEnd(18)} ${list.length}`);
}
if (skipped.length) {
  console.log("\n건너뛴 이유:");
  const why = {};
  for (const s of skipped) why[s.why] = (why[s.why] || 0) + 1;
  for (const [w, n] of Object.entries(why)) console.log(`  ${w} : ${n}`);
}
console.log("\n다듬은 것 (감사 제안에 주석이 섞여 있던 것):");
for (const w of Object.keys(CLEANED)) {
  const c = changes.find((x) => x.word === w);
  if (c) console.log(`  ${w.padEnd(16)} "${defects.find((d) => d.word === w)?.suggested}"  →  "${c.to}"`);
}

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# VOCA 뜻 교정", "",
  "> 교재의 VOCA 페이지에는 한글 뜻이 없습니다(201개 파일 평균 한글 21자, 전부 제목·메뉴).",
  "> 뜻은 나중에 생성된 것이고, 아래는 2026-09-15 감사가 잡은 360건을 한 건씩 읽고 교정한 것입니다.", "",
  `교정 ${changes.length}건`, "",
  "| 단어 | 유형 | 이전 | 이후 | 사용 레슨 |", "|---|---|---|---|---|"];
for (const c of changes) {
  L.push(`| ${esc(c.word)} | ${c.cls} | ${esc(c.from)} | ${esc(c.to)} | ${esc((c.lessons || []).join(", "))} |`);
}
L.push("", "## 표제어 자체의 문제 — 교재가 그렇게 적었습니다 (소유자 판단)", "");
for (const [w, note] of HEADWORD_NOTES) L.push(`- \`${w}\` — ${note}`);
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }
for (const c of changes) dict[c.word][c.key] = c.to;
fs.writeFileSync(DICT, JSON.stringify(dict, null, 1), "utf8");
console.log(`\n✅ ${changes.length}건 기록했습니다.`);
