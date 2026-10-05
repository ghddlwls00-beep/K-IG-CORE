#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR 강의 쪽 스윕 — 강의 × 화면마다 다섯 단계를 학습자처럼 끝까지(회귀 점검 1002 단계 0 · passoff-sweep 가 만듦.
 * 같은 AI 계열이 만들고 점검함 — 독립 검수 아님).
 *
 * 왜 따로: drive-generic.cjs 는 이 과정의 쪽을 '열' 수는 있지만(MARKERS · validRoutes 에 있음) lib/expectations.cjs expected() 에
 * passoff-grammar 갈래가 없어 기대 글 0 · 정답 0 — 화면 글 대조와 채점을 하지 못하고, 단추를 아무거나 한 번씩 누를 뿐 ①~⑤ 를
 * 차례로 끝내지 못한다(① '영어 보기' 는 2초 뒤에 깨고, ③ 은 낱말 · 이름표 · 보기 · 짧은 칸, ④ ⑤ 는 문장 줄과 세트). 그래서 여기.
 *
 * 쪽 하나 × 화면 하나마다(기대는 lib/passoff-expect.cjs — 레슨 파일 → (이용권) 유료 보충 → viewBlocks → 한글 표기):
 *   단계 탭 5개(예문 · 문법 설명 · 찾기 · 영작 · 마무리 — 모르는 탭이면 BLOCKED) · 처음엔 '이 강의 학습 완료' 꺼짐
 *   ① 예문: 문장마다 한국어 → '영어 보기'(2초 뒤 깸)를 눌러 영어 → 소리 단추(그 문장의 클립인지 · 재생되는지 · 브라우저 TTS 로 새지 않는지)
 *   ② 발견 질문(정답 보기) · 규칙 확인(데스크톱: 틀린 보기 먼저 → '다시 골라 보세요' · 그다음 정답 → '맞았어요')
 *   ③ 형태 찾기: 카드마다 어느 문항인지 맞춰 보고 정답(낱말 + 이름표 · 보기 · 짧은 답)을 넣어 '맞았어요' 인지
 *   ④ 영작 · ⑤ 처음 보는 문장: 문장마다 모범 답을 쳐 '맞았어요' 인지 — 데스크톱은 레슨 철자(Seoul), 휴대폰 · 태블릿은 화면대로
 *      한글로 쓴 꼴(서울 — src/lib/koreanGloss.ts romanForGrading 이 되돌려 채점) · 데스크톱 첫 문장은 틀린 답 먼저(틀림으로 나와야)
 *      · 맞힌 뒤 소리 단추 · 세트 넘기기 · ⑤ 규칙 다시 확인
 *   끝: '5단계를 모두 마쳤어요' · '이 강의 학습 완료' 켜짐(누르지 않음 — 서버 완료는 되돌릴 수 없음(undo: false). --complete 일 때만 누름)
 *   단계를 옮길 때 소리가 저절로 나지 않음 · 화면 글 기대 대비 있음/없음 · 로마자 한국어 낱말('Busan' · 'Busan(부산)' 꼴) 0 ·
 *   4xx/5xx · 가로 넘침 · 오류 화면 · 데스크톱: 이전/다음 강의 링크 · (표본) 북마크 넣기→새로고침→빼기→새로고침
 *
 * 기록: out/features/passoff-grammar<suffix>.jsonl 한 줄 = 강의 × 화면(drive-generic 과 같은 꼴 — course · id · url · viewport · at ·
 *   checks[{feature,item,status,note}] · audio[{control,status,clips,note}] · problems[] · content{expected,found,present,missing,missingCount}
 *   · steps · events(4xx/5xx 포함) · verdict PASS|FAIL|BLOCKED · ms) — build-coverage.cjs 가 그대로 셀 수 있게.
 *   본 글: out/rendered/passoff-grammar/<id>.<viewport><suffix>.json (다시 판정용)
 *
 *   node drive-passoff.cjs (--ids pg01-1,pg01-2 | --shard 1/3 | --limit N | --all) [--viewports desktop,mobile,small(기본) | …,tablet] [--suffix -x]
 *        [--port 9720] [--clone rc1002-passoff-sweep-x] [--resume | --redo] [--persist-every 10] [--complete] [--extra-pages]
 *        [--licence yes|no] [--fresh-profile] [--allow-4xx <정규식>] [--out-root <폴더>] [--dry-run]
 *   (fixes-0d, 2026-10-04) 모르는 인자 · --help → 쓰임새 · exit 2(운영 방문 0). 고르는 인자가 없으면 --all 이 있어야 전수 스윕.
 *   --dry-run = 돌릴 방문만 찍고 exit 0(브라우저 · 운영 방문 · 파일 쓰기 0) — 예: --shard 2/3 --suffix -rc1002-g1-s2 --port 9721 --dry-run
 *   BASE=http://127.0.0.1:3741 node drive-passoff.cjs --ids pg01-1 … --licence no --no-audio   (깨뜨린 앱 사본의 로컬 빌드에 대고 — 무료
 *     pg01-1 · pg01-2. 로컬엔 이용권도 R2 값도 없음: --licence no 는 무료 판 기대(유료 문항 없이 '이용권이 있으면 N문장 더'),
 *     --no-audio 는 소리 단추를 누르지 않음(클립은 운영 스윕이 봄). 깨기 계획: 회귀점검-1002/단계0/passoff-proof-plan.json)
 *   다시 판정(브라우저 없음 — 기록한 본 글을 지금 기대로): node drive-passoff.cjs --rejudge <jsonl> [--break=expect-text|gloss-off|roman-inject]
 *     expect-text  기대 글 하나(첫 예문 한국어)를 바꾼 판 → 그 강의마다 '없음' ≥ 1 · exit 1 이어야
 *     gloss-off    한글 표기를 안 거친 기대(영어 철자) → 표기 표에 든 강의는 '없음' ≥ 1 · exit 1 이어야
 *     roman-inject 본 글 사본에 'Seoul(서울)' 을 끼움 → 로마자 꼴 FAIL · exit 1 이어야
 * exit: 0 = 모든 방문 PASS · 1 = FAIL 또는 BLOCKED 가 있음(또는 할 일 0) · 2 = 잘못 부름
 */
const fs = require("fs");
const path = require("path");
// rc1002-s3b scratch copy of docs/qa-2026-09-18/scripts/drive-passoff.cjs (repo file untouched):
//  - ④ desktop: first TWO sentences wrong first (end word dropped); on the 2nd one '도움 받기' once before the right answer
//  - no bookmark persistence test; after '이 강의 학습 완료' wait for the progress + learning saves (status only, no bodies)
// rc1002-s3c (2026-10-05): copy of the rc1002-s3b copy — data changes logged by "rc1002-s3c", and --complete is refused
//  unless every --ids is pg01-2 or pg01-3 (사장님 허락 2026-10-05: 이번에는 이 두 강의만 완료)
const S3C_COMPLETE_OK = new Set(["pg01-2", "pg01-3"]);
const S_DIR = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73/docs/qa-2026-09-18/scripts";
process.env.KIG_REPO = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE/.claude/worktrees/nostalgic-blackburn-048c73";
const H = require(S_DIR + "/lib/harness.cjs");
const P = require(S_DIR + "/lib/passoff-expect.cjs");
const __dirnameReal = S_DIR;
const page_id_of = (rec) => rec.id;
/** the page's requests to our own API (method · path · status) — through the Performance API + a fetch wrapper; no bodies */
const NET_HOOK = `(() => { if (window.__s3bNet) return; window.__s3bNet = []; const of = window.fetch; window.fetch = function (input, init) { const url = typeof input === 'string' ? input : (input && input.url) || ''; const method = (init && init.method) || (input && input.method) || 'GET'; const p = of.apply(this, arguments); if (/\\/api\\//.test(url)) p.then((r) => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: r.status, t: Date.now() }), () => window.__s3bNet.push({ method, path: new URL(url, location.href).pathname, status: -1, t: Date.now() })); return p; }; })()`;

const argv = process.argv.slice(2);
const arg = (n, d) => { const i = argv.indexOf(n); if (i >= 0) return argv[i + 1]; const eq = argv.find((a) => a.startsWith(`${n}=`)); return eq ? eq.slice(n.length + 1) : d; };
const has = (n) => argv.includes(n);

