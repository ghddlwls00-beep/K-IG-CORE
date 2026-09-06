import fs from "node:fs";
import path from "node:path";
import { formatLessonPresentation } from "../src/lib/curriculumPresentation";

const courses = [
  { slug: "phonics", title: "VOCA" },
  { slug: "grammar1", title: "GRAMMAR I" },
  { slug: "grammar2", title: "GRAMMAR II" },
  { slug: "ld", title: "LISTENING" },
  { slug: "reading", title: "READING" },
  { slug: "cnn", title: "CNN NEWS" },
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

const items: SearchIndexItem[] = [];

for (const { slug, title: courseTitle } of courses) {
  const filePath = path.join(process.cwd(), "content", "courses", `${slug}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  const lessons = data.lessons || [];

  for (const lesson of lessons) {
    if (lesson.variant === "script") continue;

    const pres = formatLessonPresentation(slug, lesson);
    const searchText = [
      lesson.id,
      courseTitle,
      pres.code,
      pres.title,
      pres.subtitle,
      pres.badge || "",
      slug === "phonics" ? "중등 고등 단어 어휘 단어장 보카 voca matrix" : "",
      slug === "grammar1" ? "문법 영작 기초문법 문장구조 grammar1" : "",
      slug === "grammar2" ? "문법 패턴 구문 영작 grammar2" : "",
      slug === "ld" ? "듣기 청취 수능 토익 받아쓰기 dictation listening ld" : "",
      slug === "reading" ? "독해 리딩 지문 본문 해석 직독직해 reading" : "",
      slug === "cnn" ? "cnn 뉴스 방송 current news 영어뉴스" : "",
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
      subtitle: pres.subtitle,
      badge: pres.badge,
      searchText,
    });
  }
}

const outputPath = path.join(process.cwd(), "public", "search-index.json");
fs.writeFileSync(outputPath, JSON.stringify(items, null, 2), "utf-8");
console.log(`Successfully generated search-index.json with ${items.length} items.`);
