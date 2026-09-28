import { NextResponse } from "next/server";
import { planOpensCourse } from "@/lib/license";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { learningCourseAdapter } from "@/lib/learning/serverCourses";

/**
 * The data of the items a device asks for by key (공통-학습-엔진.md §10 — the review screen's "device-plan" source): for a
 * course whose record stays on the device (the others until D04), the device plans today's review itself and asks here
 * for those items only, so its page never carries the course's paid items as a whole.
 *
 * POST { keys } → { items } — a licence session that opens the course (401 · 403), the course's server adapter (404 —
 * serverCourses.ts), at most 120 requests a minute per device (429), at most MAX_KEYS keys (a day's review is smaller) and
 * the data of those keys alone, of lessons this licence has open (the adapter's itemData — the same one the learning API
 * uses). A key the course does not have, or of a locked lesson, gets nothing.
 */

const requestWindows = new Map<string, { startedAt: number; count: number }>();

function allowRequest(identity: string): boolean {
  const now = Date.now();
  if (requestWindows.size >= 500) {
    for (const [id, window] of requestWindows) if (now - window.startedAt >= 60_000) requestWindows.delete(id);
  }
  const current = requestWindows.get(identity);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(identity, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

/** a day's review is about ten minutes: 120 of the quickest items (VOCA's 5 s) — a whole next-day lesson besides */
const MAX_KEYS = 200;
const MAX_BODY_BYTES = 40_000;

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

export async function POST(request: Request, { params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  const adapter = learningCourseAdapter(course);
  if (!adapter) return fail(404, "복습 문항을 서버에서 주지 않는 과정입니다.");
  try {
    const session = await verifyLicenseSession(request);
    if (!session) return fail(401, "유효한 이용권 인증이 필요합니다.");
    if (!planOpensCourse(session.payload.plan, course)) return fail(403, "이 이용권으로는 이 과정을 이용할 수 없습니다.");
    if (!allowRequest(session.payload.deviceId)) return fail(429, "복습 문항 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, "요청이 너무 큽니다.");
    let keys: unknown;
    try {
      keys = (JSON.parse(text) as { keys?: unknown } | null)?.keys;
    } catch {
      return fail(400, "요청 형식이 올바르지 않습니다.");
    }
    if (
      !Array.isArray(keys) ||
      keys.length > MAX_KEYS ||
      !keys.every((key) => typeof key === "string" && key.length > 0 && key.length <= 80)
    ) {
      return fail(400, "요청 형식이 올바르지 않습니다.");
    }

    const access = await adapter.access({ key: session.payload.key, plan: session.payload.plan });
    const items = adapter.itemData([...new Set(keys as string[])], access);
    return NextResponse.json({ success: true, items }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error(`Learning items failed (${course}):`, error);
    return fail(500, "복습 문항을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
