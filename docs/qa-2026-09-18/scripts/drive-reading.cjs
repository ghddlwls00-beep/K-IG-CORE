#!/usr/bin/env node
/**
 * READING course driver — 2026-09-18 commercial-release audit; rewritten 2026-09-27 for the READING 학습법 · 화면 고침.
 *
 * Exercises every control of every READING route with trusted input (real mouse/touch events through CDP), compares what
 * is on screen against the lesson DATA (content/lessons/reading/<id>.json, read with the app's own content.ts /
 * readingUtils.ts / readingLearning.ts / curriculumPresentation.ts), and records one JSONL record per page x viewport.
 *
 * 2026-09-28 — READING 순서 바꿈 (사장님 D31 다; ReadingLearningView.tsx header): READING no longer times a passage the learner has
 * never read. 1 처음 읽기 (not timed) · 2 핵심 어휘 (cards, then the blanks that were Step 3) · 3 원문 대조 (was Step 4, + the
 * reading-aloud check + the memo) · 4 다시 읽고 재기 (the only timed reading; then the comprehension questions' empty slot). The
 * driver follows that order; what it checks:
 *   frame   the shared StepTabs ([data-step-tab] — 'Step 1 · 처음 읽기' … 'Step 4 · 다시 읽고 재기'), no header card: Step 1's meta
 *           line [data-passage-meta] '76단어 · 5문장' (no target — the target is Step 4's); the page's top player is hidden (the
 *           view owns it — [data-owns-passage-player]); the '이 강의 학습 완료' button (aria-label '학습 완료 체크' / '학습 완료 취소'
 *           — LessonEndBar) is DISABLED until one timed reading in Step 4 (계획 D02), with the reason line under it.
 *   Step 1  the passage is on screen from the start, with no clock, no '읽기 시작', no WPM and no speed words; mouse-over changes
 *           nothing; a sentence is a button (Enter/Space) that plays its clip and shows its Korean (a line under it on a phone,
 *           [data-ko-panel] from sm); '다 읽었어요' ([data-action="first-read-done"]) at the end of the passage stores NOTHING
 *           (kig:reading:speed:v1:… stays empty) and leaves the completion shut; it offers '다음: Step 2 핵심 어휘'
 *           ([data-first-read] [data-action="to-step2"]) and the whole-lesson player, which tints the sentence it reads.
 *   Step 2  li[data-vocab] per key word: word · part of speech · passage line [data-context] · '뜻 보기' → [data-meaning] · the
 *           word's clip · '알아요 / 몰라요' (kig:reading:words:v1:…; '알아요' folds the row) · '뜻 모두 보기 / 뜻 모두 가리기' (one
 *           toggle, [data-action="reveal-all"]). Then, below the cards ([data-blanks]), one blank at a time, exactly
 *           generateClozeItems(pairs, { lessonKey: 'reading/<main id>', keywords, round, unknown }) with the '몰라요' words marked
 *           on the cards above: masked sentence, the four options in order, right/wrong, the filled sentence, its Korean,
 *           '문장 듣기', '다음 문제', the result and '다른 빈칸으로 다시 풀기' (round 1).
 *   Step 3  rows [number | English | Korean]; the number plays; a dotted key word opens its meaning ([data-gloss]) without sound;
 *           '영어만' → '해석 보기' per row; '한글만'; the whole-lesson player tints the row it reads; the reading-aloud check with a
 *           stubbed recogniser ([data-read-aloud]); the memo (kig:reading:notes:<page key> — unchanged) folded, open when it
 *           holds something.
 *   Step 4  the passage is NOT on screen before '읽기 시작' (and no player — nothing to hear first); '읽기 시작' → the whole passage
 *           comes up under the header as plain text (no numbers, no taps), '다 읽었어요' at its end; a run faster than 500 WPM is
 *           not saved ([data-too-fast]) and the completion stays shut; a real run shows [data-speed-result] (WPM, or the time on
 *           the five one-sentence passages) = the stored record's `again`, this run only (no '→', no '%'), and opens the
 *           completion; the comprehension questions [data-comprehension] are the page's own (2026-09-28 새 문제 — content.ts
 *           getLessonQuestions), or hidden and empty for a passage without a question file.
 *   engine  kig-learning:reading gets an attempt per '알아요/몰라요' and per blank (item '<main id>#k<n>'), and on completion
 *           the '몰라요' words and the missed blanks as items.
 * Deliberate breaks (--break): 'gate' presses completion without the timed reading first, 'cloze' judges round 0 against
 * round 1's blanks, 'hover' expects mouse-over to change the passage, 'stop' (2026-09-28) only moves the mouse over a
 * playing sound control where the second press belongs, so the sound is never stopped, 'untimed' (2026-09-28) times one
 * reading in Step 4 right after Step 1's '다 읽었어요' and before the checks that it stored nothing and left the completion
 * shut — each must record FAILs (and exit 1).
 * 회귀 점검 1002 (2026-10-04) added two: 'text' changes one expected text (the passage's last sentence) so the "on screen /
 * missing" content check must report it missing, and 'answer' picks a wrong option where the comprehension check expects the
 * right one, so "the right option is graded right" must FAIL.
 *
 * 회귀 점검 1002 (2026-10-04) — the comprehension questions are ANSWERED now (they were only listed): every question's four
 * options in the file's order; on desktop question 1 is answered wrong and the rest right (verdict · '맞았어요.' / '정답은 ②번이에요.'
 * · 'n문제 중 m개 맞힘'), then '다시 풀기' and every question right; on a phone every question right by tap. The learning engine
 * gets an attempt per pick (item = question id, kind 'question'). The record carries `driverRev` (DRIVER_REV) and `base`; --clone
 * and --port name the profile copy and the debugging port (the 회귀 점검 runs use 'rc1002-reading-…' on 9760~9769); the
 * '작은 휴대폰' (lib/harness.cjs VIEWPORTS.small, 360 px) runs as a touch screen like 'mobile'.
 *
 * READ-ONLY toward the product: it never edits the repository, never deploys and never calls a licence or admin API. The
 * only data it changes is localStorage inside its own profile CLONE (per-lesson READING keys, bookmark / completion keys and
 * the course's learning-engine record, which it cleans up again where noted). READING writes no server progress at all
 * (ProgressProvider only calls /api/progress/student for course === "student").
 *
 * Usage (Node 24, no dependencies beyond the repo's own):
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001,pr100-1
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --course-range pr001..pr040
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --limit 20 --viewports desktop
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --shard 1/4      (4 processes)
 *   BASE=http://localhost:3210 node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001 --break gate
 *
 * Options
 *   --ids a,b,c            explicit route ids (pr001, pr001-1, ...)
 *   --course-range a..b    inclusive id range in course order (ids or numbers)
 *   --limit N              first N pages of the selection
 *   --viewports list       desktop,tablet,mobile,small (default desktop,tablet,mobile; 회귀 점검: desktop,mobile,small)
 *   --suffix S             output file docs/qa-2026-09-18/out/features/reading<S>.jsonl
 *   --shard i/n            1-based shard i of n (clone "drv-rd-<i>", port 9470+i)
 *   --clone NAME           profile copy name (default "drv-rd" / "drv-rd-<i>") — %TEMP%\kig-audit-0918-<NAME>
 *   --port N               debugging port (default 9470 / 9470+i)
 *   --resume / --no-resume finished page x viewport records are skipped (default on)
 *   --break gate|cloze|hover|stop|untimed|text|answer|wpm-exact   deliberate break (see above · wpm-exact: the WPM check before T5)
 *   --dry                  print the page list and exit
 * Exit 1 when any check FAILed (2026-09-27; it used to exit 0 unless the driver itself crashed).
 *
 * Output: out/features/reading<suffix>.jsonl  (one record per page x viewport)
 *         out/rendered/reading/<id>.<viewport>.json  (rendered text of every step)
 *         out/features/reading<suffix>.shots/<id>.<viewport>.png on a failed load
 */
"use strict";

const fs = require("fs");
const path = require("path");

// 2026-09-28 (설계 세션 확인 일꾼이 짚음): the repository this file sits in (or KIG_REPO) — with the fixed main path a run from
// another checkout (the clean copy the design session measures in) silently read main's lesson data. Same rule as tsload.cjs.
const REPO_DIR = process.env.KIG_REPO || require("path").resolve(__dirname, "../../..");
// content.ts resolves content/ from process.cwd() at module load time.
try {
  process.chdir(REPO_DIR);
} catch {
  /* already there */
}

const H = require("./lib/harness.cjs");
const R = require("./lib/reading-page.cjs");
const { loadTs, REPO, sleep } = H;

const content = loadTs(path.join(REPO, "src/lib/content.ts"));
const presentation = loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));
const readingUtils = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
const readingLearning = loadTs(path.join(REPO, "src/lib/readingLearning.ts"));
const clozeFitsFor = loadTs(path.join(REPO, "src/lib/readingClozeFitsForLesson.ts")).clozeAlsoFitsFor;
const speechForm = loadTs(path.join(REPO, "src/lib/lessonSpeechForm.ts"));
const vocaSpeech = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const speechRecognition = loadTs(path.join(REPO, "src/lib/speechRecognition.ts"));
const validRoutes = require(path.join(REPO, "src/lib/generated/validRoutes.json"));

const COURSE = "reading";
const MARKER = H.MARKERS.reading;
const OUT = path.join(__dirname, "../out");
const RENDER_DIR = path.join(OUT, "rendered", COURSE);
const FREE_IDS = new Set(["pr001", "pr001-1", "pr002", "pr002-1"]);
const MAX_WPM = readingLearning.READING_MAX_WPM;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const a = { viewports: ["desktop", "tablet", "mobile"], resume: true, suffix: "", limit: 0, brk: "" };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--ids") a.ids = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--course-range") a.range = v();
    else if (k === "--limit") a.limit = Number(v());
    else if (k === "--viewports") a.viewports = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--suffix") a.suffix = v();
    else if (k === "--shard") a.shard = v();
    else if (k === "--clone") a.clone = v();
    else if (k === "--port") a.port = Number(v());
    else if (k === "--resume") a.resume = true;
    else if (k === "--no-resume") a.resume = false;
    else if (k === "--break") a.brk = v();
    else if (k === "--dry") a.dry = true;
    else throw new Error(`unknown option ${k}`);
  }
  for (const vp of a.viewports) if (!H.VIEWPORTS[vp]) throw new Error(`unknown viewport ${vp}`);
  if (a.brk && !BREAKS.includes(a.brk)) throw new Error(`--break must be one of ${BREAKS.join(", ")}`);
  if (a.port !== undefined && !(Number.isInteger(a.port) && a.port > 1024 && a.port < 65536)) throw new Error("--port must be a port number");
  return a;
}
const BREAKS = ["gate", "cloze", "hover", "stop", "untimed", "text", "answer", "wpm-exact"];
let BREAK = "";
// 회귀 점검 1002: which driver wrote a record (build-coverage reads `driverRev`); bump it when a check changes meaning
// -w1005 (2026-10-05, T5): the WPM check accepts the ±0.5 ms window of the rounded time (lib/wpm-window.cjs)
const DRIVER_REV = "rd-0928-q1004-w1005";

/** Every in-scope READING route, in the course index order. */
function allRoutes() {
  const index = content.getCourseIndex(COURSE);
  const valid = new Set(validRoutes.lessons[COURSE] || []);
  const ids = index.lessons.map((l) => l.id).filter((id) => valid.has(id));
  for (const id of valid) if (!ids.includes(id)) ids.push(id); // never silently drop a route
  return ids;
}

function selectPages(args) {
  const all = allRoutes();
  let list = all;
  if (args.ids) {
    const unknown = args.ids.filter((id) => !all.includes(id));
    if (unknown.length) throw new Error(`not READING routes: ${unknown.join(",")}`);
    list = args.ids;
  } else if (args.range) {
    const [from, to] = args.range.split("..");
    const norm = (s) => (/^\d+$/.test(s) ? `pr${String(Number(s)).padStart(3, "0")}` : s);
    const i = all.indexOf(norm(from));
    const j = all.indexOf(norm(to));
    if (i < 0 || j < 0) throw new Error(`bad --course-range ${args.range}`);
    list = all.slice(Math.min(i, j), Math.max(i, j) + 1);
  }
  if (args.shard) {
    const [iRaw, nRaw] = args.shard.split("/").map(Number);
    if (!(nRaw >= 1) || !(iRaw >= 1) || iRaw > nRaw) throw new Error("--shard must be i/n with 1 <= i <= n");
    list = list.filter((_, idx) => idx % nRaw === iRaw - 1);
  }
  if (args.limit > 0) list = list.slice(0, args.limit);
  return list;
}

// ---------------------------------------------------------------------------
// Lesson data (the expected values every check is judged against)
// ---------------------------------------------------------------------------

const dataCache = new Map();
function lessonData(id) {
  if (dataCache.has(id)) return dataCache.get(id);
  const lesson = content.getLesson(COURSE, id);
  if (!lesson) throw new Error(`no lesson file for ${id}`);
  const ctx = content.getLessonContext(COURSE, id);
  const pairLesson = ctx.pair ? content.getLesson(COURSE, ctx.pair.id) : null;
  const sentences = lesson.readingSentences ?? pairLesson?.readingSentences ?? [];
  const vocab = lesson.readingVocabulary ?? pairLesson?.readingVocabulary ?? [];
  const pairs = sentences.map((s, i) => ({ id: s.id, index: i, en: s.english, ko: s.korean }));
  const wordCount = pairs.map((p) => p.en).join(" ").trim().split(/\s+/).filter(Boolean).length;
  const mainId = readingLearning.readingMainId(id);
  const pageKey = `${COURSE}/${id}`;
  const keywords = vocab.map((v) => ({ word: v.word, pos: v.partOfSpeech }));
  const d = {
    id,
    mainId,
    pageKey,
    lesson,
    sentences: pairs,
    vocab,
    keywords,
    wordCount,
    timeOnly: readingLearning.isTimeOnlyPassage(pairs.length),
    // 2026-09-28: Step 1 (not timed) shows the length only; the target belongs to Step 4, the timed reading
    metaFirst: `${wordCount}단어 · ${pairs.length}문장`,
    metaTimed: `${wordCount}단어 · ${pairs.length}문장 · 목표 약 ${readingLearning.formatApprox(readingLearning.targetMs(wordCount))}`,
    // what the app says: a sentence through lessonSpeechForm (a romanized Korean word said in Korean), a word through readingWordSpeech
    spoken: (i) => speechForm.lessonSpeechForm(pageKey, pairs[i].en),
    wordSpoken: (k) => vocaSpeech.readingWordSpeech(vocab[k - 1].word, vocab[k - 1].korean),
    // 2026-09-27 (유출 규칙): the lesson's own reviewed pairs, as the page hands them to the view (readingClozeFitsForLesson.ts)
    cloze: (round, unknown) => readingUtils.generateClozeItems(pairs, { lessonKey: `${COURSE}/${mainId}`, keywords, round, unknown, alsoFits: clozeFitsFor(pairs.map((p) => p.en), keywords.map((k) => k.word)) }),
    title: presentation.formatLessonPresentation(COURSE, lesson).title,
    canonical: content.canonicalLessonId(COURSE, id),
    prev: ctx.prev ? { id: ctx.prev.id, title: presentation.formatLessonPresentation(COURSE, ctx.prev).title } : null,
    next: ctx.next ? { id: ctx.next.id, title: presentation.formatLessonPresentation(COURSE, ctx.next).title } : null,
    free: FREE_IDS.has(id),
    // 2026-09-28 새 문제: the passage's comprehension questions, as the page reads them (content.ts getLessonQuestions) — null: none
    questions: typeof content.getLessonQuestions === "function" ? content.getLessonQuestions(COURSE, id, pairs.length) : null,
    // a run slower than 500 WPM is saved: words × 120 ms, plus a second
    minMs: Math.ceil(wordCount * 120) + 1000,
  };
  dataCache.set(id, d);
  return d;
}

