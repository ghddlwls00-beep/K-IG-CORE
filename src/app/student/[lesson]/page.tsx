import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import LessonPage from "@/app/[course]/[lesson]/page";
import { LessonPaywall } from "@/components/LessonPaywall";
import { getAllLessonParams, getLesson } from "@/lib/content";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import { isFreePreviewLesson } from "@/lib/license";
import { freeLessonLinks } from "@/lib/freeLessonLinks";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";
import { getStudentProgress, isStudentLessonUnlocked } from "@/lib/studentProgress";

export function generateStaticParams() {
  return getAllLessonParams()
    .filter((item) => item.course === "student")
    .map((item) => ({ lesson: item.lesson }));
}

/**
 * RE-016: unknown params must be rejected BEFORE this page, not by it.
 *
 * An unknown lesson that reaches this page calls `notFound()` mid-render, and
 * Next answers 404 with an EMPTY shell. The not-found content then exists only
 * inside the script tags, so a visitor sees a blank page until React runs and a
 * crawler sees a blank page forever.
 *
 * `dynamicParams = false` DOES NOT PREVENT THAT HERE. Next only enforces it for
 * a route it has prerendered, and this page never was: it reads the licence
 * cookie on every request (and, since SEC-05, the root layout reads the request
 * headers too). `src/proxy.ts` is what rejects an unknown `/student/<id>`, from
 * a list of the lesson files on disk. The export is kept for the day the route
 * is prerendered again.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson: id } = await params;
  const lesson = getLesson("student", id);
  if (!lesson) return { title: "K-IG 교육" };
  const pres = formatLessonPresentation("student", lesson);
  // RE-011/RE-012: STUDENT lessons live on their own route, so they need their
  // own canonical + share card exactly like the shared `[course]/[lesson]`
  // route. Without the canonical they were declared duplicates of "/".
  const canonical = `/student/${id}`;
  const title = pres.title;
  const description = lesson.menuLabel
    ? `${lesson.menuLabel} — ${pres.title}. K-IG 핵심 어학 과정.`
    : `${pres.title}. K-IG 핵심 어학 과정.`;
  // SEO-01: the 1000×525 landscape crop, declared at its real size.
  const image = "/images/og/students.jpg";
  // RE-008: the locked STUDENT lessons render the same paywall shell as the
  // shared route, so they get the same treatment. `follow` stays true.
  //
  // The free check goes through `isFreePreviewLesson` rather than the literal
  // list this route used to carry: the sitemap and the shared route both ask
  // that function, and a page whose gate and whose sitemap disagree is worse
  // than either being wrong on its own.
  const isFree = isFreePreviewLesson("student", id);
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

export default async function StudentLessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: id } = await params;
  const lesson = getLesson("student", id);
  if (!lesson) notFound();
  const pres = formatLessonPresentation("student", lesson);
  const cookieStore = await cookies();
  // Same predicate as the metadata above and as the sitemap. This used to be a
  // literal `id === "s1-1" || id === "s1-2"`, which is the same answer today
  // but a second list to keep in step.
  const isFree = isFreePreviewLesson("student", id);
  const lessonChapter = Number(id.match(/^s(\d+)-/)?.[1] || 0);

  let accessAllowed = isFree;
  let sequentialLock = false;
  if (!isFree) {
    const session = await verifyLicenseSessionToken(
      cookieStore.get(LICENSE_SESSION_COOKIE_NAME)?.value,
    );
    if (session) {
      if (session.payload.plan === "LIFE") {
        accessAllowed = true;
      } else {
        const progress = await getStudentProgress(session.payload.key);
        accessAllowed = isStudentLessonUnlocked(id, progress);
      }
      sequentialLock = !accessAllowed;
    }
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
        <nav aria-label="과정으로">
          <Link
            href="/student"
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>STUDENT 목록</span>
          </Link>
        </nav>
        {/* UI검토-1007 16번 · 4장 8: the lesson's head as the lesson page draws it — '2-1 · …' and its chapter line '2장 · 가족 소개' */}
        <header className="mt-1 mb-4 sm:mb-6">
          <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">{pres.title}</h1>
          {pres.subtitle ? <p className="mt-0.5 text-caption text-ink-faint">{pres.subtitle}</p> : null}
        </header>
        <LessonPaywall
          courseSlug="student"
          courseTitle="STUDENT"
          lessonId={id}
          lockReason={sequentialLock ? "progress" : "license"}
          chapter={lessonChapter || undefined}
          freeLessons={freeLessonLinks("student")}
        />
      </main>
    );
  }

  return (
    <LessonPage
      params={Promise.resolve({ course: "student", lesson: id })}
    />
  );
}
