import { NextResponse } from "next/server";
import { validateLicenseKey } from "@/lib/license";
import { registerDeviceForKey } from "@/lib/deviceStorage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, deviceId, deviceName } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!deviceId || typeof deviceId !== "string") {
      return NextResponse.json(
        { success: false, error: "기기 식별 정보를 확인할 수 없습니다." },
        { status: 400 }
      );
    }

    // 1. Cryptographic validation of key
    const validation = validateLicenseKey(key);
    if (!validation.valid || !validation.plan) {
      return NextResponse.json(
        { success: false, error: validation.error || "유효하지 않은 이용권 코드입니다." },
        { status: 400 }
      );
    }

    // 2. Device slot registration (Max 2 devices)
    const regResult = registerDeviceForKey(
      key,
      validation.plan,
      deviceId,
      deviceName || "알 수 없는 기기"
    );

    if (!regResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: regResult.error,
          registeredDevicesCount: regResult.devices.length,
          maxDevices: 2,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      plan: validation.plan,
      registeredDevicesCount: regResult.devices.length,
      maxDevices: 2,
    });
  } catch (err) {
    console.error("License activation API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
