#!/usr/bin/env node
/**
 * READING fixes (apply-reading-whitespace, apply-reading-passages-*, apply-reading-cards-*,
 * the two follow-ups) — checks over ALL 256 lessons, not a sample. Exit 0 = every check as expected.
 * Written and run by the same agent that made the fixes; it checks data, it is not a review.
 *
 *  - R-00: sentences AND cards identical on the lesson page, the script page (-1) and the central
 *    copies; instruction blocks rebuilt from the sentences
 *  - every card: 14 per lesson, unique word and lemma, word really in the passage, part of speech
 *    from the fixed list, Korean meaning (no "(핵심 어휘)" placeholder), no n./v./adj. badge that
 *    contradicts its own meaning, no broken token (dash, dot, backtick, apostrophe)
 *  - every wrong meaning the audit listed (RV-01/05/10/13/16/19/22/25, 217 lesson+card pairs) is gone from
 *    that lesson — corrected or the card replaced
 *  - R-01: no passage appears twice any more (one of each pair replaced, owner decision)
 *  - every wrong form the audit listed in the passages (R-02 … R-79) is gone, the corrected forms
 *    are present; no exam residue (①…, "(A)", "→", Hangul notes) in any passage
 *  - items that wait for the owner/lawyer (R-29/R-43/R-75 copyright, R-30 pr054,
 *    R-32 pr078) are not decided here — the pr054 advert and pr078 joke are still in place
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/reading");
const { tokensOf } = require("./lib-reading-cards.cjs");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const centralS = read(path.join(REPO, "src/lib/readingSentences.json"));
const centralV = read(path.join(REPO, "src/lib/readingVocabulary.json"));
const ids = fs.readdirSync(dir).filter((f) => /^pr\d{3}\.json$/.test(f)).map((f) => f.slice(0, 5)).sort();
const L = new Map(ids.map((id) => [id, { m: read(path.join(dir, `${id}.json`)), k: read(path.join(dir, `${id}-1.json`)) }]));
const results = [];
const check = (what, ok, detail = "") => results.push({ what, ok: Boolean(ok), detail });
const J = JSON.stringify;
const S = (id) => L.get(id).m.readingSentences;
const V = (id) => L.get(id).m.readingVocabulary;
const EN = ids.flatMap((id) => S(id).map((s, i) => ({ id, n: i + 1, t: s.english })));
const KO = ids.flatMap((id) => S(id).map((s, i) => ({ id, n: i + 1, t: s.korean })));

// ── structure and R-00 ──────────────────────────────────────────────────────────────────────
check("256 lessons, each with a script page", ids.length === 256 && ids.every((id) => L.get(id).k));
const list = (pred) => ids.filter(pred);
let bad = list((id) => J(S(id)) !== J(L.get(id).k.readingSentences) || J(S(id)) !== J(centralS[id]));
check("R-00 sentences: lesson page = script page = central copy (256)", bad.length === 0, bad.join(" "));
bad = list((id) => J(V(id)) !== J(L.get(id).k.readingVocabulary) || J(V(id)) !== J(centralV[id]));
check("R-00 cards: lesson page = script page = central copy (256)", bad.length === 0, bad.join(" "));
bad = list((id) => S(id).some((s, i) => s.id !== `reading-${id.slice(2)}-s${String(i + 1).padStart(3, "0")}` || !s.english.trim() || !s.korean.trim()));
check("sentence ids in order, no empty English or Korean", bad.length === 0, bad.join(" "));
bad = list((id) => {
  const texts = (doc) => doc.blocks.filter((b) => b.type === "instruction" || b.type === "hints" || b.type === "paragraph");
  const tm = texts(L.get(id).m), tk = texts(L.get(id).k);
  return tm.length !== 1 || tk.length !== 1 || tm[0].type !== "instruction" || tk[0].type !== "instruction"
    || tm[0].text !== S(id).map((s) => s.english).join(" ") || tk[0].text !== S(id).map((s) => s.korean).join(" ");
});
check("exactly one text block per file (no leftover PDF fragments or hints notes) = the sentences, all 512 files", bad.length === 0, bad.join(" "));

// ── cards ───────────────────────────────────────────────────────────────────────────────────
const POS = new Set(["n.", "v.", "adj.", "adv.", "prep.", "conj.", "pron."]);
const cardProblems = [];
const contradictions = [];
for (const id of ids) {
  const cards = V(id);
  const tokens = tokensOf(S(id).map((s) => s.english).join(" "));
  if (cards.length !== 14) cardProblems.push(`${id}: ${cards.length} cards`);
  if (new Set(cards.map((c) => c.word)).size !== cards.length) cardProblems.push(`${id}: duplicate word`);
  if (new Set(cards.map((c) => c.lemma)).size !== cards.length) cardProblems.push(`${id}: duplicate lemma`);
  for (const c of cards) {
    const n = tokens.filter((t) => t === c.word.toLowerCase()).length;
    if (n === 0) cardProblems.push(`${id}: "${c.word}" not in passage`);
    if (c.freq !== n) cardProblems.push(`${id}: "${c.word}" freq ${c.freq} ≠ ${n}`);
    if (!POS.has(c.partOfSpeech)) cardProblems.push(`${id}: "${c.word}" pos ${c.partOfSpeech}`);
    if (!/[가-힣]/.test(c.korean) || /핵심 어휘/.test(c.korean)) cardProblems.push(`${id}: "${c.word}" meaning ${c.korean}`);
    if (/[.`—–'’]/.test(c.word)) cardProblems.push(`${id}: broken token "${c.word}"`);
    const bare = c.korean.replace(/\([^)]*\)/g, "").trim();
    if (!bare) continue;
    if (c.partOfSpeech === "n." && /다$/.test(bare)) contradictions.push(`${id} ${c.word} n. ${c.korean}`);
    if (c.partOfSpeech === "v." && /(한|적인)$/.test(bare) && !/(하다|되다)/.test(bare)) contradictions.push(`${id} ${c.word} v. ${c.korean}`);
    if (c.partOfSpeech === "adv." && /ly$/.test(c.word) && /(한|인|하다)$/.test(bare)) contradictions.push(`${id} ${c.word} adv. ${c.korean}`);
  }
}
check("cards: 14 per lesson, unique word/lemma, in passage, freq right, pos listed, Korean meaning, no broken token (3,584 cards)", cardProblems.length === 0, cardProblems.slice(0, 5).join(" | "));
check("RV-00: no n. card with a verb meaning, no v. card with an adjective meaning, no -ly adverb with an adjective meaning", contradictions.length === 0, contradictions.slice(0, 5).join(" | "));
check("RV-03/RV-09 danger, equip (pr031) and arrogant (pr037) no longer cards", !V("pr031").some((c) => /^(danger|equip)$/.test(c.word)) && !V("pr037").some((c) => c.word === "arrogant"));
const NAMES = /^(roh|moo-hyun|chavez|suilivan|sullivan|alice|paul|york|wimbledon|canario|smith|peter|palladium|cremona|simmons|flemish|portuguese|english|friday|christmas|sas|united|mussolini|dostoevsky|einstein|darwin|newton|bannister|sampras)$/;
bad = ids.flatMap((id) => V(id).filter((c) => NAMES.test(c.word.toLowerCase())).map((c) => `${id} ${c.word}`));
check("no card cut out of a person or place name (roh, alice, york, united …)", bad.length === 0, bad.join(" "));

// The 213 cards whose meaning the audit found wrong for that passage. "." = the card itself must be gone.
const WRONG = `
pr004 used 중고|pr006 used 중고|pr005 blindly 블라인드|pr007 notes 메모|pr012 notes 메모|pr008 attached 첨부|pr026 attached 첨부|pr008 upset ^속상|pr026 upset ^속상
pr011 station ^역|pr014 spent 지출|pr016 trick 속임수|pr017 reserved 예비|pr017 contact ^연락|pr021 setting 세트|pr023 promoted 홍보|pr024 firms 확고|pr024 number 번호
pr028 fired ^불|pr028 recalled 회상|pr032 smacking 체벌|pr032 western 서부
pr033 abide 참다|pr035 training 기차|pr039 number 번호|pr040 blocked 블록|pr043 trained 기차|pr044 poor 가난|pr045 since 이후|pr048 poor 가난|pr048 absorbed 흡수|pr049 poor 가난
pr049 called 전화|pr050 directing 직접|pr050 securing 안전한|pr053 advance 전진|pr054 marketing ^시장$|pr057 policy ^정책$|pr057 covering 덮다|pr059 called 전화|pr059 clouded 구름
pr062 exercise 운동|pr062 cloud ^구름$|pr063 poor 가난
pr065 sources 출처|pr065 used 중고|pr068 light ^빛$|pr069 number 번호|pr069 firms 확고|pr071 carried ^나르다|pr073 sound ^소리|pr073 matters ^문제$|pr074 molded 곰팡이|pr074 amends 개정
pr075 found 설립|pr075 study 공부|pr076 set 한 벌|pr077 atmosphere 분위기|pr077 leaving 떠나다|pr078 stormed 폭풍|pr080 feet ^발$|pr081 lights ^빛$|pr083 breaking 휴식|pr085 light ^빛$
pr086 happily 행복하다|pr087 watching 시계|pr088 shopping 가게|pr088 spent 지출|pr089 parties 파티|pr089 number 번호|pr091 rights 맞아|pr091 accused 비난|pr092 falling 가을|pr093 picture ^그림$
pr094 content ^내용$|pr095 dealing 거래
pr097 composed 작곡|pr104 composed 작곡|pr100 provided 만약|pr100 separated 별도|pr102 question ^질문$|pr103 used 중고|pr105 turn ^돌다|pr106 shipping ^배$|pr109 feet ^발$|pr109 crowded 군중
pr111 completely 완료|pr112 looking ^봐$|pr112 right 오른쪽|pr113 twice ^두 번$|pr114 walks ^걷다|pr117 painting ^그림$|pr122 dropped 드롭|pr123 sharp 날카로운|pr123 slide 미끄러지다|pr124 watched 시계
pr124 study 공부|pr125 skilled ^기술$|pr126 poor 가난|pr126 high-volume 대량|pr128 faced 얼굴
pr130 regarded 존경|pr130 associated 동료|pr133 works ^일$|pr133 entirely ^전체$|pr135 called 전화|pr135 exhibit 전시|pr135 reproduce 재현|pr136 appreciate 감사|pr136 moves ^움직이다|pr138 latest 늦게
pr139 demands 수요|pr139 attribute 속성|pr140 seriously 심각한|pr141 nature ^자연$|pr141 matters ^문제$|pr143 exercise 운동|pr143 right 오른쪽|pr144 handling 손잡이|pr145 shop 가게|pr146 fails 실패
pr148 states .|pr148 united .|pr150 warming 따뜻한|pr151 striking 파업|pr152 openly 열다
pr163 demands 수요|pr164 engineered 엔지니어|pr164 officials 공식적인|pr166 application 신청|pr167 training 기차|pr167 passed 합격|pr168 completely 완료|pr168 concerned 우려|pr169 used 중고|pr170 western 서부
pr170 dealing 거래|pr171 introduced ^소개|pr171 right 오른쪽|pr173 practice ^연습$|pr174 content ^내용$|pr174 brought 가져오다|pr175 rich 부유|pr176 short 짧은|pr177 short 짧은|pr189 short 짧은
pr179 minding ^마음$|pr179 early 일찍|pr180 fixed 고치다|pr180 enforced 집행|pr180 subject 주제|pr182 put ^놓다|pr184 studied 공부|pr184 states .|pr184 united .|pr185 early 일찍
pr186 spent 지출|pr187 reproducing 재현|pr189 shopping 가게|pr193 treat 대하다
pr194 spent 지출|pr197 considerations 배려|pr216 considerations 배려|pr198 crossed 건너다|pr199 judging 판사|pr200 dearly 친애|pr200 maintain 유지|pr204 qualifications 자격|pr205 regarding 존경|pr206 share 공유
pr206 country 국가|pr207 bill 계산서|pr207 house ^집$|pr207 pass 합격|pr208 concerned 우려|pr213 customs .|pr213 howeve .|pr214 completely 완료|pr214 playing 놀이|pr214 tastes 맛이 나다
pr217 figuring 그림|pr217 means 수단|pr218 sentences ^문장$|pr219 early 일찍|pr220 along 따라|pr221 found 설립|pr221 early 일찍|pr221 canario .|pr224 states 상태|pr224 covering .
pr225 qualities 품질|pr218 united .|pr224 appears .
pr226 number 번호|pr229 spending 지출|pr230 shanties 판잣집|pr230 called 전화|pr231 figures 그림|pr232 atmosphere 분위기|pr232 crowded 군중|pr233 right 오른쪽|pr234 facing 얼굴|pr235 subjects 주제
pr235 photograph ^사진$|pr238 sources 출처|pr238 provided 만약|pr239 issued .|pr240 construction 건설|pr242 openly 열다|pr245 demands 수요|pr246 feet ^발$|pr248 number 번호|pr249 mine .
pr252 marketing ^시장$|pr252 elderly 장로|pr254 heart 심장|pr255 significantly ^중요한$
`.trim().split(/\s*[|\n]\s*/);
const wrongLeft = [];
let corrected = 0, replaced = 0;
for (const item of WRONG) {
  const [id, word, ...rest] = item.split(" ");
  const badMeaning = rest.join(" ");
  const card = V(id).find((c) => c.word === word);
  if (!card) { replaced++; continue; }
  if (badMeaning === "." || new RegExp(badMeaning).test(card.korean)) wrongLeft.push(`${id} ${word} ${card.korean}`);
  else corrected++;
}
check(`RV-01…RV-25: every wrong meaning the audit listed is gone (${WRONG.length} cards: ${corrected} corrected, ${replaced} replaced)`, wrongLeft.length === 0 && WRONG.length >= 200, wrongLeft.join(" | "));

