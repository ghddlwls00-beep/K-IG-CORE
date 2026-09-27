import "server-only";
import { CLOZE_ALSO_FITS_REVIEWED } from "@/lib/readingClozeFits";

/**
 * READING 빈칸 — the reviewed "this option also fits the blank" pairs of ONE lesson, for the page to hand to its view.
 *
 * 2026-09-27 (유출 규칙 — public files hold zero paid lesson content, and sorting or disguising a list does not make it
 * public): CLOZE_ALSO_FITS_REVIEWED is a course-wide word list — about 680 key words of all 256 passages, most of them
 * paid. Imported by the browser code, a free lesson's page would have carried all of it. So the table stays on the server
 * and the view gets only what its own blanks can use: keys that are this lesson's key words, and values that occur in this
 * lesson (its key words or passage words). The generator offers nothing else as an option, so its blanks are identical to
 * the ones the full table gives (docs/qa-2026-09-18/scripts/check-reading-cloze.cjs compares the two over every lesson).
 */
export function clozeAlsoFitsFor(
  sentences: readonly string[],
  keywords: readonly string[],
): Record<string, string[]> {
  // every word of this lesson: the passage's words and its key words (an answer is always a key word found in the passage,
  // so matching keys against these words also covers a lesson whose key words the view works out itself)
  const words = new Set<string>();
  for (const s of sentences) for (const w of s.toLowerCase().split(/[^a-z0-9'’-]+/)) if (w) words.add(w.replace(/^[-'’]+|[-'’]+$/g, ""));
  for (const k of keywords) if (k) words.add(String(k).trim().toLowerCase());
  const out: Record<string, string[]> = {};
  for (const key of words) {
    const list = CLOZE_ALSO_FITS_REVIEWED[key];
    if (!list) continue;
    const keep = list.filter((w) => words.has(w));
    if (keep.length) out[key] = keep;
  }
  return out;
}
