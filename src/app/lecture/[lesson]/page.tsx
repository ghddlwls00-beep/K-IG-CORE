import Link from "next/link";
import type { Metadata } from "next";
import { BRAND_NAME, LESSON_DESCRIPTION_SUFFIX } from "@/lib/brand";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import LessonPage from "@/app/[course]/[lesson]/page";
import { LessonPaywall } from "@/components/LessonPaywall";
import { getAllLessonParams, getLesson } from "@/lib/content";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import { isFreePreviewLesson, planOpensCourse } from "@/lib/license";
import { freeLessonLinks } from "@/lib/freeLessonLinks";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";
import { getLectureProgress, isLectureLessonUnlocked, lectureChapterOf } from "@/lib/lectureProgress";
import { lectureStepBefore } from "@/lib/lectureChapters";

/**
 * LECTURE lessons (2026-10-17, docs/lecture/README.md) — ADULT's own route (src/app/adult/[lesson]/page.tsx) for LECTURE:
 * the free lectures lm001 · lm002 are open; with a licence that opens LECTURE (an all-pass — 사장님 "올패스로만"), LIFE opens
 * every chapter and any other plan the chapters its progress has opened (src/lib/lectureProgress.ts); then the shared lesson
 * page renders LectureLearningView.
 *
 * A locked lecture renders the lock screen ONLY — its head (title · chapter line) and LessonPaywall. Not one page image or
 * pen path reaches its HTML or RSC payload: the lesson's `lecture` block is read only after the gate (the shared page), and
 * this screen takes nothing from it. (September's GVA course was retired for the opposite — 400 direct R2 addresses in a
 * locked page's HTML.)
 * An unknown id never reaches here — src/proxy.ts rejects it from validRoutes.json (RE-016, as ADULT).
 */

export function generateStaticParams() {
  return getAllLessonParams()
    .filter((item) => item.course === "lecture")
    .map((item) => ({ lesson: item.lesson }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson: id } = await params;
  const lesson = getLesson("lecture", id);
  if (!lesson) return { title: { absolute: BRAND_NAME } };
  const pres = formatLessonPresentation("lecture", lesson);
  const canonical = `/lecture/${id}`;
  const title = pres.title;
  const description = `${pres.title} — ${pres.subtitle}. ${LESSON_DESCRIPTION_SUFFIX}`;
  const image = "/images/og/lecture.jpg";
  const isFree = isFreePreviewLesson("lecture", id);
  return {
    title,
    description,
    alternates: { canonical },
    ...(isFree ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1000, height: 525, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function LectureLessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: id } = await params;
  const lesson = getLesson("lecture", id);
  if (!lesson) notFound();
  const pres = formatLessonPresentation("lecture", lesson);
  const cookieStore = await cookies();
  const isFree = isFreePreviewLesson("lecture", id);
  const lessonChapter = lectureChapterOf(id) ?? 0;
  // 뼈대세우기 · 문장구조론 · 알파오메가 (2026-10-19): the lecture whose end opens this one
  const stepBefore = lectureStepBefore(id) ?? null;

  let accessAllowed = isFree;
  let sequentialLock = false;
  if (!isFree) {
    const session = await verifyLicenseSessionToken(cookieStore.get(LICENSE_SESSION_COOKIE_NAME)?.value);
    if (session && planOpensCourse(session.payload.plan, "lecture")) {
      if (session.payload.plan === "LIFE") {
        accessAllowed = true;
      } else {
        const progress = await getLectureProgress(session.payload.key);
        accessAllowed = isLectureLessonUnlocked(id, progress);
      }
      sequentialLock = !accessAllowed;
    }
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
        <nav aria-label="과정으로">
          <Link
            href="/lecture"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>LECTURE 목록</span>
          </Link>
        </nav>
        {/* the lecture's head as the lesson page draws it — '중등 영어독해 3강' and its chapter line '1장 · 중등 영어독해 1~10강' */}
        <header className="mt-1 mb-4 sm:mb-6">
          <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">{pres.title}</h1>
          {pres.subtitle ? <p className="mt-0.5 text-caption text-ink-faint">{pres.subtitle}</p> : null}
        </header>
        <LessonPaywall
          courseSlug="lecture"
          courseTitle="LECTURE"
          lessonId={id}
          lockReason={sequentialLock ? "progress" : "license"}
          chapter={lessonChapter || undefined}
          stepBeforeTitle={stepBefore ? getLesson("lecture", stepBefore)?.title : undefined}
          freeLessons={freeLessonLinks("lecture", 2, id)}
        />
      </main>
    );
  }

  return <LessonPage params={Promise.resolve({ course: "lecture", lesson: id })} />;
}
