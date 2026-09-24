/**
 * 강의 데이터(E.expected 의 texts)가 화면에 나왔는지 대조 — drive-generic.cjs 가 방문마다 쓰고, 저장된 기록을 다시 평가할 때도 같은 것을 쓴다.
 *
 * - hint-chip(LISTENING 받아쓰기 힌트 칩)은 문장을 넘기며 읽은 힌트 상자(rec.hintChips)와 대조한다.
 *   7단계 7-1 e: 문장을 넘기지 않는 깊이(rec.depth === "light" — 태블릿 · 휴대폰의 대본 쪽)에서는 힌트 상자를 읽지 않으므로
 *   그 칩은 '없음' 이 아니라 **'이 깊이에서 안 봄'(notSeen)** 으로 따로 센다. 전에는 첫 화면 글에서 찾아 다른 문장의 칩을 '없음' 으로 셌다
 *   (2026-09-23 운영 재점검 LISTENING 46강: 태블릿 23기록 · 30칩). 그냥 빼지 않는다 — 걷기가 빠진 것이 깨끗한 통과로 둔갑하지 않게,
 *   문장을 넘기는 깊이(full · medium)에서 걷기가 돌지 않았으면(상자를 못 읽음) 전처럼 화면 글로 찾고 없으면 '없음'.
 * - 담는 곳(lib/containers.cjs)이 있는 종류는 그곳에서만 글 통째로 찾는다. 그 밖은 화면 글(앞 60자)로.
 *
 * legacy: true 는 7-1 e 전의 규칙(깊이와 상관없이 첫 화면 글로 찾음) — 다시 평가해 옛 숫자와 견줄 때만.
 */
const C = require("./containers.cjs");
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

function contentCheck({ course, exp, texts, rec, legacy = false }) {
  const flat = norm(texts.map((t) => t.text).join("\n"));
  const seenChips = rec.hintChips ? new Set(rec.hintChips.map(norm)) : null;
  const via = { container: 0, pageText: 0 };
  const notSeen = [];
  const lookup = (t) => {
    const c = C.containerFor(course, t);
    if (c) {
      via.container++;
      const got = (rec.containers || {})[c.id];
      return !got || !got.some((g) => C.key(g) === C.key(t.text));
    }
    via.pageText++;
    return !flat.includes(norm(t.text).slice(0, 60));
  };
  const missing = exp.texts.filter((t) => {
    if (t.kind === "hint-chip" && seenChips) return !seenChips.has(norm(t.text));
    const miss = lookup(t);
    // 문장을 넘기지 않는 깊이: 첫 화면에 보이는 칩은 찾은 것, 안 보이는 칩은 '없음' 이 아니라 '이 깊이에서 안 봄'
    if (miss && t.kind === "hint-chip" && !legacy && rec.depth === "light") { notSeen.push(t); return false; }
    return miss;
  });
  return { missing, notSeen, via, seenChips };
}

module.exports = { contentCheck, norm };
