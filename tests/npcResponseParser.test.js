import { describe, it, expect } from 'vitest'
import { extractCleanDialogue } from '../src/lib/npcResponseParser.js'

describe('extractCleanDialogue', () => {
  it('separates narration from straight-quoted dialogue', () => {
    const raw = 'Mira smiles. "Want to join us?"'

    const result = extractCleanDialogue(raw)

    expect(result).toEqual({
      cleanDialogue: 'Want to join us?',
      combinedNarration: 'Mira smiles.',
    })
  })

  it('handles Chinese book-title quotes', () => {
    const raw = '米拉笑了。「要一起吃吗？」'

    const result = extractCleanDialogue(raw)

    expect(result).toEqual({
      cleanDialogue: '要一起吃吗？',
      combinedNarration: '米拉笑了。',
    })
  })

  it('handles curly quotes', () => {
    const raw = '米拉笑了。“要一起吃吗？”'

    const result = extractCleanDialogue(raw)

    expect(result).toEqual({
      cleanDialogue: '要一起吃吗？',
      combinedNarration: '米拉笑了。',
    })
  })

  it('treats text in brackets as an action', () => {
    const raw = '(sighs) "Fine."'

    const result = extractCleanDialogue(raw)

    expect(result).toEqual({
      cleanDialogue: 'Fine.',
      combinedNarration: 'sighs',
    })
  })
})