import "server-only";

import { getDeviceRecordForKey } from "@/lib/deviceStorage";
import { verifyLicenseToken, type LicenseTokenPayload } from "@/lib/serverLicense";

export const LICENSE_SESSION_COOKIE_NAME = "kig_license_session";

function readCookie(request: Request, name: string): string | null {
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

  return { payload: verified.payload };
}

export async function verifyLicenseSession(
  request: Request,
): Promise<VerifiedLicenseSession | null> {
  return verifyLicenseSessionToken(readCookie(request, LICENSE_SESSION_COOKIE_NAME));
}
