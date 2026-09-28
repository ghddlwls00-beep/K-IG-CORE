#!/usr/bin/env node
/**
 * PASS-OFF GRAMMAR — 대주제 순서 잠금을 실제 브라우저(헤드리스 Edge 390×844)로 (설계 §5 · 코드 단계 C · 그 점검 반영).
 * 코드 단계 C 의 세션 스크래치 drive-c.cjs 를 저장소로 옮긴 것(점검: 다음 세션 · 사장님이 다시 돌릴 수 있게).
 *
 * 준비는 check-progress-live.mjs 와 같음 — 버리는 시험 비밀값 JSON {LICENSE_SALT, LICENSE_SECRET, ADMIN_PIN,
 * ADMIN_SESSION_SECRET} 을 환경에 넣고 이 작업 트리에서 `npx next dev -p 3461`(R2 값 없이 — 로컬 대체 저장소 data/*.json).
 * 끝나면 data/license-devices.json · data/passoff-progress.json 을 지운다. 비밀값 파일은 커밋하지 않는다.
 *   node docs/pass-off-grammar/검사/drive-topic-lock.cjs --secrets <json> [--base http://localhost:3461] [--break=<아래>]
 *
 *   D1 이용권 없음: 목록 — TOPIC 1 '첫 두 레슨 무료 체험' · TOPIC 2 '이용권 등록 후 열림'(이용권 없는 사람에게 'TOPIC 1을 마치면' 이라고 하지 않음)
 *   D2 STUDENT 이용권(새것): 목록 — '서버에 저장됨' · TOPIC 1 열림(자물쇠 없음) · 해금 기준 · TOPIC 2 'TOPIC 1을 마치면 열림' · 자물쇠 ·
 *      줄마다 'TOPIC 1을 마치면 열림' · 가로 넘침 0
 *   D3 pg01-1 · pg01-2 는 API 로, pg01-3 은 레슨 화면 5단계를 끝까지 · 끝 막대(LessonEndBar)는 5단계 전 '이 강의 학습 완료' 꺼짐 +
 *      '5단계를 모두 마치면 완료할 수 있어요.' — 단계 2-나 E2(완료 방식 통일): 5단계를 마쳐도 저절로 완료되지 않음(D3f — 단추가 켜지고
 *      서버에 기록 없음) → 학습자가 끝 막대를 눌러 완료(D3e '학습 완료함' · 취소 단추 없음) → 화면이 서버에 완료를 보냄(D3b — 구성도
 *      전이라 아직 TOPIC 1) → 대주제 마지막 레슨 끝에 '구성도 다시 채우기'(D3g) → 그 쪽에서 칩을 칸에 놓고 칸마다 규칙 · 문장을 골라
 *      (2번 칸 문장만 일부러 틀림) 결과 · 'TOPIC 2가 열렸어요' · 틀린 칸 레슨(pg01-2)의 복습 문항이 기기 · 서버 모두 앞으로(D3h)
 *   D3r (E2) 레슨 ④ 첫 문장을 틀리고 '내 답도 맞아요' → '신고했어요' · 기기 기록에 신고 · 이용권이라 서버 기록에도(관리자 목록의 재료)
 *   D4 목록 — 'TOPIC 2가 열렸어요.'(점검 3: 2 는 받침 없음) · TOPIC 1 '대주제 완료' · '3 / N개 완료' · TOPIC 2 열림(자물쇠 없음)
 *
 *   2026-09-28 main 합친 뒤(공통 틀 2 — 과정 목록을 새로 짬): 대주제 머리의 칩('학습 가능' · '🔒 잠금' · '확인 중')과 레슨 카드의
 *   '해금 조건 보기' 가 없어지고, 잠긴 대주제는 자물쇠 아이콘(svg aria-label="잠김"), 레슨은 한 줄(상태 글 'TOPIC N을 마치면 열림').
 *   진도율 글('학습 진도율: N / T개 완료')은 h2 가 아니라 '진도' 칸의 글. 단계 탭은 공통 StepTabs(nav aria-label "학습 단계" 그대로).
 *   2026-09-28(작업기록 할 일 5): ③ 보기 · ② 규칙 확인 · ⑤ 다시 확인의 보기가 문항 id 로 정한 순서로 보이므로, 정답은 자리가 아니라
 *   보기의 원래 번호(단추의 data-option)로 누른다.
 *   D5 다시 열면 알림 없음
 *   D6 잠금 화면 pg03-1 'TOPIC 2를 마치면 열려요' · (E2 수정 — 구성도는 대주제 끝) 레슨 전 TOPIC 2 구성도는 서버가 안 받음 · 기기에 남은
 *      완료(pg02-1~3)를 잠금 화면이 보내면 서버에 기록되고 조건 줄에 구성도 쪽 링크가 생김(D6b) · 그 뒤 구성도를 기록하면 레슨이 열림(D6c)
 *   D3h (E2 수정) 틀린 칸 레슨의 복습 문항은 기기 · 서버 모두 '내일'로(오늘 계획엔 없음) · 결과 '… 내일부터 복습에 다시 나와요' · 기기의
 *      당기기 대기열(kig-learning-forward) 비움
 *   (합친 판 2026-09-28 — E1 점검 반영의 이용권마다 기기 칸: 레슨 · 구성도가 쓰는 기록과 당기기 대기열은 이 이용권 칸
 *    `kig-learning:passoff-grammar@<이용권 id>` · `kig-learning-forward:passoff-grammar@<이용권 id>` 에서 읽고, 서버 기록은 그 id 로 물음.
 *    pg01-2 의 씨 기록은 엔진이 스스로 남기는 모양(step 2 · 통과 날 둘 · 마지막 답에서 4일 — 서버의 다시 판정 settleItem 이 그대로 둠))
 *   D7 잠금 화면 가로 넘침 0 · 누를 곳 44px · 콘솔 오류 0(음성 파일이 없어 나는 502 제외)
 *   D8 점검 6: 쪽을 다시 열 때 서버 답이 늦어도 — 기기에 둔 지난 답으로 TOPIC 2~3 이 바로 열려 보임 · 둔 답이 없으면
 *      '진도 확인 중…'(잠김으로 그렸다가 바뀌지 않음)
 *   D9 점검 1(사장님 1분 확인 그대로): 관리자 '진도 초기화' 뒤 같은 기기의 목록 = 서버 기록(0 / N · ✓ 0 · TOPIC 2 잠김 — 잠금과
 *      같은 말), 끝낸 레슨 화면에 '기록되지 않았어요', 잠금 화면에 '아직 기록되지 않은 레슨 … 이 기기에서 마침', 그 레슨을
 *      '처음부터 다시 하기'로 다시 마치면 서버에 기록됨
 *   D10 점검 9: 기기 대기열 — 다른 이용권으로 끝낸 완료는 이 이용권으로 안 보냄(서버에 안 남음 · 대기열에 그대로) · 대주제가
 *      안 열려 거절된 완료는 목록에 안 세고, 그 대주제가 잠긴 동안 기다리다가 열렸다는 답(관리자 수동 해금)이 오면 한 번 더 보내 기록됨
 *
 *   깨기(각각 exit 1 이어야 — 검사가 실패할 수 있음):
 *     --break=seen            알림을 이미 본 것으로 둠 → D4a FAIL
 *     --break=no-pending      D6 에서 남은 완료를 안 넣음 → D6b FAIL
 *     --break=topic-lock-off  서버 답을 '모두 열림'(unlockedThrough 99)으로 바꿔 받음 — 목록 잠금 표시가 없는 판 → D2c · D2d FAIL
 *     --break=no-cache        D8 전에 기기에 둔 답을 지움 → D8a FAIL
 *     --break=no-reset        D9 에서 초기화를 안 누름 → D9a FAIL
 *     --break=same-licence    D10 의 '다른 이용권' 완료를 이 이용권 것으로 적어 넣음(보내져야 하는 판) → D10a FAIL
 *     --break=press-early     5단계 끝 확인(D3f) 전에 끝 막대를 누름 → D3f FAIL(저절로 완료되는 판을 잡을 수 있음)
 *     --break=no-press        끝 막대를 누르지 않음 → D3e · D3b FAIL(누르지 않으면 완료가 서버로 가지 않음)
 *     --break=map-all-right   구성도에서 일부러 틀리지 않음 → D3h FAIL(틀린 칸 레슨 당기기를 보는 칸이 실패할 수 있음)
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const REPO = path.resolve(__dirname, "../../..");
const { launch, Tab, sleep } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/verify/cdp.cjs"));
const ts = require(path.join(REPO, "node_modules/typescript"));
const arg = (name, fallback = null) => {
  const i = process.argv.indexOf(`--${name}`);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`--${name}=`));
  return eq ? eq.slice(name.length + 3) : fallback;
};
const ORIGIN = arg("base", "http://localhost:3461");
const BREAK = arg("break", "");
const BREAKS = ["seen", "no-pending", "topic-lock-off", "no-cache", "no-reset", "same-licence", "press-early", "no-press", "map-all-right"];
if (BREAK && !BREAKS.includes(BREAK)) {
  console.error(`모르는 깨기: ${BREAK} — ${BREAKS.join(" · ")}`);
  process.exit(2);
}
if (!/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(ORIGIN)) {
  console.error(`로컬 서버에만 씁니다 — ${ORIGIN}`);
  process.exit(2);
}
const secretsFile = arg("secrets");
if (!secretsFile || !fs.existsSync(secretsFile)) {
  console.error("--secrets <json> 가 필요합니다(서버를 켤 때 넣은 버리는 시험 비밀값)");
  process.exit(2);
}
const sec = JSON.parse(fs.readFileSync(secretsFile, "utf8"));
const BASE = ORIGIN + "/passoff-grammar/";

const load = (rel) => {
  const js = ts.transpileModule(fs.readFileSync(path.join(REPO, rel), "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const m = { exports: {} };
  new Function("module", "exports", js)(m, m.exports);
  return m.exports;
};
const { viewBlocks } = load("src/lib/passoffView.ts");
const { cutSets } = load("src/lib/passoffLesson.ts");
const index = JSON.parse(fs.readFileSync(path.join(REPO, "content/courses/passoff-grammar.json"), "utf8"));
const total = index.lessons.length;
const titleOf = (id) => (index.lessons.find((l) => l.id === id) || {}).title || id;

const makeKey = (plan) => {
  const nonce = crypto.randomBytes(8).toString("hex").toUpperCase();
  const cs = crypto.createHmac("sha256", sec.LICENSE_SALT).update(`${plan}:${nonce}`).digest("hex").slice(0, 16).toUpperCase();
  return `KIG-${plan}-${nonce}-${cs}`;
};

function lessonView(id) {
  const L = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons/passoff-grammar", `${id}.json`), "utf8"));
  const blocks = viewBlocks(L.blocks);
  const drill = blocks.find((b) => b.type === "drill");
  return {
    anchors: blocks.find((b) => b.type === "anchors").items,
    rule: blocks.find((b) => b.type === "rule"),
    forms: (drill.select || []).filter((s) => !s.reserve),
    produce: drill.produce || [],
    transfers: drill.transfer || [],
    sets: cutSets(drill.produce || []),
  };
}

// ── what the page runs before its own scripts: a hand on the progress API (a slow answer, or — broken on purpose —
// an answer that opens every topic), switched from localStorage so each step can turn it on and off
const FETCH_HAND = `(() => {
  const real = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!url.includes("/api/progress/passoff-grammar")) return real(input, init);
    const method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
    const delay = Number(localStorage.getItem("drive:passoff-get-delay") || 0);
    if (method === "GET" && delay) await new Promise((r) => setTimeout(r, delay));
    const res = await real(input, init);
    if (localStorage.getItem("drive:passoff-open-all") !== "1") return res;
    const data = await res.clone().json().catch(() => null);
    if (!data || !data.progress) return res;
    data.progress.unlockedThrough = 99;
    return new Response(JSON.stringify(data), { status: res.status, headers: { "Content-Type": "application/json" } });
  };
})();`;

// ── page snippets (as stage B's drive.cjs)
const clickIn = (n, text, exact = true) => `(() => {
  const sec = document.querySelector('section[aria-labelledby="passoff-step-${n}"]');
  const b = [...sec.querySelectorAll('button')].find(x => (${exact} ? x.textContent.trim() === ${JSON.stringify(text)} : x.textContent.trim().startsWith(${JSON.stringify(text)})) && !x.disabled && x.getAttribute('aria-disabled') !== 'true' && !x.closest('[hidden]'));
  if (!b) return 'no ' + ${JSON.stringify(text)};
  b.click(); return 'clicked';
})()`;
const clickTab = (i) => `(() => { const b = [...document.querySelectorAll('nav[aria-label="학습 단계"] button')][${i}]; b.click(); return true; })()`;
const setField = (n, selector, value) => `(() => {
  const el = document.querySelector('section[aria-labelledby="passoff-step-${n}"] ${selector}');
  if (!el) return 'no field';
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return 'ok';
})()`;
const workOf = (id) => `JSON.parse(localStorage.getItem('kig:passoff:work:passoff-grammar/${id}') || 'null')`;
const MAIN_TEXT = `(document.querySelector('main') || document.body).innerText.replace(/\\s+/g, ' ')`;
/** a section of the course list: its header text (title · status line · N/M) */
const SECTION = (i) => `(() => { const s = document.getElementById('section-${i}'); return s ? s.querySelector('button[aria-expanded]').innerText.replace(/\\s+/g, ' ').trim() : null; })()`;
/** the section's header carries the lock icon (main's list: svg aria-label="잠김" — a locked topic; none while checking) */
const LOCKED = (i) => `(() => { const s = document.getElementById('section-${i}'); return s ? Boolean(s.querySelector('button[aria-expanded] svg[aria-label="잠김"]')) : null; })()`;
/** the progress sentence '학습 진도율: N / T개 완료 (P%)' — main's list has it in the '진도' (licence) or '무료 체험' box */
const HEAD = `(() => { const b = document.querySelector('section[aria-label="진도"]') || document.querySelector('section[aria-label="무료 체험"]'); return b ? b.innerText.replace(/\\s+/g, ' ') : ''; })()`;
/** the end of the lesson (main's LessonEndBar): the completion button's state and the words around it */
const END_BAR = `(() => { const s = document.querySelector('section[aria-label="강의 마치기"]'); if (!s) return null; const b = s.querySelector('button[aria-label="학습 완료 체크"], button[aria-label="학습 완료 취소"]'); return { text: s.innerText.replace(/\\s+/g, ' '), button: b ? { label: b.getAttribute('aria-label'), disabled: b.disabled } : null, status: Boolean(s.querySelector('[role=status]')) }; })()`;
const API_GET = `fetch('/api/progress/passoff-grammar', { cache: 'no-store' }).then(r => r.json())`;
const OVERFLOW = `document.documentElement.scrollWidth > window.innerWidth + 1`;
const SMALL = `(() => { const out = []; for (const el of document.querySelectorAll('main a[href], main button')) { const r = el.getBoundingClientRect(); if (r.width && r.height && (r.width < 44 || r.height < 44)) out.push((el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 20) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); } return out; })()`;

