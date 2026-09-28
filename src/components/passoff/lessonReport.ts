"use client";

import { useCallback } from "react";
import { syncLearnerRecord } from "@/lib/learning/sync";
import { notePassoffReport, PASSOFF_COURSE } from "@/lib/passoffLearning";
import { usePassoffLearner } from "./ui";

/** What "내 답도 맞아요" says inside a lesson once sent (an answer there never counts, so nothing else happens). */
export const LESSON_REPORT_NOTE = "신고했어요. 확인한 뒤 맞는 답이면 정답에 더해요.";

/**
 * "내 답도 맞아요" on a wrong result inside a lesson (공통-학습-엔진.md §8-6 — 단계 2-나 E2): kept for judging in the record of
 * whoever studies now (notePassoffReport — usePassoffLearner, as the lesson's answers are), and — with a licence that opens
 * the course — that record goes up at once (view "record": no item's words come back), so the owner's list
 * (/admin/license) has it without waiting for the review page. No request without such a licence.
 */
export function useLessonReport(): (report: Parameters<typeof notePassoffReport>[0]) => void {
  const learner = usePassoffLearner();
  return useCallback(
    (report) => {
      notePassoffReport(report, learner);
      if (learner) void syncLearnerRecord(PASSOFF_COURSE, learner, { view: "record" });
    },
    [learner],
  );
}
