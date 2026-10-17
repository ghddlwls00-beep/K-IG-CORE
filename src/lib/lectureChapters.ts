/**
 * LECTURE (2026-10-17, docs/lecture/README.md) — which chapter a lecture is in, from its id alone.
 *
 * 200 lectures in 20 chapters of 10 (content/courses/lecture.json): "lm001"–"lm100" are the 중등 book (chapters 1–10),
 * "lh001"–"lh100" the 고등 book (chapters 11–20 — its lectures count from 1 again, 사장님). The server's progress
 * (lectureProgress.ts) reads the chapters from the index; the browser's lock (LicenseProvider) and the lesson route use
 * this, so it must give the same answer — node scripts/lecture/check-lecture-app.mjs compares all 200.
 *
 * Import-free on purpose: the scripts transpile it alone.
 */

export const LECTURE_CHAPTERS = 20;

/** A lecture id: lm001–lm100 · lh001–lh100 */
export const LECTURE_LESSON_ID = /^l[mh](?:0\d[1-9]|0[1-9]0|100)$/;

/** "lm013" → 2 · "lh001" → 11 · "lh100" → 20; null for anything that is not a lecture id */
export function lectureChapterOf(lessonId: string): number | null {
  if (!LECTURE_LESSON_ID.test(lessonId)) return null;
  const n = Number(lessonId.slice(2));
  return (lessonId[1] === "h" ? 10 : 0) + Math.ceil(n / 10);
}
