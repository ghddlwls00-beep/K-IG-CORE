/**
 * Pedagogical utilities for Reading Comprehension Courseware.
 * Powers WPM calculations, Vocabulary Extraction, Syntax Chunking, and Interactive Quizzes.
 */

// Comprehensive vocabulary database for reading course passages
const VOCAB_DATABASE: Record<string, { meaning: string; pos: string }> = {
  // Common core & high-yield academic reading terms
  teenager: { meaning: "십 대, 청소년", pos: "n." },
  question: { meaning: "의문을 제기하다, 질문", pos: "v./n." },
  blindly: { meaning: "맹목적으로, 무비판적으로", pos: "adv." },
  accept: { meaning: "받아들이다, 수용하다", pos: "v." },
  gradually: { meaning: "서서히, 점진적으로", pos: "adv." },
  aware: { meaning: "자각하는, 알고 있는", pos: "adj." },
  unique: { meaning: "고유한, 독특한", pos: "adj." },
  attitude: { meaning: "태도, 자세", pos: "n." },
  choice: { meaning: "선택, 선택권", pos: "n." },
  lifestyle: { meaning: "생활 방식, 라이프스타일", pos: "n." },
  instinct: { meaning: "직감, 본능", pos: "n." },
  inner: { meaning: "내면의, 내부의", pos: "adj." },
  sufficient: { meaning: "충분한, 흡족한", pos: "adj." },
  impulsive: { meaning: "충동적인, 즉흥적인", pos: "adj." },
  dictate: { meaning: "지시하다, 좌우하다", pos: "v." },
  basis: { meaning: "근거, 기초", pos: "n." },
  analyze: { meaning: "분석하다, 검토하다", pos: "v." },
  trusted: { meaning: "신뢰받는, 믿을 수 있는", pos: "adj." },
  trust: { meaning: "신뢰하다, 믿다", pos: "v." },
  observe: { meaning: "관찰하다, 지켜보다", pos: "v." },
  observation: { meaning: "관찰, 관측", pos: "n." },
  evaluate: { meaning: "평가하다, 가늠하다", pos: "v." },
  knowledge: { meaning: "지식, 앎", pos: "n." },
  situation: { meaning: "상황, 처지", pos: "n." },
  experience: { meaning: "경험, 체험", pos: "n./v." },
  judgment: { meaning: "판단, 판정", pos: "n." },
  judge: { meaning: "판단하다, 심사하다", pos: "v." },
  distance: { meaning: "거리, 간격", pos: "n." },
  traffic: { meaning: "교통량, 통행", pos: "n." },
  route: { meaning: "경로, 노선", pos: "n." },
  hurry: { meaning: "서두르다", pos: "v." },
  suddenly: { meaning: "갑자기, 불현듯", pos: "adv." },
  support: { meaning: "뒷받침하다, 지지하다", pos: "v." },
  require: { meaning: "요구하다, 필요로 하다", pos: "v." },
  correct: { meaning: "올바른, 정확한", pos: "adj." },
  ignore: { meaning: "무시하다, 외면하다", pos: "v." },
  regret: { meaning: "후회하다, 유감스러워하다", pos: "v." },
  counsel: { meaning: "조언, 상담, 권고", pos: "n." },
  miscommunicate: { meaning: "의사소통이 잘못되다, 오해하다", pos: "v." },
  respect: { meaning: "존중하다, 존경하다", pos: "v." },
  successful: { meaning: "성공적인, 결실 있는", pos: "adj." },
  differently: { meaning: "다르게, 별개로", pos: "adv." },
  difference: { meaning: "차이점, 다름", pos: "n." },
  differences: { meaning: "차이점, 다름", pos: "n." },
  problem: { meaning: "문제, 난제", pos: "n." },
  problems: { meaning: "문제점들", pos: "n." },
  scientist: { meaning: "과학자", pos: "n." },
  scientists: { meaning: "과학자들", pos: "n." },
  instance: { meaning: "사례, 경우, 예시", pos: "n." },
  organization: { meaning: "조직, 단체, 기구", pos: "n." },
  organizations: { meaning: "조직들, 단체들", pos: "n." },
  effort: { meaning: "노력, 수고", pos: "n." },
  efforts: { meaning: "노력들", pos: "n." },
  chemical: { meaning: "화학 물질", pos: "n." },
  chemicals: { meaning: "화학 물질들", pos: "n." },
  produce: { meaning: "생산하다, 발생시키다", pos: "v." },
  producing: { meaning: "생산하는, 배출하는", pos: "v." },
  oxygen: { meaning: "산소", pos: "n." },
  quality: { meaning: "품질, 질, 우수성", pos: "n." },
  continued: { meaning: "지속적인, 계속된", pos: "adj." },
  private: { meaning: "민간의, 사적인", pos: "adj." },
  factory: { meaning: "공장", pos: "n." },
  factories: { meaning: "공장들", pos: "n." },
  environment: { meaning: "환경, 자연환경", pos: "n." },
  communication: { meaning: "의사소통, 대화", pos: "n." },
  communicate: { meaning: "소통하다, 대화하다", pos: "v." },
  prefer: { meaning: "선호하다, 더 좋아하다", pos: "v." },
  nature: { meaning: "자연, 본성, 성질", pos: "n." },
  natural: { meaning: "자연스러운, 천연의", pos: "adj." },
  society: { meaning: "사회, 공동체", pos: "n." },
  culture: { meaning: "문화, 교양", pos: "n." },
  cultural: { meaning: "문화적인", pos: "adj." },
  relationship: { meaning: "관계, 유대감", pos: "n." },
  generation: { meaning: "세대", pos: "n." },
  generations: { meaning: "세대들", pos: "n." },
  technology: { meaning: "기술, 과학기술", pos: "n." },
  tradition: { meaning: "전통, 관습", pos: "n." },
  influence: { meaning: "영향을 미치다, 영향력", pos: "v." },
  education: { meaning: "교육", pos: "n." },
  educational: { meaning: "교육적인", pos: "adj." },
  individual: { meaning: "개인, 개별의", pos: "n." },
  community: { meaning: "지역사회, 공동체", pos: "n." },
  behavior: { meaning: "행동, 품행", pos: "n." },
  opinion: { meaning: "의견, 견해", pos: "n." },
  decision: { meaning: "결정, 결단", pos: "n." },
  opportunity: { meaning: "기회", pos: "n." },
  challenge: { meaning: "도전, 난제", pos: "n." },
  solution: { meaning: "해결책, 해결", pos: "n." },
  development: { meaning: "발전, 개발", pos: "n." },
  process: { meaning: "과정, 절차", pos: "n." },
  benefit: { meaning: "이익, 혜택", pos: "n." },
  protect: { meaning: "보호하다, 지키다", pos: "v." },
  improve: { meaning: "개선하다, 향상시키다", pos: "v." },
  increase: { meaning: "증가하다, 늘리다", pos: "v." },
  decrease: { meaning: "감소하다, 줄이다", pos: "v." },
  discover: { meaning: "발견하다, 알아내다", pos: "v." },
  express: { meaning: "표현하다, 나타내다", pos: "v." },
  encourage: { meaning: "격려하다, 권장하다", pos: "v." },
  important: { meaning: "중요한, 중대한", pos: "adj." },
  necessary: { meaning: "필요한, 필수적인", pos: "adj." },
  effective: { meaning: "효과적인, 유효한", pos: "adj." },
  difficulty: { meaning: "어려움, 곤경", pos: "n." },
  advantage: { meaning: "이점, 장점", pos: "n." },
  disadvantage: { meaning: "불리한 점, 단점", pos: "n." },
  balance: { meaning: "균형, 조화", pos: "n." },
  rhythm: { meaning: "리듬, 박자", pos: "n." },
  harmony: { meaning: "조화, 화음", pos: "n." },
  species: { meaning: "생물 종(種)", pos: "n." },
  temperature: { meaning: "온도, 기온", pos: "n." },
  climate: { meaning: "기후", pos: "n." },
  emotion: { meaning: "감정, 정서", pos: "n." },
  conscience: { meaning: "양심", pos: "n." },
  justice: { meaning: "정의, 공정", pos: "n." },
  morality: { meaning: "도덕성", pos: "n." },
  curiosity: { meaning: "호기심", pos: "n." },
  imagination: { meaning: "상상력", pos: "n." },
  creativity: { meaning: "창의성", pos: "n." },
  memory: { meaning: "기억, 추억", pos: "n." },
  friendship: { meaning: "우정, 친교", pos: "n." },
  courage: { meaning: "용기, 담력", pos: "n." },
  persistence: { meaning: "끈기, 지속", pos: "n." },
  achievement: { meaning: "성취, 업적", pos: "n." },
  failure: { meaning: "실패, 결점", pos: "n." },
  profession: { meaning: "전문직, 직업", pos: "n." },
  industry: { meaning: "산업, 근면", pos: "n." },
  economy: { meaning: "경제, 절약", pos: "n." },
  resource: { meaning: "자원, 재원", pos: "n." },
  energy: { meaning: "에너지, 활력", pos: "n." },
  efficiency: { meaning: "효율성", pos: "n." },
  innovation: { meaning: "혁신, 쇄신", pos: "n." },
  evidence: { meaning: "증거, 흔적", pos: "n." },
  perspective: { meaning: "관점, 시각", pos: "n." },
  consequence: { meaning: "결과, 중대성", pos: "n." },
  independence: { meaning: "독립, 자립", pos: "n." },
  responsibility: { meaning: "책임, 의무", pos: "n." },
  cooperation: { meaning: "협력, 협동", pos: "n." },
  contribution: { meaning: "기여, 공헌", pos: "n." },
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below", "from", "up",
  "down", "in", "out", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "can", "will", "just", "don", "should",
  "now", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
  "them", "my", "your", "his", "its", "our", "their", "this", "that", "these",
  "those", "am", "has", "have", "had", "do", "does", "did", "though", "may",
  // Common grammatical / functional glue words to skip in reading voca:
  "however", "sometimes", "become", "became", "begin", "began", "start", "started",
  "also", "even", "always", "never", "often", "usually", "make", "made", "take", "took",
  "get", "got", "come", "came", "go", "went", "gone", "know", "knew", "known",
  "think", "thought", "say", "said", "tell", "told", "see", "saw", "seen",
  "look", "looked", "give", "gave", "given", "find", "found", "use", "used",
  "well", "much", "many", "like", "every", "thing", "things", "person", "people",
  "small", "big", "time", "year", "years", "day", "days", "way", "ways", "first",
  "second", "good", "better", "best", "new", "little", "put", "another", "instead",
  "really", "almost", "quite", "rather", "perhaps", "maybe", "probably", "actually",
  "already", "still", "yet", "what", "which", "who", "whom", "whose"
]);

