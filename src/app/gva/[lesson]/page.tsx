import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllGvaLessons, getGvaLesson, getGvaLessonContext } from "@/lib/gva";
import { GvaStreamingPlayer } from "@/components/GvaStreamingPlayer";

export function generateStaticParams() {
  const lessons = getAllGvaLessons();
  return lessons.map((l) => ({ lesson: String(l.number) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lesson: string }>;
}): Promise<Metadata> {
  const { lesson: lessonParam } = await params;
  const lesson = getGvaLesson(lessonParam);
  if (!lesson) return { title: "강의를 찾을 수 없습니다 · K-IG 교육" };
  return {
    title: `${lesson.title} (${lesson.levelLabel}) · GVA 독해 K-IG 교육`,
    description: `강광진 원장의 ${lesson.title} 해설 강의. 교재 본문 슬라이드 동기화 스트리밍 학습`,
  };
}

export default async function GvaLessonPage({
  params,
}: {
  params: Promise<{ lesson: string }>;
}) {
  const { lesson: lessonParam } = await params;
  const lesson = getGvaLesson(lessonParam);
  if (!lesson) notFound();

  const allLessons = getAllGvaLessons();
  const { prev, next } = getGvaLessonContext(lesson.number);

  return (
    <GvaStreamingPlayer
      lesson={lesson}
      allLessons={allLessons}
      prevLesson={prev}
      nextLesson={next}
    />
  );
}
