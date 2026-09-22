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
 *   - the pre-generated speech clips under "audio/azure-ava/" THAT A FREE
 *     LESSON SPEAKS. Their keys are content hashes, and the old rule let every
 *     clip through on the theory that a hash is only guessable by someone who
 *     already knows the sentence. That assumed the sentences were secret. They
 *     are not — the repository that holds `content/` is public and so is the
 *     hash function — and measured on production 2026-09-16, 19 of 20 clips
 *     for four locked lessons answered 206 to an anonymous request (SEC-02).
 *     The free set is now enumerated at build time by
 *     `scripts/buildFreeSpeechKeys.mjs` into `generated/freeSpeechKeys.json`;
 *     every other clip needs a licence session, exactly like course audio.
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

import { isStudentOnlyPlan } from "./license";
import {
  LICENSE_SESSION_COOKIE_NAME,
  verifyLicenseSessionToken,
} from "./licenseSession";
import freeSpeech from "./generated/freeSpeechKeys.json";
import { isFreeMediaKey } from "./freeMedia";

/**
 * Clip keys a free preview lesson can request. Built from `content/` by
 * `scripts/buildFreeSpeechKeys.mjs` (run by `prebuild`), so a text change in a
 * free lesson is followed by a rebuild of this list, never by editing it.
 */
const FREE_SPEECH_KEYS = new Set<string>(freeSpeech.keys);

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
  const file = parts[parts.length - 1] ?? "";

  // audio/azure-ava/v1/<hash>.mp3 — see the note above. A clip on the free
  // list is open to everyone (kept a year by the browser; since MEDIA-02 no
  // shared cache stores any clip — see mediaRoute.ts); anything else is served only to a
  // licence session, and privately, like the course folders below. The session
  // is not narrowed by course here because a hash carries no course — a
  // STUDENT-only pass can therefore fetch a GRAMMAR clip, but only after paying
  // and only for a sentence it already has; the anonymous leak is what mattered.
  if (parts[1] === "azure-ava") {
    const clipKey = file.replace(/\.mp3$/i, "");
    if (FREE_SPEECH_KEYS.has(clipKey)) return { allowed: true, reason: "unified-speech" };
    const session = await verifyLicenseSessionToken(cookieValue);
    return session ? { allowed: true, reason: "licensed" } : { allowed: false, reason: "locked" };
  }

  const course = parts[1] ? FOLDER_TO_COURSE[parts[1]] : undefined;
  const lessonId = file.replace(/\.[a-z0-9]+$/i, "");

  // A key whose folder is not one of the courses this app serves belongs to a
  // course that is no longer routed (`adults`, `man`, `woman`, `basics`,
  // `chinese`, `middle` — all still in the bucket, all with guessable names).
  // Denied. Nothing the live site renders lands here: every media path the app
  // references is "/audio/<course>/<file>" or "/video/cnn/<file>".
  if (!course || !lessonId) return { allowed: false, reason: "unclaimed" };

  // BUG-019: the exact object keys the free lessons list, not "a name that
  // reduces to a free id" — see freeMedia.ts.
  if (isFreeMediaKey(key)) {
    return { allowed: true, reason: "free-preview" };
  }

  const session = await verifyLicenseSessionToken(cookieValue);
  if (!session) return { allowed: false, reason: "locked" };

  // STUDENT-only passes cover the STUDENT course alone; 1M / 1Y / LIFE are all-pass.
  const allowed = isStudentOnlyPlan(session.payload.plan) ? course === "student" : true;
  return allowed ? { allowed: true, reason: "licensed" } : { allowed: false, reason: "locked" };
}

export { LICENSE_SESSION_COOKIE_NAME };
