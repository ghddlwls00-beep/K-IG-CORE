#!/usr/bin/env node
/**
 * VOCA 학습법 (2026-09-27 — voca-verified.md · 계획.md E02–E04 · D20–D22): the rules the new VOCA view takes from
 * src/lib/vocaUtils.ts, run over ALL 195 lessons with the lesson-only dictionary the page sends (content.ts
 * getVocaDictionaryForWords — the view's own quiz never sees another lesson's words). Exit 1 on any miss.
 *
 *   A  Step 2 rounds (E02 · VOCA-L02 · L08 · L13 · D20): a round asks every word exactly once · two rounds differ in order ·
 *      every word is asked English → Korean in one of the two rounds and Korean → English in the other · a round built twice
 *      has new options · the right option is at its index, the options are distinct, meanings for English → Korean and lesson
 *      words for Korean → English, no placeholder ('단어 의미 N' · 'vocabN') · no wrong option shares a sense or a stem
 *      ('고대의' / '고대') with the answer · about a third is heard (listen) — never a word with a homophone in its own lesson,
 *      judged by TWO lists: the app's (vocaUtils HOMOPHONE_GROUPS) and the one the single-word speaking worker wrote
 *      independently (src/lib/speechSingleWord.ts HOMOPHONES — read as text, not run).
 *   B  asking again (VOCA-L03 · D20 "단어당 2번까지"): a learner who misses everything sees each word exactly 1 + 2 times; one who
 *      misses once, twice; one who is always right, once · every re-ask has its right option in a new place and different
 *      options.
 *   C  Step 4 (E04 · VOCA-L09 · D22): a pass holds every word once · the next pass is in another order · 2,000 simulated
 *      60-second games per learner under the score rule with the 0.4 s answer display: a guesser who presses '맞음' as fast
 *      as allowed and a random presser must score below an honest 80% learner at 1.5 s a pair (the old rule: 12,000 vs 8,100).
 *   D  Step 3 spelling (VOCA-L07 CHECK): the accepted and refused answers of every special headword kind.
 *   E  Leitner (VOCA-L05 · U11 · E03 · L02 ④): an old record's untouched words read as '새 단어' (box 0) and its real
 *      answers keep their boxes · the streak grows once a learning day · only answers move boxes · '안다고 표시' moves none.
 *   F  engine keys (공통-학습-엔진.md §5): the words' order is the grid read row by row, 1-based, the same order the page's
 *      whole-lesson player reads (lessonAudioText extractSentencesForAudio for phonics).
 *
 *   node docs/qa-2026-09-18/scripts/check-voca-learning.cjs [--seed 1] [--break order|flip|listen|reask|options|stem|score|spelling|legacy|streak]
 *   --break patches ONE rule of a copy of vocaUtils.ts in memory (the file is not touched) — the run must then exit 1.
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SEED = Number(arg("--seed", 1));
const BREAK = arg("--break", "") || ((process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "");

// mulberry32 — the generators call Math.random for every shuffle and pick; a fixed seed gives the same numbers every run
let state = SEED >>> 0;
Math.random = () => {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// --- the app's module, with one rule broken on request -------------------------------------------------------------
let src = fs.readFileSync(path.join(REPO, "src/lib/vocaUtils.ts"), "utf8");
const BREAKS = {
  order: ["  return shuffled(questions);", "  return questions;"],
  flip: ["return (place + round - 1) % 2 === 0 ?", "return place % 2 === 0 ?"],
  listen: ["canAskByListening(t.entry.word)", "true"],
  reask: ["(question.retry ?? 0) >= MAX_REASKS", "(question.retry ?? 0) >= MAX_REASKS + 1"],
  options: ["if (avoidIndex !== undefined && avoidIndex !== null", "if (false && avoidIndex !== undefined && avoidIndex !== null"],
  stem: ["if (stemPair(vocaDict[a]?.meaning || \"\", vocaDict[b]?.meaning || \"\")) return true;", ""],
  score: ["export const SPEED_WRONG_PENALTY = 100;", "export const SPEED_WRONG_PENALTY = 0;"],
  spelling: ["if (answer === parts.join(\"\") || answer === parts.join(\" \")) return true;", ""],
  legacy: ["export const LEITNER_LEGACY_WINDOW_MS = 2000;", "export const LEITNER_LEGACY_WINDOW_MS = -1;"],
  streak: ["if (today === null || streakDay !== today) {", "if (true) {"],
};
if (BREAK) {
  const b = BREAKS[BREAK];
  if (!b) throw new Error(`--break: ${Object.keys(BREAKS).join(" | ")}`);
  if (!src.includes(b[0])) throw new Error(`--break ${BREAK}: 바꿀 곳을 못 찾음 — vocaUtils.ts 가 바뀌었으면 이 표를 맞추세요`);
  src = src.replace(b[0], b[1]);
  console.log(`(일부러 깨기 --break ${BREAK}: vocaUtils.ts 사본의 "${b[0].trim().slice(0, 60)}" 를 바꿈 — exit 1 이어야 함)`);
}
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const mod = { exports: {} };
new Function("require", "module", "exports", js)(() => { throw new Error("vocaUtils.ts must stay import-free"); }, mod, mod.exports);
const V = mod.exports;

// --- the data, as the page sends it ----------------------------------------------------------------------------------
const DICT = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8").replace(/^﻿/, ""));
const lc = (w) => String(w || "").toLowerCase().trim();
const LDIR = path.join(REPO, "content/lessons/phonics");
const lessons = fs.readdirSync(LDIR).filter((f) => f.endsWith(".json")).sort().map((f) => {
  const j = JSON.parse(fs.readFileSync(path.join(LDIR, f), "utf8"));
  const g = (j.blocks || []).find((b) => b.type === "wordgrid");
  const rows = (g ? g.rows : []).map((r) => (r || []).map((w) => String(w == null ? "" : w).trim()).filter(Boolean)).filter((r) => r.length);
  const words = rows.flat();
  // content.ts getVocaDictionaryForWords + PhonicsLearningView getMeaning
  const subset = {};
  for (const w of words) { if (DICT[w]) subset[w] = DICT[w]; else if (DICT[w.toLowerCase()]) subset[w.toLowerCase()] = DICT[w.toLowerCase()]; }
  const meaningOf = (w) => (subset[w] && subset[w].meaning) || (subset[w.toLowerCase().replace(/[()"]/g, "").trim()] || {}).meaning || "단어";
  const dictMap = {};
  for (const w of words) dictMap[lc(w)] = { meaning: meaningOf(w) };
  return { id: f.replace(/\.json$/, ""), rows, words, dictMap, meaningOf, audio: j.audio || [] };
});

const results = [];
const check = (name, ok, detail) => { results.push({ name, ok }); console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`); };
const examples = {};
const note = (k, e) => { (examples[k] = examples[k] || []).length < 4 && examples[k].push(e); };

// the second, independent homophone list (the single-word speaking worker's) — read as text
const ssw = fs.readFileSync(path.join(REPO, "src/lib/speechSingleWord.ts"), "utf8");
const block = (ssw.match(/export const HOMOPHONES[^=]*=\s*(\[[\s\S]*?\n\]);/) || [])[1];
if (!block) throw new Error("speechSingleWord.ts HOMOPHONES 를 못 읽음");
const OTHER_GROUPS = eval(block.replace(/\/\/[^\n]*/g, ""));
const otherMates = (w) => { const k = lc(w); const g = OTHER_GROUPS.find((x) => x.includes(k)); return g ? g.filter((x) => x !== k) : []; };

