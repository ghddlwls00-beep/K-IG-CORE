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
  const { openModal } = useLicense();

  return (
    <div className="my-8 rounded-3xl border border-black/10 bg-gradient-to-b from-white via-gray-50/60 to-gray-100/50 p-8 sm:p-12 shadow-md flex flex-col items-center justify-center text-center gap-6">
      {/* Icon Pill */}
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-[28px] text-amber-600 shadow-xs">
        🔒
      </div>

      {/* Main Text */}
      <div className="flex flex-col gap-2 max-w-lg">
        <span className="font-mono text-[12px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/10 px-3 py-1 rounded-full self-center border border-amber-500/20">
          올패스 회원 전용 콘텐츠
        </span>
        <h2 className="text-[22px] sm:text-[24px] font-bold text-ink tracking-tight mt-1">
          {title || "본 레슨은 이용권 등록 후 학습하실 수 있습니다"}
        </h2>
        <p className="text-[14px] text-ink-soft leading-relaxed mt-1">
          현재 레슨은 프리미엄 정규 과정입니다. 스마트스토어 또는 크몽에서 발급받으신
          인증 코드를 등록하시면 <strong>1,677개 모든 레슨</strong>이 즉시 무제한 열람됩니다.
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-md">
        <button
          type="button"
          onClick={openModal}
          className="flex-1 rounded-2xl bg-ink px-6 py-3.5 text-[14px] font-bold text-white shadow-md hover:bg-black/80 transition-all cursor-pointer active:scale-[0.99]"
        >
          🔑 이용권 코드 등록하기
        </button>

        <a
          href="#buy-allpass"
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
          className="flex-1 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-6 py-3.5 text-[14px] font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/20 transition-all cursor-pointer"
        >
          🛒 올패스 구매 안내
        </a>
      </div>

      {/* Secondary Back Navigation */}
      <div className="border-t border-black/[0.06] pt-5 mt-2 flex flex-wrap items-center justify-center gap-4 text-[12.5px] text-ink-soft">
        <Link
          href={`/${courseSlug}`}
          className="hover:text-ink font-semibold underline underline-offset-4 decoration-black/20 hover:decoration-black"
        >
          ← {courseTitle} 목록으로 돌아가기
        </Link>
        <span className="text-black/20">·</span>
        <span className="font-mono text-ink-faint">
          1~2강은 무료로 상시 체험 가능합니다
        </span>
      </div>
    </div>
  );
}
