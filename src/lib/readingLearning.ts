/**
 * READING for the common learning engine and this device (2026-09-27 — READING 학습법 · 화면 고침; docs/pass-off-grammar/
 * 공통-학습-엔진.md §5 "READING · pr001#k5 · '몰라요' 낱말(D32) · 틀린 빈칸 · 요소 2 · 6초").
 *
 * ENGINE ITEM. One KEY WORD of a lesson (readingVocabulary — 14 per lesson), keyed `<lesson id>#k<n>`:
 *   n           the word's 1-based place in the lesson's vocabulary list (the order Step 2 lists the words);
 *   lesson id   the MAIN page's id — "pr001" also on its "-1" page (pr001-1): the two pages carry the same passage and the
 *               same 14 words (checked 256/256), so a word is one item whichever page it was met on.
 * A word is an ELEMENT item (passes on 2 different days), about 6 seconds each in review. The view reports:
 *   recordAttempt  every blank answered in Step 3 (mode tap) and every '알아요 / 몰라요' in Step 2 — a self-report:
 *                  '알아요' correct true, '몰라요' correct false, help 'none', mode 'tap' (where 'lesson' — never a pass);
 *   markLessonDone when the learner completes the lesson (LESSON_COMPLETE_EVENT): the words marked '몰라요' and the words of
 *                  blanks answered wrong on this device come back from the next day (kind 'word').
 * The review screen itself comes with the engine's shared page (설계 세션).
 *
 * THIS DEVICE (localStorage). What changed on 2026-09-27, and what is kept:
 *   kig:reading:speed:v1:reading/<main id>   NEW {"v":1,"first":{wpm,ms,at}|null,"again":{wpm,ms,at}|null} — Step 1 '첫 읽기'
 *                                            and Step 4 '같은 글 다시 읽기' (the latest of each; only runs of ≤ 500 WPM)
 *   kig:reading:words:v1:reading/<main id>   NEW {"v":1,"marks":{"<n>":"known"|"unknown"},"missed":[n,…]} — Step 2 marks and
 *                                            the words of blanks answered wrong
 *   kig:reading:prefs:v1                     NEW {"v":1,"size":"normal"|"large"|"xlarge","numbers":true|false} — the 'Aa'
 *                                            menu, for every READING lesson
 *   kig:reading:notes:<page key>             KEPT as it was ({"notes","at"}, per page) — the memo, now folded at the end of Step 4
 *   kig:reading:wpm:<page key>               KEPT, read only: the old best WPM. It is no longer shown or written; a value of
 *                                            1–500 still counts as "read once" for the completion gate (an old value above
 *                                            500 was a mis-press under the old 1,000 ceiling and does not count)
 *   kig-learning:reading                     the common engine's record (src/lib/learning/record.ts)
 */
import type { CourseProfile } from "@/lib/learning/types";

export const READING_SECONDS_PER_WORD = 6;

export const READING_LEARNING_PROFILE: CourseProfile = {
  course: "reading",
  secondsPerKind: { word: READING_SECONDS_PER_WORD },
  elementKinds: ["word"],
};

/** "pr001-1" → "pr001": the page a "-1" page belongs to (the same passage and words). */
export const readingMainId = (pageId: string) => String(pageId || "").replace(/-\d+$/, "");

export const readingItemKey = (mainId: string, order: number) => `${mainId}#k${order}`;

// ---------------------------------------------------------------------------------------------------------------------
// Reading speed (계획 G01 · D31 나 · RD-L04)
// ---------------------------------------------------------------------------------------------------------------------

/** The target shown on screen (1분에 180단어) — the one line under a result compares with it (RD-L04 ②). */
export const READING_TARGET_WPM = 180;

/**
 * Faster than this is not reading with understanding (RD-L04 CHECK ⑥ — the old ceiling of 1,000 let a 6-second press on an
 * 89-word passage be saved as 890 WPM '최상위'): the run is explained and not saved.
 */
export const READING_MAX_WPM = 500;

/** Words per minute for `words` read in `ms` milliseconds (0 when nothing was timed). */
export function wordsPerMinute(words: number, ms: number): number {
  if (!(words > 0) || !(ms > 0)) return 0;
  return Math.round((words * 60000) / ms);
}

