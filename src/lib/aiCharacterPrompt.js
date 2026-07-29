/**
 * aiCharacterPrompt.js
 *
 * Builds the full system prompt from a character's rich JSON data and
 * instructs the model to return a structured JSON response every turn.
 */

// ─── internal ────────────────────────────────────────────────────────────────

const LANG_INSTRUCTIONS = {
  zh: `## Language
ALL of your output — npcResponse, suggestedReplies, and any other text fields — MUST be written in Simplified Chinese (简体中文). Do not use English in any field of your JSON response, even for style labels.`,
  en: `## Language
ALL of your output MUST be in English.`,
}

function langInstruction(lang) {
  return LANG_INSTRUCTIONS[lang] ?? LANG_INSTRUCTIONS.en
}

function assembleSystemPrompt(character, scenario, lang = 'en') {
  const traits    = character.personalityTraits?.join(', ') ?? ''
  const tone      = character.communicationStyle?.tone ?? ''
  const verbosity = character.communicationStyle?.verbosity ?? ''
  const quirks    = (character.communicationStyle?.quirks ?? []).join('; ')
  const baseline  = character.emotionalState?.baseline ?? ''
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join(', ')
  const coolerTriggers = (character.emotionalState?.triggers?.cooler ?? []).join(', ')
  const neverDo   = (character.dialogueRules?.neverDo ?? []).join('; ')
  const relationshipContext = character.relationshipContext ?? null

  const relationshipBlock = relationshipContext
    ? `\n## Relationship type — HARD CONSTRAINT\n${relationshipContext}\nCRITICAL: Do NOT generate romantic undertones, romantic tension, flirtation, or any language implying past or present romantic feelings between the player and ${character.name}. If the player uses warm or reconciliatory language, respond with platonic friendship warmth only — never romantic warmth.\n`
    : ''

  return `You are roleplaying as ${character.name} in a social skills training game.
${relationshipBlock}
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

${langInstruction(lang)}

## Response format — CRITICAL
You must ALWAYS respond with valid JSON and nothing else:
{
  "npcAction": "<optional: brief third-person narration of ${character.name}'s physical or emotional behaviour, e.g. 'Alex's mouth quirks into a half-smile.' — write null if there is no distinct action>",
  "npcResponse": "<ONLY the spoken dialogue — the exact words ${character.name} says, 1-3 sentences, natural spoken language. NO stage directions, NO third-person narration, NO action descriptions inside this field. If the character would naturally speak in two separate bursts with narration in between, merge them into one continuous spoken block.>",
  "suggestedReplies": [
    { "text": "<words the player says, first person, 8-15 words>", "style": "${scenario.suggestedReplyStyles?.[0] ?? 'neutral'}" },
    { "text": "<words the player says, first person, 8-15 words>", "style": "${scenario.suggestedReplyStyles?.[1] ?? 'neutral'}" },
    { "text": "<words the player says, first person, 8-15 words>", "style": "${scenario.suggestedReplyStyles?.[2] ?? 'neutral'}" }
  ],
  "moodShift": "warmer" | "cooler" | "neutral"
}

CRITICAL for npcResponse: it must contain ONLY the words ${character.name} actually speaks — no stage directions, no third-person narration, no text that would appear outside quotation marks in a novel. Put any physical/emotional action in npcAction instead.
- If ${character.name} pauses between two lines of dialogue, or any action beat occurs mid-speech, describe ALL of those action beats together in npcAction as one combined narration (e.g. "${character.name}'s mouth quirks into a half-smile. She pauses, then adds:") — never split action text across multiple places or leave any narration unquoted inside npcResponse.
CRITICAL — quote style: always wrap spoken dialogue in double quotes ("…"). Never use single quotes as dialogue delimiters. Single quotes are reserved exclusively for contractions within the text (don't, I'm, you're, it's, etc.).
CRITICAL for suggestedReplies: each option is what the PLAYER says — never the NPC.
- "text": the actual words the player would say, first person (e.g. "Yeah. You too.").
- Plain dialogue only — no brackets, stage directions, or action descriptions.

Stay completely in character. Do not break the fourth wall. Do not explain your reasoning outside the JSON.`
}

// ─── normal turn prompt ───────────────────────────────────────────────────────

/**
 * Inject a reveal-condition hint into the system prompt when the live
 * composite score satisfies a character's revealConditions threshold.
 */
