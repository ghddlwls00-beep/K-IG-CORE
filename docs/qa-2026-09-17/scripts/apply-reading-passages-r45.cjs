#!/usr/bin/env node
/**
 * READING pr122 (R-45, found missing while writing up the results): the Colombian coffee passage
 * still told 1990s news as the present ("In recent years … now gets much less cash … than ten
 * years ago") — apply-reading-passages-097.cjs had only fixed its sentence boundaries. Today
 * Colombia earns far more from coffee, so the present tense is false.
 *
 * Rewritten in the past tense on what can be checked: the International Coffee Agreement's
 * quota system broke down in July 1989, more coffee reached the market, and prices fell by about
 * a third to their lowest levels around 1990, cutting Colombia's coffee earnings (FAO,
 * https://www.fao.org/4/y5117e/y5117e03.htm ; Washington Post 1989-09-25 "Colombia, coffee and
 * cocaine"; Cambridge ARER 1975–2017 structural change study — searched 2026-09-17). Two claims
 * were dropped because they are wrong or could not be confirmed: "world demand for coffee has
 * dropped" (the fall came from oversupply, not demand) and "the government encouraged farmers to
 * grow food instead of coffee".
 * The cards follow in apply-reading-cards-r45.cjs (run after this).
 *   node apply-reading-passages-r45.cjs [--dry-run]
 */
const path = require("path");
const { createReadingEditor } = require("./lib-reading-edit.cjs");
const REPO = path.resolve(__dirname, "../../..");
const DRY = process.argv.includes("--dry-run");
const ed = createReadingEditor(REPO);

ed.sentences("pr122", "6f1df35f2a", [
  ["In the early 1990s, Colombia earned much less money from its exports than it had before.", "1990년대 초 콜롬비아가 수출로 버는 돈은 전보다 훨씬 줄었다."],
  ["Its major export crop was coffee, and in 1989 an international agreement that had helped keep coffee prices high came to an end.", "콜롬비아의 주요 수출 작물은 커피였는데, 1989년 커피 가격을 높게 유지하는 데 도움이 되던 국제 협정이 끝났다."],
  ["At the same time, other countries were exporting more coffee, so there was more coffee on the world market than buyers needed.", "같은 시기에 다른 나라들도 커피를 더 많이 수출하고 있어서, 세계 시장에는 구매자들이 필요로 하는 양보다 많은 커피가 나왔다."],
  ["As a result, coffee prices fell to their lowest level in years.", "그 결과 커피 가격은 몇 년 사이 가장 낮은 수준으로 떨어졌다."],
  ["Because of these factors, Colombia got much less cash from its coffee exports.", "이런 요인들 때문에 콜롬비아가 커피 수출로 버는 돈은 크게 줄었다."],
], "R-45: 1990s news told in the past, unconfirmed causes dropped");

const r = ed.commit({ dry: DRY });
if (!r.ok) { console.error("STOP — nothing written:\n  " + r.problems.join("\n  ")); process.exit(1); }
for (const x of r.log) console.log("  " + x);
console.log(`${r.lessons} lesson — ${DRY ? "checked (--dry-run)" : "written"}`);
