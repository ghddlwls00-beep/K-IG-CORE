/**
 * Web Speech API (STT) & the speaking check's word-recognition score.
 *
 * Provides native, zero-server-cost browser speech recognition and scores what the recogniser
 * heard against the target sentence — which words came back, in order. It does not judge
 * pronunciation (STU-L13): a recogniser can return the right word for a poor pronunciation and
 * the wrong one for a good one.
 *
 * Supported in Chrome, Safari, Edge, Android Chrome, and iOS Safari.
 */

// Define SpeechRecognition interface for TypeScript
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export interface WordAnalysis {
  word: string;
  matched: boolean;
}

export interface EvaluationResult {
  score: number; // 0 to 100
  rating: "excellent" | "good" | "almost" | "poor";
  ratingLabel: string;
  feedback: string;
  transcript: string;
  targetText: string;
  wordAnalysis: WordAnalysis[];
  /**
   * Target words shown green — the same count as the green chips (2026-09-27: it counted only exact
   * matches, so a word heard one letter off was green but missing from '단어 일치 N/M').
   */
  matchedCount: number;
  totalWords: number;
  /** Spoken words that paired with no target word — a restart, an added word. 0 for a clean reading. */
  extraWords: number;
}

/** Figure/en/em dashes, the horizontal bar and the ellipsis: a break between words. */
const WORD_BREAKS = /[‒-―…]/g;
/** A hyphen standing alone between spaces (" - ", " -- ") is a dash, not part of a word. */
const LONE_HYPHENS = /(^|\s)-{1,2}(?=\s|$)/g;

/**
 * Normalizes case and punctuation for fair comparison. Apostrophes inside a word stay (don't,
 * i'm, o'clock) so that contractions can still be told apart; quote-like ones at a word's edge go.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Curly quotes and apostrophes as the recogniser's straight ones (“junk” → junk, don’t → don't),
    // and a dash or an ellipsis as a word break: "interest—the subject—is" is three words, not one
    // that no recogniser returns. A perfect reading of 13 READING sentences scored 55-99 (6-1274).
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(WORD_BREAKS, " ")
    .replace(LONE_HYPHENS, " ")
    .replace(/[.,?!;:"()]/g, "")
    .replace(/(^|\s)'+|'+(?=\s|$)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A contraction and its full form. The eighteen rules that used to sit in normalizeText never
 * fired — they ran after every apostrophe had been stripped, so "i'm" was already "im" — and
 * "I am happy to see you" scored 31 against "I'm happy to see you" (6N-001, 3차 점검 #10).
 */
const CONTRACTIONS: [string, string[]][] = [
  ["i'm", ["i", "am"]], ["you're", ["you", "are"]], ["he's", ["he", "is"]], ["she's", ["she", "is"]],
  ["it's", ["it", "is"]], ["we're", ["we", "are"]], ["they're", ["they", "are"]],
  ["don't", ["do", "not"]], ["doesn't", ["does", "not"]], ["didn't", ["did", "not"]],
  ["can't", ["cannot"]], ["couldn't", ["could", "not"]], ["won't", ["will", "not"]],
  ["wouldn't", ["would", "not"]], ["shouldn't", ["should", "not"]], ["hasn't", ["has", "not"]],
  ["haven't", ["have", "not"]], ["hadn't", ["had", "not"]], ["isn't", ["is", "not"]],
  ["aren't", ["are", "not"]], ["wasn't", ["was", "not"]], ["weren't", ["were", "not"]],
];

const hasRun = (words: string[], run: string[]) =>
  words.some((_, i) => run.every((w, k) => words[i + k] === w));

function replaceRun(words: string[], from: string[], to: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < words.length; ) {
    if (from.every((w, k) => words[i + k] === w)) {
      out.push(...to);
      i += from.length;
    } else {
      out.push(words[i]);
      i++;
    }
  }
  return out;
}

/**
 * Brings the spoken words to the form the target uses — "i am" when the target says "I am",
 * "i'm" when it says "I'm" — so either way of saying it matches. Only the spoken side changes:
 * the target's words are also the words shown under the result and must keep their count.
 * A target that uses both forms ("It is located … it's almost") is left alone: which spoken
 * "it is" meant which cannot be told, and changing them all marked a perfect reading down.
 */
