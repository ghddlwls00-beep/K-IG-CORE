#!/usr/bin/env node
/**
 * 학습 내용 전수 읽기 — 조각별 판정(전수/판정-<조각>.json) · 확인(전수/판정-<조각>-확인.json) · 조정(전수/조정.json)을 합쳐
 * 전수/판정.json 과 전수/결과.md 를 만든다. 표에 오르는 규칙은 내용 재검토(merge.cjs)와 같다:
 *   심각 · 높음 · ③ = 확인 일꾼도 틀림(동의 · 고쳐 동의)일 때만 · 중간 · 낮음 = 20% 표본에서 뒤집힌 것만 뺌 · 판단 필요 = 확인 일꾼이 '정말 골라야 함' 에 동의한 것.
 *   조정.json(이 세션이 정함): { "<key>": { "결론": "표에 올림|표에서 뺌|판단 필요", "까닭": "…", (올릴 때) "종류" · "심각도" · "확신" · "고칠 글" · "고칠 곳" · "새 음성 클립" } }
 *   node full-merge.cjs
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const BASE = path.join(L.DIR, "전수");
const COURSE = { student: "STUDENT", "voca-a": "VOCA", "voca-b": "VOCA", "grammar1-a": "GRAMMAR I", "grammar1-b": "GRAMMAR I", grammar2: "GRAMMAR II", "ld-a": "LISTENING", "ld-b": "LISTENING", "reading-a": "READING", "reading-b": "READING" };
const SEV = ["심각", "높음", "중간", "낮음"];
const adj = fs.existsSync(path.join(BASE, "조정.json")) ? JSON.parse(fs.readFileSync(path.join(BASE, "조정.json"), "utf8")) : {};
const chunks = fs.readdirSync(path.join(BASE, "읽을거리")).sort();
const rows = [], decisions = [], flipped = [], waiting = [], kept = [];
const perCourse = {};
const reread = { 묶음: 0, 글: 0, 놓침: 0, 놓침목록: [] };
const status = {};
for (const ch of chunks) {
  const ids = JSON.parse(fs.readFileSync(path.join(BASE, "읽을거리", ch, "ids.json"), "utf8"));
  const f = path.join(BASE, `판정-${ch}.json`);
  const st = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { 묶음: [] };
  const vf = path.join(BASE, `판정-${ch}-확인.json`);
  const v = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : { 대상: [], 결과: [] };
  const vres = new Map(v.결과.map((r) => [r.key, r]));
  const vt = new Set(v.대상.map((t) => t.key));
  const c = COURSE[ch];
  const pc = (perCourse[c] = perCourse[c] || { 묶음: 0, 묶음전체: 0, 글: 0, 글전체: 0, 틀림: { 심각: 0, 높음: 0, 중간: 0, 낮음: 0 }, 판단필요: 0 });
  pc.묶음전체 += Object.keys(ids.groups).length;
  pc.글전체 += Object.values(ids.groups).reduce((s, n) => s + n, 0);
  status[ch] = { 묶음: `${st.묶음.length}/${Object.keys(ids.groups).length}`, 확인: `${v.결과.length}/${v.대상.length}` };
  for (const g of st.묶음) {
    pc.묶음++; pc.글 += g["읽은 글"];
    for (const x of g.틀림) {
      const key = `F:${g.묶음}:${x.T}`;
      const heavy = x.심각도 === "심각" || x.심각도 === "높음" || x.종류 === "③";
      const r = vres.get(key), a = adj[key];
      let final = { ...x }, how;
      if (a) { if (a.결론 !== "표에 올림") { flipped.push({ ch, g: g.묶음, x, why: `조정: ${a.까닭}` }); continue; } final = { ...final, ...a }; how = `이 세션이 조정(${a.까닭})`; }
      else if (r && r.결론 === "뒤집음") { flipped.push({ ch, g: g.묶음, x, why: r.까닭 }); continue; }
      else if (r) { if (r.결론 === "고쳐 동의") final = { ...final, ...(r.심각도 ? { 심각도: r.심각도 } : {}), ...(r["고칠 글"] ? { "고칠 글": r["고칠 글"] } : {}) }; how = heavy ? "둘 다 틀림" : "20% 표본 — 확인 동의"; }
      else if (heavy) { waiting.push({ ch, g: g.묶음, x }); continue; }
      else how = vt.has(key) ? "확인 대기" : "한 일꾼(20% 표본 밖)";
      pc.틀림[final.심각도]++;
      rows.push({ ch, c, g: g.묶음, x: final, how });
    }
    for (const x of g["원본 그대로"] || []) { pc.원본그대로 = (pc.원본그대로 || 0) + 1; kept.push({ c, g: g.묶음, x }); }
    for (const x of g["판단 필요"]) {
      const key = `D:${g.묶음}:${x.T}`;
      const r = vres.get(key), a = adj[key];
      if (a) { if (a.결론 === "판단 필요") { decisions.push({ c, g: g.묶음, x }); pc.판단필요++; } continue; }
      if (r && r.결론 === "동의") { decisions.push({ c, g: g.묶음, x }); pc.판단필요++; } else if (r) waiting.push({ ch, g: g.묶음, x: { ...x, 확인: r } }); else waiting.push({ ch, g: g.묶음, x });
    }
  }
  // 통째로 다시 읽은 묶음 — 판정 일꾼이 놓친 것
  for (const r of v.결과.filter((r) => r.key.startsWith("G:"))) {
    const gname = r.key.slice(2);
    const orig = st.묶음.find((g) => g.묶음 === gname);
    const had = new Set((orig ? orig.틀림 : []).map((x) => x.T));
    reread.묶음++; reread.글 += r["읽은 글"] || 0;
    for (const x of r.틀림 || []) if (!had.has(x.T)) { reread.놓침++; reread.놓침목록.push({ ch, g: gname, x }); }
  }
}
rows.sort((a, b) => SEV.indexOf(a.x.심각도) - SEV.indexOf(b.x.심각도) || (a.c < b.c ? -1 : 1) || (a.g < b.g ? -1 : 1));
fs.writeFileSync(path.join(BASE, "판정.json"), JSON.stringify({ 과정별: perCourse, 조각별: status, 표: rows, 판단필요: decisions, 뒤집힘: flipped, 대기: waiting, 다시읽음: reread }, null, 1));
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const T = [`# 학습 내용 전수 읽기 결과 — 9/18 뒤 안 바뀌고 표본에도 안 든 글 전부`, ""];
const head = path.join(BASE, "결과-머리.md");
T.push(fs.existsSync(head) ? fs.readFileSync(head, "utf8").trim() : "(머리글은 전수/결과-머리.md)", "");
T.push(`## 숫자`, "", `| 과정 | 묶음(읽음/전체) | 글(읽음/전체) | 틀림 심각 · 높음 · 중간 · 낮음 | 판단 필요 |`, `|---|---|---|---|---|`);
for (const [c, p] of Object.entries(perCourse)) T.push(`| ${c} | ${p.묶음}/${p.묶음전체} | ${p.글.toLocaleString()}/${p.글전체.toLocaleString()} | ${SEV.map((s) => p.틀림[s]).join(" · ")} | ${p.판단필요} |`);
T.push("", `판정 일꾼이 놓친 비율(확인 일꾼이 묶음 3%를 판정을 가린 채 통째로 다시 읽음): 묶음 ${reread.묶음} · 글 ${reread.글} · 판정 일꾼이 놓친 틀림 ${reread.놓침}.`, "");
T.push(`## 틀림 표 — 심각도 순`, "", `영어나 소리 내는 글을 바꾸는 줄은 **새 음성 클립 필요**(클립 이름 = 글 해시 — \`node scripts/generate-azure-ava.mjs\` → R2 먼저 → 같은 이름 덮어쓰기 금지).`, "");
T.push(`| # | 심각도 | 과정 | 묶음 · T | 고칠 곳 | 지금 | 왜 틀렸나 | 고칠 글 | 소리 | 종류 · 확신 | 확인 |`, `|---|---|---|---|---|---|---|---|---|---|---|`);
rows.forEach((r, i) => T.push(`| ${i + 1} | ${esc(r.x.심각도)} | ${r.c} | ${esc(r.g)} ${esc(r.x.T)} | ${esc(r.x["고칠 곳"])} | ${esc(r.x.지금)} | ${esc(r.x.까닭)} | ${esc(r.x["고칠 글"])} | ${r.x["새 음성 클립"] ? "**새 음성 클립 필요**" : ""} | ${esc(r.x.종류)} · ${esc(r.x.확신)} | ${esc(r.how)} |`));
T.push("", `## 판단 필요 — 소유자가 번호로 답하면 됨`, "", decisions.length ? `| 번호 | 과정 · 묶음 | 추천안 | 까닭 | 다른 길 |\n|---|---|---|---|---|` : "(없음)");
decisions.forEach((d, i) => T.push(`| ${i + 1} | ${d.c} · ${esc(d.g)} ${esc(d.x.T)} | ${esc(d.x.추천안)} | ${esc(d.x.까닭)} | ${esc(d.x["다른 길"] || "")} |`));
T.push("", `## 원본 그대로(소유자 기준 2026-09-24 — 되살린 원본의 그 시대 사실, 고치지 않음)`, "", kept.length ? kept.map((k) => `- ${k.c} ${esc(k.g)} ${esc(k.x.T)} · ${esc(k.x.까닭)}`).join("\n") : "(없음)");
T.push("", `## 확인에서 뒤집혀 표에서 뺀 것`, "", flipped.length ? flipped.map((f) => `- ${COURSE[f.ch]} ${f.g} ${f.x.T} · ${esc(f.x.까닭)} → ${esc(f.why)}`).join("\n") : "(없음)");
if (waiting.length) T.push("", `## 아직 끝나지 않은 것`, "", waiting.map((w) => `- ${COURSE[w.ch]} ${w.g} ${w.x.T} · ${esc(w.x.까닭 || w.x.추천안 || "")}`).join("\n"));
T.push("", `이 전수 읽기는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.`, "");
fs.writeFileSync(path.join(BASE, "결과.md"), T.join("\n"));
console.log(JSON.stringify({ 과정별: perCourse, 조각별: status, 표: rows.length, 판단필요: decisions.length, 뒤집힘: flipped.length, 대기: waiting.length, 다시읽음: { 묶음: reread.묶음, 글: reread.글, 놓침: reread.놓침 } }, null, 1));
