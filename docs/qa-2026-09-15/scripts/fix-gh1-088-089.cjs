#!/usr/bin/env node
/**
 * KIG-088 — replace the invented answer key on gh1-089, and drop the invented
 * question 20 from both pages.
 *
 *   node docs/qa-2026-09-15/scripts/fix-gh1-088-089.cjs           # dry run
 *   node docs/qa-2026-09-15/scripts/fix-gh1-088-089.cjs --write
 *
 * WHAT WAS WRONG. The textbook page `grammar1/gh1-088.htm` is a translation
 * exercise: nineteen Korean sentences and the instruction "다음 문제를
 * 영작해주세요". It has NO answer key, and that is deliberate — of the 53
 * question pages in GRAMMAR I, 52 have an odd-numbered answer page in the
 * archive and this one alone does not.
 *
 * Our data had one anyway. Its items 1-6 happened to be sound translations;
 * 7-19 were unrelated sentences that translate nothing on the page:
 *
 *     7.  그 반지는 너의 것이냐?          → "Are these adults rich?"
 *     9.  이것은 누구의 조국인가?          → "Whose enemies are they?"
 *     11. 오늘 따뜻하니?                  → "Is your colleague honest?"
 *
 * A learner writing the correct English was marked wrong on thirteen of
 * nineteen questions. Neither sentence set appears anywhere in the archive, so
 * the whole page was generated rather than extracted.
 *
 * Question 20 ("8시 30분이다." / "It is eight thirty.") was invented too, on the
 * Korean side as well: the original ends at 19, and the real question 20 is
 * "지난주는 시원했나?" on the NEXT lesson, gh1-090. Keeping ours would put two
 * different questions at the same number in one course.
 *
 * WHERE THESE ANSWERS COME FROM. They are supplied translations, reviewed and
 * approved by the owner on 2026-09-16 — they are NOT from the textbook, which
 * has none. The style follows the archive's own answer pages: `gh1-091` writes
 * "Was this handgun yours?" and "Do your son(s) and daughter(s) have pets(a
 * pet)?", so the parenthetical-alternative notation here matches the book's.
 *
 * Those parentheses are the KIG-006 shape, and the splitter handles them: run
 * `apply-kig006.cjs` after this so `text` carries the bare wording and the
 * alternatives are graded as correct.
 *
 * 🔴 `text` changes, so the speech clips keyed on its hash no longer match.
 * Regenerate them in the same change — see PROGRESS.md §3.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const P = (id) => path.join(ROOT, "content/lessons/grammar1", `${id}.json`);

/** Owner-approved translations of the nineteen Korean prompts on gh1-088. */
const ANSWERS = {
  1: "Is this your homework(assignment)?",
  2: "Is this prize yours?",
  3: "Is your professor healthy?",
  4: "Whose employees are these girls?",
  5: "Are they police officers(policemen)?",
  6: "Is your employer unhappy?",
  7: "Is the ring yours?",
  8: "Are these gentlemen your clients(customers)?",
  9: "Whose fatherland(homeland) is this?",
  10: "Where am I?",
  11: "Is it warm today?",
  12: "She is not that smart.",
  13: "Was the general brave?",
  14: "Where are the ministers today?",
  15: "The microphone(mike) is still on.",
  16: "Where were the politicians?",
  17: "Was the congressman unhappy?",
  18: "Whose decision was this?",
  19: "Was it hot yesterday?",
};

/** The Korean prompt each answer must correspond to, checked before writing. */
const EXPECTED_KO = {
  1: "이것은 당신의 과제냐?",
  7: "그 반지는 너의 것이냐?",
  12: "그녀는 그렇게 똑똑하지 않다.",
  19: "어제는 더웠나?",
};

function load(id) {
  const p = P(id);
  const j = JSON.parse(fs.readFileSync(p, "utf8"));
  const block = (j.blocks || []).find((b) => b.type === "sentences");
  if (!block || !Array.isArray(block.items)) throw new Error(`${id}: sentences 블록 없음`);
  return { p, j, block };
}

const ko = load("gh1-088");
const en = load("gh1-089");

// Refuse to run against data that is not the shape this script was written for.
// A silent mismatch here would rewrite the wrong sentences.
for (const [n, want] of Object.entries(EXPECTED_KO)) {
  const got = ko.block.items.find((it) => String(it.n) === String(n))?.text;
  if (got !== want) {
    console.error(`🔴 중단: gh1-088 #${n} 이 예상과 다릅니다.\n   기대: ${want}\n   실제: ${got}`);
    process.exit(1);
  }
}

const before = { ko: ko.block.items.length, en: en.block.items.length };

// Drop the invented question 20 from both pages.
ko.block.items = ko.block.items.filter((it) => String(it.n) !== "20");
en.block.items = en.block.items.filter((it) => String(it.n) !== "20");

// Replace every answer, keeping the item order and the number labels.
const changes = [];
for (const it of en.block.items) {
  const want = ANSWERS[Number(it.n)];
  if (!want) { changes.push({ n: it.n, from: it.text, to: null, note: "번호가 1~19 밖" }); continue; }
  if (it.text !== want) changes.push({ n: it.n, from: it.text, to: want });
  it.text = want;
}

const missing = Object.keys(ANSWERS).filter((n) => !en.block.items.some((it) => String(it.n) === n));
if (missing.length) {
  console.error(`🔴 중단: gh1-089 에 번호 ${missing.join(", ")} 이(가) 없습니다.`);
  process.exit(1);
}

console.log(`모드          : ${WRITE ? "WRITE" : "dry run (파일 안 씀)"}`);
console.log(`gh1-088 문항  : ${before.ko} → ${ko.block.items.length}`);
console.log(`gh1-089 문항  : ${before.en} → ${en.block.items.length}`);
console.log(`바뀌는 정답   : ${changes.filter((c) => c.to).length}개\n`);
for (const c of changes) {
  if (!c.to) { console.log(`  ⚠️  #${c.n}  ${c.note}: "${c.from}"`); continue; }
  console.log(`  #${String(c.n).padStart(2)}  전: ${c.from}`);
  console.log(`       후: ${c.to}`);
}

if (!WRITE) {
  console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
  process.exit(0);
}

for (const { p, j } of [ko, en]) fs.writeFileSync(p, JSON.stringify(j, null, 1), "utf8");
console.log("\n✅ 기록했습니다.");
console.log("🔴 text 가 바뀌었으므로 음성 클립을 다시 구우세요:");
console.log("     node scripts/generate-azure-ava.mjs --dry-run");
console.log("     node scripts/generate-azure-ava.mjs --concurrency 4");
console.log("     node scripts/upload-azure-ava-r2.mjs");
