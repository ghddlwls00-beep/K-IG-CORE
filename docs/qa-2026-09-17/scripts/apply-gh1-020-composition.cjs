#!/usr/bin/env node
/**
 * GRAMMAR I 07강 (gh1-020 / gh1-021), second pass — owner, after seeing the first fix live:
 * "grammar1 7강 여전히 다른 grammar들이랑 학습법이 달라". apply-gh1-020-theory.cjs added 17
 * example sentences and a separate concept-check screen; every other GRAMMAR lesson teaches
 * with the same four steps (영작 훈련 → 빈칸 완성 → 구문 각인 → 종합 평가) over Korean prompts
 * and English answers. This lesson now does too: 24 sentences, three per grammar question
 * (be-verb statement, 이다/있다, am, is, are, negative, question, negative question), numbered
 * 1–24 like the other lessons. The eight Q&A stay in the lesson as a folded rule summary above
 * the steps (GrammarLearningView), not as a different method.
 *   node apply-gh1-020-composition.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");

const SENTENCES = [
  ["나는 소년이다.", "I am a boy."],
  ["그녀는 선생님이다.", "She is a teacher."],
  ["그들은 내 친구들이다.", "They are my friends."],
  ["나는 학생이다.", "I am a student."],
  ["그 책은 책상 위에 있다.", "The book is on the desk."],
  ["우리 부모님은 집에 계신다.", "My parents are at home."],
  ["나는 의사이다.", "I am a doctor."],
  ["나는 내 방에 있다.", "I am in my room."],
  ["나는 한국 출신이다.", "I am from Korea."],
  ["그는 내 친구이다.", "He is my friend."],
  ["이것은 펜이다.", "This is a pen."],
  ["그것은 고양이다.", "It is a cat."],
  ["우리는 학생이다.", "We are students."],
  ["저것들은 사과이다.", "Those are apples."],
  ["너는 친절하다.", "You are kind."],
  ["나는 소년이 아니다.", "I am not a boy."],
  ["그들은 의사가 아니다.", "They are not doctors."],
  ["그녀는 학교에 있지 않다.", "She is not at school."],
  ["너는 학생이니?", "Are you a student?"],
  ["그녀는 간호사이니?", "Is she a nurse?"],
  ["이것은 네 가방이니?", "Is this your bag?"],
  ["그는 선생님이 아니니?", "Isn't he a teacher?"],
  ["그들은 네 친구들이 아니니?", "Aren't they your friends?"],
  ["나는 네 친구가 아니니?", "Aren't I your friend?"],
];
const PREVIOUS_FIRST = { "gh1-020": "나는 소년이다.", "gh1-021": "I am a boy." };

function edit(id, lang) {
  const file = path.join(REPO, "content/lessons/grammar1", `${id}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const indent = (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
  const crlf = raw.includes("\r\n");
  const ser = (d) => { let s = JSON.stringify(d, null, indent); if (crlf) s = s.replace(/\n/g, "\r\n"); return /\r?\n$/.test(raw) ? s + (crlf ? "\r\n" : "\n") : s; };
  if (ser(data) !== raw) throw new Error(`${id}: format not reproducible`);
  const block = data.blocks.find((b) => b.type === "sentences");
  if (!block || block.items.length !== 17 || block.items[0].n !== "1-1" || block.items[0].text !== PREVIOUS_FIRST[id]) {
    throw new Error(`${id}: sentences block is not the 17 examples of apply-gh1-020-theory.cjs`);
  }
  block.items = SENTENCES.map(([ko, en], i) => ({ n: String(i + 1), text: lang === "en" ? en : ko }));
  return [file, ser(data)];
}

const writes = [edit("gh1-020", "ko"), edit("gh1-021", "en")];
if (!DRY) for (const [file, out] of writes) fs.writeFileSync(file, out);
console.log(`gh1-020 (Korean prompts) / gh1-021 (English answers): ${SENTENCES.length} composition sentences — ${DRY ? "checked (--dry-run)" : "written"}`);
