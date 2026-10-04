#!/usr/bin/env node
/**
 * BUG-019 검사 — 미디어 문지기(src/lib/mediaAccess.ts)가 "무료" 로 보는 파일을 앱과 같은 코드로 전수 확인.
 *
 *   node check-media-gate.cjs          새 규칙: src/lib/freeMedia.ts 의 정확 일치
 *   node check-media-gate.cjs --old    예전 규칙: isFreePreviewLesson(과정, 파일 이름) — 대조군, 3번에서 실패해야 정상
 *
 * 검사 (하나라도 어긋나면 exit 1):
 *   1. 무료 강의 30개(STUDENT·VOCA·GRAMMAR I·II·LISTENING·READING 28 + CNN 2)가 데이터에 적은 미디어 전부 → 무료
 *   2. 유료 강의만 쓰는 미디어 전부 → 무료 아님
 *   3. 무료 id 뒤에 "-숫자" 를 붙여 만든 이름(audio/ld/d001-999.mp3 …) → 무료 아님
 *   4. 데이터에 있는 실제 파일 가운데 두 규칙의 판정이 갈리는 것 → 0 (무료 강의가 잃는 파일도, 새로 풀리는 파일도 없음)
 * 무료 여부만 본다 — 이용권이 있을 때의 판정(verifyLicenseSessionToken)은 바꾸지 않았으므로 여기서 부르지 않는다.
 *
 * 회귀 점검 1002 단계 0 (2026-10-04): 데이터를 훑는 과정이 손으로 적은 폴더 목록(7과정)뿐이라 ADULT · PASS-OFF GRAMMAR 강의 파일은
 *   한 번도 보지 않았다(두 과정은 지금 강의 미디어가 0 — 소리는 모두 azure-ava 클립, audio-check 가 봄). 그래서:
 *   - 허용 폴더 목록은 mediaAccess.ts 의 FOLDER_TO_COURSE 를 **소스에서 읽는다**(손으로 옮긴 사본이 앱과 어긋나지 않게).
 *   - 훑는 과정 = 허용 폴더의 과정 ∪ validRoutes 의 과정 전부. 무료 강의 수는 30 고정이 아니라 FREE_PREVIEW_LESSON_IDS 중 파일이 있는 것.
 *   - 5. 강의 데이터의 미디어가 허용 폴더 밖이면 실패 — 문지기가 이용권이 있어도 'unclaimed' 로 막는다(무료면 1번에도 걸림).
 *   node check-media-gate.cjs --break=adult-media   깨기: 무료 ADULT a1-1 이 /audio/adult/a1-1.mp3 를 쓴다고 메모리에서만 넣음 →
 *                                                    1번(무료인데 잠김) · 5번(허용 폴더 밖) 실패 · exit 1 (ADULT 를 안 훑으면 못 잡음)
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OLD = process.argv.includes("--old");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice("--break=".length);
if (BREAK && BREAK !== "adult-media") { console.error(`모르는 --break=${BREAK} (adult-media)`); process.exit(2); }
const { FREE_PREVIEW_LESSON_IDS, isFreePreviewLesson } = loadTs(path.join(REPO, "src/lib/license.ts"));
const { isFreeMediaKey } = loadTs(path.join(REPO, "src/lib/freeMedia.ts"));
// mediaAccess.ts 의 허용 폴더 목록 — 그 파일은 서버 모듈을 불러 통째로 싣지 않으므로 그 객체 글자를 소스에서 읽는다(회귀 점검 1002)
const FOLDER_TO_COURSE = (() => {
  const src = fs.readFileSync(path.join(REPO, "src/lib/mediaAccess.ts"), "utf8");
  const m = src.match(/const FOLDER_TO_COURSE[^=]*=\s*\{([\s\S]*?)\};/);
  if (!m) throw new Error("mediaAccess.ts 에서 FOLDER_TO_COURSE 를 못 찾음 — 이 검사를 다시 보라");
  const out = {};
  for (const x of m[1].matchAll(/["']?([a-z0-9-]+)["']?\s*:\s*["']([a-z0-9-]+)["']/g)) out[x[1]] = x[2];
  if (Object.keys(out).length < 5) throw new Error(`mediaAccess.ts FOLDER_TO_COURSE 를 ${Object.keys(out).length}개만 읽음 — 이 검사를 다시 보라`);
  return out;
})();
const ROUTED = Object.keys(JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8")).lessons);
const SCAN_COURSES = [...new Set([...Object.values(FOLDER_TO_COURSE), ...ROUTED])];

function oldRule(key) {
  const parts = key.split("/").filter(Boolean);
  const course = FOLDER_TO_COURSE[parts[1]];
  const lessonId = (parts[parts.length - 1] || "").replace(/\.[a-z0-9]+$/i, "");
  return Boolean(course && lessonId && isFreePreviewLesson(course, lessonId));
}
function newRule(key) {
  const parts = key.split("/").filter(Boolean);
  const course = FOLDER_TO_COURSE[parts[1]];
  const lessonId = (parts[parts.length - 1] || "").replace(/\.[a-z0-9]+$/i, "");
  return Boolean(course && lessonId && isFreeMediaKey(key));
}
const rule = OLD ? oldRule : newRule;

// 데이터의 모든 미디어: key → { free: 무료 강의가 쓰나, paid: 유료 강의가 쓰나, lessons }
const media = new Map();
const freeIds = Object.fromEntries(Object.entries(FREE_PREVIEW_LESSON_IDS).map(([c, ids]) => [c, new Set(ids)]));
let freeLessonsSeen = 0;
const scannedByCourse = {};
const outsideAllowList = []; // 5. 허용 폴더 밖 미디어
const ALLOWED_FOLDERS = new Set(Object.keys(FOLDER_TO_COURSE));
// 무료 강의 수의 기대값 — FREE_PREVIEW_LESSON_IDS 중 강의 파일이 있는 것(전에는 30 고정 — ADULT · PASS-OFF 4 개를 못 셌다)
const freeExpected = Object.entries(FREE_PREVIEW_LESSON_IDS).reduce((n, [c, ids]) => n + ids.filter((id) => fs.existsSync(path.join(REPO, "content/lessons", c, `${id}.json`))).length, 0);
for (const course of SCAN_COURSES) {
  const dir = path.join(REPO, "content/lessons", course);
  if (!fs.existsSync(dir)) continue;
  scannedByCourse[course] = 0;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    scannedByCourse[course]++;
    if (BREAK === "adult-media" && course === "adult" && id === "a1-1") {
      d.audio = [...(d.audio || []), { src: "/audio/adult/a1-1.mp3" }];
      console.log("[일부러 깸] 무료 ADULT a1-1 이 /audio/adult/a1-1.mp3 를 쓴다고 메모리에서만 넣음");
    }
    const isFree = Boolean(freeIds[course] && freeIds[course].has(id));
    if (isFree) freeLessonsSeen++;
    for (const m of [...(d.audio || []), ...(d.video || [])]) {
      const folder = String((m && m.src) || "").split("/").filter(Boolean)[1];
      if (/^\/(audio|video)\//.test(String((m && m.src) || "")) && !ALLOWED_FOLDERS.has(folder)) outsideAllowList.push(`${m.src} (${course}/${id})`);
      const src = String((m && m.src) || "");
      if (!/^\/(audio|video)\//.test(src)) continue;
      const key = src.slice(1);
      const e = media.get(key) || { free: false, paid: false, lessons: [] };
      if (isFree) e.free = true; else e.paid = true;
      e.lessons.push(`${course}/${id}`);
      media.set(key, e);
    }
  }
}

const fails = [];
const freeKeys = [...media].filter(([, e]) => e.free).map(([k]) => k);
const paidOnly = [...media].filter(([, e]) => !e.free).map(([k]) => k);
// 1
const lockedFree = freeKeys.filter((k) => !rule(k));
if (freeLessonsSeen !== freeExpected) fails.push(`무료 강의 파일 ${freeLessonsSeen}개 (${freeExpected}개여야 함 — FREE_PREVIEW_LESSON_IDS 중 파일이 있는 것)`);
if (lockedFree.length) fails.push(`무료 강의 파일이 잠김 ${lockedFree.length}: ${lockedFree.slice(0, 5).join(", ")}`);
// 2
const openPaid = paidOnly.filter((k) => rule(k));
if (openPaid.length) fails.push(`유료 강의만 쓰는 파일이 무료로 열림 ${openPaid.length}: ${openPaid.slice(0, 5).join(", ")}`);
// 3
const crafted = [];
for (const [course, ids] of Object.entries(FREE_PREVIEW_LESSON_IDS)) {
  const folder = course; // 과정 이름과 폴더 이름이 같다 (위 목록)
  const prefix = course === "cnn" ? "video" : "audio";
  const ext = course === "cnn" ? "mp4" : "mp3";
  for (const id of ids) for (const tail of ["-999", "-1-1", "-0"]) {
    const key = `${prefix}/${folder}/${id}${tail}.${ext}`;
    if (!media.has(key)) crafted.push(key);
  }
}
const craftedOpen = crafted.filter((k) => rule(k));
if (craftedOpen.length) fails.push(`무료 id 에 숫자를 붙인 이름이 무료로 열림 ${craftedOpen.length}/${crafted.length}: ${craftedOpen.slice(0, 4).join(", ")}`);
// 4
const disagree = [...media.keys()].filter((k) => oldRule(k) !== newRule(k));

// 5 (회귀 점검 1002)
if (outsideAllowList.length) fails.push(`강의 데이터의 미디어가 허용 폴더(mediaAccess.ts FOLDER_TO_COURSE) 밖 ${outsideAllowList.length}: ${outsideAllowList.slice(0, 4).join(", ")}`);

console.log(`규칙: ${OLD ? "예전 (isFreePreviewLesson — 대조군)" : "새것 (freeMedia.ts 정확 일치)"}`);
console.log(`허용 폴더(mediaAccess.ts 에서 읽음): ${Object.keys(FOLDER_TO_COURSE).join(" · ")}`);
console.log(`훑은 과정 · 강의 파일: ${Object.entries(scannedByCourse).map(([c, n]) => `${c} ${n}`).join(" · ")}`);
console.log(`데이터의 미디어 파일 ${media.size}개 · 무료 강의가 쓰는 것 ${freeKeys.length} · 유료 강의만 쓰는 것 ${paidOnly.length}`);
console.log(`1. 무료 강의 ${freeLessonsSeen}개의 파일 중 잠긴 것: ${lockedFree.length}/${freeKeys.length}`);
console.log(`2. 유료 강의만 쓰는 파일 중 무료로 열린 것: ${openPaid.length}/${paidOnly.length}`);
console.log(`3. 무료 id + "-숫자" 로 지은 없는 이름 중 무료로 열린 것: ${craftedOpen.length}/${crafted.length}`);
console.log(`4. 실제 파일 중 두 규칙 판정이 갈리는 것: ${disagree.length}${disagree.length ? ` (${disagree.slice(0, 5).join(", ")})` : ""}`);
console.log(`5. 강의 데이터의 미디어 중 허용 폴더 밖: ${outsideAllowList.length}${outsideAllowList.length ? ` (${outsideAllowList.slice(0, 3).join(", ")})` : ""}`);
if (disagree.length) fails.push(`실제 파일에서 두 규칙이 다르게 판정 ${disagree.length}`);
if (fails.length) { console.log(`\nFAIL\n - ${fails.join("\n - ")}`); process.exit(1); }
console.log("\nPASS");
