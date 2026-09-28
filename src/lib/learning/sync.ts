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
 *
 * 단계 2-나 E2 수정: lessons to bring forward wait here ("kig-learning-forward:<course>" — queueForward) until a request carries
 * them to the server, so one that failed is not lost.
 */
import { mergeRecords, sanitizeRecord } from "./engine";
import { readCourseRecord, writeCourseRecord } from "./record";
import type { LearningSyncAnswer } from "./review";

const OWNER_PREFIX = "kig-learning-owner:";
/** + the course: lessons to bring forward that no request has carried to the server yet (단계 2-나 E2 — queueForward) */
const FORWARD_PREFIX = "kig-learning-forward:";
/** the server takes a course's worth of lessons in one `forward` (route.ts) */
const FORWARD_LIMIT = 100;

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

interface QueuedForward {
  /** the licence this device's record was last merged with when the lessons were queued (null: never merged yet) */
  owner: string | null;
  lessons: string[];
}

function readForward(course: string): QueuedForward | null {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(FORWARD_PREFIX + course) || "null") as Partial<QueuedForward> | null;
    if (!parsed || !Array.isArray(parsed.lessons)) return null;
    const lessons = parsed.lessons.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80);
    return { owner: typeof parsed.owner === "string" ? parsed.owner : null, lessons: lessons.slice(0, FORWARD_LIMIT) };
  } catch {
    return null;
  }
}

function writeForward(course: string, queued: QueuedForward | null): void {
  try {
    if (queued && queued.lessons.length) window.localStorage.setItem(FORWARD_PREFIX + course, JSON.stringify(queued));
    else window.localStorage.removeItem(FORWARD_PREFIX + course);
  } catch {
    // no storage: the request that is about to go carries them, and nothing waits for a later one
  }
}

/**
 * Lessons whose items the server should bring forward (practice.ts applyBringForward — PASS-OFF: the topic map's boxes filled
 * wrong). They wait on this device until a request to the course's learning API carries them — the next one of any page,
 * not only the one the map page sends — so a request that failed or never went does not lose them: a merge keeps the
 * stored item when two copies differ only in their due day, so the device's own copy alone would not get there. Queued
 * for the licence this device's record was last merged with; another licence's requests drop them.
 */
export function queueForward(course: string, lessonIds: readonly string[]): void {
  const owner = readOwner(course);
  const queued = readForward(course);
  const kept = queued && queued.owner === owner ? queued.lessons : [];
  writeForward(course, { owner, lessons: [...new Set([...kept, ...lessonIds])].slice(0, FORWARD_LIMIT) });
}

/** The queued lessons this request carries — none that were queued for another licence (those are dropped). */
function forwardToSend(course: string): string[] {
  const queued = readForward(course);
  if (!queued) return [];
  const owner = readOwner(course);
  if (queued.owner !== null && owner !== null && queued.owner !== owner) {
    writeForward(course, null);
    return [];
  }
  return queued.lessons;
}

/** The server took these: off the queue (a lesson queued again meanwhile stays). */
function forwardSent(course: string, sent: readonly string[]): void {
  if (!sent.length) return;
  const queued = readForward(course);
  if (!queued) return;
  writeForward(course, { ...queued, lessons: queued.lessons.filter((id) => !sent.includes(id)) });
}

export type SyncResult<T> =
  | { ok: true; answer: LearningSyncAnswer<T> }
  /** "offline" — the request did not reach the server; otherwise its HTTP status (401 no licence, 429 …) */
  | { ok: false; status: number | "offline" };

export async function syncCourseRecord<T>(course: string): Promise<SyncResult<T>> {
  let response: Response;
  const forward = forwardToSend(course);
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ record: readCourseRecord(course), owner: readOwner(course), ...(forward.length ? { forward } : {}) }),
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as (LearningSyncAnswer<T> & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  forwardSent(course, forward);
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
 *   forward       lessons whose items the server brings back by tomorrow (practice.ts applyBringForward — this device does
 *                 the same on its own copy). Lessons queued with queueForward go with every request anyway; the answer's
 *                 `forwarded` says how many of their items come back by tomorrow;
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
  const { withRecord = true, forward: asked = [], ...rest } = extra;
  const queued = forwardToSend(course);
  const forward = [...new Set([...asked, ...queued])];
  try {
    response = await fetch(`/api/learning/${encodeURIComponent(course)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ record: withRecord ? readCourseRecord(course) : null, owner: readOwner(course), ...rest, ...(forward.length ? { forward } : {}) }),
    });
  } catch {
    return { ok: false, status: "offline" };
  }
  const data = (await response.json().catch(() => null)) as (A & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  forwardSent(course, queued);
  const record = sanitizeRecord(data.record, course);
  writeCourseRecord(data.taken ? mergeRecords(readCourseRecord(course), record) : record);
  if (typeof data.owner === "string" && data.owner) writeOwner(course, data.owner);
  return { ok: true, answer: { ...data, record } };
}
