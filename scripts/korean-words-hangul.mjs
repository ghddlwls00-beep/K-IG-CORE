#!/usr/bin/env node
/**
 * Korean words inside English, WRITTEN in Hangul — STUDENT and READING (2026-10-02, 사장님 "음성은 만든거 사용하고 이런 것들 표기는
 * 한국어로 다 변경하자" · "어 있는거 싹다 꼼꼼히 찾아서 다 작업해"). ADULT is written so by scripts/build-adult-content.mjs.
 *
 * The rows are src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES ([Hangul, romanization] per page). Speech reads the same rows
 * backwards (romanizedForm), so every sentence still SAYS exactly what its clip was made from — this script refuses to write a
 * sentence whose way back is not its old text letter for letter.
 *
 * GRAMMAR II and PASS-OFF GRAMMAR are not written over: there the learner writes the English, so the spelling stays and the
 * screen adds the Hangul after it — "Chuseok(추석)" (사장님 2026-10-02 "영어 표기 + 한글 덧붙임"; src/lib/koreanGloss.ts).
 *
 *   node scripts/korean-words-hangul.mjs          # write
 *   node scripts/korean-words-hangul.mjs --check  # exit 1 when a listed page still shows a romanized word, or a title is old
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const ROOT = process.cwd();
const CHECK = process.argv.includes("--check");
const require = createRequire(import.meta.url);
const ts = require(path.join(ROOT, "node_modules", "typescript"));
const loadTs = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(ROOT, rel), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", "require", js)(m, m.exports, require);
  return m.exports;
};
const { KOREAN_DISPLAY_PAGES, romanizedForm } = loadTs("src/lib/lessonSpeechForm.ts");

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
/** romanization → Hangul on one page (a word's first letter in either case — "Bulgogi is …" · "… is bulgogi.") */
function hangulForm(page, text) {
  const pairs = KOREAN_DISPLAY_PAGES[page];
  if (!pairs || typeof text !== "string") return text;
  const byRoman = new Map(pairs.map(([hangul, roman]) => [roman.toLowerCase(), hangul]));
  const alternatives = pairs
    .map(([, roman]) => roman)
    .sort((a, b) => b.length - a.length)
    .map((r) => `[${r[0].toUpperCase()}${r[0].toLowerCase()}]${esc(r.slice(1))}`)
    .join("|");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${alternatives})(?![A-Za-z0-9])`, "g"), (_m, before, roman) => `${before}${byRoman.get(roman.toLowerCase())}`);
}

/**
 * STUDENT titles that named a Korean word in romanization (the Korean title beside it already says it) — the lesson file's
 * title · menuLabel · instruction line and the course index. Old → new.
 */
const STUDENT_TITLES = {
  "s13-2": ["The Person I Respect the Most (Admiral Yi Sun-sin) (가장 존경하는 인물 (이순신 장군))", "The Person I Respect the Most (가장 존경하는 인물 (이순신 장군))", "13-2. The Person I Respect the Most (Admiral Yi Sun-sin)", "13-2. The Person I Respect the Most"],
  "s18-2": ["Lunar New Year's Day (Seollal) (설날과 차례)", "Lunar New Year's Day (설날과 차례)", "18-2. Lunar New Year's Day (Seollal)", "18-2. Lunar New Year's Day"],
  "s18-3": ["Harvest Moon Festival (Chuseok) (추석과 송편)", "Harvest Moon Festival (추석과 송편)", "18-3. Harvest Moon Festival (Chuseok)", "18-3. Harvest Moon Festival"],
  "s19-2": ["Traditional Clothing (Hanbok) (전통 의상 (한복))", "Traditional Clothing (전통 의상 (한복))", "19-2. Traditional Clothing (Hanbok)", "19-2. Traditional Clothing"],
  "s19-3": ["Traditional Food (Bulgogi) (전통 음식 (불고기))", "Traditional Food (전통 음식 (불고기))", "19-3. Traditional Food (Bulgogi)", "19-3. Traditional Food"],
  "s19-4": ["Our Language (Hangul) (우리말과 훈민정음 (한글))", "Our Language (우리말과 훈민정음 (한글))", "19-4. Our Language (Hangul)", "19-4. Our Language"],
  "s20-4": ["Historic City of Gyeongju (역사의 도시 경주)", "Historic City of 경주 (역사의 도시 경주)", "20-4. Historic City of Gyeongju", "20-4. Historic City of 경주"],
  "s20-5": ["Jeju Island and Mt. Halla (제주도와 한라산)", "제주도와 한라산", "20-5. Jeju Island and Mt. Halla", "20-5. 제주도와 한라산"],
};

const problems = [];
let changed = 0;
const files = new Map(); // file → object, written at the end

/** the file's own layout — its indent and whether it ends with a newline — so a rewrite changes only the text that changed */
const layouts = new Map();
function load(file) {
  if (!files.has(file)) {
    const raw = fs.readFileSync(file, "utf8").replace(/^﻿/, "").replace(/\r\n/g, "\n");
    layouts.set(file, { indent: (raw.split("\n")[1] || "").match(/^ */)[0].length || 2, newline: raw.endsWith("\n") });
    files.set(file, JSON.parse(raw));
  }
  return files.get(file);
}

/** One text field of a page: written in Hangul, and its way back must be the old text. */
function convert(page, text, where) {
  const written = hangulForm(page, text);
  if (written === text) return text;
  if (CHECK) {
    problems.push(`${where}: still romanized — "${text}"`);
    return text;
  }
  const back = romanizedForm(page, written);
  if (back !== text) {
    problems.push(`${where}: "${written}" reads back as "${back}", not "${text}"`);
    return text;
  }
  changed++;
  return written;
}

for (const page of Object.keys(KOREAN_DISPLAY_PAGES)) {
  const [course, id] = page.split("/");
  if (course === "adult") continue; // scripts/build-adult-content.mjs
  const file = path.join(ROOT, "content", "lessons", course, `${id}.json`);
  const lesson = load(file);
  if (course === "student") {
    for (const block of lesson.blocks) {
      if (block.type === "sentences") block.items.forEach((item, i) => (item.text = convert(page, item.text, `${page} #${i + 1}`)));
    }
  } else if (course === "reading") {
    (lesson.readingSentences || []).forEach((s, i) => (s.english = convert(page, s.english, `${page} sentence ${i + 1}`)));
    for (const block of lesson.blocks) if (block.type === "instruction") block.text = convert(page, block.text, `${page} passage`);
  } else {
    problems.push(`${page}: no rule for course ${course}`);
  }
}

