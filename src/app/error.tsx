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

  // 2026-10-07 (UI검토-1007 23): no 'Error · …' monospace capitals, the site's buttons (one filled '다시 시도' · an outlined
  // '처음 화면으로', rounded-control, 44px+) instead of pills, 해요체, and the error code in monospace only where it is a code.
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <h1 className="text-title-l font-bold text-ink text-balance">화면을 불러오지 못했습니다</h1>
      <p className="mt-3 max-w-xl text-body text-ink-soft">
        잠시 뒤 다시 시도해 주세요. 학습 기록과 이용권은 그대로 남아 있어요.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="btn-filled inline-flex min-h-11 items-center justify-center rounded-control px-5 text-label font-semibold transition-colors"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-raised px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
        >
          처음 화면으로
        </Link>
      </div>

      {error.digest ? (
        <p className="mt-10 text-caption text-ink-faint">
          오류 코드 <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </main>
  );
}
