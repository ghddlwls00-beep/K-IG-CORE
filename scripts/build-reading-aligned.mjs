import fs from "node:fs";
import path from "node:path";

const projectRoot = "C:/Users/ghddl/.gemini/antigravity/scratch/K-IG-CORE";

import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// 1. Load Batch 1
const b1Path = "C:/Users/ghddl/.gemini/antigravity/brain/f02aecb0-2a2a-4c28-b8cc-6a0104c34b53/scratch/generate-all-reading.cjs";
const b1Src = fs.readFileSync(b1Path, "utf8");
const fn1 = new Function("module", "exports", "require", b1Src + "\nmodule.exports = SPECIAL_ALIGNMENTS;");
const b1Mod = { exports: {} };
fn1(b1Mod, b1Mod.exports, require);
const batch1 = b1Mod.exports;
const batch2 = require("C:/Users/ghddl/.gemini/antigravity/brain/f02aecb0-2a2a-4c28-b8cc-6a0104c34b53/scratch/batch2-alignments.cjs");
const batch3 = require("C:/Users/ghddl/.gemini/antigravity/brain/f02aecb0-2a2a-4c28-b8cc-6a0104c34b53/scratch/batch3-alignments.cjs");
const batch4 = require("C:/Users/ghddl/.gemini/antigravity/brain/f02aecb0-2a2a-4c28-b8cc-6a0104c34b53/scratch/batch4-alignments.cjs");

