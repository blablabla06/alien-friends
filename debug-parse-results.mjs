/**
 * Parse the raw results from debug-unified-results.txt and debug-parallel output
 * by re-running with correct JSON parsing (unwrap server envelope).
 */
import { readFileSync, writeFileSync } from 'fs'
import { buildAlienNpcPrompt } from './src/lib/aiCharacterPrompt.js'

const daniel = JSON.parse(readFileSync('./src/data/alien-characters/daniel.json', 'utf8'))
const evan   = JSON.parse(readFileSync('./src/data/alien-characters/evan.json',   'utf8'))

const lunchScene = {
  id: 'lunch', level: 'Chapter 2', subtitle: 'A colleague who felt left out',
  narration: 'Daniel mentions that Evan skipped lunch with the group again — but did anyone actually tell him?',
  line: 'He never joins us. It is like he does not want to be part of the team.',
  speaker: 'daniel', perspective: false,
}
const perspScene = {
  id: 'perspective', level: 'Chapter 5', subtitle: "Replaying the slide edit from Evan's POV",
  narration: "The player re-experiences the slide-edit moment from inside Evan's head.",
  line: 'I saw the error at 11 PM. The meeting was at 9 AM. I fixed it.',
  speaker: 'evan', perspective: true,
}
const histT2 = [
  { role: 'npc',  text: lunchScene.line },
  { role: 'user', text: 'Did anyone actually tell him where we were going today?' },
  { role: 'npc',  text: 'We always go at noon — he knows that. He just chooses not to come.' },
]

const API = 'http://localhost:3001/api/chat'

async function call(messages) {
  const t0 = Date.now()
  const res = await fetch(API, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({messages}) })
  const ms = Date.now() - t0
  // Server returns { ok, text } where text is the raw LLM string
  const envelope = await res.json()
  const raw = envelope.text ?? JSON.stringify(envelope)
  // Parse the inner JSON from the LLM
  const m = raw.match(/\{[\s\S]*\}/)
  let parsed = null
  if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
  return { ms, raw, parsed }
}

function patch(msgs, line) {
  return msgs.map((m,i) => i === msgs.length-1
    ? { ...m, content: `The NPC just said: "${line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
    : m)
}

const builds = [
  // Lunch T1 x3
  patch(buildAlienNpcPrompt(daniel,lunchScene,[{role:'npc',text:lunchScene.line}],'__SUGGESTIONS_ONLY__',{},false,'en',false), lunchScene.line),
  patch(buildAlienNpcPrompt(daniel,lunchScene,[{role:'npc',text:lunchScene.line}],'__SUGGESTIONS_ONLY__',{},false,'en',false), lunchScene.line),
  patch(buildAlienNpcPrompt(daniel,lunchScene,[{role:'npc',text:lunchScene.line}],'__SUGGESTIONS_ONLY__',{},false,'en',false), lunchScene.line),
  // Lunch T2 x3
  buildAlienNpcPrompt(daniel,lunchScene,histT2,"I hear you, but maybe he genuinely didn't know.",{},false,'en',false),
  buildAlienNpcPrompt(daniel,lunchScene,histT2,"I hear you, but maybe he genuinely didn't know.",{},false,'en',false),
  buildAlienNpcPrompt(daniel,lunchScene,histT2,"I hear you, but maybe he genuinely didn't know.",{},false,'en',false),
  // Perspective T1 x3
  patch(buildAlienNpcPrompt(evan,perspScene,[{role:'npc',text:perspScene.line}],'__SUGGESTIONS_ONLY__',{},true,'en',false), perspScene.line),
  patch(buildAlienNpcPrompt(evan,perspScene,[{role:'npc',text:perspScene.line}],'__SUGGESTIONS_ONLY__',{},true,'en',false), perspScene.line),
  patch(buildAlienNpcPrompt(evan,perspScene,[{role:'npc',text:perspScene.line}],'__SUGGESTIONS_ONLY__',{},true,'en',false), perspScene.line),
  // Constraint probe (isFinalTurn=true)
  buildAlienNpcPrompt(daniel,lunchScene,[{role:'npc',text:lunchScene.line}],'Did Evan have a deadline pressure that night with those slides?',{},false,'en',true),
]

const results = await Promise.all(builds.map(call))

const lines = []
lines.push('=== LUNCH — Turn 1 (3x, unified lean prompt) ===')
for (let i=0;i<3;i++) {
  const {ms,parsed} = results[i]
  lines.push(`Run ${i+1} (${ms}ms):`)
  if (parsed?.suggestedReplies) parsed.suggestedReplies.forEach((r,j) => lines.push(`  [${j}] "${r.line}"  [${r.style}]`))
  else lines.push(`  No suggestedReplies. raw=${results[i].raw.slice(0,200)}`)
}

lines.push('\n=== LUNCH — Turn 2 (3x) ===')
for (let i=3;i<6;i++) {
  const {ms,parsed} = results[i]
  lines.push(`Run ${i-2} (${ms}ms):`)
  if (parsed?.suggestedReplies) {
    parsed.suggestedReplies.forEach((r,j) => lines.push(`  [${j}] "${r.line}"  [${r.style}]`))
    lines.push(`  NPC: "${parsed.npcResponse}"  moodShift=${parsed.moodShift}`)
  } else if (parsed?.npcResponse) {
    lines.push(`  [!] Got only npcResponse, no suggestedReplies: "${parsed.npcResponse}"`)
  } else {
    lines.push(`  raw: ${results[i].raw.slice(0,200)}`)
  }
}

lines.push('\n=== PERSPECTIVE — Turn 1 (3x, Evan POV + dual-truth) ===')
for (let i=6;i<9;i++) {
  const {ms,parsed} = results[i]
  lines.push(`Run ${i-5} (${ms}ms):`)
  if (parsed?.suggestedReplies) parsed.suggestedReplies.forEach((r,j) => lines.push(`  [${j}] "${r.line}"  [${r.style}]`))
  else lines.push(`  raw: ${results[i].raw.slice(0,200)}`)
}

lines.push('\n=== doesNotKnow CONSTRAINT PROBE ===')
lines.push(`Asked Daniel: "Did Evan have a deadline pressure that night with those slides?"`)
const {ms,parsed} = results[9]
lines.push(`Response (${ms}ms): "${parsed?.npcResponse ?? results[9].raw.slice(0,300)}"`)

const allMs = results.map(r=>r.ms)
lines.push('\n=== LATENCY SUMMARY ===')
lines.push(`Avg: ${Math.round(allMs.reduce((s,v)=>s+v,0)/allMs.length)}ms  Max: ${Math.max(...allMs)}ms  Min: ${Math.min(...allMs)}ms`)
lines.push(`All: ${allMs.join(', ')}ms`)

const out = lines.join('\n')
console.log(out)
writeFileSync('./debug-unified-results.txt', out, 'utf8')
console.log('\nSaved to debug-unified-results.txt')
