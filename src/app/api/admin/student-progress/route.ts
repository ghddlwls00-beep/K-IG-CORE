import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { validateLicenseKey } from "@/lib/serverLicense";
import {
  getStudentChapters,
  getStudentProgress,
  resetStudentProgress,
  setManualStudentChapter,
  updateStudentProgress,
} from "@/lib/studentProgress";

function summary(record: Awaited<ReturnType<typeof getStudentProgress>>) {
  const chapters = getStudentChapters(record);
  return {
    unlockedThrough: record.unlockedThrough,
    completedLessons: Object.values(record.lessons).filter((item) => item.completed).length,
    lastLessonId: record.lastLessonId,
    updatedAt: record.updatedAt,
    chapters,
  };
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json(
        { success: false, error: "관리자 인증이 필요합니다." },
        { status: 401 },
      );
    }
    const body = await request.json();
    const key = typeof body.key === "string" ? body.key.trim().toUpperCase() : "";
    if (!validateLicenseKey(key).valid) {
      return NextResponse.json(
        { success: false, error: "유효한 이용권 번호가 아닙니다." },
        { status: 400 },
      );
    }

    let record;
    if (body.action === "reset") {
      record = await resetStudentProgress(key);
    } else if (body.action === "setChapter") {
      record = await setManualStudentChapter(key, Number(body.chapter));
    } else if (body.action === "setLesson") {
      record = await updateStudentProgress(key, {
        lessonId: typeof body.lessonId === "string" ? body.lessonId : undefined,
        completed: Boolean(body.completed),
        clientUpdatedAt: Date.now(),
      });
    } else {
      record = await getStudentProgress(key);
    }
    return NextResponse.json({ success: true, progress: summary(record) });
  } catch (error) {
    console.error("Admin STUDENT progress request failed:", error);
    return NextResponse.json(
      { success: false, error: "STUDENT 진도 정보를 처리하지 못했습니다." },
      { status: 500 },
    );
  }
}
