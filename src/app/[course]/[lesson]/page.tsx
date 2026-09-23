import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LessonBody } from "@/components/LessonBody";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonActionButtons } from "@/components/LessonActionButtons";
import { LessonStepNavigation } from "@/components/LessonStepNavigation";
import { LessonPaywall } from "@/components/LessonPaywall";
import { T } from "@/components/LanguageProvider";
import { canonicalLessonId, getAllLessonParams, getCourse, getLesson, getLessonContext, getLdEnglishScript, getMenTranslationsForLesson, getVocaDictionaryForWords, isFreePreviewLessonServer } from "@/lib/content";
import { isStudentOnlyPlan } from "@/lib/license";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";
import { tabForCourse } from "@/lib/tabs";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import type { Block, ReadingSentence } from "@/lib/types";
import type { VoiceGender } from "@/lib/speech";

export function generateStaticParams() {
  return getAllLessonParams().filter((item) => item.course !== "student");
}

/**
 * RE-016: unknown params must be rejected BEFORE this page, not by it.
 *
 * An unknown lesson that reaches this page calls `notFound()` mid-render, and
 * Next answers 404 with an EMPTY shell — `<div hidden></div>` plus the flight
 * payload. The not-found content exists only inside the script tags, so a
 * visitor sees a blank page until React runs, and a crawler or a JS-disabled
 * client sees a blank page forever.
 *
 * `dynamicParams = false` DOES NOT PREVENT THAT HERE. Next only enforces it for
 * a route it has prerendered as a whole, and this one never was: locked lessons
 * read the licence cookie (and, since SEC-05, the root layout reads the request
 * headers on every page). `src/proxy.ts` is what rejects an unknown
 * `/<course>/<id>`, from a list of the lesson files on disk. The export is kept
 * for the day the route is prerendered again.
 */
export const dynamicParams = false;

/**
 * The banner that represents each course in a share card. Mirrors the map on
 * the course landing page so a shared lesson looks like its section.
 *
 * SEO-01: these are the 1000×525 landscape crops in `public/images/og/`. The
 * portrait section photos (1000×1250) used to be declared as 1200×630.
 */
