import {
  normalizeUnifiedSpeechText,
  shouldUseUnifiedSpeech,
  unifiedSpeechPath,
} from "@/lib/unifiedSpeech";

/**
 * Dual-Engine Speech & Audio System for K-IG 교육 courseware.
 *
 * Combines the native Web Speech API (TTS) with a Google MP3 audio-stream
 * fallback so playback works across desktop, mobile, and In-App browsers
 * (KakaoTalk, Line, Instagram, Android WebView, iOS WKWebView).
 *
 * Rewritten to fix:
 *  1. Stop/pause not working (cancel() fired onend → loops restarted themselves).
 *  2. Queue advancing twice / skipping (stale callbacks from a cancelled run).
 *  3. Chrome's cancel()→speak() silent-race and its 15-second cut-off bug.
 *  4. Android's broken speechSynthesis.pause() (behaves like cancel).
 *  5. Korean (한글) being hard-blocked — Korean and mixed KO/EN text now read
 *     correctly, each language segment spoken with its own voice.
 */

export type VoiceGender = "male" | "female" | "neutral";
export type SpeechLang = "en" | "ko" | "zh" | (string & {});

export interface SpeechSnapshot {
  speaking: boolean;
  paused: boolean;
  /** Index inside the active sentence queue, or -1 when not queue playback. */
  index: number;
  /** Total sentences in the active queue, or 0. */
  total: number;
  /** Text currently being spoken. */
  text: string | null;
}

/** @deprecated kept for backwards compatibility */
export interface SpeechState {
  speaking: boolean;
  paused: boolean;
  currentText: string | null;
  currentIndex: number | null;
}

export interface SpeakOptions {
  lang?: SpeechLang;
  gender?: VoiceGender;
  rate?: number;
  pitch?: number;
  /** Automatically detect and switch voices for Korean/Chinese runs. Default true. */
  autoDetectLanguage?: boolean;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

// ---------------------------------------------------------------------------
// Environment helpers
// ---------------------------------------------------------------------------

const SILENT_WAV =
  "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";

export function isKakaoTalk(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK/i.test(navigator.userAgent);
}

export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /KAKAOTALK|Line\/|NAVER|Instagram|FB_IAB|FBAN|FBAV|DaumApps/i.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android/i.test(navigator.userAgent);
}

export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function hasSynthesis(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

// ---------------------------------------------------------------------------
// Reactive snapshot (for useSyncExternalStore in React components)
// ---------------------------------------------------------------------------

const IDLE_SNAPSHOT: SpeechSnapshot = {
  speaking: false,
  paused: false,
  index: -1,
  total: 0,
  text: null,
};

let snapshot: SpeechSnapshot = IDLE_SNAPSHOT;
const listeners = new Set<() => void>();

function emit(next: Partial<SpeechSnapshot>) {
  const merged: SpeechSnapshot = { ...snapshot, ...next };
  if (
    merged.speaking === snapshot.speaking &&
    merged.paused === snapshot.paused &&
    merged.index === snapshot.index &&
    merged.total === snapshot.total &&
    merged.text === snapshot.text
  ) {
    return;
  }
  snapshot = merged;
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeSpeech(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSpeechSnapshot(): SpeechSnapshot {
  return snapshot;
}

export function getServerSpeechSnapshot(): SpeechSnapshot {
  return IDLE_SNAPSHOT;
}

// ---------------------------------------------------------------------------
// Audio pipeline unlock
// ---------------------------------------------------------------------------

let globalAudioCtx: AudioContext | null = null;
let sharedAudioElement: HTMLAudioElement | null = null;
let audioUnlocked = false;

export function getSharedAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioElement) {
    sharedAudioElement = new Audio();
    sharedAudioElement.setAttribute("playsinline", "true");
    sharedAudioElement.crossOrigin = "anonymous";
    (
      sharedAudioElement as unknown as { playsInline?: boolean; webkitPlaysInline?: boolean }
    ).playsInline = true;
    (
      sharedAudioElement as unknown as { playsInline?: boolean; webkitPlaysInline?: boolean }
    ).webkitPlaysInline = true;
  }
  return sharedAudioElement;
}

/** Unlocks the mobile audio pipeline. Safe to call on every user gesture. */
export function unlockMobileAudio(): void {
  if (typeof window === "undefined") return;

  // 1. HTML5 Audio warm-up — only once, and never while real audio is loaded.
  try {
    const audio = getSharedAudio();
    if (audio && !audioUnlocked && !audio.src) {
      audio.src = SILENT_WAV;
      audio.volume = 0.01;
      const restoreAudibleVolume = () => {
        audio.muted = false;
        audio.defaultMuted = false;
        audio.volume = 1;
      };
      const p = audio.play();
      if (p && typeof p.then === "function") {
        p.then(restoreAudibleVolume).catch(restoreAudibleVolume);
      } else {
        restoreAudibleVolume();
      }
    }
  } catch {
    // ignore
  }

  // 2. AudioContext unlock
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioCtx) {
      if (!globalAudioCtx) globalAudioCtx = new AudioCtx();
      if (globalAudioCtx.state === "suspended") globalAudioCtx.resume().catch(() => {});
    }
  } catch {
    // ignore
  }

  // 3. speechSynthesis warm-up (a zero-length utterance primes iOS/Safari).
  try {
    if (hasSynthesis() && !audioUnlocked) {
      const primer = new SpeechSynthesisUtterance(" ");
      primer.volume = 0;
      window.speechSynthesis.speak(primer);
    }
  } catch {
    // ignore
  }

  audioUnlocked = true;
}

