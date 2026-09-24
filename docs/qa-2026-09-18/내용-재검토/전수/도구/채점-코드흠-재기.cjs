#!/usr/bin/env node
// 결정 A 에서 드러난 채점 코드 흠 둘을 앱 채점 함수(src/lib/grammarGrading.ts gradeAgainstReferences)로 다시 잰다 — 읽기만.
//  ① 's got: 채점이 he's 를 he is 로만 펴서 'He's got …' 을 다른 정답으로 넣으면 틀린 영어 'He is got …' 이 만점이 됨
//  ② 반대말 접두어(im- · in-): 뜻이 반대인 답이 철자 실수처럼 70점 — 다른 정답을 더하면 늘어남
const path = require("path");
const WT = path.resolve(__dirname, "../../../../..");
const L = require(path.join(WT, "docs/qa-2026-09-18/내용-재검토/scripts/lib.cjs"));
const G = L.loadTsModule("src/lib/grammarGrading.ts");
const N = { exact: "만점", partial: "70점", incorrect: "0점" };
const g = (a, r) => N[G.gradeAgainstReferences(a, r)];
const show = (label, a, r) => console.log(`   ${label}: ${JSON.stringify(a)} → ${g(a, r)}   (참조 ${r.map((x) => JSON.stringify(x)).join(" / ")})`);
console.log("도구 확인: 같은 글 →", g("It is a triangle.", ["It is a triangle."]), "· 다른 낱말 →", g("It is a banana.", ["It is a triangle."]));
console.log("① 's got — gh1-010 #7 '그는 한 꿈을 갖고 있다'");
show("지금", "He's got a dream.", ["He has a dream."]);
show("지금", "He has got a dream.", ["He has a dream."]);
show("He's got 을 넣으면 — 틀린 영어", "He is got a dream.", ["He has a dream.", "He's got a dream."]);
show("He has got 만 넣으면 — 틀린 영어", "He is got a dream.", ["He has a dream.", "He has got a dream."]);
show("He has got 만 넣으면", "He's got a dream.", ["He has a dream.", "He has got a dream."]);
console.log("② 반대말 접두어");
const r115 = ["Isn't it out of the question?", "Isn't it impossible?", "Is it not out of the question?", "Isn't that out of the question?", "Isn't that impossible?", "Is that not out of the question?"];
show("gh1-100 #115 '불가능하지 않나' — 뜻 반대", "Isn't it possible?", r115);
show("gh1-106 #26 '부적절했나' — 뜻 반대", "Was the conviction proper?", ["Was the conviction improper?"]);
show("gh1-056 #3 '싸다' — 뜻 반대 · 지금", "This book is expensive.", ["This book is cheap."]);
show("gh1-056 #3 — inexpensive 를 넣으면", "This book is expensive.", ["This book is cheap.", "This book is inexpensive."]);
show("gh1-106 #26 — inappropriate 를 넣으면", "Was the conviction appropriate?", ["Was the conviction improper?", "Was the conviction inappropriate?"]);
