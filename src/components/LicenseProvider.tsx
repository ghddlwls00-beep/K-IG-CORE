"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  getPlanLabel,
  isFreePreviewLesson,
  isStudentOnlyPlan,
  type LicenseInfo,
  type LicensePlan,
} from "@/lib/license";
import { getOrCreateDeviceId, type ClientDevice } from "@/lib/device";

interface StoredLicense {
  key: string;
  plan: LicensePlan;
  activatedAt: number;
  expiresAt: number | null;
  token?: string;
}

/**
 * Lesson routes whose access control now runs on the server (KIG-001).
 * Activating a license while on one of these pages has to trigger a reload so
 * the server sees the new session cookie and renders the lesson body instead of
 * the paywall. Kept as an allow-list so the reload never fires on list pages,
 * the section pages or any non-lesson route.
 */
const SERVER_GATED_LESSON_PATH =
  /^\/(ld|reading|phonics|grammar1|grammar2|cnn|student)\/[^/]+$/;

interface LicenseContextType {
  hasActiveLicense: boolean;
  licenseInfo: LicenseInfo | null;
  currentDevice: ClientDevice;
  isUnlocked: (
    courseSlug: string,
    lessonId: string,
    sectionIndex?: number,
    lessonIndex?: number,
  ) => boolean;
  activateKey: (key: string) => Promise<{ success: boolean; message: string }>;
  deactivateLicense: () => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  studentProgress: StudentProgressSnapshot | null;
  studentProgressLoading: boolean;
  refreshStudentProgress: () => Promise<StudentProgressSnapshot | null>;
  applyStudentProgress: (progress: StudentProgressSnapshot) => void;
}

export interface StudentChapterSnapshot {
  chapter: number;
  label: string;
  lessonIds: string[];
  completedCount: number;
  requiredCount: number;
  percent: number;
  lastLessonCompleted: boolean;
  complete: boolean;
  unlocked: boolean;
}

export interface StudentProgressSnapshot {
  version: number;
  lessons: Record<string, { completed: boolean; updatedAt: number }>;
  unlockedThrough: number;
  lastLessonId?: string;
  updatedAt: number;
  chapters: StudentChapterSnapshot[];
}

const LicenseContext = createContext<LicenseContextType | null>(null);