function getWordCandidates(w: string): string[] {
  const list = [w];
  if (w.endsWith("ies") && w.length > 4) list.push(w.slice(0, -3) + "y");
  if (w.endsWith("es") && w.length > 4) list.push(w.slice(0, -2));
  if (w.endsWith("s") && !w.endsWith("ss") && w.length > 3) list.push(w.slice(0, -1));
  if (w.endsWith("ied") && w.length > 4) list.push(w.slice(0, -3) + "y");
  if (w.endsWith("ed") && w.length > 4) {
    list.push(w.slice(0, -2));
    list.push(w.slice(0, -1));
  }
  if (w.endsWith("ing") && w.length > 5) {
    list.push(w.slice(0, -3));
    list.push(w.slice(0, -3) + "e");
  }
  if (w.endsWith("ly") && w.length > 4) {
    list.push(w.slice(0, -2));
    list.push(w.slice(0, -2) + "e");
  }
  return list;
}

export interface KeyWord {
  word: string;
  pos: string;
  meaning: string;
}

export function extractPassageKeywords(
  enPassage: string,
  limit = 14,
  vocaDict?: Record<string, { meaning: string; searchWord?: string }> | null
): KeyWord[] {
  if (!enPassage) return [];
  const words = enPassage
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const unique = Array.from(new Set(words));
  const result: KeyWord[] = [];
  const seenStems = new Set<string>();

  for (const w of unique) {
    if (result.length >= limit) break;
    const candidates = getWordCandidates(w);
    const baseStem = candidates[candidates.length - 1];

    if (seenStems.has(baseStem)) continue;

    let matched: KeyWord | null = null;
    for (const c of candidates) {
      if (VOCAB_DATABASE[c]) {
        matched = { word: w, pos: VOCAB_DATABASE[c].pos, meaning: VOCAB_DATABASE[c].meaning };
        break;
      }
      if (vocaDict && vocaDict[c]) {
        let pos = "n.";
        if (w.endsWith("ly")) pos = "adv.";
        else if (w.endsWith("able") || w.endsWith("ive") || w.endsWith("al") || w.endsWith("ous")) pos = "adj.";
        else if (w.endsWith("ize") || w.endsWith("ate") || w.endsWith("ed") || w.endsWith("ing")) pos = "v.";
        matched = { word: w, pos, meaning: vocaDict[c].meaning };
        break;
      }
    }

    if (matched) {
      result.push(matched);
      seenStems.add(baseStem);
      seenStems.add(w);
    }
  }

  // If still under limit, include any remaining valid content words
  if (result.length < limit) {
    for (const w of unique) {
      if (result.length >= limit) break;
      if (!seenStems.has(w)) {
        result.push({
          word: w,
          pos: w.endsWith("ly") ? "adv." : w.endsWith("ing") || w.endsWith("ed") ? "v." : "n./adj.",
          meaning: "지문 핵심 어휘",
        });
        seenStems.add(w);
      }
    }
  }

  return result.slice(0, limit);
}

