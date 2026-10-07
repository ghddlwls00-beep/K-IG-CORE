#!/usr/bin/env node
/** metrics.jsonl → index.md (사진 목록 표) + summary.json (과정별 숫자). 읽기만 · out/ui-1007/ 에만 씀. */
const fs = require("fs");
const path = require("path");
const ROOT = path.join(__dirname, "../out/ui-1007");
const rows = new Map();
for (const line of fs.readFileSync(path.join(ROOT, "metrics.jsonl"), "utf8").split("\n")) {
  if (!line.trim()) continue;
  let r; try { r = JSON.parse(line); } catch { continue; }
  if (r.kind === "pagedone" || !r.state) continue;
  rows.set(`${r.mode}|${r.theme}|${r.vp}|${r.page}|${r.state}`, r);
}
const all = [...rows.values()];
const THEME_KO = { light: "밝음", dark: "어둠" };
const course = (p) => (p === "/" ? "home" : p.replace(/^\//, "").split(/[/?]/)[0] || "home");
const cover = (r) => Math.max(0, ...(r.covers || []).map((c) => (c && !c.error ? (c.top || 0) + (c.bottom || 0) : 0)));
const med = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

let md = "# UI 검토 1007 — 사진 목록\n\n";
md += `찍은 상태 ${all.length}곳 · 사진 ${all.reduce((n, r) => n + (r.files || []).length, 0)}장. 같은 AI 계열이 찍고 셈 — 독립 검수 아님.\n\n`;
md += "'첫 학습 항목 y' = 단계 탭(없으면 제목 줄) 아래 처음 보이는 입력 칸 · 단추 · 글의 문서 y(플레이어 안 것 포함 / 뺀 값). '고정 막대' = 그 쪽을 훑는 동안 화면 위 · 아래를 가린 막대 높이 합의 최댓값(px).\n\n";
md += "| 이용권 | 쪽 | 단계 | 화면 | 밝음/어둠 | 파일 | 첫 학습 항목 y (플레이어 뺀) | 44px 미만 | 12px 미만 | 입력 16px 미만 | 옆 밀림 | 고정 막대 | 글자 대비 미달 |\n|---|---|---|---|---|---|---|---|---|---|---|---|---|\n";
const order = (r) => [r.mode, course(r.page), r.page, r.state].join("~");
for (const r of all.sort((a, b) => (order(a) < order(b) ? -1 : 1))) {
  const m = r.metrics && !r.metrics.error ? r.metrics : null;
  const f = r.files || [];
  const first = f.length ? f[0] : "—";
  const fy = m && m.firstItem ? `${m.firstItem.y}${m.firstItemNoPlayer ? ` (${m.firstItemNoPlayer.y})` : ""}` : "—";
  md += `| ${r.mode === "free" ? "없음" : "있음"} | ${r.page} | ${r.state}${r.paywalled ? " (잠김)" : ""}${r.clicked === false ? " (누르기 실패)" : ""} | ${r.vp} | ${THEME_KO[r.theme]} | ${f.length ? `${first}${f.length > 1 ? ` … ${f.length}장` : ""}` : "—"} | ${fy} | ${m ? m.small44.count : "—"} | ${m ? m.text.under12 : "—"} | ${m ? m.zoomFields : "—"} | ${m ? (m.overflowX ? "밀림" : "아니오") : "—"} | ${cover(r)} | ${m ? m.contrast.low : "—"} |\n`;
}
fs.writeFileSync(path.join(ROOT, "index.md"), md);

// 과정별 요약 — 강의 단계 · 목록 기준, 화면(vp)별, 밝음 기준 크기(대비는 밝음 · 어둠 따로)
const sum = {};
for (const r of all) {
  if (r.mode !== "lic" || !r.metrics || r.metrics.error) continue;
  const c = course(r.page);
  const k = `${c}|${r.vp}|${r.theme}`;
  const o = (sum[k] ||= { course: c, vp: r.vp, theme: r.theme, states: 0, small44: [], under12: [], zoomFields: [], overflow: 0, lowContrast: [], cover: [], firstOver: [] });
  o.states++;
  o.small44.push(r.metrics.small44.count); o.under12.push(r.metrics.text.under12); o.zoomFields.push(r.metrics.zoomFields);
  if (r.metrics.overflowX) o.overflow++;
  o.lowContrast.push(r.metrics.contrast.low); o.cover.push(cover(r));
  if (r.metrics.firstItem && r.metrics.vh && r.metrics.firstItem.y > r.metrics.vh && /^step\d+$/.test(r.state)) o.firstOver.push(`${r.page}#${r.state} y=${r.metrics.firstItem.y}${r.metrics.firstItemNoPlayer ? `/${r.metrics.firstItemNoPlayer.y}` : ""}`);
}
const out = Object.values(sum).map((o) => ({ ...o, small44: { max: Math.max(...o.small44), med: med(o.small44) }, under12: { max: Math.max(...o.under12), med: med(o.under12) }, zoomFields: { max: Math.max(...o.zoomFields), med: med(o.zoomFields) }, lowContrast: { max: Math.max(...o.lowContrast), med: med(o.lowContrast) }, cover: { max: Math.max(...o.cover) } }));
fs.writeFileSync(path.join(ROOT, "summary.json"), JSON.stringify(out, null, 1));
console.log(`index.md ${all.length}곳 · summary.json ${out.length}줄`);