function buildRevealHint(character, compositeScore) {
  const conditions = character.dialogueRules?.revealConditions ?? {}
  const triggered = []

  for (const [key, conditionText] of Object.entries(conditions)) {
    const match = conditionText.match(/score\s*>\s*(\d+)/i)
    if (match) {
      const threshold = parseInt(match[1], 10)
      if (compositeScore > threshold) {
        triggered.push(key)
      }
    }
  }

  if (!triggered.length) return ''

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

export function buildCharacterPrompt(character, scenario, dialogueHistory, userInput, compositeScore = 0, lang = 'en') {
  const revealHint = buildRevealHint(character, compositeScore)
  const system = assembleSystemPrompt(character, scenario, lang) + revealHint
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

export function buildClosingPrompt(character, scenario, dialogueHistory, outcome, lang = 'en') {
  const outcomeHint =
    outcome === 'positive'
      ? 'The conversation ended on a warm note — the player connected with you.'
      : outcome === 'negative'
      ? 'The conversation ended poorly — you remain closed off or uncomfortable.'
      : "The conversation ended inconclusively — some tension remains but it wasn't hostile."

  const system = `${assembleSystemPrompt(character, scenario, lang)}

## THIS IS THE FINAL LINE OF THE CONVERSATION
${outcomeHint}
Write ONE short closing beat (1-2 sentences max) that naturally ends the encounter — e.g. the NPC physically leaving, a shift in body language, a brief parting word, or a quiet moment of resolution. This should feel like the scene fading out.

You must respond with valid JSON and nothing else:
{
  "npcAction": "<optional: brief third-person narration of a physical or emotional beat, e.g. 'She gathers her bag slowly.' — or null>",
  "npcResponse": "<ONLY the spoken closing words, 1-2 sentences, in-character — no stage directions or narration inside this field>"
}

No suggestedReplies. No moodShift. Only npcAction and npcResponse.
CRITICAL: npcResponse must contain ONLY spoken dialogue — put any physical action in npcAction.`

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

export function buildSuggestionOnlyPrompt(character, scenario, dialogueHistory, lang = 'en') {
  const traits         = character.personalityTraits?.join(', ') ?? ''
  const warmerTriggers = (character.emotionalState?.triggers?.warmer ?? []).join(', ')
  const styles         = (scenario.suggestedReplyStyles ?? ['neutral', 'warm', 'direct']).join(', ')
  const relationshipContext = character.relationshipContext ?? null

  const langNote = lang === 'zh'
    ? 'IMPORTANT: All reply text MUST be written in Simplified Chinese (简体中文). Do not use English in any field.'
    : 'All reply text must be in English.'

  const relationshipNote = relationshipContext
    ? `CRITICAL — RELATIONSHIP CONSTRAINT: ${relationshipContext} Do NOT suggest replies with romantic undertones, romantic tension, or language implying romantic feelings. Suggested replies must reflect platonic friendship warmth only.\n`
    : ''

  const system = `You are a coaching assistant for a social skills game called Alien Friends.
The player is in a conversation with ${character.name}, who has these traits: ${traits}.
What makes ${character.name} open up: ${warmerTriggers}.
The suggested reply styles for this scenario are: ${styles}.

${relationshipNote}${langNote}

Your job is to generate 2-3 short, natural reply options the player could say next.
Each option should be realistic spoken language (not formal), and aim to make ${character.name} feel heard.

Respond with valid JSON only — no other text:
{
  "suggestedReplies": [
    { "text": "<words the player says, first person, 8-15 words>", "style": "<style label>" },
    { "text": "<words the player says, first person, 8-15 words>", "style": "<style label>" },
    { "text": "<words the player says, first person, 8-15 words>", "style": "<style label>" }
  ]
}

CRITICAL: "text" is what the PLAYER says, never the NPC. Plain dialogue only — no brackets or stage directions.`

  const messages = [{ role: 'system', content: system }]

  for (const entry of dialogueHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  messages.push({ role: 'user', content: 'Please suggest 2-3 replies I could say next.' })

  return messages
}

// ─── alien game NPC prompt ────────────────────────────────────────────────────

/**
 * Build the messages array for an NPC turn in the "Alien, Apparently" main game.
 *
 * Uses the same lean base structure as Practice Mode's buildCharacterPrompt, with
 * three story-specific extensions:
 *  1. doesNotKnow FORBIDDEN KNOWLEDGE hard constraint
 *  2. perspectiveShift (Evan's POV scene) with dual-truth constraint
 *  3. sceneContext (chapter/narration) so the NPC stays grounded in the authored checkpoint
 *
 * History is trimmed to the last 4 messages (2 exchanges) — older turns add
 * prompt length without meaningfully improving NPC coherence within a 3-turn chapter.
 *
 * @param {object}   character          - one of the alien-characters JSON objects
 * @param {object}   sceneContext       - { id, level, title, subtitle, narration, line }
 * @param {Array}    dialogueHistory    - [{role:'user'|'npc', text:string}]
 * @param {string}   playerInput        - the player's current message
 * @param {object}   [gameState]        - optional { evanTrust, labelPower, rumour, tension }
 * @param {boolean}  [perspectiveShift] - true when replaying as Evan
 * @param {'en'|'zh'} [lang]
 * @param {boolean}  [isFinalTurn]      - true on the last turn of a chapter (omits suggestedReplies)
 * @param {number}   [sceneIndex]       - current chapter index (0-based); used to gate knownFactsAfterSlides
 * @returns {{ role, content }[]}
 */
export function buildAlienNpcPrompt(
  character,
  sceneContext,
  dialogueHistory,
  playerInput,
  gameState = {},
  perspectiveShift = false,
  lang = 'en',
  isFinalTurn = false,
  sceneIndex = 0,
) {
  const traits     = (character.personalityTraits ?? []).join(', ')
  const tone       = character.communicationStyle?.tone ?? ''
  const tendencies = (character.communicationStyle?.tendencies ?? []).map(t => `  - ${t}`).join('\n')
  const baseline   = character.emotionalState?.baseline ?? ''
  const worsensIf  = (character.emotionalState?.triggers?.worsensIf ?? []).map(t => `  - ${t}`).join('\n')
  const improvesIf = (character.emotionalState?.triggers?.improvesIf ?? []).map(t => `  - ${t}`).join('\n')

  // Known facts — gated by story progress for Mira (single file, split fields).
  // Evan uses separate evan-early.json / evan-full.json files instead of this pattern,
  // so his character objects always carry a flat knownFacts array.
  // sceneIndex >= 2 means the slides incident has already occurred.
  const SLIDES_SCENE_INDEX = 2
  const afterSlidesUnlocked = sceneIndex >= SLIDES_SCENE_INDEX
  const alwaysFacts      = character.knownFactsAlways ?? character.knownFacts ?? []
  const afterSlidesFacts = afterSlidesUnlocked ? (character.knownFactsAfterSlides ?? []) : []
  const knownFactsList = [...alwaysFacts, ...afterSlidesFacts].map(f => `  - ${f}`).join('\n')

  // doesNotKnow — hard constraint, same proven pattern as Practice Mode's neverDo block
  const forbiddenList = (character.doesNotKnow ?? []).map(f => `  - ${f}`).join('\n')
  const forbiddenBlock = forbiddenList
    ? `\n## ⛔ What ${character.name} does NOT know — never reveal or hint at these\n${forbiddenList}\nIf the player asks about any of the above, react as someone who genuinely lacks this information: express confusion, deflect, or give a partial answer. Never confirm these facts, even indirectly.\n`
    : ''

  // Perspective shift extension (perspective scene only)
  const perspectiveBlock = perspectiveShift
    ? `\n## Speaking as Evan — dual-truth constraint\nYou are now speaking from Evan's point of view. Reveal the real context he had: the numerical error he spotted, the deadline pressure, not being included in the private lunch chat. BUT: his context does NOT cancel the impact his action had on Daniel. Both truths must coexist — do not use Evan's reasons to dismiss or minimise Daniel's hurt. And Evan still cannot know anything listed under "does NOT know" above.\n`
    : ''

  // Scene context (the authored chapter checkpoint)
  const sceneBlock = `\n## This scene\nChapter: ${sceneContext.level ?? ''}\nSituation: ${sceneContext.subtitle ?? ''}\n${sceneContext.narration ? `Context: ${sceneContext.narration}` : ''}`

  // Optional live game-state nudge
  const stateBlock = Object.keys(gameState).length
    ? `\n## Story state\n${Object.entries(gameState).map(([k, v]) => `  ${k}: ${v}`).join('\n')}`
    : ''

  const langBlock = lang === 'zh'
    ? `\n## Language\nWrite ALL fields in Simplified Chinese (简体中文). Speak as ${character.name} naturally would in Chinese.`
    : ''

  const finalTurnNote = isFinalTurn
    ? `\n## Final turn — CRITICAL: respond specifically, not generically\nThis is the last exchange in the "${sceneContext.title ?? sceneContext.id}" scene.\nThe player just said: "${playerInput}"\nYour npcResponse MUST directly react to those specific words and to the stakes of this scene (${sceneContext.objective ?? sceneContext.subtitle ?? ''}).\nDo NOT produce a vague, settling, or atmospheric closing line — give ${character.name}'s genuine in-character reaction to what was actually said. Reference the specific tension or topic of the scene. The response should feel unmistakably tied to this scene and this player message, not interchangeable with any other chapter.`
    : ''

  // ── response format ────────────────────────────────────────────────────────
  // suggestedReplies are omitted on the final turn (chapter ends immediately after).
  // The player-POV constraint is placed INLINE immediately after the JSON schema,
  // mirroring Practice Mode's proven pattern (not as a separate ## section).
  const suggestedRepliesField = isFinalTurn ? '' : `
  "suggestedReplies": [
    { "text": "<words the PLAYER says, first person, 8-15 words>", "style": "warm|direct|clarifying|cautious" },
    { "text": "<words the PLAYER says, first person, 8-15 words>", "style": "warm|direct|clarifying|cautious" },
    { "text": "<words the PLAYER says, first person, 8-15 words>", "style": "warm|direct|clarifying|cautious" }
  ],`

  const suggestedRepliesConstraint = isFinalTurn ? '' : `
CRITICAL for suggestedReplies: each entry is a reply option FOR THE PLAYER to say TO ${character.name}.
- "text" must be first-person words the PLAYER says — never ${character.name}'s words
- Plain dialogue only — no brackets, no stage directions, no action descriptions
- Three options, naturally different from each other, 8-15 words each
- None may reveal anything from the FORBIDDEN KNOWLEDGE block`

  const responseFormat = isFinalTurn
    ? `## Return ONLY valid JSON, nothing else\n{\n  "npcAction": "<optional: brief third-person physical or emotional action for ${character.name}, e.g. \\"She crosses her arms and looks away.\\" — or null if no distinct action fits naturally>",\n  "npcResponse": "<in-character spoken dialogue only, 1-3 sentences — no stage directions or parentheticals inside this string>",\n  "moodShift": "better" | "worse" | "neutral"\n}`
    : `## Return ONLY valid JSON, nothing else\n{${suggestedRepliesField}\n  "npcAction": "<optional: brief third-person physical or emotional action for ${character.name}, e.g. \\"She crosses her arms and looks away.\\" — or null if no distinct action fits naturally>",\n  "npcResponse": "<in-character spoken dialogue only, 1-3 sentences — no stage directions or parentheticals inside this string>",\n  "moodShift": "better" | "worse" | "neutral"\n}\n${suggestedRepliesConstraint}`

  const system = `You are roleplaying as ${character.name} in a social skills game called "Alien, Apparently."
${character.name}'s role: ${character.role}
You MUST respond with valid JSON every turn — see format at the bottom of this prompt.

## Personality
${traits}

## How ${character.name} speaks
Tone: ${tone}
Tendencies:
${tendencies}

## Emotional baseline
${baseline}

## What makes ${character.name} more guarded
${worsensIf}

## What helps ${character.name} open up
${improvesIf}

## What ${character.name} knows
${knownFactsList}
${forbiddenBlock}${perspectiveBlock}${sceneBlock}${stateBlock}${finalTurnNote}${langBlock}

## NPC reply rules
- npcAction: a brief third-person physical or emotional action for ${character.name} (e.g. "He shifts uncomfortably and avoids your eyes."). Use null if no distinct action fits naturally. This is scene narration — keep it short (one clause or sentence). If there are multiple action beats around the dialogue (before, between, or after spoken lines), describe ALL of them together here as one combined narration — never scatter action text into npcResponse.
- npcResponse: ONLY the spoken words — every word in this field must be something ${character.name} actually says aloud. Do not include stage directions, parentheticals, action descriptions, or any third-person narration inside npcResponse. If ${character.name} would naturally pause mid-speech with an action, merge all spoken lines into one continuous npcResponse and put the pause/action in npcAction.
- Quote style: always wrap spoken dialogue in double quotes ("…"). Never use single quotes as dialogue delimiters. Single quotes are reserved exclusively for contractions within the text (don't, I'm, you're, it's, etc.).
- 1-3 natural spoken sentences in npcResponse, completely in character
- Do not explain the game, break the fourth wall, or repeat the player's words back verbatim
- ALWAYS wrap your reply in the JSON format below — never return plain text

${responseFormat}`

  const messages = [{ role: 'system', content: system }]

  // Last 4 messages = 2 exchanges — enough for in-chapter coherence, avoids bloat
  const recentHistory = (dialogueHistory ?? []).slice(-4)
  for (const entry of recentHistory) {
    messages.push({
      role:    entry.role === 'user' ? 'user' : 'assistant',
      content: entry.text,
    })
  }

  messages.push({ role: 'user', content: playerInput })

  return messages
}

// ─── alien perspective-shift narration prompt ─────────────────────────────────

/**
 * One-shot prompt that generates Evan's internal narration for the Perspective
 * Shift scene. NOT a multi-turn dialogue — generates a single narrated paragraph
 * that reveals Evan's missing context without excusing his impact on Daniel.
 *
 * @param {object}   evan        - evan.json character data
 * @param {object}   sceneContext
 * @param {Array}    choiceHistory - the player's choices so far [{sceneId, choiceLabel}]
 * @param {'en'|'zh'} [lang]
 * @returns {{ role, content }[]}
 */
export function buildPerspectiveShiftPrompt(evan, sceneContext, choiceHistory, lang = 'en') {
  const pastChoices = (choiceHistory ?? [])
    .map(c => `  - ${c.sceneId}: ${c.choiceLabel}`)
    .join('\n')

  const langBlock = lang === 'zh'
    ? `Write Evan's narration in Simplified Chinese (简体中文). First-person, natural spoken Chinese.`
    : `Write Evan's narration in English. First-person, natural spoken language.`

  const system = `You are writing a short first-person narration for Evan in an interactive game called "Alien, Apparently."

## Purpose of this scene
The player is replaying a key event from EVAN'S perspective. Your job is to reveal the information Evan actually had — NOT to vindicate him or prove he was right.

## What Evan knew and felt (you MUST reflect all of these)
${[...(evan.knownFactsAlways ?? evan.knownFacts ?? []), ...(evan.knownFactsAfterSlides ?? [])].map(f => `  - ${f}`).join('\n')}

## What Evan did NOT know (NEVER mention or hint at these — he genuinely lacked this information)
${(evan.doesNotKnow ?? []).map(f => `  - ${f}`).join('\n')}

## The dual truth that must come through
1. Evan had real reasons: he saw a genuine error and believed the deadline made waiting risky.
2. Evan's action caused real harm: he changed someone's work without notice. This fact must NOT be minimised, excused, or dismissed in the narration.

## Player's choices so far (for tone calibration)
${pastChoices || '  (none yet)'}

## ${langBlock}

## Format — return ONLY valid JSON, nothing else
{
  "evanNarration": "<3-5 sentences in Evan's voice, revealing his context WITHOUT excusing his impact>"
}`

  return [
    { role: 'system', content: system },
    { role: 'user', content: 'Please write Evan\'s perspective narration now.' },
  ]
}

// ─── epilogue prompt ──────────────────────────────────────────────────────────

export function buildEpiloguePrompt(character, scenario, dialogueHistory, outcome, lang = 'en') {
  const outcomeGuide =
    outcome === 'positive'
      ? 'The connection genuinely improved. There was a moment of warmth or understanding. Reflect on what the player did well and what small shift happened.'
      : outcome === 'negative'
      ? 'The distance remained or widened. Things felt awkward or unresolved. Reflect honestly but gently — what made it hard, and what might be worth trying differently next time.'
      : 'The conversation was mixed — some connection, some friction, no clear breakthrough but no collapse either. Reflect on the tension between wanting to connect and not knowing how.'

  // Resolve scenario title for the prompt (handles both string and {en,zh} shapes)
  const scenarioTitle = typeof scenario.title === 'string'
    ? scenario.title
    : (scenario.title?.[lang] ?? scenario.title?.en ?? '')

  const langNote = lang === 'zh'
    ? `## Language\nWrite the epilogue in Simplified Chinese (简体中文). The tone should feel literary and emotionally resonant in Chinese — not a literal translation. Use natural Chinese narrative cadence.`
    : `## Language\nWrite the epilogue in English.`

  const system = `You are a warm, literary narrator for a social skills game called Alien Friends.
You are NOT the NPC. You are an observer writing a brief story epilogue after a conversation between the player and ${character.name}.

## The scenario
${scenarioTitle}: ${scenario.setup}

## Outcome
${outcomeGuide}

${langNote}

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