// 3. Define the 5 additional manual alignments
const batchExtra = {
  pr053: [
    {
      en: "Even our most highly educated guesses often go disastrously wrong.",
      ko: "우리의 가장 많이 교육받은 사람들의 추측도 종종 비참하게 잘못될 수 있다."
    },
    {
      en: "Albert Einstein remarked, “There is no chance that nuclear energy will ever be obtainable.”",
      ko: "Albert Einstein은 “핵에너지를 얻게 될 가능성은 전혀 없다.”라고 말했다."
    },
    {
      en: "Why is predicting the future so difficult?",
      ko: "미래를 예측하는 것은 왜 그렇게 힘들까?"
    },
    {
      en: "Would it be smart not to try to guess what’s coming next?",
      ko: "다음에 올 일을 추측하려고 하지 않는 것이 현명할까?"
    },
    {
      en: "Not predicting the future would be like driving a car without looking through the windshield.",
      ko: "미래를 예측하지 않는 것은 자동차 앞 유리를 통해 앞을 보지 않고 차를 모는 것과 같다."
    },
    {
      en: "We desperately need people who can foretell the future.",
      ko: "우리는 미래를 예견해줄 사람을 몹시 필요로 한다."
    },
    {
      en: "They help us narrow the infinity of possible futures down to one or, at least, a few.",
      ko: "그들은 우리를 무한히 가능한 미래를 하나, 혹은 적어도 몇 개로 좁히게 해주는데 도움을 준다."
    },
    {
      en: "We look at the present and see the present; they see the seeds of the future.",
      ko: "우리는 현재를 살펴보면서 미래를 보지만 그들은 미래의 씨앗들을 본다."
    },
    {
      en: "They are our advance scouts, going secretly over the border to bring back priceless information to help the world to come.",
      ko: "그들은 앞으로의 세상을 돕기 위한 귀중한 정보를 가져오기 위해 비밀스럽게 경계선을 넘어 가는 우리의 정찰대이다."
    }
  ],
  pr084: [
    {
      en: "People tend to stick to their first impressions, even if they are wrong.",
      ko: "사람들은 그들의 첫인상이 잘못된 것일 지라도 그것에 집착하는 경향이 있다."
    },
    {
      en: "Suppose you mention the name of your new neighbor to a friend.",
      ko: "당신이 당신의 이웃 사람의 이름을 어떤 친구에게 언급했다고 가정해보자."
    },
    {
      en: "“Oh, I know him,” your friend replies.",
      ko: "“오, 난 그를 알아,”라고 당신의 친구가 대답한다."
    },
    {
      en: "“He seems nice at first, but it’s all an act.” Perhaps this evaluation is groundless.",
      ko: "“그는 처음에는 멋진 것처럼 보이지만, 그것은 전부 꾸민 것이야.” 아마 이 평가는 근거 없는 것일 수도 있다."
    },
    {
      en: "The neighbor may have changed since your friend knew him, or perhaps your friend’s judgment is simply unfair.",
      ko: "그 이웃 사람은 당신의 친구가 그를 알고 난 이후로 바뀌었을 수도 있고, 혹은 당신 친구의 판단이 전혀 정당하지 않을 수도 있다."
    },
    {
      en: "Whether the judgment is accurate or not, once you accept it, it will probably influence the way you respond to the neighbor.",
      ko: "그 판단이 정확하건 그렇지 않건, 일단 당신이 그것을 받아들이면, 그것은 당신이 그 이웃에 대해 반응하는 방식에 영향을 줄 것이다."
    },
    {
      en: "Even if this neighbor were a saint, you would be likely to interpret his behavior in ways that fit your expectation",
      ko: "비록 이 이웃이 성자일지라도, 당신은 당신의 예상에 맞는 방식으로 그의 행동을 해석할 가능성이 높다."
    }
  ],
  pr187: [
    {
      en: "Every day each of us engages in many types of complex activities.",
      ko: "매일 우리들 각자는 많은 형태의 복잡한 활동에 참가한다."
    },
    {
      en: "We may go to school, participate in sports, drive cars, and sometimes become involved in conflicts.",
      ko: "우리는 학교에도 가고, 운동에도 참가하고, 자동차도 몰고, 종종 갈등에 연루되기도 한다."
    },
    {
      en: "We also perform other, less complex activities such as eating and sleeping.",
      ko: "우리는 또한 먹거나 잠을 자는 것과 같은 덜 복잡한 활동도 수행한다."
    },
    {
      en: "Our nervous system determines the complexity of activities that we are able to perform.",
      ko: "우리의 신경계가 우리가 수행할 수 있는 활동들의 복잡성을 결정한다."
    },
    {
      en: "Animals with nervous systems similar to a worm’s cannot play soccer, much less chess.",
      ko: "벌레와 유사한 신경계를 가진 동물들은 축구를 할 수 없고 하물며 체스는 더더욱 할 수 없다."
    },
    {
      en: "Why are some activities, such as eating and reproducing, common to all organisms, whereas other activities, such as nest-building, are limited to certain species?",
      ko: "왜 먹거나 번식하는 것과 같은 일부 활동들은 모든 유기체에 공통이지만, 둥지를 짓는 것과 같은 다른 활동들은 특정한 종들에만 제한될까?"
    },
    {
      en: "Why do some animals live in groups and others live alone?",
      ko: "왜 일부 동물들은 무리를 지어서 살고 다른 동물들은 혼자 살까?"
    },
    {
      en: "Questions such as these are the focus of the study of behavior.",
      ko: "이러한 질문들이 행동 연구의 초점이다."
    },
    {
      en: "In its simplest form, behavior is the conduct of an organism―the way it acts.",
      ko: "가장 간단한 형태로 보면, 행동은 한 유기체의 행위, 즉 그것이 활동하는 방식이다."
    }
  ],
  pr213: [
    {
      en: "Sue had a newspaper route in her neighborhood.",
      ko: "Sue는 그녀의 이웃에서 신문을 돌렸었다."
    },
    {
      en: "She got up at 5:30 every morning to deliver the newspapers to her customers.",
      ko: "그녀는 그녀의 고객들을 위해 매일 아침 5시 30분에 신문을 배달하기 위해 일어났다."
    },
    {
      en: "She had this job for a year and never missed a day.",
      ko: "그녀는 일 년간 그 일을 했으며 하루도 빼먹지 않았다."
    },
    {
      en: "It did not matter whether it rained or snowed.",
      ko: "눈이 오든 비가 오든 상관이 없었다."
    },
    {
      en: "Her customs were all satisfied because they were always sure they would get the news early in the morning.",
      ko: "그녀의 고객들은 그들이 아침 일찍이 신문을 받을 것을 확신했었기 때문에 모두 만족했다."
    },
    {
      en: "Sometimes Sue woke up feeling sick.",
      ko: "때로는 Sue는 아프다고 느끼면서 일어났다."
    },
    {
      en: "Howeve, she delivered the newspapers not to disappoint her customers.",
      ko: "그러나 그녀는 그녀의 고객들을 실망시키지 않기 위해서 신문을 배달했다."
    },
    {
      en: "Robert's friends made fun of him because he could not ride a bicycle,",
      ko: "Robert의 친구들은 그가 자전거를 탈줄 몰랐기 때문에 그를 놀렸다."
    },
    {
      en: "So, Robert wanted to learn how to do it.",
      ko: "그래서 Robert는 자전거 타는 법을 배우기 원했다."
    },
    {
      en: "One afternoon he asked his big brother to teach him.",
      ko: "어느 오후에 그는 그의 큰형에게 가르쳐 달라고 부탁했다."
    },
    {
      en: "His brother held the bike from behind, and Robert soon became confident.",
      ko: "그의 형은 자전거를 뒤에서 붙들었고 Robert는 곧 자신감이 생겼다."
    },
    {
      en: "Right after his brother took his hands off the bike, though, he could not balance himself and fell.",
      ko: "그러나 그의 형이 자전거에서 손을 놓자마자 Robert는 중심을 잃고 넘어졌다."
    },
    {
      en: "After the fall, Robert got up and tried again.",
      ko: "넘어진 후, Robert는 일어나서 다시 시도했다."
    },
    {
      en: "The same thing happened again and again, which hurt him.",
      ko: "같은 일은 자꾸자꾸 일어났으며 그리고 그 일들은 그를 다치게 했다."
    },
    {
      en: "Howeve, Robert kept trying and finally learned to ride a bike.",
      ko: "그러나 Robert는 계속 노력했으며 결국 자전거 타기를 배웠다."
    }
  ],
  pr231: [
    {
      en: "Would a modern music composer be your first choice for a hero?",
      ko: "당신은 현대 음악 작곡가를 당신의 첫 번째 영웅으로 선택하겠는가?"
    },
    {
      en: "Or would you think of the painter of a contemporary masterpiece?",
      ko: "혹은 동시대 걸작을 그린 화가를 생각하겠는가?"
    },
    {
      en: "If you are like most people, the answer to both questions is “no.”",
      ko: "당신이 대부분의 사람들과 같다면, 두 질문에 대한 대답은 “아니요”이다."
    },
    {
      en: "More likely, a sports hero or a movie star would be your first choice.",
      ko: "그보다는 스포츠 영웅이나 영화배우가 당신의 첫 번째 선택일 것이다."
    },
    {
      en: "It seems that the worlds of contemporary art and music have failed to offer people works that reflect human achievements.",
      ko: "현대 미술과 음악의 세계는 인간의 성취를 반영하는 작품을 사람들에게 제공하지 못하고 있는 것 같다."
    },
    {
      en: "People, therefore, have lost interest in modern arts and have turned to sports stars and other popular figures to find their role models.",
      ko: "따라서 사람들은 현대 예술에 대한 흥미를 잃고 자신의 역할 모델을 찾기 위해 스포츠 스타나 다른 대중적인 인물들에게 눈을 돌리고 있다."
    }
  ]
};

