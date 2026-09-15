#!/usr/bin/env node
/**
 * KIG-006 — build the review table the owner has to approve before `--write`.
 *
 * The engine's four verifiers all report clean, and they are all wrong about
 * the same thing: they sample rows they were written from. A 2026-09-16 pass
 * that applied the engine to a throwaway copy of content/ and read every
 * resulting sentence found 12 plainly broken alternatives the verifiers passed,
 * plus a whole course (STUDENT) where the lane's premise does not hold. What
 * was missing was never a cleverer check — it was a list a person can read.
 *
 * So this script does two things and writes nothing to content/:
 *
 *   1. Applies three guards that drop an alternative no reviewer would keep.
 *      Each guard exists because a real row got through without it; the row is
 *      named in the comment above the guard.
 *   2. Emits every remaining row as a markdown table, flagged rows first, so
 *      the rows most likely to be wrong are the ones read first.
 *
 *   node docs/qa-2026-09-15/scripts/review-kig006.cjs
 *     → docs/qa-2026-09-15/evidence/kig006-review-table.md
 *
 * Read-only: content/ is never opened for writing.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const LESSONS = path.join(ROOT, "content/lessons");
const OUT = path.join(__dirname, "..", "evidence", "kig006-review-table.md");
const ALT_MARK = String.fromCharCode(0xd639, 0xc548); // placeholder, reset below

// Courses this lane may touch. STUDENT is absent on purpose — its parentheses
// are blanks the learner fills in, not alternative answers. See
// apply-kig006.cjs `EXCLUDED_COURSES` and NEXT-SESSION.md §0.
const COURSES = ["grammar1", "grammar2"];

/* ------------------------------------------------------ load the engine ---- */
// Same in-memory slice apply-kig006.cjs uses, so there is one implementation.
function loadEngine() {
  const raw = fs
    .readFileSync(path.join(__dirname, "report-kig006.cjs"), "utf8")
    .replace(/^#!.*\n/, "");
  const CUT = "/* ---------------------------------------------------------------- write out */";
  const cut = raw.indexOf(CUT);
  if (cut < 0) throw new Error("engine slice marker not found in report-kig006.cjs");
  const body =
    raw.slice(0, cut) +
    "\nmodule.exports = { propose, kindFor };\n";
  const mod = { exports: {} };
  new Function("module", "exports", "require", "__dirname", body)(
    mod, mod.exports, require, __dirname,
  );
  return mod.exports;
}
const { propose, kindFor } = loadEngine();

/* ------------------------------------------------------- owner decisions --- */
/**
 * Rows a person settled, because the engine cannot.
 *
 * Every entry here is a row where the engine's output was wrong in a way no
 * general rule caught — a bracket that replaces a whole clause, a source
 * sentence with two terminators, a textbook correction written inside the
 * bracket. Curating them beats loosening the engine: the 220 rows it gets right
 * stay untouched, and each override carries the reason it exists, so the list
 * doubles as the regression suite for whoever fixes the engine properly.
 *
 * Keyed on the source text byte-for-byte. A key that matches nothing is a hard
 * error rather than a silent skip — if the textbook is re-extracted and a
 * sentence shifts, the decision must be re-made, not quietly dropped.
 */
function loadDecisions() {
  const f = path.join(__dirname, "..", "kig006-decisions.json");
  if (!fs.existsSync(f)) return { byText: new Map(), approved: new Set(), all: [] };
  const j = JSON.parse(fs.readFileSync(f, "utf8"));
  const byText = new Map();
  for (const d of j.decisions || []) byText.set(d.en, d);
  return { byText, approved: new Set(j.approved || []), all: j.decisions || [] };
}
const DECISIONS = loadDecisions();
const decisionsUsed = new Set();

const MARK = String.fromCharCode(0xd639, 0xc740); // 혹은
const HANGUL = /[가-힯]/;
const hasParen = (s) => typeof s === "string" && s.includes("(");
const isEnglishAnswer = (s) =>
  typeof s === "string" && s.length > 0 && hasParen(s) &&
  !HANGUL.test(String(s).split(MARK).join(""));

/* --------------------------------------------------------------- guards ---- */

/**
 * G1 — the parenthetical is an explanatory gloss, not an answer form.
 *
 * `What was her maiden name(family name: last name)?` produced the alternative
 * "family name: last name" — a dictionary aside promoted to a model answer. A
 * learner who types it is typing a definition, not a sentence, and the TTS
 * reads a colon aloud. The tell is a colon inside the bracket, or a bracket
 * whose content is a bare noun phrase while the host sentence is a question.
 */
function isGloss(alt, original) {
  if (/:/.test(alt)) return true;
  // An "alternative" that lost the original's terminator is not a sentence form.
  const term = (original.match(/[.?!]\s*$/) || [""])[0].trim();
  if (term && !alt.trim().endsWith(term)) return true;
  return false;
}

/**
 * G2 — substitution landed as insertion, leaving a doubled word.
 *
 * `May I have the day off tomorrow(have tomorrow off)?` produced "May I have
 * have tomorrow off?" and `Were they policemen(police officers)?` produced
 * "Were they policemen police officers?". In both the bracket replaces a span
 * the engine failed to identify, so the old span and the new one both survive.
 */
function hasDoubledRun(alt) {
  const w = alt.replace(/[.?!,;:]/g, "").split(/\s+/).filter(Boolean);
  for (let i = 0; i + 1 < w.length; i++) {
    if (w[i].toLowerCase() === w[i + 1].toLowerCase()) return `${w[i]} ${w[i + 1]}`;
  }
  // The 4-word form catches a whole clause spliced into itself.
  for (let n = 3; n <= Math.floor(w.length / 2); n++) {
    const seen = new Set();
    for (let i = 0; i + n <= w.length; i++) {
      const k = w.slice(i, i + n).join(" ").toLowerCase();
      if (seen.has(k)) return k;
      seen.add(k);
    }
  }
  return null;
}

/**
 * G2b — the bracket was APPENDED where it should have REPLACED.
 *
 * The doubled-word test only fires when the two spans share a word. These do
 * not, and all three shipped clean through it:
 *
 *   Were they policemen (police officers)?
 *     → "Were they policemen police officers?"   (replaces `policemen`)
 *   I don't either, (Neither do I).
 *     → "I don't either, Neither do I."          (replaces the whole clause)
 *   … always get airsick (aboard a plane) or seasick (aboard a ship).
 *     → "… airsick or seasick aboard a ship."    (attaches to the wrong conjunct)
 *
 * The shape they share: the alternative is the primary with the bracket's words
 * glued on, nothing removed. A genuine alternative substitutes — so its word
 * count moves by roughly the size of the span it replaced, and the primary does
 * not survive inside it intact. Flag, do not silently drop: for some rows the
 * append IS right, and only a reader can say which.
 */
function isAppendNotSubstitute(alt, primary) {
  const strip = (s) => s.replace(/[.?!,;:]\s*$/, "").trim().toLowerCase();
  const a = strip(alt), p = strip(primary);
  if (a === p) return null;
  // The primary survives whole inside the alternative → nothing was replaced.
  if (a.startsWith(p) && a.length > p.length) return "주정답 뒤에 붙기만 함";
  const pw = p.split(/\s+/).length, aw = a.split(/\s+/).length;
  // An alternative that only grows, and grows a lot, replaced nothing.
  if (aw - pw >= 2 && a.includes(p.slice(0, Math.floor(p.length * 0.6)))) {
    return "치환이 아니라 삽입으로 보임";
  }
  return null;
}

/**
 * G3 — the alternative is not a well-formed clause.
 *
 * `Please keep (be) quiet.` produced "Please keep be quiet." — two verbs in a
 * row where the bracket was meant to replace `keep`, not follow it. A full
 * parser is not warranted here, but a bare verb sequence and a missing subject
 * are both cheap to spot, and a flagged row costs a reviewer one line to read.
 */
const BARE_VERBS = new Set(["be", "do", "have", "go", "get", "make", "take", "keep", "become"]);
function looksUngrammatical(alt) {
  const w = alt.replace(/[.?!,;:]/g, "").split(/\s+/).filter(Boolean);
  for (let i = 0; i + 1 < w.length; i++) {
    const a = w[i].toLowerCase(), b = w[i + 1].toLowerCase();
    // "keep be", "make do" — a lexical verb immediately followed by a bare
    // auxiliary is the signature of a substitution that became an insertion.
    if (BARE_VERBS.has(a) && BARE_VERBS.has(b)) return `${a} ${b}`;
  }
  if (w.length < 2) return "too short";
  return null;
}

/* ----------------------------------------------------------------- walk ---- */
const flat = (o, out = []) => {
  if (Array.isArray(o)) o.forEach((x) => flat(x, out));
  else if (o && typeof o === "object") {
    if (typeof o.text === "string") out.push(o);
    Object.values(o).forEach((x) => flat(x, out));
  }
  return out;
};

const rows = [];
for (const c of COURSES) {
  const dir = path.join(LESSONS, c);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".json")) continue;
    let j;
    try { j = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")); } catch { continue; }
    for (const item of flat(j)) {
      const en = item.text;
      if (!hasParen(en) || !isEnglishAnswer(en)) continue;

      // An owner decision replaces the engine outright — guards included. The
      // guards exist to find rows a person must look at; once looked at, the
      // person's answer is the answer.
      const decided = DECISIONS.byText.get(en);
      if (decided) {
        decisionsUsed.add(en);
        rows.push({
          course: c, file: f.replace(/\.json$/, ""), en,
          text: decided.text, kept: decided.alternatives || [], dropped: [],
          decided: decided.reason,
        });
        continue;
      }

      let p;
      try { p = propose(kindFor(en), en); } catch { continue; }
      if (!p || !p.text || hasParen(p.text)) continue;

      const kept = [], dropped = [];
      for (const a of [...new Set((p.alternatives || []).filter((x) => x && x !== p.text && !hasParen(x)))]) {
        const why =
          (isGloss(a, en) && "설명/주석") ||
          (hasDoubledRun(a) && `단어 중복: ${hasDoubledRun(a)}`) ||
          (isAppendNotSubstitute(a, p.text)) ||
          (looksUngrammatical(a) && `비문 의심: ${looksUngrammatical(a)}`);
        if (why) dropped.push({ a, why }); else kept.push(a);
      }

      // Row-level doubt about the PRIMARY, not the alternatives. When the
      // author put a whole sentence in the bracket after the host sentence has
      // already terminated, the bracket is a rewrite, and "the wording outside
      // the bracket wins" can leave the broken half as the model answer:
      //   "I think it the best way to success to work hard. (I think the best
      //    way to success is to work hard.)" → primary keeps the ungrammatical
      // first half. Sometimes the rewrite is merely an equal variant, so this
      // is a question for a reader, not a rule.
      const bracketIsWholeSentence =
        /[.?!]\s*\(\s*[A-Z][^()]{8,}[.?!]\s*\)/.test(en) && !DECISIONS.approved.has(en);
      rows.push({
        course: c, file: f.replace(/\.json$/, ""), en, text: p.text, kept, dropped,
        primaryDoubt: bracketIsWholeSentence ? "괄호 안이 완전한 문장 — 주정답이 맞는지 확인" : null,
      });
    }
  }
}

