#!/usr/bin/env node
/**
 * "일부러 깨뜨리기" 시험 결과표 — 과정마다 깨뜨리기 전 / 깨뜨린 뒤 / (검사 수정 후) / 되돌린 뒤.
 *
 * 값은 스윕 기록(out/features/<course>-proof-<phase>.jsonl)의 content 검사 결과 그대로다.
 * 깨뜨린 글자가 검사를 통과했다면, 그 글자가 **어느 화면에서** 발견됐는지를 단계별 화면
 * 글자(out/proof/<phase>/)에서 찾아 함께 적는다 — 검사가 무엇을 보고 통과시켰는지가
 * 곧 가짜 PASS 의 원인이다.
 *
 *   node proof-summary.cjs
 */
const fs = require("fs");
const path = require("path");
const OUT = path.join(__dirname, "../out");
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

const TESTS = require("./proof-tests.json");
const PHASES = ["base", "broken", "fixed", "after"];
const PHASE_KO = { base: "깨뜨리기 전", broken: "깨뜨린 뒤", fixed: "검사 수정 후(앱은 깨진 채)", after: "되돌린 뒤", s1: "1번 문장 깨뜨린 뒤(새 검사)" };

function latest(course, phase, id) {
  const f = path.join(OUT, "features", `${course}-proof-${phase}.jsonl`);
  if (!fs.existsSync(f)) return {};
  const byVp = {};
  for (const line of fs.readFileSync(f, "utf8").trim().split(/\r?\n/)) {
    let r; try { r = JSON.parse(line); } catch { continue; }
    if (r.id !== id) continue;
    if (!byVp[r.viewport] || new Date(r.at) > new Date(byVp[r.viewport].at)) byVp[r.viewport] = r;
  }
  return byVp;
}

function whereFound(course, id, phase, text) {
  const out = [];
  const needle = norm(text).slice(0, 60);
  for (const vp of ["desktop", "tablet", "mobile"]) {
    const f = path.join(OUT, "proof", phase, `${course}-${id}.${vp}.json`);
    if (!fs.existsSync(f)) continue;
    const steps = JSON.parse(fs.readFileSync(f, "utf8"));
    const hits = steps.filter((s) => norm(s.text).includes(needle)).map((s) => s.step.replace(/\s+/g, " ").slice(0, 34));
    if (hits.length) out.push(`${vp}: ${[...new Set(hits)].join(" / ")}`);
  }
  return out;
}

/**
 * --md: the owner's table — 깨뜨린 지점 / 쓴 강의 / 깨뜨리기 전 / 깨뜨린 뒤 / 검사 수정 후 / 되돌린 뒤 —
 * with the verdict computed from the records, never typed in by hand.
 *   옛 검사  = on the broken app, did the old check report the removed text missing? (per screen size)
 *   새 검사  = on the broken app it reports it missing on every screen size, AND on the restored app
 *             it reports nothing of it missing on every screen size.
 */