/**
 * The five one-sentence passages (pr127 · pr131 · pr132 · pr133 · pr171 — 24 to 33 words) show only the time: a speed per
 * minute over a few seconds says little (RD-L04 CHECK ③ names these five; pr133 has 33 words, so the rule is "one
 * sentence", which is exactly those five).
 */
export const isTimeOnlyPassage = (sentenceCount: number) => sentenceCount <= 1;

/** The time the target speed would take for this passage, in ms. */
export const targetMs = (words: number) => Math.round((words * 60000) / READING_TARGET_WPM);

/** How a result compares with the target: within 10% is 'near'. */
export function targetVerdict(wpm: number): "slower" | "near" | "faster" {
  if (wpm > READING_TARGET_WPM * 1.1) return "faster";
  if (wpm < READING_TARGET_WPM * 0.9) return "slower";
  return "near";
}

/**
 * The clock of a timed reading (G01 — "performance.now로 재고, 화면이 가려지면 멈춥니다"): ms counted so far, and while the page is
 * hidden the clock stands still. Pure, so check-reading-learning.cjs can prove that 5 hidden seconds are not counted (the audit
 * browser's harness keeps every page "visible", so the browser drivers cannot).
 */
export interface ReadingClockState {
  /** ms counted before the last pause */
  counted: number;
  /** the time (performance.now) the clock last (re)started; null while the page is hidden */
  startedAt: number | null;
  hiddenAt: number | null;
  /** ms the page was hidden — not counted */
  hiddenMs: number;
}

export const clockStart = (now: number): ReadingClockState => ({ counted: 0, startedAt: now, hiddenAt: null, hiddenMs: 0 });

export function clockHide(clock: ReadingClockState, now: number): void {
  if (clock.startedAt === null) return;
  clock.counted += now - clock.startedAt;
  clock.startedAt = null;
  clock.hiddenAt = now;
}

export function clockShow(clock: ReadingClockState, now: number): void {
  if (clock.startedAt !== null) return;
  clock.hiddenMs += now - (clock.hiddenAt ?? now);
  clock.hiddenAt = null;
  clock.startedAt = now;
}

export const clockElapsed = (clock: ReadingClockState, now: number) => clock.counted + (clock.startedAt !== null ? now - clock.startedAt : 0);

/** "8.4초" under a minute, "1분 12초" from a minute. */
export function formatDuration(ms: number): string {
  const seconds = Math.max(0, ms) / 1000;
  if (seconds < 60) return `${(Math.round(seconds * 10) / 10).toFixed(1)}초`;
  const whole = Math.round(seconds);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

/** "25초" · "1분 5초" — a target, in whole seconds (it is shown after "약"). */
export function formatApprox(ms: number): string {
  const whole = Math.max(1, Math.round(Math.max(0, ms) / 1000));
  if (whole < 60) return `${whole}초`;
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return s ? `${m}분 ${s}초` : `${m}분`;
}

/** "0:07" — the clock while a reading is timed. */
export function formatClock(ms: number): string {
  const whole = Math.floor(Math.max(0, ms) / 1000);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

export interface SpeedRun {
  wpm: number;
  ms: number;
  at: string;
}

export interface SpeedRecord {
  first: SpeedRun | null;
  again: SpeedRun | null;
}

const runOf = (value: unknown): SpeedRun | null => {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<SpeedRun>;
  if (typeof v.wpm !== "number" || typeof v.ms !== "number" || !Number.isFinite(v.wpm) || !Number.isFinite(v.ms)) return null;
  if (v.wpm <= 0 || v.wpm > READING_MAX_WPM || v.ms <= 0) return null;
  return { wpm: Math.round(v.wpm), ms: Math.round(v.ms), at: typeof v.at === "string" ? v.at.slice(0, 40) : "" };
};

export function parseSpeedRecord(raw: string | null): SpeedRecord {
  if (!raw) return { first: null, again: null };
  try {
    const data = JSON.parse(raw) as { v?: unknown; first?: unknown; again?: unknown };
    if (!data || typeof data !== "object" || data.v !== 1) return { first: null, again: null };
    return { first: runOf(data.first), again: runOf(data.again) };
  } catch {
    return { first: null, again: null };
  }
}

export const serializeSpeedRecord = (record: SpeedRecord) => JSON.stringify({ v: 1, first: record.first, again: record.again });

/** An old best WPM (kig:reading:wpm:<page key>, written before 2026-09-27) that shows the passage was read once. */
export function legacyBestCounts(raw: string | null): boolean {
  if (!raw) return false;
  const value = Number.parseInt(raw, 10);
  return Number.isFinite(value) && value > 0 && value <= READING_MAX_WPM;
}

export const speedStorageKey = (mainId: string) => `kig:reading:speed:v1:reading/${mainId}`;
export const legacyWpmStorageKey = (pageKey: string) => `kig:reading:wpm:${pageKey}`;

// ---------------------------------------------------------------------------------------------------------------------
// Step 2 marks and missed blanks (D32 · RD-L05)
// ---------------------------------------------------------------------------------------------------------------------

export type WordMark = "known" | "unknown";

export interface WordsRecord {
  marks: Record<number, WordMark>;
  missed: number[];
}

export function parseWordsRecord(raw: string | null, wordCount: number): WordsRecord {
  const empty: WordsRecord = { marks: {}, missed: [] };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw) as { v?: unknown; marks?: unknown; missed?: unknown };
    if (!data || typeof data !== "object" || data.v !== 1) return empty;
    const inRange = (n: number) => Number.isInteger(n) && n >= 1 && n <= wordCount;
    const marks: Record<number, WordMark> = {};
    if (data.marks && typeof data.marks === "object") {
      for (const [key, value] of Object.entries(data.marks as Record<string, unknown>)) {
        const n = Number(key);
        if (inRange(n) && (value === "known" || value === "unknown")) marks[n] = value;
      }
    }
    const missed = Array.isArray(data.missed) ? [...new Set(data.missed.map(Number).filter(inRange))].sort((a, b) => a - b) : [];
    return { marks, missed };
  } catch {
    return empty;
  }
}

