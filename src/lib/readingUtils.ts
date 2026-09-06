/**
 * Pedagogical utilities for Reading Comprehension Courseware.
 * Powers WPM calculations, Vocabulary Extraction, Syntax Chunking, and Interactive Quizzes.
 */

// Comprehensive vocabulary database for reading course passages
const VOCAB_DATABASE: Record<string, { meaning: string; pos: string }> = {
  counsel: { meaning: "조언, 상담, 권고", pos: "n." },
  miscommunicate: { meaning: "의사소통이 잘못되다, 오해하다", pos: "v." },
  respect: { meaning: "존중하다, 존경하다", pos: "v." },
  successful: { meaning: "성공적인, 결실 있는", pos: "adj." },
  differently: { meaning: "다르게, 별개로", pos: "adv." },
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
  experience: { meaning: "경험, 체험", pos: "n." },
  influence: { meaning: "영향을 미치다, 영향력", pos: "v." },
  education: { meaning: "교육", pos: "n." },
  educational: { meaning: "교육적인", pos: "adj." },
  individual: { meaning: "개인, 개별의", pos: "n." },
  community: { meaning: "지역사회, 공동체", pos: "n." },
  behavior: { meaning: "행동, 품행", pos: "n." },
  attitude: { meaning: "태도, 자세", pos: "n." },
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
  disadvantage: { meaning: "불리한 점, 단점", pos: "n." }
};

const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "at", "by", "for", "with", "about", "against", "between",
  "into", "through", "during", "before", "after", "above", "below", "from", "up",
  "down", "in", "out", "over", "under", "again", "further", "then", "once", "here",
  "there", "when", "where", "why", "how", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own",
  "same", "so", "than", "too", "very", "can", "will", "just", "don", "should",
  "now", "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
  "them", "my", "your", "his", "its", "our", "their", "this", "that", "these",
  "those", "am", "has", "have", "had", "do", "does", "did", "though"
]);

export interface KeyWord {
  word: string;
  pos: string;
  meaning: string;
}

export function extractPassageKeywords(enPassage: string, limit = 6): KeyWord[] {
  if (!enPassage) return [];
  const words = enPassage
    .toLowerCase()
    .replace(/[^a-z\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOP_WORDS.has(w));

  const unique = Array.from(new Set(words));
  const matched: KeyWord[] = [];
  const unmatched: string[] = [];

  for (const w of unique) {
    if (VOCAB_DATABASE[w]) {
      matched.push({
        word: w,
        pos: VOCAB_DATABASE[w].pos,
        meaning: VOCAB_DATABASE[w].meaning,
      });
    } else {
      unmatched.push(w);
    }
  }

  const result = [...matched];
  for (const w of unmatched) {
    if (result.length >= limit) break;
    result.push({
      word: w,
      pos: "n./v.",
      meaning: "지문 핵심 어휘",
    });
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
  const questions: ReadingQuestion[] = [];

  // Question 1: Main Idea
  questions.push({
    id: 1,
    type: "main_idea",
    question: "Q1. 위 지문의 핵심 주제(Main Idea)로 가장 적절한 것은?",
    options: [
      "지문에서 다루는 중심 대상 간의 상호작용 및 핵심 원리",
      "단기적인 문제 해결을 위한 기술적 접근법의 한계",
      "과거 역사적 배경과 현대 제도의 단순한 비교 분석",
      "개인의 감정 변화가 사회 전반에 미치는 부정적 영향",
    ],
    answerIndex: 0,
    explanation:
      "본문 전체는 대상 간의 차이점을 이해하고 올바르게 대처 및 존중하는 것의 중요성을 강조하고 있습니다.",
  });

  // Question 2: Detail / Fact Check
  questions.push({
    id: 2,
    type: "detail",
    question: "Q2. 지문의 내용과 일치하는(True) 것을 고르세요.",
    options: [
      "서로의 차이점을 존중하고 이해할 때 더 성공적인 소통과 결과를 얻을 수 있다.",
      "발생하는 모든 문제는 영구적이며 어떠한 방법으로도 개선할 수 없다.",
      "외부 환경의 변화는 대상들의 소통이나 상태에 아무런 영향을 주지 않는다.",
      "전문가들은 기존의 방식만을 고수하는 것이 유일한 해법이라고 주장한다.",
    ],
    answerIndex: 0,
    explanation:
      "지문 후반부에서 서로의 고유한 방식을 존중하고 지속적인 노력을 기울일 때 긍정적인 결과를 얻을 수 있다고 언급되었습니다.",
  });

  return questions;
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
