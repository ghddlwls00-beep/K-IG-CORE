import Link from "next/link";
import type { Metadata } from "next";
import { getAllGvaLessons } from "@/lib/gva";
import { GvaDashboard } from "@/components/GvaDashboard";

export const metadata: Metadata = {
  title: "GVA 영어독해 직강 200강 · K-IG 교육",
  description: "중등·고등 영어독해 200강의 교재 원문, 강의 음성, 동기화 판서를 웹에서 바로 학습합니다.",
};

export default function GvaPage() {
  const lessons = getAllGvaLessons();

  return (
    <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-14">
      {/* Subtle Back Link */}
      <nav className="mb-8">
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-full border border-line bg-sunken px-3.5 py-1.5 font-mono text-[11.5px] font-medium text-ink-soft hover:bg-raised hover:text-ink transition-all shadow-2xs"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">←</span>
          <span>홈으로 돌아가기</span>
        </Link>
      </nav>

      {/* Hero Header */}
      <header className="mb-10 flex flex-col gap-3 border-b border-line pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            GVA READING LECTURE
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] font-semibold text-emerald-600">
            총 200강 (20개 챕터 완성)
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] text-ink-faint">
            교재 원문 · 실제 강의 음성 스트리밍
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          GVA 영어독해 직강 200강
        </h1>
        <p className="max-w-2xl text-[15px] sm:text-[16px] text-ink-soft leading-relaxed">
          구형 GVA 전용 프로그램을 설치하지 않고 웹 브라우저에서 바로 학습하는 영어독해 직강입니다.
          교재 원문을 보며 실제 강의 음성을 배속 재생하고, 10강 단위로 중등·고등 독해를 완성할 수 있습니다.
        </p>
      </header>

      {/* Interactive Curriculum Dashboard */}
      <GvaDashboard lessons={lessons} />
    </main>
  );
}
