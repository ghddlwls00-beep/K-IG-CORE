#!/usr/bin/env node
/**
 * 2026-09-18 감사의 content 검사가 과정마다 몇 강·몇 건을 "화면에 있음(PASS)" 으로 판정했는지 센다.
 * 음성 시험에서 가짜로 판명된 과정의 PASS 판정은 근거가 없어지므로, 무효가 되는 수를 숫자로
 * 적기 위한 것이다.
 *
 * 같은 강의·같은 화면 크기가 여러 번 기록돼 있으면 가장 늦은 기록 하나만 센다.
 * 판정 1건 = (강의, 화면 크기, 기대 글자 1개).
 *
 *   node count-content-verdicts.cjs
 */
const fs = require("fs");
const path = require("path");
const DIR = path.join(__dirname, "../out/features");

// 2026-09-18 감사 본 실행 파일 (재점검·시험 실행 제외)
const SOURCES = {
  phonics: ["phonics.jsonl"],
  grammar1: ["grammar1.jsonl"],
  grammar2: ["grammar2.jsonl"],
  student: ["student.jsonl", "student-tiles2.jsonl", "student-tiles3.jsonl"],
  reading: ["reading.jsonl"],
  ld: ["ld.jsonl", "ld-s1.jsonl", "ld-s2.jsonl", "ld-s3.jsonl", "ld-tiles2.jsonl"],
};

const E = require("./lib/expectations.cjs");
const rows = [];
for (const [course, files] of Object.entries(SOURCES)) {
  const byKey = new Map();
  for (const f of files) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").trim().split(/\r?\n/)) {
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (!r.content) continue;
      const k = `${r.url}|${r.viewport}`;
      const prev = byKey.get(k);
      if (!prev || new Date(r.at) > new Date(prev.at)) byKey.set(k, r);
    }
  }
  const recs = [...byKey.values()];
  const pages = new Set(recs.map((r) => r.url));
  const found = recs.reduce((s, r) => s + (r.content.found || 0), 0);
  const expected = recs.reduce((s, r) => s + (r.content.expected || 0), 0);
  // 기대 글자 종류별 PASS 수 — 지금의 기대값 정의로 다시 나눈다 (기록에는 missing 만 종류가 있다)
  const kinds = {};
  for (const r of recs) {
    let exp; try { exp = E.expected(course, r.id); } catch { continue; }
    const missing = new Set((r.content.missing || []).map((m) => String(m)));
    for (const t of exp.texts) {
      const miss = [...missing].some((m) => m.startsWith(`${t.kind}:`) && m.includes(t.text.slice(0, 40)));
      kinds[t.kind] = kinds[t.kind] || { pass: 0, miss: 0 };
      kinds[t.kind][miss ? "miss" : "pass"]++;
    }
  }
  rows.push({ course, files: files.filter((f) => fs.existsSync(path.join(DIR, f))), records: recs.length, pages: pages.size, expected, found, kinds });
}

/**
 * 종류별 칸은 **근사치**다 (3차 점검 지적, 2026-09-23). 기록에는 누락된 글자만 종류와 함께 남아 있고
 * 통과한 글자의 목록은 없어서, 오늘의 expectations.cjs 로 기대 글자를 다시 만들어 나눈다. 그 사이
 * 기대값 정의나 데이터가 바뀐 과정은 합이 기록과 어긋난다. 그래서
 *   - LISTENING 은 종류별 칸을 싣지 않는다 — 9/18 에는 없던 hint-chip 이 생기고, 대본 기대값의 출처도 바뀌었다.
 *   - 나머지는 종류별 합과 기록의 PASS 가 얼마나 어긋나는지 함께 적는다.
 * 과정별 머리 숫자(기대·PASS·누락)는 기록 자체의 expected/found 라 이 문제와 무관하다.
 */
for (const r of rows) {
  console.log(`${r.course.padEnd(9)} 강의 ${String(r.pages).padStart(5)} · 기록(강의×화면) ${String(r.records).padStart(5)} · 기대 ${String(r.expected).padStart(7)} · PASS ${String(r.found).padStart(7)} · 누락 ${String(r.expected - r.found).padStart(6)}   (${r.files.join(", ")})`);
  if (r.course === "ld") { console.log(`            (종류별 칸 없음 — 9/18 이후 기대값 정의가 바뀌어 다시 나눌 수 없음)`); continue; }
  const sum = Object.values(r.kinds).reduce((s, v) => s + v.pass, 0);
  console.log(`            종류별 PASS — 오늘 정의로 다시 나눈 근사치 (합 ${sum} · 기록 PASS 와 차이 ${sum - r.found})`);
  for (const [k, v] of Object.entries(r.kinds)) console.log(`            ~ ${k.padEnd(10)} PASS ${String(v.pass).padStart(7)} · 누락 ${String(v.miss).padStart(6)}`);
}

/**
 * 화면 크기별 · (GRAMMAR 는) 페이지 언어별 PASS 수. 음성 시험에서 가짜 PASS 가 한 화면 크기에서만
 * 난 과정(GRAMMAR I 영어 페이지·LISTENING 대본은 데스크톱만)은 그 칸만 무효가 되므로 따로 센다.
 * 기록에 남은 found/expected 를 그대로 쓴다 (기대값 정의가 바뀐 LISTENING 도 기록값은 정확하다).
 */
console.log(`\n=== 화면 크기별 PASS (기록값)`);
const split = {};
for (const [course, files] of Object.entries(SOURCES)) {
  const byKey = new Map();
  for (const f of files) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").trim().split(/\r?\n/)) {
      let r; try { r = JSON.parse(line); } catch { continue; }
      if (!r.content) continue;
      const k = `${r.url}|${r.viewport}`;
      const prev = byKey.get(k);
      if (!prev || new Date(r.at) > new Date(prev.at)) byKey.set(k, r);
    }
  }
  for (const r of byKey.values()) {
    let group = "";
    if (course.startsWith("grammar")) {
      let exp; try { exp = E.expected(course, r.id); } catch { exp = null; }
      group = exp && exp.texts.length && !/[가-힣]/.test(exp.texts[0].text) ? " 영어페이지" : " 한국어페이지";
    }
    if (course === "ld") group = /-1$/.test(r.id) ? " 대본" : " 본문";
    const k = `${course}${group}`;
    split[k] = split[k] || {};
    const s = (split[k][r.viewport] = split[k][r.viewport] || { pages: 0, pass: 0, expected: 0 });
    s.pages++; s.pass += r.content.found || 0; s.expected += r.content.expected || 0;
  }
}
for (const [k, byVp] of Object.entries(split)) {
  console.log(`  ${k.padEnd(20)} ${["desktop", "tablet", "mobile"].filter((v) => byVp[v]).map((v) => `${v} ${byVp[v].pages}강 PASS ${byVp[v].pass}/${byVp[v].expected}`).join("  |  ")}`);
}
fs.writeFileSync(path.join(__dirname, "../out/content-verdicts-0918-split.json"), JSON.stringify(split, null, 1));
fs.writeFileSync(path.join(__dirname, "../out/content-verdicts-0918.json"), JSON.stringify(rows, null, 1));
