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
 * Check if a lesson is free for preview when the user doesn't have an active license.
 * Rule: Only Section 1's 1st and 2nd lessons are free preview.
 * For VOCA (phonics): ONLY Section 1's mv1-01 and mv1-02 are free preview. All mv2-*, mv3-*, hv-* are strictly locked.
 */
export function isFreePreviewLesson(
  courseSlug: string,
  lessonId: string,
  sectionIndex?: number,
  lessonIndex?: number,
): boolean {
  // Phonics / VOCA course: strictly Section 1's 1st and 2nd lessons ONLY
  if (courseSlug === "phonics") {
    return lessonId === "mv1-01" || lessonId === "mv1-02";
  }

  // Grammar 1: Only first 2 lessons of Section 1
  if (courseSlug === "grammar1") {
    return lessonId === "gh1-001" || lessonId === "gh1-002";
  }

  // Grammar 2: Only first 2 lessons of Section 1
  if (courseSlug === "grammar2") {
    return (
      lessonId === "gh2-001" ||
      lessonId === "gh2-001-1" ||
      lessonId === "gh2-002" ||
      lessonId === "gh2-002-1"
    );
  }

  // LD (Listening & Dictate): Only first 2 rounds
  if (courseSlug === "ld") {
    return (
      lessonId === "d001" ||
      lessonId === "d001-1" ||
      lessonId === "d002" ||
      lessonId === "d002-1"
    );
  }

  // Reading: Only first 2 lessons
  if (courseSlug === "reading") {
    return lessonId === "rc001" || lessonId === "rc002";
  }

  // CNN: Only first 2 lessons
  if (courseSlug === "cnn") {
    return lessonId === "cnn001" || lessonId === "cnn002";
  }

  // When sectionIndex and lessonIndex are explicitly provided
  if (typeof sectionIndex === "number" && typeof lessonIndex === "number") {
    return sectionIndex === 0 && lessonIndex < 2;
  }

  // Generic fallback: strictly exclude subsequent sections
  if (
    lessonId.includes("mv2") ||
    lessonId.includes("mv3") ||
    lessonId.includes("hv")
  ) {
    return false;
  }

  const match = lessonId.match(/(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num <= 2;
  }

  return false;
}
