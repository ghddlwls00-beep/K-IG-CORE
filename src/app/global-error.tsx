"use client";

import { useEffect } from "react";

/**
 * RE-016 — the last-resort error screen.
 *
 * `global-error.tsx` catches errors thrown in the ROOT LAYOUT itself, which
 * means Next replaces the layout with this component. Two consequences drive
 * everything below:
 *
 *  1. It must render its own <html> and <body>. There is no layout above it.
 *  2. `globals.css` is imported by the root layout, so it is NOT loaded here.
 *     Tailwind classes and the `--ink` / `--surface` variables would resolve to
 *     nothing and the page would render as unstyled black text on white — which
 *     is exactly what a visitor sees when the theme script itself is what
 *     broke. So this file uses inline styles and re-declares the two palette
 *     values it needs, light and dark.
 *
 * Because of (2) it deliberately does NOT import the app stylesheet: that import
 * would be a second copy of the whole design system, and it is not guaranteed to
 * load in the one situation this file exists for.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The only reporting channel available: this project has no error collector
    // (STATUS-2026-09-16 §3-3). The digest is the handle for a server log line.
    console.error("[K-IG] global error", error.digest ?? "", error);
  }, [error]);

  return (
    <html lang="ko">
      <head>
        <style
          // Inline because no stylesheet is guaranteed to be present here.
          dangerouslySetInnerHTML={{
            __html: `
              :root { --kig-surface:#FAF8F5; --kig-ink:#121316; --kig-ink-soft:#4E4B46;
                      --kig-line:rgba(34,30,26,.08); --kig-primary:#A8824B; }
              @media (prefers-color-scheme: dark) {
                :root { --kig-surface:#0E0E11; --kig-ink:#F5F3EF; --kig-ink-soft:#A8A39D;
                        --kig-line:rgba(255,255,255,.08); --kig-primary:#D4AF37; }
              }
              body { margin:0; }
            `,
          }}
        />
      </head>
      <body
        style={{
          minHeight: "100vh",
          background: "var(--kig-surface)",
          color: "var(--kig-ink)",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans KR", sans-serif',
        }}
      >
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "18vh 20px 80px" }}>
          <p
            style={{
              margin: 0,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: 11,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--kig-primary)",
            }}
          >
            Error · 심각한 오류
          </p>
          <h1
            style={{
              margin: "12px 0 0",
              fontSize: 32,
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            사이트를 표시할 수 없습니다
          </h1>
          <p
            style={{
              margin: "16px 0 0",
              fontSize: 15,
              lineHeight: 1.7,
              color: "var(--kig-ink-soft)",
            }}
          >
            페이지를 그리는 도중 문제가 발생했습니다. 다시 시도해 주세요.
            학습 기록과 이용권은 그대로 남아 있습니다.
          </p>

          <div style={{ marginTop: 32, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                cursor: "pointer",
                border: "1px solid var(--kig-line)",
                borderRadius: 999,
                background: "var(--kig-ink)",
                color: "var(--kig-surface)",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              다시 시도
            </button>
            {/* A plain <a>: if the root layout is what failed, client-side
                routing is not something to rely on for the escape hatch. */}
            <a
              href="/"
              style={{
                border: "1px solid var(--kig-line)",
                borderRadius: 999,
                color: "var(--kig-ink)",
                padding: "12px 24px",
                fontSize: 14,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              홈으로 가기
            </a>
          </div>

          {error.digest ? (
            <p
              style={{
                marginTop: 40,
                fontFamily: "ui-monospace, Menlo, Consolas, monospace",
                fontSize: 11,
                color: "var(--kig-ink-soft)",
              }}
            >
              오류 코드: {error.digest}
            </p>
          ) : null}
        </main>
      </body>
    </html>
  );
}
