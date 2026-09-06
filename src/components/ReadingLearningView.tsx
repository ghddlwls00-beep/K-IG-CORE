"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech, unlockMobileAudio } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import {
  extractPassageKeywords,
  parseSlashChunks,
  generateReadingQuiz,
  generateClozeItems,
  type KeyWord,
  type ReadingQuestion,
  type ClozeItem,
} from "@/lib/readingUtils";

interface ReadingLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
}

export function ReadingLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
}: ReadingLearningViewProps) {
  // Extract passages from main and pair blocks
  const mainInstruction = blocks.find((b) => b.type === "instruction")?.text ?? "";
  const pairInstruction = pairBlocks?.find((b) => b.type === "instruction")?.text ?? "";

  // Determine English vs Korean passage
  const mainIsEn = isEnglish(mainInstruction);
  const enPassage = mainIsEn ? mainInstruction : pairInstruction;
  const koPassage = mainIsEn ? pairInstruction : mainInstruction;

  // Aligned sentence pairs for dual & breakdown modes
  const sentencePairs = useMemo(() => {
    const enSents = splitSentences(enPassage);
    const koSents = splitSentences(koPassage);
    return alignSentences(enSents, koSents);
  }, [enPassage, koPassage]);

  // Total words calculation for WPM
  const wordCount = useMemo(() => {
    return enPassage.trim().split(/\s+/).filter(Boolean).length;
  }, [enPassage]);

  // Expected reading time in seconds at 180 WPM
  const expectedSeconds = Math.max(15, Math.round((wordCount / 180) * 60));

  // Extract keywords
  const keywords: KeyWord[] = useMemo(() => {
    return extractPassageKeywords(enPassage, 6);
  }, [enPassage]);

  // Generate syntactic chunks for each sentence
  const chunkedPairs = useMemo(() => {
    return sentencePairs.map((p) => parseSlashChunks(p.en, p.ko));
  }, [sentencePairs]);

  // Generate comprehension quiz and cloze items
  const questions: ReadingQuestion[] = useMemo(() => {
    return generateReadingQuiz(enPassage, koPassage, lessonKey);
  }, [enPassage, koPassage, lessonKey]);

  const clozeItems: ClozeItem[] = useMemo(() => {
    return generateClozeItems(sentencePairs);
  }, [sentencePairs]);

  // Current active mode (5-Step Pedagogical reading flow)
  const [activeTab, setActiveTab] = useState<"speed" | "voca" | "chunks" | "quiz" | "dual">("speed");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [showNumbers, setShowNumbers] = useState(true);

  // Active playing audio state
  const [playingSentence, setPlayingSentence] = useState<number | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // --- STEP 1: WPM Speed Reading Stopwatch State ---
  const [wpmTimerRunning, setWpmTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [measuredWpm, setMeasuredWpm] = useState<number | null>(null);
  const [bestWpm, setBestWpm] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const wpmStorageKey = `kig:reading:wpm:${lessonKey}`;

  // Restore previous best WPM
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(wpmStorageKey);
      if (raw) {
        const val = parseInt(raw, 10);
        if (!isNaN(val)) setBestWpm(val);
      }
    } catch {
      // ignore
    }
  }, [wpmStorageKey]);

  function startWpmTimer() {
    unlockMobileAudio();
    stopSpeech();
    setElapsedSeconds(0);
    setMeasuredWpm(null);
    setWpmTimerRunning(true);
  }

  function finishWpmTimer() {
    setWpmTimerRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalSeconds = Math.max(1, elapsedSeconds);
    const calculated = Math.round((wordCount / finalSeconds) * 60);
    setMeasuredWpm(calculated);

    if (!bestWpm || calculated > bestWpm) {
      setBestWpm(calculated);
      try {
        window.localStorage.setItem(wpmStorageKey, String(calculated));
      } catch {
        // ignore
      }
    }
  }

  function resetWpmTimer() {
    setWpmTimerRunning(false);
    setElapsedSeconds(0);
    setMeasuredWpm(null);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => {
    if (wpmTimerRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [wpmTimerRunning]);

  // --- STEP 2: Vocabulary Tooltip & Reveal State ---
  const [revealedVocaMeaning, setRevealedVocaMeaning] = useState<Record<string, boolean>>({});

  // --- STEP 3: Syntax Chunk Hidden State ---
  const [revealedChunks, setRevealedChunks] = useState<Record<number, boolean>>({});

  // --- STEP 4: Quiz & Cloze Answer States ---
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [clozeAnswers, setClozeAnswers] = useState<Record<number, number>>({});
  const [readingScore, setReadingScore] = useState<number | null>(null);

  // --- Dual Mode Pinned Sentence ---
  const [pinnedSentence, setPinnedSentence] = useState<number | null>(null);

  // --- Notes state ---
  const [notes, setNotes] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [restored, setRestored] = useState(false);
  const notesStorageKey = `kig:reading:notes:${lessonKey}`;

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(notesStorageKey);
      if (raw) {
        const data = JSON.parse(raw);
        setNotes(data.notes || "");
        setSavedAt(data.at || null);
      }
    } catch {
      // ignore
    }
    setRestored(true);
  }, [notesStorageKey]);

  useEffect(() => {
    if (!restored) return;
    const timer = setTimeout(() => {
      try {
        const at = new Date().toLocaleTimeString();
        window.localStorage.setItem(notesStorageKey, JSON.stringify({ notes, at }));
        setSavedAt(at);
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [notes, notesStorageKey, restored]);

  // Clean speech synthesis on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Audio trigger helpers
  function playSentenceEn(text: string, idx: number) {
    if (!text) return;
    if (playingSentence === idx) {
      stopSpeech();
      setPlayingSentence(null);
      return;
    }
    stopSpeech();
    setPlayingSentence(idx);
    speakText(text, {
      lang: "en",
      rate: 0.95,
      onEnd: () => setPlayingSentence((curr) => (curr === idx ? null : curr)),
      onError: () => setPlayingSentence((curr) => (curr === idx ? null : curr)),
    });
  }

  function playWordAudio(word: string) {
    if (!word) return;
    if (playingWord === word) {
      stopSpeech();
      setPlayingWord(null);
      return;
    }
    stopSpeech();
    setPlayingWord(word);
    speakText(word, {
      lang: "en",
      rate: 0.9,
      onEnd: () => setPlayingWord((curr) => (curr === word ? null : curr)),
      onError: () => setPlayingWord((curr) => (curr === word ? null : curr)),
    });
  }

  function handleCopyPassage(txt: string) {
    if (!txt) return;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Formatting helpers
  const fontClasses =
    fontSize === "xlarge"
      ? "text-[20px] leading-loose"
      : fontSize === "large"
      ? "text-[18px] leading-relaxed"
      : "text-[16px] leading-relaxed";

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & 5-Step Learning Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600/10 text-[14px]">
              📖
            </span>
            <span className="font-mono text-[11px] font-bold text-ink-soft uppercase tracking-wider">
              Reading 독해 마스터리 코스웨어
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-faint">
            <span>총 {wordCount}단어</span>
            <span>·</span>
            <span>{sentencePairs.length}개 핵심 문장</span>
            <span>·</span>
            <span>권장 속독 시간 약 {expectedSeconds}초</span>
          </div>
        </div>

        {/* View Options (Font Size & Number Toggle) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNumbers((prev) => !prev)}
            title="문장 번호 표시 On/Off"
            className={
              "rounded border px-2.5 py-1 font-mono text-[11px] transition-colors cursor-pointer " +
              (showNumbers
                ? "border-ink/50 bg-raised font-semibold text-ink"
                : "border-line bg-surface text-ink-faint hover:text-ink")
            }
          >
            # 번호 {showNumbers ? "ON" : "OFF"}
          </button>

          <div className="flex items-center rounded border border-line bg-surface text-[11px] font-mono text-ink-soft">
            <button
              type="button"
              onClick={() => setFontSize("normal")}
              className={`px-2 py-1 transition-colors cursor-pointer ${fontSize === "normal" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              보통
            </button>
            <button
              type="button"
              onClick={() => setFontSize("large")}
              className={`border-x border-line px-2 py-1 transition-colors cursor-pointer ${fontSize === "large" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              크게
            </button>
            <button
              type="button"
              onClick={() => setFontSize("xlarge")}
              className={`px-2 py-1 transition-colors cursor-pointer ${fontSize === "xlarge" ? "bg-raised font-bold text-ink" : "hover:text-ink"}`}
            >
              특대
            </button>
          </div>
        </div>
      </div>

      {/* 2. Step Selector Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-line bg-surface p-1.5 shadow-2xs">
        <button
          type="button"
          onClick={() => setActiveTab("speed")}
          className={
            "rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer " +
            (activeTab === "speed"
              ? "bg-ink text-surface font-semibold shadow-xs"
              : "text-ink-soft hover:bg-raised hover:text-ink")
          }
        >
          Step 1 · ⏱️ 속독 챌린지 (WPM)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("voca")}
          className={
            "rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer " +
            (activeTab === "voca"
              ? "bg-ink text-surface font-semibold shadow-xs"
              : "text-ink-soft hover:bg-raised hover:text-ink")
          }
        >
          Step 2 · 📚 핵심 어휘 ({keywords.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("chunks")}
          className={
            "rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer " +
            (activeTab === "chunks"
              ? "bg-ink text-surface font-semibold shadow-xs"
              : "text-ink-soft hover:bg-raised hover:text-ink")
          }
        >
          Step 3 · 🧩 슬래시 직독직해
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("quiz")}
          className={
            "rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer " +
            (activeTab === "quiz"
              ? "bg-ink text-surface font-semibold shadow-xs"
              : "text-ink-soft hover:bg-raised hover:text-ink")
          }
        >
          Step 4 · 📝 독해력 퀴즈 & 클로즈
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dual")}
          className={
            "rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer " +
            (activeTab === "dual"
              ? "bg-ink text-surface font-semibold shadow-xs"
              : "text-ink-soft hover:bg-raised hover:text-ink")
          }
        >
          Step 5 · ⚖️ 원문/완역 대조
        </button>
      </div>

      {/* ========================================================================= */}
      {/* STEP 1: ⏱️ 실전 속독 챌린지 (WPM Speed Reading Stopwatch) */}
      {/* ========================================================================= */}
      {activeTab === "speed" && (
        <section aria-label="Speed Reading" className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Stopwatch & Metrics Banner */}
          <div className="rounded-2xl border border-line bg-gradient-to-br from-surface via-raised/30 to-surface p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex flex-col gap-1.5">
              <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">
                하버드 속독식 페이싱 훈련 (Evelyn Wood WPM System)
              </span>
              <h2 className="text-[17px] font-bold text-ink">
                한국어 번역을 멈추고 영어 어순대로 눈을 빠르게 굴려 읽어보세요.
              </h2>
              <p className="text-[13px] text-ink-soft">
                글을 읽기 시작할 때 [속독 시작]을 누르고, 마지막 마침표를 읽는 순간 [완독 완료]를 눌러 WPM을 측정하세요.
              </p>
            </div>

            {/* Interactive Stopwatch Controller */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-line bg-surface px-4 py-2 text-center shadow-2xs">
                <span className="block font-mono text-[10.5px] font-semibold text-ink-faint uppercase">경과 시간</span>
                <span className="font-mono text-[20px] font-bold text-ink tabular-nums">
                  {Math.floor(elapsedSeconds / 60)
                    .toString()
                    .padStart(2, "0")}
                  :{(elapsedSeconds % 60).toString().padStart(2, "0")}
                </span>
              </div>

              {!wpmTimerRunning ? (
                <button
                  type="button"
                  onClick={startWpmTimer}
                  className="rounded-xl bg-ink px-5 py-3 text-[13.5px] font-bold text-surface shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>⏱️</span>
                  <span>{elapsedSeconds > 0 ? "다시 측정 시작" : "속독 측정 시작"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={finishWpmTimer}
                  className="rounded-xl bg-emerald-600 px-5 py-3 text-[13.5px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer flex items-center gap-2 animate-pulse"
                >
                  <span>✓</span>
                  <span>완독 완료! (속도 측정)</span>
                </button>
              )}

              {elapsedSeconds > 0 && !wpmTimerRunning && (
                <button
                  type="button"
                  onClick={resetWpmTimer}
                  className="rounded-xl border border-line bg-surface px-3 py-3 text-[12.5px] font-medium text-ink-soft hover:bg-raised transition-colors cursor-pointer"
                  title="타이머 초기화"
                >
                  ↺
                </button>
              )}
            </div>
          </div>

          {/* WPM Measurement Result Card */}
          {measuredWpm !== null && (
            <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 p-5 shadow-xs flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center gap-3.5">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-[22px] text-white shadow-xs font-bold">
                  ⚡
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[22px] font-extrabold text-emerald-950 dark:text-emerald-200 tabular-nums">
                      {measuredWpm} WPM
                    </span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-mono text-[11px] font-bold text-white uppercase">
                      {measuredWpm >= 200
                        ? "🚀 원어민 최상위 속독 수준"
                        : measuredWpm >= 160
                        ? "⚡ 권장 속도 완벽 마스터"
                        : measuredWpm >= 120
                        ? "📖 양호한 독해 속도"
                        : "💡 직독직해 집중 훈련 권장"}
                    </span>
                  </div>
                  <p className="text-[12.5px] text-emerald-900 dark:text-emerald-300 mt-0.5">
                    {wordCount}개 단어를 {elapsedSeconds}초 만에 완독하셨습니다. (내 최고 기록: {bestWpm} WPM)
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab("quiz")}
                className="rounded-xl bg-emerald-800 dark:bg-emerald-700 px-4 py-2.5 text-[12.5px] font-bold text-white shadow-xs hover:opacity-90 transition-all cursor-pointer"
              >
                독해 이해도 퀴즈 풀기 ➔
              </button>
            </div>
          )}

          {/* Passage Reading Board */}
          <div className="rounded-2xl border border-line bg-surface p-6 sm:p-8 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-3">
              <div className="flex items-center gap-2">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                  English Passage
                </span>
                <span className="text-[12px] text-ink-faint">
                  단락 내 문장을 터치하면 즉시 원어민 발음이 재생됩니다
                </span>
              </div>

              <button
                type="button"
                onClick={() => handleCopyPassage(enPassage)}
                className="rounded border border-line bg-raised px-2.5 py-1 font-mono text-[11px] text-ink-soft hover:text-ink transition-colors cursor-pointer"
              >
                {copied ? "✓ 복사 완료" : "지문 전체 복사"}
              </button>
            </div>

            {/* Seamless Paragraph Reading */}
            <div className={`${fontClasses} font-serif tracking-normal text-ink text-justify select-none`}>
              {sentencePairs.map((pair, idx) => {
                const isPlaying = playingSentence === idx;

                return (
                  <span
                    key={idx}
                    onClick={() => playSentenceEn(pair.en, idx)}
                    className={
                      "inline cursor-pointer rounded px-1.5 py-0.5 transition-all duration-150 " +
                      (isPlaying
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold ring-2 ring-red-500/30"
                        : "hover:bg-raised hover:text-primary")
                    }
                    title="터치하여 발음 청취"
                  >
                    {showNumbers && (
                      <sup className="mr-1 select-none font-mono text-[10px] font-bold opacity-60">
                        [{idx + 1}]
                      </sup>
                    )}
                    <span>{pair.en}</span>{" "}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: 📚 지문 핵심 어휘 (Key Vocabulary Builder) */}
      {/* ========================================================================= */}
      {activeTab === "voca" && (
        <section aria-label="Key Vocabulary" className="flex flex-col gap-6 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-ink flex items-center gap-2">
                <span>📚</span> 지문 필수 핵심 어휘 (Lexical Builder)
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                본문에 등장한 핵심 단어의 발음과 의미를 먼저 파악하고, 단어 카드를 클릭하여 암기 상태를 확인하세요.
              </p>
            </div>
            <span className="rounded bg-raised px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-ink-soft border border-line">
              총 {keywords.length}개 핵심 어휘
            </span>
          </div>

          {/* Vocabulary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {keywords.map((kw, i) => {
              const isPlaying = playingWord === kw.word;
              const isRevealed = revealedVocaMeaning[kw.word] === true;

              return (
                <div
                  key={i}
                  onClick={() => playWordAudio(kw.word)}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-2xs hover:border-line-strong hover:shadow-xs transition-all cursor-pointer flex flex-col justify-between gap-3 group select-none"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        {kw.pos}
                      </span>
                      <span className="text-[17px] font-bold text-ink group-hover:text-primary transition-colors">
                        {kw.word}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        playWordAudio(kw.word);
                      }}
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-all cursor-pointer ${
                        isPlaying
                          ? "bg-red-500 text-white"
                          : "bg-raised text-ink-soft hover:bg-ink hover:text-white"
                      }`}
                      title="발음 듣기"
                    >
                      <span className="text-[12px]">{isPlaying ? "⏹️" : "🔊"}</span>
                    </button>
                  </div>

                  <div className="border-t border-line/60 pt-2 flex items-center justify-between">
                    {isRevealed ? (
                      <span className="text-[13.5px] font-medium text-ink animate-in fade-in">
                        {kw.meaning}
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedVocaMeaning((prev) => ({ ...prev, [kw.word]: true }));
                        }}
                        className="text-[12px] text-ink-faint hover:text-ink cursor-pointer underline decoration-dotted"
                      >
                        💡 뜻 확인하기
                      </button>
                    )}
                    <span className="text-[10.5px] font-mono text-ink-faint">#0{i + 1}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: 🧩 슬래시 직독직해 구문 훈련 (Slash-Chunking Syntax Drill) */}
      {/* ========================================================================= */}
      {activeTab === "chunks" && (
        <section aria-label="Slash Chunking" className="flex flex-col gap-4 animate-in fade-in duration-200">
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-ink flex items-center gap-2">
                <span>🧩</span> 슬래시(/) 직독직해 어순 훈련 (Phrase-cued Chunking)
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                문장을 의미 단위(주어+동사 / 목적어 / 전치사구 / 절)로 끊어 읽으며 한국어 번역 없이 순서대로 이해하세요.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const all: Record<number, boolean> = {};
                sentencePairs.forEach((_, idx) => {
                  all[idx] = true;
                });
                setRevealedChunks(all);
              }}
              className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-surface cursor-pointer"
            >
              전체 직독직해 열기
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            {chunkedPairs.map((cp, idx) => {
              const isPlaying = playingSentence === idx;
              const isRevealed = revealedChunks[idx] === true;
              const orig = sentencePairs[idx];

              return (
                <div
                  key={idx}
                  onClick={() => playSentenceEn(orig.en, idx)}
                  className={
                    "rounded-2xl border p-5 transition-all shadow-2xs cursor-pointer select-none " +
                    (isPlaying
                      ? "border-primary bg-primary/[0.04] ring-2 ring-primary/30 shadow-xs"
                      : "border-line bg-surface hover:border-line-strong hover:bg-raised/20")
                  }
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-bold text-surface">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-[11px] font-bold text-ink-faint uppercase">
                        Chunk #{idx + 1}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          playSentenceEn(orig.en, idx);
                        }}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 min-h-[34px] text-[12px] font-semibold transition-all cursor-pointer ${
                          isPlaying
                            ? "border-red-500 bg-red-600 text-white shadow-xs"
                            : "border-line bg-surface text-ink-soft hover:bg-raised active:scale-95"
                        }`}
                      >
                        <span>{isPlaying ? "⏹️" : "🔊"}</span>
                        <span>{isPlaying ? "정지" : "문장 듣기"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRevealedChunks((prev) => ({ ...prev, [idx]: !prev[idx] }));
                        }}
                        className="rounded-lg border border-line bg-raised px-3 py-1.5 min-h-[34px] text-[12px] font-medium text-ink-soft hover:text-ink cursor-pointer"
                      >
                        {isRevealed ? "해석 닫기" : "직독직해 확인"}
                      </button>
                    </div>
                  </div>

                  {/* Slashed English Chunks */}
                  <div className="text-[17px] font-serif leading-relaxed text-ink flex flex-wrap items-center gap-x-2 gap-y-1">
                    {cp.enChunks.map((chunk, cIdx) => (
                      <span key={cIdx} className="inline-flex items-center gap-2">
                        <span className="font-medium text-ink">{chunk}</span>
                        {cIdx < cp.enChunks.length - 1 && (
                          <span className="text-emerald-700 dark:text-emerald-400 font-bold font-mono">/</span>
                        )}
                      </span>
                    ))}
                  </div>

                  {/* Slashed Korean Literal Interpretation */}
                  {isRevealed && (
                    <div className="mt-3.5 border-t border-line/60 pt-3 text-[14px] leading-relaxed text-ink-soft flex flex-wrap items-center gap-x-2 gap-y-1 animate-in fade-in">
                      {cp.koChunks.map((chunk, cIdx) => (
                        <span key={cIdx} className="inline-flex items-center gap-2">
                          <span>{chunk}</span>
                          {cIdx < cp.koChunks.length - 1 && (
                            <span className="text-emerald-700/60 font-mono font-semibold">/</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: 📝 독해력 실전 퀴즈 & 클로즈 (Comprehension Check & Cloze Drill) */}
      {/* ========================================================================= */}
      {activeTab === "quiz" && (
        <section aria-label="Reading Quizzes" className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Header Banner */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[16px] font-bold text-ink flex items-center gap-2">
                <span>📝</span> 독해력 실전 인출 테스트 (Retrieval Practice)
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">
                눈으로만 읽는 독해는 기억에 남지 않습니다. 문제를 풀며 지문의 주제와 세부 내용을 능동적으로 회상하세요.
              </p>
            </div>
            <span className="rounded bg-primary/10 px-2.5 py-0.5 font-mono text-[11.5px] font-bold text-primary border border-primary/20">
              뇌인지과학 인출 훈련
            </span>
          </div>

          {/* Part 1: Multiple Choice Comprehension Questions */}
          <div className="flex flex-col gap-4">
            {questions.map((q) => {
              const selectedIdx = userAnswers[q.id];
              const isAnswered = selectedIdx !== undefined;
              const isCorrect = selectedIdx === q.answerIndex;

              return (
                <div key={q.id} className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-bold text-ink leading-snug">{q.question}</h3>
                    {isAnswered && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${
                          isCorrect
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                            : "bg-red-500/15 text-red-700 dark:text-red-300 border border-red-500/30"
                        }`}
                      >
                        {isCorrect ? "✓ 정답입니다!" : "✕ 오답입니다"}
                      </span>
                    )}
                  </div>

                  {/* Options */}
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt, oIdx) => {
                      const isChosen = selectedIdx === oIdx;
                      const isRightOption = oIdx === q.answerIndex;

                      let btnStyle = "border-line bg-surface text-ink hover:bg-raised";
                      if (isAnswered) {
                        if (isRightOption) {
                          btnStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-200 font-bold ring-1 ring-emerald-500/40";
                        } else if (isChosen && !isRightOption) {
                          btnStyle = "border-red-500 bg-red-500/10 text-red-900 dark:text-red-200 line-through";
                        } else {
                          btnStyle = "border-line/60 opacity-60 text-ink-soft";
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => {
                            if (!isAnswered) {
                              setUserAnswers((prev) => ({ ...prev, [q.id]: oIdx }));
                            }
                          }}
                          disabled={isAnswered}
                          className={`flex items-center gap-3 rounded-xl border p-3.5 text-left text-[13.5px] transition-all cursor-pointer ${btnStyle}`}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-current font-mono text-[11px] font-bold">
                            {oIdx + 1}
                          </span>
                          <span className="flex-1">{opt}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Explanation after answering */}
                  {isAnswered && (
                    <div className="rounded-xl border border-line/80 bg-raised/40 p-4 text-[13px] text-ink-soft leading-relaxed animate-in fade-in">
                      <span className="font-bold text-ink mr-2">💡 해설:</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Part 2: Cloze Keyword Fill-in Drills */}
          {clozeItems.length > 0 && (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-line/60 pb-3">
                <div>
                  <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
                    <span>🔤</span> 핵심 키워드 클로즈(Cloze) 빈칸 완성
                  </h3>
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    지문의 문맥을 보고 빈칸에 들어갈 가장 알맞은 어휘를 고르세요.
                  </p>
                </div>
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-medium text-ink-soft">
                  {clozeItems.length}문항
                </span>
              </div>

              <div className="flex flex-col gap-4">
                {clozeItems.map((ci) => {
                  const selectedIdx = clozeAnswers[ci.id];
                  const isAnswered = selectedIdx !== undefined;
                  const isCorrect = selectedIdx === ci.answerIndex;

                  return (
                    <div key={ci.id} className="rounded-xl border border-line/70 bg-raised/20 p-4 flex flex-col gap-3">
                      <p className="text-[15.5px] font-serif leading-relaxed text-ink">
                        {ci.maskedSentence}
                      </p>

                      <div className="flex flex-wrap items-center gap-2">
                        {ci.options.map((opt, oIdx) => {
                          const isChosen = selectedIdx === oIdx;
                          const isRight = oIdx === ci.answerIndex;

                          let btnClass = "border-line bg-surface text-ink hover:bg-raised";
                          if (isAnswered) {
                            if (isRight) {
                              btnClass = "border-emerald-500 bg-emerald-500/15 text-emerald-900 dark:text-emerald-300 font-bold";
                            } else if (isChosen) {
                              btnClass = "border-red-500 bg-red-500/15 text-red-900 dark:text-red-300 line-through";
                            } else {
                              btnClass = "border-line/60 opacity-50";
                            }
                          }

                          return (
                            <button
                              key={oIdx}
                              type="button"
                              onClick={() => {
                                if (!isAnswered) {
                                  setClozeAnswers((prev) => ({ ...prev, [ci.id]: oIdx }));
                                }
                              }}
                              disabled={isAnswered}
                              className={`rounded-lg border px-3 py-1.5 font-mono text-[12.5px] transition-all cursor-pointer ${btnClass}`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {isAnswered && (
                        <div className="text-[12px] font-mono text-ink-soft pt-1">
                          {isCorrect ? "✓ 정답입니다!" : `❌ 정답은 '${ci.missingWord}' 입니다.`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Part 3: Voice Speaking Test */}
          {sentencePairs[0] && (
            <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-3">
              <div>
                <h3 className="text-[15px] font-bold text-ink flex items-center gap-2">
                  <span>🎙️</span> 지문 대표 문장 낭독 & 발음 채점
                </h3>
                <p className="mt-0.5 text-[12px] text-ink-soft">
                  직접 소리 내어 지문의 핵심 문장을 읽고 AI 발음 점수를 확인해보세요.
                </p>
              </div>

              <div className="rounded-xl border border-line/60 bg-raised/30 p-3.5 text-[15px] font-serif text-ink">
                {sentencePairs[0].en}
              </div>

              <VoiceSpeakingTester
                targetText={sentencePairs[0].en}
                buttonLabel="🎙️ 마이크 켜고 소리 내어 읽기"
                onSuccess={(transcript, score) => {
                  setReadingScore(score);
                }}
              />
            </div>
          )}
        </section>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: ⚖️ 원문 vs 완역 좌우 대조 (Dual Passage Review) */}
      {/* ========================================================================= */}
      {activeTab === "dual" && (
        <section aria-label="Side-by-Side Dual Reading" className="grid grid-cols-1 gap-6 lg:grid-cols-2 animate-in fade-in duration-200">
          {/* Left Column: English Passage */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider border border-line">
                English Passage (영어 원문)
              </span>
              <span className="font-mono text-[11px] text-ink-faint">클릭하여 발음 듣기</span>
            </div>

            <div className={`${fontClasses} font-serif text-ink leading-loose text-justify select-none`}>
              {sentencePairs.map((pair, idx) => {
                const isSelected = pinnedSentence === idx;
                const isPlaying = playingSentence === idx;

                return (
                  <span
                    key={idx}
                    onClick={() => {
                      setPinnedSentence((prev) => (prev === idx ? null : idx));
                      playSentenceEn(pair.en, idx);
                    }}
                    className={
                      "inline cursor-pointer rounded px-1.5 py-0.5 transition-all duration-150 " +
                      (isSelected || isPlaying
                        ? "bg-ink text-surface font-semibold shadow-xs ring-2 ring-ink/20"
                        : "hover:bg-raised hover:text-ink")
                    }
                  >
                    {showNumbers && (
                      <sup className={`mr-1 select-none font-mono text-[10px] font-bold ${isSelected || isPlaying ? "text-surface/80" : "opacity-75"}`}>
                        [{idx + 1}]
                      </sup>
                    )}
                    <span>{pair.en}</span>{" "}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Right Column: Korean Passage */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs">
            <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
              <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                Korean Interpretation (한글 완역)
              </span>
              <span className="font-mono text-[11px] text-ink-faint">1:1 일치 단락</span>
            </div>

            <div className={`${fontClasses} text-ink/90 leading-loose text-justify select-none`}>
              {sentencePairs.map((pair, idx) => {
                const isSelected = pinnedSentence === idx;
                const isPlaying = playingSentence === idx;

                return (
                  <span
                    key={idx}
                    onClick={() => {
                      setPinnedSentence((prev) => (prev === idx ? null : idx));
                    }}
                    className={
                      "inline cursor-pointer rounded px-1.5 py-0.5 transition-all duration-150 " +
                      (isSelected || isPlaying
                        ? "bg-ink text-surface font-semibold shadow-xs ring-2 ring-ink/20"
                        : "hover:bg-raised hover:text-ink")
                    }
                  >
                    {showNumbers && (
                      <sup className={`mr-1 select-none font-mono text-[10px] font-bold ${isSelected || isPlaying ? "text-surface/80" : "opacity-75"}`}>
                        [{idx + 1}]
                      </sup>
                    )}
                    <span>{pair.ko}</span>{" "}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* 6. Reading Notes & Summary Notepad */}
      <section aria-label="Reading Notes" className="rounded-xl border border-line bg-surface p-5 shadow-xs">
        <div className="mb-3.5 flex items-center justify-between border-b border-line/70 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-semibold uppercase text-ink tracking-wider">
              📝 독해 핵심 메모 & 어휘 노트 (Reading Notepad)
            </span>
            {savedAt && (
              <span className="font-mono text-[10.5px] text-ink-faint">
                자동 저장됨 ({savedAt})
              </span>
            )}
          </div>

          <span className="font-mono text-[11px] text-ink-faint">
            {notes.length}자
          </span>
        </div>

        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="지문의 핵심 주제문, 새로 배운 단어, 문법 포인트 등을 자유롭게 메모하세요... (실시간 자동 저장)"
          className="w-full rounded-lg border border-line/80 bg-raised/20 p-3.5 text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
        />
      </section>
    </div>
  );
}

// Helpers
function isEnglish(text: string): boolean {
  if (!text) return false;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin >= hangul && latin > 0;
}

function cleanSentenceText(text: string): string {
  if (!text) return "";
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  return text
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanSentenceText(s))
    .filter((s) => s.length > 0);
}

function alignSentences(enSents: string[], koSents: string[]) {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: "", ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: "" }));

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  const result: { en: string; ko: string }[] = [];
  if (enSents.length < koSents.length) {
    const numBuckets = enSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    koSents.forEach((k, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / koSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(k);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: enSents[i], ko: buckets[i].join(" ") });
    }
  } else {
    const numBuckets = koSents.length;
    const buckets: string[][] = Array.from({ length: numBuckets }, () => []);
    enSents.forEach((e, idx) => {
      const bucketIdx = Math.min(Math.floor((idx / enSents.length) * numBuckets), numBuckets - 1);
      buckets[bucketIdx].push(e);
    });
    for (let i = 0; i < numBuckets; i++) {
      result.push({ en: buckets[i].join(" "), ko: koSents[i] });
    }
  }
  return result;
}
