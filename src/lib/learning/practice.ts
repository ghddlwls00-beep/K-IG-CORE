/**
 * What the engine does outside the day's review (공통-학습-엔진.md §8-5 · 8-7 — 단계 2-나 E2). New functions beside the core;
 * engine.ts · record.ts · types.ts · day.ts are not touched, and a record keeps the shape of §2 (sanitizeRecord takes it).
 *
 *   - practice: an answer that moves no schedule — the wrong-answer list's "지금 다시 풀기". It is logged with the effect
 *     "practice" whether the item is due or not (applyAttempt would count the first answer of a due day); a "내 답도 맞아요"
 *     made there is kept for judging (a report and a "pending" log entry) and moves nothing either. An item that is due and
 *     not asked yet in today's review waits for it (practiceWaits): the answer seen while practising would make today's
 *     review answer — the day's first, which counts — an answer just seen, and the engine never counts those;
 *   - bring forward: a course sends a lesson's items back into review sooner (PASS-OFF: a box of the topic map that was
 *     filled wrong). Each item of the lesson still being learned becomes due tomorrow — never today: one answered in today's
 *     review would come back as a second answer the same day (a retry that moves nothing, so it would stay in the day's
 *     plan), and one not asked yet today would lose its spacing. One due by tomorrow already stays, and a passed item keeps
 *     its upkeep. The server does the same on its copy (the learning API's `forward`), because a merge keeps the stored item
 *     when two copies differ only in their due day.
 * Checked by docs/pass-off-grammar/검사/check-learning-e2.cjs.
 */
import { addDays, daysBetween, learningDay } from "./day";
import { LOG_LIMIT, REPORT_LIMIT } from "./engine";
import { readCourseRecord, writeCourseRecord } from "./record";
import type { AttemptEffect, AttemptInput, CourseProfile, CourseRecord, Day, ItemState } from "./types";

/** engine.ts keeps a wrong answer to this length (its ANSWER_LIMIT) */
const ANSWER_LIMIT = 200;

/** One practice answer (or a report made while practising). The item's state is never changed. */
export function applyPractice(record: CourseRecord, itemKey: string, input: AttemptInput, atMs: number): AttemptEffect {
  const day = learningDay(atMs);
  const effect: AttemptEffect = !record.items[itemKey] ? "unknown" : input.pending ? "pending" : "practice";
  const answer = input.answer ? input.answer.slice(0, ANSWER_LIMIT) : undefined;
  if (effect === "pending") {
    record.reports.push({ item: itemKey, answer: answer ?? "", day, status: "pending" });
    if (record.reports.length > REPORT_LIMIT) record.reports.splice(0, record.reports.length - REPORT_LIMIT);
  }
  record.log.push({ ...input, answer, item: itemKey, day, at: new Date(atMs).toISOString(), firstTry: false, effect });
  if (record.log.length > LOG_LIMIT) record.log.splice(0, record.log.length - LOG_LIMIT);
  if (!record.lastStudyDay || daysBetween(record.lastStudyDay, day) > 0) record.lastStudyDay = day;
  return effect;
}

/** This device's record: one practice answer — the wrong-answer list's "지금 다시 풀기". */
export function recordPractice(
  profile: CourseProfile,
  itemKey: string,
  input: AttemptInput,
  nowMs: number = Date.now(),
): AttemptEffect {
  const record = readCourseRecord(profile.course);
  const effect = applyPractice(record, itemKey, input, nowMs);
  writeCourseRecord(record);
  return effect;
}

/**
 * An item "지금 다시 풀기" does not offer yet: due today (or overdue) and not answered in today's review. Once today's review
 * has asked it — or on a day it is not due — it can be practised, and the review answer that counts next is on another day.
 */
export function practiceWaits(state: ItemState | undefined, today: Day): boolean {
  return state !== undefined && daysBetween(state.dueDay, today) >= 0 && state.reviewDay !== today;
}

/** The lessons' learning items due tomorrow at the latest (sooner ones stay as they are). Returns how many moved. */
export function applyBringForward(record: CourseRecord, lessonIds: readonly string[], atMs: number): number {
  const lessons = new Set(lessonIds);
  const due = addDays(learningDay(atMs), 1);
  let moved = 0;
  for (const state of Object.values(record.items)) {
    if (!lessons.has(state.lessonId) || state.stage !== "learning") continue;
    if (daysBetween(due, state.dueDay) > 0) {
      state.dueDay = due;
      moved += 1;
    }
  }
  return moved;
}

/** How many of the lessons' learning items come back by tomorrow — what a course tells the learner after a bring-forward. */
export function forwardedItems(record: CourseRecord, lessonIds: readonly string[], atMs: number): number {
  const lessons = new Set(lessonIds);
  const due = addDays(learningDay(atMs), 1);
  return Object.values(record.items).filter((s) => lessons.has(s.lessonId) && s.stage === "learning" && daysBetween(s.dueDay, due) >= 0).length;
}

/** This device's record: bring the lessons' items forward (the server is told with the learning API's `forward`). */
export function bringLessonsForward(course: string, lessonIds: readonly string[], nowMs: number = Date.now()): number {
  const record = readCourseRecord(course);
  const moved = applyBringForward(record, lessonIds, nowMs);
  if (moved) writeCourseRecord(record);
  return moved;
}
