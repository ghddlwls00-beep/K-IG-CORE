"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { GvaLesson } from "@/lib/gva";

interface GvaDashboardProps {
  lessons: GvaLesson[];
}

type FilterType = "all" | "middle" | "high";

export function GvaDashboard({ lessons }: GvaDashboardProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = useMemo(() => {
    return lessons.filter((l) => {
      if (filter === "middle" && l.level !== "middle") return false;
      if (filter === "high" && l.level !== "high") return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesNum = String(l.number).includes(q);
        const matchesTitle = l.title.toLowerCase().includes(q);
        return matchesNum || matchesTitle;
      }
      return true;
    });
  }, [lessons, filter, searchQuery]);

  return (
    <div className="flex flex-col gap-8">
      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-line pb-6">
        {/* Level Tabs */}
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
            전체 200강
          </button>
          <button
            type="button"
            onClick={() => setFilter("middle")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              filter === "middle"
                ? "bg-blue-500/15 text-blue-700 shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            중등 독해 (1~100강)
          </button>
          <button
            type="button"
            onClick={() => setFilter("high")}
            className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all cursor-pointer ${
              filter === "high"
                ? "bg-amber-500/15 text-amber-700 shadow-xs"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            고등 독해 (101~200강)
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative max-w-xs w-full">
          <input
            type="text"
            placeholder="강의 번호 검색 (예: 5, 102)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-line bg-surface px-4 py-2 text-[13px] text-ink placeholder:text-ink-faint focus:border-ink/40 focus:outline-none transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-soft hover:text-ink text-[12px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Lesson Count Summary */}
      <div className="flex items-center justify-between text-[13px] text-ink-soft font-mono">
        <span>검색 결과: 총 {filtered.length}개 강의</span>
        <span>교재 슬라이드 동기화 스트리밍</span>
      </div>

      {/* Lesson Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
        {filtered.map((lesson) => (
          <Link
            key={lesson.id}
            href={`/gva/${lesson.number}`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-raised hover:border-ink/30 hover:shadow-lg transition-all duration-200"
          >
            {/* Slide Thumbnail Preview */}
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-zinc-950/5 border-b border-line">
              <img
                src={lesson.slideUrl}
                alt={lesson.title}
                loading="lazy"
                className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1 text-[11px] font-bold text-zinc-900 shadow-md">
                  <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                  강의 재생하기
                </span>
              </div>
            </div>

            {/* Content Details */}
            <div className="flex flex-1 flex-col justify-between p-4 gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span
                    className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold ${
                      lesson.level === "middle"
                        ? "bg-blue-500/10 text-blue-600"
                        : "bg-amber-500/10 text-amber-600"
                    }`}
                  >
                    {lesson.levelLabel}
                  </span>
                  <span className="font-mono text-[11.5px] text-ink-soft">
                    {lesson.durationFormatted}
                  </span>
                </div>

                <h3 className="text-[15px] font-bold text-ink group-hover:text-primary transition-colors">
                  {lesson.title}
                </h3>
                <p className="text-[12px] text-ink-soft line-clamp-1">
                  강광진 원장 직강 · 지문 {lesson.passageNumber} 해설
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-line/60 pt-3 text-[12px] font-medium text-ink-soft group-hover:text-ink">
                <span>{lesson.instructor} 선생님</span>
                <span className="flex items-center gap-1 text-[11.5px] text-primary font-bold">
                  수강하기 →
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line p-12 text-center text-ink-soft">
          검색 조건에 맞는 강의가 없습니다.
        </div>
      )}
    </div>
  );
}