/** Sentences of every OTHER lesson, for the "text of a different lesson" check. */
let foreignIndex = null;
function foreignSentences() {
  if (foreignIndex) return foreignIndex;
  foreignIndex = [];
  const index = content.getCourseIndex(COURSE);
  for (const summary of index.lessons) {
    if (summary.variant !== "main") continue;
    const l = content.getLesson(COURSE, summary.id);
    for (const s of l?.readingSentences || []) {
      if (s.english && s.english.length >= 40) foreignIndex.push({ id: summary.id, text: s.english });
      if (s.korean && s.korean.length >= 24) foreignIndex.push({ id: summary.id, text: s.korean });
    }
  }
  return foreignIndex;
}

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------

const norm = (s) => String(s == null ? "" : s).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const cut = (s, n = 220) => {
  const t = norm(s);
  return t.length > n ? `${t.slice(0, n)}…` : t;
};
const J = JSON.stringify;

function newRecord(id, viewport, url) {
  return {
    course: COURSE,
    id,
    url,
    viewport,
    at: new Date().toISOString(),
    base: H.BASE,
    driverRev: DRIVER_REV,
    load: null,
    steps: [],
    checks: [],
    audio: [],
    content: { expected: 0, found: 0, missing: [], foreign: [] },
    layout: { overflowX: false, offscreen: [], clipped: [], smallTargets: 0 },
    events: null,
    problems: [],
  };
}

function ck(rec, feature, item, action, expected, actual, status, note) {
  const c = { feature, item: item == null ? "" : String(item), action, expected: cut(expected), actual: cut(actual), status };
  if (note) c.note = note;
  rec.checks.push(c);
  if (status === "FAIL") {
    rec.problems.push(`${feature}${c.item ? `[${c.item}]` : ""} ${action}: expected ${cut(expected, 90)} / actual ${cut(actual, 90)}${note ? ` (${note})` : ""}`);
  }
  return status === "PASS";
}
const eqCk = (rec, f, i, a, exp, act, note) => ck(rec, f, i, a, exp, act, norm(exp) === norm(act) ? "PASS" : "FAIL", note);
const hasCk = (rec, f, i, a, needle, haystack, note) =>
  ck(rec, f, i, a, `contains: ${needle}`, haystack, norm(haystack).includes(norm(needle)) ? "PASS" : "FAIL", note);
const lacksCk = (rec, f, i, a, needle, haystack, note) =>
  ck(rec, f, i, a, `absent: ${needle}`, haystack, !norm(haystack).includes(norm(needle)) ? "PASS" : "FAIL", note);
const boolCk = (rec, f, i, a, exp, act, note) => ck(rec, f, i, a, String(exp), String(act), exp === act ? "PASS" : "FAIL", note);

// ---------------------------------------------------------------------------
// page interaction primitives (on top of the shared harness)
// ---------------------------------------------------------------------------

// 2026-09-28 (READING 순서 바꿈 — D31 다): step1 처음 읽기 · step2 핵심 어휘 (cards + blanks) · step3 원문 대조 · step4 다시 읽고 재기
const SEL = {
  view: "main [data-reading-view]",
  step1: 'main [data-step-panel="1"]',
  step2: 'main [data-step-panel="2"]',
  step3: 'main [data-step-panel="3"]',
  step4: 'main [data-step-panel="4"]',
  blanks: 'main [data-step-panel="2"] [data-blanks]',
};
const STEP_KEYS = ["step1", "step2", "step3", "step4"];
/** what contentCompare reads: the four steps, plus the blanks' masked sentences and the reading-aloud box (both kept apart) */
const CAPTURE_KEYS = [...STEP_KEYS, "blanks", "readAloud"];
const STEP_NAMES = ["처음 읽기", "핵심 어휘", "원문 대조", "다시 읽고 재기"];

const el = (sel) => `document.querySelector(${J(sel)})`;
const stepTab = (n) => `document.querySelector('main [data-step-tab="${n}"]')`;
const sent1 = (i) => `document.querySelectorAll(${J(`${SEL.step1} [data-sentence-id]`)})[${i}]`;
// 원문 대조's rows — Step 3 since 2026-09-28 (Step 4 before)
const row3 = (i) => `document.querySelectorAll(${J(`${SEL.step3} [data-rows] [data-sentence-id]`)})[${i}]`;
const inRow3 = (i, sel) => `((${row3(i)}) || { querySelector: () => null }).querySelector(${J(sel)})`;
const vocaRow = (k) => `document.querySelector(${J(`${SEL.step2} [data-vocab="${k}"]`)})`;
const inVoca = (k, sel) => `((${vocaRow(k)}) || { querySelector: () => null }).querySelector(${J(sel)})`;
const action = (scope, name) => `document.querySelector(${J(`${scope} [data-action="${name}"]`)})`;

async function jsText(tab, expr) {
  const v = await tab.eval(`(() => { const e = (${expr}); return e ? (e.innerText || e.value || "") : null; })()`).catch(() => null);
  return v == null ? null : norm(v);
}
async function jsEval(tab, expr, fallback = null) {
  return tab.eval(expr).catch(() => fallback);
}
async function exists(tab, expr) {
  return !!(await jsEval(tab, `!!(${expr})`, false));
}
async function stepText(tab, key) {
  return jsText(tab, el(SEL[key]));
}
async function count(tab, sel) {
  return jsEval(tab, `document.querySelectorAll(${J(sel)}).length`, -1);
}
async function pointOf(tab, expr) {
  return jsEval(
    tab,
    `(() => { const el = (${expr}); if (!el) return null; el.scrollIntoView({ block: 'center', inline: 'center' });
      const rects = [...el.getClientRects()].filter((x) => x.width > 0 && x.height > 0);
      const r = el.getBoundingClientRect();
      const pts = rects.map((x) => [x.left + x.width / 2, x.top + x.height / 2]).concat(rects.map((x) => [x.left + Math.min(8, x.width / 2), x.top + x.height / 2]));
      pts.push([r.left + r.width / 2, r.top + r.height / 2]);
      for (const [x, y] of pts) { const t = document.elementFromPoint(x, y); if (t && (t === el || el.contains(t))) return { x, y, hit: true }; }
      const p = pts[pts.length - 1];
      return { x: p[0], y: p[1], hit: false, coveredBy: (() => { const t = document.elementFromPoint(p[0], p[1]); return t ? (t.innerText || t.tagName).trim().slice(0, 40) : null; })() };
    })()`,
    null,
  );
}
async function hover(tab, expr) {
  const p = await pointOf(tab, expr);
  if (!p) return false;
  await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y });
  return p.hit;
}
async function hoverAway(tab) {
  await tab.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 2, y: 2 });
  await sleep(60);
}
/** A real finger tap (touch viewports) — Chromium turns it into a trusted click. */
async function tap(tab, expr) {
  const p = await pointOf(tab, expr);
  if (!p) return { ok: false, reason: "not found" };
  const tp = [{ x: p.x, y: p.y, radiusX: 6, radiusY: 6, force: 1, id: 1 }];
  await tab.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: tp });
  await sleep(45);
  await tab.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return { ok: true, hit: p.hit, covered: !p.hit, coveredBy: p.coveredBy };
}
/** press = tap on touch viewports, mouse click on desktop; falls back to a click. */
async function press(tab, expr, { touch = false, settle = 0, verify = null } = {}) {
  let r;
  if (touch) {
    r = await tap(tab, expr);
    if (r.ok && verify) {
      let ok = false;
      for (let i = 0; i < 12 && !ok; i++) {
        await sleep(80);
        ok = await verify();
      }
      if (!ok) {
        r = await H.click(tab, expr);
        r.viaMouse = true;
      }
    }
  } else {
    r = await H.click(tab, expr);
  }
  if (settle) await sleep(settle);
  return r;
}
async function key(tab, k) {
  const code = k === " " ? "Space" : k;
  const vk = k === " " ? 32 : k === "Enter" ? 13 : 0;
  await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: k, code, windowsVirtualKeyCode: vk, ...(k === " " ? { text: " " } : {}) });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: k, code, windowsVirtualKeyCode: vk });
}

// ---------------------------------------------------------------------------
// audio
// ---------------------------------------------------------------------------

function summarise(log) {
  const clips = H.summariseAudio(log);
  const tts = (clips.__tts || []).filter((t) => norm(t).length > 0);
  delete clips.__tts;
  return { clips, tts };
}

/** Wait until `expected` reaches 'playing', or an error / TTS fallback / wrong clip shows up. */
async function waitClip(tab, expected, ms = 12000) {
  const end = Date.now() + ms;
  let last = { requested: [], playing: false, error: null, tts: [], dur: null };
  let wrongSince = 0;
  while (Date.now() < end) {
    const log = await H.audioLog(tab);
    const { clips, tts } = summarise(log);
    const requested = Object.keys(clips);
    const c = clips[expected];
    last = {
      requested,
      playing: !!(c && c.playing > 0),
      error: c && c.error > 0 ? `media error code ${c.errCode}` : c && c.rejected > 0 ? `play() rejected ${c.rejectName || ""}` : null,
      tts,
      dur: c ? c.dur : null,
    };
    if (last.playing) return last;
    if (last.error) return last;
    if (tts.length) return last;
    if (requested.length && !requested.includes(expected)) {
      if (!wrongSince) wrongSince = Date.now();
      else if (Date.now() - wrongSince > 1200) return last; // a different clip was requested
    }
    await sleep(100);
  }
  return last;
}

/**
 * Press something that should speak `text` (the string the app hands to speech), and judge it: the clip path must equal
 * the app's own key for that text and must reach 'playing' without a media error and without falling back to browser TTS.
 */
async function playProbe(rec, tab, { feature, item, trigger, text, expr, touch = false, timeout = 12000 }) {
  const expected = H.expectedClip(text);
  await H.audioLog(tab, { clear: true });
  const clicked = await press(tab, expr, { touch });
  if (!clicked.ok) {
    ck(rec, feature, item, `click ${trigger}`, "control clickable", `click failed: ${clicked.reason || ""}`, "FAIL");
    rec.audio.push({ trigger, text: cut(text, 90), expected, requested: [], playing: false, error: "control not clickable", tts: [] });
    return null;
  }
  const res = await waitClip(tab, expected, timeout);
  rec.audio.push({ trigger, text: cut(text, 90), expected, requested: res.requested, playing: res.playing, error: res.error, tts: res.tts.map((t) => cut(t, 60)), dur: res.dur });
  const ok = res.playing && !res.error && !res.tts.length;
  ck(
    rec,
    feature,
    item,
    `play ${trigger}`,
    `clip ${expected} reaches 'playing'`,
    res.playing ? `playing ${expected}` : `requested ${res.requested.join(",") || "nothing"}${res.error ? ` err=${res.error}` : ""}${res.tts.length ? ` TTS fallback: ${cut(res.tts[0], 60)}` : ""}`,
    ok ? "PASS" : "FAIL",
    res.tts.length ? "browser TTS fallback = the clip did not play" : undefined,
  );
  return res;
}

/** The shared audio element (window.__kigMedia — EXTRA_HOOK keeps the element of the last play()) as plain data. */
const MEDIA_STATE = `(() => { const a = window.__kigMedia; return a ? { paused: a.paused, ended: a.ended, hasSrc: !!a.getAttribute('src'), t: Math.round(a.currentTime * 100) / 100, dur: isFinite(a.duration) ? Math.round(a.duration * 100) / 100 : null } : null; })()`;
const isSounding = (m) => !!m && m.hasSrc && !m.paused && !m.ended;
const mediaText = (m) => (m ? `${m.paused ? "paused" : "playing"}${m.ended ? " · ended" : ""} at ${m.t}/${m.dur} s${m.hasSrc ? "" : " · src removed"}` : "no audio element");
async function mediaUntil(tab, pred, ms) {
  const end = Date.now() + ms;
  let m = await jsEval(tab, MEDIA_STATE, null);
  while (!pred(m) && Date.now() < end) {
    await sleep(80);
    m = await jsEval(tab, MEDIA_STATE, null);
  }
  return m;
}
/** "this control shows it is not playing" — the view's own marks (ReadingLearningView PLAYING_MARK · speakerButton · play-row) */
const idleSentence = (i) => `(() => { const s = ${sent1(i)}; const e = s && s.querySelector('[data-en]'); return !!e && !/underline/.test(e.className); })()`;
const idleSpeaker = (btn) => `(() => { const b = ${btn}; return !!b && / 듣기$/.test(b.getAttribute('aria-label') || ''); })()`;
const idleRow = (i) => `(() => { const b = ${inRow3(i, '[data-action="play-row"]')}; return !!b && b.getAttribute('aria-pressed') === 'false'; })()`;

/**
 * A second press on the same control, while its clip plays, must stop the sound — and not start it again.
 *
 * 2026-09-28 — this used to wait for a 'pause' event, which the app's stop never produces: stopSpeech() (speech.ts
 * hardStopStream — the stop of every course, e.g. StudentLearningView toggleSentence → stopAll) calls pause() and then
 * removeAttribute('src') + load() in the same task, and the media element load algorithm removes the element's queued
 * events, the 'pause' among them (HTML "media element load algorithm": "pending events and callbacks are discarded"). So the
 * probe FAILed every correct stop (26 of 26 in each 2026-09-27 run; never a PASS on record) and could PASS a press that did
 * nothing, on a word clip short enough to end by itself ('pause' + 'ended') inside the 1.4 s. Now it reads the shared element:
 *   before  the clip must be sounding when the second press lands (waits up to 3 s); a clip that already ran to its end is
 *           first played again with the same control (`rearm` presses — 2 for a Step 1 sentence, whose press after the end
 *           closes its Korean line), so the press always meets a playing sound;
 *   after   within 1.4 s the element is paused WITHOUT having reached its end (ended = false), stays so for 0.4 s, and the
 *           press requested no clip (no play()) — then `idle` (the control's own playing mark) must be off.
 * --break stop moves the mouse over the control instead of pressing it: this check must then FAIL on every probe.
 */
