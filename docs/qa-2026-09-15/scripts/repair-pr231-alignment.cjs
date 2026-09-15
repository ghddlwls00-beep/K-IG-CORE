#!/usr/bin/env node
/**
 * Rebuild pr231's Korean sentence alignment from the now-readable translation.
 *
 *   node docs/qa-2026-09-15/scripts/repair-pr231-alignment.cjs [--write]
 *
 * `readingSentences` pairs each English sentence with its Korean one for the
 * side-by-side view. pr231's Korean side was built while pr231-1 was being
 * decoded as EUC-KR, so all five pairs carried mojibake — 166 replacement
 * characters — even after the lesson's own blocks were restored. Restoring
 * `blocks` does not touch this field, because extraction never produces it.
 *
 * The translation is now readable (see the CESU-8 note in scripts/extract.mjs),
 * so the Korean is taken from the restored pr231-1 text and split to match the
 * five English sentences. The split is written out here rather than computed:
 * the Korean runs across line breaks that do not fall on sentence boundaries,
 * and a length-ratio guess is how a passage ends up misaligned.
 *
 * Each pair below was checked by reading both sides.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/lessons/reading/pr231.json");
const SOURCE = path.join(ROOT, "content/lessons/reading/pr231-1.json");

/** English sentence → its Korean, read off the restored pr231-1 translation. */
const PAIRS = [
  [
    "Would a modern music composer be your first choice for a hero?",
    "당신은 현대 음악 작곡가를 당신의 첫 번째 영웅으로 선택할 수 있는가?",
  ],
  [
    "Or would you think of the painter of a contemporary masterpiece?",
    "혹은 동시대 걸작을 만들어 낸 화가를 선택할 수 있는가?",
  ],
  [
    "If you are like most people, the answer to both questions is “no.” More likely, a sports hero or a movie star would be your first choice.",
    "당신이 대부분의 일반 사람이라면 두 질문에 대한 대답은 “아니요”이다. 스포츠 영웅 혹은 스타 영화배우가 첫 번째 선택일 것이다.",
  ],
  [
    "It seems that the worlds of contemporary art and music have failed to offer people works that reflect human achievements.",
    "동시대의 예술 음악 세계가 인간의 업적에 영향을 끼칠 수 있는 작품들을 제시하지 못하는 것 같다.",
  ],
  [
    "People, therefore, have lost interest in modern arts and have turned to sports stars and other popular figures to find their role models.",
    "그래서 사람들은 현대 예술에 대한 관심을 잃어버리고 자신의 역할 대상이 될 수 있는 스포츠 스타나 다른 유명한 인사들에게 관심을 돌린다.",
  ],
];

const j = JSON.parse(fs.readFileSync(P, "utf8"));
const rs = j.readingSentences;
if (!Array.isArray(rs)) { console.error("🔴 pr231 에 readingSentences 가 없습니다."); process.exit(1); }

// Guard: the English side is sound and must not move. If it no longer matches,
// this file has been re-generated since and the hand-written split may be stale.
const norm = (s) => String(s).replace(/\s+/g, " ").trim();
for (let i = 0; i < PAIRS.length; i++) {
  if (norm(rs[i]?.english) !== norm(PAIRS[i][0])) {
    console.error(`🔴 중단: 문장 ${i} 의 영어가 예상과 다릅니다.\n   기대: ${PAIRS[i][0]}\n   실제: ${rs[i]?.english}`);
    process.exit(1);
  }
}
if (rs.length !== PAIRS.length) {
  console.error(`🔴 중단: 문장 수가 ${rs.length} 입니다 (기대 ${PAIRS.length}).`);
  process.exit(1);
}

// Guard: every Korean sentence must appear in the restored translation, so this
// cannot quietly invent text the lesson does not contain.
const source = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
const flatKo = (source.blocks || []).filter((b) => typeof b.text === "string")
  .map((b) => b.text).join(" ").replace(/\s+/g, "");
for (const [, ko] of PAIRS) {
  if (!flatKo.includes(ko.replace(/\s+/g, ""))) {
    console.error(`🔴 중단: 이 문장이 복구된 번역문에 없습니다:\n   ${ko}`);
    process.exit(1);
  }
}

const before = (JSON.stringify(rs).match(/�/g) || []).length;
for (let i = 0; i < PAIRS.length; i++) rs[i].korean = PAIRS[i][1];
const after = (JSON.stringify(rs).match(/�/g) || []).length;

console.log(`문장 ${rs.length}개 · 깨진 문자 ${before} → ${after}\n`);
for (let i = 0; i < PAIRS.length; i++) {
  console.log(`  [${i}] ${PAIRS[i][0].slice(0, 62)}`);
  console.log(`      ${PAIRS[i][1].slice(0, 62)}`);
}

/**
 * The paired page carries its own copy of the same alignment, and a title that
 * was decoded the same broken way. A lesson and its translation page are shown
 * from either side, so fixing only one leaves the mojibake reachable.
 */
const pairPath = SOURCE;
const pair = source;
let pairNote = "";
if (Array.isArray(pair.readingSentences) && pair.readingSentences.length === rs.length) {
  const b = (JSON.stringify(pair.readingSentences).match(/�/g) || []).length;
  pair.readingSentences = JSON.parse(JSON.stringify(rs));
  pairNote += `  pr231-1 readingSentences 깨짐 ${b} → 0\n`;
}
// The title came from the same bad decode; take the clean one from the lesson.
if (typeof pair.title === "string" && /�/.test(pair.title) && !/�/.test(j.title)) {
  pairNote += `  pr231-1 title  "${pair.title}"\n            → "${j.title}"\n`;
  pair.title = j.title.replace(/231(?!-1)/, "231-1");
}

if (pairNote) console.log("\n" + pairNote.trimEnd());

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }
fs.writeFileSync(P, JSON.stringify(j, null, 1), "utf8");
if (pairNote) fs.writeFileSync(pairPath, JSON.stringify(pair, null, 1), "utf8");
console.log("\n✅ 기록했습니다. 한국어는 화면 표시용이라 음성 클립에는 영향이 없습니다.");
