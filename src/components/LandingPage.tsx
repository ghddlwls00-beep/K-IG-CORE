"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

/** How quickly the page catches up with the wheel — the time constant of the glide (smaller is snappier). */
const GLIDE_MS = 90;
/** Once the wheel (or a trackpad's after-swipe momentum) has been still this long, the page glides onto a slide. */
const SETTLE_AFTER_MS = 160;
/** A roll that moved the page at least this share of a slide lands on the next slide its way; a smaller nudge goes back. */
const SETTLE_SHARE = 0.04;

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
  // set by the glide effect below: glide to slide n (the dots and the NEXT arrow use it too)
  const glideToRef = useRef<(index: number) => void>(() => {});

  // Synchronize activeIdxRef whenever scrollActive changes
  useEffect(() => {
    activeIdxRef.current = scrollActive;
  }, [scrollActive]);

  const scrollToTab = useCallback((index: number) => glideToRef.current(index), []);

  // How the page moves between slides with a mouse wheel, a trackpad or the keys. History (the owner's words):
  // 09-27 점검 FRAME-U13 took away the old one-notch-one-slide wheel takeover; 09-28 "페이지 내리고 올리는데 부자연스러워"
  // → free scrolling with a mouse; then "마우스 휠을 한번 굴리면 아래 페이지로 내려가게 해줘" → strict paging (one roll = one
  // slide, further rolls ignored until the move ended); 09-29 "너무 빡빡해 사이트 올리고 내리기가 부드럽게 해라" → this:
  // the page follows the wheel smoothly and never ignores it, and when the wheel (or a trackpad's momentum) has been
  // still for SETTLE_AFTER_MS it glides onto the next slide the way the user was going — so one roll still ends on the
  // next page, a longer roll passes slides fluidly, and a tiny nudge slides back. The arrow / page / space / home / end
  // keys glide a slide at a time (with a mouse there is no CSS snap to stop them on a slide). Pinch-zoom (ctrl + wheel)
  // and sideways scrolling stay the browser's. A touch screen keeps the browser's own one-slide-per-swipe mandatory
  // snap. With prefers-reduced-motion the page jumps instead of gliding. The look (slides, dots, arrows) is the same.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pos = el.scrollTop; // where the glide has the page (float — scrollTop rounds)
    let target = pos;
    let frame = 0;
    let lastT = 0;
    let settleTimer = 0;
    let gestureFrom: number | null = null;

    const count = tabs.length;
    const height = () => el.clientHeight || 1;
    const clamp = (y: number) => Math.min(Math.max(y, 0), Math.max(0, el.scrollHeight - el.clientHeight));
    const showSlide = (n: number) => {
      activeIdxRef.current = n;
      setScrollActive(n);
    };

    const step = (t: number) => {
      const dt = lastT ? Math.min(t - lastT, 64) : 16;
      lastT = t;
      pos += (target - pos) * (1 - Math.exp(-dt / GLIDE_MS));
      if (Math.abs(target - pos) < 0.5) {
        pos = target;
        el.scrollTop = pos;
        frame = 0;
        lastT = 0;
        el.style.scrollSnapType = ""; // back to the container's own snapping (touch screens)
        return;
      }
      el.scrollTop = pos;
      frame = requestAnimationFrame(step);
    };
    const glide = () => {
      if (reduce.matches) {
        pos = target;
        el.scrollTop = pos;
        return;
      }
      if (!frame) {
        pos = el.scrollTop;
        lastT = 0;
        el.style.scrollSnapType = "none"; // a snapping container would pull every frame of the glide to a slide
        frame = requestAnimationFrame(step);
      }
    };
    const glideTo = (n: number) => {
      const i = Math.min(Math.max(n, 0), count - 1);
      target = clamp(i * height());
      showSlide(i);
      glide();
    };
    glideToRef.current = glideTo;

    const settle = () => {
      const from = gestureFrom ?? target;
      gestureFrom = null;
      const at = target / height();
      const moved = target - from;
      const n = Math.abs(moved) >= height() * SETTLE_SHARE ? (moved > 0 ? Math.ceil(at - 0.001) : Math.floor(at + 0.001)) : Math.round(at);
      glideTo(n);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      if (!frame) target = pos = el.scrollTop;
      if (gestureFrom === null) gestureFrom = target;
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * height() : e.deltaY;
      target = clamp(target + dy);
      glide();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(settle, SETTLE_AFTER_MS);
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      const onControl = e.target instanceof Element && e.target.closest("button, input, textarea, select, [contenteditable]");
      if (k === " " && onControl) return; // Space presses the focused button (on a link it only scrolls, so it glides here)
      const here = Math.round((frame ? target : el.scrollTop) / height());
      let n: number;
      if (k === "ArrowDown" || k === "PageDown" || (k === " " && !e.shiftKey)) n = here + 1;
      else if (k === "ArrowUp" || k === "PageUp" || (k === " " && e.shiftKey)) n = here - 1;
      else if (k === "Home") n = 0;
      else if (k === "End") n = count - 1;
      else return;
      e.preventDefault();
      window.clearTimeout(settleTimer);
      gestureFrom = null;
      glideTo(n);
    };

    // With a mouse there is no snap, so a scroll the browser makes by itself would stop between slides (the pre-release
    // check found Tab doing so 9 times in 12). Tab moving focus into another slide glides to that slide; any other
    // browser-made scroll (find-in-page, middle-click autoscroll) glides onto the nearest slide once it has been still
    // for a moment. Touch screens keep the browser's own snap.
    const fine = window.matchMedia("(pointer: fine)");
    let idleTimer = 0;
    const onFocusIn = (e: FocusEvent) => {
      if (!fine.matches || !(e.target instanceof Element)) return;
      const slide = e.target.closest("section");
      const n = slide ? Array.prototype.indexOf.call(el.children, slide) : -1;
      if (n >= 0 && n !== Math.round((frame ? target : el.scrollTop) / height())) {
        window.clearTimeout(settleTimer);
        gestureFrom = null;
        glideTo(n);
      }
    };
    const onIdle = () => {
      if (frame || gestureFrom !== null || !fine.matches) return;
      const n = Math.round(el.scrollTop / height());
      if (Math.abs(el.scrollTop - n * height()) > 1) glideTo(n);
    };
    const onScroll = () => {
      if (frame || gestureFrom !== null) return;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(onIdle, 150);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("focusin", onFocusIn);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("scroll", onScroll);
      el.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(settleTimer);
      window.clearTimeout(idleTimer);
      if (frame) cancelAnimationFrame(frame);
      glideToRef.current = () => {};
    };
  }, [tabs.length]);

  // A resize re-aligns the slide in view.
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
        className="relative h-full w-full overflow-y-auto select-text overscroll-y-contain no-scrollbar [scroll-snap-type:y_mandatory] [@media(pointer:fine)]:[scroll-snap-type:none]"
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
