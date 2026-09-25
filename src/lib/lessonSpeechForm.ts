/**
 * What to SAY for a lesson's English where the written form would be read wrongly — per page,
 * so the screen keeps exactly what it teaches and only the string handed to speech changes.
 *
 * 1. Korean words written in romanization are said in Korean (소유자 결정 2026-09-25).
 *    The owner heard STUDENT 20-2 read 'Bulguksa' and 'Songnisan' by English rules. Every clip is
 *    made with one voice (en-US-AvaMultilingualNeural), and the generator
 *    (scripts/generate-azure-ava.mjs languageRuns) picks the language by script: Hangul is read as
 *    ko-KR, Latin letters as en-US. So a Korean name spelled in Latin letters was read as English.
 *    Handing speech the Hangul makes the same voice say it in Korean — as it already says the
 *    STUDENT Korean translations. The rule (owner's answer "이것도 바꿔"): a Korean word written in
 *    romanization is said in Korean even when English has a settled pronunciation for it (Seoul ·
 *    kimchi · Mr. Kim). "Korea" and "Korean" are English words and stay. LISTENING's Kim (d011 · d012
 *    · d025 · d026) is an American and stays — which is why this is a table per page and never a
 *    global word swap. The table covers every sentence the app speaks that holds such a word: 56 of
 *    the 15,334 spoken texts (STUDENT 39 · GRAMMAR II 11 · READING 6), found by the '학습 내용 재검토1'
 *    session (docs/qa-2026-09-18/내용-재검토/한국어-발음/결과.md). Each Hangul form is the one the same
 *    lesson's Korean translation uses.
 *
 * 2. A mixed number is said as a number (LISTENING d169 "open for 1 1/2 seconds"). Speech turns
 *    every "/" into a space (unifiedSpeech normalizeUnifiedSpeechText — the "/" is a chunk marker
 *    everywhere else), so the clip was made from "1 1 2 seconds" (found 2026-09-18, map R24 · P-1;
 *    the only spoken text with a slash between digits). The page's top player cleans the "/" before
 *    this runs, so both written forms are listed. Rule: a word is said in the pronunciation of the
 *    meaning the screen shows (소유자 결정 2026-09-24).
 *
 * The spoken text changes, so each clip gets a NEW name: production clips are cached `immutable` for
 * a year, and a new name never collides with the old sound. A GRAMMAR II, READING or LISTENING page
 * and its "-1" pair speak the same English, so both ids are listed.
 *
 * Called where a view hands English to speech — the same places as STUDENT's firstSlashAlternative
 * (BUG-028): StudentLearningView (sentence · whole lesson · speed change), ChapterAudioBar (the STUDENT
 * course list), GrammarLearningView playEnglish, ReadingLearningView playSentenceEn, LdLearningView
 * playText · whole passage, the page's top "전체 듣기" player (page.tsx), and scripts/lib/spoken-texts.cjs,
 * which the clip generator, the free-clip list and the audit all use. Keep this file free of imports —
 * the generator transpiles it alone.
 */
