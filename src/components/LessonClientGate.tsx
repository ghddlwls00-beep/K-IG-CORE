"use client";

import React, { useEffect, useState } from "react";
import { useLicense } from "@/components/LicenseProvider";
import { LessonPaywall } from "@/components/LessonPaywall";
import { isFreePreviewLesson } from "@/lib/license";

interface LessonClientGateProps {
  courseSlug: string;
  courseTitle?: string;
  lessonId: string;
  lessonTitle?: string;
  isFreePreview?: boolean;
  children: React.ReactNode;
}

/**
 * Wraps lesson learning body (video, audio, drill content) with access control.
 * Free preview lessons (Top 2 sections) are always accessible.
 * Locked lessons require an active license; otherwise displays the high-converting Paywall card.
 */
export function LessonClientGate({
  courseSlug,
  courseTitle,
  lessonId,
  lessonTitle,
  isFreePreview,
  children,
}: LessonClientGateProps) {
  const { hasActiveLicense } = useLicense();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isFree = typeof isFreePreview === "boolean" ? isFreePreview : isFreePreviewLesson(courseSlug, lessonId);

  // Free preview lessons are always accessible immediately
  if (isFree) {
    return <>{children}</>;
  }

  // Before hydration finishes, show a clean skeleton to prevent content flash
  if (!mounted) {
    return (
      <div className="my-8 rounded-3xl border border-black/[0.06] bg-black/[0.02] p-12 text-center flex flex-col items-center justify-center gap-3 min-h-[280px] animate-pulse">
        <div className="h-10 w-10 rounded-2xl bg-black/10" />
        <div className="h-4 w-48 rounded bg-black/10" />
        <div className="h-3 w-64 rounded bg-black/5" />
      </div>
    );
  }

  // Active license holders get full access
  if (hasActiveLicense) {
    return <>{children}</>;
  }

  // Locked: Render paywall CTA
  return (
    <LessonPaywall
      courseSlug={courseSlug}
      courseTitle={courseTitle}
      lessonId={lessonId}
      title={lessonTitle}
    />
  );
}
