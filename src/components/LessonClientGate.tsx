"use client";

import React, { useSyncExternalStore } from "react";
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
 * UNUSED since KIG-001 (984a553 — the lesson page gates on the server; nothing imports this file, docs/qa-2026-09-18/maps/
 * common.md R20). Kept only until a person deletes it (UI검토-1007 46: the deletion was not done by the fix session).
 *
 * Wraps lesson learning body (video, audio, drill content) with access control.
 * The first curriculum section's first two lessons are always accessible.
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
  const { isUnlocked } = useLicense();
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );

  const isFree = typeof isFreePreview === "boolean" ? isFreePreview : isFreePreviewLesson(courseSlug, lessonId);

  // Free preview lessons are always accessible immediately
  if (isFree) {
    return <>{children}</>;
  }

  // Before hydration finishes: a quiet empty space of the body's height — no grey blinking skeleton (UI검토-1007 46)
  if (!mounted) {
    return <div aria-busy="true" className="min-h-[280px]" />;
  }

  // Active license holders get access according to their plan (VIP vs STUDENT-only)
  if (isUnlocked(courseSlug, lessonId)) {
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
