#!/usr/bin/env node
/**
 * KIG-006 — emit the two review artifacts the migration must be approved from.
 * READ-ONLY with respect to content/.
 *
 *   evidence/kig006-classification.md   the 181 unique parentheticals, bucketed
 *   evidence/kig006-polluted.md         cells whose `text` itself must be repaired
 *   evidence/kig006-alternatives.json   the proposed text/alternatives split
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../../..");
const EV = path.join(ROOT, "docs/qa-2026-09-15/evidence");
const buckets = JSON.parse(fs.readFileSync(path.join(EV, "kig006-classification.json"), "utf8"));
const exposure = JSON.parse(fs.readFileSync(path.join(EV, "kig006-exposure.json"), "utf8"));
const ALT_MARK = String.fromCharCode(0xd639, 0xc740); // 혹은

const base = (p) => p.replace(/-\d+$/, "");
const allPages = (en) => [
  ...new Set(exposure.filter((r) => r.en === en).map((r) => r.page)),
].sort();

/* ---------------------------------------------------------------- category A */
/**
 * Expand a contracted negated question into its uncontracted form.
 *   "Don't I love you?"  -> "Do I not love you?"
 *   "Doesn't he love me?" -> "Does he not love me?"
 * Returns null when the sentence is not of that shape.
 */
function expandContraction(sentence) {
  const m = sentence.match(/^(Don't|Doesn't|Didn't|Isn't|Aren't|Wasn't|Weren't|Can't|Couldn't|Won't|Wouldn't|Shouldn't)\s+(\S+)\s+(.*?)([.?!]?)$/);
  if (!m) return null;
  const [, contraction, subject, rest, term] = m;
  const base = contraction.slice(0, -3); // strip "n't"
  const auxMap = {
    Do: "do",
    Does: "does",
    Did: "did",
    Is: "is",
    Are: "are",
    Was: "was",
    Were: "were",
    Can: "can",
    Could: "could",
    Will: "will",
    Would: "would",
    Should: "should",
  };
  const aux = auxMap[base];
  if (!aux) return null;
  const head = aux.charAt(0).toUpperCase() + aux.slice(1);
  return `${head} ${subject} not ${rest}${term || "."}`.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------- sanity helpers */
const clean = (s) =>
  (s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.?!,])/g, "$1")
    .replace(/([.?!])\s*[.?!]+/g, "$1")
    .replace(/,\s*([.?!])/g, "$1")
    .trim();

const terminate = (s, like) => {
  const t = clean(s);
  if (!t) return t;
  if (/[.?!]$/.test(t)) return t;
  // Inherit the terminator of a reference sentence where one is supplied, so a
  // question stays a question and an exclamation stays an exclamation.
  const term = like && /[.?!]\s*$/.test(like.replace(/\s+$/, ""))
    ? like.replace(/\s+$/, "").slice(-1)
    : ".";
  return t + term;
};

/**
 * Count whitespace-separated words, ignoring trailing punctuation.
 */
const wordCount = (s) =>
  (s || "").trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;