// the checker's own sense rules (not the app's functions)
const segs = (m) => String(m || "").replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ").split(/[;,/·]|\s+또는\s+/).map((s) => s.replace(/\s+/g, " ").trim()).filter(Boolean);
const sharesOrStem = (a, b) => {
  const A = segs(a), B = segs(b);
  return A.some((x) => B.some((y) => x === y || ["의", "하다", "적인"].some((e) => x === y + e || y === x + e)));
};
const NOTES = [" (뜻에 따라 발음이 다름)", " (동사는 뒤 강세)"];
const bare = (m) => NOTES.reduce((s, n) => s.split(n).join(""), m);

// ===================================================================================================================
// A · rounds
// ===================================================================================================================
{
  let rounds = 0, qs = 0, badCover = 0, sameOrder = 0, noFlip = 0, badShape = 0, placeholders = 0, clash = 0, listenQs = 0, enKoQs = 0;
  let listenHomophone = 0, listenSameLesson = 0, listenOtherSameLesson = 0, sameLessonPairs = 0, regenSame = 0, regenTotal = 0;
  let rowShare = [0, 0], rowShare1 = [0, 0];
  for (const L of lessons) {
    if (!L.words.length) continue;
    const r1 = V.generateActiveRecallQuizzes(L.words, L.dictMap, { round: 1, rows: L.rows });
    const r2 = V.generateActiveRecallQuizzes(L.words, L.dictMap, { round: 2, rows: L.rows });
    const r1b = V.generateActiveRecallQuizzes(L.words, L.dictMap, { round: 1, rows: L.rows });
    rounds += 2;
    const lessonWordsLc = new Set(L.words.map(lc));
    for (const [tag, R] of [["r1", r1], ["r2", r2]]) {
      const orders = R.map((q) => q.order).sort((a, b) => a - b);
      if (orders.length !== L.words.length || orders.some((o, i) => o !== i + 1)) { badCover++; note("cover", `${L.id} ${tag}: ${orders.length}/${L.words.length}`); }
      for (const q of R) {
        qs++;
        const answer = q.questionType === "en-to-ko" ? q.correctMeaning : q.word;
        const opts = q.options || [];
        if (opts[q.correctIndex] !== answer || new Set(opts).size !== opts.length || opts.length !== 4) { badShape++; note("shape", `${L.id} ${q.word} ${JSON.stringify(opts)}`); }
        if (L.words[q.order - 1] !== q.word) { badShape++; note("shape", `${L.id} order ${q.order} ≠ ${q.word}`); }
        for (const o of opts) {
          if (/^단어 의미 \d$|^vocab\d$/.test(o)) { placeholders++; note("placeholder", `${L.id} ${q.word}: ${o}`); continue; }
          if (o === answer) continue;
          if (q.questionType === "en-to-ko") {
            if (/^[A-Za-z]/.test(o)) { badShape++; note("shape", `${L.id} en→ko option is English: ${o}`); }
            if (sharesOrStem(o, q.correctMeaning)) { clash++; note("clash", `${L.id} ${q.word} (${q.correctMeaning}) ↔ ${o}`); }
          } else {
            if (!lessonWordsLc.has(lc(o))) { badShape++; note("shape", `${L.id} ko→en option not a lesson word: ${o}`); }
            if (sharesOrStem(bare(L.dictMap[lc(o)].meaning), q.correctMeaning)) { clash++; note("clash", `${L.id} [${q.correctMeaning}] ↔ ${o} (${L.dictMap[lc(o)].meaning})`); }
          }
        }
        if (q.questionType === "en-to-ko") enKoQs++;
        if (q.prompt === "listen") {
          listenQs++;
          if (q.questionType !== "en-to-ko") { badShape++; note("shape", `${L.id} listen item is not en-to-ko: ${q.word}`); }
          if (V.homophonesOf(q.word).length) { listenHomophone++; note("listen", `${L.id} ${tag} listen '${q.word}' has homophones ${V.homophonesOf(q.word).join("/")}`); }
          if (V.homophonesOf(q.word).some((h) => lessonWordsLc.has(h))) { listenSameLesson++; note("listen", `${L.id} ${tag} listen '${q.word}' — its homophone is in the lesson`); }
          if (otherMates(q.word).some((h) => lessonWordsLc.has(h))) { listenOtherSameLesson++; note("listen", `${L.id} ${tag} listen '${q.word}' — a homophone (speechSingleWord list) is in the lesson`); }
        }
        // same row first from round 2 (VOCA-L13 CHECK): the share of wrong options from the word's own row
        const row = L.rows.find((r) => r.some((w) => lc(w) === lc(q.word))) || [];
        const rowMeanings = new Set(row.filter((w) => lc(w) !== lc(q.word)).map((w) => bare(L.dictMap[lc(w)].meaning)));
        const rowWords = new Set(row.filter((w) => lc(w) !== lc(q.word)).map(lc));
        for (const o of opts) {
          if (o === answer) continue;
          const inRow = q.questionType === "en-to-ko" ? rowMeanings.has(o) : rowWords.has(lc(o));
          const bucket = tag === "r2" ? rowShare : rowShare1;
          bucket[0] += inRow ? 1 : 0; bucket[1] += 1;
        }
      }
    }
    // the same lesson's homophone pairs, by both lists
    const ws = L.words.map(lc);
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) if (V.homophonesOf(ws[i]).includes(ws[j]) || otherMates(ws[i]).includes(ws[j])) { sameLessonPairs++; note("pairs", `${L.id}: ${ws[i]}/${ws[j]}`); }
    // order and direction
    if (r1.map((q) => q.order).join(",") === r2.map((q) => q.order).join(",")) { sameOrder++; note("order", `${L.id}`); }
    const dir1 = new Map(r1.map((q) => [q.order, q.questionType]));
    for (const q of r2) if (dir1.get(q.order) === q.questionType) { noFlip++; note("flip", `${L.id} ${q.word} ${q.questionType} in both rounds`); }
    // options regenerate: the same round built twice
    const opts1 = new Map(r1.map((q) => [q.order, q.options.join("|")]));
    for (const q of r1b) { regenTotal++; if (opts1.get(q.order) === q.options.join("|")) regenSame++; }
  }
  const pct = (a, b) => (b ? `${((100 * a) / b).toFixed(1)}%` : "-");
  check("A1 한 회차에 모든 단어 한 번씩", badCover === 0, `회차 ${rounds} · 어긋남 ${badCover}${examples.cover ? " · 예 " + examples.cover.join(" ; ") : ""}`);
  check("A2 두 회차의 순서가 다름", sameOrder === 0, `강의 ${lessons.length} 중 같은 순서 ${sameOrder}${examples.order ? " · " + examples.order.join(" ") : ""}`);
  check("A3 두 회차에 모든 단어가 두 방향", noFlip === 0, `방향이 안 바뀐 단어 ${noFlip}${examples.flip ? " · 예 " + examples.flip.join(" ; ") : ""}`);
  check("A4 다시 만든 회차의 보기가 새로", regenSame / Math.max(1, regenTotal) < 0.1, `같은 회차를 두 번 만들어 보기가 그대로인 문항 ${regenSame}/${regenTotal} (${pct(regenSame, regenTotal)} — 10% 미만이어야)`);
  check("A5 문항 모양(정답 자리 · 보기 4 · 중복 없음 · 영→한 보기는 뜻 · 한→영 보기는 강의 낱말)", badShape === 0, `문항 ${qs} · 어긋남 ${badShape}${examples.shape ? " · 예 " + examples.shape.join(" ; ") : ""}`);
  check("A6 자리채움 보기 0", placeholders === 0, `${placeholders}${examples.placeholder ? " · 예 " + examples.placeholder.join(" ; ") : ""}`);
  check("A7 정답과 뜻 · 줄기가 겹치는 오답 0(검사 쪽 규칙)", clash === 0, `${clash}${examples.clash ? " · 예 " + examples.clash.join(" ; ") : ""}`);
  check("A8 듣기 문항은 동음이의어 없는 단어만 — 같은 강의 짝(두 목록)은 0", listenHomophone === 0 && listenSameLesson === 0 && listenOtherSameLesson === 0,
    `듣기 문항 ${listenQs}(전체의 ${pct(listenQs, qs)} · 영→한의 ${pct(listenQs, enKoQs)}) · 동음이의어 있는 단어 ${listenHomophone} · 같은 강의 짝(앱 목록) ${listenSameLesson} · (말하기 일꾼 목록) ${listenOtherSameLesson} · 같은 강의 동음 짝 ${sameLessonPairs}${examples.pairs ? " (" + examples.pairs.join(" ; ") + ")" : ""}${examples.listen ? " · 예 " + examples.listen.join(" ; ") : ""}`);
  check("A9 듣기 문항이 약 3분의 1", listenQs / qs > 0.25 && listenQs / qs < 0.36, `${pct(listenQs, qs)}`);
  console.log(`      (참고) 오답 보기 중 같은 줄: 1회차 ${pct(rowShare1[0], rowShare1[1])} · 2회차 ${pct(rowShare[0], rowShare[1])} — 2회차부터 같은 줄 먼저(VOCA-L13)`);
}

