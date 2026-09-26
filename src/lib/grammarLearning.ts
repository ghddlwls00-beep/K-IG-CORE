/**
 * GRAMMAR I · II for the common learning engine (docs/pass-off-grammar/공통-학습-엔진.md §5, v1).
 *
 * An item is one lesson sentence, keyed `<lesson id>#<order>` — the order in the lesson data, from 1
 * (GrammarItem.id). About 30 seconds each in review. When a lesson is finished, the sentences the
 * learner missed or needed help with in it come back from the next day (계획 D12). The view only calls
 * the engine's record functions; the review screen itself comes with the engine's shared page.
 */
import type { CourseProfile } from "@/lib/learning/types";

export const GRAMMAR_SECONDS_PER_SENTENCE = 30;

export function grammarLearningProfile(course: string): CourseProfile {
  return { course, secondsPerKind: { sentence: GRAMMAR_SECONDS_PER_SENTENCE }, elementKinds: [] };
}

export const grammarItemKey = (lessonId: string, id: number) => `${lessonId}#${id}`;
