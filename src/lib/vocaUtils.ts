/**
 * Cognitive Vocabulary Mastery Utilities for K-IG 교육 platform.
 *
 * Implements:
 * 1. Etymology & Root-Prefix Decoding (어원, 접두사, 어근 분해 분석)
 * 2. High-Yield Collocation & Chunk Generator (핵심 연어 및 덩어리 결합)
 * 3. Active Recall 4-Choice Quiz Engine (테스트 효과 기반 인출 훈련)
 * 4. In-Context Cloze Fill-in Generator (문맥 속 실전 빈칸 완성)
 * 5. 60-Second Speed Reflex Drill Queue (반사신경 타임어택 훈련)
 * 6. Leitner 3-Tier Spaced Repetition Tracker (에빙하우스 망각곡선 오답 복습)
 */

export interface EtymologyInfo {
  prefix?: { part: string; meaning: string };
  root?: { part: string; meaning: string };
  suffix?: { part: string; meaning: string };
  explanation: string;
}

export interface CollocationItem {
  phrase: string;
  translation: string;
  exampleSentence: string;
  sentenceTranslation: string;
}

export interface ActiveRecallQuestion {
  id: string;
  word: string;
  correctMeaning: string;
  questionType: "en-to-ko" | "ko-to-en";
  questionPrompt: string;
  options: string[];
  correctIndex: number;
  etymologyHint?: string;
  collocationHint?: string;
}

export interface ClozeQuestion {
  id: string;
  targetWord: string;
  meaning: string;
  sentenceWithBlank: string;
  sentenceKo: string;
  options: string[];
  correctAnswer: string;
}

export interface SpeedDrillItem {
  id: string;
  word: string;
  displayedMeaning: string;
  isMatch: boolean;
  actualMeaning: string;
}

export interface LeitnerCard {
  word: string;
  meaning: string;
  box: 1 | 2 | 3; // 1: Need Review, 2: Familiar, 3: Mastered
  lastTestedAt: number;
  streak: number;
}

/**
 * Consecutive correct quiz answers needed before the quiz itself promotes a
 * card to Box 3. The "마스터 체크" button bypasses this — see
 * `setLeitnerMastery` — because there the learner asserts mastery directly
 * rather than earning it one answer at a time (KIG-033).
 */
export const MASTERY_STREAK = 3;

// -----------------------------------------------------------------------------
// 1. Etymology & Affix Analysis Engine
// -----------------------------------------------------------------------------

interface AffixRule {
  prefix: string;
  meaning: string;
}

