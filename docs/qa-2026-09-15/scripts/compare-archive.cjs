#!/usr/bin/env node
/**
 * Compares a freshly extracted tree against the content/ that is live, and says
 * which side to believe for every field that differs.
 *
 *   node docs/qa-2026-09-15/scripts/compare-archive.cjs <추출된 content 경로>
 *   node docs/qa-2026-09-15/scripts/compare-archive.cjs <경로> --full   # Tier 2 전수
 *
 * Why a copy: extract.mjs writes each lesson file whole (extract.mjs:465) and
 * never produces readingSentences or readingVocabulary — those came from a
 * later pass. Extracting over content/ therefore deletes READING's sentence
 * alignment and its 7,168 vocabulary cards, plus the STUDENT reordering and
 * everything else curated since. So extraction goes to a copy and this script
 * reads both trees; nothing is written to either.
 *
 * To produce the extracted tree:
 *   1. copy the repo to a short path, e.g. C:\kigextract
 *   2. cd C:\kigextract && node scripts/extract.mjs --src "<아카이브>" --no-media
 *      (extract.mjs resolves ROOT from its own location, so the copy is
 *       self-contained and the real repo is untouched)
 *   3. node <이 스크립트> C:\kigextract\content
 */
const fs = require("fs");
const path = require("path");

const FRESH = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
const FULL = process.argv.includes("--full");
if (!FRESH) {
  console.error("사용법: node compare-archive.cjs <추출된 content 경로> [--full]");
  process.exit(1);
}
const REPO = path.resolve(__dirname, "../../..");
const CURRENT = path.join(REPO, "content");
const CHECKLIST = path.join(REPO, "docs/qa-2026-09-15/evidence/archive-checklist.json");

for (const [label, p] of [["추출본", FRESH], ["현재", CURRENT]]) {
  if (!fs.existsSync(p)) { console.error(`${label} 경로 없음: ${p}`); process.exit(1); }
}
if (path.resolve(FRESH) === path.resolve(CURRENT)) {
  console.error("추출본과 현재 content/ 가 같은 경로입니다. 복사본에서 추출하세요.");
  process.exit(1);
}

