/**
 * debug-lunch-prompt.mjs
 *
 * Replicates EXACTLY what fetchInitialSuggestions + buildAlienNpcPrompt
 * build for the 'lunch' scene at Turn 1, prints the full prompt,
 * then fires 3 real API calls to the local server and prints raw responses.
 *
 * Run with: node debug-lunch-prompt.mjs
 * (server must be running on port 3001)
 */

import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'
import danielJson from './src/data/alien-characters/daniel.json' with { type: 'json' }

// ── Exact replica of the 'lunch' scene object in AlienMainPage.jsx ────────────
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

// ── Exact replica of BASE_STATE from AlienMainPage.jsx ───────────────────────
const BASE_STATE = { labelPower: 34, rumour: 22, tension: 38, evanTrust: 32 }

// ── Exact replica of fetchInitialSuggestions logic ───────────────────────────
const seedHistory    = [{ role: 'npc', text: LUNCH_SCENE.line }]
const isPerspective  = false
const lang           = 'en'
const isFinalTurn    = false

const npcMessages = buildAlienNpcPrompt(
  danielJson,
  LUNCH_SCENE,
  seedHistory,
  '__SUGGESTIONS_ONLY__',
  BASE_STATE,
  isPerspective,
  lang,
  isFinalTurn,
)

// ── Apply the exact patch from fetchInitialSuggestions ────────────────────────
const patchedMessages = npcMessages.map((m, i) =>
  i === npcMessages.length - 1
    ? {
        ...m,
        content: `The NPC just said: "${LUNCH_SCENE.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".`,
      }
    : m,
)

// ── Print the full prompt ─────────────────────────────────────────────────────
console.log('='.repeat(72))
console.log('EXACT MESSAGES ARRAY SENT TO LLM (lunch scene, Turn 1 initial suggestions)')
console.log('='.repeat(72))
patchedMessages.forEach((m, i) => {
  console.log(`\n── Message[${i}]  role="${m.role}" ──────────────────────────────`)
  console.log(m.content)
})

// ── Fire 3 real API calls ─────────────────────────────────────────────────────
const SERVER = 'http://localhost:3001/api/alien-npc'

async function callOnce(runNumber) {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`RAW LLM RESPONSE — Run ${runNumber}`)
  console.log('='.repeat(72))
  try {
    const res  = await fetch(SERVER, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: patchedMessages, mode: 'normal', temperature: 0.75 }),
    })
    const json = await res.json()
    if (!json.ok) {
      console.log(`ERROR from server: ${json.error}`)
    } else {
      // Print the parsed npcResponse returned by the server
      console.log(`server-parsed npcResponse: ${JSON.stringify(json.npcResponse)}`)
      console.log(`server-parsed moodShift:   ${JSON.stringify(json.moodShift)}`)
    }

    // Also print whatever the server returned so we can see the raw suggestedReplies
    console.log('\nFull server response JSON:')
    console.log(JSON.stringify(json, null, 2))
  } catch (err) {
    console.log(`FETCH ERROR (is the server running on port 3001?): ${err.message}`)
  }
}

// NOTE: server strips suggestedReplies before returning (only returns npcResponse + moodShift).
// To see raw suggestedReplies we need to call the LLM directly through /api/chat instead.
// Let's use /api/chat which returns the raw `text` field unchanged.

const CHAT_SERVER = 'http://localhost:3001/api/chat'

async function callRaw(runNumber) {
  console.log(`\n${'='.repeat(72)}`)
  console.log(`RAW LLM TEXT (via /api/chat) — Run ${runNumber}`)
  console.log('='.repeat(72))
  try {
    const res  = await fetch(CHAT_SERVER, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: patchedMessages }),
    })
    const json = await res.json()
    if (!json.ok) {
      console.log(`ERROR: ${json.error}`)
    } else {
      console.log(json.text)
    }
  } catch (err) {
    console.log(`FETCH ERROR (server not running?): ${err.message}`)
  }
}

// Run 3 times sequentially so output stays readable
for (let i = 1; i <= 3; i++) {
  await callRaw(i)
}

console.log('\n' + '='.repeat(72))
console.log('DONE')
console.log('='.repeat(72))