function matchContractions(spoken: string[], target: string[]): string[] {
  let out = spoken;
  for (const [short, full] of CONTRACTIONS) {
    const targetShort = target.includes(short);
    const targetFull = hasRun(target, full);
    if (targetShort && !targetFull && hasRun(out, full)) out = replaceRun(out, full, [short]);
    else if (targetFull && !targetShort && out.includes(short)) out = replaceRun(out, [short], full);
  }
  return out;
}

/**
 * Levenshtein distance between two strings.
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/**
 * A place in a target that the learner fills with their own words — "I go to [[school name]]."
 * (STU-L03 (c): STUDENT's '(school name)' · '(name)' blanks). In the alignment a slot stands for
 * 1 to 4 spoken words of any content and counts as ONE target word: green when it took 1-4 words,
 * red when the learner said nothing there. The words it took are left out of charSim and lenRatio
 * on both sides, so a three-word school name costs nothing. A target without [[ ]] scores as if
 * slots did not exist.
 */
const SLOT = /\[\[([^\]]*)\]\]/g;
/**
 * Stands in for a slot while the target is normalised: U+E000, a private-use character no transcript
 * has. Built from its code so the source holds no invisible character (if one were lost, every
 * number in a sentence would become a slot).
 */
const SLOT_MARK = String.fromCharCode(0xe000);
/** A normalised token that is slot number N: the mark, then N. */
const SLOT_TOKEN = new RegExp("^" + SLOT_MARK + "([0-9]+)");
/** Everything up to and including a slot's mark and number in a shown word — what is left is its punctuation. */
const SLOT_HEAD = new RegExp("^[^" + SLOT_MARK + "]*" + SLOT_MARK + "[0-9]+");
const SLOT_MAX_WORDS = 4;

/**
 * Credit for a word heard one letter off when both words have 5+ letters (B01). The old rule asked
 * 5+ letters of the target word only, so "since" could take "sine"; the credit, 0.7, is the old one.
 */
const NEAR_CREDIT = 0.7;
/*
 * Tie-breaks inside the alignment. Real credits differ by at least 0.1 (sums of 1 and 0.7), and these
 * add up to far less, so they only choose between alignments with the same credit:
 *   TIE_REAL   a target word matched beats a slot taking that same spoken word ("… is [[name]], and"
 *              said without a name keeps 'and' green and the slot red);
 *   TIE_ABSORB a slot takes every left-over word it can, up to 4 ("hanbit elementary school");
 *   TIE_MERGE  a one-to-one match beats a split or a join.
 */
const TIE_REAL = 1e-4;
const TIE_ABSORB = 1e-7;
const TIE_MERGE = 1e-8;

type AlignStep =
  | { kind: "skipTarget" }
  | { kind: "skipSpoken" }
  | { kind: "word"; credit: number }
  | { kind: "split"; k: number }
  | { kind: "join"; k: number }
  | { kind: "slot"; k: number };

/** What one target word was paired with. */
type AlignLink =
  | { kind: "none" }
  | { kind: "word"; credit: number }
  | { kind: "split" }
  | { kind: "join" }
  | { kind: "slot"; from: number; to: number };

const SKIP_TARGET: AlignStep = { kind: "skipTarget" };
const SKIP_SPOKEN: AlignStep = { kind: "skipSpoken" };

/** 1 for the same word, 0.7 for one letter off (both 5+ letters), else 0. */
function wordCredit(t: string, s: string): number {
  if (t === s) return 1;
  if (t.length >= 5 && s.length >= 5 && Math.abs(t.length - s.length) <= 1 && levenshteinDistance(t, s) === 1) {
    return NEAR_CREDIT;
  }
  return 0;
}

