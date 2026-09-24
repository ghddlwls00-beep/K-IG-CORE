#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 고칠 힌트 줄을 main 최신판 스냅샷(KIG_SNAP)에 대어 잼(읽기만). 입력 수정확인/고칠-칩-틀.json.
 *  강마다: ① 고칠 줄이 main 과 다름 ② '기대' 칩이 그 문장에 뜸 ③ '안보임' 칩이 그 문장에서 사라짐
 *          ④ 기계 번짐(수정확인-번짐.cjs — 수 · 이름 조각 · 글자 조각)이 main 보다 새로 생기지 않음 ⑤ 안전장치(칩 전부)가 새로 켜지지 않음
 *  → 수정확인/고칠-칩.json(줄 · 바뀐 문장 main 칩 → 고친 뒤 칩 · 번짐 수) · 하나라도 어긋나면 exit 1(그때는 고칠-칩.json 을 덮어쓰지 않음).
 *   node 수정확인-칩재기.cjs              고치기 전 판에 잼
 *   node 수정확인-칩재기.cjs --applied    넣은 뒤 판: 스냅샷의 힌트 줄이 고칠-칩.json 의 '고칠 힌트 줄' 과 글자 그대로 같은지만
 * 도구 확인(깨기)은 스냅샷의 지금 힌트 줄에 기대지 않음 — 넣은 판에서 d177 이 이미 고칠 줄과 같아 확인이 멈추던 것을 고침(수정 세션 알림, 2026-09-25).
 */
const fs = require("fs");
const path = require("path");
const { NEW, flags, why, SNAP, E } = require("./수정확인-번짐.cjs");
const B = path.resolve(__dirname, "..");
const sc = JSON.parse(fs.readFileSync(path.join(SNAP, "content/ld_english_scripts.json"), "utf8"));
const mainHint = (id) => { const b = (JSON.parse(fs.readFileSync(path.join(SNAP, `content/lessons/ld/${id}.json`), "utf8")).blocks || []).find((x) => x.type === "hints"); return b ? b.text : ""; };
const fallback = (en, chunks) => { const s = E.hintsForSentence(en, chunks); return s.length > 1 && s.length === chunks.length && !chunks.some((c) => why(c, en)); };

// --applied: 수정 세션이 넣은 뒤 — 스냅샷(KIG_SNAP = 넣은 판)의 힌트 줄이 수정확인/고칠-칩.json 의 '고칠 힌트 줄' 과 글자 그대로 같은지만 봄
if (process.argv.includes("--applied")) {
  const done = JSON.parse(fs.readFileSync(path.join(B, "수정확인", "고칠-칩.json"), "utf8")).강;
  const same = (x, want) => mainHint(x.강).trim() === want.trim();
  // 깨기 확인: 첫 강의 기대 줄을 메모리에서 바꾸면 같음 ↔ 다름이 뒤집혀야 함(스냅샷이 넣은 판이든 아니든)
  const x0 = done[0], before = same(x0, x0["고칠 힌트 줄"]);
  const flipped = same(x0, before ? `${x0["고칠 힌트 줄"]} (깨기)` : mainHint(x0.강));
  if (flipped === before) { console.error("도구 확인 실패: 기대 줄을 바꿔도 결과가 안 바뀜"); process.exit(3); }
  console.log(`도구 확인 ✔ (${x0.강} 기대 줄을 메모리에서 바꾸면 ${before ? "같음 → 다름" : "다름 → 같음"})`);
  const off = done.filter((x) => !same(x, x["고칠 힌트 줄"]));
  for (const x of off) console.log(`✘ ${x.강} — 스냅샷: ${mainHint(x.강)}\n   고칠 줄: ${x["고칠 힌트 줄"]}`);
  console.log(`${done.length}강 중 고칠 줄과 같음 ${done.length - off.length} · 다름 ${off.length} (스냅샷 ${SNAP})`);
  process.exit(off.length ? 1 : 0);
}

