"use client";

import { useEffect } from "react";
import { useProgress } from "./ProgressProvider";

export function LessonActionButtons({
  course,
  lessonId,
  title,
  courseTitle,
}: {
  course: string;
  lessonId: string;
  title: string;
  courseTitle?: string;
}) {
  const { isCompleted, toggleComplete, isBookmarked, toggleBookmark, recordRecent } = useProgress();

  const completed = isCompleted(course, lessonId);
  const bookmarked = isBookmarked(course, lessonId);

  // Automatically record this lesson as the recent lesson
  useEffect(() => {
    recordRecent(course, lessonId, title, courseTitle);
  }, [course, lessonId, title, courseTitle, recordRecent]);

  return (
    <div className="flex items-center gap-2">
      {/* Bookmark Button */}
      <button
        type="button"
        onClick={() => toggleBookmark(course, lessonId)}
        aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
          bookmarked
            ? "border-amber-400 bg-amber-400/10 text-amber-600 dark:text-amber-400 font-semibold shadow-2xs"
            : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
        }`}
      >
        <span className={bookmarked ? "text-amber-500 scale-110" : ""}>
          {bookmarked ? "★" : "☆"}
        </span>
        <span>{bookmarked ? "북마크됨" : "북마크"}</span>
      </button>

      {/* Complete Button */}
      <button
        type="button"
        onClick={() => toggleComplete(course, lessonId)}
        aria-label={completed ? "학습 완료 취소" : "학습 완료 체크"}
        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
          completed
            ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs"
            : "border-line bg-surface text-ink-soft hover:border-line-strong hover:text-ink"
        }`}
      >
        <span
          className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-bold ${
            completed ? "bg-emerald-600 text-white" : "border border-ink-soft/40"
          }`}
        >
          {completed ? "✓" : ""}
        </span>
        <span>{completed ? "학습 완료" : "완료 체크"}</span>
      </button>
    </div>
  );
}
