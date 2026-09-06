import { NextResponse } from "next/server";
import { loadDeviceRecords } from "@/lib/deviceStorage";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pin } = body;

    // PIN gate check
    if (pin !== "kig2026!") {
      return NextResponse.json(
        { success: false, error: "관리자 인증에 실패했습니다." },
        { status: 401 }
      );
    }

    const records = loadDeviceRecords();
    return NextResponse.json({ success: true, records });
  } catch (err) {
    console.error("License status API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