// STUDENT titles — the lesson file and the course index
const index = load(path.join(ROOT, "content", "courses", "student.json"));
for (const [id, [oldTitle, newTitle, oldMenu, newMenu]] of Object.entries(STUDENT_TITLES)) {
  const lesson = load(path.join(ROOT, "content", "lessons", "student", `${id}.json`));
  const row = index.lessons.find((l) => l.id === id);
  for (const target of [lesson, row]) {
    if (target.title === oldTitle) {
      if (CHECK) problems.push(`${id}: old title "${oldTitle}"`);
      else (target.title = newTitle), changed++;
    } else if (target.title !== newTitle) problems.push(`${id}: title is neither old nor new — "${target.title}"`);
    if (target.menuLabel === oldMenu) {
      if (CHECK) problems.push(`${id}: old menu label "${oldMenu}"`);
      else (target.menuLabel = newMenu), changed++;
    } else if (target.menuLabel !== newMenu) problems.push(`${id}: menu label is neither old nor new — "${target.menuLabel}"`);
  }
  for (const block of lesson.blocks) {
    if (block.type === "instruction" && block.text.includes(oldTitle)) {
      if (CHECK) problems.push(`${id}: old title in the instruction line`);
      else (block.text = block.text.replace(oldTitle, newTitle)), changed++;
    }
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
if (CHECK) {
  console.log(`Korean words written in Hangul — STUDENT · READING OK (${Object.keys(KOREAN_DISPLAY_PAGES).filter((p) => !p.startsWith("adult/")).length} pages, ${Object.keys(STUDENT_TITLES).length} titles)`);
} else {
  for (const [file, data] of files) {
    const { indent, newline } = layouts.get(file);
    fs.writeFileSync(file, JSON.stringify(data, null, indent) + (newline ? "\n" : ""), "utf8");
  }
  console.log(`changed ${changed} fields in ${files.size} files`);
}
