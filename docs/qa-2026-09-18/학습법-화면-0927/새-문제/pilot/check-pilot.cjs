#!/usr/bin/env node
/**
 * 새 문제 시범분(pilot) 기계 검사 — 2026-09-28. 이 폴더의 ld/*.json · reading/*.json 만 읽습니다(content/ 는 읽기만).
 *
 *   node "docs/qa-2026-09-18/학습법-화면-0927/새-문제/pilot/check-pilot.cjs"           검사 — 어긋나면 exit 1
 *   node "docs/qa-2026-09-18/학습법-화면-0927/새-문제/pilot/check-pilot.cjs" --break   검사마다 일부러 깨뜨린 사본에서 실제로 걸리는지 증명
 *
 * 반드시 통과(하나라도 어긋나면 exit 1):
 *   H1 모양        UTF-8(BOM 없음) · v=1 · lesson=파일 이름 · course=폴더 · id=<lesson>-q<n>(전체에서 겹침 없음)
 *                  · type 이 과정별 허용 목록 · prompt · note 가 빈 글이 아님 · 문항 칸이 id,type,prompt,options,answer,evidence,note 뿐
 *   H2 보기 4개    보기가 정확히 4개 · 모두 빈 글이 아님
 *   H3 보기 겹침   네 보기가 서로 다름(앞뒤 빈칸 · 겹친 빈칸 · 끝 마침표는 무시하고 비교)
 *   H4 정답 번호   answer 가 0 ~ 3 정수
 *   H5 근거 번호   evidence 가 1개 이상의 정수 · 모두 1 ~ 그 강의의 줄 수(지문의 문장 수) · 겹침 없음
 *                  줄 수는 content/ld_english_scripts.json(LISTENING) · content/lessons/reading/<id>.json 의 readingSentences(READING)
 *                  LISTENING 은 대본의 n 이 1,2,3… 차례인지도 봄(엔진 열쇠 d001#3 = 대본 순서 — src/lib/ldLearning.ts)
 *   H6 영어 원문   보기가 대본 줄 · 지문 문장(또는 그 안의 한 문장)과 같지 않음 · 원문 영어 네 낱말 이상을 통째로 옮기지 않음
 *   H7 같은 문항   한 강의 안에 같은 발문 · 같은 보기 묶음이 두 번 나오지 않음
 *   H8 문항 수     LISTENING 6줄 이하 2 · 그 위 3 / READING 2 (새-문제-설계.md §1)
 *   H9 정답 위치   전체에서 A ~ D 가 각각 20 ~ 30% (새-문제-설계.md §3-4)
 * 참고(exit 에 영향 없음 — 숫자만 보고):
 *   W1 정답 길이   정답이 가장 긴 보기인 문항 수 · '가장 긴 보기만 고르기'로 맞히는 수(우연 25%) — 35% 를 넘으면 경고
 *   W2 풀이 인용   note 에 따옴표로 옮긴 영어가 근거 줄에 그대로 있는지(없으면 어느 줄에 있는지)
 *   W3 발문 인용   발문에 따옴표로 옮긴 영어가 근거 줄에 있는지
 *   W4 표기 통일   발문 말투('…요?') · 끝에 마침표가 있는 보기 · 따옴표 밖 로마자가 든 발문 · 로마자가 든 보기
 */
'use strict';
const fs = require('fs');
const path = require('path');

const PILOT = __dirname;
const ROOT = path.resolve(PILOT, '..', '..', '..', '..', '..');
const TYPES = { ld: ['main', 'detail', 'purpose', 'next'], reading: ['main', 'detail', 'vocab', 'inference'] };
const KEYS = ['id', 'type', 'prompt', 'options', 'answer', 'evidence', 'note'];
const LETTERS = ['A', 'B', 'C', 'D'];
const W1_BAR = 35; // '가장 긴 보기만 고르기' 점수가 이 % 를 넘으면 경고

