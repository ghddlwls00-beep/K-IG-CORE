"use client";

import { useRef, useState } from "react";
import type { PassoffProduceItem } from "@/lib/passoffTypes";
import { gradeProduce, hasHangul, isCorrect, writingIssues, type DiffToken, type ProduceResult } from "@/lib/passoffGrading";
import { contrastPool, contrastTiles, firstLetters } from "@/lib/passoffLesson";
import { generateWordBank, verifyAnyWordSequence, type WordTile } from "@/lib/listeningUtils";
import { notePassoffAttempt, strongerHelp, type PassoffHelp } from "@/lib/passoffLearning";
import { VoiceSpeakingTester } from "../VoiceSpeakingTester";
import { Chip, FONT, PrimaryButton, SecondaryButton, SpeakButton, StudentTag, Verdict, tone, type FontSize, type Speaker } from "./ui";

export interface ComposeOutcome {
  /** right at the first try of this presentation (no help can come before a first try) */
  success: boolean;
  /** the first try of the item's first presentation — the set's two-line score */
  first: { answer: string; verdict: string; reference: string } | null;
}

/**
 * What a card tells the lesson about its sentence, each kept in the practice state the moment it happens — not
 * only at '다음 문장', so a reload after the answer was shown cannot bring the sentence back as new (점검 2026-09-27).
 */
export interface ComposeReport {
  /** the first try of a presentation: right on its own or not, and (first presentation) the answer for the set's score */
  firstTry: (id: string, result: { right: boolean; first: ComposeOutcome["first"] }) => void;
  /** help taken: ② the clue, ③ the tiles, ④ the answer */
  help: (id: string, help: PassoffHelp) => void;
  /** '다음 문장' */
  done: (id: string, outcome: ComposeOutcome, queue: string[]) => void;
}

/** the help each ladder rung is (설계 §4): ① where it is wrong is not help; ② clue · ③ tiles · ④ the answer are */
const HELP_AT: PassoffHelp[] = ["none", "none", "hint", "tiles", "reveal"];

/**
 * One ④ / ⑤ sentence (설계 §3 ④): the Korean (+ condition chips, the English prompt of a transformation) → typed,
 * or said into the microphone (what it heard fills the box, to fix before checking) → graded by
 * src/lib/passoffGrading.ts. The answer is locked until a try. A wrong try climbs the ladder, one rung each time
 * (or by '도움 받기'): ① where it is wrong (missing box · wrong wavy · extra struck through) → ② a clue (the
 * lesson's rule, a missing target, each word's first letter) → ③ word tiles with two grammar distractors →
 * ④ the answer, the rule and its sound. Every answer is recorded with the help taken BEFORE it — in this
 * presentation or an earlier one (`priorHelp`: once the answer was shown, a comeback's answers carry "reveal").
 */
