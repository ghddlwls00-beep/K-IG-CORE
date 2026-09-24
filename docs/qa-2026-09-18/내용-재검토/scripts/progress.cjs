#!/usr/bin/env node
/**
 * 학습 내용 재검토 — 조각마다 진행(판정한 줄 / 판정할 줄 · 표본 쪽 · 확인)과 실제 속도(시간당 판정한 줄 — 배치 시각으로)를 센다.
 *   node progress.cjs [--since "2026-09-24 15:53"]
 * 남은 시간 어림 = 남은 줄 ÷ (지금까지 모든 조각의 시간당 판정 줄) — 동시에 도는 일꾼 수가 바뀌면 다시 잰다.
 */
const fs = require("fs");
const path = require("path");
const L = require("./lib.cjs");
const si = process.argv.indexOf("--since");
const SINCE = si >= 0 ? process.argv[si + 1] : "2026-09-24 15:53";
const toMin = (s) => { const m = String(s).match(/(\d{4})-(\d\d)-(\d\d) (\d\d):(\d\d)/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000 : NaN; };
const now = new Date();
const nowStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
const t0 = toMin(SINCE), tn = toMin(nowStr);
const rows = [];
let totalDone = 0, totalAll = 0;
for (const chunk of fs.readdirSync(path.join(L.DIR, "읽을거리")).filter((d) => !d.startsWith("표본-"))) {
  const ids = JSON.parse(fs.readFileSync(path.join(L.DIR, "읽을거리", chunk, "ids.json"), "utf8"));
  const f = path.join(L.DIR, `판정-${chunk}.json`);
  const st = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : { 줄: [], 표본: [], 문맥: [] };
  const done = st.줄.length;
  const times = st.줄.map((e) => toMin(e.배치)).filter((x) => !isNaN(x));
  const first = times.length ? Math.min(...times) : NaN;
  const last = times.length ? Math.max(...times) : NaN;
  const vf = path.join(L.DIR, `판정-${chunk}-확인.json`);
  const v = fs.existsSync(vf) ? JSON.parse(fs.readFileSync(vf, "utf8")) : null;
  const wrong = st.줄.filter((e) => e.판정 === "틀림").length;
  rows.push({ 조각: chunk, 판정: `${done}/${ids.reached.length}`, 틀림: wrong, 판단필요: st.줄.filter((e) => e.판정 === "판단 필요").length, 표본쪽: st.표본.length, 문맥: st.문맥.length,
    첫배치: isNaN(first) ? "-" : new Date(first * 60000).toISOString().slice(11, 16), 끝배치: isNaN(last) ? "-" : new Date(last * 60000).toISOString().slice(11, 16),
    확인: v ? `${v.결과.length}/${v.대상.length}` : "-" });
  totalDone += done; totalAll += ids.reached.length;
}
console.table(rows);
const mins = tn - t0;
const rate = mins > 0 ? (totalDone / mins) * 60 : 0;
console.log(`지금 ${nowStr} · ${SINCE} 부터 ${mins}분 · 판정 ${totalDone}/${totalAll} · 시간당 ${Math.round(rate)}줄 · 남은 ${totalAll - totalDone}줄 → 이 속도면 ${rate > 0 ? Math.round(((totalAll - totalDone) / rate) * 60) : "?"}분(1부만 · 표본 · 확인 뺌)`);
