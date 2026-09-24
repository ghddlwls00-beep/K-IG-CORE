#!/usr/bin/env node
/**
 * BUG-011 · BUG-017 검사 — 사이트 검색창과 **같은 코드**(src/lib/searchMatch.ts)로 공개 색인을 검사한다.
 *
 *   node check-search.cjs                 지금 public/search-index.json
 *   node check-search.cjs --head          고치기 전 색인(대조군, 00c5df0 = 8114912 바로 전으로 고정) — CNN 120건이 있어 실패해야 정상
 *                                         (전에는 git HEAD 의 색인이라, 고친 색인이 커밋된 뒤로는 대조군이 PASS 였다 — 7-1 n)
 *   node check-search.cjs --index <파일>   일부러 깨뜨린 색인으로 이 검사가 실패하는지 볼 때
 *
 * 검사 (하나라도 어긋나면 exit 1):
 *   1. CNN 항목 0 (BUG-017 — 폐지된 과정)
 *   2. 유료 강의 본문 0줄 — 감사의 유출 규칙(scripts/paidLeakCheck.mjs, 색인 빌드가 쓰는 것과 같은 모듈).
 *      BUG-011 은 VOCA 낱말표를 이 공개 파일에 넣어 유료 VOCA 193강의 줄을 공개했고, 2026-09-23 소유자 결정으로
 *      뺐다(로그인한 사람만 쓰는 서버 검색으로 따로 만든다).
 *   3. 이름으로 찾는 검색("reading", "고등", "1강" …)의 결과가 고치기 전과 **똑같다**
 *      — 기준선은 커밋된 색인에서 일부러 뺀 CNN 만 걷어낸 것 + 예전 규칙.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { pathToFileURL } = require("url");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");

const HEAD = process.argv.includes("--head"); // 이름은 그대로(목록 · 명령서가 이 이름으로 부름) — 뜻은 '고치기 전 색인'
const PRE_FIX_REV = "00c5df0"; // 8114912(CNN 을 뺀 커밋) 바로 전 — 대조군
const indexArg = process.argv.indexOf("--index");
// 기준선(검사 3)은 '커밋된 색인' 그대로 — 뜻이 '지금 커밋된 내용에 예전 검색 규칙' 이라 옛 판이 아니다(대조군과 다름)
const headText = execSync("git show HEAD:public/search-index.json", { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 });
const text = HEAD
  ? execSync(`git show ${PRE_FIX_REV}:public/search-index.json`, { cwd: REPO, encoding: "utf8", maxBuffer: 64 << 20 })
  : fs.readFileSync(indexArg > 0 ? path.resolve(process.argv[indexArg + 1]) : path.join(REPO, "public/search-index.json"), "utf8");
const index = JSON.parse(text);

/** 예전 SearchDialog 규칙 그대로 (FUN-09 숫자 경계 포함) — 기준선에 쓴다. */
function oldTokenMatches(t, token) {
  const numeric = token.match(/^(\d+)(\D*)$/);
  if (!numeric) return t.includes(token);
  const number = String(parseInt(numeric[1], 10));
  const suffix = numeric[2].replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\D)0*${number}${suffix ? suffix : "(?!\\d)"}`).test(t);
}
function oldSearch(items, query, limit = 20) {
  const q = query.trim().toLowerCase();
  if (!q) return items.slice(0, 10);
  const tokens = q.split(/\s+/).filter(Boolean);
  return items.filter((it) => tokens.every((t) => oldTokenMatches(it.searchText, t))).slice(0, limit);
}
const search = HEAD ? oldSearch : loadTs(path.join(REPO, "src/lib/searchMatch.ts")).searchItems;
const baseline = JSON.parse(headText).filter((x) => x.course !== "cnn");

(async () => {
  const { findPaidLeaks } = await import(pathToFileURL(path.join(REPO, "scripts/paidLeakCheck.mjs")).href);
  const fails = [];
  // 1
  const cnn = index.filter((x) => x.course === "cnn").length;
  if (cnn) fails.push(`CNN 항목 ${cnn}`);
  // 2
  const leak = findPaidLeaks(text);
  if (leak.rows) fails.push(`유료 본문 ${leak.rows}줄 · ${leak.lessons}강 ${JSON.stringify(leak.byCourse)} (예: ${leak.hits.slice(0, 2).map((h) => `${h.course}/${h.id} ${h.text.slice(0, 40)}`).join(" · ")})`);
  // 3
  const NAV = ["reading", "listening", "grammar", "student", "voca", "고등", "중등 단어", "1강", "mv1", "hv", "s19-3", "수능 듣기", "패턴", "독해", "d150", "pr001", "gh1-006", "hospital"];
  const navDiff = NAV.filter((q) => JSON.stringify(search(index, q).map((x) => x.id)) !== JSON.stringify(oldSearch(baseline, q).map((x) => x.id)));
  if (navDiff.length) fails.push(`이름 검색 결과가 고치기 전과 다름: ${navDiff.join(", ")}`);

  console.log(`색인 ${HEAD ? `(고치기 전 ${PRE_FIX_REV} — 대조군)` : indexArg > 0 ? `(${path.basename(process.argv[indexArg + 1])})` : "(지금)"} · 항목 ${index.length} · 칸 ${[...new Set(index.flatMap((x) => Object.keys(x)))].join(",")}`);
  console.log(`1. CNN 항목: ${cnn}`);
  console.log(`2. 유료 강의 본문: ${leak.rows}줄 · ${leak.lessons}강 (유료 문자열 ${leak.needles}개 확인)`);
  console.log(`3. 이름 검색 ${NAV.length}개 중 결과가 고치기 전과 다른 것: ${navDiff.length}`);
  if (fails.length) { console.log(`\nFAIL\n - ${fails.join("\n - ")}`); process.exit(1); }
  console.log("\nPASS");
})();