export function ComposeCard({
  item,
  kind,
  lessonId,
  presentation,
  comebacksLeft,
  priorHelp,
  font,
  speaker,
  ruleTitle,
  onFirstTry,
  onHelp,
  onDone,
}: {
  item: PassoffProduceItem;
  kind: "produce" | "transfer";
  lessonId: string;
  /** 0 the first time; the item came back `presentation` times */
  presentation: number;
  /** comebacks left if this presentation is not right on its own */
  comebacksLeft: number;
  /** the most help the sentence had before this presentation */
  priorHelp: PassoffHelp;
  font: FontSize;
  speaker: Speaker;
  ruleTitle?: string;
  onFirstTry: (result: { right: boolean; first: ComposeOutcome["first"] }) => void;
  onHelp: (help: PassoffHelp) => void;
  onDone: (outcome: ComposeOutcome) => void;
}) {
  const [text, setText] = useState("");
  const [heard, setHeard] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const [rung, setRung] = useState(0);
  const [result, setResult] = useState<ProduceResult | null>(null);
  const [phase, setPhase] = useState<"answer" | "right" | "revealed">("answer");
  const [first, setFirst] = useState<ComposeOutcome["first"]>(null);
  const [hangul, setHangul] = useState(false);
  const [bank, setBank] = useState<{ acceptedWordSequences: string[][]; tiles: WordTile[] } | null>(null);
  const [tilePicks, setTilePicks] = useState<WordTile[]>([]);
  const [tileMiss, setTileMiss] = useState(false);
  const [rightBy, setRightBy] = useState<{ answer: string; result: ProduceResult | null } | null>(null);
  const composing = useRef(false);
  const success = first !== null && (first.verdict === "correct" || first.verdict === "typo");

  function climb(to: number) {
    const next = Math.min(4, to);
    // the tiles are shuffled here, in the handler — never while rendering (the server's HTML would differ)
    if (next >= 3 && !bank) {
      const pool = contrastPool(item);
      const words = generateWordBank(item.en, pool);
      setBank({ acceptedWordSequences: words.acceptedWordSequences, tiles: contrastTiles(words, pool) });
    }
    if (next >= 4) setPhase("revealed");
    setRung(next);
    if (HELP_AT[next] !== "none") onHelp(HELP_AT[next]);
  }

  function check() {
    if (phase !== "answer" || composing.current) return;
    const answer = text.trim();
    if (!answer) return;
    const mode = heard !== null && answer === heard.trim() ? "voice" : "typed";
    const res = gradeProduce(answer, item, { spoken: mode === "voice" });
    if (res.verdict === "empty") return;
    if (res.verdict === "hangul") {
      setHangul(true);
      return;
    }
    setHangul(false);
    const correct = isCorrect(res);
    const firstTry = checks === 0;
    if (firstTry) {
      const firstAnswer = { answer, verdict: res.verdict, reference: res.reference };
      setFirst(firstAnswer);
      onFirstTry({ right: correct, first: presentation === 0 ? firstAnswer : null });
    }
    notePassoffAttempt({
      lessonId,
      itemId: item.id,
      kind,
      correct,
      help: strongerHelp(priorHelp, HELP_AT[rung]),
      mode,
      firstTry: firstTry && presentation === 0,
      answer,
    });
    setChecks((c) => c + 1);
    setResult(res);
    if (correct) {
      setRightBy({ answer, result: res });
      setPhase("right");
    } else {
      climb(rung + 1);
    }
  }

  function checkTiles() {
    if (!bank || !tilePicks.length) return;
    const words = tilePicks.map((t) => t.word);
    const assembled = words.join(" ");
    const correct = verifyAnyWordSequence(words, bank.acceptedWordSequences) || isCorrect(gradeProduce(assembled, item));
    notePassoffAttempt({ lessonId, itemId: item.id, kind, correct, help: strongerHelp(priorHelp, "tiles"), mode: "tap", firstTry: false, answer: assembled });
    setChecks((c) => c + 1);
    if (correct) {
      setRightBy({ answer: assembled, result: null });
      setPhase("right");
    } else {
      setTileMiss(true);
    }
  }

  const issues = rightBy?.result ? writingIssues(rightBy.answer, rightBy.result) : null;
  const typo = rightBy?.result?.verdict === "typo" ? rightBy.result.typo : null;
  const comeback = success ? null : comebacksLeft > 0 ? "이 문장은 조금 뒤에 다시 나와요." : "이 문장은 여러 번 다시 풀었어요. 다음으로 넘어가요.";

  return (
    <section className="flex flex-col gap-4 rounded-card border border-line bg-raised p-4">
      {item.challenge || item.condition || item.clauseLabel || presentation > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          {item.challenge ? <Chip strong>도전</Chip> : null}
          {item.condition ? <Chip>{item.condition}</Chip> : null}
          {item.clauseLabel ? <Chip>{item.clauseLabel}</Chip> : null}
          {presentation > 0 ? <span className="text-caption text-ink-faint">다시 풀기</span> : null}
        </div>
      ) : null}
      {item.promptEn ? (
        <p lang="en" className={`${FONT[font].text} text-ink-soft`}>
          {item.promptEn}
        </p>
      ) : null}
      <p className={`${FONT[font].text} font-semibold text-ink`}>{item.ko}</p>

      {phase === "answer" && rung < 3 ? (
        <div className="flex flex-col gap-2">
          <textarea
            lang="en"
            rows={2}
            value={text}
            aria-label="영작 답"
            placeholder="영어로 쓰세요"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="done"
            onChange={(e) => {
              setText(e.target.value);
              setHangul(hasHangul(e.target.value));
            }}
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={() => {
              composing.current = false;
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                check();
              }
            }}
            className={`w-full resize-none rounded-control border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none ${FONT[font].input}`}
          />
          {hangul ? (
            <p className={`text-label ${tone.danger}`}>한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.</p>
          ) : (
            <p className="text-caption text-ink-faint">영어 자판으로 쓰세요. 첫 글자 대문자와 끝 문장부호는 서술형 점수로 따로 봐요.</p>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* the shared microphone (44px since main's common parts). resultView "none": no score, no answer — what it heard
                fills the box, and passoffGrading grades that text as before. onStart: the play button of a sentence it stopped */}
            <VoiceSpeakingTester
              targetText={item.en}
              buttonLabel="마이크로 말해서 영작하기"
              resultView="none"
              onStart={speaker.reset}
              onSuccess={(transcript) => {
                setText(transcript);
                setHeard(transcript);
                setHangul(hasHangul(transcript));
              }}
            />
            <div className="flex flex-wrap gap-2">
              {rung >= 1 ? <SecondaryButton onClick={() => climb(rung + 1)}>도움 받기</SecondaryButton> : null}
              <PrimaryButton disabled={!text.trim()} onClick={check}>
                {checks ? "다시 확인" : "확인"}
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}

      {phase === "answer" && rung >= 1 && rung < 3 && result ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Verdict ok={false}>틀린 자리를 표시했어요. 고쳐서 다시 확인하세요.</Verdict>
          <DiffLine tokens={result.diff} reveal={false} font={font} />
          <p className="text-caption text-ink-faint">빈 네모 = 빠진 낱말 · 물결 = 틀린 낱말 · 가운데 줄 = 필요 없는 낱말 · 점선 = 자리가 바뀐 낱말</p>
          {result.pattern ? <p className={`${FONT[font].text} text-ink`}>{result.pattern.hint}</p> : null}
          {result.negationFlip ? <p className="text-body text-ink">뜻이 반대가 됐어요. not · no · never 가 있어야 하는지 보세요.</p> : null}
          {result.diff.some((t) => t.opposite) ? <p className="text-body text-ink">뜻이 반대인 낱말을 썼어요(앞에 붙는 말을 확인하세요).</p> : null}
          {rung >= 2 ? (
            <div className="flex flex-col gap-1 border-t border-line pt-2">
              <p className="text-label font-semibold text-ink-soft">단서</p>
              {ruleTitle ? <p className="text-body text-ink">규칙: {ruleTitle}</p> : null}
              {result.missingTargets.length ? <p className="text-body text-ink">이 문장에 꼭 써야 하는 문법 낱말이 빠졌어요.</p> : null}
              <p className="text-label text-ink-soft">낱말의 첫 글자</p>
              <p lang="en" className={`font-mono ${FONT[font].text} text-ink`}>
                {firstLetters(item.en)}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "answer" && rung === 3 && bank ? (
        <div className="flex flex-col gap-3 border-t border-line pt-3">
          <p className="text-label text-ink-soft">낱말 카드를 차례로 누르세요. 문법이 틀린 카드도 섞여 있어요. 놓은 카드를 누르면 돌아가요.</p>
          <div lang="en" aria-label="만든 문장" className="flex min-h-14 flex-wrap gap-2 rounded-control border border-dashed border-line p-2">
            {tilePicks.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setTilePicks((prev) => prev.filter((x) => x.id !== t.id));
                  setTileMiss(false);
                }}
                className={`min-h-11 min-w-11 rounded-control border border-line-strong bg-sunken px-3 ${FONT[font].text} text-ink`}
              >
                {t.word}
              </button>
            ))}
          </div>
          <div lang="en" aria-label="낱말 카드" className="flex flex-wrap gap-2">
            {bank.tiles.map((t) => {
              const used = tilePicks.some((x) => x.id === t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={used}
                  onClick={() => {
                    setTilePicks((prev) => [...prev, t]);
                    setTileMiss(false);
                  }}
                  className={`min-h-11 min-w-11 rounded-control border border-line px-3 ${FONT[font].text} text-ink transition-colors hover:bg-sunken disabled:opacity-30`}
                >
                  {t.word}
                </button>
              );
            })}
          </div>
          {tileMiss ? <Verdict ok={false}>낱말이나 순서가 달라요. 고쳐서 다시 확인하세요.</Verdict> : null}
          <div className="flex flex-wrap justify-end gap-2">
            <SecondaryButton onClick={() => climb(4)}>정답 보기</SecondaryButton>
            <PrimaryButton disabled={!tilePicks.length} onClick={checkTiles}>
              확인
            </PrimaryButton>
          </div>
        </div>
      ) : null}

      {phase === "right" ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <Verdict ok>{typo && typo.typed ? `맞았어요. 철자만 확인하세요: ${typo.typed} → ${typo.expected}` : "맞았어요."}</Verdict>
          {issues && (issues.capital || issues.punctuation) ? (
            <p className="text-label text-ink-soft">
              서술형 기준으로는 {[issues.capital ? "대문자" : "", issues.punctuation ? "끝 문장부호" : ""].filter(Boolean).join(" · ")}를 확인하세요.
            </p>
          ) : null}
          <div className="flex items-start justify-between gap-3">
            <p lang="en" className={`${FONT[font].text} font-semibold text-ink`}>
              {item.en}
            </p>
            <SpeakButton speaking={speaker.speakingId === item.id} onClick={() => speaker.toggle(item.id, item)} />
          </div>
          <StudentTag studentRef={item.studentRef} />
          {comeback ? <p className="text-label text-ink-soft">{comeback}</p> : null}
        </div>
      ) : null}

      {phase === "revealed" ? (
        <div className="flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-label font-semibold text-ink-soft">정답</p>
          <div className="flex items-start justify-between gap-3">
            <p lang="en" className={`${FONT[font].text} font-semibold text-ink`}>
              {item.en}
            </p>
            <SpeakButton speaking={speaker.speakingId === item.id} onClick={() => speaker.toggle(item.id, item)} />
          </div>
          {result && result.diff.length ? (
            <>
              <p className="text-label text-ink-soft">내 답</p>
              <DiffLine tokens={result.diff} reveal font={font} />
            </>
          ) : null}
          {ruleTitle ? <p className="text-body text-ink">규칙: {ruleTitle}</p> : null}
          <StudentTag studentRef={item.studentRef} />
          {comeback ? <p className="text-label text-ink-soft">{comeback}</p> : null}
        </div>
      ) : null}

      {phase !== "answer" ? (
        <div className="flex justify-end">
          <PrimaryButton onClick={() => onDone({ success, first: presentation === 0 ? first : null })}>다음 문장</PrimaryButton>
        </div>
      ) : null}
    </section>
  );
}