function measure(id, line, want = [], gone = [], mainOverride = null) {
  const rows = sc[id] || [], main = mainOverride != null ? mainOverride : mainHint(id), mc = NEW(main), pc = NEW(line), bad = [], changed = [], newFlags = [];
  if (line.trim() === main.trim()) bad.push("main 과 같음");
  let mf = 0, pf = 0;
  for (const r of rows) {
    const en = String(r.en || ""), a = E.hintsForSentence(en, mc), b = E.hintsForSentence(en, pc);
    if (JSON.stringify(a) !== JSON.stringify(b)) changed.push({ n: r.n, main: a, 고친뒤: b });
    const fa = flags(en, mc), fb = flags(en, pc);
    mf += fa.length; pf += fb.length;
    // 새 번짐 = 그 문장에서 같은 갈래의 번짐 수가 늘어남(칩 글만 바뀌고 같은 번짐이 남은 것은 새 것이 아님 — 그대로 남은 수는 '기계 번짐' 에 보임)
    for (const k of new Set(fb.map((f) => f.kind))) if (fb.filter((f) => f.kind === k).length > fa.filter((f) => f.kind === k).length) newFlags.push(`n${r.n} ${k} ${fb.filter((f) => f.kind === k).map((f) => `[${f.chip}] ${f.what}`).join(" ")}`);
    if (fallback(en, pc) && !fallback(en, mc)) bad.push(`n${r.n} 안전장치가 새로 켜짐(칩 ${pc.length}개 전부)`);
  }
  const at = (n) => { const r = rows.find((x) => String(x.n) === String(n)); return r ? E.hintsForSentence(String(r.en || ""), pc) : null; };
  for (const [n, c] of want) { const s = at(n); if (!s) bad.push(`n${n} 문장 없음`); else if (!s.includes(c)) bad.push(`n${n} 에 [${c}] 없음 — ${s.map((x) => `[${x}]`).join(" ")}`); }
  for (const [n, c] of gone) { const s = at(n); if (!s) bad.push(`n${n} 문장 없음`); else if (s.includes(c)) bad.push(`n${n} 에 [${c}] 가 아직 뜸`); }
  if (newFlags.length) bad.push(`새 기계 번짐 ${newFlags.length}: ${newFlags.join(" · ")}`);
  return { main, bad, changed, mf, pf };
}
// 깨기 확인: main 그대로 · 번짐을 새로 부르는 줄('Ten minutes later' 는 n2 'forgotten' 에 걸림)은 어긋남으로 잡아야 함.
// 'main' 은 스냅샷이 아니라 고치기 전 d177 힌트 줄(f9ffca2)로 고정 — 대본(영어 문장)만 스냅샷에서 씀.
{
  const OLD = "destination. amused. sent. minutes later. astonished";
  const same = measure("d177", OLD, [[4, "Rudd"]], [], OLD);
  const ten = measure("d177", "Rudd. destination. amused. sent. Ten minutes later. astonished", [[4, "Rudd"]], [], OLD);
  const ok = measure("d177", "Rudd. destination. amused. sent. minutes later. astonished", [[4, "Rudd"]], [[4, "destination"]], OLD);
  if (!same.bad.length || !ten.bad.some((b) => /새 기계 번짐/.test(b)) || ok.bad.length) { console.error("도구 확인 실패", JSON.stringify({ same: same.bad, ten: ten.bad, ok: ok.bad })); process.exit(3); }
  console.log("도구 확인 ✔ (main 그대로 · 새 번짐 부르는 줄은 어긋남으로 잡고, 맞는 줄은 통과)");
}
const spec = JSON.parse(fs.readFileSync(path.join(B, "수정확인", "고칠-칩-틀.json"), "utf8"));
const out = [];
let fail = 0;
for (const s of spec.강) {
  const line = s.줄 != null ? s.줄 : fs.readFileSync(path.join(B, s.출처), "utf8").replace(/^﻿/, "").replace(/\r?\n$/, "").trim();
  const m = measure(s.강, line, s.기대, s.안보임);
  if (m.bad.length) fail++;
  out.push({ 강: s.강, 갈래: s.갈래, 무엇: s.무엇, "main 힌트 줄": m.main, "고칠 힌트 줄": line, 출처: s.출처 || "이 세션(main f9ffca2 에 맞춰 씀)", "바뀐 문장": m.changed, "기계 번짐": { main: m.mf, 고친뒤: m.pf }, 어긋남: m.bad });
  console.log(`${m.bad.length ? "✘" : "✔"} ${s.강} ${s.갈래} · 바뀐 문장 ${m.changed.length} · 기계 번짐 ${m.mf} → ${m.pf}${m.bad.length ? " · " + m.bad.join(" ‖ ") : ""}`);
}
console.log(`${out.length}강 · 어긋남 ${fail}`);
if (fail) { console.log("어긋남이 있어 수정확인/고칠-칩.json 을 덮어쓰지 않음(이미 넣은 판이면 --applied 로)."); process.exit(1); }
fs.writeFileSync(path.join(B, "수정확인", "고칠-칩.json"), JSON.stringify({ 스냅: SNAP, 잰때: new Date().toISOString(), 강: out }, null, 1));
