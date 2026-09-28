"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningDay } from "@/lib/learning/day";
import { planDay } from "@/lib/learning/engine";
import { onLearnerRecordChange, readLearnerRecord } from "@/lib/learning/record";
import { syncLearnerRecord } from "@/lib/learning/sync";
import type { CourseRecord, Plan } from "@/lib/learning/types";
import { PASSOFF_COURSE, PASSOFF_PROFILE, passoffFreeRecord } from "@/lib/passoffLearning";
import { IconChevronRight } from "../icons";

interface EntryState {
  /** the record has a finished lesson's items */
  studied: boolean;
  count: number;
  seconds: number;
  reviewFirst: boolean;
  comeback: boolean;
}

const stateOf = (record: CourseRecord, plan: Plan): EntryState => ({
  studied: Object.keys(record.items).length > 0,
  count: plan.items.length,
  seconds: plan.seconds,
  reviewFirst: plan.reviewFirst,
  comeback: plan.comeback,
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
 */
export function PassoffReviewEntry({ learner, freeKeys }: { learner: string | null; freeKeys: readonly string[] }) {
  const [state, setState] = useState<EntryState | null>(null);
  const keys = freeKeys.join("\n");

  useEffect(() => {
    const free = new Set(keys ? keys.split("\n") : []);
    const onDevice = () => {
      const own = readLearnerRecord(PASSOFF_COURSE, learner);
      const record = learner ? own : passoffFreeRecord(own, free);
      return stateOf(record, planDay(record, learningDay(Date.now()), PASSOFF_PROFILE));
    };
    if (!learner) {
      const read = () => setState(onDevice());
      read();
      return onLearnerRecordChange(PASSOFF_COURSE, read);
    }
    let cancelled = false;
    void syncLearnerRecord(PASSOFF_COURSE, learner, { planOnly: true }).then((result) => {
      if (!cancelled) setState(result.ok ? stateOf(result.answer.record, result.answer.plan) : onDevice());
    });
    return () => {
      cancelled = true;
    };
  }, [keys, learner]);

  if (!state || !state.studied) return null;
  if (!state.count) {
    return (
      <p className="mt-3 text-label text-ink-soft" data-passoff-review-entry="none">
        오늘 복습 없음
      </p>
    );
  }
  const minutes = Math.max(1, Math.round(state.seconds / 60));
  return (
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
  );
}
