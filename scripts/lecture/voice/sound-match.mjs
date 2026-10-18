/**
 * LECTURE voice — the pronunciation check's helpers (read-and-retime.mjs · make-voices.mjs).
 *
 * 1. "Was this English word said?" when the hearing wrote it in Hangul. Both hearings (Scribe · OpenAI) write some
 *    English the voice said in Hangul: edition → 에디션, shelter → 셸터, medium rare → 미디엄 레어 (200-lecture run,
 *    2026-10-18 — 70 of the 111 flags left). The word and the Hangul are compared by their CONSONANT SKELETONS in a
 *    coarse sound class (k/g → K, t/d → T, p/b/f/v → P, s/z/sh/th → S, j/ch → J, l/r → L, m, n): edition "TSN" ≈
 *    에디션 "TSN". Only for skeletons of 3+ consonants — short words (they · and · than · were) stay with the letter
 *    check, they are the ones the voice drops — plus a list of short words heard right and written otherwise.
 * 2. Did the reading's LAST word get said? The English check cannot see a dropped Korean ending ("…키울 수 있습니다.
 *    그래야죠." read without "그래야죠", lm057 #14, 2026-10-18).
 * 3. Where a piece's trailing English fragment starts (make-voices.mjs carries it to the next piece).
 */
const CHO = ["K", "K", "N", "T", "T", "L", "M", "P", "P", "S", "S", "", "J", "J", "J", "K", "T", "P", ""];
const JONG = ["", "K", "K", "KS", "N", "NJ", "N", "T", "L", "LK", "LM", "LP", "LS", "LT", "LP", "L", "M", "P", "PS", "S", "S", "N", "J", "J", "K", "T", "P", ""];

/** Hangul text → skeleton string (non-Hangul characters dropped). */
export function hangulSkeleton(s) {
  let out = "";
  for (const ch of s) {
    const c = ch.codePointAt(0) - 0xac00;
    if (c < 0 || c > 11171) continue;
    out += CHO[Math.floor(c / 588)] + JONG[c % 28];
  }
  return out;
}

/** English word → skeleton string in the same classes. */
export function englishSkeleton(w) {
  // a plural s and an r before a consonant or at the end are not said in a Korean loanword (helicopters → 헬리콥터)
  let s = w.toLowerCase().replace(/[^a-z]/g, "").replace(/(?<=[a-z]{3})e?s$/, "").replace(/r(?![aeiouy])/g, "");
  s = s
    .replace(/(t|s|c)ion/g, "SN").replace(/ture/g, "J").replace(/(tch|ch|dge|j)/g, "J").replace(/(sh|th|ss|zz)/g, "S")
    .replace(/ph/g, "P").replace(/gh/g, "").replace(/ck|qu|q|x/g, (m) => (m === "x" ? "KS" : "K")).replace(/ng$/, "N").replace(/c(?=[eiy])/g, "S").replace(/g(?=[eiy])/g, "J")
    .replace(/[kgc]/g, "K").replace(/[td]/g, "T").replace(/[pbfv]/g, "P").replace(/[sz]/g, "S").replace(/[lr]/g, "L")
    .replace(/m/g, "M").replace(/n/g, "N").replace(/[aeiouyhw]/g, "");
  return s.replace(/(.)\1+/g, "$1");
}

/**
 * Short words (skeleton under 3) the hearings write in Hangul or another spelling though the voice said them right — each
 * one listened to in the 200-lecture run (2026-10-18). Looked up as a Hangul word's start (a particle may follow).
 */
export const KOREAN_SPELLING = {
  which: ["위치"], rare: ["레어"], tide: ["타이드"], tides: ["타이드"], took: ["툭", "톡"], are: ["r", "알"], hotel: ["호텔"],
  train: ["트레인"], mail: ["메일"], care: ["케어"], call: ["콜"], idea: ["아이디어"], while: ["와일"], vile: ["바일"],
  lane: ["레인"], meter: ["미터", "m"], show: ["쇼"], club: ["클럽"], rowed: ["rode"], travelled: ["traveled"],
  travelling: ["traveling"], theatre: ["theater"], likeable: ["likable"], interpretor: ["interpreter"], end: ["엔드"],
  machine: ["머신"], picture: ["픽처", "피처"], ads: ["add", "애드"], brewery: ["브루어리"], panning: ["패닝"], haywood: ["헤이우드"],
};

/** Where a piece's trailing fragment starts (just after its last inner sentence end), or −1 when it has none to carry. */
export function carryPoint(text) {
  const t = text.trimEnd();
  let at = -1;
  for (const m of t.matchAll(/[.?!](?=\s)/g)) if (m.index < t.length - 1) at = m.index + 1;
  if (at < 0) return -1;
  const frag = t.slice(at).trim();
  // only a short fragment that holds English (a sentence's lead-in), never a whole Korean sentence
  return frag.length <= 40 && /[A-Za-z]{2,}/.test(frag) ? at : -1;
}

const lev = (a, b) => {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
};

/**
 * Did a hearing that wrote `heard` catch English `word` in Hangul? One Hangul word must START with the English word's
 * skeleton (a particle may follow: 에디션이죠) — exactly for a 3-consonant skeleton, one class edit allowed from 4.
 */
export function saidInHangul(word, heard) {
  const lower = heard.toLowerCase();
  if ((KOREAN_SPELLING[word] || []).some((h) => new RegExp(`(^|[^가-힣a-z])${h}`).test(lower))) return true;
  const sk = englishSkeleton(word);
  if (sk.length < 3) return false;
  const allowed = sk.length >= 4 ? 1 : 0;
  for (const token of heard.split(/[\s,.?!·]+/)) {
    const t = hangulSkeleton(token).replace(/(.)\1+/g, "$1");
    if (t.length < sk.length - allowed) continue;
    for (const len of [sk.length - 1, sk.length, sk.length + 1]) if (len >= 2 && lev(sk, t.slice(0, len)) <= allowed) return true;
  }
  return false;
}

const squash = (s) => s.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
const NUMBER_SYLLABLES = /^[일이삼사오육칠팔구십백천만억영공번년도월분초개명층]+$/;

/**
 * Is the reading's last word missing from the end of what was heard? The text's last word (and the one before it, when
 * the last is a 1–2 letter filler such as "자," "네") is looked for among the heard words of the reading's last 35 %,
 * by letters (similarity 0.6+) or — English — by sound in Hangul. Not judged: a number word (Scribe writes digits), a
 * reading of fewer than 3 words.
 */
export function lastWordMissing(text, heardWords) {
  const words = text.split(/\s+/).map(squash).filter(Boolean);
  if (words.length < 3 || !heardWords.length) return false;
  const last = words.at(-1);
  if (NUMBER_SYLLABLES.test(last) || /\d/.test(last)) return false;
  const tail = heardWords.slice(Math.floor(heardWords.length * 0.65)).map(squash).filter(Boolean);
  if (/^[a-z-]+$/.test(last) && tail.some((h) => /\d/.test(h))) return false; // "…one four three" heard as 143
  const sim = (a, b) => 1 - lev(a, b) / Math.max(a.length, b.length);
  const found = (w) => tail.some((h) => sim(w, h) >= 0.6 || h.includes(w) || (w.length >= 3 && w.includes(h) && h.length >= 2)) || (/^[a-z]/.test(w) && saidInHangul(w.replace(/[^a-z]/g, ""), tail.join(" "))) || tail.join("").includes(w);
  return !found(last);
}
