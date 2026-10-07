"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * The on/off switch — one look for every course (UI검토-1007 56, 2026-10-07).
 *
 * Six places drew their own copy ('글 가리기' · '영어 가리기' · '뜻 가리기' · '해석 모두 보기' · '직접 쓰기' · '문장 번호'), and in
 * all of them the off track (line-strong at 25%) was 2.08:1 against the dark page and 1.73:1 against the light one (WCAG 1.4.11
 * asks 3:1), and in dark mode the knob was the page's own colour. Here:
 *   - off: the track is --line-input (≥ 3:1 on every ground, globals.css); on: ink, as before.
 *   - the knob is the page colour with a hairline edge, so it reads on both tracks in both themes.
 *   - the whole row is the button: 44px tall (min-h-11), role="switch" with aria-checked; the words are its name.
 *
 * Everything else passes straight through to the <button> — data-action and the other data-* marks the audit tools look for,
 * onClick, className, aria-describedby … `checked` drives aria-checked and the knob.
 * `className` is ADDED to the row's own classes — use it for placement (ml-auto, w-full), not for padding or display, which
 * the row sets itself (inline-flex · px-2; with `labelFirst` a full row: flex · justify-between · px-1, READING's settings row).
 *
 *   <Toggle checked={hideText} data-action="hide-text" onClick={() => …}>글 가리기</Toggle>
 *   <Toggle checked={blankTyping} className="ml-auto" data-action="blank-typing" …>직접 쓰기</Toggle>
 *   <Toggle checked={prefs.numbers} labelFirst data-action="toggle-numbers" …>문장 번호</Toggle>
 */
export function Toggle({
  checked,
  children,
  labelFirst = false,
  className = "",
  type = "button",
  ...rest
}: {
  checked: boolean;
  /** the visible words — also the switch's accessible name */
  children: ReactNode;
  /** words before the switch (a settings row with the switch at its right end) */
  labelFirst?: boolean;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "role" | "aria-checked" | "children">) {
  const track = (
    <span
      aria-hidden
      className={
        "relative inline-block h-5 w-9 shrink-0 rounded-full transition-colors " + (checked ? "bg-ink" : "bg-line-input")
      }
    >
      <span
        className={
          "absolute top-0.5 h-4 w-4 rounded-full border border-line bg-surface shadow-2xs transition-[left] " +
          (checked ? "left-[18px]" : "left-0.5")
        }
      />
    </span>
  );
  return (
    <button
      type={type}
      role="switch"
      aria-checked={checked}
      className={
        (labelFirst ? "flex justify-between px-1" : "inline-flex px-2") +
        " min-h-11 items-center gap-2 rounded-control text-label font-medium text-ink transition-colors cursor-pointer hover:bg-sunken " +
        className
      }
      {...rest}
    >
      {labelFirst ? (
        <>
          <span>{children}</span>
          {track}
        </>
      ) : (
        <>
          {track}
          <span>{children}</span>
        </>
      )}
    </button>
  );
}
