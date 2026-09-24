#!/usr/bin/env node
/**
 * 관문 15 고침 다시 보기(소유자 2026-09-25 04:0x "수정은 잘 된거겠지?" · "워크플로우로 돌려 이것도") — 기계로 딱 떨어지는 것.
 * 판: main 3e9687f(수정 세션 커밋 — 푸시 전). 그 판의 content · src/lib 를 git archive 로 스크래치에 풀어 그 판의 코드로 잰다. 읽기만.
 *  ① 결정 C: 채점 표 1,370문항의 '더할 다른 정답' 3,233 이 main 에서 만점인지(고칠 곳 파일마다) · 이 세션이 뺀 답(뺀 것 54)이 들어가지 않았는지
 *  ② 채점 코드 바뀜(unless · 반대말 접두어): 문법 2,431문항의 모범 답을 뜻이 반대가 되게 바꾼 변형(부정 넣기 · 빼기 · 접두어 떼기 · unless ↔ if)이
 *     전(HEAD 채점 · 5412468 참조)과 main(main 채점 · main 참조)에서 몇 점인지 — main 에서 만점 · 70점이 나오면 목록
 *  ③ 빗금 나누기 바뀜: 초등 · 듣기의 빗금 문장 전부를 전 · main 의 expandSlashAlternatives 로 — 달라진 문장 목록
 *  ④ 칩 규칙 바뀜: 듣기 276강의 문장마다 칩을 전(옛 규칙 · 2a80bba 힌트) · main(새 규칙 · main 힌트)으로 — 힌트 줄이 같은데 칩이 달라진 강의(규칙 탓)와 힌트 줄이 바뀐 강의(되살림 등)를 가름
 *   node 수정확인-기계.cjs [판]   → 전수/수정확인/기계.json · 요약 출력
 */
