"use client";

/**
 * The step tabs of a course view — one look for every course (docs/디자인-규칙.md §6-3; 2026-09-27, the look GRAMMAR
 * got in GRM-U15, made shared for STUDENT · STU-U03 · D04).
 *
 * 44px buttons, 14px text, the current step marked with aria-pressed and a raised chip (no colour, no emoji). On a
 * phone one row: the numbers, plus the current step's name (and its count); from `sm` every name. Every button's text
 * still reads "Step N · <name>" — LessonStepNavigation, the audit drivers and capture-mobile-0927 find the tabs by
 * /Step\s*\d/ in it — and carries data-step-tab="N". `badge` is a short count such as "2/5", shown after the name.
 * `fit` (ADULT's four long names, 2026-10-02): every name only from `md`, and each tab as wide as its words, not equal —
 * at equal widths 'Step 4 · 섀도잉 & 낭독 0/7' broke onto two lines.
 */
export interface StepTab {
  n: number;
  name: string;
  badge?: string;
}

export function StepTabs({
  steps,
  current,
  onSelect,
  label,
  stepStart = false,
  fit = false,
}: {
  steps: readonly StepTab[];
  current: number;
  onSelect: (n: number) => void;
  /** the nav's accessible name */
  label: string;
  /** mark the tabs as where a step begins, so '다음 Step' brings them under the header (LessonStepNavigation) */
  stepStart?: boolean;
  /** tabs as wide as their words, every name from `md` (see above) */
  fit?: boolean;
}) {
  // whole class names, so Tailwind finds them
  const wide = fit
    ? { tab: "md:flex-auto", step: "sr-only md:not-sr-only md:whitespace-nowrap", rest: "hidden md:inline" }
    : { tab: "sm:flex-1", step: "sr-only sm:not-sr-only", rest: "hidden sm:inline" };
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
                `flex min-h-11 items-center justify-center whitespace-nowrap rounded-control px-3 text-label transition-colors cursor-pointer ${wide.tab} ` +
                (isCurrent ? "flex-1 bg-raised font-semibold text-ink shadow-2xs" : "min-w-11 font-medium text-ink-soft hover:bg-raised/60")
              }
            >
              {/* one inline run: as separate flex items the spaces at their edges were dropped — 'Step2· 문법 설명' (2026-09-28, 설계 세션이 짚음) */}
              <span>
                <span className={wide.step}>{"Step "}</span>
                <span className="tabular-nums">{step.n}</span>
                <span className={isCurrent ? "" : wide.rest}>{` · ${step.name}`}</span>
              </span>
              {step.badge ? (
                <span
                  className={"ml-1.5 text-caption font-medium tabular-nums text-ink-soft " + (isCurrent ? "" : wide.rest)}
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
