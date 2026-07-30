/**
 * debug-batch1.mjs — Lunch scene 3x Turn 1
 */
import { readFileSync, writeFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))
const lunchScene = {
  id: 'lunch', level: 'Chapter 2',
  subtitle: 'A colleague who felt left out',
  narration: 'Daniel mentions that Evan skipped lunch with the group again — but did anyone actually tell him?',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  speaker: 'daniel', perspective: false,
}
const API_URL = 'http://localhost:3001/api/chat'
async function callLLM(messages) {
  const t0 = Date.now()
  const res = await fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages }) })
  const latencyMs = Date.now() - t0
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content ?? data.content ?? JSON.stringify(data)
  return { latencyMs, text }
}
function parseJson(t) { const m = t.match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]) } catch { return null } }
function seedPatch(msgs, line) {
  return msgs.map((m, i) => i === msgs.length - 1 ? { ...m, content: `The NPC just said: "${line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` } : m)
}

const lines = ['=== LUNCH — Turn 1 (3x) ===']
for (let i = 0; i < 3; i++) {
  const msgs = buildAlienNpcPrompt(daniel, lunchScene, [{ role: 'npc', text: lunchScene.line }], '__SUGGESTIONS_ONLY__', {}, false, 'en', false)
  const res = await callLLM(seedPatch(msgs, lunchScene.line))
  const p = parseJson(res.text)
  lines.push(`\nRun ${i+1} (${res.latencyMs}ms):`)
  if (p?.suggestedReplies) p.suggestedReplies.forEach((r, j) => lines.push(`  [${j}] "${r.line}"`))
  else lines.push(`  RAW: ${res.text.slice(0, 300)}`)
}
const out = lines.join('\n')
console.log(out)
writeFileSync('./debug-batch1-results.txt', out, 'utf8')
