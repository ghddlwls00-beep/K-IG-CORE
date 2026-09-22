#!/usr/bin/env node
/**
 * GRAMMAR 문항의 글(text)과 대체 답안(alternatives)을 계획대로 바꾼다 — 지금 값이 계획의 from 과 똑같을 때만.
 * 문항 번호(n)와 순서는 건드리지 않는다: GRAMMAR 는 학습자 답을 문항 순번으로 저장한다(GrammarLearningView.tsx:206).
 *
 * 계획 파일(JSON 배열)의 한 줄:
 *   { item, file, n, text?: {from, to}, alternatives?: {from: [...], to: [...]}, right?: [...], wrong?: [...] }
 * 바꾼 뒤, 영어 문항이면 앱의 채점기(src/lib/grammarGrading.ts)로 확인한다:
 *   모범 답안 · 대체 답안 · right → 전부 exact,   wrong → 하나도 exact 아님.   하나라도 어긋나면 아무것도 쓰지 않는다.
 * 파일 형식(줄바꿈·들여쓰기·끝 개행)은 원문을 같은 방식으로 다시 써 바이트까지 같은지 먼저 확인한다.
 *
 *   node set-grammar-items.cjs <plan.json> [--apply]
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const grading = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));

const [planPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const APPLY = process.argv.includes("--apply");
const plan = JSON.parse(fs.readFileSync(path.resolve(planPath), "utf8"));
const clean = (s) => String(s || "").replace(/^\s*\d+[.)]\s*/, "").replace(/\s*\/\s*/g, " ").trim(); // GrammarLearningView cleanText
const serialize = (o, eol, trailing) => JSON.stringify(o, null, 2).replace(/\n/g, eol) + (trailing ? eol : "");

const files = new Map();
function open(rel) {
  if (files.has(rel)) return files.get(rel);
  const text = fs.readFileSync(path.join(REPO, rel), "utf8");
  const f = { text, eol: text.includes("\r\n") ? "\r\n" : "\n", trailing: /\r?\n$/.test(text), obj: JSON.parse(text) };
  if (serialize(f.obj, f.eol, f.trailing) !== f.text) throw new Error(`${rel}: 다시 쓰면 원문과 달라짐 — 형식 보존 불가`);
  files.set(rel, f);
  return f;
}
function itemOf(rel, n) {
  const hits = [];
  for (const b of open(rel).obj.blocks || []) if (b.type === "sentences") for (const it of b.items || []) if (String(it.n) === String(n)) hits.push(it);
  if (hits.length !== 1) throw new Error(`${rel} #${n}: 문항 ${hits.length}개 (1개여야 함)`);
  return hits[0];
}

const problems = [];
for (const p of plan) {
  const it = itemOf(p.file, p.n);
  if (p.text) {
    if (it.text !== p.text.from) throw new Error(`#${p.item} ${p.file} #${p.n}: 지금 글 ${JSON.stringify(it.text)} ≠ 계획 ${JSON.stringify(p.text.from)}`);
    it.text = p.text.to;
  }
  if (p.alternatives) {
    const now = it.alternatives || [];
    if (JSON.stringify(now) !== JSON.stringify(p.alternatives.from)) throw new Error(`#${p.item} ${p.file} #${p.n}: 지금 대체 답안 ${JSON.stringify(now)} ≠ 계획 ${JSON.stringify(p.alternatives.from)}`);
    if (p.alternatives.to.length) it.alternatives = p.alternatives.to;
    else delete it.alternatives;
  }
  const isEnglish = !/[가-힣]/.test(it.text);
  let log = `#${p.item} ${p.file} #${p.n}: ${JSON.stringify(it.text)}${it.alternatives ? ` · 대체 ${JSON.stringify(it.alternatives)}` : ""}`;
  if (isEnglish) {
    const refs = [clean(it.text), ...(it.alternatives || []).map(clean)];
    const must = [it.text, ...(it.alternatives || []), ...(p.right || [])];
    for (const a of must) {
      const g = grading.gradeAgainstReferences(a, refs);
      if (g !== "exact") problems.push(`#${p.item} ${JSON.stringify(a)} → ${g} (exact 여야 함)`);
    }
    const wrongGrades = (p.wrong || []).map((a) => [a, grading.gradeAgainstReferences(a, refs)]);
    for (const [a, g] of wrongGrades) if (g === "exact") problems.push(`#${p.item} 틀린 답 ${JSON.stringify(a)} → exact (아니어야 함)`);
    log += `\n     맞는 답 ${must.length}개 exact · 틀린 답 ${wrongGrades.map(([a, g]) => `${JSON.stringify(a)}=${g}`).join(", ") || "없음"}`;
  }
  console.log(log);
}
if (problems.length) { console.log(`\n채점 확인 실패 ${problems.length}건 — 아무것도 쓰지 않음\n - ${problems.join("\n - ")}`); process.exit(1); }
if (!APPLY) { console.log("\n(미리보기 — --apply 로 씀)"); process.exit(0); }
for (const [rel, f] of files) fs.writeFileSync(path.join(REPO, rel), serialize(f.obj, f.eol, f.trailing), "utf8");
console.log(`\n${files.size}개 파일에 씀 (형식 그대로)`);
