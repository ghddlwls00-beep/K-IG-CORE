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
import dynamic from "next/dynamic";
import { useProgress } from "./ProgressProvider";
import { useLicense } from "./LicenseProvider";
import { isFreePreviewLesson, planOpensCourse } from "@/lib/license";
import type { LessonPresentation } from "@/lib/curriculumPresentation";
import { READING_LENGTHS } from "@/lib/readingLengths";
import { passoffLessonsDone, passoffTopicOf, topicWithParticle } from "@/lib/passoffUnlock";
import { ChapterAudioBar } from "./ChapterAudioBar";
import { usePassoffProgress, usePassoffUnlockNotice } from "./PassoffProgressProvider";
// the topic's "구성도 다시 채우기" links (단계 2-나 E2) — from the server's progress answer only: no learning engine in them
import { PassoffMapNext, PassoffMapRow } from "./passoff/MapEntry";

// PASS-OFF GRAMMAR's '오늘 복습' line — loaded on that course's list only, so the learning engine it brings is not in the
// other courses' list code (it draws nothing on the server anyway: it reads this device's record)
const PassoffReviewEntry = dynamic(() => import("./passoff/ReviewEntry").then((m) => m.PassoffReviewEntry), { ssr: false });

export interface DashboardLessonItem {
  id: string;
  presentation: LessonPresentation;
}

export interface DashboardSection {
  label: string;
  lessons: DashboardLessonItem[];
}

/*
 * 2026-09-27 — the course list rebuilt to docs/디자인-규칙.md (점검 FRAME-U02 · U12 · L02 · L09):
 *   - '이어서 학습' (the last lesson opened in THIS course) or '처음부터' at the top; visitors get
 *     '무료로 먼저 해 보기' with the two free lessons instead of an empty progress card
 *   - every section starts closed (사장님 2026-09-29 — it used to open the one holding that lesson); which
 *     sections are open is kept for the tab (sessionStorage), and BACK from a lesson returns to the same list
 *   - one 52px row per lesson: title · state (완료 · 무료 · 잠금) · bookmark. The repeated badge,
 *     subtitle, file id and '학습하기' of the old cards are gone; titles are unchanged
 *   - a chevron (not ▶, which read as a play button), no gradient, no emerald/blue/amber
 * Kept on purpose for the audit drivers (drive-common-0926 A · gap-checks P): the progress sentence
 * '학습 진도율: N / T개 완료 (P%)', the filter labels '전체 (N)' · '북마크 (N)' · '미완료 (N)', and
 * aria-expanded on the section headers.
 */

// When the browser last fired popstate (BACK / FORWARD in this tab). The App Router renders the page it goes back to
// right after, so a course list mounting within a moment of it was reached through history, not by coming in.
let lastPopstateAt = 0;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    lastPopstateAt = Date.now();
  });
}
/** Was this course list reached with the browser's BACK / FORWARD (in the app, or a history load of the page itself)? */
function cameBackByHistory(): boolean {
  if (Date.now() - lastPopstateAt < 3000) return true;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "back_forward" && performance.now() < 5000;
}

