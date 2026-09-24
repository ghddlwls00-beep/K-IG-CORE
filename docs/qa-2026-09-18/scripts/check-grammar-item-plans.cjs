#!/usr/bin/env node
/**
 * GRAMMAR 문항 글 · 대체 답안 계획(set-grammar-items.cjs 로 적용한 꼴: { item, file, n, text?: {from, to}, alternatives?: {from, to} })을
 * **지금 파일**에 다시 대어 본다. 줄마다: text.to 가 있으면 그 파일 그 문항의 글이 to 와 똑같아야 하고, alternatives.to 가 있으면
 * 대체 답안이 to 를 모두 담아야 하며 alternatives.from 에만 있고 to 에 없는 것(뺀 답)은 없어야 한다. 하나라도 어긋나면 exit 1.
 *
 * 계획은 **이름이 아니라 꼴로** 고른다(7단계 7-1 h — 전에는 이름 무늬 stage6-grammar-items-*.json 만 봐서 grammar-owner-decisions-0923 ·
 * stage7-g9-that · stage7-g10-progressive · stage7-holds-e-grammar 162줄을 아무도 다시 세지 않았다). 센 계획이 0개면 exit 1.
 * 줄에 "supersededBy": "<계획 이름>[ 설명]" 이 있으면 그 계획에서 같은 파일 · 같은 번호 줄을 **사슬 끝까지** 따라가 마지막 줄로 댄다
 * (7-1 d 와 같은 규칙 — 전에는 대지 않고 수만 셌다). 따라갈 수 없으면 어긋남.
 * 영어 문항은 지금 앱 채점기로 다시 채점한다(set-grammar-items.cjs 가 적용할 때 한 번만 보던 것 — 7-4 f ② 로 채점기가 바뀜):
 * 모범 답안 · 대체 답안 · 줄의 right → 전부 exact, 줄의 wrong → 하나도 exact 아님.
 *
 *   node check-grammar-item-plans.cjs
 *   node check-grammar-item-plans.cjs --rev f35e8be         # 일부러 깨기: 고치기 전 커밋의 파일에 대면 어긋나야 한다(exit 1 · '--rev HEAD' 는 고친 것이 커밋된 뒤 가짜, 7-1 n)
 *   node check-grammar-item-plans.cjs --plans-dir <폴더>  # 계획 폴더(기본: 이 도구 옆 plans/) — 0개 증명용
 */
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const argv = process.argv;
const opt = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const REV = opt("--rev");
const DIR = path.resolve(opt("--plans-dir") || path.join(__dirname, "plans"));
const cache = new Map();
const load = (rel) => {
  if (!cache.has(rel)) {
    let d = null;
    try {
      const raw = REV ? execFileSync("git", ["show", `${REV}:${rel}`], { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26, stdio: ["ignore", "pipe", "ignore"] }) : fs.readFileSync(path.join(REPO, rel), "utf8");
      d = JSON.parse(raw);
    } catch { d = null; }
    cache.set(rel, d);
  }
  return cache.get(rel);
};
const items = (d) => d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const clean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim(); // GrammarLearningView cleanText
const isItemPlan = (a) => Array.isArray(a) && a.length > 0 && a.every((l) => l && typeof l.file === "string" && l.n !== undefined && (l.text || l.alternatives));
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")); } catch { return null; } };
const plans = (fs.existsSync(DIR) ? fs.readdirSync(DIR) : []).filter((f) => f.endsWith(".json") && isItemPlan(readJson(path.join(DIR, f)))).sort();
const same = (a, b) => a.file === b.file && String(a.n) === String(b.n);
function chainEnd(x) {
  let cur = x;
  const via = [];
  for (let hop = 0; hop < 20 && cur.supersededBy; hop++) {
    const name = String(cur.supersededBy).trim().split(/\s/)[0].replace(/\.json$/, "");
    const lines = readJson(path.join(DIR, `${name}.json`));
    if (!isItemPlan(lines)) return { problem: `뒤 계획 '${name}' 이 문항 계획이 아니거나 없음` };
    const next = lines.filter((l) => same(l, cur));
    if (!next.length) return { problem: `뒤 계획 '${name}' 에 ${cur.file} #${cur.n} 줄이 없음(사슬 끊김)` };
    via.push(name);
    cur = next[next.length - 1];
  }
  return cur.supersededBy ? { problem: "사슬이 20 단계를 넘음" } : { line: cur, via };
}
let lines = 0, chained = 0, graded = 0, wrongs = 0;
const bad = [];
for (const f of plans) {
  for (const x0 of readJson(path.join(DIR, f))) {
    lines++;
    let x = x0, tag = "";
    if (x0.supersededBy) {
      chained++;
      const e = chainEnd(x0);
      if (e.problem) { bad.push(`${f}: ${x0.file} #${x0.n} ${e.problem}`); continue; }
      x = e.line; tag = ` (사슬 끝 ${e.via.join(" → ")})`;
    }
    const d = load(x.file);
    const it = d && items(d).find((i) => String(i.n) === String(x.n));
    if (!it) { bad.push(`${f}: ${x.file} #${x.n} 문항 없음${tag}`); continue; }
    if (x.text && it.text !== x.text.to) bad.push(`${f}: ${x.file} #${x.n} 글이 계획과 다름${tag} — 지금 ${JSON.stringify(it.text)}`);
    if (x.alternatives) {
      const now = it.alternatives || [];
      const missing = x.alternatives.to.filter((a) => !now.includes(a));
      const removed = (x.alternatives.from || []).filter((a) => !x.alternatives.to.includes(a) && now.includes(a));
      if (missing.length || removed.length) bad.push(`${f}: ${x.file} #${x.n} 대체 답안${tag} — 없음 ${JSON.stringify(missing)} · 남음 ${JSON.stringify(removed)}`);
    }
    if (!/[가-힣]/.test(it.text)) {
      graded++;
      const refs = [clean(it.text), ...(it.alternatives || []).map(clean)];
      for (const a of [it.text, ...(it.alternatives || []), ...(x.right || [])]) {
        const g = grading.gradeAgainstReferences(a, refs);
        if (g !== "exact") bad.push(`${f}: ${x.file} #${x.n} 맞는 답 ${JSON.stringify(a)} → ${g}(exact 여야 함)${tag}`);
      }
      for (const a of x.wrong || []) {
        wrongs++;
        if (grading.gradeAgainstReferences(a, refs) === "exact") bad.push(`${f}: ${x.file} #${x.n} 틀린 답 ${JSON.stringify(a)} → exact(아니어야 함)${tag}`);
      }
    }
  }
}
console.log(`${REV ? `[${REV} 에 댐] ` : ""}계획 ${plans.length}개 · 줄 ${lines} · 뒤에 다시 고친 줄 ${chained}(사슬 끝까지 셈) · 영어 문항 채점 ${graded}(틀린 답 ${wrongs}) · 어긋남 ${bad.length}`);
for (const b of bad.slice(0, 15)) console.log(`  ${b}`);
if (!plans.length) { console.log(`문항 계획이 0개(${DIR}) — 센 것 0 (7-1 h). exit 1`); process.exit(1); }
process.exit(bad.length ? 1 : 0);
