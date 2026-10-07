#!/usr/bin/env node
// integrate-b (2026-10-07 고침2): 점검 도구가 읽는 표지가 HEAD → 작업 트리에서 사라졌는지 본다(앱 파일은 읽기만).
//   센 것: data-* 속성 이름 · aria-label 글 · role · 도구가 읽는 글(이 강의 학습 완료 · 학습 완료 체크/취소 · 'N단계' · 서버에 저장됨 …).
//   node markers-diff.cjs            → 사라진 것 0 이면 exit 0
//   node markers-diff.cjs --break    → 작업 트리 글에서 'data-step-tab' 을 지운 셈 치고 돌림(실패해야 맞음)
const { execFileSync } = require("child_process");
const fs = require("fs");
const REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const BREAK = process.argv.includes("--break");
const git = (...a) => execFileSync("git", a, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
const files = [...git("diff", "--name-only", "HEAD", "--", "src").split("\n"), ...git("ls-files", "--others", "--exclude-standard", "--", "src").split("\n")].filter((f) => /\.(tsx?|css)$/.test(f));
const TOOL_TEXT = [
  "이 강의 학습 완료", "학습 완료 체크", "학습 완료 취소", "다음 강의", "이전 강의", "찾는 페이지가 없습니다",
  "서버에 저장됨", "진도를 서버와 맞추는 중", "5단계를 모두 마쳤어요", "5단계를 모두 마치면 완료할 수 있어요",
  "예문 떠올리기", "ALL-PASS ONLY", "STUDENT 패스 회원", "이용권 등록", "TOPIC", "을 마치면 열림", "1장을 마치면 열립니다",
  "학습 단계 이동", "강의 마치기", "단계 새로 풀기",
];
const count = (src, re) => { const m = new Map(); for (const x of src.matchAll(re)) m.set(x[1], (m.get(x[1]) || 0) + 1); return m; };
const scan = (src) => {
  const out = new Map();
  const add = (k, n) => out.set(k, (out.get(k) || 0) + n);
  for (const [k, n] of count(src, /\b(data-[a-z][a-z0-9-]*)/g)) add(k, n);
  for (const [k, n] of count(src, /aria-label=\{?["'`]([^"'`]+)["'`]/g)) add("aria-label:" + k, n);
  for (const [k, n] of count(src, /\brole=["']([a-z]+)["']/g)) add("role:" + k, n);
  // 공통 스위치 부품(Toggle.tsx 가 role="switch" · aria-checked 를 그림) — 쓰는 곳 하나 = 스위치 하나
  const toggles = (src.match(/<Toggle\b/g) || []).length;
  if (toggles) add("role:switch", toggles);
  for (const t of TOOL_TEXT) { const n = src.split(t).length - 1; if (n) add("text:" + t, n); }
  return out;
};
let lost = 0, gained = 0;
const rows = [];
for (const f of files) {
  let head = "";
  try { head = git("show", `HEAD:${f}`); } catch { head = ""; }
  let now = fs.existsSync(`${REPO}/${f}`) ? fs.readFileSync(`${REPO}/${f}`, "utf8") : "";
  if (BREAK && /StepTabs/.test(f)) now = now.replace(/data-step-tab/g, "data-x");
  const a = scan(head), b = scan(now);
  for (const [k, n] of a) { const m = b.get(k) || 0; if (m < n) { lost++; rows.push({ f, k, head: n, now: m }); } }
  for (const [k, n] of b) { const m = a.get(k) || 0; if (n > m) { gained++; rows.push({ f, k, head: m, now: n, gained: true }); } }
}
for (const r of rows) console.log(`${r.gained ? "+" : "-"} ${r.f} · ${r.k} · ${r.head} → ${r.now}`);
console.log(`files ${files.length} · 줄어든 표지 ${lost} · 늘어난 표지 ${gained}`);
process.exitCode = lost ? 1 : 0;
