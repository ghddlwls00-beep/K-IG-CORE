#!/usr/bin/env node
/**
 * 관문 15 — 세 판정표(재검토 696 · 전수 읽기 332 · 결정 B 31)의 **줄마다** 지금 본 폴더 파일에 고침이 제자리에 있는지 센다
 * (소유자 2026-09-25 '확실히 고친 거 맞아?'). 적용 계획(관문15-고침/적용-*.json)의 처리대로:
 *   적용   — 계획의 칸마다 지금 값 = 고칠 글(다른 정답 배열이면 모두 들어 있음).
 *   손으로 — 그 줄 uid 가 든 조작 기록(관문15-고침/*-기록.json)마다 지금 값 = 조작의 새 값(더한 · 뺀 다른 정답은 들어 있음 · 없음).
 *            조작이 없으면 코드 고침(CODE — 고친 코드 글이 그 파일에 있는지), 그다음 '같은 고칠 글이 그 파일에 이미 있음'(다른 판정이 같은 칸을 먼저 고침).
 *   건너뜀 — 뒤에 조작으로 끝냈는지 보고, 아니면 까닭을 적는다.
 * 지금 값이 다르면: 뒤 고침(다른 표 · 조작)이 같은 칸을 다시 고쳐 지금 값이 그 새 값이면 '뒤에 다시 고침' 으로 센다(사슬).
 * 하나라도 '안 됨' 이면 exit 1. --break: 첫 적용 줄의 고칠 글을 메모리에서 바꿔 '안 됨' 이 나와야(exit 1).
 *   node docs/qa-2026-09-18/scripts/verify-gate15-rows.cjs [--list] [--break]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const D = path.join(REPO, "docs/qa-2026-09-18/관문15-고침");
const LIST = process.argv.includes("--list");
const BREAK = process.argv.includes("--break");
const readJ = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^﻿/, ""));
const cache = new Map();
const file = (rel) => { if (!cache.has(rel)) { try { cache.set(rel, readJ(path.join(REPO, rel))); } catch { cache.set(rel, null); } } return cache.get(rel); };

/** '.a[3].b[n=5].c' 를 지금 파일에서 따라가 { value, ptr } — ptr 은 실제 자리('/a/3/b/7/c') */
function resolve(rel, p) {
  let cur = file(rel); const ptr = [];
  if (cur == null) return null;
  const re = /\.([^.[\]\s]+)|\[(\d+)\]|\[(id|n|word)=([^\]]*)\]/g; let m;
  const s = String(p).trim();
  while ((m = re.exec(s))) {
    if (cur == null) return null;
    if (m[1] !== undefined) { cur = cur[m[1]]; ptr.push(m[1]); }
    else if (m[2] !== undefined) { cur = cur[Number(m[2])]; ptr.push(m[2]); }
    else { if (!Array.isArray(cur)) return null; const i = cur.findIndex((x) => x && String(x[m[3]]) === m[4]); if (i < 0) return null; cur = cur[i]; ptr.push(String(i)); }
  }
  return { value: cur, ptr: `${rel}#/${ptr.join("/")}` };
}
const splitSlot = (k) => { const m = /^(content\/\S+\.json|src\/\S+\.json)\s+(\S.*)$/.exec(String(k).trim()); return m ? { rel: m[1], p: m[2] } : null; };
const asArray = (v) => { if (Array.isArray(v)) return v; try { const a = JSON.parse(v); return Array.isArray(a) ? a : null; } catch { return null; } };

// ── 모든 쓰기(차례대로) — 뒤 고침 사슬을 보려고
const writes = []; // { src, order, ptr, kind: 'text'|'alts', value }
const plans = [["재검토", "적용-재검토.json"], ["전수", "적용-전수.json"], ["B", "적용-B.json"]];
const LOGS = [["재검토 손으로", "손으로-재검토-기록.json"], ["칩 규칙 뒤 데이터", "칩규칙-뒤-데이터-기록.json"], ["재검토 지문 블록", "지문블록-재검토-기록.json"],
  ["전수 손으로", "손으로-전수-기록.json"], ["전수 READING", "읽기-전수-기록.json"], ["전수 중앙 사본", "중앙사본-전수-기록.json"], ["전수 지문 블록", "지문블록-전수-기록.json"],
  ["B 손으로", "손으로-B-기록.json"], ["C", "조작-C-기록.json"], ["C 더함", "조작-C-더함-기록.json"]];
