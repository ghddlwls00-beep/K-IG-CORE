import "server-only";

import { getVocaDictionary } from "./content";
import { partnerFormsOf, type PartnerWords } from "./passoffLesson";
import { isIrregularOtherForm } from "./passoffWordForms";
import type { PassoffProduceItem } from "./passoffTypes";
import type { Block } from "./types";

/**
 * PASS-OFF GRAMMAR — the word tiles' grammar partners, worked out ON THE SERVER (회귀 점검 1002 A3, 2026-10-05).
 *
 * Ladder step ③ of a ④ · ⑤ sentence shows its words as tiles with two grammar distractors (passoffLesson.ts contrastPool):
 * the item's error-pattern words, then the "other number or person" of a word it drills (likes → like · box → boxes). That
 * partner used to be made by spelling alone on the phone, so a word with no number or person got a made-up one — "whens" ·
 * "hows" · "buts" · "saids" · "alway" · "quicklies" in about 210 of the 1,290 items. Telling a real word from a made-up one
 * needs a word list, and a word list built from the lessons must not ship to every phone (the paid lessons' words — the
 * same reason the irregular-verb table lives in passoffWordForms.ts). So the server keeps the list and attaches each ④ · ⑤
 * item's partners — only real words — as `partnerForms`, on what a page or the review already decided to hand out.
 *
 * A real word: one of the VOCA dictionary (content/voca_dictionary.json) or of the lesson's own English — its model answers,
 * accepted answers, prompts and target words, the paid sentences included (never its error patterns, options or tiles,
 * which hold wrong forms on purpose). The lesson's own words decide the same for a free page and a licensed one; what goes
 * out is a form of the item's own word, never lesson text. Which words get no partner at all — question words,
 * conjunctions, adverbs, past forms … — is passoffLesson.ts partnersOf's.
 */

let dictionaryWords: Set<string> | null = null;

/** the dictionary's one-word headwords, lower-cased (a phrase headword — "look after" — is no tile) */
function dictionary(): Set<string> {
  if (!dictionaryWords) {
    dictionaryWords = new Set();
    for (const headword of Object.keys(getVocaDictionary())) if (/^[A-Za-z]+$/.test(headword)) dictionaryWords.add(headword.toLowerCase());
  }
  return dictionaryWords;
}

/** the fields of a lesson that hold right English: model answers (anchors' and ④ · ⑤'s), accepted answers, prompts, targets */
const ENGLISH_FIELDS = new Set(["en", "promptEn", "accept", "targets"]);

function collectEnglish(value: unknown, into: Set<string>, inEnglish: boolean): void {
  if (typeof value === "string") {
    if (inEnglish) for (const w of value.toLowerCase().match(/[a-z]+/g) ?? []) into.add(w);
  } else if (Array.isArray(value)) {
    for (const v of value) collectEnglish(v, into, inEnglish);
  } else if (value && typeof value === "object") {
    for (const [key, v] of Object.entries(value)) collectEnglish(v, into, inEnglish || ENGLISH_FIELDS.has(key));
  }
}

/**
 * What tells a real word for one lesson: the dictionary and the lesson's own right English. `sources`: the lesson's blocks
 * and, when it has them, its paid supplement's items (passoffContent.ts — whether or not this request may see them).
 */
export function lessonPartnerWords(sources: readonly unknown[]): PartnerWords {
  const own = new Set<string>();
  collectEnglish(sources, own, false);
  const known = dictionary();
  return { isWord: (word) => known.has(word) || own.has(word), irregular: isIrregularOtherForm };
}

function withPartnerForms<T extends PassoffProduceItem>(item: T, words: PartnerWords): T {
  if (!item || typeof item.en !== "string") return item;
  const partnerForms = partnerFormsOf(item, words);
  return partnerForms.length ? { ...item, partnerForms } : item;
}

/**
 * The view blocks with each ④ produce · ⑤ transfer item's `partnerForms` attached (none when it has no real partner — the
 * phone then shows none either: contrastPool's own fallback is the contrast table, whose partners are always among these).
 */
export function attachPartnerForms(blocks: readonly Block[], words: PartnerWords): Block[] {
  return blocks.map((block) => {
    if (!block || block.type !== "drill") return block;
    return {
      ...block,
      ...(Array.isArray(block.produce) ? { produce: block.produce.map((item) => withPartnerForms(item, words)) } : {}),
      ...(Array.isArray(block.transfer) ? { transfer: block.transfer.map((item) => withPartnerForms(item, words)) } : {}),
    };
  });
}
