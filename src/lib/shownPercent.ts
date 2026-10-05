/**
 * A progress percentage as the course list shows it (CourseDashboard — '학습 진도율: N / T개 완료 (P%)' and a section's
 * '진행 P%').
 *
 * 2026-10-05 (회귀 점검 1002 A9): plain rounding showed one finished lesson of LISTENING's 276 as "1 / 276개 완료 (0%)" —
 * the learner's first completion looked as if it had not counted. Now any finished lesson shows at least 1%, and a list
 * that is not finished never shows 100% (275 / 276 rounds up to 100). 0 stays 0 and all done stays 100; the numbers in
 * between are rounded as before.
 */
export function shownPercent(done: number, total: number): number {
  if (!(total > 0) || !(done > 0)) return 0;
  if (done >= total) return 100;
  return Math.min(99, Math.max(1, Math.round((done / total) * 100)));
}
