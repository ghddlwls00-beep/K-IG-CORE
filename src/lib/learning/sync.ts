/**
 * This device's record and the server's (공통-학습-엔진.md §2 · §8 · §10) — for a course whose record the server also keeps
 * (src/lib/learning/serverStore.ts), with a licence that opens it.
 *
 * A device keeps one record per learner (record.ts learnerRecordName): each licence's own, and the one kept with no
 * licence (the free trial). A lesson writes, at the moment it records, to the record of whoever studies then (learnerOf —
 * the licence LicenseProvider holds), so two licences on one device never share a record, and a licence renewed with a new
 * code starts one of its own while the old one stays, here and on the server.
 *
 * syncLearnerRecord(course, licence):
 *   1. what was studied here with no licence joins this licence's record, once ("무료 체험 … 이용권을 넣으면 한 번 서버로
 *      합친다", §4 — as PassoffProgressProvider hands a completion made with no licence to the first licence);
 *   2. the licence's record goes up with the licence it is kept under (`owner`) — the server takes what it may (review.ts
 *      acceptDeviceRecord) — and the merged one comes back and is kept here, joined with anything answered meanwhile;
 *   3. an answer for another licence (the session's code is not the one this record is kept under — `taken: false`) goes
 *      to THAT licence's record here; this one is left as it is.
 * The answer carries today's plan by the server's clock, tomorrow's count and the data of the plan's items (none with
 * `planOnly`). `leaving` — the page is going away: a request that outlives it, with today's part of the record only.
 */
import { learningDay } from "./day";
import { emptyRecord, mergeRecords, sanitizeRecord } from "./engine";
import { readLearnerRecord, writeLearnerRecord } from "./record";
import { recordOfDay, type LearningSyncAnswer } from "./review";
import type { CourseRecord } from "./types";
import { planOpensCourse } from "../license";

export type SyncResult<T> =
  | { ok: true; answer: LearningSyncAnswer<T> }
  /** "offline" — the request did not reach the server; otherwise its HTTP status (401 no licence, 429 …) */
  | { ok: false; status: number | "offline" };

export interface SyncOptions {
  /** today's plan without the data of its items (the course list's line, a finished lesson, answers going up) */
  planOnly?: boolean;
  /** the page is going away: the request outlives it (keepalive), with today's part of the record when the whole is large */
  leaving?: boolean;
}

/** a request that outlives its page may carry 64 KB at most */
const KEEPALIVE_LIMIT = 60_000;

/**
 * Whose record a lesson writes now: the licence's opaque id when an active licence opens the course (the id the server
 * gives it — licenseIdFor), else null (the free trial's record).
 */
export function learnerOf(
  course: string,
  licence: { active: boolean; id?: string | null; plan?: string | null },
): string | null {
  return licence.active && licence.id && planOpensCourse(licence.plan, course) ? licence.id : null;
}

const isEmpty = (record: CourseRecord) =>
  !Object.keys(record.items).length && !Object.keys(record.lessons).length && !record.log.length && !record.reports.length;

/** What was studied with no licence joins this licence's record, and the record kept with no licence starts again. */
function adoptFreeRecord(course: string, learner: string) {
  const free = readLearnerRecord(course, null);
  if (isEmpty(free)) return;
  if (!writeLearnerRecord(mergeRecords(readLearnerRecord(course, learner), free), learner)) return;
  writeLearnerRecord(emptyRecord(course), null);
}

export async function syncLearnerRecord<T>(course: string, learner: string, options: SyncOptions = {}): Promise<SyncResult<T>> {
  adoptFreeRecord(course, learner);
  const whole = readLearnerRecord(course, learner);
  const bodyOf = (record: CourseRecord) =>
    JSON.stringify({ record, owner: learner, ...(options.planOnly ? { planOnly: true } : {}) });
  let body = bodyOf(whole);
  let keepalive = false;
  if (options.leaving) {
    if (body.length > KEEPALIVE_LIMIT) body = bodyOf(recordOfDay(whole, learningDay(Date.now())));
    keepalive = body.length <= KEEPALIVE_LIMIT;
  }
  let response: Response;
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      keepalive,
      body,
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as (LearningSyncAnswer<T> & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  const record = sanitizeRecord(data.record, course);
  const owner = data.taken ? learner : typeof data.owner === "string" && data.owner ? data.owner : null;
  if (owner) writeLearnerRecord(mergeRecords(readLearnerRecord(course, owner), record), owner);
  return { ok: true, answer: { ...data, record } };
}

/**
 * The data of these items (a plan made on this device) from the server — POST /api/learning/<course>/items: a licence that
 * opens the course, these keys only, of its open lessons. For a course whose record stays on the device (before D04).
 */
export async function fetchReviewItems<T>(
  course: string,
  keys: readonly string[],
): Promise<{ ok: true; items: Record<string, T> } | { ok: false; status: number | "offline" }> {
  if (!keys.length) return { ok: true, items: {} };
  let response: Response;
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ keys }),
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as { success?: boolean; items?: Record<string, T> } | null;
  if (!response.ok || !data || data.success !== true || !data.items || typeof data.items !== "object") {
    return { ok: false, status: response.status };
  }
  return { ok: true, items: data.items };
}
