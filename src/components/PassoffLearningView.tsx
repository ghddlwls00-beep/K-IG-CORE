"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Block } from "@/lib/types";
import type { PassoffAnchor, PassoffFormItem, PassoffFrameBlock, PassoffProduceItem, PassoffRuleBlock } from "@/lib/passoffTypes";
import { speakText, stopSpeech } from "@/lib/speech";
import { lessonSpeechForm } from "@/lib/lessonSpeechForm";
import { clearLessonGate, setLessonGate } from "@/lib/lessonGate";
import {
  composeItemDone,
  cutSets,
  emptyWork,
  formItemDone,
  newComposeState,
  newFormState,
  promptPartners,
  queueOf,
  sanitizeWork,
  settleOpen,
  type PassoffWork,
} from "@/lib/passoffLesson";
import { notePassoffLessonDone, PASSOFF_COURSE, PASSOFF_GATE_REASON, strongerHelp, type PassoffItemKind } from "@/lib/passoffLearning";
import { LESSON_COMPLETE_EVENT, useProgress } from "./ProgressProvider";
import { usePassoffProgress } from "./PassoffProgressProvider";
import { StepTabs } from "./StepTabs";
import { IconCheck, IconTextSize } from "./icons";
import { AnchorsStep } from "./passoff/AnchorsStep";
import { RuleStep } from "./passoff/RuleStep";
import { FormStep } from "./passoff/FormStep";
import { ComposeStep } from "./passoff/ComposeStep";
import { WrapUpStep } from "./passoff/WrapUpStep";
import type { ComposeReport } from "./passoff/ComposeCard";
import { FONT_LABEL, segmentButton, spokenOf, usePassoffLearner, type FontSize, type Speaker } from "./passoff/ui";

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
 * page's — and the lesson is marked complete in the course list (ProgressProvider) and on the server, where it
 * counts toward opening the next topic (PassoffProgressProvider — 설계 §5).
 *
 * 2026-09-28 — on main's common parts (docs/디자인-규칙.md §6 · §7), so the lesson looks and moves like the other courses:
 *   - the step tabs are the shared StepTabs (44px · one row on a phone · "Step N · 이름" — LessonStepNavigation, the bar
 *     below the lesson, finds them by that text and follows the ones it sees CLICKED). Every step change this view makes
 *     itself (a step's own '다음 단계', coming back to the first unfinished step) presses that step's tab (goStep), as
 *     VOCA · READING · LISTENING do;
 *   - the end of the lesson is the common LessonEndBar. This view registers a completion gate (src/lib/lessonGate.ts):
 *     '이 강의 학습 완료' stays off, with PASSOFF_GATE_REASON under it, until the five steps are done. Finishing the fifth
 *     step completes the lesson by itself, as before (설계 §3 — the course's method is unchanged); `undo: false` because
 *     the server takes completions only (설계 §5), so the bar then shows '학습 완료함' without '취소'. Should the button be
 *     pressed while the steps are done but this device has no completion mark, the same finish runs (LESSON_COMPLETE_EVENT);
 *   - the line icons of src/components/icons.tsx and the type · radius · colour tokens; text size and sentence speed sit
 *     beside the step's title, in GRAMMAR's words and segments ('글자 크기' 기본 · 크게 · 특대 · '문장 속도' 1.0× · 0.85×).
 * The textbook's own subheading of the lesson is the line under the page's title (page.tsx), as STUDENT's chapter is.
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
}: {
  blocks: Block[];
  lessonKey: string;
  lockedExtraCount?: number;
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
  // a sentence whose English prompt is another's model answer waits until that one is off the queue (작업기록 할 일 6)
  const partners = useMemo(() => promptPartners([...content.produce, ...content.transfers]), [content]);

  const [step, setStep] = useState(0);
  const [font, setFont] = useState<FontSize>("normal");
  const [speed, setSpeed] = useState<1 | 0.85>(1);
  const [showSettings, setShowSettings] = useState(false);
  const topRef = useRef<HTMLDivElement | null>(null);
  const headingRefs = useRef<(HTMLHeadingElement | null)[]>([]);
  // a tab clicked by the view itself (goStep) — how that move looks; null for the learner's own click
  const tabMove = useRef<StepMove | null>(null);
  // the step whose heading takes the focus once it is on screen
  const focusStep = useRef<number | null>(null);

  /** a step's tab in the shared StepTabs (data-step-tab is 1-based) */
  const tabOf = (index: number) => topRef.current?.querySelector<HTMLButtonElement>(`[data-step-tab="${index + 1}"]`) ?? null;

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
      const tab = topRef.current?.querySelector<HTMLButtonElement>(`[data-step-tab="${start + 1}"]`);
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
      reset: () => setSpeakingId(null),
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
  const composeQueue = queueOf(work.composeQueue, onScreenSet, composeDone, partners);
  const transferQueue = queueOf(work.transferQueue, transferIds, composeDone, partners);

  // the new step's heading takes the focus when a button inside the old step moved there — that button is now hidden
  useEffect(() => {
    if (focusStep.current !== step) return;
    focusStep.current = null;
    headingRefs.current[step]?.focus({ preventScroll: true });
  }, [step]);

  /**
   * What a step tab's click does. 2026-09-28 (사장님 — STUDENT 060705c · VOCA ecc5761 의 규칙): a step change never starts sound —
   * nothing here plays by itself (every sound is a press of a speaker button) — and it stops a sentence still playing, as the
   * other sections do, so the old step's sound does not run on into the new one.
   */
  function showStep(next: number, move: StepMove) {
    if (next !== step) {
      stopSpeech();
      speaker.reset();
    }
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
    const tab = tabOf(next);
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
  const { recordLessonComplete, confirmed, countedIds } = usePassoffProgress();
  // finished on this device, but the server — which the list and the topic lock count by — does not have it (after
  // the owner's reset, a lost write, another code here: 코드 단계 C 점검 1); only finishing it again records it
  const notCounted = work.lessonDone && confirmed && countedIds !== null && !countedIds.has(lessonId);
  // one finish per run of the five steps: the automatic one below and the end bar's button both come here
  const finishing = useRef(false);
  // whose review record the lesson goes into — the licence of this moment, or none (공통-학습-엔진.md §10)
  const learner = usePassoffLearner();
  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    update((w) => {
      w.lessonDone = true;
    });
    // …to the server, which opens the next topic from it (설계 §5 — PassoffProgressProvider)
    recordLessonComplete(lessonId);
    const entries: { key: string; kind: PassoffItemKind }[] = [
      ...content.produce.map((p) => ({ key: p.id, kind: "produce" as const })),
      ...content.transfers.map((t) => ({ key: t.id, kind: "transfer" as const })),
      ...content.forms.map((f) => ({ key: f.id, kind: f.kind })),
    ];
    notePassoffLessonDone(
      lessonId,
      entries,
      ids.compose.filter((id) => work.compose[id]?.tomorrow),
      learner,
    );
  }, [update, recordLessonComplete, lessonId, content, ids, work.compose, learner]);
  const finishRef = useRef(finish);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  useEffect(() => {
    if (!restored || !acted.current || !allDone || work.lessonDone) return;
    finish();
    // the course list's mark — its LESSON_COMPLETE_EVENT comes back to the listener below, which finds this finish done
    if (!isCompleted(PASSOFF_COURSE, lessonId)) toggleComplete(PASSOFF_COURSE, lessonId);
  }, [restored, allDone, work.lessonDone, finish, isCompleted, toggleComplete, lessonId]);

  // '이 강의 학습 완료' pressed in the end bar (open once the steps are done — see the gate below): the same finish
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ course?: string; lessonId?: string; completed?: boolean }>).detail;
      if (!detail || detail.course !== PASSOFF_COURSE || detail.lessonId !== lessonId || !detail.completed) return;
      finishRef.current();
    };
    window.addEventListener(LESSON_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(LESSON_COMPLETE_EVENT, onComplete);
  }, [lessonId]);

  // main's end bar (LessonEndBar · lessonGate): off until the five steps are done, and no undo — the server keeps completions only
  const gateReady = allDone || work.lessonDone;
  useEffect(() => {
    setLessonGate(PASSOFF_COURSE, lessonId, { ready: gateReady, reason: PASSOFF_GATE_REASON, undo: false });
  }, [gateReady, lessonId]);
  useEffect(() => () => clearLessonGate(PASSOFF_COURSE, lessonId), [lessonId]);

  const stepsLeft = done.flatMap((d, i) => (d ? [] : [i]));

  // text size and sentence speed — GRAMMAR's words and segments, beside the step's title
  const settingsButton = (
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
  const settingsPanel = showSettings ? (
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
  const heading = (index: number) => (
    <StepHeading
      n={index + 1}
      done={done[index]}
      headingRef={(node) => {
        headingRefs.current[index] = node;
      }}
      settings={settingsButton}
      panel={settingsPanel}
    />
  );

  return (
    <div ref={topRef} className="flex flex-col gap-4" data-passoff-view data-step={step + 1}>
      <StepTabs
        label="학습 단계"
        stepStart
        current={step + 1}
        onSelect={(n) => showStep(n - 1, tabMove.current ?? { scroll: true, focus: false })}
        steps={STEPS.map((s, i) => ({ n: i + 1, name: s.short }))}
      />

      <section hidden={step !== 0} aria-labelledby="passoff-step-1" className="flex flex-col gap-3">
        {heading(0)}
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
        {heading(1)}
        <RuleStep
          rule={content.rule}
          lessonId={lessonId}
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
        {heading(2)}
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
        {heading(3)}
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
        {heading(4)}
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
          notCounted={notCounted}
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
            // the five steps done again are a new finish (the server records what it lost — 코드 단계 C 점검 1)
            finishing.current = false;
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

/**
 * A step's title — focusable (tabIndex -1) so that moving on from a button inside the last step lands here — with '마침'
 * once that step is done (the shared step tabs carry names only), and the text size · speed button on the right.
 */
function StepHeading({
  n,
  done,
  headingRef,
  settings,
  panel,
}: {
  n: number;
  done: boolean;
  headingRef: (node: HTMLHeadingElement | null) => void;
  settings: ReactNode;
  panel: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="text-label font-semibold tabular-nums text-primary">{n}단계</span>
          <h2 id={`passoff-step-${n}`} tabIndex={-1} ref={headingRef} className="text-title-s font-bold text-ink">
            {STEPS[n - 1].title}
          </h2>
          {done ? (
            <span className="inline-flex items-center gap-1 text-caption font-medium text-success">
              <IconCheck size={14} />
              <span>마침</span>
            </span>
          ) : null}
        </div>
        {settings}
      </div>
      {panel}
    </div>
  );
}
