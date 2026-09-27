/**
 * The speaking check for a ONE-WORD target (2026-09-27 · 계획.md B03 · voca-verified.md VOCA-L10).
 *
 * A VOCA word used to be scored like a sentence: the recogniser's first guess against the word, letter by letter.
 * "do" said well and written "due" scored 22 ('다시 시도'), "know" written "no" 25, "ten" written "10" 15, "Mr."
 * written "mister" 22 — 97 of the 262 readings in check-speech-single-word.cjs ① were not green (under 80) —
 * so the check told a learner to fix a word the recogniser had in fact understood. All this check can honestly
 * say is whether the recogniser understood the word
 * (STU-L13: it never grades pronunciation), so for a one-word target it says exactly that: '알아들었어요', or
 * what it heard instead — no score.
 *
 * ONLY for a target whose every form is one word or one hyphenated word (isSingleWordTarget): the VOCA words
 * (3,894 of 3,897 — 'living room' · 'pen pal' · 'dining room' are two words) and GRAMMAR gh2-023 #13 'Freeze!'.
 * A sentence keeps the sentence scorer (speechRecognition.ts evaluateAgainstAny) exactly as it is.
 *
 * The recogniser said the word (sameWord) when ANY of its guesses — it is asked for SINGLE_WORD_ALTERNATIVES —
 *   · is the word in another case or with punctuation ("Do." · "DO");
 *   · is the word with a hyphen, a space or neither ("well-done" · "well done" · "welldone");
 *   · is the same number in figures or in words ("10" · "ten", "1,000" · "a thousand" · "thousand", "1st" · "first");
 *   · is a homophone from HOMOPHONES ("due" for "do", and "4" for "for" through "four");
 *   · or scores 100 with the sentence scorer, so nothing that passed before is refused now ("do not" for "don't").
 *
 * Pure (no browser) — docs/qa-2026-09-18/scripts/check-speech-single-word.cjs runs it in node.
 */
import { evaluateAgainstAny } from "@/lib/speechRecognition";

/** How many guesses the recogniser is asked for when the target is one word (recognition.maxAlternatives). */
export const SINGLE_WORD_ALTERNATIVES = 5;

/**
 * Words that sound the same in General American English — only real homophones, never "close enough"
 * (very/vary, pin/pen, poor/pour and other pairs that sound alike only in some accents are left out, as is a
 * spelling with two sounds: read, lead, close, bass, route). Lower case; an apostrophe stays ("they're", so it
 * is never "theyre"). A word is in one group only.
 */
