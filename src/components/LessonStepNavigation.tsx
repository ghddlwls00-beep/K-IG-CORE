"use client";

import { useCallback, useEffect, useState } from "react";

const STEP_TEXT = /\bStep\s*(\d+)\b/i;

/**
 * The step tabs of the course view. 2026-10-08 (UI검토-1007 17번): a view whose tabs carry `data-step-tab="N"` (StepTabs ·
 * GRAMMAR's own tabs) is read by that mark — guide buttons may now say 'Step 1 새로 풀기', and a text match would take such a
 * button for a tab. A view without the mark is found by the tab text 'Step N', as before.
 */
function getStepButtons(): Map<number, HTMLButtonElement> {
  const steps = new Map<number, HTMLButtonElement>();
  const marked = document.querySelectorAll<HTMLButtonElement>("main button[data-step-tab]");
  if (marked.length > 0) {
    for (const button of marked) {
      const step = Number(button.getAttribute("data-step-tab"));
      if (step > 0 && !steps.has(step)) steps.set(step, button);
    }
    return steps;
  }
  const buttons = document.querySelectorAll<HTMLButtonElement>("main button");
  for (const button of buttons) {
    const match = button.textContent?.match(STEP_TEXT);
    if (!match) continue;
    const step = Number(match[1]);
    if (step > 0 && !steps.has(step)) steps.set(step, button);
  }
  return steps;
}

/** the step a pressed button moves to — a marked tab by its mark, an unmarked one by its 'Step N' text (only when no tab is marked) */
function stepOfPressed(button: HTMLButtonElement | null | undefined): number | null {
  if (!button) return null;
  const mark = button.getAttribute("data-step-tab");
  if (mark !== null) return Number(mark) || null;
  if (document.querySelector("main button[data-step-tab]")) return null;
  const match = button.textContent?.match(STEP_TEXT);
  return match ? Number(match[1]) : null;
}

/**
 * 2026-10-08 (UI검토-1007 3장 20번): while the course view still has bundles after this one (GRAMMAR I · II Steps 1~3 —
 * `data-bundles-left` on the view), the bundle's own '다음 묶음 →' is the screen's one action, so '다음 Step →' steps back to the
 * quiet look of '← 이전 Step'-sized text button (no outline, no raised fill, soft text). It stays pressable — the learner may still
 * move on. The button's text and place do not change (the drivers find it by them); `data-quiet` says which look it has.
 */
const bundlesLeftNow = () => Boolean(document.querySelector("main [data-bundles-left]"));

const BUTTON_BASE =
  "flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-control px-4 text-label transition-colors enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-35";
const BUTTON_OUTLINE = "border border-line bg-raised text-ink enabled:hover:bg-sunken";
const BUTTON_QUIET = "border border-transparent font-medium text-ink-soft enabled:hover:bg-sunken enabled:hover:text-ink";

export function LessonStepNavigation({ courseHref }: { courseHref: string }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(0);
  const [quietNext, setQuietNext] = useState(false);

  const refresh = useCallback(() => {
    const steps = getStepButtons();
    const nextMax = steps.size ? Math.max(...steps.keys()) : 0;
    setMaxStep((previous) => (previous === nextMax ? previous : nextMax));
    const quiet = bundlesLeftNow();
    setQuietNext((previous) => (previous === quiet ? previous : quiet));
  }, []);

  useEffect(() => {
    let frame = window.requestAnimationFrame(refresh);
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(refresh);
    });
    // data-bundles-left is set and cleared on the view's own root, which stays in the page — an attribute change, not a new node
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-bundles-left"] });

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest("button");
      const step = stepOfPressed(button);
      if (step) setCurrentStep(step);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, [refresh]);

  const moveToStep = (step: number) => {
    const target = getStepButtons().get(step);
    if (!target) return;
    target.click();
    setCurrentStep(step);
    window.requestAnimationFrame(() => {
      // 2026-09-27 (STU-U19): a view that marks where its steps begin (data-step-start — STUDENT's step tabs) is brought
      // up under the header, so the new step's content starts right below the tabs instead of in the lower half of a
      // phone screen. A view without the mark keeps the old behaviour.
      const start = document.querySelector<HTMLElement>("main [data-step-start]");
      if (start) {
        const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
        window.scrollTo({ top: start.getBoundingClientRect().top + window.scrollY - headerH - 8, behavior: "smooth" });
        return;
      }
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const hasSteps = maxStep > 1;
  const previousDisabled = !hasSteps || currentStep <= 1;
  const nextDisabled = !hasSteps || currentStep >= maxStep;
  const nextQuiet = quietNext && !nextDisabled;

  // 2026-09-27 (docs/디자인-규칙.md): 44px controls in the body font. '목록으로' left — the title row
  // already goes back to the list, and the lesson ends with LessonEndBar right below this.
  if (!hasSteps) return null;
  return (
    <nav aria-label="학습 단계 이동" className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
      <button
        type="button"
        onClick={() => moveToStep(currentStep - 1)}
        disabled={previousDisabled}
        className={`${BUTTON_BASE} ${BUTTON_OUTLINE} font-medium`}
      >
        ← 이전 Step
      </button>

      <span className="text-caption tabular-nums text-ink-soft" aria-live="polite">
        {Math.min(currentStep, maxStep)} / {maxStep}
      </span>

      <button
        type="button"
        onClick={() => moveToStep(currentStep + 1)}
        disabled={nextDisabled}
        data-quiet={nextQuiet ? "" : undefined}
        className={`${BUTTON_BASE} ${nextQuiet ? BUTTON_QUIET : `${BUTTON_OUTLINE} font-semibold`}`}
      >
        다음 Step →
      </button>
    </nav>
  );
}
