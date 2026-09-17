import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { updateLicenseRecordMeta } from "@/lib/deviceStorage";

const MAX_ITEMS = 500;

/**
 * ISS-14 / ADM-06 — admin note and issue time on the server record.
 *
 *   { mode: "memo", key, memo }            edit one code's note (empty string clears it)
 *   { mode: "import", items: [{ key, memo?, createdAt? }] }
 *       carry the old browser-only history over; fills only what the server lacks
 *
 * Only codes that already have a record are touched; unknown codes are reported back.
 */
export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "관리자 인증이 필요하거나 세션이 만료되었습니다." },
        { status: 401 },
      );
    }

    const body = await request.json();

    if (body?.mode === "memo") {
      const key = typeof body.key === "string" ? body.key : "";
      if (!key.trim() || typeof body.memo !== "string") {
        return NextResponse.json({ success: false, error: "코드와 메모가 필요합니다." }, { status: 400 });
      }
      const result = await updateLicenseRecordMeta(key, { memo: body.memo }, false);
      if (!result.success) {
        return NextResponse.json({ success: false, error: "서버에 기록이 없는 코드입니다." }, { status: 404 });
      }
      return NextResponse.json({ success: true, memo: result.record?.memo ?? "" });
    }

    if (body?.mode === "import" && Array.isArray(body.items)) {
      let updated = 0;
      const unknown: string[] = [];
      for (const item of body.items.slice(0, MAX_ITEMS)) {
        if (!item || typeof item.key !== "string" || !item.key.trim()) continue;
        const result = await updateLicenseRecordMeta(
          item.key,
          {
            memo: typeof item.memo === "string" ? item.memo : undefined,
            createdAt: typeof item.createdAt === "number" ? item.createdAt : undefined,
          },
          true,
        );
        if (!result.success) unknown.push(item.key);
        else if (result.changed) updated++;
      }
      return NextResponse.json({ success: true, updated, unknown });
    }

    return NextResponse.json({ success: false, error: "알 수 없는 요청입니다." }, { status: 400 });
  } catch (err) {
    console.error("Admin record-meta API error:", err);
    return NextResponse.json(
      { success: false, error: "서버 처리 중 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
