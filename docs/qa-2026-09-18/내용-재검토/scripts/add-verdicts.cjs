#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 일꾼이 판정을 적는 유일한 길. 형식을 검사하고 판정-<조각>.json 에 쌓고, 기록-<조각>.md 에 배치 한 줄을 더한다.
 *
 *   node add-verdicts.cjs <조각> <배치.json>          배치를 검사해 쌓음(형식이 틀리면 아무것도 안 쓰고 exit 1)
 *   node add-verdicts.cjs <조각> --status              읽을거리 파일마다 판정한 줄 / 전체, 남은 id
 *
 * 배치.json (일꾼이 Write 로 내용-재검토/work/<조각>-batch.json 에 씀):
 * {
 *   "파일": "03.md",                                   // 이 배치가 다룬 읽을거리 파일(기록용)
 *   "맞음": ["C00001", …],
 *   "틀림": [{ "ids": ["C…"], "종류": "①~⑦", "심각도": "심각|높음|중간|낮음", "확신": "높음|보통",
 *             "까닭": "…", "고칠 글": "…(그 칸에 들어갈 글 전체)", "고칠 곳": "(그 줄의 칸이 아니면) 파일 · 칸",
 *             "새 음성 클립": true|false }],
 *   "판단 필요": [{ "ids": [...], "추천안": "…", "까닭": "…", "다른 길": "…" }],
 *   "결정과 다름": [{ "ids": [...], "결정": "어느 결정(결정표 N번 …)", "까닭": "…" }],
 *   "화면에 안 닿음": [{ "ids": [...], "까닭": "…(코드 자리)" }],
 *   "문맥": [{ "파일": "…", "칸": "…", "지금": "…", "종류": "…", "심각도": "…", "확신": "…", "까닭": "…", "고칠 글": "…", "새 음성 클립": bool }],
 *   "표본": [{ "쪽": "/ld/d025", "읽은 글": 34, "틀림": [{ "T": "T05", "바뀐 글": false, "종류", "심각도", "확신", "까닭", "지금", "고칠 글", "고칠 곳", "새 음성 클립" }],
 *             "판단 필요": [{ "T": "T07", "추천안": "…", "까닭": "…" }] }],
 *   "메모": "…"
 * }
 * 한 id 는 한 번만 판정(다시 적으려면 --replace).
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const [chunk, arg, ...rest] = process.argv.slice(2);
if (!chunk || !arg) { console.error("쓰는 법: node add-verdicts.cjs <조각> <배치.json> | --status"); process.exit(2); }
const REPLACE = rest.includes("--replace");
const idsFile = path.join(L.DIR, "읽을거리", chunk, "ids.json");
if (!fs.existsSync(idsFile)) { console.error(`조각 이름이 틀림: ${chunk} (읽을거리/${chunk}/ids.json 없음)`); process.exit(2); }
const ids = JSON.parse(fs.readFileSync(idsFile, "utf8"));
const reached = new Set(ids.reached);
const OUT = path.join(L.DIR, `판정-${chunk}.json`);
const LOG = path.join(L.DIR, `기록-${chunk}.md`);
const recs = new Map(L.readJsonl(path.join(L.DIR, "목록.jsonl")).map((r) => [r.id, r]));
// 표본은 내용 재검토에만(고친 것 다시 읽기 폴더에는 없음)
const sample = fs.existsSync(path.join(L.DIR, "표본.json")) ? JSON.parse(fs.readFileSync(path.join(L.DIR, "표본.json"), "utf8")) : { 쪽: {} };
const mySample = Object.entries(sample.쪽).filter(([, v]) => v.조각 === chunk).map(([u, v]) => [u, v.글수]);
const state = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : { 조각: chunk, 줄: [], 문맥: [], 표본: [] };
const judged = new Map(state.줄.map((e) => [e.id, e]));

