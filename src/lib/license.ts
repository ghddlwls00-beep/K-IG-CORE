/**
 * License Key Engine for K-IG Platform.
 *
 * Supports offline/static verification using salted cryptographic checksums.
 * Keys follow the format:
 *   - KIG-1M-XXXX-YYYY (1 Month Pass)
 *   - KIG-1Y-XXXX-YYYY (1 Year All-Pass)
 *   - KIG-LIFE-XXXX-YYYY (Lifetime VIP Pass)
 */

export type LicensePlan =
  | "1M"
  | "1Y"
  | "LIFE"
  | "STU1M"
  | "STU1Y"
  | "STULIFE"
  | "STU";

export interface LicenseInfo {
  key: string;
  plan: LicensePlan;
  planLabel: string;
  activatedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
  isStudentOnly: boolean;
}

/** Returns whether a given plan grants access exclusively to the STUDENT section. */
export function isStudentOnlyPlan(plan?: string | null): boolean {
  if (!plan) return false;
  return plan.startsWith("STU");
}

/** Calculate expiration timestamp in milliseconds from now. */
export function calculateExpiry(plan: LicensePlan | string, fromMs = Date.now()): number | null {
  if (plan === "LIFE" || plan === "STULIFE") return null;
  if (plan === "1M" || plan === "STU1M") return fromMs + 30 * 24 * 60 * 60 * 1000;
  if (plan === "1Y" || plan === "STU1Y" || plan === "STU") return fromMs + 365 * 24 * 60 * 60 * 1000;
  return null;
}

export function getPlanLabel(plan: LicensePlan | string): string {
  switch (plan) {
    case "1M":
      return "1개월 체험 패스";
    case "1Y":
      return "1년 VIP 올패스";
    case "LIFE":
      return "평생 소장 VIP 패스";
    case "STU1M":
      return "STUDENT 1개월 패스";
    case "STU1Y":
    case "STU":
      return "STUDENT 1년 패스";
    case "STULIFE":
      return "STUDENT 평생 소장 패스";
    default:
      return "K-IG 이용권";
  }
}

/**
 * The two visible cards in each current course's first curriculum section.
 *
 * The `-1` / `-2` entries are the lesson's script pages. They are listed
 * explicitly, as ld, reading and grammar2 already did, so that the rule is
 * visible in the data instead of only falling out of the suffix rule below.
 * grammar1 was the one course that had been left out.
 */
export const FREE_PREVIEW_LESSON_IDS: Record<string, readonly string[]> = {
  student: ["s1-1", "s1-2"],
  phonics: ["mv1-01", "mv1-02"],
  grammar1: [
    "gh1-006", "gh1-006-1", "gh1-006-2",
    "gh1-007", "gh1-007-1", "gh1-007-2",
    "gh1-008", "gh1-008-1", "gh1-008-2",
    "gh1-009", "gh1-009-1", "gh1-009-2",
  ],
  grammar2: ["gh2-007", "gh2-007-1", "gh2-008", "gh2-008-1"],
  ld: ["d001", "d001-1", "d002", "d002-1"],
  reading: ["pr001", "pr001-1", "pr002", "pr002-1"],
  cnn: ["cnn001", "cnn002"],
};

/**
 * Only the first curriculum section's first two visible lessons are free.
 *
 * THE ID IS ALSO TRIED WITH TRAILING "-<number>" SEGMENTS REMOVED, longest
 * first. A lesson's id is not always the id its files carry:
 *
 *   STUDENT  s1-1      ships its audio as s1-1-1 … s1-1-9
 *   GRAMMAR  gh1-006   ships its audio as gh1-006-1, gh1-006-2
 *
 * The media gate asks with the FILE's id, so an exact match alone locked the
 * free lesson's own audio — measured on production 2026-09-16,
 * /audio/student/s1-1-1.mp3 answered 403 while /audio/student/s1-1 is the free
 * preview. It also left the script pages of a free lesson behind the paywall
 * (`/grammar1/gh1-006-1`), which the `-1` entries already listed for ld,
 * reading and grammar2 show was never the intent.
 *
 * Nothing paid is widened: a paid id never reduces to a free one
 * (`d276-1` -> `d276`, `pr100-1` -> `pr100`, `mv1-11` -> `mv1`).
 */
export function isFreePreviewLesson(
  courseSlug: string,
  lessonId: string,
  sectionIndex?: number,
  lessonIndex?: number,
): boolean {
  if (typeof sectionIndex === "number" && typeof lessonIndex === "number") {
    return sectionIndex === 0 && lessonIndex < 2;
  }
  const free = FREE_PREVIEW_LESSON_IDS[courseSlug];
  if (!free) return false;

  let id = lessonId;
  for (;;) {
    if (free.includes(id)) return true;
    const shorter = id.replace(/-\d+$/, "");
    if (shorter === id) return false;
    id = shorter;
  }
}
