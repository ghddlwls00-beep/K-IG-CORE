"use client";

import { useId, useState, useSyncExternalStore, type MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProgress } from "./ProgressProvider";
import { usePassoffProgress } from "./PassoffProgressProvider";
import { useLicense } from "./LicenseProvider";
import { getLessonGate, subscribeLessonGate } from "@/lib/lessonGate";

const PASSOFF_COURSE = "passoff-grammar";

/** `code` is shown before the title where a course numbers its lessons by chapter (STUDENT 'Ch 12-1'). */
type Neighbour = { href: string; title: string; code?: string } | null;

/**
 * The end of every lesson — 학습 완료 and the previous / next lesson (docs/디자인-규칙.md §1-6 · §6-5).
 *
 * 2026-09-27 (점검 FRAME-U03 · STU-U10 · GRM-U17 · RD-U16): the completion toggle and the
 * previous/next cards used to sit at the TOP of the page, so a learner who finished the last step
 * had to scroll 7–16 phone screens back up to mark it done or to move on. They now close the page.
 *
 * (Until 2026-10-07 STUDENT · ADULT kept their own completion at the end of their last step and this bar showed only the
 * neighbours there — see the last paragraph.) The aria-labels "학습 완료 체크" / "학습 완료 취소" are the
 * ones the audit drivers press (gap-checks-0926 P · drive-generic) — keep them.
 *
 * 2026-09-27 STUDENT 학습법 · 화면 고침: the neighbours read 'Ch 12-1 · School Vacations (방학맞이)' (STU-U17 — 'Part 1 ·'
 * alone looked like going backwards), and STUDENT's '다음 강의' first sends the queued completion to the server and
 * waits for the answer (A11 — the next chapter's first lesson is opened by the server only once it knows); offline it
 * says so on one line, then goes.
 *
 * 2026-09-27 (계획 D02 나 — VOCA first): a course view may register a completion gate (src/lib/lessonGate.ts). While it is not
 * ready, '이 강의 학습 완료' is disabled with the gate's reason on one line under it (VOCA: until one Step 2 round is finished).
 * A completed lesson stays toggleable. No gate registered — every other course today — renders exactly as before.
 *
 * 2026-09-28 (PASS-OFF GRAMMAR, merged with main): its view registers { ready: the five steps are done, undo: false }; the
 * learner presses '이 강의 학습 완료' once the fifth step is done (단계 2-나 E2 — as in the other courses; docs/pass-off-grammar/
 * 설계.md §3). The bar shows the disabled button with the reason until then, and '학습 완료함' as a status afterwards — no
 * '취소', because that course's server keeps completions only (lessonGate.ts `undo`). On a topic's last lesson whose
 * "구성도 다시 채우기" opens the next topic, the gate also says `quietNext`: '다음 강의' keeps its border (one filled button).
 *
 * 2026-10-07 (UI검토-1007 결과.md 2장 1번): STUDENT · ADULT complete HERE too, like the other six courses — their view no longer
 * draws its own '이 강의 학습 완료' box at the end of its last step (that box had a second filled '다음 강의', and this bar's
 * '다음 강의' was filled before completion, so a period-pass learner could skip completion and land on the chapter lock). The view
 * registers its rule as a gate (80% dictated and 80% spoken — unchanged, studentPractice.canCompleteLesson); until it has, the
 * button stays off (no gate yet = not yet known, for these two courses only). The save is unchanged: toggleComplete queues it for
 * /api/progress/student · adult, and '다음 강의' waits for the server's answer as before (A11). 'N장은 이 장을 마치면 열려요.'
 * moved here with it: while a period pass's next chapter is still closed, that line stands where '다음 강의' would be.
 */