/**
 * 인자 검사 (회귀 점검 1002 단계 0 마무리 · fixes-0d, 2026-10-04) — 이 검사가 브라우저 · 운영 방문보다 먼저 돈다.
 * 전에는 모르는 인자(--help 포함)를 그냥 지나쳐 기본값(운영 · 이용권 사본 · 67강의 × 3화면)으로 전수 스윕을 시작했다
 * (proof 일꾼 사고 07:17Z — 운영 4방문). 이제:
 *   · 모르는 `--` 인자 · --help · -h · 값이 빠진 인자 · 인자 아닌 낱말 → 쓰임새를 찍고 exit 2 (운영 방문 0)
 *   · 고르는 인자(--ids · --shard · --limit · --rejudge)가 하나도 없으면 전수 스윕 — 그때는 --all 이 있어야 시작(없으면 exit 2)
 *   · --dry-run: 무엇을 돌릴지만 찍고 exit 0 (브라우저 · 운영 방문 · 파일 쓰기 0 — --redo 도 옛 기록을 옮기지 않음)
 */
const VALUE_ARGS = ["--ids", "--limit", "--shard", "--viewports", "--suffix", "--port", "--clone", "--persist-every", "--licence", "--allow-4xx", "--rejudge", "--break", "--out-root"];
const FLAG_ARGS = ["--resume", "--redo", "--complete", "--extra-pages", "--fresh-profile", "--no-audio", "--dry-run", "--all"];
const USAGE = [
  "쓰임새: node drive-passoff.cjs (--ids <id,…> | --shard i/n | --limit N | --all) [--viewports desktop,mobile,small] [--suffix -x] [--port 9720]",
  "        [--clone <사본 이름>] [--resume | --redo] [--persist-every 10] [--complete] [--extra-pages] [--licence yes|no] [--fresh-profile]",
  "        [--no-audio] [--allow-4xx <정규식>] [--out-root <폴더>] [--dry-run]",
  "        node drive-passoff.cjs --rejudge <jsonl> [--break=expect-text|gloss-off|roman-inject]",
  "  전수 스윕(67강의 × 화면)은 --all 을 줄 때만 시작합니다. --dry-run 은 돌릴 방문만 찍고 끝냅니다(운영 방문 0). 자세한 것은 이 파일 머리 주석.",
].join("\n");
const usageExit = (why) => { console.error(`drive-passoff: ${why}\n${USAGE}`); process.exit(2); };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--help" || a === "-h" || a === "/?") usageExit("--help — 쓰임새만 찍고 끝냅니다(운영 방문 0)");
  if (!a.startsWith("--")) usageExit(`인자가 아닌 낱말 '${a}'`);
  const name = a.includes("=") ? a.slice(0, a.indexOf("=")) : a;
  if (VALUE_ARGS.includes(name)) {
    if (a.includes("=")) { if (a.slice(name.length + 1) === "") usageExit(`${name}= 의 값이 비었음`); continue; }
    const v = argv[i + 1];
    if (v === undefined || v.startsWith("--")) usageExit(`${name} 에 값이 없음`);
    i++;
    continue;
  }
  if (FLAG_ARGS.includes(name)) { if (a.includes("=")) usageExit(`${name} 은 값을 받지 않음`); continue; }
  usageExit(`모르는 인자 ${a}`);
}
if (!argv.length) usageExit("인자가 없음 — 전수 스윕은 --all 로만 시작합니다");
if (!has("--rejudge") && !arg("--ids", null) && !arg("--shard", null) && !arg("--limit", null) && !has("--all")) usageExit("고르는 인자(--ids · --shard · --limit)가 없음 — 전수 스윕은 --all 로만 시작합니다");
{ const s = arg("--shard", null); if (s !== null && !/^\d+\/\d+$/.test(s)) usageExit(`--shard 는 i/n 꼴(예 1/3): ${s}`); if (s !== null) { const [i, n] = s.split("/").map(Number); if (!(i >= 1 && n >= 1 && i <= n)) usageExit(`--shard ${s} — 1 ≤ i ≤ n 이어야`); } }
{ const p = arg("--port", null); if (p !== null && !/^\d+$/.test(p)) usageExit(`--port 는 숫자: ${p}`); }
{ const l = arg("--licence", null); if (l !== null && !["yes", "no"].includes(l)) usageExit(`--licence 는 yes 또는 no: ${l}`); }
if (has("--resume") && has("--redo")) usageExit("--resume 와 --redo 는 같이 못 씀");
const DRY = has("--dry-run");
const COURSE = P.COURSE;
const SUFFIX = arg("--suffix", "");
const OUT = path.resolve(arg("--out-root", path.join(__dirnameReal, "../out")));
const JSONL = path.join(OUT, "features", `${COURSE}${SUFFIX}.jsonl`);
const PAGES_JSONL = path.join(OUT, "features", `${COURSE}${SUFFIX}-pages.jsonl`);
const RENDERED = path.join(OUT, "rendered", COURSE);
const DRIVER_REV = "passoff-1002a";
const BREAK = arg("--break", "");
const ALLOW_4XX = arg("--allow-4xx", null) ? new RegExp(arg("--allow-4xx")) : null;
const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1)/.test(H.BASE);
const LICENSED = (arg("--licence", LOCAL ? "no" : "yes")) === "yes";
// --no-audio: the speak buttons are not pressed (a local build without R2 values answers every clip with an error — the
// production sweep judges the sound). Only for the local break proofs; the record says so (audioSkipped).
const NO_AUDIO = has("--no-audio");
const SMALL = { width: 360, height: 640, deviceScaleFactor: 2, mobile: true, touch: true };

if (BREAK && !["expect-text", "gloss-off", "roman-inject"].includes(BREAK)) { console.error(`모르는 --break=${BREAK} (expect-text · gloss-off · roman-inject — --rejudge 와 함께)`); process.exit(2); }
if (BREAK && !has("--rejudge")) { console.error("--break 는 --rejudge 와 함께만(기대 쪽 깨기)"); process.exit(2); }

const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const STEP = (n) => `document.querySelector('main [data-passoff-view] section[aria-labelledby="passoff-step-${n}"]')`;
const MAIN_TEXT = `(() => { const m = document.querySelector('main') || document.body; return (m.innerText || '').replace(/[ \\t]+/g, ' ').trim(); })()`;
const CARD = (n) => `(() => { const s = ${STEP(n)}; return s ? [...s.querySelectorAll('section')].find((x) => /rounded-card/.test(x.className) && !x.hasAttribute('aria-labelledby') && !x.hasAttribute('aria-live') && (x.querySelector('textarea, input[aria-label="답"], [aria-label="낱말 고르기"], [aria-label="보기"], [aria-label="낱말 카드"]') || [...x.querySelectorAll('button')].some((b) => /^(다음|다음 문장)$/.test((b.innerText || '').trim())))) || null : null; })()`;
const BTN_IN = (scopeExpr, re) => `(() => { const s = ${scopeExpr}; if (!s) return null; return [...s.querySelectorAll('button')].find((b) => ${re}.test((b.innerText || '').replace(/\\s+/g, ' ').trim()) && !!(b.offsetParent || b.getClientRects().length)) || null; })()`;
const END_BTN = `(() => { const s = document.querySelector('main section[aria-label="강의 마치기"]'); if (!s) return null; const b = s.querySelector('button[aria-label^="학습 완료"]'); if (b) return { kind: 'button', label: b.getAttribute('aria-label'), disabled: b.disabled, text: (b.innerText || '').trim() }; const st = s.querySelector('[role=status]'); return st ? { kind: 'status', text: (st.innerText || '').trim() } : { kind: 'none' }; })()`;

async function setViewport(tab, kind) {
  // lib/harness.cjs VIEWPORTS has 'small' (360×780 — 2026-10-04, adult-sweep) — used when it is there; 360×640 only on an older harness
  if (H.VIEWPORTS[kind]) return H.setViewport(tab, kind);
  if (kind === "small") {
    await tab.send("Emulation.setDeviceMetricsOverride", { width: SMALL.width, height: SMALL.height, deviceScaleFactor: SMALL.deviceScaleFactor, mobile: true });
    await tab.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
    return;
  }
  return H.setViewport(tab, kind);
}

