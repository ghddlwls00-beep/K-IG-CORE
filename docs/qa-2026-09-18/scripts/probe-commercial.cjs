#!/usr/bin/env node
/**
 * Phase 9 — commercial readiness, legal pages, contact, SEO basics. Anonymous GETs only.
 *
 *   - robots.txt and sitemap.xml: every listed URL fetched (status, redirect, noindex)
 *   - metadata on the home page, a course list, a free lesson and a paid lesson
 *   - legal / contact / refund / business information anywhere in the served HTML
 *   - the purchase path a buyer would follow (paywall → purchase link)
 *   - third-party origins requested by the HTML (trackers)
 * Output: out/commercial.json
 */
const fs = require("fs");
const path = require("path");
const BASE = process.env.BASE || "https://k-ig-core.vercel.app";
const OUT = path.join(__dirname, "../out");
const get = async (url, headers = {}) => {
  const r = await fetch(url.startsWith("http") ? url : BASE + url, { headers, redirect: "manual" }).catch(() => null);
  if (!r) return { status: -1, text: "", headers: new Map() };
  const text = await r.text().catch(() => "");
  return { status: r.status, text, location: r.headers.get("location"), type: r.headers.get("content-type") || "", robots: r.headers.get("x-robots-tag") };
};

(async () => {
  const out = { at: new Date().toISOString(), base: BASE };
  const robots = await get("/robots.txt");
  out.robots = { status: robots.status, body: robots.text.slice(0, 400) };
  const sm = await get("/sitemap.xml");
  const urls = [...sm.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  out.sitemap = { status: sm.status, urlCount: urls.length, urls: urls.slice(0, 40) };
  const checked = [];
  for (const u of urls) {
    const r = await get(u);
    const noindex = /noindex/i.test(r.robots || "") || /<meta[^>]+robots[^>]+noindex/i.test(r.text);
    checked.push({ url: u.replace(BASE, ""), status: r.status, redirect: r.location || null, noindex });
  }
  out.sitemapChecked = { total: checked.length, notOk: checked.filter((c) => c.status !== 200), noindex: checked.filter((c) => c.noindex).map((c) => c.url) };

  const pages = { home: "/", list: "/reading", free: "/reading/pr001", paid: "/reading/pr100", student: "/student" };
  out.meta = {};
  const externalOrigins = new Set();
  const legalHits = {};
  for (const [name, url] of Object.entries(pages)) {
    const r = await get(url);
    const pick = (re) => { const m = r.text.match(re); return m ? m[1].slice(0, 160) : null; };
    out.meta[name] = {
      status: r.status,
      title: pick(/<title>([^<]*)<\/title>/i),
      description: pick(/<meta[^>]+name="description"[^>]+content="([^"]*)"/i),
      canonical: pick(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i),
      og: pick(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i),
      robotsMeta: pick(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/i),
      lang: pick(/<html[^>]+lang="([^"]*)"/i),
      h1Count: (r.text.match(/<h1/gi) || []).length,
    };
    for (const m of r.text.matchAll(/(?:src|href)="(https?:\/\/[^"/]+)/g)) if (!m[1].includes("k-ig-core.vercel.app")) externalOrigins.add(m[1]);
    for (const [k, re] of Object.entries({
      terms: /이용약관|서비스 약관|Terms of/i,
      privacy: /개인정보\s*처리방침|Privacy Policy/i,
      refund: /환불\s*(정책|규정|안내)|취소 및 환불/,
      contact: /고객\s*(센터|문의)|문의하기|이메일 문의|카카오톡 채널|contact@|support@/i,
      business: /사업자\s*등록번호|통신판매업|대표자|상호명/,
      purchase: /구매(하기| 안내| 링크)|스마트스토어|크몽|결제/,
      cookie: /쿠키|cookie consent/i,
    })) {
      if (re.test(r.text)) (legalHits[k] ||= []).push(name);
    }
  }
  out.externalOrigins = [...externalOrigins];
  out.legal = legalHits;

  // what a buyer sees on a locked lesson
  const paid = await get("/reading/pr100");
  const paywall = paid.text.match(/[^<>]{0,80}(ALL-PASS ONLY|VIP ALL-PASS REQUIRED|STUDENT PASS ONLY)[^<>]{0,200}/);
  out.paywall = {
    markerContext: paywall ? paywall[0].replace(/\s+/g, " ").trim() : null,
    purchaseLinkPresent: /href="https?:\/\/(?!k-ig-core)[^"]+"[^>]*>\s*[^<]*구매/i.test(paid.text),
    purchaseComingSoon: /구매 링크 준비 중/.test(paid.text),
  };
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "commercial.json"), JSON.stringify(out, null, 1));
  console.log(JSON.stringify({ robots: out.robots, sitemap: { count: out.sitemap.urlCount, notOk: out.sitemapChecked.notOk, noindex: out.sitemapChecked.noindex.length }, meta: out.meta, legal: out.legal, externalOrigins: out.externalOrigins, paywall: out.paywall }, null, 1));
})();
