/**
 * Web Speech API (STT) & Pronunciation Evaluation Engine.
 *
 * Provides native, zero-server-cost browser speech recognition and real-time
 * pronunciation & syntax accuracy scoring against target sentences.
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
  matchedCount: number;
  totalWords: number;
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
 * Evaluates spoken transcript against the target model sentence.
 */
export function evaluatePronunciation(spoken: string, target: string): EvaluationResult {
  const targetTokens = normalizeText(target).split(/\s+/).filter(Boolean);
  const spokenTokens = matchContractions(normalizeText(spoken).split(/\s+/).filter(Boolean), targetTokens);
  // Compared without apostrophes, as before: "dont" from a recogniser still matches "don't".
  const bare = (w: string) => w.replace(/'/g, "");
  const normTarget = targetTokens.map(bare).join(" ");
  const normSpoken = spokenTokens.map(bare).join(" ");
  // The words shown under the result, split where normalizeText splits (after a dash) and without
  // tokens that are only punctuation, so each shown word lines up with the word it was scored as.
  const originalTargetWords = target
    .replace(WORD_BREAKS, "$& ")
    .split(/\s+/)
    .filter((w) => normalizeText(w) !== "");

  if (!normSpoken) {
    return {
      score: 0,
      rating: "poor",
      ratingLabel: "음성 감지 안 됨",
      feedback: "목소리가 인식되지 않았습니다. 마이크를 확인하고 다시 말해보세요.",
      transcript: "",
      targetText: target,
      wordAnalysis: originalTargetWords.map((w) => ({ word: w, matched: false })),
      matchedCount: 0,
      totalWords: originalTargetWords.length,
    };
  }

  const targetWords = targetTokens.map(bare);
  const spokenWords = spokenTokens.map(bare);

  // 1. Strict Sequential Alignment (어순 및 단어 일치도 정밀 추적)
  let spokenPtr = 0;
  let matchedCount = 0;
  let partialCount = 0;
  const wordAnalysis: WordAnalysis[] = [];

  for (let i = 0; i < targetWords.length; i++) {
    const tw = targetWords[i];
    const orig = originalTargetWords[i] || tw;
    let matched = false;

    // Search ahead up to 2 words in spoken for local sequential matching
    const searchWindow = Math.min(spokenWords.length, spokenPtr + 2);
    for (let j = spokenPtr; j < searchWindow; j++) {
      const sw = spokenWords[j];
      if (sw === tw) {
        matched = true;
        matchedCount++;
        spokenPtr = j + 1;
        break;
      }
      // Allow minor phonetic slip only for long words (length >= 5 and edit distance === 1)
      if (tw.length >= 5 && levenshteinDistance(tw, sw) === 1) {
        matched = true;
        partialCount += 0.7;
        spokenPtr = j + 1;
        break;
      }
    }

    wordAnalysis.push({ word: orig, matched });
  }

  // 2. Strict Composite Scoring (엄격한 점수 산출)
  // - 65% 정확한 어순 및 단어 일치도
  // - 20% 전체 문장 문자열 정밀도 (Character Similarity)
  // - 15% 문장 길이 일관성 (단어 누락 및 군더더기 발화 감점)
  const effectiveMatches = matchedCount + partialCount;
  const wordAccuracy = targetWords.length > 0 ? effectiveMatches / targetWords.length : 0;
  const lenRatio = Math.min(spokenWords.length, targetWords.length) / Math.max(spokenWords.length, targetWords.length);
  const maxCharLen = Math.max(normTarget.length, normSpoken.length) || 1;
  const charSim = Math.max(0, 1 - levenshteinDistance(normTarget, normSpoken) / maxCharLen);

  const rawScore = (wordAccuracy * 65) + (charSim * 20) + (lenRatio * 15);
  const score = Math.min(100, Math.max(0, Math.round(rawScore)));

  // 3. Grade calibration. The score above is a WORD-MATCH score — how much of
  // the target the recogniser heard back, in order — so the feedback says that
  // and nothing more. It used to praise "억양" and "연음", which this function
  // never measures (CNT-07).
  let rating: EvaluationResult["rating"] = "poor";
  let ratingLabel = "다시 시도 (Try Again)";
  let feedback = "문장을 처음부터 끝까지 조금 더 또렷하게 소리내어 읽어보세요.";

  if (score >= 92) {
    rating = "excellent";
    ratingLabel = "🌟 모든 단어 일치 (Excellent!)";
    feedback = "문장의 단어가 어순대로 모두 인식되었습니다!";
  } else if (score >= 80) {
    rating = "good";
    ratingLabel = "👍 대부분 일치 (Good!)";
    feedback = "대부분의 단어가 인식되었습니다. 빨간색으로 표시된 단어만 다시 또렷하게 말해보세요.";
  } else if (score >= 60) {
    rating = "almost";
    ratingLabel = "💪 거의 맞았어요 (Almost!)";
    feedback = "빨간색으로 표시된 단어를 빠뜨렸거나 발음이 다릅니다. 확인 후 다시 말해보세요.";
  }

  return {
    score,
    rating,
    ratingLabel,
    feedback,
    transcript: spoken,
    targetText: target,
    wordAnalysis,
    matchedCount,
    totalWords: originalTargetWords.length,
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
