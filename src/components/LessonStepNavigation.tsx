"use client";

import Link from "next/link";
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
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const hasSteps = maxStep > 1;
  const previousDisabled = !hasSteps || currentStep <= 1;
  const nextDisabled = !hasSteps || currentStep >= maxStep;

  return (
    <nav aria-label="학습 단계 이동" className="mt-12 sm:mt-16 flex items-center justify-between gap-3 border-t border-line pt-6 pb-2">
      <button
        type="button"
        onClick={() => moveToStep(currentStep - 1)}
        disabled={previousDisabled}
        className="flex min-w-[7rem] items-center justify-center rounded-xl border border-line bg-surface px-3.5 sm:px-4 py-2.5 text-[12px] sm:text-[13px] font-medium text-ink transition-colors shadow-2xs enabled:hover:bg-raised enabled:cursor-pointer enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
      >
        ← 이전 Step
      </button>

      <Link
        href={courseHref}
        className="rounded-lg px-2.5 py-1.5 font-mono text-[11.5px] sm:text-[12px] text-ink-soft hover:text-ink transition-colors"
      >
        목록으로
      </Link>

      <button
        type="button"
        onClick={() => moveToStep(currentStep + 1)}
        disabled={nextDisabled}
        className="flex min-w-[7rem] items-center justify-center rounded-xl bg-ink px-4 sm:px-5 py-2.5 text-[12px] sm:text-[13px] font-semibold text-surface transition-all shadow-xs enabled:hover:opacity-90 enabled:cursor-pointer enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-35"
      >
        다음 Step →
      </button>
    </nav>
  );
}