// ===================================================================================================================
// B · asking again
// ===================================================================================================================
{
  let bad = 0, sameIndex = 0, sameOptions = 0, reasks = 0, fresh = 0;
  const simulate = (L, answerRight) => {
    let queue = V.generateActiveRecallQuizzes(L.words, L.dictMap, { round: 1, rows: L.rows });
    const asks = new Map();
    for (let i = 0; i < queue.length && i < 1000; i++) {
      const q = queue[i];
      asks.set(q.order, (asks.get(q.order) || 0) + 1);
      const right = answerRight(q, asks.get(q.order));
      const before = queue.length;
      queue = V.queueAfterAnswer(queue, i, right, L.words, L.dictMap, { round: 1, rows: L.rows });
      if (queue.length > before) {
        const again = queue[queue.length - 1];
        reasks++;
        if (again.correctIndex === q.correctIndex) { sameIndex++; note("reidx", `${L.id} ${q.word}`); }
        if (again.options.join("|") === q.options.join("|")) sameOptions++;
        const prevWrong = new Set(q.options.filter((_, k) => k !== q.correctIndex));
        if (again.options.filter((_, k) => k !== again.correctIndex).every((o) => !prevWrong.has(o))) fresh++;
      }
    }
    return asks;
  };
  for (const L of lessons) {
    if (!L.words.length) continue;
    const always = simulate(L, () => false);
    const once = simulate(L, (_q, n) => n > 1);
    const never = simulate(L, () => true);
    for (const [name, asks, want] of [["always", always, 1 + V.MAX_REASKS], ["once", once, 2], ["never", never, 1]]) {
      const off = [...asks.values()].filter((n) => n !== want).length + (asks.size !== L.words.length ? 1 : 0);
      if (off) { bad++; note("reask", `${L.id} ${name}: ${[...asks.values()].join(",")}`); }
    }
  }
  check("B1 틀린 단어 다시 묻기 — 늘 틀리면 3번 · 한 번 틀리면 2번 · 맞히면 1번", bad === 0, `강의 ${lessons.length} × 3 학습자 · 어긋남 ${bad}${examples.reask ? " · 예 " + examples.reask.join(" ; ") : ""} (MAX_REASKS ${V.MAX_REASKS})`);
  check("B2 다시 묻는 문항은 정답 자리가 바뀌고 보기가 다름", sameIndex === 0 && sameOptions === 0, `다시 묻기 ${reasks} · 정답 자리 그대로 ${sameIndex} · 보기 그대로 ${sameOptions} · 오답 보기 셋이 모두 새것 ${fresh}${examples.reidx ? " · 예 " + examples.reidx.join(" ; ") : ""}`);
}

