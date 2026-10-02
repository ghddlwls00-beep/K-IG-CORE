/**
 * STUDENT Step 2 (탭 딕테이션) — the rules of the tile drill, kept out of the view so node can check them over all
 * 414 sentences (2026-09-27 학습법 · 화면 고침, docs/qa-2026-09-18/학습법-화면-0927/student-verified.md · 계획.md D02 · D16).
 *
 * The JUDGE does not change: a finished sentence is right exactly when listeningUtils.verifyAnyWordSequence says so,
 * against generateWordBank's acceptedWordSequences (every "He/She" · "sir/ma'am" form). What this file adds:
 *   · two parts (D16): a sentence of 16 words or more is assembled in two goes — up to a comma / a sentence break, or
 *     before a clause word, near the middle; both parts at least 5 words; the same word index in every accepted form,
 *     else the sentence stays whole. The sound stays the one whole-sentence clip.
 *   · fixed words (STU-L03): a personal blank ("(school name)") is placed by the app, not assembled from tiles.
 *   · the bank per part: the words of every accepted form (as many copies as the form that needs most, like
 *     generateWordBank) and generateWordBank's distractors taken ONLY from `pool` — the lesson's other sentences
 *     (STU-L05 ③) — never from its fixed list; a split sentence gets one per part.
 *   · the first word in lower case (STU-L05 ④): except I · I'm, a Korean word (KOREAN_WORD_SOUNDS) and the course's
 *     proper nouns — words written with a capital in the middle of a sentence somewhere in the course, plus the one the
 *     rule misses — which the SERVER works out (src/lib/studentCourseText.ts): this file ships to the browser and holds
 *     no word of any lesson (publicly served files carry zero paid lesson content).
 *   · where the answer first goes wrong, and a hint that first takes back the tiles from there (STU-L05 ① ② · STU-U22).
 */
import { expandSlashAlternatives, generateWordBank, verifyAnyWordSequence } from "@/lib/listeningUtils";
import { KOREAN_WORD_SOUNDS } from "@/lib/lessonSpeechForm";

/**
 * The dictation tokens — the same pattern as listeningUtils' DICTATION_TOKEN (a clock time, a number with thousands
 * separators and a.m./p.m. are one word each). Kept in step by the check, not by trust: tokensMatchBank() compares
 * these tokens with generateWordBank's own words and a sentence whose tokens differ is simply not split (and
 * docs/qa-2026-09-18/scripts/check-student-dictation.cjs fails loudly).
 */