export const LESSON_SPEECH_WORDS: Record<string, [string, string][]> = {
  "student/s1-2": [["Hong Gil Dong", "홍길동"], ["Seoul", "서울"]],
  "student/s8-3": [["bulgogi", "불고기"]],
  "student/s12-3": [["Gangwon", "강원"]],
  "student/s13-2": [["Yi Sun-sin", "이순신"], ["Yi", "이"]],
  "student/s13-3": [["Yi Sun-sin", "이순신"], ["Yi", "이"]],
  "student/s17-1": [["Gojoseon", "고조선"], ["Hwanung", "환웅"], ["Ungnyeo", "웅녀"], ["Hwanin", "환인"], ["Dangun", "단군"]],
  "student/s17-2": [["Gojoseon", "고조선"], ["Goguryeo", "고구려"], ["Baekje", "백제"], ["Silla", "신라"]],
  "student/s17-3": [["Goryeo", "고려"], ["Joseon", "조선"], ["Silla", "신라"]],
  "student/s18-1": [["Seollal", "설날"], ["Chuseok", "추석"]],
  "student/s18-2": [["Seollal", "설날"]],
  "student/s18-3": [["songpyeon", "송편"], ["Chuseok", "추석"]],
  "student/s19-2": [["hanbok", "한복"]],
  "student/s19-3": [["bulgogi", "불고기"], ["Bulgogi", "불고기"], ["kimchi", "김치"]],
  "student/s19-4": [["Sejong", "세종"], ["Hangul", "한글"]],
  "student/s20-2": [["Songnisan", "속리산"], ["Bulguksa", "불국사"]],
  "student/s20-3": [["Gyeonggi", "경기"], ["Yongin", "용인"], ["Suwon", "수원"], ["Seoul", "서울"]],
  "student/s20-4": [["Gyeongju", "경주"], ["Silla", "신라"]],
  "student/s20-5": [["Halla", "한라"], ["Jeju", "제주"]],
  "grammar2/gh2-011": [["Seoul", "서울"]],
  "grammar2/gh2-011-1": [["Seoul", "서울"]],
  "grammar2/gh2-012": [["Han", "한"]],
  "grammar2/gh2-012-1": [["Han", "한"]],
  "grammar2/gh2-016": [["Seoul", "서울"]],
  "grammar2/gh2-016-1": [["Seoul", "서울"]],
  "grammar2/gh2-020": [["Seoul", "서울"]],
  "grammar2/gh2-020-1": [["Seoul", "서울"]],
  "grammar2/gh2-029": [["Seoul", "서울"], ["Kim", "김"]],
  "grammar2/gh2-029-1": [["Seoul", "서울"], ["Kim", "김"]],
  "grammar2/gh2-033": [["Busan", "부산"]],
  "grammar2/gh2-033-1": [["Busan", "부산"]],
  "grammar2/gh2-038": [["Gyeongsang-do", "경상도"], ["Busan", "부산"]],
  "grammar2/gh2-038-1": [["Gyeongsang-do", "경상도"], ["Busan", "부산"]],
  "grammar2/gh2-045": [["Kim", "김"]],
  "grammar2/gh2-045-1": [["Kim", "김"]],
  "reading/pr024": [["Seoul", "서울"]],
  "reading/pr024-1": [["Seoul", "서울"]],
  "reading/pr069": [["Heungdeok", "흥덕"], ["Cheongju", "청주"], ["Jikji", "직지"]],
  "reading/pr069-1": [["Heungdeok", "흥덕"], ["Cheongju", "청주"], ["Jikji", "직지"]],
  "reading/pr154": [["hanji", "한지"]],
  "reading/pr154-1": [["hanji", "한지"]],
  "reading/pr202": [["Hanseong Sunbo", "한성순보"], ["Hanseong Jubo", "한성주보"]],
  "reading/pr202-1": [["Hanseong Sunbo", "한성순보"], ["Hanseong Jubo", "한성주보"]],
  "ld/d169": [["1 1/2", "1 and a half"], ["1 1 2", "1 and a half"]],
  "ld/d169-1": [["1 1/2", "1 and a half"], ["1 1 2", "1 and a half"]],
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The string to speak for `text` on the page `lessonKey` ("<course>/<lesson id>", as the views
 * receive it). Whole words only (no letter or digit on either side), longest first ("Yi Sun-sin"
 * before "Yi"), exact case. No look-behind in the pattern: older iOS Safari throws on it.
 */
export function lessonSpeechForm(lessonKey: string, text: string): string {
  const words = LESSON_SPEECH_WORDS[lessonKey];
  if (!words || !text) return text;
  let out = text;
  for (const [written, spoken] of [...words].sort((a, b) => b[0].length - a[0].length)) {
    out = out.replace(new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(written)}(?![A-Za-z0-9])`, "g"), (_m, before: string) => `${before}${spoken}`);
  }
  return out;
}
