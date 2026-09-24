#!/usr/bin/env node
/**
 * 학습 내용 전수 읽기 — 확인(그 묶음을 판정하지 않은 다른 일꾼). 내용 재검토와 같은 규칙:
 *   심각 · 높음 · ③(채점)은 전부, 중간 · 낮음은 20%(해시로 고정), 판단 필요는 전부 → "F:<묶음>:<T>" · "D:<묶음>:<T>"
 *   더해서 묶음의 3%(최소 2)를 판정을 가린 채 통째로 다시 읽음 → "G:<묶음>" — 판정 일꾼이 놓친 비율을 잰다.
 *   node verify-full.cjs <조각> --pick | <결과.json> | --status
 * 결과.json: { "결과": [ { "key": "F:ld/d010:T05", "결론": "동의|고쳐 동의|뒤집음", "닿음": true, "심각도": "…", "고칠 글": "…", "까닭": "…" },
 *                        { "key": "G:ld/d010", "결론": "다시 읽음", "읽은 글": 23, "틀림": [ { "T", "종류", "심각도", "확신", "까닭", "지금", "고칠 글", "고칠 곳", "새 음성 클립" } ], "까닭": "…" } ] }
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const [chunk, arg, ...rest] = process.argv.slice(2);
if (!chunk || !arg) { console.error("쓰는 법: node verify-full.cjs <조각> --pick | <결과.json> | --status"); process.exit(2); }
const BASE = path.join(L.DIR, "전수");
const SRC = path.join(BASE, `판정-${chunk}.json`);
const OUT = path.join(BASE, `판정-${chunk}-확인.json`);
const LOG = path.join(BASE, `기록-${chunk}-확인.md`);
const ids = JSON.parse(fs.readFileSync(path.join(BASE, "읽을거리", chunk, "ids.json"), "utf8"));
const fileOf = new Map();
for (const [f, gs] of Object.entries(ids.batches)) for (const g of gs) fileOf.set(g, f);
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

function pick() {
  const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const T = [];
  for (const g of src.묶음) {
    for (const f of g.틀림) {
      const heavy = f.심각도 === "심각" || f.심각도 === "높음" || f.종류 === "③";
      if (heavy || L.hash01(`${g.묶음}:${f.T}`, "v") < 0.2) T.push({ key: `F:${g.묶음}:${f.T}`, 까닭: heavy ? "심각·높음·③ 전부" : "중간·낮음 20% 표본", 읽을거리: `전수/읽을거리/${chunk}/${fileOf.get(g.묶음)}`, 주장: f });
    }
    for (const f of g["판단 필요"]) T.push({ key: `D:${g.묶음}:${f.T}`, 까닭: "판단 필요 전부", 읽을거리: `전수/읽을거리/${chunk}/${fileOf.get(g.묶음)}`, 주장: f });
  }
  const groups = src.묶음.map((g) => g.묶음).sort((a, b) => L.hash01(a, "g") - L.hash01(b, "g"));
  const n = Math.min(groups.length, Math.max(2, Math.ceil(groups.length * 0.03)));
  for (const g of groups.slice(0, n)) T.push({ key: `G:${g}`, 까닭: "묶음 3%(최소 2) — 판정을 가린 채 통째로 다시 읽음", 읽을거리: `전수/읽을거리/${chunk}/${fileOf.get(g)}`, 읽을글: ids.groups[g] });
  return T;
}
let state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
if (arg === "--pick") {
  if (!state) { state = { 조각: chunk, 뽑은때: stamp, 대상: pick(), 결과: [] }; fs.writeFileSync(OUT, JSON.stringify(state, null, 1)); }
  const by = {};
  for (const t of state.대상) by[t.까닭] = (by[t.까닭] || 0) + 1;
  console.log(`확인 대상 ${state.대상.length}: ${Object.entries(by).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  for (const t of state.대상) console.log(`${t.key} · ${t.까닭} · ${t.읽을거리}`);
  process.exit(0);
}
if (!state) { console.error("먼저 --pick"); process.exit(2); }
const done = new Map(state.결과.map((r) => [r.key, r]));
if (arg === "--status") {
  const left = state.대상.filter((t) => !done.has(t.key));
  console.log(`확인 ${state.대상.length - left.length}/${state.대상.length}${left.length ? ` · 남음 ${left.map((t) => t.key).join(" ")}` : " ✔"}`);
  process.exit(left.length ? 1 : 0);
}
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const errs = [];
const targets = new Map(state.대상.map((t) => [t.key, t]));
const out = [];
for (const [i, r] of (batch.결과 || []).entries()) {
  const w = `결과[${i}] ${r.key}`;
  const t = targets.get(r.key);
  if (!t) { errs.push(`${w}: 확인 대상이 아님`); continue; }
  if (done.has(r.key) && !rest.includes("--replace")) errs.push(`${w}: 이미 적음`);
  if (!r.까닭 || !String(r.까닭).trim()) errs.push(`${w}: 까닭 없음`);
  if (r.key.startsWith("G:")) {
    if (r.결론 !== "다시 읽음") errs.push(`${w}: 결론은 '다시 읽음'`);
    if (r["읽은 글"] !== t.읽을글) errs.push(`${w}: 읽은 글 ${r["읽은 글"]} ≠ ${t.읽을글} — 전부 읽을 것`);
    if (!Array.isArray(r.틀림)) errs.push(`${w}: "틀림" 배열(없으면 [])`);
    for (const [j, f] of (r.틀림 || []).entries()) for (const k of ["T", "종류", "심각도", "확신", "까닭", "지금", "고칠 글"]) if (!f[k]) errs.push(`${w} 틀림[${j}]: '${k}' 없음`);
  } else {
    if (!["동의", "고쳐 동의", "뒤집음"].includes(r.결론)) errs.push(`${w}: 결론 '${r.결론}' — 동의|고쳐 동의|뒤집음`);
    if (typeof r.닿음 !== "boolean") errs.push(`${w}: 닿음 은 true/false`);
    if (r.결론 === "고쳐 동의" && !r.심각도 && !r["고칠 글"]) errs.push(`${w}: 고쳐 동의면 바꾼 심각도나 고칠 글`);
  }
  out.push({ ...r, 때: stamp });
}
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of out) done.set(r.key, r);
state.결과 = [...done.values()];
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const c = {};
for (const r of out) c[r.결론] = (c[r.결론] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 전수 기록 — 조각 ${chunk} 확인\n\n`);
const line = `- ${stamp} · 확인 +${out.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${state.결과.length}/${state.대상.length}${batch.메모 ? ` · ${batch.메모}` : ""}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
