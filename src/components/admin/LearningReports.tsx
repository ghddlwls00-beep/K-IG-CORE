"use client";

import { useState } from "react";
import type { ReportedItem } from "@/lib/learning/serverCourses";
import { mergeReportGroups, type ReportGroup } from "@/lib/learning/review";

/**
 * The owner's "내 답도 맞아요" list on /admin/license (공통-학습-엔진.md §8-6 — 단계 2-나 E2): the learners' server records read
 * and grouped by item (/api/admin/learning-reports) — what the item asks, the answers it already takes, and the answers
 * reported, most reported first. Nameless and read-only: a report judged right goes into the lesson's accept list (the fix
 * session's work, then 관문 4), so there is no button to judge here. Loaded only when the owner asks.
 *
 * E2 수정: the route answers a page of records at a time (`next`), so this asks page after page and joins them
 * (review.ts mergeReportGroups) — one request no longer reads every record.
 */
type Group = ReportGroup & { about: ReportedItem | null };
type Loaded = {
  records: number;
  recordsWithReports: number;
  itemCount: number;
  items: Group[];
};
type Page = Omit<Loaded, "items"> & { items: Group[]; next: string | null };

/** the most reported items shown */
const SHOWN = 300;
/** pages read at most in one look (200 records a page) */
const MAX_PAGES = 100;

export function LearningReports({ course = "passoff-grammar", title = "PASS-OFF GRAMMAR" }: { course?: string; title?: string }) {
  const [state, setState] = useState<
    { at: "idle" } | { at: "loading"; read: number } | { at: "error"; message: string } | { at: "loaded"; data: Loaded }
  >({ at: "idle" });

  async function load() {
    setState({ at: "loading", read: 0 });
    try {
      const joined: Loaded = { records: 0, recordsWithReports: 0, itemCount: 0, items: [] };
      let after: string | null = null;
      for (let n = 0; n < MAX_PAGES; n += 1) {
        const response = await fetch("/api/admin/learning-reports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ course, after }),
        });
        const data = (await response.json()) as Page & { success?: boolean; error?: string };
        if (!response.ok || !data.success) throw new Error(data.error || "신고를 불러오지 못했습니다.");
        joined.records += data.records;
        joined.recordsWithReports += data.recordsWithReports;
        joined.items = mergeReportGroups(joined.items, data.items);
        setState({ at: "loading", read: joined.records });
        after = data.next;
        if (!after) break;
      }
      joined.itemCount = joined.items.length;
      setState({ at: "loaded", data: { ...joined, items: joined.items.slice(0, SHOWN) } });
    } catch (error) {
      setState({ at: "error", message: error instanceof Error ? error.message : "신고를 불러오지 못했습니다." });
    }
  }

  return (
    <section aria-labelledby="learning-reports" className="flex flex-col gap-4 rounded-card border border-line bg-raised p-4 sm:p-6" data-admin-learning-reports>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="learning-reports" className="text-title-s font-bold text-ink">
            {title} · &lsquo;내 답도 맞아요&rsquo; 신고
          </h2>
          <p className="text-label leading-relaxed text-ink-soft">
            학습자 기록을 읽어 문항별로 모아요. 누구의 신고인지는 나오지 않아요. 맞는 답은 강의 파일의 허용 답에 더해서 반영하고, 이 화면은
            보기만 해요.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={state.at === "loading"}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-control border border-line bg-surface px-4 text-label font-semibold text-ink transition-colors cursor-pointer hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-40"
        >
          {state.at === "loading" ? "불러오는 중…" : state.at === "loaded" ? "다시 불러오기" : "신고 불러오기"}
        </button>
      </div>

      {state.at === "loading" && state.read > 0 ? (
        <p className="text-label text-ink-soft" aria-live="polite">
          학습 기록 <span className="tabular-nums">{state.read}</span>개를 읽었어요…
        </p>
      ) : null}

      {state.at === "error" ? (
        <p className="text-label text-danger" role="alert">
          {state.message}
        </p>
      ) : null}

      {state.at === "loaded" ? (
        <>
          <p className="text-label text-ink-soft" role="status">
            학습 기록 <span className="tabular-nums">{state.data.records}</span>개 · 신고가 있는 기록{" "}
            <span className="tabular-nums">{state.data.recordsWithReports}</span>개 · 신고된 문항{" "}
            <span className="tabular-nums">{state.data.itemCount}</span>개
            {state.data.itemCount > state.data.items.length ? ` (많이 신고된 ${state.data.items.length}개만 보여요)` : ""}
          </p>
          {state.data.items.length ? (
            <ul className="flex flex-col divide-y divide-line border-t border-line">
              {state.data.items.map((group) => (
                <li key={group.item} className="flex flex-col gap-1.5 py-3" data-report-item={group.item}>
                  <p className="text-label text-ink-soft">
                    <span className="font-semibold text-ink">{group.about?.lessonTitle ?? "과정에 없는 문항"}</span> · {group.item} · 신고{" "}
                    <span className="tabular-nums">{group.count}</span>건 · 학습자 <span className="tabular-nums">{group.learners}</span>명 · 최근{" "}
                    <span className="tabular-nums">{group.lastDay}</span>
                  </p>
                  {group.about ? <p className="text-body text-ink">{group.about.prompt}</p> : null}
                  {group.about ? (
                    <p className="text-label text-ink-soft">
                      지금 정답 ·{" "}
                      <span lang="en" className="text-ink">
                        {group.about.answers.slice(0, 4).join(" / ")}
                      </span>
                      {group.about.answers.length > 4 ? ` 외 ${group.about.answers.length - 4}개` : ""}
                    </p>
                  ) : null}
                  <ul className="flex flex-col gap-1 pl-3">
                    {group.answers.map((answer) => (
                      <li key={answer.answer} className="text-body text-ink">
                        <span lang="en">{answer.answer || "(빈 답)"}</span>{" "}
                        <span className="text-caption tabular-nums text-ink-soft">
                          {answer.count}번 · {answer.lastDay}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-ink-soft">아직 신고가 없어요.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
