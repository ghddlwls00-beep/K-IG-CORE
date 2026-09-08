import { NextResponse } from "next/server";
import { loadDeviceRecords } from "@/lib/deviceStorage";
import { verifyAdminSession } from "@/lib/adminAuth";

export async function GET(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "관리자 인증이 필요하거나 세션이 만료되었습니다." },
      { status: 401 },
    );
  }

  const records = await loadDeviceRecords();
  return NextResponse.json({ success: true, records });
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "관리자 인증이 필요하거나 세션이 만료되었습니다." },
        { status: 401 },
      );
    }

    const records = await loadDeviceRecords();
    return NextResponse.json({ success: true, records });
  } catch (err) {
    console.error("License status API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
