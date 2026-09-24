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
 * The words of a sentence as dictation tokens: trailing punctuation dropped,
 * apostrophes inside words kept ("I'm", "don't").
 *
 * A clock time ("12:30") and "a.m." / "p.m." are one spoken word each and one
 * tile each. The plain word pattern cut them at the colon and the dots, so
 * "Lunchtime starts at 12:30 p.m. and ends at 1:30 p.m." became 14 tiles of
 * which 8 were "12", "30", "p", "m" fragments the learner had to tap in order
 * (6-1688 — 10 STUDENT sentences and 19 LISTENING rows carry a time).
 *
 * A number with thousands separators ("2,000", "$65,000") is one tile for the
 * same reason: the comma split it into "2" and "000", and nobody hears "000"
 * (6-1755 — 3 STUDENT sentences and 21 LISTENING rows).
 */
const DICTATION_TOKEN = /\d{1,2}:\d{2}|\d{1,3}(?:,\d{3})+|[AaPp]\.[Mm]\.|[a-zA-Z0-9'’\-]+/g;

function dictationWords(sentence: string): string[] {
  return (sentence.match(DICTATION_TOKEN) || []).map((w) => w.trim()).filter(Boolean);
}

/**
 * A word with its apostrophes and a trailing plural/possessive "s" removed, so
 * that "I'm"/"Im" and "name's"/"names" compare equal. Two tiles that differ only
 * this way SOUND the same, and a learner cannot tell them apart by ear — which
 * makes the wrong one a spelling trap, not a listening exercise (CNT-14).
 */
function soundAlikeForm(word: string): string {
  return word.toLowerCase().replace(/['’]/g, "").replace(/s$/, "");
}

/**
 * The sentences a slashed alternative stands for.
 *
 * STUDENT writes "Nice to meet you (sir/ma'am)." and "His/Her name is …" —
 * one sentence, two ways to say it. Tokenised as written, BOTH words became
 * required, so "Nice to meet you sir" was wrong and only the ungrammatical
 * "Nice to meet you sir ma'am" passed (CNT-01). Each "a/b" (with or without the
 * bracket) is expanded into its choices; the first sentence in the result is
 * the one the tiles are built from, and every one of them counts as correct.
 * A sentence with no slash comes back as itself.
 *
 * PRONOUN GROUPS AGREE BY GENDER, not by position, and are not combined
 * freely. STUDENT's pronoun slashes are one referent written both ways — "He/She
 * has a habit of touching his/her nose … when he/she teaches" — so every pronoun
 * group takes the form matching the chosen referent. A free product would also
 * accept "He has a habit of touching her nose when she teaches", a different
 * sentence. Position is not enough either: s6-3 #7 writes "He/She is very kind,
 * and I like her/him a lot", where the first option of each group disagrees
 * (independent review). Other slashed groups ("brother/sister", "sir/ma'am")
 * are independent choices and are combined with each referent.
 *
 * A TITLE KEEPS ITS FULL STOP. s6-2 #2 writes "Mr./Ms. (Surname)"; letters-only
 * options never matched it, so it was not split — the audio said both titles and
 * the tiles accepted only "Mr Ms Surname" (관문 15 결정 B 둘1, 높음). An option may
 * end in "." only when it is Mr · Mrs · Ms · Dr, so a sentence-final "him/her."
 * (s3-3 #6 · #7 · s14-2 #7) keeps its period outside the group.
 */
const TITLE_OR_WORD = "(?:(?:Mrs|Mr|Ms|Dr)\\.|[A-Za-z'’]+)";
const SLASH_GROUP = new RegExp(`\\(?(${TITLE_OR_WORD}(?:\\/${TITLE_OR_WORD})+)\\)?`, "g");
const MASCULINE = new Set(["he", "him", "his", "himself"]);
const FEMININE = new Set(["she", "her", "hers", "herself"]);
const genderOf = (word: string) =>
  MASCULINE.has(word.toLowerCase()) ? "m" : FEMININE.has(word.toLowerCase()) ? "f" : null;

export function expandSlashAlternatives(sentence: string): string[] {
  const groups = [...sentence.matchAll(SLASH_GROUP)].map((match) => {
    const options = match[1].split("/").filter(Boolean);
    return { whole: match[0], options, pronoun: options.every((o) => genderOf(o) !== null) };
  });
  if (groups.length === 0) return [sentence];

  const hasPronouns = groups.some((g) => g.pronoun);
  let variants = hasPronouns
    ? (["m", "f"] as const).map((gender) =>
        groups.reduce(
          (text, g) =>
            g.pronoun
              ? text.replace(g.whole, g.options.find((o) => genderOf(o) === gender) ?? g.options[0])
              : text,
          sentence,
        ),
      )
    : [sentence];

  for (const g of groups.filter((x) => !x.pronoun)) {
    variants = variants.flatMap((v) => g.options.map((o) => v.replace(g.whole, o)));
    // Two independent groups is already four sentences; stop before a
    // pathological line builds hundreds.
    if (variants.length > 16) break;
  }
  return Array.from(new Set(variants));
}

/**
 * The sentence a slashed alternative is SPOKEN as: the first of expandSlashAlternatives — the same
 * sentence the tiles, the hint and the first accepted answer follow (generateWordBank).
 *
 * BUG-028 (소유자 결정 2026-09-24): the audio read both forms — "He/She is a very talented artist,
 * too." became "He She is …" once the slash was blanked for speech — while only one form is
 * accepted, so a learner who tapped what they heard in the blind dictation was marked wrong
 * (36 STUDENT sentences). The screen still shows "He/She". A sentence without a slashed
 * alternative comes back unchanged. "Mr./Ms. (Surname)" is said as "Mr. (Surname)" — see the title
 * rule above expandSlashAlternatives.
 */
export function firstSlashAlternative(sentence: string): string {
  return expandSlashAlternatives(sentence)[0] ?? sentence;
}

/**
 * Creates word-bank tiles for mobile tap-to-assemble dictation with plausible distractors.
 *
 * `acceptedWordSequences` holds every word sequence that counts as correct —
 * one per slashed alternative in the sentence — and `correctWords` is the first
 * of them, which the tiles and the hint follow. The words the other
 * alternatives need are added as tiles too, so each alternative can actually
 * be assembled.
 */
export function generateWordBank(
  sentence: string,
  extraDistractorPool: string[] = []
): { correctWords: string[]; acceptedWordSequences: string[][]; allTiles: WordTile[] } {
  const acceptedWordSequences = expandSlashAlternatives(sentence).map(dictationWords);
  const correctWords = acceptedWordSequences[0] ?? [];

  const tileList: WordTile[] = correctWords.map((word, idx) => ({
    id: `word-${idx}-${word}`,
    word,
  }));

  // The other alternatives' own words ("ma'am" next to "sir") — as many copies
  // as the alternative that needs the most, so "She … she" can be assembled
  // even though the first sentence is "He … he".
  const countWords = (words: string[]) => {
    const counts = new Map<string, { count: number; word: string }>();
    for (const word of words) {
      const key = word.toLowerCase();
      const entry = counts.get(key);
      if (entry) entry.count += 1;
      else counts.set(key, { count: 1, word });
    }
    return counts;
  };
  const have = countWords(correctWords);
  for (const sequence of acceptedWordSequences.slice(1)) {
    for (const [key, need] of countWords(sequence)) {
      const available = have.get(key)?.count ?? 0;
      for (let extra = available; extra < need.count; extra++) {
        tileList.push({ id: `alt-${tileList.length}-${need.word}`, word: need.word });
      }
      if (need.count > available) have.set(key, { count: need.count, word: need.word });
    }
  }
  const existingSet = new Set(have.keys());

  // Add 2~3 smart distractor words
  const defaultDistractors = [
    "was", "the", "with", "in", "at", "for", "on", "is", "he", "she", "we", "are", "very"
  ];
  const pool = Array.from(new Set([...extraDistractorPool, ...defaultDistractors]));
  const soundAlikes = new Set(
    acceptedWordSequences.flat().map(soundAlikeForm),
  );

  const addedDistractors: string[] = [];
  for (const d of pool) {
    if (!existingSet.has(d.toLowerCase()) && !soundAlikes.has(soundAlikeForm(d)) && d.length >= 2) {
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
    acceptedWordSequences,
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

/** True when the assembled tiles match ANY of the accepted word sequences. */
export function verifyAnyWordSequence(userWords: string[], accepted: string[][]): boolean {
  return accepted.some((target) => verifyWordSequence(userWords, target));
}

/**
 * The typed-dictation comparison used until 2026-09-23 (KIG-024): lower case,
 * whitespace collapsed, every other symbol deleted. Kept as one of the two ways a
 * typed answer can match, so nothing that was accepted before stops being accepted.
 */
function legacyTypedForm(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const UNIT_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
const TEEN_WORDS = ["ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const SCALE_WORDS: Record<string, number> = { hundred: 100, thousand: 1000, million: 1_000_000, billion: 1_000_000_000 };
const ORDINAL_WORDS: Record<string, number> = {
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10,
  eleventh: 11, twelfth: 12, thirteenth: 13, fourteenth: 14, fifteenth: 15, sixteenth: 16, seventeenth: 17,
  eighteenth: 18, nineteenth: 19, twentieth: 20, thirtieth: 30, fortieth: 40, fiftieth: 50, sixtieth: 60,
  seventieth: 70, eightieth: 80, ninetieth: 90, hundredth: 100, thousandth: 1000, millionth: 1_000_000,
};

type NumberWord = { value: number; kind: "unit" | "teen" | "tens" | "scale"; ordinal?: boolean; decade?: boolean };

function numberWord(token: string): NumberWord | null {
  const unit = UNIT_WORDS.indexOf(token);
  if (unit >= 0) return { value: unit, kind: "unit" };
  const teen = TEEN_WORDS.indexOf(token);
  if (teen >= 0) return { value: 10 + teen, kind: "teen" };
  const tens = TENS_WORDS.indexOf(token);
  if (tens >= 2) return { value: tens * 10, kind: "tens" };
  // "sixties" — a decade, as in "the nineteen sixties"
  const decade = TENS_WORDS.findIndex((w, i) => i >= 2 && token === w.replace(/y$/, "ies"));
  if (decade >= 2) return { value: decade * 10, kind: "tens", decade: true };
  if (token in SCALE_WORDS) return { value: SCALE_WORDS[token], kind: "scale" };
  // "the eighteen hundreds" = "the 1800s"
  if (token === "hundreds") return { value: 100, kind: "scale", decade: true };
  if (token in ORDINAL_WORDS) {
    const value = ORDINAL_WORDS[token];
    const kind = value >= 100 ? "scale" : value >= 20 && value % 10 === 0 ? "tens" : value >= 10 ? "teen" : "unit";
    return { value, kind, ordinal: true };
  }
  return null;
}

function ordinalSuffix(n: number): string {
  if (n % 100 >= 11 && n % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

/** 1968 → "19 68": four-digit numbers are written as two pairs, so a year said the usual way and a clock time like 12:30 follow one rule. */
function canonicalNumber(n: number): string {
  return n >= 1000 && n <= 9999 ? `${Math.floor(n / 100)} ${n % 100}` : String(n);
}

/** A run of number words → its canonical digits ("nineteen sixty eight" → "19 68", "one hundred eighty five million" → "185000000"). */
function numberRun(words: NumberWord[]): string {
  const ordinal = words[words.length - 1].ordinal;
  const decade = words[words.length - 1].decade;
  const suffix = (n: number) => (ordinal ? ordinalSuffix(n) : decade ? "s" : "");
  if (words.some((w) => w.kind === "scale")) {
    let total = 0;
    let current = 0;
    for (const w of words) {
      if (w.kind !== "scale") current += w.value;
      else if (w.value === 100) current = (current || 1) * 100;
      else { total += (current || 1) * w.value; current = 0; }
    }
    const n = total + current;
    return ordinal ? `${n}${suffix(n)}` : decade ? `${canonicalNumber(n)}s` : canonicalNumber(n);
  }
  // No hundred/thousand: said in pairs — "nineteen sixty eight", "eight forty", "twenty five"
  const pairs: { value: number; open: boolean }[] = [];
  for (const w of words) {
    const last = pairs[pairs.length - 1];
    if (w.kind === "unit" && last && last.open) { last.value += w.value; last.open = false; }
    else pairs.push({ value: w.value, open: w.kind === "tens" && !w.ordinal && !w.decade });
  }
  return pairs.map((p, i) => `${p.value}${i === pairs.length - 1 ? suffix(p.value) : ""}`).join(" ");
}

/**
 * The form a typed dictation answer is compared in, spoken numbers and hyphens
 * included (6단계 G1 — 결정표 1번, owner decision 2026-09-23).
 *
 * The audio reads numbers aloud: "2:00" is "two o'clock", "1968" is "nineteen
 * sixty-eight", "$5" is "five dollars". A learner who types what they heard used
 * to be marked wrong, and so did one who typed "left handed" for "left-handed" —
 * the hyphen is not heard (the legacy form glued it into "lefthanded"). Both the
 * answer and the typing are brought to one spelling: lower case, no symbols,
 * numbers in digits (four-digit ones as two pairs), a clock time as "hour minute"
 * ("hour" alone on the hour), ordinals as "18th", money as "5 dollar", percent as
 * "70 percent", "1 1/2" as "1 and a half", hyphens as spaces. A different number
 * still differs — numbers are respelled, never dropped.
 */
export function spokenTypedForm(text: string): string {
  let s = ` ${text.toLowerCase().replace(/[’‘`´]/g, "'")} `;
  s = s.replace(/\$\s?(\d[\d,]*)(?:\.(\d{1,2}))?/g, (_, dollars: string, cents?: string) =>
    ` ${dollars.replace(/,/g, "")} dollar${cents ? ` ${Number(cents)} cent` : ""} `);
  s = s.replace(/(\d[\d,.]*)\s?%/g, " $1 percent ");
  s = s.replace(/\b(\d{1,2}):(\d{2})\b/g, (_, h: string, m: string) => ` ${Number(h)}${m === "00" ? "" : ` ${Number(m)}`} `);
  const fraction = (a: string, b: string) =>
    a === "1" && b === "2" ? "a half" : a === "1" && b === "4" ? "a quarter" : a === "3" && b === "4" ? "3 quarters" : `${a} ${b}`;
  s = s.replace(/\b(\d+)\s+(\d+)\/(\d+)\b/g, (_, whole: string, a: string, b: string) => ` ${whole} and ${fraction(a, b)} `);
  s = s.replace(/\b(\d+)\/(\d+)\b/g, (_, a: string, b: string) => ` ${fraction(a, b)} `);
  while (/\d,\d{3}/.test(s)) s = s.replace(/(\d),(\d{3})/g, "$1$2");
  s = s.replace(/(\d)\.(\d)/g, "$1 point $2");
  s = s.replace(/\b([ap])\.\s?m\b\.?/g, "$1m");
  // A comma or a sentence end stops a spoken number, so the list "876, 935, 290" typed as
  // words stays three numbers. The marker is dropped at the end; other symbols are deleted
  // in place as the legacy form did ("don't" → "dont", "U.S." → "us").
  s = s.replace(/[-‐‑–—]/g, " ").replace(/[,;:!?]|\.(?=\s|$)/g, " | ").replace(/[^a-z0-9| ]/g, "");

  const tokens = s.split(/\s+/).filter(Boolean).filter((t) => t !== "oclock");
  for (let i = tokens.length - 2; i >= 0; i--) if (tokens[i] === "o" && tokens[i + 1] === "clock") tokens.splice(i, 2);
  // "15 million" (digits, then the word) is one number
  for (let i = tokens.length - 2; i >= 0; i--) {
    if (/^\d+$/.test(tokens[i]) && tokens[i + 1] in SCALE_WORDS) tokens.splice(i, 2, String(Number(tokens[i]) * SCALE_WORDS[tokens[i + 1]]));
  }

  const out: string[] = [];
  for (let i = 0; i < tokens.length; ) {
    const starts = numberWord(tokens[i]) || (tokens[i] === "a" && tokens[i + 1] in SCALE_WORDS);
    if (!starts) {
      out.push(tokens[i]);
      i += 1;
      continue;
    }
    const run: NumberWord[] = [];
    while (i < tokens.length) {
      const t = tokens[i];
      const w = numberWord(t);
      if (w) {
        run.push(w);
        i += 1;
        if (w.ordinal || w.decade) break;
      } else if (t === "a" && run.length === 0 && tokens[i + 1] in SCALE_WORDS) {
        run.push({ value: 1, kind: "unit" });
        i += 1;
      } else if (t === "and" && run.some((x) => x.kind === "scale") && numberWord(tokens[i + 1] ?? "")) {
        i += 1; // "one hundred and five"
      } else if (t === "oh" && run.length > 0 && numberWord(tokens[i + 1] ?? "")?.kind === "unit") {
        i += 1; // "nineteen oh five": the unit that follows is a pair of its own
        run.push({ ...(numberWord(tokens[i]) as NumberWord) });
        run[run.length - 1].kind = "teen";
        i += 1;
      } else break;
    }
    out.push(...numberRun(run).split(" "));
  }

  // Digits the page wrote: "1968" → "19 68", "1960s" → "19 60s"
  const result: string[] = [];
  for (let i = 0; i < out.length; i++) {
    const t = out[i];
    if (t === "|") continue;
    if (/^\d{4}$/.test(t)) result.push(canonicalNumber(Number(t)));
    else if (/^\d{4}s$/.test(t)) result.push(`${canonicalNumber(Number(t.slice(0, 4))).replace(/(\d+)$/, "$1s")}`);
    else if (/^\d+$/.test(t)) result.push(String(Number(t)));
    else if (t === "dollars") result.push("dollar");
    else if (t === "cents") result.push("cent");
    else result.push(t);
  }
  // "four dollars and ninety five cents" = "$4.95"
  return result
    .filter((t, i, a) => !(t === "and" && a[i - 1] === "dollar" && /^\d+$/.test(a[i + 1] ?? "")))
    .join(" ")
    .split(" ")
    .filter(Boolean)
    .join(" ");
}

/**
 * Whether a typed dictation answer counts as the target sentence: the legacy
 * comparison OR the spoken-number/hyphen form above. Either one accepting is
 * enough, so every answer accepted before 2026-09-23 still is.
 */
export function typedDictationMatches(typed: string, target: string): boolean {
  return legacyTypedForm(typed) === legacyTypedForm(target) || spokenTypedForm(typed) === spokenTypedForm(target);
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
