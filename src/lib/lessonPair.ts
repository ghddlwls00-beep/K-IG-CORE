/**
 * 회귀 점검 1002 P4 (사장님 2026-10-05): LISTENING (ld) · READING (reading) lessons come as a pair — the lesson ("d006",
 * "pr024") and its script page ("d006-1", "pr024-1": the same screen and title, reached from inside the lesson and not
 * listed — app/[course]/page.tsx `listed`). '이 강의 학습 완료' on either page is that one lesson's completion: the course
 * list counts it for the listed lesson, and either page shows it done (src/components/ProgressProvider.tsx isCompleted ·
 * toggleComplete; CourseDashboard counts through isCompleted). Undoing it on either page undoes both.
 *
 * Only these two courses: every ld and reading lesson is "<letters><digits>" with exactly one "-1" script page (552 = 276 × 2,
 * 512 = 256 × 2 — content/courses/*.json). GRAMMAR II's script pages and every other course are left as they were.
 * Import-free — the checks transpile this file alone.
 */
export const PAIRED_COURSES: readonly string[] = ["ld", "reading"];

const MAIN_ID = /^[a-z]+\d+$/;
const SCRIPT_ID = /^([a-z]+\d+)-1$/;

/** The other page of `lessonId`'s pair in `course` ("d006" ↔ "d006-1"), or null when it has none. */
export function pairedLessonId(course: string, lessonId: string): string | null {
  if (!PAIRED_COURSES.includes(course)) return null;
  const script = SCRIPT_ID.exec(lessonId);
  if (script) return script[1];
  return MAIN_ID.test(lessonId) ? `${lessonId}-1` : null;
}

/** Whether `lessonId` of `course` is done in `completed` ({"<course>:<id>": true}) — either page of its pair counts. */
export function pairCompleted(completed: Readonly<Record<string, boolean>>, course: string, lessonId: string): boolean {
  if (completed[`${course}:${lessonId}`]) return true;
  const other = pairedLessonId(course, lessonId);
  return other !== null && Boolean(completed[`${course}:${other}`]);
}
