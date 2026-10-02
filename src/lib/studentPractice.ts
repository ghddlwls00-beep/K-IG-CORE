/**
 * STUDENT practice on this device and the lesson's completion rule (2026-09-27 학습법 · 화면 고침 — 계획.md D18 나 ·
 * student-verified.md STU-L11 · STU-L15 · STU-U26).
 *
 * Kept per lesson in localStorage `kig:student:practice:<lessonKey>` (FUN-01). The two maps that were there before —
 * `solved` (Step 2) and `completed` (Step 3) — keep their names, keys (0-based sentence index) and values exactly, so
 * an old save opens with the same counts. The new fields are optional and an old save simply has none:
 *   hinted  Step 2 finished with hints for more than a third of the words — '힌트로 완성', not counted as solved
 *   hints   the hints used in the sentence's last finished Step 2 attempt
 *   heard   Step 1: the sentence was heard to the end once — its '보기' is open (D17)
 *   mic     the best microphone score of the sentence (Step 3)
 *   v       2
 *
 * Completion (D18 나): 80% of the sentences (rounded up) solved in Step 2 AND 80% spoken in Step 3 (microphone ≥ 70 or
 * '읽었어요'). A lesson without sentences can always be completed, and one this screen has seen completed stays
 * completable after '완료 취소' (STU-U26).
 */
import type { CourseProfile } from "@/lib/learning/types";

/** What STUDENT tells the common learning engine (공통-학습-엔진.md §5: 20 seconds a sentence in review). */
export const STUDENT_LEARNING_PROFILE: CourseProfile = {
  course: "student",
  secondsPerKind: { sentence: 20 },
  elementKinds: [],
};

/**
 * ADULT (2026-10-02) — taught by the same view and rules as STUDENT; its own name for the learning engine, so ADULT's
 * sentences are reviewed as ADULT's (kig-learning:adult), never mixed into STUDENT's.
 */
export const ADULT_LEARNING_PROFILE: CourseProfile = {
  course: "adult",
  secondsPerKind: { sentence: 20 },
  elementKinds: [],
};

/** The microphone score that counts a sentence as spoken (STUDENT's pass mark). */
export const STUDENT_MIC_PASS = 70;

export interface StudentPractice {
  solved: Record<number, boolean>;
  completed: Record<number, boolean>;
  hinted: Record<number, boolean>;
  hints: Record<number, number>;
  heard: Record<number, boolean>;
  mic: Record<number, number>;
}

export const emptyPractice = (): StudentPractice => ({ solved: {}, completed: {}, hinted: {}, hints: {}, heard: {}, mic: {} });

export const practiceStorageKey = (lessonKey: string) => `kig:student:practice:${lessonKey}`;

function boolMap(value: unknown): Record<number, boolean> {
  if (!value || typeof value !== "object") return {};
  const out: Record<number, boolean> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "boolean") out[Number(k)] = v;
  return out;
}

function numberMap(value: unknown): Record<number, number> {
  if (!value || typeof value !== "object") return {};
  const out: Record<number, number> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) if (typeof v === "number" && Number.isFinite(v)) out[Number(k)] = v;
  return out;
}

/** Reads a save of any version; anything unreadable is an empty record. */
export function parsePractice(raw: string | null): StudentPractice {
  if (!raw) return emptyPractice();
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object") return emptyPractice();
    const d = data as Record<string, unknown>;
    return {
      solved: boolMap(d.solved),
      completed: boolMap(d.completed),
      hinted: boolMap(d.hinted),
      hints: numberMap(d.hints),
      heard: boolMap(d.heard),
      mic: numberMap(d.mic),
    };
  } catch {
    return emptyPractice();
  }
}

export function serializePractice(p: StudentPractice): string {
  return JSON.stringify({ v: 2, solved: p.solved, completed: p.completed, hinted: p.hinted, hints: p.hints, heard: p.heard, mic: p.mic });
}

export const countTrue = (map: Record<number, boolean>) => Object.values(map).filter(Boolean).length;

/** 80% of the sentences, rounded up (integer arithmetic — no 0.8 × n rounding surprises). */
export function requiredCount(total: number): number {
  return total <= 0 ? 0 : Math.ceil((total * 4) / 5);
}

export function canCompleteLesson({
  total,
  solved,
  spoken,
  completedHere,
}: {
  total: number;
  solved: number;
  spoken: number;
  /** completed now, or seen completed on this screen (STU-U26) */
  completedHere: boolean;
}): boolean {
  if (completedHere || total === 0) return true;
  const need = requiredCount(total);
  return solved >= need && spoken >= need;
}
