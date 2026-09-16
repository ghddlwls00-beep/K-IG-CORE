#!/usr/bin/env node
/**
 * Find LISTENING sentences whose English says something the Korean does not.
 *
 *   node docs/qa-2026-09-15/scripts/find-ld-mistranslations.cjs
 *
 * Read-only. Writes a review table to evidence/.
 *
 * WHAT THIS IS NOT MEASURING. The dictation step is self-consistent: the site
 * plays Ava reading these very sentences, so a learner who types what they hear
 * is marked correct. Nothing is broken about the grading. What is at stake is
 * the sentence itself — it sits next to the Korean on screen, and a learner
 * reads the pair as a translation. Where the two disagree, the learner memorises
 * an English sentence that does not mean the Korean beside it.
 *
 * HOW A DISAGREEMENT IS FOUND. Two independent signals, because either alone
 * is noisy:
 *
 *   1. Content words in the Korean that have no counterpart in the English.
 *      Proper nouns and loanwords transliterate predictably (폴튜갈어 →
 *      Portuguese), and numbers carry across, so a Korean term whose English
 *      equivalent is absent is worth a look.
 *   2. The recording. It is the authentic English, so where the shipped
 *      sentence diverges from the transcript AND from the Korean, the shipped
 *      sentence is the odd one out — that is a mistranslation rather than a
 *      paraphrase.
 *
 * A row is reported only when BOTH point the same way. "did" for "conducted" is
 * a paraphrase and stays out; "grew up" where the Korean says "French" does not.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-mistranslations.md");

const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const transcripts = JSON.parse(fs.readFileSync(path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json"), "utf8"));

/**
 * Korean terms whose English the textbook uses, so "the English is missing this
 * idea" can be asked of a word rather than a whole sentence. Built from the
 * corpus rather than a dictionary: these are the words that actually appear.
 */
const KO_EN = [
  ["불어", ["french"]], ["프랑스", ["french", "france"]], ["폴튜갈", ["portuguese"]],
  ["포르투갈", ["portuguese"]], ["영어", ["english"]], ["독일", ["german", "germany"]],
  ["스페인", ["spanish", "spain"]], ["일본", ["japan", "japanese"]], ["중국", ["china", "chinese"]],
  ["한국", ["korea", "korean"]], ["이태리", ["italian", "italy"]], ["러시아", ["russia", "russian"]],
  ["아프리카", ["africa", "african"]], ["유럽", ["europe", "european"]],
  ["의사", ["doctor", "physician"]], ["간호사", ["nurse"]], ["변호사", ["lawyer", "attorney"]],
  ["선생", ["teacher"]], ["교수", ["professor"]], ["학생", ["student"]], ["경찰", ["police"]],
  ["농부", ["farmer"]], ["과학자", ["scientist"]], ["기술자", ["engineer"]], ["비서", ["secretary"]],
  ["아버지", ["father", "dad"]], ["어머니", ["mother", "mom"]], ["할머니", ["grandmother", "grandma"]],
  ["할아버지", ["grandfather", "grandpa"]], ["누이", ["sister"]], ["언니", ["sister"]],
  ["형제", ["brother"]], ["남편", ["husband"]], ["아내", ["wife"]], ["딸", ["daughter"]],
  ["아들", ["son"]], ["친구", ["friend"]],
  ["병원", ["hospital"]], ["학교", ["school"]], ["대학", ["university", "college"]],
  ["도서관", ["library"]], ["식당", ["restaurant"]], ["은행", ["bank"]], ["공항", ["airport"]],
  ["기차", ["train"]], ["비행기", ["plane", "airplane", "flight"]], ["자동차", ["car"]],
  ["사진", ["picture", "photo"]], ["편지", ["letter"]], ["신문", ["newspaper"]], ["책", ["book"]],
  ["아침", ["morning", "breakfast"]], ["저녁", ["evening", "dinner"]], ["점심", ["lunch", "noon"]],
  ["여름", ["summer"]], ["겨울", ["winter"]], ["가을", ["fall", "autumn"]], ["봄", ["spring"]],
  ["사자", ["lion"]], ["코끼리", ["elephant"]], ["개", ["dog"]], ["고양이", ["cat"]],
];

const low = (s) => String(s).toLowerCase();
const hasAny = (en, words) => words.some((w) => new RegExp(`\\b${w}`, "i").test(en));

const words = (s) => low(s).replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);
const STOP = new Set("a an the of to in on at and or but is are was were be been am i you he she it we they this that these those for with as his her their my your there here not no do does did have has had will would can could".split(" "));
const content = (s) => words(s).filter((w) => !STOP.has(w) && w.length > 2);

const rows = [];
for (const id of Object.keys(scripts).sort()) {
  const said = transcripts[id]?.text || "";
  const saidWords = new Set(content(said));
  for (const r of scripts[id] || []) {
    const en = String(r.en || ""), ko = String(r.ko || "");
    if (!en || !ko) continue;

    // Signal 1 — a Korean term the English does not render.
    const dropped = KO_EN.filter(([k, ens]) => ko.includes(k) && !hasAny(en, ens)).map(([k]) => k);
    if (!dropped.length) continue;

    // Signal 2 — the recording. If it carries the missing idea and the shipped
    // sentence does not, the shipped sentence is wrong rather than merely
    // worded differently.
    const backedByAudio = dropped.filter(([]) => true).some((k) => {
      const ens = KO_EN.find(([kk]) => kk === k)[1];
      return ens.some((w) => saidWords.has(w) || new RegExp(`\\b${w}`, "i").test(said));
    });
    if (!backedByAudio) continue;

    rows.push({ id, n: r.n, ko, en, dropped, said });
  }
}

console.log(`검사한 문장 : ${Object.values(scripts).reduce((a, b) => a + b.length, 0)}`);
console.log(`뜻이 빠진 문장 : ${rows.length}  (${new Set(rows.map((r) => r.id)).size}개 레슨)\n`);
const byWord = {};
for (const r of rows) for (const d of r.dropped) byWord[d] = (byWord[d] || 0) + 1;
for (const [w, n] of Object.entries(byWord).sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  console.log(`  "${w}" 가 영어에 없음 : ${n}건`);
}
console.log("\n예시 5건");
for (const r of rows.slice(0, 5)) {
  console.log(`\n  ${r.id} #${r.n}   빠진 것: ${r.dropped.join(", ")}`);
  console.log(`    한국어 : ${r.ko.slice(0, 80)}`);
  console.log(`    현재   : ${r.en.slice(0, 80)}`);
}

const esc = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const L = ["# LISTENING — 한국어에 있는데 영어에 없는 뜻", "",
  "> 판정 기준 두 가지를 **모두** 만족한 문장만 올렸습니다.",
  "> ① 한국어에 있는 낱말이 영어에 없음  ② 원본 녹음에는 그 뜻이 있음",
  "> 표현만 다른 것(did / conducted)은 제외했습니다.", "",
  `문장 ${rows.length}건 · ${new Set(rows.map((r) => r.id)).size}개 레슨`, "",
  "| 레슨 | # | 빠진 뜻 | 교재 한국어 | 현재 영어 | 원본 녹음 |", "|---|---|---|---|---|---|"];
for (const r of rows) {
  L.push(`| ${r.id} | ${r.n} | ${r.dropped.join(", ")} | ${esc(r.ko)} | ${esc(r.en)} | ${esc(r.said.slice(0, 300))} |`);
}
fs.writeFileSync(OUT, L.join("\n"), "utf8");
console.log(`\n→ ${path.relative(ROOT, OUT)}`);