/* ------------------------------------------------- substitution alignment */
const norm = (w) => w.toLowerCase().replace(/[^a-z0-9']/g, "");

// Words that carry no anchor evidence: a paren typically rewrites exactly these
// (auxiliaries, negation, articles, light prepositions).
const STOP = new Set([
  "not", "n't", "do", "does", "did", "is", "are", "was", "were", "am",
  "be", "been", "being", "will", "would", "shall", "should", "can", "could",
  "may", "might", "must", "have", "has", "had", "the", "a", "an", "to", "of",
  "and", "or", "it", "its", "as",
]);
const content = (w) => !STOP.has(norm(w));

// A paren that opens with an inverted auxiliary (or its contraction) and
// restates the clause — "Is this not mine?", "Had I enough money",
// "Weren't you happy?" — replaces the WHOLE preceding clause, not one token.
const INVERTED =
  /^(Had|Were|Should|Did|Do|Does|Is|Are|Was|Will|Would|Can|Could|May|Might|Must|Have|Has|Not|Ain't|Isn't|Aren't|Wasn't|Weren't|Don't|Doesn't|Didn't|Won't|Wouldn't|Shouldn't|Can't|Couldn't|Hasn't|Haven't|Hadn't)\b/i;
const COND_MARKER = /^(If|When|Though|Although|Whether)\b/i;

/**
 * Given the tokens before the "(" and the tokens of the paren content, decide
 * which run of words the paren REPLACES. Returns the start index.
 *
 * Scoring rather than first-match: several anchors may line up, and the right
 * span is the one whose length best matches the paren phrase while reaching
 * furthest left.
 *   "When will they"        + "are they going to"    -> span "will they"  (start 1)
 *   "If I had enough money" + "Had I enough money"   -> whole clause      (start 0)
 *   "Did he like it"        + "that"                 -> span "it"         (start 3)
 */
function findSpanStart(beforeTokens, innerTokens) {
  if (!innerTokens.length) return beforeTokens.length - 1;

  const first = innerTokens[0];
  // CLAUSE RESTATEMENT — the paren opens with an inverted auxiliary and is a
  // full rewrite of the clause that precedes it. The replaced span starts
  // after any leading question word ("When", "Why", "How many girls") or at
  // the clause's own conditional marker:
  //   "Isn't it yours"                + "Is it not yours"      -> whole clause
  //   "If I had enough money"         + "Had I enough money"   -> whole clause
  //   "When will they"                + "are they going to"    -> "will they" (NOT whole)
  // The "are they going to" case is distinguished by the paren NOT opening with
  // an auxiliary that restates the primary's own auxiliary position.
  if (INVERTED.test(first)) {
    const QW = /^(When|Why|How|Where|What|Who|Which|Whose)$/i;
    // A conditional marker at the head means the whole clause is replaced —
    // but only when it heads a conditional, not an interrogative. "When" can
    // be either ("When will they …?" vs "When you arrive …"), so the question
    // word reading wins when the primary is a question.
    const headsQuestion = QW.test(beforeTokens[0] || "");
    if (!headsQuestion && COND_MARKER.test(beforeTokens[0] || "")) return 0;

    // Otherwise the paren restates the primary's subject-auxiliary inversion,
    // which begins after the leading interrogative phrase (if any):
    //   "When will they"          -> clause starts at 1 ("will they")
    //   "How many girls were"     -> clause starts at 3 ("were …")
    let start = 0;
    while (start < beforeTokens.length && QW.test(beforeTokens[start])) start++;
    if (start < beforeTokens.length && /^many$/i.test(beforeTokens[start])) {
      start += 2; // skip "many" + the noun it quantifies
    }
    if (start > beforeTokens.length) start = beforeTokens.length;

    // Only treat it as a clause restatement when the paren reuses a word from
    // the clause's opening run (subject region). A pronoun subject ("it") is
    // in STOP, so also accept the case where the paren's auxiliary restates
    // the primary's — the same clause, written the other way:
    //   "Isn't  it  a book" + "Is it not a book"  -> rewrite from the start
    //   "Am I not a boy"    + "Ain't I a boy"     -> same clause, contracted
    //   "May I have the day off tomorrow" + "have tomorrow off"
    //        -> "have" is not the opening subject; a span swap, fall through
    // The subject region is narrow — the clause's first two tokens. A pronoun
    // subject ("it") is in STOP so it carries no evidence, but that case is
    // covered by `parenAuxRestates` below.
    const opening = beforeTokens.slice(start, start + 2);
    const sharesOpening = innerTokens.some((t) =>
      opening.some((b) => norm(b) === norm(t))
    );
    // Reduce an auxiliary to its base for comparison: "Isn't"/"Is" -> "is",
    // "Ain't"/"Am" -> "am", "Weren't"/"were" -> "were".
    const auxBase = (w) => {
      const s = norm(w);
      const m = s.match(/^(am|is|are|was|were|do|does|did|have|has|had|will|would|shall|should|can|could|may|might|must)/);
      return m ? m[1] : s;
    };
    const parenAuxRestates =
      INVERTED.test(first) && auxBase(beforeTokens[start] || "") === auxBase(first);
    if ((sharesOpening || parenAuxRestates) && start < beforeTokens.length) {
      return start;
    }
  }

  let best = null;
  for (let bi = beforeTokens.length - 1; bi >= 0; bi--) {
    for (let ii = 0; ii < innerTokens.length; ii++) {
      if (norm(beforeTokens[bi]) !== norm(innerTokens[ii])) continue;
      if (!content(innerTokens[ii]) && !content(beforeTokens[bi])) continue;
      const spanStart = bi - ii;
      if (spanStart < 0) continue;
      const spanLen = beforeTokens.length - spanStart;
      const exact = spanLen === innerTokens.length;
      const score = (exact ? 1000 : 0) + spanLen * 10 - spanStart;
      if (!best || score > best.score) best = { spanStart, score };
    }
  }
  return best ? best.spanStart : beforeTokens.length - 1;
}

/**
 * Substitute `inner` into the sentence formed by `before` + "(" + `after`.
 * Returns one COMPLETE sentence per comma-separated variant in the paren.
 *
 * `refTerm` carries the reference terminator (the one the primary sentence
 * ends with) so a question stays a question.
 */
function substitute(before, inner, after, refTerm) {
  const beforeTokens = before.split(/\s+/).filter(Boolean);
  const innerTokens = inner.split(/\s+/).filter(Boolean);
  let spanStart = findSpanStart(beforeTokens, innerTokens);
  const variants = inner.split(/,\s+/).map((v) => v.trim()).filter(Boolean);

  // ARTICLE AGREEMENT — when the paren replaces a noun that the primary
  // introduced with "a/an" and the replacement is plural (or vice versa), the
  // article has to move with it: "receives a prize(혹은 prizes)" is
  // "receives prizes", not "receives a prizes".
  const first = variants[0] || inner;
  const firstWord = norm(first.split(/\s+/)[0] || "");
  const isPluralForm = firstWord.endsWith("s") && !firstWord.endsWith("ss");
  if (isPluralForm && spanStart > 0 && /^(a|an)$/i.test(beforeTokens[spanStart - 1] || "")) {
    spanStart -= 1; // drop the singular article along with the noun
  }

  const head = beforeTokens.slice(0, spanStart).join(" ");
  // Re-insert the comma the paren displaced when the alternative is a fronted
  // clause followed by the main clause ("(If you should not go,) he would go.").
  const tail = /^\s*,/.test(after) ? after : " " + after;
  return (variants.length ? variants : [inner]).map((v) =>
    terminate(head + (head ? " " : "") + v + tail, refTerm)
  );
}

/* ============================================================ multi-paren == */
/**
 * Sentences carrying TWO OR MORE parentheticals.
 *
 * The single-paren path can only look at the first "(", so a sentence like
 * `All (the) boys receive a prize(혹은 prizes).` came out as
 *   text  "All (the) boys receive a prize."   <- a paren survived into `text`
 *   alt   "All (the) boys receive prizes."    <- the "(the)" was never applied
 *
 * A surviving "(" in `text` is worse than a bad alternative: the TTS reads the
 * bracket out loud and a learner who types the correct sentence is marked
 * wrong. So the rule is absolute — **no paren may survive, in `text` or in any
 * alternative**.
 *
 * Three things this engine has to get right:
 *
 *  1. EXHAUSTION. Keep resolving parens until none remain, left to right.
 *     `(The) Palestinians and (the) Israelis must act.`
 *        -> text "The Palestinians and the Israelis must act."
 *           (the author put NO wording outside the paren, so the paren content
 *            IS the wording; the two parens are independent and both apply)
 *
 *  2. COUPLED INFLECTION. Auxiliary / tense / number parens inside one sentence
 *     agree with each other and must move as ONE unit, never as a cross
 *     product. `It could(can) be improved, couldn't(can't) it?` has exactly two
 *     coherent readings:
 *        "It could be improved, couldn't it?"     (the author's own wording)
 *        "It can be improved, can't it?"          (both parens applied)
 *     Emitting "It can be improved, couldn't it?" is ungrammatical and must not
 *     be registered as an answer.
 *
 *  3. WHOLE-PHRASE REPLACEMENT. A multi-word paren phrase replaces the whole
 *     span it corresponds to, not just the word before the "(":
 *        "take part(participate)"  -> "participate" replaces "take part"
 *        "are going to(will)"      -> "will" replaces "are going to"
 *
 * Returns `{ text, alternatives }` with every paren resolved, or null when the
 * sentence has fewer than two parens.
 */

/** The base form of an auxiliary, so a couplable pair can be recognised. */
const auxBase = (w) => {
  const s = norm(w);
  const m = s.match(
    /^(am|is|are|was|were|be|being|been|do|does|did|have|has|had|will|would|shall|should|can|could|may|might|must)/
  );
  return m ? m[1] : null;
};

/** Past-tense base of an auxiliary, used to compare tense across parens. */
const TENSE = {
  can: "pres", may: "pres", will: "pres", shall: "pres",
  do: "pres", does: "pres", is: "pres", are: "pres", am: "pres",
  have: "pres", has: "pres", must: "pres",
  could: "past", might: "past", would: "past", should: "past",
  did: "past", was: "past", were: "past", had: "past",
};
const tenseOf = (w) => TENSE[auxBase(w)] || null;
/** Polarity: a contracted "n't" or a standalone "not" is negative. */
const isNeg = (w) => /n't$/i.test(w) || /^not$/i.test(w);

/**
 * Split a sentence into a sequence of TOKENS, where every parenthetical is its
 * own element and the literal text between parens is preserved verbatim —
 * including the whitespace that sits on either side of a "(".
 *
 * Whitespace is preserved because it carries meaning at the seams: a paren is
 * gluing (``"isn't he(Is he not) coming"``) when there is NO space before the
 * "(", and separating (``"mad (angry)"``) when there IS one. Rebuilding the
 * sentence from bare parts would produce `"takeparticipate"`.
 *
 *   "did not take part(participate) in X"
 *      -> ["did not take part", {alt:"participate", glue:true}, " in X"]
 */
function tokenizeParens(s) {
  const parts = [];
  let i = 0;
  while (i < s.length) {
    const open = s.indexOf("(", i);
    if (open < 0) {
      parts.push({ kind: "text", value: s.slice(i), start: i, end: s.length });
      break;
    }
    const close = s.indexOf(")", open);
    if (close < 0) {
      parts.push({ kind: "text", value: s.slice(i), start: i, end: s.length });
      break;
    }
    if (open > i) parts.push({ kind: "text", value: s.slice(i, open), start: i, end: open });
    const inner = s.slice(open + 1, close).trim();
    const at = inner.indexOf(ALT_MARK);
    const altRaw = at >= 0 ? inner.slice(at + ALT_MARK.length).trim() : inner;
    // A "---" inside a marker means "the wording being replaced is the whole
    // phrase before me": "aren't they(혹은 ---, are they not)?"  The dash is not
    // part of the replacement, so strip it and remember that the span is
    // whatever the remaining wording restates.
    const dash = /^-{2,}/.test(altRaw);
    const alt = dash ? altRaw.replace(/^-{2,}\s*,?\s*/, "").trim() : altRaw;
    parts.push({
      kind: "paren",
      inner,
      alt,
      dash,
      wasMarker: at >= 0,
      start: open,
      end: close + 1,
      // no whitespace immediately before the "(" -> the paren is glued onto the
      // preceding word and substitutes INSIDE it
      glued: !/\s$/.test(s.slice(0, open)) && open > 0,
      hadSpaceBefore: /\s$/.test(s.slice(0, open)),
      // nothing but whitespace before the "(" -> the paren opens the sentence.
      // Two sentences are sometimes run together in one cell
      // ("nothing could live.(If it were not for the sun,) nothing could live."),
      // so a terminator immediately before also counts as a sentence start.
      atSentenceStart: /(^|[.?!])\s*$/.test(s.slice(0, open)),
    });
    i = close + 1;
  }
  return parts;
}

/** Common adjectives that carry no derivational suffix, so a suffix test misses them. */
const BARE_ADJ = new Set([
  "mad", "sad", "glad", "big", "small", "long", "short", "hot", "cold",
  "warm", "cool", "good", "bad", "new", "old", "young", "tall", "nice",
  "fine", "sure", "true", "false", "ill", "well", "late", "early", "right",
  "wrong", "hard", "soft", "fast", "slow", "loud", "quiet", "bright", "dark",
  "happy", "angry", "tired", "hungry", "thirsty", "busy", "free", "ready",
  "sorry", "afraid", "sure", "kind", "safe", "clean", "dirty", "rich", "poor",
]);
/** Is this word descriptive (an adjective) rather than a noun or a determiner? */
function isAdjective(w) {
  const n = norm(w);
  if (!n || BARE_ADJ.has(n)) return true;
  return /(ed|ing|ous|ious|ive|ative|able|ible|ful|less|ly|al|ial|ic|ical|ent|ant|ary|ory|ish|esque)$/.test(n);
}

/**
 * A closed-class determiner the textbook prints as part of its own sentence.
 */
const DETERMINER = new Set([
  "the", "a", "an", "this", "that", "these", "those",
  "my", "your", "his", "her", "its", "our", "their", "one's",
  "some", "any", "no", "every", "each", "both", "all",
]);

/**
 * HOW MUCH of the text to the LEFT of a paren the paren stands in for.
 *
 * A paren is glued when the author wrote no space before it, and in that case
 * it substitutes INSIDE the preceding word-run:
 *   "take part(participate)"   -> "participate"   (the phrase "take part" goes)
 *   "are going to(will)"       -> "will"          (the phrase "are going to" goes)
 *   "Sunday(s)"                -> "Sundays"
 *   "could(can)"               -> "can"
 * A paren written with a space before it is optional material appended to the
 * sentence and replaces nothing:
 *   "mad (angry)"              -> "mad angry" / "mad"
 *   "(the) boys"               -> "the boys"
 *
 * Returns the number of TRAILING WORDS of the left text to remove.
 */
function replacedWordCount(leftText, inner, dash) {
  const innerWords = inner.trim().split(/\s+/).filter(Boolean);
  const leftWords = leftText.split(/\s+/).filter(Boolean);
  if (!innerWords.length || !leftWords.length) return 0;

  const innerHead = norm(innerWords[0]);
  const last = norm(leftWords[leftWords.length - 1]);

  // Inflection of the immediately preceding word: "Sunday(s)", "part(parts)",
  // "a prize(prizes)".  The two words must be the SAME word modulo a plural or
  // tense suffix, so the stem has to normalise both the "-s"/"-es" plural and
  // the silent "e" that a plural adds back:
  //   "prizes" -> "priz" / "prize" -> "priz"   -> same stem
  //   "weeks"  -> "week" / "week"  -> "week"   -> same stem
  const stem = (w) =>
    w
      .replace(/(ies|es|s)$/i, "")
      .replace(/e$/, "");
  if (innerWords.length === 1) {
    if (stem(innerHead) === stem(last) && innerHead !== last && stem(innerHead).length >= 2) {
      // ARTICLE AGREEMENT: a singular noun's article cannot survive next to a
      // plural replacement, so "a prize(prizes)" drops BOTH words:
      //   "…receive a prize(혹은 prizes)"  -> "…receive prizes"
      if (/(ies|es|s)$/i.test(innerHead)) {
        const before = leftWords[leftWords.length - 2];
        if (before && /^(a|an)$/i.test(norm(before))) return 2;
      }
      return 1;
    }
  }

  // A phrasal verb / auxiliary chain: the paren supplies a verb that swallows
  // the WHOLE phrase before it ("take part(participate)", "are going to(will)").
  const AUX = /^(am|is|are|was|were|be|been|being|do|does|did|have|has|had|will|would|shall|should|can|could|may|might|must)$/;
  // Verb-like: an inflected verb ending, or a known base-form verb. The ending
  // test is anchored on a real suffix so that a determiner such as "those"
  // (which merely ends in "e") is not mistaken for a verb.
  const VERBISH = new RegExp(
    "^(" +
      "([a-z]{2,}(ate|ise|ize|ify|en)|[a-z]{2,}(ed|ing)|[a-z]{3,}e[sd]|[a-z]{3,}s)" +
      "|take|takes|took|go|goes|went|get|gets|got|make|makes|made|have|has|had|" +
      "do|does|did|give|gives|gave|come|comes|came|send|sends|sent|part|participate" +
      ")$"
  );
  const PARTICLE = /^(part|off|on|out|up|down|back|away|over|through|with|to|about|after|for|in|into|of)$/;
  const PRONOUN = new Set([
    "i", "me", "my", "mine", "you", "your", "yours", "he", "him", "his",
    "she", "her", "hers", "it", "its", "we", "us", "our", "ours",
    "they", "them", "their", "theirs", "this", "that", "these", "those",
    "who", "whom", "whose", "which", "what",
  ]);
  const innerAux = AUX.test(innerHead);
  const innerVerb = VERBISH.test(innerHead) && !AUX.test(innerHead);

  // Walk back over a verb phrase: optional verb + trailing particles/aux.
  // A paren that supplies a verb swallows the WHOLE phrase before it, even when
  // that phrase ends in a particle or an infinitive "to":
  //   "take part(participate)"  -> "participate"   (both words go)
  //   "are going to(will)"      -> "will"          (all three words go)
  let n = 0;
  for (let k = leftWords.length - 1; k >= 0; k--) {
    const w = norm(leftWords[k]);
    // A pronoun/possessive never heads a verb phrase, even though it can look
    // verb-like by its ending ("yours").
    if (PRONOUN.has(w)) break;
    const isWord = AUX.test(w) || VERBISH.test(w);
    const isParticle = PARTICLE.test(w);
    if (isWord) {
      n = leftWords.length - k;
      continue;
    }
    // A particle belongs to the phrase when a verb/aux is either already in it
    // to the right, or is supplied by the paren itself.
    if (isParticle && (n > 0 || innerVerb || innerAux)) {
      n = leftWords.length - k;
      continue;
    }
    break;
  }
  if ((innerAux || innerVerb) && n > 0) return n;
  // A glue paren whose content RESTATES the words before it replaces that span,
  // whether the author flagged it with "---" or simply wrote the long form:
  //   "aren't they(혹은 ---, are they not)?"     -> drop "aren't they"
  //   "yours(Are they not yours)?"              -> drop "yours"
  // Match the replacement's words against the tail of the left text, allowing
  // a contraction to count as its own expansion ("aren't" ~ "are").
  {
    const stem = (w) => w.replace(/n't$/, "").replace(/[^a-z]/gi, "");
    // The replacement spells out a negation the contraction hides
    // ("aren't they" ~ "are they not"), so a standalone "not" on the replacement
    // side is skipped wherever it appears rather than forced into the alignment.
    let m = innerWords.length - 1;
    let k = leftWords.length;
    let matched = 0;
    while (k > 0 && m >= 0) {
      if (/^(not|n't)$/i.test(innerWords[m])) {
        m--;
        continue;
      }
      const lw = stem(leftWords[k - 1]);
      const iw = stem(innerWords[m]);
      if (!(lw === iw || (iw && lw.startsWith(iw)) || (lw && iw.startsWith(lw)))) break;
      k--;
      m--;
      matched++;
    }
    // Only a genuine restatement counts: the whole replacement must have been
    // consumed, or it must be flagged with "---".
    if (matched >= 1 && (dash || m < 0)) return matched;
  }

  // Any other glued single-word paren substitutes the single word before it.
  return 1;
}

/**
 * How many TRAILING WORDS of `leftText` an aside restates, or 0 if it does not.
 *
 * A separated aside is sometimes a rewrite of the phrase before it rather than
 * an addition:
 *   "do that another time (some other time)."   -> "another time" goes
 * The signal is lexical overlap: the head noun of the aside ("time") already
 * ends the left text, so the aside is standing in for that phrase.
 */
function restatedSpan(leftText, alt) {
  const leftWords = leftText.trim().split(/\s+/).filter(Boolean);
  const altWords = alt.trim().split(/\s+/).filter(Boolean);
  if (!altWords.length || !leftWords.length) return 0;
  const content = (w) => !STOP.has(norm(w)) && norm(w).length >= 3;
  const altContent = altWords.filter(content).map(norm);
  if (!altContent.length) return 0;
  // Walk back from the end of the left text while its content words appear in
  // the aside's content words.
  let n = 0;
  for (let k = leftWords.length - 1; k >= 0; k--) {
    const w = norm(leftWords[k]);
    if (!content(leftWords[k])) {
      if (n > 0) break;
      continue;
    }
    if (!altContent.includes(w)) break;
    n = leftWords.length - k;
  }
  // The head noun matches but its modifier may be a synonym the lexical walk
  // cannot see ("another time" vs "some other time"). When the aside is a
  // multi-word phrase ending in that same head, extend the span by one so the
  // modifier goes too. The preceding word must not be a function word, or the
  // aside would swallow structural material ("do that" in "do that another time").
  const head = norm(leftWords[leftWords.length - 1]);
  if (altWords.length >= 2 && norm(altWords[altWords.length - 1]) === head && n === 1) {
    const prev = leftWords[leftWords.length - 2];
    if (prev && content(prev) && !STOP.has(norm(prev))) return 2;
  }
  return n;
}

/**
 * Remove the last `n` words of `tail`, reaching back into `head` when `tail`
 * alone does not contain them. Returns the new tail, and mutates nothing —
 * the caller reassigns the accumulated output when `head` was shortened.
 *
 * Needed because a restatement can span a paren boundary:
 *   "Aren't they(those) yours(Are they not yours)?"
 *                   ^head      ^tail  the span "Aren't they yours" reaches back.
 */
function trimSpanTail(head, tail, n) {
  let headLeft = head;
  let tailLeft = tail;
  while (n > 0) {
    const tailWords = [...tailLeft.matchAll(/\S+/g)];
    if (tailWords.length) {
      const take = Math.min(n, tailWords.length);
      const cutFrom = tailWords[tailWords.length - take].index;
      tailLeft = tailLeft.slice(0, cutFrom).replace(/\s+$/, "");
      n -= take;
      continue;
    }
    // tail is exhausted: keep eating words off the end of `head`
    const headWords = [...headLeft.matchAll(/\S+/g)];
    if (!headWords.length) break;
    const cutFrom = headWords[headWords.length - 1].index;
    headLeft = headLeft.slice(0, cutFrom).replace(/\s+$/, "");
    n--;
  }
  trimSpanTail.head = headLeft;
  return tailLeft;
}

/**
 * Join a replacement onto the text that precedes it.
 *
 * A glued paren supplies a WHOLE WORD, so a separator is needed unless the
 * replacement is a bare INFLECTION of the word it attaches to:
 *   "son(s)"          -> "sons"      (inflection: same stem, no space)
 *   "Sunday(s)"       -> "Sundays"
 *   "part(participate)" -> "participate"   (different word: space needed)
 *   "could(can)"      -> "can"
 * The leading text has already had its trailing whitespace removed.
 */
function joinReplacement(left, right) {
  // The replacement opens the sentence (nothing but whitespace before it), so
  // it must be capitalised like the author's own first word:
  //   "Those(they) are books"  -> primary "Those are books", alt "They are books"
  if (!left.trim()) {
    const cap = /^[a-z]/.test(right) ? right[0].toUpperCase() + right.slice(1) : right;
    return left + cap;
  }
  if (!left) return right;
  const lastWord = (left.match(/[A-Za-z']+$/) || [""])[0];
  const firstWord = (right.match(/^[A-Za-z']+/) || [""])[0];
  if (lastWord && firstWord) {
    const lw = lastWord.toLowerCase();
    const rw = firstWord.toLowerCase();
    // 1. The replacement continues the SAME word — an inflection or a
    //    contraction tail: "son"+"s", "do"+"n't".
    if (rw === lw) return left.replace(/[A-Za-z']+$/, "") + right;
    // 2. A PLURAL/TENSE SUFFIX glued onto a plain word: "son"(s) -> "sons",
    //    "Sunday"(s) -> "Sundays". Restricted to a suffix — a replacement like
    //    "it" must never fuse onto "isn't" to make "isn'tit".
    if (/^(s|es|ies|ed|ing|d|n't)$/i.test(right) && /^[a-z]+$/i.test(lastWord)) {
      return left + right;
    }
  }
  return left + " " + right;
}

/**
 * Rewrite the sentence so a chosen `variant` for each paren is applied.
 *
 * `choices[i]` is the string to use for paren i, or "" to DELETE the paren:
 *   - a deleted VARIANT paren leaves the author's own wording fully intact —
 *     nothing is cut, because the author's words in `en` are still on the left;
 *   - a deleted OWN paren simply never inserts anything.
 * So a deletion never removes words the author actually wrote.
 *
 * Rebuilding from the ORIGINAL string by character offset also keeps the
 * author's spacing, which is what distinguishes a glued paren
 * ("part(participate)") from a separated one ("mad (angry)").
 */
function applyChoices(en, tokens, choices, roles) {
  let out = "";
  let last = 0;
  let parenIdx = -1;
  for (const t of tokens) {
    if (t.kind === "text") continue;
    parenIdx++;
    // copy the literal text before this paren verbatim
    let literal = en.slice(last, t.start);
    const choice = choices[parenIdx];
    const role = roles ? roles[parenIdx] : t.glued ? "variant" : "own";
    const insert = choice !== undefined && choice !== "";

    // Span matching needs the FULL left context, not just the text since the
    // previous paren — "Aren't they(those) yours(Are they not yours)?" has to
    // see "Aren't they" as well as "yours" to recognise the restatement.
    const leftContext = (out + literal).replace(/^\s+/, "");

    if (role === "variant") {
      if (insert) {
        if (t.glued) {
          // Glued: the paren stands in for the preceding word-run, so that run
          // goes and the chosen wording takes its place.
          //   "take part(participate)"  -> "participate"
          //   "are going to(will)"      -> "will"
          //   "a prize(prizes)"         -> "prizes"
          const n = replacedWordCount(leftContext, t.alt, t.dash);
          if (n === 1 && /^(s|es|ies|ed|ing|d|n't)$/i.test(t.alt.trim())) {
            // An INFLECTION paren ("son(s)") glues a suffix onto the word it
            // extends — that word is KEPT and the suffix appended:
            //   "your son(s) and daughter(s)"  -> "your sons and daughters"
            literal = literal.replace(/\s+$/, "") + t.alt.trim();
          } else if (n > 1) {
            // The span reaches back past the previous paren, so it has to be
            // trimmed from the accumulated output as well.
            literal = trimSpanTail(out, literal, n);
            out = trimSpanTail.head;
            literal = joinReplacement(literal, choice);
          } else {
            literal = joinReplacement(dropTrailingWords(literal, n), choice);
          }
        } else {
          // A separated aside that restates the phrase before it — "... another
          // time (some other time)" — REPLACES that phrase. The span may reach
          // back past the previous paren ("Aren't they(those) yours(Are they not
          // yours)?"), so it is trimmed from the accumulated output.
          const n = restatedSpan(leftContext, t.alt);
          if (n > 0) {
            literal = trimSpanTail(out, literal, n);
            out = trimSpanTail.head;
          } else {
            literal = literal.replace(/\s+$/, "");
          }
          literal = joinReplacement(literal, choice);
        }
      }
      // Not inserted -> the author's own wording stays exactly as written.
    } else {
      // role === "own": the paren supplies wording for an empty slot.
      if (insert) literal = joinReplacement(literal.replace(/\s+$/, ""), choice);
    }
    out += literal;
    last = t.end;
  }
  out += en.slice(last);
  return out;
}

/**
 * Remove the LAST `n` words from `text`, keeping the spacing of what remains.
 * Returns the text WITHOUT a trailing space, so the caller can append cleanly.
 */
function dropTrailingWords(text, n) {
  if (n <= 0) return text;
  const words = [...text.matchAll(/\S+/g)];
  if (words.length < n) return "";
  const cutFrom = words[words.length - n].index;
  return text.slice(0, cutFrom).replace(/\s+$/, "");
}

/**
 * Resolve a multi-paren sentence into an author-wording `text` plus a small set
 * of COHERENT alternatives.
 *
 * Each paren gets a ROLE:
 *
 *   own      — the author left that slot to the paren, so the paren's wording
 *              belongs IN the textbook's own sentence:
 *                "(The) Palestinians and (the) Israelis must act."
 *                "(Were it not for the sun,) nothing could live."
 *                "All (the) boys receive a prize(혹은 prizes)."     -> "the"
 *
 *   variant  — the author DID write wording and the paren offers a swap:
 *                "That(It) is your car, isn't that(it)?"
 *                "It could(can) be improved, couldn't(can't) it?"
 *                "another time (some other time)"
 *
 * `text` = the author's sentence = plain text, with every "own" paren applied
 *          and every "variant" paren left as the author wrote it.
 * Each alternative = a COHERENT choice over the variant parens.
 */
/**
 * Inline the parentheticals of a ONE-SENTENCE string, keeping the paren's own
 * wording — this is the textbook's own sentence, so the optional material the
 * author wrote in brackets is the reading the learner is shown and hears:
 *   "(Were it not for the sun,) nothing could live."
 *     -> "Were it not for the sun, nothing could live."
 * Returns null when the result would not be a complete sentence, so the caller
 * can fall back to the normal resolver.
 */
function resolveSingleParen(sentence) {
  const tokens = tokenizeParens(sentence);
  let out = "";
  for (const t of tokens) {
    if (t.kind === "paren") out += t.alt;
    else out += t.value;
  }
  const res = finishText(out.replace(/,\s*([.?!])/g, "$1"));
  if (wordCount(res) < 3) return null;
  return res;
}

function resolveMultiParen(en) {
  const tokens = tokenizeParens(en);
  const parens = tokens.filter((t) => t.kind === "paren");
  if (parens.length < 2) return null;

  // TWO SENTENCES IN ONE CELL: "(Were it not for the sun,) nothing could
  // live.(If it were not for the sun,) nothing could live."
  // The two opening clauses are the SAME exercise with two openings, so the
  // first is the primary and the second is the alternative — they are not two
  // optional insertions into one sentence. The split is on the sentence
  // terminator that immediately precedes the second "(".
  if (parens.length === 2 && parens.every((p) => p.atSentenceStart)) {
    const cutMatch = en.slice(0, parens[1].start).match(/[.?!]\s*$/);
    if (cutMatch) {
      const cut = cutMatch.index + 1;
      const first = resolveSingleParen(en.slice(0, cut).trim());
      const second = resolveSingleParen(en.slice(cut).trim());
      if (first && second) {
        return { text: first, alternatives: [second].filter((s) => s && s !== first) };
      }
    }  }

  // ---------------------------------------------------------------- roles
  //
  // WHO decides? The author's own whitespace and the paren's content:
  //
  //   "(" touching the previous word          -> GLUED, always a substitution
  //        "That(It)", "part(participate)", "son(s)", "could(can)"
  //   "(" after a space, and the sentence
  //   BEGINS with the paren                   -> OWN (it supplies the opening)
  //        "(The) Palestinians …", "(Were it not for the sun,) …"
  //   "(" after a space, content is a bare
  //   ARTICLE / DETERMINER                    -> OWN (printed as part of the line)
  //        "All (the) boys", "and (the) Israelis"
  //   "(" after a space, content is anything
  //   else (an aside, an adjunct, a clause)   -> VARIANT
  //        "another time (some other time)", "mad (angry)"
  //   any "혹은" marker                        -> VARIANT (and it may carry "---")
  //
  // A variant paren that is never selected simply disappears; because the
  // author's own wording is still in the string, deleting it removes nothing.
  const meta = [];
  let leftAccum = "";
  for (const t of tokens) {
    if (t.kind === "text") {
      leftAccum += t.value;
      continue;
    }
    const innerWords = t.alt.split(/\s+/).filter(Boolean);
    const isDet = innerWords.length === 1 && DETERMINER.has(norm(innerWords[0]));
    // A determiner glued straight onto another determiner ("in that(the) raid")
    // is a lexical variant with no distinct grammatical reading — the author
    // already wrote the standard form. Emit neither primary insertion nor an
    // alternative for it.
    const redundantDet = t.glued && isDet;
    // A separated aside that is a bare ADJECTIVE sitting right after another
    // adjective is a synonym gloss the author wrote for the learner, not a
    // second answer: "Are you mad (angry)?" is one question about being angry.
    // Emitting "Are you mad angry?" would register a mash as a model answer.
    const glossAdj =
      !t.glued &&
      !t.wasMarker &&
      innerWords.length === 1 &&
      isAdjective(innerWords[0]) &&
      isAdjective(leftAccum.trim().split(/\s+/).pop() || "");
    const skip = redundantDet || glossAdj;
    const own =
      !t.wasMarker && !skip && (t.atSentenceStart || (!t.glued && isDet));
    // A separated aside that RESTATES the phrase before it is a replacement, not
    // an addition: "another time (some other time)" -> "some other time".
    const restates =
      !own && !skip && !t.glued && !!restatedSpan(leftAccum, t.alt);
    meta.push({
      t,
      leftText: leftAccum,
      own,
      skip,
      variant: !own && !skip,
      restates,
      innerWords,
    });
    leftAccum += "(" + t.inner + ")";
  }

  // --------------------------------------------------- author wording (text)
  const roles = meta.map((m) => (m.own ? "own" : "variant"));
  const textChoices = meta.map((m) => (m.own ? m.t.alt : ""));
  const text = applyChoices(en, tokens, textChoices, roles);
  // --------------------------------------------------------- coupled groups
  // Two VARIANT parens are coupled when they express the same (outer -> inner)
  // auxiliary transition, so flipping one without the other is ungrammatical:
  //   "could(can) … couldn't(can't)"
  // Both swap past -> present, so they move as one unit.
  const variantMeta = meta
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.variant);
  const ownMeta = meta
    .map((m, i) => ({ ...m, i }))
    .filter((m) => m.own);
  const groups = [];
  const used = new Set();
  for (const m of variantMeta) {
    if (used.has(m.i)) continue;
    const group = [m.i];
    used.add(m.i);
    const mt = auxBase(m.t.alt) ? tenseOf(m.t.alt) : null;
    const mo = outerTenseOf(m.leftText);
    // NUMBER/INFLECTION agreement: bare suffix parens in the same clause restate
    // the same number ("son(s) and daughter(s)"), so they must move together —
    // half a flip produces "your son ands".
    const isSuffix = /^(s|es|ies|ed|ing|d)$/i.test(m.t.alt.trim());
    for (const o of variantMeta) {
      if (used.has(o.i)) continue;
      const oSuffix = /^(s|es|ies|ed|ing|d)$/i.test(o.t.alt.trim());
      const couple =
        (isSuffix && oSuffix) ||
        (mt &&
          auxBase(o.t.alt) &&
          tenseOf(o.t.alt) === mt &&
          outerTenseOf(o.leftText) === mo);
      if (couple) {
        group.push(o.i);
        used.add(o.i);
      }
    }
    groups.push(group);
  }

  // ------------------------------------------------------- alternative set
  //
  // Alternatives are built as a CROSS PRODUCT of one coherent decision per
  // coupling group and one independent decision per loose variant paren. That
  // is what keeps "could be … can't it?" out of the answer key.
  const decisionSets = [];
  for (const group of groups) {
    // Every subset of the group flips TOGETHER — the whole point of coupling is
    // that "could(can) … couldn't(can't)" moves as one unit, never half. The
    // empty subset is the author's own wording and participates in the cross
    // product so that OTHER groups can still flip on their own.
    const out = [];
    for (let m = 0; m < 1 << group.length; m++) {
      out.push([...Array(group.length).keys()].filter((b) => m & (1 << b)).map((b) => group[b]));
    }
    decisionSets.push(out.map((flip) => ({ flips: flip, omit: [] })));
  }
  for (const m of variantMeta) {
    if (groups.some((g) => g.includes(m.i))) continue;
    decisionSets.push([{ flips: [m.i], omit: [] }, { flips: [], omit: [] }]);
  }
  // Every paren being OWN means there is no variant to flip. The alternative is
  // then the sentence with the optional insertions LEFT OUT:
  //   "(The) Palestinians and (the) Israelis must act."
  //     text "The Palestinians and the Israelis must act."
  //     alt  "Palestinians and Israelis must act."
  if (!decisionSets.length && ownMeta.length) {
    decisionSets.push([{ flips: [], omit: ownMeta.map((m) => m.i) }]);
  }

  // Cartesian product over the decision sets.
  let combos = [[]];
  for (const set of decisionSets) {
    const next = [];
    for (const acc of combos) for (const d of set) next.push([...acc, d]);
    combos = next;
  }

  const primary = finishText(text);
  if (!combos.length) return { text: primary, alternatives: [] };

  const seen = new Set([primary]);
  const alternatives = [];
  for (const combo of combos) {
    const flips = new Set(combo.flatMap((d) => d.flips));
    const omit = new Set(combo.flatMap((d) => d.omit));
    if (!flips.size && !omit.size) continue;
    const choices = textChoices.map((c, i) => (omit.has(i) ? "" : flips.has(i) ? meta[i].t.alt : c));
    const cand = finishText(applyChoices(en, tokens, choices, roles));
    if (!cand || seen.has(cand)) continue;
    seen.add(cand);
    alternatives.push(cand);
  }
  // Coupling gate: an alternative whose auxiliaries disagree is ungrammatical,
  // and one that mis-combines the parens must never reach the answer key.
  const coherent = alternatives.filter(
    (a) => auxiliariesAgree(a) && plausible(a)
  );
  return { text: primary, alternatives: coherent };
}

/** The tense of the auxiliary immediately to the left of a paren, if any. */
function outerTenseOf(leftText) {
  const words = leftText.trim().split(/\s+/).filter(Boolean);
  for (let i = words.length - 1; i >= 0; i--) {
    const b = auxBase(words[i]);
    if (b) return tenseOf(b);
  }
  return null;
}

/** Collapse whitespace and guarantee exactly one terminator. */
function finishText(s) {
  let t = (s || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([.?!,])/g, "$1")
    .replace(/\(\s*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return "";
  if (!/[.?!]$/.test(t)) t += ".";
  return t;
}

/**
 * Reject a candidate that is not a sentence a learner should be able to type.
 *
 * The checks are deliberately narrow — they target the mis-combinations the
 * cross-product can produce and nothing else:
 *
 *  1. A bare suffix after a noun ("your son ands", "a dream dreams") — an
 *     inflection paren flipped in isolation.
 *  2. A tag question whose pronoun no longer matches the subject
 *     ("That is your car, isn't it?" is fine; "It is your car, isn't that?" is
 *     not, and neither is "That is your car, isn't it?" against "It …").
 *  3. Two content words repeated back to back ("mad angry").
 */
function plausible(sentence) {
  const words = sentence.split(/\s+/).filter(Boolean);
  // 1. A bare suffix fused onto a noun. The suffix must sit directly after a
  //    NOUN-like word (not a verb), which is what an isolated "(s)" flip does:
  //      "your son ands"      (son + s, then the next word starts with "and")
  //      "your sons and daughter"  ok  (the "s" attached to "son")
  if (/\b(and|or)\s+s\b/i.test(sentence)) return false;
  if (/\b[a-z]{2,}s\s+ands\b/i.test(sentence)) return false;
  if (/\b(dream dreams|pet pets|books book)\b/i.test(sentence)) return false;
  // 2. Tag question: only when the SUBJECT is a pronoun does the tag's pronoun
  //    have to match it.
  //      "It is your car, isn't that?"  subject "it"   tag "that"  no
  //      "That is your car, isn't it?"  subject "that" tag "it"    no
  //      "The CIA … , did it?"          subject noun    tag "it"    ok
  const PRON = new Set([
    "i", "you", "he", "she", "it", "we", "they", "there",
    "this", "that", "these", "those",
  ]);
  const tag = sentence.match(
    /,\s*(?:isn't|aren't|wasn't|weren't|is|are|was|were|do|does|did|don't|doesn't|didn't|can't|couldn't|won't|wouldn't)\s+([a-z']+)\s*\?/i
  );
  if (tag) {
    const subject = words[0].toLowerCase().replace(/[^a-z']/g, "");
    const pron = tag[1].toLowerCase();
    if (PRON.has(subject) && pron !== "there" && subject !== pron) return false;
  }
  // 3. Adjacent duplicate content words.
  for (let i = 1; i < words.length; i++) {
    const a = norm(words[i - 1]);
    const b = norm(words[i]);
    if (a && a === b && a.length >= 3) return false;
  }
  return true;
}

/**
 * True when every FINITE auxiliary in the sentence agrees in TENSE.
 *
 * Only the first auxiliary of each verb phrase is finite; the rest are
 * infinitives/participles that carry no tense of their own. Comparing them all
 * would flag correct sentences:
 *   "If I had been three minutes late, I should have missed the train."
 *        had (past) + should (past)                       -> agree
 *        "been" and "have" are non-finite and must be skipped
 * Detects the ungrammatical cross products this engine exists to prevent:
 *   "It can be improved, couldn't it?"   pres + past   -> false
 *   "It could be improved, can't it?"    past + pres   -> false
 *   "It can be improved, can't it?"      pres + pres   -> true
 */
function auxiliariesAgree(sentence) {
  // Split into clause-ish chunks and take the finite auxiliary of each: the
  // first auxiliary that is NOT preceded by another auxiliary in the same run.
  const tokens = sentence.split(/\s+/).filter(Boolean);
  const tenses = [];
  let prevWasAux = false;
  for (const rawW of tokens) {
    const w = rawW.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, "");
    if (!w) continue;
    const b = auxBase(w);
    if (!b) {
      prevWasAux = false;
      continue;
    }
    // Non-finite forms never carry the clause's tense.
    if (/^(be|being|been)$/i.test(w)) { prevWasAux = true; continue; }
    if (prevWasAux) {
      // second auxiliary in the same chain -> non-finite, skip
      continue;
    }
    const t = tenseOf(w);
    if (t) tenses.push(t);
    prevWasAux = true;
  }
  if (tenses.length < 2) return true;
  return tenses.every((t) => t === tenses[0]);
}


//
// The marker lives inside a parenthetical whose closing ")" may come before or
// after the sentence's own terminator, so punctuation has to be reassembled
// rather than sliced.
//
// IMPORTANT: the alternative must be a COMPLETE SENTENCE. The author's
// out-of-paren wording is the primary; the parenthetical is substituted INTO
// the sentence, not offered as a bare fragment:
//   "They have dreams (혹은 a dream.)"
//        primary "They have dreams."   alt "They have a dream."
//   "Each boy receives a prize(혹은 prizes)."
//        primary "Each boy receives a prize."   alt "Each boy receives prizes."
//   "I had a little alteration(혹은 a few alterations) made."
//        primary "I had a little alteration made."  alt "I had a few alterations made."
function parseAltMarker(en) {
  const at = en.indexOf(ALT_MARK);
  if (at < 0) return null;

  // MULTI-SENTENCE CELL: one cell sometimes holds two sentences run together
  // with no space:
  //   "(Were it not for the sun,) nothing could live.(If it were not for the sun,) nothing could live."
  // Resolve only the sentence that CARRIES the marker; the other one is a
  // separate exercise row and must not be glued onto this answer.
  //   text "Were it not for the sun, nothing could live."
  //   alt  "If it were not for the sun, nothing could live."
  {
    let start = 0;
    for (let i = 0; i < at; i++) if (/[.?!]/.test(en[i]) && en[i + 1] === "(") start = i + 1;
    let end = en.length;
    const after = en.slice(at);
    const m = after.match(/[.?!]\s*\(/);
    if (m) end = at + m.index + 1;
    if (start > 0 || end < en.length) {
      const one = en.slice(start, end).trim();
      if (one.includes(ALT_MARK)) return parseAltMarker(one);
    }
  }

  // MULTI-PAREN: the marker may sit inside the SECOND parenthetical
  //   "All (the) boys receive a prize(혹은 prizes)."
  //     -> text "All the boys receive a prize."   alt "All the boys receive prizes."
  //   "Those(they) are books, aren't they(혹은 ---, are they not)?"
  //     -> text "Those are books, aren't they?"   alt "Those are books, are they not?"
  // The dedicated resolver exhausts every paren, so neither the primary nor any
  // alternative can retain a bracket.
  const multi = resolveMultiParen(en);
  if (multi) {
    return {
      primary: multi.text,
      altRaw: multi.alternatives[0] || "",
      altAll: multi.alternatives,
      needsManualAlt: false,
    };
  }

  const open = en.lastIndexOf("(", at);
  const close = en.indexOf(")", at);
  if (open < 0 || close < 0) return null;

  const beforeParen = en.slice(0, open);
  const afterParen = en.slice(close + 1);
  let altRaw = en.slice(at + ALT_MARK.length, close).trim();

  // A dash-only alternative ("---") carries no information — drop the paren
  // entirely and keep the plain sentence.
  const dashOnly = /^-+$/.test(altRaw);
  if (dashOnly) altRaw = "";

  // Punctuation that belongs to the sentence: take whichever terminator exists
  // outside the paren, otherwise pull it off the tail of the alternative.
  const outsideTerm = (afterParen.match(/[.?!]/) || [""])[0];
  let primary = beforeParen + afterParen;
  if (!outsideTerm && altRaw) {
    const m = altRaw.match(/([.?!])$/);
    if (m) primary += m[1];
  }
  primary = terminate(primary);
  // `beforeParen` + `afterParen` were split mid-sentence, so a dangling comma
  // can survive ("(혹은 X),"? no — but "(혹은 X)" preceded by a comma can).
  primary = primary.replace(/,\s*([.?!])/g, "$1");

  // A dash INSIDE the alternative is a placeholder for words that already sit
  // in the primary. In every case in this corpus the alternative is simply the
  // uncontracted form of the same question:
  //   "Don't I love you(혹은 Do I not ---)?"  -> alt "Do I not love you?"
  // So the dash is recovered by expanding the primary's contraction and keeping
  // the primary's own object phrase — no positional guessing needed.
  let needsManualAlt = false;
  let altText = "";
  if (altRaw && /--+/.test(altRaw)) {
    const expanded = expandContraction(primary);
    if (/^\s*--+/.test(altRaw)) {
      // leading-dash form: "<X>, aren't these?" -> "<X>, are these not?"
      const subject = primary.replace(/,\s*(isn't|aren't|wasn't|weren't)\s+.*$/, "").trim();
      altText = terminate(altRaw.replace(/^\s*--+\s*,?\s*/, subject + ", "));
    } else if (expanded) {
      altText = terminate(expanded);
    } else {
      needsManualAlt = true;
    }
  } else if (altRaw) {
    // Substitute the paren phrase into the sentence so the alternative is a
    // complete sentence rather than a fragment. When the substitution cannot
    // be aligned (single-token swap onto the immediately preceding word), fall
    // back to the plain splice.
    const alts = substitute(beforeParen, altRaw, afterParen);
    altText = alts[0] || "";
  }

  // Guard: never let the alternative collapse to a bare fragment.
  if (altText && wordCount(altText) < wordCount(primary) * 0.6) {
    const spliced = terminate(
      beforeParen.replace(/\S+$/, "") + " " + altRaw + afterParen
    );
    if (spliced && wordCount(spliced) >= wordCount(primary) * 0.6) altText = spliced;
  }

  return { primary, altRaw: altText, needsManualAlt };
}

const catA = [];
const seenA = new Set();
for (const r of exposure) {
  if (!r.en.includes(ALT_MARK) || seenA.has(r.en)) continue;
  seenA.add(r.en);
  catA.push({ en: r.en, pages: allPages(r.en), ...(parseAltMarker(r.en) || {}) });
}

/* ------------------------------------------------------- categories B/C/D */
const flat = [];
for (const kind of ["SUBSTITUTE", "APPEND", "SUFFIX", "SENTENCE", "POLLUTED"]) {
  for (const r of buckets[kind]) flat.push({ ...r, kind });
}

/**
 * Build the proposed (text, alternatives) pair for a B/C pattern.
 *
 * TWO HARD RULES, applied to every kind:
 *
 *  1. `text` is the author's OUT-OF-PAREN wording. That is the string shown on
 *     screen and read aloud by the model audio, so it must be the primary model
 *     answer. The parenthetical is the alternative. (`Those(They)` -> primary
 *     "Those …", alt "They …"; `Sunday(s)` -> primary "Sunday", alt "Sundays".)
 *
 *  2. EVERY alternative is a COMPLETE SENTENCE — the primary with the
 *     substitution actually applied. A bare fragment must never be accepted:
 *     an alternative of "that" would let a student score 100 by typing one
 *     word. (`Did he like it(that)?` -> primary "Did he like it?", alt
 *     "Did he like that?" — NOT alt "that".)
 *
 * Kind differences are only about HOW the substitution is applied:
 *   SUBSTITUTE  the paren word replaces the token before the "("
 *   APPEND      the paren word is inserted into a gap; the primary omits it
 *   SUFFIX      inflection — the primary carries the inflection, the alt is bare
 *   SENTENCE    the paren is a whole second sentence, used verbatim as the alt
 */
function propose(kind, en) {
  // MULTI-PAREN FIRST. Whenever a sentence carries two or more parentheticals
  // the single-paren branches below would only ever see the first one and let
  // the rest leak into `text`. The dedicated resolver exhausts them all.
  const multi = resolveMultiParen(en);
  if (multi) return multi;

  if (kind === "SENTENCE") {
    const m = en.match(/^(.*?)\s*\(([^)]*)\)\s*(.*)$/);
    if (m) {
      const text = terminate(m[1] + " " + m[3]);
      const alt = terminate(m[2]);
      return { text: text || en, alternatives: [alt] };
    }
    return { text: en, alternatives: [] };
  }

  if (kind === "SUFFIX") {
    // "son(s)" -> primary "sons" (author's inflected form), alt "son" (bare).
    const withSuffix = clean(en.replace(/\(([^)]*)\)/, "$1"));
    const bare = clean(en.replace(/\(([^)]*)\)/, ""));
    return {
      text: withSuffix,
      alternatives: bare && bare !== withSuffix ? [bare] : [],
    };
  }

  if (kind === "APPEND") {
    const m = en.match(/^(.*?)\s*\(([^)]*)\)\s*(.*)$/);
    if (m) {
      const inner = m[2].trim();
      const head = clean(m[1]);
      const tail = clean(m[3]);
      const lastWord = (head.match(/(\S+)$/) || [""])[0].replace(/[.?!,]/g, "");

      // "were (there) in"     -> INSERT: the primary omits the word entirely.
      // "a dream (dreams)"    -> REPLACE: the paren word swaps for the word
      //                          before the "("; concatenating is ungrammatical
      //                          ("a dream dreams"), so the previous token is
      //                          dropped.
      // "workers (laborers)"  -> REPLACE by SYNONYM. No stem is shared, so a
      //                          shared-stem test alone is not enough: a noun
      //                          phrase before the "(" that the paren replaces
      //                          with another noun is always a REPLACE.
      // An auxiliary, preposition or pronoun that merely fills a gap
      // ("were (there) in", "no choice but (to) step") is never a REPLACE.
      const stem = (w) => {
        const s = w.toLowerCase();
        if (s.length > 4 && s.endsWith("ies")) return s.slice(0, -3) + "y";
        if (s.length > 4 && s.endsWith("es") && /(ch|sh|ss|x|z)es$/.test(s)) return s.slice(0, -2);
        if (s.length > 3 && s.endsWith("s")) return s.slice(0, -1);
        return s;
      };
      // Closed-class words that can only ever be INSERTED into a gap.
      const INSERT_ONLY = new Set([
        "there", "be", "to", "on", "in", "at", "for", "of", "with", "by",
        "whom", "which", "that", "who", "or", "and", "not", "a", "an", "the",
        "it", "its", "his", "her", "their", "our", "my", "your",
      ]);
      // A multi-word paren phrase is never a one-word REPLACE.
      const singleWord = !!inner && !inner.includes(" ");
      const openClass = singleWord && !INSERT_ONLY.has(inner.toLowerCase());
      // Stem match (dream/dreams) OR a noun-for-noun swap (workers/laborers).
      // The latter is signalled by the word before "(" also being an open-class
      // word the paren could stand in for.
      const stemMatch = openClass && !!lastWord && stem(inner) === stem(lastWord);
      const synonymSwap =
        openClass && !!lastWord && !INSERT_ONLY.has(lastWord.toLowerCase());
      const isReplace = stemMatch || synonymSwap;

      if (isReplace) {
        // 3. synonym / inflection swap in place, as a COMPLETE sentence
        //    "We were workers (laborers)." -> primary "We were workers."
        //                                     alt     "We were laborers."
        const atWord = head.toLowerCase().lastIndexOf(lastWord.toLowerCase());
        const replaced =
          head.slice(0, atWord) + inner + (head.slice(atWord + lastWord.length) || "");
        return {
          text: terminate(head + " " + tail),
          alternatives: [terminate(replaced + " " + tail)],
        };
      }

      // INSERT: primary drops the word, alternative puts it back in the gap.
      return {
        text: terminate(head + " " + tail),
        alternatives: [terminate(head + " " + inner + " " + tail)],
      };
    }
    return { text: en, alternatives: [] };
  }

  // ---------------------------------------------------------------- SUBSTITUTE
  // Primary is the author's out-of-paren wording; the paren substitutes for the
  // token before the "(" and the result must be a full sentence.
  const m = en.match(/^(.*?)\(([^)]*)\)(.*)$/);
  if (m) {
    const before = m[1].replace(/\s+$/, "");
    const after = m[3];
    const inner = m[2].trim();

    // A Korean note inside the paren is a grammar remark, not an answer form.
    // "The police arrested 15 people, didn't they? (police, people, children은
    // 항상 복수)" — strip it and keep the sentence.
    if (/[\uAC00-\uD7AF]/.test(inner)) {
      return { text: terminate(before + after), alternatives: [], note: "Korean grammar note stripped" };
    }

    // A paren is a whole restatement SENTENCE — rather than a substitution
    // inside one — only when it sits in sentence position:
    //   "Wasn't there a boy? (Was there not a boy?)"     paren after a terminator
    //   "I am, too.(So am I)."                            paren after a terminator
    //   "This is he.(Speaking.)"                          paren is its own sentence
    //   "Should you not go, he would go. (If you should not go,) he would go."
    //
    // Position, not word count, is the test. A paren in the MIDDLE of a clause
    // is always a substitution, however many words it holds:
    //   "were you not(weren't you) studying"   "will they(are they going to) finish"
    //   "If I had enough money(Had I enough money), I would …"
    const afterTerminator = /[.?!]$/.test(before);
    const beforeIsClauseEnd = afterTerminator;
    const parenEndsSentence = /[.?!]$/.test(inner);
    // The alternative reads as its own independent utterance when it ends the
    // sentence and nothing but a terminator follows the ")".
    const nothingFollows = /^\s*[.?!]?\s*$/.test(after);
    const restatement =
      !inner.includes(":") &&
      (beforeIsClauseEnd || (parenEndsSentence && nothingFollows));
    if (restatement) {
      // A trailing comma inside the paren belongs to the alternative clause
      // ("(If you should not go,) he would go.") and must not leak into the
      // primary, nor may the primary's own terminator be duplicated.
      const cleanedInner = clean(inner).replace(/,\s*$/, "");

      // FRONTED CLAUSE — the paren is a rewrite of a clause that the sentence
      // already contains, and the text after the paren repeats the main clause:
      //   "Should you not go, he would go. (If you should not go,) he would go."
      // Here the primary is everything BEFORE the paren and the alternative is
      // the rewritten clause joined to the trailing main clause:
      //   primary "Should you not go, he would go."
      //   alt     "If you should not go, he would go."
      const tail = clean(after);
      const beforeBody = clean(before);
      if (tail && beforeBody.toLowerCase().endsWith(tail.toLowerCase())) {
        // The paren clause is fronted, so it must be followed by a comma:
        //   "If you should not go" + "," + "he would go."
        const altText = terminate(cleanedInner.replace(/,\s*$/, "") + ", " + tail, beforeBody);
        return { text: beforeBody, alternatives: altText ? [altText] : [] };
      }

      const base = terminate(before + " " + after);
      const alt = terminate(cleanedInner);
      return { text: base || en, alternatives: alt && alt !== base ? [alt] : [] };
    }

    // A colon-gloss ("name(family name: last name)") is an explanation of the
    // preceding word, not a substitute for it — keep the author's wording and
    // accept the gloss as an alternative, never splicing it mid-sentence.
    // A gloss is a bare noun phrase, so it takes no terminator of its own.
    if (inner.includes(":")) {
      const primary = terminate(before + after);
      const gloss = clean(inner);
      return { text: primary, alternatives: gloss ? [gloss] : [], gloss: true };
    }

    // A dash INSIDE the paren is a placeholder for words already present in the
    // primary sentence. In this corpus the alternative is always the
    // uncontracted form of the same question, so it is recovered by expanding
    // the primary's contraction — no positional guessing needed:
    //   "Don't I love her(Do I not ---)?"  -> alt "Do I not love her?"
    if (/--+/.test(inner)) {
      const primary = terminate(before + after);
      const expanded = expandContraction(primary);
      const alt = expanded ? terminate(expanded, primary) : "";
      return {
        text: primary,
        alternatives: alt && alt !== primary ? [alt] : [],
        needsManualAlt: !expanded,
      };
    }

    // Plain substitution, aligned by the shared helper (see `substitute`).
    //
    //  A. SINGLE TOKEN — the paren word replaces the token immediately before
    //     the "(" :  "Did he like it(that)?"      -> alt "Did he like that?"
    //                 "Nobody(No one) called."     -> alt "No one called."
    //
    //  B. MULTI-WORD SPAN — the paren phrase replaces a run of words reaching
    //     back into the sentence, usually an auxiliary + subject (+ not):
    //        "Why were you not(weren't you) studying English?"
    //            span "were you not" -> alt "Why weren't you studying English?"
    //        "When will they(are they going to) finish …?"
    //            span "will they" -> alt "When are they going to finish …?"
    //        "It will handle(deal with) redevelopment."
    //            span "handle" -> alt "It will deal with redevelopment."
    //
    //  C. CLAUSE INVERSION — the paren rewrites a whole conditional clause:
    //        "If I had enough money(Had I enough money), I would buy you …"
    //            -> alt "Had I enough money, I would buy you a diamond ring."
    //        "Should I have been(If I had been, had I been) three minutes late, …"
    //            -> TWO alternatives, one per comma-separated variant.
    const primary = terminate(before + after);
    const alts = substitute(before, inner, after).filter(
      (c) => c && c !== primary
    );
    return { text: primary, alternatives: [...new Set(alts)] };
  }
  return { text: en, alternatives: [] };
}

/* ------------------------------------------------------- prescribed repairs */
/**
 * The 9 POLLUTED cells. Generating `alternatives` cannot fix these — the
 * `text` itself is wrong — so each repair is written out explicitly, exactly
 * as the reviewer prescribed. `gh1-032 #36~39` is not an alternatives problem
 * at all: those cells are shifted, and the realignment is produced separately
 * by scripts/realign-gh1032.cjs.
 */
const POLLUTED_REPAIRS = [
  {
    page: "gh1-032",
    n: "36",
    current: "Don't I love her(Do I not ---)? 37.This is mine.",
    kind: "REALIGN",
    text: "Don't I love her(Do I not ---)?",
    alternatives: ["Do I not love her?"],
    why: "stray sentence number '37.' glued in; see gh1-032 realignment",
  },
  {
    page: "gh1-032",
    n: "37",
    current: "It is yours. 39.Those(They) are theirs.",
    kind: "REALIGN",
    text: "This is mine.",
    alternatives: [],
    why: "stray sentence number '39.' glued in; see gh1-032 realignment",
  },
  {
    page: "gh1-032",
    n: "47",
    current: "Aren't they(those) yours(Are they not yours)?",
    kind: "REPAIR",
    text: "Aren't they yours?",
    alternatives: ["Aren't those yours?", "Are they not yours?", "Are those not yours?"],
    why: "2 parens; author wording 'Aren't they yours?' is primary, the three variants are alternatives",
  },
  {
    page: "gh1-062",
    n: "26",
    current: "Do your son(s) and daughter(s) have a dream (dreams)?",
    kind: "REPAIR",
    text: "Do your son and daughter have a dream?",
    alternatives: [
      "Do your sons and daughters have a dream?",
      "Do your son and daughter have dreams?",
      "Do your sons and daughters have dreams?",
    ],
    why: "mixed SUFFIX + APPEND; all four number combinations are accepted",
  },
  {
    page: "gh1-080-2",
    n: "36",
    current: "Are(Were) you mad (angry)?",
    kind: "REPAIR",
    text: "Are you mad?",
    alternatives: ["Were you mad?", "Are you angry?", "Were you angry?"],
    why: "mixed SUBSTITUTE + APPEND (tense × synonym)",
  },
  {
    page: "gh1-090",
    n: "26",
    current: "Do your son(s) and daughter(s) have pets(a pet)?",
    kind: "REPAIR",
    text: "Do your son and daughter have pets?",
    alternatives: [
      "Do your sons and daughters have pets?",
      "Do your son and daughter have a pet?",
      "Do your sons and daughters have a pet?",
    ],
    why: "3 parens, mixed SUFFIX + APPEND",
  },
  {
    page: "gh1-118-2",
    n: "66",
    current: "We are going to(will) do that another time (some other time).",
    kind: "REPAIR",
    text: "We are going to do that another time.",
    alternatives: ["We will do that another time.", "We are going to do that some other time.", "We will do that some other time."],
    why: "2 parens (future form × time phrase)",
  },
  {
    page: "gh2-026-1",
    n: "17",
    current: "I never get carsick but I always get airsick (aboard a plane) or seasick (aboard a ship).",
    kind: "REPAIR",
    text: "I never get carsick but I always get airsick or seasick.",
    alternatives: [],
    why: "parens are glosses/explanation, not answer variants — no alternative",
  },
  {
    page: "gh2-048-1",
    n: "14",
    current: "(Were it not for the sun,) nothing could live.(If it were not for the sun,) nothing could live.",
    kind: "REPAIR",
    text: "Were it not for the sun, nothing could live.",
    alternatives: ["If it were not for the sun, nothing could live."],
    why: "2 fronted clauses; author wording first, if-clause is the alternative",
  },
];

/**
 * Reconcile the prescribed POLLUTED repairs with the multi-paren resolver.
 *
 * Seven of the nine rows are also multi-paren rows, so the resolver's output is
 * the single source of truth for them. Without this step the two tables drift —
 * the hand-written round-1 values still contained a gloss alternative
 * ("Are you angry?") that round 2 correctly removed.
 */
for (const rep of POLLUTED_REPAIRS) {
  if ((rep.current.match(/\(/g) || []).length < 2) continue;
  const resolved = rep.current.includes(ALT_MARK)
    ? (() => {
        const x = parseAltMarker(rep.current);
        return x ? { text: x.primary, alternatives: x.altAll || (x.altRaw ? [x.altRaw] : []) } : null;
      })()
    : propose("SUBSTITUTE", rep.current);
  if (!resolved || !resolved.text) continue;
  rep.text = resolved.text;
  rep.alternatives = resolved.alternatives || [];
  rep.reconciled = "multi-paren resolver";
}

/* ---------------------------------------------------------------- write out */
let md = "# KIG-006 — parenthetical classification (proposal, not applied)\n\n";
md += "Every English model answer carrying a parenthetical, with the proposed\n";
md += "`text` / `alternatives` split. **Nothing here has been written to `content/`.**\n\n";
md += "Two rules drive every row:\n\n";
md += "1. `text` is the author's **out-of-paren** wording — the string shown on\n";
md += "   screen and read aloud — so it is the primary model answer.\n";
md += "2. every **alternative is a complete sentence**, never a bare fragment.\n\n";
md += `Category A (\`혹은\` marker) unique answers: **${catA.length}**\n\n`;
md += `Category B/C/D unique answers: **${flat.length}**\n\n`;
md += "| kind | count |\n|---|---:|\n";
for (const k of ["SUBSTITUTE", "APPEND", "SUFFIX", "SENTENCE", "POLLUTED"]) {
  md += `| ${k} | ${buckets[k].length} |\n`;
}
md += "\n";

md += "## Category A — `혹은 X` alternatives\n\n";
md += "| page | current text | proposed text | proposed alternatives |\n";
md += "|---|---|---|---|\n";
for (const a of catA) {
  const e = a.en.replace(/\|/g, "\\|");
  const txt = (a.primary || "—").replace(/\|/g, "\\|");
  const alt = a.altRaw ? a.altRaw.replace(/\|/g, "\\|") : "—";
  md += `| ${a.pages.join(", ")} | ${e} | ${txt} | ${alt} |\n`;
}
md += "\n";

for (const k of ["SUBSTITUTE", "APPEND", "SUFFIX", "SENTENCE", "POLLUTED"]) {
  md += `## ${k} (${buckets[k].length})\n\n`;
  md += "| page | # | current text | proposed text | proposed alternatives |\n";
  md += "|---|---|---|---|---|\n";
  for (const r of buckets[k]) {
    const e = r.en.replace(/\|/g, "\\|");
    let p;
    if (k === "POLLUTED") {
      const rep = POLLUTED_REPAIRS.find((x) => x.page === r.page && x.n === r.n);
      p = rep
        ? { text: rep.text, alternatives: rep.alternatives }
        : propose(k, r.en);
    } else {
      p = propose(k, r.en);
    }
    const text = (p.text || "—").replace(/\|/g, "\\|");
    const alts = p.alternatives.length ? p.alternatives.join(" / ").replace(/\|/g, "\\|") : "—";
    md += `| ${r.page} | ${r.n} | ${e} | ${text} | ${alts} |\n`;
  }
  md += "\n";
}

fs.writeFileSync(path.join(EV, "kig006-classification.md"), md);

const polluted = flat.filter((r) => r.kind === "POLLUTED");
let pm = "# KIG-006 — cells whose `text` itself is corrupted (not an alternatives problem)\n\n";
pm += "These cannot be fixed by generating `alternatives` — the `text` is wrong.\n";
pm += "The proposed repair is written out below, exactly as prescribed.\n\n";
pm += "| page | # | current text | why | proposed text | proposed alternatives |\n";
pm += "|---|---|---|---|---|---|\n";
for (const r of polluted) {
  const rep = POLLUTED_REPAIRS.find((x) => x.page === r.page && x.n === r.n);
  const e = (r.en || "").replace(/\|/g, "\\|");
  const why = (rep ? rep.why : r.note || "").replace(/\|/g, "\\|");
  const txt = (rep ? rep.text : "—").replace(/\|/g, "\\|");
  const alts = rep && rep.alternatives.length
    ? rep.alternatives.join(" / ").replace(/\|/g, "\\|")
    : "—";
  pm += `| ${r.page} | ${r.n} | ${e} | ${why} | ${txt} | ${alts} |\n`;
}
// Any prescribed repair whose source row the classifier did not flag.
for (const rep of POLLUTED_REPAIRS) {
  if (!polluted.some((r) => r.page === rep.page && r.n === rep.n)) {
    pm += `| ${rep.page} | ${rep.n} | (not flagged by classifier) | ${rep.why} | ${rep.text} | ${rep.alternatives.join(" / ") || "—"} |\n`;
  }
}
fs.writeFileSync(path.join(EV, "kig006-polluted.md"), pm);

fs.writeFileSync(
  path.join(EV, "kig006-alternatives.json"),
  JSON.stringify({ categoryA: catA, others: flat, pollutedRepairs: POLLUTED_REPAIRS }, null, 1)
);

console.log(`category A unique answers : ${catA.length}`);
console.log(`category B/C/D unique     : ${flat.length}`);
console.log(`  SUBSTITUTE ${buckets.SUBSTITUTE.length}  APPEND ${buckets.APPEND.length}  SUFFIX ${buckets.SUFFIX.length}  SENTENCE ${buckets.SENTENCE.length}  POLLUTED ${buckets.POLLUTED.length}`);
console.log(`polluted rows             : ${polluted.length}`);
console.log("\nwrote kig006-classification.md, kig006-polluted.md, kig006-alternatives.json");

/* ------------------------------------------------------------- assertions */
// (1) every proposed alternative must be a COMPLETE SENTENCE, i.e. at least
//     0.6x the primary's word count — a bare fragment ("that") fails this.
// (2) a fragment typed by a student must grade `incorrect`, not `exact`.
const FRAGMENT_PROBES = ["that", "they", "it", "Is he not", "dreams", "s"];

// Legitimate STANDALONE elliptical utterances. These are complete answers in
// their own right (telephone formulas, short replies), so the word-count ratio
// does not apply to them.
const ELLIPTICAL_OK = new Set([
  "speaking.",
  "so am i.",
  "neither do i.",
]);

let fragViolations = 0;
let fragChecked = 0;
const proposable = flat.filter((r) => r.kind !== "POLLUTED");
for (const r of proposable) {
  const p = propose(r.kind, r.en);
  const pw = wordCount(p.text);
  for (const alt of p.alternatives) {
    const aw = wordCount(alt);
    fragChecked++;
    if (ELLIPTICAL_OK.has(alt.trim().toLowerCase())) continue;
    if (pw > 0 && aw < pw * 0.6) {
      fragViolations++;
      console.log(`  RATIO FAIL [${r.kind}] ${r.page} #${r.n}: primary(${pw}) "${p.text}" vs alt(${aw}) "${alt}"`);
    }
  }
  // A probe fragment must never coincide with the primary or an alternative.
  for (const probe of FRAGMENT_PROBES) {
    if (probe.toLowerCase() === p.text.toLowerCase() || p.alternatives.some((a) => a.toLowerCase() === probe.toLowerCase())) {
      fragViolations++;
      console.log(`  FRAGMENT-EXACT FAIL ${r.page} #${r.n}: "${probe}" matches`);
    }
  }
}
console.log(`\nalternative/primary ratio check : ${fragChecked} alternatives, ${fragViolations} violations`);
console.log(`fragment-exact probe check      : ${proposable.length} rows x ${FRAGMENT_PROBES.length} probes`);

/* --- (3) NO PAREN MAY SURVIVE in `text` or any alternative ----------------
 * A surviving "(" is the worst failure mode: the TTS reads the bracket aloud
 * and a learner who types the correct sentence is graded wrong. */
let residueViolations = 0;
for (const r of proposable) {
  const p = propose(r.kind, r.en);
  for (const s of [p.text, ...p.alternatives]) {
    if (!s) continue;
    if (s.includes("(") || s.includes(")") || s.includes(ALT_MARK)) {
      residueViolations++;
      console.log(`  PAREN RESIDUE [${r.kind}] ${r.page} #${r.n}: "${s}"`);
    }
  }
}
// category A too (they go through parseAltMarker)
let residueA = 0;
for (const a of catA) {
  const all = [a.primary, ...(a.altAll || (a.altRaw ? [a.altRaw] : []))];
  for (const s of all) {
    if (!s) continue;
    if (s.includes("(") || s.includes(")") || s.includes(ALT_MARK)) {
      residueA++;
      console.log(`  PAREN RESIDUE [A] ${a.pages.join(",")}: "${s}"`);
    }
  }
}
console.log(`paren-residue check            : ${residueViolations + residueA} violations`);

/* --- (4) terminal punctuation is preserved in every alternative ---------- */
const TERM = (s) => (s.match(/[.?!]\s*$/) || [""])[0];
let termViolations = 0;
for (const r of proposable) {
  const p = propose(r.kind, r.en);
  const want = TERM(p.text);
  if (!want) continue;
  // A glossary alternative is a bare noun phrase — it deliberately has no
  // terminator, so the consistency rule does not apply to it.
  if (p.gloss) continue;
  for (const alt of p.alternatives) {
    if (TERM(alt) !== want) {
      termViolations++;
      console.log(`  TERMINATOR FAIL [${r.kind}] ${r.page} #${r.n}: text "${want}" vs alt "${TERM(alt)}" -> "${alt}"`);
    }
  }
}
console.log(`terminator-consistency check   : ${termViolations} violations`);

/* --- (5) auxiliary agreement: no "could … can't" style mismatch ---------- */
let auxViolations = 0;
for (const r of proposable) {
  const p = propose(r.kind, r.en);
  for (const alt of p.alternatives) {
    if (!auxiliariesAgree(alt)) {
      auxViolations++;
      console.log(`  AUX AGREEMENT FAIL [${r.kind}] ${r.page} #${r.n}: "${alt}"`);
    }
  }
}
console.log(`auxiliary-agreement check      : ${auxViolations} violations`);

// sanity: how many A items failed to parse
const badA = catA.filter((x) => !x.primary);
console.log(`\nA items that could not be split: ${badA.length}`);
badA.slice(0, 10).forEach((x) => console.log("  " + x.en));

// category A: fragment alternative check
let aFrag = 0;
for (const a of catA) {
  if (!a.altRaw) continue;
  const pw = wordCount(a.primary);
  const aw = wordCount(a.altRaw);
  if (pw > 0 && aw < pw * 0.6) {
    aFrag++;
    console.log(`  A RATIO FAIL ${a.pages.join(",")}: primary(${pw}) "${a.primary}" vs alt(${aw}) "${a.altRaw}"`);
  }
}
console.log(`category A ratio violations     : ${aFrag}`);
