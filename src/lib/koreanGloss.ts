/**
 * Korean words inside the English, drawn in Hangul — GRAMMAR II and PASS-OFF GRAMMAR (2026-10-02).
 *
 * The owner asked for Korean words inside English to be written in Hangul ("이런 것들 표기는 한국어로 다 변경하자"). In these two
 * courses the learner WRITES the English, so at first the screen kept the spelling and added the Hangul ("Busan(부산)" — "영어
 * 표기 + 한글 덧붙임"); the owner then asked for Hangul alone here too ("한국어 로마식표기를 다 한국어로 바꿔" — "한글로만
 * 바꾸기"). The lesson files keep the spelling, so the sound, the accepted answers and the microphone stay exactly as they
 * were: only what is DRAWN passes through koreanOnScreen, and a learner who copies the screen ("I live in 서울.") is graded
 * through romanForGrading as if they had written "Seoul". (STUDENT · READING · ADULT write the Hangul in the lesson files
 * themselves — src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES.)
 *
 * Per page, so a "Kim" that is an American (LISTENING) is never touched. Every spelling a page shows is listed (Busan · Pusan,
 * Yi Sun-sin · Lee Soon-shin …), the first spelling of each Hangul being the one its answers use. A phrase is replaced as a
 * whole ("Han River" → 한강). Keep this file free of imports — scripts transpile it alone.
 */

type Gloss = [written: string, hangul: string];

const SEOUL: Gloss = ["Seoul", "서울"];
const BUSAN: Gloss[] = [["Busan", "부산"], ["Pusan", "부산"]];
const KIM: Gloss = ["Kim", "김"];
const GYEONGSANG: Gloss[] = [["Gyeongsang-do", "경상도"], ["Gyeongsangdo", "경상도"], ["Kyungsangdo", "경상도"], ["Gyeongsang", "경상"]];
// with the name alone, in case a cloze blank falls on "River" and leaves "Han" by itself
const HAN_RIVER: Gloss[] = [["Han River", "한강"], ["Hangang River", "한강"], ["Hangang", "한강"], ["Han", "한"]];
// with the parts alone, for a word tile or a marked word cut from the sentence one word at a time
const HONG: Gloss[] = [["Hong Gil Dong", "홍길동"], ["Hong Gil-dong", "홍길동"], ["Hong", "홍"], ["Gil-dong", "길동"], ["Gil", "길"], ["Dong", "동"]];
const DAEHAN: Gloss[] = [["Daehan", "대한"], ["Dae-han", "대한"], ["Dae Han", "대한"], ["Dae", "대"], ["Han", "한"]];
const HANGUK: Gloss[] = [["Hanguk", "한국"], ["Hankuk", "한국"]];
const JUNG: Gloss[] = [["Jung", "정"], ["Jeong", "정"]];
const YI_SUN_SIN: Gloss[] = [
  ["Yi Sun-sin", "이순신"], ["Yi Sun-shin", "이순신"], ["Yi Soon-shin", "이순신"], ["Yi Sunsin", "이순신"],
  ["Lee Sun-sin", "이순신"], ["Lee Sun-shin", "이순신"], ["Lee Soon-shin", "이순신"], ["Lee Soon-sin", "이순신"],
  // pg13-1's accepted answers also have the family name last ("General Soon-shin Lee") and the family name alone
  // ("Admiral Yi" — the longer spellings above win where the given name follows)
  ["Soon-shin Lee", "이순신"], ["Yi", "이"],
  // the name's parts alone — a word tile or a marked word is cut from the sentence one word at a time ("Yi" · "Sun-sin")
  ["Sun-sin", "순신"], ["Sun-shin", "순신"], ["Soon-shin", "순신"], ["Soon-sin", "순신"], ["Sunsin", "순신"], ["Lee", "이"],
];
const CHUSEOK: Gloss[] = [["Chuseok", "추석"], ["Chu-seok", "추석"], ["Chu-Seok", "추석"]];
const SEOLLAL: Gloss[] = [["Seollal", "설날"], ["Seol-lal", "설날"], ["Seol-Lal", "설날"]];
const SONGNISAN: Gloss[] = [["Songnisan", "속리산"], ["Soungni-san", "속리산"]];
const SONGPYEON: Gloss[] = [
  ["songpyeon", "송편"], ["Songpyeon", "송편"], ["song-pyeon", "송편"], ["Song-Pyun", "송편"], ["Song-pyun", "송편"],
  ["song-pyun", "송편"], ["songpyun", "송편"],
];
const JEJU: Gloss[] = [["Jeju Island", "제주도"], ["Jeju", "제주"], ["Je-Ju", "제주"], ["Je-ju", "제주"]];

