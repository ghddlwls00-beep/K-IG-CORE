/**
 * Grading for the GRAMMAR composition exam (Step 4) and the Step 1 self-check.
 *
 * PURE AND IMPORT-FREE ON PURPOSE: `docs/qa-2026-09-15/scripts/verify/
 * verify-grammar-grading.cjs` transpiles this file alone and grades the exact
 * inputs the launch audit typed, so a change here is measured against those
 * before it ships.
 *
 * WHAT THE AUDIT FOUND (CNT-02). The grader compared words after stripping
 * apostrophes, so "I'm Korean." became `im korean` against the model's
 * `i am korean` and scored 0. It also gave 70 points to any answer sharing 70%
 * of the model's words in order, so "He folded the napkin into a banana." was
 * "almost right". And the textbook's own alternative answers (KIG-006 put them
 * in `alternatives`) were never consulted, so "I will try again" scored 70
 * against a model that says "I would".
 *
 * THREE RULES NOW:
 *   1. Contractions are expanded on BOTH sides before comparing, so a standard
 *      spelling never loses to the textbook's choice ("cannot" = "can not").
 *   2. An answer is graded against the model AND every alternative; the best
 *      grade wins.
 *   3. Partial credit requires that every word the learner got wrong is either
 *      a function word (a, the, in, will, would …) or a near-miss spelling of
 *      the model's word. Swapping a content word for an unrelated one
 *      ("triangle" → "banana") is incorrect, not partial. Typos keep their
 *      partial credit: "triangel" is one transposition from "triangle".
 *
 * AND ONE MORE (7-4 f ②, owner decision 2026-09-23): an answer that is negative
 * where the model is positive, or the other way round, is incorrect — see
 * `flipsNegation`. The same goes for a word turned into its opposite by a
 * prefix ("possible" for "impossible", owner decision 2026-09-24) — see
 * `isPrefixedOpposite`.
 */

export type AnswerGrade = "exact" | "partial" | "incorrect";

const GRADE_RANK: Record<AnswerGrade, number> = { exact: 2, partial: 1, incorrect: 0 };

/**
 * The 1.15 length cap is what stops a learner who has seen the answer from
 * padding it past the ratio check: measured against all 6,236 real model
 * answers, a 1.4 cap let 476 padded answers through, while 1.15 allows 2 and
 * keeps all 5,312 typo cases.
 */
export const MAX_ANSWER_LEN_RATIO = 1.15;