if (process.argv.includes("--md")) {
  const VPS = ["desktop", "tablet", "mobile"];
  const SHORT = { desktop: "데", tablet: "태", mobile: "모" };
  const gone = (rec, t) => ((rec && rec.content && rec.content.missing) || []).some((m) => t.texts.some((x) => String(m).includes(String(x).slice(0, 40))));
  const cell = (byVp, t) => VPS.filter((v) => byVp[v]).map((v) => `${SHORT[v]} ${byVp[v].content.found}/${byVp[v].content.expected}${gone(byVp[v], t) ? "✗" : ""}`).join(" · ") || "—";
  console.log("| 시험 | 쓴 강의 | 깨뜨린 지점 | 깨뜨리기 전 | 깨뜨린 뒤 (옛 검사) | 검사 수정 후 · 앱은 깨진 채 | 되돌린 뒤 | 옛 검사 | 새 검사 |");
  console.log("|---|---|---|---|---|---|---|---|---|");
  for (const t of TESTS) {
    // A later batch of tests runs under its own phase names ("r2-base" …) so it never
    // overwrites the records an earlier table was computed from.
    const P = (ph) => `${t.phasePrefix || ""}${ph}`;
    const base = latest(t.course, P("base"), t.id);
    const broken = latest(t.course, t.phaseOverride || P("broken"), t.id);
    const fixed = t.phaseOverride ? broken : latest(t.course, P("fixed"), t.id);
    const after = latest(t.course, P("after"), t.id);
    let oldVerdict;
    if (t.phaseOverride) {
      // the old check was not run on this state: recompute it from the same run's saved screens
      const masked = VPS.filter((v) => t.texts.some((x) => whereFound(t.course, t.id, t.phaseOverride, x).some((w) => w.startsWith(`${v}:`))));
      oldVerdict = masked.length ? `**가짜** (${masked.map((v) => SHORT[v]).join("·")} — 같은 화면 글자로 재계산)` : "진짜";
    } else {
      // A screen size where the old check ALREADY called the text missing before anything was
      // broken cannot tell broken from intact there — "missing" is its answer either way.
      // Counting that as "caught" made the READING meaning row read 진짜 (2026-09-23).
      const blind = VPS.filter((v) => base[v] && gone(base[v], t));
      const fooled = VPS.filter((v) => broken[v] && !gone(broken[v], t));
      const note = blind.length ? ` · ${blind.map((v) => SHORT[v]).join("·")} 는 깨뜨리기 전에도 없다고 함 = **판별 불가**` : "";
      oldVerdict = !Object.keys(broken).length ? "—"
        : fooled.length === 0 && blind.length === 0 ? "진짜"
        : fooled.length === 0 ? `진짜는 ${VPS.filter((v) => !blind.includes(v)).map((v) => SHORT[v]).join("·") || "없음"}${note}`
        : fooled.length === VPS.length ? `**가짜** (3개 화면 모두)${note}`
        : `**가짜** (${fooled.map((v) => SHORT[v]).join("·")})${note}`;
    }
    // A phase with fewer than three screen sizes recorded is still running: no verdict from it.
    const complete = (byVp) => VPS.every((v) => byVp[v]);
    const afterFor = t.phaseOverride ? latest(t.course, P("after"), t.id) : after;
    const caught = complete(fixed) ? VPS.every((v) => gone(fixed[v], t)) : null;
    const clean = complete(afterFor) ? VPS.every((v) => !gone(afterFor[v], t)) : null;
    const newVerdict = caught === null ? "(진행 중)"
      : !caught ? "**못 잡음**"
      : clean === null ? "실패 잡음 · 되돌린 뒤 (진행 중)"
      : clean ? "실패 잡음 확인" : "잡음 · **되돌린 뒤에도 없다고 함**";
    const afterCell = t.phaseOverride ? "(LISTENING 대본 되돌린 뒤 칸과 같음)" : cell(after, t);
    console.log(`| ${t.name} | \`${t.course}/${t.id}\` | ${t.site} | ${cell(base, t)} | ${t.phaseOverride ? "(같은 실행에서 재계산)" : cell(broken, t)} | ${cell(fixed, t)} | ${afterCell} | ${oldVerdict} | ${newVerdict} |`);
  }
  process.exit(0);
}

for (const t of TESTS) {
  console.log(`\n${"=".repeat(90)}\n${t.name} — ${t.course}/${t.id}`);
  console.log(`깨뜨린 지점: ${t.site}`);
  console.log(`없앤 글자  : ${t.texts.map((x) => JSON.stringify(x)).join(" · ")}`);
  // A test with its own phase (the LISTENING sentence-1 run) is compared with the shared baseline only.
  const pre = t.phasePrefix || "";
  for (const phase of t.phaseOverride ? ["base", t.phaseOverride] : PHASES) {
    const byVp = latest(t.course, PHASES.includes(phase) ? `${pre}${phase}` : phase, t.id);
    if (!Object.keys(byVp).length) continue;
    const cells = ["desktop", "tablet", "mobile"].filter((vp) => byVp[vp]).map((vp) => {
      const c = byVp[vp].content || {};
      const gone = (c.missing || []).filter((m) => t.texts.some((x) => String(m).includes(String(x).slice(0, 40))));
      return `${vp} ${c.found}/${c.expected}${gone.length ? ` ✗[${gone.map((g) => g.slice(0, 50)).join("; ")}]` : ""}`;
    });
    console.log(`  ${PHASE_KO[phase].padEnd(24)} ${cells.join("  |  ")}`);
    if (phase === "broken" || phase === "fixed" || phase === t.phaseOverride) {
      for (const x of t.texts) {
        const w = whereFound(t.course, t.id, PHASES.includes(phase) ? `${pre}${phase}` : phase, x);
        // The old check is exactly "is it anywhere in these screens", so a non-empty list here
        // means the old check passes this text on the same run.
        console.log(`      "${String(x).slice(0, 40)}" 가 남아 있던 화면 (= 옛 검사라면 통과): ${w.length ? w.join("  ||  ") : "없음 (= 옛 검사도 실패)"}`);
      }
    }
  }
}
