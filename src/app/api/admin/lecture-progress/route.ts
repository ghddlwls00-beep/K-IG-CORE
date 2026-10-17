import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { validateLicenseKey } from "@/lib/serverLicense";
import { normalizeLicenseKey } from "@/lib/license";
import {
  getLectureChapters,
  getLectureProgress,
  resetLectureProgress,
  setManualLectureChapter,
  updateLectureProgress,
} from "@/lib/lectureProgress";

/** The admin's LECTURE progress tools (2026-10-17) — ADULT's /api/admin/adult-progress for LECTURE's record. */

function summary(record: Awaited<ReturnType<typeof getLectureProgress>>) {
  return {
    unlockedThrough: record.unlockedThrough,
    completedLessons: Object.values(record.lessons).filter((item) => item.completed).length,
    lastLessonId: record.lastLessonId,
    updatedAt: record.updatedAt,
    chapters: getLectureChapters(record),
  };
}

export async function POST(request: Request) {
  try {
    if (!verifyAdminSession(request)) {
      return NextResponse.json({ success: false, error: "관리자 인증이 필요합니다." }, { status: 401 });
    }
    const body = await request.json();
    const key = normalizeLicenseKey(typeof body.key === "string" ? body.key : "");
    if (!validateLicenseKey(key).valid) {
      return NextResponse.json({ success: false, error: "유효한 이용권 번호가 아닙니다." }, { status: 400 });
    }

    let record;
    if (body.action === "reset") {
      record = await resetLectureProgress(key);
    } else if (body.action === "setChapter") {
      record = await setManualLectureChapter(key, Number(body.chapter));
    } else if (body.action === "setLesson") {
      record = await updateLectureProgress(key, {
        lessonId: typeof body.lessonId === "string" ? body.lessonId : undefined,
        completed: Boolean(body.completed),
        clientUpdatedAt: Date.now(),
      });
    } else {
      record = await getLectureProgress(key);
    }
    return NextResponse.json({ success: true, progress: summary(record) });
  } catch (error) {
    console.error("Admin LECTURE progress request failed:", error);
    return NextResponse.json({ success: false, error: "LECTURE 진도 정보를 처리하지 못했습니다." }, { status: 500 });
  }
}
