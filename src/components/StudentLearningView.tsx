"use client";

import { useState, useEffect, useRef, useMemo, useCallback, useSyncExternalStore } from "react";
import type { Block } from "@/lib/types";
import {
  playSentenceQueue,
  stopSpeech,
  togglePauseSpeech,
  nextSentence,
  previousSentence,
  subscribeSpeech,
  getSpeechSnapshot,
  getServerSpeechSnapshot,
  unlockMobileAudio,
} from "@/lib/speech";
import { mediaUrl, hasAudioFile } from "@/lib/media";
import { shouldUseUnifiedSpeech } from "@/lib/unifiedSpeech";
import { generateWordBank, verifyWordSequence, type WordTile } from "@/lib/listeningUtils";
import { VoiceSpeakingTester } from "@/components/VoiceSpeakingTester";

interface StudentLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  audioTracks?: { src: string; label?: string }[];
  chunkDrills?: { en: string; ko: string }[];
}

type StudyMode = "listen" | "dictation" | "shadowing";
type ScriptFilter = "hidden" | "en_only" | "ko_only" | "all";
type PlaySpeed = 0.85 | 1.0 | 1.2;
type FullMode = "none" | "audio" | "tts";

/** Which single sentence is currently targeted by the player. */
interface ActiveTarget {
  idx: number;
  kind: "en" | "ko";
  loop: boolean;
}

