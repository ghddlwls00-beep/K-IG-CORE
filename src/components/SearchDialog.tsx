"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLicense } from "./LicenseProvider";
import { searchItems } from "@/lib/searchMatch";

export interface SearchItem {
  id: string;
  course: string;
  courseTitle: string;
  code: string;
  title: string;
  subtitle: string;
  badge?: string;
  searchText: string;
}

export function SearchDialog() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const router = useRouter();
  const { isUnlocked } = useLicense();

  // Load search index when dialog opens
  useEffect(() => {
    if (!open || items.length > 0) return;
    setLoading(true);
    fetch("/search-index.json")
      .then((res) => res.json())
      .then((data: SearchItem[]) => {
        setItems(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, [open, items.length]);

  // Global hotkeys: Cmd+K / Ctrl+K / '/'
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "/" && !open) {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement ||
          (e.target as HTMLElement)?.isContentEditable
        ) {
          return;
        }
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setSelectedIndex(0);
    } else {
      setQuery("");
    }
  }, [open]);

  // Filtered results by multiple words and curriculum titles
  const results = useMemo(() => searchItems(items, query), [items, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation within results
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[selectedIndex];
      if (target) {
        goToLesson(target);
      }
    }
  }

  function goToLesson(item: SearchItem) {
    setOpen(false);
    router.push(`/${item.course}/${item.id}`);
  }

  return (
    <>
      {/* Search trigger button in header */}
      {/* 2026-09-27 (디자인 규칙 · FRAME-U08): an icon button (44×44) on phones, a labelled pill from md */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised text-ink-soft transition-colors cursor-pointer shrink-0 whitespace-nowrap hover:bg-sunken hover:text-ink md:px-3"
        aria-label="검색"
        title="검색 (단축키: Ctrl+K · ⌘K)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <span className="hidden md:inline text-label font-medium">검색</span>
        <kbd className="hidden lg:inline-flex items-center rounded-md border border-line px-1.5 text-caption font-medium text-ink-faint">
          ⌘K
        </kbd>
      </button>

      {/* Modal Backdrop and Dialog */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh] sm:pt-[10vh] px-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U16): 44px controls, no monospace or
                tracking on Korean, no emoji, one quiet highlight instead of a gold fill, and the
                keyboard hints only where there is a keyboard (md and up). */}
            <div className="flex items-center gap-2 border-b border-line px-3 py-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="ml-1 shrink-0 text-ink-soft">
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="강의 제목 · 번호 · 과정 (예: 중등 단어, 1강, 수능 듣기)"
                aria-label="검색어"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="search"
                className="min-h-11 w-full bg-transparent text-body text-ink placeholder:text-ink-faint focus:outline-none"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-faint hover:bg-raised hover:text-ink cursor-pointer"
                  title="검색어 지우기"
                  aria-label="검색어 지우기"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              )}

              {/* Explicit Clickable Close / Exit Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-11 shrink-0 items-center justify-center gap-1 rounded-control px-3 text-label font-medium text-ink-soft hover:bg-raised hover:text-ink cursor-pointer transition-colors"
                title="창 닫기 (ESC)"
                aria-label="창 닫기"
              >
                닫기
              </button>
            </div>

            {/* Search Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <div className="py-10 text-center text-label text-ink-soft">
                  검색 목록을 불러오는 중입니다…
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center gap-1.5 py-10 text-center">
                  <p className="text-label font-semibold text-ink">검색 결과가 없습니다.</p>
                  <p className="text-caption text-ink-soft">
                    &apos;{query}&apos;에 해당하는 강의를 찾지 못했습니다.
                  </p>
                  <p className="mt-1 text-caption text-ink-soft">
                    이렇게 찾아 보세요: <span className="font-medium text-ink">중등 단어, 고등, 1강, 패턴, 수능 듣기, 독해</span>
                  </p>
                </div>
              ) : (
                <ul ref={listRef} className="flex flex-col gap-0.5">
                  {results.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    // FUN-09: say which results need a licence before the click lands on a paywall.
                    const locked = !isUnlocked(item.course, item.id);
                    return (
                      <li key={`${item.course}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => goToLesson(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-control px-3 py-2 text-left transition-colors cursor-pointer ${
                            isSelected ? "bg-sunken" : "hover:bg-raised"
                          }`}
                        >
                          <div className="flex min-w-0 flex-col">
                            <span className="text-caption text-ink-soft">
                              {item.courseTitle}
                              {item.code ? <span className="tabular-nums"> · {item.code}</span> : null}
                            </span>
                            <span className="truncate text-label font-semibold text-ink">{item.title}</span>
                            {item.subtitle ? (
                              <span className="truncate text-caption text-ink-soft">{item.subtitle}</span>
                            ) : null}
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            {locked && (
                              <span className="flex items-center gap-1 text-caption text-ink-soft" title="이용권이 필요한 강의">
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                                  <rect x="5" y="11" width="14" height="9" rx="2" />
                                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                                </svg>
                                <span className="hidden sm:inline">이용권</span>
                                <span className="sr-only sm:hidden">이용권 필요</span>
                              </span>
                            )}
                            {item.badge && (
                              <span className="hidden sm:inline text-caption text-ink-soft">{item.badge}</span>
                            )}
                            <span aria-hidden className="text-ink-faint">→</span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer: keyboard hints only where there is a keyboard */}
            <div className="hidden md:flex items-center justify-between border-t border-line px-4 py-2 text-caption text-ink-soft">
              <div className="flex items-center gap-3">
                <span>↑↓ 고르기</span>
                <span>Enter 이동</span>
                <span>Esc 닫기</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
