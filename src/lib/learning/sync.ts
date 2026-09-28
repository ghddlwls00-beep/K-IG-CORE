/**
 * This device's record and the server's (공통-학습-엔진.md §2 · §8 · §10 · §11) — for a course whose record the server also
 * keeps (src/lib/learning/serverStore.ts), with a licence that opens it.
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
 *
 * 단계 2-나 E2 (merged onto the records per learner above): a request may ask more — the wrong-answer list (`view: "notes"`,
 * a lesson's listed items with `lesson`), the record alone (`view: "record"`), lessons brought forward (`forward`), or
 * the server's record without sending this one (`withRecord: false`) — the API's own words in
 * src/app/api/learning/[course]/route.ts. Lessons to bring forward wait here, for the learner who queued them
 * ("kig-learning-forward:<course>@<licence id>" — queueForward), until a request of that learner carries them to the
 * server, so one that failed is not lost.
 */
import { learningDay } from "./day";
import { emptyRecord, mergeRecords, sanitizeRecord } from "./engine";
import { readLearnerRecord, writeLearnerRecord } from "./record";
import { recordOfDay, type LearningSyncAnswer } from "./review";
import type { CourseRecord } from "./types";
import { planOpensCourse } from "../license";

export type SyncResult<T, A extends LearningSyncAnswer<T> = LearningSyncAnswer<T>> =
  | { ok: true; answer: A }
  /** "offline" — the request did not reach the server; otherwise its HTTP status (401 no licence, 429 …) */
  | { ok: false; status: number | "offline" };

export interface SyncOptions {
  /** today's plan without the data of its items (the course list's line, a finished lesson, answers going up) */
  planOnly?: boolean;
  /** the page is going away: the request outlives it (keepalive), with today's part of the record when the whole is large */
  leaving?: boolean;
  /**
   * 단계 2-나 E2 — "notes": the wrong-answer list of the open lessons comes back too (review.ts LearningNotesAnswer), with the
   * data of `lesson`'s listed items (none without it); "record": the record kept in step, no item data back (a report · a
   * practice run · a map) — as `planOnly`
   */
  view?: "notes" | "record";
  lesson?: string;
  /**
   * lessons whose items the server brings back by tomorrow (practice.ts applyBringForward — this device does the same on its
   * own copy). Lessons queued with queueForward go with every request of their learner anyway; the answer's `forwarded` says
   * how many of their items come back by tomorrow
   */
  forward?: readonly string[];
  /** false: this device's record does not go up (a second request right after the first one) — the server's still comes back */
  withRecord?: boolean;
}

/** a request that outlives its page may carry 64 KB at most */
const KEEPALIVE_LIMIT = 60_000;

/** + "<course>@<licence id>": lessons to bring forward that no request has carried to the server yet (단계 2-나 E2) */
const FORWARD_PREFIX = "kig-learning-forward:";
/** the server takes a course's worth of lessons in one `forward` (route.ts) */
const FORWARD_LIMIT = 100;

const forwardName = (course: string, learner: string) => `${FORWARD_PREFIX}${course}@${learner}`;

function readForward(course: string, learner: string): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(forwardName(course, learner)) || "null");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80).slice(0, FORWARD_LIMIT);
  } catch {
    return [];
  }
}

function writeForward(course: string, learner: string, lessons: readonly string[]): void {
  try {
    if (lessons.length) window.localStorage.setItem(forwardName(course, learner), JSON.stringify(lessons));
    else window.localStorage.removeItem(forwardName(course, learner));
  } catch {
    // no storage: the request that is about to go carries them, and nothing waits for a later one
  }
}

/**
 * Lessons whose items the server should bring forward (practice.ts applyBringForward — PASS-OFF: the topic map's boxes filled
 * wrong). They wait on this device, for this learner, until a request of theirs to the course's learning API carries them —
 * the next one of any page, not only the one the map page sends — so a request that failed or never went does not lose
 * them: a merge keeps the stored item when two copies differ only in their due day, so the device's own copy alone would
 * not get there.
 */
export function queueForward(course: string, learner: string, lessonIds: readonly string[]): void {
  writeForward(course, learner, [...new Set([...readForward(course, learner), ...lessonIds])].slice(0, FORWARD_LIMIT));
}

/** The server took these: off the queue (a lesson queued again meanwhile stays). */
function forwardSent(course: string, learner: string, sent: readonly string[]): void {
  if (!sent.length) return;
  writeForward(course, learner, readForward(course, learner).filter((id) => !sent.includes(id)));
}

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

export async function syncLearnerRecord<T, A extends LearningSyncAnswer<T> = LearningSyncAnswer<T>>(
  course: string,
  learner: string,
  options: SyncOptions = {},
): Promise<SyncResult<T, A>> {
  adoptFreeRecord(course, learner);
  const { planOnly = false, leaving = false, view, lesson, forward: asked = [], withRecord = true } = options;
  const queued = readForward(course, learner);
  const forward = [...new Set([...asked, ...queued])].slice(0, FORWARD_LIMIT);
  const whole = withRecord ? readLearnerRecord(course, learner) : null;
  const bodyOf = (record: CourseRecord | null) =>
    JSON.stringify({
      record,
      owner: learner,
      ...(planOnly ? { planOnly: true } : {}),
      ...(view ? { view } : {}),
      ...(lesson ? { lesson } : {}),
      ...(forward.length ? { forward } : {}),
    });
  let body = bodyOf(whole);
  let keepalive = false;
  if (leaving) {
    if (whole && body.length > KEEPALIVE_LIMIT) body = bodyOf(recordOfDay(whole, learningDay(Date.now())));
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
  const data = (await response.json().catch(() => null)) as (A & { success?: boolean }) | null;
  if (!response.ok || !data || data.success !== true) return { ok: false, status: response.status };
  // the server made the queued forward on this session's record (route.ts — even when it did not take this device's)
  forwardSent(course, learner, queued);
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
