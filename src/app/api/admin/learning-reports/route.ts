import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { reportGroups } from "@/lib/learning/review";
import { serverLearningCourse } from "@/lib/learning/serverCourses";
import { listLearningReports, SERVER_LEARNING_COURSES } from "@/lib/learning/serverStore";

/**
 * /admin/license — the "내 답도 맞아요" reports (공통-학습-엔진.md §8-6 · §7 — 단계 2-나 E2): the learners' server records of a
 * course, read and never written, the reports grouped by item (review.ts reportGroups) with what the item asks and the
 * answers it already takes (the course adapter's describe). Nameless — the records are named by a hash of the code, and
 * nothing here says whose a report is. Judging is the fix session's (an accepted answer goes into the lesson's accept list,
 * then 관문 4); this route only shows.
 *
 * A page of records at a time (E2 수정 — one request used to read every record whole): POST { course, after } answers that
 * page's groups and `next`, and the screen asks again with `after: next` until it is null, joining the pages
 * (review.ts mergeReportGroups). R2: a listing and a read per record of the page, only when the owner asks.
 */
/** groups one page answers at most (the screen joins the pages and shows the most reported 300) */
const MAX_ITEMS = 2_000;

export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json({ success: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = (await request.json().catch(() => ({}))) as { course?: unknown; after?: unknown; limit?: unknown };
    const course = typeof body.course === "string" ? body.course : SERVER_LEARNING_COURSES[0];
    const adapter = serverLearningCourse(course);
    if (!adapter) {
      return NextResponse.json({ success: false, error: "기록을 서버에 두지 않는 과정입니다." }, { status: 404 });
    }
    const page = await listLearningReports(course, {
      after: typeof body.after === "string" && body.after.length <= 200 ? body.after : null,
      ...(typeof body.limit === "number" ? { limit: body.limit } : {}),
    });
    const groups = reportGroups(page.records);
    const items = groups.slice(0, MAX_ITEMS).map((group) => ({ ...group, about: adapter.describe?.(group.item) ?? null }));
    return NextResponse.json(
      {
        success: true,
        course,
        records: page.records.length,
        recordsWithReports: page.records.filter((record) => record.reports.length > 0).length,
        itemCount: groups.length,
        items,
        next: page.next,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Admin learning reports failed:", error);
    return NextResponse.json({ success: false, error: "신고를 불러오지 못했습니다." }, { status: 500 });
  }
}
