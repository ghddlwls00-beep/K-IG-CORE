#!/usr/bin/env node
/**
 * Per-lesson status for the VOCA content review (content-review/voca.md).
 *
 * FAIL  — the lesson is named by a Medium/High finding (V-03…V-07 lesson-level
 *         items) or by a mechanical check that follows from the code
 *         (identical meanings, repeated word). V-01/V-02 withdrawn — see below.
 * NOTE  — only Low items (V-08 glosses, V-09 spelling of the Korean, V-10 is a
 *         repeat and counts as FAIL above).
 * PASS  — nothing found.
 * V-07 (single-sense glosses) is dictionary-wide; a lesson is marked NOTE when
 * it contains one of the words listed there.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dict = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const course = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/phonics.json"), "utf8"));
const dir = path.join(REPO, "content/lessons/phonics");

const V05 = new Set(["ancesto", "calender", "scissor", "livingroom", "technologic", '"insistence,-cy"']);
const V07 = new Set("number call train training poor since day old western break rest still study right left foot sentence source quality essential demand care consideration contact atmosphere".split(" "));
const V08 = new Set("emigrant immigrant migrant execute execution invention movement presently incidentally inclined refer resolve senior upset pretty prominent instrument pastime utensil".split(" "));
const V09 = new Set(["enrich", "tactful", "respectable", "notable", "credible", "disagree", "pebbles"]);

// Free list lives in src/lib/license.ts FREE_PREVIEW_LESSON_IDS (the course index has no flag).
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const phonicsFree = (licenseTs.match(/phonics:\s*\[([^\]]*)\]/) || [, ""])[1];
const free = new Set([...phonicsFree.matchAll(/"([a-z0-9-]+)"/g)].map((m) => m[1]));
void course;

const rows = [];
let pass = 0, fail = 0, note = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const grid = (d.blocks || []).find((b) => b.type === "wordgrid");
  const words = grid ? grid.rows.flat().map((w) => (w || "").trim()).filter(Boolean) : [];
  const failR = new Set();
  const noteR = new Set();
  const seen = new Set();
  const byMeaning = new Map();
  // V-01 / V-02 (quiz meaning ≠ card, capitalised words dropped from the quiz) were
  // WITHDRAWN on 2026-09-17: they modelled the quiz as `dict[word.toLowerCase()]` on the
  // full dictionary, but PhonicsLearningView passes the quiz its own map built with the
  // card lookup. The shipped code gives 0 / 0 over all 5,831 grid words
  // (verify-voca-quiz-meanings.cjs), and the audit's own production snapshot of mv2-12
  // shows "QUESTION #1 / 30".
  for (const w of words) {
    const lower = w.toLowerCase();
    const card = dict[w]?.meaning || dict[lower.replace(/[()"]/g, "").trim()]?.meaning;
    if (seen.has(lower)) failR.add(`V-03/V-10 중복 ${w}`);
    seen.add(lower);
    if (card) {
      if (!byMeaning.has(card)) byMeaning.set(card, new Set());
      byMeaning.get(card).add(lower);
    }
    if (V05.has(w)) failR.add(`V-05 ${w}`);
    if (lower === "apparently") failR.add("V-06 apparently");
    if (V07.has(lower)) noteR.add(`V-07 ${lower}`);
    if (V08.has(lower)) noteR.add(`V-08 ${lower}`);
    if (V09.has(lower)) noteR.add(`V-09 ${lower}`);
  }
  for (const [m, ws] of byMeaning) if (ws.size > 1) failR.add(`V-04 ${[...ws].join("/")}`);
  if (words.length !== 30) failR.add(`단어 ${words.length}칸`);
  const status = failR.size ? "FAIL" : noteR.size ? "NOTE" : "PASS";
  if (status === "FAIL") fail++; else if (status === "NOTE") note++; else pass++;
  rows.push(`| ${d.id} | /phonics/${d.id} | ${free.has(d.id) ? "무료" : "유료"} | ${words.length} | ${status} | ${[...failR, ...noteR].join(" · ")} |`);
}
const out = [
  "# VOCA — 레슨별 상태 (195개)",
  "",
  "`scripts/status-voca.cjs` 가 생성. 사유는 `voca.md` 의 항목 ID.",
  `집계: PASS ${pass} · NOTE(Low 만) ${note} · FAIL ${fail}`,
  "",
  "| 레슨 | 페이지 | 접근 | 단어 칸 | 상태 | 사유 |",
  "|---|---|---|---|---|---|",
  ...rows,
];
fs.writeFileSync(path.join(__dirname, "../content-review/voca-status.md"), out.join("\n") + "\n");
console.log(`VOCA lessons ${rows.length}: PASS ${pass}, NOTE ${note}, FAIL ${fail}; free lessons detected: ${[...free].join(", ") || "(none flagged in course index)"}`);
