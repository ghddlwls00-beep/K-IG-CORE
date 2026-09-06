"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  getPlanLabel,
  isFreePreviewLesson,
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
          fetch("/api/license/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: parsed.key,
              deviceId: dev.id,
              token: parsed.token,
            }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (data.valid) {
                setStored(parsed);
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
  const now = Date.now();
  const isExpired = Boolean(stored?.expiresAt && stored.expiresAt < now);
  const hasActiveLicense = Boolean(stored && !isExpired && stored.token);

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
