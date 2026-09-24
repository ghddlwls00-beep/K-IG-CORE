#!/usr/bin/env node
/**
 * 결정 B — 두 번째 읽기 합치기: 두번째/견줌-<조각>.json · 두번째/확인-<조각>.json · 판정-<조각>2.json · 두번째/조정.json(이 세션) → 두번째/판정.json · 두번째/결과.md
 *   N:(두 번째에만 나온 틀림) 확인 '동의' · '고쳐 동의' → 표 · '뒤집음' → 뺀 것
 *   ND:(판단 필요) '동의' → 새 판단 필요(소유자) · '뒤집음' → 대기(이 세션이 조정으로 정함)
 *   NK:(원본 그대로) '동의' → 원본 그대로 · '틀림으로' → 대기(이 세션이 조정으로 정함)
 *   조정.json = { "<N:|ND:|NK:…>": { "결론": "표에 올림|표에서 뺌|판단 필요|원본 그대로", "까닭": "…", (표에 올림) "종류" · "심각도" · "확신" · "지금" · "고칠 글" · "고칠 곳" · "새 음성 클립" } }
 *   **어느 칸에도 안 들어간 조정 키가 하나라도 있으면 exit 1**(full-merge.cjs 의 D: 조정 흠을 되풀이하지 않게). --strict: 대기 · 확인 안 된 것이 있으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const B = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수");
const D2 = path.join(B, "두번째");
const STRICT = process.argv.includes("--strict");
const COURSE = { "ld-a": "LISTENING", "ld-b": "LISTENING", student: "STUDENT" };
const SEV = ["심각", "높음", "중간", "낮음"];
const adj = fs.existsSync(path.join(D2, "조정.json")) ? JSON.parse(fs.readFileSync(path.join(D2, "조정.json"), "utf8")) : {};
const used = new Set();
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const rows = [], flipped = [], decisions = [], kept = [], waiting = [], stats = {};
for (const ch of Object.keys(COURSE)) {
  const cf = path.join(D2, `견줌-${ch}.json`), vf = path.join(D2, `확인-${ch}.json`);
  if (!fs.existsSync(cf) || !fs.existsSync(vf)) { stats[ch] = { 끝남: false }; waiting.push({ ch, key: "(조각)", 무엇: "견줌 · 확인이 아직 없음" }); continue; }
  const cmp = JSON.parse(fs.readFileSync(cf, "utf8")), V = JSON.parse(fs.readFileSync(vf, "utf8"));
  const vr = new Map(V.결과.map((r) => [r.key, r]));
  let ok = 0;
  for (const t of V.대상) {
    const r = vr.get(t.key), a = adj[t.key];
    const [kind, g] = [t.key.split(":")[0], t.key.split(":").slice(1, -1).join(":")];
    const base = { ch, c: COURSE[ch], g, key: t.key, x: t.주장 };
    if (a) {
      used.add(t.key);
      if (a.결론 === "표에 올림") { rows.push({ ...base, x: { ...t.주장, ...a, T: t.주장.T }, how: `이 세션이 조정(${a.까닭})` }); ok++; }
      else if (a.결론 === "판단 필요") decisions.push({ ...base, why: a.까닭 });
      else if (a.결론 === "원본 그대로") kept.push({ ...base, why: a.까닭 });
      else flipped.push({ ...base, why: `조정: ${a.까닭}` });
      continue;
    }
    if (!r) { waiting.push({ ...base, 무엇: "확인 안 됨" }); continue; }
    if (kind === "N") {
      if (r.결론 === "뒤집음") flipped.push({ ...base, why: r.까닭 });
      else { const x = { ...t.주장, ...(r.결론 === "고쳐 동의" ? { ...(r.심각도 ? { 심각도: r.심각도 } : {}), ...(r["고칠 글"] ? { "고칠 글": r["고칠 글"] } : {}) } : {}) }; rows.push({ ...base, x, how: r.결론 === "고쳐 동의" ? "두 번째 읽기 · 확인 고쳐 동의" : "두 번째 읽기 · 확인 동의" }); ok++; }
    } else if (kind === "ND") {
      if (r.결론 === "동의") decisions.push({ ...base, why: r.까닭 }); else waiting.push({ ...base, 무엇: `판단 필요를 확인 일꾼이 뒤집음 — ${r.까닭}` });
    } else {
      if (r.결론 === "동의") kept.push({ ...base, why: r.까닭 }); else waiting.push({ ...base, 무엇: `원본 그대로를 확인 일꾼이 '틀림으로' — ${r.까닭}` });
    }
  }
  stats[ch] = { 끝남: true, 같음: cmp.같음, 두번째에만: cmp.새것, 첫에만: cmp.첫에만, 새것확인동의: ok,
    첫읽기가찾은비율: cmp.같음 + ok ? +(cmp.같음 / (cmp.같음 + ok)).toFixed(2) : null, 두번째가찾은비율: cmp.같음 + cmp.첫에만 ? +(cmp.같음 / (cmp.같음 + cmp.첫에만)).toFixed(2) : null };
}
const orphan = Object.keys(adj).filter((k) => !k.startsWith("_") && !used.has(k));
rows.sort((a, b) => SEV.indexOf(a.x.심각도) - SEV.indexOf(b.x.심각도) || (a.c < b.c ? -1 : a.c > b.c ? 1 : 0) || (a.g < b.g ? -1 : a.g > b.g ? 1 : 0));
const count = {};
for (const r of rows) { const p = (count[r.c] = count[r.c] || { 심각: 0, 높음: 0, 중간: 0, 낮음: 0 }); p[r.x.심각도]++; }
fs.writeFileSync(path.join(D2, "판정.json"), JSON.stringify({ 조각별: stats, 과정별: count, 표: rows, 판단필요: decisions, 원본그대로: kept, 뺀것: flipped, 대기: waiting, 고아조정: orphan }, null, 1));
const T = [`# 듣기 · 초등 두 번째 읽기 (소유자 결정 B) — 결과`, ""];
const head = path.join(D2, "결과-머리.md");
T.push(fs.existsSync(head) ? fs.readFileSync(head, "utf8").trim() : "(머리글은 전수/두번째/결과-머리.md)", "");
T.push(`## 숫자 — 조각마다 첫 읽기와 견줌`, "", `| 조각 | 같음 | 두 번째에만 | 그중 확인 동의(표) | 첫 읽기에만 | 첫 읽기가 찾은 비율 | 두 번째가 찾은 비율 |`, `|---|---|---|---|---|---|---|`);
for (const [ch, s] of Object.entries(stats)) T.push(s.끝남 ? `| ${ch} | ${s.같음} | ${s.두번째에만} | ${s.새것확인동의} | ${s.첫에만} | ${s.첫읽기가찾은비율} | ${s.두번째가찾은비율} |` : `| ${ch} | (끝나지 않음) | | | | | |`);
T.push("", `## 표 — 두 번째 읽기에서 새로 나온 틀림(확인 일꾼 동의) — 심각도 순`, "", `영어나 소리 내는 글을 바꾸는 줄은 **새 음성 클립 필요**.`, "",
  `| # | 심각도 | 과정 | 묶음 · T | 고칠 곳 | 지금 | 왜 틀렸나 | 고칠 글 | 소리 | 종류 · 확신 | 확인 |`, `|---|---|---|---|---|---|---|---|---|---|---|`);
rows.forEach((r, i) => T.push(`| 둘${i + 1} | ${esc(r.x.심각도)} | ${r.c} | ${esc(r.g)} ${esc(r.x.T)} | ${esc(r.x["고칠 곳"])} | ${esc(r.x.지금)} | ${esc(r.x.까닭)} | ${esc(r.x["고칠 글"])} | ${r.x["새 음성 클립"] ? "**새 음성 클립 필요**" : ""} | ${esc(r.x.종류)} · ${esc(r.x.확신)} | ${esc(r.how)} |`));
T.push("", `## 새 판단 필요 — 소유자가 번호로 답하면 됨`, "", decisions.length ? `| 번호 | 과정 · 묶음 | 추천안 | 까닭 | 다른 길 |\n|---|---|---|---|---|` : "(없음)");
decisions.forEach((d, i) => T.push(`| 둘-${i + 1} | ${d.c} · ${esc(d.g)} ${esc(d.x.T)} | ${esc(d.x.추천안)} | ${esc(d.x.까닭)} | ${esc(d.x["다른 길"] || "")} |`));
T.push("", `## 원본 그대로(두 번째 읽기에만 · 확인 동의)`, "", kept.length ? kept.map((k) => `- ${k.c} ${esc(k.g)} ${esc(k.x.T)} · ${esc(k.x.까닭)}`).join("\n") : "(없음)");
T.push("", `## 확인에서 뒤집혀 뺀 것`, "", flipped.length ? flipped.map((f) => `- ${f.c} ${esc(f.g)} ${esc(f.x.T)} · ${esc(f.x.까닭)} → ${esc(f.why)}`).join("\n") : "(없음)");
if (waiting.length) T.push("", `## 아직 끝나지 않은 것(대기)`, "", waiting.map((w) => `- ${w.ch} ${esc(w.key)} · ${esc(w.무엇)}`).join("\n"));
T.push("", `이 두 번째 읽기는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.`, "");
fs.writeFileSync(path.join(D2, "결과.md"), T.join("\n"));
console.log(JSON.stringify({ 조각별: stats, 표: rows.length, 과정별: count, 판단필요: decisions.length, 원본그대로: kept.length, 뺀것: flipped.length, 대기: waiting.length, 고아조정: orphan }, null, 1));
if (orphan.length) { console.error(`어느 칸에도 안 들어간 조정 키 ${orphan.length}: ${orphan.join(" · ")}`); process.exit(1); }
if (STRICT && waiting.length) { console.error(`--strict: 대기 ${waiting.length}`); process.exit(1); }
