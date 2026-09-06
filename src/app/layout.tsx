import type { Metadata } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ProgressProvider } from "@/components/ProgressProvider";
import { TabBar } from "@/components/TabBar";
import { getCourseTabMap, getTabs } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING · CNN)",
    template: "%s · K-IG 핵심 어학 마스터",
  },
  description:
    "K-IG 핵심 6개 과정 전용 플랫폼: VOCA 어휘 매트릭스, 영문법 1·2, LISTENING, 리딩 본문 분석, CNN 뉴스 러닝.",
  other: {
    google: "notranslate",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // The original kept this bar in a permanent frame; putting it in the root
  // layout is the modern equivalent — it renders once and never reloads.
  const tabs = getTabs();
  const courseTabs = getCourseTabMap();

  return (
    <html lang="ko" translate="no" className="notranslate">
      <head>
        <meta name="google" content="notranslate" />
        <meta name="robots" content="notranslate" />
      </head>
      <body className="notranslate min-h-screen bg-surface text-ink antialiased" translate="no">
        <LanguageProvider>
          <ProgressProvider>
            <TabBar tabs={tabs} courseTabs={courseTabs} />
            {children}
          </ProgressProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
