import { NextResponse } from "next/server";
import { issueLicenseToken, licenseIdFor, verifyLicenseToken } from "@/lib/serverLicense";
import { effectiveLicenseExpiry, getDeviceRecordForKey } from "@/lib/deviceStorage";
import { LICENSE_SESSION_COOKIE_NAME, deviceCookie, isValidDeviceId } from "@/lib/licenseSession";
import { maskLicenseKey, normalizeLicenseKey } from "@/lib/license";

/**
 * BUG-018 — the page sends `{ deviceId, token }`; the code comes out of the token.
 * A page that still keeps the code (activated before BUG-018, or an old bundle in
 * an open tab) also sends `key`; then it must match the token, as before.
 * A v1 token (code readable inside) is answered with a fresh v2 `licenseToken`,
 * and the session cookie is switched to it — the page stores that and drops `key`.
 * A v2 token is kept as it is (re-minting on every visit would change the token
 * the per-tab reload guard is keyed by).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId, token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { valid: false, error: "라이선스 검증 토큰이 누락되었습니다." },
        { status: 400 },
      );
    }

    if (key !== undefined && (typeof key !== "string" || !key)) {
      return NextResponse.json(
        { valid: false, error: "이용권 코드 형식이 올바르지 않습니다." },
        { status: 400 },
      );
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { valid: false, error: "기기 식별 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    // 1. Cryptographic HMAC token signature and expiration check
    const tokenResult = verifyLicenseToken(token, deviceId);
    if (!tokenResult.valid || !tokenResult.payload) {
      return NextResponse.json(
        {
          valid: false,
          error: tokenResult.error || "토큰 서명 검증에 실패했습니다.",
          tampered: true,
        },
        { status: 403 },
      );
    }

    const { plan, expiresAt } = tokenResult.payload;

    // 2. If the page also sent a code (pre-BUG-018 storage), it must be the token's
    // SEC-KEY-01: compare the normalized spelling on both sides, so a spaced
    // variant cannot present itself as a different code.
    if (typeof key === "string" && tokenResult.payload.key !== normalizeLicenseKey(key)) {
      return NextResponse.json(
        {
          valid: false,
          error: "토큰의 이용권 정보가 일치하지 않습니다.",
          tampered: true,
        },
        { status: 403 },
      );
    }

    // 3. Database registration check: Is this device still registered in deviceStorage?
    const normalizedKey = normalizeLicenseKey(tokenResult.payload.key);
    const record = await getDeviceRecordForKey(normalizedKey);

    // 4. Check if license has been revoked (e.g. customer refund)
    if (record?.isRevoked) {
      return NextResponse.json(
        {
          valid: false,
          error: `환불 처리되어 사용이 영구 중지된 이용권입니다. (${record.revokeReason || "환불 완료"})`,
          revoked: true,
        },
        { status: 403 },
      );
    }

    // SEC-03: the same rule as the lesson gate (licenseSession.ts). This used to skip
    // the device check when the record had NO devices — right after an admin "기기
    // 초기화" — so the old device was told "valid" (header: licence active) while every
    // paid lesson stayed locked.
    const isDeviceRegistered = Boolean(
      record?.devices?.some((d) => d.deviceId === deviceId),
    );
    if (!isDeviceRegistered) {
      return NextResponse.json(
        {
          valid: false,
          error:
            "해당 기기의 이용권 등록이 관리자에 의해 초기화되었거나 해제되었습니다.",
          revoked: true,
        },
        { status: 403 },
      );
    }

    // 5. SEC-01: the paid period is fixed to the first registration. A token issued
    // by a re-activation before that rule carries a later date; the record wins.
    const fixedExpiresAt = effectiveLicenseExpiry(record, plan, expiresAt);
    if (fixedExpiresAt !== null && fixedExpiresAt <= Date.now()) {
      return NextResponse.json(
        { valid: false, error: "이용 기간이 만료되었습니다.", expired: true, expiresAt: fixedExpiresAt },
        { status: 403 },
      );
    }

    // BUG-018: a v1 token (readable code) is swapped for a v2 one here
    const sessionToken = tokenResult.legacy
      ? issueLicenseToken(normalizedKey, plan, deviceId, expiresAt)
      : token;
    const response = NextResponse.json({
      valid: true,
      plan,
      expiresAt: fixedExpiresAt,
      maskedKey: maskLicenseKey(normalizedKey),
      licenseId: licenseIdFor(normalizedKey),
      ...(tokenResult.legacy ? { licenseToken: sessionToken } : {}),
    });
    response.cookies.set({
      name: LICENSE_SESSION_COOKIE_NAME,
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: fixedExpiresAt
        ? Math.max(1, Math.floor((fixedExpiresAt - Date.now()) / 1000))
        : 365 * 24 * 60 * 60,
    });
    // ISS-13: learners registered before the device cookie existed get it here.
    if (isValidDeviceId(deviceId)) response.cookies.set(deviceCookie(deviceId));
    return response;
  } catch (err) {
    console.error("License verify API error:", err);
    return NextResponse.json(
      { valid: false, error: "서버 라이선스 검증 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
