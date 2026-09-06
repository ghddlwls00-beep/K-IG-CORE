"use client";

import { useLicense } from "./LicenseProvider";

/**
 * Modern, Apple-style pill button for License registration / VIP status.
 * Matches the exact design language of SearchDialog and Recent Lesson pills:
 * rounded-full, subtle border, translucent backdrop-blur, refined micro-interactions.
 */
export function LicenseButton() {
  const { hasActiveLicense, openModal } = useLicense();

  if (hasActiveLicense) {
    return (
      <button
        type="button"
        onClick={openModal}
        title="VIP 이용권 상태 확인"
        className="group flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/[0.06] dark:border-amber-400/30 dark:bg-amber-400/[0.08] backdrop-blur-md px-3.5 py-1.5 text-[12px] text-amber-900 dark:text-amber-200 hover:bg-amber-500/[0.12] transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 select-none"
      >
        <span className="flex h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
        <span className="font-medium tracking-tight">VIP 올패스</span>
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-700 dark:text-amber-300">
          ACTIVE
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openModal}
      title="이용권 코드 등록"
      className="group flex items-center gap-2 rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] backdrop-blur-md px-3.5 py-1.5 text-[12px] text-ink-soft hover:bg-black/[0.06] dark:hover:bg-white/[0.12] hover:text-ink transition-all duration-200 cursor-pointer shadow-2xs active:scale-95 select-none"
    >
      <span className="text-[12px] opacity-70 group-hover:opacity-100 transition-opacity">🔑</span>
      <span className="font-medium tracking-tight">이용권 등록</span>
    </button>
  );
}
