// LECTURE 확인(2026-10-17) — probe-bundle-leak-all 이 lecture 를 몰라 exit 2 로 멈춰서, 그 자리에 LECTURE 만 따로 본다(익명 GET 만).
// 200강 HTML + RSC · /lecture · /t/lecture · / · /sitemap.xml · /search-index.json · 거기서 부른 /_next/static JS 전부를 받아
// 유료 강의(lm001 · lm002 밖)의 미디어 주소 'audio/lecture/<id>' · R2 주소(r2.dev · r2.cloudflarestorage) · pen 내용 꼴('"strokes":[[') 을 센다.
// --break : 받은 것 하나에 lm003 의 pen 주소를 심어 1 이 나오는지(검사가 실패할 수 있음).
const fs = require("fs");
const path = require("path");
const BASE = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3390";
const BREAK = process.argv.includes("--break");
const REPO = path.resolve(__dirname, "../../..");
const ids = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/lecture.json"), "utf8")).lessons.map((l) => l.id ?? l);
const FREE = new Set(["lm001", "lm002"]);
const PAID_MEDIA = /audio\/lecture\/(l[mh]\d{3})/g;
const R2 = /r2\.dev|r2\.cloudflarestorage/g;
const PEN_BODY = /"strokes"\s*:\s*\[\s*\[/g;

(async () => {
  const docs = [];
  const get = async (url, headers = {}) => {
    const r = await fetch(BASE + url, { headers, redirect: "follow" });
    return { status: r.status, text: await r.text() };
  };
  const routes = ["/", "/lecture", "/t/lecture", "/sitemap.xml", "/search-index.json", ...ids.map((id) => `/lecture/${id}`)];
  for (const u of routes) {
    docs.push({ url: u, kind: "html", ...(await get(u)) });
    if (!/\.(xml|json)$/.test(u)) docs.push({ url: u, kind: "rsc", ...(await get(u, { RSC: "1" })) });
  }
  const chunks = new Set();
  for (const d of docs) for (const m of d.text.matchAll(/\/_next\/static\/[\w\-./%~]+?\.(?:js|css)/g)) chunks.add(m[0]);
  for (const c of chunks) docs.push({ url: c, kind: "chunk", ...(await get(c)) });
  if (BREAK) docs[docs.length - 1].text += "audio/lecture/lm003/pen.json";
  const hits = [];
  for (const d of docs) {
    const isFreePage = /^\/lecture\/lm00[12]$/.test(d.url);
    const paid = [...d.text.matchAll(PAID_MEDIA)].map((m) => m[1]).filter((id) => !FREE.has(id));
    const r2 = (d.text.match(R2) || []).length;
    const pen = (d.text.match(PEN_BODY) || []).length;
    const freeOnOtherPage = !isFreePage ? [...d.text.matchAll(PAID_MEDIA)].map((m) => m[1]).filter((id) => FREE.has(id)) : [];
    if (paid.length || r2 || pen) hits.push({ url: d.url, kind: d.kind, paid: [...new Set(paid)].slice(0, 5), r2, pen });
    d.freeOnOtherPage = freeOnOtherPage.length;
  }
  const non200 = docs.filter((d) => d.status !== 200).map((d) => `${d.kind} ${d.url} ${d.status}`);
  const summary = {
    base: BASE,
    lecturePages: ids.length,
    documents: docs.filter((d) => d.kind !== "chunk").length,
    chunks: chunks.size,
    bytes: docs.reduce((s, d) => s + d.text.length, 0),
    leaks: hits.length,
    hits: hits.slice(0, 20),
    non200: non200.slice(0, 20),
    freeMediaPathOnOtherDocs: docs.filter((d) => d.freeOnOtherPage).map((d) => `${d.kind} ${d.url}`).slice(0, 10),
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!BREAK) fs.writeFileSync(path.join(REPO, "docs/qa-2026-09-18/out/lecture/verify/public-leak.json"), JSON.stringify(summary, null, 2));
  process.exit(hits.length ? 1 : 0);
})();
