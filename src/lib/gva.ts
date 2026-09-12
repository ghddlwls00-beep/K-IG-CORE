import fs from "node:fs";
import path from "node:path";

export interface GvaLesson {
  id: string; // "gva-001" ~ "gva-200"
  number: number; // 1 ~ 200
  level: "middle" | "high";
  levelLabel: string; // "중등 독해" | "고등 독해"
  title: string;
  passageNumber: number;
  instructor?: string;
  audioKey: string;
  slideKey: string;
  audioUrl: string;
  slideUrl: string;
  durationSeconds: number;
  durationFormatted: string;
  chapter?: number;
  chapterLabel?: string;
  chapterRange?: string;
  chapterSubtopic?: string;
  chapterEnSubtopic?: string;
  chapterDesc?: string;
}

let cachedLessons: GvaLesson[] | null = null;

export function getAllGvaLessons(): GvaLesson[] {
  if (cachedLessons) return cachedLessons;
  const filePath = path.join(process.cwd(), "content", "gva-lessons.json");
  if (!fs.existsSync(filePath)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    cachedLessons = JSON.parse(raw) as GvaLesson[];
    return cachedLessons;
  } catch (e) {
    console.error("Failed to load gva-lessons.json", e);
    return [];
  }
}

export function getGvaLesson(identifier: string | number): GvaLesson | null {
  const lessons = getAllGvaLessons();
  if (typeof identifier === "number") {
    return lessons.find((l) => l.number === identifier) ?? null;
  }
  const clean = identifier.toLowerCase().trim();
  const num = parseInt(clean.replace(/^gva-/, ""), 10);
  if (!isNaN(num)) {
    return lessons.find((l) => l.number === num) ?? null;
  }
  return lessons.find((l) => l.id.toLowerCase() === clean) ?? null;
}

export function getGvaLessonContext(currentNumber: number): {
  prev: GvaLesson | null;
  next: GvaLesson | null;
} {
  const lessons = getAllGvaLessons();
  const idx = lessons.findIndex((l) => l.number === currentNumber);
  if (idx === -1) return { prev: null, next: null };
  return {
    prev: idx > 0 ? lessons[idx - 1] : null,
    next: idx < lessons.length - 1 ? lessons[idx + 1] : null,
  };
}
