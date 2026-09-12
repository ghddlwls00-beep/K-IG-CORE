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
      "실전 수능·토익 대비 받아쓰기 훈련. 원어민 고음질 음성과 딕테이션 훈련으로 완벽한 청취력을 완성합니다.",
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
    description: "원어민 내레이션과 구문 분석이 결합된 원문 독해 훈련으로 문해력과 직독직해 능력을 완성합니다.",
    series: [{ slug: "pr", title: "Reading Passages", prefix: "pr" }],
  },
  {
    slug: "student",
    tab: "students",
    legacyFolder: "Student",
    numbering: "unit-part",
    title: "STUDENT",
    titleEn: "Student",
    kind: "audio-drill",
    description:
      "원어민 일상 회화로 마스터하는 실전 듣기와 정독 훈련.",
    series: [{ slug: "s", title: "Conversation Lessons", prefix: "s" }],
  },
  {
    slug: "phonics",
    tab: "voca",
    legacyFolder: "phonics",
    numbering: "sequence",
    title: "VOCA",
    titleEn: "Vocabulary",
    kind: "audio-drill",
    description: "중등 1~4단계부터 고등 심화까지 필수 영단어 매트릭스 및 원어민 발음 정밀 클리닉.",
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
    description: "한국어 문장을 즉시 영어로 변환하는 기초 영작 훈련. 6단계 체계적 문장 구조 정복.",
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
    description: "심화 구문 및 패턴별 집중 영작 트레이닝. 고난도 문형과 어순 감각 완성.",
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
      "실제 CNN 글로벌 뉴스 클립과 원문 스크립트, 한영 대역 번역으로 실전 시사 영어를 마스터합니다.",
    series: [{ slug: "cnn", title: "Clips", prefix: "" }],
  },
];

export const COURSE_BY_SLUG = new Map(COURSES.map((c) => [c.slug, c]));
export const COURSE_BY_FOLDER = new Map(COURSES.map((c) => [c.legacyFolder, c]));

/** Folders deliberately excluded from the web app. */
export const EXCLUDED_FOLDERS = [
  "gva", // GVA files excluded
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
