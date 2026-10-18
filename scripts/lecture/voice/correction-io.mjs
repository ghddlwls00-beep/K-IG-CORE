#!/usr/bin/env node
/**
 * LECTURE voice — step E (글 검사) in and out, for the correctors (people or agents):
 *
 *   node scripts/lecture/voice/correction-io.mjs prepare --ids lm001,…|all
 *     → <voice>/<id>/correct.input.json: { id, title, pages: [abs path of each textbook page jpg], pieces: [{ i, start, end,
 *       heard }] } — `heard` is the Scribe transcript of that piece (segments.json words). Paid content: stays in .lecture-media.
 *
 *   node scripts/lecture/voice/correction-io.mjs apply --ids …|all
 *     ← <voice>/<id>/correct.output.json: { texts: [string per piece, same count], guesses: [{ i, heard, wrote, why }] }
 *     → <voice>/<id>/segments.edited.json (pieces with `text`), after checks: same count; no Latin-script word longer than
 *       2 letters that the textbook page cannot vouch for is invented out of nothing (warned, not refused); digits are
 *       refused (numbers must be written in Korean words — "182번째" was mis-read, 사장님 10-18).
 *
 * The rules the corrector follows are in CORRECTION_RULES below (also printed by `rules`).
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dirname, "..", "..", "..");
const VOICE = path.join(ROOT, ".lecture-media", "voice");
const MEDIA = path.join(ROOT, ".lecture-media", "audio", "lecture");
const [cmd, ...rest] = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = rest.indexOf(name);
  return i > -1 && rest[i + 1] ? rest[i + 1] : fallback;
};
const idsArg = arg("--ids", "");
const ids = idsArg === "all" ? fs.readdirSync(VOICE).filter((d) => /^l[mhbsa]\d{3}$/.test(d) && fs.existsSync(path.join(VOICE, d, "segments.json"))).sort() : idsArg.split(",").filter(Boolean);
// --part-size N (prepare): a long lecture (뼈대세우기 · 문장구조론 · 알파오메가: 20–35 min, 370–740 pieces, 2026-10-19) is
// corrected in parts of about N pieces by different correctors — `parts` [[from, to]…] in the input; each writes
// correct.output.p<k>.json { from, to, texts (to − from + 1), guesses }, and `apply` joins them.
const PART_SIZE = Number(arg("--part-size", 0)) || 0;

export const CORRECTION_RULES = `강의 받아쓰기 바로잡기 규칙 (사장님 2026-10-17·18 — 고등 82강이 기준)
1. 선생님이 말한 내용 그대로. 요약 · 새로 쓰기 · 설명 덧붙이기 금지.
2. 군말(어, 에, 음, 그…으)과 말더듬 · 같은 낱말 되풀이는 뺀다. 문장 안의 "그죠?" "자," 같은 말버릇은 둔다.
3. 선생님이 영어로 말한 것은 반드시 영어 철자로 쓴다 — 받아쓰기가 한글로 적었어도(아이엠→I am, 미세스 왓슨→Mrs. Watson, 퍼스트 네임→first name). 철자는 교재 쪽 그림의 지문 그대로(대소문자 · 문장부호 포함). 받아쓰기가 틀린 영어(earring→earrings, Another advice→any advice 등)도 지문으로 고친다. 선생님이 한국어로 말한 외래어는 한글 그대로.
4. 한국어는 문맥으로 고친다 — 잡음으로 잘못 들린 낱말만(도성 영어독해→고등영어 독해, 금사하다→검사하다, 가능합니다→불가능합니다(impossible 뜻) 등). 선생님이 실제로 그렇게 말했으면(예: '중학교 영어 독해') 그대로 둔다.
5. 숫자는 한글로 읽히는 대로 쓴다(182번째→백팔십이 번째, 5,000 dollars→five thousand dollars, 1번→일 번). 아라비아 숫자 금지.
6. 영어 낱말 뒤 한국어 토씨는 붙여 쓴다(that이, elegant는, get hold of를).
7. 정말 안 들려 추정한 곳은 guesses 에 { i, heard, wrote, why } 로 적는다. 아무 말도 없던 조각(군말뿐)은 "" 로.
8. 조각 수와 순서는 그대로 — texts 의 길이 = pieces 의 길이.
9. secondHearing 이 있으면(잡음 큰 강의) 같은 자리를 다른 도구가 따로 들은 것. 두 받아쓰기가 같으면 그대로 믿고, 다르면 교재 · 문맥으로 고르고, 그래도 모르면 guesses 에.`;

if (cmd === "rules") {
  console.log(CORRECTION_RULES);
} else if (cmd === "prepare") {
  for (const id of ids) {
    const seg = JSON.parse(fs.readFileSync(path.join(VOICE, id, "segments.json"), "utf8"));
    const lesson = JSON.parse(fs.readFileSync(path.join(ROOT, "content", "lessons", "lecture", `${id}.json`), "utf8"));
    const pages = (lesson.lecture.pages || []).map((p) => path.join(MEDIA, id, path.basename(p.src)));
    // the second hearing (OpenAI, noisy lectures — transcribe-openai.mjs): per group of pieces [from..to]
    const secondFile = path.join(VOICE, id, "second.json");
    const second = fs.existsSync(secondFile) ? JSON.parse(fs.readFileSync(secondFile, "utf8")).map(({ from, to, text }) => ({ from, to, text })) : null;
    const n = seg.pieces.length;
    const partCount = PART_SIZE && n > PART_SIZE * 1.3 ? Math.round(n / PART_SIZE) : 1;
    const parts = Array.from({ length: partCount }, (_, k) => [Math.round((k * n) / partCount), Math.round(((k + 1) * n) / partCount) - 1]);
    const input = { id, title: lesson.title, pages, rules: CORRECTION_RULES, ...(partCount > 1 ? { parts } : {}), pieces: seg.pieces.map((p, i) => ({ i, start: p.speechStart, end: p.speechEnd, heard: (p.words || []).join(" ") })), ...(second ? { secondHearing: second } : {}) };
    fs.writeFileSync(path.join(VOICE, id, "correct.input.json"), JSON.stringify(input, null, 1));
  }
  console.log(`prepared ${ids.length}`);
} else if (cmd === "apply") {
  let ok = 0;
  const problems = [];
  for (const id of ids) {
    const outFile = path.join(VOICE, id, "correct.output.json");
    const seg = JSON.parse(fs.readFileSync(path.join(VOICE, id, "segments.json"), "utf8"));
    const input = fs.existsSync(path.join(VOICE, id, "correct.input.json")) ? JSON.parse(fs.readFileSync(path.join(VOICE, id, "correct.input.json"), "utf8")) : {};
    if (input.parts) {
      // join the parts (each must cover exactly its range) into correct.output.json
      const texts = [], guesses = [];
      let bad = null;
      for (const [k, [from, to]] of input.parts.entries()) {
        const f = path.join(VOICE, id, `correct.output.p${k + 1}.json`);
        if (!fs.existsSync(f)) { bad = `no correct.output.p${k + 1}.json`; break; }
        const part = JSON.parse(fs.readFileSync(f, "utf8"));
        if (!Array.isArray(part.texts) || part.texts.length !== to - from + 1) { bad = `part ${k + 1}: texts ${part.texts?.length} ≠ ${to - from + 1}`; break; }
        texts.push(...part.texts);
        guesses.push(...(part.guesses || []));
      }
      if (bad) { problems.push(`${id}: ${bad}`); continue; }
      fs.writeFileSync(outFile, JSON.stringify({ texts, guesses }, null, 1));
    }
    if (!fs.existsSync(outFile)) { problems.push(`${id}: no correct.output.json`); continue; }
    const o = JSON.parse(fs.readFileSync(outFile, "utf8"));
    if (!Array.isArray(o.texts) || o.texts.length !== seg.pieces.length) { problems.push(`${id}: texts ${o.texts?.length} ≠ pieces ${seg.pieces.length}`); continue; }
    const digits = o.texts.map((t, i) => (/\d/.test(t) ? i : -1)).filter((i) => i >= 0);
    if (digits.length) { problems.push(`${id}: digits in pieces ${digits.join(",")} — write numbers in Korean words`); continue; }
    seg.pieces = seg.pieces.map((p, i) => ({ ...p, text: String(o.texts[i] || "").trim(), edited: true }));
    seg.editedBy = `corrector ${new Date().toISOString().slice(0, 10)} · guesses ${(o.guesses || []).length}`;
    seg.guesses = o.guesses || [];
    fs.writeFileSync(path.join(VOICE, id, "segments.edited.json"), JSON.stringify(seg, null, 1));
    ok++;
  }
  console.log(`applied ${ok}/${ids.length}`);
  for (const p of problems) console.log("  " + p);
  if (problems.length) process.exitCode = 1;
} else {
  console.log("usage: correction-io.mjs rules | prepare --ids … | apply --ids …");
}
