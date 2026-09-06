import { NextResponse } from "next/server";
import { verifyLicenseToken } from "@/lib/serverLicense";
import { loadDeviceRecords } from "@/lib/deviceStorage";

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

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { valid: false, error: "이용권 코드가 누락되었습니다." },
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

    // 2. Check if key in token matches provided key
    if (tokenResult.payload.key !== key.trim().toUpperCase()) {
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
    const records = loadDeviceRecords();
    const normalizedKey = key.trim().toUpperCase();
    const record = records[normalizedKey];

    if (record && record.devices && record.devices.length > 0) {
      const isDeviceRegistered = record.devices.some(
        (d) => d.deviceId === deviceId,
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
    }

    return NextResponse.json({
      valid: true,
      plan,
      expiresAt,
    });
  } catch (err) {
    console.error("License verify API error:", err);
    return NextResponse.json(
      { valid: false, error: "서버 라이선스 검증 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
