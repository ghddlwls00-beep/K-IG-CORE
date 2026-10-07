"use client";

import { useEffect, useState } from "react";
import { isKakaoTalk, isInAppBrowser, isAndroid, isIOS } from "@/lib/speech";
import { IconCheck, IconX } from "./icons";

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
      alert("주소를 복사하지 못했어요. 위 주소창의 주소를 복사해 주세요.");
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

  // 2026-10-07 (UI검토-1007 19 · 61): the site's own colours and sizes instead of KakaoTalk yellow and amber (the same light
  // amber in dark mode), 11–12.5px text and 29–31px buttons; line icons instead of 💬 · 🌐 · 📋; plain words. One filled button
  // (open in the phone's browser), an outlined '주소 복사', a 44px close. What the buttons do — and the one automatic move to
  // Chrome on Android, which is the owner's call (4장 10) — is unchanged.
  const browser = isIOS() ? "Safari" : "Chrome";
  return (
    <div role="region" aria-label="브라우저 안내" className="relative z-50 border-b border-line bg-sunken px-4 py-2 text-ink">
      <div className="mx-auto flex max-w-5xl flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <p className="text-label leading-snug">
          <span className="font-semibold">{isKakao ? "카카오톡 안에서 열었어요." : "앱 안의 브라우저에서 열었어요."}</span>{" "}
          <span className="text-ink-soft">소리와 마이크는 {browser}에서 잘 돼요.</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenExternal}
            className="btn-filled inline-flex min-h-11 flex-1 items-center justify-center rounded-control px-4 text-label font-semibold transition-colors sm:flex-none"
          >
            {isIOS() ? "Safari로 열기" : "Chrome으로 열기"}
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-medium text-ink transition-colors hover:bg-surface cursor-pointer"
          >
            {copied ? <IconCheck size={16} className="text-success" /> : null}
            <span>{copied ? "복사했어요" : "주소 복사"}</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="안내 닫기"
            title="이 브라우저에서 계속하기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-raised hover:text-ink cursor-pointer"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
