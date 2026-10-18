"use client";

import { useEffect, useState } from "react";
import { CourseDashboard, type DashboardSection } from "./CourseDashboard";
import { useProgress } from "./ProgressProvider";

export interface LectureSectionItem {
  key: string;
  title: string;
  /** "lesson": opens lecture by lecture (뼈대세우기 · 문장구조론 · 알파오메가) · "chapter": by chapters of 10 (영어독해) */
  gate: "lesson" | "chapter";
  /** the lectures' total length, seconds */
  seconds: number;
  /** its list, as CourseDashboard draws it (영어독해: its 20 chapters; the others: one list) */
  sections: DashboardSection[];
}

/**
 * LECTURE's list (사장님 2026-10-19): four sections — 뼈대세우기 · 문장구조론 · 알파오메가 · 영어독해 — and a click on one shows
 * its lectures, drawn by the same CourseDashboard as every course list. The chosen section is in the address (#lb · #ls ·
 * #la · #reading), so BACK from a lecture returns to its list, and '← 전체 과정' goes back to the four.
 */
export function LectureSections({ items, licenseHint }: { items: LectureSectionItem[]; licenseHint: boolean }) {
  const { isCompleted } = useProgress();
  const [chosen, setChosen] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const key = window.location.hash.slice(1);
      setChosen(items.some((s) => s.key === key) ? key : null);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [items]);

  const choose = (key: string | null) => {
    // the address keeps the choice (BACK from a lecture comes back to this list); no history entry per click
    window.history.replaceState(window.history.state, "", key ? `#${key}` : window.location.pathname + window.location.search);
    setChosen(key);
    window.scrollTo({ top: 0 });
  };

  const section = items.find((s) => s.key === chosen);
  if (section) {
    const total = section.sections.reduce((n, s) => n + s.lessons.length, 0);
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={() => choose(null)}
            className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-raised hover:text-ink"
          >
            <span aria-hidden>←</span>
            <span>전체 과정</span>
          </button>
          <h2 className="text-title font-bold tracking-tight text-ink">{section.title}</h2>
          <p className="text-caption text-ink-soft tabular-nums">
            {total}개 강의{section.gate === "chapter" ? ` · ${section.sections.length}장` : ""} · {formatHours(section.seconds)}
          </p>
        </div>
        <CourseDashboard
          key={section.key}
          courseSlug="lecture"
          sections={section.sections}
          totalLessons={total}
          licenseHint={licenseHint}
          lectureSteps={section.gate === "lesson"}
        />
      </div>
    );
  }

  return (
    <nav aria-label="LECTURE 과정" className="flex flex-col gap-3">
      {items.map((s) => {
        const ids = s.sections.flatMap((x) => x.lessons.map((l) => l.id));
        const done = ids.filter((id) => isCompleted("lecture", id)).length;
        return (
          <a
            key={s.key}
            href={`#${s.key}`}
            onClick={(e) => {
              e.preventDefault();
              choose(s.key);
            }}
            className="flex min-h-16 items-center gap-3 rounded-card border border-line bg-raised px-4 py-3.5 transition-colors hover:bg-sunken"
          >
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="text-body font-semibold text-ink">{s.title}</span>
              <span className="mt-0.5 text-caption text-ink-soft tabular-nums">
                {ids.length}개 강의 · {formatHours(s.seconds)} · 1·2강 무료
              </span>
            </span>
            <span className="shrink-0 text-caption tabular-nums text-ink-soft">
              {done}/{ids.length}
            </span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-ink-soft">
              <path d="M9 6l6 6-6 6" />
            </svg>
          </a>
        );
      })}
    </nav>
  );
}

/** 4,312 s → '1시간 12분' · 1,500 s → '25분' */
function formatHours(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h}시간${m ? ` ${m}분` : ""}` : `${m}분`;
}
