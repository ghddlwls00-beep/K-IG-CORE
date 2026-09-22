#!/usr/bin/env node
/**
 * Phase 8 — security/privacy probes against production, READ-ONLY.
 *
 * What is sent, and why none of it can change data:
 *   - GET on routes that only read.
 *   - POST with an EMPTY JSON body and NO cookies to admin/license management
 *     routes whose handlers check the admin session BEFORE reading the body
 *     (checked in source: generate, student-progress, reset, revoke, unrevoke,
 *     update-limit, status). Without a session they must answer 401.
 *   - POST /api/license/verify with a syntactically wrong token — the handler
 *     only reads storage after the HMAC check passes.
 *   - NOT sent: /api/license/activate, /api/license/deactivate, /api/admin/login
 *     (they register/unregister devices or count login attempts).
 *
 * Also: security headers per response type, and a scan of every JS chunk the
 * home page and one lesson page load for secret-looking strings.
 *
 * Output: out/security-probe.json and a printed table.
 */
const fs = require("fs");
const path = require("path");
const BASE = "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");

const results = [];
const rec = (id, what, expect, got, pass, note = "") => results.push({ id, what, expect, got, pass, note });

async function req(method, url, body) {
  const init = { method, redirect: "manual", headers: {} };
  if (body !== undefined) {
    init.headers["content-type"] = "application/json";
    init.body = JSON.stringify(body);
  }
  const r = await fetch(BASE + url, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: r.status, headers: r.headers, text, json };
}

