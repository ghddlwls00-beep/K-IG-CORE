import { NextResponse } from "next/server";
import { verifyLicenseSession } from "@/lib/licenseSession";
import {
  getStudentChapters,
  getStudentProgress,
  mergeLegacyStudentProgress,
  updateStudentProgress,
} from "@/lib/studentProgress";

const requestWindows = new Map<string, { startedAt: number; count: number }>();

function allowProgressWrite(identity: string): boolean {
  const now = Date.now();
  const current = requestWindows.get(identity);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(identity, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

function publicProgress(record: Awaited<ReturnType<typeof getStudentProgress>>) {
  return {
    version: record.version,
    lessons: record.lessons,
    unlockedThrough: record.unlockedThrough,
    lastLessonId: record.lastLessonId,
    updatedAt: record.updatedAt,
    chapters: getStudentChapters(record),
  };
}

export async function GET(request: Request) {
  const session = await verifyLicenseSession(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "유효한 이용권 인증이 필요합니다." },
      { status: 401 },
    );
  }
  const record = await getStudentProgress(session.payload.key);
  return NextResponse.json({ success: true, progress: publicProgress(record) });
}

export async function POST(request: Request) {
  try {
    const session = await verifyLicenseSession(request);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "유효한 이용권 인증이 필요합니다." },
        { status: 401 },
      );
    }
    if (!allowProgressWrite(session.payload.deviceId)) {
      return NextResponse.json(
        { success: false, error: "진도 저장 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    const body = await request.json();
    let record;
    if (Array.isArray(body.legacyCompletedLessonIds)) {
      record = await mergeLegacyStudentProgress(
        session.payload.key,
        body.legacyCompletedLessonIds.filter((value: unknown) => typeof value === "string"),
      );
    } else {
      const rawUpdates = Array.isArray(body.updates) ? body.updates : [body];
      record = await updateStudentProgress(
        session.payload.key,
        rawUpdates.map((update: Record<string, unknown>) => ({
          lessonId: typeof update.lessonId === "string" ? update.lessonId : undefined,
          completed: typeof update.completed === "boolean" ? update.completed : undefined,
          lastLessonId:
            typeof update.lastLessonId === "string" ? update.lastLessonId : undefined,
          clientUpdatedAt:
            typeof update.clientUpdatedAt === "number" ? update.clientUpdatedAt : undefined,
        })),
      );
    }
    return NextResponse.json({ success: true, progress: publicProgress(record) });
  } catch (error) {
    console.error("STUDENT progress update failed:", error);
    return NextResponse.json(
      { success: false, error: "진도를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
