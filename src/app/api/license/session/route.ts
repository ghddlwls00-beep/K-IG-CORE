import { NextResponse } from "next/server";
import { effectiveLicenseExpiry, getDeviceRecordForKey } from "@/lib/deviceStorage";
import {
  DEVICE_COOKIE_NAME,
  LICENSE_SESSION_COOKIE_NAME,
  isValidDeviceId,
  readCookie,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";

/**
 * ISS-13 — what this browser's httpOnly cookies still prove after its localStorage
 * was cleared (Safari deletes script-writable storage after 7 days without a visit;
 * server-set cookies survive).
 *
 *   { valid: true, key, plan, deviceId, expiresAt, activatedAt, token }
 *       the licence session cookie is still good (same checks as the lesson gate:
 *       signature, record, device still registered, not revoked, period not over)
 *   { valid: false, deviceId? }
 *       no usable session; `deviceId` is the device cookie, so re-entering the code
 *       on this browser reuses its slot instead of taking a new one
 *
 * Reads only this request's own cookies; the token returned is the one the page
 * already kept in localStorage before it was cleared.
 */
export async function GET(request: Request) {
  try {
    const deviceCookie = readCookie(request, DEVICE_COOKIE_NAME);
    const deviceId = isValidDeviceId(deviceCookie) ? deviceCookie : undefined;
    const token = readCookie(request, LICENSE_SESSION_COOKIE_NAME);
    const session = await verifyLicenseSessionToken(token);
    if (!session || !token) {
      return NextResponse.json({ valid: false, deviceId }, { headers: { "Cache-Control": "no-store" } });
    }
    const { payload } = session;
    const record = await getDeviceRecordForKey(payload.key);
    return NextResponse.json(
      {
        valid: true,
        key: payload.key,
        plan: payload.plan,
        deviceId: payload.deviceId,
        expiresAt: effectiveLicenseExpiry(record, payload.plan, payload.expiresAt),
        activatedAt: record?.firstActivatedAt ?? payload.iat,
        token,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("License session API error:", err);
    return NextResponse.json({ valid: false, error: "세션 확인 중 오류가 발생했습니다." }, { status: 500 });
  }
}
