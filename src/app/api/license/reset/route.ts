import { NextResponse } from "next/server";
import { resetAllDevicesForKey } from "@/lib/deviceStorage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { key, pin } = body;

    // Verify admin PIN
    if (pin !== "kig2026!") {
      return NextResponse.json(
        { success: false, error: "관리자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    if (!key) {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 }
      );
    }

    resetAllDevicesForKey(key);
    return NextResponse.json({ success: true, message: "기기 등록이 초기화되었습니다." });
  } catch (err) {
    console.error("License reset API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
