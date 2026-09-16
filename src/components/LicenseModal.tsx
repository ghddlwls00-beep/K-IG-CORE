"use client";

import { useEffect, useRef, useState } from "react";
import { useLicense } from "./LicenseProvider";

const PURCHASE_URL = process.env.NEXT_PUBLIC_PURCHASE_URL?.trim() || "";
const HAS_PURCHASE_URL = /^https:\/\//i.test(PURCHASE_URL);

/**
 * What an issued key looks like — `KIG-<PLAN>-<16 hex>-<16 hex>`, see
 * `serverLicense.ts`. The placeholder used to show four-character groups that
 * no real key has (UX-01).
 */
const KEY_PLACEHOLDER = "KIG-1Y-XXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXX";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A11Y-01: this is a dialog, so it behaves like one — Escape closes it, Tab
 * cycles inside it, the field has a real label, errors are announced, and
 * closing returns focus to the button that opened it. It used to be a div
 * whose "닫기 (ESC)" tooltip promised a key that did nothing, and Tab left the
 * modal for the page underneath on the second press.
 */
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Remember what had focus when the dialog opened, move focus inside, and put
  // it back when the dialog closes. The opener is read here, in the effect,
  // because it is still the active element at that point — nothing in the
  // dialog has been focused yet.
  useEffect(() => {
    if (!isModalOpen) return;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    const field = dialog?.querySelector<HTMLElement>("input:not([disabled])");
    (field ?? dialog)?.focus();
    return () => {
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener && document.contains(opener)) opener.focus();
    };
  }, [isModalOpen]);

  if (!isModalOpen) return null;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal();
      return;
    }
    if (e.key !== "Tab" || !dialogRef.current) return;
    const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null,
    );
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

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
      aria-labelledby="license-modal-title"
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={closeModal}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 sm:p-7 shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-150 focus:outline-none"
      >
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] text-[17px] shadow-2xs" aria-hidden="true">
              {hasActiveLicense ? (licenseInfo?.isStudentOnly ? "🎓" : "👑") : "🔑"}
            </div>
            <div>
              <h3 id="license-modal-title" className="text-[17px] font-bold text-ink tracking-tight">
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? "STUDENT 전용 회원"
                    : "올패스 VIP 회원"
                  : "K-IG 이용권 등록"}
              </h3>
              <p className="text-[12px] text-ink-soft mt-0.5">
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? "STUDENT 이용권이 활성화되어 챕터 1부터 순차적으로 학습할 수 있습니다."
                    : "전체 유료 레슨이 활성화되어 있습니다."
                  : "발급받으신 코드를 등록하여 학습을 시작하세요."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-faint hover:text-ink hover:bg-raised transition-colors cursor-pointer text-[12px]"
            title="닫기 (ESC)"
            aria-label="닫기"
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
                    ? "※ 학습 완료 조건을 충족하면 다음 챕터가 순서대로 열립니다."
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
                  <label htmlFor="license-upgrade-code" className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
                    👑 VIP 올패스로 업그레이드
                  </label>
                  <span className="text-[11px] text-ink-faint">전 강좌 열람</span>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    id="license-upgrade-code"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={KEY_PLACEHOLDER}
                    className="flex-1 min-w-0 rounded-xl border border-line bg-surface px-3 py-1.5 font-mono text-[13px] font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint focus:border-ink focus:outline-none"
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
                    role="alert"
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
              <label htmlFor="license-code" className="text-[12px] font-medium text-ink-soft">
                이용권 시리얼 코드
              </label>
              <input
                id="license-code"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder={KEY_PLACEHOLDER}
                aria-describedby="license-code-hint"
                className="w-full rounded-full border border-line bg-raised/50 px-4 py-2.5 font-mono text-[16px] font-bold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-[13px] placeholder:text-ink-faint focus:border-ink focus:bg-surface focus:outline-none transition-colors tracking-wide"
                disabled={isSubmitting}
              />
              <div id="license-code-hint" className="flex items-center justify-between text-[11px] text-ink-faint px-1">
                <span>현재 기기: <strong>{currentDevice.name}</strong></span>
                <span>1인 최대 2대 기기 지원</span>
              </div>
            </div>

            {feedback && (
              <div
                role="alert"
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
                공식 판매처에서 이용권을 구매한 뒤 발급받은 인증 코드를 등록해 주세요.
              </p>
              <div className="mt-1">
                {HAS_PURCHASE_URL ? (
                <a
                  href={PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full border border-black/8 dark:border-white/10 bg-surface px-3 py-1 text-[11px] font-medium text-ink hover:bg-raised transition-colors shadow-2xs cursor-pointer"
                >
                  <span>🛒 이용권 구매하기</span>
                  <span>→</span>
                </a>
                ) : (
                  <span className="inline-flex items-center rounded-full border border-line bg-surface px-3 py-1 text-[11px] font-medium text-ink-faint">
                    구매 링크 준비 중
                  </span>
                )}
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
