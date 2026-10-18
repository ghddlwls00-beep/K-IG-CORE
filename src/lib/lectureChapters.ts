/**
 * LECTURE (2026-10-17, docs/lecture/README.md) — which chapter a lecture is in, from its id alone.
 *
 * 200 lectures in 20 chapters of 10 (content/courses/lecture.json): "lm001"–"lm100" are the 중등 book (chapters 1–10),
 * "lh001"–"lh100" the 고등 book (chapters 11–20 — its lectures count from 1 again, 사장님). The server's progress
 * (lectureProgress.ts) reads the chapters from the index; the browser's lock (LicenseProvider) and the lesson route use
 * this, so it must give the same answer — node scripts/lecture/check-lecture-app.mjs compares all 200.
 *
 * THE SECTIONS (사장님 2026-10-19): LECTURE shows four — 뼈대세우기 · 문장구조론 · 알파오메가 · 영어독해. The 200 above are
 * 영어독해. The other three have no chapters: their lectures are long (20–35 min) and open ONE BY ONE — a lecture opens
 * when the one before it in its section is finished (or it is free: each section's 1·2강). That rule needs no record of its
 * own: it reads the same per-lesson completions the server already keeps. Their ids are listed here (the build writes the
 * same lists to lecture.json `sections`; the check compares them).
 *
 * Import-free on purpose: the scripts transpile it alone.
 */

export const LECTURE_CHAPTERS = 20;

/** A 영어독해 lecture id: lm001–lm100 · lh001–lh100 */
export const LECTURE_LESSON_ID = /^l[mh](?:0\d[1-9]|0[1-9]0|100)$/;

const range = (prefix: string, numbers: number[]) => numbers.map((n) => `${prefix}${String(n).padStart(3, "0")}`);

/** The one-by-one sections, in the order shown, with their lectures in order (문장구조론 has no 6강 — the file is missing). */
export const LECTURE_STEP_SECTIONS: readonly { key: string; title: string; lessons: readonly string[] }[] = [
  { key: "lb", title: "뼈대세우기", lessons: range("lb", [1, 2, 3, 4]) },
  { key: "ls", title: "문장구조론", lessons: range("ls", [1, 2, 3, 4, 5, 7, 8, 9, 10]) },
  { key: "la", title: "알파오메가", lessons: range("la", Array.from({ length: 20 }, (_, i) => i + 1)) },
];

const STEP_POSITION = new Map<string, { section: string; index: number; lessons: readonly string[] }>();
for (const s of LECTURE_STEP_SECTIONS) s.lessons.forEach((id, index) => STEP_POSITION.set(id, { section: s.key, index, lessons: s.lessons }));

/** Any LECTURE lecture id (영어독해 or a one-by-one section) */
export function isLectureId(lessonId: string): boolean {
  return LECTURE_LESSON_ID.test(lessonId) || STEP_POSITION.has(lessonId);
}

/** "lm013" → 2 · "lh001" → 11 · "lh100" → 20; null for anything that is not a 영어독해 lecture id */
export function lectureChapterOf(lessonId: string): number | null {
  if (!LECTURE_LESSON_ID.test(lessonId)) return null;
  const n = Number(lessonId.slice(2));
  return (lessonId[1] === "h" ? 10 : 0) + Math.ceil(n / 10);
}

/** The section key of a lecture: "lb" · "ls" · "la" · "reading" (영어독해); null for anything else */
export function lectureSectionOf(lessonId: string): string | null {
  if (LECTURE_LESSON_ID.test(lessonId)) return "reading";
  return STEP_POSITION.get(lessonId)?.section ?? null;
}

/**
 * For a lecture of a one-by-one section: the lecture that must be finished before it opens (null for the section's
 * first). undefined for a 영어독해 lecture or an unknown id — those follow the chapter rule.
 */
export function lectureStepBefore(lessonId: string): string | null | undefined {
  const at = STEP_POSITION.get(lessonId);
  if (!at) return undefined;
  return at.index === 0 ? null : at.lessons[at.index - 1];
}

/** A one-by-one lecture is open when it is its section's first, or the one before it is finished. */
export function lectureStepOpen(lessonId: string, isCompleted: (id: string) => boolean): boolean {
  const before = lectureStepBefore(lessonId);
  if (before === undefined) return false;
  return before === null || isCompleted(before);
}