async function revealAll(tab, count) {
  for (let i = 0; i < count; i++) {
    await sleep(2150);
    const r = await tab.eval(clickIn(1, "영어 보기"));
    if (r !== "clicked") return i;
  }
  return count;
}
async function finishRule(tab, rule) {
  await tab.eval(clickTab(1));
  await sleep(300);
  if (rule.discovery) {
    await tab.eval(`(() => { const g = document.querySelector('#passoff-discovery').parentElement.querySelector('[role=group] button'); g.click(); return true; })()`);
    await sleep(300);
  }
  if (rule.check) {
    // the options come in an order taken from the question (작업기록 할 일 5): the answer by its own index, not its place
    await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="passoff-rule-check"]'); const b = sec.querySelector('[role=group] button[data-option="${rule.check.answer}"]'); b.click(); return true; })()`);
    await sleep(300);
  }
}
async function answerForm(tab, lesson, id) {
  const item = lesson.forms.find((f) => f.id === id);
  if (item.kind === "select") {
    for (const i of item.answer) {
      await tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="낱말 고르기"]'); const el = [...g.children][${i}]; if (el.tagName === 'BUTTON') el.click(); return true; })()`);
      await sleep(120);
      if (item.labels && item.labels.length) {
        const k = item.answer.indexOf(i);
        const label = Array.isArray(item.labelAnswer) ? item.labelAnswer[k] : item.labelAnswer;
        await tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="이름표 고르기"]'); const b = [...g.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(label)}); b.click(); return true; })()`);
        await sleep(120);
      }
    }
    return tab.eval(clickIn(3, "확인"));
  }
  if (item.kind === "choice") {
    return tab.eval(`(() => { const g = document.querySelector('section[aria-labelledby="passoff-step-3"] [aria-label="보기"]'); const b = g.querySelector('button[data-option="${item.answer}"]'); b.click(); return 'clicked'; })()`);
  }
  await tab.eval(setField(3, "input", item.answer[0]));
  await sleep(100);
  return tab.eval(clickIn(3, "확인"));
}
const done = (work, key, id) => Boolean(work && work[key][id] && work[key][id].done);
function formHead(lesson, work) {
  const ids = lesson.forms.map((f) => f.id);
  const kept = ((work && work.formQueue) || []).filter((id) => ids.includes(id) && !done(work, "form", id));
  return (kept.length ? kept : ids.filter((id) => !done(work, "form", id)))[0];
}
function composeHead(lesson, work, list) {
  const setIndex = Math.min((work && work.composeSet) || 0, Math.max(0, lesson.sets.length - 1));
  const ids = list === "transferQueue" ? lesson.transfers.map((t) => t.id) : (lesson.sets[setIndex] || []).map((p) => p.id);
  const kept = ((work && work[list]) || []).filter((id) => ids.includes(id) && !done(work, "compose", id));
  return (kept.length ? kept : ids.filter((id) => !done(work, "compose", id)))[0];
}
/** the five steps of one lesson, every answer right — on the page already open */
async function finishSteps(tab, id) {
  const L = lessonView(id);
  await revealAll(tab, L.anchors.length);
  await finishRule(tab, L.rule);
  await tab.eval(clickTab(2));
  await sleep(400);
  for (let k = 0; k < L.forms.length + 1; k++) {
    const head = formHead(L, await tab.eval(workOf(id)));
    if (!head) break;
    await answerForm(tab, L, head);
    await sleep(300);
    await tab.eval(clickIn(3, "다음"));
    await sleep(450);
  }
  await tab.eval(clickTab(3));
  await sleep(400);
  for (let k = 0; k < L.produce.length + L.sets.length + 2; k++) {
    const head = composeHead(L, await tab.eval(workOf(id)), "composeQueue");
    if (!head) {
      const r = await tab.eval(clickIn(4, "다음 세트"));
      await sleep(500);
      if (r !== "clicked") break;
      continue;
    }
    await tab.eval(setField(4, "textarea", L.produce.find((p) => p.id === head).en));
    await tab.eval(clickIn(4, "확인"));
    await sleep(300);
    await tab.eval(clickIn(4, "다음 문장"));
    await sleep(450);
  }
  await tab.eval(clickTab(4));
  await sleep(400);
  for (let k = 0; k < L.transfers.length; k++) {
    const head = composeHead(L, await tab.eval(workOf(id)), "transferQueue");
    if (!head) break;
    await tab.eval(setField(5, "textarea", L.transfers.find((p) => p.id === head).en));
    await tab.eval(clickIn(5, "확인"));
    await sleep(300);
    await tab.eval(clickIn(5, "다음 문장"));
    await sleep(450);
  }
  if (L.rule.check) {
    await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="passoff-wrap-check"]'); const b = sec.querySelector('[role=group] button[data-option="${L.rule.check.answer}"]'); b.click(); return true; })()`);
    await sleep(900);
  }
  // 단계 2-나 E2: the five steps done — '5단계를 모두 마쳤어요' (before the press) or '레슨 완료 — 5단계를 모두 마쳤어요.' (after)
  return tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.includes('5단계를 모두 마쳤어요')`);
}
/** the end bar's '이 강의 학습 완료' — pressed as a learner does (단계 2-나 E2: the lesson is finished only by this) */
async function pressComplete(tab) {
  const r = await tab.eval(`(() => { const b = document.querySelector('section[aria-label="강의 마치기"] button[aria-label="학습 완료 체크"]'); if (!b || b.disabled) return 'no button'; b.click(); return 'clicked'; })()`);
  await sleep(700);
  return r;
}
/** the map of a topic as the lesson files give it (passoffMap.ts — box i is the topic's i-th lesson) */
function mapOf(topicIndex) {
  return index.groups[topicIndex].lessons.map((id) => {
    const L = lessonView(id);
    return { id, title: titleOf(id), rule: L.rule.title, sentence: L.anchors[0].en };
  });
}
const clickText = (selector, text) => `(() => { const b = [...document.querySelectorAll(${JSON.stringify(selector)})].find((x) => x.textContent.replace(/\\s+/g, ' ').trim() === ${JSON.stringify(text)} && !x.disabled); if (!b) return 'no ' + ${JSON.stringify(text)}; b.click(); return 'clicked'; })()`;
/** "구성도 다시 채우기" on its page: the chips in order, then each box's rule and sentence — `wrongBox`'s sentence another box's */
async function fillMap(tab, map, wrongBox = -1) {
  const log = [];
  for (const lesson of map) {
    log.push(await tab.eval(clickText('[aria-label="레슨 칩"] button', lesson.title)));
    await sleep(150);
  }
  log.push(await tab.eval(clickText("main button", "다음")));
  await sleep(300);
  // the box screen, as a phone shows it: every target 44px, no sideways scroll
  for (const small of await tab.eval(SMALL)) log.push(`작은 것 ${small}`);
  if (await tab.eval(OVERFLOW)) log.push("가로 넘침");
  for (const [box, lesson] of map.entries()) {
    log.push(await tab.eval(clickText('[aria-labelledby="map-rule"] button', lesson.rule)));
    await sleep(100);
    const sentence = box === wrongBox ? map[(box + 1) % map.length].sentence : lesson.sentence;
    log.push(await tab.eval(clickText('[aria-labelledby="map-sentence"] button', sentence)));
    await sleep(100);
    log.push(await tab.eval(clickText("main button", box + 1 < map.length ? "다음 칸" : "결과 보기")));
    await sleep(300);
  }
  return log.filter((x) => x !== "clicked");
}
async function finishLesson(tab, id) {
  await tab.goto(BASE + id, 1800);
  return finishSteps(tab, id);
}
async function waitFor(tab, expr, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await tab.eval(expr).catch(() => false)) return true;
    await sleep(250);
  }
  return false;
}

const results = [];
const check = (label, ok, detail) => {
  results.push({ label, ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}${detail !== undefined ? `  ${JSON.stringify(detail)}` : ""}`);
};

