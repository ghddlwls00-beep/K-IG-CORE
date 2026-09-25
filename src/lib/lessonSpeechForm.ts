/**
 * What to SAY for a lesson's English where the written form would be read wrongly — per page,
 * so the screen keeps exactly what it teaches and only the string handed to speech changes.
 *
 * 1. Korean words written in romanization sound Korean (소유자 결정 2026-09-25 · 방식 2026-09-26).
 *    The owner heard STUDENT 20-2 read 'Bulguksa' and 'Songnisan' by English rules. The rule (owner's
 *    answer "이것도 바꿔"): a Korean word written in romanization sounds Korean even when English has a
 *    settled pronunciation for it (Seoul · kimchi · Mr. Kim). "Korea" and "Korean" are English words and
 *    stay. LISTENING's Kim (d011 · d012 · d025 · d026) is an American and stays — which is why this is a
 *    table per page and never a global word swap. The pages cover every sentence the app speaks that
 *    holds such a word: 56 of the 15,334 spoken texts (STUDENT 39 · GRAMMAR II 11 · READING 6), found by
 *    the '학습 내용 재검토1' session (docs/qa-2026-09-18/내용-재검토/한국어-발음/결과.md).
 *    HOW it is said changed once. The first fix (397f1e8) handed speech the Hangul, and the generator
 *    wrapped it in <lang xml:lang="ko-KR"> inside the English voice — the voice switched language for one
 *    word, with a pause before it, and the owner heard it as a mess ("경주 제대로 수정 안됬네 엉망인데",
 *    2026-09-26). Of five versions of STUDENT 20-4 played side by side the owner chose "라": the SAME
 *    English voice reads the whole sentence without switching, and the word carries an IPA tag
 *    (`Gyeongju ⟨ˈkjʌŋˌdʒu⟩` — the VOCA heteronym convention, vocaSpeech.ts), which
 *    scripts/generate-azure-ava.mjs turns into <phoneme alphabet="ipa"> and the browser-voice fallback in
 *    speech.ts drops. The IPA is the Korean word in US-English sounds: a lenis ㄱ ㄷ ㅂ ㅈ at the start
 *    of a word as g d b dʒ (an English initial g/d/b is unaspirated, like the Korean), ㅓ as ʌ, ㅡ as ʊ,
 *    one stress mark per syllable (Korean has no word stress) — 경주 and 신라 exactly as approved.
 *    A phrase (Yi Sun-sin · Hong Gil Dong · Hanseong Sunbo) carries one tag per word, so the generator
 *    reads each tag with the word right before it.
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

/** A Korean word written in romanization → [the Korean word it stands for, the IPA of each written word]. */
export const KOREAN_WORD_SOUNDS: Record<string, [string, string[]]> = {
  "Hong Gil Dong": ["홍길동", ["ˈhoʊŋ", "ˈɡil", "ˈdoʊŋ"]],
  Seoul: ["서울", ["ˈsʌˌul"]],
  bulgogi: ["불고기", ["ˈbulˌɡoʊˌɡi"]],
  Bulgogi: ["불고기", ["ˈbulˌɡoʊˌɡi"]],
  Gangwon: ["강원", ["ˈɡɑŋˌwʌn"]],
  "Yi Sun-sin": ["이순신", ["ˈi", "ˈsunˌʃin"]],
  Yi: ["이", ["ˈi"]],
  Gojoseon: ["고조선", ["ˈɡoʊˌdʒoʊˌsʌn"]],
  Hwanung: ["환웅", ["ˈhwɑˌnuŋ"]],
  Ungnyeo: ["웅녀", ["ˈuŋˌnjʌ"]],
  Hwanin: ["환인", ["ˈhwɑˌnin"]],
  Dangun: ["단군", ["ˈdɑnˌɡun"]],
  Goguryeo: ["고구려", ["ˈɡoʊˌɡuˌrjʌ"]],
  Baekje: ["백제", ["ˈbɛkˌdʒɛ"]],
  Silla: ["신라", ["ˈʃɪlə"]],
  Goryeo: ["고려", ["ˈɡoʊˌrjʌ"]],
  Joseon: ["조선", ["ˈdʒoʊˌsʌn"]],
  Seollal: ["설날", ["ˈsʌlˌlɑl"]],
  Chuseok: ["추석", ["ˈtʃuˌsʌk"]],
  songpyeon: ["송편", ["ˈsoʊŋˌpjʌn"]],
  hanbok: ["한복", ["ˈhɑnˌboʊk"]],
  kimchi: ["김치", ["ˈkimˌtʃi"]],
  Sejong: ["세종", ["ˈsɛˌdʒoʊŋ"]],
  Hangul: ["한글", ["ˈhɑnˌɡʊl"]],
  Songnisan: ["속리산", ["ˈsoʊŋˌniˌsɑn"]],
  Bulguksa: ["불국사", ["ˈbulˌɡukˌsɑ"]],
  Gyeonggi: ["경기", ["ˈkjʌŋˌɡi"]],
  Yongin: ["용인", ["ˈjoʊŋˌin"]],
  Suwon: ["수원", ["ˈsuˌwʌn"]],
  Gyeongju: ["경주", ["ˈkjʌŋˌdʒu"]],
  Halla: ["한라", ["ˈhɑlˌlɑ"]],
  Jeju: ["제주", ["ˈdʒɛˌdʒu"]],
  Han: ["한", ["ˈhɑn"]],
  Kim: ["김", ["ˈkim"]],
  Busan: ["부산", ["ˈbuˌsɑn"]],
  "Gyeongsang-do": ["경상도", ["ˈkjʌŋˌsɑŋˌdoʊ"]],
  Heungdeok: ["흥덕", ["ˈhʊŋˌdʌk"]],
  Cheongju: ["청주", ["ˈtʃʌŋˌdʒu"]],
  Jikji: ["직지", ["ˈdʒikˌdʒi"]],
  hanji: ["한지", ["ˈhɑnˌdʒi"]],
  "Hanseong Sunbo": ["한성순보", ["ˈhɑnˌsʌŋ", "ˈsunˌboʊ"]],
  "Hanseong Jubo": ["한성주보", ["ˈhɑnˌsʌŋ", "ˈdʒuˌboʊ"]],
};