/**
 * B01 (STU-U21): the best order-preserving pairing of the target's words with the spoken words over
 * the WHOLE sentence — dynamic programming like a longest common subsequence. The same word earns 1,
 * a word one letter off 0.7, and skipping a target word or a spoken word 0. It replaces a search that
 * looked only two spoken words ahead of the last match: two unmatched spoken words (a restart, a name
 * heard as two words, two short words misheard) froze it, and every later target word went red —
 * "First of all, first of all, thank you …" scored 44 with 10 of 13 words red, while leaving out the
 * last three words scored 75.
 * Two more pairings, both exact: a target word the recogniser split into 2-3 words ("Gyeongju" heard as
 * "gyeong ju") and 2-3 target words it heard as one ("every day" as "everyday"); each target word
 * covered earns 1. Words are compared without apostrophes (as before) and without hyphens.
 */
function alignWords(
  target: string[],
  slot: boolean[],
  spoken: string[],
): { links: AlignLink[]; used: boolean[] } {
  const n = target.length;
  const m = spoken.length;
  const W = m + 1;
  const best = new Float64Array((n + 1) * W);
  const steps: AlignStep[] = new Array((n + 1) * W);
  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (i === 0 && j === 0) continue;
      let value = -Infinity;
      let step: AlignStep = SKIP_TARGET;
      const offer = (v: number, s: AlignStep) => {
        if (v > value) {
          value = v;
          step = s;
        }
      };
      if (i > 0) offer(best[(i - 1) * W + j], SKIP_TARGET);
      if (j > 0) offer(best[i * W + j - 1], SKIP_SPOKEN);
      if (i > 0 && j > 0) {
        if (slot[i - 1]) {
          for (let k = 1; k <= Math.min(SLOT_MAX_WORDS, j); k++) {
            offer(best[(i - 1) * W + j - k] + 1 + TIE_ABSORB * k, { kind: "slot", k });
          }
        } else {
          const t = target[i - 1];
          const credit = wordCredit(t, spoken[j - 1]);
          if (credit > 0) offer(best[(i - 1) * W + j - 1] + credit + TIE_REAL, { kind: "word", credit });
          let heard = spoken[j - 1];
          for (let k = 2; k <= Math.min(3, j); k++) {
            heard = spoken[j - k] + heard;
            if (heard === t) offer(best[(i - 1) * W + j - k] + 1 + TIE_REAL - TIE_MERGE, { kind: "split", k });
          }
          let written = t;
          for (let k = 2; k <= Math.min(3, i) && !slot[i - k]; k++) {
            written = target[i - k] + written;
            if (written === spoken[j - 1]) {
              offer(best[(i - k) * W + j - 1] + k * (1 + TIE_REAL) - TIE_MERGE, { kind: "join", k });
            }
          }
        }
      }
      best[i * W + j] = value;
      steps[i * W + j] = step;
    }
  }

  const links: AlignLink[] = Array.from({ length: n }, (): AlignLink => ({ kind: "none" }));
  const used: boolean[] = new Array(m).fill(false);
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const s = steps[i * W + j];
    if (s.kind === "skipTarget") {
      i--;
    } else if (s.kind === "skipSpoken") {
      j--;
    } else if (s.kind === "word") {
      links[i - 1] = { kind: "word", credit: s.credit };
      used[j - 1] = true;
      i--;
      j--;
    } else if (s.kind === "split") {
      links[i - 1] = { kind: "split" };
      for (let q = 1; q <= s.k; q++) used[j - q] = true;
      i--;
      j -= s.k;
    } else if (s.kind === "join") {
      for (let q = 1; q <= s.k; q++) links[i - q] = { kind: "join" };
      used[j - 1] = true;
      i -= s.k;
      j--;
    } else {
      links[i - 1] = { kind: "slot", from: j - s.k, to: j };
      for (let q = 1; q <= s.k; q++) used[j - q] = true;
      i--;
      j -= s.k;
    }
  }
  return { links, used };
}