const PREFIX_RULES: AffixRule[] = [
  { prefix: "predict", meaning: "pre(미리) + dict(말하다) ➔ 미리 말하다, 예측하다" },
  { prefix: "preview", meaning: "pre(미리) + view(보다) ➔ 미리 보다, 시사회" },
  { prefix: "prevent", meaning: "pre(미리) + vent(오다) ➔ 미리 앞에 와서 막다, 예방하다" },
  { prefix: "precaution", meaning: "pre(미리) + caution(조심) ➔ 사전에 주의함, 예방조치" },
  { prefix: "preoccupy", meaning: "pre(미리) + occupy(차지하다) ➔ 마음을 미리 차지하다, 몰두시키다" },
  { prefix: "produce", meaning: "pro(앞으로) + duce(이끌다) ➔ 앞으로 이끌어내다, 생산하다" },
  { prefix: "progress", meaning: "pro(앞으로) + gress(나아가다) ➔ 앞으로 나아가다, 진보" },
  { prefix: "project", meaning: "pro(앞으로) + ject(던지다) ➔ 앞을 향해 생각을 던지다, 프로젝트/기획하다" },
  { prefix: "propose", meaning: "pro(앞에) + pose(두다) ➔ 상대방 앞에 생각을 두다, 제안하다" },
  { prefix: "promote", meaning: "pro(앞으로) + mote(움직이다) ➔ 앞으로 나아가게 돕다, 증진하다/승진시키다" },
  { prefix: "postwar", meaning: "post(이후에) + war(전쟁) ➔ 전쟁이 끝난 후, 전후의" },
  { prefix: "postpone", meaning: "post(뒤로) + pone(놓다) ➔ 약속을 뒤로 미루다, 연기하다" },
  { prefix: "postscript", meaning: "post(뒤에) + script(쓰다) ➔ 편지 끝 뒤에 덧붙여 쓰다, 추신(P.S.)" },
  { prefix: "forehead", meaning: "fore(앞의) + head(머리) ➔ 머리의 앞부분, 이마" },
  { prefix: "forefather", meaning: "fore(이전의) + father(아버지) ➔ 앞서 살았던 선조, 조상" },
  { prefix: "foresee", meaning: "fore(미리) + see(보다) ➔ 앞일을 미리 보다, 예견하다" },
  { prefix: "foresight", meaning: "fore(미리) + sight(시야) ➔ 앞일을 내다보는 눈, 선견지명" },
  { prefix: "ancestor", meaning: "ante(앞서) + cede(가다) ➔ 우리보다 앞서 간 사람, 조상" },
  { prefix: "anticipate", meaning: "anti/ante(앞서) + cip(잡다) ➔ 앞으로 일어날 일을 미리 마음에 품다, 예상하다" },
  { prefix: "antique", meaning: "ante/anti(고대의) + ique ➔ 옛날부터 전해 내려온 진귀한 물건, 골동품" },
  { prefix: "replace", meaning: "re(다시/제자리로) + place(놓다) ➔ 낡은 것을 다시 놓다, 대신하다/교체하다" },
  { prefix: "revive", meaning: "re(다시) + vive(살다) ➔ 다시 살아나게 하다, 부활시키다" },
  { prefix: "reproduce", meaning: "re(다시) + produce(생산하다) ➔ 다시 만들어내다, 복제하다/번식하다" },
  { prefix: "remove", meaning: "re(뒤로/멀리) + move(옮기다) ➔ 멀리 옮겨 치우다, 제거하다" },
  { prefix: "subway", meaning: "sub(아래의) + way(길) ➔ 땅 아래로 다니는 철도, 지하철" },
  { prefix: "submarine", meaning: "sub(아래의) + marine(바다의) ➔ 바다 밑을 다니는 배, 잠수함" },
  { prefix: "subtitle", meaning: "sub(아래의) + title(제목) ➔ 화면 아래에 나오는 글자, 자막" },
  { prefix: "substitute", meaning: "sub(대신하여) + stitute(세우다) ➔ 원래 것 대신 아래에 세우다, 대체하다" },
  { prefix: "transport", meaning: "trans(가로질러) + port(나르다) ➔ 국경이나 먼 거리를 가로질러 나르다, 수송하다" },
  { prefix: "translate", meaning: "trans(바꾸어) + late(옮기다) ➔ 한 언어를 다른 언어로 건네주다, 번역하다" },
  { prefix: "transform", meaning: "trans(바꾸어) + form(모양) ➔ 형태를 완전히 바꾸다, 변형하다" },
  { prefix: "transfer", meaning: "trans(건너서) + fer(나르다) ➔ 다른 장소/부서로 옮기다, 환승하다/전근가다" },
  { prefix: "export", meaning: "ex(밖으로) + port(항구/나르다) ➔ 항구 밖으로 물건을 내보내다, 수출하다" },
  { prefix: "import", meaning: "im/in(안으로) + port(항구/나르다) ➔ 항구 안으로 물건을 들여오다, 수입하다" },
  { prefix: "inspect", meaning: "in(안을) + spect(들여다보다) ➔ 문제 없는지 안쪽을 자세히 보다, 검사하다" },
  { prefix: "expect", meaning: "ex(밖을 향해) + spect(바라보다) ➔ 앞으로 일어날 일을 기대하며 바라보다, 예상하다" },
  { prefix: "respect", meaning: "re(다시) + spect(돌아보다) ➔ 훌륭한 사람을 다시 돌아보다, 존경하다" },
  { prefix: "suspect", meaning: "sub/sus(아래를) + spect(의심스레 보다) ➔ 혐의가 있는지 의심하다, 용의자" },
  { prefix: "interact", meaning: "inter(상호간에) + act(행동하다) ➔ 서로 영향을 주고받다, 상호작용하다" },
  { prefix: "international", meaning: "inter(국가들 사이에) + national(국가의) ➔ 여러 나라 사이의, 국제적인" },
  { prefix: "interview", meaning: "inter(서로) + view(얼굴을 보다) ➔ 서로 마주보고 의견을 묻다, 면접/인터뷰" },
  { prefix: "discover", meaning: "dis(반대/벗기다) + cover(덮개) ➔ 덮여 있던 비밀/장소를 벗겨내다, 발견하다" },
  { prefix: "disappear", meaning: "dis(없어지다) + appear(나타나다) ➔ 나타났던 것이 보이지 않게 되다, 사라지다" },
  { prefix: "overlook", meaning: "over(위에서) + look(내려다보다) ➔ 위에서 넓게 바라보다, 혹은 건너뛰어 간과하다" },
  { prefix: "overcome", meaning: "over(뛰어넘어) + come(오다) ➔ 장애물을 뛰어넘어 도달하다, 극복하다" },
];

