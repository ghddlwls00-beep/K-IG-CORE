"use client";

import { useState } from "react";
import { useLicense } from "./LicenseProvider";

export function LicenseModal() {
  const { isModalOpen, closeModal, hasActiveLicense, licenseInfo, activateKey, deactivateLicense } =
    useLicense();
  const [inputCode, setInputCode] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (!isModalOpen) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    const res = activateKey(inputCode);
    if (res.success) {
      setFeedback({ type: "success", text: res.message });
      setInputCode("");
    } else {
      setFeedback({ type: "error", text: res.message });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl border border-black/10 bg-white p-7 sm:p-8 shadow-2xl flex flex-col gap-6 animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-[20px] text-amber-600">
              {hasActiveLicense ? "👑" : "🔑"}
            </div>
            <div>
              <h3 className="text-[19px] font-bold text-ink tracking-tight">
                {hasActiveLicense ? "프리미엄 VIP 회원" : "K-IG 올패스 이용권 등록"}
              </h3>
              <p className="text-[12.5px] text-ink-soft mt-0.5">
                {hasActiveLicense
                  ? "1,677개 모든 교육 코스가 정상 활성화되어 있습니다."
                  : "구매하신 인증 코드를 입력하여 전 코스를 무제한으로 학습하세요."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="rounded-full p-2 text-ink-faint hover:bg-black/5 hover:text-ink transition-colors cursor-pointer"
            title="닫기"
          >
            ✕
          </button>
        </div>

        {/* ALREADY ACTIVATED VIEW */}
        {hasActiveLicense && licenseInfo ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.04] p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                  ACTIVATED LICENSE
                </span>
                <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                  ✓ 이용 중
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[18px] font-bold text-ink">
                  {licenseInfo.planLabel}
                </span>
                <span className="font-mono text-[12px] text-ink-soft">
                  인증 코드: {licenseInfo.key}
                </span>
              </div>

              <div className="border-t border-emerald-500/20 pt-3 flex flex-wrap items-center justify-between text-[12px] text-ink-soft">
                <span>등록일: {licenseInfo.activatedAt}</span>
                <span>
                  {licenseInfo.expiresAt ? `만료일: ${licenseInfo.expiresAt}` : "만료일: 무제한 영구 소장"}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  if (confirm("현재 기기에서 이용권 등록을 해제하시겠습니까?")) {
                    deactivateLicense();
                    setFeedback(null);
                  }
                }}
                className="text-[11.5px] text-ink-faint hover:text-red-600 cursor-pointer underline"
              >
                이용권 등록 해제 (다른 코드로 변경)
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-xl bg-ink px-6 py-2.5 text-[13px] font-semibold text-white hover:bg-black/80 transition-colors cursor-pointer shadow-xs"
              >
                확인 완료
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM VIEW */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-[12.5px] font-semibold text-ink">
                이용권 시리얼 코드 (16자리)
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="KIG-1Y-XXXX-XXXX"
                className="w-full rounded-xl border border-black/15 bg-black/[0.02] px-4 py-3 font-mono text-[16px] font-bold text-ink placeholder:text-ink-faint focus:border-ink focus:bg-white focus:outline-none transition-colors"
                autoFocus
              />
              <span className="text-[11.5px] text-ink-faint">
                스마트스토어, 크몽 또는 카카오톡 메시지로 발송된 코드를 입력해 주세요.
              </span>
            </div>

            {feedback && (
              <div
                className={`rounded-xl p-3.5 text-[13px] font-medium animate-in fade-in ${
                  feedback.type === "success"
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-800"
                    : "border border-red-500/30 bg-red-500/10 text-red-600"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              className="mt-1 w-full rounded-xl bg-ink py-3 text-[14px] font-bold text-white hover:bg-black/80 transition-colors cursor-pointer shadow-sm active:scale-[0.99]"
            >
              이용권 즉시 등록 & 전체 해제하기
            </button>

            {/* SmartStore / External Purchase Guide */}
            <div className="mt-2 rounded-2xl border border-black/[0.07] bg-gray-50/80 p-4 flex flex-col gap-2">
              <span className="text-[12px] font-bold text-ink">
                💡 아직 이용권 코드가 없으신가요?
              </span>
              <p className="text-[12px] text-ink-soft leading-relaxed">
                스마트스토어 또는 크몽에서 1년 올패스를 구매하시면 1분 이내로 인증 코드가 발송됩니다.
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <a
                  href="#buy-smartstore"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("대표님의 네이버 스마트스토어 또는 크몽 상품 판매 링크로 바로 연결할 수 있습니다.");
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[11.5px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors shadow-2xs"
                >
                  <span>🛒 스마트스토어에서 구매하기</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <p className="text-center font-mono text-[11px] text-ink-faint mt-1">
              ※ 각 코스 1~2강은 이용권 없이도 무료로 체험하실 수 있습니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
