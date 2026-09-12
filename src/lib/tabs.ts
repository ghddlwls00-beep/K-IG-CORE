import type { Tab } from "./types";

/**
 * The legacy top navigation, restored exactly.
 *
 * Every course folder's `menu.htm` renders the same ten-tab bar as a row of
 * images. The image *filenames* do not match their destinations — `MEN.jpg`
 * links to `middle/`, `STUDENT.jpg` to `basics/`, `VOCA.jpg` to `phonics/` —
 * so the labels below were read off the images themselves, not inferred from
 * the filename or the folder name. Order matches the original bar, left to
 * right.
 *
 * Three of these tabs are populations rather than single courses. Their
 * framesets prove it:
 *
 *   basics/index.htm  -> top: menu.htm  bottom: ../Student/shome.html
 *   middle/index.htm  -> top: menu.htm  bottom: ../Man/mhome.html
 *   adults/index.htm  -> top: menu.htm  bottom: ../Woman/whome.html
 *
 * That is, opening the STUDENTS tab landed you on the Student conversation
 * lessons, with the basics drills reachable from the same menu bar. The two
 * modalities were one destination, so they are one tab here too.
 */
export const TABS: Tab[] = [
  {
    slug: "students",
    label: "STUDENT",
    legacyImage: "STUDENT.jpg",
    legacyIndex: "basics/index.htm",
    courses: ["student"],
    blurb: "Real Conversations. Pure Listening & Reading.",
  },
  {
    slug: "voca",
    label: "VOCA",
    legacyImage: "VOCA.jpg",
    legacyIndex: "phonics/index.htm",
    courses: ["phonics"],
    blurb: "Middle & High school vocabulary matrix with pronunciation clinic",
  },
  {
    slug: "grammar1",
    label: "GRAMMAR I",
    legacyImage: "grammar1.gif",
    legacyIndex: "grammar1/index.htm",
    courses: ["grammar1"],
    blurb: "Foundational English Composition & Sentence Building",
  },
  {
    slug: "grammar2",
    label: "GRAMMAR II",
    legacyImage: "grammar2.gif",
    legacyIndex: "grammar2/index.htm",
    courses: ["grammar2"],
    blurb: "Advanced Syntax Exercises & In-Depth Grammar Practice",
  },
  {
    slug: "ld",
    label: "LISTENING",
    legacyImage: "LD.gif",
    legacyIndex: "LD/index.htm",
    courses: ["ld"],
    blurb: "Real-Test Listening Comprehension & Dictation Mastery",
  },
  {
    slug: "reading",
    label: "READING",
    legacyImage: "reading.gif",
    legacyIndex: "reading/index.htm",
    courses: ["reading"],
    blurb: "Narrated Reading Passages & Direct Sentence Analysis",
  },
  {
    slug: "cnn",
    label: "CNN NEWS",
    legacyImage: "CNN.jpg",
    legacyIndex: "CNN/index.htm",
    courses: ["cnn"],
    blurb: "Authentic CNN Broadcasts & Current Affairs Decoding",
  },
  {
    slug: "gva",
    label: "GVA 독해",
    legacyImage: "reading.gif",
    legacyIndex: "gva/index.htm",
    courses: ["gva"],
    blurb: "강광진 원장 중·고등 영어독해 200강 육성 직강 스트리밍",
  },
];

export const TAB_BY_SLUG = new Map(TABS.map((t) => [t.slug, t]));

/** The tab a given course belongs to. */
export function tabForCourse(courseSlug: string): Tab | null {
  return TABS.find((t) => t.courses.includes(courseSlug)) ?? null;
}
