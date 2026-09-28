"use client";

import { useEffect, useRef } from "react";

/**
 * "내 답도 맞아요" beside a wrong result (공통-학습-엔진.md §8-6 — 단계 2-나 E2): one quiet button, and once pressed one line saying
 * what happens to the report. The same look wherever a result is shown — the review's results (ReviewSession), a course's
 * own cards (PASS-OFF ComposeCard · FormItemCard) and the wrong-answer list (WrongNotes). Who records it is the caller's.
 *
 * Pressing it removes the button, so the line that takes its place takes the focus (tabIndex -1) — otherwise a keyboard or
 * screen-reader user's focus falls to the top of the page (점검 18). Only after a press here: a line drawn already reported
 * (the card drawn again) leaves the focus where it is.
 */
export function MyAnswerReport({ reported, note, onReport }: { reported: boolean; note: string; onReport: () => void }) {
  const pressed = useRef(false);
  const lineRef = useRef<HTMLParagraphElement | null>(null);
  useEffect(() => {
    if (!reported || !pressed.current) return;
    pressed.current = false;
    lineRef.current?.focus({ preventScroll: true });
  }, [reported]);

  if (reported) {
    return (
      <p ref={lineRef} tabIndex={-1} className="text-label text-ink-soft" role="status" data-my-answer-report="sent">
        {note}
      </p>
    );
  }
  return (
    <div>
      <button
        type="button"
        onClick={() => {
          pressed.current = true;
          onReport();
        }}
        data-my-answer-report="button"
        className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
      >
        내 답도 맞아요
      </button>
    </div>
  );
}