/** press a speak button and judge the clip it asked for (drive-generic pressAudio, with the item's own clip) */
async function pressAudio(tab, expr, label, wantPath, out) {
  await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  const c = await H.click(tab, expr);
  if (!c.ok) { out.push({ control: label, status: "FAIL", note: `could not click: ${c.reason}` }); return; }
  const settled = (log) => {
    const requested = new Set(log.filter((e) => e.ev === "play()").map((e) => e.src));
    return log.some((e) => requested.has(e.src) && (e.ev === "playing" || e.ev === "play-resolved" || (e.ev === "error" && e.err !== 1) || (e.ev === "play-rejected" && e.name !== "AbortError")))
      || log.some((e) => e.ev === "tts.speak" && (e.text || "").trim());
  };
  let log = [];
  for (let i = 0; i < 50; i++) { log = await H.audioLog(tab); if (settled(log)) break; await H.sleep(200); }
  await tab.eval("window.__kigStop && window.__kigStop()").catch(() => {});
  const clips = H.summariseAudio(log);
  const tts = clips.__tts ? clips.__tts.filter((t) => t && t.trim()) : [];
  delete clips.__tts;
  const paths = Object.keys(clips);
  const played = paths.filter((p) => clips[p].playing > 0 || clips[p].resolved > 0);
  const errored = paths.filter((p) => clips[p].error > 0 || clips[p].rejected > 0);
  let status, note;
  if (errored.length) { status = "FAIL"; note = `clip error ${clips[errored[0]].errCode || clips[errored[0]].rejectName || ""}`.trim(); }
  else if (paths.length && !paths.includes(wantPath)) { status = "FAIL"; note = `asked for ${paths[0]} — this sentence's clip is ${wantPath}`; }
  else if (played.includes(wantPath)) { status = "PASS"; note = ""; }
  else if (tts.length) { status = "FAIL"; note = "browser TTS fallback (missing clip?)"; }
  else { status = "RETEST"; note = !paths.length ? "no audio request within 10 s" : "no playing event"; }
  out.push({ control: label.slice(0, 90), status, clips: paths.map((p) => ({ path: p, ...clips[p], expected: p === wantPath })), ttsFallback: tts.slice(0, 2), note });
  // let the button go back to '문장 듣기' (the view stops on onEnd/onError; __kigStop pauses only)
  await H.sleep(150);
}

/** move to step n by the view's own '다음 단계' button; checks no sound started by itself */
async function nextStep(tab, from, to, rec) {
  await tab.eval("window.__kigAudio && (window.__kigAudio.length = 0)").catch(() => {});
  const btn = BTN_IN(STEP(from), "/^다음 단계/");
  let c = await H.click(tab, btn, { settle: 500 });
  if (!c.ok) {
    // the learner can always press the tab
    c = await H.click(tab, `document.querySelector('main [data-passoff-view] [data-step-tab="${to}"]')`, { settle: 500 });
    rec.checks.push({ feature: "step", item: `${from}→${to}`, status: "FAIL", note: `'다음 단계' 단추를 못 누름 — 탭으로 옮김 (${c.ok ? "탭 눌림" : c.reason})` });
  }
  const now = await tab.eval(`(document.querySelector('main [data-passoff-view]') || {}).dataset ? document.querySelector('main [data-passoff-view]').dataset.step : null`).catch(() => null);
  await H.sleep(600);
  const plays = (await H.audioLog(tab)).filter((e) => e.ev === "play()" || e.ev === "tts.speak");
  rec.checks.push({ feature: "step", item: `${from}→${to}`, status: String(now) === String(to) ? "PASS" : "FAIL", note: `data-step ${now}` });
  rec.checks.push({ feature: "no autoplay", item: `${from}→${to}`, status: plays.length ? "FAIL" : "PASS", note: plays.length ? `소리가 저절로: ${plays[0].src || plays[0].text}` : "" });
}

const verdictOf = (text) => (/맞았어요/.test(text) ? "right" : /한글이 섞여 있어요/.test(text) && !/맞았어요/.test(text) ? "hangul" : /한 번 더 해 보세요|틀린 자리를 표시했어요|정답을 확인하세요|다시 골라 보세요/.test(text) ? "wrong" : "none");

async function cardText(tab, n) { return (await tab.eval(`(() => { const c = ${CARD(n)}; return c ? c.innerText : null; })()`).catch(() => null)) || null; }
/**
 * The card's text once `re` shows (or what it says at the timeout). Waiting for the verdict we EXPECT, not for any verdict:
 * a box with Hangul typed shows '한글이 섞여 있어요' before the check, and a card checked again still holds the last verdict
 * until the new one replaces it — reading the first verdict-like text read those as the answer's verdict.
 */
async function waitText(tab, n, re, ms = 3000) {
  const end = Date.now() + ms; let t = null;
  while (Date.now() < end) { t = await cardText(tab, n); if (t && re.test(t)) return t; await H.sleep(120); }
  return t || "";
}
const waitVerdict = (tab, n, ms) => waitText(tab, n, /맞았어요/, ms);

/** ① anchors */
async function stepAnchors(tab, exp, rec, texts, depth) {
  const n = exp.anchors.length;
  for (let i = 0; i < n; i++) {
    const a = exp.anchors[i];
    const li = `(${STEP(1)} ? ${STEP(1)}.querySelectorAll('ol > li')[${i}] : null)`;
    const before = await tab.eval(`(() => { const li = ${li}; return li ? li.innerText : null; })()`).catch(() => null);
    if (before === null) { rec.checks.push({ feature: "anchor", item: a.id, status: "FAIL", note: "문장 칸 없음" }); continue; }
    if (!norm(before).includes(norm(a.ko))) rec.checks.push({ feature: "anchor", item: a.id, status: "FAIL", note: `칸 ${i + 1} 의 한국어가 데이터와 다름: ${norm(before).slice(0, 60)}` });
    const btn = `(() => { const li = ${li}; return li ? [...li.querySelectorAll('button')].find((b) => /영어 보기/.test(b.innerText || '')) : null; })()`;
    const ready = await H.waitFor(tab, `(() => { const b = ${btn}; return !!b && b.getAttribute('aria-disabled') !== 'true'; })()`, 6000, 150);
    if (!ready) { rec.checks.push({ feature: "anchor", item: a.id, status: "FAIL", note: "'영어 보기' 가 6초 안에 깨지 않음" }); continue; }
    const c = await H.click(tab, btn);
    const shown = c.ok && await H.waitFor(tab, `(() => { const li = ${li}; return !!li && !!li.querySelector('p[lang=en][tabindex="-1"]'); })()`, 4000);
    rec.checks.push({ feature: "anchor", item: `${a.id} 영어 보기`, status: shown ? "PASS" : "FAIL", note: shown ? "" : `영어가 안 열림 (${c.reason || "?"})` });
    const after = await tab.eval(`(() => { const li = ${li}; return li ? li.innerText : ''; })()`).catch(() => "");
    texts.push({ step: "1", text: after });
    if (shown && !NO_AUDIO && (depth === "full" || i === 0)) await pressAudio(tab, `(() => { const li = ${li}; return li ? li.querySelector('button[aria-label="문장 듣기"]') : null; })()`, `① ${a.id} ▶ 문장 듣기`, exp.clipOf(a), rec.audio);
  }
  texts.push({ step: "1", text: await tab.eval(MAIN_TEXT).catch(() => "") });
  if (exp.lockedExtraSentences && exp.licensed) {
    const extra = await tab.eval(`!!document.querySelector('main [data-kig-paid-extra]')`).catch(() => false);
    rec.checks.push({ feature: "licence content", item: "유료 STUDENT 문장이 이용권으로 붙음", status: extra ? "FAIL" : "PASS", note: extra ? "이용권인데 '이용권이 있으면 N문장 더' 가 보임" : `${exp.paidCount} 문항` });
  } else if (exp.lockedExtraSentences) {
    const t = await tab.eval(`(document.querySelector('main [data-kig-paid-extra]') || {}).innerText || ''`).catch(() => "");
    rec.checks.push({ feature: "licence content", item: "무료 판 — 유료 문장 수 안내", status: t.includes(`${exp.lockedExtraSentences}문장 더`) ? "PASS" : "FAIL", note: norm(t).slice(0, 80) || "안내 없음" });
  }
}

/** ② discovery · rule check */
async function stepRule(tab, exp, rec, texts, viewport) {
  const r = exp.rule;
  if (!r) { texts.push({ step: "2", text: await tab.eval(MAIN_TEXT).catch(() => "") }); return; }
  if (r.discovery) {
    const c = await H.click(tab, `${STEP(2)}.querySelector('section[aria-labelledby="passoff-discovery"] button[data-option="${r.discovery.answer}"]')`, { settle: 300 });
    const t = await tab.eval(`(${STEP(2)}.querySelector('section[aria-labelledby="passoff-discovery"]') || {}).innerText || ''`).catch(() => "");
    rec.checks.push({ feature: "grading", item: "② 발견 질문(정답 보기)", status: c.ok && /잘 찾았어요/.test(t) ? "PASS" : "FAIL", note: c.ok ? norm(t).slice(-80) : c.reason });
  }
  if (r.check) {
    const sec = `${STEP(2)}.querySelector('section[aria-labelledby="passoff-rule-check"]')`;
    if (viewport === "desktop" && r.check.options.length > 1) {
      const wrong = r.check.options.findIndex((_, i) => i !== r.check.answer);
      await H.click(tab, `(${sec} || document).querySelector('button[data-option="${wrong}"]')`, { settle: 300 });
      const t = await tab.eval(`(${sec} || {}).innerText || ''`).catch(() => "");
      // a wrong choice scrolls the card's rule line into view (smooth) — let it stop before the next click
      await H.sleep(700);
      rec.checks.push({ feature: "grading", item: "② 규칙 확인 — 틀린 보기", status: /다시 골라 보세요/.test(t) && !/맞았어요/.test(t) ? "PASS" : "FAIL", note: norm(t).slice(-60) });
    }
    const c = await H.click(tab, `(${sec} || document).querySelector('button[data-option="${r.check.answer}"]')`, { settle: 300 });
    const t = await tab.eval(`(${sec} || {}).innerText || ''`).catch(() => "");
    rec.checks.push({ feature: "grading", item: "② 규칙 확인 — 정답", status: c.ok && /맞았어요/.test(t) ? "PASS" : "FAIL", note: c.ok ? norm(t).slice(-60) : c.reason });
  }
  texts.push({ step: "2", text: await tab.eval(MAIN_TEXT).catch(() => "") });
}

