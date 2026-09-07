const UNIFIED_SPEECH_ROOT = "/audio/azure-ava/v1";

/** Keep this normalization in sync with scripts/generate-azure-ava.mjs. */
export function normalizeUnifiedSpeechText(text: string): string {
  return text
    .replace(/\s*\/\s*/g, " ")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/:{2,}/g, " ")
    .replace(/-{2,}/g, " ")
    .replace(/[…]+/g, " ")
    .replace(/\s*\|\s*/g, ", ")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * A deterministic 64-bit-style key built from two independent 32-bit hashes.
 * It is synchronous so a click can start audio inside the browser gesture.
 */
export function unifiedSpeechKey(text: string): string {
  const clean = normalizeUnifiedSpeechText(text);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
    second ^= second >>> 13;
  }

  const hex = (value: number) => (value >>> 0).toString(16).padStart(8, "0");
  return `${clean.length.toString(36)}-${hex(first)}${hex(second)}`;
}

export function unifiedSpeechPath(text: string): string {
  return `${UNIFIED_SPEECH_ROOT}/${unifiedSpeechKey(text)}.mp3`;
}

/** CNN intentionally keeps its original broadcast/TTS audio. */
export function shouldUseUnifiedSpeech(pathname?: string): boolean {
  const currentPath =
    pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);
  if (!currentPath) return false;
  return !/(?:^|\/)cnn(?:\/|$)/i.test(currentPath);
}
