/**
 * debug-unified-prompt.mjs
 *
 * 1. Prints AFTER token count for the unified lean prompt (lunch scene, Turn 2)
 * 2. Runs 3 real LLM calls for the 'lunch' scene (Turn 1 + Turn 2) — confirms player POV
 * 3. Runs 3 real LLM calls for the 'perspective' scene — confirms player POV + dual-truth
 * 4. Measures latency before/after
 * 5. Verifies doesNotKnow constraint still holds
 *
 * BEFORE baseline (current/old prompt, lunch Turn 2):
 *   System: 4859 chars / ~1215 tokens
 *   Total:  5146 chars / ~1287 tokens
 */
import { readFileSync, writeFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

// ── character + scene data ───────────────────────────────────────────────────
const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))
const evan   = JSON.parse(readFileSync('./src/data/alien-characters/evan.json',   'utf8'))

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

const perspectiveScene = {
  id: 'perspective',
  level: 'Chapter 5',
  title: "Evan's Side",
  subtitle: "Replaying the slide edit from Evan's point of view",
  narration: "The player re-experiences the slide-edit moment, but now from inside Evan's head.",
  line: "I saw the error at 11 PM. The meeting was at 9 AM. I fixed it.",
  speaker: 'evan',
  perspective: true,
}

// ── prompt size AFTER ────────────────────────────────────────────────────────
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

console.log('=== AFTER (unified lean prompt) — lunch Turn 2 ===')
console.log(`Messages: ${afterMessages.length}`)
afterMessages.forEach((m, i) => {
  console.log(`  [${i}] role=${m.role}  chars=${m.content.length}  tokens≈${Math.round(m.content.length/4)}`)
})
console.log(`TOTAL chars: ${afterChars}`)
console.log(`TOTAL tokens (est): ${afterTokens}`)
console.log()
console.log('BEFORE: ~1287 tokens  |  AFTER: ~' + afterTokens + ' tokens  |  reduction: ~' + (1287 - afterTokens) + ' tokens (' + Math.round((1287 - afterTokens) / 1287 * 100) + '%)')
console.log()
console.log('--- FULL SYSTEM PROMPT (AFTER) ---')
console.log(afterMessages[0].content)
console.log()

// ── LLM calls ───────────────────────────────────────────────────────────────
const API_URL = 'http://localhost:3001/api/chat'

async function callLLM(messages) {
  const t0 = Date.now()
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  })
  const latencyMs = Date.now() - t0
  if (!res.ok) return { ok: false, latencyMs, text: await res.text() }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? data.content ?? JSON.stringify(data)
  return { ok: true, latencyMs, text }
}

function parseJson(text) {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try { return JSON.parse(match[0]) } catch { return null }
}

// ── lunch scene — 3x Turn 1 + 3x Turn 2 ─────────────────────────────────────
console.log('=== LUNCH — 3x Turn 1 (seed → suggestions only) ===')
const lunchT1Latencies = []
const lunchT1Results   = []

