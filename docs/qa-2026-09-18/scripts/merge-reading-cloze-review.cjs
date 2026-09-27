#!/usr/bin/env node
/**
 * READING 빈칸 '둘 다 맞는 보기' 검토 결과를 판정 기록에 합치고, 앱이 쓰는 제외 목록(src/lib/readingClozeFits.ts)을 다시 만든다.
 * 2026-09-27 (READING 학습법 · 화면 고침 — 계획 G02 확인 "탐침 '둘 다 맞음' 새로 0").
 *
 * 흐름: reading-cloze-probe.cjs --all --dump <묶음.json> [--unreviewed] 로 빈칸을 뽑아 검토자에게 주고, 검토자는 '맞는' 보기만
 * { "fits": [{ "lesson", "k", "answer", "option", "why" }] } 로 돌려준다. 이 스크립트는 묶음에 있던 짝 가운데 fits 에 없는 것을 '아님(no)',
 * 있는 것을 '맞음(fits)'으로 reading-cloze-review.json 에 적는다(이미 있는 판정은 두고, 맞음이 이김). 그리고 맞음 짝 전부를
 * 정답 → 낱말 목록으로 readingClozeFits.ts 에 쓴다 — 생성기는 그 짝을 보기에서 빼고 다음 후보를 넣으므로, 새로 들어간 보기는
 * 다시 --unreviewed 로 뽑아 검토한다(check-reading-cloze.cjs 가 판정 없는 짝이 0 이 될 때까지 실패).
 *
 *   node merge-reading-cloze-review.cjs --dump <묶음.json> --results <result-01.json,result-02.json,…> --round 1 [--who "…"]
 *   node merge-reading-cloze-review.cjs --regen      기록에서 readingClozeFits.ts 만 다시 만듦
 * 결과 파일의 fits 가 묶음에 없는 짝(오타)을 가리키면 멈추고 exit 1.
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const RECORD = path.join(__dirname, "reading-cloze-review.json");
const FITS_TS = path.join(REPO, "src/lib/readingClozeFits.ts");
const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);

const lc = (s) => String(s || "").trim().toLowerCase();
const record = fs.existsSync(RECORD)
  ? JSON.parse(fs.readFileSync(RECORD, "utf8"))
  : {
      about:
        "READING Step 3 빈칸(핵심어 · 강의 씨앗 — src/lib/readingUtils.ts clozeCandidates)의 보기마다 '정답 자리에 이 보기도 맞나' 판정. judged[강의][정답][보기] = fits | no. 생성기가 낼 수 있는 모든 빈칸의 모든 보기에 판정이 있어야 check-reading-cloze.cjs 가 통과한다.",
      rule:
        "fits = 보기를 넣은 문장이 문법에 맞고(품사 · 동사 꼴 · 수 일치 · a(n)) 뜻도 자연스러워 신중한 교사가 정답으로 받아 줄 만함. 문장만 보고 판단하되 이상하거나 모순이거나 뜻이 없으면 아님. 확신이 없으면 fits(잘못 막으면 보기 하나가 바뀔 뿐, 놓치면 맞게 고른 학습자가 틀림).",
      reviewers: "같은 AI 계열(Claude) 검토 일꾼 — 독립 검토 아님. 사람 표본 확인 전.",
      rounds: [],
      judged: {},
    };

function writeFitsTs() {
  const byAnswer = new Map();
  for (const answers of Object.values(record.judged)) {
    for (const [answer, options] of Object.entries(answers)) {
      for (const [option, verdict] of Object.entries(options)) {
        if (verdict !== "fits") continue;
        if (!byAnswer.has(answer)) byAnswer.set(answer, new Set());
        byAnswer.get(answer).add(option);
      }
    }
  }
  const keys = [...byAnswer.keys()].sort();
  const body = keys.map((k) => `  ${JSON.stringify(k)}: [${[...byAnswer.get(k)].sort().map((o) => JSON.stringify(o)).join(", ")}],`).join("\n");
  // 2026-09-27: the table is a course-wide list of the passages' key words (most of them paid) — server only; the lesson page
  // hands its view just that lesson's pairs (src/lib/readingClozeFitsForLesson.ts). The generated file keeps the guard line.
  const text = `import "server-only";

/**
 * READING 빈칸 — 검토에서 "이 보기도 빈칸에 맞다"고 판정한 짝(정답 → 그 자리에 또 맞는 낱말). 낱말만 있고 강의 글은 없다.
 * 만든 곳: docs/qa-2026-09-18/scripts/merge-reading-cloze-review.cjs ← reading-cloze-review.json(짝마다 판정 기록).
 * 손으로 고치지 않는다 — check-reading-cloze.cjs 가 기록과 생성기를 견준다.
 * 서버 전용(2026-09-27 유출 규칙): 과정 전체 핵심어 목록이라 브라우저에 보내지 않음 — 강의 쪽이 그 강의 짝만 넘김(readingClozeFitsForLesson.ts).
 */