async function stopProbe(rec, tab, { feature, item, expr, touch = false, rearm = 1, idle = null }) {
  const what = "second press stops playback";
  let before = await mediaUntil(tab, (s) => isSounding(s) || !!(s && s.ended), 3000);
  let note;
  if (!isSounding(before) && before && before.ended) {
    for (let k = 0; k < rearm; k++) await press(tab, expr, { touch, settle: 200 });
    before = await mediaUntil(tab, isSounding, 6000);
    note = `the clip had ended before the second press — played again first (${rearm} press${rearm > 1 ? "es" : ""})`;
  }
  const armed = isSounding(before);
  await H.audioLog(tab, { clear: true });
  const clicked = BREAK === "stop" ? { ok: true, hovered: await hover(tab, expr) } : await press(tab, expr, { touch });
  if (!clicked.ok) {
    ck(rec, feature, item, what, "the control pressed", `press failed: ${clicked.reason || ""}`, "FAIL");
    return false;
  }
  if (!armed) {
    ck(rec, feature, item, what, "a clip playing when the second press lands", `nothing was playing before the second press (${mediaText(before)})`, "FAIL", note || "nothing was tested");
    return false;
  }
  let m = null;
  let restarted = false;
  let quietSince = 0;
  const t0 = Date.now();
  for (;;) {
    await sleep(100);
    restarted = (await H.audioLog(tab)).some((e) => e.ev === "play()");
    m = await jsEval(tab, MEDIA_STATE, null);
    if (restarted) break;
    if (m && m.paused && !m.ended) {
      if (!quietSince) quietSince = Date.now();
      if (Date.now() - quietSince >= 400) break;
    } else {
      quietSince = 0;
      if (Date.now() - t0 >= 1400) break;
    }
  }
  const stopped = !restarted && !!m && m.paused && !m.ended;
  const actual = restarted
    ? `the press started a clip again (play()) — ${mediaText(m)}`
    : stopped
      ? `stopped before its end (${mediaText(m)}), no new clip`
      : !m
        ? "the audio element could not be read after the press"
        : m.ended
          ? `the clip ran to its end by itself (${mediaText(m)}) — the press did not stop it`
          : `still sounding 1.4 s after the press (${mediaText(m)})`;
  ck(rec, feature, item, what, "paused before its end, no new play()", actual, stopped ? "PASS" : "FAIL", BREAK === "stop" ? "깨기 stop: the mouse only moved over the control — must FAIL" : note);
  if (idle) {
    const off = await jsEval(tab, `(() => { try { return !!(${idle}); } catch (e) { return null; } })()`, null);
    ck(rec, feature, item, "after the second press the control shows it stopped", "true", String(off), off === true ? "PASS" : "FAIL");
  }
  return stopped;
}

/** No clip may start (a key word's meaning, the Korean line). */
async function silentProbe(rec, tab, { feature, item, action: what, expr, touch = false }) {
  await H.audioLog(tab, { clear: true });
  await press(tab, expr, { touch, settle: 500 });
  const log = await H.audioLog(tab);
  ck(rec, feature, item, `${what} does not speak`, "no play()", log.some((e) => e.ev === "play()") ? "a clip was requested" : "no play()", log.some((e) => e.ev === "play()") ? "FAIL" : "PASS");
}

// ---------------------------------------------------------------------------
// localStorage of the clone (the only data this driver changes)
// ---------------------------------------------------------------------------

const speedKey = (D) => readingLearning.speedStorageKey(D.mainId);
const wordsKey = (D) => readingLearning.wordsStorageKey(D.mainId);
const notesKey = (D) => `kig:reading:notes:${D.pageKey}`;
const legacyKey = (D) => readingLearning.legacyWpmStorageKey(D.pageKey);
const progKey = (id) => `reading:${id}`;
// 2026-09-28 새 문제 (src/lib/lessonQuestions.ts questionsStorageKey) — the picks of the passage's comprehension questions
const questionsKey = (D) => `kig-questions:${COURSE}/${D.mainId}`;