export const HOMOPHONES: readonly (readonly string[])[] = [
  // the free lessons mv1-01 · mv1-02 (VOCA-L10), and the pairs named in the plan
  ["do", "due", "dew"], ["know", "no"], ["not", "knot"], ["see", "sea", "c"], ["here", "hear"],
  ["there", "their", "they're"], ["where", "wear", "ware"], ["so", "sew", "sow"], ["why", "y"], ["all", "awl"],
  ["but", "butt"], ["some", "sum"], ["find", "fined"], ["time", "thyme"], ["week", "weak"],
  ["right", "write", "rite"], ["two", "to", "too"], ["four", "for", "fore"], ["one", "won"], ["eight", "ate"],
  ["sail", "sale"], ["meet", "meat"], ["buy", "by", "bye"], ["hour", "our"], ["son", "sun"],
  ["flower", "flour"], ["pair", "pear", "pare"], ["whole", "hole"], ["piece", "peace"],
  // a letter the recogniser may write for a one-word answer
  ["be", "bee", "b"], ["eye", "i", "aye"], ["oh", "owe", "o"], ["tea", "tee", "t"], ["pea", "p"],
  // other VOCA words
  ["new", "knew", "gnu"], ["none", "nun"], ["tail", "tale"], ["mail", "male"], ["main", "mane"],
  ["pain", "pane"], ["plain", "plane"], ["rain", "reign", "rein"], ["wait", "weight"], ["way", "weigh"],
  ["night", "knight"], ["nose", "knows"], ["road", "rode", "rowed"], ["rose", "rows"], ["role", "roll"],
  ["blue", "blew"], ["through", "threw"], ["break", "brake"], ["dear", "deer"], ["die", "dye"],
  ["fair", "fare"], ["hair", "hare"], ["high", "hi"], ["sell", "cell"], ["cent", "scent", "sent"],
  ["sight", "site", "cite"], ["stair", "stare"], ["steal", "steel"], ["sole", "soul"], ["sore", "soar"],
  ["war", "wore"], ["wood", "would"], ["which", "witch"], ["weather", "whether"], ["wine", "whine"],
  ["whose", "who's"], ["bear", "bare"], ["beat", "beet"], ["bury", "berry"], ["board", "bored"],
  ["bread", "bred"], ["ceiling", "sealing"], ["choose", "chews"], ["course", "coarse"], ["council", "counsel"],
  ["fur", "fir"], ["flee", "flea"], ["great", "grate"], ["guest", "guessed"], ["hall", "haul"],
  ["hay", "hey"], ["hire", "higher"], ["horse", "hoarse"], ["idle", "idol"], ["need", "knead"],
  ["lesson", "lessen"], ["morning", "mourning"], ["pale", "pail"], ["past", "passed"], ["patience", "patients"],
  ["pause", "paws"], ["peak", "peek"], ["peer", "pier"], ["pour", "pore"], ["pray", "prey"],
  ["principal", "principle"], ["profit", "prophet"], ["wrap", "rap"], ["ring", "wring"], ["scene", "seen"],
  ["seem", "seam"], ["stake", "steak"], ["story", "storey"], ["straight", "strait"], ["sweet", "suite"],
  ["sunday", "sundae"], ["tax", "tacks"], ["vain", "vein", "vane"], ["waste", "waist"], ["aloud", "allowed"],
  ["alter", "altar"], ["ball", "bawl"], ["band", "banned"], ["capital", "capitol"], ["complement", "compliment"],
  ["dual", "duel"], ["faint", "feint"], ["medal", "meddle"], ["minor", "miner"], ["plum", "plumb"],
  ["presence", "presents"], ["size", "sighs"], ["raise", "rays", "raze"], ["symbol", "cymbal"], ["team", "teem"],
  ["turn", "tern"], ["add", "ad"], ["isle", "aisle"], ["beach", "beech"], ["build", "billed"],
  ["bore", "boar"], ["border", "boarder"], ["cruise", "crews"], ["earn", "urn"], ["gate", "gait"],
  ["air", "heir"], ["leak", "leek"], ["manner", "manor"], ["might", "mite"], ["pole", "poll"],
  ["shoe", "shoo"], ["wheel", "we'll"], ["phase", "faze"], ["least", "leased"], ["mind", "mined"],
  ["world", "whirled"], ["warn", "worn"], ["freeze", "frees", "frieze"],
  // a word the recogniser may write as its abbreviation ('Mr.' is a VOCA word)
  ["mr", "mister"], ["doctor", "dr"],
  // one word with two spellings — the VOCA headwords that teach both ('colo(u)r'), and gray/grey
  ["gray", "grey"], ["color", "colour"], ["favor", "favour"], ["honor", "honour"], ["humor", "humour"],
  ["labor", "labour"], ["neighbor", "neighbour"], ["judgment", "judgement"], ["enroll", "enrol"],
  ["marvelous", "marvellous"], ["medieval", "mediaeval"], ["dialogue", "dialog"], ["tire", "tyre"],
];

/** word → its group in HOMOPHONES */
const SOUND_GROUP = new Map<string, number>();
HOMOPHONES.forEach((group, g) => group.forEach((w) => SOUND_GROUP.set(w, g)));

/** Punctuation at a word's edge — dropped ("Do." · "“due”" · "(ten)"). */
const EDGE = /^[.,?!;:"'()[\]]+|[.,?!;:"'()[\]]+$/g;

/**
 * The words of a guess or a target: lower case, straight apostrophes, dashes and '…' as breaks, no edge
 * punctuation. A word in any script counts — "너는 강했니(strong)?" is two words, never the one word "strong".
 */
function tokensOf(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‒-―…]/g, " ")
    .split(/\s+/)
    .map((t) => t.replace(EDGE, ""))
    .filter((t) => /[\p{L}\p{N}]/u.test(t));
}

/** One word: letters or digits, with apostrophes or dots inside ("o'clock", "a.m."), maybe hyphenated ("well-done"). */
const ONE_WORD = /^[a-z0-9]+(?:['.][a-z0-9]+)*(?:-[a-z0-9]+(?:['.][a-z0-9]+)*)*$/;
/** A number written with thousands commas ("1,000"). */
const GROUPED_DIGITS = /^\d{1,3}(?:,\d{3})+$/;

