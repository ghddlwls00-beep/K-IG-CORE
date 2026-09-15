"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * RE-016 — the error boundary.
 *
 * Without this file a runtime error in a page showed Next's default screen,
 * which is English, unstyled, and offers no way forward except the back button.
 * This catches errors thrown while rendering a route and lets the visitor retry
 * without losing the page they were on.
 *
 * It renders INSIDE the root layout, so the nav bar and theme are already
 * applied — nothing here needs to re-create them.
 *
 * `reset()` re-renders the segment. It does not re-fetch data that was already
 * fetched, so it genuinely fixes transient failures (a chunk that failed to
 * load, a flaky request) and cannot fix a deterministic one. The home link is
 * there for the second case.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // There is no error collector in this project yet (see STATUS-2026-09-16 §3-3),
    // so the browser console is the only place this can surface. Keep the digest:
    // it is the only handle that ties a user's report to a server log line.
    console.error("[K-IG] route error", error.digest ?? "", error);
  }, [error]);

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
        Error · 일시적인 오류
      </p>
      <h1 className="mt-3 text-[clamp(28px,5vw,40px)] leading-tight font-bold tracking-tight text-ink text-balance">
        화면을 불러오지 못했습니다
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        잠시 후 다시 시도해 주세요. 같은 문제가 계속되면 홈에서 다시 들어오시면 됩니다.
        학습 기록과 이용권은 그대로 남아 있습니다.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium tracking-wide text-white transition-all duration-300 hover:bg-[#222126] active:scale-[0.98] border border-white/10"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full border border-line px-6 py-3 text-[14px] font-medium tracking-wide text-ink transition-colors duration-200 hover:bg-raised"
        >
          홈으로 가기
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 font-mono text-[11px] text-ink-faint">
          오류 코드: {error.digest}
        </p>
      ) : null}
    </main>
  );
}