async function lsGet(tab, k) {
  return jsEval(tab, `(() => { try { return localStorage.getItem(${J(k)}); } catch (e) { return null; } })()`, null);
}
async function lsJson(tab, k) {
  const raw = await lsGet(tab, k);
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
async function progressMap(tab, kind) {
  return jsEval(tab, `(() => { try { return JSON.parse(localStorage.getItem('kig:progress:${kind}') || '{}'); } catch (e) { return null; } })()`, null);
}
/** Clear this lesson's own keys (and the course's engine record) so every page starts from a known state. Returns true if it changed anything. */
async function resetLessonState(tab, D) {
  return jsEval(
    tab,
    `(() => { try {
      let changed = false;
      for (const k of ${J([speedKey(D), wordsKey(D), notesKey(D), legacyKey(D), questionsKey(D), "kig-learning:reading"])}) if (localStorage.getItem(k) !== null) { localStorage.removeItem(k); changed = true; }
      for (const m of ['kig:progress:completed', 'kig:progress:bookmarks']) {
        const raw = localStorage.getItem(m); if (!raw) continue;
        const o = JSON.parse(raw); if (o && ${J(progKey(D.id))} in o) { delete o[${J(progKey(D.id))}]; localStorage.setItem(m, JSON.stringify(o)); changed = true; }
      }
      return changed;
    } catch (e) { return false; } })()`,
    false,
  );
}

// ---------------------------------------------------------------------------
// injected hooks (mic stub + a handle on the shared audio element)
// ---------------------------------------------------------------------------

const EXTRA_HOOK = `(() => {
  if (window.__kigDrv) return; window.__kigDrv = true;
  const P = HTMLMediaElement.prototype, op = P.play;
  P.play = function () { window.__kigMedia = this; return op.apply(this, arguments); };
  // Fake SpeechRecognition: the real one cannot run headless (no microphone, no recognition service). "UI wiring only".
  class FakeRec {
    constructor() { this.lang = 'en-US'; this.continuous = false; this.interimResults = true; this.maxAlternatives = 1; }
    start() {
      const self = this;
      setTimeout(() => {
        if (self.onstart) self.onstart({ type: 'start' });
        setTimeout(() => {
          if (window.__kigSayError) { if (self.onerror) self.onerror({ error: window.__kigSayError }); if (self.onend) self.onend({ type: 'end' }); return; }
          const t = String(window.__kigSay == null ? '' : window.__kigSay);
          const alt = { transcript: t, confidence: 0.92 };
          const res = { 0: alt, length: 1, isFinal: true };
          const results = { 0: res, length: 1 };
          if (self.onresult) self.onresult({ resultIndex: 0, results });
          if (self.onend) self.onend({ type: 'end' });
        }, 120);
      }, 60);
    }
    stop() { if (this.onend) this.onend({ type: 'end' }); }
    abort() { if (this.onend) this.onend({ type: 'end' }); }
    addEventListener() {} removeEventListener() {}
  }
  try { Object.defineProperty(window, 'webkitSpeechRecognition', { configurable: true, writable: true, value: FakeRec }); } catch (e) {}
  try { Object.defineProperty(window, 'SpeechRecognition', { configurable: true, writable: true, value: FakeRec }); } catch (e) {}
})()`;

// ---------------------------------------------------------------------------
// checks — page shell
// ---------------------------------------------------------------------------

const completeBtn = `document.querySelector('main button[aria-label="학습 완료 체크"], main button[aria-label="학습 완료 취소"]')`;
const bookmarkBtn = `document.querySelector('main button[aria-label="북마크 추가"], main button[aria-label="북마크 해제"]')`;
const completeState = `(() => { const b = ${completeBtn}; return b ? { aria: b.getAttribute('aria-label'), disabled: !!b.disabled } : null; })()`;

async function shellChecks(rec, tab, D, snap) {
  rec.steps = (await jsEval(tab, `[...document.querySelectorAll('main [data-step-tab]')].map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim())`, [])) || [];

  eqCk(rec, "shell", "", "h1 title", D.title, (snap.h1 || [])[0]);
  const canonical = await jsEval(tab, `(document.querySelector('link[rel=canonical]') || {}).href || null`, null);
  eqCk(rec, "shell", "", "canonical url", `/${COURSE}/${D.canonical}`, canonical ? new URL(canonical).pathname : null);
  const robots = await jsEval(tab, `((document.querySelector('meta[name=robots]') || {}).content) || null`, null);
  eqCk(rec, "shell", "", "robots meta", D.free ? "(none)" : "noindex, follow", robots || "(none)", D.free ? "free preview pages stay indexable" : undefined);

  boolCk(rec, "shell", "", "paywall absent (licensed profile)", false, !!snap.paywall);
  boolCk(rec, "shell", "", "not-found screen absent", false, !!snap.notFound);
  boolCk(rec, "shell", "", "error screen absent", false, !!snap.errorScreen);
  boolCk(rec, "shell", "", "placeholder '준비 중' absent", false, !!snap.placeholder);
  ck(rec, "shell", "", "no undefined/NaN/null leaking into the text", "no leak", snap.leak || "no leak", snap.leak ? "FAIL" : "PASS");
  ck(rec, "shell", "", "images have alt text", "0 without alt", String(snap.imagesNoAlt), snap.imagesNoAlt === 0 ? "PASS" : "FAIL");
  ck(rec, "shell", "", "no broken images", "0", String(snap.brokenImages), snap.brokenImages === 0 ? "PASS" : "FAIL");
  ck(rec, "shell", "", "form fields are labelled", "0 unlabelled", String(snap.unlabeledFields), snap.unlabeledFields === 0 ? "PASS" : "FAIL");

  // the title row (2026-09-27 frame): '← READING 목록' in nav[aria-label="과정으로"]
  eqCk(rec, "shell", "", "course link href", "/reading", await jsEval(tab, `(() => { const a = document.querySelector('nav[aria-label="과정으로"] a[href="/reading"]'); return a ? a.getAttribute('href') : null; })()`, null));
  hasCk(rec, "shell", "", "course link label", "READING 목록", await jsText(tab, `document.querySelector('nav[aria-label="과정으로"] a[href="/reading"]')`));

  // prev / next (LessonEndBar)
  for (const dir of ["prev", "next"]) {
    const label = dir === "prev" ? "이전 강의" : "다음 강의";
    const expr = `document.querySelector('main a[aria-label^=${J(label)}]')`;
    const href = await jsEval(tab, `(() => { const a = ${expr}; return a ? a.getAttribute('href') : null; })()`, null);
    const aria = await jsEval(tab, `(() => { const a = ${expr}; return a ? a.getAttribute('aria-label') : null; })()`, null);
    const want = D[dir];
    if (want) {
      eqCk(rec, "nav", dir, `${label} href = neighbour by content.ts order`, `/${COURSE}/${want.id}`, href);
      eqCk(rec, "nav", dir, `${label} aria-label`, `${label}: ${want.title}`, aria);
    } else {
      ck(rec, "nav", dir, `boundary: no ${label} link`, "no link", href || "no link", href ? "FAIL" : "PASS", "course boundary");
    }
  }

  // the passage meta line (the header card is gone — RD-U07). 2026-09-28: Step 1 is not timed — its line has no target
  eqCk(rec, "meta", "", "Step 1: word count · sentences (no target — not timed)", D.metaFirst, await jsText(tab, `document.querySelector(${J(`${SEL.step1} [data-passage-meta]`)})`));
  lacksCk(rec, "meta", "", "no header card", "독해 마스터리", await jsText(tab, `document.querySelector('main')`));

  // step tabs (StepTabs) — the text of each still reads "Step N · name" (LessonStepNavigation finds them by it).
  // 2026-09-28 (사장님 D31 다): 처음 읽기 → 핵심 어휘 → 원문 대조 → 다시 읽고 재기
  const want = STEP_NAMES.map((name, i) => `Step ${i + 1} · ${name}`);
  ck(rec, "steps", "", "four step tabs in the new order", want.join(" | "), rec.steps.join(" | "), rec.steps.length === 4 && want.every((t, i) => norm(rec.steps[i]).includes(t)) ? "PASS" : "FAIL");

  // the top whole-lesson player is hidden — the view offers it after the first reading (Step 1) and in 원문 대조 (Step 3) (D01 나)
  const top = await jsEval(tab, `(() => { const p = document.querySelector('main [data-passage-player]'); return p ? getComputedStyle(p).display : 'absent'; })()`, null);
  ck(rec, "player", "top", "the page's top player is hidden (the view owns it)", "none", String(top), top === "none" || top === "absent" ? "PASS" : "FAIL");
  boolCk(rec, "player", "step1", "no whole-lesson player in Step 1 before '다 읽었어요'", false, await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-reading-player]`)})`));

  // bookmark, and completion — disabled until one timed reading in Step 4 (D02)
  eqCk(rec, "bookmark", "", "initial aria-label", "북마크 추가", await jsEval(tab, `(() => { const b = ${bookmarkBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  await H.waitFor(tab, R.VIEW_READY, 8000);
  await sleep(200);
  const c0 = await jsEval(tab, completeState, null);
  eqCk(rec, "complete", "gate", "initial aria-label", "학습 완료 체크", c0 && c0.aria);
  boolCk(rec, "complete", "gate", "'이 강의 학습 완료' disabled before a timed reading", true, !!(c0 && c0.disabled));
  hasCk(rec, "complete", "gate", "the reason under it", readingLearning.READING_GATE_REASON, await jsText(tab, `document.querySelector('main section[aria-label="강의 마치기"]')`));

  const navState = await bottomNavState(tab);
  boolCk(rec, "stepnav", "", "← 이전 Step disabled on Step 1", true, navState.prevDisabled);
  boolCk(rec, "stepnav", "", "다음 Step → enabled on Step 1", false, navState.nextDisabled);
}

async function bottomNavState(tab) {
  return (
    (await jsEval(
      tab,
      `(() => { const b = [...document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')]; return { count: b.length, prevDisabled: b[0] ? !!b[0].disabled : null, nextDisabled: b[1] ? !!b[1].disabled : null }; })()`,
      { count: 0, prevDisabled: null, nextDisabled: null },
    )) || { count: 0 }
  );
}

async function activeStep(tab) {
  for (const k of STEP_KEYS) if (await exists(tab, el(SEL[k]))) return k;
  return null;
}

async function openStep(rec, tab, n, { touch = false } = {}) {
  const k = STEP_KEYS[n - 1];
  if ((await activeStep(tab)) === k) return true;
  const r = await press(tab, stepTab(n), { touch, verify: () => exists(tab, el(SEL[k])) });
  for (let i = 0; i < 25; i++) {
    if (await exists(tab, el(SEL[k]))) return true;
    await sleep(80);
  }
  ck(rec, "steps", `step${n}`, "open step tab", `${k} panel visible`, `not visible${r && r.ok === false ? ` (${r.reason})` : ""}`, "FAIL");
  return false;
}

// ---------------------------------------------------------------------------
// checks — the timed reading (Step 4 since 2026-09-28; it was Step 1's)
// ---------------------------------------------------------------------------

/**
 * One timed reading in Step 4 '다시 읽고 재기': start, wait `waitMs`, finish. Returns the stored record's run (`again` — the
 * only kind the view writes since 2026-09-28) or null.
 */
async function timedRun(rec, tab, D, { waitMs, label, touch = false }) {
  const startExpr = `(${action(SEL.step4, "start-reading")}) || (${action(SEL.step4, "measure-again")})`;
  const started = await press(tab, startExpr, { touch, settle: 700 });
  ck(rec, "wpm", label, "start the timed reading (Step 4)", "started", started.ok ? "started" : `press failed: ${started.reason}`, started.ok ? "PASS" : "FAIL");
  const passageSel = `${SEL.step4} [data-passage="timed"]`;
  // G01: the passage's top comes up under the header; sentences are plain text while timing. A page too short to scroll
  // that far (the bottom of the page is already on screen) is NA, not a failure.
  const pos = await jsEval(tab, `(() => { const s = document.querySelector(${J(`${passageSel} [data-sentence-id] [data-en]`)}); if (!s) return null; const maxScroll = document.documentElement.scrollHeight - innerHeight; return { top: Math.round(s.getBoundingClientRect().top), atBottom: scrollY >= maxScroll - 2 }; })()`, null);
  const top = pos ? pos.top : null;
  ck(rec, "wpm", label, "the passage's first line comes up under the header", "y ≤ 120", String(top), top !== null && top <= 120 ? "PASS" : pos && pos.atBottom ? "NA" : "FAIL", pos && pos.atBottom && top > 120 ? "the page is scrolled to its end — too short to bring the passage higher" : "계획 G01 확인 '시작 뒤 첫 줄 y ≤ 120'");
  // 회귀 점검 1002: an NA here is build-coverage's 'absent' kind (asNa ⓐ) — it counts only when the same record holds a PASS of
  // the same feature ('wpm' — the timed run's other checks); a bare NA would be read there as 'NA 인데 대신 본 기록 없음' (BLOCKED)
  const g01 = rec.checks[rec.checks.length - 1];
  if (g01.status === "NA") Object.assign(g01, { absent: true, absentEvidence: `scrollY at its end (document.scrollHeight - innerHeight) with the first line at y=${top} — the page cannot scroll the passage higher` });
  // the timed passage is the whole lesson passage, sentence by sentence (the learner reads what the WPM is counted over)
  const shownEn = (await jsEval(tab, `[...document.querySelectorAll(${J(`${passageSel} [data-sentence-id] [data-en]`)})].map((e) => (e.innerText || '').replace(/\\s+/g, ' ').trim())`, [])) || [];
  const wantEn = D.sentences.map((s) => norm(s.en));
  ck(rec, "wpm", label, "the timed passage is the whole passage (every sentence, in order)", `${wantEn.length} sentences`, `${shownEn.length} shown${shownEn.length === wantEn.length && !shownEn.every((t, i) => t === wantEn[i]) ? " (a sentence differs)" : ""}`, shownEn.length === wantEn.length && shownEn.every((t, i) => t === wantEn[i]) ? "PASS" : "FAIL");
  eqCk(rec, "wpm", label, "no pressable sentence while timing", "0", String(await count(tab, `${passageSel} [role="button"]`)));
  eqCk(rec, "wpm", label, "no sentence numbers while timing", "0", String(await count(tab, `${passageSel} sup`)));
  const finish = `document.querySelector(${J(`${passageSel} [data-action="finish-reading"]`)})`;
  boolCk(rec, "wpm", label, "'다 읽었어요' at the end of the passage", true, await exists(tab, finish));
  await sleep(waitMs);
  await press(tab, finish, { touch, settle: 600 });
  const stored = await lsJson(tab, speedKey(D));
  return stored ? stored.again || null : null;
}

// ---------------------------------------------------------------------------
// checks — Step 1 '처음 읽기' (the passage, not timed — 2026-09-28)
// ---------------------------------------------------------------------------

async function step1Checks(rec, tab, D, captured) {
  const n = D.sentences.length;
  // 2026-09-28 (D31 다): the first reading is for meaning and is NOT timed — no clock, no start, no WPM, no speed words
  const text1 = (await stepText(tab, "step1")) || "";
  hasCk(rec, "step1", "", "guidance: read for meaning (D31 다)", "뜻을 파악하며", text1);
  for (const word of ["WPM", "목표", "속도", "읽기 시작"]) lacksCk(rec, "step1", "untimed", `no speed wording ('${word}') in the first reading`, word, text1);
  eqCk(rec, "step1", "untimed", "no timing controls in Step 1 (읽기 시작 · 다시 재기 · clock)", "0", String(await count(tab, `${SEL.step1} [data-action="start-reading"], ${SEL.step1} [data-action="measure-again"], ${SEL.step1} [data-action="finish-reading"], ${SEL.step1} [data-passage] [role="status"]`)));
  boolCk(rec, "step1", "untimed", "the passage is on screen from the start (no '읽기 시작' first)", true, (await count(tab, `${SEL.step1} [data-passage="step1"] [data-sentence-id] [data-en]`)) === n && n > 0);
  const cnt = await count(tab, `${SEL.step1} [data-sentence-id]`);
  ck(rec, "step1", "", "sentence count matches the data", String(n), String(cnt), cnt === n ? "PASS" : "FAIL");
  boolCk(rec, "step1", "", "the first sentence is the first learning item (data-learn-first)", true, await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-sentence-id][data-learn-first]`)})`));

  for (let i = 0; i < Math.min(n, cnt); i++) {
    const S = D.sentences[i];
    eqCk(rec, "step1", `s${i + 1}`, "data-sentence-id", S.id, await jsEval(tab, `(${sent1(i)}).getAttribute('data-sentence-id')`, null));
    eqCk(rec, "step1", `s${i + 1}`, "English sentence text", S.en, await jsText(tab, `(${sent1(i)}).querySelector('[data-en]')`));
    eqCk(rec, "step1", `s${i + 1}`, "a sentence is a button", "button", await jsEval(tab, `(${sent1(i)}).getAttribute('role')`, null));
  }

  // RD-U02: moving the mouse over the passage changes nothing (60 moves)
  const before = await jsEval(tab, `(document.querySelector(${J(`${SEL.step1} [data-passage]`)}) || {}).outerHTML || ''`, "");
  for (let k = 0; k < 60; k++) await hover(tab, sent1(k % Math.max(1, cnt)));
  await hoverAway(tab);
  const after = await jsEval(tab, `(document.querySelector(${J(`${SEL.step1} [data-passage]`)}) || {}).outerHTML || ''`, "");
  const changed = BREAK === "hover" ? before === after : before !== after;
  ck(rec, "step1", "hover", "60 mouse moves over the sentences change nothing", "unchanged", changed ? "the passage changed" : "unchanged", changed ? "FAIL" : "PASS", BREAK === "hover" ? "깨기 hover: expects a change" : undefined);

  // press a sentence: its clip plays and its Korean shows (the panel from sm); a second press stops and closes
  for (let i = 0; i < Math.min(n, cnt); i++) {
    const S = D.sentences[i];
    await playProbe(rec, tab, { feature: "step1", item: `s${i + 1}`, trigger: `sentence ${i + 1} press`, text: D.spoken(i), expr: sent1(i) });
    hasCk(rec, "step1", `s${i + 1}`, "its Korean shows in the panel under the passage", S.ko, await jsText(tab, `document.querySelector(${J(`${SEL.step1} [data-ko-panel]`)})`));
    const cls = await jsEval(tab, `(((${sent1(i)}) || {}).querySelector ? (${sent1(i)}).querySelector('[data-en]').className : '')`, "");
    ck(rec, "step1", `s${i + 1}`, "the playing sentence is underlined (not bold red)", "underline decoration-primary", cut(cls, 120), /underline/.test(cls) && !/red|font-bold/.test(cls) ? "PASS" : "FAIL");
    await stopProbe(rec, tab, { feature: "step1", item: `s${i + 1}`, expr: sent1(i), rearm: 2, idle: idleSentence(i) });
    lacksCk(rec, "step1", `s${i + 1}`, "a second press closes the Korean", S.ko, (await jsText(tab, `document.querySelector(${J(`${SEL.step1} [data-ko-panel]`)})`)) || "");
  }

  // keyboard: Enter on a focused sentence plays it (and the top player does not take the key)
  await jsEval(tab, `(() => { const s = ${sent1(0)}; if (s) s.focus(); return document.activeElement === s; })()`, false);
  await H.audioLog(tab, { clear: true });
  await key(tab, "Enter");
  const kb = await waitClip(tab, H.expectedClip(D.spoken(0)), 8000);
  ck(rec, "step1", "keyboard", "Enter on a sentence plays it", "clip of sentence 1 playing", kb.playing ? "playing" : `requested ${kb.requested.join(",") || "nothing"}`, kb.playing ? "PASS" : "FAIL");
  await key(tab, "Enter");
  await sleep(300);

  // the 'Aa' menu: size, numbers, copy (RD-U07)
  const menu = action(SEL.step1, "view-menu");
  await press(tab, menu, { settle: 250 });
  for (const [size, px] of [["large", "18px"], ["xlarge", "22px"], ["normal", "16px"]]) {
    await press(tab, `document.querySelector('main [data-size="${size}"]')`, { settle: 200 });
    const fontSize = await jsEval(tab, `(() => { const c = document.querySelector(${J(`${SEL.step1} [data-passage] [lang="en"]`)}); return c ? getComputedStyle(c).fontSize : null; })()`, null);
    eqCk(rec, "step1", `size ${size}`, "passage font-size", px, fontSize);
  }
  eqCk(rec, "step1", "size", "the size is remembered for every lesson", "normal", ((await lsJson(tab, readingLearning.PREFS_STORAGE_KEY)) || {}).size);
  await press(tab, `document.querySelector('main [data-action="toggle-numbers"]')`, { settle: 200 });
  eqCk(rec, "step1", "numbers", "numbers off", "0", String(await count(tab, `${SEL.step1} [data-sentence-id] sup`)));
  await press(tab, `document.querySelector('main [data-action="toggle-numbers"]')`, { settle: 200 });
  eqCk(rec, "step1", "numbers", "numbers back", String(n), String(await count(tab, `${SEL.step1} [data-sentence-id] sup`)));
  await press(tab, `document.querySelector('main [data-action="copy-passage"]')`, { settle: 400 });
  hasCk(rec, "step1", "copy", "copy feedback", "복사했어요", await jsText(tab, `document.querySelector('main [data-action="copy-passage"]')`));
  const clip = await jsEval(tab, `navigator.clipboard.readText().catch(() => null)`, null);
  const want = D.sentences.map((s) => s.en).join(" ");
  ck(rec, "step1", "copy", "clipboard holds the whole passage", cut(want, 120), clip == null ? "clipboard unreadable" : cut(clip, 120), clip != null && norm(clip) === norm(want) ? "PASS" : "FAIL", clip == null ? "clipboard read blocked in this profile" : undefined);
  await key(tab, "Escape");
  await sleep(150);

  captured.step1 = await stepText(tab, "step1");
}

/**
 * Step 1's '다 읽었어요' (2026-09-28): the end of the first, untimed reading. It must store nothing, leave the completion shut and
 * offer '다음: Step 2 핵심 어휘' and the whole-lesson player. --break untimed times one reading in Step 4 (R.MEASURE_ONCE) right
 * after the press, so the two "stored nothing / still shut" checks read a record and an open gate — they must FAIL.
 */
async function firstReadChecks(rec, tab, D, { touch = false } = {}) {
  const done = `document.querySelector(${J(`${SEL.step1} [data-passage="step1"] [data-action="first-read-done"]`)})`;
  boolCk(rec, "step1", "first-read", "'다 읽었어요' at the end of the passage", true, await exists(tab, done));
  const r = await press(tab, done, { touch, settle: 500 });
  ck(rec, "step1", "first-read", "press '다 읽었어요'", "pressed", r.ok ? "pressed" : `press failed: ${r.reason}`, r.ok ? "PASS" : "FAIL");
  if (BREAK === "untimed") {
    const m = await tab.eval(R.MEASURE_ONCE).catch((e) => ({ ok: false, why: String(e && e.message) }));
    rec.breakNote = `깨기 untimed: timed one reading in Step 4 (${m && m.ok ? "done" : (m && m.why) || "?"}) before the checks below — they must FAIL`;
    await openStep(rec, tab, 1, { touch });
  }
  const stored = await lsJson(tab, speedKey(D));
  ck(rec, "step1", "first-read", "the first reading stores no time (kig:reading:speed:v1 stays empty)", "no record", stored ? J(stored).slice(0, 120) : "no record", stored && (stored.first || stored.again) ? "FAIL" : "PASS", BREAK === "untimed" ? "깨기 untimed — must FAIL" : speedKey(D));
  boolCk(rec, "complete", "gate", "still disabled after Step 1's '다 읽었어요' (only Step 4's timed reading opens it)", true, !!(((await jsEval(tab, completeState, null)) || {}).disabled), BREAK === "untimed" ? "깨기 untimed — must FAIL" : undefined);
  boolCk(rec, "step1", "first-read", "'다 읽었어요' goes away once pressed", false, await exists(tab, done));
  boolCk(rec, "step1", "first-read", "'다음: Step 2 핵심 어휘' is offered", true, await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-first-read] [data-action="to-step2"]`)})`));
  boolCk(rec, "player", "step1", "the whole-lesson player appears after '다 읽었어요'", true, await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-reading-player="step1"] button[aria-label="재생"]`)})`));
  lacksCk(rec, "step1", "first-read", "no WPM or time shown for the first reading", "WPM", (await stepText(tab, "step1")) || "");
}

/**
 * Step 4 '다시 읽고 재기' (2026-09-28): the only timed reading. Before '읽기 시작' the passage is not on screen and there is no player;
 * a too-fast run is explained and not saved and the completion stays shut; a real run is stored as `again`, shows this run only
 * (no '→', no '%') and opens the completion; the comprehension questions (2026-09-28 새 문제) are the page's own, under it — or,
 * for a passage without a question file, the slot is there, hidden and empty.
 */
