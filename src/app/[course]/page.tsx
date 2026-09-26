import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { T } from "@/components/LanguageProvider";
import { getCourseIndex, getCourses } from "@/lib/content";
import { tabForCourse } from "@/lib/tabs";
import { lessonDisplay } from "@/lib/courses";
import { formatGroupTitle, formatLessonPresentation } from "@/lib/curriculumPresentation";
import { CourseDashboard } from "@/components/CourseDashboard";
import type { LessonSummary } from "@/lib/types";

export function generateStaticParams() {
  return getCourses().map((c) => ({ course: c.slug }));
}

/**
 * RE-016: unknown params must be rejected BEFORE this page, not by it.
 *
 * An unknown course that reaches this page calls `notFound()` mid-render, and
 * Next answers 404 with an EMPTY shell — `<div hidden></div>` plus the flight
 * payload. The not-found content exists only inside the script tags, so a
 * visitor sees a blank page until React runs, and a crawler or a JS-disabled
 * client sees a blank page forever.
 *
 * `dynamicParams = false` used to stop that here: the page was prerendered, so
 * the router itself answered an unknown course with a readable 404.
 *
 * SINCE SEC-05 IT NO LONGER DOES. The root layout reads the request headers for
 * the CSP nonce, so this page renders per request, and Next only enforces
 * `dynamicParams = false` for a route it has prerendered. `src/proxy.ts` now
 * rejects unknown one-segment paths before they get here. The export is kept so
 * that the router guard comes back by itself if the page is ever prerendered
 * again; do not rely on it while the layout reads headers.
 */
export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await params;
  const index = getCourseIndex(course);
  const title = `${index?.course.title ?? "K-IG"} · K-IG 교육`;
  // RE-011: each route declares its OWN canonical URL. Without this the global
  // "/" canonical from the root layout made every course page a duplicate of
  // the home page.
  const canonical = `/${course}`;
  const description =
    index?.course.description ||
    "K-IG 핵심 어학 과정 — 어휘, 영문법, 리스닝, 리딩을 한 곳에서.";
  // RE-012: the representative image for a course is its own section banner.
  const image = COURSE_OG_IMAGE[course] || "/images/og/students.jpg";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      images: [{ url: image, width: 1000, height: 525, alt: index?.course.title ?? "K-IG" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

/**
 * The banner that represents each course in a share card. These are the
 * 1000×525 landscape crops of the section photos (SEO-01 — the portrait
 * originals were being declared as 1200×630), so a shared link looks like the
 * page it points at.
 */
const COURSE_OG_IMAGE: Record<string, string> = {
  phonics: "/images/og/voca.jpg",
  grammar1: "/images/og/grammar1.jpg",
  grammar2: "/images/og/grammar2.jpg",
  ld: "/images/og/ld.jpg",
  reading: "/images/og/reading.jpg",
  cnn: "/images/og/cnn.jpg",
  student: "/images/og/students.jpg",
  chinese: "/images/og/chinese.jpg",
};

export default async function CoursePage({ params }: { params: Promise<{ course: string }> }) {
  const { course: slug } = await params;
  const index = getCourseIndex(slug);
  if (!index) notFound();

  const { course, lessons, groups } = index;
  const tab = tabForCourse(course.slug);
  const byId = new Map(lessons.map((l) => [l.id, l]));

  // Korean script pages are reached from their English lesson via the "View the
  // Korean script" button, so listing both here would double every section for
  // no gain. A script page with no English counterpart is still listed, so that
  // nothing in the archive becomes unreachable.
  const mainIds = new Set(lessons.filter((l) => l.variant === "main").map((l) => l.id));
  const hasEnglishPair = (l: LessonSummary) =>
    l.variant === "script" && (
      [...mainIds].some((id) => l.id.startsWith(`${id}-`)) ||
      (course.slug === "grammar1" && [...mainIds].some((id) => {
        const m = id.match(/^gh1-(\d+)$/);
        if (!m) return false;
        const nextId = `gh1-${String(parseInt(m[1], 10) + 1).padStart(3, "0")}`;
        return l.id === nextId || l.id.startsWith(`${nextId}-`);
      }))
    );
  const listed = lessons.filter((l) => !hasEnglishPair(l));
  const listedIds = new Set(listed.map((l) => l.id));

  // The legacy menu's own grouping wins when we recovered one; otherwise fall
  // back to the series/unit structure implied by the filenames.
  const sections = (
    groups.length > 0
      ? groups.map((g) => ({
          label: formatGroupTitle(course.slug, g.label || (g as { title?: string }).title || "Group"),
          lessons: g.lessons
            .filter((id) => listedIds.has(id))
            .map((id) => byId.get(id))
            .filter((l) => l !== undefined),
        }))
      : fallbackSections(course.series, listed)
  ).filter((section) => section.lessons.length > 0);

  // 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U12 · U20): the same 768px column as the lessons,
  // a plain meta line instead of 'CORE TRACK · 총 N개 정규 레슨 · N개 단계 구성', no entrance animation.
  return (
    <main className="mx-auto max-w-3xl px-4 pt-3 pb-12 sm:px-5 sm:pt-6 sm:pb-16">
      <nav aria-label="처음 화면으로">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        >
          <span aria-hidden>←</span>
          <span>처음 화면</span>
        </Link>
      </nav>

      <header className="mt-2 mb-6 flex flex-col gap-2">
        <h1 className="text-title-l font-bold tracking-tight text-ink">{course.title}</h1>
        <p className="text-caption text-ink-soft tabular-nums">
          {listed.length}개 강의{sections.length > 0 ? ` · ${sections.length}구간` : ""}
        </p>
        {course.description ? (
          <p className="max-w-2xl text-label leading-relaxed text-ink-soft">{course.description}</p>
        ) : null}
      </header>

      <CourseDashboard
        courseSlug={course.slug}
        sections={sections.map((section) => ({
          label: section.label,
          lessons: section.lessons.map((lesson) => ({
            id: lesson.id,
            presentation: formatLessonPresentation(course.slug, lesson),
          })),
        }))}
        totalLessons={listed.length}
      />
    </main>
  );
}

/**
 * Courses whose menu had no dropdowns (basics, middle, adults) still have an
 * implied structure in their filenames: the series they belong to, then the
 * unit. This reproduces that rather than dumping several hundred flat tiles.
 */
function fallbackSections(
  series: { slug: string; title: string }[],
  lessons: LessonSummary[],
): { label: string; lessons: LessonSummary[] }[] {
  const out: { label: string; lessons: LessonSummary[] }[] = [];
  for (const s of series) {
    const group = lessons.filter((l) => l.series === s.slug);
    if (group.length > 0) out.push({ label: s.title, lessons: group });
  }
  const claimed = new Set(out.flatMap((s) => s.lessons.map((l) => l.id)));
  const rest = lessons.filter((l) => !claimed.has(l.id));
  if (rest.length > 0) out.push({ label: "기타 · Other", lessons: rest });
  return out;
}
