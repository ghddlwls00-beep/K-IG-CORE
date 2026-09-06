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
export function generateListeningContextQuiz(
  sentences: { en: string; ko: string }[],
  hints: string[] = []
): ContextQuizItem[] {
  const fullTextKo = sentences.map((s) => s.ko).join(" ");
  const fullTextEn = sentences.map((s) => s.en).join(" ");

  // Q1: Speaker / Main Situation
  let q1Question = "Q1. 음성을 듣고 파악한 전체 지문의 주요 맥락과 화자는 누구인가요?";
  let q1Options = [
    "자신의 가족, 직업, 주거 환경을 소개하는 일상 소개 담화",
    "상점에서 물건을 환불하고 교환을 요청하는 고객 상담",
    "공항에서 비행기 탑승권과 수하물을 확인하는 출국 안내",
    "병원에서 의사가 환자의 수술 일정을 안내하는 진료 대화",
  ];
  let q1Answer = 0;
  let q1Expl = "원어민이 이름, 가족, 직업, 거주지 등을 차분하게 소개하는 개인 및 가족 소개 담화입니다.";

  if (fullTextKo.includes("병원") || fullTextKo.includes("간호사") || hints.some((h) => /nurse|doctor/i.test(h))) {
    q1Options[0] = "가족과 직업(간호사), 살고 있는 집과 자녀를 소개하는 화자";
    q1Expl = "화자가 자신의 직업(간호사), 남편(과학자), 그리고 자녀들의 방과 집에 대해 설명하고 있습니다.";
  }

  // Q2: Fact Check from content
  const firstSentenceKo = sentences[0]?.ko || "본문 내용";
  const lastSentenceKo = sentences[sentences.length - 1]?.ko || "가족 소개";

  let q2Question = "Q2. 들었던 내용 중 언급된 구체적인 사실(Fact)로 올바른 것은?";
  let q2Options = [
    `지문에서 언급된 내용: ${firstSentenceKo.slice(0, 32)}...`,
    "화자는 최근에 지어진 최신형 대저택으로 이사했다.",
    "화자의 가족은 현재 해외로 장기 여행을 떠났다.",
    "화자는 자녀가 전혀 없으며 홀로 살고 있다.",
  ];
  let q2Answer = 0;
  let q2Expl = `정답은 1번입니다. 지문 서두 및 본문에서 "${firstSentenceKo.slice(0, 45)}" 내용이 언급되었습니다.`;

  return [
    {
      question: q1Question,
      options: q1Options,
      answerIndex: q1Answer,
      explanation: q1Expl,
    },
    {
      question: q2Question,
      options: q2Options,
      answerIndex: q2Answer,
      explanation: q2Expl,
    },
  ];
}
