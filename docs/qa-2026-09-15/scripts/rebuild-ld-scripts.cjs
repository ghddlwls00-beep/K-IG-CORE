#!/usr/bin/env node
/**
 * Rebuild the LISTENING scripts so the English IS what the recording says.
 *
 *   node docs/qa-2026-09-15/scripts/rebuild-ld-scripts.cjs d010    # 한 레슨 미리보기
 *   node docs/qa-2026-09-15/scripts/rebuild-ld-scripts.cjs         # 전체 미리보기
 *   node docs/qa-2026-09-15/scripts/rebuild-ld-scripts.cjs --write
 *
 * WHY NOT LEAVE IT. The English shipped today is a translation of the Korean,
 * which is itself a translation of the recording. The meaning survives — all
 * 2,518 sentences were checked and only two said something the passage did not
 * — but the WORDS do not: agreement with the recording averages 82%. For a
 * course whose steps are dictation and shadowing, "close enough in meaning" is
 * not close enough. The learner types what they hear and reads along with what
 * they hear; the text has to be that, exactly.
 *
 * WHAT CHANGES, AND WHAT DOES NOT.
 *
 *   en   replaced with the recording's own words, verbatim from the transcript.
 *   ko   NOT retranslated. The textbook's Korean is kept character for character;
 *        only where the rows are cut changes.
 *   rows re-cut at sentence boundaries instead of the textbook's display line
 *        breaks. Those breaks fall mid-clause, which is why rows read like
 *        "그 눈이 충분히 단단하면 이웃의 언덕들은 곧 썰매타는" — and why the
 *        English translated a fragment and invented a subject for it ("It will
 *        be filled with images of Irene"). Re-cutting fixes the Korean's
 *        readability as a side effect of fixing the English.
 *
 * ALIGNMENT. Korean and English sentence counts rarely match one-to-one, so
 * pairing them by position would drift and silently mis-pair a whole lesson.
 * Instead the Korean is joined back into one text, re-split at its own sentence
 * ends, and matched to the recording's sentences in order — and any lesson where
 * the two counts differ is REPORTED, not guessed at. Those are left for review.
 *
 * 🔴 `en` changes on every row, so every clip must be rebuilt.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/ld_english_scripts.json");
const T = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-rebuild-preview.md");

const WRITE = process.argv.includes("--write");
const only = process.argv.find((a) => /^d\d+$/.test(a));

const scripts = JSON.parse(fs.readFileSync(P, "utf8"));
const transcripts = JSON.parse(fs.readFileSync(T, "utf8"));

/**
 * The lesson number the reader announces ("103.") is not part of the passage.
 *
 * It has to be removed AFTER splitting, never before: as a text substitution it
 * also ate real numbers that happen to end a sentence. "My grandfather's about
 * 60. He's still farming." came out as "My grandfather's about He's still
 * farming." — the passage lost the grandfather's age and two sentences merged
 * into nonsense. A standalone number IS the announcement; a number inside a
 * sentence is content.
 */
const isLessonNumber = (s) => /^\d{1,3}\.$/.test(String(s).trim());

/**
 * English sentence ends, without breaking on an abbreviation's period.
 *
 * "I'm Mrs. Watson." split into "I'm Mrs." and "Watson." — which is what made
 * most of the lessons come out one sentence longer than the Korean and land in
 * the "needs a human" pile. The same goes for initials (J. Smith) and for the
 * U.S., which appears throughout this corpus.
 */
