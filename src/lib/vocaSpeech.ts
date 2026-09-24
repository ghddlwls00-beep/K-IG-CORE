/**
 * What to SAY for a VOCA headword that is written with a bracket (RE-005).
 *
 * Fourteen headwords carry a parenthetical so the card can teach two spellings
 * at once — `colo(u)r`, `gray(grey)`, `autumn(=fall)`. The bracket belongs on
 * the screen: it is the thing being taught. It does not belong in the audio,
 * where Ava reads the punctuation out loud.
 *
 * So the written form stays exactly as it is in `content/`, and only the string
 * handed to speech is swapped. Nothing else about the card changes.
 *
 * WHY A TABLE AND NOT A RULE. The brackets look uniform and are not:
 *
 *   colo(u)r        optional letters — the British form is the longer one
 *   enrol(l)        optional letters — the AMERICAN form is the longer one
 *   gray(grey)      not optional letters at all, but an alternative spelling
 *   autumn(=fall)   not a spelling at all, but a synonym gloss
 *
 * "Delete the parenthetical" would give `enrol`, and "keep it" would give
 * `autumn=fall`. Either rule is wrong somewhere, so each of the fourteen is
 * written out and was checked against how the word is actually said. Twelve of
 * the pairs are homophones, so the choice between them is only about which
 * spelling is standard; `afterward(s)` and `autumn(=fall)` are the two where
 * the reading genuinely had to be decided.
 *
 * This module is loaded BOTH by the VOCA view and by
 * `scripts/generate-azure-ava.mjs` (through its `loadTsModule`), so the clip
 * that gets generated and the clip that gets requested cannot drift apart.
 * Keep it free of imports — `loadTsModule` transpiles it on its own and throws
 * if it gains one.
 */
export const VOCA_SPEECH_FORMS: Record<string, string> = {
  "judg(e)ment": "judgment",
  "medi(a)eval": "medieval",
  "marvel(l)ous": "marvelous",
  "enrol(l)": "enroll",
  "colo(u)r": "color",
  "neighbo(u)r": "neighbor",
  "favo(u)r": "favor",
  "humo(u)r": "humor",
  "gray(grey)": "gray",
  "afterward(s)": "afterward",
  "autumn(=fall)": "autumn",
  "hono(u)r": "honor",
  "dialog(ue)": "dialogue",
  "labo(u)r": "labor",
};

/**
 * The string to synthesize for `text`. Anything not in the table is returned
 * untouched — this must never become a general bracket-stripping rule, because
 * the same shape means a fill-in blank in STUDENT and an optional word in
 * GRAMMAR (`I have a lot of friends who(m) I love to be around.`).
 */
export function vocaSpeechForm(text: string): string {
  if (!text) return text;
  return VOCA_SPEECH_FORMS[text.trim()] ?? text;
}

/**
 * VOCA headwords whose pronunciation depends on the meaning (7단계 7-6 — 소유자 결정 2026-09-24,
 * 질문 6 나): all twenty said in the pronunciation of the meaning the card shows).
 *
 * The card shows ONE meaning (content/voca_dictionary.json) — `sow` "(씨를) 뿌리다", `wind`
 * "바람", `graduate` "졸업하다" — but the clips were made from the bare word, so which reading
 * each clip holds was nobody's choice: the owner heard "사우" (a female pig) for `sow` on its card.
 * Each value is the IPA of the meaning on the card (US).
 *
 * A VOCA word button says `<word> ⟨<ipa>⟩` (vocaWordSpeech). The tag survives
 * normalizeUnifiedSpeechText, so the clip gets a NEW name: production clips are cached
 * `immutable` for a year, and overwriting the old name would leave the old sound with everyone
 * who already heard it. scripts/generate-azure-ava.mjs turns the tag into
 * `<phoneme alphabet="ipa">`; the browser-voice fallback in speech.ts drops it. READING cards that
 * share a word (lead · live · minute · produce · increase · refuse) keep asking for the bare word —
 * only the VOCA view uses the tagged form, so their sound does not change.
 */
