"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { learnerOf } from "@/lib/learning/sync";
import { PASSOFF_COURSE } from "@/lib/passoffLearning";
import type { PassoffStudentRef } from "@/lib/passoffTypes";
import { useLicense } from "../LicenseProvider";
import { IconCheck, IconSpeaker, IconStop, IconX } from "../icons";

/**
 * Small pieces the five PASS-OFF GRAMMAR steps share, on the common parts of docs/디자인-규칙.md (merged with main
 * 2026-09-28): the line icons of src/components/icons.tsx, 44px targets, the six type tokens (text-caption · label ·
 * body · title-s · title), rounded-control · rounded-card, and the two result colours `success` · `danger` of
 * globals.css (dark mode included). The buttons carry the same classes as the other course views' filled / outline
 * buttons (GrammarLearningView · StudentLearningView · LdLearningView …).
 */
export const tone = {
  success: "text-success",
  danger: "text-danger",
  successBorder: "border-success",
  dangerBorder: "border-danger",
  dangerWavy: "underline decoration-wavy decoration-2 underline-offset-4 decoration-danger",
};

/**
 * Whose record the lesson writes to now (공통-학습-엔진.md §10 — one record per licence on a device): the licence's id
 * while an active licence opens this course, else null — the record kept with no licence (src/lib/learning/sync.ts
 * learnerOf). Read at each answer, as PassoffProgressProvider files a completion under the licence of that moment.
 */
export function usePassoffLearner(): string | null {
  const { hasActiveLicense, licenseInfo } = useLicense();
  return learnerOf(PASSOFF_COURSE, { active: hasActiveLicense, id: licenseInfo?.licenseId, plan: licenseInfo?.plan });
}

/** What a step needs to play a sentence: which one is playing, and play/stop by item (its `speakAs` or `en`). */
export interface Speaker {
  speakingId: string | null;
  toggle: (id: string, item: { en: string; speakAs?: string | null }) => void;
  /**
   * The microphone started (VoiceSpeakingTester onStart): it has already stopped any sentence playing (stopSpeech, which
   * calls no one back), so the play button that sentence had lit goes back to '문장 듣기'.
   */
  reset: () => void;
}

/**
 * The string a sentence is SPOKEN from — `speakAs` (a heteronym said in the meaning the screen shows) or the
 * English itself. scripts/lib/spoken-texts.cjs lists the same string for the clip generator; change both together.
 */
export function spokenOf(item: { en: string; speakAs?: string | null }): string {
  return typeof item.speakAs === "string" && item.speakAs.trim() ? item.speakAs : item.en;
}

/** Text sizes the learner picks (기본 · 크게 · 특대 — GRAMMAR's three: text-body 16 · text-title-s 18 · text-title 22). */
export type FontSize = "normal" | "large" | "xlarge";
export const FONT: Record<FontSize, { text: string; input: string }> = {
  normal: { text: "text-body leading-relaxed", input: "text-body" },
  large: { text: "text-title-s leading-relaxed", input: "text-title-s" },
  xlarge: { text: "text-title leading-relaxed", input: "text-title" },
};
export const FONT_LABEL: Record<FontSize, string> = { normal: "기본", large: "크게", xlarge: "특대" };

/** One option of a segmented control (글자 크기 · 문장 속도) — the other course views' segment buttons. */
export const segmentButton = (on: boolean) =>
  "flex min-h-11 min-w-11 items-center justify-center rounded-control px-3 text-label tabular-nums transition-colors cursor-pointer " +
  (on ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:bg-raised/60");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode };

/** The one filled button of a screen (디자인 규칙 §1-2). */
export function PrimaryButton({ className = "", children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:opacity-40 ${className}`}
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
      className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
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
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
    >
      {speaking ? <IconStop size={18} /> : <IconSpeaker size={20} />}
    </button>
  );
}

/** A result line: a check or a cross, then the words. */
export function Verdict({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <p className={`flex items-start gap-2 text-body font-semibold ${ok ? tone.success : tone.danger}`} role="status">
      <span className="mt-0.5">{ok ? <IconCheck size={18} /> : <IconX size={18} />}</span>
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
    return <span className="text-caption text-ink-faint">{name} 문장을 바꾼 문장</span>;
  }
  if (!isUnlocked("student", studentRef.lesson)) {
    return <span className="text-caption text-ink-faint">{name} 에 나온 문장</span>;
  }
  return (
    <Link
      href={`/student/${studentRef.lesson}`}
      className="inline-flex min-h-11 items-center text-label text-ink-soft underline underline-offset-4 hover:text-ink"
    >
      {name} 에 나온 문장
    </Link>
  );
}

/** A small label next to a prompt ("it을 써서" · "의문사 절" · "도전"). */
export function Chip({ children, strong = false }: { children: ReactNode; strong?: boolean }) {
  return (
    <span className={`inline-flex items-center rounded-control border px-2 py-0.5 text-caption ${strong ? "border-line-strong font-semibold text-ink" : "border-line text-ink-soft"}`}>
      {children}
    </span>
  );
}
