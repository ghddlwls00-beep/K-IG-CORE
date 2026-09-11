"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  playSentenceQueue,
  stopSpeech,
  togglePauseSpeech,
  unlockMobileAudio,
} from "@/lib/speech";

interface ChapterAudioItem {
  text: string;
  lessonId: string;
  lessonTitle: string;
  partNumber: number;
  sentenceNumber: number;
  sentenceTotal: number;
}

interface ChapterAudioPayload {
  success: true;
  chapter: number;
  chapterLabel: string;
  access: "free" | "licensed";
  partCount: number;
  sentenceCount: number;
  items: ChapterAudioItem[];
}

type AudioSpeed = 0.85 | 1 | 1.2;

// In-memory module cache for fetched chapter audio payloads
const chapterCache = new Map<number, ChapterAudioPayload>();

// Module-level singleton to coordinate which chapter is actively playing
let globalActiveChapter: number | null = null;
const globalListeners = new Set<(activeChapter: number | null) => void>();

function setGlobalActiveChapter(ch: number | null) {
  globalActiveChapter = ch;
  globalListeners.forEach((fn) => fn(ch));
}

export interface ChapterAudioBarProps {
  chapterNumber: number;
  chapterUnlocked: boolean;
  previewOnly: boolean;
  totalLessons: number;
}