export const VOCA_PRONUNCIATIONS: Record<string, string> = {
  sow: "soʊ",
  row: "roʊ",
  lead: "liːd",
  wind: "wɪnd",
  live: "lɪv",
  wound: "wuːnd",
  minute: "ˈmɪnɪt",
  resume: "rɪˈzuːm",
  produce: "prəˈduːs",
  increase: "ɪnˈkriːs",
  decrease: "dɪˈkriːs",
  digest: "daɪˈdʒɛst",
  transfer: "trænsˈfɝː",
  converse: "kənˈvɝːs",
  convert: "kənˈvɝːt",
  extract: "ɪkˈstrækt",
  insert: "ɪnˈsɝːt",
  reject: "rɪˈdʒɛkt",
  refuse: "rɪˈfjuːz",
  graduate: "ˈɡrædʒueɪt",
  // 관문 15 전수 읽기(hv-50, 소유자 결정 2026-09-24): the card shows the verb "보완하다" — full "-ment", not the noun's weak one
  complement: "ˈkɑːmpləmɛnt",
};

/** What a VOCA word button says: the pronunciation-tagged form of the words above, else the spoken form. */
export function vocaWordSpeech(word: string): string {
  if (!word) return word;
  const ipa = VOCA_PRONUNCIATIONS[word.trim()];
  return ipa ? `${word.trim()} ⟨${ipa}⟩` : vocaSpeechForm(word);
}

/**
 * READING word cards — BUG-029 (소유자 결정 2026-09-24 "읽기 카드도 화면 뜻대로 발음").
 *
 * A READING card shows its own meaning (readingVocabulary `korean`), and cards used to say the
 * bare word — one clip per spelling — so `increase` on a card that says "증가" (a noun,
 * /ˈɪnkriːs/) and on one that says "늘리다" (a verb, /ɪnˈkriːs/) played the same sound, wrong for
 * one of them. A card now says the pronunciation of ITS meaning, under a tagged name like the VOCA
 * words (`<word> ⟨<ipa>⟩`): the rule whose pattern matches the card's Korean gives the IPA. The
 * rules of one word must not overlap — a noun pattern skips the "…하다" verb built on it
 * (/기록(?!하)/ for "기록", so "기록하다" is only the verb's) — because an overlap lets the first rule
 * win silently: pr246 'combat' "싸움 (locked in combat 맞붙어 싸우는)" took the verb sound through
 * the "싸우" of its example gloss (found by the 3차 점검 suggestion, 2026-09-24). The same meaning as
 * a VOCA card uses the same IPA string, so the same clip. docs/qa-2026-09-18/scripts/check-reading-pronunciations.cjs
 * fails on a card of a listed word that matches no rule (it would keep the bare word), on one that
 * matches rules with different sounds, and on a noun/verb stress pair given against the card's
 * part of speech — a new card cannot slip through silently.
 */