// Merge all curated alignments
const allCurated = {
  ...batch1,
  ...batch2,
  ...batch3,
  ...batch4,
  ...batchExtra
};

console.log(`Loaded ${Object.keys(allCurated).length} curated alignment overrides.`);

// Load the 256 extracted lessons
const extractedPath = path.join(projectRoot, "scripts/reading_all_extracted.json");
const allExtracted = JSON.parse(fs.readFileSync(extractedPath, "utf8"));

const readingSentencesMap = {};
let totalSentences = 0;

for (let unit = 1; unit <= 256; unit++) {
  const lessonKey = `pr${String(unit).padStart(3, "0")}`;
  const padUnit = String(unit).padStart(3, "0");

  let rawPairs = [];
  if (allCurated[lessonKey]) {
    rawPairs = allCurated[lessonKey].map((p) => ({ en: p.en, ko: p.ko }));
  } else {
    const extracted = allExtracted.find((x) => x.id === lessonKey);
    if (!extracted) {
      throw new Error(`Missing extracted lesson for ${lessonKey}`);
    }
    if (extracted.enSents.length !== extracted.koSents.length) {
      throw new Error(
        `Sentence count mismatch for ${lessonKey}: en=${extracted.enSents.length}, ko=${extracted.koSents.length}`
      );
    }
    rawPairs = extracted.enSents.map((en, i) => ({
      en,
      ko: extracted.koSents[i]
    }));
  }

  // Format into canonical ReadingSentence objects
  const alignedSentences = rawPairs.map((pair, sentIdx) => {
    const sId = `reading-${padUnit}-s${String(sentIdx + 1).padStart(3, "0")}`;
    const enText = (pair.en || "").trim();
    const koText = (pair.ko || "").trim();

    if (!enText) throw new Error(`Empty English sentence in ${lessonKey} [${sId}]`);
    if (!koText) throw new Error(`Empty Korean sentence in ${lessonKey} [${sId}]`);

    return {
      id: sId,
      english: enText,
      korean: koText
    };
  });

  readingSentencesMap[lessonKey] = alignedSentences;
  totalSentences += alignedSentences.length;
}

console.log(`\nSuccessfully processed all 256 lessons: ${totalSentences} total aligned sentences.`);

// 4. Write src/lib/readingSentences.json
const sentencesOutPath = path.join(projectRoot, "src/lib/readingSentences.json");
fs.writeFileSync(sentencesOutPath, JSON.stringify(readingSentencesMap, null, 2), "utf8");
console.log(`Wrote central dictionary to ${sentencesOutPath}`);

// 5. Update content/lessons/reading/prXXX.json and prXXX-1.json (512 files)
const readingDir = path.join(projectRoot, "content/lessons/reading");
let updatedFiles = 0;

for (let unit = 1; unit <= 256; unit++) {
  const lessonKey = `pr${String(unit).padStart(3, "0")}`;
  const sentences = readingSentencesMap[lessonKey];

  // Main lesson
  const mainFile = path.join(readingDir, `${lessonKey}.json`);
  if (fs.existsSync(mainFile)) {
    const data = JSON.parse(fs.readFileSync(mainFile, "utf8"));
    data.readingSentences = sentences;
    fs.writeFileSync(mainFile, JSON.stringify(data, null, 2), "utf8");
    updatedFiles++;
  } else {
    console.warn(`Warning: missing file ${mainFile}`);
  }

  // Script companion lesson
  const scriptFile = path.join(readingDir, `${lessonKey}-1.json`);
  if (fs.existsSync(scriptFile)) {
    const data = JSON.parse(fs.readFileSync(scriptFile, "utf8"));
    data.readingSentences = sentences;
    fs.writeFileSync(scriptFile, JSON.stringify(data, null, 2), "utf8");
    updatedFiles++;
  } else {
    console.warn(`Warning: missing file ${scriptFile}`);
  }
}

console.log(`Updated ${updatedFiles} lesson JSON files in content/lessons/reading.`);
