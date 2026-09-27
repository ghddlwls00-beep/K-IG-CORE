import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { AudioPlayer } from "@/components/AudioPlayer";
import { LessonBody } from "@/components/LessonBody";
import { LessonSpeechGuard } from "@/components/LessonSpeechGuard";
import { LdLearningView } from "@/components/LdLearningView";
import { ReadingLearningView } from "@/components/ReadingLearningView";
import { GrammarLearningView } from "@/components/GrammarLearningView";
import { PhonicsLearningView } from "@/components/PhonicsLearningView";
import { StudentLearningView } from "@/components/StudentLearningView";
import { PassoffLearningView } from "@/components/PassoffLearningView";
import { VideoPlayer } from "@/components/VideoPlayer";
import { LessonActionButtons } from "@/components/LessonActionButtons";
import { LessonStepNavigation } from "@/components/LessonStepNavigation";
import { LessonEndBar } from "@/components/LessonEndBar";
import { LessonPaywall } from "@/components/LessonPaywall";
import { T } from "@/components/LanguageProvider";
import { canonicalLessonId, getAllLessonParams, getCourse, getLesson, getLessonContext, getLdEnglishScript, getMenTranslationsForLesson, getVocaDictionaryForWords, isFreePreviewLessonServer } from "@/lib/content";
import { planOpensCourse } from "@/lib/license";
import { passoffLessonBlocks } from "@/lib/passoffContent";
import { freeLessonLinks } from "@/lib/freeLessonLinks";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "@/lib/licenseSession";
import { tabForCourse } from "@/lib/tabs";
import { formatLessonPresentation } from "@/lib/curriculumPresentation";
import { extractSentencesForAudio } from "@/lib/lessonAudioText";
import { firstSlashAlternative } from "@/lib/listeningUtils";
import { vocaWordSpeech } from "@/lib/vocaSpeech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { studentFirstWordKeepsCase } from "@/lib/studentCourseText";
import { clozeAlsoFitsFor } from "@/lib/readingClozeFitsForLesson";
import type { VoiceGender } from "@/lib/speech";

