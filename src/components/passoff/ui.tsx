"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { PassoffStudentRef } from "@/lib/passoffTypes";
import { useLicense } from "../LicenseProvider";

/**
 * Small pieces the five PASS-OFF GRAMMAR steps share (docs/디자인-규칙.md, 설계 §15): line icons instead of
 * emoji, 44px targets, the six type sizes, and the two result colours.
 *
 * `success` · `danger` are the common frame's tokens (main, 공통 틀 1: --success · --danger in globals.css).
 * This branch does not have them yet, so each class carries the same value as a fallback — once main is
 * merged the variable wins and these can become text-success · text-danger.
 */
export const tone = {
  success: "text-[color:var(--success,#2F7D5B)] dark:text-[color:var(--success,#5FBF95)]",
  danger: "text-[color:var(--danger,#B3261E)] dark:text-[color:var(--danger,#F2B8B5)]",
  successBorder: "border-[color:var(--success,#2F7D5B)] dark:border-[color:var(--success,#5FBF95)]",
  dangerBorder: "border-[color:var(--danger,#B3261E)] dark:border-[color:var(--danger,#F2B8B5)]",
  dangerWavy: "underline decoration-wavy decoration-2 underline-offset-4 decoration-[color:var(--danger,#B3261E)] dark:decoration-[color:var(--danger,#F2B8B5)]",
};

/** What a step needs to play a sentence: which one is playing, and play/stop by item (its `speakAs` or `en`). */
export interface Speaker {
  speakingId: string | null;
  toggle: (id: string, item: { en: string; speakAs?: string | null }) => void;
}

/**
 * The string a sentence is SPOKEN from — `speakAs` (a heteronym said in the meaning the screen shows) or the
 * English itself. scripts/lib/spoken-texts.cjs lists the same string for the clip generator; change both together.
 */
export function spokenOf(item: { en: string; speakAs?: string | null }): string {
  return typeof item.speakAs === "string" && item.speakAs.trim() ? item.speakAs : item.en;
}

/** Text sizes the learner picks (기본 · 크게 · 특대 — GRAMMAR's three, on the 16 · 18 · 22 steps). */
export type FontSize = "normal" | "large" | "xlarge";
export const FONT: Record<FontSize, { text: string; input: string }> = {
  normal: { text: "text-[16px] leading-relaxed", input: "text-[16px]" },
  large: { text: "text-[18px] leading-relaxed", input: "text-[18px]" },
  xlarge: { text: "text-[22px] leading-relaxed", input: "text-[22px]" },
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

/** The one filled button of a screen (디자인 규칙 §1-2). */
export function PrimaryButton({ className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-[14px] font-semibold text-surface transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 text-[14px] font-semibold text-ink transition-colors hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}

export function SpeakButton({ speaking, onClick, label = "문장 듣기" }: { speaking: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={speaking ? "문장 멈추기" : label}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
    >
      {speaking ? <StopIcon /> : <SpeakerIcon />}
    </button>
  );
}

/** A result line: a check or a cross, then the words. */
export function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={`flex items-start gap-2 text-[16px] font-semibold ${ok ? tone.success : tone.danger}`} role="status">
      <span className="mt-0.5">{ok ? <CheckIcon /> : <CrossIcon />}</span>
      <span>{children}</span>
    </p>
  );
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The text with each phrase marked — whole words only, case aside, longest first. No look-behind in the
 * pattern (older iOS Safari throws on it; lessonSpeechForm.ts does the same).
 */
export function Marked({ text, phrases, className }: { text: string; phrases?: readonly string[] | null; className: string }) {
  const list = [...new Set((phrases ?? []).map((p) => p.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!list.length) return <>{text}</>;
  const re = new RegExp(`(^|[^A-Za-z0-9'’])(${list.map(escapeRegExp).join("|")})(?![A-Za-z0-9'’])`, "gi");
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const start = m.index + m[1].length;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <span key={start} className={className}>
        {m[2]}
      </span>,
    );
    last = start + m[2].length;
    re.lastIndex = last;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** The focus words of a sentence (① · ②): bold and underlined, in the text colour. */
export const FOCUS_CLASS = "font-bold underline decoration-2 underline-offset-4";

/**
 * "STUDENT 2-2" — the same sentence in STUDENT (설계 §10). An exact one links to that lesson, but only when
 * this learner can open it (LicenseProvider.isUnlocked — STUDENT opens chapter by chapter); a changed one
 * just says so.
 */
export function StudentTag({ studentRef }: { studentRef?: PassoffStudentRef | null }) {
  const { isUnlocked } = useLicense();
  if (!studentRef || !/^s\d+-\d+$/.test(studentRef.lesson)) return null;
  const name = `STUDENT ${studentRef.lesson.slice(1)}`;
  if (studentRef.kind === "adapted") {
    return <span className="text-[12px] text-ink-faint">{name} 문장을 바꾼 문장</span>;
  }
  if (!isUnlocked("student", studentRef.lesson)) {
    return <span className="text-[12px] text-ink-faint">{name} 에 나온 문장</span>;
  }
  return (
    <Link
      href={`/student/${studentRef.lesson}`}
      className="inline-flex min-h-11 items-center text-[14px] text-ink-soft underline underline-offset-4 hover:text-ink"
    >
      {name} 에 나온 문장
    </Link>
  );
}

/** A small label next to a prompt ("it을 써서" · "의문사 절" · "도전"). */
export function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[12px] ${strong ? "border-line-strong font-semibold text-ink" : "border-line text-ink-soft"}`}>
      {children}
    </span>
  );
}

export function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  );
}

export function CheckIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export function CrossIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
      <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-ink-soft">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function TextSizeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 18 9 6l5 12" />
      <path d="M5.8 14h6.4" />
      <path d="M15 18l3-7 3 7" />
      <path d="M16 16h4" />
    </svg>
  );
}
