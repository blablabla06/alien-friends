/**
 * debug-ch4-ch5.mjs
 * Verify Chapter 4 (rumour/Mira sceneIndex=3) and Chapter 5 (perspective/Evan sceneIndex=4)
 * build valid prompts AND get real API responses — not fallback text.
 *
 * Run:  node debug-ch4-ch5.mjs
 */
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const miraJson     = require('./src/data/alien-characters/mira.json')
const evanFullJson = require('./src/data/alien-characters/evan-full.json')

// ── inline the scene definitions ────────────────────────────────────────────
const rumourScene = {
  id: 'rumour',
  level: 'Chapter 4: Rumour Mutation',
  title: 'Rumour Mutation',
  subtitle: 'Group chat, late night',
  speaker: 'mira',
  line: 'Daniel said Evan criticised him again. Honestly, it sounds like Evan thinks everyone is incompetent.',
  narration: 'The original sentence changes as it moves through the group. Emotion fills in the missing parts.',
  objective: 'Catch the mutation before it becomes the group belief.',
}

const perspectiveScene = {
  id: 'perspective',
  level: 'Chapter 5: Perspective Shift',
  title: 'Replay as Evan',
  subtitle: 'The same event, different information',
  speaker: 'evan',
  line: 'I saw the numbers were inconsistent. The deadline was tomorrow. I thought fixing it directly was better than waiting.',
  narration: 'From Evan\'s side, he was not invited to lunch, did not know Daniel rehearsed the old slide, and already expected the group to judge him.',
  objective: 'Understanding missing context does not erase impact. Decide what to ask next.',
  perspective: true,
}

// ── inline buildAlienNpcPrompt (simplified — just check it doesn't throw) ──
function buildAlienNpcPrompt(character, sceneContext, dialogueHistory, playerInput, gameState = {}, perspectiveShift = false, lang = 'en', isFinalTurn = false, sceneIndex = 0) {
  const traits     = (character.personalityTraits ?? []).join(', ')
  const tone       = character.communicationStyle?.tone ?? ''
  const tendencies = (character.communicationStyle?.tendencies ?? []).map(t => `  - ${t}`).join('\n')
  const baseline   = character.emotionalState?.baseline ?? ''
  const worsensIf  = (character.emotionalState?.triggers?.worsensIf ?? []).map(t => `  - ${t}`).join('\n')
  const improvesIf = (character.emotionalState?.triggers?.improvesIf ?? []).map(t => `  - ${t}`).join('\n')

  const SLIDES_SCENE_INDEX = 2
  const afterSlidesUnlocked = sceneIndex >= SLIDES_SCENE_INDEX
  const alwaysFacts      = character.knownFactsAlways ?? character.knownFacts ?? []
  const afterSlidesFacts = afterSlidesUnlocked ? (character.knownFactsAfterSlides ?? []) : []
  const knownFactsList = [...alwaysFacts, ...afterSlidesFacts].map(f => `  - ${f}`).join('\n')

  const forbiddenList = (character.doesNotKnow ?? []).map(f => `  - ${f}`).join('\n')
  const forbiddenBlock = forbiddenList
    ? `\n## What ${character.name} does NOT know\n${forbiddenList}\n`
    : ''

  const perspectiveBlock = perspectiveShift
    ? `\n## Speaking as Evan — dual-truth constraint\nReveal real context. Both truths must coexist.\n`
    : ''

  const sceneBlock = `\n## This scene\nChapter: ${sceneContext.level ?? ''}\nSituation: ${sceneContext.subtitle ?? ''}\n${sceneContext.narration ? `Context: ${sceneContext.narration}` : ''}`

  const system = `You are roleplaying as ${character.name}.
## Personality
${traits}
## Tone: ${tone}
## Tendencies:
${tendencies}
## Emotional baseline
${baseline}
## What makes ${character.name} more guarded
${worsensIf}
## What helps ${character.name} open up
${improvesIf}
## What ${character.name} knows
${knownFactsList}
${forbiddenBlock}${perspectiveBlock}${sceneBlock}
## Return ONLY valid JSON
{
  "suggestedReplies": [
    { "text": "...", "style": "warm" },
    { "text": "...", "style": "direct" },
    { "text": "...", "style": "cautious" }
  ],
  "npcAction": null,
  "npcResponse": "...",
  "moodShift": "neutral"
}`

  const messages = [{ role: 'system', content: system }]
  const recentHistory = (dialogueHistory ?? []).slice(-4)
  for (const entry of recentHistory) {
    messages.push({ role: entry.role === 'user' ? 'user' : 'assistant', content: entry.text })
  }
  messages.push({ role: 'user', content: playerInput })
  return messages
}

// ── hidden state ─────────────────────────────────────────────────────────────
const hidden = { labelPower: 45, rumour: 55, tension: 50, evanTrust: 40 }

