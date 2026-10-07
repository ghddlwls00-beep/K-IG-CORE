"use client";

/**
 * VOCA — one view for all 195 lessons (mv1 · mv2 · mv3 · hv): Step 1 단어 보고 듣기 · Step 2 액티브 인출 · Step 3 틀린 단어 · 말하기 ·
 * Step 4 60초 타임어택 (the owner's order; Steps 1 and 3 renamed by 계획 D05 나 — every tab still reads "Step N").
 *
 * 2026-09-27 학습법 · 화면 고침 (사장님 "검토 결과대로 … 끝까지"; docs/qa-2026-09-18/학습법-화면-0927/voca-verified.md · 계획.md E01–E04 ·
 * A10 · D01 · D02 · D05 · D20–D22). The words, the meanings and every sound are unchanged: speakText gets vocaWordSpeech(word) for a
 * word and the authored collocation phrase for its line, exactly as before, and the whole-lesson player is the page's own
 * AudioPlayer with the same sentences (the page hands them over as data — A10). What changed, by review item:
 *   Frame   no header card (VOCA-U04 · U16): the shared StepTabs, line icons, the colour tokens and the six text sizes (U06 · U07 ·
 *           U18); one speed control — the player's — for the list and every single word (U08).
 *   Step 1  (E01 · D01 · D20 · L14 · U09 · U13 · U14) every word in one list with a row head every 6 words and its own '듣기', 2
 *           columns on a phone and 3 from sm; a word is a button (its sound) with a 44px '안다고 표시' beside it (a mark only —
 *           D21); '뜻 가리기' hides the meanings until a word is pressed; the whole-lesson player heads the list and marks the word it
 *           is saying; a row's authored etymology and collocation fold under the row (they were in the removed spotlight card).
 *   Step 2  (E02 · D20 · L01–L03 · L08 · L13 · L17 · U02) a round asks every word once in a new order; a word asked English → Korean
 *           in one round is asked Korean → English in the next; about a third is heard, not read (never a word with a homophone);
 *           a miss comes back at the end of the round with new options, at most twice; the answer line plays the word in both
 *           directions and names the option picked; '다음' sits right under it and takes the focus. 2026-09-28 (사장님 — the
 *           rule of STUDENT 060705c): opening the step never starts sound — a heard question waits for its '듣기'; only '다음'
 *           and '한 회차 더', pressed inside the step, play the heard question they bring.
 *   Step 3  (D21 · L05 · L06 · L07 · L16 · U01 · U03 · U11 · U20) the words missed in Steps 2 and 4, one card at a time: recall
 *           from the meaning → see and hear it, say it twice (the microphone check where the browser has one, else '말했어요') →
 *           type it. Only the first spelling of a card moves its box; new words are '새 단어'.
 *   Step 4  (E04 · D22 · L09 · U12) every press shows right / wrong for 0.4 s (the right meaning when wrong) with the buttons
 *           waiting; a miss costs SPEED_WRONG_PENALTY (100) points; the pairs are drawn again every pass; the result lists the missed pairs; the best
 *           score starts afresh under a new name.
 * Completion (D02 나): LessonEndBar's '이 강의 학습 완료' opens after one finished Step 2 round (src/lib/lessonGate.ts).
 * On this device: see src/lib/vocaLearning.ts (cards · finished rounds · best score). The common learning engine hears
 * recordAttempt on every graded answer (Step 2 · Step 3 spelling and microphone · Step 4) and markLessonDone — every word of the
 * lesson — when the learner completes it.
 * The data-* attributes are what the audit helpers read (lib/containers.cjs voca-grid · drive-generic · gap-checks-0926 P) — keep them.
 */

