#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 일꾼 판정(판정-<조각>.json) · 확인(판정-<조각>-확인.json) · 이 세션의 조정(조정.json)을 합친다.
 *   → 판정.json (목록 15,128줄 전부 · 줄마다 판정) · docs/qa-2026-09-18/내용-재검토-결과.md (머리글은 결과-머리.md 에서)
 *
 * 표에 오르는 규칙(명령서 '워크플로우로 나눌 때'):
 *   심각 · 높음 = 판정 일꾼 틀림 + 확인 일꾼 동의/고쳐 동의(둘 다 틀림)일 때만. 확인이 뒤집으면 '확인에서 뒤집힘' 으로 따로.
 *   중간 · 낮음 = 20% 표본으로 확인 — 확인에서 뒤집힌 것은 빼고, 표본 밖은 한 일꾼 판정 그대로(표에 '한 일꾼' 으로 표시).
 *   판단 필요 · 결정과 다름 · '화면에 안 닿음' 주장 = 확인 일꾼이 모두 봄 — 뒤집힌 것은 조정.json 에서 이 세션이 정함.
 *   '맞음' 3% 에서 확인 일꾼이 '틀림 찾음' 이면 조정.json 에서 이 세션이 한 번 더 보고 정함.
 * 조정.json: { "<key>": { "결론": "표에 올림|표에서 뺌|판단 필요|결정과 다름|안 닿음|맞음", "까닭": "…", (올릴 때) "종류", "심각도", "확신", "고칠 글", "고칠 곳", "새 음성 클립" } }
 *   key 는 확인 대상 key(F:C… · X:<조각>:<n> · S:<쪽>:<T> · OK:C…).
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");

const recs = L.readJsonl(path.join(L.DIR, "목록.jsonl"));
const byId = new Map(recs.map((r) => [r.id, r]));
const cls = require(path.join(L.DIR, "분류.json"));
const sample = JSON.parse(fs.readFileSync(path.join(L.DIR, "표본.json"), "utf8"));
const ADJ_FILE = path.join(L.DIR, "조정.json");
const adj = fs.existsSync(ADJ_FILE) ? JSON.parse(fs.readFileSync(ADJ_FILE, "utf8")) : {};
const HEAD_FILE = path.join(L.DIR, "결과-머리.md");
const chunks = fs.readdirSync(path.join(L.DIR, "읽을거리")).filter((d) => !d.startsWith("표본-")).sort();
const COURSE = { student: "STUDENT", voca: "VOCA", "grammar1-a": "GRAMMAR I", "grammar1-b": "GRAMMAR I", grammar2: "GRAMMAR II", "ld-a": "LISTENING", "ld-b": "LISTENING", "reading-a": "READING", "reading-b": "READING" };
const SAMPLE_COURSE = { student: "STUDENT", phonics: "VOCA", grammar1: "GRAMMAR I", grammar2: "GRAMMAR II", ld: "LISTENING", reading: "READING" };
const SEV = ["심각", "높음", "중간", "낮음"];
const sevRank = (s) => { const i = SEV.indexOf(s); return i < 0 ? 9 : i; };

