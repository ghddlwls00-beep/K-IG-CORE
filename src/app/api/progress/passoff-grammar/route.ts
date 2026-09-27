import { NextResponse } from "next/server";
import { verifyLicenseSession } from "@/lib/licenseSession";
import { planOpensCourse } from "@/lib/license";
import {
  getPassoffProgress,
  passoffProgressSnapshot,
  updatePassoffProgress,
} from "@/lib/passoffProgress";
import type { PassoffUpdate } from "@/lib/passoffUnlock";

/**
 * PASS-OFF GRAMMAR progress (docs/pass-off-grammar/설계.md §5) — STUDENT's /api/progress/student, for this course.
 * GET: the licence's record as judged now. POST: finished lessons ({ updates: [{ lessonId, completed: true,
 * clientUpdatedAt }] }) and, from the common learning engine later, a topic's "구성도 다시 채우기" ({ mapRefillTopic }).
 * The licence cookie is required; the server takes records only for open topics (src/lib/passoffUnlock.ts).
 */
const COURSE = "passoff-grammar";

const requestWindows = new Map<string, { startedAt: number; count: number }>();

/**
 * Writes are limited per device, as STUDENT's are: 120 a minute, in this server instance's memory (SEC-07 — finished
 * windows are dropped once the map passes a few hundred entries). A shared counter needs a store this project does
 * not have; writes need a valid licence session anyway.
 */
function pruneFinishedWindows(now: number) {
  if (requestWindows.size < 500) return;
  for (const [identity, window] of requestWindows) {
    if (now - window.startedAt >= 60_000) requestWindows.delete(identity);
  }
}

function allowProgressWrite(identity: string): boolean {
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

const unauthorized = () =>
  NextResponse.json({ success: false, error: "유효한 이용권 인증이 필요합니다." }, { status: 401 });
const notThisCourse = () =>
  NextResponse.json({ success: false, error: "이 이용권으로는 PASS-OFF GRAMMAR 를 이용할 수 없습니다." }, { status: 403 });

function toUpdate(raw: unknown): PassoffUpdate {
  const update = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    lessonId: typeof update.lessonId === "string" ? update.lessonId : undefined,
    completed: typeof update.completed === "boolean" ? update.completed : undefined,
    clientUpdatedAt: typeof update.clientUpdatedAt === "number" ? update.clientUpdatedAt : undefined,
    mapRefillTopic: typeof update.mapRefillTopic === "number" ? update.mapRefillTopic : undefined,
  };
}

export async function GET(request: Request) {
  try {
    const session = await verifyLicenseSession(request);
    if (!session) return unauthorized();
    if (!planOpensCourse(session.payload.plan, COURSE)) return notThisCourse();
    // the lesson route's own rule (src/app/passoff-grammar/[lesson]/page.tsx): a LIFE pass opens every topic
    const everyTopicOpen = session.payload.plan === "LIFE";
    const record = await getPassoffProgress(session.payload.key);
    return NextResponse.json({ success: true, progress: passoffProgressSnapshot(record, { everyTopicOpen }) });
  } catch (error) {
    console.error("PASS-OFF GRAMMAR progress read failed:", error);
    return NextResponse.json(
      { success: false, error: "진도를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await verifyLicenseSession(request);
    if (!session) return unauthorized();
    if (!planOpensCourse(session.payload.plan, COURSE)) return notThisCourse();
    if (!allowProgressWrite(session.payload.deviceId)) {
      return NextResponse.json(
        { success: false, error: "진도 저장 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ success: false, error: "요청 형식이 올바르지 않습니다." }, { status: 400 });
    }
    // the lesson route's own rule (src/app/passoff-grammar/[lesson]/page.tsx): a LIFE pass opens every topic
    const everyTopicOpen = session.payload.plan === "LIFE";
    const rawUpdates: unknown[] = Array.isArray(body?.updates) ? body.updates : [body];
    const record = await updatePassoffProgress(session.payload.key, rawUpdates.map(toUpdate), { everyTopicOpen });
    return NextResponse.json({ success: true, progress: passoffProgressSnapshot(record, { everyTopicOpen }) });
  } catch (error) {
    console.error("PASS-OFF GRAMMAR progress update failed:", error);
    return NextResponse.json(
      { success: false, error: "진도를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 500 },
    );
  }
}