function status() {
  const lines = [];
  let done = 0;
  for (const [file, list] of Object.entries(ids.batches || {})) {
    const left = list.filter((id) => !judged.has(id));
    done += list.length - left.length;
    lines.push(`${file}: ${list.length - left.length}/${list.length}${left.length ? ` · 남음 ${left.slice(0, 40).join(" ")}${left.length > 40 ? ` …(+${left.length - 40})` : ""}` : " ✔"}`);
  }
  const sDone = new Set(state.표본.map((s) => s.쪽));
  lines.push(`표본 쪽: ${mySample.filter(([u]) => sDone.has(u)).length}/${mySample.length}${mySample.some(([u]) => !sDone.has(u)) ? ` · 남음 ${mySample.filter(([u]) => !sDone.has(u)).map(([u]) => u).join(" ")}` : " ✔"}`);
  lines.push(`판정 ${done}/${ids.reached.length} · 틀림 ${state.줄.filter((e) => e.판정 === "틀림").length} · 판단 필요 ${state.줄.filter((e) => e.판정 === "판단 필요").length} · 문맥 ${state.문맥.length} · 표본 틀림 ${state.표본.reduce((s, x) => s + (x.틀림 || []).length, 0)}`);
  return { text: lines.join("\n"), done, total: ids.reached.length, sampleDone: mySample.filter(([u]) => sDone.has(u)).length, sampleTotal: mySample.length };
}
if (arg === "--status") { const s = status(); console.log(s.text); process.exit(s.done === s.total && s.sampleDone === s.sampleTotal ? 0 : 1); }

// ── 배치 검사 ──
const batch = JSON.parse(fs.readFileSync(path.resolve(arg), "utf8").replace(/^﻿/, ""));
const errs = [];
const KINDS = ["①", "②", "③", "④", "⑤", "⑥", "⑦"];
const SEV = ["심각", "높음", "중간", "낮음"];
const CONF = ["높음", "보통"];
const seen = new Set();
const checkIds = (list, where) => {
  if (!Array.isArray(list) || !list.length) { errs.push(`${where}: ids 가 비었음`); return []; }
  for (const id of list) {
    if (!reached.has(id)) errs.push(`${where}: ${id} 는 이 조각의 판정할 줄이 아님`);
    if (seen.has(id)) errs.push(`${where}: ${id} 가 이 배치에 두 번`);
    if (judged.has(id) && !REPLACE) errs.push(`${where}: ${id} 는 이미 판정함(${judged.get(id).판정}) — 바꾸려면 --replace`);
    seen.add(id);
  }
  return list;
};
const need = (o, keys, where) => { for (const k of keys) if (o[k] == null || (typeof o[k] === "string" && !o[k].trim())) errs.push(`${where}: '${k}' 없음`); };
const checkErr = (f, where, needFix = true) => {
  if (!KINDS.includes(f.종류)) errs.push(`${where}: 종류 '${f.종류}' — ①~⑦`);
  if (!SEV.includes(f.심각도)) errs.push(`${where}: 심각도 '${f.심각도}' — ${SEV.join("|")}`);
  if (!CONF.includes(f.확신)) errs.push(`${where}: 확신 '${f.확신}' — 높음|보통`);
  need(f, needFix ? ["까닭", "고칠 글"] : ["까닭"], where);
  if (typeof f["새 음성 클립"] !== "boolean") errs.push(`${where}: '새 음성 클립' 은 true/false`);
};
const entries = [];
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const cur = (id) => { const r = recs.get(id); return r.after != null ? r.after : r.before; };
if ((batch.맞음 || []).length) for (const id of checkIds(batch.맞음, "맞음")) entries.push({ id, 판정: "맞음", 배치: stamp });
(batch.틀림 || []).forEach((f, i) => {
  const w = `틀림[${i}]`;
  const list = checkIds(f.ids, w);
  checkErr(f, w);
  for (const id of list) entries.push({ id, 판정: "틀림", 종류: f.종류, 심각도: f.심각도, 확신: f.확신, 까닭: f.까닭, 지금: f.지금 != null ? f.지금 : cur(id), "고칠 글": f["고칠 글"], ...(f["고칠 곳"] ? { "고칠 곳": f["고칠 곳"] } : {}), "새 음성 클립": f["새 음성 클립"], 묶음: list, 배치: stamp });
});
(batch["판단 필요"] || []).forEach((f, i) => {
  const w = `판단 필요[${i}]`;
  const list = checkIds(f.ids, w);
  need(f, ["추천안", "까닭"], w);
  for (const id of list) entries.push({ id, 판정: "판단 필요", 추천안: f.추천안, 까닭: f.까닭, "다른 길": f["다른 길"] || "", 지금: cur(id), 묶음: list, 배치: stamp });
});
(batch["결정과 다름"] || []).forEach((f, i) => {
  const w = `결정과 다름[${i}]`;
  const list = checkIds(f.ids, w);
  need(f, ["결정", "까닭"], w);
  for (const id of list) entries.push({ id, 판정: "결정과 다름", 결정: f.결정, 까닭: f.까닭, 지금: cur(id), 묶음: list, 배치: stamp });
});
(batch["화면에 안 닿음"] || []).forEach((f, i) => {
  const w = `화면에 안 닿음[${i}]`;
  const list = checkIds(f.ids, w);
  need(f, ["까닭"], w);
  for (const id of list) entries.push({ id, 판정: "화면에 안 닿음", 까닭: f.까닭, 묶음: list, 배치: stamp });
});
const ctx = (batch.문맥 || []).map((f, i) => { const w = `문맥[${i}]`; need(f, ["파일", "칸", "지금"], w); checkErr(f, w); return { ...f, 배치: stamp }; });
const smp = (batch.표본 || []).map((s, i) => {
  const w = `표본[${i}] ${s.쪽}`;
  const mine = mySample.find(([u]) => u === s.쪽);
  if (!mine) errs.push(`${w}: 이 조각의 표본 쪽이 아님(${mySample.map(([u]) => u).join(" ")})`);
  else if (s["읽은 글"] !== mine[1]) errs.push(`${w}: 읽은 글 ${s["읽은 글"]} ≠ 그 쪽의 글 ${mine[1]} — 전부 읽고 적을 것`);
  if (state.표본.some((x) => x.쪽 === s.쪽) && !REPLACE) errs.push(`${w}: 이미 적음 — 바꾸려면 --replace`);
  (s.틀림 || []).forEach((f, j) => { need(f, ["T", "지금"], `${w} 틀림[${j}]`); if (typeof f["바뀐 글"] !== "boolean") errs.push(`${w} 틀림[${j}]: '바뀐 글' 은 true/false`); checkErr(f, `${w} 틀림[${j}]`); });
  (s["판단 필요"] || []).forEach((f, j) => need(f, ["T", "추천안", "까닭"], `${w} 판단 필요[${j}]`));
  return { ...s, 배치: stamp };
});
if (errs.length) { console.error(`형식 오류 ${errs.length} — 아무것도 안 씀:\n- ${errs.join("\n- ")}`); process.exit(1); }