/**
 * CNT-09 — the authored etymology for a word, or `null` when none was written.
 *
 * V-11: `recover` (re + "cover 얻다") and `foremost` (fore + most) were removed —
 * recover comes from Latin recuperare and has nothing to do with `cover`, and
 * the `-most` of foremost is a reshaped Old English superlative ending (folk
 * etymology). A wrong breakdown is learnt like a right one, so no card is better.
 *
 * WHAT WAS WRONG. `PREFIX_RULES` held 48 breakdowns (46 now). Every other word —
 * 3,829 of the 3,877 headwords — fell through to one of two things: a generic
 * prefix guess (`under` → "un- + der", `restaurant` → "re- + staurant",
 * `important` → "im- + portant"), or a template sentence that only swapped the
 * word in ("발음 음소 규칙: 영문 철자 [do]의 음절 구조와 …"). The audit read
 * sixty free-lesson cards and found the template on all of them; the prefix
 * guess is the same problem wearing a more convincing shape, since a wrong
 * etymology is memorised exactly like a right one.
 *
 * Same rule as `getCollocation` (KIG-012): show what was written, hide the card
 * otherwise. Adding a word to `PREFIX_RULES` brings its card back with no
 * change here or at the call sites.
 */
export function analyzeEtymology(word: string): EtymologyInfo | null {
  const clean = word.toLowerCase().trim();
  const preset = PREFIX_RULES.find((p) => p.prefix === clean);
  return preset ? { explanation: preset.meaning } : null;
}

// -----------------------------------------------------------------------------
// 2. Collocation & Real Context Generator
// -----------------------------------------------------------------------------

