export const meta = {
  name: 'blind-guess-test',
  description: 'Blind-guess every new question from its prompt and options only (plus LISTENING chips) to measure how guessable the set is',
  phases: [{ title: 'Guess', detail: 'one Sonnet guesser per 60 questions, no lesson text, no answers' }],
}
const DIR = 'docs/qa-2026-09-18/학습법-화면-0927/새-문제/_staging/_blind'
const parts = Array.from({ length: 22 }, (_, i) => `${DIR}/part-${String(i + 1).padStart(2, '0')}.json`)
const SCHEMA = {
  type: 'object',
  properties: {
    items: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string' }, pick: { type: 'number' },
      confidence: { type: 'string', enum: ['sure', 'likely', 'guess'] },
      remaining: { type: 'number' },
    }, required: ['id', 'pick', 'confidence', 'remaining'] } },
  },
  required: ['items'],
}
const prompt = (file) => `You are a test-wise student taking a multiple-choice test WITHOUT the listening audio or reading passage.
Read ONLY this file: ${file} (repo root C:\\Users\\ghddl\\.gemini\\antigravity\\scratch\\K-IG-CORE). Do not open, search or list any other file, and do not run commands other than reading that one file — the point is to see what can be answered from the question alone.
Each item has a Korean prompt and 4 options (index 0-3); LISTENING items also have "chips" — English words and numbers shown on screen before listening.
For EVERY item, use only the prompt, the options, the chips (if any) and common sense / test-taking tricks (absolute words, the option that fits the chips, the odd one out, the option that echoes the question, logic, general knowledge) to pick the most likely correct option.
Report for each item: pick (0-3), confidence ('sure' = you would bet on it, 'likely' = better than a coin flip between two, 'guess' = no real clue), and remaining = how many options you could NOT rule out (1-4).
Answer every item in the file (about 60). Return data only.`
const results = await parallel(parts.map((file, i) => () => agent(prompt(file), { label: `guess:${i + 1}`, phase: 'Guess', schema: SCHEMA, model: 'sonnet', effort: 'low' })))
const items = results.filter(Boolean).flatMap((r) => r.items || [])
return { parts: results.filter(Boolean).length, items }