for (let i = 0; i < 3; i++) {
  const seedHistory = [{ role: 'npc', text: lunchScene.line }]
  const msgs = buildAlienNpcPrompt(daniel, lunchScene, seedHistory, '__SUGGESTIONS_ONLY__', {}, false, 'en', false)
  const patched = msgs.map((m, idx) =>
    idx === msgs.length - 1
      ? { ...m, content: `The NPC just said: "${lunchScene.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
      : m,
  )
  const result = await callLLM(patched)
  lunchT1Latencies.push(result.latencyMs)
  lunchT1Results.push(result)
  const parsed = parseJson(result.text)
  console.log(`\nRun ${i+1} (${result.latencyMs}ms):`)
  if (parsed?.suggestedReplies) {
    parsed.suggestedReplies.forEach((r, j) => console.log(`  [${j}] ${r.line}`))
  } else {
    console.log('  RAW:', result.text.slice(0, 300))
  }
}

console.log('\n=== LUNCH — 3x Turn 2 ===')
const lunchT2Latencies = []

for (let i = 0; i < 3; i++) {
  const msgs = buildAlienNpcPrompt(
    daniel, lunchScene, historyTurn2,
    "I hear you, but maybe he genuinely didn't know.",
    {}, false, 'en', false,
  )
  const result = await callLLM(msgs)
  lunchT2Latencies.push(result.latencyMs)
  const parsed = parseJson(result.text)
  console.log(`\nRun ${i+1} (${result.latencyMs}ms):`)
  if (parsed?.suggestedReplies) {
    parsed.suggestedReplies.forEach((r, j) => console.log(`  [${j}] ${r.line}`))
    console.log(`  NPC: "${parsed.npcResponse}"`)
  } else {
    console.log('  RAW:', result.text.slice(0, 300))
  }
}

// ── perspective scene — 3x Turn 1 (dual-truth check) ────────────────────────
console.log('\n\n=== PERSPECTIVE (Evan POV + dual-truth) — 3x Turn 1 ===')
const perspLatencies = []

for (let i = 0; i < 3; i++) {
  const seedHistory = [{ role: 'npc', text: perspectiveScene.line }]
  const msgs = buildAlienNpcPrompt(evan, perspectiveScene, seedHistory, '__SUGGESTIONS_ONLY__', {}, true, 'en', false)
  const patched = msgs.map((m, idx) =>
    idx === msgs.length - 1
      ? { ...m, content: `The NPC just said: "${perspectiveScene.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
      : m,
  )
  const result = await callLLM(patched)
  perspLatencies.push(result.latencyMs)
  const parsed = parseJson(result.text)
  console.log(`\nRun ${i+1} (${result.latencyMs}ms):`)
  if (parsed?.suggestedReplies) {
    parsed.suggestedReplies.forEach((r, j) => console.log(`  [${j}] ${r.line}`))
  } else {
    console.log('  RAW:', result.text.slice(0, 300))
  }
}

// ── doesNotKnow constraint check ─────────────────────────────────────────────
console.log('\n\n=== doesNotKnow CONSTRAINT — probe Turn ===')
console.log('Asking Daniel directly about Evan\'s deadline pressure (forbidden fact)...')
const constraintMsgs = buildAlienNpcPrompt(
  daniel, lunchScene,
  [{ role: 'npc', text: lunchScene.line }],
  'Did Evan have a tight deadline on those slides that night?',
  {}, false, 'en', true,
)
const constraintResult = await callLLM(constraintMsgs)
const constraintParsed = parseJson(constraintResult.text)
console.log(`Response (${constraintResult.latencyMs}ms): "${constraintParsed?.npcResponse ?? constraintResult.text.slice(0, 200)}"`)

// ── latency summary ──────────────────────────────────────────────────────────
const avg = arr => Math.round(arr.reduce((s, v) => s + v, 0) / arr.length)
console.log('\n\n=== LATENCY SUMMARY ===')
console.log('BEFORE baseline (from earlier debug runs): ~4200ms avg')
console.log(`Lunch Turn 1: avg ${avg(lunchT1Latencies)}ms  (runs: ${lunchT1Latencies.join(', ')}ms)`)
console.log(`Lunch Turn 2: avg ${avg(lunchT2Latencies)}ms  (runs: ${lunchT2Latencies.join(', ')}ms)`)
console.log(`Perspective:  avg ${avg(perspLatencies)}ms   (runs: ${perspLatencies.join(', ')}ms)`)

// ── save results ─────────────────────────────────────────────────────────────
const output = {
  beforeTokens:    1287,
  afterTokens,
  tokenReduction:  1287 - afterTokens,
  tokenReductionPct: Math.round((1287 - afterTokens) / 1287 * 100),
  systemPromptAfter: afterMessages[0].content,
  lunchT1: lunchT1Results.map((r, i) => ({ run: i+1, latencyMs: r.latencyMs, raw: r.text })),
  latencies: { lunchT1: lunchT1Latencies, lunchT2: lunchT2Latencies, perspective: perspLatencies },
}
writeFileSync('./debug-unified-results.txt', JSON.stringify(output, null, 2))
console.log('\nResults saved to debug-unified-results.txt')
