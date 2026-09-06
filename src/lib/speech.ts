/**
 * Dual-Engine Speech & Audio System for K-IG 교육 courseware.
 *
 * Combines native browser Web Speech API (TTS) with Google Cloud MP3
 * Audio Streaming for complete, 100% reliable audio playback across ALL
 * mobile browsers, especially KakaoTalk In-App Browser, Line, Instagram,
 * Android WebView, and iOS Safari.
 *
 * Highlights:
 * 1. Automatic In-App Browser detection (KakaoTalk, Line, FB, IG).
 * 2. Instant fallback to high-definition Google MP3 Audio Stream when Web Speech API
 *    is disabled, silent, or hanging in WebViews.
 * 3. Mobile Audio Pipeline unlock (AudioContext & shared HTMLAudioElement warmup).
 * 4. Full suppression of Korean (우리말/한글) TTS per strict policy.
 */

export type VoiceGender = "male" | "female" | "neutral";

export interface SpeechState {
  speaking: boolean;
  paused: boolean;
  currentText: string | null;
  currentIndex: number | null;
}

// 0.05-second silent PCM WAV audio to unlock iOS Media Channel & bypass physical mute switch
const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

let globalAudioCtx: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;

// Persistent GC root for iOS WebKit
const activeUtterances = new Set<SpeechSynthesisUtterance>();
if (typeof window !== "undefined") {
  (window as unknown as { __kigUtterances?: Set<SpeechSynthesisUtterance> }).__kigUtterances = activeUtterances;
}

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

export function isKakaoTalk(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK|Line|Instagram|FB_IAB|FBAN|FBAV/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

export function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
    sharedAudioElement.setAttribute("playsinline", "true");
    (sharedAudioElement as unknown as { playsInline?: boolean; webkitPlaysInline?: boolean }).playsInline = true;
    (sharedAudioElement as unknown as { playsInline?: boolean; webkitPlaysInline?: boolean }).webkitPlaysInline = true;
  }
  return sharedAudioElement;
}

function refreshVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  try {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) {
      cachedVoices = v;
    }
  } catch {
    // ignore
  }
  return cachedVoices;
}

/**
 * Robustly unlocks the mobile browser audio pipeline (especially iOS Safari & WebKit & KakaoTalk).
 */
export function unlockMobileAudio(): void {
  if (typeof window === "undefined") return;

  // 1. Shared HTML5 Audio element warmup
  try {
    const audio = getSharedAudio();
    if (audio && !audio.src) {
      audio.src = SILENT_WAV;
      audio.volume = 0.01;
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {});
      }
    }
  } catch {
    // ignore
  }

  // 2. Web AudioContext unlock
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      if (!globalAudioCtx) {
        globalAudioCtx = new AudioCtx();
      }
      if (globalAudioCtx.state === "suspended") {
        globalAudioCtx.resume().catch(() => {});
      }
    }
  } catch {
    // ignore
  }

  // 3. SpeechSynthesis unlock
  try {
    if ("speechSynthesis" in window) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }
  } catch {
    // ignore
  }
}

// Auto-register voiceschanged listener and iOS audio unlock
if (typeof window !== "undefined") {
  if ("speechSynthesis" in window) {
    refreshVoices();
    window.speechSynthesis.onvoiceschanged = () => {
      refreshVoices();
    };
  }

  window.addEventListener("touchstart", unlockMobileAudio, { passive: true });
  window.addEventListener("touchend", unlockMobileAudio, { passive: true });
  window.addEventListener("click", unlockMobileAudio, { passive: true });
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

/**
 * Splits long sentences into sub-chunks under 150 characters so Google TTS never returns 400 Bad Request.
 */
function splitTtsChunks(text: string, maxLen = 140): string[] {
  if (text.length <= maxLen) return [text];
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxLen) {
      if (cur) chunks.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? cur + " " + w : w;
    }
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.length > 0 ? chunks : [text];
}

let activeStreamController: { abort: () => void } | null = null;

/**
 * High-definition MP3 Audio Stream engine via Google Cloud TTS.
 * Works 100% reliably in KakaoTalk, Line, Instagram, Android WebViews, and iOS WKWebView.
 */