const LessonRow = memo(function LessonRow({
  lesson,
  courseSlug,
  isDone,
  isStarred,
  isUnlocked,
  isFree,
  hasCourseAccess,
  isRecent,
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
  isRecent: boolean;
  onToggleBookmark: (courseSlug: string, lessonId: string) => void;
  sequentialLock: boolean;
  /** what a row locked by the course order says (PASS-OFF GRAMMAR: "TOPIC N-1을 마치면 열림") — STUDENT's own when absent */
  lockLabel?: string;
}) {
  const pres = lesson.presentation;
  // 2026-09-27 (계획 D35 나 · RD-L14): a READING row says how long its passage is — numbers only (this page is public)
  const length = courseSlug === "reading" ? READING_LENGTHS[lesson.id] : undefined;
  const state = isDone
    ? "완료"
    : !isUnlocked
      ? sequentialLock
        ? (lockLabel ?? "앞 장을 마치면 열림")
        : "이용권"
      : isFree && !hasCourseAccess
        ? "무료"
        : "";

  return (
    <li
      data-lesson-id={lesson.id}
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 52px" }}
      className={`flex items-center ${isRecent ? "bg-sunken" : ""}`}
    >
      <Link
        href={`/${courseSlug}/${lesson.id}`}
        scroll={true}
        className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-2 pl-4 pr-2 transition-colors hover:bg-sunken"
      >
        {courseSlug === "student" ? (
          <span className="w-9 shrink-0 text-caption tabular-nums text-ink-soft">{pres.code.replace(/^Ch\s*/, "")}</span>
        ) : null}
        {length ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-label ${isUnlocked ? "text-ink" : "text-ink-soft"} ${isRecent ? "font-semibold" : "font-medium"}`}>
              {pres.title}
            </span>
            <span data-passage-length className="text-caption tabular-nums text-ink-soft">
              {length[0]}단어 · {length[1]}문장
            </span>
          </span>
        ) : (
          <span className={`min-w-0 flex-1 truncate text-label ${isUnlocked ? "text-ink" : "text-ink-soft"} ${isRecent ? "font-semibold" : "font-medium"}`}>
            {pres.title}
          </span>
        )}
        {state ? (
          <span className={`flex shrink-0 items-center gap-1 text-caption ${isDone ? "text-success font-medium" : "text-ink-soft"}`}>
            {isDone ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
            ) : !isUnlocked ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" />
              </svg>
            ) : null}
            <span>{state}</span>
          </span>
        ) : null}
      </Link>
      {/* KIG-013: the list page is not gated, so a locked row keeps the bookmark disabled. */}
      <button
        type="button"
        disabled={!isUnlocked}
        onClick={() => onToggleBookmark(courseSlug, lesson.id)}
        title={!isUnlocked ? "이용권 등록 후 북마크할 수 있습니다" : isStarred ? "북마크 해제" : "북마크 추가"}
        aria-label={!isUnlocked ? "잠긴 강의는 북마크할 수 없습니다" : isStarred ? "북마크 해제" : "북마크 추가"}
        aria-pressed={isStarred}
        className={`mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors ${
          isUnlocked ? "cursor-pointer hover:bg-sunken" : "cursor-not-allowed opacity-30"
        } ${isStarred ? "text-primary" : "text-ink-faint hover:text-ink"}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill={isStarred ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
          <path d="M6.5 3.5h11a1 1 0 0 1 1 1v16l-6.5-4.2-6.5 4.2v-16a1 1 0 0 1 1-1Z" />
        </svg>
      </button>
    </li>
  );
});

export function CourseDashboard({
  courseSlug,
  sections,
  totalLessons,
  passoffFreeReviewKeys,
}: {
  courseSlug: string;
  sections: DashboardSection[];
  totalLessons: number;
  /** PASS-OFF GRAMMAR: the items its free review can draw (ids only) — the '오늘 복습' line counts no other without a licence */
  passoffFreeReviewKeys?: readonly string[];
}) {
  const { completed, bookmarks, recentByCourse, toggleBookmark, isCompleted, isBookmarked, studentSyncStatus } = useProgress();
  const { hasActiveLicense, licenseInfo, isUnlocked: checkUnlocked, studentProgress } = useLicense();
  // STUDENT passes open STUDENT and PASS-OFF GRAMMAR; the all-pass opens every course (license.ts planOpensCourse)
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

  // '이어서 학습': the last lesson opened in this course (a script page counts as its listed lesson)
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const recentRecord = recentByCourse[courseSlug];
  const recentListed = useMemo(() => {
    if (!recentRecord) return null;
    const exact = allLessons.find((l) => l.id === recentRecord.lessonId);
    if (exact) return exact;
    return allLessons.find((l) => recentRecord.lessonId.startsWith(`${l.id}-`)) ?? null;
  }, [allLessons, recentRecord]);
  const firstLesson = allLessons[0] ?? null;

  // the two free lessons (first two cards of the first section — the same rule as the gate)
  const freeLessons = useMemo(() => {
    const first = sections[0];
    if (!first) return [];
    return first.lessons.filter((lesson, lessonIdx) => isFreePreviewLesson(courseSlug, lesson.id, 0, lessonIdx)).slice(0, 2);
  }, [courseSlug, sections]);

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

  // Which sections are open. Coming into a course list (menu, a link, '← 목록', a typed address) starts with every
  // section closed (사장님 2026-09-29 "각 섹션을 들어가면 첫 강의가 열려있는데 모든 섹션이 다 닫혀 있게 해줘" — it used
  // to open the section with the recent lesson, or the first one); '이어서 학습 / 처음부터' and '무료로 먼저 해 보기'
  // above the list still start a lesson in one tap. Only the browser's BACK / FORWARD finds the list as it was left
  // (kept for this tab in sessionStorage — 공통 틀 2 '뒤로 가면 보던 자리').
  const openKey = `kig:list-open:${courseSlug}`;
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const openRestoredRef = useRef(false);
  useEffect(() => {
    if (openRestoredRef.current) return;
    let restored: Record<string, boolean> = {};
    if (cameBackByHistory()) {
      try {
        const saved = window.sessionStorage.getItem(openKey);
        if (saved) restored = JSON.parse(saved);
      } catch {
        // ignore
      }
    }
    openRestoredRef.current = true;
    setOpenSections(restored);
  }, [openKey]);

  const toggleSection = (label: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      try {
        window.sessionStorage.setItem(openKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  // Once, on a fresh visit (not BACK — NavigationScrollRestoration handles that), bring the recent
  // lesson's row into view.
  const scrolledRef = useRef(false);
  useEffect(() => {
    if (scrolledRef.current || !recentListed || !openRestoredRef.current) return;
    scrolledRef.current = true;
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (nav?.type === "back_forward") return;
    const row = document.querySelector(`[data-lesson-id="${CSS.escape(recentListed.id)}"]`);
    if (row && window.scrollY < 40) row.scrollIntoView({ block: "center" });
  }, [openSections, recentListed]);

  const filterButton = (key: typeof filter, label: string) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`flex min-h-11 items-center justify-center rounded-control px-3 text-label transition-colors cursor-pointer ${
        filter === key ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:text-ink"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {unlockNotice && (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-card border border-line bg-raised px-5 py-4 text-center text-label font-semibold text-ink shadow-xl" role="status">
          {/* 2026-09-27 STU-U28: a number and "장" fix the particle ('3장이'), instead of '챕터 3이(가)' */}
          {unlockNotice}장이 열렸어요.
        </div>
      )}
      {passoffNotice && (
        <div className="fixed inset-x-4 top-20 z-50 mx-auto max-w-md rounded-card border border-line bg-raised px-5 py-4 text-center text-label font-semibold text-ink shadow-xl" role="status">
          {/* the particle as the number is read in Korean ('TOPIC 2가' · 'TOPIC 3이' — passoffUnlock.ts topicWithParticle) */}
          {topicWithParticle(passoffNotice, "이/가")} 열렸어요.
        </div>
      )}

      {/* Where to go next */}
      {hasCourseAccess ? (
        <section className="rounded-card border border-line bg-raised p-4 sm:p-5" aria-label="진도">
          {recentListed || firstLesson ? (
            <Link
              href={`/${courseSlug}/${(recentListed ?? firstLesson)!.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control bg-ink px-4 py-2 text-surface transition-opacity hover:opacity-90"
            >
              <span className="min-w-0">
                <span className="block text-caption text-surface/75">{recentListed ? "이어서 학습" : "처음부터"}</span>
                <span className="block truncate text-label font-semibold">{(recentListed ?? firstLesson)!.presentation.title}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
          {/* PASS-OFF GRAMMAR: today's review — with a licence the server's plan (공통-학습-엔진.md §8-4 · §10); other courses have
              none yet — and a topic's "구성도 다시 채우기" when it is the step left (단계 2-나 E2) */}
          {isPassoff ? <PassoffReviewEntry learner={licenseInfo?.licenseId ?? null} freeKeys={passoffFreeReviewKeys ?? []} /> : null}
          {isPassoff ? <PassoffMapNext progress={passoffProgress} /> : null}
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-label text-ink">
              학습 진도율: <span className="font-semibold tabular-nums">{completedCount}</span> / {totalLessons}개 완료{" "}
              <span className="tabular-nums text-ink-soft">({progressPercent}%)</span>
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
            {courseSlug === "student" && (
              <p className="text-caption text-ink-soft" aria-live="polite">
                {studentSyncStatus === "saved" && "서버에 저장됨"}
                {studentSyncStatus === "syncing" && "진도를 서버에 저장하는 중…"}
                {studentSyncStatus === "pending" && "연결되면 자동으로 저장합니다"}
                {studentSyncStatus === "error" && "저장하지 못했습니다 · 연결되면 다시 시도합니다"}
              </p>
            )}
            {isPassoff && (
              <p className="text-caption text-ink-soft" aria-live="polite">
                {passoffSyncStatus === "saved" && "서버에 저장됨"}
                {passoffSyncStatus === "syncing" && "진도를 서버와 맞추는 중…"}
                {passoffSyncStatus === "pending" && "연결되면 자동으로 저장합니다"}
                {passoffSyncStatus === "error" && "저장하지 못했습니다 · 연결되면 다시 시도합니다"}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-raised p-4 sm:p-5" aria-label="무료 체험">
          <h2 className="text-label font-semibold text-ink">무료로 먼저 해 보기</h2>
          <p className="mt-1 text-caption text-ink-soft">{`이용권 없이 첫 두 강의를 끝까지 학습할 수 있습니다.`}</p>
          {freeLessons.length ? (
            <div className={`mt-3 grid gap-2 ${freeLessons.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {freeLessons.map((lesson, i) => (
                <Link
                  key={lesson.id}
                  href={`/${courseSlug}/${lesson.id}`}
                  className={`flex min-h-12 items-center justify-between gap-2 rounded-control px-4 text-label font-semibold transition-colors ${
                    i === 0 ? "bg-ink text-surface hover:opacity-90" : "border border-line text-ink hover:bg-sunken"
                  }`}
                >
                  <span className="truncate">{lesson.presentation.title}</span>
                  <span aria-hidden>→</span>
                </Link>
              ))}
            </div>
          ) : null}
          {/* without a licence the review has the free review's items alone, on this device */}
          {isPassoff ? <PassoffReviewEntry learner={null} freeKeys={passoffFreeReviewKeys ?? []} /> : null}
          {/* kept for the audit drivers, which read the counters on every list page */}
          <p className="mt-3 text-caption text-ink-soft">
            학습 진도율: <span className="tabular-nums">{completedCount}</span> / {totalLessons}개 완료 ({progressPercent}%)
          </p>
        </section>
      )}

      {/* Filters */}
      <div className="grid grid-cols-3 gap-1 rounded-control bg-sunken p-1" role="group" aria-label="목록 거르기">
        {filterButton("all", `전체 (${totalLessons})`)}
        {filterButton("bookmarked", `북마크 (${bookmarkCount})`)}
        {filterButton("incomplete", `미완료 (${Math.max(0, totalLessons - completedCount)})`)}
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-line p-10 text-center">
          <p className="text-label font-semibold text-ink">
            {filter === "bookmarked" ? "아직 북마크한 강의가 없습니다." : "조건에 맞는 강의가 없습니다."}
          </p>
          <p className="max-w-sm text-caption text-ink-soft">
            {filter === "bookmarked"
              ? "다시 보고 싶은 강의에서 제목 옆 북마크를 누르세요."
              : "모든 강의를 마쳤습니다."}
          </p>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-2 min-h-11 rounded-control border border-line px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-raised"
            >
              전체 목록 보기
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredSections.map((section) => {
            const sectionIndex = section.sectionIndex;
            const chapterNumber = sectionIndex + 1;
            // a filter shows its matches without making the learner open each section
            const isOpen = filter !== "all" || (openSections[section.label] ?? false);
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
            const isLife = licenseInfo?.plan === "LIFE";
            /** PASS-OFF GRAMMAR's lock words (its topic line and each locked row): 'TOPIC 2를 마치면 열림' — the particle as the number is read */
            const passoffLock = `${topicWithParticle(passoffPreviousTopic ?? sectionIndex, "을/를")} 마치면 열림`;
            // PASS-OFF GRAMMAR's line under the topic name — '강의' like every course (사장님 2026-09-28 "강의로 맞춰")
            const passoffNote = !isPassoff
              ? null
              : !hasCourseAccess
                ? sectionIndex === 0 ? "첫 두 강의 무료 체험" : "이용권 등록 후 열림"
                : passoffChecking
                  ? "진도 확인 중…"
                  : !chapterUnlocked
                    ? passoffLock
                    : chapterComplete
                      ? "대주제 완료"
                      : passoffState && !passoffProgress?.everyTopicOpen
                        ? `진행 ${chapterPercent}% · 강의 ${passoffState.requiredCount}개와 마지막 강의${passoffProgress?.mapRefillRequired ? ", 구성도 다시 채우기를" : "를"} 마치면 다음 대주제`
                        : `진행 ${chapterPercent}%`;
            const studentNote = courseSlug !== "student"
              ? null
              : !hasCourseAccess
                ? sectionIndex === 0 ? "1·2강 무료" : "이용권 등록 후 열립니다"
                : !chapterUnlocked
                  ? `${sectionIndex}장을 마치면 열립니다` // STU-U28: '{n}장을' — '챕터 {n}을(를)' read wrong
                  : chapterComplete
                    ? "이 장 완료"
                    : isLife || !studentChapter
                      ? null
                      : `진행 ${chapterPercent}% · ${studentChapter.requiredCount}강과 마지막 강의를 마치면 다음 장`;

            return (
              <div
                key={`${sectionIndex}-${section.label}`}
                id={`section-${sectionIndex}`}
                className="scroll-mt-20 overflow-hidden rounded-card border border-line bg-raised"
              >
                <button
                  type="button"
                  onClick={() => toggleSection(section.label)}
                  className="flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer select-none hover:bg-sunken"
                  aria-expanded={isOpen}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
                    className={`shrink-0 text-ink-soft transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}>
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-label font-semibold text-ink">{section.label}</span>
                    {studentNote ? <span className="mt-0.5 text-caption text-ink-soft">{studentNote}</span> : null}
                    {passoffNote ? <span className="mt-0.5 text-caption text-ink-soft">{passoffNote}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-caption tabular-nums text-ink-soft">
                    {(courseSlug === "student" || (isPassoff && !passoffChecking)) && !chapterUnlocked ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="잠김">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    ) : null}
                    {completedInSection}/{section.lessons.length}
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    {courseSlug === "student" && chapterUnlocked && (
                      <ChapterAudioBar
                        chapterNumber={chapterNumber}
                        chapterUnlocked={chapterUnlocked}
                        previewOnly={!hasCourseAccess && sectionIndex === 0}
                        totalLessons={section.lessons.length}
                      />
                    )}
                    <ul className="divide-y divide-line">
                      {section.lessons.map((lesson) => {
                        // position in the UNFILTERED section — the free and unlock rules count cards
                        const lessonIdx = sections[sectionIndex].lessons.findIndex((l) => l.id === lesson.id);
                        const isDone = isDoneHere(lesson.id);
                        const isStarred = isBookmarked(courseSlug, lesson.id);
                        const isFree = isFreePreviewLesson(courseSlug, lesson.id, sectionIndex, lessonIdx);
                        const isUnlocked = checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx);
                        const sequentialLock = (courseSlug === "student" || isPassoff) && hasCourseAccess && !isUnlocked;
                        return (
                          <LessonRow
                            key={lesson.id}
                            lesson={lesson}
                            courseSlug={courseSlug}
                            isDone={isDone}
                            isStarred={isStarred}
                            isUnlocked={isUnlocked}
                            isFree={isFree}
                            hasCourseAccess={hasCourseAccess}
                            isRecent={recentListed?.id === lesson.id}
                            onToggleBookmark={handleToggleBookmark}
                            sequentialLock={sequentialLock}
                            lockLabel={!isPassoff ? undefined : passoffChecking ? "진도 확인 중" : passoffLock}
                          />
                        );
                      })}
                    </ul>
                    {/* PASS-OFF GRAMMAR: the topic's "구성도 다시 채우기" (단계 2-나 E2) — an open topic, with a licence; a link once its lessons are done */}
                    {isPassoff && hasCourseAccess && chapterUnlocked && !passoffChecking && passoffTopic !== null && filter === "all" ? (
                      <PassoffMapRow topic={passoffTopic} done={Boolean(passoffState?.mapRefilled)} ready={Boolean(passoffState && passoffLessonsDone(passoffState))} />
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
