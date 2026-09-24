#!/usr/bin/env node
/**
 * LISTENING 대본(content/ld_english_scripts.json)을 커밋된 판(HEAD)과 문장별로 비교해,
 * 영어(en)가 바뀐 문장 = 새 음성 클립이 필요한 문장을 나열한다. 한국어(ko)만 바뀐 문장은 따로 센다
 * — LISTENING 은 한국어를 소리 내어 읽지 않으므로 클립과 무관하다.
 * 4·5단계 끝의 클립 생성 뒤, 여기 나온 영어 문장마다 클립이 생겼는지 대조하는 데 쓴다.
 *
 *   node ld-en-changes.cjs [--json]
 * HEAD 가 맞는 곳(7-1 n): 뜻이 '아직 커밋하지 않은 대본 변경' 이라 git HEAD 를 쓴다 — 고치기 전 판을 흉내 내는 대조군이 아님.
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const FILE = "content/ld_english_scripts.json";
const now = JSON.parse(fs.readFileSync(path.join(REPO, FILE), "utf8"));
const was = JSON.parse(execSync(`git show HEAD:${FILE}`, { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
const en = [], ko = [];
for (const [id, rows] of Object.entries(now)) {
  const before = new Map((was[id] || []).map((r) => [String(r.n), r]));
  for (const r of rows) {
    const b = before.get(String(r.n));
    if (!b) { en.push({ id, n: r.n, from: null, to: r.en }); continue; }
    if (b.en !== r.en) en.push({ id, n: r.n, from: b.en, to: r.en });
    else if (b.ko !== r.ko) ko.push({ id, n: r.n });
  }
}
/**
 * READING too: readingSentences[].english is what READING speaks (ReadingLearningView.tsx:421 and the
 * top player, page.tsx:454). The -1 page carries the same sentences, so only the main file is compared
 * (same text → same clip). Korean is never spoken in READING.
 */
const readingDir = path.join(REPO, "content/lessons/reading");
const changedReading = execSync("git diff --name-only -- content/lessons/reading", { cwd: REPO, encoding: "utf8" })
  .trim().split(/\r?\n/).filter((f) => /\/pr\d+\.json$/.test(f));
for (const f of changedReading) {
  const nowR = JSON.parse(fs.readFileSync(path.join(REPO, f), "utf8")).readingSentences || [];
  const wasR = new Map((JSON.parse(execSync(`git show HEAD:${f}`, { cwd: REPO, encoding: "utf8" })).readingSentences || []).map((s) => [s.id, s]));
  for (const s of nowR) {
    const b = wasR.get(s.id);
    const id = path.basename(f, ".json");
    if (!b || b.english !== s.english) en.push({ id, n: s.id, from: b ? b.english : null, to: s.english });
    else if (b.korean !== s.korean) ko.push({ id, n: s.id });
  }
}

if (process.argv.includes("--json")) { console.log(JSON.stringify({ en, ko }, null, 1)); process.exit(0); }
console.log(`영어가 바뀐 문장 (클립 필요) ${en.length}개 — LISTENING 대본 + READING readingSentences`);
for (const x of en) console.log(`  ${x.id} n=${x.n}: ${JSON.stringify(x.from)}\n${" ".repeat(x.id.length + String(x.n).length + 6)}→ ${JSON.stringify(x.to)}`);
console.log(`한국어만 바뀐 문장 (클립 무관) ${ko.length}개: ${ko.map((x) => `${x.id} n=${x.n}`).join(", ")}`);
