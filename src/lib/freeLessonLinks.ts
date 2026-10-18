import "server-only";
import { getLesson } from "./content";
import { FREE_PREVIEW_LESSON_IDS } from "./license";
import { formatLessonPresentation } from "./curriculumPresentation";

/**
 * The course's free lessons as links — the paywall's way forward for a visitor
 * (2026-09-27 · 점검 FRAME-L09). Only the lesson pages a learner starts from: the Korean
 * script pages (`d001-1`) and GRAMMAR I's odd answer pages (which redirect to the even
 * lesson) are in FREE_PREVIEW_LESSON_IDS so their text may be spoken, but are not starts.
 */
export function freeLessonLinks(course: string, limit = 2, nearLessonId?: string): { href: string; title: string }[] {
  const out: { href: string; title: string }[] = [];
  // LECTURE (2026-10-19) has a free pair per section: a locked lecture offers its own section's pair ('la001' for 'la007')
  const free = FREE_PREVIEW_LESSON_IDS[course] ?? [];
  const ids = course === "lecture" && nearLessonId
    ? [...free.filter((id) => id.slice(0, 2) === nearLessonId.slice(0, 2) || (/^l[mh]/.test(id) && /^l[mh]/.test(nearLessonId))), ...free]
    : free;
  for (const id of [...new Set(ids)]) {
    const lesson = getLesson(course, id);
    if (!lesson || lesson.variant !== "main") continue;
    if (course === "grammar1") {
      const m = id.match(/^gh1-(\d+)$/);
      if (!m || parseInt(m[1], 10) % 2 !== 0) continue;
    }
    const href = course === "student" ? `/student/${id}` : `/${course}/${id}`;
    out.push({ href, title: formatLessonPresentation(course, lesson).title });
    if (out.length >= limit) break;
  }
  return out;
}
