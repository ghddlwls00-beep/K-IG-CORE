#!/usr/bin/env node
/**
 * 성인반(ADULT) 단어 빈칸 보기 검사 — 회귀 점검 1002 고침(fix-adult-content, 2026-10-05).
 *
 *   node docs/qa-2026-09-18/회귀점검-1002/고침/check-adult-blank-choices.cjs            # content/lessons/adult
 *   … --dir <폴더>          # 다른 강의 폴더(예: 고치기 전 HEAD 사본)를 검사 — 깨기 증명
 *   … --break=same          # 첫 빈칸 보기 하나를 정답 꼴로 바꿔 검사 — (1) 이 잡는지 증명(exit 1 이어야)
 *   … --break=lemma         # 첫 빈칸 보기 하나를 정답의 다른 꼴(-s 를 붙이거나 뗌)로 — (2) 가 잡는지 증명(exit 1 이어야)
 *
 * 모든 빈칸(모든 낱말 카드의 choices)마다:
 *   (1) 오답 보기 3개가 서로 다르고, 어느 것도 정답 꼴(문장에 쓰인 그대로 · 문장 첫 글자 대문자 무시)과 같지 않다.
 *   (2) 어느 오답 보기도 정답 낱말의 다른 꼴이 아니다 — 같은 과에서 카드 word 가 같은 카드의 꼴이거나, 낱말마다 끝
 *       (-ing · -ed · -es · -s · -d)을 떼면 정답과 같은 것('looking forward to' = 'look forward to').
 *   (3) 단계 5 가 '오답 보기가 정답처럼 들어맞음'으로 적은 39빈칸(F02~F17 · F31~F33 · F35~F55)에 그 들어맞는 꼴이 보기에 없다
 *       (아래 KNOWN_FITS — 단계5-틀림.json 의 문제 칸 + 고치며 더 찾은 것: a4-3 renew ← take for granted · a6-5 home-cooked ←
 *       collaborative · a11-3 accountable ← dedicated). 기계는 '뜻이 들어맞는지' 를 모르므로 (3) 은 알려진 것만 본다.
 * exit 1 = 하나라도 어긋남. 같은 AI 계열이 만들고 점검함 — 독립 검수 아님.
 */
const fs = require("fs");
const path = require("path");

const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split("=").slice(1).join("=");
const dirArg = process.argv.includes("--dir") ? process.argv[process.argv.indexOf("--dir") + 1] : arg("dir");
const DIR = path.resolve(dirArg ?? path.join(process.cwd(), "content", "lessons", "adult"));
const BREAK = arg("break");

/** lesson|card word → forms the audit (단계 5) found to fit the blank like the answer */
const KNOWN_FITS = {
  "a1-1|pleasure": ["chance"], // F33
  "a2-3|anticipation": ["peace of mind"], // F02
  "a3-3|outstanding": ["outgoing", "introverted", "reflective"], // F03
  "a4-3|occasional": ["unavoidable"], // F04
  "a4-3|renew": ["pursue", "take for granted"], // F31
  "a5-3|close-knit": ["supportive", "collaborative"], // F05
  "a5-3|supportive": ["close-knit", "collaborative"], // F06
  "a5-5|dedicated": ["collaborative"], // F32
  "a6-3|supportive": ["close-knit", "collaborative"], // F07
  "a6-4|close-knit": ["supportive", "collaborative"], // F08
  "a6-5|home-cooked": ["balanced", "collaborative"], // F09
  "a7-1|found": ["divided", "ruled", "liberated"], // F35
  "a7-2|peninsula": ["nation"], // F36
  "a7-3|rule": ["invaded", "developed"], // F37
  "a8-1|traditional": ["upcoming"], // F38
  "a8-2|perform": ["celebrate"], // F39
  "a8-2|ritual": ["traditional"], // F10
  "a8-2|ancestor": ["elders"], // F40
  "a8-2|elder": ["relatives", "tombs"], // F41
  "a8-2|privilege": ["custom"], // F42
  "a8-3|relative": ["elders"], // F43
  "a8-3|rice cake": ["custom", "offering"], // F44
  "a9-1|aspect": ["costumes", "side dishes"], // F45
  "a9-2|however": ["instead", "finally"], // F46
  "a9-4|finally": ["however"], // F47
  "a9-4|alphabet": ["writing system", "nobility"], // F11
  "a9-4|instead": ["however", "finally"], // F48
  "a9-4|writing system": ["alphabet"], // F12
  "a10-3|witness": ["observe"], // F13
  "a10-3|attraction": ["destination", "capital"], // F14
  "a10-4|regard (A) as (B)": ["witness", "surrounded"], // F49
  "a10-5|spot": ["remains"], // F50
  "a11-1|showcase": ["represent"], // F51
  "a11-2|political scientist": ["first-time voters"], // F52
  "a11-3|accountable": ["upright", "dedicated"], // F15
  "a11-3|slogan": ["political scientists"], // F53
  "a12-1|transformation": ["reforms"], // F16
  "a12-1|revise": ["administered", "eased"], // F54
  "a12-1|reform": ["transformations"], // F55
  "a12-2|pressing": ["fundamental"], // F17
  // 두 번째 고침(fix2-adult, 2026-10-05 사장님 판단 답): 새 빈칸 의심 3 · J12 새 카드
  "a5-2|collaborative": ["supportive", "close-knit"], // 'building the kind of ___ habits'
  "a6-3|collaborative": ["supportive", "close-knit"], // 'into a ___ family activity'
  "a5-4|demanding": ["collaborative", "rushed", "dedicated"], // "the day's most ___ tasks"
  "a7-2|unify": ["ruled", "invaded", "developed", "liberated"], // '… conquered the other two kingdoms and ___ most of the peninsula'
  "a7-2|divide": ["unified"], // 'was ___ into three kingdoms' — 새 카드 꼴이 보기로 들어오지 않게(감사 때 보기 그대로)
};

