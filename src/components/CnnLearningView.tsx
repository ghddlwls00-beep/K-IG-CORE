"use client";

import { useState } from "react";
import type { Block } from "@/lib/types";
import { speakText, stopSpeech } from "@/lib/speech";

interface CnnLearningViewProps {
  blocks: Block[];
  lessonKey: string;
}

export function CnnLearningView({ blocks, lessonKey }: CnnLearningViewProps) {
  const heading = blocks.find((b) => b.type === "heading")?.text || "CNN News Listening";

  const paras = blocks.filter((b) => b.type === "paragraph") as {
    type: "paragraph";
    text: string;
    lang?: "en" | "ko" | "zh";
  }[];

  // 1. Genuine English report paragraphs
  const enReport = paras
    .filter((p) => p.lang === "en" && !p.text.startsWith("ex.") && p.text.trim().length > 20)
    .map((p) => p.text.trim());

  // 2. Korean paragraphs
  const koAll = paras.filter((p) => p.lang === "ko").map((p) => p.text.trim());

  // Check if first Korean entry is the news headline
  let koTitle: string | null = null;
  let koStart = 0;
  if (koAll.length > 0 && !koAll[0].includes(":") && koAll[0].length < 80) {
    koTitle = koAll[0];
    koStart = 1;
  }

  // Pure 1:1 aligned Korean translation paragraphs
  const koReport = koAll.slice(koStart, koStart + enReport.length);

  // Remaining Korean texts are phonetic/grammatical listening tips & cf. glossaries
  const remainingKo = koAll.slice(koStart + enReport.length);
  const phoneticTips = remainingKo.filter(
    (t) =>
      !t.startsWith("cf.") &&
      !/^\d+\)\s+[A-Za-z]/.test(t) &&
      (t.includes("발음") ||
        t.includes("탈락") ||
        t.includes("들리고") ||
        t.includes("축약") ||
        t.includes("유음화") ||
        t.includes("조음위치") ||
        t.includes("약화") ||
        t.includes("모음") ||
        t.includes("자음") ||
        t.includes("강세") ||
        t.includes("이디엄") ||
        t.includes("연음"))
  );

  const extraNotes = remainingKo.filter(
    (t) => !phoneticTips.includes(t) && !t.startsWith("cf.") && !/^\d+\)\s+[A-Za-z]/.test(t)
  );

  // Vocabulary block from sentences
  const vocabBlock = blocks.find((b) => b.type === "sentences") as
    | { type: "sentences"; items: { n: string; text: string }[] }
    | undefined;
  const vocabItems = vocabBlock?.items ?? [];

  const [activeTab, setActiveTab] = useState<"script" | "vocab" | "phonetics">("script");
  const [layoutMode, setLayoutMode] = useState<"paired" | "dual">("paired");
  const [showKoTranslation, setShowKoTranslation] = useState(true);
  const [pinnedSection, setPinnedSection] = useState<number | null>(null);

  const pairCount = Math.max(enReport.length, koReport.length);
  const pairedTranscript: { en: string; ko: string }[] = [];
  for (let i = 0; i < pairCount; i++) {
    pairedTranscript.push({
      en: enReport[i] || "",
      ko: koReport[i] || "",
    });
  }

  function playEnglishSnippet(text: string) {
    stopSpeech();
    speakText(text, { lang: "en", rate: 0.95 });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 1. Header & Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface/90 p-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-600/10 text-[14px] text-red-600 font-bold font-mono">
              CNN
            </span>
            <h2 className="text-[16px] font-bold text-ink">{heading}</h2>
          </div>
          <p className="text-[12px] text-ink-soft mt-1">
            원어 방송 영상을 시청하며 실전 보도 스크립트 대조, 시사 어휘, 연음 청취 비법을 마스터하세요.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center rounded-xl bg-raised/80 p-1 border border-line/70 text-[12px] font-medium">
          <button
            type="button"
            onClick={() => setActiveTab("script")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "script"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 1 · 📰 실전 대본 대조
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vocab")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "vocab"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 3 · 📚 시사 어휘 ({vocabItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("phonetics")}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === "phonetics"
                ? "bg-surface text-ink font-semibold shadow-2xs border border-line/80"
                : "text-ink-soft hover:text-ink"
            }`}
          >
            Step 2 · 🎙️ 연음 디코딩 ({phoneticTips.length})
          </button>
        </div>
      </div>

      {/* Headline Header */}
      {koTitle && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/[0.03] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider">
              국문 헤드라인
            </span>
            <span className="text-[16px] font-bold text-ink font-serif">
              {koTitle}
            </span>
          </div>
          <span className="font-mono text-[11.5px] text-ink-faint">
            총 {enReport.length}개 방송 단락 1:1 대조 완료
          </span>
        </div>
      )}

      {/* TAB 1: NEWS TRANSCRIPT */}
      {activeTab === "script" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="font-mono text-[11.5px] text-ink-faint uppercase font-bold tracking-wider">
              방송 대본 뷰어 (총 {enReport.length}개 보도 단락)
            </span>

            <div className="flex items-center gap-2">
              {/* Active Recall Toggle */}
              <button
                type="button"
                onClick={() => setShowKoTranslation(!showKoTranslation)}
                className={`px-3 py-1.5 rounded-xl border text-[12px] font-semibold transition-all cursor-pointer ${
                  showKoTranslation
                    ? "border-line bg-surface text-ink"
                    : "border-red-500/40 bg-red-500/10 text-red-600 dark:text-red-400 font-bold"
                }`}
              >
                {showKoTranslation ? "💡 한글 번역 켜짐" : "🙈 한글 번역 가리기 (리스닝 훈련)"}
              </button>

              {/* Layout Switcher */}
              <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1 text-[11.5px]">
                <button
                  type="button"
                  onClick={() => setLayoutMode("paired")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${layoutMode === "paired" ? "bg-raised font-bold text-ink shadow-2xs" : "text-ink-soft hover:text-ink"}`}
                >
                  단락별 1:1 직독직해
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("dual")}
                  className={`px-3 py-1 rounded-lg cursor-pointer transition-all ${layoutMode === "dual" ? "bg-raised font-bold text-ink shadow-2xs" : "text-ink-soft hover:text-ink"}`}
                >
                  좌우 나란히 대조
                </button>
              </div>
            </div>
          </div>

          {layoutMode === "paired" ? (
            <div className="flex flex-col gap-4">
              {pairedTranscript.map((item, idx) => {
                const isPinned = pinnedSection === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => setPinnedSection(isPinned ? null : idx)}
                    className={`rounded-2xl border p-5 shadow-2xs flex flex-col gap-3 transition-all cursor-pointer ${
                      isPinned
                        ? "border-red-600/60 bg-red-600/[0.02] ring-2 ring-red-600/20"
                        : "border-line bg-surface hover:border-line-strong"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink font-mono text-[10.5px] font-bold text-surface">
                          {idx + 1}
                        </span>
                        <span className="font-mono text-[11.5px] font-bold text-ink-faint">
                          보도 단락 #{idx + 1}
                        </span>
                      </div>
                      {item.en && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            playEnglishSnippet(item.en);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1 text-[11.5px] font-medium text-ink hover:bg-raised transition-colors cursor-pointer"
                        >
                          🔊 원어민 낭독 듣기
                        </button>
                      )}
                    </div>
                    {item.en && (
                      <p className="text-[15.5px] font-serif leading-relaxed text-ink text-justify">
                        {item.en}
                      </p>
                    )}
                    {item.ko && (
                      <div className="border-t border-line/60 pt-3">
                        {showKoTranslation ? (
                          <p className="text-[14px] leading-relaxed text-ink-soft text-justify animate-in fade-in">
                            <span className="font-mono text-[11px] font-bold text-ink-faint mr-2 uppercase">
                              해석:
                            </span>
                            {item.ko}
                          </p>
                        ) : (
                          <span className="text-[12px] text-ink-faint opacity-50 italic">
                            (한글 번역 가림 모드 활성화됨)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: English Reports */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-mono text-[11.5px] font-bold text-ink uppercase tracking-wider">
                    English Broadcast Report
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-faint">단락 클릭 시 동기화</span>
                </div>
                <div className="flex flex-col gap-4">
                  {enReport.map((text, i) => {
                    const isPinned = pinnedSection === i;
                    return (
                      <div
                        key={i}
                        onClick={() => setPinnedSection(isPinned ? null : i)}
                        className={`rounded-xl p-3 transition-all cursor-pointer ${
                          isPinned
                            ? "bg-ink text-surface font-medium shadow-xs"
                            : "hover:bg-raised text-ink"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className={`font-mono text-[10.5px] font-bold ${isPinned ? "text-surface/75" : "text-ink-faint"}`}>
                            [{i + 1}]
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              playEnglishSnippet(text);
                            }}
                            className={`text-[10.5px] cursor-pointer ${isPinned ? "text-surface/80 hover:text-surface" : "text-ink-faint hover:text-ink"}`}
                          >
                            🔊
                          </button>
                        </div>
                        <p className="text-[14.5px] font-serif leading-relaxed text-justify">
                          {text}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right: Korean Translation */}
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-xs flex flex-col gap-4">
                <div className="flex items-center justify-between border-b border-line/60 pb-2">
                  <span className="font-mono text-[11.5px] font-bold text-ink-soft uppercase tracking-wider">
                    Korean Translation (1:1 완역 대조)
                  </span>
                  <span className="font-mono text-[10.5px] text-ink-faint">1:1 일치 단락</span>
                </div>
                <div className="flex flex-col gap-4">
                  {koReport.map((text, i) => {
                    const isPinned = pinnedSection === i;
                    return (
                      <div
                        key={i}
                        onClick={() => setPinnedSection(isPinned ? null : i)}
                        className={`rounded-xl p-3 transition-all cursor-pointer ${
                          isPinned
                            ? "bg-red-600/10 text-ink ring-2 ring-red-600/30 font-medium"
                            : "hover:bg-raised text-ink-soft hover:text-ink"
                        }`}
                      >
                        <span className="font-mono text-[10.5px] font-bold text-ink-faint mb-1.5 block">
                          [{i + 1}]
                        </span>
                        {showKoTranslation ? (
                          <p className="text-[13.5px] leading-relaxed text-justify">
                            {text}
                          </p>
                        ) : (
                          <span className="text-[12px] text-ink-faint opacity-50 italic">
                            (한글 번역 가림 모드)
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VOCABULARY GLOSSARY */}
      {activeTab === "vocab" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">📚 뉴스 어휘 사전:</span> 본 뉴스 클립에 등장하는 핵심 시사 어휘, 관용구, 정치/경제 전문 용어 해설입니다.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {vocabItems.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-4 shadow-2xs hover:border-line-strong transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[13.5px] font-bold text-ink text-primary">
                    {item.n}
                  </span>
                  <button
                    type="button"
                    onClick={() => speakText(item.n.replace(/^\d+\)\s*/, ""), { lang: "en" })}
                    className="text-[11px] text-ink-faint hover:text-ink cursor-pointer"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-[13px] text-ink-soft leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: PHONETIC TIPS */}
      {activeTab === "phonetics" && (
        <div className="flex flex-col gap-3">
          <div className="rounded-xl border border-line bg-surface p-4 text-[13px] text-ink-soft leading-relaxed shadow-2xs">
            <span className="font-semibold text-ink">🎙️ 원어민 청취 & 연음 해설:</span> 뉴스 앵커와 리포터의 빠른 발화에서 일어나는 자음 탈락, 영국식 모음 변화, 축약 발음 포인트입니다.
          </div>

          <div className="flex flex-col gap-3">
            {phoneticTips.map((tip, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4 shadow-2xs"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-raised font-mono text-[11px] font-bold text-ink">
                  {idx + 1}
                </span>
                <p className="text-[14px] text-ink leading-relaxed font-medium">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
