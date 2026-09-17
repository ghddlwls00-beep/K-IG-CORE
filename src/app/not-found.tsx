import Link from "next/link";
import type { Metadata } from "next";
import { getTabs } from "@/lib/content";

/**
 * RE-016 — the 404 screen.
 *
 * Before this file existed, an unmatched route fell through to Next's default
 * page. It rendered inside the layout (so the nav bar and the Korean header
 * were there) but said nothing useful: no explanation, and no way back. A
 * visitor who mistyped a URL, or followed a stale link from a search result,
 * had to edit the address bar to recover.
 *
 * This is a server component, so the section list is built from the same
 * `getTabs()` the nav uses and cannot drift from it.
 */
export const metadata: Metadata = {
  title: "페이지를 찾을 수 없습니다",
  // A 404 must never be indexed, and it must not inherit the site's share card.
  robots: { index: false, follow: false },
};

export default function NotFound() {
  const tabs = getTabs();

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:py-24">
      <p className="font-mono text-[11px] tracking-[0.18em] text-ink-faint uppercase">
        404 · Not Found
      </p>
      <h1 className="mt-3 text-[clamp(28px,5vw,40px)] leading-tight font-bold tracking-tight text-ink text-balance">
        찾는 페이지가 없습니다
      </h1>
      <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        주소가 바뀌었거나, 링크가 오래되었거나, 주소에 오타가 있을 수 있습니다.
        아래에서 과정을 다시 골라 주세요.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[14px] font-medium tracking-wide text-surface transition-all duration-300 hover:opacity-90 active:scale-[0.98] border border-white/10"
        >
          홈으로 가기
        </Link>
      </div>

      <nav className="mt-12 border-t border-line" aria-label="과정 목록">
        <ul>
          {tabs.map((tab) => (
            <li key={tab.slug} className="border-b border-line">
              <Link
                href={`/t/${tab.slug}`}
                className="group flex items-baseline gap-5 py-4 hover:bg-raised focus-visible:bg-raised"
              >
                <span className="flex-1">
                  <span className="text-[16px] font-medium tracking-tight text-ink">
                    {tab.label}
                  </span>
                  {tab.blurb ? (
                    <span className="mt-1 block max-w-md text-[13.5px] leading-relaxed text-ink-soft">
                      {tab.blurb}
                    </span>
                  ) : null}
                </span>
                <span
                  aria-hidden
                  className="pr-1 font-mono text-sm text-ink-faint transition-transform duration-200 ease-out group-hover:translate-x-1 group-hover:text-ink"
                >
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
