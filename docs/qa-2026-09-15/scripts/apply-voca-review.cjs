#!/usr/bin/env node
/**
 * Apply the full-read VOCA corrections.
 *
 *   node docs/qa-2026-09-15/scripts/apply-voca-review.cjs           # 미리보기
 *   node docs/qa-2026-09-15/scripts/apply-voca-review.cjs --write
 *
 * The owner's instruction was to read all 3,877 glosses one at a time rather
 * than screen them, because screening had already been tried and failed: the
 * transliteration rule flagged 컴퓨터, 피아노 and 카메라, which are the correct
 * Korean words, and the one-character rule flagged 폭, 힘 and 섬. Telling a
 * loanword that IS the Korean word from a lazy transliteration takes Korean,
 * not a pattern. docs/qa-2026-09-15/voca-review.json is the result of that read.
 *
 * TWO GUARDS, both of which abort the whole run rather than skip a row:
 *
 *   1. Every `from` must still be the dictionary's current gloss. If one has
 *      moved, someone edited that entry after it was read, and every judgement
 *      in the file is then of unknown age — so nothing is written.
 *   2. Every `word` must be an existing headword, matched exactly. No stemming:
 *      it was tried on READING's cards and turned "notes" into "not" (아니).
 *
 * The same corrections are carried into READING's vocabulary cards, but only
 * where the card's word matches a headword exactly AND the card currently shows
 * the exact string this review named as wrong. A card showing something else is
 * left alone and counted.
 *
 * 🔴 A changed gloss is a changed clip: Ava's key is a hash of the text, so
 * every corrected meaning needs its audio regenerated.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const DICT = path.join(ROOT, "content/voca_dictionary.json");
const RDIR = path.join(ROOT, "content/lessons/reading");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/voca-full-read-corrections.md");

const review = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/voca-review.json"), "utf8"));
const dictText = fs.readFileSync(DICT, "utf8");
const dict = JSON.parse(dictText);
const rows = review.corrections;

/**
 * Keep each file's own formatting. Re-serialising with a fixed indent rewrote
 * every line of 192 READING files for a 333-line change, which buries the edit
 * and makes the diff unreviewable. Take the indent the file already uses.
 */
function indentOf(text) {
  const m = text.match(/\n( +)"/);
  return m ? m[1].length : 2;
}
function writeJson(file, value, original) {
  const text = JSON.stringify(value, null, indentOf(original));
  fs.writeFileSync(file, original.endsWith("\n") ? `${text}\n` : text, "utf8");
}

if (review.reviewed !== Object.keys(dict).length) {
  console.error(
    `표제어는 ${Object.keys(dict).length}개인데 검토 기록은 ${review.reviewed}개입니다.\n` +
      "전수 검토가 아니면 이 스크립트를 돌리지 마세요.",
  );
  process.exit(1);
}

/* ------------------------------------------------------------- 1. 검증 --- */
const problems = [];
const seen = new Set();
for (const row of rows) {
  if (seen.has(row.word)) problems.push(`${row.word} : 같은 단어가 두 번 나옵니다`);
  seen.add(row.word);

  const entry = dict[row.word];
  if (!entry) {
    problems.push(`${row.word} : 사전에 없는 표제어`);
    continue;
  }
  const now = String(entry.meaning ?? "").trim();
  if (now !== row.from) {
    problems.push(`${row.word} : 검토 당시 "${row.from}" → 지금 "${now}"`);
  }
  if (!row.to || row.to === row.from) problems.push(`${row.word} : 고칠 내용이 없습니다`);
}

if (problems.length) {
  console.error(`검증 실패 ${problems.length}건 — 아무것도 쓰지 않았습니다.\n`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

/* ------------------------------------------------- 2. 사전에 적용 --- */
if (WRITE) {
  for (const row of rows) dict[row.word].meaning = row.to;
  writeJson(DICT, dict, dictText);
}

/* --------------------------------- 3. READING 어휘 카드에 옮기기 --- */
const wanted = new Map(rows.map((r) => [r.word.toLowerCase().replace(/\(.*?\)/g, "").trim(), r]));
const cardChanges = [];
let cards = 0, noHeadword = 0, otherGloss = 0;

for (const file of fs.readdirSync(RDIR).sort()) {
  if (!/^pr\d+\.json$/.test(file)) continue;
  const p = path.join(RDIR, file);
  const source = fs.readFileSync(p, "utf8");
  const lesson = JSON.parse(source);
  let touched = false;

  for (const card of lesson.readingVocabulary || []) {
    const word = String(card.word ?? card.english ?? "").trim();
    const key = "korean" in card ? "korean" : "meaning";
    const ko = String(card[key] ?? "").trim();
    if (!word || !ko) continue;
    cards++;

    const row = wanted.get(word.toLowerCase());
    if (!row) { noHeadword++; continue; }
    if (ko !== row.from) { otherGloss++; continue; }

    cardChanges.push({ lesson: file.replace(".json", ""), word, from: ko, to: row.to });
    if (WRITE) { card[key] = row.to; touched = true; }
  }
  if (WRITE && touched) writeJson(p, lesson, source);
}

/* ------------------------------------------------------------ 4. 보고 --- */
const byWhy = {};
for (const r of rows) byWhy[r.why] = (byWhy[r.why] || 0) + 1;

console.log(`VOCA 표제어      : ${Object.keys(dict).length}   (전부 읽음)`);
console.log(`사전 교정        : ${rows.length}`);
for (const [why, n] of Object.entries(byWhy).sort((a, b) => b[1] - a[1])) {
  const label = { pos: "품사가 안 맞음", sense: "뜻이 틀림", partial: "대표 뜻 누락", typo: "띄어쓰기·표기" }[why] || why;
  console.log(`  ${label.padEnd(16)} ${String(n).padStart(4)}`);
}
console.log(`READING 카드     : ${cards}`);
console.log(`  같이 고칠 것    : ${cardChanges.length}`);
console.log(`  이번 교정 대상 아님 : ${noHeadword}`);
console.log(`  뜻이 이미 다름  : ${otherGloss}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const lines = [
  "# VOCA 사전 전수 교정", "",
  `> 표제어 ${Object.keys(dict).length}개를 표본이 아니라 한 건씩 전부 읽고, 그중 ${rows.length}개를 고쳤습니다.`,
  "> 기준은 '학습자를 오도하는가' 하나입니다. 품사가 어긋나 문장에 넣을 수 없거나,",
  "> 뜻 자체가 다르거나, 대표 뜻이 아예 빠진 경우만 손댔습니다.", "",
  "| 단어 | 이전 | 이후 | 이유 |", "|---|---|---|---|",
  ...rows.map((r) => `| ${esc(r.word)} | ${esc(r.from)} | ${esc(r.to)} | ${r.why} |`),
];

const noted = rows.filter((r) => r.note);
if (noted.length) {
  lines.push("", "## 따로 적어둘 것", "");
  for (const r of noted) lines.push(`- **${r.word}** — ${r.note}`);
}

if (cardChanges.length) {
  lines.push("", `## READING 어휘 카드에 같이 반영 — ${cardChanges.length}장`, "",
    "| 레슨 | 단어 | 이전 | 이후 |", "|---|---|---|---|",
    ...cardChanges.map((c) => `| ${c.lesson} | ${esc(c.word)} | ${esc(c.from)} | ${esc(c.to)} |`));
}

fs.writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
else console.log(`\n✅ 사전 ${rows.length}건 · 카드 ${cardChanges.length}장 기록.\n🔴 뜻이 바뀌었으니 Ava 음성을 다시 구우세요.`);
