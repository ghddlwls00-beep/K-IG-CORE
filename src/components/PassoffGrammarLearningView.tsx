"use client";

import { useEffect, useState } from "react";
import type { Block } from "@/lib/types";
import type { PassoffAnchor } from "@/lib/passoffTypes";
import { speakText, stopSpeech } from "@/lib/speech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { useLicense } from "./LicenseProvider";

/**
 * PASS-OFF GRAMMAR lesson view (docs/pass-off-grammar/설계.md §3).
 *
 * STAGE A (course registration) draws step ① — 예문 떠올리기: the Korean first, "영어 보기"
 * two seconds later, then the English and its sound. Steps ②~⑤ (rule · form · composition ·
 * wrap-up) come with stage B, in this same component, so every lesson keeps one view.
 *
 * It receives ONE lesson's blocks as props, after the server gate (ISS-00 — never import lesson
 * JSON here). On a free preview lesson the server leaves out the paid STUDENT sentences and passes
 * how many there are (`lockedExtraCount`, src/lib/passoffContent.ts).
 *
 * Design rules (docs/디자인-규칙.md, 설계 §15): tokens only, line icons, 44px targets, the six type
 * sizes. The shared step tabs and end bar replace the local header once the common frame lands.
 */
export function PassoffGrammarLearningView({
  blocks,
  lessonKey,
  lockedExtraCount = 0,
}: {
  blocks: Block[];
  lessonKey: string;
  lockedExtraCount?: number;
}) {
  const anchors: PassoffAnchor[] = blocks.flatMap((b) => (b.type === "anchors" ? b.items : []));
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [ready, setReady] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const { openModal } = useLicense();

  // "영어 보기" wakes after two seconds, so the learner tries to recall first (설계 §3 ①).
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 2000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  function play(anchor: PassoffAnchor) {
    if (speakingId === anchor.id) {
      stopSpeech();
      setSpeakingId(null);
      return;
    }
    stopSpeech();
    setSpeakingId(anchor.id);
    // the same string scripts/lib/spoken-texts.cjs lists for this page — its clip key must match
    speakText(lessonSpeechForm(lessonKey, anchor.en), {
      lang: "en",
      onStart: () => setSpeakingId(anchor.id),
      onEnd: () => setSpeakingId((curr) => (curr === anchor.id ? null : curr)),
      onError: () => setSpeakingId((curr) => (curr === anchor.id ? null : curr)),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="passoff-step-1" className="flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-[14px] font-semibold text-primary tabular-nums">1단계</span>
          <h2 id="passoff-step-1" className="text-[18px] font-bold text-ink">
            예문 떠올리기
          </h2>
        </div>
        <p className="text-[14px] leading-relaxed text-ink-soft">
          한국어를 보고 영어 문장을 먼저 떠올려 보세요. 떠올린 뒤 &lsquo;영어 보기&rsquo;를 누르세요.
        </p>

        <ol className="flex flex-col gap-3">
          {anchors.map((anchor, index) => {
            const shown = Boolean(revealed[anchor.id]);
            const speaking = speakingId === anchor.id;
            return (
              <li key={anchor.id} className="rounded-2xl border border-line bg-surface p-4">
                <div className="flex gap-3">
                  <span className="w-6 shrink-0 pt-0.5 text-right text-[14px] font-semibold tabular-nums text-ink-faint">
                    {index + 1}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-3">
                    <p className="text-[16px] leading-relaxed text-ink">{anchor.ko}</p>
                    {shown ? (
                      <div className="flex items-start justify-between gap-3">
                        <p lang="en" className="text-[16px] font-semibold leading-relaxed text-ink">
                          {anchor.en}
                        </p>
                        <button
                          type="button"
                          onClick={() => play(anchor)}
                          aria-label={speaking ? "문장 멈추기" : "문장 듣기"}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft hover:border-line-strong hover:text-ink"
                        >
                          {speaking ? <StopIcon /> : <SpeakerIcon />}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => setRevealed((prev) => ({ ...prev, [anchor.id]: true }))}
                        className="min-h-11 self-start rounded-xl bg-ink px-4 text-[14px] font-semibold text-surface disabled:opacity-40"
                      >
                        영어 보기
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {lockedExtraCount > 0 ? (
        // LicenseProvider reloads the page once a licence is verified while this is on screen,
        // so the server can add the sentences (data-kig-paid-extra, like the paywall's marker).
        <section
          data-kig-paid-extra="license"
          className="flex flex-col gap-3 rounded-2xl border border-line bg-raised p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-[16px] text-ink">
            <LockIcon />
            <span>이용권이 있으면 {lockedExtraCount}문장 더 풀 수 있습니다.</span>
          </p>
          <button
            type="button"
            onClick={openModal}
            className="min-h-11 rounded-xl border border-line-strong px-4 text-[14px] font-semibold text-ink hover:bg-sunken"
          >
            이용권 코드 등록
          </button>
        </section>
      ) : null}
    </div>
  );
}

function SpeakerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
      <rect x="6.5" y="6.5" width="11" height="11" rx="1.5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-ink-soft">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
