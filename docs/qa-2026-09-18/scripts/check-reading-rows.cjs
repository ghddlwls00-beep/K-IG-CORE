#!/usr/bin/env node
/**
 * READING 문장 줄 모양 — 6-1219 전수(2026-09-23) 뒤로 0 이어야 하는 세 가지:
 *   ① 한 줄에 영어 문장 경계(. ? ! + 닫는 따옴표·괄호 뒤 빈칸 뒤 대문자 · 여는 따옴표)가 든 줄 — 인용 안의 경계와 약어(Mr. U.S. …)는 빼고,
 *      이유를 적어 둔 KEEP 줄도 뺌. 전수 전 34 → 0.
 *   ② 따옴표가 열린 채(또는 닫는 것만) 있는 줄 — 인용 한가운데서 줄이 끊긴 것(6-1131 · 6-1203 과 같은 종류). 전수 전 8 → 0.
 *   ③ 영어의 '--'(붙임표 둘, 타자기 꼴 대시) — 대시 전수(6-1057) 뒤에 남았던 2 → 0.
 * 앱은 줄 하나를 한 문장으로 다룬다(머리 'N개 핵심 문장' · 1:1 짝 · 문장 소리 · 발음 시험 S[0] · 빈칸 한 줄에 한 문항).
 *
 *   node check-reading-rows.cjs [--list] [--break] [--rev f35e8be]
 *   --break : KEEP 을 비우고 센다 — ① 이 7 이 나와야 정상(검사가 틀릴 수 있음을 보이는 시험).
 *   --rev   : 그 커밋의 강의 파일로 센다(6단계 전 판 f35e8be → 줄 1,449 · ① 35 · ② 14 · ③ 2, exit 1 — 줄 나눔 앞이라).
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/reading");
const BREAK = process.argv.includes("--break");
const ri = process.argv.indexOf("--rev");
const REV = ri >= 0 ? process.argv[ri + 1] : null;
const names = REV
  ? execSync(`git ls-tree --name-only ${REV} content/lessons/reading/`, { cwd: REPO, encoding: "utf8" }).split("\n").map((p) => path.basename(p)).filter(Boolean)
  : fs.readdirSync(dir);
const load = (f) => {
  const raw = REV ? execSync(`git show ${REV}:content/lessons/reading/${f}`, { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 }) : fs.readFileSync(path.join(dir, f), "utf8");
  return JSON.parse(raw.replace(/^﻿/, ""));
};
const LIST = process.argv.includes("--list") || BREAK;
// 둔 줄 — 한 덩어리로 두는 까닭(6단계-작업기록.md 배치 26 · 6-1219)
const KEEP = BREAK ? {} : {
  "reading-007-s003": "질문과 'My answer to that would be' 대답이 한 덩어리",
  "reading-007-s004": "같음(둘째 질문과 대답)",
  "reading-067-s002": "한 사람의 대화 한 차례('\"…,\" said the fox. \"…\"')",
  "reading-067-s003": "같음",
  "reading-067-s005": "같음",
  "reading-078-s004": "같음('\"Doctor!\" exclaimed the receptionist. \"That can't be!\"')",
  "reading-079-s005": "한 낱말 외침 'Remember!' 이 뒤 문장을 이끔",
};
const ABBR = /\b(Mr|Mrs|Ms|Dr|St|Jr|Sr|vs|etc|No|Prof|Gen|Lt|Col|Mt|a\.m|p\.m|e\.g|i\.e|U\.S|U\.K|D\.C)\.$/;
function boundaries(en) {
  const re = /([.?!])(["”’)]*)\s+(?=["“‘(]?[A-Z0-9])/g;
  let m, n = 0;
  while ((m = re.exec(en))) {
    const before = en.slice(0, m.index + 1);
    if (ABBR.test(before) || /\b[A-Z]\.$/.test(before)) continue;
    const head = en.slice(0, m.index + 1 + m[2].length);
    const open = (head.match(/“/g) || []).length - (head.match(/”/g) || []).length;
    if (open > 0 || (head.match(/"/g) || []).length % 2) continue;
    n++;
  }
  return n;
}
const unbalanced = (t) => (t.match(/“/g) || []).length !== (t.match(/”/g) || []).length || (t.match(/"/g) || []).length % 2 === 1;
let rows = 0;
const b = [], q = [], h = [];
for (const f of names.filter((x) => /^pr\d+\.json$/.test(x)).sort()) {
  const d = load(f);
  for (const s of d.readingSentences || []) {
    rows++;
    if (boundaries(s.english) && !KEEP[s.id]) b.push(`${s.id}: ${s.english.slice(0, 100)}`);
    if (unbalanced(s.english) || unbalanced(s.korean)) q.push(`${s.id}: ${s.english.slice(0, 100)}`);
    if (/--/.test(s.english)) h.push(`${s.id}: ${s.english.slice(0, 100)}`);
  }
}
console.log(`${REV ? `[${REV}] ` : ""}READING 줄 ${rows} · ① 문장 경계 든 줄 ${b.length} (둔 줄 ${Object.keys(KEEP).length} 뺌) · ② 따옴표 안 맞는 줄 ${q.length} · ③ '--' ${h.length}${BREAK ? " (--break: ① 이 7 이어야 정상)" : ""}`);
if (LIST) for (const [k, arr] of [["①", b], ["②", q], ["③", h]]) for (const x of arr) console.log(`  ${k} ${x}`);
process.exit(b.length || q.length || h.length ? 1 : 0);
