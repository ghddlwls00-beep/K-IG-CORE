"use client";

import { useEffect, useRef, useState } from "react";
import { preload } from "react-dom";
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
 *
 * PERF-01: the photo is served as WebP at 640 or 1000 px wide (55–75% smaller
 * than the 1000×1250 JPEG the page used to send to every screen), with the
 * JPEG kept as the fallback. Only the first section is fetched eagerly and
 * preloaded; the rest wait until they are scrolled to, behind the placeholder.
 *
 * The FIRST photo is not faded in. The crossfade holds the image at opacity 0
 * until React's onLoad runs, and onLoad cannot run before hydration — so on a
 * slow phone the largest thing on the screen stayed invisible until every
 * script had downloaded and executed. Measured at 390px, 400 kbps, CPU ×4:
 * the WebP arrived in about a second, and LCP still landed at 11.7 s.
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
  const srcSet = `${img.webp640} 640w, ${img.webp1000} 1000w`;
  if (priority) {
    preload(img.src, { as: "image", fetchPriority: "high", imageSrcSet: srcSet, imageSizes: "100vw" });
  }
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-raised">
      <img
        src={img.tiny}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ filter: "blur(18px)", transform: "scale(1.08)" }}
      />
      <picture>
        <source type="image/webp" srcSet={srcSet} sizes="100vw" />
        <img
          ref={imgRef}
          src={img.src}
          alt=""
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
          style={{ opacity: loaded || priority ? 1 : 0 }}
        />
      </picture>
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
    isAnimatingRef.current = true;
    el.style.scrollSnapType = "none";
    el.scrollTo({
      top: targetIdx * el.clientHeight,
      behavior: "smooth",
    });
    setTimeout(() => {
      // back to the container's own snapping classes (mandatory on phones, proximity from md)
      if (el) el.style.scrollSnapType = "";
      isAnimatingRef.current = false;
    }, 600);
  };

  // 2026-09-27 (점검 FRAME-U13 · 사장님 "그냥 다로 해": 원래 슬라이드 그대로, 불편한 점만): the mouse wheel and
  // the arrow / space / page keys are no longer taken over to jump exactly one slide — on a desktop one notch
  // of the wheel used to move a whole screen and the keys could do nothing else. Scrolling is the browser's
  // own again: slides still snap into place on a phone, and only gently near a slide from md up (see the
  // container's scroll-snap classes). A resize still re-aligns the slide in view.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onResize() {
      if (!el) return;
      el.scrollTo({
        top: activeIdxRef.current * el.clientHeight,
        behavior: "instant",
      });
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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
    // A11Y-02: the home page had no <main> landmark — every other route has one.
    <main className="relative h-[100dvh] w-full overflow-hidden bg-surface text-ink antialiased select-none">
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 z-30 flex shrink-0 items-center justify-between border-b border-line/60 bg-surface/80 px-5 py-3.5 backdrop-blur-md sm:px-12 sm:py-4">
        {/*
          RE-014: this is the page's h1. The home page is a carousel of
          curriculum stages whose headings are h2, so without this the page had
          NO h1 at all — a screen reader had nothing to announce as the page
          subject and search engines had no title to weigh. The brand is the one
          element that names the whole page rather than one stage of it.
          Only the tag changed: Tailwind's preflight already resets heading
          margin/size/weight, and the classes below set all three explicitly.
        */}
        <h1
          className="text-[14px] sm:text-[15px] font-semibold tracking-[0.14em] text-ink"
          style={{ fontFamily: '"Open Sans", var(--font-sans)' }}
        >
          K-IG 교육
        </h1>
      </header>

      {/* Main Snap-Scroll Section Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="relative h-full w-full overflow-y-auto select-text overscroll-y-contain no-scrollbar [scroll-snap-type:y_mandatory] md:[scroll-snap-type:y_proximity]"
        style={{
          WebkitOverflowScrolling: "touch",
        }}
      >
        {tabs.map((tab, i) => (
          <section
            key={tab.slug}
            className="relative flex h-full min-h-full w-full flex-col justify-center overflow-hidden border-b border-line px-6 sm:px-[9vw] pt-16 pb-14 sm:py-0 snap-start snap-always"
            style={{ scrollSnapAlign: "start", scrollSnapStop: "always" }}
          >
            <SectionPhoto slug={tab.slug} priority={i === 0} />

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
                        className="group inline-flex cursor-pointer items-center gap-2.5 rounded-full bg-ink px-6 sm:px-8 py-3 sm:py-3.5 text-[14px] sm:text-[15px] font-medium tracking-wide text-surface transition-all duration-300 hover:opacity-90 hover:shadow-xl active:scale-[0.98] border border-white/10 shadow-md"
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
                className="absolute bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 text-ink-faint hover:text-primary transition-colors cursor-pointer select-none"
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
      {/* 2026-09-27 (점검 FRAME-U13): the dots look the same (7px) but each is pressed through a 44×24 area —
          the 7px buttons themselves were below the 24px minimum (WCAG 2.5.8). 24px tall keeps the column
          close to its original spacing; '다음 코스로 이동' and '학습 시작하기' do the same job with a big target. */}
      <nav
        aria-label="과정 슬라이드"
        className="pointer-events-auto absolute top-1/2 right-1 z-20 flex -translate-y-1/2 flex-col sm:right-3"
      >
        {tabs.map((tab, idx) => {
          const isActive = scrollActive === idx;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => scrollToTab(idx)}
              aria-label={`${tab.label} 슬라이드로 이동`}
              aria-current={isActive ? "true" : undefined}
              className="group flex h-6 w-11 cursor-pointer items-center justify-center border-none bg-transparent p-0"
            >
              <span
                aria-hidden
                className={
                  "block h-[7px] w-[7px] rounded-full transition-[transform,background-color] duration-200 " +
                  (isActive
                    ? "scale-140 bg-primary ring-2 ring-primary/25"
                    : "bg-ink/20 group-hover:scale-120 group-hover:bg-ink-soft")
                }
              />
            </button>
          );
        })}
      </nav>
    </main>
  );
}
