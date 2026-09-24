#!/usr/bin/env node
/**
 * 결정 B(소유자 2026-09-24 "1,2,3 다 해") — 듣기 · 초등 두 번째 읽기(첫 판정을 보지 않은 다른 일꾼)를 첫 읽기와 견주고, 새로 나온 것만 다른 일꾼이 확인.
 *   node 두번째-견주기.cjs <조각> --pick | <결과.json> [--replace] | --status        (조각 = ld-a | ld-b | student — 두 번째 판정은 판정-<조각>2.json)
 * 첫 읽기 = 판정-<조각>.json 의 틀림 · 판단 필요 · 원본 그대로 + 첫 확인 일꾼의 G:(판정을 가린 다시 읽기) 틀림(→ 결과-머리 '더한 틀림').
 * 같은 것: 같은 묶음 · 같은 T. 힌트 칩(⑥)은 강의마다 힌트 줄 한 칸이라 같은 묶음에 첫 읽기 ⑥ 이 있으면 같음(풀이 8 ㉢).
 * 대상(새것 전부): N:<묶음>:<T> 틀림 → 동의 | 고쳐 동의(심각도 · 고칠 글) | 뒤집음 · ND: 판단 필요 → 동의(정말 골라야 함) | 뒤집음 · NK: 원본 그대로 → 동의 | 틀림으로
 * 견준 수는 두번째/견줌-<조각>.json (같음 · 새것 · 첫 읽기에만 — 한 사람이 찾는 비율을 두 쪽에서 잼).
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const D2 = path.join(B, "두번째");
const [chunk, arg, ...rest] = process.argv.slice(2);
if (!["ld-a", "ld-b", "student"].includes(chunk) || !arg) { console.error("쓰는 법: node 두번째-견주기.cjs <ld-a|ld-b|student> --pick | <결과.json> | --status"); process.exit(2); }
const pick1 = (...fs_) => fs_.find((f) => fs.existsSync(f));
const f1 = path.join(B, `판정-${chunk}.json`);
const f2 = pick1(path.join(B, `판정-${chunk}2.json`), path.join(D2, `판정-${chunk}2.json`));
const fv = path.join(B, `판정-${chunk}-확인.json`);
const OUT = path.join(D2, `확인-${chunk}.json`), LOG = path.join(D2, `기록-${chunk}-확인.md`), CMP = path.join(D2, `견줌-${chunk}.json`);
fs.mkdirSync(D2, { recursive: true });
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
let state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;

function compare() {
  const one = JSON.parse(fs.readFileSync(f1, "utf8"));
  const two = JSON.parse(fs.readFileSync(f2, "utf8"));
  const ids = JSON.parse(fs.readFileSync(path.join(B, "읽을거리", chunk, "ids.json"), "utf8"));
  if (two.묶음.length !== Object.keys(ids.groups).length) throw new Error(`두 번째 읽기가 끝나지 않음: 묶음 ${two.묶음.length}/${Object.keys(ids.groups).length}`);
  const known = new Map(); // "g|T" → 어디서
  const chipG = new Set();
  for (const g of one.묶음) {
    for (const x of g.틀림) { known.set(`${g.묶음}|${x.T}`, `첫 틀림 ${x.종류} ${x.심각도}`); if (x.종류 === "⑥") chipG.add(g.묶음); }
    for (const x of g["판단 필요"] || []) known.set(`${g.묶음}|${x.T}`, "첫 판단 필요");
    for (const x of g["원본 그대로"] || []) known.set(`${g.묶음}|${x.T}`, "첫 원본 그대로");
  }
  if (fs.existsSync(fv)) for (const r of JSON.parse(fs.readFileSync(fv, "utf8")).결과.filter((r) => r.key.startsWith("G:"))) {
    const g = r.key.slice(2);
    for (const x of r.틀림 || []) { if (!known.has(`${g}|${x.T}`)) known.set(`${g}|${x.T}`, `첫 확인 G: 다시 읽기 ${x.종류} ${x.심각도}`); if (x.종류 === "⑥") chipG.add(g); }
  }
  const T = [], same = [], seenTwo = new Set();
  for (const g of two.묶음) {
    for (const x of g.틀림) {
      const k = `${g.묶음}|${x.T}`; seenTwo.add(k);
      if (known.has(k)) same.push({ g: g.묶음, T: x.T, 두번째: `${x.종류} ${x.심각도}`, 첫: known.get(k) });
      else if (x.종류 === "⑥" && chipG.has(g.묶음)) { same.push({ g: g.묶음, T: x.T, 두번째: `⑥ ${x.심각도}`, 첫: "같은 강의 힌트 줄 ⑥" }); }
      else T.push({ key: `N:${g.묶음}:${x.T}`, 까닭: "두 번째 읽기에만 — 틀림", 주장: x });
    }
    for (const x of g["판단 필요"] || []) { const k = `${g.묶음}|${x.T}`; seenTwo.add(k); if (known.has(k)) same.push({ g: g.묶음, T: x.T, 두번째: "판단 필요", 첫: known.get(k) }); else T.push({ key: `ND:${g.묶음}:${x.T}`, 까닭: "두 번째 읽기에만 — 판단 필요", 주장: x }); }
    for (const x of g["원본 그대로"] || []) { const k = `${g.묶음}|${x.T}`; seenTwo.add(k); if (known.has(k)) same.push({ g: g.묶음, T: x.T, 두번째: "원본 그대로", 첫: known.get(k) }); else T.push({ key: `NK:${g.묶음}:${x.T}`, 까닭: "두 번째 읽기에만 — 원본 그대로", 주장: x }); }
  }
  const chipTwo = new Set(two.묶음.filter((g) => g.틀림.some((x) => x.종류 === "⑥")).map((g) => g.묶음));
  const firstOnly = [];
  for (const [k, where] of known) { if (seenTwo.has(k)) continue; const [g] = k.split("|"); if (/⑥/.test(where) && chipTwo.has(g)) continue; firstOnly.push({ k, where }); }
  const cmp = { 조각: chunk, 때: stamp, 같음: same.length, 새것: T.length, 첫에만: firstOnly.length, 새것종류: T.reduce((a, t) => (a[t.key.split(":")[0]] = (a[t.key.split(":")[0]] || 0) + 1, a), {}), 같음목록: same, 첫에만목록: firstOnly };
  fs.writeFileSync(CMP, JSON.stringify(cmp, null, 1));
  return T;
}
if (arg === "--pick") {
  if (!state) { const T = compare(); state = { 조각: chunk, 뽑은때: stamp, 대상: T, 결과: [] }; fs.writeFileSync(OUT, JSON.stringify(state, null, 1)); }
  const c = JSON.parse(fs.readFileSync(CMP, "utf8"));
  console.log(`견줌 ${chunk}: 같음 ${c.같음} · 두 번째에만(확인 대상) ${c.새것} ${JSON.stringify(c.새것종류)} · 첫 읽기에만 ${c.첫에만}`);
  for (const t of state.대상) console.log(t.key);
  process.exit(0);
}
if (!state) { console.error("먼저 --pick"); process.exit(2); }
const done = new Map(state.결과.map((r) => [r.key, r]));
if (arg === "--status") {
  const left = state.대상.filter((t) => !done.has(t.key));
  console.log(`${chunk} 새것 확인 ${state.대상.length - left.length}/${state.대상.length}${left.length ? ` · 남음 ${left.map((t) => t.key).join(" ")}` : " ✔"}`);
  process.exit(left.length ? 1 : 0);
}
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const targets = new Map(state.대상.map((t) => [t.key, t]));
const errs = [], out = [];
for (const [i, r] of (batch.결과 || []).entries()) {
  const w = `결과[${i}] ${r.key}`;
  if (!targets.has(r.key)) { errs.push(`${w}: 확인 대상이 아님`); continue; }
  if (done.has(r.key) && !rest.includes("--replace")) errs.push(`${w}: 이미 적음`);
  if (!r.까닭 || !String(r.까닭).trim()) errs.push(`${w}: 까닭 없음`);
  const kind = r.key.split(":")[0];
  const ok = kind === "N" ? ["동의", "고쳐 동의", "뒤집음"] : kind === "ND" ? ["동의", "뒤집음"] : ["동의", "틀림으로"];
  if (!ok.includes(r.결론)) errs.push(`${w}: 결론은 ${ok.join("|")}`);
  if (kind === "N" && r.결론 === "고쳐 동의" && !r.심각도 && !r["고칠 글"]) errs.push(`${w}: 고쳐 동의면 바꾼 심각도나 고칠 글`);
  if (typeof r.닿음 !== "boolean") errs.push(`${w}: 닿음 은 true/false`);
  out.push({ ...r, 때: stamp });
}
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of out) done.set(r.key, r);
state.결과 = [...done.values()];
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const c = {};
for (const r of out) c[r.결론] = (c[r.결론] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 두 번째 읽기 — ${chunk} 새것 확인\n\n`);
const line = `- ${stamp} · 확인 +${out.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${state.결과.length}/${state.대상.length}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
