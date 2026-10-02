/**
 * STUDENT personal blanks — '내 정보' (2026-09-27 학습법 · 화면 고침, student-verified.md STU-L03 · 계획.md D14 나).
 *
 * This course is a first-person talk, and a bracket in it is a blank for the learner's own information:
 * "I am a 4th grade student at (school name) Elementary School." (AGENTS.md: the brackets in content/lessons/student
 * are blanks, never alternative answers.) The blanks are found in the sentence text at run time — this file holds no
 * lesson text, only lesson ids and sentence indexes, plus the free lesson s1-2's sample name and city:
 *   · a blank is a bracket without a slash — "(sir/ma’am)" is two ways to say it, not a blank (listeningUtils);
 *   · s20-5 #6 "(about 6,400 feet)" is a note, not a blank (NOT_BLANK);
 *   · s1-2 #1 "My name is Hong Gil Dong, and I live in Seoul." — the Korean sample name and city are blanks too
 *     (STU-L03 CHECK ①; EXTRA_BLANKS).
 * That is 20 sentences in 14 lessons. What the learner types is kept on this device only
 * (localStorage 'kig:student:me:v1') and used ONLY for the text shown in Step 3 and for the microphone check: every
 * sound still plays the model sentence, which is the only one with a clip (STU-L03 CHECK ②).
 *
 * One field per blank of a lesson. The same bracket word means different things in different lessons — "(name)" is a
 * best friend in s3-2, a country in s6-3 and famous people in s16-1; "(school name)" is my school in s1-2 and my
 * sister's in s2-5; s4-3 has "(two) brothers and (two) sisters" — so a value is kept per lesson and blank, never
 * shared across lessons by its label.
 */
import { expandSlashAlternatives } from "@/lib/listeningUtils";
import { tokensOf, type FixedRun } from "@/lib/studentDictation";

/** Brackets that are not blanks: lesson id → 0-based sentence indexes. ADULT a10-5 #6 is STUDENT s20-5 #6. */
const NOT_BLANK: Record<string, number[]> = { "s20-5": [5], "a10-5": [5] };

/**
 * Blanks written without brackets: the free lesson s1-2's sample name and city (lesson id → sentence index → blanks).
 * ADULT a1-2 (2026-10-02 — the PPT's 홍길동 · 서울 · 부산 … written in romanization as s1-2 and made '내 정보' blanks, 사장님
 * "STUDENT 1-2 처럼"): the name, the cities, the school, the year and the age. A word written twice in a sentence ("Hong",
 * "Busan") takes the next place not already a blank.
 */
const EXTRA_BLANKS: Record<string, Record<number, { text: string; label: string }[]>> = {
  "s1-2": {
    0: [
      { text: "Hong Gil Dong", label: "내 이름" },
      { text: "Seoul", label: "사는 곳" },
    ],
  },
  "a1-2": {
    0: [
      { text: "Hong Gil Dong", label: "내 이름" },
      { text: "Hong", label: "내 성" },
    ],
    1: [
      { text: "Seoul", label: "태어난 곳" },
      { text: "Busan", label: "사는 곳" },
    ],
    2: [{ text: "Busan", label: "아파트 이름" }],
    3: [
      { text: "Busan Women's High School", label: "졸업한 고등학교" },
      { text: "1980", label: "졸업한 해" },
      { text: "Busan", label: "고등학교가 있는 곳" },
    ],
    5: [{ text: "Hanguk", label: "대학교 이름" }],
    6: [{ text: "40", label: "나이" }],
  },
};

export interface Blank {
  /** "<lesson id>#<sentence n>:<k>" — where the learner's value is kept */
  key: string;
  /** character range in the sentence */
  start: number;
  end: number;
  /** what the sentence says there: "(school name)" · "Hong Gil Dong" */
  text: string;
  /** the words inside: "school name" — or a Korean name for a blank without brackets */
  label: string;
}

const BRACKET = /\(([^()]*)\)/g;

/** The blanks of one sentence, in reading order. */
export function blanksOf(lessonId: string, sentenceIndex: number, text: string): Blank[] {
  const found: Omit<Blank, "key">[] = [];
  if (!(NOT_BLANK[lessonId] ?? []).includes(sentenceIndex)) {
    for (const m of text.matchAll(BRACKET)) {
      const inner = m[1].trim();
      if (!inner || inner.includes("/")) continue;
      const start = m.index ?? 0;
      found.push({ start, end: start + m[0].length, text: m[0], label: inner });
    }
  }
  for (const extra of EXTRA_BLANKS[lessonId]?.[sentenceIndex] ?? []) {
    const overlaps = (at: number) => found.some((b) => at < b.end && b.start < at + extra.text.length);
    let at = text.indexOf(extra.text);
    while (at >= 0 && overlaps(at)) at = text.indexOf(extra.text, at + 1);
    if (at >= 0) {
      found.push({ start: at, end: at + extra.text.length, text: extra.text, label: extra.label });
    }
  }
  return found
    .sort((a, b) => a.start - b.start)
    .map((b, k) => ({ ...b, key: `${lessonId}#${sentenceIndex + 1}:${k}` }));
}