import { useCallback, useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { Block } from "@/lib/types";
import {
  getServerSpeechSnapshot,
  getSpeechSnapshot,
  speakText,
  stopSpeech,
  subscribeSpeech,
  unlockMobileAudio,
  type VoiceGender,
} from "@/lib/speech";
import { vocaSpeechForm, vocaWordSpeech } from "@/lib/vocaSpeech";
import { learningDay } from "@/lib/learning/day";
import { markLessonDone, recordAttempt } from "@/lib/learning/record";
import type { Help } from "@/lib/learning/types";
import { clearLessonGate, setLessonGate } from "@/lib/lessonGate";
import { isSingleWordTarget } from "@/lib/speechSingleWord";
import {
  VOCA_GATE_REASON,
  VOCA_LEARNING_PROFILE,
  VOCA_MIC_PASS,
  leitnerStorageKey,
  parseQuizRecord,
  quizStorageKey,
  serializeQuizRecord,
  speedBestStorageKey,
  vocaItemKey,
} from "@/lib/vocaLearning";
import {
  MAX_REASKS,
  SPEED_FLASH_MS,
  SPEED_SECONDS,
  SPEED_WRONG_PENALTY,
  analyzeEtymology,
  checkSpelling,
  generateActiveRecallQuizzes,
  generateSpeedDrillItems,
  getCollocation,
  queueAfterAnswer,
  readLeitnerCards,
  setLeitnerKnown,
  speedPressPoints,
  spellingForms,
  updateLeitnerCard,
  type ActiveRecallQuestion,
  type LeitnerBox,
  type LeitnerCard,
  type SpeedDrillItem,
} from "@/lib/vocaUtils";
import { AudioPlayer } from "./AudioPlayer";
import { VoiceSpeakingTester } from "./VoiceSpeakingTester";
import { StepTabs } from "./StepTabs";
import { Toggle } from "./Toggle";
import { IconCheck, IconChevronDown, IconChevronRight, IconPlay, IconRepeat, IconSpeaker, IconStop, IconX } from "./icons";
import { LESSON_COMPLETE_EVENT, useProgress } from "./ProgressProvider";

/** The page's top player as data (page.tsx `passagePlayers`) — shared with LISTENING · READING since 2026-09-27. */
import type { PassagePlayerData } from "@/lib/passagePlayer";
export type { PassagePlayerData };

interface PhonicsLearningViewProps {
  blocks: Block[];
  lessonKey: string;
  vocaDictionary?: Record<string, { meaning: string; searchWord?: string }> | null;
  /** 2026-09-27 (A10 · D01 나): played at the head of the Step 1 list; the view then owns the page's whole-lesson player */
  passagePlayers?: PassagePlayerData[] | null;
}

type StepNo = 1 | 2 | 3 | 4;
const STEPS: { n: StepNo; name: string }[] = [
  { n: 1, name: "단어 보고 듣기" },
  { n: 2, name: "액티브 인출" },
  { n: 3, name: "틀린 단어 · 말하기" },
  { n: 4, name: "60초 타임어택" },
];

const BOX_LABEL: Record<LeitnerBox, string> = { 0: "새 단어", 1: "틀림", 2: "익숙", 3: "외움" };

// the button kinds of the course views (GrammarLearningView · StudentLearningView), 44px
const filledButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control bg-ink px-4 text-label font-semibold text-surface transition-opacity cursor-pointer hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
const outlineButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control border border-line bg-raised px-3 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const quietButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-control px-3 text-label font-medium text-ink-soft transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40";
const iconButton =
  "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-line bg-raised text-ink-soft transition-colors cursor-pointer hover:bg-sunken hover:text-ink";

const lc = (w: string) => String(w || "").toLowerCase().trim();

/** One word's result in the current Step 2 round. */
interface RoundResult {
  word: string;
  /** right at its first ask in this round */
  first: boolean;
  /** right at its last ask */
  last: boolean;
  asks: number;
}

interface RoundState {
  no: number;
  queue: ActiveRecallQuestion[];
  idx: number;
  picked: number | null;
  results: Record<number, RoundResult>;
  finished: boolean;
}

type PracticeStage = "recall" | "say" | "spell";
interface PracticeState {
  /** the words of this practice, by their order in the lesson */
  orders: number[];
  idx: number;
  stage: PracticeStage;
  typed: string;
  verdict: { correct: boolean } | null;
  /** the first spelling of each card (the one that moves its box) */
  firstSpelling: Record<number, boolean>;
  all: boolean;
  done: boolean;
}

interface GameState {
  phase: "ready" | "playing" | "over";
  endsAt: number;
  left: number;
  items: SpeedDrillItem[];
  idx: number;
  pass: number;
  score: number;
  combo: number;
  maxCombo: number;
  right: number;
  wrong: number;
  flash: { correct: boolean; item: SpeedDrillItem } | null;
  missed: SpeedDrillItem[];
}

const readyGame = (): GameState => ({
  phase: "ready",
  endsAt: 0,
  left: SPEED_SECONDS,
  items: [],
  idx: 0,
  pass: 0,
  score: 0,
  combo: 0,
  maxCombo: 0,
  right: 0,
  wrong: 0,
  flash: null,
  missed: [],
});

export function PhonicsLearningView({ blocks, lessonKey, vocaDictionary, passagePlayers = null }: PhonicsLearningViewProps) {
  const lessonId = lessonKey.split("/").pop() || lessonKey;
  const uid = useId();
  const { isCompleted } = useProgress();
  const lessonCompleted = isCompleted("phonics", lessonId);

  // ------------------------------------------------------------------------------------------------------------
  // The lesson: the grid's rows and its words in grid order (a word's order = its index + 1 — the engine key)
  // ------------------------------------------------------------------------------------------------------------
  const rows = useMemo(() => {
    const grid = blocks.find((b) => b.type === "wordgrid") as { type: "wordgrid"; rows: string[][] } | undefined;
    return (grid?.rows ?? []).map((row) => (row || []).map((w) => String(w ?? "").trim()).filter(Boolean)).filter((row) => row.length > 0);
  }, [blocks]);
  const words = useMemo(() => rows.flat(), [rows]);
  const rowStarts = useMemo(() => {
    const out: number[] = [];
    let at = 0;
    for (const row of rows) {
      out.push(at);
      at += row.length;
    }
    return out;
  }, [rows]);

  const getMeaning = useCallback(
    (word: string): string => {
      if (!word) return "";
      const clean = word.toLowerCase().replace(/[()"]/g, "").trim();
      return vocaDictionary?.[word]?.meaning || vocaDictionary?.[clean]?.meaning || "단어";
    },
    [vocaDictionary],
  );
  const dictMap = useMemo(() => {
    const map: Record<string, { meaning: string }> = {};
    for (const w of words) map[lc(w)] = { meaning: getMeaning(w) };
    return map;
  }, [words, getMeaning]);
  const collocationOf = useCallback(
    (word: string) => getCollocation(word, vocaDictionary?.[word]?.searchWord || vocaDictionary?.[lc(word)]?.searchWord),
    [vocaDictionary],
  );
  const ownsPlayer = Boolean(passagePlayers && passagePlayers.length > 0);

  // ------------------------------------------------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------------------------------------------------
  const [step, setStep] = useState<StepNo>(1);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  const [activeWord, setActiveWord] = useState<string | null>(null);
  const activeWordRef = useRef<string | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);
  const [hideMeanings, setHideMeanings] = useState(false);
  const [opened, setOpened] = useState<Record<number, boolean>>({});

  const [cards, setCards] = useState<Record<string, LeitnerCard>>({});
  const cardsRef = useRef<Record<string, LeitnerCard>>({});
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  const [roundsDone, setRoundsDone] = useState(0);
  const roundsRef = useRef(0);
  const [best, setBest] = useState(0);
  const bestRef = useRef(0);
  const [newBest, setNewBest] = useState(false);
  const [seenCompleted, setSeenCompleted] = useState(false);

  const [round, setRound] = useState<RoundState | null>(null);
  const roundRef = useRef<RoundState | null>(null);
  const [practice, setPractice] = useState<PracticeState | null>(null);
  const practiceRef = useRef<PracticeState | null>(null);
  const [game, setGame] = useState<GameState>(readyGame);
  const gameRef = useRef<GameState>(game);

  const answeredRef = useRef<Set<number>>(new Set());
  const rootRef = useRef<HTMLDivElement | null>(null);
  const nextRef = useRef<HTMLButtonElement | null>(null);
  const focusNextRef = useRef(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);
  const focusOptionsRef = useRef(false);
  const spellRef = useRef<HTMLInputElement | null>(null);
  const practiceBoxRef = useRef<HTMLDivElement | null>(null);
  /** where the keyboard goes after a Step 3 card changes: the spelling input, or a button by its data-action */
  const focusPracticeRef = useRef<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // a lesson seen completed on this screen stays completable after '완료 취소' (like STUDENT — STU-U26); adjusted while rendering
  if (lessonCompleted && !seenCompleted) setSeenCompleted(true);

  const commitRound = useCallback((next: RoundState | null) => {
    roundRef.current = next;
    setRound(next);
  }, []);
  const commitPractice = useCallback((next: PracticeState | null) => {
    practiceRef.current = next;
    setPractice(next);
  }, []);
  const commitGame = useCallback((next: GameState) => {
    gameRef.current = next;
    setGame(next);
  }, []);

  // ------------------------------------------------------------------------------------------------------------
  // This device's record (src/lib/vocaLearning.ts) — read once per lesson; an old card record is read by readLeitnerCards
  // ------------------------------------------------------------------------------------------------------------
  useEffect(() => {
    let saved: unknown = null;
    let quizRaw: string | null = null;
    let bestRaw: string | null = null;
    try {
      const raw = window.localStorage.getItem(leitnerStorageKey(lessonKey));
      saved = raw ? JSON.parse(raw) : null;
    } catch {
      saved = null;
    }
    try {
      quizRaw = window.localStorage.getItem(quizStorageKey(lessonKey));
      bestRaw = window.localStorage.getItem(speedBestStorageKey(lessonKey));
    } catch {
      // storage unavailable: the lesson works, nothing is remembered
    }
    const next = readLeitnerCards(saved, words, getMeaning);
    cardsRef.current = next;
    setCards(next);
    const rounds = parseQuizRecord(quizRaw).rounds;
    roundsRef.current = rounds;
    setRoundsDone(rounds);
    const bestScore = Number(bestRaw);
    bestRef.current = Number.isFinite(bestScore) && bestScore > 0 ? Math.floor(bestScore) : 0;
    setBest(bestRef.current);
    loadedRef.current = true;
    setLoaded(true);
  }, [lessonKey, words, getMeaning]);

  const commitCards = useCallback(
    (next: Record<string, LeitnerCard>) => {
      if (!loadedRef.current) return;
      cardsRef.current = next;
      setCards(next);
      try {
        window.localStorage.setItem(leitnerStorageKey(lessonKey), JSON.stringify(next));
      } catch {
        // ignore
      }
    },
    [lessonKey],
  );

  /** A graded answer moves the word's box (the streak grows once a learning day). */
  const answerCard = useCallback(
    (word: string, correct: boolean) => {
      commitCards(updateLeitnerCard(cardsRef.current, word, getMeaning(word), correct, learningDay(Date.now())));
    },
    [commitCards, getMeaning],
  );

  const toggleKnown = (word: string) => {
    const known = cardsRef.current[lc(word)]?.known === true;
    commitCards(setLeitnerKnown(cardsRef.current, word, getMeaning(word), !known));
  };

  // ------------------------------------------------------------------------------------------------------------
  // The common learning engine — the only two calls this view makes (공통-학습-엔진.md §2 · §5)
  // ------------------------------------------------------------------------------------------------------------
  const noteAttempt = useCallback(
    (order: number | undefined, correct: boolean, mode: "tap" | "typed" | "voice", help: Help = "none") => {
      if (!order) return;
      const firstTry = !answeredRef.current.has(order);
      answeredRef.current.add(order);
      try {
        recordAttempt(VOCA_LEARNING_PROFILE, vocaItemKey(lessonId, order), {
          lessonId,
          kind: "word",
          correct,
          help,
          mode,
          where: "lesson",
          firstTry,
        });
      } catch {
        // storage unavailable: the lesson works, only the review forgets
      }
    },
    [lessonId],
  );

  // The lesson is finished (LessonEndBar → ProgressProvider.toggleComplete announces it): every word of it comes back from the
  // next day — the missed ones among them (공통-학습-엔진.md §5 "끝낸 강의의 모든 낱말 + 틀린 낱말"). Un-completing keeps the record.
  useEffect(() => {
    const onComplete = (event: Event) => {
      const detail = (event as CustomEvent<{ course?: string; lessonId?: string; completed?: boolean }>).detail;
      if (!detail || detail.course !== "phonics" || detail.lessonId !== lessonId || !detail.completed) return;
      try {
        markLessonDone(
          VOCA_LEARNING_PROFILE,
          lessonId,
          words.map((_, i) => ({ key: vocaItemKey(lessonId, i + 1), kind: "word" })),
        );
      } catch {
        // storage unavailable: the lesson is complete; only the review forgets
      }
    };
    window.addEventListener(LESSON_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(LESSON_COMPLETE_EVENT, onComplete);
  }, [lessonId, words]);

  // D02 나: '이 강의 학습 완료' opens after one finished Step 2 round (or when the lesson was completed) — lessonGate.
  const gateReady = roundsDone > 0 || lessonCompleted || seenCompleted;
  useEffect(() => {
    if (!loaded) return;
    setLessonGate("phonics", lessonId, { ready: gateReady, reason: VOCA_GATE_REASON });
  }, [loaded, gateReady, lessonId]);
  useEffect(() => () => clearLessonGate("phonics", lessonId), [lessonId]);

  // ------------------------------------------------------------------------------------------------------------
  // Sound — every word is vocaWordSpeech(word), the clip its button always played
  // ------------------------------------------------------------------------------------------------------------
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechSnapshot, getServerSpeechSnapshot);
  // the whole-lesson player reads the words in grid order (page.tsx fallbackSentences), so its place is the word's index
  const queueIndex = speech.speaking && speech.total === words.length && speech.index >= 0 ? speech.index : -1;

  const rowPlayingRef = useRef(false);
  const activeRowRef = useRef<number | null>(null);
  const rowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setWordPlaying = (word: string | null) => {
    activeWordRef.current = word;
    setActiveWord(word);
  };

  const stopRow = useCallback(() => {
    rowPlayingRef.current = false;
    activeRowRef.current = null;
    if (rowTimeoutRef.current) {
      clearTimeout(rowTimeoutRef.current);
      rowTimeoutRef.current = null;
    }
    setActiveRow(null);
  }, []);

  const stopAll = useCallback(() => {
    stopRow();
    stopSpeech();
    activeWordRef.current = null;
    setActiveWord(null);
  }, [stopRow]);

  useEffect(() => {
    return () => {
      stopAll();
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [stopAll]);

  /** One word. `toggle`: the same word again stops it (the Step 1 buttons). */
  const playWord = useCallback(
    (word: string, toggle = false) => {
      if (!word) return;
      if (toggle && activeWordRef.current === word) {
        // 2026-10-05 (회귀 점검 1002 A8): the word may be the one a row's '이어 듣기' is saying — stop the row too, or its
        // button stayed on '정지' with nothing playing and needed two presses to play again.
        stopRow();
        stopSpeech();
        setWordPlaying(null);
        return;
      }
      stopRow();
      setWordPlaying(word);
      // The card keeps showing `colo(u)r`; only the audio drops the bracket. A heteronym
      // (`sow`, `wind` …) is said in the meaning on its card — its own clip name (7-6).
      speakText(vocaWordSpeech(word), {
        lang: "en",
        rate: speedRef.current,
        onEnd: () => {
          if (activeWordRef.current === word) setWordPlaying(null);
        },
        onError: () => {
          if (activeWordRef.current === word) setWordPlaying(null);
        },
      });
    },
    [stopRow],
  );

  /** The six words of a row, one after another (the row head's '듣기'). */
  function playRow(rowIndex: number) {
    if (activeRowRef.current === rowIndex && rowPlayingRef.current) {
      stopAll();
      return;
    }
    stopAll();
    const rowWords = rows[rowIndex] || [];
    if (rowWords.length === 0) return;
    rowPlayingRef.current = true;
    activeRowRef.current = rowIndex;
    setActiveRow(rowIndex);
    let idx = 0;
    const playNext = () => {
      if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
      if (idx >= rowWords.length) {
        stopRow();
        setWordPlaying(null);
        return;
      }
      const w = rowWords[idx];
      setWordPlaying(w);
      const after = () => {
        if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
        idx++;
        rowTimeoutRef.current = setTimeout(() => {
          if (!rowPlayingRef.current || activeRowRef.current !== rowIndex) return;
          playNext();
        }, 350);
      };
      speakText(vocaWordSpeech(w), { lang: "en", rate: speedRef.current, onEnd: after, onError: after });
    };
    playNext();
  }

  const changeSpeed = useCallback((rate: number) => {
    speedRef.current = rate;
    setSpeed(rate);
  }, []);

  // ------------------------------------------------------------------------------------------------------------
  // Step 2 — a round (vocaUtils generateActiveRecallQuizzes · queueAfterAnswer)
  // ------------------------------------------------------------------------------------------------------------
  /**
   * The first heard question of a round started by '한 회차 더' (a press inside Step 2) plays by itself, just after the commit —
   * the audio is unlocked inside the press. 2026-09-28 (사장님 "고쳐" — the rule of STUDENT 060705c): a step change never plays;
   * this also ran on the way into Step 2 (a new round's first question, or the one left unanswered) and is no longer called there.
   */
  const playSoon = useCallback(
    (word: string) => {
      unlockMobileAudio();
      window.setTimeout(() => playWord(word), 0);
    },
    [playWord],
  );

  /** A new round. `play`: its first question, when heard, plays — only for '한 회차 더' inside Step 2, never on the way in. */
  const startRound = useCallback(
    (no: number, play = false) => {
      const queue = generateActiveRecallQuizzes(words, dictMap, { round: no, rows });
      commitRound({ no, queue, idx: 0, picked: null, results: {}, finished: false });
      const first = queue[0];
      if (play && first?.prompt === "listen") playSoon(first.word);
    },
    [words, dictMap, rows, commitRound, playSoon],
  );

  const answerQuestion = (optionIndex: number) => {
    const r = roundRef.current;
    if (!r || r.finished || r.picked !== null) return;
    const q = r.queue[r.idx];
    if (!q) return;
    const correct = optionIndex === q.correctIndex;
    const firstAsk = !q.retry;
    const queue = queueAfterAnswer(r.queue, r.idx, correct, words, dictMap, { round: r.no, rows });
    const order = q.order ?? 0;
    const prev = r.results[order];
    const results = {
      ...r.results,
      [order]: { word: q.word, first: firstAsk ? correct : prev?.first ?? correct, last: correct, asks: (prev?.asks ?? 0) + 1 },
    };
    commitRound({ ...r, queue, picked: optionIndex, results });
    // the box moves on the word's first ask in the round — an ask again right after the answer was shown does not
    if (firstAsk) answerCard(q.word, correct);
    noteAttempt(q.order, correct, "tap");
    focusNextRef.current = true;
  };

  const finishRound = (r: RoundState) => {
    commitRound({ ...r, picked: null, finished: true });
    const rounds = roundsRef.current + 1;
    roundsRef.current = rounds;
    setRoundsDone(rounds);
    try {
      window.localStorage.setItem(quizStorageKey(lessonKey), serializeQuizRecord({ rounds }));
    } catch {
      // ignore
    }
  };

  const nextQuestion = () => {
    const r = roundRef.current;
    if (!r || r.finished || r.picked === null) return;
    const idx = r.idx + 1;
    if (idx >= r.queue.length) {
      stopAll();
      finishRound(r);
      return;
    }
    commitRound({ ...r, idx, picked: null });
    focusOptionsRef.current = true;
    const q = r.queue[idx];
    if (q?.prompt === "listen") playWord(q.word);
    else stopAll();
  };

  // the keyboard follows the question: '다음' after an answer (U02 FIX), the first option after '다음'
  useEffect(() => {
    if (focusNextRef.current && round && round.picked !== null) {
      focusNextRef.current = false;
      nextRef.current?.focus();
    } else if (focusOptionsRef.current && round && round.picked === null) {
      focusOptionsRef.current = false;
      optionsRef.current?.querySelector<HTMLButtonElement>("button[data-option]")?.focus();
    }
  }, [round]);

  // ------------------------------------------------------------------------------------------------------------
  // Step 3 — the missed words, one card at a time (D21 나)
  // ------------------------------------------------------------------------------------------------------------
  const wrongOrders = useMemo(
    () => words.map((w, i) => ({ w, order: i + 1 })).filter((x) => cards[lc(x.w)]?.box === 1).map((x) => x.order),
    [words, cards],
  );

  const startPractice = useCallback(
    (all: boolean) => {
      const orders = all
        ? words.map((_, i) => i + 1)
        : words.map((w, i) => ({ w, order: i + 1 })).filter((x) => cardsRef.current[lc(x.w)]?.box === 1).map((x) => x.order);
      if (orders.length === 0) {
        commitPractice(null);
        return;
      }
      commitPractice({ orders, idx: 0, stage: "recall", typed: "", verdict: null, firstSpelling: {}, all, done: false });
    },
    [words, commitPractice],
  );

  const practiceWord = (p: PracticeState) => words[(p.orders[p.idx] ?? 1) - 1] ?? "";

  const reveal = () => {
    const p = practiceRef.current;
    if (!p || p.done || p.stage !== "recall") return;
    focusPracticeRef.current = "said";
    commitPractice({ ...p, stage: "say" });
    playWord(practiceWord(p));
  };

  const toSpelling = () => {
    const p = practiceRef.current;
    if (!p || p.done || p.stage !== "say") return;
    stopAll();
    focusPracticeRef.current = "input";
    commitPractice({ ...p, stage: "spell", typed: "", verdict: null });
  };

  const checkTyped = () => {
    const p = practiceRef.current;
    if (!p || p.done || p.stage !== "spell" || p.verdict || !p.typed.trim()) return;
    const order = p.orders[p.idx];
    const word = practiceWord(p);
    const correct = checkSpelling(p.typed, word);
    const first = !(order in p.firstSpelling);
    // only the first spelling of the card moves its box (a second try follows the answer just shown)
    if (first) answerCard(word, correct);
    noteAttempt(order, correct, "typed");
    focusPracticeRef.current = "next-card";
    commitPractice({ ...p, verdict: { correct }, firstSpelling: first ? { ...p.firstSpelling, [order]: correct } : p.firstSpelling });
  };

  const spellAgain = () => {
    const p = practiceRef.current;
    if (!p || p.stage !== "spell") return;
    focusPracticeRef.current = "input";
    commitPractice({ ...p, typed: "", verdict: null });
  };

  const nextCard = () => {
    const p = practiceRef.current;
    if (!p || p.done) return;
    stopAll();
    if (p.idx + 1 >= p.orders.length) {
      commitPractice({ ...p, done: true, verdict: null });
      return;
    }
    focusPracticeRef.current = "reveal";
    commitPractice({ ...p, idx: p.idx + 1, stage: "recall", typed: "", verdict: null });
  };

  /**
   * The microphone's verdict for a card (VoiceSpeakingTester onSuccess). A one-word target — 3,894 of the 3,897 words — is
   * judged by speechSingleWord (B03): 100 when the word was understood, otherwise the best score of the recogniser's guesses,
   * which can be high for a near word ('burns'), so only 100 counts; the two-word headwords (living room …) are scored like a
   * sentence and pass at VOCA_MIC_PASS. Said with the word on screen is reading it out — a help, like STUDENT's rule.
   */
  const onMicResult = (order: number, score: number, targets: string[]) => {
    const understood = isSingleWordTarget(targets) ? score >= 100 : score >= VOCA_MIC_PASS;
    noteAttempt(order, understood, "voice", "hint");
  };

  useEffect(() => {
    const want = focusPracticeRef.current;
    if (!want || !practice) return;
    focusPracticeRef.current = null;
    if (want === "input") spellRef.current?.focus();
    else practiceBoxRef.current?.querySelector<HTMLButtonElement>(`button[data-action="${want}"]`)?.focus();
  }, [practice]);

  // ------------------------------------------------------------------------------------------------------------
  // Step 4 — 60 seconds (D22 나)
  // ------------------------------------------------------------------------------------------------------------
  const clearFlashTimer = () => {
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
  };

  const startGame = () => {
    clearFlashTimer();
    stopAll();
    setNewBest(false);
    commitGame({
      ...readyGame(),
      phase: "playing",
      endsAt: Date.now() + SPEED_SECONDS * 1000,
      left: SPEED_SECONDS,
      items: generateSpeedDrillItems(words, dictMap),
      pass: 1,
    });
  };

  const finishGame = useCallback(() => {
    const g = gameRef.current;
    if (g.phase !== "playing") return;
    if (flashTimerRef.current) {
      clearTimeout(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    commitGame({ ...g, phase: "over", left: 0, flash: null });
    const beaten = g.score > bestRef.current;
    setNewBest(beaten);
    if (beaten) {
      bestRef.current = g.score;
      setBest(g.score);
      try {
        window.localStorage.setItem(speedBestStorageKey(lessonKey), String(g.score));
      } catch {
        // ignore
      }
    }
  }, [commitGame, lessonKey]);

  const advanceGame = () => {
    flashTimerRef.current = null;
    const g = gameRef.current;
    if (g.phase !== "playing") return;
    let { idx, items, pass } = g;
    idx += 1;
    if (idx >= items.length) {
      // a new pass: a new order and new mismatched pairs (VOCA-L09 CHECK — the 31st press no longer repeats the 1st)
      items = generateSpeedDrillItems(words, dictMap);
      idx = 0;
      pass += 1;
    }
    commitGame({ ...g, idx, items, pass, flash: null });
  };

  const press = (saysMatch: boolean) => {
    const g = gameRef.current;
    if (g.phase !== "playing" || g.flash) return;
    const item = g.items[g.idx];
    if (!item) return;
    const correct = saysMatch === item.isMatch;
    const combo = correct ? g.combo + 1 : 0;
    commitGame({
      ...g,
      score: Math.max(0, g.score + speedPressPoints(correct, combo)),
      combo,
      maxCombo: Math.max(g.maxCombo, combo),
      right: g.right + (correct ? 1 : 0),
      wrong: g.wrong + (correct ? 0 : 1),
      flash: { correct, item },
      missed: correct ? g.missed : [...g.missed, item],
    });
    flashTimerRef.current = setTimeout(advanceGame, SPEED_FLASH_MS);
    // the record waits for the colour to be on screen
    setTimeout(() => {
      noteAttempt(item.order, correct, "tap");
      if (!correct) answerCard(item.word, false);
    }, 0);
  };

  // the clock: from the end time, so a slow tab does not stretch the minute
  useEffect(() => {
    if (game.phase !== "playing") return;
    const timer = setInterval(() => {
      const g = gameRef.current;
      if (g.phase !== "playing") return;
      const left = Math.max(0, Math.ceil((g.endsAt - Date.now()) / 1000));
      if (left <= 0) finishGame();
      else if (left !== g.left) commitGame({ ...g, left });
    }, 200);
    return () => clearInterval(timer);
  }, [game.phase, finishGame, commitGame]);

  // ------------------------------------------------------------------------------------------------------------
  // Steps
  // ------------------------------------------------------------------------------------------------------------
  const switchStep = (n: StepNo) => {
    if (n === step) return; // the current tab again: keep the work on screen
    stopAll();
    if (gameRef.current.phase === "playing") {
      // leaving the game stops it without a score
      clearFlashTimer();
      commitGame(readyGame());
    }
    setStep(n);
    // 2026-09-28 (사장님 "고쳐" — the rule of STUDENT 060705c): a step change never starts sound. Step 2 used to play a heard
    // question by itself on the way in (a new round's first one, or the one left unanswered — playSoon); it now waits for its
    // '듣기'. '다음' and '한 회차 더' inside Step 2 still play the heard question they bring. Steps 1, 3 and 4 never played here.
    if (n === 2 && !roundRef.current) startRound(roundsRef.current + 1);
    if (n === 3 && (!practiceRef.current || practiceRef.current.done) && wrongOrders.length > 0) startPractice(false);
  };

  /**
   * A button that moves to another step presses that step's tab (like READING's plan G05), so the step bar below
   * (LessonStepNavigation, which follows the tab presses) moves with it.
   */
  const goToStep = (n: StepNo) => {
    const tab = rootRef.current?.querySelector<HTMLButtonElement>(`[data-step-tab="${n}"]`);
    if (tab) tab.click();
    else switchStep(n);
  };

  /** '틀린 단어 연습하기' (Steps 2 and 4): a new practice of the words missed now, then Step 3. */
  const practiceMissed = () => {
    stopAll();
    startPractice(false);
    goToStep(3);
  };

  // ------------------------------------------------------------------------------------------------------------
  // Pieces
  // ------------------------------------------------------------------------------------------------------------
  /** A word's sound (🔊 → a line icon); pressed while it plays, it stops. `label` hides the word from the name (Step 3 spelling). */
  const speakerButton = (word: string, label?: string) => {
    const on = activeWord === word;
    return (
      <button
        type="button"
        onClick={() => playWord(word, true)}
        aria-label={on ? `${label ? "소리" : word} 정지` : label ?? `${word} 듣기`}
        className={iconButton + (on ? " border-ink/40 text-ink" : "")}
      >
        {on ? <IconStop /> : <IconSpeaker />}
      </button>
    );
  };

  // --- Step 1 ------------------------------------------------------------------------------------------------------
  function renderWord(w: string, order: number) {
    const card = cards[lc(w)];
    const known = card?.known === true;
    const speaking = activeWord === w || queueIndex === order - 1;
    const meaning = getMeaning(w);
    const showMeaning = !hideMeanings || opened[order] === true;
    return (
      <li
        key={order}
        data-word={order}
        data-learn-first={order === 1 ? "" : undefined}
        className={
          // 2026-10-07 (UI검토-1007 3장 30번): the hover tint covers the whole card, the circle's column too (it covered the word part only)
          "flex min-h-16 items-stretch rounded-control border transition-colors " +
          (speaking ? "border-ink bg-ink text-surface" : "border-line bg-raised text-ink hover:bg-sunken")
        }
      >
        <button
          type="button"
          data-word-play
          onClick={() => {
            if (hideMeanings && !opened[order]) setOpened((prev) => ({ ...prev, [order]: true }));
            playWord(w, true);
          }}
          aria-label={showMeaning ? `${w} ${meaning} 듣기` : `${w} 듣기 · 뜻 보기`}
          className="flex min-w-0 flex-1 flex-col items-start justify-center gap-0.5 rounded-control py-2 pr-1 pl-3 text-left transition-colors cursor-pointer"
        >
          <span id={`${uid}-w${order}`} data-word-text lang="en" className="text-title-s font-semibold hyphens-auto [overflow-wrap:anywhere]">
            {w}
          </span>
          {showMeaning ? (
            <span data-word-meaning className={"text-label " + (speaking ? "text-surface/80" : "text-ink-soft")}>
              {meaning}
            </span>
          ) : (
            <span className={"text-label " + (speaking ? "text-surface/70" : "text-ink-faint")}>뜻 보기</span>
          )}
        </button>
        <button
          type="button"
          data-known
          aria-pressed={known}
          aria-labelledby={`${uid}-w${order} ${uid}-known`}
          onClick={() => toggleKnown(w)}
          className="flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-control transition-colors cursor-pointer"
        >
          <span
            aria-hidden
            className={
              known
                ? "flex h-6 w-6 items-center justify-center rounded-full bg-success text-surface"
                : "h-6 w-6 rounded-full border-2 border-current opacity-30"
            }
          >
            {known ? <IconCheck size={14} /> : null}
          </span>
        </button>
      </li>
    );
  }

  function renderRow(row: string[], r: number) {
    const start = rowStarts[r] ?? 0;
    const range = `${start + 1}–${start + row.length}번`;
    const playing = activeRow === r;
    const extras = row
      .map((w) => ({ w, ety: analyzeEtymology(w), col: collocationOf(w) }))
      .filter((x) => x.ety || x.col);
    return (
      <div key={r} data-row={r + 1} className="flex flex-col gap-2">
        <div className="flex min-h-11 items-center justify-between gap-2 border-b border-line">
          <p className="text-label font-medium tabular-nums text-ink-soft">{range}</p>
          <button
            type="button"
            data-action="play-row"
            onClick={() => playRow(r)}
            aria-pressed={playing}
            aria-label={playing ? `${range} 정지` : `${range} 이어 듣기`}
            className={quietButton}
          >
            {playing ? <IconStop /> : <IconPlay />}
            <span>{playing ? "정지" : "듣기"}</span>
          </button>
        </div>
        <ul className="grid list-none grid-cols-2 gap-2 sm:grid-cols-3">{row.map((w, c) => renderWord(w, start + c + 1))}</ul>
        {extras.length > 0 ? (
          // CNT-09 · KIG-012: only what was written for a word — an etymology for 46 headwords, a collocation for 10
          <details data-extras className="group rounded-control border border-line bg-raised">
            <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-control px-3 text-label font-medium text-ink-soft transition-colors hover:bg-sunken [&::-webkit-details-marker]:hidden">
              <span>어원 · 쓰임 보기 ({extras.length})</span>
              <IconChevronDown className="shrink-0 transition-transform group-open:rotate-180" />
            </summary>
            <ul className="flex list-none flex-col divide-y divide-line border-t border-line">
              {extras.map(({ w, ety, col }) => (
                <li key={w} className="flex flex-col gap-1.5 px-3 py-2.5">
                  <p lang="en" className="text-label font-semibold text-ink">
                    {w}
                  </p>
                  {ety ? (
                    <p className="text-label text-ink-soft">
                      <span className="font-medium text-ink">어원 </span>
                      {ety.explanation}
                    </p>
                  ) : null}
                  {col ? (
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-label text-ink">
                          <span className="font-medium">자주 쓰는 표현 </span>
                          <span lang="en">“{col.phrase}”</span> — {col.translation}
                        </p>
                        <p className="text-caption text-ink-soft">
                          <span lang="en">“{col.exampleSentence}”</span> ({col.sentenceTranslation})
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          stopAll();
                          speakText(col.phrase, { lang: "en", rate: speedRef.current });
                        }}
                        aria-label={`${col.phrase} 듣기`}
                        className={iconButton}
                      >
                        <IconSpeaker />
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </div>
    );
  }

  function renderStep1() {
    return (
      <section data-step-panel="1" aria-label="단어 보고 듣기" className="flex flex-col gap-3">
        {/* 2026-10-07 (UI검토-1007 3장 30번): what the circle is, here at the top — it was one line under the last row, three
            screens down. The row does not wrap, so the switch stays at the right of the line. */}
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 flex-1 text-label text-ink-soft">
            단어를 누르면 소리가 나요.
            {words.length > 0 ? " 옆 동그라미는 ‘안다고 표시’예요 — 표시해도 Step 2 퀴즈에는 그대로 나와요." : null}
          </p>
          {/* the shared switch (UI검토-1007 3장 56번) */}
          <Toggle
            checked={hideMeanings}
            data-action="hide-meanings"
            onClick={() => {
              setHideMeanings((v) => !v);
              setOpened({});
            }}
            className="shrink-0"
          >
            뜻 가리기
          </Toggle>
        </div>
        {ownsPlayer && passagePlayers ? (
          // the page's whole-lesson player, here at the head of the list (A10 · D01 나) — the same sentences and voice
          <div data-voca-player className="flex flex-col gap-2">
            {passagePlayers.map((p) => (
              <AudioPlayer
                key={p.id}
                src={p.src}
                fallbackSentences={p.fallbackSentences}
                lang={p.lang}
                gender={p.gender}
                label={p.label}
                initialRate={speed}
                onRateChange={changeSpeed}
              />
            ))}
          </div>
        ) : null}
        {words.length > 0 ? (
          <div className="flex flex-col gap-4">{rows.map((row, r) => renderRow(row, r))}</div>
        ) : (
          <p className="text-label text-ink-soft">이 강의에는 단어가 없어요.</p>
        )}
        <span id={`${uid}-known`} hidden>
          안다고 표시
        </span>
      </section>
    );
  }

  // --- Step 2 ------------------------------------------------------------------------------------------------------
  /** the lesson word whose quiz meaning is `meaning` — to name the option a learner picked */
  const wordOfMeaning = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of words) {
      const m = getMeaning(w);
      map.set(m, w);
      map.set(m.replace(" (뜻에 따라 발음이 다름)", "").replace(" (동사는 뒤 강세)", ""), w);
    }
    return map;
  }, [words, getMeaning]);

  function renderFeedback(q: ActiveRecallQuestion, picked: number) {
    const correct = picked === q.correctIndex;
    const option = q.options[picked] ?? "";
    const pickedPair =
      correct || /^단어 의미 \d$|^vocab\d$/.test(option)
        ? null
        : q.questionType === "ko-to-en"
          ? `${option} = ${getMeaning(option)}`
          : wordOfMeaning.get(option)
            ? `${wordOfMeaning.get(option)} = ${option}`
            : null;
    return (
      <div
        data-feedback={correct ? "correct" : "wrong"}
        role="status"
        className={"flex flex-col gap-1 border-l-2 pl-3 " + (correct ? "border-success" : "border-danger")}
      >
        <div className="flex items-center gap-2">
          <p className={"min-w-0 flex-1 text-label font-semibold " + (correct ? "text-success" : "text-danger")}>
            {correct ? "✓ 맞았어요" : "✕ 틀렸어요"}
            <span className="font-normal text-ink">
              {" · "}
              <span lang="en" className="font-semibold">
                {q.word}
              </span>{" "}
              = {getMeaning(q.word)}
            </span>
          </p>
          {speakerButton(q.word)}
        </div>
        {pickedPair ? <p className="text-label text-ink-soft">고른 보기: {pickedPair}</p> : null}
        {q.etymologyHint ? <p className="text-caption text-ink-soft">어원: {q.etymologyHint}</p> : null}
        {!correct && (q.retry ?? 0) < MAX_REASKS ? <p className="text-caption text-ink-soft">이 단어는 이 회차 끝에 한 번 더 나와요.</p> : null}
      </div>
    );
  }

  function renderQuestion(r: RoundState) {
    const q = r.queue[r.idx];
    if (!q) return null;
    const answered = r.picked !== null;
    const listen = q.prompt === "listen";
    const firstRight = Object.values(r.results).filter((x) => x.first).length;
    const last = r.idx + 1 >= r.queue.length;
    return (
      <>
        <div className="flex items-center justify-between gap-2">
          <p className="text-label tabular-nums text-ink-soft">
            {r.no}회차 · 문제 {r.idx + 1} / {r.queue.length}
            {q.retry ? <span className="text-ink"> · 다시 묻기</span> : null}
          </p>
          <p className="text-label tabular-nums text-ink-soft">처음에 맞힘 {firstRight}</p>
        </div>

        <div
          data-question
          data-kind={listen ? "listen" : q.questionType}
          className="flex flex-col items-center gap-1.5 rounded-card border border-line bg-raised px-4 py-4 text-center"
        >
          <p className="text-caption text-ink-soft">
            {listen ? "듣고 알맞은 뜻을 고르세요" : q.questionType === "en-to-ko" ? "이 단어의 뜻은?" : "이 뜻의 영어 단어는?"}
          </p>
          {listen ? (
            <>
              {/* 2026-09-28: '듣기', was '다시 듣기' — on the way into Step 2 the question has not played yet (like STUDENT 060705c) */}
              <button type="button" data-action="listen" onClick={() => playWord(q.word)} className={`${outlineButton} min-h-12 px-5`}>
                <IconSpeaker />
                <span>{activeWord === q.word ? "듣는 중" : "듣기"}</span>
              </button>
              {answered ? (
                <p lang="en" className="text-title font-semibold text-ink [overflow-wrap:anywhere]">
                  {q.word}
                </p>
              ) : null}
            </>
          ) : q.questionType === "en-to-ko" ? (
            <div className="flex items-center gap-2">
              <p lang="en" className="text-title font-semibold text-ink [overflow-wrap:anywhere]">
                {q.word}
              </p>
              {speakerButton(q.word)}
            </div>
          ) : (
            <p className="text-title font-semibold text-ink">{q.correctMeaning}</p>
          )}
        </div>

        <div ref={optionsRef} role="group" aria-label="보기" className="grid gap-2 sm:grid-cols-2">
          {q.options.map((opt, i) => {
            const isAnswer = i === q.correctIndex;
            const isPicked = r.picked === i;
            const look = !answered
              ? "border-line bg-raised text-ink hover:bg-sunken cursor-pointer"
              : isAnswer
                ? "border-success bg-success/10 font-semibold text-success"
                : isPicked
                  ? "border-danger bg-danger/10 text-danger"
                  : "border-line bg-raised text-ink-faint";
            return (
              <button
                key={`${q.id}-${i}`}
                type="button"
                data-option={i}
                disabled={answered}
                onClick={() => answerQuestion(i)}
                className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-control border px-4 py-2 text-left text-body transition-colors disabled:cursor-default ${look}`}
              >
                <span lang={q.questionType === "ko-to-en" ? "en" : undefined} className="min-w-0 [overflow-wrap:anywhere]">
                  {opt}
                </span>
                {answered && isAnswer ? <IconCheck className="shrink-0" /> : answered && isPicked ? <IconX className="shrink-0" /> : null}
              </button>
            );
          })}
        </div>

        {answered && r.picked !== null ? renderFeedback(q, r.picked) : null}
        {answered ? (
          <button ref={nextRef} type="button" data-action="next" onClick={nextQuestion} className={`${filledButton} min-h-12 w-full`}>
            <span>{last ? "결과 보기" : "다음"}</span>
            <IconChevronRight />
          </button>
        ) : null}
      </>
    );
  }

  function renderRoundResult(r: RoundState) {
    const results = Object.entries(r.results)
      .map(([order, x]) => ({ order: Number(order), ...x }))
      .sort((a, b) => a.order - b.order);
    const asked = results.length;
    const firstRight = results.filter((x) => x.first).length;
    const missed = results.filter((x) => !x.first);
    const fixed = missed.filter((x) => x.last).length;
    return (
      <>
        <div data-round-result role="status" className="flex flex-col gap-0.5">
          <h3 className="text-title-s font-semibold text-ink">{r.no}회차 끝</h3>
          <p className="text-label tabular-nums text-ink-soft">
            처음에 맞힘 {firstRight} / {asked}
            {missed.length ? ` · 다시 풀어 맞힘 ${fixed} / ${missed.length}` : ""}
          </p>
        </div>
        {missed.length ? (
          <ul className="list-none divide-y divide-line rounded-card border border-line bg-raised">
            {missed.map((x) => {
              const known = cards[lc(x.word)]?.known === true;
              return (
                <li key={x.order} className="flex items-center gap-2 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink">
                      <span lang="en" className="font-semibold">
                        {x.word}
                      </span>{" "}
                      <span className="text-ink-soft">= {getMeaning(x.word)}</span>
                    </p>
                    <p className="text-caption">
                      <span className={x.last ? "text-success" : "text-danger"}>{x.last ? "다시 풀어 맞힘" : "아직 틀림"}</span>
                      {known ? <span className="text-ink-soft"> · 안다고 표시했던 단어</span> : null}
                    </p>
                  </div>
                  {speakerButton(x.word)}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-label font-semibold text-success">모든 단어를 처음에 맞혔어요.</p>
        )}
        {!lessonCompleted ? <p className="text-caption text-ink-soft">이제 맨 아래 &lsquo;이 강의 학습 완료&rsquo;를 누를 수 있어요.</p> : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          {missed.length ? (
            <button type="button" data-action="to-practice" onClick={practiceMissed} className={`${filledButton} sm:flex-1`}>
              <span>틀린 단어 연습하기</span>
              <IconChevronRight />
            </button>
          ) : (
            <button type="button" data-action="to-game" onClick={() => goToStep(4)} className={`${filledButton} sm:flex-1`}>
              <span>60초 타임어택으로</span>
              <IconChevronRight />
            </button>
          )}
          <button
            type="button"
            data-action="new-round"
            onClick={() => {
              stopAll();
              // a press inside Step 2 — its first heard question plays, like one '다음' brings
              startRound(roundsRef.current + 1, true);
            }}
            className={`${outlineButton} sm:flex-1`}
          >
            <IconRepeat />
            <span>한 회차 더 · 방향 바꿔서</span>
          </button>
        </div>
      </>
    );
  }

  function renderStep2() {
    return (
      <section data-step-panel="2" aria-label="액티브 인출" className="flex flex-col gap-3">
        <p className="text-label text-ink-soft">틀린 단어는 이 회차 끝에 한 번 더 나와요.</p>
        {words.length === 0 ? (
          <p className="text-label text-ink-soft">이 강의에는 단어가 없어요.</p>
        ) : !round ? null : round.finished ? (
          renderRoundResult(round)
        ) : (
          renderQuestion(round)
        )}
      </section>
    );
  }

  // --- Step 3 ------------------------------------------------------------------------------------------------------
  function boxCounts() {
    const count: Record<LeitnerBox, number> = { 0: 0, 1: 0, 2: 0, 3: 0 };
    for (const w of words) count[cards[lc(w)]?.box ?? 0] += 1;
    return count;
  }

  function renderPracticeCard(p: PracticeState) {
    const order = p.orders[p.idx];
    const word = practiceWord(p);
    const meaning = getMeaning(word);
    const last = p.idx + 1 >= p.orders.length;
    const micTargets = [...new Set([vocaSpeechForm(word), ...spellingForms(word)])];
    return (
      <div
        ref={practiceBoxRef}
        data-practice
        data-stage={p.stage}
        data-practice-word={order}
        className="flex flex-col gap-3 rounded-card border border-line bg-raised px-4 py-4"
      >
        <p className="text-caption tabular-nums text-ink-soft">
          {p.all ? "전체 단어" : "틀린 단어"} {p.idx + 1} / {p.orders.length}
        </p>

        {p.stage === "recall" ? (
          <>
            <div className="flex flex-col gap-0.5">
              <p className="text-caption text-ink-soft">뜻</p>
              <p className="text-title-s font-semibold text-ink">{meaning}</p>
            </div>
            <p className="text-label text-ink-soft">이 뜻의 영어 단어를 떠올려 보세요.</p>
            <button type="button" data-action="reveal" onClick={reveal} className={`${filledButton} w-full`}>
              <IconSpeaker />
              <span>정답 보고 듣기</span>
            </button>
          </>
        ) : null}

        {p.stage === "say" ? (
          <>
            <div className="flex items-center gap-2">
              <p lang="en" className="min-w-0 text-title font-semibold text-ink [overflow-wrap:anywhere]">
                {word}
              </p>
              {speakerButton(word)}
            </div>
            <p className="text-label text-ink-soft">{meaning}</p>
            <p className="text-label font-medium text-ink">소리 내어 두 번 말해 보세요.</p>
            <VoiceSpeakingTester
              key={`${order}-${word}`}
              targetText={vocaSpeechForm(word)}
              targetTexts={micTargets}
              passScore={VOCA_MIC_PASS}
              onStart={stopAll}
              buttonLabel="말하기 확인"
              onSuccess={(_transcript, score) => onMicResult(order, score, micTargets)}
            />
            <button type="button" data-action="said" onClick={toSpelling} className={`${filledButton} w-full`}>
              <span>말했어요 · 쓰기로</span>
              <IconChevronRight />
            </button>
          </>
        ) : null}

        {p.stage === "spell" ? (
          <>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-caption text-ink-soft">뜻</p>
                <p className="text-title-s font-semibold text-ink">{meaning}</p>
              </div>
              {speakerButton(word, "소리 듣기")}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkTyped();
              }}
              className="flex gap-2"
            >
              <input
                ref={spellRef}
                type="text"
                data-spelling-input
                value={p.typed}
                onChange={(e) => {
                  const cur = practiceRef.current;
                  if (cur) commitPractice({ ...cur, typed: e.target.value });
                }}
                readOnly={p.verdict !== null}
                aria-label="영어 단어 쓰기"
                placeholder="영어로 쓰기"
                lang="en"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="done"
                maxLength={40}
                className="min-h-11 min-w-0 flex-1 rounded-control border border-line-input bg-surface px-3 text-body text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
              />
              {p.verdict === null ? (
                // 2026-10-08 (UI검토-1007 3장 55번): off (nothing typed) it is the shared off look — `btn-filled` (globals.css): an
                // outline and faint text, as '이 강의 학습 완료' and GRAMMAR '전체 시험 채점하기', not the fill at 40%
                <button
                  type="submit"
                  data-action="check-spelling"
                  disabled={!p.typed.trim()}
                  className="btn-filled inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-control px-4 text-label font-semibold transition-opacity"
                >
                  확인
                </button>
              ) : null}
            </form>
            {p.verdict ? (
              <div
                data-spelling={p.verdict.correct ? "correct" : "wrong"}
                role="status"
                className={"flex flex-col gap-0.5 border-l-2 pl-3 " + (p.verdict.correct ? "border-success" : "border-danger")}
              >
                <p className={"text-label font-semibold " + (p.verdict.correct ? "text-success" : "text-danger")}>
                  {p.verdict.correct ? "✓ 맞았어요" : "✕ 철자가 달라요"}
                  <span className="font-normal text-ink">
                    {" · 정답 "}
                    <span lang="en" className="font-semibold">
                      {word}
                    </span>
                  </span>
                </p>
                {p.firstSpelling[order] === false && p.verdict.correct ? (
                  <p className="text-caption text-ink-soft">다시 쓴 것은 연습으로만 셀게요.</p>
                ) : null}
              </div>
            ) : null}
            {p.verdict ? (
              <div className="flex gap-2">
                {!p.verdict.correct ? (
                  <button type="button" data-action="spell-again" onClick={spellAgain} className={`${outlineButton} shrink-0`}>
                    다시 쓰기
                  </button>
                ) : null}
                <button type="button" data-action="next-card" onClick={nextCard} className={`${filledButton} min-w-0 flex-1`}>
                  <span>{last ? "결과 보기" : "다음 단어"}</span>
                  <IconChevronRight />
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    );
  }

  function renderPracticeDone(p: PracticeState) {
    const total = p.orders.length;
    const right = p.orders.filter((o) => p.firstSpelling[o] === true).length;
    const stillWrong = p.orders.filter((o) => cards[lc(words[o - 1] ?? "")]?.box === 1);
    return (
      <div data-practice-done role="status" className="flex flex-col gap-3 rounded-card border border-line bg-raised px-4 py-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-title-s font-semibold text-ink">연습 끝</h3>
          <p className="text-label tabular-nums text-ink-soft">
            {total}단어 · 처음 쓴 철자 맞힘 {right} / {total}
          </p>
        </div>
        {stillWrong.length ? (
          <p className="text-label text-ink">
            아직 틀린 단어:{" "}
            <span lang="en" className="font-semibold">
              {stillWrong.map((o) => words[o - 1]).join(", ")}
            </span>
          </p>
        ) : (
          <p className="text-label font-semibold text-success">틀린 단어를 모두 다시 맞혔어요.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {stillWrong.length ? (
            <button type="button" data-action="practice-again" onClick={() => startPractice(false)} className={`${filledButton} sm:flex-1`}>
              <IconRepeat />
              <span>남은 틀린 단어 다시</span>
            </button>
          ) : (
            <button type="button" data-action="to-game" onClick={() => goToStep(4)} className={`${filledButton} sm:flex-1`}>
              <span>60초 타임어택으로</span>
              <IconChevronRight />
            </button>
          )}
          <button type="button" data-action="practice-all" onClick={() => startPractice(true)} className={`${outlineButton} sm:flex-1`}>
            전체 {words.length}단어로 연습
          </button>
        </div>
      </div>
    );
  }

  function renderStep3() {
    const count = boxCounts();
    return (
      <section data-step-panel="3" aria-label="틀린 단어 · 말하기" className="flex flex-col gap-3">
        <p className="text-label text-ink-soft">틀린 단어를 한 장씩: 뜻 보고 떠올리기 → 듣고 두 번 말하기 → 쓰기.</p>
        <p data-box-counts className="text-caption tabular-nums text-ink-soft">
          {([1, 2, 3, 0] as LeitnerBox[]).map((b, i) => (
            <span key={b}>
              {i ? " · " : ""}
              <span className={b === 1 && count[1] > 0 ? "font-semibold text-danger" : ""}>
                {BOX_LABEL[b]} {count[b]}
              </span>
            </span>
          ))}
        </p>
        {words.length === 0 ? (
          <p className="text-label text-ink-soft">이 강의에는 단어가 없어요.</p>
        ) : practice && !practice.done ? (
          renderPracticeCard(practice)
        ) : practice && practice.done ? (
          renderPracticeDone(practice)
        ) : wrongOrders.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-card border border-line bg-raised px-4 py-4">
            <p className="text-body font-semibold text-ink">틀린 단어 {wrongOrders.length}개</p>
            <button type="button" data-action="start-practice" onClick={() => startPractice(false)} className={`${filledButton} w-full`}>
              <span>연습 시작</span>
              <IconChevronRight />
            </button>
          </div>
        ) : (
          <div data-practice-empty className="flex flex-col gap-3 rounded-card border border-line bg-raised px-4 py-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-body font-semibold text-ink">틀린 단어가 없어요.</p>
              <p className="text-label text-ink-soft">
                {roundsDone > 0 ? "Step 2와 Step 4에서 틀린 단어가 여기에 모여요." : "Step 2 퀴즈를 풀면 틀린 단어가 여기에 모여요."}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                data-action={roundsDone > 0 ? "to-game" : "to-quiz"}
                onClick={() => goToStep(roundsDone > 0 ? 4 : 2)}
                className={`${filledButton} sm:flex-1`}
              >
                <span>{roundsDone > 0 ? "60초 타임어택으로" : "퀴즈 풀러 가기"}</span>
                <IconChevronRight />
              </button>
              <button type="button" data-action="practice-all" onClick={() => startPractice(true)} className={`${outlineButton} sm:flex-1`}>
                전체 {words.length}단어로 연습
              </button>
            </div>
          </div>
        )}
      </section>
    );
  }

  // --- Step 4 ------------------------------------------------------------------------------------------------------
  function renderGame() {
    const g = game;
    const item = g.flash ? g.flash.item : g.items[g.idx];
    if (!item) return null;
    return (
      <div data-game data-flash={g.flash ? (g.flash.correct ? "right" : "wrong") : undefined} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label tabular-nums text-ink">남은 시간 {g.left}초</p>
          <p className="text-label tabular-nums text-ink">
            {g.score}점{g.combo >= 2 ? <span className="text-ink-soft"> · 연속 {g.combo}</span> : null}
          </p>
        </div>
        <div aria-hidden className="h-1.5 w-full overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-primary transition-[width] duration-200" style={{ width: `${(g.left / SPEED_SECONDS) * 100}%` }} />
        </div>
        <div
          className={
            "flex min-h-40 flex-col items-center justify-center gap-2 rounded-card border-2 bg-raised px-4 py-6 text-center transition-colors " +
            (g.flash ? (g.flash.correct ? "border-success" : "border-danger") : "border-line")
          }
        >
          <p lang="en" className="text-title-l font-semibold text-ink [overflow-wrap:anywhere]">
            {item.word}
          </p>
          <p className="text-title-s text-ink-soft">= {item.displayedMeaning}</p>
        </div>
        <p
          role="status"
          className={
            "flex min-h-11 items-center justify-center text-center text-label font-semibold " +
            (g.flash ? (g.flash.correct ? "text-success" : "text-danger") : "text-ink-soft")
          }
        >
          {g.flash ? (g.flash.correct ? "✓ 맞았어요" : `✕ 틀렸어요 · 바른 뜻: ${g.flash.item.actualMeaning}`) : "맞는 짝일까요?"}
        </p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            data-action="says-mismatch"
            disabled={g.flash !== null}
            onClick={() => press(false)}
            className="flex min-h-14 items-center justify-center gap-2 rounded-control border border-line bg-raised text-title-s font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-default"
          >
            <IconX size={18} />
            <span>다름</span>
          </button>
          <button
            type="button"
            data-action="says-match"
            disabled={g.flash !== null}
            onClick={() => press(true)}
            className="flex min-h-14 items-center justify-center gap-2 rounded-control border border-line bg-raised text-title-s font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-default"
          >
            <IconCheck size={18} />
            <span>맞음</span>
          </button>
        </div>
      </div>
    );
  }

  function renderGameOver() {
    const g = game;
    // every wrong press is its own pair (E04 — the list holds as many as the wrong presses; a word missed in two passes was
    // shown with two different meanings)
    const missed = g.missed;
    return (
      <div data-game-over role="status" className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <p className="text-title font-semibold tabular-nums text-ink">{g.score}점</p>
          <p className="text-label tabular-nums text-ink-soft">
            맞힘 {g.right} · 틀림 {g.wrong} · 최대 연속 {g.maxCombo}
          </p>
          <p className="text-label text-ink-soft">{newBest ? "이 강의 최고 기록이에요." : best > 0 ? `이 강의 최고 기록 ${best}점` : ""}</p>
        </div>
        {missed.length ? (
          <>
            <p className="text-label font-semibold text-ink">틀린 짝 {missed.length}개를 확인해 보세요.</p>
            <ul className="list-none divide-y divide-line rounded-card border border-line bg-raised">
              {missed.map((it, i) => (
                <li key={`${it.id}-${i}`} data-missed-pair className="flex items-center gap-2 px-4 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-body text-ink">
                      <span lang="en" className="font-semibold">
                        {it.word}
                      </span>{" "}
                      <span className="text-ink-soft">= {it.actualMeaning}</span>
                    </p>
                    {!it.isMatch ? <p className="text-caption text-ink-soft">보인 뜻: {it.displayedMeaning} (다른 단어의 뜻)</p> : null}
                  </div>
                  {speakerButton(it.word)}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-label font-semibold text-success">틀린 짝 없이 끝냈어요.</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          {missed.length ? (
            <button type="button" data-action="to-practice" onClick={practiceMissed} className={`${filledButton} sm:flex-1`}>
              <span>틀린 단어 연습하기</span>
              <IconChevronRight />
            </button>
          ) : null}
          <button type="button" data-action="start-game" onClick={startGame} className={`${missed.length ? outlineButton : filledButton} sm:flex-1`}>
            <IconRepeat />
            <span>다시 하기</span>
          </button>
        </div>
      </div>
    );
  }

  function renderStep4() {
    return (
      <section data-step-panel="4" aria-label="60초 타임어택" className="flex flex-col gap-3">
        {words.length === 0 ? (
          <p className="text-label text-ink-soft">이 강의에는 단어가 없어요.</p>
        ) : game.phase === "playing" ? (
          renderGame()
        ) : game.phase === "over" ? (
          renderGameOver()
        ) : (
          <>
            <p className="text-label text-ink-soft">
              단어와 뜻이 맞는 짝이면 &lsquo;맞음&rsquo;, 다르면 &lsquo;다름&rsquo;을 누르세요. {SPEED_SECONDS}초 동안이고, 틀리면{" "}
              {SPEED_WRONG_PENALTY}점이 깎여요.
            </p>
            {best > 0 ? <p className="text-label tabular-nums text-ink-soft">이 강의 최고 기록 {best}점</p> : null}
            <button type="button" data-action="start-game" onClick={startGame} className={`${filledButton} min-h-12 w-full`}>
              <IconPlay />
              <span>시작 · 60초</span>
            </button>
          </>
        )}
      </section>
    );
  }

  // ------------------------------------------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------------------------------------------
  const wrongCount = wrongOrders.length;
  return (
    <div
      ref={rootRef}
      className="flex flex-col gap-3 notranslate"
      translate="no"
      data-voca-view
      data-ready={loaded ? "" : undefined}
      data-step={step}
      data-owns-passage-player={ownsPlayer ? "" : undefined}
    >
      <StepTabs
        label="VOCA 4단계 학습"
        stepStart
        current={step}
        onSelect={(n) => switchStep(n as StepNo)}
        steps={STEPS.map((s) => ({ n: s.n, name: s.name, badge: s.n === 3 && wrongCount > 0 ? `${wrongCount}개` : undefined }))}
      />
      {step === 1 ? renderStep1() : null}
      {step === 2 ? renderStep2() : null}
      {step === 3 ? renderStep3() : null}
      {step === 4 ? renderStep4() : null}
    </div>
  );
}
