#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 칩 번짐을 기계로 고르게 셈(읽기만). 일꾼 조각마다 번짐을 센 잣대가 달라(칩-1 · 4 · 5 는 고침 탓만 셈),
 * LISTENING 모든 강 · 모든 문장을 같은 잣대로 한 번에 센다. 칩은 앱 규칙(expectations.cjs hintsForSentence = LdLearningView)과
 * 새 칩 나누기(chips-main.cjs 와 같은 정규식)로 잼. 안전장치(맞는 칩이 없어 강의 칩 전부)로 뜬 칩은 세지 않음(설계).
 *  ① 수 번짐: 맞춰서 뜬 칩 속의 수(숫자 · 수 낱말 · 서수)가 그 문장에 없음 — 받아 적을 수 자리에 다른 수가 겨룸
 *  ② 이름 조각 번짐: 대문자 낱말(이름)로만 맞았는데 그 낱말이 문장에 대문자 낱말 머리로 없음(New ← news · Air ← airplanes · San ← 'tickets and')
 *  ③ 글자 조각 번짐: 소문자 낱말로만 맞았는데 문장의 어느 낱말 머리에도 없음(낱말 가운데 · 두 낱말에 걸침 — times ← sometimes)
 *   node 수정확인-번짐.cjs [--out 파일.json]      스냅샷: KIG_SNAP(없으면 수정확인/기계.json '스냅')
 */
