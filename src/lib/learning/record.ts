/**
 * The learning record on this device — one localStorage entry per course ("kig-learning:<course>").
 *
 * Courses call only markLessonDone · recordAttempt · reportMyAnswer (공통-학습-엔진.md §2) and never
 * invent another format. A course whose record also lives on the server (PASS-OFF GRAMMAR; the other
 * courses once the owner decides D04) sends this same record through its own API and joins the two
 * with mergeRecords — the shape is the same on both sides.
 *
 * Storage can be missing (a private window, a full quota, the server render): then every call still
 * returns, the lesson works, and only the review forgets.
 */
import { applyAttempt, applyLessonDone, emptyRecord, sanitizeRecord } from "./engine";
import type { AttemptEffect, AttemptInput, CourseProfile, CourseRecord } from "./types";

const PREFIX = "kig-learning:";
const CHANGE_EVENT = "kig-learning-change";

function storage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readCourseRecord(course: string): CourseRecord {
  const store = storage();
  if (!store) return emptyRecord(course);
  try {
    const raw = store.getItem(PREFIX + course);
    return raw ? sanitizeRecord(JSON.parse(raw), course) : emptyRecord(course);
  } catch {
    return emptyRecord(course);
  }
}

export function writeCourseRecord(record: CourseRecord): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(PREFIX + record.course, JSON.stringify(record));
  } catch {
    return false;
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { course: record.course } }));
  } catch {
    // an old browser without CustomEvent: the record is saved, listeners catch up on the next read
  }
  return true;
}

/**
 * A lesson is finished. `entries` are the items that should come back from tomorrow — the course
 * adapter decides (PASS-OFF: every core item; GRAMMAR: sentences missed or helped in the lesson …).
 */
export function markLessonDone(
  profile: CourseProfile,
  lessonId: string,
  entries: { key: string; kind: string }[],
  nowMs: number = Date.now(),
): CourseRecord {
  const record = readCourseRecord(profile.course);
  applyLessonDone(record, lessonId, nowMs, entries);
  writeCourseRecord(record);
  return record;
}

/** One answer, with the course grader's verdict. Returns what the engine did with it. */
export function recordAttempt(
  profile: CourseProfile,
  itemKey: string,
  input: AttemptInput,
  nowMs: number = Date.now(),
): AttemptEffect {
  const record = readCourseRecord(profile.course);
  const effect = applyAttempt(record, itemKey, input, nowMs, profile);
  writeCourseRecord(record);
  return effect;
}

/** "내 답도 맞아요": the answer is kept for judging; the item is neither right nor wrong and comes back tomorrow. */
export function reportMyAnswer(
  profile: CourseProfile,
  itemKey: string,
  input: Omit<AttemptInput, "correct" | "pending"> & { answer: string },
  nowMs: number = Date.now(),
): AttemptEffect {
  return recordAttempt(profile, itemKey, { ...input, correct: false, pending: true }, nowMs);
}

/** Calls `listener` when this course's record changes in this tab or another one. */
export function onLearningChange(course: string, listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = (event: Event) => {
    if ((event as CustomEvent<{ course?: string }>).detail?.course === course) listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFIX + course) listener();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