// ── test helper ───────────────────────────────────────────────────────────────
async function testScene(label, charJson, scene, sceneIndex, isPerspective) {
  console.log(`\n${'='.repeat(70)}`)
  console.log(`TESTING: ${label}`)
  console.log(`  char: ${charJson.name} | sceneIndex: ${sceneIndex} | perspective: ${isPerspective}`)

  let messages
  try {
    const seedHistory = [{ role: 'npc', text: scene.line }]
    messages = buildAlienNpcPrompt(
      charJson, scene, seedHistory, '__SUGGESTIONS_ONLY__', hidden, isPerspective, 'en', false, sceneIndex
    )
    console.log(`  ✅ buildAlienNpcPrompt: OK (${messages.length} messages, system prompt ${messages[0].content.length} chars)`)
  } catch (err) {
    console.error(`  ❌ buildAlienNpcPrompt THREW:`, err)
    return
  }

  // ── LEAK CHECK ─────────────────────────────────────────────────────────────
  const systemPrompt = messages[0].content
  const leakTerms = ['correction', 'without explanation', 'changes shared work']
  if (sceneIndex < 2) {
    for (const t of leakTerms) {
      if (systemPrompt.toLowerCase().includes(t.toLowerCase())) {
        console.warn(`  ⚠️  LEAK detected in prompt: "${t}"`)
      }
    }
  }

  // ── LIVE API CALL ──────────────────────────────────────────────────────────
  // Patch last user message to suggestions-only request
  const patchedMessages = messages.map((m, i) =>
    i === messages.length - 1
      ? { ...m, content: `The NPC just said: "${scene.line}"\nGenerate the three suggested replies the player could say next. Return ONLY the JSON with suggestedReplies — npcResponse should be an empty string "".` }
      : m
  )

  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: patchedMessages }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json()
    if (!data.ok) {
      console.error(`  ❌ Server error: ${data.error}`)
      return
    }
    console.log(`  ✅ API call: OK`)
    // Try to parse the JSON
    let text = data.text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last > first) text = text.slice(first, last + 1)
    text = text.replace(/,\s*([}\]])/g, '$1')

    let parsed
    try { parsed = JSON.parse(text) } catch (e) {
      console.error(`  ❌ JSON parse failed:`, e.message)
      console.log(`  Raw response (first 500 chars):\n${data.text.slice(0, 500)}`)
      return
    }

    const replies = parsed?.suggestedReplies ?? []
    console.log(`\n  SUGGESTED REPLIES for ${label}:`)
    if (replies.length === 0) {
      console.warn('  ⚠️  No suggestedReplies in parsed response!')
      console.log('  Full parsed:', JSON.stringify(parsed, null, 2))
    } else {
      for (const r of replies) {
        console.log(`    [${r.style}] "${r.text}"`)
      }
    }

    // Check for slides leaks
    const repliesStr = JSON.stringify(replies).toLowerCase()
    const leakWords = ['slide', 'correction', 'deadline', 'figure', 'changed', 'incompetent']
    if (sceneIndex === 1) { // lunch scene — these shouldn't appear
      for (const w of leakWords) {
        if (repliesStr.includes(w)) console.warn(`  ⚠️  Leak word "${w}" in replies!`)
      }
    }
  } catch (err) {
    console.error(`  ❌ fetch THREW:`, err.name, err.message)
  }
}

// ── also test handleTurn path with a real player message ──────────────────────
async function testHandleTurn(label, charJson, scene, sceneIndex, isPerspective) {
  console.log(`\n${'─'.repeat(70)}`)
  console.log(`HANDLE-TURN TEST: ${label} (player sends a real message)`)

  const seedHistory = [{ role: 'npc', text: scene.line }]
  const playerText = isPerspective
    ? 'Why didn\'t you ask Daniel first before changing the slide?'
    : 'Can you tell me what actually happened — in your own words?'

  let messages
  try {
    messages = buildAlienNpcPrompt(
      charJson, scene, seedHistory, playerText, hidden, isPerspective, 'en', false, sceneIndex
    )
    console.log(`  ✅ buildAlienNpcPrompt: OK`)
  } catch (err) {
    console.error(`  ❌ buildAlienNpcPrompt THREW:`, err)
    return
  }

  try {
    const res = await fetch('http://localhost:3001/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: AbortSignal.timeout(25_000),
    })
    const data = await res.json()
    if (!data.ok) {
      console.error(`  ❌ Server error: ${data.error}`)
      return
    }
    let text = data.text.trim()
      .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()
    const first = text.indexOf('{'), last = text.lastIndexOf('}')
    if (first !== -1 && last > first) text = text.slice(first, last + 1)
    text = text.replace(/,\s*([}\]])/g, '$1')
    let parsed
    try { parsed = JSON.parse(text) } catch (e) {
      console.error(`  ❌ JSON parse failed:`, e.message, '\n  Raw:', data.text.slice(0, 300))
      return
    }
    console.log(`  ✅ NPC response: "${parsed?.npcResponse ?? '(empty!)'}"`)
    if (parsed?.suggestedReplies?.length) {
      console.log(`  Next suggestions:`)
      for (const r of parsed.suggestedReplies) console.log(`    [${r.style}] "${r.text}"`)
    }
  } catch (err) {
    console.error(`  ❌ fetch THREW:`, err.name, err.message)
  }
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
console.log('Chapter 4 & 5 Diagnostic — checking prompt build + live API')
console.log('Server must be running on http://localhost:3001\n')

// Chapter 4: Mira/rumour, sceneIndex=3 (>= SLIDES_SCENE_INDEX=2, so afterSlidesFacts unlocked)
await testScene('Chapter 4 — Mira (rumour)', miraJson, rumourScene, 3, false)
await testHandleTurn('Chapter 4 — Mira (rumour)', miraJson, rumourScene, 3, false)

// Chapter 5: Evan/perspective, sceneIndex=4
await testScene('Chapter 5 — Evan (perspective)', evanFullJson, perspectiveScene, 4, true)
await testHandleTurn('Chapter 5 — Evan (perspective)', evanFullJson, perspectiveScene, 4, true)

console.log('\n\n=== DIAGNOSTIC COMPLETE ===')
