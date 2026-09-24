#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기 — 합치기: 수정확인/판정-<조각>.json(본 일꾼) · 확인-<조각>.json(다른 일꾼) · 기계.json → 수정확인/결과.md · 판정.json
 *  마지막 판정 = 확인 대상이면 확인 결론(동의 → 그대로 · 뒤집음 → '바른 판정'), 아니면 본 일꾼 판정. 제대로 · 괜찮음이 아닌데 확인이 없으면 '확인 대기'.
 *  --strict: 적기 · 확인이 끝나지 않았거나 확인 대기가 있으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const OUT = path.resolve(__dirname, "../수정확인");
const STRICT = process.argv.includes("--strict");
const ids = JSON.parse(fs.readFileSync(path.join(OUT, "ids.json"), "utf8"));
const rows = new Map(JSON.parse(fs.readFileSync(path.join(OUT, "줄.json"), "utf8")).map((r) => [r.id, r]));
const M = JSON.parse(fs.readFileSync(path.join(OUT, "기계.json"), "utf8"));
const esc = (s) => String(s == null ? "" : s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const final = [], waiting = [], notDone = [];
const count = { 줄: {}, 칩: {} };
let flipped = 0, agreed = 0;
for (const [chunk, list] of Object.entries(ids)) {
  const pf = path.join(OUT, `판정-${chunk}.json`), vf = path.join(OUT, `확인-${chunk}.json`);
  const P = fs.existsSync(pf) ? JSON.parse(fs.readFileSync(pf, "utf8")).결과 : {};
  const V = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : { 대상: [], 결과: [] };
  const vt = new Set(V.대상.map((t) => t.key)), vr = new Map(V.결과.map((r) => [r.key, r]));
  const left = list.filter((id) => !P[id]);
  if (left.length) notDone.push(`${chunk} 적기 ${list.length - left.length}/${list.length}`);
  if (V.결과.length < V.대상.length || !fs.existsSync(vf)) notDone.push(`${chunk} 확인 ${V.결과.length}/${V.대상.length}`);
  const kind = chunk.startsWith("칩-") ? "칩" : "줄";
  for (const id of list) {
    const p = P[id];
    if (!p) continue;
    let v = p.판정, how = "본 일꾼";
    const c = vr.get(id);
    if (c) { if (c.결론 === "뒤집음") { v = c["바른 판정"]; how = `확인 일꾼이 뒤집음(${c.까닭})`; flipped++; } else { how = "둘 다 같음"; agreed++; } }
    else if (!["제대로", "괜찮음"].includes(p.판정)) { how = vt.has(id) ? "확인 대기" : "확인 대상 아님"; waiting.push({ chunk, id }); }
    // 확인 일꾼이 '바른 판정' 칸에 설명까지 적은 것('문제 — n5 …')은 판정 '문제' 로(설명은 '확인' 칸의 까닭에 이미 있음)
    if (typeof v === "string" && /^문제\s*[—-]/.test(v)) v = "문제";
    count[kind][v] = (count[kind][v] || 0) + 1;
    final.push({ chunk, kind, id, v, how, p, row: rows.get(id) });
  }
}
const bad = final.filter((f) => !["제대로", "괜찮음"].includes(f.v) && !/^제대로|^괜찮음/.test(String(f.v)));
// 지금 main 에서의 상태(수정확인/조정.json — 일꾼이 읽은 판 뒤에 수정 세션이 더 고친 것) · 잰 고칠 힌트 줄(수정확인/고칠-칩.json)
const readOpt = (f) => (fs.existsSync(path.join(OUT, f)) ? JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")) : null);
const ADJ = readOpt("조정.json"), FIX = readOpt("고칠-칩.json"), MB = readOpt("번짐-기계.json"), MA = readOpt("번짐-기계-고친뒤.json");
const fixOf = new Map(((FIX && FIX.강) || []).map((x) => [x.강, x]));
for (const b of bad) {
  const a = ADJ && ADJ.조정[b.id];
  b.now = a ? `${a.상태}(${a.커밋}) — ${a.까닭}` : "남음";
  b.state = a ? a.상태 : "남음";
  const fx = fixOf.get(b.id);
  // 갈래: 잰 줄이 있으면 그 갈래, 없으면 문제 목록의 표시(〔전과 같음〕 · 고침 탓 아님 · 전부터) — 본 일꾼이 '괜찮음' 이라 목록이 없고 확인 일꾼이 뒤집은 것은 그 까닭으로
  const text = b.p.문제 && b.p.문제.length ? JSON.stringify(b.p.문제) : b.how;
  b.kindOf = fx ? fx.갈래 : b.kind === "칩" ? (/되살린 첫 줄 탓/.test(text) ? "고침 탓" : /전과 같음|고침 탓 아님|전부터/.test(text) ? "전부터" : "고침 탓") : "";
  b.fix = fx ? fx["고칠 힌트 줄"] : "";
  if (fx && fx.어긋남.length) b.fix += ` (잼 어긋남: ${fx.어긋남.join(" · ")})`;
}
const stateCount = (list) => list.reduce((m, b) => ((m[b.state] = (m[b.state] || 0) + 1), m), {});
fs.writeFileSync(path.join(OUT, "판정.json"), JSON.stringify({ 판: M.판, 셈: count, 확인: { 같음: agreed, 뒤집음: flipped }, 문제: bad.map((b) => ({ chunk: b.chunk, id: b.id, 판정: b.v, 갈래: b.kindOf, "지금 main": b.now, 확인: b.how, 본일꾼: b.p })), 대기: waiting, 끝나지않음: notDone }, null, 1));
const T = [`# 관문 15 고침 다시 보기 — 결과(main ${M.판.slice(0, 7)})`, ""];
const head = path.join(OUT, "결과-머리.md");
T.push(fs.existsSync(head) ? fs.readFileSync(head, "utf8").trim() : "(머리글은 전수/수정확인/결과-머리.md)", "");
T.push("## 기계 확인(도구/수정확인-기계.cjs — main 의 글 · main 의 코드로 잼)", "",
  `- 결정 C: 다른 정답 ${M.결정C.다른정답} 중 고칠 곳 파일 모두에서 만점 ${M.결정C.모든파일만점}(파일마다 ${M.결정C.파일마다만점}/${M.결정C.파일마다검사}) · 안 된 것 ${M.결정C.안된것.length}(모두 'his/her' — 아래) · 이 세션 채점 표에서 뺀 답이 들어감 ${M.결정C.뺀답이들어감.length}(전수 표 · 더한 틀림 쪽에서 — 맞는 영어)`,
  `- 채점 코드 바뀜: 뜻 반대 변형 ${M.채점코드.변형} — main 에서 새로 점수 받는 것 0 · 0점이 아닌 ${M.채점코드.main에서점수받는뜻반대.length} 은 모두 부가의문문 꼬리만 틀린 답(소유자 결정 70점)`,
  `- 빗금 나누기: 빗금 문장 ${M.빗금.빗금문장} 중 바뀐 것 ${M.빗금.달라진문장.length}(${M.빗금.달라진문장.map((c) => c.where).join(" · ")})`,
  `- 칩 규칙만으로 바뀐 강 ${M.칩.규칙만바뀐강.length}(${M.칩.규칙만바뀐강.map((e) => e.강).join(" · ")} — 나아짐) · 힌트 줄이 바뀐 강 ${M.칩.힌트줄바뀐강.length}(일꾼이 봄)`, "");
T.push("## 일꾼 확인", "", `- 줄 ${Object.values(count.줄).reduce((s, n) => s + n, 0)}: ${Object.entries(count.줄).map(([k, n]) => `${k} ${n}`).join(" · ")}`, `- 칩 ${Object.values(count.칩).reduce((s, n) => s + n, 0)}강: ${Object.entries(count.칩).map(([k, n]) => `${k} ${n}`).join(" · ")}`, `- 다른 일꾼 확인: 같음 ${agreed} · 뒤집음 ${flipped}`, "");
T.push("## 문제 — 수정 세션이 고칠 것", "");
const rb = bad.filter((b) => b.kind === "줄"), cb = bad.filter((b) => b.kind === "칩");
const sc = (o) => Object.entries(o).map(([k, n]) => `${k} ${n}`).join(" · ");
T.push(`- 줄 ${rb.length}: ${sc(stateCount(rb))}`, `- 칩 ${cb.length}강: 고침 탓 ${cb.filter((b) => b.kindOf === "고침 탓").length} · 전부터 ${cb.filter((b) => b.kindOf === "전부터").length} — 지금 main: ${sc(stateCount(cb))} · 잰 고칠 힌트 줄 있음 ${cb.filter((b) => b.fix).length}`, "");
T.push(rb.length ? `| id | 표 | 과정 · 묶음 | 판정 | 지금 main(${(ADJ && ADJ.판) || "?"}) | 고칠 곳 | 고칠 글(표) | main 글(3e9687f) | 까닭 | 고칠 것 | 확인 |\n|---|---|---|---|---|---|---|---|---|---|---|` : "(줄: 없음)");
for (const b of rb) T.push(`| ${b.id} | ${esc(b.row && b.row.표)} | ${esc(b.row && b.row.c)} · ${esc(b.row && b.row.g)} ${esc(b.row && b.row.x.T)} | ${esc(b.v)} | ${esc(b.now)} | ${esc(b.row && b.row.x["고칠 곳"])} | ${esc(b.row && b.row.x["고칠 글"])} | ${esc(b.p["main 글"])} | ${esc(b.p.까닭)} | ${esc(b.p["고칠 것"])} | ${esc(b.how)} |`);
T.push("", cb.length ? `| 강 | 갈래 | 문제(문장 · 칩 · 무엇) | 지금 main(${(ADJ && ADJ.판) || "?"}) | 고칠 힌트 줄(수정확인-칩재기.cjs 로 main 최신판에 잰 것) | 확인 |\n|---|---|---|---|---|---|` : "(칩: 없음)");
for (const b of cb) T.push(`| ${b.id} | ${esc(b.kindOf)} | ${esc((b.p.문제 || []).map((x) => `${x.n} ${x.칩} ${x.무엇}`).join(" ‖ ") || b.p.까닭)} | ${esc(b.now)} | ${esc(b.fix || (b.state === "이미 고침" ? "(이미 고침)" : "(잰 줄 없음 — 아래 '기계로 센 번짐' · 코드 규칙 몫)"))} | ${esc(b.how)} |`);
if (MB) {
  const cnt = (J, k) => { const r = J.번짐.filter((x) => x.kind === k); return `${r.length}곳 · ${new Set(r.map((x) => x.강)).size}강`; };
  const lessons = (J, k) => [...new Set(J.번짐.filter((x) => x.kind === k).map((x) => x.강))].join(" ");
  T.push("", `## 기계로 고르게 센 칩 번짐(도구/수정확인-번짐.cjs — LISTENING ${MB.강}강 · 문장 ${MB.문장} · 판 ${path.basename(MB.스냅)})`, "",
    "일꾼 조각마다 '전부터 있던 번짐' 을 센 잣대가 달라(칩-2 · 칩-3 은 셈, 칩-1 · 4 · 5 는 까닭에만) 같은 잣대로 과정 전체를 기계로 셈. 안전장치로 뜬 칩은 세지 않음.", "",
    `| 갈래 | main 지금 | 잰 고칠 줄을 넣은 뒤 | 남는 강 |\n|---|---|---|---|`);
  for (const k of ["수", "이름 조각", "글자 조각"]) T.push(`| ${k} 번짐 | ${cnt(MB, k)} | ${MA ? cnt(MA, k) : "-"} | ${MA ? lessons(MA, k) : ""} |`);
  T.push("", "- 수 번짐 = 그 문장에 없는 수(숫자 · 수 낱말 · 서수)가 든 칩이 낱말 일치로 뜸. 이름 조각 = 대문자 낱말(이름)이 문장의 다른 낱말 속 글자로만 맞음(New ← news · Air ← airplane). 글자 조각 = 소문자 낱말이 낱말 가운데 · 두 낱말에 걸쳐서만 맞음(national ← international).",
    "- 이름 조각 57곳에는 같은 것을 소문자로 가리키는 해 작은 것(the lodge → [Hickman's Lodge])도 섞여 있음 — 오도가 분명한 것은 다른 곳 · 다른 이름이 뜨는 것(d059 · d011 · d027 · d184 [New …] · d004 [South America] · d089 [National Air and Space Museum] · d095 [San Francisco] · d110 [Great Britain] · d066 [Soap Company] · d058 · d032 · d035 · d167 · d166 등).",
    "- 남는 수 번짐 · 이름 조각은 힌트 글보다 앱 칩 맞춤 규칙(LdLearningView pickHintsFor · 기대값 expectations.cjs hintsForSentence)을 고치는 편이 한꺼번에 풀림: ① 수가 든 칩은 그 수가 문장에 있을 때만 ② 대문자 낱말은 문장에 대문자 낱말 머리로 있을 때만 ③ 수는 기호를 지우지 말고 견줌(d030 — '$4.95' 와 '495' 가 같은 글자로 겨뤄 두 금액 칩이 두 문장에 다 뜸 · 힌트 글로는 못 막음). 바꾸면 이 도구로 0 을 확인하고, 안전장치가 새로 켜지는 문장이 없는지 봄.");
}
if (waiting.length) T.push("", "## 확인 대기", "", waiting.map((w) => `- ${w.chunk} ${w.id}`).join("\n"));
if (notDone.length) T.push("", "## 끝나지 않은 것", "", notDone.map((n) => `- ${n}`).join("\n"));
T.push("", "이 다시 보기는 글을 고친 세션과 다른 세션이 했지만 같은 AI 계열입니다. 독립적인 검토가 아닙니다.", "");
fs.writeFileSync(path.join(OUT, "결과.md"), T.join("\n"));
console.log(JSON.stringify({ 셈: count, 확인: { 같음: agreed, 뒤집음: flipped }, 문제: bad.length, "줄 문제 지금": stateCount(rb), "칩 문제 지금": stateCount(cb), "칩 갈래": { "고침 탓": cb.filter((b) => b.kindOf === "고침 탓").map((b) => b.id).join(" "), 전부터: cb.filter((b) => b.kindOf === "전부터").map((b) => b.id).join(" ") }, 대기: waiting.length, 끝나지않음: notDone }, null, 1));
if (STRICT && (waiting.length || notDone.length)) { console.error(`--strict: 대기 ${waiting.length} · 끝나지 않음 ${notDone.length}`); process.exit(1); }
