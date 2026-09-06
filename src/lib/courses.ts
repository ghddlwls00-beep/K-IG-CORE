import type { Course } from "./types";

/**
 * The course taxonomy, derived from how the legacy archive is already
 * organized on disk. Folder names and filename prefixes are load-bearing here:
 * the extractor uses them to decide which course and series a page belongs to.
 *
 * Counts in comments are from the folder audit and are approximate until the
 * extractor runs; `lessonCount` on each Course is filled in at extraction time.
 */
export const COURSES: Omit<Course, "lessonCount">[] = [
  // ---------------------------------------------------------------------
  // Core 6 Courses: VOCA (phonics), Grammar 1 & 2, LD, Reading, CNN
  // ---------------------------------------------------------------------
  {
    slug: "ld",
    tab: "ld",
    legacyFolder: "LD",
    numbering: "sequence",
    title: "LISTENING",
    titleEn: "Listening",
    kind: "audio-drill",
    description:
      "Exam-style listening sets. Each round pairs an English dictation drill with a Korean script page for reverse translation.",
    series: [{ slug: "d", title: "Listening Rounds", prefix: "d" }],
  },
  {
    slug: "reading",
    tab: "reading",
    legacyFolder: "reading",
    numbering: "sequence",
    title: "READING",
    titleEn: "Reading",
    kind: "audio-drill",
    description: "Numbered reading passages with narration, each with a companion script page.",
    series: [{ slug: "pr", title: "Reading Passages", prefix: "pr" }],
  },
  {
    slug: "phonics",
    tab: "voca",
    legacyFolder: "phonics",
    numbering: "sequence",
    title: "VOCA",
    titleEn: "Vocabulary",
    kind: "audio-drill",
    description: "Essential middle and high school vocabulary matrix with AI pronunciation clinic.",
    series: [
      { slug: "mv1", title: "Middle School Vocabulary 1 (MV1)", prefix: "mv1-" },
      { slug: "mv2", title: "Middle School Vocabulary 2 (MV2)", prefix: "mv2-" },
      { slug: "mv3", title: "Middle School Vocabulary 3 (MV3)", prefix: "mv3-" },
      { slug: "hv", title: "High School Vocabulary (HV)", prefix: "hv-" },
    ],
  },
  {
    slug: "grammar1",
    tab: "grammar1",
    legacyFolder: "grammar1",
    numbering: "sequence",
    title: "GRAMMAR I",
    titleEn: "Grammar 1",
    kind: "audio-drill",
    description: "English composition exercises: Korean prompts to be translated into English.",
    lessonNaming: "number",
    series: [{ slug: "gh1", title: "Composition Practice", prefix: "gh1-" }],
  },
  {
    slug: "grammar2",
    tab: "grammar2",
    legacyFolder: "grammar2",
    numbering: "sequence",
    title: "GRAMMAR II",
    titleEn: "Grammar 2",
    kind: "audio-drill",
    description: "Second-level composition exercises, each with a paired answer page.",
    lessonNaming: "number",
    series: [{ slug: "gh2", title: "Composition Practice", prefix: "gh2-" }],
  },
  {
    slug: "cnn",
    tab: "cnn",
    legacyFolder: "CNN",
    numbering: "sequence",
    title: "CNN NEWS",
    titleEn: "CNN News",
    kind: "video",
    description:
      "News clips transcoded from the original Windows Media files, each with its English transcript, Korean translation and vocabulary notes.",
    series: [{ slug: "cnn", title: "Clips", prefix: "" }],
  },
];

export const COURSE_BY_SLUG = new Map(COURSES.map((c) => [c.slug, c]));
export const COURSE_BY_FOLDER = new Map(COURSES.map((c) => [c.legacyFolder, c]));

/** Folders deliberately excluded from the web app. */
export const EXCLUDED_FOLDERS = [
  "gva", // 231 Firebird .gdb files — offline desktop trainer
  "GVA 2000 Pro", // Windows installers for that trainer
  "css", // legacy stylesheet, superseded by Tailwind
  "images", // legacy chrome images, superseded by the new design
  "scripts", // legacy swfobject helpers
  "objects", // single stray swf
  "sources", // stock photography
] as const;

/**
 * How a lesson should be titled in the interface.
 *
 * Returns a number when the course numbers its lessons, so the caller can
 * render it through the translations ("Lesson 6" / "レッスン 6" / "第 6 课").
 * Otherwise returns the text the legacy author wrote.
 */
export function lessonDisplay(
  course: { lessonNaming?: "menu" | "number" },
  lesson: { menuLabel?: string | null; label?: string | null; id: string; unit?: number | null },
): { n: number } | { text: string } {
  if (course.lessonNaming === "number" && typeof lesson.unit === "number" && !Number.isNaN(lesson.unit)) {
    return { n: lesson.unit };
  }
  return { text: lesson.menuLabel ?? lesson.label ?? lesson.id };
}