const LIVE = ["ld", "reading", "student", "phonics", "grammar1", "grammar2"];
const load = (root, course, id) => {
  const f = path.join(root, "lessons", course, `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return null; }
};
const itemsOf = (j) =>
  (j?.blocks || []).filter((b) => b.type === "sentences").flatMap((b) => b.items || []);
const norm = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const REPLACEMENT = /\uFFFD/;

// ---------------------------------------------------------------- inventory
console.log("=== 레슨 파일 존재 여부 ===");
const onlyFresh = [], onlyCurrent = [];
for (const course of LIVE) {
  const fd = path.join(FRESH, "lessons", course);
  const cd = path.join(CURRENT, "lessons", course);
  const F = new Set(fs.existsSync(fd) ? fs.readdirSync(fd).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : []);
  const C = new Set(fs.existsSync(cd) ? fs.readdirSync(cd).filter((f) => f.endsWith(".json")).map((f) => f.slice(0, -5)) : []);
  for (const id of F) if (!C.has(id)) onlyFresh.push(`${course}/${id}`);
  for (const id of C) if (!F.has(id)) onlyCurrent.push(`${course}/${id}`);
  console.log(`  ${course.padEnd(10)} 추출 ${String(F.size).padStart(4)} · 현재 ${String(C.size).padStart(4)}`);
}
console.log(`\n${onlyFresh.length ? "🔴" : "✅"} 원본에만 있음 (= 유실된 레슨) ${onlyFresh.length}`);
for (const s of onlyFresh.slice(0, 25)) console.log(`     ${s}`);
if (onlyFresh.length > 25) console.log(`     … 외 ${onlyFresh.length - 25}`);
console.log(`\n${onlyCurrent.length ? "🟡" : "✅"} 현재에만 있음 (= 추출 이후 추가분) ${onlyCurrent.length}`);
for (const s of onlyCurrent.slice(0, 10)) console.log(`     ${s}`);

// ---------------------------------------------------------------- checklist
if (!fs.existsSync(CHECKLIST)) {
  console.log("\n(archive-checklist.json 없음 — Tier 1 대조 생략)");
} else {
  const { suspects } = JSON.parse(fs.readFileSync(CHECKLIST, "utf8"));
  console.log(`\n=== Tier 1 · 의심 ${suspects.length}건 대조 ===`);

  const verdict = { ARCHIVE_FIXES: [], SAME_IN_BOTH: [], NOT_IN_ARCHIVE: [], NEEDS_EYES: [], UNVERIFIABLE: [] };

  /**
   * Findings the archive cannot speak to, because their data never came from it.
   *
   * `extract.mjs` builds lesson files out of the textbook HTML. It does NOT
   * produce `voca_dictionary.json` or `ld_english_scripts.json` — those were
   * generated later, by other means. The raw textbook pages confirm it: the
   * VOCA tables in `phonics/*.htm` carry the English word and nothing else
   * (mv1-03 holds "live" and 150 Hangul characters in total, all of them page
   * furniture — no gloss anywhere). So the Korean meanings were never in the
   * textbook, and neither were the LISTENING English scripts.
   *
   * The first run of this comparison reported all 376 VOCA-meaning findings and
   * all 116 truncated-sentence findings as "원본도 동일 — 원본부터 그랬음": a
   * verdict of "the textbook was always like this". It was wrong, and wrong in
   * the most dangerous direction — it exonerated defects. The cause was that the
   * extraction had been run over a COPY of content/, so every file extraction
   * does not write stayed behind as our own data, and the comparison read it as
   * the archive's. It was comparing those files with themselves.
   *
   * Extracting into an empty tree fixes that, but then the files are simply
   * absent — and "absent" must not be read as "the lesson is missing from the
   * archive" either. Hence a bucket of its own: these need a source other than
   * the textbook, and saying so is the honest answer.
   */
  const NOT_IN_ARCHIVE_SOURCES = {
    MEANING_TRANSLITERATION: "voca_dictionary.json",
    MEANING_WRONG_SENSE: "voca_dictionary.json",
    MEANING_POS: "voca_dictionary.json",
    MEANING_NOT_KOREAN: "voca_dictionary.json",
    MEANING_MALFORMED: "voca_dictionary.json",
    MEANING_INAPPROPRIATE: "voca_dictionary.json",
    WORD_MALFORMED: "voca_dictionary.json",
    SENTENCE_TRUNCATED: "ld_english_scripts.json",
    VOCAB_NOT_IN_PASSAGE: "readingVocabulary (별도 생성)",
  };

  for (const s of suspects) {
    const missingSource = NOT_IN_ARCHIVE_SOURCES[s.code];
    if (missingSource) {
      verdict.UNVERIFIABLE.push({ ...s, missingSource });
      continue;
    }
    // Only lesson-scoped codes can be resolved mechanically.
    const id = String(s.lesson || "").split("↔")[0].trim();
    if (!id || id.startsWith("(")) { verdict.NEEDS_EYES.push(s); continue; }
    const fresh = load(FRESH, s.section, id);
    const cur = load(CURRENT, s.section, id);
    if (!fresh) { verdict.NOT_IN_ARCHIVE.push(s); continue; }
    if (!cur) { verdict.NEEDS_EYES.push(s); continue; }

    let differs = null;
    if (s.code === "MOJIBAKE") {
      const fb = REPLACEMENT.test(JSON.stringify(fresh));
      differs = !fb; // archive is clean where current is broken
    } else if (s.code === "ITEM_SWALLOWED_NEXT" || s.code === "ITEM_NUMBER_GAP") {
      const fi = itemsOf(fresh), ci = itemsOf(cur);
      differs = fi.length !== ci.length;
    } else if (s.code === "TRANSLATION_MISSING" || s.code === "TRANSLATION_LENGTH_OUTLIER") {
      differs = null; // readingSentences do not exist in a fresh extract
    } else {
      const fi = itemsOf(fresh).map((x) => norm(x.text)).join("\u0001");
      const ci = itemsOf(cur).map((x) => norm(x.text)).join("\u0001");
      differs = fi !== ci;
    }

    if (differs === true) verdict.ARCHIVE_FIXES.push(s);
    else if (differs === false) verdict.SAME_IN_BOTH.push(s);
    else verdict.NEEDS_EYES.push(s);
  }

  const show = (label, arr, mark, n = 12) => {
    console.log(`\n${mark} ${label}  ${arr.length}건`);
    const byCode = {};
    for (const s of arr) (byCode[s.code] ||= []).push(s);
    for (const [code, rows] of Object.entries(byCode).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`     ${code.padEnd(28)} ${rows.length}`);
      for (const r of rows.slice(0, 2)) console.log(`         ${r.section}/${r.lesson}  ${String(r.detail).slice(0, 64)}`);
    }
    void n;
  };
  show("원본이 다름 — 이식 검토", verdict.ARCHIVE_FIXES, "🔴");
  show("원본도 동일 — 원본부터 그랬음", verdict.SAME_IN_BOTH, "🟡");
  show("아카이브가 답할 수 없음 — 교재에 없던 데이터", verdict.UNVERIFIABLE, "🚫");
  show("원본에 레슨 자체가 없음", verdict.NOT_IN_ARCHIVE, "⚪");
  show("사람이 봐야 함", verdict.NEEDS_EYES, "👀");

  if (verdict.UNVERIFIABLE.length) {
    const bySource = {};
    for (const s of verdict.UNVERIFIABLE) (bySource[s.missingSource] ||= []).push(s);
    console.log("\n🚫 위 항목의 출처별 내역 — 이 데이터는 교재에서 오지 않았습니다");
    for (const [src, rows] of Object.entries(bySource)) {
      console.log(`     ${src.padEnd(32)} ${rows.length}건`);
    }
    console.log("     → 아카이브 대조로는 판정 불가. 다른 근거가 필요합니다.");
  }

  /**
   * The archive settles what the TEXTBOOK SAYS. It does not settle what is
   * CORRECT — it was written by people too.
   *
   * So a difference and an agreement are not the same kind of answer:
   *
   *   ARCHIVE_FIXES   current ≠ archive   → an extraction accident. The archive
   *                                         wins; copy it over. Mechanical.
   *   SAME_IN_BOTH    current = archive   → the defect was in the textbook. The
   *                                         archive CANNOT resolve it, and
   *                                         "matches the original" is not the
   *                                         same as "is right".
   *
   * Only the owner can decide the second kind: the textbook is theirs, they are
   * selling it, and — as the gh2-032 to-infinitive row showed — a sentence that
   * looks wrong in isolation can be the exact pattern its lesson teaches. So
   * these are written out on their own, with the lesson's other sentences
   * alongside each row, instead of being left as a count in a summary. A count
   * gets skimmed past; a list with context gets decided.
   */
  if (verdict.SAME_IN_BOTH.length) {
    const rows = verdict.SAME_IN_BOTH.map((s) => {
      const id = String(s.lesson || "").split("↔")[0].trim();
      const cur = load(CURRENT, s.section, id);
      return {
        ...s,
        // The teaching context, so the decision is not made on one line alone.
        lessonSentences: itemsOf(cur).map((x) => x.text).filter(Boolean).slice(0, 20),
      };
    });
    const OUT2 = path.join(REPO, "docs/qa-2026-09-15/evidence/textbook-defects.json");
    fs.writeFileSync(OUT2, JSON.stringify({
      comparedAt: new Date().toISOString().slice(0, 10),
      note: "아카이브와 현재 데이터가 일치합니다. 즉 이 결함들은 추출 사고가 아니라 교재 자체에 있던 것입니다. 아카이브로는 풀 수 없고 소유자 판단이 필요합니다. 각 행의 lessonSentences 는 같은 레슨의 다른 문장들입니다 — 그 과가 무엇을 가르치는지 먼저 보고 판단하세요.",
      count: rows.length,
      rows,
    }, null, 1), "utf8");
    console.log(`\n🟡 교재 자체의 결함 후보 ${rows.length}건 → docs/qa-2026-09-15/evidence/textbook-defects.json`);
    console.log("   아카이브로는 풀 수 없습니다. 소유자 결정이 필요한 목록입니다.");
  }

  const OUT = path.join(REPO, "docs/qa-2026-09-15/evidence/archive-comparison.json");
  fs.writeFileSync(OUT, JSON.stringify({
    comparedAt: new Date().toISOString().slice(0, 10),
    freshTree: FRESH,
    onlyInArchive: onlyFresh,
    onlyInCurrent: onlyCurrent,
    counts: Object.fromEntries(Object.entries(verdict).map(([k, v]) => [k, v.length])),
    verdict,
  }, null, 1), "utf8");
  console.log(`\n→ ${path.relative(REPO, OUT)}`);
}

