// 회사명 바꿈 전 · 뒤를 한 파일(전후.html)로 묶는다 — 사진은 파일 안에 넣음(외부 주소 · 스크립트 · 글꼴 없음).
//   node build-jeonhu.cjs        (먼저 capture-brand.cjs 로 before · after 를 찍어 둘 것)
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const OUT = path.join(__dirname, "..", "out", "brand-1012");
const ROOT = path.join(__dirname, "..", "..", "..");
const img = (tag, rel) => {
  const file = path.join(OUT, tag, rel);
  const type = rel.endsWith(".png") ? "png" : "jpeg";
  return `data:image/${type};base64,${fs.readFileSync(file).toString("base64")}`;
};
const facts = (tag) => JSON.parse(fs.readFileSync(path.join(OUT, tag, "facts.json"), "utf8"));
const before = facts("before");
const after = facts("after");
const svgUri = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const oldIcon = execSync("git show 30ffaa60:src/app/icon.svg", { cwd: ROOT }).toString();
const newIcon = fs.readFileSync(path.join(ROOT, "src/app/icon.svg"), "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

const pair = (title, note, rel, cls = "") => `
  <section>
    <h2>${title}</h2>
    ${note ? `<p class="note">${note}</p>` : ""}
    <div class="pair ${cls}">
      <figure><figcaption>전</figcaption><img alt="전 — ${title}" src="${img("before", rel)}"></figure>
      <figure><figcaption class="new">뒤</figcaption><img alt="뒤 — ${title}" src="${img("after", rel)}"></figure>
    </div>
  </section>`;

const titles = [
  ["첫 쪽", "light/desktop/home"],
  ["과정 목록 (STUDENT)", "light/desktop/student-list"],
  ["강의 (STUDENT 1-1)", "light/desktop/student-lesson"],
  ["없는 주소", "light/desktop/notfound"],
];

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>회사명 바꿈 전 · 뒤</title>
<style>
  :root { --bg:#FAF8F5; --card:#FFFFFF; --ink:#121316; --soft:#55524D; --line:#E4E1DB; --gold:#8E6B35; }
  @media (prefers-color-scheme: dark) { :root { --bg:#0F0F11; --card:#18181B; --ink:#F3F1EC; --soft:#A9A59E; --line:#2A2A2E; --gold:#D5B25E; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:16px/1.6 -apple-system, "Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 28px 16px 64px; }
  h1 { font-size: 24px; line-height: 1.3; margin: 0 0 6px; }
  h2 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 0 0 10px; }
  .lead { color: var(--soft); margin-bottom: 22px; }
  .note { color: var(--soft); font-size: 14px; }
  section { background: var(--card); border: 1px solid var(--line); border-radius: 14px; padding: 18px; margin: 0 0 16px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; align-items: start; }
  .pair.stack { grid-template-columns: 1fr; }
  figure { margin: 0; min-width: 0; }
  figcaption { font-size: 13px; font-weight: 600; color: var(--soft); margin-bottom: 6px; }
  figcaption.new { color: var(--gold); }
  img { display: block; max-width: 100%; height: auto; border: 1px solid var(--line); border-radius: 8px; }
  .phones img { max-height: 620px; width: auto; margin: 0 auto; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { text-align: left; vertical-align: top; padding: 8px 6px; border-top: 1px solid var(--line); overflow-wrap: anywhere; }
  th { color: var(--soft); font-weight: 600; border-top: 0; }
  td.new { font-weight: 600; }
  .icons { display: flex; gap: 28px; align-items: flex-end; flex-wrap: wrap; }
  .icons figure { text-align: center; }
  .icons img { border: 0; border-radius: 0; margin: 0 auto; }
  ul { margin: 0; padding-left: 20px; }
  li { margin-bottom: 6px; }
  .ask { border-color: var(--gold); }
  @media (max-width: 640px) { .pair { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<main>
  <h1>회사명 바꿈 — 전 · 뒤</h1>
  <p class="lead">'K-IG 교육' → '홍세일 | 음절연구소'. 아직 사이트에 올리지 않았습니다(이 컴퓨터에서 찍은 '뒤' 사진입니다). 같은 AI 계열이 고치고 찍었습니다 — 독립 검수가 아닙니다.</p>

  ${pair("머리줄 로고 — 휴대폰 (밝음)", "모든 과정 · 강의 화면 맨 위 왼쪽. 글자 크기는 전과 같은 15px 이고, '홍세일'은 가볍게 · '음절연구소'는 굵게, 가운데 금색 가는 줄로 나눴습니다.", "light/phone/student-list-logo.png", "stack")}
  ${pair("머리줄 로고 — 휴대폰 (어둠)", "", "dark/phone/student-list-logo.png", "stack")}
  ${pair("머리줄 로고 — 작은 휴대폰 360 (밝음)", "검색 · 메뉴 단추와 겹치지 않고 옆으로 밀리지 않습니다.", "light/small/student-list-logo.png", "stack")}
  ${pair("첫 쪽 — 휴대폰", "사진 슬라이드 모양은 그대로이고 왼쪽 위 이름만 바뀝니다.", "light/phone/home.jpg", "phones")}
  ${pair("첫 쪽 — 데스크톱", "", "light/desktop/home.jpg", "stack")}
  ${pair("과정 목록 — 데스크톱", "", "light/desktop/student-list.jpg", "stack")}

  <section>
    <h2>브라우저 탭 아이콘</h2>
    <p class="note">'K' 글자였던 아이콘을 '음' 글자 모양(동그라미 · 금색 줄 · 네모)으로 새로 그렸습니다. 왼쪽이 전, 오른쪽이 뒤입니다(크게 · 실제 크기).</p>
    <div class="icons">
      <figure><img alt="전 아이콘" width="96" height="96" src="${svgUri(oldIcon)}"><figcaption>전</figcaption></figure>
      <figure><img alt="전 아이콘 실제 크기" width="32" height="32" src="${svgUri(oldIcon)}"><figcaption>전 · 탭</figcaption></figure>
      <figure><img alt="뒤 아이콘" width="96" height="96" src="${svgUri(newIcon)}"><figcaption class="new">뒤</figcaption></figure>
      <figure><img alt="뒤 아이콘 실제 크기" width="32" height="32" src="${svgUri(newIcon)}"><figcaption class="new">뒤 · 탭</figcaption></figure>
    </div>
  </section>

  <section>
    <h2>브라우저 탭 제목 · 카카오톡 공유 제목</h2>
    <table>
      <tr><th>쪽</th><th>전</th><th>뒤</th></tr>
      ${titles.map(([name, key]) => `<tr><td>${name}</td><td>${esc(before[key].title)}</td><td class="new">${esc(after[key].title)}</td></tr>`).join("\n      ")}
      <tr><td>공유 제목 (첫 쪽)</td><td>${esc(before["light/desktop/home"].ogTitle)}</td><td class="new">${esc(after["light/desktop/home"].ogTitle)}</td></tr>
      <tr><td>공유 제목 (STUDENT)</td><td>${esc(before["light/desktop/student-list"].ogTitle)}</td><td class="new">${esc(after["light/desktop/student-list"].ogTitle)}</td></tr>
      <tr><td>사이트 소개 글</td><td>${esc(before["light/desktop/home"].description)}</td><td class="new">${esc(after["light/desktop/home"].description)}</td></tr>
    </table>
    <p class="note" style="margin-top:10px">과정 목록 제목에 회사 이름이 두 번 나오던 것('STUDENT · K-IG 교육 · K-IG 핵심 어학 마스터')도 한 번으로 줄었습니다.</p>
  </section>

  <section>
    <h2>그 밖에 바뀐 글</h2>
    <ul>
      <li>관리자 화면의 고객 안내 예시: '안녕하세요! K-IG 올패스 이용권 번호는 …' → '안녕하세요! 홍세일 | 음절연구소 이용권 번호는 …'</li>
      <li>이용권 종류를 알 수 없을 때 쓰는 이름: 'K-IG 이용권' → '이용권'</li>
    </ul>
  </section>

  <section>
    <h2>일부러 안 바꾼 것</h2>
    <ul>
      <li><b>이용권 코드의 'KIG-' 머리</b> — 이미 나간 코드가 그대로 쓰여야 해서 그대로 둡니다. 이용권 창의 입력 예시('KIG-1Y-XXXX…')도 실제 코드 모양이라 그대로입니다.</li>
      <li><b>사이트 주소 k-ig-core.vercel.app</b> — 주소(도메인)를 바꾸는 일은 사장님 몫입니다.</li>
      <li><b>옛 교재 원문 속 'K-IG 교육'</b> — 강의 자료 안에 남아 있지만 화면에는 나오지 않습니다(찍은 36쪽에서 옛 이름 0곳).</li>
      <li><b>학습자 기기에 저장된 진도 · 북마크 이름표</b> — 바꾸면 저장된 진도가 사라져서 그대로 둡니다.</li>
    </ul>
  </section>

  <section class="ask">
    <h2>사장님께 여쭐 것 2가지</h2>
    <ul>
      <li><b>띄어쓰기</b> — 지시에 '음절연구소' 와 '음절 연구소' 가 둘 다 있었습니다. 지금은 붙여 쓴 <b>'홍세일 | 음절연구소'</b> 로 했습니다. 띄어 쓰는 게 맞으면 한 줄만 고치면 됩니다.</li>
      <li><b>사이트에 올릴지</b> — 사진이 괜찮으시면 '올려' 한마디만 주세요. 바로 커밋 · 배포하고 운영에서 다시 확인합니다.</li>
    </ul>
  </section>
</main>
</body>
</html>
`;
const dest = path.join(__dirname, "전후.html");
fs.writeFileSync(dest, html);
console.log("전후.html", Math.round(html.length / 1024), "KB");
