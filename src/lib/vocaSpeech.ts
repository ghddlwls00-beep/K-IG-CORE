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
};

/** What a VOCA word button says: the pronunciation-tagged form of the words above, else the spoken form. */
export function vocaWordSpeech(word: string): string {
  if (!word) return word;
  const ipa = VOCA_PRONUNCIATIONS[word.trim()];
  return ipa ? `${word.trim()} ⟨${ipa}⟩` : vocaSpeechForm(word);
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