(async () => {
  const profile = path.join(require("os").tmpdir(), `kig-drive-topic-lock-${Date.now()}`);
  const { proc, port } = await launch({ port: 9463, profile });
  const tab = await Tab.open(port);
  try {
    await tab.viewport("mobile");
    await tab.send("Page.addScriptToEvaluateOnNewDocument", { source: FETCH_HAND });

    // D1 no licence
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    const s0 = await tab.eval(SECTION(0));
    const s1 = await tab.eval(SECTION(1));
    check("D1 이용권 없음: TOPIC 1 '첫 두 레슨 무료 체험' · TOPIC 2 '이용권 등록 후 열림'", /첫 두 레슨 무료 체험/.test(s0) && /이용권 등록 후 열림/.test(s1) && !/마치면 열림/.test(s1) && !(await tab.eval(MAIN_TEXT)).includes("서버에 저장됨"), { s0, s1 });

    // a STUDENT pass on this browser, as the licence window would do it
    const key = makeKey("STU1Y");
    const activated = await tab.eval(`(async () => {
      const dev = localStorage.getItem('kig:device:id:v1');
      const r = await fetch('/api/license/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, deviceId: dev, deviceName: 'topic lock drive' }) });
      const d = await r.json();
      if (!d.success) return d.error || r.status;
      localStorage.setItem('kig:license:v1', JSON.stringify({ maskedKey: d.maskedKey, licenseId: d.licenseId, plan: d.plan, activatedAt: d.activatedAt || Date.now(), expiresAt: d.expiresAt, token: d.licenseToken }));
      return 'ok';
    })()`);
    if (activated !== "ok") throw new Error(`activation failed: ${activated}`);
    const licenseId = await tab.eval(`JSON.parse(localStorage.getItem('kig:license:v1')).licenseId`);
    if (BREAK === "seen") await tab.eval(`localStorage.setItem('kig:passoff:seen-topic:${licenseId}', '99'), true`);
    if (BREAK === "topic-lock-off") await tab.eval(`localStorage.setItem('drive:passoff-open-all', '1'), true`);

    // D2 the list with a fresh licence
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    const a0 = await tab.eval(SECTION(0));
    const a1 = await tab.eval(SECTION(1));
    const lock0 = await tab.eval(LOCKED(0));
    const lock1 = await tab.eval(LOCKED(1));
    check("D2a '서버에 저장됨'", (await tab.eval(MAIN_TEXT)).includes("서버에 저장됨"));
    check("D2b TOPIC 1: 열림(자물쇠 없음) · '레슨 3개와 마지막 레슨, 구성도 다시 채우기를 마치면 다음 대주제'", lock0 === false && /레슨 3개와 마지막 레슨, 구성도 다시 채우기를 마치면 다음 대주제/.test(a0), { a0, lock0 });
    check("D2c TOPIC 2: 'TOPIC 1을 마치면 열림' · 자물쇠", /TOPIC 1을 마치면 열림/.test(a1) && lock1 === true, { a1, lock1 });
    await tab.eval(`document.querySelector('#section-1 button[aria-expanded]').click(), true`);
    await sleep(500);
    // textContent: main's rows are content-visibility:auto, so a row below the screen has an empty innerText
    const cards = await tab.eval(`[...document.querySelectorAll('#section-1 li')].map(li => li.textContent.replace(/\\s+/g, ' '))`);
    check("D2d TOPIC 2 레슨 줄마다 'TOPIC 1을 마치면 열림'", cards.length > 0 && cards.every((c) => c.includes("TOPIC 1을 마치면 열림")), cards[0]);
    check("D2e 목록 가로 넘침 0", (await tab.eval(OVERFLOW)) === false);
    if (BREAK === "topic-lock-off") await tab.eval(`localStorage.removeItem('drive:passoff-open-all'), true`);

    // D3 pg01-1 · pg01-2 by the API, pg01-3 through its five steps — and the learner's press
    const pre = await tab.eval(`fetch('/api/progress/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: [{ lessonId: 'pg01-1', completed: true }, { lessonId: 'pg01-2', completed: true }] }) }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    // pg01-2's review items on this device, learned five days ago, answered right four days ago and yesterday, and not due
    // for three more days (step 2 — the state the engine itself leaves; the server's re-judging, E1's settleItem, keeps it)
    // — the map's missed box brings them forward (D3h). 합친 판: in THIS licence's record on the device
    // ("kig-learning:passoff-grammar@<licence id>" — E1's records per licence), which the lesson and the map page write to
    const seedAt = Date.now() - 5 * 86_400_000;
    const learningDay = (ms) => new Date(ms + 5 * 3_600_000).toISOString().slice(0, 10);
    const pg012 = lessonView("pg01-2");
    const seedKeys = [...pg012.produce.map((p) => [p.id, "produce"]), ...pg012.transfers.map((t) => [t.id, "transfer"])];
    const seedDay = learningDay(seedAt);
    const yesterday = learningDay(Date.now() - 86_400_000);
    const later = learningDay(Date.now() + 3 * 86_400_000);
    const LEARNER_SLOT = `kig-learning:passoff-grammar@${licenseId}`;
    await tab.eval(`(() => {
      const record = { v: 1, course: 'passoff-grammar', lessons: { 'pg01-2': { at: ${JSON.stringify(new Date(seedAt).toISOString())}, day: ${JSON.stringify(seedDay)} } }, items: {}, log: [], reports: [], lastStudyDay: ${JSON.stringify(yesterday)} };
      for (const [key, kind] of ${JSON.stringify(seedKeys)}) record.items[key] = { lessonId: 'pg01-2', kind, stage: 'learning', firstDay: ${JSON.stringify(seedDay)}, dueDay: ${JSON.stringify(later)}, step: 2, passDays: [${JSON.stringify(learningDay(Date.now() - 4 * 86_400_000))}, ${JSON.stringify(yesterday)}], lastDay: ${JSON.stringify(yesterday)}, lastCorrect: true, reviewDay: ${JSON.stringify(yesterday)}, lapses: 0 };
      localStorage.setItem(${JSON.stringify(LEARNER_SLOT)}, JSON.stringify(record));
      return true;
    })()`);
    await tab.goto(BASE + "pg01-3", 1800);
    // D3r "내 답도 맞아요" inside the lesson: ④'s first sentence answered wrong, reported, then fixed
    const L013 = lessonView("pg01-3");
    const firstSentence = L013.sets[0][0];
    const wrongOwn = "Zq my lesson answer is right.";
    await tab.eval(clickTab(3));
    await sleep(400);
    await tab.eval(setField(4, "textarea", wrongOwn));
    await tab.eval(clickIn(4, "확인"));
    await sleep(400);
    const lessonReport = await tab.eval(`(() => { const sec = document.querySelector('section[aria-labelledby="passoff-step-4"]'); const b = sec && sec.querySelector('[data-my-answer-report="button"]'); if (!b) return 'no button'; b.click(); return 'clicked'; })()`);
    await sleep(400);
    const lessonNote = await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-4"]').innerText.includes('신고했어요')`);
    await tab.eval(setField(4, "textarea", firstSentence.en));
    await tab.eval(clickIn(4, "다시 확인"));
    await sleep(400);
    await tab.eval(clickIn(4, "다음 문장"));
    await sleep(500);
    const deviceReports = await tab.eval(`(JSON.parse(localStorage.getItem(${JSON.stringify(LEARNER_SLOT)}) || '{"reports":[],"log":[]}')).reports.filter(r => r.item === ${JSON.stringify(firstSentence.id)})`);
    // this licence's record as the server keeps it (the record is not sent: nothing of the device's goes up with this ask)
    const SERVER_RECORD = `fetch('/api/learning/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ record: null, owner: ${JSON.stringify(licenseId)}, planOnly: true }) }).then(r => r.json())`;
    const serverReports = await (async () => {
      const end = Date.now() + 8000;
      while (Date.now() < end) {
        const list = await tab.eval(`${SERVER_RECORD}.then(d => (d.record && d.record.reports || []).filter(r => r.item === ${JSON.stringify(firstSentence.id)}))`);
        if (list.length) return list;
        await sleep(400);
      }
      return [];
    })();
    check(`D3r 레슨 ④ 첫 문장(${firstSentence.id})을 틀림 → '내 답도 맞아요' → '신고했어요' · 기기 기록에 신고 1(내 답 그대로 · pending) · 이용권이라 서버 기록에도 올라감`,
      lessonReport === "clicked" && lessonNote && deviceReports.length === 1 && deviceReports[0].answer === wrongOwn && deviceReports[0].status === "pending" &&
        serverReports.length === 1 && serverReports[0].answer === wrongOwn,
      { lessonReport, lessonNote, deviceReports, serverReports });
    // the five steps from the start of the page (the view comes back to the first step not done)
    await tab.goto(BASE + "pg01-3", 1800);
    const barBefore = await tab.eval(END_BAR);
    check("D3d 끝 막대(5단계 전): '이 강의 학습 완료' 꺼짐 · '5단계를 모두 마치면 완료할 수 있어요.'",
      Boolean(barBefore && barBefore.button && barBefore.button.label === "학습 완료 체크" && barBefore.button.disabled && barBefore.text.includes("5단계를 모두 마치면 완료할 수 있어요.")), barBefore);
    const finished = await finishSteps(tab, "pg01-3");
    check("D3a pg01-3 레슨 화면 5단계 끝 — '5단계를 모두 마쳤어요'", finished === true && pre === 1, { pre, finished });
    // 단계 2-나 E2: nothing finishes by itself — the button is on, the server has nothing, the step says to press it
    if (BREAK === "press-early") await pressComplete(tab);
    await sleep(1500);
    const barReady = await tab.eval(END_BAR);
    const serverBefore = await tab.eval(`${API_GET}.then(d => Boolean(d.progress.lessons['pg01-3']))`);
    const step5 = await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.replace(/\\s+/g, ' ')`);
    check("D3f 5단계를 마쳐도 저절로 완료되지 않음 — 끝 막대 '이 강의 학습 완료' 켜짐 · 서버에 pg01-3 없음 · 5단계에 '누르면 레슨이 완료돼요'",
      Boolean(barReady && barReady.button && barReady.button.label === "학습 완료 체크" && !barReady.button.disabled) && serverBefore === false && step5.includes("누르면 레슨이 완료돼요") && !step5.includes("레슨 완료 —"),
      { barReady, serverBefore, step5: step5.slice(-120) });
    const pressed = BREAK === "no-press" || BREAK === "press-early" ? "skipped" : await pressComplete(tab);
    const barAfter = await tab.eval(END_BAR);
    check("D3e 끝 막대를 누름 → '학습 완료함' — 취소 단추 없음(서버는 완료만 받음) · 5단계 '레슨 완료'",
      pressed !== "no button" && Boolean(barAfter && barAfter.button === null && barAfter.status && barAfter.text.includes("학습 완료함") && !barAfter.text.includes("취소")) &&
        (await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.includes('레슨 완료')`)),
      { pressed, barAfter });
    const synced = await waitFor(tab, `${API_GET}.then(d => Boolean(d.progress.lessons['pg01-3']) && d.progress.unlockedThrough === 1 && d.progress.mapRefillRequired === true)`);
    const state = await tab.eval(`${API_GET}.then(d => ({ u: d.progress.unlockedThrough, map: d.progress.mapRefillRequired, pg013: d.progress.lessons['pg01-3'] || null }))`);
    check("D3b 누른 완료가 서버로(레슨 화면 → PassoffProgressProvider → API) · 구성도 전이라 아직 TOPIC 1", synced, state);
    const pending = await tab.eval(`localStorage.getItem('kig:passoff:pending:v1')`);
    check("D3c 기기의 보낼 목록이 비워짐", pending === "[]", pending);
    const entry = await tab.eval(`(() => { const e = document.querySelector('[data-passoff-map-entry="1"]'); return e ? { text: e.innerText.replace(/\\s+/g, ' '), href: (e.querySelector('a') || {}).getAttribute ? e.querySelector('a').getAttribute('href') : null } : null; })()`);
    check("D3g 대주제 마지막 레슨 끝: 'TOPIC 1 마무리 — 구성도 다시 채우기' · /passoff-grammar/map?topic=1",
      Boolean(entry && entry.text.includes("TOPIC 1 마무리") && entry.href === "/passoff-grammar/map?topic=1"), entry);
    // the map page, from that link
    const map1 = mapOf(0);
    if (entry && entry.href) await tab.eval(`document.querySelector('[data-passoff-map-entry="1"] a').click(), true`);
    await waitFor(tab, `Boolean(document.querySelector('[data-passoff-map-stage="place"]'))`, 10000);
    const mapSmall = await tab.eval(SMALL);
    const mapOverflow = await tab.eval(OVERFLOW);
    const missedBox = BREAK === "map-all-right" ? -1 : 1;
    const fillLog = await fillMap(tab, map1, missedBox);
    const saved = await waitFor(tab, `Boolean(document.querySelector('[data-passoff-map-saved]'))`, 10000);
    const result = await tab.eval(`(() => { const s = document.querySelector('[data-passoff-map-stage="result"]'); return s ? s.innerText.replace(/\\s+/g, ' ') : null; })()`);
    mapSmall.push(...(await tab.eval(SMALL)));
    const resultOverflow = await tab.eval(OVERFLOW);
    const after = await tab.eval(`${API_GET}.then(d => ({ u: d.progress.unlockedThrough, refilled: d.progress.topics[0].mapRefilled }))`);
    const device = await tab.eval(`JSON.parse(localStorage.getItem(${JSON.stringify(LEARNER_SLOT)}) || 'null')`);
    // E2 수정: the wrong box's lesson comes back TOMORROW (never today — see practice.ts applyBringForward)
    const tomorrow = learningDay(Date.now() + 86_400_000);
    const deviceMoved = seedKeys.length > 0 && seedKeys.every(([key]) => device && device.items[key] && device.items[key].dueDay === tomorrow);
    const server = await tab.eval(SERVER_RECORD);
    const serverMoved = seedKeys.every(([key]) => server && server.record && server.record.items[key] && server.record.items[key].dueDay === tomorrow);
    const notToday = Boolean(server && server.plan && !server.plan.items.some((i) => i.lessonId === "pg01-2"));
    // 합친 판: the queue is this licence's ("kig-learning-forward:<course>@<licence id>")
    const queueLeft = await tab.eval(`localStorage.getItem(${JSON.stringify(`kig-learning-forward:passoff-grammar@${licenseId}`)})`);
    check(`D3h 구성도 다시 채우기(2번 칸 문장만 틀림): 결과 '칸 ${map1.length}개 중 ${map1.length - 1}개' · '2인칭 … 내일부터 복습에 다시 나와요' · 'TOPIC 2가 열렸어요' · 서버 구성도 기록 · 2인칭 복습 문항이 기기 · 서버 모두 ${tomorrow}(내일)로 · 오늘 계획엔 없음 · 기기 대기열 비움 · 44px 미만 0 · 넘침 0`,
      fillLog.length === 0 && saved && result && result.includes(`칸 ${map1.length}개 중 ${map1.length - 1}개`) && result.includes(`${titleOf("pg01-2")}`) && result.includes("내일부터 복습에 다시 나와요") &&
        result.includes("TOPIC 2가 열렸어요") && after.u === 2 && after.refilled === true && deviceMoved && serverMoved && notToday && queueLeft === null && mapSmall.length === 0 && mapOverflow === false && resultOverflow === false,
      { fillLog, saved, result: result && result.slice(0, 200), after, deviceMoved, serverMoved, notToday, queueLeft, mapSmall });

    // D4 back to the list
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    const toast = await waitFor(tab, `[...document.querySelectorAll('[role=status]')].some(e => e.innerText.includes('TOPIC 2가 열렸어요.'))`, 6000);
    check("D4a 'TOPIC 2가 열렸어요.'", toast);
    const b0 = await tab.eval(SECTION(0));
    const b1 = await tab.eval(SECTION(1));
    const unlocked1 = (await tab.eval(LOCKED(1))) === false;
    const head = await tab.eval(HEAD);
    check("D4b TOPIC 1 '대주제 완료' / TOPIC 2 열림(자물쇠 없음 · '마치면 열림' 없음)", /대주제 완료/.test(b0) && unlocked1 && !/마치면 열림/.test(b1), { b0, b1, unlocked1 });
    check(`D4c 진도율 '3 / ${total}개 완료'(pg01-1 · pg01-2 는 서버에서 온 완료)`, head.includes(`3 / ${total}개 완료`), head);
    await sleep(5600); // the notice's five seconds — then it counts as said

    // D5 not again
    await tab.goto(ORIGIN + "/passoff-grammar", 2500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(800);
    const again = await tab.eval(`[...document.querySelectorAll('[role=status]')].some(e => e.innerText.includes('열렸어요'))`);
    check("D5 다시 열면 알림 없음", again === false);

    // D6 the lock screen, and a completion still on this device
    await tab.goto(BASE + "pg03-1", 2000);
    const lockText = await tab.eval(MAIN_TEXT);
    check("D6a pg03-1 잠금 화면 'TOPIC 2를 마치면 열려요' · 지금 대주제 TOPIC 2 · 아직 기록되지 않은 레슨 3", lockText.includes("순차 학습 잠금") && lockText.includes("TOPIC 2를 마치면 열려요") && lockText.includes(index.groups[1].label) && ["pg02-1", "pg02-2", "pg02-3"].every((id) => lockText.includes(titleOf(id))), lockText.slice(0, 200));
    check("D7a 잠금 화면: 가로 넘침 0 · 누를 곳 44px 미만 0", (await tab.eval(OVERFLOW)) === false && (await tab.eval(SMALL)).length === 0, await tab.eval(SMALL));
    // E2 수정: TOPIC 2's map refill is taken only after its lessons, so it cannot go first — sent before them it is refused
    const map2Early = await tab.eval(`fetch('/api/progress/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: [{ mapRefillTopic: 2 }] }) }).then(r => r.json()).then(d => d.progress.topics[1].mapRefilled)`);
    check("D6 레슨 전 TOPIC 2 구성도 → 서버가 안 받음(구성도는 대주제 레슨을 마친 뒤)", map2Early === false, map2Early);
    const map2Link = `Boolean(document.querySelector('main a[href="/passoff-grammar/map?topic=2"]'))`;
    const linkBefore = await tab.eval(map2Link);
    if (BREAK !== "no-pending") {
      await tab.eval(`localStorage.setItem('kig:passoff:pending:v1', JSON.stringify(['pg02-1','pg02-2','pg02-3'].map((lessonId, i) => ({ lessonId, completed: true, clientUpdatedAt: Date.now() + i, licence: ${JSON.stringify(licenseId)} })))), true`);
    }
    // the lock screen sends what is still queued; the server's answer counts TOPIC 2's lessons, and its map condition links the map
    await tab.goto(BASE + "pg03-1", 500);
    const linked = await waitFor(tab, map2Link, 12000);
    const recorded6 = await tab.eval(`${API_GET}.then(d => ['pg02-1','pg02-2','pg02-3'].every((id) => d.progress.lessons[id] && d.progress.lessons[id].completed) && d.progress.unlockedThrough === 2)`);
    check("D6b 기기에 남은 완료(pg02-1~3)를 잠금 화면이 보냄 → 서버에 기록 · TOPIC 3 은 아직(구성도만 남음) · 조건 줄에 구성도 쪽 링크가 생김(보내기 전에는 없음)",
      linkBefore === false && linked && recorded6, { linkBefore, linked, recorded6, text: (await tab.eval(MAIN_TEXT)).slice(0, 160) });
    // TOPIC 2's map refill (the page itself is driven in D3h) — then the lesson opens
    await tab.eval(`fetch('/api/progress/passoff-grammar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates: [{ mapRefillTopic: 2 }] }) }).then(r => r.json()).then(d => d.progress.topics[1].mapRefilled)`);
    await tab.goto(BASE + "pg03-1", 500);
    const opened = await waitFor(tab, `${MAIN_TEXT}.includes('예문 떠올리기') && !${MAIN_TEXT}.includes('순차 학습 잠금')`, 12000);
    check("D6c 레슨을 마친 뒤 TOPIC 2 구성도를 기록하면 pg03-1 레슨이 열림", opened, (await tab.eval(MAIN_TEXT)).slice(0, 120));

    // D8 점검 6 — a page opened again while the server's answer is slow
    await tab.goto(ORIGIN + "/passoff-grammar", 2500); // the list asks once, so this device keeps the answer (TOPIC 3 open)
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    if (BREAK === "no-cache") await tab.eval(`Object.keys(localStorage).filter(k => k.startsWith('kig:passoff:answer:')).forEach(k => localStorage.removeItem(k)), true`);
    await tab.eval(`localStorage.setItem('drive:passoff-get-delay', '7000'), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 300);
    // TOPIC 3 drawn open from the answer kept on this device: its header there, no lock, not '확인 중', not 'N을 마치면 열림'
    const early = await waitFor(tab, `(() => { const t = ${SECTION(2)}; return t !== null && ${LOCKED(2)} === false && !/확인 중|마치면 열림/.test(t); })()`, 4000);
    const e2 = await tab.eval(SECTION(2));
    const syncing = (await tab.eval(MAIN_TEXT)).includes("진도를 서버와 맞추는 중");
    check("D8a 서버 답이 오기 전(7초 늦춤): 기기에 둔 지난 답으로 TOPIC 3 열림(잠김으로 그리지 않음)", early && syncing && !/마치면 열림/.test(e2), { e2, syncing });
    await tab.eval(`Object.keys(localStorage).filter(k => k.startsWith('kig:passoff:answer:')).forEach(k => localStorage.removeItem(k)), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 300);
    const checking = await waitFor(tab, `(${SECTION(2)} || '').includes('진도 확인 중')`, 4000);
    const c2 = await tab.eval(SECTION(2));
    check("D8b 둔 답이 없는 기기: 서버 답 전에는 '진도 확인 중…' · '확인 중'(TOPIC 2~ 를 잠김으로 그리지 않음)", checking && /확인 중/.test(c2) && !/마치면 열림/.test(c2), c2);
    await tab.eval(`localStorage.removeItem('drive:passoff-get-delay'), true`);

    // D9 점검 1 — the owner resets this code; the same phone opens the list again
    const login = await tab.eval(`fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: ${JSON.stringify(sec.ADMIN_PIN)} }) }).then(r => r.json()).then(d => d.success)`);
    let reset = "skipped";
    if (BREAK !== "no-reset") {
      reset = await tab.eval(`fetch('/api/admin/passoff-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, action: 'reset' }) }).then(r => r.json()).then(d => d.progress.unlockedThrough + '/' + d.progress.completedLessons)`);
    }
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const r0 = await tab.eval(SECTION(0));
    const r1 = await tab.eval(SECTION(1));
    const rHead = await tab.eval(HEAD);
    const deviceStillHas = await tab.eval(`JSON.parse(localStorage.getItem('kig:progress:completed') || '{}')['passoff-grammar:pg01-3'] === true`);
    check(`D9a 초기화 뒤 같은 기기 목록 = 서버 기록: '0 / ${total}개 완료' · TOPIC 1 완료 0('0/N') · TOPIC 2 'TOPIC 1을 마치면 열림'(기기 기록 pg01-3 은 남아 있어도)`,
      login === true && rHead.includes(`0 / ${total}개 완료`) && /(^|\s)0\/\d+$/.test(r0) && /TOPIC 1을 마치면 열림/.test(r1) && deviceStillHas,
      { reset, rHead, r0, r1, deviceStillHas });
    await tab.goto(BASE + "pg01-3", 1800);
    await tab.eval(clickTab(4));
    await waitFor(tab, `document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.includes('기록되지 않았어요')`, 6000);
    const view = await tab.eval(`document.querySelector('section[aria-labelledby="passoff-step-5"]').innerText.replace(/\\s+/g, ' ')`);
    check("D9b 끝낸 레슨 pg01-3 화면: '레슨 완료' 와 함께 '이 이용권의 진도에는 아직 이 레슨이 기록되지 않았어요'", view.includes("레슨 완료") && view.includes("기록되지 않았어요") && view.includes("처음부터 다시 하기"), view.slice(-160));
    await tab.goto(BASE + "pg02-1", 1800);
    const lock2 = await tab.eval(MAIN_TEXT);
    check("D9c 잠금 화면 pg02-1: 아직 기록되지 않은 레슨에 '3인칭 … 이 기기에서 마침' · 다시 하기 안내", lock2.includes("TOPIC 1을 마치면 열려요") && lock2.includes("아직 기록되지 않은 레슨") && lock2.includes("이 기기에서 마침") && lock2.includes("처음부터 다시 하기"), lock2.slice(0, 260));
    // the way back: 'start again' on pg01-3 and its five steps once more
    await tab.goto(BASE + "pg01-3", 1800);
    await tab.eval(`window.confirm = () => true, true`);
    await tab.eval(clickTab(4));
    await sleep(400);
    await tab.eval(clickIn(5, "처음부터 다시 하기"));
    await sleep(800);
    const redone = await finishSteps(tab, "pg01-3");
    const recorded = await waitFor(tab, `${API_GET}.then(d => Boolean(d.progress.lessons['pg01-3'] && d.progress.lessons['pg01-3'].completed))`);
    check("D9d '처음부터 다시 하기' 로 pg01-3 을 다시 마치면 서버에 기록됨", redone === true && recorded, { redone, recorded });

    // D10 점검 9 — the queue belongs to the licence each completion was finished under
    const QUEUE = `JSON.parse(localStorage.getItem('kig:passoff:pending:v1') || '[]')`;
    const other = BREAK === "same-licence" ? licenseId : "another-licence-on-this-device";
    await tab.eval(`localStorage.setItem('kig:passoff:pending:v1', JSON.stringify([
      { lessonId: 'pg01-1', clientUpdatedAt: Date.now(), licence: ${JSON.stringify(other)} },
      { lessonId: 'pg05-1', clientUpdatedAt: Date.now() + 1, licence: ${JSON.stringify(licenseId)} },
    ])), true`);
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const server10 = await tab.eval(`${API_GET}.then(d => ({ pg011: Boolean(d.progress.lessons['pg01-1']), pg051: Boolean(d.progress.lessons['pg05-1']), u: d.progress.unlockedThrough }))`);
    const queue1 = await tab.eval(QUEUE);
    const head10 = await tab.eval(HEAD);
    check("D10a 다른 이용권으로 끝낸 pg01-1 은 안 보냄(서버에 없음 · 대기열에 그대로)", !server10.pg011 && queue1.some((i) => i.lessonId === "pg01-1" && i.licence === other), { server10, queue1 });
    check(`D10b 대주제가 안 열린 pg05-1 은 서버가 거절 → 대기열에 '한 번 더' 표시 · 목록에 안 셈('1 / ${total}' — pg01-3 만)`,
      !server10.pg051 && queue1.some((i) => i.lessonId === "pg05-1" && i.refused === true) && head10.includes(`1 / ${total}개 완료`), { queue1, head10 });
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    await waitFor(tab, `${MAIN_TEXT}.includes('서버에 저장됨')`);
    await sleep(600);
    const queue2 = await tab.eval(QUEUE);
    check("D10c TOPIC 5 가 아직 잠긴 동안 pg05-1 은 기다림(다시 열어도 대기열에 그대로 · 안 보냄)", queue2.some((i) => i.lessonId === "pg05-1" && i.refused === true), queue2);
    // the owner opens TOPIC 5 by hand: the next answer shows it open, and the waiting completion goes once more
    const opened5 = await tab.eval(`fetch('/api/admin/passoff-progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: ${JSON.stringify(key)}, action: 'setTopic', topic: 5 }) }).then(r => r.json()).then(d => d.progress.unlockedThrough)`);
    await tab.goto(ORIGIN + "/passoff-grammar", 1500);
    const went = await waitFor(tab, `${API_GET}.then(d => Boolean(d.progress.lessons['pg05-1'] && d.progress.lessons['pg05-1'].completed))`, 8000);
    const queue3 = await tab.eval(QUEUE);
    check("D10d 관리자가 TOPIC 5 까지 열면 기다리던 pg05-1 이 서버에 기록되고 대기열에서 빠짐 · 다른 이용권 것은 그대로",
      opened5 === 5 && went && !queue3.some((i) => i.lessonId === "pg05-1") && queue3.some((i) => i.lessonId === "pg01-1"), { opened5, went, queue3 });

    const errs = [...tab.events.console, ...tab.events.exceptions].filter((e) => !/502|Failed to load resource/.test(e));
    check("D7b 콘솔 오류 · 예외 0(음성 파일 502 제외)", errs.length === 0, errs.slice(0, 5));
  } finally {
    await tab.close();
    proc.kill();
    await sleep(800);
    try {
      fs.rmSync(profile, { recursive: true, force: true });
    } catch {}
  }
  const bad = results.filter((r) => !r.ok);
  console.log(`\n${BREAK ? `[--break=${BREAK}] ` : ""}${results.length - bad.length}/${results.length} ok`);
  process.exit(bad.length ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