/** read the ③ card as the screen draws it */
const FORM_CARD = `(() => { const c = ${CARD(3)}; if (!c) return null; const g = (l) => c.querySelector('[aria-label="' + l + '"]');
  const kind = g('낱말 고르기') ? 'select' : g('보기') ? 'choice' : c.querySelector('input[aria-label="답"]') ? 'short' : '?';
  return { kind, h3: (c.querySelector('h3') || {}).innerText || '', tokens: g('낱말 고르기') ? [...g('낱말 고르기').querySelectorAll('button')].map((b) => ((b.querySelector('span') || b).innerText || '').trim()) : [],
    sentence: ((c.querySelector('p[lang=en]') || {}).innerText || '').trim(), options: g('보기') ? [...g('보기').querySelectorAll('button')].map((b) => ({ i: Number(b.dataset.option), t: (b.innerText || '').trim() })) : [],
    text: c.innerText }; })()`;

/** ③ forms */
async function stepForms(tab, exp, rec, texts, viewport, gradingTally) {
  const doneIds = new Set();
  const step3 = STEP(3);
  for (let guard = 0; guard < exp.forms.length * 4 + 4; guard++) {
    const stepText = await tab.eval(`(${step3} || {}).innerText || ''`).catch(() => "");
    if (/문제를 모두 마쳤어요|형태 찾기 문제가 없습니다/.test(stepText)) break;
    const card = await tab.eval(FORM_CARD).catch(() => null);
    if (!card) { await H.sleep(300); continue; }
    const cands = exp.forms.filter((f) => f.kind === card.kind && norm(exp.gloss(f.instruction)) === norm(card.h3)).filter((f) => {
      if (f.kind === "select") return JSON.stringify(f.tokens.filter((t) => /[A-Za-z0-9]/.test(t)).map((t) => norm(exp.gloss(t)))) === JSON.stringify(card.tokens.map(norm));
      if (f.kind === "choice") return norm(exp.gloss(f.sentence || "")) === norm(card.sentence) && JSON.stringify(f.options.map((o) => norm(exp.gloss(o))).sort()) === JSON.stringify(card.options.map((o) => norm(o.t)).sort());
      return norm(exp.gloss(f.sentence || "")) === norm(card.sentence);
    });
    const item = cands.find((f) => !doneIds.has(f.id)) || cands[0];
    if (!item) { rec.checks.push({ feature: "grading", item: `③ 모르는 카드(${card.kind})`, status: "BLOCKED", note: `데이터에서 못 찾음: ${norm(card.h3).slice(0, 40)} · ${norm(card.sentence || card.tokens.join(" ")).slice(0, 60)}` }); return; }
    let form = "";
    let typedHangul = false;
    if (item.kind === "select") {
      const alnum = item.tokens.map((t, i) => [t, i]).filter(([t]) => /[A-Za-z0-9]/.test(t)).map(([, i]) => i);
      for (const a of item.answer) {
        const k = alnum.indexOf(a);
        await H.click(tab, `(${CARD(3)} || document).querySelectorAll('[aria-label="낱말 고르기"] button')[${k}]`, { settle: 120 });
        const want = exp.expectedLabel(item, a);
        if (want) await H.click(tab, `(() => { const g = (${CARD(3)} || document).querySelector('[aria-label="이름표 고르기"]'); return g ? [...g.querySelectorAll('button')].find((b) => (b.innerText || '').trim() === ${JSON.stringify(want)}) : null; })()`, { settle: 120 });
      }
      form = item.answer.map((i) => item.tokens[i] + (exp.expectedLabel(item, i) ? `(${exp.expectedLabel(item, i)})` : "")).join(" ");
      await H.click(tab, BTN_IN(CARD(3), "/^확인$/"), { settle: 200 });
    } else if (item.kind === "choice") {
      await H.click(tab, `(${CARD(3)} || document).querySelector('[aria-label="보기"] button[data-option="${item.answer}"]')`, { settle: 200 });
      form = item.options[item.answer];
    } else {
      const f = exp.answerForms(item.answer[0]);
      typedHangul = viewport !== "desktop" && Boolean(f.hangul);
      form = typedHangul ? f.hangul : f.written;
      await H.type(tab, `(${CARD(3)} || document).querySelector('input[aria-label="답"]')`, form);
      await H.sleep(120);
      await H.click(tab, BTN_IN(CARD(3), "/^확인$/"), { settle: 200 });
    }
    const t = await waitVerdict(tab, 3, 3000);
    const v = verdictOf(t);
    gradingTally.form++; if (v === "right") gradingTally.formRight++; if (typedHangul) { gradingTally.hangulForms++; if (v === "right") gradingTally.hangulRight++; }
    rec.checks.push({ feature: "grading", item: `③ ${item.id} ${item.kind}${typedHangul ? " (한글 꼴)" : ""}`, status: v === "right" ? "PASS" : "FAIL", note: v === "right" ? form.slice(0, 60) : `정답 '${form.slice(0, 60)}' → ${v}: ${norm(t).slice(0, 80)}` });
    texts.push({ step: "3", text: t });
    if (v !== "right") {
      // move on like a learner: the second try shows the answer, then '다음'
      if (item.kind === "choice") { const other = item.options.findIndex((_, i) => i !== item.answer); await H.click(tab, `(${CARD(3)} || document).querySelector('[aria-label="보기"] button[data-option="${other}"]:not([disabled])')`, { settle: 200 }); }
      else if (typedHangul) {
        // the Hangul form was refused ('한글이 섞여 있어요' — not graded): the lesson's spelling, so the walk goes on
        await H.type(tab, `(${CARD(3)} || document).querySelector('input[aria-label="답"]')`, exp.answerForms(item.answer[0]).written);
        await H.sleep(120);
        await H.click(tab, BTN_IN(CARD(3), "/^확인$/"), { settle: 300 });
        if (!/맞았어요|정답을 확인하세요/.test((await cardText(tab, 3)) || "")) await H.click(tab, BTN_IN(CARD(3), "/^확인$/"), { settle: 300 });
      } else await H.click(tab, BTN_IN(CARD(3), "/^확인$/"), { settle: 200 });
    }
    doneIds.add(item.id);
    const next = await H.click(tab, BTN_IN(CARD(3), "/^다음$/"), { settle: 300 });
    if (!next.ok) { rec.checks.push({ feature: "grading", item: `③ ${item.id} '다음'`, status: "FAIL", note: `'다음' 을 못 누름: ${next.reason}` }); return; }
  }
  texts.push({ step: "3", text: await tab.eval(MAIN_TEXT).catch(() => "") });
}

