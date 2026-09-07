"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

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
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 10);

    const tokens = q.split(/\s+/).filter(Boolean);

    return items
      .filter((it) => {
        const text = it.searchText;
        return tokens.every((tok) => text.includes(tok));
      })
      .slice(0, 20);
  }, [items, query]);

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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex items-center gap-1.5 rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] backdrop-blur-md px-3 py-1.5 text-[12px] text-ink-soft hover:bg-black/[0.06] dark:hover:bg-white/[0.12] hover:text-ink transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 shrink-0 whitespace-nowrap"
        aria-label="검색 (Cmd+K)"
        title="검색 (단축키: Cmd+K 또는 Ctrl+K)"
      >
        <span className="text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">🔍</span>
        <span className="font-medium tracking-tight whitespace-nowrap">검색</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-full border border-black/8 bg-black/[0.04] dark:border-white/10 dark:bg-white/[0.08] px-1.5 py-0.5 font-mono text-[9.5px] font-semibold text-ink-faint group-hover:text-ink transition-colors">
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
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 bg-raised/40">
              <span className="text-ink-soft text-[16px] shrink-0">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="단어, 문법, 듣기, 독해, 뉴스 또는 레슨 번호 검색 (예: 중등, 1강, 수능, MV1)"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent text-[16px] text-ink placeholder:text-ink-faint focus:outline-none"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[12px] text-ink-faint hover:text-ink cursor-pointer px-1 shrink-0"
                  title="검색어 지우기"
                >
                  ✕
                </button>
              )}

              {/* Explicit Clickable Close / Exit Button */}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex items-center gap-1 rounded-lg border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-soft hover:bg-raised hover:text-ink cursor-pointer transition-colors shrink-0"
                title="창 닫기 (ESC)"
                aria-label="창 닫기"
              >
                <span>✕</span>
                <span className="hidden sm:inline">닫기</span>
              </button>
            </div>

            {/* Search Results List */}
            <div className="max-h-[40vh] sm:max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <div className="py-10 text-center text-[13px] text-ink-soft">
                  검색 인덱스를 불러오는 중입니다…
                </div>
              ) : results.length === 0 ? (
                <div className="py-10 text-center text-[13px] text-ink-soft flex flex-col items-center gap-1.5">
                  <p className="font-semibold text-ink text-[14px]">검색 결과가 없습니다.</p>
                  <p className="text-[12px] text-ink-faint">
                    &apos;{query}&apos;에 해당하는 학습 과정을 찾을 수 없습니다.
                  </p>
                  <p className="text-[11.5px] text-ink-faint mt-1">
                    추천 검색어: <span className="font-medium text-ink">중등 단어, 고등, 1강, 패턴, 수능 듣기, 독해</span>
                  </p>
                </div>
              ) : (
                <ul ref={listRef} className="flex flex-col gap-1">
                  {results.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <li key={`${item.course}-${item.id}`}>
                        <button
                          type="button"
                          onClick={() => goToLesson(item)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2.5 text-left transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-primary text-surface font-medium shadow-xs"
                              : "hover:bg-raised text-ink"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-bold uppercase tracking-wider ${
                                isSelected
                                  ? "bg-surface/20 text-surface"
                                  : "bg-raised text-ink-soft"
                              }`}
                            >
                              {item.courseTitle}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-mono text-[11.5px] font-bold ${
                                    isSelected ? "text-surface" : "text-primary"
                                  }`}
                                >
                                  {item.code}
                                </span>
                                <span className="truncate text-[13.5px] font-semibold">
                                  {item.title}
                                </span>
                              </div>
                              {item.subtitle ? (
                                <span
                                  className={`truncate text-[11.5px] ${
                                    isSelected ? "text-surface/80" : "text-ink-soft"
                                  }`}
                                >
                                  {item.subtitle}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.badge && (
                              <span
                                className={`hidden sm:inline rounded px-1.5 py-0.5 text-[10px] font-medium ${
                                  isSelected
                                    ? "bg-surface/20 text-surface"
                                    : "bg-raised text-ink-faint"
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                            <span
                              className={`text-[12px] ${
                                isSelected ? "text-surface font-bold" : "text-ink-faint"
                              }`}
                            >
                              →
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer shortcuts and Exit Button */}
            <div className="flex items-center justify-between border-t border-line/60 bg-raised/30 px-4 py-2 text-[11px] text-ink-faint font-mono">
              <div className="flex items-center gap-3">
                <span>↑↓ 탐색</span>
                <span>↵ 선택 즉시 이동</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="hover:text-ink cursor-pointer underline text-[11px]"
              >
                닫기 (ESC)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
