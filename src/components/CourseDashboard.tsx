"use client";

import { useMemo, useState, memo, useCallback } from "react";
import Link from "next/link";
import { useProgress } from "./ProgressProvider";
import { useLicense } from "./LicenseProvider";
import { isFreePreviewLesson } from "@/lib/license";
import type { LessonPresentation } from "@/lib/curriculumPresentation";

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
  hasActiveLicense,
  onToggleBookmark,
}: {
  lesson: DashboardLessonItem;
  courseSlug: string;
  isDone: boolean;
  isStarred: boolean;
  isUnlocked: boolean;
  isFree: boolean;
  hasActiveLicense: boolean;
  onToggleBookmark: (courseSlug: string, lessonId: string) => void;
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
            ? "border-emerald-500/30 bg-white shadow-2xs hover:border-emerald-500/60"
            : "border-black/[0.06] bg-white shadow-2xs hover:border-black/20"
        }`}
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-1.5">
            <span className="font-mono text-[11px] font-bold text-gray-900 tracking-wider">
              {pres.code}
            </span>
            <div className="flex items-center gap-1.5">
              {isDone && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                  ✓ 완료
                </span>
              )}
              {!isUnlocked ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-black/8 bg-black/[0.03] px-2 py-0.5 font-mono text-[9.5px] font-medium text-ink-faint">
                  <span>🔒</span>
                  <span>{courseSlug === "student" ? "STUDENT" : "올패스"}</span>
                </span>
              ) : !hasActiveLicense && isFree ? (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.06] px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                  <span>무료 체험</span>
                </span>
              ) : null}
              {pres.badge && (
                <span className="rounded-full bg-black/[0.04] px-2 py-0.5 text-[10px] font-medium text-ink-soft">
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
            className="text-[14px] font-semibold leading-snug text-ink group-hover:text-black transition-colors focus:outline-none"
          >
            {pres.title}
          </Link>

          {pres.subtitle && (
            <span className="text-[12px] text-ink-soft line-clamp-1">
              {pres.subtitle}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-black/[0.05] pt-2.5 font-mono text-[10.5px] text-ink-faint">
          <span className="tabular-nums">{lesson.id}</span>
          <Link
            href={`/${courseSlug}/${lesson.id}`}
            scroll={true}
            className="inline-flex items-center gap-1 font-medium text-ink-soft group-hover:text-ink transition-all group-hover:translate-x-0.5"
          >
            <span>{!isUnlocked ? (courseSlug === "student" ? "수강권 열람" : "올패스 열람") : "학습하기"}</span>
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
  const { completed, bookmarks, toggleBookmark, isCompleted, isBookmarked } = useProgress();
  const { hasActiveLicense, isUnlocked: checkUnlocked } = useLicense();
  const [filter, setFilter] = useState<"all" | "bookmarked" | "incomplete">("all");

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
    if (filter === "all") return sections;

    return sections
      .map((sec) => ({
        ...sec,
        lessons: sec.lessons.filter((l) => {
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
      {/* Course Progress Dashboard Card - Apple Glass / Clean Depth */}
      <div className="rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-gray-50/70 p-4.5 sm:p-7 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4 sm:gap-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Course Progress & Analytics
            </div>
            <h2 className="text-[17px] sm:text-[20px] font-bold text-ink tracking-tight mt-1">
              학습 진도율: <span className="text-emerald-600">{completedCount}</span> / {totalLessons}개 완료 <span className="text-ink-faint text-[14px] sm:text-[16px] font-normal">({progressPercent}%)</span>
            </h2>
          </div>

          {/* Apple-style Segmented Control Filter Pills */}
          <div className="w-full sm:w-auto grid grid-cols-3 sm:flex items-center rounded-full border border-black/[0.08] bg-black/[0.03] p-1 text-[11.5px] sm:text-[12.5px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-2.5 sm:px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer font-medium text-center ${
                filter === "all"
                  ? "bg-white text-ink font-semibold shadow-xs"
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
                  ? "bg-white text-amber-600 font-semibold shadow-xs"
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
                  ? "bg-white text-ink font-semibold shadow-xs"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              미완료 ({Math.max(0, totalLessons - completedCount)})
            </button>
          </div>
        </div>

        {/* Apple-style Smooth Rounded Progress Bar */}
        <div className="w-full bg-black/[0.05] rounded-full h-2.5 overflow-hidden p-0.5">
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
            {filteredSections.map((section, index) => {
              const isOpen = openSections[section.label] ?? false;
              const completedInSection = section.lessons.filter((l) =>
                isCompleted(courseSlug, l.id),
              ).length;

              return (
                <div
                  key={`${index}-${section.label}`}
                  id={`section-${index}`}
                  className="rounded-3xl border border-black/[0.06] bg-white shadow-2xs overflow-hidden transition-all duration-200 scroll-mt-24"
                >
                  {/* Clickable Section Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/[0.08] font-mono text-[11px] font-bold transition-all duration-300 ${
                          isOpen ? "rotate-90 bg-ink text-white" : "bg-black/[0.03] text-ink-soft"
                        }`}
                      >
                        ▶
                      </div>
                      <div className="flex flex-col">
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-black/[0.06] bg-black/[0.02] px-3 py-1 text-[11.5px] font-medium text-ink-soft hidden sm:inline">
                        {isOpen ? "접기 ▲" : "펼치기 ▼"}
                      </span>
                    </div>
                  </button>

                  {/* Section Content Grid */}
                  {isOpen && (
                    <div className="border-t border-black/[0.06] p-4 sm:p-6 bg-gray-50/50">
                      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {section.lessons.map((lesson, lessonIdx) => {
                          const isDone = isCompleted(courseSlug, lesson.id);
                          const isStarred = isBookmarked(courseSlug, lesson.id);
                          const isFree = isFreePreviewLesson(courseSlug, lesson.id, index, lessonIdx);
                          const isUnlocked = checkUnlocked(courseSlug, lesson.id, index, lessonIdx);

                          return (
                            <DashboardLessonCard
                              key={lesson.id}
                              lesson={lesson}
                              courseSlug={courseSlug}
                              isDone={isDone}
                              isStarred={isStarred}
                              isUnlocked={isUnlocked}
                              isFree={isFree}
                              hasActiveLicense={hasActiveLicense}
                              onToggleBookmark={handleToggleBookmark}
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
