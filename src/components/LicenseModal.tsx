"use client";

import { useEffect, useRef, useState } from "react";
import { useLicense } from "./LicenseProvider";
import { STUDENT_PASS_SCOPE } from "@/lib/license";
import { IconCheck, IconLock, IconX } from "./icons";

/**
 * Where a learner buys a pass. 2026-10-07 (UI검토-1007 결과.md 2번 · 사장님): while the store address is not set,
 * nothing about buying is drawn — no '구매 안내' on the paywall, no '구매 링크 준비 중' here (a button that led
 * nowhere). Set NEXT_PUBLIC_PURCHASE_URL (https) and '이용권 구매하기' appears here and on the paywall, opening
 * the store in a new tab. LessonPaywall reads these two as well, so both screens change together.
 */
export const PURCHASE_URL = process.env.NEXT_PUBLIC_PURCHASE_URL?.trim() || "";
export const HAS_PURCHASE_URL = /^https:\/\//i.test(PURCHASE_URL);

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
 *
 * 2026-10-07 (UI검토-1007 결과.md 3번 · docs/디자인-규칙.md): the same calm look as the paywall and the lessons —
 * line icons instead of 🔑 · 👑 · 🎓 · 💡 · 🛒, no English capital labels ('ALL-PASS ACTIVE'), no monospace or
 * letter-spaced Korean, nothing under 12px, a 44px close button, one box (rows divided by lines, not boxes in
 * boxes), and one set of names ('과정' · '이용권 코드'). 'VIP' stays (사장님 2026-10-07: product name).
 * What registering does is unchanged to the letter: the same fields (#license-code · #license-upgrade-code),
 * the same handlers, the same activateKey / deactivateLicense calls.
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

  // One line under a form: the server's answer, in the right/wrong colour (no tinted box).
  const feedbackLine = feedback ? (
    <p role="alert" className={`text-label font-medium ${feedback.type === "success" ? "text-success" : "text-danger"}`}>
      {feedback.text}
    </p>
  ) : null;

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
        className="flex max-h-[calc(100dvh-2rem)] w-full max-w-md flex-col gap-5 overflow-y-auto rounded-card border border-line bg-surface p-5 shadow-2xl animate-in zoom-in-95 duration-150 focus:outline-none sm:p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line text-ink-soft">
              {hasActiveLicense ? <IconCheck size={18} className="text-success" /> : <IconLock size={18} />}
            </div>
            <div className="min-w-0">
              <h3 id="license-modal-title" className="text-title-s font-bold text-ink">
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? "STUDENT 패스 회원"
                    : "올패스 VIP 회원"
                  : "이용권 등록"}
              </h3>
              <p className="mt-0.5 text-label leading-relaxed text-ink-soft">
                {/* what the pass opens comes from license.ts (STUDENT_PASS_SCOPE), so it cannot drift from the gate */}
                {hasActiveLicense
                  ? licenseInfo?.isStudentOnly
                    ? `STUDENT 이용권으로 ${STUDENT_PASS_SCOPE}를 1장부터 차례대로 학습할 수 있습니다.`
                    : "모든 유료 강의를 학습할 수 있습니다."
                  : "받은 코드를 등록하면 바로 학습할 수 있습니다."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={closeModal}
            className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-control text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
            title="닫기 (ESC)"
            aria-label="닫기"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* ALREADY ACTIVATED VIEW */}
        {hasActiveLicense && licenseInfo ? (
          <div className="flex flex-col gap-5">
            {/* the pass, as rows divided by lines (no box inside the box) */}
            <dl className="divide-y divide-line border-y border-line text-label">
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="text-ink-soft">상태</dt>
                <dd className="flex items-center gap-1.5 font-medium text-ink">
                  <IconCheck size={14} className="text-success" />
                  정상 이용 중
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-ink-soft">이용권</dt>
                <dd className="min-w-0 text-right font-semibold text-ink">{licenseInfo.planLabel}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-ink-soft">이용권 코드</dt>
                {/* BUG-018: the browser keeps only a masked copy of the code. The code itself is letters and
                    digits (monospace is for code); the Korean fallback is set in the normal face. */}
                <dd className="min-w-0 truncate text-right text-ink">
                  {licenseInfo.maskedKey ? <span className="font-mono">{licenseInfo.maskedKey}</span> : "가려서 보관 중"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-ink-soft">이 기기</dt>
                <dd className="min-w-0 truncate text-right text-ink">{currentDevice.name}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-ink-soft">등록일</dt>
                <dd className="text-right tabular-nums text-ink">{licenseInfo.activatedAt}</dd>
              </div>
              <div className="flex items-center justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-ink-soft">만료일</dt>
                <dd className="text-right tabular-nums text-ink">{licenseInfo.expiresAt ? licenseInfo.expiresAt : "평생 소장"}</dd>
              </div>
            </dl>

            <p className="-mt-2 text-caption text-ink-soft">
              {licenseInfo.isStudentOnly
                ? "학습 완료 조건을 채우면 다음 장이 차례대로 열립니다."
                : "한 사람이 기기 2대까지 쓸 수 있습니다."}
            </p>

            {/* If on student-only pass, provide upgrade form */}
            {licenseInfo.isStudentOnly && (
              <div className="flex flex-col gap-2 border-t border-line pt-4">
                <div className="flex items-baseline justify-between gap-3">
                  <label htmlFor="license-upgrade-code" className="text-label font-semibold text-ink">
                    VIP 올패스로 업그레이드
                  </label>
                  <span className="shrink-0 text-caption text-ink-soft">모든 과정 학습</span>
                </div>
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    id="license-upgrade-code"
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={KEY_PLACEHOLDER}
                    className="min-h-11 min-w-0 flex-1 text-ellipsis rounded-control border border-line bg-raised px-3 font-mono text-body font-semibold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint focus:border-ink focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting || !inputCode.trim()}
                    className="min-h-11 shrink-0 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-40"
                  >
                    {isSubmitting ? "확인 중" : "등록"}
                  </button>
                </form>
                {feedbackLine}
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDeactivate}
                className="-ml-2 min-h-11 rounded-control px-2 text-label text-ink-soft underline underline-offset-2 transition-colors cursor-pointer hover:text-danger"
              >
                이 기기에서 등록 해제
              </button>

              <button
                type="button"
                onClick={closeModal}
                className="min-h-11 rounded-control bg-ink px-6 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
              >
                확인
              </button>
            </div>
          </div>
        ) : (
          /* REGISTRATION FORM VIEW */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="license-code" className="text-label font-medium text-ink">
                이용권 코드
              </label>
              <input
                id="license-code"
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder={KEY_PLACEHOLDER}
                aria-describedby="license-code-hint"
                className="min-h-12 w-full text-ellipsis rounded-control border border-line bg-raised px-4 font-mono text-body font-semibold text-ink placeholder:font-sans placeholder:font-normal placeholder:text-ink-faint focus:border-ink focus:outline-none transition-colors"
                disabled={isSubmitting}
              />
              <p id="license-code-hint" className="flex flex-wrap justify-between gap-x-3 text-caption text-ink-soft">
                <span>이 기기: {currentDevice.name}</span>
                <span>한 사람이 기기 2대까지</span>
              </p>
            </div>

            {feedbackLine}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex min-h-12 w-full items-center justify-center rounded-control bg-ink text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              {isSubmitting ? "확인 중…" : "이용권 코드 등록하기"}
            </button>

            {/* Buying: only when the store address is set (2번) — otherwise nothing, not a dead '준비 중' */}
            {HAS_PURCHASE_URL ? (
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-4">
                <span className="text-label text-ink-soft">아직 이용권 코드가 없으면</span>
                <a
                  href={PURCHASE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1 rounded-control border border-line px-4 text-label font-medium text-ink transition-colors hover:bg-sunken"
                >
                  이용권 구매하기
                  <span className="sr-only">(새 탭)</span>
                  <span aria-hidden>→</span>
                </a>
              </div>
            ) : null}

            <p className="text-center text-caption text-ink-soft">
              각 과정의 첫 두 강의는 이용권 없이도 학습할 수 있습니다.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