export function LessonEndBar({
  course,
  lessonId,
  prev,
  next,
}: {
  course: string;
  lessonId: string;
  prev: Neighbour;
  next: Neighbour;
}) {
  const { isCompleted, toggleComplete, flushStudentUpdates, flushAdultUpdates, studentSyncStatus, adultSyncStatus } = useProgress();
  // PASS-OFF GRAMMAR's completions live on the server (PassoffProgressProvider) — the lessons it counts, and those on their way
  const { countedIds: passoffCounted } = usePassoffProgress();
  const { hasActiveLicense, licenseInfo, studentProgress, adultProgress } = useLicense();
  // STUDENT · ADULT (chapter courses): completion opens chapters on the server, so '다음 강의' waits for the save
  const isChapterCourse = course === "student" || course === "adult";
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // the server answered '다음 강의' with the next chapter still closed
  const [lockedAfterSave, setLockedAfterSave] = useState(false);
  // 회귀 점검 1002 A4: a PASS-OFF lesson finished on another device (or before this device's storage was cleared) is complete
  // here too — the course list already marks it from the server; the bar used to read this device's record alone and showed
  // the disabled '이 강의 학습 완료' with "5단계를 모두 마치면…" under it
  const completed = isCompleted(course, lessonId) || (course === PASSOFF_COURSE && passoffCounted?.has(lessonId) === true);
  const named = (n: NonNullable<Neighbour>) => (n.code ? `${n.code} · ${n.title}` : n.title);
  const gate = useSyncExternalStore(subscribeLessonGate, () => getLessonGate(course, lessonId), () => null);
  // no gate: every course completes at any time — except STUDENT · ADULT, whose view always registers one (not yet = not yet known)
  const blocked = !completed && (gate !== null ? !gate.ready : isChapterCourse);
  // a gate with undo: false (PASS-OFF GRAMMAR): a completed lesson is a status line, not a toggle
  const doneForGood = completed && gate !== null && gate.undo === false;
  // a gate with quietNext (PASS-OFF GRAMMAR — a topic's last lesson before its map): '다음 강의' is not the page's main action
  const nextFilled = completed && gate?.quietNext !== true;
  const reasonId = useId();

  // STUDENT · ADULT chapter lock (moved from the view's completion box, 2026-10-07): a period pass opens the next chapter only once
  // this chapter is finished on the server — until then '다음 강의' into it would land on the lock screen ('순차 학습 잠금')
  const chapterOf = (id: string) => Number(id.match(/^[sa](\d+)-/)?.[1] ?? 0);
  const thisChapter = chapterOf(lessonId);
  const nextChapter = next ? chapterOf(next.href.split("/").pop() ?? "") : 0;
  const periodPass = hasActiveLicense && licenseInfo?.plan !== "LIFE";
  const lockedByChapter = (unlockedThrough: number | null | undefined) =>
    Boolean(isChapterCourse && next && periodPass && typeof unlockedThrough === "number" && nextChapter > thisChapter && nextChapter > unlockedThrough);
  const chapterRecord = course === "adult" ? adultProgress : studentProgress;
  const chapterSync = course === "adult" ? adultSyncStatus : studentSyncStatus;
  const nextLocked = (lockedByChapter(chapterRecord?.unlockedThrough) && chapterSync !== "syncing" && chapterSync !== "pending") || lockedAfterSave;

  async function goNext(event: MouseEvent<HTMLAnchorElement>) {
    if (!isChapterCourse || !next) return;
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setNotice(null);
    const result = await (course === "adult" ? flushAdultUpdates() : flushStudentUpdates());
    if (result.status === "offline" || result.status === "error") {
      setNotice(
        result.status === "offline"
          ? "인터넷에 연결되지 않아 완료 기록은 이 기기에 두었어요. 연결되면 저장돼요."
          : "완료 기록을 아직 저장하지 못했어요. 잠시 뒤 다시 보내요.",
      );
      await new Promise((resolve) => window.setTimeout(resolve, 1500));
    } else if (result.progress && lockedByChapter(result.progress.unlockedThrough)) {
      // still closed — the line where '다음 강의' was says so
      setSaving(false);
      setLockedAfterSave(true);
      return;
    }
    router.push(next.href);
  }

  return (
    <section aria-label="강의 마치기" className="mt-8 border-t border-line pt-6">
      {doneForGood ? (
        <p
          role="status"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control border border-line bg-raised text-label font-semibold text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-success">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          <span>학습 완료함</span>
        </p>
      ) : (
        <button
          type="button"
          onClick={() => {
            if (!blocked) toggleComplete(course, lessonId);
          }}
          disabled={blocked || undefined}
          aria-describedby={blocked && gate ? reasonId : undefined}
          aria-label={completed ? "학습 완료 취소" : "학습 완료 체크"}
          aria-pressed={completed}
          className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-control text-label font-semibold transition-colors cursor-pointer ${
            completed
              ? "border border-line bg-raised text-ink hover:bg-sunken"
              : "bg-ink text-surface hover:opacity-90"
          }${blocked ? " disabled:cursor-not-allowed disabled:opacity-40" : ""}`}
        >
          {completed ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="text-success">
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              </svg>
              <span>학습 완료함</span>
              <span className="font-normal text-ink-soft">· 취소하려면 누르세요</span>
            </>
          ) : (
            <span>이 강의 학습 완료</span>
          )}
        </button>
      )}
      {blocked && gate ? (
        <p id={reasonId} className="mt-2 text-center text-caption text-ink-soft">
          {gate.reason}
        </p>
      ) : null}

      {prev || next ? (
        <nav aria-label="강의 이동" className={`mt-3 grid gap-2 ${prev && next ? "sm:grid-cols-2" : ""}`}>
          {prev ? (
            <Link
              href={prev.href}
              scroll={true}
              aria-label={`이전 강의: ${named(prev)}`}
              className="group flex min-h-14 min-w-0 items-center gap-3 rounded-control border border-line bg-raised px-3 py-2 text-left transition-colors hover:bg-sunken"
            >
              <span aria-hidden className="text-ink-soft group-hover:text-ink">←</span>
              <span className="min-w-0">
                <span className="block text-caption text-ink-soft">이전 강의</span>
                <span className="block truncate text-label font-semibold text-ink">{named(prev)}</span>
              </span>
            </Link>
          ) : null}
          {next && nextLocked ? (
            <p data-next-locked className="flex min-h-14 min-w-0 items-center justify-end px-3 py-2 text-right text-label text-ink-soft">
              {nextChapter}장은 이 장을 마치면 열려요.
            </p>
          ) : next ? (
            <Link
              href={next.href}
              scroll={true}
              onClick={goNext}
              aria-label={`다음 강의: ${named(next)}`}
              className={`group flex min-h-14 min-w-0 items-center justify-end gap-3 rounded-control px-3 py-2 text-right transition-colors ${
                nextFilled
                  ? "bg-ink text-surface hover:opacity-90"
                  : "border border-line bg-raised hover:bg-sunken"
              }`}
            >
              <span className="min-w-0">
                <span className={`block text-caption ${nextFilled ? "text-surface/75" : "text-ink-soft"}`}>
                  {saving ? "저장 중…" : "다음 강의"}
                </span>
                <span className={`block truncate text-label font-semibold ${nextFilled ? "text-surface" : "text-ink"}`}>{named(next)}</span>
              </span>
              <span aria-hidden>→</span>
            </Link>
          ) : null}
        </nav>
      ) : null}
      {notice ? (
        <p role="status" className="mt-2 text-caption text-ink-soft">
          {notice}
        </p>
      ) : null}
    </section>
  );
}