export interface ChunkPair {
  enChunks: string[];
  koChunks: string[];
}

export function parseSlashChunks(enSentence: string, koSentence: string): ChunkPair {
  if (!enSentence) return { enChunks: [], koChunks: [] };

  const enDelimiters = /(?<=[,\;])\s+|(?<=\w)\s+(?=(?:that|which|who|whom|whose|when|where|while|because|since|although|though|if|unless|in order to|as well as|for instance|for example)\b)|(?<=\w)\s+(?=(?:in|on|at|by|for|with|about|into|through|without|under|over|from|to)\s+(?:the|a|an|their|her|his|our|its|this|that|these|those|[A-Z]))/i;

  let rawEnChunks = enSentence
    .split(enDelimiters)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  const mergedEn: string[] = [];
  for (let i = 0; i < rawEnChunks.length; i++) {
    const curr = rawEnChunks[i];
    if (mergedEn.length > 0 && curr.split(/\s+/).length <= 2 && i === rawEnChunks.length - 1) {
      mergedEn[mergedEn.length - 1] += " " + curr;
    } else {
      mergedEn.push(curr);
    }
  }

  const enChunks = mergedEn.length > 0 ? mergedEn : [enSentence];
  const koWords = koSentence.trim().split(/\s+/);
  const chunkCount = enChunks.length;
  const koChunks: string[] = [];

  if (chunkCount <= 1 || koWords.length <= 3) {
    koChunks.push(koSentence);
  } else {
    const wordsPerChunk = Math.max(1, Math.floor(koWords.length / chunkCount));
    for (let i = 0; i < chunkCount; i++) {
      if (i === chunkCount - 1) {
        koChunks.push(koWords.slice(i * wordsPerChunk).join(" "));
      } else {
        koChunks.push(koWords.slice(i * wordsPerChunk, (i + 1) * wordsPerChunk).join(" "));
      }
    }
  }

  return {
    enChunks,
    koChunks,
  };
}

