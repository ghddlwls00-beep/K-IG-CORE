import "server-only";
import crypto from "crypto";
import type { LicensePlan } from "./license";

const COMPROMISED_LICENSE_SALT = "KIG_EDU_KEY_SALT_v1_2026";
const COMPROMISED_LICENSE_SECRET = "KIG_SERVER_LICENSE_SIGNING_SECRET_2026_KEY";

function requireSecret(name: "LICENSE_SALT" | "LICENSE_SECRET"): string {
  const value = process.env[name]?.trim();
  const compromised =
    (name === "LICENSE_SALT" && value === COMPROMISED_LICENSE_SALT) ||
    (name === "LICENSE_SECRET" && value === COMPROMISED_LICENSE_SECRET);

  if (!value || value.length < 32 || compromised || /^replace[-_ ]?me/i.test(value)) {
    throw new Error(`${name} is missing or insecure. Configure a unique 32+ character secret.`);
  }

  return value;
}

/** HMAC checksum used to prove that a key was issued by this service. */
function computeChecksum(plan: LicensePlan, nonce: string): string {
  return crypto
    .createHmac("sha256", requireSecret("LICENSE_SALT"))
    .update(`${plan}:${nonce}`)
    .digest("hex")
    .slice(0, 16)
    .toUpperCase();
}

/** Generate a cryptographically secure 64-bit random token. */
function randomToken(): string {
  return crypto.randomBytes(8).toString("hex").toUpperCase();
}

/**
 * Generate an authentic license key for a given plan (Server Only).
 */
export function generateLicenseKey(plan: LicensePlan): string {
  const nonce = randomToken();
  const checksum = computeChecksum(plan, nonce);
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
      error: "올바른 형식의 이용권 코드가 아닙니다.",
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
  if (!/^[A-F0-9]{16}$/.test(nonce) || !/^[A-F0-9]{16}$/.test(checksum)) {
    return { valid: false, error: "유효하지 않은 이용권 코드입니다." };
  }
  const expectedChecksum = computeChecksum(plan, nonce);

  if (!crypto.timingSafeEqual(Buffer.from(checksum), Buffer.from(expectedChecksum))) {
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
    .createHmac("sha256", requireSecret("LICENSE_SECRET"))
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
    .createHmac("sha256", requireSecret("LICENSE_SECRET"))
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