const fs = require("fs");
const path = require("path");
const { execFileSync, spawnSync } = require("child_process");
const WT = path.resolve(__dirname, "../../../../..");
const OUT = path.resolve(__dirname, "../수정확인");
const REV = String(execFileSync("git", ["rev-parse", process.argv[2] || "3e9687f21ab1eb915cc17e83fc7e7e922e201654"], { cwd: WT })).trim();
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const E = L.loadExpectations();
const Gb = L.loadTsModule("src/lib/grammarGrading.ts"); // 전(HEAD = 2a80bba 와 같은 코드)
const Ub = L.loadTsModule("src/lib/listeningUtils.ts");
// main 풀기
const SNAP = path.join(process.env.TEMP || "C:/Windows/Temp", `kig-snap-${REV.slice(0, 7)}`);
if (!fs.existsSync(path.join(SNAP, "src/lib/grammarGrading.ts"))) {
  fs.mkdirSync(SNAP, { recursive: true });
  const tar = path.join(SNAP, "..", `kig-snap-${REV.slice(0, 7)}.tar`);
  execFileSync("git", ["archive", "-o", tar, REV, "src/lib", "content"], { cwd: WT });
  spawnSync("tar", ["-xf", tar, "-C", SNAP]);
  fs.rmSync(tar, { force: true });
}
const ts = require(path.join(WT, "node_modules/typescript"));
const cache = new Map();
function load(file) {
  file = path.resolve(file);
  if (cache.has(file)) return cache.get(file).exports;
  if (file.endsWith(".json")) { const d = JSON.parse(fs.readFileSync(file, "utf8")); cache.set(file, { exports: d }); return d; }
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, resolveJsonModule: true } }).outputText;
  const m = { exports: {} }; cache.set(file, m);
  const dir = path.dirname(file);
  const req = (spec) => {
    if (spec === "server-only") return {};
    const p = spec.startsWith("@/") ? path.join(SNAP, "src", spec.slice(2)) : spec.startsWith(".") ? path.join(dir, spec) : null;
    if (!p) return require(spec);
    for (const c of [p, p + ".ts", p + ".tsx", path.join(p, "index.ts")]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return load(c);
    return load(p);
  };
  new Function("require", "module", "exports", "__filename", "__dirname", out)(req, m, m.exports, file, dir);
  return m.exports;
}
const Gm = load(path.join(SNAP, "src/lib/grammarGrading.ts"));
const Um = load(path.join(SNAP, "src/lib/listeningUtils.ts"));
const N = { exact: "만점", partial: "70점", incorrect: "0점" };
for (const [G, name] of [[Gb, "전"], [Gm, "main"]]) {
  if (G.gradeAgainstReferences("It is a triangle.", ["It is a triangle."]) !== "exact" || G.gradeAgainstReferences("It is a banana.", ["It is a triangle."]) !== "incorrect") { console.error(`도구 확인 실패(${name} 채점)`); process.exit(3); }
}
const cleanText = (t) => (t ? String(t).replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
const snapJson = new Map();
const mainFile = (rel) => { if (!snapJson.has(rel)) { const f = path.join(SNAP, rel); snapJson.set(rel, fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : null); } return snapJson.get(rel); };
const C = path.join(WT, "docs/qa-2026-09-18/내용-재검토/전수/채점");
const M = JSON.parse(fs.readFileSync(path.join(C, "문항.json"), "utf8"));
const byId = new Map(M.문항.map((x) => [x.id, x]));
// 문항의 main 참조 — 고칠 곳(where) 파일마다
function mainRefs(it) {
  const out = [];
  for (const w of it.where) {
    const m = /^(\S+?)\.json \.blocks\[(\d+)\]\.items\[(\d+)\] \(n=([^)]*)\)$/.exec(w);
    if (!m) { out.push({ w, err: "고칠 곳 꼴을 못 읽음" }); continue; }
    const course = it.course;
    const d = mainFile(`content/lessons/${course}/${m[1]}.json`);
    if (!d) { out.push({ w, err: "main 에 파일 없음" }); continue; }
    let item = d.blocks[+m[2]] && (d.blocks[+m[2]].items || [])[+m[3]];
    if (!item || String(item.n) !== m[4]) { item = null; for (const b of d.blocks) for (const x of b.items || []) if (String(x.n) === m[4] && !/[가-힣]/.test(x.text || "")) item = x; }
    if (!item) { out.push({ w, err: "main 에서 그 번호를 못 찾음" }); continue; }
    out.push({ w, refs: [item.text, ...(item.alternatives || [])].map(cleanText).filter(Boolean), alts: item.alternatives || [] });
  }
  return out;
}
const R = { 판: REV, 스냅: SNAP };
// ① 결정 C
{
  const J = JSON.parse(fs.readFileSync(path.join(C, "판정.json"), "utf8"));
  let rows = 0, cands = 0, exactAll = 0, fileChecks = 0, fileExact = 0;
  const fails = [];
  for (const r of J.표) {
    rows++;
    const it = byId.get(r.id);
    const mr = mainRefs(it);
    for (const c of r.더할것) {
      cands++;
      let allExact = true;
      for (const f of mr) {
        fileChecks++;
        if (f.err) { allExact = false; fails.push({ id: r.id, 답: c.답, 파일: f.w, 까닭: f.err }); continue; }
        const g = Gm.gradeAgainstReferences(c.답, f.refs);
        if (g === "exact") fileExact++; else { allExact = false; fails.push({ id: r.id, 답: c.답, 파일: f.w, 점수: N[g] }); }
      }
      if (allExact) exactAll++;
    }
  }
  // 뺀 답이 들어갔는가(글자 그대로 다른 정답에 있는가)
  const dropped = [];
  for (const d of J.뺀것) {
    const it = byId.get(d.id);
    for (const f of mainRefs(it)) if (!f.err && f.alts.some((a) => cleanText(a) === cleanText(d.답))) dropped.push({ id: d.id, 답: d.답, 파일: f.w, 뺀까닭: String(d.why).slice(0, 80) });
  }
  // He's got 위험: 틀린 'He is got …' 이 만점인가
  const gotRisk = [];
  for (const id of ["grammar1/gh1-010#7", "grammar1/gh1-054#7"]) for (const f of mainRefs(byId.get(id))) if (!f.err) { const t = id.endsWith("010#7") ? "He is got a dream." : "He is got a bicycle."; gotRisk.push({ id, 파일: f.w, 답: t, 점수: N[Gm.gradeAgainstReferences(t, f.refs)] }); }
  R.결정C = { 문항: rows, 다른정답: cands, 모든파일만점: exactAll, 파일마다검사: fileChecks, 파일마다만점: fileExact, 안된것: fails, 뺀답이들어감: dropped, HeIsGot: gotRisk };
  console.log(`① 결정 C: 문항 ${rows} · 다른 정답 ${cands} → 고칠 곳 파일 모두 만점 ${exactAll}/${cands} (파일마다 ${fileExact}/${fileChecks}) · 안 된 것 ${fails.length} · 이 세션이 뺀 답이 들어감 ${dropped.length} · 'He is got' → ${gotRisk.map((g) => g.점수).join("/")}`);
}
// ② 채점 코드 바뀜 — 뜻이 반대인 변형
{
  const AUX = /\b(am|is|are|was|were|can|could|will|would|should|must|may|might|do|does|did|have|has|had)\b/i;
  const NT = { "can't": "can", "won't": "will", "don't": "do", "doesn't": "does", "didn't": "did", "isn't": "is", "aren't": "are", "wasn't": "was", "weren't": "were", "haven't": "have", "hasn't": "has", "hadn't": "had", "couldn't": "could", "wouldn't": "would", "shouldn't": "should", "mustn't": "must", "cannot": "can" };
  const flips = (s) => {
    const v = [];
    const tagless = s.replace(/,\s*(?:is|are|was|were|do|does|did|can|could|will|would|should|have|has|had)(?:n't)?\s+(?:not\s+)?\w+\s*\?\s*$/i, "?"); // 꼬리 질문은 빼고 본문만
    const body = tagless === s ? s : tagless;
    const m1 = /\b(\w+n't|cannot)\b/i.exec(body);
    if (m1 && NT[m1[1].toLowerCase()]) v.push({ 종류: "부정 빼기", 답: body.replace(m1[1], NT[m1[1].toLowerCase()]) });
    else if (/\bnot\b/i.test(body)) v.push({ 종류: "부정 빼기", 답: body.replace(/\bnot\s+/i, "") });
    else if (/\bnever\b/i.test(body)) v.push({ 종류: "부정 빼기", 답: body.replace(/\bnever\s+/i, "") });
    else { const a = AUX.exec(body); if (a) v.push({ 종류: "부정 넣기", 답: body.replace(a[0], `${a[0]} not`) }); }
    for (const w of body.split(/\s+/)) { const m = /^(un|in|im|il|ir|dis|non)([a-z]{4,})([.,?!]*)$/i.exec(w); if (m) v.push({ 종류: "접두어 떼기", 답: body.replace(w, m[2] + m[3]) }); }
    if (/\bunless\b/i.test(body)) v.push({ 종류: "unless → if", 답: body.replace(/\bunless\b/i, (x) => (x[0] === "U" ? "If" : "if")) });
    return v;
  };
  const stat = {}, bad = [];
  let n = 0;
  for (const it of M.문항) {
    const mr = mainRefs(it).find((f) => !f.err);
    if (!mr) continue;
    for (const v of flips(mr.refs[0])) {
      if (mr.refs.some((r) => r.toLowerCase().replace(/[^a-z ]/g, "") === v.답.toLowerCase().replace(/[^a-z ]/g, ""))) continue; // 변형이 다른 정답과 같은 글이면 뺌(맞는 답)
      n++;
      const gb = Gb.gradeAgainstReferences(v.답, it.refs), gm = Gm.gradeAgainstReferences(v.답, mr.refs);
      const k = `${v.종류}: 전 ${N[gb]} → main ${N[gm]}`;
      stat[k] = (stat[k] || 0) + 1;
      if (gm !== "incorrect") bad.push({ id: it.id, ko: it.ko, 모범: mr.refs[0], 종류: v.종류, 답: v.답, 전: N[gb], main: N[gm] });
    }
  }
  R.채점코드 = { 변형: n, 전과main: stat, main에서점수받는뜻반대: bad };
  console.log(`② 채점 코드: 뜻 반대 변형 ${n} — ${Object.entries(stat).sort().map(([k, v]) => `${k} ${v}`).join(" · ")} · main 에서 0점이 아닌 것 ${bad.length}`);
}
// ③ 빗금 나누기
{
  const sents = [];
  for (const f of fs.readdirSync(path.join(SNAP, "content/lessons/student")).filter((f) => f.endsWith(".json"))) {
    const d = mainFile(`content/lessons/student/${f}`);
    for (const b of d.blocks || []) for (const x of b.items || []) if (typeof x.text === "string" && x.text.includes("/")) sents.push({ where: `student/${f.replace(".json", "")} #${x.n}`, text: x.text });
  }
  const sc = mainFile("content/ld_english_scripts.json");
  for (const [base, rows] of Object.entries(sc)) for (const r of rows) if (String(r.en || "").includes("/")) sents.push({ where: `ld/${base} n${r.n}`, text: r.en });
  const changed = [];
  for (const s of sents) {
    const a = JSON.stringify(Ub.expandSlashAlternatives(s.text)), b = JSON.stringify(Um.expandSlashAlternatives(s.text));
    const wa = JSON.stringify(Ub.generateWordBank(s.text).acceptedWordSequences), wb = JSON.stringify(Um.generateWordBank(s.text).acceptedWordSequences);
    if (a !== b || wa !== wb) changed.push({ where: s.where, text: s.text, 전: JSON.parse(a), main: JSON.parse(b) });
  }
  R.빗금 = { 빗금문장: sents.length, 달라진문장: changed };
  console.log(`③ 빗금: 초등 · 듣기 빗금 문장 ${sents.length} · 전과 main 이 다른 문장 ${changed.length}: ${changed.map((c) => c.where).join(" · ")}`);
}
// ④ 칩 규칙
{
  const OLD = (t) => String(t || "").split(/,(?!\d{3}(?!\d))|\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/[.,]+$/, "").trim()).filter((c, i, a) => c && a.indexOf(c) === i);
  const NEW = (t) => String(t || "").split(/,(?!\d{3}(?!\d))|(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))\.\s+|\.$|\s{2,}/).map((c) => c.trim().replace(/(?<!\b(?:Mrs?|Ms|Dr|St|Jr|Sr|Mt|Prof|[A-Z]))[.,]+$/, "").trim()).filter((c, i, a) => c && a.indexOf(c) === i);
  // 옮김 확인(앱 LdLearningView · main expectations.cjs 의 정규식을 글자 그대로 옮김). 줄 끝 'D.C.' 의 마침표는 '\.$' 나누기가 먹어 'D.C' 가 됨(앱도 같음 — 재어 봄),
  // 줄 가운데 'Washington D.C. dental office' 는 머리글자 뒤라 안 나뉘어 한 칩 — 이런 강의는 일꾼이 봄.
  if (JSON.stringify(NEW("Mrs. Watson. 4,000 dollars. Dr. William N. Green. Washington D.C.")) !== JSON.stringify(["Mrs. Watson", "4,000 dollars", "Dr. William N. Green", "Washington D.C"])) { console.error("새 칩 규칙 옮김 확인 실패"); process.exit(3); }
  const scB = L.jsonAt(L.HEAD, "content/ld_english_scripts.json"), scM = mainFile("content/ld_english_scripts.json");
  const ruleOnly = [], hintChanged = [];
  for (const base of Object.keys(scM).sort()) {
    const lb = L.jsonAt(L.HEAD, `content/lessons/ld/${base}.json`), lm = mainFile(`content/lessons/ld/${base}.json`);
    const hb = ((lb && lb.blocks) || []).find((b) => b.type === "hints"), hm = ((lm && lm.blocks) || []).find((b) => b.type === "hints");
    const tb = hb ? hb.text : "", tm = hm ? hm.text : "";
    const rowsB = scB[base] || [], rowsM = scM[base] || [];
    const chipsB = rowsB.map((r) => E.hintsForSentence(String(r.en || ""), OLD(tb)));
    const chipsM = rowsM.map((r) => E.hintsForSentence(String(r.en || ""), NEW(tm)));
    if (JSON.stringify(chipsB) === JSON.stringify(chipsM)) continue;
    const entry = { 강: base, 전힌트: tb, main힌트: tm, 문장: rowsM.map((r, i) => ({ n: r.n, en: r.en, 전: chipsB[i] || [], main: chipsM[i] || [] })).filter((x) => JSON.stringify(x.전) !== JSON.stringify(x.main)) };
    if (tb === tm) { entry.새규칙만 = rowsM.map((r) => E.hintsForSentence(String(r.en || ""), NEW(tb))).some((c, i) => JSON.stringify(c) !== JSON.stringify(chipsB[i])); ruleOnly.push(entry); } else hintChanged.push(entry);
  }
  R.칩 = { 규칙만바뀐강: ruleOnly, 힌트줄바뀐강: hintChanged.map((e) => ({ 강: e.강, 전힌트: e.전힌트, main힌트: e.main힌트, 달라진문장: e.문장.length })) };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "칩-힌트바뀐강.json"), JSON.stringify(hintChanged, null, 1));
  console.log(`④ 칩: 힌트 줄은 같은데 칩이 달라진 강(규칙 탓) ${ruleOnly.length} · 힌트 줄이 바뀐 강 ${hintChanged.length}(되살림 등 — 워크플로우 일꾼이 봄)`);
}
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "기계.json"), JSON.stringify(R, null, 1));
console.log(`→ 전수/수정확인/기계.json · 칩-힌트바뀐강.json`);
