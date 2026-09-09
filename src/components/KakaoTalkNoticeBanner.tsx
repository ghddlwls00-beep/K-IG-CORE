"use client";

import { useEffect, useState } from "react";
import { isKakaoTalk, isInAppBrowser, isAndroid, isIOS } from "@/lib/speech";

const DISMISS_KEY = "kig_iab_banner_dismissed_v1";
const AUTO_ESCAPE_KEY = "kig_android_auto_escape_v1";

export function KakaoTalkNoticeBanner() {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isKakao, setIsKakao] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const kakao = isKakaoTalk();
    const inApp = isInAppBrowser();
    setIsKakao(kakao);

    // Only show if in KakaoTalk or In-App Browser on a mobile device
    if (!kakao && !inApp) return;

    // Check if dismissed in this session
    try {
      const dismissed = sessionStorage.getItem(DISMISS_KEY);
      if (dismissed === "true") return;
    } catch {
      // ignore
    }

    setVisible(true);

    // Android KakaoTalk: attempt safe one-time outlink to Chrome
    if (kakao && isAndroid()) {
      try {
        const alreadyTried = sessionStorage.getItem(AUTO_ESCAPE_KEY);
        if (!alreadyTried) {
          sessionStorage.setItem(AUTO_ESCAPE_KEY, "true");
          const target = window.location.href.replace(/^https?:\/\//i, "");
          const chromeIntent = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
          window.location.href = chromeIntent;
        }
      } catch {
        // ignore
      }
    }
  }, []);

  if (!visible) return null;

  function handleOpenExternal() {
    if (typeof window === "undefined") return;
    const currentUrl = window.location.href;

    if (isAndroid()) {
      // 1. Android: Try Chrome Intent first, then fallback to KakaoTalk openExternal
      const target = currentUrl.replace(/^https?:\/\//i, "");
      const chromeIntent = `intent://${target}#Intent;scheme=https;package=com.android.chrome;end`;
      window.location.href = chromeIntent;
      setTimeout(() => {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      }, 500);
    } else {
      // 2. iOS: KakaoTalk external browser scheme
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
    }
  }

  function handleCopyLink() {
    if (typeof window === "undefined") return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(window.location.href).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        });
      } else {
        const input = document.createElement("input");
        input.value = window.location.href;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {
      alert("링크를 복사할 수 없습니다. 상단 주소창을 복사해 주세요.");
    }
  }

  function handleDismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // ignore
    }
  }

  return (
    <div className="relative z-50 border-b border-amber-300 bg-amber-50 px-3.5 py-2 text-amber-950 shadow-xs transition-all animate-in slide-in-from-top duration-300">
      <div className="mx-auto flex max-w-5xl flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-[12.5px]">
        {/* Notice Info */}
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#FEE500] text-xs font-bold text-[#371D1E] shadow-2xs">
            💬
          </span>
          <div className="leading-snug">
            <span className="font-bold text-[#371D1E]">
              {isKakao ? "카카오톡 브라우저 접속 중" : "인앱 브라우저 접속 중"}
            </span>
            <span className="text-amber-900 ml-1.5 hidden sm:inline">
              · 원활한 원어민 오디오 재생 및 AI 마이크 학습을 위해 Safari 또는 Chrome 브라우저를 권장합니다.
            </span>
            <p className="text-[11px] text-amber-800 sm:hidden mt-0.5">
              원어민 오디오 및 AI 마이크 학습을 위해 Safari 또는 Chrome에서 열어주세요.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleOpenExternal}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1 rounded-lg bg-[#371D1E] px-3 py-1.5 text-[11.5px] font-semibold text-[#FEE500] shadow-xs hover:bg-black transition-colors cursor-pointer"
          >
            <span>🌐</span>
            <span>{isIOS() ? "Safari로 열기" : "Chrome으로 열기"}</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-raised/80 px-2.5 py-1.5 text-[11.5px] font-medium text-amber-900 hover:bg-raised dark:text-amber-200 transition-colors cursor-pointer"
            title="주소 복사"
          >
            <span>{copied ? "✓" : "📋"}</span>
            <span>{copied ? "복사됨!" : "링크 복사"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="안내 닫기"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-amber-700 hover:bg-amber-200/60 transition-colors cursor-pointer text-xs"
            title="인앱에서 계속 학습"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
