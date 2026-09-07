"use client";

import { useEffect, useMemo, useState, useRef, memo, useCallback } from "react";
import type { Block, ReadingSentence, ReadingVocabularyItem } from "@/lib/types";
import { speakText, stopSpeech, unlockMobileAudio } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import {
  extractPassageKeywords,
  extractFullReadingPassage,
  generateReadingQuiz,
  generateClozeItems,
  getReadingSentencesForLesson,
  getReadingVocabularyForLesson,
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
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
  readingSentences?: ReadingSentence[] | null;
  readingVocabulary?: ReadingVocabularyItem[] | null;
}

// ---------------------------------------------------------------------------
// Isolated Micro-Component: WPM Stopwatch Bar
// Encapsulates 1-second interval ticks so the 1,300-line reading view never re-renders
// ---------------------------------------------------------------------------
const WpmStopwatchBar = memo(function WpmStopwatchBar({
  wordCount,
  bestWpm,
  wpmStorageKey,
  onFinish,
  onReset,
}: {
  wordCount: number;
  bestWpm: number | null;
  wpmStorageKey: string;
  onFinish: (wpm: number, seconds: number) => void;
  onReset: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [running]);

  function start() {
    unlockMobileAudio();
    stopSpeech();
    setElapsed(0);
    setRunning(true);
  }

  function finish() {
    setRunning(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalSeconds = Math.max(1, elapsed);
    const calculated = Math.round((wordCount / finalSeconds) * 60);
    if (!bestWpm || calculated > bestWpm) {
      try {
        window.localStorage.setItem(wpmStorageKey, String(calculated));
      } catch {
        // ignore
      }
    }
    onFinish(calculated, finalSeconds);
  }

  function reset() {
    setRunning(false);
    setElapsed(0);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onReset();
  }

  return (
    <div className="rounded-2xl border border-line bg-gradient-to-br from-surface via-raised/30 to-surface p-4 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
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

      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-line bg-surface px-4 py-2 text-center shadow-2xs">
          <span className="block font-mono text-[10.5px] font-semibold text-ink-faint uppercase">경과 시간</span>
          <span className="font-mono text-[20px] font-bold text-ink tabular-nums">
            {Math.floor(elapsed / 60)
              .toString()
              .padStart(2, "0")}
            :{(elapsed % 60).toString().padStart(2, "0")}
          </span>
        </div>

        {!running ? (
          <button
            type="button"
            onClick={start}
            className="rounded-xl bg-ink px-5 py-3 text-[13.5px] font-bold text-surface shadow-xs hover:opacity-90 active:scale-95 transition-all cursor-pointer flex items-center gap-2"
          >
            <span>⏱️</span>
            <span>{elapsed > 0 ? "다시 측정 시작" : "속독 측정 시작"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={finish}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-[13.5px] font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer flex items-center gap-2 animate-pulse"
          >
            <span>✓</span>
            <span>완독 완료! (속도 측정)</span>
          </button>
        )}

        {elapsed > 0 && !running && (
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-line bg-surface px-3 py-3 text-[12.5px] font-medium text-ink-soft hover:bg-raised transition-colors cursor-pointer"
            title="타이머 초기화"
          >
            ↺
          </button>
        )}
      </div>
    </div>
  );
});

export function ReadingLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
  vocaDictionary = null,
  readingSentences = null,
  readingVocabulary = null,
}: ReadingLearningViewProps) {
  // Extract full passages from main and pair blocks (supporting multi-paragraph & section labels like (A), (B), (C))
  const mainText = extractFullReadingPassage(blocks);
  const pairText = extractFullReadingPassage(pairBlocks);

  // Determine English vs Korean fallback passages
  const mainIsEn = isEnglish(mainText);
  const enPassageFallback = mainIsEn ? mainText : pairText;
  const koPassageFallback = mainIsEn ? pairText : mainText;

  // 1:1 Aligned sentence pairs from canonical data layer
  const sentencePairs = useMemo(() => {
    if (readingSentences && readingSentences.length > 0) {
      return readingSentences.map((s, idx) => ({
        id: s.id,
        index: idx,
        en: s.english,
        ko: s.korean,
      }));
    }
    const fromDict = getReadingSentencesForLesson(lessonKey);
    if (fromDict && fromDict.length > 0) {
      return fromDict.map((s, idx) => ({
        id: s.id,
        index: idx,
        en: s.english,
        ko: s.korean,
      }));
    }
    const enSents = splitSentences(enPassageFallback);
    const koSents = splitSentences(koPassageFallback);
    return alignSentences(enSents, koSents).map((s, idx) => ({
      id: `fallback-s${idx + 1}`,
      index: idx,
      en: s.en,
      ko: s.ko,
    }));
  }, [readingSentences, lessonKey, enPassageFallback, koPassageFallback]);

  // Canonical full text derived from verified 1:1 sentences
  const enPassage = useMemo(() => {
    if (sentencePairs.length > 0) {
      return sentencePairs.map((s) => s.en).join(" ");
    }
    return enPassageFallback;
  }, [sentencePairs, enPassageFallback]);

  const koPassage = useMemo(() => {
    if (sentencePairs.length > 0) {
      return sentencePairs.map((s) => s.ko).join(" ");
    }
    return koPassageFallback;
  }, [sentencePairs, koPassageFallback]);

  // Total words calculation for WPM
  const wordCount = useMemo(() => {
    return enPassage.trim().split(/\s+/).filter(Boolean).length;
  }, [enPassage]);

  // Expected reading time in seconds at 180 WPM
  const expectedSeconds = Math.max(15, Math.round((wordCount / 180) * 60));

  // Extract exactly 14 high-yield academic vocabulary items (AI multi-factor scoring)
  const keywords: KeyWord[] = useMemo(() => {
    if (readingVocabulary && readingVocabulary.length === 14) {
      return readingVocabulary.map((v) => ({
        word: v.word,
        pos: v.partOfSpeech,
        meaning: v.korean,
        lemma: v.lemma,
        score: v.score,
        reason: v.reason,
        examTags: v.examTags,
        freq: v.freq,
      }));
    }
    const fromDict = getReadingVocabularyForLesson(lessonKey);
    if (fromDict && fromDict.length === 14) {
      return fromDict.map((v) => ({
        word: v.word,
        pos: v.partOfSpeech,
        meaning: v.korean,
        lemma: v.lemma,
        score: v.score,
        reason: v.reason,
        examTags: v.examTags,
        freq: v.freq,
      }));
    }
    return extractPassageKeywords(enPassage, 14, vocaDictionary);
  }, [readingVocabulary, lessonKey, enPassage, vocaDictionary]);

  // Generate comprehension quiz and cloze items
  const questions: ReadingQuestion[] = useMemo(() => {
    return generateReadingQuiz(enPassage, koPassage, lessonKey);
  }, [enPassage, koPassage, lessonKey]);

  const clozeItems: ClozeItem[] = useMemo(() => {
    return generateClozeItems(sentencePairs);
  }, [sentencePairs]);

  // Current active mode (4-Step Pedagogical reading flow)
  const [activeTab, setActiveTab] = useState<"speed" | "voca" | "quiz" | "dual">("speed");
  const [fontSize, setFontSize] = useState<"normal" | "large" | "xlarge">("normal");
  const [showNumbers, setShowNumbers] = useState(true);
  const [dualMobileView, setDualMobileView] = useState<"both" | "en" | "ko">("both");

  // Active playing audio state
  const [playingSentence, setPlayingSentence] = useState<number | null>(null);
  const [playingWord, setPlayingWord] = useState<string | null>(null);

  // --- STEP 1: WPM Speed Reading Isolated State (Micro-Render Optimization) ---
  const [measuredWpm, setMeasuredWpm] = useState<number | null>(null);
  const [measuredSeconds, setMeasuredSeconds] = useState<number | null>(null);
  const [bestWpm, setBestWpm] = useState<number | null>(null);

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

  const handleFinishWpm = useCallback((wpm: number, seconds: number) => {
    setMeasuredWpm(wpm);
    setMeasuredSeconds(seconds);
    setBestWpm((prev) => (!prev || wpm > prev ? wpm : prev));
  }, []);

  const handleResetWpm = useCallback(() => {
    setMeasuredWpm(null);
    setMeasuredSeconds(null);
  }, []);

  // --- STEP 2: Vocabulary Tooltip & Reveal State ---
  const [revealedVocaMeaning, setRevealedVocaMeaning] = useState<Record<string, boolean>>({});

  // --- STEP 3: Quiz & Cloze Answer States ---
  const [userAnswers, setUserAnswers] = useState<Record<number, number>>({});
  const [clozeAnswers, setClozeAnswers] = useState<Record<number, number>>({});
  const [readingScore, setReadingScore] = useState<number | null>(null);

  // --- Dual Mode Pinned Sentence & 1:1 Live Hover Translation State ---
  const [pinnedSentence, setPinnedSentence] = useState<number | null>(null);
  const [hoveredSentenceId, setHoveredSentenceId] = useState<string | null>(null);

  // Active sentence either hovered or pinned
  const activeSentence = useMemo(() => {
    if (hoveredSentenceId) {
      return sentencePairs.find((s) => s.id === hoveredSentenceId) || null;
    }
    if (pinnedSentence !== null && sentencePairs[pinnedSentence]) {
      return sentencePairs[pinnedSentence];
    }
    return null;
  }, [hoveredSentenceId, pinnedSentence, sentencePairs]);

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

      {/* 2. Step Selector Tabs (Responsive Grid, 100% visible on both Mobile & Desktop) */}
      <nav aria-label="리딩 4단계 학습 단계" className="w-full rounded-2xl border border-line bg-surface p-1 sm:p-1.5 shadow-2xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("speed")}
            className={
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-2 py-2 sm:py-2.5 text-center transition-all cursor-pointer select-none min-w-0 " +
              (activeTab === "speed"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
              Step 1
            </span>
            <span className="text-[12px] sm:text-[12.5px] font-semibold truncate flex items-center gap-1">
              <span>⏱️</span>
              <span className="hidden md:inline">속독 챌린지 (WPM)</span>
              <span className="inline md:hidden">속독 챌린지</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("voca")}
            className={
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-2 py-2 sm:py-2.5 text-center transition-all cursor-pointer select-none min-w-0 " +
              (activeTab === "voca"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
              Step 2
            </span>
            <span className="text-[12px] sm:text-[12.5px] font-semibold truncate flex items-center gap-1">
              <span>📚</span>
              <span>핵심 어휘 ({keywords.length})</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("quiz")}
            className={
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-2 py-2 sm:py-2.5 text-center transition-all cursor-pointer select-none min-w-0 " +
              (activeTab === "quiz"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
              Step 3
            </span>
            <span className="text-[12px] sm:text-[12.5px] font-semibold truncate flex items-center gap-1">
              <span>📝</span>
              <span className="hidden md:inline">독해력 퀴즈 & 클로즈</span>
              <span className="inline md:hidden">독해력 퀴즈</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("dual")}
            className={
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-xl px-2 py-2 sm:py-2.5 text-center transition-all cursor-pointer select-none min-w-0 " +
              (activeTab === "dual"
                ? "bg-ink text-surface font-semibold shadow-xs"
                : "text-ink-soft hover:bg-raised hover:text-ink")
            }
          >
            <span className="font-mono text-[10px] sm:text-[11px] font-bold uppercase tracking-wider opacity-75">
              Step 4
            </span>
            <span className="text-[12px] sm:text-[12.5px] font-semibold truncate flex items-center gap-1">
              <span>⚖️</span>
              <span className="hidden md:inline">원문/완역 대조</span>
              <span className="inline md:hidden">원문 대조</span>
            </span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* STEP 1: ⏱️ 실전 속독 챌린지 (WPM Speed Reading Stopwatch) */}
      {/* ========================================================================= */}
      {activeTab === "speed" && (
        <section aria-label="Speed Reading" className="flex flex-col gap-6 animate-in fade-in duration-200">
          {/* Isolated High-Performance Stopwatch Controller */}
          <WpmStopwatchBar
            wordCount={wordCount}
            bestWpm={bestWpm}
            wpmStorageKey={wpmStorageKey}
            onFinish={handleFinishWpm}
            onReset={handleResetWpm}
          />

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
                    {wordCount}개 단어를 {measuredSeconds ?? 0}초 만에 완독하셨습니다. (내 최고 기록: {bestWpm} WPM)
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

            {/* Seamless Paragraph Reading with 1:1 Hover Focus */}
            <div className={`${fontClasses} font-serif tracking-normal text-ink text-justify select-none`}>
              {sentencePairs.map((pair) => {
                const isPlaying = playingSentence === pair.index;
                const isHovered = hoveredSentenceId === pair.id;

                return (
                  <span
                    key={pair.id}
                    data-sentence-id={pair.id}
                    onMouseEnter={() => setHoveredSentenceId(pair.id)}
                    onMouseLeave={() => setHoveredSentenceId(null)}
                    onClick={() => playSentenceEn(pair.en, pair.index)}
                    className={
                      "inline cursor-pointer rounded px-1.5 py-0.5 transition-colors duration-100 " +
                      (isPlaying
                        ? "bg-red-500/15 text-red-600 dark:text-red-400 font-bold"
                        : isHovered
                        ? "bg-amber-200/80 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400/80"
                        : "hover:bg-raised/80")
                    }
                    title="터치하여 발음 청취 / 마우스 올려 번역 미리보기"
                  >
                    {showNumbers && (
                      <sup className={`mr-1 select-none font-mono text-[10px] font-bold ${isHovered ? "text-amber-700 dark:text-amber-300 opacity-100" : "opacity-60"}`}>
                        [{pair.index + 1}]
                      </sup>
                    )}
                    <span>{pair.en}</span>{" "}
                  </span>
                );
              })}
            </div>

            {/* Stable height translation hint bar in Step 1 (Zero Layout Shift) */}
            <div className="mt-5 min-h-[52px] flex items-center">
              {activeSentence ? (
                <div className="w-full flex items-center justify-between gap-3 rounded-xl border border-amber-300/80 bg-amber-50/90 dark:border-amber-700/60 dark:bg-amber-950/40 px-3.5 py-2 text-[13px] animate-in fade-in duration-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 rounded bg-amber-200/80 dark:bg-amber-800/60 px-1.5 py-0.5 font-mono text-[11px] font-bold text-amber-900 dark:text-amber-100">
                      [{activeSentence.index + 1}]
                    </span>
                    <span className="text-amber-950 dark:text-amber-100 font-semibold truncate">
                      👉 {activeSentence.ko}
                    </span>
                  </div>
                  <span className="font-mono text-[10.5px] text-ink-faint shrink-0">1:1 직독직해</span>
                </div>
              ) : (
                <div className="w-full text-center text-[11.5px] text-ink-faint py-2">
                  문장에 마우스를 올리면(Hover) 한국어 직독직해 번역이 여기에 표시됩니다.
                </div>
              )}
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
            <div className="flex items-center gap-2">
              <span className="rounded bg-raised px-2.5 py-0.5 font-mono text-[11.5px] font-semibold text-ink-soft border border-line">
                총 {keywords.length}개 핵심 어휘
              </span>
              <button
                type="button"
                onClick={() => {
                  const allRevealed =
                    keywords.length > 0 &&
                    keywords.every((kw) => revealedVocaMeaning[kw.word]);
                  if (allRevealed) {
                    setRevealedVocaMeaning({});
                  } else {
                    const all: Record<string, boolean> = {};
                    keywords.forEach((kw) => {
                      all[kw.word] = true;
                    });
                    setRevealedVocaMeaning(all);
                  }
                }}
                className="rounded-lg border border-line bg-raised px-3 py-1.5 text-[11.5px] font-medium text-ink hover:bg-surface cursor-pointer transition-colors"
              >
                {keywords.length > 0 &&
                keywords.every((kw) => revealedVocaMeaning[kw.word])
                  ? "🙈 전체 뜻 가리기"
                  : "💡 전체 뜻 보기"}
              </button>
            </div>
          </div>

          {/* Vocabulary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {keywords.map((kw, i) => {
              const isPlaying = playingWord === kw.word;
              const isRevealed = revealedVocaMeaning[kw.word] === true;

              return (
                <div
                  key={kw.word + i}
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
      {/* STEP 3: 📝 독해력 실전 퀴즈 & 클로즈 (Comprehension Check & Cloze Drill) */}
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
      {/* ========================================================================= */}
      {/* STEP 4: ⚖️ 원문 vs 완역 좌우 대조 (Dual Passage Review) */}
      {/* ========================================================================= */}
      {activeTab === "dual" && (
        <section aria-label="Side-by-Side Dual Reading" className="flex flex-col gap-4 animate-in fade-in duration-200">
          {/* Top Invariant Status Header Bar & Mobile View Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-line/70 bg-surface px-4 py-2.5 text-[12px] text-ink-soft shadow-2xs">
            <div className="flex items-center gap-2">
              <span className="text-[13px]">⚖️</span>
              <span className="font-medium text-ink">영어 원문과 한글 완역 1:1 대조 리딩</span>
              <span className="text-ink-faint hidden sm:inline">· 문장을 탭하면 대응 번역이 실시간 동기화됩니다</span>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Mobile View Toggle (visible only below lg) */}
              <div className="flex lg:hidden items-center rounded-lg border border-line bg-raised/70 p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setDualMobileView("both")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${dualMobileView === "both" ? "bg-surface text-ink font-bold shadow-2xs" : "text-ink-soft"}`}
                >
                  양방향
                </button>
                <button
                  type="button"
                  onClick={() => setDualMobileView("en")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${dualMobileView === "en" ? "bg-surface text-ink font-bold shadow-2xs" : "text-ink-soft"}`}
                >
                  영어만
                </button>
                <button
                  type="button"
                  onClick={() => setDualMobileView("ko")}
                  className={`px-2 py-0.5 rounded cursor-pointer ${dualMobileView === "ko" ? "bg-surface text-ink font-bold shadow-2xs" : "text-ink-soft"}`}
                >
                  한글만
                </button>
              </div>

              <span className="font-mono text-[10.5px] sm:text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                {sentencePairs.length}개 문장 1:1 정합
              </span>
            </div>
          </div>

          {/* Dual Columns: Left English, Right Korean (Responsive with mobile toggle) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Left Column: English Passage */}
            <div className={`rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs ${dualMobileView === "ko" ? "hidden lg:block" : "block"}`}>
              <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink uppercase tracking-wider border border-line">
                  English Passage (영어 원문)
                </span>
                <span className="font-mono text-[11px] text-ink-faint">탭 발음 듣기 / 번역 확인</span>
              </div>

              <div className={`${fontClasses} font-serif text-ink leading-loose text-justify select-none`}>
                {sentencePairs.map((pair) => {
                  const isSelected = pinnedSentence === pair.index;
                  const isHovered = hoveredSentenceId === pair.id;
                  const isPlaying = playingSentence === pair.index;
                  const isHighlight = isSelected || isHovered || isPlaying;

                  return (
                    <span
                      key={pair.id}
                      data-sentence-id={pair.id}
                      onMouseEnter={() => setHoveredSentenceId(pair.id)}
                      onMouseLeave={() => setHoveredSentenceId(null)}
                      onClick={() => {
                        setPinnedSentence((prev) => (prev === pair.index ? null : pair.index));
                        playSentenceEn(pair.en, pair.index);
                      }}
                      className={
                        "inline cursor-pointer rounded px-1.5 py-0.5 transition-colors duration-100 " +
                        (isHighlight
                          ? "bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400/80"
                          : "hover:bg-raised/80 hover:text-ink")
                      }
                    >
                      {showNumbers && (
                        <sup className={`mr-1 select-none font-mono text-[10px] font-bold ${isHighlight ? "text-amber-700 dark:text-amber-300 opacity-100" : "opacity-70"}`}>
                          [{pair.index + 1}]
                        </sup>
                      )}
                      <span>{pair.en}</span>{" "}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Korean Passage */}
            <div className={`rounded-2xl border border-line bg-surface p-4 sm:p-6 shadow-xs ${dualMobileView === "en" ? "hidden lg:block" : "block"}`}>
              <div className="mb-4 flex items-center justify-between border-b border-line/70 pb-2.5">
                <span className="rounded bg-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-ink-soft uppercase tracking-wider border border-line">
                  Korean Interpretation (한글 완역)
                </span>
                <span className="font-mono text-[11px] text-ink-faint">1:1 일치 단락</span>
              </div>

              <div className={`${fontClasses} text-ink/90 leading-loose text-justify select-none`}>
                {sentencePairs.map((pair) => {
                  const isSelected = pinnedSentence === pair.index;
                  const isHovered = hoveredSentenceId === pair.id;
                  const isPlaying = playingSentence === pair.index;
                  const isHighlight = isSelected || isHovered || isPlaying;

                  return (
                    <span
                      key={pair.id}
                      data-sentence-id={pair.id}
                      onMouseEnter={() => setHoveredSentenceId(pair.id)}
                      onMouseLeave={() => setHoveredSentenceId(null)}
                      onClick={() => {
                        setPinnedSentence((prev) => (prev === pair.index ? null : pair.index));
                      }}
                      className={
                        "inline cursor-pointer rounded px-1.5 py-0.5 transition-colors duration-100 " +
                        (isHighlight
                          ? "bg-amber-200/90 text-amber-950 dark:bg-amber-900/60 dark:text-amber-100 ring-1 ring-amber-400/80"
                          : "hover:bg-raised/80 hover:text-ink")
                      }
                    >
                      {showNumbers && (
                        <sup className={`mr-1 select-none font-mono text-[10px] font-bold ${isHighlight ? "text-amber-700 dark:text-amber-300 opacity-100" : "opacity-70"}`}>
                          [{pair.index + 1}]
                        </sup>
                      )}
                      <span>{pair.ko}</span>{" "}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Synchronized 1:1 Live Translation Overlay Layer (Docked Below Columns & Sticky Bottom HUD) */}
          <div className="sticky bottom-3 sm:bottom-4 z-20 pointer-events-none mt-2">
            <div className={`pointer-events-auto mx-auto max-w-3xl rounded-2xl border p-3 sm:p-4 shadow-xl backdrop-blur-md transition-all duration-150 ${
              activeSentence
                ? "border-amber-400/90 bg-surface/95 dark:bg-neutral-900/95 ring-1 ring-amber-500/30"
                : "hidden sm:block border-line/80 bg-surface/90 dark:bg-neutral-900/90 opacity-80"
            }`}>
              {activeSentence ? (
                <div className="flex items-start justify-between gap-3 sm:gap-4 max-h-[35vh] overflow-y-auto">
                  <div className="flex items-start gap-2.5 sm:gap-3 min-w-0">
                    <div className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/20 font-mono text-[11px] sm:text-[12px] font-bold text-amber-900 dark:text-amber-200">
                      #{activeSentence.index + 1}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="font-serif text-[13.5px] sm:text-[14.5px] font-medium text-ink leading-snug">
                        {activeSentence.en}
                      </div>
                      <div className="text-[13px] sm:text-[14px] text-amber-950 dark:text-amber-200 font-semibold leading-relaxed">
                        👉 {activeSentence.ko}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => playSentenceEn(activeSentence.en, activeSentence.index)}
                      className="rounded-xl border border-amber-400/60 bg-amber-200/70 dark:bg-amber-800/60 px-2.5 sm:px-3 py-1.5 font-mono text-[10.5px] sm:text-[11px] font-bold text-amber-950 dark:text-amber-100 hover:bg-amber-300 transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <span>🔊</span>
                      <span className="hidden xs:inline">발음</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPinnedSentence(null);
                        setHoveredSentenceId(null);
                      }}
                      className="rounded-lg p-1.5 text-ink-faint hover:text-ink hover:bg-raised transition-colors cursor-pointer"
                      title="닫기"
                      aria-label="닫기"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-[12px] text-ink-soft">
                  <span className="flex items-center gap-2">
                    <span>💡</span>
                    <span>영어 또는 한국어 문장에 마우스를 올리거나 탭하면 해당 문장의 1:1 번역이 여기에 표시됩니다.</span>
                  </span>
                  <span className="font-mono text-[11px] text-ink-faint">클릭하면 문장 고정(Pin)</span>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 6. Reading Notes & Summary Notepad */}
      <section aria-label="Reading Notes" className="rounded-xl border border-line bg-surface p-4 sm:p-5 shadow-xs">
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
          className="w-full rounded-lg border border-line/80 bg-raised/20 p-3.5 text-[16px] sm:text-[13.5px] text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
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
    .replace(/^\s*\([A-Za-z0-9]\)\s*/, "")
    .replace(/^\s*\[[A-Za-z0-9]\]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

function splitSentences(text: string): string[] {
  if (!text) return [];
  // Protect abbreviations like Mr., Mrs., Ms., Dr., Prof., etc. from being split
  const protectedText = text
    .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr)\.\s+/gi, "$1.__SPACE__")
    .replace(/\b(U\.S\.|e\.g\.|i\.e\.)\s+/gi, (m) => m.replace(/\s+/g, "__SPACE__"));

  return protectedText
    .split(/(?<=[.?!])\s+/)
    .map((s) => cleanSentenceText(s.replace(/__SPACE__/g, " ")))
    .filter((s) => s.length > 0);
}

function alignDP(enSents: string[], koSents: string[]): { en: string; ko: string }[] {
  const N = enSents.length;
  const M = koSents.length;
  const dp: number[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(Infinity));
  const parent: ([number, number] | null)[][] = Array.from({ length: N + 1 }, () => Array(M + 1).fill(null));

  dp[0][0] = 0;

  function cost(eText: string, kText: string, di: number, dj: number): number {
    const elen = eText.length;
    const klen = kText.length;
    let base = 0;
    if (di === 1 && dj === 1) base = 0;
    else if ((di === 1 && dj === 2) || (di === 2 && dj === 1)) base = 25;
    else if ((di === 1 && dj === 3) || (di === 3 && dj === 1)) base = 80;
    else base = 150;

    const diff = elen - klen * 1.7;
    const varLen = Math.sqrt(elen + klen * 1.7 + 1);
    const score = Math.pow(diff / varLen, 2);
    return base + Math.min(score, 100);
  }

  const moves = [
    [1, 1],
    [1, 2],
    [2, 1],
    [1, 3],
    [3, 1],
  ];

  for (let i = 0; i <= N; i++) {
    for (let j = 0; j <= M; j++) {
      if (dp[i][j] === Infinity) continue;
      for (const [di, dj] of moves) {
        if (i + di <= N && j + dj <= M) {
          const eText = enSents.slice(i, i + di).join(" ");
          const kText = koSents.slice(j, j + dj).join(" ");
          const c = cost(eText, kText, di, dj);
          if (dp[i][j] + c < dp[i + di][j + dj]) {
            dp[i + di][j + dj] = dp[i][j] + c;
            parent[i + di][j + dj] = [i, j];
          }
        }
      }
    }
  }

  let currI = N;
  let currJ = M;
  const path: { en: string; ko: string }[] = [];
  while (currI > 0 || currJ > 0) {
    const p = parent[currI][currJ];
    if (!p) break;
    const [prevI, prevJ] = p;
    path.push({
      en: enSents.slice(prevI, currI).join(" "),
      ko: koSents.slice(prevJ, currJ).join(" "),
    });
    currI = prevI;
    currJ = prevJ;
  }
  path.reverse();
  return path;
}

function alignSentences(enSents: string[], koSents: string[]) {
  if (enSents.length === 0 && koSents.length === 0) return [];
  if (enSents.length === 0) return koSents.map((k) => ({ en: "", ko: k }));
  if (koSents.length === 0) return enSents.map((e) => ({ en: e, ko: "" }));

  // If enSents is shorter than koSents, check if any enSent contains a semicolon ';' separating clauses
  if (enSents.length < koSents.length) {
    const candidateEn: string[] = [];
    for (const s of enSents) {
      if (s.includes(";")) {
        const parts = s.split(/;\s*/).map(cleanSentenceText).filter(Boolean);
        if (parts.length > 1) {
          candidateEn.push(...parts);
        } else {
          candidateEn.push(s);
        }
      } else {
        candidateEn.push(s);
      }
    }
    if (candidateEn.length === koSents.length) {
      enSents = candidateEn;
    } else if (candidateEn.length > enSents.length && candidateEn.length <= koSents.length) {
      enSents = candidateEn;
    }
  }

  if (enSents.length === koSents.length) {
    return enSents.map((en, i) => ({ en, ko: koSents[i] }));
  }

  return alignDP(enSents, koSents);
}
