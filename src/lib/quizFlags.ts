/**
 * KIG-008 — whether the auto-generated quizzes are shown.
 *
 * `generateReadingQuiz()` and `generateListeningContextQuiz()` pick their
 * "correct" option by keyword substring match against the passage or the
 * transcript (`tEn.includes("art")` also fires on start, part and heart), so
 * the answer frequently does not follow from the text the learner just read or
 * heard. Measured over the corpus: READING 208 of 256 lessons had a wrong
 * answer key, LISTENING 254 of 276 — and 165 of those shared ONE fixed answer
 * regardless of content.
 *
 * THE GENERATORS ARE NOT DELETED AND THE CALL SITES ARE NOT GONE. Both views
 * still hold the generated questions in state, still hold the selection state
 * and the handler that goes with them, and still render the block. Setting this
 * to true brings the feature back and changes nothing else.
 *
 * WHY IT IS ONE MODULE AND NOT ONE CONSTANT PER FILE. Two copies of a switch
 * can be flipped one at a time, and the half-flipped state is invisible: each
 * page looks right on its own. There is one product decision here, so there is
 * one place to make it.
 *
 * REVIEWED QUESTIONS DO NOT BELONG BEHIND THIS FLAG. Questions written against
 * the source material are correct by construction and should render whether
 * this is true or false; they need a different home, not this switch.
 */
export const SHOW_GENERATED_QUIZ = false;
