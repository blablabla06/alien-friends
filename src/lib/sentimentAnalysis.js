/**
 * sentimentAnalysis.js
 * Lightweight client-side sentiment — no API call required.
 */

const POSITIVE = [
  'happy', 'great', 'good', 'love', 'wonderful', 'fantastic', 'glad',
  'thank', 'appreciate', 'brilliant', 'excellent', 'kind', 'warm',
  'excited', 'hopeful', 'proud', 'grateful', 'care', 'miss',
]

const NEGATIVE = [
  'sad', 'angry', 'hate', 'terrible', 'bad', 'awful', 'frustrated',
  'annoyed', 'upset', 'hurt', 'sorry', 'worried', 'scared', 'lonely',
  'tired', 'stressed', 'overwhelmed', 'disappoint',
]

/**
 * @param {string} text
 * @returns {{ label: 'positive'|'neutral'|'negative', score: number }}
 *   score: -1 (very negative) → 0 (neutral) → 1 (very positive)
 */
export function analyzeSentiment(text) {
  if (!text?.trim()) return { label: 'neutral', score: 0 }

  const lower = text.toLowerCase()
  const pos = POSITIVE.filter(w => lower.includes(w)).length
  const neg = NEGATIVE.filter(w => lower.includes(w)).length

  const raw = pos - neg
  const score = Math.max(-1, Math.min(1, raw * 0.25))

  const label = score > 0.1 ? 'positive' : score < -0.1 ? 'negative' : 'neutral'
  return { label, score }
}
