import Link from "next/link";
import type { Metadata } from "next";
import { getCourse, getTabs } from "@/lib/content";

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
 *
 * 2026-10-07 (UI검토-1007 23): no '404 · NOT FOUND' monospace capitals, the site's buttons (rounded-control, 44px+) instead of
 * pills, each course line in Korean (the course's own description — the English home-page blurbs were promotion), and each line
 * goes straight to the course list as the menu drawer does (it used to stop at the /t/ page in between). The h1 '찾는 페이지가
 * 없습니다' stays — the audit harness recognises a 404 by it.
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
      <h1 className="text-title-l font-bold text-ink text-balance">찾는 페이지가 없습니다</h1>
      <p className="mt-3 max-w-xl text-body text-ink-soft">
        주소가 바뀌었거나 오래된 링크일 수 있어요. 아래에서 과정을 골라 주세요.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-raised px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
        >
          처음 화면으로
        </Link>
      </div>

      <nav className="mt-10 border-t border-line" aria-label="과정 목록">
        <ul>
          {tabs.map((tab) => {
            const course = tab.courses[0] ? getCourse(tab.courses[0]) : null;
            const href = tab.courses[0] ? `/${tab.courses[0]}` : `/t/${tab.slug}`;
            return (
              <li key={tab.slug} className="border-b border-line">
                <Link
                  href={href}
                  className="group flex min-h-14 items-center gap-4 px-1 py-3 transition-colors hover:bg-raised focus-visible:bg-raised"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-body font-semibold text-ink">{tab.label}</span>
                    {course?.description ? (
                      <span className="mt-0.5 block max-w-md text-label text-ink-soft">{course.description}</span>
                    ) : null}
                  </span>
                  <span aria-hidden className="pr-1 text-ink-faint group-hover:text-ink">
                    →
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </main>
  );
}
