#!/usr/bin/env node
/**
 * READING course driver — 2026-09-18 commercial-release audit.
 *
 * Exercises every control of every READING route on production with trusted input
 * (real mouse/touch events through CDP), compares what is on screen against the
 * lesson DATA (content/lessons/reading/<id>.json, read with the app's own
 * content.ts / readingUtils.ts / curriculumPresentation.ts), and records one JSONL
 * record per page x viewport.
 *
 * READ-ONLY toward the product: it never edits the repository, never deploys and
 * never calls a licence or admin API. The only data it changes is localStorage
 * inside its own profile CLONE (per-lesson WPM / notes / bookmark / completion
 * keys, which it cleans up again). READING writes no server progress at all
 * (ProgressProvider only calls /api/progress/student for course === "student"),
 * so there is nothing to log with H.logDataChange.
 *
 * Usage (Node 24, no dependencies beyond the repo's own):
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --ids pr001,pr100-1
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --course-range pr001..pr040
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --limit 20 --viewports desktop
 *   node docs/qa-2026-09-18/scripts/drive-reading.cjs --shard 1/4      (4 processes)
 *
 * Options
 *   --ids a,b,c            explicit route ids (pr001, pr001-1, ...)
 *   --course-range a..b    inclusive id range in course order (ids or numbers)
 *   --limit N              first N pages of the selection
 *   --viewports list       desktop,tablet,mobile (default all three)
 *   --suffix S             output file docs/qa-2026-09-18/out/features/reading<S>.jsonl
 *   --shard i/n            1-based shard i of n (clone "drv-rd-<i>", port 9470+i)
 *   --resume / --no-resume finished page x viewport records are skipped (default on)
 *   --dry                  print the page list and exit
 *
 * Output: out/features/reading<suffix>.jsonl  (one record per page x viewport)
 *         out/rendered/reading/<id>.<viewport>.json  (rendered text of every step)
 *         out/features/reading<suffix>.shots/<id>.<viewport>.png on a failed load
 */
"use strict";

const fs = require("fs");
const path = require("path");

const REPO_DIR = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
// content.ts resolves content/ from process.cwd() at module load time.
try {
  process.chdir(REPO_DIR);
} catch {
  /* already there */
}

const H = require("./lib/harness.cjs");
const { loadTs, REPO, sleep } = H;

const content = loadTs(path.join(REPO, "src/lib/content.ts"));
const presentation = loadTs(path.join(REPO, "src/lib/curriculumPresentation.ts"));
const readingUtils = loadTs(path.join(REPO, "src/lib/readingUtils.ts"));
const speechRecognition = loadTs(path.join(REPO, "src/lib/speechRecognition.ts"));
const validRoutes = require(path.join(REPO, "src/lib/generated/validRoutes.json"));

