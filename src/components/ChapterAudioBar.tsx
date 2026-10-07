"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  playSentenceQueue,
  stopSpeech,
  togglePauseSpeech,
  unlockMobileAudio,
} from "@/lib/speech";
import { firstSlashAlternative } from "@/lib/listeningUtils";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { IconLock, IconPause, IconPlay, IconStop } from "./icons";

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

// In-memory module cache for fetched chapter audio payloads — "<course>:<chapter>" (ADULT's chapter 1 is not STUDENT's)
const chapterCache = new Map<string, ChapterAudioPayload>();

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
  /** STUDENT, or ADULT (2026-10-02 — taught as STUDENT, its own chapters and endpoint) */
  course?: "student" | "adult";
}

export const ChapterAudioBar = memo(function ChapterAudioBar({
  chapterNumber,
  chapterUnlocked,
  previewOnly,
  totalLessons,
  course = "student",
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

      // Say each sentence exactly as the lesson view says it (StudentLearningView spokenEn), so the
      // chapter bar asks for the same clip: a slashed alternative in its first form (BUG-028) and a
      // Korean word written in romanization in Hangul (lessonSpeechForm — 소유자 결정 2026-09-25). This
      // bar used to pass the written sentence, so "He/She …" asked for a different clip than the lesson.
      playSentenceQueue(
        payload.items.map((it) => lessonSpeechForm(`${course}/${it.lessonId}`, firstSlashAlternative(it.text))),
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
    [course]
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

    const cacheKey = `${course}:${chapterNumber}`;
    const cached = chapterCache.get(cacheKey);
    if (cached) {
      setStatus("playing");
      startPlayback(cached, speed, 0);
      return;
    }

    setStatus("loading");
    try {
      const response = await fetch(`/api/${course}/chapter-audio?chapter=${chapterNumber}`, {
        cache: "no-store",
        credentials: "same-origin",
      });
      const data = (await response.json()) as
        | ChapterAudioPayload
        | { success?: false; error?: string };

      if (globalActiveChapter !== chapterNumber) return;

      if (!response.ok || !data.success) {
        throw new Error(
          ("error" in data && data.error) || "이 장의 소리를 불러오지 못했어요."
        );
      }

      chapterCache.set(cacheKey, data);
      setStatus("playing");
      startPlayback(data, speed, 0);
    } catch (err) {
      if (globalActiveChapter !== chapterNumber) return;
      setStatus("idle");
      setError(err instanceof Error ? err.message : "이 장의 소리를 불러오지 못했어요.");
      setGlobalActiveChapter(null);
    }
  }, [chapterNumber, chapterUnlocked, course, speed, startPlayback, status]);

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

  /*
   * UI검토-1007 8번: this used to be the only coloured box on the list (apricot fill, amber border, 11.5px words; while
   * playing 10.5px monospace speed chips, a 32px stop button, red words; locked: '🔒' · '챕터 해금 후'). It is now one
   * more line of the chapter, drawn like the lesson rows under it (52px, the same left column, 14px words, hover only
   * shades it): '이 장 전체 듣기 · 강의 N개 이어서'. Line icons, 44px controls, no colour but the gold of the playing icon.
   * What it plays and asks for (/api/<course>/chapter-audio, the sentences, the speeds) is unchanged.
   */
  const lineTitle = isPlayingOrPaused
    ? status === "paused" ? "일시정지" : "재생 중"
    : previewOnly ? "무료 강의 이어 듣기" : "이 장 전체 듣기";
  const lineNote = !chapterUnlocked
    ? "이 장을 열면 들을 수 있어요"
    : status === "loading"
      ? "재생 목록을 준비하는 중…"
      : isPlayingOrPaused && progress
        ? `강의 ${progress.partNumber}/${progress.partTotal} · 문장 ${progress.sentenceNumber}/${progress.sentenceTotal}`
        : isPlayingOrPaused
          ? ""
          : previewOnly
            ? "1·2강 이어서"
            : `강의 ${totalLessons}개 이어서`;

  return (
    <div className="border-b border-line" data-chapter-audio="">
      <div className="flex flex-wrap items-center">
        <button
          type="button"
          disabled={!chapterUnlocked || status === "loading"}
          onClick={handleTogglePlay}
          className={`flex min-h-[52px] min-w-[12rem] flex-1 items-center gap-3 py-2 pl-4 pr-2 text-left transition-colors select-none touch-manipulation ${
            chapterUnlocked ? "cursor-pointer hover:bg-sunken" : "cursor-not-allowed"
          }`}
          aria-label={
            !chapterUnlocked
              ? `${chapterNumber}장 전체 듣기 잠김`
              : status === "paused"
                ? `${chapterNumber}장 전체 듣기 계속 재생`
                : status === "playing"
                  ? `${chapterNumber}장 전체 듣기 일시정지`
                  : `${chapterNumber}장 전체 듣기`
          }
        >
          <span
            className={`flex w-9 shrink-0 items-center ${
              !chapterUnlocked || status === "loading" ? "text-ink-faint" : isPlayingOrPaused ? "text-primary" : "text-ink"
            }`}
            aria-hidden="true"
          >
            {!chapterUnlocked ? <IconLock size={16} /> : status === "playing" ? <IconPause size={18} /> : <IconPlay size={18} />}
          </span>
          <span className="min-w-0 flex-1 truncate text-label tabular-nums">
            <span className={`font-medium ${chapterUnlocked ? "text-ink" : "text-ink-soft"}`}>{lineTitle}</span>
            {lineNote ? <span className="text-ink-soft"> · {lineNote}</span> : null}
          </span>
        </button>

        {isPlayingOrPaused && (
          <div className="ml-auto flex shrink-0 items-center gap-1 pr-2 pb-1 sm:pb-0">
            <div className="flex items-center gap-0.5 rounded-control bg-sunken p-0.5" role="group" aria-label="재생 속도">
              {([0.85, 1, 1.2] as const).map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleSpeedChange(rate)}
                  aria-pressed={speed === rate}
                  className={`flex min-h-11 min-w-11 items-center justify-center rounded-control px-2 text-caption tabular-nums transition-colors cursor-pointer ${
                    speed === rate ? "bg-raised font-semibold text-ink shadow-2xs" : "font-medium text-ink-soft hover:text-ink"
                  }`}
                >
                  {rate}×
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleStop}
              className="flex h-11 w-11 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-sunken hover:text-ink cursor-pointer select-none"
              aria-label={`${chapterNumber}장 전체 듣기 정지`}
            >
              <IconStop size={16} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <p className="px-4 pb-3 text-caption text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
