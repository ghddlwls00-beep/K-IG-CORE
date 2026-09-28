"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PassoffFormItem, PassoffProduceItem } from "@/lib/passoffTypes";
import { twoLineScore } from "@/lib/passoffGrading";
import { orderReviewPlan } from "@/lib/passoffLesson";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { speakText, stopSpeech } from "@/lib/speech";
import type { PlanItem } from "@/lib/learning/types";
import {
  PASSOFF_COURSE,
  PASSOFF_PROFILE,
  PASSOFF_SENTENCE_KINDS,
  passoffLessonOfItem,
  type PassoffAttempt,
  type PassoffReviewItem,
} from "@/lib/passoffLearning";
import { ReviewSession, type ReviewCourse, type ReviewItemProps, type ReviewResult, type ReviewSource } from "../learning/ReviewSession";
import { IconTextSize } from "../icons";
import { ComposeCard } from "./ComposeCard";
import { FormItemCard } from "./FormStep";
import { FONT_LABEL, segmentButton, spokenOf, type FontSize, type Speaker } from "./ui";

/**
 * PASS-OFF GRAMMAR's side of today's review (공통-학습-엔진.md §8-3) — the engine's ReviewSession with this course's
 * item cards, the lesson's own (설계 §3 — one course, one way of learning):
 *   - ④ · ⑤ sentences: ComposeCard — typing or the microphone, graded by passoffGrading, and after a miss the ladder
 *     (where it is wrong → clue → tiles → the answer, the rule and its sound);
 *   - ③ form items: FormItemCard — tap · pick · a short blank, one more try, then the answer;
 * with every answer recorded where "review" (ReviewSession → recordAttempt), not as the lesson's. In the next-day check
 * the same cards take one answer and pass on (`test`); the results then come together, with the lesson's two-line score
 * (문법 정답 · 서술형 기준 — 설계 §4 "2일 '확인'"), and the missed ones come once more opening on the check's answer: a
 * sentence at the ladder's first rung (where it is wrong), a form item at '한 번 더' (`missed`).
 *
 * A sentence sounds exactly as in its lesson — the same string through the same function (lessonSpeechForm of its
 * lesson · spokenOf), so the same clip (scripts/lib/spoken-texts.cjs lists it already). Text size and sentence speed are
 * the lesson's (기본 · 크게 · 특대 · 1.0× · 0.85×).
 */

const isSentence = (data: PassoffReviewItem): data is PassoffReviewItem & { item: PassoffProduceItem; kind: "produce" | "transfer" } =>
  data.kind === "produce" || data.kind === "transfer";

/** A form item's English, as one line ("You are a student.") */
function formLine(item: PassoffFormItem): string | null {
  if (item.kind === "select") return item.tokens.join(" ").replace(/\s+([.,?!;:])/g, "$1");
  return item.sentence ?? null;
}

type FirstAnswer = { answer: string; verdict: string; reference: string };

/**
 * The day's order: the engine's plan with a sentence whose English prompt is another's model answer after that one when
 * both come today (pg19-2 p3 → p4 … — 작업기록 할 일 6), as in the lesson's queue.
 */
const orderItems = (entries: PlanItem[], data: Record<string, PassoffReviewItem>): PlanItem[] =>
  orderReviewPlan(entries, (key) => {
    const found = data[key];
    return found && isSentence(found) ? found.item : null;
  });

