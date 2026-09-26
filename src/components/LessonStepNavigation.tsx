"use client";

import { useCallback, useEffect, useState } from "react";

function getStepButtons(): Map<number, HTMLButtonElement> {
  const steps = new Map<number, HTMLButtonElement>();
  const buttons = document.querySelectorAll<HTMLButtonElement>("main button");
  for (const button of buttons) {
    const match = button.textContent?.match(/\bStep\s*(\d+)\b/i);
    if (!match) continue;
    const step = Number(match[1]);
    if (step > 0 && !steps.has(step)) steps.set(step, button);
  }
  return steps;
}

export function LessonStepNavigation({ courseHref }: { courseHref: string }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStep, setMaxStep] = useState(0);

  const refresh = useCallback(() => {
    const steps = getStepButtons();
    const nextMax = steps.size ? Math.max(...steps.keys()) : 0;
    setMaxStep((previous) => (previous === nextMax ? previous : nextMax));
  }, []);

  useEffect(() => {
    let frame = window.requestAnimationFrame(refresh);
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(refresh);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const onClick = (event: MouseEvent) => {
      const button = (event.target as HTMLElement | null)?.closest("button");
      const match = button?.textContent?.match(/\bStep\s*(\d+)\b/i);
      if (match) setCurrentStep(Number(match[1]));
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

  // 2026-09-27 (docs/디자인-규칙.md): 44px controls in the body font. '목록으로' left — the title row
  // already goes back to the list, and the lesson ends with LessonEndBar right below this.
  if (!hasSteps) return null;
  return (
    <nav aria-label="학습 단계 이동" className="mt-10 flex items-center justify-between gap-3 border-t border-line pt-5">
      <button
        type="button"
        onClick={() => moveToStep(currentStep - 1)}
        disabled={previousDisabled}
        className="flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-control border border-line bg-raised px-4 text-label font-medium text-ink transition-colors enabled:hover:bg-sunken enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
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
        className="flex min-h-11 min-w-[7.5rem] items-center justify-center rounded-control border border-line bg-raised px-4 text-label font-semibold text-ink transition-colors enabled:hover:bg-sunken enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"
      >
        다음 Step →
      </button>
    </nav>
  );
}