async function step4Checks(rec, tab, D, captured, { touch = false } = {}) {
  eqCk(rec, "step4", "", "Step 4 meta: word count · sentences · target", D.metaTimed, await jsText(tab, `document.querySelector(${J(`${SEL.step4} [data-passage-meta]`)})`));
  boolCk(rec, "step4", "", "'읽기 시작' is there", true, await exists(tab, action(SEL.step4, "start-reading")));
  eqCk(rec, "step4", "", "the passage is not on screen before '읽기 시작' (it cannot be read before the clock starts)", "0", String(await count(tab, `${SEL.step4} [data-sentence-id]`)));
  boolCk(rec, "player", "step4", "no whole-lesson player in the timed step", false, await exists(tab, `document.querySelector(${J(`${SEL.step4} [data-reading-player]`)})`));
  // the comprehension questions (2026-09-28 새 문제): a passage with a question file shows them under the timed reading — the
  // page's own questions, in order; a passage without one keeps the slot hidden and empty. The generated quiz stays off.
  const slot = await jsEval(tab, `(() => { const s = document.querySelector(${J(`${SEL.step4} [data-comprehension]`)}); return s ? { kind: s.getAttribute('data-comprehension'), hidden: s.hidden || getComputedStyle(s).display === 'none', text: (s.textContent || '').trim().length, kids: s.children.length, prompts: [...s.querySelectorAll('[data-question] > p:first-child')].map((p) => p.textContent.replace(/\\s+/g, ' ').trim()), options: [...s.querySelectorAll('[data-question]')].map((li) => li.querySelectorAll('[data-option]').length) } : null; })()`, null);
  if (D.questions && D.questions.length) {
    const want = D.questions.map((q, i) => `${i + 1}. ${q.prompt}`);
    ck(rec, "step4", "comprehension", "the passage's questions are shown under the timed reading, in order, 4 options each", `${want.length} · ${cut(want.join(" / "), 160)}`, slot ? `${slot.hidden ? "HIDDEN" : "shown"} · ${slot.prompts.length} · ${cut(slot.prompts.join(" / "), 160)} · options ${slot.options.join(",")}` : "no [data-comprehension]", slot && !slot.hidden && slot.kind === "questions" && J(slot.prompts) === J(want) && slot.options.every((n) => n === 4) ? "PASS" : "FAIL");
  } else {
    ck(rec, "step4", "comprehension", "the comprehension slot is there, hidden and empty (no question file for this passage)", "hidden · 0 characters", slot ? `${slot.hidden ? "hidden" : "SHOWN"} · ${slot.text} characters · ${slot.kids} children` : "no [data-comprehension]", slot && slot.hidden && slot.text === 0 && slot.kids === 0 ? "PASS" : "FAIL");
  }
  lacksCk(rec, "step4", "comprehension", "generated quiz stays off (SHOW_GENERATED_QUIZ=false)", "Q1.", (await stepText(tab, "step4")) || "");

  // too fast: start and finish at once — explained, not saved, the gate stays shut (RD-L04 ⑥)
  const tooFast = await timedRun(rec, tab, D, { waitMs: 200, label: touch ? "too-fast (tap)" : "too-fast", touch });
  boolCk(rec, "wpm", "too-fast", "a run faster than 500 WPM is not saved", true, tooFast === null);
  boolCk(rec, "wpm", "too-fast", "the reason is shown", true, await exists(tab, `document.querySelector(${J(`${SEL.step4} [data-too-fast]`)})`));
  boolCk(rec, "complete", "gate", "still disabled after a too-fast run", true, !!(((await jsEval(tab, completeState, null)) || {}).disabled));
  if (touch) {
    await questionChecks(rec, tab, D, { touch: true });
    captured.step4 = await stepText(tab, "step4");
    return null;
  }

  // a real run
  const run = await timedRun(rec, tab, D, { waitMs: D.minMs, label: "again" });
  ck(rec, "wpm", "again", "the run is stored (the record's `again`)", "a run", run ? `${run.wpm} WPM · ${run.ms} ms` : "none", run ? "PASS" : "FAIL", speedKey(D));
  if (run) {
    // 회귀 점검 1002 T5 (2026-10-05): run.ms is the app's time ROUNDED to 1 ms — the app's WPM came from the unrounded time, so any WPM
    // of the ±0.5 ms window is right (lib/wpm-window.cjs). It was an exact match on the rounded ms: FAIL 9 on x.5 boundaries.
    // --break wpm-exact (깨기): the old exact compare.
    const win = require("./lib/wpm-window.cjs");
    const w = win.windowOf(readingLearning.wordsPerMinute, D.wordCount, run.ms);
    const okWpm = BREAK === "wpm-exact" ? w.at === run.wpm : win.within(readingLearning.wordsPerMinute, D.wordCount, run.ms, run.wpm);
    ck(rec, "wpm", "again", "WPM = words ÷ the timed minutes", BREAK === "wpm-exact" ? String(w.at) : win.say(w), String(run.wpm), okWpm && run.wpm <= MAX_WPM ? "PASS" : "FAIL");
    const result = (await jsText(tab, `document.querySelector(${J(`${SEL.step4} [data-speed-result]`)})`)) || "";
    hasCk(rec, "wpm", "again", "the result shows the number", D.timeOnly ? readingLearning.formatDuration(run.ms) : `${run.wpm} WPM`, result, D.timeOnly ? "one-sentence passage: the time only" : undefined);
    const verdict = readingLearning.targetVerdict(run.wpm);
    hasCk(rec, "wpm", "again", "one line against the target (no grades)", { faster: "빨라요", near: "비슷해요", slower: D.timeOnly ? "오래 걸렸어요" : "느려요" }[verdict], result);
    lacksCk(rec, "wpm", "again", "no old grade words", "최상위", result);
    // this run only: the first reading has no number now — no 'A → B' and no improvement percentage
    lacksCk(rec, "wpm", "again", "this run only — no 'A → B' comparison", "→", result);
    lacksCk(rec, "wpm", "again", "no improvement percentage", "%", result);
    boolCk(rec, "wpm", "again", "'다시 재기' in the result", true, await exists(tab, action(SEL.step4, "measure-again")));
  }
  // the gate opens
  await sleep(300);
  boolCk(rec, "complete", "gate", "enabled after one timed reading in Step 4", false, !!(((await jsEval(tab, completeState, null)) || {}).disabled));
  await questionChecks(rec, tab, D);
  captured.step4 = await stepText(tab, "step4");
  return run;
}

// ---------------------------------------------------------------------------
// checks — the comprehension questions (Step 4, under the timed reading — 2026-09-28 새 문제; answered since 회귀 점검 1002)
// ---------------------------------------------------------------------------

const QSEL = `${SEL.step4} [data-comprehension="questions"] [data-lesson-questions]`;
const MARKS = ["①", "②", "③", "④"];
async function questionState(tab) {
  return jsEval(
    tab,
    `(() => { const s = document.querySelector(${J(QSEL)}); if (!s) return null;
      const head = s.querySelector(':scope > div p.tabular-nums');
      return { answered: Number(s.getAttribute('data-answered')), right: Number(s.getAttribute('data-right')), head: head ? head.innerText.trim() : '',
        again: !!s.querySelector('[data-action="questions-again"]'),
        qs: [...s.querySelectorAll('[data-question]')].map((li) => ({ id: li.getAttribute('data-question'), verdict: li.getAttribute('data-verdict'),
          options: [...li.querySelectorAll('[data-option]')].map((b) => ((b.querySelector('span.min-w-0') || b).innerText || '').replace(/\\s+/g, ' ').trim()),
          locked: [...li.querySelectorAll('[data-option]')].every((b) => b.disabled),
          result: ((li.querySelector('[data-question-result] > p') || {}).innerText || '').trim() })) }; })()`,
    null,
  );
}
const optionBtn = (qid, oi) => `document.querySelector(${J(`${QSEL} [data-question="${qid}"] [data-option="${oi}"]`)})`;

/**
 * Answer every question of the passage and read how the screen grades it. `plan[i]` = "right" (press the file's answer) or
 * "wrong" (press another option). --break answer presses a wrong option where the plan says "right" — those checks must FAIL.
 */
async function answerQuestions(rec, tab, D, { plan, label, touch }) {
  const Q = D.questions;
  for (let i = 0; i < Q.length; i++) {
    const q = Q[i];
    const wantRight = plan[i] === "right";
    const pick = wantRight && BREAK !== "answer" ? q.answer : (q.answer + 1) % q.options.length;
    const r = await press(tab, optionBtn(q.id, pick), { touch, settle: 250 });
    if (!r.ok) ck(rec, "questions", `${label}#${i + 1}`, `press option ${MARKS[pick]}`, "pressed", `press failed: ${r.reason || ""}`, "FAIL");
  }
  const st = await questionState(tab);
  for (let i = 0; i < Q.length; i++) {
    const q = Q[i];
    const wantRight = plan[i] === "right";
    const got = st && st.qs.find((x) => x.id === q.id);
    ck(rec, "questions", `${label}#${i + 1}`, wantRight ? "the right option is graded right" : "a wrong option is graded wrong", wantRight ? "right · 맞았어요." : `wrong · 정답은 ${MARKS[q.answer]}번이에요.`,
      got ? `${got.verdict} · ${got.result}` : "question not on screen",
      got && got.verdict === (wantRight ? "right" : "wrong") && norm(got.result) === (wantRight ? "맞았어요." : `정답은 ${MARKS[q.answer]}번이에요.`) ? "PASS" : "FAIL",
      BREAK === "answer" && wantRight ? "깨기 answer: a wrong option was pressed — must FAIL" : undefined);
    boolCk(rec, "questions", `${label}#${i + 1}`, "the options lock once answered", true, !!(got && got.locked));
  }
  const right = plan.filter((p) => p === "right").length;
  eqCk(rec, "questions", label, "the count line", `${Q.length}문제 중 ${right}개 맞힘`, st ? st.head : null, BREAK === "answer" ? "깨기 answer — must FAIL" : undefined);
  return st;
}

async function questionChecks(rec, tab, D, { touch = false } = {}) {
  if (!(D.questions && D.questions.length)) return;
  const Q = D.questions;
  const tag = touch ? " (tap)" : "";
  const ready = await H.waitFor(tab, `Boolean(document.querySelector(${J(QSEL)}))`, 4000);
  if (!ready) {
    ck(rec, "questions", "", "the questions are on screen after the timed reading", "[data-lesson-questions]", "none", "FAIL");
    return;
  }
  const st0 = await questionState(tab);
  eqCk(rec, "questions", "", `nothing answered at the start${tag}`, `0 / ${Q.length}`, st0 ? `${st0.answered} / ${st0.qs.length}` : null);
  for (let i = 0; i < Q.length; i++) {
    const got = st0 && st0.qs[i];
    eqCk(rec, "questions", `q${i + 1}`, "the four options, in the file's order", Q[i].options.join(" | "), got ? got.options.join(" | ") : null);
  }
  const log0 = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.length;
  if (!touch) {
    // question 1 wrong, the rest right — then '다시 풀기' clears the picks
    await answerQuestions(rec, tab, D, { plan: Q.map((_, i) => (i === 0 ? "wrong" : "right")), label: "mixed", touch });
    const again = `document.querySelector(${J(`${QSEL} [data-action="questions-again"]`)})`;
    const r = await press(tab, again, { settle: 300 });
    const st1 = await questionState(tab);
    ck(rec, "questions", "again", "'다시 풀기' clears every pick", `0 / ${Q.length}`, st1 ? `${st1.answered} / ${st1.qs.length}${r.ok ? "" : " (press failed)"}` : "none", st1 && st1.answered === 0 && st1.qs.every((x) => !x.verdict) ? "PASS" : "FAIL");
  }
  await answerQuestions(rec, tab, D, { plan: Q.map(() => "right"), label: `all right${tag}`, touch });
  // the engine hears every pick: item = the question id, correct = the pick was the answer (kind 'question', tap, lesson)
  const log = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.slice(log0);
  const last = Q.map((q) => [...log].reverse().find((e) => e.item === q.id));
  ck(rec, "engine", "questions", "every pick is an attempt (the last one per question: correct)", `${Q.length} × correct`, last.map((e) => (e ? `${e.correct}/${e.kind || "?"}` : "none")).join(","),
    last.every((e) => e && e.correct === true && e.mode === "tap" && e.where === "lesson") ? "PASS" : "FAIL");
  const stored = await lsJson(tab, questionsKey(D));
  ck(rec, "questions", "", "the picks are saved", `${Q.length} picks`, stored ? J(stored.picks || {}).slice(0, 120) : "nothing", stored && Q.every((q) => stored.picks && stored.picks[q.id] !== undefined) ? "PASS" : "FAIL", questionsKey(D));
}

/** G04: the whole-lesson player tints the sentence it reads (Step 1 after '다 읽었어요', Step 3 원문 대조). */
async function playerTintChecks(rec, tab, D, where) {
  const scope = where === "step1" ? SEL.step1 : SEL.step3;
  const play = `document.querySelector(${J(`${scope} [data-reading-player] button[aria-label="재생"], ${scope} [data-reading-player] button[aria-label="일시정지"]`)})`;
  const stop = `document.querySelector(${J(`${scope} [data-reading-player] button[aria-label="정지"]`)})`;
  if (!(await exists(tab, play))) {
    ck(rec, "player", where, "whole-lesson player present", "present", "absent", "FAIL");
    return;
  }
  await playProbe(rec, tab, { feature: "player", item: where, trigger: `${where} player ▶`, text: D.spoken(0), expr: play });
  const tinted = await jsEval(
    tab,
    `(() => { const list = [...document.querySelectorAll(${J(`${scope} [data-sentence-id]`)})]; return list.map((s) => { const e = s.querySelector('[data-en] span') || s.querySelector('[data-en]'); return e && /bg-primary-soft/.test(e.className) ? 1 : 0; }); })()`,
    [],
  );
  ck(rec, "player", where, "only the sentence being read is tinted (G04)", "1 at sentence 1", (tinted || []).join(""), (tinted || [])[0] === 1 && (tinted || []).reduce((a, b) => a + b, 0) === 1 ? "PASS" : "FAIL");
  await press(tab, stop, { settle: 400 });
}

// ---------------------------------------------------------------------------
// checks — Step 2 (key words)
// ---------------------------------------------------------------------------