export function StudentLearningView({
  blocks,
  lessonKey,
  audioTracks = [],
  chunkDrills = [],
}: StudentLearningViewProps) {
  // Extract sentences and paired Korean paragraphs
  const sentBlock = blocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;
  const sentenceItems = useMemo(() => sentBlock?.items ?? [], [sentBlock]);

  const koParas = useMemo(
    () =>
      (
        blocks.filter((b) => b.type === "paragraph" && b.lang === "ko") as {
          type: "paragraph";
          text: string;
        }[]
      ).map((p) => p.text.trim()),
    [blocks]
  );

  const instructionText =
    blocks.find((b) => b.type === "instruction")?.text ||
    "STUDENT 실전 듣기·읽기 완성 훈련";

  // Live engine state — the single source of truth for speaking/paused.
  const speech = useSyncExternalStore(
    subscribeSpeech,
    getSpeechSnapshot,
    getServerSpeechSnapshot
  );

  // Main navigation & general settings
  const [studyMode, setStudyMode] = useState<StudyMode>("listen");
  const [speed, setSpeed] = useState<PlaySpeed>(1.0);
  const [target, setTarget] = useState<ActiveTarget | null>(null);
  const [fullMode, setFullMode] = useState<FullMode>("none");
  const [audioPaused, setAudioPaused] = useState(false);
  const [fullIdx, setFullIdx] = useState(0);
  const fullAudioRef = useRef<HTMLAudioElement | null>(null);

  // Step 1: Blind Listening states
  const [scriptFilter, setScriptFilter] = useState<ScriptFilter>("hidden");
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});

  // Step 3: Tap Dictation states
  const [dictationIdx, setDictationIdx] = useState<number>(0);
  const [selectedTiles, setSelectedTiles] = useState<WordTile[]>([]);
  const [solvedSentences, setSolvedSentences] = useState<Record<number, boolean>>({});
  const [dictationFeedback, setDictationFeedback] = useState<"correct" | "wrong" | null>(null);

  // Step 4: Shadowing & Paced Reading states
  const [completedSentences, setCompletedSentences] = useState<Record<number, boolean>>({});
  const [openMicTesters, setOpenMicTesters] = useState<Record<number, boolean>>({});

  const isPlayingFull = fullMode !== "none";
  const isPaused = fullMode === "audio" ? audioPaused : speech.paused;

  // ---------------------------------------------------------------------
  // Transport helpers
  // ---------------------------------------------------------------------

  /** Hard stop: TTS engine + local mp3 element + all UI playback state. */
  const stopAll = useCallback(() => {
    stopSpeech();
    const el = fullAudioRef.current;
    if (el) {
      el.onended = null;
      el.onerror = null;
      el.pause();
      try {
        el.currentTime = 0;
      } catch {
        // ignore
      }
      fullAudioRef.current = null;
    }
    setFullMode("none");
    setAudioPaused(false);
    setTarget(null);
    setFullIdx(0);
  }, []);

  // Cleanup on unmount / lesson change
  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll, lessonKey]);

  /** Start (or restart) playback of one sentence, optionally looping. */
  const startSentence = useCallback(
    (text: string, idx: number, kind: "en" | "ko", loop: boolean) => {
      if (!text) return;
      unlockMobileAudio();
      stopAll();
      setTarget({ idx, kind, loop });
      playSentenceQueue([text], {
        lang: kind,
        rate: speed,
        loop,
        gap: loop ? 600 : 250,
        onEnd: () => setTarget(null),
        onError: () => setTarget(null),
      });
    },
    [speed, stopAll]
  );

  const isTargetPlaying = useCallback(
    (idx: number, kind: "en" | "ko", loop: boolean) =>
      target !== null &&
      target.idx === idx &&
      target.kind === kind &&
      target.loop === loop &&
      speech.speaking,
    [target, speech.speaking]
  );

  /** 🔊 듣기 / ⏹️ 정지 toggle for a single sentence. */
  const toggleSentence = useCallback(
    (text: string, idx: number, kind: "en" | "ko" = "en") => {
      if (isTargetPlaying(idx, kind, false)) {
        stopAll();
        return;
      }
      startSentence(text, idx, kind, false);
    },
    [isTargetPlaying, startSentence, stopAll]
  );

  /** 🔁 무한 반복 toggle for a single sentence. */
  const toggleLoop = useCallback(
    (text: string, idx: number, kind: "en" | "ko" = "en") => {
      if (isTargetPlaying(idx, kind, true)) {
        stopAll();
        return;
      }
      startSentence(text, idx, kind, true);
    },
    [isTargetPlaying, startSentence, stopAll]
  );

  const allSentences = useMemo(
    () => sentenceItems.map((s) => s.text).filter(Boolean),
    [sentenceItems]
  );

  /** Whole-lesson TTS playback, sentence by sentence (so 다음/이전 works). */
  const playFullTts = useCallback(
    (startIndex = 0) => {
      if (allSentences.length === 0) return;
      setFullMode("tts");
      setFullIdx(startIndex);
      playSentenceQueue(allSentences, {
        lang: "en",
        rate: speed,
        startIndex,
        gap: 350,
        onProgress: (idx) => setFullIdx(idx),
        onEnd: () => {
          setFullMode("none");
          setFullIdx(0);
        },
      });
    },
    [allSentences, speed]
  );

  /** 전체 본문 듣기 / 전체 정지. */
  const toggleFullAudio = useCallback(() => {
    if (isPlayingFull) {
      stopAll();
      return;
    }

    unlockMobileAudio();
    stopAll();

    if (shouldUseUnifiedSpeech()) {
      playFullTts(0);
      return;
    }

    const fullTrack = audioTracks[0];
    if (fullTrack?.src && hasAudioFile(fullTrack.src)) {
      const audio = new Audio(mediaUrl(fullTrack.src));
      audio.playbackRate = speed;
      audio.preload = "auto";
      audio.onended = () => {
        fullAudioRef.current = null;
        setFullMode("none");
        setAudioPaused(false);
      };
      audio.onerror = () => {
        fullAudioRef.current = null;
        playFullTts(0);
      };
      fullAudioRef.current = audio;
      setFullMode("audio");
      setAudioPaused(false);
      audio.play().catch(() => {
        fullAudioRef.current = null;
        playFullTts(0);
      });
    } else {
      playFullTts(0);
    }
  }, [isPlayingFull, audioTracks, speed, stopAll, playFullTts]);

  /** ⏸️ / ▶️ pause-resume that works for both engines. */
  const togglePause = useCallback(() => {
    if (fullMode === "audio") {
      const el = fullAudioRef.current;
      if (!el) return;
      if (el.paused) {
        el.play().catch(() => {});
        setAudioPaused(false);
      } else {
        el.pause();
        setAudioPaused(true);
      }
      return;
    }
    togglePauseSpeech();
  }, [fullMode]);

  const goPrev = useCallback(() => {
    if (fullMode === "audio") {
      const el = fullAudioRef.current;
      if (el) el.currentTime = Math.max(0, el.currentTime - 5);
      return;
    }
    previousSentence();
  }, [fullMode]);

  const goNext = useCallback(() => {
    if (fullMode === "audio") {
      const el = fullAudioRef.current;
      if (el) el.currentTime = Math.min(el.duration || 0, el.currentTime + 5);
      return;
    }
    nextSentence();
  }, [fullMode]);

  /** Changing speed restarts what is currently playing at the new rate. */
  const changeSpeed = useCallback(
    (s: PlaySpeed) => {
      setSpeed(s);

      if (fullMode === "audio" && fullAudioRef.current) {
        fullAudioRef.current.playbackRate = s;
        return;
      }

      if (fullMode === "tts") {
        const resumeAt = fullIdx;
        setTimeout(() => {
          if (allSentences.length === 0) return;
          playSentenceQueue(allSentences, {
            lang: "en",
            rate: s,
            startIndex: resumeAt,
            gap: 350,
            onProgress: (idx) => setFullIdx(idx),
            onEnd: () => {
              setFullMode("none");
              setFullIdx(0);
            },
          });
        }, 0);
        return;
      }

      if (target) {
        const t = target;
        const text =
          t.kind === "ko" ? koParas[t.idx] ?? "" : sentenceItems[t.idx]?.text ?? "";
        if (text) {
          setTimeout(() => {
            playSentenceQueue([text], {
              lang: t.kind,
              rate: s,
              loop: t.loop,
              gap: t.loop ? 600 : 250,
              onEnd: () => setTarget(null),
              onError: () => setTarget(null),
            });
          }, 0);
        }
      }
    },
    [fullMode, fullIdx, allSentences, target, koParas, sentenceItems]
  );

  /** Switching study step must silence whatever is playing. */
  const switchMode = useCallback(
    (mode: StudyMode) => {
      stopAll();
      setStudyMode(mode);
    },
    [stopAll]
  );

  // ---------------------------------------------------------------------
  // Dictation logic
  // ---------------------------------------------------------------------

  const currentSentenceText = sentenceItems[dictationIdx]?.text || "";

  // Built once per lesson so tile order stays stable across re-renders.
  const wordBanks = useMemo(
    () => sentenceItems.map((s) => generateWordBank(s.text)),
    [sentenceItems]
  );
  const currentWordBank = wordBanks[dictationIdx] ?? {
    correctWords: [] as string[],
    allTiles: [] as WordTile[],
  };

  /** Move to another dictation sentence and reset its working state. */
  const goToDictation = useCallback(
    (updater: number | ((i: number) => number)) => {
      stopAll();
      setSelectedTiles([]);
      setDictationFeedback(null);
      setDictationIdx((i) => (typeof updater === "function" ? updater(i) : updater));
    },
    [stopAll]
  );

  const handleSelectTile = (tile: WordTile) => {
    if (selectedTiles.some((t) => t.id === tile.id)) return;
    setSelectedTiles((prev) => [...prev, tile]);
    setDictationFeedback(null);
  };

  const handleRemoveTile = (tileId: string) => {
    setSelectedTiles((prev) => prev.filter((t) => t.id !== tileId));
    setDictationFeedback(null);
  };

  const handleCheckDictation = () => {
    const userWords = selectedTiles.map((t) => t.word);
    const targetWords = currentWordBank.correctWords;
    const isCorrect = verifyWordSequence(userWords, targetWords);

    if (isCorrect) {
      setDictationFeedback("correct");
      setSolvedSentences((prev) => ({ ...prev, [dictationIdx]: true }));
      startSentence(currentSentenceText, dictationIdx, "en", false);
    } else {
      setDictationFeedback("wrong");
    }
  };

  const handleGiveHint = () => {
    const currentLen = selectedTiles.length;
    const targetWords = currentWordBank.correctWords;
    if (currentLen >= targetWords.length) return;

    const nextWord = targetWords[currentLen];
    const availableTile = currentWordBank.allTiles.find(
      (t) =>
        t.word.toLowerCase() === nextWord.toLowerCase() &&
        !selectedTiles.some((st) => st.id === t.id)
    );

    if (availableTile) {
      setSelectedTiles((prev) => [...prev, availableTile]);
      setDictationFeedback(null);
    }
  };

  const solvedCount = Object.values(solvedSentences).filter(Boolean).length;
  const completedCount = Object.values(completedSentences).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-surface/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-[14px]">
                🎧
              </span>
              <h2 className="text-[16px] font-bold text-ink">{instructionText}</h2>
            </div>
            <p className="text-[12.5px] text-ink-soft mt-1 leading-relaxed">
              원어민 분할 음원과 탭 딕테이션, 섀도잉 훈련을 통해 실전 회화 순발력과 귀를 틔워보세요.
            </p>
          </div>

          {/* Full Narration & Speed Control */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={toggleFullAudio}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer shadow-2xs select-none ${
                isPlayingFull
                  ? "bg-red-500 text-white ring-2 ring-red-500/30"
                  : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
              }`}
            >
              <span>{isPlayingFull ? "⏹️" : "▶️"}</span>
              <span>{isPlayingFull ? "전체 정지" : "전체 본문 듣기"}</span>
            </button>

            {/* Transport controls, only while something is playing */}
            {isPlayingFull && (
              <div className="flex items-center gap-1 rounded-xl border border-line bg-raised/70 p-1">
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label={fullMode === "tts" ? "이전 문장" : "5초 뒤로"}
                  className="px-2 py-1 rounded-lg text-[12px] font-semibold text-ink-soft hover:text-ink hover:bg-surface transition-colors cursor-pointer"
                >
                  ⏮️
                </button>
                <button
                  type="button"
                  onClick={togglePause}
                  aria-label={isPaused ? "이어 듣기" : "일시정지"}
                  className="px-2 py-1 rounded-lg text-[12px] font-semibold text-ink hover:bg-surface transition-colors cursor-pointer"
                >
                  {isPaused ? "▶️" : "⏸️"}
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  aria-label={fullMode === "tts" ? "다음 문장" : "5초 앞으로"}
                  className="px-2 py-1 rounded-lg text-[12px] font-semibold text-ink-soft hover:text-ink hover:bg-surface transition-colors cursor-pointer"
                >
                  ⏭️
                </button>
                {fullMode === "tts" && (
                  <span className="px-1.5 font-mono text-[11px] tabular-nums text-ink-faint">
                    {fullIdx + 1}/{allSentences.length}
                  </span>
                )}
              </div>
            )}

            {/* Playback Speed Pill */}
            <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[11px] font-semibold">
              {([0.85, 1.0, 1.2] as PlaySpeed[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                    speed === s
                      ? "bg-surface text-ink font-bold shadow-2xs border border-line/60"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3-Step Navigation Tab Bar */}
        <nav aria-label="학습 단계" className="w-full rounded-xl bg-raised/80 p-1.5 border border-line/70">
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => switchMode("listen")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "listen"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>🎧</span>
              <span className="truncate">Step 1. 블라인드 리스닝</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("dictation")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "dictation"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>🧩</span>
              <span className="truncate">
                Step 2. 탭 딕테이션 ({solvedCount}/{sentenceItems.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => switchMode("shadowing")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "shadowing"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>🗣️</span>
              <span className="truncate">Step 3. 섀도잉 & 낭독</span>
            </button>
          </div>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* [STEP 1] 🎧 블라인드 리스닝 (Active Blind Listening)                     */}
      {/* ========================================================================= */}
      {studyMode === "listen" && (
        <div className="flex flex-col gap-4">
          {/* Pedagogical Control Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[14px]">🙈</span>
              <span className="text-[13px] font-bold text-ink">대본 가림막(Blind) 필터:</span>
              <span className="text-[12px] text-ink-soft hidden sm:inline">
                귀로 먼저 듣고 점진적으로 텍스트를 확인하세요.
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 bg-raised/70 p-1 rounded-xl border border-line/60">
              {(
                [
                  ["hidden", "🙈 모두 가림 (순수 리스닝)"],
                  ["en_only", "🔤 영어만"],
                  ["ko_only", "🇰🇷 해석만"],
                  ["all", "👁️ 전체 보기"],
                ] as [ScriptFilter, string][]
              ).map(([value, labelText]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setScriptFilter(value)}
                  className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                    scriptFilter === value
                      ? "bg-primary text-white shadow-2xs"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {labelText}
                </button>
              ))}
            </div>
          </div>

          {/* Sentence Cards */}
          <div className="flex flex-col gap-3">
            {sentenceItems.map((item, idx) => {
              const isPlaying = isTargetPlaying(idx, "en", false);
              const isLoopActive = isTargetPlaying(idx, "en", true);
              const isKoPlaying = isTargetPlaying(idx, "ko", false);
              const isHighlighted =
                isPlaying || isLoopActive || (fullMode === "tts" && fullIdx === idx);
              const ko = koParas[idx] || "";
              const isCardRevealed = revealedItems[idx] || scriptFilter === "all";
              const showEn = isCardRevealed || scriptFilter === "en_only";
              const showKo = isCardRevealed || scriptFilter === "ko_only";

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                    isHighlighted
                      ? "border-primary bg-primary/[0.03] ring-2 ring-primary/25 shadow-xs"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                        {item.n || idx + 1}
                      </span>
                      <span className="text-[12px] font-mono text-ink-faint">
                        Sentence #{idx + 1}
                      </span>
                    </div>

                    {/* Audio Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSentence(item.text, idx, "en")}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer ${
                          isPlaying
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "border-line bg-surface text-ink hover:bg-raised active:scale-95"
                        }`}
                        title={isPlaying ? "발음 정지" : "문장 듣기"}
                      >
                        <span>{isPlaying ? "⏹️" : "🔊"}</span>
                        <span>{isPlaying ? "정지" : "듣기"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLoop(item.text, idx, "en")}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                          isLoopActive
                            ? "border-primary bg-primary text-white shadow-2xs"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title={isLoopActive ? "반복 정지" : "한 문장 무한 반복 듣기"}
                      >
                        <span>{isLoopActive ? "⏹️" : "🔁"}</span>
                        <span className="hidden sm:inline">{isLoopActive ? "정지" : "반복"}</span>
                      </button>

                      {scriptFilter === "hidden" && (
                        <button
                          type="button"
                          onClick={() =>
                            setRevealedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))
                          }
                          className="flex items-center gap-1 rounded-xl border border-line bg-raised/50 px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-raised transition-colors cursor-pointer"
                        >
                          <span>{revealedItems[idx] ? "🔒 가림" : "👁️ 확인"}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* English Content Area */}
                  {showEn ? (
                    <div className="flex flex-col gap-1.5">
                      <p className="text-[16px] sm:text-[17px] font-bold text-ink leading-relaxed tracking-tight">
                        {item.text}
                      </p>
                    </div>
                  ) : (
                    <div
                      onClick={() => setRevealedItems((prev) => ({ ...prev, [idx]: !prev[idx] }))}
                      className="flex items-center justify-between rounded-xl border border-dashed border-line bg-raised/40 p-3.5 cursor-pointer hover:bg-raised/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[13px] text-ink-soft font-medium">
                        <span>🎧</span>
                        <span>귀로 먼저 듣고 소리를 떠올려보세요 (클릭 시 텍스트 확인)</span>
                      </div>
                      <span className="text-[12px] font-bold text-primary">클릭하여 보기 👁️</span>
                    </div>
                  )}

                  {/* Korean Meaning Area — now readable by TTS */}
                  {showKo && ko && (
                    <div className="flex items-start justify-between gap-2 border-t border-line/40 pt-2">
                      <p className="text-[13.5px] text-ink-soft font-normal leading-relaxed">
                        {ko}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleSentence(ko, idx, "ko")}
                        className={`shrink-0 rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                          isKoPlaying
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title={isKoPlaying ? "해석 정지" : "우리말 해석 듣기"}
                      >
                        {isKoPlaying ? "⏹️ 정지" : "🔈 해석"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [STEP 2] 🧩 스마트 탭 딕테이션 (Tap Word Dictation Puzzle)              */}
      {/* ========================================================================= */}
      {studyMode === "dictation" && (
        <div className="flex flex-col gap-5">
          {/* Header Stepper & Progress */}
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[16px]">🧩</span>
                <span className="text-[14px] font-bold text-ink">
                  문장 {dictationIdx + 1} / {sentenceItems.length}
                </span>
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  완료: {solvedCount}개
                </span>
              </div>

              {/* Quick Stepper */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={dictationIdx === 0}
                  onClick={() => goToDictation((i) => Math.max(0, i - 1))}
                  className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink disabled:opacity-30 hover:bg-raised transition-colors cursor-pointer"
                >
                  ◀️ 이전
                </button>
                <button
                  type="button"
                  disabled={dictationIdx === sentenceItems.length - 1}
                  onClick={() =>
                    goToDictation((i) => Math.min(sentenceItems.length - 1, i + 1))
                  }
                  className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink disabled:opacity-30 hover:bg-raised transition-colors cursor-pointer"
                >
                  다음 ▶️
                </button>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="h-1.5 w-full rounded-full bg-raised overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{
                  width: `${((dictationIdx + 1) / Math.max(1, sentenceItems.length)) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Current Challenge Box */}
          <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-5 sm:p-6 shadow-xs">
            {/* Audio & Prompt Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/50 pb-4">
              <div className="flex flex-col gap-1">
                <span className="text-[12px] font-bold text-primary uppercase tracking-wider">
                  우리말 상황 맥락
                </span>
                <div className="flex items-start gap-2">
                  <p className="text-[15px] sm:text-[16px] font-bold text-ink leading-relaxed">
                    {koParas[dictationIdx] || "문장의 소리를 듣고 어순대로 조립하세요."}
                  </p>
                  {koParas[dictationIdx] && (
                    <button
                      type="button"
                      onClick={() => toggleSentence(koParas[dictationIdx], dictationIdx, "ko")}
                      className={`shrink-0 rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                        isTargetPlaying(dictationIdx, "ko", false)
                          ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                          : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                      }`}
                      title="우리말 힌트 듣기"
                    >
                      {isTargetPlaying(dictationIdx, "ko", false) ? "⏹️" : "🔈"}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => toggleSentence(currentSentenceText, dictationIdx, "en")}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold shadow-2xs active:scale-95 transition-all cursor-pointer ${
                    isTargetPlaying(dictationIdx, "en", false)
                      ? "bg-red-500 text-white hover:bg-red-500/90"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  <span>{isTargetPlaying(dictationIdx, "en", false) ? "⏹️" : "🔊"}</span>
                  <span>{isTargetPlaying(dictationIdx, "en", false) ? "정지" : "문장 듣기"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => toggleLoop(currentSentenceText, dictationIdx, "en")}
                  className={`flex items-center gap-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition-all cursor-pointer ${
                    isTargetPlaying(dictationIdx, "en", true)
                      ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                      : "border-line bg-raised/60 text-ink-soft hover:text-ink hover:bg-raised"
                  }`}
                  title="무한 반복 청취"
                >
                  <span>{isTargetPlaying(dictationIdx, "en", true) ? "⏹️" : "🔁"}</span>
                  <span>{isTargetPlaying(dictationIdx, "en", true) ? "반복 정지" : "무한 반복"}</span>
                </button>
              </div>
            </div>

            {/* Assembled Dropzone */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-[12px] text-ink-soft">
                <span>조립된 문장 (클릭하면 다시 단어 보관함으로 돌아갑니다)</span>
                <span>
                  {selectedTiles.length} / {currentWordBank.correctWords.length} 단어
                </span>
              </div>

              <div className="min-h-[85px] rounded-2xl border-2 border-dashed border-line bg-raised/30 p-3.5 flex flex-wrap items-center gap-2 transition-all">
                {selectedTiles.length === 0 ? (
                  <div className="flex w-full items-center justify-center py-4 text-[13px] text-ink-faint">
                    <span>👇 아래 단어 블록을 탭하여 들리는 순서대로 완성하세요</span>
                  </div>
                ) : (
                  selectedTiles.map((tile) => (
                    <button
                      key={tile.id}
                      type="button"
                      onClick={() => handleRemoveTile(tile.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-surface px-3 py-2 text-[14px] font-bold text-ink shadow-2xs hover:bg-red-50 hover:border-red-400 hover:text-red-600 transition-all cursor-pointer animate-in zoom-in-95"
                    >
                      <span>{tile.word}</span>
                      <span className="text-[11px] text-ink-faint">✕</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Feedback Alert */}
            {dictationFeedback === "correct" && (
              <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/[0.08] p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <span className="text-[18px]">🎉</span>
                  <span className="text-[14px] font-bold">
                    정답입니다! 올바른 소리와 어순을 정확히 청취하셨습니다.
                  </span>
                </div>
                {dictationIdx < sentenceItems.length - 1 && (
                  <button
                    type="button"
                    onClick={() => goToDictation((i) => i + 1)}
                    className="rounded-xl bg-emerald-600 px-3.5 py-1.5 text-[12.5px] font-bold text-white shadow-2xs hover:bg-emerald-700 transition-all cursor-pointer shrink-0"
                  >
                    다음 문장으로 ➡️
                  </button>
                )}
              </div>
            )}

            {dictationFeedback === "wrong" && (
              <div className="rounded-xl border border-red-500/40 bg-red-500/[0.08] p-4 flex items-center justify-between gap-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <span className="text-[18px]">⚠️</span>
                  <span className="text-[14px] font-bold">
                    어순이나 단어가 일치하지 않습니다. 다시 소리를 듣고 배열해보세요!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => startSentence(currentSentenceText, dictationIdx, "en", false)}
                  className="rounded-xl border border-red-400/40 bg-surface px-3 py-1.5 text-[12px] font-bold text-red-600 dark:text-red-400 hover:bg-red-50 transition-all cursor-pointer shrink-0"
                >
                  🔊 다시 듣기
                </button>
              </div>
            )}

            {/* Word Bank (Tile Pool) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-line/40">
              <span className="text-[12px] font-bold text-ink-soft">단어 보관함 (단어를 탭하세요):</span>
              <div className="flex flex-wrap gap-2">
                {currentWordBank.allTiles.map((tile) => {
                  const isSelected = selectedTiles.some((t) => t.id === tile.id);
                  return (
                    <button
                      key={tile.id}
                      type="button"
                      disabled={isSelected}
                      onClick={() => handleSelectTile(tile)}
                      className={`rounded-xl border px-3.5 py-2 text-[14px] font-bold transition-all select-none ${
                        isSelected
                          ? "opacity-20 border-line bg-raised/30 cursor-not-allowed text-ink-faint"
                          : "border-line bg-surface text-ink hover:border-primary hover:bg-primary/[0.03] active:scale-95 shadow-2xs cursor-pointer"
                      }`}
                    >
                      {tile.word}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-line/40">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleGiveHint}
                  className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-500/[0.08] px-3.5 py-2 text-[12.5px] font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-500/20 transition-all cursor-pointer"
                >
                  <span>💡</span>
                  <span>한 단어 힌트</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedTiles([])}
                  className="rounded-xl border border-line bg-raised/60 px-3.5 py-2 text-[12.5px] font-medium text-ink-soft hover:text-ink hover:bg-raised transition-all cursor-pointer"
                >
                  🔄 초기화
                </button>
              </div>

              <button
                type="button"
                onClick={handleCheckDictation}
                className="flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2 text-[13px] font-bold text-white shadow-xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
              >
                <span>✅</span>
                <span>정답 확인</span>
              </button>
            </div>
          </div>

          {/* Stepper Pagination Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 p-2">
            {sentenceItems.map((_, idx) => {
              const isSolved = solvedSentences[idx] === true;
              const isCurrent = dictationIdx === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => goToDictation(idx)}
                  className={`flex h-8 w-8 items-center justify-center rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
                    isCurrent
                      ? "bg-primary text-white ring-2 ring-primary/40 shadow-xs scale-105"
                      : isSolved
                      ? "bg-emerald-500/15 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300"
                      : "bg-raised border border-line text-ink-soft hover:text-ink hover:bg-surface"
                  }`}
                  title={`문장 #${idx + 1}`}
                >
                  {isSolved ? "✓" : idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [STEP 3] 🗣️ 섀도잉 & 동시 낭독 (Shadowing & Paced Reading)               */}
      {/* ========================================================================= */}
      {studyMode === "shadowing" && (
        <div className="flex flex-col gap-4">
          {/* Pedagogical Explanation Banner */}
          <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-2xs flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <span className="text-[20px]">🗣️</span>
                <div className="flex flex-col gap-1">
                  <h3 className="text-[14.5px] font-bold text-ink">
                    동시 낭독 & 섀도잉(Shadowing) 실전 훈련
                  </h3>
                  <p className="text-[13px] text-ink-soft leading-relaxed">
                    소리를 듣고 0.5초 뒤에 원어민의 억양, 호흡, 강세를 그대로 따라 읽으세요.
                    [마이크 발음 테스트]를 통해 내 발음의 정확도를 실시간으로 점검할 수 있습니다.
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-line bg-raised/60 px-3 py-1.5 text-center shrink-0">
                <span className="text-[11px] font-medium text-ink-faint block">완료도</span>
                <span className="text-[13px] font-bold text-primary">
                  {completedCount} / {sentenceItems.length}
                </span>
              </div>
            </div>
          </div>

          {/* Sentence Shadowing Cards */}
          <div className="flex flex-col gap-3">
            {sentenceItems.map((item, idx) => {
              const isPlaying = isTargetPlaying(idx, "en", false);
              const isLoopActive = isTargetPlaying(idx, "en", true);
              const isKoPlaying = isTargetPlaying(idx, "ko", false);
              const isHighlighted =
                isPlaying || isLoopActive || (fullMode === "tts" && fullIdx === idx);
              const ko = koParas[idx] || "";
              const isDone = completedSentences[idx] === true;
              const isMicOpen = openMicTesters[idx] === true;

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                    isHighlighted
                      ? "border-primary bg-primary/[0.04] ring-2 ring-primary/25 shadow-xs"
                      : isDone
                      ? "border-emerald-500/30 bg-emerald-500/[0.02]"
                      : "border-line bg-surface hover:border-line-strong"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() =>
                          setCompletedSentences((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                        className={`flex h-6 w-6 items-center justify-center rounded-lg border text-[12px] font-bold transition-all cursor-pointer ${
                          isDone
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-2xs"
                            : "border-line bg-surface text-ink-faint hover:border-primary"
                        }`}
                        title={isDone ? "완료 해제" : "낭독 완료 체크"}
                      >
                        {isDone ? "✓" : ""}
                      </button>

                      <span className="text-[12px] font-mono text-ink-faint">
                        Sentence #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => toggleSentence(item.text, idx, "en")}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer ${
                          isPlaying
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                            : "border-line bg-surface text-ink hover:bg-raised active:scale-95"
                        }`}
                      >
                        <span>{isPlaying ? "⏹️" : "🔊"}</span>
                        <span>{isPlaying ? "정지" : "낭독 가이드 듣기"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleLoop(item.text, idx, "en")}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                          isLoopActive
                            ? "border-primary bg-primary text-white shadow-2xs"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title={isLoopActive ? "반복 정지" : "반복 루프 섀도잉"}
                      >
                        <span>{isLoopActive ? "⏹️" : "🔁"}</span>
                        <span className="hidden sm:inline">{isLoopActive ? "정지" : "반복"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOpenMicTesters((prev) => ({ ...prev, [idx]: !prev[idx] }))
                        }
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                          isMicOpen
                            ? "border-primary bg-primary/10 text-primary font-bold"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title="마이크로 발음 테스트"
                      >
                        <span>🎙️</span>
                        <span className="hidden sm:inline">발음 테스트</span>
                      </button>
                    </div>
                  </div>

                  {/* Target English Sentence */}
                  <p className="text-[16.5px] sm:text-[17.5px] font-bold text-ink leading-relaxed tracking-tight">
                    {item.text}
                  </p>

                  {/* Korean meaning — readable */}
                  {ko && (
                    <div className="flex items-start justify-between gap-2 border-t border-line/40 pt-2">
                      <p className="text-[13.5px] text-ink-soft font-normal leading-relaxed">
                        {ko}
                      </p>
                      <button
                        type="button"
                        onClick={() => toggleSentence(ko, idx, "ko")}
                        className={`shrink-0 rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                          isKoPlaying
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title={isKoPlaying ? "해석 정지" : "우리말 해석 듣기"}
                      >
                        {isKoPlaying ? "⏹️ 정지" : "🔈 해석"}
                      </button>
                    </div>
                  )}

                  {/* Expandable Voice Speaking Tester */}
                  {isMicOpen && (
                    <div className="mt-2 rounded-xl border border-primary/20 bg-primary/[0.02] p-3 sm:p-4 animate-in fade-in">
                      <VoiceSpeakingTester
                        targetText={item.text}
                        compact={true}
                        buttonLabel="🎙️ 지금 따라 말하기 (발음 채점)"
                        onSuccess={(transcript, score) => {
                          if (score >= 70) {
                            setCompletedSentences((prev) => ({ ...prev, [idx]: true }));
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Chunk drills reference (kept for prop compatibility) */}
      {chunkDrills.length > 0 && studyMode === "shadowing" && (
        <div className="rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-2xs flex flex-col gap-2">
          <span className="text-[13px] font-bold text-ink">🧱 청크 드릴</span>
          <div className="flex flex-col gap-2">
            {chunkDrills.map((drill, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-2 rounded-xl border border-line/60 bg-raised/40 px-3 py-2"
              >
                <div className="flex flex-col">
                  <span className="text-[13.5px] font-semibold text-ink">{drill.en}</span>
                  <span className="text-[12px] text-ink-soft">{drill.ko}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleSentence(drill.en, 10000 + i, "en")}
                    className={`rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                      isTargetPlaying(10000 + i, "en", false)
                        ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                        : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                    }`}
                  >
                    {isTargetPlaying(10000 + i, "en", false) ? "⏹️" : "🔊 EN"}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleSentence(drill.ko, 20000 + i, "ko")}
                    className={`rounded-lg border px-2 py-1 text-[11.5px] font-semibold transition-all cursor-pointer ${
                      isTargetPlaying(20000 + i, "ko", false)
                        ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                        : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                    }`}
                  >
                    {isTargetPlaying(20000 + i, "ko", false) ? "⏹️" : "🔈 KO"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
