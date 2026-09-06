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
    slug: "voca",
    label: "VOCA",
    legacyImage: "VOCA.jpg",
    legacyIndex: "phonics/index.htm",
    courses: ["phonics"],
    blurb: "",
  },
  {
    slug: "grammar1",
    label: "GRAMMAR I",
    legacyImage: "grammar1.gif",
    legacyIndex: "grammar1/index.htm",
    courses: ["grammar1"],
    blurb: "",
  },
  {
    slug: "grammar2",
    label: "GRAMMAR II",
    legacyImage: "grammar2.gif",
    legacyIndex: "grammar2/index.htm",
    courses: ["grammar2"],
    blurb: "",
  },
  {
    slug: "ld",
    label: "LISTENING",
    legacyImage: "LD.gif",
    legacyIndex: "LD/index.htm",
    courses: ["ld"],
    blurb: "",
  },
  {
    slug: "reading",
    label: "READING",
    legacyImage: "reading.gif",
    legacyIndex: "reading/index.htm",
    courses: ["reading"],
    blurb: "",
  },
  {
    slug: "cnn",
    label: "CNN 뉴스",
    legacyImage: "CNN.jpg",
    legacyIndex: "CNN/index.htm",
    courses: ["cnn"],
    blurb: "",
  },
];

export const TAB_BY_SLUG = new Map(TABS.map((t) => [t.slug, t]));

/** The tab a given course belongs to. */
export function tabForCourse(courseSlug: string): Tab | null {
  return TABS.find((t) => t.courses.includes(courseSlug)) ?? null;
}
