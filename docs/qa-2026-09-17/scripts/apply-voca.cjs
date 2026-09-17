#!/usr/bin/env node
/**
 * VOCA — every finding of content-review/voca.md that is data (V-03 … V-10). Code parts
 * (V-04 drill, V-11 etymology, the Leitner grid) are in src/. Every edit states the value it
 * replaces; if any differs, nothing is written.
 *
 *  - V-03 mv2-12: its 30 cells were November … October repeated two and a half times (12
 *    distinct words; mv2-11 already teaches the seasons and January–October). The original
 *    archive is not available here and is not the answer key anyway (owner rule), so the lesson
 *    is completed the sensible way: November and December (the two months mv2-11 leaves out),
 *    the seven days of the week, and 21 time and calendar words that no other lesson teaches
 *    (weekday … upcoming; weekend and Sunday are the only ones also in mv1).
 *  - V-04: 37 pairs in 35 lessons had the identical Korean meaning (interrupt/interfere 방해하다,
 *    classic/classical 고전적인, electric/electrical 전기의 …). Each pair now says what tells
 *    the two apart. (The drill also stops using a same-meaning word as a "does not match"
 *    item — vocaUtils.ts.)
 *  - V-05 spelling: ancesto → ancestor, calender → calendar, scissor → scissors, livingroom →
 *    living room, technologic → technological, "insistence,-cy" → insistence (cells and
 *    headwords; the misspelt headwords are removed).
 *  - V-06 apparently 분명히 → 보아하니, 겉보기에는.
 *  - V-07 one-sense meanings that READING copied (number 번호, call 전화, train 기차 …): the
 *    basic sense first, the common second sense after.
 *  - V-08 meanings that do not tell words apart or miss the main sense (emigrant/immigrant/
 *    migrant, presently 현재 → 곧, incidentally → 그런데, tactful 재치 → 요령 …).
 *  - V-09 Korean spacing (존경할 만한, 인기 있는, 동의하지 않다 …), pebbles 자갈 → 조약돌.
 *  - V-10 a word twice in one lesson: the second cell gets a word of the same root family
 *    (hv-44 motive → momentum, hv-48 peer → impartial, hv-58 reside → residue).
 *
 *   node apply-voca.cjs [--dry-run]
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const problems = [];
const files = new Map();

const formatOf = (raw) => ({ crlf: raw.includes("\r\n"), indent: (raw.match(/^\{\r?\n( +)"/) || [, "  "])[1].length, trailing: /\r?\n$/.test(raw) });
const serialize = (data, f) => {
  let s = JSON.stringify(data, null, f.indent);
  if (f.crlf) s = s.replace(/\n/g, "\r\n");
  if (f.trailing) s += f.crlf ? "\r\n" : "\n";
  return s;
};
const load = (rel) => {
  const file = path.join(REPO, rel);
  if (files.has(file)) return files.get(file).data;
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const f = formatOf(raw);
  if (serialize(data, f) !== raw) problems.push(`${rel}: format not reproducible`);
  files.set(file, { raw, data, f });
  return data;
};

const DICT = "content/voca_dictionary.json";
const dict = load(DICT);
let meaningEdits = 0;
function meaning(word, from, to) {
  const e = dict[word];
  if (!e) return problems.push(`dictionary: no "${word}"`);
  if (e.meaning !== from) return problems.push(`dictionary "${word}": meaning is ${JSON.stringify(e.meaning)}, expected ${JSON.stringify(from)}`);
  e.meaning = to;
  meaningEdits++;
}
/** Rename a headword in place (same position), with a new meaning. */
function rename(from, to, meaningTo) {
  if (!dict[from]) return problems.push(`dictionary: no "${from}" to rename`);
  if (dict[to]) return problems.push(`dictionary: "${to}" already exists`);
  const entries = Object.entries(dict).map(([k, v]) => (k === from ? [to, { meaning: meaningTo ?? v.meaning, searchWord: to }] : [k, v]));
  for (const k of Object.keys(dict)) delete dict[k];
  for (const [k, v] of entries) dict[k] = v;
}
function remove(word, stillUsedCheck) {
  if (!dict[word]) return problems.push(`dictionary: no "${word}" to remove`);
  delete dict[word];
  stillUsedCheck.push(word);
}
function add(word, m) {
  if (dict[word] || dict[word.toLowerCase()]) return problems.push(`dictionary: "${word}" already exists`);
  dict[word] = { meaning: m, searchWord: word };
}
const lessonPath = (id) => `content/lessons/phonics/${id}.json`;
const grid = (id) => load(lessonPath(id)).blocks.find((b) => b.type === "wordgrid");
function cell(id, from, to, occurrence = 1) {
  const g = grid(id);
  let seen = 0;
  for (const row of g.rows) for (let i = 0; i < row.length; i++) if (row[i] === from && ++seen === occurrence) { row[i] = to; return; }
  problems.push(`${id}: cell "${from}" #${occurrence} not found`);
}
const removed = [];

