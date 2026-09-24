#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 확인(다른 일꾼). 명령서 '워크플로우로 나눌 때':
 *   심각 · 높음은 그 줄을 판정하지 않은 다른 일꾼이 한 번 더 본다("정말 틀렸나 · 학습자에게 닿나") — 둘 다 틀림일 때만 표에.
 *   중간 · 낮음은 20% 를 뽑아 같은 방법으로. 확인에서 뒤집힌 수를 보고에.
 * 더해서(이 세션이 정함): 판단 필요 · 결정과 다름 · 화면에 안 닿음 은 모두, '맞음' 은 3%(최소 10)를 판정을 가린 채 다시 봄 — 일꾼이 놓친 비율을 어림.
 * 뽑기는 id 해시(씨앗 고정)라 다시 돌려도 같다.
 *
 *   node verify.cjs <조각> --pick         판정-<조각>.json 에서 확인 대상을 뽑아 판정-<조각>-확인.json 에 씀(이미 있으면 그대로)
 *   node verify.cjs <조각> <결과.json>    확인 결과를 검사해 쌓음 · 기록-<조각>-확인.md 에 한 줄
 *   node verify.cjs <조각> --status
 * 결과.json: { "결과": [ { "key": "F:C00012", "결론": "동의|뒤집음|고쳐 동의", "닿음": true, "심각도": "…", "고칠 글": "…", "까닭": "…" },
 *                        { "key": "OK:C00123", "결론": "맞음 동의|틀림 찾음", (틀림 찾음이면) "종류", "심각도", "확신", "까닭", "고칠 글", "새 음성 클립" } ] }
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const [chunk, arg, ...rest] = process.argv.slice(2);
if (!chunk || !arg) { console.error("쓰는 법: node verify.cjs <조각> --pick | <결과.json> | --status"); process.exit(2); }
const SRC = path.join(L.DIR, `판정-${chunk}.json`);
const OUT = path.join(L.DIR, `판정-${chunk}-확인.json`);
const LOG = path.join(L.DIR, `기록-${chunk}-확인.md`);
const ids = JSON.parse(fs.readFileSync(path.join(L.DIR, "읽을거리", chunk, "ids.json"), "utf8"));
const fileOfId = new Map();
for (const [f, list] of Object.entries(ids.batches || {})) for (const id of list) fileOfId.set(id, f);
const recs = new Map(L.readJsonl(path.join(L.DIR, "목록.jsonl")).map((r) => [r.id, r]));
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

function pick() {
  const src = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const T = [];
  const seenGroup = new Set();
  for (const e of src.줄) {
    if (e.판정 === "맞음") continue;
    const first = (e.묶음 || [e.id])[0];
    if (seenGroup.has(first)) continue;
    seenGroup.add(first);
    // ③ 채점 틀림은 심각도와 상관없이 전부(16:08 더함 — 일꾼마다 '맞는 답 0점' 을 중간 · 높음으로 달리 매겨, 기록.md 기준 풀이 5 로 높음에 맞추므로 둘 다 봐야 함)
    const heavy = e.판정 === "틀림" && (e.심각도 === "심각" || e.심각도 === "높음" || e.종류 === "③");
    const light = e.판정 === "틀림" && !heavy;
    const why = heavy ? (e.심각도 === "심각" || e.심각도 === "높음" ? "심각·높음 전부" : "③ 채점 전부") : light ? (L.hash01(first, "v") < 0.2 ? "중간·낮음 20% 표본" : null) : `${e.판정} 전부`;
    if (!why) continue;
    const r = recs.get(first);
    T.push({ key: `F:${first}`, 까닭: why, ids: e.묶음 || [e.id], 읽을거리: fileOfId.get(first), 칸: r.path, 파일: r.file, 전: r.before, 뒤: r.after, 주장: { 판정: e.판정, 종류: e.종류, 심각도: e.심각도, 확신: e.확신, 까닭: e.까닭, "고칠 글": e["고칠 글"], "고칠 곳": e["고칠 곳"], 추천안: e.추천안, 결정: e.결정 } });
  }
  src.문맥.forEach((f, i) => {
    const heavy = f.심각도 === "심각" || f.심각도 === "높음" || f.종류 === "③";
    if (heavy || L.hash01(`${chunk}:X${i}`, "v") < 0.2) T.push({ key: `X:${i}`, 까닭: heavy ? (f.종류 === "③" && !(f.심각도 === "심각" || f.심각도 === "높음") ? "③ 채점 전부" : "심각·높음 전부") : "중간·낮음 20% 표본", 주장: f });
  });
  for (const s of src.표본) {
    for (const f of s.틀림 || []) { const heavy = f.심각도 === "심각" || f.심각도 === "높음" || f.종류 === "③"; if (heavy || L.hash01(`${s.쪽}:${f.T}`, "v") < 0.2) T.push({ key: `S:${s.쪽}:${f.T}`, 까닭: heavy ? (f.종류 === "③" && !(f.심각도 === "심각" || f.심각도 === "높음") ? "③ 채점 전부" : "심각·높음 전부") : "중간·낮음 20% 표본", 표본파일: `읽을거리/표본-${chunk}/${s.쪽.split("/").pop()}.md`, 주장: f }); }
    for (const f of s["판단 필요"] || []) T.push({ key: `S:${s.쪽}:${f.T}`, 까닭: "판단 필요 전부", 표본파일: `읽을거리/표본-${chunk}/${s.쪽.split("/").pop()}.md`, 주장: { 판정: "판단 필요", ...f } });
  }
  const oks = src.줄.filter((e) => e.판정 === "맞음").map((e) => e.id).sort((a, b) => L.hash01(a, "ok") - L.hash01(b, "ok"));
  const nOk = Math.min(oks.length, Math.max(10, Math.ceil(oks.length * 0.03)));
  for (const id of oks.slice(0, nOk)) { const r = recs.get(id); T.push({ key: `OK:${id}`, 까닭: "맞음 3%(최소 10) — 판정을 가린 채", 읽을거리: fileOfId.get(id), 칸: r.path, 파일: r.file, 전: r.before, 뒤: r.after }); }
  return T;
}

