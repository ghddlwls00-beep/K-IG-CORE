import { NextResponse } from "next/server";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { planOpensCourse } from "@/lib/license";
import { getAdultChapters, getAdultProgress, updateAdultProgress } from "@/lib/adultProgress";

/**
 * ADULT progress — STUDENT's /api/progress/student for ADULT's own record (src/lib/adultProgress.ts): the same answer
 * shape, the same 120 writes a minute per device and LIFE's every-chapter-open. No legacy import (ADULT had no old app).
 * A plan that does not open ADULT gets 403 (today every plan does — license.ts STUDENT_PASS_COURSES).
 */

const requestWindows = new Map<string, { startedAt: number; count: number }>();

function pruneFinishedWindows(now: number) {
  if (requestWindows.size < 500) return;
  for (const [identity, window] of requestWindows) {
    if (now - window.startedAt >= 60_000) requestWindows.delete(identity);
  }
}

function allowProgressWrite(identity: string): boolean {
  const now = Date.now();
  pruneFinishedWindows(now);
  const current = requestWindows.get(identity);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(identity, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

function publicProgress(record: Awaited<ReturnType<typeof getAdultProgress>>) {
  return {
    version: record.version,
    lessons: record.lessons,
    unlockedThrough: record.unlockedThrough,
    lastLessonId: record.lastLessonId,
    updatedAt: record.updatedAt,
    chapters: getAdultChapters(record),
  };
}

const NO_SESSION = { success: false, error: "유효한 이용권 인증이 필요합니다." };
const NOT_THIS_COURSE = { success: false, error: "이 이용권으로는 ADULT 를 열 수 없습니다." };

export async function GET(request: Request) {
  const session = await verifyLicenseSession(request);
  if (!session) return NextResponse.json(NO_SESSION, { status: 401 });
  if (!planOpensCourse(session.payload.plan, "adult")) return NextResponse.json(NOT_THIS_COURSE, { status: 403 });
  const record = await getAdultProgress(session.payload.key);
  return NextResponse.json({ success: true, progress: publicProgress(record) });
}

export async function POST(request: Request) {
  try {
    const session = await verifyLicenseSession(request);
    if (!session) return NextResponse.json(NO_SESSION, { status: 401 });
    if (!planOpensCourse(session.payload.plan, "adult")) return NextResponse.json(NOT_THIS_COURSE, { status: 403 });
    if (!allowProgressWrite(session.payload.deviceId)) {
      return NextResponse.json(
        { success: false, error: "진도 저장 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    const body = await request.json();
    // BUG-030 (as STUDENT) — a LIFE pass opens every chapter, so a completion anywhere in the course is a real one.
    const options = { everyChapterOpen: session.payload.plan === "LIFE" };
    const rawUpdates = Array.isArray(body.updates) ? body.updates : [body];
    const record = await updateAdultProgress(
      session.payload.key,
      rawUpdates.map((update: Record<string, unknown>) => ({
        lessonId: typeof update.lessonId === "string" ? update.lessonId : undefined,
        completed: typeof update.completed === "boolean" ? update.completed : undefined,
        lastLessonId: typeof update.lastLessonId === "string" ? update.lastLessonId : undefined,
        clientUpdatedAt: typeof update.clientUpdatedAt === "number" ? update.clientUpdatedAt : undefined,
      })),
      options,
    );
    return NextResponse.json({ success: true, progress: publicProgress(record) });
  } catch (error) {
    console.error("ADULT progress update failed:", error);
    return NextResponse.json(
      { success: false, error: "진도를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
