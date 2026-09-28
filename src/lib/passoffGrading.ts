/**
 * PASS-OFF GRAMMAR grading (docs/pass-off-grammar/설계.md §8).
 *
 * PURE AND IMPORT-FREE ON PURPOSE, like grammarGrading.ts: docs/pass-off-grammar/검사/check-grading.cjs
 * transpiles this file alone and grades every answer the lesson files hold, so a change here is measured
 * before it ships.
 *
 * THE NORMALISING IS COPIED FROM grammarGrading.ts (GRAMMAR I·II) — lower case, curly quotes, punctuation
 * dropped, contractions expanded on BOTH sides ("I'm" = "I am"), the learner's `'d` tried as would and as had,
 * "girlfriend" = "girl friend" but "maybe" ≠ "may be". That file is not changed and not imported: its verify
 * script transpiles it alone, and a change there must not move this course's verdicts (or the other way round).
 * What differs here, on purpose:
 *   - NFKC first (a Korean keyboard's full-width "Ｉ ａｍ"), and a hyphen, a dash or a slash between words is a word
 *     break ("4th-grade" = "4th grade", "go/went/gone" = "go - went - gone").
 *   - A TYPED answer keeps an apostrophe inside a word: "its" ≠ "it's", "were" ≠ "we're", "ones" ≠ "one's".
 *     Each is a word of its own and the confusion is what a grammar course marks wrong — GRAMMAR drops every
 *     apostrophe, which let "Were good friends." pass for "We're good friends." (점검 2026-09-27). A MICROPHONE
 *     answer drops them as GRAMMAR does: a recogniser cannot hear an apostrophe.
 *   - `'s` is read like `'d`: "has" before been · got · gotten · had ("She's been" = "She has been", so "She is
 *     been" is wrong); before another participle it can be either ("It's broken" · "He's broken it") — a
 *     learner's is tried both ways, a reference's is read as the item spells it elsewhere (referenceForms);
 *     "is" otherwise.
 *   - A noun's or a name's `'s` in a LEARNER's answer (Tom's · Mom's · The door's) is tried as written — a
 *     possessive, "Tom's book" — and as is/has read the same way ("Tom's been here" = "Tom has been here",
 *     "Mom's in the garage" = "Mom is in the garage"); whichever matches a reference. Only with a word after it: at
 *     a clause's end it is a possessive ("It's Tom's." — "Yes, Tom is." never shortens). A REFERENCE's noun `'s` is
 *     read as written, so its possessive never turns into "is" ("It is Tom is book." ≠ "It is Tom's book.").
 *     (작업기록 할 일 1, 2026-09-28 — lessons had added "Peter's older than John." as accepted answers to get round it.)
 *   - A MICROPHONE answer is first spelt the way the reference it is closest to writes what a recogniser cannot tell
 *     apart (heardAs): the spacing of a meaning-changing join ("everyday" / "every day" — the learner said the same
 *     sounds; other joins already count as the same, "girlfriend" = "girl friend") and a short list of words said the
 *     same way ("red" for the past "read"). So it is not wrong for them, and it gets no hint about a spelling the
 *     learner never typed (작업기록 할 일 3). A typed answer is not touched.
 *   - A TYPED answer that is a reference but for a possessive's apostrophe ("… my brothers." for "… my brother's.")
 *     stays wrong and carries the grader's own hint (`possessive`) — the diff alone showed only a wavy word.
 *
 * THE ORDER (§8):
 *   1. Hangul in the answer → "hangul" ("영어 자판으로 바꿔 주세요"), not an attempt.
 *   2. A `literal: true` error pattern (데이터-형식 v1.2) — a whole wrong answer that differs from a right one
 *      only by a contraction ("Yes, it's.") — compared as typed: case and punctuation ignored, contractions
 *      NOT expanded. Checked before the accepted answers, because expanding would make it equal to one.
 *   3. The model answer or an accepted answer, after normalising → correct.
 *   4. A spelling slip → "typo" (correct, with a spelling mark), and only when no target group is missing:
 *      a contraction typed without its apostrophe that is no other word ("dont", "Hes" — so "Im" for a lesson
 *      whose target is 'm is wrong, and "its" · "were" · "ones" are never a slip), or one slip of one letter in
 *      one content word of five letters or more — never in a target word, a function word, a negation, a
 *      number, an ending (walk/walks, like/liked), two forms of one word (forget/forgot, broke/broken,
 *      woman/women) or two look-alike words (bought/brought, later/latter): those are grammar or a different
 *      word. A microphone answer keeps GRAMMAR's leniency for apostrophes (a slip, before the targets).
 *      The forms of one word come WITH THE ITEM (`wordForms`): the server attaches the words of the irregular-verb and
 *      irregular-plural table that the item's own answers can meet (src/lib/passoffWordForms.ts). The table is not in
 *      this file — every lesson page's JavaScript carries this file, and the table was pg10-2's paid lines (점검
 *      2026-09-28). An item without `wordForms` knows no such forms.
 *   5. Anything else is WRONG — there is no partial credit here ("partial 은 정답이 아님"): a wrong function
 *      word is the lesson's point. What comes back tells the learner where: the target groups missing
 *      (`targets`, any-of), the first error pattern the answer contains (word boundaries, same normalising),
 *      the words lined up (LCS) against the closest reference — missing · wrong · extra · moved — and, for a
 *      typed answer that is a reference but for a possessive's apostrophe, the grader's own hint (`possessive`).
 * A microphone's answer goes through the same order after heardAs has spelt it (numbers as words first).
 * Punctuation never decides (a microphone's commas are the recogniser's); it only counts in the school
 * writing score (writingIssues), which is shown apart and never decides a pass.
 */

// ---------------------------------------------------------------------------
// Normalising — copied from grammarGrading.ts (2026-09-27); keep the two in step by hand (differences above).
// ---------------------------------------------------------------------------

/** "keep": a typed answer — an apostrophe inside a word stays (its ≠ it's). "drop": a microphone's — none stays. */
type Apostrophes = "keep" | "drop";

/** How one text is read. */
interface Reading {
  /** an ambiguous `'d` (before come · read · put …): would or had — left as written when not given */
  d?: "would" | "had";
  /** an ambiguous `'s` (before a participle other than been · got · gotten · had): is (the default) or has */
  s?: "is" | "has";
  apostrophes?: Apostrophes;
  /** which noun `'s` (a bit each, in order) are read as is/has — the rest stay as written, a possessive (0: all) */
  nouns?: number;
}

