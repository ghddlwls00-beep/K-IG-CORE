import { NextResponse } from "next/server";
import { unrevokeLicenseKey } from "@/lib/deviceStorage";
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

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { success: false, error: "이용권 코드를 입력해 주세요." },
        { status: 400 },
      );
    }

    const res = await unrevokeLicenseKey(key);
    if (!res.success) {
      return NextResponse.json(
        { success: false, error: "해당 이용권 기록을 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "이용권 차단이 성공적으로 해제되었습니다.",
      record: res.record,
    });
  } catch (err) {
    console.error("License unrevoke API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
