/**
 * scoringEngine.js
 *
 * LLM-based scoring of a player's message.
 * Returns:
 *   {
 *     clarity:    0-100,
 *     politeness: 0-100,
 *     empathy:    0-100,
 *     expression: 0-100,
 *     composite:  0-100,   // weighted average (see WEIGHTS)
 *     feedback:   string,  // short, specific, actionable note
 *   }
 *
 * Weights are exported so callers can override them for specific scenarios.
 */

import { callLLM } from './llmClient.js'

// ─── configurable weights ────────────────────────────────────────────────────

/** Default dimension weights — clarity and empathy are slightly heavier. */
export const DEFAULT_WEIGHTS = {
  clarity:    0.30,
  empathy:    0.30,
  politeness: 0.20,
  expression: 0.20,
}

// ─── prompt builder ──────────────────────────────────────────────────────────

/**
 * Build the messages array for the scoring LLM call.
 *
 * @param {string}   userText              - the player's message to score
 * @param {object}   character             - full character JSON
 * @param {Array}    conversationContext   - recent dialogue history [{role, text}]
 * @returns {{ role, content }[]}
 */
function buildScoringPrompt(userText, character, conversationContext) {
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join('\n  - ')
  const coolerTriggers = (character.emotionalState?.triggers?.cooler ?? []).join('\n  - ')
  const personality    = (character.personalityTraits ?? []).join(', ')
  const baseline       = character.emotionalState?.baseline ?? ''

  // Only include the last 4 turns so the prompt stays compact
  const recentHistory = (conversationContext ?? [])
    .slice(-4)
    .map(e => `${e.role === 'user' ? 'Player' : character.name}: ${e.text}`)
    .join('\n')

  const system = `You are a social-skills coaching judge for a game called Alien Friends.
Your job is to score a single player message in the context of a conversation with a specific character.
You must respond with valid JSON only — no markdown, no explanation outside the JSON.

## Character you are evaluating against
Name: ${character.name}
Personality: ${personality}
Emotional baseline: ${baseline}

## What makes this character open up (warmer triggers — these raise empathy score if matched):
  - ${warmerTriggers}

## What makes this character shut down (cooler triggers — these lower empathy score if matched):
  - ${coolerTriggers}

## Scoring dimensions (each 0–100)
- clarity     : Is the message clear and well-formed? Penalise vague, rambling, or incoherent text.
- politeness  : Is the tone respectful and considerate? Penalise dismissive, condescending, or blunt text.
- empathy     : Does the message show genuine understanding of the character's emotional state?
                CRITICAL: check whether it matches a warmer trigger (+) or a cooler trigger (−).
                A response that directly matches a cooler trigger should score ≤ 40.
                A response that matches a warmer trigger should score ≥ 65.
- expression  : Does the player express their own feelings/perspective openly and authentically?

## composite
Compute as a weighted average:
  composite = round(clarity*0.30 + empathy*0.30 + politeness*0.20 + expression*0.20)

## feedback
Write ONE sentence (max 20 words). Be specific and actionable — name exactly what worked or what missed.
Good example: "Offering to sit together rather than advising hit the 'concrete small help' trigger well."
Bad example: "Good job on showing empathy!"

Respond with exactly this JSON shape (no extra keys, no trailing commas):
{
  "clarity":    <integer 0-100>,
  "politeness": <integer 0-100>,
  "empathy":    <integer 0-100>,
  "expression": <integer 0-100>,
  "composite":  <integer 0-100>,
  "feedback":   "<string>"
}`

  const messages = [
    { role: 'system', content: system },
    ...(recentHistory
      ? [{ role: 'user', content: `## Recent conversation\n${recentHistory}` }]
      : []
    ),
    { role: 'user', content: `## Message to score\n"${userText}"\n\nPlease return the JSON score object now.` },
  ]

  return messages
}

// ─── JSON parser with retry ───────────────────────────────────────────────────

/**
 * Parse the LLM's JSON response, stripping markdown fences if present.
 * Returns null if parsing fails after cleanup.
 *
 * @param {string} raw
 * @returns {object|null}
 */
function parseScoringJson(raw) {
  // Strip ``` fences
  let text = raw.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

  // Some models wrap the JSON in an outer key — try to extract a bare {...}
  const firstBrace = text.indexOf('{')
  const lastBrace  = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  try {
    const obj = JSON.parse(text)
    return obj
  } catch {
    return null
  }
}

// ─── fallback (fast heuristic) ────────────────────────────────────────────────

