/**
 * npcResponseParser.js
 *
 * Defensive post-processing for NPC response text received from the LLM.
 *
 * Models occasionally return responses in an "action – dialogue – action"
 * pattern despite being instructed otherwise, e.g.:
 *
 *   "Alex's mouth quirks. \"You're not wrong.\" He pauses. \"Maybe once.\""
 *
 * extractCleanDialogue ensures:
 *  - npcResponse (the chat bubble) contains ONLY the joined quoted spoken words.
 *  - All narration beats (text outside quotes) are merged into ONE narration string.
 *
 * Usage (both Practice Mode and AlienMainPage):
 *
 *   const { cleanDialogue, combinedNarration } = extractCleanDialogue(
 *     parsed.npcResponse ?? '',
 *     parsed.npcAction   ?? null,
 *   )
 *   // cleanDialogue  → goes into the chat bubble  (entry.text)
 *   // combinedNarration → goes into npcAction      (entry.npcAction)
 */

/**
 * Matches only straight-double-quoted ("…") spans, supporting escaped quotes
 * inside (\"). Single quotes are intentionally excluded — they are reserved for
 * contractions (don't, I'm, you're) and must never be treated as dialogue
 * delimiters. The prompt instructs the model to always use double quotes for
 * spoken dialogue, so this regex is the only delimiter needed.
 * Non-greedy so adjacent quoted segments are captured separately.
 */
const QUOTE_RE = /"((?:[^"\\]|\\.)*)"/g

/**
 * Extract clean spoken dialogue and merged narration from a raw npcResponse string.
 *
 * @param {string}      npcResponseRaw - the `npcResponse` value from the LLM (may contain narration)
 * @param {string|null} npcActionRaw   - the `npcAction` value from the LLM (may be null)
 * @returns {{ cleanDialogue: string, combinedNarration: string|null }}
 */
export function extractCleanDialogue(npcResponseRaw, npcActionRaw = null) {
  const raw = String(npcResponseRaw ?? '').trim()

  // ── Step 1: pull out all quoted spoken segments ────────────────────────────
  const quotedSegments = []
  let match
  QUOTE_RE.lastIndex = 0
  while ((match = QUOTE_RE.exec(raw)) !== null) {
    const spoken = match[1].trim()
    if (spoken) quotedSegments.push(spoken)
  }

  // If no quoted segments found the entire npcResponse is treated as plain dialogue
  // (model complied perfectly or returned a simple unquoted string).
  const cleanDialogue = quotedSegments.length > 0
    ? quotedSegments.join(' ')
    : raw

  // ── Step 2: collect narration — everything OUTSIDE the quotes ─────────────
  QUOTE_RE.lastIndex = 0
  const narrationFromResponse = raw
    .split(QUOTE_RE)                    // split on every quoted span (captures too)
    .filter((_, idx) => idx % 2 === 0) // even indices = outside-quote segments
    .map(s => s.trim())
    .filter(Boolean)
    .join(' ')
    .trim()

  // ── Step 3: merge npcAction + any narration extracted from npcResponse ─────
  const parts = [
    npcActionRaw ? String(npcActionRaw).trim() : null,
    // Only include narration-from-response if there were actually quoted segments
    // (i.e. there was something outside the quotes worth separating out).
    quotedSegments.length > 0 ? narrationFromResponse || null : null,
  ].filter(Boolean)

  const combinedNarration = parts.length > 0 ? parts.join(' ') : null

  return { cleanDialogue, combinedNarration }
}
