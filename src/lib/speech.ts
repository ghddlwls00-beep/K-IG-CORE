/**
 * Web Speech API (TTS) engine for K-IG 교육 courseware.
 *
 * Provides native, zero-dependency browser speech synthesis for English, Korean,
 * and Chinese lessons. When server media is unavailable, this allows lessons
 * to remain 100% playable, while also powering sentence-by-sentence audio drills.
 *
 * Features precise voice selection with dedicated Male/Female profiles for MEN
 * and WOMEN conversation tracks.
 */

export type VoiceGender = "male" | "female" | "neutral";

export interface SpeechState {
  speaking: boolean;
  paused: boolean;
  currentText: string | null;
  currentIndex: number | null;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let queue: string[] = [];
let queueIndex = 0;
let queueLang = "en";
let queueRate = 1.0;
let queueGender: VoiceGender = "neutral";
let onQueueProgress: ((index: number, text: string) => void) | null = null;
let onQueueEnd: (() => void) | null = null;
let isQueueRunning = false;

// Cached voices
let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  const v = window.speechSynthesis.getVoices();
  if (v && v.length > 0) {
    cachedVoices = v;
  }
  return cachedVoices;
}

// Auto-register voiceschanged listener and iOS audio unlock
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  refreshVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    refreshVoices();
  };

  // iOS Safari audio unlock on first user gesture
  const unlockAudio = () => {
    try {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch {
      // ignore
    }
  };

  window.addEventListener("touchstart", unlockAudio, { passive: true });
  window.addEventListener("touchend", unlockAudio, { passive: true });
  window.addEventListener("click", unlockAudio, { passive: true });
}

function getVoices(): SpeechSynthesisVoice[] {
  return cachedVoices.length > 0 ? cachedVoices : refreshVoices();
}

const MALE_VOICE_REGEX =
  /male|david|guy|mark|andrew|brian|christopher|eric|steffan|george|roger|daniel|james|john|michael|yunxi|yunjian|kangkang|injoon|minho/i;
const FEMALE_VOICE_REGEX =
  /female|zira|jenny|aria|michelle|sonia|libby|natasha|samantha|victoria|karen|siri|xiaoxiao|xiaoyi|huihui|yaoyao|sunhi|heami/i;

/** Pick best voice for language code ('en', 'ko', 'zh') and requested gender ('male' | 'female' | 'neutral'). */
export function findBestVoice(
  langPrefix: string,
  gender: VoiceGender = "neutral",
): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  const target = langPrefix.toLowerCase();
  const matches = voices.filter((v) => v.lang.toLowerCase().startsWith(target));
  if (matches.length === 0) return null;

  // Prefer local voices to avoid network download failures on mobile data
  const localMatches = matches.filter((v) => v.localService !== false);
  const pool = localMatches.length > 0 ? localMatches : matches;

  // 1. If male voice requested (e.g. MEN courseware)
  if (gender === "male") {
    const males = pool.filter((v) => MALE_VOICE_REGEX.test(v.name));
    if (males.length > 0) {
      const natural = males.find((v) => /natural|online|neural|google|premium/i.test(v.name));
      return natural ?? males[0];
    }
  }

  // 2. If female voice requested (e.g. WOMEN courseware)
  if (gender === "female") {
    const females = pool.filter((v) => FEMALE_VOICE_REGEX.test(v.name));
    if (females.length > 0) {
      const natural = females.find((v) => /natural|online|neural|google|premium/i.test(v.name));
      return natural ?? females[0];
    }
  }

  // 3. General natural / neural voice
  const preferred = pool.find(
    (v) =>
      /natural|premium|online|google|siri|neural/i.test(v.name) &&
      !/compact/i.test(v.name),
  );
  return preferred ?? pool.find((v) => v.default) ?? pool[0];
}

