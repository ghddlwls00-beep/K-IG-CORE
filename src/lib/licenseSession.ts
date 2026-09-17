import "server-only";

import { effectiveLicenseExpiry, getDeviceRecordForKey } from "@/lib/deviceStorage";
import { verifyLicenseToken, type LicenseTokenPayload } from "@/lib/serverLicense";

export const LICENSE_SESSION_COOKIE_NAME = "kig_license_session";

/**
 * ISS-13 — the device ID in an httpOnly cookie as well as localStorage.
 *
 * Safari (ITP) deletes script-writable storage — localStorage and cookies set by
 * JavaScript — after 7 days without a visit; cookies the SERVER sets with
 * Set-Cookie are not capped that way. The device ID lived only in localStorage, so
 * an iPhone learner back after a week got a new ID and re-entering the code took a
 * second device slot (the second time: "최대 기기 수 초과"). The ID is now also set
 * here, and `/api/license/session` hands it (and a still-valid session) back.
 */
export const DEVICE_COOKIE_NAME = "kig_device";
export const DEVICE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60; // browsers cap cookie lifetime at 400 days

export function isValidDeviceId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{4,80}$/.test(value);
}

export function deviceCookie(deviceId: string) {
  return {
    name: DEVICE_COOKIE_NAME,
    value: deviceId,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: DEVICE_COOKIE_MAX_AGE,
  };
}

export function readCookie(request: Request, name: string): string | null {
  const cookies = (request.headers.get("cookie") || "").split(";");
  for (const cookie of cookies) {
    const [rawName, ...rawValue] = cookie.trim().split("=");
    if (rawName === name) return decodeURIComponent(rawValue.join("="));
  }
  return null;
}

export interface VerifiedLicenseSession {
  payload: LicenseTokenPayload;
}

export async function verifyLicenseSessionToken(
  token: string | null | undefined,
): Promise<VerifiedLicenseSession | null> {
  if (!token) return null;
  const verified = verifyLicenseToken(token);
  if (!verified.valid || !verified.payload) return null;

  const record = await getDeviceRecordForKey(verified.payload.key);
  if (!record || record.isRevoked) return null;
  const deviceIsRegistered = record.devices.some(
    (device) => device.deviceId === verified.payload!.deviceId,
  );
  if (!deviceIsRegistered) return null;

  // SEC-01: lessons, media and progress follow the period fixed to the first
  // registration, even for a token that a re-activation issued with a later date.
  const expiresAt = effectiveLicenseExpiry(record, verified.payload.plan, verified.payload.expiresAt);
  if (expiresAt !== null && expiresAt <= Date.now()) return null;

  return { payload: verified.payload };
}

export async function verifyLicenseSession(
  request: Request,
): Promise<VerifiedLicenseSession | null> {
  return verifyLicenseSessionToken(readCookie(request, LICENSE_SESSION_COOKIE_NAME));
}
