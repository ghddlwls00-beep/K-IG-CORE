import { NextResponse } from "next/server";
import { unregisterDeviceFromKey } from "@/lib/deviceStorage";
import { verifyLicenseToken } from "@/lib/serverLicense";
import { LICENSE_SESSION_COOKIE_NAME, readCookie } from "@/lib/licenseSession";
import { normalizeLicenseKey } from "@/lib/license";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId, token } = body;

    if (!key || !deviceId || typeof key !== "string" || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    // SEC-04: this used to free a device slot for anyone who sent a code and a device
    // ID. It now needs a token this server signed for that code AND that device —
    // the session cookie, or the copy the page keeps. An expired token still counts
    // (its signature is genuine), so a learner whose period ended can free the slot.
    const normalizedKey = normalizeLicenseKey(key);
    const candidates = [readCookie(request, LICENSE_SESSION_COOKIE_NAME), typeof token === "string" ? token : null];
    const authorised = candidates.some((candidate) => {
      if (!candidate) return false;
      const result = verifyLicenseToken(candidate, deviceId);
      return Boolean(result.payload && result.payload.key === normalizedKey && result.payload.deviceId === deviceId);
    });
    if (!authorised) {
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
