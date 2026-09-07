"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "./LanguageProvider";
import { mediaUrl, hasAudioFile } from "@/lib/media";
import { shouldUseUnifiedSpeech } from "@/lib/unifiedSpeech";
import {
  playSentenceQueue,
  stopSpeech,
  togglePauseSpeech,
  nextSentence,
  previousSentence,
  jumpToQueueIndex,
  subscribeSpeech,
  getSpeechSnapshot,
  getServerSpeechSnapshot,
  unlockMobileAudio,
  type VoiceGender,
} from "@/lib/speech";

/**
 * Intelligent Audio Player with Web Speech (TTS) fallback.
 *
 * Plays the original MP3 when it exists; otherwise reads the lesson sentences
 * aloud one by one. Stop, pause/resume, and previous/next now all work in both
 * modes because playback state is read directly from the speech engine.
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
  const pathname = usePathname();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [missing, setMissing] = useState(() => !hasAudioFile(src));
  const [playBlocked, setPlayBlocked] = useState(false);
  const lastTimeRef = useRef(0);

  // Live engine state (speaking / paused / queue position)
  const speech = useSyncExternalStore(
    subscribeSpeech,
    getSpeechSnapshot,
    getServerSpeechSnapshot
  );

  const isTtsMode =
    fallbackSentences.length > 0 && (shouldUseUnifiedSpeech(pathname) || missing || !src);
  const ttsIndex = speech.index >= 0 ? speech.index : 0;
  const ttsActive = isTtsMode && speech.speaking;

  useEffect(() => {
    const el = ref.current;
    if (el) el.playbackRate = rate;
  }, [rate]);

  // Stop speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function startQueue(startIndex: number, playbackRate = rate) {
    playSentenceQueue(fallbackSentences, {
      lang,
      gender,
      rate: playbackRate,
      startIndex,
      gap: 300,
    });
  }

  function toggle() {
    unlockMobileAudio();

    if (isTtsMode) {
      if (speech.speaking) {
        // Playing → pause. Paused → resume. Long-press equivalent (stop) is 정지 button.
        togglePauseSpeech();
      } else {
        startQueue(0);
      }
      return;
    }

    const el = ref.current;
    if (!el || !src) return;

    if (el.paused) {
      setPlayBlocked(false);
      el.play().catch((err) => {
        console.warn("Audio play() blocked, switching to TTS:", err);
        setPlaying(false);
        if (fallbackSentences.length > 0) {
          setMissing(true);
          startQueue(0);
        } else {
          setPlayBlocked(true);
        }
      });
    } else {
      el.pause();
    }
  }

  function stopAll() {
    stopSpeech();
    const el = ref.current;
    if (el) {
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // ignore
      }
    }
    setPlaying(false);
  }

  function seek(seconds: number) {
    if (isTtsMode) {
      if (speech.speaking) {
        if (seconds > 0) nextSentence();
        else previousSentence();
      } else {
        const next = Math.max(
          0,
          Math.min(fallbackSentences.length - 1, ttsIndex + (seconds > 0 ? 1 : -1))
        );
        startQueue(next);
      }
      return;
    }

    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.min(Math.max(0, el.currentTime + seconds), el.duration || 0);
  }

  function scrub(e: React.ChangeEvent<HTMLInputElement>) {
    if (isTtsMode) return;
    const el = ref.current;
    if (!el) return;
    el.currentTime = Number(e.target.value);
    setTime(el.currentTime);
  }

  function changeRate(r: number) {
    setRate(r);
    if (isTtsMode && speech.speaking) {
      startQueue(ttsIndex, r);
    }
  }

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
  });

  const showPauseIcon = isTtsMode ? speech.speaking && !speech.paused : playing;
  const anythingActive = isTtsMode ? speech.speaking : playing;

  return (
    <div className="rounded-3xl border border-line bg-raised p-5 transition-all duration-300 hover:shadow-md shadow-2xs">
      {src && !missing && !isTtsMode ? (
        <audio
          ref={ref}
          src={mediaUrl(src)}
          preload="metadata"
          playsInline
          autoPlay={autoplay}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onTimeUpdate={(e) => {
            const ct = e.currentTarget.currentTime;
            if (Math.abs(ct - lastTimeRef.current) >= 0.25 || ct === 0 || ct >= duration) {
              lastTimeRef.current = ct;
              setTime(ct);
            }
          }}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onError={() => setMissing(true)}
        />
      ) : null}

      <div className="mb-3 flex items-center justify-between gap-2">
        {label ? (
          <p className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-ink-faint uppercase font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-primary/70" />
            {label}
          </p>
        ) : (
          <span />
        )}

        {isTtsMode ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10.5px] font-semibold text-primary border border-primary/20">
            <span
              className={`h-1.5 w-1.5 rounded-full bg-primary ${ttsActive ? "animate-pulse" : ""}`}
            />
            {t("player.ttsMode")} ·{" "}
            {gender === "male" ? "남성 보이스" : gender === "female" ? "여성 보이스" : "음성"} (
            {fallbackSentences.length}문장)
          </span>
        ) : null}
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={showPauseIcon ? t("player.pause") : t("player.play")}
          className="flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer hover:bg-black/90"
        >
          {showPauseIcon ? (
            <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <rect x="3" y="2" width="4" height="12" rx="1" />
              <rect x="9" y="2" width="4" height="12" rx="1" />
            </svg>
          ) : (
            <svg
              width="15"
              height="15"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden
              className="ml-0.5"
            >
              <path d="M4 2.5v11a.5.5 0 0 0 .77.42l8.5-5.5a.5.5 0 0 0 0-.84l-8.5-5.5A.5.5 0 0 0 4 2.5Z" />
            </svg>
          )}
        </button>

        {/* Hard stop — this is what was missing before */}
        <button
          type="button"
          onClick={stopAll}
          disabled={!anythingActive}
          aria-label="정지"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised disabled:opacity-30 transition-all cursor-pointer"
        >
          <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => seek(-5)}
          aria-label={t("player.back5")}
          className="px-2 sm:px-2.5 py-1 font-mono text-[10.5px] sm:text-[11px] font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink rounded-full transition-colors cursor-pointer shrink-0"
        >
          {isTtsMode ? "이전" : "−5s"}
        </button>

        <button
          type="button"
          onClick={() => seek(5)}
          aria-label="앞으로 5초 이동"
          className="px-2 sm:px-2.5 py-1 font-mono text-[10.5px] sm:text-[11px] font-medium text-ink-soft hover:bg-black/[0.04] hover:text-ink rounded-full transition-colors cursor-pointer shrink-0"
        >
          {isTtsMode ? "다음" : "+5s"}
        </button>

        {isTtsMode ? (
          <div className="flex-1 px-1 sm:px-2 min-w-[50px]">
            <div className="flex h-3 w-full items-center gap-[2px]">
              {fallbackSentences.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    if (speech.speaking) jumpToQueueIndex(i);
                    else startQueue(i);
                  }}
                  aria-label={`${i + 1}번째 문장으로 이동`}
                  className={`h-1.5 flex-1 rounded-full transition-colors cursor-pointer ${
                    i <= ttsIndex && ttsActive
                      ? "bg-primary"
                      : "bg-black/[0.08] dark:bg-white/[0.10] hover:bg-primary/40"
                  }`}
                />
              ))}
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
            className="h-2 flex-1 min-w-[60px] cursor-pointer appearance-none bg-black/[0.06] dark:bg-white/[0.08] accent-[var(--primary)] hover:h-2.5 transition-all rounded-full"
          />
        )}

        <span className="w-18 sm:w-24 shrink-0 text-right font-mono text-[10.5px] sm:text-[11.5px] tabular-nums text-ink-faint">
          {isTtsMode
            ? `${ttsIndex + 1}/${fallbackSentences.length}`
            : `${fmt(time)} / ${fmt(duration)}`}
        </span>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-black/[0.05] pt-2.5 text-[11.5px]">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-wide text-ink-faint uppercase">
            {t("player.speed")}
          </span>
          {[0.8, 1, 1.2].map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => changeRate(r)}
              aria-pressed={rate === r}
              className={
                "rounded px-2 py-0.5 font-mono text-[11px] transition-colors cursor-pointer " +
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
            {speech.paused
              ? "⏸ 일시정지됨 — ▶ 를 눌러 이어 듣기"
              : ttsActive
              ? "🔊 음성 읽는 중…"
              : "▶ 재생 버튼을 눌러 전체 듣기"}
          </span>
        ) : null}
      </div>

      {playBlocked && (
        <p className="mt-2 text-center text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          ▶ 재생 버튼을 한 번 더 탭해 주세요 (브라우저 자동재생 정책)
        </p>
      )}
    </div>
  );
}

function fmt(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
