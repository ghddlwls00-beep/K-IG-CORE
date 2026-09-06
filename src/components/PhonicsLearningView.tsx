"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
}

export function PhonicsLearningView({ blocks, lessonKey, vocaDictionary }: PhonicsLearningViewProps) {
  const wordgridBlock = blocks.find((b) => b.type === "wordgrid") as
    | { type: "wordgrid"; rows: string[][] }
    | undefined;

  const rows = wordgridBlock?.rows ?? [];
  const words = useMemo(() => {
    return rows.flat().map((w) => w?.trim()).filter(Boolean) as string[];
  }, [rows]);

  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>(words[0] || "");
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [speed, setSpeed] = useState<0.8 | 1.0 | 1.2>(1.0);
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);

  // Vocabulary Learning Enhancements
  const [showMeanings, setShowMeanings] = useState(true);
  const [viewTab, setViewTab] = useState<"matrix" | "cards">("matrix");
  const [memorizedWords, setMemorizedWords] = useState<Record<string, boolean>>({});
  const [cardIndex, setCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  const playIndexRef = useRef(0);
  const isPlayingRef = useRef(false);
  const allTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const rowPlayingRef = useRef(false);
  const activeRowRef = useRef<number | null>(null);
  const rowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Local storage key for memorized checklist
  const storageKey = `kig:voca:memorized:${lessonKey}`;

  // Restore memorized words on lesson change
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      setMemorizedWords(raw ? JSON.parse(raw) : {});
    } catch {
      setMemorizedWords({});
    }
  }, [storageKey]);

  // Keep selectedWord valid when words change
  useEffect(() => {
    if (words.length > 0) {
      if (!selectedWord || !words.includes(selectedWord)) {
        setSelectedWord(words[0]);
      }
    } else {
      setSelectedWord("");
    }
    setCardIndex(0);
  }, [words, lessonKey]);

  function toggleMemorized(word: string, e?: React.MouseEvent) {
    e?.stopPropagation();
    const cleanWord = word?.trim();
    if (!cleanWord) return;

    setMemorizedWords((prev) => {
      const next = { ...prev, [cleanWord]: !prev[cleanWord] };
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function markAllMemorized() {
    const next: Record<string, boolean> = {};
    for (const w of words) {
      next[w] = true;
    }
    setMemorizedWords(next);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  function resetAllMemorized() {
    setMemorizedWords({});
    try {
      window.localStorage.removeItem(storageKey);
    } catch {}
  }

  function stopRowPlayback() {
    rowPlayingRef.current = false;
    activeRowRef.current = null;
    if (rowTimeoutRef.current) {
      clearTimeout(rowTimeoutRef.current);
      rowTimeoutRef.current = null;
    }
    stopSpeech();
    setActiveRowIdx(null);
    setActiveWord(null);
  }

  useEffect(() => {
    return () => {
      stopRowPlayback();
      isPlayingRef.current = false;
      if (allTimeoutRef.current) {
        clearTimeout(allTimeoutRef.current);
        allTimeoutRef.current = null;
      }
      stopSpeech();
    };
  }, []);

  // Keyboard navigation & playback shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        handlePlayAll();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (viewTab === "cards") {
          setCardIndex((prev) => (prev > 0 ? prev - 1 : words.length - 1));
          setIsCardFlipped(false);
        } else {
          const curIdx = words.indexOf(selectedWord);
          const prevIdx = curIdx > 0 ? curIdx - 1 : words.length - 1;
          if (words[prevIdx]) setSelectedWord(words[prevIdx]);
        }
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (viewTab === "cards") {
          setCardIndex((prev) => (prev < words.length - 1 ? prev + 1 : 0));
          setIsCardFlipped(false);
        } else {
          const curIdx = words.indexOf(selectedWord);
          const nextIdx = curIdx < words.length - 1 ? curIdx + 1 : 0;
          if (words[nextIdx]) setSelectedWord(words[nextIdx]);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (viewTab === "cards" && words[cardIndex]) {
          playWord(words[cardIndex]);
        } else if (selectedWord) {
          playWord(selectedWord);
        }
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        const target = viewTab === "cards" ? words[cardIndex] : selectedWord;
        if (target) toggleMemorized(target);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [viewTab, words, selectedWord, cardIndex, isPlayingAll, storageKey]);

  function getMeaning(word: string): string {
    if (!word) return "";
    if (vocaDictionary && vocaDictionary[word]) {
      return vocaDictionary[word].meaning;
    }
    // Fallback case-insensitive or clean lookup
    const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
    if (vocaDictionary && vocaDictionary[clean]) {
      return vocaDictionary[clean].meaning;
    }
    return "단어";
  }

  function playWord(word: string, onEnd?: () => void) {
    if (!word) return;
    if (activeWord === word) {
      stopSpeech();
      setActiveWord(null);
      return;
    }
    if (rowPlayingRef.current) stopRowPlayback();
    if (isPlayingRef.current) {
      isPlayingRef.current = false;
      if (allTimeoutRef.current) {
        clearTimeout(allTimeoutRef.current);
        allTimeoutRef.current = null;
      }
      setIsPlayingAll(false);
    }
    stopSpeech();
    setActiveWord(word);
    setSelectedWord(word);

    speakText(word, {
      lang: "en",
      rate: speed,
      onEnd: () => {
        setActiveWord((curr) => (curr === word ? null : curr));
        onEnd?.();
      },
      onError: () => {
        setActiveWord((curr) => (curr === word ? null : curr));
        onEnd?.();
      },
    });
  }

  function handlePlayAll() {
    if (isPlayingAll) {
      isPlayingRef.current = false;
      if (allTimeoutRef.current) {
        clearTimeout(allTimeoutRef.current);
        allTimeoutRef.current = null;
      }
      setIsPlayingAll(false);
      stopSpeech();
      setActiveWord(null);
      return;
    }

    stopRowPlayback();
    if (words.length === 0) return;
    isPlayingRef.current = true;
    setIsPlayingAll(true);
    playIndexRef.current = 0;
    playNextSequential();
  }

  function playNextSequential() {
    if (!isPlayingRef.current || playIndexRef.current >= words.length) {
      isPlayingRef.current = false;
      setIsPlayingAll(false);
      setActiveWord(null);
      return;
    }

    const word = words[playIndexRef.current];
    setActiveWord(word);
    setSelectedWord(word);

    speakText(word, {
      lang: "en",
      rate: speed,
      onEnd: () => {
        if (!isPlayingRef.current) return;
        playIndexRef.current += 1;
        allTimeoutRef.current = setTimeout(() => {
          if (isPlayingRef.current) {
            playNextSequential();
          }
        }, 350);
      },
      onError: () => {
        if (!isPlayingRef.current) return;
        playIndexRef.current += 1;
        allTimeoutRef.current = setTimeout(() => {
          if (isPlayingRef.current) {
            playNextSequential();
          }
        }, 350);
      },
    });
  }

  function playRow(rowIndex: number) {
    if (activeRowIdx === rowIndex && rowPlayingRef.current) {
      stopRowPlayback();
      return;
    }

    if (isPlayingAll) {
      isPlayingRef.current = false;
      if (allTimeoutRef.current) {
        clearTimeout(allTimeoutRef.current);
        allTimeoutRef.current = null;
      }
      setIsPlayingAll(false);
    }
    stopRowPlayback();

    const rowWords = (rows[rowIndex] || []).filter(Boolean);
    if (rowWords.length === 0) return;

    rowPlayingRef.current = true;
    activeRowRef.current = rowIndex;
    setActiveRowIdx(rowIndex);
    let idx = 0;

    function playNextInRow() {
      if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) {
        return;
      }

      if (idx >= rowWords.length) {
        stopRowPlayback();
        return;
      }

      const w = rowWords[idx];
      setActiveWord(w);
      setSelectedWord(w);

      speakText(w, {
        lang: "en",
        rate: speed,
        onEnd: () => {
          if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) {
            return;
          }
          idx++;
          rowTimeoutRef.current = setTimeout(() => {
            if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) {
              return;
            }
            playNextInRow();
          }, 350);
        },
        onError: () => {
          if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) {
            return;
          }
          idx++;
          rowTimeoutRef.current = setTimeout(() => {
            if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) {
              return;
            }
            playNextInRow();
          }, 350);
        },
      });
    }

    playNextInRow();
  }

  const memorizedCount = useMemo(() => {
    return words.filter((w) => memorizedWords[w]).length;
  }, [words, memorizedWords]);

  const selectedMeaning = getMeaning(selectedWord);

  return (
    <div className="flex flex-col gap-6 notranslate" translate="no">
      {/* 1. Header Toolbar & Progress */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-xs">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-faint">
              Vocabulary Matrix ({words.length} Words)
            </span>
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-bold transition-all ${
                memorizedCount === words.length && words.length > 0
                  ? "bg-emerald-500 text-white shadow-xs"
                  : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {memorizedCount === words.length && words.length > 0
                ? `🎉 ${words.length}단어 전체 암기 완료!`
                : `암기 완료: ${memorizedCount} / ${words.length}`}
            </span>
            <span className="font-mono text-[11px] text-ink-faint">
              (단축키: M 키로 선택 단어 암기 토글)
            </span>
          </div>
          <span className="text-[13.5px] font-medium text-ink">
            원어민 표준 발음 청취 및 1:1 한국어 뜻 연동 학습 시스템
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Bulk Memorize / Reset */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={markAllMemorized}
              className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1.5 text-[12px] font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer shadow-2xs"
              title="현재 레슨의 모든 단어를 암기 완료로 일괄 체크"
            >
              ✓ 전체 암기
            </button>
            {memorizedCount > 0 && (
              <button
                type="button"
                onClick={resetAllMemorized}
                className="rounded-xl border border-line bg-surface px-2.5 py-1.5 text-[12px] font-medium text-ink-soft hover:text-ink hover:bg-raised transition-all cursor-pointer"
                title="암기 체크 전체 초기화"
              >
                ↺ 초기화
              </button>
            )}
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setViewTab("matrix")}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                viewTab === "matrix"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              격자 보기
            </button>
            <button
              type="button"
              onClick={() => {
                setViewTab("cards");
                setIsCardFlipped(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer font-medium ${
                viewTab === "cards"
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              단어 카드
            </button>
          </div>

          {/* Toggle Korean Meanings (Active Recall) */}
          <button
            type="button"
            onClick={() => setShowMeanings(!showMeanings)}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[12px] font-semibold transition-all cursor-pointer ${
              showMeanings
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                : "border-line bg-surface text-ink-soft hover:text-ink"
            }`}
          >
            <span>{showMeanings ? "💡 한글 뜻 켜짐" : "🙈 한글 뜻 가리기 (자가테스트)"}</span>
          </button>

          {/* Speed Control */}
          <div className="flex items-center rounded-xl border border-line bg-raised/70 p-1 text-[12px]">
            <button
              type="button"
              onClick={() => setSpeed(0.8)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 0.8
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              0.8x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(1.0)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 1.0
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              1.0x
            </button>
            <button
              type="button"
              onClick={() => setSpeed(1.2)}
              className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                speed === 1.2
                  ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                  : "text-ink-soft hover:text-ink"
              }`}
            >
              1.2x
            </button>
          </div>

          {/* Play All Sequential */}
          <button
            type="button"
            onClick={handlePlayAll}
            className={
              "flex items-center gap-1.5 rounded-xl px-4 py-2 text-[12.5px] font-semibold transition-all cursor-pointer shadow-xs " +
              (isPlayingAll
                ? "bg-red-600 text-white"
                : "bg-ink text-surface hover:opacity-90")
            }
          >
            <span>{isPlayingAll ? "⏸ 일시정지" : `▶ 전체 ${words.length}단어 연속 재생`}</span>
          </button>
        </div>
      </div>

      {/* 2. Selected Word Spotlight Card */}
      {selectedWord && (
        <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/[0.04] p-5 shadow-xs flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="text-[34px] font-extrabold tracking-tight text-ink font-mono">
                {selectedWord}
              </span>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-[17px] font-bold text-indigo-600 dark:text-indigo-400">
                    {selectedMeaning}
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">
                    ({selectedWord.length}글자)
                  </span>
                </div>
                <span className="text-[12px] text-ink-soft">
                  원어민 표준 발음 청취 및 마이크 발음 교정
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => toggleMemorized(selectedWord, e)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
                  memorizedWords[selectedWord]
                    ? "bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-600/30"
                    : "border-2 border-emerald-500/50 bg-surface text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 hover:border-emerald-600"
                }`}
                title={memorizedWords[selectedWord] ? "암기 완료 취소" : "암기 완료로 체크"}
              >
                <span className="text-[14px]">
                  {memorizedWords[selectedWord] ? "✓" : "○"}
                </span>
                <span>
                  {memorizedWords[selectedWord] ? "암기 완료됨" : "암기 체크"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => playWord(selectedWord)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-xs transition-colors cursor-pointer ${
                  activeWord === selectedWord
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                <span>{activeWord === selectedWord ? "⏹️ 정지" : "🔊 발음 듣기"}</span>
              </button>
            </div>
          </div>

          {/* 🎙️ 발음 정밀 테스트 */}
          <div className="pt-3 border-t border-indigo-500/20">
            <VoiceSpeakingTester
              targetText={selectedWord}
              buttonLabel="내 발음 정밀 테스트"
            />
          </div>
        </div>
      )}

      {/* 3. VIEW MODE: FLASHCARD DECK (단어 카드 플래시카드 모드) */}
      {viewTab === "cards" && words.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-xs flex flex-col items-center justify-center text-center gap-6">
          <div className="flex items-center justify-between w-full max-w-md text-[13px] font-mono text-ink-faint">
            <span>카드 #{cardIndex + 1} / {words.length}</span>
            <button
              type="button"
              onClick={() => toggleMemorized(words[cardIndex])}
              className={`px-2.5 py-1 rounded-md text-[11.5px] font-bold cursor-pointer transition-colors ${
                memorizedWords[words[cardIndex]]
                  ? "bg-emerald-600 text-white"
                  : "bg-raised text-ink border border-line"
              }`}
            >
              {memorizedWords[words[cardIndex]] ? "✓ 암기완료" : "○ 미암기"}
            </button>
          </div>

          <div
            onClick={() => setIsCardFlipped(!isCardFlipped)}
            className="w-full max-w-md h-56 rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-b from-surface to-raised/50 p-6 flex flex-col items-center justify-center cursor-pointer shadow-sm hover:shadow-md transition-all select-none relative group"
          >
            <div className="text-[38px] font-black text-ink font-mono mb-2">
              {words[cardIndex]}
            </div>

            {isCardFlipped ? (
              <div className="text-[20px] font-bold text-indigo-600 dark:text-indigo-400 animate-in fade-in">
                {getMeaning(words[cardIndex])}
              </div>
            ) : (
              <span className="text-[12.5px] text-ink-faint group-hover:text-ink">
                (카드를 클릭하면 한국어 뜻이 나타납니다)
              </span>
            )}

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                playWord(words[cardIndex]);
              }}
              className={`absolute bottom-4 right-4 rounded-full border p-2 shadow-2xs cursor-pointer font-bold transition-colors ${
                activeWord === words[cardIndex]
                  ? "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                  : "bg-surface border-line text-ink hover:bg-raised"
              }`}
              title={activeWord === words[cardIndex] ? "발음 정지" : "발음 듣기"}
            >
              {activeWord === words[cardIndex] ? "⏹️" : "🔊"}
            </button>
          </div>

          {/* Navigation controls */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                setCardIndex((prev) => (prev > 0 ? prev - 1 : words.length - 1));
                setIsCardFlipped(false);
                setSelectedWord(words[cardIndex > 0 ? cardIndex - 1 : words.length - 1]);
              }}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-raised transition-colors cursor-pointer"
            >
              ← 이전 카드
            </button>
            <button
              type="button"
              onClick={() => setIsCardFlipped(!isCardFlipped)}
              className="rounded-xl bg-indigo-600 px-5 py-2 text-[13px] font-bold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              {isCardFlipped ? "앞면 보기" : "💡 뜻 확인하기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCardIndex((prev) => (prev < words.length - 1 ? prev + 1 : 0));
                setIsCardFlipped(false);
                setSelectedWord(words[cardIndex < words.length - 1 ? cardIndex + 1 : 0]);
              }}
              className="rounded-xl border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:bg-raised transition-colors cursor-pointer"
            >
              다음 카드 →
            </button>
          </div>
        </div>
      )}

      {/* 4. VIEW MODE: 6x6 MATRIX GRID */}
      {viewTab === "matrix" && (
        <div className="flex flex-col gap-3.5">
          {rows.map((row, rIdx) => {
            const validWords = row.filter(Boolean);
            if (validWords.length === 0) return null;
            const isRowActive = activeRowIdx === rIdx;

            return (
              <div
                key={rIdx}
                className="rounded-2xl border border-line bg-surface p-4 shadow-2xs flex flex-col gap-2.5"
              >
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-bold text-ink-faint uppercase tracking-wider">
                      Row #{rIdx + 1}
                    </span>
                    <span className="font-mono text-[11px] text-ink-faint">
                      ({validWords.length}단어)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => playRow(rIdx)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold cursor-pointer transition-all ${
                      isRowActive
                        ? "bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/60 font-bold shadow-2xs hover:bg-rose-100"
                        : "text-ink-soft hover:text-ink hover:bg-raised/70 border border-transparent"
                    }`}
                    title={isRowActive ? "이 행 연속 재생 중지" : "이 행의 모든 단어를 순서대로 재생"}
                  >
                    {isRowActive ? (
                      <>
                        <span className="inline-block h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                        <span>⏹ 이 행 재생 중지</span>
                      </>
                    ) : (
                      <>
                        <span>▶</span>
                        <span>이 행 연속 재생</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {validWords.map((w, cIdx) => {
                    const isSelected = selectedWord === w;
                    const isActive = activeWord === w;
                    const isMemorized = Boolean(memorizedWords[w]);
                    const meaning = getMeaning(w);

                    return (
                      <div
                        key={cIdx}
                        onClick={() => playWord(w)}
                        className={`group relative flex flex-col justify-between rounded-xl border p-3 transition-all cursor-pointer text-center min-h-[84px] select-none ${
                          isActive
                            ? "border-indigo-600 bg-indigo-600 text-white scale-105 shadow-md z-10"
                            : isSelected
                            ? "border-indigo-500 bg-indigo-500/10 text-ink ring-2 ring-indigo-500/40 shadow-xs"
                            : isMemorized
                            ? "border-emerald-500/40 bg-emerald-500/[0.04] text-ink hover:border-emerald-500 hover:bg-emerald-500/[0.08]"
                            : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/40"
                        }`}
                      >
                        {/* Word Checklist Pill */}
                        <div className="flex items-center justify-between w-full mb-1">
                          <button
                            type="button"
                            onClick={(e) => toggleMemorized(w, e)}
                            className="p-1 -m-1 rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
                            title={isMemorized ? "암기 완료 취소" : "암기 완료 체크"}
                            aria-label={isMemorized ? "암기 완료 취소" : "암기 완료 체크"}
                          >
                            <span
                              className={`h-[20px] w-[20px] rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                                isMemorized
                                  ? isActive
                                    ? "bg-white text-indigo-600 shadow-2xs"
                                    : "bg-emerald-600 text-white shadow-2xs scale-105"
                                  : isActive
                                  ? "border-2 border-white/70 text-transparent hover:text-white"
                                  : "border-2 border-black/20 dark:border-white/25 text-transparent hover:border-emerald-500 hover:text-emerald-600"
                              }`}
                            >
                              ✓
                            </span>
                          </button>
                          <span className={`font-mono text-[9px] ${isActive ? "text-white/80" : "text-ink-faint"}`}>
                            🔊
                          </span>
                        </div>

                        {/* English Word */}
                        <span className="font-mono text-[15.5px] font-bold tracking-tight">
                          {w}
                        </span>

                        {/* Korean Meaning */}
                        <div className="mt-1 min-h-[18px]">
                          {showMeanings ? (
                            <span
                              className={`text-[11.5px] font-medium line-clamp-1 ${
                                isActive
                                  ? "text-indigo-100"
                                  : isSelected
                                  ? "text-indigo-700 dark:text-indigo-300 font-semibold"
                                  : isMemorized
                                  ? "text-emerald-700 dark:text-emerald-400 font-medium"
                                  : "text-ink-soft group-hover:text-ink"
                              }`}
                            >
                              {meaning}
                            </span>
                          ) : (
                            <span className="text-[10px] text-ink-faint opacity-40">
                              •••
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