// ---------------------------------------------------------------------------
// Voice catalogue
// ---------------------------------------------------------------------------

let cachedVoices: SpeechSynthesisVoice[] = [];

function refreshVoices(): SpeechSynthesisVoice[] {
  if (!hasSynthesis()) return [];
  try {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) cachedVoices = v;
  } catch {
    // ignore
  }
  return cachedVoices;
}

function getVoices(): SpeechSynthesisVoice[] {
  return cachedVoices.length > 0 ? cachedVoices : refreshVoices();
}

if (typeof window !== "undefined") {
  if (hasSynthesis()) {
    refreshVoices();
    try {
      window.speechSynthesis.addEventListener?.("voiceschanged", () => refreshVoices());
      if (!window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = () => refreshVoices();
      }
    } catch {
      window.speechSynthesis.onvoiceschanged = () => refreshVoices();
    }
    // Chrome/Safari sometimes report voices only after a tick.
    setTimeout(() => refreshVoices(), 250);
    setTimeout(() => refreshVoices(), 1200);
  }

  const unlockOnce = () => unlockMobileAudio();
  window.addEventListener("touchend", unlockOnce, { passive: true, once: false });
  window.addEventListener("pointerdown", unlockOnce, { passive: true, once: false });
  window.addEventListener("keydown", unlockOnce, { passive: true, once: false });

  // Browsers cancel speech on navigation but leave the engine wedged; reset it.
  window.addEventListener("pagehide", () => stopSpeech());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && snapshot.speaking) {
      stopSpeech();
    }
  });
}

const MALE_VOICE_REGEX =
  /male|david|guy|mark|andrew|brian|christopher|eric|steffan|george|roger|daniel|james|john|michael|yunxi|yunjian|kangkang|injoon|minho|gyeong/i;
const FEMALE_VOICE_REGEX =
  /female|zira|jenny|aria|michelle|sonia|libby|natasha|samantha|victoria|karen|siri|xiaoxiao|xiaoyi|huihui|yaoyao|sunhi|heami|yuna|seoyeon|jiyoung/i;

/** Pick the best voice for a language prefix ('en' | 'ko' | 'zh') and gender. */
export function findBestVoice(
  langPrefix: string,
  gender: VoiceGender = "neutral",
): SpeechSynthesisVoice | null {
  const voices = getVoices();
  if (voices.length === 0) return null;

  const target = normalizeLang(langPrefix).slice(0, 2).toLowerCase();
  const matches = voices.filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(target));
  if (matches.length === 0) return null;

  const localMatches = matches.filter((v) => v.localService !== false);
  const pool = localMatches.length > 0 ? localMatches : matches;

  if (gender === "male") {
    const males = pool.filter((v) => MALE_VOICE_REGEX.test(v.name));
    if (males.length > 0) {
      return males.find((v) => /natural|online|neural|google|premium/i.test(v.name)) ?? males[0];
    }
  }

  if (gender === "female") {
    const females = pool.filter((v) => FEMALE_VOICE_REGEX.test(v.name));
    if (females.length > 0) {
      return females.find((v) => /natural|online|neural|google|premium/i.test(v.name)) ?? females[0];
    }
  }

  const preferred = pool.find(
    (v) => /natural|premium|online|google|siri|neural/i.test(v.name) && !/compact/i.test(v.name),
  );
  return preferred ?? pool.find((v) => v.default) ?? pool[0];
}

/** True when this device can natively speak the given language. */
export function hasVoiceFor(lang: SpeechLang): boolean {
  if (!hasSynthesis()) return false;
  if (getVoices().length === 0) return true; // unknown yet — assume yes, watchdog will catch failures
  return findBestVoice(lang) !== null;
}

