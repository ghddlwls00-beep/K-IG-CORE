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
import { passoffTopicWithParticle, type LessonPresentation } from "@/lib/curriculumPresentation";
import { READING_LENGTHS } from "@/lib/readingLengths";
import { shownPercent } from "@/lib/shownPercent";
import { passoffLessonsDone, passoffTopicOf } from "@/lib/passoffUnlock";
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
 *   - '이어서 학습' (the last lesson opened in THIS course) or, with none on this device, the first lesson not done
 *     ('처음부터' · '다음 강의' · '마지막 강의' — UI검토-1007 6번) at the top; visitors get
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

// Where the browser's last BACK / FORWARD in this tab landed, and when (popstate). The App Router renders that page right
// after, so a course list mounting at that very address shortly after was reached through history, not by coming in.
// Each history arrival is used once: a list reached afterwards by the menu or '← 목록' starts closed — the first
// version kept a 3-second window open whatever came next, and the pre-release check (45374ad) measured ☰ → /ld 0.5 s
// after a BACK and '← 목록' 0.9 s after one both bringing back saved sections.
let popped: { href: string; at: number } | null = null;
let documentEntryUsed = false;
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    popped = { href: window.location.href, at: Date.now() };
  });
}
/** Was this course list reached with the browser's BACK / FORWARD (in the app, or a history load of this page itself)? */
function cameBackByHistory(): boolean {
  const p = popped;
  popped = null;
  if (p && p.href === window.location.href && Date.now() - p.at < 10000) return true;
  if (documentEntryUsed) return false;
  documentEntryUsed = true;
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  return nav?.type === "back_forward" && nav.name === window.location.href && performance.now() < 10000;
}

/**
 * UI검토-1007 16번 · 4장 8 — a lesson named outside its chapter's rows (the '이어서 학습' button, the free-lesson buttons) is its
 * title, which now carries its chapter for STUDENT · ADULT ('2-1 · Greeting (인사)' — curriculumPresentation.ts, the same
 * words as the lesson's head, the lock screen and the end bar). A row inside its chapter draws the number in its own column
 * and the lesson's own words beside it (rowName).
 */
