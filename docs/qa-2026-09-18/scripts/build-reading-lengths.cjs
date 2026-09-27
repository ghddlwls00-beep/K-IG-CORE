#!/usr/bin/env node
/**
 * READING 목록의 글 길이 줄('76단어 · 5문장') — 계획 D35 나(2026-09-27, READING 학습법 · 화면 고침).
 *
 * 목록 쪽(/reading)은 누구나 보는 쪽이라 강의 글은 한 글자도 싣지 않고 숫자 둘만 싣는다. 숫자는 강의 쪽 화면과 같은 셈이다:
 * readingSentences 의 english 를 빈칸 하나로 이어 공백으로 나눈 낱말 수(ReadingLearningView wordCount) · 문장 수.
 * 이 스크립트가 src/lib/readingLengths.ts 를 만들고, --check 는 파일이 지금 데이터와 같은지 보고 다르면 exit 1.
 *
 *   node docs/qa-2026-09-18/scripts/build-reading-lengths.cjs          만들기(바뀐 것이 있을 때만 씀)
 *   node docs/qa-2026-09-18/scripts/build-reading-lengths.cjs --check  데이터와 같은가(다르면 exit 1)
 *   node docs/qa-2026-09-18/scripts/build-reading-lengths.cjs --check --break   깨기: 한 강의 숫자를 1 늘려 보고 FAIL 이 나는지
 */
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "../../..");
const LESSON_DIR = path.join(REPO, "content/lessons/reading");
const OUT = path.join(REPO, "src/lib/readingLengths.ts");
const CHECK = process.argv.includes("--check");
const BREAK = process.argv.includes("--break");

const ids = fs.readdirSync(LESSON_DIR).filter((f) => /^pr\d+\.json$/.test(f)).map((f) => f.replace(/\.json$/, "")).sort();
const lengths = {};
for (const id of ids) {
  const d = JSON.parse(fs.readFileSync(path.join(LESSON_DIR, `${id}.json`), "utf8"));
  const sentences = d.readingSentences || [];
  const words = sentences.map((s) => s.english).join(" ").trim().split(/\s+/).filter(Boolean).length;
  lengths[id] = [words, sentences.length];
}
if (BREAK) lengths[ids[0]] = [lengths[ids[0]][0] + 1, lengths[ids[0]][1]];

const body = ids.map((id) => `  ${id}: [${lengths[id][0]}, ${lengths[id][1]}],`).join("\n");
const text = `/**
 * READING 목록의 글 길이 — [낱말 수, 문장 수], 본 강의마다(계획 D35 나 · 2026-09-27). 숫자만 있다: 목록 쪽은 누구나 보는 쪽이라
 * 강의 글은 싣지 않는다. 만든 곳 docs/qa-2026-09-18/scripts/build-reading-lengths.cjs — readingSentences 를 고치면 다시 만들고,
 * --check 가 데이터와 다르면 실패한다. 손으로 고치지 않는다.
 */
export const READING_LENGTHS: Readonly<Record<string, readonly [number, number]>> = {
${body}
};
`;

if (CHECK) {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  const same = now === text;
  console.log(`${same ? "PASS" : "FAIL"}  src/lib/readingLengths.ts ${same ? "= 데이터" : "≠ 데이터 — 다시 만드세요"} · 강의 ${ids.length}${BREAK ? " (깨기: pr 첫 강의 낱말 수 +1)" : ""}`);
  process.exitCode = same ? 0 : 1;
} else {
  const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8").replace(/\r\n/g, "\n") : "";
  if (now !== text) fs.writeFileSync(OUT, text);
  const all = Object.values(lengths);
  console.log(`src/lib/readingLengths.ts ${now === text ? "그대로" : "씀"} · 강의 ${ids.length} · 낱말 ${Math.min(...all.map((x) => x[0]))}~${Math.max(...all.map((x) => x[0]))} · 문장 ${Math.min(...all.map((x) => x[1]))}~${Math.max(...all.map((x) => x[1]))}`);
}