export const CLOZE_ALSO_FITS_REVIEWED: Readonly<Record<string, readonly string[]>> = {${keys.length ? `\n${body}\n` : ""}};
`;
  fs.writeFileSync(FITS_TS, text);
  return { answers: keys.length, pairs: keys.reduce((n, k) => n + byAnswer.get(k).size, 0) };
}

if (argv.includes("--regen")) {
  const r = writeFitsTs();
  console.log(`readingClozeFits.ts — 정답 ${r.answers} · 짝 ${r.pairs}`);
  process.exit(0);
}

const dumpFile = arg("--dump", null);
const resultFiles = String(arg("--results", "")).split(",").map((s) => s.trim()).filter(Boolean);
const round = Number(arg("--round", 1));
if (!dumpFile || !resultFiles.length) {
  console.error("--dump <묶음.json> --results <a.json,b.json> 가 필요합니다");
  process.exit(2);
}

const dump = JSON.parse(fs.readFileSync(path.resolve(dumpFile), "utf8"));
const inDump = new Map(); // "lesson|answer|option" → true
let dumpItems = 0;
for (const L of dump) {
  for (const it of L.items) {
    dumpItems++;
    for (const o of it.others) inDump.set(`${L.lesson}|${lc(it.answer)}|${lc(o)}`, true);
  }
}

const fits = new Set();
const unknownRefs = [];
let reportedItems = 0, reportedOptions = 0;
for (const f of resultFiles) {
  const r = JSON.parse(fs.readFileSync(path.resolve(f), "utf8"));
  reportedItems += Number(r.items) || 0;
  reportedOptions += Number(r.options) || 0;
  for (const x of r.fits || []) {
    const key = `${x.lesson}|${lc(x.answer)}|${lc(x.option)}`;
    if (!inDump.has(key)) unknownRefs.push(`${path.basename(f)}: ${key}`);
    else fits.add(key);
  }
}
if (unknownRefs.length) {
  console.error(`결과가 묶음에 없는 짝을 가리킴 ${unknownRefs.length}:\n  ${unknownRefs.slice(0, 20).join("\n  ")}`);
  process.exit(1);
}
if (reportedItems !== dumpItems || reportedOptions !== inDump.size) {
  console.error(`검토자가 센 수가 묶음과 다름: 문항 ${reportedItems} / ${dumpItems} · 보기 ${reportedOptions} / ${inDump.size}`);
  process.exit(1);
}

let added = 0, changedToFits = 0;
for (const key of inDump.keys()) {
  const [lesson, answer, option] = key.split("|");
  record.judged[lesson] = record.judged[lesson] || {};
  record.judged[lesson][answer] = record.judged[lesson][answer] || {};
  const prev = record.judged[lesson][answer][option];
  const verdict = fits.has(key) ? "fits" : "no";
  if (prev === undefined) added++;
  if (prev === "no" && verdict === "fits") changedToFits++;
  record.judged[lesson][answer][option] = prev === "fits" ? "fits" : verdict;
}
record.rounds.push({ round, at: new Date().toISOString(), who: arg("--who", "같은 AI 계열 검토 일꾼"), items: dumpItems, options: inDump.size, fits: fits.size, newVerdicts: added });

// keep the file stable: lessons and answers sorted
const sorted = {};
for (const lesson of Object.keys(record.judged).sort()) {
  sorted[lesson] = {};
  for (const answer of Object.keys(record.judged[lesson]).sort()) {
    sorted[lesson][answer] = {};
    for (const option of Object.keys(record.judged[lesson][answer]).sort()) sorted[lesson][answer][option] = record.judged[lesson][answer][option];
  }
}
record.judged = sorted;
fs.writeFileSync(RECORD, JSON.stringify(record, null, 1) + "\n");
const r = writeFitsTs();
console.log(`${round}차: 문항 ${dumpItems} · 보기 ${inDump.size} · 맞음 ${fits.size} · 새 판정 ${added}${changedToFits ? ` · 아님→맞음 ${changedToFits}` : ""} → ${path.relative(REPO, RECORD)} · readingClozeFits.ts 정답 ${r.answers} · 짝 ${r.pairs}`);
