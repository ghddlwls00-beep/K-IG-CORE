/**
 * GRAMMAR Step 1 — grading what the MICROPHONE heard (GRM-L09, 2026-09-27). Microphone path only:
 * a typed answer is graded by grammarGrading.ts as it always was, and nothing here is used for it.
 *
 * Speech recognisers write numbers as digits — "It is 7 o'clock", "about $100", "50%" — while the
 * model answers mostly spell them out ("It is seven o'clock."). Graded as typed text, a learner who
 * SAID the right sentence was told it was wrong (the checker measured 'It is 7 o'clock' against
 * 'It is seven o'clock.' → incorrect; 49 GRAMMAR II model answers carry a number). So both sides are
 * brought to one spelling first — numbers 0 to 100 and ordinals in words, "9:00" as "9 o'clock",
 * "$5" as "5 dollars", "50%" as "50 percent", "twenty-one" as "twenty one", "1,900" as "1900" —
 * and then graded by the unchanged grader against every reference.
 *
 * The result is only SHOWN (owner-facing rule from the review): a spoken answer never turns '맞음'
 * on by itself, because a recogniser tends to write the fluent sentence it expected and can hide
 * the very grammar slip the lesson drills.
 */
import { diffAgainstReferences, gradeAgainstReferences, type AnswerDiff, type AnswerGrade } from "./grammarGrading";

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ORDINAL_ONES = [
  "zeroth", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth",
];
const ORDINAL_TENS = ["", "", "twentieth", "thirtieth", "fortieth", "fiftieth", "sixtieth", "seventieth", "eightieth", "ninetieth"];

function cardinal(n: number): string | null {
  if (!Number.isInteger(n) || n < 0 || n > 100) return null;
  if (n === 100) return "one hundred";
  if (n < 20) return ONES[n];
  const ones = n % 10;
  return ones ? `${TENS[Math.floor(n / 10)]} ${ONES[ones]}` : TENS[n / 10];
}

function ordinal(n: number): string | null {
  if (!Number.isInteger(n) || n < 1 || n > 100) return null;
  if (n === 100) return "one hundredth";
  if (n < 20) return ORDINAL_ONES[n];
  const ones = n % 10;
  return ones ? `${TENS[Math.floor(n / 10)]} ${ORDINAL_ONES[ones]}` : ORDINAL_TENS[n / 10];
}

const TENS_WORD = "twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
const ONES_WORD = "one|two|three|four|five|six|seven|eight|nine|first|second|third|fourth|fifth|sixth|seventh|eighth|ninth";

/** One spelling for the numbers in a sentence — applied to BOTH the transcript and the references. */
export function spokenNumbersAsWords(text: string): string {
  return String(text || "")
    .replace(/(\d),(?=\d{3}(?!\d))/g, "$1") // 1,900 → 1900
    .replace(/\$(\d+)\s*(million|billion|thousand)\b/gi, "$1 $2 dollars") // $1 million → 1 million dollars
    .replace(/\$(\d+)/g, "$1 dollars") // $100 → 100 dollars
    .replace(/(\d+)\s?%/g, "$1 percent") // 50% → 50 percent
    .replace(/\b(\d{1,2}):00\b/g, "$1 o'clock") // 9:00 → 9 o'clock
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (_m, h: string, mm: string) => `${h} ${Number(mm) < 10 ? `oh ${Number(mm)}` : Number(mm)}`) // 9:30 → 9 30
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/gi, (m, d: string) => ordinal(Number(d)) ?? m) // 15th → fifteenth
    .replace(/\b\d+\b/g, (m) => cardinal(Number(m)) ?? m) // 7 → seven (0–100 only)
    .replace(new RegExp(`\\b(${TENS_WORD})-(${ONES_WORD})\\b`, "gi"), "$1 $2"); // twenty-one → twenty one
}

/** The grade of a spoken answer: the unchanged grader, numbers spelled one way on both sides. */
export function gradeSpokenAnswer(transcript: string, references: string[]): AnswerGrade {
  return gradeAgainstReferences(spokenNumbersAsWords(transcript), references.map(spokenNumbersAsWords));
}

/** The word-by-word comparison of a spoken answer (same spelling rule as gradeSpokenAnswer). */
export function diffSpokenAnswer(transcript: string, references: string[]): AnswerDiff {
  return diffAgainstReferences(spokenNumbersAsWords(transcript), references.map(spokenNumbersAsWords));
}