const CONTRACTIONS: [RegExp, string][] = [
  [/\bcan't\b/g, "can not"],
  [/\bcannot\b/g, "can not"],
  [/\bwon't\b/g, "will not"],
  [/\bshan't\b/g, "shall not"],
  [/n't\b/g, " not"],
  [/\bi'm\b/g, "i am"],
  [/\b(you|we|they)'re\b/g, "$1 are"],
  [/\b(i|you|we|they|could|would|should|might|must)'ve\b/g, "$1 have"],
  [/\b([a-z]+)'ll\b/g, "$1 will"],
  // he's · it's · there's … are read before these, by expandIsHas (is or has)
  [/\blet's\b/g, "let us"],
];

/**
 * A separator no learner types and no rule touches: the contraction rules see a word break (ownedWords joins
 * a learner's tokens with it, to know which token each normalised word came from).
 */
const TOKEN_SEP = "";
/** a word follows (after spaces or the token separator) */
const WORD_AFTER = /^[\s]+[a-z]/;
/** the words after a contraction, punctuation off each */
const wordsAfter = (rest: string): string[] => rest.replace(/^[\s]+/, "").split(/[\s]+/).map((w) => w.replace(/[^a-z]/g, ""));

/** `'d` is "would" or "had" by the word after it — grammarGrading.ts BUG-010, copied. */
const D_SUBJECT = /\b(i|you|he|she|it|we|they|who|that|there)'d\b/g;
const D_SKIP = new Set([
  "not", "never", "just", "already", "really", "also", "always", "ever", "once", "much",
  "probably", "certainly", "surely", "still", "often", "soon", "sometimes", "usually",
  "definitely", "only", "all", "both", "hardly", "actually",
]);
const D_EITHER = new Set([
  "come", "become", "overcome", "run", "read", "put", "cut", "let", "set", "hit", "hurt",
  "shut", "cost", "quit", "spread", "bet", "burst", "cast", "broadcast", "forecast", "upset",
  "shed", "wed", "split", "thrust", "bid", "rid", "slit", "beat", "wound", "fit",
]);
const D_HAD = new Set([
  "better", "best", "been", "arisen", "awoken", "beaten", "begun", "bent", "bitten", "bled",
  "blown", "borne", "broken", "bred", "brought", "built", "burnt", "bought", "caught", "chosen",
  "clung", "crept", "dealt", "done", "drawn", "dreamt", "driven", "drunk", "dug", "eaten",
  "fallen", "fed", "felt", "fled", "flown", "flung", "forbidden", "forgiven", "forgotten",
  "fought", "found", "frozen", "given", "gone", "got", "gotten", "grown", "had", "heard",
  "held", "hidden", "hung", "kept", "knelt", "known", "laid", "lain", "learnt", "led", "left",
  "lent", "lit", "lost", "made", "meant", "met", "mistaken", "paid", "proven", "ridden",
  "risen", "rung", "said", "sat", "seen", "sent", "sewn", "shaken", "shone", "shot", "shown",
  "shrunk", "slept", "slid", "sold", "sought", "spent", "spilt", "spoken", "sped", "spun",
  "sprung", "stolen", "stood", "struck", "stuck", "stung", "sung", "sunk", "sworn", "swept",
  "swum", "swung", "taken", "taught", "thought", "thrown", "told", "torn", "understood",
  "withdrawn", "woken", "won", "worn", "woven", "wept", "written",
]);
const D_ED_BASE = new Set([
  "need", "feed", "succeed", "proceed", "exceed", "breed", "bleed", "speed", "heed", "seed",
  "weed", "embed", "shred", "bed",
]);

function auxiliaryFor(word: string): "would" | "had" | "either" {
  if (D_EITHER.has(word)) return "either";
  if (D_HAD.has(word)) return "had";
  if (word.length > 3 && word.endsWith("ed") && !D_ED_BASE.has(word)) return "had";
  return "would";
}

function expandWouldHad(text: string, either?: "would" | "had"): string {
  return text.replace(D_SUBJECT, (match: string, subject: string, offset: number, whole: string) => {
    const rest = whole.slice(offset + match.length);
    if (!WORD_AFTER.test(rest)) return match;
    const words = wordsAfter(rest);
    let k = 0;
    while (k < words.length && D_SKIP.has(words[k])) k++;
    if (!words[k]) return match;
    const aux = auxiliaryFor(words[k]);
    if (aux === "either") return either ? `${subject} ${either}` : match;
    return `${subject} ${aux}`;
  });
}

/** `'s` after these is is or has; any other word's `'s` (Tom's · one's · Today's) stays as written. */
const S_SUBJECT = /\b(he|she|it|that|this|there|what|who|where|here|how|when)'s\b/g;
/** a question word's `'s` can have its subject in between: "Where's he gone?" · "How's she been?" */
const S_QUESTION = new Set(["what", "who", "where", "how", "when"]);
const S_INVERTED = new Set(["i", "you", "he", "she", "it", "we", "they", "there", "this", "that"]);
/** `'s` before these is always has — "is been" · "is got" are never English */
const S_HAS = new Set(["been", "got", "gotten", "had"]);

/** What a `'s` stands for, by the word after it (adverbs skipped): has · is · either (a participle). */
function readingOfS(subject: string, rest: string): "is" | "has" | "either" {
  if (!WORD_AFTER.test(rest)) return "is";
  const words = wordsAfter(rest);
  let k = 0;
  while (k < words.length && D_SKIP.has(words[k])) k++;
  if (S_QUESTION.has(subject) && S_INVERTED.has(words[k])) {
    k++;
    while (k < words.length && D_SKIP.has(words[k])) k++;
  }
  const word = words[k];
  if (!word) return "is";
  if (S_HAS.has(word)) return "has";
  // "It's broken" is · "He's broken it" has — the words do not tell; the item does (referenceForms)
  if (D_HAD.has(word) || D_EITHER.has(word) || (word.length > 3 && word.endsWith("ed") && !D_ED_BASE.has(word))) return "either";
  return "is";
}

/** `'s` as is or has (`either` decides a participle's; "is" when not given). */
function expandIsHas(text: string, either?: "is" | "has"): string {
  return text.replace(S_SUBJECT, (match: string, subject: string, offset: number, whole: string) => {
    const reading = readingOfS(subject, whole.slice(offset + match.length));
    return `${subject} ${reading === "either" ? either ?? "is" : reading}`;
  });
}

/**
 * Any other word's `'s` — a noun's or a name's (Tom's · Mom's · The door's) — is a possessive ("Tom's book") or is/has
 * ("Tom's been here" · "Mom's in the garage"). A learner's is tried both ways (userForms, like `'d`) and the reading
 * that matches a reference wins; a reference's is read as written (its possessive never becomes "is").
 */
const NOUN_S = /\b([a-z]+)'s\b/g;
/** the words whose `'s` S_SUBJECT reads (always is/has), and let's */
const NOT_NOUN_S = new Set(["he", "she", "it", "that", "this", "there", "what", "who", "where", "here", "how", "when", "let"]);
/** at most this many noun `'s` of one answer are tried both ways (2^n readings); any after them stay as written */
const MAX_NOUN_S = 4;

/** The noun `'s` words of a text, in order ("room's" · "brother's") — a pronoun's and let's aside. */
function nounSWords(text: string): string[] {
  const out: string[] = [];
  String(text ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(NOUN_S, (match: string, word: string) => {
      if (!NOT_NOUN_S.has(word)) out.push(match);
      return match;
    });
  return out;
}

/** The noun `'s` readings to try: a bit per `'s` (set: is/has, clear: as written) — every choice, 0 first. */
function nounReadings(text: string): number[] {
  const n = Math.min(nounSWords(text).length, MAX_NOUN_S);
  return Array.from({ length: 1 << n }, (_, mask) => mask);
}

/** The chosen noun `'s` as is or has, read by the word after it like a pronoun's (readingOfS). */
function expandNounS(text: string, chosen = 0, either?: "is" | "has"): string {
  if (!chosen) return text;
  let k = -1;
  return text.replace(NOUN_S, (match: string, word: string, offset: number, whole: string) => {
    if (NOT_NOUN_S.has(word)) return match;
    k++;
    if (k >= MAX_NOUN_S || !(chosen & (1 << k))) return match;
    const rest = whole.slice(offset + match.length);
    // at a clause's end it is a possessive ("It's Tom's.") — "Yes, Tom is." never shortens to "Yes, Tom's."
    if (!WORD_AFTER.test(rest)) return match;
    const reading = readingOfS(word, rest);
    return `${word} ${reading === "either" ? either ?? "is" : reading}`;
  });
}

/** Words whose slip is grammar, not spelling — never a "typo" here (grammarGrading.ts FUNCTION_WORDS, copied). */
const FUNCTION_WORDS = new Set([
  "a", "an", "the",
  "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "not", "never", "no", "nor",
  "and", "or", "but", "so", "yet", "if", "unless", "since", "though", "although",
  "because", "while", "after", "before", "until", "as", "that", "whether", "than", "then",
  "this", "these", "those",
  "i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his", "she", "her", "hers",
  "it", "its", "we", "us", "our", "ours", "they", "them", "their", "theirs",
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",
  "in", "on", "at", "for", "to", "from", "with", "by", "of", "into", "out", "up", "down",
  "off", "over", "under", "about", "through", "onto",
  "some", "any", "much", "many", "more", "most", "all", "each", "every", "both",
  "there", "here", "very", "too", "also", "just", "only",
]);

/** Words that turn a sentence into its opposite (grammarGrading.ts NEGATORS, copied). */
const NEGATORS = new Set(["not", "no", "never", "nobody", "nothing", "none", "neither", "nor", "nowhere", "noone", "cannot", "unless"]);
const NEGATED_AUX = /^(?:is|are|was|were|do|does|did|have|has|had|could|would|should|must|need|might|ca|wo|sha|ai)nt$/;
const ANSWER_NO = /^\s*no\s*[,.!;:]/i;
const TAG_RAW = /,\s*[a-z]+(?:n['’]t)?\s+(?:i|you|he|she|it|we|they|there|one)(?:\s+not)?\s*[?.!]*\s*$/i;
const TAG_AUX = new Set([
  "am", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must", "need", "ought",
]);
const TAG_SUBJECT = new Set(["i", "you", "he", "she", "it", "we", "they", "there", "one"]);

/** Joined forms that are a DIFFERENT expression from their split form (grammarGrading.ts, copied). */
const MEANING_CHANGING_JOINS = new Set([
  "maybe", "everyday", "sometime", "sometimes", "anyone", "anybody", "already",
  "altogether", "awhile", "someone", "somebody", "into", "onto", "everyone",
  "everybody", "anyway", "someday", "nobody", "apart", "alright", "alot",
  "infact", "nowhere", "somewhat", "whatever", "whenever", "however",
]);

/**
 * Each meaning-changing join and the two words it is when split — the same letters said the same way, so a
 * recogniser's choice between them is not the learner's (heardAs). Only these: other same-letter pairs can sound
 * different ("notable" / "not able", "often" / "of ten"). already · altogether · alright split into other letters.
 */
const JOIN_SPLITS = new Map<string, string>([
  ["maybe", "may be"], ["everyday", "every day"], ["sometime", "some time"], ["sometimes", "some times"],
  ["anyone", "any one"], ["anybody", "any body"], ["awhile", "a while"], ["someone", "some one"],
  ["somebody", "some body"], ["into", "in to"], ["onto", "on to"], ["everyone", "every one"],
  ["everybody", "every body"], ["anyway", "any way"], ["someday", "some day"], ["nobody", "no body"],
  ["apart", "a part"], ["alot", "a lot"], ["infact", "in fact"], ["nowhere", "no where"],
  ["somewhat", "some what"], ["whatever", "what ever"], ["whenever", "when ever"], ["however", "how ever"],
]);
const SPLIT_JOINS = new Map([...JOIN_SPLITS].map(([joined, split]) => [split, joined]));

/** NFKC (full-width keyboard letters → ASCII), whitespace collapsed. */
function prepare(text: string): string {
  return String(text ?? "").normalize("NFKC").replace(/\s+/g, " ").trim();
}

const isWordChar = (c: string | undefined): boolean => Boolean(c) && /[a-z0-9]/.test(c as string);

/**
 * Lower-case, punctuation removed — contractions left as written. An apostrophe inside a word stays ("keep",
 * the default — a typed answer: its ≠ it's, one's ≠ ones) or goes ("drop" — a microphone's). One at a word's
 * edge always goes: a quotation mark ('Hello') or a plural possessive's end (Koreans').
 */
function normalizeLiteral(text: string, apostrophes: Apostrophes = "keep"): string {
  const lower = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”„]/g, '"')
    // PASS-OFF: a hyphen, a dash or a slash between words is a word break ("4th-grade" = "4th grade", "No-one" =
    // "No one", "go/went/gone" = "go / went / gone" = "go - went - gone" — pg10-2 · 작업기록 할 일 2)
    .replace(/[-‐‑‒–—―/]/g, " ");
  const marked =
    apostrophes === "keep"
      ? lower.replace(/'/g, (mark: string, at: number, whole: string) => (isWordChar(whole[at - 1]) && isWordChar(whole[at + 1]) ? mark : ""))
      : lower.replace(/'/g, "");
  return marked
    .replace(/[.,?!;:"()…]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** The grader's comparison form: contractions expanded (grammarGrading.ts normalizeForComparison), read as `reading` says. */
export function normalizeForComparison(text: string, reading: Reading = {}): string {
  let normalized = expandWouldHad(String(text ?? "").normalize("NFKC").toLowerCase().replace(/[’‘]/g, "'"), reading.d);
  normalized = expandNounS(normalized, reading.nouns, reading.s);
  normalized = expandIsHas(normalized, reading.s);
  for (const [pattern, replacement] of CONTRACTIONS) normalized = normalized.replace(pattern, replacement);
  return normalizeLiteral(normalized, reading.apostrophes);
}

/**
 * Every reading of a learner's answer: its `'d` as written, as would and as had × its `'s` before a participle as is
 * and as has × each noun `'s` as written (a possessive) and as is/has.
 */
function userForms(answer: string, apostrophes: Apostrophes): string[] {
  const out = new Set<string>();
  const nounMasks = nounReadings(answer);
  for (const d of [undefined, "would", "had"] as const) {
    for (const s of ["is", "has"] as const) for (const nouns of nounMasks) out.add(normalizeForComparison(answer, { d, s, apostrophes, nouns }));
  }
  return [...out].filter(Boolean);
}

/** "has" or "is" when the item's target words name one of them and not the other. */
function targetReading(targets: readonly (readonly string[])[] | null | undefined): "is" | "has" | null {
  const named = new Set<string>();
  for (const group of targets ?? []) for (const form of group ?? []) for (const w of normalizeLiteral(String(form ?? "")).split(" ")) named.add(w);
  if (named.has("has") && !named.has("is")) return "has";
  if (named.has("is") && !named.has("has")) return "is";
  return null;
}

/**
 * Each reference's comparison form. A reference's `'s` before a participle ("He's gone home.") is read the way
 * the item spells it elsewhere — another answer written out ("He has gone home.") — or its targets name
 * ("has" · "is"); otherwise "is", as GRAMMAR reads every `'s`. So an item that says "He has gone home." does not
 * take "He is gone home." through its contracted answer, and "It's made of wood." still takes "It is made of wood.".
 */
function referenceForms(refs: readonly string[], targets: readonly (readonly string[])[] | null | undefined, apostrophes: Apostrophes): string[] {
  const asIs = refs.map((r) => normalizeForComparison(r, { s: "is", apostrophes }));
  const asHas = refs.map((r) => normalizeForComparison(r, { s: "has", apostrophes }));
  const plain = new Set(asIs.filter((form, i) => form === asHas[i]));
  const named = targetReading(targets);
  return refs.map((_, i) => {
    if (asIs[i] === asHas[i]) return asIs[i];
    const has = plain.has(asHas[i]);
    const is = plain.has(asIs[i]);
    if (has !== is) return has ? asHas[i] : asIs[i];
    return named === "has" ? asHas[i] : asIs[i];
  });
}

/** A whole wrong answer compared as typed: case and punctuation ignored, contractions kept (데이터-형식 v1.2). */
function literalKey(text: string): string {
  return prepare(text)
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9' ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const words = (normalized: string): string[] => normalized.split(" ").filter(Boolean);
const HANGUL = /[ᄀ-ᇿ㄰-㆏ꥠ-꥿가-힯ힰ-퟿]/;

/** Hangul (or its jamo) in the answer — the keyboard is still on Korean. */
export function hasHangul(text: string): boolean {
  return HANGUL.test(String(text ?? ""));
}

/**
 * Optimal-string-alignment distance: a transposition ("teh") counts as one edit (grammarGrading.ts, copied). Exported for
 * the server's word forms (passoffWordForms.ts), which must measure "one letter away" exactly as the typo rule does.
 */
export function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  }
  return d[a.length][b.length];
}

/**
 * Longest common subsequence of two word lists, with the matched indices on each side (grammarGrading.ts align, copied)
 * and the matched pairs. `same` decides a match (equal words; heardAs also takes words said the same way).
 */
function align(userWords: string[], modelWords: string[], same: (user: string, model: string) => boolean = (a, b) => a === b) {
  const dp = Array.from({ length: userWords.length + 1 }, () => new Array<number>(modelWords.length + 1).fill(0));
  for (let i = 1; i <= userWords.length; i++) {
    for (let j = 1; j <= modelWords.length; j++) {
      dp[i][j] = same(userWords[i - 1], modelWords[j - 1]) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matchedUser = new Set<number>();
  const matchedModel = new Set<number>();
  const pairs: [number, number][] = [];
  let i = userWords.length;
  let j = modelWords.length;
  while (i > 0 && j > 0) {
    if (same(userWords[i - 1], modelWords[j - 1]) && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matchedUser.add(i - 1);
      matchedModel.add(j - 1);
      pairs.push([i - 1, j - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return { length: dp[userWords.length][modelWords.length], matchedUser, matchedModel, pairs };
}

/** "girlfriend" = "girl friend"; a meaning-changing join ("maybe" / "may be") is not (grammarGrading.ts gradeSpacingOnly). */
function sameBySpacing(user: string, model: string): boolean {
  if (user.replace(/ /g, "") !== model.replace(/ /g, "")) return false;
  const userWords = new Set(user.split(" "));
  const modelWords = new Set(model.split(" "));
  const changed = [...[...userWords].filter((w) => !modelWords.has(w)), ...[...modelWords].filter((w) => !userWords.has(w))];
  return !changed.some((w) => MEANING_CHANGING_JOINS.has(w));
}

// ---------------------------------------------------------------------------
// Prefix opposites — with the exceptions GRAMMAR's rule lacks (설계 §8, release report J.2)
// ---------------------------------------------------------------------------

const OPPOSITE_PREFIXES = ["dis", "non", "im", "in", "il", "ir", "un"];
/**
 * Words that START like a negative prefix but are not "prefix + the opposite word": grammarGrading.ts's
 * rule reads "interesting" as in + "teresting" and "invaluable" (very valuable) as the opposite of
 * "valuable". Only the longer word is looked up.
 */
const NOT_PREFIXED_OPPOSITES = new Set([
  "interesting", "interest", "interested", "invaluable", "inflammable", "income", "increase", "indeed", "index",
  "inform", "information", "inside", "insight", "install", "instance", "instant", "instead", "insist", "invent",
  "invest", "invite", "involve", "into", "important", "impress", "improve", "impact", "impose", "import", "iron",
  "irony", "illness", "under", "understand", "unit", "unite", "union", "until", "unless", "uncle", "uniform",
  "discover", "discuss", "display", "distance", "disease", "dispose", "district", "dish", "nonetheless",
]);

/** "possible" for "impossible", "happy" for "unhappy" — the opposite word, never a typo of it. */
export function isPrefixedOpposite(a: string, b: string): boolean {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  const longer = x.length >= y.length ? x : y;
  if (NOT_PREFIXED_OPPOSITES.has(longer)) return false;
  return OPPOSITE_PREFIXES.some((prefix) => x === prefix + y || y === prefix + x);
}

// ---------------------------------------------------------------------------
// Microphone answers — the numbers a recogniser writes as digits (GRAMMAR's microphone rule, main 2026-09-27)
// ---------------------------------------------------------------------------

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function cardinal(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  if (n === 100) return "one hundred";
  if (n < 20) return ONES[n];
  const ones = n % 10;
  return ones ? `${TENS[Math.floor(n / 10)]} ${ONES[ones]}` : TENS[n / 10];
}

/**
 * Ordinals are made from the cardinal words by the spelling rules — no list of them is kept (점검 2026-09-28: the list
 * was pg06-3's paid lines, in every lesson page's JavaScript). Only the last word changes: the irregular few, a ten's
 * -y → -ieth (twenty → twentieth), otherwise + th (four → fourth, thirteen → thirteenth, hundred → hundredth).
 * The same words as the old list for 1 to 100 (docs/pass-off-grammar/검사/check-leak-fix.cjs compares the two).
 */
const IRREGULAR_ORDINALS: Readonly<Record<string, string>> = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
const ordinalWord = (word: string): string => IRREGULAR_ORDINALS[word] ?? (word.endsWith("y") ? `${word.slice(0, -1)}ieth` : `${word}th`);

function ordinal(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 100) return null;
  const words = cardinal(n) ?? "";
  const last = words.lastIndexOf(" ") + 1;
  return words.slice(0, last) + ordinalWord(words.slice(last));
}

/**
 * One spelling for the numbers of a SPOKEN answer and its references: a recogniser writes "I am 11 years
 * old" for what the learner said as "eleven". Only for microphone answers — a typed answer keeps its digits,
 * because some items ask for the number in words ("숫자는 영어 낱말로").
 */
export function spokenNumbersAsWords(text: string): string {
  return String(text ?? "")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1")
    .replace(/\$(\d+)\s*(million|billion|thousand)\b/gi, "$1 $2 dollars")
    .replace(/\$(\d+)/g, "$1 dollars")
    .replace(/(\d+)\s?%/g, "$1 percent")
    .replace(/\b(\d{1,2}):00\b/g, "$1 o'clock")
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h: string, mm: string) => `${h} ${Number(mm) < 10 ? `oh ${Number(mm)}` : Number(mm)}`)
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (m, d: string) => ordinal(Number(d)) ?? m)
    .replace(/\b\d+\b/g, (m) => cardinal(Number(m)) ?? m)
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)-(one|two|three|four|five|six|seven|eight|nine|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth)\b/gi, "$1 $2");
}

/**
 * Words said the same way, which a recogniser may write for one another — a MICROPHONE answer only (heardAs, 작업기록
 * 할 일 3). A small list on purpose: the same sound in American English, mostly forms of the irregular-verb table
 * (pg10-2), where a word said on its own gives the recogniser nothing to choose a spelling by ("know - knew - known"
 * can come back "no new known"), and four sets of function words. Apostrophes are not heard: "theyre" is they're.
 */
const HEARD_AS_GROUPS =
  "know,no|knew,new|ate,eight|see,sea|seen,scene|meet,meat|buy,by,bye|hear,here|heard,herd|blew,blue|threw,through|" +
  "thrown,throne|won,one|write,right|wrote,rote|break,brake|sent,cent,scent|flew,flu|grown,groan|ring,wring|" +
  "rung,wrung|made,maid|rode,road,rowed|rose,rows|steal,steel|sell,cell|bore,boar|borne,born|bear,bare|beat,beet|" +
  "find,fined|flee,flea|taught,taut|to,too,two|there,their,theyre|your,youre|whose,whos";
const HEARD_AS = new Map<string, Set<string>>();
for (const group of HEARD_AS_GROUPS.split("|")) {
  const same = group.split(",");
  for (const w of same) HEARD_AS.set(w, new Set([...(HEARD_AS.get(w) ?? []), ...same.filter((x) => x !== w)]));
}
// one way only: "red" is always said like the past "read" (pg10-2:p71 "read - read - read" came back "read red red"),
// but "read" is also said like "reed", so "read" never stands for "red"
HEARD_AS.set("red", new Set(["read"]));

const soundsAlike = (user: string, reference: string): boolean => user === reference || Boolean(HEARD_AS.get(user)?.has(reference));

/** A token's leading marks, its letters, its trailing marks ("Everyday," → "" · "Everyday" · ","). */
function splitToken(token: string): [string, string, string] {
  const lead = (/^[^A-Za-z0-9]*/.exec(token) ?? [""])[0];
  const rest = token.slice(lead.length);
  const trail = (/[^A-Za-z0-9]*$/.exec(rest) ?? [""])[0];
  return [lead, rest.slice(0, rest.length - trail.length), trail];
}

/** `word` in the place of `first` (… `last`): their outer marks kept, and a capital letter if `first` had one. */
function rewriteToken(first: string, word: string, last: string = first): string {
  const [lead, letters] = splitToken(first);
  const trail = splitToken(last)[2];
  return `${lead}${/^[A-Z]/.test(letters) ? word.charAt(0).toUpperCase() + word.slice(1) : word}${trail}`;
}

/** The one word a token is, as a microphone's answer is compared (apostrophes not heard) — null for none or several. */
function soleWord(token: string): string | null {
  const ws = normalizeLiteral(token, "drop").split(" ").filter(Boolean);
  return ws.length === 1 ? ws[0] : null;
}

/**
 * A microphone's answer spelt the way `reference` writes what the recogniser could not tell apart: ① spacing — a
 * meaning-changing join the reference writes split ("everyday" → "every day", JOIN_SPLITS) or split where it writes
 * it joined, only where the reference does not also write it the learner's way; ② a word said the same way
 * (HEARD_AS) where the answer and the reference line up ("read red red" → "read read read"). Nothing else changes.
 */
function heardToward(answer: string, reference: string): string {
  const refWords: string[] = [];
  const refSpelling: string[] = [];
  for (const token of reference.split(" ").filter(Boolean)) {
    const ws = normalizeLiteral(token, "drop").split(" ").filter(Boolean);
    for (const w of ws) {
      refWords.push(w);
      refSpelling.push(ws.length === 1 ? splitToken(token)[1].toLowerCase() : w);
    }
  }
  const refSet = new Set(refWords);
  const refPairs = new Set<string>();
  for (let i = 0; i + 1 < refWords.length; i++) refPairs.add(`${refWords[i]} ${refWords[i + 1]}`);
  // ① spacing
  const tokens = answer.split(" ").filter(Boolean);
  const spaced: string[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const a = soleWord(tokens[t]);
    const b = t + 1 < tokens.length ? soleWord(tokens[t + 1]) : null;
    const joined = a && b ? SPLIT_JOINS.get(`${a} ${b}`) : undefined;
    const split = a ? JOIN_SPLITS.get(a) : undefined;
    if (joined && refSet.has(joined) && !refPairs.has(`${a} ${b}`) && !splitToken(tokens[t])[2] && !splitToken(tokens[t + 1])[0]) {
      spaced.push(rewriteToken(tokens[t], joined, tokens[t + 1]));
      t++;
    } else if (split && !refSet.has(a as string) && refPairs.has(split)) {
      spaced.push(rewriteToken(tokens[t], split));
    } else spaced.push(tokens[t]);
  }
  // ② words said the same way
  const out = spaced.join(" ").split(" ").filter(Boolean);
  const userWords: string[] = [];
  const owner: number[] = [];
  out.forEach((token, t) => {
    const sole = soleWord(token);
    if (sole) {
      userWords.push(sole);
      owner.push(t);
    } else {
      for (const w of normalizeLiteral(token, "drop").split(" ").filter(Boolean)) {
        userWords.push(w);
        owner.push(-1);
      }
    }
  });
  for (const [u, r] of align(userWords, refWords, soundsAlike).pairs) {
    if (userWords[u] !== refWords[r] && owner[u] >= 0) out[owner[u]] = rewriteToken(out[owner[u]], refSpelling[r]);
  }
  return out.join(" ");
}

/**
 * A microphone's answer spelt toward the reference it comes closest to that way (heardToward) — the recogniser's
 * spacing and its choice among words said the same way are not the learner's (pg11-2:p4 "every day" written
 * "everyday", pg10-2:p71 "read" written "red"). The answer itself when no reference brings it closer.
 */
function heardAs(answer: string, references: readonly string[]): string {
  const share = (text: string, reference: string) => {
    const u = normalizeLiteral(text, "drop").split(" ").filter(Boolean);
    const r = normalizeLiteral(reference, "drop").split(" ").filter(Boolean);
    return align(u, r).length / Math.max(1, u.length, r.length);
  };
  let best = { text: answer, share: -1 };
  for (const reference of references) {
    const text = heardToward(answer, reference);
    const s = share(text, reference);
    if (s > best.share) best = { text, share: s };
  }
  return best.text;
}

// ---------------------------------------------------------------------------
// Targets (any-of groups) and error patterns
// ---------------------------------------------------------------------------

interface AnswerForms {
  /** every expanded reading, as " w1 w2 … " */
  expanded: string[];
  literal: string;
  /** lower case, straight apostrophes, spaces collapsed — for a contraction form ("'s", "'re") */
  raw: string;
}

function formsOf(answer: string, apostrophes: Apostrophes): AnswerForms {
  return {
    expanded: userForms(answer, apostrophes).map((f) => ` ${f} `),
    literal: ` ${normalizeLiteral(answer, apostrophes)} `,
    raw: prepare(answer).toLowerCase().replace(/[’‘]/g, "'"),
  };
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A target form in the answer, at word boundaries. "'s" · "'re" · "'m" (a contraction ending) is looked for as
 * typed; a form with an apostrophe inside ("It's" · "we're") is compared with it, so "Its" · "were" do not fill it.
 */
function containsForm(forms: AnswerForms, form: string, apostrophes: Apostrophes): boolean {
  const f = prepare(form).toLowerCase().replace(/[’‘]/g, "'");
  if (!f) return true;
  if (f.startsWith("'")) return new RegExp(`[a-z0-9]${escapeRegExp(f)}(?![a-z0-9])`).test(forms.raw);
  const literal = normalizeLiteral(f, apostrophes);
  const expanded = new Set([normalizeForComparison(f, { s: "is", apostrophes }), normalizeForComparison(f, { s: "has", apostrophes })]);
  return [...expanded].some((e) => Boolean(e) && forms.expanded.some((x) => x.includes(` ${e} `))) || (Boolean(literal) && forms.literal.includes(` ${literal} `));
}

function missingIn(answer: string, targets: readonly (readonly string[])[] | null | undefined, apostrophes: Apostrophes): string[][] {
  const forms = formsOf(answer, apostrophes);
  return (targets ?? []).filter((group) => Array.isArray(group) && group.length > 0 && !group.some((form) => containsForm(forms, form, apostrophes))).map((g) => [...g]);
}

/** The target groups (any-of) the answer lacks — a group is missing when none of its forms is there. */
export function missingTargets(answer: string, targets: readonly (readonly string[])[] | null | undefined, options: GradeOptions = {}): string[][] {
  return missingIn(prepare(answer), targets, options.spoken ? "drop" : "keep");
}

/** Every word of every target form — a target word is graded strictly (never a typo). */
function targetWords(targets: readonly (readonly string[])[] | null | undefined): Set<string> {
  const out = new Set<string>();
  for (const group of targets ?? []) for (const form of group ?? []) for (const w of [...words(normalizeForComparison(form)), ...words(normalizeLiteral(form))]) out.add(w);
  return out;
}

export interface ErrorPatternLike {
  match: string;
  hint: string;
  literal?: boolean;
}

function patternHit(forms: AnswerForms, match: string, apostrophes: Apostrophes): boolean {
  const piece = normalizeForComparison(match, { apostrophes });
  return Boolean(piece) && forms.expanded.some((e) => e.includes(` ${piece} `));
}

// ---------------------------------------------------------------------------
// Where the words differ — the learner's words lined up against one reference
// ---------------------------------------------------------------------------

export type DiffKind = "same" | "wrong" | "extra" | "missing" | "moved";

export interface DiffToken {
  kind: DiffKind;
  /** the learner's token as typed; for "missing", the reference's word (shown only once the answer is shown) */
  text: string;
  /** for "wrong": what the reference has there */
  expected?: string;
  /** for "wrong": the learner wrote the prefix opposite ("possible" for "impossible") */
  opposite?: boolean;
}

interface OwnedWords {
  raw: string[];
  words: string[];
  /** the typed token each normalised word came from ("I'm" → "i" "am", both from token 0) */
  owner: number[];
}

function ownedWords(text: string, reading: Reading = {}): OwnedWords {
  const raw = prepare(text).split(" ").filter(Boolean);
  const out: OwnedWords = { raw, words: [], owner: [] };
  let joined = expandIsHas(expandNounS(expandWouldHad(raw.join(TOKEN_SEP).toLowerCase().replace(/[’‘]/g, "'"), reading.d), reading.nouns, reading.s), reading.s);
  for (const [pattern, replacement] of CONTRACTIONS) joined = joined.replace(pattern, replacement);
  const pieces = joined.split(TOKEN_SEP);
  if (pieces.length === raw.length) {
    pieces.forEach((piece, index) => {
      for (const w of words(normalizeLiteral(piece, reading.apostrophes))) {
        out.words.push(w);
        out.owner.push(index);
      }
    });
    if (out.words.join(" ") === normalizeForComparison(text, reading)) return out;
  }
  // kept safe (a contraction rule that would join two tokens): the literal words, one token at a time
  out.words = [];
  out.owner = [];
  raw.forEach((token, index) => {
    for (const w of words(normalizeLiteral(token, reading.apostrophes))) {
      out.words.push(w);
      out.owner.push(index);
    }
  });
  return out;
}

/** The reference word as the reference spells it (edge punctuation off), or the normalised word. */
function referenceWord(ref: OwnedWords, index: number): string {
  const token = ref.owner[index];
  if (ref.owner.filter((o) => o === token).length !== 1) return ref.words[index];
  const bare = ref.raw[token].replace(/^[("“‘'[]+/, "").replace(/[.,?!;:)"”’'\]]+$/, "");
  return bare || ref.words[index];
}

function lineUp(user: OwnedWords, ref: OwnedWords): DiffToken[] {
  const { matchedUser, matchedModel } = align(user.words, ref.words);
  const pairedUser = [...matchedUser].sort((a, b) => a - b);
  const pairedRef = [...matchedModel].sort((a, b) => a - b);
  const kind: DiffKind[] = user.words.map(() => "same");
  const expected: (string | undefined)[] = user.words.map(() => undefined);
  const opposite: boolean[] = user.words.map(() => false);
  const missing: { after: number; at: number; text: string }[] = [];

  // Between two matched words, the leftovers pair up in order: a pair is a wrong word, a learner's word
  // without a partner is extra, a reference word without one is missing.
  for (let gap = 0; gap <= pairedUser.length; gap++) {
    const u0 = gap === 0 ? 0 : pairedUser[gap - 1] + 1;
    const u1 = gap === pairedUser.length ? user.words.length : pairedUser[gap];
    const r0 = gap === 0 ? 0 : pairedRef[gap - 1] + 1;
    const r1 = gap === pairedRef.length ? ref.words.length : pairedRef[gap];
    const userGap: number[] = [];
    for (let i = u0; i < u1; i++) userGap.push(i);
    const refGap: number[] = [];
    for (let j = r0; j < r1; j++) refGap.push(j);
    const pairs = Math.min(userGap.length, refGap.length);
    for (let p = 0; p < pairs; p++) {
      kind[userGap[p]] = "wrong";
      expected[userGap[p]] = referenceWord(ref, refGap[p]);
      opposite[userGap[p]] = isPrefixedOpposite(user.words[userGap[p]], ref.words[refGap[p]]);
    }
    for (let p = pairs; p < userGap.length; p++) kind[userGap[p]] = "extra";
    const after = userGap.length ? userGap[userGap.length - 1] : u0 - 1;
    for (let p = pairs; p < refGap.length; p++) missing.push({ after, at: refGap[p], text: referenceWord(ref, refGap[p]) });
  }

  // a word in the wrong place: extra here, missing there ("What time it is?")
  for (let i = 0; i < user.words.length; i++) {
    if (kind[i] !== "extra") continue;
    const k = missing.findIndex((m) => ref.words[m.at] === user.words[i]);
    if (k < 0) continue;
    kind[i] = "moved";
    missing.splice(k, 1);
  }

  const tokens: DiffToken[] = [];
  const insertAfter = (after: number) => {
    for (const m of missing) if (m.after === after) tokens.push({ kind: "missing", text: m.text });
  };
  insertAfter(-1);
  user.raw.forEach((token, t) => {
    const mine: number[] = [];
    user.owner.forEach((o, i) => {
      if (o === t) mine.push(i);
    });
    if (!mine.length) {
      tokens.push({ kind: "same", text: token }); // punctuation only
      return;
    }
    const kinds = mine.map((i) => kind[i]);
    if (kinds.every((k) => k === "same")) tokens.push({ kind: "same", text: token });
    else if (kinds.every((k) => k === "extra")) tokens.push({ kind: "extra", text: token });
    else if (kinds.every((k) => k === "moved")) tokens.push({ kind: "moved", text: token });
    else {
      const fix = mine
        .map((i) => (kind[i] === "wrong" ? expected[i] : kind[i] === "same" ? user.words[i] : ""))
        .filter(Boolean)
        .join(" ");
      tokens.push({ kind: "wrong", text: token, expected: fix || undefined, opposite: mine.some((i) => opposite[i]) || undefined });
    }
    for (const i of mine) insertAfter(i);
  });
  return tokens;
}

/**
 * How to read the learner's noun `'s` against one reference: the choice (possessive or is/has, each) whose words line up
 * best with it — so "Tom's been here yesterday." is marked at "yesterday", not at "Tom's" against "Tom has been here.".
 */
function readingToward(answer: string, reference: string, apostrophes: Apostrophes): Reading {
  const ref = ownedWords(reference, { apostrophes }).words;
  let best: Reading = { apostrophes };
  let most = -1;
  for (const nouns of nounReadings(answer)) {
    const n = align(ownedWords(answer, { apostrophes, nouns }).words, ref).length;
    if (n > most) {
      most = n;
      best = { apostrophes, nouns };
    }
  }
  return best;
}

/**
 * The learner's words against one reference — missing · wrong · extra · moved, in the learner's spelling. A typed
 * answer by default; `spoken` compares without apostrophes, as the grader does for a microphone's answer.
 */
export function diffAnswer(answer: string, reference: string, options: GradeOptions = {}): DiffToken[] {
  const apostrophes: Apostrophes = options.spoken ? "drop" : "keep";
  return lineUp(ownedWords(answer, readingToward(answer, reference, apostrophes)), ownedWords(reference, { apostrophes }));
}

function tagStart(ws: string[]): number {
  let k = ws.length - 1;
  if (ws[k] === "not") k--;
  if (k < 0 || !TAG_SUBJECT.has(ws[k])) return ws.length;
  k--;
  if (ws[k] === "not") k--;
  if (k < 0 || !(TAG_AUX.has(ws[k]) || NEGATED_AUX.test(ws[k]))) return ws.length;
  return k >= 2 ? k : ws.length;
}

/** An odd number of negations left unmatched — the answer says the opposite (a question tag and an answering "No," aside). */
function flipsNegation(answer: string, reference: string, apostrophes: Apostrophes, reading: Reading = { apostrophes }): boolean {
  const user = ownedWords(answer, reading);
  const ref = ownedWords(reference, { apostrophes });
  const { matchedUser, matchedModel } = align(user.words, ref.words);
  const count = (ws: string[], matched: Set<number>, raw: string) => {
    const cut = TAG_RAW.test(raw) || TAG_RAW.test(reference) ? tagStart(ws) : ws.length;
    const answerNo = ANSWER_NO.test(raw);
    return ws.filter((w, i) => i < cut && !matched.has(i) && (NEGATORS.has(w) || NEGATED_AUX.test(w)) && !(i === 0 && w === "no" && answerNo)).length;
  };
  return (count(user.words, matchedUser, answer) + count(ref.words, matchedModel, reference)) % 2 === 1;
}

// ---------------------------------------------------------------------------
// ④ 영작 · ⑤ 처음 보는 문장
// ---------------------------------------------------------------------------

export type ProduceVerdict = "correct" | "typo" | "wrong" | "hangul" | "empty";

export interface ProduceItemLike {
  en: string;
  accept?: readonly string[] | null;
  targets?: readonly (readonly string[])[] | null;
  errorPatterns?: readonly ErrorPatternLike[] | null;
  /**
   * The words of the irregular-verb and irregular-plural table that this item's answers can meet — its answers' table
   * words and the table words one letter away from them. The server attaches them (src/lib/passoffWordForms.ts); a lesson
   * file never holds them. A one-letter difference between two of them is never a typo (differentWord).
   */
  wordForms?: readonly string[] | null;
}

export interface ProduceResult {
  verdict: ProduceVerdict;
  /** the answer that was graded (NFKC, spaces collapsed) */
  answer: string;
  /** the reference it matched, or the closest one when wrong — as the lesson file writes it */
  reference: string;
  /** the learner's words against `reference` (wrong answers only) */
  diff: DiffToken[];
  missingTargets: string[][];
  /** the error pattern the answer hit (a literal one before the accepted answers) */
  pattern: { match: string; hint: string; literal: boolean } | null;
  /** "typo": the one word with a one-letter slip */
  typo: { typed: string; expected: string } | null;
  /** the answer adds or drops a negation against `reference` */
  negationFlip: boolean;
  /**
   * a TYPED wrong answer that is a reference but for a possessive's apostrophe ("my brothers" for "my brother's"):
   * the learner's word, and the grader's own hint — it names the slip, never the answer (작업기록 할 일 9 · 31)
   */
  possessive: { typed: string; hint: string } | null;
}

export interface GradeOptions {
  /** the answer is what the microphone heard — numbers written as digits are read as words on both sides */
  spoken?: boolean;
}

/** Correct, with or without a spelling mark. */
export function isCorrect(result: Pick<ProduceResult, "verdict">): boolean {
  return result.verdict === "correct" || result.verdict === "typo";
}

/**
 * An edit at a word's end that makes another form of it: walk/walks · live/lived · nice/nicer · likes/liked.
 * (A spelling rule the lesson teaches — potatoes, stopped, bigger — is a target there, so it is strict anyway.)
 */
function changesEnding(a: string, b: string): boolean {
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (long.length === short.length + 1 && long.startsWith(short) && /[sdr]$/.test(long)) return true;
  return a.length === b.length && a.slice(0, -1) === b.slice(0, -1) && /[sd]$/.test(a) && /[sd]$/.test(b);
}

/*
 * Two forms of one word (forget/forgot · broke/broken · woman/women) or two words of the irregular-verb and plural table
 * (bought/brought · taught/caught) that differ by one letter are never a spelling slip. The table is on the server
 * (src/lib/passoffWordForms.ts); each item brings the table words its answers can meet (`wordForms`, `known` below).
 */

/** Look-alike words a learner mixes up, one letter apart and both real (bought/brought is in the server's word-form table). */
const LOOK_ALIKES = new Set(
  (
    "better,bitter|later,latter|quiet,quite|loose,lose|desert,dessert|cloth,clothe|breath,breathe|advice,advise|" +
    "device,devise|affect,effect|angel,angle|dairy,diary|dairy,daily|board,bored|coarse,course|marry,merry|medal,metal|" +
    "moral,morale|steal,steel|wander,wonder|tired,tried|trail,trial|diner,dinner|super,supper|massage,message|" +
    "human,humane|hole,whole|plain,plane|stationary,stationery|complement,compliment|lightening,lightning|" +
    "clothes,cloths|snack,snake|angle,ankle|coast,cost|sweat,sweet|price,prize|place,plate|glass,grass|flight,fright|" +
    "flesh,fresh|blush,brush|clown,crown|flame,frame|raise,rise|word,world|quit,quite"
  )
    .split("|")
    .map((pair) => pair.split(",").sort().join(",")),
);

/**
 * Two different words, or two forms of one word — the whole words, or their ends after a shared start
 * (overtake/overtaken · fireman/firemen). `known`: the item's word forms (ProduceItemLike.wordForms).
 */
function differentWord(a: string, b: string, known: ReadonlySet<string>): boolean {
  if (LOOK_ALIKES.has([a, b].sort().join(","))) return true;
  let shared = 0;
  while (shared < a.length && shared < b.length && a[shared] === b[shared]) shared++;
  for (let cut = 0; cut <= shared; cut++) if (known.has(a.slice(cut)) && known.has(b.slice(cut))) return true;
  return false;
}

/**
 * One slip of one letter in a content word of five letters or more — never a target, function or negation
 * word, never an apostrophe (its/it's · one's/ones are grammar; a contraction typed without one is
 * restoreApostrophes'), and never a word that another word or form is one letter away from (differentWord — `known`:
 * the item's word forms).
 */
function isTypo(typed: string, expected: string, strict: Set<string>, known: ReadonlySet<string>): boolean {
  if (expected.length < 5) return false;
  if (/\d/.test(typed) || /\d/.test(expected)) return false;
  if (typed.includes("'") || expected.includes("'")) return false;
  if (FUNCTION_WORDS.has(expected) || FUNCTION_WORDS.has(typed)) return false;
  if (NEGATORS.has(expected) || NEGATORS.has(typed)) return false;
  if (strict.has(expected) || strict.has(typed)) return false;
  if (isPrefixedOpposite(typed, expected)) return false;
  if (editDistance(typed, expected) !== 1) return false;
  if (changesEnding(typed, expected)) return false;
  if (differentWord(typed, expected, known)) return false;
  return true;
}

/**
 * Whether a one-letter slip in `word` (as the reference has it) may count as a typo for this item — for the
 * regression check, which picks such words to prove the typo rule is neither too strict nor too loose.
 */
export function typoEligible(word: string, targets?: readonly (readonly string[])[] | null): boolean {
  const w = normalizeLiteral(word);
  if (w.length < 5 || /\d/.test(w) || w.includes(" ") || w.includes("'")) return false;
  return !FUNCTION_WORDS.has(w) && !NEGATORS.has(w) && !targetWords(targets).has(w);
}

/** A one-letter slip in one word of the learner's `forms` against a reference's comparison form `model`. */
function typoAgainst(
  forms: readonly string[],
  model: string,
  reference: string,
  strict: Set<string>,
  known: ReadonlySet<string>,
  apostrophes: Apostrophes,
): { typed: string; expected: string } | null {
  const modelWords = words(model);
  if (!modelWords.length) return null;
  for (const form of forms) {
    const user = words(form);
    if (user.length !== modelWords.length) continue;
    let at = -1;
    let single = true;
    for (let i = 0; i < user.length; i++) {
      if (user[i] === modelWords[i]) continue;
      if (at >= 0) {
        single = false;
        break;
      }
      at = i;
    }
    if (single && at >= 0 && isTypo(user[at], modelWords[at], strict, known)) {
      const ref = ownedWords(reference, { apostrophes });
      return { typed: user[at], expected: referenceWord(ref, at) };
    }
  }
  return null;
}

const countApostrophes = (s: string) => (s.match(/['’]/g) ?? []).length;

/**
 * Contractions typed without their apostrophe that can only be that contraction. "its" · "were" · "well" ·
 * "ill" · "shell" · "hell" · "wed" · "shed" · "id" · "lets" · "whos" are left out on purpose: each is also a
 * word of its own, and its/it's is exactly the confusion a grammar course marks wrong.
 */
const BARE_CONTRACTIONS: Record<string, string> = {
  im: "i'm", ive: "i've", youre: "you're", youve: "you've", youll: "you'll", youd: "you'd",
  hes: "he's", shes: "she's", thats: "that's", whats: "what's", theres: "there's", heres: "here's",
  weve: "we've", theyre: "they're", theyve: "they've", theyll: "they'll", theyd: "they'd", itll: "it'll",
  dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't", wasnt: "wasn't",
  werent: "weren't", hasnt: "hasn't", havent: "haven't", hadnt: "hadn't", cant: "can't", couldnt: "couldn't",
  wouldnt: "wouldn't", shouldnt: "shouldn't", mustnt: "mustn't", wont: "won't",
};

function restoreApostrophes(text: string): string {
  return text.replace(/[A-Za-z]+/g, (word, offset: number, whole: string) => {
    const fix = BARE_CONTRACTIONS[word.toLowerCase()];
    // a word already next to an apostrophe is part of a contraction as typed ("don't")
    if (!fix || /['’]/.test(whole[offset - 1] ?? "") || /['’]/.test(whole[offset + word.length] ?? "")) return word;
    return word[0] === word[0].toUpperCase() ? fix[0].toUpperCase() + fix.slice(1) : fix;
  });
}

/** One of the learner's forms is the reference's comparison form, or is it but for spacing ("girlfriend" = "girl friend"). */
function sameAs(forms: readonly string[], model: string): boolean {
  return Boolean(model) && forms.some((user) => user === model || sameBySpacing(user, model));
}

/**
 * The answer is right but the learner LEFT OUT an apostrophe — a spelling slip, not a clean answer, and never the
 * other way round (an apostrophe the reference does not have — "It's tail" for "Its tail" — is its/it's confused,
 * which is grammar). Typed: only a contraction that is no other word ("dont", "Hes" — restoreApostrophes).
 * A microphone's answer: also one that is right once every apostrophe is dropped ("its" for "it's" — the
 * recogniser's spelling; grammarGrading.ts's literal pass, extended to a reference that spells it out).
 */
function apostropheSlipIn(answer: string, reference: string, model: string, apostrophes: Apostrophes): boolean {
  if (apostrophes === "drop" && countApostrophes(answer) < countApostrophes(reference)) {
    const lu = normalizeLiteral(answer, "drop");
    const lm = normalizeLiteral(reference, "drop");
    if (lu && (lu === lm || sameBySpacing(lu, lm))) return true;
  }
  const repaired = restoreApostrophes(answer);
  return repaired !== answer && sameAs(userForms(repaired, apostrophes), model);
}

/** The word the learner wrote without its apostrophe ("dont" for "don't"). */
function apostropheSlip(answer: string, reference: string): { typed: string; expected: string } {
  const bare = (t: string) => t.replace(/^[("“‘'[]+/, "").replace(/[.,?!;:)"”’'\]]+$/, "");
  const typed = prepare(answer).split(" ").map(bare);
  const repaired = prepare(restoreApostrophes(answer)).split(" ").map(bare);
  if (repaired.length === typed.length) {
    const at = typed.findIndex((t, i) => t !== repaired[i]);
    if (at >= 0) return { typed: typed[at], expected: repaired[at] };
  }
  for (const token of prepare(reference).split(" ").map(bare)) {
    if (!/['’]/.test(token)) continue;
    const without = token.replace(/['’]/g, "").toLowerCase();
    const hit = typed.find((t) => t.toLowerCase() === without);
    if (hit) return { typed: hit, expected: token };
  }
  return { typed: "", expected: "" };
}

/** The grader's own hint for a possessive written without its apostrophe — the kind of slip, not the answer. */
export const POSSESSIVE_HINT = "'~의'를 나타내는 소유격의 아포스트로피(')를 확인해 보세요.";

/**
 * The noun `'s` of a reference (by their place among its noun `'s`) that the item reads as is/has: spelt out, that
 * reference is another of the item's references ("My room's smaller …" — "My room is smaller …"). The others are
 * possessives.
 */
function contractedNounS(reference: string, models: readonly string[], apostrophes: Apostrophes): Set<number> {
  const out = new Set<number>();
  const plain = normalizeForComparison(reference, { apostrophes });
  const n = Math.min(nounSWords(reference).length, MAX_NOUN_S);
  for (let k = 0; k < n; k++) {
    for (const s of ["is", "has"] as const) {
      const form = normalizeForComparison(reference, { apostrophes, s, nouns: 1 << k });
      if (form !== plain && models.includes(form)) out.add(k);
    }
  }
  return out;
}

/**
 * A TYPED answer that is a reference but for the apostrophe of a possessive `'s` — "My room is smaller than my
 * brothers." for "… my brother's." (pg09-2:p7). Still wrong (Toms ≠ Tom's). Only when every difference is such an
 * apostrophe left out: not an apostrophe added ("It's tail" — its/it's is grammar), not a contraction's (its · were),
 * and not a noun `'s` the item reads as is/has ("Jills seen a rainbow" — the item spells it "Jill has seen").
 */
function possessiveSlipIn(answer: string, references: readonly string[], models: readonly string[]): string | null {
  const answerBare = normalizeLiteral(answer, "drop");
  const answerKept = words(normalizeLiteral(answer, "keep"));
  for (const reference of references) {
    if (!answerBare || normalizeLiteral(reference, "drop") !== answerBare) continue;
    const refKept = words(normalizeLiteral(reference, "keep"));
    if (refKept.length !== answerKept.length) continue;
    const nouns = nounSWords(reference);
    const contracted = contractedNounS(reference, models, "keep");
    let slip: string | null = null;
    let possessiveOnly = true;
    for (let i = 0; i < refKept.length && possessiveOnly; i++) {
      if (refKept[i] === answerKept[i]) continue;
      const m = /^([a-z]+)'s$/.exec(refKept[i]);
      // which of the reference's noun `'s` this is: the same word's n-th time
      const nth = refKept.slice(0, i).filter((w) => w === refKept[i]).length;
      const k = nouns.findIndex((w, at) => w === refKept[i] && nouns.slice(0, at).filter((x) => x === w).length === nth);
      if (!m || NOT_NOUN_S.has(m[1]) || answerKept[i] !== `${m[1]}s` || k < 0 || contracted.has(k)) possessiveOnly = false;
      else slip = slip ?? answerKept[i];
    }
    if (possessiveOnly && slip) return slip;
  }
  return null;
}

/** The references of an item: the model answer first, then the accepted answers (blank and repeated ones dropped). */
export function referencesOf(item: ProduceItemLike): string[] {
  const out: string[] = [];
  for (const r of [item.en, ...(item.accept ?? [])]) if (typeof r === "string" && r.trim() && !out.includes(r)) out.push(r);
  return out;
}

/** The reference the answer shares the most words with (its noun `'s` read either way). */
function closest(answer: string, references: string[], apostrophes: Apostrophes): string {
  const readings = nounReadings(answer).map((nouns) => ownedWords(answer, { apostrophes, nouns }));
  let best = { ref: references[0] ?? "", share: -1 };
  for (const reference of references) {
    const ref = ownedWords(reference, { apostrophes });
    for (const user of readings) {
      const share = align(user.words, ref.words).length / Math.max(1, ref.words.length, user.words.length);
      if (share > best.share) best = { ref: reference, share };
    }
  }
  return best.ref;
}

/** Grades one ④ / ⑤ answer (설계 §8 — see the order at the top of this file). */
export function gradeProduce(answerRaw: string, item: ProduceItemLike, options: GradeOptions = {}): ProduceResult {
  const answer = prepare(answerRaw);
  const refsAsWritten = referencesOf(item);
  const base: ProduceResult = {
    verdict: "wrong",
    answer,
    reference: refsAsWritten[0] ?? "",
    diff: [],
    missingTargets: [],
    pattern: null,
    typo: null,
    negationFlip: false,
    possessive: null,
  };
  if (!answer) return { ...base, verdict: "empty" };
  if (hasHangul(answer)) return { ...base, verdict: "hangul" };

  const spoken = Boolean(options.spoken);
  // a typed answer keeps its apostrophes (its ≠ it's); a microphone's cannot have heard them
  const apostrophes: Apostrophes = spoken ? "drop" : "keep";
  const refs = spoken ? refsAsWritten.map(spokenNumbersAsWords) : refsAsWritten;
  // a microphone's answer spelt as the closest reference writes what the recogniser could not tell apart (heardAs)
  const graded = spoken ? heardAs(spokenNumbersAsWords(answer), refs) : answer;
  const models = referenceForms(refs, item.targets, apostrophes);
  const asWritten = (i: number) => refsAsWritten[i] ?? refsAsWritten[0] ?? "";
  const patterns = (item.errorPatterns ?? []).filter((p) => p && typeof p.match === "string" && p.match.trim());
  const missing = missingIn(graded, item.targets, apostrophes);

  // 2. a literal wrong answer, before the accepted ones — typed with or without its apostrophe ("Yes, hes.")
  const keys = new Set([literalKey(answer), literalKey(restoreApostrophes(answer))]);
  const literalHit = patterns.find((p) => p.literal && keys.has(literalKey(p.match))) ?? null;

  if (!literalHit) {
    const forms = userForms(graded, apostrophes);
    // 3. the model answer or an accepted one
    const exact = models.findIndex((model) => sameAs(forms, model));
    if (exact >= 0) return { ...base, verdict: "correct", reference: asWritten(exact) };
    // 4. a spelling slip, only with every target there ("Im" for a lesson on 'm is wrong) — a microphone's
    //    apostrophes aside: the recogniser spelt them, so they are a slip even before the targets
    if (spoken || !missing.length) {
      const bare = refs.findIndex((r, i) => apostropheSlipIn(graded, r, models[i], apostrophes));
      if (bare >= 0) return { ...base, verdict: "typo", reference: asWritten(bare), typo: apostropheSlip(graded, refs[bare]) };
    }
    if (!missing.length) {
      const strict = targetWords(item.targets);
      const known = new Set(item.wordForms ?? []);
      for (let i = 0; i < refs.length; i++) {
        const typo = typoAgainst(forms, models[i], refs[i], strict, known, apostrophes);
        if (typo) return { ...base, verdict: "typo", reference: asWritten(i), typo };
      }
    }
  }

  // 5. wrong — where and why
  const near = closest(graded, refs, apostrophes);
  const nearIndex = Math.max(0, refs.indexOf(near));
  const forms = formsOf(graded, apostrophes);
  const hit = literalHit ?? patterns.find((p) => !p.literal && patternHit(forms, p.match, apostrophes)) ?? null;
  const reading = readingToward(graded, near, apostrophes);
  // a possessive's apostrophe left out — typed only: a recogniser cannot hear one
  const possessive = spoken ? null : possessiveSlipIn(graded, refs, models);
  return {
    ...base,
    verdict: "wrong",
    reference: asWritten(nearIndex),
    diff: lineUp(ownedWords(graded, reading), ownedWords(near, { apostrophes })),
    missingTargets: missing,
    pattern: hit ? { match: hit.match, hint: hit.hint, literal: Boolean(hit.literal) } : null,
    negationFlip: flipsNegation(graded, near, apostrophes, reading),
    possessive: possessive ? { typed: possessive, hint: POSSESSIVE_HINT } : null,
  };
}

// ---------------------------------------------------------------------------
// The school writing score — shown apart, never a pass condition (설계 §0 · §8)
// ---------------------------------------------------------------------------

export interface WritingIssues {
  /** the first letter, "I", or a name the reference capitalises is written in small letters */
  capital: boolean;
  /** the sentence does not end with the reference's mark (? — or . / !) */
  punctuation: boolean;
  /** a spelling slip the grader let through ("typo") */
  spelling: boolean;
}

const firstLetter = (s: string) => (s.match(/[A-Za-z]/) ?? [""])[0];
const isUpper = (c: string) => c !== "" && c === c.toUpperCase() && c !== c.toLowerCase();

/** 서술형 기준 for one graded answer: capital letters, the end mark and spelling, against the reference it matched. */
export function writingIssues(answerRaw: string, result: Pick<ProduceResult, "verdict" | "reference">): WritingIssues {
  const answer = prepare(answerRaw);
  const reference = prepare(result.reference);
  let capital = false;
  const refFirst = firstLetter(reference);
  const ansFirst = firstLetter(answer);
  if (isUpper(refFirst) && ansFirst && !isUpper(ansFirst)) capital = true;
  if (/(^|[^A-Za-z'’])i([^A-Za-z]|$)/.test(answer)) capital = true; // "i am" · "i'm"
  if (!capital) {
    // a word the reference writes with a capital after its first word (Seoul · Monday · I)
    const capitalised = new Set<string>();
    reference.split(" ").forEach((token, index) => {
      const letter = firstLetter(token);
      if (index > 0 && isUpper(letter) && token.replace(/^[^A-Za-z]+/, "").startsWith(letter)) capitalised.add(normalizeLiteral(token));
    });
    answer.split(" ").forEach((token, index) => {
      if (index === 0) return;
      const letter = firstLetter(token);
      if (capitalised.has(normalizeLiteral(token)) && letter && !isUpper(letter)) capital = true;
    });
  }
  const endOf = (s: string) => s.replace(/["'”’)\]\s]+$/, "").slice(-1);
  const refEnd = endOf(reference);
  const ansEnd = endOf(answer);
  const punctuation = refEnd === "?" ? ansEnd !== "?" : refEnd === "." || refEnd === "!" ? ansEnd !== "." && ansEnd !== "!" : false;
  return { capital, punctuation, spelling: result.verdict === "typo" };
}

export interface TwoLineScore {
  total: number;
  /** 문법 정답 — right (a spelling slip allowed) */
  grammar: number;
  /** 서술형 기준 — right with no capital, end-mark or spelling issue */
  written: number;
  capital: number;
  punctuation: number;
  spelling: number;
}

/** "문법 정답 10/12 · 서술형 기준 8/12" and the reasons — counted over the answers the grammar got right. */
export function twoLineScore(entries: readonly { answer: string; result: Pick<ProduceResult, "verdict" | "reference"> }[]): TwoLineScore {
  const score: TwoLineScore = { total: entries.length, grammar: 0, written: 0, capital: 0, punctuation: 0, spelling: 0 };
  for (const { answer, result } of entries) {
    if (!isCorrect(result)) continue;
    score.grammar++;
    const w = writingIssues(answer, result);
    if (w.capital) score.capital++;
    if (w.punctuation) score.punctuation++;
    if (w.spelling) score.spelling++;
    if (!w.capital && !w.punctuation && !w.spelling) score.written++;
  }
  return score;
}

// ---------------------------------------------------------------------------
// ③ 형태 찾기 — tap the tokens (select), pick an option (choice), type a word or two (short)
// ---------------------------------------------------------------------------

export interface SelectItemLike {
  tokens: readonly string[];
  answer: readonly number[];
  optional?: readonly number[] | null;
  labels?: readonly string[] | null;
  /** the label text of each answer token, in `answer` order (one string for all of them) */
  labelAnswer?: string | readonly string[] | null;
}

/** The label an answer token should get, or null (no labels, or not an answer token). */
export function expectedLabel(item: SelectItemLike, tokenIndex: number): string | null {
  if (!item.labels || !item.labels.length) return null;
  const k = item.answer.indexOf(tokenIndex);
  if (k < 0) return null;
  const la = item.labelAnswer;
  if (Array.isArray(la)) return (la as readonly string[])[k] ?? null;
  return typeof la === "string" ? la : null;
}

export interface SelectResult {
  correct: boolean;
  /** answer tokens not picked */
  missed: number[];
  /** picked tokens that are neither answers nor optional */
  wrongPicks: number[];
  /** picked answer tokens with the wrong label (or none) */
  wrongLabels: number[];
}

/**
 * The picked set against the answer set: every answer token, no other token except an optional one (an
 * article next to the noun, a set phrase), and each answer token's label when the item has labels.
 */
export function gradeSelect(item: SelectItemLike, picked: readonly number[], chosenLabels: Readonly<Record<number, string>> = {}): SelectResult {
  const answer = new Set(item.answer);
  const optional = new Set(item.optional ?? []);
  const pickedSet = new Set(picked);
  const missed = item.answer.filter((i) => !pickedSet.has(i));
  const wrongPicks = [...pickedSet].filter((i) => !answer.has(i) && !optional.has(i)).sort((a, b) => a - b);
  const wrongLabels = item.labels && item.labels.length ? item.answer.filter((i) => pickedSet.has(i) && chosenLabels[i] !== expectedLabel(item, i)) : [];
  return { correct: !missed.length && !wrongPicks.length && !wrongLabels.length, missed, wrongPicks, wrongLabels };
}

export function gradeChoice(item: { answer: number }, index: number): boolean {
  return Number.isInteger(index) && index === item.answer;
}

export type ShortVerdict = "correct" | "wrong" | "hangul" | "empty";

/**
 * A word or two typed into a short blank: any listed answer, case, punctuation and contractions aside — the
 * apostrophes kept, as in ④ ("doesnt" is not "doesn't" here: the blank asks for that form).
 */
export function gradeShort(item: { answer: readonly string[] }, text: string): ShortVerdict {
  const typed = prepare(text);
  if (!typed) return "empty";
  if (hasHangul(typed)) return "hangul";
  const forms = userForms(typed, "keep");
  const literal = normalizeLiteral(typed);
  return (item.answer ?? []).some((a) => {
    const m = normalizeForComparison(a);
    return Boolean(m) && (forms.includes(m) || normalizeLiteral(a) === literal);
  })
    ? "correct"
    : "wrong";
}
