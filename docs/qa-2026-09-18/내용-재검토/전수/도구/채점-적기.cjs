#!/usr/bin/env node
/**
 * 결정 A(소유자 2026-09-24 "1,2,3 다 해") — 문법 '맞는 영작인데 0점 · 70점' 전부 재기: 일꾼이 적는 유일한 길.
 *   node 채점-적기.cjs <NN> --try <시험.json>          점수만 찍음(아무것도 안 씀). 시험.json = [ { "id": "grammar1/gh1-064#12", "시험": ["…", "…"] } ]
 *   node 채점-적기.cjs <NN> <결과.json> [--replace]     검사 뒤 채점/판정-<NN>.json 에 쌓고 채점/기록-<NN>.md 에 한 줄
 *   node 채점-적기.cjs <NN> --status                   그 읽을거리(NN.md)의 남은 문항 · exit 0 = 모두 적음
 * 결과.json = { "문항": [ { "id": "…",
 *                "시험": ["흔한 맞는 영작", …(2개 이상)],
 *                "막힘": [ { "답": "시험 중 0점 · 70점인 맞는 영작", "까닭": "…", "확신": "높음|보통" } ],
 *                "안 적음": [ { "답": "시험 중 0점 · 70점이지만 틀림이 아닌 것", "까닭": "뜻이 다름 · 강의가 가르치는 꼴을 피함 · 소유자 결정 N …" } ] } ],
 *              "메모": "…" }
 * 점수는 이 도구가 앱 채점 함수(src/lib/grammarGrading.ts gradeAgainstReferences — 앱과 같은 참조 · cleanText)로 다시 잰다 — 적은 점수를 믿지 않음.
 * 0점 · 70점인 시험은 '막힘' 이나 '안 적음' 중 한 곳에 꼭 넣어야 한다(조용히 빠뜨리지 못하게). 심각도는 점수로(기준 풀이 5): 0점 = 중간 · 70점 = 낮음.
 * 시작마다 도구 확인(같은 글 만점 · 다른 낱말 0점 · 기능어 하나 더 70점)이 틀리면 exit 3.
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const G = L.loadTsModule("src/lib/grammarGrading.ts");
const BASE = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/채점");
const NAME = { exact: "만점", partial: "70점", incorrect: "0점" };
const SEVOF = { partial: "낮음", incorrect: "중간" };
const grade = (a, refs) => G.gradeAgainstReferences(String(a), refs);
for (const [a, r, want] of [["It is a triangle.", ["It is a triangle."], "exact"], ["It is a banana.", ["It is a triangle."], "incorrect"], ["He finished the work.", ["He finished work."], "partial"]]) {
  if (grade(a, r) !== want) { console.error(`도구 확인 실패: ${a} → ${grade(a, r)} (기대 ${want})`); process.exit(3); }
}
const M = JSON.parse(fs.readFileSync(path.join(BASE, "문항.json"), "utf8"));
const byId = new Map(M.문항.map((x) => [x.id, x]));
const [nnArg, arg, ...rest] = process.argv.slice(2);
if (!nnArg || !arg) { console.error("쓰는 법: node 채점-적기.cjs <NN> --try <시험.json> | <결과.json> [--replace] | --status"); process.exit(2); }
const NN = String(nnArg).replace(/\.md$/, "").padStart(2, "0");
const ids = M.읽을거리[`${NN}.md`];
if (!ids) { console.error(`읽을거리 ${NN}.md 없음`); process.exit(2); }
const OUT = path.join(BASE, `판정-${NN}.json`), LOG = path.join(BASE, `기록-${NN}.md`);
const state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { 파일: `${NN}.md`, 문항: {} };
const readJson = (f) => JSON.parse(fs.readFileSync(path.resolve(f), "utf8").replace(/^﻿/, ""));
const norm = (s) => String(s == null ? "" : s).trim();

if (arg === "--status") {
  const left = ids.filter((id) => !state.문항[id]);
  const blocked = Object.values(state.문항).reduce((s, x) => s + x.막힘.length, 0);
  console.log(`${NN}.md 문항 ${ids.length - left.length}/${ids.length} · 막힘 ${blocked}${left.length ? ` · 남음 ${left.join(" ")}` : " ✔"}`);
  process.exit(left.length ? 1 : 0);
}
if (arg === "--try") {
  const t = readJson(rest[0]);
  for (const e of t) {
    const x = byId.get(e.id);
    if (!x) { console.log(`${e.id}: 문항 없음`); continue; }
    console.log(`${e.id} · 정답 ${JSON.stringify(x.refs[0])}${x.refs.length > 1 ? ` · 다른 정답 ${x.refs.length - 1}` : ""}`);
    for (const c of e.시험 || []) console.log(`   ${JSON.stringify(c)} → ${NAME[grade(c, x.refs)]}`);
  }
  process.exit(0);
}
const batch = readJson(arg);
const REPLACE = rest.includes("--replace");
const errs = [], add = [];
const seen = new Set();
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
for (const [i, e] of (batch.문항 || []).entries()) {
  const w = `문항[${i}] ${e.id}`;
  const x = byId.get(e.id);
  if (!x || !ids.includes(e.id)) { errs.push(`${w}: 이 읽을거리(${NN}.md)의 문항이 아님`); continue; }
  if (seen.has(e.id)) errs.push(`${w}: 이 배치에 두 번`);
  seen.add(e.id);
  if (state.문항[e.id] && !REPLACE) errs.push(`${w}: 이미 적음 — 바꾸려면 --replace`);
  const tests = (e.시험 || []).map(norm).filter(Boolean);
  if (tests.length < 2) errs.push(`${w}: 시험이 2개 미만 — 흔한 맞는 영작을 2개 이상 재어 볼 것`);
  if (new Set(tests).size !== tests.length) errs.push(`${w}: 시험에 같은 글이 두 번`);
  const scored = tests.map((a) => ({ 답: a, 점수: grade(a, x.refs) }));
  const sc = new Map(scored.map((s) => [s.답, s.점수]));
  const put = new Map();
  const blocked = [], skipped = [];
  for (const [j, b] of (e.막힘 || []).entries()) {
    const a = norm(b.답);
    if (!sc.has(a)) { errs.push(`${w} 막힘[${j}]: '${a}' 가 시험에 없음`); continue; }
    if (sc.get(a) === "exact") errs.push(`${w} 막힘[${j}]: '${a}' 는 지금도 만점 — 막힘이 아님`);
    if (!norm(b.까닭)) errs.push(`${w} 막힘[${j}]: 까닭 없음`);
    if (!["높음", "보통"].includes(b.확신)) errs.push(`${w} 막힘[${j}]: 확신은 높음|보통`);
    if (put.has(a)) errs.push(`${w}: '${a}' 가 막힘 · 안 적음에 두 번`);
    put.set(a, "막힘");
    blocked.push({ 답: a, 점수: NAME[sc.get(a)], 심각도: SEVOF[sc.get(a)] || "?", 까닭: norm(b.까닭), 확신: b.확신 });
  }
  for (const [j, b] of (e["안 적음"] || []).entries()) {
    const a = norm(b.답);
    if (!sc.has(a)) { errs.push(`${w} 안 적음[${j}]: '${a}' 가 시험에 없음`); continue; }
    if (sc.get(a) === "exact") errs.push(`${w} 안 적음[${j}]: '${a}' 는 만점 — 적을 것 없음`);
    if (!norm(b.까닭)) errs.push(`${w} 안 적음[${j}]: 까닭 없음`);
    if (put.has(a)) errs.push(`${w}: '${a}' 가 막힘 · 안 적음에 두 번`);
    put.set(a, "안 적음");
    skipped.push({ 답: a, 점수: NAME[sc.get(a)], 까닭: norm(b.까닭) });
  }
  for (const s of scored) if (s.점수 !== "exact" && !put.has(s.답)) errs.push(`${w}: '${s.답}' 는 ${NAME[s.점수]} — 막힘이나 안 적음에 넣을 것(조용히 빠뜨리지 않게)`);
  add.push({ id: e.id, 시험: scored.map((s) => ({ 답: s.답, 점수: NAME[s.점수] })), 막힘: blocked, 안적음: skipped, 때: stamp });
}
if (!add.length && !errs.length) errs.push("문항이 하나도 없음");
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const a of add) state.문항[a.id] = a;
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const left = ids.filter((id) => !state.문항[id]);
const line = `- ${stamp} · 문항 +${add.length} · 시험 +${add.reduce((s, a) => s + a.시험.length, 0)} · 막힘 +${add.reduce((s, a) => s + a.막힘.length, 0)}(0점 ${add.reduce((s, a) => s + a.막힘.filter((b) => b.점수 === "0점").length, 0)}) · 안 적음 +${add.reduce((s, a) => s + a.안적음.length, 0)} · 누계 ${ids.length - left.length}/${ids.length}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 채점 전수 기록 — 읽을거리 ${NN}.md\n\n배치마다 한 줄(채점-적기.cjs 가 적음). 압축되면 이 파일과 \`node 채점-적기.cjs ${NN} --status\` 부터.\n\n`);
fs.appendFileSync(LOG, line);
console.log(line.trim());
for (const a of add) for (const b of a.막힘) console.log(`   막힘 ${a.id} · ${JSON.stringify(b.답)} → ${b.점수}(${b.심각도})`);
console.log(`${NN}.md 문항 ${ids.length - left.length}/${ids.length}${left.length ? ` · 남음 ${left.length}` : " ✔"}`);
