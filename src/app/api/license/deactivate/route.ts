import { NextResponse } from "next/server";
import { unregisterDeviceFromKey } from "@/lib/deviceStorage";
import { verifyLicenseToken } from "@/lib/serverLicense";
import { LICENSE_SESSION_COOKIE_NAME, readCookie } from "@/lib/licenseSession";
import { normalizeLicenseKey } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId, token } = body;

    // BUG-018: the page sends `{ deviceId, token }` — the code comes out of the token.
    // An old page that still keeps the code also sends `key`; then it must match.
    if (!deviceId || typeof deviceId !== "string" || (key !== undefined && (typeof key !== "string" || !key))) {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // SEC-04: this used to free a device slot for anyone who sent a code and a device
    // ID. It now needs a token this server signed for that device — the session
    // cookie, or the copy the page keeps. An expired token still counts (its
    // signature is genuine), so a learner whose period ended can free the slot.
    const wantedKey = typeof key === "string" ? normalizeLicenseKey(key) : null;
    const candidates = [readCookie(request, LICENSE_SESSION_COOKIE_NAME), typeof token === "string" ? token : null];
    let normalizedKey: string | null = null;
    for (const candidate of candidates) {
      if (!candidate) continue;
      const result = verifyLicenseToken(candidate, deviceId);
      if (!result.payload || result.payload.deviceId !== deviceId) continue;
      const tokenKey = normalizeLicenseKey(result.payload.key);
      if (wantedKey && tokenKey !== wantedKey) continue;
      normalizedKey = tokenKey;
      break;
    }
    if (!normalizedKey) {
      return NextResponse.json(
        { success: false, error: "이 기기에서 등록한 이용권만 해제할 수 있습니다." },
        { status: 403 }
      );
    }

    const result = await unregisterDeviceFromKey(normalizedKey, deviceId);
    const response = NextResponse.json({
      success: true,
      registeredDevicesCount: result.devices.length,
      maxDevices: result.maxDevices,
    });
    response.cookies.set({
      name: LICENSE_SESSION_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("License deactivation API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
