#!/usr/bin/env node
/**
 * READING 지문 블록 = 문장 줄 이음 — 256개 단위 전부.
 *   prNNN.json   의 instruction 블록(영어 지문 통째)   = readingSentences 영어를 공백 하나로 이은 것
 *   prNNN-1.json 의 instruction 블록(한국어 지문 통째) = readingSentences 한국어를 공백 하나로 이은 것
 * 6단계 READING 에서 줄 나눔 도구(split-reading-row.cjs)의 koRewrite 가 한국어 블록을 안 바꿔 4곳이 어긋났던 일
 * (pr087-1 · pr152-1 · pr178-1 · pr222-1, 2026-09-23 에 맞춤) 뒤로 만든 검사. 다르면 exit 1.
 *
 *   node check-reading-passage-blocks.cjs [--list] [--break]
 *   --break : 메모리에서 pr001 영어 한 줄 · pr002-1 한국어 한 줄에 글자를 붙여 두 곳이 잡히는지 본다(검사가 틀릴 수 있음을 보이는 시험).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/reading");
const BREAK = process.argv.includes("--break");
let units = 0;
const bad = [];
for (const f of fs.readdirSync(dir).filter((x) => /^pr\d+(-1)?\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const ko = f.endsWith("-1.json");
  if (!ko) units++;
  const rows = (d.readingSentences || []).map((s) => ({ ...s }));
  if (BREAK && (f === "pr001.json" || f === "pr002-1.json") && rows.length) rows[0] = { ...rows[0], [ko ? "korean" : "english"]: rows[0][ko ? "korean" : "english"] + "X" };
  const want = rows.map((s) => (ko ? s.korean : s.english)).join(" ");
  const ins = (d.blocks || []).filter((b) => b.type === "instruction");
  if (ins.length !== 1) { bad.push(`${f}: instruction 블록 ${ins.length}개`); continue; }
  if (ins[0].text !== want) {
    let i = 0;
    while (i < want.length && want[i] === ins[0].text[i]) i++;
    bad.push(`${f} (${ko ? "한국어" : "영어"}): ${i}번째 글자부터 다름 — 블록 …${ins[0].text.slice(Math.max(0, i - 15), i + 40)} / 문장 …${want.slice(Math.max(0, i - 15), i + 40)}`);
  }
}
console.log(`READING 단위 ${units} · 파일 ${units * 2} · 지문 블록이 문장 이음과 다른 파일 ${bad.length}${BREAK ? " (--break: 2 가 나와야 정상)" : ""}`);
if (process.argv.includes("--list") || BREAK) for (const b of bad) console.log(`  ${b}`);
process.exit(bad.length ? 1 : 0);