/**
 * Standard contractions and their full forms, applied after lower-casing and
 * before punctuation is removed. `'d` is handled separately by `expandWouldHad`,
 * because it is "would" or "had" and only the next word says which.
 */
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
  [/\b(he|she|it|that|this|there|what|who|where|here|how|when)'s\b/g, "$1 is"],
  [/\blet's\b/g, "let us"],
];

/**
 * BUG-010 — `'d` stands for "would" or "had", and the word after it says which:
 * "I'd like", "I'd have called", "I'd rather" can only be "would"; "I'd been",
 * "I'd known", "You'd better" can only be "had". Leaving every `'d` alone (the
 * old rule) failed both directions: "I would like" against the model's "I'd
 * like" (4 answers) and "I'd like" against a model that spells it out (68).
 *
 * The rule never guesses:
 *   - only after a pronoun subject (`what'd` is usually "what did");
 *   - a verb whose past participle is spelled like its base ("read", "come",
 *     "put") leaves the model's `'d` as written. A learner's `'d` there is a
 *     correct contraction of both, so `gradeAnswer` tries each for the learner;
 *   - main-verb "had" ("I had a dream") has no standard contraction, so "I'd a
 *     dream" expands to "would" and stays below full marks.
 */
const D_SUBJECT = /\b(i|you|he|she|it|we|they|who|that|there)'d\b/g;
const D_SKIP = new Set([
  "not", "never", "just", "already", "really", "also", "always", "ever", "once", "much",
  "probably", "certainly", "surely", "still", "often", "soon", "sometimes", "usually",
  "definitely", "only", "all", "both", "hardly", "actually",
]);
/** Base form spelled like the past participle — the model's `'d` cannot be resolved. */
const D_EITHER = new Set([
  "come", "become", "overcome", "run", "read", "put", "cut", "let", "set", "hit", "hurt",
  "shut", "cost", "quit", "spread", "bet", "burst", "cast", "broadcast", "forecast", "upset",
  "shed", "wed", "split", "thrust", "bid", "rid", "slit", "beat", "wound", "fit",
]);
/** Words that only follow "had": better/best/been and irregular past participles. */
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
/** Base forms that end in "ed", so the ending does not mark a past participle. */
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

/**
 * Expands a pronoun's `'d` by the next word (after adverbs such as "never").
 * `either` says what an unresolvable `'d` becomes; undefined keeps it as written.
 * A `'d` at the end of the text or before punctuation is kept as written.
 */
function expandWouldHad(text: string, either?: "would" | "had"): string {
  return text.replace(D_SUBJECT, (match: string, subject: string, offset: number, whole: string) => {
    const rest = whole.slice(offset + match.length);
    if (!/^\s+[a-z]/.test(rest)) return match;
    const words = rest.trim().split(/\s+/).map((w) => w.replace(/[^a-z]/g, ""));
    let k = 0;
    while (k < words.length && D_SKIP.has(words[k])) k++;
    if (!words[k]) return match;
    const aux = auxiliaryFor(words[k]);
    if (aux === "either") return either ? `${subject} ${either}` : match;
    return `${subject} ${aux}`;
  });
}

/**
 * Words whose substitution is a grammar slip rather than a different sentence.
 * A wrong one of these still earns partial credit, as it always did; a wrong
 * content word no longer does.
 */
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

/** Function words that turn a sentence into its opposite. */
const NEGATIONS = new Set(["not", "never", "no", "nor"]);

/**
 * 7-4 f ② — owner decision 2026-09-23 ("뜻이 반대면 0점으로 가자"): an answer
 * whose sentence is negative where the model's is positive, or the other way
 * round, says the opposite and earns nothing. Before, a dropped or added "not"
 * was just one wrong function word, so "He is happy." scored 70 against "He is
 * not happy." whenever the sentence was long enough to pass the length cap.
 *
 * Judged on the words the alignment could NOT match, so a negation written
 * differently on both sides keeps its grade: "I have no money" / "I don't have
 * any money", "never" / "not ever", and the "All … not" alternatives kept by
 * decision 5 B. "isn't" / "is not" are already equal after expansion; the
 * apostrophe-less "isnt" of the literal pass counts as a negation too, and a
 * typo of the negation ("nto") is still the negation.
 *
 * Not counted:
 *   - a question tag (", isn't he?", ", are they not?"): the tag is the mirror of
 *     the sentence, so a wrong tag is a grammar slip, not the opposite meaning;
 *   - a sentence-initial "No" answering a question ("No, it is not cold." against
 *     "It is not cold." grades as before);
 *   - "or not" ("whether to go or not" = "whether to go"), "no matter",
 *     "no sooner", "no doubt".
 */
const NEGATORS = new Set(["not", "no", "never", "nobody", "nothing", "none", "neither", "nor", "nowhere", "noone", "cannot"]);
const NEGATED_AUX = /^(?:is|are|was|were|do|does|did|have|has|had|could|would|should|must|need|might|ca|wo|sha|ai)nt$/;
/** "No," with its comma is read from the raw text; typed without one, these next words still mark it. */
const ANSWER_NO = /^\s*no\s*[,.!;:]/i;
const ANSWER_NO_NEXT = new Set([
  "i", "you", "he", "she", "it", "we", "they", "this", "that", "these", "those", "there", "here",
  "my", "your", "his", "our", "their", "a", "an", "the",
  "am", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must",
  "not", "never", "thank", "thanks", "please",
]);
const NO_BUT_NOT_NEGATING = new Set(["matter", "sooner", "doubt"]);
/** A question tag after its comma: ", isn't he?" · ", are they not?" · ", shall we?". */
const TAG_RAW = /,\s*[a-z]+(?:n['’]t)?\s+(?:i|you|he|she|it|we|they|there|one)(?:\s+not)?\s*[?.!]*\s*$/i;
/** What the raw text says before punctuation is stripped: an answering "No," · a question tag. */
type RawCues = { userNo: boolean; modelNo: boolean; userTag: boolean; modelTag: boolean };
const TAG_AUX = new Set([
  "am", "is", "are", "was", "were", "do", "does", "did", "have", "has", "had",
  "can", "could", "will", "would", "shall", "should", "may", "might", "must", "need", "ought",
]);
const TAG_SUBJECT = new Set(["i", "you", "he", "she", "it", "we", "they", "there", "one"]);
/**
 * Real words one letter away from a negation. Typed where the negation belongs they are
 * another word, not a typo of it: "ever" for "never" and "either" for "neither" say
 * the opposite; "now", "lot" and "one" are different words.
 */
const NOT_A_NEGATION_TYPO = new Set([
  "ever", "either", "one", "now", "lot", "hot", "got", "dot", "pot", "rot", "cot", "jot", "tot",
  "nut", "net", "nod", "note", "knot", "nit", "bone", "gone", "done", "nine", "nope", "noon",
  "for", "fever", "lever", "sever",
]);

function negatesAt(words: string[], index: number, answerNo: boolean): boolean {
  const word = words[index];
  if (!NEGATORS.has(word) && !NEGATED_AUX.test(word)) return false;
  if (word === "nor" && words.slice(0, index).includes("neither")) return false; // neither … nor is one negation
  if (word === "not" && words[index - 1] === "or" && words[index + 1] !== "not") {
    // "whether to go or not" = "whether to go"; "either you or not I" is a negation.
    const before = words.slice(0, index);
    if (index === words.length - 1 || before.includes("whether") || before.includes("if")) return false;
  }
  if (word === "no") {
    const next = words[index + 1];
    if (index === 0 && (answerNo || next === undefined || ANSWER_NO_NEXT.has(next))) return false;
    if (NO_BUT_NOT_NEGATING.has(next)) return false;
  }
  return true;
}

/** Index where a trailing question tag begins ("… is not he", "… is he not"), or words.length. */
function tagStart(words: string[]): number {
  let k = words.length - 1;
  if (words[k] === "not") k--;
  if (k < 0 || !TAG_SUBJECT.has(words[k])) return words.length;
  k--;
  if (words[k] === "not") k--;
  if (k < 0 || !(TAG_AUX.has(words[k]) || NEGATED_AUX.test(words[k]))) return words.length;
  return k >= 2 ? k : words.length; // a question like "Where is he" is not a tag
}

/**
 * True when the words left unmatched add or remove a negation: an odd number of
 * unmatched negations between the two sides. One on each side ("no money" /
 * "not … any money") is the same meaning; one more on either side is the opposite.
 */
function flipsNegation(
  userWords: string[],
  modelWords: string[],
  matchedUser: Set<number>,
  matchedModel: Set<number>,
  cues: RawCues,
): boolean {
  const leftUser = userWords.map((_, i) => i).filter((i) => !matchedUser.has(i));
  const leftModel = modelWords.map((_, i) => i).filter((i) => !matchedModel.has(i));
  // A tag is read only where the raw text has one; "How many boys were there?" has none.
  // The learner may leave out the comma, so the model's tag also marks the learner's.
  const userTag = cues.userTag || cues.modelTag ? tagStart(userWords) : userWords.length;
  const modelTag = cues.modelTag ? tagStart(modelWords) : modelWords.length;
  const userNeg = leftUser.filter((i) => i < userTag && negatesAt(userWords, i, cues.userNo));
  const modelNeg = leftModel.filter((i) => i < modelTag && negatesAt(modelWords, i, cues.modelNo));
  if (userNeg.length === 0 && modelNeg.length === 0) return false;
  // A misspelt negation in the same place on the other side ("nto" for "not") is still
  // that negation and pairs it off. A real word never does: "does" for "doesnt" is the
  // negation removed, "ever" for "never" the opposite (FUNCTION_WORDS, TAG_AUX and
  // NOT_A_NEGATION_TYPO). The place is the gap between the same two matched words.
  const gapOf = (matched: Set<number>, i: number) => [...matched].filter((m) => m < i).length;
  const spare = (left: number[], words: string[], negs: number[], matched: Set<number>) =>
    left.filter((i) => !negs.includes(i)).map((i) => ({ word: words[i], gap: gapOf(matched, i) }));
  const unpaired = (negs: number[], words: string[], matched: Set<number>, pool: { word: string; gap: number }[]) =>
    negs.filter((i) => {
      const gap = gapOf(matched, i);
      const k = pool.findIndex(
        (p) =>
          p.gap === gap &&
          !TAG_AUX.has(p.word) &&
          !FUNCTION_WORDS.has(p.word) &&
          !NOT_A_NEGATION_TYPO.has(p.word) &&
          editDistance(p.word, words[i]) <= 1,
      );
      if (k < 0) return true;
      pool.splice(k, 1);
      return false;
    }).length;
  const user = unpaired(userNeg, userWords, matchedUser, spare(leftModel, modelWords, modelNeg, matchedModel));
  const model = unpaired(modelNeg, modelWords, matchedModel, spare(leftUser, userWords, userNeg, matchedUser));
  return (user + model) % 2 === 1;
}

/**
 * Lower-case, punctuation and apostrophes removed — contractions left as written.
 *
 * GRADE-01 — the curly double quotes are normalised to the straight one before
 * punctuation is stripped. Only `’‘` were, so an answer typed on an iPhone or a
 * Mac, where the keyboard turns `"` into `“ ”` by itself, kept a character the
 * model answer did not have: measured over every item, 12 answers containing a
 * double quote came back 11 partial and 1 wrong (gh2-027 #12) for a difference
 * the learner cannot see and did not choose. `„` is the opening form some
 * keyboards produce.
 */
function normalizeLiteral(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[.,?!;:"'()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForComparison(text: string, eitherDAs?: "would" | "had"): string {
  let normalized = expandWouldHad(text.toLowerCase().replace(/[’‘]/g, "'"), eitherDAs);
  for (const [pattern, replacement] of CONTRACTIONS) {
    normalized = normalized.replace(pattern, replacement);
  }
  return normalizeLiteral(normalized);
}

/** Optimal-string-alignment distance: a transposition ("teh") counts as one edit. */
function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const d: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i++) d[i][0] = i;
  for (let j = 0; j < cols; j++) d[0][j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * A negative prefix makes the opposite word, not a misspelling of it (관문 15 결정 A 흠 ②, owner
 * decision 2026-09-24 '뜻이 반대면 0점'). "impossible" is two letters from "possible", and on words of
 * eight letters or more two edits counted as a typo, so "Isn't it possible?" earned 70 points against
 * "Isn't it impossible?" — as did "proper" for "improper" and "expensive" for "inexpensive". A real
 * typo of the prefixed word ("inexpensiv") is not the bare word, so it keeps its partial credit.
 */
const OPPOSITE_PREFIXES = ["dis", "non", "im", "in", "il", "ir", "un"];
function isPrefixedOpposite(a: string, b: string): boolean {
  return OPPOSITE_PREFIXES.some((prefix) => a === prefix + b || b === prefix + a);
}

/** A misspelling or inflection of the same word, as opposed to a different word. */
function looksLikeSameWord(typed: string, expected: string): boolean {
  if (typed === expected) return true;
  if (isPrefixedOpposite(typed, expected)) return false;
  const longest = Math.max(typed.length, expected.length);
  if (editDistance(typed, expected) <= (longest >= 8 ? 2 : 1)) return true;
  // "studying" / "study", "triangles" / "triangle": same stem, different ending.
  const stem = Math.min(typed.length, expected.length, 5);
  return stem >= 4 && typed.slice(0, stem) === expected.slice(0, stem);
}

/**
 * Longest common subsequence of two word arrays, with the indices that were
 * matched on each side so the leftovers can be compared word for word.
 *
 * LCS rather than a set intersection because a set throws away both order and
 * multiplicity: "a a a a" and a word-order scramble would both score as a full
 * match. LCS can never exceed the model length, so padding gains nothing.
 */
function align(userWords: string[], modelWords: string[]) {
  const dp = Array.from({ length: userWords.length + 1 }, () =>
    new Array<number>(modelWords.length + 1).fill(0),
  );
  for (let i = 1; i <= userWords.length; i++) {
    for (let j = 1; j <= modelWords.length; j++) {
      dp[i][j] =
        userWords[i - 1] === modelWords[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  const matchedUser = new Set<number>();
  const matchedModel = new Set<number>();
  let i = userWords.length;
  let j = modelWords.length;
  while (i > 0 && j > 0) {
    if (userWords[i - 1] === modelWords[j - 1] && dp[i][j] === dp[i - 1][j - 1] + 1) {
      matchedUser.add(i - 1);
      matchedModel.add(j - 1);
      i--;
      j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return { length: dp[userWords.length][modelWords.length], matchedUser, matchedModel };
}

/**
 * Grades one English composition answer against one reference sentence.
 *
 * exact      the same sentence once contractions and punctuation are normalised
 * partial    >= 70% of the model's words appear in order, the input is no more
 *            than 15% longer than the model, and every wrong word is a function
 *            word or a near-miss spelling — see the rules above
 * incorrect  everything else, including any single-word input
 *
 * Both spellings of a contraction are tried and the better grade wins. Expanded
 * is what lets "I'm" equal "I am"; literal is what keeps a typo INSIDE a
 * contraction a typo: "Dind't" cannot be expanded, and against "did not" it
 * looks like an unrelated word, while against "didnt" it is one transposition.
 * Measured over all 2,750 GRAMMAR model answers, expanded-only turned 113 such
 * typos from partial into incorrect.
 */
export function gradeAnswer(userRaw: string, modelRaw: string): AnswerGrade {
  const model = normalizeForComparison(modelRaw);
  const cues: RawCues = {
    userNo: ANSWER_NO.test(userRaw),
    modelNo: ANSWER_NO.test(modelRaw),
    userTag: TAG_RAW.test(userRaw),
    modelTag: TAG_RAW.test(modelRaw),
  };
  // BUG-010: a learner's "I'd read" is a correct contraction of both "I had read"
  // and "I would read", so both readings are tried (the Set drops duplicates).
  let expanded: AnswerGrade = "incorrect";
  const userForms = new Set([
    normalizeForComparison(userRaw),
    normalizeForComparison(userRaw, "would"),
    normalizeForComparison(userRaw, "had"),
  ]);
  for (const user of userForms) {
    const grade = gradeNormalized(user, model, cues);
    if (GRADE_RANK[grade] > GRADE_RANK[expanded]) expanded = grade;
  }
  if (expanded === "exact") return expanded;
  const literal = gradeNormalized(normalizeLiteral(userRaw), normalizeLiteral(modelRaw), cues);
  return GRADE_RANK[literal] > GRADE_RANK[expanded] ? literal : expanded;
}

/**
 * Joined forms whose split form is a DIFFERENT expression, not another
 * spelling: "may be" is a verb phrase, "maybe" an adverb; "every day" is
 * adverbial, "everyday" an adjective. Writing one for the other is a grammar
 * mistake in a grammar course, so it keeps partial credit rather than full.
 */
const MEANING_CHANGING_JOINS = new Set([
  "maybe", "everyday", "sometime", "sometimes", "anyone", "anybody", "already",
  "altogether", "awhile", "someone", "somebody", "into", "onto", "everyone",
  "everybody", "anyway", "someday", "nobody", "apart", "alright", "alot",
  "infact", "nowhere", "somewhat", "whatever", "whenever", "however",
]);

/**
 * Two answers that differ only in where the spaces fall — "girlfriend" against
 * the textbook's "girl friend" (CNT-03). The textbook's wording is left as it
 * is; the grader simply stops failing the dictionary spelling. Returns null
 * when the difference is more than spacing.
 */
function gradeSpacingOnly(user: string, model: string): AnswerGrade | null {
  if (user.replace(/ /g, "") !== model.replace(/ /g, "")) return null;
  const userWords = new Set(user.split(" "));
  const modelWords = new Set(model.split(" "));
  const changed = [
    ...[...userWords].filter((w) => !modelWords.has(w)),
    ...[...modelWords].filter((w) => !userWords.has(w)),
  ];
  return changed.some((w) => MEANING_CHANGING_JOINS.has(w)) ? "partial" : "exact";
}

function gradeNormalized(user: string, model: string, cues: RawCues): AnswerGrade {
  if (!user) return "incorrect";
  if (user === model) return "exact";
  const spacing = gradeSpacingOnly(user, model);
  if (spacing) return spacing;

  const userWords = user.split(" ").filter(Boolean);
  const modelWords = model.split(" ").filter(Boolean);
  // The >1-word floor is what stops "a" from scoring 70 points.
  if (modelWords.length === 0 || userWords.length <= 1) return "incorrect";

  const { length, matchedUser, matchedModel } = align(userWords, modelWords);
  if (flipsNegation(userWords, modelWords, matchedUser, matchedModel, cues)) return "incorrect";
  if (length / modelWords.length < 0.7) return "incorrect";
  if (userWords.length > modelWords.length * MAX_ANSWER_LEN_RATIO) {
    // 6단계 G11 (결정표 2번, owner decision 2026-09-23): on a short model the cap is
    // crossed by a single word — 65% of the models have six words or fewer — so
    // one extra "the" scored 0 where the same slip on a long sentence scores 70.
    // Exactly one surplus word is let through, and only a function word; a
    // content word or a second extra word still hits the cap. A negation is not
    // let through (3차 점검, 2026-09-23): "He isn't Japanese." against "He is
    // Japanese." says the opposite, and the owner was asked about small words
    // like the and a.
    const surplus = userWords.filter((_, index) => !matchedUser.has(index));
    const oneFunctionWordMore =
      userWords.length === modelWords.length + 1 && surplus.length === 1 &&
      FUNCTION_WORDS.has(surplus[0]) && !NEGATIONS.has(surplus[0]);
    if (!oneFunctionWordMore) return "incorrect";
  }

  // Pair the words the learner got wrong with the words the model wanted, in
  // order. "into a banana" against "into a triangle" pairs banana ↔ triangle.
  const wrongUser = userWords.filter((_, index) => !matchedUser.has(index));
  const missingModel = modelWords.filter((_, index) => !matchedModel.has(index));
  const pairs = Math.min(wrongUser.length, missingModel.length);
  for (let k = 0; k < pairs; k++) {
    const typed = wrongUser[k];
    const expected = missingModel[k];
    if (FUNCTION_WORDS.has(typed) && FUNCTION_WORDS.has(expected)) continue;
    if (looksLikeSameWord(typed, expected)) continue;
    return "incorrect";
  }
  return "partial";
}

/** The best grade an answer earns against the model answer and its alternatives. */
export function gradeAgainstReferences(userRaw: string, references: string[]): AnswerGrade {
  let best: AnswerGrade = "incorrect";
  for (const reference of references) {
    if (!reference) continue;
    const grade = gradeAnswer(userRaw, reference);
    if (GRADE_RANK[grade] > GRADE_RANK[best]) best = grade;
    if (best === "exact") break;
  }
  return best;
}
