/**
 * debug-api-calls.mjs
 * Makes 3 real API calls for the lunch scene and writes results to debug-results.txt
 * Run: node debug-api-calls.mjs  (server must be on port 3001)
 */
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'
import danielJson from './src/data/alien-characters/daniel.json' with { type: 'json' }
import fs from 'fs'

const LUNCH_SCENE = {
  id: 'lunch', level: 'Chapter 2: The Lunch Invitation',
  title: 'The Lunch Invitation', subtitle: 'Campus cafe, ten minutes later', speaker: 'daniel',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  narration: 'The group is leaving for lunch. Evan stays behind. You notice nobody actually said the lunch plan out loud.',
  objective: 'Separate the observed fact from the group interpretation.',
  fact: 'Observed fact: Evan did not join lunch.', assumption: 'Assumption: Evan dislikes the group.',
  choices: ['lunchConform', 'lunchClarify', 'lunchAvoid'],
}
const BASE_STATE = { labelPower: 34, rumour: 22, tension: 38, evanTrust: 32 }

const seedHistory = [{ role: 'npc', text: LUNCH_SCENE.line }]
const npcMessages = buildAlienNpcPrompt(danielJson, LUNCH_SCENE, seedHistory, '__SUGGESTIONS_ONLY__', BASE_STATE, false, 'en', false)
const patchedMessages = npcMessages.map((m, i) =>
  i === npcMessages.length - 1
    ? { ...m, content: `The NPC just said: "${LUNCH_SCENE.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
    : m,
)

const out = []
out.push('=== MESSAGES SENT ===')
patchedMessages.forEach((m, i) => { out.push(`\n[${i}] role=${m.role}\n${m.content}`) })

for (let run = 1; run <= 3; run++) {
  out.push(`\n${'='.repeat(60)}\n=== RAW LLM RESPONSE — Run ${run} ===\n${'='.repeat(60)}`)
  try {
    const r = await fetch('http://localhost:3001/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: patchedMessages }),
      signal: AbortSignal.timeout(20000),
    })
    const j = await r.json()
    out.push(j.ok ? j.text : `ERROR: ${j.error}`)
  } catch (e) { out.push(`FETCH ERROR: ${e.message}`) }
}

fs.writeFileSync('debug-results.txt', out.join('\n'))
console.log('Written to debug-results.txt')
