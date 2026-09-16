#!/usr/bin/env node
/**
 * Correct the two LISTENING sentences that say something the passage does not.
 *
 *   node docs/qa-2026-09-15/scripts/fix-ld-mistranslations.cjs [--write]
 *
 * All 2,518 sentences were checked against the recordings, not sampled: each
 * one scored on how much of its own wording the recording actually contains,
 * and the 89 that fell below half were read by hand. Of those, 87 turned out to
 * be sound translations that simply chose other words ("They study at their own
 * pace" against "They work at their own speed"). Two were not.
 *
 * d103 #8 — the passage is the Iditarod, which commemorates the 1925 serum run:
 * mushers carried diphtheria antitoxin from Anchorage to Nome. The Korean says
 * 약을 운반했던, "who carried medicine". The English called them a drug dealer
 * transporting drugs. It turns a rescue into trafficking, and it is the kind of
 * sentence a parent notices.
 *
 * d260 #7 — the Korean is 이린이들의 모습 (a typo for 어린이들, "children"), and
 * the recording says "filled with the figures of sledding children". The English
 * read the word as a name and produced "images of Irene", a person who does not
 * exist in the passage.
 *
 * Both rows are halves of a sentence the textbook broke across display lines, so
 * the replacements are written to carry the same half the Korean carries rather
 * than to stand alone. The neighbouring row is corrected with them where the
 * split moved the meaning.
 *
 * 🔴 `en` changes, so the clips keyed on its hash must be rebuilt.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/ld_english_scripts.json");

/**
 * Each entry names the Korean it must match, so this cannot rewrite the wrong
 * row if the data shifts.
 */
const FIXES = [
  {
    id: "d103", n: "8",
    ko: "그 시합은 1925년의 겨울에 앵커리지로부터 Nome으로 약을 운반했던",
    from: "The match took place in the winter of 1925 when a drug dealer was transporting drugs from Anchorage to Nome.",
    to: "The race also follows the route of some brave Alaskans who brought medicine from Anchorage to Nome in the winter of 1925,",
  },
  {
    id: "d103", n: "9",
    ko: "몇몇 용감한 알라스카 사람들의 길도 따라간다.",
    from: "We also follow the path of some brave Alaskans.",
    to: "and it follows their path too.",
  },
  {
    id: "d260", n: "6",
    ko: "그 눈이 충분히 단단하면 이웃의 언덕들은 곧 썰매타는",
    from: "If the snow is hard enough, the neighboring hills will soon be ready for sledding.",
    to: "If the snow is hard enough, the neighboring hills will soon be filled with the figures of",
  },
  {
    id: "d260", n: "7",
    ko: "이린이들의 모습으로 가득 차게 될 것이다.",
    from: "It will be filled with images of Irene.",
    to: "sledding children.",
  },
];

const data = JSON.parse(fs.readFileSync(P, "utf8"));
let ok = 0;
for (const f of FIXES) {
  const row = (data[f.id] || []).find((r) => String(r.n) === f.n);
  if (!row) { console.error(`🔴 ${f.id} #${f.n} 없음`); process.exit(1); }
  if (row.ko !== f.ko) {
    console.error(`🔴 ${f.id} #${f.n} 한국어가 예상과 다릅니다.\n   기대: ${f.ko}\n   실제: ${row.ko}`);
    process.exit(1);
  }
  if (row.en !== f.from) {
    console.error(`🔴 ${f.id} #${f.n} 영어가 예상과 다릅니다 (이미 고쳐졌을 수 있음).\n   기대: ${f.from}\n   실제: ${row.en}`);
    process.exit(1);
  }
  console.log(`${f.id} #${f.n}`);
  console.log(`  KO  ${f.ko}`);
  console.log(`  전  ${f.from}`);
  console.log(`  후  ${f.to}\n`);
  row.en = f.to;
  ok++;
}

if (!WRITE) { console.log(`${ok}건. --write 로 적용됩니다. 아무것도 쓰지 않았습니다.`); process.exit(0); }
fs.writeFileSync(P, JSON.stringify(data, null, 1), "utf8");
console.log(`✅ ${ok}건 기록했습니다.`);
console.log("🔴 음성 클립을 다시 구우세요: node scripts/generate-azure-ava.mjs --dry-run");
