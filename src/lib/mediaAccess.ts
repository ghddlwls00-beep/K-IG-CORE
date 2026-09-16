/**
 * Decides who may fetch a media object, so the bucket can stop being public.
 *
 * The lesson pages were gated on the server in KIG-001, but the media kept its
 * own door open: the bucket answered anonymous requests and the object keys are
 * sequential ("audio/ld/d150.mp3", "audio/reading/pr200.mp3"), so the whole
 * catalogue could be walked without ever loading a page. This module is the
 * rule the media route applies instead.
 *
 * Two kinds of object need to stay reachable without a license:
 *
 *   - anything belonging to a free preview lesson, which is the point of the
 *     preview; and
 *   - the pre-generated speech clips under "audio/azure-ava/", whose keys are
 *     content hashes. A clip is only useful to someone who already knows the
 *     sentence it speaks, and the sentences are behind the page gate, so these
 *     carry no catalogue of their own to walk.
 *
 * EVERYTHING ELSE IS DENIED, and that is a change. The rule used to be the
 * opposite — a key whose folder did not map onto a course was allowed, on the
 * theory that such keys were section artwork. They are not: the artwork lives
 * in `public/images/sections/` and Next serves it statically, so it never
 * reaches this handler, which only ever sees "/audio/…" and "/video/…" (the
 * proxy matcher excludes both). What the folder test actually let through was
 * the retired courses still sitting in the bucket — `audio/adults/`,
 * `audio/man/`, `audio/woman/`, `audio/basics/`, `audio/chinese/`,
 * `audio/middle/`. Measured on production 2026-09-16, `/audio/adults/am01.mp3`
 * answered 200 with `public, max-age=31536000, immutable`, so the CDN handed
 * the old course out for a year to anyone who guessed a path. `FOLDER_TO_COURSE`
 * below is now the allow list.
 */

import { isFreePreviewLesson, isStudentOnlyPlan } from "./license";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "./licenseSession";

/** Folders under the media root that map onto a course slug. THE ALLOW LIST. */
const FOLDER_TO_COURSE: Record<string, string> = {
  ld: "ld",
  reading: "reading",
  phonics: "phonics",
  grammar1: "grammar1",
  grammar2: "grammar2",
  student: "student",
  cnn: "cnn",
};

export type MediaAccess =
  | { allowed: true; reason: "unified-speech" | "free-preview" | "licensed" }
  | { allowed: false; reason: "locked" | "unclaimed" };

/**
 * `key` is the object key without a leading slash, e.g. "audio/ld/d150.mp3".
 * `cookieValue` is the raw license session cookie, or undefined when absent.
 */
export async function resolveMediaAccess(
  key: string,
  cookieValue: string | undefined,
): Promise<MediaAccess> {
  const parts = key.split("/").filter(Boolean);

  // audio/azure-ava/v1/<hash>.mp3 — hashed keys, see the note above.
  if (parts[1] === "azure-ava") return { allowed: true, reason: "unified-speech" };

  const course = parts[1] ? FOLDER_TO_COURSE[parts[1]] : undefined;
  const file = parts[parts.length - 1] ?? "";
  const lessonId = file.replace(/\.[a-z0-9]+$/i, "");

  // A key whose folder is not one of the courses this app serves belongs to a
  // course that is no longer routed (`adults`, `man`, `woman`, `basics`,
  // `chinese`, `middle` — all still in the bucket, all with guessable names).
  // Denied. Nothing the live site renders lands here: every media path the app
  // references is "/audio/<course>/<file>" or "/video/cnn/<file>".
  if (!course || !lessonId) return { allowed: false, reason: "unclaimed" };

  if (isFreePreviewLesson(course, lessonId)) {
    return { allowed: true, reason: "free-preview" };
  }

  const session = await verifyLicenseSessionToken(cookieValue);
  if (!session) return { allowed: false, reason: "locked" };

  // STUDENT-only passes cover the STUDENT course alone; 1M / 1Y / LIFE are all-pass.
  const allowed = isStudentOnlyPlan(session.payload.plan) ? course === "student" : true;
  return allowed ? { allowed: true, reason: "licensed" } : { allowed: false, reason: "locked" };
}

export { LICENSE_SESSION_COOKIE_NAME };
