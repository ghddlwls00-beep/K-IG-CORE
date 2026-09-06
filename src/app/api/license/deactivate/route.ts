import { NextResponse } from "next/server";
import { unregisterDeviceFromKey } from "@/lib/deviceStorage";

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

    const result = unregisterDeviceFromKey(key, deviceId);
    return NextResponse.json({
      success: true,
      registeredDevicesCount: result.devices.length,
      maxDevices: 2,
    });
  } catch (err) {
    console.error("License deactivation API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
