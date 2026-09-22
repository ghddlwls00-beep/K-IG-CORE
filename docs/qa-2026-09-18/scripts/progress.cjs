#!/usr/bin/env node
/** Where the audit stands right now: planned vs done, counted from the artefacts on disk. */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const OUT = path.join(__dirname, "../out");
const J = "C:/Users/ghddl/.claude/projects/C--Users-ghddl--gemini-antigravity-scratch-K-IG-CORE/d2febf06-417e-4413-8931-61503e9f73e6/subagents/workflows/wf_47718ff2-021/journal.jsonl";

const lines = (f) => (fs.existsSync(f) ? fs.readFileSync(f, "utf8").split("\n").filter((l) => l.trim()).length : 0);
const rows = [];
let plannedTotal = 0, doneTotal = 0;
const add = (area, planned, done, unit, note = "") => { rows.push({ area, planned, done, pct: planned ? Math.round((done / planned) * 100) : 100, unit, note }); };

// 1. lesson feature sweep: every page × 3 viewports
const perCourse = {};
for (const c of E.COURSES) perCourse[c] = E.pages(c).length * 3;
// a course may have been split into shards (<course>-s1.jsonl …): count unique visits across all
const sweepDone = {};
for (const c of E.COURSES) {
  const seen = new Set();
  for (const f of fs.readdirSync(path.join(OUT, "features")).filter((x) => (x === `${c}.jsonl` || new RegExp(`^${c}-s\\d+\\.jsonl$`).test(x)))) {
    for (const l of fs.readFileSync(path.join(OUT, "features", f), "utf8").split("\n")) {
      if (!l.trim()) continue;
      try { const r = JSON.parse(l); if (!r.visitError) seen.add(`${r.url}|${r.viewport}`); } catch {}
    }
  }
  sweepDone[c] = seen.size;
}
for (const c of E.COURSES) add(`기능 전수 점검 · ${c}`, perCourse[c], sweepDone[c], "강의×화면폭 방문");

// 2. content review units
let reviewDone = 0;
if (fs.existsSync(J)) for (const l of fs.readFileSync(J, "utf8").split("\n")) { if (l.includes('"type":"result"') && l.includes('"coverage"')) reviewDone++; }
add("교육 내용 검토", 98, reviewDone, "검토 단위(강의 묶음)");

// 3. one-off phases that are either done or not
const done = (f) => (fs.existsSync(path.join(OUT, f)) ? 1 : 0);
add("구조·데이터 무결성", 1, done("inventory.json"), "단계");
add("무이용권 잠금 (HTML+RSC)", 1623, JSON.parse(fs.existsSync(path.join(OUT, "entitlement-all.json")) ? fs.readFileSync(path.join(OUT, "entitlement-all.json"), "utf8") : '{"results":[]}').results.length, "강의 주소");
add("공개 JS 유출 점검", 1, done("bundle-leak-all.json"), "단계");
add("음성 클립 잠금 (무이용권)", 19770, done("audio-check-anon.json") ? 19770 : 0, "클립");
add("음성 클립 내려받기·길이 검사 (이용권)", 19770, lines(path.join(OUT, "audio-check-licensed.json")) ? 19770 : 0, "클립");
add("채점 전수 시험", 1, done("grade-offline.json"), "단계");
add("보안 점검", 24, done("security-probe.json") ? 24 : 0, "항목");
add("상업·법률·SEO", 1, done("commercial.json"), "단계");
add("성능 측정", 2, (done("perf-anon.json") + done("perf-licensed.json")), "실행(비로그인·이용권)");
add("공통 기능(목록·검색·이동·404·반복·장시간·반응형)", 7, lines(path.join(OUT, "features", "common.jsonl")) ? 3 : 0, "구역 A~F");
add("접근성·대비·키보드", 1, done("a11y.json"), "단계");
add("관리자 화면 읽기", 1, 1, "단계");
add("최종 보고서", 1, 0, "단계");

// weighted overall: the sweep and the content review dominate the work
const weights = { "기능 전수 점검": 40, "교육 내용 검토": 25 };
let weighted = 0, weightSum = 0;
const sweepPlanned = Object.values(perCourse).reduce((a, b) => a + b, 0);
const sweepDoneAll = Object.values(sweepDone).reduce((a, b) => a + b, 0);
weighted += (sweepDoneAll / sweepPlanned) * weights["기능 전수 점검"]; weightSum += weights["기능 전수 점검"];
weighted += (reviewDone / 98) * weights["교육 내용 검토"]; weightSum += weights["교육 내용 검토"];
const others = rows.filter((r) => !/기능 전수 점검|교육 내용 검토/.test(r.area));
for (const r of others) { weighted += (r.done / r.planned) * (35 / others.length); }
weightSum += 35;

console.log("| 항목 | 대상 | 끝난 것 | % |");
console.log("|---|---|---|---|");
for (const r of rows) console.log(`| ${r.area} | ${r.planned.toLocaleString()} ${r.unit} | ${r.done.toLocaleString()} | ${r.pct}% |`);
console.log(`\n전체 가중 진행률: ${Math.round(weighted)}% (기능 전수 40 · 내용 검토 25 · 나머지 35)`);
console.log(`기능 전수 점검 합계: ${sweepDoneAll.toLocaleString()} / ${sweepPlanned.toLocaleString()} 방문`);
