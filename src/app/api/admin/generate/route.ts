import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { generateLicenseKey } from "@/lib/serverLicense";
import { setMaxDevicesForKey } from "@/lib/deviceStorage";
import type { LicensePlan } from "@/lib/license";

export async function POST(request: Request) {
  try {
    // 1. Verify Admin Session
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "관리자 인증이 필요하거나 세션이 만료되었습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { plan, quantity = 1, maxDevices = 2, memo } = body;

    const validPlans: LicensePlan[] = ["1M", "1Y", "LIFE"];
    if (!validPlans.includes(plan)) {
      return NextResponse.json(
        { success: false, error: "유효하지 않은 플랜입니다." },
        { status: 400 },
      );
    }

    const count = Math.min(Math.max(1, Number(quantity) || 1), 100);
    const limit = Math.min(Math.max(1, Number(maxDevices) || 2), 10);
    const now = new Date().toLocaleString("ko-KR");

    const items = [];
    const keys = [];

    for (let i = 0; i < count; i++) {
      const k = generateLicenseKey(plan);
      keys.push(k);
      items.push({
        key: k,
        plan,
        createdAt: now,
        memo: memo ? String(memo).trim() : undefined,
        maxDevices: limit,
      });

      // Register initial device limit in device storage
      setMaxDevicesForKey(k, limit, plan);
    }

    return NextResponse.json({
      success: true,
      keys,
      items,
    });
  } catch (err) {
    console.error("Admin generate API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
