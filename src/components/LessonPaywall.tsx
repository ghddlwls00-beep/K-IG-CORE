"use client";

import Link from "next/link";
import { useLicense } from "./LicenseProvider";
import { HAS_PURCHASE_URL, PURCHASE_URL } from "./LicenseModal";
import { planOpensCourse, STUDENT_PASS_COURSES, STUDENT_PASS_SCOPE } from "@/lib/license";

interface LessonPaywallProps {
  courseSlug: string;
  courseTitle?: string;
  lessonId: string;
  /** @deprecated the page's h1 already shows the lesson title (점검 FRAME-U15: it showed twice) */
  title?: string;
  lockReason?: "license" | "progress";
  chapter?: number;
  /** the course's free lessons — the way forward for a visitor (점검 FRAME-L09) */
  freeLessons?: { href: string; title: string }[];
}

/**
 * The screen that replaces a lesson the visitor cannot open.
 *
 * 2026-09-27 (docs/디자인-규칙.md · 점검 FRAME-U15 · L09): one message, one main button, and a
 * way to the two free lessons; no emoji, no blue/amber, buttons that stay on one line.
 * The small marker line keeps its text — 'ALL-PASS ONLY' · 'STUDENT PASS ONLY' ·
 * 'VIP ALL-PASS REQUIRED' · '순차 학습 잠금' — because the paid-lock checks recognise the paywall by
 * it (probe-entitlement-all.cjs PAYWALL · lib/harness.cjs PAYWALL_RE). Change those checks, with a
 * deliberate-break proof, before changing these words.
 *
 * 2026-10-07 (UI검토-1007 결과.md 2번 · 사장님): '구매 안내' only opened the same registration window, which
 * held a '구매 링크 준비 중' that could not be pressed — a dead end. Now there is one black '이용권 등록' and,
 * only once NEXT_PUBLIC_PURCHASE_URL is set, an outlined '이용권 구매하기' that opens the store in a new tab.
 */
/**
 * UI검토-1007 16번: on a locked STUDENT · ADULT lesson (a2-1 'Part 1 · Greeting (인사)') the free lesson below it read
 * 'Part 1 · Greeting (인사)' too — the same words, no chapter. A free lesson is named as the end bar names a neighbour:
 * 'Ch 1-1 · Greeting (인사)' (the chapter code from its address, the title without its 'Part N ·'). Other courses: the title.
 */
function freeLessonName(courseSlug: string, lesson: { href: string; title: string }): string {
  if (courseSlug !== "student" && courseSlug !== "adult") return lesson.title;
  const m = lesson.href.match(/\/[sa](\d+)-(\d+)$/);
  return m ? `Ch ${m[1]}-${m[2]} · ${lesson.title.replace(/^Part \d+ · /, "")}` : lesson.title;
}

