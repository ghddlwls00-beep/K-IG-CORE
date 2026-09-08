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
  isAdmin: boolean;
  adminPreview: number | "free" | null;
  setAdminPreview: (mode: number | "free" | "full") => Promise<void>;
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPreview, setAdminPreviewState] = useState<number | "free" | null>(null);
  const [studentProgress, setStudentProgress] = useState<StudentProgressSnapshot | null>(null);
  const [studentProgressLoading, setStudentProgressLoading] = useState(false);

  const checkAdmin = useCallback(() => {
    return fetch("/api/admin/check", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => {
        setIsAdmin(Boolean(data.authenticated));
        setAdminPreviewState(data.authenticated ? data.studentPreview ?? null : null);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    void checkAdmin();
    const onAuthChanged = () => void checkAdmin();
    window.addEventListener("kig:admin-auth-changed", onAuthChanged);
    return () => window.removeEventListener("kig:admin-auth-changed", onAuthChanged);
  }, [checkAdmin]);

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
            .then((res) => res.json())
            .then((data) => {
              if (data.valid) {
                setStored(parsed);
                if (window.location.pathname.startsWith("/student/")) {
                  const reloadKey = `kig:license-cookie:${storedToken.slice(-16)}`;
                  if (!window.sessionStorage.getItem(reloadKey)) {
                    window.sessionStorage.setItem(reloadKey, "1");
                    window.location.reload();
                  }
                }
              } else {
                console.warn("Server rejected license:", data.error);
                window.localStorage.removeItem(STORAGE_KEY);
                setStored(null);
              }
            })
            .catch(() => {
              // Offline fallback: allow only if valid token string exists
              setStored(parsed);
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

  async function setAdminPreview(mode: number | "free" | "full") {
    const response = await fetch("/api/admin/student-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode }),
    });
    if (!response.ok) throw new Error("관리자 미리보기 설정에 실패했습니다.");
    setAdminPreviewState(mode === "full" ? null : mode);
    window.location.reload();
  }

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
    if (courseSlug === "student" && isAdmin) {
      if (adminPreview === "free") {
        return isFreePreviewLesson(courseSlug, lessonId, sectionIndex, lessonIndex);
      }
      const match = lessonId.match(/^s(\d+)-/);
      return adminPreview === null || (match ? Number(match[1]) <= adminPreview : false);
    }

    // 1. Free preview lessons (e.g. 1st & 2nd lessons of Section 1) are always open
    if (isFreePreviewLesson(courseSlug, lessonId, sectionIndex, lessonIndex)) {
      return true;
    }

    // 2. Requires active, non-expired license
    if (!hasActiveLicense || !stored) {
      return false;
    }

    if (courseSlug === "student") {
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
          if (window.location.pathname.startsWith("/student")) window.location.reload();
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
        isAdmin,
        adminPreview,
        setAdminPreview,
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