/** ④ / ⑤ sentences — one queue of cards, sets and comebacks included */
async function composeRun(tab, exp, rec, texts, viewport, depth, n, items, gradingTally, label) {
  const right = new Set();
  let negativeLeft = viewport !== "desktop" || n !== 4 ? 0 : 2;
  let played = 0;
  for (let guard = 0; guard < items.length * 6 + 12; guard++) {
    const stepText = await tab.eval(`(${STEP(n)} || {}).innerText || ''`).catch(() => "");
    const card = await tab.eval(`(() => { const c = ${CARD(n)}; if (!c) return null; return { text: c.innerText, ko: [...c.querySelectorAll('p')].map((p) => (p.innerText || '').replace(/\\s+/g, ' ').trim()), answer: !!c.querySelector('textarea'), next: [...c.querySelectorAll('button')].some((b) => (b.innerText || '').trim() === '다음 문장'), tiles: !!c.querySelector('[aria-label="낱말 카드"]') }; })()`).catch(() => null);
    if (!card) {
      if (n === 4 && /다음 세트/.test(stepText)) { texts.push({ step: "4", text: stepText }); await H.click(tab, BTN_IN(STEP(4), "/^다음 세트$/"), { settle: 400 }); continue; }
      if (n === 4 && /다음 단계: 마무리/.test(stepText)) { texts.push({ step: "4", text: stepText }); break; }
      if (n === 5) break;
      await H.sleep(300); continue;
    }
    const item = items.find((p) => card.ko.includes(norm(p.ko)) && (!p.promptEn || card.ko.includes(norm(exp.gloss(p.promptEn)))) && !right.has(p.id))
      || items.find((p) => card.ko.includes(norm(p.ko)) && (!p.promptEn || card.ko.includes(norm(exp.gloss(p.promptEn)))));
    if (!item) { rec.checks.push({ feature: "grading", item: `${label} 모르는 카드`, status: "BLOCKED", note: `데이터에서 못 찾음: ${norm(card.text).slice(0, 80)}` }); return; }
    if (card.answer) {
      const f = exp.answerForms(item.en);
      const typedHangul = viewport !== "desktop" && Boolean(f.hangul);
      const form = typedHangul ? f.hangul : f.written;
      const area = `(${CARD(n)} || document).querySelector('textarea[aria-label="영작 답"]')`;
      if (negativeLeft > 0 && !right.has(item.id) && !(rec.s3bWrong || []).includes(item.id)) {
        negativeLeft--;
        (rec.s3bWrong ||= []).push(item.id);
        const wrong = item.en.replace(/\s*\S+\s*$/, "") || "x";
        await H.type(tab, area, wrong);
        await H.sleep(100);
        await H.click(tab, BTN_IN(CARD(n), "/^확인$/"), { settle: 200 });
        const tw = await waitText(tab, n, /틀린 자리를 표시했어요|맞았어요/, 3000);
        rec.checks.push({ feature: "grading", item: `${label} ${item.id} 틀린 답(끝 낱말 뺌)`, status: verdictOf(tw) === "wrong" ? "PASS" : "FAIL", note: `'${wrong.slice(0, 50)}' → ${verdictOf(tw)}` });
        H.logDataChange({ course: COURSE, id: page_id_of(rec), action: `rc1002-s3c: ④ ${item.id} 일부러 틀린 답 '${wrong.slice(0, 40)}' (데스크톱) — 학습 기록(where lesson)에 남을 수 있음`, by: "rc1002-s3c" });
        if (negativeLeft === 0) {
          // '도움 받기' once (the ladder's next rung), then the right answer
          const before = norm(await cardText(tab, n).catch(() => ""));
          const hb = await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 500 });
          const after = norm(await cardText(tab, n).catch(() => ""));
          const added = after.split(" ").filter((w) => !before.includes(w)).join(" ").slice(0, 160);
          rec.checks.push({ feature: "help", item: `${label} ${item.id} '도움 받기' 한 번`, status: hb.ok && after !== before ? "PASS" : "FAIL", note: `눌림 ${hb.ok} · 새로 보인 글: ${added || "(없음)"} · 낱말 카드 ${/낱말 카드/.test(after)} · 첫 글자 ${/첫 글자/.test(after)}` });
          rec.s3bHelpText = after.slice(0, 600);
          H.logDataChange({ course: COURSE, id: page_id_of(rec), action: `rc1002-s3c: ④ ${item.id} '도움 받기' 한 번 (데스크톱) — 학습 기록(where lesson · help)에 남을 수 있음`, by: "rc1002-s3c" });
        }
      }
      await H.type(tab, area, form);
      await H.sleep(100);
      await H.click(tab, BTN_IN(CARD(n), "/^(다시 )?확인$/"), { settle: 200 });
      const t = await waitVerdict(tab, n, 3000);
      const v = verdictOf(t);
      gradingTally.compose++; if (v === "right") gradingTally.composeRight++; if (typedHangul) { gradingTally.hangulForms++; if (v === "right") gradingTally.hangulRight++; }
      rec.checks.push({ feature: "grading", item: `${label} ${item.id}${typedHangul ? " (한글 꼴)" : ""}`, status: v === "right" ? "PASS" : "FAIL", note: v === "right" ? form.slice(0, 70) : `정답 '${form.slice(0, 60)}' → ${v}: ${norm(t).slice(0, 80)}` });
      texts.push({ step: String(n), text: t });
      let v2 = v;
      if (v !== "right" && typedHangul) {
        // the Hangul form was refused: go on with the lesson's spelling (the FAIL above stays) so the rest is still walked
        await H.type(tab, area, f.written).catch(() => {});
        await H.sleep(100);
        await H.click(tab, BTN_IN(CARD(n), "/^(다시 )?확인$/"), { settle: 200 });
        const t2 = await waitVerdict(tab, n, 3000);
        v2 = verdictOf(t2);
        rec.checks.push({ feature: "grading", item: `${label} ${item.id} (한글 꼴이 안 된 뒤 영어 철자)`, status: v2 === "right" ? "PASS" : "FAIL", note: `${f.written.slice(0, 60)} → ${v2}` });
      }
      if (v2 === "right") {
        right.add(item.id);
        if (!NO_AUDIO && (depth === "full" || played === 0)) { played++; await pressAudio(tab, `(${CARD(n)} || document).querySelector('button[aria-label="문장 듣기"]')`, `${label} ${item.id} ▶ 문장 듣기`, exp.clipOf(item), rec.audio); }
      } else {
        // climb the ladder to the answer and go on (the sentence comes back later)
        for (let k = 0; k < 4; k++) {
          if (await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 250 }).then((c) => c.ok)) break;
          await H.click(tab, BTN_IN(CARD(n), "/^도움 받기$/"), { settle: 250 });
        }
      }
      const nx = await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 });
      if (!nx.ok) { rec.checks.push({ feature: "grading", item: `${label} ${item.id} '다음 문장'`, status: "FAIL", note: nx.reason }); return; }
    } else if (card.next) {
      await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 });
    } else {
      // tiles on screen without a typing box (a ladder left half-way): take the answer and go on
      await H.click(tab, BTN_IN(CARD(n), "/^정답 보기$/"), { settle: 250 });
      await H.click(tab, BTN_IN(CARD(n), "/^다음 문장$/"), { settle: 300 });
    }
  }
  const missing = items.filter((p) => !right.has(p.id));
  if (missing.length) rec.checks.push({ feature: "grading", item: `${label} 모든 문장 정답 처리`, status: "FAIL", note: `정답으로 못 넘긴 문장 ${missing.length}: ${missing.slice(0, 4).map((p) => p.id).join(" ")}` });
}

async function stepCompose(tab, exp, rec, texts, viewport, depth, tally) {
  if (!exp.produce.length) { texts.push({ step: "4", text: await tab.eval(MAIN_TEXT).catch(() => "") }); return; }
  await composeRun(tab, exp, rec, texts, viewport, depth, 4, exp.produce, tally, "④");
  texts.push({ step: "4", text: await tab.eval(MAIN_TEXT).catch(() => "") });
}

async function stepWrap(tab, exp, rec, texts, viewport, depth, tally) {
  if (exp.transfers.length) await composeRun(tab, exp, rec, texts, viewport, depth, 5, exp.transfers, tally, "⑤");
  const r = exp.rule;
  if (r && r.check) {
    const sec = `${STEP(5)}.querySelector('section[aria-labelledby="passoff-wrap-check"]')`;
    await H.waitFor(tab, `!!${sec}`, 3000);
    const c = await H.click(tab, `(${sec} || document).querySelector('button[data-option="${r.check.answer}"]')`, { settle: 300 });
    const t = await tab.eval(`(${sec} || {}).innerText || ''`).catch(() => "");
    rec.checks.push({ feature: "grading", item: "⑤ 규칙 다시 확인 — 정답", status: c.ok && /맞았어요/.test(t) ? "PASS" : "FAIL", note: c.ok ? norm(t).slice(-60) : c.reason });
  }
  const done = await H.waitFor(tab, `(() => { const s = ${STEP(5)}; return !!s && /5단계를 모두 마쳤어요/.test(s.innerText || ''); })()`, 5000);
  rec.checks.push({ feature: "steps done", item: "①~⑤ 마침 표시", status: done ? "PASS" : "FAIL", note: done ? "" : norm(await tab.eval(`(${STEP(5)} || {}).innerText || ''`).catch(() => "")).slice(-120) });
  texts.push({ step: "5", text: await tab.eval(MAIN_TEXT).catch(() => "") });
}

