#!/usr/bin/env node
/**
 * Phase 6 (1/2) — every clip the site can speak, per in-scope lesson page.
 *
 * The clip key is the app's own: src/lib/unifiedSpeech.ts over the text the view speaks
 * (VOCA display forms go through src/lib/vocaSpeech.ts first), so this inventory is what
 * the browser will actually request, not a re-implementation.
 *
 * Also checks the free/paid split: every clip of a FREE preview lesson must be in
 * src/lib/generated/freeSpeechKeys.json (or it 403s for a visitor), and a clip that only
 * paid lessons speak must NOT be in that list (or it is readable by anyone).
 *
 * Output: out/audio-inventory.json  { totals, byCourse, clips: [{path, texts, lessons, courses, free}] }
 *
 * 회귀 점검 1002 단계 0 (2026-10-04): 과정 목록이 expectations.cjs 의 COURSES(7과정 — ADULT 없음)라 ADULT 55강의의 클립
 *   (영어 · 한국어 줄 · 덩어리 · 낱말 — scripts/lib/spoken-texts.cjs 가 정의)을 한 번도 세지 않았다. 이제 과정 목록은
 *   spoken-texts.cjs 의 SPOKEN_COURSES(앱이 소리 내는 과정의 한 정의) 중 주소가 있는 것 — validRoutes 에 그 목록 밖 과정이
 *   (CNN 말고) 있으면 멈춘다. 또 무료/유료 갈림이 어긋나면(무료 강의 클립이 무료 목록에 없음 · 유료만 쓰는 클립이 무료 목록에 있음)
 *   전에는 숫자만 적고 exit 0 이었다 → exit 1.
 *   node audio-inventory.cjs --break=adult-free         깨기: 유료 ADULT a2-1 을 무료 강의로 여김(메모리) → 그 클립이 무료 목록에 없음 · exit 1
 *   node audio-inventory.cjs --break=adult-paid-listed  깨기: 유료 ADULT 만 쓰는 클립 하나를 무료 소리 목록 사본(메모리)에 넣음 → exit 1
 *   (깨기는 out/audio-inventory-break-<이름>.json 에 씀 — 진짜 목록을 덮지 않음)
 *
 * LECTURE (2026-10-17 · docs/lecture/도구-기록.md): 소리 내는 글이 없는 과정(사장님 '음성 없음' — docs/lecture/README.md)이라
 *   SPOKEN_COURSES 에 넣지 않는다(넣으면 소리 생성기 · 무료 소리 키도 그 과정을 걷게 됨). 그 대신 여기서 NO_SPEECH 로 알고 지나가고,
 *   그 과정의 미디어(교재 쪽 그림 lecture.pages[].src · 필기 lecture.pen.src · 나중의 AI 음성 lecture.audio.src — 모두 /audio/lecture/<id>/…)를
 *   옛 과정 소리와 같은 '강의 미디어'(legacyAudio)로 적는다 → audio-check --anon 이 무료 강의 것은 열림 · 나머지는 403 으로 하나하나 본다.
 *   무료/유료 갈림도 같은 규칙으로: 무료 강의 미디어가 무료 미디어 목록(generated/freeMediaKeys.json — 문지기가 쓰는 것)에 없음 · 유료만 쓰는
 *   미디어가 그 목록에 있음 → exit 1.
 *   node audio-inventory.cjs --break=lecture-free         깨기: 유료 LECTURE lm003 을 무료 강의로 여김(메모리) → 그 그림 · pen 이 무료 목록에 없음 · exit 1
 *   node audio-inventory.cjs --break=lecture-paid-listed  깨기: 유료 lm050 의 pen 키를 무료 미디어 목록 사본(메모리)에 넣음 → exit 1
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const spokenLib = require(path.join(REPO, "scripts/lib/spoken-texts.cjs"));
const { SPOKEN_COURSES } = spokenLib;
/**
 * 회귀 점검 1002: 무료 체험 강의가 **이용권 없이** 소리 내는 글 — PASS-OFF pg01-1 처럼 유료 문항을 떼어 둔 강의는 이용권이 있을 때만 서버가
 * 붙인다(spoken-texts.cjs withHeldBack). E.expected 는 늘 붙인 쪽(이용권 화면)을 주므로, 같은 함수를 '떼어 둔 것 없음' 으로 한 번 더
 * 돌린다(expectations.cjs 가 부르는 spokenLib.heldBackOf 를 잠깐 null 로 — 같은 모듈 객체). 그 밖의 글은 이용권이 듣는 유료 클립이다.
 * (전에는 갈림을 숫자로만 적어 몰랐다: pg01-1 의 유료 8문장 클립을 '무료 강의 클립인데 무료 목록에 없음' 으로 셌다.)
 */