/**
 * The learner's words, marked where they differ from the closest answer — the place only (reveal off: a missing
 * word is an empty box, a wrong word is not corrected), or the fix too once the answer is shown.
 */
function DiffLine({ tokens, reveal, font }: { tokens: DiffToken[]; reveal: boolean; font: FontSize }) {
  return (
    <p lang="en" className={`${FONT[font].text} flex flex-wrap items-center gap-x-1.5 gap-y-1 text-ink`}>
      {tokens.map((t, i) => {
        if (t.kind === "missing") {
          return reveal ? (
            <span key={i} className={`rounded border-2 border-dashed px-1 ${tone.successBorder} ${tone.success}`}>
              <span className="sr-only">(빠진 낱말) </span>
              {t.text}
            </span>
          ) : (
            <span key={i} className="inline-block h-6 w-8 rounded border-2 border-dashed border-ink-soft align-middle">
              <span className="sr-only">(빠진 낱말)</span>
            </span>
          );
        }
        if (t.kind === "wrong") {
          return (
            <span key={i}>
              <span className={tone.dangerWavy}>{t.text}</span>
              <span className="sr-only"> (틀림)</span>
              {reveal && t.expected ? <span className={`ml-1 ${tone.success}`}>→ {t.expected}</span> : null}
            </span>
          );
        }
        if (t.kind === "extra") {
          return (
            <span key={i} className="text-ink-faint line-through">
              {t.text}
              <span className="sr-only"> (필요 없음)</span>
            </span>
          );
        }
        if (t.kind === "moved") {
          return (
            <span key={i} className="underline decoration-dotted decoration-2 underline-offset-4">
              {t.text}
              <span className="sr-only"> (자리 바뀜)</span>
            </span>
          );
        }
        return <span key={i}>{t.text}</span>;
      })}
    </p>
  );
}