const lessons = fs
  .readdirSync(DIR)
  .filter((f) => /^a\d+-\d+\.json$/.test(f))
  .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")));
// every blank, with the answer as written (a sentence's first capital dropped, as the build does)
const blanks = [];
for (const l of lessons) {
  for (const it of l.blocks.find((b) => b.type === "sentences").items) {
    for (const w of it.words ?? []) {
      const written = it.text.slice(w.start, w.end);
      const form = w.start === 0 ? written.charAt(0).toLowerCase() + written.slice(1) : written;
      blanks.push({ id: l.id, unit: l.unit, n: it.n, sentence: it.text, w, form });
    }
  }
}
if (BREAK === "same") blanks[0].w.choices = [blanks[0].form, ...blanks[0].w.choices.slice(1)];
// another form of the answer's word ('renew' → 'renews' · 'founded' → 'found') as the first wrong choice of a blank
if (BREAK === "lemma") {
  const b = blanks.find((x) => /^[a-z]+$/i.test(x.form) && x.form.length > 4);
  b.w.choices = [b.form.endsWith("s") ? b.form.slice(0, -1) : `${b.form}s`, ...b.w.choices.slice(1)];
}

const lc = (s) => s.toLowerCase();
/** a phrase with each word's ending (-ing · -ed · -es · -s · -d) dropped: 'looking forward to' = 'look forward to' */
const stem = (s) => lc(s).split(/[\s-]+/).map((t) => t.replace(/(ing|ed|es|s)$/, "").replace(/e$/, "")).join(" ");
const problems = [];
let known = 0;
const seenKnown = new Set();
for (const b of blanks) {
  const where = `${b.id} #${b.n} ${b.w.word} [${b.form}]`;
  const c = b.w.choices ?? [];
  if (c.length !== 3 || new Set(c.map(lc)).size !== 3) problems.push(`${where}: choices ${JSON.stringify(c)} — not 3 different`);
  for (const x of c) {
    if (lc(x) === lc(b.form)) problems.push(`(1) ${where}: wrong choice "${x}" is the answer`);
    const sameCard = blanks.some((o) => o.unit === b.unit && lc(o.form) === lc(x) && lc(o.w.word) === lc(b.w.word));
    if (lc(x) !== lc(b.form) && (sameCard || stem(x) === stem(b.form))) problems.push(`(2) ${where}: wrong choice "${x}" is another form of the answer's own word`);
  }
  const fits = KNOWN_FITS[`${b.id}|${b.w.word}`];
  if (fits) {
    known += 1;
    seenKnown.add(`${b.id}|${b.w.word}`);
    for (const x of c) if (fits.some((f) => lc(f) === lc(x))) problems.push(`(3) ${where}: wrong choice "${x}" fits the blank (단계 5)`);
  }
}
const missing = Object.keys(KNOWN_FITS).filter((k) => !seenKnown.has(k));
for (const k of missing) problems.push(`(3) ${k}: no such blank — KNOWN_FITS is stale`);

console.log(`ADULT blanks: ${blanks.length} in ${lessons.length} lessons (${DIR}) — known-fit blanks checked ${known}/${Object.keys(KNOWN_FITS).length}`);
const by = (p) => problems.filter((x) => x.startsWith(p)).length;
console.log(`(1) answer as a wrong choice: ${by("(1)")} · (2) the answer's own word: ${by("(2)")} · (3) a choice that fits (단계 5): ${by("(3)")} · other: ${problems.length - by("(1)") - by("(2)") - by("(3)")}`);
for (const p of problems) console.log(`  ${p}`);
if (problems.length) {
  console.log("FAIL");
  process.exit(1);
}
console.log("PASS");