export function LessonPaywall({
  courseSlug,
  courseTitle = "과정",
  lockReason = "license",
  chapter,
  freeLessons = [],
}: LessonPaywallProps) {
  const { openModal, licenseInfo } = useLicense();
  // A STUDENT pass on a course it does not open (license.ts planOpensCourse). STUDENT's own pages keep
  // the copy they had.
  const isStudentOnly =
    Boolean(licenseInfo?.isStudentOnly) &&
    (courseSlug === "student" || !planOpensCourse(licenseInfo?.plan, courseSlug));
  // A course the STUDENT pass opens besides STUDENT itself (PASS-OFF GRAMMAR): either pass will do.
  const studentPassCourse = courseSlug !== "student" && STUDENT_PASS_COURSES.includes(courseSlug);

  // 'STUDENT PASS · ALL-PASS' (PASS-OFF GRAMMAR, either pass opens it) is the fifth marker the paid-lock
  // checks know (harness.cjs PAYWALL_RE · probe-entitlement-all · sweep-inventory · verify-sitemap …)
  const marker =
    lockReason === "progress"
      ? "순차 학습 잠금"
      : isStudentOnly
        ? "VIP ALL-PASS REQUIRED"
        : courseSlug === "student"
          ? "STUDENT PASS ONLY"
          : studentPassCourse
            ? "STUDENT PASS · ALL-PASS"
            : "ALL-PASS ONLY";

  return (
    <div
      // PERF-01: LicenseProvider reloads a lesson after verifying the licence only when
      // the server rendered THIS licence paywall (it had no valid session cookie).
      data-kig-paywall={lockReason === "license" ? "license" : undefined}
      className="mt-2 flex flex-col items-center gap-5 rounded-card border border-line bg-raised px-5 py-8 text-center sm:px-10 sm:py-10"
    >
      <div aria-hidden className="flex h-12 w-12 items-center justify-center rounded-full border border-line text-ink-soft">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>

      <div className="flex max-w-md flex-col items-center gap-2">
        <span className="text-caption font-semibold text-ink-soft">{marker}</span>
        {lockReason === "progress" ? (
          <>
            {/* 2026-09-27 STU-U28: '{n}장은' fixes the particle ('챕터 2은(는)' read wrong) */}
            <h2 className="text-title-s font-bold text-ink">{chapter ? `${chapter}장은` : "다음 장은"} 앞 장을 마치면 열립니다</h2>
            <p className="text-label leading-relaxed text-ink-soft">
              지금 장의 강의 80%와 마지막 강의를 마치면 다음 장이 바로 열립니다.
            </p>
          </>
        ) : isStudentOnly ? (
          <>
            <h2 className="text-title-s font-bold text-ink">올패스로 학습할 수 있는 강의입니다</h2>
            <p className="text-label leading-relaxed text-ink-soft">
              지금은 <strong className="font-semibold text-ink">STUDENT 패스</strong>({STUDENT_PASS_SCOPE})로 이용 중입니다. {courseTitle}을(를) 포함한 모든 과정은 올패스로 열립니다.
            </p>
          </>
        ) : (
          <>
            <h2 className="text-title-s font-bold text-ink">
              {courseSlug === "student"
                ? "STUDENT 이용권을 등록하면 학습할 수 있는 강의입니다"
                : studentPassCourse
                  ? "STUDENT 이용권이나 올패스를 등록하면 학습할 수 있는 강의입니다"
                  : "올패스를 등록하면 학습할 수 있는 강의입니다"}
            </h2>
            <p className="text-label leading-relaxed text-ink-soft">
              {courseSlug === "student"
                ? "받으신 이용권 코드를 등록하면 STUDENT 과정 전체를 학습할 수 있습니다."
                : studentPassCourse
                  ? `받으신 STUDENT 이용권이나 올패스 코드를 등록하면 ${courseTitle} 과정 전체를 학습할 수 있습니다.`
                  : "받으신 이용권 코드를 등록하면 모든 유료 강의를 학습할 수 있습니다."}
            </p>
          </>
        )}
      </div>

      {lockReason === "progress" ? (
        <Link
          href={`/${courseSlug}`}
          className="flex min-h-12 items-center justify-center whitespace-nowrap rounded-control bg-ink px-6 text-label font-semibold text-surface transition-opacity hover:opacity-90"
        >
          지금 장으로 돌아가기
        </Link>
      ) : (
        <div className={`grid w-full max-w-sm gap-2 ${HAS_PURCHASE_URL ? "grid-cols-2" : ""}`}>
          <button
            type="button"
            onClick={openModal}
            className="flex min-h-12 items-center justify-center whitespace-nowrap rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90"
          >
            이용권 등록
          </button>
          {HAS_PURCHASE_URL ? (
            <a
              href={PURCHASE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-12 items-center justify-center whitespace-nowrap rounded-control border border-line px-4 text-label font-medium text-ink transition-colors hover:bg-sunken"
            >
              이용권 구매하기<span className="sr-only"> (새 탭)</span>
            </a>
          ) : null}
        </div>
      )}

      {lockReason !== "progress" && freeLessons.length > 0 ? (
        <div className="w-full max-w-sm border-t border-line pt-5">
          <p className="text-caption text-ink-soft">이용권 없이 먼저 해 볼 수 있는 강의</p>
          <div className="mt-2 flex flex-col gap-2">
            {freeLessons.map((lesson) => (
              <Link
                key={lesson.href}
                href={lesson.href}
                className="flex min-h-11 items-center justify-between gap-2 rounded-control border border-line px-4 text-label font-medium text-ink transition-colors hover:bg-sunken"
              >
                <span className="truncate">{freeLessonName(courseSlug, lesson)}</span>
                <span aria-hidden>→</span>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <Link
        href={`/${courseSlug}`}
        className="inline-flex min-h-11 items-center rounded-control px-3 text-label text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
      >
        ← {courseTitle} 전체 목록
      </Link>
    </div>
  );
}
