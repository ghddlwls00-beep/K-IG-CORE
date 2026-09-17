#!/usr/bin/env node
/**
 * GRAMMAR II — every finding in content-review/grammar2.md (G2-01 … G2-45), by what is right
 * (owner rule), same model-answer / alternatives rules as apply-grammar1.cjs.
 * gh2-NNN = English model answers + alternatives, gh2-NNN-1 = Korean prompts (not a copy).
 *
 * G2-23 truncated sentences: the continuation is not in the repository (the lesson files, the
 * 2026-09-15 archive evidence and the textbook-defect lists all carry the same cut). They are
 * completed from the Korean prompt where it is whole, and from the unit's own context where the
 * Korean is cut too (gh2-027 #12, gh2-050 #9 #10 — see notes below).
 *
 * Every edit states the current text; lib-lesson-edit stops before writing if any differs.
 */
const path = require("path");
const { createEditor } = require("./lib-lesson-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const ed = createEditor(REPO, "grammar2", { splits: [] });

const en = (id, n, fromText, toText, alts, note) => {
  const from = { text: fromText };
  const to = { text: toText };
  if (alts) { from.alternatives = alts[0]; to.alternatives = alts[1]; }
  ed.item(id, n, from, to, note);
};
const alt = (id, n, fromAlts, toAlts, note) => ed.item(id, n, { alternatives: fromAlts }, { alternatives: toAlts }, note);
const ko = (id, n, fromText, toText, note) => ed.item(`${id}-1`, n, { text: fromText }, { text: toText }, note);

// ---------------------------------------------------------------- High
en("gh2-020", 21, "I remember to see you tomorrow.", "I will remember to see you tomorrow.", [undefined, ["I'll remember to see you tomorrow."]], "G2-06");
ko("gh2-020", 21, "나는 내일 너를 볼 것을 기억한다.", "나는 내일 잊지 않고 너를 만날 것이다.", "G2-06");
// G2-23 truncated sentences
en("gh2-027", 12, "He got a \"C\" average on his report card but I am sure", "He got a \"C\" average on his report card, but I am sure he will get better grades next year.", null, "G2-23");
ko("gh2-027", 12, "그는 그의 성적표에서 평균 “C”를 받았지만 나는 그가 내년에 더 나은 점수,", "그는 그의 성적표에서 평균 “C”를 받았지만 나는 그가 내년에 더 나은 점수를 받을 것이라고 확신한다.", "G2-23 (Korean cut too; completed with the English 'but I am sure')");
en("gh2-045", 1, "The exact time when the murder had been committed was", "The exact time when the murder had been committed was never discovered.", null, "G2-23");
en("gh2-046", 3, "Let me know the time of your arrival so that I can meet", "Let me know the time of your arrival so that I can meet you at the station.", null, "G2-23");
en("gh2-048", 3, "If I had known your phone number,.", "If I had known your phone number, I would have called you.", [["Had I known your phone number,."], ["Had I known your phone number, I would have called you."]], "G2-23");
en("gh2-048", 9, "If they had had the ability to make money,.", "If they had had the ability to make money, they would have had food and clothing.", [["Had they had the ability to make money,."], ["Had they had the ability to make money, they would have had food and clothing."]], "G2-23");
en("gh2-048", 11, "If the blood products had been heat treated,.", "If the blood products had been heat-treated, they could not have been infected with HIV.", [["Had the blood product been heat treated,."], ["Had the blood products been heat-treated, they could not have been infected with HIV.", "If the blood products had been heat treated, they could not have been infected with HIV."]], "G2-23");
// gh2-050 #9: the Korean names the place (와싱턴); #10: the unit is about Japan's HIV-tainted blood
// products (gh2-048 #11) — officials protected domestic drug makers from imported heat-treated
// products and failed to stop HIV spreading among hemophiliacs.
en("gh2-050", 9, "I know the president accepted the Secretary's suggestion that he convene the summit in", "I know the president accepted the Secretary's suggestion that he convene the summit in Washington.", null, "G2-23");
ko("gh2-050", 9, "나는 그 대통령이 그가 정상회담을 와싱턴에서 개최하라는 그 장관의 제언을", "나는 그 대통령이 정상회담을 워싱턴에서 개최하라는 그 장관의 제안을 받아들였다는 것을 안다.", "G2-23");
en("gh2-050", 10, "Japan's officials sought to protect drug companies from competition, failing to prevent the", "Japan's officials sought to protect drug companies from competition, failing to prevent the spread of HIV among hemophiliacs.", null, "G2-23");
ko("gh2-050", 10, "일본의 관리들은 제약 회사들을 경쟁으로부터 보호하는 것에 골몰한 나머지(모색해서)", "일본의 관리들은 제약 회사들을 경쟁으로부터 보호하는 것에 골몰한 나머지(모색해서) 혈우병 환자들 사이에 HIV가 퍼지는 것을 막지 못했다.", "G2-23");
en("gh2-048", 15, "Should I have been three minutes late, I should have missed the train.", "Had I been three minutes late, I would have missed the train.",
  [["If I had been three minutes late, I should have missed the train.", "Had I been three minutes late, I should have missed the train."],
   ["If I had been three minutes late, I would have missed the train.", "If I had been three minutes late, I should have missed the train.", "Had I been three minutes late, I should have missed the train."]], "G2-24");
en("gh2-048", 16, "Should you not go, he would go. he would go.", "Should you not go, he would go.", [["If you should not go,."], ["If you should not go, he would go.", "Should you not go, he will go.", "If you don't go, he will go."]], "G2-25");
en("gh2-036", 2, "To do his best, he could not succeed.", "Though he did his best, he could not succeed.", [undefined, ["Although he did his best, he could not succeed.", "Though he did his best, he couldn't succeed."]], "G2-26");
en("gh2-037", 3, "This is so heavy that I can not carry.", "This is so heavy that I cannot carry it.", [undefined, ["This is too heavy for me to carry."]], "G2-27");
en("gh2-031", 11, "He likes it very much to read fictions.", "He likes reading fiction very much.", [undefined, ["He likes to read fiction very much.", "He likes reading novels very much."]], "G2-28");
ko("gh2-031", 11, "그는 허구(소설)을 읽는 것을 매우 많이 좋아한다.", "그는 허구(소설)를 읽는 것을 매우 많이 좋아한다.", "G2-28");
en("gh2-028", 20, "Can you see me?", "Do you recognize me?", [undefined, ["Can you recognize me?"]], "G2-29");

// ---------------------------------------------------------------- Medium
en("gh2-011", 15, "The office is in the southern Texas city of Dallas.", "The office is in the North Texas city of Dallas.", [undefined, ["The office is in the northern Texas city of Dallas."]], "G2-02");
ko("gh2-011", 15, "그 사무실은 남쪽 텍사스 도시 달라스에 있다.", "그 사무실은 텍사스 북부 도시 댈러스에 있다.", "G2-02");
ko("gh2-013", 3, "기독교인으로써 어떻게 너는 거짓말을 할 수 있나?", "기독교인으로서 어떻게 너는 거짓말을 할 수 있나?", "G2-03");
ko("gh2-013", 5, "나는 군인으로써 그를 존경한다.", "나는 군인으로서 그를 존경한다.", "G2-03");
ko("gh2-018", 8, "그는 수상으로써 그녀를 계승했다.", "그는 수상으로서 그녀를 계승했다.", "G2-03");
en("gh2-013", 13, "It would be fine tomorrow.", "It will be fine tomorrow.", [undefined, ["The weather will be fine tomorrow."]], "G2-04");
en("gh2-013", 15, "He shall be fifteen tomorrow.", "He will be fifteen tomorrow.", [undefined, ["He will turn fifteen tomorrow."]], "G2-05");
en("gh2-017", 13, "Both are not good.", "They are not both good.", [undefined, ["Not both of them are good.", "Both are not good."]], "G2-07");
ko("gh2-024", 4, "만일 내가 한국 관습에 대하여 몇 가지 질문을 한다면 당신은", "만일 내가 한국 관습에 대하여 몇 가지 질문을 한다면 괜찮으시겠습니까?", "G2-10");
en("gh2-024", 4, "Would you mind if I ask a few questions about Korean customs?", "Would you mind if I asked a few questions about Korean customs?", [undefined, ["Would you mind if I ask a few questions about Korean customs?"]], "G2-10");
en("gh2-024", 5, "No, I don t. Go ahead.", "No, not at all. Go ahead.", [undefined, ["No, I don't mind. Go ahead.", "No, I don't. Go ahead."]], "G2-11");
ko("gh2-024", 5, "아니요, 나는 상관하지 않습니다. 계속하세요.(네, 괜찮아요, 말씀하세 요.)", "아니요, 나는 상관하지 않습니다. 계속하세요. (네, 괜찮아요, 말씀하세요.)", "G2-11");
en("gh2-024", 22, "We are gonna have a three-day weekend.", "We are going to have a three-day weekend.", [undefined, ["We're going to have a three-day weekend.", "We are gonna have a three-day weekend."]], "G2-12");
en("gh2-025", 2, "I worked at a factory by day and studied at a library bynight.", "I worked at a factory by day and studied at a library by night.", null, "G2-13");
en("gh2-025", 9, "He sounded alarm.", "He sounded the alarm.", null, "G2-14");
en("gh2-025", 10, "Don't take it personal.", "Don't take it personally.", null, "G2-15");
alt("gh2-029", 12, ["You have the right number."], undefined, "G2-30");
ko("gh2-029", 12, "당신은 틀린(올바른) 번호를 갖고 있습니다.(전화 잘못 거셨습니다.)", "당신은 틀린 번호를 갖고 있습니다. (전화 잘못 거셨습니다.)", "G2-30");
en("gh2-031", 1, "Their original plan was for the balloon to fly across theArctic Ocean.", "Their original plan was for the balloon to fly across the Arctic Ocean.", null, "G2-31");
en("gh2-047", 10, "More than 24seamen were killed and 35 more were wounded.", "More than 24 seamen were killed and 35 more were wounded.", null, "G2-31");
en("gh2-033", 14, "Since I was in a hurry, I thought I had no choice but step on it.", "Since I was in a hurry, I thought I had no choice but to step on it.", [["Since I was in a hurry, I thought I had no choice but to step on it."], undefined], "G2-32");
en("gh2-048", 10, "He should be in high school now if he had not flunked a grade.", "He would be in high school now if he had not flunked a grade.", [["Had he not flunked a grade, he should be in high school now."], ["Had he not flunked a grade, he would be in high school now."]], "G2-33");
en("gh2-050", 7, "He said, \"Alexander conquered most of Europe.\"", "He said, \"Alexander conquered the Persian Empire.\"", null, "G2-34");
ko("gh2-050", 7, "그는 “알렉산더가 유럽의 대부분을 정복했다.”고 말했다.", "그는 “알렉산더가 페르시아 제국을 정복했다.”고 말했다.", "G2-34");
en("gh2-050", 8, "He said that Alexander conquered most of Europe.", "He said that Alexander conquered the Persian Empire.", null, "G2-34");
ko("gh2-050", 8, "그는 알렉산더가 유럽의 대부분을 정복했다고 말했다.", "그는 알렉산더가 페르시아 제국을 정복했다고 말했다.", "G2-34");
en("gh2-039", 9, "I sympathize with the girl he raped.", "I remember the girl he helped.", [["I sympathize with the girl whom he raped."], ["I remember the girl whom he helped.", "I remember the girl who he helped.", "I remember the girl that he helped."]], "G2-35");
ko("gh2-039", 9, "나는 그가 강간한 그 소녀를 동정한다.", "나는 그가 도와준 그 소녀를 기억한다.", "G2-35");
ko("gh2-039", 8, "이것이 내가 어제 산책이다.", "이것이 내가 어제 산 책이다.", "G2-36");
ko("gh2-038", 6, "그는 정확한 것을 자랑스러워한다.(정확한 것에 대한 자부심을 갖고 있다).", "그는 시간을 잘 지키는 것을 자랑스러워한다. (시간을 잘 지키는 것에 자부심을 갖고 있다.)", "G2-37");
ko("gh2-042", 8, "이것이 왜 문제인가 하는 것은 기조 연설가 수전이 이전", "이것이 왜 문제인가 하는 것은 기조 연설자 수전이 이전에 마리화나를 사용했다는 이유로 쫓겨났을 때 극적으로 드러났다.", "G2-38");
ko("gh2-046", 7, "마찬가지.", "아무리 열심히 노력하더라도 일 년 내에 결코 영어를 마스터하지 못할 것이다.", "G2-38");
en("gh2-042", 9, "The question is who will reach there first.", "The question is who will get there first.", [undefined, ["The question is who will arrive there first."]], "G2-39");
en("gh2-027", 2, "Are you gonna breast feed your baby as you did before?", "Are you going to breast-feed your baby as you did before?", [undefined, ["Are you going to breastfeed your baby as you did before?", "Are you gonna breast-feed your baby as you did before?"]], "G2-40");
en("gh2-027", 3, "No, I am gonna bottle feed my baby.", "No, I am going to bottle-feed my baby.", [undefined, ["No, I'm going to bottle-feed my baby.", "No, I am gonna bottle-feed my baby."]], "G2-40");
alt("gh2-037", 16, ["I had a little a few alterations made."], ["I had a few alterations made."], "G2-41");

// ---------------------------------------------------------------- Low
en("gh2-007", 7, "Though I love you, I can not do this.", "Though I love you, I cannot do this.", null, "G2-01");
en("gh2-013", 7, "I can not solve the problem.", "I cannot solve the problem.", null, "G2-01");
en("gh2-016", 14, "He is so poor that he can not buy it.", "He is so poor that he cannot buy it.", null, "G2-01");
en("gh2-017", 15, "Anything is good.", "Either is good.", [undefined, ["Either one is good.", "Anything is good."]], "G2-08");
en("gh2-018", 14, "The plant grows up fast.", "The plant grows fast.", [undefined, ["The plant grows quickly."]], "G2-09");
alt("gh2-009", 11, undefined, ["As soon as I arrived home, I discovered the burglary."], "G2-16");
alt("gh2-009", 17, undefined, ["I once majored in architecture, but I dropped it because I wasn't good at it."], "G2-16");
alt("gh2-016", 25, undefined, ["I didn't see anyone."], "G2-17");
alt("gh2-016", 36, undefined, ["He felt tired; still, he continued his work.", "He felt tired, but he still continued his work."], "G2-17");
alt("gh2-018", 12, undefined, ["You've changed a lot since I saw you last."], "G2-17");
alt("gh2-021", 12, undefined, ["I owe you an apology."], "G2-17");
alt("gh2-021", 13, undefined, ["Let me make amends to you for your loss."], "G2-17");
alt("gh2-021", 22, undefined, ["I felt guilty."], "G2-17");
// G2-17 gh2-016 #27 "I want anything sweet." is kept: "anything" + adjective = "whatever sweet thing", which is what the Korean asks.
alt("gh2-013", 23, undefined, ["You don't need to study English."], "G2-18");
alt("gh2-017", 4, undefined, ["He has just arrived."], "G2-18");
en("gh2-010", 4, "He has little control over his emotion.", "He has little control over his emotions.", [undefined, ["He has little control over his emotion."]], "G2-19");
ko("gh2-019", 4, "그녀는 나를 보고 미소 지었다(가슴 두근거리겠다).", "그녀는 나를 보고 미소 지었다.", "G2-20");
// G2-21 Korean spacing / punctuation
ko("gh2-010", 2, "그녀는 한 달 이상 그곳에 머물렀다", "그녀는 한 달 이상 그곳에 머물렀다.", "G2-21");
ko("gh2-010", 4, "그는 자신의 감정에 대한 통제력이 거의 없다", "그는 자신의 감정에 대한 통제력이 거의 없다.", "G2-21");
ko("gh2-013", 6, "제가 메시지를 받을까요(말씀 전해드릴까요?)", "제가 메시지를 받을까요? (말씀 전해 드릴까요?)", "G2-21");
ko("gh2-016", 9, "만일 그것이 탁자 위에 없다면 그렇다면 그것은 서랍 안에 있을 것이 다.", "만일 그것이 탁자 위에 없다면 그렇다면 그것은 서랍 안에 있을 것이다.", "G2-21");
ko("gh2-016", 10, "그러면 내가 메시지를 남겨놓을 수 있습니까(메모 좀 받아 주시겠어 요)?", "그러면 내가 메시지를 남겨 놓을 수 있습니까? (메모 좀 받아 주시겠어요?)", "G2-21");
ko("gh2-016", 15, "나는 사과를 먹지 않았다(사과를 갖고 있지 않았다, 나는 사과가 없 었다).", "나는 사과를 먹지 않았다. (사과를 갖고 있지 않았다, 나는 사과가 없었다.)", "G2-21");
ko("gh2-016", 19, "그 법은 그렇지 않으면(다른 면에서는) 정직한 수백 명의 사람을 범 법자로 만들었다.", "그 법은 그렇지 않으면(다른 면에서는) 정직한 수백 명의 사람을 범법자로 만들었다.", "G2-21");
ko("gh2-019", 9, "나는 어제 밤늦게 집에 도착했다.", "나는 어젯밤 늦게 집에 도착했다.", "G2-21");
ko("gh2-019", 19, "너는 아파트 안에 개를 간직하면(키우면) 안된다.", "너는 아파트 안에 개를 간직하면(키우면) 안 된다.", "G2-21");
ko("gh2-022", 16, "나는 나 자신을 위한 햄버거를 샀다(내가 먹을 햄버거를 샀다:", "나는 나 자신을 위한 햄버거를 샀다. (내가 먹을 햄버거를 샀다.)", "G2-21");
ko("gh2-023", 12, "너의 선조는 무엇이냐(조상이 누구냐? 혈통이 무엇이냐?).", "너의 선조는 무엇이냐? (조상이 누구냐? 혈통이 무엇이냐?)", "G2-21");
ko("gh2-024", 7, "나는 당신을 거의 들을 수 없습니다(잘 안들 립니다).", "나는 당신을 거의 들을 수 없습니다. (잘 안 들립니다.)", "G2-21");
ko("gh2-024", 21, "이 해에 성탄절이 무슨 요일에 떨어지나(무슨 요일인가)?", "올해 성탄절은 무슨 요일에 떨어지나? (무슨 요일인가?)", "G2-21");
// G2-22 American spelling / standard expressions (old spelling stays accepted)
alt("gh2-011", 9, undefined, ["He traveled through China."], "G2-22");
alt("gh2-015", 5, undefined, ["We watched the movie at the theater in which there were many young couples."], "G2-22");
alt("gh2-019", 26, undefined, ["The rumor turned out false.", "The rumor turned out to be false."], "G2-22");
en("gh2-011", 20, "You can go to prison for drunken driving.", "You can go to prison for drunk driving.", [undefined, ["You can go to prison for drunken driving."]], "G2-22");
en("gh2-015", 2, "I met a boy in the subway, who looked very happy.", "I met a boy on the subway, who looked very happy.", [undefined, ["I met a boy in the subway, who looked very happy."]], "G2-22");
en("gh2-023", 17, "What are your new year's resolutions?", "What are your New Year's resolutions?", null, "G2-22");
en("gh2-029", 10, "May I speak to Mr.Kim?", "May I speak to Mr. Kim?", null, "G2-42");
en("gh2-045", 6, "I went to New York, where I saw Mr.Kim.", "I went to New York, where I saw Mr. Kim.", null, "G2-42");
en("gh2-045", 7, "I went to New York last year, when I saw Mr.Kim.", "I went to New York last year, when I saw Mr. Kim.", null, "G2-42");
// G2-43 natural English (old form kept as an alternative where it is still acceptable)
en("gh2-026", 4, "It's a real good buy.", "It's a really good buy.", [undefined, ["It's a real good buy."]], "G2-43");
en("gh2-028", 4, "I'm treating.", "It's my treat.", [undefined, ["It's on me.", "I'm treating."]], "G2-43");
en("gh2-030", 10, "It is too bad of him to desert his old father.", "It is cruel of him to desert his old father.", [undefined, ["It is very bad of him to desert his old father."]], "G2-43");
// G2-43 gh2-032 #2 "I think it the best way to success to work hard." kept: the unit teaches the
// formal object "think it … to V", which is grammatical; the plain form is already an alternative.
en("gh2-034", 14, "This is a wrong place for him to announce the news.", "This is the wrong place for him to announce the news.", [undefined, ["This is a wrong place for him to announce the news."]], "G2-43");
en("gh2-035", 11, "When you happen to come to town, be sure to look me up again.", "If you happen to come to town, be sure to look me up again.", [undefined, ["When you happen to come to town, be sure to look me up again."]], "G2-43");
en("gh2-035", 12, "I am sorry to hear that you've got divorced.", "I am sorry to hear that you got divorced.", [undefined, ["I am sorry to hear that you've gotten divorced."]], "G2-43");
en("gh2-045", 11, "It was last year when John bought this house.", "It was last year that John bought this house.", [undefined, ["It was last year when John bought this house."]], "G2-43");
en("gh2-046", 10, "He used to come here last year.", "He often came here last year.", [undefined, ["He would often come here last year.", "He used to come here last year."]], "G2-43");
en("gh2-049", 10, "She said that was a little something for me on my graduation.", "She said that it was a little something for me for my graduation.", [undefined, ["She said that was a little something for me on my graduation."]], "G2-43");
// G2-44 Korean spelling
ko("gh2-026", 3, "이 환급 전표에 서명하고 그것을 출납계 원에게 가져가라.", "이 환급 전표에 서명하고 그것을 출납계원에게 가져가라.", "G2-44");
ko("gh2-026", 17, "나는 차멀미는 절대 안하지만 항상 비행기 멀미나 배멀미는 한다.", "나는 차멀미는 절대 안 하지만 항상 비행기 멀미나 뱃멀미는 한다.", "G2-44");
ko("gh2-027", 14, "너는 불쌍한 노인을 치는 것에 의하여 무엇을 의미하니?(무슨 심보로 불쌍한 노인을 치니?", "너는 불쌍한 노인을 치는 것에 의하여 무엇을 의미하니? (무슨 심보로 불쌍한 노인을 치니?)", "G2-44");
ko("gh2-029", 3, "만일 누가 죠지 브라운에 대하여 물으면 그를 나에게로 안내해주세요.", "만일 누가 조지 브라운에 대하여 물으면 그를 나에게로 안내해 주세요.", "G2-44");
ko("gh2-029", 13, "여기에는 그런 이름에 의한 아무도 없습니다. 그런 이름 가진 사람 없습니다).", "여기에는 그런 이름에 의한 아무도 없습니다. (그런 이름 가진 사람 없습니다.)", "G2-44");
ko("gh2-032", 6, "나는 영어를 공부하는 것 말고는 선택이 없었다. 선택의 여지가 없었다).", "나는 영어를 공부하는 것 말고는 선택이 없었다. (선택의 여지가 없었다.)", "G2-44");
ko("gh2-032", 7, "내가 너희들을 방해하게 하지 말아라.(나 때문에 방해받지", "내가 너희들을 방해하게 하지 말아라. (나 때문에 방해받지 마세요.)", "G2-44");
ko("gh2-033", 13, "나는 단지 오늘 밤 외식할 분위기 안에 있지 않습니다. 기분이 아닙니다).", "나는 단지 오늘 밤 외식할 분위기 안에 있지 않습니다. (외식할 기분이 아닙니다.)", "G2-44");
ko("gh2-033", 17, "나는 우연히 이 동네에 있게 되어서 단지 인사하려고 들렸습니다.", "나는 우연히 이 동네에 있게 되어서 단지 인사하려고 들렀습니다.", "G2-44");
ko("gh2-034", 5, "나에게 옷을 갈아 입을 일분을 다오.", "나에게 옷을 갈아입을 1분을 다오.", "G2-44");
ko("gh2-039", 14, "기상보도는 선박과 비행기의 항로를 계획하는 사람들에게 매우 중요 하다.", "기상 보도는 선박과 비행기의 항로를 계획하는 사람들에게 매우 중요하다.", "G2-44");
ko("gh2-040", 7, "국회의원들이 채무불이행에 대한 동의안에 대하여 토의하기 위하여 모인 파키스탄의 국회에서 감정 이 높았다.(격앙되어 있었다.)", "국회의원들이 채무 불이행에 대한 동의안에 대하여 토의하기 위하여 모인 파키스탄의 국회에서 감정이 높았다. (격앙되어 있었다.)", "G2-44");
ko("gh2-041", 2, "어떻게 당신은 우리의 마약법을 결코 존중하지 않았던 사람들이 이제 그들을(그 법을) 집행할 것으 로 기대할 수 있나?", "어떻게 당신은 우리의 마약법을 결코 존중하지 않았던 사람들이 이제 그들을(그 법을) 집행할 것으로 기대할 수 있나?", "G2-44");
ko("gh2-042", 4, "이것이 무엇에 대하여서인지 내가 물어도 되니?(왜 이러는지, 무슨 일 인지.)", "이것이 무엇에 대하여서인지 내가 물어도 되니? (왜 이러는지, 무슨 일인지.)", "G2-44");
ko("gh2-042", 5, "당신은 저에게 로스 앤젤리스와 뉴욕 사이의 정규 요금이 얼마인지 말해줄 수 있습니까?", "당신은 저에게 로스앤젤레스와 뉴욕 사이의 정규 요금이 얼마인지 말해 줄 수 있습니까?", "G2-44");
ko("gh2-042", 10, "그들이 더 이상 서로 사랑하지 않을 때 어떻게 함께 살 수 있는가 하는 것은 나에게는 미스테리이다.", "그들이 더 이상 서로 사랑하지 않을 때 어떻게 함께 살 수 있는가 하는 것은 나에게는 미스터리이다.", "G2-44");
ko("gh2-044", 3, "내가 그녀를 처음 본 것은 내가 팝 컨서트에 참석하고 있을 때였다.", "내가 그녀를 처음 본 것은 내가 팝 콘서트에 참석하고 있을 때였다.", "G2-44");
ko("gh2-044", 4, "정치 분석가들은 레이건이 먼데일을 무찌를 것이라고 확신했던 것과 똑같이 클린턴이 도울을 무찌 를 것이라고 확신한다.", "정치 분석가들은 레이건이 먼데일을 무찌를 것이라고 확신했던 것과 똑같이 클린턴이 돌을 무찌를 것이라고 확신한다.", "G2-44");
ko("gh2-047", 13, "그 승려들은 나무 관에 의하여 뒤따라진다.나무 관이 승려들을 따라간다).", "그 승려들은 나무 관에 의하여 뒤따라진다. (나무 관이 승려들을 따라간다.)", "G2-44");
ko("gh2-047", 19, "금요일 오후 2시에 쉬카고를 향해서 떠나는 208비행기 편에 대한 당신의 예약이 만들어집니다. (예약이 되어 있습니다).", "금요일 오후 2시에 시카고를 향해서 떠나는 208비행기 편에 대한 당신의 예약이 만들어집니다. (예약이 되어 있습니다.)", "G2-44");
// G2-45 punctuation and hyphens
en("gh2-043", 15, "When you are going to do anything, keep it in mind that you should do your best", "When you are going to do anything, keep it in mind that you should do your best.", null, "G2-45");
en("gh2-045", 15, "He decided to give her the flower whether she liked it or not", "He decided to give her the flower whether she liked it or not.", null, "G2-45");
en("gh2-046", 14, "The student is preparing for an entrance examination", "The student is preparing for an entrance examination.", null, "G2-45");
en("gh2-029", 1, "We are on a first name basis.", "We are on a first-name basis.", null, "G2-45");
en("gh2-032", 15, "The government permits the company to import the cars duty free.", "The government permits the company to import the cars duty-free.", null, "G2-45");
en("gh2-036", 11, "She rose to deliver a 40 minute speech.", "She rose to deliver a 40-minute speech.", null, "G2-45");
en("gh2-038", 9, "She smiled to hear him talk in Kyungsangdo dialect.", "She smiled to hear him talk in Gyeongsang-do dialect.", [undefined, ["She smiled to hear him talk in Gyeongsangdo dialect.", "She smiled to hear him talk in Kyungsangdo dialect."]], "G2-45");

const result = ed.commit();
console.log(`GRAMMAR II: ${result.changes} item/block changes in ${result.files} files`);