// ---------- 원문 ----------
let ldScripts = null;
function source(course, lesson) {
  if (course === 'ld') {
    if (!ldScripts) ldScripts = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'ld_english_scripts.json'), 'utf8'));
    const a = ldScripts[lesson];
    if (!Array.isArray(a)) return null;
    return { lines: a.map((x) => ({ en: String(x.en), ko: String(x.ko) })), nInOrder: a.every((x, i) => String(x.n) === String(i + 1)) };
  }
  if (course === 'reading') {
    const f = path.join(ROOT, 'content', 'lessons', 'reading', `${lesson}.json`);
    if (!fs.existsSync(f)) return null;
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!Array.isArray(j.readingSentences)) return null;
    return { lines: j.readingSentences.map((x) => ({ en: String(x.english), ko: String(x.korean) })), nInOrder: true };
  }
  return null;
}

function loadPilot() {
  const out = [];
  for (const course of Object.keys(TYPES)) {
    const dir = path.join(PILOT, course);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).filter((n) => n.endsWith('.json')).sort()) {
      const raw = fs.readFileSync(path.join(dir, name), 'utf8');
      const bom = raw.charCodeAt(0) === 0xfeff;
      out.push({ course, name, file: `${course}/${name}`, bom, data: JSON.parse(bom ? raw.slice(1) : raw) });
    }
  }
  return out;
}

