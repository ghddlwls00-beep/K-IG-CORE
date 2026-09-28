"use client";

import { useCallback } from "react";
import { syncCourseRecordWith } from "@/lib/learning/sync";
import { planOpensCourse } from "@/lib/license";
import { notePassoffReport, PASSOFF_COURSE } from "@/lib/passoffLearning";
import { useLicense } from "../LicenseProvider";

/** What "내 답도 맞아요" says inside a lesson once sent (an answer there never counts, so nothing else happens). */
export const LESSON_REPORT_NOTE = "신고했어요. 확인한 뒤 맞는 답이면 정답에 더해요.";

/**
 * "내 답도 맞아요" on a wrong result inside a lesson (공통-학습-엔진.md §8-6 — 단계 2-나 E2): kept for judging in this device's
 * record (notePassoffReport), and — with a licence that opens the course — the record goes up at once (view "record": no
 * item's words come back), so the owner's list (/admin/license) has it without waiting for the review page. No request
 * without such a licence.
 */
export function useLessonReport(): (report: Parameters<typeof notePassoffReport>[0]) => void {
  const { hasActiveLicense, licenseInfo } = useLicense();
  const withLicence = hasActiveLicense && planOpensCourse(licenseInfo?.plan, PASSOFF_COURSE);
  return useCallback(
    (report) => {
      notePassoffReport(report);
      if (withLicence) void syncCourseRecordWith(PASSOFF_COURSE, { view: "record" });
    },
    [withLicence],
  );
}