/**
 * True when every form of the target is one word or one hyphenated word — "do", "Mr.", "o'clock",
 * "well-done", "Freeze!". A sentence, a two-word compound ("living room") and a form with a [[label]] slot
 * (STUDENT's own-words blanks) are not: they keep the sentence scorer.
 */
export function isSingleWordTarget(targets: readonly string[]): boolean {
  return (
    targets.length > 0 &&
    targets.every((t) => {
      if (t.includes("[[")) return false;
      const tokens = tokensOf(t);
      return tokens.length === 1 && (ONE_WORD.test(tokens[0]) || GROUPED_DIGITS.test(tokens[0]));
    })
  );
}

// ---------------------------------------------------------------------------------------------------
// Numbers — "10" · "ten", "1,000" · "one thousand" · "a thousand" · "thousand", "1st" · "first"
// ---------------------------------------------------------------------------------------------------

const UNITS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
// Maps, not objects: a word such as "constructor" must not find Object.prototype's.
const SCALES = new Map<string, number>([["thousand", 1e3], ["million", 1e6], ["billion", 1e9]]);
/** An ordinal word as its cardinal ("first" → "one"); the rest drop "th" ("tenth" → "ten") or turn "ieth" into "y". */
const ORDINALS = new Map<string, string>([
  ["first", "one"], ["second", "two"], ["third", "three"], ["fifth", "five"], ["eighth", "eight"], ["ninth", "nine"], ["twelfth", "twelve"],
]);

type Part = { value: number; next: number } | null;

/** 0-99 from one or two words: "seven" · "twenty" · "twenty one". */
function below100(words: string[], at: number): Part {
  const unit = UNITS.indexOf(words[at]);
  if (unit >= 0) return { value: unit, next: at + 1 };
  const tens = TENS.indexOf(words[at]);
  if (tens < 2) return null;
  const u = UNITS.indexOf(words[at + 1] ?? "");
  return u >= 1 && u <= 9 ? { value: tens * 10 + u, next: at + 2 } : { value: tens * 10, next: at + 1 };
}

/** 0-999: "hundred" · "a hundred" · "three hundred (and) five" · or 0-99. */
function below1000(words: string[], at: number): Part {
  let head: Part;
  if (words[at] === "hundred") head = { value: 1, next: at };
  else if (words[at] === "a" && words[at + 1] === "hundred") head = { value: 1, next: at + 1 };
  else head = below100(words, at);
  if (!head || words[head.next] !== "hundred" || head.value < 1 || head.value > 9) return head;
  let next = head.next + 1;
  const and = words[next] === "and";
  if (and) next++;
  const tail = below100(words, next);
  if (tail) return { value: head.value * 100 + tail.value, next: tail.next };
  return and ? null : { value: head.value * 100, next };
}

/** A whole number said in words, or null — every word must belong to it ("one one" is not two). */
function wordsToNumber(words: string[]): number | null {
  let total = 0;
  let at = 0;
  let lastScale = Infinity;
  while (at < words.length) {
    let part = below1000(words, at);
    if (!part && words[at] === "a" && SCALES.has(words[at + 1])) part = { value: 1, next: at + 1 };
    else if (!part && SCALES.has(words[at])) part = { value: 1, next: at };
    if (!part) return null;
    const scale = SCALES.get(words[part.next]);
    if (scale === undefined) {
      if (part.next !== words.length) return null;
      return total + part.value;
    }
    if (scale >= lastScale) return null;
    total += part.value * scale;
    lastScale = scale;
    at = part.next + 1;
    if (words[at] === "and" && at + 1 < words.length) at++;
  }
  return total;
}

/** The number a guess or target stands for, with whether it is an ordinal ("first" · "1st"), or null. */
function numberOf(tokens: string[]): { value: number; ordinal: boolean } | null {
  const words = tokens.flatMap((t) => t.split("-")).filter(Boolean);
  if (!words.length) return null;
  const figures = (w: string) => (/^\d+$/.test(w) || GROUPED_DIGITS.test(w) ? Number(w.replace(/,/g, "")) : null);
  if (words.length === 1) {
    const n = figures(words[0]);
    if (n !== null) return Number.isSafeInteger(n) ? { value: n, ordinal: false } : null;
    const ord = /^(\d+)(?:st|nd|rd|th)$/.exec(words[0]);
    if (ord) return { value: Number(ord[1]), ordinal: true };
  }
  const scale = words.length === 2 ? SCALES.get(words[1]) : undefined;
  if (scale !== undefined) {
    const n = figures(words[0]); // "1 million"
    if (n !== null) return { value: n * scale, ordinal: false };
  }
  const last = words[words.length - 1];
  const cardinalOfLast =
    ORDINALS.get(last) ?? (/ieth$/.test(last) ? last.replace(/ieth$/, "y") : /th$/.test(last) ? last.replace(/th$/, "") : null);
  const ordinal = cardinalOfLast !== null && wordsToNumber([...words.slice(0, -1), cardinalOfLast]) !== null;
  const value = wordsToNumber(ordinal && cardinalOfLast !== null ? [...words.slice(0, -1), cardinalOfLast] : words);
  return value === null ? null : { value, ordinal };
}

