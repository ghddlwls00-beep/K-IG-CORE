#!/usr/bin/env node
/**
 * Per-round PASS/FAIL for the LISTENING content review.
 *
 * A round FAILS when (a) a finding row in content-review/listening.md names it,
 * (b) the recording-coverage check found a missing/extra sentence in it, or
 * (c) its Korean uses a non-standard loanword spelling (L-00b) or carries a
 * PDF line-break space inside a word (L-00c). Each round's reasons are listed.
 * Writes the table to content-review/listening-status.md.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const md = fs.readFileSync(path.join(__dirname, "../content-review/listening.md"), "utf8");
const scripts = JSON.parse(fs.readFileSync(path.join(REPO, "content/ld_english_scripts.json"), "utf8"));
const coverage = JSON.parse(fs.readFileSync(path.join(__dirname, "../out/content/listening-coverage.json"), "utf8"));

const reasons = {};
const add = (id, why) => ((reasons[id] ||= new Set()).add(why));

for (const line of md.split("\n")) {
  const m = line.match(/^\| (\*\*)?(L-\d+[a-z]?)/);
  if (!m) continue;
  if (/^L-00/.test(m[2])) continue; // course-wide rows are evaluated by pattern below
  for (const id of line.match(/d\d{3}/g) || []) add(id, m[2]);
}
for (const [id, v] of Object.entries(coverage)) {
  if (v.missing.length) add(id, `L-64 누락 ${v.missing.length}`);
  if (v.extra.length) add(id, `L-64 초과 ${v.extra.length}`);
}
const loan = /폴튜갈|폴투갈|불란서|와싱턴|구라파|폴랜드|이태리|개스|쥬스|디스코택|텔레비젼|놀웨이|오스트렐리아|쉬카고|알라스카|뉴올린즈|뉴 올린즈|샌프랜시스코|미쉬간|펜실바니아|컨서트|칼러|로케트|로켓트|스테디엄|헐리웃|퉤인/;
const pdfSpace = /[가-힣] (다|요|니다|습니다)[.,"”]/;
for (const [id, rows] of Object.entries(scripts)) {
  const ko = rows.map((r) => r.ko || "").join(" ");
  if (loan.test(ko)) add(id, "L-00b");
  if (pdfSpace.test(ko)) add(id, "L-00c");
}

const ids = Object.keys(scripts).sort();
const lines = ["# LISTENING — 회차별 상태 (276회)", "", "`scripts/status-listening.cjs` 가 생성. FAIL 사유는 listening.md 의 항목 ID.", "", "| 회차 | 페이지 | 상태 | 사유 |", "|---|---|---|---|"];
let pass = 0;
for (const id of ids) {
  const r = [...(reasons[id] || [])];
  if (!r.length) pass++;
  lines.push(`| ${id} | /ld/${id} · /ld/${id}-1 | ${r.length ? "FAIL" : "PASS"} | ${r.join(" ")} |`);
}
lines.splice(3, 0, `집계: PASS ${pass} · FAIL ${ids.length - pass} (회차 ${ids.length}, 레슨 페이지 ${ids.length * 2})`);
fs.writeFileSync(path.join(__dirname, "../content-review/listening-status.md"), lines.join("\n") + "\n");
const onlyLow = ids.filter((id) => (reasons[id] ? [...reasons[id]].every((x) => /L-00[bc]/.test(x)) : false)).length;
console.log(`rounds ${ids.length}: PASS ${pass}, FAIL ${ids.length - pass} (of which only loanword/PDF-spacing: ${onlyLow})`);