async function step2Checks(rec, tab, D, captured) {
  const rows = await count(tab, `${SEL.step2} [data-vocab]`);
  ck(rec, "step2", "", "row count matches the data", String(D.vocab.length), String(rows), rows === D.vocab.length ? "PASS" : "FAIL");
  eqCk(rec, "step2", "", "meanings start hidden (RD-L15)", "0", String(await count(tab, `${SEL.step2} [data-meaning]`)));

  for (let k = 1; k <= Math.min(D.vocab.length, rows); k++) {
    const V = D.vocab[k - 1];
    eqCk(rec, "step2", `k${k}`, "word", V.word, await jsText(tab, inVoca(k, "[data-word-text]")));
    hasCk(rec, "step2", `k${k}`, "part of speech in words", readingLearning.posLabel(V.partOfSpeech), (await jsText(tab, vocaRow(k))) || "");
    const line = (await jsText(tab, inVoca(k, "[data-context]"))) || "";
    ck(rec, "step2", `k${k}`, "its passage line holds the word (any case)", V.word, line, line.toLowerCase().includes(String(V.word).toLowerCase()) ? "PASS" : "FAIL");
    await press(tab, inVoca(k, '[data-action="reveal"]'), { settle: 150 });
    eqCk(rec, "step2", `k${k}`, "meaning after '뜻 보기'", V.korean, await jsText(tab, inVoca(k, "[data-meaning]")));
    await playProbe(rec, tab, { feature: "step2", item: `k${k}`, trigger: `word ${V.word}`, text: D.wordSpoken(k), expr: inVoca(k, '[data-action="word-audio"]') });
    await stopProbe(rec, tab, { feature: "step2", item: `k${k}`, expr: inVoca(k, '[data-action="word-audio"]'), idle: idleSpeaker(inVoca(k, '[data-action="word-audio"]')) });
  }

  // 2026-09-28 — the Step 2 text for the content check is read HERE: every meaning opened by its own '뜻 보기' (the loop
  // above), as a learner opens them, before '알아요' folds a row. It used to be read after pressing '뜻 모두 보기' below, but
  // that button is one toggle (renderStep2 allRevealed): with all 14 meanings already open it reads '뜻 모두 가리기', so the
  // press HID them — the 2026-09-27 desktop run lost 13 meanings (content 25/38). The phone opens one word first, so there the
  // same press showed them all (38/38).
  captured.step2 = await stepText(tab, "step2");

  // '몰라요' on the first word, '알아요' on the second — saved, sent to the engine, and the known row folds
  const before = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.length;
  await press(tab, inVoca(1, '[data-action="unknown"]'), { settle: 250 });
  await press(tab, inVoca(2, '[data-action="known"]'), { settle: 250 });
  const words = (await lsJson(tab, wordsKey(D))) || {};
  ck(rec, "step2", "marks", "the marks are saved", '{"1":"unknown","2":"known"}', J(words.marks || null), words.marks && words.marks["1"] === "unknown" && words.marks["2"] === "known" ? "PASS" : "FAIL", wordsKey(D));
  eqCk(rec, "step2", "marks", "'알아요' folds its row", "known", await jsEval(tab, `(${vocaRow(2)} || {}).getAttribute ? ${vocaRow(2)}.getAttribute('data-mark') : null`, null));
  boolCk(rec, "step2", "marks", "the folded row can be opened again", true, await exists(tab, inVoca(2, '[data-action="unfold"]')));
  const log = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.slice(before);
  const k1 = log.find((e) => e.item === `${D.mainId}#k1`);
  const k2 = log.find((e) => e.item === `${D.mainId}#k2`);
  ck(rec, "engine", "marks", "each mark is an attempt (몰라요 = wrong, 알아요 = right; tap, lesson)", "k1 false · k2 true", `k1 ${k1 ? k1.correct : "none"} · k2 ${k2 ? k2.correct : "none"}`, k1 && k2 && k1.correct === false && k2.correct === true && k1.mode === "tap" && k1.where === "lesson" ? "PASS" : "FAIL");

  // the toggle, both ways (2026-09-28): every meaning is open now, so it reads '뜻 모두 가리기' and hides them all; pressed
  // again it reads '뜻 모두 보기' and shows every meaning (the folded '알아요' row aside)
  const toggle = action(SEL.step2, "reveal-all");
  eqCk(rec, "step2", "reveal-all", "with every meaning open the button reads '뜻 모두 가리기'", "뜻 모두 가리기", await jsText(tab, toggle));
  await press(tab, toggle, { settle: 250 });
  eqCk(rec, "step2", "reveal-all", "'뜻 모두 가리기' hides every meaning", "0", String(await count(tab, `${SEL.step2} [data-meaning]`)));
  eqCk(rec, "step2", "reveal-all", "then the button reads '뜻 모두 보기'", "뜻 모두 보기", await jsText(tab, toggle));
  await press(tab, toggle, { settle: 250 });
  const text2 = await stepText(tab, "step2");
  const missing = D.vocab.filter((v, i) => i !== 1 && !norm(text2).includes(norm(v.korean))).map((v) => v.word);
  ck(rec, "step2", "reveal-all", "'뜻 모두 보기' shows every meaning (the folded row aside)", "0 missing", missing.join(",") || "0 missing", missing.length === 0 ? "PASS" : "FAIL");
}

// ---------------------------------------------------------------------------
// checks — the blanks (Step 2, below the cards, since 2026-09-28 — they were Step 3)
// ---------------------------------------------------------------------------

async function blankInDom(tab) {
  return jsEval(
    tab,
    `(() => { const c = document.querySelector(${J(`${SEL.blanks} [data-cloze]`)}); if (!c) return null; const opts = [...c.querySelectorAll('[data-option]')];
      return { order: Number(c.getAttribute('data-order')), masked: (c.querySelector('[data-masked]') || {}).innerText || '', options: opts.map((b) => (b.innerText || '').trim()), disabled: opts.map((b) => !!b.disabled),
        feedback: (c.querySelector('[data-cloze-feedback]') || { getAttribute: () => null }).getAttribute('data-cloze-feedback'), filled: (c.querySelector('[data-filled]') || {}).innerText || '', ko: (c.querySelector('[data-cloze-ko]') || {}).innerText || '' }; })()`,
    null,
  );
}

/** Answer one set: `plan` says per item "right" or "wrong". Returns the orders answered wrong. */
async function answerSet(rec, tab, D, items, { label, plan, touch = false, listen = false }) {
  const wrong = [];
  for (let i = 0; i < items.length; i++) {
    const want = items[i];
    const got = await blankInDom(tab);
    if (!got) {
      ck(rec, "blanks", `${label}#${i + 1}`, "blank on screen", "a blank", "none", "FAIL");
      return wrong;
    }
    eqCk(rec, "blanks", `${label}#${i + 1}`, "the key word it asks (order)", String(want.order), String(got.order));
    eqCk(rec, "blanks", `${label}#${i + 1}`, "masked sentence = the generator's", want.maskedSentence, got.masked);
    eqCk(rec, "blanks", `${label}#${i + 1}`, "the four options, in order", want.options.join(" | "), got.options.join(" | "));
    const pick = plan[i] === "wrong" ? want.options.findIndex((o, j) => j !== want.answerIndex) : want.answerIndex;
    await press(tab, `document.querySelector(${J(`${SEL.blanks} [data-cloze] [data-option="${pick}"]`)})`, { touch, settle: 300 });
    const after = await blankInDom(tab);
    eqCk(rec, "blanks", `${label}#${i + 1}`, "feedback", plan[i] === "wrong" ? "wrong" : "correct", after && after.feedback);
    ck(rec, "blanks", `${label}#${i + 1}`, "options lock after answering", "every option disabled", after ? after.disabled.join(",") : "", after && after.disabled.every(Boolean) ? "PASS" : "FAIL");
    eqCk(rec, "blanks", `${label}#${i + 1}`, "the filled sentence", want.originalSentence, after && after.filled);
    eqCk(rec, "blanks", `${label}#${i + 1}`, "its Korean", D.sentences[want.sentenceIndex].ko, after && after.ko);
    if (plan[i] === "wrong") {
      wrong.push(want.order);
      const cls = await jsEval(tab, `(() => { const b = document.querySelector(${J(`${SEL.blanks} [data-cloze] [data-option="${pick}"]`)}); return b ? b.className : ''; })()`, "");
      ck(rec, "blanks", `${label}#${i + 1}`, "the picked wrong option is struck through", "line-through", cut(cls, 100), /line-through/.test(cls) ? "PASS" : "FAIL");
    }
    if (listen) await playProbe(rec, tab, { feature: "blanks", item: `${label}#${i + 1}`, trigger: "문장 듣기", text: D.spoken(want.sentenceIndex), expr: action(SEL.blanks, "cloze-listen"), touch });
    await press(tab, action(SEL.blanks, "cloze-next"), { touch, settle: 300 });
  }
  return wrong;
}

/**
 * The blanks below the cards in Step 2. `unknown` = the words marked '몰라요' on the cards before the first answer — the set
 * follows those marks until then (ReadingLearningView clozeItems), so it is judged against generateClozeItems(…, unknown).
 */