export function PassoffReview({ source }: { source: ReviewSource<PassoffReviewItem> }) {
  const [font, setFont] = useState<FontSize>("normal");
  const [speed, setSpeed] = useState<1 | 0.85>(1);
  const [showSettings, setShowSettings] = useState(false);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  /** the grader's verdict of each sentence's first answer — the next-day results' two-line score */
  const firsts = useRef<Record<string, FirstAnswer>>({});

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);

  const speaker: Speaker = useMemo(
    () => ({
      speakingId,
      toggle: (id, item) => {
        if (speakingId === id) {
          stopSpeech();
          setSpeakingId(null);
          return;
        }
        stopSpeech();
        setSpeakingId(id);
        speakText(lessonSpeechForm(`${PASSOFF_COURSE}/${passoffLessonOfItem(id)}`, spokenOf(item)), {
          lang: "en",
          rate: speed,
          onStart: () => setSpeakingId(id),
          onEnd: () => setSpeakingId((curr) => (curr === id ? null : curr)),
          onError: () => setSpeakingId((curr) => (curr === id ? null : curr)),
        });
      },
      reset: () => setSpeakingId(null),
    }),
    [speakingId, speed],
  );

  const toolbar = (
    <button
      type="button"
      aria-expanded={showSettings}
      aria-label="글자 크기 · 문장 속도"
      onClick={() => setShowSettings((v) => !v)}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-line bg-raised text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink"
    >
      <IconTextSize size={20} />
    </button>
  );
  const toolbarPanel = showSettings ? (
    <div className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="글자 크기">
        <span className="w-20 text-label text-ink-soft">글자 크기</span>
        <div className="flex gap-1 rounded-control bg-sunken p-1">
          {(["normal", "large", "xlarge"] as const).map((key) => (
            <button key={key} type="button" aria-pressed={font === key} onClick={() => setFont(key)} className={segmentButton(font === key)}>
              {FONT_LABEL[key]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="문장 속도">
        <span className="w-20 text-label text-ink-soft">문장 속도</span>
        <div className="flex gap-1 rounded-control bg-sunken p-1">
          {([1, 0.85] as const).map((value) => (
            <button key={value} type="button" aria-pressed={speed === value} onClick={() => setSpeed(value)} className={segmentButton(speed === value)}>
              {value === 1 ? "1.0×" : "0.85×"}
            </button>
          ))}
        </div>
      </div>
    </div>
  ) : null;

  function renderItem({ data, mode, missed, onAnswer, onNext }: ReviewItemProps<PassoffReviewItem>) {
    const record = (attempt: PassoffAttempt) =>
      onAnswer({ correct: attempt.correct, help: attempt.help, mode: attempt.mode, answer: attempt.answer, detail: firsts.current[attempt.itemId] });
    // "again": the check's wrong answer, which the card opens on
    const missedAnswer = mode === "again" && missed && !missed.correct && missed.answer ? missed.answer : undefined;
    if (isSentence(data)) {
      return (
        <ComposeCard
          item={data.item}
          kind={data.kind}
          lessonId={data.lessonId}
          presentation={mode === "again" ? 1 : 0}
          comebacksLeft={0}
          priorHelp="none"
          font={font}
          speaker={speaker}
          ruleTitle={data.ruleTitle}
          test={mode === "test"}
          afterMiss="이 문장은 내일 다시 나와요."
          missed={missedAnswer !== undefined ? { answer: missedAnswer, spoken: missed?.mode === "voice" } : undefined}
          onAttempt={record}
          onFirstTry={({ first }) => {
            if (first) firsts.current[data.item.id] = first;
          }}
          onHelp={() => {}}
          onDone={() => onNext()}
        />
      );
    }
    return (
      <FormItemCard
        item={data.item as PassoffFormItem}
        lessonId={data.lessonId}
        firstPresentation={false}
        answerSeen={false}
        font={font}
        test={mode === "test"}
        missed={mode === "again" ? (missedAnswer ?? "") : undefined}
        onAttempt={record}
        onFirstTry={() => {}}
        onShown={() => {}}
        onDone={() => onNext()}
      />
    );
  }

  function resultLine(data: PassoffReviewItem) {
    if (isSentence(data)) return <p className="text-body text-ink">{data.item.ko}</p>;
    const item = data.item as PassoffFormItem;
    const line = formLine(item);
    return (
      <>
        <p className="text-body text-ink">{item.instruction}</p>
        {line ? (
          <p lang="en" className="text-label text-ink-soft">
            {line}
          </p>
        ) : null}
      </>
    );
  }

  /** "첫 시도 문법 정답 5/8 · 서술형 기준 4/8" over the check's sentences (ComposeStep SetSummary's lines) */
  function resultScore(results: ReviewResult<PassoffReviewItem>[]) {
    const entries = results
      .filter((r) => isSentence(r.data))
      .map((r) => r.answer.detail as FirstAnswer | undefined)
      .filter((d): d is FirstAnswer => Boolean(d))
      .map((d) => ({ answer: d.answer, result: { verdict: d.verdict as "correct" | "typo" | "wrong", reference: d.reference } }));
    const score = twoLineScore(entries);
    if (!score.total) return null;
    const reasons = [
      score.capital ? `대문자 ${score.capital}` : "",
      score.punctuation ? `끝 문장부호 ${score.punctuation}` : "",
      score.spelling ? `철자 ${score.spelling}` : "",
    ].filter(Boolean);
    return (
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-body">
        <dt className="text-ink-soft">첫 시도 문법 정답</dt>
        <dd className="font-semibold tabular-nums text-ink">
          {score.grammar} / {score.total}
        </dd>
        <dt className="text-ink-soft">서술형 기준</dt>
        <dd className="font-semibold tabular-nums text-ink">
          {score.written} / {score.total}
          {reasons.length ? <span className="ml-2 text-label font-normal text-ink-soft">({reasons.join(" · ")})</span> : null}
        </dd>
      </dl>
    );
  }

  const course: ReviewCourse<PassoffReviewItem> = {
    profile: PASSOFF_PROFILE,
    listHref: `/${PASSOFF_COURSE}`,
    unit: "레슨",
    sentenceKinds: PASSOFF_SENTENCE_KINDS,
    passedLabel: "통과한 문장",
    renderItem,
    itemSource: (data) => data.lessonTitle,
    resultLine,
    resultScore,
    toolbar,
    toolbarPanel,
    orderItems,
  };

  return <ReviewSession course={course} source={source} />;
}
