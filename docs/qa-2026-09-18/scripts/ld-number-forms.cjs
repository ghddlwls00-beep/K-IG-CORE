#!/usr/bin/env node
/**
 * LISTENING 받아쓰기 2,217행에서 수를 **숫자로** 적은 행이 몇 개이고 어떤 모양인지 센다 — 입력 채점(LdLearningView.tsx
 * handleCheckDictation 의 normalizeTyped)은 소문자·기호만 정리하므로, 음성이 "two"·"two o'clock"·"eighteenth" 로 읽는
 * 수를 학습자가 소리대로 치면 틀림이 된다(6단계 숫자 묶음 G1 의 근거).
 * 그리고 같은 강의 힌트(첫 hints 블록)가 그 수를 **낱말로** 적은 곳 — 4단계 #51 결정("문장은 그대로, 힌트를 숫자로")에 걸리는 곳 — 을 찾는다.
 *
 *   node ld-number-forms.cjs            합계
 *   node ld-number-forms.cjs --hints    힌트가 낱말로 적은 곳을 하나씩
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const REPO = path.resolve(__dirname, "../../..");
const HINTS = process.argv.includes("--hints");

const KINDS = [
  ["시각 (2:00)", /\b\d{1,2}:\d{2}\b/g],
  ["서수 (18th)", /\b\d+(?:st|nd|rd|th)\b/gi],
  ["연도 (1908)", /\b1[5-9]\d{2}s?\b|\b20\d{2}\b/g],
  ["큰 수 (7,000)", /\b\d{1,3}(?:,\d{3})+\b/g],
  ["분수 (1 1/2)", /\b\d+\/\d+\b/g],
  ["돈·퍼센트", /\$\d[\d,.]*|\b\d+(?:\.\d+)?\s?(?:%|percent)/g],
  ["그 밖의 수 (2 · 44 · 100)", /\b\d+(?:\.\d+)?\b/g],
];
const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const NUMWORD = new RegExp(`\\b(?:${[...ONES, ...TENS.filter(Boolean), "hundred", "thousand", "million", "billion", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth", "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth"].join("|")})(?:-\\w+)?\\b`, "i");

let rows = 0, withDigits = 0;
const kinds = Object.fromEntries(KINDS.map(([k]) => [k, 0]));
const hintHits = [];
for (const [id, script] of Object.entries(E.ldScripts)) {
  const file = path.join(REPO, "content/lessons/ld", `${id}.json`);
  const hints = fs.existsSync(file) ? (((JSON.parse(fs.readFileSync(file, "utf8")).blocks || []).find((b) => b.type === "hints") || {}).text || "") : "";
  const chunks = E.hintChunks(hints);
  for (const r of script) {
    rows++;
    let rest = String(r.en);
    let any = false;
    for (const [k, re] of KINDS) {
      const m = rest.match(re);
      if (m) { kinds[k] += m.length; any = true; rest = rest.replace(re, " "); }
    }
    if (!any) continue;
    withDigits++;
    // 이 행에 뜨는 칩 가운데 수를 낱말로 적은 칩
    for (const c of E.hintsForSentence(r.en, chunks)) if (NUMWORD.test(c)) hintHits.push(`${id}:${r.n} 칩 「${c}」 | ${r.en}`);
  }
}
console.log(`LISTENING 받아쓰기 ${rows}행 중 수를 숫자로 적은 행 ${withDigits}`);
console.log(`  모양별 개수: ${Object.entries(kinds).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
console.log(`  그 행에 뜨는 칩 가운데 수를 낱말로 적은 칩: ${hintHits.length}`);
if (HINTS) for (const h of hintHits) console.log(`   ${h}`);