export function generateStaticParams() {
  // STUDENT and PASS-OFF GRAMMAR have routes of their own (src/app/student · src/app/passoff-grammar) that gate
  // the chapter / topic order first and then render this page
  return getAllLessonParams().filter((item) => item.course !== "student" && item.course !== "passoff-grammar");
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

/** BUG-023 — courses whose view the page renders itself (see the lesson body below). */
const DIRECT_VIEW_COURSES = new Set(["ld", "reading", "grammar1", "grammar2", "phonics", "student", "passoff-grammar"]);

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
  // GRAMMAR I's banner until PASS-OFF GRAMMAR has its own (docs/pass-off-grammar/작업기록.md)
  "passoff-grammar": "/images/og/grammar1.jpg",
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
      // STUDENT passes open STUDENT and PASS-OFF GRAMMAR; 1M / 1Y / LIFE all-pass (license.ts planOpensCourse)
      accessAllowed = planOpensCourse(session.payload.plan, course);
    }
  }

  if (!accessAllowed) {
    return (
      <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
        <nav aria-label="과정으로">
          <Link
            href={`/${course}`}
            className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>{courseInfo?.title ?? course} 목록</span>
          </Link>
        </nav>
        <header className="mt-1 mb-4 sm:mb-6">
          <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">
            {pres.title}
          </h1>
        </header>
        <LessonPaywall
          courseSlug={course}
          courseTitle={courseInfo?.title ?? tab?.label}
          lessonId={lesson.id}
          freeLessons={freeLessonLinks(course)}
        />
      </main>
    );
  }

  // 설계 §7 — a PASS-OFF GRAMMAR free preview keeps its paid STUDENT sentences in a server-only
  // file; they are added here, after the gate, only for a licence that opens the course.
  const passoff = course === "passoff-grammar" ? await passoffLessonBlocks(course, lesson) : null;

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
    // how this course's items are spoken — STUDENT "He/She …" in its first form (BUG-028) ·
    // a VOCA heteronym in its card meaning under its own clip name (7-6)
    course === "student" ? firstSlashAlternative : course === "phonics" ? vocaWordSpeech : undefined,
  // said as the course view says it where the written form would be read wrongly (lessonSpeechForm): a Korean word written in
  // romanization in Korean (소유자 결정 2026-09-25) · LISTENING d169 "1 1/2" as "1 and a half"
  ).map((text) => lessonSpeechForm(`${course}/${lesson.id}`, text));

  const isGrammar = course === "grammar1" || course === "grammar2";
  const isStudent = course === "student";
  /**
   * 2026-09-27 STUDENT 학습법 · 화면 고침 (STU-U17 · STU-U10): a STUDENT neighbour is named by its chapter code and its
   * own title — 'Ch 12-1 · School Vacations (방학맞이)'. The presentation title's 'Part 1 ·' is the code's second half,
   * and alone it read like going back ('다음 강의 Part 1'). The lesson titles themselves are unchanged.
   */
  const neighbour = (id: string, p: ReturnType<typeof formatLessonPresentation>) =>
    isStudent
      ? { href: `/${course}/${id}`, title: p.title.replace(/^Part \d+ · /, ""), code: p.code }
      : { href: `/${course}/${id}`, title: p.title };

  // Unified Audio Player with native TTS fallback & gender profile
  const topPlayers =
    topLevelAudio.length > 0
      ? topLevelAudio.map((a) => (
          <AudioPlayer
            key={a.src}
            src={a.src}
            fallbackSentences={fallbackSentences}
            lang={courseInfo?.contentLang ?? "en"}
            gender={voiceGender}
            label={a.label && topLevelAudio.length > 1 ? a.label : undefined}
          />
        ))
      : fallbackSentences.length > 0 && !["man", "woman", "student", "chinese", "passoff-grammar"].includes(course)
        ? [
            <AudioPlayer
              key="fallback"
              fallbackSentences={fallbackSentences}
              lang={courseInfo?.contentLang ?? "en"}
              gender={voiceGender}
              label="전체 듣기"
            />,
          ]
        : null;

  /**
   * 2026-09-27 (계획 A10 · D01 나 — VOCA): the top player again, as data, for the course view that plays the whole lesson at the
   * head of its Step 1 word list. Same src, sentences, voice and label as `topPlayers` above — nothing spoken changes. The view
   * marks itself data-owns-passage-player and globals.css then hides the wrapper below (data-passage-player). Other courses: null.
   * LISTENING · READING get the same data (2026-09-27, their 학습법 · 화면 차례) — a view that does not mark itself changes nothing.
   */
  const passagePlayers =
    (course === "phonics" || course === "ld" || course === "reading") && topPlayers
      ? topLevelAudio.length > 0
        ? topLevelAudio.map((a) => ({
            id: a.src,
            src: a.src,
            fallbackSentences,
            lang: courseInfo?.contentLang ?? "en",
            gender: voiceGender,
            label: a.label && topLevelAudio.length > 1 ? a.label : undefined,
          }))
        : [{ id: "fallback", src: undefined, fallbackSentences, lang: courseInfo?.contentLang ?? "en", gender: voiceGender, label: "전체 듣기" }]
      : null;

  return (
    <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
      {/*
        2026-09-27 (docs/디자인-규칙.md §6 · 점검 FRAME-U01): one title row — back to the list,
        the title, the bookmark. The previous/next cards and the completion toggle moved to the end
        of the lesson (LessonEndBar), so on a 390×844 phone the course view starts near the top of
        the first screen instead of 460–615px down.
      */}
      <nav className="flex items-center justify-between gap-2" aria-label="과정으로">
        <Link
          href={`/${course}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
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
      </nav>

      <header className="mt-1 mb-4 sm:mb-6">
        <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold tracking-tight text-balance text-ink">
          {pres.title}
        </h1>
        {/*
          2026-09-27 GRM-U22 · GRM-L10 (1차): GRAMMAR only — the stage line under the title, which also
          carries the owner's era notes (gh1-116~123 '2002년 뉴스 방송 기반 문장', gh2-044 '1996년 미국 대선
          무렵 뉴스'). They were only in the subtitle, which no lesson screen drew.
        */}
        {/* GRAMMAR II's subtitle is the English label 'English Model Pattern' (디자인 규칙 §1-7) — only its era note shows */}
        {(() => {
          if (!isGrammar || !pres.subtitle) return null;
          const line = course === "grammar2" ? (pres.subtitle.split(" · ").slice(1).join(" · ") || null) : pres.subtitle;
          return line ? <p className="mt-1 text-label text-ink-soft">{line}</p> : null;
        })()}
        {/*
          2026-09-27 STU-U04 (STUDENT only): the chapter, one quiet line under the title — the STUDENT view no longer
          repeats the title, an icon and a general description in a box of its own above the steps.
        */}
        {isStudent && pres.subtitle ? <p className="mt-0.5 text-caption text-ink-faint">{pres.subtitle}</p> : null}
      </header>

      {video.length > 0 ? (
        <div className="mb-8 flex flex-col gap-2.5">
          {video.map((v) => (
            <VideoPlayer key={v.src} src={v.src} />
          ))}
        </div>
      ) : null}

      {/*
        2026-09-27 GRM-L03 ④: in GRAMMAR the top player reads every ENGLISH ANSWER of the lesson, so it
        waits folded under an honest name — the learner opens it after trying, not before. Other
        courses render exactly as before.
      */}
      {topPlayers ? (
        isGrammar ? (
          <details className="group mb-5" data-answer-player>
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-control border border-line bg-raised px-4 text-label font-medium text-ink transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
              <span>정답 문장 전체 듣기</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-ink-soft transition-transform group-open:rotate-180">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </summary>
            <div className="mt-2 flex flex-col gap-2">{topPlayers}</div>
          </details>
        ) : (
          // data-passage-player (2026-09-27 A10): hidden when the course view plays the same lesson itself (globals.css)
          <div className={topLevelAudio.length > 0 ? "mb-5 flex flex-col gap-2" : "mb-5"} data-passage-player="">
            {topPlayers}
          </div>
        )
      ) : null}

      {/* Educational Body with Aligned Sentences */}
      {lesson.blocks.length > 0 && DIRECT_VIEW_COURSES.has(course) ? (
        /*
         * BUG-023 — the course view is rendered HERE, on the server, instead of by
         * LessonBody's next/dynamic. That dynamic import made React stream a loading
         * skeleton first and the lesson a moment later, swapped in by an inline
         * script ($RC) near the end of the HTML — which on a 4G phone could not run
         * until the page's JavaScript had finished executing, so the largest text
         * appeared 1.5~3 s after the first paint. A client component referenced by
         * the server page is still code-split: the browser loads only this course's
         * view. Same props as LessonBody passed.
         */
        <LessonSpeechGuard>
          {course === "ld" ? (
            <LdLearningView
              blocks={lesson.blocks}
              pairBlocks={pairLesson?.blocks ?? null}
              lessonKey={`${course}/${lesson.id}`}
              isScript={isScript}
              audioTracks={audio}
              ldEnglishScript={ldEnglishScript}
              passagePlayers={passagePlayers}
            />
          ) : course === "reading" ? (
            <ReadingLearningView
              blocks={lesson.blocks}
              pairBlocks={pairLesson?.blocks ?? null}
              lessonKey={`${course}/${lesson.id}`}
              isScript={isScript}
              audioTracks={audio}
              vocaDictionary={vocaDictionary}
              readingSentences={lesson.readingSentences ?? pairLesson?.readingSentences ?? null}
              readingVocabulary={lesson.readingVocabulary ?? pairLesson?.readingVocabulary ?? null}
              passagePlayers={passagePlayers}
              clozeAlsoFits={clozeAlsoFitsFor(
                (lesson.readingSentences ?? pairLesson?.readingSentences ?? []).map((s) => s.english),
                (lesson.readingVocabulary ?? pairLesson?.readingVocabulary ?? []).map((v) => v.word),
              )}
            />
          ) : course === "grammar1" || course === "grammar2" ? (
            <GrammarLearningView
              blocks={lesson.blocks}
              pairBlocks={pairLesson?.blocks ?? null}
              course={course}
              lessonKey={`${course}/${lesson.id}`}
              isScript={isScript}
              audioTracks={audio}
            />
          ) : course === "phonics" ? (
            // key: a new lesson is a new view (its rounds, cards and game start from that lesson's own record)
            <PhonicsLearningView
              key={`${course}/${lesson.id}`}
              blocks={lesson.blocks}
              lessonKey={`${course}/${lesson.id}`}
              vocaDictionary={vocaDictionary}
              passagePlayers={passagePlayers}
            />
          ) : course === "passoff-grammar" ? (
            // its own branch on purpose: the final else below is STUDENT's view. Only the blocks the view
            // draws (passoffLessonBlocks) — never the whole lesson, which would put every answer in the HTML.
            // Keyed by lesson: a new lesson starts the five steps fresh, never with the last lesson's answers.
            <PassoffLearningView
              key={`${course}/${lesson.id}`}
              blocks={passoff?.blocks ?? []}
              lessonKey={`${course}/${lesson.id}`}
              lockedExtraCount={passoff?.lockedExtraCount ?? 0}
              subtitle={"subtitle" in lesson && typeof lesson.subtitle === "string" ? lesson.subtitle : null}
            />
          ) : (
            // key: a new lesson is a new view — nothing of the last lesson's steps, tiles or reveals carries over
            <StudentLearningView
              key={`${course}/${lesson.id}`}
              blocks={lesson.blocks}
              lessonKey={`${course}/${lesson.id}`}
              audioTracks={audio}
              firstWordKeepsCase={studentFirstWordKeepsCase(lesson.blocks)}
              next={next && nextPresentation ? { id: next.id, ...neighbour(next.id, nextPresentation), code: nextPresentation.code } : null}
            />
          )}
        </LessonSpeechGuard>
      ) : lesson.blocks.length > 0 ? (
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
      <LessonEndBar
        course={course}
        lessonId={lesson.id}
        prev={prev && prevPresentation ? neighbour(prev.id, prevPresentation) : null}
        next={next && nextPresentation ? neighbour(next.id, nextPresentation) : null}
      />
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

