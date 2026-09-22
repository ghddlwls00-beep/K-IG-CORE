#!/usr/bin/env node
/**
 * 데이터 위생 점검 — 내용은 있는데 "모양"이 망가진 곳.
 *
 * The completeness pass asks whether something is missing and the content review asks whether it
 * is right. Neither catches text that is present and correct but malformed, and malformed text in
 * this app is not cosmetic: a graded answer is compared as a STRING, and an answer stored as
 * "1. I was poor." marks a learner who writes "I was poor." wrong (GRADE-03). A spoken text is
 * hashed to find its clip, so a stray character means a different clip, or none.
 *
 * Everything here is offline and mechanical — it never judges meaning, only shape.
 *
 *   node check-data-hygiene.cjs [--course grammar1]
 * Output: out/data-hygiene.json
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const ONLY = arg("--course", null);

const found = {};
const add = (course, kind, where, detail, severity) => {
  ((found[kind] ||= { severity, items: [] })).items.push({ course, where, detail });
};

/** Checks that apply to any string a learner reads or is graded against. */
const SHAPE = [
  { kind: "leading-number", severity: "P2", re: /^\s*\d+\s*[.)]\s*\S/, why: "문장 앞에 문항 번호가 붙어 있음 — 채점 기준이 되면 바른 답이 오답 처리됨" },
  { kind: "html-entity", severity: "P2", re: /&(amp|lt|gt|quot|nbsp|#\d+);/, why: "HTML 기호가 글자 그대로 남아 있음" },
  { kind: "replacement-char", severity: "P1", re: /�/, why: "글자가 깨져 있음 (인코딩 손상)" },
  { kind: "mojibake", severity: "P1", re: /[ÃÂ][-¿]|â€[]/, why: "한글·따옴표가 깨진 채로 저장돼 있음" },
  { kind: "double-space", severity: "P3", re: /\S {2,}\S/, why: "문장 중간에 공백이 두 칸 이상" },
  { kind: "space-before-punct", severity: "P3", re: /\s+[.,!?;:](\s|$)/, why: "문장 부호 앞에 공백" },
  { kind: "unclosed-bracket", severity: "P3", re: /\([^)]*$|^[^(]*\)/, why: "괄호가 짝이 안 맞음" },
  { kind: "trailing-separator", severity: "P3", re: /[,;/]\s*$/, why: "문장이 쉼표나 빗금으로 끝남" },
  { kind: "tab-or-newline", severity: "P3", re: /[\t\n\r]/, why: "탭이나 줄바꿈이 문장 안에 들어 있음" },
];

const check = (course, where, text, label) => {
  const s = String(text);
  for (const r of SHAPE) {
    if (r.re.test(s)) add(course, r.kind, where, `${label}: ${JSON.stringify(s.slice(0, 90))} — ${r.why}`, r.severity);
  }
};

for (const course of E.COURSES) {
  if (ONLY && course !== ONLY) continue;
  for (const p of E.pages(course)) {
    if (!E.hasLesson(course, p.id)) continue;
    const where = `${course}/${p.id}`;
    const x = E.expected(course, p.id);

    // graded answers matter most: they are compared as strings
    for (const a of x.answers) {
      check(course, where, a.text, `${a.n}번 정답`);
      for (const alt of a.alternatives || []) check(course, where, alt, `${a.n}번 대체답안`);
      // an alternative identical to the model answer is dead weight the learner is shown
      if ((a.alternatives || []).some((alt) => E.clean(alt) === E.clean(a.text))) {
        add(course, "duplicate-alternative", where, `${a.n}번: 대체 답안이 모범 답안과 같음 — 화면에 "또는:" 으로 같은 문장이 한 번 더 나옴`, "P3");
      }
    }
    // and every string the learner reads on screen
    for (const t of x.texts) check(course, where, t.text, t.kind);
  }
}

const totals = {};
for (const [kind, g] of Object.entries(found)) totals[kind] = { severity: g.severity, count: g.items.length, lessons: new Set(g.items.map((i) => i.where)).size };
const grand = Object.values(totals).reduce((a, t) => a + t.count, 0);
fs.writeFileSync(path.join(OUT, "data-hygiene.json"), JSON.stringify({ at: new Date().toISOString(), totals, found }, null, 1));

console.log(`데이터 위생 점검 — 지적 ${grand}건\n`);
for (const [kind, t] of Object.entries(totals).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${t.severity}  ${String(t.count).padStart(5)} × ${kind.padEnd(22)} (강의 ${t.lessons}개)`);
  for (const i of found[kind].items.slice(0, 3)) console.log(`            ${i.where} — ${i.detail.slice(0, 130)}`);
}
console.log(`\n→ ${path.join(OUT, "data-hygiene.json")}`);