const lines = new Map(); // id → entry
for (const r of recs) if (!cls[r.id].닿음) lines.set(r.id, { id: r.id, 판정: "안 닿음 — 판정 안 함(수만)", 칸: cls[r.id].칸, 근거: cls[r.id].근거 });
const findings = []; // 표 · 뒤집힘 · 판단 필요 등 — 묶음 단위
const missing = {};
const verif = {};
const sampleByPage = {};
for (const chunk of chunks) {
  const ids = JSON.parse(fs.readFileSync(path.join(L.DIR, "읽을거리", chunk, "ids.json"), "utf8"));
  const f = path.join(L.DIR, `판정-${chunk}.json`);
  const st = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { 줄: [], 문맥: [], 표본: [] };
  const vf = path.join(L.DIR, `판정-${chunk}-확인.json`);
  const v = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : { 대상: [], 결과: [] };
  const vres = new Map(v.결과.map((x) => [x.key, x]));
  const vtargets = new Map(v.대상.map((x) => [x.key, x]));
  verif[chunk] = { 대상: v.대상.length, 적음: v.결과.length, 결론: {} };
  for (const x of v.결과) verif[chunk].결론[x.결론] = (verif[chunk].결론[x.결론] || 0) + 1;
  const judged = new Map(st.줄.map((e) => [e.id, e]));
  missing[chunk] = ids.reached.filter((id) => !judged.has(id));
  const done = new Set();
  for (const e of st.줄) {
    const r = byId.get(e.id);
    const base = { id: e.id, 조각: chunk, 칸: cls[e.id].칸, 판정: e.판정 };
    if (e.판정 === "맞음") {
      const key = `OK:${e.id}`;
      const vr = vres.get(key);
      const a = adj[key];
      if (vr && vr.결론 === "틀림 찾음") {
        const decided = a ? a.결론 : "조정 대기";
        lines.set(e.id, { ...base, 확인: `맞음 표본에서 틀림 찾음 → ${decided}` });
        findings.push({ key, 출처: "맞음 표본", chunk, ids: [e.id], 일꾼: { 판정: "맞음" }, 확인: vr, 조정: a || null });
      } else lines.set(e.id, { ...base, ...(vr ? { 확인: "맞음 표본 — 동의" } : {}) });
      continue;
    }
    lines.set(e.id, { ...base, 종류: e.종류, 심각도: e.심각도, 확신: e.확신, 까닭: e.까닭, "고칠 글": e["고칠 글"], "고칠 곳": e["고칠 곳"], "새 음성 클립": e["새 음성 클립"], 추천안: e.추천안, 결정: e.결정, 묶음: e.묶음 });
    const first = (e.묶음 || [e.id])[0];
    if (done.has(first)) continue;
    done.add(first);
    const key = `F:${first}`;
    findings.push({ key, 출처: "1부", chunk, ids: e.묶음 || [e.id], 일꾼: e, 확인: vres.get(key) || null, 확인대상: vtargets.has(key), 조정: adj[key] || null });
  }
  st.문맥.forEach((x, i) => findings.push({ key: `X:${i}`, adjKey: `X:${chunk}:${i}`, 출처: "1부 문맥", chunk, ids: [], 일꾼: { 판정: "틀림", ...x }, 확인: vres.get(`X:${i}`) || null, 확인대상: vtargets.has(`X:${i}`), 조정: adj[`X:${chunk}:${i}`] || null }));
  for (const s of st.표본) {
    sampleByPage[s.쪽] = s;
    for (const x of s.틀림 || []) { const key = `S:${s.쪽}:${x.T}`; findings.push({ key, 출처: "2부 표본", chunk, 쪽: s.쪽, ids: [], 일꾼: { 판정: "틀림", ...x }, 확인: vres.get(key) || null, 확인대상: vtargets.has(key), 조정: adj[key] || null }); }
    for (const x of s["판단 필요"] || []) { const key = `S:${s.쪽}:${x.T}`; findings.push({ key, 출처: "2부 표본", chunk, 쪽: s.쪽, ids: [], 일꾼: { 판정: "판단 필요", ...x }, 확인: vres.get(key) || null, 확인대상: vtargets.has(key), 조정: adj[key] || null }); }
  }
}

