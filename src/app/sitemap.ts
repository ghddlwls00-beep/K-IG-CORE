import type { MetadataRoute } from "next";
import { getAllLessonParams, getCourses } from "@/lib/content";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://k-ig-core.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const coursePages: MetadataRoute.Sitemap = getCourses().map((course) => ({
    url: `${SITE_URL}/${course.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  const lessonPages: MetadataRoute.Sitemap = getAllLessonParams().map(({ course, lesson }) => ({
    url: `${SITE_URL}/${course}/${lesson}`,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [
    { url: SITE_URL, changeFrequency: "monthly", priority: 1 },
    ...coursePages,
    ...lessonPages,
  ];
}