/** page ("<course>/<lesson id>") → the spellings on it and their Hangul */
export const KOREAN_GLOSS_PAGES: Record<string, Gloss[]> = {
  "grammar2/gh2-011": [SEOUL],
  "grammar2/gh2-011-1": [SEOUL],
  "grammar2/gh2-012": HAN_RIVER,
  "grammar2/gh2-012-1": HAN_RIVER,
  "grammar2/gh2-016": [SEOUL],
  "grammar2/gh2-016-1": [SEOUL],
  "grammar2/gh2-020": [SEOUL],
  "grammar2/gh2-020-1": [SEOUL],
  "grammar2/gh2-029": [SEOUL, KIM],
  "grammar2/gh2-029-1": [SEOUL, KIM],
  "grammar2/gh2-033": BUSAN,
  "grammar2/gh2-033-1": BUSAN,
  "grammar2/gh2-038": [...GYEONGSANG, ...BUSAN],
  "grammar2/gh2-038-1": [...GYEONGSANG, ...BUSAN],
  "grammar2/gh2-045": [KIM],
  "grammar2/gh2-045-1": [KIM],
  "passoff-grammar/pg01-1": [...HONG, SEOUL],
  "passoff-grammar/pg01-3": DAEHAN,
  "passoff-grammar/pg02-3": [["Mina", "미나"]],
  "passoff-grammar/pg03-3": [["Dangun", "단군"]],
  "passoff-grammar/pg05-1": [SEOUL],
  "passoff-grammar/pg05-2": [...DAEHAN, SEOUL],
  "passoff-grammar/pg06-1": [...CHUSEOK, ...SONGNISAN, ...SEOLLAL],
  "passoff-grammar/pg08-2": SONGPYEON,
  "passoff-grammar/pg09-1": [["Jinna", "진나"]],
  "passoff-grammar/pg10-1": [SEOUL],
  "passoff-grammar/pg11-1": [SEOUL, ...HANGUK],
  "passoff-grammar/pg11-3": JUNG,
  "passoff-grammar/pg12-1": [SEOUL, ...BUSAN],
  "passoff-grammar/pg12-3": JEJU,
  "passoff-grammar/pg13-1": YI_SUN_SIN,
  "passoff-grammar/pg16-3": JUNG,
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * `text` as drawn on `lessonKey`: every Korean word in Hangul — "He went to 부산 on business." (2026-10-02 사장님 "한국어
 * 로마식표기를 다 한국어로 바꿔" — the earlier "Busan(부산)" is replaced). Whole words only (no letter or digit on either side),
 * longest spelling first ("Yi Sun-sin" before "Yi", "Jeju Island" before "Jeju"), exact case. A word the text already follows
 * with its own Hangul in brackets ("Songnisan(속리산)") becomes that Hangul once. No look-behind (older iOS Safari cannot
 * parse one).
 */
export function koreanOnScreen(lessonKey: string, text: string): string {
  const glosses = KOREAN_GLOSS_PAGES[lessonKey];
  if (!glosses || !text) return text;
  const hangulOf = new Map(glosses);
  const alternatives = [...hangulOf.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${alternatives})(\\([가-힣]+\\))?(?![A-Za-z0-9])`, "g"), (match, before: string, written: string, bracket: string | undefined) => {
    const hangul = hangulOf.get(written);
    if (!hangul) return match;
    return `${before}${hangul}${bracket && bracket !== `(${hangul})` ? bracket : ""}`;
  });
}

/**
 * The learner's answer as the grader reads it: a Korean word the learner wrote in Hangul — copying the screen, "I live in 서울."
 * — is put back into the spelling the lesson's answers use ("Seoul" — the first spelling of that Hangul in the page's table),
 * so writing it either way is graded alike. English stays as typed. Whole Hangul words only, longest first ("이순신" before "이").
 */
export function romanForGrading(lessonKey: string, text: string): string {
  const glosses = KOREAN_GLOSS_PAGES[lessonKey];
  if (!glosses || !text || !/[가-힣]/.test(text)) return text;
  const writtenOf = new Map<string, string>();
  for (const [written, hangul] of glosses) if (!writtenOf.has(hangul)) writtenOf.set(hangul, written);
  const alternatives = [...writtenOf.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9가-힣])(${alternatives})(?![A-Za-z0-9가-힣])`, "g"), (_m, before: string, hangul: string) => `${before}${writtenOf.get(hangul)}`);
}
