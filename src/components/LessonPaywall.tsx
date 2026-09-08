"use client";

import Link from "next/link";
import { useLicense } from "./LicenseProvider";

interface LessonPaywallProps {
  courseSlug: string;
  courseTitle?: string;
  lessonId: string;
  title?: string;
}

export function LessonPaywall({
  courseSlug,
  courseTitle = "코스",
  lessonId,
  title,
}: LessonPaywallProps) {
  const { openModal, licenseInfo } = useLicense();
  const isStudentOnly = licenseInfo?.isStudentOnly;

  return (
    <div className="my-10 rounded-3xl border border-line bg-surface/80 backdrop-blur-xl p-8 sm:p-12 shadow-sm flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
      {/* Icon Pill */}
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] text-[22px] text-ink shadow-2xs">
        🔒
      </div>

      {/* Main Text */}
      <div className="flex flex-col items-center gap-2.5 max-w-md">
        {isStudentOnly ? (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-blue-600 dark:text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              VIP ALL-PASS REQUIRED
            </span>
            <h2 className="text-[20px] sm:text-[23px] font-bold text-ink tracking-tight mt-0.5">
              본 레슨은 VIP 올패스 전용 강좌입니다
            </h2>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              현재 <strong className="text-ink font-semibold">STUDENT 전용 패스</strong>로 접속 중입니다.
              <br className="hidden sm:inline" />
              {courseTitle}을(를) 포함한 전체 과정을 이용하시려면 VIP 올패스 코드를 등록해 주세요.
            </p>
          </>
        ) : (
          <>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] px-3 py-1 font-mono text-[11px] font-semibold tracking-wider text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500/70" />
              {courseSlug === "student" ? "STUDENT PASS ONLY" : "ALL-PASS ONLY"}
            </span>
            <h2 className="text-[20px] sm:text-[23px] font-bold text-ink tracking-tight mt-0.5">
              {title || (courseSlug === "student" ? "본 레슨은 STUDENT 이용권 등록 후 학습하실 수 있습니다" : "본 레슨은 올패스 등록 후 학습하실 수 있습니다")}
            </h2>
            <p className="text-[13px] text-ink-soft leading-relaxed">
              {courseSlug === "student" ? (
                <>
                  발급받으신 이용권 인증 코드를 등록하시면
                  <br className="hidden sm:inline" />
                  <strong className="text-ink font-semibold"> STUDENT 과정</strong>을 제한 없이 학습하실 수 있습니다.
                </>
              ) : (
                <>
                  공식 판매처에서 발급받으신 인증 코드를 등록하시면
                  <br className="hidden sm:inline" />
                  <strong className="text-ink font-semibold"> 모든 유료 레슨</strong>을 제한 없이 학습하실 수 있습니다.
                </>
              )}
            </p>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 w-full max-w-sm mt-1">
        <button
          type="button"
          onClick={openModal}
          className="flex-1 min-w-[140px] rounded-full bg-ink px-5 py-2.5 text-[13px] font-semibold text-surface hover:opacity-90 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          🔑 이용권 코드 등록
        </button>

        <button
          type="button"
          onClick={openModal}
          className="flex-1 min-w-[140px] rounded-full border border-black/8 bg-black/[0.03] dark:border-white/10 dark:bg-white/[0.06] px-5 py-2.5 text-[13px] font-medium text-ink-soft hover:text-ink hover:bg-black/[0.06] dark:hover:bg-white/[0.12] transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
        >
          🛒 구매 안내
        </button>
      </div>

      {/* Secondary Back Navigation */}
      <div className="border-t border-line/60 pt-5 mt-1 flex flex-wrap items-center justify-center gap-3 text-[12px] text-ink-faint">
        <Link
          href={`/${courseSlug}`}
          className="hover:text-ink transition-colors underline underline-offset-4 decoration-black/20 hover:decoration-black"
        >
          ← {courseTitle} 전체 목록
        </Link>
        <span className="opacity-40">·</span>
        <span className="font-mono">
          1~2강은 무료로 상시 체험 가능합니다
        </span>
      </div>
    </div>
  );
}

