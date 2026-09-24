#!/usr/bin/env node
/**
 * 고친 것 다시 읽기(2026-09-25) — 조각별 판정 · 확인 · 조정(고침확인/조정.json)을 합쳐 고침확인/판정.json · 고침확인/결과.md.
 * 표에 오르는 규칙은 내용 재검토와 같다: 심각 · 높음 · ③ = 확인 일꾼도 틀림일 때만 · 중간 · 낮음 = 20% 표본에서 뒤집힌 것만 뺌 ·
 * 판단 필요 = 확인 일꾼이 동의한 것 · '맞음' 표본에서 확인 일꾼이 찾은 틀림은 조정.json 으로 이 세션이 정함.
 *   node fix-merge.cjs
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const B = path.resolve(__dirname, "..", "고침확인");
const recs = new Map(fs.readFileSync(path.join(B, "목록.jsonl"), "utf8").split("\n").filter(Boolean).map((l) => { const r = JSON.parse(l); return [r.id, r]; }));
const cls = JSON.parse(fs.readFileSync(path.join(B, "분류.json"), "utf8"));
const adj = fs.existsSync(path.join(B, "조정.json")) ? JSON.parse(fs.readFileSync(path.join(B, "조정.json"), "utf8")) : {};
const chunks = fs.readdirSync(path.join(B, "읽을거리")).filter((d) => d !== "ld-chips").sort();
const COURSE = (c) => (/^g1/.test(c) ? "GRAMMAR I" : /^g2/.test(c) ? "GRAMMAR II" : /^ld/.test(c) ? "LISTENING" : "STUDENT · VOCA · READING");
// 판정하는 동안 수정 세션이 이미 고친 줄(3e9687f 뒤 커밋) — 틀림으로 나와도 열린 표가 아니라 '이미 고침' 으로
const ALREADY = {
  e886d88: ["G00703", "G00704", "G00732", "G00733", "G00821", "G01207"], // 결정 C 빗금 'his/her' 다른 정답 6 뺌(앱 cleanText 가 빗금을 빈칸으로)
  "65f4125": ["G04583"], // d062 n6 따옴표 — 다른 재점검 세션이 찾음, 이 표의 고칠 글과 같은 글
};
const alreadyOf = (ids) => Object.entries(ALREADY).find(([, list]) => ids.length && ids.every((i) => list.includes(i)));
const alreadyFixed = [];
const SEV = ["심각", "높음", "중간", "낮음"];
const rows = [], flipped = [], waiting = [], decisions = [];
const verif = {}, stats = {};
const verdictOf = new Map(); // id → 판정 일꾼의 판정(이미 고친 줄을 이 다시 읽기가 잡았는지 · 놓쳤는지 적으려고)
let judged = 0, reached = 0;
for (const ch of chunks) {
  const ids = JSON.parse(fs.readFileSync(path.join(B, "읽을거리", ch, "ids.json"), "utf8"));
  reached += ids.reached.length;
  const f = path.join(B, `판정-${ch}.json`);
  const st = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { 줄: [], 문맥: [], 표본: [] };
  judged += st.줄.length;
  for (const e of st.줄) for (const id of e.묶음 || [e.id]) verdictOf.set(id, e.판정);
  const vf = path.join(B, `판정-${ch}-확인.json`);
  const v = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : { 대상: [], 결과: [] };
  const vres = new Map(v.결과.map((r) => [r.key, r]));
  const vt = new Set(v.대상.map((t) => t.key));
  verif[ch] = { 대상: v.대상.length, 적음: v.결과.length, 결론: {} };
  for (const r of v.결과) verif[ch].결론[r.결론] = (verif[ch].결론[r.결론] || 0) + 1;
  stats[ch] = { 판정: `${st.줄.length}/${ids.reached.length}`, 틀림: 0 };
  const push = (key, src, w, idsOf) => {
    const heavy = w.판정 === "틀림" && (w.심각도 === "심각" || w.심각도 === "높음" || w.종류 === "③");
    const r = vres.get(key), a = adj[key];
    let final = { ...w }, how;
    if (a) {
      if (a.결론 === "판단 필요") { decisions.push({ ch, key, w: { ...w, ...a }, ids: idsOf }); return; }
      if (a.결론 !== "표에 올림") { flipped.push({ ch, key, w, why: `조정: ${a.까닭}` }); return; }
      final = { ...final, ...a, 판정: "틀림" }; how = "이 세션이 조정(조정.json)";
    }
    else if (w.판정 === "판단 필요") { if (r && r.결론 === "동의") decisions.push({ ch, key, w }); else waiting.push({ ch, key, w, r }); return; }
    else if (r && r.결론 === "뒤집음") { flipped.push({ ch, key, w, why: r.까닭 }); return; }
    else if (r) { if (r.결론 === "고쳐 동의") final = { ...final, ...(r.심각도 ? { 심각도: r.심각도 } : {}), ...(r["고칠 글"] ? { "고칠 글": r["고칠 글"] } : {}) }; how = heavy ? "둘 다 틀림" : "20% 표본 — 확인 동의"; }
    else if (heavy) { waiting.push({ ch, key, w }); return; }
    else how = vt.has(key) ? "확인 대기" : "한 일꾼(20% 표본 밖)";
    const al = alreadyOf(idsOf);
    if (al) { alreadyFixed.push({ ch, key, ids: idsOf, w: final, commit: al[0] }); return; }
    rows.push({ ch, key, src, ids: idsOf, w: final, how });
    stats[ch].틀림++;
  };
  const seen = new Set();
  for (const e of st.줄) {
    if (e.판정 === "맞음") {
      const r = vres.get(`OK:${e.id}`);
      // 조정의 문맥: true = 그 줄의 고침은 맞고 같은 줄의 안 바뀐 부분이 틀림 → '옆 글' 로(판정 일꾼이 놓친 고침 틀림으로는 안 셈)
      if (r && r.결론 === "틀림 찾음") { const a = adj[`OK:${e.id}`]; if (a && a.결론 === "표에 올림") rows.push({ ch, key: `OK:${e.id}`, src: a.문맥 ? "옆 글" : "맞음 표본", ids: a.문맥 ? [] : [e.id], w: { ...r, ...a, 판정: "틀림" }, how: "이 세션이 조정(조정.json) — 맞음 3% 표본" }); else if (!a) waiting.push({ ch, key: `OK:${e.id}`, w: r }); }
      continue;
    }
    const first = (e.묶음 || [e.id])[0];
    if (seen.has(first)) continue;
    seen.add(first);
    if (e.판정 === "화면에 안 닿음" || e.판정 === "결정과 다름") { const r = vres.get(`F:${first}`); if (r && r.결론 === "뒤집음") waiting.push({ ch, key: `F:${first}`, w: e, r }); continue; }
    push(`F:${first}`, "고친 글", e, e.묶음 || [e.id]);
  }
  st.문맥.forEach((x, i) => push(`X:${i}`, "옆 글", { 판정: "틀림", ...x }, []));
  for (const s of st.표본) for (const x of s.틀림 || []) push(`S:${s.쪽}:${x.T}`, "칩 코드 영향", { 판정: "틀림", ...x, 쪽: s.쪽 }, []);
}
rows.sort((a, b) => SEV.indexOf(a.w.심각도) - SEV.indexOf(b.w.심각도) || (a.ch < b.ch ? -1 : 1));
const sev = (list) => Object.fromEntries(SEV.map((s) => [s, list.filter((r) => r.w.심각도 === s).length]));
const main = rows.filter((r) => r.src !== "옆 글");
const side = rows.filter((r) => r.src === "옆 글");
const nums = { 판정: judged, 닿음: reached, 틀림: main.length, 틀림_심각도: sev(main), 옆글: side.length, 판단필요: decisions.length, 뒤집힘: flipped.length, 대기: waiting.length, 새음성: rows.filter((r) => r.w["새 음성 클립"]).length };
fs.writeFileSync(path.join(B, "판정.json"), JSON.stringify({ 숫자: nums, 조각: stats, 확인: verif, 표: rows, 판단필요: decisions, 뒤집힘: flipped, 대기: waiting }, null, 1));
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const loc = (r) => { if (r.ids.length) { const rs = r.ids.map((i) => recs.get(i)).filter(Boolean); return { 파일: [...new Set(rs.map((x) => x.file.replace(/^content\//, "")))].join(" · "), 칸: [...new Set(rs.map((x) => x.path))].join(" · "), 전: rs[0] ? rs[0].before : "", 지금: rs[0] ? rs[0].after : "" }; } return { 파일: r.w.파일 || r.w["고칠 곳"] || r.w.쪽 || "", 칸: r.w.칸 || r.w.T || "", 전: "", 지금: r.w.지금 }; };
const table = (list) => [`| # | 심각도 | 과정 | 파일 · 칸 | 고치기 전(2a80bba) | 지금(3e9687f) | 왜 틀렸나 | 고칠 글 | 소리 | 종류 · 확신 | 확인 | id |`, `|---|---|---|---|---|---|---|---|---|---|---|---|`,
  ...list.map((r, i) => { const l = loc(r); return `| ${i + 1} | ${esc(r.w.심각도)} | ${COURSE(r.ch)} | ${esc(r.w["고칠 곳"] || `${l.파일} ${l.칸}`)} | ${esc(l.전)} | ${esc(l.지금)} | ${esc(r.w.까닭)} | ${esc(r.w["고칠 글"])} | ${r.w["새 음성 클립"] ? "**새 음성 클립 필요**" : ""} | ${esc(r.w.종류)} · ${esc(r.w.확신)} | ${esc(r.how)} | ${r.ids.join(" ") || r.key} |`; })];
const head = path.join(B, "결과-머리.md");
const T = [`# 고친 것 다시 읽기 결과 — 관문 15 고침(2a80bba → 3e9687f)`, "", fs.existsSync(head) ? fs.readFileSync(head, "utf8").trim() : "(머리글은 고침확인/결과-머리.md)", "",
  `## 숫자`, "", `| 무엇 | 수 |`, `|---|---|`, `| 고친 글 조각 | 5,398 (닿음 ${nums.닿음.toLocaleString()} · 판정 ${nums.판정.toLocaleString()}) |`,
  `| 고친 글의 틀림 | **${nums.틀림}건** — 심각 ${nums.틀림_심각도.심각} · 높음 ${nums.틀림_심각도.높음} · 중간 ${nums.틀림_심각도.중간} · 낮음 ${nums.틀림_심각도.낮음} |`,
  `| (더) 옆의 안 고친 글에서 본 틀림 | ${nums.옆글} |`, `| 판단 필요 | ${nums.판단필요} |`, `| 확인에서 뒤집혀 뺀 것 | ${nums.뒤집힘} |`, `| 확인 · 조정 대기 | ${nums.대기} |`, `| 새 음성 클립 필요 | ${nums.새음성} |`, "",
  `## 고친 글의 틀림 — 수정 세션이 그대로 고칠 수 있게`, "", ...table(main), "", `## 옆의 안 고친 글에서 본 틀림`, "", ...(side.length ? table(side) : ["(없음)"]), "",
  `## 판단 필요`, "", decisions.length ? decisions.map((d, i) => `${i + 1}. ${COURSE(d.ch)} ${esc(d.w.무엇 || d.key)} (${(d.ids || []).join(" ") || d.key}) — **추천: ${esc(d.w.추천안)}** · 까닭: ${esc(d.w.까닭)}`).join("\n") : "(없음)", "",
  `## 판정하는 동안 수정 세션이 이미 고친 것 (3e9687f 뒤 로컬 main — 이 세션이 그 고침도 봄)`, "",
  (() => { const ok = ALREADY.e886d88.filter((i) => verdictOf.get(i) === "맞음").length; return `- e886d88 — 결정 C 의 빗금 'his/her' 다른 정답 6(G00703 · G00704 · G00732 · G00733 · G00821 · G01207) 뺌(화면엔 'his her' 로 보이고 'his/her' 로 치면 0점). 이 다시 읽기에서 틀림으로 나온 것 ${alreadyFixed.filter((x) => x.commit === "e886d88").length}건 · **'맞음' 으로 본 것 ${ok}건 — 이 다시 읽기가 놓침.** 읽을거리가 GRAMMAR 글을 앱이 보이는 꼴(GrammarLearningView cleanText — 빗금을 빈칸으로)로 바꾸지 않고 적힌 그대로 보여 줘서 일꾼이 알 수 없었음. 같은 종류가 남았는지 앱 규칙으로 전부 셈: e886d88 판 GRAMMAR 문항 · 다른 정답 12,583 글 가운데 cleanText 가 바꾸는 글 0 · 영어 다른 정답 5,988 · 모범 전부에 빗금 0.`; })(),
  `- 65f4125 — 다른 재점검 세션이 찾은 둘. ① d062 n6 따옴표: 이 다시 읽기의 G04583 과 같은 고칠 글('"Let the press take a few photos of it and then burn it."') — 위 표에서 뺌(${alreadyFixed.filter((x) => x.commit === "65f4125").length}건). ② d006 힌트 [dental office] → [dental]: 이 세션은 d006 힌트 줄(G04973)을 '맞음' 으로 봤음 — [dental office] 가 'his office' 만 있는 n2 · n8 에 뜨는 번짐을 내용 재검토 기준대로 앱 한계로 셈. 고친 칩 [dental] 은 'dental office' 를 말하는 n5 에만 뜸(고친 판 칩 규칙으로 셈) — 고침 맞음.`, "",
  `## 확인에서 뒤집혀 뺀 것`, "", flipped.length ? flipped.map((x) => `- ${COURSE(x.ch)} ${x.key} · ${esc(x.w.까닭)} → ${esc(x.why)}`).join("\n") : "(없음)", "",
  ...(waiting.length ? [`## 아직 끝나지 않은 것`, "", waiting.map((x) => `- ${x.key} · ${esc((x.w && (x.w.까닭 || x.w.추천안)) || "")}`).join("\n"), ""] : []),
  `## 확인 숫자`, "", `| 조각 | 판정 | 확인 대상 | 적음 | 결론 |`, `|---|---|---|---|---|`, ...chunks.map((c) => `| ${c} | ${stats[c].판정} | ${verif[c].대상} | ${verif[c].적음} | ${Object.entries(verif[c].결론).map(([k, v]) => `${k} ${v}`).join(" · ")} |`), "",
  `이 다시 읽기는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.`, ""];
fs.writeFileSync(path.join(B, "결과.md"), T.join("\n"));
console.log(JSON.stringify({ 숫자: nums, 조각: stats, 확인: verif }, null, 1));
