"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Tab } from "@/lib/types";
import { useProgress } from "./ProgressProvider";
import { SearchDialog } from "./SearchDialog";
import { TAB_IMAGES } from "@/lib/tabImages";

interface CourseDetail {
  slug: string;
  title: string;
  titleEn: string;
  description: string;
  kind?: string;
}

export interface LandingTab extends Tab {
  n: number;
  num: string;
  courseDetails: CourseDetail[];
}

/**
 * Section background photo. Renders the 20px blurred placeholder immediately,
 * then crossfades in the full photo once it has loaded — so the section never
 * shows a blank/white flash while the image is still downloading.
 */
function SectionPhoto({ slug, priority }: { slug: string; priority?: boolean }) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const img = TAB_IMAGES[slug];

  // A cached or already-decoded image can finish loading before React attaches
  // its onLoad handler during hydration, which would leave it stuck at opacity 0.
  useEffect(() => {
    if (imgRef.current?.complete) setLoaded(true);
  }, []);

  if (!img) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-raised">
      <img
        src={img.tiny}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "blur(18px)", transform: "scale(1.08)" }}
      />
      <img
        ref={imgRef}
        src={img.src}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
        style={{ opacity: loaded ? 1 : 0 }}
      />
      {/* Legibility scrim: text sits on the left, so fade the photo out toward that edge. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, var(--surface) 0%, color-mix(in srgb, var(--surface) 82%, transparent) 42%, color-mix(in srgb, var(--surface) 15%, transparent) 78%)",
        }}
      />
    </div>
  );
}

export function LandingPage({ tabs }: { tabs: LandingTab[] }) {
  const { recent } = useProgress();

  const [scrollActive, setScrollActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // One wheel gesture moves one whole section. Without this a 100vh section
  // creeps a few pixels per notch and the snap keeps pulling it back, which is
  // what makes wheel scrolling feel slow.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let locked = false;
    let timer: ReturnType<typeof setTimeout>;

    function onWheel(e: WheelEvent) {
      if (!el) return;
      e.preventDefault();
      if (locked) return;
      if (Math.abs(e.deltaY) < 2) return;

      const height = el.clientHeight;
      const current = Math.round(el.scrollTop / height);
      const next = Math.min(Math.max(current + (e.deltaY > 0 ? 1 : -1), 0), tabs.length - 1);
      if (next === current) return;

      locked = true;
      el.scrollTo({ top: next * height, behavior: "smooth" });
      timer = setTimeout(() => {
        locked = false;
      }, 300);
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      clearTimeout(timer);
    };
  }, [tabs.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.clientHeight) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx !== scrollActive && idx >= 0 && idx < tabs.length) {
      setScrollActive(idx);
    }
  };

  const scrollToTab = (index: number) => {
    if (!containerRef.current) return;
    containerRef.current.scrollTo({
      top: index * containerRef.current.clientHeight,
      behavior: "smooth",
    });
  };

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-surface text-ink antialiased select-none">
      {/* Top Header */}
      <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-line bg-surface/90 px-6 py-4 backdrop-blur-sm sm:px-12">
        <div
          className="text-[15px] font-semibold tracking-[0.14em] text-ink"
          style={{ fontFamily: '"Open Sans", var(--font-sans)' }}
        >
          K-IG 교육
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {recent ? (
            <Link
              href={`/${recent.course}/${recent.lessonId}`}
              className="group flex items-center gap-2 rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-[12px] font-medium text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition-all duration-300 shadow-2xs"
            >
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-ink-soft group-hover:text-ink transition-colors hidden sm:inline">최근 학습:</span>
              <span className="font-mono text-[11.5px] font-semibold">{recent.courseTitle || recent.course} · {recent.lessonId}</span>
              <span className="text-ink-faint group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          ) : null}

          <SearchDialog />
        </div>
      </header>

      {/* Main Snap-Scroll Section Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto snap-y snap-mandatory select-text"
        style={{ scrollSnapType: "y mandatory", overscrollBehaviorY: "contain" }}
      >
        {tabs.map((tab, i) => (
          <section
            key={tab.slug}
            className="relative flex h-full min-h-full w-full flex-col justify-center overflow-hidden border-b border-line px-[9vw] snap-start"
            style={{ scrollSnapAlign: "start" }}
          >
            <SectionPhoto slug={tab.slug} priority={i < 2} />

            <div
              className="relative z-10 max-w-[680px]"
              style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
            >
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 backdrop-blur-md px-3 py-1 font-mono text-[12px] font-semibold tracking-widest text-ink-soft uppercase shadow-2xs">
                <span>STAGE {tab.num}</span>
                <span className="text-ink-faint">·</span>
                <span>CURRICULUM</span>
              </div>

              {(() => {
                const targetCourse = tab.courseDetails[0]?.slug ?? tab.courses[0];
                return (
                  <>
                    <h2 className="text-[clamp(56px,7.5vw,92px)] font-bold leading-[1.04] tracking-[-0.03em] text-ink">
                      <Link
                        href={`/${targetCourse}`}
                        className="transition-all duration-300 hover:opacity-85"
                      >
                        {tab.label}
                      </Link>
                    </h2>

                    {tab.blurb ? (
                      <p className="mt-4 max-w-[560px] text-[clamp(16px,2vw,22px)] font-normal leading-relaxed tracking-tight text-ink-soft">
                        {tab.blurb}
                      </p>
                    ) : null}

                    <div className="mt-8 flex items-center gap-4">
                      <Link
                        href={`/${targetCourse}`}
                        className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-8 py-3.5 text-[16px] font-medium tracking-wide text-white transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                      >
                        <span>학습 시작하기</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>
          </section>
        ))}
      </div>

      {/* Right Side Dots Navigation */}
      <nav
        aria-label="Section Navigation"
        className="pointer-events-auto absolute top-1/2 right-5 z-20 flex -translate-y-1/2 flex-col gap-2.5 sm:right-7"
      >
        {tabs.map((tab, idx) => {
          const isActive = scrollActive === idx;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => scrollToTab(idx)}
              aria-label={`Scroll to section ${tab.num} (${tab.label})`}
              className={
                "h-[7px] w-[7px] cursor-pointer rounded-full border-none p-0 transition-[transform,background-color] duration-200 " +
                (isActive
                  ? "scale-140 bg-ink"
                  : "bg-line hover:scale-120 hover:bg-ink-soft")
              }
            />
          );
        })}
      </nav>
    </div>
  );
}