const fs = require("fs");
const path = require("path");
const B = path.resolve(__dirname, "..");
const R = JSON.parse(fs.readFileSync(path.join(B, "수정확인", "기계.json"), "utf8"));
const SNAP = process.env.KIG_SNAP || R.스냅;
const WT = path.resolve(__dirname, "../../../../..");
const E = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs")).loadExpectations();
const NEW = (t) => String(t || "").split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim()).filter((c, i, a) => c && a.indexOf(c) === i);
const squash = (v) => String(v).toLowerCase().replace(/[^a-z0-9]/g, "");
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// expectations.cjs hintsForSentence 의 '맞춤' 을 그대로 옮겨, 무엇으로 맞았는지 돌려줌(null = 안 맞음)
function why(chunk, sentence) {
  const whole = squash(chunk);
  if (whole.length >= 3 && squash(sentence).includes(whole)) return { whole: true, tokens: [] };
  const nums = String(sentence).replace(/(\d),(?=\d{3}(?!\d))/g, "$1");
  const tokens = [];
  for (const token of chunk.split(/\s+/)) {
    const bare = token.replace(/[^A-Za-z0-9'’.]/g, "").replace(/[.'’]+$/, "");
    if (/^\d{2,}$/.test(bare)) { if (new RegExp(`(?<!\\d)${bare}(?!\\d)`).test(nums)) tokens.push({ bare, num: true }); continue; }
    const letters = bare.replace(/[^A-Za-z]/g, "");
    if (letters.length < (/^[A-Z]/.test(bare) ? 3 : 5)) continue;
    if (squash(sentence).includes(squash(bare))) tokens.push({ bare, cap: /^[A-Z]/.test(bare) });
  }
  return tokens.length ? { whole: false, tokens } : null;
}
const NUMWORDS = "one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion first second third fourth fifth sixth seventh eighth ninth tenth eleventh twelfth twentieth hundredth thousandth dozen half twice".split(" ");
function numbersIn(chunk) {
  const out = [];
  for (const m of String(chunk).replace(/(\d),(?=\d{3}(?!\d))/g, "$1").matchAll(/\d+/g)) out.push({ kind: "digit", v: m[0] });
  for (const w of String(chunk).toLowerCase().split(/[^a-z]+/)) if (NUMWORDS.includes(w)) out.push({ kind: "word", v: w });
  return out;
}
function hasNumber(sentence, n) {
  if (n.kind === "digit") return new RegExp(`(?<!\\d)${n.v}(?!\\d)`).test(String(sentence).replace(/(\d),(?=\d{3}(?!\d))/g, "$1"));
  return new RegExp(`\\b${n.v}\\b`, "i").test(sentence);
}
function flags(sentence, chunks) {
  const shown = E.hintsForSentence(sentence, chunks);
  const out = [];
  for (const c of shown) {
    const w = why(c, sentence);
    if (!w) continue; // 안전장치로 뜬 칩(설계)
    const missing = numbersIn(c).filter((n) => !hasNumber(sentence, n)).map((n) => n.v);
    if (missing.length) out.push({ kind: "수", chip: c, what: missing.join(" · ") });
    if (w.whole) continue;
    const real = w.tokens.filter((t) => t.num || (t.cap ? new RegExp(`\\b${esc(t.bare)}`).test(sentence) : new RegExp(`\\b${esc(t.bare)}`, "i").test(sentence)));
    if (real.length) continue;
    const caps = w.tokens.filter((t) => t.cap);
    if (caps.length) out.push({ kind: "이름 조각", chip: c, what: caps.map((t) => t.bare).join(" · ") });
    else out.push({ kind: "글자 조각", chip: c, what: w.tokens.map((t) => t.bare).join(" · ") });
  }
  return out;
}
module.exports = { NEW, flags, why, SNAP, E };
if (require.main !== module) return;
// 깨기 확인: 잡아야 할 것을 잡고, 멀쩡한 것은 안 잡는지
const T = [
  [flags("It traveled 260 meters.", ["37 meters", "260 meters"]), [["수", "37 meters"]]],
  [flags("There was a news flash about a mysterious explosion.", ["New Jersey", "explosion"]), [["이름 조각", "New Jersey"]]],
  [flags("It sometimes rains in spring.", ["humdrum at times", "spring"]), [["글자 조각", "humdrum at times"]]],
  [flags("He went to New Jersey in 1938.", ["New Jersey", "1938"]), []],
];
for (const [got, want] of T) if (JSON.stringify(got.map((f) => [f.kind, f.chip])) !== JSON.stringify(want)) { console.error("도구 확인 실패", JSON.stringify(got), JSON.stringify(want)); process.exit(3); }
console.log("도구 확인 ✔ (수 번짐 · 이름 조각 · 글자 조각을 잡고 멀쩡한 칩은 안 잡음)");
const sc = JSON.parse(fs.readFileSync(path.join(SNAP, "content/ld_english_scripts.json"), "utf8"));
// --with 수정확인/고칠-칩.json: 고칠 힌트 줄을 넣은 뒤에 남는 번짐을 셈(스냅샷은 안 바꿈)
const wi = process.argv.indexOf("--with");
const over = wi > 0 ? new Map(JSON.parse(fs.readFileSync(path.resolve(process.argv[wi + 1]), "utf8")).강.map((x) => [x.강, x["고칠 힌트 줄"]])) : new Map();
if (wi > 0) console.log(`고칠 힌트 줄 ${over.size}강을 넣은 뒤로 셈`);
const res = [];
let lessons = 0, sentences = 0;
for (const base of Object.keys(sc).sort()) {
  const f = path.join(SNAP, `content/lessons/ld/${base}.json`);
  if (!fs.existsSync(f)) continue;
  const hb = (JSON.parse(fs.readFileSync(f, "utf8")).blocks || []).find((b) => b.type === "hints");
  const chunks = NEW(over.has(base) ? over.get(base) : hb ? hb.text : "");
  if (!chunks.length) continue;
  lessons++;
  for (const r of sc[base] || []) { sentences++; for (const x of flags(String(r.en || ""), chunks)) res.push({ 강: base, n: r.n, ...x, en: r.en }); }
}
const by = (k) => res.filter((r) => r.kind === k);
console.log(`스냅샷 ${SNAP} · 힌트 있는 강 ${lessons} · 문장 ${sentences}`);
for (const k of ["수", "이름 조각", "글자 조각"]) console.log(`${k} 번짐 ${by(k).length}곳 · ${new Set(by(k).map((r) => r.강)).size}강`);
const oi = process.argv.indexOf("--out");
if (oi > 0) fs.writeFileSync(path.resolve(process.argv[oi + 1]), JSON.stringify({ 스냅: SNAP, 강: lessons, 문장: sentences, 번짐: res }, null, 1));
for (const r of res) console.log(`${r.kind}\t${r.강} n${r.n}\t[${r.chip}]\t${r.what}\t← ${r.en}`);
