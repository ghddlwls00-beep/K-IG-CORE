#!/usr/bin/env node
/**
 * Repair the garbled Korean in src/lib/readingSentences.json.
 *
 *   node docs/qa-2026-09-15/scripts/repair-reading-sentences.cjs           # 미리보기
 *   node docs/qa-2026-09-15/scripts/repair-reading-sentences.cjs --write
 *
 * This file feeds the READING study view (readingUtils → ReadingLearningView),
 * so a broken string here is on a paying student's screen. pr231's five Korean
 * sentences were written through a bad decode and read "뱀 怨↔ 瑜 泥 踰吏".
 * The replacement characters mean the original bytes are gone — the text cannot
 * be un-mangled — but content/lessons/reading/pr231.json holds the same five
 * sentences intact, so they are taken from there.
 *
 * The garbled copy was also OFF BY ONE from its English: the Korean in slot #3
 * was the second half of #2's sentence. So this does not repair strings in
 * place; it re-pairs each English sentence with the lesson's Korean by order,
 * and only when the counts match exactly.
 *
 * WHY ONLY pr231. Every Korean string in the file was tested for three
 * signatures of a bad decode: a replacement character, a "?" sitting directly
 * in front of a Hangul syllable, and a bare compatibility jamo. 1,446 sentences
 * were checked and 5 came back, all in this one lesson. A looser test — "does
 * this sentence appear in its own lesson file" — returned 68, but reading them
 * showed the extra 63 differ only in straight versus curly quotes and in line
 * breaks, which is formatting, not corruption.
 */
const fs = require("node:fs");
const path = require("node:path");

const WRITE = process.argv.includes("--write");
const ROOT = path.resolve(__dirname, "../../..");
const FILE = path.join(ROOT, "src/lib/readingSentences.json");
const RDIR = path.join(ROOT, "content/lessons/reading");

const source = fs.readFileSync(FILE, "utf8");
const data = JSON.parse(source);

/** The three shapes a correctly decoded Korean sentence never has. */
const isGarbled = (t) =>
  /�/.test(t) || /\?[가-힯]/.test(t) || /[ㄱ-ㆎ]/.test(t);

/** Korean strings long enough to be a sentence, in the order the lesson lists them. */
function lessonKorean(key) {
  const file = path.join(RDIR, `${key}.json`);
  if (!fs.existsSync(file)) return [];
  const found = [];
  (function walk(value) {
    if (typeof value === "string") {
      if (/[가-힯]/.test(value) && value.length > 25) found.push(value);
      return;
    }
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === "object") return Object.values(value).forEach(walk);
  })(JSON.parse(fs.readFileSync(file, "utf8")));
  // Drop the programme banner and the vocabulary-card labels, which are not
  // passage sentences: the banner starts with ":::" and every label ends in
  // "점)".
  return found.filter((t) => !t.startsWith(":::") && !/점\)$/.test(t));
}

let checked = 0;
const damaged = [];
for (const [key, list] of Object.entries(data)) {
  for (const s of list || []) {
    const ko = String(s.korean ?? "");
    if (!ko) continue;
    checked++;
    if (isGarbled(ko)) damaged.push(key);
  }
}
const lessons = [...new Set(damaged)];

console.log(`한글 문장 검사   : ${checked}`);
console.log(`깨진 문장        : ${damaged.length}   (레슨 ${lessons.length}개)`);

const fixes = [];
for (const key of lessons) {
  const rows = data[key];
  const korean = lessonKorean(key);
  if (korean.length !== rows.length) {
    console.error(
      `\n${key} : 영어 ${rows.length}문장인데 레슨 원본의 한글은 ${korean.length}문장입니다.\n` +
        "짝이 맞지 않으면 옮겨 붙이는 순간 순서가 어긋납니다. 아무것도 쓰지 않았습니다.",
    );
    process.exit(1);
  }
  rows.forEach((row, i) => {
    if (row.korean === korean[i]) return;
    fixes.push({ key, i, from: String(row.korean ?? ""), to: korean[i] });
    if (WRITE) row.korean = korean[i];
  });
}

console.log(`레슨 원본에서 복구 : ${fixes.length}\n`);
for (const f of fixes) {
  console.log(`${f.key} #${f.i}`);
  console.log(`  이전 : ${f.from.replace(/\n/g, " ").slice(0, 60)}`);
  console.log(`  이후 : ${f.to.slice(0, 60)}`);
}

if (WRITE && fixes.length) {
  const indent = (source.match(/\n( +)"/) || [, "  "])[1].length;
  const text = JSON.stringify(data, null, indent);
  fs.writeFileSync(FILE, source.endsWith("\n") ? `${text}\n` : text, "utf8");
  console.log(`\n✅ ${path.relative(ROOT, FILE)} 기록.`);
} else if (!WRITE) {
  console.log("\n--write 로 적용됩니다. 아무것도 쓰지 않았습니다.");
}