const ORDER = { "재검토": 1, "재검토 손으로": 2, "칩 규칙 뒤 데이터": 3, "재검토 지문 블록": 4, "전수": 5, "전수 손으로": 6, "전수 READING": 7, "전수 중앙 사본": 8, "전수 지문 블록": 9, "B": 10, "B 손으로": 11, "C": 12, "C 더함": 12 };
const planRows = {};
for (const [name, f] of plans) {
  const rows = readJ(path.join(D, f)).plan;
  if (BREAK && name === "재검토") { const r = rows.find((x) => x.status === "적용" && typeof x.고칠글 === "string" && !asArray(x.고칠글)); r.고칠글 = `${r.고칠글} (깨기)`; }
  planRows[name] = rows;
  for (const r of rows) if (r.status === "적용") for (const k of r.칸 || []) { const s = splitSlot(k); const at = s && resolve(s.rel, s.p); if (at) writes.push({ src: name, order: ORDER[name], ptr: at.ptr, value: r.고칠글 }); }
}
const logs = {};
for (const [name, f] of LOGS) {
  const p = path.join(D, f);
  if (!fs.existsSync(p)) continue;
  const j = readJ(p); const arr = Array.isArray(j) ? j : j.log || [];
  logs[name] = arr;
  for (const e of arr) { const at = resolve(e.file, e.where); if (!at) continue; if (e.op === "set") writes.push({ src: name, order: ORDER[name], ptr: at.ptr, value: e.new }); }
}
const laterMatch = (ptr, order, now) => writes.find((w) => w.ptr === ptr && w.order > order && w.value === now);

// ── 코드로 끝낸 줄 — 그 코드 파일에 고친 글이 있는가
const CODE = [
  { re: /C06113$/, file: "src/components/LdLearningView.tsx", needle: "Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof" },
  { re: /K009|LdLearningView/, file: "src/components/LdLearningView.tsx", needle: "어려운 낱말 참조" },
  { re: /phonics\/hv-01:T14$/, file: "src/lib/vocaUtils.ts", needle: "ante/anti(이전의)" },
  { re: /phonics\/hv-01:T54$/, file: "src/lib/vocaUtils.ts", needle: "예방 조치\" }" },
  { re: /phonics\/hv-07:T08$/, file: "src/lib/vocaUtils.ts", needle: "환승하다/전근 가다" },
  { re: /phonics\/hv-60:T27$/, file: "src/lib/vocaUtils.ts", needle: "문제없는지 안쪽을" },
  { re: /phonics\/hv-73:T42$/, file: "src/lib/vocaUtils.ts", needle: "서로 마주 보고" },
  { re: /phonics\/hv-50:T34$/, file: "src/lib/vocaSpeech.ts", needle: "complement: \"ˈkɑːmpləmɛnt\"" },
  { re: /gh2-044/, file: "src/lib/curriculumPresentation.ts", needle: "4번은 1996년 미국 대선 무렵 뉴스로 만든 문장입니다" },
  { re: /student\/s6-2:T05$/, file: "src/lib/listeningUtils.ts", needle: "(?:Mrs|Mr|Ms|Dr)\\\\." },
];
const codeHas = (c) => fs.readFileSync(path.join(REPO, c.file), "utf8").includes(c.needle);

