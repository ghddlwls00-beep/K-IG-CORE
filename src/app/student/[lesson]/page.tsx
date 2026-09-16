import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import LessonPage from "@/app/[course]/[lesson]/page";
import { LessonPaywall } from "@/components/LessonPaywall";
import { getAllLessonParams, getLesson } from "@/lib/content";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import { isFreePreviewLesson } from "@/lib/license";
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
 * RE-016: unknown params must be rejected by the ROUTER, not by this page.
 *
 * With the default (`dynamicParams = true`) an unknown lesson is rendered on
 * demand, `notFound()` is thrown mid-render, and because the response has
 * already started streaming Next flushes an EMPTY shell with a 404 status. The
 * not-found content then exists only inside the script tags, so a visitor sees
 * a blank page until React runs and a crawler sees a blank page forever.
 *
 * `false` makes the router handle it the way it handles a path that matches no
 * route, which is the shape that rendered the 404 server-side.
 *
 * Safe: every lesson comes from `getAllLessonParams()` and the site is fully
 * static.
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
  const image = "/images/sections/students.jpg";
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
      images: [{ url: image, width: 1200, height: 630, alt: title }],
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
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-12">
        <nav className="mb-8 font-mono text-[11.5px]">
          <Link href="/student" className="text-ink-soft hover:text-ink">← STUDENT</Link>
        </nav>
        <header className="mb-6 sm:mb-8">
          <h1 className="text-[1.5rem] sm:text-[1.85rem] font-bold text-ink">{pres.title}</h1>
        </header>
        <LessonPaywall
          courseSlug="student"
          courseTitle="STUDENT"
          lessonId={id}
          lockReason={sequentialLock ? "progress" : "license"}
          chapter={lessonChapter || undefined}
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
