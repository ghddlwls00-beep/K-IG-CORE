"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Tab } from "@/lib/types";
import { useLanguage, useTheme } from "./LanguageProvider";
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
  const { lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

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
          K-IG ENGLISH
        </div>

        <div className="flex items-center gap-5 sm:gap-7">
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setLang("en")}
              className={
                "border px-2.5 py-1 font-mono text-[11px] tracking-wider transition-colors " +
                (lang === "en"
                  ? "border-line bg-ink text-surface"
                  : "border-line bg-transparent text-ink-soft hover:text-ink")
              }
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLang("ja")}
              className={
                "border px-2.5 py-1 font-mono text-[11px] tracking-wider transition-colors " +
                (lang === "ja"
                  ? "border-line bg-ink text-surface"
                  : "border-line bg-transparent text-ink-soft hover:text-ink")
              }
            >
              日
            </button>
            <button
              type="button"
              onClick={() => setLang("zh")}
              className={
                "border px-2.5 py-1 font-mono text-[11px] tracking-wider transition-colors " +
                (lang === "zh"
                  ? "border-line bg-ink text-surface"
                  : "border-line bg-transparent text-ink-soft hover:text-ink")
              }
            >
              中
            </button>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Toggle theme (currently ${theme})`}
            className="relative h-[23px] w-[42px] rounded-[12px] border border-line bg-transparent p-0 transition-colors hover:border-ink-soft"
          >
            <span
              className="absolute top-[2px] left-[2px] h-[17px] w-[17px] rounded-full bg-ink transition-transform duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
              style={{
                transform: theme === "dark" ? "translateX(19px)" : "translateX(0px)",
              }}
            />
          </button>
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
              className="relative z-10 max-w-[640px]"
              style={{ animation: "fadeUp var(--dur-slow) var(--ease) both" }}
            >
              <p className="mb-4 font-mono text-[16.5px] tracking-[0.24em] text-ink-faint uppercase">
                {tab.num}
                {tab.unavailable
                  ? " · ARCHIVE ONLY"
                  : tab.contentLang === lang
                    ? " · IN YOUR LANGUAGE"
                    : ""}
              </p>

              {(() => {
                const targetCourse = tab.courseDetails[0]?.slug ?? tab.courses[0];
                return (
                  <>
                    <h2 className="text-[clamp(60px,8.25vw,96px)] font-medium leading-[1.08] tracking-[-0.01em] text-ink">
                      <Link
                        href={`/${targetCourse}`}
                        className="transition-opacity hover:opacity-80"
                      >
                        {tab.label}
                      </Link>
                    </h2>

                    {tab.blurb ? (
                      <p className="mt-4 max-w-[580px] text-[clamp(17px,2.2vw,24px)] font-light leading-snug tracking-wide text-ink-soft">
                        {tab.blurb}
                      </p>
                    ) : null}

                    <div className="mt-8">
                      <Link
                        href={`/${targetCourse}`}
                        className="inline-flex cursor-pointer items-center gap-2 border border-ink bg-surface px-8 py-3.5 text-[19.5px] tracking-wider text-ink transition-colors duration-200 hover:bg-ink hover:text-surface"
                      >
                        ENTER →
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
