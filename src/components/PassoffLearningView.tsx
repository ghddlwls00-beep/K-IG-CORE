"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Block } from "@/lib/types";
import type { PassoffAnchor, PassoffFormItem, PassoffFrameBlock, PassoffProduceItem, PassoffRuleBlock } from "@/lib/passoffTypes";
import { speakText, stopSpeech } from "@/lib/speech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import {
  composeItemDone,
  cutSets,
  emptyWork,
  formItemDone,
  newComposeState,
  newFormState,
  queueOf,
  sanitizeWork,
  settleOpen,
  type PassoffWork,
} from "@/lib/passoffLesson";
import { notePassoffLessonDone, PASSOFF_COURSE, strongerHelp, type PassoffItemKind } from "@/lib/passoffLearning";
import { useProgress } from "./ProgressProvider";
import { AnchorsStep } from "./passoff/AnchorsStep";
import { RuleStep } from "./passoff/RuleStep";
import { FormStep } from "./passoff/FormStep";
import { ComposeStep } from "./passoff/ComposeStep";
import { WrapUpStep } from "./passoff/WrapUpStep";
import type { ComposeReport } from "./passoff/ComposeCard";
import { CheckIcon, TextSizeIcon, spokenOf, tone, type FontSize, type Speaker } from "./passoff/ui";

/**
 * PASS-OFF GRAMMAR lesson view — the same five steps for every lesson (docs/pass-off-grammar/설계.md §3; the
 * owner's rule: one course, one way of learning):
 *   ① 예문 떠올리기  ② 규칙  ③ 형태 찾기  ④ 영작  ⑤ 마무리
 *
 * It receives ONE lesson's blocks as props, after the server gate (ISS-00 — never import lesson JSON here), and
 * only what the steps draw (src/lib/passoffView.ts). On a free preview lesson the server leaves out the paid
 * STUDENT sentences and passes how many there are (`lockedExtraCount`).
 *
 * Practice state stays on this device (localStorage kig:passoff:work:<lessonKey>, src/lib/passoffLesson.ts) —
 * an answer is kept the moment it is given, and one not passed on with '다음' before the learner left is passed on
 * when the lesson opens again (settleOpen). Every answer and, when all five steps are done, the lesson itself go
 * to the common learning engine (src/lib/passoffLearning.ts) — review across days is the engine's, not this
 * page's — and the lesson is marked complete in the course list (ProgressProvider).
 *
 * The step tabs carry "Step N": LessonStepNavigation, the '← 이전 Step · 다음 Step →' bar below the lesson, finds
 * them by it and follows the ones it sees CLICKED — so every step change this view makes itself (a step's own
 * '다음 단계', coming back to the first unfinished step) goes through that step's tab (goStep). Design rules:
 * docs/디자인-규칙.md — tokens, line icons, 44px targets, 16px inputs; the common frame's step tabs and end bar
 * replace this header once main is merged (설계 §15).
 */
const STEPS = [
  { short: "예문", title: "예문 떠올리기" },
  { short: "규칙", title: "규칙" },
  { short: "찾기", title: "형태 찾기" },
  { short: "영작", title: "영작" },
  { short: "마무리", title: "마무리" },
] as const;

interface LessonContent {
  anchors: PassoffAnchor[];
  rule: PassoffRuleBlock | null;
  forms: PassoffFormItem[];
  produce: PassoffProduceItem[];
  transfers: PassoffProduceItem[];
  frame: PassoffFrameBlock | null;
  sets: PassoffProduceItem[][];
}

function contentOf(blocks: Block[]): LessonContent {
  const anchors = blocks.flatMap((b) => (b.type === "anchors" ? b.items : []));
  const rule = blocks.find((b): b is PassoffRuleBlock => b.type === "rule") ?? null;
  const drills = blocks.flatMap((b) => (b.type === "drill" ? [b] : []));
  const forms = drills.flatMap((d) => d.select ?? []).filter((s) => !s.reserve);
  const produce = drills.flatMap((d) => d.produce ?? []);
  const transfers = drills.flatMap((d) => d.transfer ?? []);
  const frame = blocks.find((b): b is PassoffFrameBlock => b.type === "frame") ?? null;
  return { anchors, rule, forms, produce, transfers, frame, sets: cutSets(produce) };
}

