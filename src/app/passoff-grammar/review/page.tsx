import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PassoffReview } from "@/components/passoff/PassoffReview";
import { isServerLearningCourse } from "@/lib/learning/serverStore";
import { planOpensCourse } from "@/lib/license";
import { LICENSE_SESSION_COOKIE_NAME, verifyLicenseSessionToken } from "@/lib/licenseSession";
import { passoffFreeReviewItems } from "@/lib/passoffReview";
import { licenseIdFor } from "@/lib/serverLicense";

/**
 * PASS-OFF GRAMMAR's review of the day (공통-학습-엔진.md §8-3) — a literal folder, so it wins over [lesson].
 *
 * With a licence that opens the course the page holds NO lesson text at all: the browser sends this licence's record
 * (the one the device keeps under the licence's id, handed to it here — src/lib/learning/sync.ts) to
 * /api/learning/passoff-grammar and gets back today's plan with the data of those items only (and only of open topics).
 * Without one — the free trial — the page gives the two free lessons' review items as their free pages show them (never
 * the paid STUDENT sentences a licence adds), and the device plans from its own record; nothing goes to the server.
 * The line marked data-kig-paid-extra="license" lets LicenseProvider bring a licence entered here back as the licensed
 * page (the free lesson page's own mark for the sentences a licence adds).
 */
const COURSE = "passoff-grammar";

export const metadata: Metadata = {
  title: "오늘 복습 · PASS-OFF GRAMMAR",
  alternates: { canonical: `/${COURSE}/review` },
  robots: { index: false, follow: true },
};

export default async function PassoffReviewPage() {
  const session = await verifyLicenseSessionToken((await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value);
  const withLicence = Boolean(session && planOpensCourse(session.payload.plan, COURSE)) && isServerLearningCourse(COURSE);

  return (
    <main className="mx-auto max-w-3xl px-4 pt-3 pb-10 sm:px-5 sm:pt-6 sm:pb-14">
      <nav aria-label="과정으로">
        <Link
          href={`/${COURSE}`}
          className="-ml-2 inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-label font-medium text-ink-soft transition-colors hover:bg-raised hover:text-ink"
        >
          <span aria-hidden>←</span>
          <span>PASS-OFF GRAMMAR 목록</span>
        </Link>
      </nav>
      <header className="mt-1 mb-4 sm:mb-6">
        <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold text-balance text-ink">오늘 복습</h1>
        {withLicence ? null : (
          <p className="mt-1 text-label text-ink-soft" data-kig-paid-extra="license">
            무료 체험 레슨 두 개의 문항만 복습해요. 이용권이 있으면 마친 레슨의 문항이 모두 나와요.
          </p>
        )}
      </header>
      <PassoffReview
        source={
          withLicence && session
            ? { kind: "server", learner: licenseIdFor(session.payload.key) }
            : { kind: "device", items: passoffFreeReviewItems() }
        }
      />
    </main>
  );
}