async function blankChecks(rec, tab, D, captured, { touch = false, unknown = [], answer = null } = {}) {
  const text = (await jsText(tab, el(SEL.blanks))) || "";
  hasCk(rec, "blanks", "", "the blanks are in Step 2, below the cards (they were Step 3)", "빈칸", text);
  const round0 = D.cloze(BREAK === "cloze" ? 1 : 0, unknown);
  if (!round0.length) {
    hasCk(rec, "blanks", "", "a passage without blanks says so", "빈칸 문제를 만들 수 없어요", text);
    captured.blanks = text;
    return;
  }
  const items = answer ? round0.slice(0, answer) : round0;
  const before = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.length;
  const plan = round0.map((_, i) => (i === 1 ? "wrong" : "right"));
  const label = `${BREAK === "cloze" ? "round0(깨기: round 1 expected)" : "round0"}${touch ? " (tap)" : ""}`;
  const wrong = await answerSet(rec, tab, D, items, { label, plan, touch, listen: !touch });
  captured.blanks = round0.map((it) => it.maskedSentence).join("\n");
  if (answer) return;
  const result = await jsText(tab, `document.querySelector(${J(`${SEL.blanks} [data-cloze-result]`)})`);
  hasCk(rec, "blanks", "result", "n / total", `${round0.length - wrong.length} / ${round0.length} 맞힘`, result);
  const log = ((await lsJson(tab, "kig-learning:reading")) || { log: [] }).log.slice(before);
  ck(rec, "engine", "blanks", "every blank answer is an attempt", `${round0.length} attempts`, `${log.length}`, log.length === round0.length && log.every((e) => /#k\d+$/.test(e.item) && e.mode === "tap" && e.where === "lesson") ? "PASS" : "FAIL");
  const words = (await lsJson(tab, wordsKey(D))) || {};
  ck(rec, "engine", "blanks", "a missed blank's word is kept for the review", J(wrong), J((words.missed || []).filter((o) => wrong.includes(o))), wrong.every((o) => (words.missed || []).includes(o)) ? "PASS" : "FAIL", wordsKey(D));

  // '다른 빈칸으로 다시 풀기' → round 1
  await press(tab, action(SEL.blanks, "cloze-again"), { touch, settle: 400 });
  const round1 = D.cloze(1, unknown);
  const first = await blankInDom(tab);
  eqCk(rec, "blanks", "round1", "'다른 빈칸으로 다시 풀기' asks round 1's first blank", round1[0] ? round1[0].maskedSentence : "(none)", first ? first.masked : "(none)");
}

// ---------------------------------------------------------------------------
// checks — Step 3 원문 대조 (rows, key words, views, reading aloud, memo — Step 4 until 2026-09-28)
// ---------------------------------------------------------------------------

async function step3Checks(rec, tab, D, captured) {
  const n = D.sentences.length;
  hasCk(rec, "step3", "", "one heading line", "영어 원문 · 한글 해석", await stepText(tab, "step3"));
  const rows = await count(tab, `${SEL.step3} [data-rows] [data-sentence-id]`);
  ck(rec, "step3", "", "row count", String(n), String(rows), rows === n ? "PASS" : "FAIL");
  for (let i = 0; i < Math.min(n, rows); i++) {
    const S = D.sentences[i];
    eqCk(rec, "step3", `s${i + 1}`, "English", S.en, await jsText(tab, inRow3(i, "[data-en]")));
    eqCk(rec, "step3", `s${i + 1}`, "Korean", S.ko, await jsText(tab, inRow3(i, "[data-ko]")));
    await playProbe(rec, tab, { feature: "step3", item: `s${i + 1}`, trigger: `row ${i + 1} number`, text: D.spoken(i), expr: inRow3(i, '[data-action="play-row"]') });
    await stopProbe(rec, tab, { feature: "step3", item: `s${i + 1}`, expr: inRow3(i, '[data-action="play-row"]'), idle: idleRow(i) });
  }
  // a dotted key word opens its meaning, silently (D32 다 · RD-L08)
  const kwRow = await jsEval(tab, `[...document.querySelectorAll(${J(`${SEL.step3} [data-rows] [data-sentence-id]`)})].findIndex((r) => r.querySelector('[data-keyword]'))`, -1);
  if (kwRow >= 0) {
    const order = await jsEval(tab, `Number(${inRow3(kwRow, "[data-keyword]")}.getAttribute('data-keyword'))`, 0);
    await silentProbe(rec, tab, { feature: "step3", item: `k${order}`, action: "a key word press", expr: inRow3(kwRow, "[data-keyword]") });
    hasCk(rec, "step3", `k${order}`, "the key word's meaning shows under the row", D.vocab[order - 1] ? D.vocab[order - 1].korean : "?", (await jsText(tab, inRow3(kwRow, "[data-gloss]"))) || "");
    await press(tab, inRow3(kwRow, '[data-action="play-row"]'), { settle: 300 });
    boolCk(rec, "step3", `k${order}`, "a played row lists its key words as buttons", true, await exists(tab, inRow3(kwRow, "[data-keyword-chip]")));
    await press(tab, inRow3(kwRow, '[data-action="play-row"]'), { settle: 300 });
  } else {
    ck(rec, "step3", "", "a key word in the passage", "dotted key word", "none found", "FAIL");
  }
  // views: 영어만 → '해석 보기' per row · 한글만 · both
  await press(tab, `document.querySelector(${J(`${SEL.step3} [data-view="en"]`)})`, { settle: 250 });
  eqCk(rec, "step3", "view en", "Korean hidden", "0", String(await count(tab, `${SEL.step3} [data-rows] [data-ko]`)));
  eqCk(rec, "step3", "view en", "'해석 보기' in every row", String(n), String(await count(tab, `${SEL.step3} [data-action="show-ko"]`)));
  await press(tab, inRow3(0, '[data-action="show-ko"]'), { settle: 250 });
  eqCk(rec, "step3", "view en", "'해석 보기' shows that row's Korean", D.sentences[0].ko, await jsText(tab, inRow3(0, "[data-ko]")));
  await press(tab, `document.querySelector(${J(`${SEL.step3} [data-view="ko"]`)})`, { settle: 250 });
  eqCk(rec, "step3", "view ko", "English hidden", "0", String(await count(tab, `${SEL.step3} [data-rows] [data-en]`)));
  await press(tab, `document.querySelector(${J(`${SEL.step3} [data-view="both"]`)})`, { settle: 250 });
  eqCk(rec, "step3", "view both", "both again", `${n}/${n}`, `${await count(tab, `${SEL.step3} [data-rows] [data-en]`)}/${await count(tab, `${SEL.step3} [data-rows] [data-ko]`)}`);
  lacksCk(rec, "step3", "", "no bottom bar", "문장에 마우스를", await stepText(tab, "step3"));
  eqCk(rec, "step3", "", "no timed reading here any more (it is Step 4 '다시 읽고 재기')", "0", String(await count(tab, `${SEL.step3} [data-action="reread-start"], ${SEL.step3} [data-action="start-reading"], ${SEL.step3} [data-action="measure-again"], ${SEL.step3} [data-passage]`)));
  captured.step3 = await stepText(tab, "step3");
  captured.readAloud = (await jsText(tab, `document.querySelector(${J(`${SEL.step3} [data-read-aloud]`)})`)) || "";

  await playerTintChecks(rec, tab, D, "step3");

  // reading aloud (with the blanks until 2026-09-28) — a real microphone cannot be driven headless; the stub drives the scoring path
  const target = D.sentences[0].en;
  ck(rec, "step3", "mic", "real microphone recognition", "a person reads the sentence aloud", "no microphone and no recognition service in a headless browser", "BLOCKED", "BLOCKED (real microphone) — must be checked on a real device");
  const micBtn = `[...document.querySelectorAll(${J(`${SEL.step3} [data-read-aloud] button`)})].find((b) => /소리 내어 읽기|다시 녹음/.test(b.innerText || ''))`;
  if (await exists(tab, micBtn)) {
    await jsEval(tab, `(() => { window.__kigSayError = null; window.__kigSay = ${J(target)}; })()`, null);
    await press(tab, micBtn, { settle: 900 });
    const exp = speechRecognition.evaluatePronunciation(target, target);
    hasCk(rec, "step3", "mic", "UI wiring only — a perfect reading scores 100", `${exp.score}점`, await stepText(tab, "step3"), "stubbed SpeechRecognition");
    lacksCk(rec, "step3", "mic", "no '발음 채점' promise (말하기 인식)", "발음 채점", await stepText(tab, "step3"));
    await jsEval(tab, `(() => { window.__kigSayError = null; window.__kigSay = ''; })()`, null);
  } else {
    ck(rec, "step3", "mic", "reading-aloud button present", "소리 내어 읽기", "button not found", "FAIL");
  }

  // the memo — kept as it was stored, folded at the end of 원문 대조 (RD-U18)
  const note = `QA 0928 ${D.id} 메모`;
  await press(tab, `document.querySelector(${J(`${SEL.step3} details[data-notes] > summary`)})`, { settle: 250 });
  const typed = await H.type(tab, `document.querySelector(${J(`${SEL.step3} textarea[aria-label="메모"]`)})`, note);
  ck(rec, "notes", "", "the memo accepts typing (end of 원문 대조)", "typed", typed ? "typed" : "could not focus", typed ? "PASS" : "FAIL");
  await sleep(900);
  eqCk(rec, "notes", "", "saved as before", note, ((await lsJson(tab, notesKey(D))) || {}).notes, notesKey(D));
  return note;
}

// ---------------------------------------------------------------------------
// completion, bookmark
// ---------------------------------------------------------------------------

async function toggleProgress(rec, tab, kind, { touch = false } = {}) {
  const expr = kind === "bookmark" ? bookmarkBtn : completeBtn;
  const before = await jsEval(tab, `(() => { const b = ${expr}; return b ? b.getAttribute('aria-label') : null; })()`, null);
  const r = await press(tab, expr, { touch, settle: 400 });
  if (!r.ok) {
    ck(rec, kind, "", "toggle clickable", "clickable", r.reason || "missing", "FAIL");
    return null;
  }
  const after = await jsEval(tab, `(() => { const b = ${expr}; return b ? b.getAttribute('aria-label') : null; })()`, null);
  ck(rec, kind, "", "aria-label flips on toggle", `not ${before}`, after, before !== after ? "PASS" : "FAIL");
  return after;
}

// ---------------------------------------------------------------------------
// content comparison
// ---------------------------------------------------------------------------

function contentCompare(rec, D, captured) {
  const expect = [];
  const push = (step, label, text) => text && expect.push({ step, label, text: norm(text) });
  // 2026-09-28 (순서 바꿈): the English passage in Step 1 (처음 읽기), the Korean of each sentence in Step 3 (원문 대조 — it was
  // Step 4), the words and meanings in Step 2, and the reading-aloud sentence in its own box (Step 3 — read apart from the rows,
  // which hold the same sentence, so the rows cannot stand in for it)
  for (const s of D.sentences) {
    push("step1", `sentence ${s.index + 1} (en)`, s.en);
    push("step3", `sentence ${s.index + 1} (ko)`, s.ko);
  }
  for (const [i, v] of D.vocab.entries()) {
    push("step2", `word ${v.word}`, v.word);
    // not the second word's meaning — the desktop run marks it '알아요' (which folds it) and checks it on its own
    // (step2[k2] "meaning after '뜻 보기'"), so both runs count the same texts (2026-09-28: the desktop text is now read before the fold)
    if (i !== 1) push("step2", `meaning ${v.word}`, v.korean);
  }
  if (D.sentences[0]) push("readAloud", "reading-aloud sentence", D.sentences[0].en);
  // 깨기 text (회귀 점검 1002): one expected text made wrong — the passage's last sentence (Step 1) with its last word changed —
  // so the on-screen check must report it missing (content FAIL) on a page that shows the right text
  if (BREAK === "text") {
    const lastEn = expect.filter((e) => e.step === "step1").pop();
    if (lastEn) {
      lastEn.text = lastEn.text.replace(/([A-Za-z]+)([^A-Za-z]*)$/, "QAbreak$2");
      lastEn.label += " (깨기 text: last word changed)";
      rec.breakNote = `깨기 text: expected '${cut(lastEn.text, 80)}' — must be missing`;
    }
  }

  const missing = [];
  let found = 0;
  for (const e of expect) {
    const hay = norm(captured[e.step] || "");
    if (hay.includes(e.text)) found++;
    else missing.push(`${e.step}: ${e.label} — ${cut(e.text, 80)}`);
  }
  // text that belongs to a DIFFERENT lesson
  const ownMain = D.id.replace(/-\d+$/, "");
  const own = new Set(D.sentences.flatMap((s) => [norm(s.en), norm(s.ko)]));
  const all = norm(CAPTURE_KEYS.map((k) => captured[k] || "").join("\n"));
  const foreign = [];
  for (const f of foreignSentences()) {
    if (f.id === ownMain) continue;
    const t = norm(f.text);
    if (own.has(t)) continue;
    if (all.includes(t)) foreign.push(`${f.id}: ${cut(t, 80)}`);
    if (foreign.length >= 5) break;
  }
  rec.content = { expected: expect.length, found, missing: missing.slice(0, 40), foreign };
  if (missing.length) rec.problems.push(`content: ${missing.length} expected text(s) missing from the rendered steps`);
  if (foreign.length) rec.problems.push(`content: text of another lesson rendered (${foreign[0]})`);
  ck(rec, "content", "", "every text the learner must see is rendered in its step", `${expect.length} texts`, `${found} found, ${missing.length} missing`, missing.length === 0 ? "PASS" : "FAIL");
  ck(rec, "content", "", "no text of another lesson on the page", "none", foreign.join(" | ") || "none", foreign.length === 0 ? "PASS" : "FAIL");
}

function mergeLayout(rec, snap) {
  rec.layout.overflowX = rec.layout.overflowX || !!snap.overflowX;
  for (const o of snap.offscreenControls || []) if (!rec.layout.offscreen.includes(o)) rec.layout.offscreen.push(o);
  for (const c of snap.clippedText || []) if (!rec.layout.clipped.includes(c)) rec.layout.clipped.push(c);
  rec.layout.smallTargets = Math.max(rec.layout.smallTargets, snap.smallTargets || 0);
}

function mergeEvents(rec, ev) {
  if (!rec.events) rec.events = { console: [], exceptions: [], log: [], badResponses: [], failed: [], requests: 0 };
  for (const k of ["console", "exceptions", "log", "failed"]) {
    for (const v of ev[k] || []) if (!rec.events[k].includes(v)) rec.events[k].push(v);
  }
  for (const r of ev.badResponses || []) if (!rec.events.badResponses.some((x) => x.url === r.url && x.status === r.status)) rec.events.badResponses.push(r);
  rec.events.requests += ev.requests || 0;
}

function eventChecks(rec) {
  const e = rec.events || {};
  ck(rec, "console", "", "no console errors", "none", (e.console || []).join(" | ") || "none", (e.console || []).length === 0 ? "PASS" : "FAIL");
  ck(rec, "console", "", "no uncaught exceptions", "none", (e.exceptions || []).join(" | ") || "none", (e.exceptions || []).length === 0 ? "PASS" : "FAIL");
  const bad = (e.badResponses || []).filter((r) => !/\/_vercel\//.test(r.url));
  ck(rec, "network", "", "no 4xx/5xx responses", "none", bad.map((r) => `${r.status} ${r.url}`).join(" | ") || "none", bad.length === 0 ? "PASS" : "FAIL");
  ck(rec, "network", "", "no failed requests", "none", (e.failed || []).join(" | ") || "none", (e.failed || []).length === 0 ? "PASS" : "FAIL");
}

// ---------------------------------------------------------------------------
// one page x viewport
// ---------------------------------------------------------------------------

async function loadPage(rec, tab, id) {
  const url = `/${COURSE}/${id}`;
  const t0 = Date.now();
  const l = await H.load(tab, url, { marker: MARKER });
  l.ms = Date.now() - t0;
  mergeEvents(rec, H.events(tab));
  rec.load = rec.load || l;
  const href = l.href || "";
  const pathName = href ? new URL(href).pathname : null;
  if (pathName && pathName !== url) rec.redirect = { from: url, to: pathName };
  return l;
}

async function completionChecks(rec, tab, D, { touch = false, measured }) {
  // D02: the timed reading (Step 4 since 2026-09-28) opened the gate; --break gate presses without it (a fresh page state)
  if (BREAK === "gate") {
    await resetLessonState(tab, D);
    await loadPage(rec, tab, D.id);
    await H.waitFor(tab, R.VIEW_READY, 8000);
  } else if (!measured) {
    const r = await tab.eval(R.MEASURE_ONCE).catch((e) => ({ ok: false, why: String(e && e.message) }));
    ck(rec, "complete", "gate", "one timed reading (lib/reading-page.cjs MEASURE_ONCE)", "done", r && r.ok ? `done (${r.words} words, ${r.waitedMs} ms)` : `failed: ${(r && r.why) || "?"}`, r && r.ok ? "PASS" : "FAIL");
  }
  await sleep(300);
  const before = ((await lsJson(tab, "kig-learning:reading")) || { lessons: {}, items: {} });
  const cAria = await toggleProgress(rec, tab, "complete", { touch });
  eqCk(rec, "complete", "", "aria-label after completing", "학습 완료 취소", cAria, BREAK === "gate" ? "깨기 gate: pressed without the timed reading — must FAIL" : undefined);
  boolCk(rec, "complete", "", "localStorage completion flag", true, ((await progressMap(tab, "completed")) || {})[progKey(D.id)] === true);
  const after = ((await lsJson(tab, "kig-learning:reading")) || { lessons: {}, items: {} });
  const words = (await lsJson(tab, wordsKey(D))) || { marks: {}, missed: [] };
  const wantItems = readingLearning.reviewEntries(D.mainId, readingLearning.parseWordsRecord(J({ v: 1, ...words }), D.vocab.length)).map((e) => e.key);
  const gotItems = Object.keys(after.items || {}).filter((k) => k.startsWith(`${D.mainId}#k`)).sort();
  ck(rec, "engine", "done", "completing brings the '몰라요' words and missed blanks into review", J(wantItems), J(gotItems), J(wantItems.slice().sort()) === J(gotItems) && Boolean((after.lessons || {})[D.mainId]) ? "PASS" : "FAIL");
  void before;
}

async function runDesktop(rec, tab, D) {
  const captured = {};
  let l = await loadPage(rec, tab, D.id);
  if (rec.redirect) {
    ck(rec, "route", "", "route renders without redirecting", `/${COURSE}/${D.id}`, rec.redirect.to, "FAIL", "READING has no redirecting ids per content.ts");
    return captured;
  }
  if (!l.rendered) {
    ck(rec, "load", "", "lesson page renders", "READING lesson page", `navigated=${l.navigated} rendered=${l.rendered} href=${l.href}`, "FAIL");
    return captured;
  }
  if (await resetLessonState(tab, D)) l = await loadPage(rec, tab, D.id);
  const snap = await tab.eval(H.SNAPSHOT);
  mergeLayout(rec, snap);
  await shellChecks(rec, tab, D, snap);
  if (snap.paywall || snap.notFound) return captured;

  // Step 1 처음 읽기 — the passage, not timed; '다 읽었어요' stores nothing and offers the next step and the player
  await step1Checks(rec, tab, D, captured);
  await firstReadChecks(rec, tab, D);
  await playerTintChecks(rec, tab, D, "step1");
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));

  // '다음: Step 2 핵심 어휘' presses the tab, so the bottom bar follows (RD-U12 · G05)
  await press(tab, action(SEL.step1, "to-step2"), { settle: 500 });
  eqCk(rec, "stepnav", "to-step2", "'다음: Step 2 핵심 어휘' opens Step 2", "step2", await activeStep(tab));
  // Step 2 핵심 어휘 — the cards ('몰라요' k1, '알아요' k2), then the blanks below them, which ask the '몰라요' word first
  await step2Checks(rec, tab, D, captured);
  await blankChecks(rec, tab, D, captured, { unknown: [1] });
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { settle: 500 });
  eqCk(rec, "stepnav", "to-step2", "then '다음 Step →' opens Step 3 (no mismatch)", "step3", await activeStep(tab));

  // Step 3 원문 대조 — rows, views, key words, the player, reading aloud, the memo
  const note = await step3Checks(rec, tab, D, captured);
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { settle: 500 });
  eqCk(rec, "stepnav", "to-step4", "'다음 Step →' opens Step 4 (다시 읽고 재기)", "step4", await activeStep(tab));

  // Step 4 다시 읽고 재기 — the only timed reading; the completion opens after it
  if ((await activeStep(tab)) === "step4" || (await openStep(rec, tab, 4))) {
    await step4Checks(rec, tab, D, captured);
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
    // reload: the memo, the marks and the run survive; the memo opens because it holds something
    await jsEval(tab, `sessionStorage.setItem('kig:audit:keep', '1')`, null);
    await loadPage(rec, tab, D.id);
    await H.waitFor(tab, R.VIEW_READY, 8000);
    if (await openStep(rec, tab, 3)) {
      eqCk(rec, "notes", "", "the memo survives a reload", note, await jsEval(tab, `(document.querySelector(${J(`${SEL.step3} textarea[aria-label="메모"]`)}) || {}).value || null`, null));
      boolCk(rec, "notes", "", "a memo that holds something is open", true, await jsEval(tab, `!!(document.querySelector(${J(`${SEL.step3} details[data-notes]`)}) || {}).open`, false));
    }
    if (await openStep(rec, tab, 2)) eqCk(rec, "step2", "marks", "'알아요' stays folded after a reload", "known", await jsEval(tab, `(${vocaRow(2)} || {}).getAttribute ? ${vocaRow(2)}.getAttribute('data-mark') : null`, null));
    if (await openStep(rec, tab, 4)) boolCk(rec, "wpm", "persist", "the timed reading (Step 4) survives a reload", true, await exists(tab, `document.querySelector(${J(`${SEL.step4} [data-speed-result]`)})`));
    await openStep(rec, tab, 1);
    // a learner who read the passage before (here: a timed record) is offered the next step and the player at once
    boolCk(rec, "step1", "persist", "after a reload Step 1 offers the player at once (read before) — no second '다 읽었어요'", true, (await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-reading-player="step1"]`)})`)) && !(await exists(tab, `document.querySelector(${J(`${SEL.step1} [data-action="first-read-done"]`)})`)));
    lacksCk(rec, "step1", "persist", "Step 1 still shows no WPM after a timed reading", "WPM", (await stepText(tab, "step1")) || "");
  }

  // bookmark + completion (and back)
  const bAria = await toggleProgress(rec, tab, "bookmark");
  eqCk(rec, "bookmark", "", "aria-label after adding", "북마크 해제", bAria);
  boolCk(rec, "bookmark", "", "localStorage bookmark flag", true, ((await progressMap(tab, "bookmarks")) || {})[progKey(D.id)] === true);
  await completionChecks(rec, tab, D, { measured: BREAK !== "gate" });
  await loadPage(rec, tab, D.id);
  await H.waitFor(tab, R.VIEW_READY, 8000);
  eqCk(rec, "complete", "", "completion survives a reload", "학습 완료 취소", await jsEval(tab, `(() => { const b = ${completeBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "complete", "", "un-completing works", "학습 완료 체크", await toggleProgress(rec, tab, "complete"));
  eqCk(rec, "bookmark", "", "aria-label after removing", "북마크 추가", await toggleProgress(rec, tab, "bookmark"));
  await jsEval(tab, `sessionStorage.removeItem('kig:audit:keep')`, null);

  // prev/next actually navigate (client-side <Link>)
  const go = D.next ? { dir: "next", label: "다음 강의", want: D.next } : D.prev ? { dir: "prev", label: "이전 강의", want: D.prev } : null;
  if (go) {
    await press(tab, `document.querySelector('main a[aria-label^=${J(go.label)}]')`, { settle: 800 });
    const ok = await H.waitFor(tab, `location.pathname === ${J(`/${COURSE}/${go.want.id}`)}`, 20000);
    eqCk(rec, "nav", go.dir, `${go.label} navigates`, `/${COURSE}/${go.want.id}`, await jsEval(tab, `location.pathname`, null));
    if (ok) {
      await H.waitFor(tab, `!!document.querySelector('h1')`, 10000);
      await sleep(600);
      eqCk(rec, "nav", go.dir, "neighbour page shows its own title", go.want.title, (await jsText(tab, `document.querySelector('h1')`)) || "");
      eqCk(rec, "nav", go.dir, "neighbour page opens on Step 1", "step1", await activeStep(tab));
    }
  }
  await resetLessonState(tab, D);
  mergeEvents(rec, H.events(tab));
  return captured;
}

async function runTouch(rec, tab, D, viewport) {
  const captured = {};
  const l = await loadPage(rec, tab, D.id);
  if (!l.rendered || rec.redirect) {
    ck(rec, "load", "", "lesson page renders", "READING lesson page", `navigated=${l.navigated} rendered=${l.rendered} redirect=${rec.redirect ? rec.redirect.to : "-"}`, "FAIL");
    return captured;
  }
  if (await resetLessonState(tab, D)) await loadPage(rec, tab, D.id);
  await H.waitFor(tab, R.VIEW_READY, 8000);
  const snap = await tab.eval(H.SNAPSHOT);
  mergeLayout(rec, snap);
  rec.steps = (await jsEval(tab, `[...document.querySelectorAll('main [data-step-tab]')].map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim())`, [])) || [];
  eqCk(rec, "shell", "", "h1 title", D.title, (snap.h1 || [])[0]);
  boolCk(rec, "shell", "", "paywall absent (licensed profile)", false, !!snap.paywall);
  boolCk(rec, "layout", "", "no horizontal page scroll", false, !!snap.overflowX, `scrollWidth=${snap.scrollWidth} viewport=${(snap.viewport || []).join("x")}`);
  ck(rec, "layout", "", "no control pushed off screen", "none", (snap.offscreenControls || []).join(" | ") || "none", (snap.offscreenControls || []).length === 0 ? "PASS" : "FAIL");
  ck(rec, "layout", "", "no clipped text", "none", (snap.clippedText || []).join(" | ") || "none", (snap.clippedText || []).length === 0 ? "PASS" : "FAIL");
  const firstY = await jsEval(tab, `(() => { const s = document.querySelector('main [data-learn-first]'); return s ? Math.round(s.getBoundingClientRect().top + scrollY) : null; })()`, null);
  ck(rec, "layout", "", "the passage's first line is on the first screen (data-learn-first)", "≤ 450", String(firstY), firstY !== null && firstY <= 450 ? "PASS" : "FAIL", "계획 G05 확인");
  eqCk(rec, "complete", "gate", "'이 강의 학습 완료' disabled before a timed reading", "true", String(!!(((await jsEval(tab, completeState, null)) || {}).disabled)));

  // Step 1 처음 읽기 — a tap plays the sentence and shows its Korean: a line under the sentence on a phone (< 640px), the panel
  // under the passage from sm (the tablet); a second tap closes it. Not timed (2026-09-28): no clock, and '다 읽었어요' stores nothing
  const s0 = D.sentences[0];
  const phone = H.VIEWPORTS[viewport].width < 640;
  const koWhere = phone ? `document.querySelector(${J(`${SEL.step1} [data-ko-line]`)})` : `document.querySelector(${J(`${SEL.step1} [data-ko-panel]`)})`;
  eqCk(rec, "step1", "untimed", "no timing controls in Step 1 (tap)", "0", String(await count(tab, `${SEL.step1} [data-action="start-reading"], ${SEL.step1} [data-action="finish-reading"], ${SEL.step1} [data-passage] [role="status"]`)));
  await playProbe(rec, tab, { feature: "step1", item: "s1", trigger: "sentence 1 tap", text: D.spoken(0), expr: sent1(0), touch: true });
  hasCk(rec, "step1", "s1", phone ? "tap opens the Korean line under the sentence" : "tap shows the Korean in the panel under the passage", s0.ko, (await jsText(tab, koWhere)) || "");
  await stopProbe(rec, tab, { feature: "step1", item: "s1", expr: sent1(0), touch: true, rearm: 2, idle: idleSentence(0) });
  lacksCk(rec, "step1", "s1", "a second tap closes it", s0.ko, (await jsText(tab, koWhere)) || "");
  await firstReadChecks(rec, tab, D, { touch: true });
  captured.step1 = await stepText(tab, "step1");
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));

  // Step 2 핵심 어휘 — reveal and mark by touch, then the blanks below the cards: the set with '몰라요' k1 first; one right and
  // one wrong by touch
  if (await openStep(rec, tab, 2, { touch: true })) {
    await press(tab, inVoca(1, '[data-action="reveal"]'), { touch: true, settle: 250 });
    eqCk(rec, "step2", "k1", "meaning after '뜻 보기' (tap)", D.vocab[0].korean, await jsText(tab, inVoca(1, "[data-meaning]")));
    await press(tab, inVoca(1, '[data-action="unknown"]'), { touch: true, settle: 250 });
    eqCk(rec, "step2", "k1", "'몰라요' saved (tap)", "unknown", (((await lsJson(tab, wordsKey(D))) || {}).marks || {})["1"]);
    await press(tab, action(SEL.step2, "reveal-all"), { touch: true, settle: 300 });
    captured.step2 = await stepText(tab, "step2");
    await blankChecks(rec, tab, D, captured, { touch: true, unknown: [1], answer: 2 });
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // Step 3 원문 대조 — the number plays; 영어만 → '해석 보기'
  if (await openStep(rec, tab, 3, { touch: true })) {
    await playProbe(rec, tab, { feature: "step3", item: "s1", trigger: "row 1 number (tap)", text: D.spoken(0), expr: inRow3(0, '[data-action="play-row"]'), touch: true });
    await press(tab, `document.querySelector(${J(`${SEL.step3} [data-view="en"]`)})`, { touch: true, settle: 300 });
    await press(tab, inRow3(0, '[data-action="show-ko"]'), { touch: true, settle: 300 });
    eqCk(rec, "step3", "view en", "'해석 보기' shows that row's Korean (tap)", s0.ko, await jsText(tab, inRow3(0, "[data-ko]")));
    await press(tab, `document.querySelector(${J(`${SEL.step3} [data-view="both"]`)})`, { touch: true, settle: 300 });
    captured.step3 = await stepText(tab, "step3");
    captured.readAloud = (await jsText(tab, `document.querySelector(${J(`${SEL.step3} [data-read-aloud]`)})`)) || "";
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // Step 4 다시 읽고 재기 — no passage before '읽기 시작'; a too-fast run by tap is not saved and leaves the completion shut
  if (await openStep(rec, tab, 4, { touch: true })) {
    await step4Checks(rec, tab, D, captured, { touch: true });
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // completion by touch, after one timed reading in Step 4 (lib/reading-page.cjs)
  await jsEval(tab, `sessionStorage.setItem('kig:audit:keep', '1')`, null);
  await completionChecks(rec, tab, D, { touch: true, measured: false });
  await toggleProgress(rec, tab, "complete", { touch: true });
  boolCk(rec, "complete", "", "localStorage key removed when off", false, progKey(D.id) in ((await progressMap(tab, "completed")) || {}));
  await jsEval(tab, `sessionStorage.removeItem('kig:audit:keep')`, null);

  // bottom step navigation by touch
  await openStep(rec, tab, 1, { touch: true });
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { touch: true, settle: 450 });
  eqCk(rec, "stepnav", "walk", "다음 Step → opens step2 (tap)", "step2", await activeStep(tab));
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[0]`, { touch: true, settle: 450 });
  eqCk(rec, "stepnav", "walk", "← 이전 Step goes back to step1 (tap)", "step1", await activeStep(tab));

  await resetLessonState(tab, D);
  mergeEvents(rec, H.events(tab));
  return captured;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  BREAK = args.brk;
  const pages = selectPages(args);
  const shardIdx = args.shard ? Number(args.shard.split("/")[0]) : null;
  const clone = args.clone || (shardIdx ? `drv-rd-${shardIdx}` : "drv-rd");
  const port = args.port || (shardIdx ? 9470 + shardIdx : 9470);
  const outFile = path.join(OUT, "features", `${COURSE}${args.suffix}${BREAK ? `-break-${BREAK}` : ""}.jsonl`);

  if (args.dry) {
    console.log(`${pages.length} pages: ${pages.join(",")}`);
    console.log(`clone=${clone} port=${port} out=${outFile} viewports=${args.viewports.join(",")}${BREAK ? ` break=${BREAK}` : ""}`);
    return;
  }

  const sink = H.jsonl(outFile, (r) => `${r.id}|${r.viewport}`);
  fs.mkdirSync(RENDER_DIR, { recursive: true });

  const todo = [];
  for (const id of pages) for (const vp of args.viewports) if (!args.resume || !sink.done.has(`${id}|${vp}`)) todo.push([id, vp]);
  console.log(`[reading] ${pages.length} pages x ${args.viewports.length} viewports — ${todo.length} to run (clone ${clone}, port ${port}) → ${outFile}`);
  if (!todo.length) return;

  let failed = 0;
  const browser = await H.startBrowser(clone, port);
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: EXTRA_HOOK });
    await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
    await tab.send("Page.bringToFront").catch(() => {});
    await tab.send("Browser.grantPermissions", { origin: H.BASE, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }).catch(() => {});

    for (const [id, viewport] of todo) {
      const started = Date.now();
      const rec = newRecord(id, viewport, `${H.BASE}/${COURSE}/${id}`);
      rec.viewport = viewport;
      if (BREAK) rec.break = BREAK;
      let captured = {};
      try {
        const D = lessonData(id);
        await H.setViewport(tab, viewport);
        captured = viewport === "desktop" ? await runDesktop(rec, tab, D) : await runTouch(rec, tab, D, viewport);
        contentCompare(rec, D, captured);
      } catch (e) {
        rec.visitError = String((e && e.stack) || e).slice(0, 500);
        rec.problems.push(`driver error: ${String((e && e.message) || e).slice(0, 200)}`);
        try {
          await H.screenshot(tab, path.join(OUT, "features", `${COURSE}${args.suffix}.shots`, `${id}.${viewport}.png`));
        } catch {}
      }
      mergeEvents(rec, H.events(tab));
      eventChecks(rec);
      rec.seconds = Math.round((Date.now() - started) / 100) / 10;
      try {
        fs.writeFileSync(path.join(RENDER_DIR, `${id}.${viewport}.json`), JSON.stringify({ id, viewport, at: rec.at, steps: captured }, null, 1));
      } catch {}
      sink.write(rec);
      const tally = rec.checks.reduce((a, c) => ((a[c.status] = (a[c.status] || 0) + 1), a), {});
      if (tally.FAIL || rec.visitError) failed++;
      const badAudio = rec.audio.filter((a) => !a.playing || a.error || (a.tts || []).length).length;
      console.log(
        `[reading] ${id} ${viewport} ${rec.seconds}s checks ${rec.checks.length} (PASS ${tally.PASS || 0} FAIL ${tally.FAIL || 0} BLOCKED ${tally.BLOCKED || 0} NA ${tally.NA || 0}) audio ${rec.audio.length - badAudio}/${rec.audio.length} content ${rec.content.found}/${rec.content.expected}` +
          (rec.problems.length ? ` :: ${rec.problems.slice(0, 3).join(" ;; ").slice(0, 300)}` : ""),
      );
    }
    await tab.close();
  } finally {
    browser.proc.kill();
  }
  if (failed) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