// R-01 (owner decision 2026-09-17: replace one of each duplicate pair) — no two lessons share a
// passage, and no passage is mostly the words of another (the audit's own test: word Jaccard > 0.6
// over every pair of the 256, which is how pr008 ⊂ pr026 and pr066 ≈ pr085 were found).
const wordSet = (id) => new Set(tokensOf(S(id).map((s) => s.english).join(" ")));
const sets = new Map(ids.map((id) => [id, wordSet(id)]));
const similar = [];
for (let i = 0; i < ids.length; i++) {
  for (let j = i + 1; j < ids.length; j++) {
    const a = sets.get(ids[i]), b = sets.get(ids[j]);
    let inter = 0;
    for (const w of a) if (b.has(w)) inter++;
    const jaccard = inter / (a.size + b.size - inter);
    const contained = inter / Math.min(a.size, b.size);
    if (jaccard > 0.6 || contained > 0.9) similar.push(`${ids[i]}~${ids[j]} jaccard ${jaccard.toFixed(2)} contained ${contained.toFixed(2)}`);
  }
}
check("R-01: no two lessons share a passage or most of one (word Jaccard ≤ 0.6, containment ≤ 0.9, all 32,640 pairs)", similar.length === 0, similar.join(" | "));
const NEW = { pr008: "leap years", pr012: "waggle dance", pr036: "hump", pr066: "octopus", pr069: "Jikji", pr216: "chlorophyll", pr242: "wavelength", pr244: "water cycle", pr251: "Great Wall" };
bad = Object.entries(NEW).filter(([id, word]) => !S(id).some((s) => s.english.includes(word))).map(([id]) => id);
check("R-01: the nine replaced lessons carry their new passages (pr008 pr012 pr036 pr066 pr069 pr216 pr242 pr244 pr251)", bad.length === 0, bad.join(" "));

