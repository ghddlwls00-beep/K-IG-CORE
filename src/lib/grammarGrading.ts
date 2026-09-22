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
 * before punctuation is removed. `'d` is left alone: it is "would" or "had"
 * and guessing wrong would turn a right answer into a wrong one.
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

export function normalizeForComparison(text: string): string {
  let normalized = text.toLowerCase().replace(/[’‘]/g, "'");
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

/** A misspelling or inflection of the same word, as opposed to a different word. */
function looksLikeSameWord(typed: string, expected: string): boolean {
  if (typed === expected) return true;
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
  const expanded = gradeNormalized(normalizeForComparison(userRaw), normalizeForComparison(modelRaw));
  if (expanded === "exact") return expanded;
  const literal = gradeNormalized(normalizeLiteral(userRaw), normalizeLiteral(modelRaw));
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

function gradeNormalized(user: string, model: string): AnswerGrade {
  if (!user) return "incorrect";
  if (user === model) return "exact";
  const spacing = gradeSpacingOnly(user, model);
  if (spacing) return spacing;

  const userWords = user.split(" ").filter(Boolean);
  const modelWords = model.split(" ").filter(Boolean);
  // The >1-word floor is what stops "a" from scoring 70 points.
  if (modelWords.length === 0 || userWords.length <= 1) return "incorrect";

  const { length, matchedUser, matchedModel } = align(userWords, modelWords);
  if (length / modelWords.length < 0.7) return "incorrect";
  if (userWords.length > modelWords.length * MAX_ANSWER_LEN_RATIO) return "incorrect";

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