(async () => {
  // 1. Admin / licence management without a session
  for (const [method, url] of [
    ["GET", "/api/license/status"],
    ["POST", "/api/license/status"],
    ["POST", "/api/admin/generate"],
    ["POST", "/api/admin/student-progress"],
    ["POST", "/api/license/reset"],
    ["POST", "/api/license/revoke"],
    ["POST", "/api/license/unrevoke"],
    ["POST", "/api/license/update-limit"],
  ]) {
    const r = await req(method, url, method === "POST" ? {} : undefined);
    const leaks = /"records"|"key"\s*:|KIG-/.test(r.text);
    rec("AUTH", `${method} ${url} (no cookie)`, "401, no data", `${r.status}${leaks ? " + DATA" : ""}`, r.status === 401 && !leaks);
  }
  {
    const r = await req("GET", "/api/admin/check");
    rec("AUTH", "GET /api/admin/check (no cookie)", "authenticated:false", `${r.status} ${r.text.slice(0, 60)}`, r.json && r.json.authenticated === false);
  }
  {
    const r = await req("GET", "/api/admin/check");
    const r2 = await fetch(BASE + "/api/admin/check", { headers: { authorization: "Bearer x.y" } });
    const j2 = await r2.json().catch(() => null);
    rec("AUTH", "GET /api/admin/check with forged Bearer token", "authenticated:false", `${r2.status} ${JSON.stringify(j2)}`, j2 && j2.authenticated === false);
  }
  // 2. Learner APIs without a licence
  for (const [method, url, body] of [
    ["GET", "/api/progress/student"],
    ["POST", "/api/progress/student", {}],
    ["GET", "/api/student/chapter-audio?chapter=2"],
  ]) {
    const r = await req(method, url, body);
    rec("LICENCE", `${method} ${url} (no licence)`, "401", String(r.status), r.status === 401);
  }
  {
    const r = await req("GET", "/api/student/chapter-audio?chapter=1");
    const ids = r.json && r.json.items ? [...new Set(r.json.items.map((i) => i.lessonId))] : [];
    rec("LICENCE", "GET chapter-audio?chapter=1 (no licence)", "only free preview lessons", `${r.status} access=${r.json && r.json.access} lessons=${ids.join(",")}`, r.status === 200 && r.json.access === "free");
  }
  {
    const r = await req("POST", "/api/license/verify", { key: "KIG-LIFE-0000000000000000-0000000000000000", deviceId: "audit-probe", token: "e30.invalid" });
    rec("LICENCE", "POST /api/license/verify forged token", "403 tampered", `${r.status} ${r.text.slice(0, 80)}`, r.status === 403);
    const setCookie = r.headers.get("set-cookie");
    rec("LICENCE", "forged verify sets no session cookie", "no Set-Cookie", setCookie ? "Set-Cookie present" : "none", !setCookie);
  }
  // 3. Information exposed without auth
  {
    const r = await req("GET", "/api/media-health");
    rec("INFO", "GET /api/media-health (public)", "no secrets", `${r.status} ${r.text.slice(0, 160)}`, r.status === 200 && !/[A-Za-z0-9]{32,}/.test(r.text), "reveals credential/probe state booleans");
  }
  // 4. Security headers
  const headerNames = ["strict-transport-security", "content-security-policy", "x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "x-powered-by", "server"];
  for (const url of ["/", "/reading/pr100", "/admin/license", "/api/admin/check", "/audio/ld/d001.mp3", "/sitemap.xml"]) {
    const r = await fetch(BASE + url, { method: "GET", redirect: "manual", headers: { range: "bytes=0-0" } });
    const h = {};
    for (const n of headerNames) h[n] = r.headers.get(n);
    await r.arrayBuffer().catch(() => {});
    const missing = ["strict-transport-security", "x-content-type-options", "referrer-policy"].filter((n) => !h[n]);
    rec("HEADERS", `${url} → ${r.status}`, "HSTS, nosniff, referrer-policy; CSP on HTML", JSON.stringify(h), missing.length === 0 && (!/^\/($|reading|admin)/.test(url) || !!h["content-security-policy"]), missing.length ? `missing: ${missing.join(", ")}` : "");
  }
  // 5. Secret-looking strings in client JS
  const pages = ["/", "/reading/pr100", "/admin/license"];
  const chunks = new Set();
  for (const p of pages) {
    const html = await (await fetch(BASE + p)).text();
    for (const m of html.matchAll(/\/_next\/static\/[^"'\s)]+\.js/g)) chunks.add(m[0]);
  }
  const patterns = [
    ["LICENSE_SECRET/SALT names", /LICENSE_(SECRET|SALT)|ADMIN_(PIN|SESSION_SECRET)|R2_SECRET_ACCESS_KEY|AZURE_SPEECH_KEY|LICENSE_STORAGE_SECRET/],
    ["known compromised defaults", /KIG_EDU_KEY_SALT|KIG_SERVER_LICENSE_SIGNING|KIG_ADMIN_SECRET_SALT|kig2026!/],
    ["AWS/R2 access key id shape", /\b(AKIA|ASIA)[A-Z0-9]{16}\b/],
    ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
    ["generated licence key shape", /KIG-(1M|1Y|LIFE|STU1M|STU1Y|STULIFE|STU)-[A-F0-9]{16}-[A-F0-9]{16}/],
  ];
  const hits = [];
  let bytes = 0;
  for (const c of chunks) {
    const js = await (await fetch(BASE + c)).text();
    bytes += js.length;
    for (const [name, re] of patterns) if (re.test(js)) hits.push(`${name} in ${c}`);
  }
  rec("BUNDLE", `${chunks.size} JS chunks (${Math.round(bytes / 1024)} KB) from ${pages.join(", ")}`, "no secret-looking strings", hits.length ? hits.join("; ") : "none", hits.length === 0);

  fs.writeFileSync(path.join(OUT, "security-probe.json"), JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 1));
  const pass = results.filter((r) => r.pass).length;
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  [${r.id}] ${r.what}\n      expect: ${r.expect}\n      got:    ${r.got}${r.note ? `\n      note:   ${r.note}` : ""}`);
  console.log(`\n${pass} PASS / ${results.length - pass} FAIL`);
})();
