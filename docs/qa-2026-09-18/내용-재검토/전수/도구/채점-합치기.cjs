#!/usr/bin/env node
/**
 * 결정 A — 채점 전수 합치기: 채점/판정-NN.json(잰 일꾼) · 채점/확인-NN.json(다른 일꾼) · 채점/조정.json(이 세션) → 채점/판정.json · 채점/결과.md
 *   표에 오르는 것(③ 은 두 일꾼이 틀림일 때만 — 내용 재검토와 같은 규칙):
 *     막힘 + 확인 '동의'                         → 표
 *     안 적음 + 확인 '틀림으로'                    → 표(두 일꾼: 잰 일꾼은 재어 보았고 확인 일꾼이 막힘이라 함 — 이 세션이 조정으로 한 번 더 봄)
 *     R: 확인 일꾼이 가린 채 재어 찾은 막힘 중 잰 일꾼 막힘에 없는 것 → '놓침'(세기) · 조정 '표에 올림' 일 때만 표
 *     막힘 + 확인 '뒤집음' → 뺀 것 · 확인이 없는 막힘 → 대기
 *   조정.json = { "<B:id:k | S:id:k | M:id:답>": { "결론": "표에 올림|표에서 뺌", "까닭": "…" } }
 *   **어느 칸에도 안 들어간 조정 키가 하나라도 있으면 exit 1**(3차 점검 요청 — full-merge.cjs 가 D: 조정을 조용히 버린 흠을 되풀이하지 않게).
 *   --strict: 대기 · 끝나지 않은 읽을거리가 있으면 exit 1.
 *   겹침: 전수 읽기 표(판정.json 표 · 결과-머리 '더한 틀림')에 같은 문항이 있으면 줄에 적음(다른 정답을 합쳐 넣게).
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const C = path.join(B, "채점");
const STRICT = process.argv.includes("--strict");
const M = JSON.parse(fs.readFileSync(path.join(C, "문항.json"), "utf8"));
const byId = new Map(M.문항.map((x) => [x.id, x]));
const adj = fs.existsSync(path.join(C, "조정.json")) ? JSON.parse(fs.readFileSync(path.join(C, "조정.json"), "utf8")) : {};
const used = new Set();
const A = (k) => { if (adj[k]) used.add(k); return adj[k]; };
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");

// 전수 읽기 표와 겹침 — 전수 읽을거리의 T → 번호
const labelOf = new Map(); // "chunk|group|T" → 번호
for (const ch of ["grammar1-a", "grammar1-b", "grammar2"]) {
  const dir = path.join(B, "읽을거리", ch);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith(".md"))) {
    let g = null;
    for (const line of fs.readFileSync(path.join(dir, f), "utf8").split("\n")) {
      const h = /^## ▣ (\S+)/.exec(line); if (h) { g = h[1]; continue; }
      const t = /^- (T\d+) \[(?:KO|EN) \[번호 ([^\]]+)\]\]/.exec(line); if (t && g) labelOf.set(`${ch}|${g}|${t[1]}`, t[2]);
    }
  }
}
const prior = new Map(); // "group#label" → [설명]
const addPrior = (g, label, what) => { const k = `${g}#${label}`; if (!prior.has(k)) prior.set(k, []); prior.get(k).push(what); };
const J = fs.existsSync(path.join(B, "판정.json")) ? JSON.parse(fs.readFileSync(path.join(B, "판정.json"), "utf8")) : { 표: [], 다시읽음: { 놓침목록: [] } };
J.표.forEach((r, i) => { if (!/^GRAMMAR/.test(r.c) || r.x.종류 !== "③") return; const l = labelOf.get(`${r.ch}|${r.g}|${r.x.T}`); if (l) addPrior(r.g, l, `전수 표 #${i + 1}`); });
(J.다시읽음.놓침목록 || []).forEach((m) => { if (!/^grammar/.test(m.ch) || m.x.종류 !== "③") return; const l = labelOf.get(`${m.ch}|${m.g}|${m.x.T}`); if (l) addPrior(m.g, l, "전수 더한 틀림(다시 읽기)"); });
for (const [g, l] of [["grammar1/gh1-112", "125"], ["grammar1/gh1-112", "136"], ["grammar1/gh1-118", "52"], ["grammar1/gh1-118", "66"]]) addPrior(g, l, "전수 더한 틀림(D:gh1-112 T26)");

const rows = [], flipped = [], waiting = [], misses = [], notDone = [];
const stat = { 읽을거리: 0, 끝난읽을거리: 0, 문항: 0, 시험: 0, 막힘: 0, 막힘0점: 0, 안적음: 0, 확인동의: 0, 확인뒤집음: 0, 틀림으로: 0, R문항: 0, R막힘: 0, R놓침: 0 };
const byItem = new Map(); // id → { cands: Map(답 → {점수, 까닭[], 확신, how}) }
const put = (id, 답, 점수, 까닭, 확신, how) => {
  if (!byItem.has(id)) byItem.set(id, new Map());
  const m = byItem.get(id);
  if (!m.has(답)) m.set(답, { 점수, 까닭: [], 확신, how: [] });
  const c = m.get(답); c.까닭.push(까닭); c.how.push(how); if (확신 === "보통") c.확신 = "보통";
};
for (const [file, ids] of Object.entries(M.읽을거리)) {
  const NN = file.replace(".md", "");
  stat.읽을거리++;
  const pf = path.join(C, `판정-${NN}.json`), vf = path.join(C, `확인-${NN}.json`);
  const P = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")) : { 문항: {} };
  const V = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : { 대상: [], 결과: [] };
  const vr = new Map(V.결과.map((r) => [r.key, r]));
  const doneIds = ids.filter((id) => P.문항[id]);
  if (doneIds.length === ids.length) stat.끝난읽을거리++; else notDone.push(`${file} ${doneIds.length}/${ids.length}`);
  for (const id of doneIds) {
    const x = P.문항[id];
    stat.문항++; stat.시험 += x.시험.length; stat.안적음 += x.안적음.length;
    x.막힘.forEach((b, k) => {
      stat.막힘++; if (b.점수 === "0점") stat.막힘0점++;
      const key = `B:${id}:${k}`, r = vr.get(key), a = A(key);
      if (a) { if (a.결론 === "표에 올림") put(id, b.답, b.점수, `${b.까닭} · 조정: ${a.까닭}`, b.확신, "이 세션이 조정"); else flipped.push({ id, 답: b.답, why: `조정: ${a.까닭}` }); return; }
      if (!r) { waiting.push({ id, 답: b.답, 점수: b.점수 }); return; }
      if (r.결론 === "뒤집음") { stat.확인뒤집음++; flipped.push({ id, 답: b.답, why: r.까닭 }); return; }
      stat.확인동의++; put(id, b.답, b.점수, b.까닭, b.확신, "둘 다 막힘");
    });
    x.안적음.forEach((b, k) => {
      const key = `S:${id}:${k}`, r = vr.get(key), a = A(key);
      if (a) { if (a.결론 === "표에 올림") put(id, b.답, b.점수, `확인 일꾼 '틀림으로' · 조정: ${a.까닭}`, "보통", "안 적음 → 확인 일꾼 틀림으로 · 이 세션이 조정"); return; }
      if (r && r.결론 === "틀림으로") { stat.틀림으로++; waiting.push({ id, 답: b.답, 점수: b.점수, 무엇: `안 적음을 확인 일꾼이 '틀림으로'(${r.까닭}) — 이 세션이 조정으로 정함` }); }
    });
  }
  for (const r of V.결과.filter((r) => r.key.startsWith("R:"))) {
    const id = r.key.slice(2);
    stat.R문항++;
    const had = new Set(((P.문항[id] || {}).막힘 || []).map((b) => b.답));
    for (const b of r.막힘 || []) {
      stat.R막힘++;
      if (had.has(b.답)) continue;
      stat.R놓침++;
      const key = `M:${id}:${b.답}`, a = A(key);
      misses.push({ id, 답: b.답, 점수: b.점수, 까닭: b.까닭, 조정: a ? a.결론 : null });
      if (a && a.결론 === "표에 올림") put(id, b.답, b.점수, `${b.까닭} · 조정: ${a.까닭}`, b.확신, "확인 일꾼이 가린 채 재어 찾음 · 이 세션이 조정");
    }
  }
}
const orphan = Object.keys(adj).filter((k) => !k.startsWith("_") && !used.has(k) && !misses.some((m) => `M:${m.id}:${m.답}` === k));
const SEVR = { "0점": "중간", "70점": "낮음" };
for (const [id, m] of byItem) {
  const x = byId.get(id);
  const cands = [...m.entries()];
  const sev = cands.some(([, c]) => c.점수 === "0점") ? "중간" : "낮음";
  const course = x.course === "grammar1" ? "GRAMMAR I" : "GRAMMAR II";
  rows.push({ c: course, g: x.group, label: x.label, id, sev, x, cands, prior: prior.get(`${x.group}#${x.label}`) || [] });
}
const order = (g) => { const m = /gh([12])-(\d+)/.exec(g); return (m[1] === "1" ? 0 : 1000) + parseInt(m[2], 10); };
rows.sort((a, b) => (a.sev === b.sev ? 0 : a.sev === "중간" ? -1 : 1) || order(a.g) - order(b.g) || (parseInt(a.label, 10) || 0) - (parseInt(b.label, 10) || 0));
const count = {};
for (const r of rows) { const p = (count[r.c] = count[r.c] || { 중간: 0, 낮음: 0 }); p[r.sev]++; }
fs.writeFileSync(path.join(C, "판정.json"), JSON.stringify({ 판: M.판, 숫자: stat, 과정별: count, 표: rows.map((r) => ({ id: r.id, 과정: r.c, 심각도: r.sev, 고칠곳: r.x.where, 지금: r.x.refs, 더할것: r.cands.map(([a, c]) => ({ 답: a, 점수: c.점수, 까닭: c.까닭, 확신: c.확신, 확인: c.how })), 겹침: r.prior })), 뺀것: flipped, 대기: waiting, 놓침: misses, 끝나지않음: notDone, 고아조정: orphan }, null, 1));
const T = [`# 문법 '맞는 영작인데 0점 · 70점' 전부 재기 (소유자 결정 A) — 결과`, ""];
const head = path.join(C, "결과-머리.md");
T.push(fs.existsSync(head) ? fs.readFileSync(head, "utf8").trim() : "(머리글은 전수/채점/결과-머리.md)", "");
T.push(`## 숫자`, "", `- 판: gate15-fix \`${M.판}\` · 문항 ${stat.문항}/${M.문항.length} · 읽을거리 ${stat.끝난읽을거리}/${stat.읽을거리}`,
  `- 재어 본 영작 ${stat.시험} · 막힘 ${stat.막힘}(0점 ${stat.막힘0점} · 70점 ${stat.막힘 - stat.막힘0점}) · 안 적음 ${stat.안적음}`,
  `- 확인: 막힘 동의 ${stat.확인동의} · 뒤집음 ${stat.확인뒤집음} · 안 적음 20% 중 '틀림으로' ${stat.틀림으로}`,
  `- 가린 채 다시 재기(문항 5%): ${stat.R문항}문항 · 확인 일꾼 막힘 ${stat.R막힘} · 그중 잰 일꾼이 놓친 것 ${stat.R놓침}`,
  `- 표: 문항 ${rows.length}(${Object.entries(count).map(([c, p]) => `${c} 중간 ${p.중간} · 낮음 ${p.낮음}`).join(" / ")}) · 더할 다른 정답 ${rows.reduce((s, r) => s + r.cands.length, 0)}`, "");
T.push(`## 표 — 수정 세션이 다른 정답으로 더할 것(문항마다 한 줄 · 새 음성 없음 — 다른 정답은 소리 내지 않음)`, "",
  `| # | 심각도 | 과정 | 문항 | 고칠 곳 | 지금(정답 · 다른 정답) | 더할 다른 정답 → 지금 점수 | 까닭 | 확인 | 겹침 |`, `|---|---|---|---|---|---|---|---|---|---|`);
rows.forEach((r, i) => T.push(`| ${i + 1} | ${r.sev} | ${r.c} | ${esc(r.id)} · KO ${esc(r.x.ko)} | ${esc(r.x.where.join(" · "))} .alternatives 에 더함 | ${esc(r.x.refs.map((s) => JSON.stringify(s)).join(" / "))} | ${esc(r.cands.map(([a, c]) => `${JSON.stringify(a)} → ${c.점수}`).join(" · "))} | ${esc(r.cands.map(([, c]) => c.까닭.join(" / ")).join(" ‖ "))} | ${esc([...new Set(r.cands.flatMap(([, c]) => c.how))].join(" · "))} | ${esc(r.prior.join(" · "))} |`));
T.push("", `## 확인에서 뒤집혀 뺀 것`, "", flipped.length ? flipped.map((f) => `- ${esc(f.id)} · ${JSON.stringify(f.답)} → ${esc(f.why)}`).join("\n") : "(없음)");
T.push("", `## 잰 일꾼이 놓친 것(확인 일꾼이 가린 채 재어 찾음)`, "", misses.length ? misses.map((m) => `- ${esc(m.id)} · ${JSON.stringify(m.답)} → ${m.점수} · ${esc(m.까닭)}${m.조정 ? ` · 조정: ${m.조정}` : " · 조정 전"}`).join("\n") : "(없음)");
if (waiting.length) T.push("", `## 아직 끝나지 않은 것(대기)`, "", waiting.map((w) => `- ${esc(w.id)} · ${JSON.stringify(w.답)} → ${w.점수}${w.무엇 ? ` · ${esc(w.무엇)}` : ""}`).join("\n"));
if (notDone.length) T.push("", `## 끝나지 않은 읽을거리`, "", notDone.map((n) => `- ${n}`).join("\n"));
T.push("", `이 재기는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.`, "");
fs.writeFileSync(path.join(C, "결과.md"), T.join("\n"));
console.log(JSON.stringify({ 숫자: stat, 표: rows.length, 과정별: count, 뺀것: flipped.length, 대기: waiting.length, 놓침: misses.length, 끝나지않음: notDone.length, 고아조정: orphan }, null, 1));
if (orphan.length) { console.error(`어느 칸에도 안 들어간 조정 키 ${orphan.length}: ${orphan.join(" · ")}`); process.exit(1); }
if (STRICT && (waiting.length || notDone.length)) { console.error(`--strict: 대기 ${waiting.length} · 끝나지 않은 읽을거리 ${notDone.length}`); process.exit(1); }
