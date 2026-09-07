import crypto from "crypto";
import type { LicensePlan } from "./license";

const SALT = process.env.LICENSE_SALT || "KIG_EDU_KEY_SALT_v1_2026";
const LICENSE_SECRET =
  process.env.LICENSE_SECRET || "KIG_SERVER_LICENSE_SIGNING_SECRET_2026_KEY";

/** Simple deterministic hash for checksum computation. */
function computeChecksum(input: string): string {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c64e6d;
  for (let i = 0; i < input.length; i++) {
    const ch = input.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
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
 * Generate an authentic license key for a given plan (Server Only).
 */
export function generateLicenseKey(plan: LicensePlan): string {
  const nonce = randomToken();
  const checksum = computeChecksum(`${SALT}:${plan}:${nonce}`);
  return `KIG-${plan}-${nonce}-${checksum}`;
}

/**
 * Validate a user-provided license key (Server Only).
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
  const validPlans: LicensePlan[] = [
    "1M",
    "1Y",
    "LIFE",
    "STU1M",
    "STU1Y",
    "STULIFE",
    "STU",
  ];
  if (!validPlans.includes(plan)) {
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
export function calculateExpiry(plan: LicensePlan | string, fromMs = Date.now()): number | null {
  if (plan === "LIFE" || plan === "STULIFE") return null;
  if (plan === "1M" || plan === "STU1M") return fromMs + 30 * 24 * 60 * 60 * 1000;
  if (plan === "1Y" || plan === "STU1Y" || plan === "STU") return fromMs + 365 * 24 * 60 * 60 * 1000;
  return null;
}

export interface LicenseTokenPayload {
  key: string;
  plan: LicensePlan;
  deviceId: string;
  expiresAt: number | null;
  iat: number;
}

/**
 * Issue a cryptographically signed HMAC-SHA256 license proof token.
 * Cannot be forged without LICENSE_SECRET.
 */
export function issueLicenseToken(
  key: string,
  plan: LicensePlan,
  deviceId: string,
  expiresAt: number | null,
): string {
  const payload: LicenseTokenPayload = {
    key: key.trim().toUpperCase(),
    plan,
    deviceId,
    expiresAt,
    iat: Date.now(),
  };

  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(payloadB64)
    .digest("base64url");

  return `${payloadB64}.${signature}`;
}

/**
 * Verify a cryptographically signed license proof token.
 */
export function verifyLicenseToken(
  token: string,
  expectedDeviceId?: string,
): { valid: boolean; payload?: LicenseTokenPayload; error?: string } {
  if (!token || !token.includes(".")) {
    return { valid: false, error: "유효하지 않은 라이선스 토큰 형식입니다." };
  }

  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) {
    return { valid: false, error: "토큰 구성 요소가 올바르지 않습니다." };
  }

  // 1. Verify HMAC Signature
  const expectedSig = crypto
    .createHmac("sha256", LICENSE_SECRET)
    .update(payloadB64)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: "위조되었거나 서명이 변조된 토큰입니다." };
  }

  // 2. Parse payload
  try {
    const payload: LicenseTokenPayload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8"),
    );

    // 3. Verify device binding if requested
    if (expectedDeviceId && payload.deviceId !== expectedDeviceId) {
      return {
        valid: false,
        error: "해당 기기에 등록된 이용권 정보와 일치하지 않습니다.",
      };
    }

    // 4. Verify expiration
    if (payload.expiresAt && payload.expiresAt < Date.now()) {
      return { valid: false, error: "이용 기간이 만료되었습니다.", payload };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, error: "토큰 데이터 파싱에 실패했습니다." };
  }
}
