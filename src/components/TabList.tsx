"use client";

import Link from "next/link";
import type { Tab } from "@/lib/types";
import { T, useLanguage } from "./LanguageProvider";

/**
 * UNUSED — nothing imports this file (docs/qa-2026-09-18/maps/common.md R20). Brought to the design rules (UI검토-1007 61:
 * no monospace / capitals on Korean, nothing under 12px) only so the rule count is clean until a person deletes it.
 *
 * The home page's list of sections.
 *
 * Courses whose *material* is in the selected language come first. The Chinese
 * course is the same curriculum taught in Chinese, so a reader who has chosen
 * Chinese should meet it before the English sections — but nothing is hidden,
 * because the English material is still the bulk of the archive and a language
 * choice is not a filter.
 */
export function TabList({ tabs }: { tabs: Tab[] }) {
  const { lang } = useLanguage();

  const ordered = [...tabs].sort((a, b) => {
    const aMatch = a.contentLang === lang ? 0 : 1;
    const bMatch = b.contentLang === lang ? 0 : 1;
    return aMatch - bMatch;
  });

  return (
    <ol className="border-t border-line">
      {ordered.map((tab, i) => (
        <li key={tab.slug} className="border-b border-line">
          <Link
            href={`/t/${tab.slug}`}
            className="group flex min-h-14 items-baseline gap-4 py-4 hover:bg-raised focus-visible:bg-raised"
          >
            <span className="w-7 shrink-0 pl-1 text-caption tabular-nums text-ink-faint">
              {String(i + 1).padStart(2, "0")}
            </span>

            <span className="flex-1">
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className="text-title-s font-semibold">{tab.label}</span>
                {tab.contentLang === lang ? (
                  <span className="rounded-control bg-ink px-2 py-0.5 text-caption text-surface">
                    <T k="tab.inYourLanguage" />
                  </span>
                ) : null}
                {tab.unavailable ? (
                  <span className="rounded-control border border-line px-2 py-0.5 text-caption text-ink-faint">
                    <T k="tab.archiveOnly" />
                  </span>
                ) : null}
              </span>
              <span className="mt-1 block max-w-md text-label text-ink-soft">{tab.blurb}</span>
            </span>

            <span aria-hidden className="pr-1 text-ink-faint group-hover:text-ink">
              →
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}
