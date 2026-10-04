#!/usr/bin/env node
/**
 * 2026-09-27 — LISTENING 학습법 · 화면 고침(계획 F02 · F03 · D24 나)의 규칙을 앱의 TypeScript 그대로(tsload) LISTENING 2,217줄 모두에 대어 봄.
 * 브라우저 없이 · 저장소를 바꾸지 않음(--write-removed 를 줄 때만 그 파일 하나를 씀). 하나라도 어긋나면 exit 1.
 *
 *   A 빈칸(D24 나 · src/lib/ldDictation.ts lessonBlanks)
 *     1. 낱말 자르기가 generateWordBank 의 correctWords 와 글자까지 같다(2,217줄).
 *     2. 빈칸마다 보기 3개 · 정답 1개 · 서로 다름(대소문자 · 아포스트로피를 빼고도) · 정답이 그 자리 낱말.
 *     3. 비단어 0: 보기는 이 사이트 영어 글(LISTENING · STUDENT · READING · GRAMMAR)에 실제로 나오는 낱말이거나 아래 확인 목록의 낱말.
 *     4. 대문자 단서 0: 한 빈칸의 보기 셋은 모두 소문자이거나, 모두 대문자로 시작(문장 첫 낱말)이거나, 모두 I 꼴.
 *     5. 이름(문장 가운데의 대문자 낱말) 빈칸 0 · 힌트에 있는 숫자 빈칸 0.
 *     6. 같은 보기 셋이 한 강의에서 3줄 넘게 0 · 한 줄 빈칸 0~6 · 후보가 3개 이상인 줄은 빈칸 3개 이상.
 *     7. 정답 보기를 고르면 맞음, 다른 보기는 틀림 · 쓴 답은 쓴 줄 채점과 같이(숫자를 말로 써도 맞음).
 *   B 블록(lessonDistractors · blockTiles)
 *     1. 방해 블록: 그 줄에 없는 낱말 · 비단어 0(짝 표 또는 그 강의 다른 줄의 낱말 그대로) · 소문자 · 숫자 없음 · 소리만 같은 꼴 0.
 *     2. 같은 방해 짝이 한 강의에서 3줄 넘게 0 (고치기 전: 257강).
 *     3. 블록에 정답 낱말이 다 있고 판정기(verifyAnyWordSequence)가 받음 · 거꾸로 놓은 것은 틀림.
 *     4. 대문자 블록: I 꼴 · 그 강의의 이름 · 'Capital+소문자' 꼴이 아닌 것만. 첫 블록이 대문자인데 같은 낱말이 강의에 소문자로도 나오는 줄 0 (고치기 전 1,045).
 *   C 소리 클리닉(F03 · generateLiaisonPoints) — 바탕 커밋의 함수와 견줌
 *     1. 새 카드는 옛 카드의 부분 집합(늘어난 카드 0) · 틀린 부류 0(going to + 동사 아님 · have one · 문장부호를 넘는 짝 · 축약 조각 ·
 *        자음 소리로 시작하는 낱말 앞 · '100%' '95%' 글).
 *     2. LISTENING 소리 낼 글(scripts/lib/spoken-texts.cjs — 생성기와 같은 정의)의 차이: 새로 생긴 글 0, 빠진 글 목록(--write-removed).
 *   D generateWordBank 기본값 그대로 — 옛 함수와 새 함수에 같은 난수를 주고 STUDENT 414문장(화면이 넘기는 방해 낱말 풀) · 빈 풀 ·
 *     LISTENING 옛 풀로 돌려 결과가 글자까지 같음.
 *   E 기기 기록(src/lib/ldLearning.ts): 옛 기록을 그대로 읽음(맞힌 줄 = 채점한 줄) · 복습 열쇠 d001-1 → d001#n · 복습에 들어오는 줄.
 *
 *   node docs/qa-2026-09-18/scripts/check-ld-dictation-0927.cjs [--base <커밋, 기본 f2a1b2d>] [--write-removed <json>]
 *        [--break=nonword|capital|repeat|distractor|identity|liaison|migrate]
 *   --break=…: 검사할 결과 하나를 메모리 안에서 일부러 깨서 FAIL(exit 1)이 나는지 — 검사가 실패할 수 있음을 보임(파일은 그대로).
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const E = require("./lib/expectations.cjs");
const spoken = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));

const argv = process.argv.slice(2);
const arg = (n, d) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : d);
const BASE = arg("--base", "f2a1b2d");
const WRITE_REMOVED = arg("--write-removed", null);
const BREAK = (argv.find((a) => a.startsWith("--break")) || "").replace(/^--break=?/, "") || (argv.includes("--break") ? "nonword" : "");
if (BREAK && !["nonword", "capital", "repeat", "distractor", "identity", "liaison", "migrate"].includes(BREAK)) {
  console.error(`--break=${BREAK} 는 없다`);
  process.exit(2);
}

const U = loadTs(path.join(REPO, "src/lib/listeningUtils.ts"));
const D = loadTs(path.join(REPO, "src/lib/ldDictation.ts"));
const R = loadTs(path.join(REPO, "src/lib/ldLearning.ts"));
const SD = loadTs(path.join(REPO, "src/lib/studentDictation.ts"));
const ST = loadTs(path.join(REPO, "src/lib/studentCourseText.ts"));
const US = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const VS = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const LA = loadTs(path.join(REPO, "src/lib/lessonAudioText.ts"));
const LS = loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts"));
// the base commit's listeningUtils (import-free — it is loaded alone, like the clip generator loads it)
const oldFile = path.join(os.tmpdir(), `listeningUtils-${BASE}-${process.pid}.ts`);
fs.writeFileSync(oldFile, execFileSync("git", ["show", `${BASE}:src/lib/listeningUtils.ts`], { cwd: REPO, encoding: "utf8" }));
const OLD = loadTs(oldFile);
fs.unlinkSync(oldFile);

const strip = (s) => String(s).replace(/^﻿/, "");
const readJson = (rel) => JSON.parse(strip(fs.readFileSync(path.join(REPO, rel), "utf8")));
const S = readJson("content/ld_english_scripts.json");
const routes = readJson("src/lib/generated/validRoutes.json").lessons;
const LD_IDS = (routes.ld || []).filter((id) => /^d\d{3}$/.test(id));

const fails = [];
const fail = (msg) => fails.push(msg);
const norm = (w) => String(w).toLowerCase().replace(/’/g, "'");
const bare = (w) => norm(w).replace(/'/g, "");
const I_FORM = /^I(?:['’](?:m|ve|ll|d))?$/;

// ---------------------------------------------------------------------------------------------------------------
// The site's English words — an option that none of them uses must be on the reviewed list below
// ---------------------------------------------------------------------------------------------------------------
const TOKEN = /[A-Za-z]+(?:['’][A-Za-z]+)*/g;
const attested = new Set();
const addWords = (text) => { for (const m of String(text || "").match(TOKEN) || []) attested.add(norm(m)); };
for (const rows of Object.values(S)) for (const r of rows || []) addWords(r.en);
for (const course of ["student", "reading", "grammar1", "grammar2"]) {
  const dir = path.join(REPO, "content/lessons", course);
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const L = JSON.parse(strip(fs.readFileSync(path.join(dir, f), "utf8")));
    for (const b of L.blocks || []) {
      if (b.type === "sentences") for (const it of b.items || []) if (it && !/[가-힣]/.test(it.text || "")) addWords(it.text);
    }
    for (const s of L.readingSentences || []) addWords(s.english);
  }
}
/** Real English words the options use that no lesson of the site happens to contain — read by a person (2026-09-27). */
const REVIEWED = new Set([
  "bean", "wear", "hour", "far", "form", "vary", "money", "onto", "bought", "note", "won", "sea", "seen", "gave", "gives", "came", "comes",
  "took", "takes", "gets", "made", "makes", "knew", "knows", "said", "says", "own", "may", "me", "we", "fifth", "sixth", "seventh", "eighth",
  "ninth", "third", "fourth",
  // the written-out forms of ldDictation's regular verbs that no lesson happens to use
  "hurries", "cleaned", "climbs", "shopped", "orders", "rents", "rests", "dies", "jumps", "explains", "picks",
]);

