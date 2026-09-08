import type { Metadata, Viewport } from "next";
import { LanguageProvider } from "@/components/LanguageProvider";
import { ProgressProvider } from "@/components/ProgressProvider";
import { LicenseProvider } from "@/components/LicenseProvider";
import { LicenseModal } from "@/components/LicenseModal";
import { TabBar } from "@/components/TabBar";
import { KakaoTalkNoticeBanner } from "@/components/KakaoTalkNoticeBanner";
import { NavigationScrollRestoration } from "@/components/NavigationScrollRestoration";
import { getCourseTabMap, getTabs } from "@/lib/content";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://k-ig-core.vercel.app"),
  title: {
    default: "K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING · CNN)",
    template: "%s · K-IG 핵심 어학 마스터",
  },
  description:
    "K-IG 핵심 7개 과정 전용 플랫폼: STUDENT 회화, VOCA 어휘, 영문법 1·2, LISTENING, READING, CNN 뉴스 러닝.",
  alternates: {
    canonical: "/",
  },
  other: {
    google: "notranslate",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
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
      </head>
      <body className="notranslate min-h-screen bg-surface text-ink antialiased" translate="no">
        <NavigationScrollRestoration />
        <LanguageProvider>
          <ProgressProvider>
            <LicenseProvider>
              <KakaoTalkNoticeBanner />
              <TabBar tabs={tabs} courseTabs={courseTabs} />
              <LicenseModal />
              {children}
            </LicenseProvider>
          </ProgressProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
