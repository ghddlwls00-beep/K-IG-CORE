import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  checkLoginRateLimit,
  createAdminSessionToken,
  recordLoginAttempt,
  verifyAdminPin,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  try {
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown-client";

    // 1. Check brute force rate limit
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `로그인 시도 횟수를 초과했습니다. 보안을 위해 ${rateCheck.waitSeconds}초 동안 잠깁니다.`,
          blocked: true,
          waitSeconds: rateCheck.waitSeconds,
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string") {
      return NextResponse.json(
        { success: false, error: "관리자 PIN을 입력해 주세요." },
        { status: 400 },
      );
    }

    // 2. Verify PIN
    const isValid = verifyAdminPin(pin.trim());
    if (!isValid) {
      const attemptRes = recordLoginAttempt(clientIp, false);
      if (attemptRes.blocked) {
        return NextResponse.json(
          {
            success: false,
            error: `비밀번호가 5회 연속 일치하지 않습니다. ${attemptRes.waitSeconds}초간 로그인이 차단됩니다.`,
            blocked: true,
            waitSeconds: attemptRes.waitSeconds,
          },
          { status: 429 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `관리자 비밀번호가 올바르지 않습니다. (남은 시도: ${attemptRes.remainingAttempts}회)`,
          remainingAttempts: attemptRes.remainingAttempts,
        },
        { status: 401 },
      );
    }

    // 3. Success - record success & issue session token
    recordLoginAttempt(clientIp, true);
    const token = createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "관리자 인증이 완료되었습니다.",
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24 hours
    });

    return response;
  } catch (err) {
    console.error("Admin login API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
