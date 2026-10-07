"use client";

/**
 * The step tabs of a course view — one look for every course (docs/디자인-규칙.md §6-3; 2026-09-27, the look GRAMMAR
 * got in GRM-U15, made shared for STUDENT · STU-U03 · D04).
 *
 * 44px buttons, 14px text, the current step marked with aria-pressed and a raised chip (no colour, no emoji). On a
 * phone one row: the numbers, plus the current step's name (and its count); from `sm` every name. Every button's text
 * still reads "Step N · <name>" — LessonStepNavigation, the audit drivers and capture-mobile-0927 find the tabs by
 * /Step\s*\d/ in it — and carries data-step-tab="N". `badge` is a short count such as "2/5", shown after the name.
 *
 * `compact` (ADULT's five steps, 2026-10-02): the phone's row below `md` — the numbers, plus the current step's name.
 * 2026-10-07 (UI검토-1007 34 · 35), measured from the fonts' own advance widths (Segoe UI · Malgun Gothic, 14px, the current
 * tab semibold) and calibrated against the review's 360px measurements:
 *   - desktop (md+, the lesson column is 768 − 2×20 = 728px): five 'Step N · name' tabs with px-3 need ≈ 733–747px, so they
 *     did not fit; with px-2 and no count badges they need ≈ 693–705px — five names in one row, as LISTENING · PASS-OFF have.
 *     The other tabs carry no count; the current one keeps its own (2026-10-08 — see COMPACT below).
 *   - phone: at 360px the current tab ran 17px past the grey bar on step 5 ('섀도잉 & 낭독 0/7') and 3–4px on steps 1 · 4.
 *     px-2 and the count only from 380px leave 5–17px to spare at 360 · 375 and 11px+ from 380 with the count; the name truncates with '…'
 *     instead of ever leaving the bar (a safety net — no step needs it at 360).
 * Between `sm` and `md` (640–767px) the column is narrower than 728px, so the phone row stays.
 *
 * 2026-10-07 (UI검토-1007 42): in dark mode the raised chip was nearly the bar's own colour (#17171C on #121216), so the current
 * tab read only by weight; it now has a thin --line-input ring there.
 */
export interface StepTab {
  n: number;
  name: string;
  badge?: string;
}

// whole class names, so Tailwind finds them
const WIDE = {
  pad: "px-3",
  tab: "sm:flex-1",
  current: "",
  label: "",
  step: "sr-only sm:not-sr-only",
  rest: "hidden sm:inline",
  badgeCurrent: "",
  badgeRest: "hidden sm:inline",
};
// 2026-10-08 (통합 검사 고침2): md+ tabs are flex-auto, not flex-1. With flex-1 (basis 0) the five tabs got 141px each, and
// 'Step 1 · 블라인드 리스닝' · 'Step 5 · 섀도잉 & 낭독' (≈ 157 · 144px) broke after 'Step' onto two lines (not-sr-only lets the
// 'Step ' span wrap). flex-auto starts each tab at its own width (≈ 650px in all) and shares what is left.
const COMPACT = {
  pad: "px-2",
  tab: "md:flex-auto",
  current: "max-md:min-w-0 md:flex-auto",
  label: "max-md:min-w-0 max-md:truncate",
  step: "sr-only md:not-sr-only",
  rest: "hidden md:inline",
  // the current tab keeps its count on desktop too (통합 검사 고침2, 10-08): drive-generic reads 'n/7' on ADULT's current tab
  // ('뜻 보기 · 문장 전체 해석' · '빈칸 채우기'), and the five names plus one count still fit the 704px row (≈ 650 + 30px)
  badgeCurrent: "max-[379px]:hidden",
  badgeRest: "hidden",
};

export function StepTabs({
  steps,
  current,
  onSelect,
  label,
  stepStart = false,
  compact = false,
}: {
  steps: readonly StepTab[];
  current: number;
  onSelect: (n: number) => void;
  /** the nav's accessible name */
  label: string;
  /** mark the tabs as where a step begins, so '다음 Step' brings them under the header (LessonStepNavigation) */
  stepStart?: boolean;
  /** the phone's row below md, five names without counts from md (see above) */
  compact?: boolean;
}) {
  const look = compact ? COMPACT : WIDE;
  return (
    <nav aria-label={label} className="rounded-control bg-sunken p-1" data-step-start={stepStart ? "" : undefined}>
      <div className="flex gap-1">
        {steps.map((step) => {
          const isCurrent = step.n === current;
          return (
            <button
              key={step.n}
              type="button"
              data-step-tab={step.n}
              aria-pressed={isCurrent}
              onClick={() => onSelect(step.n)}
              className={
                `flex min-h-11 items-center justify-center whitespace-nowrap rounded-control ${look.pad} text-label transition-colors cursor-pointer ${look.tab} ` +
                (isCurrent
                  ? `flex-1 ${look.current} bg-raised font-semibold text-ink shadow-2xs dark:ring-1 dark:ring-line-input`
                  : "min-w-11 font-medium text-ink-soft hover:bg-raised/60")
              }
            >
              {/* one inline run: as separate flex items the spaces at their edges were dropped — 'Step2· 문법 설명' (2026-09-28, 설계 세션이 짚음) */}
              <span className={isCurrent ? look.label : ""}>
                <span className={look.step}>{"Step "}</span>
                <span className="tabular-nums">{step.n}</span>
                <span className={isCurrent ? "" : look.rest}>{` · ${step.name}`}</span>
              </span>
              {step.badge ? (
                <span
                  className={"ml-1.5 shrink-0 text-caption font-medium tabular-nums text-ink-soft " + (isCurrent ? look.badgeCurrent : look.badgeRest)}
                >
                  {` ${step.badge}`}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
