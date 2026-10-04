// scratch preload (node -r): the one spoken definition (scripts/lib/spoken-texts.cjs) loses ADULT's word (Step 2) and chunk (Step 3)
// sounds — in memory only. A check that proves the definition covers ADULT must FAIL with this.
const Module = require("module");
const orig = Module._load;
let n = 0;
Module._load = function (request, parent, isMain) {
  const m = orig.apply(this, arguments);
  if (/spoken-texts\.cjs$/.test(String(request)) && m && typeof m.spokenTexts === "function" && !m.__dropped) {
    const real = m.spokenTexts;
    const strip = (lesson) => lesson && Array.isArray(lesson.blocks)
      ? { ...lesson, blocks: lesson.blocks.map((b) => (Array.isArray(b.items) ? { ...b, items: b.items.map((it) => (it && typeof it === "object" ? { ...it, chunks: undefined, words: undefined } : it)) } : b)) }
      : lesson;
    m.spokenTexts = function (args) {
      if (args && args.course === "adult") { n++; return real.call(this, { ...args, lesson: strip(args.lesson) }); }
      return real.apply(this, arguments);
    };
    m.__dropped = true;
    process.on("exit", () => console.error(`(scratch break: ADULT words · chunks dropped from spokenTexts — ${n} adult calls)`));
  }
  return m;
};
