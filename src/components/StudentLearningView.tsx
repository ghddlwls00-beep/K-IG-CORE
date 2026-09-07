"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { mediaUrl, hasAudioFile } from "@/lib/media";
import { generateWordBank, verifyWordSequence, type WordTile } from "@/lib/listeningUtils";
import { VoiceSpeakingTester } from "@/components/VoiceSpeakingTester";

interface StudentLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  audioTracks?: { src: string; label?: string }[];
  chunkDrills?: { en: string; ko: string }[];
}

type StudyMode = "listen" | "chunk" | "dictation" | "shadowing";
type ScriptFilter = "hidden" | "en_only" | "ko_only" | "all";
type PlaySpeed = 0.85 | 1.0 | 1.2;

interface ParsedChunk {
  en: string;
  ko?: string;
}

/**
 * Intelligent Syntactic Chunk Splitter
 * Splits an English sentence into natural, rhythmic semantic chunks.
 */
function getSentenceChunks(
  text: string,
  drills: { en: string; ko: string }[] = []
): ParsedChunk[] {
  if (!text) return [];

  // 1. If text already has pre-formatted slashes
  if (text.includes("/")) {
    return text
      .split("/")
      .map((c) => c.trim())
      .filter(Boolean)
      .map((en) => {
        const matchingDrill = drills.find(
          (d) =>
            d.en.toLowerCase() === en.toLowerCase() ||
            en.toLowerCase().includes(d.en.toLowerCase())
        );
        return { en, ko: matchingDrill?.ko };
      });
  }

  const clean = text.trim();

  // 2. Syntactic boundary segmentation
  const parts = clean
    .replace(/,\s*/g, ", | ")
    .replace(/;\s*/g, "; | ")
    .replace(/:\s*/g, ": | ")
    .replace(
      /\s+(and|but|or|so|because|although|though|when|while|before|after|if|since|until|whereas)\s+/gi,
      " | $1 "
    )
    .replace(/\s+(that|which|who|whom|whose|where)\s+/gi, " | $1 ")
    .replace(/\s+(in order to|so that|as well as|not only|but also)\s+/gi, " | $1 ")
    .replace(/\s+(to\s+[a-z]+)\s+/gi, (match, p1) => ` | ${p1} `)
    .split("|")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const rawChunks = parts.length > 0 ? parts : [clean];

  return rawChunks.map((en) => {
    // Attempt to match with provided chunkDrills
    const cleanEn = en.replace(/^[,\s;:]+|[,\s;:]+$/g, "").toLowerCase();
    const matchingDrill = drills.find(
      (d) =>
        d.en.toLowerCase() === cleanEn ||
        cleanEn.includes(d.en.toLowerCase()) ||
        d.en.toLowerCase().includes(cleanEn)
    );
    return {
      en,
      ko: matchingDrill?.ko,
    };
  });
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

  // Pre-compute sentence chunks for Step 2 & inline views
  const sentenceChunksMap = useMemo(() => {
    const map: Record<number, ParsedChunk[]> = {};
    sentenceItems.forEach((s, idx) => {
      map[idx] = getSentenceChunks(s.text, chunkDrills);
    });
    return map;
  }, [sentenceItems, chunkDrills]);

  // Main navigation & general settings
  const [studyMode, setStudyMode] = useState<StudyMode>("listen");
  const [speed, setSpeed] = useState<PlaySpeed>(1.0);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [activeChunk, setActiveChunk] = useState<string | null>(null);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [isPlayingFull, setIsPlayingFull] = useState(false);
  const fullAudioRef = useRef<HTMLAudioElement | null>(null);

  // Step 1: Blind Listening states
  const [scriptFilter, setScriptFilter] = useState<ScriptFilter>("hidden");
  const [revealedItems, setRevealedItems] = useState<Record<number, boolean>>({});
  const [inlineChunkViews, setInlineChunkViews] = useState<Record<number, boolean>>({});

  // Step 2: Chunk Reading states
  const [selectedChunkIdx, setSelectedChunkIdx] = useState<number | null>(null);
  const [flippedDrills, setFlippedDrills] = useState<Record<number, boolean>>({});
  const [playingDrillIdx, setPlayingDrillIdx] = useState<number | null>(null);

  // Step 3: Tap Dictation states
  const [dictationIdx, setDictationIdx] = useState<number>(0);
  const [selectedTiles, setSelectedTiles] = useState<WordTile[]>([]);
  const [solvedSentences, setSolvedSentences] = useState<Record<number, boolean>>({});
  const [dictationFeedback, setDictationFeedback] = useState<"correct" | "wrong" | null>(null);
  const [cachedWordBanks, setCachedWordBanks] = useState<
    Record<number, { correctWords: string[]; allTiles: WordTile[] }>
  >({});

  // Step 4: Shadowing & Paced Reading states
  const [completedSentences, setCompletedSentences] = useState<Record<number, boolean>>({});
  const [openMicTesters, setOpenMicTesters] = useState<Record<number, boolean>>({});

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
        fullAudioRef.current = null;
      }
    };
  }, []);

  // Initialize or retrieve word bank for a sentence
  const currentSentenceText = sentenceItems[dictationIdx]?.text || "";
  const currentWordBank = useMemo(() => {
    if (!currentSentenceText) return { correctWords: [], allTiles: [] };
    if (cachedWordBanks[dictationIdx]) {
      return cachedWordBanks[dictationIdx];
    }
    const bank = generateWordBank(currentSentenceText);
    setCachedWordBanks((prev) => ({ ...prev, [dictationIdx]: bank }));
    return bank;
  }, [currentSentenceText, dictationIdx, cachedWordBanks]);

  // Reset tile selection when moving to another sentence in dictation
  useEffect(() => {
    setSelectedTiles([]);
    setDictationFeedback(null);
  }, [dictationIdx]);

  // Full audio player
  const playFullAudio = useCallback(() => {
    if (isPlayingFull) {
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
        fullAudioRef.current.currentTime = 0;
      }
      stopSpeech();
      setIsPlayingFull(false);
      return;
    }

    stopSpeech();
    setActiveIdx(null);
    setActiveChunk(null);

    const fullTrack = audioTracks[0];
    if (fullTrack?.src && hasAudioFile(fullTrack.src)) {
      const audio = new Audio(mediaUrl(fullTrack.src));
      audio.playbackRate = speed;
      audio.onended = () => setIsPlayingFull(false);
      audio.onerror = () => playFullTts();
      fullAudioRef.current = audio;
      setIsPlayingFull(true);
      audio.play().catch(() => playFullTts());
    } else {
      playFullTts();
    }
  }, [isPlayingFull, audioTracks, speed, sentenceItems]);

  const playFullTts = useCallback(() => {
    const fullText = sentenceItems.map((s) => s.text).join(" ");
    setIsPlayingFull(true);
    speakText(fullText, {
      lang: "en",
      rate: speed,
      onEnd: () => setIsPlayingFull(false),
      onError: () => setIsPlayingFull(false),
    });
  }, [sentenceItems, speed]);

  // Sentence-level playback with optional loop
  const playSentence = useCallback(
    (text: string, idx: number, loop = false) => {
      if (!text) return;

      if (activeIdx === idx && !loop) {
        stopSpeech();
        setActiveIdx(null);
        setIsLooping(false);
        return;
      }

      stopSpeech();
      if (fullAudioRef.current) {
        fullAudioRef.current.pause();
        fullAudioRef.current.currentTime = 0;
      }
      setIsPlayingFull(false);
      setActiveChunk(null);
      setActiveIdx(idx);
      setIsLooping(loop);

      const doSpeak = () => {
        speakText(text, {
          lang: "en",
          rate: speed,
          onStart: () => setActiveIdx(idx),
          onEnd: () => {
            if (loop) {
              setTimeout(() => {
                doSpeak();
              }, 400);
            } else {
              setActiveIdx((curr) => (curr === idx ? null : curr));
            }
          },
          onError: () => {
            setActiveIdx((curr) => (curr === idx ? null : curr));
            setIsLooping(false);
          },
        });
      };

      doSpeak();
    },
    [activeIdx, speed]
  );

  // Chunk-level audio playback
  const playChunk = useCallback(
    (chunkText: string) => {
      if (!chunkText) return;
      if (activeChunk === chunkText) {
        stopSpeech();
        setActiveChunk(null);
        return;
      }
      stopSpeech();
      setActiveChunk(chunkText);
      speakText(chunkText, {
        lang: "en",
        rate: speed,
        onEnd: () => setActiveChunk((curr) => (curr === chunkText ? null : curr)),
        onError: () => setActiveChunk((curr) => (curr === chunkText ? null : curr)),
      });
    },
    [activeChunk, speed]
  );

  // Toggle individual sentence visibility
  const toggleItemReveal = (idx: number) => {
    setRevealedItems((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Toggle inline chunk slash view
  const toggleInlineChunks = (idx: number) => {
    setInlineChunkViews((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Step 3 Tap-Dictation Handlers
  const handleSelectTile = (tile: WordTile) => {
    if (selectedTiles.some((t) => t.id === tile.id)) return;
    const next = [...selectedTiles, tile];
    setSelectedTiles(next);
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
      // Congratulatory replay
      playSentence(currentSentenceText, dictationIdx);
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
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-bold text-primary">
                {sentenceItems.length}문장 마스터
              </span>
            </div>
            <p className="text-[12.5px] text-ink-soft mt-1 leading-relaxed">
              [소리 청취 ➔ 직독직해 ➔ 탭 딕테이션 ➔ 섀도잉] 4단계로 영어 어순과 귀를 완벽하게 틔워보세요.
            </p>
          </div>

          {/* Full Narration & Speed Control */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              type="button"
              onClick={playFullAudio}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer shadow-2xs select-none ${
                isPlayingFull
                  ? "bg-red-500 text-white ring-2 ring-red-500/30 animate-pulse"
                  : "bg-primary text-white hover:bg-primary/90 active:scale-[0.98]"
              }`}
            >
              <span>{isPlayingFull ? "⏹️" : "▶️"}</span>
              <span>{isPlayingFull ? "전체 정지" : "전체 본문 듣기"}</span>
            </button>

            {/* Playback Speed Pill */}
            <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[11px] font-semibold">
              {( [0.85, 1.0, 1.2] as PlaySpeed[] ).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
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

        {/* 4-Step Navigation Tab Bar */}
        <nav aria-label="학습 단계" className="w-full rounded-xl bg-raised/80 p-1.5 border border-line/70">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setStudyMode("listen");
                stopSpeech();
              }}
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
              onClick={() => {
                setStudyMode("chunk");
                stopSpeech();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "chunk"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>📖</span>
              <span className="truncate">Step 2. 직독직해 리딩</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyMode("dictation");
                stopSpeech();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "dictation"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>🧩</span>
              <span className="truncate">
                Step 3. 탭 딕테이션 ({solvedCount}/{sentenceItems.length})
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setStudyMode("shadowing");
                stopSpeech();
              }}
              className={`flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg text-[12px] sm:text-[13px] font-semibold transition-all cursor-pointer truncate ${
                studyMode === "shadowing"
                  ? "bg-surface text-primary shadow-2xs border border-line/80 ring-1 ring-primary/20"
                  : "text-ink-soft hover:text-ink hover:bg-surface/50"
              }`}
            >
              <span>🗣️</span>
              <span className="truncate">Step 4. 섀도잉 & 낭독</span>
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
              <button
                type="button"
                onClick={() => setScriptFilter("hidden")}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                  scriptFilter === "hidden"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🙈 모두 가림 (순수 리스닝)
              </button>
              <button
                type="button"
                onClick={() => setScriptFilter("en_only")}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                  scriptFilter === "en_only"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🔤 영어만
              </button>
              <button
                type="button"
                onClick={() => setScriptFilter("ko_only")}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                  scriptFilter === "ko_only"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                🇰🇷 해석만
              </button>
              <button
                type="button"
                onClick={() => setScriptFilter("all")}
                className={`px-2.5 py-1 rounded-lg text-[11.5px] font-semibold transition-all cursor-pointer ${
                  scriptFilter === "all"
                    ? "bg-primary text-white shadow-2xs"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                👁️ 전체 보기
              </button>
            </div>
          </div>

          {/* Sentence Cards */}
          <div className="flex flex-col gap-3">
            {sentenceItems.map((item, idx) => {
              const isPlaying = activeIdx === idx;
              const isLoopActive = isPlaying && isLooping;
              const ko = koParas[idx] || "";
              const isCardRevealed = revealedItems[idx] || scriptFilter === "all";
              const showEn = isCardRevealed || scriptFilter === "en_only";
              const showKo = isCardRevealed || scriptFilter === "ko_only";
              const showInlineChunks = inlineChunkViews[idx] === true;
              const chunks = sentenceChunksMap[idx] || [];

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                    isPlaying
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
                        onClick={() => playSentence(item.text, idx, false)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer ${
                          isPlaying && !isLooping
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400"
                            : "border-line bg-surface text-ink hover:bg-raised active:scale-95"
                        }`}
                        title={isPlaying ? "발음 정지" : "문장 듣기"}
                      >
                        <span>{isPlaying && !isLooping ? "⏹️" : "🔊"}</span>
                        <span>{isPlaying && !isLooping ? "정지" : "듣기"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => playSentence(item.text, idx, !isLoopActive)}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                          isLoopActive
                            ? "border-primary bg-primary text-white shadow-2xs"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title="한 문장 무한 반복 듣기"
                      >
                        <span>🔁</span>
                        <span className="hidden sm:inline">반복</span>
                      </button>

                      {scriptFilter === "hidden" && (
                        <button
                          type="button"
                          onClick={() => toggleItemReveal(idx)}
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
                      onClick={() => toggleItemReveal(idx)}
                      className="flex items-center justify-between rounded-xl border border-dashed border-line bg-raised/40 p-3.5 cursor-pointer hover:bg-raised/70 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-[13px] text-ink-soft font-medium">
                        <span>🎧</span>
                        <span>귀로 먼저 듣고 소리를 떠올려보세요 (클릭 시 텍스트 확인)</span>
                      </div>
                      <span className="text-[12px] font-bold text-primary">클릭하여 보기 👁️</span>
                    </div>
                  )}

                  {/* Korean Meaning Area */}
                  {showKo && ko && (
                    <p className="text-[13.5px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                      {ko}
                    </p>
                  )}

                  {/* Inline Chunk Slash Toggle */}
                  <div className="flex items-center justify-between border-t border-line/30 pt-2 text-[12px]">
                    <button
                      type="button"
                      onClick={() => toggleInlineChunks(idx)}
                      className="flex items-center gap-1 text-primary hover:underline font-semibold cursor-pointer"
                    >
                      <span>✂️</span>
                      <span>{showInlineChunks ? "직독직해 슬래시 접기" : "직독직해 슬래시 보기"}</span>
                    </button>
                  </div>

                  {/* Inline Chunks View */}
                  {showInlineChunks && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-primary/20 bg-primary/[0.02] p-3 animate-in fade-in">
                      {chunks.map((chunk, cIdx) => (
                        <span key={cIdx} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => playChunk(chunk.en)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-line bg-surface hover:border-primary hover:text-primary transition-all text-[13px] font-semibold cursor-pointer shadow-2xs"
                            title="클릭 시 청크 발음 듣기"
                          >
                            <span>{chunk.en}</span>
                            <span className="text-[11px] text-ink-faint">🔊</span>
                          </button>
                          {cIdx < chunks.length - 1 && (
                            <span className="font-bold text-primary/60 px-0.5">/</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* [STEP 2] 📖 직독직해 리딩 (Chunk-by-Chunk Slash Reading)                  */}
      {/* ========================================================================= */}
      {studyMode === "chunk" && (
        <div className="flex flex-col gap-5">
          {/* Pedagogical Explanation Card */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/[0.04] p-4 sm:p-5 shadow-2xs">
            <div className="flex items-start gap-3">
              <span className="text-[20px]">💡</span>
              <div className="flex flex-col gap-1">
                <h3 className="text-[14.5px] font-bold text-ink">
                  직독직해(Slash Reading) 훈련법
                </h3>
                <p className="text-[13px] text-ink-soft leading-relaxed">
                  문장 뒤에서부터 거슬러 번역하는 나쁜 습관을 없애고, 영어 어순 그대로 <strong>왼쪽에서 오른쪽으로 끊어 읽는 훈련</strong>입니다.
                  각 청크(의미 덩어리)를 탭하면 원어민의 리듬과 호흡을 직접 들을 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Section 1: Full Sentences with Slash Chunks */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
                <span>✂️</span>
                <span>본문 직독직해 슬래시 분할</span>
              </h4>
              <span className="text-[12px] text-ink-faint">
                청크를 탭하여 개별 발음을 확인하세요
              </span>
            </div>

            {sentenceItems.map((item, idx) => {
              const chunks = sentenceChunksMap[idx] || [];
              const ko = koParas[idx] || "";

              return (
                <div
                  key={idx}
                  className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:p-5 shadow-2xs hover:border-line-strong transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                        {item.n || idx + 1}
                      </span>
                      <span className="text-[12px] font-mono text-ink-faint">
                        Sentence #{idx + 1}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => playSentence(item.text, idx)}
                      className="flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[12px] font-semibold text-ink hover:bg-raised active:scale-95 transition-all cursor-pointer"
                    >
                      <span>🔊</span>
                      <span>전체 문장 듣기</span>
                    </button>
                  </div>

                  {/* Chunks Pill Ribbon */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {chunks.map((chunk, cIdx) => {
                      const isChunkPlaying = activeChunk === chunk.en;
                      return (
                        <div key={cIdx} className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => playChunk(chunk.en)}
                            className={`group relative flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all cursor-pointer shadow-2xs ${
                              isChunkPlaying
                                ? "border-primary bg-primary text-white shadow-xs scale-105"
                                : "border-line bg-raised/50 hover:border-primary hover:bg-surface text-ink"
                            }`}
                          >
                            <span className="text-[14.5px] font-bold flex items-center gap-1.5">
                              <span>{chunk.en}</span>
                              <span className="text-[11px] opacity-70">🔊</span>
                            </span>
                            {chunk.ko && (
                              <span
                                className={`text-[11.5px] mt-0.5 ${
                                  isChunkPlaying ? "text-white/90 font-medium" : "text-ink-soft"
                                }`}
                              >
                                {chunk.ko}
                              </span>
                            )}
                          </button>
                          {cIdx < chunks.length - 1 && (
                            <span className="text-[18px] font-black text-primary/40 select-none">
                              /
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Korean translation */}
                  {ko && (
                    <div className="border-t border-line/40 pt-2.5">
                      <p className="text-[13.5px] text-ink-soft leading-relaxed">{ko}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Section 2: Key Chunk Flashcard Drills */}
          {chunkDrills.length > 0 && (
            <div className="flex flex-col gap-3 mt-4">
              <div className="flex items-center justify-between">
                <h4 className="text-[14px] font-bold text-ink flex items-center gap-2">
                  <span>🧩</span>
                  <span>핵심 청크 플래시카드 드릴 ({chunkDrills.length}개)</span>
                </h4>
                <span className="text-[12px] text-ink-soft">
                  카드를 클릭하면 영문/한글 뜻이 반전됩니다
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chunkDrills.map((drill, dIdx) => {
                  const isFlipped = flippedDrills[dIdx] === true;
                  const isPlaying = activeChunk === drill.en;

                  return (
                    <div
                      key={dIdx}
                      onClick={() =>
                        setFlippedDrills((prev) => ({ ...prev, [dIdx]: !prev[dIdx] }))
                      }
                      className="group flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 transition-all hover:border-primary/50 hover:shadow-2xs cursor-pointer select-none"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-[15px] font-bold text-ink group-hover:text-primary transition-colors">
                          {isFlipped ? drill.ko : drill.en}
                        </span>
                        <span className="text-[12px] text-ink-faint">
                          {isFlipped ? "🇰🇷 우리말 해석" : "🔤 영어 청크 (클릭하여 뜻 확인)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playChunk(drill.en);
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition-all cursor-pointer ${
                            isPlaying
                              ? "border-red-500 bg-red-500 text-white"
                              : "border-line bg-raised text-ink-soft hover:bg-primary hover:text-white"
                          }`}
                          title="청크 발음 듣기"
                        >
                          <span className="text-[12px]">{isPlaying ? "⏹️" : "🔊"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* [STEP 3] 🧩 스마트 탭 딕테이션 (Tap Word Dictation Puzzle)              */}
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
                  onClick={() => setDictationIdx((i) => Math.max(0, i - 1))}
                  className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-semibold text-ink disabled:opacity-30 hover:bg-raised transition-colors cursor-pointer"
                >
                  ◀️ 이전
                </button>
                <button
                  type="button"
                  disabled={dictationIdx === sentenceItems.length - 1}
                  onClick={() =>
                    setDictationIdx((i) => Math.min(sentenceItems.length - 1, i + 1))
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
                  width: `${((dictationIdx + 1) / sentenceItems.length) * 100}%`,
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
                <p className="text-[15px] sm:text-[16px] font-bold text-ink leading-relaxed">
                  {koParas[dictationIdx] || "문장의 소리를 듣고 어순대로 조립하세요."}
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-center">
                <button
                  type="button"
                  onClick={() => playSentence(currentSentenceText, dictationIdx)}
                  className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-[13px] font-bold text-white shadow-2xs hover:bg-primary/90 active:scale-95 transition-all cursor-pointer"
                >
                  <span>🔊</span>
                  <span>문장 듣기</span>
                </button>
                <button
                  type="button"
                  onClick={() => playSentence(currentSentenceText, dictationIdx, true)}
                  className={`flex items-center gap-1 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition-all cursor-pointer ${
                    activeIdx === dictationIdx && isLooping
                      ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                      : "border-line bg-raised/60 text-ink-soft hover:text-ink hover:bg-raised"
                  }`}
                  title="무한 반복 청취"
                >
                  <span>🔁</span>
                  <span>무한 반복</span>
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
                    onClick={() => setDictationIdx((i) => i + 1)}
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
                  onClick={() => playSentence(currentSentenceText, dictationIdx)}
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
                  onClick={() => setDictationIdx(idx)}
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
      {/* [STEP 4] 🗣️ 섀도잉 & 동시 낭독 (Shadowing & Paced Reading)               */}
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
              const isPlaying = activeIdx === idx;
              const isLoopActive = isPlaying && isLooping;
              const ko = koParas[idx] || "";
              const isDone = completedSentences[idx] === true;
              const isMicOpen = openMicTesters[idx] === true;

              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-3 rounded-2xl border p-4 sm:p-5 transition-all shadow-2xs ${
                    isPlaying
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
                        onClick={() => playSentence(item.text, idx, false)}
                        className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-[12px] font-bold transition-all cursor-pointer ${
                          isPlaying && !isLooping
                            ? "border-red-500 bg-red-50 text-red-600 dark:bg-red-950/40"
                            : "border-line bg-surface text-ink hover:bg-raised active:scale-95"
                        }`}
                      >
                        <span>{isPlaying && !isLooping ? "⏹️" : "🔊"}</span>
                        <span>{isPlaying && !isLooping ? "정지" : "낭독 가이드 듣기"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => playSentence(item.text, idx, !isLoopActive)}
                        className={`flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[12px] font-medium transition-all cursor-pointer ${
                          isLoopActive
                            ? "border-primary bg-primary text-white shadow-2xs"
                            : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                        title="반복 루프 섀도잉"
                      >
                        <span>🔁</span>
                        <span className="hidden sm:inline">반복</span>
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

                  {/* Korean meaning */}
                  {ko && (
                    <p className="text-[13.5px] text-ink-soft border-t border-line/40 pt-2 font-normal leading-relaxed">
                      {ko}
                    </p>
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
    </div>
  );
}
