import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllGvaLessons, getGvaLesson, getGvaLessonContext } from "@/lib/gva";
import { GvaStreamingPlayer } from "@/components/GvaStreamingPlayer";
import { LessonClientGate } from "@/components/LessonClientGate";

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
    title: `${lesson.title} (${lesson.levelLabel}) · GVA 독해 직강 K-IG 교육`,
    description: `${lesson.title}. 교재 본문과 실제 강의 음성을 웹에서 함께 학습합니다.`,
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
    <LessonClientGate
      courseSlug="gva"
      courseTitle="GVA 영어독해 직강"
      lessonId={lesson.id}
      lessonTitle={lesson.title}
      isFreePreview={lesson.number <= 2}
    >
      <GvaStreamingPlayer
        lesson={lesson}
        allLessons={allLessons}
        prevLesson={prev}
        nextLesson={next}
      />
    </LessonClientGate>
  );
}
