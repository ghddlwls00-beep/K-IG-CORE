"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { learningDay } from "@/lib/learning/day";
import { onLearningChange, readCourseRecord } from "@/lib/learning/record";
import { PASSOFF_COURSE, passoffDevicePlan, passoffFreeRecord } from "@/lib/passoffLearning";
import { IconChevronRight } from "../icons";

interface EntryState {
  /** this device has a finished lesson's items (without a licence: a free lesson's) */
  studied: boolean;
  count: number;
  seconds: number;
  reviewFirst: boolean;
  comeback: boolean;
}

/**
 * '오늘 복습 · 약 N분' on the PASS-OFF GRAMMAR course list (공통-학습-엔진.md §8-4) — the plan the engine makes now from
 * this device's record (without a licence, from the free lessons' items alone: the review page has only those). "오늘
 * 복습 없음" when nothing is due, and nothing at all before a lesson has been finished here. Under it one line when the
 * plan says so: a long break brings the comeback set ('복습 10개부터'), too much due suggests reviewing before a new lesson
 * (a suggestion, never a lock).
 */
export function PassoffReviewEntry({ withLicence }: { withLicence: boolean }) {
  const [state, setState] = useState<EntryState | null>(null);

  useEffect(() => {
    const read = () => {
      const record = readCourseRecord(PASSOFF_COURSE);
      const plan = passoffDevicePlan(record, learningDay(Date.now()), { freeOnly: !withLicence });
      setState({
        studied: Object.keys((withLicence ? record : passoffFreeRecord(record)).items).length > 0,
        count: plan.items.length,
        seconds: plan.seconds,
        reviewFirst: plan.reviewFirst,
        comeback: plan.comeback,
      });
    };
    read();
    return onLearningChange(PASSOFF_COURSE, read);
  }, [withLicence]);

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
