#!/usr/bin/env node
/**
 * LECTURE 확인(2026-10-17) — 사장님이 볼 한 파일 docs/lecture/미리보기.html 을 만든다. 사진은 docs/qa-2026-09-18/out/lecture/verify/ 의
 * 것(verify-lecture-screens.cjs 가 찍음)을 줄여 JPEG 로 파일 안에 넣는다(외부 글꼴 · 스크립트 0 · 16MB 아래).
 *   node docs/lecture/확인-도구/build-preview.cjs
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const pnpm = path.join(REPO, "node_modules/.pnpm");
const sharp = require(path.join(pnpm, fs.readdirSync(pnpm).find((d) => d.startsWith("sharp@")), "node_modules/sharp"));
const V = path.join(REPO, "docs/qa-2026-09-18/out/lecture/verify");
const play = require(path.join(V, "play-final.json"));
const others = require(path.join(V, "others-compare.json"));

async function img(file, width, alt, cls = "") {
  const buf = await sharp(path.join(V, file)).resize({ width, withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
  return `<img class="${cls}" alt="${alt}" src="data:image/jpeg;base64,${buf.toString("base64")}">`;
}
const fig = async (file, width, cap, cls) => `<figure class="${cls || ""}">${await img(file, width, cap)}<figcaption>${cap}</figcaption></figure>`;
const phone = (f, cap) => fig(f, 390, cap, "phone");
const desk = (f, cap) => fig(f, 960, cap, "desk");

(async () => {
  const c = Object.fromEntries(play.compare.map((x) => [x.point, x]));
  const cmpRow = (p, label) => `<tr><td>${label}</td><td>${c[p].state.time.split(" / ")[0]}</td><td>${c[p].refStrokes}</td><td>${c[p].inkIoU === 1 ? "100%" : (c[p].inkIoU * 100).toFixed(2) + "%"}</td><td>${c[p].bigDiffPx}</td></tr>`;
  const oth = others.filter((r) => /student|reading|READING/.test(r.screen));
  const sections = [];

  sections.push(`<section><h2>1. 첫 화면 — LECTURE 슬라이드</h2>
<p>READING 다음, 9번째 슬라이드로 들어갔어요. 사진은 9월 GVA 섹션의 칠판 사진을 되살린 거예요.</p>
<div class="row">${await phone("screens-m390-light-home-lecture.jpg", "휴대폰 · 밝음")}${await phone("screens-m390-dark-home-lecture.jpg", "휴대폰 · 어둠")}</div>
<div class="row">${await desk("screens-d1366-light-home-lecture.jpg", "데스크톱 · 밝음")}</div></section>`);

  sections.push(`<section><h2>2. 강의 목록</h2>
<p>200개 강의가 20장으로 나뉘어 있어요. 이용권이 없으면 1장의 1·2강만 열리고, 나머지는 자물쇠가 보여요.</p>
<div class="row">${await phone("screens-m390-light-list.jpg", "휴대폰 · 밝음")}${await phone("screens-m390-dark-list.jpg", "휴대폰 · 어둠")}</div>
<div class="row">${await desk("screens-d1366-light-list.jpg", "데스크톱 · 밝음")}</div></section>`);

  sections.push(`<section><h2>3. 강의 화면 — 처음 · 재생 중 · 끝</h2>
<p>강의를 열면 0:00 빈 쪽에서 멈춰 있어요(저절로 재생되지 않아요). 재생을 누르면 선생님 필기가 원래 시간대로 그려지고, 끝까지 가면 아래 '이 강의 학습 완료' 단추가 켜져요. 그 전에는 '강의를 끝까지 재생하면 완료할 수 있어요.'라고 보여요.</p>
<div class="row">${await phone("screens-m390-light-lm001-0s.jpg", "휴대폰 · 0초(빈 쪽, 멈춤)")}${await phone("screens-m390-light-lm001-playing.jpg", "휴대폰 · 재생 중(1:01)")}${await phone("screens-m390-light-lm001-end.jpg", "휴대폰 · 끝(7:37)")}</div>
<div class="row">${await phone("screens-m360-dark-lm001-playing.jpg", "작은 휴대폰 · 어둠 · 재생 중")}${await phone("screens-m390-light-lm001-endbar.jpg", "끝까지 본 뒤 — 완료 단추 켜짐")}</div>
<div class="row">${await desk("screens-d1366-light-lm001-0s.jpg", "데스크톱 · 0초")}</div>
<div class="row">${await desk("screens-d1366-dark-lm001-end.jpg", "데스크톱 · 어둠 · 끝")}</div></section>`);

  sections.push(`<section><h2>4. 필기가 원래 시간대로 그려지는지</h2>
<p>사이트 화면과, 강의 파일에서 직접 그린 그림을 같은 크기로 겹쳐 비교했어요(중등 영어독해 1강). 왼쪽이 사이트, 가운데가 강의 파일에서 그린 것, 오른쪽에서 보라색이 다른 점이에요.</p>
<table><thead><tr><th>시각</th><th>화면 시계</th><th>그려진 획</th><th>필기 겹침</th><th>다른 점(픽셀)</th></tr></thead><tbody>
${cmpRow(0, "처음")}${cmpRow(30, "30초")}${cmpRow(120, "2분")}${cmpRow("end", "끝")}</tbody></table>
<p class="note">빠르기 2×로 실제 ${play.speed2x.wallSec}초 재생 → 화면 시계 ${play.speed2x.shownAt30s.split(" / ")[0]}(약 2배). 멈춘 뒤 2초 기다려도 그대로였어요.</p>
<div class="row">${await fig("play-lm001-30-side.png", 1600, "30초", "desk")}</div>
<div class="row">${await fig("play-lm001-end-side.png", 1600, "끝", "desk")}</div></section>`);

  sections.push(`<section><h2>5. 잠긴 강의</h2>
<p>이용권 없이 3강을 열면 이 화면만 나와요. 이 화면의 페이지 속에는 교재 그림이나 필기 파일 주소가 하나도 들어 있지 않아요(직접 세어 봄: 0개).</p>
<div class="row">${await phone("screens-m390-light-lm003-locked.jpg", "휴대폰 · 밝음")}${await phone("screens-m390-dark-lm003-locked.jpg", "휴대폰 · 어둠")}</div></section>`);

  sections.push(`<section><h2>6. 메뉴와 검색</h2>
<p>메뉴에 LECTURE가 READING 다음에 있어요. 검색창에 '영어독해'를 치면 강의 제목이 나와요.</p>
<div class="row">${await phone("screens-m390-light-menu.jpg", "메뉴")}${await phone("screens-m390-dark-search.jpg", "검색 '영어독해'")}</div>
<div class="row">${await desk("screens-d1366-light-search.jpg", "데스크톱 · 검색")}</div></section>`);

  sections.push(`<section><h2>7. 다른 과정은 그대로인지</h2>
<p>지금 운영 중인 사이트(왼쪽)와 이번에 바뀐 사이트(오른쪽)를 같은 크기로 찍어 비교했어요. STUDENT · READING 목록은 0% 달라요. 첫 화면은 오른쪽 점이 하나 늘어난 만큼(0.05~0.24%)만 달라요.</p>
<table><thead><tr><th>화면</th><th>다른 픽셀</th></tr></thead><tbody>${others.map((r) => `<tr><td>${r.vp === "d1366" ? "데스크톱" : "휴대폰"} · ${r.screen.replace("home ", "첫 화면 ")}</td><td>${r.diffPct}%</td></tr>`).join("")}</tbody></table>
<div class="row">${await phone(path.relative(V, path.join(REPO, oth.find((r) => r.vp === "m390" && r.screen === "/student").prodFile)), "운영 · STUDENT 목록")}${await phone(path.relative(V, path.join(REPO, oth.find((r) => r.vp === "m390" && r.screen === "/student").localFile)), "바뀐 사이트 · STUDENT 목록")}</div></section>`);

  sections.push(`<section><h2>8. 이번 확인에서 고친 것</h2><ol>
<li><b>필기 색</b> — 사장님이 정하신 색(진홍 · 잉크 파랑 · 숲 초록 · 먹색 · 금색 형광펜)이 아니라 처음 시안 색으로 그려지고 있었어요. 정하신 색으로 바꿨어요.</li>
<li><b>막대를 끝까지 끌어도 완료가 안 켜짐</b> — 재생 막대를 손가락이나 마우스로 맨 끝까지 끌어도 1초 모자란 곳에 멈춰서 '이 강의 학습 완료'가 켜지지 않았어요(200강 중 181강). 고쳐서 이제 켜져요.</li>
<li><b>점 하나짜리 필기가 안 보임</b> — 선생님이 찍은 마침표 같은 점(41강에 53개)이 화면에 안 그려졌어요. 이제 그려져요(위 4번 비교에서 다른 점 0).</li>
</ol></section>`);

  sections.push(`<section><h2>9. 여쭤볼 것</h2><ol>
<li>데스크톱에서 강의를 처음 열면 교재 쪽 아래쪽이 화면 밖에 있어요. 조금 내리면 재생 줄이 위에 붙은 채로 쪽 전체가 한 화면에 보여요. 이대로 괜찮을까요?</li>
<li>휴대폰에서는 교재 글씨가 작아요(두 손가락으로 확대는 돼요). 확대 단추 같은 것이 필요할까요?</li>
<li>잠긴 강의 화면의 안내 문장('…학습할 수 있는 강의입니다')은 모든 과정이 같이 쓰는 문장이라 이번에는 그대로 두었어요.</li>
<li>만들기 기록의 여쭐 것(첫 화면 문구 · 과정 소개 글 · 사이트 설명 '9개 과정' · '소리 없이 필기만 나와요' 안내 · 오른쪽 흰 띠)도 아직 답을 기다려요.</li>
</ol></section>`);

  const html = `<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>LECTURE 미리보기</title>
<style>
:root{--bg:#f8f6f1;--surface:#fff;--ink:#1d1d1f;--soft:#5b5850;--line:#e4e0d6;--accent:#8a6a2f}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--bg:#111214;--surface:#1a1b1e;--ink:#ecebe7;--soft:#a9a69e;--line:#2e2f33;--accent:#d2ad62}}
:root[data-theme="dark"]{--bg:#111214;--surface:#1a1b1e;--ink:#ecebe7;--soft:#a9a69e;--line:#2e2f33;--accent:#d2ad62}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font-family:system-ui,-apple-system,"Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif;font-size:16px;line-height:1.65}
main{max-width:1040px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:28px;line-height:1.3;margin:8px 0 6px}
h2{font-size:21px;margin:0 0 8px}
p{margin:0 0 12px;color:var(--soft)}
.lead{font-size:17px;color:var(--ink)}
section{background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:20px 16px;margin:20px 0}
.row{display:flex;flex-wrap:wrap;gap:16px;margin:12px 0}
figure{margin:0;flex:1 1 220px;max-width:100%}
figure.phone{flex:0 1 260px}
figure.desk{flex:1 1 100%}
figure img{display:block;width:100%;height:auto;border:1px solid var(--line);border-radius:12px;background:#fff}
figcaption{font-size:14px;color:var(--soft);margin-top:6px}
table{border-collapse:collapse;width:100%;margin:8px 0 12px;font-size:15px}
th,td{border-bottom:1px solid var(--line);padding:8px 6px;text-align:left}
th{color:var(--soft);font-weight:600}
.note{font-size:15px}
ol{margin:0;padding-left:22px}li{margin:6px 0}
.badge{display:inline-block;border:1px solid var(--accent);color:var(--accent);border-radius:999px;padding:2px 12px;font-size:14px}
</style></head><body><main>
<span class="badge">아직 사이트에 올리지 않았어요</span>
<h1>LECTURE 미리보기</h1>
<p class="lead">중등 · 고등 영어독해 강의 200개를 넣은 새 섹션이에요. 음성은 없고, 재생하면 교재 쪽 위에 선생님 필기가 원래 시간대로 그려져요. 이 컴퓨터에서 사이트를 띄워 이용권 없이 찍은 사진이에요(2026-10-17).</p>
<p>한눈에: 확인한 것 모두 통과했어요. 확인하다가 문제 3가지를 찾아 고쳤어요(8번). 사장님 판단이 필요한 것은 9번에 있어요.</p>
${sections.join("\n")}
</main></body></html>`;
  const out = path.join(REPO, "docs/lecture/미리보기.html");
  fs.writeFileSync(out, html);
  const size = fs.statSync(out).size;
  console.log("미리보기.html", (size / 1024 / 1024).toFixed(2), "MB", "· external refs:", (html.match(/(?:src|href)="https?:/g) || []).length, "· <script>:", (html.match(/<script/g) || []).length);
})();
