#!/usr/bin/env node
/**
 * 학습 내용 전수 읽기 — 일꾼이 판정을 적는 유일한 길. 형식을 검사하고 전수/판정-<조각>.json 에 쌓고 전수/기록-<조각>.md 에 배치 한 줄.
 *
 *   node add-full.cjs <조각> <배치.json>     형식이 틀리면 아무것도 안 쓰고 exit 1
 *   node add-full.cjs <조각> --status         읽을거리 파일마다 적은 묶음 / 전체, 남은 묶음
 *
 * 배치.json (일꾼이 Write 로 내용-재검토/전수/work/<조각>-batch.json 에 씀):
 * { "파일": "03.md",
 *   "묶음": [ { "묶음": "ld/d010", "읽은 글": 23,                         // 읽은 글 = 그 묶음의 T 수(읽을거리 머리 '읽을 글 N') — 전부 읽어야 함
 *              "틀림": [ { "T": "T05", "종류": "①~⑦", "심각도": "심각|높음|중간|낮음", "확신": "높음|보통", "까닭": "…", "지금": "…",
 *                         "고칠 글": "…(그 칸에 들어갈 글 전체)", "고칠 곳": "파일 · 칸(JSON 경로나 '문항 #n 한국어' 처럼 찾을 수 있게)", "새 음성 클립": true|false } ],
 *              "판단 필요": [ { "T": "T07", "추천안": "…", "까닭": "…", "다른 길": "…" } ],
 *              "원본 그대로": [ { "T": "T09", "까닭": "…" } ] } ],   // 소유자 기준(2026-09-24): 되살린 원본의 그 시대 사실 — 틀림 아님, 따로 셈

 *   "메모": "…" }
 * 틀림이 없는 묶음도 "틀림": [] 로 적는다(읽었다는 기록). 한 묶음은 한 번만(다시 적으려면 --replace).
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const [chunk, arg, ...rest] = process.argv.slice(2);
if (!chunk || !arg) { console.error("쓰는 법: node add-full.cjs <조각> <배치.json> | --status"); process.exit(2); }
const REPLACE = rest.includes("--replace");
const BASE = path.join(L.DIR, "전수");
const idsFile = path.join(BASE, "읽을거리", chunk, "ids.json");
if (!fs.existsSync(idsFile)) { console.error(`조각 이름이 틀림: ${chunk} (전수/읽을거리/${chunk}/ids.json 없음)`); process.exit(2); }
const ids = JSON.parse(fs.readFileSync(idsFile, "utf8"));
const OUT = path.join(BASE, `판정-${chunk}.json`);
const LOG = path.join(BASE, `기록-${chunk}.md`);
const state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { 조각: chunk, 묶음: [] };
const done = new Map(state.묶음.map((g) => [g.묶음, g]));

function status() {
  const lines = [];
  let dg = 0, dt = 0, tg = 0, tt = 0;
  for (const [file, groups] of Object.entries(ids.batches)) {
    const left = groups.filter((g) => !done.has(g));
    lines.push(`${file}: ${groups.length - left.length}/${groups.length}${left.length ? ` · 남음 ${left.join(" ")}` : " ✔"}`);
    for (const g of groups) { tg++; tt += ids.groups[g]; if (done.has(g)) { dg++; dt += ids.groups[g]; } }
  }
  const wrong = state.묶음.reduce((s, g) => s + (g.틀림 || []).length, 0);
  lines.push(`묶음 ${dg}/${tg} · 읽은 글 ${dt}/${tt} · 틀림 ${wrong} · 판단 필요 ${state.묶음.reduce((s, g) => s + (g["판단 필요"] || []).length, 0)}`);
  return { text: lines.join("\n"), dg, tg, dt, tt };
}
if (arg === "--status") { const s = status(); console.log(s.text); process.exit(s.dg === s.tg ? 0 : 1); }

const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const errs = [];
const KINDS = ["①", "②", "③", "④", "⑤", "⑥", "⑦"], SEV = ["심각", "높음", "중간", "낮음"], CONF = ["높음", "보통"];
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const seen = new Set();
const add = [];
for (const [i, g] of (batch.묶음 || []).entries()) {
  const w = `묶음[${i}] ${g.묶음}`;
  if (!(g.묶음 in ids.groups)) { errs.push(`${w}: 이 조각의 묶음이 아님`); continue; }
  if (seen.has(g.묶음)) errs.push(`${w}: 이 배치에 두 번`);
  seen.add(g.묶음);
  if (done.has(g.묶음) && !REPLACE) errs.push(`${w}: 이미 적음 — 바꾸려면 --replace`);
  const n = ids.groups[g.묶음];
  if (g["읽은 글"] !== n) errs.push(`${w}: 읽은 글 ${g["읽은 글"]} ≠ 그 묶음의 읽을 글 ${n} — 전부 읽고 적을 것`);
  if (!Array.isArray(g.틀림)) errs.push(`${w}: "틀림" 배열이 없음(없으면 [])`);
  const okT = (t) => { const m = /^T(\d{2,3})$/.exec(String(t)); return m && +m[1] >= 1 && +m[1] <= n; };
  for (const [j, f] of (g.틀림 || []).entries()) {
    const ww = `${w} 틀림[${j}]`;
    if (!okT(f.T)) errs.push(`${ww}: T '${f.T}' 가 T01~T${String(n).padStart(2, "0")} 밖`);
    if (!KINDS.includes(f.종류)) errs.push(`${ww}: 종류 '${f.종류}'`);
    if (!SEV.includes(f.심각도)) errs.push(`${ww}: 심각도 '${f.심각도}'`);
    if (!CONF.includes(f.확신)) errs.push(`${ww}: 확신 '${f.확신}'`);
    for (const k of ["까닭", "지금", "고칠 글", "고칠 곳"]) if (!f[k] || !String(f[k]).trim()) errs.push(`${ww}: '${k}' 없음`);
    if (typeof f["새 음성 클립"] !== "boolean") errs.push(`${ww}: '새 음성 클립' 은 true/false`);
  }
  for (const [j, f] of (g["판단 필요"] || []).entries()) {
    const ww = `${w} 판단 필요[${j}]`;
    if (!okT(f.T)) errs.push(`${ww}: T '${f.T}'`);
    for (const k of ["추천안", "까닭"]) if (!f[k] || !String(f[k]).trim()) errs.push(`${ww}: '${k}' 없음`);
  }
  // 원본 그대로(소유자 기준 2026-09-24): 되살린 원본의 그 시대 사실 — 고치지 않고 따로 셈
  for (const [j, f] of (g["원본 그대로"] || []).entries()) {
    const ww = `${w} 원본 그대로[${j}]`;
    if (!okT(f.T)) errs.push(`${ww}: T '${f.T}'`);
    if (!f.까닭 || !String(f.까닭).trim()) errs.push(`${ww}: '까닭' 없음`);
  }
  add.push({ 묶음: g.묶음, "읽은 글": g["읽은 글"], 틀림: g.틀림 || [], "판단 필요": g["판단 필요"] || [], "원본 그대로": g["원본 그대로"] || [], 배치: stamp });
}
if (!add.length && !errs.length) errs.push("묶음이 하나도 없음");
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const g of add) done.set(g.묶음, g);
state.묶음 = [...done.values()];
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const st = status();
const line = `- ${stamp} · ${batch.파일 || "?"} · 묶음 +${add.length} · 글 +${add.reduce((s, g) => s + g["읽은 글"], 0)} · 틀림 +${add.reduce((s, g) => s + g.틀림.length, 0)} · 판단 필요 +${add.reduce((s, g) => s + g["판단 필요"].length, 0)} · 누계 묶음 ${st.dg}/${st.tg} · 글 ${st.dt}/${st.tt}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 전수 기록 — 조각 ${chunk}\n\n배치마다 한 줄(add-full.cjs 가 적음). 압축되면 이 파일과 \`node add-full.cjs ${chunk} --status\` 부터.\n\n`);
fs.appendFileSync(LOG, line);
console.log(line.trim());
console.log(st.text);
