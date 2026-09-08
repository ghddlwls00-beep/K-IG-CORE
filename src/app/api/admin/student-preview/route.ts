import { NextResponse } from "next/server";
import {
  ADMIN_PREVIEW_COOKIE_NAME,
  verifyAdminSession,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!verifyAdminSession(request)) {
    return NextResponse.json(
      { success: false, error: "관리자 인증이 필요합니다." },
      { status: 401 },
    );
  }
  const body = await request.json();
  const raw = body.mode;
  let value = "";
  if (raw === "free") value = "free";
  else if (Number.isInteger(Number(raw)) && Number(raw) >= 1 && Number(raw) <= 20) {
    value = String(Number(raw));
  } else if (raw !== "full") {
    return NextResponse.json(
      { success: false, error: "올바른 미리보기 상태가 아닙니다." },
      { status: 400 },
    );
  }

  const response = NextResponse.json({ success: true, mode: value || "full" });
  response.cookies.set({
    name: ADMIN_PREVIEW_COOKIE_NAME,
    value,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: value ? 24 * 60 * 60 : 0,
  });
  return response;
}
