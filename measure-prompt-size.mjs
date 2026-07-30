/**
 * measure-prompt-size.mjs
 * Measures BEFORE token count for the current buildAlienNpcPrompt (lunch scene, Turn 2)
 * then computes the AFTER estimate based on the new lean structure.
 */
import { readFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))

const lunchScene = {
  id: 'lunch',
  level: 'Chapter 2',
  title: 'The Lunch That Wasn\'t',
  subtitle: 'A colleague who felt left out',
  narration: 'Daniel mentions that Evan skipped lunch with the group again — but did anyone actually tell him?',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  speaker: 'daniel',
  perspective: false,
}

// Simulate Turn 2: 2 prior exchanges in history
const history = [
  { role: 'npc',  text: 'He never joins us. It is like he does not want to be part of the team.' },
  { role: 'user', text: 'Did anyone actually tell him where we were going today?' },
  { role: 'npc',  text: 'We always go at noon — he knows that. He just chooses not to come.' },
]

const messages = buildAlienNpcPrompt(
  daniel,
  lunchScene,
  history,
  'I hear you, but maybe he genuinely didn\'t know.',
  {},
  false,
  'en',
  false,
)

// Count total chars across all messages
const totalChars = messages.reduce((sum, m) => sum + m.content.length, 0)
const estimatedTokens = Math.round(totalChars / 4)

console.log('=== BEFORE (current prompt) ===')
console.log(`Messages: ${messages.length}`)
messages.forEach((m, i) => {
  console.log(`  [${i}] role=${m.role}  chars=${m.content.length}  tokens≈${Math.round(m.content.length/4)}`)
})
console.log(`TOTAL chars: ${totalChars}`)
console.log(`TOTAL tokens (est): ${estimatedTokens}`)
console.log()
console.log('--- FULL SYSTEM PROMPT ---')
console.log(messages[0].content)
