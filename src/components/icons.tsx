/**
 * One set of line icons for the course views (docs/디자인-규칙.md §5 — "아이콘은 한 벌의 선 아이콘(SVG, 글자색을 따름).
 * 이모지를 아이콘으로 쓰지 않는다"). 2026-09-27, first used by STUDENT (student-verified.md STU-U12).
 *
 * Every icon draws in `currentColor`, is hidden from screen readers (the button around it carries the words or an
 * aria-label) and takes a size in px (default 16). Keep them plain: no fills that fight the text colour, no animation.
 */
import type { SVGProps } from "react";

type IconProps = { size?: number; className?: string };

function base(size: number, className?: string): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    focusable: false,
    className,
  };
}

export function IconPlay({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="currentColor" stroke="none">
      <path d="M8 5.6v12.8a1 1 0 0 0 1.52.85l10.1-6.4a1 1 0 0 0 0-1.7L9.52 4.75A1 1 0 0 0 8 5.6z" />
    </svg>
  );
}

export function IconPause({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="currentColor" stroke="none">
      <rect x="6" y="5" width="4" height="14" rx="1.2" />
      <rect x="14" y="5" width="4" height="14" rx="1.2" />
    </svg>
  );
}

export function IconStop({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)} fill="currentColor" stroke="none">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/** One sentence over and over. */
export function IconRepeat({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M17 2.5 20.5 6 17 9.5" />
      <path d="M3.5 11.5V10a4 4 0 0 1 4-4h13" />
      <path d="M7 21.5 3.5 18 7 14.5" />
      <path d="M20.5 12.5V14a4 4 0 0 1-4 4h-13" />
    </svg>
  );
}

export function IconSpeaker({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function IconMic({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

export function IconCheck({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.5}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

/** Wrong / "다름" (2026-09-27, VOCA Step 2 · 4 — instead of ❌). */
export function IconX({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)} strokeWidth={2.5}>
      <path d="M6.5 6.5l11 11" />
      <path d="M17.5 6.5l-11 11" />
    </svg>
  );
}

export function IconEye({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function IconEyeOff({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17.5 17.5 0 0 1-2.9 3.8" />
      <path d="M6.6 6.6A17.2 17.2 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
      <path d="M3 3l18 18" />
    </svg>
  );
}

export function IconChevronDown({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function IconChevronRight({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

/** Previous sentence. */
export function IconSkipBack({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M18 6v12l-9-6 9-6z" fill="currentColor" stroke="none" />
      <path d="M6 5.5v13" />
    </svg>
  );
}

/** Next sentence. */
export function IconSkipForward({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M6 6v12l9-6-9-6z" fill="currentColor" stroke="none" />
      <path d="M18 5.5v13" />
    </svg>
  );
}

/** Take back the last word. */
export function IconBackspace({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1z" />
      <path d="m13 9.5 5 5" />
      <path d="m18 9.5-5 5" />
    </svg>
  );
}

/** Locked (2026-09-28, PASS-OFF GRAMMAR's topic lock and paid sentences — the same shape as the course list's lock). */
export function IconLock({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Text size and sound speed settings (2026-09-28, PASS-OFF GRAMMAR — a large and a small A). */
export function IconTextSize({ size = 16, className }: IconProps) {
  return (
    <svg {...base(size, className)}>
      <path d="M4 18 9 6l5 12" />
      <path d="M5.8 14h6.4" />
      <path d="M15 18l3-7 3 7" />
      <path d="M16 16h4" />
    </svg>
  );
}
