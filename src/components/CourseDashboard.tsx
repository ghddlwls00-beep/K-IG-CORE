"use client";

import {
  useMemo,
  useState,
  memo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import Link from "next/link";
import { useProgress } from "./ProgressProvider";
import { useLicense } from "./LicenseProvider";
import { isFreePreviewLesson, planOpensCourse, STUDENT_PASS_COURSES } from "@/lib/license";
import type { LessonPresentation } from "@/lib/curriculumPresentation";
import { passoffTopicOf, topicWithParticle } from "@/lib/passoffUnlock";
import { ChapterAudioBar } from "./ChapterAudioBar";
import { usePassoffProgress, usePassoffUnlockNotice } from "./PassoffProgressProvider";

export interface DashboardLessonItem {
  id: string;
  presentation: LessonPresentation;
}

export interface DashboardSection {
  label: string;
  lessons: DashboardLessonItem[];
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
  lockLabel,
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
  /** what a card locked by the course order says (PASS-OFF GRAMMAR: "TOPIC N-1 을 마치면 열림") — STUDENT's own when absent */
  lockLabel?: string;
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
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-400">
                  ✓ 완료
                </span>
              )}
              {!isUnlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-sunken px-2 py-0.5 font-mono text-[9.5px] font-medium text-ink-faint">
                  <span>🔒</span>
                  <span>{sequentialLock ? (lockLabel ?? "이전 챕터 완료 필요") : STUDENT_PASS_COURSES.includes(courseSlug) ? "STUDENT" : "올패스"}</span>
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
              {/* Quick Bookmark Toggle on card.
                  KIG-013: the list page is not gated, so without this the star
                  still toggled for lessons the learner cannot open. Locked cards
                  keep the toggle disabled. */}
              <button
                type="button"
                disabled={!isUnlocked}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleBookmark(courseSlug, lesson.id);
                }}
                title={
                  !isUnlocked
                    ? "이용권 등록 후 북마크할 수 있습니다"
                    : isStarred
                      ? "북마크 해제"
                      : "북마크 추가"
                }
                aria-label={
                  !isUnlocked
                    ? "잠긴 레슨은 북마크할 수 없습니다"
                    : isStarred
                      ? "북마크 해제"
                      : "북마크 추가"
                }
                className={`-m-2 p-2 transition-transform ${
                  isUnlocked ? "cursor-pointer active:scale-90" : "cursor-not-allowed opacity-40"
                }`}
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
                ? STUDENT_PASS_COURSES.includes(courseSlug)
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
  const hasCourseAccess = hasActiveLicense && planOpensCourse(licenseInfo?.plan, courseSlug);
  const [filter, setFilter] = useState<"all" | "bookmarked" | "incomplete">("all");
  const [unlockNotice, setUnlockNotice] = useState<number | null>(null);
  const previousUnlockedRef = useRef<number | null>(null);

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

  // PASS-OFF GRAMMAR opens topic by topic, as STUDENT opens chapters (설계 §5) — from the server's answer
  // (PassoffProgressProvider; until it comes, the one kept on this device). With a licence this list counts what the
  // server counts, plus completions on their way (countedIds) — the topic lock counts nothing else, and a list that
  // also took this device's own record showed ✓ the lock did not (코드 단계 C 점검 1). Another device's lessons count
  // too. Without a licence (the free lessons) it is this device's record, as in every other course.
  const isPassoff = courseSlug === "passoff-grammar";
  const { progress: passoffProgress, countedIds, syncStatus: passoffSyncStatus } = usePassoffProgress();
  const passoffNotice = usePassoffUnlockNotice(isPassoff && hasCourseAccess && licenseInfo?.plan !== "LIFE");
  const passoffDone = isPassoff && hasCourseAccess ? countedIds : null;
  /** a licence, and no answer yet to show the topic locks from (LIFE needs none — every topic is open) */
  const passoffChecking = isPassoff && hasCourseAccess && !passoffProgress && licenseInfo?.plan !== "LIFE";
  /** done on this list: the server's count for PASS-OFF GRAMMAR with a licence — this device's record otherwise */
  const isDoneHere = useCallback(
    (lessonId: string) => (passoffDone ? passoffDone.has(lessonId) : isCompleted(courseSlug, lessonId)),
    [courseSlug, isCompleted, passoffDone],
  );

  const handleToggleBookmark = useCallback(
    (slug: string, id: string) => {
      toggleBookmark(slug, id);
    },
    [toggleBookmark]
  );

  // Calculate stats for this course
  const prefix = `${courseSlug}:`;

  /**
   * COUNT-01 — only the lessons this page LISTS count towards the progress.
   *
   * This used to count every completed key whose course prefix matched, but a
   * course stores more lessons than it lists: each English lesson has a Korean
   * script page (`d006` → `d006-1`) that is reached from inside the lesson and
   * is deliberately not listed (see `listed` in app/[course]/page.tsx). Marking
   * those complete pushed the numerator past the denominator — measured on
   * production, 3 lessons plus 5 script pages read "8 / 53개 완료 (15%)", and
   * because there is roughly one script page per lesson the bar could reach
   * 200%. The "미완료" count was wrong by the same amount.
   *
   * `sections` is built from exactly that listed set (checked: all six courses
   * list every id they count — student 82, phonics 195, grammar1 53,
   * grammar2 44, ld 276, reading 256), so it is the right thing to count.
   */
  const listedIds = useMemo(
    () => new Set(sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))),
    [sections],
  );
  const completedCount = useMemo(() => {
    let count = 0;
    for (const id of listedIds) if (passoffDone ? passoffDone.has(id) : completed[`${prefix}${id}`]) count++;
    return count;
  }, [completed, listedIds, passoffDone, prefix]);

  // Same rule as the progress count: the chip says "북마크 (N)" and clicking it
  // filters THIS list, so counting an unlisted script page would promise rows
  // the filter cannot show.
  const bookmarkCount = useMemo(() => {
    let count = 0;
    for (const id of listedIds) if (bookmarks[`${prefix}${id}`]) count++;
    return count;
  }, [bookmarks, listedIds, prefix]);

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
            return !isDoneHere(l.id);
          }
          return true;
        }),
      }))
      .filter((sec) => sec.lessons.length > 0);
  }, [sections, filter, courseSlug, isBookmarked, isDoneHere]);

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
        <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-md rounded-2xl border border-emerald-500/30 bg-raised px-5 py-4 text-center text-[14px] font-bold text-emerald-700 dark:text-emerald-400 shadow-xl dark:text-emerald-300" role="status">
          🎉 챕터 {unlockNotice}가 열렸습니다.
        </div>
      )}
      {/* PASS-OFF GRAMMAR's lines follow docs/디자인-규칙.md (12px and up, no direct colours, no emoji) — the
          STUDENT lines beside them are unchanged here and follow it on main */}
      {passoffNotice && (
        <div className="fixed inset-x-4 top-24 z-50 mx-auto max-w-md rounded-2xl border border-line bg-raised px-5 py-4 text-center text-[14px] font-semibold text-ink shadow-xl" role="status">
          {topicWithParticle(passoffNotice, "이/가")} 열렸어요.
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
              학습 진도율: <span className="text-emerald-700 dark:text-emerald-400">{completedCount}</span> / {totalLessons}개 완료 <span className="text-ink-faint text-[14px] sm:text-[16px] font-normal">({progressPercent}%)</span>
            </h2>
            {courseSlug === "student" && hasActiveLicense && (
              <p className="mt-1 text-[11.5px] text-ink-faint" aria-live="polite">
                {studentSyncStatus === "saved" && "✓ 서버에 저장됨"}
                {studentSyncStatus === "syncing" && "진도를 서버에 저장하는 중..."}
                {studentSyncStatus === "pending" && "연결 복구 후 자동 저장 예정"}
                {studentSyncStatus === "error" && "저장 실패 · 연결되면 자동으로 다시 시도합니다"}
              </p>
            )}
            {isPassoff && hasCourseAccess && (
              <p className="mt-1 text-[12px] text-ink-soft" aria-live="polite">
                {passoffSyncStatus === "saved" && "서버에 저장됨"}
                {passoffSyncStatus === "syncing" && "진도를 서버와 맞추는 중…"}
                {passoffSyncStatus === "pending" && "연결되면 자동으로 저장합니다"}
                {passoffSyncStatus === "error" && "저장하지 못했습니다 · 연결되면 다시 시도합니다"}
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
              const completedInSection = section.lessons.filter((l) => isDoneHere(l.id)).length;
              const studentChapter = courseSlug === "student"
                ? studentProgress?.chapters.find((item) => item.chapter === chapterNumber)
                : undefined;
              // PASS-OFF GRAMMAR: this section's topic (by its lessons' ids) and the one before it
              const passoffTopic = isPassoff ? passoffTopicOf(sections[sectionIndex]?.lessons[0]?.id ?? "") : null;
              const passoffPreviousTopic = isPassoff && sectionIndex > 0
                ? passoffTopicOf(sections[sectionIndex - 1]?.lessons[0]?.id ?? "")
                : null;
              const passoffState = passoffTopic !== null
                ? passoffProgress?.topics.find((item) => item.topic === passoffTopic)
                : undefined;
              const chapterUnlocked = (courseSlug !== "student" && !isPassoff)
                || (!hasCourseAccess
                  ? sectionIndex === 0
                  : section.lessons.some((lesson, lessonIdx) =>
                      checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx),
                    ));
              const chapterComplete = Boolean(studentChapter?.complete) || Boolean(passoffState?.complete);
              const chapterPercent = studentChapter?.percent ?? passoffState?.percent ?? Math.round((completedInSection / Math.max(1, section.lessons.length)) * 100);
              // PASS-OFF GRAMMAR's line under the topic name — '레슨' throughout, as its lock screen says
              const passoffLine = !isPassoff
                ? null
                : !hasCourseAccess
                  ? sectionIndex === 0 ? "첫 두 레슨 무료 체험" : "이용권 등록 후 열림"
                  : passoffChecking
                    ? "진도 확인 중…"
                    : !chapterUnlocked
                      ? `${topicWithParticle(passoffPreviousTopic ?? sectionIndex, "을/를")} 마치면 열림`
                      : chapterComplete
                        ? "대주제 완료"
                        : passoffState && !passoffProgress?.everyTopicOpen
                          ? `진행 ${chapterPercent}% · 레슨 ${passoffState.requiredCount}개와 마지막 레슨${passoffProgress?.mapRefillRequired ? ", 구성도 다시 채우기를" : "을"} 마치면 다음 대주제`
                          : `진행 ${chapterPercent}%`;


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
                            <span className="text-emerald-700 dark:text-emerald-400 font-semibold ml-2">
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
                        {passoffLine ? (
                          <span className="mt-1 text-[12px] font-medium text-ink-soft">{passoffLine}</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      {(courseSlug === "student" || isPassoff) && (
                        <span className={`inline-flex min-h-8 min-w-[72px] shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-semibold ${
                          passoffChecking
                            ? "bg-sunken text-ink-soft"
                            : chapterComplete
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : chapterUnlocked
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
                                : "bg-sunken text-ink-soft" /* BUG-035: ink-faint on sunken was 4.47:1 */
                        }`}>
                          {passoffChecking ? "확인 중" : chapterComplete ? "완료" : chapterUnlocked ? "학습 가능" : "🔒 잠금"}
                        </span>
                      )}
                      <span className="rounded-full border border-line bg-sunken px-3 py-1 text-[11.5px] font-medium text-ink-soft hidden sm:inline">
                        {isOpen ? "접기 ▲" : "펼치기 ▼"}
                      </span>
                    </div>
                  </button>

                  {courseSlug === "student" && (
                    <ChapterAudioBar
                      chapterNumber={chapterNumber}
                      chapterUnlocked={chapterUnlocked}
                      previewOnly={!hasCourseAccess && sectionIndex === 0}
                      totalLessons={section.lessons.length}
                    />
                  )}

                  {/* Section Content Grid */}
                  {isOpen && (
                    <div className="border-t border-line p-4 sm:p-6 bg-sunken/50">
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {section.lessons.map((lesson, lessonIdx) => {
                          const isDone = isDoneHere(lesson.id);
                          const isStarred = isBookmarked(courseSlug, lesson.id);
                          const isFree = isFreePreviewLesson(courseSlug, lesson.id, sectionIndex, lessonIdx);
                          const isUnlocked = checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx);
                          const sequentialLock = (courseSlug === "student" || isPassoff) && hasCourseAccess && !isUnlocked;

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
                              lockLabel={
                                !isPassoff
                                  ? undefined
                                  : passoffChecking
                                    ? "진도 확인 중"
                                    : `${topicWithParticle(passoffPreviousTopic ?? sectionIndex, "을/를")} 마치면 열림`
                              }
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
