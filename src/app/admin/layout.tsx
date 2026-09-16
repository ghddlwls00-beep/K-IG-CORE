import type { Metadata } from "next";

/**
 * SEC-03 — the admin PIN screen is reachable by URL and must not be indexed.
 * `robots.txt` already disallows `/admin/`, but a disallow only stops crawling;
 * a link to the page can still be indexed without one. The page itself is a
 * client component and cannot export metadata, so the rule lives on its layout.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