function verdictOfRecord(rec) {
  const fails = (rec.checks || []).filter((c) => c.status === "FAIL").length + (rec.audio || []).filter((a) => a.status === "FAIL").length + (rec.problems || []).length;
  if (rec.visitError || fails) return "FAIL";
  if ((rec.checks || []).some((c) => c.status === "BLOCKED")) return "BLOCKED";
  return "PASS";
}

async function snapshotProblems(tab, rec, where) {
  const snap = await tab.eval(H.SNAPSHOT).catch(() => null);
  if (!snap) return null;
  if (snap.overflowX) rec.problems.push(`horizontal overflow on ${where} (${snap.scrollWidth}px)`);
  if (snap.leak) rec.problems.push(`leaked value on ${where}: ${snap.leak}`);
  if (snap.errorScreen) rec.problems.push(`error screen on ${where}`);
  if (snap.notFound) rec.problems.push(`404 screen on ${where}`);
  if (snap.paywall && LICENSED) rec.problems.push(`paywall shown to a licence on ${where}`);
  if (snap.clippedText && snap.clippedText.length) rec.problems.push(`clipped text on ${where}: ${snap.clippedText[0]}`);
  return snap;
}

async function visit(tab, page, viewport, neighbourMap, persist) {
  const t0 = Date.now();
  const exp = P.expectedPassoff(page.id, { licensed: LICENSED });
  const rec = { course: COURSE, id: page.id, url: page.url, viewport, at: new Date().toISOString(), base: H.BASE, driverRev: DRIVER_REV, licensed: LICENSED,
    finalPath: page.url, steps: [], checks: [], audio: [], problems: [], content: null, layout: null, events: null, grading: null, ...(NO_AUDIO ? { audioSkipped: true } : {}) };
  const depth = viewport === "desktop" ? "full" : "light";
  rec.depth = depth;
  await setViewport(tab, viewport);
  const loaded = await H.load(tab, page.url, { marker: H.MARKERS[COURSE] });
  rec.load = loaded;
  if (!loaded.navigated || !loaded.rendered) {
    rec.problems.push(!loaded.navigated ? `never reached ${page.url} (at ${loaded.href})` : `"${H.MARKERS[COURSE]}" never rendered`);
    rec.events = H.events(tab); rec.verdict = verdictOfRecord(rec); rec.ms = Date.now() - t0; return rec;
  }
  const texts = [];
  const view = await H.waitFor(tab, `!!document.querySelector('main [data-passoff-view]')`, 10000);
  const snap0 = await snapshotProblems(tab, rec, "(initial)");
  if (snap0) { texts.push({ step: "(initial)", text: snap0.text }); rec.layout = { overflowX: snap0.overflowX, scrollWidth: snap0.scrollWidth, offscreen: snap0.offscreenControls, smallTargets: snap0.smallTargets, unlabeledFields: snap0.unlabeledFields }; }
  if (!view) { rec.checks.push({ feature: "view", item: "PassoffLearningView", status: snap0 && snap0.paywall ? "FAIL" : "BLOCKED", note: snap0 && snap0.paywall ? "잠금 화면" : "[data-passoff-view] 없음 — 다른 화면" }); }
  else {
    // the five tabs (StepTabs data-step-tab) — an unknown one leaves the lesson BLOCKED
    // textContent, not innerText: on a phone StepTabs hides the other tabs' names ('hidden sm:inline') — the name is still the tab's
    const tabs = (await tab.eval(`[...document.querySelectorAll('main [data-passoff-view] [data-step-tab]')].map((b) => (b.textContent || '').replace(/\\s+/g, ' ').trim())`).catch(() => [])) || [];
    rec.steps = tabs;
    const unknown = tabs.filter((t, i) => !new RegExp(`Step\\s*${i + 1}\\b.*${exp.stepNames[i] || "§"}`).test(t));
    rec.checks.push({ feature: "step", item: "단계 탭 5개", status: tabs.length === 5 && !unknown.length ? "PASS" : "BLOCKED", note: tabs.length === 5 && !unknown.length ? tabs.join(" | ") : `모르는 단계: ${tabs.join(" | ")} (기대 ${exp.stepNames.join(" · ")})` });
    const start = await tab.eval(END_BTN).catch(() => null);
    const startDone = start && (start.kind === "status" || (start.kind === "button" && /취소/.test(start.label)));
    rec.checks.push({ feature: "completion", item: "처음엔 꺼짐", status: startDone ? "NA" : start && start.kind === "button" && start.disabled ? "PASS" : "FAIL", note: JSON.stringify(start), ...(startDone ? { coveredBy: "completion" } : {}) });
    const tally = { form: 0, formRight: 0, compose: 0, composeRight: 0, hangulForms: 0, hangulRight: 0 };
    await stepAnchors(tab, exp, rec, texts, depth);
    await nextStep(tab, 1, 2, rec);
    await snapshotProblems(tab, rec, "Step 2");
    await stepRule(tab, exp, rec, texts, viewport);
    await nextStep(tab, 2, 3, rec);
    await snapshotProblems(tab, rec, "Step 3");
    await stepForms(tab, exp, rec, texts, viewport, tally);
    await nextStep(tab, 3, 4, rec);
    await snapshotProblems(tab, rec, "Step 4");
    await stepCompose(tab, exp, rec, texts, viewport, depth, tally);
    await nextStep(tab, 4, 5, rec);
    await stepWrap(tab, exp, rec, texts, viewport, depth, tally);
    await snapshotProblems(tab, rec, "Step 5");
    rec.grading = tally;
    // '이 강의 학습 완료' opens after the five steps (lessonGate) — pressed only with --complete (the server keeps it for good)
    await H.sleep(300);
    const end = await tab.eval(END_BTN).catch(() => null);
    const open = end && ((end.kind === "button" && !end.disabled) || end.kind === "status");
    rec.checks.push({ feature: "completion", item: "다섯 단계 뒤 켜짐", status: open ? "PASS" : "FAIL", note: JSON.stringify(end) });
    if (open && has("--complete") && end.kind === "button" && viewport === "desktop" && S3C_COMPLETE_OK.has(page.id)) {
      await tab.eval("window.__s3bNet && (window.__s3bNet.length = 0)").catch(() => {});
      const t0c = Date.now();
      const pressed = await H.click(tab, `document.querySelector('main section[aria-label="강의 마치기"] button[aria-label^="학습 완료"]')`, { settle: 1200 });
      H.logDataChange({ course: COURSE, id: page.id, action: `rc1002-s3c: PASS-OFF ${page.id} '이 강의 학습 완료' 누름 (데스크톱) — 서버 완료(되돌릴 수 없음 · undo: false) · 사장님 허락 2026-10-05 '너가 하고 싶은거 다해 다 허락할게'(이번에는 pg01-2 · pg01-3 두 강의만)`, by: "rc1002-s3c", detail: `눌림 ${pressed.ok}` });
      // wait for the saves: POST /api/progress/passoff-grammar and POST /api/learning/passoff-grammar (status only)
      let net = [];
      for (let k = 0; k < 60; k++) {
        net = (await tab.eval("window.__s3bNet || []").catch(() => [])) || [];
        const prog = net.find((x) => x.method === "POST" && x.path === "/api/progress/passoff-grammar");
        const learn = net.find((x) => x.method === "POST" && x.path === "/api/learning/passoff-grammar");
        if (prog && learn) break;
        await H.sleep(250);
      }
      const after = await tab.eval(END_BTN).catch(() => null);
      rec.s3bSaves = net.map((x) => `${x.method} ${x.path} ${x.status} +${x.t - t0c}ms`);
      rec.checks.push({ feature: "completion", item: "누름 → 학습 완료함", status: after && /학습 완료함/.test(after.text || "") ? "PASS" : "FAIL", note: JSON.stringify(after) });
      const okSave = net.some((x) => x.method === "POST" && x.path === "/api/progress/passoff-grammar" && x.status === 200) && net.some((x) => x.method === "POST" && x.path === "/api/learning/passoff-grammar" && x.status === 200);
      rec.checks.push({ feature: "completion", item: "저장 요청(진도 · 학습 기록) 200", status: okSave ? "PASS" : "FAIL", note: rec.s3bSaves.join(" · ") });
      rec.s3bEndText = norm(await tab.eval(`(document.querySelector('main section[aria-label="강의 마치기"]') || {}).innerText || ''`).catch(() => "")).slice(0, 300);
    }
  }

  if (viewport === "desktop" && persist) {
    await tab.eval(`sessionStorage.setItem('kig:audit:keep', '1')`).catch(() => {});
    const bm = `[...document.querySelectorAll('main button, header button')].find((b) => /북마크/.test((b.getAttribute('aria-label') || '') + (b.innerText || '')))`;
    const bmState = `(() => { const b = ${bm}; return b ? ((b.getAttribute('aria-label') || '') + '|' + (b.innerText || '')).replace(/\\s+/g, ' ').trim() : null; })()`;
    const before = await tab.eval(bmState).catch(() => null);
    if (before) {
      await H.click(tab, bm, { settle: 400 });
      const afterClick = await tab.eval(bmState).catch(() => null);
      await H.load(tab, page.url, { marker: H.MARKERS[COURSE] });
      const afterReload = await tab.eval(bmState).catch(() => null);
      await H.click(tab, bm, { settle: 400 });
      await H.load(tab, page.url, { marker: H.MARKERS[COURSE] });
      const afterRemove = await tab.eval(bmState).catch(() => null);
      rec.checks.push({ feature: "bookmark", item: "add→reload→remove→reload", status: afterClick !== before && afterReload === afterClick && afterRemove === before ? "PASS" : "FAIL", note: `${before} → ${afterClick} → reload ${afterReload} → removed ${afterRemove}` });
    } else rec.checks.push({ feature: "bookmark", item: "control", status: "BLOCKED", note: "bookmark control not found" });
    await tab.eval(`(() => { sessionStorage.removeItem('kig:audit:keep'); try { const keep = new Set(${JSON.stringify(["kig:license:v1", "kig:device:id:v1", "kig:device:name:v1", "kig:theme", "kig:lang"])}); for (const k of Object.keys(localStorage)) if (!keep.has(k)) localStorage.removeItem(k); } catch (e) {} })()`).catch(() => {});
  }
  if (viewport === "desktop") {
    if (!persist) rec.checks.push({ feature: "bookmark/completion", item: "persistence", status: "NA", sampledBy: "reload test (--persist-every)", note: "exercised on the sampled lessons of this course (see --persist-every)" });
    const nav = await tab.eval(`(() => { const as = [...document.querySelectorAll('main a[href], header a[href]')]; const pick = (re) => { const a = as.find((x) => re.test((x.innerText || '') + (x.getAttribute('aria-label') || ''))); return a ? new URL(a.href).pathname : null; }; return { prev: pick(/이전 강의/), next: pick(/다음 강의/) }; })()`).catch(() => ({ prev: null, next: null }));
    const nb = neighbourMap[page.id] || { prev: null, next: null };
    const want = (x) => (x ? `/${COURSE}/${x}` : null);
    rec.checks.push({ feature: "navigation", item: "prev/next", status: nav.prev === want(nb.prev) && nav.next === want(nb.next) ? "PASS" : "FAIL", note: `prev ${nav.prev} (course order ${want(nb.prev)}), next ${nav.next} (course order ${want(nb.next)})` });
  }

  // content against the data, and romanised Korean words on screen
  const j = P.judgeContent(exp, texts);
  rec.content = { expected: j.expected, found: j.found, present: j.present, missing: j.missing.slice(0, 25).map((m) => `${m.step}:${m.kind}: ${m.text.slice(0, 60)}`), missingCount: j.missing.length, missingKinds: [...new Set(j.missing.map((m) => m.kind))] };
  rec.checks.push({ feature: "content", item: "화면 글 기대 대비", status: j.missing.length ? "FAIL" : "PASS", note: `기대 ${j.expected} · 있음 ${j.found} · 없음 ${j.missing.length}${j.missing.length ? ` — ${j.missing.slice(0, 3).map((m) => `${m.kind} '${m.text.slice(0, 40)}'`).join(" · ")}` : ""}` });
  rec.checks.push({ feature: "korean words", item: "로마자 한국어 낱말 · 'Busan(부산)' 꼴", status: j.roman.length ? "FAIL" : "PASS", note: j.roman.length ? j.roman.slice(0, 3).map((r) => `${r.kind}: ${r.text}`).join(" · ") : `표기 표 ${exp.glossTable.length ? exp.glossTable.length + "개" : "없음"}` });
  rec.events = H.events(tab);
  const bad = (rec.events.badResponses || []).filter((r) => !(ALLOW_4XX && r.status < 500 && ALLOW_4XX.test(r.url)));
  rec.checks.push({ feature: "http", item: "4xx/5xx", status: bad.length ? "FAIL" : "PASS", note: bad.length ? bad.slice(0, 3).map((r) => `${r.status} ${String(r.url).replace(H.BASE, "")}`).join(" · ") : `요청 ${rec.events.requests}` });
  if ((rec.events.exceptions || []).length) rec.problems.push(`uncaught exception: ${rec.events.exceptions[0]}`);
  fs.mkdirSync(RENDERED, { recursive: true });
  rec.renderedFile = path.join(RENDERED, `${page.id}.${viewport}${SUFFIX}.json`);
  fs.writeFileSync(rec.renderedFile, JSON.stringify(texts, null, 1));
  rec.verdict = verdictOfRecord(rec);
  rec.ms = Date.now() - t0;
  return rec;
}

