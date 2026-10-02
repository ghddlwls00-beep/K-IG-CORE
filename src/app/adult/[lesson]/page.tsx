import Link from "next/link";
import type { Metadata } from "next";
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
import { adultChapterOf, getAdultProgress, isAdultLessonUnlocked } from "@/lib/adultProgress";

/**
 * ADULT lessons (2026-10-02, docs/adult/README.md) — STUDENT's own route (src/app/student/[lesson]/page.tsx) for ADULT:
 * the free lessons a1-1 · a1-2 are open; with a licence that opens ADULT, LIFE opens every chapter and any other plan the
 * chapters its progress has opened (src/lib/adultProgress.ts); then the shared lesson page renders STUDENT's view.
 * An unknown id never reaches here — src/proxy.ts rejects it from validRoutes.json (RE-016, as STUDENT).
 */

export function generateStaticParams() {
  return getAllLessonParams()
    .filter((item) => item.course === "adult")
    .map((item) => ({ lesson: item.lesson }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson: id } = await params;
  const lesson = getLesson("adult", id);
  if (!lesson) return { title: "K-IG 교육" };
  const pres = formatLessonPresentation("adult", lesson);
  const canonical = `/adult/${id}`;
  const title = pres.title;
  const description = lesson.menuLabel
    ? `${lesson.menuLabel} — ${pres.title}. K-IG 핵심 어학 과정.`
    : `${pres.title}. K-IG 핵심 어학 과정.`;
  const image = "/images/og/men.jpg";
  const isFree = isFreePreviewLesson("adult", id);
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

export default async function AdultLessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: id } = await params;
  const lesson = getLesson("adult", id);
  if (!lesson) notFound();
  const pres = formatLessonPresentation("adult", lesson);
  const cookieStore = await cookies();
  const isFree = isFreePreviewLesson("adult", id);
  const lessonChapter = adultChapterOf(id) ?? 0;

  let accessAllowed = isFree;
  let sequentialLock = false;
  if (!isFree) {
    const session = await verifyLicenseSessionToken(cookieStore.get(LICENSE_SESSION_COOKIE_NAME)?.value);
    if (session && planOpensCourse(session.payload.plan, "adult")) {
      if (session.payload.plan === "LIFE") {
        accessAllowed = true;
      } else {
        const progress = await getAdultProgress(session.payload.key);
        accessAllowed = isAdultLessonUnlocked(id, progress);
      }
      sequentialLock = !accessAllowed;
    }
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
        <nav aria-label="과정으로">
          <Link
            href="/adult"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>ADULT 목록</span>
          </Link>
        </nav>
        <header className="mt-1 mb-4 sm:mb-6">
          <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">{pres.title}</h1>
        </header>
        <LessonPaywall
          courseSlug="adult"
          courseTitle="ADULT"
          lessonId={id}
          lockReason={sequentialLock ? "progress" : "license"}
          chapter={lessonChapter || undefined}
          freeLessons={freeLessonLinks("adult")}
        />
      </main>
    );
  }

  return <LessonPage params={Promise.resolve({ course: "adult", lesson: id })} />;
}
