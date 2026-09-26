"use client";

import { useEffect, useRef, useState } from "react";
import {
  evaluatePronunciation,
  isSpeechRecognitionSupported,
  listenToSpeech,
  type EvaluationResult,
  type VoiceRecognizerHandle,
} from "@/lib/speechRecognition";
import { isKakaoTalk, isInAppBrowser, isIOS, isAndroid } from "@/lib/speech";

export interface VoiceSpeakingTesterProps {
  targetText: string;
  onSuccess?: (transcript: string, score: number) => void;
  compact?: boolean;
  buttonLabel?: string;
  /**
   * 2026-09-27 (GRM-U09): draw nothing where the browser has no speech recognition, so a view that
   * lists 40 sentences can say it ONCE at the top instead of 40 identical notices. Default false —
   * every other caller keeps the notice exactly as before.
   */
  hideWhenUnsupported?: boolean;
}

/*
 * 2026-09-27 (docs/디자인-규칙.md · GRM-U04 · GRM-U27): the design tokens only (ink · success · danger),
 * 44px controls, no blinking, SVG icons instead of emoji. The score is a WORD-MATCH score, so the word
 * row is labelled '알아들은 낱말' and each word '인식됨 / 인식 안 됨' — it used to promise a pronunciation
 * judgement ('단어별 발음 일치도', '정확히 일치한 발음') this component never makes. Every text and
 * element the audit helpers read is kept: the trigger title, '듣고 있는 중', 'N점 (…)', '↺ 다시 녹음',
 * '인식된 내 음성:' + the quoted <p>, the 'N점' badge span, '단어 일치 N/M', the error <span>, and
 * '지원되지 않는 브라우저'. The word chips also carry data-matched for the helpers.
 */

function MicIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-danger">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5" />
      <path d="M12 16.5h.01" />
    </svg>
  );
}

