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
    series: [{ slug: "d", title: "듣기 회차", prefix: "d" }],
  },
  {
    slug: "reading",
    tab: "reading",
    legacyFolder: "reading",
    numbering: "sequence",
    title: "리딩",
    titleEn: "Reading",
    kind: "audio-drill",
    description: "Numbered reading passages with narration, each with a companion script page.",
    series: [{ slug: "pr", title: "리딩", prefix: "pr" }],
  },
  {
    slug: "phonics",
    tab: "voca",
    legacyFolder: "phonics",
    numbering: "sequence",
    title: "VOCA",
    titleEn: "Vocabulary & Pronunciation",
    kind: "audio-drill",
    description: "중등 필수 어휘 및 고등 심화 어휘 매트릭스 & 발음 훈련.",
    series: [
      { slug: "mv1", title: "중등 단어 1 (MV1)", prefix: "mv1-" },
      { slug: "mv2", title: "중등 단어 2 (MV2)", prefix: "mv2-" },
      { slug: "mv3", title: "중등 단어 3 (MV3)", prefix: "mv3-" },
      { slug: "hv", title: "고등 단어 (HV)", prefix: "hv-" },
    ],
  },
  {
    slug: "grammar1",
    tab: "grammar1",
    legacyFolder: "grammar1",
    numbering: "sequence",
    title: "영문법 1",
    titleEn: "Grammar 1",
    kind: "audio-drill",
    description: "English composition exercises: Korean prompts to be translated into English.",
    lessonNaming: "number",
    series: [{ slug: "gh1", title: "영작 연습", prefix: "gh1-" }],
  },
  {
    slug: "grammar2",
    tab: "grammar2",
    legacyFolder: "grammar2",
    numbering: "sequence",
    title: "영문법 2",
    titleEn: "Grammar 2",
    kind: "audio-drill",
    description: "Second-level composition exercises, each with a paired answer page.",
    lessonNaming: "number",
    series: [{ slug: "gh2", title: "영작 연습", prefix: "gh2-" }],
  },
  {
    slug: "cnn",
    tab: "cnn",
    legacyFolder: "CNN",
    numbering: "sequence",
    title: "CNN 리스닝",
    titleEn: "CNN Listening",
    kind: "video",
    description:
      "News clips transcoded from the original Windows Media files, each with its English transcript, Korean translation and vocabulary notes.",
    series: [{ slug: "cnn", title: "클립", prefix: "" }],
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
