"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useProgress } from "./ProgressProvider";
import type { LessonPresentation } from "@/lib/curriculumPresentation";

export interface DashboardLessonItem {
  id: string;
  presentation: LessonPresentation;
}

export interface DashboardSection {
  label: string;
  lessons: DashboardLessonItem[];
}

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
  const [filter, setFilter] = useState<"all" | "bookmarked" | "incomplete">("all");

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

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    sections.forEach((s) => (next[s.label] = true));
    setOpenSections(next);
  };

  const collapseAll = () => {
    const next: Record<string, boolean> = {};
    sections.forEach((s) => (next[s.label] = false));
    setOpenSections(next);
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Course Progress Dashboard Card */}
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Course Progress & Management
            </span>
            <h2 className="text-[17px] font-bold text-ink mt-0.5">
              학습 진도율: {completedCount} / {totalLessons}개 완료 ({progressPercent}%)
            </h2>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                filter === "all"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              전체 보기 ({totalLessons})
            </button>
            <button
              type="button"
              onClick={() => setFilter("bookmarked")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium flex items-center gap-1 ${
                filter === "bookmarked"
                  ? "bg-surface text-amber-600 dark:text-amber-400 font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              <span>★ 북마크만</span>
              <span>({bookmarkCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilter("incomplete")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                filter === "incomplete"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              미완료만 ({Math.max(0, totalLessons - completedCount)})
            </button>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-raised rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
          />
        </div>
      </div>

      {/* Sections and Quick Controls */}
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
          {/* Quick Jump & Expand/Collapse Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-semibold uppercase text-ink-faint mr-1">
                커리큘럼 단계 ({filteredSections.length}개):
              </span>
              {filteredSections.map((sec, i) => {
                const isOpen = openSections[sec.label] ?? false;
                return (
                  <button
                    key={`pill-${i}`}
                    type="button"
                    onClick={() => {
                      setOpenSections((prev) => ({ ...prev, [sec.label]: true }));
                      const el = document.getElementById(`section-${i}`);
                      if (el) {
                        el.scrollIntoView({ behavior: "smooth", block: "start" });
                      }
                    }}
                    className={`rounded-lg px-2.5 py-1 font-mono text-[11.5px] transition-all cursor-pointer border ${
                      isOpen
                        ? "border-primary/40 bg-primary/10 text-primary font-medium"
                        : "border-line bg-surface text-ink-soft hover:border-ink-soft hover:text-ink"
                    }`}
                  >
                    {sec.label.split(" (")[0].replace(/^Section\s*\d+\s*·\s*/, "")}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={expandAll}
                className="text-[11.5px] text-ink-soft hover:text-ink cursor-pointer font-medium hover:underline"
              >
                모두 펼치기
              </button>
              <span className="text-line text-xs">|</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-[11.5px] text-ink-soft hover:text-ink cursor-pointer font-medium hover:underline"
              >
                모두 접기
              </button>
            </div>
          </div>

          {/* Accordion List */}
          <div className="flex flex-col gap-4">
            {filteredSections.map((section, index) => {
              const isOpen = openSections[section.label] ?? false;
              const completedInSection = section.lessons.filter((l) =>
                isCompleted(courseSlug, l.id),
              ).length;

              return (
                <div
                  key={`${index}-${section.label}`}
                  id={`section-${index}`}
                  className="rounded-2xl border border-line bg-surface shadow-2xs overflow-hidden transition-all duration-200 scroll-mt-24"
                >
                  {/* Clickable Section Accordion Header */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.label)}
                    className="w-full flex items-center justify-between p-4.5 text-left hover:bg-raised/50 transition-colors cursor-pointer select-none"
                    aria-expanded={isOpen}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line font-mono text-[12px] font-bold transition-transform duration-200 ${
                          isOpen ? "rotate-90 bg-primary/10 text-primary border-primary/30" : "bg-raised text-ink-soft"
                        }`}
                      >
                        ▶
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-[15px] text-ink flex items-center gap-2">
                          {section.label}
                        </span>
                        <span className="font-mono text-[11px] text-ink-faint mt-0.5">
                          총 {section.lessons.length}개 레슨
                          {completedInSection > 0 && (
                            <span className="text-emerald-600 font-semibold ml-2">
                              · {completedInSection}개 완료
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[12px] font-medium text-ink-soft hidden sm:inline">
                        {isOpen ? "접기 ▲" : "클릭하여 펼치기 ▼"}
                      </span>
                    </div>
                  </button>

                  {/* Section Content Grid */}
                  {isOpen && (
                    <div className="border-t border-line/70 p-4 sm:p-5 bg-raised/20 animate-fade-in">
                      <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {section.lessons.map((lesson) => {
                          const pres = lesson.presentation;
                          const isDone = isCompleted(courseSlug, lesson.id);
                          const isStarred = isBookmarked(courseSlug, lesson.id);

                          return (
                            <li key={lesson.id}>
                              <div
                                className={`group relative flex h-full flex-col justify-between gap-2.5 rounded-xl border p-3.5 transition-all duration-200 hover:shadow-xs ${
                                  isDone
                                    ? "border-emerald-500/40 bg-emerald-500/[0.03] hover:border-emerald-500"
                                    : "border-line bg-surface hover:border-ink hover:bg-raised/60"
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-1.5">
                                    <span className="font-mono text-[11px] font-semibold text-primary tracking-wide">
                                      {pres.code}
                                    </span>
                                    <div className="flex items-center gap-1.5">
                                      {isDone && (
                                        <span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                                          ✓ 완료
                                        </span>
                                      )}
                                      {pres.badge && (
                                        <span className="rounded-md bg-raised px-1.5 py-0.5 text-[10px] font-medium text-ink-soft">
                                          {pres.badge}
                                        </span>
                                      )}
                                      {/* Quick Bookmark Toggle on card */}
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          toggleBookmark(courseSlug, lesson.id);
                                        }}
                                        title={isStarred ? "북마크 해제" : "북마크 추가"}
                                        aria-label={isStarred ? "북마크 해제" : "북마크 추가"}
                                        className="-m-1 p-1 cursor-pointer transition-transform active:scale-90"
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
                                    className="text-[13.5px] font-semibold leading-snug text-ink hover:underline focus:outline-none"
                                  >
                                    {pres.title}
                                  </Link>

                                  {pres.subtitle && (
                                    <span className="text-[11.5px] text-ink-soft line-clamp-1">
                                      {pres.subtitle}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center justify-between border-t border-line/50 pt-2 font-mono text-[10.5px] text-ink-faint">
                                  <span className="tabular-nums">{lesson.id}</span>
                                  <Link
                                    href={`/${courseSlug}/${lesson.id}`}
                                    className="transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink font-medium"
                                  >
                                    학습하기 →
                                  </Link>
                                </div>
                              </div>
                            </li>
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