const COURSE_OG_IMAGE: Record<string, string> = {
  phonics: "/images/og/voca.jpg",
  grammar1: "/images/og/grammar1.jpg",
  grammar2: "/images/og/grammar2.jpg",
  ld: "/images/og/ld.jpg",
  reading: "/images/og/reading.jpg",
  cnn: "/images/og/cnn.jpg",
  student: "/images/og/students.jpg",
  chinese: "/images/og/chinese.jpg",
};
const OG_WIDTH = 1000;
const OG_HEIGHT = 525;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ course: string; lesson: string }>;
}): Promise<Metadata> {
  const { course, lesson: id } = await params;
  const lesson = getLesson(course, id);
  if (!lesson) return { title: "K-IG 교육" };
  const pres = formatLessonPresentation(course, lesson);
  // RE-011: every lesson declares its OWN canonical URL, so each page is indexed
  // on its own instead of being collapsed into the home page by the root
  // layout's former global canonical. SEO-01: a script page (`-1` / `-2`)
  // points at its main page, which renders the same lesson.
  const canonical = `/${course}/${canonicalLessonId(course, id)}`;
  const title = pres.title;
  const description = lesson.menuLabel
    ? `${lesson.menuLabel} — ${pres.title}. K-IG 핵심 어학 과정.`
    : `${pres.title}. K-IG 핵심 어학 과정.`;
  const image = COURSE_OG_IMAGE[course] || "/images/og/students.jpg";
  // RE-008: a locked lesson renders the paywall shell — 270 characters of
  // navigation and an upsell, the same on 1,713 URLs except for the title. Left
  // indexable, those pages are what a crawler mostly sees of this site, and
  // near-duplicate thin pages drag down the ones that do have content.
  //
  // `follow` stays true: the links on the paywall are still worth walking.
  // A free lesson gets NO `robots` key at all, which is what keeps it
  // indexable — the preview is the point of the preview. Nothing sets `robots`
  // globally, so the key is either here or absent, never inherited.
  const isFree = isFreePreviewLessonServer(course, id);
  return {
    title,
    description,
    alternates: { canonical },
    ...(isFree ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "article",
      title,
      description,
      url: canonical,
      images: [{ url: image, width: OG_WIDTH, height: OG_HEIGHT, alt: pres.title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
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
  const prevPresentation = prev ? formatLessonPresentation(course, prev) : null;
  const nextPresentation = next ? formatLessonPresentation(course, next) : null;

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

  // KIG-001: access control has to happen here, on the server, before any lesson
  // body is assembled. LessonClientGate only hid the body visually — every block,
  // script and vocabulary entry was still serialized into the RSC payload, so a
  // locked lesson could be read straight out of the HTML without a license.
  //
  // This runs before menTranslations / vocaDictionary / fallbackSentences are
  // computed so none of them can leak into the payload of a denied request.
  // `student/[lesson]/page.tsx` gates its own route and only calls this component
  // once access is granted, so the re-check below is a no-op for STUDENT.
  const isFree = isFreePreviewLessonServer(course, lesson.id);
  let accessAllowed = isFree;
  if (!isFree) {
    const session = await verifyLicenseSessionToken(
      (await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value,
    );
    if (session) {
      accessAllowed = isStudentOnlyPlan(session.payload.plan)
        ? course === "student" // STUDENT-only passes cover the STUDENT course alone
        : true; // 1M / 1Y / LIFE all-pass
    }
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-12">
        <nav className="mb-8 font-mono text-[11.5px]">
          <Link href={`/${course}`} className="text-ink-soft hover:text-ink">
            ← {courseInfo?.title ?? course}
          </Link>
        </nav>
        <header className="mb-6 sm:mb-8">
          <h1 className="text-[1.5rem] sm:text-[1.85rem] font-bold tracking-tight text-balance text-ink">
            {pres.title}
          </h1>
        </header>
        <LessonPaywall
          courseSlug={course}
          courseTitle={courseInfo?.title ?? tab?.label}
          lessonId={lesson.id}
          title={pres.title}
        />
      </main>
    );
  }

  const ldEnglishScript = course === "ld"
    ? getLdEnglishScript(id) ?? (pair ? getLdEnglishScript(pair.id) : null)
    : null;

  // Ultra-fast payload minimization: Extract ONLY the needed translations for this lesson (saving 120KB+ JSON payload per page)
  let menTranslations: Record<string, string> | null = null;
  if (["man", "adults-m", "adults-w", "woman"].includes(course)) {
    const texts: string[] = [];
    for (const b of lesson.blocks) {
      if (b.type === "sentences" && Array.isArray(b.items)) {
        for (const item of b.items) {
          if (item.text) texts.push(item.text);
        }
      } else if (b.type === "paragraph" && b.text) {
        texts.push(b.text);
      }
    }
    if (pairLesson?.blocks) {
      for (const b of pairLesson.blocks) {
        if (b.type === "sentences" && Array.isArray(b.items)) {
          for (const item of b.items) {
            if (item.text) texts.push(item.text);
          }
        } else if (b.type === "paragraph" && b.text) {
          texts.push(b.text);
        }
      }
    }
    menTranslations = getMenTranslationsForLesson(texts);
  }

  // Ultra-fast payload minimization: Phonics only extracts words for this lesson; Reading has pre-baked keywords (saving 290KB+ JSON payload per page)
  let vocaDictionary: Record<string, { meaning: string; searchWord?: string }> | null = null;
  if (course === "phonics") {
    const wordgrid = lesson.blocks.find((b) => b.type === "wordgrid") as { type: "wordgrid"; rows: string[][] } | undefined;
    const words = wordgrid?.rows?.flat().map((w) => w?.trim()).filter(Boolean) as string[] || [];
    vocaDictionary = getVocaDictionaryForWords(words);
  }

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
    lesson.readingSentences ?? pairLesson?.readingSentences,
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-12">
      <nav className="mb-6 flex flex-col gap-3 sm:mb-8" aria-label="강의 이동">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={`/${course}`}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-line bg-raised px-3.5 font-mono text-[11.5px] font-semibold text-ink-soft shadow-2xs hover:border-line-strong hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>{courseInfo?.title ?? course} 목록</span>
          </Link>
          <LessonActionButtons
            course={course}
            lessonId={lesson.id}
            title={pres.title}
            courseTitle={courseInfo?.title ?? tab?.label}
          />
        </div>

        {(prev || next) && (
          <div
            className={`grid gap-2 rounded-2xl border border-line bg-raised/70 p-2 shadow-2xs ${
              prev && next ? "grid-cols-2" : "grid-cols-1"
            }`}
          >
            {prev && prevPresentation ? (
              <Link
                href={`/${course}/${prev.id}`}
                scroll={true}
                aria-label={`이전 강의: ${prevPresentation.title}`}
                className="group flex min-h-14 min-w-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-sunken"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[15px] text-ink-soft group-hover:border-line-strong group-hover:text-ink" aria-hidden>
                  ←
                </span>
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] font-bold tracking-wider text-ink-faint">이전 강의</span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-ink sm:text-[13px]">
                    {prevPresentation.title}
                  </span>
                </span>
              </Link>
            ) : null}

            {next && nextPresentation ? (
              <Link
                href={`/${course}/${next.id}`}
                scroll={true}
                aria-label={`다음 강의: ${nextPresentation.title}`}
                className="group flex min-h-14 min-w-0 items-center justify-end gap-3 rounded-xl px-3 py-2.5 text-right hover:bg-sunken"
              >
                <span className="min-w-0">
                  <span className="block font-mono text-[10px] font-bold tracking-wider text-ink-faint">다음 강의</span>
                  <span className="mt-0.5 block truncate text-[12px] font-semibold text-ink sm:text-[13px]">
                    {nextPresentation.title}
                  </span>
                </span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-[15px] text-ink-soft group-hover:border-line-strong group-hover:text-ink" aria-hidden>
                  →
                </span>
              </Link>
            ) : null}
          </div>
        )}
      </nav>

      <header className="mb-6 sm:mb-8" style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}>
        <h1 className="text-[1.5rem] sm:text-[1.85rem] leading-snug font-bold tracking-tight text-balance text-ink">
          {pres.title}
        </h1>
      </header>

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
            label="전체 듣기"
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
          readingSentences={lesson.readingSentences ?? pairLesson?.readingSentences ?? null}
          readingVocabulary={lesson.readingVocabulary ?? pairLesson?.readingVocabulary ?? null}
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

      <LessonStepNavigation courseHref={`/${course}`} />
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
  readingSentences?: ReadingSentence[] | null,
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

  // READING passages are already restored as canonical 1:1 sentence pairs.
  // Using only the first legacy instruction block made the top player show
  // 1/1 and stop after a fragment even when the passage contained 5-10 lines.
  if (course === "reading" && readingSentences?.length) {
    return readingSentences.map((sentence) => cleanText(sentence.english)).filter(Boolean);
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
    if (pairSent?.items?.[0]?.text) {
      const mainIsEn = Boolean(mainSent?.items?.[0]?.text && isEnglishText(mainSent.items[0].text));
      const pairIsEn = isEnglishText(pairSent.items[0].text);
      if (!mainIsEn && pairIsEn) {
        targetBlocks = pairBlocks!;
      } else if (mainIsEn) {
        targetBlocks = blocks;
      }
    }
  }

  // 1. Sentences blocks — every one, in order. Only the first used to be read, so a lesson whose
  // items sit in two blocks (gh1-015: #1–#23 + #24–#43) played 23 of its 43 answers; 24 GRAMMAR
  // pages were split like this (6-1347). The step views already flatten the blocks.
  const sentItems = targetBlocks
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items?: { text: string }[] }).items || []);
  if (sentItems.length > 0) {
    return sentItems.map((it) => cleanText(it.text)).filter(Boolean);
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

  // Legacy speaking/listening courses store their full narration as a run of
  // instruction/hints blocks. When the historical MP3 is unavailable, feed
  // every English-bearing line to Ava instead of leaving the player silent.
  const legacyNarration = targetBlocks
    .filter((block) => block.type === "instruction" || block.type === "hints")
    .map((block) => cleanText(block.text))
    .filter((text) => /[A-Za-z\u3131-\u318e\u3400-\u9fff\uac00-\ud7a3]/u.test(text));
  if (legacyNarration.length > 0) return legacyNarration;

  // 4. Any paragraphs
  const allParas = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[];
  if (allParas.length > 0) {
    return allParas.map((p) => cleanText(p.text)).filter(Boolean);
  }

  return [];
}