const nameOutsideChapter = (pres: LessonPresentation): string => pres.title;
const NUMBERED_ROWS = new Set(["student", "adult", "passoff-grammar"]);
const rowName = (courseSlug: string, pres: LessonPresentation): string =>
  NUMBERED_ROWS.has(courseSlug) ? (pres.name ?? pres.title) : pres.title;

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
  pending = false,
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
  /** what a row locked by the course order says (PASS-OFF GRAMMAR: "대주제 N-1을 마치면 열림") — STUDENT's own when absent */
  lockLabel?: string;
  /**
   * UI검토-1007 10번: the licence (or the server record the chapter locks come from) has not answered yet for someone the
   * server saw with a licence — no '무료' · lock · '이용권' on the row until it has (only '완료', which this device knows)
   */
  pending?: boolean;
}) {
  const pres = lesson.presentation;
  // 2026-09-27 (계획 D35 나 · RD-L14): a READING row says how long its passage is — numbers only (this page is public)
  const length = courseSlug === "reading" ? READING_LENGTHS[lesson.id] : undefined;
  const state = isDone
    ? "완료"
    : pending
      ? ""
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
        {/* UI검토-1007 33번: PASS-OFF GRAMMAR's rows carry their number too ('1-1'), as STUDENT's · ADULT's do. 4장 8: the code is
            the number itself now ('1-1' — it was 'Ch 1-1' · 'Topic 1-1') and the row's words are the lesson's own (rowName) */}
        {NUMBERED_ROWS.has(courseSlug) ? (
          <span className="w-9 shrink-0 text-caption tabular-nums text-ink-soft">{pres.code}</span>
        ) : null}
        {length ? (
          <span className="flex min-w-0 flex-1 flex-col">
            <span className={`truncate text-label ${isUnlocked || pending ? "text-ink" : "text-ink-soft"} ${isRecent ? "font-semibold" : "font-medium"}`}>
              {rowName(courseSlug, pres)}
            </span>
            <span data-passage-length className="text-caption tabular-nums text-ink-soft">
              {length[0]}단어 · {length[1]}문장
            </span>
          </span>
        ) : (
          <span className={`min-w-0 flex-1 truncate text-label ${isUnlocked || pending ? "text-ink" : "text-ink-soft"} ${isRecent ? "font-semibold" : "font-medium"}`}>
            {rowName(courseSlug, pres)}
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
        title={!isUnlocked ? "이용권 등록 후 북마크할 수 있어요" : isStarred ? "북마크 해제" : "북마크 추가"}
        aria-label={!isUnlocked ? "잠긴 강의는 북마크할 수 없습니다" : isStarred ? "북마크 해제" : "북마크 추가"}
        aria-pressed={isStarred}
        className={`mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-control transition-colors ${
          isUnlocked ? "cursor-pointer hover:bg-sunken" : pending ? "" : "cursor-not-allowed opacity-30"
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
  licenseHint = false,
}: {
  courseSlug: string;
  sections: DashboardSection[];
  totalLessons: number;
  /** PASS-OFF GRAMMAR: the items its free review can draw (ids only) — the '오늘 복습' line counts no other without a licence */
  passoffFreeReviewKeys?: readonly string[];
  /**
   * UI검토-1007 10번: the server saw a signed licence cookie whose plan opens this course (app/[course]/page.tsx). A hint for
   * drawing only — access is still the browser's verified licence (LicenseProvider) and the server's lesson gate.
   */
  licenseHint?: boolean;
}) {
  const { bookmarks, recentByCourse, toggleBookmark, isCompleted, isBookmarked, studentSyncStatus: studentSync, adultSyncStatus } = useProgress();
  const {
    hasActiveLicense,
    licenseSettled,
    licenseInfo,
    isUnlocked: checkUnlocked,
    studentProgress: studentRecord,
    adultProgress,
    studentProgressSettled,
    adultProgressSettled,
  } = useLicense();
  // ADULT (2026-10-02) opens chapter by chapter exactly as STUDENT — the same list, from its own record
  const isChapterCourse = courseSlug === "student" || courseSlug === "adult";
  const studentProgress = courseSlug === "adult" ? adultProgress : studentRecord;
  const studentSyncStatus = courseSlug === "adult" ? adultSyncStatus : studentSync;
  // STUDENT passes open STUDENT and PASS-OFF GRAMMAR; the all-pass opens every course (license.ts planOpensCourse)
  const hasCourseAccess = hasActiveLicense && planOpensCourse(licenseInfo?.plan, courseSlug);
  /**
   * UI검토-1007 10번 — a paying learner used to see '무료로 먼저 해 보기 · 0/67', locks and '이용권 등록 후 열림' for 0.2~0.3 s
   * before the list changed. While the server saw a licence cookie for this course and this browser has not had its licence
   * answer yet, none of that is drawn — the places stay empty and are drawn once, when the answer comes. Without that cookie
   * (a visitor) the first picture is the server's free one, as before; a cookie that turns out not to hold a licence gets the
   * free card as soon as the answer comes.
   */
  const licenseUnknown = !hasCourseAccess && licenseHint && !licenseSettled;
  /** a licence, and STUDENT's · ADULT's server record (which opens the chapters) not answered yet — LIFE opens every chapter */
  const chapterRecordPending =
    isChapterCourse && hasCourseAccess && licenseInfo?.plan !== "LIFE" &&
    !(courseSlug === "adult" ? adultProgressSettled : studentProgressSettled);
  const [filter, setFilter] = useState<"all" | "bookmarked" | "incomplete">("all");
  const [unlockNotice, setUnlockNotice] = useState<number | null>(null);
  const previousUnlockedRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isChapterCourse || !studentProgress || licenseInfo?.plan === "LIFE") return;
    const previous = previousUnlockedRef.current;
    previousUnlockedRef.current = studentProgress.unlockedThrough;
    if (previous !== null && studentProgress.unlockedThrough > previous) {
      setUnlockNotice(studentProgress.unlockedThrough);
      const timer = window.setTimeout(() => setUnlockNotice(null), 5000);
      return () => window.clearTimeout(timer);
    }
  }, [isChapterCourse, licenseInfo?.plan, studentProgress]);

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
   *
   * 회귀 점검 1002 P4 (사장님 2026-10-05): a listed LISTENING · READING lesson counts as done when either its own page or its
   * script page was completed (isDoneHere → ProgressProvider.isCompleted — src/lib/lessonPair.ts), so '이 강의 학습 완료'
   * pressed on the script page moves this count and the lesson's row. Still one count per LISTED lesson — the pair is
   * never counted twice. Every other course counts its own keys, as before.
   */
  const listedIds = useMemo(
    () => new Set(sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))),
    [sections],
  );
  const completedCount = useMemo(() => {
    let count = 0;
    for (const id of listedIds) if (isDoneHere(id)) count++;
    return count;
  }, [isDoneHere, listedIds]);

  // Same rule as the progress count: the chip says "북마크 (N)" and clicking it
  // filters THIS list, so counting an unlisted script page would promise rows
  // the filter cannot show.
  const bookmarkCount = useMemo(() => {
    let count = 0;
    for (const id of listedIds) if (bookmarks[`${prefix}${id}`]) count++;
    return count;
  }, [bookmarks, listedIds, prefix]);

  const progressPercent = shownPercent(completedCount, totalLessons);

  // '이어서 학습': the last lesson opened in this course (a script page counts as its listed lesson)
  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons), [sections]);
  const recentRecord = recentByCourse[courseSlug];
  const recentListed = useMemo(() => {
    if (!recentRecord) return null;
    const exact = allLessons.find((l) => l.id === recentRecord.lessonId);
    if (exact) return exact;
    return allLessons.find((l) => recentRecord.lessonId.startsWith(`${l.id}-`)) ?? null;
  }, [allLessons, recentRecord]);
  /**
   * UI검토-1007 6번: with no lesson opened in this course on this device (a new phone, another computer), the top button
   * pointed at the first lesson even when it was done ('처음부터 1인칭' at '3/67 완료'). It now points at the first lesson
   * not done — done as this list shows it (isDoneHere: the server's record for STUDENT · ADULT · PASS-OFF GRAMMAR with a
   * licence, this device's for the others) — and at the last lesson when every one is done.
   */
  const firstNotDone = useMemo(() => allLessons.find((l) => !isDoneHere(l.id)) ?? null, [allLessons, isDoneHere]);
  const lastLesson = allLessons[allLessons.length - 1] ?? null;
  const startLesson = recentListed ?? firstNotDone ?? lastLesson;
  const startLabel = recentListed
    ? "이어서 학습"
    : firstNotDone
      ? completedCount === 0 ? "처음부터" : "다음 강의"
      : "마지막 강의";
  /** the record that says what is done has not answered yet — the button would point at the wrong lesson for a moment */
  const startPending = !recentListed && (chapterRecordPending || passoffChecking);
  /**
   * UI검토-1007 3차 ③ (1차 운영 확인 10-08 01시): with a licence, the counts ('학습 진도율: 0 / 82' · '미완료 (82)' · a chapter's
   * '0/6') showed for 0.2~0.5 s before the licence and the server record answered, then changed ('1 / 82'). Until they have,
   * the numbers keep their place unseen (`invisible` — the same box and height, nothing to read) and appear once, right. The
   * words stay in the page for the audit drivers, which read the counters after the list has settled.
   */
  const countsPending = licenseUnknown || chapterRecordPending || passoffChecking;
  const hideWhilePending = countsPending ? "invisible" : "";

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

  // UI검토-1007 42번: the chosen chip wears the shared chosen look (StepTabs · GRAMMAR · PASS-OFF chips) — a thin --line-input
  // ring in dark mode, where its raised ground was nearly the sunken track's. ③: the count waits unseen while pending.
  const filterButton = (key: typeof filter, label: string, count: number) => (
    <button
      type="button"
      onClick={() => setFilter(key)}
      aria-pressed={filter === key}
      className={`flex min-h-11 items-center justify-center rounded-control px-3 text-label transition-colors cursor-pointer ${
        filter === key ? "bg-raised font-semibold text-ink shadow-2xs dark:ring-1 dark:ring-line-input" : "font-medium text-ink-soft hover:text-ink"
      }`}
    >
      {/* one inline box, so the space before '(N)' stays (a flex button drops a bare space between its items) */}
      <span>
        {label} <span className={`tabular-nums ${key === "all" ? "" : hideWhilePending}`}>({count})</span>
      </span>
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
          {/* the particle as the number is read in Korean ('대주제 2가' · '대주제 3이' — curriculumPresentation.ts, 4장 8) */}
          {passoffTopicWithParticle(passoffNotice, "이/가")} 열렸어요.
        </div>
      )}

      {/* Where to go next */}
      {licenseUnknown ? (
        // UI검토-1007 10번: the licence answer is on its way — the place is kept (same box, same height), nothing drawn in it
        <section className="rounded-card border border-line bg-raised p-4 sm:p-5" aria-label="진도" aria-busy="true" data-license-pending="">
          <div className="min-h-14" aria-hidden />
          {/* kept for the audit drivers, which read the counters on every list page — unseen until the answer (③: it read '0 / 82') */}
          <div className="mt-4 flex flex-col gap-2">
            <p className="invisible text-label text-ink" aria-hidden>
              학습 진도율: <span className="font-semibold tabular-nums">{completedCount}</span> / {totalLessons}개 완료{" "}
              <span className="tabular-nums text-ink-soft">({progressPercent}%)</span>
            </p>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-track" aria-hidden />
          </div>
        </section>
      ) : hasCourseAccess ? (
        <section className="rounded-card border border-line bg-raised p-4 sm:p-5" aria-label="진도">
          {startPending ? (
            // the record that says which lesson is next is on its way — the button's place is kept
            <div className="min-h-14" aria-hidden />
          ) : startLesson ? (
            <Link
              href={`/${courseSlug}/${startLesson.id}`}
              className="flex min-h-14 items-center justify-between gap-3 rounded-control bg-ink px-4 py-2 text-surface transition-opacity hover:opacity-90"
            >
              <span className="min-w-0">
                <span className="block text-caption text-surface/75">{startLabel}</span>
                <span className="block truncate text-label font-semibold">{nameOutsideChapter(startLesson.presentation)}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
          {/* PASS-OFF GRAMMAR: today's review — with a licence the server's plan (공통-학습-엔진.md §8-4 · §10); other courses have
              none yet — and a topic's "구성도 다시 채우기" when it is the step left (단계 2-나 E2) */}
          {isPassoff ? <PassoffReviewEntry learner={licenseInfo?.licenseId ?? null} freeKeys={passoffFreeReviewKeys ?? []} /> : null}
          {isPassoff ? <PassoffMapNext progress={passoffProgress} /> : null}
          <div className="mt-4 flex flex-col gap-2">
            {/* ③: unseen (same place) until the chapter record / PASS-OFF answer is in — it read '0 / 82' first */}
            <p className={`text-label text-ink ${hideWhilePending}`} aria-hidden={countsPending || undefined}>
              학습 진도율: <span className="font-semibold tabular-nums">{completedCount}</span> / {totalLessons}개 완료{" "}
              <span className="tabular-nums text-ink-soft">({progressPercent}%)</span>
            </p>
            {/* UI검토-1007 57번: an empty bar (0%) was the card's own colour (dark 1.05 · light 1.15) — its ground is now
                globals.css --track (a step darker than the card: light 1.53 · dark 1.56), so a 0% bar shows where progress will fill */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-track" aria-hidden>
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${countsPending ? 0 : Math.min(100, Math.max(0, progressPercent))}%` }} />
            </div>
            {/* UI검토-1007 41번: 해요체 — '서버에 저장됨' → '진도 저장됨', PASS-OFF '진도를 서버와 맞추는 중…' → '진도를 맞추는 중…'
                (docs/pass-off-grammar/검사 drive-topic-lock · drive-topic-admin wait for these words — the tools' worker changes them) */}
            {isChapterCourse && (
              <p className="text-caption text-ink-soft" aria-live="polite">
                {studentSyncStatus === "saved" && "진도 저장됨"}
                {studentSyncStatus === "syncing" && "진도를 저장하는 중…"}
                {studentSyncStatus === "pending" && "연결되면 자동으로 저장해요"}
                {studentSyncStatus === "error" && "저장하지 못했어요 · 연결되면 다시 저장해요"}
              </p>
            )}
            {isPassoff && (
              <p className="text-caption text-ink-soft" aria-live="polite">
                {passoffSyncStatus === "saved" && "진도 저장됨"}
                {passoffSyncStatus === "syncing" && "진도를 맞추는 중…"}
                {passoffSyncStatus === "pending" && "연결되면 자동으로 저장해요"}
                {passoffSyncStatus === "error" && "저장하지 못했어요 · 연결되면 다시 저장해요"}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-card border border-line bg-raised p-4 sm:p-5" aria-label="무료 체험">
          <h2 className="text-label font-semibold text-ink">무료로 먼저 해 보기</h2>
          <p className="mt-1 text-caption text-ink-soft">{`이용권 없이 첫 두 강의를 끝까지 학습할 수 있어요.`}</p>
          {freeLessons.length ? (
            // UI검토-1007 4번: STUDENT's long titles pushed both buttons out of the card (390: 19px · 360: 49px) — the grid
            // track and the button may now shrink below their text (minmax(0,1fr) · min-w-0), so the title ends in '…'
            <div className={`mt-3 grid grid-cols-1 gap-2 ${freeLessons.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {freeLessons.map((lesson, i) => (
                <Link
                  key={lesson.id}
                  href={`/${courseSlug}/${lesson.id}`}
                  className={`flex min-h-12 min-w-0 items-center justify-between gap-2 rounded-control px-4 text-label font-semibold transition-colors ${
                    i === 0 ? "bg-ink text-surface hover:opacity-90" : "border border-line text-ink hover:bg-sunken"
                  }`}
                >
                  <span className="min-w-0 truncate">{nameOutsideChapter(lesson.presentation)}</span>
                  <span className="shrink-0" aria-hidden>→</span>
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
        {filterButton("all", "전체", totalLessons)}
        {filterButton("bookmarked", "북마크", bookmarkCount)}
        {filterButton("incomplete", "미완료", Math.max(0, totalLessons - completedCount))}
      </div>

      {/* Sections */}
      {filteredSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-line p-10 text-center">
          <p className="text-label font-semibold text-ink">
            {filter === "bookmarked" ? "아직 북마크한 강의가 없어요." : "조건에 맞는 강의가 없어요."}
          </p>
          <p className="max-w-sm text-caption text-ink-soft">
            {filter === "bookmarked"
              ? "다시 보고 싶은 강의에서 제목 옆 북마크를 눌러 보세요."
              : "모든 강의를 마쳤어요."}
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
            const studentChapter = isChapterCourse
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
            const chapterUnlocked = (!isChapterCourse && !isPassoff)
              || (!hasCourseAccess
                ? sectionIndex === 0
                : section.lessons.some((lesson, lessonIdx) =>
                    checkUnlocked(courseSlug, lesson.id, sectionIndex, lessonIdx),
                  ));
            const chapterComplete = Boolean(studentChapter?.complete) || Boolean(passoffState?.complete);
            const chapterPercent = studentChapter?.percent ?? passoffState?.percent ?? shownPercent(completedInSection, section.lessons.length);
            const isLife = licenseInfo?.plan === "LIFE";
            /**
             * PASS-OFF GRAMMAR's lock words: each locked row '대주제 2를 마치면 열림' (as STUDENT's row '앞 장을 마치면 열림'), the topic
             * line '대주제 2를 마치면 열려요' (as STUDENT's '2장을 마치면 열려요' — 41번 해요체) — the particle as the number is read.
             * 4장 8: '대주제' — it read 'TOPIC 2를 …'.
             */
            const passoffPrevious = passoffTopicWithParticle(passoffPreviousTopic ?? sectionIndex, "을/를");
            const passoffLock = `${passoffPrevious} 마치면 열림`;
            // PASS-OFF GRAMMAR's line under the topic name — '강의' like every course (사장님 2026-09-28 "강의로 맞춰")
            const passoffNote = !isPassoff
              ? null
              : !hasCourseAccess
                ? sectionIndex === 0 ? "첫 두 강의 무료 체험" : "이용권 등록 후 열려요"
                : passoffChecking
                  ? "진도 확인 중…"
                  : !chapterUnlocked
                    ? `${passoffPrevious} 마치면 열려요`
                    : chapterComplete
                      ? "대주제 완료"
                      : passoffState && !passoffProgress?.everyTopicOpen
                        ? `진행 ${chapterPercent}% · 강의 ${passoffState.requiredCount}개와 마지막 강의${passoffProgress?.mapRefillRequired ? ", 구성도 다시 채우기를" : "를"} 마치면 다음 대주제`
                        // UI검토-1007 33번: every topic open (LIFE) — '진행 0%' said what '0/3' beside it says; STUDENT's LIFE line is empty too
                        : null;
            const studentNote = !isChapterCourse
              ? null
              : !hasCourseAccess
                ? sectionIndex === 0 ? "1·2강 무료" : "이용권 등록 후 열려요"
                : !chapterUnlocked
                  ? `${sectionIndex}장을 마치면 열려요` // STU-U28: '{n}장을' — '챕터 {n}을(를)' read wrong · 41번 해요체
                  : chapterComplete
                    ? "이 장 완료"
                    : isLife || !studentChapter
                      ? null
                      : `진행 ${chapterPercent}% · ${studentChapter.requiredCount}강과 마지막 강의를 마치면 다음 장`;
            // UI검토-1007 10번: the answer that decides this line (the licence, or STUDENT's · ADULT's chapter record) is on its
            // way — its place is kept empty instead of showing '이용권 등록 후 열립니다' or '1장을 마치면 열립니다' first
            const notePending = (isChapterCourse || isPassoff) && (licenseUnknown || chapterRecordPending);

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
                    {notePending ? (
                      <span className="mt-0.5 text-caption text-ink-soft" aria-hidden>{" "}</span>
                    ) : (
                      <>
                        {studentNote ? <span className="mt-0.5 text-caption text-ink-soft">{studentNote}</span> : null}
                        {passoffNote ? <span className="mt-0.5 text-caption text-ink-soft">{passoffNote}</span> : null}
                      </>
                    )}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-caption tabular-nums text-ink-soft">
                    {!notePending && (isChapterCourse || (isPassoff && !passoffChecking)) && !chapterUnlocked ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="잠김">
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    ) : null}
                    <span className={notePending || countsPending ? "invisible" : ""}>{completedInSection}/{section.lessons.length}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-line">
                    {isChapterCourse && chapterUnlocked && !notePending && (
                      <ChapterAudioBar
                        chapterNumber={chapterNumber}
                        chapterUnlocked={chapterUnlocked}
                        previewOnly={!hasCourseAccess && sectionIndex === 0}
                        totalLessons={section.lessons.length}
                        course={courseSlug === "adult" ? "adult" : "student"}
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
                        const sequentialLock = (isChapterCourse || isPassoff) && hasCourseAccess && !isUnlocked;
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
                            pending={licenseUnknown || notePending}
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