const COURSE = "reading";
const MARKER = H.MARKERS.reading;
const OUT = path.join(__dirname, "../out");
const RENDER_DIR = path.join(OUT, "rendered", COURSE);
const FREE_IDS = new Set(["pr001", "pr001-1", "pr002", "pr002-1"]);
const MAX_PLAUSIBLE_WPM = 1000;

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const a = { viewports: ["desktop", "tablet", "mobile"], resume: true, suffix: "", limit: 0 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === "--ids") a.ids = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--course-range") a.range = v();
    else if (k === "--limit") a.limit = Number(v());
    else if (k === "--viewports") a.viewports = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--suffix") a.suffix = v();
    else if (k === "--shard") a.shard = v();
    else if (k === "--resume") a.resume = true;
    else if (k === "--no-resume") a.resume = false;
    else if (k === "--dry") a.dry = true;
    else throw new Error(`unknown option ${k}`);
  }
  for (const vp of a.viewports) if (!H.VIEWPORTS[vp]) throw new Error(`unknown viewport ${vp}`);
  return a;
}

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
  const d = {
    id,
    lesson,
    isScript: lesson.variant === "script",
    sentences: pairs,
    vocab,
    wordCount,
    expectedSeconds: Math.max(15, Math.round((wordCount / 180) * 60)),
    cloze: readingUtils.generateClozeItems(pairs.map((p) => ({ en: p.en, ko: p.ko }))),
    title: presentation.formatLessonPresentation(COURSE, lesson).title,
    canonical: content.canonicalLessonId(COURSE, id),
    prev: ctx.prev ? { id: ctx.prev.id, title: presentation.formatLessonPresentation(COURSE, ctx.prev).title } : null,
    next: ctx.next ? { id: ctx.next.id, title: presentation.formatLessonPresentation(COURSE, ctx.next).title } : null,
    free: FREE_IDS.has(id),
    // smallest elapsed time whose WPM is still scored (finish earlier => "too fast")
    minScoredSeconds: Math.max(2, Math.ceil((wordCount * 60) / MAX_PLAUSIBLE_WPM) + 1),
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

const SEL = {
  step1: `section[aria-label="Speed Reading"]`,
  step2: `section[aria-label="Key Vocabulary"]`,
  step3: `section[aria-label="Reading Quizzes"]`,
  step4: `section[aria-label="Side-by-Side Dual Reading"]`,
  notes: `section[aria-label="Reading Notes"]`,
};
const STEP_KEYS = ["step1", "step2", "step3", "step4"];

const el = (sel) => `document.querySelector(${J(sel)})`;
const stepTab = (n) => `document.querySelectorAll('nav[aria-label="리딩 4단계 학습 단계"] button')[${n - 1}]`;
const sent1 = (i) => `document.querySelectorAll(${J(`${SEL.step1} [data-sentence-id]`)})[${i}]`;
const dualCol = (which) => `(document.querySelectorAll(${J(`${SEL.step4} > div`)})[1]||{children:[]}).children[${which === "en" ? 0 : 1}]`;
const dualSpan = (which, i) => `((${dualCol(which)})||{querySelectorAll:()=>[]}).querySelectorAll('[data-sentence-id]')[${i}]`;
const vocaCard = (i) => `document.querySelectorAll(${J(`${SEL.step2} .grid > div`)})[${i}]`;
const btnByText = (scope, text) =>
  `[...document.querySelectorAll(${J(`${scope} button`)})].find((b) => (b.innerText||'').replace(/\\s+/g,' ').includes(${J(text)}))`;
const btnByExactText = (scope, text) =>
  `[...document.querySelectorAll(${J(`${scope} button`)})].find((b) => (b.innerText||'').replace(/\\s+/g,' ').trim() === ${J(text)})`;

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
 * Click something that should speak `text`, and judge it:
 * the clip path must equal the app's own key for that text and must reach 'playing'
 * without a media error and without falling back to browser TTS.
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
  rec.audio.push({
    trigger,
    text: cut(text, 90),
    expected,
    requested: res.requested,
    playing: res.playing,
    error: res.error,
    tts: res.tts.map((t) => cut(t, 60)),
    dur: res.dur,
  });
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

/** Second click on the same control must stop playback (pause event on the shared element). */
async function stopProbe(rec, tab, { feature, item, expr, touch = false }) {
  await H.audioLog(tab, { clear: true });
  const clicked = await press(tab, expr, { touch });
  if (!clicked.ok) return false;
  for (let i = 0; i < 14; i++) {
    const log = await H.audioLog(tab);
    if (log.some((e) => e.ev === "pause" || e.ev === "ended")) {
      ck(rec, feature, item, "second click stops playback", "pause event", "pause event", "PASS");
      return true;
    }
    await sleep(100);
  }
  ck(rec, feature, item, "second click stops playback", "pause event", "no pause/ended event within 1.4 s", "FAIL");
  return false;
}

// ---------------------------------------------------------------------------
// localStorage of the clone (the only data this driver changes)
// ---------------------------------------------------------------------------

const wpmKey = (id) => `kig:reading:wpm:reading/${id}`;
const notesKey = (id) => `kig:reading:notes:reading/${id}`;
const progKey = (id) => `reading:${id}`;

async function lsGet(tab, key) {
  return jsEval(tab, `(() => { try { return localStorage.getItem(${J(key)}); } catch (e) { return null; } })()`, null);
}
async function progressMap(tab, kind) {
  return jsEval(tab, `(() => { try { return JSON.parse(localStorage.getItem('kig:progress:${kind}') || '{}'); } catch (e) { return null; } })()`, null);
}
/** Clear this lesson's own keys so every page starts from a known state. Returns true if it changed anything. */
async function resetLessonState(tab, id) {
  return jsEval(
    tab,
    `(() => { try {
      let changed = false;
      for (const k of [${J(wpmKey(id))}, ${J(notesKey(id))}]) if (localStorage.getItem(k) !== null) { localStorage.removeItem(k); changed = true; }
      for (const m of ['kig:progress:completed', 'kig:progress:bookmarks']) {
        const raw = localStorage.getItem(m); if (!raw) continue;
        const o = JSON.parse(raw); if (o && ${J(progKey(id))} in o) { delete o[${J(progKey(id))}]; localStorage.setItem(m, JSON.stringify(o)); changed = true; }
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
  // keep a handle on the (detached) shared audio element so the driver can let a
  // clip finish quickly instead of waiting out its whole duration
  const P = HTMLMediaElement.prototype, op = P.play;
  P.play = function () { window.__kigMedia = this; return op.apply(this, arguments); };
  // Fake SpeechRecognition: the real one cannot run headless (no microphone, no
  // recognition service). Marked "UI wiring only" in the results.
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

/** Jump the currently playing clip to its end so the real 'ended' handler runs now. */
async function fastForward(tab) {
  return jsEval(
    tab,
    `(() => { const a = window.__kigMedia; if (!a || !isFinite(a.duration) || a.duration <= 0) return false; try { a.currentTime = Math.max(0, a.duration - 0.12); return true; } catch (e) { return false; } })()`,
    false,
  );
}

// ---------------------------------------------------------------------------
// checks — page shell
// ---------------------------------------------------------------------------

async function shellChecks(rec, tab, D, snap) {
  rec.steps = (await jsEval(tab, `[...document.querySelectorAll('nav[aria-label="리딩 4단계 학습 단계"] button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`, [])) || [];

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

  // course link
  const courseHref = await jsEval(tab, `((document.querySelector('nav[aria-label="강의 이동"] a[href="/reading"]')) || {}).getAttribute ? document.querySelector('nav[aria-label="강의 이동"] a[href="/reading"]').getAttribute('href') : null`, null);
  eqCk(rec, "shell", "", "course link href", "/reading", courseHref);
  const courseText = await jsText(tab, `document.querySelector('nav[aria-label="강의 이동"] a[href="/reading"]')`);
  hasCk(rec, "shell", "", "course link label", "READING 목록", courseText);

  // prev / next
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

  // header stats
  const header = await jsText(tab, `document.querySelector('main')`);
  hasCk(rec, "header", "", "word count", `총 ${D.wordCount}단어`, header);
  hasCk(rec, "header", "", "sentence count", `${D.sentences.length}개 핵심 문장`, header);
  hasCk(rec, "header", "", "recommended time", `권장 속독 시간 약 ${D.expectedSeconds}초`, header);

  // step tabs
  const wantTabs = ["Step 1 · 속독 챌린지", "Step 2 · 핵심 어휘", "Step 3 · 독해 퀴즈", "Step 4 · 원문 대조"];
  ck(rec, "steps", "", "four step tabs", wantTabs.join(" | "), rec.steps.join(" | "), rec.steps.length === 4 && wantTabs.every((t, i) => norm(rec.steps[i]).includes(t)) ? "PASS" : "FAIL");

  // action buttons start in the off state (fresh lesson state)
  eqCk(rec, "bookmark", "", "initial aria-label", "북마크 추가", await jsEval(tab, `(() => { const b = document.querySelector('main button[aria-label="북마크 추가"], main button[aria-label="북마크 해제"]'); return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "complete", "", "initial aria-label", "학습 완료 체크", await jsEval(tab, `(() => { const b = document.querySelector('main button[aria-label="학습 완료 체크"], main button[aria-label="학습 완료 취소"]'); return b ? b.getAttribute('aria-label') : null; })()`, null));

  // bottom step navigation, before anything was clicked
  const navState = await bottomNavState(tab);
  boolCk(rec, "stepnav", "", "← 이전 Step disabled on Step 1", true, navState.prevDisabled);
  boolCk(rec, "stepnav", "", "다음 Step → enabled on Step 1", false, navState.nextDisabled);
  eqCk(rec, "stepnav", "", "목록으로 link href", "/reading", await jsEval(tab, `(() => { const a = document.querySelector('nav[aria-label="학습 단계 이동"] a'); return a ? a.getAttribute('href') : null; })()`, null));
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
  const key = STEP_KEYS[n - 1];
  if ((await activeStep(tab)) === key) return true;
  const r = await press(tab, stepTab(n), { touch, verify: () => exists(tab, el(SEL[key])) });
  for (let i = 0; i < 25; i++) {
    if (await exists(tab, el(SEL[key]))) return true;
    await sleep(80);
  }
  ck(rec, "steps", `step${n}`, "open step tab", `${key} section visible`, `not visible${r && r.ok === false ? ` (${r.reason})` : ""}`, "FAIL");
  return false;
}

// ---------------------------------------------------------------------------
// checks — top "whole passage" player
// ---------------------------------------------------------------------------

const playBtn = `document.querySelector('main button[aria-label="재생"], main button[aria-label="일시정지"]')`;
const stopBtn = `document.querySelector('main button[aria-label="정지"]')`;
const prevSentBtn = `document.querySelector('main button[aria-label="이전 문장"]')`;
const nextSentBtn = `document.querySelector('main button[aria-label="다음 문장"]')`;
const rangeInput = `document.querySelector('main input[aria-label="문장 이동"]')`;

async function playerState(tab) {
  return jsEval(
    tab,
    `(() => {
      const box = document.querySelector('main input[aria-label="문장 이동"]');
      const bar = box ? box.closest('.rounded-3xl') : null;
      const t = bar ? (bar.innerText || '').replace(/\\s+/g, ' ').trim() : '';
      const play = document.querySelector('main button[aria-label="재생"], main button[aria-label="일시정지"]');
      const stop = document.querySelector('main button[aria-label="정지"]');
      const counter = (t.match(/(\\d+)\\/(\\d+)/) || [null])[0];
      const speeds = bar ? [...bar.querySelectorAll('button')].filter((b) => /×/.test(b.innerText || '')).map((b) => ({ label: (b.innerText || '').trim(), pressed: b.getAttribute('aria-pressed') === 'true' })) : [];
      return { text: t, aria: play ? play.getAttribute('aria-label') : null, stopDisabled: stop ? !!stop.disabled : null, counter, speeds, valuetext: box ? box.getAttribute('aria-valuetext') : null, value: box ? box.value : null };
    })()`,
    {},
  );
}

async function playerChecks(rec, tab, D) {
  const n = D.sentences.length;
  const s0 = await playerState(tab);
  eqCk(rec, "player", "", "idle aria-label", "재생", s0.aria);
  boolCk(rec, "player", "", "정지 disabled while idle", true, s0.stopDisabled);
  eqCk(rec, "player", "", "idle counter", `1/${n}`, s0.counter);
  hasCk(rec, "player", "", "idle status line", "▶ 재생 버튼을 눌러 전체 듣기", s0.text);
  eqCk(rec, "player", "", "sentence slider aria-valuetext", `1번째 문장 / 전체 ${n}문장`, s0.valuetext);
  const pressed1 = (s0.speeds || []).find((x) => x.pressed);
  eqCk(rec, "player", "", "default speed", "1×", pressed1 ? pressed1.label : null);

  // play → first sentence clip
  await playProbe(rec, tab, { feature: "player", item: "play", trigger: "▶ 재생", text: D.sentences[0].en, expr: playBtn });
  const s1 = await playerState(tab);
  eqCk(rec, "player", "", "aria-label while speaking", "일시정지", s1.aria);
  boolCk(rec, "player", "", "정지 enabled while speaking", false, s1.stopDisabled);
  hasCk(rec, "player", "", "status while speaking", "🔊 음성 읽는 중…", s1.text);

  // pause / resume
  await H.click(tab, playBtn);
  await sleep(500);
  const sp = await playerState(tab);
  hasCk(rec, "player", "", "status while paused", "⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기", sp.text);
  eqCk(rec, "player", "", "aria-label while paused", "재생", sp.aria);
  await H.click(tab, playBtn);
  await sleep(600);
  const sr = await playerState(tab);
  hasCk(rec, "player", "", "status after resume", "🔊 음성 읽는 중…", sr.text);

  // walk the queue with 다음 / 이전: every sentence must be the next clip
  for (let i = 1; i < n; i++) {
    await playProbe(rec, tab, { feature: "player", item: `next→${i + 1}`, trigger: `다음 문장 → ${i + 1}/${n}`, text: D.sentences[i].en, expr: nextSentBtn });
    const st = await playerState(tab);
    eqCk(rec, "player", `next→${i + 1}`, "counter after 다음", `${i + 1}/${n}`, st.counter);
  }
  if (n > 1) {
    await playProbe(rec, tab, { feature: "player", item: "prev", trigger: `이전 문장 → ${n - 1}/${n}`, text: D.sentences[n - 2].en, expr: prevSentBtn });
    eqCk(rec, "player", "prev", "counter after 이전", `${n - 1}/${n}`, (await playerState(tab)).counter);
  }

  // speed buttons restart the current sentence at the new rate
  const cur = n > 1 ? n - 2 : 0;
  await H.audioLog(tab, { clear: true });
  await H.click(tab, btnByExactText("main", "1.2×"));
  const fast = await waitClip(tab, H.expectedClip(D.sentences[cur].en), 12000);
  const rate12 = await jsEval(tab, `(() => { const a = window.__kigMedia; return a ? a.playbackRate : null; })()`, null);
  ck(rec, "player", "speed", "1.2× restarts the current sentence", "clip playing at rate 1.2", `playing=${fast.playing} rate=${rate12}`, fast.playing && Math.abs((rate12 || 0) - 1.2) < 0.01 ? "PASS" : "FAIL");
  const s12 = await playerState(tab);
  eqCk(rec, "player", "speed", "aria-pressed follows the chosen speed", "1.2×", ((s12.speeds || []).find((x) => x.pressed) || {}).label);
  await H.click(tab, btnByExactText("main", "1×"));
  await sleep(400);

  // let a clip end: the queue must advance on its own, and stop at the last sentence
  await H.audioLog(tab, { clear: true });
  const before = (await playerState(tab)).counter;
  await fastForward(tab);
  await sleep(1200);
  const after = await playerState(tab);
  if (n > 1) {
    ck(rec, "player", "auto-advance", "queue advances when a clip ends", `counter past ${before}`, after.counter, after.counter !== before ? "PASS" : "FAIL");
  }
  // stop
  await H.click(tab, stopBtn);
  await sleep(500);
  const st = await playerState(tab);
  eqCk(rec, "player", "stop", "counter back to 1/n after 정지", `1/${n}`, st.counter);
  boolCk(rec, "player", "stop", "정지 disabled again", true, st.stopDisabled);
  eqCk(rec, "player", "stop", "aria-label back to 재생", "재생", st.aria);

  // idle 다음 starts at sentence 2 (or 1 when the lesson has a single sentence)
  const idleTarget = n > 1 ? 1 : 0;
  await playProbe(rec, tab, { feature: "player", item: "idle-next", trigger: "다음 문장 while idle", text: D.sentences[idleTarget].en, expr: nextSentBtn });
  await H.click(tab, stopBtn);
  await sleep(300);

  // sentence slider: arrow keys then keyup commit
  await H.audioLog(tab, { clear: true });
  await jsEval(tab, `(() => { const r = ${rangeInput}; if (r) { r.scrollIntoView({ block: 'center' }); r.focus(); } return document.activeElement === ${rangeInput}; })()`, false);
  const sliderTarget = Math.min(n - 1, 2);
  for (let i = 0; i < sliderTarget; i++) {
    await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await sleep(80);
  }
  const slid = await waitClip(tab, H.expectedClip(D.sentences[sliderTarget].en), 12000);
  rec.audio.push({ trigger: `문장 이동 slider → ${sliderTarget + 1}`, text: cut(D.sentences[sliderTarget].en, 90), expected: H.expectedClip(D.sentences[sliderTarget].en), requested: slid.requested, playing: slid.playing, error: slid.error, tts: slid.tts });
  ck(rec, "player", "slider", "arrow keys + keyup jump to that sentence", `clip of sentence ${sliderTarget + 1} playing`, slid.playing ? "playing" : `requested ${slid.requested.join(",") || "nothing"}`, slid.playing ? "PASS" : "FAIL");
  await H.click(tab, stopBtn);
  await sleep(300);

  // global Space shortcut (AudioPlayer.tsx:182-198)
  await H.audioLog(tab, { clear: true });
  await jsEval(tab, `document.body.focus()`, null);
  await tab.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32, text: " " });
  await tab.send("Input.dispatchKeyEvent", { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 });
  const spaceRes = await waitClip(tab, H.expectedClip(D.sentences[0].en), 8000);
  ck(rec, "player", "space", "Space starts playback", "clip of sentence 1 playing", spaceRes.playing ? "playing" : `requested ${spaceRes.requested.join(",") || "nothing"}`, spaceRes.playing ? "PASS" : "FAIL");
  await H.click(tab, stopBtn);
  await sleep(300);
}

// ---------------------------------------------------------------------------
// checks — Step 1 (WPM + passage)
// ---------------------------------------------------------------------------

const wpmStartBtn = btnByText(SEL.step1, "측정 시작");
const wpmFinishBtn = btnByText(SEL.step1, "완독 완료");
const wpmResetBtn = `document.querySelector(${J(`${SEL.step1} button[title="타이머 초기화"]`)})`;

async function wpmElapsed(tab) {
  const t = await stepText(tab, "step1");
  const m = /경과 시간\s*(\d{2}):(\d{2})/.exec(t || "");
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** too-fast branch, then start the run that keeps timing while other checks happen. */
async function wpmTooFastThenStart(rec, tab, D) {
  const before = await lsGet(tab, wpmKey(D.id));
  const started = await press(tab, wpmStartBtn, { settle: 150 });
  ck(rec, "wpm", "start", "속독 측정 시작 click", "timer starts", started.ok ? "clicked" : `click failed: ${started.reason}`, started.ok ? "PASS" : "FAIL");
  hasCk(rec, "wpm", "start", "finish button appears", "완독 완료! (속도 측정)", await stepText(tab, "step1"));
  await press(tab, wpmFinishBtn, { settle: 400 });
  const tooFastText = await stepText(tab, "step1");
  hasCk(rec, "wpm", "too-fast", "implausible run is not scored", "측정값을 저장하지 않았습니다", tooFastText);
  hasCk(rec, "wpm", "too-fast", "explanation names the seconds and the ceiling", `1초 만에 완독하면 ${MAX_PLAUSIBLE_WPM} WPM을 넘어`, tooFastText);
  const after = await lsGet(tab, wpmKey(D.id));
  eqCk(rec, "wpm", "too-fast", "stored best untouched", String(before), String(after));

  // R14: does restarting clear the previous card?
  await press(tab, wpmStartBtn, { settle: 300 });
  const during = await stepText(tab, "step1");
  ck(
    rec,
    "wpm",
    "restart",
    "restart clears the previous result card",
    "previous card gone while the new run times",
    norm(during).includes("측정값을 저장하지 않았습니다") ? "previous '측정값을 저장하지 않았습니다' card still shown" : "cleared",
    norm(during).includes("측정값을 저장하지 않았습니다") ? "FAIL" : "PASS",
    "map §12-15 / R14: WpmStopwatchBar.start() never calls onReset",
  );
  return Date.now();
}

async function wpmFinish(rec, tab, D, { label, expectBest }) {
  // wait until the elapsed seconds are enough for the result to be scored
  for (let i = 0; i < 400; i++) {
    const e = await wpmElapsed(tab);
    if (e != null && e >= D.minScoredSeconds) break;
    await sleep(500);
  }
  const elapsed = await wpmElapsed(tab);
  await press(tab, wpmFinishBtn, { settle: 500 });
  const text = await stepText(tab, "step1");
  const shown = /([0-9]+) WPM/.exec(text || "");
  const secs = /([0-9]+)초 만에 완독/.exec(text || "");
  const usedSeconds = secs ? Number(secs[1]) : elapsed;
  const expectedWpm = Math.round((D.wordCount / Math.max(1, usedSeconds)) * 60);
  ck(rec, "wpm", label, "WPM result card shown", `${expectedWpm} WPM`, shown ? `${shown[1]} WPM` : "no result card", shown && Number(shown[1]) === expectedWpm ? "PASS" : "FAIL", `wordCount=${D.wordCount} seconds=${usedSeconds}`);
  const badge = expectedWpm >= 200 ? "🚀 최상위 속독 수준" : expectedWpm >= 160 ? "⚡ 권장 속도 완벽 마스터" : expectedWpm >= 120 ? "📖 양호한 독해 속도" : "💡 직독직해 집중 훈련 권장";
  hasCk(rec, "wpm", label, "badge matches the measured speed", badge, text);
  hasCk(rec, "wpm", label, "summary line", `${D.wordCount}개 단어를 ${usedSeconds}초 만에 완독하셨습니다.`, text);
  hasCk(rec, "wpm", label, "quiz shortcut button", "독해 이해도 퀴즈 풀기 ➔", text);
  const stored = Number(await lsGet(tab, wpmKey(D.id)));
  if (expectBest == null) {
    ck(rec, "wpm", label, "best stored in localStorage", String(expectedWpm), String(stored), stored === expectedWpm ? "PASS" : "FAIL", wpmKey(D.id));
  } else {
    const best = Math.max(expectBest, expectedWpm);
    ck(rec, "wpm", label, "stored best keeps the higher value", String(best), String(stored), stored === best ? "PASS" : "FAIL", wpmKey(D.id));
    hasCk(rec, "wpm", label, "restored personal best is shown", `내 최고 기록: ${best} WPM`, text, "best comes from localStorage after a reload");
  }
  return { wpm: expectedWpm, seconds: usedSeconds };
}

async function step1Checks(rec, tab, D, captured) {
  const n = D.sentences.length;
  const count = await jsEval(tab, `document.querySelectorAll(${J(`${SEL.step1} [data-sentence-id]`)}).length`, 0);
  ck(rec, "step1", "", "sentence count matches the data", String(n), String(count), count === n ? "PASS" : "FAIL");

  for (let i = 0; i < Math.min(n, count); i++) {
    const S = D.sentences[i];
    const id = await jsEval(tab, `(${sent1(i)}).getAttribute('data-sentence-id')`, null);
    eqCk(rec, "step1", `s${i + 1}`, "data-sentence-id", S.id, id);
    const enText = await jsText(tab, `(${sent1(i)}).querySelector('span')`);
    eqCk(rec, "step1", `s${i + 1}`, "English sentence text", S.en, enText);
    const sup = await jsText(tab, `(${sent1(i)}).querySelector('sup')`);
    eqCk(rec, "step1", `s${i + 1}`, "sentence number", `[${i + 1}]`, sup);

    // hover shows the 1:1 Korean translation
    await hover(tab, sent1(i));
    await sleep(140);
    const barText = await stepText(tab, "step1");
    hasCk(rec, "step1", `s${i + 1}`, "hover shows the Korean translation", `👉 ${S.ko}`, barText);
    hasCk(rec, "step1", `s${i + 1}`, "translation bar carries the sentence number", `[${i + 1}]`, barText);

    // click plays this sentence's clip; a second click stops it
    await playProbe(rec, tab, { feature: "step1", item: `s${i + 1}`, trigger: `sentence ${i + 1} click`, text: S.en, expr: sent1(i) });
    const playingClass = await jsEval(tab, `((${sent1(i)}) || {}).className || ''`, "");
    ck(rec, "step1", `s${i + 1}`, "playing sentence is highlighted", "class contains bg-red-500/15", cut(playingClass, 120), /bg-red-500\/15/.test(playingClass) ? "PASS" : "FAIL");
    await stopProbe(rec, tab, { feature: "step1", item: `s${i + 1}`, expr: sent1(i) });
  }

  await hoverAway(tab);
  await sleep(200);
  hasCk(rec, "step1", "", "idle translation bar placeholder", "문장에 마우스를 올리면(Hover) 한국어 직독직해 번역이 여기에 표시됩니다.", await stepText(tab, "step1"));

  // copy
  const copyExpr = btnByText(SEL.step1, "지문 전체 복사");
  const copied = await press(tab, copyExpr, { settle: 400 });
  if (copied.ok) {
    hasCk(rec, "step1", "copy", "copy feedback", "✓ 복사 완료", await stepText(tab, "step1"));
    const clip = await jsEval(tab, `navigator.clipboard.readText().catch(() => null)`, null);
    const want = D.sentences.map((s) => s.en).join(" ");
    ck(rec, "step1", "copy", "clipboard holds the whole passage", cut(want, 120), clip == null ? "clipboard unreadable" : cut(clip, 120), clip != null && norm(clip) === norm(want) ? "PASS" : "FAIL", clip == null ? "clipboard read blocked in this profile" : undefined);
  } else {
    ck(rec, "step1", "copy", "copy button clickable", "clickable", copied.reason || "missing", "FAIL");
  }

  // sentence numbering toggle
  const numBtn = `document.querySelector('main button[title="문장 번호 표시 On/Off"]')`;
  eqCk(rec, "step1", "numbers", "toggle label (on)", "# 번호 ON", await jsText(tab, numBtn));
  await press(tab, numBtn, { settle: 220 });
  eqCk(rec, "step1", "numbers", "toggle label (off)", "# 번호 OFF", await jsText(tab, numBtn));
  const supsOff = await jsEval(tab, `document.querySelectorAll(${J(`${SEL.step1} [data-sentence-id] sup`)}).length`, -1);
  ck(rec, "step1", "numbers", "numbers hidden", "0", String(supsOff), supsOff === 0 ? "PASS" : "FAIL");
  await press(tab, numBtn, { settle: 220 });
  const supsOn = await jsEval(tab, `document.querySelectorAll(${J(`${SEL.step1} [data-sentence-id] sup`)}).length`, -1);
  ck(rec, "step1", "numbers", "numbers back", String(n), String(supsOn), supsOn === n ? "PASS" : "FAIL");

  // font size
  for (const [label, px] of [["크게", "18px"], ["특대", "20px"], ["보통", "16px"]]) {
    await press(tab, btnByExactText("main", label), { settle: 220 });
    const size = await jsEval(tab, `(() => { const c = document.querySelector(${J(`${SEL.step1} .font-serif`)}); return c ? getComputedStyle(c).fontSize : null; })()`, null);
    const pressed = await jsEval(tab, `(() => { const b = ${btnByExactText("main", label)}; return b ? b.getAttribute('aria-pressed') : null; })()`, null);
    eqCk(rec, "step1", `font ${label}`, "passage font-size", px, size);
    eqCk(rec, "step1", `font ${label}`, "aria-pressed", "true", pressed);
  }

  captured.step1 = await stepText(tab, "step1");
}

// ---------------------------------------------------------------------------
// checks — Step 2 (vocabulary)
// ---------------------------------------------------------------------------

async function step2Checks(rec, tab, D, captured) {
  const cards = await jsEval(tab, `document.querySelectorAll(${J(`${SEL.step2} .grid > div`)}).length`, 0);
  ck(rec, "step2", "", "card count matches the data", String(D.vocab.length), String(cards), cards === D.vocab.length ? "PASS" : "FAIL");
  hasCk(rec, "step2", "", "card counter", `총 ${D.vocab.length}개 핵심 어휘`, await stepText(tab, "step2"));

  for (let i = 0; i < Math.min(D.vocab.length, cards); i++) {
    const V = D.vocab[i];
    const info = await jsEval(
      tab,
      `(() => { const c = ${vocaCard(i)}; if (!c) return null; const sp = [...c.querySelectorAll('span')].map((s) => (s.innerText || '').trim()); return { pos: sp[0], word: sp[1], idx: sp.find((s) => /^#\\d\\d$/.test(s)), text: (c.innerText || '').replace(/\\s+/g, ' ').trim() }; })()`,
      null,
    );
    if (!info) {
      ck(rec, "step2", `#${i + 1}`, "card present", "card", "missing", "FAIL");
      continue;
    }
    eqCk(rec, "step2", `#${i + 1}`, "part of speech", V.partOfSpeech, info.pos);
    eqCk(rec, "step2", `#${i + 1}`, "word", V.word, info.word);
    eqCk(rec, "step2", `#${i + 1}`, "card index", `#${String(i + 1).padStart(2, "0")}`, info.idx);
    // reveal the meaning
    const revealExpr = `(() => { const c = ${vocaCard(i)}; return c ? [...c.querySelectorAll('button')].find((b) => (b.innerText || '').includes('뜻 확인하기')) : null; })()`;
    const rv = await press(tab, revealExpr, { settle: 180 });
    const after = await jsText(tab, vocaCard(i));
    if (rv.ok) hasCk(rec, "step2", `#${i + 1}`, "meaning after 뜻 확인하기", V.korean, after);
    else ck(rec, "step2", `#${i + 1}`, "meaning after 뜻 확인하기", V.korean, `reveal button not clickable (${rv.reason})`, "FAIL");
    // pronunciation clip
    const audioExpr = `(() => { const c = ${vocaCard(i)}; return c ? c.querySelector('button[title="발음 듣기"]') : null; })()`;
    await playProbe(rec, tab, { feature: "step2", item: `#${i + 1}`, trigger: `🔊 ${V.word}`, text: V.word, expr: audioExpr });
    const icon = await jsText(tab, audioExpr);
    eqCk(rec, "step2", `#${i + 1}`, "speaker icon while playing", "⏹️", icon);
    await stopProbe(rec, tab, { feature: "step2", item: `#${i + 1}`, expr: audioExpr });
    const iconBack = await jsText(tab, audioExpr);
    eqCk(rec, "step2", `#${i + 1}`, "speaker icon after stop", "🔊", iconBack);
  }

  // clicking the card body (not the button) plays the same word
  await playProbe(rec, tab, { feature: "step2", item: "card-body", trigger: "card body click", text: D.vocab[0].word, expr: `(() => { const c = ${vocaCard(0)}; return c ? c.querySelector('div') : null; })()` });
  await stopProbe(rec, tab, { feature: "step2", item: "card-body", expr: `(() => { const c = ${vocaCard(0)}; return c ? c.querySelector('div') : null; })()` });

  // reveal-all toggle
  const toggleAll = btnByText(SEL.step2, "전체 뜻");
  eqCk(rec, "step2", "toggle-all", "label once every card is revealed", "🙈 전체 뜻 가리기", await jsText(tab, toggleAll));
  await press(tab, toggleAll, { settle: 250 });
  const hidden = await jsEval(tab, `[...document.querySelectorAll(${J(`${SEL.step2} .grid > div button`)})].filter((b) => (b.innerText || '').includes('뜻 확인하기')).length`, -1);
  ck(rec, "step2", "toggle-all", "🙈 hides every meaning", String(D.vocab.length), String(hidden), hidden === D.vocab.length ? "PASS" : "FAIL");
  eqCk(rec, "step2", "toggle-all", "label after hiding", "💡 전체 뜻 보기", await jsText(tab, toggleAll));
  await press(tab, toggleAll, { settle: 250 });
  const text2 = await stepText(tab, "step2");
  const missingMeanings = D.vocab.filter((v) => !norm(text2).includes(norm(v.korean))).map((v) => v.word);
  ck(rec, "step2", "toggle-all", "💡 reveals every meaning", "0 missing", missingMeanings.join(",") || "0 missing", missingMeanings.length === 0 ? "PASS" : "FAIL");
  captured.step2 = text2;
}

// ---------------------------------------------------------------------------
// checks — Step 3 (cloze + mic)
// ---------------------------------------------------------------------------

async function clozeItemsInDom(tab) {
  return (
    (await jsEval(
      tab,
      `(() => [...document.querySelectorAll(${J(`${SEL.step3} p`)})].filter((p) => (p.innerText || '').includes('_______')).map((p, i) => { const box = p.parentElement; const opts = [...box.querySelectorAll('button')]; return { i, masked: (p.innerText || '').replace(/\\s+/g, ' ').trim(), options: opts.map((b) => (b.innerText || '').trim()), disabled: opts.map((b) => !!b.disabled), feedback: (box.innerText || '').replace(/\\s+/g, ' ').trim() }; }))()`,
      [],
    )) || []
  );
}
const clozeOption = (item, opt) =>
  `(() => { const ps = [...document.querySelectorAll(${J(`${SEL.step3} p`)})].filter((p) => (p.innerText || '').includes('_______')); const box = ps[${item}] ? ps[${item}].parentElement : null; return box ? box.querySelectorAll('button')[${opt}] : null; })()`;

async function step3Checks(rec, tab, D, captured, { mode, touch = false }) {
  const text = await stepText(tab, "step3");
  lacksCk(rec, "step3", "", "generated quiz stays off (SHOW_GENERATED_QUIZ=false)", "독해력 실전 인출 테스트", text);
  lacksCk(rec, "step3", "", "no generated question numbering", "Q1.", text);
  hasCk(rec, "step3", "", "cloze heading", "🔤 핵심 키워드 클로즈(Cloze) 빈칸 완성", text);
  hasCk(rec, "step3", "", "cloze item count badge", `${D.cloze.length}문항`, text);

  const items = await clozeItemsInDom(tab);
  ck(rec, "step3", "", "cloze item count matches generateClozeItems()", String(D.cloze.length), String(items.length), items.length === D.cloze.length ? "PASS" : "FAIL");

  for (let i = 0; i < Math.min(items.length, D.cloze.length); i++) {
    const want = D.cloze[i];
    const got = items[i];
    eqCk(rec, "step3", `cloze${i + 1}`, "masked sentence", want.maskedSentence, got.masked);
    const answerIdx = got.options.findIndex((o) => o === want.missingWord);
    ck(rec, "step3", `cloze${i + 1}`, "exactly one option is the answer", `one option === ${want.missingWord}`, got.options.join(" | "), got.options.filter((o) => o === want.missingWord).length === 1 ? "PASS" : "FAIL");
    ck(rec, "step3", `cloze${i + 1}`, "options are unique", "4 distinct options", got.options.join(" | "), new Set(got.options).size === got.options.length ? "PASS" : "FAIL");
    // the answer must not still be visible in the masked sentence (map R0)
    const leak = new RegExp(`\\b${want.missingWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(got.masked);
    ck(rec, "step3", `cloze${i + 1}`, "answer is not visible in the masked sentence", "hidden", leak ? `'${want.missingWord}' still in the sentence` : "hidden", leak ? "FAIL" : "PASS", leak ? "map R0 / §12-1: only the first occurrence is masked" : undefined);
    // a capitalised answer among lower-case distractors gives itself away (map R1)
    const others = got.options.filter((o) => o !== want.missingWord);
    const giveaway = /^[A-Z]/.test(want.missingWord) && others.length > 0 && others.every((o) => /^[a-z]/.test(o));
    ck(rec, "step3", `cloze${i + 1}`, "answer does not stand out by capitalisation", "same case as the distractors", giveaway ? `answer '${want.missingWord}' is the only capitalised option` : "ok", giveaway ? "FAIL" : "PASS", giveaway ? "map R1 / §12-2: distractors are lower-cased" : undefined);
    // an inflection of the answer as a distractor makes two options defensible (map R2)
    const stem = (w) => w.toLowerCase().replace(/(ing|ed|es|s|d)$/, "");
    const infl = others.filter((o) => o.toLowerCase() !== want.missingWord.toLowerCase() && stem(o) === stem(want.missingWord) && stem(o).length >= 4);
    ck(rec, "step3", `cloze${i + 1}`, "no distractor is an inflection of the answer", "none", infl.join(",") || "none", infl.length ? "FAIL" : "PASS", infl.length ? "map R2 / §12-3: two defensible answers" : undefined);

    if (mode === "correct") {
      if (answerIdx < 0) continue;
      await press(tab, clozeOption(i, answerIdx), { touch, settle: 250 });
      const after = (await clozeItemsInDom(tab))[i];
      hasCk(rec, "step3", `cloze${i + 1}`, "correct answer feedback", "✓ 정답입니다!", after ? after.feedback : "");
      ck(rec, "step3", `cloze${i + 1}`, "options lock after answering", "every option disabled", after ? after.disabled.join(",") : "", after && after.disabled.every(Boolean) ? "PASS" : "FAIL");
      const cls = await jsEval(tab, `(() => { const b = ${clozeOption(i, answerIdx)}; return b ? b.className : ''; })()`, "");
      ck(rec, "step3", `cloze${i + 1}`, "correct option is marked green", "border-emerald-500", cut(cls, 120), /border-emerald-500/.test(cls) ? "PASS" : "FAIL");
    } else if (mode === "wrong") {
      const wrongIdx = got.options.findIndex((o) => o !== want.missingWord);
      if (wrongIdx < 0) continue;
      await press(tab, clozeOption(i, wrongIdx), { touch, settle: 250 });
      const after = (await clozeItemsInDom(tab))[i];
      hasCk(rec, "step3", `cloze${i + 1}`, "wrong answer feedback names the answer", `❌ 정답은 '${want.missingWord}' 입니다.`, after ? after.feedback : "");
      const wrongCls = await jsEval(tab, `(() => { const b = ${clozeOption(i, wrongIdx)}; return b ? b.className : ''; })()`, "");
      ck(rec, "step3", `cloze${i + 1}`, "chosen wrong option is struck through", "line-through", cut(wrongCls, 120), /line-through/.test(wrongCls) ? "PASS" : "FAIL");
      if (answerIdx >= 0) {
        const rightCls = await jsEval(tab, `(() => { const b = ${clozeOption(i, answerIdx)}; return b ? b.className : ''; })()`, "");
        ck(rec, "step3", `cloze${i + 1}`, "the answer is revealed in green", "border-emerald-500", cut(rightCls, 120), /border-emerald-500/.test(rightCls) ? "PASS" : "FAIL");
      }
      ck(rec, "step3", `cloze${i + 1}`, "options lock after answering", "every option disabled", after ? after.disabled.join(",") : "", after && after.disabled.every(Boolean) ? "PASS" : "FAIL");
      // a second click must not change the verdict
      const other = got.options.findIndex((o, idx) => idx !== wrongIdx);
      if (other >= 0) {
        await press(tab, clozeOption(i, other), { touch, settle: 200 });
        const again = (await clozeItemsInDom(tab))[i];
        eqCk(rec, "step3", `cloze${i + 1}`, "answered item ignores further clicks", after ? after.feedback : "", again ? again.feedback : "");
      }
    }
  }

  // reading-aloud test — a real microphone cannot be driven headless
  const micBtn = btnByText(SEL.step3, "마이크 켜고 소리 내어 읽기");
  const micText = await stepText(tab, "step3");
  hasCk(rec, "step3", "mic", "target sentence is the first sentence of the passage", D.sentences[0].en, micText);
  ck(rec, "step3", "mic", "real microphone recognition", "a person reads the sentence aloud", "no microphone and no recognition service in a headless browser", "BLOCKED", "BLOCKED (real microphone) — must be checked on a real device");

  if (await exists(tab, micBtn)) {
    // UI wiring only: an injected SpeechRecognition stub drives the scoring path.
    const target = D.sentences[0].en;
    await jsEval(tab, `(() => { window.__kigSayError = null; window.__kigSay = ${J(target)}; })()`, null);
    await press(tab, micBtn, { touch, settle: 900 });
    const perfect = await stepText(tab, "step3");
    const exp = speechRecognition.evaluatePronunciation(target, target);
    hasCk(rec, "step3", "mic", "UI wiring only — perfect reading scores 100", `${exp.score}점`, perfect, "stubbed SpeechRecognition, not a real microphone");
    hasCk(rec, "step3", "mic", "UI wiring only — rating label", exp.ratingLabel || "", perfect, "stubbed SpeechRecognition");
    hasCk(rec, "step3", "mic", "UI wiring only — word match count", `단어 일치 ${exp.matchedCount}/${exp.totalWords}`, perfect, "stubbed SpeechRecognition");

    const wrongSpoken = "hello world this is not the sentence";
    const expWrong = speechRecognition.evaluatePronunciation(wrongSpoken, target);
    await jsEval(tab, `window.__kigSay = ${J(wrongSpoken)}`, null);
    const retry = btnByText(SEL.step3, "다시 녹음");
    await press(tab, (await exists(tab, retry)) ? retry : micBtn, { touch, settle: 900 });
    const wrongText = await stepText(tab, "step3");
    hasCk(rec, "step3", "mic", "UI wiring only — a wrong reading scores lower", `${expWrong.score}점`, wrongText, `expected from evaluatePronunciation("${cut(wrongSpoken, 40)}")`);

    await jsEval(tab, `(() => { window.__kigSay = ''; window.__kigSayError = 'no-speech'; })()`, null);
    const retry2 = btnByText(SEL.step3, "다시 녹음");
    await press(tab, (await exists(tab, retry2)) ? retry2 : micBtn, { touch, settle: 800 });
    hasCk(rec, "step3", "mic", "UI wiring only — no-speech error message", "음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.", await stepText(tab, "step3"), "stubbed error");

    await jsEval(tab, `(() => { window.__kigSayError = 'not-allowed'; })()`, null);
    const retry3 = btnByText(SEL.step3, "다시 녹음");
    await press(tab, (await exists(tab, retry3)) ? retry3 : micBtn, { touch, settle: 800 });
    hasCk(rec, "step3", "mic", "UI wiring only — permission denied message", "마이크 접근 권한이 거부되었거나 차단되었습니다.", await stepText(tab, "step3"), "stubbed error");
    await jsEval(tab, `(() => { window.__kigSayError = null; window.__kigSay = ''; })()`, null);
  } else {
    ck(rec, "step3", "mic", "microphone button present", "🎙️ 마이크 켜고 소리 내어 읽기", "button not found", "FAIL");
  }

  captured.step3 = `${captured.step3 ? `${captured.step3}\n` : ""}${await stepText(tab, "step3")}`;
}

// ---------------------------------------------------------------------------
// checks — Step 4 (dual reading)
// ---------------------------------------------------------------------------

async function hudText(tab) {
  return jsText(tab, `document.querySelectorAll(${J(`${SEL.step4} > div`)})[2]`);
}

async function step4Checks(rec, tab, D, captured) {
  const n = D.sentences.length;
  hasCk(rec, "step4", "", "sentence alignment badge", `${n}개 문장 1:1 정합`, await stepText(tab, "step4"));
  const enCount = await jsEval(tab, `((${dualCol("en")}) || { querySelectorAll: () => [] }).querySelectorAll('[data-sentence-id]').length`, 0);
  const koCount = await jsEval(tab, `((${dualCol("ko")}) || { querySelectorAll: () => [] }).querySelectorAll('[data-sentence-id]').length`, 0);
  ck(rec, "step4", "", "English column sentence count", String(n), String(enCount), enCount === n ? "PASS" : "FAIL");
  ck(rec, "step4", "", "Korean column sentence count", String(n), String(koCount), koCount === n ? "PASS" : "FAIL");

  for (let i = 0; i < Math.min(n, enCount, koCount); i++) {
    const S = D.sentences[i];
    eqCk(rec, "step4", `s${i + 1}`, "English column text", S.en, await jsText(tab, `(${dualSpan("en", i)}).querySelector('span')`));
    eqCk(rec, "step4", `s${i + 1}`, "Korean column text", S.ko, await jsText(tab, `(${dualSpan("ko", i)}).querySelector('span')`));
    eqCk(rec, "step4", `s${i + 1}`, "both columns carry the same sentence id", S.id, await jsEval(tab, `(${dualSpan("ko", i)}).getAttribute('data-sentence-id')`, null));

    // hover the English sentence: the HUD shows the pair
    await hover(tab, dualSpan("en", i));
    await sleep(140);
    const hud = await hudText(tab);
    hasCk(rec, "step4", `s${i + 1}`, "HUD shows the sentence number", `#${i + 1}`, hud);
    hasCk(rec, "step4", `s${i + 1}`, "HUD shows the English sentence", S.en, hud);
    hasCk(rec, "step4", `s${i + 1}`, "HUD shows the Korean translation", `👉 ${S.ko}`, hud);

    // click pins it and plays the clip; the pin survives the mouse leaving
    await playProbe(rec, tab, { feature: "step4", item: `s${i + 1}`, trigger: `EN sentence ${i + 1} click`, text: S.en, expr: dualSpan("en", i) });
    await hoverAway(tab);
    await sleep(160);
    hasCk(rec, "step4", `s${i + 1}`, "pinned sentence stays in the HUD without hover", `#${i + 1}`, await hudText(tab));
    const enCls = await jsEval(tab, `((${dualSpan("en", i)}) || {}).className || ''`, "");
    const koCls = await jsEval(tab, `((${dualSpan("ko", i)}) || {}).className || ''`, "");
    ck(rec, "step4", `s${i + 1}`, "both columns highlight the pinned sentence", "bg-amber-200/90 on EN and KO", `${/bg-amber-200\/90/.test(enCls) ? "EN ok" : "EN not highlighted"} / ${/bg-amber-200\/90/.test(koCls) ? "KO ok" : "KO not highlighted"}`, /bg-amber-200\/90/.test(enCls) && /bg-amber-200\/90/.test(koCls) ? "PASS" : "FAIL");

    // clicking the Korean sentence only moves the pin — it must not start audio
    await H.audioLog(tab, { clear: true });
    await H.click(tab, dualSpan("ko", i));
    await sleep(500);
    const koLog = await H.audioLog(tab);
    ck(rec, "step4", `s${i + 1}`, "Korean column click does not speak", "no play()", koLog.filter((e) => e.ev === "play()").length ? "a clip was requested" : "no play()", koLog.some((e) => e.ev === "play()") ? "FAIL" : "PASS");
    await hoverAway(tab);
    await sleep(150);
    hasCk(rec, "step4", `s${i + 1}`, "second click on the pinned sentence unpins it", "영어 또는 한국어 문장에 마우스를 올리거나 탭하면", await hudText(tab));
  }

  // view toggles
  await hover(tab, dualSpan("en", 0));
  await sleep(120);
  for (const [label, hiddenCol, visibleCol] of [["영어만", "ko", "en"], ["한글만", "en", "ko"], ["양방향", null, "en"]]) {
    await press(tab, btnByExactText(`${SEL.step4} div[role=group]`, label), { settle: 250 });
    const pressed = await jsEval(tab, `(() => { const b = ${btnByExactText(`${SEL.step4} div[role=group]`, label)}; return b ? b.getAttribute('aria-pressed') : null; })()`, null);
    eqCk(rec, "step4", `view ${label}`, "aria-pressed", "true", pressed);
    const vis = await jsEval(
      tab,
      `(() => { const c = [...(document.querySelectorAll(${J(`${SEL.step4} > div`)})[1] || { children: [] }).children]; return c.map((x) => getComputedStyle(x).display); })()`,
      [],
    );
    if (hiddenCol) {
      const idx = hiddenCol === "en" ? 0 : 1;
      ck(rec, "step4", `view ${label}`, `${hiddenCol.toUpperCase()} column hidden`, "display none", String(vis[idx]), vis[idx] === "none" ? "PASS" : "FAIL");
      ck(rec, "step4", `view ${label}`, `${visibleCol.toUpperCase()} column visible`, "displayed", String(vis[idx === 0 ? 1 : 0]), vis[idx === 0 ? 1 : 0] !== "none" ? "PASS" : "FAIL");
    } else {
      ck(rec, "step4", `view ${label}`, "both columns visible", "displayed, displayed", vis.join(","), vis.every((v) => v !== "none") ? "PASS" : "FAIL");
    }
  }

  // HUD controls
  await H.click(tab, dualSpan("en", 0));
  await sleep(400);
  await hoverAway(tab);
  const hudPlay = `(() => { const h = document.querySelectorAll(${J(`${SEL.step4} > div`)})[2]; return h ? [...h.querySelectorAll('button')].find((b) => (b.innerText || '').includes('🔊')) : null; })()`;
  await playProbe(rec, tab, { feature: "step4", item: "hud", trigger: "HUD 🔊", text: D.sentences[0].en, expr: hudPlay });
  const hudBtnText = await jsText(tab, hudPlay);
  ck(rec, "step4", "hud", "HUD play button shows its 발음 label", "🔊 발음", hudBtnText, norm(hudBtnText).includes("발음") ? "PASS" : "FAIL", "map R7 / §12-8: 'hidden xs:inline' with no xs breakpoint, so the accessible name is only 🔊");
  const closeBtn = `document.querySelector(${J(`${SEL.step4} button[aria-label="닫기"]`)})`;
  await press(tab, closeBtn, { settle: 300 });
  hasCk(rec, "step4", "hud", "닫기 clears the pin", "영어 또는 한국어 문장에 마우스를 올리거나 탭하면", await hudText(tab));

  captured.step4 = await stepText(tab, "step4");
}

// ---------------------------------------------------------------------------
// checks — notepad, bookmark, completion
// ---------------------------------------------------------------------------

const notesArea = `document.querySelector('textarea[aria-label="독해 핵심 메모 & 어휘 노트"]')`;
const bookmarkBtn = `document.querySelector('main button[aria-label="북마크 추가"], main button[aria-label="북마크 해제"]')`;
const completeBtn = `document.querySelector('main button[aria-label="학습 완료 체크"], main button[aria-label="학습 완료 취소"]')`;

async function notesWrite(rec, tab, D, note, { touch = false } = {}) {
  const ph = await jsEval(tab, `(() => { const t = ${notesArea}; return t ? t.getAttribute('placeholder') : null; })()`, null);
  eqCk(rec, "notes", "", "placeholder", "지문의 핵심 주제문, 새로 배운 단어, 문법 포인트 등을 자유롭게 메모하세요... (실시간 자동 저장)", ph);
  const typed = await H.type(tab, notesArea, note);
  ck(rec, "notes", "", "textarea accepts typing", "focusable textarea", typed ? "typed" : "could not focus", typed ? "PASS" : "FAIL");
  await sleep(900);
  eqCk(rec, "notes", "", "textarea value", note, await jsEval(tab, `(${notesArea} || {}).value || null`, null));
  hasCk(rec, "notes", "", "autosave label", "자동 저장됨", await jsText(tab, el(SEL.notes)));
  hasCk(rec, "notes", "", "character counter", `${note.length}자`, await jsText(tab, el(SEL.notes)));
  const raw = await lsGet(tab, notesKey(D.id));
  let stored = null;
  try {
    stored = JSON.parse(raw || "null");
  } catch {}
  eqCk(rec, "notes", "", "saved to localStorage", note, stored ? stored.notes : raw, notesKey(D.id));
  void touch;
}

async function toggleProgress(rec, tab, D, kind, { touch = false } = {}) {
  const isBookmark = kind === "bookmark";
  const expr = isBookmark ? bookmarkBtn : completeBtn;
  const before = await jsEval(tab, `(() => { const b = ${expr}; return b ? b.getAttribute('aria-label') : null; })()`, null);
  const r = await press(tab, expr, { touch, settle: 300 });
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
  push("step1", "header stats", `총 ${D.wordCount}단어`);
  for (const s of D.sentences) {
    push("step1", `sentence ${s.index + 1} (en)`, s.en);
    push("step4", `sentence ${s.index + 1} (en)`, s.en);
    push("step4", `sentence ${s.index + 1} (ko)`, s.ko);
  }
  for (const v of D.vocab) {
    push("step2", `word ${v.word}`, v.word);
    push("step2", `meaning ${v.word}`, v.korean);
    push("step2", `pos ${v.word}`, v.partOfSpeech);
  }
  for (const c of D.cloze) push("step3", `cloze ${c.id}`, c.maskedSentence);
  if (D.sentences[0]) push("step3", "mic target sentence", D.sentences[0].en);

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
  const all = norm(STEP_KEYS.map((k) => captured[k] || "").join("\n"));
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
  if (pathName && pathName !== url) {
    rec.redirect = { from: url, to: pathName };
  }
  return l;
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
  // a rerun must start from a known state
  if (await resetLessonState(tab, D.id)) {
    l = await loadPage(rec, tab, D.id);
  }
  let snap = await tab.eval(H.SNAPSHOT);
  mergeLayout(rec, snap);
  await shellChecks(rec, tab, D, snap);
  if (snap.paywall || snap.notFound) return captured;

  ck(rec, "answers", "", "typed answer variants (capitalisation / spacing / punctuation)", "n/a", "READING has no typed-answer field: the cloze drill answers by clicking one of 4 options; the only text inputs are the notepad and the (microphone) reading test", "NA");

  await wpmTooFastThenStart(rec, tab, D);
  await playerChecks(rec, tab, D);
  const run1 = await wpmFinish(rec, tab, D, { label: "run1", expectBest: null });
  // ↺ reset
  await press(tab, wpmResetBtn, { settle: 300 });
  const afterReset = await stepText(tab, "step1");
  lacksCk(rec, "wpm", "reset", "↺ clears the result card", "WPM", (afterReset || "").split("경과 시간")[1] || afterReset);
  hasCk(rec, "wpm", "reset", "↺ resets the timer", "경과 시간 00:00", afterReset);
  eqCk(rec, "wpm", "reset", "stored best survives ↺", String(run1.wpm), String(Number(await lsGet(tab, wpmKey(D.id)))));

  await step1Checks(rec, tab, D, captured);
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));

  if (await openStep(rec, tab, 2)) {
    await step2Checks(rec, tab, D, captured);
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // stuck-highlight probe (map R3): a sentence left "playing" after a word clip
  if (await openStep(rec, tab, 1)) {
    await H.click(tab, sent1(0));
    await sleep(700);
    await openStep(rec, tab, 2);
    await H.click(tab, `(() => { const c = ${vocaCard(0)}; return c ? c.querySelector('button[title="발음 듣기"]') : null; })()`);
    await sleep(1200);
    await openStep(rec, tab, 1);
    await sleep(300);
    const cls = await jsEval(tab, `((${sent1(0)}) || {}).className || ''`, "");
    const stuck = /bg-red-500\/15/.test(cls);
    let dead = false;
    if (stuck) {
      await H.audioLog(tab, { clear: true });
      await H.click(tab, sent1(0));
      await sleep(900);
      dead = !(await H.audioLog(tab)).some((e) => e.ev === "play()");
    }
    ck(
      rec,
      "step1",
      "stuck-highlight",
      "sentence highlight clears when another clip is played",
      "no sentence marked as playing",
      stuck ? `sentence 1 still marked playing${dead ? "; the next click plays nothing" : ""}` : "cleared",
      stuck ? "FAIL" : "PASS",
      stuck ? "map R3 / §12-4: stopSpeech() never calls the old run's onEnd" : undefined,
    );
    await H.click(tab, sent1(0));
    await sleep(300);
    await H.click(tab, stopBtn).catch(() => {});
  }

  if (await openStep(rec, tab, 3)) {
    await step3Checks(rec, tab, D, captured, { mode: "correct" });
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }
  if (await openStep(rec, tab, 4)) {
    await step4Checks(rec, tab, D, captured);
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
    // pin leaking into Step 1 (map R5) — documented behaviour, recorded either way
    await H.click(tab, dualSpan("en", 0));
    await sleep(300);
    await hoverAway(tab);
    await openStep(rec, tab, 1);
    await sleep(250);
    const bar = await stepText(tab, "step1");
    ck(rec, "step1", "pin", "a pin set in Step 4 shows in the Step 1 translation bar", `👉 ${cut(D.sentences[0].ko, 60)}`, norm(bar).includes(norm(`👉 ${D.sentences[0].ko}`)) ? "shown" : "not shown", "PASS", "map R5 / §4.7: documented cross-step pin; Step 1 has no control to unpin");
    await openStep(rec, tab, 4);
    await H.click(tab, `document.querySelector(${J(`${SEL.step4} button[aria-label="닫기"]`)})`);
    await sleep(200);
  }

  // notepad + bookmark + completion
  const note = `QA 0918 ${D.id} 메모`;
  await notesWrite(rec, tab, D, note);
  const bAria = await toggleProgress(rec, tab, D, "bookmark");
  eqCk(rec, "bookmark", "", "aria-label after adding", "북마크 해제", bAria);
  hasCk(rec, "bookmark", "", "button label after adding", "북마크됨", await jsText(tab, bookmarkBtn));
  const cAria = await toggleProgress(rec, tab, D, "complete");
  eqCk(rec, "complete", "", "aria-label after completing", "학습 완료 취소", cAria);
  hasCk(rec, "complete", "", "button label after completing", "학습 완료", await jsText(tab, completeBtn));
  boolCk(rec, "bookmark", "", "localStorage bookmark flag", true, ((await progressMap(tab, "bookmarks")) || {})[progKey(D.id)] === true);
  boolCk(rec, "complete", "", "localStorage completion flag", true, ((await progressMap(tab, "completed")) || {})[progKey(D.id)] === true);
  const recent = await jsEval(tab, `(() => { try { return JSON.parse(localStorage.getItem('kig:progress:recent') || 'null'); } catch (e) { return null; } })()`, null);
  eqCk(rec, "recent", "", "lesson recorded as the recent lesson", `${COURSE}/${D.id}`, recent ? `${recent.course}/${recent.lessonId}` : null);

  const nav4 = await bottomNavState(tab);
  boolCk(rec, "stepnav", "", "다음 Step → disabled on Step 4", true, nav4.nextDisabled);

  // ---- reload: persistence -------------------------------------------------
  await loadPage(rec, tab, D.id);
  await sleep(400);
  eqCk(rec, "bookmark", "", "bookmark survives a reload", "북마크 해제", await jsEval(tab, `(() => { const b = ${bookmarkBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "complete", "", "completion survives a reload", "학습 완료 취소", await jsEval(tab, `(() => { const b = ${completeBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "notes", "", "note survives a reload", note, await jsEval(tab, `(${notesArea} || {}).value || null`, null));
  hasCk(rec, "notes", "", "autosave label after a reload", "자동 저장됨", await jsText(tab, el(SEL.notes)));
  eqCk(rec, "wpm", "persist", "best WPM survives a reload", String(run1.wpm), String(Number(await lsGet(tab, wpmKey(D.id)))));

  // second WPM run: slower than the first, so the restored best must be shown
  await wpmTooFastThenStart(rec, tab, D);
  const bAria2 = await toggleProgress(rec, tab, D, "bookmark");
  eqCk(rec, "bookmark", "", "aria-label after removing", "북마크 추가", bAria2);
  const cAria2 = await toggleProgress(rec, tab, D, "complete");
  eqCk(rec, "complete", "", "aria-label after un-completing", "학습 완료 체크", cAria2);
  boolCk(rec, "bookmark", "", "localStorage key removed when off", false, progKey(D.id) in ((await progressMap(tab, "bookmarks")) || {}));
  boolCk(rec, "complete", "", "localStorage key removed when off", false, progKey(D.id) in ((await progressMap(tab, "completed")) || {}));
  await H.type(tab, notesArea, "");
  await sleep(900);
  let clearedRaw = await lsGet(tab, notesKey(D.id));
  let cleared = null;
  try {
    cleared = JSON.parse(clearedRaw || "null");
  } catch {}
  eqCk(rec, "notes", "", "clearing the note is saved", "", cleared ? cleared.notes : clearedRaw);
  // keep run2 slower than run1 so a lower WPM cannot overwrite the stored best
  const target = Math.max(D.minScoredSeconds + 1, (run1.seconds || 0) + 1);
  for (let i = 0; i < 400; i++) {
    const e = await wpmElapsed(tab);
    if (e != null && e >= target) break;
    await sleep(500);
  }
  await wpmFinish(rec, tab, D, { label: "run2", expectBest: run1.wpm });

  // quiz shortcut + bottom step navigation (map R4)
  await press(tab, btnByText(SEL.step1, "독해 이해도 퀴즈 풀기"), { settle: 500 });
  const afterShortcut = await activeStep(tab);
  eqCk(rec, "stepnav", "quiz-shortcut", "독해 이해도 퀴즈 풀기 ➔ opens Step 3", "step3", afterShortcut);
  const navAfterShortcut = await bottomNavState(tab);
  boolCk(rec, "stepnav", "quiz-shortcut", "← 이전 Step enabled once Step 3 is shown", false, navAfterShortcut.prevDisabled, "map R4 / §12-5: the shortcut does not update LessonStepNavigation's currentStep");
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { settle: 500 });
  const afterNext = await activeStep(tab);
  eqCk(rec, "stepnav", "quiz-shortcut", "다음 Step → after the shortcut opens Step 4", "step4", afterNext, "map R4 / §12-5");

  // clean walk through the steps with the bottom navigation
  await openStep(rec, tab, 1);
  const nav1 = await bottomNavState(tab);
  boolCk(rec, "stepnav", "walk", "← 이전 Step disabled on Step 1", true, nav1.prevDisabled);
  for (const want of ["step2", "step3", "step4"]) {
    await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { settle: 450 });
    eqCk(rec, "stepnav", "walk", `다음 Step → opens ${want}`, want, await activeStep(tab));
  }
  const navEnd = await bottomNavState(tab);
  boolCk(rec, "stepnav", "walk", "다음 Step → disabled on Step 4", true, navEnd.nextDisabled);
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[0]`, { settle: 450 });
  eqCk(rec, "stepnav", "walk", "← 이전 Step goes back to Step 3", "step3", await activeStep(tab));

  // wrong answers on every cloze item (options are re-shuffled on this load)
  await step3Checks(rec, tab, D, captured, { mode: "wrong" });
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));

  // ---- reload: removals stick ---------------------------------------------
  await loadPage(rec, tab, D.id);
  await sleep(400);
  eqCk(rec, "bookmark", "", "removed bookmark stays removed after a reload", "북마크 추가", await jsEval(tab, `(() => { const b = ${bookmarkBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "complete", "", "un-completed lesson stays un-completed after a reload", "학습 완료 체크", await jsEval(tab, `(() => { const b = ${completeBtn}; return b ? b.getAttribute('aria-label') : null; })()`, null));
  eqCk(rec, "notes", "", "cleared note stays cleared after a reload", "", await jsEval(tab, `(${notesArea} || {}).value == null ? null : ${notesArea}.value`, null));

  // prev/next actually navigate (client-side <Link>)
  const go = D.next ? { dir: "next", label: "다음 강의", want: D.next } : D.prev ? { dir: "prev", label: "이전 강의", want: D.prev } : null;
  if (go) {
    const linkExpr = `document.querySelector('main a[aria-label^=${J(go.label)}]')`;
    await press(tab, linkExpr, { settle: 800 });
    const ok = await H.waitFor(tab, `location.pathname === ${J(`/${COURSE}/${go.want.id}`)}`, 20000);
    eqCk(rec, "nav", go.dir, `${go.label} navigates`, `/${COURSE}/${go.want.id}`, await jsEval(tab, `location.pathname`, null));
    if (ok) {
      await H.waitFor(tab, `!!document.querySelector('h1')`, 10000);
      await sleep(600);
      eqCk(rec, "nav", go.dir, "neighbour page shows its own title", go.want.title, (await jsText(tab, `document.querySelector('h1')`)) || "");
      eqCk(rec, "nav", go.dir, "neighbour page opens on Step 1", "step1", await activeStep(tab));
    }
  } else {
    ck(rec, "nav", "", "prev/next boundary", "no neighbour to follow", "course boundary", "PASS");
  }

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
  await resetLessonState(tab, D.id);
  const snap = await tab.eval(H.SNAPSHOT);
  mergeLayout(rec, snap);
  rec.steps = (await jsEval(tab, `[...document.querySelectorAll('nav[aria-label="리딩 4단계 학습 단계"] button')].map((b) => (b.innerText || '').replace(/\\s+/g, ' ').trim())`, [])) || [];
  eqCk(rec, "shell", "", "h1 title", D.title, (snap.h1 || [])[0]);
  boolCk(rec, "shell", "", "paywall absent (licensed profile)", false, !!snap.paywall);
  boolCk(rec, "layout", "", "no horizontal page scroll", false, !!snap.overflowX, `scrollWidth=${snap.scrollWidth} viewport=${(snap.viewport || []).join("x")}`);
  ck(rec, "layout", "", "no control pushed off screen", "none", (snap.offscreenControls || []).join(" | ") || "none", (snap.offscreenControls || []).length === 0 ? "PASS" : "FAIL");
  ck(rec, "layout", "", "no clipped text", "none", (snap.clippedText || []).join(" | ") || "none", (snap.clippedText || []).length === 0 ? "PASS" : "FAIL");
  ck(rec, "layout", "", "tap targets are at least 24px", "0 small targets", String(snap.smallTargets), (snap.smallTargets || 0) === 0 ? "PASS" : "FAIL");
  for (const dir of ["prev", "next"]) {
    const label = dir === "prev" ? "이전 강의" : "다음 강의";
    const href = await jsEval(tab, `(() => { const a = document.querySelector('main a[aria-label^=${J(label)}]'); return a ? a.getAttribute('href') : null; })()`, null);
    if (D[dir]) eqCk(rec, "nav", dir, `${label} href`, `/${COURSE}/${D[dir].id}`, href);
    else ck(rec, "nav", dir, `boundary: no ${label} link`, "no link", href || "no link", href ? "FAIL" : "PASS");
  }

  // Step 1 — one control of each kind, by touch
  const s0 = D.sentences[0];
  await playProbe(rec, tab, { feature: "player", item: "play", trigger: "▶ 재생 (tap)", text: s0.en, expr: playBtn, touch: true });
  await press(tab, stopBtn, { touch: true, settle: 300 });
  await playProbe(rec, tab, { feature: "step1", item: "s1", trigger: "sentence 1 tap", text: s0.en, expr: sent1(0), touch: true });
  hasCk(rec, "step1", "s1", "tap shows the Korean translation", `👉 ${s0.ko}`, await stepText(tab, "step1"));
  await stopProbe(rec, tab, { feature: "step1", item: "s1", expr: sent1(0), touch: true });
  await press(tab, `document.querySelector('main button[title="문장 번호 표시 On/Off"]')`, { touch: true, settle: 250 });
  eqCk(rec, "step1", "numbers", "number toggle (tap)", "# 번호 OFF", await jsText(tab, `document.querySelector('main button[title="문장 번호 표시 On/Off"]')`));
  await press(tab, `document.querySelector('main button[title="문장 번호 표시 On/Off"]')`, { touch: true, settle: 250 });
  await press(tab, btnByExactText("main", "크게"), { touch: true, settle: 250 });
  eqCk(rec, "step1", "font 크게", "passage font-size (tap)", "18px", await jsEval(tab, `(() => { const c = document.querySelector(${J(`${SEL.step1} .font-serif`)}); return c ? getComputedStyle(c).fontSize : null; })()`, null));
  await press(tab, btnByExactText("main", "보통"), { touch: true, settle: 200 });
  await press(tab, btnByText(SEL.step1, "지문 전체 복사"), { touch: true, settle: 350 });
  hasCk(rec, "step1", "copy", "copy feedback (tap)", "✓ 복사 완료", await stepText(tab, "step1"));
  await press(tab, wpmStartBtn, { touch: true, settle: 200 });
  await press(tab, wpmFinishBtn, { touch: true, settle: 400 });
  hasCk(rec, "wpm", "too-fast", "implausible run is not scored (tap)", "측정값을 저장하지 않았습니다", await stepText(tab, "step1"));
  await press(tab, wpmResetBtn, { touch: true, settle: 250 });
  captured.step1 = await stepText(tab, "step1");
  mergeLayout(rec, await tab.eval(H.SNAPSHOT));

  // Step 2
  if (await openStep(rec, tab, 2, { touch: true })) {
    await press(tab, btnByText(SEL.step2, "전체 뜻"), { touch: true, settle: 300 });
    const t2 = await stepText(tab, "step2");
    hasCk(rec, "step2", "toggle-all", "💡 전체 뜻 보기 reveals meanings (tap)", D.vocab[0].korean, t2);
    await playProbe(rec, tab, { feature: "step2", item: "#1", trigger: `🔊 ${D.vocab[0].word} (tap)`, text: D.vocab[0].word, expr: `(() => { const c = ${vocaCard(0)}; return c ? c.querySelector('button[title="발음 듣기"]') : null; })()`, touch: true });
    await stopProbe(rec, tab, { feature: "step2", item: "#1", expr: `(() => { const c = ${vocaCard(0)}; return c ? c.querySelector('button[title="발음 듣기"]') : null; })()`, touch: true });
    captured.step2 = await stepText(tab, "step2");
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // Step 3 — one correct and one wrong cloze answer, plus the mic wiring
  if (await openStep(rec, tab, 3, { touch: true })) {
    const items = await clozeItemsInDom(tab);
    ck(rec, "step3", "", "cloze item count matches generateClozeItems()", String(D.cloze.length), String(items.length), items.length === D.cloze.length ? "PASS" : "FAIL");
    if (items[0]) {
      const want = D.cloze[0];
      const ai = items[0].options.findIndex((o) => o === want.missingWord);
      if (ai >= 0) {
        await press(tab, clozeOption(0, ai), { touch: true, settle: 300 });
        hasCk(rec, "step3", "cloze1", "correct answer feedback (tap)", "✓ 정답입니다!", ((await clozeItemsInDom(tab))[0] || {}).feedback);
      }
    }
    if (items[1]) {
      const want = D.cloze[1];
      const wi = items[1].options.findIndex((o) => o !== want.missingWord);
      if (wi >= 0) {
        await press(tab, clozeOption(1, wi), { touch: true, settle: 300 });
        hasCk(rec, "step3", "cloze2", "wrong answer feedback (tap)", `❌ 정답은 '${want.missingWord}' 입니다.`, ((await clozeItemsInDom(tab))[1] || {}).feedback);
      }
    }
    ck(rec, "step3", "mic", "real microphone recognition", "a person reads the sentence aloud", "no microphone in a headless browser", "BLOCKED", "BLOCKED (real microphone)");
    const micBtn = btnByText(SEL.step3, "마이크 켜고 소리 내어 읽기");
    if (await exists(tab, micBtn)) {
      await jsEval(tab, `(() => { window.__kigSayError = null; window.__kigSay = ${J(s0.en)}; })()`, null);
      await press(tab, micBtn, { touch: true, settle: 900 });
      const exp = speechRecognition.evaluatePronunciation(s0.en, s0.en);
      hasCk(rec, "step3", "mic", "UI wiring only — perfect reading scores 100 (tap)", `${exp.score}점`, await stepText(tab, "step3"), "stubbed SpeechRecognition");
    }
    captured.step3 = await stepText(tab, "step3");
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // Step 4
  if (await openStep(rec, tab, 4, { touch: true })) {
    await press(tab, btnByExactText(`${SEL.step4} div[role=group]`, "영어만"), { touch: true, settle: 300 });
    const vis = await jsEval(tab, `(() => { const c = [...(document.querySelectorAll(${J(`${SEL.step4} > div`)})[1] || { children: [] }).children]; return c.map((x) => getComputedStyle(x).display); })()`, []);
    ck(rec, "step4", "view 영어만", "Korean column hidden (tap)", "none", String(vis[1]), vis[1] === "none" ? "PASS" : "FAIL");
    await press(tab, btnByExactText(`${SEL.step4} div[role=group]`, "양방향"), { touch: true, settle: 300 });
    await playProbe(rec, tab, { feature: "step4", item: "s1", trigger: "EN sentence 1 tap", text: s0.en, expr: dualSpan("en", 0), touch: true });
    hasCk(rec, "step4", "s1", "HUD shows the pair after a tap", `👉 ${s0.ko}`, await hudText(tab));
    await press(tab, dualSpan("ko", 0), { touch: true, settle: 300 });
    await press(tab, `document.querySelector(${J(`${SEL.step4} button[aria-label="닫기"]`)})`, { touch: true, settle: 300 });
    captured.step4 = await stepText(tab, "step4");
    mergeLayout(rec, await tab.eval(H.SNAPSHOT));
  }

  // notepad + bookmark + completion by touch
  const note = `QA ${viewport} ${D.id}`;
  await notesWrite(rec, tab, D, note, { touch: true });
  await H.type(tab, notesArea, "");
  await sleep(700);
  const bAria = await toggleProgress(rec, tab, D, "bookmark", { touch: true });
  eqCk(rec, "bookmark", "", "aria-label after adding (tap)", "북마크 해제", bAria);
  const cAria = await toggleProgress(rec, tab, D, "complete", { touch: true });
  eqCk(rec, "complete", "", "aria-label after completing (tap)", "학습 완료 취소", cAria);
  await toggleProgress(rec, tab, D, "bookmark", { touch: true });
  await toggleProgress(rec, tab, D, "complete", { touch: true });
  boolCk(rec, "bookmark", "", "localStorage key removed when off", false, progKey(D.id) in ((await progressMap(tab, "bookmarks")) || {}));
  boolCk(rec, "complete", "", "localStorage key removed when off", false, progKey(D.id) in ((await progressMap(tab, "completed")) || {}));

  // bottom step navigation by touch
  await openStep(rec, tab, 1, { touch: true });
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[1]`, { touch: true, settle: 450 });
  eqCk(rec, "stepnav", "walk", "다음 Step → opens step2 (tap)", "step2", await activeStep(tab));
  await press(tab, `document.querySelectorAll('nav[aria-label="학습 단계 이동"] button')[0]`, { touch: true, settle: 450 });
  eqCk(rec, "stepnav", "walk", "← 이전 Step goes back to step1 (tap)", "step1", await activeStep(tab));

  await resetLessonState(tab, D.id);
  mergeEvents(rec, H.events(tab));
  return captured;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv);
  const pages = selectPages(args);
  const shardIdx = args.shard ? Number(args.shard.split("/")[0]) : null;
  const clone = shardIdx ? `drv-rd-${shardIdx}` : "drv-rd";
  const port = shardIdx ? 9470 + shardIdx : 9470;
  const outFile = path.join(OUT, "features", `${COURSE}${args.suffix}.jsonl`);

  if (args.dry) {
    console.log(`${pages.length} pages: ${pages.join(",")}`);
    console.log(`clone=${clone} port=${port} out=${outFile} viewports=${args.viewports.join(",")}`);
    return;
  }

  const sink = H.jsonl(outFile, (r) => `${r.id}|${r.viewport}`);
  fs.mkdirSync(RENDER_DIR, { recursive: true });

  const todo = [];
  for (const id of pages) for (const vp of args.viewports) if (!args.resume || !sink.done.has(`${id}|${vp}`)) todo.push([id, vp]);
  console.log(`[reading] ${pages.length} pages x ${args.viewports.length} viewports — ${todo.length} to run (clone ${clone}, port ${port}) → ${outFile}`);
  if (!todo.length) return;

  const browser = await H.startBrowser(clone, port);
  try {
    const tab = await H.openTab(browser);
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: EXTRA_HOOK });
    await tab.send("Emulation.setFocusEmulationEnabled", { enabled: true }).catch(() => {});
    await tab.send("Page.bringToFront").catch(() => {});
    await tab.send("Browser.grantPermissions", { origin: H.BASE, permissions: ["clipboardReadWrite", "clipboardSanitizedWrite"] }).catch(() => {});

    for (const [id, viewport] of todo) {
      const started = Date.now();
      const rec = newRecord(id, `${H.BASE}/${COURSE}/${id}`, viewport);
      rec.viewport = viewport;
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
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