const COLLOCATION_PRESETS: Record<string, CollocationItem> = {
  predict: {
    phrase: "predict the future outcome",
    translation: "미래 결과를 예측하다",
    exampleSentence: "Experts predict that technology will transform education.",
    sentenceTranslation: "전문가들은 기술이 교육을 완전히 바꿀 것이라고 예측합니다.",
  },
  anticipate: {
    phrase: "anticipate future customer needs",
    translation: "미래 고객의 요구를 예상하다",
    exampleSentence: "We must anticipate potential problems before launching.",
    sentenceTranslation: "우리는 출시하기 전에 잠재적인 문제들을 반드시 예상해야 합니다.",
  },
  produce: {
    phrase: "produce high quality products",
    translation: "고품질의 제품을 생산하다",
    exampleSentence: "The factory produces thousands of eco-friendly cars every month.",
    sentenceTranslation: "그 공장은 매달 수천 대의 친환경 자동차를 생산합니다.",
  },
  project: {
    phrase: "manage an ambitious project",
    translation: "야심 찬 프로젝트를 관리하다",
    exampleSentence: "She was chosen to lead the international research project.",
    sentenceTranslation: "그녀는 국제 연구 프로젝트를 이끌 책임자로 선발되었습니다.",
  },
  replace: {
    phrase: "replace old equipment with new models",
    translation: "낡은 장비를 새 모델로 교체하다",
    exampleSentence: "Electric vehicles are beginning to replace gasoline cars.",
    sentenceTranslation: "전기차들이 가솔린 자동차들을 대체하기 시작하고 있습니다.",
  },
  recover: {
    phrase: "recover from a sudden illness",
    translation: "갑작스러운 병에서 회복하다",
    exampleSentence: "The patient made a full recovery after modern therapy.",
    sentenceTranslation: "그 환자는 현대적 치료를 받고 완전히 회복되었습니다.",
  },
  discover: {
    phrase: "discover new scientific evidence",
    translation: "새로운 과학적 증거를 발견하다",
    exampleSentence: "Scientists discovered a new species living deep in the ocean.",
    sentenceTranslation: "과학자들은 심해에 서식하는 신종 생물을 발견했습니다.",
  },
  transport: {
    phrase: "transport goods across borders",
    translation: "국경을 넘어 화물을 수송하다",
    exampleSentence: "Ships transport huge amounts of cargo around the world.",
    sentenceTranslation: "선박들은 전 세계로 엄청난 양의 화물을 수송합니다.",
  },
  overcome: {
    phrase: "overcome difficult challenges",
    translation: "어려운 난관들을 극복하다",
    exampleSentence: "With strong determination, they overcame every obstacle.",
    sentenceTranslation: "강한 결단력으로 그들은 모든 난관을 극복해 냈습니다.",
  },
  improve: {
    phrase: "improve English communication skills",
    translation: "영어 의사소통 능력을 향상시키다",
    exampleSentence: "Daily practice will drastically improve your fluency.",
    sentenceTranslation: "매일 꾸준한 연습은 당신의 유창성을 극적으로 향상시켜 줄 것입니다.",
  },
};

/**
 * KIG-012 — the collocation and example for a word, or `null` when the author
 * never wrote one.
 *
 * WHAT WAS WRONG. `COLLOCATION_PRESETS` holds real examples for 10 words. Every
 * other word fell through to a generated template:
 *
 *     phrase          "vital role of ${word}"
 *     exampleSentence 'Understanding the exact meaning of "${word}" is
 *                      essential for daily conversation.'
 *
 * Measured over the corpus: 10 presets, 3,877 headwords, **3,868 words (99.8%)
 * were served that template**. It reads like a definition, it is grammatically
 * the same sentence for almost every word on the site, and it teaches nothing —
 * "vital role of apple" is not English. Across all 195 VOCA lessons that is the
 * majority of what the collocation card showed.
 *
 * WHY IT RETURNS NULL RATHER THAN A BETTER TEMPLATE. The examples cannot be
 * invented: a collocation is a fact about the language, and a plausible-looking
 * wrong one is worse than none, because a learner memorises it. The owner's
 * decision is therefore to show nothing where nothing was written. The presets
 * are kept — they are real — and the caller hides the card when this returns
 * null, so no empty box is left behind.
 *
 * NOT DELETED, DELIBERATELY: when reviewed collocations are authored for more
 * words, adding them to `COLLOCATION_PRESETS` brings the card back with no
 * change here or at the call site.
 */
export function getCollocation(
  word: string,
  searchWord?: string,
): CollocationItem | null {
  const clean = (searchWord || word).toLowerCase().replace(/[()]/g, "").trim();
  return COLLOCATION_PRESETS[clean] ?? null;
}

// -----------------------------------------------------------------------------
// 3. Active Recall 4-Choice Quiz Generator (Testing Effect)
// -----------------------------------------------------------------------------

