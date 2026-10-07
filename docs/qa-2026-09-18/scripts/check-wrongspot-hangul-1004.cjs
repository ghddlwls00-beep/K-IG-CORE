#!/usr/bin/env node
/**
 * 틀린 곳 표시 · 해설 칸의 한국어 낱말 표기 — GRAMMAR II · PASS-OFF GRAMMAR, 운영 화면(회귀 점검 1002 단계 0 보충 · wrongspot-hangul ·
 * 2026-10-04. 같은 AI 계열이 만들고 점검함 — 독립 검수 아님).
 *
 * 왜: 2026-10-02 사장님 — 영어 문장 속 한국어 낱말은 화면에 한글만('부산'). GRAMMAR II · PASS-OFF 는 강의 파일이 영어 철자를 그대로 두고
 * 그리는 곳만 src/lib/koreanGloss.ts koreanOnScreen 을 거친다(채점은 romanForGrading 으로 되돌려 읽음). 단계 1 표본(gh2-033)에서
 * '틀린 곳 표시'(고칠 낱말 / 맞는 꼴 · 내 답 · 종합 평가 채점 뒤)에 로마자 'Busan' 이 나왔다 — 같은 표가 닿는 문항 전부를 본 도구가 없었다.
 *
 * 무엇을: 표(KOREAN_GLOSS_PAGES)가 닿는 문항 전부 — 문항의 답(모범 · 다른 정답 · PASS-OFF accept 중 하나라도)에 표의 철자가 든 것.
 *   GRAMMAR II(lib/expectations.cjs expected().answers): 1단계 '영작 훈련' 문항 칸 과 4단계 '종합 평가' 둘 다.
 *   PASS-OFF(lib/passoff-expect.cjs — 레슨 + 유료 보충 → viewBlocks): ④ 영작 · ⑤ 처음 보는 문장 카드(지금 표가 닿는 것은 모두 ④).
 * 문항마다 세 꼴의 답을 넣는다(base = 그 문항의 참조 답 중 표의 철자가 든 첫 것):
 *   ① 일부러 틀린 영어 답 — 한국어 낱말을 'Tokyo' 로(틀린 곳 표시가 '맞는 꼴' 로 그 낱말을 보여 주게)
 *   ② 한국어 낱말을 한글로 쓰고 다른 데를 틀린 답 — base 의 한글 꼴에서 마지막 영어 낱말(2글자 이상)을 뺌
 *   ③ 맞는 답 — ③a 한글 꼴(화면대로 베낀 답) · ③b 영어 철자(base 그대로). 둘 다 정답이어야.
 * 그때 화면 칸(GRAMMAR: [data-answer-panel] — 판정 · 내 답(틀린 곳 표시 '고칠 낱말 · 맞는 꼴') · 모범 답안 · 가장 가까운 정답 · 다른 정답 /
 *   종합 평가 [data-exam-result] — 배지 · 내 답 · 모범 답안 · 또는; PASS-OFF: 카드 — 판정 · 틀린 자리 줄 · 단서(첫 글자) · 낱말 카드 · 정답 · 내 답 → 맞는 꼴)
 *   에서 그 쪽 표의 로마자 철자가 몇 번 나오는지(lib/passoff-expect.cjs romanOnScreen — 낱말 단위 · 대소문자 그대로) · 'Busan(부산)' 꼴 수 ·
 *   ③ 이 정답인지 · 한글로 친 칸에 '한글이 섞여 있어요' 경고가 떴는지(PASS-OFF — 참고) 를 센다.
 * PASS-OFF 카드는 한 번 보일 때 첫 확인만 성적이 되고 틀리면 4문장 뒤 다시 나온다(src/lib/passoffLesson.ts MAX_REQUEUES 3) — 그래서
 *   첫째: ② → ① → 도움 받기(낱말 카드) → 정답 보기(내 답 → 맞는 꼴) / 다시 나옴: ① → ③b / 또 다시: ③a(첫 시도). 다른 카드는 영어 철자 모범 답으로 넘김.
 *
 * 판정(줄마다 = 과정 · 강의 · 문항 · 자리): 로마자 0 · 'X(한글)' 꼴 0 · ③a ③b 정답 · ① ② 는 정답이 아님 → PASS. 하나라도 어기면 FAIL.
 *   칸을 못 찾거나 단계를 못 끝내면 BLOCKED. 틀림은 틀림으로 그대로 적는다(고치지 않음 — 이 도구는 확인만).
 *
 *   node check-wrongspot-hangul-1004.cjs [--course grammar2|passoff-grammar] [--ids gh2-033,pg06-1] [--port 9875] [--clone rc1002-wrongspot-hangul]
 *        [--tag <결과 이름 꼬리>] [--keep-clone] [--dry-run] [--merge(이번에 안 돈 과정 · 쪽의 줄은 결과 파일에 있던 것 그대로 둠)]
 *   결과: out/wrongspot-hangul-1004[-<tag>].json (사본 이용권 · 데스크톱 1366×900 · 운영 https://k-ig-core.vercel.app — BASE 로 바꿈)
 *   다시 판정(브라우저 없음): node check-wrongspot-hangul-1004.cjs --rejudge out/wrongspot-hangul-1004.json [--course …] [--break=…]
 * 깨기:
 *   --break=expect-roman (--rejudge) 판정이 '로마자 0' 대신 '1 이상' 을 기대 → 지금 한글만인 줄이 FAIL(exit 1)
 *   --break=roman-inject (--rejudge) 판정이 받는 화면 글 사본마다 그 쪽 표의 첫 철자 'X(한글)' 을 끼움 → 모든 줄 FAIL(exit 1)
 *   --break=hangul-answer (운영 · 브라우저) ③a 의 한글 낱말을 표에 없는 '가나다' 로 → ③a 가 정답이 아니어서 그 줄 FAIL(exit 1)
 * exit: 0 = 모든 줄 PASS · 1 = FAIL 또는 BLOCKED(또는 할 일 0 · 깨기 자리 없음) · 2 = 잘못 부름
 *
 * 지킬 것: 이용권 코드 · PIN 타이핑 0 · /api/license/ · /api/admin/ 를 부르지 않음 · '이 강의 학습 완료' · '내 답도 맞아요' · 마이크 · 북마크 안 누름 ·
 *   원본 프로필은 열지 않음(lib/profile.cjs 사본만) · 이용권 값 · 요청 본문 · 쿠키를 찍지 않음.
 *   데이터: GRAMMAR 답은 이 사본의 localStorage 에만. PASS-OFF 답(틀린 답 포함)은 감사 이용권의 학습 기록(복습 · 오답노트)으로 서버에 쌓일 수
 *   있음 — 이용권 상태가 아님 · out/data-changes.jsonl 에 적음.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); if (i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--")) return argv[i + 1]; const eq = argv.find((a) => a.startsWith(`${n}=`)); return eq ? eq.slice(n.length + 1) : d; };
const has = (n) => argv.includes(n);

const BREAK = arg("--break", "");
const REJUDGE = arg("--rejudge", null);
const BREAKS_REJUDGE = ["expect-roman", "roman-inject"];
const BREAKS_LIVE = ["hangul-answer"];
if (BREAK && ![...BREAKS_REJUDGE, ...BREAKS_LIVE].includes(BREAK)) { console.error(`모르는 --break=${BREAK} (${[...BREAKS_REJUDGE, ...BREAKS_LIVE].join(" · ")})`); process.exit(2); }
if (BREAK && BREAKS_REJUDGE.includes(BREAK) && !REJUDGE) { console.error(`--break=${BREAK} 는 --rejudge <json> 과 함께(판정 쪽 깨기)`); process.exit(2); }
if (BREAK && BREAKS_LIVE.includes(BREAK) && REJUDGE) { console.error(`--break=${BREAK} 는 운영 브라우저 실행에서만`); process.exit(2); }

const COURSE_ARG = arg("--course", null);
if (COURSE_ARG && !["grammar2", "passoff-grammar"].includes(COURSE_ARG)) { console.error("--course 는 grammar2 · passoff-grammar"); process.exit(2); }
const COURSES = COURSE_ARG ? [COURSE_ARG] : ["grammar2", "passoff-grammar"];
const ONLY = arg("--ids", null) ? new Set(arg("--ids", "").split(",").map((s) => s.trim()).filter(Boolean)) : null;
const PORT = Number(arg("--port", 9875));
// 9930~9939: 운영 재확인 옆 세션 몫(2026-10-05 — 주 세션 스윕 9801~9804 와 겹치지 않게)
if (!((PORT >= 9875 && PORT <= 9879) || (PORT >= 9930 && PORT <= 9939))) { console.error("--port 는 9875~9879(이 일꾼 몫) 또는 9930~9939(재확인 옆 세션)"); process.exit(2); }
const CLONE = arg("--clone", "rc1002-wrongspot-hangul");
const TAG = arg("--tag", BREAK ? `break-${BREAK}` : null);
const OUT = path.join(__dirname, "../out");
const DEST = path.join(OUT, TAG ? `wrongspot-hangul-1004-${TAG}.json` : "wrongspot-hangul-1004.json");
const TOOL_REV = "wrongspot-1004a";

const E = require("./lib/expectations.cjs");
const P = require("./lib/passoff-expect.cjs");
const { loadTs, REPO } = require("../../qa-2026-09-15/scripts/tsload.cjs");
const KG = loadTs(path.join(REPO, "src/lib/koreanGloss.ts"));
if (typeof KG.koreanOnScreen !== "function" || typeof KG.romanForGrading !== "function" || !KG.KOREAN_GLOSS_PAGES) {
  console.error("koreanGloss.ts 를 불러오지 못함 — 빈 표로 통과하지 않게 멈춤");
  process.exit(1);
}

const norm = (s) => String(s == null ? "" : s).replace(/\s+/g, " ").trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const spellingsOf = (key) => (KG.KOREAN_GLOSS_PAGES[key] || []).map(([w]) => w).sort((a, b) => b.length - a.length);
const hasSpelling = (key, text) => KG.koreanOnScreen(key, text) !== text;

// ------------------------------------------------------------------ the three answers
function replaceKorean(key, text, by) {
  const sp = spellingsOf(key);
  if (!sp.length) return text;
  return text.replace(new RegExp(`(^|[^A-Za-z0-9])(${sp.map(esc).join("|")})(?![A-Za-z0-9])`, "g"), (_m, b) => `${b}${by}`);
}
// the app's own graders, to make sure ① and ② are WRONG before they are typed (a word left out can still be an accepted answer —
// pg13-1 'as 이순신' without 'Admiral' is one of its 167). The verdict that counts is still the one read off the screen.
const GG = loadTs(path.join(REPO, "src/lib/grammarGrading.ts"));
const PG = loadTs(path.join(REPO, "src/lib/passoffGrading.ts"));
if (typeof GG.gradeAgainstReferences !== "function" || typeof PG.gradeProduce !== "function" || typeof PG.isCorrect !== "function") { console.error("채점 함수를 불러오지 못함 — 멈춤"); process.exit(1); }
const offlineRight = (key, text, ctx) => {
  const asGraded = KG.romanForGrading(key, text);
  if (ctx.course === "grammar2") return GG.gradeAgainstReferences(asGraded, ctx.refs) === "exact";
  return PG.isCorrect(PG.gradeProduce(asGraded, ctx.item));
};
function formsOf(key, base, ctx) {
  const hangul = KG.koreanOnScreen(key, base);
  const wrongEn = replaceKorean(key, base, "Tokyo");
  // ②: the Hangul form with one English word (2+ letters) left out — the last such word whose loss the grader does not accept
  const toks = hangul.split(" ");
  let wrongHangul = null;
  for (let k = toks.length - 1; k >= 0 && !wrongHangul; k--) {
    if (!/[A-Za-z]{2,}/.test(toks[k]) || /[가-힣]/.test(toks[k])) continue;
    const punct = (toks[k].match(/[.?!]+$/) || [""])[0];
    const rest = toks.filter((_, i) => i !== k);
    if (punct && k === toks.length - 1 && rest.length) rest[rest.length - 1] = rest[rest.length - 1].replace(/[.?!,]*$/, "") + punct;
    const cand = rest.join(" ");
    if (!offlineRight(key, cand, ctx)) wrongHangul = cand;
  }
  const rightHangul = BREAK === "hangul-answer" ? hangul.replace(/[가-힣]+/, "가나다") : hangul;
  const forms = { "①": wrongEn, "②": wrongHangul || hangul, "③a": rightHangul, "③b": base };
  const offline = { "①": offlineRight(key, wrongEn, ctx), "②": wrongHangul ? false : true, "③a": offlineRight(key, rightHangul, ctx), "③b": offlineRight(key, base, ctx) };
  return { forms, offline };
}
const FORM_NAMES = { "①": "틀린 영어(한국어 낱말 → Tokyo)", "②": "한글 + 다른 데 틀림", "③a": "맞는 답 · 한글", "③b": "맞는 답 · 영어 철자" };

// ------------------------------------------------------------------ targets
function grammarTargets() {
  const out = [];
  for (const p of E.pages("grammar2")) {
    if (ONLY && !ONLY.has(p.id)) continue;
    const key = `grammar2/${p.id}`;
    if (!KG.KOREAN_GLOSS_PAGES[key]) continue;
    const exp = E.expected("grammar2", p.id);
    const items = exp.answers
      .map((a) => ({ a, refs: [a.text, ...(a.alternatives || [])] }))
      .filter((x) => x.refs.some((t) => hasSpelling(key, t)))
      .map((x) => { const base = x.refs.find((t) => hasSpelling(key, t)); const fo = formsOf(key, base, { course: "grammar2", refs: x.refs }); return { n: String(x.a.n), itemId: `${p.id}#${x.a.n}`, base, model: x.a.text, forms: fo.forms, offline: fo.offline }; });
    if (items.length) out.push({ course: "grammar2", id: p.id, url: p.url, key, items });
  }
  return out;
}
function passoffTargets() {
  const out = [];
  for (const p of P.pages()) {
    if (ONLY && !ONLY.has(p.id)) continue;
    const key = `passoff-grammar/${p.id}`;
    if (!KG.KOREAN_GLOSS_PAGES[key]) continue;
    const exp = P.expectedPassoff(p.id, { licensed: true });
    const items = [];
    for (const [step, list] of [[4, exp.produce], [5, exp.transfers]]) {
      for (const it of list) {
        const refs = [it.en, ...(it.accept || [])];
        const base = refs.find((t) => hasSpelling(key, t));
        if (!base) continue;
        const fo = formsOf(key, base, { course: "passoff-grammar", item: it });
        items.push({ n: it.id, itemId: it.id, step, base, model: it.en, viaAccept: base !== it.en, forms: fo.forms, offline: fo.offline });
      }
    }
    if (items.length) out.push({ course: "passoff-grammar", id: p.id, url: p.url, key, items, exp });
  }
  return out;
}

// ------------------------------------------------------------------ judge (also used by --rejudge)
const PLACE = { g1: "1단계 영작 훈련", g4: "4단계 종합 평가", p4: "④ 영작", p5: "⑤ 처음 보는 문장" };
function judgeRow(row, brk = null) {
  const key = row.key;
  const own = (KG.KOREAN_GLOSS_PAGES[key] || [])[0] || ["Busan", "부산"];
  let roman = 0, bracket = 0;
  const hits = [];
  for (const c of row.checks || []) {
    const regionsWithHits = [];
    const textOf = (t) => (brk === "roman-inject" ? `${t || ""} ${own[0]}(${own[1]})` : t || "");
    const found = P.romanOnScreen(key, textOf(c.text));
    for (const [region, rt] of Object.entries(c.regions || {})) if (rt && P.romanOnScreen(key, textOf(rt)).length) regionsWithHits.push(region);
    for (const h of found) {
      if (h.kind === "romanized") roman++; else bracket++;
      hits.push({ at: c.label, form: c.form, kind: h.kind, text: h.text, regions: regionsWithHits });
    }
  }
  const byForm = (f) => (row.checks || []).filter((c) => c.form === f && c.graded);
  const okOf = (f) => { const cs = byForm(f); return cs.length ? cs.every((c) => c.ok === true) : null; };
  const correctHangul = okOf("③a"), correctEnglish = okOf("③b");
  const wrongAccepted = ["①", "②"].filter((f) => byForm(f).some((c) => c.ok === true));
  const problems = [];
  if (row.blocked) problems.push(`BLOCKED: ${row.blocked}`);
  for (const f of ["①", "②", "③a", "③b"]) if (!byForm(f).length) problems.push(`BLOCKED: ${f} 를 넣고 판정을 읽지 못함`);
  if (brk === "expect-roman") { if (roman === 0) problems.push("(깨기 expect-roman) 로마자 1 이상을 기대했는데 0"); }
  else if (roman > 0) problems.push(`로마자 한국어 낱말 ${roman}번 (${[...new Set(hits.filter((h) => h.kind === "romanized").map((h) => `${h.at}: …${h.text}…`))].slice(0, 3).join(" / ")})`);
  if (bracket > 0) problems.push(`'X(한글)' 꼴 ${bracket}번`);
  if (correctHangul === false) problems.push("③a 한글로 쓴 맞는 답이 정답이 아님");
  if (correctEnglish === false) problems.push("③b 영어 철자 맞는 답이 정답이 아님");
  if (wrongAccepted.length) problems.push(`${wrongAccepted.join(" · ")} 틀린 답이 정답으로 처리됨(도구가 틀린 답을 못 만든 것 — 확인)`);
  const blocked = problems.some((p) => p.startsWith("BLOCKED"));
  const status = blocked ? "BLOCKED" : problems.length ? "FAIL" : "PASS";
  return { status, roman, bracket, correctHangul, correctEnglish, hangulWarn: (row.checks || []).filter((c) => c.hangulWarn).length, hits, problems };
}
function summarise(rows) {
  const out = {};
  for (const r of rows) {
    const s = (out[r.course] ||= { rows: 0, PASS: 0, FAIL: 0, BLOCKED: 0, roman: 0, bracket: 0, rowsWithRoman: 0, hangulRight: 0, englishRight: 0, hangulWarn: 0, byPlace: {} });
    const j = r.judge;
    s.rows++; s[j.status]++; s.roman += j.roman; s.bracket += j.bracket; if (j.roman) s.rowsWithRoman++;
    if (j.correctHangul) s.hangulRight++; if (j.correctEnglish) s.englishRight++; s.hangulWarn += j.hangulWarn;
    const b = (s.byPlace[r.place] ||= { rows: 0, roman: 0, rowsWithRoman: 0, PASS: 0, FAIL: 0, BLOCKED: 0 });
    b.rows++; b.roman += j.roman; if (j.roman) b.rowsWithRoman++; b[j.status]++;
  }
  return out;
}
function printRows(rows) {
  console.log("\n과정 · 강의 · 문항 · 자리 · 로마자 노출 N · X(한글) 꼴 · 맞는 답(③a 한글 / ③b 영어) · 판정");
  for (const r of rows) {
    const j = r.judge;
    const yn = (v) => (v === true ? "✓" : v === false ? "✗" : "?");
    console.log(`${r.course} · ${r.id} · ${r.item} · ${r.place} · 로마자 ${j.roman} · 꼴 ${j.bracket} · ③a ${yn(j.correctHangul)} / ③b ${yn(j.correctEnglish)} · ${j.status}${j.problems.length ? ` — ${j.problems[0].slice(0, 140)}` : ""}`);
  }
}
function finish(rows, extra) {
  const summary = summarise(rows);
  printRows(rows);
  const counts = rows.reduce((a, r) => ((a[r.judge.status] = (a[r.judge.status] || 0) + 1), a), {});
  console.log(`\n줄 ${rows.length} — ${JSON.stringify(counts)}`);
  for (const [c, s] of Object.entries(summary)) {
    console.log(`  ${c}: 줄 ${s.rows} · PASS ${s.PASS} · FAIL ${s.FAIL} · BLOCKED ${s.BLOCKED} · 로마자 ${s.roman}번(줄 ${s.rowsWithRoman}) · X(한글) 꼴 ${s.bracket} · ③a 정답 ${s.hangulRight}/${s.rows} · ③b 정답 ${s.englishRight}/${s.rows}${c === "passoff-grammar" ? ` · 한글 경고 ${s.hangulWarn}` : ""}`);
    for (const [pl, b] of Object.entries(s.byPlace)) console.log(`     ${pl}: 줄 ${b.rows} · 로마자 ${b.roman}번(줄 ${b.rowsWithRoman}) · PASS ${b.PASS} · FAIL ${b.FAIL} · BLOCKED ${b.BLOCKED}`);
  }
  if (extra && extra.dest) console.log(`\n→ ${extra.dest}`);
  const bad = !rows.length || counts.FAIL || counts.BLOCKED || (extra && extra.breakMissing);
  return { summary, counts, exit: bad ? 1 : 0 };
}

// ------------------------------------------------------------------ --rejudge
if (REJUDGE) {
  const src = JSON.parse(fs.readFileSync(path.resolve(REJUDGE), "utf8"));
  const rows = (src.rows || []).filter((r) => COURSES.includes(r.course) && (!ONLY || ONLY.has(r.id))).map((r) => ({ ...r, judge: judgeRow(r, BREAK || null) }));
  console.log(`다시 판정: ${REJUDGE} (${src.at}) · 줄 ${rows.length}${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
  const changed = rows.filter((r) => { const was = (src.rows || []).find((x) => x.rowKey === r.rowKey); return was && was.judge && was.judge.status !== r.judge.status; }).length;
  const res = finish(rows, null);
  console.log(`기록 때 판정과 다른 줄: ${changed}`);
  process.exit(res.exit);
}

// ------------------------------------------------------------------ targets (dry run)
const targets = [...(COURSES.includes("grammar2") ? grammarTargets() : []), ...(COURSES.includes("passoff-grammar") ? passoffTargets() : [])];
const nItems = targets.reduce((a, t) => a + t.items.length, 0);
console.log(`대상: 쪽 ${targets.length} · 문항 ${nItems}(GRAMMAR II ${targets.filter((t) => t.course === "grammar2").reduce((a, t) => a + t.items.length, 0)} · PASS-OFF ${targets.filter((t) => t.course === "passoff-grammar").reduce((a, t) => a + t.items.length, 0)})`);
if (has("--dry-run")) {
  for (const t of targets) for (const it of t.items) {
    console.log(`${t.course}/${t.id} ${it.n}${it.viaAccept ? " (accept)" : ""}: ${it.base}`);
    for (const [f, v] of Object.entries(it.forms)) console.log(`   ${f} ${FORM_NAMES[f]}: ${v}  (앱 채점기로 미리: ${it.offline[f] ? "정답" : "오답"})`);
  }
  process.exit(targets.length ? 0 : 1);
}
if (!targets.length) { console.error("할 일 0 — 표가 닿는 문항이 없음(또는 --ids 가 틀림)"); process.exit(1); }

// ------------------------------------------------------------------ browser
const H = require("./lib/harness.cjs");

async function waitMemory() {
  for (let i = 0; i < 60; i++) {
    const free = os.freemem();
    if (free >= 1024 * 1024 * 1024) return free;
    console.log(`남은 메모리 ${Math.round(free / 1048576)}MB < 1GB — 1분 기다림 (${i + 1})`);
    await H.sleep(60000);
  }
  throw new Error("남은 메모리가 한 시간 동안 1GB 아래 — 멈춤");
}

async function resolveRedirect(url) {
  for (let hop = 0, cur = H.BASE + url; hop < 5; hop++) {
    const r = await fetch(cur, { redirect: "manual" }).catch(() => null);
    if (!r) return url;
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { cur = new URL(r.headers.get("location"), cur).href; continue; }
    return new URL(cur).pathname;
  }
  return url;
}

const T = (el) => `(${el} ? (${el}.innerText || '').replace(/\\s+/g, ' ').trim() : '')`;

// ---- GRAMMAR II
// every bundle of ten is in the page, the others `hidden` (GrammarLearningView ol[data-set]) — the box on screen only
const G_BOX = (n) => `[...document.querySelectorAll('main [aria-label="${n}번 영작 답안"]')].find((el) => el.getClientRects().length > 0) || null`;
const G_NEXT_SET = `[...document.querySelectorAll('main [data-set-next]')].find((el) => el.getClientRects().length > 0) || null`;
const G_PANEL = (n) => `(() => { const box = ${G_BOX(n)}; const li = box && box.closest('li'); if (!li) return null; const q = (s) => li.querySelector(s);
  const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : '';
  const panel = q('[data-answer-panel]'); const v = q('[data-verdict]');
  return { text: t(panel), regions: { verdict: t(v), diff: t(q('[data-diff]')), model: t(q('[data-model]')), closest: t(q('[data-closest]')), alts: t(q('[data-alts]')) }, verdict: v ? v.getAttribute('data-verdict') : null, typed: box.value }; })()`;
const G_FILL = (pairs) => `(() => { const pairs = ${JSON.stringify(pairs)}; let filled = 0; const missing = [];
  for (const [n, value] of pairs) { const el = document.querySelector('main [aria-label=' + JSON.stringify(n + '번 시험 답안') + ']'); if (!el) { missing.push(n); continue; }
    const proto = el instanceof HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, value); el.dispatchEvent(new Event('input', { bubbles: true })); filled++; }
  return { filled, missing }; })()`;
const G_NEW = `document.querySelector('main [data-exam-action="new"]')`;
const G_SUBMIT = `(document.querySelector('main [data-exam-submit]') || [...document.querySelectorAll('main button')].find((b) => /전체 시험 채점하기/.test(b.innerText || '')))`;
const G_EXAM_ROW = (n) => `(() => { const li = document.querySelector('main li[data-exam-row][data-item="${n}"]'); if (!li) return null; const q = (s) => li.querySelector(s);
  const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : '';
  const res = q('[data-exam-result]'); const badge = q('[data-badge]'); const box = q('[aria-label$="번 시험 답안"]');
  return { text: t(res), regions: { badge: t(badge), diff: t(q('[data-diff]')), model: t(q('[data-model]')), alts: t(q('[data-alts]')) }, verdict: badge ? badge.getAttribute('data-badge') : null, typed: box ? box.value : null }; })()`;

async function driveGrammar(tab, page, rows) {
  const finalPath = await resolveRedirect(page.url);
  const key = `grammar2/${finalPath.split("/").pop()}`;
  const mk = (it, placeKey) => {
    const r = { rowKey: `${page.course}/${page.id}#${it.n}@${placeKey}`, course: page.course, id: page.id, url: page.url, finalPath, key, item: `${it.n}번`, place: PLACE[placeKey], base: it.base, forms: it.forms, offline: it.offline, checks: [], blocked: null };
    rows.push(r);
    return r;
  };
  const r1 = new Map(page.items.map((it) => [it.n, mk(it, "g1")]));
  const r4 = new Map(page.items.map((it) => [it.n, mk(it, "g4")]));
  const loaded = await H.load(tab, page.url, { marker: H.MARKERS.grammar2, expectPath: finalPath !== page.url ? finalPath : null });
  if (!loaded.rendered) { for (const r of [...r1.values(), ...r4.values()]) r.blocked = `쪽이 뜨지 않음 (${loaded.href})`; return; }

  // Step 1 — 영작 훈련
  const s1 = await H.click(tab, `document.querySelector('main [data-step-tab="1"]')`, { settle: 700 });
  for (const it of page.items) {
    const row = r1.get(it.n);
    if (!s1.ok) { row.blocked = `1단계 탭을 못 누름: ${s1.reason}`; continue; }
    let found = await tab.eval(`!!${G_BOX(it.n)}`).catch(() => false);
    for (let k = 0; !found && k < 12; k++) {
      const nx = await H.click(tab, G_NEXT_SET, { settle: 600 });
      if (!nx.ok) break;
      found = await tab.eval(`!!${G_BOX(it.n)}`).catch(() => false);
    }
    if (!found) { row.blocked = `${it.n}번 영작 답안 칸을 못 찾음(묶음을 넘겨도)`; continue; }
    for (const f of ["①", "②", "③a", "③b"]) {
      const typed = it.forms[f];
      const ok = await H.type(tab, G_BOX(it.n), typed);
      if (!ok) { row.checks.push({ form: f, label: `1단계 ${f}`, typed, graded: false, note: "칸에 못 씀" }); continue; }
      await H.sleep(150);
      const c = await H.click(tab, `document.querySelector('main button[aria-label="${it.n}번 확인"]')`, { settle: 450 });
      const cap = c.ok ? await tab.eval(G_PANEL(it.n)).catch(() => null) : null;
      const graded = !!(cap && cap.verdict && norm(cap.typed) === norm(typed));
      row.checks.push({ form: f, label: `1단계 ${f} 확인 뒤`, typed, graded, ok: graded ? cap.verdict === "exact" : null, verdict: cap ? cap.verdict : null, text: cap ? cap.text : "", regions: cap ? cap.regions : {}, note: c.ok ? (graded ? "" : "판정 칸 없음") : `확인 단추: ${c.reason}` });
    }
  }

  // Step 4 — 종합 평가
  const s4 = await H.click(tab, `document.querySelector('main [data-step-tab="4"]')`, { settle: 800 });
  if (!s4.ok) { for (const r of r4.values()) r.blocked = `4단계 탭을 못 누름: ${s4.reason}`; return; }
  for (const f of ["①", "②", "③a", "③b"]) {
    await H.click(tab, G_NEW, { settle: 400 }).catch(() => {});
    const pairs = page.items.map((it) => [it.n, it.forms[f]]);
    const fill = await tab.eval(G_FILL(pairs)).catch((e) => ({ filled: 0, missing: [], error: e.message }));
    const sub = fill.filled ? await H.click(tab, G_SUBMIT, { settle: 1000 }) : { ok: false, reason: `칸 입력 0 (${fill.error || fill.missing.join(",")})` };
    for (const it of page.items) {
      const row = r4.get(it.n);
      const typed = it.forms[f];
      const cap = sub.ok ? await tab.eval(G_EXAM_ROW(it.n)).catch(() => null) : null;
      const graded = !!(cap && cap.verdict && norm(cap.typed) === norm(typed));
      row.checks.push({ form: f, label: `4단계 ${f} 채점 뒤`, typed, graded, ok: graded ? cap.verdict === "exact" : null, verdict: cap ? cap.verdict : null, text: cap ? cap.text : "", regions: cap ? cap.regions : {}, note: sub.ok ? (graded ? "" : "배지 없음 · 칸 글 다름") : `채점: ${sub.reason}` });
    }
  }
  H.logDataChange({ what: "GRAMMAR II 영작 훈련 · 종합 평가 답(일부러 틀린 답 포함)", where: `${page.course}/${page.id} localStorage (사본 rc1002 ${CLONE})`, why: "틀린 곳 표시의 한국어 낱말 표기 확인(check-wrongspot-hangul-1004)", reversible: "사본 브라우저의 localStorage — 방문마다 지움 · 사본은 끝나고 지움" });
}

// ---- PASS-OFF
const STEP = (n) => `document.querySelector('main [data-passoff-view] section[aria-labelledby="passoff-step-${n}"]')`;
const CARD = (n) => `(() => { const s = ${STEP(n)}; return s ? [...s.querySelectorAll('section')].find((x) => /rounded-card/.test(x.className) && !x.hasAttribute('aria-labelledby') && !x.hasAttribute('aria-live') && (x.querySelector('textarea, input[aria-label="답"], [aria-label="낱말 고르기"], [aria-label="보기"], [aria-label="낱말 카드"]') || [...x.querySelectorAll('button')].some((b) => /^(다음|다음 문장)$/.test((b.innerText || '').trim())))) || null : null; })()`;
const BTN_IN = (scopeExpr, re) => `(() => { const s = ${scopeExpr}; if (!s) return null; return [...s.querySelectorAll('button')].find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ').trim()) && !!(b.offsetParent || b.getClientRects().length)) || null; })()`;
const P_CAP = (n) => `(() => { const c = ${CARD(n)}; if (!c) return null; const t = (el) => el ? (el.innerText || '').replace(/\\s+/g, ' ').trim() : '';
  const ps = [...c.querySelectorAll('p')];
  return { text: t(c), regions: {
      diff: [...c.querySelectorAll('p.flex-wrap')].map(t).join(' / '),
      hint: t(c.querySelector('p.font-mono')),
      tiles: [t(c.querySelector('[aria-label="만든 문장"]')), t(c.querySelector('[aria-label="낱말 카드"]'))].filter(Boolean).join(' / '),
      answer: [...c.querySelectorAll('p[lang=en].font-semibold')].map(t).join(' / '),
      verdict: ps.map(t).filter((x) => /맞았어요|틀린 자리를 표시했어요|한글이 섞여|정답을 확인하세요|한 번 더/.test(x)).join(' / '),
      other: ps.filter((p) => !p.matches('p.flex-wrap, p.font-mono, p[lang=en].font-semibold')).map(t).filter((x) => !/맞았어요|틀린 자리를 표시했어요/.test(x)).join(' / ') },
    hasBox: !!c.querySelector('textarea[aria-label="영작 답"]'), typed: (c.querySelector('textarea[aria-label="영작 답"]') || {}).value || null }; })()`;
const verdictOf = (text) => (/맞았어요/.test(text) ? "right" : /한 번 더 해 보세요|틀린 자리를 표시했어요|정답을 확인하세요|다시 골라 보세요/.test(text) ? "wrong" : /한글이 섞여 있어요/.test(text) ? "hangul" : "none");

async function cardText(tab, n) { return (await tab.eval(`(() => { const c = ${CARD(n)}; return c ? c.innerText : null; })()`).catch(() => null)) || ""; }
async function waitCard(tab, n, re, ms = 3000) {
  const end = Date.now() + ms; let t = "";
  while (Date.now() < end) { t = await cardText(tab, n); if (re.test(t)) return t; await H.sleep(120); }
  return t;
}

async function drivePassoff(tab, page, rows) {
  const exp = page.exp;
  const key = page.key;
  const byId = new Map(page.items.map((it) => {
    const r = { rowKey: `${page.course}/${page.id}#${it.itemId}@p${it.step}`, course: page.course, id: page.id, url: page.url, finalPath: page.url, key, item: it.itemId, place: PLACE[`p${it.step}`], base: it.base, viaAccept: it.viaAccept, forms: it.forms, offline: it.offline, checks: [], blocked: null };
    rows.push(r);
    return [it.itemId, { it, row: r, phase: 0 }];
  }));
  const loaded = await H.load(tab, page.url, { marker: H.MARKERS["passoff-grammar"] });
  if (!loaded.rendered) { for (const x of byId.values()) x.row.blocked = `쪽이 뜨지 않음 (${loaded.href})`; return; }
  await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000);
  const steps = [...new Set(page.items.map((it) => it.step))];
  for (const n of steps) {
    const items = n === 4 ? exp.produce : exp.transfers;
    const tabClick = await H.click(tab, `document.querySelector('main [data-passoff-view] [data-step-tab="${n}"]')`, { settle: 700 });
    if (!tabClick.ok) { for (const x of byId.values()) if (x.it.step === n) x.row.blocked = `${n}단계 탭을 못 누름: ${tabClick.reason}`; continue; }
    const pending = () => [...byId.values()].filter((x) => x.it.step === n && x.phase < 3 && !x.row.blocked);
    let idle = 0;
    for (let guard = 0; guard < items.length * 8 + 30 && pending().length; guard++) {
      const area = `(${CARD(n)} || document).querySelector('textarea[aria-label="영작 답"]')`;
      const check = async () => { await H.click(tab, BTN_IN(CARD(n), "/^(다시 )?확인$/"), { settle: 450 }); };
      const cap = async (x, form, label, extra = {}) => {
        const c = await tab.eval(P_CAP(n)).catch(() => null);
        const v = c ? verdictOf(c.text) : "none";
        // 'hangul' after 확인 = the app refused to grade the answer ('한글이 섞여 있어요') — for a Hangul form that is "not accepted"
        const graded = !!form && ["right", "wrong", "hangul"].includes(v);
        x.row.checks.push({ form, label, typed: form ? x.it.forms[form] : null, graded, ok: graded ? v === "right" : null, verdict: v, text: c ? c.text : "", regions: c ? c.regions : {}, ...extra });
        return v;
      };
      const stepText = await tab.eval(`(${STEP(n)} || {}).innerText || ''`).catch(() => "");
      const card = await tab.eval(`(() => { const c = ${CARD(n)}; if (!c) return null; return { text: c.innerText, ko: [...c.querySelectorAll('p')].map((p) => (p.innerText || '').replace(/\\s+/g, ' ').trim()), answer: !!c.querySelector('textarea'), next: [...c.querySelectorAll('button')].some((b) => (b.innerText || '').trim() === '다음 문장') }; })()`).catch(() => null);
      if (!card) {
        if (n === 4 && /다음 세트/.test(stepText)) { await H.click(tab, BTN_IN(STEP(4), "/^다음 세트$/"), { settle: 500 }); continue; }
        // UI검토-1007 17 (2026-10-08): Step 5's line is 'Step 1~5를 모두 마쳤어요' (it was '5단계를 모두 마쳤어요' — kept for an old build)
        if (/다음 단계: 마무리|Step 1~5를 모두 마쳤어요|5단계를 모두 마쳤어요/.test(stepText)) break;
        if (++idle > 25) break;
        await H.sleep(300); continue;
      }
      idle = 0;
      const match = (p) => card.ko.includes(norm(p.ko)) && (!p.promptEn || card.ko.includes(norm(exp.gloss(p.promptEn))));
      const item = items.find((p) => match(p) && (!byId.has(p.id) || byId.get(p.id).phase < 3)) || items.find(match);
      if (!item) { for (const x of pending()) x.row.blocked = `모르는 카드: ${norm(card.text).slice(0, 80)}`; break; }
      const x = byId.get(item.id);
      if (!card.answer) {
        // a card left on its result or on the tiles: take the answer and go on
        if (!card.next) await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 300 });
        await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 400 });
        continue;
      }
      if (!x || x.phase >= 3) {
        // not a target (or a target already done that came back): the lesson's spelling, then on
        await H.type(tab, area, item.en); await H.sleep(80); await check();
        if (verdictOf(await waitCard(tab, n, /맞았어요|틀린 자리를 표시했어요/)) !== "right") {
          for (let k = 0; k < 4; k++) { if ((await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 250 })).ok) break; await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 250 }); }
        }
        await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 400 });
        continue;
      }
      const typeForm = async (form) => {
        await H.type(tab, area, x.it.forms[form]);
        await H.sleep(150);
        // the warning a Hangul answer shows under the box BEFORE it is checked (it is graded through romanForGrading all the same)
        return /[가-힣]/.test(x.it.forms[form]) ? /한글이 섞여 있어요/.test(await cardText(tab, n)) : false;
      };
      if (x.phase === 0) {
        // first showing: ② then ① (the card climbs to rung 2), the word tiles, then '정답 보기' (내 답 → 맞는 꼴)
        let warn = await typeForm("②"); await check();
        await cap(x, "②", "첫째 ② 확인 뒤(틀린 자리 · 도움 1)", { hangulWarn: warn });
        if (await tab.eval(`!!${area}`).catch(() => false)) {
          await typeForm("①"); await check();
          await cap(x, "①", "첫째 ① 확인 뒤(틀린 자리 · 단서 · 도움 2)");
          const up = await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 450 });
          await cap(x, null, `첫째 도움 받기 뒤(낱말 카드)${up.ok ? "" : ` — 못 누름 ${up.reason}`}`);
          const rv = await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 450 });
          await cap(x, null, `첫째 정답 보기 뒤(내 답 → 맞는 꼴)${rv.ok ? "" : ` — 못 누름 ${rv.reason}`}`);
        }
        x.phase = 1;
      } else if (x.phase === 1) {
        // second showing: ① again (so this showing is not a first-try success), then ③b
        await typeForm("①"); await check();
        await cap(x, "①", "둘째 ① 확인 뒤(도움 1)");
        if (await tab.eval(`!!${area}`).catch(() => false)) {
          await typeForm("③b"); await check(); await waitCard(tab, n, /맞았어요/, 1500);
          await cap(x, "③b", "둘째 ③b 확인 뒤");
        }
        x.phase = 2;
      } else {
        // third showing: ③a on the first try
        const warn = await typeForm("③a"); await check(); await waitCard(tab, n, /맞았어요/, 1500);
        const v = await cap(x, "③a", "셋째 ③a 확인 뒤(첫 시도)", { hangulWarn: warn });
        if (v !== "right") {
          // not accepted (wrong, or refused as Hangul): go on with the lesson's spelling so the walk can leave the card
          if (await tab.eval(`!!${area}`).catch(() => false)) { await H.type(tab, area, x.it.model); await H.sleep(100); await check(); }
          if (verdictOf(await cardText(tab, n)) !== "right") {
            for (let k = 0; k < 4; k++) { if ((await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 300 })).ok) break; await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 300 }); }
          }
          await cap(x, null, "셋째 ③a 가 안 된 뒤(영어 철자로 넘김)");
        }
        x.phase = 3;
      }
      const nx = await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 450 });
      if (!nx.ok) { x.row.blocked = `'다음 문장' 을 못 누름: ${nx.reason}`; }
    }
    for (const x of pending()) x.row.blocked = x.row.blocked || `카드를 끝까지 못 돎(단계 ${x.phase}/3)`;
  }
  H.logDataChange({ what: "PASS-OFF 영작 답(일부러 틀린 답 · 한글 꼴 포함)", where: `${page.course}/${page.id} — 이 사본 localStorage + 감사 이용권 학습 기록(복습 · 오답노트)`, why: "틀린 곳 표시의 한국어 낱말 표기 확인(check-wrongspot-hangul-1004)", reversible: "학습 기록 — 이용권 상태 아님 · '이 강의 학습 완료' 는 누르지 않음" });
}

// ------------------------------------------------------------------ run
(async () => {
  const t0 = Date.now();
  const free = await waitMemory();
  console.log(`남은 메모리 ${Math.round(free / 1048576)}MB · 사본 ${CLONE} · 포트 ${PORT} · ${H.BASE}`);
  const browser = await H.startBrowser(CLONE, PORT, { fresh: true });
  const rows = [];
  let selfCheck = null;
  try {
    const tab = await H.openTab(browser, { clean: true });
    await H.setViewport(tab, "desktop");
    await H.load(tab, "/", {});
    // the page text a judge reads must not hold the typed box value (a textarea's value is not innerText) — else ③b's typed
    // 'Busan' would count as shown on screen
    selfCheck = await tab.eval(`(() => { const d = document.createElement('div'); const ta = document.createElement('textarea'); d.appendChild(ta); document.body.appendChild(d); ta.value = 'Busan QZX'; const r = d.innerText.includes('QZX'); d.remove(); return r; })()`).catch(() => null);
    if (selfCheck !== false) throw new Error(`자기 점검 실패 — 칸의 글이 innerText 에 섞임(${selfCheck})`);
    let i = 0;
    for (const page of targets) {
      i++;
      const ts = Date.now();
      const before = rows.length;
      try {
        if (page.course === "grammar2") await driveGrammar(tab, page, rows);
        else await drivePassoff(tab, page, rows);
      } catch (e) {
        for (const r of rows.slice(before)) r.blocked = r.blocked || `예외: ${String(e.message).slice(0, 120)}`;
        if (rows.length === before) rows.push({ rowKey: `${page.course}/${page.id}#?`, course: page.course, id: page.id, url: page.url, key: page.key, item: "?", place: "?", checks: [], blocked: `예외: ${String(e.message).slice(0, 120)}` });
      }
      for (const r of rows.slice(before)) r.judge = judgeRow(r, null);
      const ev = H.events(tab);
      for (const r of rows.slice(before)) r.events = { badResponses: ev.badResponses, exceptions: ev.exceptions.length };
      console.log(`${String(i).padStart(2)}/${targets.length} ${page.course}/${page.id} ${((Date.now() - ts) / 1000).toFixed(1)}초 — ${rows.slice(before).map((r) => `${r.item}@${r.place}:${r.judge.status}(로마자 ${r.judge.roman})`).join(" · ")}`);
    }
  } finally {
    try { browser.proc.kill(); } catch {}
  }
  if (!has("--keep-clone")) {
    await H.sleep(1500);
    const dir = path.join(os.tmpdir(), `kig-audit-0918-${CLONE}`);
    for (let k = 0; k < 5 && fs.existsSync(dir); k++) { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { await H.sleep(1000); } }
  }
  const breakMissing = BREAK === "hangul-answer" && !rows.some((r) => r.checks.some((c) => c.form === "③a" && /가나다/.test(c.typed || "")));
  // --merge: keep the rows of the courses / pages NOT run this time from the result file already there (a re-run of one course
  // or a few pages after a tool fix, without walking the other course again — PASS-OFF answers go to the licence's learning record)
  let merged = null;
  if (has("--merge") && fs.existsSync(DEST)) {
    const old = JSON.parse(fs.readFileSync(DEST, "utf8"));
    const ran = new Set(rows.map((r) => `${r.course}/${r.id}`));
    const kept = (old.rows || []).filter((r) => !ran.has(`${r.course}/${r.id}`));
    merged = { from: old.at, kept: kept.length };
    rows.unshift(...kept.map((r) => ({ ...r, judge: judgeRow(r, null), mergedFrom: old.at })));
    const cmp = (x, y) => (x < y ? -1 : x > y ? 1 : 0);
    rows.sort((a, b) => cmp(a.course === "grammar2" ? 0 : 1, b.course === "grammar2" ? 0 : 1) || cmp(a.id, b.id) || cmp(a.place, b.place) || cmp(a.item, b.item));
  }
  const res = finish(rows, { dest: DEST, breakMissing });
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(DEST, JSON.stringify({
    at: new Date().toISOString(), base: H.BASE, toolRev: TOOL_REV, viewport: "desktop", clone: CLONE, break: BREAK || null, courses: COURSES, ids: ONLY ? [...ONLY] : null,
    seconds: Math.round((Date.now() - t0) / 1000), merged, selfCheck: { innerTextHoldsTextareaValue: selfCheck },
    forms: FORM_NAMES, targets: { pages: targets.length, items: nItems }, counts: res.counts, summary: res.summary,
    rows: rows.map(({ forms, ...r }) => ({ ...r, forms })),
  }, null, 1));
  console.log(`${Math.round((Date.now() - t0) / 1000)}초`);
  process.exit(res.exit);
})().catch((e) => { console.error(e); process.exit(1); });
