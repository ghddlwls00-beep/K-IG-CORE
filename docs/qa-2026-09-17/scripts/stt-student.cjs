#!/usr/bin/env node
/**
 * Transcribe STUDENT original recordings (read-only), to compare a lesson's English with what
 * its recordings actually say. Same Azure fast-transcription call as
 * docs/qa-2026-09-15/scripts/stt-listening.cjs. Writes docs/qa-2026-09-17/out/stt-student.json.
 *   node --env-file=.env.local stt-student.cjs s19-3 s19-2
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const OUT = path.join(__dirname, "../out/stt-student.json");
const env = (k) => (process.env[k] || "").trim();
const { S3Client, GetObjectCommand } = require(path.join(REPO, "node_modules/@aws-sdk/client-s3"));
const s3 = new S3Client({ region: "auto", endpoint: `https://${env("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`, credentials: { accessKeyId: env("R2_ACCESS_KEY_ID"), secretAccessKey: env("R2_SECRET_ACCESS_KEY") } });
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

async function transcribe(buf, name, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    const fd = new FormData();
    fd.append("audio", new Blob([buf]), name);
    fd.append("definition", JSON.stringify({ locales: ["en-US"], profanityFilterMode: "None" }));
    const r = await fetch(`https://${env("AZURE_SPEECH_REGION")}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`, { method: "POST", headers: { "Ocp-Apim-Subscription-Key": env("AZURE_SPEECH_KEY") }, body: fd });
    if (r.status === 200) return r.json();
    if (r.status !== 429 || i === tries) throw new Error(`HTTP ${r.status}`);
    await new Promise((s) => setTimeout(s, 3000 * i));
  }
}

(async () => {
  for (const id of process.argv.slice(2)) {
    const lesson = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/student", `${id}.json`), "utf8"));
    const tracks = [];
    for (const a of lesson.audio || []) {
      const r = await s3.send(new GetObjectCommand({ Bucket: env("R2_BUCKET_NAME"), Key: a.src.replace(/^\//, "") }));
      const chunks = [];
      for await (const c of r.Body) chunks.push(c);
      const j = await transcribe(Buffer.concat(chunks), path.basename(a.src));
      tracks.push({ src: a.src, seconds: Math.round((j.durationMilliseconds || 0) / 1000), text: j.combinedPhrases?.[0]?.text || "" });
    }
    done[id] = { tracks, lessonEnglish: (lesson.blocks.find((b) => b.type === "sentences") || { items: [] }).items.map((s) => s.text) };
    fs.writeFileSync(OUT, JSON.stringify(done, null, 1));
    console.log(`== ${id}`);
    for (const t of tracks) console.log(`  ${path.basename(t.src)} ${t.seconds}s: ${t.text}`);
    console.log("  lesson English:");
    for (const s of done[id].lessonEnglish) console.log(`   - ${s}`);
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