export function generateActiveRecallQuizzes(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
): ActiveRecallQuestion[] {
  const validWords = words.filter((w) => Boolean(w && vocaDict[w.toLowerCase().trim()]?.meaning));
  if (validWords.length === 0) return [];

  const allMeanings = Array.from(
    new Set(Object.values(vocaDict).map((v) => v.meaning).filter(Boolean)),
  );

  return validWords.map((word, idx) => {
    const clean = word.toLowerCase().trim();
    const correctMeaning = vocaDict[clean]?.meaning || "뜻";
    const isEnToKo = idx % 2 === 0;

    const poolMeanings = validWords
      .map((w) => vocaDict[w.toLowerCase().trim()]?.meaning)
      .filter((m) => m && m !== correctMeaning);

    const shuffledPool = [...poolMeanings].sort(() => Math.random() - 0.5);
    const distractors: string[] = [];

    for (const m of shuffledPool) {
      if (distractors.length < 3 && !distractors.includes(m)) {
        distractors.push(m);
      }
    }

    if (distractors.length < 3) {
      const shuffledGlobal = [...allMeanings].sort(() => Math.random() - 0.5);
      for (const m of shuffledGlobal) {
        if (distractors.length < 3 && m !== correctMeaning && !distractors.includes(m)) {
          distractors.push(m);
        }
      }
    }

    while (distractors.length < 3) {
      distractors.push(`단어 의미 ${distractors.length + 1}`);
    }

    if (isEnToKo) {
      const options = [correctMeaning, ...distractors].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(correctMeaning);
      return {
        id: `quiz-en-${clean}-${idx}`,
        word,
        correctMeaning,
        questionType: "en-to-ko",
        questionPrompt: `"${word}" 의 가장 알맞은 한국어 뜻은 무엇일까요?`,
        options,
        correctIndex,
        etymologyHint: analyzeEtymology(word)?.explanation,
      };
    } else {
      // CNT-10: sampled at random rather than `slice(0, 3)`, which offered the
      // first three words of the list ("yes / day / school") on nearly every
      // Korean-to-English question of a lesson.
      const distractorWords = validWords
        .filter((w) => {
          const other = w.toLowerCase().trim();
          if (other === clean) return false;
          // KIG-019: a word that carries the same Korean meaning as the answer is
          // also correct, so it must never be offered as a wrong option.
          // e.g. hv-15 "운이 좋은" would otherwise list both `lucky` and `fortunate`.
          return (vocaDict[other]?.meaning || "") !== correctMeaning;
        })
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      while (distractorWords.length < 3) {
        distractorWords.push(`vocab${distractorWords.length + 1}`);
      }
      const options = [word, ...distractorWords].sort(() => Math.random() - 0.5);
      const correctIndex = options.indexOf(word);
      return {
        id: `quiz-ko-${clean}-${idx}`,
        word,
        correctMeaning,
        questionType: "ko-to-en",
        questionPrompt: `[ ${correctMeaning} ] 에 해당하는 올바른 영단어를 고르세요.`,
        options,
        correctIndex,
        etymologyHint: analyzeEtymology(word)?.explanation,
      };
    }
  });
}

// -----------------------------------------------------------------------------
// 4. In-Context Cloze Sentence Fill-in Generator
// -----------------------------------------------------------------------------

/**
 * NOTE: nothing calls this. It is the only other consumer of `getCollocation`,
 * and it was the reason the template fallback could not simply be deleted —
 * removing it left this function dereferencing null.
 *
 * It now skips a word that has no authored collocation instead of inventing a
 * sentence to blank out, which is the same rule the collocation card follows.
 * Kept rather than deleted so that authored collocations, once they exist,
 * bring this back with it.
 */
export function generateClozeQuestions(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
): ClozeQuestion[] {
  const validWords = words.filter((w) => Boolean(w && vocaDict[w.toLowerCase().trim()]?.meaning));

  return validWords
    .map((word, idx) => {
      const clean = word.toLowerCase().trim();
      const meaning = vocaDict[clean]?.meaning || "";
      const colloc = getCollocation(word);
      // No authored collocation means no authored sentence to blank out.
      if (!colloc) return null;

      const regex = new RegExp(`\\b${clean}\\b`, "i");
      let sentenceWithBlank = colloc.exampleSentence.replace(regex, "[ _______ ]");
      if (!sentenceWithBlank.includes("[ _______ ]")) {
        sentenceWithBlank = `We must pay close attention to [ _______ ] in this situation.`;
      }

      const otherWords = validWords.filter((w) => w.toLowerCase().trim() !== clean);
      const shuffledOthers = [...otherWords].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [word, ...shuffledOthers].sort(() => Math.random() - 0.5);

      return {
        id: `cloze-${clean}-${idx}`,
        targetWord: word,
        meaning,
        sentenceWithBlank,
        sentenceKo: colloc.sentenceTranslation,
        options,
        correctAnswer: word,
      };
    })
    .filter((q): q is ClozeQuestion => q !== null);
}

