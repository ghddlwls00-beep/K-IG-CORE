#!/usr/bin/env node
/**
 * Transcribe the LISTENING recordings, which are the only authentic source for
 * their English.
 *
 *   node docs/qa-2026-09-15/scripts/stt-listening.cjs            # 전부
 *   node docs/qa-2026-09-15/scripts/stt-listening.cjs d010 d011  # 지정한 것만
 *   node docs/qa-2026-09-15/scripts/stt-listening.cjs --limit 20
 *
 * WHY. `ld_english_scripts.json` was produced by translating the Korean script
 * back into English one display line at a time, and the textbook's lines break
 * mid-sentence, so the result is wrong in two ways at once. Sentences lose the
 * words that joined them, and whole clauses come out as something the passage
 * never said. From d010, against the recording:
 *
 *   shipped   "They grew up and spoke Portuguese."
 *   recording "...in some places they spoke French or Portuguese."
 *   shipped   "I took a beautiful picture."
 *   recording "Keith took some beautiful pictures of Lake Victoria and of the
 *              Nile River."
 *
 * The archive cannot fix this: `LD/d010-1.htm` holds the Korean script and the
 * instruction "한글 대본을 보면서 말하고 영작해보세요" — writing the English is
 * the exercise, so the book never contained it. The recording does.
 *
 * READ-ONLY. This writes transcripts to evidence/ and changes no lesson data.
 * Replacing the scripts is a separate, reviewed step: the site's rows follow the
 * textbook's line breaks, and moving sentence boundaries would move what the
 * dictation and shadowing steps ask for.
 *
 * Resumable: a lesson already in the output file is skipped, so a run that dies
 * on a quota limit costs nothing to restart. Needs AZURE_SPEECH_KEY,
 * AZURE_SPEECH_REGION and the R2 credentials from .env.local.
 */
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "../../..");
const OUT = path.join(ROOT, "docs/qa-2026-09-15/evidence/ld-transcripts.json");
const TMP = path.join(process.env.TEMP || "/tmp", "kigstt");

// .env.local is where these live for local work; a run that needs four secrets
// exported by hand does not get run.
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const region = process.env.AZURE_SPEECH_REGION;
const key = process.env.AZURE_SPEECH_KEY;
if (!region || !key) { console.error("AZURE_SPEECH_KEY / AZURE_SPEECH_REGION 이 필요합니다."); process.exit(1); }

const argv = process.argv.slice(2);
const LIMIT = (() => { const i = argv.indexOf("--limit"); return i >= 0 ? Number(argv[i + 1]) : Infinity; })();
const named = argv.filter((a) => /^d\d+$/.test(a));

const { S3Client, GetObjectCommand } = require(path.join(ROOT, "node_modules/@aws-sdk/client-s3"));
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

fs.mkdirSync(TMP, { recursive: true });
const done = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf8")) : {};

const scripts = JSON.parse(fs.readFileSync(path.join(ROOT, "content/ld_english_scripts.json"), "utf8"));
const targets = (named.length ? named : Object.keys(scripts).sort())
  .filter((id) => !done[id])
  .slice(0, LIMIT);

async function audioFor(id) {
  const local = path.join(TMP, `${id}.mp3`);
  if (fs.existsSync(local)) return local;
  const r = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: `audio/ld/${id}.mp3` }));
  const chunks = [];
  for await (const c of r.Body) chunks.push(c);
  fs.writeFileSync(local, Buffer.concat(chunks));
  return local;
}

/**
 * One 429 is not a verdict. The first call of a session came back "Resource
 * Exhausted" and the immediate retry returned a full transcript, so a transient
 * throttle must not end a run that has hours of audio left.
 */
async function transcribe(file, tries = 5) {
  for (let i = 1; i <= tries; i++) {
    const fd = new FormData();
    fd.append("audio", new Blob([fs.readFileSync(file)]), path.basename(file));
    fd.append("definition", JSON.stringify({ locales: ["en-US"], profanityFilterMode: "None" }));
    const r = await fetch(
      `https://${region}.api.cognitive.microsoft.com/speechtotext/transcriptions:transcribe?api-version=2024-11-15`,
      { method: "POST", headers: { "Ocp-Apim-Subscription-Key": key }, body: fd },
    );
    if (r.status === 200) return r.json();
    const body = (await r.text()).slice(0, 200);
    if (r.status !== 429 || i === tries) throw new Error(`HTTP ${r.status}: ${body}`);
    await new Promise((s) => setTimeout(s, 3000 * i));
  }
}

(async () => {
  console.log(`대상 ${targets.length}개 (이미 끝난 것 ${Object.keys(done).length}개는 건너뜀)\n`);
  let seconds = 0, failed = 0;
  for (let i = 0; i < targets.length; i++) {
    const id = targets[i];
    try {
      const file = await audioFor(id);
      const j = await transcribe(file);
      const text = j.combinedPhrases?.[0]?.text || "";
      done[id] = {
        durationSeconds: Math.round((j.durationMilliseconds || 0) / 1000),
        text,
        sentences: text.split(/(?<=[.?!])\s+/).filter(Boolean),
      };
      seconds += done[id].durationSeconds;
      fs.writeFileSync(OUT, JSON.stringify(done, null, 1), "utf8");
      process.stdout.write(`\r  ${i + 1}/${targets.length}  ${id}  ${(seconds / 60).toFixed(0)}분 전사  `);
    } catch (err) {
      failed++;
      console.log(`\n  🔴 ${id}: ${err.message}`);
      if (/HTTP 40[13]/.test(err.message)) { console.log("  자격증명 또는 한도 문제로 보입니다. 중단합니다."); break; }
    }
  }
  console.log(`\n\n완료 ${Object.keys(done).length}개 · 이번 실행 ${(seconds / 60).toFixed(0)}분 · 실패 ${failed}`);
  console.log(`→ ${path.relative(ROOT, OUT)}`);
})();
