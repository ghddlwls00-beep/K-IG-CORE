import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { PassoffMapRefill } from "@/components/passoff/MapRefill";
import { planOpensCourse } from "@/lib/license";
import { LICENSE_SESSION_COOKIE_NAME, verifyLicenseSessionToken } from "@/lib/licenseSession";
import { getPassoffProgress, isPassoffLessonUnlocked, passoffTopics } from "@/lib/passoffProgress";
import { passoffMapData } from "@/lib/passoffReview";
import { topicWithParticle } from "@/lib/passoffUnlock";

/**
 * "구성도 다시 채우기" of a topic (설계 §4 · §5, 공통-학습-엔진.md §8-7 — 단계 2-나 E2): /passoff-grammar/map?topic=N — a literal
 * folder, so it wins over [lesson].
 *
 * The map is made of the topic's lessons (their titles, rule titles and a ① sentence each — passoffReview.ts passoffMapData),
 * so it is paid content: the page holds it only for a licence that opens the course AND has the topic open (the lesson
 * route's own rule — a LIFE pass opens every topic). Anyone else gets one line and the way back, with no lesson words.
 * Done once, it is the topic's last condition for opening the next (passoffUnlock.ts requireMapRefill).
 */
const COURSE = "passoff-grammar";

export const metadata: Metadata = {
  title: "구성도 다시 채우기 · PASS-OFF GRAMMAR",
  alternates: { canonical: `/${COURSE}/map` },
  robots: { index: false, follow: true },
};

export default async function PassoffMapPage({ searchParams }: { searchParams: Promise<{ topic?: string | string[] }> }) {
  const raw = (await searchParams).topic;
  const topicNumber = Number(Array.isArray(raw) ? raw[0] : raw);
  const topic = passoffTopics().find((t) => t.topic === topicNumber) ?? null;
  const session = await verifyLicenseSessionToken((await cookies()).get(LICENSE_SESSION_COOKIE_NAME)?.value);
  const withLicence = Boolean(session && planOpensCourse(session.payload.plan, COURSE));

  let note: string | null = null;
  let data = null;
  if (!topic) note = "없는 대주제예요. 과정 목록에서 대주제를 골라 주세요.";
  else if (!withLicence || !session) note = "구성도 다시 채우기는 이용권이 있으면 대주제를 마친 뒤 할 수 있어요.";
  else {
    // the lesson route's own rule (src/app/passoff-grammar/[lesson]/page.tsx): a LIFE pass opens every topic
    const everyTopicOpen = session.payload.plan === "LIFE";
    const open = everyTopicOpen || isPassoffLessonUnlocked(topic.lessonIds[0], await getPassoffProgress(session.payload.key));
    if (!open) {
      note = `${topicWithParticle(topic.topic, "은/는")} 아직 열리지 않았어요.`;
    } else {
      data = passoffMapData(topic);
      if (!data) note = "이 대주제의 구성도를 불러오지 못했어요.";
    }
  }

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
        <h1 className="text-[20px] sm:text-[26px] leading-snug font-bold text-balance text-ink">구성도 다시 채우기</h1>
        {data ? <p className="mt-1 text-label text-ink-soft">{data.label}</p> : null}
      </header>
      {data ? (
        <PassoffMapRefill data={data} />
      ) : (
        <section className="flex flex-col gap-3 rounded-card border border-line bg-raised p-4" data-passoff-map-note>
          <p className="text-body text-ink">{note}</p>
          <div>
            <Link
              href={`/${COURSE}`}
              className="inline-flex min-h-11 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors hover:bg-sunken"
            >
              과정 목록으로
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}
