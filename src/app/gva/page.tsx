import Link from "next/link";
import type { Metadata } from "next";
import { getAllGvaLessons } from "@/lib/gva";
import { GvaDashboard } from "@/components/GvaDashboard";

export const metadata: Metadata = {
  title: "LISTENING 직강 해설 200강 마스터 · K-IG 교육",
  description: "LISTENING(청취) 섹션을 체계적인 강의로 완벽하게 풀어주는 200강 집중 직청직해 해설 스트리밍",
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
            LISTENING LECTURE MASTER
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] font-semibold text-emerald-600">
            총 200강 (20개 챕터 완성)
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] text-ink-faint">
            실시간 판서 벡터 동기화 스트리밍
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          LISTENING 직강 해설 200강 마스터
        </h1>
        <p className="max-w-2xl text-[15px] sm:text-[16px] text-ink-soft leading-relaxed">
          구형 전용 프로그램 설치 없이, 웹 브라우저에서 바로 듣는 LISTENING(청취) 섹션 집중 해설 강의입니다.
          교재 원문 슬라이드와 실시간 판서를 보며 직관적인 오디오 배속 및 10강 단위 체계적 직청직해 학습을 진행할 수 있습니다.
        </p>

        {/* Quick Stats Banner */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">중등 청취 해설</span>
            <span className="text-xl font-bold text-ink">CH 01 ~ 10</span>
          </div>
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">고등 실전 청취</span>
            <span className="text-xl font-bold text-ink">CH 11 ~ 20</span>
          </div>
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">학습 구성</span>
            <span className="text-xl font-bold text-ink">20챕터 · 200강</span>
          </div>
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">학습 환경</span>
            <span className="text-xl font-bold text-emerald-600">모바일 · PC 웹</span>
          </div>
        </div>
      </header>

      {/* Interactive Curriculum Dashboard */}
      <GvaDashboard lessons={lessons} />
    </main>
  );
}
