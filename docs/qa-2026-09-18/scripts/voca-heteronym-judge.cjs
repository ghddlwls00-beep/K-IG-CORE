#!/usr/bin/env node
/**
 * 7단계 7-6 — VOCA 발음이 둘인 낱말: 지금 클립이 화면의 뜻과 같은 소리인가(기계로 가림).
 *
 * 낱말마다 같은 목소리(en-US-AvaMultilingualNeural · audio-24khz-48kbitrate-mono-mp3 — 생성기와 같음)로 두 발음을 SSML phoneme(IPA)으로
 * 새로 만들어(저장소 밖 임시 폴더 — R2 에 올리지 않음), 지금 클립(public/audio/azure-ava/v1/<키>.mp3)과 소리를 견준다:
 * ffmpeg 로 16kHz 모노로 풀고 → 앞뒤 무음을 자르고 → MFCC 13(발화마다 평균 뺌) → DTW 거리(경로 길이로 나눔).
 * 가까운 쪽이 판정, 차이 = (먼 거리 − 가까운 거리) / 먼 거리. 차이가 SAME_BELOW 보다 작으면 '가리지 못함(같음)'.
 *
 * 믿을 수 있는지 보는 것(명령서):
 *   - 대조군 sow: 소유자가 2026-09-23 휴대폰으로 mv2-36 에서 "사우"(암퇘지 /saʊ/)로 들었다 — 도구도 /saʊ/ 쪽이어야 한다.
 *   - 새로 만든 두 소리를 '지금 클립' 자리에 각각 넣으면 자기 쪽으로 판정돼야 하고(바꿔 넣으면 판정이 뒤집힘),
 *   - 발음이 하나뿐인 낱말(대조군 CONTROLS — 두 후보 = 같은 IPA 의 phoneme 판 · 글자만 준 판)은 '같음' 이어야 한다.
 *
 *   node voca-heteronym-judge.cjs            판정표(새 소리는 한 번 만든 것을 다시 씀 — 없을 때만 Azure 호출)
 *   node voca-heteronym-judge.cjs --no-azure 새 소리를 만들지 않음(없으면 그 낱말은 건너뜀)
 *   node voca-heteronym-judge.cjs --new      7-6 소유자 결정(나) 뒤: '지금 클립' 대신 **새 클립**(vocaWordSpeech 의 `<낱말> ⟨<IPA>⟩` 키 —
 *                                            생성기가 phoneme 으로 만든 것)을 A · B 와 견줌. 새 클립도 phoneme 으로 만들었으므로 대조군(phoneme vs 글자만)
 *                                            과 소유자 귀(옛 sow 클립)는 해당 없음 — 자기판정 · 바꿔넣기 어긋남 0 이고 모두 A 여야 exit 0.
 * Azure 자격(AZURE_SPEECH_KEY)은 .env.local 에서 읽고 어디에도 찍지 않는다. 결과 파일: <임시 폴더>/judge.json
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const { loadEnvLocal } = require("./lib/r2-keys.cjs");
const u = loadTs(path.join(REPO, "src/lib/unifiedSpeech.ts"));
const { vocaSpeechForm, vocaWordSpeech } = loadTs(path.join(REPO, "src/lib/vocaSpeech.ts"));
const NEW_CLIPS = process.argv.includes("--new");

const TMP = path.join(os.tmpdir(), "kig-7-6-heteronyms");
const NO_AZURE = process.argv.includes("--no-azure");
const SAME_BELOW = 0.1;
const VOICE = "en-US-AvaMultilingualNeural";
const OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

// 뜻(화면 — voca_dictionary)에 맞는 발음 A 와 다른 발음 B (IPA, 미국식)
const WORDS = [
  ["sow", "soʊ", "saʊ"], ["row", "roʊ", "raʊ"], ["lead", "liːd", "lɛd"], ["wind", "wɪnd", "waɪnd"],
  ["live", "lɪv", "laɪv"], ["wound", "wuːnd", "waʊnd"], ["minute", "ˈmɪnɪt", "maɪˈnuːt"], ["resume", "rɪˈzuːm", "ˈrɛzəmeɪ"],
  ["produce", "prəˈduːs", "ˈproʊduːs"], ["increase", "ɪnˈkriːs", "ˈɪnkriːs"], ["decrease", "dɪˈkriːs", "ˈdiːkriːs"],
  ["digest", "daɪˈdʒɛst", "ˈdaɪdʒɛst"], ["transfer", "trænsˈfɝː", "ˈtrænsfɝ"], ["converse", "kənˈvɝːs", "ˈkɑːnvɝs"],
  ["convert", "kənˈvɝːt", "ˈkɑːnvɝt"], ["extract", "ɪkˈstrækt", "ˈɛkstrækt"], ["insert", "ɪnˈsɝːt", "ˈɪnsɝt"],
  ["reject", "rɪˈdʒɛkt", "ˈriːdʒɛkt"], ["refuse", "rɪˈfjuːz", "ˈrɛfjuːs"], ["graduate", "ˈɡrædʒueɪt", "ˈɡrædʒuət"],
];
// 발음이 하나뿐인 낱말 — A = 그 IPA 의 phoneme 판, B = 글자만 준 판(둘 다 같은 소리여야)
const CONTROLS = [["table", "ˈteɪbəl"], ["window", "ˈwɪndoʊ"], ["garden", "ˈɡɑːrdən"], ["happy", "ˈhæpi"]];

function escapeXml(t) { return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
const ssml = (word, ipa) => `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="${VOICE}"><lang xml:lang="en-US">${ipa ? `<phoneme alphabet="ipa" ph="${escapeXml(ipa)}">${escapeXml(word)}</phoneme>` : escapeXml(word)}</lang></voice></speak>`;

let azureCalls = 0, azureChars = 0;
async function synth(word, ipa, file) {
  if (fs.existsSync(file) && fs.statSync(file).size > 1000) return true;
  if (NO_AZURE) return false;
  loadEnvLocal();
  const key = (process.env.AZURE_SPEECH_KEY || "").trim();
  const region = (process.env.AZURE_SPEECH_REGION || "koreacentral").trim();
  if (!key) throw new Error("AZURE_SPEECH_KEY 가 없음(.env.local) — --no-azure 로 이미 만든 것만 쓰거나 자격을 넣을 것");
  const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: { "Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml", "X-Microsoft-OutputFormat": OUTPUT_FORMAT, "User-Agent": "K-IG-CORE-7-6-judge" },
    body: ssml(word, ipa),
  });
  if (!res.ok) throw new Error(`Azure ${res.status} (${word} ${ipa || "글자만"})`);
  fs.writeFileSync(file, Buffer.from(await res.arrayBuffer()));
  azureCalls++; azureChars += word.length;
  return true;
}

// ── 소리 → 특징
function pcm(file) {
  const buf = execFileSync("ffmpeg", ["-v", "quiet", "-i", file, "-ac", "1", "-ar", "16000", "-f", "s16le", "-"], { maxBuffer: 1 << 28 });
  const out = new Float32Array(buf.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = buf.readInt16LE(i * 2) / 32768;
  return out;
}
function trim(x) {
  const win = 320; let peak = 0;
  const e = []; for (let i = 0; i + win <= x.length; i += win) { let s = 0; for (let j = 0; j < win; j++) s += x[i + j] * x[i + j]; e.push(s / win); peak = Math.max(peak, s / win); }
  const th = peak * 0.001; let a = 0, b = e.length - 1;
  while (a < e.length && e[a] < th) a++; while (b > a && e[b] < th) b--;
  return x.slice(a * win, (b + 1) * win);
}
function fft(re, im) { // 제자리 radix-2
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) {
      const ar = re[i + k], ai = im[i + k], br = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, bi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
      re[i + k] = ar + br; im[i + k] = ai + bi; re[i + k + len / 2] = ar - br; im[i + k + len / 2] = ai - bi;
      const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr; } }
  }
}
const SR = 16000, NFFT = 512, WIN = 400, HOP = 160, NMEL = 26, NCEP = 13;
const mel = (f) => 2595 * Math.log10(1 + f / 700), imel = (m) => 700 * (10 ** (m / 2595) - 1);
const FILTERS = (() => {
  const pts = []; for (let i = 0; i < NMEL + 2; i++) pts.push(Math.floor(((NFFT + 1) * imel(mel(0) + ((mel(SR / 2) - mel(0)) * i) / (NMEL + 1))) / SR));
  return Array.from({ length: NMEL }, (_, m) => { const f = new Float32Array(NFFT / 2 + 1); for (let k = pts[m]; k < pts[m + 1]; k++) f[k] = (k - pts[m]) / Math.max(1, pts[m + 1] - pts[m]); for (let k = pts[m + 1]; k < pts[m + 2]; k++) f[k] = (pts[m + 2] - k) / Math.max(1, pts[m + 2] - pts[m + 1]); return f; });
})();
function mfcc(x) {
  const frames = [];
  for (let s = 0; s + WIN <= x.length; s += HOP) {
    const re = new Float64Array(NFFT), im = new Float64Array(NFFT);
    for (let i = 0; i < WIN; i++) re[i] = (x[s + i] - 0.97 * (s + i > 0 ? x[s + i - 1] : 0)) * (0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN - 1)));
    fft(re, im);
    const pow = new Float64Array(NFFT / 2 + 1); for (let k = 0; k <= NFFT / 2; k++) pow[k] = (re[k] * re[k] + im[k] * im[k]) / NFFT;
    const logm = FILTERS.map((f) => { let s2 = 0; for (let k = 0; k < f.length; k++) s2 += f[k] * pow[k]; return Math.log(s2 + 1e-10); });
    const c = []; for (let n = 1; n <= NCEP; n++) { let s2 = 0; for (let m = 0; m < NMEL; m++) s2 += logm[m] * Math.cos((Math.PI * n * (m + 0.5)) / NMEL); c.push(s2); }
    frames.push(c);
  }
  const mean = Array(NCEP).fill(0); for (const f of frames) for (let i = 0; i < NCEP; i++) mean[i] += f[i] / frames.length;
  return frames.map((f) => f.map((v, i) => v - mean[i]));
}
function dtw(a, b) {
  const n = a.length, m = b.length, INF = 1e18;
  let prev = new Float64Array(m + 1).fill(INF), cur = new Float64Array(m + 1);
  const len = [new Float64Array(m + 1).fill(0), new Float64Array(m + 1)];
  prev[0] = 0;
  for (let i = 1; i <= n; i++) {
    cur.fill(INF); const L = len[i % 2], Lp = len[(i - 1) % 2];
    for (let j = 1; j <= m; j++) {
      let d = 0; for (let k = 0; k < NCEP; k++) { const t = a[i - 1][k] - b[j - 1][k]; d += t * t; } d = Math.sqrt(d);
      let best = prev[j - 1], bl = Lp[j - 1]; if (prev[j] < best) { best = prev[j]; bl = Lp[j]; } if (cur[j - 1] < best) { best = cur[j - 1]; bl = L[j - 1]; }
      cur[j] = best + d; L[j] = bl + 1;
    }
    [prev, cur] = [cur, prev];
  }
  return prev[m] / len[n % 2][m];
}
const feat = (file) => mfcc(trim(pcm(file)));
function judge(currentF, aF, bF) {
  const da = dtw(currentF, aF), db = dtw(currentF, bF);
  const near = da <= db ? "A" : "B", margin = Math.abs(da - db) / Math.max(da, db);
  return { da, db, near: margin < SAME_BELOW ? "같음" : near, margin };
}

(async () => {
  fs.mkdirSync(TMP, { recursive: true });
  const rows = [];
  let selfWrong = 0;
  for (const [word, a, b] of WORDS) {
    const key = u.unifiedSpeechKey(u.normalizeUnifiedSpeechText(NEW_CLIPS ? vocaWordSpeech(word) : vocaSpeechForm(word)));
    const cur = path.join(REPO, "public/audio/azure-ava/v1", `${key}.mp3`);
    const fa = path.join(TMP, `${word}.A.mp3`), fb = path.join(TMP, `${word}.B.mp3`);
    if (!fs.existsSync(cur) || !(await synth(word, a, fa)) || !(await synth(word, b, fb))) { rows.push({ word, skipped: true }); continue; }
    const F = { cur: feat(cur), a: feat(fa), b: feat(fb) };
    const j = judge(F.cur, F.a, F.b);
    const selfA = judge(F.a, F.a, F.b), selfB = judge(F.b, F.a, F.b); // 새 소리를 '지금 클립' 자리에 — 자기 쪽이어야
    const swapped = judge(F.cur, F.b, F.a); // 두 후보를 바꿔 넣음 — 판정이 뒤집혀야(같음이면 같음)
    const swapOk = j.near === "같음" ? swapped.near === "같음" : swapped.near === (j.near === "A" ? "B" : "A");
    if (selfA.near !== "A" || selfB.near !== "B" || !swapOk) selfWrong++;
    rows.push({ word, key, a, b, verdict: j.near, margin: +j.margin.toFixed(3), dA: +j.da.toFixed(2), dB: +j.db.toFixed(2), self: `${selfA.near}/${selfB.near}`, swap: swapped.near });
  }
  if (NEW_CLIPS) {
    console.log(`새 클립(${TMP} 의 A · B 와 견줌) · '같음' 문턱 차이 < ${SAME_BELOW} · Azure 호출 ${azureCalls}`);
    console.log("낱말      판정  차이   거리A  거리B  자기판정 바꿔넣기  키");
    for (const r of rows) console.log(r.skipped ? `${r.word.padEnd(9)} 건너뜀(파일 없음)` : `${r.word.padEnd(9)} ${r.verdict.padEnd(4)} ${String(r.margin).padEnd(6)} ${String(r.dA).padEnd(6)} ${String(r.dB).padEnd(6)} ${r.self.padEnd(8)} ${r.swap.padEnd(4)}     ${r.key}`);
    const notA = rows.filter((r) => !r.skipped && r.verdict !== "A"), skipped = rows.filter((r) => r.skipped);
    console.log(`\n새 클립 ${rows.length} · A(화면 뜻) ${rows.filter((r) => r.verdict === "A").length} · B ${rows.filter((r) => r.verdict === "B").map((r) => r.word).join(" ") || "0"} · 같음(못 가림) ${rows.filter((r) => r.verdict === "같음").map((r) => r.word).join(" ") || "0"} · 건너뜀 ${skipped.length} · 자기판정 · 바꿔넣기 어긋남 ${selfWrong}`);
    fs.writeFileSync(path.join(TMP, "judge-new.json"), JSON.stringify({ at: new Date().toISOString(), SAME_BELOW, rows, selfWrong }, null, 1));
    process.exit(!selfWrong && !notA.length && !skipped.length ? 0 : 1);
  }
  const controls = [];
  for (const [word, ipa] of CONTROLS) {
    const key = u.unifiedSpeechKey(u.normalizeUnifiedSpeechText(vocaSpeechForm(word)));
    const cur = path.join(REPO, "public/audio/azure-ava/v1", `${key}.mp3`);
    const fa = path.join(TMP, `ctl-${word}.A.mp3`), fb = path.join(TMP, `ctl-${word}.B.mp3`);
    if (!fs.existsSync(cur) || !(await synth(word, ipa, fa)) || !(await synth(word, null, fb))) { controls.push({ word, skipped: true }); continue; }
    const j = judge(feat(cur), feat(fa), feat(fb));
    controls.push({ word, key, verdict: j.near, margin: +j.margin.toFixed(3), dA: +j.da.toFixed(2), dB: +j.db.toFixed(2) });
  }
  console.log(`임시 폴더 ${TMP} · Azure 호출 ${azureCalls}(${azureChars}글자, 이번 실행) · '같음' 문턱 차이 < ${SAME_BELOW}`);
  console.log("낱말      판정  차이   거리A  거리B  자기판정 바꿔넣기  (A = 화면 뜻의 발음 · B = 다른 발음)");
  for (const r of rows) console.log(r.skipped ? `${r.word.padEnd(9)} 건너뜀(파일 없음)` : `${r.word.padEnd(9)} ${r.verdict.padEnd(4)} ${String(r.margin).padEnd(6)} ${String(r.dA).padEnd(6)} ${String(r.dB).padEnd(6)} ${r.self.padEnd(8)} ${r.swap}   A /${r.a}/ · B /${r.b}/`);
  console.log("대조군(발음 하나 — '같음' 이어야):");
  for (const c of controls) console.log(c.skipped ? `  ${c.word} 건너뜀` : `  ${c.word.padEnd(8)} ${c.verdict} 차이 ${c.margin} (A phoneme ${c.dA} · B 글자만 ${c.dB})`);
  const sow = rows.find((r) => r.word === "sow");
  const sowOk = sow && sow.verdict === "B";
  const ctlOk = controls.every((c) => c.skipped || c.verdict === "같음");
  console.log(`\n믿을 수 있나: 소유자 귀 대조(sow → /saʊ/ 쪽) ${sowOk ? "맞음" : "!! 다름"} · 자기판정 · 바꿔넣기 어긋남 ${selfWrong} · 대조군 같음 ${controls.filter((c) => c.verdict === "같음").length}/${controls.filter((c) => !c.skipped).length}`);
  console.log(`뜻과 다른 소리(B): ${rows.filter((r) => r.verdict === "B").map((r) => r.word).join(" ") || "없음"} · 가리지 못함(같음): ${rows.filter((r) => r.verdict === "같음").map((r) => r.word).join(" ") || "없음"}`);
  fs.writeFileSync(path.join(TMP, "judge.json"), JSON.stringify({ at: new Date().toISOString(), SAME_BELOW, rows, controls, sowOk, selfWrong }, null, 1));
  process.exit(sowOk && ctlOk && !selfWrong ? 0 : 1);
})().catch((e) => { console.error(String(e.message || e)); process.exit(2); });