// ── V-03 mv2-12 ──────────────────────────────────────────────────────────────────────────────
{
  const g = grid("mv2-12");
  const M = ["November", "December", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October"];
  const expected = [0, 1, 2, 3, 4].map((r) => M.slice((r * 6) % 12, (r * 6) % 12 + 6));
  if (JSON.stringify(g.rows) !== JSON.stringify(expected)) problems.push(`mv2-12: rows are not the repeated month list: ${JSON.stringify(g.rows)}`);
  g.rows = [
    ["November", "December", "Sunday", "Monday", "Tuesday", "Wednesday"],
    ["Thursday", "Friday", "Saturday", "weekday", "weekend", "minute"],
    ["hourly", "daily", "weekly", "monthly", "yearly", "daytime"],
    ["midday", "overnight", "bedtime", "lunchtime", "sunset", "period"],
    ["delay", "deadline", "nowadays", "someday", "timetable", "upcoming"],
  ];
  add("Monday", "월요일"); add("Tuesday", "화요일"); add("Wednesday", "수요일"); add("Thursday", "목요일"); add("Friday", "금요일"); add("Saturday", "토요일");
  add("weekday", "평일"); add("minute", "분; 잠깐"); add("hourly", "매시간의"); add("daily", "매일의, 날마다"); add("weekly", "매주의, 주 1회의");
  add("monthly", "매달의, 월 1회의"); add("yearly", "매년의, 해마다"); add("daytime", "낮, 주간"); add("midday", "한낮, 정오 무렵");
  add("overnight", "밤사이에, 하룻밤 동안"); add("bedtime", "잘 시간, 취침 시간"); add("lunchtime", "점심시간"); add("sunset", "해 질 녘, 일몰");
  add("period", "기간, 시기"); add("delay", "지연; 미루다"); add("deadline", "마감 기한"); add("nowadays", "요즘에는"); add("someday", "(앞으로) 언젠가");
  add("timetable", "시간표"); add("upcoming", "다가오는, 곧 있을");
}

// ── V-04 same meaning inside one lesson ──────────────────────────────────────────────────────
meaning("forefather", "조상", "선조");
meaning("proposal", "제안", "제안, 제안서");
meaning("proposition", "제안", "(사업상의) 제의; 명제");
meaning("interrupt", "방해하다", "(말·일을) 가로막다, 중단시키다");
meaning("interfere", "방해하다", "간섭하다, 지장을 주다");
meaning("fortunate", "운이 좋은", "다행스러운, 복 받은");
meaning("classic", "고전적인", "전형적인; 명작의");
meaning("classical", "고전적인", "고전의, 클래식의");
meaning("deception", "속임수", "속임, 기만");
meaning("deceit", "속임수", "사기, 거짓 (속이는 짓)");
meaning("incessant", "끊임없는", "쉴 새 없는");
meaning("accidentally", "우연히", "우연히, 실수로");
meaning("incidentally", "우연히", "그런데, 덧붙여 말하자면"); // also V-08
meaning("accord", "일치", "합의, 협정; 일치");
meaning("accordance", "일치", "일치 (in accordance with ~에 따라)");
meaning("electric", "전기의", "전기로 움직이는, 전동의");
meaning("electrical", "전기의", "전기에 관한, 전기의");
meaning("equal", "동등한", "같은, 평등한");
meaning("equivalent", "동등한", "상응하는, 맞먹는");
meaning("faulty", "결함이 있는", "고장 난, 잘못된");
meaning("fort", "요새", "(작은) 요새, 보루");
meaning("fortress", "요새", "(큰) 요새, 성채");
meaning("confusing", "혼란스러운", "헷갈리게 하는");
meaning("confused", "혼란스러운", "(사람이) 혼란스러워하는");
meaning("relation", "관계", "관련, 관계; 친척");
meaning("relationship", "관계", "(사람·집단 사이의) 관계");
meaning("ally", "동맹", "동맹국, 협력자");
meaning("remembrance", "기억", "추모, 회상");
meaning("memory", "기억", "기억(력), 추억");
meaning("complex", "복잡한", "복합적인, 복잡한");
meaning("complicated", "복잡한", "(이해하기) 까다로운, 복잡한");
meaning("proper", "적절한", "올바른, 제대로 된");
meaning("appropriate", "적절한", "(상황에) 알맞은, 적절한");
meaning("repute", "평판", "명성, 세평");
meaning("direct", "직접", "직접적인; 지휘하다");
meaning("directly", "직접", "직접, 곧바로");
meaning("conservation", "보존", "(자원·자연의) 보호, 보존");
meaning("preservation", "보존", "(원래 상태의) 보존, 유지");
meaning("resolve", "해결하다", "(분쟁을) 해결하다; 결심하다"); // also V-08
meaning("solve", "해결하다", "(문제를) 풀다, 해결하다");
meaning("sustain", "유지하다", "지속시키다, 떠받치다");
meaning("retain", "유지하다", "보유하다, 간직하다");
meaning("intent", "의도", "(굳은) 의도, 목적");
meaning("intention", "의도", "의도, 의향");
meaning("trace", "흔적", "흔적; 추적하다");
meaning("trail", "흔적", "(지나간) 자국; 오솔길");
meaning("invaluable", "귀중한", "매우 귀중한, 값을 매길 수 없는");
meaning("house", "집", "집 (건물), 주택");
meaning("home", "집", "집, 가정");
meaning("trouble", "문제", "곤란, 골칫거리");
meaning("pardon", "용서하다", "용서; 사면하다");
meaning("jaw", "턱", "턱, 턱뼈");
meaning("chin", "턱", "턱 끝");
meaning("congratulate", "축하하다", "(사람에게) 축하하다");
meaning("celebrate", "축하하다", "(행사를 열어) 기념하다, 축하하다");
meaning("ahead", "앞으로", "앞에, 앞서");
meaning("correctly", "정확하게", "올바르게, 정확하게");
meaning("exactly", "정확하게", "정확히, 꼭");
meaning("nearly", "거의", "거의, 하마터면");
meaning("afterward(s)", "나중에", "그 후에");
meaning("perhaps", "아마도", "어쩌면, 아마");
meaning("probably", "아마도", "아마 (십중팔구)");

// ── V-05 spelling ────────────────────────────────────────────────────────────────────────────
cell("hv-01", "ancesto", "ancestor");
remove("ancesto", removed);
cell("mv1-38", "calender", "calendar");
remove("calender", removed);
cell("hv-23", "scissor", "scissors");
rename("scissor", "scissors");
cell("mv1-19", "livingroom", "living room");
rename("livingroom", "living room");
cell("hv-66", "technologic", "technological");
rename("technologic", "technological", "기술의, 기술적인");
cell("hv-62", "\"insistence,-cy\"", "insistence");
rename("\"insistence,-cy\"", "insistence", "고집, 주장");

// ── V-06 ─────────────────────────────────────────────────────────────────────────────────────
meaning("apparently", "분명히", "보아하니, 겉보기에는");

// ── V-07 one-sense meanings ──────────────────────────────────────────────────────────────────
meaning("number", "번호", "수, 숫자; 번호");
meaning("call", "전화", "부르다; 전화하다");
meaning("train", "기차", "기차; 훈련하다");
meaning("poor", "가난한", "가난한; 형편없는");
meaning("since", "이후", "~이후로; ~때문에");
meaning("day", "일", "날, 하루; 낮");
meaning("old", "늙은", "늙은; 오래된");
meaning("western", "서부의", "서양의; 서쪽의");
meaning("break", "휴식", "깨다, 부수다; 휴식");
meaning("rest", "휴식", "휴식; 나머지");
meaning("still", "아직도", "아직도; 그런데도; 가만히 있는");
meaning("study", "공부하다", "공부하다; 연구");
meaning("right", "옳은; 오른쪽", "옳은; 오른쪽; 권리");
meaning("left", "왼쪽", "왼쪽; (leave의 과거) 떠났다");
meaning("foot", "발", "발; 피트 (길이 단위)");
meaning("sentence", "문장", "문장; 형벌, 선고");
meaning("source", "출처", "원천, 근원; 출처");
meaning("quality", "품질", "질, 품질; 자질");
meaning("essential", "본질적인", "필수적인; 본질적인");
meaning("demand", "수요", "요구(하다); 수요");
meaning("care", "배려", "돌봄, 보살핌; 관심을 갖다");
meaning("consideration", "배려", "고려, 숙고; 배려");
meaning("contact", "연락", "접촉; 연락");
meaning("atmosphere", "분위기", "대기; 분위기");
meaning("peer", "동료", "또래, 동료; 자세히 들여다보다");

// ── V-08 ─────────────────────────────────────────────────────────────────────────────────────
meaning("emigrant", "이민자", "(다른 나라로 떠나는) 이민자");
meaning("immigrant", "이민자", "(다른 나라에서 온) 이민자, 이주민");
meaning("migrant", "이민자", "이주자; 철새");
meaning("execute", "실행하다", "실행하다; 처형하다");
meaning("execution", "처형", "실행; 처형");
meaning("invention", "발명품", "발명; 발명품");
meaning("movement", "운동", "움직임; (사회) 운동");
meaning("presently", "현재", "곧; 현재");
meaning("inclined", "기울어진", "~하는 경향이 있는; 기울어진");
meaning("refer", "참조하다", "언급하다; 참조하다");
meaning("senior", "선배", "연장자, 선배; 고위의");
meaning("upset", "속상한", "속상한; 뒤엎다");
meaning("pretty", "예쁜", "예쁜; 꽤");
meaning("prominent", "눈에 띄는", "저명한; 눈에 띄는");
meaning("instrument", "악기", "악기; 도구, 기구");
meaning("pastime", "오락", "취미, 기분 전환");
meaning("utensil", "기구", "(주방) 기구, 식기");

// ── V-09 Korean spelling ─────────────────────────────────────────────────────────────────────
meaning("disagree", "동의하지 않는다", "동의하지 않다");
meaning("enrich", "풍성하게하다", "풍성하게 하다");
meaning("respectable", "존경할만한", "존경할 만한");
meaning("notable", "주목할만한", "주목할 만한");
meaning("credible", "믿을만한", "믿을 만한");
meaning("tactful", "재치있는", "요령 있는, 눈치 있는");
meaning("popular", "인기있는", "인기 있는");
meaning("pebbles", "자갈", "조약돌(들)");

// ── V-10 a word twice in one lesson ──────────────────────────────────────────────────────────
cell("hv-44", "motive", "momentum", 2);
add("momentum", "추진력, 기세");
cell("hv-48", "peer", "impartial", 2);
add("impartial", "공정한, 치우치지 않은");
cell("hv-58", "reside", "residue", 2);
add("residue", "잔여물, 찌꺼기");

// ── consistency before writing ───────────────────────────────────────────────────────────────
const lessonDir = path.join(REPO, "content/lessons/phonics");
const allCells = [];
for (const f of fs.readdirSync(lessonDir).filter((x) => x.endsWith(".json"))) {
  const id = f.replace(".json", "");
  const g = load(lessonPath(id)).blocks.find((b) => b.type === "wordgrid");
  if (g) for (const w of g.rows.flat()) allCells.push({ id, w });
}
for (const w of removed) if (allCells.some((c) => c.w === w)) problems.push(`"${w}" removed from the dictionary but still a cell`);
const lookup = (w) => dict[w] || dict[w.toLowerCase().replace(/[()"]/g, "").trim()];
for (const c of allCells) if (!lookup(c.w)) problems.push(`${c.id}: cell "${c.w}" has no dictionary entry`);

if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
let written = 0;
for (const [file, e] of files) {
  const out = serialize(e.data, e.f);
  if (out !== e.raw) { written++; if (!DRY) fs.writeFileSync(file, out); }
}
console.log(`dictionary meanings ${meaningEdits}, mv2-12 rebuilt, 6 spellings, 3 duplicate cells — ${written} files ${DRY ? "would change (--dry-run)" : "written"}`);
