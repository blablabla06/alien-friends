/**
 * Print the exact prompt only — no API calls.
 */
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'
import danielJson from './src/data/alien-characters/daniel.json' with { type: 'json' }

const LUNCH_SCENE = {
  id:        'lunch',
  level:     'Chapter 2: The Lunch Invitation',
  title:     'The Lunch Invitation',
  subtitle:  'Campus cafe, ten minutes later',
  speaker:   'daniel',
  line:      'He never joins us. It is like he does not want to be part of the team.',
  narration: 'The group is leaving for lunch. Evan stays behind. You notice nobody actually said the lunch plan out loud.',
  objective: 'Separate the observed fact from the group interpretation.',
  fact:      'Observed fact: Evan did not join lunch.',
  assumption:'Assumption: Evan dislikes the group.',
  choices:   ['lunchConform', 'lunchClarify', 'lunchAvoid'],
}

const BASE_STATE = { labelPower: 34, rumour: 22, tension: 38, evanTrust: 32 }

const seedHistory   = [{ role: 'npc', text: LUNCH_SCENE.line }]
const npcMessages   = buildAlienNpcPrompt(danielJson, LUNCH_SCENE, seedHistory, '__SUGGESTIONS_ONLY__', BASE_STATE, false, 'en', false)
const patchedMessages = npcMessages.map((m, i) =>
  i === npcMessages.length - 1
    ? { ...m, content: `The NPC just said: "${LUNCH_SCENE.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
    : m,
)

console.log('TOTAL MESSAGES IN ARRAY:', patchedMessages.length)
console.log()
patchedMessages.forEach((m, i) => {
  console.log(`${'='.repeat(72)}`)
  console.log(`Message[${i}]  role="${m.role}"`)
  console.log('='.repeat(72))
  console.log(m.content)
  console.log()
})
