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
 * The record lives on this device (localStorage "kig-learning:passoff-grammar", one per licence since E1 — below); the
 * review screen and the server copy come with the engine's shared page (설계 §12 2-나). The course list's check mark
 * (ProgressProvider) is recorded by the view itself.
 *
 * 2-나 (E1): the review screen (/passoff-grammar/review — src/components/passoff/PassoffReview.tsx on the engine's
 * ReviewSession) answers the same items with where "review". With a licence the record also lives on the server
 * (/api/learning/passoff-grammar, which sends the data of today's items only — src/lib/passoffReview.ts); without one the
 * review has the two free lessons' items alone, on this device (passoffFreeRecord).
 *
 * E1 점검 반영: a device keeps one record per learner (src/lib/learning/sync.ts). Every answer and every finished lesson
 * goes to the record of whoever studies at that moment — `learner`, the licence's id (learnerOf) or null with no licence —
 * and with a licence a finished lesson goes up to the server at once (공통-학습-엔진.md §2 "단계 · 회차가 끝날 때 묶어서
 * 보낸다"), so another device's review and the course list see it.
 */
import { markLearnerLessonDone, recordLearnerAttempt } from "./learning/record";
import { restrictRecord } from "./learning/review";
import { syncLearnerRecord } from "./learning/sync";
import type { AnswerMode, CourseProfile, CourseRecord, Help } from "./learning/types";
import { FREE_PREVIEW_LESSON_IDS } from "./license";
import type { PassoffFormItem, PassoffProduceItem } from "./passoffTypes";

export const PASSOFF_COURSE = "passoff-grammar";

/**
 * The line under the end bar's disabled '이 강의 학습 완료' (src/lib/lessonGate.ts — main's common part) until the five steps
 * are done: the lesson completes with them (설계 §3), as VOCA's · LISTENING's · READING's gates say what opens theirs.
 */
export const PASSOFF_GATE_REASON = "5단계를 모두 마치면 완료돼요.";

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

/** One answer inside the lesson, with this course's verdict — into the record of `learner` (a licence's id, or null). */
export function notePassoffAttempt(attempt: PassoffAttempt, learner: string | null): void {
  recordLearnerAttempt(PASSOFF_PROFILE, learner, attempt.itemId, {
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
 * go in first: the engine keeps a lesson's next-day items in the order they came. With a licence (`learner`) the record
 * goes up now; offline, it goes with the next one (the course list, the review, the next lesson).
 */
export function notePassoffLessonDone(
  lessonId: string,
  entries: { key: string; kind: PassoffItemKind }[],
  tomorrowFirst: readonly string[],
  learner: string | null,
): void {
  const first = new Set(tomorrowFirst);
  markLearnerLessonDone(PASSOFF_PROFILE, learner, lessonId, [...entries.filter((e) => first.has(e.key)), ...entries.filter((e) => !first.has(e.key))]);
  if (learner) void syncLearnerRecord(PASSOFF_COURSE, learner, { planOnly: true });
}

// ---------------------------------------------------------------------------
// The review screen (공통-학습-엔진.md §8 — 2-나)
// ---------------------------------------------------------------------------

/** One item as the review screen draws it — the lesson's own view fields (src/lib/passoffReview.ts), nothing more. */
export interface PassoffReviewItem {
  lessonId: string;
  kind: PassoffItemKind;
  /** the lesson's title ("1인칭") — which lesson the item comes from */
  lessonTitle: string;
  /** the lesson's rule — ladder ②'s clue, as in the lesson */
  ruleTitle?: string;
  item: PassoffProduceItem | PassoffFormItem;
}

/** ④ · ⑤ sentences — '통과한 문장' on the review's end screen counts these (the form items are elements). */
export const PASSOFF_SENTENCE_KINDS: readonly string[] = ["produce", "transfer"];

/** The free trial (license.ts — pg01-1 · pg01-2): without a licence the review has these lessons' items alone. */
export const PASSOFF_FREE_LESSONS: readonly string[] = FREE_PREVIEW_LESSON_IDS[PASSOFF_COURSE] ?? [];

/** An item id's lesson: "pg02-1:p4" → "pg02-1". */
export const passoffLessonOfItem = (key: string): string => key.split(":")[0];

/**
 * The record with the free review's items alone — `freeKeys`, the items the free review page can draw
 * (passoffReview.ts passoffFreeReviewItems: the free lessons' items without the paid STUDENT sentences a licence adds).
 * A key outside them could never be answered there and would stay due for good (E1 점검: a device whose licence ended).
 */
export function passoffFreeRecord(record: CourseRecord, freeKeys: ReadonlySet<string>): CourseRecord {
  return restrictRecord(record, (key) => freeKeys.has(key), (lessonId) => PASSOFF_FREE_LESSONS.includes(lessonId));
}
