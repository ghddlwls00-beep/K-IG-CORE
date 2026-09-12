"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import type { GvaLesson } from "@/lib/gva";
import { useLicense } from "@/components/LicenseProvider";

interface GvaDashboardProps {
  lessons: GvaLesson[];
}

type FilterType = "all" | "middle" | "high";

interface ChapterGroup {
  chapter: number;
  label: string;
  range: string;
  subtopic: string;
  enSubtopic: string;
  description: string;
  level: "middle" | "high";
  levelLabel: string;
  lessons: GvaLesson[];
  totalDurationSeconds: number;
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}시간 ${m}분`;
  return `${m}분`;
}

export function GvaDashboard({ lessons }: GvaDashboardProps) {
  const { hasActiveLicense, licenseInfo, openModal } = useLicense();
  const hasGvaAccess = hasActiveLicense && !licenseInfo?.isStudentOnly;
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  // Expanded chapters set (default: all closed)
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(() => new Set());

  const toggleChapter = (chapterNum: number) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterNum)) {
        next.delete(chapterNum);
      } else {
        next.add(chapterNum);
      }
      return next;
    });
  };

  // Group lessons into 20 chapters of 10 reading lectures each.
  const chapterGroups = useMemo<ChapterGroup[]>(() => {
    const map = new Map<number, GvaLesson[]>();
    for (let ch = 1; ch <= 20; ch++) {
      map.set(ch, []);
    }

    for (const l of lessons) {
      const ch = Math.ceil(l.number / 10);
      if (ch >= 1 && ch <= 20) {
        map.get(ch)!.push(l);
      }
    }

    const groups: ChapterGroup[] = [];
    for (let ch = 1; ch <= 20; ch++) {
      const chapterLessons = map.get(ch) || [];
      const first = chapterLessons[0];
      const start = (ch - 1) * 10 + 1;
      const end = ch * 10;
      const isHigh = ch > 10;
      const totalSeconds = chapterLessons.reduce((acc, cur) => acc + (cur.durationSeconds || 0), 0);

      groups.push({
        chapter: ch,
        label: `CHAPTER ${String(ch).padStart(2, "0")}`,
        range: `${start}~${end}강`,
        subtopic: first?.chapterSubtopic || `영어독해 ${start}~${end}강`,
        enSubtopic: first?.chapterEnSubtopic || "English Reading Lecture",
        description: first?.chapterDesc || "교재 지문과 실제 강의 음성을 함께 학습하는 독해 직강",
        level: isHigh ? "high" : "middle",
        levelLabel: isHigh ? "고등 영어독해" : "중등 영어독해",
        lessons: chapterLessons,
        totalDurationSeconds: totalSeconds,
      });
    }

    return groups;
  }, [lessons]);

  // Filter chapters based on level tab and search query
  const filteredChapters = useMemo(() => {
    return chapterGroups
      .map((group) => {
        if (filter === "middle" && group.level !== "middle") return null;
        if (filter === "high" && group.level !== "high") return null;

        // If search query is present, filter lessons inside the chapter
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesChapter =
            group.subtopic.toLowerCase().includes(q) ||
            group.label.toLowerCase().includes(q) ||
            group.range.includes(q);

          if (matchesChapter) return group;

          const matchingLessons = group.lessons.filter((l) => {
            const matchesNum = String(l.number).includes(q);
            const matchesTitle = l.title.toLowerCase().includes(q);
            return matchesNum || matchesTitle;
          });

          if (matchingLessons.length === 0) return null;
          return {
            ...group,
            lessons: matchingLessons,
          };
        }

        return group;
      })
      .filter((g): g is ChapterGroup => g !== null);
  }, [chapterGroups, filter, searchQuery]);

  // Auto-expand chapters when searching, collapse when search cleared
  useEffect(() => {
    if (searchQuery.trim()) {
      setExpandedChapters(new Set(Array.from({ length: 20 }, (_, i) => i + 1)));
    } else {
      setExpandedChapters(new Set());
    }
  }, [searchQuery]);

  const allCount = lessons.length;

  return (
    <div className="flex flex-col gap-8">
      {/* Top Controls: Level filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-line pb-6">
        {/* Level Filter Tabs */}
        <div className="inline-flex rounded-xl border border-line bg-raised p-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              filter === "all"
                ? "bg-surface text-ink shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            전체 ({allCount}강)
          </button>
          <button
            type="button"
            onClick={() => setFilter("middle")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              filter === "middle"
                ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            중등 독해 (CH 01~10 · 1~100강)
          </button>
          <button
            type="button"
            onClick={() => setFilter("high")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              filter === "high"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            고등 독해 (CH 11~20 · 101~200강)
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="강의 번호 또는 주제 검색 (예: 5, 부사절)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink text-[12px] cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chapters Container */}
      <div className="flex flex-col gap-8">
        {filteredChapters.map((group) => {
          const isExpanded = expandedChapters.has(group.chapter);
          return (
            <section
              key={group.chapter}
              id={`chapter-${group.chapter}`}
              className="flex flex-col rounded-2xl border border-line bg-surface overflow-hidden shadow-xs transition-all duration-200"
            >
              {/* Chapter Header Banner */}
              <div
                onClick={() => toggleChapter(group.chapter)}
                className="flex items-center justify-between border-b border-line bg-raised/70 px-4 sm:px-6 py-4 cursor-pointer select-none hover:bg-raised transition-colors"
              >
                <div className="flex flex-col gap-1 max-w-[85%]">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    <span
                      className={`rounded-lg px-2.5 py-1 font-mono text-[12px] font-bold ${
                        group.level === "middle"
                          ? "bg-blue-500 text-white"
                          : "bg-amber-500 text-white"
                      }`}
                    >
                      {group.label}
                    </span>

                    <span className="text-[16px] sm:text-[17px] font-bold text-ink tracking-tight">
                      {group.subtopic}
                    </span>

                    <span className="rounded-full border border-line bg-surface px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft">
                      {group.range}
                    </span>

                    <span className="hidden sm:inline text-ink-faint">·</span>

                    <span className="font-mono text-[11.5px] text-ink-soft">
                      {group.lessons.length}개 강의 ({formatDuration(group.totalDurationSeconds)})
                    </span>
                  </div>

                  <p className="text-[12.5px] text-ink-soft leading-relaxed line-clamp-2 mt-0.5">
                    {group.description}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="hidden sm:inline font-mono text-[11.5px] text-ink-soft">
                    {isExpanded ? "접기" : "펼치기"}
                  </span>
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg border border-line bg-surface text-ink-soft text-[11px] transition-transform">
                    {isExpanded ? "▲" : "▼"}
                  </div>
                </div>
              </div>

              {/* 10-Lesson Grid Inside Chapter */}
              {isExpanded && (
                <div className="p-4 sm:p-6 bg-surface/50">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
                    {group.lessons.map((lesson) => {
                      const canAccess = lesson.number <= 2 || hasGvaAccess;
                      const cardClass = "group relative flex flex-col overflow-hidden rounded-xl border border-line bg-raised hover:border-ink/40 hover:shadow-md transition-all duration-200 text-left";
                      const content = (
                        <>
                        {/* Slide Thumbnail Preview */}
                        <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950/5 border-b border-line">
                          <img
                            src={lesson.slideUrl}
                            alt={lesson.title}
                            loading="lazy"
                            className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-0.5 text-[10.5px] font-bold text-zinc-900 shadow-sm">
                              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                                <polygon points="5 3 19 12 5 21 5 3" />
                              </svg>
                              {canAccess ? "재생" : "이용권 필요"}
                            </span>
                          </div>

                          {/* Lesson Number Tag on Top Left */}
                          <div className="absolute top-2 left-2">
                            <span className="rounded-md bg-black/60 backdrop-blur-xs px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                              {lesson.number}강
                            </span>
                          </div>
                        </div>

                        {/* Content Details */}
                        <div className="flex flex-1 flex-col justify-between p-3 gap-2">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[11px] font-bold text-ink">
                                지문 {lesson.passageNumber}번
                              </span>
                              <span className="font-mono text-[11px] text-ink-soft">
                                {lesson.durationFormatted}
                              </span>
                            </div>

                            <h3 className="text-[13px] font-bold text-ink group-hover:text-primary transition-colors line-clamp-1">
                              {lesson.title}
                            </h3>
                          </div>

                          <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11px] text-ink-soft font-mono">
                            <span className="text-primary font-medium">원문 + 강의</span>
                            <span className="font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                              {canAccess ? "수강 →" : "잠금 🔒"}
                            </span>
                          </div>
                        </div>
                        </>
                      );
                      return canAccess ? (
                        <Link key={lesson.id} href={`/gva/${lesson.number}`} className={cardClass}>
                          {content}
                        </Link>
                      ) : (
                        <button key={lesson.id} type="button" onClick={openModal} className={cardClass}>
                          {content}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {filteredChapters.length === 0 && (
          <div className="rounded-2xl border border-dashed border-line p-12 text-center text-ink-soft">
            검색 조건에 맞는 챕터 또는 강의가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
