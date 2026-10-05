// 회귀 점검 1002 고침 A5 · A7 — 브라우저 없이 앱 함수로(같은 AI 계열 — 독립 검수 아님).
//
// A5 '한글이 섞여 있어요. 영어 자판으로 바꿔 주세요.' 판단(ComposeCard · FormStep 의 hangulLeft = hasHangul(romanForGrading(쪽, 값))):
//   표기 표가 있는 PASS-OFF 쪽의 ④⑤ 문항마다 화면대로 한글로 쓴 정답 꼴(koreanOnScreen(모범 답 · 허용 답))
//     → 경고 0 이어야 · 채점(gradeProduce(romanForGrading(꼴)))은 정답이어야(바뀐 것 아님 — 함께 봄)
//   음성 대조: 그 꼴에 표에 없는 한글('가나다')을 붙이면 → 경고 1 이어야(경고가 아주 꺼진 것이 아님)
//   깨기 --break=old : 고치기 전 판단(hasHangul(값))으로 → 한글 꼴마다 경고(실패가 나와야)
// A7 이름 이어 그리기(passoffLesson.ts joinNameTokens + ui.tsx namesFor 와 같은 이름 목록):
//   pg13-1:p16 에 일부러 틀린 답 둘 — '… Admiral Tokyo.'(정답 보기 '→ 이순신' 이어야 · '→ 이' 아님) · '… as brave as Admiral 이순신.'
//   (틀린 자리 줄 '… Admiral 이순신.' 이어야 · '이 순신' 아님) — 그리고 표기 표가 있는 모든 쪽의 한글 꼴 · 일부러 뺀 답에서
//   '이름 조각이 띄어 그려짐'(표의 여러 낱말 이름이 낱말 사이 띄어쓰기로 쪼개져 그려짐) 0
//   깨기 --break=no-join : joinNameTokens 를 안 거침 → pg13-1 두 줄이 실패해야
const path = require("path");
const fs = require("fs");
const REPO = path.resolve(__dirname, "../../../../..");
process.env.KIG_REPO = REPO;
const { loadTs } = require(path.join(REPO, "docs/qa-2026-09-15/scripts/tsload.cjs"));
const G = loadTs(path.join(REPO, "src/lib/passoffGrading.ts"));
const K = loadTs(path.join(REPO, "src/lib/koreanGloss.ts"));
const L = loadTs(path.join(REPO, "src/lib/passoffLesson.ts"));
const BREAK = ((process.argv.find((a) => a.startsWith("--break=")) || "").slice(8)) || null;
if (BREAK && !["old", "no-join"].includes(BREAK)) throw new Error(`모르는 깨기 ${BREAK}`);
for (const [n, f] of [["gradeProduce", G.gradeProduce], ["hasHangul", G.hasHangul], ["koreanOnScreen", K.koreanOnScreen], ["romanForGrading", K.romanForGrading], ["joinNameTokens", L.joinNameTokens]]) if (typeof f !== "function") throw new Error(`${n} 못 불러옴`);

const COURSE = "passoff-grammar";
const warns = (key, value) => (BREAK === "old" ? G.hasHangul(value) : G.hasHangul(K.romanForGrading(key, value)));
// ui.tsx namesFor 와 같은 목록(그 파일은 React 라 여기서 못 부름 — 같은 식을 옮김)
const namesFor = (key) => [...new Set((K.KOREAN_GLOSS_PAGES[key] || []).map(([w]) => w).filter((w) => /\s/.test(w)))].sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length || b.length - a.length);
const draw = (key, toks, reveal) => toks.map((t) => {
  const s = (x) => K.koreanOnScreen(key, x);
  if (t.kind === "missing") return reveal ? `[${s(t.text)}]` : "[ ]";
  if (t.kind === "wrong") return `~${s(t.text)}~${reveal && t.expected ? ` → ${s(t.expected)}` : ""}`;
  if (t.kind === "extra") return `-${s(t.text)}-`;
  return s(t.text);
}).join(" ");
const tokensOf = (key, diff, en) => (BREAK === "no-join" ? diff : L.joinNameTokens(diff, namesFor(key), en));

