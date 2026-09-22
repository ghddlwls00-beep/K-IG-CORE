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

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      {/* Apple-style subtle Back Navigation Pill */}
      <nav className="mb-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-sunken px-3.5 py-1.5 font-mono text-[11.5px] font-medium text-ink-soft hover:bg-raised hover:text-ink transition-all shadow-2xs"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          <span>홈으로 돌아가기</span>
        </Link>
      </nav>

      {/* Apple Pro Course Hero Header */}
      <header
        className="mb-10 sm:mb-12 flex flex-col gap-3 pb-8 border-b border-line"
        style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-black/5 px-2.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-ink-soft">
            CORE TRACK
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
            총 {listed.length}개 정규 레슨
          </span>
          {sections.length > 0 && (
            <>
              <span className="text-ink-faint">·</span>
              <span className="font-mono text-[12px] text-ink-faint">
                {sections.length}개 단계 구성
              </span>
            </>
          )}
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          {course.title}
        </h1>

        {course.description ? (
          <p className="max-w-2xl text-[15px] sm:text-[16px] text-ink-soft leading-relaxed">
            {course.description}
          </p>
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