/** 오늘 복습 · 오답노트 · 구성도 — opened and read (nothing answered or sent) */
const EXTRA = [
  { id: "review", url: `/${COURSE}/review`, want: /오늘 복습/ },
  { id: "notes", url: `/${COURSE}/review?notes=1`, want: /오답노트/ },
  { id: "map", url: `/${COURSE}/map?topic=1`, want: /구성도/ },
];
async function visitExtra(tab, x, viewport) {
  const t0 = Date.now();
  const rec = { course: COURSE, id: x.id, url: x.url, viewport, at: new Date().toISOString(), base: H.BASE, driverRev: DRIVER_REV, kind: "extra-page", checks: [], audio: [], problems: [] };
  await setViewport(tab, viewport);
  const loaded = await H.load(tab, x.url, { marker: null });
  rec.load = loaded;
  await H.waitFor(tab, `(() => { const m = document.querySelector('main'); return !!m && !/불러오고 있어요/.test(m.innerText || '') && (m.innerText || '').length > 40; })()`, 12000);
  await H.sleep(800);
  const snap = await snapshotProblems(tab, rec, x.id);
  rec.h1 = snap ? snap.h1 : null;
  rec.checks.push({ feature: "page", item: x.id, status: snap && x.want.test(snap.text) ? "PASS" : "FAIL", note: snap ? norm(snap.text).slice(0, 160) : "no snapshot" });
  const roman = snap ? P.romanOnScreen(`${COURSE}/__none__`, snap.text) : [];
  rec.checks.push({ feature: "korean words", item: "'Busan(부산)' 꼴", status: roman.length ? "FAIL" : "PASS", note: roman.slice(0, 2).map((r) => r.text).join(" · ") });
  rec.events = H.events(tab);
  const bad = (rec.events.badResponses || []).filter((r) => !(ALLOW_4XX && r.status < 500 && ALLOW_4XX.test(r.url)));
  rec.checks.push({ feature: "http", item: "4xx/5xx", status: bad.length ? "FAIL" : "PASS", note: bad.slice(0, 3).map((r) => `${r.status} ${String(r.url).replace(H.BASE, "")}`).join(" · ") });
  rec.verdict = verdictOfRecord(rec);
  rec.ms = Date.now() - t0;
  return rec;
}

/** --rejudge: the recorded screen texts against today's expectations (with an expectation-side break) — no browser */
function rejudge(file) {
  const lines = fs.readFileSync(file, "utf8").split("\n").filter((l) => l.trim());
  let bad = 0, n = 0;
  for (const line of lines) {
    const r = JSON.parse(line);
    if (r.kind === "extra-page" || !r.renderedFile || !fs.existsSync(r.renderedFile)) continue;
    n++;
    let texts = JSON.parse(fs.readFileSync(r.renderedFile, "utf8"));
    if (BREAK === "roman-inject") texts = [...texts, { step: "inject", text: "I live in Seoul(서울)." }];
    const exp = P.expectedPassoff(r.id, { licensed: r.licensed !== false, brk: BREAK || null });
    const j = P.judgeContent(exp, texts);
    const fail = j.missing.length > 0 || j.roman.length > 0;
    if (fail) bad++;
    const was = r.content ? `${r.content.found}/${r.content.expected}` : "?";
    console.log(`${fail ? "FAIL" : "PASS"} ${r.id}.${r.viewport} — 기대 ${j.expected} · 있음 ${j.found} · 없음 ${j.missing.length} · 로마자 ${j.roman.length} (기록 때 ${was})${j.missing.length ? ` · ${j.missing.slice(0, 2).map((m) => `${m.kind} '${m.text.slice(0, 40)}'`).join(" · ")}` : ""}${j.roman.length ? ` · ${j.roman[0].kind}: ${j.roman[0].text}` : ""}`);
  }
  console.log(`다시 판정 ${n} 방문 · FAIL ${bad}${BREAK ? ` (--break=${BREAK})` : ""}`);
  process.exit(n === 0 ? 2 : bad ? 1 : 0);
}