// 가-힣: a Korean word written in Hangul inside the English (2026-10-02 — "The 신라 Kingdom …") is a tile of its own; without it
// the word vanished from the tiles and from the answer alike (사장님이 운영에서 찾음 — 'Kingdom 으로 시작해야 하는데 신라 블록이 없는데')
const TOKEN = /\d{1,2}:\d{2}|\d{1,3}(?:,\d{3})+|[AaPp]\.[Mm]\.|[a-zA-Z0-9'’\-가-힣]+/g;

export interface Token {
  word: string;
  start: number;
  end: number;
}

export function tokensOf(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(TOKEN)) {
    const word = m[0].trim();
    if (word) out.push({ word, start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

const lower = (w: string) => w.toLowerCase();
const sameWord = (a: string, b: string) => lower(a) === lower(b);

// ---------------------------------------------------------------------------------------------------------------
// The first word in lower case (STU-L05 ④)
// ---------------------------------------------------------------------------------------------------------------

/** Every word of the Korean words the app says in Korean ("Hong Gil Dong" → Hong · Gil · Dong). */
const KOREAN_WORDS = new Set(Object.keys(KOREAN_WORD_SOUNDS).flatMap((k) => k.split(/\s+/)));
/** Abbreviations whose full stop does not end a sentence. */
const TITLE_BEFORE = /\b(?:Mr|Mrs|Ms|Dr|Mt|St)\.$/;

/**
 * The words written with a capital in the MIDDLE of a sentence anywhere in `texts` — proper nouns (Admiral, Silla,
 * Koreans, Mt …). A word right after a sentence break or an opening quote ("My mom replies, “How was your day?”")
 * starts a sentence and is not counted.
 */
export function midSentenceCapitals(texts: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const text of texts) {
    for (const form of expandSlashAlternatives(text)) {
      const toks = tokensOf(form);
      for (let k = 1; k < toks.length; k++) {
        const w = toks[k].word;
        if (!/^[A-Z]/.test(w)) continue;
        const before = form.slice(0, toks[k].start);
        const gap = form.slice(toks[k - 1].end, toks[k].start);
        if (/[“"‘]\s*$/.test(gap)) continue; // an opening quote starts a sentence
        if (/[.!?]/.test(gap) && !TITLE_BEFORE.test(before.trimEnd())) continue; // a new sentence
        out.add(w);
      }
    }
  }
  return out;
}

/**
 * Does this word keep its capital as the FIRST tile of a sentence? `capitals` is the course's proper nouns — worked out
 * on the server over the whole course (src/lib/studentCourseText.ts, which also adds the one word the rule misses,
 * STU-L05 CHECK). This file ships to the browser, so it holds no word of any lesson.
 */
export function keepsCapital(word: string, capitals: ReadonlySet<string>): boolean {
  if (/^I(?:['’](?:m|ve|ll|d))?$/.test(word)) return true;
  if (!/^[A-Z][a-z'’\-]*$/.test(word)) return true; // not "Capital + lower case" (TV, 2,000): shown as written
  return KOREAN_WORDS.has(word) || capitals.has(word);
}

/** For each sentence: does its first word keep its capital on the tile? */
export function firstWordKeepsCase(texts: readonly string[], capitals: ReadonlySet<string>): boolean[] {
  return texts.map((text) => {
    const forms = expandSlashAlternatives(text);
    // every form's first word must keep it ("He/She …" → he · she both lower case)
    return forms.every((form) => {
      const first = tokensOf(form)[0];
      return !first || keepsCapital(first.word, capitals);
    });
  });
}

/** The word as a tile shows it: a sentence's first word in lower case unless it keeps its capital. */
export function tileLabel(word: string, isFirst: boolean, keepCase: boolean): string {
  if (!isFirst || keepCase || !/^[A-Z][a-z'’\-]*$/.test(word)) return word;
  return word.charAt(0).toLowerCase() + word.slice(1);
}

// ---------------------------------------------------------------------------------------------------------------
// Two parts (D16)
// ---------------------------------------------------------------------------------------------------------------

export const SPLIT_MIN_WORDS = 16;
export const PART_MIN_WORDS = 5;
/**
 * A clause starts before these words. A split there costs this many words of distance from the middle — a comma or a
 * sentence break costs 0, so it wins when it is about as central. "and" / "or" cost more: they join nouns as often as
 * clauses ("history books and novels").
 */
const CLAUSE_WORDS = new Map<string, number>([
  ...["but", "so", "because", "when", "while", "if", "although", "though", "since", "after", "before", "until", "unless",
    "where", "which", "who", "that", "what", "how", "why", "as"].map((w) => [w, 2] as [string, number]),
  ["and", 3],
  ["or", 3],
]);
/** Never split right after these: "so | that", "even | though", "such | as", "and | that" belong together. */
const KEEP_WITH_NEXT = new Set(["so", "such", "even", "as", "in", "and", "or", "but", "than", "rather"]);
/**
 * Last resort, only when a sentence has no comma and no clause word to split at: before a subject pronoun that follows
 * a content word ("By working hard and sticking to his plan | he was able to …").
 */
const SUBJECT_PRONOUNS = new Set(["he", "she", "i", "we", "they", "you"]);
const NOT_BEFORE_SUBJECT = new Set(["to", "of", "for", "with", "at", "on", "in", "from", "about", "by", "than", "like", "into", "the", "a", "an"]);

/** The word index where part 2 starts, or null when the sentence stays whole. */
export function splitIndex(text: string, accepted: readonly string[][]): number | null {
  const n = accepted[0]?.length ?? 0;
  if (n < SPLIT_MIN_WORDS) return null;
  const forms = expandSlashAlternatives(text);
  if (forms.length !== accepted.length) return null;
  const candidates: Map<number, number>[] = [];
  const fallbacks: Set<number>[] = [];
  for (let j = 0; j < forms.length; j++) {
    const toks = tokensOf(forms[j]);
    const seq = accepted[j];
    if (toks.length !== seq.length || toks.some((t, i) => t.word !== seq[i])) return null;
    const c = new Map<number, number>();
    const f = new Set<number>();
    for (let k = PART_MIN_WORDS; k <= toks.length - PART_MIN_WORDS; k++) {
      const gap = forms[j].slice(toks[k - 1].end, toks[k].start);
      const before = forms[j].slice(0, toks[k].start).trimEnd();
      const word = lower(toks[k].word);
      const prev = lower(toks[k - 1].word);
      if (/[,;:]/.test(gap) || (/[.!?]/.test(gap) && !TITLE_BEFORE.test(before))) c.set(k, 0);
      else if (CLAUSE_WORDS.has(word) && !KEEP_WITH_NEXT.has(prev)) c.set(k, CLAUSE_WORDS.get(word) ?? 2);
      else if (SUBJECT_PRONOUNS.has(word) && !CLAUSE_WORDS.has(prev) && !KEEP_WITH_NEXT.has(prev) && !NOT_BEFORE_SUBJECT.has(prev)) f.add(k);
    }
    candidates.push(c);
    fallbacks.push(f);
  }
  const pick = (keys: Iterable<number>, cost: (k: number) => number) => {
    let best: { k: number; score: number; cost: number } | null = null;
    for (const k of keys) {
      const c = cost(k);
      const score = Math.abs(k - n / 2) + c;
      // nearer the middle wins; on a tie the cheaper kind (a comma before a clause word), then the earlier place
      if (!best || score < best.score || (score === best.score && c < best.cost)) best = { k, score, cost: c };
    }
    return best ? best.k : null;
  };
  // the same word index in every accepted form
  const shared = [...candidates[0].keys()].filter((k) => candidates.every((c) => c.has(k)));
  const main = pick(shared, (k) => Math.max(...candidates.map((c) => c.get(k) ?? 0)));
  if (main !== null) return main;
  return pick([...fallbacks[0]].filter((k) => fallbacks.every((f) => f.has(k))), () => 0);
}

// ---------------------------------------------------------------------------------------------------------------
// The drill model
// ---------------------------------------------------------------------------------------------------------------

export interface DictTile {
  id: string;
  /** the word the answer is judged with */
  word: string;
  /** what the tile shows (the first word in lower case) */
  label: string;
}

export interface DictPart {
  /** word positions [start, end) of the whole sentence */
  start: number;
  end: number;
  tiles: DictTile[];
}

/** A run of fixed words (a personal blank) — `start` is a word position, `text` what the chip shows. */
export interface FixedRun {
  start: number;
  length: number;
  text: string;
}

export interface Dictation {
  /** the words the tiles follow — the first accepted form */
  words: string[];
  /** every accepted form (generateWordBank) — the judge's list */
  accepted: string[][];
  parts: DictPart[];
  /** word positions the app fills in (personal blanks) */
  fixed: FixedRun[];
  /** the distractor words that came from the pool */
  distractors: string[];
}

function shuffle<T>(list: T[], random: () => number): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The fixed runs, kept only when every accepted form has exactly those words at those positions. */
function verifiedFixed(runs: readonly FixedRun[], accepted: readonly string[][], expectedWords: readonly (readonly string[])[]): FixedRun[] {
  if (!runs.length) return [];
  const ok = runs.every((run, r) =>
    accepted.every((seq) =>
      run.start >= 0 &&
      run.start + run.length <= seq.length &&
      expectedWords[r].length === run.length &&
      expectedWords[r].every((w, i) => sameWord(seq[run.start + i], w)),
    ),
  );
  return ok ? [...runs] : [];
}

export interface BuildOptions {
  /** words of the lesson's other sentences, already in the case they should show */
  pool?: readonly string[];
  /** personal blanks: word runs the app places itself, with the words each run must hold */
  fixed?: readonly { run: FixedRun; words: readonly string[] }[];
  /** the first word keeps its capital (a proper noun · I) */
  keepFirstCase?: boolean;
  /** assemble a long sentence in two parts (D16) */
  allowSplit?: boolean;
  random?: () => number;
}

export function buildDictation(text: string, options: BuildOptions = {}): Dictation {
  const random = options.random ?? Math.random;
  const pool = [...(options.pool ?? [])];
  const bank = generateWordBank(text, pool);
  const accepted = bank.acceptedWordSequences.length ? bank.acceptedWordSequences : [bank.correctWords];
  const words = bank.correctWords;

  // distractors: the bank's extra tiles that are no word of the sentence and came from the pool (never the fixed list)
  const inSentence = new Set(accepted.flat().map(lower));
  const poolKeys = new Set(pool.map(lower));
  const distractors = bank.allTiles
    .map((t) => t.word)
    .filter((w) => !inSentence.has(lower(w)) && poolKeys.has(lower(w)));

  const fixed = verifiedFixed(
    (options.fixed ?? []).map((f) => f.run),
    accepted,
    (options.fixed ?? []).map((f) => f.words),
  );
  const fixedPos = new Set(fixed.flatMap((run) => Array.from({ length: run.length }, (_, i) => run.start + i)));

  const k = options.allowSplit === false ? null : splitIndex(text, accepted);
  const ranges: [number, number][] = k ? [[0, k], [k, words.length]] : [[0, words.length]];
  const keepFirst = options.keepFirstCase === true;

  let serial = 0;
  const tile = (word: string, isFirst: boolean): DictTile => ({
    id: `t${serial++}-${word}`,
    word,
    label: tileLabel(word, isFirst, keepFirst),
  });

  const parts: DictPart[] = ranges.map(([start, end], p) => {
    const tiles: DictTile[] = [];
    const have = new Map<string, number>();
    for (let i = start; i < end; i++) {
      if (fixedPos.has(i)) continue;
      tiles.push(tile(words[i], i === 0));
      have.set(lower(words[i]), (have.get(lower(words[i])) ?? 0) + 1);
    }
    // the other forms' own words ("ma'am" beside "sir", "She … she" beside "He … he") — as many as the form needing most
    for (const seq of accepted.slice(1)) {
      const need = new Map<string, number>();
      for (let i = start; i < end; i++) {
        if (fixedPos.has(i) || i >= seq.length) continue;
        const key = lower(seq[i]);
        need.set(key, (need.get(key) ?? 0) + 1);
        if ((need.get(key) ?? 0) > (have.get(key) ?? 0)) {
          tiles.push(tile(seq[i], i === 0));
          have.set(key, (have.get(key) ?? 0) + 1);
        }
      }
    }
    const extra = k ? distractors.slice(p, p + 1) : distractors.slice(0, 2);
    for (const d of extra) tiles.push({ id: `t${serial++}-${d}`, word: d, label: d });
    return { start, end, tiles: shuffle(tiles, random) };
  });

  return { words, accepted, parts, fixed, distractors: distractors.slice(0, 2) };
}

// ---------------------------------------------------------------------------------------------------------------
// Laying out, checking and hinting one part
// ---------------------------------------------------------------------------------------------------------------

/** One place in the answer: a fixed word or the n-th chosen tile (`pos` −1 = past the end of the part). */
export interface Slot {
  pos: number;
  word: string;
  fixed: boolean;
  tile: number | null;
}

function fixedWordAt(d: Dictation, pos: number): string | null {
  for (const run of d.fixed) if (pos >= run.start && pos < run.start + run.length) return d.words[pos];
  return null;
}

/** The answer of a part as it stands: fixed words appear once the tiles before them are placed. */
export function layoutPart(d: Dictation, partIndex: number, chosen: readonly string[]): Slot[] {
  const part = d.parts[partIndex];
  const out: Slot[] = [];
  let t = 0;
  for (let pos = part.start; pos < part.end; pos++) {
    const fixedWord = fixedWordAt(d, pos);
    if (fixedWord !== null) out.push({ pos, word: fixedWord, fixed: true, tile: null });
    else if (t < chosen.length) out.push({ pos, word: chosen[t], fixed: false, tile: t++ });
    else break;
  }
  while (t < chosen.length) out.push({ pos: -1, word: chosen[t], fixed: false, tile: t++ });
  return out;
}

/** How many tiles a part needs (its words minus the fixed ones). */
export function tilesNeeded(d: Dictation, partIndex: number): number {
  const part = d.parts[partIndex];
  let n = 0;
  for (let pos = part.start; pos < part.end; pos++) if (fixedWordAt(d, pos) === null) n++;
  return n;
}

/** The whole answer so far: the finished parts' words, then this part's slots. */
export function answerSoFar(d: Dictation, partIndex: number, lockedWords: readonly string[], chosen: readonly string[]): string[] {
  return [...lockedWords, ...layoutPart(d, partIndex, chosen).map((s) => s.word)];
}

function commonPrefix(a: readonly string[], b: readonly string[]): number {
  let i = 0;
  while (i < a.length && i < b.length && sameWord(a[i], b[i])) i++;
  return i;
}

/** The accepted form the answer follows furthest (the first one on a tie), and how far. */
export function closestForm(d: Dictation, answer: readonly string[]): { form: string[]; match: number } {
  let form = d.accepted[0] ?? d.words;
  let match = commonPrefix(answer, form);
  for (const seq of d.accepted.slice(1)) {
    const m = commonPrefix(answer, seq);
    if (m > match) {
      form = seq;
      match = m;
    }
  }
  return { form, match };
}

export type CheckVerdict = "empty" | "part" | "correct" | "wrong";

export interface CheckResult {
  verdict: CheckVerdict;
  /** 0-based word position of the first wrong or missing word (whole sentence) */
  firstWrong: number | null;
  /** true when every placed word is right but words are missing */
  missing: boolean;
  /** tiles to keep for '여기부터 다시' (those before the first wrong one) */
  keepTiles: number;
}

/**
 * 정답 확인. The last part is judged by verifyAnyWordSequence over the whole sentence — the one judge; an earlier part
 * passes when it is exactly the start of an accepted form.
 */
export function checkPart(d: Dictation, partIndex: number, lockedWords: readonly string[], chosen: readonly string[]): CheckResult {
  if (chosen.length === 0) return { verdict: "empty", firstWrong: null, missing: false, keepTiles: 0 };
  const part = d.parts[partIndex];
  const answer = answerSoFar(d, partIndex, lockedWords, chosen);
  const last = partIndex === d.parts.length - 1;
  const ok = last
    ? verifyAnyWordSequence(answer, d.accepted)
    : answer.length === part.end && d.accepted.some((seq) => commonPrefix(answer, seq) >= part.end);
  if (ok) return { verdict: last ? "correct" : "part", firstWrong: null, missing: false, keepTiles: chosen.length };
  const { match } = closestForm(d, answer);
  const missing = match >= answer.length;
  const slots = layoutPart(d, partIndex, chosen);
  const keepTiles = slots.filter((s) => s.tile !== null && s.pos >= 0 && s.pos < match).length;
  return { verdict: "wrong", firstWrong: match, missing, keepTiles };
}

/**
 * 힌트 (STU-L05 ②): take back the tiles from the first wrong one, then place the right next word. Returns the tiles to
 * keep and the tile to add (null when the part is already complete and right, or no tile holds the word).
 */
export function hintStep(
  d: Dictation,
  partIndex: number,
  lockedWords: readonly string[],
  chosen: readonly DictTile[],
): { keep: number; add: DictTile | null } {
  const part = d.parts[partIndex];
  const words = chosen.map((t) => t.word);
  const answer = answerSoFar(d, partIndex, lockedWords, words);
  const { form, match } = closestForm(d, answer);
  const slots = layoutPart(d, partIndex, words);
  const keep = slots.filter((s) => s.tile !== null && s.pos >= 0 && s.pos < match).length;
  const kept = chosen.slice(0, keep);
  const after = layoutPart(d, partIndex, kept.map((t) => t.word));
  const next = after.length ? after[after.length - 1].pos + 1 : part.start;
  if (next >= part.end || next < part.start) return { keep, add: null };
  const want = form[next];
  if (!want) return { keep, add: null };
  const used = new Set(kept.map((t) => t.id));
  const free = part.tiles.filter((t) => !used.has(t.id));
  const add = free.find((t) => t.word === want) ?? free.find((t) => sameWord(t.word, want)) ?? null;
  return { keep, add };
}

/** More than a third of the words came from hints → '힌트로 완성', not solved (STU-L15 · D18). */
export function hintedTooMuch(d: Dictation, hints: number): boolean {
  return hints * 3 > d.words.length;
}

// ---------------------------------------------------------------------------------------------------------------
// Distractor pool (STU-L05 ③)
// ---------------------------------------------------------------------------------------------------------------

/**
 * The words of the lesson's OTHER sentences as distractor candidates — each sentence's first word in the case its
 * tile would show, numbers and one-letter words left out, one copy of each (the order shuffled per sentence).
 */
export function distractorPool(
  texts: readonly string[],
  keepCase: readonly boolean[],
  index: number,
  random: () => number = Math.random,
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  texts.forEach((text, i) => {
    if (i === index) return;
    const first = expandSlashAlternatives(text)[0] ?? text;
    tokensOf(first).forEach((t, k) => {
      const w = k === 0 ? tileLabel(t.word, true, keepCase[i] === true) : t.word;
      if (w.length < 2 || /\d/.test(w) || seen.has(lower(w))) return;
      seen.add(lower(w));
      out.push(w);
    });
  });
  return shuffle(out, random);
}
