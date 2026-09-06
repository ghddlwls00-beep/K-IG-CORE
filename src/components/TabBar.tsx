"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Tab } from "@/lib/types";
import { SearchDialog } from "./SearchDialog";
import { LicenseButton } from "./LicenseButton";
import { useLicense } from "./LicenseProvider";

/**
 * The persistent top navigation.
 *
 * Desktop (md+): Shows the horizontal row of all curriculum tabs in the center.
 * Mobile (<md): Cleanly consolidates the navigation tabs into a top-right 3-line hamburger menu drawer.
 */
export function TabBar({ tabs, courseTabs }: { tabs: Tab[]; courseTabs: Record<string, string> }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasActiveLicense, openModal } = useLicense();

  // Close mobile drawer when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  if (pathname === "/") {
    return null;
  }

  const ordered = tabs;

  // A lesson page is "inside" its course's tab, so the right item stays marked
  const segments = pathname.split("/").filter(Boolean);
  let activeTab: string | null = null;
  if (segments[0] === "t") activeTab = segments[1] ?? null;
  else if (segments[0]) activeTab = courseTabs[segments[0]] ?? null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-surface/85 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="flex items-center justify-between md:grid md:grid-cols-[1fr_auto_1fr] gap-4 py-3">
            {/* Logo */}
            <div className="flex items-center justify-start shrink-0">
              <Link
                href="/"
                className="shrink-0 font-mono text-[12px] font-bold tracking-[0.2em] text-ink uppercase opacity-85 hover:opacity-100"
              >
                K&#8209;IG&nbsp;교육
              </Link>
            </div>

            {/* Desktop Navigation (md+) */}
            <nav
              aria-label="Courses"
              className="no-scrollbar hidden md:flex items-center justify-center gap-1 overflow-x-auto overflow-y-hidden py-1"
            >
              {ordered.map((tab) => {
                const active = activeTab === tab.slug;
                const targetUrl = tab.courses[0] ? `/${tab.courses[0]}` : `/t/${tab.slug}`;
                return (
                  <Link
                    key={tab.slug}
                    href={targetUrl}
                    aria-current={active ? "page" : undefined}
                    className={
                      "relative shrink-0 px-3 py-1.5 text-[12.5px] whitespace-nowrap transition-colors select-none " +
                      (active
                        ? "font-semibold text-ink"
                        : "font-normal text-ink-soft hover:text-ink")
                    }
                  >
                    {tab.label}
                    <span
                      aria-hidden
                      className={
                        "absolute inset-x-3 bottom-0 h-[2px] origin-left bg-ink transition-transform duration-200 ease-out " +
                        (active ? "scale-x-100" : "scale-x-0")
                      }
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-2 sm:gap-2.5 shrink-0">
              <LicenseButton />
              <SearchDialog />

              {/* Mobile 3-bar Hamburger Button (Visible only below md) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                aria-expanded={mobileMenuOpen}
                className="flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-raised transition-colors cursor-pointer"
              >
                <div className="flex flex-col items-center justify-center gap-1.5 w-4.5">
                  <span
                    className={`block h-0.5 w-full rounded-full bg-ink transition-transform duration-200 ${
                      mobileMenuOpen ? "translate-y-2 rotate-45" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-full rounded-full bg-ink transition-opacity duration-200 ${
                      mobileMenuOpen ? "opacity-0" : ""
                    }`}
                  />
                  <span
                    className={`block h-0.5 w-full rounded-full bg-ink transition-transform duration-200 ${
                      mobileMenuOpen ? "-translate-y-2 -rotate-45" : ""
                    }`}
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Drawer Overlay & Slide-out Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside className="relative z-10 flex h-full w-[280px] max-w-[85vw] flex-col justify-between border-l border-line bg-surface p-6 shadow-2xl animate-in slide-in-from-right duration-250">
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-line/70 pb-4">
                <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-ink-faint">
                  전체 커리큘럼 메뉴
                </span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="닫기"
                  className="rounded-lg p-1.5 text-ink-soft hover:bg-raised hover:text-ink cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Course Navigation Links */}
              <nav className="flex flex-col gap-1.5">
                {ordered.map((tab) => {
                  const active = activeTab === tab.slug;
                  const targetUrl = tab.courses[0] ? `/${tab.courses[0]}` : `/t/${tab.slug}`;
                  return (
                    <Link
                      key={tab.slug}
                      href={targetUrl}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center justify-between rounded-xl px-3.5 py-3 text-[14px] transition-colors ${
                        active
                          ? "bg-primary/10 text-primary font-bold border border-primary/20"
                          : "text-ink hover:bg-raised font-medium"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {active && (
                        <span className="text-[11px] font-mono font-semibold">학습중 ●</span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-line/70 pt-4 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openModal();
                }}
                className={`flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold transition-all cursor-pointer ${
                  hasActiveLicense
                    ? "border border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20"
                    : "bg-ink text-surface shadow-xs hover:opacity-90 active:scale-[0.99]"
                }`}
              >
                <span>{hasActiveLicense ? "👑 VIP 올패스 회원 (확인)" : "🔑 이용권 코드 등록"}</span>
              </button>

              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center rounded-xl border border-line py-2.5 text-[12.5px] font-medium text-ink hover:bg-raised transition-colors"
              >
                🏠 홈(대시보드)으로 이동
              </Link>
              <div className="text-center font-mono text-[10.5px] text-ink-faint">
                K-IG Core Language Curriculum
              </div>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
