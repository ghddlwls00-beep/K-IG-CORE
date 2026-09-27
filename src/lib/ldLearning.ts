/**
 * LISTENING for the common learning engine and this device (2026-09-27 — LISTENING 학습법 · 화면 고침; docs/pass-off-grammar/
 * 공통-학습-엔진.md §5 "LISTENING · d001#3 · 받아쓰기에서 못 맞힌 줄 · 3 · 25초").
 *
 * An item is one line of a lesson, keyed `<lesson id>#<n>` — n is the line's 1-based order in the lesson data (ld_english_scripts).
 * A script page (d001-1) shows the same lines as its main lesson, so its items are the main lesson's: `d001#3` from either page
 * (one line never becomes two review items). About 25 seconds each in review. When a lesson is completed, the lines the learner
 * did not get right at the first check, or whose answer was shown, come back from the next day. The view calls only the engine's
 * record functions; the review screen itself comes with the engine's shared page.
 *
 * What LISTENING keeps on this device, per page (lessonKey = "ld/<id>" — the key it always had):
 *   kig:ld:mastery:<lessonKey>   {v:2, dictationProgress, checked, missed, revealed, peek, shadowScores, selectedAnswers,
 *                                 quizSubmitted, notes}. A record from before 2026-09-27 ({dictationProgress, shadowScores,
 *                                 selectedAnswers, quizSubmitted, notes}) is read as it is: its right lines count as checked,
 *                                 nothing else is assumed, and nothing is dropped.
 *   kig:ld:prefs                 {mode, blankInput, hideText} — the learner's way of dictating and '글 가리기', for every lesson.
 */
import type { CourseProfile } from "@/lib/learning/types";

export const LD_SECONDS_PER_LINE = 25;

export const LD_LEARNING_PROFILE: CourseProfile = {
  course: "ld",
  secondsPerKind: { line: LD_SECONDS_PER_LINE },
  elementKinds: [],
};

/** The lesson a page's lines belong to: a script page (d001-1) shares its main lesson's lines. */
export const ldLessonOf = (lessonId: string) => lessonId.replace(/-1$/, "");
export const ldItemKey = (lessonId: string, n: number) => `${ldLessonOf(lessonId)}#${n}`;

/** The microphone score that counts a line as said (the pass mark STUDENT and VOCA use). */
export const LD_MIC_PASS = 70;

/** The line under the disabled '이 강의 학습 완료' until one dictation line has been checked (lessonGate — 계획 D02 나). */
export const LD_GATE_REASON = "받아쓰기에서 한 줄을 채점하면 완료할 수 있어요.";

/** '글 가리기' (Step 4) hides lines of this many words or fewer (계획 D27 다). */
export const LD_HIDE_TEXT_MAX_WORDS = 15;

export const ldStorageKey = (lessonKey: string) => `kig:ld:mastery:${lessonKey}`;
export const LD_PREFS_KEY = "kig:ld:prefs";

export type LdDictationMode = "blanks" | "blocks" | "typing";
export interface LdPrefs {
  mode: LdDictationMode;
  /** how a blank is answered: choose one of three, or type */
  blankInput: "choose" | "type";
  /** Step 4 '글 가리기' */
  hideText: boolean;
}
export const DEFAULT_LD_PREFS: LdPrefs = { mode: "blanks", blankInput: "choose", hideText: false };

export function parseLdPrefs(raw: string | null): LdPrefs {
  try {
    const d: unknown = raw ? JSON.parse(raw) : null;
    if (!d || typeof d !== "object") return DEFAULT_LD_PREFS;
    const o = d as Record<string, unknown>;
    return {
      mode: o.mode === "blocks" || o.mode === "typing" || o.mode === "blanks" ? o.mode : DEFAULT_LD_PREFS.mode,
      blankInput: o.blankInput === "type" ? "type" : "choose",
      hideText: o.hideText === true,
    };
  } catch {
    return DEFAULT_LD_PREFS;
  }
}

