#!/usr/bin/env node
/**
 * Carry the corrected VOCA meanings into READING's vocabulary cards.
 *
 *   node docs/qa-2026-09-15/scripts/fix-reading-vocab.cjs           # 미리보기
 *   node docs/qa-2026-09-15/scripts/fix-reading-vocab.cjs --write
 *
 * READING's cards have the same defect the dictionary had: the words come from
 * the passage, but the Korean was generated, so "express" reads 익스프레스 and
 * "private" reads 비공개. Checked against the archive, only 33% of the glosses
 * appear anywhere in the lesson's own source page.
 *
 * DELIBERATELY NARROW. Two conditions, both required:
 *
 *   1. The card's word matches a dictionary headword EXACTLY. Stemming was
 *      tried and rejected: it turns "notes" into "not" and the card would read
 *      아니. An inflected form also loses its inflection in the gloss — "slowed"
 *      would show 느린, an adjective for a verb.
 *   2. The card's current gloss is one the 2026-09-15 audit named as wrong.
 *      Replacing only those means every change swaps a gloss known to be bad
 *      for one that was read by hand, rather than overwriting a card that may
 *      be perfectly good in its own context.
 *
 * Cards that fail either test are left alone and counted. This does not claim
 * to fix READING's vocabulary — it removes the defects that are already
 * identified, and reports how many remain.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const RDIR = path.join(ROOT, "content/lessons/reading");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/reading-vocab-corrections.md");

const dict = JSON.parse(fs.readFileSync(path.join(ROOT, "content/voca_dictionary.json"), "utf8"));
const defects = Object.values(JSON.parse(fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/voca-meaning-defects.json"), "utf8")));

const gloss = (w) => String(dict[w]?.meaning ?? dict[w]?.korean ?? "").trim();
const byLower = new Map();
for (const w of Object.keys(dict)) byLower.set(w.toLowerCase().replace(/\(.*?\)/g, "").trim(), w);

/** The exact strings the audit named as wrong, so only those are replaced. */
const KNOWN_BAD = new Set(defects.map((d) => d.shown));

const changes = [];
let cards = 0, noHeadword = 0, glossNotFlagged = 0, alreadyRight = 0;

for (const f of fs.readdirSync(RDIR).sort()) {
  if (!/^pr\d+\.json$/.test(f)) continue;
  const p = path.join(RDIR, f);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  let touched = false;
  for (const v of j.readingVocabulary || []) {
    const word = String(v.word ?? v.english ?? "").trim();
    const key = "korean" in v ? "korean" : "meaning";
    const ko = String(v[key] ?? "").trim();
    if (!word || !ko) continue;
    cards++;

    const head = byLower.get(word.toLowerCase());
    if (!head) { noHeadword++; continue; }
    if (!KNOWN_BAD.has(ko)) { glossNotFlagged++; continue; }
    const want = gloss(head);
    if (!want || want === ko) { alreadyRight++; continue; }

    changes.push({ lesson: f.replace(".json", ""), word, from: ko, to: want });
    if (WRITE) { v[key] = want; touched = true; }
  }
  if (WRITE && touched) fs.writeFileSync(p, JSON.stringify(j, null, 1), "utf8");
}

console.log(`READING 어휘 카드 : ${cards}`);
console.log(`  고칠 것              : ${changes.length}`);
console.log(`  사전에 표제어 없음    : ${noHeadword}`);
console.log(`  뜻이 지목 대상 아님   : ${glossNotFlagged}`);
console.log(`  이미 맞음            : ${alreadyRight}`);

const byWord = {};
for (const c of changes) (byWord[c.word] ||= []).push(c);
console.log(`\n고치는 단어 ${Object.keys(byWord).length}종:`);
for (const [w, list] of Object.entries(byWord).sort((a, b) => b[1].length - a[1].length).slice(0, 25)) {
  console.log(`  ${w.padEnd(18)} ${String(list.length).padStart(3)}장   "${list[0].from}"  →  "${list[0].to}"`);
}

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# READING 어휘 카드 교정", "",
  "> 카드의 단어는 지문에서 뽑았지만 한글 뜻은 나중에 생성된 것입니다.",
  "> 원본 교재와 대조하니 뜻이 원문 페이지에 있는 것은 33% 뿐이었습니다.", "",
  "> **정확히 일치하는 표제어**이면서 **감사가 틀렸다고 지목한 뜻**을 쓰는 카드만 바꿨습니다.",
  "> 어형변화 매칭은 `notes` 를 `not`(아니) 으로 만들어 쓰지 않았습니다.", "",
  `교정 ${changes.length}장 · ${Object.keys(byWord).length}단어`, "",
  "| 레슨 | 단어 | 이전 | 이후 |", "|---|---|---|---|"];
for (const c of changes) L.push(`| ${c.lesson} | ${esc(c.word)} | ${esc(c.from)} | ${esc(c.to)} |`);
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
else console.log(`\n✅ ${changes.length}장 기록. 🔴 뜻이 바뀌었으니 음성 클립을 다시 구우세요.`);
