"use client";

import Link from "next/link";
import { useProgress } from "./ProgressProvider";

type Neighbour = { href: string; title: string } | null;

/**
 * The end of every lesson — 학습 완료 and the previous / next lesson (docs/디자인-규칙.md §1-6 · §6-5).
 *
 * 2026-09-27 (점검 FRAME-U03 · STU-U10 · GRM-U17 · RD-U16): the completion toggle and the
 * previous/next cards used to sit at the TOP of the page, so a learner who finished the last step
 * had to scroll 7–16 phone screens back up to mark it done or to move on. They now close the page.
 *
 * STUDENT keeps its own completion at the end of Step 3 (server progress, chapter unlock), so this
 * bar shows only the neighbours there. The aria-labels "학습 완료 체크" / "학습 완료 취소" are the
 * ones the audit drivers press (gap-checks-0926 P) — keep them.
 */
export function LessonEndBar({
  course,
  lessonId,
  prev,
  next,
}: {
  course: string;
  lessonId: string;
  prev: Neighbour;
  next: Neighbour;
}) {
  const { isCompleted, toggleComplete } = useProgress();
  const completed = isCompleted(course, lessonId);
  const showComplete = course !== "student";

  return (
    <section aria-label="강의 마치기" className="mt-8 border-t border-line pt-6">
      {showComplete ? (
        <button
          type="button"
          onClick={() => toggleComplete(course, lessonId)}
          aria-label={completed ? "학습 완료 취소" : "학습 완료 체크"}
          aria-pressed={completed}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-control text-label font-semibold transition-colors cursor-pointer ${
            completed
              ? "border border-line bg-raised text-ink hover:bg-sunken"
              : "bg-ink text-surface hover:opacity-90"
          }`}
        >
          {completed ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-success">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>학습 완료함</span>
              <span className="font-normal text-ink-soft">· 취소하려면 누르세요</span>
            </>
          ) : (
            <span>이 강의 학습 완료</span>
          )}
        </button>
      ) : null}

      {prev || next ? (
        <nav aria-label="강의 이동" className={`${showComplete ? "mt-3" : ""} grid gap-2 ${prev && next ? "sm:grid-cols-2" : ""}`}>
          {prev ? (
            <Link
              href={prev.href}
              scroll={true}
              aria-label={`이전 강의: ${prev.title}`}
              className="group flex min-h-14 min-w-0 items-center gap-3 rounded-control border border-line bg-raised px-3 py-2 text-left transition-colors hover:bg-sunken"
            >
              <span aria-hidden className="text-ink-soft group-hover:text-ink">←</span>
              <span className="min-w-0">
                <span className="block text-caption text-ink-soft">이전 강의</span>
                <span className="block truncate text-label font-semibold text-ink">{prev.title}</span>
              </span>
            </Link>
          ) : null}
          {next ? (
            <Link
              href={next.href}
              scroll={true}
              aria-label={`다음 강의: ${next.title}`}
              className={`group flex min-h-14 min-w-0 items-center justify-end gap-3 rounded-control px-3 py-2 text-right transition-colors ${
                completed || !showComplete
                  ? "bg-ink text-surface hover:opacity-90"
                  : "border border-line bg-raised hover:bg-sunken"
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-caption ${completed || !showComplete ? "text-surface/75" : "text-ink-soft"}`}>다음 강의</span>
                <span className={`block truncate text-label font-semibold ${completed || !showComplete ? "text-surface" : "text-ink"}`}>{next.title}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
    </section>
  );
}