/** The one word that names a number, when there is one ("four" for 4) — so "4" can be a homophone of "for". */
function numberName(value: number): string | null {
  if (value >= 0 && value < 20) return UNITS[value];
  if (value < 100 && value % 10 === 0) return TENS[value / 10];
  return null;
}

// ---------------------------------------------------------------------------------------------------
// The same word
// ---------------------------------------------------------------------------------------------------

/**
 * Everything a guess or a target can stand for: its letters with hyphens, spaces and apostrophes gone
 * ("well-done" · "well done" · "welldone" are all "welldone" — apostrophes go as in the sentence scorer), its
 * number, and its homophone group. Two strings are the same word when they share any of these.
 */
function keysOf(text: string): Set<string> {
  const keys = new Set<string>();
  const tokens = tokensOf(text);
  if (!tokens.length) return keys;
  keys.add(`w:${tokens.join("").replace(/['-]/g, "")}`);
  const num = numberOf(tokens);
  if (num) {
    keys.add(`${num.ordinal ? "ord" : "num"}:${num.value}`);
    const name = num.ordinal ? null : numberName(num.value);
    if (name !== null && SOUND_GROUP.has(name)) keys.add(`sound:${SOUND_GROUP.get(name)}`);
  }
  if (tokens.length === 1 && SOUND_GROUP.has(tokens[0])) keys.add(`sound:${SOUND_GROUP.get(tokens[0])}`);
  return keys;
}

/** Whether a recogniser's guess is the target word (see the top of this file). The order does not matter. */
export function sameWord(guess: string, target: string): boolean {
  const a = keysOf(guess);
  for (const k of keysOf(target)) if (a.has(k)) return true;
  return false;
}

export interface SingleWordResult {
  /** The recogniser said the word — one of its guesses is the word (sameWord), or scores 100 as a sentence. */
  understood: boolean;
  /** The recogniser's first guess, as it wrote it — shown when the word was not understood. */
  heard: string;
  /** The guess that was the word, or null. */
  matched: string | null;
  /** For the caller's onSuccess: 100 when understood, else the best sentence-scorer score of any guess. */
  score: number;
  /** For the caller's onSuccess: the guess that was the word, else the first guess. */
  transcript: string;
}

/**
 * Judges the recogniser's guesses (its first guess first) against every accepted form of a one-word target.
 * The first guess that is the word wins; a guess the sentence scorer scores 100 counts too, so the judgement is
 * never stricter than the score it replaces.
 */
export function judgeSingleWord(guesses: readonly string[], targets: readonly string[]): SingleWordResult {
  const said = Array.from(new Set(guesses.map((g) => g.trim()).filter(Boolean)));
  const heard = said[0] ?? "";
  let matched: string | null = null;
  let best = 0;
  for (const guess of said) {
    const score = evaluateAgainstAny(guess, targets).result.score;
    best = Math.max(best, score);
    if (matched === null && (score === 100 || targets.some((t) => sameWord(guess, t)))) matched = guess;
  }
  return { understood: matched !== null, heard, matched, score: matched !== null ? 100 : best, transcript: matched ?? heard };
}

/** The first guess to show in a line — its edge punctuation off, at most 30 characters. */
function shortHeard(heard: string): string {
  const s = heard.replace(/^[\s.,?!;:"“”]+|[\s.,?!;:"“”]+$/g, "");
  return s.length > 30 ? `${s.slice(0, 29).trimEnd()}…` : s;
}

/** The words of the verdict, and whether it wears the success colours. No score — nothing here is a grade. */
export function presentSingleWord(result: SingleWordResult): { label: string; success: boolean } {
  if (result.understood) return { label: "알아들었어요", success: true };
  const shown = shortHeard(result.heard);
  return { label: shown ? `'${shown}'로 들렸어요 — 한 번 더` : "알아듣지 못했어요 — 한 번 더", success: false };
}
