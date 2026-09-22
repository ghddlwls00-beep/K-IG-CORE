#!/usr/bin/env node
/**
 * 6단계 작업 목록 — 검증을 통과한 교육 내용 지적 중 중간·낮음을 **자르지 않고** 내보낸다.
 *
 * 왜 새로 만들었나: summarise-content-findings.cjs 는 원문 160자·문제 300자·수정안 200자에서
 * 잘라 적는다(73~75줄). 4단계(심각·높음 88건) 때 수정 세션이 잘린 목록 때문에 원본을
 * 다시 찾아야 했다. 1,777건에서 그러면 안 된다.
 *
 * 살아남은 지적을 고르는 규칙은 summarise-content-findings.cjs 와 **같다**
 * (verification.survives 이고 표가 1개 이상). 그 스크립트의 표와 숫자가 같은지 끝에 대조한다.
 *
 *   node export-content-findings.cjs [--severity Medium,Low]
 *
 * 쓰는 파일 (저장소에 남긴다 — out/ 은 git 에 없으므로):
 *   docs/qa-2026-09-18/6단계-목록.json  — 기계용. 항목마다 고정 번호, 원본 위치(source·index)
 *   docs/qa-2026-09-18/6단계-목록.md    — 사람용. 사실 오류를 맨 앞에, 그다음 과정별
 *
 * 번호는 (과정 순서, 강의, 위치, 원본 파일, 원본 순번) 으로 정렬해 매긴다. 입력(out/ 의 검토
 * 결과)이 같으면 몇 번을 돌려도 같은 번호가 나온다.
 *
 * "감사 뒤에 바뀐 곳" 표시: 감사가 본 내용은 8325e10 커밋 시점이다. 그 뒤(커밋된 것 + 아직
 * 커밋 안 된 것)에 바뀐 강의 파일, 또는 VOCA 사전에서 뜻이 바뀐 낱말에 걸린 지적에 표시를
 * 단다. **이미 고쳐졌다는 뜻이 아니다** — 먼저 확인할 곳이라는 힌트일 뿐이다.
 */
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const HERE = __dirname;
const REPO = path.resolve(HERE, "../../..");
const OUT = path.join(HERE, "../out");
const DOCS = path.join(HERE, "..");
const BASELINE = "8325e10"; // 감사 문서 커밋 — 수정이 시작되기 전의 내용
const arg = (n, d) => (process.argv.includes(n) ? process.argv[process.argv.indexOf(n) + 1] : d);
const SEV = new Set(arg("--severity", "Medium,Low").split(","));

// ---- 살아남은 지적 (summarise-content-findings.cjs 와 같은 규칙)
const files = fs.readdirSync(OUT).filter((f) => /^content-review-.*\.json$/.test(f)).sort();
const all = [];
for (const f of files) {
  let j;
  try { j = JSON.parse(fs.readFileSync(path.join(OUT, f), "utf8")); } catch { continue; }
  (j.findings || []).forEach((x, i) => all.push({ ...x, _source: f, _index: i }));
}
const courseOf = (f) => {
  const s = `${f.lesson} ${f.file}`;
  if (/gh1-|grammar1/.test(s)) return "GRAMMAR I";
  if (/gh2-|grammar2/.test(s)) return "GRAMMAR II";
  if (/\bs\d+-\d|student/.test(s)) return "STUDENT";
  if (/\bd\d{3}|\/ld\/|ld_english/.test(s)) return "LISTENING";
  if (/pr\d{3}|reading/.test(s)) return "READING";
  if (/mv\d|hv-|voca|phonics/.test(s)) return "VOCA";
  return "기타";
};
const sev = (f) => (f.verification && f.verification.severity) || f.severity;
const votesOf = (f) => (f.verification && f.verification.votes) || [];
const survived = all.filter((f) => f.verification && f.verification.survives && votesOf(f).length);

// 소유자가 직접 맡기로 한 종류는 수정 세션의 목록에 넣지 않는다 (숫자만 따로 센다)
const OWNER_CATEGORIES = new Set(["copyright"]);

const COURSE_ORDER = ["LISTENING", "VOCA", "READING", "GRAMMAR I", "GRAMMAR II", "STUDENT", "기타"];
const picked = survived.filter((f) => SEV.has(sev(f)));
const owner = picked.filter((f) => OWNER_CATEGORIES.has(f.category));
const work = picked.filter((f) => !OWNER_CATEGORIES.has(f.category));

