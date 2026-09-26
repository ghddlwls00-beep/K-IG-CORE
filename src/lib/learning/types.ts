/**
 * The common learning engine's record — one shape for every course
 * (docs/pass-off-grammar/공통-학습-엔진.md §2, v1 2026-09-27).
 *
 * The engine owns only what crosses days: the date, the review schedule, the pass judgement, the
 * daily amount, the wrong-answer list and "내 답도 맞아요" reports. Each course keeps its own lesson
 * steps and its own grader, and tells the engine only whether an answer was right.
 */

/** "2026-09-27" — the Korea-time learning day, which turns at 04:00 (see day.ts). */
export type Day = string;

export type Help = "none" | "hint" | "tiles" | "reveal";
export type AnswerMode = "typed" | "voice" | "tap";
export type AttemptPlace = "lesson" | "review";

/** A finished lesson. `at` and `day` are the FIRST completion; null for one kept from before dates were stored. */
export interface LessonDone {
  at: string | null;
  day: Day | null;
}

/** What a course reports for one answer. */
export interface AttemptInput {
  lessonId: string;
  kind: string;
  /** the course grader's verdict; a partial answer is not right */
  correct: boolean;
  help: Help;
  mode: AnswerMode;
  where: AttemptPlace;
  /** inside a lesson the course knows whether this was the first try; in review the engine works it out */
  firstTry?: boolean;
  /** "내 답도 맞아요" — neither right nor wrong until judged; the item comes back the next day */
  pending?: boolean;
  /** the learner's answer when it was wrong (kept short, for the wrong-answer list) */
  answer?: string;
}

export interface Attempt extends AttemptInput {
  item: string;
  day: Day;
  at: string;
  firstTry: boolean;
  /** what the engine did with it */
  effect: AttemptEffect;
}

export type AttemptEffect =
  | "lesson" // an answer inside a lesson — never counts toward a pass
  | "right" // a first try on a due day, right without help
  | "wrong" // a first try on a due day, wrong or helped — back to the next-day check
  | "retry" // a second answer on the same day — kept, changes nothing
  | "practice" // an item that is not due yet (the wrong-answer list's "지금 다시 풀기")
  | "pending" // "내 답도 맞아요"
  | "unknown"; // an item the record does not hold

export interface ItemState {
  lessonId: string;
  kind: string;
  stage: "learning" | "passed";
  /** the day the lesson was finished — never counts toward a pass */
  firstDay: Day;
  dueDay: Day;
  /** learning: 0 = next-day check, then 1, 2, … ; passed: index into the upkeep intervals */
  step: number;
  /** different days, first day excluded, answered right at the first try without help (sorted) */
  passDays: Day[];
  lastDay: Day | null;
  lastCorrect: boolean | null;
  /** the last day this item was answered in review — a second answer that day is not a first try */
  reviewDay: Day | null;
  /** times it went back to the next-day check after being wrong or helped */
  lapses: number;
  lastWrong?: string;
  pending?: boolean;
}

export interface Report {
  item: string;
  answer: string;
  day: Day;
  status: "pending" | "accepted" | "rejected";
}

export interface CourseRecord {
  v: 1;
  course: string;
  lessons: Record<string, LessonDone>;
  /** keyed by the item key: an item id ("pg02-1:p4") or "<lesson id>#<order>" for older courses */
  items: Record<string, ItemState>;
  /** the last LOG_LIMIT attempts across the course, oldest first */
  log: Attempt[];
  reports: Report[];
  lastStudyDay: Day | null;
}

export interface PassRule {
  /** different days needed, first day excluded */
  days: number;
  /** the same for element items (a form-spotting item, a word) */
  elementDays: number;
  /** one of the pass days must be at least this many days after the first day */
  minGapFromFirstDay: number;
  /** the interval after a right answer at learning step 0, 1, 2, … (the last one repeats) */
  learning: number[];
  /** the upkeep intervals once passed (the last one repeats) */
  upkeep: number[];
}

/** What a course tells the engine about itself (its adapter's numbers). */
export interface CourseProfile {
  course: string;
  /** about how long one item of each kind takes in review */
  secondsPerKind: Record<string, number>;
  /** kinds that pass with `elementDays` (form-spotting items, words) */
  elementKinds: string[];
  rule?: Partial<PassRule>;
  /** the daily review amount in seconds — about ten minutes unless the course says otherwise */
  budgetSeconds?: number;
}

/** One item the learner meets today, in order. */
export interface PlanItem {
  key: string;
  lessonId: string;
  kind: string;
  seconds: number;
  reason: "next-day" | "again" | "review" | "upkeep";
}

export interface Plan {
  day: Day;
  items: PlanItem[];
  seconds: number;
  /** every item due today or earlier */
  dueTotal: number;
  /** due items that did not fit today and move to tomorrow */
  leftOver: number;
  /** three days or more since the last study: a short comeback set first */
  comeback: boolean;
  /** so much is due that a new lesson should wait (a suggestion, not a lock) */
  reviewFirst: boolean;
}