export function extractFullReadingPassage(
  blocks?: { type: string; text?: string | null }[] | null
): string {
  if (!blocks || blocks.length === 0) return "";

  const textBlocks = blocks
    .filter(
      (b) =>
        (b.type === "instruction" || b.type === "hints" || b.type === "paragraph") &&
        b.text
    )
    .map((b) => (b.text || "").trim())
    .filter(Boolean);

  if (textBlocks.length === 0) return "";
  if (textBlocks.length === 1) return textBlocks[0];

  const parts: string[] = [];
  for (let i = 0; i < textBlocks.length; i++) {
    const curr = textBlocks[i];
    if (/^\([A-Za-z0-9]\)$|^\[[A-Za-z0-9]\]$/.test(curr)) {
      if (i + 1 < textBlocks.length) {
        parts.push(`${curr} ${textBlocks[i + 1]}`);
        i++;
      } else {
        parts.push(curr);
      }
    } else {
      parts.push(curr);
    }
  }

  return parts.join("\n\n");
}

function getSeededRandom(seedStr: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 15), 2246822507) ^ 3266489909;
    return ((h >>> 0) % 10000) / 10000;
  };
}

function shuffleWithSeed<T>(array: T[], seedStr: string): T[] {
  const rng = getSeededRandom(seedStr);
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface ReadingQuestion {
  id: number;
  question: string;
  type: "main_idea" | "detail";
  options: string[];
  answerIndex: number;
  explanation: string;
}

export function generateReadingQuiz(
  enPassage: string,
  koPassage: string,
  lessonId: string
): ReadingQuestion[] {
  const tKo = (koPassage || "").toLowerCase();
  const tEn = (enPassage || "").toLowerCase();
  const seed = lessonId || "reading-default";

  // ---------------------------------------------------------------------------
  // Question 1: Main Idea (주제 추론 - 지문 내용 기반 동적 분석 및 보기 셔플)
  // ---------------------------------------------------------------------------
  let q1Correct = "";
  let q1Distractors: string[] = [];
  let q1Expl = "";

  if (
    tKo.includes("문제 해결") ||
    tKo.includes("결정") ||
    tEn.includes("problem solving") ||
    tEn.includes("decision")
  ) {
    q1Correct = "감정에 치우치지 않고 객관적 관찰과 지식을 결합한 합리적 문제 해결";
    q1Distractors = [
      "단기적인 감정 표현을 통해 갈등을 즉각적으로 해소하는 요령",
      "과거 역사적 기록에만 의존하여 모든 결정을 내리는 보수적 태도",
      "타인의 감정적 평가에 전적으로 맞추어 자신의 행동을 바꾸는 방식",
      "기술 혁신이 개인의 의사결정 속도에 미치는 부정적인 영향",
    ];
    q1Expl = "본문은 일상 속 감정적 선택을 넘어, 객관적인 관찰과 기존 지식을 논리적으로 종합하여 최선의 해결책을 도출하는 문제 해결의 본질을 다루고 있습니다.";
  } else if (
    tKo.includes("남녀") ||
    tKo.includes("말한다") ||
    tEn.includes("differently") ||
    tEn.includes("miscommunicate") ||
    tKo.includes("의사소통")
  ) {
    q1Correct = "남성과 여성의 대화 방식 차이 이해와 원활한 소통을 위한 상호 존중";
    q1Distractors = [
      "부모와 자녀 간의 갈등을 완전히 방지할 수 있는 제도적 규칙",
      "언어 발달 과정에서 유전적 요인이 미치는 절대적인 영향력",
      "성별에 따른 직업 선택의 통계적 차이와 사회적 불평등",
      "대화 기술 향상을 위한 언어학적 발음 교정 훈련법",
    ];
    q1Expl = "남성과 여성의 언어 소통 방식의 차이를 인정하고 서로의 방식을 존중할 때 더 원활한 의사소통이 가능함을 강조하고 있습니다.";
  } else if (
    tKo.includes("공기") ||
    tKo.includes("환경") ||
    tKo.includes("자연") ||
    tKo.includes("생태") ||
    tEn.includes("air") ||
    tEn.includes("environment") ||
    tEn.includes("nature")
  ) {
    q1Correct = "환경 오염 방지 및 자연 생태계의 섬세한 균형을 보존하기 위한 노력";
    q1Distractors = [
      "화학 물질 대량 생산을 통한 단기 경제 성장 극대화",
      "인간의 편의를 위한 자연 생태계 인공 개조의 당위성",
      "기술 발전으로 인한 환경 문제의 자연적 자동 해결 가능성",
      "천연자원 고갈에 대비한 인공 대체재 개발 현황",
    ];
    q1Expl = "환경 오염의 심각성을 알리고, 자연 생태계의 균형을 지키기 위한 지속적인 관심과 노력을 강조하는 글입니다.";
  } else if (
    tKo.includes("음악") ||
    tKo.includes("예술") ||
    tKo.includes("리듬") ||
    tKo.includes("문화") ||
    tEn.includes("music") ||
    tEn.includes("art") ||
    tEn.includes("rhythm")
  ) {
    q1Correct = "문화적 배경과 악보 너머에 담긴 예술 및 음악의 본질적 표현력";
    q1Distractors = [
      "대중음악 상업화가 전통 예술 시장을 파괴하는 경제적 구조",
      "음악 이론의 복잡한 수학적 규칙과 기술적 연주 공식",
      "외래 문화 유입을 전면 차단하여 전통을 보존하는 정책",
      "전문 연주자가 되기 위한 단계별 악기 연습 요령",
    ];
    q1Expl = "음악과 예술이 단순한 기술적 기교가 아닌, 문화적 맥락과 인간의 내면을 표현하는 매개체임을 설명하고 있습니다.";
  } else if (
    tKo.includes("10대") ||
    tKo.includes("십대") ||
    tKo.includes("청소년") ||
    tEn.includes("teen") ||
    tEn.includes("teenage")
  ) {
    q1Correct = "청소년기 십 대들이 겪는 심리적 변화와 성장의 갈등 이해";
    q1Distractors = [
      "어린 시절의 무조건적인 복종을 성인이 될 때까지 유지하는 방법",
      "청소년기 독립심 요구를 억제하고 부모의 통제를 강화하는 원칙",
      "신체적 성장 속도와 학업 성취도 간의 통계적 비례 관계",
      "학교 폭력 예방을 위한 교내 규율 강화 방안",
    ];
    q1Expl = "십 대 시기에 마주하는 신체적·심리적 변화와 그에 따른 혼란 및 극복 과정을 조명한 글입니다.";
  } else if (
    tKo.includes("법") ||
    tKo.includes("양심") ||
    tEn.includes("law") ||
    tEn.includes("conscience")
  ) {
    q1Correct = "사회 질서를 유지하는 외적 법률과 내면적 양심의 상호작용";
    q1Distractors = [
      "모든 도덕적 판단을 국가 형법 조항으로만 대체하려는 시도",
      "개인의 자유를 제한하는 모든 법률 제도의 무조건적 폐지",
      "과거 전제 군주제 법률 체계의 우수성과 현대 사회 복원",
      "법률 조항의 형식적 문구 암기를 통한 준법정신 함양",
    ];
    q1Expl = "외적인 법률 규범과 인간 내면의 양심이 지닌 사회적 기능과 철학적 의미를 성찰하는 글입니다.";
  } else if (
    tKo.includes("두뇌") ||
    tKo.includes("생각") ||
    tEn.includes("brain") ||
    tEn.includes("mind")
  ) {
    q1Correct = "수동적 사고 습관을 경계하고 능동적인 비판적 사고력을 길러야 하는 이유";
    q1Distractors = [
      "비판 없이 정보를 그대로 수용할 때 기억력이 향상되는 원리",
      "두뇌 훈련을 전면 중단하고 본능에만 따라 행동하는 생활 방식",
      "선천적 지능이 모든 학습 성과를 결정한다는 결정론적 관점",
      "수면 시간 단축이 두뇌 회전 속도에 미치는 긍정적 효과",
    ];
    q1Expl = "편안함에 안주하려는 두뇌의 수동적 습성을 극복하고 주도적으로 생각하는 비판적 사고의 가치를 논하고 있습니다.";
  } else if (
    tKo.includes("정보") ||
    tKo.includes("기술") ||
    tKo.includes("인터넷") ||
    tEn.includes("technology") ||
    tEn.includes("internet")
  ) {
    q1Correct = "정보 통신 기술과 과학 발전이 현대 사회 구조와 일상에 미치는 영향";
    q1Distractors = [
      "모든 디지털 통신 기기의 사용을 전면 금지하는 아날로그 회귀",
      "산업 경제 시대의 천연자원 중심 무역 정책으로의 역행",
      "정보화 기술이 사회적 소통을 완전히 단절시킨다는 일방적 주장",
      "기술 개발 투자 예산을 전액 삭감해야 한다는 경제학적 견해",
    ];
    q1Expl = "현대 과학 기술과 정보화가 가져온 패러다임의 변화와 그로 인한 사회적 과제를 다루고 있습니다.";
  } else if (
    tKo.includes("행복") ||
    tKo.includes("시기심") ||
    tKo.includes("감정") ||
    tEn.includes("happiness") ||
    tEn.includes("envy") ||
    tEn.includes("feeling")
  ) {
    q1Correct = "부정적 감정의 원인을 성찰하고 내면의 평온과 참된 행복을 찾는 태도";
    q1Distractors = [
      "타인에 대한 질투와 경쟁심을 유일한 삶의 원동력으로 삼는 자세",
      "모든 감정적 고통을 회피하기 위해 대인관계를 완전히 단절하는 것",
      "물질적 부의 축적만이 인간의 불행을 해결하는 유일한 길이라는 주장",
      "감정을 억누르고 타인의 시선에만 맞추어 생활하는 태도",
    ];
    q1Expl = "인간의 보편적인 감정과 심리적 갈등을 깊이 있게 통찰하며 건강한 내면을 가꾸는 방법을 제시합니다.";
  } else if (
    tKo.includes("언어") ||
    tKo.includes("외국인") ||
    tKo.includes("한국어") ||
    tEn.includes("language") ||
    tEn.includes("korean")
  ) {
    q1Correct = "글로벌 문화 교류와 상호 이해를 증진하는 언어 학습의 가치";
    q1Distractors = [
      "단일 언어만을 전 세계 표준어로 강제 통일하려는 언어 정책",
      "외국어 교육을 전면 폐지하고 자국어만을 고수하는 폐쇄적 태도",
      "문화적 맥락을 무시한 단순 기계식 암기 교육의 절대적 우월성",
      "특정 문화권의 언어 우월성을 입증하기 위한 비교 분석",
    ];
    q1Expl = "문화 교류와 세계화 속에서 언어를 배우고 소통하는 것의 의미와 긍정적 효과를 설명합니다.";
  } else if (
    tKo.includes("말") ||
    tKo.includes("습관") ||
    tKo.includes("편지") ||
    tEn.includes("words") ||
    tEn.includes("habit")
  ) {
    q1Correct = "말의 무게를 인식하고 타인을 배려하며 경청하는 올바른 소통 습관";
    q1Distractors = [
      "자신의 의견을 관철시키기 위해 상대방의 말을 끊는 적극적 화법",
      "한 번 내뱉은 말이라도 쉽게 번복할 수 있다는 무책임한 언어관",
      "문자 메시지만을 사용하여 직접 대화를 일절 회피하는 현대적 방식",
      "침묵을 깨고 항상 먼저 대화를 주도해야 한다는 강박적 관점",
    ];
    q1Expl = "신중하고 배려 깊은 언어 사용과 경청의 태도가 원만한 인간관계를 형성하는 핵심임을 강조하고 있습니다.";
  } else {
    // Dynamic fallback based on passage sentences
    const cleanSentences = (koPassage || "")
      .replace(/\([A-Za-z0-9]\)/g, "")
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 15 && s.length <= 60);

    const firstPoint = cleanSentences[0] || "지문에서 강조하는 핵심 주제와 삶의 교훈";
    q1Correct = `${firstPoint.replace(/[.?!]$/, "")}의 중요성 및 실천적 의미`;
    q1Distractors = [
      "단기적인 경제적 이익만을 극대화하기 위한 편법적 전략",
      "과거의 고정관념에만 얽매여 새로운 변화를 거부하는 보수적 태도",
      "타인의 감정적 평가에 무비판적으로 순응하는 의존적 생활 방식",
      "이론적 지식만을 맹신하고 현실의 구체적 맥락을 무시하는 태도",
    ];
    q1Expl = `본문 전체는 "${firstPoint}"을(를) 바탕으로 올바른 이해와 바람직한 태도를 강조하고 있습니다.`;
  }

  // Shuffle Q1 options deterministically across 1~4
  const q1Pool = [q1Correct, ...q1Distractors.slice(0, 3)];
  const q1Shuffled = shuffleWithSeed(q1Pool, `${seed}-q1`);
  const q1AnswerIndex = q1Shuffled.indexOf(q1Correct);

  // ---------------------------------------------------------------------------
  // Question 2: Detail / Fact Check (세부 사실 일치 - 지문 본문 문장 추출 & 보기 셔플)
  // ---------------------------------------------------------------------------
  let q2Correct = "";
  let q2Distractors: string[] = [];
  let q2Expl = "";

  // Extract candidate true sentences from koPassage
  const koSentences = (koPassage || "")
    .replace(/\([A-Za-z0-9]\)/g, "")
    .replace(/\[[A-Za-z0-9]\]/g, "")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 20 && s.length <= 75 && !s.includes("?"));

  if (
    tKo.includes("문제 해결") ||
    tKo.includes("결정") ||
    tEn.includes("problem solving")
  ) {
    q2Correct = "진정한 문제 해결을 위해서는 단순한 느낌을 넘어 객관적 지식과 새로운 관찰을 연결해야 한다.";
    q2Distractors = [
      "일상의 모든 결정은 항상 자신의 순간적인 감정에만 전적으로 의존해야 한다.",
      "쇼핑몰에 갈 때 거리나 신호등의 수는 경로 선택에 아무런 영향을 주지 않는다.",
      "한 번 발생한 문제는 어떠한 객관적 지식으로도 해결하거나 평가할 수 없다.",
      "타인의 시선이나 감정은 개인의 일상적 문제 선택에 전혀 작용하지 않는다.",
    ];
    q2Expl = "지문 본문에서 '문제를 해결하기 위해서는 여러분이 어떻게 느끼는가 하는 것을 뛰어넘어야 하고 새로운 관찰로 이미 인지하고 있는 정보를 연결시켜야 한다'고 명시되었습니다.";
  } else if (koSentences.length >= 2) {
    // Pick the most informative sentence
    const targetSent = koSentences[Math.min(1, koSentences.length - 1)].replace(/[.?!]$/, "");
    q2Correct = `${targetSent}.`;
    q2Distractors = [
      "발생하는 모든 문제는 영구적이며 어떠한 방법으로도 개선할 수 없다.",
      "지문에서는 외부 환경의 변화가 대상의 상태에 전혀 영향을 주지 않는다고 강조한다.",
      "전문가들은 어떠한 상황에서도 기존의 고정관념만을 고수하는 것이 최선이라고 권고한다.",
      "지문에 따르면 대상 간의 차이점을 무시할 때 가장 최선의 결과를 얻을 수 있다.",
      "지문에서는 새로운 관찰이나 추가 지식의 습득이 올바른 결정을 방해한다고 말한다.",
    ];
    q2Expl = `지문에서 "${q2Correct}"라고 명시적으로 설명하고 있으므로 내용과 일치하는 정답입니다.`;
  } else {
    q2Correct = "지문에서 설명된 원리와 사실을 올바르게 이해하고 적용할 때 긍정적인 결과를 얻을 수 있다.";
    q2Distractors = [
      "발생하는 모든 문제는 영구적이며 어떠한 방법으로도 개선할 수 없다.",
      "외부 환경의 변화는 대상들의 소통이나 상태에 아무런 영향을 주지 않는다.",
      "전문가들은 기존의 방식만을 고수하는 것이 유일한 해법이라고 주장한다.",
      "모든 개인은 타인의 조언을 일절 거부하고 독단적으로 행동해야 성공한다.",
    ];
    q2Expl = "본문에서 제시된 핵심 원리와 구체적 사실에 부합하는 올바른 설명입니다.";
  }

  // Shuffle Q2 options deterministically across 1~4
  const q2Pool = [q2Correct, ...q2Distractors.slice(0, 3)];
  const q2Shuffled = shuffleWithSeed(q2Pool, `${seed}-q2`);
  const q2AnswerIndex = q2Shuffled.indexOf(q2Correct);

  return [
    {
      id: 1,
      type: "main_idea",
      question: "Q1. 위 지문의 핵심 주제(Main Idea)로 가장 적절한 것은?",
      options: q1Shuffled,
      answerIndex: q1AnswerIndex,
      explanation: q1Expl,
    },
    {
      id: 2,
      type: "detail",
      question: "Q2. 지문의 내용과 일치하는(True) 것을 고르세요.",
      options: q2Shuffled,
      answerIndex: q2AnswerIndex,
      explanation: q2Expl,
    },
  ];
}

