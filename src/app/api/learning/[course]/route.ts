import { NextResponse } from "next/server";
import { planOpensCourse } from "@/lib/license";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { addDays, learningDay } from "@/lib/learning/day";
import { mergeRecords, planDay, sanitizeRecord, wrongList } from "@/lib/learning/engine";
import { applyBringForward, forwardedItems } from "@/lib/learning/practice";
import { acceptDeviceRecord, restrictRecord, sameRecord, type LearningSyncAnswer } from "@/lib/learning/review";
import { serverLearningCourse } from "@/lib/learning/serverCourses";
import { changeLearningRecord, isServerLearningCourse } from "@/lib/learning/serverStore";
import { licenseIdFor } from "@/lib/serverLicense";

/**
 * The learning record on the server and today's review (공통-학습-엔진.md §8-2 · §10) — one route for every course whose
 * record the server keeps (src/lib/learning/serverStore.ts SERVER_LEARNING_COURSES; PASS-OFF GRAMMAR first).
 *
 * POST { record, owner, planOnly? } — this licence's record on the device and the licence the device keeps it under
 * (src/lib/learning/sync.ts):
 *   1. a licence session that opens the course (401 · 403), at most 120 requests a minute per device (429, as STUDENT's);
 *   2. the device's record, checked field by field (sanitizeRecord) and taken only for items the course has in lessons
 *      open to this licence, with no day after the server's today and no state its answers do not bear out (review.ts
 *      acceptDeviceRecord). A record kept for another licence is not taken at all (`taken: false`) — two learners'
 *      answers are never mixed;
 *   3. merged into the stored one (the engine's mergeRecords — on the same day a wrong answer wins) and written only when
 *      that changed it;
 *   4. answered with the record, today's plan by the SERVER's clock, tomorrow's count and the data of the plan's items
 *      ONLY — the course's server adapter reads them from its lesson files (serverCourses.ts), only for open lessons; with
 *      `planOnly` (the course list's line, answers going up) no item data at all. Nothing else of a paid lesson leaves
 *      the server here.
 *
 * 단계 2-나 E2 (공통-학습-엔진.md §8-5 · 8-7 · §11) — more may be asked in the same body:
 *   - `view: "notes"`: the answer also carries the wrong-answer list (engine.ts wrongList) of the open lessons — keys, kinds
 *     and the learner's own last wrong answers, no item text — and `items` holds the data of ONE lesson's listed items
 *     (`lesson`), none without it. The list names the items; their words come lesson by lesson, open lessons only;
 *   - `view: "record"`: the record kept in step and nothing else — `items` empty, as with `planOnly` (a lesson page after a
 *     completion or a report, the wrong-answer list after a practice run, the map page);
 *   - `forward: [lesson ids]`: those open lessons' learning items come back by tomorrow (practice.ts applyBringForward —
 *     PASS-OFF: the boxes of a topic map filled wrong). Done here on the stored copy, because a merge keeps the stored item
 *     when two copies differ only in their due day — and done even when the device's record is not taken (`taken: false`):
 *     the request is made with this licence's session, as the map's own record (the progress API) is. The answer's
 *     `forwarded` counts those lessons' items that come back by tomorrow.
 */

const requestWindows = new Map<string, { startedAt: number; count: number }>();

/** STUDENT's limit (src/app/api/progress/student/route.ts): 120 a minute per device, in this instance's memory (SEC-07). */
function pruneFinishedWindows(now: number) {
  if (requestWindows.size < 500) return;
  for (const [identity, window] of requestWindows) {
    if (now - window.startedAt >= 60_000) requestWindows.delete(identity);
  }
}