function anonymousClipTexts(course, id) {
  const orig = spokenLib.heldBackOf;
  spokenLib.heldBackOf = () => null;
  try { return new Set(E.expected(course, id).clipTexts); } finally { spokenLib.heldBackOf = orig; }
}
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
const BREAKS = ["adult-free", "adult-paid-listed", "lecture-free", "lecture-paid-listed"];
if (BREAK && !BREAKS.includes(BREAK)) { console.error(`모르는 --break=${BREAK} (${BREAKS.join(" · ")})`); process.exit(2); }
const ROUTED = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons;
const COURSES = SPOKEN_COURSES.filter((c) => (ROUTED[c] || []).length);
/** 소리 내는 글이 없는 과정 — 미디어만(머리말 LECTURE). 여기 적지 않은 새 과정은 여전히 멈춘다. */
const NO_SPEECH = ["lecture"];
{
  const outside = Object.keys(ROUTED).filter((c) => c !== "cnn" && !SPOKEN_COURSES.includes(c) && !NO_SPEECH.includes(c));
  if (outside.length) { console.error(`!!! 주소가 있는데 spoken-texts.cjs SPOKEN_COURSES 에 없는 과정: ${outside.join(", ")} — 그 과정이 소리 내는 글을 정의한 뒤 다시 · exit 2`); process.exit(2); }
}

