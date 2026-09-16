#!/usr/bin/env node
/**
 * Align the 85 LISTENING lessons whose Korean and recording have different
 * sentence counts.
 *
 *   node docs/qa-2026-09-15/scripts/align-ld-remaining.cjs d006   # 한 레슨
 *   node docs/qa-2026-09-15/scripts/align-ld-remaining.cjs        # 전체 미리보기
 *   node docs/qa-2026-09-15/scripts/align-ld-remaining.cjs --write
 *
 * WHY THESE NEED MORE THAN COUNTING. 191 lessons had the same number of
 * sentences on both sides and could be paired in order. These do not, because
 * the textbook's Korean script sometimes leaves out sentences the recording
 * has — d006 carries 16 Korean sentences against 19 spoken. Pairing by position
 * puts English sentence 8 under Korean sentence 5 and every row after it is
 * wrong, which is worse than the machine translation it replaces.
 *
 * SO GAPS HAVE TO BE ALLOWED. This is a monotonic alignment: order is preserved
 * (the recording follows the script), but either side may skip. Four moves —
 * pair one with one, pair one Korean with two spoken sentences, pair two Korean
 * with one, or skip a spoken sentence the script never had.
 *
 * SCORING ACROSS TWO LANGUAGES. Korean and English share no words, so the score
 * uses what does survive translation:
 *
 *   numbers      "60", "1,700", "1925" are written the same in both
 *   Latin tokens names stay in the Latin alphabet inside the Korean text
 *                (Keith, Anne, Nome, Wisconsin)
 *   length       Korean runs about 0.55 characters per English character in
 *                this corpus, steadily enough to notice a bad pairing
 *
 * A KOREAN ROW IS NEVER LEFT WITHOUT ENGLISH. A skipped spoken sentence is
 * appended to the preceding row rather than dropped, so nothing the speaker
 * says disappears from the page.
 *
 * Lessons whose alignment scores poorly are REPORTED, not written. Guessing
 * quietly is the failure this script exists to avoid.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const P = path.join(ROOT, "content/ld_english_scripts.json");
const T = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-align-preview.md");

const WRITE = process.argv.includes("--write");
const only = process.argv.find((a) => /^d\d+$/.test(a));
const MIN_SCORE = 0.55; // below this the pairing is not trustworthy

const scripts = JSON.parse(fs.readFileSync(P, "utf8"));
const transcripts = JSON.parse(fs.readFileSync(T, "utf8"));

const ABBREV = /\b(?:Mrs|Mr|Ms|Dr|Prof|St|Mt|Jr|Sr|vs|etc|Inc|Ltd|Co|No|Fig|approx|Ave|Rd|Blvd|Gen|Capt|Sgt|Lt|Col|Rev|Hon|Univ|Dept|[A-Z])\.$/;
const isLessonNumber = (s) => /^\d{1,3}\.$/.test(String(s).trim());

function splitEn(t) {
  const out = [];
  for (const p of String(t).replace(/\s+/g, " ").trim().split(/(?<=[.?!])\s+/)) {
    const piece = p.trim();
    if (!piece || isLessonNumber(piece)) continue;
    const prev = out[out.length - 1];
    if (prev && (ABBREV.test(prev) || /^[a-z]/.test(piece))) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return out;
}
function splitKo(t) {
  const out = [];
  for (const p of String(t).replace(/\s+/g, " ").trim().split(/(?<=[.?!])\s+(?=[^\s])/)) {
    const piece = p.trim();
    if (!piece) continue;
    const prev = out[out.length - 1];
    if (prev && ABBREV.test(prev)) out[out.length - 1] = `${prev} ${piece}`;
    else out.push(piece);
  }
  return out;
}

/* ------------------------------------------------- cross-language score --- */
const digits = (s) => (String(s).replace(/[,\s]/g, "").match(/\d+/g) || []);
const latin = (s) => (String(s).match(/[A-Za-z]{3,}/g) || []).map((w) => w.toLowerCase());
const KO_PER_EN = 0.55;

function pairScore(ko, en) {
  if (!ko || !en) return 0;
  let score = 0, signals = 0;

  const kd = digits(ko), ed = digits(en);
  if (kd.length || ed.length) {
    const hit = kd.filter((d) => ed.includes(d)).length;
    score += hit / Math.max(kd.length, ed.length, 1);
    signals++;
  }
  const kl = latin(ko), el = latin(en);
  if (kl.length) {
    const hit = kl.filter((w) => el.includes(w)).length;
    score += hit / kl.length;
    signals++;
  }
  // Length is always available, so it anchors pairs with no names or numbers.
  const expected = en.length * KO_PER_EN;
  const ratio = Math.min(ko.length, expected) / Math.max(ko.length, expected, 1);
  score += ratio;
  signals++;

  return score / signals;
}

/* ---------------------------------------------------------------- align --- */
const SKIP_EN = -0.35; // a spoken sentence the script never had
const MERGE = -0.12;   // one side covers two of the other