// ===================================================================================================================
// C · Step 4
// ===================================================================================================================
{
  let badPass = 0, samePass = 0;
  for (const L of lessons) {
    if (!L.words.length) continue;
    const p1 = V.generateSpeedDrillItems(L.words, L.dictMap);
    const p2 = V.generateSpeedDrillItems(L.words, L.dictMap);
    const o1 = p1.map((it) => it.order);
    if ([...o1].sort((a, b) => a - b).some((o, i) => o !== i + 1) || p1.some((it) => L.words[it.order - 1] !== it.word)) { badPass++; note("pass", L.id); }
    if (o1.join(",") === p2.map((it) => it.order).join(",")) samePass++;
  }
  check("C1 한 판(pass)에 모든 단어 한 번씩 · 순서 번호가 강의 순서", badPass === 0, `어긋남 ${badPass}${examples.pass ? " · " + examples.pass.join(" ") : ""}`);
  check("C2 다음 판은 다른 순서(31번째부터)", samePass === 0, `같은 순서 ${samePass}/${lessons.length}`);

  const game = ({ think, acc, mode }) => {
    let time = 0, score = 0, combo = 0;
    const lock = V.SPEED_FLASH_MS / 1000;
    for (;;) {
      time += think;
      if (time > V.SPEED_SECONDS) break;
      const isMatch = Math.random() > 0.45;
      const correct = mode === "honest" ? Math.random() < acc : mode === "match" ? isMatch : Math.random() < 0.5;
      combo = correct ? combo + 1 : 0;
      score = Math.max(0, score + V.speedPressPoints(correct, combo));
      time += lock;
    }
    return score;
  };
  const avg = (o) => { let t = 0; for (let i = 0; i < 2000; i++) t += game(o); return Math.round(t / 2000); };
  // a pair shown 1.5 s = 1.1 s of thinking + the 0.4 s answer display; a guesser presses 0.15 s after each pair appears
  const guess = avg({ think: 0.15, mode: "match" });
  const random = avg({ think: 0.15, mode: "random" });
  const honest80 = avg({ think: 1.1, acc: 0.8, mode: "honest" });
  const honest95 = avg({ think: 1.1, acc: 0.95, mode: "honest" });
  const honest95fast = avg({ think: 0.6, acc: 0.95, mode: "honest" });
  check("C3 찍기가 진지한 풀이를 이기지 않음(2,000판 모의)", guess < honest80 && random < honest80 && honest80 < honest95,
    `감점 ${V.SPEED_WRONG_PENALTY} · 표시 ${V.SPEED_FLASH_MS}ms: '맞음'만 빠르게 ${guess} · 아무거나 ${random} < 정직 80%(1.5초) ${honest80} < 95%(1.5초) ${honest95} · 95%(1초) ${honest95fast}`);
}