export const serializeWordsRecord = (record: WordsRecord) =>
  JSON.stringify({ v: 1, marks: record.marks, missed: [...new Set(record.missed)].sort((a, b) => a - b) });

export const wordsStorageKey = (mainId: string) => `kig:reading:words:v1:reading/${mainId}`;

/** What comes back from tomorrow when the lesson is completed: the '몰라요' words and the words of missed blanks. */
export function reviewEntries(mainId: string, record: WordsRecord): { key: string; kind: string }[] {
  const orders = new Set<number>(record.missed);
  for (const [key, mark] of Object.entries(record.marks)) if (mark === "unknown") orders.add(Number(key));
  return [...orders].sort((a, b) => a - b).map((n) => ({ key: readingItemKey(mainId, n), kind: "word" }));
}

// ---------------------------------------------------------------------------------------------------------------------
// The 'Aa' menu (RD-U07 — remembered, for every lesson)
// ---------------------------------------------------------------------------------------------------------------------

export type PassageSize = "normal" | "large" | "xlarge";

export interface ReadingPrefs {
  size: PassageSize;
  numbers: boolean;
}

export const PREFS_STORAGE_KEY = "kig:reading:prefs:v1";

export function parsePrefs(raw: string | null): ReadingPrefs {
  const fallback: ReadingPrefs = { size: "normal", numbers: true };
  if (!raw) return fallback;
  try {
    const data = JSON.parse(raw) as { v?: unknown; size?: unknown; numbers?: unknown };
    if (!data || typeof data !== "object" || data.v !== 1) return fallback;
    return {
      size: data.size === "large" || data.size === "xlarge" ? data.size : "normal",
      numbers: data.numbers !== false,
    };
  } catch {
    return fallback;
  }
}

export const serializePrefs = (prefs: ReadingPrefs) => JSON.stringify({ v: 1, size: prefs.size, numbers: prefs.numbers });

// ---------------------------------------------------------------------------------------------------------------------
// Completion (계획 D02 나)
// ---------------------------------------------------------------------------------------------------------------------

/** The line under the disabled '이 강의 학습 완료' until the passage was read and timed once (lessonGate). */
export const READING_GATE_REASON = "1단계에서 지문을 한 번 읽고 '다 읽었어요'를 누르면 완료할 수 있어요.";

/** Part-of-speech abbreviations of the vocabulary data as Korean words (the old coloured chips showed "n." "v." …). */
export function posLabel(pos: string | undefined): string {
  const key = String(pos || "").trim().toLowerCase();
  const names: Record<string, string> = {
    "n.": "명사",
    "v.": "동사",
    "adj.": "형용사",
    "adv.": "부사",
    "prep.": "전치사",
    "pron.": "대명사",
    "conj.": "접속사",
  };
  return names[key] ?? key;
}
