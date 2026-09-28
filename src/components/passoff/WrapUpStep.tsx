"use client";

import Link from "next/link";
import type { PassoffFrameBlock, PassoffProduceItem, PassoffRuleBlock } from "@/lib/passoffTypes";
import { hasHangul } from "@/lib/passoffGrading";
import { frameParts, ruleQuestionKey, type ComposeItemState } from "@/lib/passoffLesson";
import { ComposeRun } from "./ComposeStep";
import type { ComposeReport } from "./ComposeCard";
import { RuleCheck } from "./RuleStep";
import { FONT, SecondaryButton, Verdict, tone, type FontSize, type Speaker } from "./ui";

/**
 * ⑤ 마무리 (설계 §3): two sentences the lesson has not shown (graded as in ④) → the rule check once more → my own
 * sentence on the lesson's frame (not graded, kept on this device only). Once ①~⑤ are done the learner finishes the
 * lesson with the end bar's '이 강의 학습 완료' below (단계 2-나 E2 — as in the other courses), and the topic's last lesson
 * then links "구성도 다시 채우기" (`mapRefill`) until it has been done.
 *
 * E2 수정: the link only once the topic's lessons are done (`ready` — before that one line says how many are left; the server
 * takes a map refill only then). It is the page's one filled button while the map opens the next topic (`required` — the
 * end bar's '다음 강의' keeps its border then: lessonGate `quietNext`), and a bordered one otherwise (the last topic, a next
 * topic already open, a LIFE pass). 'TOPIC N이 열리는 조건' is said only when there is such a next topic.
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
  mapRefill = null,
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
  /**
   * the topic's last lesson and its "구성도 다시 채우기" not done yet — `ready`: the topic's lessons are done (the map opens);
   * `left`: lessons still to finish before that; `required`: the map is what opens the next topic (a next topic still locked)
   */
  mapRefill?: { href: string; topic: number; ready: boolean; left: number; required: boolean } | null;
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
                이 강의에서 아직 보지 않은 문장이에요. 배운 문법으로 써 보세요. ({transfers.length - queue.length + 1} / {transfers.length})
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
            문법 설명 다시 확인
          </h3>
          <RuleCheck
            check={check}
            orderKey={ruleQuestionKey(lessonId, "check")}
            points={rule?.points ?? []}
            done={checkDone}
            font={font}
            onRight={onCheckRight}
            showPointInline
          />
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

      {lessonDone ? (
        <section aria-live="polite" className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <Verdict ok>강의 완료 — 5단계를 모두 마쳤어요.</Verdict>
          {notCounted ? (
            <p className="text-label leading-relaxed text-ink-soft">
              이 이용권의 진도에는 아직 이 강의가 기록되지 않았어요. &lsquo;처음부터 다시 하기&rsquo;로 5단계를 다시 마치면 기록돼요.
            </p>
          ) : null}
          {mapRefill && !mapRefill.ready ? (
            <div className="flex flex-col gap-1 border-t border-line pt-3" data-passoff-map-entry={mapRefill.topic} data-passoff-map-entry-waiting>
              <p className="text-body font-semibold text-ink">TOPIC {mapRefill.topic} 마무리 — 구성도 다시 채우기</p>
              <p className="text-label leading-relaxed text-ink-soft">
                대주제의 강의를 <span className="tabular-nums">{mapRefill.left}</span>개 더 마치면 할 수 있어요.
              </p>
            </div>
          ) : mapRefill ? (
            <div className="flex flex-col gap-2 border-t border-line pt-3" data-passoff-map-entry={mapRefill.topic}>
              <p className="text-body font-semibold text-ink">TOPIC {mapRefill.topic} 마무리 — 구성도 다시 채우기</p>
              <p className="text-label leading-relaxed text-ink-soft">
                대주제의 강의를 칸에 놓고, 칸마다 문법 설명 한 줄과 대표 문장을 골라요.
                {mapRefill.required ? " 한 번 하면 다음 대주제가 열리는 조건이 채워져요." : ""}
              </p>
              <div>
                <Link
                  href={mapRefill.href}
                  className={`inline-flex min-h-11 items-center justify-center rounded-control px-4 text-label font-semibold ${
                    mapRefill.required
                      ? "bg-ink text-surface transition-opacity hover:opacity-90"
                      : "border border-line bg-surface text-ink transition-colors hover:bg-sunken"
                  }`}
                >
                  구성도 다시 채우기
                </Link>
              </div>
            </div>
          ) : null}
          <div className="flex justify-end">
            <SecondaryButton
              onClick={() => {
                if (window.confirm("이 강의의 연습 기록(이 기기)을 지우고 처음부터 다시 할까요? 완료 표시는 그대로 둡니다.")) onReset();
              }}
            >
              처음부터 다시 하기
            </SecondaryButton>
          </div>
        </section>
      ) : stepsLeft.length === 0 && frameShown ? (
        <section aria-live="polite" className="flex flex-col gap-2 rounded-card border border-line bg-raised p-4" data-passoff-steps-done>
          <Verdict ok>5단계를 모두 마쳤어요.</Verdict>
          <p className="text-label leading-relaxed text-ink-soft">아래 &lsquo;이 강의 학습 완료&rsquo;를 누르면 강의가 완료돼요.</p>
        </section>
      ) : frameShown && otherStepsLeft.length ? (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4">
          <p className="text-body text-ink">강의를 마치려면 남은 단계를 끝내 주세요.</p>
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