export interface ClozeItem {
  id: number;
  originalSentence: string;
  maskedSentence: string;
  missingWord: string;
  options: string[];
  answerIndex: number;
}

export function generateClozeItems(sentences: { en: string; ko: string }[]): ClozeItem[] {
  const result: ClozeItem[] = [];
  const candidates = sentences.filter((s) => s.en.split(/\s+/).length >= 6);

  candidates.slice(0, 3).forEach((s, idx) => {
    const words = s.en.replace(/[.,!?]/g, "").split(/\s+/);
    const validTargetWords = words.filter((w) => w.length >= 5 && !STOP_WORDS.has(w.toLowerCase()));

    if (validTargetWords.length > 0) {
      const target = validTargetWords[Math.floor(validTargetWords.length / 2)];
      const regex = new RegExp(`\\b${target}\\b`, "i");
      const masked = s.en.replace(regex, "_______");

      const distractors = ["communication", "respect", "problems", "successful", "efforts", "quality"]
        .filter((w) => w.toLowerCase() !== target.toLowerCase())
        .slice(0, 3);

      const allOptions = [target, ...distractors].sort(() => 0.5 - Math.random());
      const answerIndex = allOptions.indexOf(target);

      result.push({
        id: idx + 1,
        originalSentence: s.en,
        maskedSentence: masked,
        missingWord: target,
        options: allOptions,
        answerIndex,
      });
    }
  });

  return result;
}
