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
