"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { mediaUrl } from "@/lib/media";
import { playSentenceQueue, stopSpeech, isSpeaking, type VoiceGender } from "@/lib/speech";

/**
 * Intelligent Audio Player with native Web Speech API (TTS) Fallback.
 *
 * If the server or local MP3 file exists, it plays the original recording with
 * seek, speed, and replay controls. If the media file is missing, it smoothly
 * falls back to speech synthesis reading the lesson sentences aloud, ensuring
 * that the educational learning experience never breaks.
 *
 * Supports gender-specific voice playback (Male for MEN, Female for WOMEN).
 */
export function AudioPlayer({
  src,
  fallbackSentences = [],
  lang = "en",
  gender = "neutral",
  autoplay = false,
  label,
}: {
  src?: string;
  fallbackSentences?: string[];
  lang?: "en" | "ko" | "zh" | string;
  gender?: VoiceGender;
  autoplay?: boolean;
  label?: string;
}) {
  const { t } = useLanguage();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [missing, setMissing] = useState(false);

  // TTS fallback state
  const [ttsActive, setTtsActive] = useState(false);
  const [ttsCurrentIndex, setTtsCurrentIndex] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  // Clean up speech synthesis when component unmounts
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Keyboard shortcut: Space to toggle playback
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [missing, src, ttsActive, fallbackSentences, lang, gender, rate, ttsCurrentIndex]);

  function toggle() {
    if (missing || !src) {
      // Toggle TTS mode
      if (ttsActive) {
        stopSpeech();
        setTtsActive(false);
        setPlaying(false);
      } else {
        if (fallbackSentences.length === 0) return;
        setTtsActive(true);
        setPlaying(true);
        playSentenceQueue(fallbackSentences, {
          lang,
          gender,
          rate,
          startIndex: ttsCurrentIndex,
          onProgress: (idx) => {
            setTtsCurrentIndex(idx);
          },
          onEnd: () => {
            setTtsActive(false);
            setPlaying(false);
            setTtsCurrentIndex(0);
          },
        });
      }
      return;
    }

    const el = ref.current;
    if (!el) return;
    if (el.paused) {
      void el.play();
    } else {
      el.pause();
    }
  }

  function seek(seconds: number) {
    if (missing || !src) {
      // Move previous/next sentence in TTS
      const nextIdx = Math.max(0, Math.min(fallbackSentences.length - 1, ttsCurrentIndex + (seconds > 0 ? 1 : -1)));
      setTtsCurrentIndex(nextIdx);
      if (ttsActive) {
        playSentenceQueue(fallbackSentences, {
          lang,
          gender,
          rate,
          startIndex: nextIdx,
          onProgress: (idx) => setTtsCurrentIndex(idx),
          onEnd: () => {
            setTtsActive(false);
            setPlaying(false);
            setTtsCurrentIndex(0);
          },
        });
      }
      return;
    }

    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || 0);
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (missing || !src) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  }

  const isTtsMode = (missing || !src) && fallbackSentences.length > 0;

  return (
    <div className="rounded-3xl border border-black/[0.06] bg-gradient-to-b from-white to-gray-50/80 p-5 transition-all duration-300 hover:shadow-md shadow-2xs">
      {src && !missing ? (
        <audio
          ref={ref}
          src={mediaUrl(src)}
          preload="metadata"
          autoPlay={autoplay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onError={() => setMissing(true)}
        />
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-2">
        {label ? (
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-ink-faint uppercase font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-black/40" />
            {label}
          </p>
        ) : (
          <span />
        )}

        {isTtsMode ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-emerald-700 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t("player.ttsMode")} · {gender === "male" ? "남성 보이스" : gender === "female" ? "여성 보이스" : "음성"} ({fallbackSentences.length}문장)
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? t("player.pause") : t("player.play")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
        >
          {playing ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden className="ml-0.5">
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={() => seek(-5)}
          aria-label={t("player.back5")}
          className="px-2.5 py-1 font-mono text-[11px] font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink rounded-full transition-colors cursor-pointer"
        >
          {isTtsMode ? "이전 문장" : "−5s"}
        </button>

        <button
          type="button"
          onClick={() => seek(5)}
          aria-label="앞으로 5초 이동"
          className="px-2.5 py-1 font-mono text-[11px] font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink rounded-full transition-colors cursor-pointer"
        >
          {isTtsMode ? "다음 문장" : "+5s"}
        </button>

        {isTtsMode ? (
          <div className="flex-1 px-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
              <div
                className="h-full bg-ink rounded-full transition-all duration-300"
                style={{
                  width: `${fallbackSentences.length > 0 ? ((ttsCurrentIndex + 1) / fallbackSentences.length) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        ) : (
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={time}
            onChange={scrub}
            aria-label={t("player.seek")}
            className="h-1.5 flex-1 cursor-pointer appearance-none bg-black/[0.06] accent-[var(--ink)] hover:h-2 transition-all rounded-full"
          />
        )}

        <span className="w-24 shrink-0 text-right font-mono text-[11.5px] tabular-nums text-ink-faint">
          {isTtsMode
            ? `${ttsCurrentIndex + 1} / ${fallbackSentences.length}`
            : `${fmt(time)} / ${fmt(duration)}`}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-2.5 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-wide text-ink-faint uppercase">{t("player.speed")}</span>
          {[0.8, 1, 1.2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => {
                setRate(r);
                if (isTtsMode && ttsActive) {
                  playSentenceQueue(fallbackSentences, {
                    lang,
                    gender,
                    rate: r,
                    startIndex: ttsCurrentIndex,
                    onProgress: (idx) => setTtsCurrentIndex(idx),
                    onEnd: () => {
                      setTtsActive(false);
                      setPlaying(false);
                      setTtsCurrentIndex(0);
                    },
                  });
                }
              }}
              aria-pressed={rate === r}
              className={
                "rounded px-2 py-0.5 font-mono text-[11px] transition-colors " +
                (rate === r
                  ? "bg-ink text-surface font-medium"
                  : "text-ink-soft hover:bg-raised hover:text-ink")
              }
            >
              {r}×
            </button>
          ))}
        </div>

        {isTtsMode ? (
          <span className="text-[11px] text-ink-soft">
            {ttsActive ? "🔊 음성 읽는 중…" : "▶ 재생 버튼을 눌러 전체 듣기"}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