// ===================================================================================================================
// D · spelling
// ===================================================================================================================
{
  const cases = [
    ["colo(u)r", "color", true], ["colo(u)r", "Colour", true], ["colo(u)r", "colo(u)r", false], ["colo(u)r", "colr", false],
    ["gray(grey)", "grey", true], ["gray(grey)", "graygrey", false], ["autumn(=fall)", "autumn", true], ["autumn(=fall)", "fall", true],
    ["afterward(s)", "afterwards", true], ["afterward(s)", "afterward", true], ["dialog(ue)", "dialogue", true], ["enrol(l)", "enroll", true],
    ["judg(e)ment", "judgement", true], ["medi(a)eval", "medieval", true],
    ["good-bye", "good-bye", true], ["good-bye", "goodbye", true], ["good-bye", "good bye", true], ["good-bye", " Good - Bye ", true], ["good-bye", "goodby", false],
    ["well-done", "well done", true], ["passer-by", "passerby", true], ["upside-down", "upside down", true],
    ["living room", "living room", true], ["living room", "Living  Room", true], ["living room", "livingroom", false],
    ["Mr.", "mr", true], ["Mr.", "Mr.", true], ["Mr.", "mister", false], ["o'clock", "o’clock", true], ["o'clock", "oclock", false],
    ["Monday", "monday", true], ["do", "do ", true], ["do", "due", false], ["do", "", false],
  ];
  const bad = cases.filter(([w, typed, want]) => V.checkSpelling(typed, w) !== want);
  check("D1 철자 채점(괄호 · 하이픈 · 두 낱말 · 대소문자 · 마침표 · 곧은/굽은 따옴표)", bad.length === 0, `${cases.length}경우 중 어긋남 ${bad.length}${bad.length ? " · " + bad.map(([w, t, want]) => `${w} ← "${t}" 기대 ${want}`).join(" ; ") : ""}`);
  // every headword's own written form (bracket words: both forms) is accepted — all 3,904
  let refused = 0;
  const seen = new Set();
  for (const L of lessons) for (const w of L.words) {
    if (seen.has(w)) continue;
    seen.add(w);
    for (const form of V.spellingForms(w)) if (!V.checkSpelling(form, w)) { refused++; note("own", `${w} ← ${form}`); }
    if (!/[()]/.test(w) && !V.checkSpelling(w, w)) { refused++; note("own", w); }
  }
  check("D2 모든 표제어가 제 철자로 맞음", refused === 0, `표제어 ${seen.size} · 거절 ${refused}${examples.own ? " · 예 " + examples.own.join(" ; ") : ""}`);
}

