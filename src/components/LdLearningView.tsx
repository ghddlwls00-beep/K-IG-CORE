"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Block } from "@/lib/types";
import { useLanguage } from "./LanguageProvider";
import { speakText, stopSpeech, playSentenceQueue, isSpeaking } from "@/lib/speech";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import {
  generateLiaisonPoints,
  generateWordBank,
  verifyWordSequence,
  generateListeningContextQuiz,
  type LiaisonCard,
  type WordTile,
  type ContextQuizItem,
} from "@/lib/listeningUtils";

interface LdLearningViewProps {
  blocks: Block[];
  pairBlocks?: Block[] | null;
  lessonKey: string;
  isScript: boolean;
  audioTracks?: { src: string; label?: string }[];
  ldEnglishScript?: { n: string; ko: string; en: string }[] | null;
}

type TabStep = "step1_blind" | "step2_dictation" | "step3_liaison" | "step4_shadowing" | "step5_speed";

export function LdLearningView({
  blocks,
  pairBlocks = null,
  lessonKey,
  isScript,
  ldEnglishScript = null,
}: LdLearningViewProps) {
  const { t } = useLanguage();

  // 1. Extract raw script blocks
  const mainBlocks = isScript ? (pairBlocks || []) : blocks;
  const scriptBlocks = isScript ? blocks : (pairBlocks || []);

  const hintsBlock = mainBlocks.find((b) => b.type === "hints") as { type: "hints"; text: string } | undefined;
  const hintWords = useMemo(() => {
    return hintsBlock
      ? hintsBlock.text
          .split(/[,.]/)
          .map((w) => w.trim())
          .filter((w) => w.length > 0 && !/^\d+$/.test(w))
      : [];
  }, [hintsBlock]);

  // Extract Korean sentences fallback
  const koSentences: string[] = useMemo(() => {
    const list: string[] = [];
    for (const b of scriptBlocks) {
      if (b.type === "instruction") {
        const txt = b.text.trim();
        if (txt && !txt.includes("한글 대본을") && !txt.includes("받아쓰기를")) {
          list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
        }
      } else if (b.type === "paragraph") {
        const txt = b.text.trim();
        if (txt) list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
      } else if (b.type === "sentences") {
        for (const it of (b as { type: "sentences"; items: { n: string; text: string }[] }).items) {
          const txt = it.text.trim();
          if (txt) list.push(txt.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim());
        }
      }
    }
    return list;
  }, [scriptBlocks]);

  // Model paired sentences (English + Korean)
  const sentences: { n: string; ko: string; en: string }[] = useMemo(() => {
    if (ldEnglishScript && ldEnglishScript.length > 0) {
      return ldEnglishScript;
    }
    return koSentences.map((ko, idx) => ({
      n: String(idx + 1),
      ko,
      en: "",
    }));
  }, [ldEnglishScript, koSentences]);

  const allEnglishSentences = useMemo(() => sentences.map((s) => s.en).filter(Boolean), [sentences]);
  const allWordsPool = useMemo(() => {
    const set = new Set<string>();
    allEnglishSentences.forEach((s) => {
      s.split(/\s+/).forEach((w) => set.add(w.replace(/[^a-zA-Z]/g, "")));
    });
    return Array.from(set).filter(Boolean);
  }, [allEnglishSentences]);

  // Active step tab
  const [activeTab, setActiveTab] = useState<TabStep>("step1_blind");

  // Step 1: Blind Context State
  const contextQuizzes = useMemo(() => {
    return generateListeningContextQuiz(sentences, hintWords);
  }, [sentences, hintWords]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<number, boolean>>({});

  // Step 2: Interactive Word-Block Tap Dictation State
  const [dictationIndex, setDictationIndex] = useState(0);
  const currentDictationItem = sentences[dictationIndex] || sentences[0];
  const [wordBank, setWordBank] = useState<{ correctWords: string[]; allTiles: WordTile[] }>({
    correctWords: [],
    allTiles: [],
  });
  const [assembledTiles, setAssembledTiles] = useState<WordTile[]>([]);
  const [dictationStatus, setDictationStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const [manualTypingMode, setManualTypingMode] = useState(false);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [dictationProgress, setDictationProgress] = useState<Record<number, boolean>>({});

  // Step 3: Liaison & Sound Clinic State
  const [liaisonIndex, setLiaisonIndex] = useState(0);
  const currentLiaisonSentence = sentences[liaisonIndex] || sentences[0];
  const currentLiaisonPoints = useMemo(() => {
    return currentLiaisonSentence?.en ? generateLiaisonPoints(currentLiaisonSentence.en) : [];
  }, [currentLiaisonSentence]);

  // Step 4: Shadowing State
  const [shadowIndex, setShadowIndex] = useState(0);
  const currentShadowSentence = sentences[shadowIndex] || sentences[0];
  const [shadowScores, setShadowScores] = useState<Record<number, number>>({});

  // Step 5: Speed Brain Challenge State
  const [speedRate, setSpeedRate] = useState<number>(1.0);
  const [speedPlaying, setSpeedPlaying] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState<number>(0);
  const [notes, setNotes] = useState("");

  // Audio playing helper state
  const [playingSentenceText, setPlayingSentenceText] = useState<string | null>(null);

  // Initialize Word Bank when dictation index changes
  useEffect(() => {
    if (currentDictationItem?.en) {
      const generated = generateWordBank(currentDictationItem.en, allWordsPool);
      setWordBank(generated);
      setAssembledTiles([]);
      setDictationStatus("idle");
      setTypedAnswer("");
    }
  }, [dictationIndex, currentDictationItem, allWordsPool]);

  // Cleanup speech on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  // Restore persistence from localStorage
  const storageKey = `kig:ld:mastery:${lessonKey}`;
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.dictationProgress) setDictationProgress(d.dictationProgress);
        if (d.shadowScores) setShadowScores(d.shadowScores);
        if (d.selectedAnswers) setSelectedAnswers(d.selectedAnswers);
        if (d.quizSubmitted) setQuizSubmitted(d.quizSubmitted);
        if (d.notes) setNotes(d.notes);
      }
    } catch {
      // ignore
    }
  }, [storageKey]);

  // Save persistence to localStorage
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(
          storageKey,
          JSON.stringify({
            dictationProgress,
            shadowScores,
            selectedAnswers,
            quizSubmitted,
            notes,
          })
        );
      } catch {
        // ignore
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [dictationProgress, shadowScores, selectedAnswers, quizSubmitted, notes, storageKey]);

  // Audio Playback
  function playText(text: string, rate = 1.0) {
    if (!text) return;
    if (playingSentenceText === text) {
      stopSpeech();
      setPlayingSentenceText(null);
      return;
    }
    stopSpeech();
    setPlayingSentenceText(text);
    speakText(text, {
      lang: "en",
      rate,
      onEnd: () => setPlayingSentenceText((curr) => (curr === text ? null : curr)),
      onError: () => setPlayingSentenceText((curr) => (curr === text ? null : curr)),
    });
  }

  // Play whole lesson sequence (for Step 1 and Step 5)
  function toggleWholePassage(rate = 1.0) {
    if (speedPlaying) {
      stopSpeech();
      setSpeedPlaying(false);
      return;
    }
    if (allEnglishSentences.length === 0) return;

    setSpeedPlaying(true);
    playSentenceQueue(allEnglishSentences, {
      lang: "en",
      rate,
      startIndex: currentQueueIndex,
      onProgress: (idx) => setCurrentQueueIndex(idx),
      onEnd: () => {
        setSpeedPlaying(false);
        setCurrentQueueIndex(0);
      },
    });
  }

  // Step 1: Quiz Handler
  function handleSelectQuizOption(qIdx: number, oIdx: number) {
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
    setQuizSubmitted((prev) => ({ ...prev, [qIdx]: true }));
  }

  // Step 2: Dictation Handlers
  function handleTapTile(tile: WordTile) {
    setAssembledTiles((prev) => [...prev, tile]);
    setWordBank((prev) => ({
      ...prev,
      allTiles: prev.allTiles.filter((t) => t.id !== tile.id),
    }));
    setDictationStatus("idle");
  }

  function handleRemoveTile(tile: WordTile) {
    setAssembledTiles((prev) => prev.filter((t) => t.id !== tile.id));
    setWordBank((prev) => ({
      ...prev,
      allTiles: [...prev.allTiles, tile],
    }));
    setDictationStatus("idle");
  }

  function handleResetDictation() {
    if (currentDictationItem?.en) {
      const generated = generateWordBank(currentDictationItem.en, allWordsPool);
      setWordBank(generated);
      setAssembledTiles([]);
      setDictationStatus("idle");
      setTypedAnswer("");
    }
  }

  function handleCheckDictation() {
    if (manualTypingMode) {
      const cleanUser = typedAnswer.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
      const cleanTarget = currentDictationItem.en.trim().toLowerCase().replace(/[^a-z0-9 ]/g, "");
      if (cleanUser === cleanTarget) {
        setDictationStatus("correct");
        setDictationProgress((prev) => ({ ...prev, [dictationIndex]: true }));
      } else {
        setDictationStatus("incorrect");
      }
    } else {
      const userWords = assembledTiles.map((t) => t.word);
      const isCorrect = verifyWordSequence(userWords, wordBank.correctWords);
      if (isCorrect) {
        setDictationStatus("correct");
        setDictationProgress((prev) => ({ ...prev, [dictationIndex]: true }));
      } else {
        setDictationStatus("incorrect");
      }
    }
  }

  const TABS: { id: TabStep; label: string; icon: string; badge?: string }[] = [
    { id: "step1_blind", label: "Step 1 · 🎧 블라인드 리스닝", icon: "🎧" },
    {
      id: "step2_dictation",
      label: `Step 2 · 🧩 탭-딕테이션 (${Object.keys(dictationProgress).length}/${sentences.length})`,
      icon: "🧩",
    },
    { id: "step3_liaison", label: "Step 3 · 🔍 연음 & 소리 클리닉", icon: "🔍" },
    { id: "step4_shadowing", label: "Step 4 · 🗣️ 섀도잉 & AI 평가", icon: "🗣️" },
    { id: "step5_speed", label: "Step 5 · ⚡ 1.5배속 청취 & 대조", icon: "⚡" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* 1. High-End Stage Header Banner */}
      <div className="rounded-2xl border border-line bg-surface/90 p-5 shadow-soft backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-primary/10 px-3 py-0.5 font-mono text-[11px] font-bold text-primary tracking-wider uppercase border border-primary/20">
                Acoustic Cognitive System
              </span>
              <span className="font-mono text-[11px] text-ink-faint">
                {sentences.length}개 문장 완성 코스웨어
              </span>
            </div>
            <h1 className="mt-2 text-[20px] font-bold tracking-tight text-ink">
              5단계 음향 인지 리스닝 마스터리
            </h1>
            <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
              블라인드 청취 ➔ 스마트 탭-딕테이션 ➔ 연음 분해 클리닉 ➔ 실전 섀도잉 & AI 평가 ➔ 1.5배속 뇌 트레이닝으로 이어지는 실전 청취력 완성 시스템입니다.
            </p>
          </div>

          {/* Vocabulary hint chips */}
          {hintWords.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 max-w-md justify-end">
              <span className="font-mono text-[11px] text-ink-faint uppercase tracking-wider mr-1">
                핵심 단어:
              </span>
              {hintWords.slice(0, 6).map((word, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => playText(word, 0.9)}
                  className="rounded-lg border border-line bg-raised/70 px-2 py-0.5 font-mono text-[11.5px] font-medium text-ink-soft hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                  title="발음 듣기"
                >
                  {word} 🔊
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 2. Step Navigation Bar (Sticky on mobile & desktop) */}
      <div className="no-scrollbar sticky top-[57px] z-30 flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-line bg-surface/95 p-1.5 shadow-xs backdrop-blur-md">
        {TABS.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                stopSpeech();
                setSpeedPlaying(false);
              }}
              className={
                "shrink-0 rounded-xl px-3.5 py-2 text-[12.5px] font-medium transition-all cursor-pointer select-none " +
                (active
                  ? "bg-ink font-semibold text-white shadow-xs"
                  : "text-ink-soft hover:bg-raised hover:text-ink")
              }
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: 🎧 STEP 1 · 블라인드 액티브 리스닝 & 맥락 진단 (Blind Context) */}
      {/* ========================================================================= */}
      {activeTab === "step1_blind" && (
        <div className="flex flex-col gap-6" style={{ animation: "fadeIn 250ms ease both" }}>
          {/* Hero Audio Player Card */}
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-soft text-center flex flex-col items-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 font-mono text-[11.5px] font-semibold text-primary border border-primary/20 mb-3">
              <span>🎧 BLIND AUDIO</span>
              <span>·</span>
              <span>자막 없이 소리에만 귀 기울이기</span>
            </div>

            <h2 className="text-[20px] font-bold text-ink mb-1.5">
              스크립트를 보지 않고 전체 음성을 처음부터 끝까지 청취하세요
            </h2>
            <p className="text-[13.5px] text-ink-soft max-w-lg mb-6 leading-relaxed">
              자막을 보면 뇌는 시각 정보에 의존하여 청각 훈련을 멈춥니다. 전체적인 뉘앙스, 화자의 감정, 핵심 키워드가 어떻게 들리는지 집중해 보세요.
            </p>

            {/* Big Play Button */}
            <div className="flex items-center gap-4 mb-4">
              <button
                type="button"
                onClick={() => toggleWholePassage(speedRate)}
                className="inline-flex items-center gap-3 rounded-full bg-ink px-8 py-4 text-[16px] font-bold text-white shadow-lg hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
              >
                <span className="text-[18px]">{speedPlaying ? "⏹️ 정지" : "▶️ 전체 본문 듣기"}</span>
              </button>
            </div>

            {/* Speed selection */}
            <div className="flex items-center gap-2 text-[12px] text-ink-soft">
              <span className="font-mono text-[11px] text-ink-faint uppercase">속도:</span>
              {[0.85, 1.0, 1.25].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSpeedRate(r);
                    if (speedPlaying) toggleWholePassage(r);
                  }}
                  className={
                    "rounded-lg px-2.5 py-1 font-mono text-[11.5px] font-medium transition-colors cursor-pointer " +
                    (speedRate === r
                      ? "bg-primary text-white font-bold"
                      : "border border-line bg-surface hover:bg-raised")
                  }
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* Context Diagnosis Quiz */}
          <div className="rounded-2xl border border-line bg-surface p-6 shadow-xs flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h3 className="font-bold text-[16px] text-ink flex items-center gap-2">
                  <span>🎯</span>
                  <span>블라인드 리스닝 맥락 진단 퀴즈</span>
                </h3>
                <p className="text-[12.5px] text-ink-soft mt-0.5">
                  방금 들은 소리를 바탕으로 상황과 핵심 사실을 골라보세요.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              {contextQuizzes.map((quiz, qIdx) => {
                const selected = selectedAnswers[qIdx];
                const isSubmitted = quizSubmitted[qIdx];
                const isCorrect = selected === quiz.answerIndex;

                return (
                  <div key={qIdx} className="rounded-xl border border-line bg-raised/50 p-4.5">
                    <h4 className="font-bold text-[14.5px] text-ink mb-3">{quiz.question}</h4>

                    <div className="flex flex-col gap-2">
                      {quiz.options.map((opt, oIdx) => {
                        const isChosen = selected === oIdx;
                        let optionStyle = "border-line bg-surface text-ink hover:border-ink/40";
                        if (isSubmitted) {
                          if (oIdx === quiz.answerIndex) {
                            optionStyle = "border-emerald-500 bg-emerald-500/10 text-emerald-900 font-bold";
                          } else if (isChosen) {
                            optionStyle = "border-red-500 bg-red-500/10 text-red-900 line-through";
                          }
                        } else if (isChosen) {
                          optionStyle = "border-ink bg-ink/5 font-semibold";
                        }

                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleSelectQuizOption(qIdx, oIdx)}
                            className={`flex items-center justify-between rounded-xl border p-3 text-left text-[13.5px] transition-all cursor-pointer ${optionStyle}`}
                          >
                            <span>{opt}</span>
                            {isSubmitted && oIdx === quiz.answerIndex && (
                              <span className="text-emerald-600 font-bold ml-2">✓ 정답</span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {isSubmitted && (
                      <div
                        className={`mt-3.5 rounded-lg p-3 text-[12.5px] leading-relaxed ${
                          isCorrect ? "bg-emerald-500/10 text-emerald-950" : "bg-amber-500/10 text-amber-950"
                        }`}
                      >
                        <p className="font-semibold mb-0.5">{isCorrect ? "🎉 정답입니다!" : "💡 해설"}</p>
                        <p>{quiz.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setActiveTab("step2_dictation")}
                className="inline-flex items-center gap-2 rounded-xl bg-ink px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-black/90 transition-all cursor-pointer shadow-xs"
              >
                <span>다음: Step 2 탭-딕테이션 이동</span>
                <span>→</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: 🧩 STEP 2 · 스마트 탭-딕테이션 (Word-Block Tap Dictation) */}
      {/* ========================================================================= */}
      {activeTab === "step2_dictation" && (
        <div className="flex flex-col gap-6" style={{ animation: "fadeIn 250ms ease both" }}>
          {/* Sentence Navigation & Progress Header */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
                  Sentence {dictationIndex + 1} of {sentences.length}
                </span>
                <h2 className="text-[17px] font-bold text-ink mt-0.5">
                  원어민 소리를 듣고 단어 블록을 탭하여 문장을 완성하세요
                </h2>
              </div>

              {/* Toggle Manual Typing Switch */}
              <button
                type="button"
                onClick={() => setManualTypingMode(!manualTypingMode)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-raised px-3 py-1.5 text-[12px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer shadow-2xs"
              >
                <span>{manualTypingMode ? "🧩 블록 탭 모드로 전환" : "⌨️ 직접 키보드 타이핑 모드"}</span>
              </button>
            </div>

            {/* Pagination stepper */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                disabled={dictationIndex <= 0}
                onClick={() => setDictationIndex((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[12.5px] font-medium text-ink-soft hover:text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>← 이전 문장</span>
              </button>

              <div className="flex items-center gap-1">
                {sentences.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDictationIndex(i)}
                    className={`h-2 rounded-full transition-all cursor-pointer ${
                      i === dictationIndex
                        ? "w-6 bg-primary"
                        : dictationProgress[i]
                        ? "w-2 bg-emerald-500"
                        : "w-2 bg-line-strong/20"
                    }`}
                    title={`문장 ${i + 1}`}
                  />
                ))}
              </div>

              <button
                type="button"
                disabled={dictationIndex >= sentences.length - 1}
                onClick={() => setDictationIndex((prev) => Math.min(sentences.length - 1, prev + 1))}
                className="inline-flex items-center gap-1 rounded-lg px-3 py-1 text-[12.5px] font-medium text-ink-soft hover:text-ink disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
              >
                <span>다음 문장 →</span>
              </button>
            </div>
          </div>

          {/* Interactive Drill Card */}
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-soft flex flex-col gap-6">
            {/* Audio Listening Control */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4 shadow-2xs">
              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-mono text-[12px] font-bold text-primary">
                  #{dictationIndex + 1}
                </span>
                <div>
                  <span className="font-mono text-[10.5px] font-semibold text-ink-faint uppercase">
                    한글 번역 가이드
                  </span>
                  <p className="text-[14.5px] font-medium text-ink">{currentDictationItem.ko}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => playText(currentDictationItem.en, 1.0)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-white shadow-xs hover:bg-black/90 active:scale-95 transition-all cursor-pointer"
                >
                  <span>🔊 표준 속도</span>
                </button>
                <button
                  type="button"
                  onClick={() => playText(currentDictationItem.en, 0.82)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-raised px-3 py-2 text-[12.5px] font-medium text-ink hover:bg-surface transition-colors cursor-pointer shadow-2xs"
                  title="느린 배속으로 정밀 듣기"
                >
                  <span>🐢 0.85x 느리게</span>
                </button>
              </div>
            </div>

            {/* Assembled Sentence Area */}
            {manualTypingMode ? (
              <div>
                <label className="block text-[12px] font-mono text-ink-faint uppercase mb-1.5">
                  직접 듣고 영문 타이핑:
                </label>
                <input
                  type="text"
                  value={typedAnswer}
                  onChange={(e) => {
                    setTypedAnswer(e.target.value);
                    setDictationStatus("idle");
                  }}
                  placeholder="들리는 영문장을 직접 입력하세요..."
                  className="w-full rounded-xl border border-line/80 bg-surface p-4 font-mono text-[15px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none transition-colors"
                />
              </div>
            ) : (
              <div>
                <span className="block text-[11.5px] font-mono text-ink-faint uppercase mb-2">
                  조립된 문장 (아래 단어 블록을 탭하여 순서대로 넣으세요):
                </span>
                <div className="min-h-[72px] rounded-2xl border-2 border-dashed border-primary/30 bg-surface p-3 flex flex-wrap items-center gap-2">
                  {assembledTiles.length === 0 ? (
                    <span className="text-[13px] text-ink-faint italic mx-auto">
                      아래의 단어 블록을 클릭하여 문장을 만드세요...
                    </span>
                  ) : (
                    assembledTiles.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => handleRemoveTile(tile)}
                        className="group inline-flex items-center gap-1.5 rounded-xl bg-ink px-3.5 py-1.5 font-mono text-[14px] font-bold text-white shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
                        title="클릭하여 되돌리기"
                      >
                        <span>{tile.word}</span>
                        <span className="text-[10px] text-white/50 group-hover:text-white">✕</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Word Bank Chips (Unused Tiles) */}
            {!manualTypingMode && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11.5px] font-mono text-ink-faint uppercase">
                    단어 블록 뱅크 (총 {wordBank.allTiles.length}개):
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDictation}
                    className="text-[11px] font-mono text-ink-faint hover:text-ink transition-colors cursor-pointer"
                  >
                    ↺ 전체 초기화
                  </button>
                </div>

                <div className="flex flex-wrap gap-2.5 p-3 rounded-2xl border border-line bg-raised/60 min-h-[60px] items-center">
                  {wordBank.allTiles.length === 0 ? (
                    <span className="text-[12px] text-ink-faint mx-auto">모든 단어를 배치했습니다!</span>
                  ) : (
                    wordBank.allTiles.map((tile) => (
                      <button
                        key={tile.id}
                        type="button"
                        onClick={() => handleTapTile(tile)}
                        className="rounded-xl border border-line bg-surface px-4 py-2 font-mono text-[14px] font-semibold text-ink shadow-2xs hover:border-primary hover:text-primary hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                      >
                        {tile.word}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Feedback message banner */}
            {dictationStatus === "correct" && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-[13.5px] text-emerald-950 flex items-center justify-between animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="text-[20px]">🎉</span>
                  <div>
                    <p className="font-bold">정답입니다! 훌륭한 청취력입니다.</p>
                    <p className="font-mono text-[13px] text-emerald-800">{currentDictationItem.en}</p>
                  </div>
                </div>
                {dictationIndex < sentences.length - 1 && (
                  <button
                    type="button"
                    onClick={() => setDictationIndex((prev) => prev + 1)}
                    className="rounded-lg bg-emerald-700 px-3 py-1.5 text-[12px] font-bold text-white hover:bg-emerald-800 transition-colors cursor-pointer shrink-0"
                  >
                    다음 문장 풀기 →
                  </button>
                )}
              </div>
            )}

            {dictationStatus === "incorrect" && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-3.5 text-[13px] text-red-950 flex items-center justify-between">
                <div>
                  <p className="font-bold">순서가 조금 다릅니다. 원어민 오디오를 다시 듣고 도전해 보세요!</p>
                </div>
                <button
                  type="button"
                  onClick={() => playText(currentDictationItem.en, 0.85)}
                  className="rounded-lg bg-red-600 px-3 py-1 text-[11.5px] font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  🔊 다시 듣기
                </button>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => playText(currentDictationItem.en, 1.0)}
                className="text-[12.5px] text-ink-soft hover:text-ink cursor-pointer"
              >
                🔊 문장 다시 듣기
              </button>

              <button
                type="button"
                onClick={handleCheckDictation}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-[13.5px] font-bold text-white shadow-xs hover:bg-[#967440] active:scale-95 transition-all cursor-pointer"
              >
                <span>✓ 정답 채점하기</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: 🔍 STEP 3 · 소리 분해 & 연음 클리닉 (Liaison & Sound Decoding) */}
      {/* ========================================================================= */}
      {activeTab === "step3_liaison" && (
        <div className="flex flex-col gap-6" style={{ animation: "fadeIn 250ms ease both" }}>
          {/* Header Description */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
                Sound Decoding Clinic
              </span>
              <h2 className="text-[18px] font-bold text-ink mt-0.5">
                한국인이 영어를 못 듣는 진짜 이유: 연음·탈락·플랩(Flap) 클리닉
              </h2>
              <p className="text-[13px] text-ink-soft mt-1 max-w-2xl leading-relaxed">
                스펠링대로 발음되지 않고 뭉개지는 원어민 소리의 법칙을 시각적으로 짚어드립니다. 소리의 생성 원리를 이해하면 귀가 즉각적으로 열립니다.
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="font-mono text-[11.5px] text-ink-faint">문장 선택:</span>
              <select
                value={liaisonIndex}
                onChange={(e) => setLiaisonIndex(Number(e.target.value))}
                className="rounded-lg border border-line bg-raised px-3 py-1.5 font-mono text-[12.5px] font-medium text-ink focus:outline-none cursor-pointer"
              >
                {sentences.map((s, idx) => (
                  <option key={idx} value={idx}>
                    #{idx + 1} {s.en.slice(0, 24)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Current Target Sentence Display */}
          <div className="rounded-2xl border border-line bg-raised p-5 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <span className="font-mono text-[11px] font-bold text-primary uppercase">
                Sentence #{liaisonIndex + 1}
              </span>
              <button
                type="button"
                onClick={() => playText(currentLiaisonSentence.en, 0.9)}
                className="inline-flex items-center gap-1 rounded-lg bg-ink px-3 py-1 text-[11.5px] font-bold text-white hover:bg-black/90 cursor-pointer"
              >
                <span>🔊 문장 전체 발음</span>
              </button>
            </div>
            <p className="text-[18px] font-mono font-bold text-ink leading-relaxed mb-1">
              {currentLiaisonSentence.en}
            </p>
            <p className="text-[14px] text-ink-soft">{currentLiaisonSentence.ko}</p>
          </div>

          {/* Liaison Cards List */}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold text-[15px] text-ink flex items-center gap-2">
              <span>🔬</span>
              <span>이 문장에서 발생하는 핵심 소리 변이 현상 ({currentLiaisonPoints.length}개)</span>
            </h3>

            {currentLiaisonPoints.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line bg-surface p-8 text-center text-[13px] text-ink-soft">
                이 문장은 단어들이 비교적 독립적인 음소로 발음되는 문장입니다. [문장 전체 발음]을 청취하며 각 단어의 강세를 익혀보세요.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentLiaisonPoints.map((card, i) => (
                  <div
                    key={i}
                    className="rounded-2xl border border-primary/20 bg-surface p-5 shadow-soft flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-mono text-[10.5px] font-bold text-primary border border-primary/20">
                          {card.typeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => playText(card.original, 0.9)}
                          className="rounded-lg border border-line bg-raised px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-surface hover:text-primary transition-colors cursor-pointer shadow-2xs"
                        >
                          🔊 소리 청취
                        </button>
                      </div>

                      {/* Before and After sound */}
                      <div className="rounded-xl bg-raised/70 p-3 mb-3 border border-line/60">
                        <div className="flex items-center justify-between text-[13px] mb-1">
                          <span className="text-ink-faint font-mono">원문 스펠링:</span>
                          <span className="font-mono font-bold text-ink">{card.original}</span>
                        </div>
                        <div className="flex items-center justify-between text-[14px]">
                          <span className="text-primary font-semibold">실제 들리는 소리:</span>
                          <span className="font-mono font-bold text-primary text-[15px]">
                            {card.koreanSound} <span className="text-[12px] font-normal text-ink-soft">{card.phonetic}</span>
                          </span>
                        </div>
                      </div>

                      <p className="text-[12.5px] text-ink-soft leading-relaxed">{card.rule}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: 🗣️ STEP 4 · 실전 섀도잉 & AI 발음 평가 (Shadowing & AI Match) */}
      {/* ========================================================================= */}
      {activeTab === "step4_shadowing" && (
        <div className="flex flex-col gap-6" style={{ animation: "fadeIn 250ms ease both" }}>
          {/* Hero Banner */}
          <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="font-mono text-[11px] font-bold text-primary uppercase tracking-wider">
                  Shadowing & Speech Match
                </span>
                <h2 className="text-[18px] font-bold text-ink mt-0.5">
                  원어민을 0.5초 차이로 그림자처럼 따라 말하세요 (Shadowing)
                </h2>
                <p className="text-[13px] text-ink-soft mt-1 max-w-2xl leading-relaxed">
                  "내가 직접 발음할 수 있는 소리만 귀에 들린다"는 언어학의 대원칙입니다. 원어민 발음을 듣고 즉시 마이크로 소리 내어 말해 일치도를 측정해 보세요.
                </p>
              </div>

              {/* Stepper counter */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={shadowIndex <= 0}
                  onClick={() => setShadowIndex((prev) => Math.max(0, prev - 1))}
                  className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-ink-soft hover:text-ink disabled:opacity-30 cursor-pointer"
                >
                  ← 이전
                </button>
                <span className="font-mono text-[12.5px] font-bold text-ink">
                  {shadowIndex + 1} / {sentences.length}
                </span>
                <button
                  type="button"
                  disabled={shadowIndex >= sentences.length - 1}
                  onClick={() => setShadowIndex((prev) => Math.min(sentences.length - 1, prev + 1))}
                  className="rounded-lg border border-line px-2.5 py-1 text-[12px] font-medium text-ink-soft hover:text-ink disabled:opacity-30 cursor-pointer"
                >
                  다음 →
                </button>
              </div>
            </div>
          </div>

          {/* Shadowing Practice Card */}
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-soft flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="font-mono text-[11px] font-bold text-primary uppercase">
                Sentence #{shadowIndex + 1} Shadowing Target
              </span>
              <p className="text-[20px] font-mono font-bold text-ink leading-relaxed">
                {currentShadowSentence.en}
              </p>
              <p className="text-[14px] text-ink-soft">{currentShadowSentence.ko}</p>
            </div>

            {/* Listening Step 1 */}
            <div className="rounded-2xl border border-line bg-surface p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white text-xs font-bold">
                  1
                </span>
                <div>
                  <span className="font-bold text-[13.5px] text-ink">먼저 원어민 음성 듣기</span>
                  <p className="text-[12px] text-ink-soft">음성의 억양과 끊어 읽는 리듬감을 귀로 확인하세요.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => playText(currentShadowSentence.en, 1.0)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-ink px-4 py-2 text-[12.5px] font-bold text-white hover:bg-black/90 transition-all cursor-pointer shadow-xs"
              >
                <span>🔊 원어민 소리 듣기</span>
              </button>
            </div>

            {/* Speaking Step 2 with AI Evaluation */}
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.04] p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-white text-xs font-bold">
                  2
                </span>
                <div>
                  <span className="font-bold text-[13.5px] text-ink">마이크를 누르고 섀도잉하여 말하기</span>
                  <p className="text-[12px] text-ink-soft">AI가 내 발음의 정확도, 연음, 억양을 실시간으로 채점합니다.</p>
                </div>
              </div>

              <div className="mt-1">
                <VoiceSpeakingTester
                  targetText={currentShadowSentence.en}
                  buttonLabel="🎙️ 마이크 켜고 소리내어 섀도잉 말하기"
                  onSuccess={(transcript, score) => {
                    setShadowScores((prev) => ({ ...prev, [shadowIndex]: score }));
                  }}
                />
              </div>

              {shadowScores[shadowIndex] !== undefined && (
                <div className="mt-2 flex items-center gap-2 font-mono text-[12px] text-primary font-bold">
                  <span>내 최고 점수: {shadowScores[shadowIndex]}점</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: ⚡ STEP 5 · 1.5배속 뇌 청취 챌린지 & 스크립트 대조 (Speed Ear) */}
      {/* ========================================================================= */}
      {activeTab === "step5_speed" && (
        <div className="flex flex-col gap-6" style={{ animation: "fadeIn 250ms ease both" }}>
          {/* Speed Brain Overclock Hero */}
          <div className="rounded-3xl border border-line bg-raised p-6 shadow-soft flex flex-col gap-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-primary/10 px-3 py-0.5 font-mono text-[11px] font-bold text-primary uppercase border border-primary/20">
                  ⚡ Auditory Brain Overclock
                </span>
                <h2 className="text-[19px] font-bold text-ink mt-1">
                  1.5배속 초고속 청취 챌린지 (Fast-Speed Ear Training)
                </h2>
                <p className="text-[13px] text-ink-soft mt-0.5 leading-relaxed">
                  1.25x와 1.5x 고속 음성으로 뇌 청각 신경을 훈련하면, 평소 빠르다고 느끼던 실전 원어민 대화가 슬로우 모션처럼 또렷하고 여유 있게 들립니다.
                </p>
              </div>

              {/* Big Speed Action Button */}
              <button
                type="button"
                onClick={() => toggleWholePassage(speedRate)}
                className="inline-flex items-center gap-2.5 rounded-full bg-primary px-6 py-3 text-[14.5px] font-bold text-white shadow-md hover:bg-[#967440] active:scale-95 transition-all cursor-pointer"
              >
                <span>{speedPlaying ? "⏹️ 정지" : `⚡ ${speedRate}x 배속 연속 청취`}</span>
              </button>
            </div>

            {/* Speed selection pills */}
            <div className="flex flex-wrap items-center gap-3 border-t border-line pt-3">
              <span className="font-mono text-[11px] font-bold text-ink-faint uppercase">
                청취 난이도 선택:
              </span>
              {[
                { r: 1.0, badge: "🥉 1.0x 표준 속도" },
                { r: 1.25, badge: "🥈 1.25x 실전 회화 속도" },
                { r: 1.5, badge: "🥇 1.5x 초고속 뇌 훈련" },
              ].map((item) => (
                <button
                  key={item.r}
                  type="button"
                  onClick={() => {
                    setSpeedRate(item.r);
                    if (speedPlaying) toggleWholePassage(item.r);
                  }}
                  className={
                    "rounded-xl px-3.5 py-1.5 text-[12px] font-semibold transition-all cursor-pointer shadow-2xs " +
                    (speedRate === item.r
                      ? "bg-ink text-white font-bold"
                      : "border border-line bg-surface text-ink-soft hover:bg-raised hover:text-ink")
                  }
                >
                  {item.badge}
                </button>
              ))}
            </div>
          </div>

          {/* Dual 1:1 Comparative Transcript & Rolling Highlight */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Sentences List */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-[15px] text-ink">
                  📖 원문 & 완역 1:1 대역 스크립트 ({sentences.length}문장)
                </h3>
                <span className="font-mono text-[11px] text-ink-faint">클릭 시 개별 재생</span>
              </div>

              {sentences.map((item, idx) => {
                const isCurrentPlaying = speedPlaying && currentQueueIndex === idx;

                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border p-4 transition-all duration-200 ${
                      isCurrentPlaying
                        ? "border-primary bg-primary/[0.06] shadow-md ring-2 ring-primary/20 scale-[1.01]"
                        : "border-line bg-surface hover:border-line-strong shadow-2xs"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[10.5px] font-bold text-ink-soft">
                          #{idx + 1}
                        </span>
                        <div>
                          <p className="font-mono font-bold text-[14.5px] text-ink leading-relaxed select-text">
                            {item.en}
                          </p>
                          <p className="text-[13px] text-ink-soft mt-1 leading-relaxed select-text">
                            {item.ko}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => playText(item.en, speedRate)}
                        className="shrink-0 rounded-lg border border-line bg-raised px-2.5 py-1 text-[11.5px] font-medium text-ink hover:text-primary hover:border-primary/40 transition-colors cursor-pointer shadow-2xs"
                        title="개별 문장 청취"
                      >
                        🔊 {speedRate}x
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right 1 Col: Smart Learning Notes */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-[15px] text-ink">📝 스마트 청취 노트</h3>
                <span className="font-mono text-[10.5px] text-ink-faint">자동 저장</span>
              </div>

              <div className="flex-1 rounded-2xl border border-line bg-surface p-4 shadow-xs flex flex-col">
                <textarea
                  rows={14}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="들리지 않았던 연음, 새로운 어휘, 섀도잉 발음 팁을 자유롭게 기록해 보세요..."
                  className="w-full flex-1 resize-y rounded-xl border border-line/70 bg-raised/30 p-3 font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
