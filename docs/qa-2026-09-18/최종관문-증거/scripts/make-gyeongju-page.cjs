// '경주' 발음 고르기 페이지 — 같은 문장을 방식별로(지금 운영 · 고치기 전 · 표본 셋) 들어 보고 고르게. 소리는 data: 로 넣음(아티팩트는 다른 곳 소리를 못 불러옴).
const fs = require("fs");
const path = require("path");
const S = __dirname;
const A = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/public/audio/azure-ava/v1";
const b64 = (f) => `data:audio/mpeg;base64,${fs.readFileSync(f).toString("base64")}`;
const sentences = [
  { head: "문장 1 — 낱말이 문장 끝에", en: "Another attractive destination is Gyeongju.", n: 1, files: {
    ga: path.join(A, "11-c5eb7a5effe1be35.mp3"), na: path.join(A, "17-693e7bd3a48c98e8.mp3"),
    da: path.join(S, "samples/s1-korean-voice.mp3"), ra: path.join(S, "samples/s1-ipa.mp3"), ma: path.join(S, "samples/s1-spelling.mp3") } },
  { head: "문장 2 — 낱말이 문장 앞에 · 신라도", en: "Gyeongju is the old capital of the Silla Kingdom.", n: 2, files: {
    ga: path.join(A, "14-74ccade19ede2db8.mp3"), na: path.join(A, "1d-a8344bed9bf341a2.mp3"),
    da: path.join(S, "samples/s2-korean-voice.mp3"), ra: path.join(S, "samples/s2-ipa.mp3"), ma: path.join(S, "samples/s2-spelling.mp3") } },
];
const WAYS = [
  { k: "ga", mark: "가", name: "지금 운영", how: "영어 목소리(Ava)가 '경주' 부분만 한국어 모드로 바꿔 읽음 — 사장님이 들으신 것", tag: "now" },
  { k: "na", mark: "나", name: "고치기 전", how: "영어 목소리가 로마자 Gyeongju 를 영어식으로 읽음", tag: "old" },
  { k: "da", mark: "다", name: "한국어 성우", how: "'경주' 만 한국어 성우(선희)가 읽음 — 발음은 가장 정확, 한 문장에 목소리 둘 · 이음새에 0.5~1초 멈춤", tag: "alt" },
  { k: "ra", mark: "라", name: "발음 지정", how: "같은 영어 목소리가 끊김 없이, '경주' 를 한국어에 가까운 소리(발음 기호)로", tag: "alt" },
  { k: "ma", mark: "마", name: "철자 바꿈", how: "같은 영어 목소리가 Kyungju · Shilla 로 읽음(화면 글은 그대로 Gyeongju)", tag: "alt" },
];
const card = (s) => `<section class="sent"><h2>${s.head}</h2><p class="en">${s.en}</p><p class="ko">STUDENT 20-4 · ${s.n}번 문장</p><ul class="ways">${WAYS.map((w) => `<li class="${w.tag}"><div class="lab"><span class="mark">${w.mark}</span><b>${w.name}</b><span class="how">${w.how}</span></div><audio controls preload="none" src="${b64(s.files[w.k])}"></audio></li>`).join("")}</ul></section>`;
const html = `<title>경주 발음 고르기</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Sans+KR:wght@600;700&display=swap">
<style>
:root{--ground:#F3F5F4;--paper:#FFFFFF;--ink:#16211D;--soft:#51605A;--line:#D9E1DD;--accent:#1F6B57;--accent-soft:#E2F0EA;--now:#8A5A00;--now-bg:#F7EDD5;--old:#5B6470;--old-bg:#ECEFF2}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#0E1412;--paper:#151D1A;--ink:#E3EAE6;--soft:#A9B7B1;--line:#29352F;--accent:#6CC7A8;--accent-soft:#15302A;--now:#E9C46A;--now-bg:#33290F;--old:#AEB6C0;--old-bg:#20262D;color-scheme:dark}}
:root[data-theme="dark"]{--ground:#0E1412;--paper:#151D1A;--ink:#E3EAE6;--soft:#A9B7B1;--line:#29352F;--accent:#6CC7A8;--accent-soft:#15302A;--now:#E9C46A;--now-bg:#33290F;--old:#AEB6C0;--old-bg:#20262D;color-scheme:dark}
body{background:var(--ground);color:var(--ink);font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:15.5px;line-height:1.65;padding-inline:16px;padding-block:20px 48px;word-break:keep-all}
main{max-width:680px;margin:0 auto;display:grid;gap:18px}
h1,h2{font-family:"IBM Plex Sans KR","Noto Sans KR",sans-serif;text-wrap:balance;margin:0}
h1{font-size:1.45rem}h2{font-size:1.05rem;color:var(--accent)}
.intro{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}
.intro p{margin:8px 0 0}
.sent{background:var(--paper);border:1px solid var(--line);border-radius:14px;padding:18px}
.en{font-weight:700;font-size:1.05rem;margin:10px 0 0}.ko{color:var(--soft);margin:2px 0 0}
.ways{list-style:none;padding:0;margin:14px 0 0;display:grid;gap:10px}
.ways li{border:1px solid var(--line);border-radius:12px;padding:10px 12px;display:grid;gap:8px}
.ways li.now{background:var(--now-bg)}.ways li.old{background:var(--old-bg)}
.lab{display:flex;flex-wrap:wrap;align-items:baseline;gap:6px 10px}
.mark{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--paper);font-weight:700;font-family:"IBM Plex Sans KR",sans-serif}
.how{flex-basis:100%;color:var(--soft);font-size:.9rem}
audio{width:100%;max-width:100%}
.ask{background:var(--accent-soft);border-radius:14px;padding:16px 18px}
</style>
<main>
<div class="intro"><h1>경주 발음 고르기</h1>
<p>STUDENT 20-4 의 두 문장을 다섯 가지로 들어 보시고 <b>가 · 나 · 다 · 라 · 마</b> 중 하나를 골라 주세요. 고르신 방식으로 한국어 낱말 56문장(경주 · 불국사 · 추석 · 서울 · 김치 · 신라 등)을 모두 다시 만듭니다.</p>
<p>'가' 가 지금 운영 소리입니다. '다 · 라 · 마' 는 비교용으로 방금 만든 것이라 아직 사이트에는 없습니다.</p></div>
${sentences.map(card).join("\n")}
<div class="ask"><b>고르실 때 볼 점</b><br>· 다: 한국어 발음은 가장 정확하지만 한 문장에서 목소리가 바뀌고 이음새에 잠깐씩 멈춥니다.<br>· 라 · 마: 목소리 하나로 끊김 없이 읽지만 '경주' 는 영어 화자가 한국어를 흉내 낸 소리입니다.<br>· 받아쓰기 화면의 글자는 어느 쪽이든 그대로 Gyeongju 입니다.</div>
</main>
`;
fs.writeFileSync(path.join(S, "gyeongju-choose.html"), html);
console.log(`gyeongju-choose.html ${(html.length / 1024).toFixed(0)} KB`);
