import { NextResponse } from "next/server";
import { resetAllDevicesForKey } from "@/lib/deviceStorage";
import { verifyAdminSession } from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "관리자 인증이 필요하거나 세션이 만료되었습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { key } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 },
      );
    }

    resetAllDevicesForKey(key);
    return NextResponse.json({
      success: true,
      message: "기기 등록이 초기화되었습니다.",
    });
  } catch (err) {
    console.error("License reset API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
