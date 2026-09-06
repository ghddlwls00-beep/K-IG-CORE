"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  calculateExpiry,
  getPlanLabel,
  isFreePreviewLesson,
  validateLicenseKey,
  type LicenseInfo,
  type LicensePlan,
} from "@/lib/license";

interface StoredLicense {
  key: string;
  plan: LicensePlan;
  activatedAt: number;
  expiresAt: number | null;
}

interface LicenseContextType {
  hasActiveLicense: boolean;
  licenseInfo: LicenseInfo | null;
  isUnlocked: (courseSlug: string, lessonId: string, indexInSection?: number) => boolean;
  activateKey: (key: string) => { success: boolean; message: string };
  deactivateLicense: () => void;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
}

const LicenseContext = createContext<LicenseContextType | null>(null);

const STORAGE_KEY = "kig:license:v1";

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useState<StoredLicense | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load license from localStorage on client mount
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredLicense;
        setStored(parsed);
      }
    } catch {
      // ignore
    }
    setIsLoaded(true);
  }, []);

  // Compute active status
  const now = Date.now();
  const isExpired = Boolean(stored?.expiresAt && stored.expiresAt < now);
  const hasActiveLicense = Boolean(stored && !isExpired);

  const licenseInfo: LicenseInfo | null = stored
    ? {
        key: stored.key,
        plan: stored.plan,
        planLabel: getPlanLabel(stored.plan),
        activatedAt: new Date(stored.activatedAt).toLocaleDateString("ko-KR"),
        expiresAt: stored.expiresAt ? new Date(stored.expiresAt).toLocaleDateString("ko-KR") : null,
        isExpired,
      }
    : null;

  function isUnlocked(courseSlug: string, lessonId: string, indexInSection?: number): boolean {
    if (hasActiveLicense) return true;
    return isFreePreviewLesson(courseSlug, lessonId, indexInSection);
  }

  function activateKey(rawKey: string): { success: boolean; message: string } {
    const res = validateLicenseKey(rawKey);
    if (!res.valid || !res.plan) {
      return { success: false, message: res.error || "유효하지 않은 이용권입니다." };
    }

    const activatedAt = Date.now();
    const expiresAt = calculateExpiry(res.plan, activatedAt);
    const newStored: StoredLicense = {
      key: rawKey.trim().toUpperCase(),
      plan: res.plan,
      activatedAt,
      expiresAt,
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(newStored));
      setStored(newStored);
      return {
        success: true,
        message: `${getPlanLabel(res.plan)}이 성공적으로 등록되었습니다! 1,677개 모든 레슨이 활성화되었습니다.`,
      };
    } catch (e) {
      return { success: false, message: "이용권 저장에 실패했습니다. 브라우저 저장소를 확인해 주세요." };
    }
  }

  function deactivateLicense() {
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
        isUnlocked,
        activateKey,
        deactivateLicense,
        isModalOpen,
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false),
      }}
    >
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const ctx = useContext(LicenseContext);
  if (!ctx) {
    throw new Error("useLicense must be used within LicenseProvider");
  }
  return ctx;
}
