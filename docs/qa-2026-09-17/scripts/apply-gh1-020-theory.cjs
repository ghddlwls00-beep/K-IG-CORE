#!/usr/bin/env node
/**
 * GRAMMAR I 07강 (gh1-020 문제 / gh1-021 답안) — owner report 2026-09-17: "오디오를 재생하면
 * 한국어가 나오고 아래 내용도 다 한국어". Every other GRAMMAR I lesson is Korean sentences to
 * translate + their English answers; this one is the textbook's "문법 확인 문제", eight Korean
 * questions about be-verb sentences with Korean answers and NO English at all. So the page's
 * voice read Korean, and the composition view (src/components/GrammarLearningView.tsx) showed the
 * questions as sentences to translate, with the Korean answer as the "영어 정답" — twice, because
 * it read the question page and the answer page one after the other (16 items).
 *
 * Data half of the fix: each question gets English example sentences (with Korean) that show the
 * rule it asks about — gh1-021 (answer page) holds the English, gh1-020 the Korean, in the same
 * order, as a `sentences` block like every other lesson (n = "question-example"). The page voice
 * then reads the English examples. The view half renders this lesson as a concept check.
 *   node apply-gh1-020-theory.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");

const EXAMPLES = [
  ["1-1", "I am a boy.", "나는 소년이다."],
  ["1-2", "She is a teacher.", "그녀는 선생님이다."],
  ["2-1", "I am a student.", "나는 학생이다."],
  ["2-2", "The book is on the desk.", "그 책은 책상 위에 있다."],
  ["3-1", "I am a doctor.", "나는 의사이다."],
  ["3-2", "I am in my room.", "나는 내 방에 있다."],
  ["4-1", "He is my friend.", "그는 내 친구이다."],
  ["4-2", "This is a pen.", "이것은 펜이다."],
  ["5-1", "We are students.", "우리는 학생이다."],
  ["5-2", "Those are apples.", "저것들은 사과이다."],
  ["6-1", "I am not a boy.", "나는 소년이 아니다."],
  ["6-2", "They are not doctors.", "그들은 의사가 아니다."],
  ["7-1", "Are you a student?", "너는 학생이니?"],
  ["7-2", "Is she a nurse?", "그녀는 간호사이니?"],
  ["8-1", "Isn't he a teacher?", "그는 선생님이 아니니?"],
  ["8-2", "Aren't they your friends?", "그들은 네 친구들이 아니니?"],
  ["8-3", "Aren't I your friend?", "나는 네 친구가 아니니?"],
];

function edit(id, lang) {
  const file = path.join(REPO, "content/lessons/grammar1", `${id}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
  const crlf = raw.includes("\r\n");
  const ser = (d) => { let s = JSON.stringify(d, null, indent); if (crlf) s = s.replace(/\n/g, "\r\n"); return /\r?\n$/.test(raw) ? s + (crlf ? "\r\n" : "\n") : s; };
  if (ser(data) !== raw) throw new Error(`${id}: format not reproducible`);
  if (data.blocks.some((b) => b.type === "sentences")) throw new Error(`${id}: already has a sentences block`);
  const questions = data.blocks.filter((b) => b.type === "instruction" && /^\(\d+\)/.test(b.text)).length;
  if (questions !== 8) throw new Error(`${id}: expected 8 questions, found ${questions}`);
  const at = data.blocks.findIndex((b) => b.type === "choice");
  if (at < 0) throw new Error(`${id}: no choice block`);
  const items = EXAMPLES.map(([n, en, ko]) => ({ n, text: lang === "en" ? en : ko }));
  data.blocks.splice(at, 0, { type: "sentences", items });
  return [file, ser(data)];
}

const writes = [edit("gh1-020", "ko"), edit("gh1-021", "en")];
if (!DRY) for (const [file, out] of writes) fs.writeFileSync(file, out);
console.log(`gh1-020 (Korean) / gh1-021 (English): ${EXAMPLES.length} example sentences for 8 questions — ${DRY ? "checked (--dry-run)" : "written"}`);
