/**
 * The Hangul beside a Korean word written in English — GRAMMAR II and PASS-OFF GRAMMAR (2026-10-02).
 *
 * The owner asked for Korean words inside English to be written in Hangul ("이런 것들 표기는 한국어로 다 변경하자"). In these two
 * courses the learner WRITES the English, and English writes them in romanization ("I went to Busan"; PASS-OFF 6-1 teaches that
 * a proper noun such as Chuseok starts with a capital), so the owner chose "영어 표기 + 한글 덧붙임": the spelling, the grading
 * and the sound stay; the screen shows the word once with its Hangul after it — "Busan(부산)". Only the text drawn changes: what
 * is graded, matched or spoken is never passed through here. (STUDENT · READING · ADULT, where nothing is written by the
 * learner, show the Hangul alone — src/lib/lessonSpeechForm.ts KOREAN_DISPLAY_PAGES.)
 *
 * Per page, so a "Kim" that is an American (LISTENING) never gets one. Every spelling a page shows is listed (Busan · Pusan,
 * Yi Sun-sin · Lee Soon-shin …). A phrase is glossed as a whole ("Han River(한강)"). In one piece of text a word gets its Hangul
 * the first time only. Keep this file free of imports — scripts transpile it alone.
 */

type Gloss = [written: string, hangul: string];

const SEOUL: Gloss = ["Seoul", "서울"];
const BUSAN: Gloss[] = [["Busan", "부산"], ["Pusan", "부산"]];
const KIM: Gloss = ["Kim", "김"];
const GYEONGSANG: Gloss[] = [["Gyeongsang-do", "경상도"], ["Gyeongsangdo", "경상도"], ["Kyungsangdo", "경상도"], ["Gyeongsang", "경상"]];
const HAN_RIVER: Gloss[] = [["Han River", "한강"], ["Hangang River", "한강"]];
const HONG: Gloss[] = [["Hong Gil Dong", "홍길동"], ["Hong Gil-dong", "홍길동"]];
const DAEHAN: Gloss[] = [["Daehan", "대한"], ["Dae-han", "대한"], ["Dae Han", "대한"]];
const HANGUK: Gloss[] = [["Hanguk", "한국"], ["Hankuk", "한국"]];
const JUNG: Gloss[] = [["Jung", "정"], ["Jeong", "정"]];
const YI_SUN_SIN: Gloss[] = [
  ["Yi Sun-sin", "이순신"], ["Yi Sun-shin", "이순신"], ["Yi Soon-shin", "이순신"], ["Yi Sunsin", "이순신"],
  ["Lee Sun-sin", "이순신"], ["Lee Sun-shin", "이순신"], ["Lee Soon-shin", "이순신"], ["Lee Soon-sin", "이순신"],
  // pg13-1's accepted answers also have the family name last ("General Soon-shin Lee") and the family name alone
  // ("Admiral Yi" — the longer spellings above win where the given name follows)
  ["Soon-shin Lee", "이순신"], ["Yi", "이"],
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
 * `text` as drawn on `lessonKey`: each Korean word with its Hangul after it, the first time in this text — "He went to
 * Busan(부산) on business." Whole words only (no letter or digit on either side), longest spelling first, exact case; a word
 * already followed by "(" keeps what follows. No look-behind (older iOS Safari cannot parse one).
 */
export function withKoreanGloss(lessonKey: string, text: string): string {
  const glosses = KOREAN_GLOSS_PAGES[lessonKey];
  if (!glosses || !text) return text;
  const hangulOf = new Map(glosses);
  const alternatives = [...hangulOf.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  const done = new Set<string>();
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${alternatives})(?![A-Za-z0-9(])`, "g"), (match, before: string, written: string) => {
    const hangul = hangulOf.get(written);
    if (!hangul || done.has(hangul)) return match;
    done.add(hangul);
    return `${before}${written}(${hangul})`;
  });
}
