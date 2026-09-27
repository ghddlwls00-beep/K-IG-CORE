"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef } from "react";

const POSITIONS_KEY = "kig:scroll:v1";

function readPositions(): Record<string, number> {
  try {
    return JSON.parse(window.sessionStorage.getItem(POSITIONS_KEY) || "{}");
  } catch {
    return {};
  }
}

/**
 * A new page opens at the top; BACK and FORWARD return to where the learner was.
 *
 * Before 2026-09-27 every navigation — back included — reset to the top, so a learner who went
 * from a course list into a lesson and pressed back lost their place in a list of up to 276
 * lessons (점검 FRAME-U02). The browser's own restoration stays off (it restored the previous
 * page's offset onto the next page); this component remembers each URL's last scroll position
 * in sessionStorage and puts it back only on a history move (popstate).
 */
export function NavigationScrollRestoration() {
  const pathname = usePathname();
  const historyMoveRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
    const onPop = () => {
      historyMoveRef.current = true;
    };
    window.addEventListener("popstate", onPop);

    let timer: number | undefined;
    const onScroll = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        try {
          const positions = readPositions();
          positions[window.location.pathname + window.location.search] = Math.round(window.scrollY);
          window.sessionStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
        } catch {
          // storage unavailable — back simply opens at the top
        }
      }, 120);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(timer);
    };
  }, []);

  useLayoutEffect(() => {
    const toTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    };

    if (historyMoveRef.current) {
      historyMoveRef.current = false;
      const target = readPositions()[window.location.pathname + window.location.search] ?? 0;
      // A list page opens its sections in an effect after the first paint, so the page may not be
      // tall enough yet: try again as it grows.
      const restore = () => window.scrollTo({ top: target, left: 0, behavior: "instant" });
      restore();
      const rafId = requestAnimationFrame(restore);
      const timers = [60, 250, 600].map((ms) => window.setTimeout(restore, ms));
      return () => {
        cancelAnimationFrame(rafId);
        timers.forEach((t) => window.clearTimeout(t));
      };
    }

    // 1. Instant synchronous scroll reset  2. after layout commit  3. after late hydration
    toTop();
    const rafId = requestAnimationFrame(toTop);
    const timerId = window.setTimeout(toTop, 60);
    return () => {
      cancelAnimationFrame(rafId);
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  return null;
}