// A decision that matches no sentence is a decision about a sentence that no
// longer exists — silently skipping it would let an approved fix evaporate.
const unmatched = DECISIONS.all.filter((d) => !decisionsUsed.has(d.en)).map((d) => d.en);
if (unmatched.length) {
  console.error(`\n🔴 kig006-decisions.json 의 항목 ${unmatched.length}개가 content/ 에서 원문을 찾지 못했습니다:`);
  for (const u of unmatched) console.error(`   ${JSON.stringify(u)}`);
  console.error("\n교재가 수정되었다면 결정을 다시 내려야 합니다. 중단합니다.");
  process.exit(1);
}

// De-duplicate: the same sentence appears on a main page and its script pair.
const seen = new Map();
for (const r of rows) {
  const k = `${r.en} ${r.text}`;
  if (seen.has(k)) { seen.get(k).files.push(r.file); continue; }
  seen.set(k, { ...r, files: [r.file] });
}
const uniq = [...seen.values()];
// `approved` says a person looked at the row and the engine was right. That
// settles the dropped alternatives too, not only the primary — otherwise the
// same row comes back on every run and the flagged list stops meaning
// "unreviewed".
const settled = uniq.filter((r) => r.decided);
const isOpen = (r) =>
  !r.decided && !DECISIONS.approved.has(r.en) && (r.dropped.length || r.primaryDoubt);
