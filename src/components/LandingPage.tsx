"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Tab } from "@/lib/types";
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
  const [scrollActive, setScrollActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIdxRef = useRef(0);
  const isAnimatingRef = useRef(false);

  // Synchronize activeIdxRef whenever scrollActive changes
  useEffect(() => {
    activeIdxRef.current = scrollActive;
  }, [scrollActive]);

  const scrollToTab = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const targetIdx = Math.min(Math.max(index, 0), tabs.length - 1);
    activeIdxRef.current = targetIdx;
    setScrollActive(targetIdx);
    el.scrollTo({
      top: targetIdx * el.clientHeight,
      behavior: "smooth",
    });
  };

  // Strictly advance or retreat one section at a time on desktop wheel, mobile touch swipe, and keyboard
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cooldownTimer: ReturnType<typeof setTimeout> | null = null;
    let wheelDelta = 0;
    let wheelResetTimer: ReturnType<typeof setTimeout> | null = null;

    function handleNavigate(direction: 1 | -1) {
      if (isAnimatingRef.current) return;
      const current = activeIdxRef.current;
      const next = Math.min(Math.max(current + direction, 0), tabs.length - 1);
      if (next === current) return;

      isAnimatingRef.current = true;
      activeIdxRef.current = next;
      setScrollActive(next);

      el?.scrollTo({
        top: next * el.clientHeight,
        behavior: "smooth",
      });

      if (cooldownTimer) clearTimeout(cooldownTimer);
      cooldownTimer = setTimeout(() => {
        isAnimatingRef.current = false;
      }, 700);
    }

    function onWheel(e: WheelEvent) {
      if (!el) return;
      e.preventDefault();

      if (isAnimatingRef.current) return;

      wheelDelta += e.deltaY;

      if (wheelResetTimer) clearTimeout(wheelResetTimer);
      wheelResetTimer = setTimeout(() => {
        wheelDelta = 0;
      }, 150);

      // Require a decisive wheel gesture (threshold 20px)
      if (Math.abs(wheelDelta) >= 20) {
        const direction = wheelDelta > 0 ? 1 : -1;
        wheelDelta = 0;
        handleNavigate(direction);
      }
    }

    // Touch swipe support for mobile
    let touchStartY = 0;
    let touchStartX = 0;
    let touchStartTime = 0;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      touchStartY = e.touches[0].clientY;
      touchStartX = e.touches[0].clientX;
      touchStartTime = Date.now();
    }

    function onTouchEnd(e: TouchEvent) {
      if (!el || isAnimatingRef.current) return;
      if (e.changedTouches.length !== 1) return;

      const dy = touchStartY - e.changedTouches[0].clientY;
      const dx = touchStartX - e.changedTouches[0].clientX;
      const dt = Date.now() - touchStartTime;

      if (Math.abs(dy) >= 30 && Math.abs(dy) > Math.abs(dx) * 1.2 && dt < 800) {
        const direction = dy > 0 ? 1 : -1;
        handleNavigate(direction);
      }
    }

    // Keyboard arrow keys
    function onKeyDown(e: KeyboardEvent) {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !e.shiftKey)) {
        e.preventDefault();
        handleNavigate(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp" || (e.key === " " && e.shiftKey)) {
        e.preventDefault();
        handleNavigate(-1);
      }
    }

    function onResize() {
      if (!el) return;
      el.scrollTo({
        top: activeIdxRef.current * el.clientHeight,
        behavior: "instant",
      });
    }

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      if (cooldownTimer) clearTimeout(cooldownTimer);
      if (wheelResetTimer) clearTimeout(wheelResetTimer);
    };
  }, [tabs.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (!el.clientHeight) return;
    const idx = Math.round(el.scrollTop / el.clientHeight);
    if (idx >= 0 && idx < tabs.length) {
      activeIdxRef.current = idx;
      if (idx !== scrollActive) {
        setScrollActive(idx);
      }
    }
  };

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-surface text-ink antialiased select-none">
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 z-30 flex shrink-0 items-center justify-between border-b border-line/60 bg-surface/80 px-5 py-3.5 backdrop-blur-md sm:px-12 sm:py-4">
        <div
          className="text-[14px] sm:text-[15px] font-semibold tracking-[0.14em] text-ink"
          style={{ fontFamily: '"Open Sans", var(--font-sans)' }}
        >
          K-IG 교육
        </div>
      </header>

      {/* Main Snap-Scroll Section Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative h-full w-full overflow-y-auto select-text overscroll-y-contain no-scrollbar"
        style={{
          scrollSnapType: "y mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((tab, i) => (
          <section
            key={tab.slug}
            className="relative flex h-full min-h-full w-full flex-col justify-center overflow-hidden border-b border-line px-6 sm:px-[9vw] pt-16 pb-14 sm:py-0 snap-start snap-always"
            style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
          >
            <SectionPhoto slug={tab.slug} priority={i < 2} />

            <div
              className="relative z-10 max-w-[680px]"
              style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
            >
              <div className="mb-3 sm:mb-4 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-white/80 dark:bg-white/10 backdrop-blur-md px-3 sm:px-3.5 py-0.5 sm:py-1 font-mono text-[10.5px] sm:text-[11.5px] font-semibold tracking-widest text-primary uppercase shadow-2xs">
                <span>STAGE {tab.num}</span>
                <span className="text-primary/40">·</span>
                <span>CURRICULUM</span>
              </div>

              {(() => {
                const targetCourse = tab.courseDetails[0]?.slug ?? tab.courses[0];
                return (
                  <>
                    <h2 className="text-[clamp(32px,8vw,78px)] font-bold leading-[1.06] tracking-[-0.03em] text-ink text-balance">
                      <Link
                        href={`/${targetCourse}`}
                        className="transition-all duration-300 hover:opacity-85"
                      >
                        {tab.label}
                      </Link>
                    </h2>

                    {tab.blurb ? (
                      <p className="mt-2.5 sm:mt-4 max-w-[560px] text-[14px] sm:text-[clamp(16px,2vw,22px)] font-normal leading-relaxed tracking-tight text-ink-soft">
                        {tab.blurb}
                      </p>
                    ) : null}

                    <div className="mt-5 sm:mt-8 flex items-center gap-4">
                      <Link
                        href={`/${targetCourse}`}
                        className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-6 sm:px-8 py-3 sm:py-3.5 text-[14px] sm:text-[15px] font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#222126] hover:shadow-xl active:scale-[0.98] border border-white/10 shadow-md"
                      >
                        <span>학습 시작하기</span>
                        <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                      </Link>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Mobile & Desktop Next Indicator */}
            {i < tabs.length - 1 && (
              <button
                type="button"
                onClick={() => scrollToTab(i + 1)}
                aria-label="다음 코스로 이동"
                className="absolute bottom-3.5 sm:bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-0.5 text-ink-faint hover:text-primary transition-colors cursor-pointer select-none"
              >
                <span className="font-mono text-[9px] font-bold tracking-[0.2em] text-primary/70 uppercase">
                  NEXT
                </span>
                <span className="text-[13px] animate-bounce text-primary leading-none">↓</span>
              </button>
            )}
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
                  ? "scale-140 bg-primary ring-2 ring-primary/25"
                  : "bg-ink/20 hover:scale-120 hover:bg-ink-soft")
              }
            />
          );
        })}
      </nav>
    </div>
  );
}
