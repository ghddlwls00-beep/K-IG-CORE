/**
 * PASS-OFF GRAMMAR — what the lesson screen tells the rest of the site (docs/pass-off-grammar/설계.md §4).
 *
 * The lesson keeps its own practice state on the device; everything that crosses days (tomorrow's check,
 * the pass, the upkeep) belongs to the common learning engine (공통-학습-엔진.md, core e39622a), which is not
 * wired to this course yet. So the screen only ANNOUNCES two things, as window events, and nothing else
 * depends on anyone listening:
 *
 *   kig:passoff:attempt      every answer — the fields are the engine's AttemptInput, so a listener can call
 *                            recordAttempt(PASSOFF_PROFILE, detail.itemId, detail) unchanged
 *   kig:passoff:lesson-done  the five steps are finished — markLessonDone(PASSOFF_PROFILE, detail.lessonId,
 *                            detail.entries); `tomorrowFirst` are the sentences still not right on their own
 *                            after three comebacks ("내일 1순위", 설계 §3 ④)
 *
 * The ProgressProvider completion (the course list's check mark) is recorded by the view itself.
 */

export const PASSOFF_COURSE = "passoff-grammar";
export const PASSOFF_ATTEMPT_EVENT = "kig:passoff:attempt";
export const PASSOFF_LESSON_DONE_EVENT = "kig:passoff:lesson-done";

export type PassoffItemKind = "produce" | "transfer" | "select" | "choice" | "short";
/** ladder step ② clue = "hint", ③ tiles = "tiles", ④ the answer shown = "reveal" (설계 §4) */
export type PassoffHelp = "none" | "hint" | "tiles" | "reveal";
export type PassoffAnswerMode = "typed" | "voice" | "tap";

export interface PassoffAttemptDetail {
  course: typeof PASSOFF_COURSE;
  lessonId: string;
  itemId: string;
  kind: PassoffItemKind;
  /** the grader's verdict; a spelling slip ("typo") is right, nothing partial is */
  correct: boolean;
  help: PassoffHelp;
  mode: PassoffAnswerMode;
  where: "lesson";
  /** the first answer to this item in this lesson */
  firstTry: boolean;
  /** the answer, when it was wrong */
  answer?: string;
}

export interface PassoffLessonDoneDetail {
  course: typeof PASSOFF_COURSE;
  lessonId: string;
  /** the items that come back from tomorrow: ④ · ⑤ sentences and the ③ items the lesson asked (not `reserve`) */
  entries: { key: string; kind: PassoffItemKind }[];
  tomorrowFirst: string[];
  at: string;
}

/** The engine's course profile for this course (설계 §4) — one place, for whoever wires the engine. */
export const PASSOFF_PROFILE = {
  course: PASSOFF_COURSE,
  secondsPerKind: { produce: 25, transfer: 25, select: 8, choice: 8, short: 8 },
  elementKinds: ["select", "choice", "short"],
} as const;

function emit<T>(name: string, detail: T): void {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(name, { detail }));
  } catch {
    // an old browser without CustomEvent: nothing listens yet, and the lesson works the same
  }
}

export function emitPassoffAttempt(detail: Omit<PassoffAttemptDetail, "course" | "where">): void {
  emit<PassoffAttemptDetail>(PASSOFF_ATTEMPT_EVENT, { course: PASSOFF_COURSE, where: "lesson", ...detail });
}

export function emitPassoffLessonDone(detail: Omit<PassoffLessonDoneDetail, "course" | "at">): void {
  emit<PassoffLessonDoneDetail>(PASSOFF_LESSON_DONE_EVENT, { course: PASSOFF_COURSE, at: new Date().toISOString(), ...detail });
}