const flagged = uniq.filter(isOpen);
const clean = uniq.filter((r) => !r.decided && !isOpen(r));

/* ---------------------------------------------------------------- report --- */
const esc = (s) => String(s).replace(/\|/g, "\\|");
const L = [];
L.push("# KIG-006 검수표 — 적용 전 승인용");
L.push("");
L.push("> `apply-kig006.cjs --write` 를 실행하기 **전에** 이 표를 검수하고 승인해야 합니다.");
L.push("> 이 스크립트는 `content/` 에 아무것도 쓰지 않습니다.");
L.push("> STUDENT 과정은 제외되어 있습니다 — 그쪽 괄호는 대안이 아니라 빈칸입니다 (`NEXT-SESSION.md` §0).");
L.push("");
L.push(`생성: ${new Date().toISOString()}`);
L.push("");
L.push("| | 건수 |");
L.push("|---|---|");
L.push(`| 검수 대상 문장 (중복 제거) | ${uniq.length} |`);
L.push(`| ✅ 소유자가 결정한 행 | ${settled.length} |`);
L.push(`| 🔴 가드에 걸린 행 (먼저 볼 것) | ${flagged.length} |`);
L.push(`| 버려진 대안 | ${uniq.reduce((n, r) => n + r.dropped.length, 0)} |`);
L.push(`| 남은 대안 | ${uniq.reduce((n, r) => n + r.kept.length, 0)} |`);
L.push("");
L.push("---");
L.push("");
L.push("## 0. ✅ 소유자가 결정한 행 — 엔진 결과를 사람이 뒤집었습니다");
L.push("");
L.push("`kig006-decisions.json` 에 기록되어 있습니다. `--write` 는 엔진이 아니라 아래 값을 기록합니다.");
L.push("");
L.push("| # | 레슨 | 원문 | 주정답 (text) | 대안 | 뒤집은 이유 |");
L.push("|---|---|---|---|---|---|");
settled.forEach((r, i) => {
  L.push(`| ${i + 1} | ${esc(r.files[0])} | ${esc(r.en)} | ${esc(r.text)} | ${esc(r.kept.join(" / ")) || "—"} | ${esc(r.decided)} |`);
});
L.push("");
L.push("---");
L.push("");
L.push("## 1. 🔴 가드에 걸린 행 — 사람이 판단해야 합니다");
L.push("");
L.push("자동으로 버린 대안입니다. **버린 게 맞는지**, 그리고 **버린 자리에 올바른 대안이 필요한지** 봐주세요.");
L.push("");
L.push("| # | 레슨 | 원문 | 주정답 (text) | 남은 대안 | 🔴 버린 대안 / 의심 (사유) |");
L.push("|---|---|---|---|---|---|");
flagged.forEach((r, i) => {
  const notes = r.dropped.map((d) => `${d.a}  〔${d.why}〕`);
  if (r.primaryDoubt) notes.unshift(`⚠️ ${r.primaryDoubt}`);
  L.push(`| ${i + 1} | ${esc(r.files[0])} | ${esc(r.en)} | ${esc(r.text)} | ${esc(r.kept.join(" / ")) || "—"} | ${esc(notes.join("<br>"))} |`);
});
L.push("");
L.push("---");
L.push("");
L.push("## 2. 가드를 통과한 행");
L.push("");
L.push("| # | 레슨 | 원문 | 주정답 (text) | 대안 |");
L.push("|---|---|---|---|---|");
clean.forEach((r, i) => {
  L.push(`| ${i + 1} | ${esc(r.files[0])} | ${esc(r.en)} | ${esc(r.text)} | ${esc(r.kept.join(" / ")) || "—"} |`);
});
L.push("");

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, L.join("\n"), "utf8");

console.log(`검수 대상 문장 : ${uniq.length}`);
console.log(`✅ 소유자 결정 : ${settled.length}행`);
console.log(`🔴 가드 적발   : ${flagged.length}행 · 버린 대안 ${uniq.reduce((n, r) => n + r.dropped.length, 0)}개`);
console.log(`남은 대안      : ${uniq.reduce((n, r) => n + r.kept.length, 0)}개`);
console.log(`\n검수표: ${path.relative(ROOT, OUT)}`);
