#!/usr/bin/env node
/**
 * READING 학습법 고침(2026-09-27 — 계획 G01 · G02 · D02 · D31 · D32 · D33 · 공통 엔진)의 논리를 256강 전부로 검사한다. 앱의 모듈 그대로
 * (src/lib/readingUtils.ts · readingLearning.ts · learning/engine.ts · learning/record.ts)를 불러 쓰고, 기대값은 이 파일이 따로 셈한다.
 *
 *   A 낱말 찾기  findWordSpans 의 경계 규칙(하이픈 · 소유격 · 축약 · 대시) 여덟 경우
 *   B 어휘 문맥  핵심어 3,584개마다 지문 한 줄이 나오고, 그 줄에 핵심어가 그대로 들어 있고, 48자(+ …) 안인가 (2단계 D32)
 *   C 빈칸 연결  256강 × 회차 0~4 의 모든 빈칸: 정답이 그 순번의 핵심어이고, 엔진 열쇠가 '<본 강의>#k<순번>' 이며, 해석을 보일 문장이 있는가
 *   D 속도 규칙  500 WPM 상한(89낱말 6초 = 890 → 저장 안 함 · 30초 = 178 → 저장), 시간만 보이는 강의 = 한 문장 5강(pr127 · 131 · 132 · 133 · 171),
 *                옛 최고 기록은 1~500 만 '한 번 읽음'으로 셈, 기록 형식 왕복
 *   E 엔진      recordAttempt(강의 안 → 'lesson') · markLessonDone(몰라요 + 틀린 빈칸만, kind word, 본 강의 id) · 요소 문항 · 6초 — 실제 engine 으로
 *   F 목록 길이  src/lib/readingLengths.ts = 데이터(D35)
 *   G 시계      화면이 가려진 동안 멈춤 — 읽은 10초 + 가려진 5초 + 읽은 15초 = 25초 (감사 브라우저는 늘 '보임'이라 여기서 증명)
 *   H 완료 조건  (2026-09-28 순서 바꿈 — 사장님 D31 다: 1 처음 읽기(재지 않음) · 2 핵심 어휘 · 3 원문 대조 · 4 다시 읽고 재기)
 *                readingGateOpen: 4단계에서 잰 기록(again)이 있어야 열림 · 옛 기록(09-27~28 의 옛 1단계 first · 옛 최고 WPM 1~500)도 열림 ·
 *                아무 기록도 없으면(1단계 '다 읽었어요'는 기록을 남기지 않음) 닫힘 · 500 넘는 기록은 읽어 들일 때 버려져 열지 못함 ·
 *                안내 글이 4단계를 가리킴(1단계가 아님)
 *
 *   node docs/qa-2026-09-18/scripts/check-reading-learning.cjs
 *   node docs/qa-2026-09-18/scripts/check-reading-learning.cjs --break spans|context|key|wpm|timeonly|entries|lengths|hidden|gate   깨기 — FAIL(exit 1)이 나야 맞음
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const { loadTs } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const BREAK = process.argv.includes("--break") ? process.argv[process.argv.indexOf("--break") + 1] : "";

// record.ts needs window.localStorage — a memory one here
const memory = new Map();
global.window = {
  localStorage: {
    getItem: (k) => (memory.has(k) ? memory.get(k) : null),
    setItem: (k, v) => memory.set(k, String(v)),
    removeItem: (k) => memory.delete(k),
  },
  dispatchEvent: () => true,
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.CustomEvent = class CustomEvent {
  constructor(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }
};

const ru = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
const rl = loadTs(path.join(REPO, "src/lib/readingLearning.ts"));
const fitsFor = loadTs(path.join(REPO, "src/lib/readingClozeFitsForLesson.ts")).clozeAlsoFitsFor;
const record = loadTs(path.join(REPO, "src/lib/learning/record.ts"));
const lengthsTs = loadTs(path.join(REPO, "src/lib/readingLengths.ts"));

const results = [];
const check = (name, ok, detail) => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name} — ${detail}`);
};

// ---------------------------------------------------------------------------------------------------------------------
// A. findWordSpans boundaries
// ---------------------------------------------------------------------------------------------------------------------
const spans = BREAK === "spans" ? (text, word) => [...text.matchAll(new RegExp(`\\b${word.replace(/[-.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"))].map((m) => [m.index, m.index + word.length]) : ru.findWordSpans;
const cases = [
  ["their other-sex children", "sex", 0],
  ["their other-sex children", "other-sex", 1],
  ["That doesn't mean", "doesn", 0],
  ["the adults' toys", "adults", 1],
  ["the children's toys", "children", 1],
  ["at five o'clock sharp", "clock", 0],
  ["healthy eyes—people who", "eyes", 1],
  ["Parents know; parents care.", "parents", 2],
];
const badCases = cases.filter(([text, word, n]) => spans(text, word).length !== n);
check("A 낱말 찾기 경계", badCases.length === 0, badCases.length ? badCases.map(([t, w, n]) => `"${w}" in "${t}" → ${spans(t, w).length} (기대 ${n})`).join(" | ") : `${cases.length}경우 모두 기대대로`);

// ---------------------------------------------------------------------------------------------------------------------
// lessons
// ---------------------------------------------------------------------------------------------------------------------
const dir = path.join(REPO, "content/lessons/reading");
const lessons = fs.readdirSync(dir).filter((f) => /^pr\d+\.json$/.test(f)).sort().map((f) => {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  return {
    id: f.replace(/\.json$/, ""),
    pairs: (d.readingSentences || []).map((s) => ({ en: s.english, ko: s.korean })),
    vocab: d.readingVocabulary || [],
  };
});

// ---------------------------------------------------------------------------------------------------------------------
// B. every key word has its passage line (Step 2)
// ---------------------------------------------------------------------------------------------------------------------
let words = 0, withContext = 0;
const noContext = [], badSnippet = [];
for (const L of lessons) {
  for (const [k, v] of L.vocab.entries()) {
    words++;
    let snippet = null;
    for (const p of L.pairs) {
      const found = ru.findWordSpans(p.en, v.word);
      if (found.length) {
        snippet = ru.contextSnippet(p.en, found[0], 48);
        break;
      }
    }
    if (BREAK === "context" && L.id === "pr001" && k === 0) snippet = null;
    if (!snippet) {
      noContext.push(`${L.id}:${v.word}`);
      continue;
    }
    withContext++;
    const core = snippet.before.replace(/^… /, "") + snippet.match + snippet.after.replace(/ …$/, "");
    if (snippet.match.toLowerCase() !== String(v.word).toLowerCase() || core.length > 48 + 2 || !L.pairs.some((p) => p.en.includes(core.trim()))) {
      badSnippet.push(`${L.id}:${v.word} "${core}"`);
    }
  }
}
check("B 어휘 카드의 지문 한 줄", noContext.length === 0 && badSnippet.length === 0, `핵심어 ${words} 중 한 줄 있음 ${withContext}${noContext.length ? ` · 없음 ${noContext.length}: ${noContext.slice(0, 5).join(", ")}` : ""}${badSnippet.length ? ` · 어긋남 ${badSnippet.length}: ${badSnippet.slice(0, 3).join(" | ")}` : ""}`);

// ---------------------------------------------------------------------------------------------------------------------
// C. the blanks point at the right key word, engine key and sentence
// ---------------------------------------------------------------------------------------------------------------------
let blanks = 0;
const badBlanks = [];
for (const L of lessons) {
  const keywords = L.vocab.map((v) => ({ word: v.word, pos: v.partOfSpeech }));
  for (const pageId of [L.id, `${L.id}-1`]) {
    const mainId = BREAK === "key" ? pageId : rl.readingMainId(pageId);
    for (let round = 0; round < 5; round++) {
      // 2026-09-27 (유출 규칙): the lesson's own reviewed pairs, as the page hands them to the view (readingClozeFitsForLesson.ts)
      const items = ru.generateClozeItems(L.pairs, { lessonKey: `reading/${rl.readingMainId(pageId)}`, keywords, round, alsoFits: fitsFor(L.pairs.map((p) => p.en), keywords.map((k) => k.word)) });
      for (const it of items) {
        blanks++;
        const kw = L.vocab[it.order - 1];
        const key = rl.readingItemKey(mainId, it.order);
        if (!kw || kw.word !== it.missingWord) badBlanks.push(`${pageId} k${it.order}: 정답 ${it.missingWord} ≠ 핵심어 ${kw && kw.word}`);
        if (key !== `${L.id}#k${it.order}`) badBlanks.push(`${pageId}: 엔진 열쇠 ${key} (기대 ${L.id}#k${it.order})`);
        if (!L.pairs[it.sentenceIndex] || L.pairs[it.sentenceIndex].en !== it.originalSentence) badBlanks.push(`${pageId} k${it.order}: 문장 ${it.sentenceIndex} 가 다름`);
      }
    }
  }
}
check("C 빈칸 → 핵심어 · 엔진 열쇠 · 문장", badBlanks.length === 0, `본 · -1 쪽 × 회차 5 × 256강 빈칸 ${blanks}${badBlanks.length ? ` · 어긋남 ${badBlanks.length}: ${badBlanks.slice(0, 3).join(" | ")}` : " · 어긋남 0"}`);

// ---------------------------------------------------------------------------------------------------------------------
// D. speed rules
// ---------------------------------------------------------------------------------------------------------------------
const MAX = BREAK === "wpm" ? 1000 : rl.READING_MAX_WPM;
const tooFast = rl.wordsPerMinute(89, 6000) > MAX;
const saved = rl.wordsPerMinute(89, 30000) <= MAX;
const timeOnly = lessons.filter((L) => (BREAK === "timeonly" ? L.pairs.map((p) => p.en).join(" ").split(/\s+/).length < 30 : rl.isTimeOnlyPassage(L.pairs.length))).map((L) => L.id);
const wantTimeOnly = ["pr127", "pr131", "pr132", "pr133", "pr171"];
const legacyOk = rl.legacyBestCounts("152") && !rl.legacyBestCounts("890") && !rl.legacyBestCounts("abc") && !rl.legacyBestCounts(null);
const rec = { first: { wpm: 92, ms: 49600, at: "2026-09-27T00:00:00.000Z" }, again: { wpm: 131, ms: 34800, at: "2026-09-27T00:05:00.000Z" } };
const roundTrip = JSON.stringify(rl.parseSpeedRecord(rl.serializeSpeedRecord(rec))) === JSON.stringify(rec);
const rejectsFast = rl.parseSpeedRecord(JSON.stringify({ v: 1, first: { wpm: 890, ms: 6000, at: "" } })).first === null;
const dOk = tooFast && saved && JSON.stringify(timeOnly) === JSON.stringify(wantTimeOnly) && legacyOk && roundTrip && rejectsFast;
check(
  "D 속도 규칙",
  dOk,
  `89낱말 6초 = ${rl.wordsPerMinute(89, 6000)} WPM → ${tooFast ? "저장 안 함" : "저장(틀림)"} · 30초 = ${rl.wordsPerMinute(89, 30000)} → ${saved ? "저장" : "안 함(틀림)"} · 시간만 ${timeOnly.join(",")} · 옛 최고 기록 규칙 ${legacyOk} · 기록 왕복 ${roundTrip} · 500 넘는 기록 버림 ${rejectsFast}`,
);

// ---------------------------------------------------------------------------------------------------------------------
// E. the common engine, through the real record functions
// ---------------------------------------------------------------------------------------------------------------------
const profile = rl.READING_LEARNING_PROFILE;
memory.clear();
const effect = record.recordAttempt(profile, rl.readingItemKey("pr001", 5), { lessonId: "pr001", kind: "word", correct: false, help: "none", mode: "tap", where: "lesson", firstTry: true });
let words0 = rl.parseWordsRecord(JSON.stringify({ v: 1, marks: { 5: "unknown", 7: "known", 99: "unknown" }, missed: [9, 9, 0] }), 14);
let entries = rl.reviewEntries("pr001", words0);
if (BREAK === "entries") entries = [...entries, { key: rl.readingItemKey("pr001", 7), kind: "word" }];
const done = record.markLessonDone(profile, "pr001", entries, Date.parse("2026-09-27T03:00:00Z"));
const itemKeys = Object.keys(done.items).sort();
const eOk =
  effect === "lesson" &&
  JSON.stringify(itemKeys) === JSON.stringify(["pr001#k5", "pr001#k9"]) &&
  Object.values(done.items).every((s) => s.kind === "word" && s.lessonId === "pr001") &&
  profile.elementKinds.includes("word") &&
  profile.secondsPerKind.word === 6 &&
  Boolean(done.lessons.pr001 && done.lessons.pr001.day) &&
  memory.has("kig-learning:reading");
check("E 공통 엔진 기록", eOk, `강의 안 답 → ${effect} · 완료 때 들어간 문항 ${itemKeys.join(", ")} (몰라요 k5 + 틀린 빈칸 k9 — 알아요 k7 · 범위 밖 99 · 0 은 빠져야) · 요소 ${profile.elementKinds.join(",")} · ${profile.secondsPerKind.word}초 · 저장 칸 kig-learning:reading ${memory.has("kig-learning:reading")}`);

// ---------------------------------------------------------------------------------------------------------------------
// F. the READING list lengths (D35)
// ---------------------------------------------------------------------------------------------------------------------
const table = lengthsTs.READING_LENGTHS || {};
const badLengths = [];
for (const L of lessons) {
  let want = [L.pairs.map((p) => p.en).join(" ").trim().split(/\s+/).filter(Boolean).length, L.pairs.length];
  if (BREAK === "lengths" && L.id === "pr001") want = [want[0] + 1, want[1]];
  const got = table[L.id];
  if (!got || got[0] !== want[0] || got[1] !== want[1]) badLengths.push(`${L.id} ${got ? got.join("/") : "없음"} ≠ ${want.join("/")}`);
}
const extraIds = Object.keys(table).filter((id) => !lessons.some((L) => L.id === id));
check("F 목록 글 길이 = 데이터", badLengths.length === 0 && extraIds.length === 0, `강의 ${lessons.length} · 표 ${Object.keys(table).length}${badLengths.length ? ` · 어긋남 ${badLengths.slice(0, 3).join(" | ")}` : ""}${extraIds.length ? ` · 표에만 있음 ${extraIds.join(",")}` : ""}`);

// ---------------------------------------------------------------------------------------------------------------------
// G. the clock of a timed reading stands still while the page is hidden (G01 — "숨긴 5초가 시간에 안 들어갑니다")
// ---------------------------------------------------------------------------------------------------------------------
{
  const clock = rl.clockStart(1000);
  rl.clockHide(clock, 11000); // read 10 s, then the page is hidden
  if (BREAK !== "hidden") rl.clockHide(clock, 13000); // a second hide changes nothing
  if (BREAK === "hidden") clock.startedAt = 11000; // a clock that ignores hiding
  rl.clockShow(clock, 16000); // 5 s later it is back
  rl.clockShow(clock, 17000); // a second show changes nothing
  const elapsed = rl.clockElapsed(clock, 31000); // 15 s more
  check("G 가려진 동안 시계 멈춤", elapsed === 25000 && clock.hiddenMs === (BREAK === "hidden" ? clock.hiddenMs : 5000), `읽은 10초 + 가려진 5초 + 읽은 15초 → 잰 시간 ${elapsed / 1000}초(기대 25) · 뺀 시간 ${clock.hiddenMs / 1000}초`);
}

// ---------------------------------------------------------------------------------------------------------------------
// H. the completion gate after the reorder (2026-09-28 · 사장님 D31 다) — the view calls readingGateOpen(speed, legacyRead)
//    (ReadingLearningView gateReady, plus "or the lesson was completed"). --break gate: a gate that also opens on nothing.
// ---------------------------------------------------------------------------------------------------------------------
{
  const gate = BREAK === "gate" ? () => true : rl.readingGateOpen;
  const run = { wpm: 131, ms: 34800, at: "2026-09-28T00:00:00.000Z" };
  const parsed = (obj) => rl.parseSpeedRecord(JSON.stringify(obj));
  const cases = [
    ["기록 없음(1단계 '다 읽었어요'만 — 기록을 남기지 않음)", rl.parseSpeedRecord(null), false, false],
    ["4단계에서 잰 기록(again)", parsed({ v: 1, first: null, again: run }), false, true],
    ["옛 1단계 기록(first, 09-27~28)", parsed({ v: 1, first: run, again: null }), false, true],
    ["옛 최고 WPM 1~500(kig:reading:wpm)", rl.parseSpeedRecord(null), rl.legacyBestCounts("152"), true],
    ["옛 최고 WPM 890 — 헛누름(1~500 아님)", rl.parseSpeedRecord(null), rl.legacyBestCounts("890"), false],
    ["500 넘는 기록(890 WPM) — 읽을 때 버려짐", parsed({ v: 1, first: null, again: { wpm: 890, ms: 6000, at: "" } }), false, false],
  ];
  const bad = cases.filter(([, rec, legacy, want]) => Boolean(gate(rec, legacy)) !== want);
  const reasonOk = typeof rl.READING_GATE_REASON === "string" && /4단계/.test(rl.READING_GATE_REASON) && !/1단계/.test(rl.READING_GATE_REASON);
  check(
    "H 완료 조건 = 4단계에서 한 번 재기(옛 기록 인정)",
    bad.length === 0 && reasonOk,
    `${cases.length}경우${bad.length ? ` · 어긋남 ${bad.map(([name, , , want]) => `${name} → ${want ? "열려야" : "닫혀야"} 함`).join(" | ")}` : " 모두 기대대로"} · 안내 글 '${rl.READING_GATE_REASON}'${reasonOk ? "" : " (4단계를 가리키지 않음)"}`,
  );
}

const ok = results.every((r) => r.ok);
console.log(`\n${ok ? "모두 통과" : "어긋남 있음"}${BREAK ? ` (깨기 ${BREAK} — FAIL 이 나야 맞음)` : ""}`);
process.exitCode = ok ? 0 : 1;