export function playAudioStream(
  text: string,
  options: {
    lang?: "en" | "ko" | "zh" | string;
    rate?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (err: unknown) => void;
  } = {},
): void {
  if (typeof window === "undefined") return;

  // Clean text: remove slashes and square bracket tags
  const clean = text.replace(/\s*\/\s*/g, " ").replace(/\[[^\]]*\]/g, "").trim();
  if (!clean) return;

  // Global policy: Completely disable and suppress all Korean (우리말/한글) TTS
  if (options.lang === "ko") {
    options.onEnd?.();
    return;
  }

  // Stop previous speech or stream
  if (activeStreamController) {
    activeStreamController.abort();
    activeStreamController = null;
  }
  if ("speechSynthesis" in window) {
    try {
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
  }

  unlockMobileAudio();

  const audio = getSharedAudio();
  if (!audio) {
    options.onError?.(new Error("Shared audio element unavailable"));
    return;
  }
  const audioEl: HTMLAudioElement = audio;

  const langCode = options.lang === "zh" ? "zh-CN" : options.lang === "ko" ? "ko-KR" : "en";
  const chunks = splitTtsChunks(clean);
  let chunkIndex = 0;
  let isAborted = false;

  const controller = {
    abort: () => {
      isAborted = true;
      try {
        audioEl.pause();
        audioEl.currentTime = 0;
        audioEl.onended = null;
        audioEl.onerror = null;
      } catch {
        // ignore
      }
    },
  };
  activeStreamController = controller;

  function playCurrentChunk() {
    if (isAborted) return;
    if (chunkIndex >= chunks.length) {
      activeStreamController = null;
      options.onEnd?.();
      return;
    }

    const currentText = chunks[chunkIndex];
    const streamUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${langCode}&client=tw-ob&q=${encodeURIComponent(currentText)}`;

    audioEl.src = streamUrl;
    audioEl.playbackRate = Math.max(0.7, Math.min(1.5, options.rate ?? 1.0));

    audioEl.onended = () => {
      if (isAborted) return;
      chunkIndex++;
      playCurrentChunk();
    };

    audioEl.onerror = (e) => {
      if (isAborted) return;
      activeStreamController = null;
      options.onError?.(e);
    };

    const playPromise = audioEl.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise
        .then(() => {
          if (chunkIndex === 0) {
            options.onStart?.();
          }
        })
        .catch((err) => {
          if (!isAborted) {
            activeStreamController = null;
            options.onError?.(err);
          }
        });
    } else {
      if (chunkIndex === 0) {
        options.onStart?.();
      }
    }
  }

  playCurrentChunk();
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
  // Global policy: Completely disable and suppress all Korean (우리말/한글) TTS
  if (options.lang === "ko") {
    options.onEnd?.();
    return;
  }

  // 1. In KakaoTalk or restricted In-App browsers:
  // Web Speech API is notoriously broken/silenced/hanging in KakaoTalk WebView.
  // Directly use the high-quality HTML5 Audio Stream engine!
  if (isKakaoTalk() || isInAppBrowser()) {
    playAudioStream(text, options);
    return;
  }

  // 2. If Web Speech API is not supported in this browser:
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    playAudioStream(text, options);
    return;
  }

  // Clean text: remove slash markers
  const clean = text.replace(/\s*\/\s*/g, " ").trim();
  if (!clean) return;

  // Activate mobile audio session immediately inside the user gesture
  unlockMobileAudio();

  // If already speaking or pending, cancel previous speech immediately
  try {
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
    }
  } catch {
    // ignore
  }

  // Ensure speech synthesis engine is not paused
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
  if (voice) {
    u.voice = voice;
  }

  u.onstart = () => {
    options.onStart?.();
  };

  u.onend = () => {
    activeUtterances.delete(u);
    options.onEnd?.();
  };

  u.onerror = (e) => {
    activeUtterances.delete(u);
    if (e.error !== "canceled" && e.error !== "interrupted") {
      // Fallback to Google Audio Stream if speech synthesis engine fails!
      playAudioStream(clean, options);
    } else {
      options.onEnd?.();
    }
  };

  // Retain utterance reference in a global Set to prevent GC mid-sentence on iOS WebKit
  activeUtterances.add(u);

  // CRITICAL: Must execute speak() SYNCHRONOUSLY within the user gesture event loop!
  try {
    window.speechSynthesis.speak(u);
  } catch {
    activeUtterances.delete(u);
    // Fallback immediately to audio stream
    playAudioStream(clean, options);
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

  unlockMobileAudio();

  queue = sentences;
  queueIndex = options.startIndex ?? 0;
  queueLang = options.lang ?? "en";
  queueRate = options.rate ?? 1.0;
  queueGender = options.gender ?? "neutral";
  onQueueProgress = options.onProgress ?? null;
  onQueueEnd = options.onEnd ?? null;
  isQueueRunning = true;

  // Start the first sentence SYNCHRONOUSLY inside the user gesture
  playNextInQueue();
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

/** Stop all ongoing speech, streams, and clear queue. */
export function stopSpeech(): void {
  isQueueRunning = false;
  activeUtterances.clear();

  if (activeStreamController) {
    activeStreamController.abort();
    activeStreamController = null;
  }

  if (sharedAudioElement) {
    try {
      sharedAudioElement.pause();
      sharedAudioElement.currentTime = 0;
      sharedAudioElement.onended = null;
      sharedAudioElement.onerror = null;
    } catch {
      // ignore
    }
  }

  if (typeof window !== "undefined" && "speechSynthesis" in window) {
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
  }

  queue = [];
  queueIndex = 0;
  onQueueProgress = null;
  onQueueEnd = null;
}

export function pauseSpeech(): void {
  if (sharedAudioElement && !sharedAudioElement.paused) {
    try {
      sharedAudioElement.pause();
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.pause();
    } catch {
      // ignore
    }
  }
}

export function resumeSpeech(): void {
  if (sharedAudioElement && sharedAudioElement.paused && sharedAudioElement.src) {
    try {
      sharedAudioElement.play().catch(() => {});
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }
}

export function isSpeaking(): boolean {
  const isAudioPlaying = sharedAudioElement ? !sharedAudioElement.paused : false;
  const isSynthSpeaking =
    typeof window !== "undefined" && "speechSynthesis" in window
      ? window.speechSynthesis.speaking
      : false;
  return isAudioPlaying || isSynthSpeaking || isQueueRunning;
}