// ---------------------------------------------------------------- Tier 2
if (FULL) {
  console.log("\n=== Tier 2 · 전수 대조 ===");
  let same = 0, diff = 0, missing = 0;
  const examples = [];
  for (const course of LIVE) {
    const cd = path.join(CURRENT, "lessons", course);
    if (!fs.existsSync(cd)) continue;
    for (const f of fs.readdirSync(cd)) {
      if (!f.endsWith(".json")) continue;
      const id = f.slice(0, -5);
      const fresh = load(FRESH, course, id), cur = load(CURRENT, course, id);
      if (!fresh) { missing++; continue; }
      const fi = itemsOf(fresh), ci = itemsOf(cur);
      const n = Math.max(fi.length, ci.length);
      for (let i = 0; i < n; i++) {
        const a = norm(fi[i]?.text), b = norm(ci[i]?.text);
        if (a === b) { same++; continue; }
        diff++;
        if (examples.length < 30)
          examples.push(`${course}/${id} #${fi[i]?.n ?? ci[i]?.n ?? i}\n      원본: ${a.slice(0, 70)}\n      현재: ${b.slice(0, 70)}`);
      }
    }
  }
  console.log(`  문항 일치 ${same.toLocaleString()} · 불일치 ${diff.toLocaleString()} · 원본 없음(레슨) ${missing}`);
  console.log(`\n  불일치 표본:`);
  for (const e of examples) console.log(`    ${e}`);

  const OUT2 = path.join(REPO, "docs/qa-2026-09-15/evidence/archive-fulldiff.json");
  fs.writeFileSync(OUT2, JSON.stringify({ same, diff, missing, examples }, null, 1), "utf8");
  console.log(`\n→ ${path.relative(REPO, OUT2)}`);
}
