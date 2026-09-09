"use client";

import {
  useMemo,
  useState,
  memo,
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useProgress } from "./ProgressProvider";
import { useLicense } from "./LicenseProvider";
import { isFreePreviewLesson } from "@/lib/license";
import type { LessonPresentation } from "@/lib/curriculumPresentation";
import {
  getServerSpeechSnapshot,
  getSpeechSnapshot,
  playSentenceQueue,
  stopSpeech,
  subscribeSpeech,
  togglePauseSpeech,
  unlockMobileAudio,
} from "@/lib/speech";

export interface DashboardLessonItem {
  id: string;
  presentation: LessonPresentation;
}

export interface DashboardSection {
  label: string;
  lessons: DashboardLessonItem[];
}

type ChapterAudioSpeed = 0.85 | 1 | 1.2;

interface ChapterAudioItem {
  text: string;
  lessonId: string;
  lessonTitle: string;
  partNumber: number;
  sentenceNumber: number;
  sentenceTotal: number;
}

interface ChapterAudioPayload {
  success: true;
  chapter: number;
  chapterLabel: string;
  access: "free" | "licensed";
  partCount: number;
  sentenceCount: number;
  items: ChapterAudioItem[];
}

const DashboardLessonCard = memo(function DashboardLessonCard({
  lesson,
  courseSlug,
  isDone,
  isStarred,
  isUnlocked,
  isFree,
  hasCourseAccess,
  onToggleBookmark,
  sequentialLock,
}: {
  lesson: DashboardLessonItem;
  courseSlug: string;
  isDone: boolean;
  isStarred: boolean;
  isUnlocked: boolean;
  isFree: boolean;
  hasCourseAccess: boolean;
  onToggleBookmark: (courseSlug: string, lessonId: string) => void;
  sequentialLock: boolean;
}) {
  const pres = lesson.presentation;

  return (
    <li
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "0 130px",
      }}
    >
      <div
        className={`group relative flex h-full flex-col justify-between gap-3 rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
          isDone
            ? "border-emerald-500/30 bg-raised shadow-2xs hover:border-emerald-500/60"
            : "border-line bg-raised shadow-2xs hover:border-line-strong"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[11px] font-bold text-ink tracking-wider">
              {pres.code}
            </span>
            <div className="flex items-center gap-1.5">
              {isDone && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  ✓ 완료
                </span>
              )}
              {!isUnlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken px-2 py-0.5 font-mono text-[9.5px] font-medium text-ink-faint">
                  <span>🔒</span>
                  <span>{sequentialLock ? "이전 챕터 완료 필요" : courseSlug === "student" ? "STUDENT" : "올패스"}</span>
                </span>
              ) : !hasCourseAccess && isFree ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span>무료 보기</span>
                </span>
              ) : null}
              {pres.badge && (
                <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-medium text-ink-soft">
                  {pres.badge}
                </span>
              )}
              {/* Quick Bookmark Toggle on card */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(courseSlug, lesson.id);
                }}
                title={isStarred ? "북마크 해제" : "북마크 추가"}
                aria-label={isStarred ? "북마크 해제" : "북마크 추가"}
                className="-m-2 p-2 cursor-pointer transition-transform active:scale-90"
              >
                <span
                  className={`text-[13px] ${
                    isStarred
                      ? "text-amber-500 font-bold"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  {isStarred ? "★" : "☆"}
                </span>
              </button>
            </div>
          </div>

          <Link
            href={`/${courseSlug}/${lesson.id}`}
            scroll={true}
            className="text-[14px] font-semibold leading-snug text-ink transition-colors focus:outline-none group-hover:opacity-75"
          >
            {pres.title}
          </Link>

          {pres.subtitle && (
            <span className="text-[12px] text-ink-soft line-clamp-1">
              {pres.subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-line pt-2.5 font-mono text-[10.5px] text-ink-faint">
          <span className="tabular-nums">{lesson.id}</span>
          <Link
            href={`/${courseSlug}/${lesson.id}`}
            scroll={true}
            className="inline-flex items-center gap-1 font-medium text-ink-soft group-hover:text-ink transition-all group-hover:translate-x-0.5"
          >
            <span>
              {!isUnlocked
                ? courseSlug === "student"
                  ? sequentialLock
                    ? "해금 조건 보기"
                    : "수강권 열람"
                  : "올패스 열람"
                : isFree && !hasCourseAccess
                  ? "무료 보기"
                  : "학습하기"}
            </span>
            <span className="text-[11px] opacity-60">{!isUnlocked ? "🔒" : "→"}</span>
          </Link>
        </div>
      </div>
    </li>
  );
});

export function CourseDashboard({
  courseSlug,
  sections,
  totalLessons,
}: {
  courseSlug: string;
  sections: DashboardSection[];
  totalLessons: number;
}) {
  const { completed, bookmarks, toggleBookmark, isCompleted, isBookmarked, studentSyncStatus } = useProgress();
  const { hasActiveLicense, licenseInfo, isUnlocked: checkUnlocked, studentProgress } = useLicense();
  const hasCourseAccess =
    hasActiveLicense && (!licenseInfo?.isStudentOnly || courseSlug === "student");
  const [filter, setFilter] = useState<"all" | "bookmarked" | "incomplete">("all");
  const [unlockNotice, setUnlockNotice] = useState<number | null>(null);
  const previousUnlockedRef = useRef<number | null>(null);
  const speech = useSyncExternalStore(
    subscribeSpeech,
    getSpeechSnapshot,
    getServerSpeechSnapshot,
  );
  const [activeChapter, setActiveChapter] = useState<number | null>(null);
  const [activeChapterAudio, setActiveChapterAudio] = useState<ChapterAudioPayload | null>(null);
  const [chapterAudioCache, setChapterAudioCache] = useState<Record<number, ChapterAudioPayload>>({});
  const [audioLoadingChapter, setAudioLoadingChapter] = useState<number | null>(null);
  const [audioError, setAudioError] = useState<{ chapter: number; message: string } | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<ChapterAudioSpeed>(1);
  const audioRequestRef = useRef(0);

  useEffect(() => {
    if (courseSlug !== "student" || !studentProgress || licenseInfo?.plan === "LIFE") return;
    const previous = previousUnlockedRef.current;
    previousUnlockedRef.current = studentProgress.unlockedThrough;
    if (previous !== null && studentProgress.unlockedThrough > previous) {
      setUnlockNotice(studentProgress.unlockedThrough);
      const timer = window.setTimeout(() => setUnlockNotice(null), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [courseSlug, licenseInfo?.plan, studentProgress]);

  useEffect(() => {
    return () => {
      audioRequestRef.current += 1;
      stopSpeech();
    };
  }, []);

  const playChapterAudio = useCallback(
    (payload: ChapterAudioPayload, rate: ChapterAudioSpeed, startIndex = 0) => {
      setActiveChapter(payload.chapter);
      setActiveChapterAudio(payload);
      setAudioError(null);
      playSentenceQueue(
        payload.items.map((item) => item.text),
        {
          lang: "en",
          gender: "female",
          rate,
          startIndex,
          gap: 380,
          onEnd: () => {
            setActiveChapter(null);
            setActiveChapterAudio(null);
          },
          onError: () => {
            setAudioError({
              chapter: payload.chapter,
              message: "음성을 재생하지 못했습니다. 네트워크 연결을 확인해 주세요.",
            });
            setActiveChapter(null);
            setActiveChapterAudio(null);
          },
        },
      );
    },
    [],
  );

  const handleChapterAudio = useCallback(
    async (chapter: number, chapterUnlocked: boolean) => {
      if (!chapterUnlocked) return;
      unlockMobileAudio();

      if (activeChapter === chapter && speech.speaking) {
        togglePauseSpeech();
        return;
      }

      audioRequestRef.current += 1;
      stopSpeech();
      const cached = chapterAudioCache[chapter];
      if (cached) {
        playChapterAudio(cached, audioSpeed);
        return;
      }

      const requestId = audioRequestRef.current;
      setAudioLoadingChapter(chapter);
      setAudioError(null);
      try {
        const response = await fetch(`/api/student/chapter-audio?chapter=${chapter}`, {
          cache: "no-store",
          credentials: "same-origin",
        });
        const data = await response.json() as
          | ChapterAudioPayload
          | { success?: false; error?: string };
        if (requestId !== audioRequestRef.current) return;
        if (!response.ok || !data.success) {
          throw new Error(
            ("error" in data && data.error) || "챕터 음성을 불러오지 못했습니다.",
          );
        }
        setChapterAudioCache((current) => ({ ...current, [chapter]: data }));
        playChapterAudio(data, audioSpeed);
      } catch (error) {
        if (requestId !== audioRequestRef.current) return;
        setAudioError({
          chapter,
          message: error instanceof Error ? error.message : "챕터 음성을 불러오지 못했습니다.",
        });
      } finally {
        if (requestId === audioRequestRef.current) setAudioLoadingChapter(null);
      }
    },
    [activeChapter, audioSpeed, chapterAudioCache, playChapterAudio, speech.speaking],
  );

  const handleAudioSpeed = useCallback(
    (rate: ChapterAudioSpeed) => {
      setAudioSpeed(rate);
      if (!activeChapterAudio || !speech.speaking) return;
      const currentIndex = Math.max(0, speech.index);
      unlockMobileAudio();
      playChapterAudio(activeChapterAudio, rate, currentIndex);
    },
    [activeChapterAudio, playChapterAudio, speech.index, speech.speaking],
  );

  const handleStopChapterAudio = useCallback(() => {
    audioRequestRef.current += 1;
    stopSpeech();
    setAudioLoadingChapter(null);
    setActiveChapter(null);
    setActiveChapterAudio(null);
  }, []);

  const handleToggleBookmark = useCallback(
    (slug: string, id: string) => {
      toggleBookmark(slug, id);
    },
    [toggleBookmark]
  );

  // Calculate stats for this course
  const prefix = `${courseSlug}:`;
  const completedCount = useMemo(() => {
    return Object.keys(completed).filter((k) => k.startsWith(prefix) && completed[k]).length;
  }, [completed, prefix]);

  const bookmarkCount = useMemo(() => {
    return Object.keys(bookmarks).filter((k) => k.startsWith(prefix) && bookmarks[k]).length;
  }, [bookmarks, prefix]);

  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // Filter sections based on selected filter
  const filteredSections = useMemo(() => {
    return sections
      .map((sec, sectionIndex) => ({
        ...sec,
        sectionIndex,
        lessons: filter === "all" ? sec.lessons : sec.lessons.filter((l) => {
          if (filter === "bookmarked") {
            return isBookmarked(courseSlug, l.id);
          }
          if (filter === "incomplete") {
            return !isCompleted(courseSlug, l.id);
          }
          return true;
        }),
      }))
      .filter((sec) => sec.lessons.length > 0);
  }, [sections, filter, courseSlug, isBookmarked, isCompleted]);

  // Track open/collapsed state of sections. All sections start collapsed by default.
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sections.forEach((sec) => {
      initial[sec.label] = false;
    });
    return initial;
  });

  const toggleSection = (label: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  return (
    <div className="flex flex-col gap-8">
      {unlockNotice && (
        <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-raised px-5 py-4 text-center text-[14px] font-bold text-emerald-600 shadow-xl dark:text-emerald-300" role="status">
          🎉 챕터 {unlockNotice}가 열렸습니다.
        </div>
      )}
      {/* Course Progress Dashboard Card - Apple Glass / Clean Depth */}
      <div className="rounded-3xl border border-line bg-gradient-to-b from-raised to-sunken/70 p-4.5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Course Progress & Analytics
            </div>
            <h2 className="text-[17px] sm:text-[20px] font-bold text-ink tracking-tight mt-1">
              학습 진도율: <span className="text-emerald-600">{completedCount}</span> / {totalLessons}개 완료 <span className="text-ink-faint text-[14px] sm:text-[16px] font-normal">({progressPercent}%)</span>
            </h2>
            {courseSlug === "student" && hasActiveLicense && (
              <p className="mt-1 text-[11.5px] text-ink-faint" aria-live="polite">
                {studentSyncStatus === "saved" && "✓ 서버에 저장됨"}
                {studentSyncStatus === "syncing" && "진도를 서버에 저장하는 중..."}
                {studentSyncStatus === "pending" && "연결 복구 후 자동 저장 예정"}
                {studentSyncStatus === "error" && "저장 실패 · 연결되면 자동으로 다시 시도합니다"}
              </p>
            )}
          </div>

          {/* Apple-style Segmented Control Filter Pills */}
          <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center rounded-full border border-line bg-sunken p-1 text-[11.5px] sm:text-[12.5px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer font-medium text-center ${
                filter === "all"
                  ? "bg-raised text-ink font-semibold shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              전체 ({totalLessons})
            </button>
            <button
              type="button"
              onClick={() => setFilter("bookmarked")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer font-medium flex items-center justify-center gap-1 ${
                filter === "bookmarked"
                  ? "bg-raised text-amber-600 dark:text-amber-300 font-semibold shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>★</span>
              <span>북마크 ({bookmarkCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("incomplete")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer font-medium text-center ${
                filter === "incomplete"
                  ? "bg-raised text-ink font-semibold shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              미완료 ({Math.max(0, totalLessons - completedCount)})
            </button>
          </div>
        </div>

        {/* Apple-style Smooth Rounded Progress Bar */}
        <div className="w-full bg-sunken rounded-full h-2.5 overflow-hidden p-0.5">
          <div
            className="bg-gradient-to-r from-emerald-500 to-teal-500 h-full rounded-full transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="rounded-2xl border border-line bg-surface p-12 text-center flex flex-col items-center justify-center gap-3">
          <span className="text-3xl">📭</span>
          <p className="text-[15px] font-semibold text-ink">
            {filter === "bookmarked"
              ? "아직 북마크된 레슨이 없습니다."
              : "조건에 해당하는 레슨이 없습니다."}
          </p>
          <p className="text-[13px] text-ink-soft max-w-sm">
            {filter === "bookmarked"
              ? "학습 중 중요하거나 복습이 필요한 레슨에서 [☆ 북마크]를 눌러보세요."
              : "모든 레슨을 완료하셨습니다! 대단합니다!"}
          </p>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-2 rounded-xl border border-line px-4 py-2 text-[12.5px] font-semibold text-ink hover:bg-raised transition-colors cursor-pointer"
            >
              전체 레슨 목록 보기
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* Accordion List */}
          <div className="flex flex-col gap-3.5">
            {filteredSections.map((section) => {
              const sectionIndex = section.sectionIndex;
              const chapterNumber = sectionIndex + 1;
              const isOpen = openSections[section.label] ?? false;
              const completedInSection = section.lessons.filter((l) =>
                isCompleted(courseSlug, l.id),
              ).length;
              const studentChapter = courseSlug === "student"
                ? studentProgress?.chapters.find((item) => item.chapter === chapterNumber)
                : undefined;
              const chapterUnlocked = courseSlug !== "student"
                || (!hasCourseAccess
                  ? sectionIndex === 0
                  : section.lessons.some((lesson, lessonIdx) =>
                      checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx),
                    ));
              const chapterComplete = Boolean(studentChapter?.complete);
              const chapterPercent = studentChapter?.percent ?? Math.round((completedInSection / Math.max(1, section.lessons.length)) * 100);
              const chapterAudioActive = activeChapter === chapterNumber && speech.speaking;
              const chapterAudioPaused = chapterAudioActive && speech.paused;
              const chapterAudioLoading = audioLoadingChapter === chapterNumber;
              const currentAudioItem = chapterAudioActive && activeChapterAudio
                ? activeChapterAudio.items[Math.max(0, speech.index)]
                : undefined;
              const previewOnly = !hasCourseAccess && sectionIndex === 0;

              return (
                <div
                  key={`${sectionIndex}-${section.label}`}
                  id={`section-${sectionIndex}`}
                  className="rounded-3xl border border-line bg-raised shadow-2xs overflow-hidden transition-all duration-200 scroll-mt-24"
                >
                  {/* Clickable Section Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-sunken/80 transition-colors cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line font-mono text-[11px] font-bold transition-all duration-300 ${
                          isOpen ? "rotate-90 bg-ink text-surface" : "bg-sunken text-ink-soft"
                        }`}
                      >
                        ▶
                      </div>
                      <div className="min-w-0 flex-1 flex flex-col">
                        <span className="font-bold text-[16px] text-ink tracking-tight flex items-center gap-2">
                          {section.label}
                        </span>
                        <span className="font-mono text-[11.5px] text-ink-faint mt-0.5">
                          총 {section.lessons.length}개 레슨
                          {completedInSection > 0 && (
                            <span className="text-emerald-600 font-semibold ml-2">
                              · {completedInSection}개 완료
                            </span>
                          )}
                        </span>
                        {courseSlug === "student" && (
                          <span className="mt-1 text-[11px] font-medium text-ink-soft">
                            {!hasCourseAccess && sectionIndex === 0
                              ? "1·2강 무료 체험"
                              : !chapterUnlocked
                                ? `챕터 ${sectionIndex} 완료 후 해금`
                                : chapterComplete
                                  ? "✓ 챕터 완료"
                                  : `진행률 ${chapterPercent}%${studentChapter ? ` · 해금 기준 ${studentChapter.requiredCount}강 + 마지막 강의` : ""}`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {courseSlug === "student" && (
                        <span className={`inline-flex min-h-8 min-w-[72px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
                          chapterComplete
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : chapterUnlocked
                              ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                              : "bg-sunken text-ink-faint"
                        }`}>
                          {chapterComplete ? "완료" : chapterUnlocked ? "학습 가능" : "🔒 잠금"}
                        </span>
                      )}
                      <span className="rounded-full border border-line bg-sunken px-3 py-1 text-[11.5px] font-medium text-ink-soft hidden sm:inline">
                        {isOpen ? "접기 ▲" : "펼치기 ▼"}
                      </span>
                    </div>
                  </button>

                  {courseSlug === "student" && (
                    <div className="border-t border-line/70 px-4 py-3 sm:px-5">
                      <div
                        className={`flex flex-col gap-3 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between ${
                          chapterUnlocked
                            ? chapterAudioActive
                              ? "border-amber-500/40 bg-amber-500/[0.08]"
                              : "border-amber-500/25 bg-amber-500/[0.04]"
                            : "border-line bg-sunken/70 opacity-75"
                        }`}
                      >
                        <button
                          type="button"
                          disabled={!chapterUnlocked || chapterAudioLoading}
                          onClick={() => void handleChapterAudio(chapterNumber, chapterUnlocked)}
                          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left transition-all ${
                            chapterUnlocked
                              ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                              : "cursor-not-allowed"
                          }`}
                          aria-label={
                            !chapterUnlocked
                              ? `챕터 ${chapterNumber} 전체 듣기 잠김`
                              : chapterAudioPaused
                                ? `챕터 ${chapterNumber} 전체 듣기 계속 재생`
                                : chapterAudioActive
                                  ? `챕터 ${chapterNumber} 전체 듣기 일시정지`
                                  : `챕터 ${chapterNumber} 전체 파트 듣기`
                          }
                        >
                          <span
                            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold shadow-sm ${
                              chapterUnlocked
                                ? "bg-ink text-surface"
                                : "border border-line bg-raised text-ink-faint"
                            }`}
                            aria-hidden="true"
                          >
                            {chapterAudioLoading
                              ? <span className="animate-pulse">•••</span>
                              : !chapterUnlocked
                                ? "🔒"
                                : chapterAudioActive && !chapterAudioPaused
                                  ? "Ⅱ"
                                  : "▶"}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-bold text-ink sm:text-[14px]">
                              {previewOnly ? "무료 파트 연속 듣기" : "챕터 전체 파트 듣기"}
                            </span>
                            <span className="mt-0.5 block truncate text-[11px] text-ink-soft sm:text-[11.5px]">
                              {!chapterUnlocked
                                ? "챕터 해금 후 이용할 수 있습니다"
                                : chapterAudioLoading
                                  ? "재생 목록을 준비하는 중..."
                                  : currentAudioItem
                                    ? `파트 ${currentAudioItem.partNumber}/${activeChapterAudio?.partCount} · 문장 ${currentAudioItem.sentenceNumber}/${currentAudioItem.sentenceTotal}`
                                    : previewOnly
                                      ? "1·2강을 Ava 음성으로 연속 재생"
                                      : `${section.lessons.length}개 파트를 Ava 음성으로 연속 재생`}
                            </span>
                          </span>
                        </button>

                        {chapterAudioActive && (
                          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-amber-500/20 pt-2.5 sm:justify-end sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                            <div className="flex items-center rounded-lg border border-line bg-raised p-0.5" aria-label="재생 속도">
                              {([0.85, 1, 1.2] as ChapterAudioSpeed[]).map((rate) => (
                                <button
                                  key={rate}
                                  type="button"
                                  onClick={() => handleAudioSpeed(rate)}
                                  className={`rounded-md px-2 py-1 font-mono text-[10px] font-semibold transition-colors ${
                                    audioSpeed === rate
                                      ? "bg-ink text-surface"
                                      : "text-ink-soft hover:bg-sunken"
                                  }`}
                                >
                                  {rate}×
                                </button>
                              ))}
                            </div>
                            <button
                              type="button"
                              onClick={handleStopChapterAudio}
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 text-[11px] font-semibold text-ink-soft transition-colors hover:text-ink"
                              aria-label="챕터 전체 듣기 정지"
                            >
                              <span aria-hidden="true">■</span>
                              정지
                            </button>
                          </div>
                        )}
                      </div>
                      {audioError?.chapter === chapterNumber && (
                        <p className="mt-2 px-1 text-[11px] font-medium text-red-600 dark:text-red-300" role="alert">
                          {audioError.message}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Section Content Grid */}
                  {isOpen && (
                    <div className="border-t border-line p-4 sm:p-6 bg-sunken/50">
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {section.lessons.map((lesson, lessonIdx) => {
                          const isDone = isCompleted(courseSlug, lesson.id);
                          const isStarred = isBookmarked(courseSlug, lesson.id);
                          const isFree = isFreePreviewLesson(courseSlug, lesson.id, sectionIndex, lessonIdx);
                          const isUnlocked = checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx);
                          const sequentialLock = courseSlug === "student" && hasCourseAccess && !isUnlocked;

                          return (
                            <DashboardLessonCard
                              key={lesson.id}
                              lesson={lesson}
                              courseSlug={courseSlug}
                              isDone={isDone}
                              isStarred={isStarred}
                              isUnlocked={isUnlocked}
                              isFree={isFree}
                              hasCourseAccess={hasCourseAccess}
                              onToggleBookmark={handleToggleBookmark}
                              sequentialLock={sequentialLock}
                            />
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
