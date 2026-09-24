import { NextResponse } from "next/server";
import {
  issueLicenseToken,
  licenseIdFor,
  validateLicenseKey,
} from "@/lib/serverLicense";
import { registerDeviceForKey } from "@/lib/deviceStorage";
import { LICENSE_SESSION_COOKIE_NAME, deviceCookie, isValidDeviceId } from "@/lib/licenseSession";
import { maskLicenseKey } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId, deviceName } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 },
      );
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, error: "기기 식별 정보를 확인할 수 없습니다." },
        { status: 400 },
      );
    }

    // 1. Cryptographic validation of key on server
    const validation = validateLicenseKey(key);
    if (!validation.valid || !validation.plan) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || "유효하지 않은 이용권 코드입니다.",
        },
        { status: 400 },
      );
    }

    // 2. Device slot registration
    const regResult = await registerDeviceForKey(
      key,
      validation.plan,
      deviceId,
      deviceName || "알 수 없는 기기",
    );

    if (!regResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: regResult.error,
          registeredDevicesCount: regResult.devices.length,
          maxDevices: regResult.maxDevices,
          ...(regResult.expired ? { expired: true, expiresAt: regResult.expiresAt } : {}),
        },
        { status: 403 },
      );
    }

    // 3. Issue the signed token. SEC-01: the expiry comes from the licence's first
    // registration (kept on the record), not from this activation — re-entering
    // a code must never extend a fixed-term plan.
    const now = Date.now();
    const expiresAt = regResult.expiresAt ?? null;
    const licenseToken = issueLicenseToken(
      key,
      validation.plan,
      deviceId,
      expiresAt,
    );

    const response = NextResponse.json({
      success: true,
      plan: validation.plan,
      activatedAt: regResult.firstActivatedAt ?? now,
      expiresAt,
      licenseToken,
      // BUG-018: the page keeps these, never the code it just sent
      maskedKey: maskLicenseKey(key),
      licenseId: licenseIdFor(key),
      registeredDevicesCount: regResult.devices.length,
      maxDevices: regResult.maxDevices,
    });
    response.cookies.set({
      name: LICENSE_SESSION_COOKIE_NAME,
      value: licenseToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: expiresAt
        ? Math.max(1, Math.floor((expiresAt - now) / 1000))
        : 365 * 24 * 60 * 60,
    });
    // ISS-13: keep the device ID where Safari's 7-day storage cap does not reach.
    if (isValidDeviceId(deviceId)) response.cookies.set(deviceCookie(deviceId));
    return response;
  } catch (err) {
    console.error("License activation API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
