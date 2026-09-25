// 최종 관문 — 관문 0 기록(out/features/<과정>-g0-<화면>-<i>of<n>(-r<k>).jsonl, 관문 15 다시 돈 것 -g15-…)만으로 관문 0 · 5 · 9 · 10 숫자.
// 옛 기록은 읽지 않는다(파일 이름 규칙으로만 고름). 강의 × 화면마다 가장 늦은 기록 하나로 센다(build-coverage ② 와 같은 원리).
//   node gate-count.cjs [--deploy 2026-09-24T06:09:22Z] [--json out.json]
const fs = require("fs");
const path = require("path");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const FEAT = path.join(REPO, "docs/qa-2026-09-18/out/features");
const E = require(path.join(REPO, "docs/qa-2026-09-18/scripts/lib/expectations.cjs"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const DEPLOY = new Date(arg("--deploy", "2026-09-24T06:09:22Z"));
// 관문 15 배포(두 번째): --deploy2 <ISO> --changed <expect-diff-deploy.json> 이면, 그 배포로 기대 글이 바뀐 쪽 · 코드가 바뀐 과정(ld · phonics · grammar1 · grammar2)
// 전부의 '가장 늦은 기록' 이 그 배포 뒤여야 한다(아니면 옛 판을 본 기록) — 수를 따로 셈.
const DEPLOY2 = arg("--deploy2", null) ? new Date(arg("--deploy2", null)) : null;
const CHANGED2 = arg("--changed", null) ? JSON.parse(fs.readFileSync(arg("--changed", null), "utf8")).out : null;
const CODE_CHANGED = new Set(["ld", "phonics", "grammar1", "grammar2"]);
// 관문 15 둘째 배포(2026-09-25, bf3f4b6 — 소유자 결정): --deploy3 <ISO> --changed3 <expect-diff-deploy3.json>. 바뀐 것과 다시 볼 곳:
//   LdLearningView 칩 규칙(f2f21f2) → LISTENING 전부 × 3화면(스윕 --ld-last 로 이 배포 뒤에만 돎) · 기대 글이 바뀐 쪽(changed3 — ld 21쪽).
//   grammarGrading(af6a226, 채점만) → GRAMMAR 는 스윕을 다시 돌지 않고 채점을 전수로: --exam3 <check-grammar-exam --all-alts 결과> 가 그 배포 뒤 · 282쪽 · 문제 0 · 막힘 0.
//   STUDENT 제목 33칸(기대 글 밖 — changed3 student 0) → --titles3 <check-student-titles-live 결과> 가 그 배포 뒤 · 33칸 × 3화면 모두 통과.
//   (소유자: "배포 뒤 바뀐 쪽(제목 10강 · 과정 목록 · 듣기 · 문법 채점)은 다시 확인해")
const DEPLOY3 = arg("--deploy3", null) ? new Date(arg("--deploy3", null)) : null;
const CHANGED3 = arg("--changed3", null) ? JSON.parse(fs.readFileSync(arg("--changed3", null), "utf8")).out : null;
const CODE_CHANGED3 = new Set(["ld"]);
const readJson = (f) => (f && fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8").replace(/^﻿/, "")) : null);
const EXAM3 = readJson(arg("--exam3", null));
const TITLES3 = readJson(arg("--titles3", null));
// 세 번째 배포(소리 꼴 — 로마자 한국어 낱말 · d169 '1 1/2', 소유자 이 창 직접 '어 승인'): --deploy4 <ISO> --changed4 <expect-diff-deploy4.json>.
//   소리 글이 바뀐 44쪽(STUDENT 18 · GRAMMAR II 16 · READING 8 · LISTENING 2) × 3화면의 가장 늦은 기록이 그 배포 뒤여야.
//   (바뀐 코드는 쪽마다 표를 대는 것뿐 — 표 밖 쪽은 글 그대로라 다시 돌 까닭 없음. 표 밖에서 소리 글이 바뀐 쪽 0 은 compare-shared-code 로 잼.)
// --grading3 <grading-pages-latest.json>: 두 번째 배포의 채점 고침(af6a226)이 내놓는 값(점수)이 달라진 쪽 — compare-grading --base 1ef7d36 의 14 입력 · 11쪽 +
//   짝 · 딸린 쪽 = 30쪽. 관문 0 규칙(공용 코드는 바뀐 값의 쪽 목록 × 3화면)으로 그 배포 뒤 기록이어야(스윕은 채점을 판정하지 못하나 쪽이 뜨는지 · 소리 · 글은 봄).
const GRADING3 = readJson(arg("--grading3", null));
const DEPLOY4 = arg("--deploy4", null) ? new Date(arg("--deploy4", null)) : null;
const CHANGED4 = arg("--changed4", null) ? JSON.parse(fs.readFileSync(arg("--changed4", null), "utf8")).out : null;
const PROD = "https://k-ig-core.vercel.app";
const FILE_RE = /^(student|phonics|grammar1|grammar2|ld|reading)-g(0|15)-(desktop|tablet|mobile)-s?\d+of\d+(-r\d+)*\.jsonl$/;
const COURSES = ["student", "phonics", "grammar1", "grammar2", "ld", "reading"];
const VPS = ["desktop", "tablet", "mobile"];

// ---------------------------------------------------------------- 0. 파일 목록 · 날짜
const files = fs.readdirSync(FEAT).filter((f) => FILE_RE.test(f)).sort();
const fileRows = [];
const latest = new Map(); // course|id|viewport → record
let badLines = 0;
for (const f of files) {
  const lines = fs.readFileSync(path.join(FEAT, f), "utf8").split(/\r?\n/).filter((l) => l.trim());
  let min = null, max = null, before = 0, notProd = 0;
  const revs = new Set();
  for (const l of lines) {
    let r; try { r = JSON.parse(l); } catch { badLines++; continue; }
    const at = new Date(r.at);
    if (!min || at < min) min = at;
    if (!max || at > max) max = at;
    if (!(at > DEPLOY)) before++;
    if (r.base !== PROD) notProd++;
    revs.add(r.driverRev);
    const k = `${r.course}|${r.id}|${r.viewport}`;
    const prev = latest.get(k);
    if (!prev || new Date(prev.at) < at) latest.set(k, r);
  }
  const st = fs.statSync(path.join(FEAT, f));
  fileRows.push({ file: f, records: lines.length, first: min && min.toISOString(), last: max && max.toISOString(), created: st.birthtime.toISOString(), beforeDeploy: before, notProd, driverRev: [...revs].join(",") });
}

// ---------------------------------------------------------------- A. 전 쪽 × 3화면을 다 봤나
const coverage = {};
const notVisited = [];
for (const c of COURSES) {
  const pages = E.pages(c);
  coverage[c] = { pages: pages.length };
  for (const vp of VPS) {
    let n = 0;
    for (const p of pages) { if (latest.has(`${c}|${p.id}|${vp}`)) n++; else notVisited.push(`${c}/${p.id} ${vp}`); }
    coverage[c][vp] = n;
  }
}

// ---------------------------------------------------------------- 관문 15 배포 뒤 다시 돌아야 할 쪽
const redo = { need: 0, after: 0, before: [] };
if (DEPLOY2 && CHANGED2) {
  for (const c of COURSES) for (const p of E.pages(c)) {
    const must = CODE_CHANGED.has(c) || ((CHANGED2[c] && CHANGED2[c].changed) || []).includes(p.id);
    if (!must) continue;
    for (const vp of VPS) {
      redo.need++;
      const r = latest.get(`${c}|${p.id}|${vp}`);
      if (r && new Date(r.at) > DEPLOY2) redo.after++; else redo.before.push(`${c}/${p.id} ${vp}${r ? ` (${r.at})` : " (기록 없음)"}`);
    }
  }
}

// ---------------------------------------------------------------- 관문 15 둘째 배포 뒤 다시 볼 것
const redo3 = { need: 0, after: 0, before: [] };
const side3 = {};
if (DEPLOY3 && CHANGED3) {
  for (const c of COURSES) for (const p of E.pages(c)) {
    const must = CODE_CHANGED3.has(c) || ((CHANGED3[c] && CHANGED3[c].changed) || []).includes(p.id);
    if (!must) continue;
    for (const vp of VPS) {
      redo3.need++;
      const r = latest.get(`${c}|${p.id}|${vp}`);
      if (r && new Date(r.at) > DEPLOY3) redo3.after++; else redo3.before.push(`${c}/${p.id} ${vp}${r ? ` (${r.at})` : " (기록 없음)"}`);
    }
  }
  const gpages = E.pages("grammar1").length + E.pages("grammar2").length;
  side3.exam = EXAM3
    ? { at: EXAM3.at, afterDeploy: new Date(EXAM3.at) > DEPLOY3, prod: EXAM3.base === PROD, allAlts: !!EXAM3.allAlts, broken: !!EXAM3.broken, lessons: EXAM3.lessons, gpages, problems: (EXAM3.problems || []).length, blocked: (EXAM3.counts && EXAM3.counts.BLOCKED) || 0 }
    : null;
  if (side3.exam) side3.exam.pass = side3.exam.afterDeploy && side3.exam.prod && side3.exam.allAlts && !side3.exam.broken && side3.exam.lessons === gpages && side3.exam.problems === 0 && side3.exam.blocked === 0;
  side3.titles = TITLES3
    ? { at: TITLES3.at, afterDeploy: new Date(TITLES3.at) > DEPLOY3, prod: TITLES3.base === PROD, rows: TITLES3.rows.length, pass: TITLES3.rows.filter((r) => r.pass).length, viewports: (TITLES3.viewports || []).join(",") }
    : null;
  if (side3.titles) side3.titles.ok = side3.titles.afterDeploy && side3.titles.prod && side3.titles.viewports === "desktop,tablet,mobile" && side3.titles.rows === 99 && side3.titles.pass === 99;
}

const redoG = { need: 0, after: 0, before: [] };
if (DEPLOY3 && GRADING3) {
  for (const p of GRADING3.pages || []) for (const vp of VPS) {
    redoG.need++;
    const r = latest.get(`${p.course}|${p.id}|${vp}`);
    if (r && new Date(r.at) > DEPLOY3) redoG.after++; else redoG.before.push(`${p.course}/${p.id} ${vp}${r ? ` (${r.at})` : " (기록 없음)"}`);
  }
}
const redo4 = { need: 0, after: 0, before: [] };
if (DEPLOY4 && CHANGED4) {
  for (const c of COURSES) for (const id of (CHANGED4[c] && CHANGED4[c].changed) || []) for (const vp of VPS) {
    redo4.need++;
    const r = latest.get(`${c}|${id}|${vp}`);
    if (r && new Date(r.at) > DEPLOY4) redo4.after++; else redo4.before.push(`${c}/${id} ${vp}${r ? ` (${r.at})` : " (기록 없음)"}`);
  }
}

// ---------------------------------------------------------------- 5 · 9 · 10
const audio = { pressed: 0, byStatus: {}, nonPass: [] };
const net = { records: 0, withRequests: 0, noRequests: [], bad: [], failed: [], exceptions: [], console: [], visitErrors: [], truncatedBad: 0 };
const content = { records: 0, expected: 0, found: 0, missing: 0, rows: [], notSeenAtDepth: 0 };
const checks = {};
for (const r of latest.values()) {
  net.records++;
  const e = r.events || {};
  if (r.visitError) net.visitErrors.push(`${r.course}/${r.id} ${r.viewport}: ${String(r.visitError).slice(0, 120)}`);
  if ((e.requests || 0) > 0) net.withRequests++; else net.noRequests.push(`${r.course}/${r.id} ${r.viewport}`);
  if ((e.badResponses || []).length >= 10) net.truncatedBad++;
  for (const b of e.badResponses || []) net.bad.push({ where: `${r.course}/${r.id} ${r.viewport}`, status: b.status, url: b.url });
  for (const x of e.failed || []) net.failed.push(`${r.course}/${r.id} ${r.viewport}: ${JSON.stringify(x).slice(0, 160)}`);
  for (const x of e.exceptions || []) net.exceptions.push(`${r.course}/${r.id} ${r.viewport}: ${String(x).slice(0, 160)}`);
  for (const x of e.console || []) net.console.push(`${r.course}/${r.id} ${r.viewport}: ${String(x).slice(0, 160)}`);
  for (const a of r.audio || []) {
    audio.pressed++;
    audio.byStatus[a.status] = (audio.byStatus[a.status] || 0) + 1;
    if (a.status !== "PASS") audio.nonPass.push({ course: r.course, id: r.id, url: r.url, viewport: r.viewport, control: a.control, status: a.status, note: a.note });
  }
  for (const c of r.checks || []) { const k = `${r.course}|${c.feature}|${c.status}`; checks[k] = (checks[k] || 0) + 1; }
  if (r.content) {
    content.records++;
    content.expected += r.content.expected || 0;
    content.found += r.content.found || 0;
    content.missing += r.content.missingCount || 0;
    content.notSeenAtDepth += r.content.notSeenAtDepth || 0;
    for (const m of r.content.missing || []) content.rows.push({ course: r.course, id: r.id, viewport: r.viewport, text: m });
  }
}
const cls = (s) => (s >= 500 ? "5xx" : s >= 400 ? "4xx" : String(s));
const badBy = {};
for (const b of net.bad) { const k = `${cls(b.status)} ${b.status} ${String(b.url).replace(/^https?:\/\/[^/]+/, "").replace(/[?#].*$/, "").replace(/\/[^/]*$/, "/…")}`; badBy[k] = (badBy[k] || 0) + 1; }

// ---------------------------------------------------------------- 출력
const out = [];
const say = (s = "") => out.push(s);
say(`# 관문 0 기록 집계 — ${new Date().toISOString()} (마지막 배포 ${DEPLOY.toISOString()} 뒤 것만 셈)`);
say(`파일 ${files.length} · 읽기 실패 줄 ${badLines} · 강의×화면(가장 늦은 기록) ${latest.size}`);
say("\n## 관문 0 — 기록 파일 목록 (만든 날짜 · 첫 기록 · 마지막 기록 · 배포 전 기록 수 · 운영 아닌 것)");
say("| 파일 | 기록 | 파일 만든 때 | 첫 기록 | 마지막 기록 | 배포 전 | 운영 아님 | 드라이버 |");
say("|---|---|---|---|---|---|---|---|");
for (const f of fileRows) say(`| ${f.file} | ${f.records} | ${f.created} | ${f.first} | ${f.last} | ${f.beforeDeploy} | ${f.notProd} | ${f.driverRev} |`);
const allAfter = fileRows.every((f) => f.beforeDeploy === 0 && new Date(f.created) > DEPLOY);
say(`\n모든 파일 · 모든 기록이 배포 뒤: ${allAfter ? "예" : "**아니오**"} · 운영 아닌 기록 ${fileRows.reduce((a, f) => a + f.notProd, 0)}`);
say("\n## 전 쪽 × 3화면");
say("| 과정 | 쪽 | 데스크톱 | 태블릿 | 휴대폰 |");
say("|---|---|---|---|---|");
for (const c of COURSES) say(`| ${c} | ${coverage[c].pages} | ${coverage[c].desktop} | ${coverage[c].tablet} | ${coverage[c].mobile} |`);
const pagesAll = COURSES.reduce((a, c) => a + coverage[c].pages, 0);
say(`합: 강의×화면 ${latest.size} / ${pagesAll * 3} · 안 본 것 ${notVisited.length}${notVisited.length ? " — " + notVisited.slice(0, 30).join(", ") + (notVisited.length > 30 ? " …" : "") : ""}`);
if (DEPLOY2) say(`관문 15 배포(${DEPLOY2.toISOString()}) 뒤 다시 돌아야 할 강의×화면 ${redo.need} · 가장 늦은 기록이 그 배포 뒤 ${redo.after} · 아닌 것 ${redo.before.length}${redo.before.length ? " — " + redo.before.slice(0, 20).join(", ") + (redo.before.length > 20 ? " …" : "") : ""}`);
if (DEPLOY3) {
  say(`관문 15 둘째 배포(${DEPLOY3.toISOString()}) 뒤 다시 돌아야 할 강의×화면(LISTENING 전부 + 기대 글이 바뀐 쪽) ${redo3.need} · 그 배포 뒤 ${redo3.after} · 아닌 것 ${redo3.before.length}${redo3.before.length ? " — " + redo3.before.slice(0, 20).join(", ") + (redo3.before.length > 20 ? " …" : "") : ""}`);
  const e = side3.exam, t = side3.titles;
  say(`  GRAMMAR 채점(af6a226) — 시험 전수 ${e ? `${e.pass ? "통과" : "**불통과**"} (${e.at} · 배포 뒤 ${e.afterDeploy ? "예" : "아니오"} · 쪽 ${e.lessons}/${e.gpages} · 문제 ${e.problems} · 막힘 ${e.blocked}${e.broken ? " · 깨기 결과임" : ""})` : "**결과 파일 없음**"}`);
  say(`  STUDENT 제목 33칸 — 운영 3화면 ${t ? `${t.ok ? "통과" : "**불통과**"} (${t.at} · 배포 뒤 ${t.afterDeploy ? "예" : "아니오"} · ${t.pass}/${t.rows} · 화면 ${t.viewports})` : "**결과 파일 없음**"}`);
}
if (DEPLOY3 && GRADING3) say(`  채점이 바뀐 쪽(af6a226 — 짝 · 딸린 쪽 ${(GRADING3.pages || []).length}) × 3화면 ${redoG.need} · 그 배포 뒤 ${redoG.after} · 아닌 것 ${redoG.before.length}${redoG.before.length ? " — " + redoG.before.slice(0, 20).join(", ") + (redoG.before.length > 20 ? " …" : "") : ""}`);
if (DEPLOY4) say(`세 번째 배포(${DEPLOY4.toISOString()} — 소리 꼴) 뒤 다시 돌아야 할 강의×화면(소리 글이 바뀐 쪽) ${redo4.need} · 그 배포 뒤 ${redo4.after} · 아닌 것 ${redo4.before.length}${redo4.before.length ? " — " + redo4.before.slice(0, 20).join(", ") + (redo4.before.length > 20 ? " …" : "") : ""}`);
say("\n## 관문 5 — 음성");
say(`누른 횟수 ${audio.pressed} · 상태 ${JSON.stringify(audio.byStatus)}`);
const apg = {};
for (const a of audio.nonPass) { const k = `${a.course} · ${a.viewport} · ${a.status} · ${String(a.control).split(" ▶ ")[1] || a.control} · ${a.note}`.replace(/\d+/g, "#"); apg[k] = (apg[k] || 0) + 1; }
for (const [k, v] of Object.entries(apg).sort((a, b) => b[1] - a[1])) say(`  ${String(v).padStart(5)}  ${k}`);
say("\n## 관문 9 — 서버 응답");
say(`요청 기록이 있는 쪽 ${net.withRequests} / ${net.records} · 요청 기록 없는 쪽 ${net.noRequests.length}${net.noRequests.length ? " — " + net.noRequests.slice(0, 20).join(", ") : ""}`);
say(`4xx ${net.bad.filter((b) => b.status >= 400 && b.status < 500).length} · 5xx ${net.bad.filter((b) => b.status >= 500).length} · 그 밖 ${net.bad.filter((b) => !(b.status >= 400)).length} · 쪽당 10개 상한에 닿은 쪽 ${net.truncatedBad} · 요청 실패(연결) ${net.failed.length} · 예외 ${net.exceptions.length} · 콘솔 오류 ${net.console.length} · 방문 오류 ${net.visitErrors.length}`);
for (const [k, v] of Object.entries(badBy).sort((a, b) => b[1] - a[1])) say(`  ${String(v).padStart(5)}  ${k}`);
for (const x of [...net.failed, ...net.exceptions, ...net.console, ...net.visitErrors].slice(0, 40)) say(`  · ${x}`);
say("\n## 관문 10 — 화면 글자(새 검사)");
say(`기록 ${content.records} · 기대 ${content.expected} · 있음 ${content.found} · 없음 ${content.missing} · 깊이 탓에 못 본 것(notSeenAtDepth) ${content.notSeenAtDepth}`);
for (const m of content.rows.slice(0, 200)) say(`  - ${m.course}/${m.id} ${m.viewport}: ${String(m.text).slice(0, 140)}`);
say("\n## 기능 확인(과정 · 기능 · 상태) — PASS 아닌 것");
for (const [k, v] of Object.entries(checks).filter(([k]) => !k.endsWith("|PASS")).sort()) say(`  ${String(v).padStart(5)}  ${k}`);
console.log(out.join("\n"));
const J = arg("--json", null);
if (J) fs.writeFileSync(J, JSON.stringify({ at: new Date().toISOString(), deploy: DEPLOY.toISOString(), deploy2: DEPLOY2 && DEPLOY2.toISOString(), redo2: { need: redo.need, after: redo.after, before: redo.before.length }, deploy3: DEPLOY3 && DEPLOY3.toISOString(), redo3: { need: redo3.need, after: redo3.after, before: redo3.before.length }, side3, redoGrading3: { need: redoG.need, after: redoG.after, before: redoG.before.length }, deploy4: DEPLOY4 && DEPLOY4.toISOString(), redo4: { need: redo4.need, after: redo4.after, before: redo4.before.length }, files: fileRows, coverage, notVisited, audio, net: { ...net, badBy }, content, checks }, null, 1));