// ---------------------------------------------------------------------------
// Language detection & segmentation (한글 지원의 핵심)
// ---------------------------------------------------------------------------

const RE_HANGUL = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F\uA960-\uA97F]/;
const RE_HAN = /[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]/;
const RE_KANA = /[\u3040-\u30FF]/;
const RE_LATIN = /[A-Za-z]/;

/** Detects the dominant language of a text snippet. */
export function detectLang(text: string, fallback: SpeechLang = "en"): SpeechLang {
  if (!text) return fallback;
  if (RE_HANGUL.test(text)) return "ko";
  if (RE_KANA.test(text)) return "ja";
  if (RE_HAN.test(text)) return "zh";
  if (RE_LATIN.test(text)) return "en";
  return fallback;
}

type CharClass = "ko" | "zh" | "ja" | "en" | "neutral";

function classifyChar(ch: string): CharClass {
  if (RE_HANGUL.test(ch)) return "ko";
  if (RE_KANA.test(ch)) return "ja";
  if (RE_HAN.test(ch)) return "zh";
  if (RE_LATIN.test(ch)) return "en";
  return "neutral";
}

export interface LangSegment {
  text: string;
  lang: SpeechLang;
}

/** Letters/digits only — used to judge whether a run is worth a voice switch. */
function significantLength(s: string): number {
  return (s.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

interface RawRun {
  text: string;
  cls: CharClass;
}

/** Split text into consecutive runs of the same character class. */
function toRawRuns(text: string): RawRun[] {
  const runs: RawRun[] = [];
  for (const ch of text) {
    const cls = classifyChar(ch);
    const last = runs[runs.length - 1];
    if (last && last.cls === cls) last.text += ch;
    else runs.push({ text: ch, cls });
  }
  return runs;
}

/**
 * Splits mixed-language text so each run is spoken by the right voice.
 *
 *   "Doesn't he love me(혹은 Does he not)?"
 *     → [en:"Doesn't he love me"], [ko:"(혹은"], [en:"Does he not)?"]
 *
 * Two rules keep it from turning into choppy word-by-word playback:
 *  1. Punctuation/spaces/digits attach to the neighbour they actually touch,
 *     so "3개" stays Korean and "apple(사과" splits at the bracket.
 *  2. A stray one-letter run of the minority language (the "A" and "B" in
 *     "A를 B로 굳히다") is absorbed into the dominant language instead of
 *     triggering two extra voice switches.
 */
export function segmentByLanguage(text: string, baseLang: SpeechLang = "en"): LangSegment[] {
  const runs = toRawRuns(text);
  const langRuns = runs.filter((r) => r.cls !== "neutral");

  if (langRuns.length === 0) {
    const trimmed = text.trim();
    return trimmed && significantLength(trimmed) > 0
      ? [{ text: trimmed, lang: baseLang }]
      : [];
  }

  // --- 1. Assemble segments, placing neutral runs sensibly -----------------
  const segments: LangSegment[] = [];
  let pendingNeutral = "";

  for (let i = 0; i < runs.length; i += 1) {
    const run = runs[i];

    if (run.cls === "neutral") {
      pendingNeutral += run.text;
      continue;
    }

    const last = segments[segments.length - 1];
    const sameAsPrevious = last !== undefined && last.lang === run.cls;

    if (sameAsPrevious) {
      last.text += pendingNeutral + run.text;
      pendingNeutral = "";
      continue;
    }

    if (pendingNeutral) {
      if (!last) {
        // Leading punctuation belongs to the first spoken segment.
        segments.push({ text: pendingNeutral + run.text, lang: run.cls });
        pendingNeutral = "";
        continue;
      }
      const wsIndex = pendingNeutral.search(/\s\S*$/);
      if (wsIndex >= 0) {
        // There is whitespace: everything before it closes the previous run.
        last.text += pendingNeutral.slice(0, wsIndex);
        pendingNeutral = pendingNeutral.slice(wsIndex);
      }
      // No whitespace ("3개", "apple(사과") → the punctuation/digits belong
      // with the run they are glued to.
    }

    segments.push({ text: pendingNeutral + run.text, lang: run.cls });
    pendingNeutral = "";
  }

  if (pendingNeutral && segments.length > 0) {
    segments[segments.length - 1].text += pendingNeutral;
  }

  // --- 2. Absorb insignificant minority runs ------------------------------
  const weight = new Map<SpeechLang, number>();
  for (const seg of segments) {
    weight.set(seg.lang, (weight.get(seg.lang) ?? 0) + significantLength(seg.text));
  }
  let dominant: SpeechLang = baseLang;
  let best = -1;
  weight.forEach((w, lang) => {
    if (w > best) {
      best = w;
      dominant = lang;
    }
  });

  const absorbed: LangSegment[] = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    const size = significantLength(seg.text);
    const isMinority = seg.lang !== dominant;
    // A single Latin letter ("A를 B로") is not worth switching voices for.
    // A lone Hangul/CJK syllable still is — it carries a whole word.
    const tooSmall = isMinority && seg.lang === "en" && size <= 1;
    const surroundedByDominant =
      (absorbed[absorbed.length - 1]?.lang ?? segments[i + 1]?.lang) === dominant;

    if (tooSmall && surroundedByDominant) {
      absorbed.push({ text: seg.text, lang: dominant });
    } else {
      absorbed.push({ ...seg });
    }
  }

  // --- 3. Merge neighbours that ended up sharing a language ---------------
  const merged: LangSegment[] = [];
  for (const seg of absorbed) {
    const last = merged[merged.length - 1];
    if (last && last.lang === seg.lang) {
      last.text = `${last.text} ${seg.text}`.replace(/\s+/g, " ");
    } else {
      merged.push({ ...seg });
    }
  }

  return merged
    .map((s) => ({ text: s.text.trim(), lang: s.lang }))
    .filter((s) => s.text.length > 0 && significantLength(s.text) > 0);
}

export function normalizeLang(lang: SpeechLang | undefined): string {
  switch ((lang ?? "en").toLowerCase().slice(0, 2)) {
    case "ko":
      return "ko-KR";
    case "zh":
      return "zh-CN";
    case "ja":
      return "ja-JP";
    default:
      return "en-US";
  }
}

/** Strips reading marks the courseware uses ("/" chunk markers, [tags]). */
function cleanText(text: string): string {
  return normalizeUnifiedSpeechText(text);
}

/** Break a long string into speakable chunks at sentence, then word boundaries. */
function splitChunks(text: string, maxLen: number): string[] {
  if (text.length <= maxLen) return [text];

  const out: string[] = [];
  const sentences = text.match(/[^.!?。！？]+[.!?。！？]*\s*/g) ?? [text];
  let cur = "";

  const pushWords = (piece: string) => {
    const words = piece.split(/\s+/);
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxLen) {
        if (line) out.push(line.trim());
        line = w;
      } else {
        line = line ? `${line} ${w}` : w;
      }
    }
    if (line.trim()) out.push(line.trim());
  };

  for (const s of sentences) {
    const sentence = s.trim();
    if (!sentence) continue;
    if (sentence.length > maxLen) {
      if (cur.trim()) {
        out.push(cur.trim());
        cur = "";
      }
      pushWords(sentence);
      continue;
    }
    if ((cur + " " + sentence).trim().length > maxLen) {
      if (cur.trim()) out.push(cur.trim());
      cur = sentence;
    } else {
      cur = cur ? `${cur} ${sentence}` : sentence;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out.length > 0 ? out : [text];
}

// ---------------------------------------------------------------------------
// Core playback engine
// ---------------------------------------------------------------------------

/**
 * Every playback request captures the token that was current when it started.
 * stopSpeech()/a new request bumps the token, which instantly invalidates all
 * pending callbacks of the previous run. This is what makes 정지 actually stop
 * and prevents the queue from double-advancing.
 */
let token = 0;

// Keeps utterances alive so iOS WebKit doesn't garbage-collect them mid-sentence.
const activeUtterances = new Set<SpeechSynthesisUtterance>();

interface ActiveRun {
  runToken: number;
  chunks: LangSegment[];
  chunkIndex: number;
  gender: VoiceGender;
  rate: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
  started: boolean;
  /** true while the engine for the current chunk is the MP3 stream */
  usingStream: boolean;
}

let active: ActiveRun | null = null;
let manuallyPaused = false;
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
let watchdogTimer: ReturnType<typeof setTimeout> | null = null;

function clearWatchdog() {
  if (watchdogTimer) {
    clearTimeout(watchdogTimer);
    watchdogTimer = null;
  }
}

/** Chrome silently kills utterances after ~15s; pause+resume resets its timer. */
function startKeepAlive() {
  if (keepAliveTimer || isIOS() || !hasSynthesis()) return;
  keepAliveTimer = setInterval(() => {
    try {
      const s = window.speechSynthesis;
      if (manuallyPaused) return;
      if (s.speaking && !s.paused) {
        s.pause();
        s.resume();
      }
    } catch {
      // ignore
    }
  }, 8000);
}

function stopKeepAlive() {
  if (keepAliveTimer) {
    clearInterval(keepAliveTimer);
    keepAliveTimer = null;
  }
}

function hardCancelSynthesis() {
  if (!hasSynthesis()) return;
  try {
    // resume() first: a paused engine ignores cancel() on some Chrome builds.
    if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
  activeUtterances.clear();
}

function hardStopStream() {
  if (!sharedAudioElement) return;
  try {
    sharedAudioElement.onended = null;
    sharedAudioElement.onerror = null;
    sharedAudioElement.pause();
    sharedAudioElement.removeAttribute("src");
    sharedAudioElement.load();
  } catch {
    // ignore
  }
}

/**
 * Chrome goes silent when speak() is called in the same tick as cancel().
 * Run synchronously when the engine is idle (keeps the iOS user-gesture),
 * otherwise cancel and start on the next macrotask.
 */
function startAfterCancel(fn: () => void) {
  let busy = false;
  try {
    busy = hasSynthesis() && (window.speechSynthesis.speaking || window.speechSynthesis.pending);
  } catch {
    busy = false;
  }
  const streamBusy = !!sharedAudioElement && !sharedAudioElement.paused && !!sharedAudioElement.src;

  hardCancelSynthesis();
  hardStopStream();

  if (busy || streamBusy) {
    setTimeout(fn, 90);
  } else {
    fn();
  }
}

function isStale(runToken: number): boolean {
  return runToken !== token || active === null || active.runToken !== runToken;
}

function finishRun(runToken: number, error?: unknown) {
  if (isStale(runToken)) return;
  const run = active;
  active = null;
  stopKeepAlive();
  clearWatchdog();
  manuallyPaused = false;
  emit({ speaking: false, paused: false, text: null });
  if (error !== undefined) {
    run?.onError?.(error);
  } else {
    run?.onEnd?.();
  }
}

// --- MP3 stream engine (used for In-App browsers & missing voices) ----------

function playChunkViaStream(chunk: LangSegment, runToken: number) {
  const audio = getSharedAudio();
  if (!audio) {
    finishRun(runToken, new Error("audio element unavailable"));
    return;
  }

  const run = active;
  if (!run) return;
  run.usingStream = true;

  const tl = normalizeLang(chunk.lang).split("-")[0];
  const pieces = splitChunks(chunk.text, 180);
  let pieceIndex = 0;

  const playPiece = () => {
    if (isStale(runToken)) return;
    if (pieceIndex >= pieces.length) {
      advanceChunk(runToken);
      return;
    }
    const q = encodeURIComponent(pieces[pieceIndex]);
    audio.src = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${tl}&client=tw-ob&ttsspeed=${run.rate}&q=${q}`;
    audio.playbackRate = Math.max(0.5, Math.min(2, run.rate));

    audio.onended = () => {
      if (isStale(runToken)) return;
      pieceIndex += 1;
      playPiece();
    };
    audio.onerror = () => {
      if (isStale(runToken)) return;
      finishRun(runToken, new Error("audio stream failed"));
    };

    const p = audio.play();
    if (p && typeof p.then === "function") {
      p.then(() => {
        if (isStale(runToken)) return;
        if (!run.started) {
          run.started = true;
          emit({ speaking: true, paused: false, text: chunk.text });
          run.onStart?.();
        }
      }).catch((err) => {
        if (isStale(runToken)) return;
        finishRun(runToken, err);
      });
    } else if (!run.started) {
      run.started = true;
      emit({ speaking: true, paused: false, text: chunk.text });
      run.onStart?.();
    }
  };

  playPiece();
}

/** Play the pre-generated Ava clip, falling back to the legacy engines on 404/error. */
function playUnifiedClip(
  clean: string,
  options: SpeakOptions,
  runToken: number,
  onUnavailable: () => void,
): boolean {
  if (!shouldUseUnifiedSpeech()) return false;
  const audio = getSharedAudio();
  if (!audio) return false;

  active = {
    runToken,
    chunks: [{ text: clean, lang: options.lang ?? "en" }],
    chunkIndex: 0,
    gender: "female",
    rate: options.rate ?? 1.0,
    pitch: options.pitch,
    onStart: options.onStart,
    onEnd: options.onEnd,
    onError: options.onError,
    started: false,
    usingStream: true,
  };
  manuallyPaused = false;
  emit({ speaking: true, paused: false, text: clean });

  let settled = false;
  const failAvaPlayback = () => {
    if (settled || runToken !== token) return;
    settled = true;
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    } catch {
      // Ignore cleanup failures; the Ava error is reported below.
    }
    // A missing/corrupt Ava file must not abort the whole sentence queue.
    // Continue this same item through the browser/stream fallback so its
    // onEnd handler can advance to every remaining sentence.
    active = null;
    stopKeepAlive();
    clearWatchdog();
    manuallyPaused = false;
    if (runToken === token) onUnavailable();
  };

  // The one-time mobile warm-up briefly lowers the shared element's volume.
  // Some WebViews reject that silent primer, so always restore an audible
  // state immediately before loading a real clip.
  audio.muted = false;
  audio.defaultMuted = false;
  audio.volume = 1;
  // Keep Ava playback same-origin. Next.js transparently proxies this stable
  // path to R2 in production, avoiding CORS/WebView media restrictions.
  audio.src = unifiedSpeechPath(clean);
  audio.playbackRate = Math.max(0.5, Math.min(2, options.rate ?? 1.0));
  audio.onended = () => {
    if (settled || isStale(runToken)) return;
    settled = true;
    finishRun(runToken);
  };
  audio.onerror = failAvaPlayback;

  try {
    const playback = audio.play();
    if (playback && typeof playback.then === "function") {
      playback
        .then(() => {
          if (settled || isStale(runToken)) return;
          const run = active;
          if (run && !run.started) {
            run.started = true;
            run.onStart?.();
          }
        })
        .catch(failAvaPlayback);
    }
  } catch {
    failAvaPlayback();
  }

  return true;
}

// --- Web Speech engine -----------------------------------------------------

function playChunkViaSynthesis(chunk: LangSegment, runToken: number) {
  const run = active;
  if (!run) return;
  run.usingStream = false;

  const u = new SpeechSynthesisUtterance(chunk.text);
  u.lang = normalizeLang(chunk.lang);
  u.rate = Math.max(0.5, Math.min(1.6, run.rate));

  const defaultPitch = run.gender === "male" ? 0.9 : run.gender === "female" ? 1.1 : 1.0;
  u.pitch = run.pitch ?? defaultPitch;

  const voice = findBestVoice(chunk.lang, run.gender);
  if (voice) u.voice = voice;

  let settled = false;

  u.onstart = () => {
    clearWatchdog();
    if (isStale(runToken)) return;
    if (!run.started) {
      run.started = true;
      run.onStart?.();
    }
    emit({ speaking: true, paused: false, text: chunk.text });
  };

  u.onend = () => {
    activeUtterances.delete(u);
    clearWatchdog();
    if (settled) return;
    settled = true;
    // Stale (cancelled) utterances must NOT advance anything.
    if (isStale(runToken)) return;
    if (manuallyPaused) return;
    advanceChunk(runToken);
  };

  u.onerror = (e) => {
    activeUtterances.delete(u);
    clearWatchdog();
    if (settled) return;
    settled = true;
    if (isStale(runToken)) return;

    const reason = (e as SpeechSynthesisErrorEvent).error;
    if (reason === "canceled" || reason === "interrupted") {
      // We caused this — a newer request or stopSpeech() is in charge now.
      return;
    }
    // Engine failed for real: fall back to the MP3 stream for this chunk.
    playChunkViaStream(chunk, runToken);
  };

  activeUtterances.add(u);

  try {
    window.speechSynthesis.speak(u);
    startKeepAlive();
  } catch {
    activeUtterances.delete(u);
    playChunkViaStream(chunk, runToken);
    return;
  }

  // Watchdog: some WebViews accept speak() and then stay silent forever.
  clearWatchdog();
  watchdogTimer = setTimeout(() => {
    if (settled || isStale(runToken)) return;
    let alive = false;
    try {
      alive = window.speechSynthesis.speaking || window.speechSynthesis.pending;
    } catch {
      alive = false;
    }
    if (!alive) {
      settled = true;
      activeUtterances.delete(u);
      hardCancelSynthesis();
      playChunkViaStream(chunk, runToken);
    }
  }, 1500);
}

function advanceChunk(runToken: number) {
  if (isStale(runToken)) return;
  const run = active;
  if (!run) return;
  run.chunkIndex += 1;
  runCurrentChunk(runToken);
}

function runCurrentChunk(runToken: number) {
  if (isStale(runToken)) return;
  const run = active;
  if (!run) return;

  if (run.chunkIndex >= run.chunks.length) {
    finishRun(runToken);
    return;
  }

  const chunk = run.chunks[run.chunkIndex];
  const useStream =
    !hasSynthesis() || isKakaoTalk() || isInAppBrowser() || !hasVoiceFor(chunk.lang);

  if (useStream) {
    playChunkViaStream(chunk, runToken);
  } else {
    playChunkViaSynthesis(chunk, runToken);
  }
}

/** Internal speak that runs under a caller-supplied token (used by the queue). */
function speakWithToken(text: string, options: SpeakOptions, runToken: number) {
  const clean = cleanText(text);
  if (!clean) {
    if (runToken === token) options.onEnd?.();
    return;
  }

  const startLegacyEngine = () => {
    if (runToken !== token) return;
    const baseLang = options.lang ?? "en";
    const autoDetect = options.autoDetectLanguage !== false;
    const segments: LangSegment[] = autoDetect
      ? segmentByLanguage(clean, baseLang)
      : [{ text: clean, lang: baseLang }];

    const chunks: LangSegment[] = [];
    for (const seg of segments) {
      for (const piece of splitChunks(seg.text, 200)) {
        chunks.push({ text: piece, lang: seg.lang });
      }
    }
    if (chunks.length === 0) {
      if (runToken === token) options.onEnd?.();
      return;
    }

    active = {
      runToken,
      chunks,
      chunkIndex: 0,
      gender: options.gender ?? "neutral",
      rate: options.rate ?? 1.0,
      pitch: options.pitch,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError,
      started: false,
      usingStream: false,
    };
    manuallyPaused = false;
    emit({ speaking: true, paused: false, text: chunks[0].text });
    runCurrentChunk(runToken);
  };

  if (!playUnifiedClip(clean, options, runToken, startLegacyEngine)) {
    startLegacyEngine();
  }
}

// ---------------------------------------------------------------------------
// Public API — single utterance
// ---------------------------------------------------------------------------

/**
 * Speak a sentence or snippet. Korean, English, Chinese and mixed text are all
 * supported; mixed text is split so each language uses its own voice.
 */
export function speakText(text: string, options: SpeakOptions = {}): void {
  if (typeof window === "undefined") return;

  // A direct speakText() call cancels any queue playback.
  resetQueue();
  const runToken = ++token;

  unlockMobileAudio();
  emit({ index: -1, total: 0 });

  startAfterCancel(() => {
    if (runToken !== token) return;
    speakWithToken(text, options, runToken);
  });
}

/**
 * Legacy export: force the MP3 stream engine for a snippet.
 * Kept so existing imports keep working.
 */
export function playAudioStream(
  text: string,
  options: { lang?: SpeechLang; rate?: number; onStart?: () => void; onEnd?: () => void; onError?: (e: unknown) => void } = {},
): void {
  if (typeof window === "undefined") return;
  const clean = cleanText(text);
  if (!clean) {
    options.onEnd?.();
    return;
  }

  resetQueue();
  const runToken = ++token;
  unlockMobileAudio();

  startAfterCancel(() => {
    if (runToken !== token) return;
    active = {
      runToken,
      chunks: segmentByLanguage(clean, options.lang ?? "en"),
      chunkIndex: 0,
      gender: "neutral",
      rate: options.rate ?? 1.0,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError,
      started: false,
      usingStream: true,
    };
    manuallyPaused = false;
    emit({ speaking: true, paused: false, text: clean });
    const run = active;
    if (run) playChunkViaStream(run.chunks[0], runToken);
  });
}

// ---------------------------------------------------------------------------
// Public API — sentence queue
// ---------------------------------------------------------------------------

interface QueueOptions {
  lang?: SpeechLang;
  gender?: VoiceGender;
  rate?: number;
  startIndex?: number;
  /** Pause between sentences in ms. Default 250. */
  gap?: number;
  /** Repeat the whole queue when finished. */
  loop?: boolean;
  onProgress?: (index: number, text: string) => void;
  onEnd?: () => void;
  onError?: (err: unknown) => void;
}

let queue: string[] = [];
let queueIndex = 0;
let queueToken = -1;
let queueOptions: QueueOptions = {};
let queueGapTimer: ReturnType<typeof setTimeout> | null = null;

function resetQueue() {
  if (queueGapTimer) {
    clearTimeout(queueGapTimer);
    queueGapTimer = null;
  }
  queue = [];
  queueIndex = 0;
  queueToken = -1;
  queueOptions = {};
}

/** Play a list of sentences one after another. */
export function playSentenceQueue(sentences: string[], options: QueueOptions = {}): void {
  if (typeof window === "undefined") return;
  const items = (sentences ?? []).map((s) => s ?? "").filter((s) => cleanText(s).length > 0);
  if (items.length === 0) {
    options.onEnd?.();
    return;
  }

  resetQueue();
  const runToken = ++token;

  queue = items;
  queueIndex = Math.max(0, Math.min(items.length - 1, options.startIndex ?? 0));
  queueToken = runToken;
  queueOptions = options;

  unlockMobileAudio();
  emit({ index: queueIndex, total: items.length, speaking: true, paused: false });

  startAfterCancel(() => {
    if (runToken !== token) return;
    playQueueItem(runToken);
  });
}

function playQueueItem(runToken: number) {
  if (runToken !== token || queueToken !== runToken) return;

  if (queueIndex >= queue.length) {
    if (queueOptions.loop) {
      queueIndex = 0;
    } else {
      const done = queueOptions.onEnd;
      resetQueue();
      emit({ speaking: false, paused: false, index: -1, total: 0, text: null });
      done?.();
      return;
    }
  }

  const text = queue[queueIndex];
  emit({ index: queueIndex, total: queue.length, speaking: true, text });
  queueOptions.onProgress?.(queueIndex, text);

  speakWithToken(
    text,
    {
      lang: queueOptions.lang,
      gender: queueOptions.gender,
      rate: queueOptions.rate,
      onEnd: () => {
        if (runToken !== token || queueToken !== runToken) return;
        queueIndex += 1;
        const gap = queueOptions.gap ?? 250;
        queueGapTimer = setTimeout(() => {
          queueGapTimer = null;
          if (runToken !== token || queueToken !== runToken) return;
          playQueueItem(runToken);
        }, gap);
      },
      onError: (err) => {
        if (runToken !== token || queueToken !== runToken) return;
        const failed = queueOptions.onError;
        resetQueue();
        emit({ speaking: false, paused: false, index: -1, total: 0, text: null });
        failed?.(err);
      },
    },
    runToken,
  );
}

/** Jump to a specific sentence in the active queue and keep playing. */
export function jumpToQueueIndex(index: number): boolean {
  if (queueToken === -1 || queue.length === 0) return false;
  const next = Math.max(0, Math.min(queue.length - 1, index));

  if (queueGapTimer) {
    clearTimeout(queueGapTimer);
    queueGapTimer = null;
  }

  const opts = queueOptions;
  const items = queue;
  playSentenceQueue(items, { ...opts, startIndex: next });
  return true;
}

/** Skip to the next sentence. Returns false when there is no active queue. */
export function nextSentence(): boolean {
  if (queueToken === -1) return false;
  return jumpToQueueIndex(queueIndex + 1);
}

/** Go back one sentence. Returns false when there is no active queue. */
export function previousSentence(): boolean {
  if (queueToken === -1) return false;
  return jumpToQueueIndex(queueIndex - 1);
}

export function getQueueIndex(): number {
  return queueToken === -1 ? -1 : queueIndex;
}

export function getQueueLength(): number {
  return queueToken === -1 ? 0 : queue.length;
}

// ---------------------------------------------------------------------------
// Transport controls
// ---------------------------------------------------------------------------

/** Stop everything immediately and drop all pending callbacks. */
export function stopSpeech(): void {
  token += 1; // invalidates every in-flight callback
  active = null;
  manuallyPaused = false;
  resetQueue();
  stopKeepAlive();
  clearWatchdog();
  hardCancelSynthesis();
  hardStopStream();
  emit({ speaking: false, paused: false, index: -1, total: 0, text: null });
}

/**
 * Pause playback.
 * Android's speechSynthesis.pause() behaves like cancel(), so there we stop the
 * current chunk and remember where we were; resumeSpeech() re-speaks it.
 */
export function pauseSpeech(): void {
  if (!snapshot.speaking || manuallyPaused) return;
  manuallyPaused = true;

  if (active?.usingStream || !hasSynthesis()) {
    try {
      sharedAudioElement?.pause();
    } catch {
      // ignore
    }
    emit({ paused: true });
    return;
  }

  if (isAndroid()) {
    // Stop the engine but keep `active` so we can restart the current chunk.
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
    activeUtterances.clear();
    stopKeepAlive();
    clearWatchdog();
    emit({ paused: true });
    return;
  }

  try {
    window.speechSynthesis.pause();
  } catch {
    // ignore
  }
  emit({ paused: true });
}

/** Resume after pauseSpeech(). */
export function resumeSpeech(): void {
  if (!manuallyPaused) return;
  manuallyPaused = false;

  if (active?.usingStream || !hasSynthesis()) {
    try {
      sharedAudioElement?.play().catch(() => {});
    } catch {
      // ignore
    }
    emit({ paused: false });
    return;
  }

  if (isAndroid()) {
    const run = active;
    if (run) {
      emit({ paused: false });
      runCurrentChunk(run.runToken); // re-speak the interrupted chunk
    }
    return;
  }

  try {
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }
  emit({ paused: false });
}

/** Pause when playing, resume when paused. Returns the new paused state. */
export function togglePauseSpeech(): boolean {
  if (manuallyPaused) {
    resumeSpeech();
    return false;
  }
  pauseSpeech();
  return true;
}

export function isSpeaking(): boolean {
  return snapshot.speaking;
}

export function isPaused(): boolean {
  return snapshot.paused;
}
