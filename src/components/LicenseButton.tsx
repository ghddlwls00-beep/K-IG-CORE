"use client";

import { useLicense } from "./LicenseProvider";

/**
 * The licence pill in the header (md and up — on phones the status lives in the menu drawer).
 *
 * 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U08): one word and one dot. The blinking dot, the
 * 'ACTIVE' chip and the blue/amber tints are gone — the pill broke onto two lines at 1366px, and
 * the colours broke the site's one-accent rule. `whitespace-nowrap` keeps it on one line.
 */
export function LicenseButton() {
  const { hasActiveLicense, licenseInfo, openModal } = useLicense();

  if (hasActiveLicense && licenseInfo) {
    const isStudent = licenseInfo.isStudentOnly;
    return (
      <button
        type="button"
        onClick={openModal}
        title={isStudent ? "STUDENT 패스 상태 확인" : "올패스 상태 확인"}
        className="flex min-h-11 items-center gap-2 whitespace-nowrap rounded-control border border-line bg-raised px-3 text-label font-medium text-ink transition-colors cursor-pointer select-none hover:bg-sunken"
      >
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span>{isStudent ? "STUDENT 패스" : "올패스"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      title="이용권 코드 등록"
      className="flex min-h-11 items-center whitespace-nowrap rounded-control border border-line bg-raised px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer select-none hover:bg-sunken hover:text-ink"
    >
      이용권 등록
    </button>
  );
}
