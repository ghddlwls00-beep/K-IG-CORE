"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningDay } from "@/lib/learning/day";
import { planDay } from "@/lib/learning/engine";
import { onLearnerRecordChange, readLearnerRecord } from "@/lib/learning/record";
import type { LearningNotesAnswer } from "@/lib/learning/review";
import { syncLearnerRecord } from "@/lib/learning/sync";
import type { CourseRecord, Plan } from "@/lib/learning/types";
import { PASSOFF_COURSE, PASSOFF_NOTES_HREF, PASSOFF_PROFILE, passoffFreeRecord, passoffWrongCount } from "@/lib/passoffLearning";
import { IconChevronRight } from "../icons";

interface EntryState {
  /** the record has a finished lesson's items */
  studied: boolean;
  count: number;
  seconds: number;
  reviewFirst: boolean;
  comeback: boolean;
  /** items on this learner's wrong-answer list (단계 2-나 E2) */
  wrong: number;
}

const stateOf = (record: CourseRecord, plan: Plan, wrong: number): EntryState => ({
  studied: Object.keys(record.items).length > 0,
  count: plan.items.length,
  seconds: plan.seconds,
  reviewFirst: plan.reviewFirst,
  comeback: plan.comeback,
  wrong,
});

/**
 * '오늘 복습 · 약 N분' on the PASS-OFF GRAMMAR course list (공통-학습-엔진.md §8-4 · §10):
 *   - with a licence (`learner`, its id): the SERVER's plan — this licence's record on the device goes up (no item data
 *     comes back) and today's plan comes by the server's clock over the topics open now, so a lesson finished on another
 *     device counts and a phone with nothing on it still gets its link; offline, this device's own copy;
 *   - without one: the plan this device makes from the record kept with no licence, over the free review's items alone
 *     (`freeKeys` — what the review page can draw; a key outside them could never be answered there and would stay due).
 * "오늘 복습 없음" when nothing is due, and nothing at all before a lesson has been finished. Under it one line when the
 * plan says so: a long break brings the comeback set ('복습 10개부터'), too much due suggests reviewing before a new lesson
 * (a suggestion, never a lock).
 *
 * 단계 2-나 E2: and '오답노트 · N문항' (/passoff-grammar/review?notes=1) when the learner's wrong-answer list holds any — the
 * list the notes page shows: with a licence the server's (the same request, `view: "notes"` — the open topics' items, keys
 * only, no item text), without one this device's over the free items — a line of its own beside the entry, so the entry's
 * words stay as they were.
 */
export function PassoffReviewEntry({ learner, freeKeys }: { learner: string | null; freeKeys: readonly string[] }) {
  const [state, setState] = useState<EntryState | null>(null);
  const keys = freeKeys.join("\n");

  useEffect(() => {
    const free = new Set(keys ? keys.split("\n") : []);
    const onDevice = () => {
      const own = readLearnerRecord(PASSOFF_COURSE, learner);
      const record = learner ? own : passoffFreeRecord(own, free);
      return stateOf(record, planDay(record, learningDay(Date.now()), PASSOFF_PROFILE), passoffWrongCount(record, null));
    };
    if (!learner) {
      const read = () => setState(onDevice());
      read();
      return onLearnerRecordChange(PASSOFF_COURSE, read);
    }
    let cancelled = false;
    void syncLearnerRecord<unknown, LearningNotesAnswer>(PASSOFF_COURSE, learner, { planOnly: true, view: "notes" }).then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setState(onDevice());
        return;
      }
      const { record, plan, notes } = result.answer;
      setState(stateOf(record, plan, (notes ?? []).reduce((sum, lesson) => sum + lesson.items.length, 0)));
    });
    return () => {
      cancelled = true;
    };
  }, [keys, learner]);

  if (!state || !state.studied) return null;
  const notes =
    state.wrong > 0 ? (
      <Link
        href={PASSOFF_NOTES_HREF}
        data-passoff-notes-entry
        className="mt-1.5 flex min-h-11 items-center justify-between gap-3 rounded-control px-4 text-label text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
      >
        <span>
          오답노트 · <span className="tabular-nums">{state.wrong}</span>문항
        </span>
        <IconChevronRight size={18} className="shrink-0" />
      </Link>
    ) : null;
  if (!state.count) {
    return (
      <>
        <p className="mt-3 text-label text-ink-soft" data-passoff-review-entry="none">
          오늘 복습 없음
        </p>
        {notes}
      </>
    );
  }
  const minutes = Math.max(1, Math.round(state.seconds / 60));
  return (
    <>
      <div className="mt-3 flex flex-col gap-1.5" data-passoff-review-entry="due">
        <Link
          href={`/${PASSOFF_COURSE}/review`}
          className="flex min-h-12 items-center justify-between gap-3 rounded-control border border-line-strong bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
        >
          <span>
            오늘 복습 · 약 <span className="tabular-nums">{minutes}</span>분
          </span>
          <IconChevronRight size={18} className="shrink-0 text-ink-soft" />
        </Link>
        {state.comeback ? (
          <p className="text-caption text-ink-soft">오랜만이에요. 복습 10개부터 해요.</p>
        ) : state.reviewFirst ? (
          <p className="text-caption text-ink-soft">복습을 먼저 하면 좋아요.</p>
        ) : null}
      </div>
      {notes}
    </>
  );
}
