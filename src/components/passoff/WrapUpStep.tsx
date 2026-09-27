"use client";

import type { PassoffFrameBlock, PassoffProduceItem, PassoffRuleBlock } from "@/lib/passoffTypes";
import { hasHangul } from "@/lib/passoffGrading";
import { frameParts, type ComposeItemState } from "@/lib/passoffLesson";
import { ComposeRun } from "./ComposeStep";
import type { ComposeReport } from "./ComposeCard";
import { RuleCheck } from "./RuleStep";
import { FONT, SecondaryButton, Verdict, tone, type FontSize, type Speaker } from "./ui";

/**
 * ⑤ 마무리 (설계 §3): two sentences the lesson has not shown (graded as in ④) → the rule check once more → my own
 * sentence on the lesson's frame (not graded, kept on this device only). The lesson is finished when ①~⑤ are.
 */
export function WrapUpStep({
  transfers,
  queue,
  states,
  rule,
  checkDone,
  frame,
  frameValues,
  lessonId,
  font,
  speaker,
  stepsLeft,
  lessonDone,
  notCounted = false,
  report,
  onCheckRight,
  onFrame,
  onGoStep,
  onReset,
}: {
  transfers: PassoffProduceItem[];
  queue: string[];
  states: Readonly<Record<string, ComposeItemState>>;
  rule: PassoffRuleBlock | null;
  checkDone: boolean;
  frame: PassoffFrameBlock | null;
  frameValues: string[];
  lessonId: string;
  font: FontSize;
  speaker: Speaker;
  /** steps not finished yet (0-based), ⑤ itself included */
  stepsLeft: number[];
  lessonDone: boolean;
  /** done on this device, but not in this licence's server progress — finishing it again records it */
  notCounted?: boolean;
  report: ComposeReport;
  onCheckRight: () => void;
  onFrame: (values: string[]) => void;
  onGoStep: (step: number) => void;
  onReset: () => void;
}) {
  const transfersDone = queue.length === 0;
  const check = rule?.check ?? null;
  const checkShown = transfersDone;
  const frameShown = transfersDone && (checkDone || !check);
  const parts = frame ? frameParts(frame.template) : [];
  const blanks = Math.max(0, parts.length - 1);
  const otherStepsLeft = stepsLeft.filter((s) => s !== 4);

  return (
    <div className="flex flex-col gap-6">
      {transfers.length ? (
        <section aria-labelledby="passoff-transfer" className="flex flex-col gap-3">
          <h3 id="passoff-transfer" className="text-body font-semibold text-ink">
            처음 보는 문장
          </h3>
          {!transfersDone ? (
            <>
              <p className="text-label text-ink-soft">
                이 레슨에서 아직 보지 않은 문장이에요. 배운 규칙으로 써 보세요. ({transfers.length - queue.length + 1} / {transfers.length})
              </p>
              <ComposeRun
                items={transfers}
                queue={queue}
                states={states}
                kind="transfer"
                lessonId={lessonId}
                font={font}
                speaker={speaker}
                ruleTitle={rule?.title}
                report={report}
              />
            </>
          ) : (
            <Verdict ok>처음 보는 문장 {transfers.length}개를 마쳤어요.</Verdict>
          )}
        </section>
      ) : null}

      {check && checkShown ? (
        <section aria-labelledby="passoff-wrap-check" className="flex flex-col gap-3">
          <h3 id="passoff-wrap-check" className="text-body font-semibold text-ink">
            규칙 다시 확인
          </h3>
          <RuleCheck check={check} points={rule?.points ?? []} done={checkDone} font={font} onRight={onCheckRight} showPointInline />
        </section>
      ) : null}

      {frame && frameShown ? (
        <section aria-labelledby="passoff-frame" className="flex flex-col gap-3">
          <h3 id="passoff-frame" className="text-body font-semibold text-ink">
            내 문장 만들기
          </h3>
          <p className="text-label text-ink-soft">빈칸을 채워 나에 대한 문장을 만들어 보세요. 채점하지 않고, 이 기기에만 저장돼요.</p>
          {frame.ko ? <p className={`${FONT[font].text} text-ink-soft`}>{frame.ko}</p> : null}
          <p lang="en" className={`${FONT[font].text} flex flex-wrap items-center gap-x-1.5 gap-y-2 text-ink`}>
            {parts.map((part, i) => (
              <span key={i} className="contents">
                {part ? <span>{part}</span> : null}
                {i < blanks ? (
                  <input
                    type="text"
                    lang="en"
                    value={frameValues[i] ?? ""}
                    aria-label={`빈칸 ${i + 1}`}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(e) => {
                      const next = Array.from({ length: blanks }, (_, k) => frameValues[k] ?? "");
                      next[i] = e.target.value;
                      onFrame(next);
                    }}
                    className={`min-h-11 w-40 max-w-full rounded-control border border-line bg-surface px-3 text-ink focus:border-ink focus:outline-none ${FONT[font].input}`}
                  />
                ) : null}
              </span>
            ))}
          </p>
          {frameValues.some((v) => hasHangul(v)) ? <p className={`text-label ${tone.danger}`}>한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.</p> : null}
        </section>
      ) : null}

      {lessonDone || (stepsLeft.length === 0 && frameShown) ? (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <Verdict ok>레슨 완료 — 5단계를 모두 마쳤어요.</Verdict>
          {notCounted ? (
            <p className="text-label leading-relaxed text-ink-soft">
              이 이용권의 진도에는 아직 이 레슨이 기록되지 않았어요. &lsquo;처음부터 다시 하기&rsquo;로 5단계를 다시 마치면 기록돼요.
            </p>
          ) : null}
          <div className="flex justify-end">
            <SecondaryButton
              onClick={() => {
                if (window.confirm("이 레슨의 연습 기록(이 기기)을 지우고 처음부터 다시 할까요? 완료 표시는 그대로 둡니다.")) onReset();
              }}
            >
              처음부터 다시 하기
            </SecondaryButton>
          </div>
        </section>
      ) : frameShown && otherStepsLeft.length ? (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <p className="text-body text-ink">레슨을 마치려면 남은 단계를 끝내 주세요.</p>
          <div className="flex flex-wrap gap-2">
            {otherStepsLeft.map((s) => (
              <SecondaryButton key={s} onClick={() => onGoStep(s)}>
                {s + 1}단계로 가기
              </SecondaryButton>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
