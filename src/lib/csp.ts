/**
 * SEC-05 — the Content-Security-Policy, written in one place.
 *
 * Two policies come out of this file, and they differ in ONE directive:
 *
 *   nonceContentSecurityPolicy(nonce)   sent by `src/proxy.ts` on every page.
 *                                       `script-src 'self' 'nonce-…' 'strict-dynamic'`
 *   NO_SCRIPT_CONTENT_SECURITY_POLICY   sent by `next.config.ts` on files, API
 *                                       answers and clips (`NON_PAGE_SOURCES`).
 *                                       `script-src 'none'`
 *
 * WHY A NONCE. The old policy had to allow `'unsafe-inline'` for scripts, because
 * Next writes its bootstrap and the RSC flight payload as inline <script> tags.
 * That also allowed any inline script an attacker managed to get into a page, so
 * the policy could not stop an XSS. With a nonce, Next stamps a random value on
 * every <script> it writes — Next reads it from the REQUEST's
 * `content-security-policy` header, never from `x-nonce` — and the browser runs
 * only scripts that carry it. A new value is made for every request, so it cannot
 * be guessed from an earlier page.
 *
 * `'strict-dynamic'`: Turbopack loads the rest of the app by creating <script>
 * elements with no nonce. Scripts created by an already-trusted script are allowed
 * by this keyword. Browsers that support it ignore `'self'`; older ones (Safari
 * before 15.4) ignore `'strict-dynamic'` and the nonce keeps `'self'` working.
 *
 * THE PRICE, decided by the owner: a nonce has to be made per request, so no page
 * can be prerendered any more. The root layout reads the request headers, which
 * makes every page render on the server per request (home, course lists and free
 * lessons used to be served as static HTML from the edge).
 *
 * NO RESPONSE EVER CARRIES BOTH POLICIES, and that is by design, not tidiness.
 * The proxy's matcher and `NON_PAGE_SOURCES` cover disjoint sets of paths
 * (`verify-csp-nonce.cjs` N1 checks that against the build output). If both headers
 * reached one page, which one the platform keeps would decide whether the site
 * works: two policies are both enforced, and `script-src 'none'` would block every
 * script on the page. Keeping the sets apart means that question never comes up.
 * Only a Link prefetch gets neither: it is RSC data fetched by the router with a
 * `next-router-prefetch` header, which a browser navigation never sends.
 *
 * `style-src` KEEPS `'unsafe-inline'` AND MUST NEVER GET A NONCE. A browser ignores
 * `'unsafe-inline'` as soon as a nonce is in the same directive, and this app sets
 * inline `style` attributes everywhere (37 on the home page alone) plus the inline
 * <style> in `global-error.tsx`. Next's own guide shows `style-src 'nonce-…'`;
 * copying that line would blank the styling of the whole site. An injected style
 * cannot run code, so this is not what SEC-05 was about.
 *
 * `'unsafe-eval'` is added in development only: the dev runtime of React and
 * Turbopack uses eval. The production chunks contain none.
 *
 * DO NOT ADD A `script-src-elem` DIRECTIVE IN FRONT OF `script-src`. Next finds the
 * nonce in the first directive whose name STARTS WITH `script-src`.
 *
 * ONE KNOWN GAP: the static 500 page. If an error escapes the render entirely (a
 * page module that fails to load), Next serves a 500 page it prerendered at build
 * time (`.next/server/pages/500.html` — Next's own "This page couldn't load", not
 * `global-error.tsx`), under the page's nonce policy, and its scripts carry no
 * nonce. Nothing on it needs them: its "Reload" is a plain form that works with no
 * script. An error inside the render — the common case, including one thrown by
 * the root layout — is rendered per request with the nonce, `global-error.tsx`
 * and its `reset()` button included.
 *
 * The other directives are unchanged from RE-006; the reasons for each (`data:` in
 * `media-src` for the silent audio primer, no `upgrade-insecure-requests`, no
 * `report-uri`) are recorded in `next.config.ts`.
 */

const BEFORE_SCRIPT = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
];

const AFTER_SCRIPT = [
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
];

const policy = (scriptSrc: string) => [...BEFORE_SCRIPT, scriptSrc, ...AFTER_SCRIPT].join("; ");

/** The page policy. `nonce` must be fresh for every request. */
export function nonceContentSecurityPolicy(nonce: string, { dev = false }: { dev?: boolean } = {}): string {
  return policy(`script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`);
}

/**
 * Everything that is not a page: framework files, `/api/*`, clips, images and the
 * root files. None of them is meant to run a script as a document, so no script
 * may run in one — not even a same-origin file. A mistyped `/api/x` or
 * `/images/x` still renders Next's HTML 404 shell, and under this policy nothing
 * in it runs, which is the point: an injected script cannot either.
 */
export const NO_SCRIPT_CONTENT_SECURITY_POLICY = policy("script-src 'none'");

/**
 * The paths that get `NO_SCRIPT_CONTENT_SECURITY_POLICY` (`next.config.ts` headers).
 *
 * THIS LIST AND `config.matcher` IN `src/proxy.ts` MUST NOT OVERLAP (see the top
 * of this file). The matcher leaves out exactly these prefixes and root files, and
 * `:path+` needs at least one segment after the prefix, so `/api` or `/images`
 * alone is still a page path that the proxy answers with its 404. Next matches
 * these sources in any letter case and the matcher does not; the proxy covers that
 * difference itself (`NON_PAGE_ANY_CASE`).
 */
export const NON_PAGE_SOURCES = [
  "/_next/:path+",
  "/_vercel/:path+",
  "/api/:path+",
  "/audio/:path+",
  "/video/:path+",
  "/images/:path+",
  "/.well-known/:path+",
  "/:file(robots\\.txt|sitemap\\.xml|favicon\\.ico|icon\\.svg|search-index\\.json)",
];

/** 18 random bytes → 24 base64 characters, no padding. Matches Next's nonce pattern. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}
