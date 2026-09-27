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
 *
 * 2026-09-27 VOCA 학습법 · 화면 고침 (voca-verified.md · 계획.md E02–E04 · D20–D22): a Step 2 ROUND (every word once, a new order,
 * the direction flipped every round, about a third asked by sound, a miss asked again at the end with new options — at most
 * twice), the Step 4 score rule (a wrong press costs points), the Step 3 spelling check, and Leitner cards with a '새 단어' box 0,
 * a streak that grows once a day and an old record read by one rule. Checked over all 195 lessons by
 * docs/qa-2026-09-18/scripts/check-voca-learning.cjs (with --break cases that must fail).
 *
 * KEEP THIS FILE FREE OF IMPORTS: check-voca-distractors.cjs and check-voca-quiz-notes.cjs run it with Node's own `require`, and
 * the "@/…" alias would not resolve there. A caller that needs the learning day passes it in (updateLeitnerCard).
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
  /**
   * 2026-09-27 (VOCA-L08 · D20): "listen" — an English → Korean item whose word is HEARD, not read (the same clip as the word's
   * button). It stays questionType "en-to-ko" — the options are meanings — so every check that reads that type still applies.
   * Absent = shown as text.
   */
  prompt?: "text" | "listen";
  /** 2026-09-27: the word's 1-based place in the lesson grid, read row by row (the engine key `<lesson id>#<order>`) */
  order?: number;
  /** 2026-09-27 (VOCA-L03): how many times this word was asked again in the round after a miss (absent = first ask) */
  retry?: number;
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
  /** 2026-09-27: the word's 1-based place in the lesson grid (the engine key) */
  order?: number;
}

/** 0 새 단어 (never answered) · 1 틀림 · 2 익숙 (right since the last miss) · 3 외움 (right on MASTERY_STREAK different days) */
export type LeitnerBox = 0 | 1 | 2 | 3;

export interface LeitnerCard {
  word: string;
  meaning: string;
  box: LeitnerBox;
  /** the last graded answer (ms); 0 = never answered */
  lastTestedAt: number;
  streak: number;
  /** 2026-09-27 (VOCA-L02 CHECK ④ · L04): the learning day the streak last grew — it grows once a day, so one sitting cannot master a word */
  streakDay?: string | null;
  /** 2026-09-27 (VOCA-L05 · D21): '안다고 표시' — a mark the learner sets; it moves no box and Step 2 still asks the word */
  known?: boolean;
  /** 2 = written by this version. A card without it is from before 2026-09-27 and is read by readLeitnerCards' rule */
  v?: 2;
}

/**
 * Consecutive right answers — on different learning days since 2026-09-27 — that move a card to Box 3 (외움). Nothing else
 * does: the old '마스터 체크' button that set Box 3 at once (KIG-033) and the Step 3 '다음 Box로 승급' went with D21 나.
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
  { prefix: "precaution", meaning: "pre(미리) + caution(조심) ➔ 사전에 주의함, 예방 조치" },
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
  { prefix: "antique", meaning: "ante/anti(이전의) + ique ➔ 옛날부터 전해 내려온 진귀한 물건, 골동품" },
  { prefix: "replace", meaning: "re(다시/제자리로) + place(놓다) ➔ 낡은 것을 다시 놓다, 대신하다/교체하다" },
  { prefix: "revive", meaning: "re(다시) + vive(살다) ➔ 다시 살아나게 하다, 부활시키다" },
  { prefix: "reproduce", meaning: "re(다시) + produce(생산하다) ➔ 다시 만들어내다, 복제하다/번식하다" },
  { prefix: "remove", meaning: "re(뒤로/멀리) + move(옮기다) ➔ 멀리 옮겨 치우다, 제거하다" },
  { prefix: "subway", meaning: "sub(아래의) + way(길) ➔ 땅 아래로 다니는 철도, 지하철" },
  { prefix: "submarine", meaning: "sub(아래의) + marine(바다의) ➔ 바다 밑을 다니는 배, 잠수함" },
  { prefix: "subtitle", meaning: "sub(아래의) + title(제목) ➔ 화면 아래에 나오는 글자, 자막" },
  { prefix: "substitute", meaning: "sub(대신하여) + stitute(세우다) ➔ 원래 것 대신 아래에 세우다, 대체하다" },
  { prefix: "transport", meaning: "trans(가로질러) + port(나르다) ➔ 국경이나 먼 거리를 가로질러 나르다, 수송하다" },
  { prefix: "translate", meaning: "trans(건너서) + late(옮겨진) ➔ 한 언어에서 다른 언어로 건너 옮기다, 번역하다" },
  { prefix: "transform", meaning: "trans(바꾸어) + form(모양) ➔ 형태를 완전히 바꾸다, 변형하다" },
  { prefix: "transfer", meaning: "trans(건너서) + fer(나르다) ➔ 다른 장소/부서로 옮기다, 환승하다/전근 가다" },
  { prefix: "export", meaning: "ex(밖으로) + port(나르다) ➔ 밖으로 실어 내보내다, 수출하다" },
  { prefix: "import", meaning: "im/in(안으로) + port(나르다) ➔ 안으로 실어 들여오다, 수입하다" },
  { prefix: "inspect", meaning: "in(안을) + spect(들여다보다) ➔ 문제없는지 안쪽을 자세히 보다, 검사하다" },
  { prefix: "expect", meaning: "ex(밖을 향해) + spect(바라보다) ➔ 앞으로 일어날 일을 기대하며 바라보다, 예상하다" },
  { prefix: "respect", meaning: "re(다시) + spect(돌아보다) ➔ 훌륭한 사람을 다시 돌아보다, 존경하다" },
  { prefix: "suspect", meaning: "sub/sus(아래를) + spect(의심스레 보다) ➔ 혐의가 있는지 의심하다, 용의자" },
  { prefix: "interact", meaning: "inter(상호간에) + act(행동하다) ➔ 서로 영향을 주고받다, 상호작용하다" },
  { prefix: "international", meaning: "inter(국가들 사이에) + national(국가의) ➔ 여러 나라 사이의, 국제적인" },
  { prefix: "interview", meaning: "inter(서로) + view(얼굴을 보다) ➔ 서로 마주 보고 의견을 묻다, 면접/인터뷰" },
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

/**
 * A gloss is a list of senses: "확고한; 회사" is two, "거의" is one. Bracketed
 * text is an annotation on the sense next to it ("아마 (십중팔구)"), not a sense
 * of its own, so it is dropped before splitting.
 */
