/**
 * PASS-OFF GRAMMAR for the common learning engine (docs/pass-off-grammar/설계.md §4 · 공통-학습-엔진.md v1).
 *
 * The lesson keeps its own practice state on the device (src/lib/passoffLesson.ts); everything that crosses days
 * (tomorrow's check, the pass, the upkeep) is the engine's (src/lib/learning — core e39622a). The lesson screen
 * only records, through the engine's record functions:
 *   - every answer (notePassoffAttempt → recordAttempt, where "lesson" — an answer inside a lesson never counts
 *     toward a pass: the model answer was just in front of the learner);
 *   - the five steps finished (notePassoffLessonDone → markLessonDone): the lesson's ④ · ⑤ sentences and the ③
 *     items it asked (not `reserve`) come back from the next day.
 * The record lives on this device (localStorage "kig-learning:passoff-grammar"); the review screen and the server
 * copy come with the engine's shared page (설계 §12 2-나). The course list's check mark (ProgressProvider) is
 * recorded by the view itself.
 */
import { markLessonDone, recordAttempt } from "./learning/record";
import type { AnswerMode, CourseProfile, Help } from "./learning/types";

export const PASSOFF_COURSE = "passoff-grammar";

export type PassoffItemKind = "produce" | "transfer" | "select" | "choice" | "short";
/** the help received before an answer: ladder ② clue = "hint", ③ tiles = "tiles", the answer shown = "reveal" (설계 §4) */
export type PassoffHelp = Help;
export type PassoffAnswerMode = AnswerMode;

/** The engine's course profile for this course (설계 §4). */
export const PASSOFF_PROFILE: CourseProfile = {
  course: PASSOFF_COURSE,
  secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 },
  elementKinds: ["select", "choice", "short"],
};

const HELP_ORDER: readonly PassoffHelp[] = ["none", "hint", "tiles", "reveal"];

/** The more of two helps — a later answer carries the most help the item has had (the answer once shown stays shown). */
export function strongerHelp(a: PassoffHelp, b: PassoffHelp): PassoffHelp {
  return HELP_ORDER.indexOf(a) >= HELP_ORDER.indexOf(b) ? a : b;
}

export interface PassoffAttempt {
  lessonId: string;
  itemId: string;
  kind: PassoffItemKind;
  /** the grader's verdict; a spelling slip ("typo") is right, nothing partial is */
  correct: boolean;
  /** the help received BEFORE this answer (in this presentation or an earlier one) */
  help: PassoffHelp;
  mode: PassoffAnswerMode;
  /** the first answer to this item in this lesson */
  firstTry: boolean;
  /** the answer, when it was wrong */
  answer?: string;
}

/** One answer inside the lesson, with this course's verdict. */
export function notePassoffAttempt(attempt: PassoffAttempt): void {
  recordAttempt(PASSOFF_PROFILE, attempt.itemId, {
    lessonId: attempt.lessonId,
    kind: attempt.kind,
    correct: attempt.correct,
    help: attempt.help,
    mode: attempt.mode,
    where: "lesson",
    firstTry: attempt.firstTry,
    ...(attempt.answer && !attempt.correct ? { answer: attempt.answer } : {}),
  });
}

/**
 * The five steps are finished: the lesson's first completion date is kept and `entries` come back from the next
 * day. `tomorrowFirst` — sentences still not right on their own after three comebacks ("내일 1순위", 설계 §3 ④) —
 * go in first: the engine keeps a lesson's next-day items in the order they came.
 */
export function notePassoffLessonDone(lessonId: string, entries: { key: string; kind: PassoffItemKind }[], tomorrowFirst: readonly string[]): void {
  const first = new Set(tomorrowFirst);
  markLessonDone(PASSOFF_PROFILE, lessonId, [...entries.filter((e) => first.has(e.key)), ...entries.filter((e) => !first.has(e.key))]);
}
