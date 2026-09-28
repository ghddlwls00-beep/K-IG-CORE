#!/usr/bin/env node
/**
 * 2026-09-28 새 문제(LISTENING 실전 · READING 이해 — 학습법-화면-0927/새-문제-설계.md) 기계 검사.
 * 문제 파일: docs/qa-2026-09-18/학습법-화면-0927/새-문제/{ld,reading}/<id>.json (시범은 새-문제/pilot/…)
 *   {"v":1,"lesson":"d001","course":"ld","questions":[{id,type,prompt,options[4],answer,evidence[],note}]}
 * 보는 것(하나라도 걸리면 exit 1):
 *   모양(보기 4 · 서로 다름 · answer 0~3 · 근거 줄이 글 안 · 문항 수 = 설계 규칙) · 보기가 영어 줄을 그대로 옮김 0 ·
 *   정답이 혼자 가장 긴 비율 ≤ 35%(시범 64% — 가장 긴 것만 골라도 맞던 치우침) · 정답 자리 A~D 각 15 ~ 35% ·
 *   물음 끝맺음은 '…것은?' / '…은?' 꼴(‘…요?’ 0) · 문장 보기 끝 마침표 0 · 같은 강의 안 같은 물음 0
 *   node check-new-questions.cjs [--dir <폴더>] [--break length|shape|evidence]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DIR = path.resolve(REPO, arg("--dir", "docs/qa-2026-09-18/학습법-화면-0927/새-문제"));
const BREAK = arg("--break", "");
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const ldLines = (id) => {
  const v = scripts[id] || scripts[id.replace(/-1$/, "")];
  return Array.isArray(v) ? v : v && Array.isArray(v.rows) ? v.rows : [];
};
const rdLines = (id) => {
  const f = path.join(REPO, "content/lessons/reading", `${id}.json`);
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")).readingSentences || [] : [];
};
const problems = [];
const bad = (where, what) => problems.push(`${where}: ${what}`);
let questions = 0, longest = 0;
const pos = [0, 0, 0, 0];
for (const course of ["ld", "reading"]) {
  const dir = path.join(DIR, course);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const lines = course === "ld" ? ldLines(d.lesson) : rdLines(d.lesson);
    const n = lines.length;
    const want = course === "ld" ? (n <= 6 ? 2 : 3) : 2;
    if (!n) bad(d.lesson, "글을 찾지 못함");
    if ((d.questions || []).length !== want) bad(d.lesson, `문항 ${d.questions.length}(기대 ${want})`);
    const english = new Set(lines.map((l) => String(l.en || l.english || "").trim().toLowerCase()).filter(Boolean));
    const prompts = new Set();
    for (const q of d.questions || []) {
      questions++;
      const where = `${d.lesson} ${q.id}`;
      const opts = BREAK === "shape" && questions === 1 ? q.options.slice(0, 3) : q.options;
      if (!Array.isArray(opts) || opts.length !== 4 || new Set(opts).size !== 4) bad(where, "보기 4개 · 서로 다름 아님");
      if (!(q.answer >= 0 && q.answer <= 3)) bad(where, `answer ${q.answer}`);
      const ev = BREAK === "evidence" && questions === 1 ? [n + 5] : q.evidence || [];
      if (!ev.length || ev.some((e) => !(e >= 1 && e <= n))) bad(where, `근거 줄 ${JSON.stringify(ev)} (글 ${n}줄)`);
      if (opts.some((o) => english.has(String(o).trim().toLowerCase()))) bad(where, "보기가 영어 줄을 그대로 옮김");
      if (/요\?\s*$/.test(q.prompt)) bad(where, "물음 끝이 '…요?'");
      if (opts.some((o) => /[.。]\s*$/.test(String(o)))) bad(where, "보기 끝 마침표");
      if (prompts.has(q.prompt)) bad(where, "같은 강의 안 같은 물음");
      prompts.add(q.prompt);
      pos[q.answer] = (pos[q.answer] || 0) + 1;
      const lens = opts.map((o) => String(o).length);
      const a = lens[q.answer];
      const strictlyLongest = lens.every((l, i) => i === q.answer || l < a);
      if (strictlyLongest || (BREAK === "length" && questions % 2 === 0)) longest++;
    }
  }
}
const share = questions ? longest / questions : 0;
if (questions && share > 0.35) bad("전체", `정답이 혼자 가장 긴 문항 ${longest}/${questions} (${Math.round(share * 100)}% — 35% 넘음)`);
for (let i = 0; i < 4; i++) {
  const s = questions ? pos[i] / questions : 0;
  if (questions >= 20 && (s < 0.15 || s > 0.35)) bad("전체", `정답 자리 ${"ABCD"[i]} ${Math.round(s * 100)}%`);
}
console.log(`${path.relative(REPO, DIR)} · 문항 ${questions} · 정답이 혼자 가장 긴 것 ${longest}(${Math.round(share * 100)}%) · 자리 A ${pos[0]} B ${pos[1]} C ${pos[2]} D ${pos[3]}${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
for (const p of problems.slice(0, 30)) console.log("  - " + p);
if (problems.length > 30) console.log(`  … ${problems.length - 30} 더`);
console.log(problems.length ? `FAIL ${problems.length}` : "PASS");
process.exit(problems.length ? 1 : 0);
