import { NextResponse } from "next/server";
import { setMaxDevicesForKey } from "@/lib/deviceStorage";
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
    const { key, maxDevices, plan } = body;

    if (!key || typeof maxDevices !== "number") {
      return NextResponse.json(
        { success: false, error: "이용권 코드와 변경할 기기 대수를 입력해 주세요." },
        { status: 400 },
      );
    }

    const res = await setMaxDevicesForKey(key, maxDevices, plan);
    return NextResponse.json({ success: true, record: res.record });
  } catch (err) {
    console.error("License update-limit API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
