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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string }>;
}): Promise<Metadata> {
  const { course } = await params;
  const index = getCourseIndex(course);
  return { title: `${index?.course.title ?? "K-IG"} · K-IG 교육` };
}

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
          <span className="font-mono text-[12px] font-semibold text-emerald-600">
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
