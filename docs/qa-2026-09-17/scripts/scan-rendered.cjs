#!/usr/bin/env node
/**
 * Phase 4/5 — what a LIFE learner actually SEES (desktop step texts saved by the
 * v2 sweep in out/rendered-v2/<course>/<id>.json), scanned for artefacts that the
 * content review found in the data, to confirm they reach the screen, plus
 * generic render leaks.
 *
 * Output: out/rendered-scan.json and counts per pattern with example lessons.
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "../out/rendered-v2");
const PATTERNS = [
  ["placeholder 핵심 어휘", /\(핵심 어휘\)/],
  ["STUDENT PASS-OFF placeholder", /PASS-OFF/],
  ["legacy title ':::' K-IG 교육 영어듣기훈련프로그램", /:::\s*K-IG 교육 영어듣기훈련프로그램/],
  ["exam choice markers ①②③", /[①②③④⑤]/],
  ["glossary note '*word:'", /\*[a-z]+:\s*[가-힣]/],
  ["underline markers (a)…(e)", /\((a|b|c|d|e)\)[a-z]/],
  ["'준비 중' placeholder", /준비 중/],
  ["undefined / NaN / [object Object]", /\bundefined\b|\bNaN\b|\[object Object\]/],
  ["'단어' fallback meaning line", /\n단어\n/],
  ["year 7904", /7904/],
  ["'구매 링크 준비 중'", /구매 링크 준비 중/],
  ["mojibake (replacement char)", /�/],
];
const hits = {};
let files = 0;
for (const course of fs.existsSync(DIR) ? fs.readdirSync(DIR) : []) {
  for (const f of fs.readdirSync(path.join(DIR, course))) {
    files++;
    const steps = JSON.parse(fs.readFileSync(path.join(DIR, course, f), "utf8"));
    const text = steps.map((s) => s.text || "").join("\n");
    for (const [name, re] of PATTERNS) {
      if (re.test(text)) {
        const h = (hits[name] ||= { lessons: 0, examples: [] });
        h.lessons++;
        if (h.examples.length < 8) {
          const m = text.match(re);
          h.examples.push(`${course}/${f.replace(".json", "")}: …${text.slice(Math.max(0, m.index - 40), m.index + 40).replace(/\n/g, " ⏎ ")}…`);
        }
      }
    }
  }
}
fs.writeFileSync(path.join(__dirname, "../out/rendered-scan.json"), JSON.stringify({ at: new Date().toISOString(), files, hits }, null, 1));
console.log(`rendered lesson files scanned: ${files}`);
for (const [name] of PATTERNS) {
  const h = hits[name];
  console.log(`${String(h ? h.lessons : 0).padStart(4)}  ${name}`);
  if (h) for (const e of h.examples.slice(0, 3)) console.log(`        ${e}`);
}
