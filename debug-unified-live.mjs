/**
 * debug-unified-live.mjs
 * Runs real LLM calls for lunch + perspective scenes, 3 runs each.
 * Also checks doesNotKnow constraint.
 */
import { readFileSync, writeFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))
const evan   = JSON.parse(readFileSync('./src/data/alien-characters/evan.json',   'utf8'))

const lunchScene = {
  id: 'lunch', level: 'Chapter 2',
  subtitle: 'A colleague who felt left out',
  narration: 'Daniel mentions that Evan skipped lunch with the group again — but did anyone actually tell him?',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  speaker: 'daniel', perspective: false,
}

const perspectiveScene = {
  id: 'perspective', level: 'Chapter 5',
  subtitle: "Replaying the slide edit from Evan's point of view",
  narration: "The player re-experiences the slide-edit moment from inside Evan's head.",
  line: 'I saw the error at 11 PM. The meeting was at 9 AM. I fixed it.',
  speaker: 'evan', perspective: true,
}

const lunchTurn2History = [
  { role: 'npc',  text: lunchScene.line },
  { role: 'user', text: 'Did anyone actually tell him where we were going today?' },
  { role: 'npc',  text: 'We always go at noon — he knows that. He just chooses not to come.' },
]

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
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

function seedPatch(msgs, scene) {
  return msgs.map((m, i) =>
    i === msgs.length - 1
      ? { ...m, content: `The NPC just said: "${scene.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
      : m,
  )
}

const lines = []
const latencies = { lunchT1: [], lunchT2: [], persp: [] }

// ── Lunch Turn 1 (3x) ──────────────────────────────────────────────────────
lines.push('\n=== LUNCH — Turn 1 (3x) ===')
for (let i = 0; i < 3; i++) {
  const msgs = buildAlienNpcPrompt(daniel, lunchScene, [{ role: 'npc', text: lunchScene.line }], '__SUGGESTIONS_ONLY__', {}, false, 'en', false)
  const res = await callLLM(seedPatch(msgs, lunchScene))
  latencies.lunchT1.push(res.latencyMs)
  const p = parseJson(res.text)
  lines.push(`\nRun ${i+1} (${res.latencyMs}ms):`)
  if (p?.suggestedReplies) p.suggestedReplies.forEach((r, j) => lines.push(`  [${j}] "${r.line}"  style=${r.style}`))
  else lines.push(`  RAW: ${res.text.slice(0, 300)}`)
}

// ── Lunch Turn 2 (3x) ──────────────────────────────────────────────────────
lines.push('\n\n=== LUNCH — Turn 2 (3x) ===')
for (let i = 0; i < 3; i++) {
  const msgs = buildAlienNpcPrompt(daniel, lunchScene, lunchTurn2History, "I hear you, but maybe he genuinely didn't know.", {}, false, 'en', false)
  const res = await callLLM(msgs)
  latencies.lunchT2.push(res.latencyMs)
  const p = parseJson(res.text)
  lines.push(`\nRun ${i+1} (${res.latencyMs}ms):`)
  if (p?.suggestedReplies) {
    p.suggestedReplies.forEach((r, j) => lines.push(`  [${j}] "${r.line}"  style=${r.style}`))
    lines.push(`  NPC: "${p.npcResponse}"  moodShift=${p.moodShift}`)
  } else lines.push(`  RAW: ${res.text.slice(0, 300)}`)
}

// ── Perspective Turn 1 (3x) ────────────────────────────────────────────────
lines.push('\n\n=== PERSPECTIVE (Evan POV + dual-truth) — Turn 1 (3x) ===')
for (let i = 0; i < 3; i++) {
  const msgs = buildAlienNpcPrompt(evan, perspectiveScene, [{ role: 'npc', text: perspectiveScene.line }], '__SUGGESTIONS_ONLY__', {}, true, 'en', false)
  const res = await callLLM(seedPatch(msgs, perspectiveScene))
  latencies.persp.push(res.latencyMs)
  const p = parseJson(res.text)
  lines.push(`\nRun ${i+1} (${res.latencyMs}ms):`)
  if (p?.suggestedReplies) p.suggestedReplies.forEach((r, j) => lines.push(`  [${j}] "${r.line}"  style=${r.style}`))
  else lines.push(`  RAW: ${res.text.slice(0, 300)}`)
}

// ── doesNotKnow constraint probe ───────────────────────────────────────────
lines.push('\n\n=== doesNotKnow CONSTRAINT PROBE ===')
lines.push(`Asking Daniel: "Did Evan have a deadline pressure that night?"`)
const cMsgs = buildAlienNpcPrompt(daniel, lunchScene, [{ role: 'npc', text: lunchScene.line }], 'Did Evan have a deadline pressure that night with those slides?', {}, false, 'en', true)
const cRes = await callLLM(cMsgs)
const cP = parseJson(cRes.text)
lines.push(`Response (${cRes.latencyMs}ms): "${cP?.npcResponse ?? cRes.text.slice(0, 300)}"`)

// ── Latency summary ────────────────────────────────────────────────────────
const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0
lines.push('\n\n=== LATENCY SUMMARY ===')
lines.push(`Lunch Turn 1: avg ${avg(latencies.lunchT1)}ms  (${latencies.lunchT1.join(', ')}ms)`)
lines.push(`Lunch Turn 2: avg ${avg(latencies.lunchT2)}ms  (${latencies.lunchT2.join(', ')}ms)`)
lines.push(`Perspective:  avg ${avg(latencies.persp)}ms  (${latencies.persp.join(', ')}ms)`)
lines.push(`Overall avg:  ${avg([...latencies.lunchT1, ...latencies.lunchT2, ...latencies.persp])}ms`)

const out = lines.join('\n')
console.log(out)
writeFileSync('./debug-unified-results.txt', out, 'utf8')
console.log('\n\nSaved to debug-unified-results.txt')
