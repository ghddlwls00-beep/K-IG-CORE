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
  { prefix: "foremost", meaning: "fore(맨 앞의) + most(가장) ➔ 가장 앞서는, 으뜸가는" },
  { prefix: "ancestor", meaning: "ante(앞서) + cede(가다) ➔ 우리보다 앞서 간 사람, 조상" },
  { prefix: "anticipate", meaning: "anti/ante(앞서) + cip(잡다) ➔ 앞으로 일어날 일을 미리 마음에 품다, 예상하다" },
  { prefix: "antique", meaning: "ante/anti(고대의) + ique ➔ 옛날부터 전해 내려온 진귀한 물건, 골동품" },
  { prefix: "replace", meaning: "re(다시/제자리로) + place(놓다) ➔ 낡은 것을 다시 놓다, 대신하다/교체하다" },
  { prefix: "recover", meaning: "re(다시) + cover(얻다) ➔ 잃었던 건강/상태를 다시 찾다, 회복하다" },
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

const GENERIC_PREFIX_MAP = [
  { prefix: "pre", kor: "미리, 이전의", meaning: "사전에 일어남을 뜻하는 접두사" },
  { prefix: "pro", kor: "앞으로, 찬성하여", meaning: "미래나 전진 방향을 뜻하는 접두사" },
  { prefix: "post", kor: "이후에, 뒤에", meaning: "어떤 사건 뒤에 이어짐을 뜻하는 접두사" },
  { prefix: "fore", kor: "앞의, 미리", meaning: "공간/시간상 앞쪽을 가리키는 접두사" },
  { prefix: "anti", kor: "반대의, 대항하는 / 이전의", meaning: "대항하거나 사전을 의미하는 접두사" },
  { prefix: "ante", kor: "앞서, 이전의", meaning: "시간적으로 앞선 시점을 뜻하는 접두사" },
  { prefix: "re", kor: "다시, 뒤로", meaning: "반복이나 원래 상태로 돌아감을 뜻하는 접두사" },
  { prefix: "sub", kor: "아래에, 하위의", meaning: "기준보다 밑에 위치함을 뜻하는 접두사" },
  { prefix: "trans", kor: "가로질러, 넘어서", meaning: "경계를 통과하거나 변환됨을 뜻하는 접두사" },
  { prefix: "in", kor: "안에 / 아닌(부정)", meaning: "내부로 들어가거나 반대 뜻을 만드는 접두사" },
  { prefix: "im", kor: "안에 / 아닌(부정)", meaning: "내부로 들어가거나 반대 뜻을 만드는 접두사" },
  { prefix: "ex", kor: "밖으로, 이전의", meaning: "바깥쪽으로 배출되거나 과거를 뜻하는 접두사" },
  { prefix: "con", kor: "함께, 완전히", meaning: "여럿이 모이거나 강조하는 접두사" },
  { prefix: "com", kor: "함께, 완전히", meaning: "여럿이 모이거나 강조하는 접두사" },
  { prefix: "dis", kor: "반대의, 떨어져", meaning: "분리되거나 부정적인 반대를 뜻하는 접두사" },
  { prefix: "mis", kor: "잘못된", meaning: "실수나 착오를 뜻하는 접두사" },
  { prefix: "un", kor: "아닌(부정)", meaning: "형용사나 동사의 반대 상태를 뜻하는 접두사" },
  { prefix: "over", kor: "과도한, 위의", meaning: "기준을 초과하거나 위쪽을 뜻하는 접두사" },
  { prefix: "under", kor: "아래의, 부족한", meaning: "기준에 못 미치거나 아래를 뜻하는 접두사" },
  { prefix: "inter", kor: "사이에, 상호간에", meaning: "둘 이상의 사이를 뜻하는 접두사" },
  { prefix: "auto", kor: "스스로, 자신의", meaning: "외부의 힘 없이 스스로 작동함을 뜻하는 접두사" },
  { prefix: "tele", kor: "멀리", meaning: "원거리 통신이나 시각을 뜻하는 접두사" },
];

export function analyzeEtymology(word: string): EtymologyInfo {
  const clean = word.toLowerCase().trim();

  // 1. Direct preset match
  const preset = PREFIX_RULES.find((p) => p.prefix === clean);
  if (preset) {
    return { explanation: preset.meaning };
  }

  // 2. Prefix substring match
  for (const p of GENERIC_PREFIX_MAP) {
    if (clean.startsWith(p.prefix) && clean.length > p.prefix.length + 2) {
      const rest = clean.slice(p.prefix.length);
      return {
        prefix: { part: p.prefix, meaning: p.kor },
        root: { part: rest, meaning: "어근" },
        explanation: `[접두사 ${p.prefix}- (${p.kor})] + [어근 ${rest}] ➔ ${p.meaning}`,
      };
    }
  }

  // 3. Sound-syllable phonics breakdown
  return {
    explanation: `발음 음소 규칙: 영문 철자 [${clean}]의 음절 구조와 원어민 강세 위치에 주목하여 소리로 각인하세요.`,
  };
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

export function getCollocation(word: string, meaning: string): CollocationItem {
  const clean = word.toLowerCase().trim();
  if (COLLOCATION_PRESETS[clean]) {
    return COLLOCATION_PRESETS[clean];
  }

  return {
    phrase: `vital role of ${clean}`,
    translation: `${clean} (${meaning})의 핵심적 역할`,
    exampleSentence: `Understanding the exact meaning of "${clean}" is essential for daily conversation.`,
    sentenceTranslation: `"${clean}"(${meaning})의 정확한 뉘앙스를 이해하는 것은 일상 대화에 필수적입니다.`,
  };
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
        etymologyHint: analyzeEtymology(word).explanation,
      };
    } else {
      const distractorWords = validWords
        .filter((w) => w.toLowerCase().trim() !== clean)
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
        etymologyHint: analyzeEtymology(word).explanation,
      };
    }
  });
}

// -----------------------------------------------------------------------------
// 4. In-Context Cloze Sentence Fill-in Generator
// -----------------------------------------------------------------------------

export function generateClozeQuestions(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
): ClozeQuestion[] {
  const validWords = words.filter((w) => Boolean(w && vocaDict[w.toLowerCase().trim()]?.meaning));

  return validWords.map((word, idx) => {
    const clean = word.toLowerCase().trim();
    const meaning = vocaDict[clean]?.meaning || "";
    const colloc = getCollocation(word, meaning);

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
  });
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

    const isMatch = Math.random() > 0.45;
    let displayedMeaning = actualMeaning;

    if (!isMatch) {
      const otherWords = validWords.filter((w) => w.toLowerCase().trim() !== clean);
      if (otherWords.length > 0) {
        const randomOther = otherWords[Math.floor(Math.random() * otherWords.length)];
        displayedMeaning = vocaDict[randomOther.toLowerCase().trim()]?.meaning || "다른 뜻";
      } else {
        displayedMeaning = "다른 뜻";
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
    if (nextStreak >= 3) {
      nextBox = 3;
    } else if (nextStreak >= 1) {
      nextBox = 2;
    }
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
