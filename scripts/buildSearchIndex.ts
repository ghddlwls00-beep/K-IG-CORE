import fs from "node:fs";
import path from "node:path";
import { formatGroupTitle, formatLessonPresentation } from "../src/lib/curriculumPresentation";

const courses = [
  // RE-009: "student" was missing from this list, so all 81 STUDENT conversation
  // lessons were absent from public/search-index.json and the in-app search
  // could not find a single one of them.
  { slug: "student", title: "STUDENT" },
  // ADULT (2026-10-02): titles only, as STUDENT
  { slug: "adult", title: "ADULT" },
  // PASS-OFF GRAMMAR (2026-09-27): titles only, like every course here — never an example or an explanation
  { slug: "passoff-grammar", title: "PASS-OFF GRAMMAR" },
  { slug: "phonics", title: "VOCA" },
  { slug: "grammar1", title: "GRAMMAR I" },
  { slug: "grammar2", title: "GRAMMAR II" },
  { slug: "ld", title: "LISTENING" },
  { slug: "reading", title: "READING" },
  // BUG-017 (2026-09-23): CNN NEWS is a discontinued course, so it is no longer
  // indexed — 120 search results led to a course that is not sold. The course
  // itself is untouched; only the index stops listing it.
];

export interface SearchIndexItem {
  id: string;
  course: string;
  courseTitle: string;
  code: string;
  title: string;
  subtitle: string;
  badge?: string;
  searchText: string;
}

/**
 * BUG-011 — searching an English word ("hospital") finds no VOCA lesson, and this
 * public file must NOT be how that gets fixed. A VOCA lesson's word list is paid
 * content: putting it here (2026-09-23) published 934 word-grid rows of 193 paid
 * lessons to anyone who fetches /search-index.json. It was taken out again the
 * same day; English-word search is deferred to a server-side search for signed-in
 * learners. `scripts/buildSearchIndex.mjs` runs the paid-content check
 * (`scripts/paidLeakCheck.mjs`) on every index it writes and fails on one hit.
 */
const items: SearchIndexItem[] = [];

for (const { slug, title: courseTitle } of courses) {
  const filePath = path.join(process.cwd(), "content", "courses", `${slug}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const lessons = data.lessons || [];
  /**
   * UI검토-1007 4장 8: a result's second line is its section by the one Korean name the course list gives it
   * (formatGroupTitle — '1장 · 자기소개' · '대주제 1 · 인칭' · '001~050회 · 실전 듣기'), the same in every course.
   */
  const sectionOf = new Map<string, string>();
  for (const group of data.groups || []) {
    const head = formatGroupTitle(slug, group.label || group.title || "");
    for (const id of group.lessons || []) sectionOf.set(id, head);
  }

  for (const lesson of lessons) {
    if (lesson.variant === "script") continue;

    const pres = formatLessonPresentation(slug, lesson);
    const section = sectionOf.get(lesson.id) || pres.subtitle;
    /*
     * UI검토-1007 12번: no `badge` here any more — '🎙️ 마이크 채점' · '🎙️ 발음 채점' · '📖 직독직해' are not shown (2차) and
     * said what a course does not do, yet searching '발음' still found every VOCA lesson through them. READING's '직독직해'
     * keyword goes for the same reason. The words a result shows (code, title, section) are what it is found by.
     */
    const searchText = [
      lesson.id,
      courseTitle,
      pres.code,
      pres.title,
      pres.subtitle,
      section,
      slug === "student" ? "회화 스피킹 대화 표현 conversation speaking student" : "",
      slug === "adult" ? "성인 어른 회화 스피킹 대화 표현 conversation speaking adult" : "",
      slug === "passoff-grammar" ? "문법 규칙 영작 패스오프 pass-off grammar" : "",
      slug === "phonics" ? "중등 고등 단어 어휘 단어장 보카 voca matrix" : "",
      slug === "grammar1" ? "문법 영작 기초문법 문장구조 grammar1" : "",
      slug === "grammar2" ? "문법 패턴 구문 영작 grammar2" : "",
      slug === "ld" ? "듣기 청취 수능 토익 받아쓰기 dictation listening ld" : "",
      slug === "reading" ? "독해 리딩 지문 본문 해석 reading" : "",
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    items.push({
      id: lesson.id,
      course: slug,
      courseTitle,
      code: pres.code,
      title: pres.title,
      subtitle: section,
      searchText,
    });
  }
}

const outputPath = path.join(process.cwd(), "public", "search-index.json");
fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), "utf-8");
console.log(`Successfully generated search-index.json with ${items.length} items.`);
