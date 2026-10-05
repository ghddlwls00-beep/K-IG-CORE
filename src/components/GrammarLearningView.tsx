"use client";

/**
 * GRAMMAR I · II — one view for every lesson of both courses.
 *
 * 2026-09-27 rework (docs/qa-2026-09-18/학습법-화면-0927/README.md 'GRAMMAR 계획', grammar-verified.md;
 * owner 01:45 "문장 · 번역 · 음성은 그대로"). The four steps keep their names and order and the tabs keep
 * the text "Step N" (LessonStepNavigation finds them by it). What changed, by review item:
 *   Step 1  one block per item — Korean, a growing answer box, 🎤 and 확인 on one row; Enter = 확인 (focus
 *           stays), Enter again = next item (U02 · U07). 확인 grades with the unchanged grader and shows
 *           which words differ (L02). The answer is never reachable before an attempt: no header
 *           '영어 정답 발음', the answer sound only in the opened panel, batch reveal in '⋯ 더보기' (L03).
 *           '빈칸 힌트' when stuck — a hinted item goes back to the retry list (L07). An exactly right
 *           TYPED answer turns '맞음' on; a spoken one is graded the same way (numbers matched,
 *           src/lib/spokenAnswer.ts) but only shown (L09).
 *   Step 2  blanks 16px · 44px in the flow of the sentence (U01 · U06); judged on 확인 / Enter, not while
 *           typing; a second miss shows '내 답 → 정답' (L14 · U25).
 *   Step 3  듣고 따라 말하기 as before; a repetition counts only when the microphone heard ≥ 70 or the
 *           learner presses '따라 말했어요' — tapping the card no longer counts (L04 · U12).
 *   Step 4  its own answers (examAnswers) and a result frozen when graded (examResult); '틀린 것만 다시' ·
 *           '새 시험' (L01). A 56px bar at the bottom (U08). The score formula is unchanged (L13).
 *   Steps 1–3 go in bundles of 10 ('1–10 / 42 · 다음 묶음 →', a last bundle of 5 or fewer joins the
 *   one before); Step 4 is the whole lesson (L08). Every bundle stays in the DOM (hidden), so the
 *   audit's text readers still see every item.
 * Saved per lesson in localStorage `kig:grammar:work:<lesson>` (version 2 — an old save opens with its
 * answers; see readWork). Font size and speed are a per-device preference (`kig:grammar:prefs`).
 * The common learning engine (src/lib/learning — reviews that cross days) gets every graded answer
 * (noteAttempt) and, when the lesson is finished, its missed or helped sentences (src/lib/grammarLearning.ts).
 * The data-* attributes are what the audit helpers read (docs/qa-2026-09-18/scripts/lib/g1-page.cjs ·
 * g2-driver.cjs · containers.cjs · check-grammar-exam*.cjs) — keep them when restyling.
 */

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Block, SentenceItem } from "@/lib/types";
import { isInAppBrowser, isKakaoTalk, speakText, stopSpeech } from "@/lib/speech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { koreanOnScreen, romanForGrading } from "@/lib/koreanGloss";
import {
  diffAgainstReferences,
  gradeAgainstReferences,
  gradeAnswer,
  type AnswerDiff,
  type AnswerGrade,
} from "@/lib/grammarGrading";
import { DiffLine } from "./GrammarDiffLine";
import { diffSpokenAnswer, gradeSpokenAnswer } from "@/lib/spokenAnswer";
import { isSpeechRecognitionSupported, listenToSpeech, type VoiceRecognizerHandle } from "@/lib/speechRecognition";
import { markLessonDone, readCourseRecord, recordAttempt } from "@/lib/learning/record";
import type { AnswerMode, Help } from "@/lib/learning/types";
import { grammarItemKey, grammarLearningProfile } from "@/lib/grammarLearning";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import { LESSON_COMPLETE_EVENT } from "./ProgressProvider";

export interface GrammarItem {
  id: number;
  numberLabel: string;
  koreanText: string;
  englishText: string;
  /** Other sentences the textbook accepts for this prompt — graded as full marks. */
  alternatives: string[];
  clozeParts: { text: string; isBlank: boolean; answer?: string }[];
  targetKeywords: string[];
}

export interface GrammarLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  course: string;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}

type StudyMode = "composition" | "cloze" | "shadowing" | "exam";
type FontSize = "normal" | "large" | "xlarge";
type AudioSpeed = 0.85 | 1.0;

const STEPS: { mode: StudyMode; n: number; name: string }[] = [
  { mode: "composition", n: 1, name: "영작 훈련" },
  { mode: "cloze", n: 2, name: "빈칸 완성" },
  { mode: "shadowing", n: 3, name: "구문 각인" },
  { mode: "exam", n: 4, name: "종합 평가" },
];

/** One line each (GRM-U18). The '상세 오답 분석' the old exam text promised is now the word marks (L02). */
const GUIDES: Record<StudyMode, string> = {
  composition: "우리말을 보고 영어로 쓴 뒤 확인을 누르세요. 막히면 빈칸 힌트를 보세요.",
  cloze: "우리말을 보고 빈칸을 채운 뒤 확인을 누르세요.",
  shadowing: "구문 각인 — 듣고 따라 말하기. 마이크로 확인하거나 '따라 말했어요'를 누르면 1회로 셉니다.",
  exam: "모두 쓰고 채점하세요. 1단계에 쓴 답과는 따로 저장됩니다.",
};

/** The six text sizes of docs/디자인-규칙.md §3; one choice for every step (GRM-U24). */
const FONT_STYLES: Record<FontSize, { korean: string; english: string; input: string }> = {
  normal: { korean: "text-body", english: "text-body", input: "text-body" },
  large: { korean: "text-title-s", english: "text-title-s", input: "text-title-s" },
  xlarge: { korean: "text-title", english: "text-title", input: "text-title" },
};
const FONT_LABEL: Record<FontSize, string> = { normal: "기본", large: "크게", xlarge: "특대" };

const VERDICT_TEXT: Record<AnswerGrade, string> = {
  exact: "✓ 정답",
  partial: "△ 부분 정답 — 표시한 곳을 고쳐 보세요",
  incorrect: "✕ 오답 — 모범 답안과 견주어 보세요",
};
const SPOKEN_TEXT: Record<AnswerGrade, string> = {
  exact: "✓ 정답과 같아요",
  partial: "△ 거의 맞아요",
  incorrect: "✕ 달라요",
};
/** Step 4 badges — the audit reads these words (check-grammar-exam*.cjs: /✓ 정답/ · /부분/ · /오답/). */
const EXAM_BADGE: Record<AnswerGrade, string> = {
  exact: "✓ 정답 (100점)",
  partial: "△ 부분 정답 (70점)",
  incorrect: "✕ 오답 (0점)",
};

const PREFS_KEY = "kig:grammar:prefs";
const WORK_VERSION = 2;
const BUNDLE_SIZE = 10;

const GRAMMAR_KEYWORDS = new Set([
  "am", "is", "are", "was", "were", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "if", "unless", "since", "though", "although", "because", "while", "after", "before", "until", "as", "that", "whether",
  "not", "never", "no",
  "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their", "mine", "yours", "hers", "theirs",
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "in", "on", "at", "for", "to", "from", "with", "by", "of", "into", "out",
  // Negative contractions — the forms these lessons drill (Isn't he a boy? · She doesn't …) (6-1357)
  "isn't", "aren't", "wasn't", "weren't", "don't", "doesn't", "didn't", "haven't", "hasn't", "hadn't",
  "can't", "couldn't", "won't", "wouldn't", "shouldn't", "mustn't"
]);