export interface LdPractice {
  /** lines answered right (the name the record always had) */
  dictationProgress: Record<number, boolean>;
  /** lines checked at least once (D29 · the completion gate) */
  checked: Record<number, boolean>;
  /** lines with a wrong check */
  missed: Record<number, boolean>;
  /** lines whose answer was shown ('정답 보기') */
  revealed: Record<number, boolean>;
  /** D29: '그래도 보기' was pressed — Steps 3–5 no longer hide lines not yet dictated */
  peek: boolean;
  /** best microphone score per line */
  shadowScores: Record<number, number>;
  /** the generated quiz (off — quizFlags.ts); kept as it was */
  selectedAnswers: Record<number, number>;
  quizSubmitted: Record<number, boolean>;
  notes: string;
}

export const emptyLdPractice = (): LdPractice => ({
  dictationProgress: {},
  checked: {},
  missed: {},
  revealed: {},
  peek: false,
  shadowScores: {},
  selectedAnswers: {},
  quizSubmitted: {},
  notes: "",
});

const flags = (v: unknown): Record<number, boolean> => {
  const out: Record<number, boolean> = {};
  if (v && typeof v === "object") for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (/^\d+$/.test(k) && x === true) out[Number(k)] = true;
  return out;
};
const numbers = (v: unknown, max: number): Record<number, number> => {
  const out: Record<number, number> = {};
  if (v && typeof v === "object")
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (/^\d+$/.test(k) && typeof x === "number" && Number.isFinite(x)) out[Number(k)] = Math.max(0, Math.min(max, x));
  return out;
};

/** This device's record of one page — an old record (no `v`) keeps everything it had; its right lines count as checked. */
export function parseLdPractice(raw: string | null): LdPractice {
  if (!raw) return emptyLdPractice();
  try {
    const d: unknown = JSON.parse(raw);
    if (!d || typeof d !== "object") return emptyLdPractice();
    const o = d as Record<string, unknown>;
    const right = flags(o.dictationProgress);
    return {
      dictationProgress: right,
      checked: { ...right, ...flags(o.checked) },
      missed: flags(o.missed),
      revealed: flags(o.revealed),
      peek: o.peek === true,
      shadowScores: numbers(o.shadowScores, 100),
      selectedAnswers: numbers(o.selectedAnswers, 99),
      quizSubmitted: flags(o.quizSubmitted),
      notes: typeof o.notes === "string" ? o.notes.slice(0, 20_000) : "",
    };
  } catch {
    return emptyLdPractice();
  }
}

export function serializeLdPractice(p: LdPractice): string {
  return JSON.stringify({ v: 2, ...p });
}

/**
 * The lines that come back from the next day when the lesson is completed (공통-학습-엔진.md §5 · 계획 D24): the lines checked in
 * dictation and not right at the first check, or whose answer was shown — from this page's record, and from the course log (the
 * first dictation check of a line that was wrong or helped), as GRAMMAR reads it. A line never dictated does not come back.
 */
export function ldReviewEntries(
  lessonId: string,
  lineCount: number,
  practice: LdPractice,
  log: readonly { item: string; lessonId: string; where: string; firstTry: boolean; correct: boolean; help: string; mode: string }[] = [],
): { key: string; kind: string }[] {
  const base = ldLessonOf(lessonId);
  const missed = new Set<number>();
  for (let i = 0; i < lineCount; i++) if (practice.checked[i] && (practice.missed[i] || practice.revealed[i])) missed.add(i + 1);
  for (const e of log) {
    if (e.lessonId !== base || e.where !== "lesson" || !e.firstTry || e.mode === "voice") continue;
    if (e.correct && e.help === "none") continue;
    const n = Number(e.item.split("#")[1]);
    if (e.item.startsWith(`${base}#`) && Number.isInteger(n) && n >= 1 && n <= lineCount) missed.add(n);
  }
  return [...missed].sort((a, b) => a - b).map((n) => ({ key: ldItemKey(base, n), kind: "line" }));
}
