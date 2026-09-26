"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgress } from "./ProgressProvider";

/** `code` is shown before the title where a course numbers its lessons by chapter (STUDENT 'Ch 12-1'). */
type Neighbour = { href: string; title: string; code?: string } | null;

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
 *
 * 2026-09-27 STUDENT 학습법 · 화면 고침: the neighbours read 'Ch 12-1 · School Vacations (방학맞이)' (STU-U17 — 'Part 1 ·'
 * alone looked like going backwards), and STUDENT's '다음 강의' first sends the queued completion to the server and
 * waits for the answer (A11 — the next chapter's first lesson is opened by the server only once it knows); offline it
 * says so on one line, then goes.
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
  const { isCompleted, toggleComplete, flushStudentUpdates } = useProgress();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const completed = isCompleted(course, lessonId);
  const showComplete = course !== "student";
  const named = (n: NonNullable<Neighbour>) => (n.code ? `${n.code} · ${n.title}` : n.title);

  async function goNext(event: MouseEvent<HTMLAnchorElement>) {
    if (course !== "student" || !next) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    const result = await flushStudentUpdates();
    if (result.status === "offline" || result.status === "error") {
      setNotice(
        result.status === "offline"
          ? "인터넷에 연결되지 않아 완료 기록은 이 기기에 두었어요. 연결되면 저장돼요."
          : "완료 기록을 아직 저장하지 못했어요. 잠시 뒤 다시 보내요.",
      );
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    }
    router.push(next.href);
  }

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
              aria-label={`이전 강의: ${named(prev)}`}
              className="group flex min-h-14 min-w-0 items-center gap-3 rounded-control border border-line bg-raised px-3 py-2 text-left transition-colors hover:bg-sunken"
            >
              <span aria-hidden className="text-ink-soft group-hover:text-ink">←</span>
              <span className="min-w-0">
                <span className="block text-caption text-ink-soft">이전 강의</span>
                <span className="block truncate text-label font-semibold text-ink">{named(prev)}</span>
              </span>
            </Link>
          ) : null}
          {next ? (
            <Link
              href={next.href}
              scroll={true}
              onClick={goNext}
              aria-label={`다음 강의: ${named(next)}`}
              className={`group flex min-h-14 min-w-0 items-center justify-end gap-3 rounded-control px-3 py-2 text-right transition-colors ${
                completed || !showComplete
                  ? "bg-ink text-surface hover:opacity-90"
                  : "border border-line bg-raised hover:bg-sunken"
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-caption ${completed || !showComplete ? "text-surface/75" : "text-ink-soft"}`}>
                  {saving ? "저장 중…" : "다음 강의"}
                </span>
                <span className={`block truncate text-label font-semibold ${completed || !showComplete ? "text-surface" : "text-ink"}`}>{named(next)}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 text-caption text-ink-soft">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
