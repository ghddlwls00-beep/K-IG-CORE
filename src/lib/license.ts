/**
 * License Key Engine for K-IG Platform.
 *
 * Supports offline/static verification using salted cryptographic checksums.
 * Keys follow the format:
 *   - KIG-1M-XXXX-YYYY (1 Month Pass)
 *   - KIG-1Y-XXXX-YYYY (1 Year All-Pass)
 *   - KIG-LIFE-XXXX-YYYY (Lifetime VIP Pass)
 */

export type LicensePlan = "1M" | "1Y" | "LIFE";

export interface LicenseInfo {
  key: string;
  plan: LicensePlan;
  planLabel: string;
  activatedAt: string;
  expiresAt: string | null;
  isExpired: boolean;
}

const SALT = "KIG_EDU_KEY_SALT_v1_2026";

/** Simple deterministic hash for checksum computation. */
function computeChecksum(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, "0");
  return hex.slice(0, 4);
}

/** Generate a 4-character random hex token. */
function randomToken(): string {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)
    .toUpperCase();
}

/**
 * Generate an authentic license key for a given plan.
 */
export function generateLicenseKey(plan: LicensePlan): string {
  const nonce = randomToken();
  const checksum = computeChecksum(`${SALT}:${plan}:${nonce}`);
  return `KIG-${plan}-${nonce}-${checksum}`;
}

/**
 * Validate a user-provided license key.
 */
export function validateLicenseKey(
  rawKey: string,
): { valid: boolean; plan?: LicensePlan; error?: string } {
  if (!rawKey) return { valid: false, error: "이용권 코드를 입력해 주세요." };

  const cleaned = rawKey.trim().toUpperCase().replace(/\s+/g, "");
  const parts = cleaned.split("-");

  if (parts.length !== 4 || parts[0] !== "KIG") {
    return {
      valid: false,
      error: "올바른 형식의 이용권 코드가 아닙니다. (예: KIG-1Y-XXXX-XXXX)",
    };
  }

  const plan = parts[1] as LicensePlan;
  if (plan !== "1M" && plan !== "1Y" && plan !== "LIFE") {
    return { valid: false, error: "알 수 없는 이용권 플랜입니다." };
  }

  const nonce = parts[2];
  const checksum = parts[3];
  const expectedChecksum = computeChecksum(`${SALT}:${plan}:${nonce}`);

  if (checksum !== expectedChecksum) {
    return {
      valid: false,
      error: "유효하지 않거나 검증에 실패한 이용권 코드입니다. 다시 확인해 주세요.",
    };
  }

  return { valid: true, plan };
}

/** Calculate expiration timestamp in milliseconds from now. */
export function calculateExpiry(plan: LicensePlan, fromMs = Date.now()): number | null {
  if (plan === "LIFE") return null;
  if (plan === "1M") return fromMs + 30 * 24 * 60 * 60 * 1000;
  if (plan === "1Y") return fromMs + 365 * 24 * 60 * 60 * 1000;
  return null;
}

export function getPlanLabel(plan: LicensePlan): string {
  switch (plan) {
    case "1M":
      return "1개월 체험 패스";
    case "1Y":
      return "1년 VIP 올패스";
    case "LIFE":
      return "평생 소장 VIP 패스";
    default:
      return "K-IG 올패스";
  }
}

/**
 * Check if a lesson is free for preview when the user doesn't have an active license.
 * Rule: Only Section 1's 1st and 2nd lessons (sectionIndex === 0 && lessonIndex < 2) are free preview.
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

  const match = lessonId.match(/(\d+)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num <= 2;
  }

  return false;
}
