// 보고서 markdown(이 보고서가 쓰는 만큼만: 제목 # ## ### · 문단 · - / 1. 목록 · | 표 | · > 인용 · **굵게** · `코드` · [글](주소) · <details>) → 휴대폰에서 읽을 HTML 한 장.
//   node md2html.cjs report.md out.html
const fs = require("fs");
const [src, dst] = process.argv.slice(2);
const md = fs.readFileSync(src, "utf8").replace(/\r\n/g, "\n");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const inline = (s) => {
  const codes = [];
  s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(c); return `\u0000${codes.length - 1}\u0000`; });
  s = esc(s)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2">$1</a>')
    .replace(/(^|[\s(])(https:\/\/k-ig-core\.vercel\.app[^\s)<,·]*)/g, '$1<a href="$2">$2</a>')
    .replace(/✔/g, '<span class="ok">✔</span>').replace(/✘/g, '<span class="bad">✘</span>');
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${esc(codes[+i])}</code>`);
};
const chip = (s) => s
  .replace(/^(관문 [0-9-]+) — (불통과[^,]*),/, '<span class="gate">$1</span> <span class="chip fail">$2</span>')
  .replace(/^(관문 [0-9-]+) — (통과[^,]*),/, '<span class="gate">$1</span> <span class="chip pass">$2</span>')
  .replace(/^(관문 [0-9-]+) — (상태만[^,:]*)[,:]/, '<span class="gate">$1</span> <span class="chip info">$2</span>');
const lines = md.split("\n");
const out = [];
let i = 0;
const slug = (t) => t.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").toLowerCase();
while (i < lines.length) {
  const l = lines[i];
  if (!l.trim()) { i++; continue; }
  if (/^<\/?details|^<summary/.test(l.trim())) { out.push(l.trim()); i++; continue; }
  let m;
  if ((m = l.match(/^(#{1,4}) (.*)$/))) { const n = m[1].length; out.push(`<h${n} id="${slug(m[2])}">${inline(m[2])}</h${n}>`); i++; continue; }
  if (/^---+$/.test(l.trim())) { out.push("<hr>"); i++; continue; }
  if (l.startsWith(">")) { const b = []; while (i < lines.length && lines[i].startsWith(">")) { b.push(lines[i].replace(/^>\s?/, "")); i++; } out.push(`<blockquote>${b.map(inline).join("<br>")}</blockquote>`); continue; }
  if (l.startsWith("|")) {
    const rows = []; while (i < lines.length && lines[i].startsWith("|")) { rows.push(lines[i]); i++; }
    const cells = (r) => r.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((c) => c.trim());
    const head = cells(rows[0]); const body = rows.slice(2).map(cells);
    out.push(`<div class="table"><table><thead><tr>${head.map((h) => `<th>${inline(h)}</th>`).join("")}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
    continue;
  }
  if (/^\s*([-*]|\d+\.) /.test(l)) {
    const ordered = /^\s*\d+\. /.test(l); const items = [];
    while (i < lines.length && (/^\s*([-*]|\d+\.) /.test(lines[i]) || (/^\s{2,}\S/.test(lines[i]) && items.length))) {
      if (/^\s*([-*]|\d+\.) /.test(lines[i]) && !/^\s{2,}/.test(lines[i])) items.push(lines[i].replace(/^\s*([-*]|\d+\.) /, ""));
      else items[items.length - 1] += " " + lines[i].trim().replace(/^([-*]) /, "· ");
      i++;
    }
    const tag = ordered ? "ol" : "ul";
    out.push(`<${tag}${items.every((t) => /^관문 [0-9-]+ — /.test(t)) ? ' class="gates"' : ""}>${items.map((t) => `<li>${/^관문 [0-9-]+ — /.test(t) ? chip(inline(t)) : inline(t)}</li>`).join("")}</${tag}>`);
    continue;
  }
  const p = []; while (i < lines.length && lines[i].trim() && !/^(#{1,4} |>|\||\s*([-*]|\d+\.) |---+$|<\/?details|<summary)/.test(lines[i])) { p.push(lines[i]); i++; }
  out.push(`<p>${p.map(inline).join("<br>")}</p>`);
}
const title = (md.match(/^# (.*)$/m) || [, "보고서"])[1];
const html = `<title>K-IG 출시 관문 보고서</title>
<meta name="description" content="${esc(title)}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@500;600;700&family=Noto+Sans+KR:wght@400;500;700&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
:root{--ground:#F4F6F8;--paper:#FFFFFF;--ink:#17202B;--soft:#4E5A68;--faint:#8A95A3;--line:#DCE2E8;--accent:#0B5C8A;--accent-soft:#E3EEF5;--pass:#1E6B45;--pass-bg:#E2F1E8;--fail:#A4261D;--fail-bg:#F8E3E0;--info:#7A5B00;--info-bg:#F6EDD2;--code-bg:#EDF1F4}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--ground:#0F141A;--paper:#161D25;--ink:#E4E9EF;--soft:#AEB9C5;--faint:#7D8996;--line:#2A3440;--accent:#6CB6E6;--accent-soft:#16303F;--pass:#7FD1A2;--pass-bg:#15301F;--fail:#F2A097;--fail-bg:#3A1C19;--info:#E7C66A;--info-bg:#352C12;--code-bg:#1D2630;color-scheme:dark}}
:root[data-theme="dark"]{--ground:#0F141A;--paper:#161D25;--ink:#E4E9EF;--soft:#AEB9C5;--faint:#7D8996;--line:#2A3440;--accent:#6CB6E6;--accent-soft:#16303F;--pass:#7FD1A2;--pass-bg:#15301F;--fail:#F2A097;--fail-bg:#3A1C19;--info:#E7C66A;--info-bg:#352C12;--code-bg:#1D2630;color-scheme:dark}
body{background:var(--ground);color:var(--ink);font-family:"Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",system-ui,sans-serif;font-size:15.5px;line-height:1.7;padding-inline:16px;padding-block:20px 48px;word-break:keep-all;overflow-wrap:anywhere}
main{max-width:760px;margin:0 auto;background:var(--paper);border:1px solid var(--line);border-radius:14px;padding-inline:clamp(16px,4vw,40px);padding-block:28px 40px}
h1,h2,h3,h4{font-family:"IBM Plex Sans KR","Noto Sans KR",system-ui,sans-serif;text-wrap:balance;line-height:1.35;margin:0}
h1{font-size:1.55rem;font-weight:700;margin-bottom:14px}
h2{font-size:1.2rem;font-weight:700;margin-top:38px;padding-top:14px;border-top:2px solid var(--ink)}
h3{font-size:1.02rem;font-weight:600;margin-top:24px;color:var(--accent)}
p,ul,ol,blockquote,.table{margin-top:12px;margin-bottom:0}
ul,ol{padding-left:1.3em}li{margin:5px 0}
blockquote{margin-left:0;padding:12px 16px;background:var(--accent-soft);border-radius:10px;color:var(--ink)}
code{font-family:"IBM Plex Mono",ui-monospace,Consolas,monospace;font-size:.86em;background:var(--code-bg);padding:1px 5px;border-radius:5px}
a{color:var(--accent)}a:focus-visible,summary:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
strong{font-weight:700}
hr{border:0;border-top:1px solid var(--line);margin:28px 0}
.table{overflow-x:auto;border:1px solid var(--line);border-radius:10px}
table{border-collapse:collapse;width:100%;font-size:.86rem;line-height:1.55;font-variant-numeric:tabular-nums}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);vertical-align:top;text-align:left}
th{background:var(--code-bg);font-weight:600;white-space:nowrap}tr:last-child td{border-bottom:0}
ul.gates{list-style:none;padding-left:0}ul.gates li{padding:10px 12px;border:1px solid var(--line);border-radius:10px;margin:8px 0}
.gate{font-family:"IBM Plex Sans KR",sans-serif;font-weight:700;margin-right:4px}
.chip{display:inline-block;font-size:.8rem;font-weight:700;padding:1px 9px;border-radius:999px;margin-right:4px}
.chip.pass{color:var(--pass);background:var(--pass-bg)}.chip.fail{color:var(--fail);background:var(--fail-bg)}.chip.info{color:var(--info);background:var(--info-bg)}
.ok{color:var(--pass)}.bad{color:var(--fail)}
details{margin-top:14px;border:1px solid var(--line);border-radius:10px;padding:10px 14px}summary{cursor:pointer;font-weight:600}
h2#a-요약+h3,h3[id^="판정"]{font-size:1.15rem;color:var(--ink);background:var(--accent-soft);padding:12px 14px;border-radius:10px}
@media (prefers-reduced-motion: reduce){*{scroll-behavior:auto}}
</style>
<main>
${out.join("\n")}
</main>
`;
fs.writeFileSync(dst, html);
console.log(`${dst} · ${(html.length / 1024).toFixed(1)} KB · 블록 ${out.length}`);
