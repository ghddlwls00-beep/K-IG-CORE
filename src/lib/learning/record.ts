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

// ---------------------------------------------------------------------------
// One record per learner — a course whose record the server also keeps (공통-학습-엔진.md §10)
// ---------------------------------------------------------------------------

/**
 * Where a learner's record lives on this device. A course whose record the server keeps (serverStore.ts) holds one per
 * licence, "kig-learning:<course>@<licence id>" — the licence's opaque id (serverLicense.ts licenseIdFor), never its
 * code — so two licences on one device never share a record, and a new code starts one of its own while the old one
 * stays. `learner` null is the record kept with no licence (the free trial): the plain entry, the one readCourseRecord
 * reads. A course whose record stays on the device (every other one until D04) has only that one.
 */
export function learnerRecordName(course: string, learner: string | null): string {
  return learner ? `${PREFIX}${course}@${learner}` : PREFIX + course;
}

export function readLearnerRecord(course: string, learner: string | null): CourseRecord {
  const store = storage();
  if (!store) return emptyRecord(course);
  try {
    const raw = store.getItem(learnerRecordName(course, learner));
    return raw ? sanitizeRecord(JSON.parse(raw), course) : emptyRecord(course);
  } catch {
    return emptyRecord(course);
  }
}

export function writeLearnerRecord(record: CourseRecord, learner: string | null): boolean {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(learnerRecordName(record.course, learner), JSON.stringify(record));
  } catch {
    return false;
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { course: record.course, learner } }));
  } catch {
    // as in writeCourseRecord
  }
  return true;
}

/** markLessonDone, into this learner's record. */
export function markLearnerLessonDone(
  profile: CourseProfile,
  learner: string | null,
  lessonId: string,
  entries: { key: string; kind: string }[],
  nowMs: number = Date.now(),
): CourseRecord {
  const record = readLearnerRecord(profile.course, learner);
  applyLessonDone(record, lessonId, nowMs, entries);
  writeLearnerRecord(record, learner);
  return record;
}

/** recordAttempt, into this learner's record. */
export function recordLearnerAttempt(
  profile: CourseProfile,
  learner: string | null,
  itemKey: string,
  input: AttemptInput,
  nowMs: number = Date.now(),
): AttemptEffect {
  const record = readLearnerRecord(profile.course, learner);
  const effect = applyAttempt(record, itemKey, input, nowMs, profile);
  writeLearnerRecord(record, learner);
  return effect;
}

/** Calls `listener` when any learner's record of this course changes, in this tab or another one. */
export function onLearnerRecordChange(course: string, listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = (event: Event) => {
    if ((event as CustomEvent<{ course?: string }>).detail?.course === course) listener();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === PREFIX + course || event.key?.startsWith(`${PREFIX}${course}@`)) listener();
  };
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}
