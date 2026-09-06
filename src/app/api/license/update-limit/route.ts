import { NextResponse } from "next/server";
import { setMaxDevicesForKey } from "@/lib/deviceStorage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, maxDevices, plan, pin } = body;

    // Verify admin PIN
    if (pin !== "kig2026!") {
      return NextResponse.json(
        { success: false, error: "관리자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    if (!key || typeof maxDevices !== "number") {
      return NextResponse.json(
        { success: false, error: "이용권 코드와 변경할 기기 대수를 입력해 주세요." },
        { status: 400 }
      );
    }

    const res = setMaxDevicesForKey(key, maxDevices, plan);
    return NextResponse.json({ success: true, record: res.record });
  } catch (err) {
    console.error("License update-limit API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