// ===================================================================================================================
// E · Leitner
// ===================================================================================================================
{
  const words = ["do", "can", "not", "have", "say", "go"];
  const meaningOf = (w) => `${w}-뜻`;
  const T0 = Date.parse("2026-09-20T10:00:00Z");
  // an old record: the page opened at T0 (all six created, box 1 · streak 0), 'do' answered wrong 40 s later, 'can' right,
  // 'not' promoted by the old '승급' button (box 2, time untouched), 'have' mastered by the old '마스터 체크' (box 3 · streak 1)
  const old = {
    do: { word: "do", meaning: "하다", box: 1, lastTestedAt: T0 + 40_000, streak: 0 },
    can: { word: "can", meaning: "할 수 있다", box: 2, lastTestedAt: T0 + 55_000, streak: 1 },
    not: { word: "not", meaning: "아니다", box: 2, lastTestedAt: T0 + 3, streak: 0 },
    have: { word: "have", meaning: "가지다", box: 3, lastTestedAt: T0 + 70_000, streak: 1 },
    say: { word: "say", meaning: "말하다", box: 1, lastTestedAt: T0 + 1, streak: 0 },
    go: { word: "go", meaning: "가다", box: 1, lastTestedAt: T0 + 2, streak: 0 },
  };
  const read = V.readLeitnerCards(old, words, meaningOf);
  const got = Object.fromEntries(words.map((w) => [w, read[w].box]));
  const want = { do: 1, can: 2, not: 2, have: 3, say: 0, go: 0 };
  const okOld = words.every((w) => got[w] === want[w]) && words.every((w) => read[w].v === 2 && read[w].meaning === meaningOf(w));
  check("E1 옛 기록: 같은 순간 2초 안의 box1 · streak0 → 새 단어, 실제 답은 그대로", okOld, `읽음 ${JSON.stringify(got)} · 기대 ${JSON.stringify(want)}`);
  // a quiz answered to the end: no untouched card; its FIRST answer (wrong) is alone at the earliest moment — stays 틀림
  const full = { do: { word: "do", meaning: "", box: 1, lastTestedAt: T0 + 5_000, streak: 0 }, can: { word: "can", meaning: "", box: 2, lastTestedAt: T0 + 9_000, streak: 1 } };
  const readFull = V.readLeitnerCards(full, ["do", "can"], meaningOf);
  check("E2 옛 기록 — 끝까지 푼 퀴즈의 첫 오답은 새 단어가 아님", readFull.do.box === 1 && readFull.can.box === 2, `do ${readFull.do.box} · can ${readFull.can.box}`);
  // new record read again: unchanged
  const again = V.readLeitnerCards(JSON.parse(JSON.stringify(read)), words, meaningOf);
  check("E3 새 기록은 다시 읽어도 그대로", words.every((w) => again[w].box === read[w].box && again[w].streak === read[w].streak), JSON.stringify(Object.fromEntries(words.map((w) => [w, again[w].box]))));
  // the streak grows once a learning day; three different days master a word; a wrong answer resets
  let cards = V.readLeitnerCards(null, ["say"], meaningOf);
  const day = (d) => `2026-09-${String(d).padStart(2, "0")}`;
  cards = V.updateLeitnerCard(cards, "say", "말하다", true, day(21), T0);
  cards = V.updateLeitnerCard(cards, "say", "말하다", true, day(21), T0 + 60_000);
  cards = V.updateLeitnerCard(cards, "say", "말하다", true, day(21), T0 + 120_000);
  const sameDay = { box: cards.say.box, streak: cards.say.streak };
  cards = V.updateLeitnerCard(cards, "say", "말하다", true, day(22), T0 + 86_400_000);
  cards = V.updateLeitnerCard(cards, "say", "말하다", true, day(24), T0 + 3 * 86_400_000);
  const threeDays = { box: cards.say.box, streak: cards.say.streak };
  cards = V.updateLeitnerCard(cards, "say", "말하다", false, day(25), T0 + 4 * 86_400_000);
  const afterWrong = { box: cards.say.box, streak: cards.say.streak };
  check("E4 하루 한 번만 연속 정답 · 서로 다른 3일에 외움 · 틀리면 틀림", sameDay.box === 2 && sameDay.streak === 1 && threeDays.box === 3 && threeDays.streak === 3 && afterWrong.box === 1 && afterWrong.streak === 0,
    `같은 날 3번 맞힘 → box ${sameDay.box} · streak ${sameDay.streak} / 3일 → box ${threeDays.box} · ${threeDays.streak} / 틀림 → box ${afterWrong.box} · ${afterWrong.streak}`);
  const marked = V.setLeitnerKnown(V.readLeitnerCards(null, ["go"], meaningOf), "go", "가다", true);
  const unmarked = V.setLeitnerKnown(marked, "go", "가다", false);
  check("E5 '안다고 표시'는 상자를 옮기지 않음", marked.go.box === 0 && marked.go.known === true && unmarked.go.known === undefined && unmarked.go.box === 0, `표시 box ${marked.go.box} known ${marked.go.known} · 해제 known ${unmarked.go.known}`);
}

