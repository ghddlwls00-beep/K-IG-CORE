#!/usr/bin/env node
/**
 * 발음 채점기(src/lib/speechRecognition.ts evaluatePronunciation) — "틀림없이 읽으면 100점인가".
 *
 * ① 6-1274(pr235): normalizeText 가 . , ? ! ; : " ' ( ) 만 지워 줄표로 붙은 'subject―is' 가 한 낱말로 남고,
 *    곡선 따옴표 · 아포스트로피(“junk” · don’t)도 그대로 남아 인식기가 돌려주는 junk · don't 와 안 맞았다.
 *    앱이 채점하는 READING 첫 줄(발음 시험 문장) 256개에 "완벽한 읽기" — 소문자, 곡선 따옴표 · 아포스트로피는 곧은 것,
 *    줄표 · 말줄임은 빈칸, 따옴표 · 괄호는 뺀 글 — 를 넣어 100 이 아닌 문장을 센다.
 * ② 6N-001(3차 점검 #10): 줄임말 규칙 18줄이 아포스트로피를 먼저 지운 뒤에 돌아 하나도 안 먹었다('I am happy to see you'
 *    를 'I'm happy to see you' 에 읽으면 31점). 강의 파일 영어 글 전부(폐지 cnn 은 뺌)에서, 줄임말 한 쌍의 **한 꼴만** 쓰는 글을
 *    다른 꼴로 읽은 것(I'm → I am · do not → don't …)이 100 이 아닌 글을 센다. 두 꼴을 다 쓰는 글은 어느 쪽인지 알 수 없어 뺀다.
 *
 *   node check-speech-scorer.cjs [--old] [--list] [--break]
 *   --old   : 고치기 전 판(f35e8be — 6단계 커밋 86d9ac9 앞)의 speechRecognition.ts 로 (고치기 전과 견줌 — ① 13 · ② 1,680 넘게, exit 1)
 *             (전에는 git HEAD — 고친 채점기가 커밋된 뒤로는 HEAD 가 고친 판이라 0 · 0 이었다, 7-1 n)
 *   --break : 완벽한 읽기에서 끝 낱말 셋을 빼고 넣음 — 100 이 아닌 문장이 나오면(나와야 정상) exit 1
 * 셋 다 아닐 때: ① 이나 ② 에 하나라도 있으면 exit 1.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const REPO = path.resolve(__dirname, "../../..");
const ts = require(path.join(REPO, "node_modules", "typescript"));
const OLD = process.argv.includes("--old");
const LIST = process.argv.includes("--list");
const BREAK = process.argv.includes("--break");
const src = OLD
  ? execSync("git show f35e8be:src/lib/speechRecognition.ts", { cwd: REPO, encoding: "utf8", maxBuffer: 1 << 26 })
  : fs.readFileSync(path.join(REPO, "src/lib/speechRecognition.ts"), "utf8");
const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} };
new Function("module", "exports", "require", js)(mod, mod.exports, require);
const { evaluatePronunciation } = mod.exports;

// 인식기가 돌려줄 법한 완벽한 읽기
const perfect = (t) => t
  .replace(/[‘’]/g, "'").replace(/[“”]/g, "\"")
  .replace(/[‒-―…]/g, " ").replace(/(^|\s)-{1,2}(?=\s|$)/g, " ")
  .replace(/["()[\]]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

// ① READING 첫 줄
const dir = path.join(REPO, "content/lessons/reading");
const reading = new Map();
for (const f of fs.readdirSync(dir).filter((x) => /^pr\d+(-1)?\.json$/.test(x)).sort()) {
  const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  const s0 = (d.readingSentences || [])[0];
  if (s0) reading.set(s0.english, (reading.get(s0.english) || []).concat(f.replace(".json", "")));
}
const bad = [];
for (const [t, where] of reading) {
  let spoken = perfect(t);
  if (BREAK) spoken = spoken.split(" ").slice(0, -3).join(" ");
  const r = evaluatePronunciation(spoken, t);
  if (r.score !== 100) bad.push({ t, where, score: r.score, miss: r.wordAnalysis.filter((w) => !w.matched).map((w) => w.word).slice(0, 6) });
}
console.log(`${OLD ? "[고치기 전 f35e8be 채점기] " : ""}${BREAK ? "[--break 끝 셋 뺌] " : ""}① READING 첫 줄(S[0]) 서로 다른 문장 ${reading.size} · 완벽한 읽기가 100 이 아닌 문장 ${bad.length}`);
if (LIST) for (const b of bad) console.log(`  ${b.score}점 ${b.where[0]} | 안 맞은 ${b.miss.join(" · ")} | ${b.t.slice(0, 90)}`);

// ② 줄임말 — 한 꼴만 쓰는 글을 다른 꼴로 읽기
const PAIRS = [["i'm", "i am"], ["you're", "you are"], ["he's", "he is"], ["she's", "she is"], ["it's", "it is"], ["we're", "we are"], ["they're", "they are"],
  ["don't", "do not"], ["doesn't", "does not"], ["didn't", "did not"], ["can't", "cannot"], ["couldn't", "could not"], ["won't", "will not"], ["wouldn't", "would not"],
  ["shouldn't", "should not"], ["hasn't", "has not"], ["haven't", "have not"], ["hadn't", "had not"], ["isn't", "is not"], ["aren't", "are not"], ["wasn't", "was not"], ["weren't", "were not"]];
const strings = new Set();
const walk = (v) => { if (typeof v === "string") { if ((v.match(/[A-Za-z]{2,}/g) || []).length >= 3 && !/[가-힣]/.test(v)) strings.add(v); } else if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") Object.values(v).forEach(walk); };
const root = path.join(REPO, "content/lessons");
for (const c of fs.readdirSync(root)) {
  if (c === "cnn") continue;
  const d = path.join(root, c);
  if (!fs.statSync(d).isDirectory()) continue;
  for (const f of fs.readdirSync(d).filter((x) => x.endsWith(".json"))) walk(JSON.parse(fs.readFileSync(path.join(d, f), "utf8")));
}
let tried = 0;
const cbad = [];
if (!BREAK) for (const t of strings) {
  const sp = perfect(t).replace(/[.,?!;:]/g, "");
  for (const [s, f] of PAIRS) {
    const rs = new RegExp(`(^| )${s}(?= |$)`, "g"), rf = new RegExp(`(^| )${f}(?= |$)`, "g");
    const hasS = rs.test(sp), hasF = rf.test(sp);
    if (hasS === hasF) continue; // 없거나 두 꼴 다
    tried++;
    const alt = hasS ? sp.replace(rs, `$1${f}`) : sp.replace(rf, `$1${s}`);
    const r = evaluatePronunciation(alt, t);
    if (r.score !== 100) cbad.push(`${r.score}점 | ${alt.slice(0, 80)}`);
    break;
  }
}
if (!BREAK) console.log(`${OLD ? "[고치기 전 f35e8be 채점기] " : ""}② 줄임말 한 꼴만 쓰는 글 ${tried} · 다른 꼴로 읽어 100 이 아닌 글 ${cbad.length}`);
if (LIST) for (const b of cbad.slice(0, 20)) console.log(`  ${b}`);
if (BREAK) process.exit(bad.length ? 1 : 0);
process.exit(bad.length || cbad.length ? 1 : 0);
