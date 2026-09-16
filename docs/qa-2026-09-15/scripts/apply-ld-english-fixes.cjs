#!/usr/bin/env node
/**
 * Apply the LISTENING English corrections.
 *
 *   node docs/qa-2026-09-15/scripts/apply-ld-english-fixes.cjs [--write]
 *
 * LISTENING is a dictation course, so the English script is the answer key. A
 * word the transcriber misheard is a wrong answer key, not a cosmetic slip:
 * d086 #2 asks the learner to write "Businesses and banks are computers to keep
 * financial records."
 *
 * What makes each correction checkable is the Korean. The textbook's own
 * translation says which word was there - d086 #2 is "컴퓨터를 사용한다", so the
 * verb is use - and the corrections file carries that Korean beside every entry.
 *
 * ONE WORD, NEVER A REWRITE. An entry applies only if the current text equals
 * `from` character for character AND `to` differs from it in exactly one word.
 * Anything else is skipped, so a typo in the corrections file cannot quietly
 * rewrite the answer key. Changes that add or drop words are not in `words` at
 * all; they are listed in _one_off and _entry_removals for the owner to decide.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const FILE = path.join(ROOT, "content/ld_english_scripts.json");
const FIXES = path.join(ROOT, "docs/qa-2026-09-15/ld-english-fixes.json");
const WRITE = process.argv.includes("--write");

const scripts = JSON.parse(fs.readFileSync(FILE, "utf8"));
const { words } = JSON.parse(fs.readFileSync(FIXES, "utf8"));

const tokens = (s) => String(s).trim().split(/\s+/);

let applied = 0, skipped = 0, already = 0;
for (const [ref, spec] of Object.entries(words)) {
  const [id, num] = ref.split("#");
  const list = scripts[id];
  const row = Array.isArray(list) ? list.find((r) => String(r.n) === num) : null;
  if (!row) { console.error(`🔴 ${ref}: 없습니다.`); skipped++; continue; }

  const now = String(row.en ?? "");
  if (now === spec.to) { already++; continue; }
  if (now !== spec.from) {
    console.error(`🔴 ${ref}: 지금 문장이 from 과 다릅니다. 건너뜁니다.`);
    console.error(`     지금 ${now}`);
    console.error(`     from ${spec.from}`);
    skipped++;
    continue;
  }

  const a = tokens(spec.from), b = tokens(spec.to);
  const diff = a.length === b.length ? a.reduce((n, w, i) => n + (w === b[i] ? 0 : 1), 0) : -1;
  if (diff !== 1) {
    console.error(`🔴 ${ref}: 단어가 ${diff < 0 ? "개수부터" : diff + " 개"} 다릅니다. 한 단어만 허용합니다. 건너뜁니다.`);
    skipped++;
    continue;
  }

  const i = a.findIndex((w, k) => w !== b[k]);
  console.log(`\n=== ${ref}`);
  console.log(`  전 ${spec.from}`);
  console.log(`  후 ${spec.to}`);
  console.log(`  바뀐 단어 ${a[i]} → ${b[i]}`);
  console.log(`  한국어 ${spec.ko}`);
  row.en = spec.to;
  applied++;
}

console.log(`\n모드      : ${WRITE ? "WRITE" : "dry run"}`);
console.log(`고친 문장 : ${applied}`);
if (already) console.log(`이미 적용 : ${already}`);
if (skipped) console.log(`🔴 건너뜀 : ${skipped}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(skipped ? 1 : 0); }
fs.writeFileSync(FILE, JSON.stringify(scripts, null, 1), "utf8");
console.log("\n✅ 기록했습니다. 음성은 generate-azure-ava 로 다시 만들어야 합니다.");
process.exit(skipped ? 1 : 0);