work.sort((a, b) =>
  COURSE_ORDER.indexOf(courseOf(a)) - COURSE_ORDER.indexOf(courseOf(b)) ||
  String(a.lesson).localeCompare(String(b.lesson), "en", { numeric: true }) ||
  String(a.locator).localeCompare(String(b.locator), "en", { numeric: true }) ||
  a._source.localeCompare(b._source) || a._index - b._index);

// ---- 감사 뒤에 바뀐 곳
const sh = (cmd) => execSync(cmd, { cwd: REPO, maxBuffer: 256 * 1024 * 1024 }).toString("utf8");
const changedFiles = new Set(sh(`git diff --name-only ${BASELINE} -- content`).split(/\r?\n/).filter(Boolean));
const dictThen = JSON.parse(sh(`git show ${BASELINE}:content/voca_dictionary.json`));
const dictNow = JSON.parse(fs.readFileSync(path.join(REPO, "content/voca_dictionary.json"), "utf8"));
const meaning = (d, w) => { const e = d[w]; return e == null ? null : typeof e === "string" ? e : e.meaning; };
const changedWords = new Set(Object.keys(dictNow).filter((w) => meaning(dictThen, w) !== meaning(dictNow, w)));
const lessonFile = (f) => {
  const c = courseOf(f);
  const folder = { LISTENING: "ld", VOCA: "phonics", READING: "reading", "GRAMMAR I": "grammar1", "GRAMMAR II": "grammar2", STUDENT: "student" }[c];
  const id = String(f.lesson || "").match(/[a-z]{1,3}\d?-?\d+(?:-\d+)*|d\d{3}(?:-1)?|pr\d{3}(?:-1)?/i);
  return folder && id ? `content/lessons/${folder}/${id[0].toLowerCase()}.json` : null;
};
const vocaWord = (f) => {
  // "grid row 3 col 4 'few'" · "'few'" · "few (수가) 적은" — 처음 나오는 따옴표 속 낱말, 없으면 원문 첫 낱말
  const q = String(f.locator || "").match(/'([A-Za-z][A-Za-z' -]*)'/) || String(f.original || "").match(/^\s*([A-Za-z][A-Za-z'-]*)/);
  return q ? q[1].toLowerCase().trim() : null;
};
function touched(f) {
  const hits = [];
  const c = courseOf(f);
  if (c === "VOCA") {
    const w = vocaWord(f);
    if (w && changedWords.has(w)) hits.push(`사전 뜻 바뀜: ${w}`);
  } else if (c === "LISTENING") {
    // 화면용 대본은 ld_english_scripts.json 하나에 모여 있다 — 파일 단위 표시는 의미가 없으므로 강의 파일만 본다
    const lf = lessonFile(f);
    if (lf && changedFiles.has(lf)) hits.push(`강의 파일 바뀜: ${lf}`);
  } else {
    const lf = lessonFile(f);
    if (lf && changedFiles.has(lf)) hits.push(`강의 파일 바뀜: ${lf}`);
    const pair = lf && lf.replace(/\.json$/, "-1.json");
    if (pair && changedFiles.has(pair)) hits.push(`짝 파일 바뀜: ${pair}`);
  }
  return hits;
}

// ---- 항목
const items = work.map((f, i) => ({
  id: `6-${String(i + 1).padStart(4, "0")}`,
  course: courseOf(f),
  severity: sev(f),
  category: f.category,
  lesson: f.lesson,
  file: f.file || null,
  locator: f.locator || null,
  original: f.original ?? null,
  problem: f.problem ?? null,
  correction: f.correction ?? null,
  votes: votesOf(f).map((v) => ({ verdict: v.verdict, severity: v.severity })),
  changedSinceAudit: touched(f),
  evidence: { source: `docs/qa-2026-09-18/out/${f._source}`, index: f._index },
}));

// ---- 대조: summarise-content-findings.cjs 와 같은 수인가
const count = (list, s) => list.filter((f) => sev(f) === s).length;
const tally = {};
for (const it of items) { tally[it.course] ||= { Medium: 0, Low: 0 }; tally[it.course][it.severity]++; }
const factual = items.filter((it) => it.category === "factual");

console.log(`검증 통과 전체 ${survived.length} · 이번 등급(${[...SEV].join("/")}) ${picked.length}`);
console.log(`  소유자 몫으로 뺀 것 ${owner.length} · 수정 세션 목록 ${items.length}`);
for (const s of SEV) console.log(`  ${s.padEnd(6)} ${count(picked, s)} (목록 ${items.filter((i) => i.severity === s).length})`);
for (const c of COURSE_ORDER) if (tally[c]) console.log(`  ${c.padEnd(10)} 중간 ${String(tally[c].Medium).padStart(3)} · 낮음 ${String(tally[c].Low).padStart(4)}`);
console.log(`  사실 오류(factual) ${factual.length} — 중간 ${factual.filter((i) => i.severity === "Medium").length} · 낮음 ${factual.filter((i) => i.severity === "Low").length}`);
console.log(`  감사 뒤에 바뀐 곳에 걸린 항목 ${items.filter((i) => i.changedSinceAudit.length).length} (먼저 확인할 곳 — 고쳐졌다는 뜻 아님)`);
const other = items.filter((i) => i.course === "기타");
for (const o of other) console.log(`  기타 항목: ${o.id} ${o.lesson} ${o.file || ""} ${o.locator || ""}`);

