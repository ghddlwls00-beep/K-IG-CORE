"use client";

import { usePathname } from "next/navigation";
import { useLicense } from "./LicenseProvider";

export function AdminStudentModeBanner() {
  const pathname = usePathname();
  const { isAdmin, adminPreview, setAdminPreview } = useLicense();
  if (!isAdmin || !pathname.startsWith("/student")) return null;

  const value = adminPreview === null ? "full" : String(adminPreview);
  return (
    <aside className="sticky top-0 z-40 border-b border-amber-300/60 bg-amber-50/95 px-4 py-2.5 backdrop-blur" aria-label="관리자 STUDENT 열람 모드">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[12.5px] font-semibold text-amber-950">
          <span aria-hidden>🛡️</span>
          <span>{adminPreview === null ? "관리자 전체 열람 모드" : `사용자 화면 미리보기 · ${adminPreview === "free" ? "무료 사용자" : `챕터 ${adminPreview}까지 해금`}`}</span>
        </div>
        <label className="flex items-center gap-2 text-[12px] text-amber-950">
          <span>화면 상태</span>
          <select
            value={value}
            onChange={(event) => void setAdminPreview(event.target.value === "full" ? "full" : event.target.value === "free" ? "free" : Number(event.target.value))}
            className="rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 font-semibold"
            aria-label="관리자 사용자 화면 미리보기 상태"
          >
            <option value="full">관리자 전체 열람</option>
            <option value="free">무료 사용자</option>
            {Array.from({ length: 20 }, (_, index) => (
              <option key={index + 1} value={index + 1}>챕터 {index + 1}까지 해금</option>
            ))}
          </select>
        </label>
      </div>
    </aside>
  );
}
