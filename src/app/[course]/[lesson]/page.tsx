import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LessonBody } from "@/components/LessonBody";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonActionButtons } from "@/components/LessonActionButtons";
import { LessonClientGate } from "@/components/LessonClientGate";
import { T } from "@/components/LanguageProvider";
import { getAllLessonParams, getCourse, getLesson, getLessonContext, getLdEnglishScript, getMenTranslations, getVocaDictionary, isFreePreviewLessonServer } from "@/lib/content";
import { tabForCourse } from "@/lib/tabs";
import { lessonDisplay } from "@/lib/courses";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import type { Block } from "@/lib/types";
import type { VoiceGender } from "@/lib/speech";

export function generateStaticParams() {
  return getAllLessonParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}): Promise<Metadata> {
  const { course, lesson: id } = await params;
  const lesson = getLesson(course, id);
  if (!lesson) return { title: "K-IG 교육" };
  const pres = formatLessonPresentation(course, lesson);
  return { title: pres.title };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}) {
  const { course, lesson: id } = await params;
  const lesson = getLesson(course, id);
  if (!lesson) notFound();

  const { prev, next, pair } = getLessonContext(course, id);
  const pairLesson = pair ? getLesson(course, pair.id) : null;
  const courseInfo = getCourse(course);
  const tab = tabForCourse(course);
  const isScript = lesson.variant === "script";
  const pres = formatLessonPresentation(course, lesson);

  // For Grammar 1, odd-numbered answer pages (gh1-007, gh1-009, etc.) are consolidated into their primary unified lesson (gh1-006, gh1-008, etc.)
  if (course === "grammar1") {
    const m = id.match(/^gh1-(\d+)/);
    if (m) {
      const num = parseInt(m[1], 10);
      if (num % 2 !== 0 && pairLesson) {
        redirect(`/${course}/${pairLesson.id}`);
      }
    }
  }
  const ldEnglishScript = course === "ld" ? getLdEnglishScript(id) : null;
  const menTranslations = ["man", "adults-m", "adults-w", "woman"].includes(course)
    ? getMenTranslations()
    : null;
  const vocaDictionary = course === "phonics" ? getVocaDictionary() : null;

  // Determine voice profile: Male for MEN tracks, Female for WOMEN tracks
  const voiceGender = getVoiceGender(course, id);

  // Defensive: collapse duplicate audio by src
  const audio = lesson.audio.filter((a, i, all) => all.findIndex((x) => x.src === a.src) === i);
  const video = lesson.video ?? [];
  const fromFlash = lesson.blocks.length === 0 && audio.length > 0;

  // Determine top-level audio player(s):
  // 1. Grammar 1: Consolidated lessons contained both Korean questions (even) and English native answers (odd).
  //    Select ONLY the English native recording (exactly like Grammar 2 has 1 single English audio player).
  // 2. Middle: Deduplicate multiple tracks (e.g. p101.mp3 and alternate p0101.mp3) to 1 primary track.
  // 3. Dialogue / Clip courses (man, woman, student, chinese):
  //    Individual short sentence clips are passed to the interactive LessonBody (DialogueLearningView, etc.).
  //    Suppress stacking 5~11 redundant AudioPlayer bars at the top of the page.
  let topLevelAudio = audio;
  if (course === "grammar1") {
    const englishAudio =
      audio.find((a) => {
        const m = a.src.match(/gh1-(\d+)/);
        return m ? parseInt(m[1], 10) % 2 !== 0 : false;
      }) || audio[audio.length - 1];
    topLevelAudio = englishAudio ? [englishAudio] : [];
  } else if (course === "middle" && topLevelAudio.length > 1) {
    topLevelAudio = [topLevelAudio[0]];
  } else if (["man", "woman", "student", "chinese"].includes(course) && topLevelAudio.length > 1) {
    topLevelAudio = [];
  }

  // Extract fallback sentences for TTS reading (prioritizes English target text)
  const fallbackSentences = extractSentencesForAudio(
    lesson.blocks,
    pairLesson?.blocks,
    isScript,
    course,
    ldEnglishScript,
  );

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <nav className="mb-8 flex flex-wrap items-center justify-between gap-4 font-mono text-[11.5px]">
        <Link href={`/${course}`} className="link-underline text-ink-soft hover:text-ink font-medium">
          ← {courseInfo?.title ?? course}
        </Link>
        <div className="flex flex-wrap items-center gap-4">
          <LessonActionButtons
            course={course}
            lessonId={lesson.id}
            title={pres.title}
            courseTitle={courseInfo?.title ?? tab?.label}
          />
          <span className="flex items-center gap-3 border-l border-line/60 pl-3">
            {prev ? (
              <Link
                href={`/${course}/${prev.id}`}
                className="text-ink-soft transition-transform duration-200 ease-out hover:-translate-x-0.5 hover:text-ink"
              >
                ← {prev.id}
              </Link>
            ) : null}
            {next ? (
              <Link
                href={`/${course}/${next.id}`}
                className="text-ink-soft transition-transform duration-200 ease-out hover:translate-x-0.5 hover:text-ink"
              >
                {next.id} →
              </Link>
            ) : null}
          </span>
        </div>
      </nav>

      <header className="mb-8" style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}>
        <div className="mb-3 flex flex-wrap items-center gap-2.5 font-mono text-[11px] tracking-wide text-ink-faint">
          <span className="uppercase font-semibold tracking-wider text-ink-soft">{tab?.label}</span>
          <span aria-hidden>·</span>
          <span className="font-mono font-semibold text-primary">{pres.code}</span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">{lesson.id}</span>
          {pres.badge && (
            <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
              {pres.badge}
            </span>
          )}
          {isScript ? (
            <span className="border border-line px-1.5 py-0.5 tracking-wide uppercase bg-raised rounded-xs">
              <T k="lesson.koreanScript" />
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.85rem] leading-snug font-bold tracking-tight text-balance text-ink">
            {pres.title}
          </h1>
          {pres.subtitle && (
            <p className="text-[14px] font-medium text-ink-soft">
              {pres.subtitle}
            </p>
          )}
        </div>
      </header>

      <LessonClientGate
        courseSlug={course}
        courseTitle={courseInfo?.title ?? tab?.label}
        lessonId={lesson.id}
        lessonTitle={pres.title}
        isFreePreview={isFreePreviewLessonServer(course, lesson.id)}
      >
        {video.length > 0 ? (
          <div className="mb-8 flex flex-col gap-2.5">
            {video.map((v) => (
              <VideoPlayer key={v.src} src={v.src} />
            ))}
          </div>
        ) : null}

        {/* Unified Audio Player with native TTS fallback & gender profile */}
        {topLevelAudio.length > 0 ? (
          <div className="mb-8 flex flex-col gap-2.5">
            {topLevelAudio.map((a) => (
              <AudioPlayer
                key={a.src}
                src={a.src}
                fallbackSentences={fallbackSentences}
                lang={courseInfo?.contentLang ?? "en"}
                gender={voiceGender}
                label={a.label && topLevelAudio.length > 1 ? a.label : undefined}
              />
            ))}
          </div>
        ) : fallbackSentences.length > 0 && !["man", "woman", "student", "chinese"].includes(course) ? (
          <div className="mb-8">
            <AudioPlayer
              fallbackSentences={fallbackSentences}
              lang={courseInfo?.contentLang ?? "en"}
              gender={voiceGender}
              label="전체 듣기 (AI 음성 재생)"
            />
          </div>
        ) : null}

        {/* Educational Body with Aligned Sentences */}
        {lesson.blocks.length > 0 ? (
          <LessonBody
            blocks={lesson.blocks}
            pairBlocks={pairLesson?.blocks ?? null}
            course={course}
            lessonKey={`${course}/${lesson.id}`}
            isScript={isScript}
            contentLang={courseInfo?.contentLang ?? "en"}
            voiceGender={voiceGender}
            audioTracks={audio}
            chunkDrills={lesson.chunkDrills}
            ldEnglishScript={ldEnglishScript}
            menTranslations={menTranslations}
            vocaDictionary={vocaDictionary}
          />
        ) : fromFlash ? (
          <p className="text-[13.5px] text-ink-soft">
            <T
              k={audio.length === 1 ? "lesson.trackRecovered" : "lesson.tracksRecovered"}
              count={audio.length}
            />
          </p>
        ) : (
          <p className="border border-dashed border-line px-4 py-6 text-[13.5px] text-ink-soft rounded">
            <T k="lesson.notMigrated" />
          </p>
        )}
      </LessonClientGate>

      <footer className="mt-20 border-t border-line pt-4">
        <p className="font-mono text-[10.5px] text-ink-faint">
          <T k="lesson.source" />: {lesson.legacyPath} · {lesson.legacyEncoding}
        </p>
      </footer>
    </main>
  );
}

