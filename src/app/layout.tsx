import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
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
    default: "K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING)",
    template: "%s · K-IG 핵심 어학 마스터",
  },
  description:
    "K-IG 핵심 6개 과정 전용 플랫폼: STUDENT 회화, VOCA 어휘, 영문법 1·2, LISTENING, READING.",
  // RE-011: a GLOBAL `canonical: "/"` used to live here. Because no page
  // overrode it, EVERY page declared itself a duplicate of the home page, so
  // search engines indexed only "/" and the rest of the site dropped out.
  // Canonical URLs are now set per page (course landing, lesson, home) via each
  // route's own `generateMetadata` / `metadata`.
  openGraph: {
    type: "website",
    siteName: "K-IG 핵심 어학 마스터",
    locale: "ko_KR",
    title: "K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING)",
    description:
      "K-IG 핵심 6개 과정 전용 플랫폼: STUDENT 회화, VOCA 어휘, 영문법 1·2, LISTENING, READING.",
    // RE-012: without these, a KakaoTalk / SNS share renders as a bare link
    // with no thumbnail and no description. SEO-01: the image is the 1000×525
    // landscape crop in public/images/og, declared at its real size — the
    // portrait 1000×1250 section photo used to be declared as 1200×630.
    images: [
      {
        url: "/images/og/students.jpg",
        width: 1000,
        height: 525,
        alt: "K-IG 핵심 어학 마스터",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "K-IG 핵심 어학 마스터 (VOCA · GRAMMAR · LISTENING · READING)",
    description:
      "K-IG 핵심 6개 과정 전용 플랫폼: STUDENT 회화, VOCA 어휘, 영문법 1·2, LISTENING, READING.",
    images: ["/images/og/students.jpg"],
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The original kept this bar in a permanent frame; putting it in the root
  // layout is the modern equivalent — it renders once and never reloads.
  const tabs = getTabs();
  const courseTabs = getCourseTabMap();

  // SEC-05: the per-request CSP nonce made by `src/proxy.ts` (see `src/lib/csp.ts`).
  // Next stamps it on every <script> it writes by itself, but NOT on this one: a
  // `beforeInteractive` script is re-created later in the browser from its props,
  // and without the prop that copy has no nonce. Reading the request headers here
  // is also what makes every page render per request — a prerendered page would
  // carry no nonce at all and every script on it would be blocked.
  // It is null for a Link prefetch, which skips the proxy and is not a document.
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="ko" translate="no" className="notranslate" suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <Script id="kig-theme" strategy="beforeInteractive" nonce={nonce}>
          {`(function(){try{var s=localStorage.getItem('kig:theme');var t=s==='light'||s==='dark'?s:(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=t;document.documentElement.style.colorScheme=t;}catch(e){}})();`}
        </Script>
      </head>
      <body className="notranslate min-h-screen bg-surface text-ink antialiased" translate="no">
        <NavigationScrollRestoration />
        <LanguageProvider>
          <LicenseProvider>
            <ProgressProvider>
              <KakaoTalkNoticeBanner />
              <TabBar tabs={tabs} courseTabs={courseTabs} />
              <LicenseModal />
              {children}
            </ProgressProvider>
          </LicenseProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