// 최종 상태
for (const f of findings) {
  const w = f.일꾼, v = f.확인, a = f.조정;
  const heavy = w.판정 === "틀림" && (w.심각도 === "심각" || w.심각도 === "높음");
  let status, final = { ...w };
  if (a) {
    status = a.결론;
    if (a.결론 === "표에 올림") final = { ...final, 판정: "틀림", ...Object.fromEntries(Object.entries(a).filter(([k]) => !["결론", "까닭"].includes(k))) };
    final.조정까닭 = a.까닭;
  } else if (f.출처 === "맞음 표본") status = "조정 대기";
  else if (w.판정 === "틀림") {
    if (v && v.결론 === "뒤집음") status = "확인에서 뒤집힘";
    else if (v && (v.결론 === "동의" || v.결론 === "고쳐 동의")) { status = "표에 올림"; if (v.결론 === "고쳐 동의") final = { ...final, ...(v.심각도 ? { 심각도: v.심각도 } : {}), ...(v["고칠 글"] ? { "고칠 글": v["고칠 글"] } : {}) }; }
    else if (heavy) status = "확인 대기";
    else status = "표에 올림";
  } else if (w.판정 === "판단 필요") status = v && v.결론 === "뒤집음" ? "조정 대기" : v ? "판단 필요" : "확인 대기";
  else if (w.판정 === "결정과 다름") status = v && v.결론 === "뒤집음" ? "확인에서 뒤집힘" : v ? "결정과 다름" : "확인 대기";
  else if (w.판정 === "화면에 안 닿음") status = v && v.결론 === "뒤집음" ? "조정 대기" : v ? "안 닿음" : "확인 대기";
  f.상태 = status;
  f.최종 = final;
  f.확인방식 = heavy ? "둘 다 틀림(심각·높음 전부 확인)" : w.판정 === "틀림" ? (f.확인대상 ? "20% 표본 — 확인 동의" : "한 일꾼(20% 표본 밖)") : "확인 일꾼이 봄";
  if (a) f.확인방식 = `이 세션이 조정(${a.까닭})`;
  // 조정이 묶음의 일부 id 에만 해당하면(ids) 나머지는 '맞음(조정)' · '맞음' 표본에서 찾은 옆 글 틀림(문맥: true)은 그 줄 판정은 맞음 그대로
  if (a) {
    const all = f.ids.slice();
    if (a.ids) f.ids = a.ids;
    if (f.출처 === "맞음 표본" && a.문맥) f.출처 = "1부 문맥(맞음 표본에서 봄)";
    for (const id of all) {
      const e = lines.get(id) || { id };
      if (f.출처 === "1부 문맥(맞음 표본에서 봄)") { lines.set(id, { ...e, 확인: `맞음 표본 — 줄은 맞음 · 옆 글 틀림을 따로 올림(${f.key})` }); continue; }
      if (status === "표에 올림" && f.ids.includes(id)) lines.set(id, { ...e, 판정: "틀림", 종류: final.종류, 심각도: final.심각도, 확신: final.확신, 까닭: final.까닭, "고칠 글": final["고칠 글"], "고칠 곳": final["고칠 곳"], "새 음성 클립": final["새 음성 클립"], 조정: a.까닭 });
      else if (status === "판단 필요" && f.ids.includes(id)) lines.set(id, { ...e, 판정: "판단 필요", 조정: a.까닭 });
      else lines.set(id, { ...e, 판정: "맞음", 조정: a.까닭 });
    }
  }
}

