/**
 * measure-after.mjs — measures AFTER token count only, no LLM calls
 */
import { readFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))

const lunchScene = {
  id: 'lunch',
  level: 'Chapter 2',
  title: "The Lunch That Wasn't",
  subtitle: 'A colleague who felt left out',
  narration: 'Daniel mentions that Evan skipped lunch with the group again — but did anyone actually tell him?',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  speaker: 'daniel',
  perspective: false,
}

const historyTurn2 = [
  { role: 'npc',  text: 'He never joins us. It is like he does not want to be part of the team.' },
  { role: 'user', text: 'Did anyone actually tell him where we were going today?' },
  { role: 'npc',  text: 'We always go at noon — he knows that. He just chooses not to come.' },
]

const afterMessages = buildAlienNpcPrompt(
  daniel, lunchScene, historyTurn2,
  "I hear you, but maybe he genuinely didn't know.",
  {}, false, 'en', false,
)

const afterChars  = afterMessages.reduce((s, m) => s + m.content.length, 0)
const afterTokens = Math.round(afterChars / 4)

console.log('=== TOKEN COUNT: BEFORE vs AFTER ===')
console.log('BEFORE: 5146 chars / ~1287 tokens (system=4859/~1215, history=240/~60, user=47/~12)')
console.log()
console.log('AFTER:')
afterMessages.forEach((m, i) => {
  console.log(`  [${i}] role=${m.role}  chars=${m.content.length}  tokens~${Math.round(m.content.length/4)}`)
})
console.log(`  TOTAL chars: ${afterChars}`)
console.log(`  TOTAL tokens (est): ${afterTokens}`)
console.log()
console.log(`  Reduction: ~${1287 - afterTokens} tokens (${Math.round((1287 - afterTokens) / 1287 * 100)}%)`)
console.log()
console.log('--- FULL SYSTEM PROMPT (AFTER) ---')
console.log(afterMessages[0].content)
console.log()
console.log('--- HISTORY MESSAGES ---')
afterMessages.slice(1, -1).forEach((m, i) => {
  console.log(`  history[${i}] role=${m.role}: "${m.content.slice(0,80)}..."`)
})
console.log()
console.log('--- FINAL USER MESSAGE ---')
console.log(afterMessages[afterMessages.length - 1].content)