let state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : null;
if (arg === "--pick") {
  if (!state) { state = { 조각: chunk, 뽑은때: stamp, 대상: pick(), 결과: [] }; fs.writeFileSync(OUT, JSON.stringify(state, null, 1)); }
  const byWhy = {};
  for (const t of state.대상) byWhy[t.까닭] = (byWhy[t.까닭] || 0) + 1;
  console.log(`확인 대상 ${state.대상.length}: ${Object.entries(byWhy).map(([k, v]) => `${k} ${v}`).join(" · ")}`);
  for (const t of state.대상) console.log(`${t.key} · ${t.까닭}${t.읽을거리 ? ` · 읽을거리/${chunk}/${t.읽을거리}` : t.표본파일 ? ` · ${t.표본파일}` : ""}`);
  process.exit(0);
}
if (!state) { console.error("먼저 --pick"); process.exit(2); }
const done = new Map(state.결과.map((r) => [r.key, r]));
if (arg === "--status") {
  const left = state.대상.filter((t) => !done.has(t.key));
  console.log(`확인 ${state.대상.length - left.length}/${state.대상.length}${left.length ? ` · 남음 ${left.map((t) => t.key).join(" ")}` : " ✔"}`);
  const c = {};
  for (const r of state.결과) c[r.결론] = (c[r.결론] || 0) + 1;
  console.log(Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · "));
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
  const isOk = r.key.startsWith("OK:");
  const allowed = isOk ? ["맞음 동의", "틀림 찾음"] : ["동의", "뒤집음", "고쳐 동의"];
  if (!allowed.includes(r.결론)) errs.push(`${w}: 결론 '${r.결론}' — ${allowed.join("|")}`);
  if (!r.까닭 || !String(r.까닭).trim()) errs.push(`${w}: 까닭 없음`);
  if (!isOk && typeof r.닿음 !== "boolean") errs.push(`${w}: 닿음 은 true/false`);
  if (r.결론 === "고쳐 동의" && !r.심각도 && !r["고칠 글"]) errs.push(`${w}: 고쳐 동의면 바꾼 심각도나 고칠 글`);
  if (r.결론 === "틀림 찾음") for (const k of ["종류", "심각도", "확신", "고칠 글"]) if (!r[k]) errs.push(`${w}: 틀림 찾음이면 '${k}'`);
  out.push({ ...r, 때: stamp });
}
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }
for (const r of out) done.set(r.key, r);
state.결과 = [...done.values()];
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const c = {};
for (const r of out) c[r.결론] = (c[r.결론] || 0) + 1;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 기록 — 조각 ${chunk} 확인\n\n배치마다 한 줄(verify.cjs 가 적음).\n\n`);
const line = `- ${stamp} · 확인 +${out.length} (${Object.entries(c).map(([k, v]) => `${k} ${v}`).join(" · ")}) · 누계 ${state.결과.length}/${state.대상.length}${batch.메모 ? ` · ${batch.메모}` : ""}\n`;
fs.appendFileSync(LOG, line);
console.log(line.trim());
