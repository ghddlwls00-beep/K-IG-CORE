import Link from "next/link";
import type { Metadata } from "next";
import { getAllGvaLessons } from "@/lib/gva";
import { GvaDashboard } from "@/components/GvaDashboard";

export const metadata: Metadata = {
  title: "GVA 영어독해 200강 마스터 · K-IG 교육",
  description: "강광진 원장의 중등·고등 영어독해 200강 육성 직강 및 교재 슬라이드 동기화 스트리밍",
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
          <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-blue-600">
            GVA STREAMING
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] font-semibold text-emerald-600">
            총 200강 전체 완비
          </span>
          <span className="text-ink-faint">·</span>
          <span className="font-mono text-[12px] text-ink-faint">
            Cloudflare R2 고음질 스트리밍
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink">
          GVA 영어독해 200강 마스터
        </h1>
        <p className="max-w-2xl text-[15px] sm:text-[16px] text-ink-soft leading-relaxed">
          구형 전용 프로그램 설치 없이, 웹 브라우저에서 바로 듣는 강광진 원장의 육성 직독직해 해설 강의입니다.
          교재 원문 슬라이드를 보며 직관적인 오디오 배속 및 구간 반복 학습을 진행할 수 있습니다.
        </p>

        {/* Quick Stats Banner */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">중등 영어독해</span>
            <span className="text-xl font-bold text-ink">1 ~ 100강</span>
          </div>
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">고등 영어독해</span>
            <span className="text-xl font-bold text-ink">101 ~ 200강</span>
          </div>
          <div className="rounded-xl border border-line bg-raised p-3.5 flex flex-col">
            <span className="font-mono text-[11px] text-ink-soft">강사진</span>
            <span className="text-xl font-bold text-ink">강광진 원장</span>
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