/** isn't, don't, Weren't … — one word, even though other apostrophes still split a token. */
const NEGATIVE_CONTRACTION = /^[A-Za-z]+n['’]t$/;

function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[가-힯ᄀ-ᇿ]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function hasKorean(text: string): boolean {
  if (!text) return false;
  return /[가-힯ᄀ-ᇿ]/.test(text);
}

function cleanText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

// Grading (normalisation, LCS partial credit, contraction handling, alternatives)
// lives in `@/lib/grammarGrading` so the audit's inputs can be graded from node.

/** "9. 16. 오후 7:05" — the audit asked for a date, not only a clock time (FUN-07). */
function formatSavedAt(): string {
  return new Date().toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function buildCloze(enText: string): {
  parts: { text: string; isBlank: boolean; answer?: string }[];
  keywords: string[];
} {
  // A negative contraction stays one token. Split on its apostrophe, "Isn't" became "Isn" + "'" + "t":
  // the blank took half a word and typing the whole "Isn't" was marked wrong, or the blank fell on
  // "your" while the contraction the lesson drills stayed on screen (6-1357). Other apostrophes
  // (What's, I'm) still split as before, so those items keep their blanks.
  const tokens = enText
    .split(/(\s+|[.,?!;:"()]+)/)
    .flatMap((t) => (t.includes("'") && !NEGATIVE_CONTRACTION.test(t) ? t.split(/('+)/) : [t]));
  const candidates: { index: number; word: string; clean: string }[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const raw = tokens[i];
    const clean = raw.toLowerCase().replace(/’/g, "'").trim();
    if (GRAMMAR_KEYWORDS.has(clean)) {
      candidates.push({ index: i, word: raw, clean });
    }
  }

  // Fallback if no predefined grammar keywords found: the first word of three letters or more.
  // 2026-09-27 GRM-L06 (the smallest change until a per-lesson target-word table exists): NOT when
  // that word opens the sentence ("Please …", "The …", "They …", "Every …") — blanking it drilled
  // nothing the lesson teaches, so such a sentence now has no blank. 'to' keeps its place in the
  // list above: it is the target of the to-infinitive lessons (gh2-030~036).
  if (candidates.length === 0) {
    for (let i = 0; i < tokens.length; i++) {
      if (/^[A-Za-z]{3,}$/.test(tokens[i])) {
        const opensSentence = !tokens.slice(0, i).some((t) => /[A-Za-z0-9]/.test(t));
        if (!opensSentence) candidates.push({ index: i, word: tokens[i], clean: tokens[i].toLowerCase() });
        break;
      }
    }
  }

  // Pick up to 2 key grammar words to blank out
  const toBlank = candidates.slice(0, 2);
  const blankIndices = new Set(toBlank.map((c) => c.index));
  const keywords = toBlank.map((c) => c.word);

  const parts: { text: string; isBlank: boolean; answer?: string }[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (blankIndices.has(i)) {
      parts.push({ text: tokens[i], isBlank: true, answer: tokens[i] });
    } else {
      parts.push({ text: tokens[i], isBlank: false });
    }
  }

  return { parts, keywords };
}

/** Bundles of 10 (GRM-L08); a last bundle of 5 or fewer joins the one before (42 → 10 · 10 · 10 · 12). */
function buildBundles(count: number): [number, number][] {
  const bundles: [number, number][] = [];
  for (let start = 0; start < count; start += BUNDLE_SIZE) bundles.push([start, Math.min(count, start + BUNDLE_SIZE)]);
  if (bundles.length > 1) {
    const last = bundles[bundles.length - 1];
    if (last[1] - last[0] <= 5) {
      bundles.pop();
      bundles[bundles.length - 1] = [bundles[bundles.length - 1][0], last[1]];
    }
  }
  return bundles.length ? bundles : [[0, 0]];
}

// --- saved work --------------------------------------------------------------------------------

interface ExamResult {
  score: number;
  exact: number;
  partial: number;
  total: number;
  perItem: Record<number, AnswerGrade>;
  at: string | null;
}
interface RunSummary {
  correct: number;
  total: number;
  at: string;
}
interface ExamSummary {
  score: number;
  exact: number;
  partial: number;
  total: number;
  at: string | null;
}

interface Work {
  answers: Record<number, string>;
  selfGrades: Record<number, boolean>;
  hints: Record<number, boolean>;
  clozeInputs: Record<number, Record<number, string>>;
  clozeTries: Record<number, number>;
  clozeChecked: Record<number, Record<number, string>>;
  revealedAnswers: Record<string, boolean>;
  shadowingRepeats: Record<number, number>;
  examAnswers: Record<number, string>;
  examResult: ExamResult | null;
  lastRun: RunSummary | null;
  lastExam: ExamSummary | null;
  studyMode: StudyMode;
  bundle: number;
}

/** Always the same key order, so a snapshot compares equal to itself (FUN-07: a save only when it differs). */
function packWork(w: Work): Work {
  return {
    answers: w.answers,
    selfGrades: w.selfGrades,
    hints: w.hints,
    clozeInputs: w.clozeInputs,
    clozeTries: w.clozeTries,
    clozeChecked: w.clozeChecked,
    revealedAnswers: w.revealedAnswers,
    shadowingRepeats: w.shadowingRepeats,
    examAnswers: w.examAnswers,
    examResult: w.examResult,
    lastRun: w.lastRun,
    lastExam: w.lastExam,
    studyMode: w.studyMode,
    bundle: w.bundle,
  };
}

const EMPTY_WORK: Work = packWork({
  answers: {},
  selfGrades: {},
  hints: {},
  clozeInputs: {},
  clozeTries: {},
  clozeChecked: {},
  revealedAnswers: {},
  shadowingRepeats: {},
  examAnswers: {},
  examResult: null,
  lastRun: null,
  lastExam: null,
  studyMode: "composition",
  bundle: 0,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function recordOf<T>(value: unknown, keep: (v: unknown) => v is T): Record<number, T> {
  const out: Record<number, T> = {};
  if (!isRecord(value)) return out;
  for (const [key, v] of Object.entries(value)) if (keep(v)) out[Number(key)] = v;
  return out;
}
const isString = (v: unknown): v is string => typeof v === "string";
const isBoolean = (v: unknown): v is boolean => typeof v === "boolean";
const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const referencesOf = (item: GrammarItem) => [item.englishText, ...item.alternatives];

/** The Step 4 sheet graded at one moment. The score formula is the one the exam always used (GRM-L13: unchanged). */
/** `asWritten` (2026-10-02): a Korean word the learner wrote in Hangul read as the lesson spells it (romanForGrading) */
function gradeExam(items: GrammarItem[], answers: Record<number, string>, at: string | null, asWritten: (s: string) => string = (s) => s): ExamResult {
  let exact = 0;
  let partial = 0;
  const perItem: Record<number, AnswerGrade> = {};
  for (const item of items) {
    const grade = gradeAgainstReferences(asWritten(answers[item.id] || ""), referencesOf(item));
    perItem[item.id] = grade;
    if (grade === "exact") exact++;
    else if (grade === "partial") partial++;
  }
  const total = items.length;
  const score = Math.round(((exact * 1.0 + partial * 0.7) / (total || 1)) * 100);
  return { score, exact, partial, total, perItem, at };
}

/** Keep only the blank positions the current items still have (buildCloze changed in v2 — GRM-L06). */
function keepBlanks<T>(source: Record<number, Record<number, T>>, items: GrammarItem[]): Record<number, Record<number, T>> {
  const out: Record<number, Record<number, T>> = {};
  for (const item of items) {
    const saved = source[item.id];
    if (!saved) continue;
    const kept: Record<number, T> = {};
    item.clozeParts.forEach((part, index) => {
      if (part.isBlank && saved[index] !== undefined) kept[index] = saved[index];
    });
    if (Object.keys(kept).length) out[item.id] = kept;
  }
  return out;
}

/**
 * Reads a saved lesson. Version 1 (before 2026-09-27) shared ONE answer sheet between Step 1 and
 * Step 4 and kept only `examSubmitted`: an old save that had been graded copies its answers into
 * the exam sheet once and is graded again, so the result it showed does not vanish (GRM-L01).
 * An old save that was not graded starts Step 4 empty — the exam is a fresh recall now.
 */
function readWork(raw: string | null, items: GrammarItem[]): { work: Work; at: string | null } {
  if (!raw) return { work: EMPTY_WORK, at: null };
  let data: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { work: EMPTY_WORK, at: null };
    data = parsed;
  } catch {
    return { work: EMPTY_WORK, at: null };
  }
  const version = typeof data.v === "number" ? data.v : 1;
  const at = typeof data.at === "string" ? data.at : null;
  const answers = recordOf(data.answers, isString);
  const nested = (value: unknown) => {
    const out: Record<number, Record<number, string>> = {};
    if (!isRecord(value)) return out;
    for (const [key, v] of Object.entries(value)) out[Number(key)] = recordOf(v, isString);
    return out;
  };

  let examAnswers = recordOf(data.examAnswers, isString);
  let examResult: ExamResult | null = null;
  if (version >= 2 && isRecord(data.examResult) && isNumber(data.examResult.score)) {
    const r = data.examResult;
    examResult = {
      score: r.score as number,
      exact: isNumber(r.exact) ? r.exact : 0,
      partial: isNumber(r.partial) ? r.partial : 0,
      total: isNumber(r.total) ? r.total : items.length,
      perItem: recordOf(r.perItem, (v): v is AnswerGrade => v === "exact" || v === "partial" || v === "incorrect"),
      at: typeof r.at === "string" ? r.at : null,
    };
  } else if (version < 2 && data.examSubmitted === true && !isRecord(data.examAnswers)) {
    examAnswers = { ...answers };
    examResult = gradeExam(items, examAnswers, at);
  }

  const summaryOf = (value: unknown): ExamSummary | null =>
    isRecord(value) && isNumber(value.score)
      ? {
          score: value.score,
          exact: isNumber(value.exact) ? value.exact : 0,
          partial: isNumber(value.partial) ? value.partial : 0,
          total: isNumber(value.total) ? value.total : items.length,
          at: typeof value.at === "string" ? value.at : null,
        }
      : null;
  const lastRun: RunSummary | null =
    isRecord(data.lastRun) && isNumber(data.lastRun.correct) && isNumber(data.lastRun.total)
      ? { correct: data.lastRun.correct, total: data.lastRun.total, at: typeof data.lastRun.at === "string" ? data.lastRun.at : "" }
      : null;
  const studyMode = STEPS.some((s) => s.mode === data.studyMode) ? (data.studyMode as StudyMode) : "composition";

  return {
    at,
    work: packWork({
      answers,
      selfGrades: recordOf(data.selfGrades, isBoolean),
      hints: recordOf(data.hints, isBoolean),
      clozeInputs: keepBlanks(nested(data.clozeInputs), items),
      clozeTries: recordOf(data.clozeTries, isNumber),
      clozeChecked: keepBlanks(nested(data.clozeChecked), items),
      revealedAnswers: isRecord(data.revealedAnswers)
        ? Object.fromEntries(Object.entries(data.revealedAnswers).filter(([, v]) => typeof v === "boolean")) as Record<string, boolean>
        : {},
      shadowingRepeats: recordOf(data.shadowingRepeats, isNumber),
      examAnswers,
      examResult,
      lastRun,
      lastExam: summaryOf(data.lastExam),
      studyMode,
      bundle: isNumber(data.bundle) ? Math.max(0, Math.floor(data.bundle)) : 0,
    }),
  };
}

// --- small pieces -------------------------------------------------------------------------------

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

function supportsFieldSizing(): boolean {
  return typeof CSS !== "undefined" && typeof CSS.supports === "function" && CSS.supports("field-sizing", "content");
}

function IconSpeaker() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function IconStop() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function IconMic() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function IconChevron({ className = "" }: { className?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

/**
 * The answer box of Steps 1 and 4 (GRM-U07): one line that grows with the sentence, 16px or more.
 * Enter confirms instead of breaking the line (a Hangul IME's composing Enter is left alone).
 */
function AnswerBox({
  value,
  label,
  placeholder,
  enterKeyHint,
  readOnly = false,
  className,
  onValue,
  onEnter,
  boxRef,
  shownKey = 0,
}: {
  value: string;
  label: string;
  placeholder: string;
  enterKeyHint: "done" | "next";
  readOnly?: boolean;
  className: string;
  onValue: (value: string) => void;
  onEnter: () => void;
  boxRef: (el: HTMLTextAreaElement | null) => void;
  /** Changes when the box's bundle is shown — a hidden box measures 0, so it is measured again then. */
  shownKey?: number;
}) {
  const own = useRef<HTMLTextAreaElement | null>(null);
  useIsoLayoutEffect(() => {
    // Browsers without `field-sizing: content` grow the box from its scrollHeight.
    const el = own.current;
    if (!el || supportsFieldSizing()) return;
    el.style.height = "auto";
    if (el.scrollHeight > 0) el.style.height = `${el.scrollHeight}px`;
  }, [value, shownKey]);
  return (
    <textarea
      ref={(el) => {
        own.current = el;
        boxRef(el);
      }}
      rows={1}
      value={value}
      readOnly={readOnly}
      aria-label={label}
      placeholder={placeholder}
      enterKeyHint={enterKeyHint}
      autoCapitalize="none"
      autoCorrect="off"
      autoComplete="off"
      spellCheck={false}
      onChange={(e) => onValue(e.target.value.replace(/[\r\n]+/g, " "))}
      onKeyDown={(e) => {
        if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === 229) return;
        e.preventDefault();
        onEnter();
      }}
      className={className}
    />
  );
}

// DiffLine (the learner's answer with the marks of GRM-L02) is in ./GrammarDiffLine — every word drawn through koreanOnScreen.

function focusInto(el: HTMLElement | null | undefined, select = false) {
  if (!el) return;
  el.focus({ preventScroll: true });
  if (select && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) el.select();
  el.scrollIntoView({ block: "center", behavior: "smooth" });
}

const rk = (mode: "composition" | "cloze", id: number) => `${mode}:${id}`;

// --- the view -----------------------------------------------------------------------------------

export function GrammarLearningView({
  blocks,
  pairBlocks = null,
  course,
  lessonKey,
  isScript,
}: GrammarLearningViewProps) {
  /**
   * 2026-10-02 (사장님 "영어 표기 + 한글 덧붙임"): a Korean word in the English is DRAWN with its Hangul — "Busan(부산)". Only
   * what is drawn: grading, the blanks' answers, the microphone and the sound keep the English text (src/lib/koreanGloss.ts).
   */
  const gloss = (text: string) => koreanOnScreen(lessonKey, text);
  /** the learner's typed answer as graded — a Korean word written in Hangul counts as the lesson's spelling */
  const asWritten = (text: string) => romanForGrading(lessonKey, text);
  /**
   * A cloze sentence's text between two blanks, drawn as ONE piece from the first part of the run (null for the parts after it) —
   * so a name cut into words ("Han" · " " · "River") is drawn whole: "한강" (koreanOnScreen works on whole names).
   */
  const clozeRun = (parts: { text: string; isBlank: boolean }[], index: number): string | null => {
    if (index > 0 && !parts[index - 1].isBlank) return null;
    let text = "";
    for (let i = index; i < parts.length && !parts[i].isBlank; i++) text += parts[i].text;
    return text ? gloss(text) : null;
  };
  /**
   * GRAMMAR I 07강 (gh1-020 questions / gh1-021 answers) carries the textbook's "문법 확인
   * 문제" — eight Korean questions on be-verb sentences — next to its composition sentences.
   * The lesson is taught with the same four steps as every other GRAMMAR lesson (owner,
   * 2026-09-17); the Q&A is only a folded rule summary above them. It used to be read as
   * the composition items themselves: Korean answers shown as the "영어 정답", 16 items.
   * An exact key, since `includes("020")` also matched GRAMMAR II gh2-020/021.
   */
  const ruleSummary = useMemo<{ question: string; answer: string }[]>(() => {
    if (!/^grammar1\/gh1-02[01]$/.test(lessonKey)) return [];
    const linesOf = (list: Block[] | null | undefined) =>
      (list || []).filter((b) => b.type === "instruction").map((b) => (b as { text: string }).text.trim());
    const hasAnswers = (lines: string[]) => lines.some((l) => /^답:\s*\S/.test(l));
    const main = linesOf(blocks);
    const pair = linesOf(pairBlocks);
    const lines = hasAnswers(main) || !hasAnswers(pair) ? main : pair;
    const out: { question: string; answer: string }[] = [];
    for (let i = 0; i < lines.length; i++) {
      const m = lines[i].match(/^\(\d+\)\s*(.*)$/);
      if (!m) continue;
      const answer: string[] = [];
      while (i + 1 < lines.length && !/^\(\d+\)/.test(lines[i + 1])) {
        const line = lines[i + 1].replace(/^답:\s*/, "").trim();
        if (line) answer.push(line);
        i++;
      }
      out.push({ question: m[1], answer: answer.join(" ") });
    }
    return out;
  }, [blocks, pairBlocks, lessonKey]);

  // Extract Grammar Items
  const items = useMemo<GrammarItem[]>(() => {
    // Standard sentence extraction from main and pair blocks
    const mainSentences = blocks
      .filter((b) => b.type === "sentences")
      .flatMap((b) => (b as { type: "sentences"; items: SentenceItem[] }).items);
    const pairSentences = pairBlocks
      ? pairBlocks
          .filter((b) => b.type === "sentences")
          .flatMap((b) => (b as { type: "sentences"; items: SentenceItem[] }).items)
      : [];

    const count = Math.max(mainSentences.length, pairSentences.length);
    const result: GrammarItem[] = [];

    for (let i = 0; i < count; i++) {
      const m = mainSentences[i];
      const p = pairSentences[i];
      const textM = m?.text ?? "";
      const textP = p?.text ?? "";
      const altM = Array.isArray(m?.alternatives) ? m.alternatives : [];
      const altP = Array.isArray(p?.alternatives) ? p.alternatives : [];

      let en = "";
      let ko = "";
      // The alternatives travel with whichever side turned out to be the English.
      let alternatives: string[] = [];

      if (isEnglish(textM) && !isEnglish(textP)) {
        en = textM;
        ko = textP;
        alternatives = altM;
      } else if (!isEnglish(textM) && isEnglish(textP)) {
        en = textP;
        ko = textM;
        alternatives = altP;
      } else if (hasKorean(textM)) {
        ko = textM;
        en = textP;
        alternatives = altP;
      } else {
        en = textM;
        ko = textP;
        alternatives = altM;
      }

      const cleanEn = cleanText(en);
      const cleanKo = cleanText(ko);
      const { parts, keywords } = buildCloze(cleanEn);

      result.push({
        id: i + 1,
        numberLabel: m?.n || p?.n || String(i + 1),
        koreanText: cleanKo,
        englishText: cleanEn,
        alternatives: alternatives.map(cleanText).filter(Boolean),
        clozeParts: parts,
        targetKeywords: keywords,
      });
    }

    return result;
  }, [blocks, pairBlocks]);

  const bundles = useMemo(() => buildBundles(items.length), [items.length]);
  const totalCount = items.length;

  // --- state -------------------------------------------------------------------------------------
  const [studyMode, setStudyMode] = useState<StudyMode>("composition");
  const [bundle, setBundle] = useState(0);
  const [fontSize, setFontSize] = useState<FontSize>("normal");
  const [audioSpeed, setAudioSpeed] = useState<AudioSpeed>(1.0);

  // Step 1
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [selfGrades, setSelfGrades] = useState<Record<number, boolean>>({});
  const [hints, setHints] = useState<Record<number, boolean>>({});
  // Step 2
  const [clozeInputs, setClozeInputs] = useState<Record<number, Record<number, string>>>({});
  const [clozeTries, setClozeTries] = useState<Record<number, number>>({});
  /** The blank values at the last 확인 — a blank is judged only while it still holds that value (GRM-L14). */
  const [clozeChecked, setClozeChecked] = useState<Record<number, Record<number, string>>>({});
  /**
   * Composition (mode 1) and cloze (mode 2) walk the same item list, and the
   * reveal map used to be keyed on the bare item number. "전체 정답 보기" in
   * composition therefore also uncovered the cloze blanks for every item with
   * a matching number — a learner could read the answers before attempting
   * them. Scope each reveal to the mode it was made in.
   */
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({});
  // Step 3
  const [shadowingRepeats, setShadowingRepeats] = useState<Record<number, number>>({});
  // Step 4
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [lastRun, setLastRun] = useState<RunSummary | null>(null);
  const [lastExam, setLastExam] = useState<ExamSummary | null>(null);

  // not saved
  const [activeSpeakingId, setActiveSpeakingId] = useState<number | null>(null);
  const [nudged, setNudged] = useState<Record<string, boolean>>({});
  const [checkedText, setCheckedText] = useState<Record<number, string>>({});
  const [mic, setMic] = useState<{ id: number; interim: string } | null>(null);
  const [micResults, setMicResults] = useState<Record<number, { transcript: string; prev: string }>>({});
  const [micErrors, setMicErrors] = useState<Record<number, string>>({});
  const [micSupported, setMicSupported] = useState(true);
  const [micRestricted, setMicRestricted] = useState(false);
  const [examNotice, setExamNotice] = useState(false);
  const [confirming, setConfirming] = useState<"reset" | "new-run" | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  // FUN-07: the snapshot last written. Restoring saved work changes the state
  // without the learner touching anything, and the save effect used to treat
  // that as a save — so a fresh profile saw "오후 7:05:36 자동 저장됨" on first
  // paint. A save is now only a save when the snapshot differs.
  const lastSavedRef = useRef<string | null>(null);
  const restoredKeyRef = useRef<string | null>(null);
  const pendingTabRef = useRef<StudyMode | null>(null);
  const modeRef = useRef<StudyMode>("composition");
  const answersRef = useRef<Record<number, string>>({});
  const recognizerRef = useRef<VoiceRecognizerHandle | null>(null);
  const answerRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const examRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const examRowRefs = useRef<Record<number, HTMLLIElement | null>>({});
  const blankRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const tabRefs = useRef<Partial<Record<StudyMode, HTMLButtonElement | null>>>({});
  const bundleTopRef = useRef<HTMLDivElement | null>(null);
  const bundleEndRef = useRef<HTMLDivElement | null>(null);
  const examTopRef = useRef<HTMLElement | null>(null);
  const examSummaryRef = useRef<HTMLDivElement | null>(null);
  const examSubmitRef = useRef<HTMLButtonElement | null>(null);
  const examScrollRef = useRef<number | "summary" | null>(null);

  const storageKey = `kig:grammar:work:${lessonKey}`;
  const lessonId = lessonKey.split("/").pop() || lessonKey;
  const learningProfile = useMemo(() => grammarLearningProfile(course), [course]);
  const fs = FONT_STYLES[fontSize];
  const bundleIndex = Math.min(bundle, bundles.length - 1);
  const [bundleStart, bundleEnd] = bundles[bundleIndex];
  const bundleItems = items.slice(bundleStart, bundleEnd);

  useEffect(() => {
    modeRef.current = studyMode;
  }, [studyMode]);
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  /**
   * The lesson's review entries for the engine (계획 D12 · 공통-학습-엔진.md §5): the sentences missed or
   * helped in this lesson — on the retry list of Step 1 (wrong, hinted or opened without an attempt), a
   * written exam answer that was not fully right, and whatever first tries the course log still holds
   * as wrong or helped. Read at the moment the learner finishes the lesson.
   */
  // The lesson is finished (LessonEndBar → ProgressProvider.toggleComplete announces it): its first
  // completion date is kept and its misses come back from tomorrow. Un-completing keeps the record.
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ course?: string; lessonId?: string; completed?: boolean }>).detail;
      if (!detail || detail.course !== course || detail.lessonId !== lessonId || !detail.completed) return;
      const missed = new Set<number>();
      for (const it of items) {
        if (selfGrades[it.id] === false || hints[it.id] === true) missed.add(it.id);
        if (examResult && (examAnswers[it.id] || "").trim() && (examResult.perItem[it.id] ?? "incorrect") !== "exact") missed.add(it.id);
      }
      for (const entry of readCourseRecord(course).log) {
        if (entry.lessonId !== lessonId || entry.where !== "lesson" || !entry.firstTry) continue;
        if (entry.correct && entry.help === "none") continue;
        const id = Number(entry.item.split("#")[1]);
        if (items.some((it) => it.id === id)) missed.add(id);
      }
      const entries = [...missed].sort((a, b) => a - b).map((id) => ({ key: grammarItemKey(lessonId, id), kind: "sentence" }));
      markLessonDone(learningProfile, lessonId, entries);
    };
    window.addEventListener(LESSON_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(LESSON_COMPLETE_EVENT, onComplete);
  }, [course, lessonId, learningProfile, items, selfGrades, hints, examResult, examAnswers]);

  // The microphone: asked once for the whole view (GRM-U09).
  useEffect(() => {
    setMicSupported(isSpeechRecognitionSupported());
    setMicRestricted(isKakaoTalk() || isInAppBrowser());
  }, []);

  // Per-device preferences (GRM-U05): font size and sentence speed.
  useEffect(() => {
    try {
      const prefs: unknown = JSON.parse(window.localStorage.getItem(PREFS_KEY) || "null");
      if (isRecord(prefs)) {
        if (prefs.fontSize === "normal" || prefs.fontSize === "large" || prefs.fontSize === "xlarge") setFontSize(prefs.fontSize);
        if (prefs.audioSpeed === 0.85 || prefs.audioSpeed === 1) setAudioSpeed(prefs.audioSpeed as AudioSpeed);
      }
    } catch {
      // ignore
    }
  }, []);

  function choosePrefs(next: { fontSize?: FontSize; audioSpeed?: AudioSpeed }) {
    const font = next.fontSize ?? fontSize;
    const speed = next.audioSpeed ?? audioSpeed;
    setFontSize(font);
    setAudioSpeed(speed);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify({ fontSize: font, audioSpeed: speed }));
    } catch {
      // ignore
    }
  }

  // Restore saved progress from localStorage (once per lesson)
  useEffect(() => {
    if (restoredKeyRef.current === storageKey) return;
    restoredKeyRef.current = storageKey;
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(storageKey);
    } catch {
      raw = null;
    }
    const { work, at } = readWork(raw, items);
    setAnswers(work.answers);
    setSelfGrades(work.selfGrades);
    setHints(work.hints);
    setClozeInputs(work.clozeInputs);
    setClozeTries(work.clozeTries);
    setClozeChecked(work.clozeChecked);
    setRevealedAnswers(work.revealedAnswers);
    setShadowingRepeats(work.shadowingRepeats);
    setExamAnswers(work.examAnswers);
    setExamResult(work.examResult);
    setLastRun(work.lastRun);
    setLastExam(work.lastExam);
    setStudyMode(work.studyMode);
    setBundle(work.bundle);
    setSavedAt(at);
    // GRM-U26: the step comes back too. LessonStepNavigation learns the step from a click on its tab,
    // so the restored tab is clicked once the page has settled (see the effect below).
    pendingTabRef.current = work.studyMode !== "composition" ? work.studyMode : null;
    lastSavedRef.current = JSON.stringify(work);
    setRestored(true);
  }, [storageKey, items]);

  useEffect(() => {
    if (!restored || !pendingTabRef.current) return;
    const click = () => {
      const mode = pendingTabRef.current;
      if (mode && modeRef.current === mode) tabRefs.current[mode]?.click();
    };
    const frame = window.requestAnimationFrame(click);
    const timer = window.setTimeout(() => {
      click();
      pendingTabRef.current = null;
    }, 400);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [restored]);

  const work = useMemo(
    () =>
      packWork({
        answers,
        selfGrades,
        hints,
        clozeInputs,
        clozeTries,
        clozeChecked,
        revealedAnswers,
        shadowingRepeats,
        examAnswers,
        examResult,
        lastRun,
        lastExam,
        studyMode,
        bundle: bundleIndex,
      }),
    [answers, selfGrades, hints, clozeInputs, clozeTries, clozeChecked, revealedAnswers, shadowingRepeats, examAnswers, examResult, lastRun, lastExam, studyMode, bundleIndex],
  );

  // Auto-save to localStorage — only when something actually changed.
  useEffect(() => {
    if (!restored) return;
    const snapshot = JSON.stringify(work);
    if (snapshot === lastSavedRef.current) return;
    const timer = setTimeout(() => {
      try {
        const at = formatSavedAt();
        // `examSubmitted` is kept for readers of the old format; version 2 reads examResult.
        window.localStorage.setItem(storageKey, JSON.stringify({ v: WORK_VERSION, ...work, examSubmitted: work.examResult !== null, at }));
        lastSavedRef.current = snapshot;
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [work, storageKey, restored]);

  // Stop speech synthesis and the microphone on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      recognizerRef.current?.abort();
    };
  }, []);

  // After grading, bring the first item that was not fully right into view (GRM-U08).
  useEffect(() => {
    if (!examResult || examScrollRef.current === null) return;
    const frame = window.requestAnimationFrame(() => {
      const target = examScrollRef.current;
      examScrollRef.current = null;
      const el = target === "summary" ? examSummaryRef.current : target === null ? null : examRowRefs.current[target];
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [examResult]);

  // --- audio ---------------------------------------------------------------------------------------
  function playEnglish(text: string, id: number) {
    if (!text) return;
    if (activeSpeakingId === id) {
      stopSpeech();
      setActiveSpeakingId(null);
      return;
    }
    stopSpeech();
    setActiveSpeakingId(id);
    // a Korean word written in romanization ('Seoul', 'Busan') is said in Korean (lessonSpeechForm — 소유자 결정 2026-09-25)
    speakText(lessonSpeechForm(lessonKey, text), {
      lang: "en",
      rate: audioSpeed,
      onStart: () => setActiveSpeakingId(id),
      onEnd: () => setActiveSpeakingId((curr) => (curr === id ? null : curr)),
      onError: () => setActiveSpeakingId((curr) => (curr === id ? null : curr)),
    });
  }

  function playButton(item: GrammarItem) {
    const speaking = activeSpeakingId === item.id;
    return (
      <button
        type="button"
        data-play
        onClick={() => playEnglish(item.englishText, item.id)}
        aria-label={speaking ? "정지" : "문장 듣기"}
        title={speaking ? "정지" : "문장 듣기"}
        className={
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer " +
          (speaking ? "border-ink bg-ink text-surface" : "border-line bg-raised text-ink hover:bg-sunken")
        }
      >
        {speaking ? <IconStop /> : <IconSpeaker />}
      </button>
    );
  }

  function changeMode(mode: StudyMode) {
    if (mic) {
      recognizerRef.current?.abort();
      setMic(null);
    }
    setConfirming(null);
    setStudyMode(mode);
  }

  function changeBundle(next: number) {
    const target = Math.max(0, Math.min(bundles.length - 1, next));
    setBundle(target);
    window.requestAnimationFrame(() => bundleTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  // --- Step 1 ---------------------------------------------------------------------------------------
  const dropKey = <T,>(map: Record<number, T>, ids: number[]) => {
    const next = { ...map };
    for (const id of ids) delete next[id];
    return next;
  };

  function setAnswer(id: number, value: string) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function isFromMic(id: number) {
    const heard = micResults[id];
    return !!heard && heard.transcript === (answers[id] || "");
  }

  /**
   * The common learning engine (src/lib/learning, 공통-학습-엔진.md §2 · §5): one answer inside the
   * lesson, with this view's own verdict. An answer inside a lesson never counts toward a pass — the
   * engine keeps it in the course log, and the lesson's misses come back from the next day once the
   * lesson is finished (below). Stored on this device only (계획 D04 is the owner's).
   */
  function noteAttempt(id: number, attempt: { correct: boolean; help: Help; mode: AnswerMode; answer?: string; firstTry?: boolean }) {
    recordAttempt(learningProfile, grammarItemKey(lessonId, id), {
      lessonId,
      kind: "sentence",
      correct: attempt.correct,
      help: attempt.help,
      mode: attempt.mode,
      where: "lesson",
      firstTry: attempt.firstTry ?? selfGrades[id] === undefined,
      ...(attempt.answer && !attempt.correct ? { answer: attempt.answer } : {}),
    });
  }

  /**
   * 확인 (GRM-U02 · L02 · L09 · L07). The first 확인 of an attempt grades it: an exactly right TYPED
   * answer without a hint is '맞음'; anything else goes to the retry list. A spoken answer is graded
   * the same way (numbers matched) but never turns '맞음' on by itself. With nothing written, the
   * first press asks for an attempt and the second shows the answer (as a retry item).
   */
  function checkItem(item: GrammarItem) {
    const id = item.id;
    const key = rk("composition", id);
    const value = (answers[id] || "").trim();
    const open = revealedAnswers[key] === true;
    if (!value) {
      if (open) return;
      if (nudged[key] || hints[id]) {
        // the answer opened without an attempt — a miss for the engine
        noteAttempt(id, { correct: false, help: "reveal", mode: "typed" });
        setRevealedAnswers((prev) => ({ ...prev, [key]: true }));
        setSelfGrades((prev) => ({ ...prev, [id]: false }));
      } else {
        setNudged((prev) => ({ ...prev, [key]: true }));
      }
      return;
    }
    if (!open) {
      const spoken = isFromMic(id);
      const grade = spoken ? gradeSpokenAnswer(value, referencesOf(item)) : gradeAgainstReferences(asWritten(value), referencesOf(item));
      noteAttempt(id, { correct: grade === "exact", help: hints[id] ? "hint" : "none", mode: spoken ? "voice" : "typed", answer: value });
      if (grade !== "exact" || hints[id]) setSelfGrades((prev) => ({ ...prev, [id]: false }));
      else if (!spoken) setSelfGrades((prev) => ({ ...prev, [id]: true }));
      setRevealedAnswers((prev) => ({ ...prev, [key]: true }));
    }
    setCheckedText((prev) => ({ ...prev, [id]: answers[id] || "" }));
  }

  function focusNextComposition(id: number) {
    const at = bundleItems.findIndex((it) => it.id === id);
    const next = at >= 0 ? bundleItems[at + 1] : undefined;
    if (next) focusInto(answerRefs.current[next.id]);
    else focusInto(bundleEndRef.current?.querySelector("button"));
  }

  /** Enter = 확인; Enter again on an answer already checked = the next item (focus stays after 확인). */
  function enterComposition(item: GrammarItem) {
    const id = item.id;
    const open = revealedAnswers[rk("composition", id)] === true;
    const value = answers[id] || "";
    if (open && (checkedText[id] === value || !value.trim())) focusNextComposition(id);
    else checkItem(item);
  }

  function clearComposition(ids: number[]) {
    if (!ids.length) return;
    setAnswers((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = "";
      return next;
    });
    setRevealedAnswers((prev) => {
      const next = { ...prev };
      for (const id of ids) next[rk("composition", id)] = false;
      return next;
    });
    setNudged((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[rk("composition", id)];
      return next;
    });
    setHints((prev) => dropKey(prev, ids));
    setMicResults((prev) => dropKey(prev, ids));
    setMicErrors((prev) => dropKey(prev, ids));
    setCheckedText((prev) => dropKey(prev, ids));
  }

  /** UX-02: '다시 풀기' empties the box the learner is about to retry in, and keeps the item on the retry list. */
  function retryItem(id: number) {
    clearComposition([id]);
    setSelfGrades((prev) => ({ ...prev, [id]: false }));
    focusInto(answerRefs.current[id]);
  }

  const isRetryComposition = (item: GrammarItem) =>
    selfGrades[item.id] === false || (hints[item.id] === true && selfGrades[item.id] !== true);

  function retryWrongComposition() {
    const ids = bundleItems.filter(isRetryComposition).map((it) => it.id);
    clearComposition(ids);
    setSelfGrades((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = false;
      return next;
    });
    if (ids.length) focusInto(answerRefs.current[ids[0]]);
  }

  function markCorrect(id: number) {
    setSelfGrades((prev) => ({ ...prev, [id]: true }));
  }

  function showHint(id: number) {
    setHints((prev) => ({ ...prev, [id]: true }));
    focusInto(answerRefs.current[id]);
  }

  function revealAll(show: boolean) {
    // Merge rather than replace: wiping the whole map also cleared whatever the
    // learner had revealed in the other modes.
    setRevealedAnswers((prev) => {
      const next = { ...prev };
      items.forEach((it) => {
        next[rk("composition", it.id)] = show;
      });
      return next;
    });
  }

  /** GRM-L05 (다): a fresh round of Step 1; the last round's result stays as one line. */
  function newRun() {
    setLastRun({ correct: items.filter((it) => selfGrades[it.id] === true).length, total: totalCount, at: formatSavedAt() });
    const ids = items.map((it) => it.id);
    clearComposition(ids);
    setSelfGrades({});
    setConfirming(null);
    changeBundle(0);
  }

  function toggleMic(item: GrammarItem) {
    const id = item.id;
    if (mic?.id === id) {
      recognizerRef.current?.stop();
      setMic(null);
      return;
    }
    recognizerRef.current?.abort();
    stopSpeech();
    setActiveSpeakingId(null);
    setMicErrors((prev) => dropKey(prev, [id]));
    setMic({ id, interim: "" });
    const handle = listenToSpeech({
      lang: "en-US",
      onInterim: (interim) => setMic((m) => (m && m.id === id ? { id, interim } : m)),
      onResult: (transcript) => {
        setMic((m) => (m && m.id === id ? null : m));
        const before = answersRef.current[id] || "";
        setMicResults((prev) => ({ ...prev, [id]: { transcript, prev: before } }));
        setAnswers((prev) => ({ ...prev, [id]: transcript }));
      },
      onError: (message) => {
        setMic((m) => (m && m.id === id ? null : m));
        setMicErrors((prev) => ({ ...prev, [id]: message }));
      },
      onEnd: () => setMic((m) => (m && m.id === id ? null : m)),
    });
    recognizerRef.current = handle;
    if (!handle) setMic(null);
  }

  function undoMic(id: number) {
    const heard = micResults[id];
    if (!heard) return;
    setAnswers((prev) => ({ ...prev, [id]: heard.prev }));
    setMicResults((prev) => dropKey(prev, [id]));
    focusInto(answerRefs.current[id]);
  }

  // --- Step 2 ---------------------------------------------------------------------------------------
  const blanksOf = (item: GrammarItem) =>
    item.clozeParts.map((part, index) => ({ part, index })).filter((b) => b.part.isBlank);
  const blankValue = (id: number, index: number) => clozeInputs[id]?.[index] ?? "";
  const blankRight = (value: string, answer: string | undefined) =>
    // Same comparison as the exam: contractions expanded AND literal, so "dont" for "don't" still counts.
    !!value.trim() && gradeAnswer(value, answer || "") === "exact";

  function setBlank(id: number, index: number, value: string) {
    setClozeInputs((prev) => ({ ...prev, [id]: { ...(prev[id] || {}), [index]: value } }));
  }

  /** Judged when the sentence is confirmed, not while typing (GRM-L14); the second miss shows the answer. */
  function checkCloze(item: GrammarItem): "empty" | "right" | "wrong" | "shown" {
    const id = item.id;
    const blanks = blanksOf(item);
    const values = blanks.map((b) => blankValue(id, b.index));
    if (values.every((v) => !v.trim())) {
      setNudged((prev) => ({ ...prev, [rk("cloze", id)]: true }));
      return "empty";
    }
    const snapshot: Record<number, string> = {};
    blanks.forEach((b, k) => {
      snapshot[b.index] = values[k];
    });
    const allRight = blanks.every((b, k) => blankRight(values[k], b.part.answer));
    const tries = (clozeTries[id] || 0) + 1;
    setClozeChecked((prev) => ({ ...prev, [id]: snapshot }));
    setClozeTries((prev) => ({ ...prev, [id]: tries }));
    setNudged((prev) => ({ ...prev, [rk("cloze", id)]: false }));
    if (!allRight && tries >= 2) {
      setRevealedAnswers((prev) => ({ ...prev, [rk("cloze", id)]: true }));
      return "shown";
    }
    return allRight ? "right" : "wrong";
  }

  function focusNextCloze(id: number) {
    const at = bundleItems.findIndex((it) => it.id === id);
    const next = bundleItems.slice(at + 1).find((it) => blanksOf(it).length > 0 && revealedAnswers[rk("cloze", it.id)] !== true);
    if (next) focusInto(blankRefs.current[`${next.id}:${blanksOf(next)[0].index}`]);
    else focusInto(bundleEndRef.current?.querySelector("button"));
  }

  /** GRM-U01: Enter moves to the next blank of the sentence; on its last blank it confirms the sentence. */
  function enterBlank(item: GrammarItem, order: number) {
    const blanks = blanksOf(item);
    if (order < blanks.length - 1) {
      focusInto(blankRefs.current[`${item.id}:${blanks[order + 1].index}`], true);
      return;
    }
    const outcome = checkCloze(item);
    if (outcome === "right" || outcome === "shown") focusNextCloze(item.id);
    else if (outcome === "wrong") {
      const firstWrong = blanks.find((b) => !blankRight(blankValue(item.id, b.index), b.part.answer));
      if (firstWrong) focusInto(blankRefs.current[`${item.id}:${firstWrong.index}`], true);
    }
  }

  function clearCloze(ids: number[]) {
    if (!ids.length) return;
    setClozeInputs((prev) => dropKey(prev, ids));
    setClozeTries((prev) => dropKey(prev, ids));
    setClozeChecked((prev) => dropKey(prev, ids));
    setRevealedAnswers((prev) => {
      const next = { ...prev };
      for (const id of ids) next[rk("cloze", id)] = false;
      return next;
    });
    setNudged((prev) => {
      const next = { ...prev };
      for (const id of ids) delete next[rk("cloze", id)];
      return next;
    });
  }

  function retryCloze(item: GrammarItem) {
    clearCloze([item.id]);
    const first = blanksOf(item)[0];
    if (first) focusInto(blankRefs.current[`${item.id}:${first.index}`]);
  }

  const clozeMissed = (item: GrammarItem) => {
    const checked = clozeChecked[item.id];
    if (!checked) return false;
    return blanksOf(item).some((b) => !blankRight(checked[b.index] ?? "", b.part.answer));
  };

  function retryWrongCloze() {
    const wrong = bundleItems.filter(clozeMissed);
    clearCloze(wrong.map((it) => it.id));
    const first = wrong[0] ? blanksOf(wrong[0])[0] : undefined;
    if (wrong[0] && first) focusInto(blankRefs.current[`${wrong[0].id}:${first.index}`]);
  }

  // --- Step 3 ---------------------------------------------------------------------------------------
  function addRepetition(id: number) {
    setShadowingRepeats((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }));
  }

  // --- Step 4 ---------------------------------------------------------------------------------------
  const examAnswered = items.filter((it) => (examAnswers[it.id] || "").trim().length > 0).length;

  function submitExam() {
    // FUN-05: an empty sheet is told what to do, not graded as all wrong.
    if (examAnswered === 0) {
      setExamNotice(true);
      return;
    }
    const result = gradeExam(items, examAnswers, formatSavedAt(), asWritten);
    // every written answer of the sheet, for the engine (an empty line is not an attempt)
    for (const it of items) {
      const written = (examAnswers[it.id] || "").trim();
      if (written) noteAttempt(it.id, { correct: result.perItem[it.id] === "exact", help: "none", mode: "typed", answer: written, firstTry: true });
    }
    const firstMiss = items.find((it) => result.perItem[it.id] !== "exact");
    examScrollRef.current = firstMiss ? firstMiss.id : "summary";
    setExamResult(result);
    setExamNotice(false);
  }

  function rememberExam(result: ExamResult) {
    setLastExam({ score: result.score, exact: result.exact, partial: result.partial, total: result.total, at: result.at });
  }

  /** '틀린 것만 다시': only the items that were not fully right are emptied; the rest stay for the next grading. */
  function retryWrongExam() {
    if (!examResult) return;
    const wrong = items.filter((it) => (examResult.perItem[it.id] ?? "incorrect") !== "exact").map((it) => it.id);
    rememberExam(examResult);
    setExamAnswers((prev) => dropKey(prev, wrong));
    setExamResult(null);
    if (wrong.length) window.requestAnimationFrame(() => focusInto(examRefs.current[wrong[0]]));
  }

  /** '새 시험': an empty sheet; the last score stays as one line. */
  function newExam() {
    if (examResult) rememberExam(examResult);
    setExamAnswers({});
    setExamResult(null);
    setExamNotice(false);
    window.requestAnimationFrame(() => examTopRef.current?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }

  function enterExam(item: GrammarItem) {
    const at = items.findIndex((it) => it.id === item.id);
    const next = items[at + 1];
    if (next) focusInto(examRefs.current[next.id]);
    else focusInto(examSubmitRef.current);
  }

  // --- everything ------------------------------------------------------------------------------------
  function resetAll() {
    setAnswers({});
    setSelfGrades({});
    setHints({});
    setClozeInputs({});
    setClozeTries({});
    setClozeChecked({});
    setRevealedAnswers({});
    setShadowingRepeats({});
    setExamAnswers({});
    setExamResult(null);
    setLastRun(null);
    setLastExam(null);
    setBundle(0);
    setNudged({});
    setCheckedText({});
    setMicResults({});
    setMicErrors({});
    setExamNotice(false);
    setConfirming(null);
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }

  // --- metrics ---------------------------------------------------------------------------------------
  const answeredCount = items.filter((it) => (answers[it.id] || "").trim().length > 0).length;
  const correctCount = items.filter((it) => selfGrades[it.id] === true).length;
  const retryCount = items.filter((it) => selfGrades[it.id] === false).length;
  // GRM-U13: 맞음 ÷ (맞음 + 다시 풀기) — it can no longer pass 100%.
  const accuracy = correctCount + retryCount > 0 ? Math.round((correctCount / (correctCount + retryCount)) * 100) : null;

  const blanksTotal = items.reduce((sum, it) => sum + blanksOf(it).length, 0);
  const blanksRight = items.reduce((sum, it) => {
    const checked = clozeChecked[it.id];
    if (!checked) return sum;
    return sum + blanksOf(it).filter((b) => blankRight(checked[b.index] ?? "", b.part.answer)).length;
  }, 0);
  const repeatedCount = items.filter((it) => (shadowingRepeats[it.id] || 0) >= 3).length;

  // --- render pieces -----------------------------------------------------------------------------------
  const stepNumber = STEPS.find((s) => s.mode === studyMode)?.n ?? 1;

  function summaryLine(text: string, attrs: Record<string, string | number>, progress: number) {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          data-summary
          {...Object.fromEntries(Object.entries(attrs).map(([k, v]) => [`data-${k}`, String(v)]))}
          className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-caption text-ink-soft"
        >
          <span className="tabular-nums">{text}</span>
          {savedAt ? <span data-saved>{savedAt} 자동 저장됨</span> : null}
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-sunken" aria-hidden>
          <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
        </div>
      </div>
    );
  }

  function micNotice(kind: "answer" | "repeat") {
    if (micSupported) return null;
    const where = micRestricted
      ? "카카오톡 같은 앱 안의 브라우저에서는 마이크를 쓸 수 없어요. 오른쪽 위 메뉴에서 다른 브라우저로 열어 주세요."
      : "이 브라우저에서는 마이크를 쓸 수 없어요. Chrome이나 Safari에서 열면 쓸 수 있어요.";
    return (
      <p data-mic-notice className="text-caption text-ink-soft">
        {kind === "answer" ? `${where} 답은 글로 쓰면 됩니다.` : `${where} '따라 말했어요'로 세면 됩니다.`}
      </p>
    );
  }

  function bundleNav() {
    if (bundles.length < 2) return null;
    return (
      <div
        ref={bundleTopRef}
        data-set-nav
        data-set-index={bundleIndex}
        data-set-count={bundles.length}
        className="flex scroll-mt-[calc(var(--header-h)+12px)] items-center justify-between gap-2"
      >
        <p className="text-label tabular-nums text-ink-soft">
          문제 {bundleStart + 1}–{bundleEnd} / {totalCount}
        </p>
        <div className="flex items-center gap-1">
          {bundleIndex > 0 ? (
            <button
              type="button"
              data-set-prev
              onClick={() => changeBundle(bundleIndex - 1)}
              className="min-h-11 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken"
            >
              ← 이전 묶음
            </button>
          ) : null}
          {bundleIndex < bundles.length - 1 ? (
            <button
              type="button"
              data-set-next
              onClick={() => changeBundle(bundleIndex + 1)}
              className="min-h-11 rounded-control px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
            >
              다음 묶음 →
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const filledButton =
    "min-h-11 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90";
  const outlineButton =
    "min-h-11 rounded-control border border-line bg-raised px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken";
  const quietButton =
    "min-h-11 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken";

  function bundleEndBar(misses: number, missLabel: string, retry: "composition" | "cloze" | null, note: string) {
    const hasNext = bundleIndex < bundles.length - 1;
    if (!note && !misses && !hasNext) return null;
    return (
      <div ref={bundleEndRef} data-bundle-end className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-label tabular-nums text-ink-soft">{note}</p>
        <div className="flex flex-wrap items-center gap-2">
          {misses > 0 && retry ? (
            <button
              type="button"
              data-retry-wrong
              onClick={() => (retry === "composition" ? retryWrongComposition() : retryWrongCloze())}
              className={filledButton}
            >
              {missLabel} ({misses})
            </button>
          ) : null}
          {hasNext ? (
            <button
              type="button"
              data-set-next
              onClick={() => changeBundle(bundleIndex + 1)}
              className={misses > 0 && retry ? outlineButton : filledButton}
            >
              다음 묶음 →
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  function moreMenu(mode: StudyMode) {
    return (
      <details data-more className="group rounded-card border border-line bg-raised">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-card px-4 text-label font-medium text-ink-soft transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
          <span>⋯ 더보기</span>
          <IconChevron className="text-ink-soft transition-transform group-open:rotate-180" />
        </summary>
        <div className="flex flex-col gap-4 border-t border-line px-4 py-4">
          {mode === "composition" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" data-action="reveal-all" onClick={() => revealAll(true)} className={outlineButton}>
                전체 정답 보기
              </button>
              <button type="button" data-action="hide-all" onClick={() => revealAll(false)} className={outlineButton}>
                전체 정답 가리기
              </button>
              {confirming === "new-run" ? (
                <div className="flex w-full flex-wrap items-center gap-2" role="group" aria-label="1단계 새로 풀기 확인">
                  <p className="text-label text-ink">
                    1단계 답을 비우고 처음부터 풀까요? 지금 결과(맞음 {correctCount}/{totalCount})는 한 줄로 남아요.
                  </p>
                  <button type="button" data-action="new-run-confirm" onClick={newRun} className={filledButton}>
                    새로 풀기
                  </button>
                  <button type="button" data-action="new-run-cancel" onClick={() => setConfirming(null)} className={quietButton}>
                    취소
                  </button>
                </div>
              ) : (
                <button type="button" data-action="new-run" onClick={() => setConfirming("new-run")} className={outlineButton}>
                  1단계 새로 풀기
                </button>
              )}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="글자 크기">
            <span className="w-20 text-label text-ink-soft">글자 크기</span>
            <div className="flex gap-1 rounded-control bg-sunken p-1">
              {(["normal", "large", "xlarge"] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  data-font={size}
                  aria-pressed={fontSize === size}
                  onClick={() => choosePrefs({ fontSize: size })}
                  className={
                    "min-h-11 min-w-11 rounded-control px-3 text-label transition-colors cursor-pointer " +
                    (fontSize === size ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft")
                  }
                >
                  {FONT_LABEL[size]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="문장 속도">
            <span className="w-20 text-label text-ink-soft">문장 속도</span>
            <div className="flex gap-1 rounded-control bg-sunken p-1">
              {([1.0, 0.85] as const).map((speed) => (
                <button
                  key={speed}
                  type="button"
                  data-speed={speed}
                  aria-pressed={audioSpeed === speed}
                  onClick={() => choosePrefs({ audioSpeed: speed })}
                  title={speed === 1 ? "음성 속도 1.0x" : "음성 속도 0.85x (천천히)"}
                  className={
                    "min-h-11 min-w-11 rounded-control px-3 text-label tabular-nums transition-colors cursor-pointer " +
                    (audioSpeed === speed ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft")
                  }
                >
                  {speed === 1 ? "1.0×" : "0.85×"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-line pt-4">
            {confirming === "reset" ? (
              <div className="flex flex-wrap items-center gap-2" role="group" aria-label="기록 지우기 확인">
                <p className="w-full text-label text-ink">이 강의의 네 단계 답과 기록이 모두 지워져요. 지울까요?</p>
                <button
                  type="button"
                  data-action="reset-confirm"
                  onClick={resetAll}
                  className="min-h-11 rounded-control bg-danger px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
                >
                  지우기
                </button>
                <button type="button" data-action="reset-cancel" onClick={() => setConfirming(null)} className={quietButton}>
                  취소
                </button>
              </div>
            ) : (
              <button type="button" data-action="reset" onClick={() => setConfirming("reset")} className={`${quietButton} self-start`}>
                이 강의 기록 모두 지우기
              </button>
            )}
            <p className="text-caption text-ink-faint">기록은 이 기기의 브라우저에만 저장돼요. 다른 기기에서는 이어지지 않아요.</p>
          </div>
        </div>
      </details>
    );
  }

  // --- Step 1 item ---------------------------------------------------------------------------------
  function renderComposition(item: GrammarItem) {
    const id = item.id;
    const n = item.numberLabel;
    const value = answers[id] || "";
    const key = rk("composition", id);
    const revealed = revealedAnswers[key] === true;
    const grade = selfGrades[id];
    const hinted = hints[id] === true;
    const blankCount = blanksOf(item).length;
    const listening = mic?.id === id;
    const heard = micResults[id];
    const spoken = !!heard && heard.transcript === value;
    const refs = referencesOf(item);
    const diff: AnswerDiff | null =
      revealed && value.trim() ? (spoken ? diffSpokenAnswer(value, refs) : diffAgainstReferences(asWritten(value), refs)) : null;
    const badge = grade === true ? "done" : grade === false ? "review" : hinted ? "hint" : null;

    return (
      <li key={id} data-item={n} data-id={id} className="flex gap-3 px-4 py-3.5">
        <span data-q className="w-7 shrink-0 pt-2.5 text-label font-semibold tabular-nums text-ink-soft">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p data-ko className={`min-w-0 pt-2 font-semibold text-ink ${fs.korean}`}>
              {item.koreanText}
            </p>
            {badge ? (
              <span
                data-badge={badge}
                className={
                  "shrink-0 pt-2.5 text-label font-semibold " +
                  (badge === "done" ? "text-success" : badge === "review" ? "text-danger" : "text-ink-soft")
                }
              >
                {badge === "done" ? "✓ 맞음" : badge === "review" ? "↺ 다시 풀 문제" : "힌트 씀"}
              </span>
            ) : !revealed && blankCount > 0 ? (
              <button
                type="button"
                data-hint
                onClick={() => showHint(id)}
                className="min-h-11 shrink-0 rounded-control px-2 text-label font-medium text-ink-soft underline-offset-4 transition-colors cursor-pointer hover:bg-sunken hover:underline"
              >
                빈칸 힌트
              </button>
            ) : null}
          </div>

          {hinted && !revealed ? (
            <p data-hint-text className={`mt-1 text-ink-soft ${fs.english}`}>
              <span className="sr-only">빈칸 힌트: </span>
              {item.clozeParts.map((part, index) =>
                part.isBlank ? (
                  <span key={index} aria-label="빈칸" className="mx-0.5 inline-block w-[3.5em] border-b-2 border-ink-soft align-baseline">
                    &nbsp;
                  </span>
                ) : (
                  <Fragment key={index}>{clozeRun(item.clozeParts, index)}</Fragment>
                ),
              )}
            </p>
          ) : null}

          <div className="mt-1.5 flex items-end gap-2">
            <AnswerBox
              value={value}
              label={`${n}번 영작 답안`}
              placeholder="영어로 써 보세요"
              enterKeyHint="done"
              onValue={(v) => setAnswer(id, v)}
              onEnter={() => enterComposition(item)}
              shownKey={bundleIndex}
              boxRef={(el) => {
                answerRefs.current[id] = el;
              }}
              className={`min-h-11 w-full min-w-0 flex-1 resize-none overflow-hidden rounded-control border border-line bg-raised px-3 py-2 leading-snug text-ink placeholder:text-ink-faint [field-sizing:content] focus:border-ink focus:outline-none ${fs.input}`}
            />
            {micSupported ? (
              <button
                type="button"
                data-mic
                onClick={() => toggleMic(item)}
                aria-label={listening ? "듣기 멈추기" : `${n}번 말로 답하기`}
                aria-pressed={listening}
                title={listening ? "듣기 멈추기" : "말로 답하기"}
                className={
                  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors cursor-pointer " +
                  (listening ? "border-danger bg-danger/10 text-danger" : "border-line bg-raised text-ink hover:bg-sunken")
                }
              >
                {listening ? <IconStop /> : <IconMic />}
              </button>
            ) : null}
            <button
              type="button"
              data-check
              onClick={() => checkItem(item)}
              aria-label={`${n}번 확인`}
              className="h-11 shrink-0 rounded-control border border-line-strong bg-raised px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
            >
              확인
            </button>
          </div>

          {listening ? (
            <p data-mic-line role="status" className="mt-1.5 text-label text-danger">
              듣고 있어요 — 영어로 말하세요{mic?.interim ? ` · “${mic.interim}”` : ""}
            </p>
          ) : null}
          {micErrors[id] ? (
            <p data-mic-error role="status" className="mt-1.5 text-label text-danger">
              {micErrors[id]}
            </p>
          ) : null}
          {spoken && heard && !revealed ? (
            <div data-mic-line role="status" className="mt-1.5 flex flex-wrap items-center gap-x-2 text-label text-ink-soft">
              <span>들은 문장: “{heard.transcript}”</span>
              {(() => {
                const g = gradeSpokenAnswer(heard.transcript, refs);
                return (
                  <span data-mic-grade={g} className={`font-semibold ${g === "exact" ? "text-success" : g === "incorrect" ? "text-danger" : "text-ink"}`}>
                    {SPOKEN_TEXT[g]}
                  </span>
                );
              })()}
              {heard.prev.trim() && heard.prev !== heard.transcript ? (
                <button
                  type="button"
                  data-mic-undo
                  onClick={() => undoMic(id)}
                  className="min-h-11 rounded-control px-2 text-label font-medium text-ink underline-offset-4 transition-colors cursor-pointer hover:bg-sunken hover:underline"
                >
                  내 입력으로 되돌리기
                </button>
              ) : null}
            </div>
          ) : null}
          {nudged[key] && !revealed && !value.trim() ? (
            <p data-nudge role="status" className="mt-1.5 text-label text-ink-soft">
              먼저 영어로 써 보세요.{" "}
              {blankCount > 0 && !hinted ? "막히면 '빈칸 힌트'를 누르세요." : "한 번 더 누르면 정답을 보여 드려요."}
            </p>
          ) : null}

          {revealed ? renderAnswerPanel(item, diff, spoken) : null}
        </div>
      </li>
    );
  }

  function renderAnswerPanel(item: GrammarItem, diff: AnswerDiff | null, spoken: boolean) {
    const id = item.id;
    const refs = referencesOf(item);
    const verdict = diff?.grade ?? null;
    const closest = diff && diff.referenceIndex > 0 ? refs[diff.referenceIndex] : null;
    const others = item.alternatives.filter((alt) => alt !== closest);
    const shown = others.slice(0, closest ? 2 : 3);
    return (
      <div
        data-answer-panel
        className={
          "mt-3 border-l-2 pl-3 " +
          (verdict === "exact" ? "border-success" : verdict === "incorrect" ? "border-danger" : "border-line-strong")
        }
      >
        {verdict ? (
          <p
            data-verdict={verdict}
            role="status"
            className={`text-label font-semibold ${verdict === "exact" ? "text-success" : verdict === "incorrect" ? "text-danger" : "text-ink"}`}
          >
            {VERDICT_TEXT[verdict]}
          </p>
        ) : null}
        {diff && verdict !== "exact" ? (
          <p data-diff className={`mt-1 text-ink ${fs.english}`}>
            <span className="sr-only">내 답: </span>
            <DiffLine tokens={diff.tokens} show={gloss} />
          </p>
        ) : null}
        <div className="mt-2 flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <span className="block text-caption text-ink-soft">모범 답안</span>
            <p data-model className={`font-semibold text-ink ${fs.english}`}>
              {gloss(item.englishText)}
            </p>
          </div>
          {playButton(item)}
        </div>
        {closest ? (
          <p data-closest className="mt-1 text-label text-ink">
            내 답과 가장 가까운 정답: {gloss(closest)}
          </p>
        ) : null}
        {shown.length > 0 ? (
          <p data-alts className="mt-1 text-label text-ink-soft">
            다른 정답: {shown.map(gloss).join(" / ")}
            {others.length > shown.length ? ` 외 ${others.length - shown.length}개` : ""}
          </p>
        ) : null}
        {spoken ? (
          <p className="mt-1 text-caption text-ink-soft">말로 한 답은 &apos;맞음&apos;이 저절로 켜지지 않아요. 맞았으면 직접 누르세요.</p>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <button
            type="button"
            data-grade="correct"
            aria-pressed={selfGrades[id] === true}
            onClick={() => markCorrect(id)}
            className={
              "min-h-11 rounded-control border px-3 text-label font-semibold transition-colors cursor-pointer " +
              (selfGrades[id] === true ? "border-success bg-success/10 text-success" : "border-line bg-raised text-ink hover:bg-sunken")
            }
          >
            ✓ 맞음
          </button>
          <button type="button" data-grade="retry" onClick={() => retryItem(id)} className={quietButton}>
            ↺ 다시 풀기
          </button>
          <button type="button" data-next onClick={() => focusNextComposition(id)} className={quietButton}>
            다음 문제 →
          </button>
        </div>
      </div>
    );
  }

  // --- Step 2 item ---------------------------------------------------------------------------------
  function renderCloze(item: GrammarItem) {
    const id = item.id;
    const n = item.numberLabel;
    const blanks = blanksOf(item);
    const checked = clozeChecked[id];
    const tries = clozeTries[id] || 0;
    const revealed = revealedAnswers[rk("cloze", id)] === true;
    const current = blanks.map((b) => blankValue(id, b.index));
    const unchanged = !!checked && blanks.every((b, k) => (checked[b.index] ?? "") === current[k]);
    const allRight = blanks.length > 0 && unchanged && blanks.every((b, k) => blankRight(current[k], b.part.answer));
    const done = revealed || allRight;
    const order = new Map(blanks.map((b, k) => [b.index, k] as [number, number]));

    return (
      <li key={id} data-item={n} data-id={id} className="flex gap-3 px-4 py-3.5">
        <span data-q className="w-7 shrink-0 pt-0.5 text-label font-semibold tabular-nums text-ink-soft">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p data-ko className={`font-medium text-ink-soft ${fs.korean}`}>
            {item.koreanText}
          </p>
          {blanks.length === 0 ? (
            <>
              <p data-cloze className={`mt-1 text-ink ${fs.english}`}>
                {gloss(item.englishText)}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-caption text-ink-faint">빈칸이 없는 문장이에요 — 읽고 들어 보세요.</span>
                {playButton(item)}
              </div>
            </>
          ) : (
            <>
              <p data-cloze className={`mt-1 leading-[2.75] text-ink ${fs.english}`}>
                {item.clozeParts.map((part, index) => {
                  if (!part.isBlank) {
                    const run = clozeRun(item.clozeParts, index);
                    return run ? <Fragment key={index}>{run}</Fragment> : null;
                  }
                  const k = order.get(index) ?? 0;
                  const value = blankValue(id, index);
                  if (revealed) {
                    const right = blankRight(value, part.answer);
                    return right ? (
                      <span key={index} data-answer className="font-semibold text-success">
                        {part.answer}
                      </span>
                    ) : value.trim() ? (
                      <span key={index} data-answer>
                        <s className="text-danger">{value}</s>
                        <span className="sr-only"> 정답 </span> → <span className="font-semibold text-success">{part.answer}</span>
                      </span>
                    ) : (
                      <span key={index} data-answer className="font-semibold text-success underline decoration-2 underline-offset-4">
                        {part.answer}
                      </span>
                    );
                  }
                  const judged = !!checked && (checked[index] ?? "") === value && value.trim() !== "";
                  const right = judged && blankRight(value, part.answer);
                  return (
                    <span key={index} className="inline-flex items-center align-baseline">
                      <input
                        type="text"
                        data-blank={index}
                        ref={(el) => {
                          blankRefs.current[`${id}:${index}`] = el;
                        }}
                        value={value}
                        onChange={(e) => setBlank(id, index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" || e.nativeEvent.isComposing || e.keyCode === 229) return;
                          e.preventDefault();
                          enterBlank(item, k);
                        }}
                        aria-label={`${n}번 문장 빈칸 (${k + 1}/${blanks.length})`}
                        aria-invalid={judged && !right ? true : undefined}
                        enterKeyHint="next"
                        autoCapitalize="none"
                        autoCorrect="off"
                        autoComplete="off"
                        spellCheck={false}
                        className={
                          `mx-0.5 inline-block h-11 w-[5.5em] rounded-control border bg-raised px-2 text-center font-semibold text-ink focus:outline-none ${fs.input} ` +
                          (judged ? (right ? "border-success" : "border-danger") : "border-line focus:border-ink")
                        }
                      />
                      {judged ? (
                        <span
                          data-mark={right ? "correct" : "wrong"}
                          role="status"
                          aria-label={right ? "맞음" : "틀림"}
                          className={`text-label font-bold ${right ? "text-success" : "text-danger"}`}
                        >
                          {right ? "✓" : "✗"}
                        </span>
                      ) : null}
                    </span>
                  );
                })}
              </p>

              {nudged[rk("cloze", id)] && !checked ? (
                <p data-nudge role="status" className="text-label text-ink-soft">
                  빈칸에 먼저 써 보세요.
                </p>
              ) : null}
              {checked && !revealed ? (
                <p data-cloze-verdict role="status" className={`text-label font-semibold ${allRight ? "text-success" : unchanged ? "text-danger" : "text-ink-soft"}`}>
                  {allRight ? "✓ 모두 맞음" : unchanged ? "틀린 빈칸이 있어요 — 한 번 더 해 보세요." : "고친 뒤 확인을 누르세요."}
                </p>
              ) : null}
              {revealed ? (
                <p data-cloze-verdict role="status" className="text-label text-ink-soft">
                  {blanks.every((b) => blankRight(blankValue(id, b.index), b.part.answer)) ? "✓ 모두 맞음" : "정답을 보여 드렸어요. '다시 풀기'로 한 번 더 해 보세요."}
                </p>
              ) : null}

              <div className="mt-1 flex flex-wrap items-center gap-2">
                {!done ? (
                  <button type="button" data-cloze-check onClick={() => checkCloze(item)} aria-label={`${n}번 빈칸 확인`} className={outlineButton}>
                    확인
                  </button>
                ) : null}
                {!done && tries >= 1 ? (
                  <button
                    type="button"
                    data-cloze-reveal
                    onClick={() => setRevealedAnswers((prev) => ({ ...prev, [rk("cloze", id)]: true }))}
                    className={quietButton}
                  >
                    정답 보기
                  </button>
                ) : null}
                {done ? playButton(item) : null}
                {tries >= 1 || revealed ? (
                  <button type="button" data-cloze-retry onClick={() => retryCloze(item)} className={quietButton}>
                    ↺ 다시 풀기
                  </button>
                ) : null}
              </div>
            </>
          )}
        </div>
      </li>
    );
  }

  // --- Step 3 item ---------------------------------------------------------------------------------
  function renderShadowing(item: GrammarItem) {
    const id = item.id;
    const n = item.numberLabel;
    const repeats = shadowingRepeats[id] || 0;
    return (
      <li key={id} data-item={n} data-id={id} className="flex gap-3 px-4 py-3.5">
        <span data-q className="w-7 shrink-0 pt-0.5 text-label font-semibold tabular-nums text-ink-soft">
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p data-en className={`font-semibold text-ink ${fs.english}`}>
            {gloss(item.englishText)}
          </p>
          <p data-ko className={`mt-0.5 text-ink-soft ${fs.korean}`}>
            {item.koreanText}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {playButton(item)}
            <button type="button" data-said onClick={() => addRepetition(id)} className={outlineButton}>
              따라 말했어요
            </button>
            <span
              data-reps
              data-count={repeats}
              className={`text-label tabular-nums ${repeats >= 3 ? "font-semibold text-success" : "text-ink-soft"}`}
            >
              {repeats >= 3 ? `✓ 3회 채움 (${repeats}회)` : `${repeats}/3회`}
            </span>
          </div>
          <div className="mt-2">
            <VoiceSpeakingTester
              targetText={item.englishText}
              buttonLabel="따라 말하고 확인"
              hideWhenUnsupported
              onSuccess={(_transcript, score) => {
                if (score >= 70) addRepetition(id);
              }}
            />
          </div>
        </div>
      </li>
    );
  }

  // --- Step 4 row ----------------------------------------------------------------------------------
  function renderExamRow(item: GrammarItem) {
    const id = item.id;
    const n = item.numberLabel;
    const value = examAnswers[id] || "";
    const graded = examResult !== null;
    const res: AnswerGrade | null = examResult ? examResult.perItem[id] ?? "incorrect" : null;
    const diff = graded && res !== "exact" && value.trim() ? diffAgainstReferences(asWritten(value), referencesOf(item)) : null;
    const alts = item.alternatives.slice(0, 3);
    return (
      <li
        key={id}
        data-exam-row
        data-item={n}
        data-id={id}
        ref={(el) => {
          examRowRefs.current[id] = el;
        }}
        className="flex scroll-mt-[calc(var(--header-h)+12px)] items-start gap-3 px-4 py-3.5"
      >
        <span data-q className="w-10 shrink-0 pt-0.5 text-label font-semibold tabular-nums text-ink-soft">
          Q{n}.
        </span>
        <div className="min-w-0 flex-1">
          <p data-ko className={`font-semibold text-ink ${fs.korean}`}>
            {item.koreanText}
          </p>
          <div className="mt-1.5">
            <AnswerBox
              value={value}
              label={`${n}번 시험 답안`}
              placeholder="영어로 써 보세요"
              enterKeyHint="next"
              readOnly={graded}
              onValue={(v) => {
                setExamAnswers((prev) => ({ ...prev, [id]: v }));
                if (examNotice) setExamNotice(false);
              }}
              onEnter={() => enterExam(item)}
              boxRef={(el) => {
                examRefs.current[id] = el;
              }}
              className={
                `min-h-11 w-full resize-none overflow-hidden rounded-control border px-3 py-2 leading-snug text-ink placeholder:text-ink-faint [field-sizing:content] focus:outline-none ${fs.input} ` +
                (graded
                  ? res === "exact"
                    ? "border-success/60 bg-surface"
                    : res === "partial"
                    ? "border-line-strong bg-surface"
                    : "border-danger/60 bg-surface"
                  : "border-line bg-raised focus:border-ink")
              }
            />
          </div>
          {graded && res ? (
            <div data-exam-result className="mt-2 flex flex-col gap-1">
              <span
                data-badge={res}
                className={`self-start text-label font-bold ${res === "exact" ? "text-success" : res === "incorrect" ? "text-danger" : "text-ink"}`}
              >
                {EXAM_BADGE[res]}
              </span>
              {diff ? (
                <p data-diff className={`text-ink ${fs.english}`}>
                  <span className="sr-only">내 답: </span>
                  <DiffLine tokens={diff.tokens} show={gloss} />
                </p>
              ) : null}
              <div className="flex items-start gap-2">
                <p className="min-w-0 flex-1 text-label text-ink-soft">
                  모범 답안: <span data-model className={`font-semibold text-ink ${fs.english}`}>{gloss(item.englishText)}</span>
                </p>
                {playButton(item)}
              </div>
              {alts.length > 0 ? (
                <p data-alts className="text-label text-ink-soft">
                  또는: {alts.map(gloss).join(" / ")}
                  {item.alternatives.length > alts.length ? ` 외 ${item.alternatives.length - alts.length}개` : ""}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </li>
    );
  }

  // --- render ----------------------------------------------------------------------------------------
  const compositionMisses = bundleItems.filter(isRetryComposition).length;
  const clozeMisses = bundleItems.filter(clozeMissed).length;
  const examMisses = examResult ? items.filter((it) => (examResult.perItem[it.id] ?? "incorrect") !== "exact") : [];
  const bundleWord = bundles.length > 1 ? "이 묶음" : "이 강의";

  return (
    <div className="flex flex-col gap-4" data-grammar-view data-course={course} data-variant={isScript ? "script" : "main"} data-step={stepNumber}>
      {/*
        Step tabs (GRM-U15): 44px, 14px, aria-pressed, no emoji. On a phone one row — the numbers and
        the current step's name (docs/디자인-규칙.md §6-3); every button's text still reads "Step N · …"
        (LessonStepNavigation, the audit drivers and capture-mobile-0927 find the tabs by it).
      */}
      <nav aria-label="문법 4단계 학습 모드" className="rounded-control bg-sunken p-1">
        <div className="flex gap-1">
          {STEPS.map((step) => {
            const current = studyMode === step.mode;
            return (
              <button
                key={step.mode}
                type="button"
                data-step-tab={step.n}
                ref={(el) => {
                  tabRefs.current[step.mode] = el;
                }}
                aria-pressed={current}
                onClick={() => changeMode(step.mode)}
                className={
                  "flex min-h-11 items-center justify-center whitespace-nowrap rounded-control px-3 text-label transition-colors cursor-pointer sm:flex-1 " +
                  (current ? "flex-1 bg-raised font-semibold text-ink shadow-2xs" : "min-w-11 font-medium text-ink-soft hover:bg-raised/60")
                }
              >
                {/* one inline run, as in StepTabs (077f5c4): as separate flex items the spaces at their edges were dropped — 'Step2· …' */}
                <span>
                  <span className="sr-only sm:not-sr-only">{"Step "}</span>
                  <span className="tabular-nums">{step.n}</span>
                  <span className={current ? "" : "hidden sm:inline"}>{` · ${step.name}`}</span>
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GRAMMAR I 07강: the lesson's be-verb rule questions, folded, above the usual steps. */}
      {ruleSummary.length > 0 ? (
        <details data-rule-summary className="group rounded-card border border-line bg-raised">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-card px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
            <span>문법 확인 — be동사 규칙 {ruleSummary.length}문항 (영작 전에 먼저 읽어 보세요)</span>
            <IconChevron className="shrink-0 text-ink-soft transition-transform group-open:rotate-180" />
          </summary>
          <ol className="flex flex-col gap-3 border-t border-line px-4 py-3">
            {ruleSummary.map((rule, i) => (
              <li key={i} className="flex flex-col gap-1">
                <p className={`${fs.korean} font-medium text-ink`}>
                  <span className="mr-1.5 text-caption tabular-nums text-ink-faint">Q{i + 1}</span>
                  {rule.question}
                </p>
                <p className={`${fs.korean} text-ink-soft`}>
                  <span className="mr-1.5 font-semibold text-primary">답</span>
                  {rule.answer}
                </p>
              </li>
            ))}
          </ol>
        </details>
      ) : null}

      {/* ===================== Step 1 · 영작 훈련 ===================== */}
      {studyMode === "composition" ? (
        <section data-step-panel="1" aria-label="영작 훈련" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">{GUIDES.composition}</p>
          {summaryLine(
            `작성 ${answeredCount}/${totalCount} · 맞음 ${correctCount}${accuracy !== null ? ` · 정답률 ${accuracy}%` : ""}${
              lastRun ? ` · 지난번 맞음 ${lastRun.correct}/${lastRun.total}${lastRun.at ? ` (${lastRun.at})` : ""}` : ""
            }`,
            { answered: answeredCount, total: totalCount, correct: correctCount, retry: retryCount, accuracy: accuracy ?? "" },
            totalCount ? (answeredCount / totalCount) * 100 : 0,
          )}
          {micNotice("answer")}
          {bundleNav()}
          {bundles.map(([start, end], k) => (
            <ol key={k} data-set={k} hidden={k !== bundleIndex} className="list-none divide-y divide-line rounded-card border border-line bg-raised">
              {items.slice(start, end).map(renderComposition)}
            </ol>
          ))}
          {bundleEndBar(
            compositionMisses,
            "틀린 문제 다시 풀기",
            "composition",
            `${bundleWord}: 맞음 ${bundleItems.filter((it) => selfGrades[it.id] === true).length} · 다시 풀 문제 ${compositionMisses}`,
          )}
          {moreMenu("composition")}
        </section>
      ) : null}

      {/* ===================== Step 2 · 빈칸 완성 ===================== */}
      {studyMode === "cloze" ? (
        <section data-step-panel="2" aria-label="빈칸 완성" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">{GUIDES.cloze}</p>
          {summaryLine(
            `빈칸 ${blanksRight}/${blanksTotal} 맞음`,
            { "blanks-right": blanksRight, "blanks-total": blanksTotal },
            blanksTotal ? (blanksRight / blanksTotal) * 100 : 0,
          )}
          {bundleNav()}
          {bundles.map(([start, end], k) => (
            <ol key={k} data-set={k} hidden={k !== bundleIndex} className="list-none divide-y divide-line rounded-card border border-line bg-raised">
              {items.slice(start, end).map(renderCloze)}
            </ol>
          ))}
          {bundleEndBar(clozeMisses, "틀린 문장 다시 풀기", "cloze", clozeMisses ? `${bundleWord}: 틀린 문장 ${clozeMisses}` : "")}
          {moreMenu("cloze")}
        </section>
      ) : null}

      {/* ===================== Step 3 · 구문 각인 ===================== */}
      {studyMode === "shadowing" ? (
        <section data-step-panel="3" aria-label="구문 각인" className="flex flex-col gap-3">
          <p className="text-label text-ink-soft">{GUIDES.shadowing}</p>
          {summaryLine(`3회 채운 문장 ${repeatedCount}/${totalCount}`, { done: repeatedCount, total: totalCount }, totalCount ? (repeatedCount / totalCount) * 100 : 0)}
          {micNotice("repeat")}
          {bundleNav()}
          {bundles.map(([start, end], k) => (
            <ol key={k} data-set={k} hidden={k !== bundleIndex} className="list-none divide-y divide-line rounded-card border border-line bg-raised">
              {items.slice(start, end).map(renderShadowing)}
            </ol>
          ))}
          {bundleEndBar(0, "", null, "")}
          {moreMenu("shadowing")}
        </section>
      ) : null}

      {/* ===================== Step 4 · 종합 평가 ===================== */}
      {studyMode === "exam" ? (
        <section
          data-step-panel="4"
          aria-label="종합 평가"
          ref={(el) => {
            examTopRef.current = el;
          }}
          className="flex scroll-mt-[calc(var(--header-h)+12px)] flex-col gap-3"
        >
          <p className="text-label text-ink-soft">{GUIDES.exam}</p>
          {summaryLine(
            `작성 ${examAnswered}/${totalCount}${lastExam ? ` · 지난 시험 ${lastExam.score}점${lastExam.at ? ` (${lastExam.at})` : ""}` : ""}`,
            { answered: examAnswered, total: totalCount },
            totalCount ? (examAnswered / totalCount) * 100 : 0,
          )}

          {examResult ? (
            <div
              ref={examSummaryRef}
              data-exam-summary
              data-score={examResult.score}
              data-exact={examResult.exact}
              data-partial={examResult.partial}
              data-incorrect={examResult.total - examResult.exact - examResult.partial}
              data-total={examResult.total}
              role="status"
              className="rounded-card border border-line bg-raised px-4 py-3"
            >
              <p className="text-title font-bold tabular-nums text-ink">{examResult.score}점</p>
              <p className="text-label tabular-nums text-ink-soft">
                정답 {examResult.exact} · 부분 정답 {examResult.partial} · 오답 {examResult.total - examResult.exact - examResult.partial} (
                {examResult.total}문항){examResult.at ? ` · ${examResult.at}` : ""}
              </p>
              {examMisses.length > 0 ? (
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-label text-ink-soft">다시 볼 문항</span>
                  {examMisses.map((it) => (
                    <button
                      key={it.id}
                      type="button"
                      data-jump={it.numberLabel}
                      onClick={() => examRowRefs.current[it.id]?.scrollIntoView({ block: "center", behavior: "smooth" })}
                      className="min-h-11 min-w-11 rounded-control border border-line px-2 text-label tabular-nums text-ink transition-colors cursor-pointer hover:bg-sunken"
                    >
                      {it.numberLabel}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <ol data-exam className="list-none divide-y divide-line rounded-card border border-line bg-raised">
            {items.map(renderExamRow)}
          </ol>

          {/* GRM-U08: one 56px bar at the bottom — count, and the one action; a note only after an empty press. */}
          <div
            data-exam-bar
            className="sticky bottom-0 z-10 -mx-4 border-t border-line bg-surface/95 px-4 pt-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] backdrop-blur sm:mx-0 sm:rounded-card sm:border"
          >
            <div className="flex min-h-11 items-center justify-between gap-3">
              <p className="text-label tabular-nums text-ink-soft">
                {examResult ? (
                  <>
                    <span className="font-bold text-ink">{examResult.score}점</span> · 틀린 {examMisses.length}
                  </>
                ) : (
                  <>
                    작성 <span className="font-bold text-ink">{examAnswered}</span>/{totalCount}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2">
                {examResult ? (
                  <>
                    {examMisses.length > 0 ? (
                      <button type="button" data-exam-action="retry-wrong" onClick={retryWrongExam} className={`${filledButton} whitespace-nowrap`}>
                        틀린 것만 다시
                      </button>
                    ) : null}
                    <button
                      type="button"
                      data-exam-action="new"
                      onClick={newExam}
                      className={`${examMisses.length > 0 ? outlineButton : filledButton} whitespace-nowrap`}
                    >
                      새 시험
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    data-exam-submit
                    ref={examSubmitRef}
                    aria-disabled={examAnswered === 0}
                    onClick={submitExam}
                    className={`${filledButton} whitespace-nowrap aria-disabled:opacity-40`}
                  >
                    전체 시험 채점하기
                  </button>
                )}
              </div>
            </div>
            {examNotice && !examResult ? (
              <p data-exam-notice role="status" className="pb-1 text-caption text-danger">
                답을 하나 이상 쓴 뒤 채점하세요.
              </p>
            ) : null}
          </div>

          {moreMenu("exam")}
        </section>
      ) : null}
    </div>
  );
}
