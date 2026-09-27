import { NextResponse } from "next/server";
import { verifyAdminSession } from "@/lib/adminAuth";
import { validateLicenseKey } from "@/lib/serverLicense";
import { normalizeLicenseKey } from "@/lib/license";
import {
  getPassoffProgress,
  passoffProgressSnapshot,
  passoffTopics,
  resetPassoffProgress,
  setPassoffTopic,
} from "@/lib/passoffProgress";
import type { PassoffProgressRecord } from "@/lib/passoffUnlock";

/**
 * /admin/license — one licence's PASS-OFF GRAMMAR progress: look (action "get"), open topics up to one by hand
 * ("setTopic" with `topic` — STUDENT's setChapter; only upward) or reset ("reset"). Done the way
 * /api/admin/student-progress does STUDENT's; that route and its screen are not touched.
 */
function summary(record: PassoffProgressRecord, everyTopicOpen: boolean) {
  const snapshot = passoffProgressSnapshot(record, { everyTopicOpen });
  const finished = Object.entries(record.lessons)
    .filter(([, state]) => state.completed)
    .sort((a, b) => b[1].updatedAt - a[1].updatedAt);
  return {
    everyTopicOpen,
    unlockedThrough: snapshot.unlockedThrough,
    completedLessons: finished.length,
    totalLessons: snapshot.topics.reduce((sum, topic) => sum + topic.lessonIds.length, 0),
    lastLessonId: finished[0]?.[0],
    lastLessonDay: finished[0]?.[1].day ?? undefined,
    updatedAt: record.updatedAt,
    mapRefillRequired: snapshot.mapRefillRequired,
    topics: snapshot.topics.map((topic) => ({
      topic: topic.topic,
      label: topic.label,
      lessonCount: topic.lessonIds.length,
      completedCount: topic.completedCount,
      requiredCount: topic.requiredCount,
      lastLessonCompleted: topic.lastLessonCompleted,
      mapRefilled: topic.mapRefilled,
      complete: topic.complete,
      unlocked: topic.unlocked,
    })),
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
    const key = normalizeLicenseKey(typeof body.key === "string" ? body.key : "");
    const checked = validateLicenseKey(key);
    if (!checked.valid) {
      return NextResponse.json(
        { success: false, error: "유효한 이용권 번호가 아닙니다." },
        { status: 400 },
      );
    }
    // the lesson route's and the progress API's own rule: a LIFE pass opens every topic
    const everyTopicOpen = checked.plan === "LIFE";

    let record: PassoffProgressRecord;
    if (body.action === "reset") {
      record = await resetPassoffProgress(key);
    } else if (body.action === "setTopic") {
      const topic = Number(body.topic);
      if (!passoffTopics().some((item) => item.topic === topic)) {
        return NextResponse.json(
          { success: false, error: "과정 목록에 없는 TOPIC 입니다." },
          { status: 400 },
        );
      }
      record = await setPassoffTopic(key, topic);
    } else {
      record = await getPassoffProgress(key);
    }
    return NextResponse.json({ success: true, progress: summary(record, everyTopicOpen) });
  } catch (error) {
    console.error("Admin PASS-OFF GRAMMAR progress request failed:", error);
    return NextResponse.json(
      { success: false, error: "PASS-OFF GRAMMAR 진도 정보를 처리하지 못했습니다." },
      { status: 500 },
    );
  }
}
