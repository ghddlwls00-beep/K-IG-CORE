import { NextResponse } from "next/server";
import { getCourseGroups, getLesson } from "@/lib/content";
import { FREE_PREVIEW_LESSON_IDS } from "@/lib/license";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { getStudentProgress } from "@/lib/studentProgress";

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
    if (!Number.isInteger(chapter) || chapter < 1 || chapter > 20) {
      return json({ success: false, error: "올바른 챕터 번호가 필요합니다." }, 400);
    }

    const groups = getCourseGroups("student");
    const group = groups[chapter - 1];
    if (!group) {
      return json({ success: false, error: "챕터를 찾을 수 없습니다." }, 404);
    }

    const session = await verifyLicenseSession(request);
    let allowedLessonIds: string[];
    let access: "free" | "licensed";

    if (!session) {
      if (chapter !== 1) {
        return json(
          { success: false, error: "이 챕터는 이용권 등록 후 들을 수 있습니다." },
          401,
        );
      }
      const freeIds = new Set(FREE_PREVIEW_LESSON_IDS.student || []);
      allowedLessonIds = group.lessons.filter((id) => freeIds.has(id));
      access = "free";
    } else {
      if (session.payload.plan !== "LIFE") {
        const progress = await getStudentProgress(session.payload.key);
        if (chapter > progress.unlockedThrough) {
          return json(
            { success: false, error: "이전 챕터를 완료하면 전체 듣기가 열립니다." },
            403,
          );
        }
      }
      allowedLessonIds = group.lessons;
      access = "licensed";
    }

    const parts = allowedLessonIds.flatMap((lessonId, partIndex) => {
      const lesson = getLesson("student", lessonId);
      if (!lesson) return [];
      const sentences = lesson.blocks.flatMap((block) =>
        block.type === "sentences"
          ? block.items.map((item) => item.text.trim()).filter(Boolean)
          : [],
      );
      if (sentences.length === 0) return [];
      return [{
        lessonId,
        title: lesson.title,
        partNumber: partIndex + 1,
        sentenceCount: sentences.length,
        sentences,
      }];
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
    console.error("STUDENT chapter audio failed:", error);
    return json(
      { success: false, error: "챕터 음성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      500,
    );
  }
}