/** Speak a single sentence or text snippet safely on mobile and desktop. */
export function speakText(
  text: string,
  options: {
    lang?: "en" | "ko" | "zh" | string;
    gender?: VoiceGender;
    rate?: number;
    pitch?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {},
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    options.onError?.(new Error("Speech synthesis not supported in this browser"));
    return;
  }

  // Clean text: remove slash markers
  const clean = text.replace(/\s*\/\s*/g, " ").trim();
  if (!clean) return;

  // Ensure speech synthesis engine is awake (critical for iOS Safari)
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch {
    // ignore
  }

  const langCode = options.lang === "zh" ? "zh-CN" : options.lang === "ko" ? "ko-KR" : "en-US";
  const gender = options.gender ?? "neutral";
  const u = new SpeechSynthesisUtterance(clean);
  u.lang = langCode;
  u.rate = Math.max(0.7, Math.min(1.3, options.rate ?? 1.0));

  // Set characteristic pitch for gender differentiation
  const defaultPitch = gender === "male" ? 0.85 : gender === "female" ? 1.12 : 1.0;
  u.pitch = options.pitch ?? defaultPitch;

  const voice = findBestVoice(options.lang ?? "en", gender);
  if (voice) u.voice = voice;

  u.onstart = () => options.onStart?.();
  u.onend = () => {
    activeUtterance = null;
    options.onEnd?.();
  };
  u.onerror = (e) => {
    activeUtterance = null;
    if (e.error !== "canceled" && e.error !== "interrupted") {
      options.onError?.(e);
    } else {
      options.onEnd?.();
    }
  };

  // Retain utterance reference to prevent GC mid-sentence on iOS WebKit
  activeUtterance = u;

  // Safe cancellation logic for mobile:
  // If browser is actively speaking, call cancel() and schedule speak() after
  // a micro-delay (30ms) so WebKit doesn't drop the new utterance.
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.speak(u);
      } catch (err) {
        options.onError?.(err);
      }
    }, 30);
  } else {
    try {
      window.speechSynthesis.speak(u);
    } catch (err) {
      options.onError?.(err);
    }
  }
}

/** Play a queue of sentences sequentially (for whole-lesson TTS playback). */
export function playSentenceQueue(
  sentences: string[],
  options: {
    lang?: "en" | "ko" | "zh" | string;
    gender?: VoiceGender;
    rate?: number;
    startIndex?: number;
    onProgress?: (index: number, text: string) => void;
    onEnd?: () => void;
  } = {},
): void {
  stopSpeech();
  if (!sentences || sentences.length === 0) return;

  queue = sentences;
  queueIndex = options.startIndex ?? 0;
  queueLang = options.lang ?? "en";
  queueRate = options.rate ?? 1.0;
  queueGender = options.gender ?? "neutral";
  onQueueProgress = options.onProgress ?? null;
  onQueueEnd = options.onEnd ?? null;
  isQueueRunning = true;

  // Small delay after stopSpeech() so mobile cancel settles
  setTimeout(() => {
    if (isQueueRunning) {
      playNextInQueue();
    }
  }, 40);
}

function playNextInQueue() {
  if (!isQueueRunning || queueIndex >= queue.length) {
    stopSpeech();
    onQueueEnd?.();
    return;
  }

  const current = queue[queueIndex];
  onQueueProgress?.(queueIndex, current);

  speakText(current, {
    lang: queueLang,
    gender: queueGender,
    rate: queueRate,
    onEnd: () => {
      if (!isQueueRunning) return;
      queueIndex++;
      playNextInQueue();
    },
    onError: () => {
      if (!isQueueRunning) return;
      queueIndex++;
      playNextInQueue();
    },
  });
}

/** Stop all ongoing speech and clear queue. */
export function stopSpeech(): void {
  isQueueRunning = false;
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }
  activeUtterance = null;
  queue = [];
  queueIndex = 0;
  onQueueProgress = null;
  onQueueEnd = null;
}

export function pauseSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.pause();
  } catch {
    // ignore
  }
}

export function resumeSpeech(): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }
}

export function isSpeaking(): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  return window.speechSynthesis.speaking;
}
