/**
 * aiCharacterPrompt.js
 *
 * Builds the full system prompt from a character's rich JSON data and
 * instructs the model to return a structured JSON response every turn.
 */

// ─── internal ────────────────────────────────────────────────────────────────

function assembleSystemPrompt(character, scenario) {
  const traits    = character.personalityTraits?.join(', ') ?? ''
  const tone      = character.communicationStyle?.tone ?? ''
  const verbosity = character.communicationStyle?.verbosity ?? ''
  const quirks    = (character.communicationStyle?.quirks ?? []).join('; ')
  const baseline  = character.emotionalState?.baseline ?? ''
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join(', ')
  const coolerTriggers = (character.emotionalState?.triggers?.cooler ?? []).join(', ')
  const neverDo   = (character.dialogueRules?.neverDo ?? []).join('; ')

  return `You are roleplaying as ${character.name} in a social skills training game.

## Your character
- Personality: ${traits}
- Communication tone: ${tone}
- Verbosity: ${verbosity}
- Quirks: ${quirks}
- Current emotional baseline: ${baseline}

## What makes you open up (warmer)
${warmerTriggers}

## What makes you shut down (cooler)
${coolerTriggers}

## Hard rules — never do these
${neverDo}

## Setting
${scenario.locationRef}
${scenario.setup}

## Goal of this conversation (for the player)
${scenario.successCondition}

## Response format — CRITICAL
You must ALWAYS respond with valid JSON and nothing else:
{
  "npcResponse": "<your in-character reply, 1-3 sentences, natural spoken language>",
  "suggestedReplies": [
    { "text": "<option 1>", "style": "${scenario.suggestedReplyStyles?.[0] ?? 'neutral'}" },
    { "text": "<option 2>", "style": "${scenario.suggestedReplyStyles?.[1] ?? 'neutral'}" },
    { "text": "<option 3>", "style": "${scenario.suggestedReplyStyles?.[2] ?? 'neutral'}" }
  ],
  "moodShift": "warmer" | "cooler" | "neutral"
}

Stay completely in character. Do not break the fourth wall. Do not explain your reasoning outside the JSON.`
}

// ─── normal turn prompt ───────────────────────────────────────────────────────

/**
 * Build the messages array to send to the LLM for one NPC turn.
 *
 * @param {object} character       - full character JSON
 * @param {object} scenario        - full scenario JSON
 * @param {Array}  dialogueHistory - [{ role:'user'|'npc', text }]
 * @param {string} userInput       - the player's latest message
 * @returns {{ role, content }[]}  - messages array ready for callLLM()
 */
/**
 * Inject a reveal-condition hint into the system prompt when the live
 * composite score satisfies a character's revealConditions threshold.
 * This ensures the NPC naturally discloses locked information at the right moment.
 *
 * @param {object} character
 * @param {number} compositeScore  - current running composite (0-100)
 * @returns {string}               - additional system text (empty string if no conditions met)
 */
function buildRevealHint(character, compositeScore) {
  const conditions = character.dialogueRules?.revealConditions ?? {}
  const triggered = []

  for (const [key, conditionText] of Object.entries(conditions)) {
    // Parse the numeric threshold from condition strings like "score > 60" or "composite score > 75"
    const match = conditionText.match(/score\s*>\s*(\d+)/i)
    if (match) {
      const threshold = parseInt(match[1], 10)
      if (compositeScore > threshold) {
        triggered.push(key)
      }
    }
  }

  if (!triggered.length) return ''

  // Map condition keys to the corresponding "doNotRevealUntil" secrets
  const secrets = character.dialogueRules?.doNotRevealUntil ?? []
  const secretMap = {
    behindOnWork: secrets[0] ?? '',
    homeStress:   secrets[1] ?? '',
  }

  const revealLines = triggered
    .map(k => secretMap[k] ? `- You may now hint at or reveal: "${secretMap[k]}"` : null)
    .filter(Boolean)
    .join('\n')

  if (!revealLines) return ''

  return `\n\n## TRUST UNLOCKED — the player has earned some openness\nYou may now begin to let your guard down slightly in the following ways:\n${revealLines}\nDo this naturally and in-character — don't announce it, just let it slip through.`
}

