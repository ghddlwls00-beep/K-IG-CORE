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
  initialRate,
  onRateChange,
}: {
  src?: string;
  fallbackSentences?: string[];
  lang?: "en" | "ko" | "zh" | string;
  gender?: VoiceGender;
  autoplay?: boolean;
  label?: string;
  /**
   * 2026-09-27 (VOCA · 계획 A10 · D01): a course view that plays the lesson with this player AND plays single items itself keeps
   * one speed control — this one: it starts the player at the view's speed and hears every change. Absent → 1× and nothing
   * reported, exactly as before.
   */
  initialRate?: number;
  onRateChange?: (rate: number) => void;
}) {
  const { t } = useLanguage();
  const pathname = usePathname();
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(initialRate ?? 1);
  const [missing, setMissing] = useState(() => !hasAudioFile(src));
  const [playBlocked, setPlayBlocked] = useState(false);
  const lastTimeRef = useRef(0);
  /** set by the first press of play — the Space shortcut waits for it */
  const usedRef = useRef(false);

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

  // Sentence slider (UX-05): the index being chosen while the finger or key is down.
  const [scrubIndex, setScrubIndex] = useState<number | null>(null);
  function commitScrub() {
    if (scrubIndex === null) return;
    const index = scrubIndex;
    setScrubIndex(null);
    if (speech.speaking) jumpToQueueIndex(index);
    else startQueue(index);
  }

  function toggle() {
    unlockMobileAudio();
    usedRef.current = true;

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
    onRateChange?.(r);
    if (isTtsMode && speech.speaking) {
      startQueue(ttsIndex, r);
    }
  }

  // Keyboard shortcut: Space toggles playback — 2026-09-27 (점검 FRAME-U14 · LD-U18): only once the
  // learner has used this player, and only when nothing on the page has focus. It used to take Space
  // everywhere, so on a desktop Space no longer scrolled and a focused button (a dictation block, a
  // step tab) could not be pressed with it — the player started instead.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!usedRef.current || e.code !== "Space" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const target = e.target as HTMLElement | null;
      if (target && target !== document.body && target !== document.documentElement) return;
      e.preventDefault();
      toggle();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const showPauseIcon = isTtsMode ? speech.speaking && !speech.paused : playing;
  const anythingActive = isTtsMode ? speech.speaking : playing;

  // 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U09/U10): one 44px row. The speed choice is ONE
  // button that steps through the same three speeds; the second row (a label, three 24px speed
  // chips and a status sentence) is gone. Play · 정지 · 이전/다음 keep their names — the audit
  // drivers and the BUG-034 checks press them by those names.
  const SPEEDS = [0.8, 1, 1.2];
  function cycleRate() {
    const i = SPEEDS.indexOf(rate);
    changeRate(SPEEDS[(i + 1) % SPEEDS.length]);
  }
  const rateText = `${rate === 1 ? "1.0" : rate}×`;

  return (
    <div className="rounded-card border border-line bg-raised px-2 py-1.5 sm:px-3 sm:py-2">
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

      {label ? <p className="px-1.5 pt-0.5 text-caption font-medium text-ink-soft">{label}</p> : null}

      <div className="flex items-center gap-1 sm:gap-1.5">
        <button
          type="button"
          onClick={toggle}
          aria-label={showPauseIcon ? t("player.pause") : t("player.play")}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-surface transition-opacity cursor-pointer hover:opacity-90"
        >
          {showPauseIcon ? (
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

        {/* Hard stop — this is what was missing before */}
        <button
          type="button"
          onClick={stopAll}
          disabled={!anythingActive}
          aria-label="정지"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink disabled:opacity-30 disabled:cursor-default"
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
            <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          </svg>
        </button>

        {/* In sentence mode these move a whole sentence, so they must not be read out as "5초 이동".
            Hidden under 380px — the sentence bar below does the same by position. */}
        <button
          type="button"
          onClick={() => seek(-5)}
          aria-label={isTtsMode ? "이전 문장" : t("player.back5")}
          className="hidden min-[380px]:inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-control px-1.5 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
        >
          {isTtsMode ? "이전" : "−5초"}
        </button>

        <button
          type="button"
          onClick={() => seek(5)}
          aria-label={isTtsMode ? "다음 문장" : "앞으로 5초 이동"}
          className="hidden min-[380px]:inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-control px-1.5 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
        >
          {isTtsMode ? "다음" : "+5초"}
        </button>

        {isTtsMode ? (
          // UX-05: one button per sentence made targets 1-5px wide on a phone (a
          // 40-sentence lesson in a 200px bar), so no single sentence could be hit.
          // The segments are now only a picture; one range input laid over the whole
          // bar (44px tall) picks the sentence by position, by drag or by arrow keys.
          // The jump happens when the finger or key is released, so dragging across
          // the bar does not restart the voice at every sentence on the way.
          <div className="relative flex-1 px-1 min-w-[40px]">
            {fallbackSentences.length <= 16 ? (
              <div aria-hidden className="flex h-11 w-full items-center gap-[2px]">
                {fallbackSentences.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-colors ${
                      i <= (scrubIndex ?? (ttsActive ? ttsIndex : -1))
                        ? "bg-primary"
                        : "bg-ink/10"
                    }`}
                  />
                ))}
              </div>
            ) : (
              // 17+ sentences (GRAMMAR has up to 46): the 2px gaps alone were wider than the bar on a
              // phone, so the segments vanished. One track with a fill instead.
              <div aria-hidden className="flex h-11 w-full items-center">
                <span className="relative h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]"
                    style={{
                      width: `${(((scrubIndex ?? (ttsActive ? ttsIndex : -1)) + 1) / fallbackSentences.length) * 100}%`,
                    }}
                  />
                </span>
              </div>
            )}
            <input
              type="range"
              min={0}
              max={Math.max(0, fallbackSentences.length - 1)}
              step={1}
              value={scrubIndex ?? ttsIndex}
              onChange={(e) => setScrubIndex(Number(e.target.value))}
              onPointerUp={commitScrub}
              onKeyUp={commitScrub}
              onBlur={commitScrub}
              aria-label="문장 이동"
              aria-valuetext={`${(scrubIndex ?? ttsIndex) + 1}번째 문장 / 전체 ${fallbackSentences.length}문장`}
              className="absolute inset-0 h-11 w-full cursor-pointer opacity-0"
            />
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
            className="h-2 flex-1 min-w-[40px] cursor-pointer appearance-none rounded-full bg-ink/10 accent-[var(--primary)]"
          />
        )}

        <span className="shrink-0 px-1 text-caption tabular-nums text-ink-soft">
          {isTtsMode
            ? `${ttsIndex + 1}/${fallbackSentences.length}`
            : `${fmt(time)} / ${fmt(duration)}`}
        </span>

        <button
          type="button"
          onClick={cycleRate}
          aria-label={`${t("player.speed")} ${rateText} — 누르면 바뀜`}
          title="속도 0.8× · 1.0× · 1.2×"
          className="flex h-11 min-w-11 shrink-0 items-center justify-center rounded-control px-1.5 text-label font-medium tabular-nums text-ink transition-colors cursor-pointer hover:bg-sunken"
        >
          {rateText}
        </button>
      </div>

      {isTtsMode ? (
        <span className="sr-only" aria-live="polite">
          {speech.paused ? "일시정지됨" : ttsActive ? "읽는 중" : ""}
        </span>
      ) : null}

      {playBlocked && (
        <p className="mt-1.5 rounded-control bg-sunken px-3 py-2 text-center text-caption text-ink-soft">
          재생 단추를 한 번 더 눌러 주세요 (브라우저의 자동 재생 제한)
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