// ── passages ────────────────────────────────────────────────────────────────────────────────
const gone = (label, re, rows = EN) => {
  const hits = rows.filter((x) => re.test(x.t)).map((x) => `${x.id} #${x.n}: ${x.t.slice(0, 90)}`);
  check(`gone: ${label}`, hits.length === 0, hits.slice(0, 3).join(" | "));
};
const has = (id, text, field = "english") => {
  const all = S(id).map((s) => s[field]).join(" ");
  check(`${id} ${field === "english" ? "EN" : "KO"} has "${text.slice(0, 70)}"`, all.includes(text), all.slice(0, 120));
};

// global residue
gone("Hangul inside an English sentence (vocabulary notes, R-14/R-34/R-48)", /[가-힣]/);
gone("circled option numbers ①…⑤ (R-21)", /[①②③④⑤]/);
gone("circled option numbers ①…⑤ in Korean", /[①②③④⑤]/, KO);
gone("underline markers (a)…(e) / a(n) (R-40, R-48)", /\([a-e]\)|a\(n\)/);
gone("summary arrows, (A)/(B) blanks, (힌트)/(주제문) notes in Korean (R-35, R-70)", /→|\([AB]\)|\(힌트\)|\(주제문\)/, KO);
gone("speaker label stuck to the word (PersonA…, R-08)", /Person[AB][A-Z]/);
gone("English sentence starting with a lower-case letter or a stray quote (R-06, R-18)", /^([a-z]|" )/);
gone("double spaces, line breaks, space before , . ? ! (whitespace pass)", /\s{2,}|\n| [,.?!;:](\s|$)/);
gone("double spaces / line breaks in Korean", /\s{2,}|\n/, KO);
gone("two sentences glued without a space (unlessit, thatcan, goals.Stay, collectible.In …)", /\b(unlessit|thatcan|communityis)\b|[a-z]\.[A-Z][a-z]/);

// R-02 … R-79 in the order of content-review/reading.md
gone("R-02 PDF spaces inside Korean words", /세 계|인 터넷|망원 경|마 지막|중학 교|분 야|강 점|지역사 회|낙담하 게|웃 음|몰 고|코 미디언|채 워져|관 련되는|그 러나|항 공노선|무 제한적|여 러분|경험 은|점 수|규 칙|필요사 항/, KO);
gone("R-03 pr001 'children prefer to talk to their other-sex parent' / 모친의의", /prefer to talk to their other-sex parent|fathers often side with their sons/);
gone("R-03 모친의의", /모친의의/, KO);
gone("R-04 'smoke of putting too chemicals'", /smoke of putting too chemicals/);
gone("R-05 인간의 문법 / R-07 저항심을 거의 / R-10 자신의 몸을 사랑 / R-11 진실이 아니다", /인간의 문법|저항심을 거의|자신의 몸을 사랑하는|테이블에서 만큼 더 진실이 아니다/, KO);
gone("R-09 'must observed' / R-12 / R-13 mistake for game, blame policy, advice hikers", /must observed|mistake for game|blame policy|advice hikers/);
gone("R-13 KO 정책을 비난", /정책을 비난/, KO);
gone("R-14 pr048 '*nearsighted' note, 'the reason someone's behavior'", /\*nearsighted|the reason someone's behavior/);
gone("R-15 count / help us / Sometime you / some thing / as unrepeatable / health actions", /resourcefulness count\b|personality that help us|\bSometime you|\bsome thing\b|as unrepeatable|health actions/);
gone("R-16 `cumbia' / In contrast_ / banbuco", /`cumbia'|contrast_|banbuco/i);
gone("R-17 KO 어렵지 않게(relief) / 녹색지대 / 사무국장 / 전화 호출 / 하던일을 멈추기", /녹색지대|사무국장|전화 호출|하던일을 멈추기/, KO);
gone("R-19 pr032 'smacking of lips' as Korean manners", /smacking of lips/);
gone("R-20/R-33/R-46/R-77 Korean misspellings", /됬다|같이 않을|격어야만|변화도록|의지할 때 없는|차레|직적적인|한체|지신의|옮은|깨긋한|소요자|가르켜|갖은 |글쌔|오나전히|카폐|롤러브레이드르르|상사함으로써|함으로서|면필한|어린들이|만들서|목적과와|스트래스|마져도|결굴|나무을|거릇된|베게|가가운|학교;에|것인냥|행동위를|메너|헝클러진|뉴튼|어름|뒤쳐지지|종지와 적|네델란드|방아 |특별정한|뭇솔리니|논의 되야|앨랜 폴/, KO);
gone("R-21 pr056 options row and 중요하지 않기 때문", /disappointment ② misdeeds/);
check("R-21 pr056 KO: 'because it does' = 중요하기 때문", S("pr056").some((s) => s.korean.includes("중요하기 때문")) && !S("pr056").some((s) => s.korean.includes("중요하지 않기 때문이다")));
gone("R-22 pr066 glued sentences 'A good illustration of these is that Having'", /illustration of these is that Having|Other instance in this category/);
gone("R-22 KO cut off 이러한 것중의 중요하", /이러한 것중의 중요하/, KO);
has("pr085", "Having a mole over one’s right eyebrow"); // pr066 was the damaged copy; replaced under R-01
gone("R-23 pr067 'to straight to the sun'", /to straight to the sun/);
has("pr067", "We're going to send a rocket straight to the sun.");
gone("R-24 pr090 'The wife influences both mother and father'", /wife influences both mother and father/);
has("pr090", "The child influences both mother and father.");
gone("R-25 pr070 55/35/10 as a rule of first impressions", /makes up 35%|only 10%/);
has("pr070", "facial expression counted for 55%, tone of voice for 38%, and the actual words for only 7%");
gone("R-26 pr077 'they evidence' / 'not speaking with one voice'", /they evidence for|not speaking with one voice/);
has("pr077", "almost all climate scientists agree that human activity is warming the planet");
gone("R-27 KO 미래를 보지만(present) / 미친 듯이 빠져들고 / 미친 듯 좋아하기도 / 10분만에(months)", /미친 듯이 빠져들고|미친 듯 좋아하기도|10분만에/, KO);
gone("R-28 want to one / the war you work / bunder / equip the game / no longer happier", /want to one\b|the war you work|\bbunder\b|equip the game|no longer happier/);
gone("R-29 pr080 KO '답 2 5'", /답 2 5/, KO);
gone("R-37 pr125 'in spite of its competitiveness'", /in spite of its competitiveness/);
has("pr125", "because of its competitiveness in small car manufacturing");
gone("R-38 pr129 germ in heating pipes carried by heated air", /heating pipes|it carried\.|heated air was blown/);
has("pr129", "air-conditioning cooling towers");
has("pr129", "breathe in tiny drops of that water in mist or spray");
gone("R-39 pr123 'Television is responsible for the sharp decline' / 'have decline'", /Television is responsible for the sharp decline|have decline\b/);
gone("R-41 slat / feet very lonely / fears my disappear / putting the neighbor's dog / on you back / somethings / none-living", /slat content|feet very lonely|fears my disappear|putting the neighbor's dog|on you back|\bsomethings\b|none-living/);
gone("R-42 suggest / what government do / thing that matter / creature ? / himself herself / business / human lifetime / telescope / actuation", /experiment suggest\b|what government do\b|thing that matter\b|creature \?|himself herself|shops or business\b|in human lifetime|kinds of telescope\b|gene actuation/);
gone("R-45 old news told as the present (pr122 coffee, pr095 IMF 'will begin', pr110 'stopped', pr128 forecast)", /Colombia now gets much less cash|demand for coffee in the world has dropped|In recent years, Colombia|IMF\) said that .* will begin|that they have to give up|osteoporosis can be stopped|will not close before 2005/);
has("pr122", "In the early 1990s, Colombia earned much less money from its exports");
has("pr110", "This can be slowed by regular exercise.");
has("pr128", "Around the year 2000, the e-business industry was faced with a labor shortage.");
gone("R-47 pr164 exam question 'Who take the strictest stand'", /Who take the strictest/);
gone("R-48 pr237 '*ligament' note, '(b)little', 'six-time' as current", /\*ligament|\(b\)little|six-time Wimbledon champ/);
has("pr237", "At the end of the 1990s, tennis was in some trouble.");
gone("R-49 pr246 conclusion as the 2nd sentence", /^So Simmons became convinced/, EN.filter((x) => x.id === "pr246" && x.n === 2));
has("pr246", "So Simmons became convinced that this competition for mates");
gone("R-50 pr183 'at least four minutes a day'", /at least four minutes a day|record time for running a mile was over/);
has("pr183", "In 1954, Roger Bannister ran a mile in under four minutes.");
gone("R-51 pr193 KO 7904 / 세게 박람회, EN did’t", /7904|세게 박람회/, KO);
gone("R-51 did’t", /did’t/);
has("pr193", "1904년 세인트루이스에서 세계 박람회", "korean");
gone("R-53 pr225 'The young girl'", /The young girl/);
gone("R-55 pr184 present-tense 'Koreans tend to have one job'", /Koreans tend to have one job/);
has("pr184", "In the past, Koreans tended to have one job for their whole life.");
has("pr194", "기차 창밖", "korean");
gone("R-57 pr211 'visage. Yet', '(the intellectual dogma', 'still in their 30s'", /visage\. Yet|\(the intellectual dogma|still in their 30s/);
gone("R-57 KO 영향을 들 받았다", /영향을 들 받았다/, KO);
has("pr211", "made by people in their 20s and 30s");
gone("R-58 pr222 'the Olympics celebrate the memory'", /Olympics celebrate the memory/);
has("pr222", "the marathon race celebrates the memory");
gone("R-59 pr150 '35,000 years'", /35,000 years/);
has("pr150", "about 300,000 years");
gone("R-60 pr239 'officially endorsed euthanasia in 1984'", /endorsed euthanasia in 1984/);
has("pr239", "made it legal in 2002");
gone("R-60 KO 12년간의 형을 실행", /12년간의 형을 실행/, KO);
gone("R-61 pr255 millon / 70 percents / by the year 2025", /millon|70 percents|by the year 2025/);
has("pr255", "nearly 10 billion by 2050");
gone("R-62 'Stolen Letter' / 'Equal Right Amendment'", /Stolen Letter|Equal Right Amendment/);
has("pr138", "“The Purloined Letter”");
has("pr171", "Equal Rights Amendment");
gone("R-63 pr232 'hundreds of thousands injured'", /hundreds of thousands injured/);
gone("R-63 KO '1 3은'", /1 3은/, KO);
has("pr232", "tens of thousands injured each day");
gone("R-66 pr213 'Her customs' / 'Howeve,'", /Her customs|Howeve,/);
gone("R-67 pr224 report of court / A fair trials / juniors / want to appears", /news report of court|A fair trials|\bjuniors\b|want to appears/);
has("pr224", "Judges, jurors, and witnesses");
gone("R-68 KO 수십, 수백만 달러 / 스무 살짜리는", /수십, 수백만 달러|스무 살짜리는/, KO);
gone("R-69 KO 편안함은 거의 찾을 수 없었다 / 회색 시장", /편안함은 거의 찾을 수 없었다|회색 시장/, KO);
gone("R-70 EN summary lines pr159/pr167/pr247 ('Language is not inherited, but is acquired')", /Language is not inherited, but is acquired/);
gone("R-71 pr240 'a hammer. our brain' / 'appearance. its function'", /a hammer\. our brain|appearance\. its function/);
gone("R-73 English typos (once attribute … religious impatience)", /once attribute\b|an disadvantage|Every parent know\b|isn't like to ask|different color\b|to lean new|when I we growing|a few month\b|his or her manes|\bth time|northen|a bill become\b|We all fell lonely|quite and steady|coworkers of volunteers|confirms the public that|believes us for the time|a person stay\b|religious impatience/);
gone("R-74 Korean mistranslations (앞치마, 항공노선 통제관, 고용자들, 중고차 …)", /앞치마|항공노선 통제관|고용자들|중고차|구성하는 사람들, 수행하는 사람들/, KO);
has("pr154", "쪄지고, 삶아지고", "korean"); // steamed → 쪄지고 (was 삶아지고), boiled → 삶아지고
gone("R-76 punctuation (collectible.In, painters.Therefore, Suilivan, to read book, food for cow, Cities-dwellers)", /collectible\.In|painters\.Therefore|Suilivan|to read book\b|food for cow\b|Cities-dwellers|every year !/);
gone("R-79 'Canario' / 'Darwin was the first to propose'", /"Canario"|Darwin was the first to propose/);
has("pr221", "\"Canaria,\"");
has("pr203", "he speaks Dutch, French, or German");

// waiting for the owner / lawyer — not decided here, still in place
check("R-30 pr054 SAS advert still in place (owner/lawyer decision pending)", S("pr054").some((s) => /SAS/.test(s.english)));
check("R-32 pr078 story still in place (owner decision pending)", S("pr078").length > 0);

// ── report ──────────────────────────────────────────────────────────────────────────────────
let fail = 0;
for (const r of results) {
  if (!r.ok) fail++;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.what}${r.ok || !r.detail ? "" : "\n      " + r.detail}`);
}
console.log(`\n${results.length - fail}/${results.length} checks pass`);
process.exit(fail ? 1 : 0);