for (const e of entries) judged.set(e.id, e);
state.줄 = [...judged.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
state.문맥.push(...ctx);
if (REPLACE) state.표본 = state.표본.filter((x) => !smp.some((s) => s.쪽 === x.쪽));
state.표본.push(...smp);
fs.writeFileSync(OUT, JSON.stringify(state, null, 1));
const count = (v) => entries.filter((e) => e.판정 === v).length;
const st = status();
const line = `- ${stamp} · ${batch.파일 || "?"} · 판정 +${entries.length} (맞음 ${count("맞음")} · 틀림 ${count("틀림")} · 판단 필요 ${count("판단 필요")} · 결정과 다름 ${count("결정과 다름")} · 안 닿음 ${count("화면에 안 닿음")}) · 문맥 +${ctx.length} · 표본 쪽 +${smp.length} · 누계 ${st.done}/${st.total}${batch.메모 ? ` · ${String(batch.메모).replace(/\n/g, " ")}` : ""}\n`;
if (!fs.existsSync(LOG)) fs.writeFileSync(LOG, `# 기록 — 조각 ${chunk}\n\n배치마다 한 줄(add-verdicts.cjs 가 적음). 압축되면 이 파일과 \`node add-verdicts.cjs ${chunk} --status\` 부터.\n\n`);
fs.appendFileSync(LOG, line);
console.log(line.trim());
console.log(st.text);