export const ChapterAudioBar = memo(function ChapterAudioBar({
  chapterNumber,
  chapterUnlocked,
  previewOnly,
  totalLessons,
}: ChapterAudioBarProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "paused">("idle");
  const [speed, setSpeed] = useState<AudioSpeed>(1);
  const [progress, setProgress] = useState<{
    partNumber: number;
    partTotal: number;
    sentenceNumber: number;
    sentenceTotal: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentPayloadRef = useRef<ChapterAudioPayload | null>(null);
  const currentSentenceIdxRef = useRef<number>(0);
  const isPlayingOrPaused = status === "playing" || status === "paused";

  // Coordinate with other chapters: if another chapter starts, reset this chapter
  useEffect(() => {
    const handleGlobalChange = (activeChapter: number | null) => {
      if (activeChapter !== chapterNumber) {
        setStatus("idle");
        setProgress(null);
        setError(null);
        currentPayloadRef.current = null;
        currentSentenceIdxRef.current = 0;
      }
    };
    globalListeners.add(handleGlobalChange);
    return () => {
      globalListeners.delete(handleGlobalChange);
    };
  }, [chapterNumber]);

  // Clean up if this component unmounts while playing
  useEffect(() => {
    return () => {
      if (globalActiveChapter === chapterNumber) {
        stopSpeech();
        globalActiveChapter = null;
      }
    };
  }, [chapterNumber]);

  const startPlayback = useCallback(
    (payload: ChapterAudioPayload, rate: AudioSpeed, startIndex = 0) => {
      currentPayloadRef.current = payload;
      currentSentenceIdxRef.current = startIndex;

      playSentenceQueue(
        payload.items.map((it) => it.text),
        {
          lang: "en",
          gender: "female",
          rate,
          startIndex,
          gap: 380,
          onProgress: (idx) => {
            currentSentenceIdxRef.current = idx;
            const item = payload.items[idx];
            if (item) {
              setProgress({
                partNumber: item.partNumber,
                partTotal: payload.partCount,
                sentenceNumber: item.sentenceNumber,
                sentenceTotal: item.sentenceTotal,
              });
            }
          },
          onEnd: () => {
            setStatus("idle");
            setProgress(null);
            setGlobalActiveChapter(null);
          },
          onError: () => {
            setStatus("idle");
            setProgress(null);
            setError("음성을 재생하지 못했습니다. 네트워크 연결을 확인해 주세요.");
            setGlobalActiveChapter(null);
          },
        }
      );
    },
    []
  );

  const handleTogglePlay = useCallback(async () => {
    if (!chapterUnlocked) return;
    unlockMobileAudio();

    if (status === "playing") {
      togglePauseSpeech();
      setStatus("paused");
      return;
    }

    if (status === "paused") {
      togglePauseSpeech();
      setStatus("playing");
      return;
    }

    // Starting playback from idle
    stopSpeech();
    setGlobalActiveChapter(chapterNumber);
    setError(null);

    const cached = chapterCache.get(chapterNumber);
    if (cached) {
      setStatus("playing");
      startPlayback(cached, speed, 0);
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(`/api/student/chapter-audio?chapter=${chapterNumber}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json()) as
        | ChapterAudioPayload
        | { success?: false; error?: string };

      if (globalActiveChapter !== chapterNumber) return;

      if (!response.ok || !data.success) {
        throw new Error(
          ("error" in data && data.error) || "챕터 음성을 불러오지 못했습니다."
        );
      }

      chapterCache.set(chapterNumber, data);
      setStatus("playing");
      startPlayback(data, speed, 0);
    } catch (err) {
      if (globalActiveChapter !== chapterNumber) return;
      setStatus("idle");
      setError(err instanceof Error ? err.message : "챕터 음성을 불러오지 못했습니다.");
      setGlobalActiveChapter(null);
    }
  }, [chapterNumber, chapterUnlocked, speed, startPlayback, status]);

  const handleStop = useCallback(() => {
    stopSpeech();
    setStatus("idle");
    setProgress(null);
    setGlobalActiveChapter(null);
  }, []);

  const handleSpeedChange = useCallback(
    (rate: AudioSpeed) => {
      setSpeed(rate);
      if (currentPayloadRef.current && isPlayingOrPaused) {
        unlockMobileAudio();
        startPlayback(currentPayloadRef.current, rate, currentSentenceIdxRef.current);
        setStatus("playing");
      }
    },
    [isPlayingOrPaused, startPlayback]
  );

  return (
    <div className="border-t border-line/70 px-4 py-3 sm:px-5">
      <div
        className={`flex flex-col gap-2.5 rounded-2xl border p-3 sm:flex-row sm:items-center sm:justify-between transition-colors duration-150 ${
          !chapterUnlocked
            ? "border-line bg-sunken/60 opacity-80"
            : isPlayingOrPaused
              ? "border-amber-500/40 bg-amber-500/[0.07]"
              : "border-amber-500/20 bg-amber-500/[0.03] hover:bg-amber-500/[0.06]"
        }`}
        style={{ WebkitTapHighlightColor: "transparent" }}
      >
        <button
          type="button"
          disabled={!chapterUnlocked || status === "loading"}
          onClick={handleTogglePlay}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl text-left select-none touch-manipulation ${
            chapterUnlocked
              ? "cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[0.99]"
              : "cursor-not-allowed"
          }`}
          aria-label={
            !chapterUnlocked
              ? `챕터 ${chapterNumber} 전체 듣기 잠김`
              : status === "paused"
                ? `챕터 ${chapterNumber} 전체 듣기 계속 재생`
                : status === "playing"
                  ? `챕터 ${chapterNumber} 전체 듣기 일시정지`
                  : `챕터 ${chapterNumber} 전체 파트 듣기`
          }
        >
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[15px] font-bold shadow-xs select-none transition-colors duration-150 ${
              !chapterUnlocked
                ? "border border-line bg-raised text-ink-faint"
                : status === "playing"
                  ? "bg-amber-600 text-white"
                  : "bg-ink text-surface hover:opacity-90"
            }`}
            aria-hidden="true"
          >
            {status === "loading" ? (
              <span className="font-mono text-[11px] tracking-tighter">•••</span>
            ) : !chapterUnlocked ? (
              "🔒"
            ) : status === "playing" ? (
              "Ⅱ"
            ) : (
              "▶"
            )}
          </span>

          <span className="min-w-0 flex-1">
            <span className="block text-[13.5px] font-bold text-ink sm:text-[14px] leading-tight">
              {previewOnly ? "무료 파트 연속 듣기" : "챕터 전체 파트 듣기"}
            </span>
            <span className="mt-1 block truncate text-[11.5px] text-ink-soft tabular-nums leading-tight h-[18px]">
              {!chapterUnlocked
                ? "챕터 해금 후 이용할 수 있습니다"
                : status === "loading"
                  ? "재생 목록을 준비하는 중..."
                  : isPlayingOrPaused && progress
                    ? `▶ ${status === "paused" ? "일시정지" : "재생 중"}: 파트 ${progress.partNumber}/${progress.partTotal} · 문장 ${progress.sentenceNumber}/${progress.sentenceTotal}`
                    : previewOnly
                      ? "1·2강을 Ava 음성으로 연속 재생"
                      : `${totalLessons}개 파트를 Ava 음성으로 연속 재생`}
            </span>
          </span>
        </button>

        {isPlayingOrPaused && (
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-amber-500/20 pt-2 sm:justify-end sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
            <div
              className="flex items-center rounded-lg border border-line bg-raised p-0.5"
              aria-label="재생 속도"
            >
              {([0.85, 1, 1.2] as const).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  className={`rounded-md px-2 py-1 font-mono text-[10.5px] font-semibold transition-colors duration-150 cursor-pointer ${
                    speed === rate
                      ? "bg-ink text-surface"
                      : "text-ink-soft hover:bg-sunken"
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleStop}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-raised px-2.5 text-[11px] font-semibold text-ink-soft transition-colors duration-150 hover:text-ink cursor-pointer select-none"
              aria-label="챕터 전체 듣기 정지"
            >
              <span aria-hidden="true">■</span>
              <span>정지</span>
            </button>
          </div>
        )}
      </div>

      {error && (
        <p
          className="mt-2 px-1 text-[11px] font-medium text-red-600 dark:text-red-300"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});
