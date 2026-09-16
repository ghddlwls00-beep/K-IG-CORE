import type { MetadataRoute } from "next";
import {
  canonicalLessonId,
  getAllLessonParams,
  getCourses,
  getTabs,
  isRedirectedLesson,
} from "@/lib/content";
import { isFreePreviewLesson } from "@/lib/license";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://k-ig-core.vercel.app";

/**
 * RE-008 — the sitemap asks only for pages a visitor can actually read.
 *
 * THE BUG. Every lesson went in, free or not. Measured against production on
 * 2026-09-16, that was 1,751 URLs of which 1,713 answered with the paywall
 * shell — 270 characters of navigation and an upsell, identical on every lesson
 * except the title. A sitemap is a request to index, and this one asked a search
 * engine to index 1,700 near-duplicate thin pages, which is how a site gets
 * classified as thin content and drags down the 113 pages that do have
 * something to say.
 *
 * THE FILTER IS THE GATE'S OWN PREDICATE. `isFreePreviewLesson` is what
 * `isFreePreviewLessonServer` — the check `[course]/[lesson]/page.tsx` applies
 * before it assembles a body — delegates to. Writing the list out here instead
 * would have been a second copy to keep in step, and the copy that drifts is
 * always the quieter one.
 *
 * The tab pages are added because they are real content (a section
 * introduction, 395–2,613 characters measured) and were simply missing.
 *
 * SEO-01 — two more exclusions, both measured against production 2026-09-16:
 * six listed URLs answered 307 (GRAMMAR I's odd-numbered answer pages redirect
 * to the lesson before them), and ten listed script pages (`-1` / `-2`)
 * rendered the same body as their main page while claiming to be canonical.
 * A sitemap lists canonical, 200-answering pages only, so a lesson is listed
 * when it is free, is not a redirect, and is its own canonical.
 *
 * Result: 29 URLs — home, 7 courses, 7 tabs, 14 free preview lessons.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const home: MetadataRoute.Sitemap = [{ url: SITE_URL, changeFrequency: "monthly", priority: 1 }];

  const coursePages: MetadataRoute.Sitemap = getCourses().map((course) => ({
    url: `${SITE_URL}/${course.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const tabPages: MetadataRoute.Sitemap = getTabs().map((tab) => ({
    url: `${SITE_URL}/t/${tab.slug}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const lessonPages: MetadataRoute.Sitemap = getAllLessonParams()
    .filter(
      ({ course, lesson }) =>
        isFreePreviewLesson(course, lesson) &&
        !isRedirectedLesson(course, lesson) &&
        canonicalLessonId(course, lesson) === lesson,
    )
    .map(({ course, lesson }) => ({
      url: `${SITE_URL}/${course}/${lesson}`,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

  return [...home, ...coursePages, ...tabPages, ...lessonPages];
}