const tally = {}; const bad = []; const lines = [];
const mark = (table, r, how, ok) => { const k = `${table} · ${how}`; tally[k] = (tally[k] || 0) + 1; lines.push(`${ok ? "✔" : "✘"} ${table} ${r.uid} — ${how}`); if (!ok) bad.push(`${table} ${r.uid} — ${how}`); };
for (const [table] of plans) {
  const order = ORDER[table];
  for (const r of planRows[table]) {
    if (r.status === "적용") {
      let ok = true, later = false;
      for (const k of r.칸 || []) {
        const s = splitSlot(k); const at = s && resolve(s.rel, s.p);
        if (!at) { ok = false; continue; }
        const want = asArray(r.고칠글);
        if (want && Array.isArray(at.value)) { if (!want.every((x) => at.value.includes(x))) ok = false; continue; }
        if (at.value === r.고칠글) continue;
        if (laterMatch(at.ptr, order, at.value)) { later = true; continue; }
        ok = false;
      }
      mark(table, r, ok ? (later ? "적용 — 뒤에 다시 고침(사슬)" : "적용 — 칸에 고칠 글 있음") : "적용인데 지금 칸 값이 다름", ok);
      continue;
    }
    // 손으로 · 건너뜀 — 조작 기록
    const ops = Object.entries(logs).flatMap(([name, arr]) => arr.filter((e) => String(e.id).split(/\s+/).includes(r.uid) || String(e.id).endsWith(r.uid) || String(e.id).includes(` ${r.uid} `) || String(e.id).includes(`${r.uid}(`)).map((e) => ({ ...e, _src: name })));
    if (ops.length) {
      let ok = true, later = false;
      for (const e of ops) {
        const at = resolve(e.file, e.where);
        if (!at) { ok = false; continue; }
        if (e.op === "set") { if (at.value === e.new) continue; if (laterMatch(at.ptr, ORDER[e._src], at.value)) { later = true; continue; } ok = false; continue; }
        const after = e.after || {};
        const cur = at.value || {};
        if (after.text !== undefined && cur.text !== after.text && !laterMatch(`${at.ptr}/text`, ORDER[e._src], cur.text)) ok = false;
        const alts = cur.alternatives || [];
        if (Array.isArray(after.alternatives) && !after.alternatives.every((x) => alts.includes(x))) ok = false;
        const removed = (e.before && Array.isArray(e.before.alternatives) ? e.before.alternatives : []).filter((x) => !(after.alternatives || []).includes(x));
        if (removed.some((x) => alts.includes(x))) ok = false;
      }
      mark(table, r, ok ? `조작 ${ops.length}(${[...new Set(ops.map((o) => o._src))].join(" · ")})${later ? " — 뒤에 다시 고침" : ""}` : "조작 기록과 지금 값이 다름", ok);
      continue;
    }
    const code = CODE.find((c) => c.re.test(r.uid) || (c.re.source === "K009|LdLearningView" && /LdLearningView/.test(String(r.why || "")) && /K009|고유 명사 · 숫자 참조/.test(JSON.stringify(r))));
    if (code) { mark(table, r, `코드(${path.basename(code.file)})`, codeHas(code)); continue; }
    // 같은 고칠 글이 그 파일 어딘가에 이미 있음(다른 판정이 같은 칸을 먼저 고침)
    const files = [...new Set(((String(r.why || "") + " " + (r.칸 || []).join(" ")).match(/content\/[\w./-]+\.json/g) || []))];
    let hit = false;
    const walk = (n) => { if (hit) return; if (typeof n === "string") { if (n === r.고칠글) hit = true; } else if (Array.isArray(n)) n.forEach(walk); else if (n && typeof n === "object") Object.values(n).forEach(walk); };
    for (const rel of files) walk(file(rel));
    if (hit) { mark(table, r, "같은 고칠 글이 이미 들어가 있음(다른 판정)", true); continue; }
    // 다른 정답 배열 — 그 파일의 한 문항 다른 정답에 모두 들어 있으면(다른 판정이 먼저 넣음)
    const wantAlts = asArray(r.고칠글);
    if (wantAlts && files.some((rel) => { const d = file(rel); return d && (d.blocks || []).some((b) => (b.items || []).some((it) => Array.isArray(it.alternatives) && wantAlts.every((x) => it.alternatives.includes(x)))); })) {
      mark(table, r, "같은 다른 정답이 이미 들어가 있음(다른 판정)", true); continue;
    }
    // 까닭 칸에만 적힌 대본 칸('.d156[n=8].ko')
    const scriptSlot = /(\.d\d{3}\[n=\d+\]\.(?:ko|en))/.exec(String(r.why || ""));
    if (scriptSlot) { const at = resolve("content/ld_english_scripts.json", scriptSlot[1]); if (at && at.value === r.고칠글) { mark(table, r, `까닭 칸의 대본 칸(${scriptSlot[1]})에 고칠 글 있음`, true); continue; } }
    mark(table, r, r.status === "건너뜀" ? `건너뜀(${String(r.why).slice(0, 40)}) — 뒤 조작 없음` : "손으로인데 조작 · 코드 · 같은 글 모두 없음", false);
  }
}
const total = Object.values(planRows).reduce((a, r) => a + r.length, 0);
console.log(`${BREAK ? "(깨기 — 재검토 첫 적용 줄의 고칠 글을 메모리에서 바꿈) " : ""}판정표 줄 ${total}(재검토 ${planRows["재검토"].length} · 전수 ${planRows["전수"].length} · B ${planRows["B"].length}) · 확인됨 ${total - bad.length} · 안 됨 ${bad.length}`);
for (const [k, v] of Object.entries(tally).sort()) console.log(`   ${String(v).padStart(4)}  ${k}`);
for (const b of bad) console.log(`   ✘ ${b}`);
if (LIST) for (const l of lines) console.log(l);
process.exit(bad.length ? 1 : 0);
