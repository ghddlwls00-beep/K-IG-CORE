// fix2-app 작은 시험 — P1 · P4 · P5. BEFORE=1 이면 고치기 전 판(git HEAD)으로 돌려 실패를 봄(깨기).
//   node check-fix2-app.cjs            → 모두 PASS 기대
//   set BEFORE=1 && node check-fix2-app.cjs → P1 · P4 · P5 FAIL 기대
const fs = require("fs");
const path = require("path");
const { REPO, BEFORE, load } = require("./tsreq.cjs");

const results = [];
const check = (name, ok, saw) => {
  results.push({ name, ok: !!ok, saw });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${saw !== undefined ? " — " + (typeof saw === "string" ? saw : JSON.stringify(saw)) : ""}`);
};
const src = (rel) => {
  if (!BEFORE) return fs.readFileSync(path.join(REPO, rel), "utf8");
  try {
    return require("child_process").execFileSync("git", ["show", `HEAD:${rel}`], { cwd: REPO, encoding: "utf8" });
  } catch {
    return "";
  }
};

// ---------------------------------------------------------------- P1 — 끝 화면 '오늘 더 할 수 있는 문항'
{
  const engine = load("src/lib/learning/engine.ts");
  const review = load("src/lib/learning/review.ts");
  const day = load("src/lib/learning/day.ts");
  const { PASSOFF_PROFILE } = load("src/lib/passoffLearning.ts");
  const now = Date.now();
  const today = day.learningDay(now);
  const yesterdayMs = now - 86_400_000;
  // s3d 와 같은 꼴: 어제 마친 강의 셋(22 · 15 · 21문항, 모두 영작 25초) — 하루 분량 600초에 첫 강의만 들어감
  const record = engine.emptyRecord("passoff-grammar");
  const lessons = [["pg01-1", 22], ["pg01-2", 15], ["pg01-3", 21]];
  for (const [id, n] of lessons) {
    engine.applyLessonDone(record, id, yesterdayMs, Array.from({ length: n }, (_, i) => ({ key: `${id}:p${i + 1}`, kind: "produce" })));
  }
  const listCount = (r) => engine.planDay(r, today, PASSOFF_PROFILE).items.length; // ReviewEntry 의 count(plan.items.length)
  const steps = [];
  for (let round = 0; round < 3; round += 1) {
    const plan = engine.planDay(record, today, PASSOFF_PROFILE);
    for (const item of plan.items) {
      engine.applyAttempt(record, item.key, { lessonId: item.lessonId, kind: item.kind, correct: true, help: "none", mode: "typed", where: "review" }, now, PASSOFF_PROFILE);
    }
    const s = review.reviewSummary(record, today, PASSOFF_PROFILE);
    steps.push({ answered: plan.items.length, moreToday: s.moreToday, list: listCount(record), tomorrow: s.tomorrow });
  }
  check("P1 첫 복습(22) 뒤 끝 화면 '오늘 더' = 목록 '오늘 복습' 수(15)", steps[0].moreToday === steps[0].list && steps[0].list === 15, steps[0]);
  check("P1 두 번째(15) 뒤 '오늘 더' = 목록(21)", steps[1].moreToday === steps[1].list && steps[1].list === 21, steps[1]);
  check("P1 세 번째(21) 뒤 '오늘 더' 0 · 목록 0(줄 안 보임)", steps[2].moreToday === 0 && steps[2].list === 0, steps[2]);
  check("P1 하루 분량 규칙 그대로(첫 계획 22 · 둘째 15 · 셋째 21)", steps.map((s) => s.answered).join() === "22,15,21", steps.map((s) => s.answered));

  const rs = src("src/components/learning/ReviewSession.tsx");
  check("P1 끝 화면에 '오늘 더 할 수 있는 문항' 줄(N>0 일 때만)", /summary\.moreToday > 0 \?/.test(rs) && rs.includes("오늘 더 할 수 있는 문항"));
  check("P1 이용권: 서버 계획 수(synced.answer.plan.items.length) — 목록과 같은 셈", rs.includes("moreToday: synced.answer.plan.items.length") && rs.includes("moreToday: plan.items.length"));
}

// ---------------------------------------------------------------- P4 — LISTENING · READING '-1' 완료
{
  let pair = null;
  try {
    pair = load("src/lib/lessonPair.ts");
  } catch (e) {
    pair = null;
  }
  const pp = src("src/components/ProgressProvider.tsx");
  const cd = src("src/components/CourseDashboard.tsx");
  // ProgressProvider 의 isCompleted · toggleComplete 와 CourseDashboard 의 셈을 그 코드 그대로 흉내 냄(판마다 그 판의 규칙)
  const usesPair = pair && /pairCompleted\(completed, course, lessonId\)/.test(pp) && /isDoneHere\(id\)\) count\+\+/.test(cd);
  const isCompleted = (completed, course, id) => (usesPair ? pair.pairCompleted(completed, course, id) : Boolean(completed[`${course}:${id}`]));
  const toggle = (completed, course, id) => {
    const next = { ...completed };
    const willBe = !isCompleted(completed, course, id);
    if (willBe) next[`${course}:${id}`] = true;
    else delete next[`${course}:${id}`];
    if (usesPair && !willBe) {
      const other = pair.pairedLessonId(course, id);
      if (other) delete next[`${course}:${other}`];
    }
    return next;
  };
  const countListed = (completed, course, listed) => listed.filter((id) => isCompleted(completed, course, id)).length;
  const ldListed = ["d001", "d002", "d003"];
  let c = {};
  c = toggle(c, "ld", "d002-1");
  check("P4 ld '-1' 쪽 완료 → 목록 진행률 1 · 본 강의 줄 완료", countListed(c, "ld", ldListed) === 1 && isCompleted(c, "ld", "d002"), c);
  check("P4 본 쪽에서도 완료로 보임(같은 강의)", isCompleted(c, "ld", "d002"));
  const undoneOnMain = toggle(c, "ld", "d002");
  check("P4 본 쪽에서 완료 취소 → 둘 다 풀림 · 진행률 0", countListed(undoneOnMain, "ld", ldListed) === 0 && !isCompleted(undoneOnMain, "ld", "d002-1"), undoneOnMain);
  const both = toggle({ "ld:d003": true }, "ld", "d003-1");
  check("P4 본 쪽 완료 뒤 '-1' 에서 누르면 취소(같은 강의 한 번 셈) · 진행률 0", countListed(both, "ld", ldListed) === 0, both);
  check("P4 이미 '-1' 만 완료된 기기 기록 {reading:pr024-1} → 목록에 셈", countListed({ "reading:pr024-1": true }, "reading", ["pr023", "pr024"]) === 1);
  check("P4 본 + '-1' 둘 다 완료여도 한 강의로 셈(1)", countListed({ "reading:pr024": true, "reading:pr024-1": true }, "reading", ["pr024"]) === 1);
  // 다른 과정은 그대로
  check("P4 GRAMMAR II gh2-009-1 완료는 본 강의로 안 셈(설계 그대로)", countListed({ "grammar2:gh2-009-1": true }, "grammar2", ["gh2-009"]) === 0);
  check("P4 VOCA · STUDENT 영향 없음", countListed({ "phonics:mv1-01": true, "student:s1-1": true }, "phonics", ["mv1-01", "mv1-02"]) === 1 && !isCompleted({ "student:s1-10": true }, "student", "s1-1"));
  if (pair) {
    // 실제 강의 번호: ld 276 · reading 256 쌍 모두 짝이 맞는지, 다른 과정 번호는 짝 없음
    const idx = (c) => {
      const j = JSON.parse(fs.readFileSync(path.join(REPO, `content/courses/${c}.json`), "utf8"));
      return Array.isArray(j.lessons) ? j.lessons : Object.values(j.lessons || j);
    };
    let bad = [];
    for (const c of ["ld", "reading"]) {
      const ls = idx(c);
      const ids = new Set(ls.map((l) => l.id));
      for (const l of ls) {
        const other = pair.pairedLessonId(c, l.id);
        if (!other || !ids.has(other) || pair.pairedLessonId(c, other) !== l.id) bad.push(`${c}:${l.id}`);
      }
    }
    check("P4 ld 552 · reading 512 쪽 모두 짝이 맞음", bad.length === 0, bad.slice(0, 5));
    const others = ["grammar1", "grammar2", "phonics", "student", "adult", "passoff-grammar"].filter((c) => idx(c).some((l) => pair.pairedLessonId(c, l.id) !== null));
    check("P4 다른 과정 번호에는 짝 없음", others.length === 0, others);
  } else check("P4 src/lib/lessonPair.ts 있음", false, "없음");
}

// ---------------------------------------------------------------- P5 — 첫 글자 도움의 한국어 낱말
{
  const { firstLetters } = load("src/lib/passoffLesson.ts");
  const { koreanOnScreen, KOREAN_GLOSS_PAGES } = load("src/lib/koreanGloss.ts");
  const show = (lessonId) => (t) => koreanOnScreen(`passoff-grammar/${lessonId}`, t);
  const card = src("src/components/passoff/ComposeCard.tsx");
  const cardPasses = /firstLetters\(item\.en, gloss\)/.test(card);
  const clue = (en, lessonId) => (cardPasses ? firstLetters(en, show(lessonId)) : firstLetters(en));
  check("P5 pg13-1 'Admiral Yi Sun-sin.' → 'A______ 이순신.'", clue("Admiral Yi Sun-sin.", "pg13-1") === "A______ 이순신.", clue("Admiral Yi Sun-sin.", "pg13-1"));
  check("P5 pg06-1 'Chuseok ...' → '추석 ...'", clue("Chuseok is a big holiday.", "pg06-1") === "추석 i_ a b__ h______.", clue("Chuseok is a big holiday.", "pg06-1"));
  check("P5 한국어 없는 쪽은 그대로", clue("She is taller than me.", "pg02-1") === "S__ i_ t_____ t___ m_.", clue("She is taller than me.", "pg02-1"));

  // 실제 문항 전부(content/private/passoff-grammar *.paid.json · content/lessons/passoff-grammar): 표가 닿는 낱말은 한글로, 영어 낱말은 첫 글자 하나만
  const dirs = ["content/private/passoff-grammar", "content/lessons/passoff-grammar"];
  const items = [];
  const walk = (node, lessonId) => {
    if (Array.isArray(node)) node.forEach((n) => walk(n, lessonId));
    else if (node && typeof node === "object") {
      if (typeof node.en === "string" && typeof node.ko === "string") items.push({ lessonId, id: node.id, en: node.en });
      Object.values(node).forEach((n) => walk(n, lessonId));
    }
  };
  for (const d of dirs) {
    for (const f of fs.readdirSync(path.join(REPO, d))) {
      const m = /^(pg\d+-\d+)\.(paid\.)?json$/.exec(f);
      if (m) walk(JSON.parse(fs.readFileSync(path.join(REPO, d, f), "utf8")), m[1]);
    }
  }
  let withKorean = 0;
  const romanLeft = [];
  const englishBad = [];
  const unchanged = [];
  for (const it of items) {
    const key = `passoff-grammar/${it.lessonId}`;
    const drawn = koreanOnScreen(key, it.en);
    const c = clue(it.en, it.lessonId);
    if (drawn !== it.en) {
      withKorean += 1;
      // 화면 표기의 한글 낱말이 단서에 그대로 있어야 함
      for (const h of drawn.match(/[가-힣]+/g) || []) if (!c.includes(h)) romanLeft.push(`${it.lessonId}:${it.id} ${c}`);
    } else if (c !== firstLetters(it.en)) unchanged.push(`${it.lessonId}:${it.id}`);
    for (const tok of c.split(/\s+/)) if (!/[가-힣]/.test(tok) && (tok.match(/[A-Za-z0-9]/g) || []).length > 1) englishBad.push(`${it.lessonId}:${it.id} ${tok}`);
  }
  check(`P5 실제 문항 ${items.length}개 중 한국어 낱말 든 ${withKorean}개 — 단서에 한글 그대로`, withKorean > 0 && romanLeft.length === 0, romanLeft.slice(0, 4));
  check("P5 영어 낱말은 첫 글자 하나만 보임(나머지 밑줄)", englishBad.length === 0, englishBad.slice(0, 4));
  check("P5 한국어 낱말 없는 문항의 단서는 전과 같음", unchanged.length === 0, unchanged.slice(0, 4));
  const p16 = items.find((i) => i.lessonId === "pg13-1" && (i.id === "p16" || i.id === "pg13-1:p16"));
  check("P5 pg13-1 p16 실제 문항", p16 && / A_+ 이순신\.$/.test(clue(p16.en, "pg13-1")), p16 && clue(p16.en, "pg13-1"));
  const chuseok = items.filter((i) => /\bChuseok\b/.test(i.en)).map((i) => clue(i.en, i.lessonId));
  check("P5 Chuseok 문항 모두 '추석'(로마자 'C______' 없음)", chuseok.length > 0 && chuseok.every((c) => c.includes("추석") && !/\bC_{6}\b/.test(c)), chuseok.slice(0, 3));
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${BEFORE ? "[BEFORE — 고치기 전 판] " : ""}${results.length - failed}/${results.length} PASS · FAIL ${failed}`);
process.exit(failed ? 1 : 0);
