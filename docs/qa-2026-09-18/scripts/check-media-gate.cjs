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
 */
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OLD = process.argv.includes("--old");
const { FREE_PREVIEW_LESSON_IDS, isFreePreviewLesson } = loadTs(path.join(REPO, "src/lib/license.ts"));
const { isFreeMediaKey } = loadTs(path.join(REPO, "src/lib/freeMedia.ts"));
// mediaAccess.ts 의 허용 폴더 목록과 같다 (그 파일은 서버 모듈을 불러 여기서 통째로 싣지 않는다)
const FOLDER_TO_COURSE = { ld: "ld", reading: "reading", phonics: "phonics", grammar1: "grammar1", grammar2: "grammar2", student: "student", cnn: "cnn" };

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
for (const course of Object.keys(FOLDER_TO_COURSE)) {
  const dir = path.join(REPO, "content/lessons", course);
  if (!fs.existsSync(dir)) continue;
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".json"))) {
    const id = f.replace(/\.json$/, "");
    const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
    const isFree = Boolean(freeIds[course] && freeIds[course].has(id));
    if (isFree) freeLessonsSeen++;
    for (const m of [...(d.audio || []), ...(d.video || [])]) {
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
if (freeLessonsSeen !== 30) fails.push(`무료 강의 파일 ${freeLessonsSeen}개 (30개여야 함)`);
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

console.log(`규칙: ${OLD ? "예전 (isFreePreviewLesson — 대조군)" : "새것 (freeMedia.ts 정확 일치)"}`);
console.log(`데이터의 미디어 파일 ${media.size}개 · 무료 강의가 쓰는 것 ${freeKeys.length} · 유료 강의만 쓰는 것 ${paidOnly.length}`);
console.log(`1. 무료 강의 ${freeLessonsSeen}개의 파일 중 잠긴 것: ${lockedFree.length}/${freeKeys.length}`);
console.log(`2. 유료 강의만 쓰는 파일 중 무료로 열린 것: ${openPaid.length}/${paidOnly.length}`);
console.log(`3. 무료 id + "-숫자" 로 지은 없는 이름 중 무료로 열린 것: ${craftedOpen.length}/${crafted.length}`);
console.log(`4. 실제 파일 중 두 규칙 판정이 갈리는 것: ${disagree.length}${disagree.length ? ` (${disagree.slice(0, 5).join(", ")})` : ""}`);
if (disagree.length) fails.push(`실제 파일에서 두 규칙이 다르게 판정 ${disagree.length}`);
if (fails.length) { console.log(`\nFAIL\n - ${fails.join("\n - ")}`); process.exit(1); }
console.log("\nPASS");
