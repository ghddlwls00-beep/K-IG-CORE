import type { Metadata } from "next";
import { LandingPage, type LandingTab } from "@/components/LandingPage";
import { getTabs } from "@/lib/content";
import { COURSE_BY_SLUG } from "@/lib/courses";

// RE-011: the home page pins its own canonical. The root layout no longer sets
// a global "/" canonical (which made every page a duplicate of this one), so
// each route — including this one — declares itself explicitly.
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  const tabs: LandingTab[] = getTabs().map((tab, idx) => ({
    ...tab,
    n: idx + 1,
    num: String(idx + 1).padStart(2, "0"),
    courseDetails: tab.courses
      .map((slug) => {
        const c = COURSE_BY_SLUG.get(slug);
        if (!c) return null;
        return {
          slug: c.slug,
          title: c.title,
          titleEn: c.titleEn,
          description: c.description,
          kind: c.kind,
        };
      })
      .filter((c): c is NonNullable<typeof c> => c !== null),
  }));

  return <LandingPage tabs={tabs} />;
}