const STORAGE_KEY = "kig:license:v1";

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredLicense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDevice, setCurrentDevice] = useState<ClientDevice>({
    id: "",
    name: "기기 확인 중...",
  });
  const [clock, setClock] = useState(0);
  const [studentProgress, setStudentProgress] = useState<StudentProgressSnapshot | null>(null);
  const [studentProgressLoading, setStudentProgressLoading] = useState(false);

  useEffect(() => {
    const updateClock = () => setClock(Date.now());
    const initialTimer = window.setTimeout(updateClock, 0);
    const interval = window.setInterval(updateClock, 60_000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(interval);
    };
  }, []);

  // Load license and verify with server on mount
  useEffect(() => {
    try {
      const dev = getOrCreateDeviceId();
      setCurrentDevice(dev);

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredLicense;

        // Verify stored license with server to prevent localStorage tampering
        if (parsed.token && parsed.key) {
          const storedToken = parsed.token;
          fetch("/api/license/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: parsed.key,
              deviceId: dev.id,
              token: storedToken,
            }),
          })
            .then(async (res) => {
              const data = (await res.json().catch(() => null)) as
                | { valid?: boolean; error?: string }
                | null;

              if (res.ok && data?.valid) {
                setStored(parsed);
                if (SERVER_GATED_LESSON_PATH.test(window.location.pathname)) {
                  const reloadKey = `kig:license-cookie:${storedToken.slice(-16)}`;
                  if (!window.sessionStorage.getItem(reloadKey)) {
                    window.sessionStorage.setItem(reloadKey, "1");
                    window.location.reload();
                  }
                }
                return;
              }

              if (res.status === 400 || res.status === 403) {
                // The server gave a definitive answer: this key, token or device is
                // not valid, so the stored copy is worthless — drop it.
                console.warn("Server rejected license:", data?.error);
                window.localStorage.removeItem(STORAGE_KEY);
                setStored(null);
                return;
              }

              // KIG-011: a 5xx or an unreadable body is neither a rejection nor an
              // approval. Stay locked, but keep the stored key so the next
              // successful verification can restore access.
              console.warn("License verification unavailable; staying locked.");
              setStored(null);
            })
            .catch(() => {
              // KIG-011: the request failed outright (offline, blocked, DNS, CORS).
              // A signed token can only be validated by the server, so a failed
              // request must never grant access. This used to call
              // setStored(parsed), which handed an active license to any
              // localStorage payload as soon as /api/license/verify could be
              // blocked — a forged token needed no valid signature at all.
              console.warn("License verification failed; staying locked.");
              setStored(null);
            });
        } else {
          // Untrusted / un-signed localStorage data
          window.localStorage.removeItem(STORAGE_KEY);
          setStored(null);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Compute active status
  const isExpired = Boolean(clock > 0 && stored?.expiresAt && stored.expiresAt < clock);
  const hasActiveLicense = Boolean(stored && !isExpired && stored.token);

  const refreshStudentProgress = useCallback(async (): Promise<StudentProgressSnapshot | null> => {
    setStudentProgressLoading(true);
    try {
      const response = await fetch("/api/progress/student", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) return null;
      setStudentProgress(data.progress);
      return data.progress as StudentProgressSnapshot;
    } catch {
      return null;
    } finally {
      setStudentProgressLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasActiveLicense) void refreshStudentProgress();
    else setStudentProgress(null);
  }, [hasActiveLicense, refreshStudentProgress]);

  const licenseInfo: LicenseInfo | null = stored
    ? {
        key: stored.key,
        plan: stored.plan,
        planLabel: getPlanLabel(stored.plan),
        activatedAt: new Date(stored.activatedAt).toLocaleDateString("ko-KR"),
        expiresAt: stored.expiresAt
          ? new Date(stored.expiresAt).toLocaleDateString("ko-KR")
          : null,
        isExpired,
        isStudentOnly: isStudentOnlyPlan(stored.plan),
      }
    : null;

  function isUnlocked(
    courseSlug: string,
    lessonId: string,
    sectionIndex?: number,
    lessonIndex?: number,
  ): boolean {
    // 1. Free preview lessons (e.g. 1st & 2nd lessons of Section 1) are always open
    if (isFreePreviewLesson(courseSlug, lessonId, sectionIndex, lessonIndex)) {
      return true;
    }

    // 2. Requires active, non-expired license
    if (!hasActiveLicense || !stored) {
      return false;
    }

    if (courseSlug === "student") {
      if (stored.plan === "LIFE") return true;
      const match = lessonId.match(/^s(\d+)-/);
      return Boolean(match && Number(match[1]) <= (studentProgress?.unlockedThrough || 1));
    }

    // 3. STUDENT-only pass grants access exclusively to the student course
    if (isStudentOnlyPlan(stored.plan)) {
      return courseSlug === "student";
    }

    // 4. VIP All-pass grants access to all courses
    return true;
  }

  async function activateKey(
    rawKey: string,
  ): Promise<{ success: boolean; message: string }> {
    if (!rawKey || !rawKey.trim()) {
      return { success: false, message: "이용권 코드를 입력해 주세요." };
    }

    const dev = getOrCreateDeviceId();

    // Authenticate and register exclusively through the server API
    try {
      const resp = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: rawKey.trim().toUpperCase(),
          deviceId: dev.id,
          deviceName: dev.name,
        }),
      });

      const data = await resp.json();

      if (!resp.ok || !data.success) {
        return {
          success: false,
          message:
            data.error ||
            "이용권 등록에 실패했습니다. 코드 형식을 다시 확인해 주세요.",
        };
      }

      const newStored: StoredLicense = {
        key: rawKey.trim().toUpperCase(),
        plan: data.plan,
        activatedAt: data.activatedAt || Date.now(),
        expiresAt: data.expiresAt,
        token: data.licenseToken,
      };

      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newStored));
        setStored(newStored);
        window.setTimeout(() => {
          if (SERVER_GATED_LESSON_PATH.test(window.location.pathname)) {
            // Pre-arm the same guard the mount-time verification uses, so the
            // reload below doesn't trigger a second one once the page comes back
            // with a valid session cookie.
            if (newStored.token) {
              window.sessionStorage.setItem(
                `kig:license-cookie:${newStored.token.slice(-16)}`,
                "1",
              );
            }
            window.location.reload();
          }
        }, 250);
        return {
          success: true,
          message: `${getPlanLabel(data.plan)}이 성공적으로 등록되었습니다! (기기 등록 현황: ${data.registeredDevicesCount || 1}/${data.maxDevices || 2}대)`,
        };
      } catch {
        return {
          success: false,
          message: "브라우저 저장소 접근에 실패했습니다.",
        };
      }
    } catch {
      return {
        success: false,
        message: "서버 통신 오류가 발생했습니다. 인터넷 연결을 확인해 주세요.",
      };
    }
  }

  async function deactivateLicense(): Promise<void> {
    if (stored?.key) {
      const dev = getOrCreateDeviceId();
      try {
        await fetch("/api/license/deactivate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: stored.key, deviceId: dev.id }),
        });
      } catch {
        // ignore
      }
    }

    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setStored(null);
    } catch {
      // ignore
    }

    // Lesson routes are gated on the server now, so dropping the client state is
    // not enough on its own: without a reload the body that was already rendered
    // for a licensed visitor would stay on screen until the next navigation.
    // The deactivate endpoint expires the session cookie, so the reload lands on
    // the paywall. No loop risk — there is no stored license to verify afterwards.
    if (SERVER_GATED_LESSON_PATH.test(window.location.pathname)) {
      window.location.reload();
    }
  }

  return (
    <LicenseContext.Provider
      value={{
        hasActiveLicense,
        licenseInfo,
        currentDevice,
        isUnlocked,
        activateKey,
        deactivateLicense,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
        studentProgress,
        studentProgressLoading,
        refreshStudentProgress,
        applyStudentProgress: setStudentProgress,
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense(): LicenseContextType {
  const context = useContext(LicenseContext);
  if (!context) {
    throw new Error("useLicense must be used within a LicenseProvider");
  }
  return context;
}