const ABBREV = /\b(?:Mrs|Mr|Ms|Dr|Prof|St|Mt|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Fig|approx|Ave|Rd|Blvd|Gen|Capt|Sgt|Lt|Col|Rev|Hon|Univ|Dept|[A-Z])\.$/;
function splitEn(t) {
  const parts = String(t).replace(/\s+/g, " ").trim().split(/(?<=[.?!])\s+/);
  const out = [];
  for (const p of parts) {
    const piece = p.trim();
    if (!piece || isLessonNumber(piece)) continue;
    const prev = out[out.length - 1];
    // A fragment ending in an abbreviation is not a sentence end; nor is a
    // piece that starts lowercase, which means the split fell mid-sentence.
    if (prev && (ABBREV.test(prev) || /^[a-z]/.test(piece))) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return out;
}

/**
 * Korean sentence ends. A period inside a number (1,700) or an initial must not
 * split, so the split needs the following character to start a new sentence.
 */
function splitKo(t) {
  const parts = String(t).replace(/\s+/g, " ").trim().split(/(?<=[.?!])\s+(?=[^\s])/);
  const out = [];
  for (const p of parts) {
    const piece = p.trim();
    if (!piece) continue;
    const prev = out[out.length - 1];
    // Korean prose here carries English names and abbreviations too, and the
    // textbook writes 왓슨 부인 as "Mrs. 왓슨" in places.
    if (prev && ABBREV.test(prev)) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return out;
}

const rows = [];
for (const id of Object.keys(scripts).sort()) {
  if (only && id !== only) continue;
  const src = scripts[id] || [];
  const said = transcripts[id]?.text || "";
  if (!said) { rows.push({ id, status: "전사 없음", ko: [], en: [] }); continue; }

  const ko = splitKo(src.map((r) => r.ko).join(" "));
  const en = splitEn(said);
  rows.push({ id, status: ko.length === en.length ? "맞음" : "개수 다름", ko, en, was: src.length });
}

const matched = rows.filter((r) => r.status === "맞음");
const mismatched = rows.filter((r) => r.status === "개수 다름");

if (only) {
  const r = rows[0];
  console.log(`${r.id} — 한국어 ${r.ko.length}문장 · 음성 ${r.en.length}문장 · 현재 행 ${r.was}개 → ${r.status}\n`);
  const n = Math.max(r.ko.length, r.en.length);
  for (let i = 0; i < n; i++) {
    console.log(`  #${i + 1}`);
    console.log(`    KO  ${r.ko[i] ?? "—"}`);
    console.log(`    EN  ${r.en[i] ?? "—"}`);
    const old = scripts[r.id]?.[i];
    if (old) console.log(`    전  ${old.en}`);
    console.log("");
  }
  process.exit(0);
}

console.log(`레슨 ${rows.length}개`);
console.log(`  한국어 문장 수 = 음성 문장 수 : ${matched.length}  → 자동 정렬 가능`);
console.log(`  개수가 다름                   : ${mismatched.length}  → 사람이 봐야 함`);
console.log(`  전사 없음                     : ${rows.filter((r) => r.status === "전사 없음").length}`);
console.log(`\n개수가 다른 레슨: ${mismatched.slice(0, 20).map((r) => `${r.id}(${r.ko.length}/${r.en.length})`).join(" ")}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# LISTENING 재구성 미리보기", "",
  "> 영어를 **원본 녹음 그대로** 바꾸고, 행을 교재 줄바꿈이 아니라 **문장 단위**로 다시 나눕니다.",
  "> 한국어 글자는 그대로 두고 끊는 위치만 바꿉니다.", "",
  `자동 정렬 가능 ${matched.length}개 · 사람 확인 필요 ${mismatched.length}개`, "", "## 자동 정렬 가능", ""];
for (const r of matched) {
  L.push(`### ${r.id}`, "", "| # | 한국어 | 음성 그대로 (새 영어) |", "|---|---|---|");
  for (let i = 0; i < r.ko.length; i++) L.push(`| ${i + 1} | ${esc(r.ko[i])} | ${esc(r.en[i])} |`);
  L.push("");
}
L.push("## 사람이 봐야 할 레슨", "", "| 레슨 | 한국어 문장 | 음성 문장 |", "|---|---|---|");
for (const r of mismatched) L.push(`| ${r.id} | ${r.ko.length} | ${r.en.length} |`);
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }

let changed = 0;
for (const r of matched) {
  scripts[r.id] = r.ko.map((ko, i) => ({ n: String(i + 1), ko, en: r.en[i] }));
  changed++;
}
fs.writeFileSync(P, JSON.stringify(scripts, null, 1), "utf8");
console.log(`\n✅ ${changed}개 레슨 기록. 개수가 다른 ${mismatched.length}개는 손대지 않았습니다.`);
console.log("🔴 음성 클립을 전부 다시 구우세요: node scripts/generate-azure-ava.mjs --dry-run");
