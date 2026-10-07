#!/usr/bin/env node
// integrate-c (2026-10-08 고침3): capture-c.cjs 가 단계마다 적은 화면 글(out/ui-1007/after-local-c/texts.jsonl — 쪽 title · body innerText ·
// 보이는 aria-label)에서
//   A 머리 영어: Chapter · TOPIC · Topic · Section · Series · Stage (낱말 경계 · 대소문자 그대로) — 0 이어야
//   B 'N단계'(강의 안 순서 뜻) — 등급(제 N단계 · 중등 단어 N단계 · 중등 1~3단계)과 개수(N단계 학습 · …까지 6단계.)는 따로 세고 0 이어야 하는 것은 '순서' 뿐
//   C 옛 이름: 'Ch 1-1' · 'Part 1 ·' · '학습 완료 체크' · '학습 완료 취소' · '서버에 저장됨' — 0 이어야
// 를 셈. --break: 첫 줄 글에 'Chapter 1.' · '2단계 퀴즈를' 를 붙여 A · B 가 잡히는지(exit 1 이어야).
//   node check-texts-c.cjs [--break] [--file <texts.jsonl>]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const FILE = arg("--file", path.join(REPO, "docs/qa-2026-09-18/out/ui-1007/after-local-c/texts.jsonl"));
const BREAK = process.argv.includes("--break");
const rows = fs.readFileSync(FILE, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
if (BREAK && rows[0]) rows[0].body += "\nChapter 1. 자기소개 · 2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요.";
const HEAD = /\b(Chapter|TOPIC|Topic|Section|Series|Stage)\b/g;
const STEP = /(\S{0,8}\s?)(\d+(?:~\d+)?)단계(\s?\S{0,8})/g;
const GRADE = (pre, n, post) => /제\s?$/.test(pre) || /(단어|중등|고등)\s?$/.test(pre) || /~/.test(n);
const COUNT = (pre, n, post) => /^\s?학습/.test(post) || /^\s?\.?$/.test(post) && /까지\s?$/.test(pre) || /^\s?(학습|모드)/.test(post);
const OLD = [/\bCh \d+-\d+/g, /\bPart \d+ ·/g, /학습 완료 체크/g, /학습 완료 취소/g, /서버에 저장됨/g];
const out = { rows: rows.length, A: [], B: [], Bgrade: 0, Bcount: 0, C: [] };
const ctx = (s, i, len) => s.slice(Math.max(0, i - 30), i + len + 30).replace(/\s+/g, " ");
for (const r of rows) {
  const where = `${r.theme}|${r.vp}|${r.slug}|${r.state}`;
  for (const [field, text] of [["title", r.title || ""], ["body", r.body || ""], ["aria", r.aria || ""]]) {
    for (const m of text.matchAll(HEAD)) out.A.push({ where, field, word: m[1], at: ctx(text, m.index, m[0].length) });
    for (const m of text.matchAll(STEP)) {
      const [, pre, n, post] = m;
      if (GRADE(pre, n, post)) { out.Bgrade++; continue; }
      if (COUNT(pre, n, post)) { out.Bcount++; continue; }
      out.B.push({ where, field, at: ctx(text, m.index, m[0].length) });
    }
    for (const re of OLD) for (const m of text.matchAll(re)) out.C.push({ where, field, at: ctx(text, m.index, m[0].length) });
  }
}
const uniq = (list) => { const seen = new Map(); for (const x of list) { const k = x.at; if (!seen.has(k)) seen.set(k, { ...x, n: 0 }); seen.get(k).n++; } return [...seen.values()]; };
const summary = { file: FILE, rows: out.rows, A: out.A.length, B: out.B.length, C: out.C.length, Bgrade: out.Bgrade, Bcount: out.Bcount, Aunique: uniq(out.A).slice(0, 30), Bunique: uniq(out.B).slice(0, 30), Cunique: uniq(out.C).slice(0, 30) };
console.log(JSON.stringify(summary, null, 1));
console.log(out.A.length + out.B.length + out.C.length === 0 ? "PASS — 머리 영어 0 · 'N단계'(순서) 0 · 옛 이름 0" : `FAIL — 머리 영어 ${out.A.length} · 'N단계' ${out.B.length} · 옛 이름 ${out.C.length}`);
process.exitCode = out.A.length + out.B.length + out.C.length === 0 ? 0 : 1;
