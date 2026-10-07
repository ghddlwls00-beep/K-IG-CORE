"use client";

import { useEffect, useRef, useState } from "react";
import type { PassoffAnchor } from "@/lib/passoffTypes";
import { VoiceSpeakingTester } from "../VoiceSpeakingTester";
import { useLicense } from "../LicenseProvider";
import { IconLock } from "../icons";
import { FOCUS_CLASS, FONT, Marked, PrimaryButton, SecondaryButton, SpeakButton, StudentTag, Chip, glossFor, type FontSize, type Speaker } from "./ui";

/**
 * ① 예문 떠올리기 (설계 §3): the Korean → 먼저 말해 보기 (the microphone, optional — what it heard is shown, never
 * a score or the English) → "영어 보기", awake two seconds after the sentence's turn comes → the English with its
 * focus words, and its sound. Not graded; done when every sentence has been opened once.
 *
 * The sentences are recalled one at a time, in order (stage A, 점검 10): the first one whose English is still
 * hidden is the one to recall, and its button wakes two seconds after it becomes that one — a single timer for
 * the page opened them all at once. Opening one moves the focus to its English, where the button was. Only that
 * sentence has the (filled) button; the first one after it says, once, that they wait their turn (디자인 규칙: one main
 * action). The sentences sit in one list box parted by lines, not a card each (UI 검토 1007 15번).
 *
 * The English is drawn with the lesson's Hangul glosses (glossFor — "Hong Gil Dong(홍길동)"); the microphone's target and
 * the sound keep the lesson's own sentence.
 */
export function AnchorsStep({
  lessonId,
  anchors,
  revealed,
  onReveal,
  speaker,
  font,
  lockedExtraCount,
  onNext,
}: {
  /** the lesson's id — how its text is drawn (glossFor) */
  lessonId: string;
  anchors: PassoffAnchor[];
  revealed: readonly string[];
  onReveal: (id: string) => void;
  speaker: Speaker;
  font: FontSize;
  lockedExtraCount: number;
  onNext: () => void;
}) {
  const [readyId, setReadyId] = useState<string | null>(null);
  const [openedId, setOpenedId] = useState<string | null>(null);
  const englishRefs = useRef<Record<string, HTMLParagraphElement | null>>({});
  const { openModal } = useLicense();
  const gloss = glossFor(lessonId);
  const shownSet = new Set(revealed);
  const currentIndex = anchors.findIndex((anchor) => !shownSet.has(anchor.id));
  const currentId = currentIndex < 0 ? null : anchors[currentIndex].id;
  // the first sentence still waiting its turn after that one — the only one that says it waits (UI 검토 1007 15번)
  const firstWaitingIndex = currentIndex < 0 ? -1 : anchors.findIndex((anchor, i) => i > currentIndex && !shownSet.has(anchor.id));
  const allShown = currentId === null;

  useEffect(() => {
    if (!currentId) return;
    const timer = window.setTimeout(() => setReadyId(currentId), 2000);
    return () => window.clearTimeout(timer);
  }, [currentId]);

  useEffect(() => {
    if (openedId) englishRefs.current[openedId]?.focus();
  }, [openedId]);

  function reveal(anchor: PassoffAnchor) {
    if (anchor.id !== currentId || readyId !== anchor.id) return;
    onReveal(anchor.id);
    setOpenedId(anchor.id);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-label leading-relaxed text-ink-soft">
        한국어를 보고 영어 문장을 먼저 떠올려 보세요. 소리 내어 말해 봐도 좋아요. 떠올린 뒤 &lsquo;영어 보기&rsquo;를 누르세요.
      </p>

      {/* one list box, the sentences parted by lines — not a card each (UI 검토 1007 15번 · 디자인 규칙 §1-3) */}
      <ol className="flex flex-col divide-y divide-line rounded-card border border-line bg-raised">
        {anchors.map((anchor, index) => {
          const shown = shownSet.has(anchor.id);
          const isCurrent = anchor.id === currentId;
          // the waiting sentences say so once — on the first of them, right under the one to recall
          const firstWaiting = index === firstWaitingIndex;
          // aria-disabled, not disabled: the button waiting its two seconds stays in the tab order
          const waiting = readyId !== anchor.id;
          return (
            <li key={anchor.id} className="p-4">
              <div className="flex gap-3">
                <span className="w-6 shrink-0 pt-0.5 text-right text-label font-semibold tabular-nums text-ink-faint">{index + 1}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-3">
                  {anchor.promptEn ? (
                    <p lang="en" className={`${FONT[font].text} text-ink-soft`}>
                      {gloss(anchor.promptEn)}
                    </p>
                  ) : null}
                  <p className={`${FONT[font].text} text-ink`}>{anchor.ko}</p>
                  {anchor.clauseLabel ? (
                    <div>
                      <Chip>{anchor.clauseLabel}</Chip>
                    </div>
                  ) : null}
                  {shown ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <p
                          lang="en"
                          tabIndex={-1}
                          ref={(node) => {
                            englishRefs.current[anchor.id] = node;
                          }}
                          className={`${FONT[font].text} font-semibold text-ink`}
                        >
                          <Marked text={anchor.en} phrases={anchor.focus} className={FOCUS_CLASS} gloss={gloss} />
                        </p>
                        <SpeakButton speaking={speaker.speakingId === anchor.id} onClick={() => speaker.toggle(anchor.id, anchor)} />
                      </div>
                      <StudentTag studentRef={anchor.studentRef} />
                    </>
                  ) : isCurrent ? (
                    <div className="flex flex-col gap-3">
                      {/* the shared microphone (44px since main's common parts): what it heard only, never a score or the English;
                          starting it stops a sentence playing, and onStart puts that sentence's play button back */}
                      <VoiceSpeakingTester targetText={anchor.en} buttonLabel="먼저 말해 보기" resultView="transcript" onStart={speaker.reset} />
                      <PrimaryButton aria-disabled={waiting} onClick={() => reveal(anchor)} className="self-start">
                        영어 보기
                      </PrimaryButton>
                    </div>
                  ) : firstWaiting ? (
                    <p className="text-label text-ink-faint">이 문장부터는 앞 문장을 연 뒤에 차례가 와요.</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {lockedExtraCount > 0 ? (
        // LicenseProvider reloads the page once a licence is verified while this is on screen,
        // so the server can add the sentences (data-kig-paid-extra, like the paywall's marker).
        <section
          data-kig-paid-extra="license"
          className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="flex items-center gap-2 text-body text-ink">
            <IconLock size={18} className="shrink-0 text-ink-soft" />
            <span>이용권이 있으면 {lockedExtraCount}문장 더 풀 수 있습니다.</span>
          </p>
          <SecondaryButton onClick={openModal}>이용권 코드 등록</SecondaryButton>
        </section>
      ) : null}

      {allShown ? (
        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>다음 단계: 문법 설명</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}
