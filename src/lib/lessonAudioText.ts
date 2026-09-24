import type { Block, ReadingSentence } from "@/lib/types";

/**
 * What the lesson page's top "전체 듣기" player speaks.
 *
 * Moved out of `src/app/[course]/[lesson]/page.tsx` unchanged (7단계 7-2) so the
 * clip generator, the free-clip list and the audit can call the page's OWN
 * function instead of guessing: the player is always in synthesized-speech mode
 * outside CNN (`shouldUseUnifiedSpeech`), so every string returned here is a
 * clip the browser requests. Guessing got it wrong — a GRAMMAR I Korean item
 * that holds more Latin letters than Hangul ("수백 명의 군인들이(Hundreds of
 * soldiers) …") passes `isEnglishText`, and the player speaks it.
 *
 * PURE AND IMPORT-FREE (type imports only) so it can be transpiled alone.
 */

function isEnglishText(text: string): boolean {
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const hangul = (text.match(/[\uAC00-\uD7AF\u1100-\u11FF]/g) || []).length;
  return latin > hangul;
}

function cleanText(text: string): string {
  return text
    .replace(/^\s*\d+[\.\)]\s*/, "")
    .replace(/\s*\/\s*/g, " ")
    .trim();
}

/**
 * `speechForm` — how this course's items are SPOKEN, passed in by the caller for its course so this
 * file stays import-free (the page, the clip generator and the audit pass the same functions):
 *   STUDENT sentence items — listeningUtils `firstSlashAlternative` (BUG-028, 소유자 결정 2026-09-24:
 *     "He/She …" in its first form), applied BEFORE cleanText blanks the slash;
 *   VOCA grid words — vocaSpeech `vocaWordSpeech` (7단계 7-6, 소유자 결정 2026-09-24: a heteronym in
 *     the pronunciation of its card meaning, under its own clip name; the RE-005 bracket forms).
 * Any other course ignores it.
 */
export function extractSentencesForAudio(
  blocks: Block[],
  pairBlocks: Block[] | null | undefined,
  isScript: boolean,
  course: string,
  ldEnglishScript?: { n: string; ko: string; en: string }[] | null,
  readingSentences?: ReadingSentence[] | null,
  speechForm?: (text: string) => string,
): string[] {
  let targetBlocks = isScript && pairBlocks && pairBlocks.length > 0 ? pairBlocks : blocks;

  // LD course: prioritize actual model English script
  if (course === "ld") {
    if (ldEnglishScript && ldEnglishScript.length > 0) {
      const enList = ldEnglishScript.map((s) => cleanText(s.en)).filter(Boolean);
      if (enList.length > 0) return enList;
    }
    const hints = targetBlocks.find((b) => b.type === "hints") as { type: "hints"; text: string } | undefined;
    if (hints?.text) {
      const hintWords = hints.text.split(/[.,]/).map((w) => cleanText(w)).filter(Boolean);
      if (hintWords.length > 0) return hintWords;
    }
  }

  // READING passages are already restored as canonical 1:1 sentence pairs.
  // Using only the first legacy instruction block made the top player show
  // 1/1 and stop after a fragment even when the passage contained 5-10 lines.
  if (course === "reading" && readingSentences?.length) {
    return readingSentences.map((sentence) => cleanText(sentence.english)).filter(Boolean);
  }

  // Phonics / VOCA course: extract from wordgrid
  const wordgrid = targetBlocks.find((b) => b.type === "wordgrid") as { type: "wordgrid"; rows: string[][] } | undefined;
  if (wordgrid?.rows) {
    const say = course === "phonics" && speechForm ? speechForm : (t: string) => t;
    const words = wordgrid.rows.flat().map((w) => cleanText(say(w))).filter(Boolean);
    if (words.length > 0) return words;
  }

  // In grammar1 (or whenever targetBlocks has Korean sentences and pairBlocks has English sentences):
  // We MUST pick the English sentences so AudioPlayer reads the English lesson!
  // BUG-026 (7단계, 2026-09-24): a Korean item that carries English hints can hold more Latin
  // letters than Hangul — gh1-084 #1 "수백 명의 군인들이(Hundreds of soldiers) 그 도시를 떠나고
  // 있다. (leave)" — and was taken for English, so that one page read its 31 Korean questions
  // instead of the English answers every other page reads. Any Hangul now means Korean here.
  if (course !== "chinese") {
    const mainSent = blocks.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
    const pairSent = pairBlocks?.find((b) => b.type === "sentences") as { type: "sentences"; items: { text: string }[] } | undefined;
    if (pairSent?.items?.[0]?.text) {
      const hasHangul = (text: string) => /[가-힯]/.test(text);
      const mainIsEn = Boolean(mainSent?.items?.[0]?.text && isEnglishText(mainSent.items[0].text) && !hasHangul(mainSent.items[0].text));
      const pairIsEn = isEnglishText(pairSent.items[0].text) && !hasHangul(pairSent.items[0].text);
      if (!mainIsEn && pairIsEn) {
        targetBlocks = pairBlocks!;
      } else if (mainIsEn) {
        targetBlocks = blocks;
      }
    }
  }

  // 1. Sentences blocks — every one, in order. Only the first used to be read, so a lesson whose
  // items sit in two blocks (gh1-015: #1–#23 + #24–#43) played 23 of its 43 answers; 24 GRAMMAR
  // pages were split like this (6-1347). The step views already flatten the blocks.
  const sentItems = targetBlocks
    .filter((b) => b.type === "sentences")
    .flatMap((b) => (b as { type: "sentences"; items?: { text: string }[] }).items || []);
  if (sentItems.length > 0) {
    const spoken = course === "student" && speechForm ? speechForm : (t: string) => t;
    return sentItems.map((it) => cleanText(spoken(it.text))).filter(Boolean);
  }

  // 2. Dialogue / conversation courses (man, woman, student)
  if (["man", "woman", "student"].includes(course)) {
    const paras = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string; lang?: string }[];
    const enParas = paras
      .map((p) => cleanText(p.text))
      .filter((t) => {
        if (!t) return false;
        if (t.includes("K-IG") || t.includes("<font") || t.includes("한/영") || /^Chapter\s+\d/i.test(t) || t.endsWith(":")) return false;
        if (t === "Greeting and Introduction" || t === "My Personal and Educational Background") return false;
        return isEnglishText(t);
      });
    if (enParas.length > 0) {
      return enParas;
    }
  }

  // 3. Reading passage
  if (course === "reading") {
    const inst = targetBlocks.find((b) => b.type === "instruction");
    if (inst?.text) {
      return inst.text
        .split(/(?<=[.?!])\s+/)
        .map((s) => cleanText(s))
        .filter(Boolean);
    }
  }

  // Legacy speaking/listening courses store their full narration as a run of
  // instruction/hints blocks. When the historical MP3 is unavailable, feed
  // every English-bearing line to Ava instead of leaving the player silent.
  const legacyNarration = targetBlocks
    .filter((block) => block.type === "instruction" || block.type === "hints")
    .map((block) => cleanText(block.text))
    .filter((text) => /[A-Za-z\u3131-\u318e\u3400-\u9fff\uac00-\ud7a3]/u.test(text));
  if (legacyNarration.length > 0) return legacyNarration;

  // 4. Any paragraphs
  const allParas = targetBlocks.filter((b) => b.type === "paragraph") as { type: "paragraph"; text: string }[];
  if (allParas.length > 0) {
    return allParas.map((p) => cleanText(p.text)).filter(Boolean);
  }

  return [];
}
