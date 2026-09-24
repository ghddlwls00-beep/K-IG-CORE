"use client";

import { useEffect } from "react";
import { stopSpeech } from "@/lib/speech";

/**
 * Stops any playing speech when the learner leaves the lesson — the one job
 * `LessonBody` did before handing the page to a course view. The lesson page now
 * renders the course view itself (BUG-023), so this keeps that clean-up.
 */
export function LessonSpeechGuard({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, []);
  return <>{children}</>;
}
