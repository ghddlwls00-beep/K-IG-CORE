import { NextResponse } from "next/server";
import { unregisterDeviceFromKey } from "@/lib/deviceStorage";
import { LICENSE_SESSION_COOKIE_NAME } from "@/lib/licenseSession";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId } = body;

    if (!key || !deviceId) {
      return NextResponse.json(
        { success: false, error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

    const result = await unregisterDeviceFromKey(key, deviceId);
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
