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
import { getOrCreateDeviceId, type ClientDevice } from "@/lib/device";

interface StoredLicense {
  key: string;
  plan: LicensePlan;
  activatedAt: number;
  expiresAt: number | null;
}

interface LicenseContextType {
  hasActiveLicense: boolean;
  licenseInfo: LicenseInfo | null;
  currentDevice: ClientDevice;
  isUnlocked: (courseSlug: string, lessonId: string, sectionIndex?: number, lessonIndex?: number) => boolean;
  activateKey: (key: string) => Promise<{ success: boolean; message: string }>;
  deactivateLicense: () => Promise<void>;
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
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

  // Load license and device info on client mount
  useEffect(() => {
    try {
      const dev = getOrCreateDeviceId();
      setCurrentDevice(dev);

      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredLicense;
        setStored(parsed);
      }
    } catch {
      // ignore
    }
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

  function isUnlocked(
    courseSlug: string,
    lessonId: string,
    sectionIndex?: number,
    lessonIndex?: number,
  ): boolean {
    if (hasActiveLicense) return true;
    return isFreePreviewLesson(courseSlug, lessonId, sectionIndex, lessonIndex);
  }

  async function activateKey(rawKey: string): Promise<{ success: boolean; message: string }> {
    const res = validateLicenseKey(rawKey);
    if (!res.valid || !res.plan) {
      return { success: false, message: res.error || "유효하지 않은 이용권입니다." };
    }

    const dev = getOrCreateDeviceId();

    let regDevicesCount = 1;
    let regMaxDevices = 2;

    // Enforce device limit via API
    try {
      const resp = await fetch("/api/license/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: rawKey,
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
            "이용권 등록 가능한 최대 기기 수를 초과하였습니다. 기존 기기에서 등록을 해제해 주세요.",
        };
      }

      if (data.registeredDevicesCount) regDevicesCount = data.registeredDevicesCount;
      if (data.maxDevices) regMaxDevices = data.maxDevices;
    } catch (err) {
      console.warn("Device registration API network issue, falling back to local verification:", err);
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
        message: `${getPlanLabel(res.plan)}이 성공적으로 등록되었습니다! (기기 등록 현황: ${regDevicesCount}/${regMaxDevices}대)`,
      };
    } catch (e) {
      return { success: false, message: "이용권 저장에 실패했습니다. 브라우저 저장소를 확인해 주세요." };
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
