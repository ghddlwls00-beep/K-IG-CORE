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
 * Desktop (xl+): Shows the horizontal row of all curriculum tabs in the center.
 * Narrower: Cleanly consolidates the navigation tabs into a top-right 3-line hamburger menu drawer.
 *
 * The row is ten tabs wide and needs about 1100px of viewport to fit; from md
 * up to that point it used to overflow silently (141px of it at 800px, which
 * put "CNN NEWS" and "GVA 독해" out of reach behind a scrollbar that
 * no-scrollbar keeps invisible). Below xl the drawer lists every tab instead,
 * so nothing is ever clipped (KIG-036).
 */
export function TabBar({ tabs, courseTabs }: { tabs: Tab[]; courseTabs: Record<string, string> }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { hasActiveLicense, licenseInfo, openModal } = useLicense();

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

  // The home page keeps its own look without this header (사장님 2026-09-27 "추가하지마 이건").
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
      {/*
        2026-09-27 (docs/디자인-규칙.md §6 · 점검 FRAME-U08): 56px on every width. On a 360px phone
        the licence pill + search pill + menu used to be 23px wider than the screen, so a licensed
        learner's whole page slid sideways; the phone header is now logo · search · menu, and the
        licence status lives in the drawer. Desktop: the old 1fr_auto_1fr grid left ~225px for the
        right side, which broke 'VIP 올패스' onto two lines.
      */}
      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <div className="flex h-14 items-center justify-between gap-3 xl:grid xl:grid-cols-[auto_1fr_auto]">
            {/* Logo */}
            <div className="flex items-center justify-start shrink-0">
              <Link
                href="/"
                className="-ml-2 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control px-2 text-[15px] font-bold tracking-tight text-ink select-none hover:text-primary transition-colors"
              >
                <span>K&#8209;IG</span>
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-label font-medium text-ink-soft">교육</span>
              </Link>
            </div>

            {/* Desktop Navigation (xl+) */}
            <nav
              aria-label="Courses"
              className="no-scrollbar hidden xl:flex xl:justify-self-center items-center justify-center gap-1 overflow-x-auto overflow-y-hidden py-1"
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
                      "relative inline-flex min-h-11 shrink-0 items-center px-3 text-label whitespace-nowrap transition-colors select-none " +
                      (active
                        ? "font-semibold text-ink"
                        : "font-normal text-ink-soft hover:text-ink")
                    }
                  >
                    {tab.label}
                    <span
                      aria-hidden
                      className={
                        "absolute inset-x-3 bottom-0 h-[2px] origin-left bg-primary transition-transform duration-200 ease-out " +
                        (active ? "scale-x-100" : "scale-x-0")
                      }
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Right Controls */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0 xl:justify-self-end">
              {/* the licence status sits in the drawer on phones (FRAME-U08) */}
              <div className="hidden md:block">
                <LicenseButton />
              </div>
              <SearchDialog />

              {/* 3-bar Hamburger Button (Visible only below xl) */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
                aria-expanded={mobileMenuOpen}
                className="flex xl:hidden h-11 w-11 items-center justify-center rounded-control border border-line bg-surface text-ink hover:bg-raised transition-colors cursor-pointer"
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
        <div className="fixed inset-0 z-50 xl:hidden flex justify-end">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Content */}
          <aside className="relative z-10 flex h-full w-[290px] max-w-[85vw] flex-col justify-between border-l border-line bg-surface p-5 sm:p-6 shadow-2xl animate-in slide-in-from-right duration-250 overflow-y-auto">
            <div className="flex flex-col gap-6">
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-line pb-3">
                <span className="text-label font-semibold text-ink-soft">과정</span>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="닫기"
                  className="-mr-2 flex h-11 w-11 items-center justify-center rounded-control text-ink-soft hover:bg-raised hover:text-ink cursor-pointer"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
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
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-12 items-center justify-between rounded-control px-3.5 text-body transition-colors ${
                        active
                          ? "bg-sunken text-ink font-semibold"
                          : "text-ink hover:bg-raised font-medium"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {active && <span className="text-caption text-ink-soft">지금 과정</span>}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Drawer Footer */}
            <div className="border-t border-line/70 pt-4 flex flex-col gap-2.5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openModal();
                }}
                className={`flex min-h-12 items-center justify-center gap-2 rounded-control text-label font-semibold transition-colors cursor-pointer ${
                  hasActiveLicense
                    ? "border border-line bg-raised text-ink hover:bg-sunken"
                    : "bg-ink text-surface hover:opacity-90"
                }`}
              >
                {hasActiveLicense ? (
                  <>
                    <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{licenseInfo?.isStudentOnly ? "STUDENT 패스 이용 중" : "올패스 이용 중"} · 확인</span>
                  </>
                ) : (
                  <span>이용권 등록</span>
                )}
              </button>

              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex min-h-11 items-center justify-center rounded-control border border-line text-label font-medium text-ink hover:bg-raised transition-colors"
              >
                처음 화면으로
              </Link>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