/** Which romanized Korean words each page says in Korean — per page, so an American "Kim" elsewhere stays English. */
const KOREAN_WORD_PAGES: Record<string, string[]> = {
  "student/s1-2": ["Hong Gil Dong", "Seoul"],
  "student/s8-3": ["bulgogi"],
  "student/s12-3": ["Gangwon"],
  "student/s13-2": ["Yi Sun-sin", "Yi"],
  "student/s13-3": ["Yi Sun-sin", "Yi"],
  "student/s17-1": ["Gojoseon", "Hwanung", "Ungnyeo", "Hwanin", "Dangun"],
  "student/s17-2": ["Gojoseon", "Goguryeo", "Baekje", "Silla"],
  "student/s17-3": ["Goryeo", "Joseon", "Silla"],
  "student/s18-1": ["Seollal", "Chuseok"],
  "student/s18-2": ["Seollal"],
  "student/s18-3": ["songpyeon", "Chuseok"],
  "student/s19-2": ["hanbok"],
  "student/s19-3": ["bulgogi", "Bulgogi", "kimchi"],
  "student/s19-4": ["Sejong", "Hangul"],
  "student/s20-2": ["Songnisan", "Bulguksa"],
  "student/s20-3": ["Gyeonggi", "Yongin", "Suwon", "Seoul"],
  "student/s20-4": ["Gyeongju", "Silla"],
  "student/s20-5": ["Halla", "Jeju"],
  "grammar2/gh2-011": ["Seoul"],
  "grammar2/gh2-011-1": ["Seoul"],
  "grammar2/gh2-012": ["Han"],
  "grammar2/gh2-012-1": ["Han"],
  "grammar2/gh2-016": ["Seoul"],
  "grammar2/gh2-016-1": ["Seoul"],
  "grammar2/gh2-020": ["Seoul"],
  "grammar2/gh2-020-1": ["Seoul"],
  "grammar2/gh2-029": ["Seoul", "Kim"],
  "grammar2/gh2-029-1": ["Seoul", "Kim"],
  "grammar2/gh2-033": ["Busan"],
  "grammar2/gh2-033-1": ["Busan"],
  "grammar2/gh2-038": ["Gyeongsang-do", "Busan"],
  "grammar2/gh2-038-1": ["Gyeongsang-do", "Busan"],
  "grammar2/gh2-045": ["Kim"],
  "grammar2/gh2-045-1": ["Kim"],
  "reading/pr024": ["Seoul"],
  "reading/pr024-1": ["Seoul"],
  "reading/pr069": ["Heungdeok", "Cheongju", "Jikji"],
  "reading/pr069-1": ["Heungdeok", "Cheongju", "Jikji"],
  "reading/pr154": ["hanji"],
  "reading/pr154-1": ["hanji"],
  "reading/pr202": ["Hanseong Sunbo", "Hanseong Jubo"],
  "reading/pr202-1": ["Hanseong Sunbo", "Hanseong Jubo"],
};

/** The written word with its IPA tag — one tag per written word of a phrase ("Yi ⟨ˈi⟩ Sun-sin ⟨ˈsunˌʃin⟩"). */
function korean(written: string): string {
  const sound = KOREAN_WORD_SOUNDS[written];
  if (!sound) throw new Error(`lessonSpeechForm: no sound for "${written}"`);
  const words = written.split(" ");
  if (words.length !== sound[1].length) throw new Error(`lessonSpeechForm: "${written}" has ${words.length} words but ${sound[1].length} tags`);
  return words.map((word, i) => `${word} ⟨${sound[1][i]}⟩`).join(" ");
}

/** Per page: [what is written, what to say]. */
export const LESSON_SPEECH_WORDS: Record<string, [string, string][]> = {
  ...Object.fromEntries(Object.entries(KOREAN_WORD_PAGES).map(([page, words]) => [page, words.map((w) => [w, korean(w)] as [string, string])])),
  "ld/d169": [["1 1/2", "1 and a half"], ["1 1 2", "1 and a half"]],
  "ld/d169-1": [["1 1/2", "1 and a half"], ["1 1 2", "1 and a half"]],
};

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The string to speak for `text` on the page `lessonKey` ("<course>/<lesson id>", as the views
 * receive it). Whole words only (no letter or digit on either side), longest first ("Yi Sun-sin"
 * before "Yi"), exact case — in ONE pass, because the spoken form keeps the written word: a second
 * pass would tag "Yi" again inside "Yi ⟨ˈi⟩ Sun-sin ⟨…⟩". No look-behind in the pattern: older iOS
 * Safari throws on it.
 */
export function lessonSpeechForm(lessonKey: string, text: string): string {
  const words = LESSON_SPEECH_WORDS[lessonKey];
  if (!words || !text) return text;
  const spoken = new Map(words);
  const alternatives = [...spoken.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${alternatives})(?![A-Za-z0-9])`, "g"), (_m, before: string, written: string) => `${before}${spoken.get(written)}`);
}
