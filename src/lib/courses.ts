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
    // UI검토-1007 7번(사장님 2026-10-07): 과정 소개 글은 하는 일대로 — 과장 · 사실과 다른 말 없이(목록 머리 · 메타 설명 · /t/ 쪽에 쓰임)
    description: "듣기 지문을 먼저 들어 보고, 받아쓰고, 연음을 짚은 뒤 따라 말해요.",
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
    description: "영어 지문을 읽고, 핵심 어휘를 익히고, 우리말과 맞춰 본 뒤 다시 읽으며 속도를 재요.",
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
    description: "자기소개부터 학교생활 · 꿈 · 한국 이야기까지, 학생 회화 문장을 먼저 듣고 받아쓰고 따라 말해요.",
    series: [{ slug: "s", title: "Conversation Lessons", prefix: "s" }],
  },
  // ADULT (2026-10-02, docs/adult/README.md) — made from the owner's Pass-Off English adult PPTs, taught exactly as STUDENT
  // (사장님 "학습법은 student랑 완전히 똑같이"). Lessons are "a<chapter>-<part>", numbered like STUDENT's unit-part. Not the
  // legacy "adults" folder (content/lessons/adults), which is no course of this site.
  {
    slug: "adult",
    tab: "adult",
    legacyFolder: "adult",
    numbering: "unit-part",
    title: "ADULT",
    titleEn: "Adult",
    kind: "audio-drill",
    // UI검토-1007 41번: 해요체 like the other courses' lines (words unchanged)
    description: "성인 실전 회화. 자기소개부터 한국의 역사·문화·사회까지, 어른의 말로 듣고 받아쓰고 따라 말해요.",
    series: [{ slug: "a", title: "Conversation Lessons", prefix: "a" }],
  },
  // PASS-OFF GRAMMAR (2026-09-27, docs/pass-off-grammar/설계.md) — made from the Pass-Off English
  // Grammar textbooks, not from the legacy archive, so there is no legacy folder to point at.
  // Lessons are "pg<topic>-<link>" (pg02-1 = TOPIC 2, first link), numbered like STUDENT's unit-part.
  {
    slug: "passoff-grammar",
    tab: "passoff-grammar",
    legacyFolder: "passoff-grammar",
    numbering: "unit-part",
    title: "PASS-OFF GRAMMAR",
    titleEn: "Pass-Off Grammar",
    kind: "audio-drill",
    description:
      "패스오프 문법. GRAMMAR I·II 가 문장을 되풀이해 영작하는 훈련이라면, 여기서는 강의마다 예문 → 문법 설명 → 형태 찾기 → 영작 → 마무리 5단계로 문법 하나를 익혀 통과해요.",
    series: [{ slug: "pg", title: "Grammar Lessons", prefix: "pg" }],
  },
  {
    slug: "phonics",
    tab: "voca",
    legacyFolder: "phonics",
    numbering: "sequence",
    title: "VOCA",
    titleEn: "Vocabulary",
    kind: "audio-drill",
    description: "중등 1~3단계와 고등 심화 단어. 보고 듣기 → 뜻 고르기 → 틀린 단어 말하기 → 60초 풀기.",
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
    description: "우리말을 보고 영어 문장을 써 봐요. 기본 문장 구조부터 접속사 · 복문까지 6단계.",
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
    description: "우리말을 보고 영어 문장을 써 봐요. 전치사 · 부정사 · 관계사 · 가정법 같은 구문과 생활 표현을 과마다 영작해요.",
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
