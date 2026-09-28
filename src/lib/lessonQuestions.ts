/**
 * 2026-09-28 새 문제 (사장님 "아니 나로 해" — docs/qa-2026-09-18/학습법-화면-0927/새-문제-설계.md): the comprehension questions of
 * a LISTENING lesson (Step 1 블라인드 — after the whole lesson once) and of a READING passage (Step 4 — after reading it again).
 * Both courses show them with one component (src/components/LessonQuestions.tsx), so a question works the same in either.
 *
 * Where they come from: content/questions/<course>/<main id>.json, read on the server for an unlocked lesson only
 * (getLessonQuestions in content.ts) and handed to the view as props, like the lesson itself — never a public file or the
 * JS bundle (the leak rule). A "-1" page gets its main lesson's questions and shares its record.
 * `evidence` numbers the lesson's own lines from 1: LISTENING content/ld_english_scripts.json rows (the view's '문장 n'),
 * READING readingSentences. The writers' `type` and `note` stay in the file for review and are not sent.
 *
 * On this device: one entry per lesson — the option picked for each question (a pick is final until '다시 풀기') and the
 * first pick ever, so a question answered again after '다시 풀기' is not a first try for the learning engine.
 */

export interface LessonQuestion {
  id: string;
  prompt: string;
  options: string[];
  /** 0-based index into `options` */
  answer: number;
  /** 1-based line (LISTENING) or sentence (READING) numbers that prove the answer */
  evidence: number[];
}

export const QUESTION_KIND = "question";
export const OPTION_MARKS = ["①", "②", "③", "④"] as const;

const STORAGE_PREFIX = "kig-questions:";
export const questionsStorageKey = (course: string, mainId: string) => `${STORAGE_PREFIX}${course}/${mainId}`;

export interface QuestionPicks {
  /** question id → the option picked on screen now */
  picks: Record<string, number>;
  /** question id → the first option ever picked (kept through '다시 풀기') */
  first: Record<string, number>;
}

export const emptyPicks = (): QuestionPicks => ({ picks: {}, first: {} });

/** A stored record, kept only for questions this lesson has and options they have — anything else is dropped. */
export function parsePicks(raw: string | null, questions: readonly LessonQuestion[]): QuestionPicks {
  const out = emptyPicks();
  if (!raw) return out;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return out;
  }
  if (!value || typeof value !== "object") return out;
  const byId = new Map(questions.map((q) => [q.id, q.options.length]));
  const keep = (src: unknown, dst: Record<string, number>) => {
    if (!src || typeof src !== "object") return;
    for (const [id, pick] of Object.entries(src as Record<string, unknown>)) {
      const n = byId.get(id);
      if (n !== undefined && Number.isInteger(pick) && (pick as number) >= 0 && (pick as number) < n) dst[id] = pick as number;
    }
  };
  keep((value as { picks?: unknown }).picks, out.picks);
  keep((value as { first?: unknown }).first, out.first);
  return out;
}

export const serializePicks = (record: QuestionPicks) => JSON.stringify({ v: 1, picks: record.picks, first: record.first });

/** The shape check the server applies to a question file (a bad question is left out, never shown half-formed). */
export function toLessonQuestions(value: unknown, lineCount: number): LessonQuestion[] {
  const list = value && typeof value === "object" ? (value as { questions?: unknown }).questions : null;
  if (!Array.isArray(list)) return [];
  const out: LessonQuestion[] = [];
  for (const raw of list) {
    if (!raw || typeof raw !== "object") continue;
    const q = raw as Record<string, unknown>;
    const options = Array.isArray(q.options) ? q.options.filter((o): o is string => typeof o === "string" && o.trim().length > 0) : [];
    const evidence = Array.isArray(q.evidence)
      ? q.evidence.filter((n): n is number => Number.isInteger(n) && (n as number) >= 1 && (lineCount <= 0 || (n as number) <= lineCount))
      : [];
    if (typeof q.id !== "string" || typeof q.prompt !== "string" || !q.prompt.trim()) continue;
    if (options.length !== 4 || new Set(options).size !== 4) continue;
    if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= options.length) continue;
    out.push({ id: q.id, prompt: q.prompt, options, answer: q.answer as number, evidence });
  }
  return out;
}
