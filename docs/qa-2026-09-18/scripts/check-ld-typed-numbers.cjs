#!/usr/bin/env node
/**
 * LISTENING 받아쓰기 입력 모드 채점(src/lib/listeningUtils.ts typedDictationMatches) — 6단계 G1 · 결정표 1번(소유자 결정 2026-09-23)의 시험.
 * 6단계-작업기록.md G1 행이 적은 시험을 그대로: 2,217행 모두 자기 정답 통과 · 소리대로 친 꼴 통과 · 다른 수는 틀림 · 하이픈 꼴 · 띄운 꼴 둘 다 통과.
 *
 * '소리대로 친 꼴' 은 이 파일 안의 따로 만든 변환기(수 → 낱말: 연도는 nineteen sixty-eight, 시각은 two o'clock / five thirty,
 * 서수 eighteenth, 돈 five dollars, 퍼센트 seventy percent, 분수 one and a half)로 만든다 — 앱 코드와 다른 구현이라 서로를 베끼지 않는다.
 * 같은 꼴을 옛 채점(2026-09-23 전 LdLearningView normalizeTyped)에도 넣어, 옛 채점은 틀림 · 새 채점은 맞음이 되는지도 센다.
 *
 *   node check-ld-typed-numbers.cjs          # 어긋나면 exit 1
 *   node check-ld-typed-numbers.cjs --list   # 행마다 만든 꼴을 보임
 */
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const E = require("./lib/expectations.cjs");
const app = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const { spokenTypedForm } = app;
const LIST = process.argv.includes("--list");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);

// 옛 채점(2026-09-23 전) — 대조군
const legacy = (t) => t.toLowerCase().replace(/\s+/g, " ").replace(/[^a-z0-9 ]/g, "").replace(/\s+/g, " ").trim();
const oldMatches = (typed, target) => legacy(typed) === legacy(target);
// 일부러 깨기: legacy = 옛 채점으로 돌림(소리 꼴 · 띄운 하이픈이 틀려야) · lenient = 숫자를 모두 지우는 헐거운 채점(다른 수가 맞아야 — 잡혀야)
const typedDictationMatches = BREAK === "legacy" ? oldMatches
  : BREAK === "lenient" ? (a, b) => app.typedDictationMatches(a.replace(/\d+/g, ""), b.replace(/\d+/g, "")) || spokenTypedForm(a).replace(/\d+/g, "") === spokenTypedForm(b).replace(/\d+/g, "")
  : app.typedDictationMatches;
if (BREAK) console.log(`[일부러 깨기: ${BREAK}] — 실패해야 맞음`);

