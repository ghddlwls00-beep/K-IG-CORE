import crypto from "crypto";

export const ADMIN_COOKIE_NAME = "kig_admin_session";
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

const ADMIN_SECRET =
  process.env.ADMIN_SESSION_SECRET || "KIG_ADMIN_SECRET_SALT_2026_SECURE_TOKEN";

export function getAdminPin(): string {
  return process.env.ADMIN_PIN || "kig2026!";
}

export function verifyAdminPin(inputPin: string): boolean {
  if (!inputPin) return false;
  const target = getAdminPin();
  const bufA = Buffer.from(inputPin);
  const bufB = Buffer.from(target);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export function createAdminSessionToken(): string {
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  const payload = Buffer.from(
    JSON.stringify({ role: "admin", exp: expiresAt }),
  ).toString("base64url");
  const signature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyAdminSessionToken(token: string): boolean {
  if (!token || !token.includes(".")) return false;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", ADMIN_SECRET)
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (data.role !== "admin" || !data.exp || data.exp < Date.now()) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function getSessionTokenFromRequest(request: Request): string | null {
  // 1. Check Cookie header
  const cookieHeader = request.headers.get("cookie") || "";
  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${ADMIN_COOKIE_NAME}=`)) {
      return decodeURIComponent(cookie.substring(ADMIN_COOKIE_NAME.length + 1));
    }
  }

  // 2. Check Authorization header
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }

  return null;
}

export function verifyAdminSession(request: Request): boolean {
  const token = getSessionTokenFromRequest(request);
  if (!token) return false;
  return verifyAdminSessionToken(token);
}

// In-memory rate limiter for brute-force protection
interface RateLimitRecord {
  attempts: number;
  blockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();
const MAX_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function checkLoginRateLimit(identifier: string): {
  allowed: boolean;
  waitSeconds?: number;
} {
  const record = loginAttempts.get(identifier);
  if (!record) return { allowed: true };

  const now = Date.now();
  if (record.blockedUntil > now) {
    const waitSeconds = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  if (record.blockedUntil > 0 && record.blockedUntil <= now) {
    loginAttempts.delete(identifier);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordLoginAttempt(
  identifier: string,
  success: boolean,
): {
  remainingAttempts?: number;
  blocked?: boolean;
  waitSeconds?: number;
} {
  const now = Date.now();
  if (success) {
    loginAttempts.delete(identifier);
    return {};
  }

  const record = loginAttempts.get(identifier) || {
    attempts: 0,
    blockedUntil: 0,
  };
  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.blockedUntil = now + BLOCK_DURATION_MS;
    loginAttempts.set(identifier, record);
    return {
      blocked: true,
      waitSeconds: Math.ceil(BLOCK_DURATION_MS / 1000),
    };
  }

  loginAttempts.set(identifier, record);
  return {
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
    blocked: false,
  };
}
