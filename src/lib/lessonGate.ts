/**
 * When a lesson may be marked complete (2026-09-27 — 계획.md D02 나: "STUDENT처럼 가벼운 조건 … VOCA 퀴즈 1번을 해야 켜짐").
 *
 * A course view registers a gate for its lesson; LessonEndBar reads it (useSyncExternalStore) and, while the gate is not ready,
 * disables '이 강의 학습 완료' with the gate's reason as one line under it. A lesson already completed stays toggleable, so '완료
 * 취소' always works. With no gate registered, LessonEndBar is exactly as before — the courses that do not register one
 * (GRAMMAR · LISTENING · READING until their own turn) complete at any time, as they always did.
 *
 * VOCA registers { ready: a Step 2 round was finished (or the lesson was completed), reason: VOCA_GATE_REASON }.
 * In memory only — the view knows its own conditions from its own storage and sets the gate again on every visit.
 *
 * 2026-10-07 (UI검토-1007 결과.md 2장 1번 · 5번): STUDENT · ADULT register { ready: 80% dictated and 80% spoken (or completed
 * here) } — their completion moved from their own box to the end bar, which keeps the button off until their gate is set (those
 * two courses only: no gate there means the record is not read yet). GRAMMAR I · II register { ready: one Step 1 item checked }
 * (사장님 결정 — 9/27 D02 나). Every course with a gate now: VOCA · LISTENING · READING · GRAMMAR I · II · STUDENT · ADULT · PASS-OFF.
 *
 * 2026-09-28 (PASS-OFF GRAMMAR, merged with main): `undo: false` — a completed lesson shows '학습 완료함' as a status, with no
 * '취소'. PASS-OFF's server progress takes completions only (docs/pass-off-grammar/설계.md §5 — "학습자 화면에 취소가 없고"), so
 * an undo here would clear this device's mark while the course list and the topic lock still count the lesson. Absent → the
 * toggle of every other course, unchanged.
 *
 * 2026-09-28 (PASS-OFF 단계 2-나 E2 수정): `quietNext: true` — the next lesson is not the page's main action, so the end bar
 * draws '다음 강의' with a border instead of filled even after completion (docs/디자인-규칙.md §1-2: one filled button). PASS-OFF
 * sets it on a topic's last lesson while its "구성도 다시 채우기" is what opens the next topic. Absent → as before.
 */
export interface LessonGate {
  ready: boolean;
  /** one short line, shown under the disabled button */
  reason: string;
  /** false: a completed lesson cannot be un-completed from the end bar (PASS-OFF GRAMMAR). Absent or true → as before. */
  undo?: boolean;
  /** true: '다음 강의' stays a bordered link — the course view has the page's main action (PASS-OFF GRAMMAR). Absent → as before. */
  quietNext?: boolean;
}

const gates = new Map<string, LessonGate>();
const listeners = new Set<() => void>();
const keyOf = (course: string, lessonId: string) => `${course}:${lessonId}`;

function emit() {
  for (const listener of [...listeners]) listener();
}

export function setLessonGate(course: string, lessonId: string, gate: LessonGate): void {
  const key = keyOf(course, lessonId);
  const prev = gates.get(key);
  if (prev && prev.ready === gate.ready && prev.reason === gate.reason && prev.undo === gate.undo && prev.quietNext === gate.quietNext) return;
  gates.set(key, {
    ready: gate.ready,
    reason: gate.reason,
    ...(gate.undo === undefined ? {} : { undo: gate.undo }),
    ...(gate.quietNext === undefined ? {} : { quietNext: gate.quietNext }),
  });
  emit();
}

export function clearLessonGate(course: string, lessonId: string): void {
  if (gates.delete(keyOf(course, lessonId))) emit();
}

export function subscribeLessonGate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The same object until the gate changes (useSyncExternalStore needs a stable snapshot); null when no view registered one. */
export function getLessonGate(course: string, lessonId: string): LessonGate | null {
  return gates.get(keyOf(course, lessonId)) ?? null;
}