const OUT = path.join(__dirname, "../out");
// 7단계 7-1 i: 이 목록을 만든 재료의 지문 — audio-check.cjs 가 검사 전에 다시 계산해 다르면 멈춘다(읽기 전에 계산)
const INPUTS = require("./lib/inventory-inputs.cjs").inputsFingerprint();
const freeKeys = new Set(JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/freeSpeechKeys.json"), "utf8")).keys);
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE_IDS = {};
{
  // a key may be quoted — "passoff-grammar" (2026-09-27): the unquoted-only pattern skipped it and made its free lessons paid
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(/^\s*"?([a-z0-9-]+)"?:\s*\[/);
    if (m) { cur = m[1]; FREE_IDS[cur] = new Set(); }
    if (cur) for (const x of (m ? line.slice(line.indexOf("[")) : line).matchAll(/"([a-z0-9-]+)"/g)) FREE_IDS[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
if (BREAK === "adult-free") { (FREE_IDS.adult ||= new Set()).add("a2-1"); console.log("[일부러 깸] 유료 ADULT a2-1 을 무료 강의로 여김(메모리)"); }
if (BREAK === "lecture-free") { (FREE_IDS.lecture ||= new Set()).add("lm003"); console.log("[일부러 깸] 유료 LECTURE lm003 을 무료 강의로 여김(메모리)"); }
// LECTURE(머리말): 문지기가 쓰는 무료 미디어 목록
const freeMediaKeys = new Set(JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/freeMediaKeys.json"), "utf8")).keys);
if (BREAK === "lecture-paid-listed") { freeMediaKeys.add("audio/lecture/lm050/pen.json"); console.log("[일부러 깸] 유료 lm050 의 pen 키를 무료 미디어 목록 사본에 넣음(메모리)"); }
const isFreeLesson = (course, id) => {
  const set = FREE_IDS[course];
  if (!set) return false;
  let x = id;
  for (;;) {
    if (set.has(x)) return true;
    const s = x.replace(/-\d+$/, "");
    if (s === x) return false;
    x = s;
  }
};

const clips = new Map(); // path → { texts:Set, lessons:Set, freeLesson:boolean }
const byCourse = {};
const legacy = new Map(); // /audio/<course>/<file> → lessons

for (const course of COURSES) {
  const stat = { pages: 0, clipRefs: 0, uniqueClips: new Set(), legacy: 0, freePages: 0 };
  for (const p of E.pages(course)) {
    const exp = E.expected(course, p.id);
    stat.pages++;
    const freePage = isFreeLesson(course, p.id);
    if (freePage) stat.freePages++;
    const anon = freePage ? anonymousClipTexts(course, p.id) : null;
    for (const text of exp.clipTexts) {
      const free = freePage && anon.has(text);
      const cp = E.unified.unifiedSpeechPath(text);
      stat.clipRefs++;
      stat.uniqueClips.add(cp);
      const rec = clips.get(cp) || { texts: new Set(), lessons: new Set(), courses: new Set(), freeLesson: false };
      rec.texts.add(text);
      rec.lessons.add(`${course}/${p.id}`);
      rec.courses.add(course);
      rec.freeLesson = rec.freeLesson || free;
      clips.set(cp, rec);
    }
    for (const src of exp.legacyAudio) {
      const rec = legacy.get(src) || { lessons: new Set(), freeLesson: false };
      rec.lessons.add(`${course}/${p.id}`);
      rec.freeLesson = rec.freeLesson || freePage;
      legacy.set(src, rec);
      stat.legacy++;
    }
  }
  byCourse[course] = { pages: stat.pages, freePages: stat.freePages, clipReferences: stat.clipRefs, uniqueClips: stat.uniqueClips.size, legacyAudioRefs: stat.legacy };
}

// LECTURE(머리말): 클립 없음 — 강의 미디어(그림 · 필기 · 나중 음성)를 legacyAudio 로, 무료/유료 갈림은 freeMediaKeys.json 과 견줌
const lectureMediaSplit = { freeNotListed: [], paidListed: [] };
for (const course of NO_SPEECH.filter((c) => (ROUTED[c] || []).length)) {
  const stat = { pages: 0, freePages: 0, clipReferences: 0, uniqueClips: 0, legacyAudioRefs: 0, mediaFree: 0, mediaPaid: 0 };
  for (const id of ROUTED[course]) {
    const d = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", course, `${id}.json`), "utf8"));
    const L = d.lecture || {};
    const freePage = isFreeLesson(course, id);
    stat.pages++;
    if (freePage) stat.freePages++;
    for (const src of [...(L.pages || []).map((p) => p && p.src), L.pen && L.pen.src, L.audio && L.audio.src].filter((s) => typeof s === "string" && s)) {
      const rec = legacy.get(src) || { lessons: new Set(), freeLesson: false };
      rec.lessons.add(`${course}/${id}`);
      rec.freeLesson = rec.freeLesson || freePage;
      legacy.set(src, rec);
      stat.legacyAudioRefs++;
      if (freePage) stat.mediaFree++; else stat.mediaPaid++;
    }
  }
  byCourse[course] = stat;
}
for (const [src, r] of legacy) {
  if (!src.startsWith("/audio/lecture/")) continue;
  const listed = freeMediaKeys.has(src.replace(/^\//, ""));
  if (r.freeLesson && !listed) lectureMediaSplit.freeNotListed.push(`${src} (${[...r.lessons].join(", ")})`);
  if (!r.freeLesson && listed) lectureMediaSplit.paidListed.push(`${src} (${[...r.lessons].join(", ")})`);
}

if (BREAK === "adult-paid-listed") {
  const victim = [...clips.entries()].find(([, r]) => !r.freeLesson && r.courses.size === 1 && r.courses.has("adult"));
  if (!victim) { console.log("!!! --break=adult-paid-listed: 유료 ADULT 만 쓰는 클립이 없음 — 아무것도 증명 못 함 · exit 2"); process.exit(2); }
  freeKeys.add(victim[0].split("/").pop().replace(/\.mp3$/, ""));
  console.log(`[일부러 깸] 유료 ADULT 만 쓰는 클립을 무료 소리 목록 사본에 넣음: ${victim[0]} "${[...victim[1].texts][0].slice(0, 50)}"`);
}

const rows = [...clips.entries()].map(([p, r]) => ({
  path: p,
  key: p.split("/").pop().replace(/\.mp3$/, ""),
  texts: [...r.texts].slice(0, 4),
  textCount: r.texts.size,
  lessons: [...r.lessons].slice(0, 6),
  lessonCount: r.lessons.size,
  courses: [...r.courses],
  freeLesson: r.freeLesson,
  inFreeKeyList: freeKeys.has(p.split("/").pop().replace(/\.mp3$/, "")),
}));
// 과정마다 클립 수(무료 강의가 쓰는 것 / 그 과정이 쓰는 것) — 회귀 점검 1002: ADULT 가 세어지는지 숫자로
for (const c of COURSES) {
  const mine = rows.filter((r) => r.courses.includes(c));
  Object.assign(byCourse[c], { clipsUsed: mine.length, clipsUsedByFreeLesson: mine.filter((r) => r.freeLesson).length });
}
const freeLessonClipsNotListed = rows.filter((r) => r.freeLesson && !r.inFreeKeyList);
const paidOnlyClipsListedFree = rows.filter((r) => !r.freeLesson && r.inFreeKeyList);
const sameKeyDifferentTexts = rows.filter((r) => r.textCount > 1);

const report = {
  at: new Date().toISOString(),
  totals: { uniqueClips: rows.length, freeLessonClips: rows.filter((r) => r.freeLesson).length, freeKeyListSize: freeKeys.size, legacyAudioPaths: legacy.size },
  byCourse,
  problems: {
    freeLessonClipsNotInFreeKeyList: freeLessonClipsNotListed.slice(0, 20).map((r) => `${r.path} (${r.lessons.join(", ")}) "${r.texts[0]}"`),
    freeLessonClipsNotInFreeKeyListCount: freeLessonClipsNotListed.length,
    paidOnlyClipsInFreeKeyList: paidOnlyClipsListedFree.slice(0, 20).map((r) => `${r.path} (${r.lessons.join(", ")}) "${r.texts[0]}"`),
    paidOnlyClipsInFreeKeyListCount: paidOnlyClipsListedFree.length,
    oneKeyManyTexts: sameKeyDifferentTexts.slice(0, 10).map((r) => `${r.key}: ${r.texts.map((t) => `"${t.slice(0, 40)}"`).join(" | ")}`),
    oneKeyManyTextsCount: sameKeyDifferentTexts.length,
    // LECTURE(머리말)
    lectureFreeMediaNotInFreeMediaKeys: lectureMediaSplit.freeNotListed.slice(0, 20),
    lectureFreeMediaNotInFreeMediaKeysCount: lectureMediaSplit.freeNotListed.length,
    lecturePaidMediaInFreeMediaKeys: lectureMediaSplit.paidListed.slice(0, 20),
    lecturePaidMediaInFreeMediaKeysCount: lectureMediaSplit.paidListed.length,
  },
  clips: rows,
  legacyAudio: [...legacy.entries()].map(([src, r]) => ({ src, lessons: [...r.lessons].slice(0, 4), lessonCount: r.lessons.size, freeLesson: r.freeLesson })),
  inputs: INPUTS,
};
fs.mkdirSync(OUT, { recursive: true });
const OUT_FILE = path.join(OUT, BREAK ? `audio-inventory-break-${BREAK}.json` : "audio-inventory.json");
fs.writeFileSync(OUT_FILE, JSON.stringify({ ...report, ...(BREAK ? { break: BREAK } : {}) }, null, 1));
console.log(JSON.stringify({ totals: report.totals, byCourse: report.byCourse, problems: { ...report.problems, clipsSample: undefined } }, null, 1));
// 회귀 점검 1002: 무료/유료 갈림이 어긋나면 exit 1 (전에는 숫자만 적고 0)
const split = freeLessonClipsNotListed.length + paidOnlyClipsListedFree.length + lectureMediaSplit.freeNotListed.length + lectureMediaSplit.paidListed.length;
if (byCourse.lecture) console.log(`LECTURE(소리 없음 — 미디어만): 강의 ${byCourse.lecture.pages} · 미디어 ${byCourse.lecture.legacyAudioRefs}(무료 강의 ${byCourse.lecture.mediaFree} · 유료 ${byCourse.lecture.mediaPaid}) · 무료 강의 미디어 중 무료 미디어 목록에 없음 ${lectureMediaSplit.freeNotListed.length} · 유료 미디어 중 그 목록에 있음 ${lectureMediaSplit.paidListed.length}${[...lectureMediaSplit.freeNotListed, ...lectureMediaSplit.paidListed].slice(0, 4).map((x) => `\n  ${x}`).join("")}`);
console.log(`과정 ${COURSES.length}개(${COURSES.join(" · ")})${byCourse.lecture ? " + LECTURE 미디어" : ""} · 클립 ${rows.length} · 무료 강의 클립 중 무료 목록에 없음 ${freeLessonClipsNotListed.length} · 유료만 쓰는 클립 중 무료 목록에 있음 ${paidOnlyClipsListedFree.length}${BREAK ? ` [일부러 깸: ${BREAK}]` : ""} → ${path.relative(process.cwd(), OUT_FILE)} · exit ${split ? 1 : 0}`);
process.exitCode = split ? 1 : 0;
