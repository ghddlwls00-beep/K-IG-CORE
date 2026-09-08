import { NextResponse } from "next/server";
import { revokeLicenseKey } from "@/lib/deviceStorage";
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
    const { key, reason = "환불 처리 / 관리자 차단" } = body;

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 },
      );
    }

    const res = await revokeLicenseKey(key, reason);
    return NextResponse.json({
      success: true,
      message: "이용권이 즉시 차단(환불 처리)되었습니다. 등록된 모든 기기 연결이 해제되었습니다.",
      record: res.record,
    });
  } catch (err) {
    console.error("License revoke API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
