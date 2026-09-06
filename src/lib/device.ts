"use client";

/**
 * Client-side Device Identity Management.
 * Generates and stores a unique device ID and a human-readable device name
 * (e.g. "Windows PC (Chrome)", "iPhone (Safari)") to enforce the 2-device limit.
 */

const DEVICE_ID_KEY = "kig:device:id:v1";
const DEVICE_NAME_KEY = "kig:device:name:v1";

export interface ClientDevice {
  id: string;
  name: string;
}

export function getOrCreateDeviceId(): ClientDevice {
  if (typeof window === "undefined") {
    return { id: "unknown", name: "서버/알 수 없는 기기" };
  }

  let id = window.localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = "dev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now().toString(36);
    try {
      window.localStorage.setItem(DEVICE_ID_KEY, id);
    } catch {
      // ignore
    }
  }

  let name = window.localStorage.getItem(DEVICE_NAME_KEY);
  if (!name) {
    name = detectDeviceName();
    try {
      window.localStorage.setItem(DEVICE_NAME_KEY, name);
    } catch {
      // ignore
    }
  }

  return { id, name };
}

function detectDeviceName(): string {
  if (typeof navigator === "undefined") return "알 수 없는 기기";
  const ua = navigator.userAgent;

  let os = "기타 기기";
  if (/Windows/i.test(ua)) os = "Windows 데스크탑";
  else if (/Macintosh|Mac OS/i.test(ua)) os = "Mac 데스크탑/노트북";
  else if (/iPhone/i.test(ua)) os = "iPhone";
  else if (/iPad/i.test(ua)) os = "iPad";
  else if (/Android/i.test(ua)) {
    os = /Mobile/i.test(ua) ? "Android 스마트폰" : "Android 태블릿";
  }

  let browser = "";
  if (/Whale/i.test(ua)) browser = "웨일";
  else if (/SamsungBrowser/i.test(ua)) browser = "삼성인터넷";
  else if (/Chrome/i.test(ua) && !/Edge|Edg/i.test(ua)) browser = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
  else if (/Edge|Edg/i.test(ua)) browser = "Edge";

  return browser ? `${os} (${browser})` : os;
}
