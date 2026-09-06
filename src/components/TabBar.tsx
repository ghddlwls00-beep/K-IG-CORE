"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab } from "@/lib/types";
import { useTheme } from "./LanguageProvider";
import { SearchDialog } from "./SearchDialog";

/**
 * The persistent top navigation.
 *
 * In the original site this bar lived in its own frame and never reloaded — it
 * was on screen no matter which lesson you opened. Keeping it always visible is
 * the single most load-bearing piece of the old information architecture, so it
 * sits in the root layout rather than on individual pages.
 *
 * The legacy bar was ten coloured images. Here the same ten destinations are
 * text, ranked by weight and an underline that draws in on hover.
 */
export function TabBar({ tabs, courseTabs }: { tabs: Tab[]; courseTabs: Record<string, string> }) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();

  if (pathname === "/") {
    return null;
  }

  const ordered = tabs;

  // A lesson page is "inside" its course's tab, so the right item stays marked
  // however deep you are.
  const segments = pathname.split("/").filter(Boolean);
  let activeTab: string | null = null;
  if (segments[0] === "t") activeTab = segments[1] ?? null;
  else if (segments[0]) activeTab = courseTabs[segments[0]] ?? null;

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-5">
        <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] gap-4 py-3">
          <div className="flex items-center justify-start shrink-0">
            <Link
              href="/"
              className="shrink-0 font-mono text-[11px] tracking-[0.22em] text-ink uppercase opacity-70 hover:opacity-100"
            >
              K&#8209;IG&nbsp;교육
            </Link>
          </div>

          <nav aria-label="Courses" className="no-scrollbar flex items-center justify-center gap-0.5 sm:gap-1 overflow-x-auto">
            {ordered.map((tab) => {
              const active = activeTab === tab.slug;
              const targetUrl = tab.courses[0] ? `/${tab.courses[0]}` : `/t/${tab.slug}`;
              return (
                <Link
                  key={tab.slug}
                  href={targetUrl}
                  aria-current={active ? "page" : undefined}
                  className={
                    "relative shrink-0 px-2.5 sm:px-3 py-1.5 text-[12.5px] whitespace-nowrap " +
                    (active
                      ? "font-semibold text-ink"
                      : "font-normal text-ink-soft hover:text-ink")
                  }
                >
                  {tab.label}
                  <span
                    aria-hidden
                    className={
                      "absolute inset-x-2.5 sm:inset-x-3 -bottom-px h-px origin-left bg-ink transition-transform duration-200 ease-out " +
                      (active ? "scale-x-100" : "scale-x-0")
                    }
                  />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-end gap-3 shrink-0">
            <SearchDialog />

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Toggle theme (currently ${theme})`}
              className="relative h-[23px] w-[42px] shrink-0 rounded-[12px] border border-line bg-transparent p-0 transition-colors hover:border-ink-soft cursor-pointer"
            >
              <span
                className="absolute top-[2px] left-[2px] h-[17px] w-[17px] rounded-full bg-ink transition-transform duration-[420ms] ease-[cubic-bezier(0.22,0.61,0.36,1)]"
                style={{
                  transform: theme === "dark" ? "translateX(19px)" : "translateX(0)",
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