// -----------------------------------------------------------------------------
// 5. 60-Second Speed Reflex Drill Queue
// -----------------------------------------------------------------------------

export function generateSpeedDrillItems(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
): SpeedDrillItem[] {
  const validWords = words.filter((w) => Boolean(w && vocaDict[w.toLowerCase().trim()]?.meaning));
  if (validWords.length === 0) return [];

  const items: SpeedDrillItem[] = [];

  for (let i = 0; i < validWords.length; i++) {
    const word = validWords[i];
    const clean = word.toLowerCase().trim();
    const actualMeaning = vocaDict[clean]?.meaning || "뜻";

    let isMatch = Math.random() > 0.45;
    let displayedMeaning = actualMeaning;

    if (!isMatch) {
      // V-04 (same rule as KIG-019 in the quiz): a "does not match" item must show a
      // meaning that really is different. Another word of the lesson with the same
      // Korean meaning would put the correct meaning on screen and still expect
      // "불일치". With no different meaning left, the item is a match instead of
      // showing a made-up "다른 뜻".
      const otherMeanings = validWords
        .filter((w) => w.toLowerCase().trim() !== clean)
        .map((w) => vocaDict[w.toLowerCase().trim()]?.meaning || "")
        .filter((m) => m && m !== actualMeaning);
      if (otherMeanings.length > 0) {
        displayedMeaning = otherMeanings[Math.floor(Math.random() * otherMeanings.length)];
      } else {
        isMatch = true;
      }
    }

    items.push({
      id: `speed-${clean}-${i}`,
      word,
      displayedMeaning,
      isMatch,
      actualMeaning,
    });
  }

  return items.sort(() => Math.random() - 0.5);
}

// -----------------------------------------------------------------------------
// 6. Leitner Spaced Repetition Logic (에빙하우스 망각곡선 모델)
// -----------------------------------------------------------------------------

export function updateLeitnerCard(
  prevCards: Record<string, LeitnerCard>,
  word: string,
  meaning: string,
  isCorrect: boolean,
): Record<string, LeitnerCard> {
  const clean = word.toLowerCase().trim();
  const current = prevCards[clean] || {
    word,
    meaning,
    box: 1,
    lastTestedAt: Date.now(),
    streak: 0,
  };

  let nextBox: 1 | 2 | 3 = current.box;
  let nextStreak = current.streak;

  if (isCorrect) {
    nextStreak += 1;
    const earned: 1 | 2 | 3 = nextStreak >= MASTERY_STREAK ? 3 : 2;
    // A correct answer may promote a card but must never demote one. A card can
    // already sit above what the streak alone would earn — it was mastered by
    // hand with the "마스터 체크" button — and answering it correctly used to
    // knock it back down to Box 2.
    nextBox = Math.max(current.box, earned) as 1 | 2 | 3;
  } else {
    nextStreak = 0;
    nextBox = 1;
  }

  return {
    ...prevCards,
    [clean]: {
      word,
      meaning,
      box: nextBox,
      lastTestedAt: Date.now(),
      streak: nextStreak,
    },
  };
}

/**
 * The learner asserted mastery directly with the "마스터 체크" button instead of
 * earning it through quiz answers. One click masters the card; the same button
 * un-masters it. The quiz path is untouched and still climbs 1 -> 2 -> 3 over
 * MASTERY_STREAK consecutive correct answers.
 */
export function setLeitnerMastery(
  prevCards: Record<string, LeitnerCard>,
  word: string,
  meaning: string,
  mastered: boolean,
): Record<string, LeitnerCard> {
  const clean = word.toLowerCase().trim();
  const current = prevCards[clean] || {
    word,
    meaning,
    box: 1 as const,
    lastTestedAt: Date.now(),
    streak: 0,
  };

  return {
    ...prevCards,
    [clean]: {
      ...current,
      word,
      meaning,
      box: mastered ? 3 : 1,
      // The click is one demonstration of knowledge, so the streak moves by one
      // rather than being fabricated up to the quiz threshold.
      streak: mastered ? current.streak + 1 : 0,
      lastTestedAt: Date.now(),
    },
  };
}
