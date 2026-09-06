"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface SearchItem {
  id: string;
  course: string;
  courseTitle: string;
  label: string;
  title: string;
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
      if (
        (e.metaKey || e.ctrlKey) && e.key === "k"
      ) {
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

  // Filtered results
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 8); // show first 8 items by default

    return items
      .filter(
        (it) =>
          it.id.toLowerCase().includes(q) ||
          it.label.toLowerCase().includes(q) ||
          it.courseTitle.toLowerCase().includes(q) ||
          it.title.toLowerCase().includes(q)
      )
      .slice(0, 15);
  }, [items, query]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation within results
  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
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
        className="flex items-center gap-2 rounded-xl border border-line bg-surface px-2.5 py-1 text-[12px] text-ink-soft hover:border-line-strong hover:text-ink transition-colors cursor-pointer"
        aria-label="레슨 검색 (Cmd+K)"
        title="레슨 검색 (단축키: Cmd+K 또는 Ctrl+K)"
      >
        <span className="text-[13px]">🔍</span>
        <span className="hidden sm:inline">빠른 레슨 검색</span>
        <kbd className="hidden md:inline rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
          ⌘K
        </kbd>
      </button>

      {/* Modal Backdrop and Dialog */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-black/50 backdrop-blur-xs animate-in fade-in"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 bg-raised/40">
              <span className="text-ink-soft text-[16px]">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="레슨 번호나 키워드를 입력하세요... (예: d001, mv1-01, gh1, 문법)"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                className="w-full bg-transparent text-[14.5px] text-ink placeholder:text-ink-faint focus:outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-[11px] text-ink-faint hover:text-ink cursor-pointer px-1"
                >
                  ✕
                </button>
              )}
              <kbd className="rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-faint">
                ESC
              </kbd>
            </div>

            {/* Search Results List */}
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {loading ? (
                <div className="py-8 text-center text-[13px] text-ink-soft">
                  검색 인덱스를 불러오는 중입니다…
                </div>
              ) : results.length === 0 ? (
                <div className="py-8 text-center text-[13px] text-ink-soft">
                  <p className="font-semibold text-ink">검색 결과가 없습니다.</p>
                  <p className="mt-1 text-[12px] text-ink-faint">
                    &apos;{query}&apos;에 해당하는 레슨을 찾을 수 없습니다.
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
                              ? "bg-primary text-surface font-medium"
                              : "hover:bg-raised text-ink"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                                isSelected
                                  ? "bg-surface/20 text-surface"
                                  : "bg-raised text-ink-soft"
                              }`}
                            >
                              {item.courseTitle}
                            </span>
                            <div className="flex flex-col min-w-0">
                              <span className="truncate text-[13.5px] font-semibold">
                                {item.label}
                              </span>
                              {item.title && item.title !== item.label && (
                                <span
                                  className={`truncate text-[11.5px] ${
                                    isSelected ? "text-surface/80" : "text-ink-soft"
                                  }`}
                                >
                                  {item.title}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`font-mono text-[11px] tabular-nums ${
                                isSelected ? "text-surface/80" : "text-ink-faint"
                              }`}
                            >
                              {item.id}
                            </span>
                            <span
                              className={`text-[12px] ${
                                isSelected ? "text-surface" : "text-ink-faint"
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

            {/* Footer shortcuts tip */}
            <div className="flex items-center justify-between border-t border-line/60 bg-raised/30 px-4 py-2 text-[11px] text-ink-faint font-mono">
              <span>↑↓ 탐색</span>
              <span>↵ 선택 즉시 이동</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
