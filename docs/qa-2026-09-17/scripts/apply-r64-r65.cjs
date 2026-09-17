#!/usr/bin/env node
/**
 * Owner decision 2026-09-17 on the two READING passages flagged in the audit:
 *
 *   R-64 pr151 — political opinion piece comparing former president Roh Moo-hyun
 *                with Hugo Chavez ("now celebrating his victory", "recent survival
 *                of an impeachment"): REPLACED with a new, original, non-political
 *                passage of the same length and shape (three sentences opening with
 *                "It is interesting that there are some striking similarities…").
 *   R-65 pr170 — table manners passage that assigned motives to whole peoples
 *                ("to show prestige", "to show their cleverness") with two sentence
 *                fragments and a Korean mistranslation: KEPT and REWRITTEN in neutral
 *                wording, fragments and translation fixed.
 *
 * Writes the main page, the script page (-1), and the central copies in
 * src/lib/readingSentences.json / readingVocabulary.json (used only by scripts),
 * keeping every file's existing format (2-space JSON, no trailing newline).
 * Each passage gets 14 vocabulary cards written against its own sentences.
 * English text changed → speech clips must be generated (generate-azure-ava.mjs).
 */
const fs = require("fs");
const path = require("path");
const REPO = path.resolve(__dirname, "../../..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8"));
// Keep each file's own indentation (lesson files differ: 1 or 2 spaces) and its
// trailing-newline choice, so the diff shows only the content change.
const writeJson = (p, obj) => {
  const full = path.join(REPO, p);
  const before = fs.readFileSync(full, "utf8");
  const indent = (before.match(/^\{\r?\n( +)"/) || [, "  "])[1].length;
  const nl = before.endsWith("\n") ? "\n" : "";
  fs.writeFileSync(full, JSON.stringify(obj, null, indent) + nl);
};

const card = (word, lemma, partOfSpeech, korean, score, freq, examTag = "독해필수") => ({
  word,
  lemma,
  partOfSpeech,
  korean,
  score,
  reason: `지문 문맥 독해 핵심 어휘 (평가 점수: ${score}점)`,
  examTags: [examTag],
  freq,
});

const PASSAGES = {
  pr151: {
    sentences: [
      [
        "It is interesting that there are some striking similarities between learning a language and learning a musical instrument.",
        "언어를 배우는 것과 악기를 배우는 것 사이에 몇 가지 두드러진 유사점이 있다는 점은 흥미롭다.",
      ],
      [
        "Both require daily practice, careful listening, and the courage to make mistakes in front of others.",
        "둘 다 매일의 연습, 주의 깊은 듣기, 그리고 다른 사람들 앞에서 실수할 용기를 필요로 한다.",
      ],
      [
        "In fact, many teachers say that students who play an instrument often find it easier to hear the rhythm and stress of a new language.",
        "실제로 많은 교사들은 악기를 연주하는 학생들이 새로운 언어의 리듬과 강세를 더 쉽게 알아듣는 경우가 많다고 말한다.",
      ],
    ],
    vocabulary: [
      card("striking", "striking", "adj.", "두드러진, 눈에 띄는", 99, 1),
      card("similarities", "similarity", "n.", "유사점, 닮은 점", 97, 1),
      card("musical", "musical", "adj.", "음악의", 95, 1),
      card("instrument", "instrument", "n.", "악기", 94, 2),
      card("require", "require", "v.", "필요로 하다, 요구하다", 93, 1),
      card("daily", "daily", "adj.", "매일의, 일상의", 91, 1, "중학기초"),
      card("practice", "practice", "n.", "연습", 90, 1, "중학기초"),
      card("careful", "careful", "adj.", "주의 깊은, 신중한", 89, 1, "중학기초"),
      card("courage", "courage", "n.", "용기", 88, 1),
      card("mistakes", "mistake", "n.", "실수", 87, 1, "중학기초"),
      card("fact", "fact", "n.", "사실 (in fact: 실제로, 사실은)", 85, 1),
      card("easier", "easy", "adj.", "더 쉬운 (easy 의 비교급)", 84, 1, "중학기초"),
      card("rhythm", "rhythm", "n.", "리듬", 83, 1),
      card("stress", "stress", "n.", "(말의) 강세", 82, 1),
    ],
  },
  pr170: {
    sentences: [
      [
        "People around the world eat in different ways, and each way has its own history.",
        "세계 사람들은 서로 다른 방식으로 식사를 하며, 각 방식에는 저마다의 역사가 있다.",
      ],
      [
        "In many Western countries, people usually eat with knives and forks, while in China chopsticks are the common choice.",
        "많은 서양 나라에서는 보통 나이프와 포크로 식사를 하고, 중국에서는 젓가락을 흔히 쓴다.",
      ],
      [
        "In parts of Saudi Arabia, some traditional dishes are eaten with the right hand.",
        "사우디아라비아의 일부 지역에서는 몇몇 전통 음식을 오른손으로 먹는다.",
      ],
      [
        "People who follow this custom sometimes ask, “Why should we eat with utensils that other people have used?",
        "이 관습을 따르는 사람들은 때때로 이렇게 묻는다. “왜 다른 사람들이 썼던 식사 도구로 먹어야 하나요?",
      ],
      [
        "Our own hands may be cleaner.” They also point out that they know whether their hands are clean and that nobody else uses them.",
        "우리 손이 더 깨끗할 수도 있어요.” 그들은 또한 자기 손이 깨끗한지는 스스로 알고, 다른 사람은 그 손을 쓰지 않는다는 점을 지적한다.",
      ],
    ],
    vocabulary: [
      card("history", "history", "n.", "역사", 99, 1, "중학기초"),
      card("Western", "western", "adj.", "서양의", 97, 1),
      card("knives", "knife", "n.", "나이프, 칼 (knife 의 복수형)", 95, 1, "중학기초"),
      card("chopsticks", "chopstick", "n.", "젓가락", 94, 1),
      card("common", "common", "adj.", "흔한, 일반적인", 93, 1),
      card("choice", "choice", "n.", "선택", 91, 1, "중학기초"),
      card("traditional", "traditional", "adj.", "전통적인", 90, 1),
      card("dishes", "dish", "n.", "요리, 음식", 89, 1),
      card("follow", "follow", "v.", "(관습을) 따르다", 88, 1),
      card("custom", "custom", "n.", "관습, 풍습", 87, 1),
      card("utensils", "utensil", "n.", "식사 도구", 86, 1),
      card("cleaner", "clean", "adj.", "더 깨끗한 (clean 의 비교급)", 85, 1),
      card("point", "point", "v.", "(point out) 지적하다", 84, 1),
      card("whether", "whether", "conj.", "~인지 아닌지", 83, 1),
    ],
  },
};

// sanity: every card word appears in its passage
for (const [id, p] of Object.entries(PASSAGES)) {
  const text = p.sentences.map((s) => s[0]).join(" ").toLowerCase();
  for (const c of p.vocabulary) {
    if (!new RegExp(`\\b${c.word.toLowerCase()}\\b`).test(text)) throw new Error(`${id}: card "${c.word}" not in passage`);
  }
  if (p.vocabulary.length !== 14) throw new Error(`${id}: ${p.vocabulary.length} cards`);
}

const centralS = readJson("src/lib/readingSentences.json");
const centralV = readJson("src/lib/readingVocabulary.json");
for (const [id, p] of Object.entries(PASSAGES)) {
  const n = id.slice(2);
  const sentences = p.sentences.map(([english, korean], i) => ({ id: `reading-${n}-s${String(i + 1).padStart(3, "0")}`, english, korean }));
  for (const suffix of ["", "-1"]) {
    const file = `content/lessons/reading/${id}${suffix}.json`;
    const d = readJson(file);
    const instruction = d.blocks.find((b) => b.type === "instruction");
    instruction.text = suffix === "" ? p.sentences.map((s) => s[0]).join(" ") : p.sentences.map((s) => s[1]).join(" ");
    d.readingSentences = sentences;
    d.readingVocabulary = p.vocabulary;
    writeJson(file, d);
    console.log(`wrote ${file}`);
  }
  centralS[id] = sentences;
  centralV[id] = p.vocabulary;
}
writeJson("src/lib/readingSentences.json", centralS);
writeJson("src/lib/readingVocabulary.json", centralV);
console.log("wrote central readingSentences.json / readingVocabulary.json");
