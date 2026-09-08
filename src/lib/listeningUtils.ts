/**
 * Acoustic Cognitive Listening Mastery Utilities for K-IG 교육 platform.
 *
 * Implements:
 * 1. Liaison & Sound Decoding Engine (연음, 탈락, 플랩 현상 분석)
 * 2. Word-Bank Generator for Mobile Tap-Dictation (듀오링고식 단어 블록 조립)
 * 3. Blind Context Listening Quiz Generator (Step 1 맥락 퀴즈)
 * 4. Word sequence validator & fuzzy phonetic matching
 */

export interface LiaisonCard {
  original: string;
  phonetic: string;
  koreanSound: string;
  type: "linking" | "flap" | "reduction" | "stress";
  typeLabel: string;
  rule: string;
}

export interface WordTile {
  id: string;
  word: string;
}

export interface ContextQuizItem {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

// Preset database of common high-yield phonetic patterns in conversational & news English
const LIAISON_PRESETS: {
  regex: RegExp;
  original: string;
  phonetic: string;
  koreanSound: string;
  type: "linking" | "flap" | "reduction" | "stress";
  typeLabel: string;
  rule: string;
}[] = [
  {
    regex: /\bwork\s+in\b/i,
    original: "work in",
    phonetic: "[wɜːr-kɪn]",
    koreanSound: "워킨",
    type: "linking",
    typeLabel: "자음+모음 연음 (Linking)",
    rule: "work의 끝자음 [k]와 in의 첫모음 [ɪ]가 이어져 '워킨'으로 한 단어처럼 발음됩니다.",
  },
  {
    regex: /\blive\s+in\b/i,
    original: "live in",
    phonetic: "[lɪ-vɪn]",
    koreanSound: "리빈",
    type: "linking",
    typeLabel: "자음+모음 연음 (Linking)",
    rule: "live의 끝자음 [v]와 in의 첫모음 [ɪ]가 결합하여 '리빈'으로 매끄럽게 연결됩니다.",
  },
  {
    regex: /\blike\s+it\b/i,
    original: "like it",
    phonetic: "[laɪ-kɪt]",
    koreanSound: "라이킷",
    type: "linking",
    typeLabel: "자음+모음 연음 (Linking)",
    rule: "like의 [k]와 it의 [ɪ]가 붙어 '라이킷'으로 짧고 경쾌하게 소리납니다.",
  },
  {
    regex: /\bone\s+of\b/i,
    original: "one of",
    phonetic: "[wʌ-nəv]",
    koreanSound: "워너브",
    type: "linking",
    typeLabel: "자음+모음 연음 (Linking)",
    rule: "one의 끝자음 [n]과 of의 모음이 연음되어 '원 오브'가 아닌 '워너브'로 소리납니다.",
  },
  {
    regex: /\bpart\s+of\b/i,
    original: "part of",
    phonetic: "[pɑːr-təv]",
    koreanSound: "파터브 / 파러브",
    type: "linking",
    typeLabel: "연음 & 플랩 현상",
    rule: "part의 t가 모음 사이에서 부드러운 'ㄹ' 발음으로 굴러가며 '파러브'로 들립니다.",
  },
  {
    regex: /\bmarried\s+to\b/i,
    original: "married to",
    phonetic: "[mær-id-tu]",
    koreanSound: "매리투",
    type: "reduction",
    typeLabel: "동일/유사 자음 탈락 (Elision)",
    rule: "d와 t처럼 조음 위치가 같은 자음이 만나면 앞의 d가 탈락하여 '매리투'로 압축됩니다.",
  },
  {
    regex: /\bdaughter\b/i,
    original: "daughter",
    phonetic: "[dɔː-tər ➔ dɔː-rər]",
    koreanSound: "도러",
    type: "flap",
    typeLabel: "모음 사이 Flap T 현상",
    rule: "모음 사이의 t 발음이 성대 울림을 거치며 한국어의 부드러운 'ㄹ'처럼 굴러갑니다.",
  },
  {
    regex: /\bhospital\b/i,
    original: "hospital",
    phonetic: "[hɑː-spɪ-tl ➔ hɑː-spɪ-rəl]",
    koreanSound: "하스피럴",
    type: "flap",
    typeLabel: "모음 사이 Flap T 현상",
    rule: "t 발음이 혀끝을 튕기는 플랩(Flap) 현상을 일으켜 '하스피털'이 아닌 '하스피럴'로 들립니다.",
  },
  {
    regex: /\bUnited\s+States\b/i,
    original: "United States",
    phonetic: "[juː-naɪ-tɪd ➔ juː-naɪ-rɪd]",
    koreanSound: "유나이릿 스테이츠",
    type: "flap",
    typeLabel: "플랩 & 연음 복합",
    rule: "United의 t가 [r]로 굴러가며 끝 d는 다음 자음 s 앞에서 숨죽이듯 약화됩니다.",
  },
  {
    regex: /\bout\s+of\b/i,
    original: "out of",
    phonetic: "[aʊ-təv ➔ aʊ-rə]",
    koreanSound: "아우러",
    type: "reduction",
    typeLabel: "플랩 & 구어 축약 (Reduction)",
    rule: "원어민 회화에서 out of는 거의 100% '아웃 오브'가 아닌 '아우러'로 축약 발음됩니다.",
  },
  {
    regex: /\bwant\s+to\b/i,
    original: "want to",
    phonetic: "[wɑːn-tə ➔ wɑː-nə]",
    koreanSound: "워너 (wanna)",
    type: "reduction",
    typeLabel: "구어 축약 (Reduction)",
    rule: "want의 t가 탈락하면서 to의 모음과 결합해 전형적인 'wanna(워너)' 소리로 압축됩니다.",
  },
  {
    regex: /\bgoing\s+to\b/i,
    original: "going to",
    phonetic: "[ɡoʊ-ɪŋ-tə ➔ ɡʌ-nə]",
    koreanSound: "거너 (gonna)",
    type: "reduction",
    typeLabel: "구어 축약 (Reduction)",
    rule: "말하기와 실전 청취에서 going to는 95% 이상 'gonna(거너)'로 소리납니다.",
  },
  {
    regex: /\bpick\s+up\b/i,
    original: "pick up",
    phonetic: "[pɪ-kʌp]",
    koreanSound: "피컵",
    type: "linking",
    typeLabel: "자음+모음 연음 (Linking)",
    rule: "pick의 k 자음과 up의 u 모음이 연음되어 음료 '컵'처럼 '피컵'으로 하나가 됩니다.",
  },
  {
    regex: /\bhave\s+one\b/i,
    original: "have one",
    phonetic: "[hæ-v-wʌn]",
    koreanSound: "해본",
    type: "linking",
    typeLabel: "유사 조음 연음",
    rule: "have의 v소리와 one의 w소리가 부드럽게 이어져 '해본'처럼 자연스럽게 묶입니다.",
  },
  {
    regex: /\bupstairs\b/i,
    original: "upstairs",
    phonetic: "[ʌp-stɛrz]",
    koreanSound: "업스테어즈",
    type: "stress",
    typeLabel: "어말 자음 폐쇄 (Stop T/P)",
    rule: "up의 p는 터뜨리지 않고 입술을 닫은 상태에서 바로 stairs로 넘어갑니다.",
  },
];

/**
 * Automatically analyzes a sentence and returns high-yield liaison/phonetic mutation points.
 */
export function generateLiaisonPoints(sentence: string): LiaisonCard[] {
  const cards: LiaisonCard[] = [];
  const clean = sentence.replace(/[.,?!;:"'()]/g, " ").replace(/\s+/g, " ").trim();

  // 1. Scan preset high-yield phonetic rules
  for (const preset of LIAISON_PRESETS) {
    if (preset.regex.test(clean)) {
      cards.push({
        original: preset.original,
        phonetic: preset.phonetic,
        koreanSound: preset.koreanSound,
        type: preset.type,
        typeLabel: preset.typeLabel,
        rule: preset.rule,
      });
      if (cards.length >= 4) break;
    }
  }

  // 2. Dynamic scanner for generic Consonant + Vowel linking if less than 2 cards found
  if (cards.length < 2) {
    const words = clean.split(/\s+/);
    const vowels = new Set(["a", "e", "i", "o", "u"]);

    for (let i = 0; i < words.length - 1; i++) {
      const w1 = words[i].toLowerCase();
      const w2 = words[i + 1].toLowerCase();

      if (w1.length < 2 || w2.length < 2) continue;

      const lastChar = w1[w1.length - 1];
      const firstChar = w2[0];

      // Check if word1 ends with a consonant and word2 starts with a vowel
      if (!vowels.has(lastChar) && vowels.has(firstChar) && /[a-z]/.test(lastChar)) {
        const pairText = `${words[i]} ${words[i + 1]}`;
        // Avoid duplicate
        if (!cards.some((c) => c.original.toLowerCase() === pairText.toLowerCase())) {
          cards.push({
            original: pairText,
            phonetic: `[${w1.slice(0, -1)}-${lastChar}${w2}]`,
            koreanSound: `${words[i]}_${words[i + 1]} (이어짐)`,
            type: "linking",
            typeLabel: "자음+모음 연음 (Linking)",
            rule: `'${words[i]}'의 끝자음 [${lastChar}]이 '${words[i + 1]}'의 모음 [${firstChar}]과 결합되어 한 단어처럼 연음됩니다.`,
          });
          if (cards.length >= 3) break;
        }
      }
    }
  }

  return cards;
}

/**
 * Creates word-bank tiles for mobile tap-to-assemble dictation with plausible distractors.
 */
export function generateWordBank(
  sentence: string,
  extraDistractorPool: string[] = []
): { correctWords: string[]; allTiles: WordTile[] } {
  // Strip trailing punctuation but keep apostrophes inside words (e.g. "I'm", "don't")
  const rawWords = sentence.match(/[a-zA-Z0-9'’\-]+/g) || [];
  const correctWords = rawWords.map((w) => w.trim()).filter(Boolean);

  const tileList: WordTile[] = correctWords.map((word, idx) => ({
    id: `word-${idx}-${word}`,
    word,
  }));

  // Add 2~3 smart distractor words
  const defaultDistractors = [
    "was", "the", "with", "in", "at", "for", "on", "is", "he", "she", "we", "are", "very"
  ];
  const pool = Array.from(new Set([...extraDistractorPool, ...defaultDistractors]));
  const existingSet = new Set(correctWords.map((w) => w.toLowerCase()));

  const addedDistractors: string[] = [];
  for (const d of pool) {
    if (!existingSet.has(d.toLowerCase()) && d.length >= 2) {
      addedDistractors.push(d);
      if (addedDistractors.length >= 2) break;
    }
  }

  addedDistractors.forEach((dist, idx) => {
    tileList.push({
      id: `distractor-${idx}-${dist}`,
      word: dist,
    });
  });

  // Fisher-Yates shuffle
  const shuffled = [...tileList];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return {
    correctWords,
    allTiles: shuffled,
  };
}

/**
 * Verifies if the assembled word tiles match the target sentence words.
 */
export function verifyWordSequence(userWords: string[], targetWords: string[]): boolean {
  if (userWords.length !== targetWords.length) return false;
  return userWords.every(
    (w, idx) => w.toLowerCase() === targetWords[idx].toLowerCase()
  );
}

/**
 * Generates 2 Context Diagnosis Multiple-Choice Questions for Step 1 Blind Listening.
 */
function shuffleQuizOptions<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function cleanFactSentence(raw: string): string {
  if (!raw) return "화자는 자신의 가족과 함께 거주하고 있다.";
  let cleaned = raw.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
  const segments = cleaned.split(/(?<=[.?!])\s+/);
  if (segments.length > 0) {
    let acc = segments[0];
    for (let i = 1; i < segments.length; i++) {
      if (acc.length + segments[i].length < 65) {
        acc += " " + segments[i];
      } else {
        break;
      }
    }
    cleaned = acc;
  }
  return cleaned;
}

/**
 * Generates 2 Context Diagnosis Multiple-Choice Questions for Step 1 Blind Listening.
 * Options are dynamically generated from the lesson text and randomly shuffled across 1~4.
 */
export function generateListeningContextQuiz(
  sentences: { en: string; ko: string }[],
  hints: string[] = []
): ContextQuizItem[] {
  const fullTextKo = sentences.map((s) => s.ko).join(" ");
  const t = fullTextKo.toLowerCase();
  const hintStr = hints.join(" ").toLowerCase();

  // ---------------------------------------------------------------------------
  // Q1: Speaker / Situation Identification (다이나믹 맥락 분석)
  // ---------------------------------------------------------------------------
  let correctQ1 = "화자가 자신의 신원, 가족 관계, 생활 환경을 차분히 들려주는 일상 소개 담화";
  const q1DistractorPool = [
    "상점에서 구매한 물건의 하자로 환불을 요청하는 고객 상담",
    "공항 출국 심사대에서 탑승권과 수하물을 확인하는 출국 수속",
    "병원에서 담당 의사가 환자의 수술 일정을 안내하는 진료 대화",
    "도서관에서 필요한 전공 서적의 대출 절차를 문의하는 대화",
    "호텔 프런트에서 체크인 시간을 연장하고 룸서비스를 요청하는 상담",
  ];

  if (t.includes("브라질") || t.includes("남미") || t.includes("포르투갈")) {
    correctQ1 = "자신이 사는 국가(브라질)의 지리적 위치, 언어 및 주요 산업 소개";
  } else if (t.includes("농장") || t.includes("시골") || t.includes("조부모") || t.includes("할머니") || t.includes("할아버지")) {
    correctQ1 = "시골에 계신 조부모님의 농장을 방문했던 경험과 추억을 들려주는 이야기";
  } else if (t.includes("학교") || t.includes("결석") || t.includes("수업") || t.includes("학생")) {
    correctQ1 = "학교 생활과 수업 참여, 결석 사유에 대해 설명하는 학생의 이야기";
  } else if (t.includes("케냐") || t.includes("아프리카") || t.includes("사파리") || t.includes("동물")) {
    correctQ1 = "아프리카 여행 중 촬영한 야생 동물과 자연 풍경 사진을 소개하는 이야기";
  } else if (t.includes("간호사") || t.includes("병원") || hintStr.includes("nurse") || hintStr.includes("doctor")) {
    correctQ1 = "병원에서 일하는 간호사로서 자신의 직업과 가족의 일상을 소개하는 담화";
  } else if (t.includes("형제") || t.includes("덴버") || t.includes("콜로라도") || t.includes("번지") || t.includes("거리")) {
    correctQ1 = "자신의 이름과 가족 관계, 현재 거주하는 동네와 집을 소개하는 담화";
  } else if (t.includes("여행") || t.includes("구라파") || t.includes("유럽") || t.includes("비행기")) {
    correctQ1 = "해외 여행 경험 및 방문하고 싶은 여행지에 대한 개인적 감상";
  }

  const shuffledQ1Distractors = shuffleQuizOptions(q1DistractorPool).slice(0, 3);
  const q1Options = shuffleQuizOptions([correctQ1, ...shuffledQ1Distractors]);
  const q1AnswerIndex = q1Options.indexOf(correctQ1);
  const q1Expl = `정답: "${correctQ1}". 지문 전체의 주된 화자와 배경 상황을 정확히 설명한 보기입니다.`;

  // ---------------------------------------------------------------------------
  // Q2: Fact-Check Question (사실 일치 - 힌트성 접두사 제거 및 랜덤 셔플)
  // ---------------------------------------------------------------------------
  const firstSentenceKo = sentences[0]?.ko || "본문 내용";
  const secondSentenceKo = sentences[1]?.ko || sentences[0]?.ko || "본문 내용";

  const cleanFact = cleanFactSentence(firstSentenceKo.length > 10 ? firstSentenceKo : secondSentenceKo);

  let q2DistractorPool = [
    "화자는 최근에 지어진 최신형 대저택으로 이사했다.",
    "화자의 가족은 현재 모두 해외로 장기 여행을 떠났다.",
    "화자는 자녀가 전혀 없으며 홀로 살고 있다.",
    "화자는 아직 미혼이며 부모님과 함께 대도시에 살고 있다.",
    "화자는 최근 직장을 그만두고 다른 나라로 이민을 준비 중이다.",
  ];

  if (t.includes("농장") || t.includes("시골")) {
    q2DistractorPool = [
      "화자는 조부모님의 농장이 너무 멀어서 방문을 포기했다.",
      "화자의 부모님은 모두 외국에서 태어나 영어를 쓰지 않는다.",
      "화자는 시골보다 번화한 도심 백화점 쇼핑을 더 좋아한다.",
    ];
  } else if (t.includes("브라질") || t.includes("남미")) {
    q2DistractorPool = [
      "화자가 살고 있는 나라는 북유럽에 위치한 작은 국가이다.",
      "화자는 영어를 전혀 사용하지 못해 통역관의 도움을 받는다.",
      "화자가 거주하는 곳은 산업이 전혀 발달하지 않은 농촌이다.",
    ];
  } else if (t.includes("학교") || t.includes("결석")) {
    q2DistractorPool = [
      "화자는 어제 학교 시험에서 전교 1등을 차지했다.",
      "화자는 방학 동안 매일 학교에 남아 자습을 했다.",
      "화자는 선생님의 칭찬을 받고 장학금을 받게 되었다.",
    ];
  }

  const shuffledQ2Distractors = shuffleQuizOptions(q2DistractorPool).slice(0, 3);
  const q2Options = shuffleQuizOptions([cleanFact, ...shuffledQ2Distractors]);
  const q2AnswerIndex = q2Options.indexOf(cleanFact);
  const q2Expl = `정답: "${cleanFact}". 지문 본문에서 실제로 언급된 핵심 사실(Fact)입니다.`;

  return [
    {
      question: "Q1. 음성을 듣고 파악한 전체 지문의 주요 맥락과 화자는 누구인가요?",
      options: q1Options,
      answerIndex: q1AnswerIndex,
      explanation: q1Expl,
    },
    {
      question: "Q2. 들었던 내용 중 언급된 구체적인 사실(Fact)로 올바른 것은?",
      options: q2Options,
      answerIndex: q2AnswerIndex,
      explanation: q2Expl,
    },
  ];
}
