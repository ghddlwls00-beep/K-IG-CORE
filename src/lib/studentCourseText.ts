import "server-only";

/**
 * STUDENT, on the server: which sentences of a lesson may show their first tile in lower case (2026-09-27 · STU-L05 ④).
 *
 * The rule looks at the WHOLE course — a word written with a capital in the middle of a sentence somewhere in the
 * course is a proper noun (Admiral, Koreans, Silla …) and keeps its capital as a first tile — and the course text must
 * not travel to the browser (a free lesson's page is served to anyone; paid lessons' words must not ride along). So the
 * answer is worked out here and the view gets only one true / false per sentence of its OWN lesson.
 */
import type { Block } from "@/lib/types";
import { getCourseIndex, getLesson } from "@/lib/content";
import { firstWordKeepsCase, midSentenceCapitals } from "@/lib/studentDictation";

/** A group name the rule misses — it never stands mid-sentence in the course (STU-L05 CHECK: s11-3 #6). */
export const STUDENT_EXTRA_CAPITALS: readonly string[] = ["Buddhists"];

/** The course's proper nouns from its sentences — pure, so the audit check can run it over the data files. */
export function studentCapitalsFrom(texts: readonly string[]): Set<string> {
  const out = midSentenceCapitals(texts);
  for (const word of STUDENT_EXTRA_CAPITALS) out.add(word);
  return out;
}

let capitals: Set<string> | null = null;

function sentencesOf(blocks: readonly Block[]): string[] {
  const block = blocks.find((b) => b.type === "sentences");
  return block && block.type === "sentences" ? block.items.map((item) => item.text) : [];
}

function courseCapitals(): Set<string> {
  if (capitals) return capitals;
  const texts: string[] = [];
  for (const summary of getCourseIndex("student")?.lessons ?? []) {
    const lesson = getLesson("student", summary.id);
    if (lesson) texts.push(...sentencesOf(lesson.blocks));
  }
  capitals = studentCapitalsFrom(texts);
  return capitals;
}

/** One entry per sentence of the lesson's sentence list: true = its first word keeps its capital on the tile. */
export function studentFirstWordKeepsCase(blocks: readonly Block[]): boolean[] {
  return firstWordKeepsCase(sentencesOf(blocks), courseCapitals());
}
