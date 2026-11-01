import { describe, it, expect } from 'vitest'
import { getEnding } from '../src/lib/endingLogic.js'

describe('getEnding', () => {
  it('returns Exclusion when labelPower reaches 70', () => {
    const scores = { clarity: 50, respect: 50, awareness: 50, boundary: 50 }
    const hidden = { labelPower: 70, rumour: 0 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Exclusionx')
  })

  it('returns Exclusion when rumour reaches 70', () => {
    const scores = { clarity: 50, respect: 50, awareness: 50, boundary: 50 }
    const hidden = { labelPower: 0, rumour: 70 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Exclusion')
  })

  it('returns Exclusion even when all scores are perfect', () => {
    const scores = { clarity: 100, respect: 100, awareness: 100, boundary: 100 }
    const hidden = { labelPower: 0, rumour: 85 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Exclusion')
  })

  it('does not return Exclusion when labelPower and rumour are 69', () => {
    const scores = { clarity: 100, respect: 100, awareness: 100, boundary: 100 }
    const hidden = { labelPower: 69, rumour: 69 }

    const result = getEnding(scores, hidden)

    expect(result.name).not.toBe('Exclusion')
  })

  it('returns Healthy Boundary when boundary is 70 and awareness is 62', () => {
    const scores = { clarity: 100, respect: 100, awareness: 62, boundary: 70 }
    const hidden = { labelPower: 0, rumour: 0 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Healthy Boundary')
  })

  it('returns Mutual Adjustment instead of Healthy Boundary when awareness is 61', () => {
    const scores = { clarity: 100, respect: 100, awareness: 61, boundary: 90 }
    const hidden = { labelPower: 0, rumour: 0 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Mutual Adjustment')
  })

  it('returns Mutual Adjustment when overall is at least 66 and boundary is below 70', () => {
    const scores = { clarity: 100, respect: 100, awareness: 62, boundary: 69 }
    const hidden = { labelPower: 0, rumour: 0 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Mutual Adjustment')
  })

  it('returns Forced Harmony when no other ending is reached', () => {
    const scores = { clarity: 50, respect: 50, awareness: 50, boundary: 50 }
    const hidden = { labelPower: 0, rumour: 0 }

    const result = getEnding(scores, hidden)

    expect(result.name).toBe('Forced Harmony')
  })
})