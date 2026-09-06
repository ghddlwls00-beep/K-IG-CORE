"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import {
  analyzeEtymology,
  getCollocation,
  generateActiveRecallQuizzes,
  generateSpeedDrillItems,
  updateLeitnerCard,
  type ActiveRecallQuestion,
  type SpeedDrillItem,
  type LeitnerCard,
} from "@/lib/vocaUtils";

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
}

export function PhonicsLearningView({
  blocks,
  lessonKey,
  vocaDictionary,
}: PhonicsLearningViewProps) {
  const wordgridBlock = blocks.find((b) => b.type === "wordgrid") as
    | { type: "wordgrid"; rows: string[][] }
    | undefined;

  const rows = wordgridBlock?.rows ?? [];
  const words = useMemo(() => {
    return rows.flat().map((w) => w?.trim()).filter(Boolean) as string[];
  }, [rows]);

  // Main 4-Stage Tab State: Step 1 (matrix) -> Step 2 (recall) -> Step 3 (speaking) -> Step 4 (speed)
  const [activeTab, setActiveTab] = useState<
    "matrix" | "recall" | "speaking" | "speed"
  >("matrix");

  // Playback & Selection
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<string>(words[0] || "");
  const [speed, setSpeed] = useState<0.8 | 1.0 | 1.2>(1.0);
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(null);
  const [clusterIdx, setClusterIdx] = useState<number>(0);
  const [showAllClusters, setShowAllClusters] = useState(false);

  // Leitner Spaced Repetition State
  const leitnerStorageKey = `kig:voca:leitner:${lessonKey}`;
  const [leitnerCards, setLeitnerCards] = useState<Record<string, LeitnerCard>>({});

  // ---------------------------------------------------------------------------
  // Load & Save Leitner Data
  // ---------------------------------------------------------------------------
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(leitnerStorageKey);
      if (raw) {
        setLeitnerCards(JSON.parse(raw));
      } else {
        // Initialize cards
        const initial: Record<string, LeitnerCard> = {};
        for (const w of words) {
          const clean = w.toLowerCase().trim();
          const m = vocaDictionary?.[clean]?.meaning || vocaDictionary?.[w]?.meaning || "단어";
          initial[clean] = {
            word: w,
            meaning: m,
            box: 1,
            lastTestedAt: Date.now(),
            streak: 0,
          };
        }
        setLeitnerCards(initial);
      }
    } catch {
      setLeitnerCards({});
    }
  }, [leitnerStorageKey, words, vocaDictionary]);

  function saveLeitnerCards(next: Record<string, LeitnerCard>) {
    setLeitnerCards(next);
    try {
      window.localStorage.setItem(leitnerStorageKey, JSON.stringify(next));
    } catch {}
  }

  // Meaning helper
  function getMeaning(word: string): string {
    if (!word) return "";
    const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
    return (
      vocaDictionary?.[word]?.meaning ||
      vocaDictionary?.[clean]?.meaning ||
      "단어"
    );
  }

  // ---------------------------------------------------------------------------
  // Audio Playback
  // ---------------------------------------------------------------------------
  const rowPlayingRef = useRef(false);
  const activeRowRef = useRef<number | null>(null);
  const rowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      stopSpeech();
    };
  }, []);

  function playWord(word: string, onEnd?: () => void) {
    if (!word) return;
    if (activeWord === word) {
      stopSpeech();
      setActiveWord(null);
      return;
    }
    if (rowPlayingRef.current) stopRowPlayback();
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

  function playRow(rowIndex: number) {
    if (activeRowIdx === rowIndex && rowPlayingRef.current) {
      stopRowPlayback();
      return;
    }
    stopRowPlayback();

    const rowWords = (rows[rowIndex] || []).filter(Boolean);
    if (rowWords.length === 0) return;

    rowPlayingRef.current = true;
    activeRowRef.current = rowIndex;
    setActiveRowIdx(rowIndex);
    let idx = 0;

    function playNext() {
      if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
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
          if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
          idx++;
          rowTimeoutRef.current = setTimeout(() => {
            if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
            playNext();
          }, 350);
        },
        onError: () => {
          if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
          idx++;
          rowTimeoutRef.current = setTimeout(() => {
            if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
            playNext();
          }, 350);
        },
      });
    }

    playNext();
  }

  // ---------------------------------------------------------------------------
  // STEP 2: Active Recall Quiz Engine
  // ---------------------------------------------------------------------------
  const dictMap = useMemo(() => {
    const map: Record<string, { meaning: string }> = {};
    for (const w of words) {
      const clean = w.toLowerCase().trim();
      map[clean] = { meaning: getMeaning(w) };
    }
    return map;
  }, [words, vocaDictionary]);

  const activeRecallQuizzes = useMemo(() => {
    return generateActiveRecallQuizzes(words, dictMap);
  }, [words, dictMap]);

  const [recallIdx, setRecallIdx] = useState(0);
  const [selectedRecallAnswer, setSelectedRecallAnswer] = useState<number | null>(null);
  const [recallScore, setRecallScore] = useState(0);
  const [recallStreak, setRecallStreak] = useState(0);
  const [isRecallAnswered, setIsRecallAnswered] = useState(false);

  function handleAnswerRecall(optIdx: number) {
    if (isRecallAnswered) return;
    const currentQ = activeRecallQuizzes[recallIdx];
    if (!currentQ) return;

    setSelectedRecallAnswer(optIdx);
    setIsRecallAnswered(true);

    const isCorrect = optIdx === currentQ.correctIndex;
    if (isCorrect) {
      setRecallScore((s) => s + 10 + recallStreak * 2);
      setRecallStreak((st) => st + 1);
    } else {
      setRecallStreak(0);
    }

    // Update Leitner Box
    const nextLeitner = updateLeitnerCard(
      leitnerCards,
      currentQ.word,
      currentQ.correctMeaning,
      isCorrect,
    );
    saveLeitnerCards(nextLeitner);
  }

  function handleNextRecall() {
    setSelectedRecallAnswer(null);
    setIsRecallAnswered(false);
    setRecallIdx((prev) => (prev + 1) % Math.max(1, activeRecallQuizzes.length));
  }

  // ---------------------------------------------------------------------------
  // STEP 4: 60-Second Speed Reflex Drill
  // ---------------------------------------------------------------------------
  const speedItems = useMemo(() => {
    return generateSpeedDrillItems(words, dictMap);
  }, [words, dictMap]);

  const [speedGameActive, setSpeedGameActive] = useState(false);
  const [speedGameOver, setSpeedGameOver] = useState(false);
  const [speedTimeLeft, setSpeedTimeLeft] = useState(60);
  const [speedCurIdx, setSpeedCurIdx] = useState(0);
  const [speedScore, setSpeedScore] = useState(0);
  const [speedCombo, setSpeedCombo] = useState(0);
  const [speedMaxCombo, setSpeedMaxCombo] = useState(0);
  const [speedCorrectCount, setSpeedCorrectCount] = useState(0);
  const [speedWrongCount, setSpeedWrongCount] = useState(0);

  const speedHighScoreKey = `kig:voca:speed_high:${lessonKey}`;
  const [speedHighScore, setSpeedHighScore] = useState(0);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(speedHighScoreKey);
      if (saved) setSpeedHighScore(Number(saved) || 0);
    } catch {}
  }, [speedHighScoreKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    if (speedGameActive && speedTimeLeft > 0) {
      timer = setInterval(() => {
        setSpeedTimeLeft((t) => {
          if (t <= 1) {
            setSpeedGameActive(false);
            setSpeedGameOver(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [speedGameActive, speedTimeLeft]);

  function startSpeedGame() {
    setSpeedGameActive(true);
    setSpeedGameOver(false);
    setSpeedTimeLeft(60);
    setSpeedCurIdx(0);
    setSpeedScore(0);
    setSpeedCombo(0);
    setSpeedMaxCombo(0);
    setSpeedCorrectCount(0);
    setSpeedWrongCount(0);
  }

  function handleSpeedAnswer(userSaysMatch: boolean) {
    if (!speedGameActive || speedItems.length === 0) return;
    const cur = speedItems[speedCurIdx % speedItems.length];
    if (!cur) return;

    const isCorrect = userSaysMatch === cur.isMatch;
    if (isCorrect) {
      const nextCombo = speedCombo + 1;
      setSpeedCombo(nextCombo);
      if (nextCombo > speedMaxCombo) setSpeedMaxCombo(nextCombo);
      const points = 100 + nextCombo * 10;
      setSpeedScore((s) => {
        const next = s + points;
        if (next > speedHighScore) {
          setSpeedHighScore(next);
          try {
            window.localStorage.setItem(speedHighScoreKey, String(next));
          } catch {}
        }
        return next;
      });
      setSpeedCorrectCount((c) => c + 1);
    } else {
      setSpeedCombo(0);
      setSpeedWrongCount((w) => w + 1);
    }

    // Advance to next speed item
    setSpeedCurIdx((idx) => idx + 1);
  }

  // ---------------------------------------------------------------------------
  // STEP 3: Leitner Box Filtering & Speaking
  // ---------------------------------------------------------------------------
  const [leitnerFilter, setLeitnerFilter] = useState<1 | 2 | 3 | "all">("all");

  const box1Words = useMemo(
    () => Object.values(leitnerCards).filter((c) => c.box === 1),
    [leitnerCards],
  );
  const box2Words = useMemo(
    () => Object.values(leitnerCards).filter((c) => c.box === 2),
    [leitnerCards],
  );
  const box3Words = useMemo(
    () => Object.values(leitnerCards).filter((c) => c.box === 3),
    [leitnerCards],
  );

  const displayedLeitnerCards = useMemo(() => {
    if (leitnerFilter === "all") return Object.values(leitnerCards);
    return Object.values(leitnerCards).filter((c) => c.box === leitnerFilter);
  }, [leitnerCards, leitnerFilter]);

  // Metrics
  const totalCount = words.length;
  const masteredCount = box3Words.length;
  const familiarCount = box2Words.length;
  const reviewCount = box1Words.length;

  const selectedMeaning = getMeaning(selectedWord);
  const selectedEtymology = useMemo(
    () => analyzeEtymology(selectedWord),
    [selectedWord],
  );
  const selectedCollocation = useMemo(
    () => getCollocation(selectedWord, selectedMeaning),
    [selectedWord, selectedMeaning],
  );

  return (
    <div className="flex flex-col gap-6 notranslate select-text" translate="no">
      {/* 🌟 1. LUXURY TOP HEADER & STAGE TABS */}
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-surface/90 p-5 shadow-xs backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-[11px] font-extrabold uppercase tracking-[0.2em] text-[#D4AF37] dark:text-[#E6C665]">
                K-IG VOCA COGNITIVE MASTERY
              </span>
              <span className="rounded-full bg-[#D4AF37]/10 px-3 py-0.5 text-[11px] font-bold text-amber-900 dark:text-amber-200 border border-[#D4AF37]/25">
                총 {totalCount}단어
              </span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-0.5 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-500/25">
                완전 마스터: {masteredCount}개
              </span>
              {reviewCount > 0 && (
                <span className="rounded-full bg-rose-500/10 px-3 py-0.5 text-[11px] font-bold text-rose-800 dark:text-rose-300 border border-rose-500/25">
                  집중 복습 필요: {reviewCount}개
                </span>
              )}
            </div>
            <h2 className="text-[20px] font-bold tracking-tight text-ink">
              뇌과학 기반 4단계 음향·인지 어휘 마스터리 파이프라인
            </h2>
          </div>

          {/* Speed & Global Play Controls */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] text-ink-faint">속도:</span>
            <div className="flex items-center rounded-xl border border-line bg-raised/70 p-0.5 text-[11.5px]">
              {([0.8, 1.0, 1.2] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                    speed === s
                      ? "bg-surface text-ink shadow-2xs border border-line"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4 STAGE TABS (문맥예문조립 제외, Step 3 AI 발음&오답노트, Step 4 60초 타임어택) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 border-t border-line/60 pt-3">
          {[
            {
              id: "matrix",
              step: "Step 1",
              label: "💡 덩어리 매트릭스",
              sub: "소리·어원·콜로케이션",
            },
            {
              id: "recall",
              step: "Step 2",
              label: "⚡ 액티브 인출",
              sub: "테스트 효과 4지선다",
            },
            {
              id: "speaking",
              step: "Step 3",
              label: "🗣️ AI 발음 & 오답노트",
              sub: "망각곡선 라이트너 복습",
            },
            {
              id: "speed",
              step: "Step 4",
              label: "⏱️ 60초 타임어택",
              sub: "두뇌 반사신경 드릴",
            },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  stopRowPlayback();
                  setActiveTab(tab.id as any);
                }}
                className={`flex flex-col items-start gap-1 rounded-2xl border p-3.5 text-left transition-all cursor-pointer ${
                  isActive
                    ? "border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/15 to-surface shadow-xs text-ink ring-1 ring-[#D4AF37]/40"
                    : "border-line bg-surface hover:bg-raised/60 text-ink-soft hover:text-ink"
                }`}
              >
                <span className="font-mono text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">
                  {tab.step}
                </span>
                <span className="text-[13.5px] font-bold leading-snug">
                  {tab.label}
                </span>
                <span className="text-[11px] text-ink-faint line-clamp-1">
                  {tab.sub}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ------------------------------------------------------------------- */}
      {/* 💡 STEP 1: SOUND & CHUNK MATRIX (소리 & 청크 매트릭스) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "matrix" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Spotlight Word Detail Card */}
          {selectedWord && (
            <div className="rounded-3xl border-2 border-[#D4AF37]/35 bg-gradient-to-br from-surface via-surface to-amber-500/[0.04] p-6 shadow-sm flex flex-col gap-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col">
                    <div className="flex items-baseline gap-3">
                      <span className="font-mono text-[36px] font-black tracking-tight text-ink">
                        {selectedWord}
                      </span>
                      <span className="text-[20px] font-bold text-amber-900 dark:text-amber-200">
                        {selectedMeaning}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-ink-faint">
                      음절 수: {selectedWord.length}글자 · 표준 미국식 발음
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => playWord(selectedWord)}
                    className={`flex items-center gap-2 rounded-2xl px-5 py-3 text-[13.5px] font-bold text-white shadow-xs transition-all cursor-pointer active:scale-95 ${
                      activeWord === selectedWord
                        ? "bg-rose-600 hover:bg-rose-700"
                        : "bg-ink hover:bg-[#2a292e]"
                    }`}
                  >
                    <span>{activeWord === selectedWord ? "⏹️ 정지" : "🔊 발음 청취"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const currentCard = leitnerCards[selectedWord.toLowerCase().trim()];
                      const isCurrentlyMastered = currentCard?.box === 3;
                      const next = updateLeitnerCard(
                        leitnerCards,
                        selectedWord,
                        selectedMeaning,
                        !isCurrentlyMastered,
                      );
                      saveLeitnerCards(next);
                    }}
                    className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-[13px] font-bold border transition-all cursor-pointer ${
                      leitnerCards[selectedWord.toLowerCase().trim()]?.box === 3
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                        : "border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                    }`}
                  >
                    <span>
                      {leitnerCards[selectedWord.toLowerCase().trim()]?.box === 3
                        ? "✓ 마스터 완료"
                        : "○ 마스터 체크"}
                    </span>
                  </button>
                </div>
              </div>

              {/* Etymology Breakdown Box */}
              <div className="rounded-2xl border border-[#D4AF37]/25 bg-amber-500/[0.04] p-4 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10.5px] font-bold tracking-wider text-[#D4AF37] uppercase">
                    🧬 어원 & 파닉스 분해 (Etymology Decoding)
                  </span>
                </div>
                <p className="text-[13.5px] font-medium text-ink leading-relaxed">
                  {selectedEtymology.explanation}
                </p>
              </div>

              {/* Collocation & Chunk Box */}
              <div className="rounded-2xl border border-line bg-surface/90 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">
                    🔗 실전 연어 덩어리 (Essential Collocation Chunk)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      speakText(selectedCollocation.phrase, {
                        lang: "en",
                        rate: speed,
                      })
                    }
                    className="text-[11.5px] font-semibold text-[#D4AF37] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>청취 🔊</span>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[15px] font-bold text-ink">
                      "{selectedCollocation.phrase}"
                    </span>
                    <span className="text-[13px] text-ink-soft">
                      ➔ {selectedCollocation.translation}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-ink-faint italic">
                    "{selectedCollocation.exampleSentence}" ({selectedCollocation.sentenceTranslation})
                  </p>
                </div>
              </div>

              {/* Next Step CTA */}
              <div className="flex items-center justify-end pt-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("recall")}
                  className="inline-flex items-center gap-2 text-[13px] font-bold text-[#D4AF37] hover:underline cursor-pointer"
                >
                  <span>이 단어로 Step 2 액티브 인출 퀴즈 풀기</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          )}

          {/* Cluster Selector Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-ink-faint">
                클러스터 선택 (6단어 단위):
              </span>
              {rows.map((_, rIdx) => (
                <button
                  key={rIdx}
                  type="button"
                  onClick={() => {
                    setClusterIdx(rIdx);
                    setShowAllClusters(false);
                    const first = rows[rIdx]?.[0];
                    if (first) setSelectedWord(first);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-[12px] font-bold transition-all cursor-pointer ${
                    !showAllClusters && clusterIdx === rIdx
                      ? "bg-ink text-surface shadow-xs scale-105"
                      : "border border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                  }`}
                >
                  Cluster #{rIdx + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowAllClusters(!showAllClusters)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                  showAllClusters
                    ? "bg-amber-600 text-white shadow-xs"
                    : "border border-line bg-surface text-ink-soft hover:text-ink"
                }`}
              >
                {showAllClusters ? "전체 펼쳐보기 닫기" : "전체 36단어 펼쳐보기"}
              </button>
            </div>
          </div>

          {/* Matrix Word Grid Display */}
          <div className="flex flex-col gap-4">
            {(showAllClusters ? rows : [rows[clusterIdx] || []]).map(
              (row, rIdxActual) => {
                const rIdx = showAllClusters ? rIdxActual : clusterIdx;
                const validWords = (row || []).filter(Boolean);
                if (validWords.length === 0) return null;
                const isRowActive = activeRowIdx === rIdx;

                return (
                  <div
                    key={rIdx}
                    className="rounded-3xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-3"
                  >
                    <div className="flex items-center justify-between border-b border-line/60 pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                          Word Cluster #{rIdx + 1}
                        </span>
                        <span className="font-mono text-[11px] text-ink-faint">
                          ({validWords.length}단어)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => playRow(rIdx)}
                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[12px] font-bold cursor-pointer transition-all ${
                          isRowActive
                            ? "bg-rose-500 text-white shadow-xs"
                            : "border border-line bg-surface text-ink-soft hover:text-ink hover:bg-raised"
                        }`}
                      >
                        {isRowActive ? (
                          <>
                            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
                            <span>⏹ 이 행 재생 중지</span>
                          </>
                        ) : (
                          <>
                            <span>▶ 이 행 6단어 연속 청취</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {validWords.map((w, cIdx) => {
                        const isSelected = selectedWord === w;
                        const isSpeaking = activeWord === w;
                        const clean = w.toLowerCase().trim();
                        const card = leitnerCards[clean];
                        const isMastered = card?.box === 3;
                        const meaning = getMeaning(w);

                        return (
                          <div
                            key={cIdx}
                            onClick={() => {
                              setSelectedWord(w);
                              playWord(w);
                            }}
                            className={`group relative flex flex-col justify-between rounded-2xl border p-3.5 transition-all cursor-pointer text-center min-h-[96px] select-none ${
                              isSpeaking
                                ? "border-[#D4AF37] bg-[#D4AF37] text-white scale-105 shadow-lg z-10"
                                : isSelected
                                ? "border-[#D4AF37] bg-[#D4AF37]/10 text-ink ring-2 ring-[#D4AF37]/50 shadow-xs"
                                : isMastered
                                ? "border-emerald-500/40 bg-emerald-500/[0.04] text-ink hover:border-emerald-500 hover:bg-emerald-500/[0.08]"
                                : "border-line bg-surface text-ink hover:border-line-strong hover:bg-raised/50"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span
                                className={`h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold transition-all ${
                                  isMastered
                                    ? "bg-emerald-600 text-white"
                                    : "border border-ink-faint/40 text-transparent"
                                }`}
                              >
                                ✓
                              </span>
                              <span
                                className={`font-mono text-[10px] ${
                                  isSpeaking ? "text-white/90" : "text-ink-faint"
                                }`}
                              >
                                🔊
                              </span>
                            </div>

                            <span className="font-mono text-[16px] font-bold tracking-tight my-1">
                              {w}
                            </span>

                            <span
                              className={`text-[11.5px] font-semibold line-clamp-1 ${
                                isSpeaking
                                  ? "text-white"
                                  : isSelected
                                  ? "text-amber-900 dark:text-amber-200 font-bold"
                                  : isMastered
                                  ? "text-emerald-800 dark:text-emerald-300"
                                  : "text-ink-soft group-hover:text-ink"
                              }`}
                            >
                              {meaning}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ⚡ STEP 2: ACTIVE FLASH RECALL (능동적 인출 4지선다) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "recall" && activeRecallQuizzes.length > 0 && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {(() => {
            const q = activeRecallQuizzes[recallIdx];
            if (!q) return null;

            return (
              <div className="rounded-3xl border-2 border-line bg-surface p-6 sm:p-8 shadow-sm flex flex-col gap-6 max-w-2xl mx-auto w-full">
                {/* Quiz Header & Streak */}
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-[#D4AF37] uppercase tracking-wider">
                      Question #{recallIdx + 1} / {activeRecallQuizzes.length}
                    </span>
                    {recallStreak >= 2 && (
                      <span className="rounded-full bg-orange-500/10 px-2.5 py-0.5 text-[11px] font-extrabold text-orange-600 border border-orange-500/30 animate-pulse">
                        🔥 {recallStreak} Streak!
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[13px] font-bold text-ink">
                    Score: {recallScore} pts
                  </span>
                </div>

                {/* Prompt Card */}
                <div className="rounded-2xl border border-line bg-raised/60 p-6 flex flex-col items-center text-center gap-3">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">
                    {q.questionType === "en-to-ko"
                      ? "영단어 ➔ 올바른 한국어 뜻 인출"
                      : "한국어 뜻 ➔ 올바른 영단어 인출"}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[32px] sm:text-[38px] font-black text-ink">
                      {q.questionType === "en-to-ko" ? q.word : q.correctMeaning}
                    </span>
                    {q.questionType === "en-to-ko" && (
                      <button
                        type="button"
                        onClick={() => playWord(q.word)}
                        className="rounded-full border border-line p-2 text-ink hover:bg-raised cursor-pointer shadow-2xs"
                        title="발음 청취"
                      >
                        🔊
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-ink-soft">{q.questionPrompt}</p>
                </div>

                {/* 4 Choices */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = selectedRecallAnswer === oIdx;
                    const isCorrect = oIdx === q.correctIndex;

                    let btnStyle =
                      "border-line bg-surface hover:border-[#D4AF37] hover:bg-raised text-ink";

                    if (isRecallAnswered) {
                      if (isCorrect) {
                        btnStyle =
                          "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-200 font-bold ring-2 ring-emerald-500/40";
                      } else if (isSelected) {
                        btnStyle =
                          "border-rose-500 bg-rose-500/15 text-rose-900 dark:text-rose-200 font-bold ring-2 ring-rose-500/40";
                      } else {
                        btnStyle = "border-line bg-surface text-ink-faint opacity-50";
                      }
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        disabled={isRecallAnswered}
                        onClick={() => handleAnswerRecall(oIdx)}
                        className={`flex items-center justify-between rounded-2xl border p-4 text-left transition-all cursor-pointer active:scale-98 ${btnStyle}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-[12px] font-bold text-ink-faint">
                            {["A", "B", "C", "D"][oIdx]}.
                          </span>
                          <span className="text-[15px] font-medium">{opt}</span>
                        </div>
                        {isRecallAnswered && (
                          <span className="text-[14px]">
                            {isCorrect ? "✓" : isSelected ? "✗" : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Post-Answer Feedback & Etymology Explanation */}
                {isRecallAnswered && (
                  <div className="rounded-2xl border border-line bg-raised/40 p-4 flex flex-col gap-3 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[#D4AF37]">
                        💡 기억 각인 힌트 & 어원 풀이
                      </span>
                      <button
                        type="button"
                        onClick={handleNextRecall}
                        className="rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-[#2a292e] transition-all cursor-pointer"
                      >
                        다음 문제 풀기 →
                      </button>
                    </div>
                    <p className="text-[13px] font-medium text-ink leading-relaxed">
                      {q.etymologyHint}
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* 🗣️ STEP 3: AI SPEAKING & LEITNER REVIEW (발음 채점 & 망각곡선 복습) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "speaking" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* SECTION A: Voice Speaking Tester */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-col">
                <span className="font-mono text-[10.5px] font-bold tracking-wider text-[#D4AF37] uppercase">
                  Step 3 · AI Speaking & Pronunciation Tester
                </span>
                <h3 className="text-[17px] font-bold text-ink">
                  "내가 직접 발음할 수 있는 단어만 뇌에 영구 각인된다"
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] text-ink-soft">선택 단어:</span>
                <span className="font-mono text-[15px] font-bold text-ink">
                  {selectedWord}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-line">
              <VoiceSpeakingTester
                targetText={selectedWord}
                buttonLabel={`"${selectedWord}" AI 발음 정밀 테스트`}
              />
            </div>
          </div>

          {/* SECTION B: Leitner 3-Tier Spaced Repetition Box */}
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-xs flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
              <div className="flex flex-col gap-1">
                <span className="font-mono text-[10.5px] font-bold tracking-wider text-ink-faint uppercase">
                  Ebbinghaus Spaced Repetition
                </span>
                <h3 className="text-[18px] font-bold text-ink">
                  라이트너 3단계 스마트 망각곡선 단어장
                </h3>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center rounded-2xl border border-line bg-raised/70 p-1 text-[12px]">
                <button
                  type="button"
                  onClick={() => setLeitnerFilter("all")}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    leitnerFilter === "all"
                      ? "bg-surface text-ink font-bold shadow-2xs border border-line"
                      : "text-ink-soft hover:text-ink"
                  }`}
                >
                  전체 ({totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeitnerFilter(1)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    leitnerFilter === 1
                      ? "bg-rose-500 text-white font-bold shadow-2xs"
                      : "text-rose-600 hover:text-rose-700"
                  }`}
                >
                  Box 1 집중복습 ({box1Words.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeitnerFilter(2)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    leitnerFilter === 2
                      ? "bg-amber-500 text-white font-bold shadow-2xs"
                      : "text-amber-600 hover:text-amber-700"
                  }`}
                >
                  Box 2 친숙 ({box2Words.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeitnerFilter(3)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-all cursor-pointer ${
                    leitnerFilter === 3
                      ? "bg-emerald-600 text-white font-bold shadow-2xs"
                      : "text-emerald-700 hover:text-emerald-800"
                  }`}
                >
                  Box 3 마스터 ({box3Words.length})
                </button>
              </div>
            </div>

            {/* Leitner Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {displayedLeitnerCards.map((card, idx) => {
                const isSelected = selectedWord === card.word;

                let boxBadge = (
                  <span className="rounded-md bg-rose-500/10 px-2 py-0.5 text-[10.5px] font-bold text-rose-600 border border-rose-500/30">
                    Box 1 · 집중 복습
                  </span>
                );
                if (card.box === 2) {
                  boxBadge = (
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-bold text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Box 2 · 익숙해지는 중
                    </span>
                  );
                } else if (card.box === 3) {
                  boxBadge = (
                    <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                      Box 3 · 마스터 완료
                    </span>
                  );
                }

                return (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedWord(card.word);
                      playWord(card.word);
                    }}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#D4AF37] bg-amber-500/[0.04] ring-2 ring-[#D4AF37]/30 shadow-xs"
                        : "border-line bg-surface hover:bg-raised/60"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      {boxBadge}
                      <span className="font-mono text-[10.5px] text-ink-faint">
                        {card.streak}회 연속 정답
                      </span>
                    </div>

                    <div className="flex flex-col">
                      <span className="font-mono text-[18px] font-bold text-ink">
                        {card.word}
                      </span>
                      <span className="text-[13.5px] font-semibold text-ink-soft">
                        {card.meaning}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-t border-line/60 pt-2 text-[11.5px]">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playWord(card.word);
                        }}
                        className="text-ink-soft hover:text-ink font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <span>🔊 발음</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextBox = card.box === 3 ? 1 : ((card.box + 1) as 1 | 2 | 3);
                          const next = {
                            ...leitnerCards,
                            [card.word.toLowerCase().trim()]: {
                              ...card,
                              box: nextBox,
                            },
                          };
                          saveLeitnerCards(next);
                        }}
                        className="text-[#D4AF37] font-bold hover:underline cursor-pointer"
                      >
                        {card.box === 3 ? "Box 1로 내리기" : "다음 Box로 승급 ↑"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------- */}
      {/* ⏱️ STEP 4: 60-SECOND SPEED REFLEX DRILL (스피드 반사신경 드릴) */}
      {/* ------------------------------------------------------------------- */}
      {activeTab === "speed" && (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200 max-w-2xl mx-auto w-full">
          {!speedGameActive && !speedGameOver ? (
            <div className="rounded-3xl border-2 border-line bg-surface p-8 text-center flex flex-col items-center gap-5 shadow-sm">
              <div className="h-16 w-16 rounded-full bg-amber-500/10 border-2 border-[#D4AF37] flex items-center justify-center text-[28px]">
                ⏱️
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[11px] font-extrabold uppercase tracking-wider text-[#D4AF37]">
                  Step 4 · Speed Reflex Drill
                </span>
                <h3 className="text-[22px] font-bold text-ink">
                  60초 타임어택 스피드 드릴
                </h3>
                <p className="text-[13.5px] text-ink-soft max-w-md">
                  화면에 나타나는 영단어와 한국어 뜻이 일치하는지 0.5초 만에 판단하세요!
                  빠르고 정확하게 맞힐수록 콤보 보너스 점수가 폭증합니다.
                </p>
              </div>

              {speedHighScore > 0 && (
                <div className="rounded-xl bg-amber-500/10 border border-[#D4AF37]/30 px-4 py-2 font-mono text-[12px] font-bold text-amber-900 dark:text-amber-200">
                  🏆 현재 레슨 최고 점수: {speedHighScore} pts
                </div>
              )}

              <button
                type="button"
                onClick={startSpeedGame}
                className="rounded-2xl bg-ink px-8 py-3.5 text-[15px] font-bold text-white shadow-md hover:bg-[#2a292e] transition-all cursor-pointer active:scale-95"
              >
                도전 시작하기 (60초 타이머) ⚡
              </button>
            </div>
          ) : speedGameOver ? (
            <div className="rounded-3xl border-2 border-line bg-surface p-8 text-center flex flex-col items-center gap-6 shadow-sm">
              <div className="text-[36px]">🎉</div>
              <div className="flex flex-col gap-1">
                <h3 className="text-[24px] font-black text-ink">타임오버! 훈련 완료</h3>
                <p className="text-[14px] text-ink-soft">
                  뇌신경 반사 속도가 한층 더 날카로워졌습니다!
                </p>
              </div>

              <div className="grid grid-cols-3 gap-4 w-full max-w-md">
                <div className="rounded-2xl border border-line bg-raised/70 p-4 flex flex-col">
                  <span className="font-mono text-[10.5px] text-ink-faint uppercase font-bold">
                    최종 점수
                  </span>
                  <span className="font-mono text-[24px] font-black text-[#D4AF37]">
                    {speedScore}
                  </span>
                </div>
                <div className="rounded-2xl border border-line bg-raised/70 p-4 flex flex-col">
                  <span className="font-mono text-[10.5px] text-ink-faint uppercase font-bold">
                    최대 콤보
                  </span>
                  <span className="font-mono text-[24px] font-black text-orange-600">
                    {speedMaxCombo}
                  </span>
                </div>
                <div className="rounded-2xl border border-line bg-raised/70 p-4 flex flex-col">
                  <span className="font-mono text-[10.5px] text-ink-faint uppercase font-bold">
                    정답 / 오답
                  </span>
                  <span className="font-mono text-[20px] font-bold text-emerald-800 dark:text-emerald-300">
                    {speedCorrectCount} / {speedWrongCount}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={startSpeedGame}
                  className="rounded-2xl bg-ink px-6 py-3 text-[13.5px] font-bold text-white shadow-xs hover:bg-[#2a292e] transition-all cursor-pointer"
                >
                  다시 도전하기 ↺
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("speaking")}
                  className="rounded-2xl border border-line bg-surface px-5 py-3 text-[13.5px] font-semibold text-ink hover:bg-raised transition-all cursor-pointer"
                >
                  Step 3 오답노트 복습하러 가기 →
                </button>
              </div>
            </div>
          ) : (
            // Active Game Screen
            (() => {
              const cur = speedItems[speedCurIdx % speedItems.length];
              if (!cur) return null;

              return (
                <div className="rounded-3xl border-2 border-[#D4AF37]/50 bg-surface p-6 sm:p-8 shadow-md flex flex-col gap-6">
                  {/* Top Bar: Timer & Combo */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[18px] font-black text-rose-600">
                        ⏳ {speedTimeLeft}s
                      </span>
                      {speedCombo >= 2 && (
                        <span className="font-mono text-[12px] font-extrabold text-orange-600 animate-pulse">
                          🔥 {speedCombo} COMBO!
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[16px] font-bold text-ink">
                      Score: {speedScore}
                    </span>
                  </div>

                  {/* Visual Timer Progress */}
                  <div className="h-1.5 w-full rounded-full bg-line overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#D4AF37] to-rose-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${(speedTimeLeft / 60) * 100}%` }}
                    />
                  </div>

                  {/* Word Display */}
                  <div className="rounded-2xl border border-line bg-raised/80 p-8 flex flex-col items-center justify-center text-center gap-3 min-h-[160px]">
                    <span className="font-mono text-[36px] sm:text-[44px] font-black text-ink tracking-tight">
                      {cur.word}
                    </span>
                    <span className="text-[20px] sm:text-[24px] font-bold text-amber-900 dark:text-amber-200">
                      = {cur.displayedMeaning}
                    </span>
                  </div>

                  {/* Two Fast Decision Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => handleSpeedAnswer(false)}
                      className="rounded-2xl border-2 border-rose-500/40 bg-rose-500/10 py-5 text-[18px] font-black text-rose-700 dark:text-rose-300 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      ❌ 불일치 (다름)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSpeedAnswer(true)}
                      className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/10 py-5 text-[18px] font-black text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
                    >
                      ⭕ 일치 (맞음)
                    </button>
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
