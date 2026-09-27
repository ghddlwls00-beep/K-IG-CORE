import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import LessonPage, { generateMetadata as lessonMetadata } from "@/app/[course]/[lesson]/page";
import { PassoffTopicLock } from "@/components/passoff/TopicLock";
import { getAllLessonParams, getLesson, isFreePreviewLessonServer } from "@/lib/content";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import { planOpensCourse } from "@/lib/license";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";
import { getPassoffProgress, isPassoffLessonUnlocked, passoffLockInfo } from "@/lib/passoffProgress";

/**
 * PASS-OFF GRAMMAR lessons, with the topic order lock (docs/pass-off-grammar/설계.md §5) — STUDENT's own route
 * (src/app/student/[lesson]/page.tsx) done the same way for this course: this literal folder wins over
 * [course]/[lesson], decides the lock FIRST, and then renders that route's LessonPage, which keeps every other rule
 * (the free preview, the licence paywall, the paid STUDENT sentences a licence adds — passoffContent.ts).
 *
 * Only one case is new here: a licence that opens the course, is not LIFE, and has not opened this lesson's topic
 * yet gets the topic lock. No licence, or one that does not open the course, falls through to LessonPage and gets
 * the same paywall as before this route existed; a free preview lesson (TOPIC 1) never reads the progress.
 */
const COURSE = "passoff-grammar";

export function generateStaticParams() {
  return getAllLessonParams()
    .filter((item) => item.course === COURSE)
    .map((item) => ({ lesson: item.lesson }));
}

/** RE-016 — as in the STUDENT route: src/proxy.ts rejects an unknown id before this page; kept for a prerender. */
export const dynamicParams = false;

/** The shared route's metadata, unchanged — canonical /passoff-grammar/<id>, noindex for a paid lesson. */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson } = await params;
  return lessonMetadata({ params: Promise.resolve({ course: COURSE, lesson }) });
}

export default async function PassoffLessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: id } = await params;
  const lesson = getLesson(COURSE, id);
  if (!lesson) notFound();

  if (!isFreePreviewLessonServer(COURSE, id)) {
    const session = await verifyLicenseSessionToken(
      (await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value,
    );
    if (session && planOpensCourse(session.payload.plan, COURSE)) {
      // a LIFE pass opens every topic (as STUDENT's) — the progress API takes records anywhere by the same rule
      const everyTopicOpen = session.payload.plan === "LIFE";
      if (!everyTopicOpen) {
        const progress = await getPassoffProgress(session.payload.key);
        if (!isPassoffLessonUnlocked(id, progress, { everyTopicOpen })) {
          const info = passoffLockInfo(id, progress);
          return (
            <PassoffTopicLock
              title={formatLessonPresentation(COURSE, lesson).title}
              topic={info.topic}
              previousTopic={info.previousTopic}
              current={info.current}
            />
          );
        }
      }
    }
  }

  return <LessonPage params={Promise.resolve({ course: COURSE, lesson: id })} />;
}
