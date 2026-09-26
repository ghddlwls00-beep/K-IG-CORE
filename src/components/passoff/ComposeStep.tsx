"use client";

import type { PassoffProduceItem } from "@/lib/passoffTypes";
import { twoLineScore } from "@/lib/passoffGrading";
import { MAX_REQUEUES, type ComposeItemState } from "@/lib/passoffLesson";
import { ComposeCard, type ComposeReport } from "./ComposeCard";
import { PrimaryButton, Verdict, type FontSize, type Speaker } from "./ui";

/**
 * ④ 영작 (설계 §3): the sentences in sets of about six minutes (src/lib/passoffLesson.ts cutSets — challenge
 * sentences last in their set, marked '도전'). A sentence that was wrong or helped comes back 3~5 sentences later;
 * the set ends when every sentence has been right on its own once — or has come back three times.
 */
export function ComposeStep({
  sets,
  setIndex,
  queue,
  states,
  lessonId,
  font,
  speaker,
  ruleTitle,
  report,
  onNextSet,
  onNext,
}: {
  sets: PassoffProduceItem[][];
  setIndex: number;
  /** this set's sentences still to get right, in order */
  queue: string[];
  states: Readonly<Record<string, ComposeItemState>>;
  lessonId: string;
  font: FontSize;
  speaker: Speaker;
  ruleTitle?: string;
  report: ComposeReport;
  onNextSet: () => void;
  onNext: () => void;
}) {
  if (!sets.length) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-[16px] text-ink-soft">이 레슨에는 영작 문장이 없습니다.</p>
        <div className="flex justify-end">
          <PrimaryButton onClick={onNext}>다음 단계: 마무리</PrimaryButton>
        </div>
      </div>
    );
  }
  const set = sets[setIndex] ?? [];
  const lastSet = setIndex >= sets.length - 1;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[14px] leading-relaxed text-ink-soft">
        한국어를 영어로 써 보세요. 틀리면 틀린 자리부터 차례로 도와 드려요. 틀린 문장은 조금 뒤에 다시 나와요.
      </p>
      <p className="text-[14px] tabular-nums text-ink-soft">
        {sets.length > 1 ? `세트 ${setIndex + 1} / ${sets.length} · ` : ""}
        {queue.length ? `남은 문장 ${queue.length} / ${set.length}` : `${set.length}문장 마침`}
      </p>
      {queue.length ? (
        <ComposeRun
          items={set}
          queue={queue}
          states={states}
          kind="produce"
          lessonId={lessonId}
          font={font}
          speaker={speaker}
          ruleTitle={ruleTitle}
          report={report}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <SetSummary items={set} states={states} />
          <div className="flex justify-end">
            {lastSet ? <PrimaryButton onClick={onNext}>다음 단계: 마무리</PrimaryButton> : <PrimaryButton onClick={onNextSet}>다음 세트</PrimaryButton>}
          </div>
        </div>
      )}
    </div>
  );
}

/** The head of the queue as a card — a new card (fresh state) for every presentation. */
export function ComposeRun({
  items,
  queue,
  states,
  kind,
  lessonId,
  font,
  speaker,
  ruleTitle,
  report,
}: {
  items: PassoffProduceItem[];
  queue: string[];
  states: Readonly<Record<string, ComposeItemState>>;
  kind: "produce" | "transfer";
  lessonId: string;
  font: FontSize;
  speaker: Speaker;
  ruleTitle?: string;
  report: ComposeReport;
}) {
  const item = items.find((i) => i.id === queue[0]);
  if (!item) return null;
  const requeues = states[item.id]?.requeues ?? 0;
  return (
    <ComposeCard
      key={`${item.id}:${requeues}`}
      item={item}
      kind={kind}
      lessonId={lessonId}
      presentation={requeues}
      comebacksLeft={MAX_REQUEUES - requeues}
      priorHelp={states[item.id]?.help ?? "none"}
      font={font}
      speaker={speaker}
      ruleTitle={ruleTitle}
      onFirstTry={(result) => report.firstTry(item.id, result)}
      onHelp={(help) => report.help(item.id, help)}
      onDone={(outcome) => report.done(item.id, outcome, queue)}
    />
  );
}

/** "문법 정답 5/8 · 서술형 기준 4/8" over the set's first tries, with the reasons (설계 §0 · §8 — shown, never a pass condition). */
export function SetSummary({ items, states }: { items: PassoffProduceItem[]; states: Readonly<Record<string, ComposeItemState>> }) {
  const entries = items
    .map((i) => states[i.id]?.first)
    .filter((f): f is NonNullable<ComposeItemState["first"]> => Boolean(f))
    .map((f) => ({ answer: f.answer, result: { verdict: f.verdict as "correct" | "typo" | "wrong", reference: f.reference } }));
  const score = twoLineScore(entries);
  const reasons = [
    score.capital ? `대문자 ${score.capital}` : "",
    score.punctuation ? `끝 문장부호 ${score.punctuation}` : "",
    score.spelling ? `철자 ${score.spelling}` : "",
  ].filter(Boolean);
  const allOnTheirOwn = items.every((i) => !states[i.id]?.tomorrow);
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
      <Verdict ok>{allOnTheirOwn ? "이 세트의 문장을 모두 스스로 맞혔어요." : "이 세트를 마쳤어요."}</Verdict>
      {score.total ? (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[16px]">
          <dt className="text-ink-soft">첫 시도 문법 정답</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {score.grammar} / {score.total}
          </dd>
          <dt className="text-ink-soft">서술형 기준</dt>
          <dd className="font-semibold tabular-nums text-ink">
            {score.written} / {score.total}
            {reasons.length ? <span className="ml-2 text-[14px] font-normal text-ink-soft">({reasons.join(" · ")})</span> : null}
          </dd>
        </dl>
      ) : null}
    </div>
  );
}
