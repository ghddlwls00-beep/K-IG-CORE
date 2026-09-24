#!/usr/bin/env node
/**
 * 결정 A — 채점 전수 확인(그 읽을거리를 잰 일꾼과 다른 일꾼). 대상:
 *   B:<id>:<k>  막힘 전부(③ 은 두 일꾼이 틀림일 때만 표에 — 내용 재검토와 같은 규칙) → "동의" | "뒤집음"
 *   S:<id>:<k>  안 적음 20%(해시로 고정) → "동의"(안 적는 게 맞음) | "틀림으로"(막힘이어야 함 — 확신 · 까닭)
 *   R:<id>      문항 5%(최소 3) — 잰 일꾼의 시험을 보지 않고 스스로 재기: {"시험": [...], "막힘": [...], "안 적음": [...]}(적기 도구와 같은 규칙) → 놓친 비율
 *   node 채점-확인.cjs <NN> --pick | <결과.json> [--replace] | --status
 * 결과.json = { "결과": [ { "key": "B:…", "결론": "동의|뒤집음", "까닭": "…" }, { "key": "S:…", "결론": "동의|틀림으로", "까닭": "…", "확신": "높음|보통" },
 *                        { "key": "R:…", "시험": [...], "막힘": [{ "답", "까닭", "확신" }], "안 적음": [{ "답", "까닭" }], "까닭": "…" } ], "메모": "…" }
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const G = L.loadTsModule("src/lib/grammarGrading.ts");
const BASE = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/채점");
const NAME = { exact: "만점", partial: "70점", incorrect: "0점" };
const grade = (a, refs) => G.gradeAgainstReferences(String(a), refs);
if (grade("It is a banana.", ["It is a triangle."]) !== "incorrect" || grade("It is a triangle.", ["It is a triangle."]) !== "exact") { console.error("도구 확인 실패"); process.exit(3); }
const M = JSON.parse(fs.readFileSync(path.join(BASE, "문항.json"), "utf8"));
const byId = new Map(M.문항.map((x) => [x.id, x]));
const [nnArg, arg, ...rest] = process.argv.slice(2);
if (!nnArg || !arg) { console.error("쓰는 법: node 채점-확인.cjs <NN> --pick | <결과.json> | --status"); process.exit(2); }
const NN = String(nnArg).replace(/\.md$/, "").padStart(2, "0");
const ids = M.읽을거리[`${NN}.md`];
const SRC = path.join(BASE, `판정-${NN}.json`), OUT = path.join(BASE, `확인-${NN}.json`), LOG = path.join(BASE, `기록-${NN}-확인.md`);
const norm = (s) => String(s == null ? "" : s).trim();
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
let state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
if (arg === "--pick") {
  if (!state) {
    const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
    const T = [];
    const R = ids.slice().sort((a, b) => L.hash01(a, "r") - L.hash01(b, "r")).slice(0, Math.max(3, Math.ceil(ids.length * 0.05)));
    for (const id of R) T.push({ key: `R:${id}`, 까닭: "문항 5%(최소 3) — 잰 일꾼의 시험을 보지 않고 스스로 재기" });
    for (const id of ids) {
      const x = src.문항[id];
      if (!x) continue;
      x.막힘.forEach((b, k) => T.push({ key: `B:${id}:${k}`, 까닭: "막힘 전부", 주장: b }));
      x.안적음.forEach((b, k) => { if (L.hash01(`${id}:${k}`, "s") < 0.2) T.push({ key: `S:${id}:${k}`, 까닭: "안 적음 20%", 주장: b }); });
    }
    state = { 파일: `${NN}.md`, 뽑은때: stamp, 대상: T, 결과: [] };
    fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
  }
  const by = {};
  for (const t of state.대상) by[t.까닭] = (by[t.까닭] || 0) + 1;
  console.log(`확인 대상 ${state.대상.length}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  for (const t of state.대상) console.log(t.key);
  process.exit(0);
}
if (!state) { console.error("먼저 --pick"); process.exit(2); }
const done = new Map(state.결과.map((r) => [r.key, r]));
if (arg === "--status") {
  const left = state.대상.filter((t) => !done.has(t.key));
  console.log(`${NN}.md 확인 ${state.대상.length - left.length}/${state.대상.length}${left.length ? ` · 남음 ${left.map((t) => t.key).join(" ")}` : " ✔"}`);
  process.exit(left.length ? 1 : 0);
}
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const targets = new Map(state.대상.map((t) => [t.key, t]));
const errs = [], out = [];
for (const [i, r] of (batch.결과 || []).entries()) {
  const w = `결과[${i}] ${r.key}`;
  if (!targets.has(r.key)) { errs.push(`${w}: 확인 대상이 아님`); continue; }
  if (done.has(r.key) && !rest.includes("--replace")) errs.push(`${w}: 이미 적음`);
  if (!norm(r.까닭)) errs.push(`${w}: 까닭 없음`);
  if (r.key.startsWith("B:")) { if (!["동의", "뒤집음"].includes(r.결론)) errs.push(`${w}: 결론은 동의|뒤집음`); out.push({ ...r, 때: stamp }); continue; }
  if (r.key.startsWith("S:")) { if (!["동의", "틀림으로"].includes(r.결론)) errs.push(`${w}: 결론은 동의|틀림으로`); if (r.결론 === "틀림으로" && !["높음", "보통"].includes(r.확신)) errs.push(`${w}: 틀림으로면 확신 높음|보통`); out.push({ ...r, 때: stamp }); continue; }
  // R: 스스로 재기 — 적기 도구와 같은 규칙
  const x = byId.get(r.key.slice(2));
  const tests = (r.시험 || []).map(norm).filter(Boolean);
  if (tests.length < 2) errs.push(`${w}: 시험 2개 이상`);
  const sc = new Map(tests.map((a) => [a, grade(a, x.refs)]));
  const put = new Set();
  const blocked = [], skipped = [];
  for (const [j, b] of (r.막힘 || []).entries()) {
    const a = norm(b.답);
    if (!sc.has(a)) { errs.push(`${w} 막힘[${j}]: 시험에 없음`); continue; }
    if (sc.get(a) === "exact") errs.push(`${w} 막힘[${j}]: '${a}' 는 만점`);
    if (!norm(b.까닭) || !["높음", "보통"].includes(b.확신)) errs.push(`${w} 막힘[${j}]: 까닭 · 확신(높음|보통)`);
    put.add(a); blocked.push({ 답: a, 점수: NAME[sc.get(a)], 까닭: norm(b.까닭), 확신: b.확신 });
  }
  for (const [j, b] of (r["안 적음"] || []).entries()) {
    const a = norm(b.답);
    if (!sc.has(a)) { errs.push(`${w} 안 적음[${j}]: 시험에 없음`); continue; }
    if (!norm(b.까닭)) errs.push(`${w} 안 적음[${j}]: 까닭`);
    put.add(a); skipped.push({ 답: a, 점수: NAME[sc.get(a)], 까닭: norm(b.까닭) });
  }
  for (const [a, s] of sc) if (s !== "exact" && !put.has(a)) errs.push(`${w}: '${a}' 는 ${NAME[s]} — 막힘이나 안 적음에`);
  out.push({ key: r.key, 결론: "다시 잼", 시험: tests.map((a) => ({ 답: a, 점수: NAME[sc.get(a)] })), 막힘: blocked, 안적음: skipped, 까닭: norm(r.까닭), 때: stamp });
}
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of out) done.set(r.key, r);
state.결과 = [...done.values()];
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const c = {};
for (const r of out) c[r.결론] = (c[r.결론] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 채점 전수 기록 — 읽을거리 ${NN}.md 확인\n\n`);
const line = `- ${stamp} · 확인 +${out.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${state.결과.length}/${state.대상.length}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
