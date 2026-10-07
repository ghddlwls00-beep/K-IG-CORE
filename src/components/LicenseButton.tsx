"use client";

import { useEffect, useState } from "react";
import { useLicense } from "./LicenseProvider";

/** the longest the pill waits unseen for the licence answer before it shows '이용권 등록' anyway (a stalled request) */
const SETTLE_WAIT_MS = 2500;

/**
 * The licence pill in the header (md and up — on phones the status lives in the menu drawer).
 *
 * 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U08): one word and one dot. The blinking dot, the
 * 'ACTIVE' chip and the blue/amber tints are gone — the pill broke onto two lines at 1366px, and
 * the colours broke the site's one-accent rule. `whitespace-nowrap` keeps it on one line.
 *
 * UI검토-1007 3차 ③ (고침3 통합, 2026-10-08): with a licence, the pill read '이용권 등록' for 0.2~0.5 s while the stored licence
 * was being checked, then '올패스'. Until the licence question has its first answer (`licenseSettled`), the '이용권 등록' pill
 * keeps its place unseen (`invisible` — same box, no flash, out of the tab order) and shows once the answer says there is no
 * licence. Its words stay in the page. A request that never answers shows it after SETTLE_WAIT_MS.
 */
export function LicenseButton() {
  const { hasActiveLicense, licenseInfo, licenseSettled, openModal } = useLicense();
  const [waitedEnough, setWaitedEnough] = useState(false);
  useEffect(() => {
    if (licenseSettled) return;
    const timer = window.setTimeout(() => setWaitedEnough(true), SETTLE_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [licenseSettled]);
  const pending = !licenseSettled && !waitedEnough;

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
      aria-hidden={pending || undefined}
      tabIndex={pending ? -1 : undefined}
      data-license-pending={pending ? "" : undefined}
      className={`flex min-h-11 items-center whitespace-nowrap rounded-control border border-line bg-raised px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer select-none hover:bg-sunken hover:text-ink ${
        pending ? "invisible" : ""
      }`}
    >
      이용권 등록
    </button>
  );
}
