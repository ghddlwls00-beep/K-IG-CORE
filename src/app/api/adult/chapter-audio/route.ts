import { NextResponse } from "next/server";
import { getCourseGroups, getLesson } from "@/lib/content";
import { FREE_PREVIEW_LESSON_IDS, planOpensCourse } from "@/lib/license";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { ADULT_CHAPTER_COUNT, getAdultProgress } from "@/lib/adultProgress";

/**
 * ADULT's "장 전체 듣기" on the course list (ChapterAudioBar) — STUDENT's /api/student/chapter-audio for ADULT: no licence →
 * chapter 1's free lessons only; a licence → a chapter up to the one its progress has opened (LIFE: all). The sentences
 * go out as written; the client says them as the lesson screen does (lessonSpeechForm + firstSlashAlternative).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const PRIVATE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: PRIVATE_HEADERS });
}

export async function GET(request: Request) {
  try {
    const rawChapter = new URL(request.url).searchParams.get("chapter");
    const chapter = Number(rawChapter);
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > ADULT_CHAPTER_COUNT) {
      // UI검토-1007 18 · 41번: '장' and 해요체, as the screen says it (ChapterAudioBar shows its own line, not these)
      return json({ success: false, error: "올바른 장 번호가 필요해요." }, 400);
    }

    const group = getCourseGroups("adult")[chapter - 1];
    if (!group) {
      return json({ success: false, error: "장을 찾을 수 없어요." }, 404);
    }

    const session = await verifyLicenseSession(request);
    let allowedLessonIds: string[];
    let access: "free" | "licensed";

    if (!session || !planOpensCourse(session.payload.plan, "adult")) {
      if (chapter !== 1) {
        return json({ success: false, error: "이용권을 등록하면 이 장을 들을 수 있어요." }, 401);
      }
      const freeIds = new Set(FREE_PREVIEW_LESSON_IDS.adult || []);
      allowedLessonIds = group.lessons.filter((id) => freeIds.has(id));
      access = "free";
    } else {
      if (session.payload.plan !== "LIFE") {
        const progress = await getAdultProgress(session.payload.key);
        if (chapter > progress.unlockedThrough) {
          return json({ success: false, error: "앞 장을 마치면 이 장 전체 듣기가 열려요." }, 403);
        }
      }
      allowedLessonIds = group.lessons;
      access = "licensed";
    }

    const parts = allowedLessonIds.flatMap((lessonId, partIndex) => {
      const lesson = getLesson("adult", lessonId);
      if (!lesson) return [];
      const sentences = lesson.blocks.flatMap((block) =>
        block.type === "sentences" ? block.items.map((item) => item.text.trim()).filter(Boolean) : [],
      );
      if (sentences.length === 0) return [];
      return [{ lessonId, title: lesson.title, partNumber: partIndex + 1, sentenceCount: sentences.length, sentences }];
    });

    const items = parts.flatMap((part) =>
      part.sentences.map((text, sentenceIndex) => ({
        text,
        lessonId: part.lessonId,
        lessonTitle: part.title,
        partNumber: part.partNumber,
        sentenceNumber: sentenceIndex + 1,
        sentenceTotal: part.sentenceCount,
      })),
    );

    if (items.length === 0) {
      return json({ success: false, error: "재생할 문장을 찾을 수 없습니다." }, 404);
    }

    return json({
      success: true,
      chapter,
      chapterLabel: group.label,
      access,
      partCount: parts.length,
      sentenceCount: items.length,
      items,
    });
  } catch (error) {
    console.error("ADULT chapter audio failed:", error);
    return json({ success: false, error: "이 장의 소리를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요." }, 500);
  }
}
