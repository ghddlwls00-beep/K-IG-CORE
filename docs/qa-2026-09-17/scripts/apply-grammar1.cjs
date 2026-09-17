#!/usr/bin/env node
/**
 * GRAMMAR I — every finding in content-review/grammar1.md (G1-01 … G1-58), judged by what
 * is actually right, not by the textbook (owner rule). Korean prompts live on the even
 * page (gh1-NNN), English model answers + "다른 정답" (alternatives, also used for
 * grading) on the next odd page; split pages (-1/-2) repeat items and are kept in step.
 *
 * Rules used for the model answer vs alternatives:
 *  - a wrong or non-standard sentence is replaced (tag questions take it/they, aren't I)
 *  - where the old sentence is still acceptable English, it stays as an alternative so a
 *    learner who writes it is not marked wrong
 *  - broken "alternatives" (merged bracket options, notes, statements without the tag the
 *    exercise asks for) are replaced or removed
 *
 * Every edit states the current text; lib-lesson-edit stops before writing if any differs.
 * English changes need new speech clips (generate-azure-ava.mjs).
 */
const path = require("path");
const { createEditor } = require("./lib-lesson-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const ed = createEditor(REPO, "grammar1");

const answerPage = (koPage) => `gh1-${String(parseInt(koPage.slice(4), 10) + 1).padStart(3, "0")}`;
/** English model answer (+ alternatives). `alts` = [from, to]; omit to leave alternatives alone. */
const en = (koPage, n, fromText, toText, alts, note) => {
  const from = { text: fromText };
  const to = { text: toText };
  if (alts) { from.alternatives = alts[0]; to.alternatives = alts[1]; }
  ed.item(answerPage(koPage), n, from, to, note);
};
const alt = (koPage, n, fromAlts, toAlts, note) => ed.item(answerPage(koPage), n, { alternatives: fromAlts }, { alternatives: toAlts }, note);
const ko = (koPage, n, fromText, toText, note) => ed.item(koPage, n, { text: fromText }, { text: toText }, note);

// ---------------------------------------------------------------- High
// G1-09 tag questions take a pronoun: this/that → it, these/those → they
en("gh1-014", 13, "This is your book. isn't this?", "This is your book, isn't it?", null, "G1-09");
en("gh1-038", 5, "This is a pen, isn't this?", "This is a pen, isn't it?", [["This is a pen?"], undefined], "G1-09 + G1-23");
en("gh1-038", 17, "This is a pen, isn't this?", "This is a pen, isn't it?", null, "G1-09");
en("gh1-038", 7, "These are pens, aren't these?", "These are pens, aren't they?", [["These are pens, are these not?"], ["These are pens, are they not?"]], "G1-09");
en("gh1-038", 19, "These are pens, aren't these?", "These are pens, aren't they?", null, "G1-09");
en("gh1-044", 80, "This is a pen, isn't this?", "This is a pen, isn't it?", [["This is a pen?"], undefined], "G1-09 + G1-23");
en("gh1-046", 82, "These are pens, aren't these?", "These are pens, aren't they?", [["These are pens, are these not?"], ["These are pens, are they not?"]], "G1-09");
en("gh1-046", 100, "This is not a pen, is this?", "This is not a pen, is it?", null, "G1-09");
en("gh1-046", 102, "These are not pens, are these?", "These are not pens, are they?", null, "G1-09");
en("gh1-058", 12, "That is your car, isn't that?", "That is your car, isn't it?", null, "G1-09");
en("gh1-078", 7, "This is a very important problem, isn't this?", "This is a very important problem, isn't it?", null, "G1-09");
en("gh1-100", 118, "This is not a fundamental solution. is this?", "This is not a fundamental solution, is it?", null, "G1-09");
en("gh1-108", 39, "This is a reasonably large area, isn't this?", "This is a reasonably large area, isn't it?", null, "G1-09");
en("gh1-112", 110, "This is a homemade bomb, isn't this?", "This is a homemade bomb, isn't it?", null, "G1-09");
// G1-17 standard English: aren't I (ain't is non-standard)
en("gh1-038", 1, "I am a boy, ain't I?", "I am a boy, aren't I?", [["I am a boy?"], undefined], "G1-17 + G1-23");
en("gh1-038", 9, "I am happy, ain't I?", "I am happy, aren't I?", [["I am happy?"], undefined], "G1-17 + G1-23");
en("gh1-038", 13, "I am in Korea, ain't I?", "I am in Korea, aren't I?", null, "G1-17");
en("gh1-046", 84, "I am in Korea, ain't I?", "I am in Korea, aren't I?", null, "G1-17");
en("gh1-108", 57, "I am extremely tall, ain't I?", "I am extremely tall, aren't I?", null, "G1-17");
alt("gh1-024", 41, ["Ain't I a boy?"], ["Aren't I a boy?"], "G1-17");
alt("gh1-036", 43, ["Ain't I studying English?"], ["Aren't I studying English?"], "G1-17");
alt("gh1-044", 70, ["Ain't I studying English?"], ["Aren't I studying English?"], "G1-17");
alt("gh1-058", 37, ["Ain't I famous?"], ["Aren't I famous?"], "G1-17");
// G1-16 / G1-17 / G1-18 grammar check (gh1-020 questions, gh1-021 answers)
ed.blockText("gh1-020", "(2)우리 말로 “이다, 있다, --하다”에 해당되는 영어 단어는?", "(2)우리말로 “이다, 있다”에 해당되는 영어 단어는?");
ed.blockText("gh1-021", "(2)우리 말로 “이다, 있다, --하다”에 해당되는 영어 단어는?", "(2)우리말로 “이다, 있다”에 해당되는 영어 단어는?");
ed.blockText(
  "gh1-021",
  "답: 동사 + 주어 + not + 주격 보어 혹은 동사와 not를 합친 축약어(isn't, aren't, ain't) + 주어 + 주격",
  "답: 동사 + 주어 + not + 주격 보어, 혹은 동사와 not을 합친 축약어(isn't, aren't) + 주어 + 주격 보어의 순서로 한다. 주어가 I 일 때의 축약형은 Aren't I …? 이다 (ain't 는 표준 영어가 아님).",
);
ed.removeBlocks("gh1-021", ["보어의 순서로 한다.“"]);
// G1-20 two items merged into one line, two answers missing
en("gh1-032", 36, "Don't I love her? 37.This is mine.", "Don't I love her?", [["Do I not love her? 37.This is mine."], ["Do I not love her?"]], "G1-20");
ed.insertAfter("gh1-033", "36", { n: "37", text: "This is mine." });
en("gh1-032", 38, "It is yours. 39.Those are theirs.", "It is yours.", [["It is yours. They are theirs."], undefined], "G1-20");
ed.insertAfter("gh1-033", "38", { n: "39", text: "They are theirs.", alternatives: ["Those are theirs."] });
// G1-25 fifteen English answers belonged to other items — rewritten from the Korean prompts
const g125 = [
  [26, "I love you, don't I?", "You are not in Korea, are you?"],
  [27, "You love my sister, don't you?", "He is not in Korea, is he?"],
  [28, "He loves me, doesn't he?", "She is not in Korea, is she?"],
  [29, "She loves your brother, doesn't she?", "I am not a boy, am I?"],
  [30, "They love you, don't they?", "You are not a girl, are you?"],
  [31, "She loves his brother, doesn't she?", "He is not a boy, is he?"],
  [32, "I love him, don't I?", "She is not a girl, is she?"],
  [33, "He loves her sister, doesn't he?", "This is not a pen, is it?"],
  [34, "I love her, don't I?", "It is not a book, is it?"],
  [35, "I don't love you, do I?", "These are not pens, are they?"],
  [36, "You don't love my sister, do you?", "Those are not books, are they?"],
  [37, "He doesn't love me, does he?", "You are not happy, are you?"],
  [38, "She doesn't love your brother, does she?", "She is not happy, is she?"],
  [39, "They don't love you, do they?", "You love my sister, don't you?"],
  [40, "She doesn't love his brother, does she?", "He loves me, doesn't he?"],
];
for (const [n, from, to] of g125) en("gh1-040", n, from, to, null, "G1-25");
en("gh1-046", 103, "Those are not book, are those?", "Those are not books, are they?", null, "G1-26");
en("gh1-046", 111, "He loves her sister, doesn't she?", "He loves her sister, doesn't he?", null, "G1-27");
// G1-33 fragment glued to the answer; "each" is not used for partial negation
en("gh1-068", 80, "Each boy didn't receive a prize, did he? Not each boy", "Not every boy received a prize, did he?", [undefined, ["Not every boy received a prize, did they?", "Each boy didn't receive a prize, did he?"]], "G1-33");
// G1-42 a Korean grammar note inside the English answer → moved to the Korean prompt
en("gh1-080", 6, "The police arrested 15 people, didn't they? (police, people, children은 항상 복수)", "The police arrested 15 people, didn't they?", null, "G1-42");
ko("gh1-080", 6, "경찰이 15사람을 체포했죠?", "경찰이 15사람을 체포했죠? (police, people, children 은 항상 복수)", "G1-42");

// ---------------------------------------------------------------- Medium
alt("gh1-008", 19, ["family name: last name"], undefined, "G1-03");
alt("gh1-014", 11, ["Which What book do you want?"], ["What book do you want?"], "G1-08");
en("gh1-014", 23, "She looks beautiful, doesn't she?", "She is beautiful, isn't she?", [undefined, ["She looks beautiful, doesn't she?"]], "G1-10");
ed.removeBlocks("gh1-015", ["혹은 She is beautiful,", "isn't she?"]);
// G1-13 partial negation: "Not all …" is the unambiguous form; the old form stays accepted
en("gh1-016", 5, "All boys do not receive a prize.", "Not all boys receive a prize.",
  [["All the boys do not receive prizes.", "All boys do not receive prizes.", "All the boys do not receive a prize."],
   ["Not all boys receive prizes.", "Not all the boys receive a prize.", "Not all the boys receive prizes.", "All boys do not receive a prize.", "All the boys do not receive prizes.", "All boys do not receive prizes.", "All the boys do not receive a prize."]], "G1-13");
en("gh1-016", 7, "All of them didn't come.", "Not all of them came.", [undefined, ["All of them didn't come."]], "G1-13");
en("gh1-060", 31, "All of them don't like it.", "Not all of them like it.", [undefined, ["All of them don't like it."]], "G1-13");
en("gh1-068", 79, "Every boy didn't receive a prize, did he?", "Not every boy received a prize, did he?", [undefined, ["Not every boy received a prize, did they?", "Every boy didn't receive a prize, did he?"]], "G1-13");
en("gh1-068", 81, "All the boys didn't receive a prize, did they?", "Not all the boys received a prize, did they?", [undefined, ["All the boys didn't receive a prize, did they?"]], "G1-13");
en("gh1-016", 32, "How many days were you in the U. S. A?", "How many days were you in the USA?", [undefined, ["How many days were you in the U.S.A.?", "How many days were you in the US?", "How many days were you in the United States?"]], "G1-14");
alt("gh1-038", 2, ["You are a girl?"], undefined, "G1-23");
alt("gh1-038", 3, ["He is a boy?"], undefined, "G1-23");
alt("gh1-038", 4, ["She is a girl?"], undefined, "G1-23");
alt("gh1-038", 6, ["It is a book?"], undefined, "G1-23");
alt("gh1-046", 81, ["It is a book?"], undefined, "G1-23");
alt("gh1-050", 32, ["Is it that mine?"], ["Is that mine?"], "G1-28");
en("gh1-062", 11, "Is it warm ?", "Is it warm today?", null, "G1-31");
en("gh1-068", 82, "All of them don't come. Not all of them come.", "Not all of them come.", [undefined, ["All of them don't come."]], "G1-34");
en("gh1-068", 83, "Not all of them came. All of them didn't come.", "Not all of them came.", [undefined, ["All of them didn't come."]], "G1-34");
en("gh1-100", 115, "Isn't it out of the question? Isn't it impossible?", "Isn't it out of the question?", [undefined, ["Isn't it impossible?"]], "G1-34");
en("gh1-118", 57, "What would you like? What do you want?", "What do you want?", [undefined, ["What would you like?"]], "G1-34");
alt("gh1-080", 2, ["Is your a rich man?"], ["Is your father a rich man?"], "G1-41");
alt("gh1-084", 11, ["The She received a letter."], ["She received a letter."], "G1-41");
alt("gh1-088", 5, ["Are they police policemen?"], ["Are they policemen?"], "G1-41");
alt("gh1-090", 39, ["Why does it take happen outside the border?"], ["Why does it happen outside the border?"], "G1-41");
alt("gh1-092", 39, ["Why does it take happen outside the border?"], ["Why does it happen outside the border?"], "G1-41");
alt("gh1-094", 62, ["Why was the vice president taking participating in that project?"], ["Why was the vice president participating in that project?"], "G1-41");
alt("gh1-096", 85, ["Nobody No one ignores it."], ["No one ignores it."], "G1-41");
alt("gh1-098", 97, ["The company took participated in the project, didn't it?"], ["The company participated in the project, didn't it?"], "G1-41");
alt("gh1-108", 38, ["It's going will take time."], ["It will take time."], "G1-41");
en("gh1-108", 65, "Professor Mcarthy is going to give a difficult examination.", "Professor McCarthy is going to give a difficult examination.", [["Professor Mcarthy is going will give a difficult examination."], ["Professor McCarthy will give a difficult examination."]], "G1-41 + G1-58");
ko("gh1-108", 65, "Mcarthy교수는 어려운 시험을 낼 것이다.", "McCarthy 교수는 어려운 시험을 낼 것이다.", "G1-58");
alt("gh1-110", 88, ["They have must deal with the disaster."], ["They must deal with the disaster."], "G1-41");
alt("gh1-116", 6, ["Who dragged off and killed the him?"], ["Who dragged off and killed him?"], "G1-41");
alt("gh1-118", 41, ["The team was able could obtain numerous samples, wasn't it?"], ["The team could obtain numerous samples, couldn't it?"], "G1-41");
en("gh1-082", 15, "They didn't spend some time on an island, did they?", "They didn't spend any time on an island, did they?", null, "G1-43");
en("gh1-082", 16, "They were not spending some time on an island.", "They were not spending any time on an island.", null, "G1-43");
en("gh1-092", 48, "Why do they buy it in a black market?", "Why do they buy it on the black market?", [["Why do they buy it in the black market?"], ["Why do they buy it on a black market?"]], "G1-45");
// G1-48 "(3가지로)": every / each / all forms all accepted
alt("gh1-094", 67, ["Everyone liked the contract, didn't they?"], ["Everyone liked the contract, didn't they?", "All of them liked the contract, didn't they?"], "G1-48");
alt("gh1-094", 70, ["Each agency increases security."], ["Each agency increases security.", "All agencies increase security.", "All the agencies increase security."], "G1-48");
alt("gh1-094", 71, undefined, ["Every boy gets a tour of the center.", "Each boy gets a tour of the center."], "G1-48");
alt("gh1-094", 72, ["Every boy worries about his future."], ["Every boy worries about his future.", "All the boys worry about their future.", "All the boys worry about their futures."], "G1-48");
alt("gh1-094", 73, ["Each boy received a prize."], ["Each boy received a prize.", "All the boys received a prize.", "All the boys received prizes."], "G1-48");
alt("gh1-094", 74, ["All the boys Each boy, Every boy ignored the advice."], ["Each boy ignored the advice.", "Every boy ignored the advice."], "G1-41 + G1-48");
en("gh1-100", 131, "When did you let her in to your strange little world?", "When did you let her into your strange little world?", null, "G1-49");
en("gh1-120", 17, "Secretary of State Collin Powell is returning home from his Mid East trip.", "Secretary of State Colin Powell is returning home from his Middle East trip.", null, "G1-50");
en("gh1-116", 7, "The current available vaccine is effective, isn't it?", "The currently available vaccine is effective, isn't it?", null, "G1-51");
alt("gh1-110", 107, ["Did you reach there on time?"], ["Did you arrive there on time?"], "G1-52");

// ---------------------------------------------------------------- Low
ko("gh1-006", 5, "우리(들은)는 학생(들)이다.", "우리(들)는 학생(들)이다.", "G1-01");
ko("gh1-006", 3, "당신은 미국인이다", "당신은 미국인이다.", "G1-02");
ko("gh1-022", 13, "나는 한국에 있다", "나는 한국에 있다.", "G1-02");
ko("gh1-008", 19, "그녀의 성은 무엇이었니? (결혼하기 전의).", "결혼 전 그녀의 성은 무엇이었니?", "G1-04");
ko("gh1-008", 16, "너는 부유했니(부자였니?)", "너는 부유했니? (부자였니?)", "G1-05");
ko("gh1-008", 36, "너의 어머니는 어땠니? (안녕하셨니)?", "너의 어머니는 어땠니? (안녕하셨니?)", "G1-05");
ko("gh1-062", 10, "내가 어디에 있나(여기가 어디냐?)", "내가 어디에 있나? (여기가 어디냐?)", "G1-05");
ko("gh1-072", 7, "그녀는 귀여운가(cute)?.", "그녀는 귀여운가? (cute)", "G1-05");
ko("gh1-074", 9, "그녀의 별명은 무엇이었니? (nickname)?", "그녀의 별명은 무엇이었니? (nickname)", "G1-05");
ko("gh1-076", 2, "해결책들이 있었니? (solutions)?", "해결책들이 있었니? (solutions)", "G1-05");
ko("gh1-010", 27, "내가 너를 아니 (댁에서 나를 아세요?)", "내가 너를 아니? (저를 아세요?)", "G1-06");
ko("gh1-012", 35, "그는 무엇 이였니? (뭐하는 사람이었니?)", "그는 무엇이었니? (뭐하는 사람이었니?)", "G1-07");
ko("gh1-062", 18, "이것은 누구의 집이였니?", "이것은 누구의 집이었니?", "G1-07");
ko("gh1-078", 13, "네가 어제 밤 나에게 전화했니?(call)", "네가 어젯밤 나에게 전화했니? (call)", "G1-07");
ko("gh1-078", 14, "왜 너는 어제 밤 나에게 전화했니?", "왜 너는 어젯밤 나에게 전화했니?", "G1-07");
ko("gh1-068", 104, "그녀는 매일 많은 회수(여러 번) 그를 보지요?", "그녀는 매일 많은 횟수(여러 번) 그를 보지요?", "G1-07");
ko("gh1-066", 56, "그는 그의 아들 한 사람 한사람 모두에게 돈을 줍니까?", "그는 그의 아들 한 사람 한 사람 모두에게 돈을 줍니까?", "G1-07");
ko("gh1-084", 1, "수백 명의 군인들이(Hundreds of soldiers) 그 도시를 떠나고 있 다.(leave)", "수백 명의 군인들이(Hundreds of soldiers) 그 도시를 떠나고 있다. (leave)", "G1-07");
ko("gh1-102", 138, "너는 다음 기회에 나를 데리고 나갈 꺼지?", "너는 다음 기회에 나를 데리고 나갈 거지?", "G1-07");
ko("gh1-110", 80, "그들은 아마 안자고 있을 꺼야.", "그들은 아마 안 자고 있을 거야.", "G1-07");
ko("gh1-110", 91, "그 회사는 그 광고를 게제하고 있지 않지?", "그 회사는 그 광고를 게재하고 있지 않지?", "G1-07");
ko("gh1-112", 113, "그것은 나의 혀의 끝 위에 있다.(입에서 빙빙 도는데 생각이 안 난 다. 말이 안 나온다)", "그것은 나의 혀의 끝 위에 있다. (입에서 빙빙 도는데 생각이 안 난다. 말이 안 나온다)", "G1-07");
ko("gh1-116", 25, "아프간인 이 아닌 언론인들은 유괴당할 수 있었지?", "아프간인이 아닌 언론인들은 유괴당할 수 있었지?", "G1-07");
ko("gh1-118", 58, "그 희생자들의 세 사람은 덴마크인 이 아니었나?", "그 희생자들 중 세 사람은 덴마크인이 아니었나?", "G1-07");
ko("gh1-118", 66, "우리는 다음에 그것을 할꺼야.", "우리는 다음에 그것을 할 거야.", "G1-07");
ko("gh1-118", 71, "그것은 너의 성전환수술을 카버 하겠지?", "그것은 너의 성전환 수술을 커버하겠지?", "G1-07");
ko("gh1-120", 19, "왜 파월은 무바락크 이집트 대통령과 만나지 않았나?", "왜 파월은 무바라크 이집트 대통령과 만나지 않았나?", "G1-07");
ko("gh1-122", 57, "나는 약간 사방으로 여행을 다니고 있을 꺼야.", "나는 여기저기 여행을 좀 다니고 있을 거야.", "G1-07");
ko("gh1-122", 58, "그것은 약간 더 어려울 꺼야.", "그것은 약간 더 어려울 거야.", "G1-07");
ko("gh1-122", 62, "너는 좋을 꺼야(잘 할 꺼야)", "너는 괜찮을 거야. (잘할 거야)", "G1-07");
ko("gh1-122", 64, "한 탄자니아 국적인 이 체포 하에 있다.", "탄자니아 국적자 한 명이 체포되어 있다.", "G1-07");
ko("gh1-122", 75, "다섯 명의 파키스탄인 들이 심문받고 있다.", "다섯 명의 파키스탄인들이 심문받고 있다.", "G1-07");
ko("gh1-100", 127, "내가 그것을 너와 공유하지 않았나(너에게 나누어주지", "내가 그것을 너와 공유하지 않았나? (너에게 나누어 주지 않았나?)", "G1-07");
alt("gh1-014", 16, undefined, ["He wants a lot of money, doesn't he?"], "G1-11");
ko("gh1-014", 28, "누구라도 (Anybody)그것을 좋아한다.", "누구든 그것을 좋아한다. (Anybody)", "G1-12");
ko("gh1-016", 30, "누가 그것에 대하여 지불했니(누가 냈나?)", "누가 그것에 대하여 지불했니? (누가 냈니?)", "G1-15");
en("gh1-036", 49, "Were you not studying English.", "Were you not studying English?", [["Weren't you studying English."], ["Weren't you studying English?"]], "G1-21");
en("gh1-044", 76, "Were you not studying English.", "Were you not studying English?", [["Weren't you studying English."], ["Weren't you studying English?"]], "G1-21");
ko("gh1-038", 2, "너는 소녀이지? 3", "너는 소녀이지?", "G1-22");
ko("gh1-052", 17, "나의 손이 차가왔니?", "나의 손이 차가웠니?", "G1-29");
ko("gh1-052", 39, "아니 어제는 덥지 않았다.", "아니, 어제는 덥지 않았다.", "G1-29");
alt("gh1-060", 7, undefined, ["He has more money than I do.", "He has more money than me."], "G1-30");
alt("gh1-060", 26, undefined, ["Who loves you more than I do?"], "G1-30");
alt("gh1-066", 76, undefined, ["Every boy received a prize, didn't they?"], "G1-32");
alt("gh1-066", 77, undefined, ["Each boy received a prize, didn't they?"], "G1-32");
en("gh1-068", 95, "You paid for lunch didn't you?", "You paid for lunch, didn't you?", null, "G1-35");
en("gh1-078", 30, "You met someone. didn't you?", "You met someone, didn't you?", null, "G1-35");
en("gh1-092", 55, "The law takes effect this month. doesn't it?", "The law takes effect this month, doesn't it?", null, "G1-35");
ed.removeBlocks("gh1-068", ["Page 068]"]);
ed.removeBlocks("gh1-082", ["Page 082]"]);
ed.removeBlocks("gh1-093", ["Page 093]"]);
ed.blockText("gh1-059", "[ Page 058]", "[ Page 059]");
ed.field("gh1-059", "label", "[ Page 058]", "[ Page 059]");
alt("gh1-078", 1, undefined, ["Why did you hit him?"], "G1-37");
alt("gh1-078", 2, undefined, ["Why does he hit her?"], "G1-37");
alt("gh1-078", 19, undefined, ["We haven't seen each other for a long time, have we?"], "G1-38");
alt("gh1-078", 34, ["Your teacher does not understand you, does he or she?"], ["Your teacher does not understand you, does she?", "Your teacher does not understand you, do they?"], "G1-39");
en("gh1-078", 40, "I am a busy girl.", "I am a busy woman.", [undefined, ["I am a busy girl."]], "G1-40");
alt("gh1-082", 31, undefined, ["Are officials canceling ski races?"], "G1-44");
alt("gh1-122", 57, undefined, ["I'll be traveling around a bit."], "G1-44");
en("gh1-092", 49, "Why isn't he submitting the budget to the congress?", "Why isn't he submitting the budget to Congress?", null, "G1-46");
en("gh1-092", 54, "The congress approved the bill, didn't it?", "Congress approved the bill, didn't it?", null, "G1-46");
// G1-47 gh1-090 #39 / gh1-092 #39: two separate lessons each with their own item — nothing to merge.
alt("gh1-098", 110, ["He is not a Japanese, is he?"], undefined, "G1-53");
en("gh1-122", 38, "The vision includes an Israeli and Palestinian state.", "The vision includes an Israeli state and a Palestinian state.", null, "G1-54");
ko("gh1-122", 38, "그 비전은 한 이스라엘 및 팔레스타인 국가를 포함한다.", "그 비전은 이스라엘 국가와 팔레스타인 국가를 포함한다.", "G1-54");
en("gh1-102", 146, "Haven't they yet emerged?", "Haven't they emerged yet?", [undefined, ["Haven't they yet emerged?"]], "G1-55");
alt("gh1-106", 10, undefined, ["Who was killed and captured?"], "G1-56");
ed.syncSplit("gh1-110", "gh1-110-1", 90); // G1-57 split page Korean differed from the main page
ed.syncSplit("gh1-123", "gh1-123-2", 58); // G1-57 split page English differed from the main page
// G1-58 hyphens, capitals, doubled punctuation, idiom
en("gh1-094", 65, "She was different from most of the girls, wasn't she?", "She was different from most girls, wasn't she?", [undefined, ["She was different from most of the girls, wasn't she?"]], "G1-58");
en("gh1-098", 98, "He doesn't go on a date today, does he?", "He isn't going on a date today, is he?", [undefined, ["He doesn't go on a date today, does he?"]], "G1-58");
en("gh1-098", 103, "How fast did the meeting end?", "How quickly did the meeting end?", [undefined, ["How fast did the meeting end?"]], "G1-58");
en("gh1-098", 105, "He takes care of the patient many hours every day, doesn't he?", "He takes care of the patient for many hours every day, doesn't he?", [undefined, ["He takes care of the patient many hours every day, doesn't he?"]], "G1-58");
en("gh1-098", 107, "Why didn't North and South reach a compromise?", "Why didn't North and South Korea reach a compromise?", null, "G1-58");
en("gh1-100", 116, "Doesn't it have its limit?", "Doesn't it have its limits?", null, "G1-58");
ko("gh1-102", 143, "그는 정식으로 소환되지 않았다.", "그는 정식으로 기소 인부 절차(법정 출석)에 회부되지 않았다.", "G1-58");
en("gh1-102", 145, "When did our forces defeat adversaries?", "When did our forces defeat the enemy?", [["When did our forces defeat enemies?"], ["When did our forces defeat their enemies?", "When did our forces defeat enemies?"]], "G1-58");
en("gh1-106", 2, "Isn't her next door neighbor now a potential suspect?", "Isn't her next-door neighbor now a potential suspect?", null, "G1-58");
en("gh1-106", 18, "The interior department acquired the home, didn't it?", "The Interior Department acquired the home, didn't it?", null, "G1-58");
en("gh1-106", 28, "Isn't the Atlanta based fast food chain switching its soft drink?", "Isn't the Atlanta-based fast food chain switching its soft drink?", null, "G1-58");
en("gh1-106", 33, "I'm glad to help a friend,", "I'm glad to help a friend.", null, "G1-58");
en("gh1-108", 40, "Some day, he wants to be a language teacher.", "Someday, he wants to be a language teacher.", null, "G1-58");
en("gh1-108", 44, "German is an elective, isn't it?.", "German is an elective, isn't it?", null, "G1-58");
en("gh1-110", 90, "How did the government boost its sale?", "How did the government boost its sales?", null, "G1-58");
en("gh1-110", 100, "Coca Cola also is based in Atlanta, isn't it?", "Coca-Cola is also based in Atlanta, isn't it?", null, "G1-58");
en("gh1-112", 115, "Bob is leaving for England next week, isn't he?.", "Bob is leaving for England next week, isn't he?", null, "G1-58");
en("gh1-112", 119, "Didn't the clerk get a 50% pay-raise?", "Didn't the clerk get a 50% pay raise?", null, "G1-58");
en("gh1-116", 14, "The Operation would last 24 to 72 hours.", "The operation would last 24 to 72 hours.", null, "G1-58");
en("gh1-116", 16, "Don't you have to go after them?.", "Don't you have to go after them?", null, "G1-58");
en("gh1-116", 23, "Are journalists covering the war in Afghanistan?.", "Are journalists covering the war in Afghanistan?", null, "G1-58");
en("gh1-118", 45, "The telescope is not yet completely on line, is it?", "The telescope is not yet completely online, is it?", null, "G1-58");

const result = ed.commit();
console.log(`GRAMMAR I: ${result.changes} item/block changes in ${result.files} files`);