// ── 숫자 ──
const reachedIds = recs.filter((r) => cls[r.id].닿음).map((r) => r.id);
const judgedCount = reachedIds.filter((id) => lines.has(id) && lines.get(id).판정 !== undefined && !String(lines.get(id).판정).startsWith("안 닿음")).length;
const table = findings.filter((f) => f.상태 === "표에 올림").sort((a, b) => sevRank(a.최종.심각도) - sevRank(b.최종.심각도) || (a.출처 < b.출처 ? -1 : 1) || (a.chunk < b.chunk ? -1 : 1));
const part1 = table.filter((f) => f.출처 !== "2부 표본");
const sevCount = (list) => Object.fromEntries(SEV.map((s) => [s, list.filter((f) => f.최종.심각도 === s).length]));
const lineCount = (list) => list.reduce((s, f) => s + Math.max(1, f.ids.length), 0);
const nums = {
  바뀐조각: recs.length, 닿음: reachedIds.length, 안닿음: recs.length - reachedIds.length, 판정: judgedCount, 판정안됨: Object.values(missing).reduce((s, x) => s + x.length, 0),
  틀림_건: part1.length, 틀림_줄: lineCount(part1), 틀림_심각도: sevCount(part1),
  판단필요: findings.filter((f) => f.상태 === "판단 필요").length, 결정과다름: findings.filter((f) => f.상태 === "결정과 다름").length,
  확인에서뒤집힘: findings.filter((f) => f.상태 === "확인에서 뒤집힘").length, 확인대기: findings.filter((f) => f.상태 === "확인 대기").length, 조정대기: findings.filter((f) => f.상태 === "조정 대기").length,
  안닿음주장_동의: findings.filter((f) => f.상태 === "안 닿음").length,
};
// 표본
function poissonUpper(k, conf = 0.95) { // 한쪽 95% 위쪽 한계(포아송) — k=0 이면 약 3.0
  let lo = 0, hi = 50 + 10 * k;
  const cdf = (lam) => { let s = 0, t = Math.exp(-lam); for (let i = 0; i <= k; i++) { s += t; t *= lam / (i + 1); } return s; };
  for (let it = 0; it < 200; it++) { const mid = (lo + hi) / 2; if (cdf(mid) > 1 - conf) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}
const sampleStats = {};
for (const [url, meta] of Object.entries(sample.쪽)) {
  const c = SAMPLE_COURSE[meta.과정];
  const s = (sampleStats[c] = sampleStats[c] || { 쪽: 0, 글: 0, 읽은쪽: 0, 놓친틀림: 0, 바뀐글틀림: 0, 틀림있는쪽: 0, 판단필요: 0 });
  s.쪽++; s.글 += meta.글수;
  const got = sampleByPage[url];
  if (got) s.읽은쪽++;
  const fs_ = table.filter((f) => f.출처 === "2부 표본" && f.쪽 === url);
  const missed = fs_.filter((f) => !f.최종["바뀐 글"]);
  s.놓친틀림 += missed.length;
  s.바뀐글틀림 += fs_.length - missed.length;
  if (missed.length) s.틀림있는쪽++;
  s.판단필요 += findings.filter((f) => f.출처 === "2부 표본" && f.쪽 === url && f.상태 === "판단 필요").length;
}
for (const s of Object.values(sampleStats)) {
  s.쪽당놓친 = +(s.놓친틀림 / s.쪽).toFixed(3);
  s.쪽당놓친_95위 = +(poissonUpper(s.놓친틀림) / s.쪽).toFixed(3);
  s.틀림있는쪽비율 = +(s.틀림있는쪽 / s.쪽).toFixed(3);
  s.틀림있는쪽비율_95위 = s.틀림있는쪽 === 0 ? +(3 / s.쪽).toFixed(3) : +Math.min(1, poissonUpper(s.틀림있는쪽) / s.쪽).toFixed(3);
}

// ── 판정.json ──
const out = {
  기준: { 기준판: L.BASE, 지금판: L.HEAD }, 숫자: nums, 표본: sampleStats, 확인: verif, 판정안된줄: missing,
  줄: recs.map((r) => lines.get(r.id) || { id: r.id, 판정: "판정 안 됨", 칸: cls[r.id].칸 }),
  찾은것: findings.map((f) => ({ key: f.key, 상태: f.상태, 출처: f.출처, 조각: f.chunk, 쪽: f.쪽, ids: f.ids, 확인방식: f.확인방식, 최종: f.최종, 확인: f.확인, 조정: f.조정 })),
};
fs.writeFileSync(path.join(L.DIR, "판정.json"), JSON.stringify(out, null, 1));

// ── 보고서 ──
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const locOf = (f) => {
  if (f.ids.length) {
    const rs = f.ids.map((id) => byId.get(id));
    return { 강의: [...new Set(rs.map((r) => r.lesson))].join(" · "), 파일: [...new Set(rs.map((r) => r.file.replace(/^content\//, "")))].join(" · "), 칸: [...new Set(rs.map((r) => r.path))].join(" · "), 전: rs[0].before, 지금: rs[0].after };
  }
  const w = f.일꾼;
  return { 강의: f.쪽 || "", 파일: w.파일 || w["고칠 곳"] || "", 칸: w.칸 || w.T || "", 전: null, 지금: w.지금 };
};
const clipOf = (f) => (f.최종["새 음성 클립"] ? "**새 음성 클립 필요**" : "");
const rowsFor = (list, withSample) => list.map((f, i) => {
  const l = locOf(f);
  const where = f.최종["고칠 곳"] ? `${esc(f.최종["고칠 곳"])} (줄: ${esc(l.파일)} ${esc(l.칸)})` : `${esc(l.파일)} \`${esc(l.칸)}\``;
  return `| ${i + 1} | ${esc(f.최종.심각도)} | ${COURSE[f.chunk]} | ${esc(l.강의)} | ${where} | ${esc(l.전 == null ? "" : l.전)} | ${esc(l.지금)} | ${esc(f.최종.까닭)} | ${esc(f.최종["고칠 글"])} | ${clipOf(f)} | ${esc(f.최종.종류)} · ${esc(f.최종.확신)} | ${esc(f.확인방식)}${withSample ? ` · ${f.최종["바뀐 글"] ? "9/18 뒤 바뀐 글" : "안 바뀐 글(놓침)"}` : ""} | ${f.ids.join(" ") || f.key} |`;
});
const head = fs.existsSync(HEAD_FILE) ? fs.readFileSync(HEAD_FILE, "utf8").trim() + "\n\n" : "(머리글은 결과-머리.md)\n\n";
const T = [];
T.push(`# 학습 내용 재검토 결과 — 9/18 감사 뒤 바뀐 글 전부 + 안 바뀐 강의 표본 86쪽`, "", head);
T.push(`## 숫자`, "", `### 1 — 9/18 뒤 바뀐 글 (기준 판 \`9d6e15d\` ↔ 지금 판 \`2a80bba\`)`, "");
T.push(`| 무엇 | 수 |`, `|---|---|`,
  `| 바뀐 글 조각(목록) | **${nums.바뀐조각.toLocaleString()}** (학습자에게 닿음 ${nums.닿음.toLocaleString()} · 안 닿음 ${nums.안닿음.toLocaleString()}) |`,
  `| 판정한 줄 | ${nums.판정.toLocaleString()} / ${nums.닿음.toLocaleString()}${nums.판정안됨 ? ` — **판정 안 된 줄 ${nums.판정안됨}**` : ""} |`,
  `| 틀림(표에 오름) | **${nums.틀림_건}건 · ${nums.틀림_줄}줄** — 심각 ${nums.틀림_심각도.심각} · 높음 ${nums.틀림_심각도.높음} · 중간 ${nums.틀림_심각도.중간} · 낮음 ${nums.틀림_심각도.낮음} |`,
  `| 판단 필요(소유자 결정) | ${nums.판단필요} |`, `| 결정과 다름 | ${nums.결정과다름} |`,
  `| 확인에서 뒤집혀 표에서 뺀 것 | ${nums.확인에서뒤집힘} |`, `| 확인 · 조정 대기 | ${nums.확인대기 + nums.조정대기} |`, "");
T.push(`### 2 — 안 바뀐 강의 표본 (씨앗 20260924)`, "", `| 과정 | 쪽 | 글 | 놓친 틀림(안 바뀐 글) | 바뀐 글의 틀림(1과 겹침) | 쪽당 놓친 틀림 · 95% 위쪽 한계 | 틀림 있는 쪽 비율 · 95% 위쪽 한계 |`, `|---|---|---|---|---|---|---|`);
for (const c of ["STUDENT", "VOCA", "GRAMMAR I", "GRAMMAR II", "LISTENING", "READING"]) { const s = sampleStats[c]; if (s) T.push(`| ${c} | ${s.쪽}${s.읽은쪽 !== s.쪽 ? ` (읽음 ${s.읽은쪽})` : ""} | ${s.글} | ${s.놓친틀림} | ${s.바뀐글틀림} | ${s.쪽당놓친} · ${s.쪽당놓친_95위} | ${s.틀림있는쪽비율} · ${s.틀림있는쪽비율_95위} |`); }
T.push("", "(95% 위쪽 한계: 놓친 것이 0 이면 3/N — 포아송 한쪽 95%.)", "");
T.push(`## 틀림 표 — 심각도 순 (수정 세션이 그대로 고칠 수 있게)`, "", `영어나 소리 내는 글을 바꾸는 줄은 **새 음성 클립 필요** — 클립 이름이 글에서 나오므로 글이 바뀌면 옛 클립은 불리지 않는다(\`node scripts/generate-azure-ava.mjs\` → R2 먼저 → 같은 이름 덮어쓰기 금지).`, "");
const cols = `| # | 심각도 | 과정 | 강의 | 파일 · 칸 | 고치기 전(9d6e15d) | 지금 | 왜 틀렸나 | 고칠 글 | 소리 | 종류 · 확신 | 확인 | id |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|`;
T.push(`### 1부 — 9/18 뒤 바뀐 글`, "", cols, ...rowsFor(part1, false), "");
const part2 = table.filter((f) => f.출처 === "2부 표본");
T.push(`### 2부 — 표본에서 찾은 틀림`, "", part2.length ? cols : "(없음)", ...rowsFor(part2, true), "");
const dec = findings.filter((f) => f.상태 === "판단 필요");
T.push(`## 판단 필요 — 소유자가 번호로 답하면 됨`, "", dec.length ? `| 번호 | 과정 · 강의 | 무엇(지금 글) | 추천안 | 까닭 | 다른 길 |\n|---|---|---|---|---|---|` : "(없음)");
dec.forEach((f, i) => { const l = locOf(f); T.push(`| ${i + 1} | ${COURSE[f.chunk]} · ${esc(l.강의)} | ${esc(l.지금)} | ${esc(f.최종.추천안)} | ${esc(f.최종.까닭)} | ${esc(f.최종["다른 길"] || "")} |`); });
T.push("");
const diff = findings.filter((f) => f.상태 === "결정과 다름");
T.push(`## 결정과 다름 — 소유자가 이미 정한 것인데 분명히 틀렸다고 보인 것 (틀림으로 세지 않음)`, "", diff.length ? `| # | 과정 · 강의 | 어느 결정 | 지금 | 까닭 |\n|---|---|---|---|---|` : "(없음)");
diff.forEach((f, i) => { const l = locOf(f); T.push(`| ${i + 1} | ${COURSE[f.chunk]} · ${esc(l.강의)} | ${esc(f.최종.결정)} | ${esc(l.지금)} | ${esc(f.최종.까닭)} |`); });
T.push("");
const flipped = findings.filter((f) => f.상태 === "확인에서 뒤집힘");
T.push(`## 확인에서 뒤집혀 표에서 뺀 것 (판정 일꾼은 틀림 · 확인 일꾼은 아님)`, "", flipped.length ? `| # | 과정 · 강의 | 지금 | 판정 일꾼 | 확인 일꾼 |\n|---|---|---|---|---|` : "(없음)");
flipped.forEach((f, i) => { const l = locOf(f); T.push(`| ${i + 1} | ${COURSE[f.chunk]} · ${esc(l.강의)} | ${esc(l.지금)} | ${esc(f.일꾼.심각도)} · ${esc(f.일꾼.까닭)} | ${esc(f.확인 && f.확인.까닭)} |`); });
T.push("");
const wait = findings.filter((f) => f.상태 === "확인 대기" || f.상태 === "조정 대기");
if (wait.length) { T.push(`## 아직 끝나지 않은 것`, ""); wait.forEach((f) => T.push(`- ${f.key} · ${f.상태} · ${COURSE[f.chunk]} · ${esc(f.일꾼.까닭 || "")}`)); T.push(""); }
T.push(`## 확인 숫자 (조각마다)`, "", `| 조각 | 확인 대상 | 적음 | 결론 |`, `|---|---|---|---|`);
for (const c of chunks) T.push(`| ${c} | ${verif[c].대상} | ${verif[c].적음} | ${Object.entries(verif[c].결론).map(([k, v]) => `${k} ${v}`).join(" · ")} |`);
// 명령서 범위 밖 — 코드 글(3차 점검 요청): 코드글-목록.jsonl · 판정-코드글.json
const codeList = fs.existsSync(path.join(L.DIR, "코드글-목록.jsonl")) ? L.readJsonl(path.join(L.DIR, "코드글-목록.jsonl")) : [];
const codeJ = fs.existsSync(path.join(L.DIR, "판정-코드글.json")) ? JSON.parse(fs.readFileSync(path.join(L.DIR, "판정-코드글.json"), "utf8")) : { 줄: [] };
if (codeList.length) {
  const cj = new Map(codeJ.줄.map((e) => [e.id, e]));
  const reachedCode = codeJ.줄.filter((e) => e.판정 !== "안 닿음");
  const codeWrong = codeJ.줄.filter((e) => e.판정 === "틀림" && !(e.확인 && e.확인.결론 === "뒤집음"));
  T.push("", `## 명령서 범위 밖 — 코드 글 (3차 점검 요청으로 더 봄)`, "",
    `9/18 뒤 바뀐 src 코드 파일(이용권 · 관리자 · /api/ 와 범위 안 글 파일 둘 뺌) ${new Set(codeList.map((r) => r.file)).size}개에서 글처럼 보이는 바뀐 조각 **${codeList.length}** — 화면 · 링크 미리보기에 닿음 ${reachedCode.length} · 안 닿음 ${codeList.length - reachedCode.length}(채점 규칙 · 거르개 낱말 · 지시문) · 판정 ${cj.size} · **틀림 ${codeWrong.length}**. 거르기 전 바뀐 조각 745 에서 한글 · JSX 글 · 화면 속성을 모두 보고 빠진 화면 글 0 을 확인(\`scripts/code-strings.cjs --all\`). 주 세션이 판정.`, "");
  if (codeWrong.length) {
    T.push(`| id | 심각도 | 고칠 곳 | 지금 | 왜 틀렸나 | 고칠 글 | 소리 | 종류 · 확신 | 확인 |`, `|---|---|---|---|---|---|---|---|---|`);
    for (const e of codeWrong) T.push(`| ${e.id} | ${esc(e.심각도)} | ${esc(e["고칠 곳"])} | ${esc(e.지금)} | ${esc(e.까닭)} | ${esc(e["고칠 글"])} | ${e["새 음성 클립"] ? "**새 음성 클립 필요**" : ""} | ${esc(e.종류)} · ${esc(e.확신)} | ${esc(e.확인 ? `${e.확인.결론} — ${e.확인.까닭}` : "확인 전")} |`);
  }
  T.push("", `맞음(화면에 닿는 것): ${reachedCode.filter((e) => e.판정 === "맞음").map((e) => `${e.id} ${esc((codeList.find((r) => r.id === e.id) || {}).after || "")}`).join(" · ")}`);
}
T.push("", `기록: [\`내용-재검토/기록.md\`](내용-재검토/기록.md) · 판정 [\`내용-재검토/판정.json\`](내용-재검토/판정.json) · 목록 [\`내용-재검토/목록.jsonl\`](내용-재검토/목록.jsonl) · 조각별 \`판정-<조각>.json\` · \`기록-<조각>.md\`.`, "");
T.push(`이 재검토는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.`, "");
fs.writeFileSync(path.join(L.WT, "docs/qa-2026-09-18/내용-재검토-결과.md"), T.join("\n"));
console.log(JSON.stringify({ 숫자: nums, 표본: sampleStats, 확인: verif, 판정안됨: Object.fromEntries(Object.entries(missing).map(([k, v]) => [k, v.length])) }, null, 1));