/** Which of the five steps are finished. */
function stepsDone(c: LessonContent, w: PassoffWork): boolean[] {
  const composed = (items: PassoffProduceItem[]) => items.every((i) => w.compose[i.id]?.done);
  const check = Boolean(c.rule?.check);
  return [
    c.anchors.every((a) => w.revealed.includes(a.id)),
    !c.rule || ((!c.rule.discovery || w.discovery !== null) && (!check || w.ruleCheck)),
    c.forms.every((f) => w.form[f.id]?.done),
    composed(c.produce),
    composed(c.transfers) && (!check || w.wrapCheck),
  ];
}

/** ④'s set on screen (a stored index past the last set means the last one). */
const setIndexOf = (c: LessonContent, w: PassoffWork) => Math.min(w.composeSet, Math.max(0, c.sets.length - 1));

/** How a step change the view makes itself should look: scrolled to the steps, and the new step's heading focused. */
interface StepMove {
  scroll: boolean;
  focus: boolean;
}

export function PassoffLearningView({
  blocks,
  lessonKey,
  lockedExtraCount = 0,
  subtitle,
}: {
  blocks: Block[];
  lessonKey: string;
  lockedExtraCount?: number;
  /** the textbook's own subheading for this link of the map (D1: the title is the link, this is the subtitle) */
  subtitle?: string | null;
}) {
  const lessonId = lessonKey.split("/").pop() ?? lessonKey;
  const content = useMemo(() => contentOf(blocks), [blocks]);
  const ids = useMemo(
    () => ({
      anchors: content.anchors.map((a) => a.id),
      forms: content.forms.map((f) => f.id),
      compose: [...content.produce, ...content.transfers].map((p) => p.id),
    }),
    [content],
  );

  const [step, setStep] = useState(0);
  const [font, setFont] = useState<FontSize>("normal");
  const [speed, setSpeed] = useState<1 | 0.85>(1);
  const [showSettings, setShowSettings] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  // a tab clicked by the view itself (goStep) — how that move looks; null for the learner's own click
  const tabMove = useRef<StepMove | null>(null);
  // the step whose heading takes the focus once it is on screen
  const focusStep = useRef<number | null>(null);

  // ── practice state on this device
  const storageKey = `kig:passoff:work:${lessonKey}`;
  const [work, setWork] = useState<PassoffWork>(emptyWork);
  const [restored, setRestored] = useState(false);
  // a learner's own action — only then is anything saved or the lesson marked complete (never on the restore)
  const acted = useRef(false);

  useEffect(() => {
    let next = emptyWork();
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) next = sanitizeWork(JSON.parse(raw), ids);
    } catch {
      // private window or blocked storage: the lesson works, and forgets on leaving
    }
    // an answer given but not passed on with '다음' before leaving: passed on now, as the button would have
    const onScreenSet = (content.sets[setIndexOf(content, next)] ?? []).map((p) => p.id);
    if (settleOpen(next, { forms: ids.forms, composeSet: onScreenSet, transfers: content.transfers.map((t) => t.id) })) acted.current = true;
    setWork(next);
    // come back to the first step not finished yet
    const firstOpen = stepsDone(content, next).findIndex((d) => !d);
    const start = firstOpen < 0 ? 4 : firstOpen;
    setStep(start);
    setRestored(true);
    // …and tell the bar below the lesson through that step's tab. Its click listener starts after this effect
    // (it is later in the page), so the click waits a frame.
    const frame = window.requestAnimationFrame(() => {
      const tab = tabRefs.current[start];
      if (!tab) return;
      tabMove.current = { scroll: false, focus: false };
      tab.click();
      tabMove.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [storageKey, ids, content]);

  useEffect(() => {
    if (!restored || !acted.current) return;
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(work));
      } catch {
        // ignore — see above
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [work, restored, storageKey]);

  const update = useCallback((change: (w: PassoffWork) => void) => {
    acted.current = true;
    setWork((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as PassoffWork;
      change(next);
      return next;
    });
  }, []);

  // ── sound: the item's `speakAs` or `en`, in this page's spoken form (the string spoken-texts.cjs lists)
  const [speakingId, setSpeakingId] = useState<string | null>(null);
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
        speakText(lessonSpeechForm(lessonKey, spokenOf(item)), {
          lang: "en",
          rate: speed,
          onStart: () => setSpeakingId(id),
          onEnd: () => setSpeakingId((curr) => (curr === id ? null : curr)),
          onError: () => setSpeakingId((curr) => (curr === id ? null : curr)),
        });
      },
    }),
    [speakingId, lessonKey, speed],
  );

  // ── steps
  const done = useMemo(() => stepsDone(content, work), [content, work]);
  const allDone = done.every(Boolean);
  const composeDone = (id: string) => Boolean(work.compose[id]?.done);
  const setIndex = setIndexOf(content, work);
  const onScreenSet = (content.sets[setIndex] ?? []).map((p) => p.id);
  const transferIds = content.transfers.map((t) => t.id);
  const formQueue = queueOf(work.formQueue, ids.forms, (id) => Boolean(work.form[id]?.done));
  const composeQueue = queueOf(work.composeQueue, onScreenSet, composeDone);
  const transferQueue = queueOf(work.transferQueue, transferIds, composeDone);

  // the new step's heading takes the focus when a button inside the old step moved there — that button is now hidden
  useEffect(() => {
    if (focusStep.current !== step) return;
    focusStep.current = null;
    headingRefs.current[step]?.focus({ preventScroll: true });
  }, [step]);

  /** What a step tab's click does. */
  function showStep(next: number, move: StepMove) {
    if (move.focus) {
      if (next === step) headingRefs.current[next]?.focus({ preventScroll: true });
      else focusStep.current = next;
    }
    setStep(next);
    const top = topRef.current;
    if (move.scroll && top) window.scrollTo({ top: Math.max(0, top.getBoundingClientRect().top + window.scrollY - 72), behavior: "smooth" });
  }

  /** A step change the view makes itself — through the step's tab, so the bar below the lesson follows. */
  function goStep(next: number, move: StepMove = { scroll: true, focus: true }) {
    const tab = tabRefs.current[next];
    if (!tab) {
      showStep(next, move);
      return;
    }
    tabMove.current = move;
    tab.click();
    tabMove.current = null;
  }

  function composeReport(list: "composeQueue" | "transferQueue"): ComposeReport {
    return {
      firstTry: (id, { right, first }) =>
        update((w) => {
          const s = w.compose[id] ?? newComposeState();
          if (!s.first && first) s.first = first;
          s.open = right ? "right" : "missed";
          w.compose[id] = s;
        }),
      help: (id, help) =>
        update((w) => {
          const s = w.compose[id] ?? newComposeState();
          s.help = strongerHelp(s.help, help);
          w.compose[id] = s;
        }),
      done: (id, outcome, queue) =>
        update((w) => {
          const s = w.compose[id] ?? newComposeState();
          if (!s.first && outcome.first) s.first = outcome.first;
          w.compose[id] = s;
          composeItemDone(w, list, queue, id, outcome.success);
        }),
    };
  }

  // ── the lesson is finished: once, after the learner's own last action (never on a restore)
  const { isCompleted, toggleComplete } = useProgress();
  useEffect(() => {
    if (!restored || !acted.current || !allDone || work.lessonDone) return;
    update((w) => {
      w.lessonDone = true;
    });
    if (!isCompleted(PASSOFF_COURSE, lessonId)) toggleComplete(PASSOFF_COURSE, lessonId);
    const entries: { key: string; kind: PassoffItemKind }[] = [
      ...content.produce.map((p) => ({ key: p.id, kind: "produce" as const })),
      ...content.transfers.map((t) => ({ key: t.id, kind: "transfer" as const })),
      ...content.forms.map((f) => ({ key: f.id, kind: f.kind })),
    ];
    notePassoffLessonDone(
      lessonId,
      entries,
      ids.compose.filter((id) => work.compose[id]?.tomorrow),
    );
  }, [restored, allDone, work.lessonDone, work.compose, update, isCompleted, toggleComplete, lessonId, content, ids]);

  const stepsLeft = done.flatMap((d, i) => (d ? [] : [i]));

  return (
    <div ref={topRef} className="flex flex-col gap-5">
      {subtitle ? <p className="-mt-3 text-[14px] text-ink-soft">{subtitle}</p> : null}

      <div className="flex items-center gap-2">
        <nav aria-label="학습 단계" className="flex min-w-0 flex-1 flex-wrap gap-1">
          {STEPS.map((s, i) => {
            const current = i === step;
            return (
              <button
                key={s.short}
                ref={(node) => {
                  tabRefs.current[i] = node;
                }}
                type="button"
                onClick={() => showStep(i, tabMove.current ?? { scroll: true, focus: false })}
                aria-current={current ? "step" : undefined}
                aria-label={`${i + 1}단계 ${s.title}${done[i] ? " · 마침" : ""}`}
                className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl border px-2.5 text-[14px] transition-colors ${
                  current ? "border-primary font-semibold text-primary" : "border-line text-ink-soft hover:bg-sunken"
                }`}
              >
                <span className="tabular-nums">{i + 1}</span>
                <span className={current ? "" : "hidden sm:inline"}>{s.short}</span>
                {done[i] ? (
                  <span className={tone.success}>
                    <CheckIcon size={14} />
                  </span>
                ) : null}
                {/* LessonStepNavigation finds the tabs by this text */}
                <span className="sr-only"> Step {i + 1}</span>
              </button>
            );
          })}
        </nav>
        <button
          type="button"
          aria-expanded={showSettings}
          aria-label="글자 크기 · 소리 빠르기"
          onClick={() => setShowSettings((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line text-ink-soft transition-colors hover:bg-sunken"
        >
          <TextSizeIcon />
        </button>
      </div>

      {showSettings ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line p-3">
          <div role="group" aria-label="글자 크기" className="flex items-center gap-1">
            <span className="mr-1 text-[14px] text-ink-soft">글자</span>
            {(
              [
                ["normal", "기본"],
                ["large", "크게"],
                ["xlarge", "특대"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={font === key}
                onClick={() => setFont(key)}
                className={`min-h-11 min-w-11 rounded-xl border px-3 text-[14px] ${font === key ? "border-line-strong font-semibold text-ink" : "border-line text-ink-soft hover:bg-sunken"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div role="group" aria-label="소리 빠르기" className="flex items-center gap-1">
            <span className="mr-1 text-[14px] text-ink-soft">빠르기</span>
            {([1, 0.85] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={speed === value}
                onClick={() => setSpeed(value)}
                className={`min-h-11 min-w-11 rounded-xl border px-3 text-[14px] tabular-nums ${speed === value ? "border-line-strong font-semibold text-ink" : "border-line text-ink-soft hover:bg-sunken"}`}
              >
                {value === 1 ? "1.0" : "0.85"}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <section hidden={step !== 0} aria-labelledby="passoff-step-1" className="flex flex-col gap-3">
        <StepHeading
          n={1}
          headingRef={(node) => {
            headingRefs.current[0] = node;
          }}
        />
        <AnchorsStep
          anchors={content.anchors}
          revealed={work.revealed}
          onReveal={(id) =>
            update((w) => {
              if (!w.revealed.includes(id)) w.revealed.push(id);
            })
          }
          speaker={speaker}
          font={font}
          lockedExtraCount={lockedExtraCount}
          onNext={() => goStep(1)}
        />
      </section>

      <section hidden={step !== 1} aria-labelledby="passoff-step-2" className="flex flex-col gap-3">
        <StepHeading
          n={2}
          headingRef={(node) => {
            headingRefs.current[1] = node;
          }}
        />
        <RuleStep
          rule={content.rule}
          anchors={content.anchors}
          revealed={work.revealed}
          discovery={work.discovery}
          onDiscovery={(option) =>
            update((w) => {
              if (w.discovery === null) w.discovery = option;
            })
          }
          checkDone={work.ruleCheck}
          onCheckRight={() =>
            update((w) => {
              w.ruleCheck = true;
            })
          }
          font={font}
          onGoAnchors={() => goStep(0)}
          onNext={() => goStep(2)}
        />
      </section>

      <section hidden={step !== 2} aria-labelledby="passoff-step-3" className="flex flex-col gap-3">
        <StepHeading
          n={3}
          headingRef={(node) => {
            headingRefs.current[2] = node;
          }}
        />
        <FormStep
          items={content.forms}
          queue={formQueue}
          lessonId={lessonId}
          font={font}
          states={work.form}
          onItemFirstTry={(id, right) =>
            update((w) => {
              const s = w.form[id] ?? newFormState();
              s.open = right ? "right" : "missed";
              w.form[id] = s;
            })
          }
          onItemShown={(id) =>
            update((w) => {
              const s = w.form[id] ?? newFormState();
              s.help = "reveal";
              w.form[id] = s;
            })
          }
          onItemDone={(id, firstTryRight) => update((w) => formItemDone(w, formQueue, id, firstTryRight))}
          onNext={() => goStep(3)}
        />
      </section>

      <section hidden={step !== 3} aria-labelledby="passoff-step-4" className="flex flex-col gap-3">
        <StepHeading
          n={4}
          headingRef={(node) => {
            headingRefs.current[3] = node;
          }}
        />
        <ComposeStep
          sets={content.sets}
          setIndex={setIndex}
          queue={composeQueue}
          states={work.compose}
          lessonId={lessonId}
          font={font}
          speaker={speaker}
          ruleTitle={content.rule?.title}
          report={composeReport("composeQueue")}
          onNextSet={() =>
            update((w) => {
              w.composeSet = setIndex + 1;
              w.composeQueue = null;
            })
          }
          onNext={() => goStep(4)}
        />
      </section>

      <section hidden={step !== 4} aria-labelledby="passoff-step-5" className="flex flex-col gap-3">
        <StepHeading
          n={5}
          headingRef={(node) => {
            headingRefs.current[4] = node;
          }}
        />
        <WrapUpStep
          transfers={content.transfers}
          queue={transferQueue}
          states={work.compose}
          rule={content.rule}
          checkDone={work.wrapCheck}
          frame={content.frame}
          frameValues={work.frame}
          lessonId={lessonId}
          font={font}
          speaker={speaker}
          stepsLeft={stepsLeft}
          lessonDone={work.lessonDone}
          report={composeReport("transferQueue")}
          onCheckRight={() =>
            update((w) => {
              w.wrapCheck = true;
            })
          }
          onFrame={(values) =>
            update((w) => {
              w.frame = values;
            })
          }
          onGoStep={(s) => goStep(s)}
          onReset={() => {
            acted.current = false;
            try {
              window.localStorage.removeItem(storageKey);
            } catch {
              // ignore
            }
            setWork(emptyWork());
            goStep(0);
          }}
        />
      </section>
    </div>
  );
}

/** A step's title — focusable (tabIndex -1) so that moving on from a button inside the last step lands here. */
function StepHeading({ n, headingRef }: { n: number; headingRef: (node: HTMLHeadingElement | null) => void }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[14px] font-semibold tabular-nums text-primary">{n}단계</span>
      <h2 id={`passoff-step-${n}`} tabIndex={-1} ref={headingRef} className="text-[18px] font-bold text-ink">
        {STEPS[n - 1].title}
      </h2>
    </div>
  );
}