export type Segment = { text: string } | { blank: Blank };

/** The sentence cut at its blanks, for drawing the blanks as chips. */
export function segmentsOf(text: string, blanks: readonly Blank[]): Segment[] {
  const out: Segment[] = [];
  let at = 0;
  for (const blank of blanks) {
    if (blank.start > at) out.push({ text: text.slice(at, blank.start) });
    out.push({ blank });
    at = blank.end;
  }
  if (at < text.length) out.push({ text: text.slice(at) });
  return out;
}

/** The sentence with each blank replaced (from the end, so earlier ranges stay put). */
function replaceBlanks(text: string, blanks: readonly Blank[], by: (blank: Blank, k: number) => string): string {
  let out = text;
  for (let k = blanks.length - 1; k >= 0; k--) out = out.slice(0, blanks[k].start) + by(blanks[k], k) + out.slice(blanks[k].end);
  return out;
}

/** A value usable in the English check: Latin letters, digits and word punctuation only. */
export function usableValue(value: string | undefined): string | null {
  const v = (value ?? "").replace(/\s+/g, " ").trim();
  if (!v || v.length > 40 || !/^[A-Za-z0-9 '’.\-]+$/.test(v)) return null;
  return v;
}

/**
 * What the microphone check accepts (VoiceSpeakingTester targetTexts): every slash form of the sentence with each blank
 * as a [[label]] slot (any 1–4 spoken words — the scorer's slot) and, when the learner has typed their own words,
 * also with those words. The best-scoring form is the one shown.
 */
export function micTargets(text: string, blanks: readonly Blank[], values: Readonly<Record<string, string>>): string[] {
  if (!blanks.length) return expandSlashAlternatives(text);
  // the slot is named by the sentence's own words ("school name", "Hong Gil Dong"), never by a Korean label
  const slot = (b: Blank) => `[[${b.text.replace(/^\(|\)$/g, "").replace(/[[\]]/g, "").trim()}]]`;
  const withSlots = expandSlashAlternatives(replaceBlanks(text, blanks, slot));
  const typed = blanks.some((b) => usableValue(values[b.key]));
  if (!typed) return withSlots;
  const withValues = expandSlashAlternatives(replaceBlanks(text, blanks, (b) => usableValue(values[b.key]) ?? slot(b)));
  return Array.from(new Set([...withValues, ...withSlots]));
}

/**
 * The word positions of each blank in the tile drill (studentDictation FixedRun), found by putting a one-word marker
 * where each blank is and expanding the slash forms around it. Null when any form disagrees — the drill then treats the
 * blank's words as ordinary tiles rather than guess.
 */
export function fixedRunsOf(text: string, blanks: readonly Blank[]): { run: FixedRun; words: string[] }[] | null {
  if (!blanks.length) return [];
  const marker = (k: number) => `zqblank${String.fromCharCode(97 + k)}q`;
  const marked = replaceBlanks(text, blanks, (_b, k) => marker(k));
  const blankWords = blanks.map((b) => tokensOf(b.text).map((t) => t.word));
  let runs: { run: FixedRun; words: string[] }[] | null = null;
  for (const form of expandSlashAlternatives(marked)) {
    const here: { run: FixedRun; words: string[] }[] = [];
    let pos = 0;
    for (const t of tokensOf(form)) {
      const k = blanks.findIndex((_b, i) => t.word === marker(i));
      if (k >= 0) {
        here.push({ run: { start: pos, length: blankWords[k].length, text: blanks[k].text }, words: blankWords[k] });
        pos += blankWords[k].length;
      } else pos += 1;
    }
    if (here.length !== blanks.length) return null;
    if (runs && runs.some((r, i) => r.run.start !== here[i].run.start)) return null;
    runs = here;
  }
  return runs ?? [];
}

// ---------------------------------------------------------------------------------------------------------------
// The learner's values — this device only
// ---------------------------------------------------------------------------------------------------------------

export const MY_INFO_KEY = "kig:student:me:v1";

export function readMyInfo(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(MY_INFO_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    const values = data && typeof data === "object" ? (data as { values?: unknown }).values : null;
    if (!values || typeof values !== "object") return {};
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(values as Record<string, unknown>)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return {};
  }
}

export function writeMyInfo(values: Record<string, string>): void {
  try {
    const kept = Object.fromEntries(Object.entries(values).filter(([, v]) => v.trim()));
    window.localStorage.setItem(MY_INFO_KEY, JSON.stringify({ v: 1, values: kept }));
  } catch {
    // storage unavailable — the values last for this visit only
  }
}
