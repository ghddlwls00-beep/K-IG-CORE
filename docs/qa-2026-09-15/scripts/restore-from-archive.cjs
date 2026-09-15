#!/usr/bin/env node
/**
 * Copy the block text of named lessons back from a fresh extraction.
 *
 *   node docs/qa-2026-09-15/scripts/restore-from-archive.cjs <추출본 content 경로>
 *   node docs/qa-2026-09-15/scripts/restore-from-archive.cjs <경로> --write
 *
 * ONLY `blocks` IS TAKEN. `readingSentences` and `readingVocabulary` are not
 * produced by extraction — they came from a later pass — so copying a whole
 * lesson file from a fresh extract would delete READING's sentence alignment
 * and its 7,168 vocabulary cards. This replaces the block text and leaves every
 * other field of the current file untouched.
 *
 * The lessons here were each confirmed by reading the two versions, not by
 * comparing counts. Counting is what mislabelled `gh1-033`: our copy had two
 * more items than the archive, which read as "we mangled it", when in fact the
 * textbook itself runs two questions together on one line and the extra two
 * items were fabrications appended to the end.
 */
const fs = require("node:fs");
const path = require("node:path");

const FRESH = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const WRITE = process.argv.includes("--write");
if (!FRESH) {
  console.error("사용법: node restore-from-archive.cjs <추출본 content 경로> [--write]");
  process.exit(1);
}
const ROOT = path.resolve(__dirname, "../../..");
const CUR = path.join(ROOT, "content/lessons");

/**
 * Each entry names what was verified, so a later reader can re-check the claim
 * rather than trust the list.
 */
const TARGETS = [
  {
    section: "reading", id: "pr231",
    why: "본문이 깨져 있었습니다(166자). 원본은 UTF-8 로 멀쩡합니다.",
  },
  {
    section: "reading", id: "pr231-1",
    why: "번역이 깨져 있었습니다(341자). 원본의 실제 손상은 8바이트뿐 — CESU-8 로 쓰인 따옴표 두 개였고, 그것 때문에 추출기가 전체를 EUC-KR 로 잘못 읽었습니다. extract.mjs 의 디코더를 고친 뒤 재추출하면 깨짐 0 이 됩니다.",
  },
];

const countBroken = (v) => (JSON.stringify(v).match(/�/g) || []).length;
let changed = 0;

for (const t of TARGETS) {
  const fp = path.join(FRESH, "lessons", t.section, `${t.id}.json`);
  const cp = path.join(CUR, t.section, `${t.id}.json`);
  if (!fs.existsSync(fp)) { console.log(`⚠️  ${t.id}: 추출본에 없음 — 건너뜀`); continue; }
  if (!fs.existsSync(cp)) { console.log(`⚠️  ${t.id}: 현재 content 에 없음 — 건너뜀`); continue; }

  const fresh = JSON.parse(fs.readFileSync(fp, "utf8"));
  const cur = JSON.parse(fs.readFileSync(cp, "utf8"));

  const fb = countBroken(fresh.blocks), cb = countBroken(cur.blocks);
  const fShape = (fresh.blocks || []).map((b) => b.type).join(",");
  const cShape = (cur.blocks || []).map((b) => b.type).join(",");

  console.log(`\n=== ${t.section}/${t.id}`);
  console.log(`  ${t.why}`);
  console.log(`  깨진 문자   현재 ${cb} → 원본 ${fb}`);

  // A different block shape means the two files are not the same page any more;
  // overwriting would move text into the wrong slot.
  if (fShape !== cShape) {
    console.log(`  🔴 블록 구조가 다릅니다 — 건너뜁니다\n     현재: ${cShape}\n     원본: ${fShape}`);
    continue;
  }
  if (fb >= cb) {
    console.log("  ⚪ 원본이 더 낫지 않습니다 — 건너뜁니다");
    continue;
  }

  const keptFields = Object.keys(cur).filter((k) => k !== "blocks");
  cur.blocks = fresh.blocks;
  changed++;
  console.log(`  ✅ blocks 교체 · 유지한 필드: ${keptFields.join(", ")}`);
  const sample = (fresh.blocks || []).filter((b) => typeof b.text === "string")
    .map((b) => b.text).sort((a, b) => b.length - a.length)[0] || "";
  console.log(`     ${sample.slice(0, 90)}`);

  if (WRITE) fs.writeFileSync(cp, JSON.stringify(cur, null, 1), "utf8");
}

console.log(`\n${WRITE ? "✅ 기록" : "dry run"} — ${changed}개 레슨`);
if (WRITE && changed) {
  console.log("🔴 text 가 바뀌었으므로 음성 클립을 다시 구우세요 (PROGRESS.md §3).");
} else if (changed) {
  console.log("--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
}