/** Punctuation around a word the recogniser wrote — dropped when its words are shown in a slot. */
const EDGE_PUNCTUATION = /^[.,?!;:"“”'‘’()]+|[.,?!;:"“”'‘’()]+$/g;

/**
 * The words of the result card, and what they say. The score is a WORD-MATCH score — how much of the
 * target the recogniser heard back, in order — so the words say that and nothing more: no emoji, and
 * no '발음' (STU-L13 — it used to praise "억양" and "연음", which this never measures, CNT-07).
 * '모든 단어 일치' only when no target word is red: a 92+ score can still leave a word red (STU-U21 —
 * it said '모든 단어 일치' over red words). The bands (92 · 80 · 60) are unchanged. A band that asks
 * for another try when the learner passed elsewhere says '한 번 더', not '다시' (STU-U25), and when
 * nothing is red it says what cost the points — words added, or a word heard slightly differently.
 */
function describeScore(
  score: number,
  red: number,
  extra: number,
): Pick<EvaluationResult, "rating" | "ratingLabel" | "feedback"> {
  const allHeard =
    extra > 0
      ? "모든 단어가 인식되었어요. 덧붙인 말 없이 문장만 한 번에 이어서 말해 보세요."
      : "모든 단어가 인식되었어요. 조금 다르게 들린 단어가 있으니 한 번 더 또렷하게 말해 보세요.";
  if (score >= 92) {
    return red === 0
      ? { rating: "excellent", ratingLabel: "모든 단어 일치", feedback: "문장의 단어가 어순대로 모두 인식되었습니다!" }
      : { rating: "excellent", ratingLabel: "거의 모두 일치", feedback: "빨간색으로 표시된 단어만 한 번 더 또렷하게 말해 보세요." };
  }
  if (score >= 80) {
    return {
      rating: "good",
      ratingLabel: "대부분 일치",
      feedback:
        red === 0 ? allHeard : "대부분의 단어가 인식되었습니다. 빨간색으로 표시된 단어만 한 번 더 또렷하게 말해 보세요.",
    };
  }
  if (score >= 60) {
    return {
      rating: "almost",
      ratingLabel: "거의 맞았어요",
      feedback: red === 0 ? allHeard : "빨간색으로 표시된 단어를 빠뜨렸거나 다르게 들렸어요. 확인하고 다시 말해 보세요.",
    };
  }
  return { rating: "poor", ratingLabel: "다시 시도", feedback: "문장을 처음부터 끝까지 조금 더 또렷하게 소리내어 읽어보세요." };
}

/**
 * Scores a transcript against one target sentence: which of its words the recogniser heard, in order
 * (alignWords), and how close the whole reading was. score = 65 × word accuracy + 20 × character
 * similarity + 15 × length ratio, as before. A target may hold [[label]] slots (see SLOT).
 */
export function evaluatePronunciation(spoken: string, target: string): EvaluationResult {
  const slotLabels: string[] = [];
  const marked = target.replace(SLOT, (_whole, label: string) => ` ${SLOT_MARK}${slotLabels.push(label.trim()) - 1}`);
  const targetTokens = normalizeText(marked).split(/\s+/).filter(Boolean);
  const heardTokens = normalizeText(spoken).split(/\s+/).filter(Boolean);
  const spokenTokens = matchContractions(heardTokens, targetTokens);
  // Compared without apostrophes, as before: "dont" from a recogniser still matches "don't".
  const bare = (w: string) => w.replace(/'/g, "");
  const normSpoken = spokenTokens.map(bare).join(" ");
  const slotOf = targetTokens.map((t) => {
    const hit = SLOT_TOKEN.exec(t);
    return hit ? Number(hit[1]) : -1;
  });
  const isSlot = slotOf.map((k) => k >= 0);
  // The words shown under the result, split where normalizeText splits (after a dash) and without
  // tokens that are only punctuation, so each shown word lines up with the word it was scored as.
  const shownTarget = marked
    .replace(WORD_BREAKS, "$& ")
    .split(/\s+/)
    .filter((w) => normalizeText(w) !== "");
  const lined = shownTarget.length === targetTokens.length;
  const shownWord = (i: number) => (lined ? shownTarget[i] : targetTokens[i]);
  // A slot shows the learner's own words, or '(label)' when nothing was said there, with the
  // punctuation that followed it in the target ("[[school name]]." → "Hanbit.").
  const shownSlot = (i: number, said: string | null) => {
    const tail = (lined ? shownTarget[i] : "").replace(SLOT_HEAD, "").replace(/[()[\]]/g, "");
    return `${said ?? `(${slotLabels[slotOf[i]] ?? ""})`}${tail}`;
  };

  if (!normSpoken) {
    const wordAnalysis = targetTokens.map((_, i) => ({ word: isSlot[i] ? shownSlot(i, null) : shownWord(i), matched: false }));
    return {
      score: 0,
      rating: "poor",
      ratingLabel: "음성 감지 안 됨",
      feedback: "목소리가 인식되지 않았습니다. 마이크를 확인하고 다시 말해보세요.",
      transcript: "",
      targetText: target,
      wordAnalysis,
      matchedCount: 0,
      totalWords: wordAnalysis.length,
      extraWords: 0,
    };
  }

  // 1. Order-preserving alignment over the whole sentence (B01). Hyphens do not count ("e-mail" is
  // "email"), except in a token that is nothing but hyphens, which must not become an empty word.
  const key = (w: string) => bare(w).replace(/-/g, "") || bare(w);
  const { links, used } = alignWords(targetTokens.map(key), isSlot, spokenTokens.map(key));

  // The learner's own words in a slot, as the recogniser wrote them when each can be traced back to
  // a word of the transcript; otherwise as normalised.
  const heardShown = spoken
    .replace(WORD_BREAKS, "$& ")
    .split(/\s+/)
    .filter((w) => normalizeText(w) !== "");
  const traced =
    spokenTokens === heardTokens &&
    heardShown.length === heardTokens.length &&
    heardShown.every((w, k) => normalizeText(w) === heardTokens[k]);
  const saidIn = (from: number, to: number) =>
    (traced ? heardShown.slice(from, to).map((w) => w.replace(EDGE_PUNCTUATION, "")) : spokenTokens.slice(from, to)).join(" ");

  let effectiveMatches = 0;
  let matchedCount = 0;
  const absorbed: boolean[] = new Array(spokenTokens.length).fill(false);
  const wordAnalysis: WordAnalysis[] = targetTokens.map((_, i) => {
    const link = links[i];
    if (link.kind === "none") {
      return { word: isSlot[i] ? shownSlot(i, null) : shownWord(i), matched: false };
    }
    effectiveMatches += link.kind === "word" ? link.credit : 1;
    matchedCount++;
    if (link.kind === "slot") {
      for (let k = link.from; k < link.to; k++) absorbed[k] = true;
      return { word: shownSlot(i, saidIn(link.from, link.to)), matched: true };
    }
    return { word: shownWord(i), matched: true };
  });

  // 2. Composite score, the formula of before: 65% word accuracy · 20% character similarity ·
  // 15% length ratio. A slot counts as one target word in the accuracy; its words, and the words a
  // slot took, are left out of the similarity and the length ratio on both sides.
  const restTarget = targetTokens.filter((_, i) => !isSlot[i]).map(bare);
  const restSpoken = spokenTokens.filter((_, k) => !absorbed[k]).map(bare);
  const normTarget = restTarget.join(" ");
  const normRest = restSpoken.join(" ");
  const wordAccuracy = targetTokens.length > 0 ? effectiveMatches / targetTokens.length : 0;
  const longer = Math.max(restSpoken.length, restTarget.length);
  const lenRatio = longer > 0 ? Math.min(restSpoken.length, restTarget.length) / longer : 1;
  const maxCharLen = Math.max(normTarget.length, normRest.length) || 1;
  const charSim = Math.max(0, 1 - levenshteinDistance(normTarget, normRest) / maxCharLen);

  const rawScore = wordAccuracy * 65 + charSim * 20 + lenRatio * 15;
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // 3. Grade calibration (describeScore).
  const extraWords = used.filter((u) => !u).length;
  const verdict = describeScore(score, targetTokens.length - matchedCount, extraWords);

  return {
    score,
    ...verdict,
    transcript: spoken,
    targetText: target,
    wordAnalysis,
    matchedCount,
    totalWords: wordAnalysis.length,
    extraWords,
  };
}

/**
 * Scores one transcript against every accepted form of a sentence ("He is …" / "She is …",
 * "Yes, sir." / "Yes, ma'am.") and returns the best one: the highest score, then the fewest words
 * left red, then the first form. `index` is that form's position in `targets` (-1 when `targets`
 * is empty, which is scored against an empty sentence). Pure — the audit scripts call it in node.
 */
export function evaluateAgainstAny(
  spoken: string,
  targets: readonly string[],
): { result: EvaluationResult; index: number } {
  if (targets.length === 0) return { result: evaluatePronunciation(spoken, ""), index: -1 };
  const red = (r: EvaluationResult) => r.wordAnalysis.filter((w) => !w.matched).length;
  let best = evaluatePronunciation(spoken, targets[0]);
  let index = 0;
  for (let i = 1; i < targets.length; i++) {
    const r = evaluatePronunciation(spoken, targets[i]);
    if (r.score > best.score || (r.score === best.score && red(r) < red(best))) {
      best = r;
      index = i;
    }
  }
  return { result: best, index };
}

/**
 * What the result card says, and whether it wears the success colours, given the caller's own pass
 * mark (VoiceSpeakingTester passScore — STUDENT passes 70). Without a mark: the scorer's words, the
 * button green from 80 and the card from 85, exactly as before. With a mark: green from that mark,
 * and a pass below the 80 band says '통과했어요' — that band's words ask for another try while the
 * caller already shows the sentence as done (STU-U25: the card said '완료' and '다시' at once). With
 * nothing red the points went to added words or a word heard slightly differently, which the
 * scorer's own words say. Pure — the audit scripts call it in node.
 */
export function presentResult(
  result: EvaluationResult,
  passScore?: number,
): { label: string; feedback: string; buttonSuccess: boolean; cardSuccess: boolean } {
  if (passScore === undefined) {
    return {
      label: result.ratingLabel,
      feedback: result.feedback,
      buttonSuccess: result.score >= 80,
      cardSuccess: result.score >= 85,
    };
  }
  const passed = result.score >= passScore;
  const belowGood = passed && result.score < 80;
  const red = result.wordAnalysis.some((w) => !w.matched);
  return {
    label: belowGood ? "통과했어요" : result.ratingLabel,
    feedback: belowGood && red ? "통과했어요 — 빨간 낱말만 한 번 더 말해 보세요" : result.feedback,
    buttonSuccess: passed,
    cardSuccess: passed,
  };
}

export interface VoiceRecognizerHandle {
  stop: () => void;
  abort: () => void;
}

/**
 * Starts listening through Web Speech API.
 */
export function listenToSpeech({
  lang = "en-US",
  onResult,
  onInterim,
  onError,
  onEnd,
  onStart,
}: {
  lang?: string;
  onResult: (transcript: string) => void;
  onInterim?: (interim: string) => void;
  onError?: (error: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
}): VoiceRecognizerHandle | null {
  if (typeof window === "undefined") return null;

  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionClass) {
    onError?.("브라우저가 마이크 음성 인식을 지원하지 않습니다. Chrome 또는 Safari를 권장합니다.");
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    let finalTranscript = "";

    recognition.onstart = () => {
      onStart?.();
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscript += res[0].transcript;
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim && onInterim) {
        onInterim(interim);
      }
      if (finalTranscript) {
        onResult(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "no-speech") {
        onError?.("음성이 감지되지 않았습니다. 다시 마이크를 켜고 말씀해보세요.");
      } else if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        onError?.("마이크 접근 권한이 거부되었거나 차단되었습니다. 브라우저 설정에서 마이크를 허용해 주세요. (모바일 기기에서는 HTTPS 보안 연결이 필요할 수 있습니다)");
      } else {
        onError?.(`음성 인식 오류: ${event.error}`);
      }
    };

    recognition.onend = () => {
      onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {
          // ignore
        }
      },
      abort: () => {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      },
    };
  } catch (err) {
    onError?.(err instanceof Error ? err.message : "음성 인식을 시작하지 못했습니다.");
    return null;
  }
}
