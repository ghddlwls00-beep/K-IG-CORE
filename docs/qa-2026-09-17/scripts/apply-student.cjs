#!/usr/bin/env node
/**
 * STUDENT — every finding in content-review/student.md (S-01 … S-33) except S-30 (the five
 * unlisted overview pages, moved out of content/lessons by git, see the commit), judged by what
 * is actually right (owner rule). Parentheses "( )" stay: they are blanks the learner fills in.
 *
 * A STUDENT lesson = `sentences` items (English, spoken and dictated) + Korean `paragraph`
 * blocks in the same order + `chunkDrills` [{ko, en}] (the phrase cards, spoken).
 *  - sentence / Korean fixes state the current text
 *  - S-06/S-07: 17 lessons whose chunk cards came from another edition (0–31 % of their English
 *    was in the lesson) get new chunks written from the lesson's own sentences; lessons whose
 *    sentences change here get their chunks rewritten or the affected cards replaced
 *  - romanization (Silla, Gojoseon, Chuseok, Gyeongju, songpyeon, hanbok, Dangun …) is applied
 *    to sentences and chunk cards alike
 * Every change is checked; nothing is written if any expected text is missing.
 */
const fs = require("fs");
const path = require("path");
const { formatOf, serialize } = require("./lib-lesson-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const dir = path.join(REPO, "content/lessons/student");

const cache = new Map();
const problems = [];
const touched = new Set();
let changes = 0;
function L(id) {
  if (cache.has(id)) return cache.get(id);
  const file = path.join(dir, `${id}.json`);
  const raw = fs.readFileSync(file, "utf8");
  const data = JSON.parse(raw);
  const format = formatOf(raw);
  if (serialize(data, format) !== raw) problems.push(`${id}: format not reproducible`);
  const e = { file, data, format };
  cache.set(id, e);
  return e;
}
const sentencesOf = (d) => d.blocks.filter((b) => b.type === "sentences").flatMap((b) => b.items);
const koOf = (d) => d.blocks.filter((b) => b.type === "paragraph" && b.lang === "ko");
const mark = (id) => { touched.add(id); changes++; };

/** English sentence #n */
function S(id, n, from, to) {
  const it = sentencesOf(L(id).data).find((x) => x.n === String(n));
  if (!it) return problems.push(`${id} #${n} missing`);
  if (it.text !== from) return problems.push(`${id} #${n} EN is ${JSON.stringify(it.text)}`);
  it.text = to; mark(id);
}
/** Korean paragraph for sentence #n (same order) */
function K(id, n, from, to) {
  const p = koOf(L(id).data)[n - 1];
  if (!p) return problems.push(`${id} KO #${n} missing`);
  if (p.text !== from) return problems.push(`${id} KO #${n} is ${JSON.stringify(p.text)}`);
  p.text = to; mark(id);
}
/** Replace one chunk card identified by its current English */
function C(id, fromEn, toEn, toKo) {
  const list = L(id).data.chunkDrills || [];
  const hits = list.filter((c) => c.en === fromEn);
  if (hits.length !== 1) return problems.push(`${id} chunk "${fromEn}" found ${hits.length}×`);
  hits[0].en = toEn;
  if (toKo !== undefined) hits[0].ko = toKo;
  mark(id);
}
/** Replace a chunk's Korean only */
function CK(id, en, fromKo, toKo) {
  const hit = (L(id).data.chunkDrills || []).find((c) => c.en === en && c.ko === fromKo);
  if (!hit) return problems.push(`${id} chunk "${en}"/"${fromKo}" missing`);
  hit.ko = toKo; mark(id);
}
/** Replace all chunk cards: [[ko, en], …] */
function CHUNKS(id, pairs) {
  L(id).data.chunkDrills = pairs.map(([ko, en]) => ({ ko, en }));
  mark(id);
}
/** Substring replacement in English sentences + chunk English (and Korean when asked) */
function sub(ids, from, to, { ko = false, min = 1 } = {}) {
  let count = 0;
  for (const id of ids) {
    const d = L(id).data;
    for (const it of sentencesOf(d)) if (it.text.includes(from)) { it.text = it.text.split(from).join(to); count++; mark(id); }
    for (const c of d.chunkDrills || []) {
      if (c.en.includes(from)) { c.en = c.en.split(from).join(to); count++; mark(id); }
      if (ko && c.ko.includes(from)) { c.ko = c.ko.split(from).join(to); count++; mark(id); }
    }
    if (ko) for (const p of koOf(d)) if (p.text.includes(from)) { p.text = p.text.split(from).join(to); count++; mark(id); }
  }
  if (count < min) problems.push(`"${from}" found ${count}× in ${ids.join(",")}`);
}

// ================================================================ High — facts (S-01…S-04, S-09)
S("s17-3", 1, "After Shilla fell, many other countries tried to gain power over Korea.", "After Silla, the Goryeo and Joseon dynasties ruled Korea for about 1,000 years.");
K("s17-3", 1, "신라가 멸망한 후에, 많은 다른 나라들은 한국을 지배하려고 시도했습니다.", "신라 이후에는 고려와 조선 왕조가 약 1,000년 동안 한국을 다스렸습니다.");
S("s17-3", 2, "For a while, Korea was ruled by Japan.", "Later, Korea was ruled by Japan from 1910 to 1945.");
K("s17-3", 2, "잠시 동안, 한국은 일본에 의해 지배를 받았습니다.", "그 후 1910년부터 1945년까지 한국은 일본의 지배를 받았습니다.");
S("s17-3", 4, "In 1948, Korea was librated from Japan.", "In 1945, Korea was liberated from Japan.");
K("s17-3", 4, "1948년, 한국은 일본으로부터 독립했습니다.", "1945년, 한국은 일본으로부터 해방되었습니다.");
S("s17-3", 5, "A civil war broke out in 1950 when armies from the North invaded the South.", "The Korean War broke out in 1950 when armies from the North invaded the South.");
K("s17-3", 5, "1950년 북쪽에서 온 군대가 남쪽을 침범했을 때 내전이 발생했습니다.", "1950년 북쪽의 군대가 남쪽을 침략하면서 6·25 전쟁이 일어났습니다.");
S("s17-3", 6, "As a result, the Korean peninsula became divided into North and South Korea.", "After the war ended in 1953, the Korean peninsula remained divided into North and South Korea.");
K("s17-3", 6, "결과적으로 한반도는 북한과 남한으로 나누어졌습니다.", "1953년 전쟁이 끝난 뒤에도 한반도는 북한과 남한으로 나뉜 채 남았습니다.");
CHUNKS("s17-3", [
  ["신라 이후에는", "After Silla,"], ["고려와 조선 왕조가", "the Goryeo and Joseon dynasties"], ["한국을 다스렸습니다", "ruled Korea"], ["약 1,000년 동안", "for about 1,000 years."],
  ["그 후에", "Later,"], ["한국은 일본의 지배를 받았습니다", "Korea was ruled by Japan"], ["1910년부터 1945년까지", "from 1910 to 1945."],
  ["많은 한국인들은", "Many Koreans"], ["있는 것을 좋아하지 않았습니다", "did not like being"], ["일본의 권력 아래에", "under the power of Japan,"], ["그래서 그들은 싸웠습니다", "so they fought"], ["일본의 통치에 대항하여", "against Japanese rule."],
  ["1945년에", "In 1945,"], ["한국은 해방되었습니다", "Korea was liberated"], ["일본으로부터", "from Japan."],
  ["6·25 전쟁이 일어났습니다", "The Korean War broke out"], ["1950년에", "in 1950"], ["북쪽의 군대가", "when armies from the North"], ["남쪽을 침략했을 때", "invaded the South."],
  ["1953년 전쟁이 끝난 뒤에도", "After the war ended in 1953,"], ["한반도는", "the Korean peninsula"], ["나뉜 채 남았습니다", "remained divided"], ["북한과 남한으로", "into North and South Korea."],
]);
S("s17-2", 1, "After Gojoson fell, the Korean Peninsula was divided into three kingdoms: Goguryo, Baekje, and Shilla.", "After Gojoseon fell, the Korean Peninsula was divided into three kingdoms: Goguryeo, Baekje, and Silla.");
K("s17-2", 1, "고조선이 멸망한 이후에, 한반도는 3개의 왕국으로 나누어 졌습니다: 고구려, 백제, 그리고 신라입니다.", "고조선이 멸망한 이후에, 한반도는 3개의 왕국으로 나누어졌습니다: 고구려, 백제, 그리고 신라입니다.");
S("s17-2", 2, "Later these three kingdoms united as a single nation and referred to it as the Shilla Kingdom.", "Later, Silla conquered the other two kingdoms and unified most of the peninsula.");
K("s17-2", 2, "후에 이 3개의 왕국들은 하나의 나라로 합쳐졌고 그것을 신라왕국이라 불렀습니다.", "후에 신라가 다른 두 왕국을 정복하고 한반도의 대부분을 통일했습니다.");
S("s17-2", 3, "The Shilla Kingdom was its most powerful during the 8th century.", "Silla was at its most powerful during the 8th century.");
K("s17-2", 3, "신라왕국은 8세기 중반에 가장 힘이 쌨습니다.", "신라는 8세기에 가장 강성했습니다.");
K("s17-2", 4, "그것은 한국역사의 황금기라고 불렸습니다.", "그 시기는 한국 역사의 황금기라고 불렸습니다.");
CHUNKS("s17-2", [
  ["고조선이 멸망한 이후", "After Gojoseon fell,"], ["한반도는", "the Korean Peninsula"], ["세 개의 왕국으로 나누어졌습니다", "was divided into three kingdoms:"], ["고구려, 백제, 그리고 신라", "Goguryeo, Baekje, and Silla."],
  ["후에", "Later,"], ["신라가 다른 두 왕국을 정복했습니다", "Silla conquered the other two kingdoms"], ["그리고 한반도의 대부분을 통일했습니다.", "and unified most of the peninsula."],
  ["신라는", "Silla"], ["가장 강성했습니다", "was at its most powerful"], ["8세기에", "during the 8th century."],
  ["그 시기는 불렸습니다", "It was called"], ["황금기라고", "the Golden Age"], ["한국 역사의", "of Korean History."],
]);
S("s19-4", 3, "Instead, they Chinese characters were used in order to write.", "Instead, Chinese characters were used for writing.");
K("s19-4", 3, "대신에, 쓰기 위해서 한자가 쓰여졌습니다.", "대신에, 글을 쓸 때는 한자를 사용했습니다.");
S("s19-4", 6, "However, in 1420, the current King at that time, Se-jong, asked his royal scholars to create a unique Korean alphabet.", "However, in 1443, King Sejong created a unique Korean alphabet, and it was proclaimed in 1446.");
K("s19-4", 6, "그러나, 1420년, 그 시대의 왕이셨던 세종대왕께서 그의 충실한 학자들에게 독특한 한국의 문자를 만들라고 요청했습니다.", "그러나 1443년에 세종대왕께서 독창적인 한국의 문자를 만드셨고, 1446년에 반포되었습니다.");
S("s19-4", 7, "Soon a writing system known as hangul was created.", "This writing system is known as Hangul.");
K("s19-4", 7, "곧 한글이라고 알려져 있는 쓰기 시스템이 창제되었습니다.", "이 문자가 바로 한글입니다.");
CHUNKS("s19-4", [
  ["마지막으로", "Finally,"], ["한국어는", "the Korean language"], ["어떤 다른 세계 언어와도 같지 않습니다.", "is not like any other world language."],
  ["15세기 중반에 이르기까지", "Up until the middle of the 15th century,"], ["한국은 고유의 문자가 없었습니다.", "Korea didn't have its own alphabet."],
  ["대신에", "Instead,"], ["한자가 쓰였습니다", "Chinese characters were used"], ["글을 쓰는 데", "for writing."],
  ["대부분의 사람들은 읽거나 쓸 수 없었습니다.", "Most people couldn't read or write."],
  ["읽을 수 있는 유일한 사람들은", "The only people who could read"], ["학자나 귀족들이었습니다.", "were the scholars or the nobility."],
  ["그러나 1443년에", "However, in 1443,"], ["세종대왕께서", "King Sejong"], ["독창적인 한국의 문자를 만드셨습니다", "created a unique Korean alphabet,"], ["그리고 그것은 1446년에 반포되었습니다.", "and it was proclaimed in 1446."],
  ["이 문자는 한글로 알려져 있습니다.", "This writing system is known as Hangul."],
]);

// ================================================================ High — S-05 s19-3 has no dictation sentences
{
  const d = L("s19-3").data;
  const en = [
    "Another unique aspect of Korean culture is its food.",
    "Traditional Korean meals usually include boiled rice, soup, fish or meat, several vegetable side dishes, and one or more kinds of kimchi.",
    "My favorite food is bulgogi.",
    "Bulgogi is the most popular Korean meat dish, while the most popular vegetable dish is kimchi. I like them both.",
  ];
  const ko = [
    "한국 문화의 또 다른 독특한 면은 음식입니다.",
    "전통 한국 식사는 보통 밥, 국, 생선 또는 고기, 몇 가지 채소 반찬, 그리고 한 가지 이상의 김치를 포함합니다.",
    "내가 가장 좋아하는 음식은 불고기입니다.",
    "불고기는 가장 인기 있는 한국의 고기 요리인 반면 김치는 가장 인기 있는 채소 요리입니다. 저는 그것들 둘 다 좋아합니다.",
  ];
  const enParas = d.blocks.filter((b) => b.type === "paragraph" && b.lang !== "ko").map((b) => b.text);
  const expectedResidue = ["PASS-OFF FOR STUDENT", "Culture :", "Food", ...en.slice(0, 3), en[3]];
  if (sentencesOf(d).length !== 0 || koOf(d).length !== 4 || !expectedResidue.every((t) => enParas.includes(t))) {
    problems.push(`s19-3 not in the expected broken state: ${JSON.stringify(enParas)}`);
  } else {
    d.blocks = [
      { type: "instruction", text: "Chapter 19. Korean Culture (한국의 문화) - Traditional Food (Bulgogi) (전통 음식 (불고기))" },
      { type: "sentences", items: en.map((text, i) => ({ n: String(i + 1), text })) },
      ...ko.map((text) => ({ type: "paragraph", text, lang: "ko" })),
    ];
    d.chunkDrills = [
      { ko: "한국 문화의 또 다른 독특한 면은", en: "Another unique aspect of Korean culture" }, { ko: "음식입니다.", en: "is its food." },
      { ko: "전통 한국 식사는 보통 포함합니다", en: "Traditional Korean meals usually include" }, { ko: "밥, 국, 생선 또는 고기,", en: "boiled rice, soup, fish or meat," },
      { ko: "몇 가지 채소 반찬,", en: "several vegetable side dishes," }, { ko: "그리고 한 가지 이상의 김치를", en: "and one or more kinds of kimchi." },
      { ko: "내가 가장 좋아하는 음식은 불고기입니다.", en: "My favorite food is bulgogi." },
      { ko: "불고기는 가장 인기 있는 한국의 고기 요리입니다", en: "Bulgogi is the most popular Korean meat dish," },
      { ko: "반면 가장 인기 있는 채소 요리는 김치입니다.", en: "while the most popular vegetable dish is kimchi." }, { ko: "저는 둘 다 좋아합니다.", en: "I like them both." },
    ];
    mark("s19-3");
  }
}

// ================================================================ High — grammar (S-15, S-16)
S("s2-4", 1, "My parents always make my sister and I feel important and special.", "My parents always make my sister and me feel important and special.");
C("s2-4", "my sister and I", "my sister and me", "나의 누이와 나를");
S("s3-3", 2, "He/She is an excellent piano player and very strong athlete.", "He/She is an excellent piano player and a very strong athlete.");
C("s3-3", "and very strong athlete.", "and a very strong athlete.");
S("s3-3", 3, "In addition, he/she is good at playing the piano, soccer, computer games, and she is good at speaking English.", "In addition, he/she is good at playing the piano, soccer, computer games, and he/she is good at speaking English.");
S("s3-3", 4, "He/She a very talented artist, too.", "He/She is a very talented artist, too.");
S("s3-3", 5, "Her drawings are very bright and colorful.", "His/Her drawings are very bright and colorful.");
CK("s3-3", "and he/she is good at", "그리고 그는 잘합니다.", "그리고 그는/그녀는 잘합니다.");
CK("s3-3", "His/Her drawings are", "그의 그림은", "그의/그녀의 그림은");

// ================================================================ High — S-06/S-07 chunk cards from another edition: rewritten from the lesson
CHUNKS("s1-4", [
  ["저는 꽤", "I’m kind of"], ["부끄러움을 잘 타는 사람입니다.", "a shy person."],
  ["비록 저는 두려워하지만", "Even though I am afraid"], ["많은 사람들 가운데서 이야기하는 것을", "to talk a lot around people,"], ["모든 사람들은 말합니다", "everyone says"], ["제가 매우 호감 가는 사람이라고", "I am a very likable person"], ["그리고 함께 있으면 재미있는 사람이라고", "and fun to be around."],
  ["대부분의 사람들은 저를 좋아합니다", "Most people like me"], ["저를 알게 된 후에", "after they get to know me."],
]);
CHUNKS("s1-5", [
  ["나의 취미들은 포함합니다", "My hobbies include"], ["책 읽기, 음악 듣기, 등산,", "reading books, listening to music, hiking,"], ["영화 보기, 그리고 스포츠에 참가하기", "watching movies, and participating in sports."],
  ["나는 특별히 좋아합니다", "I especially like"], ["영화 보는 것을", "watching movies."],
  ["나는 컴퓨터 게임 하기를 좋아합니다", "I like to play computer games"], ["또한", "as well."],
]);
S("s1-6", 2, "I study English everyday.", "I study English every day.");
CHUNKS("s1-6", [
  ["나는 많은 다른 과목들을 공부합니다", "I study many different subjects"], ["학교에서", "at school,"], ["하지만 내가 가장 좋아하는 과목은 영어입니다.", "but my favorite subject is English."],
  ["나는 영어를 공부합니다", "I study English"], ["매일", "every day."],
  ["나는 영어를 공부해 오고 있습니다", "I have been studying English"], ["지금까지 (3, 4 또는 5)년 동안", "for (3, 4 or 5) years so far."],
  ["나는 영어 공부하기를 좋아합니다", "I like studying English"], ["왜냐하면 재미있고 신나기 때문입니다", "because it is fun and exciting"], ["배우는 것이", "to learn."],
]);
CHUNKS("s4-2", [
  ["우리 가족은 모입니다", "My family gets together"], ["휴일 동안", "during the holidays"], ["그리고 우리는 함께 식사를 합니다.", "and we eat together."],
  ["우리는 즐거운 시간을 보냅니다", "We have fun"], ["농담을 주고받고 웃으면서", "telling jokes and laughing."],
  ["나는 너무 기쁩니다", "I am so glad"], ["이렇게 많은 친척들이 있어서", "to have so many relatives."],
]);
S("s4-6", 3, "My oldest uncle is a wonderful story teller.", "My oldest uncle is a wonderful storyteller.");
K("s4-6", 3, "나의 큰삼촌은 훌륭한 이야기꾼 이십니다.", "나의 큰삼촌은 훌륭한 이야기꾼이십니다.");
CHUNKS("s4-6", [
  ["나의 다른 삼촌들도 매우 성공하셨습니다.", "My other uncles are very successful, too."],
  ["한 분은 건축가이십니다", "One is an architect"], ["그리고 다른 한 분은 관리자이십니다", "and the other is a manager"], ["작은 제조업 회사의", "at a small manufacturing firm."],
  ["나의 큰삼촌은", "My oldest uncle is"], ["훌륭한 이야기꾼이십니다.", "a wonderful storyteller."],
  ["그는 그의 삶에 관하여 말씀하십니다", "He talks about his life,"], ["그가 군대에 있었을 때를 포함하여", "including when he was in the military."],
  ["내가 그의 이야기를 들을 때", "When I listen to him,"], ["그는 너무 웃겨서", "he is so funny that"], ["내가 눈물 날 때까지 웃게 만듭니다.", "he makes me laugh until I cry."],
  ["나의 사촌들도 함께 어울려 놀기에 재미있습니다.", "My cousins are fun to hang out with, too."],
]);
CHUNKS("s5-5", [
  ["보통 수업시간에", "Usually in class,"], ["학생들은 매우 친절합니다", "the students are very friendly"], ["서로서로에게", "to each other."],
  ["학교에서 나의 가장 친한 친구는", "My best friend at school"], ["내 옆에 앉아 있습니다.", "is sitting next to me."],
  ["그의/그녀의 이름은 (친구 이름)입니다.", "His/Her name is (friend’s name)."],
  ["쉬는 시간 동안", "During break time,"], ["우리는 밖에 나갑니다", "we go outside"], ["그리고 농구나 축구를 합니다.", "and play basketball or football."],
  ["우리 둘 다 농구를 좋아합니다", "We both like basketball"], ["왜냐하면 우리는 키가 크기 때문입니다.", "because we are tall."],
]);
CHUNKS("s7-3", [
  ["나는 많은 친구들을 사귀어 왔습니다", "I have made a lot of friends"], ["나의 학원에서", "at my academies."],
  ["그들은 매우 친절합니다", "They are very friendly"], ["그리고 나는 그들로부터 많은 것을 배웁니다.", "and I learn a lot from them."],
  ["나는 생각합니다", "I think that"], ["그들이 나에게 좋은 영향을 준다고", "they have a good influence on me."],
  ["나의 학원 선생님들은 아는 것이 매우 많으십니다", "My academy teachers are very knowledgeable,"], ["그리고 훌륭한 교육자이십니다.", "and are great educators."],
  ["그분들은 항상 우리를 도와주십니다", "They always help us"], ["우리가 무언가를 이해하는 데 어려움이 있을 때", "when we have trouble understanding anything."],
  ["그분들은 우리가 질문하도록 격려해 주십니다", "They encourage us to ask questions"], ["우리가 이해하지 못하면", "if we don’t understand."],
  ["나는 나의 선생님들 모두를 좋아합니다", "I like all of my teachers,"], ["그리고 그분들 각각을 존경합니다.", "and look up to each of them."],
]);
CHUNKS("s8-2", [
  ["방과 후에", "After school,"], ["숙제를 하는 것은 첫 번째 일입니다", "doing homework is the first thing"], ["내가 하는", "that I do."],
  ["보통 나는 숙제가 있습니다", "Usually, I have homework"], ["학교와 학원 둘 다에서", "from both school and my academies,"], ["그래서 나는 숙제를 시작해야만 합니다", "so I must start my homework"], ["바로", "right away."],
  ["내가 어려운 문제들이 있을 때", "When I have difficult questions,"], ["보통 나의 어머니께서 나를 도와주십니다.", "my mother usually helps me."],
  ["그녀는 매우 똑똑하십니다", "She is very smart,"], ["그래서 그녀는 답을 알고 계십니다", "so she knows the answer"], ["나의 질문들의 거의 모든", "to almost all of my questions."],
  ["숙제하기는 항상 재미있는 것은 아닙니다", "Doing homework is not always fun,"], ["하지만 중요합니다", "but it is important"], ["나의 숙제를 모두 마치는 것은", "to finish all of my homework,"], ["그래서 나는 복습할 수 있습니다", "so I can review"], ["학교에서 배운 것을", "what I learned in school."],
]);
CHUNKS("s9-1", [
  ["나는 보통 일어납니다", "I usually get up"], ["오전 7시에", "at 7:00 a.m."], ["그리고 세수를 하고 이를 닦습니다.", "and wash my face and brush my teeth."],
  ["그 후에", "Afterwards,"], ["나의 가족과 나는 함께 아침을 먹습니다", "my family and I eat breakfast together,"], ["그 다음에 나는 옷을 입습니다.", "and then I get dressed."],
  ["나는 보통 집을 나섭니다", "I usually leave my house"], ["오전 8시까지", "by 8:00 a.m."],
  ["나는 학교로 걸어갑니다", "I walk to school"], ["나의 친구들과 함께", "with my friends"], ["우리 동네에 사는", "who live in my neighborhood."],
  ["학교는 시작합니다", "School begins"], ["오전 8시 30분에", "at 8:30 a.m."],
  ["우리는 4교시 수업이 있습니다", "We have four classes"], ["점심시간 전에", "before lunch."],
  ["내가 가장 좋아하는 수업은 영어입니다.", "My favorite class is English."],
]);
CHUNKS("s9-2", [
  ["점심시간은 시작합니다", "Lunchtime starts"], ["오후 12시 30분에", "at 12:30 p.m."], ["그리고 오후 1시 30분에 끝납니다.", "and ends at 1:30 p.m."],
  ["나의 학교는 점심을 제공합니다", "My school provides lunch"], ["모든 학생들에게", "for all of the students."],
  ["점심식사 후에", "After lunch,"], ["우리는 두 교시의 수업이 더 있습니다.", "we have two more classes."],
  ["마지막 수업이 끝난 후에", "After the final class finishes"], ["오후 3시에", "at 3:00 p.m.,"], ["학생들은 교실을 청소합니다", "the students clean their classrooms,"], ["그리고 청소가 끝난 후에", "and after cleaning,"], ["오늘의 학교 수업이 끝납니다.", "school is finished for the day."],
  ["그 다음에", "Then,"], ["나는 영어학원과 수학학원에 갑니다.", "I go to my English and Math academies."],
  ["나는 거기서 3시간 동안 공부합니다", "I study there for three hours"], ["집에 가기 전에", "before going home."],
]);
// S-11 no Saturday classes since 2012
S("s11-1", 1, "After school on Saturday, I go home and do chores around the house.", "On Saturday morning, I do chores around the house.");
K("s11-1", 1, "토요일 방과 후에, 나는 집에 가서 집안일을 합니다.", "토요일 오전에 나는 집안일을 합니다.");
CHUNKS("s11-1", [
  ["토요일 오전에", "On Saturday morning,"], ["나는 집안일을 합니다.", "I do chores around the house."],
  ["나는 내 방을 청소합니다", "I clean my room"], ["그 다음에 나는 조깅을 갑니다", "and then I go jogging"], ["(해피)라는 이름의 나의 개와 함께", "with my dog named (Happy)."],
  ["오후에", "In the afternoon,"], ["나는 나의 친구들과 함께 놉니다", "I play with my friends"], ["놀이터에서", "at the playground."],
  ["우리는 컴퓨터 게임도 함께 합니다.", "We play computer games together, too."],
  ["우리는 종종 보냅니다", "We often have"], ["함께 재미있고 흥미진진한 시간을", "fun and exciting times together."],
]);
S("s11-2", 1, "On Saturdays, my father also finishes his day early.", "On Saturdays, my father usually finishes work early.");
K("s11-2", 1, "토요일에, 나의 아버지 또한 그의 하루를 일찍 마칩니다.", "토요일에 나의 아버지께서는 보통 일을 일찍 마치십니다.");
CHUNKS("s11-2", [
  ["토요일에", "On Saturdays,"], ["나의 아버지께서는 보통 일을 마치십니다", "my father usually finishes work"], ["일찍", "early."],
  ["가끔 그는 가십니다", "Sometimes he goes"], ["출장을", "on business trips,"], ["하지만 그가 집에 계시면", "but if he is at home,"], ["우리는 외출하기를 좋아합니다", "we like to go out"], ["저녁식사를 함께 하러", "for dinner together"], ["가족끼리", "as a family."],
  ["나의 아버지께서는 나를 많이 도와주십니다", "My father helps me a lot"], ["왜냐하면 그는 항상 관심이 있으시기 때문입니다", "because he is always interested"], ["아는 데", "in knowing"], ["무슨 일이 일어나는지", "what is going on"], ["나의 삶에", "in my life."],
]);
CHUNKS("s11-3", [
  ["일요일 아침은 교회에 가는 시간입니다.", "Sunday morning is church time."],
  ["우리 가족은 일찍 일어납니다", "Our family gets up early"], ["그리고 교회 갈 준비를 합니다.", "and gets ready for church."],
  ["나의 교회는 그리 멀지 않습니다", "My church is not very far"], ["나의 집에서", "from my house,"], ["그래서 우리는 거기에 걸어갈 수 있습니다.", "so we can walk there."],
  ["예배는 시작합니다", "Services start"], ["오전 9시에", "at 9:00 a.m."], ["그리고 오전 11시 30분에 끝납니다.", "and end at 11:30 a.m."],
  ["예배 시간 동안", "During the service,"], ["나는 주일학교에 참석합니다.", "I attend Sunday school."],
  ["나는 많은 좋은 교훈들을 배웁니다", "I learn a lot of good lessons"], ["거기에서", "there."],
  ["나에게는 교회 친구들도 많이 있습니다.", "I have a lot of church friends, too."],
]);
CHUNKS("s11-4", [
  ["일요일 오후는", "Sunday afternoon"], ["우리 가족을 위한 여가 시간입니다.", "is leisure time for my family."],
  ["우리는 보통 시간을 보냅니다", "We usually hang out"], ["집에서 함께", "at home together."],
  ["나의 아버지께서는 보통 신문을 읽으십니다", "My father usually reads the newspaper"], ["그리고 인터넷 서핑을 하십니다.", "and surfs the Internet."],
  ["나의 어머니께서는 책을 읽으십니다", "My mother reads books"], ["또는 TV를 보십니다.", "or watches TV."],
  ["나는 종종 나의 남동생/여동생과 함께 놉니다", "I often play with my brother/sister"], ["또는 숙제를 합니다.", "or do my homework."],
  ["일요일은 평화롭고 편안한 날입니다", "Sunday is a peaceful and relaxing day"], ["우리 가족에게", "for my family."],
]);
CHUNKS("s12-3", [
  ["겨울방학은 시작합니다", "Winter vacation begins"], ["12월 말에", "at the end of December."],
  ["밖이 춥기 때문에", "Because it is cold outside,"], ["나는 집에서 더 많은 시간을 보냅니다", "I spend more time at home"], ["겨울방학 동안에", "during the winter vacation"], ["여름보다", "than during the summer."],
  ["나는 시간을 보냅니다", "I spend time"], ["숙제를 하고, TV를 보고,", "doing my homework, watching TV,"], ["인터넷을 서핑하고, 책을 읽으면서", "surfing the internet, and reading books."],
  ["나의 가족은 또한 스키장에 갑니다", "My family also goes to the ski resort"], ["겨울 동안에", "during the winter."],
  ["나는 정말 좋아합니다", "I love"], ["스노보드 타기와 썰매 타기를", "snowboarding and sledding."],
  ["겨울방학은 짧습니다", "Winter vacation is short,"], ["하지만 항상 재미있고 신납니다.", "but it is always fun and exciting."],
]);
S("s8-4", 1, "After dinner, our family watches T.V together.", "After dinner, our family watches TV together.");
S("s8-4", 2, "My mother doesn’t allow us to watch a lot of T.V.", "My mother doesn’t allow us to watch a lot of TV.");
S("s8-4", 4, "After I finish watching T.V, I do a little review to prepare for school, write in my journal, and then go to bed.", "After I finish watching TV, I do a little review to prepare for school, write in my journal, and then go to bed.");
CHUNKS("s8-4", [
  ["저녁식사 후에", "After dinner,"], ["나의 가족은 TV를 봅니다", "our family watches TV"], ["함께", "together."],
  ["나의 어머니께서는 우리에게 허락하지 않으십니다", "My mother doesn’t allow us"], ["TV를 많이 보는 것을", "to watch a lot of TV."],
  ["나는 연예 (스포츠) 프로그램을 좋아합니다", "I like the entertainment (sports) programs"], ["왜냐하면 나는 볼 수 있기 때문입니다", "because I can see"], ["유명한 배우들과 음악가들 (운동선수들)을", "famous actors and musicians (sports players)."],
  ["TV 시청을 마친 후에", "After I finish watching TV,"], ["나는 약간의 복습을 합니다", "I do a little review"], ["학교 수업을 준비하기 위해", "to prepare for school,"], ["나의 일기를 쓰고", "write in my journal,"], ["그리고 나서 잠자리에 듭니다.", "and then go to bed."],
  ["비록 나의 하루가 가득 차 있지만", "Even though my days are filled"], ["많은 활동들로", "with many activities,"], ["그것들은 또한 많이 재미있습니다.", "they are a lot of fun too."],
]);
CHUNKS("s9-3", [
  ["학원에서 수업을 마친 후", "After finishing classes at the academies,"], ["나는 집에 가서 저녁을 먹습니다", "I go home and have dinner"], ["나의 가족과 함께", "with my family."],
  ["나의 어머니는 항상 저녁 식사를 준비하십니다.", "My mother always makes dinner."],
  ["우리가 먹을 때", "When we eat,"], ["나의 아버지는 보통 말씀하십니다", "my father usually talks"], ["그의 하루에 대해", "about his day,"], ["그리고 우리는 나눕니다", "and we share"], ["우리의 경험들을", "our experiences."],
  ["저녁 식사 후에", "After dinner,"], ["우리는 텔레비전을 봅니다", "we watch television"], ["함께", "together."],
  ["나는 나의 숙제를 시작합니다", "I start my homework"], ["밤 9시경에", "at around 9:00 p.m."],
  ["나의 영어 숙제는", "My English homework is"], ["내가 가장 좋아하는 것입니다.", "my favorite."],
  ["그것이 내가 가장 좋아하는 것입니다", "It is my favorite"], ["왜냐하면 그것이 더 쉽기 때문입니다", "because it is easier"], ["다른 과목들보다", "than my other subjects."],
  ["그 후에", "After that,"], ["나는 빨리 씁니다", "I quickly write"], ["일기를", "in my journal"], ["나의 하루에 관해", "about my day."],
  ["나는 잠자리에 듭니다", "I go to bed"], ["대략 밤 10시 30분에", "at about 10:30 p.m."], ["그리고 생각합니다", "and think"], ["얼마나 멋진 하루였는지", "what a wonderful day it was!"],
]);
// S-12 dates; S-19 effect
S("s16-1", 3, "A few years ago, Queen Elizabeth II came to Korea.", "In 1999, Queen Elizabeth II visited Korea.");
K("s16-1", 3, "몇 년 전, 엘리자베스 2세 여왕이 한국을 방문했습니다.", "1999년에 엘리자베스 2세 여왕이 한국을 방문했습니다.");
S("s16-1", 5, "Her ability to interpret so well had a great affect on me.", "Her ability to interpret so well had a great effect on me.");
K("s16-1", 5, "그녀의 멋진 통역하는 능력은 나에게 깊은 인상을 주었습니다.", "그녀의 뛰어난 통역 능력은 나에게 큰 영향을 주었습니다.");
CHUNKS("s16-1", [
  ["나는 TV에서 보았고 읽었습니다", "I have seen on TV and read"], ["많은 성공한 사람들에 대해", "about many successful people"], ["빌 게이츠, (이름), (이름)과 같은", "such as Bill Gates, (name) and (name)."],
  ["이러한 사람들은 나에게 많은 영향을 주었습니다", "These people have influenced me a lot"], ["이런 저런 방법으로", "in one way or another."],
  ["1999년에", "In 1999,"], ["엘리자베스 2세 여왕이", "Queen Elizabeth II"], ["한국을 방문했습니다.", "visited Korea."],
  ["그녀에게는 통역사가 있었습니다", "She had an interpreter"], ["그녀와 함께", "with her"], ["매우 전문적인", "who was very professional."],
  ["그녀의 뛰어난 통역 능력은", "Her ability to interpret so well"], ["나에게 큰 영향을 주었습니다.", "had a great effect on me."],
  ["그것은 나에게 감명을 주었습니다", "It has impressed me"], ["원할 만큼 충분히", "enough to want"], ["통역사가 되기를", "to become an interpreter."],
]);
S("s15-1", 1, "A few years ago our country hosted the 2002 World Cup.", "In 2002, Korea and Japan co-hosted the World Cup.");
K("s15-1", 1, "몇 년 전에 우리나라는 2002월드컵을 개최했습니다.", "2002년에 한국과 일본은 월드컵을 공동 개최했습니다.");
S("s15-1", 2, "Our country’s soccer players are not one of the best teams.", "At that time, our national soccer team was not one of the best teams in the world.");
K("s15-1", 2, "우리나라의 축구선수들은 최고의 팀 중 하나가 아니었습니다.", "그때 우리나라 축구 대표팀은 세계 최고의 팀 중 하나가 아니었습니다.");
S("s15-1", 3, "Before the World Cup, soccer was not famous in our country.", "Before 2002, Korea had never won a World Cup match.");
K("s15-1", 3, "월드컵 이전에 축구는 우리나라에서 유명하지 않았습니다.", "2002년 이전에 한국은 월드컵 본선 경기에서 한 번도 이긴 적이 없었습니다.");
CHUNKS("s15-1", [
  ["2002년에", "In 2002,"], ["한국과 일본은 월드컵을 공동 개최했습니다.", "Korea and Japan co-hosted the World Cup."],
  ["그때", "At that time,"], ["우리나라 축구 대표팀은", "our national soccer team"], ["최고의 팀 중 하나가 아니었습니다", "was not one of the best teams"], ["세계에서", "in the world."],
  ["2002년 이전에", "Before 2002,"], ["한국은 월드컵 경기에서 한 번도 이긴 적이 없었습니다.", "Korea had never won a World Cup match."],
  ["스포츠는 방법을 가지고 있습니다", "Sports have a way of"], ["새로운 영웅과 스타를 만드는", "making new heroes and stars."],
  ["나는 당신에게 소개하고 싶습니다", "I would like to introduce to you"], ["한국 축구계의 한 사람을", "one person from the world of Korean soccer"], ["내가 가장 존경하는", "that I admire the most."],
]);

// ================================================================ Medium
// S-08 / S-29 Admiral Yi Sun-sin
S("s13-2", 1, "The person I respect the most is General Soon-Shin Lee (이순신).", "The person I respect the most is Admiral Yi Sun-sin.");
K("s13-2", 1, "내가 가장 존경하는 사람은 이순신장군 입니다.", "내가 가장 존경하는 사람은 이순신 장군입니다.");
S("s13-2", 2, "General Lee lived 500 years ago, and he defeated the Japanese over and over again.", "Admiral Yi lived more than 400 years ago, and he defeated the Japanese navy over and over again.");
K("s13-2", 2, "이 장군은 500년 전에 살았고, 그는 여러 번 일본을 무찔렀습니다.", "이순신 장군은 400여 년 전에 살았고, 여러 번 일본 수군을 무찔렀습니다.");
S("s13-2", 4, "He created the turtle ship that he had used against the Japanese and conquered them many times.", "He built improved turtle ships, used them against the Japanese, and defeated them many times.");
K("s13-2", 4, "그는 일본과 맞서 싸울 때 사용했었던 거북선을 창작했고 그들을 수 차례에 정복했습니다.", "그는 개량한 거북선을 만들어 일본군과 싸우는 데 사용했고, 여러 차례 그들을 물리쳤습니다.");
CHUNKS("s13-2", [
  ["내가 가장 존경하는 사람은", "The person I respect the most"], ["이순신 장군입니다.", "is Admiral Yi Sun-sin."],
  ["이순신 장군은 살았습니다", "Admiral Yi lived"], ["400여 년 전에", "more than 400 years ago,"], ["그리고 그는 일본 수군을 무찔렀습니다", "and he defeated the Japanese navy"], ["여러 번", "over and over again."],
  ["그는 살았습니다", "He lived"], ["한국 역사의 어려운 시대에", "during a difficult time of Korean history,"], ["하지만 그는 항상 생각했습니다", "but he always thought of"], ["한국과 한국 사람들을", "Korea and Koreans"], ["자신보다 먼저", "before himself."],
  ["그는 개량한 거북선을 만들었습니다", "He built improved turtle ships,"], ["그것을 일본군에 맞서 사용했습니다", "used them against the Japanese,"], ["그리고 여러 차례 그들을 물리쳤습니다.", "and defeated them many times."],
]);
S("s13-3", 1, "I respect General Lee because he was able to prepare and execute great military victories.", "I respect Admiral Yi because he prepared well and won great military victories.");
K("s13-3", 1, "나는 이순신 장군을 존경합니다. 왜냐하면 그는 준비할 수 있었고 큰 군사적 승리를 거둘 수 있었습니다.", "나는 이순신 장군을 존경합니다. 왜냐하면 그는 철저히 준비했고 큰 군사적 승리를 거두었기 때문입니다.");
S("s13-3", 4, "To General Lee, duty and responsibility were very important.", "To Admiral Yi, duty and responsibility were very important.");
S("s13-3", 5, "One day, I hope to grow up to be as brave and confident as General Soon-Shin Lee.", "One day, I hope to grow up to be as brave and confident as Admiral Yi Sun-sin.");
CHUNKS("s13-3", [
  ["나는 이순신 장군을 존경합니다", "I respect Admiral Yi"], ["왜냐하면 그는 철저히 준비했기 때문입니다", "because he prepared well"], ["그리고 큰 군사적 승리를 거두었습니다.", "and won great military victories."],
  ["그는 항상 자신감이 있었습니다", "He was always confident"], ["그의 병사들이 승리할 것이라고", "that his soldiers would be successful"], ["전투에서", "in battle."],
  ["그는 매우 용감했습니다", "He was very brave"], ["그리고 죽는 것을 두려워하지 않았습니다.", "and not afraid to die."],
  ["이순신 장군에게", "To Admiral Yi,"], ["의무와 책임감은", "duty and responsibility"], ["매우 중요했습니다.", "were very important."],
  ["언젠가", "One day,"], ["나는 자라나기를 희망합니다", "I hope to grow up"], ["이순신 장군처럼 용감하고 자신감 있게", "to be as brave and confident as Admiral Yi Sun-sin."],
]);
// S-10 holidays
S("s18-1", 1, "My country has many traditional holidays.", "My country has many holidays.");
K("s18-1", 1, "우리 나라는 많은 전통 공휴일들이 있습니다.", "우리나라에는 많은 공휴일이 있습니다.");
S("s18-1", 3, "We celebrate Lunar New Year’s, Independence Day, Arbor Day, Buddha’s Birthday and many more.", "We celebrate Seollal, Liberation Day, Children’s Day, Buddha’s Birthday, Chuseok, and many more.");
K("s18-1", 3, "우리는 음력설날, 독립기념일, 식목일, 석가탄신일, 그리고 더 많은 날들을 기념합니다.", "우리는 설날, 광복절, 어린이날, 부처님 오신 날, 추석 그리고 더 많은 날들을 기념합니다.");
CHUNKS("s18-1", [
  ["우리나라에는 있습니다", "My country has"], ["많은 공휴일이", "many holidays."],
  ["공휴일은 특별한 시간입니다", "Holidays are a special time"], ["가족들이 함께 모일 수 있는", "when families can get together"], ["그리고 기념할 수 있는", "and celebrate."],
  ["우리는 기념합니다", "We celebrate"], ["설날, 광복절, 어린이날,", "Seollal, Liberation Day, Children’s Day,"], ["부처님 오신 날, 추석,", "Buddha’s Birthday, Chuseok,"], ["그리고 더 많은 날들을", "and many more."],
  ["저는 이야기하고 싶습니다", "I would like to tell you"], ["한국에서 가장 큰 전통 명절 두 가지에 대해", "about the two largest traditional holidays in Korea."],
]);
// S-13 Korean Folk Village is in Yongin
S("s20-3", 1, "One very interesting place to visit is the Korean Folk Village located near the city of Suwon in Gyoung-gi Province, not far from the capital of Seoul.", "One very interesting place to visit is the Korean Folk Village, located in Yongin, near Suwon, in Gyeonggi Province, not far from the capital, Seoul.");
K("s20-3", 1, "방문할만한 매우 흥미 있는 한 장소는 한국민속촌은 수도인 서울에서 그다지 멀지 않은 경기도 수원시에 위치해 있습니다.", "방문할 만한 매우 흥미로운 장소 하나는 수도 서울에서 그리 멀지 않은 경기도 용인시(수원 근처)에 있는 한국민속촌입니다.");
K("s20-3", 3, "그 곳은 매우 유명한 관광지 입니다.", "그곳은 많은 외국인 방문객들에게 매우 인기 있는 관광지입니다.");
CHUNKS("s20-3", [
  ["방문할 만한 매우 흥미로운 장소 하나는", "One very interesting place to visit"], ["한국민속촌입니다", "is the Korean Folk Village,"], ["용인시에 위치한", "located in Yongin,"], ["수원 근처", "near Suwon,"], ["경기도에", "in Gyeonggi Province,"], ["수도 서울에서 멀지 않은", "not far from the capital, Seoul."],
  ["당신이 그곳을 방문할 때", "When you visit there,"], ["전통 결혼식을 볼 수 있습니다", "you can witness a traditional wedding ceremony,"], ["다양한 전통 음식을 맛볼 수 있습니다", "taste a variety of traditional foods,"], ["그리고 관찰할 수 있습니다", "and you can observe"], ["한국인들이 옛날에 어떻게 살았는지", "how Koreans lived during ancient times."],
  ["그곳은 매우 인기 있는 관광지입니다", "It is a very popular attraction"], ["많은 외국인 방문객들에게", "for many foreign visitors."],
]);
// S-14 place names
S("s20-2", 2, "Such places include the Bulguk-Temple, Soungni-San National Park, and Independence-Hall.", "Such places include Bulguksa Temple, Songnisan National Park, and the Independence Hall of Korea.");
C("s20-2", "the Bulguk-Temple, Soungni-San National Park,", "Bulguksa Temple, Songnisan National Park,");
C("s20-2", "and Independence-Hall.", "and the Independence Hall of Korea.");
// S-17 … S-28
S("s4-1", 2, "Let/Allow me tell you about my relatives.", "Let me tell you about my relatives.");
C("s4-1", "Let/Allow me (to) tell you", "Let me tell you", "당신에게 말씀드리겠습니다.");
S("s12-2", 1, "I spend my summer vacation a bit different from the winter one.", "I spend my summer vacation a bit differently from the winter one.");
C("s12-2", "a bit different from the winter one.", "a bit differently from the winter one.");
S("s12-2", 6, "Even if it is terribly hot during the summer, I am happy to travel with my family anyways.", "Even if it is terribly hot during the summer, I am happy to travel with my family anyway.");
C("s12-2", "anyways.", "anyway.");
K("s12-2", 6, "어쨌던, 비록 여름 동안 지독히 덥다 하더라도, 나는 나의 가족과 함께 여행하는 것이 행복합니다.", "어쨌든, 비록 여름 동안 지독히 덥다 하더라도, 나는 나의 가족과 함께 여행하는 것이 행복합니다.");
S("s5-2", 6, "On my way to school, I stop by the stationary store and go in to buy the supplies I need for class.", "On my way to school, I stop by the stationery store and go in to buy the supplies I need for class.");
C("s5-2", "I stop by the stationary store", "I stop by the stationery store");
S("s7-2", 2, "Everyday I go and learn new sentences, words, and songs.", "Every day I go and learn new sentences, words, and songs.");
C("s7-2", "Everyday I go and learn", "Every day I go and learn");
S("s16-3", 2, "First of all, I will study English everyday, by practicing listening and speaking.", "First of all, I will study English every day by practicing listening and speaking.");
S("s2-3", 5, "She had worked at a department store for several years.", "She worked at a department store for several years.");
C("s2-3", "She had worked", "She worked", "그녀는 일했습니다.");
K("s2-3", 4, "나의 어머니는 가정주부 이십니다.", "나의 어머니는 가정주부이십니다.");
S("s5-1", 2, "I am often late for school because I sleep-in late, and my mornings are very busy.", "I am often late for school because I sleep in late, and my mornings are very busy.");
C("s5-1", "because I sleep-in late,", "because I sleep in late,");
K("s5-1", 2, "나는 늦잠을 자기 때문에 자주 학교에 지각을 합니다.", "나는 늦잠을 자서 자주 학교에 지각을 하고, 나의 아침은 매우 바쁩니다.");
S("s5-4", 4, "Like most other students, my favorite subject is P.E., and the class I dislikethe most is history.", "Like most other students, my favorite subject is P.E., and the class I dislike the most is history.");
S("s8-1", 4, "After I chat with my mom for a little while, I go to my room, and I sometimesplay on the computer.", "After I chat with my mom for a little while, I go to my room, and I sometimes play on the computer.");
S("s18-3", 2, "During Chu-seok, People visit their ancestrial tombs and make an offering of food to their ancestors.", "During Chu-seok, people visit their ancestral tombs and make an offering of food to their ancestors.");
C("s18-3", "People visit their ancestrial tombs", "people visit their ancestral tombs");
K("s18-3", 1, "추석은 한 해의 가장 큰 국경일 이고, 그것은 종종 한국의 추수감사절이라 불린다.", "추석은 한 해의 가장 큰 명절이고, 종종 한국의 추수감사절이라 불린다.");
CK("s18-3", "the biggest national holiday", "가장 큰 국경일 입니다.", "가장 큰 명절입니다.");
S("s4-4", 2, "She has two older brothers and two sisters.", "She has two older brothers and two older sisters.");
K("s4-4", 2, "그녀는 오빠가 2명 있고, 여동생이 2명 있습니다.", "그녀는 오빠가 2명 있고, 언니가 2명 있습니다.");
C("s4-4", "two older brothers and two sisters.", "two older brothers and two older sisters.", "두 명의 오빠와 두 명의 언니를");
S("s4-4", 4, "Because grandfather passed away several years ago, my grandmother lives with my mother’s eldest brother.", "Because my grandfather passed away several years ago, my grandmother lives with my mother’s eldest brother.");
C("s4-4", "Because grandfather passed away", "Because my grandfather passed away");
S("s8-3", 2, "Usually, my father comes home late, so we can’t be together at suppertime.", "Sometimes my father comes home late, so we can’t all be together at suppertime.");
K("s8-3", 2, "보통 나의 아버지께서는 늦게 오시기에 우리는 저녁시간을 함께 할 수 없습니다.", "가끔 나의 아버지께서 늦게 오시는 날에는 우리가 모두 함께 저녁을 먹지 못합니다.");
C("s8-3", "Usually, my father comes home late,", "Sometimes my father comes home late,", "가끔 나의 아버지는 늦게 집에 오신다.");
C("s8-3", "so we can't be together", "so we can't all be together", "그래서 우리가 모두 함께 할 수 없다.");
S("s3-1", 1, "I would like to introduce my friend to you. Allow me to introduce my friend to you.", "Allow me to introduce my friend to you.");
K("s6-4", 1, "나의 선생님께서는 내가 나의 꿈을 깨닫는 것을 도와주십니다.", "나의 선생님께서는 내가 나의 꿈을 이루도록 도와주십니다.");
CK("s6-4", "realize my dreams.", "나의 꿈은 깨닫도록", "나의 꿈을 이루도록");
// S-29 Hangul inside English; placeholders for the learner's own details
S("s1-2", 2, "I live at 한국Apartment.", "I live in (apartment name) Apartments.");
K("s1-2", 2, "나는 한국아파트에 삽니다.", "나는 (아파트 이름) 아파트에 삽니다.");
S("s1-2", 3, "I am a 4th grade student at 한국 Elementary School.", "I am a 4th grade student at (school name) Elementary School.");
K("s1-2", 3, "나는 한국 초등학교 4학년입니다.", "나는 (학교 이름) 초등학교 4학년입니다.");
S("s1-2", 4, "I am 11 years old.", "I am (10) years old.");
K("s1-2", 4, "나는 11살 입니다.", "나는 (10)살입니다.");
C("s1-2", "at 한국 Elementary School.", "at (school name) Elementary School.", "(학교 이름) 초등학교에서");

// ================================================================ Low
// S-31 Korean
CK("s12-1", "to public school", "국립학교에", "공립학교에");
K("s10-5", 2, "그것은 학원들과 학교의 정상적인 계획의 끝입니다.", "그날은 학교와 학원의 정규 일정이 끝나는 날입니다.");
CK("s10-5", "the end of the normal schedule", "학교와 학원 일정의 끝", "학교와 학원 정규 일정의 끝");
K("s20-1", 2, "그것의 지질학적 경치는 아름답고 방문할만한 많은 훌륭한 장소들로 가득 차 있습니다.", "그것의 지리적 경관은 아름답고 방문할 만한 많은 훌륭한 장소들로 가득 차 있습니다.");
CK("s20-1", "Its geographical landscape", "그것의 지리학적 경치는", "그것의 지리적 경관은");
S("s20-5", 6, "Mt. Halla is the highest mountain in South Korea; it’s almost 2,000 meters high (about 6500 feet).", "Mt. Halla is the highest mountain in South Korea; it’s almost 2,000 meters high (about 6,400 feet).");
K("s20-5", 6, "한라산은 남한에서 가장 높은 산이고 그것의 높이는 이천 미터 입니다. (약 6500피트)", "한라산은 남한에서 가장 높은 산이고 높이는 약 2,000미터(1,947미터, 약 6,400피트)입니다.");
C("s20-5", "it's", "it’s almost 2,000 meters high (about 6,400 feet).", "높이는 약 2,000미터(약 6,400피트)입니다.");
// S-32 notation
S("s6-2", 2, "My teacher’s name is Mr./Ms (Surname).", "My teacher’s name is Mr./Ms. (Surname).");
K("s6-2", 2, "나의 선생님 성함은 홍선생님 이십니다.", "나의 선생님 성함은 (성) 선생님이십니다.");
K("s6-2", 3, "그는/그녀는 약 30세 입니다.", "그는/그녀는 약 (나이)세이십니다.");
S("s6-3", 2, "Sometimes, He/She speaks with a funny accent!", "Sometimes, he/she speaks with a funny accent!");
K("s6-3", 1, "나의 선생님은 강원도 출신이십니다.", "나의 선생님은 (지역) 출신이십니다.");
K("s6-3", 6, "제 생각에 그는/그녀는 파란색(초록, 빨강, 검정, 보라, 등)을 좋아하십니다. 왜냐하면 그녀는 항상 (빨강 타이, 검정 정장, 보라색 드레스)을 입기 때문입니다.", "제 생각에 그는/그녀는 파란색(초록, 빨강, 검정, 보라, 등)을 좋아하십니다. 왜냐하면 그는/그녀는 항상 (빨강 타이, 검정 정장, 보라색 드레스)을 입기 때문입니다.");
S("s17-4", 1, "Since the end of the war in 1953, the country began to develop very quickly, especially during the 1970’s.", "Since the end of the war in 1953, the country has developed very quickly, especially during the 1970s.");
C("s17-4", "began to develop very quickly,", "has developed very quickly,", "매우 빠르게 발전해 왔습니다.");
S("s18-2", 1, "The first big holiday is Lunar New Year’s also known as seol-lal.", "The first big holiday is Seollal, Lunar New Year’s Day.");
K("s18-2", 1, "첫 번째로 큰 휴일은 또한 설날이라고 알려진 음력설날입니다.", "첫 번째로 큰 명절은 음력 새해 첫날인 설날입니다.");
C("s18-2", "is Lunar New Year's", "is Seollal,", "설날입니다.");
C("s18-2", "also known as seol-lal.", "Lunar New Year’s Day.", "음력 새해 첫날인");
S("s19-1", 3, "Our clothes, housing, names, and language are not like any other countries.", "Our clothes, housing, names, and language are not like those of any other country.");
C("s19-1", "any other countries'.", "those of any other country.", "어떤 다른 나라의 것과도");
S("s10-3", 1, "My weekday is similar to the other students in my class.", "My weekdays are similar to those of the other students in my class.");
C("s10-3", "My weekday is", "My weekdays are", "나의 평일은");
C("s10-3", "similar to the other students", "similar to those of the other students", "다른 학생들의 평일과 비슷합니다.");
S("s14-3", 4, "I think teaching children is fun, and rewarding, and that you must have a lot of patience in order to teach them.", "I think teaching children is fun and rewarding, and that I must have a lot of patience in order to teach them.");
S("s10-2", 4, "After I get up and prepare for school, the first day of my new week has started on this note.", "After I get up and prepare for school, the first day of my new week begins this way.");
C("s10-2", "has started on this note.", "begins this way.", "이렇게 시작됩니다.");
K("s10-2", 1, "나에게는, 매일 월요일 아침에 일어나는 것이 매우 힘듭니다.", "나에게는, 매주 월요일 아침에 일어나는 것이 매우 힘듭니다.");
CK("s10-2", "every Monday morning.", "매일 월요일 아침에", "매주 월요일 아침에");
S("s12-4", 2, "My dream vacation is to travel abroad to an English speaking country.", "My dream vacation is to travel abroad to an English-speaking country.");
sub(["s19-2"], "Western style", "Western-style");
sub(["s17-1"], "Hwan-in", "Hwanin");
sub(["s17-1"], "Hwan-ung", "Hwanung");
sub(["s17-1"], "Ung-nyo", "Ungnyeo");
sub(["s17-1"], "Dan-goon", "Dangun");
sub(["s17-1"], "Gojoson", "Gojoseon");
sub(["s19-2"], "han-bok", "hanbok");
sub(["s18-3"], "song-pyeun", "songpyeon");
sub(["s18-3"], "Chu-seok", "Chuseok");
sub(["s20-4"], "Gyeong-ju", "Gyeongju");
sub(["s20-4"], "Shilla", "Silla");
S("s20-4", 3, "The Silla Kingdom was its most powerful during the 8th century.", "The Silla Kingdom was at its most powerful during the 8th century.");
C("s20-4", "was its most powerful", "was at its most powerful");
S("s20-4", 5, "Koreans refer to it as this because it contains many of the old remains of theSilla Dynasty.", "Koreans refer to it as this because it contains many of the old remains of the Silla Dynasty."); // S-24
CK("s20-4", "of the Silla Dynasty.", "신라왕국을", "신라 왕조의");
K("s17-4", 1, "1953년 전쟁이 끝난 이래로, 나라는 매우 빨리 발전하기 시작했고, 특히 1970년대에 그랬습니다.", "1953년 전쟁이 끝난 이래로, 나라는 매우 빨리 발전해 왔고, 특히 1970년대에 그랬습니다.");
C("s3-4", "He/She is a truly smart person,", "He/She is smart,", "그는/그녀는 똑똑합니다.");
C("s3-4", "and I am sure that", "so I am confident that", "그래서 나는 확신합니다.");
C("s3-4", "his/her dream will come true.", "his/her dreams will come true.", "그의/그녀의 꿈이 이루어질 것이라고");
C("s4-3", "two) brothers and (two) sisters.", "(two) brothers and (two) sisters.", "두 명의 남자형제와 두 명의 여자형제를");
// S-33 Korean spelling
K("s7-1", 4, "나의 다른 친구들 중 몇몇은 내가 다니는 것 보다 더 많은 학원들을 다녀서 그들은매우 바쁩니다.", "나의 다른 친구들 중 몇몇은 내가 다니는 것보다 더 많은 학원들을 다녀서 그들은 매일 매우 바쁩니다.");
K("s7-1", 5, "그들은 주중에 나와 함께 놀 시간이 아주 작습니다.", "그들은 주중에 나와 함께 놀 시간이 아주 적습니다.");
K("s16-2", 7, "마지막으로, 만일 내가 다른 나라에 간다면 그곳 사람들은 한국말을 이해 할 수 없을지도 몰라서 나는 영어를 잘 말하도록 배워야 합니다. 그래서 나는 그들과 의사소통을 원할히 할 수 있습니다.", "마지막으로, 만일 내가 다른 나라에 간다면 그곳 사람들은 한국말을 이해할 수 없을지도 몰라서 나는 영어를 잘 말하도록 배워야 합니다. 그래야 나는 그들과 의사소통을 원활히 할 수 있습니다.");
K("s3-4", 2, "그는/그녀는 똑똑해서 나는 그의/그녀의 꿈이 이루어 질것이라 확신합니다.", "그는/그녀는 똑똑해서 나는 그의/그녀의 꿈이 이루어질 것이라고 확신합니다.");
K("s4-3", 4, "나의 할아버지할머니는 나의 큰아버지와 함께 살고 있습니다.", "나의 할아버지와 할머니는 나의 큰아버지와 함께 살고 계십니다.");
K("s4-3", 5, "나의 고모와 큰 아빠들은 우리 집 가까이에 살고 있기 때문에 나는 자주 그들에게 가거나 방문합니다.", "나의 고모들과 삼촌들 중 몇 분은 우리 집 가까이에 사셔서, 내가 자주 찾아뵙거나 그분들이 우리 집에 오십니다.");

if (problems.length) {
  console.error("STOP — nothing written:\n  " + problems.join("\n  "));
  process.exit(1);
}
for (const id of touched) { const e = cache.get(id); fs.writeFileSync(e.file, serialize(e.data, e.format)); }
console.log(`STUDENT: ${changes} changes in ${touched.size} lessons`);
