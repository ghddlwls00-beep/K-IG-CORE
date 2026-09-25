// 발음 기호 꼴('라')로 새로 만든 56문장을 휴대폰에서 모두 들어 보는 페이지 — 문장마다 한국어 낱말 · 새 소리(data:). 아직 사이트에 없음.
const fs = require("fs");
const path = require("path");
const S = __dirname;
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";
const A = path.join(REPO, "public/audio/azure-ava/v1");
const ts = require(path.join(REPO, "node_modules/typescript"));
const js = ts.transpileModule(fs.readFileSync(path.join(REPO, "src/lib/lessonSpeechForm.ts"), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const mod = { exports: {} }; new Function("module", "exports", "require", js)(mod, mod.exports, require);
const SOUNDS = mod.exports.KOREAN_WORD_SOUNDS;
const list = JSON.parse(fs.readFileSync(path.join(S, "ipa-clips.json"), "utf8")).filter((x) => /\s/.test(x.text.replace(/\s*⟨[^⟩]*⟩\s*$/, "")));
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const COURSE = { student: "STUDENT", grammar2: "GRAMMAR II", reading: "READING" };
const groups = new Map();
list.forEach((x) => { const [c, id] = x.page.split("/"); const g = `${COURSE[c] || c} ${id.replace(/-1$/, "")}`; if (!groups.has(g)) groups.set(g, []); groups.get(g).push(x); });
let n = 0;
const sections = [...groups.entries()].map(([g, rows]) => `<section><h2>${esc(g)}</h2><ol start="${n + 1}">${rows.map((x) => {
  n++;
  const words = Object.keys(SOUNDS).filter((w) => new RegExp(`(^|[^A-Za-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![A-Za-z0-9])`).test(x.written)).filter((w, _i, all) => !all.some((o) => o !== w && o.includes(w) && x.written.includes(o)));
  const b64 = fs.readFileSync(path.join(A, `${x.key}.mp3`)).toString("base64");
  return `<li><p class="en">${esc(x.written)}</p><p class="ko">${words.map((w) => `<span class="w">${esc(w)} → <b>${esc(SOUNDS[w][0])}</b></span>`).join(" ")}</p><audio controls preload="none" src="data:audio/mpeg;base64,${b64}"></audio></li>`;
}).join("")}</ol></section>`).join("\n");
const html = `<title>한국어 낱말 56문장 듣기</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Sans+KR:wght@600;700&display=swap">
<style>
:root{--ground:#F3F5F4;--paper:#FFFFFF;--ink:#16211D;--soft:#51605A;--line:#D9E1DD;--accent:#1F6B57;--accent-soft:#E2F0EA}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#0E1412;--paper:#151D1A;--ink:#E3EAE6;--soft:#A9B7B1;--line:#29352F;--accent:#6CC7A8;--accent-soft:#15302A;color-scheme:dark}}
:root[data-theme="dark"]{--ground:#0E1412;--paper:#151D1A;--ink:#E3EAE6;--soft:#A9B7B1;--line:#29352F;--accent:#6CC7A8;--accent-soft:#15302A;color-scheme:dark}
body{background:var(--ground);color:var(--ink);font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:15.5px;line-height:1.6;padding-inline:16px;padding-block:20px 48px;word-break:keep-all}
main{max-width:680px;margin:0 auto;display:grid;gap:16px}
h1,h2{font-family:"IBM Plex Sans KR","Noto Sans KR",sans-serif;text-wrap:balance;margin:0}
h1{font-size:1.4rem}h2{font-size:1rem;color:var(--accent)}
.intro,section{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:16px 18px}
.intro p{margin:8px 0 0}
ol{margin:10px 0 0;padding-left:1.6em;display:grid;gap:12px}
li::marker{font-weight:700;color:var(--accent)}
.en{margin:0;font-weight:600}.ko{margin:4px 0 6px;color:var(--soft);font-size:.9rem;display:flex;flex-wrap:wrap;gap:4px 10px}
.w b{color:var(--ink)}
audio{width:100%;max-width:100%}
.ask{background:var(--accent-soft);border-radius:14px;padding:14px 18px}
</style>
<main>
<div class="intro"><h1>한국어 낱말 56문장 듣기</h1>
<p>사장님이 고르신 <b>'라'</b>(같은 영어 목소리가 끊김 없이, 한국어 낱말만 한국어에 가까운 소리로)로 56문장을 모두 새로 만들었습니다. 아직 사이트에는 올리지 않았습니다.</p>
<p>경주 · 신라는 고르신 표본과 같은 발음입니다. 나머지 낱말(불국사 · 추석 · 서울 · 김치 · 이순신 …)은 같은 규칙으로 처음 만든 것이라 특히 들어 봐 주세요.</p></div>
${sections}
<div class="ask"><b>들어 보신 뒤</b><br>· 모두 괜찮으면 "올려" — 저장소에 올리고 배포합니다.<br>· 이상한 문장이 있으면 번호만 알려 주세요(예: "12 · 30 이상해") — 그 낱말의 발음만 고쳐 다시 들려 드립니다.</div>
</main>
`;
fs.writeFileSync(path.join(S, "korean-56-listen.html"), html);
console.log(`korean-56-listen.html ${(html.length / 1024).toFixed(0)} KB · 문장 ${n}`);
