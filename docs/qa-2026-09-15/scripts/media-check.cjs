// [QA handoff] Written for the 2026-09-15 audit. Paths at the top of this file point at the
// original audit machine. Before running, replace:
//   REPO  -> absolute path of this repository
//   the "C:/Users/ghddl/AppData/Local/Temp/kq" output directory -> any scratch directory you own
// Run with: node <this file>   (Node 20+; no dependencies beyond the repo's own node_modules)
// Media existence audit: every original lesson MP3 and every pre-generated Ava clip
// the in-scope UI can request. HEAD requests only, low concurrency, abort on throttling.
const fs = require("fs");
const path = require("path");
const { loadTs, REPO } = require("./tsload.cjs");
const OUT = path.join(__dirname, "out");
const R2 = "https://pub-94ce8b8436d54ffc971d30f2096951cc.r2.dev";
const SITE = "https://k-ig-core.vercel.app";
const unified = loadTs(`${REPO}/src/lib/unifiedSpeech.ts`);
const listening = loadTs(`${REPO}/src/lib/listeningUtils.ts`);

const speech = JSON.parse(fs.readFileSync(path.join(OUT, "speech-inventory.json"), "utf8"));
const byKey = new Map(speech.map((s) => [s.key, s]));
const addText = (text, section, lesson, via) => {
  const clean = unified.normalizeUnifiedSpeechText(String(text || ""));
  if (!clean || !/[A-Za-zㄱ-ㆎ㐀-鿿가-힣]/u.test(clean)) return;
  const key = unified.unifiedSpeechKey(clean);
  if (!byKey.has(key)) byKey.set(key, { key, text: clean, section, lesson, via });
};
const pageClean = (t) => t.replace(/^\s*\d+[\.\)]\s*/, "").replace(/\s*\/\s*/g, " ").trim();
const ld = JSON.parse(fs.readFileSync(`${REPO}/content/ld_english_scripts.json`, "utf8"));
for (const [id, sents] of Object.entries(ld)) {
  for (const s of sents) {
    addText(pageClean(s.en), "LISTENING", id, "top-player");
    for (const card of listening.generateLiaisonPoints(s.en)) addText(card.original, "LISTENING", id, "liaison-card");
  }
}
for (let i = 1; i <= 256; i++) {
  const id = `pr${String(i).padStart(3, "0")}`;
  const l = JSON.parse(fs.readFileSync(`${REPO}/content/lessons/reading/${id}.json`, "utf8"));
  for (const s of l.readingSentences || []) addText(pageClean(s.english), "READING", id, "top-player");
}
const items = [...byKey.values()];
const audio = JSON.parse(fs.readFileSync(path.join(OUT, "original-audio.json"), "utf8"));

async function head(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url, { method: "HEAD" });
      if (r.status === 429 || r.status >= 500) {
        await new Promise((res) => setTimeout(res, 1500 * attempt));
        if (attempt === 4) return { status: r.status };
        continue;
      }
      return { status: r.status, type: r.headers.get("content-type"), len: Number(r.headers.get("content-length") || 0) };
    } catch (e) {
      if (attempt === 4) return { status: 0, error: String(e.cause?.code || e.message) };
      await new Promise((res) => setTimeout(res, 1000 * attempt));
    }
  }
}
let throttled = 0;
async function pool(list, n, fn) {
  let i = 0;
  const out = new Array(list.length);
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < list.length) {
      if (throttled > 25) return;
      const k = i++;
      out[k] = await fn(list[k], k);
    }
  }));
  return out;
}

(async () => {
  const started = Date.now();
  let done = 0;
  const audioRes = await pool(audio, 4, async ([src, lessons]) => {
    const r = await head(R2 + src);
    if (r.status === 429) throttled++;
    if (++done % 250 === 0) console.log(`orig ${done}/${audio.length}`);
    return { src, lessons, ...r };
  });
  done = 0;
  const avaRes = await pool(items, 4, async (it) => {
    const r = await head(`${R2}/audio/azure-ava/v1/${it.key}.mp3`);
    if (r.status === 429) throttled++;
    if (++done % 1000 === 0) console.log(`ava ${done}/${items.length} (${Math.round((Date.now() - started) / 1000)}s)`);
    return { ...it, ...r };
  });
  // proxy + range sample through the production origin, as the browser requests it
  const sample = items.filter((_, i) => i % Math.ceil(items.length / 40) === 0);
  const proxy = [];
  for (const it of sample) {
    const r = await fetch(`${SITE}/audio/azure-ava/v1/${it.key}.mp3`, { headers: { Range: "bytes=0-1" } }).catch((e) => ({ status: 0, headers: new Map() }));
    proxy.push({ key: it.key, status: r.status, type: r.headers.get?.("content-type"), acceptRanges: r.headers.get?.("accept-ranges"), contentRange: r.headers.get?.("content-range") });
  }
  const origRange = [];
  for (const [src] of audio.slice(0, 5)) {
    const r = await fetch(R2 + src, { headers: { Range: "bytes=0-1" } });
    origRange.push({ src, status: r.status, contentRange: r.headers.get("content-range"), type: r.headers.get("content-type") });
  }
  const summ = (arr) => arr.filter(Boolean).reduce((m, x) => ((m[x.status] = (m[x.status] || 0) + 1), m), {});
  const res = { throttled, audioChecked: audioRes.filter(Boolean).length, audioTotal: audio.length, audioStatus: summ(audioRes), avaChecked: avaRes.filter(Boolean).length, avaTotal: items.length, avaStatus: summ(avaRes), proxy, origRange, audioMissing: audioRes.filter((x) => x && x.status !== 200), avaMissing: avaRes.filter((x) => x && x.status !== 200), tinyAudio: audioRes.filter((x) => x && x.status === 200 && x.len < 2000), nonMpeg: audioRes.filter((x) => x && x.status === 200 && !/audio|octet/.test(x.type || "")) };
  fs.writeFileSync(path.join(OUT, "media-check.json"), JSON.stringify(res, null, 1));
  const missBySection = {};
  for (const m of res.avaMissing) { const k = `${m.section}:${m.via || "content"}`; missBySection[k] = (missBySection[k] || 0) + 1; }
  console.log(JSON.stringify({ throttled, audioStatus: res.audioStatus, avaStatus: res.avaStatus, avaMissingBySection: missBySection, proxyStatus: summ(proxy), origRange, tinyAudio: res.tinyAudio.length, nonMpeg: res.nonMpeg.length, seconds: Math.round((Date.now() - started) / 1000) }, null, 1));
})();
