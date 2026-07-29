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
 * @param {'en'|'zh'} lang                - output language for the feedback field
 * @returns {{ role, content }[]}
 */
function buildScoringPrompt(userText, character, conversationContext, lang = 'en') {
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join('\n  - ')
  const coolerTriggers = (character.emotionalState?.triggers?.cooler ?? []).join('\n  - ')
  const personality    = (character.personalityTraits ?? []).join(', ')
  const baseline       = character.emotionalState?.baseline ?? ''

  // Only include the last 4 turns so the prompt stays compact
  const recentHistory = (conversationContext ?? [])
    .slice(-4)
    .map(e => `${e.role === 'user' ? 'Player' : character.name}: ${e.text}`)
    .join('\n')

  const feedbackLangNote = lang === 'zh'
    ? `## Language for "feedback" field
Write the "feedback" string in Simplified Chinese (简体中文). Keep it natural and direct — one sentence, max 25 Chinese characters.`
    : `## Language for "feedback" field
Write the "feedback" string in English. One sentence, max 20 words.`

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

${feedbackLangNote}
Good example (EN): "Offering to sit together rather than advising hit the 'concrete small help' trigger well."
Good example (ZH): "主动提出一起坐下来而非给建议，精准触发了"具体小帮助"的暖化条件。"
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

function parseScoringJson(raw) {
  let text = raw.trim()
  text = text.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/, '').trim()

  const firstBrace = text.indexOf('{')
  const lastBrace  = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1)
  }

  try {
    return JSON.parse(text)
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

function heuristicScore(userText, lang = 'en') {
  const words = userText.trim().split(/\s+/).length
  const lengthScore  = words < 3 ? 40 : words > 50 ? 60 : 80
  const slangPenalty = countMatches(userText, CLARITY_PENALTIES) * 15
  const clarity      = clamp(lengthScore - slangPenalty)
  const politeness   = clamp(40 + countMatches(userText, POLITENESS_SIGNALS) * 20)
  const empathy      = clamp(30 + countMatches(userText, EMPATHY_SIGNALS) * 20)
  const expression   = clamp(30 + countMatches(userText, EXPRESSION_SIGNALS) * 20)
  const composite    = Math.round(clarity * 0.30 + empathy * 0.30 + politeness * 0.20 + expression * 0.20)
  const feedback     = lang === 'zh' ? '离线评分 — LLM 暂不可用。' : 'Scored offline — LLM unavailable.'
  return { clarity, politeness, empathy, expression, composite, feedback }
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
 * @param {'en'|'zh'} [lang]            - language for feedback field
 */
export async function scoreResponse(userText, character, conversationContext = [], weights = DEFAULT_WEIGHTS, lang = 'en') {
  if (!userText?.trim()) {
    const empty = lang === 'zh' ? '没有消息可评分。' : 'No message to score.'
    return { clarity: 0, politeness: 0, empathy: 0, expression: 0, composite: 0, feedback: empty }
  }

  const messages = buildScoringPrompt(userText, character, conversationContext, lang)

  let result
  try {
    result = await callLLM(messages)
  } catch {
    return heuristicScore(userText, lang)
  }

  if (!result.ok) {
    console.warn('[scoringEngine] LLM call failed, using heuristic fallback:', result.error)
    return heuristicScore(userText, lang)
  }

  const parsed = parseScoringJson(result.text)

  if (!parsed || typeof parsed.composite !== 'number') {
    console.warn('[scoringEngine] Malformed JSON from LLM, using heuristic fallback. Raw:', result.text)
    return heuristicScore(userText, lang)
  }

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

// ─── alien game scoring ───────────────────────────────────────────────────────

/**
 * Build the scoring prompt for the "Alien, Apparently" main game.
 *
 * Scoring dimensions match the game's visible meters:
 *   clarity    — separates facts from assumptions; asks precise questions
 *   respect    — avoids identity attacks; keeps feedback behaviour-specific
 *   awareness  — recognises missing context; holds dual truths simultaneously
 *   boundary   — proposes concrete rules; acknowledges impact without excusing it
 *
 * Extra rule: if the player's message tries to elicit something in the
 * character's doesNotKnow list, awareness score is penalised (the player
 * should know the character can't answer that).
 *
 * @param {string}    userText
 * @param {object}    character          - alien-characters JSON
 * @param {object}    sceneContext       - { level, title, narration, fact?, assumption? }
 * @param {Array}     conversationContext - recent [{role, text}]
 * @param {'en'|'zh'} lang
 * @returns {{ role, content }[]}
 */
function buildAlienScoringPrompt(userText, character, sceneContext, conversationContext, lang = 'en') {
  const personality   = (character.personalityTraits ?? []).join(', ')
  const baseline      = character.emotionalState?.baseline ?? ''
  const worsensIf     = (character.emotionalState?.triggers?.worsensIf ?? []).map(t => `  - ${t}`).join('\n')
  const improvesIf    = (character.emotionalState?.triggers?.improvesIf ?? []).map(t => `  - ${t}`).join('\n')
  const forbiddenList = (character.doesNotKnow ?? []).map(f => `  - ${f}`).join('\n')

  const recentHistory = (conversationContext ?? [])
    .slice(-4)
    .map(e => `${e.role === 'user' ? 'Player' : character.name}: ${e.text}`)
    .join('\n')

  const sceneBlock = [
    sceneContext.level    && `Chapter: ${sceneContext.level}`,
    sceneContext.narration && `Situation: ${sceneContext.narration}`,
    sceneContext.fact      && `Observed fact: ${sceneContext.fact}`,
    sceneContext.assumption && `Group assumption (unverified): ${sceneContext.assumption}`,
  ].filter(Boolean).join('\n')

  const feedbackLang = lang === 'zh'
    ? `Write the "feedback" string in Simplified Chinese (简体中文). One sentence, max 25 Chinese characters. Specific and actionable.`
    : `Write the "feedback" string in English. One sentence, max 20 words. Specific and actionable.`

  const system = `You are a social-skills coaching judge for "Alien, Apparently," a game about group bias and relational intelligence.
Score a single player message across four dimensions. Respond with valid JSON only — no markdown, no text outside the JSON.

## Character the player is addressing: ${character.name}
Personality: ${personality}
Emotional baseline: ${baseline}

## What helps this character (improvesIf — raises awareness/boundary scores if matched):
${improvesIf}

## What worsens things (worsensIf — lowers respect/awareness scores if matched):
${worsensIf}

## Scene context
${sceneBlock}

## Forbidden knowledge for ${character.name}
${forbiddenList}

ELICITATION PENALTY: If the player's message attempts to draw out, confirm, or imply anything in the forbidden knowledge list above, reduce "awareness" by 10–20 points. The player should know the character cannot answer that.

## Scoring dimensions (each 0–100)
- clarity    : Does the player separate observed facts from assumptions? Do they ask precise questions rather than making accusations? Penalise vague, rambling, or rumour-repeating messages.
- respect    : Is the message behaviour-specific rather than identity-attacking? Penalise personal labels ("he is weird/arrogant/alien"), generalisations, humiliation, or dismissal of a character's real feelings.
- awareness  : Does the player show they understand there may be missing context on both sides? Do they hold dual truths? Apply ELICITATION PENALTY if they try to extract forbidden knowledge. Penalise messages that blindly side with or against any character without acknowledging the other side.
- boundary   : Does the player propose or support a concrete, workable rule? Do they acknowledge real impact without erasing accountability? Penalise messages that either fully excuse or fully condemn without actionable follow-through.

## composite
Compute as: round(clarity*0.28 + respect*0.24 + awareness*0.28 + boundary*0.20)

## ${feedbackLang}

Respond with exactly this JSON shape (no extra keys):
{
  "clarity":    <integer 0-100>,
  "respect":    <integer 0-100>,
  "awareness":  <integer 0-100>,
  "boundary":   <integer 0-100>,
  "composite":  <integer 0-100>,
  "feedback":   "<string>"
}`

  return [
    { role: 'system', content: system },
    ...(recentHistory
      ? [{ role: 'user', content: `## Recent conversation\n${recentHistory}` }]
      : []
    ),
    { role: 'user', content: `## Message to score\n"${userText}"\n\nReturn the JSON score object now.` },
  ]
}

// ─── alien heuristic fallback ─────────────────────────────────────────────────

const FACT_SIGNALS      = ['what exactly','did anyone','what happened','can we check','original','evidence','source','actually said','the figures','inconsistent','directly']
const IDENTITY_ATTACKS  = ['weird','alien','creepy','arrogant','useless','kick','remove','always','never','that kind of person','just like','obviously','clearly']
const BOUNDARY_SIGNALS  = ['next time','rule','agree','notify','message','tell','before changing','both','separate','two issues','process','going forward']
const AWARENESS_SIGNALS = ['missing context','both sides','also','understand','his perspective','her perspective','what she knew','what he knew','didn\'t know','wasn\'t invited','why he','why she']

function heuristicAlienScore(userText, lang = 'en') {
  const lower    = userText.toLowerCase()
  const words    = userText.trim().split(/\s+/).length
  const baseLen  = words < 3 ? 40 : words > 60 ? 65 : 75

  const hasAttack   = IDENTITY_ATTACKS.some(s => lower.includes(s))
  const factBonus   = Math.min(countMatches(userText, FACT_SIGNALS)    * 12, 24)
  const boundBonus  = Math.min(countMatches(userText, BOUNDARY_SIGNALS) * 15, 30)
  const awareBonus  = Math.min(countMatches(userText, AWARENESS_SIGNALS) * 15, 30)

  const clarity    = clamp(baseLen + factBonus - (hasAttack ? 10 : 0))
  const respect    = clamp(hasAttack ? 30 : baseLen + 5)
  const awareness  = clamp(baseLen + awareBonus - (hasAttack ? 15 : 0))
  const boundary   = clamp(35 + boundBonus)
  const composite  = Math.round(clarity * 0.28 + respect * 0.24 + awareness * 0.28 + boundary * 0.20)
  const feedback   = lang === 'zh' ? '离线评分 — LLM 暂不可用。' : 'Scored offline — LLM unavailable.'

  return { clarity, respect, awareness, boundary, composite, feedback }
}

// ─── alien dimension weights ──────────────────────────────────────────────────

export const ALIEN_WEIGHTS = {
  clarity:   0.28,
  respect:   0.24,
  awareness: 0.28,
  boundary:  0.20,
}

/**
 * Score a player's message using the alien-game dimensions:
 * clarity, respect, awareness, boundary.
 *
 * Falls back to fast heuristics if the LLM is unavailable.
 *
 * @param {string}      userText
 * @param {object}      character           - alien-characters JSON
 * @param {object}      sceneContext        - { level, narration, fact?, assumption? }
 * @param {Array}       conversationContext - recent [{role, text}]
 * @param {'en'|'zh'}   [lang]
 * @param {AbortSignal} [signal]            - optional; if aborted, falls back to
 *   heuristic immediately rather than waiting for the LLM. All existing callers
 *   that don't pass a signal continue to work unchanged.
 * @returns {Promise<{clarity,respect,awareness,boundary,composite,feedback}>}
 */
export async function scoreAlienResponse(userText, character, sceneContext = {}, conversationContext = [], lang = 'en', signal) {
  if (!userText?.trim()) {
    const empty = lang === 'zh' ? '没有消息可评分。' : 'No message to score.'
    return { clarity: 0, respect: 0, awareness: 0, boundary: 0, composite: 0, feedback: empty }
  }

  if (signal?.aborted) return heuristicAlienScore(userText, lang)

  const messages = buildAlienScoringPrompt(userText, character, sceneContext, conversationContext, lang)

  let result
  try {
    result = await callLLM(messages, signal)
  } catch {
    return heuristicAlienScore(userText, lang)
  }

  // If the caller cancelled mid-flight, return heuristic silently
  if (signal?.aborted) return heuristicAlienScore(userText, lang)

  if (!result.ok) {
    console.warn('[scoringEngine] alien LLM call failed, using heuristic fallback:', result.error)
    return heuristicAlienScore(userText, lang)
  }

  const parsed = parseScoringJson(result.text)

  if (!parsed || typeof parsed.composite !== 'number') {
    console.warn('[scoringEngine] malformed alien score JSON, using heuristic fallback. Raw:', result.text)
    return heuristicAlienScore(userText, lang)
  }

  const clarity   = clamp(Math.round(parsed.clarity   ?? 50))
  const respect   = clamp(Math.round(parsed.respect   ?? 50))
  const awareness = clamp(Math.round(parsed.awareness ?? 50))
  const boundary  = clamp(Math.round(parsed.boundary  ?? 50))
  const composite = clamp(Math.round(
    clarity   * ALIEN_WEIGHTS.clarity   +
    respect   * ALIEN_WEIGHTS.respect   +
    awareness * ALIEN_WEIGHTS.awareness +
    boundary  * ALIEN_WEIGHTS.boundary
  ))

  return {
    clarity,
    respect,
    awareness,
    boundary,
    composite,
    feedback: typeof parsed.feedback === 'string' ? parsed.feedback : '',
  }
}

// ─── scenario-level aggregation ──────────────────────────────────────────────

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
