/**
 * This device's record and the server's (공통-학습-엔진.md §2 · §8) — for a course whose record the server also keeps
 * (src/lib/learning/serverStore.ts), with a licence that opens it. The whole record goes up (the server takes what it
 * may — review.ts acceptDeviceRecord) and the merged one comes back and is kept here, joined with anything answered on
 * this device while the request was out. The server's answer also carries today's plan and the data of its items.
 *
 * The record on a device is one per course, whoever studies (record.ts). So the device also keeps which licence it was
 * last merged with ("kig-learning-owner:<course>" — the licence's opaque id, never the code): a record last kept for
 * another licence is not merged into this one (the server answers `taken: false`), and this licence's record replaces it
 * here. A record never merged (the free trial) goes with the first licence — "무료 체험 … 이용권을 넣으면 한 번 서버로
 * 합친다" (§4).
 */
import { mergeRecords, sanitizeRecord } from "./engine";
import { readCourseRecord, writeCourseRecord } from "./record";
import type { LearningSyncAnswer } from "./review";

const OWNER_PREFIX = "kig-learning-owner:";

function readOwner(course: string): string | null {
  try {
    return window.localStorage.getItem(OWNER_PREFIX + course);
  } catch {
    return null;
  }
}

function writeOwner(course: string, owner: string): void {
  try {
    window.localStorage.setItem(OWNER_PREFIX + course, owner);
  } catch {
    // no storage: the next merge sends no owner, as a first one does
  }
}

export type SyncResult<T> =
  | { ok: true; answer: LearningSyncAnswer<T> }
  /** "offline" — the request did not reach the server; otherwise its HTTP status (401 no licence, 429 …) */
  | { ok: false; status: number | "offline" };

export async function syncCourseRecord<T>(course: string): Promise<SyncResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ record: readCourseRecord(course), owner: readOwner(course) }),
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as (LearningSyncAnswer<T> & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  const record = sanitizeRecord(data.record, course);
  writeCourseRecord(data.taken ? mergeRecords(readCourseRecord(course), record) : record);
  if (typeof data.owner === "string" && data.owner) writeOwner(course, data.owner);
  return { ok: true, answer: { ...data, record } };
}

/**
 * What a request may ask besides the merge (단계 2-나 E2 — the API's own words in src/app/api/learning/[course]/route.ts):
 *   view "notes"  the wrong-answer list of the open lessons comes back too (LearningNotesAnswer) — `lesson` for that
 *                 lesson's listed items' data (none without it);
 *   view "record" the record kept in step, no item data back (a lesson finished · a report · a practice run · a map);
 *   forward       lessons whose items the server brings to the front of the next review (practice.ts applyBringForward —
 *                 this device does the same on its own copy);
 *   withRecord    false: this device's record does not go up (a second request right after the first one) — the
 *                 server's still comes back and is merged here.
 */
export interface SyncExtra {
  view?: "notes" | "record";
  lesson?: string;
  forward?: readonly string[];
  withRecord?: boolean;
}

/** syncCourseRecord with more asked of the server (the wrong-answer list · a lesson's listed items · lessons brought forward). */
export async function syncCourseRecordWith<T, A extends LearningSyncAnswer<T> = LearningSyncAnswer<T>>(
  course: string,
  extra: SyncExtra,
): Promise<{ ok: true; answer: A } | { ok: false; status: number | "offline" }> {
  let response: Response;
  const { withRecord = true, ...asked } = extra;
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ record: withRecord ? readCourseRecord(course) : null, owner: readOwner(course), ...asked }),
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as (A & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  const record = sanitizeRecord(data.record, course);
  writeCourseRecord(data.taken ? mergeRecords(readCourseRecord(course), record) : record);
  if (typeof data.owner === "string" && data.owner) writeOwner(course, data.owner);
  return { ok: true, answer: { ...data, record } };
}