// ---------------------------------------------------------------------------------------------------------------
// A · blanks
// ---------------------------------------------------------------------------------------------------------------
const stat = { lines: 0, blanks: 0, dist: {}, belowThree: 0, belowThreeWithCandidates: 0, reviewedUsed: new Set(), sentenceStart: 0, iForm: 0, numbers: 0, byKind: {} };
const lessonsData = [];
for (const id of LD_IDS) {
  const L = readJson(`content/lessons/ld/${id}.json`);
  const hb = (L.blocks || []).find((b) => b.type === "hints");
  const chunks = E.hintChunks(hb ? hb.text : "");
  const rows = S[id] || [];
  const lines = rows.map((r) => r.en);
  lessonsData.push({ id, rows, lines, chunks });
}

for (const { id, rows, lines, chunks } of lessonsData) {
  const res = D.lessonBlanks(lines, id, chunks);
  const hintNumbers = new Set(chunks.flatMap((c) => D.tokensOf(c).map((t) => norm(t.word))).filter((w) => /^\d+$|teen$|ty$/.test(w)));
  if (BREAK === "nonword" && res[0] && res[0].blanks[0]) {
    const o = res[0].blanks[0].options;
    o[o.findIndex((x) => norm(x) !== norm(res[0].blanks[0].word))] = "wasnt"; // the non-word the old pool made ("wasn't" with its apostrophe cut)
  }
  if (BREAK === "capital" && res[0] && res[0].blanks[0]) {
    const o = res[0].blanks[0].options;
    const k = o.findIndex((x) => norm(x) !== norm(res[0].blanks[0].word));
    o[k] = o[k].charAt(0).toUpperCase() + o[k].slice(1);
  }
  if (BREAK === "repeat" && res.length >= 4) for (let i = 1; i < 4; i++) res[i].blanks = res[0].blanks.map((b) => ({ ...b }));
  const tripleUse = new Map();
  res.forEach((r, i) => {
    stat.lines++;
    const where = `${id} #${i + 1}`;
    const en = lines[i];
    const toks = D.tokensOf(en);
    const bank = U.generateWordBank(en, []);
    if (toks.map((t) => t.word).join("\u0001") !== bank.correctWords.join("\u0001")) fail(`${where}: tokens differ from generateWordBank`);
    stat.blanks += r.blanks.length;
    stat.dist[r.blanks.length] = (stat.dist[r.blanks.length] || 0) + 1;
    if (r.blanks.length > 6) fail(`${where}: ${r.blanks.length} blanks`);
    if (r.blanks.length < 3) {
      stat.belowThree++;
      // fewer than 3 only when the line has fewer candidates, or the rest reached the repeat limit of the lesson
      if (r.blanks.length + r.capped < Math.min(3, r.candidates)) { stat.belowThreeWithCandidates++; fail(`${where}: ${r.blanks.length} blanks while ${r.candidates} candidates (${r.capped} at the repeat limit)`); }
      if (r.capped) stat.cappedLines = (stat.cappedLines || 0) + 1;
    }
    for (const b of r.blanks) {
      const tok = toks[b.index];
      if (!tok || tok.word !== b.word) { fail(`${where}: blank ${b.word} is not the word at ${b.index}`); continue; }
      if (b.options.length !== 3) fail(`${where}: ${b.word} has ${b.options.length} options`);
      if (b.options.filter((o) => norm(o) === norm(b.word)).length !== 1) fail(`${where}: ${b.word} — the answer is not exactly one option (${b.options.join("/")})`);
      if (new Set(b.options.map(bare)).size !== b.options.length) fail(`${where}: ${b.word} — two options spelled alike but for case or an apostrophe (${b.options.join("/")})`);
      for (const o of b.options) {
        if (norm(o) === norm(b.word)) continue;
        if (!/^[A-Za-z]+(?:'[A-Za-z]+)?$|^\d+$/.test(o)) fail(`${where}: option "${o}" is not a word`);
        else if (/^\d+$/.test(o)) continue;
        else if (!attested.has(norm(o))) {
          if (REVIEWED.has(norm(o))) stat.reviewedUsed.add(norm(o));
          else fail(`${where}: option "${o}" — no lesson of the site uses it and it is not on the reviewed list`);
        }
      }
      const shapes = new Set(b.options.map((o) => (I_FORM.test(o) ? "I" : /^[A-Z]/.test(o) ? "Cap" : "low")));
      if (shapes.size !== 1) fail(`${where}: ${b.word} — a capital tells the answer (${b.options.join("/")})`);
      if ([...shapes][0] === "Cap") stat.sentenceStart++;
      if ([...shapes][0] === "I") stat.iForm++;
      // a capital in the middle of a sentence is a name: never blanked
      const before = en.slice(0, tok.start);
      const initial = b.index === 0 || (/[.!?]["”’)]?\s*$|[“"‘(]\s*$/.test(before) && !/\b(?:Mr|Mrs|Ms|Dr|Mt|St|Jr|Sr|Prof)\.\s*$/.test(before));
      if (/^[A-Z]/.test(b.word) && !I_FORM.test(b.word) && !initial) fail(`${where}: blanked a name "${b.word}"`);
      if (/^\d+$|teen$|ty$/.test(norm(b.word)) && hintNumbers.has(norm(b.word))) fail(`${where}: blanked "${b.word}", which the hints give`);
      if (/^\d+$/.test(b.word) || /teen$|ty$/.test(norm(b.word))) stat.numbers++;
      // the judge: the right option is right, the other two are wrong; the answer typed is right
      for (const o of b.options) if (D.blankRight(o, b.word, false) !== (norm(o) === norm(b.word))) fail(`${where}: blankRight(${o}, ${b.word}) wrong`);
      if (!D.blankRight(b.word.toLowerCase(), b.word, true)) fail(`${where}: typed "${b.word.toLowerCase()}" refused`);
      const key = b.options.map(norm).sort().join("|");
      tripleUse.set(key, (tripleUse.get(key) || 0) + 1);
    }
  });
  for (const [key, n] of tripleUse) if (n > D.MAX_REPEAT) fail(`${id}: options ${key} on ${n} lines (max ${D.MAX_REPEAT})`);
}
// typed numbers as heard
if (!D.blankRight("fifteen", "15", true) || !D.blankRight("15", "fifteen", true) || D.blankRight("fifty", "15", true)) fail("typed number blanks are not judged like typed lines");

// ---------------------------------------------------------------------------------------------------------------
// B · blocks
// ---------------------------------------------------------------------------------------------------------------
const bstat = { lines: 0, pairRepeatLessons: 0, groupDistractors: 0, lineDistractors: 0, oneDistractor: 0, capitalFirstClue: 0, capitalTiles: 0 };
for (const { id, lines, chunks } of lessonsData) {
  const dist = D.lessonDistractors(lines, id);
  if (BREAK === "distractor" && dist[0]) dist[0] = ["Im", dist[0][1] || "the"];
  if (BREAK === "repeat" && dist.length >= 4) for (let i = 1; i < 4; i++) dist[i] = [...dist[0]];
  const caps = D.lessonCapitals(lines, chunks);
  const lessonWords = new Set(lines.flatMap((l) => D.tokensOf(l).map((t) => t.word)));
  const lowerSomewhere = new Set(lines.flatMap((l) => D.tokensOf(l).map((t) => t.word).filter((w) => /^[a-z]/.test(w))).map(norm));
  const groupWords = new Set(D.SOUND_ALIKE_GROUPS.flat());
  const pairUse = new Map();
  let repeated = false;
  dist.forEach((pair, i) => {
    bstat.lines++;
    const where = `${id} #${i + 1}`;
    const words = D.tokensOf(lines[i]).map((t) => t.word);
    const have = new Set(words.map(norm));
    const alike = new Set(words.map((w) => bare(w).replace(/s$/, "")));
    if (pair.length < 2) bstat.oneDistractor++;
    for (const w of pair) {
      if (groupWords.has(w)) bstat.groupDistractors++;
      else if (lessonWords.has(w)) bstat.lineDistractors++;
      else fail(`${where}: distractor "${w}" is neither a sound-alike word nor a word of the lesson`);
      if (have.has(norm(w))) fail(`${where}: distractor "${w}" is in the line`);
      if (!groupWords.has(w) && alike.has(bare(w).replace(/s$/, ""))) fail(`${where}: distractor "${w}" sounds like a word of the line`);
      if (/[A-Z]/.test(w) || /\d/.test(w)) fail(`${where}: distractor "${w}" has a capital or a digit`);
    }
    if (pair.length === 2) {
      const key = pair.map(norm).sort().join("|");
      pairUse.set(key, (pairUse.get(key) || 0) + 1);
    }
    // the tiles: every word there, the judge takes the line, a reversed line is wrong
    const t = D.blockTiles(lines[i], pair, caps);
    const pool = t.tiles.map((x) => norm(x.word));
    for (const w of t.words) {
      const k = pool.indexOf(norm(w));
      if (k < 0) { fail(`${where}: no tile for "${w}"`); break; }
      pool.splice(k, 1);
    }
    if (!U.verifyAnyWordSequence(t.words, t.accepted)) fail(`${where}: the judge refuses the line`);
    const rev = [...t.words].reverse();
    if (rev.join(" ").toLowerCase() !== t.words.join(" ").toLowerCase() && U.verifyAnyWordSequence(rev, t.accepted)) fail(`${where}: a reversed line is accepted`);
    for (const tile of t.tiles) {
      if (!/^[A-Z]/.test(tile.label)) continue;
      bstat.capitalTiles++;
      const allowed = I_FORM.test(tile.label) || caps.has(tile.label) || !/^[A-Z][a-z'’-]*$/.test(tile.label);
      if (!allowed) fail(`${where}: tile "${tile.label}" keeps a capital it should not`);
    }
    const first = words[0];
    const firstTile = t.tiles.find((x) => x.word === first);
    if (firstTile && /^[A-Z]/.test(firstTile.label) && !I_FORM.test(first) && lowerSomewhere.has(norm(first))) {
      bstat.capitalFirstClue++;
      (bstat.clueLines = bstat.clueLines || []).push(`${where} ${first}`);
      fail(`${where}: the first tile "${firstTile.label}" keeps a capital while the lesson also writes "${first.toLowerCase()}"`);
    }
  });
  for (const [key, n] of pairUse) if (n > D.MAX_REPEAT) { repeated = true; fail(`${id}: distractor pair ${key} on ${n} lines`); }
  if (repeated) bstat.pairRepeatLessons++;
}

// ---------------------------------------------------------------------------------------------------------------
// C · the sound clinic (F03)
// ---------------------------------------------------------------------------------------------------------------
const cstat = { oldCards: 0, newCards: 0, removed: 0, added: 0, zeroOld: 0, zeroNew: 0 };
const adjacent = (s, a, b) => new RegExp(`(?<![A-Za-z0-9'’\\-])${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9'’\\-])`, "i").test(s);
const CONSONANT_START = /^(?:one(?:s|self)?|once|us(?:e|es|ed|ing|eful|age|ual|ually|er|ers)|unit(?:s|ed|y)?|unions?|univers(?:e|al|ity|ities)|unique|uniforms?|util(?:ity|ities|ize)|eu\w*)$/i;
for (const { id, lines } of lessonsData) {
  lines.forEach((en, i) => {
    const where = `${id} #${i + 1}`;
    const o = OLD.generateLiaisonPoints(en);
    const n = U.generateLiaisonPoints(en);
    if (BREAK === "liaison" && id === "d001" && i === 5) n.push({ original: "It isn", phonetic: "", koreanSound: "It‿isn", type: "linking", typeLabel: "x", rule: "x" });
    cstat.oldCards += o.length;
    cstat.newCards += n.length;
    if (!o.length) cstat.zeroOld++;
    if (!n.length) cstat.zeroNew++;
    const oldSet = new Set(o.map((c) => c.original));
    for (const c of n) if (!oldSet.has(c.original)) { cstat.added++; fail(`${where}: new card "${c.original}" (a new spoken phrase)`); }
    cstat.removed += o.filter((c) => !n.some((x) => x.original === c.original)).length;
    for (const c of n) {
      if (c.original === "have one") fail(`${where}: 'have one' card`);
      if (c.original === "going to") {
        const next = [...en.matchAll(/\bgoing\s+to\s+([A-Za-z'’]+)/gi)].map((m) => m[1].toLowerCase());
        if (!next.length || next.every((w) => ["the", "a", "an", "my", "your", "his", "her", "our", "their", "this", "that"].includes(w))) fail(`${where}: 'going to' before ${next.join(",") || "nothing"}`);
      }
      const words = c.original.split(" ");
      if (words.length === 2 && !adjacent(en, words[0], words[1])) fail(`${where}: card "${c.original}" is not two whole words side by side`);
      if (words.length === 2 && /‿/.test(c.koreanSound) && CONSONANT_START.test(words[1])) fail(`${where}: card "${c.original}" before a consonant sound`);
      if (/100%|95%/.test(c.rule)) fail(`${where}: card rule with an exaggerated number`);
      if (/\(이어짐\)|\[[a-z]+-[a-z]+\]/i.test(`${c.koreanSound} ${c.phonetic}`)) fail(`${where}: card "${c.original}" still shows '(이어짐) [..-..]'`);
    }
  });
}
// the named cards of the review
const cardsOf = (id, n) => U.generateLiaisonPoints(S[id][n - 1].en).map((c) => c.original);
if (cardsOf("d001", 5).includes("have one")) fail("d001 #5 still has 'have one'");
if (cardsOf("d001", 6).some((x) => /isn$/.test(x))) fail("d001 #6 still has 'It isn'");
if (cardsOf("d096", 9).includes("going to")) fail("d096 #9 still has 'going to'");
if (cardsOf("d210", 6).includes("going to")) fail("d210 #6 still has 'going to'");
const d002 = U.generateLiaisonPoints(S.d002[3].en).find((c) => c.original === "My address");
if (!d002 || d002.koreanSound !== "My‿address" || !/\[y\]/.test(d002.rule)) fail("d002 #4 'My address' is not the [y] glide card");

// the spoken texts of LISTENING, as the clip generator counts them (scripts/lib/spoken-texts.cjs · unifiedSpeech normalisation)
function ldSpoken(fnsLiaison) {
  const fns = {
    vocaSpeechForm: VS.vocaSpeechForm, getCollocation: () => null, generateLiaisonPoints: fnsLiaison, extractSentencesForAudio: LA.extractSentencesForAudio,
    firstSlashAlternative: U.firstSlashAlternative, vocaWordSpeech: VS.vocaWordSpeech, readingWordSpeech: VS.readingWordSpeech, lessonSpeechForm: LS.lessonSpeechForm,
  };
  const index = readJson("content/courses/ld.json").lessons || [];
  const set = new Map();
  for (const id of routes.ld || []) {
    const file = path.join(REPO, "content/lessons/ld", `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const lesson = JSON.parse(strip(fs.readFileSync(file, "utf8")));
    const pairId = spoken.pairIdOf("ld", id, index);
    const pairFile = pairId ? path.join(REPO, "content/lessons/ld", `${pairId}.json`) : null;
    const pair = pairId ? { id: pairId, ...(pairFile && fs.existsSync(pairFile) ? JSON.parse(strip(fs.readFileSync(pairFile, "utf8"))) : {}) } : null;
    for (const t of spoken.spokenTexts({ course: "ld", id, lesson, pair, ldScripts: S, dictionary: {}, fns })) {
      const clean = US.normalizeUnifiedSpeechText(VS.vocaSpeechForm(String(t)));
      if (clean && /[A-Za-z]/.test(clean) && !set.has(clean)) set.set(clean, `${id}`);
    }
  }
  return set;
}
const spokenOld = ldSpoken(OLD.generateLiaisonPoints);
const spokenNew = ldSpoken(BREAK === "liaison" ? (en) => [...U.generateLiaisonPoints(en), { original: "zz new phrase" }] : U.generateLiaisonPoints);
const addedTexts = [...spokenNew.keys()].filter((t) => !spokenOld.has(t));
const removedTexts = [...spokenOld.keys()].filter((t) => !spokenNew.has(t)).sort((a, b) => a.localeCompare(b, "en"));
for (const t of addedTexts) fail(`LISTENING would speak a new text: "${t}"`);

// ---------------------------------------------------------------------------------------------------------------
// D · generateWordBank without options is what it was
// ---------------------------------------------------------------------------------------------------------------
function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const realRandom = Math.random;
// 2026-10-04 (회귀 점검 단계 0): '--break=identity' 가 seed 7 만 깼는데, 한글 낱말 문장을 건너뛰며(아래) seed 7 이 그 문장 몫이 되어
// 깨기가 아무것도 깨지 않고 PASS 였다 — 실제로 비교하는 첫 문장을 깬다.
let identityBroken = false;
function same(label, sentence, pool, seed) {
  Math.random = seeded(seed);
  const a = OLD.generateWordBank(sentence, pool);
  Math.random = seeded(seed);
  const breakHere = BREAK === "identity" && pool.length > 0 && !identityBroken && (identityBroken = true);
  const b = breakHere ? U.generateWordBank(sentence, pool, { distractors: [] }) : U.generateWordBank(sentence, pool);
  Math.random = realRandom;
  if (JSON.stringify(a) !== JSON.stringify(b)) fail(`generateWordBank changed: ${label}`);
}
const stuIndex = readJson("content/courses/student.json");
const stuLessons = stuIndex.lessons.map((l) => {
  const L = readJson(`content/lessons/student/${l.id}.json`);
  const block = (L.blocks || []).find((b) => b.type === "sentences");
  return { id: l.id, texts: ((block && block.items) || []).map((it) => it.text) };
});
const capitals = ST.studentCapitalsFrom(stuLessons.flatMap((l) => l.texts));
let identity = 0;
let hangulSentences = 0;
let seed = 1;
for (const { id, texts } of stuLessons) {
  const keep = SD.firstWordKeepsCase(texts, capitals);
  texts.forEach((text, i) => {
    // 2026-10-02 (사장님 "신라 블록이 없는데"): a sentence that writes a Korean word in Hangul ("The 신라 Kingdom …") is MEANT to
    // differ — Hangul became a word's letter, so the word is a tile and part of the answer (the base function dropped it).
    // check-student-dictation.cjs --course student|adult proves every letter is now in a tile; LISTENING below must stay identical.
    if (/[가-힣]/.test(text)) {
      hangulSentences++;
      seed += 2;
      return;
    }
    const pool = SD.distractorPool(texts, keep, i, seeded(seed));
    same(`student ${id} #${i + 1} (lesson pool)`, text, pool, seed++);
    same(`student ${id} #${i + 1} (no pool)`, text, [], seed++);
    identity++;
  });
}
for (const { id, lines } of lessonsData) {
  // the pool LISTENING passed until 2026-09-27 (every word of the lesson, letters only)
  const legacyPool = [...new Set(lines.flatMap((s) => s.split(/\s+/).map((w) => w.replace(/[^a-zA-Z]/g, ""))))].filter(Boolean);
  lines.forEach((en, i) => same(`ld ${id} #${i + 1} (old pool)`, en, legacyPool, seed++));
}

// ---------------------------------------------------------------------------------------------------------------
// E · this device's record and the engine keys
// ---------------------------------------------------------------------------------------------------------------
const oldRecord = JSON.stringify({ dictationProgress: { 0: true, 2: true }, shadowScores: { 1: 64 }, selectedAnswers: {}, quizSubmitted: {}, notes: "my note" });
const read = R.parseLdPractice(BREAK === "migrate" ? JSON.stringify({ shadowScores: { 1: 64 } }) : oldRecord);
if (!read.dictationProgress[0] || !read.dictationProgress[2] || !read.checked[0] || !read.checked[2] || read.checked[1]) fail("an old record: its right lines are not read as right and checked");
if (read.shadowScores[1] !== 64 || read.notes !== "my note" || read.peek !== false) fail("an old record: scores, notes or peek changed");
const round = R.parseLdPractice(R.serializeLdPractice({ ...read, missed: { 3: true }, revealed: { 4: true }, peek: true }));
if (!round.missed[3] || !round.revealed[4] || !round.peek) fail("a new record does not survive a save and a read");
if (R.ldItemKey("d001-1", 3) !== "d001#3" || R.ldItemKey("d001", 3) !== "d001#3") fail("engine keys: the script page is not its lesson's item");
const entries = R.ldReviewEntries("d001-1", 6, { ...R.emptyLdPractice(), checked: { 0: true, 1: true, 2: true }, missed: { 1: true }, revealed: { 2: true } }, [
  { item: "d001#6", lessonId: "d001", where: "lesson", firstTry: true, correct: false, help: "none", mode: "tap" },
  { item: "d001#5", lessonId: "d001", where: "lesson", firstTry: true, correct: false, help: "none", mode: "voice" },
]);
if (entries.map((e) => e.key).join(",") !== "d001#2,d001#3,d001#6" || entries.some((e) => e.kind !== "line")) fail(`review entries: ${entries.map((e) => e.key).join(",")}`);
const dw = D.diffWords(["i", "work", "in", "the", "hospitle"], ["I", "work", "in", "a", "hospital", "now"]);
if (dw.ok !== 3 || dw.spelling !== 1 || dw.wrong !== 1 || dw.missing !== 1 || dw.extra !== 0) fail(`diffWords: ${JSON.stringify({ ok: dw.ok, spelling: dw.spelling, wrong: dw.wrong, missing: dw.missing, extra: dw.extra })}`);

// ---------------------------------------------------------------------------------------------------------------
console.log(`LISTENING ${lessonsData.length}강 ${stat.lines}줄${BREAK ? ` · BREAK=${BREAK}` : ""}`);
console.log(`A 빈칸 ${stat.blanks}개 · 줄마다 빈칸 수 ${JSON.stringify(stat.dist)} · 3개 미만 ${stat.belowThree}줄(모두 후보가 그만큼뿐 — 0칸은 블록으로) · 문장 첫 낱말 빈칸 ${stat.sentenceStart} · I 꼴 빈칸 ${stat.iForm} · 숫자 빈칸 ${stat.numbers}`);
console.log(`  사이트 글에 없어 사람이 확인한 보기 ${stat.reviewedUsed.size}: ${[...stat.reviewedUsed].sort().join(", ")}`);
console.log(`B 블록 ${bstat.lines}줄 · 같은 방해 짝이 3줄 넘는 강의 ${bstat.pairRepeatLessons}(고치기 전 257) · 방해 낱말: 소리 비슷한 짝 ${bstat.groupDistractors} · 다른 줄 낱말 ${bstat.lineDistractors} · 하나뿐인 줄 ${bstat.oneDistractor}`);
console.log(`  대문자 블록 ${bstat.capitalTiles}(I 꼴 · 이름 · TV 꼴만) · 첫 블록 대문자 단서 줄 ${bstat.capitalFirstClue}(고치기 전 1,045)${bstat.clueLines ? ` — 이름이 흔한 낱말과 같은 꼴: ${bstat.clueLines.join(", ")}` : ""}`);
console.log(`C 소리 카드 ${cstat.oldCards} → ${cstat.newCards}(뺀 카드 ${cstat.removed} · 늘어난 카드 ${cstat.added}) · 카드 0장인 줄 ${cstat.zeroOld} → ${cstat.zeroNew}`);
console.log(`  LISTENING 소리 낼 글 ${spokenOld.size} → ${spokenNew.size} · 새로 생긴 글 ${addedTexts.length} · 빠진 글 ${removedTexts.length}`);
console.log(`D generateWordBank 기본값: STUDENT ${identity}문장 × (화면 풀 · 빈 풀) + LISTENING ${stat.lines}줄(옛 풀) — 바탕 ${BASE} 의 함수와 비교 · 한글 낱말 문장 ${hangulSentences}(뜻한 변화 — check-student-dictation.cjs 가 봄)`);
if (WRITE_REMOVED && !BREAK) {
  const out = path.resolve(REPO, WRITE_REMOVED);
  fs.writeFileSync(out, JSON.stringify({
    at: new Date().toISOString(),
    why: "2026-09-27 LISTENING 학습법 · 화면 고침 F03(계획 D26 가 · LD-L15): 소리 클리닉에서 틀린 카드를 뺀 뒤 LISTENING 이 더는 소리 내지 않는 구절. 남은 구절 글은 그대로 · 새 구절 0 · 이 구절들의 클립은 저장소에 그대로 둠(지우지 않음).",
    base: BASE,
    ldSpokenBefore: spokenOld.size,
    ldSpokenAfter: spokenNew.size,
    removed: removedTexts,
  }, null, 1) + "\n");
  console.log(`  빠진 글 목록 → ${path.relative(REPO, out)}`);
}
console.log(fails.length ? `\nFAIL ${fails.length}` : "\nPASS — 빈칸 · 블록 · 소리 카드 · 기본값 · 기록 모두 규칙대로");
for (const f of fails.slice(0, 30)) console.log("  " + f);
if (fails.length > 30) console.log(`  … ${fails.length - 30} more`);
process.exitCode = fails.length ? 1 : 0;
