#!/usr/bin/env node
/**
 * F-01 — does every audio reference in lesson data (all courses except retired CNN/GVA) name an
 * object that exists in the media bucket, in the lesson's own course folder?
 * Read-only: one ListObjects walk per course folder with .env.local credentials (names only).
 *   node --env-file=.env.local verify-f01.cjs     exit 0 = every reference resolves
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const { S3Client, ListObjectsV2Command } = require(path.join(REPO, "node_modules/@aws-sdk/client-s3"));
const env = (k) => (process.env[k] || "").trim();
if (!env("R2_ACCOUNT_ID") || !env("R2_BUCKET_NAME")) { console.error("needs .env.local (node --env-file=.env.local …)"); process.exit(2); }
const s3 = new S3Client({ region: "auto", endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") } });

// Only lessons the site actually routes (src/lib/generated/validRoutes.json), CNN excluded as a
// retired course; content/lessons also holds old courses (adults, middle …) that no page serves.
const lessonsDir = path.join(REPO, "content/lessons");
const routes = JSON.parse(fs.readFileSync(path.join(REPO, "src/lib/generated/validRoutes.json"), "utf8"));
const refs = [];
for (const course of routes.courses.filter((c) => c !== "cnn")) {
  for (const id of routes.lessons[course]) { // script pages (-1) are listed as ids of their own
    const file = path.join(lessonsDir, course, `${id}.json`);
    if (!fs.existsSync(file)) continue;
    const d = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const a of d.audio || []) refs.push({ lesson: `${course}/${id}`, course, src: a.src });
  }
}
(async () => {
  const folders = [...new Set(refs.map((r) => r.src.split("/")[2]))];
  const keys = new Set();
  for (const folder of folders) {
    let token;
    do {
      const page = await s3.send(new ListObjectsV2Command({ Bucket: env("R2_BUCKET_NAME"), Prefix: `audio/${folder}/`, ContinuationToken: token }));
      for (const o of page.Contents || []) keys.add(o.Key);
      token = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (token);
  }
  const missing = refs.filter((r) => !keys.has(r.src.replace(/^\//, "")));
  const foreign = refs.filter((r) => r.src.split("/")[2] !== r.course);
  console.log(`${refs.length} audio references in ${new Set(refs.map((r) => r.lesson)).size} lessons (CNN/GVA excluded), folders ${folders.join(", ")}`);
  console.log(`${missing.length === 0 ? "PASS" : "FAIL"}  every reference exists in storage${missing.length ? " — " + missing.map((r) => `${r.lesson} ${r.src}`).join(" | ") : ""}`);
  console.log(`${foreign.length === 0 ? "PASS" : "FAIL"}  every reference is in its own course folder${foreign.length ? " — " + foreign.map((r) => `${r.lesson} ${r.src}`).join(" | ") : ""}`);
  process.exit(missing.length || foreign.length ? 1 : 0);
})().catch((e) => { console.error(e.name || e); process.exit(1); });