const EMPATHY_SIGNALS   = ['understand','feel','sounds','that must','i can imagine','i hear you','makes sense','i get it','of course','no wonder','that\'s hard','must be','i\'m sorry','i know','i see']
const POLITENESS_SIGNALS = ['please','thank','thanks','appreciate','sorry','excuse me','would you','could you','would it be','if that\'s okay','no worries','of course','absolutely','sure']
const CLARITY_PENALTIES  = ['???','!!!!!','idk','lol','lmao','wtf','omg']
const EXPRESSION_SIGNALS = ['i feel','i think','i\'ve been','honestly','actually','i wanted to','i\'d like','it means','i appreciate','i\'m glad','i\'m sorry','i miss','i remember','i hope']

function countMatches(text, signals) {
  const lower = text.toLowerCase()
  return signals.filter(s => lower.includes(s)).length
}

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function heuristicScore(userText) {
  const words = userText.trim().split(/\s+/).length
  const lengthScore  = words < 3 ? 40 : words > 50 ? 60 : 80
  const slangPenalty = countMatches(userText, CLARITY_PENALTIES) * 15
  const clarity      = clamp(lengthScore - slangPenalty)
  const politeness   = clamp(40 + countMatches(userText, POLITENESS_SIGNALS) * 20)
  const empathy      = clamp(30 + countMatches(userText, EMPATHY_SIGNALS) * 20)
  const expression   = clamp(30 + countMatches(userText, EXPRESSION_SIGNALS) * 20)
  const composite    = Math.round(clarity * 0.30 + empathy * 0.30 + politeness * 0.20 + expression * 0.20)
  return { clarity, politeness, empathy, expression, composite, feedback: 'Scored offline — LLM unavailable.' }
}

// ─── main export ─────────────────────────────────────────────────────────────

/**
 * Score a player's message using the LLM as judge.
 * Falls back to fast heuristics if the LLM call fails or returns malformed JSON.
 *
 * @param {string} userText              - the player's message
 * @param {object} character             - full character JSON
 * @param {Array}  conversationContext   - recent dialogue history [{role, text}]
 * @param {object} [weights]             - optional override for dimension weights
 * @returns {Promise<{
 *   clarity: number,
 *   politeness: number,
 *   empathy: number,
 *   expression: number,
 *   composite: number,
 *   feedback: string,
 * }>}
 */
export async function scoreResponse(userText, character, conversationContext = [], weights = DEFAULT_WEIGHTS) {
  if (!userText?.trim()) {
    return { clarity: 0, politeness: 0, empathy: 0, expression: 0, composite: 0, feedback: 'No message to score.' }
  }

  const messages = buildScoringPrompt(userText, character, conversationContext)

  let result
  try {
    result = await callLLM(messages)
  } catch {
    return heuristicScore(userText)
  }

  if (!result.ok) {
    console.warn('[scoringEngine] LLM call failed, using heuristic fallback:', result.error)
    return heuristicScore(userText)
  }

  const parsed = parseScoringJson(result.text)

  if (!parsed || typeof parsed.composite !== 'number') {
    console.warn('[scoringEngine] Malformed JSON from LLM, using heuristic fallback. Raw:', result.text)
    return heuristicScore(userText)
  }

  // Re-compute composite from raw dimensions using our configurable weights,
  // in case the model drifted from the formula.
  const w = { ...DEFAULT_WEIGHTS, ...weights }
  const clarity    = clamp(Math.round(parsed.clarity    ?? 50))
  const politeness = clamp(Math.round(parsed.politeness ?? 50))
  const empathy    = clamp(Math.round(parsed.empathy    ?? 50))
  const expression = clamp(Math.round(parsed.expression ?? 50))
  const composite  = clamp(Math.round(
    clarity    * w.clarity    +
    politeness * w.politeness +
    empathy    * w.empathy    +
    expression * w.expression
  ))

  return {
    clarity,
    politeness,
    empathy,
    expression,
    composite,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  }
}

// ─── scenario-level aggregation ──────────────────────────────────────────────

/**
 * Compute overall scenario scores from a per-turn history array.
 * Returns the same shape as a single scoreResponse result, but averaged.
 *
 * @param {Array<{ clarity, politeness, empathy, expression, composite }>} history
 * @returns {{ clarity, politeness, empathy, expression, composite, feedback: string }}
 */
export function aggregateScores(history) {
  if (!history?.length) {
    return { clarity: 0, politeness: 0, empathy: 0, expression: 0, composite: 0, feedback: '' }
  }
  const sum = { clarity: 0, politeness: 0, empathy: 0, expression: 0, composite: 0 }
  for (const s of history) {
    sum.clarity    += s.clarity    ?? 0
    sum.politeness += s.politeness ?? 0
    sum.empathy    += s.empathy    ?? 0
    sum.expression += s.expression ?? 0
    sum.composite  += s.composite  ?? 0
  }
  const n = history.length
  return {
    clarity:    Math.round(sum.clarity    / n),
    politeness: Math.round(sum.politeness / n),
    empathy:    Math.round(sum.empathy    / n),
    expression: Math.round(sum.expression / n),
    composite:  Math.round(sum.composite  / n),
    feedback:   '',
  }
}
