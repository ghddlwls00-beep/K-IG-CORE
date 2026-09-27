/**
 * VOCA for the common learning engine and this device (2026-09-27 — VOCA 학습법 · 화면 고침; docs/pass-off-grammar/공통-학습-엔진.md
 * §5 "VOCA · mv1-01#3 · 끝낸 강의의 모든 낱말 + 틀린 낱말 · 요소 2 · 5초").
 *
 * An item is one word of a lesson, keyed `<lesson id>#<order>` — the order is the word's 1-based place in the lesson's word grid
 * read row by row (rows.flat(), empty cells skipped; every VOCA lesson has none), the same place the page's whole-lesson player
 * reads it in. A word is an ELEMENT item: it passes on 2 different days. About 5 seconds each in review. When a lesson is
 * completed, every word of it comes back from the next day (the missed ones are among them). The view calls only the engine's
 * record functions; the review screen itself comes with the engine's shared page.
 *
 * What VOCA keeps on this device, per lesson (lessonKey = "phonics/<id>"):
 *   kig:voca:leitner:<lessonKey>         the word cards (src/lib/vocaUtils.ts LeitnerCard — an old record is read by readLeitnerCards)
 *   kig:voca:quiz:<lessonKey>            {"v":1,"rounds":N} — Step 2 rounds finished; the first one opens '학습 완료' (계획 D02 나)
 *   kig:voca:speed_high:v2:<lessonKey>   the best Step 4 score under the 2026-09-27 rule (a wrong press costs points — D22 나);
 *                                        the old kig:voca:speed_high:<lessonKey> is left as it was and no longer read
 */
import type { CourseProfile } from "@/lib/learning/types";

export const VOCA_SECONDS_PER_WORD = 5;

export const VOCA_LEARNING_PROFILE: CourseProfile = {
  course: "phonics",
  secondsPerKind: { word: VOCA_SECONDS_PER_WORD },
  elementKinds: ["word"],
};

export const vocaItemKey = (lessonId: string, order: number) => `${lessonId}#${order}`;

/** The microphone score that counts a word as said (the same pass mark STUDENT uses). */
export const VOCA_MIC_PASS = 70;

/** The line under the disabled '이 강의 학습 완료' until one Step 2 round is finished (lessonGate — 계획 D02 나). */
export const VOCA_GATE_REASON = "2단계 퀴즈를 한 번 끝까지 풀면 완료할 수 있어요.";

export const leitnerStorageKey = (lessonKey: string) => `kig:voca:leitner:${lessonKey}`;
export const quizStorageKey = (lessonKey: string) => `kig:voca:quiz:${lessonKey}`;
export const speedBestStorageKey = (lessonKey: string) => `kig:voca:speed_high:v2:${lessonKey}`;

/** Step 2 rounds finished on this device; anything unreadable is 0. */
export function parseQuizRecord(raw: string | null): { rounds: number } {
  if (!raw) return { rounds: 0 };
  try {
    const data: unknown = JSON.parse(raw);
    const rounds = data && typeof data === "object" ? (data as { rounds?: unknown }).rounds : null;
    return { rounds: typeof rounds === "number" && Number.isInteger(rounds) && rounds > 0 ? Math.min(rounds, 100_000) : 0 };
  } catch {
    return { rounds: 0 };
  }
}

export function serializeQuizRecord(record: { rounds: number }): string {
  return JSON.stringify({ v: 1, rounds: record.rounds });
}
