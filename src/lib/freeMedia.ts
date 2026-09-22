/**
 * BUG-019 — is this media object one that a free preview lesson uses?
 *
 * Matched EXACTLY against the object keys the free lessons list in `audio[]`
 * and `video[]`, collected at build time by `scripts/buildFreeSpeechKeys.mjs`
 * into `generated/freeMediaKeys.json`.
 *
 * It used to ask `isFreePreviewLesson(course, fileName)`, which removes
 * trailing "-<number>" parts until it finds a free id. That rule exists so a
 * free LESSON's pages and files resolve ("s1-1-1.mp3" belongs to s1-1), but it
 * also accepted any name built that way — "audio/ld/d001-999.mp3" counted as
 * d001. No paid file was reachable through it (measured 2026-09-22), but the
 * rule was wider than the files it was meant for.
 *
 * Kept import-free apart from the generated list, so the offline check
 * (`docs/qa-2026-09-18/scripts/check-media-gate.cjs`) runs this exact code.
 */
import freeMedia from "./generated/freeMediaKeys.json";

const FREE_MEDIA_KEYS = new Set<string>(freeMedia.keys);

/** `key` is the object key without a leading slash, e.g. "audio/student/s1-1-1.mp3". */
export function isFreeMediaKey(key: string): boolean {
  return FREE_MEDIA_KEYS.has(key);
}