(async () => {
  if (has("--rejudge")) return rejudge(path.resolve(arg("--rejudge")));
  const ONLY = arg("--ids", null) ? new Set(arg("--ids").split(",")) : null;
  if (has("--complete") && (!ONLY || [...ONLY].some((id) => !S3C_COMPLETE_OK.has(id)))) { console.error("rc1002-s3c: --complete 는 --ids pg01-2 · pg01-3 만"); process.exit(2); }
  // 명령서(회귀 점검 1002 단계 1)의 3화면 '휴대폰 · 작은 휴대폰 · 데스크톱' — 관문 0 의 tablet 은 --viewports 로
  const VIEWPORTS = arg("--viewports", "desktop,mobile,small").split(",");
  for (const v of VIEWPORTS) if (!H.VIEWPORTS[v] && v !== "small") { console.error(`모르는 화면 ${v} — ${Object.keys(H.VIEWPORTS).join(" · ")} · small`); process.exit(2); }
  let list = P.pages().filter((p) => !ONLY || ONLY.has(p.id));
  const SHARD = arg("--shard", null);
  if (SHARD) { const [i, n] = SHARD.split("/").map(Number); list = list.filter((_, k) => k % n === i - 1); }
  const LIMIT = Number(arg("--limit", 0)) || 0;
  if (LIMIT) list = list.slice(0, LIMIT);
  if (ONLY) for (const id of ONLY) if (!list.some((p) => p.id === id)) { console.error(`--ids 의 ${id} 는 validRoutes 에 없음`); process.exit(2); }
  const PERSIST_EVERY = Number(arg("--persist-every", 10));
  const neighbourMap = P.neighbours();
  const queue = list.flatMap((p) => VIEWPORTS.map((v) => [p, v]));
  if (!queue.length) { console.log("!!! 부른 강의 0 · exit 1"); process.exit(1); }
  if (DRY) {
    // 미리 보기: 무엇을 돌릴지만 — 브라우저 · 운영 방문 · 파일 쓰기 0 (--redo 의 옛 기록 옮기기도 안 함)
    const prev = H.jsonl(JSONL, (r) => `${r.url}|${r.viewport}`);   // 읽기만(파일을 만들지 않음)
    const left = has("--redo") ? queue : queue.filter(([p, v]) => !prev.done.has(`${p.url}|${v}`));
    const port = Number(arg("--port", 9720));
    console.log(`--dry-run: ${COURSE} · 강의 ${list.length} × 화면 ${VIEWPORTS.join("·")} = 방문 ${queue.length} · 기록 파일 ${path.basename(JSONL)}(이미 방문 ${prev.done.size}) · ` +
      `실제로 돌면 ${has("--resume") || has("--redo") || !prev.done.size ? `${left.length} 방문` : "'이미 방문' 으로 exit 1(--resume · --redo · 다른 --suffix 필요)"} · base ${H.BASE} · 이용권 ${LICENSED ? "있음(사본)" : "없음"} · ` +
      `clone ${arg("--clone", `rc1002-passoff-sweep${SUFFIX || "-main"}`)} · port ${port}${port < 9720 || port > 9729 ? "(passoff-sweep 몫 9720~9729 밖)" : ""} · extra-pages ${has("--extra-pages") ? "예" : "아니오"}${has("--all") ? " · --all" : ""}`);
    console.log(`  강의: ${list.map((p) => p.id).join(" ")}`);
    console.log(`  처음 방문: ${left.slice(0, 6).map(([p, v]) => `${p.id}.${v}`).join(" · ")}${left.length > 6 ? " …" : ""}`);
    process.exit(0);
  }
  if (has("--redo") && fs.existsSync(JSONL) && fs.statSync(JSONL).size) { const kept = `${JSONL}.before-redo-${new Date().toISOString().replace(/[:.]/g, "-")}`; fs.renameSync(JSONL, kept); console.log(`--redo: 옛 기록 → ${path.basename(kept)}`); }
  const out = H.jsonl(JSONL, (r) => `${r.url}|${r.viewport}`);
  if (!has("--resume") && out.done.size) { console.log(`!!! ${path.basename(JSONL)} 에 이미 방문 ${out.done.size} — --resume 또는 --redo 또는 다른 --suffix · exit 1`); process.exit(1); }
  const todo = queue.filter(([p, v]) => !out.done.has(`${p.url}|${v}`));
  const PORT = Number(arg("--port", 9720));
  if (PORT < 9720 || PORT > 9729) console.log(`(주의: 포트 ${PORT} — passoff-sweep 몫은 9720~9729)`);
  const CLONE = arg("--clone", `rc1002-passoff-sweep${SUFFIX || "-main"}`);
  console.log(`${COURSE}: ${todo.length} 방문(강의 ${list.length} × 화면 ${VIEWPORTS.join("·")}) · base ${H.BASE} · 이용권 ${LICENSED ? "있음(사본)" : "없음"} · clone ${CLONE} · port ${PORT}`);
  if (!todo.length) { console.log("!!! 할 일 0 · exit 1"); process.exit(has("--resume") && !ONLY ? 0 : 1); }
  const browser = await H.startBrowser(CLONE, PORT, { fresh: has("--fresh-profile") });
  const started = Date.now();
  const tally = { PASS: 0, FAIL: 0, BLOCKED: 0 };
  let tab = null;
  try {
    tab = await H.openTab(browser, { clean: true });
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: NET_HOOK });
    let n = 0;
    for (const [page, viewport] of todo) {
      const idx = list.findIndex((p) => p.id === page.id);
      const persist = false; // rc1002-s3b: no bookmark test (idx ${idx})
      let rec;
      try { rec = await visit(tab, page, viewport, neighbourMap, persist); }
      catch (err) { rec = { course: COURSE, id: page.id, url: page.url, viewport, at: new Date().toISOString(), base: H.BASE, driverRev: DRIVER_REV, visitError: String(err && err.message).slice(0, 300), verdict: "FAIL" }; }
      out.write(rec);
      n++;
      tally[rec.verdict] = (tally[rec.verdict] || 0) + 1;
      const fails = (rec.checks || []).filter((c) => c.status === "FAIL");
      const rate = (Date.now() - started) / n;
      console.log(`${n}/${todo.length} ${page.id} ${viewport} — ${rec.verdict} · ${Math.round((rec.ms || 0) / 100) / 10}s · 글 ${rec.content ? `${rec.content.found}/${rec.content.expected}` : "-"} · 채점 ${rec.grading ? `③${rec.grading.formRight}/${rec.grading.form} ④⑤${rec.grading.composeRight}/${rec.grading.compose} 한글꼴 ${rec.grading.hangulRight}/${rec.grading.hangulForms}` : "-"} · 소리 ${(rec.audio || []).filter((a) => a.status === "PASS").length}/${(rec.audio || []).length}${fails.length ? ` · FAIL: ${fails.slice(0, 3).map((c) => `${c.feature} ${c.item}`).join(" | ")}` : ""}${rec.visitError ? ` · 방문 오류 ${rec.visitError}` : ""} · 남은 ${Math.round(((todo.length - n) * rate) / 60000)}분`);
    }
    if (has("--extra-pages")) {
      const px = H.jsonl(PAGES_JSONL, (r) => `${r.url}|${r.viewport}`);
      for (const x of EXTRA) for (const v of VIEWPORTS) {
        let rec;
        try { rec = await visitExtra(tab, x, v); } catch (err) { rec = { course: COURSE, id: x.id, url: x.url, viewport: v, kind: "extra-page", visitError: String(err && err.message).slice(0, 300), verdict: "FAIL" }; }
        px.write(rec);
        tally[rec.verdict] = (tally[rec.verdict] || 0) + 1;
        console.log(`extra ${x.id} ${v} — ${rec.verdict}${(rec.checks || []).filter((c) => c.status === "FAIL").map((c) => ` · ${c.feature}: ${c.note}`).join("")}`);
      }
    }
  } finally {
    if (tab) await tab.close().catch(() => {});
    browser.proc.kill();
  }
  const secs = (Date.now() - started) / 1000;
  console.log(`끝: PASS ${tally.PASS} · FAIL ${tally.FAIL} · BLOCKED ${tally.BLOCKED} · ${Math.round(secs)}초 · 쪽(강의×화면)당 ${Math.round((secs / todo.length) * 10) / 10}초 · 기록 ${path.relative(process.cwd(), JSONL)}`);
  process.exit(tally.FAIL || tally.BLOCKED ? 1 : 0);
})();