let forms = 0, warned = 0, notRight = 0, controls = 0, controlMissed = 0, split = 0, lines = 0;
const fails = [];
const pages = Object.keys(K.KOREAN_GLOSS_PAGES).filter((k) => k.startsWith(`${COURSE}/`));
for (const key of pages) {
  const id = key.split("/")[1];
  const files = [path.join(REPO, "content/lessons", COURSE, `${id}.json`), path.join(REPO, "content/private", COURSE, `${id}.paid.json`)].filter((f) => fs.existsSync(f));
  const items = [];
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(f, "utf8"));
    const blocks = j.blocks || (j.items || []).map((e) => ({ type: "drill", [e.list]: [e.item] }));
    for (const b of blocks) for (const list of ["produce", "transfer"]) for (const it of b[list] || []) if (it && typeof it.en === "string") items.push(it);
  }
  const names = namesFor(key);
  for (const it of items) {
    for (const answer of [it.en, ...(it.accept || [])]) {
      const shown = K.koreanOnScreen(key, answer);
      if (shown === answer || !/[가-힣]/.test(shown)) continue; // 한글 꼴이 없는 답
      forms++;
      if (warns(key, shown)) { warned++; if (fails.length < 8) fails.push(`A5 ${it.id} 경고: '${shown}'`); }
      if (!G.isCorrect(G.gradeProduce(K.romanForGrading(key, shown), it))) { notRight++; if (fails.length < 8) fails.push(`A5 ${it.id} 채점 정답 아님: '${shown}'`); }
      controls++;
      if (!warns(key, `${shown} 가나다`)) { controlMissed++; if (fails.length < 8) fails.push(`A5 ${it.id} 표에 없는 한글에 경고 없음`); }
      // A7 — 한 낱말 뺀 꼴(이름 앞 낱말)과 한글 꼴 그대로를 일부러 틀리게(맨 앞 낱말 바꿈) 해서 틀린 자리 줄을 그려 봄
      for (const wrong of [shown.replace(/^\S+/, "Xyz"), shown.replace(/\s\S+\s/, " ")]) {
        const res = G.gradeProduce(K.romanForGrading(key, wrong), it);
        if (G.isCorrect(res) || !res.diff || !res.diff.length) continue;
        for (const reveal of [false, true]) {
          lines++;
          const line = draw(key, tokensOf(key, res.diff, it.en), reveal);
          for (const n of names) {
            const hangul = K.koreanOnScreen(key, n);
            const parts = n.split(/\s+/).map((p) => K.koreanOnScreen(key, p));
            if (parts.length > 1 && parts.every((p) => /[가-힣]/.test(p)) && line.includes(parts.join(" ")) && parts.join(" ") !== hangul) {
              split++;
              if (fails.length < 8) fails.push(`A7 ${it.id} 쪼개짐 '${parts.join(" ")}': ${line.slice(-80)}`);
            }
          }
        }
      }
    }
  }
}

// pg13-1:p16 — 결과.md A7 의 두 화면 그대로
const key13 = `${COURSE}/pg13-1`;
const p16 = JSON.parse(fs.readFileSync(path.join(REPO, "content/lessons", COURSE, "pg13-1.json"), "utf8")).blocks.flatMap((b) => [...(b.produce || []), ...(b.transfer || [])]).find((x) => x.id === "pg13-1:p16");
const a = G.gradeProduce(K.romanForGrading(key13, "I hope to grow up to be as brave and confident as Admiral Tokyo."), p16);
const revealLine = draw(key13, tokensOf(key13, a.diff, p16.en), true);
const b = G.gradeProduce(K.romanForGrading(key13, "I hope to grow up to be as brave as Admiral 이순신."), p16);
const markLine = draw(key13, tokensOf(key13, b.diff, p16.en), false);
const okReveal = /→ 이순신/.test(revealLine) && !/→ 이(?!순신)/.test(revealLine);
const okMark = /Admiral 이순신\./.test(markLine) && !/이 순신/.test(markLine);

console.log(`A5 한글 꼴(표기 표 ${pages.length}쪽 · ④⑤ 모범 · 허용 답): ${forms} · 경고 ${warned} · 채점 정답 아님 ${notRight} · 음성 대조(표에 없는 한글) ${controls} 중 경고 없음 ${controlMissed}${BREAK ? ` · 깨기 ${BREAK}` : ""}`);
console.log(`A7 틀린 자리 줄 ${lines}줄 · 이름 쪼개짐 ${split}`);
console.log(`A7 pg13-1:p16 정답 보기: ${revealLine.split(" as ").slice(-1)[0]}  → ${okReveal ? "PASS" : "FAIL"}`);
console.log(`A7 pg13-1:p16 틀린 자리: ${markLine.split(" as ").slice(-1)[0]}  → ${okMark ? "PASS" : "FAIL"}`);
for (const f of fails) console.log(`  ${f}`);
const bad = warned || notRight || controlMissed || split || !okReveal || !okMark || forms < 400;
console.log(bad ? "FAIL" : "PASS");
process.exit(bad ? 1 : 0);
