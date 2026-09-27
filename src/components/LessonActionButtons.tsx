"use client";

import { useEffect } from "react";
import { useProgress } from "./ProgressProvider";

/**
 * The lesson page's title-row control: the bookmark (44×44 icon button) — and the "recent lesson"
 * record. 2026-09-27 (docs/디자인-규칙.md §6 · 점검 FRAME-U01/U03): the completion toggle moved to
 * the end of the lesson (LessonEndBar), and the amber/emerald tints are gone.
 */
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
  const { isBookmarked, toggleBookmark, recordRecent } = useProgress();
  const bookmarked = isBookmarked(course, lessonId);

  // Automatically record this lesson as the recent lesson
  useEffect(() => {
    recordRecent(course, lessonId, title, courseTitle);
  }, [course, lessonId, title, courseTitle, recordRecent]);

  return (
    <button
      type="button"
      onClick={() => toggleBookmark(course, lessonId)}
      aria-label={bookmarked ? "북마크 해제" : "북마크 추가"}
      aria-pressed={bookmarked}
      title={bookmarked ? "북마크 해제" : "북마크"}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors cursor-pointer hover:bg-raised ${
        bookmarked ? "text-primary" : "text-ink-soft hover:text-ink"
      }`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
        <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1Z" />
      </svg>
    </button>
  );
}
