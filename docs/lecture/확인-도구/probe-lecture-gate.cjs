// LECTURE 확인(2026-10-17): 이용권 없이(쿠키 0) 잠긴 강의 HTML · RSC 에 유료 주소가 0 인지, 미디어 문지기가 맞게 답하는지.
// node probe-lecture-gate.cjs [--base http://localhost:3390] [--json out.json]
const BASE = process.argv.includes("--base") ? process.argv[process.argv.indexOf("--base") + 1] : "http://localhost:3390";
const OUT = process.argv.includes("--json") ? process.argv[process.argv.indexOf("--json") + 1] : null;
const NEEDLES = {
  "audio/lecture": /audio\/lecture/g,
  "pen.json": /pen\.json/g,
  "page .jpg (p###.jpg)": /p\d{3}\.jpg/g,
  ".jpg (any)": /\.jpg/g,
};
const count = (text) => Object.fromEntries(Object.entries(NEEDLES).map(([k, re]) => [k, (text.match(re) || []).length]));
const jpgs = (text) => [...new Set(text.match(/[\w\/.-]*\.jpg/g) || [])];
const visible = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<style[\s\S]*?<\/style>/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

(async () => {
  const rows = [];
  const pages = ["lm003", "lm050", "lm057", "lh001", "lh082", "lh100", "lm001", "lm002"];
  for (const id of pages) {
    for (const rsc of [false, true]) {
      const r = await fetch(`${BASE}/lecture/${id}`, { headers: rsc ? { RSC: "1" } : {}, redirect: rsc ? "follow" : "manual" });
      const text = await r.text();
      const vis = rsc ? "" : visible(text);
      rows.push({
        what: `/lecture/${id} ${rsc ? "RSC" : "HTML"}`,
        status: r.status, finalUrl: r.url.replace(BASE, ""), contentType: r.headers.get("content-type"),
        bytes: text.length,
        ...count(text),
        jpgs: jpgs(text).slice(0, 6),
        paywall: rsc ? /ALL-PASS ONLY/.test(text) : /ALL-PASS ONLY/.test(vis),
        lectureView: /data-lecture-view/.test(text) || /LectureLearningView/.test(text),
        visibleChars: rsc ? null : vis.length,
      });
    }
  }
  const media = [
    ["/audio/lecture/lm003/pen.json", 403],
    ["/audio/lecture/lm003/p003.jpg", 403],
    ["/audio/lecture/lm001/pen.json", 200],
    ["/audio/lecture/lm001/p001.jpg", 200],
    ["/audio/lecture/lm002/pen.json", 200],
    ["/audio/lecture/lm002/p002.jpg", 200],
    ["/audio/lecture/lm001/p002.jpg", 403],
    ["/audio/lecture/lm001/p003.jpg", 403],
    ["/audio/lecture/lh100/pen.json", 403],
    ["/audio/lecture/lm057/p059.jpg", 403],
    ["/audio/lecture/lm001/../lm003/pen.json", 403],
    ["/audio/lecture/lm001/PEN.json", 403],
    ["/audio/lecture/lm001/pen.json?x=1", 200],
  ];
  const mediaRows = [];
  for (const [p, want] of media) {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    const buf = Buffer.from(await r.arrayBuffer());
    mediaRows.push({ path: p, want, status: r.status, finalUrl: r.url.replace(BASE, ""), contentType: r.headers.get("content-type"), type: r.headers.get("content-type"), bytes: buf.length, cache: r.headers.get("cache-control"), pass: r.status === want });
  }
  const api = [];
  for (const [p, method] of [["/api/progress/lecture", "GET"], ["/api/progress/lecture", "POST"], ["/api/admin/lecture-progress", "POST"]]) {
    const r = await fetch(`${BASE}${p}`, { method, headers: { "Content-Type": "application/json" }, body: method === "POST" ? "{}" : undefined });
    api.push({ path: `${method} ${p}`, status: r.status });
  }
  const result = { base: BASE, at: new Date().toISOString(), pages: rows, media: mediaRows, api };
  console.table(rows.map(({ jpgs, ...r }) => r));
  console.table(mediaRows);
  console.table(api);
  for (const r of rows.filter((r) => /lm00[12]/.test(r.what) === false)) if (r["audio/lecture"] || r["pen.json"] || r["page .jpg (p###.jpg)"]) console.log("LEAK", r.what);
  if (OUT) require("fs").writeFileSync(OUT, JSON.stringify(result, null, 2));
})();