function allowWrite(identity: string): boolean {
  const now = Date.now();
  pruneFinishedWindows(now);
  const current = requestWindows.get(identity);
  if (!current || now - current.startedAt >= 60_000) {
    requestWindows.set(identity, { startedAt: now, count: 1 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

/** A whole record is about 300 KB at the end of a 67-lesson course; anything far past that is not one. */
const MAX_BODY_BYTES = 2_000_000;

const fail = (status: number, error: string) => NextResponse.json({ success: false, error }, { status });

export async function POST(request: Request, { params }: { params: Promise<{ course: string }> }) {
  const { course } = await params;
  if (!isServerLearningCourse(course)) return fail(404, "복습 기록을 서버에 두지 않는 과정입니다.");
  try {
    const session = await verifyLicenseSession(request);
    if (!session) return fail(401, "유효한 이용권 인증이 필요합니다.");
    if (!planOpensCourse(session.payload.plan, course)) return fail(403, "이 이용권으로는 이 과정을 이용할 수 없습니다.");
    const adapter = serverLearningCourse(course);
    if (!adapter) return fail(404, "복습 기록을 서버에 두지 않는 과정입니다.");
    if (!allowWrite(session.payload.deviceId)) return fail(429, "복습 기록 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return fail(413, "복습 기록이 너무 큽니다.");
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return fail(400, "요청 형식이 올바르지 않습니다.");
    }
    if (!body || typeof body !== "object") return fail(400, "요청 형식이 올바르지 않습니다.");

    const now = Date.now();
    const today = learningDay(now);
    const owner = licenseIdFor(session.payload.key);
    const taken = typeof body.owner !== "string" || body.owner === owner;
    const access = await adapter.access({ key: session.payload.key, plan: session.payload.plan });
    const sent = taken
      ? acceptDeviceRecord(sanitizeRecord(body.record, course), {
          today,
          nowIso: new Date(now).toISOString(),
          item: adapter.item,
          lessonOpen: access.lessonOpen,
          profile: adapter.profile,
        })
      : null;

    // E2: lessons brought forward — open ones only, a lesson id at most once, a course's worth at most
    const forward = Array.isArray(body.forward)
      ? [...new Set(body.forward.filter((id): id is string => typeof id === "string" && access.lessonOpen(id)))].slice(0, 100)
      : [];

    const record = await changeLearningRecord(course, session.payload.key, (stored) => {
      if (!sent) {
        // a forward is this licence's own request (its map page), so it is made on the stored record even when the device's
        // record is not taken (another licence last kept it on this device)
        if (!forward.length) return { record: stored, changed: false };
        const copy = structuredClone(stored);
        return { record: copy, changed: applyBringForward(copy, forward, now) > 0 };
      }
      const merged = mergeRecords(stored, sent);
      if (forward.length) applyBringForward(merged, forward, now);
      return { record: merged, changed: !sameRecord(stored, merged) };
    });

    // today's review by the server's clock, from the open lessons' items alone (a stored item of a topic locked again
    // since — the owner's reset — waits until it opens)
    const open = (key: string) => {
      const known = adapter.item(key);
      return known !== null && access.lessonOpen(known.lessonId);
    };
    const reviewable = restrictRecord(record, open, access.lessonOpen);
    const plan = planDay(reviewable, today, adapter.profile);
    // E2: the wrong-answer list names its items; only the asked lesson's come with their words. A page that only keeps the
    // record in step (`planOnly` · view "record" — the course list, a lesson finished, a report, a practice run, answers
    // going up) gets no item's words at all
    const notes = body.view === "notes" ? wrongList(reviewable) : null;
    const noteKeys = notes ? (notes.find((lesson) => lesson.lessonId === body.lesson)?.items.map((item) => item.key) ?? []) : [];
    const items =
      body.planOnly === true || body.view === "record"
        ? {}
        : adapter.itemData(notes ? noteKeys : plan.items.map((item) => item.key), access);
    const tomorrow = planDay(reviewable, addDays(today, 1), adapter.profile).items.length;
    const answer: LearningSyncAnswer = { record, plan, items, tomorrow, owner, taken };
    // E2: with a forward, how many of those lessons' learning items come back by tomorrow — the map page says so (0: none to bring)
    const forwarded = forward.length ? forwardedItems(record, forward, now) : undefined;
    return NextResponse.json(
      { success: true, ...answer, ...(notes ? { notes } : {}), ...(forwarded !== undefined ? { forwarded } : {}) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error(`Learning record sync failed (${course}):`, error);
    return fail(500, "복습 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
