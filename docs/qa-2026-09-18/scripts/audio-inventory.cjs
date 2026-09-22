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
 * Output: out/audio-inventory.json  { totals, byCourse, clips: [{path, texts, lessons, free}] }
 */
const fs = require("fs");
const path = require("path");
const E = require("./lib/expectations.cjs");
const { REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const OUT = path.join(__dirname, "../out");
const freeKeys = new Set(JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/freeSpeechKeys.json"), "utf8")).keys);
const licenseTs = fs.readFileSync(path.join(REPO, "src/lib/license.ts"), "utf8");
const freeBlock = licenseTs.slice(licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS"), licenseTs.indexOf("};", licenseTs.indexOf("FREE_PREVIEW_LESSON_IDS")));
const FREE_IDS = {};
{
  let cur = null;
  for (const line of freeBlock.split("\n")) {
    const m = line.match(/^\s*([a-z0-9]+):\s*\[/);
    if (m) { cur = m[1]; FREE_IDS[cur] = new Set(); }
    if (cur) for (const x of line.matchAll(/"([a-z0-9-]+)"/g)) FREE_IDS[cur].add(x[1]);
    if (/\]/.test(line)) cur = null;
  }
}
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

for (const course of E.COURSES) {
  const stat = { pages: 0, clipRefs: 0, uniqueClips: new Set(), legacy: 0 };
  for (const p of E.pages(course)) {
    const exp = E.expected(course, p.id);
    stat.pages++;
    const free = isFreeLesson(course, p.id);
    for (const text of exp.clipTexts) {
      const cp = E.unified.unifiedSpeechPath(text);
      stat.clipRefs++;
      stat.uniqueClips.add(cp);
      const rec = clips.get(cp) || { texts: new Set(), lessons: new Set(), freeLesson: false };
      rec.texts.add(text);
      rec.lessons.add(`${course}/${p.id}`);
      rec.freeLesson = rec.freeLesson || free;
      clips.set(cp, rec);
    }
    for (const src of exp.legacyAudio) {
      const rec = legacy.get(src) || { lessons: new Set(), freeLesson: false };
      rec.lessons.add(`${course}/${p.id}`);
      rec.freeLesson = rec.freeLesson || free;
      legacy.set(src, rec);
      stat.legacy++;
    }
  }
  byCourse[course] = { pages: stat.pages, clipReferences: stat.clipRefs, uniqueClips: stat.uniqueClips.size, legacyAudioRefs: stat.legacy };
}

const rows = [...clips.entries()].map(([p, r]) => ({
  path: p,
  key: p.split("/").pop().replace(/\.mp3$/, ""),
  texts: [...r.texts].slice(0, 4),
  textCount: r.texts.size,
  lessons: [...r.lessons].slice(0, 6),
  lessonCount: r.lessons.size,
  freeLesson: r.freeLesson,
  inFreeKeyList: freeKeys.has(p.split("/").pop().replace(/\.mp3$/, "")),
}));
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
  },
  clips: rows,
  legacyAudio: [...legacy.entries()].map(([src, r]) => ({ src, lessons: [...r.lessons].slice(0, 4), lessonCount: r.lessons.size, freeLesson: r.freeLesson })),
};
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "audio-inventory.json"), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ totals: report.totals, byCourse: report.byCourse, problems: { ...report.problems, clipsSample: undefined } }, null, 1));