export function VoiceSpeakingTester({
  targetText,
  onSuccess,
  compact = false,
  buttonLabel = "마이크로 발음 테스트",
  hideWhenUnsupported = false,
}: VoiceSpeakingTesterProps) {
  const [supported, setSupported] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const recognizerRef = useRef<VoiceRecognizerHandle | null>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      if (recognizerRef.current) {
        recognizerRef.current.abort();
      }
    };
  }, []);

  function handleStartListening() {
    if (isListening) {
      handleStopListening();
      return;
    }
    setErrorMessage(null);
    setInterimText("");
    setResult(null);

    const handle = listenToSpeech({
      lang: "en-US",
      onStart: () => {
        setIsListening(true);
      },
      onInterim: (interim) => {
        setInterimText(interim);
      },
      onResult: (transcript) => {
        setIsListening(false);
        const evalResult = evaluatePronunciation(transcript, targetText);
        setResult(evalResult);
        if (onSuccess) {
          onSuccess(transcript, evalResult.score);
        }
      },
      onError: (err) => {
        setIsListening(false);
        setErrorMessage(err);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
    recognizerRef.current = handle;
  }

  function handleStopListening() {
    if (recognizerRef.current) {
      recognizerRef.current.stop();
    }
    setIsListening(false);
  }

  function handleReset() {
    setResult(null);
    setInterimText("");
    setErrorMessage(null);
    handleStartListening();
  }

  function openExternalBrowser() {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;
    if (isAndroid()) {
      const target = currentUrl.replace(/^https?:\/\//i, "");
      window.location.href = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
      setTimeout(() => {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      }, 500);
    } else {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    }
  }

  const externalButton = (
    <button
      type="button"
      onClick={openExternalBrowser}
      className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
    >
      {isIOS() ? "Safari로 열기" : "Chrome으로 열기"}
    </button>
  );

  if (!supported) {
    if (hideWhenUnsupported) return null;
    const isRestricted = isKakaoTalk() || isInAppBrowser();
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-control border border-line bg-surface px-3 py-2 text-caption text-ink-soft">
        <span>
          {isRestricted
            ? "카카오톡 브라우저는 보안상 마이크 음성 인식이 지원되지 않습니다."
            : "(마이크 음성 인식이 지원되지 않는 브라우저입니다. Chrome 또는 Safari를 권장합니다.)"}
        </span>
        {isRestricted && externalButton}
      </div>
    );
  }

  const cleanLabel = buttonLabel.replace(/^🎙️\s*/, "");

  return (
    <div className="flex flex-col gap-2">
      {/* Trigger & Status Button */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleStartListening}
          className={
            "inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-label font-medium transition-colors cursor-pointer select-none " +
            (isListening
              ? "border-danger bg-danger/10 text-danger"
              : result
              ? result.score >= 80
                ? "border-success/60 bg-success/10 text-success hover:bg-success/15"
                : "border-line bg-raised text-ink hover:bg-sunken"
              : "border-line bg-raised text-ink-soft hover:bg-sunken")
          }
          title="마이크를 누르고 영어 문장을 소리내어 말해보세요."
        >
          {isListening ? <StopIcon /> : <MicIcon />}
          <span>
            {isListening
              ? "듣고 있는 중... (말씀하세요)"
              : result
              ? `${result.score}점 (${result.ratingLabel})`
              : cleanLabel}
          </span>
        </button>

        {result && (
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex min-h-11 items-center rounded-control px-3 text-label text-ink-soft transition-colors cursor-pointer hover:bg-sunken"
            title="다시 말하기"
          >
            ↺ 다시 녹음
          </button>
        )}
      </div>

      {/* Listening State Preview */}
      {isListening && (
        <div className="flex items-center gap-2 rounded-control border border-danger/30 px-3 py-2 text-label text-ink">
          <span aria-hidden className="h-2.5 w-2.5 shrink-0 rounded-full bg-danger" />
          <div className="min-w-0 flex-1">
            <span className="block text-caption text-ink-soft">실시간 음성 인식:</span>
            <span className="font-semibold italic text-ink">
              {interimText || "지금 영어로 말씀하세요..."}
            </span>
          </div>
          <button
            type="button"
            onClick={handleStopListening}
            className="inline-flex min-h-11 shrink-0 items-center rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken"
          >
            완료
          </button>
        </div>
      )}

      {/* Error Notice */}
      {errorMessage && (
        <div className="flex flex-col items-start justify-between gap-2 rounded-control border border-danger/30 px-3 py-2 text-label text-ink sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5">
            <AlertIcon />
            <span>{errorMessage}</span>
          </div>
          {(isKakaoTalk() || isInAppBrowser()) && externalButton}
        </div>
      )}

      {/* Evaluation Results Card */}
      {result && !isListening && (
        <div
          className={
            "flex flex-col gap-2 rounded-control border px-3 py-3 text-label " +
            (result.score >= 85 ? "border-success/40" : result.score >= 60 ? "border-line" : "border-danger/40")
          }
        >
          {/* Header & Score Badge */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className={
                  "rounded-control px-2 py-0.5 text-label font-bold tabular-nums " +
                  (result.score >= 85
                    ? "bg-success/10 text-success"
                    : result.score >= 60
                    ? "bg-sunken text-ink"
                    : "bg-danger/10 text-danger")
                }
              >
                {result.score}점
              </span>
              <span className="font-semibold text-ink">{result.ratingLabel}</span>
            </div>
            <span className="text-caption tabular-nums text-ink-faint">
              단어 일치 {result.matchedCount}/{result.totalWords}
            </span>
          </div>

          {/* User Spoken Transcript */}
          <div className="border-t border-line pt-2">
            <span className="block text-caption text-ink-faint">인식된 내 음성:</span>
            <p className="mt-0.5 font-medium italic text-ink">
              &quot;{result.transcript}&quot;
            </p>
          </div>

          {/* Word-by-word recognition (what the recogniser heard, not a pronunciation grade) */}
          <div className="flex flex-col gap-1">
            <span className="text-caption text-ink-faint">알아들은 낱말:</span>
            <div className="flex flex-wrap items-center gap-1 font-medium" data-word-analysis>
              {result.wordAnalysis.map((item, idx) => (
                <span
                  key={idx}
                  data-matched={item.matched ? "true" : "false"}
                  className={
                    "rounded-control px-1.5 py-0.5 " +
                    (item.matched ? "bg-success/10 font-semibold text-success" : "bg-danger/10 text-danger line-through")
                  }
                  title={item.matched ? "인식됨" : "인식 안 됨"}
                >
                  {item.word}
                </span>
              ))}
            </div>
          </div>

          {/* Feedback */}
          <p className="border-t border-line pt-1.5 text-caption text-ink-soft">{result.feedback}</p>
        </div>
      )}
    </div>
  );
}
