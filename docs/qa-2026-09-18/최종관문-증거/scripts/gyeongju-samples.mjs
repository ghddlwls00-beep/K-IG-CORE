// '경주' 소리 비교용 표본 — 같은 두 문장을 방식별로 만들어 scratch/samples 에 둠(운영 · 저장소는 안 건드림).
// .env.local 은 generate-azure-ava.mjs 와 같게 읽고 값은 찍지 않음.
//   node gyeongju-samples.mjs
import fs from "fs";
import path from "path";
const ROOT = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const OUTDIR = path.join(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, "$1"), "samples");
fs.mkdirSync(OUTDIR, { recursive: true });
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}
const REGION = process.env.AZURE_SPEECH_REGION || "koreacentral";
const KEY = process.env.AZURE_SPEECH_KEY;
if (!KEY) throw new Error("AZURE_SPEECH_KEY 없음");
const FORMAT = "audio-24khz-48kbitrate-mono-mp3";
const AVA = "en-US-AvaMultilingualNeural";
const SUNHI = "ko-KR-SunHiNeural";
const speak = (body) => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">${body}</speak>`;
const ava = (inner) => `<voice name="${AVA}">${inner}</voice>`;
const G_IPA = `<phoneme alphabet="ipa" ph="ˈkjʌŋˌdʒu">Gyeongju</phoneme>`;
const S_IPA = `<phoneme alphabet="ipa" ph="ˈʃɪlə">Silla</phoneme>`;
const JOBS = [
  // 문장 1 — 낱말이 끝에
  ["s1-korean-voice", speak(ava(`Another attractive destination is`) + `<voice name="${SUNHI}">경주.</voice>`)],
  ["s1-ipa", speak(ava(`<lang xml:lang="en-US">Another attractive destination is ${G_IPA}.</lang>`))],
  ["s1-spelling", speak(ava(`<lang xml:lang="en-US">Another attractive destination is Kyungju.</lang>`))],
  // 문장 2 — 낱말이 앞에 · 신라
  ["s2-korean-voice", speak(`<voice name="${SUNHI}">경주</voice>` + ava(`is the old capital of the`) + `<voice name="${SUNHI}">신라</voice>` + ava(`Kingdom.`))],
  ["s2-ipa", speak(ava(`<lang xml:lang="en-US">${G_IPA} is the old capital of the ${S_IPA} Kingdom.</lang>`))],
  ["s2-spelling", speak(ava(`<lang xml:lang="en-US">Kyungju is the old capital of the Shilla Kingdom.</lang>`))],
];
for (const [name, ssml] of JOBS) {
  const r = await fetch(`https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": KEY, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": FORMAT, "User-Agent": "K-IG-CORE-sample" },
    body: ssml,
  });
  if (!r.ok) { console.log(`${name}: Azure ${r.status} ${(await r.text()).slice(0, 200)}`); continue; }
  const buf = Buffer.from(await r.arrayBuffer());
  fs.writeFileSync(path.join(OUTDIR, `${name}.mp3`), buf);
  console.log(`${name}: ${buf.length} B`);
}