// ---- 파일 쓰기
const byCat = {};
for (const it of items) byCat[it.category] = (byCat[it.category] || 0) + 1;
const json = {
  generated: new Date().toISOString(),
  command: "node docs/qa-2026-09-18/scripts/export-content-findings.cjs",
  rule: "summarise-content-findings.cjs 와 같은 생존 규칙 (verification.survives && votes.length > 0)",
  baselineCommit: BASELINE,
  counts: { survivedAll: survived.length, picked: picked.length, ownerExcluded: owner.length, items: items.length, factual: factual.length, byCourse: tally, byCategory: byCat },
  items,
};
fs.writeFileSync(path.join(DOCS, "6단계-목록.json"), JSON.stringify(json, null, 1));

const esc = (s) => String(s ?? "").replace(/\r?\n+/g, " ").trim();
const md = [];
md.push("# 6단계 작업 목록 — 교육 내용 지적 중간·낮음 (자르지 않은 전문)");
md.push("");
md.push(`만든 명령: \`${json.command}\` · 만든 때: ${json.generated.slice(0, 16).replace("T", " ")} UTC`);
md.push(`같은 입력이면 같은 번호가 나온다. 기계용 목록은 [6단계-목록.json](6단계-목록.json).`);
md.push("");
md.push(`- 수정 세션 목록 **${items.length}건** (중간 ${items.filter((i) => i.severity === "Medium").length} · 낮음 ${items.filter((i) => i.severity === "Low").length})`);
md.push(`- 그중 **사실 오류 ${factual.length}건** — 맨 앞 §1 에 따로 모았다. 이것부터 한다.`);
md.push(`- "감사 뒤 바뀜" 표시가 붙은 항목은 4·5단계에서 그 파일이나 낱말이 이미 바뀐 곳이다. **고쳐졌다는 뜻이 아니다.** 먼저 지금 파일을 열어 확인할 곳이다.`);
md.push("");
md.push("| 과정 | 중간 | 낮음 | 합계 |");
md.push("|---|---|---|---|");
for (const c of COURSE_ORDER) if (tally[c]) md.push(`| ${c} | ${tally[c].Medium} | ${tally[c].Low} | ${tally[c].Medium + tally[c].Low} |`);
md.push("");
md.push("**유형별:** " + Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(" · "));
md.push("");
const render = (it) => {
  const flag = it.changedSinceAudit.length ? ` · ⚠ 감사 뒤 바뀜 (${it.changedSinceAudit.join(", ")})` : "";
  md.push(`### ${it.id} · [${it.severity}] ${it.course} ${esc(it.lesson)} · ${it.category}${flag}`);
  md.push(`- 위치: ${esc(it.locator)}${it.file ? ` · 파일: \`${esc(it.file)}\`` : ""}`);
  md.push(`- 원문: ${esc(it.original)}`);
  md.push(`- 문제: ${esc(it.problem)}`);
  md.push(`- 수정안: ${esc(it.correction)}`);
  md.push(`- 증거: \`${it.evidence.source}\` findings[${it.evidence.index}] (검증자 판정: ${it.votes.map((v) => `${v.verdict}/${v.severity}`).join(" · ")})`);
  md.push("");
};
md.push(`## 1. 사실 오류 ${factual.length}건 — 먼저`);
md.push("");
for (const it of factual) render(it);
for (const c of COURSE_ORDER) {
  const list = items.filter((i) => i.course === c && i.category !== "factual");
  if (!list.length) continue;
  md.push(`## ${c} — ${list.length}건 (사실 오류 제외)`);
  md.push("");
  for (const it of list) render(it);
}
fs.writeFileSync(path.join(DOCS, "6단계-목록.md"), md.join("\n"));
const kb = (p) => (fs.statSync(p).size / 1024).toFixed(0);
console.log(`\n→ 6단계-목록.json ${kb(path.join(DOCS, "6단계-목록.json"))}KB · 6단계-목록.md ${kb(path.join(DOCS, "6단계-목록.md"))}KB`);
