"use client";

import { useState } from "react";
import { useLicense } from "./LicenseProvider";

export function LicenseModal() {
  const {
    isModalOpen,
    closeModal,
    hasActiveLicense,
    licenseInfo,
    currentDevice,
    activateKey,
    deactivateLicense,
  } = useLicense();

  const [inputCode, setInputCode] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isModalOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);
    try {
      const res = await activateKey(inputCode);
      if (res.success) {
        setFeedback({ type: "success", text: res.message });
        setInputCode("");
      } else {
        setFeedback({ type: "error", text: res.message });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate() {
    if (confirm("현재 기기에서 이용권 등록을 해제하시겠습니까?\n(해제 시 새로운 기기를 등록할 수 있는 슬롯이 반환됩니다)")) {
      await deactivateLicense();
      setFeedback(null);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={closeModal}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] text-[17px] shadow-2xs">
              {hasActiveLicense ? (licenseInfo?.isStudentOnly ? "🎓" : "👑") : "🔑"}
            </div>
            <div>
              <h3 className="text-[17px] font-bold text-ink tracking-tight">
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? "STUDENT 전용 회원"
                    : "올패스 VIP 회원"
                  : "K-IG 이용권 등록"}
              </h3>
              <p className="text-[12px] text-ink-soft mt-0.5">
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? "STUDENT 회화 81개 전 레슨이 활성화되어 있습니다."
                    : "1,677개 모든 레슨이 활성화되어 있습니다."
                  : "발급받으신 코드를 등록하여 학습을 시작하세요."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-faint hover:text-ink hover:bg-raised transition-colors cursor-pointer text-[12px]"
            title="닫기 (ESC)"
          >
            ✕
          </button>
        </div>

        {/* ALREADY ACTIVATED VIEW */}
        {hasActiveLicense && licenseInfo ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-line bg-raised/50 p-4.5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10.5px] font-semibold text-ink-soft uppercase tracking-wider">
                  {licenseInfo.isStudentOnly ? "STUDENT PASS ACTIVE" : "ALL-PASS ACTIVE"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-semibold ${
                    licenseInfo.isStudentOnly
                      ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      licenseInfo.isStudentOnly ? "bg-blue-500" : "bg-emerald-500"
                    }`}
                  />
                  정상 이용 중
                </span>
              </div>

              <div className="flex flex-col gap-0.5">
                <span className="text-[16px] font-bold text-ink tracking-tight">
                  {licenseInfo.planLabel}
                </span>
                <span className="font-mono text-[11.5px] text-ink-faint">
                  코드: {licenseInfo.key}
                </span>
              </div>

              <div className="rounded-xl border border-line/60 bg-surface/70 p-3 flex flex-col gap-1 text-[11.5px] text-ink-soft">
                <div className="flex items-center justify-between">
                  <span>등록 기기: <strong className="text-ink">{currentDevice.name}</strong></span>
                  <span className="font-mono text-[10.5px] text-ink-faint">기기 슬롯 정상 연동</span>
                </div>
                <span className="text-[11px] text-ink-faint">
                  {licenseInfo.isStudentOnly
                    ? "※ STUDENT 회화 81강을 자유롭게 수강하실 수 있습니다."
                    : "※ 최대 2대 기기까지 자동 연동되어 학습하실 수 있습니다."}
                </span>
              </div>

              <div className="border-t border-line/60 pt-2.5 flex flex-wrap items-center justify-between text-[11.5px] text-ink-faint font-mono">
                <span>등록일: {licenseInfo.activatedAt}</span>
                <span>
                  {licenseInfo.expiresAt ? `만료일: ${licenseInfo.expiresAt}` : "만료일: 평생 소장"}
                </span>
              </div>
            </div>

            {/* If on student-only pass, provide upgrade form */}
            {licenseInfo.isStudentOnly && (
              <div className="rounded-xl border border-dashed border-amber-500/40 bg-amber-500/[0.04] p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
                    👑 VIP 올패스로 업그레이드
                  </span>
                  <span className="text-[11px] text-ink-faint">전 강좌(1,677강) 열람</span>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="KIG-1Y-XXXX-XXXX"
                    className="flex-1 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint focus:border-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputCode.trim()}
                    className="rounded-xl bg-ink px-3 py-1.5 text-[12px] font-bold text-white hover:bg-black/80 disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    {isSubmitting ? "확인 중" : "등록"}
                  </button>
                </form>
                {feedback && (
                  <span
                    className={`text-[11.5px] font-medium ${
                      feedback.type === "success" ? "text-emerald-600" : "text-red-500"
                    }`}
                  >
                    {feedback.text}
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleDeactivate}
                className="text-[11.5px] text-ink-faint hover:text-red-500 cursor-pointer underline underline-offset-2 transition-colors"
              >
                이 기기에서 등록 해제
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-full bg-ink px-5 py-2 text-[12.5px] font-semibold text-surface hover:opacity-90 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM VIEW */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-ink-soft">
                이용권 시리얼 코드
              </label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="KIG-1Y-XXXX-XXXX"
                className="w-full rounded-full border border-line bg-raised/50 px-4 py-2.5 font-mono text-[16px] font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors tracking-wide"
                autoFocus
                disabled={isSubmitting}
              />
              <div className="flex items-center justify-between text-[11px] text-ink-faint px-1">
                <span>현재 기기: <strong>{currentDevice.name}</strong></span>
                <span>1인 최대 2대 기기 지원</span>
              </div>
            </div>

            {feedback && (
              <div
                className={`rounded-xl p-3 text-[12px] font-medium animate-in fade-in ${
                  feedback.type === "success"
                    ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-300"
                }`}
              >
                {feedback.text}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-full bg-ink py-2.5 text-[13px] font-semibold text-surface hover:opacity-90 transition-all cursor-pointer shadow-2xs active:scale-[0.99] disabled:opacity-50"
            >
              {isSubmitting ? "인증 확인 중…" : "이용권 코드 등록하기"}
            </button>

            {/* SmartStore / External Purchase Guide */}
            <div className="mt-1 rounded-2xl border border-line bg-raised/40 p-3.5 flex flex-col gap-1.5">
              <span className="text-[11.5px] font-semibold text-ink">
                💡 아직 이용권 코드가 없으신가요?
              </span>
              <p className="text-[11.5px] text-ink-soft leading-relaxed">
                스마트스토어 또는 크몽에서 1년 올패스를 구매하시면 1분 이내로 인증 코드가 발송됩니다.
              </p>
              <div className="mt-1">
                <a
                  href="#buy-smartstore"
                  onClick={(e) => {
                    e.preventDefault();
                    alert("대표님의 네이버 스마트스토어 또는 크몽 상품 판매 링크로 바로 연결할 수 있습니다.");
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/8 dark:border-white/10 bg-surface px-3 py-1 text-[11px] font-medium text-ink hover:bg-raised transition-colors shadow-2xs cursor-pointer"
                >
                  <span>🛒 스마트스토어에서 구매하기</span>
                  <span>→</span>
                </a>
              </div>
            </div>

            <p className="text-center font-mono text-[10.5px] text-ink-faint">
              ※ 각 코스의 1~2강은 이용권 없이도 무료로 상시 체험하실 수 있습니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
