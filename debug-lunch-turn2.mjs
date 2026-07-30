/**
 * Simulates handleTurn for the lunch scene Turn 1 with a warm player response.
 * The NPC must return BOTH npcResponse AND suggestedReplies for Turn 2.
 * This is the code path that triggers the mis-perspective bug.
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

// Simulate the warm/reconciliatory player response that triggers the issue
// currentSceneHistory is EMPTY on Turn 1 (chapterMessages starts empty, opening line not added to it)
const WARM_PLAYER_INPUT = "I hear you. It does feel like he keeps his distance. Maybe we should try including him more?"

const npcMessages = buildAlienNpcPrompt(
  danielJson, LUNCH_SCENE,
  [],           // currentSceneHistory = [] on Turn 1
  WARM_PLAYER_INPUT,
  BASE_STATE, false, 'en',
  false,        // NOT final turn — model must generate suggestedReplies for Turn 2
)

const out = []
out.push('=== MESSAGES SENT (Turn 1 NPC response + Turn 2 suggestions) ===')
npcMessages.forEach((m, i) => { out.push(`\n[${i}] role=${m.role}\n${m.content}`) })

for (let run = 1; run <= 3; run++) {
  out.push(`\n${'='.repeat(60)}\n=== RAW RESPONSE — Run ${run} ===\n${'='.repeat(60)}`)
  try {
    const r = await fetch('http://localhost:3001/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: npcMessages }),
      signal: AbortSignal.timeout(20000),
    })
    const j = await r.json()
    out.push(j.ok ? j.text : `ERROR: ${j.error}`)
  } catch (e) { out.push(`FETCH ERROR: ${e.message}`) }
}

fs.writeFileSync('debug-results-turn2.txt', out.join('\n'))
console.log('Written to debug-results-turn2.txt')