function getVoiceGender(course: string, lessonId: string): VoiceGender {
  if (course === "man" || course === "middle" || course === "adults-m") return "male";
  if (course === "woman" || course === "adults-w") return "female";
  if (course === "adults") {
    if (lessonId.startsWith("am")) return "male";
    if (lessonId.startsWith("aw")) return "female";
    return "female";
  }
  return "neutral";
}


function isEnglishText(text: string): boolean {
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin > hangul;
}

function cleanText(text: string): string {
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function extractSentencesForAudio(
  blocks: Block[],
  pairBlocks: Block[] | null | undefined,
  isScript: boolean,
  course: string,
  ldEnglishScript?: { n: string; ko: string; en: string }[] | null,
): string[] {
  let targetBlocks = isScript && pairBlocks && pairBlocks.length > 0 ? pairBlocks : blocks;

  // LD course: prioritize actual model English script
  if (course === "ld") {
    if (ldEnglishScript && ldEnglishScript.length > 0) {
      const enList = ldEnglishScript.map((s) => cleanText(s.en)).filter(Boolean);
      if (enList.length > 0) return enList;
    }
    const hints = targetBlocks.find((b) => b.type === "hints") as { type: "hints"; text: string } | undefined;
    if (hints?.text) {
      const hintWords = hints.text.split(/[.,]/).map((w) => cleanText(w)).filter(Boolean);
      if (hintWords.length > 0) return hintWords;
    }
  }

  // Phonics / VOCA course: extract from wordgrid
  const wordgrid = targetBlocks.find((b) => b.type === "wordgrid") as { type: "wordgrid"; rows: string[][] } | undefined;
  if (wordgrid?.rows) {
    const words = wordgrid.rows.flat().map((w) => cleanText(w)).filter(Boolean);
    if (words.length > 0) return words;
  }

  // In grammar1 (or whenever targetBlocks has Korean sentences and pairBlocks has English sentences):
  // We MUST pick the English sentences so AudioPlayer reads the English lesson!
  if (course !== "chinese") {
    const mainSent = blocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
    const pairSent = pairBlocks?.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
    if (mainSent?.items?.[0]?.text && pairSent?.items?.[0]?.text) {
      const mainIsEn = isEnglishText(mainSent.items[0].text);
      const pairIsEn = isEnglishText(pairSent.items[0].text);
      if (!mainIsEn && pairIsEn) {
        targetBlocks = pairBlocks!;
      } else if (mainIsEn) {
        targetBlocks = blocks;
      }
    }
  }

  // 1. Sentences block
  const sentBlock = targetBlocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
  if (sentBlock?.items && sentBlock.items.length > 0) {
    return sentBlock.items.map((it) => cleanText(it.text)).filter(Boolean);
  }

  // 2. Dialogue / conversation courses (man, woman, student)
  if (["man", "woman", "student"].includes(course)) {
    const paras = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const enParas = paras
      .map((p) => cleanText(p.text))
      .filter((t) => {
        if (!t) return false;
        if (t.includes("K-IG") || t.includes("<font") || t.includes("한/영") || /^Chapter\s+\d/i.test(t) || t.endsWith(":")) return false;
        if (t === "Greeting and Introduction" || t === "My Personal and Educational Background") return false;
        return isEnglishText(t);
      });
    if (enParas.length > 0) {
      return enParas;
    }
  }

  // 3. Reading passage
  if (course === "reading") {
    const inst = targetBlocks.find((b) => b.type === "instruction");
    if (inst?.text) {
      return inst.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => cleanText(s))
        .filter(Boolean);
    }
  }

  // 4. Any paragraphs
  const allParas = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[];
  if (allParas.length > 0) {
    return allParas.map((p) => cleanText(p.text)).filter(Boolean);
  }

  return [];
}