export const READING_PRONUNCIATIONS: Record<string, { meaning: RegExp; ipa: string }[]> = {
  // the six the VOCA table also has (same meaning → same IPA → same clip)
  increase: [{ meaning: /늘리다|늘다|높이다|증가하다/, ipa: "ɪnˈkriːs" }, { meaning: /증가(?!하)|인상/, ipa: "ˈɪnkriːs" }],
  minute: [{ meaning: /분|순간|잠깐/, ipa: "ˈmɪnɪt" }, { meaning: /미세|사소/, ipa: "maɪˈnuːt" }],
  live: [{ meaning: /살다|거주/, ipa: "lɪv" }, { meaning: /살아 있는|생생|생방송|라이브/, ipa: "laɪv" }],
  produce: [{ meaning: /만들어|생산|낳|일으키|제작/, ipa: "prəˈduːs" }, { meaning: /농산물/, ipa: "ˈproʊduːs" }],
  lead: [{ meaning: /일으키|이끌|하게|안내|선도/, ipa: "liːd" }, { meaning: /납/, ipa: "lɛd" }],
  refuse: [{ meaning: /거부|거절/, ipa: "rɪˈfjuːz" }, { meaning: /쓰레기|폐기물/, ipa: "ˈrɛfjuːs" }],
  // the same kind, on READING cards only
  record: [{ meaning: /기록하|녹음하/, ipa: "rɪˈkɔːrd" }, { meaning: /기록(?!하)|음반/, ipa: "ˈrɛkərd" }],
  present: [{ meaning: /present oneself|제시하|발표하|수여하|주다/, ipa: "prɪˈzɛnt" }, { meaning: /현재|선물|참석한/, ipa: "ˈprɛzənt" }],
  object: [{ meaning: /반대하/, ipa: "əbˈdʒɛkt" }, { meaning: /물체|대상|목적/, ipa: "ˈɑːbdʒɪkt" }],
  content: [{ meaning: /be content with|만족/, ipa: "kənˈtɛnt" }, { meaning: /함량|내용|목차/, ipa: "ˈkɑːntɛnt" }],
  close: [{ meaning: /닫|폐쇄|끝내/, ipa: "kloʊz" }, { meaning: /가까운|친밀|면밀/, ipa: "kloʊs" }],
  use: [{ meaning: /사용하|이용하|쓰다/, ipa: "juːz" }, { meaning: /사용(?!하)|용도|쓸모/, ipa: "juːs" }],
  conduct: [{ meaning: /수행하|지휘하|실시하/, ipa: "kənˈdʌkt" }, { meaning: /행동|처신|행위/, ipa: "ˈkɑːndʌkt" }],
  subject: [{ meaning: /종속시키|복종시키/, ipa: "səbˈdʒɛkt" }, { meaning: /주제|분야|과목|subject to|겪기|받기 쉬운/, ipa: "ˈsʌbdʒɪkt" }],
  progress: [{ meaning: /진행하|나아가/, ipa: "prəˈɡrɛs" }, { meaning: /발전|진전|진보/, ipa: "ˈprɑːɡrɛs" }],
  conflict: [{ meaning: /상충하|엇갈리|충돌하/, ipa: "kənˈflɪkt" }, { meaning: /갈등|충돌(?!하)|분쟁/, ipa: "ˈkɑːnflɪkt" }],
  survey: [{ meaning: /조사하|살피/, ipa: "sɚˈveɪ" }, { meaning: /조사(?!하)|설문/, ipa: "ˈsɝːveɪ" }],
  combat: [{ meaning: /싸우다|방지하|퇴치하/, ipa: "kəmˈbæt" }, { meaning: /싸움|전투/, ipa: "ˈkɑːmbæt" }],
  separate: [{ meaning: /separate A from B|분리하|떼어|구분하/, ipa: "ˈsɛpəreɪt" }, { meaning: /분리된|별개의|따로/, ipa: "ˈsɛpərət" }],
  // the forms the cards print ("increased", "objects" …) — keyed by the card's spelling; `objects` is a
  // noun on three cards ("사물") and a verb on one ("(object to) ~에 반대하다"), the same split as `increase`
  increases: [{ meaning: /늘|높/, ipa: "ɪnˈkriːsɪz" }],
  increased: [{ meaning: /늘|증가|커지|높/, ipa: "ɪnˈkriːst" }],
  increasing: [{ meaning: /늘|높|증가/, ipa: "ɪnˈkriːsɪŋ" }],
  minutes: [{ meaning: /분|회의록/, ipa: "ˈmɪnɪts" }],
  living: [{ meaning: /살|생계|생활/, ipa: "ˈlɪvɪŋ" }],
  lived: [{ meaning: /살/, ipa: "lɪvd" }],
  produces: [{ meaning: /생산|만들어|일으키|낳/, ipa: "prəˈduːsɪz" }],
  produced: [{ meaning: /일으키|생기|만들어|생산|낳|펴내/, ipa: "prəˈduːst" }],
  producing: [{ meaning: /만들어|내뿜|생산|일으키/, ipa: "prəˈduːsɪŋ" }],
  leads: [{ meaning: /이끌|이어지|하게|일으키/, ipa: "liːdz" }],
  leading: [{ meaning: /이끌|하게|선도|이어지/, ipa: "ˈliːdɪŋ" }],
  led: [{ meaning: /이어지|이끌|하게|일으키/, ipa: "lɛd" }],
  recorded: [{ meaning: /기록|녹음/, ipa: "rɪˈkɔːrdɪd" }],
  objects: [{ meaning: /반대/, ipa: "əbˈdʒɛkts" }, { meaning: /사물|물체|대상|목적/, ipa: "ˈɑːbdʒɪkts" }],
  used: [{ meaning: /쓰이|사용되|이용되/, ipa: "juːzd" }],
  using: [{ meaning: /사용|활용|이용/, ipa: "ˈjuːzɪŋ" }],
  subjects: [{ meaning: /피사체|주제|과목|대상|국민/, ipa: "ˈsʌbdʒɪkts" }],
  conflicts: [{ meaning: /상충하|엇갈리|충돌하/, ipa: "kənˈflɪkts" }, { meaning: /갈등|충돌(?!하)|분쟁/, ipa: "ˈkɑːnflɪkts" }],
  separated: [{ meaning: /떼어|분리|갈라/, ipa: "ˈsɛpəreɪtɪd" }],
  upsets: [{ meaning: /속상하게|뒤엎|망치/, ipa: "ʌpˈsɛts" }, { meaning: /동요|속상함|혼란|이변/, ipa: "ˈʌpsɛts" }],
  graduates: [{ meaning: /졸업하/, ipa: "ˈɡrædʒueɪts" }, { meaning: /졸업생/, ipa: "ˈɡrædʒuəts" }],
  permits: [{ meaning: /허락하|허용하|허가하/, ipa: "pɚˈmɪts" }, { meaning: /허가증|허가서/, ipa: "ˈpɝːmɪts" }],
  perfected: [{ meaning: /완성|완벽하게/, ipa: "pɚˈfɛktɪd" }],
  wounds: [{ meaning: /상처|부상/, ipa: "wuːndz" }],
  exports: [{ meaning: /수출하/, ipa: "ɪkˈspɔːrts" }, { meaning: /수출(?!하)/, ipa: "ˈɛkspɔːrts" }],
  imports: [{ meaning: /수입하/, ipa: "ɪmˈpɔːrts" }, { meaning: /수입품|수입(?!하)/, ipa: "ˈɪmpɔːrts" }],
  associated: [{ meaning: /연관|관련|연상/, ipa: "əˈsoʊʃieɪtɪd" }],
  associates: [{ meaning: /연관 짓|연상하|관련시키/, ipa: "əˈsoʊʃieɪts" }, { meaning: /동료|동업자/, ipa: "əˈsoʊʃiəts" }],
  attributed: [{ meaning: /돌리|탓|덕분|원인/, ipa: "əˈtrɪbjutɪd" }],
  advocates: [{ meaning: /옹호하|주장하/, ipa: "ˈædvəkeɪts" }, { meaning: /옹호자|지지자/, ipa: "ˈædvəkəts" }],
  rejects: [{ meaning: /거부하|거절하/, ipa: "rɪˈdʒɛkts" }, { meaning: /불량품|불합격/, ipa: "ˈriːdʒɛkts" }],
  decreases: [{ meaning: /줄다|줄이|감소하|낮추/, ipa: "dɪˈkriːsɪz" }, { meaning: /감소(?!하)/, ipa: "ˈdiːkriːsɪz" }],
  extracted: [{ meaning: /뽑아|추출|발췌/, ipa: "ɪkˈstræktɪd" }],
};

/** What a READING word card says: the tagged form for its meaning when the word is listed above, else the word. */
export function readingWordSpeech(word: string, meaning?: string | null): string {
  if (!word) return word;
  const rules = READING_PRONUNCIATIONS[word.trim().toLowerCase()];
  if (!rules) return word;
  const rule = rules.find((r) => r.meaning.test(String(meaning || "")));
  return rule ? `${word.trim()} ⟨${rule.ipa}⟩` : word;
}

/** `<word> ⟨<ipa>⟩` → [word, ipa] (the generator's SSML), or null for any other text. */
export function pronunciationTag(text: string): [string, string] | null {
  const m = /^(.+?)\s*⟨([^⟩]+)⟩$/.exec(text.trim());
  return m ? [m[1], m[2]] : null;
}

/** The same text without the tag — what a browser voice may read if the clip is ever unavailable. */
export function withoutPronunciationTag(text: string): string {
  return text.replace(/\s*⟨[^⟩]*⟩/g, "").trim();
}