// ---------- 글 다듬기 ----------
const squash = (s) => String(s).normalize('NFC').replace(/\s+/g, ' ').trim();
const optKey = (s) => squash(s).replace(/[.。]+$/, '');
const enNorm = (s) =>
  String(s).normalize('NFC').toLowerCase()
    .replace(/[’‘`]/g, "'").replace(/[“”]/g, '"')
    .replace(/[^\p{L}\p{N}' ]+/gu, ' ')
    .replace(/\s+/g, ' ').trim();
const len = (s) => [...String(s).trim()].length; // 띄어쓰기 포함 글자 수
function sentencesOf(line) {
  const parts = String(line).split(/(?<=[.!?])\s+(?=["“‘']?[A-Z0-9])/);
  const out = [];
  for (const p of parts) {
    if (out.length && /\b(?:Mr|Mrs|Ms|Dr|St|Jr|Sr)\.$/.test(out[out.length - 1])) out[out.length - 1] += ' ' + p;
    else out.push(p);
  }
  return out;
}
/** 따옴표(“…” ‘…’ '…') 안에 든 로마자 조각. '…' 는 “…” 를 걷어낸 나머지에서만 찾음(I'm 같은 줄임표 때문). */
function quotedLatin(text) {
  const segs = [];
  let rest = String(text);
  rest = rest.replace(/“([^”]*)”/g, (_, s) => { segs.push(s); return ' '; });
  rest = rest.replace(/‘([^’]*)’/g, (_, s) => { segs.push(s); return ' '; });
  rest = rest.replace(/'([^']*)'/g, (_, s) => { segs.push(s); return ' '; });
  return { segs: segs.filter((s) => /[A-Za-z]/.test(s)), rest };
}
/** 인용 한 조각(… 로 나뉜 부분마다)이 근거 줄에 있는지. */
function locate(seg, lines, evidence) {
  const parts = seg.split(/\s*(?:\.\.\.|…)\s*/).map(enNorm).filter(Boolean);
  const evText = enNorm(evidence.filter((n) => lines[n - 1]).map((n) => lines[n - 1].en).join(' '));
  const res = [];
  for (const p of parts) {
    if (evText.includes(p)) continue;
    const where = [];
    lines.forEach((l, i) => { if (enNorm(l.en).includes(p)) where.push(i + 1); });
    res.push({ part: p, where });
  }
  return res;
}

// ---------- 검사 ----------
function runChecks(P) {
  const fail = { H1: [], H2: [], H3: [], H4: [], H5: [], H6: [], H7: [], H8: [], H9: [] };
  const counted = { files: 0, questions: 0, options: 0, evidenceNumbers: 0 };
  const warn = { W1: {}, W2: [], W3: [], W4: { politePrompts: [], periodOptions: {}, latinPromptOutsideQuotes: [], latinOptions: [] } };
  const allIds = new Set();
  const answers = { all: [0, 0, 0, 0], ld: [0, 0, 0, 0], reading: [0, 0, 0, 0] };
  const lengthRows = [];

  for (const f of P) {
    counted.files++;
    const d = f.data;
    const lesson = f.name.replace(/\.json$/, '');
    if (f.bom) fail.H1.push(`${f.file}: BOM 이 붙어 있음`);
    if (d.v !== 1) fail.H1.push(`${f.file}: v=${JSON.stringify(d.v)}`);
    if (d.lesson !== lesson) fail.H1.push(`${f.file}: lesson=${d.lesson}`);
    if (d.course !== f.course) fail.H1.push(`${f.file}: course=${d.course}`);
    const topKeys = Object.keys(d).join(',');
    if (topKeys !== 'v,lesson,course,questions') fail.H1.push(`${f.file}: 파일 칸이 ${topKeys}`);
    const qs = Array.isArray(d.questions) ? d.questions : [];
    if (!qs.length) fail.H1.push(`${f.file}: 문항 없음`);
    const src = source(f.course, lesson);
    if (!src) { fail.H5.push(`${f.file}: 원문을 찾지 못함`); continue; }
    if (!src.nInOrder) fail.H5.push(`${f.file}: 대본의 n 이 1,2,3… 차례가 아님(근거 번호가 둘로 읽힘)`);
    const N = src.lines.length;

    // H8 문항 수
    const want = f.course === 'ld' ? (N <= 6 ? 2 : 3) : 2;
    if (qs.length !== want) fail.H8.push(`${f.file}: ${N}줄 → ${want}문항이어야 하는데 ${qs.length}문항`);

    const prompts = new Map();
    const optionSets = new Map();
    qs.forEach((q, qi) => {
      counted.questions++;
      const tag = `${f.file} ${q && q.id ? q.id : '#' + (qi + 1)}`;
      // H1
      const extra = Object.keys(q).filter((k) => !KEYS.includes(k));
      if (extra.length) fail.H1.push(`${tag}: 모르는 칸 ${extra.join(',')}`);
      const idRe = new RegExp(`^${lesson}-q(\\d+)$`);
      if (typeof q.id !== 'string' || !idRe.test(q.id)) fail.H1.push(`${tag}: id 꼴이 ${lesson}-q<n> 이 아님`);
      if (allIds.has(q.id)) fail.H1.push(`${tag}: id 겹침`);
      allIds.add(q.id);
      if (!TYPES[f.course].includes(q.type)) fail.H1.push(`${tag}: type=${q.type}`);
      if (typeof q.prompt !== 'string' || !q.prompt.trim()) fail.H1.push(`${tag}: 발문 없음`);
      if (q.note !== undefined && (typeof q.note !== 'string' || !q.note.trim())) fail.H1.push(`${tag}: note 가 빈 글`);
      // H2
      const opts = Array.isArray(q.options) ? q.options : [];
      counted.options += opts.length;
      if (opts.length !== 4) fail.H2.push(`${tag}: 보기 ${opts.length}개`);
      if (opts.some((o) => typeof o !== 'string' || !o.trim())) fail.H2.push(`${tag}: 빈 보기`);
      // H3
      const keys = opts.map(optKey);
      if (new Set(keys).size !== keys.length) fail.H3.push(`${tag}: 같은 보기가 있음 — ${keys.join(' | ')}`);
      // H4
      if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) fail.H4.push(`${tag}: answer=${JSON.stringify(q.answer)}`);
      // H5
      const ev = Array.isArray(q.evidence) ? q.evidence : [];
      counted.evidenceNumbers += ev.length;
      if (!ev.length) fail.H5.push(`${tag}: 근거 줄 없음`);
      for (const n of ev) if (!Number.isInteger(n) || n < 1 || n > N) fail.H5.push(`${tag}: 근거 ${JSON.stringify(n)} — 글은 1 ~ ${N}`);
      if (new Set(ev).size !== ev.length) fail.H5.push(`${tag}: 근거 번호 겹침`);
      // H6
      const whole = new Set();
      for (const l of src.lines) { whole.add(enNorm(l.en)); for (const s of sentencesOf(l.en)) whole.add(enNorm(s)); }
      const allEn = src.lines.map((l) => enNorm(l.en));
      opts.forEach((o, oi) => {
        const k = enNorm(o);
        if (k && whole.has(k)) fail.H6.push(`${tag}: 보기 ${LETTERS[oi]} 가 영어 원문 그대로 — ${o}`);
        const runs = String(o).match(/[A-Za-z][A-Za-z'’-]*(?:[\s,;:]+[A-Za-z][A-Za-z'’-]*)*/g) || [];
        for (const r of runs) {
          const rn = enNorm(r);
          if (rn.split(' ').length >= 4 && allEn.some((l) => l.includes(rn))) fail.H6.push(`${tag}: 보기 ${LETTERS[oi]} 에 원문 영어 "${r}"`);
        }
        if (/[A-Za-z]/.test(o)) warn.W4.latinOptions.push(`${q.id} ${LETTERS[oi]}: ${o}`);
        if (/[.。]$/.test(String(o).trim())) warn.W4.periodOptions[f.course] = (warn.W4.periodOptions[f.course] || 0) + 1;
      });
      // H7
      const pk = squash(q.prompt || '');
      if (prompts.has(pk)) fail.H7.push(`${tag}: 발문이 ${prompts.get(pk)} 와 같음`);
      prompts.set(pk, q.id);
      const sk = [...keys].sort().join('|');
      if (optionSets.has(sk)) fail.H7.push(`${tag}: 보기 묶음이 ${optionSets.get(sk)} 와 같음`);
      optionSets.set(sk, q.id);
      // 정답 위치
      if (Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3) { answers.all[q.answer]++; answers[f.course][q.answer]++; }
      // W1 정답 길이
      if (opts.length === 4 && Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3) {
        const lens = opts.map(len);
        const a = lens[q.answer];
        const maxWrong = Math.max(...lens.filter((_, i) => i !== q.answer));
        const top = Math.max(...lens);
        const topCount = lens.filter((x) => x === top).length;
        lengthRows.push({ id: q.id, course: f.course, answerLen: a, longestWrong: maxWrong, strict: a > maxWrong, tied: a === maxWrong, pickLongest: a === top ? 1 / topCount : 0 });
      }
      // W2 풀이 인용
      if (typeof q.note === 'string') {
        for (const seg of quotedLatin(q.note).segs) {
          for (const miss of locate(seg, src.lines, ev)) warn.W2.push({ id: q.id, evidence: ev, quote: miss.part, foundIn: miss.where });
        }
      }
      // W3 발문 인용 · W4 발문
      if (typeof q.prompt === 'string') {
        const { segs, rest } = quotedLatin(q.prompt);
        for (const seg of segs) for (const miss of locate(seg, src.lines, ev)) warn.W3.push({ id: q.id, evidence: ev, quote: miss.part, foundIn: miss.where });
        if (/[A-Za-z]/.test(rest)) warn.W4.latinPromptOutsideQuotes.push(`${q.id}: ${q.prompt}`);
        if (/요\?$/.test(q.prompt.trim())) warn.W4.politePrompts.push(q.id);
      }
    });
  }

  // H9 정답 위치 20 ~ 30%
  const total = answers.all.reduce((s, x) => s + x, 0);
  const pct = (c, t) => (t ? (100 * c) / t : 0);
  answers.all.forEach((c, i) => {
    const p = pct(c, total);
    if (p < 20 || p > 30) fail.H9.push(`정답 ${LETTERS[i]}: ${c}/${total} = ${p.toFixed(1)}% (20 ~ 30% 밖)`);
  });

  // W1 모음
  for (const scope of ['all', 'ld', 'reading']) {
    const rows = lengthRows.filter((r) => scope === 'all' || r.course === scope);
    const n = rows.length;
    const strict = rows.filter((r) => r.strict).length;
    const tiedOrStrict = rows.filter((r) => r.strict || r.tied).length;
    const pick = rows.reduce((s, r) => s + r.pickLongest, 0);
    warn.W1[scope] = { n, strict, tiedOrStrict, pickLongest: +pick.toFixed(2), pickLongestPct: +pct(pick, n).toFixed(1), fired: pct(pick, n) > W1_BAR };
  }
  warn.W1.rows = lengthRows;

  return { fail, counted, warn, answers, total };
}

// ---------- 보고 ----------
const NAMES = {
  H1: '모양(파일 · id · type · 칸)', H2: '보기 4개', H3: '보기 겹침 없음', H4: '정답 번호 0 ~ 3', H5: '근거 번호가 글 안',
  H6: '영어 원문을 옮긴 보기 없음', H7: '같은 강의 안 같은 문항 없음', H8: '강의별 문항 수', H9: '정답 위치 A ~ D 각 20 ~ 30%',
};
function report(r) {
  const c = r.counted;
  console.log(`새 문제 시범분 기계 검사 — 파일 ${c.files} · 문항 ${c.questions} · 보기 ${c.options} · 근거 번호 ${c.evidenceNumbers}`);
  let bad = 0;
  for (const k of Object.keys(NAMES)) {
    const list = r.fail[k];
    bad += list.length;
    console.log(`  ${list.length ? 'FAIL' : 'ok  '} ${k} ${NAMES[k]}${list.length ? ` — ${list.length}건` : ''}`);
    for (const x of list) console.log(`         ${x}`);
  }
  console.log('\n정답 위치(A · B · C · D):');
  for (const s of ['all', 'ld', 'reading']) {
    const a = r.answers[s];
    const t = a.reduce((x, y) => x + y, 0);
    console.log(`  ${s.padEnd(8)} ${a.map((v, i) => `${LETTERS[i]} ${v} (${t ? ((100 * v) / t).toFixed(1) : '0.0'}%)`).join(' · ')} — ${t}문항`);
  }
  console.log('\n참고 W1 정답 길이(띄어쓰기 포함 글자 수):');
  for (const s of ['all', 'ld', 'reading']) {
    const w = r.warn.W1[s];
    console.log(`  ${s.padEnd(8)} 정답이 혼자 가장 긺 ${w.strict}/${w.n} · 가장 긺(공동 포함) ${w.tiedOrStrict}/${w.n} · '가장 긴 보기만 고르기' 점수 ${w.pickLongest}/${w.n} = ${w.pickLongestPct}% (우연 25%, 경고선 ${W1_BAR}%)${w.fired ? '  ← 경고' : ''}`);
  }
  console.log('  문항별 정답:가장 긴 오답 — ' + r.warn.W1.rows.map((x) => `${x.id} ${x.answerLen}:${x.longestWrong}`).join(' · '));
  console.log(`\n참고 W2 풀이에 옮긴 영어가 근거 줄 밖/글 밖: ${r.warn.W2.length}건`);
  for (const x of r.warn.W2) console.log(`  ${x.id} 근거 [${x.evidence}] — "${x.quote}" → ${x.foundIn.length ? `${x.foundIn.join(',')}번 줄에 있음` : '글에 없음'}`);
  console.log(`참고 W3 발문에 옮긴 영어가 근거 줄 밖/글 밖: ${r.warn.W3.length}건`);
  for (const x of r.warn.W3) console.log(`  ${x.id} 근거 [${x.evidence}] — "${x.quote}" → ${x.foundIn.length ? `${x.foundIn.join(',')}번 줄에 있음` : '글에 없음'}`);
  const w4 = r.warn.W4;
  console.log(`참고 W4 표기: '…요?' 로 끝나는 발문 ${w4.politePrompts.length} (${w4.politePrompts.join(', ')})`);
  console.log(`            끝에 마침표가 있는 보기 — ${Object.entries(w4.periodOptions).map(([k, v]) => `${k} ${v}`).join(' · ') || '0'}`);
  console.log(`            따옴표 밖 로마자가 든 발문 ${w4.latinPromptOutsideQuotes.length}${w4.latinPromptOutsideQuotes.length ? ' — ' + w4.latinPromptOutsideQuotes.join(' / ') : ''}`);
  console.log(`            로마자가 든 보기 ${w4.latinOptions.length}${w4.latinOptions.length ? ' — ' + w4.latinOptions.join(' / ') : ''}`);
  console.log(`\n결과: ${bad ? `FAIL ${bad}건` : '반드시 통과할 검사 9가지 모두 통과'}`);
  return bad;
}

// ---------- --break : 검사가 실제로 걸리는지 ----------
const clone = (x) => JSON.parse(JSON.stringify(x));
const firstLd = (P) => P.find((f) => f.course === 'ld');
const BREAKS = [
  ['H1', 'v 를 2 로', (P) => { P[0].data.v = 2; }],
  ['H1', 'type 을 모르는 값으로', (P) => { P[0].data.questions[0].type = 'trivia'; }],
  ['H2', '보기 하나 빼기', (P) => { P[0].data.questions[0].options.pop(); }],
  ['H3', '보기 B 를 A 와 같게(끝 마침표만 다름)', (P) => { const o = P[0].data.questions[0].options; o[1] = o[0] + '.'; }],
  ['H4', 'answer 를 4 로', (P) => { P[0].data.questions[0].answer = 4; }],
  ['H5', '근거를 줄 수 + 1 로', (P) => { const f = P[0]; const s = source(f.course, f.name.replace(/\.json$/, '')); f.data.questions[0].evidence = [s.lines.length + 1]; }],
  ['H5', '근거를 0 으로', (P) => { P[0].data.questions[0].evidence = [0]; }],
  ['H6', '보기 A 를 대본 1번 줄 영어 그대로', (P) => { const f = firstLd(P); const s = source('ld', f.name.replace(/\.json$/, '')); f.data.questions[0].options[0] = s.lines[0].en; }],
  ['H6', '보기 A 에 원문 영어 다섯 낱말', (P) => { const f = firstLd(P); const s = source('ld', f.name.replace(/\.json$/, '')); f.data.questions[0].options[0] = '정답: ' + s.lines[3].en.split(' ').slice(0, 5).join(' '); }],
  ['H7', '둘째 문항 발문을 첫째와 같게', (P) => { const q = P[0].data.questions; q[1].prompt = q[0].prompt; }],
  ['H8', '문항 하나 빼기', (P) => { P[0].data.questions.pop(); }],
  ['H9', '모든 정답을 A 로', (P) => { for (const f of P) for (const q of f.data.questions) { const a = q.options[q.answer]; q.options.splice(q.answer, 1); q.options.unshift(a); q.answer = 0; } }],
  ['W1', '모든 정답을 가장 긴 보기로', (P) => { for (const f of P) for (const q of f.data.questions) { const L = q.options.map(len); q.answer = L.indexOf(Math.max(...L)); } }],
  // 원본에서 이미 W1 경고가 나므로, 경고가 '늘 켜져 있는' 검사가 아님도 보임: 정답을 가장 짧은 보기로 바꾼 사본에서는 조용해야 함
  ['W1-quiet', '모든 정답을 가장 짧은 보기로(경고가 꺼져야 함)', (P) => { for (const f of P) for (const q of f.data.questions) { const L = q.options.map(len); q.answer = L.indexOf(Math.min(...L)); } }],
  ['W2', '풀이 인용을 글에 없는 영어로', (P) => { P[0].data.questions[0].note = '“this sentence is not in the lesson”라고 했다.'; }],
];
function breakProof(base) {
  let missed = 0;
  const clean = runChecks(clone(base));
  console.log('--break: 깨뜨린 사본마다 해당 검사가 걸려야 함(W1-quiet 만은 꺼져야 함)');
  for (const [code, what, fn] of BREAKS) {
    const P = clone(base);
    fn(P);
    const r = runChecks(P);
    let fired;
    if (code.startsWith('H')) fired = r.fail[code].length > 0;
    else if (code === 'W1') fired = r.warn.W1.all.fired;
    else if (code === 'W1-quiet') fired = !r.warn.W1.all.fired; // 꺼져야 '맞게 동작'
    else fired = r.warn[code].length > clean.warn[code].length; // 원본보다 늘어야 걸린 것
    if (!fired) missed++;
    const label = code === 'W1-quiet' ? (fired ? '꺼짐  ' : '안 꺼짐') : fired ? '걸림  ' : '안 걸림';
    console.log(`  ${label} ${code} ← ${what}`);
  }
  const cleanBad = Object.values(clean.fail).reduce((s, l) => s + l.length, 0);
  console.log(`  깨뜨리지 않은 원본: FAIL ${cleanBad}건`);
  console.log(missed ? `결과: ${missed}개가 기대와 다름 — 그 검사는 믿을 수 없음` : `결과: ${BREAKS.length}가지 모두 기대대로`);
  return missed;
}

const P = loadPilot();
if (process.argv.includes('--break')) process.exit(breakProof(P) ? 1 : 0);
process.exit(report(runChecks(P)) ? 1 : 0);
