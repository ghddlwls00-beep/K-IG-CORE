// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Full data-integrity audit of the in-scope sections, driven by the repo's content/
// (source of truth) and the app's own TS logic. Writes out/data-audit.json.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { loadTs, REPO } = require("./tsload.cjs");

const OUT = path.join(__dirname, "out");
fs.mkdirSync(OUT, { recursive: true });
const C = (p) => path.join(REPO, "content", p);
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const lessonPath = (course, id) => C(`lessons/${course}/${id}.json`);
const getLesson = (course, id) => (fs.existsSync(lessonPath(course, id)) ? readJson(lessonPath(course, id)) : null);

const pres = loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));
const license = loadTs(path.join(REPO, "src/lib/license.ts"));
const vocaUtils = loadTs(path.join(REPO, "src/lib/vocaUtils.ts"));
const listening = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const readingUtils = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
const unified = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));

const HANGUL = /[가-힣]/;
const LATIN = /[A-Za-z]/;
const isEnglish = (t) => {
  if (!t) return false;
  const latin = (t.match(/[a-zA-Z]/g) || []).length;
  const hangul = (t.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  return latin >= hangul && latin > 0;
};
const hasKorean = (t) => /[가-힯ᄀ-ᇿ]/.test(t || "");
const norm = (t) => (t || "").replace(/\s+/g, " ").trim();
const SUSPECT = [
  [/�/, "replacement-char"],
  [/Ã.|Â.|â€/, "mojibake"],
  [/&(amp|lt|gt|quot|nbsp|#\d+);/i, "html-entity"],
  [/<\/?[a-z][^>]*>/i, "html-tag"],
  [/\b(undefined|null|NaN|lorem|TODO|TBD)\b/, "placeholder"],
  [/\?\?\?/, "placeholder-qmarks"],
];
function textFlags(t) {
  const f = [];
  if (t == null) return ["missing"];
  if (typeof t !== "string") return ["not-string"];
  if (!t.trim()) f.push("empty");
  for (const [re, name] of SUSPECT) if (re.test(t)) f.push(name);
  return f;
}

const issues = [];
function issue(section, severity, lesson, code, detail, extra = {}) {
  issues.push({ section, severity, lesson, code, detail, ...extra });
}
const coverage = {};
const speechTexts = new Map(); // text -> first location (for Ava clip check)
const originalAudio = new Map(); // src -> [lessons]
function addSpeech(text, where) {
  const clean = unified.normalizeUnifiedSpeechText(String(text || ""));
  if (!clean || !/[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(clean)) return;
  if (!speechTexts.has(clean)) speechTexts.set(clean, where);
}
function addAudio(lesson, where) {
  for (const a of lesson.audio || []) {
    if (!a.src) { issue(where.section, "P2", where.lesson, "EMPTY_AUDIO_SRC", "audio entry with empty src"); continue; }
    if (!originalAudio.has(a.src)) originalAudio.set(a.src, []);
    originalAudio.get(a.src).push(where.lesson);
  }
}

function checkGroupsSequence(section, groups, expectIds) {
  const listed = groups.flatMap((g) => g.lessons);
  const dup = listed.filter((id, i) => listed.indexOf(id) !== i);
  if (dup.length) issue(section, "P1", dup.join(","), "DUPLICATE_IN_MENU", `ids listed twice in menu groups: ${[...new Set(dup)].join(", ")}`);
  const missing = expectIds.filter((id) => !listed.includes(id));
  return { listed, missing };
}

// =============================================================================
// STUDENT
// =============================================================================
{
  const S = "STUDENT";
  const idx = readJson(C("courses/student.json"));
  const groups = idx.groups.map((g) => ({ ...g, label: g.label || g.title }));
  const cov = (coverage[S] = { expected: 81, indexLessons: idx.lessons.length, lessonCountField: idx.lessonCount, chapters: groups.length, perChapter: [], found: 0, pass: 0, fail: 0 });
  const failed = new Set();
  const contentHashes = new Map();
  groups.forEach((g, gi) => {
    const ch = gi + 1;
    const ids = g.lessons;
    cov.perChapter.push({ chapter: ch, label: g.label, count: ids.length, ids });
    // sequence check s{ch}-{1..n}
    const parts = ids.map((id) => {
      const m = id.match(/^s(\d+)-(\d+)$/);
      if (!m) { issue(S, "P1", id, "BAD_ID", `unexpected id format in chapter ${ch}`); return null; }
      if (Number(m[1]) !== ch) issue(S, "P1", id, "WRONG_CHAPTER", `lesson ${id} listed under chapter ${ch}`);
      return Number(m[2]);
    }).filter((n) => n != null);
    const max = Math.max(...parts);
    for (let p = 1; p <= max; p++) {
      if (!parts.includes(p)) {
        issue(S, "P1", `s${ch}-${p}`, "MISSING_SEQUENCE_NUMBER", `Chapter ${ch} jumps from s${ch}-${p - 1} to s${ch}-${p + 1}; lesson s${ch}-${p} does not exist in index or content/lessons`, { exists: fs.existsSync(lessonPath("student", `s${ch}-${p}`)) });
      }
    }
    for (let i = 1; i < parts.length; i++) if (parts[i] <= parts[i - 1]) issue(S, "P2", ids[i], "ORDER", `order not ascending in chapter ${ch}`);
  });
  const menuIds = groups.flatMap((g) => g.lessons);
  for (const s of idx.lessons) if (!menuIds.includes(s.id)) issue(S, "P1", s.id, "UNREACHABLE_FROM_MENU", "in index but not in any chapter group");

  for (const [gi, g] of groups.entries()) {
    for (const id of g.lessons) {
      const L = getLesson("student", id);
      if (!L) { issue(S, "P0", id, "LESSON_FILE_MISSING", "listed but no content file"); failed.add(id); continue; }
      cov.found++;
      const where = { section: S, lesson: id };
      addAudio(L, where);
      const sentBlocks = L.blocks.filter((b) => b.type === "sentences");
      if (sentBlocks.length > 1) { issue(S, "P1", id, "MULTIPLE_SENTENCE_BLOCKS", `${sentBlocks.length} sentence blocks; StudentLearningView renders only the first (${sentBlocks[0].items.length} of ${sentBlocks.flatMap((b) => b.items).length} sentences)`); failed.add(id); }
      const items = sentBlocks[0]?.items || [];
      const ko = L.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko").map((b) => b.text.trim());
      if (items.length === 0) { issue(S, "P0", id, "NO_SENTENCES", "no English sentences"); failed.add(id); }
      if (ko.length !== items.length) { issue(S, "P1", id, "EN_KO_COUNT_MISMATCH", `${items.length} English sentences vs ${ko.length} Korean paragraphs — Korean lines shift/are missing`); failed.add(id); }
      items.forEach((it, i) => {
        const f = textFlags(it.text);
        if (f.length) { issue(S, "P1", id, "BAD_EN_TEXT", `sentence ${i + 1}: ${f.join(",")}`); failed.add(id); }
        if (hasKorean(it.text)) { issue(S, "P1", id, "KOREAN_IN_EN_SLOT", `sentence ${i + 1}: ${it.text}`); failed.add(id); }
        if (!LATIN.test(it.text)) { issue(S, "P1", id, "EN_NO_LATIN", `sentence ${i + 1}: ${it.text}`); failed.add(id); }
        if (String(it.n) !== String(i + 1)) issue(S, "P3", id, "NUMBERING", `item ${i + 1} numbered "${it.n}"`);
        addSpeech(it.text, where);
      });
      ko.forEach((k, i) => {
        const f = textFlags(k);
        if (f.length) { issue(S, "P1", id, "BAD_KO_TEXT", `korean ${i + 1}: ${f.join(",")}`); failed.add(id); }
        if (!hasKorean(k)) { issue(S, "P1", id, "KO_NOT_KOREAN", `korean ${i + 1}: ${k}`); failed.add(id); }
        addSpeech(k, where);
      });
      const dupEn = items.map((x) => norm(x.text)).filter((t, i, a) => a.indexOf(t) !== i);
      if (dupEn.length) issue(S, "P2", id, "DUPLICATE_SENTENCE", `repeated sentence(s) within lesson: ${dupEn.join(" | ")}`);
      const h = crypto.createHash("md5").update(items.map((x) => norm(x.text)).join("\n")).digest("hex");
      if (contentHashes.has(h)) { issue(S, "P1", id, "DUPLICATE_LESSON_CONTENT", `identical sentences to ${contentHashes.get(h)}`); failed.add(id); }
      else contentHashes.set(h, id);
      // title / label mapping
      const chNum = gi + 1;
      const m = (L.menuLabel || "").match(/^(\d+)-(\d+)\./);
      const idm = id.match(/^s(\d+)-(\d+)$/);
      if (!m || m[1] !== idm[1] || m[2] !== idm[2]) issue(S, "P2", id, "MENU_LABEL_MISMATCH", `menuLabel "${L.menuLabel}" does not match id`);
      if (L.title == null || !L.title.trim()) { issue(S, "P1", id, "EMPTY_TITLE", "lesson title empty"); failed.add(id); }
      const groupEn = (g.label.match(/\(([^)]+(?:\([^)]*\))?)\)\s*$/) || [])[1];
      if (L.label && !L.label.startsWith(`Chapter ${chNum}.`)) issue(S, "P2", id, "CHAPTER_LABEL_MISMATCH", `lesson label "${L.label}" vs chapter ${chNum} "${g.label}"`);
      (L.chunkDrills || []).forEach((c, i) => {
        if (!c.en || !c.ko) issue(S, "P2", id, "CHUNK_EMPTY", `chunk ${i + 1} en/ko empty`);
        addSpeech(c.en, where);
      });
      addSpeech(L.blocks.find((b) => b.type === "instruction")?.text, where);
    }
  }
  // Unlock rule sanity
  cov.unlockRule = groups.map((g, i) => ({ chapter: i + 1, lessons: g.lessons.length, required: Math.max(1, Math.ceil(g.lessons.length * 0.8)) }));
  cov.fail = failed.size;
  cov.pass = cov.found - failed.size;
  cov.failedIds = [...failed];
}

// =============================================================================
// VOCA (phonics)
// =============================================================================
{
  const S = "VOCA";
  const idx = readJson(C("courses/phonics.json"));
  const dict = readJson(C("voca_dictionary.json"));
  const cov = (coverage[S] = { expected: 195, indexLessons: idx.lessons.length, groups: idx.groups.map((g) => ({ label: g.label, count: g.lessons.length })), found: 0, pass: 0, fail: 0, totalWordCells: 0, uniqueWords: 0 });
  const failed = new Set();
  const expectSeries = [["mv1", 40], ["mv2", 40], ["mv3", 40], ["hv", 75]];
  expectSeries.forEach(([pfx, n], gi) => {
    const g = idx.groups[gi];
    const exp = Array.from({ length: n }, (_, i) => `${pfx}-${String(i + 1).padStart(2, "0")}`);
    const missing = exp.filter((x) => !g.lessons.includes(x));
    const extra = g.lessons.filter((x) => !exp.includes(x));
    if (missing.length) issue(S, "P1", missing.join(","), "MISSING_SEQUENCE_NUMBER", `group ${g.label} missing ${missing.join(", ")}`);
    if (extra.length) issue(S, "P1", extra.join(","), "UNEXPECTED_IN_GROUP", `group ${g.label} has unexpected ${extra.join(", ")}`);
  });
  const wordLessons = new Map();
  const gridHashes = new Map();
  let genericCollocation = 0, bogusEtymology = [], missingMeaningCells = 0;
  const allWordsSet = new Set();
  const dictKeysUsed = new Set();
  for (const g of idx.groups) {
    for (const id of g.lessons) {
      const L = getLesson("phonics", id);
      if (!L) { issue(S, "P0", id, "LESSON_FILE_MISSING", "no content file"); failed.add(id); continue; }
      cov.found++;
      const where = { section: S, lesson: id };
      addAudio(L, where);
      const grid = L.blocks.find((b) => b.type === "wordgrid");
      if (!grid) { issue(S, "P0", id, "NO_WORDGRID", "lesson has no word grid"); failed.add(id); continue; }
      const rows = grid.rows;
      const rowLens = rows.map((r) => r.length);
      if (new Set(rowLens).size > 1) issue(S, "P3", id, "IRREGULAR_GRID", `row lengths ${rowLens.join("/")}`);
      const cells = rows.flat();
      const emptyCells = cells.filter((w) => !w || !w.trim()).length;
      if (emptyCells) issue(S, "P2", id, "EMPTY_CELLS", `${emptyCells} empty word cells`);
      const words = cells.map((w) => w?.trim()).filter(Boolean);
      cov.totalWordCells += words.length;
      // server-side subset exactly as page.tsx getVocaDictionaryForWords
      const subset = {};
      for (const w of words) {
        const clean = w.toLowerCase().trim();
        if (dict[clean]) subset[clean] = dict[clean];
        else if (dict[w]) subset[w] = dict[w];
      }
      // client getMeaning exactly as PhonicsLearningView
      const getMeaning = (word) => {
        const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
        return subset[word]?.meaning || subset[clean]?.meaning || "단어";
      };
      const lessonMissing = [];
      const meaningToWords = new Map();
      for (const w of words) {
        allWordsSet.add(w.toLowerCase());
        if (!wordLessons.has(w.toLowerCase())) wordLessons.set(w.toLowerCase(), []);
        wordLessons.get(w.toLowerCase()).push(id);
        const meaning = getMeaning(w);
        const clean = w.toLowerCase().trim();
        if (dict[clean]) dictKeysUsed.add(clean);
        if (meaning === "단어") { lessonMissing.push(w); missingMeaningCells++; }
        else {
          const mf = textFlags(meaning);
          if (mf.length) issue(S, "P1", id, "BAD_MEANING", `"${w}" meaning flags ${mf.join(",")}: ${meaning}`);
          if (!hasKorean(meaning)) issue(S, "P1", id, "MEANING_NOT_KOREAN", `"${w}" → "${meaning}"`);
          if (!meaningToWords.has(meaning)) meaningToWords.set(meaning, []);
          meaningToWords.get(meaning).push(w);
        }
        if (!/^[A-Za-z][A-Za-z'\-. ]*$/.test(w)) issue(S, "P2", id, "ODD_WORD_TOKEN", `word cell "${w}"`);
        const searchWord = subset[clean]?.searchWord;
        const colloc = vocaUtils.getCollocation(w, meaning, subset[w]?.searchWord || searchWord);
        if (colloc.phrase.startsWith("vital role of")) genericCollocation++;
        addSpeech(w, where);
        addSpeech(colloc.phrase, where);
        const ety = vocaUtils.analyzeEtymology(w);
        if (ety.prefix) bogusEtymology.push({ id, word: w, explanation: ety.explanation });
      }
      if (lessonMissing.length) { issue(S, "P1", id, "MISSING_MEANING", `${lessonMissing.length} word(s) show placeholder meaning "단어": ${lessonMissing.join(", ")}`); failed.add(id); }
      for (const [m, ws] of meaningToWords) {
        const uniq = [...new Set(ws.map((x) => x.toLowerCase()))];
        if (uniq.length > 1) issue(S, "P2", id, "SAME_MEANING_MULTIPLE_WORDS", `"${m}" is the meaning of ${uniq.join(" / ")} → Step 2 ko→en question and Step 4 speed-drill grading become ambiguous`);
      }
      const dupInLesson = words.map((w) => w.toLowerCase()).filter((w, i, a) => a.indexOf(w) !== i);
      if (dupInLesson.length) { issue(S, "P2", id, "DUPLICATE_WORD_IN_LESSON", `repeated: ${[...new Set(dupInLesson)].join(", ")}`); }
      const h = crypto.createHash("md5").update(words.join("|").toLowerCase()).digest("hex");
      if (gridHashes.has(h)) { issue(S, "P1", id, "DUPLICATE_LESSON_CONTENT", `identical word grid to ${gridHashes.get(h)}`); failed.add(id); }
      else gridHashes.set(h, id);
      // title mapping vs id
      const inst = L.blocks.find((b) => b.type === "instruction")?.text || "";
      if (inst && !inst.includes(id)) issue(S, "P2", id, "LABEL_MISMATCH", `instruction label "${inst}" vs id ${id}`);
      if (L.menuLabel && !L.menuLabel.includes(id)) issue(S, "P2", id, "MENU_LABEL_MISMATCH", `menuLabel "${L.menuLabel}"`);
      const t = pres.formatLessonPresentation("phonics", L);
      if (!t.title || /undefined|NaN/.test(t.title)) issue(S, "P2", id, "BAD_PRESENTATION_TITLE", t.title);
      if (L.title && !/제 \d+ 회/.test(L.title)) {}
      // quiz ambiguity using real generator
      const dictMap = {};
      for (const w of words) dictMap[w.toLowerCase().trim()] = { meaning: getMeaning(w) };
      const quizzes = vocaUtils.generateActiveRecallQuizzes(words, dictMap);
      for (const q of quizzes) {
        if (q.options.some((o) => /^단어 의미 \d$|^vocab\d$/.test(o))) issue(S, "P2", id, "PLACEHOLDER_QUIZ_OPTION", `quiz for "${q.word}" contains filler option`);
        if (q.questionType === "ko-to-en") {
          const sameMeaning = q.options.filter((o) => o !== q.word && dictMap[o.toLowerCase().trim()]?.meaning === q.correctMeaning);
          if (sameMeaning.length) issue(S, "P1", id, "AMBIGUOUS_QUIZ", `Q "[${q.correctMeaning}]" accepts only "${q.word}" but option(s) ${sameMeaning.join(", ")} have the same meaning`);
        }
        if (q.questionType === "en-to-ko" && q.correctMeaning === "단어") issue(S, "P1", id, "QUIZ_PLACEHOLDER_ANSWER", `en→ko question for "${q.word}" has correct answer "단어"`);
      }
    }
  }
  cov.uniqueWords = allWordsSet.size;
  cov.genericCollocationCells = genericCollocation;
  cov.missingMeaningCells = missingMeaningCells;
  cov.prefixHeuristicCells = bogusEtymology.length;
  cov.prefixHeuristicSamples = bogusEtymology.slice(0, 60);
  // cross-lesson duplicate words
  const crossDup = [...wordLessons.entries()].filter(([, ls]) => new Set(ls).size > 1);
  cov.crossLessonDuplicateWords = crossDup.length;
  cov.crossLessonDuplicateSamples = crossDup.slice(0, 40).map(([w, ls]) => `${w}: ${[...new Set(ls)].join(",")}`);
  // dictionary quality
  const dictIssues = [];
  for (const [k, v] of Object.entries(dict)) {
    if (!v?.meaning || !v.meaning.trim()) dictIssues.push(`${k}: empty meaning`);
    else if (!hasKorean(v.meaning)) dictIssues.push(`${k}: non-Korean meaning "${v.meaning}"`);
    if (v?.searchWord && v.searchWord.toLowerCase() !== k.toLowerCase()) dictIssues.push(`${k}: searchWord "${v.searchWord}" differs`);
  }
  cov.dictionaryEntries = Object.keys(dict).length;
  cov.dictionaryIssues = dictIssues;
  cov.dictKeysNeverUsedByAnyLesson = Object.keys(dict).filter((k) => !dictKeysUsed.has(k)).length;
  cov.fail = failed.size;
  cov.pass = cov.found - failed.size;
  cov.failedIds = [...failed];
  // expose example truncated dictionary keys
  cov.suspiciousDictKeys = Object.keys(dict).filter((k) => ["ancesto"].includes(k) || /[^a-z'\- ()]/i.test(k)).slice(0, 50);
}

// =============================================================================
// GRAMMAR helpers — mirror GrammarLearningView.items exactly
// =============================================================================
const GRAMMAR_KEYWORDS = new Set(["am","is","are","was","were","been","being","have","has","had","do","does","did","can","could","will","would","shall","should","may","might","must","if","unless","since","though","although","because","while","after","before","until","as","that","whether","not","never","no","this","that","these","those","my","your","his","her","its","our","their","mine","yours","hers","theirs","who","whom","whose","which","what","where","when","why","how","in","on","at","for","to","from","with","by","of","into","out"]);
const gClean = (t) => (t ? t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim() : "");
const normCmp = (t) => t.toLowerCase().replace(/[.,?!;:\"'()]/g, "").replace(/\s+/g, " ").trim();
function buildCloze(enText) {
  const tokens = enText.split(/(\s+|[.,?!;:"'()]+)/);
  const cands = [];
  for (let i = 0; i < tokens.length; i++) if (GRAMMAR_KEYWORDS.has(tokens[i].toLowerCase().trim())) cands.push(i);
  if (!cands.length) for (let i = 0; i < tokens.length; i++) if (/^[A-Za-z]{3,}$/.test(tokens[i])) { cands.push(i); break; }
  return cands.slice(0, 2).map((i) => tokens[i]);
}
function grammarItems(blocks, pairBlocks, lessonKey) {
  const isTheory = lessonKey.includes("020") || lessonKey.includes("021");
  if (isTheory) {
    const instrs = [...blocks, ...(pairBlocks || [])].filter((b) => b.type === "instruction").map((b) => b.text.trim());
    const th = [];
    for (let i = 0; i < instrs.length; i++) {
      const t = instrs[i];
      if (/^\(\d+\)/.test(t)) {
        let a = "";
        const next = instrs[i + 1] || "";
        if (next && !/^\(\d+\)/.test(next) && !next.includes("문법 확인")) { a = next.replace(/^답:\s*/, "").trim(); i++; }
        th.push({ id: th.length + 1, koreanText: t, englishText: a, theory: true, cloze: [] });
      }
    }
    if (th.length) return { items: th, theory: true };
  }
  const main = blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);
  const pair = pairBlocks ? pairBlocks.filter((b) => b.type === "sentences").flatMap((b) => b.items) : [];
  const count = Math.max(main.length, pair.length);
  const out = [];
  for (let i = 0; i < count; i++) {
    const tm = main[i]?.text ?? "", tp = pair[i]?.text ?? "";
    let en = "", ko = "";
    if (isEnglish(tm) && !isEnglish(tp)) { en = tm; ko = tp; }
    else if (!isEnglish(tm) && isEnglish(tp)) { en = tp; ko = tm; }
    else if (hasKorean(tm)) { ko = tm; en = tp; }
    else { en = tm; ko = tp; }
    out.push({ id: i + 1, n: main[i]?.n || pair[i]?.n || String(i + 1), koreanText: gClean(ko), englishText: gClean(en), cloze: buildCloze(gClean(en)), mainLen: main.length, pairLen: pair.length });
  }
  return { items: out, theory: false, mainLen: main.length, pairLen: pair.length };
}
function examGrade(user, model) {
  const u = normCmp(user || ""), m = normCmp(model);
  if (!u) return "incorrect";
  if (u === m) return "exact";
  if (u.replace(/\s/g, "") === m.replace(/\s/g, "") || m.includes(u)) return "partial";
  return "incorrect";
}
function numbersIn(t) { return (t.match(/\d+/g) || []).join(","); }

function auditGrammar(S, course, expectedIds, pairOf) {
  const idx = readJson(C(`courses/${course}.json`));
  const listed = idx.groups.flatMap((g) => g.lessons).filter((id) => idx.lessons.find((l) => l.id === id)?.variant === "main");
  const cov = (coverage[S] = { expected: expectedIds.length, indexMain: idx.lessons.filter((l) => l.variant === "main").length, indexAll: idx.lessons.length, groups: idx.groups.map((g) => ({ label: g.label, formatted: pres.formatGroupTitle(course, g.label), mainCount: g.lessons.filter((id) => idx.lessons.find((l) => l.id === id)?.variant === "main").length })), found: 0, pass: 0, fail: 0, totalItems: 0, itemsWithAlternatives: 0, singleLetterPartialCredit: 0 });
  const failed = new Set();
  const missing = expectedIds.filter((x) => !listed.includes(x));
  const extra = listed.filter((x) => !expectedIds.includes(x));
  if (missing.length) issue(S, "P1", missing.join(","), "MISSING_SEQUENCE_NUMBER", `expected lessons not in menu: ${missing.join(", ")}`);
  if (extra.length) issue(S, "P2", extra.join(","), "UNEXPECTED_IN_MENU", `menu has unexpected: ${extra.join(", ")}`);
  const hashes = new Map();
  for (const id of listed) {
    const L = getLesson(course, id);
    if (!L) { issue(S, "P0", id, "LESSON_FILE_MISSING", "no content file"); failed.add(id); continue; }
    cov.found++;
    const where = { section: S, lesson: id };
    addAudio(L, where);
    const pid = pairOf(id);
    const P = pid ? getLesson(course, pid) : null;
    if (!P) { issue(S, "P0", id, "PAIR_MISSING", `answer/script page ${pid} missing`); failed.add(id); continue; }
    addAudio(P, where);
    const built = grammarItems(L.blocks, P.blocks, `${course}/${id}`);
    const items = built.items;
    cov.totalItems += items.length;
    if (!built.theory && built.mainLen !== built.pairLen) { issue(S, "P1", id, "QUESTION_ANSWER_COUNT_MISMATCH", `${built.mainLen} questions in ${id} vs ${built.pairLen} answers in ${pid} → items after #${Math.min(built.mainLen, built.pairLen)} have no Korean or no English`); failed.add(id); }
    if (course === "grammar2" && built.theory) issue(S, "P1", id, "THEORY_BRANCH_MISFIRE", `lessonKey contains "020"/"021" → rendered as theory Q&A (${items.length} items)`);
    if (course === "grammar2" && (id.includes("020") || id.includes("021")) && !built.theory) issue(S, "P3", id, "THEORY_BRANCH_CHECKED", `id contains 020/021; theory branch attempted but no (n) instructions → fell back to sentence mode`);
    if (items.length === 0) { issue(S, "P0", id, "NO_ITEMS", "0 learning items rendered"); failed.add(id); }
    items.forEach((it) => {
      if (!it.koreanText) { issue(S, "P1", id, "EMPTY_KOREAN_PROMPT", `item ${it.id}: Korean prompt empty (en="${it.englishText}")`); failed.add(id); }
      if (!it.englishText) { issue(S, "P1", id, "EMPTY_MODEL_ANSWER", `item ${it.id}: English answer empty (ko="${it.koreanText}")`); failed.add(id); }
      if (it.koreanText && !hasKorean(it.koreanText) && !built.theory) { issue(S, "P1", id, "PROMPT_NOT_KOREAN", `item ${it.id}: "${it.koreanText}"`); failed.add(id); }
      if (it.englishText && hasKorean(it.englishText) && !built.theory) { issue(S, "P1", id, "ANSWER_HAS_KOREAN", `item ${it.id}: "${it.englishText}"`); failed.add(id); }
      for (const [t, lab] of [[it.koreanText, "ko"], [it.englishText, "en"]]) {
        const f = textFlags(t).filter((x) => x !== "empty");
        if (f.length) { issue(S, "P2", id, "TEXT_FLAG", `item ${it.id} ${lab}: ${f.join(",")} "${t}"`); }
      }
      if (!built.theory && it.englishText && it.koreanText) {
        const nk = numbersIn(it.koreanText), ne = numbersIn(it.englishText);
        if (nk && ne && nk !== ne) issue(S, "P2", id, "NUMBER_MISMATCH", `item ${it.id}: ko numbers ${nk} vs en ${ne} — possible misalignment: "${it.koreanText}" / "${it.englishText}"`);
        const ratio = it.englishText.length / Math.max(1, it.koreanText.length);
        if (ratio > 6 || ratio < 0.5) issue(S, "P2", id, "LENGTH_RATIO_OUTLIER", `item ${it.id}: en/ko length ratio ${ratio.toFixed(2)}: "${it.koreanText}" / "${it.englishText}"`);
      }
      if (/\(|\/|\bor\b/.test(it.englishText) && !built.theory) cov.itemsWithAlternatives++;
      if (it.englishText && examGrade("a", it.englishText) === "partial") cov.singleLetterPartialCredit++;
      if (!built.theory && it.englishText && it.cloze.length === 0) issue(S, "P3", id, "CLOZE_NO_BLANK", `item ${it.id}: cloze step has no blank`);
      addSpeech(it.englishText, where);
    });
    const h = crypto.createHash("md5").update(items.map((x) => x.englishText + "|" + x.koreanText).join("\n")).digest("hex");
    if (hashes.has(h)) { issue(S, "P1", id, "DUPLICATE_LESSON_CONTENT", `identical items to ${hashes.get(h)}`); failed.add(id); } else hashes.set(h, id);
  }
  cov.fail = failed.size;
  cov.pass = cov.found - failed.size;
  cov.failedIds = [...failed];
}

// GRAMMAR I
{
  const idx = readJson(C("courses/grammar1.json"));
  const expected = idx.groups.flatMap((g) => g.lessons);
  auditGrammar("GRAMMAR I", "grammar1", expected, (id) => `gh1-${String(parseInt(id.slice(4), 10) + 1).padStart(3, "0")}`);
  const S = "GRAMMAR I";
  if (expected.length !== 53) issue(S, "P1", "-", "COUNT_MISMATCH", `menu has ${expected.length} lessons (expected 53)`);
  // lecture number mapping vs menu order
  expected.forEach((id, i) => {
    const t = pres.formatLessonPresentation("grammar1", { id, unit: parseInt(id.slice(4), 10) });
    const want = `Lesson ${String(i + 1).padStart(2, "0")}`;
    if (t.code !== want) issue(S, "P2", id, "LECTURE_NUMBER_MISMATCH", `displayed ${t.code}, menu position ${i + 1}`);
  });
  // stage number printed on card vs actual group
  idx.groups.forEach((g, gi) => g.lessons.forEach((id) => {
    const t = pres.formatLessonPresentation("grammar1", { id });
    if (!t.subtitle.includes(`제 ${gi + 1}단계`)) issue(S, "P2", id, "STAGE_LABEL_MISMATCH", `card says "${t.subtitle}" but lesson is in ${g.label}`);
  }));
}
// GRAMMAR II
{
  const expected = Array.from({ length: 44 }, (_, i) => `gh2-${String(i + 7).padStart(3, "0")}`);
  auditGrammar("GRAMMAR II", "grammar2", expected, (id) => `${id}-1`);
  const idx = readJson(C("courses/grammar2.json"));
  idx.groups.forEach((g) => {
    const m = g.label.match(/(\d+)과\s*-\s*(\d+)과/);
    const mains = g.lessons.filter((x) => !x.endsWith("-1"));
    const nums = mains.map((x) => parseInt(x.slice(4), 10));
    if (m && (nums[0] !== +m[1] || nums.at(-1) !== +m[2] || nums.length !== +m[2] - +m[1] + 1)) issue("GRAMMAR II", "P2", mains.join(","), "GROUP_RANGE_MISMATCH", `group ${g.label} contains ${nums[0]}..${nums.at(-1)} (${nums.length})`);
    g.lessons.forEach((x) => { if (!x.endsWith("-1") && !g.lessons.includes(`${x}-1`)) issue("GRAMMAR II", "P1", x, "SCRIPT_NOT_IN_GROUP", `${x}-1 missing`); });
  });
}

// =============================================================================
// LISTENING (ld)
// =============================================================================
{
  const S = "LISTENING";
  const idx = readJson(C("courses/ld.json"));
  const scripts = readJson(C("ld_english_scripts.json"));
  const expected = Array.from({ length: 276 }, (_, i) => `d${String(i + 1).padStart(3, "0")}`);
  const listedMain = idx.groups.flatMap((g) => g.lessons).filter((x) => !x.endsWith("-1"));
  const cov = (coverage[S] = { expected: 276, indexMain: idx.lessons.filter((l) => l.variant === "main").length, lessonCountField: idx.lessonCount, groups: idx.groups.map((g) => ({ label: g.label, formatted: pres.formatGroupTitle("ld", g.label), main: g.lessons.filter((x) => !x.endsWith("-1")).length })), found: 0, pass: 0, fail: 0, totalSentences: 0, q1TopicDistribution: {} });
  const failed = new Set();
  const miss = expected.filter((x) => !listedMain.includes(x));
  if (miss.length) issue(S, "P1", miss.join(","), "MISSING_SEQUENCE_NUMBER", `missing ${miss.join(", ")}`);
  idx.groups.forEach((g) => {
    const m = g.label.match(/(\d+)번\s*-\s*(\d+)번/);
    const mains = g.lessons.filter((x) => !x.endsWith("-1")).map((x) => parseInt(x.slice(1), 10));
    if (m && (mains[0] !== +m[1] || mains.at(-1) !== +m[2] || mains.length !== +m[2] - +m[1] + 1)) issue(S, "P1", g.label, "GROUP_RANGE_MISMATCH", `group ${g.label} contains ${mains[0]}..${mains.at(-1)} (${mains.length})`);
    for (let i = 1; i < mains.length; i++) if (mains[i] !== mains[i - 1] + 1) issue(S, "P1", `d${mains[i]}`, "ORDER_GAP", `menu order ${mains[i - 1]} → ${mains[i]}`);
  });
  const hashes = new Map();
  for (const id of expected) {
    const L = getLesson("ld", id), K = getLesson("ld", `${id}-1`);
    if (!L) { issue(S, "P0", id, "LESSON_FILE_MISSING", "no main file"); failed.add(id); continue; }
    cov.found++;
    const where = { section: S, lesson: id };
    addAudio(L, where);
    if (!K) { issue(S, "P1", id, "SCRIPT_PAGE_MISSING", `${id}-1 missing`); failed.add(id); }
    const sc = scripts[id];
    if (!sc || !sc.length) { issue(S, "P0", id, "NO_ENGLISH_SCRIPT", "no English transcript → dictation/shadowing/speed steps empty, top player has no English"); failed.add(id); continue; }
    cov.totalSentences += sc.length;
    sc.forEach((s, i) => {
      if (!s.en || !s.en.trim()) { issue(S, "P1", id, "EMPTY_EN_SENTENCE", `sentence ${i + 1} English empty`); failed.add(id); }
      if (!s.ko || !s.ko.trim()) { issue(S, "P1", id, "EMPTY_KO_SENTENCE", `sentence ${i + 1} Korean empty`); failed.add(id); }
      if (s.en && hasKorean(s.en)) { issue(S, "P1", id, "KOREAN_IN_EN", `sentence ${i + 1}: ${s.en}`); failed.add(id); }
      if (s.ko && !hasKorean(s.ko)) { issue(S, "P1", id, "KO_NOT_KOREAN", `sentence ${i + 1}: ${s.ko}`); failed.add(id); }
      for (const [t, lab] of [[s.en, "en"], [s.ko, "ko"]]) { const f = textFlags(t).filter((x) => x !== "empty"); if (f.length) issue(S, "P2", id, "TEXT_FLAG", `sentence ${i + 1} ${lab}: ${f.join(",")} "${t}"`); }
      if (String(s.n) !== String(i + 1)) issue(S, "P3", id, "NUMBERING", `sentence ${i + 1} numbered ${s.n}`);
      // typed dictation normalization collapses words when separators without spaces exist
      if (/[A-Za-z][—–…\/][A-Za-z]/.test(s.en)) issue(S, "P2", id, "TYPED_DICTATION_WORD_COLLAPSE", `sentence ${i + 1}: "${s.en.match(/\S*[—–…\/]\S*/)[0]}" — typed mode strips the separator and merges words; a correct typed answer with a space is marked wrong`);
      const wb = listening.generateWordBank(s.en || "");
      if (s.en && wb.correctWords.length === 0) { issue(S, "P1", id, "DICTATION_NO_TILES", `sentence ${i + 1} produces 0 word tiles`); failed.add(id); }
      addSpeech(s.en, where);
      addSpeech(s.ko, where);
    });
    // Korean transcript mapping: the ld_english_scripts Korean should equal the lesson's own Korean script page
    if (K) {
      const kText = norm(K.blocks.filter((b) => (b.type === "instruction" && !/한글 대본을|받아쓰기를/.test(b.text)) || b.type === "paragraph").map((b) => b.text).concat(K.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items.map((x) => x.text))).join(" "));
      const scKo = norm(sc.map((s) => s.ko).join(" "));
      const strip = (t) => t.replace(/[^가-힣]/g, "");
      const a = strip(kText), b = strip(scKo);
      if (a !== b) {
        // similarity by character bigram overlap
        const bg = (t) => { const m = new Map(); for (let i = 0; i < t.length - 1; i++) { const k = t.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
        const A = bg(a), B = bg(b); let inter = 0, tot = 0;
        for (const [k, v] of A) { inter += Math.min(v, B.get(k) || 0); tot += v; }
        for (const [, v] of B) tot += v;
        const dice = tot ? (2 * inter) / tot : 0;
        if (dice < 0.9) { issue(S, dice < 0.5 ? "P1" : "P2", id, "TRANSCRIPT_KO_MISMATCH", `Korean in ld_english_scripts vs ${id}-1 page similarity ${(dice * 100).toFixed(0)}% (ko chars ${b.length} vs ${a.length})`); if (dice < 0.5) failed.add(id); }
      }
    }
    // Proper-noun hints must appear in the English transcript (mapping check)
    const hints = L.blocks.find((b) => b.type === "hints")?.text || "";
    const hintWords = hints.split(/[,.]/).map((w) => w.trim()).filter((w) => w.length > 2 && !/^\d+$/.test(w));
    const enAll = sc.map((s) => s.en).join(" ").toLowerCase().replace(/\s+/g, " ");
    const missingHints = hintWords.filter((w) => !enAll.includes(w.toLowerCase()) && !enAll.replace(/[^a-z0-9]/g, "").includes(w.toLowerCase().replace(/[^a-z0-9]/g, "")));
    if (hintWords.length && missingHints.length / hintWords.length >= 0.5) { issue(S, "P1", id, "HINTS_NOT_IN_TRANSCRIPT", `${missingHints.length}/${hintWords.length} vocabulary hints absent from English transcript (${missingHints.slice(0, 6).join(", ")}) → transcript may belong to another lesson`); failed.add(id); }
    else if (missingHints.length) issue(S, "P3", id, "SOME_HINTS_NOT_IN_TRANSCRIPT", `${missingHints.join(", ")}`);
    if (!hints) issue(S, "P3", id, "NO_HINTS", "no vocabulary hints block");
    const h = crypto.createHash("md5").update(enAll).digest("hex");
    if (hashes.has(h)) { issue(S, "P1", id, "DUPLICATE_LESSON_CONTENT", `same transcript as ${hashes.get(h)}`); failed.add(id); } else hashes.set(h, id);
    // Step 1 quiz (real generator)
    const quiz = listening.generateListeningContextQuiz(sc, hintWords);
    const q1 = quiz[0].options[quiz[0].answerIndex];
    cov.q1TopicDistribution[q1] = (cov.q1TopicDistribution[q1] || 0) + 1;
    if (!(L.audio || []).length) issue(S, "P1", id, "NO_ORIGINAL_AUDIO", "no audio entry");
  }
  cov.fail = failed.size;
  cov.pass = cov.found - failed.size;
  cov.failedIds = [...failed];
}

// =============================================================================
// READING
// =============================================================================
{
  const S = "READING";
  const idx = readJson(C("courses/reading.json"));
  const rsJson = loadTs(path.join(REPO, "src/lib/readingSentences.json"));
  const rvJson = loadTs(path.join(REPO, "src/lib/readingVocabulary.json"));
  const expected = Array.from({ length: 256 }, (_, i) => `pr${String(i + 1).padStart(3, "0")}`);
  const listedMain = idx.groups.flatMap((g) => g.lessons).filter((x) => !x.endsWith("-1"));
  const cov = (coverage[S] = { expected: 256, indexMain: idx.lessons.filter((l) => l.variant === "main").length, lessonCountField: idx.lessonCount, groups: idx.groups.map((g) => ({ label: g.label, formatted: pres.formatGroupTitle("reading", g.label), main: g.lessons.filter((x) => !x.endsWith("-1")).length })), found: 0, pass: 0, fail: 0, totalSentences: 0, q1TopicDistribution: {}, q1FallbackCount: 0, clozeCrashes: [], clozeNoBlank: [] });
  const failed = new Set();
  const miss = expected.filter((x) => !listedMain.includes(x));
  if (miss.length) issue(S, "P1", miss.join(","), "MISSING_SEQUENCE_NUMBER", `missing ${miss.join(", ")}`);
  idx.groups.forEach((g) => {
    const m = g.label.match(/(\d+)~(\d+)번/);
    const mains = g.lessons.filter((x) => !x.endsWith("-1")).map((x) => parseInt(x.slice(2), 10));
    if (m && (mains[0] !== +m[1] || mains.at(-1) !== +m[2] || mains.length !== +m[2] - +m[1] + 1)) issue(S, "P1", g.label, "GROUP_RANGE_MISMATCH", `group ${g.label} contains ${mains[0]}..${mains.at(-1)} (${mains.length})`);
    const f = pres.formatGroupTitle("reading", g.label);
    const sec = Math.ceil(+m[1] / 40);
    cov.groups.find((x) => x.label === g.label).sectionNumberShown = sec;
  });
  const hashes = new Map();
  for (const id of expected) {
    const L = getLesson("reading", id), K = getLesson("reading", `${id}-1`);
    if (!L) { issue(S, "P0", id, "LESSON_FILE_MISSING", "no file"); failed.add(id); continue; }
    cov.found++;
    const where = { section: S, lesson: id };
    addAudio(L, where);
    const rs = L.readingSentences ?? K?.readingSentences ?? null;
    const rsj = rsJson[id];
    if (!rs || !rs.length) { issue(S, "P0", id, "NO_SENTENCES", "no aligned sentences"); failed.add(id); continue; }
    if (rsj && JSON.stringify(rsj) !== JSON.stringify(rs)) issue(S, "P2", id, "SENTENCE_SOURCES_DIVERGE", "lesson JSON readingSentences differs from src/lib/readingSentences.json");
    cov.totalSentences += rs.length;
    rs.forEach((s, i) => {
      if (!s.english?.trim()) { issue(S, "P1", id, "EMPTY_EN_SENTENCE", `sentence ${i + 1}`); failed.add(id); }
      if (!s.korean?.trim()) { issue(S, "P1", id, "EMPTY_KO_SENTENCE", `sentence ${i + 1} (en: "${s.english}")`); failed.add(id); }
      if (s.english && hasKorean(s.english)) { issue(S, "P1", id, "KOREAN_IN_EN", `sentence ${i + 1}: ${s.english}`); failed.add(id); }
      if (s.korean && !hasKorean(s.korean)) { issue(S, "P1", id, "KO_NOT_KOREAN", `sentence ${i + 1}: ${s.korean}`); failed.add(id); }
      for (const [t, lab] of [[s.english, "en"], [s.korean, "ko"]]) { const f = textFlags(t).filter((x) => x !== "empty"); if (f.length) { issue(S, "P2", id, "TEXT_FLAG", `sentence ${i + 1} ${lab}: ${f.join(",")} "${t}"`); } }
      if (s.id !== `reading-${id.slice(2)}-s${String(i + 1).padStart(3, "0")}`) issue(S, "P3", id, "SENTENCE_ID", `sentence ${i + 1} id ${s.id}`);
      addSpeech(s.english, where);
    });
    // Passage integrity: aligned sentences must reproduce the legacy passage
    const passage = readingUtils.extractFullReadingPassage(L.blocks);
    const koPassage = K ? readingUtils.extractFullReadingPassage(K.blocks) : "";
    const letters = (t) => (t || "").toLowerCase().replace(/[^a-z]/g, "");
    const hang = (t) => (t || "").replace(/[^가-힣]/g, "");
    if (!passage || passage.trim().length < 20) { issue(S, "P1", id, "EMPTY_LEGACY_PASSAGE", "legacy English passage block empty/short"); }
    else if (letters(passage) !== letters(rs.map((s) => s.english).join(" "))) {
      const a = letters(passage), b = letters(rs.map((s) => s.english).join(" "));
      const sev = Math.abs(a.length - b.length) / Math.max(a.length, 1) > 0.1 ? "P1" : "P2";
      issue(S, sev, id, "PASSAGE_TEXT_DIVERGES", `aligned English (${b.length} letters) ≠ legacy passage (${a.length} letters)`, { firstDiff: firstDiff(a, b) });
      if (sev === "P1") failed.add(id);
    }
    if (koPassage && hang(koPassage) !== hang(rs.map((s) => s.korean).join(" "))) {
      const a = hang(koPassage), b = hang(rs.map((s) => s.korean).join(" "));
      const sev = Math.abs(a.length - b.length) / Math.max(a.length, 1) > 0.15 ? "P1" : "P3";
      issue(S, sev, id, "TRANSLATION_DIVERGES", `aligned Korean (${b.length} chars) ≠ legacy translation page (${a.length} chars)`, { firstDiff: firstDiff(a, b) });
      if (sev === "P1") failed.add(id);
    }
    // vocabulary
    const rv = L.readingVocabulary ?? K?.readingVocabulary ?? rvJson[id];
    if (!rv || rv.length !== 14) { issue(S, "P2", id, "VOCAB_NOT_14", `readingVocabulary length ${rv?.length}`); }
    const enLower = rs.map((s) => s.english).join(" ").toLowerCase();
    (rv || []).forEach((v, i) => {
      if (!v.word || !v.korean || !v.partOfSpeech) { issue(S, "P1", id, "VOCAB_FIELD_EMPTY", `vocab ${i + 1}: ${JSON.stringify(v)}`); failed.add(id); }
      if (v.word && !new RegExp(`\\b${v.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(enLower)) issue(S, "P2", id, "VOCAB_NOT_IN_PASSAGE", `"${v.word}" not found in passage`);
      if (v.korean && !hasKorean(v.korean)) issue(S, "P1", id, "VOCAB_MEANING_NOT_KOREAN", `"${v.word}" → "${v.korean}"`);
      addSpeech(v.word, where);
    });
    const dupV = (rv || []).map((v) => v.word?.toLowerCase()).filter((w, i, a) => a.indexOf(w) !== i);
    if (dupV.length) issue(S, "P2", id, "VOCAB_DUPLICATE", dupV.join(","));
    const h = crypto.createHash("md5").update(enLower).digest("hex");
    if (hashes.has(h)) { issue(S, "P1", id, "DUPLICATE_LESSON_CONTENT", `same passage as ${hashes.get(h)}`); failed.add(id); } else hashes.set(h, id);
    // Quiz Q1 (real generator; lessonKey as in page)
    const en = rs.map((s) => s.english).join(" "), ko = rs.map((s) => s.korean).join(" ");
    const qs = readingUtils.generateReadingQuiz(en, ko, `reading/${id}`);
    const q1 = qs[0].options[qs[0].answerIndex];
    const topic = /의 중요성 및 실천적 의미$/.test(q1) ? "(fallback: first sentence + 의 중요성 및 실천적 의미)" : q1;
    if (topic.startsWith("(fallback")) cov.q1FallbackCount++;
    (cov.q1TopicDistribution[topic] ||= []).push(id);
    // Cloze (real generator) — detect regex crashes and unmasked sentences
    for (let trial = 0; trial < 3; trial++) {
      try {
        const cz = readingUtils.generateClozeItems(rs.map((s) => ({ en: s.english, ko: s.korean })));
        cz.forEach((c) => { if (!c.maskedSentence.includes("_______")) cov.clozeNoBlank.push(`${id}#${c.id}:${c.missingWord}`); });
      } catch (e) {
        cov.clozeCrashes.push(`${id}: ${e.message}`);
        issue(S, "P0", id, "CLOZE_CRASH", `generateClozeItems throws: ${e.message} → Step 3 tab crashes`);
        failed.add(id);
        break;
      }
    }
  }
  cov.clozeNoBlank = [...new Set(cov.clozeNoBlank)];
  cov.clozeNoBlank.forEach((x) => issue(S, "P2", x.split("#")[0], "CLOZE_NOT_MASKED", `cloze ${x}: target word not masked in sentence (answer visible, no blank)`));
  cov.fail = failed.size;
  cov.pass = cov.found - failed.size;
  cov.failedIds = [...failed];
}

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return { at: i, legacy: a.slice(Math.max(0, i - 20), i + 40), aligned: b.slice(Math.max(0, i - 20), i + 40) };
}

// =============================================================================
// Search index coverage (repo build script logic)
// =============================================================================
{
  const src = fs.readFileSync(path.join(REPO, "scripts/buildSearchIndex.ts"), "utf8");
  coverage.SEARCH = { studentIndexed: /slug: "student"/.test(src), contentWordsIndexed: false };
}

// =============================================================================
// Speech inventory keys (for R2 Ava clip existence check)
// =============================================================================
const speech = [...speechTexts.entries()].map(([text, where]) => ({ key: unified.unifiedSpeechKey(text), text, ...where }));
fs.writeFileSync(path.join(OUT, "speech-inventory.json"), JSON.stringify(speech));
fs.writeFileSync(path.join(OUT, "original-audio.json"), JSON.stringify([...originalAudio.entries()]));

const bySev = {};
for (const i of issues) {
  bySev[i.section] ||= {};
  bySev[i.section][i.code] ||= { severity: i.severity, count: 0, lessons: new Set() };
  bySev[i.section][i.code].count++;
  String(i.lesson).split(",").forEach((l) => bySev[i.section][i.code].lessons.add(l));
}
const summary = {};
for (const [s, codes] of Object.entries(bySev)) {
  summary[s] = Object.fromEntries(Object.entries(codes).map(([c, v]) => [c, { severity: v.severity, count: v.count, lessons: v.lessons.size, sample: [...v.lessons].slice(0, 12) }]));
}
fs.writeFileSync(path.join(OUT, "data-audit.json"), JSON.stringify({ coverage, summary, issues }, null, 2));
console.log(JSON.stringify({ coverage: Object.fromEntries(Object.entries(coverage).map(([k, v]) => [k, { ...v, perChapter: undefined, failedIds: v.failedIds?.length, prefixHeuristicSamples: undefined, crossLessonDuplicateSamples: undefined, q1TopicDistribution: v.q1TopicDistribution ? Object.fromEntries(Object.entries(v.q1TopicDistribution).map(([t, x]) => [t, Array.isArray(x) ? x.length : x])) : undefined, dictionaryIssues: v.dictionaryIssues?.slice(0, 15) }])), summary }, null, 1));
console.log("speech texts:", speech.length, "original audio srcs:", originalAudio.size);