function align(ko, en) {
  const n = ko.length, m = en.length;
  const dp = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(-Infinity));
  const back = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  dp[0][0] = 0;
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (dp[i][j] === -Infinity) continue;
      const put = (ni, nj, add, op) => {
        const v = dp[i][j] + add;
        if (v > dp[ni][nj]) { dp[ni][nj] = v; back[ni][nj] = { i, j, op }; }
      };
      if (i < n && j < m) put(i + 1, j + 1, pairScore(ko[i], en[j]), "1:1");
      if (i < n && j + 1 < m) put(i + 1, j + 2, pairScore(ko[i], `${en[j]} ${en[j + 1]}`) + MERGE, "1:2");
      if (i + 1 < n && j < m) put(i + 2, j + 1, pairScore(`${ko[i]} ${ko[i + 1]}`, en[j]) + MERGE, "2:1");
      if (j < m) put(i, j + 1, SKIP_EN, "skip-en");
    }
  }
  const steps = [];
  let i = n, j = m;
  while (i || j) {
    const b = back[i][j];
    if (!b) return null;
    steps.push({ ...b, toI: i, toJ: j });
    i = b.i; j = b.j;
  }
  steps.reverse();

  const rows = [];
  for (const s of steps) {
    const koPart = ko.slice(s.i, s.toI).join(" ");
    const enPart = en.slice(s.j, s.toJ).join(" ");
    if (s.op === "skip-en") {
      // Never drop what the speaker said: attach it to the row before.
      if (rows.length) rows[rows.length - 1].en += ` ${enPart}`;
      else rows.push({ ko: "", en: enPart });
      continue;
    }
    rows.push({ ko: koPart, en: enPart });
  }
  const paired = steps.filter((s) => s.op !== "skip-en");
  const avg = paired.length
    ? paired.reduce((a, s) => a + pairScore(ko.slice(s.i, s.toI).join(" "), en.slice(s.j, s.toJ).join(" ")), 0) / paired.length
    : 0;
  return { rows: rows.filter((r) => r.ko), score: avg, skipped: steps.filter((s) => s.op === "skip-en").length };
}

/* ------------------------------------------------------------------ run --- */
const results = [];
for (const id of Object.keys(scripts).sort()) {
  const src = scripts[id] || [];
  const ko = splitKo(src.map((r) => r.ko).join(" "));
  const en = splitEn(transcripts[id]?.text || "");
  if (!en.length) continue;
  if (ko.length === en.length) continue; // already rebuilt
  if (only && id !== only) continue;
  const a = align(ko, en);
  if (!a) { results.push({ id, ok: false, score: 0, rows: [], koN: ko.length, enN: en.length }); continue; }
  results.push({ id, ok: a.score >= MIN_SCORE, ...a, koN: ko.length, enN: en.length });
}

if (only) {
  const r = results[0];
  if (!r) { console.error(`${only} 는 이미 정렬되었거나 대상이 아닙니다.`); process.exit(1); }
  console.log(`${r.id} — 한국어 ${r.koN} / 음성 ${r.enN} · 점수 ${(r.score * 100).toFixed(0)} · 건너뛴 음성 ${r.skipped}\n`);
  r.rows.forEach((x, i) => {
    console.log(`  #${i + 1}`);
    console.log(`    KO  ${x.ko}`);
    console.log(`    EN  ${x.en}`);
    console.log("");
  });
  process.exit(0);
}

const good = results.filter((r) => r.ok);
const bad = results.filter((r) => !r.ok);
console.log(`대상 ${results.length}개`);
console.log(`  정렬 성공 (점수 ${MIN_SCORE * 100} 이상) : ${good.length}`);
console.log(`  점수 미달 — 사람이 봐야 함             : ${bad.length}`);
if (bad.length) console.log(`\n미달: ${bad.map((r) => `${r.id}(${(r.score * 100).toFixed(0)})`).join(" ")}`);

const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = ["# LISTENING 나머지 정렬 미리보기", "",
  "> 한국어와 녹음의 문장 수가 다른 레슨입니다. 순서를 지키되 **빠진 문장을 건너뛰는** 정렬을 썼습니다.",
  "> 건너뛴 음성 문장은 버리지 않고 앞 행에 붙입니다.", "",
  `성공 ${good.length} · 미달 ${bad.length}`, ""];
for (const r of good) {
  L.push(`### ${r.id}  (점수 ${(r.score * 100).toFixed(0)} · 음성 ${r.enN}문장 → ${r.rows.length}행)`, "",
    "| # | 한국어 | 음성 그대로 |", "|---|---|---|");
  r.rows.forEach((x, i) => L.push(`| ${i + 1} | ${esc(x.ko)} | ${esc(x.en)} |`));
  L.push("");
}
if (bad.length) {
  L.push("## 점수 미달 — 손대지 않음", "", "| 레슨 | 점수 | 한국어 | 음성 |", "|---|---|---|---|");
  for (const r of bad) L.push(`| ${r.id} | ${(r.score * 100).toFixed(0)} | ${r.koN} | ${r.enN} |`);
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);

if (!WRITE) { console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다."); process.exit(0); }
for (const r of good) scripts[r.id] = r.rows.map((x, i) => ({ n: String(i + 1), ko: x.ko, en: x.en }));
fs.writeFileSync(P, JSON.stringify(scripts, null, 1), "utf8");
console.log(`\n✅ ${good.length}개 레슨 기록. 미달 ${bad.length}개는 그대로 두었습니다.`);
console.log("🔴 음성 클립을 다시 구우세요.");