function senseSegments(meaning: string): string[] {
  return String(meaning || "")
    .replace(/\([^)]*\)|（[^）]*）|\[[^\]]*\]/g, " ")
    .split(/[;,/·]|\s+또는\s+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/**
 * True when two words of a lesson teach a sense in common, so neither can be
 * the "wrong" one in a graded item. The rule used to compare the whole gloss
 * string, which never once fired across the 195 lessons: `firm 확고한; 회사`
 * and `company 회사` are different strings, so the quiz was free to offer
 * `firm` as a wrong answer to "[ 회사 ] 에 해당하는 올바른 영단어를 고르세요."
 * Comparing sense by sense catches 27 such pairs (hard/difficult, almost/nearly,
 * gaze/stare, company/firm …) and leaves every item with at least three
 * distractors to choose from.
 */
function sharesSense(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const first = new Set(senseSegments(a));
  return senseSegments(b).some((s) => first.has(s));
}

/**
 * Words a lesson teaches side by side as synonyms whose glosses share no
 * segment: `ancestor 조상` and `forefather 선조` are one word in Korean too, but
 * not one string, so `sharesSense` cannot see it. hv-01 lists both, and asks
 * "ancestor" with 선조 among the wrong answers. Kept as an explicit list rather
 * than a Korean thesaurus; each group names the lesson that needed it.
 */
const SYNONYM_GROUPS: string[][] = [
  ["ancestor", "forefather"], // hv-01
  ["anticipate", "predict", "foresee"], // hv-01
  ["precious", "priceless"], // hv-53 — "[ 소중한 ]" cannot fairly count priceless as wrong
];

/**
 * The two pronunciation notes some glosses carry — `tear 찢다; 눈물 (뜻에 따라 발음이 다름)`,
 * `present … 발표하다 (동사는 뒤 강세)` — are for the study card, where they warn that the one
 * clip matches one sense only. On a quiz or speed-drill screen they would point at the answer:
 * about 30 of the 3,904 glosses carry one, so the option with a note is nearly always the right
 * one. Those screens show the gloss without them; the card keeps them.
 */
const PRONUNCIATION_NOTES = [" (뜻에 따라 발음이 다름)", " (동사는 뒤 강세)"];
function quizMeaning(meaning: string): string {
  let m = meaning;
  for (const note of PRONUNCIATION_NOTES) m = m.split(note).join("");
  return m;
}

/**
 * 2026-09-27 (VOCA-L13 CHECK): two glosses that differ only by a part-of-speech ending — '고대의' (ancient) and '고대'
 * (antiquity), '예측하다' / '예측', '생산적인' / '생산' — name the same idea, so one cannot be the other's wrong answer.
 * `sharesSense` compares whole segments and does not see it. Compared segment by segment, like sharesSense.
 */
const STEM_ENDINGS = ["의", "하다", "적인"];
function stemPair(a: string, b: string): boolean {
  if (!a || !b) return false;
  const first = senseSegments(a);
  const second = senseSegments(b);
  return first.some((x) => second.some((y) => STEM_ENDINGS.some((e) => x === y + e || y === x + e)));
}

/** Whether two words of one lesson can stand as each other's wrong answer. */
function conflicts(
  wordA: string,
  wordB: string,
  vocaDict: Record<string, { meaning: string }>,
): boolean {
  const a = wordA.toLowerCase().trim();
  const b = wordB.toLowerCase().trim();
  if (a === b) return true;
  if (sharesSense(vocaDict[a]?.meaning || "", vocaDict[b]?.meaning || "")) return true;
  if (stemPair(vocaDict[a]?.meaning || "", vocaDict[b]?.meaning || "")) return true;
  return SYNONYM_GROUPS.some((group) => group.includes(a) && group.includes(b));
}

/**
 * 2026-09-27 (VOCA-L08 CHECK · D20 나): common English homophones (American English). A word in any of these groups is never
 * asked by sound alone — hearing /seɪl/ could be `sail` or `sale` (mv2-19 holds both), and hearing /noʊ/ (`know`) with '아니다'
 * (`not`) among the options has two fair answers. Near-homophones a Korean learner hears as one (accept / except, hv-21) are in.
 * It only decides which words may be LISTEN items; it takes nothing away from any other question.
 */
const HOMOPHONE_GROUPS: string[][] = [
  ["accept", "except"], ["ad", "add"], ["affect", "effect"], ["aid", "aide"], ["air", "heir"], ["aisle", "isle", "i'll"],
  ["allowed", "aloud"], ["altar", "alter"], ["ant", "aunt"], ["ascent", "assent"], ["ate", "eight"], ["bail", "bale"],
  ["ball", "bawl"], ["band", "banned"], ["bare", "bear"], ["base", "bass"], ["be", "bee"], ["beach", "beech"], ["beat", "beet"],
  ["bell", "belle"], ["berry", "bury"], ["berth", "birth"], ["billed", "build"], ["blew", "blue"], ["board", "bored"],
  ["boarder", "border"], ["bough", "bow"], ["boy", "buoy"], ["brake", "break"], ["bread", "bred"], ["but", "butt"],
  ["buy", "by", "bye"], ["cache", "cash"], ["capital", "capitol"], ["carat", "carrot"], ["cause", "caws"], ["ceiling", "sealing"],
  ["cell", "sell"], ["cellar", "seller"], ["cent", "scent", "sent"], ["cereal", "serial"], ["cheap", "cheep"], ["chews", "choose"],
  ["chord", "cord"], ["chute", "shoot"], ["cite", "sight", "site"], ["close", "clothes"], ["coarse", "course"],
  ["complement", "compliment"], ["council", "counsel"], ["creak", "creek"], ["crews", "cruise"], ["cymbal", "symbol"],
  ["dear", "deer"], ["dew", "do", "due"], ["die", "dye"], ["doe", "dough"], ["dual", "duel"], ["earn", "urn"], ["eye", "i"],
  ["faint", "feint"], ["fair", "fare"], ["fairy", "ferry"], ["feat", "feet"], ["find", "fined"], ["fir", "fur"], ["flair", "flare"],
  ["flea", "flee"], ["flew", "flu"], ["flour", "flower"], ["for", "four", "fore"], ["forth", "fourth"], ["foul", "fowl"],
  ["gait", "gate"], ["genes", "jeans"], ["grate", "great"], ["groan", "grown"], ["guessed", "guest"], ["guise", "guys"],
  ["hail", "hale"], ["hair", "hare"], ["hall", "haul"], ["hay", "hey"], ["heal", "heel", "he'll"], ["hear", "here"],
  ["heard", "herd"], ["hi", "high"], ["higher", "hire"], ["him", "hymn"], ["hoarse", "horse"], ["hole", "whole"],
  ["holy", "wholly"], ["hostel", "hostile"], ["hour", "our"], ["idle", "idol"], ["in", "inn"], ["its", "it's"],
  ["knead", "need"], ["knew", "new"], ["knight", "night"], ["knot", "not"], ["know", "no"], ["knows", "nose"], ["lead", "led"],
  ["leak", "leek"], ["least", "leased"], ["lessen", "lesson"], ["lie", "lye"], ["loan", "lone"], ["made", "maid"],
  ["mail", "male"], ["main", "mane"], ["manner", "manor"], ["marshal", "martial"], ["meat", "meet"], ["medal", "meddle"],
  ["might", "mite"], ["mind", "mined"], ["miner", "minor"], ["missed", "mist"], ["morning", "mourning"], ["muscle", "mussel"],
  ["naval", "navel"], ["none", "nun"], ["oar", "or", "ore"], ["one", "won"], ["pail", "pale"], ["pain", "pane"],
  ["pair", "pare", "pear"], ["passed", "past"], ["patience", "patients"], ["pause", "paws"], ["peace", "piece"],
  ["peak", "peek"], ["peal", "peel"], ["peer", "pier"], ["place", "plaice"], ["plain", "plane"], ["please", "pleas"],
  ["plum", "plumb"], ["pole", "poll"], ["poor", "pour", "pore"], ["pray", "prey"], ["presence", "presents"], ["pride", "pried"],
  ["principal", "principle"], ["profit", "prophet"], ["rain", "reign", "rein"], ["raise", "rays"], ["rap", "wrap"],
  ["read", "reed"], ["real", "reel"], ["red", "read"], ["rest", "wrest"], ["right", "rite", "write"], ["ring", "wring"],
  ["road", "rode", "rowed"], ["role", "roll"], ["root", "route"], ["rose", "rows"], ["rough", "ruff"], ["sail", "sale"],
  ["scene", "seen"], ["sea", "see"], ["seam", "seem"], ["sew", "so", "sow"], ["shear", "sheer"], ["shone", "shown"],
  ["side", "sighed"], ["sighs", "size"], ["soar", "sore"], ["sole", "soul"], ["some", "sum"], ["son", "sun"], ["soared", "sword"],
  ["stair", "stare"], ["stake", "steak"], ["stationary", "stationery"], ["steal", "steel"], ["straight", "strait"],
  ["suite", "sweet"], ["tacks", "tax"], ["tail", "tale"], ["tea", "tee"], ["team", "teem"], ["tear", "tier"], ["tense", "tents"],
  ["tern", "turn"], ["their", "there", "they're"], ["threw", "through"], ["throne", "thrown"], ["thyme", "time"],
  ["tide", "tied"], ["to", "too", "two"], ["toe", "tow"], ["vain", "vane", "vein"], ["vary", "very"], ["waist", "waste"],
  ["wait", "weight"], ["war", "wore"], ["ware", "wear", "where"], ["way", "weigh"], ["weak", "week"], ["weather", "whether"],
  ["wheel", "we'll"], ["which", "witch"], ["whine", "wine"], ["whirled", "world"], ["wood", "would"], ["yoke", "yolk"],
  ["you", "ewe"], ["your", "you're"],
  // also in src/lib/speechSingleWord.ts HOMOPHONES (the speaking check's list, made separately)
  ["whose", "who's"], ["warn", "worn"], ["bore", "boar"], ["oh", "owe"], ["story", "storey"], ["sunday", "sundae"],
];
const HOMOPHONES = (() => {
  const map = new Map<string, Set<string>>();
  for (const group of HOMOPHONE_GROUPS) {
    for (const w of group) {
      const set = map.get(w) || new Set<string>();
      for (const other of group) if (other !== w) set.add(other);
      map.set(w, set);
    }
  }
  return map;
})();

/** The words that sound like `word` (lower case; empty when the table has none). */
export function homophonesOf(word: string): string[] {
  return [...(HOMOPHONES.get(String(word || "").toLowerCase().trim()) || [])];
}

/** Whether `word` may be asked by sound alone: never when it has a homophone (VOCA-L08 CHECK — sail / sale in mv2-19). */
export function canAskByListening(word: string): boolean {
  return homophonesOf(word).length === 0;
}

/** About this share of a round is asked by sound only (VOCA-L08 · D20 나). */
export const LISTEN_SHARE = 1 / 3;
/** A word missed in a round comes back at the end of that round at most this many times (VOCA-L03 · D20 나). */
export const MAX_REASKS = 2;

export type RecallDirection = "en-to-ko" | "ko-to-en";

export interface RecallRoundOptions {
  /**
   * 1-based round. A word asked English → Korean in one round is asked Korean → English in the next (VOCA-L02 CHECK ②): the
   * words at even places of the lesson start English → Korean in round 1 — the order the quiz always used — and every round
   * flips them all, so two rounds take every word both ways. Default 1.
   */
  round?: number;
  /** the share of the round asked by sound only (default LISTEN_SHARE; 0 turns it off) */
  listenShare?: number;
  /** the lesson grid's rows: from the second round on, wrong options come from the word's own row first (VOCA-L13 CHECK) */
  rows?: string[][];
}

const lc = (w: string) => String(w || "").toLowerCase().trim();

function shuffled<T>(list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Up to `count` wrong options: first those the previous version of the question did not show (so a question asked again is not
 * answered by where its options were — VOCA-L02), within that the word's row first (from round 2), each group in random order.
 */
function pickDistractors<T>(candidates: readonly T[], preferred: ReadonlySet<T>, avoid: ReadonlySet<T>, count: number): T[] {
  const groups: T[][] = [[], [], [], []];
  for (const c of [...new Set(candidates)]) groups[(avoid.has(c) ? 2 : 0) + (preferred.has(c) ? 0 : 1)].push(c);
  return groups.flatMap((g) => shuffled(g)).slice(0, count);
}

/** The options in random order — with the right answer somewhere else than `avoidIndex` (the last time this word was asked). */
function arrange(options: string[], answer: string, avoidIndex?: number | null): string[] {
  const out = shuffled(options);
  const at = out.indexOf(answer);
  if (avoidIndex !== undefined && avoidIndex !== null && out.length > 1 && at === avoidIndex) {
    const swap = (at + 1) % out.length;
    [out[at], out[swap]] = [out[swap], out[at]];
  }
  return out;
}

interface RecallEntry {
  word: string;
  order: number;
  /** its place among the lesson's words that have a meaning (0-based) — the direction rule counts on it */
  place: number;
}

function recallEntries(words: string[], vocaDict: Record<string, { meaning: string }>): RecallEntry[] {
  const out: RecallEntry[] = [];
  words.forEach((w, i) => {
    if (w && vocaDict[lc(w)]?.meaning) out.push({ word: w, order: i + 1, place: out.length });
  });
  return out;
}

function directionOf(place: number, round: number): RecallDirection {
  return (place + round - 1) % 2 === 0 ? "en-to-ko" : "ko-to-en";
}

function rowMatesOf(word: string, rows?: string[][]): Set<string> {
  const key = lc(word);
  const row = (rows || []).find((r) => r.some((w) => lc(w) === key));
  return new Set((row || []).map(lc).filter((w) => w && w !== key));
}

/**
 * One question. The rules of the wrong options are the ones the quiz always had (VOCA-L01 — never a word or a meaning that is
 * also right: `conflicts`, the synonym groups, the pronunciation notes taken off) for every kind of question, the heard one too.
 */
function buildRecallQuestion(
  entry: RecallEntry,
  validWords: string[],
  vocaDict: Record<string, { meaning: string }>,
  type: RecallDirection,
  prompt: "text" | "listen",
  opts: { rows?: string[][]; sameRowFirst: boolean; previous?: ActiveRecallQuestion | null; idTag: string },
): ActiveRecallQuestion {
  const { word } = entry;
  const clean = lc(word);
  const correctMeaning = quizMeaning(vocaDict[clean]?.meaning || "뜻");
  const mates = opts.sameRowFirst ? rowMatesOf(word, opts.rows) : new Set<string>();
  const avoid = new Set(opts.previous ? opts.previous.options : []);
  const etymologyHint = analyzeEtymology(word)?.explanation;

  if (type === "en-to-ko") {
    const pool = validWords.filter((w) => !conflicts(w, clean, vocaDict));
    const preferred = new Set(pool.filter((w) => mates.has(lc(w))).map((w) => quizMeaning(vocaDict[lc(w)]?.meaning || "")));
    const distractors = pickDistractors(
      pool.map((w) => quizMeaning(vocaDict[lc(w)]?.meaning || "")).filter((m) => m && m !== correctMeaning),
      preferred,
      avoid,
      3,
    );

    if (distractors.length < 3) {
      // The whole-dictionary fallback holds meanings, not words, so a synonym-group mate
      // (precious ~ priceless) is excluded by its meaning here — `conflicts` cannot see it.
      const allMeanings = Array.from(
        new Set(Object.values(vocaDict).map((v) => v.meaning).filter(Boolean).map(quizMeaning)),
      );
      const mateMeanings = new Set(
        SYNONYM_GROUPS.filter((g) => g.includes(clean))
          .flat()
          .filter((w) => w !== clean)
          .map((w) => vocaDict[w]?.meaning)
          .filter((m): m is string => Boolean(m))
          .map(quizMeaning),
      );
      const shuffledGlobal = shuffled(allMeanings);
      for (const m of shuffledGlobal) {
        if (distractors.length < 3 && !sharesSense(m, correctMeaning) && !stemPair(m, correctMeaning) && !mateMeanings.has(m) && !distractors.includes(m)) {
          distractors.push(m);
        }
      }
    }

    while (distractors.length < 3) {
      distractors.push(`단어 의미 ${distractors.length + 1}`);
    }

    const options = arrange([correctMeaning, ...distractors], correctMeaning, opts.previous?.correctIndex);
    return {
      id: `quiz-${prompt === "listen" ? "listen" : "en"}-${clean}-${entry.order}-${opts.idTag}`,
      word,
      correctMeaning,
      questionType: "en-to-ko",
      prompt,
      questionPrompt:
        prompt === "listen" ? "소리를 듣고 알맞은 뜻을 고르세요." : `"${word}" 의 가장 알맞은 한국어 뜻은 무엇일까요?`,
      options,
      correctIndex: options.indexOf(correctMeaning),
      etymologyHint,
      order: entry.order,
    };
  }

  // CNT-10: sampled at random rather than `slice(0, 3)`, which offered the
  // first three words of the list ("yes / day / school") on nearly every
  // Korean-to-English question of a lesson.
  const pool = validWords.filter((w) => {
    const other = lc(w);
    if (other === clean) return false;
    // KIG-019: a word that carries the same Korean meaning as the answer is
    // also correct, so it must never be offered as a wrong option.
    // e.g. hv-15 "운이 좋은" would otherwise list both `lucky` and `fortunate`.
    return !conflicts(other, clean, vocaDict);
  });
  const distractorWords = pickDistractors(pool, new Set(pool.filter((w) => mates.has(lc(w)))), avoid, 3);
  while (distractorWords.length < 3) {
    distractorWords.push(`vocab${distractorWords.length + 1}`);
  }
  const options = arrange([word, ...distractorWords], word, opts.previous?.correctIndex);
  return {
    id: `quiz-ko-${clean}-${entry.order}-${opts.idTag}`,
    word,
    correctMeaning,
    questionType: "ko-to-en",
    prompt: "text",
    questionPrompt: `[ ${correctMeaning} ] 에 해당하는 올바른 영단어를 고르세요.`,
    options,
    correctIndex: options.indexOf(word),
    etymologyHint,
    order: entry.order,
  };
}

/**
 * A Step 2 round (2026-09-27 — VOCA-L02 · L08 · L13 · E02 · D20 나): every word of the lesson once, in a new random order,
 * English → Korean or Korean → English by the round (see RecallRoundOptions.round), about a third of the round's English →
 * Korean items heard instead of read (never a word with a homophone), new wrong options each time it is called, and from the
 * second round the word's own row first. Called with two arguments (the audit checks do) it gives round 1.
 */
export function generateActiveRecallQuizzes(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
  options: RecallRoundOptions = {},
): ActiveRecallQuestion[] {
  const entries = recallEntries(words, vocaDict);
  if (entries.length === 0) return [];
  const validWords = entries.map((e) => e.word);
  const round = Math.max(1, Math.floor(options.round ?? 1));
  const share = Math.max(0, Math.min(1, options.listenShare ?? LISTEN_SHARE));

  const typed = entries.map((e) => ({ entry: e, type: directionOf(e.place, round) }));
  const target = Math.round(entries.length * share);
  const heard = new Set(
    shuffled(typed.filter((t) => t.type === "en-to-ko" && canAskByListening(t.entry.word)))
      .slice(0, target)
      .map((t) => t.entry.order),
  );

  const questions = typed.map(({ entry, type }) =>
    buildRecallQuestion(entry, validWords, vocaDict, type, heard.has(entry.order) ? "listen" : "text", {
      rows: options.rows,
      sameRowFirst: round >= 2,
      idTag: `r${round}`,
    }),
  );
  return shuffled(questions);
}

/**
 * The same word asked again (VOCA-L03 · D20 나): the same kind of question with new wrong options where the lesson has them and
 * the right answer in another place. `retry` counts the asks.
 */
export function rebuildRecallQuestion(
  question: ActiveRecallQuestion,
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
  options: RecallRoundOptions = {},
): ActiveRecallQuestion {
  const entries = recallEntries(words, vocaDict);
  const entry =
    entries.find((e) => e.order === question.order) ||
    entries.find((e) => lc(e.word) === lc(question.word)) || { word: question.word, order: question.order ?? 0, place: 0 };
  const retry = (question.retry ?? 0) + 1;
  const round = Math.max(1, Math.floor(options.round ?? 1));
  const rebuilt = buildRecallQuestion(entry, entries.map((e) => e.word), vocaDict, question.questionType, question.prompt ?? "text", {
    rows: options.rows,
    sameRowFirst: round >= 2,
    previous: question,
    idTag: `r${round}-again${retry}`,
  });
  return { ...rebuilt, retry };
}

/**
 * The round's queue after an answer: a miss is asked again at the end of the round — with new options — unless the word was
 * already asked again MAX_REASKS times (VOCA-L03 · D20 나 "단어당 2번까지").
 */
export function queueAfterAnswer(
  queue: ActiveRecallQuestion[],
  index: number,
  correct: boolean,
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
  options: RecallRoundOptions = {},
): ActiveRecallQuestion[] {
  const question = queue[index];
  if (!question || correct || (question.retry ?? 0) >= MAX_REASKS) return queue;
  return [...queue, rebuildRecallQuestion(question, words, vocaDict, options)];
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

/**
 * One pass of the 60-second drill: every word once, in random order, about 45% of them shown with another word's meaning.
 * 2026-09-27 (VOCA-L09 CHECK · E04): the game calls this again after every pass, so from the 31st press the order and the
 * mismatched pairs are new — a second pass used to repeat the first one exactly.
 */
export function generateSpeedDrillItems(
  words: string[],
  vocaDict: Record<string, { meaning: string }>,
): SpeedDrillItem[] {
  const validWords = words.filter((w) => Boolean(w && vocaDict[w.toLowerCase().trim()]?.meaning));
  if (validWords.length === 0) return [];
  const orderOf = new Map<string, number>();
  words.forEach((w, i) => {
    if (w && !orderOf.has(w)) orderOf.set(w, i + 1);
  });

  const items: SpeedDrillItem[] = [];

  for (let i = 0; i < validWords.length; i++) {
    const word = validWords[i];
    const clean = word.toLowerCase().trim();
    const actualMeaning = quizMeaning(vocaDict[clean]?.meaning || "뜻");

    let isMatch = Math.random() > 0.45;
    let displayedMeaning = actualMeaning;

    if (!isMatch) {
      // V-04 (same rule as KIG-019 in the quiz): a "does not match" item must show a
      // meaning that really is different. Another word of the lesson with the same
      // Korean meaning would put the correct meaning on screen and still expect
      // "불일치". With no different meaning left, the item is a match instead of
      // showing a made-up "다른 뜻".
      const otherMeanings = validWords
        .filter((w) => !conflicts(w, clean, vocaDict))
        .map((w) => quizMeaning(vocaDict[w.toLowerCase().trim()]?.meaning || ""))
        .filter(Boolean);
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
      order: orderOf.get(word),
    });
  }

  return shuffled(items);
}

/**
 * The drill's score rule (2026-09-27 — VOCA-L09 CHECK · D22 나 "틀리면 … 깎거나"): a right press earns 100 plus 10 for every
 * press of the current run of right ones; a wrong press ends the run and costs SPEED_WRONG_PENALTY. The total never goes below
 * 0. Before, a wrong press cost nothing, so pressing '일치' three times a second without reading scored about 12,000 — as much
 * as an honest 95%. With the 0.4 s answer display (SPEED_FLASH_MS), check-voca-learning.cjs simulates 2,000 games of each
 * learner: at 100 a guesser who always presses '맞음' as fast as allowed scores about 2,700, below an honest 80% at 1.5 s a pair
 * (about 3,900) and far below an honest 95% (about 8,100); at 50 — the number the owner's question gave as an example — the
 * guesser (about 4,900) still beats the honest 80% learner (about 4,300), against the plan's rule '찍기가 진지한 풀이를 이기지
 * 않는다'. One number to change back.
 */
export const SPEED_WRONG_PENALTY = 100;
/** How long each press shows right / wrong (and the right meaning) before the next pair — the buttons wait meanwhile. */
export const SPEED_FLASH_MS = 400;
export const SPEED_SECONDS = 60;

/** The points of one press: `combo` is the run of right presses INCLUDING this one when it is right. */
export function speedPressPoints(correct: boolean, combo: number): number {
  return correct ? 100 + combo * 10 : -SPEED_WRONG_PENALTY;
}

// -----------------------------------------------------------------------------
// 5b. Spelling (Step 3 — 2026-09-27 VOCA-L07 CHECK · D21 나)
// -----------------------------------------------------------------------------

/**
 * The written forms a bracketed headword accepts — both spellings it teaches (VOCA_SPEECH_FORMS in src/lib/vocaSpeech.ts holds
 * the same fourteen words; the spoken form is listed first). `autumn(=fall)` teaches a synonym, so both words are right.
 */
const BRACKET_SPELLINGS: Record<string, string[]> = {
  "judg(e)ment": ["judgment", "judgement"],
  "medi(a)eval": ["medieval", "mediaeval"],
  "marvel(l)ous": ["marvelous", "marvellous"],
  "enrol(l)": ["enroll", "enrol"],
  "colo(u)r": ["color", "colour"],
  "neighbo(u)r": ["neighbor", "neighbour"],
  "favo(u)r": ["favor", "favour"],
  "humo(u)r": ["humor", "humour"],
  "gray(grey)": ["gray", "grey"],
  "afterward(s)": ["afterward", "afterwards"],
  "autumn(=fall)": ["autumn", "fall"],
  "hono(u)r": ["honor", "honour"],
  "dialog(ue)": ["dialogue", "dialog"],
  "labo(u)r": ["labor", "labour"],
};

/** Every written form `word` accepts as a typed answer. A bracket not in the table: with and without its letters. */
export function spellingForms(word: string): string[] {
  const w = String(word || "").trim();
  const listed = BRACKET_SPELLINGS[w];
  if (listed) return [...listed];
  const m = /^(.*)\(([^)]*)\)(.*)$/.exec(w);
  if (!m) return [w];
  if (m[2].startsWith("=")) return [`${m[1]}${m[3]}`.trim(), m[2].slice(1).trim()];
  return [`${m[1]}${m[3]}`, `${m[1]}${m[2]}${m[3]}`];
}

/** Case, the ends, repeated spaces, curly apostrophes, spaces around a hyphen and a final period do not count. */
function spellingKey(text: string): string {
  return String(text || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*-\s*/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
}

/**
 * Whether a typed answer spells `word` (VOCA-L07 CHECK): case and the spaces at the ends are ignored; a bracketed headword takes
 * either spelling; a hyphenated one takes the hyphen, one word or two (good-bye · goodbye · good bye); a two-word one is compared
 * with one space between the words (living room).
 */
export function checkSpelling(typed: string, word: string): boolean {
  const answer = spellingKey(typed);
  if (!answer) return false;
  for (const form of spellingForms(word)) {
    const key = spellingKey(form);
    if (answer === key) return true;
    if (key.includes("-")) {
      const parts = key.split("-");
      if (answer === parts.join("") || answer === parts.join(" ")) return true;
    }
  }
  return false;
}

// -----------------------------------------------------------------------------
// 6. Leitner Spaced Repetition Logic (에빙하우스 망각곡선 모델)
// -----------------------------------------------------------------------------

/** A word never answered: '새 단어' (2026-09-27 — VOCA-L05 · U11: new words used to start in Box 1 '집중 복습'). */
export function newLeitnerCard(word: string, meaning: string): LeitnerCard {
  return { word, meaning, box: 0, lastTestedAt: 0, streak: 0, streakDay: null, v: 2 };
}

/**
 * Old records (2026-09-27 — VOCA-U11 CHECK · 계획 E03): before this version every card of a lesson was created in Box 1 at the
 * same moment the page opened, and all thirty were saved at the first answer. So in a card without `v`, Box 1 · streak 0 · a
 * lastTestedAt within this many ms of the record's earliest one — when at least two cards share that moment — is a word that was
 * never answered. A lone card at the earliest moment is a real answer (a quiz answered to the end has no untouched cards).
 */
export const LEITNER_LEGACY_WINDOW_MS = 2000;

/**
 * The lesson's cards from storage, for the lesson's CURRENT words (the meaning always comes from the dictionary — V-03/V-05/V-06).
 * Accepts the record of any version; anything unreadable is a new card. Every card returned is `v: 2`.
 */
export function readLeitnerCards(
  saved: unknown,
  words: string[],
  meaningOf: (word: string) => string,
): Record<string, LeitnerCard> {
  const record = saved && typeof saved === "object" && !Array.isArray(saved) ? (saved as Record<string, unknown>) : {};
  const isCard = (c: unknown): c is Partial<LeitnerCard> => Boolean(c) && typeof c === "object";
  const legacyTimes = Object.values(record)
    .filter(isCard)
    .filter((c) => c.v !== 2 && typeof c.lastTestedAt === "number" && c.lastTestedAt > 0)
    .map((c) => c.lastTestedAt as number);
  const earliest = legacyTimes.length ? Math.min(...legacyTimes) : null;
  const atEarliest = earliest === null ? 0 : legacyTimes.filter((t) => t - earliest <= LEITNER_LEGACY_WINDOW_MS).length;

  const cards: Record<string, LeitnerCard> = {};
  for (const w of words) {
    const clean = lc(w);
    const meaning = meaningOf(w);
    const prev = record[clean];
    if (!isCard(prev)) {
      cards[clean] = newLeitnerCard(w, meaning);
      continue;
    }
    const box: LeitnerBox = prev.box === 0 || prev.box === 1 || prev.box === 2 || prev.box === 3 ? prev.box : 0;
    const streak = typeof prev.streak === "number" && Number.isInteger(prev.streak) && prev.streak >= 0 ? prev.streak : 0;
    const at = typeof prev.lastTestedAt === "number" && prev.lastTestedAt > 0 ? prev.lastTestedAt : 0;
    if (prev.v !== 2) {
      const untouched = box === 1 && streak === 0 && earliest !== null && atEarliest >= 2 && at > 0 && at - earliest <= LEITNER_LEGACY_WINDOW_MS;
      cards[clean] = untouched ? newLeitnerCard(w, meaning) : { word: w, meaning, box, lastTestedAt: at, streak, streakDay: null, v: 2 };
      continue;
    }
    cards[clean] = {
      word: w,
      meaning,
      box,
      lastTestedAt: at,
      streak,
      streakDay: typeof prev.streakDay === "string" ? prev.streakDay : null,
      ...(prev.known === true ? { known: true } : {}),
      v: 2,
    };
  }
  return cards;
}

/**
 * One graded answer. Right: the streak grows — once per learning day when `today` is given (VOCA-L02 CHECK ④, so rounds on
 * one day cannot master a word) — and the card is at least Box 2, Box 3 at MASTERY_STREAK; a right answer never lowers a card.
 * Wrong: Box 1, streak 0. Only answers move boxes (D21 나 — no button does).
 */
export function updateLeitnerCard(
  prevCards: Record<string, LeitnerCard>,
  word: string,
  meaning: string,
  isCorrect: boolean,
  today: string | null = null,
  nowMs: number = Date.now(),
): Record<string, LeitnerCard> {
  const clean = word.toLowerCase().trim();
  const current = prevCards[clean] || newLeitnerCard(word, meaning);

  let nextBox: LeitnerBox = current.box;
  let nextStreak = current.streak;
  let streakDay = current.streakDay ?? null;

  if (isCorrect) {
    if (today === null || streakDay !== today) {
      nextStreak += 1;
      streakDay = today;
    }
    const earned: LeitnerBox = nextStreak >= MASTERY_STREAK ? 3 : 2;
    // A correct answer may promote a card but must never demote one (a card mastered before
    // 2026-09-27 by the old "마스터 체크" button keeps its Box 3).
    nextBox = Math.max(current.box, earned) as LeitnerBox;
  } else {
    nextStreak = 0;
    nextBox = 1;
    streakDay = null;
  }

  return {
    ...prevCards,
    [clean]: {
      ...current,
      word,
      meaning,
      box: nextBox,
      lastTestedAt: nowMs,
      streak: nextStreak,
      streakDay,
      v: 2,
    },
  };
}

/**
 * '안다고 표시' (2026-09-27 — VOCA-L05 CHECK · D21 나): the learner's own mark. It replaced the '마스터 체크' button, which put the
 * card in Box 3 at once and so took it out of review; now no box moves and Step 2 still asks the word. The next-day check of the
 * common learning engine is where a known word is confirmed.
 */
export function setLeitnerKnown(
  prevCards: Record<string, LeitnerCard>,
  word: string,
  meaning: string,
  known: boolean,
): Record<string, LeitnerCard> {
  const clean = word.toLowerCase().trim();
  const current = prevCards[clean] || newLeitnerCard(word, meaning);
  const { known: _drop, ...rest } = current;
  void _drop;
  return { ...prevCards, [clean]: { ...rest, word, meaning, ...(known ? { known: true } : {}), v: 2 } };
}
