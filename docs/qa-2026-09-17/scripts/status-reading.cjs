#!/usr/bin/env node
/**
 * Per-passage status for the READING content review (256 passages, each served
 * as a main page and a script page -1).
 *
 * FAIL when a finding row in content-review/reading.md names the passage (R-xx or
 * RV-xx rows, any severity except Low), NOTE when only Low rows name it, plus the
 * mechanical checks: script-page vocabulary differs from main (R-00), placeholder
 * card meanings, duplicate passage (R-01).
 * Writes content-review/reading-status.md.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const md = fs.readFileSync(path.join(__dirname, "../content-review/reading.md"), "utf8");
const checks = JSON.parse(fs.readFileSync(path.join(__dirname, "../out/content/reading-checks.json"), "utf8"));

const fail = {};
const note = {};
const add = (bag, id, why) => ((bag[id] ||= new Set()).add(why));
for (const line of md.split("\n")) {
  const m = line.match(/^\|\s*(?:\*\*)?((?:R|RV)-\d{2})(?:\*\*)?\s*\|/);
  if (!m) continue;
  const low = /\|\s*Low\s*\|/.test(line) && !/\b(High|Medium)\b/.test(line);
  for (const pid of new Set(line.match(/pr\d{3}/g) || [])) add(low ? note : fail, pid, m[1]);
}
for (const k of Object.keys(checks)) {
  if (!/vocab main≠script page/.test(k)) continue;
  for (const where of checks[k]) add(fail, where.split(" ")[0], "R-00 스크립트 페이지 카드");
}
for (let u = 1; u <= 256; u++) {
  const id = `pr${String(u).padStart(3, "0")}`;
  const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/reading", `${id}.json`), "utf8"));
  const ph = (d.readingVocabulary || []).filter((v) => /\(핵심 어휘\)\s*$/.test(v.korean)).length;
  if (ph) add(fail, id, `자리표시 뜻 ${ph}`);
}
const rows = [];
let p = 0, n = 0, f = 0;
for (let u = 1; u <= 256; u++) {
  const id = `pr${String(u).padStart(3, "0")}`;
  const F = [...(fail[id] || [])];
  const N = [...(note[id] || [])];
  const status = F.length ? "FAIL" : N.length ? "NOTE" : "PASS";
  if (status === "FAIL") f++; else if (status === "NOTE") n++; else p++;
  rows.push(`| ${id} | /reading/${id} · /reading/${id}-1 | ${u <= 2 ? "무료" : "유료"} | ${status} | ${[...F, ...N].join(" ")} |`);
}
const out = ["# READING — 지문별 상태 (256개, 페이지 512)", "", "`scripts/status-reading.cjs` 가 생성. 사유는 `reading.md` 항목 ID.", `집계: PASS ${p} · NOTE(Low 만) ${n} · FAIL ${f}`, "", "| 지문 | 페이지 | 접근 | 상태 | 사유 |", "|---|---|---|---|---|", ...rows];
fs.writeFileSync(path.join(__dirname, "../content-review/reading-status.md"), out.join("\n") + "\n");
console.log(`READING passages 256: PASS ${p}, NOTE ${n}, FAIL ${f}`);
