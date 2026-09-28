#!/usr/bin/env node
/**
 * 2026-09-28 새 문제 — 다른 세션이 보는 무작위 표본 검수 묶음(사장님 "1번으로 하자": 문제를 쓰지도 고치지도 않은 세션이 표본을 강의 글에 대조).
 * 강의를 무작위로 골라(씨앗 고정 — 누가 돌려도 같은 표본) 강의마다 문항 하나: LISTENING 36강 · READING 24강(문항 수 비율 756 : 512).
 * 문항마다 강의 글 전체(영어 · 번역, 번호 = 근거 줄 번호)와 LISTENING 칩(1단계에서 듣기 전에 보이는 것 — 화면과 같은 나눔)을 붙인다.
 *   node sample-review-packet.cjs [--seed 20260928] [--ld 36] [--rd 24] [--out <파일.md>]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const Q = path.join(REPO, "docs/qa-2026-09-18/학습법-화면-0927/새-문제");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
let seed = Number(arg("--seed", 20260928));
const N_LD = Number(arg("--ld", 36));
const N_RD = Number(arg("--rd", 24));
const OUT = path.resolve(REPO, arg("--out", path.join(Q, "검수-표본-0928.md")));
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const pick = (arr, n) => {
  const a = [...arr];
  const out = [];
  while (out.length < n && a.length) out.push(a.splice(Math.floor(rnd() * a.length), 1)[0]);
  return out;
};
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const chipsOf = (id) => {
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/ld", `${id}.json`), "utf8"));
  const h = (d.blocks || []).find((b) => b.type === "hints");
  return h && h.text
    ? h.text
        .split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/)
        .map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim())
        .filter((c, i, all) => c && all.indexOf(c) === i)
    : [];
};
const linesOf = (course, id) =>
  course === "ld"
    ? (scripts[id] || []).map((r) => ({ en: r.en, ko: r.ko }))
    : (JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8")).readingSentences || []).map((s) => ({ en: s.english, ko: s.korean }));
const MARKS = ["①", "②", "③", "④"];

const sample = [];
for (const [course, n] of [["ld", N_LD], ["reading", N_RD]]) {
  const files = fs.readdirSync(path.join(Q, course)).filter((f) => f.endsWith(".json")).sort();
  for (const f of pick(files, n)) {
    const d = JSON.parse(fs.readFileSync(path.join(Q, course, f), "utf8"));
    const q = d.questions[Math.floor(rnd() * d.questions.length)];
    sample.push({ course, lesson: d.lesson, q });
  }
}

let md = `# 새 문제 무작위 표본 검수 — ${sample.length}문항 (LISTENING ${N_LD} · READING ${N_RD} · 씨앗 ${arg("--seed", 20260928)})\n\n`;
md += `원본: docs/qa-2026-09-18/학습법-화면-0927/새-문제/{ld,reading}/<강의>.json · 강의 글: content/ld_english_scripts.json · content/lessons/reading/<id>.json\n`;
md += `LISTENING 은 학습자가 듣기 전에 '칩'(이름 · 숫자 · 어려운 말)을 봅니다. 근거 줄 번호 = 아래 강의 글 번호.\n\n`;
sample.forEach(({ course, lesson, q }, i) => {
  const lines = linesOf(course, lesson);
  md += `## ${i + 1}. ${q.id} (${course === "ld" ? "LISTENING" : "READING"} ${lesson} · ${q.type})\n\n`;
  if (course === "ld") md += `칩: ${chipsOf(lesson).join(" | ") || "(없음)"}\n\n`;
  md += `물음: ${q.prompt}\n\n`;
  q.options.forEach((o, k) => (md += `- ${MARKS[k]} ${o}${k === q.answer ? "   ← 정답" : ""}\n`));
  md += `\n근거 줄: ${q.evidence.join(", ")}\n\n강의 글:\n\n`;
  lines.forEach((l, k) => (md += `${k + 1}. ${l.en}\n   ${l.ko || ""}\n`));
  md += `\n`;
});
fs.writeFileSync(OUT, md);
console.log(`${OUT} · ${sample.length}문항 · ${Math.round(md.length / 1024)}KB · ids: ${sample.map((s) => s.q.id).join(" ")}`);
