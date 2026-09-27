#!/usr/bin/env node
/**
 * 2026-09-27 — STUDENT 학습법 · 화면 고침(D02 · D14 · D16 · STU-L03 · L05 · L15)의 규칙을 앱의 TypeScript 그대로(tsload) 414문장 모두에 대어 봄.
 * 브라우저 없이 · 저장소를 바꾸지 않음. 하나라도 어긋나면 exit 1.
 *
 *   1. 낱말 자르기: studentDictation.tokensOf 가 모든 꼴에서 generateWordBank 의 acceptedWordSequences 와 글자까지 같다.
 *   2. 두 번에 조립(D16): 16낱말 이상 문장 수 · 나눈 문장 수 · 한 번에 보이는 타일 최대(나눈 부분 · 통째 문장).
 *   3. 모든 문장 · 모든 꼴(He/She · sir/ma'am …)을 부분마다 그 부분의 타일로 만들 수 있고, 앞 부분은 checkPart 가 'part',
 *      마지막은 'correct' — 그리고 그 낱말 전체를 **판정기 verifyAnyWordSequence** 가 받는다(판정은 바뀌지 않음).
 *   4. 거꾸로 놓은 앞부분은 'wrong' · 틀린 타일 뒤 힌트는 그 타일부터 되돌리고 맞는 낱말을 넣음 · 힌트만으로 채우면 '힌트로 완성'.
 *   5. 방해 낱말은 같은 강의 다른 문장의 낱말뿐(고정 목록에서 온 것 0).
 *   6. 첫 타일의 대문자: 남는 낱말 목록(I · I'm · 문장 중간 대문자 낱말 · 한국어 낱말 · Buddhists).
 *   7. 내 정보 칸(STU-L03): 20문장 · 14강(s1-2 #1 의 Hong Gil Dong · Seoul 포함, s20-5 #6 제외), 칸 자리가 모든 꼴에서 같음.
 *
 *   node docs/qa-2026-09-18/scripts/check-student-dictation.cjs [--list] [--break=judge|blank|fixedlist|pool]
 *   --break=judge     : 마지막 부분에서 낱말 하나를 빼고 판정 — 모든 꼴이 FAIL(exit 1) 이 나야 검사가 살아 있는 것
 *   --break=blank     : s20-5 #6 도 빈칸으로 셈 — 21문장 · 15강이 되어 FAIL
 *   --break=fixedlist : 화면의 타일 대신 generateWordBank(문장, []) 그대로를 셈 — 고정 목록 방해 낱말이 잡혀 FAIL
 *   --break=pool      : 방해 낱말 풀을 비움 — 고정 목록 낱말은 여전히 0(걸러짐) · 방해 낱말 없는 문장만 늘어남(보고만 · PASS)
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const U = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const D = loadTs(path.join(REPO, "src/lib/studentDictation.ts"));
const B = loadTs(path.join(REPO, "src/lib/studentBlanks.ts"));
// the server's course-wide proper nouns (the view gets only a true/false per sentence of its own lesson)
const T = loadTs(path.join(REPO, "src/lib/studentCourseText.ts"));

const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const LIST = process.argv.includes("--list");
const DEFAULT_DISTRACTORS = new Set(["was", "the", "with", "in", "at", "for", "on", "is", "he", "she", "we", "are", "very"]);

// a fixed random, so the numbers are the same on every run
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/student.json"), "utf8"));
const lessons = index.lessons.map((l) => l.id).map((id) => {
  const L = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", `${id}.json`), "utf8"));
  const block = (L.blocks || []).find((b) => b.type === "sentences");
  return { id, texts: ((block && block.items) || []).map((it) => it.text) };
});
const allTexts = lessons.flatMap((l) => l.texts);
const capitals = T.studentCapitalsFrom(allTexts);

const fails = [];
const fail = (msg) => fails.push(msg);
const stat = { sentences: 0, forms: 0, long: 0, split: 0, longWhole: [], maxTilesSplit: 0, maxTilesWhole: 0, maxTilesAll: 0, over16: 0, fixedListDistractors: 0, noDistractor: 0, blanks: [], keptFirst: new Map(), lowered: new Map(), hintProbes: 0, wrongProbes: 0 };

for (const { id, texts } of lessons) {
  const keep = D.firstWordKeepsCase(texts, capitals);
  texts.forEach((text, i) => {
    stat.sentences++;
    const where = `${id} #${i + 1}`;
    const bank = U.generateWordBank(text, []);
    const accepted = bank.acceptedWordSequences;
    // 1 · tokens
    const forms = U.expandSlashAlternatives(text);
    forms.forEach((f, j) => {
      const toks = D.tokensOf(f).map((t) => t.word);
      if (toks.join("\u0001") !== (accepted[j] || []).join("\u0001")) fail(`${where}: tokens differ from generateWordBank in form ${j + 1}`);
    });
    // 7 · blanks
    let blanks = B.blanksOf(id, i, text);
    if (BREAK === "blank" && id === "s20-5" && i === 5) blanks = [{ key: `${id}#6:0`, start: text.indexOf("("), end: text.indexOf(")") + 1, text: text.slice(text.indexOf("("), text.indexOf(")") + 1), label: "x" }];
    const runs = B.fixedRunsOf(text, blanks);
    if (blanks.length) {
      stat.blanks.push({ where, lesson: id, blanks: blanks.map((b) => b.text) });
      if (!runs) fail(`${where}: blank positions differ between the slash forms`);
    }
    // 2 · build
    const pool = BREAK === "pool" ? [] : D.distractorPool(texts, keep, i, seeded(stat.sentences));
    const d = D.buildDictation(text, { pool, fixed: runs || [], keepFirstCase: keep[i], allowSplit: true, random: seeded(stat.sentences * 7) });
    if (d.fixed.length !== (runs || []).length) fail(`${where}: fixed runs were dropped (${(runs || []).length} → ${d.fixed.length})`);
    const n = d.words.length;
    if (n >= D.SPLIT_MIN_WORDS) {
      stat.long++;
      if (d.parts.length === 2) stat.split++;
      else stat.longWhole.push(`${where} (${n})`);
    }
    for (const part of d.parts) {
      const size = part.tiles.length;
      if (d.parts.length === 2) stat.maxTilesSplit = Math.max(stat.maxTilesSplit, size);
      else stat.maxTilesWhole = Math.max(stat.maxTilesWhole, size);
      stat.maxTilesAll = Math.max(stat.maxTilesAll, size);
      if (size > 16) stat.over16++;
      if (d.parts.length === 2 && (part.end - part.start < D.PART_MIN_WORDS)) fail(`${where}: a part shorter than ${D.PART_MIN_WORDS} words`);
    }
    // 5 · distractors
    const poolKeys = new Set(pool.map((w) => w.toLowerCase()));
    const inSentence = new Set(accepted.flat().map((w) => w.toLowerCase()));
    // --break=fixedlist: count the raw generateWordBank bank instead of the view's parts — its fixed-list words must be caught
    const shown = BREAK === "fixedlist" ? bank.allTiles : d.parts.flatMap((p) => p.tiles);
    const extras = shown.filter((t) => !inSentence.has(t.word.toLowerCase()));
    for (const t of extras) if (!poolKeys.has(t.word.toLowerCase()) || (DEFAULT_DISTRACTORS.has(t.word.toLowerCase()) && !poolKeys.has(t.word.toLowerCase()))) stat.fixedListDistractors++;
    if (!extras.length) stat.noDistractor++;
    // 6 · first tile case
    const firstTiles = d.parts[0].tiles.filter((t) => accepted.some((seq) => seq[0] === t.word) && !(runs || []).some((r) => r.run.start === 0));
    for (const t of firstTiles) {
      const bucket = t.label === t.word && /^[A-Z]/.test(t.word) ? stat.keptFirst : stat.lowered;
      bucket.set(t.word, (bucket.get(t.word) || 0) + 1);
    }
    // 3 · every form through the parts, judged by verifyAnyWordSequence
    const fixedPos = new Set(d.fixed.flatMap((r) => Array.from({ length: r.length }, (_, k) => r.start + k)));
    accepted.forEach((seq, j) => {
      stat.forms++;
      let locked = [];
      d.parts.forEach((part, p) => {
        const need = [];
        for (let pos = part.start; pos < part.end; pos++) if (!fixedPos.has(pos)) need.push(seq[pos]);
        let chosen = need.slice();
        if (BREAK === "judge" && p === d.parts.length - 1) chosen = chosen.slice(0, -1);
        // the part's tiles must hold these words
        const free = part.tiles.map((t) => t.word.toLowerCase());
        for (const w of chosen) {
          const k = free.indexOf(w.toLowerCase());
          if (k < 0) { fail(`${where} form ${j + 1} part ${p + 1}: no tile for "${w}"`); return; }
          free.splice(k, 1);
        }
        const r = D.checkPart(d, p, locked, chosen);
        const want = p === d.parts.length - 1 ? "correct" : "part";
        if (r.verdict !== want) fail(`${where} form ${j + 1} part ${p + 1}: ${r.verdict} (expected ${want})`);
        locked = D.answerSoFar(d, p, locked, chosen);
      });
      if (!U.verifyAnyWordSequence(locked, accepted) && BREAK !== "judge") fail(`${where} form ${j + 1}: the judge refuses the assembled words`);
      if (BREAK === "judge" && U.verifyAnyWordSequence(locked, accepted)) fail(`${where} form ${j + 1}: (break) a short answer was accepted`);
    });
    // 4 · wrong answer and hints on part 1
    const p0 = d.parts[0];
    const need0 = [];
    for (let pos = p0.start; pos < p0.end; pos++) if (!fixedPos.has(pos)) need0.push(d.words[pos]);
    const reversed = need0.slice().reverse();
    if (reversed.join(" ").toLowerCase() !== need0.join(" ").toLowerCase()) {
      stat.wrongProbes++;
      const r = D.checkPart(d, 0, [], reversed);
      if (r.verdict !== "wrong") fail(`${where}: reversed part 1 was ${r.verdict}`);
    }
    // hints only → the part is filled right, and it counts as '힌트로 완성'
    let chosen = [];
    let hints = 0;
    for (let guard = 0; guard < 80; guard++) {
      const h = D.hintStep(d, 0, [], chosen);
      if (!h.add) break;
      chosen = [...chosen.slice(0, h.keep), h.add];
      hints++;
    }
    const hr = D.checkPart(d, 0, [], chosen.map((t) => t.word));
    if (hr.verdict !== (d.parts.length === 1 ? "correct" : "part")) fail(`${where}: hints alone gave ${hr.verdict}`);
    if (d.parts.length === 1 && hints !== need0.length) fail(`${where}: ${hints} hints for ${need0.length} tiles`);
    if (d.parts.length === 1 && need0.length >= 3 && !D.hintedTooMuch(d, hints)) fail(`${where}: all-hint answer not counted as 힌트로 완성`);
    // a wrong tile first, then a hint: the wrong tile goes back and the right word comes in
    // a tile that is the first word of NO accepted form ("She" is right for "He/She …")
    const wrongTile = p0.tiles.find((t) => !accepted.some((seq) => (seq[p0.start] || "").toLowerCase() === t.word.toLowerCase()) && !fixedPos.has(p0.start));
    if (wrongTile && need0.length > 1) {
      stat.hintProbes++;
      const h = D.hintStep(d, 0, [], [wrongTile]);
      if (h.keep !== 0 || !h.add || h.add.word.toLowerCase() !== need0[0].toLowerCase()) fail(`${where}: hint after a wrong first tile kept ${h.keep} and added ${h.add && h.add.word}`);
    }
  });
}

const blankLessons = new Set(stat.blanks.map((b) => b.lesson));
if (stat.sentences !== 414) fail(`sentences ${stat.sentences} (expected 414)`);
if (stat.blanks.length !== 20 || blankLessons.size !== 14) fail(`blank sentences ${stat.blanks.length} in ${blankLessons.size} lessons (expected 20 in 14)`);
if (stat.fixedListDistractors) fail(`${stat.fixedListDistractors} distractor tile(s) from the fixed list`);

const fmt = (m) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([w, c]) => `${w}${c > 1 ? `×${c}` : ""}`).join(", ");
console.log(`STUDENT 문장 ${stat.sentences} · 정답 꼴 ${stat.forms} · 강의 ${lessons.length}${BREAK ? ` · BREAK=${BREAK}` : ""}`);
console.log(`16낱말 이상 ${stat.long} · 두 번에 나눔 ${stat.split} · 통째로 둠 ${stat.longWhole.length}${stat.longWhole.length ? ` (${stat.longWhole.join(", ")})` : ""}`);
console.log(`한 번에 보이는 타일 최대: 나눈 문장의 한 부분 ${stat.maxTilesSplit} · 통째 문장 ${stat.maxTilesWhole} · 16개 넘는 부분 ${stat.over16}`);
console.log(`방해 낱말: 고정 목록에서 온 것 ${stat.fixedListDistractors} · 방해 낱말 없는 문장 ${stat.noDistractor}`);
console.log(`첫 타일 대문자로 남음: ${fmt(stat.keptFirst)}`);
if (LIST) console.log(`첫 타일 소문자로: ${fmt(stat.lowered)}`);
console.log(`내 정보 칸: ${stat.blanks.length}문장 · ${blankLessons.size}강`);
for (const b of stat.blanks) console.log(`   ${b.where}: ${b.blanks.join(" · ")}`);
console.log(`거꾸로 놓은 앞부분 오답 확인 ${stat.wrongProbes} · 틀린 첫 타일 뒤 힌트 확인 ${stat.hintProbes}`);
console.log(fails.length ? `\nFAIL ${fails.length}` : "\nPASS — 모든 문장 · 모든 꼴이 부분 조립으로 판정기를 통과");
for (const f of fails.slice(0, 30)) console.log("  " + f);
if (fails.length > 30) console.log(`  … ${fails.length - 30} more`);
process.exitCode = fails.length ? 1 : 0;