export function buildCharacterPrompt(character, scenario, dialogueHistory, userInput, compositeScore = 0) {
  const revealHint = buildRevealHint(character, compositeScore)
  const system = assembleSystemPrompt(character, scenario) + revealHint
  const messages = [{ role: 'system', content: system }]

  for (const entry of dialogueHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  messages.push({ role: 'user', content: userInput })

  return messages
}

// ─── closing prompt ───────────────────────────────────────────────────────────

/**
 * Build the messages array for the final NPC closing line.
 * No suggestedReplies — the player does not respond to this.
 *
 * @param {object} character       - full character JSON
 * @param {object} scenario        - full scenario JSON
 * @param {Array}  dialogueHistory - full conversation so far
 * @param {'positive'|'negative'|'neutral'} outcome
 * @returns {{ role, content }[]}
 */
export function buildClosingPrompt(character, scenario, dialogueHistory, outcome) {
  const outcomeHint =
    outcome === 'positive'
      ? 'The conversation ended on a warm note — the player connected with you.'
      : outcome === 'negative'
      ? 'The conversation ended poorly — you remain closed off or uncomfortable.'
      : "The conversation ended inconclusively — some tension remains but it wasn't hostile."

  const system = `${assembleSystemPrompt(character, scenario)}

## THIS IS THE FINAL LINE OF THE CONVERSATION
${outcomeHint}
Write ONE short closing beat (1-2 sentences max) that naturally ends the encounter — e.g. the NPC physically leaving, a shift in body language, a brief parting word, or a quiet moment of resolution. This should feel like the scene fading out.

You must respond with valid JSON and nothing else:
{
  "npcResponse": "<closing line, 1-2 sentences, in-character>"
}

No suggestedReplies. No moodShift. Only npcResponse.`

  const messages = [{ role: 'system', content: system }]

  for (const entry of dialogueHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  return messages
}

// ─── on-demand suggestion prompt ─────────────────────────────────────────────

/**
 * Build a messages array that asks the LLM for 2-3 player reply suggestions
 * based on the current conversation state, WITHOUT generating an NPC response.
 * Used by the "Need a suggestion?" help button in DialogueScreen.
 *
 * @param {object} character       - full character JSON
 * @param {object} scenario        - full scenario JSON
 * @param {Array}  dialogueHistory - conversation so far (including latest NPC line)
 * @returns {{ role, content }[]}
 */
export function buildSuggestionOnlyPrompt(character, scenario, dialogueHistory) {
  const traits         = character.personalityTraits?.join(', ') ?? ''
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join(', ')
  const styles         = (scenario.suggestedReplyStyles ?? ['neutral', 'warm', 'direct']).join(', ')

  const system = `You are a coaching assistant for a social skills game called Alien Friends.
The player is in a conversation with ${character.name}, who has these traits: ${traits}.
What makes ${character.name} open up: ${warmerTriggers}.
The suggested reply styles for this scenario are: ${styles}.

Your job is to generate 2-3 short, natural reply options the player could say next.
Each option should be realistic spoken language (not formal), and aim to make ${character.name} feel heard.

Respond with valid JSON only — no other text:
{
  "suggestedReplies": [
    { "text": "<option 1>", "style": "<style label>" },
    { "text": "<option 2>", "style": "<style label>" },
    { "text": "<option 3>", "style": "<style label>" }
  ]
}`

  const messages = [{ role: 'system', content: system }]

  for (const entry of dialogueHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  // Explicit trigger so the model knows it should reply as the coach, not the NPC
  messages.push({ role: 'user', content: 'Please suggest 2-3 replies I could say next.' })

  return messages
}

// ─── epilogue prompt ──────────────────────────────────────────────────────────

/**
 * Build the messages array for a second-person narrated epilogue.
 * NOT from the NPC's voice — an omniscient narrator reflecting on what
 * just happened and what it might mean for the player.
 *
 * @param {object} character       - full character JSON
 * @param {object} scenario        - full scenario JSON
 * @param {Array}  dialogueHistory - complete conversation
 * @param {'positive'|'neutral'|'negative'} outcome
 * @returns {{ role, content }[]}
 */
export function buildEpiloguePrompt(character, scenario, dialogueHistory, outcome) {
  const outcomeGuide =
    outcome === 'positive'
      ? 'The connection genuinely improved. There was a moment of warmth or understanding. Reflect on what the player did well and what small shift happened.'
      : outcome === 'negative'
      ? 'The distance remained or widened. Things felt awkward or unresolved. Reflect honestly but gently — what made it hard, and what might be worth trying differently next time.'
      : 'The conversation was mixed — some connection, some friction, no clear breakthrough but no collapse either. Reflect on the tension between wanting to connect and not knowing how.'

  const system = `You are a warm, literary narrator for a social skills game called Alien Friends.
You are NOT the NPC. You are an observer writing a brief story epilogue after a conversation between the player and ${character.name}.

## The scenario
${scenario.title}: ${scenario.setup}

## Outcome
${outcomeGuide}

## Your task
Write a short epilogue (2–4 sentences, no more). Rules:
- Second person ("You…", "You notice…", "Something about…")
- Past or reflective present tense — this just happened
- Warm, literary, honest — like a short story ending
- Do NOT score, advise, or lecture. No "you should have…". Just observe and reflect.
- End on a note of quiet possibility, even if the conversation went badly — there's always another chance

Respond with valid JSON only:
{
  "epilogue": "<2-4 sentence narrated reflection>"
}`

  const messages = [{ role: 'system', content: system }]

  for (const entry of dialogueHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  messages.push({ role: 'user', content: 'Please write the epilogue now.' })

  return messages
}