// ===================================================================================================================
// F · engine keys
// ===================================================================================================================
{
  const { extractSentencesForAudio } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs")).loadTs(path.join(REPO, "src/lib/lessonAudioText.ts"));
  let bad = 0;
  const letters = (s) => String(s || "").replace(/[^A-Za-z]/g, "").toLowerCase();
  for (const L of lessons) {
    const raw = JSON.parse(fs.readFileSync(path.join(LDIR, `${L.id}.json`), "utf8"));
    // the lesson's own blocks, as the page passes them (the speech form is left out: it only changes how a word is said)
    const heard = extractSentencesForAudio(raw.blocks, null, false, "phonics", null, null, (t) => t);
    if (heard.length !== L.words.length || heard.some((t, i) => letters(t) !== letters(L.words[i]))) { bad++; note("keys", `${L.id}: ${heard.length} vs ${L.words.length}`); }
  }
  check("F1 엔진 열쇠의 순서(격자를 줄 순서로, 1부터) = 전체 듣기가 읽는 순서", bad === 0, `강의 ${lessons.length} · 어긋남 ${bad}${examples.keys ? " · " + examples.keys.join(" ; ") : ""}`);
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${failed.length ? `어긋남 ${failed.length}/${results.length}` : `모두 통과 ${results.length}/${results.length}`}${BREAK ? ` (--break ${BREAK})` : ""}`);
process.exit(failed.length ? 1 : 0);
