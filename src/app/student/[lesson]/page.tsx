import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import LessonPage from "@/app/[course]/[lesson]/page";
import { LessonPaywall } from "@/components/LessonPaywall";
import { getAllLessonParams, getLesson } from "@/lib/content";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson: id } = await params;
  const lesson = getLesson("student", id);
  if (!lesson) return { title: "K-IG 교육" };
  return { title: formatLessonPresentation("student", lesson).title };
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
  const isFree = id === "s1-1" || id === "s1-2";
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