// ── 수 → 낱말(시험용, 앱 코드와 따로 씀) ──
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function words(n) {
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` ${words(n % 100)}` : ""}`;
  for (const [v, name] of [[1e9, "billion"], [1e6, "million"], [1e3, "thousand"]]) if (n >= v) return `${words(Math.floor(n / v))} ${name}${n % v ? ` ${words(n % v)}` : ""}`;
  return String(n);
}
function yearWords(n) {
  const hi = Math.floor(n / 100), lo = n % 100;
  if (n >= 2000 && n < 2010) return `two thousand${lo ? ` ${words(lo)}` : ""}`;
  if (lo === 0) return `${words(hi)} hundred`;
  if (lo < 10) return `${words(hi)} oh ${words(lo)}`;
  return `${words(hi)} ${words(lo)}`;
}
const ORD_IRREGULAR = { 1: "first", 2: "second", 3: "third", 5: "fifth", 8: "eighth", 9: "ninth", 12: "twelfth" };
function ordWords(n) {
  if (n < 20) return ORD_IRREGULAR[n] || `${ONES[n]}th`;
  if (n < 100) return n % 10 === 0 ? TENS[n / 10].replace(/y$/, "ieth") : `${TENS[Math.floor(n / 10)]}-${ordWords(n % 10)}`;
  return `${words(n - (n % 100))} ${ordWords(n % 100)}`;
}
const plural = (w) => w.replace(/y$/, "ie") + "s";

/** 문장 안의 수를 소리대로 — 여러 꼴이 있으면 첫 꼴(시각은 o'clock) */
function speak(sentence, clockStyle = "oclock") {
  let s = sentence;
  s = s.replace(/\$(\d[\d,]*)(?:\.(\d{2}))?/g, (_, d, c) => { const n = Number(d.replace(/,/g, "")); return `${words(n)} dollar${n === 1 ? "" : "s"}${c ? ` and ${words(Number(c))} cents` : ""}`; });
  s = s.replace(/(\d+)%/g, (_, d) => `${words(Number(d))} percent`);
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h, m) => m === "00" ? (clockStyle === "oclock" ? `${words(Number(h))} o'clock` : clockStyle === "bare" ? words(Number(h)) : `${Number(h)} o'clock`) : `${words(Number(h))} ${Number(m) < 10 ? `oh ${words(Number(m))}` : words(Number(m))}`);
  s = s.replace(/\b1 1\/2\b/g, "one and a half");
  s = s.replace(/\b(\d+)(st|nd|rd|th)\b/gi, (_, d) => ordWords(Number(d)));
  s = s.replace(/\b(\d{4})s\b/g, (_, d) => { const y = yearWords(Number(d)).split(" "); y[y.length - 1] = plural(y[y.length - 1]); return y.join(" "); });
  s = s.replace(/\b\d{1,3}(?:,\d{3})+\b/g, (m) => words(Number(m.replace(/,/g, ""))));
  s = s.replace(/\b(1[1-9]\d{2}|20\d{2})\b/g, (_, d) => yearWords(Number(d)));
  s = s.replace(/\b\d+\b/g, (m) => words(Number(m)));
  return s;
}
/** 다른 수 — 첫 수를 하나 바꿈(시각은 한 시간 뒤, 그 밖은 +1) */
function otherNumber(sentence) {
  let done = false;
  return sentence.replace(/\b(\d{1,2}):(\d{2})\b|\$?\d[\d,]*(?:\.\d+)?/g, (m, h, mm) => {
    if (done) return m;
    done = true;
    if (h) return `${(Number(h) % 12) + 1}:${mm}`;
    const cur = m.startsWith("$") ? "$" : "";
    const n = Number(m.replace(/[$,]/g, ""));
    return `${cur}${Number.isInteger(n) ? n + 1 : n + 1}`;
  });
}

const rows = [];
for (const [id, script] of Object.entries(E.ldScripts)) for (const r of script) rows.push({ id, n: r.n, en: String(r.en) });

const fail = [];
let exact = 0, numRows = 0, spokenOk = 0, spokenOkOld = 0, clockVariants = 0, clockOk = 0, otherTried = 0, otherRejected = 0,
  hyRows = 0, hySpaceOk = 0, hyGlueOk = 0, hySpaceOld = 0, wordTried = 0, wordRejected = 0;
for (const r of rows) {
  const t = r.en;
  if (typedDictationMatches(t, t) && typedDictationMatches(t.toUpperCase().replace(/[.,!?]/g, ""), t)) exact++;
  else fail.push(`자기 정답 못 받음 ${r.id}:${r.n} ${t}`);

  if (/\d/.test(t)) {
    numRows++;
    const sp = speak(t);
    const ok = typedDictationMatches(sp, t) && typedDictationMatches(sp.replace(/-/g, " "), t);
    if (ok) spokenOk++; else fail.push(`소리대로 친 꼴 못 받음 ${r.id}:${r.n}\n     정답 ${t}\n     입력 ${sp}\n     새 꼴 ${spokenTypedForm(t)} | ${spokenTypedForm(sp)}`);
    if (oldMatches(sp, t)) spokenOkOld++;
    if (/\b\d{1,2}:00\b/.test(t)) for (const style of ["bare", "digit"]) {
      clockVariants++;
      if (typedDictationMatches(speak(t, style), t)) clockOk++; else fail.push(`시각 다른 꼴 못 받음 ${r.id}:${r.n} ${speak(t, style)}`);
    }
    const other = otherNumber(t);
    if (other !== t) {
      for (const typed of [other, speak(other)]) {
        otherTried++;
        if (!typedDictationMatches(typed, t)) otherRejected++; else fail.push(`다른 수를 받아 줌 ${r.id}:${r.n}\n     정답 ${t}\n     입력 ${typed}`);
      }
    }
  }
  const hy = t.match(/\b[a-z]+(?:-[a-z]+)+\b/gi);
  if (hy) {
    hyRows++;
    const spaced = t.replace(/\b([a-z]+)-(?=[a-z])/gi, "$1 ");
    const glued = t.replace(/\b([a-z]+)-(?=[a-z])/gi, "$1");
    if (typedDictationMatches(spaced, t)) hySpaceOk++; else fail.push(`하이픈을 띄운 꼴 못 받음 ${r.id}:${r.n} ${spaced}`);
    if (typedDictationMatches(glued, t)) hyGlueOk++; else fail.push(`하이픈을 붙인 꼴 못 받음 ${r.id}:${r.n} ${glued}`);
    if (oldMatches(spaced, t)) hySpaceOld++;
  }
  // 낱말 하나를 다른 낱말로 — 여전히 틀려야 함
  const w = t.match(/\b[a-z]{5,}\b/i);
  if (w) {
    wordTried++;
    const wrong = t.replace(w[0], w[0].toLowerCase() === "people" ? "persons" : "people");
    if (!typedDictationMatches(wrong, t)) wordRejected++; else fail.push(`틀린 낱말을 받아 줌 ${r.id}:${r.n} ${wrong}`);
  }
}

// 명령서 · 3차 점검 #4 가 든 꼴 그대로
const named = [
  ["1968", "nineteen sixty-eight", true], ["In 1968 he left.", "In nineteen sixty eight he left", true], ["In 1968 he left.", "In 1986 he left.", false],
  ["It's 2:00.", "It's two o'clock.", true], ["It's 2:00.", "It's two.", true], ["It's 2:00.", "It's 2 o'clock.", true], ["It's 2:00.", "It's three o'clock.", false],
  ["for 1 1/2 seconds", "for one and a half seconds", true], ["for 1 1/2 seconds", "for two and a half seconds", false],
  ["It costs $5.", "It costs five dollars.", true], ["It costs $5.", "It costs six dollars.", false],
  ["about 70% of them", "about seventy percent of them", true], ["about 70% of them", "about seventeen percent of them", false],
  ["a left-handed boy", "a left handed boy", true], ["a left-handed boy", "a lefthanded boy", true], ["a left-handed boy", "a left-handed boy", true],
  ["It was $4.95.", "It was four dollars and ninety-five cents.", true], ["at 8:40 a.m.", "at eight forty a.m.", true], ["at 12:30", "at twelve thirty", true],
  ["the 18th century", "the eighteenth century", true], ["the 21st century", "the twenty-first century", true], ["in the 1960s", "in the nineteen sixties", true],
  ["185,000,000 people", "one hundred eighty-five million people", true], ["185,000,000 people", "185 million people", true], ["$65,000 a year", "sixty-five thousand dollars a year", true],
  ["2 years", "too years", false], ["one of them", "won of them", false],
];
let namedOk = 0;
for (const [target, typed, want] of named) { if (typedDictationMatches(typed, target) === want) namedOk++; else fail.push(`든 꼴 어긋남: '${typed}' ↔ '${target}' 기대 ${want ? "맞음" : "틀림"}`); }

console.log(`LISTENING 받아쓰기 ${rows.length}행`);
console.log(`  자기 정답(그대로 · 대문자와 기호를 바꿔 친 꼴) 통과 ${exact}/${rows.length}`);
console.log(`  수가 든 행 ${numRows}: 소리대로 친 꼴 통과 ${spokenOk}/${numRows} (옛 채점이면 ${spokenOkOld}/${numRows}) · 정각의 다른 꼴(two · 2 o'clock) ${clockOk}/${clockVariants}`);
console.log(`  다른 수(숫자 · 소리 꼴)를 틀림으로 ${otherRejected}/${otherTried}`);
console.log(`  하이픈 낱말 든 행 ${hyRows}: 띄운 꼴 통과 ${hySpaceOk}/${hyRows} (옛 채점이면 ${hySpaceOld}/${hyRows}) · 붙인 꼴 통과 ${hyGlueOk}/${hyRows}`);
console.log(`  낱말 하나를 바꾼 틀린 답을 틀림으로 ${wordRejected}/${wordTried}`);
console.log(`  명령서 · 3차 점검이 든 꼴 ${namedOk}/${named.length}`);
for (const f of fail.slice(0, 40)) console.log(`  ✗ ${f}`);
if (fail.length > 40) console.log(`  … ${fail.length - 40} 더`);
if (LIST) for (const r of rows.filter((x) => /\d/.test(x.en))) console.log(`${r.id}:${r.n} ${r.en}\n     ${speak(r.en)}`);
process.exit(fail.length ? 1 : 0);
