export function getEnding(scores, hidden) {
  const overall = Math.round(
    scores.clarity  * 0.28 +
    scores.respect  * 0.24 +
    scores.awareness * 0.28 +
    scores.boundary * 0.20,
  )
  if (hidden.labelPower >= 70 || hidden.rumour >= 70) {
    return {
      name: 'Exclusion',
      quote: 'A group that needs an alien will eventually create another one.',
      summary: 'Evan is removed. The group feels relieved, but the pattern that created the label remains.',
      overall,
      badge: 'Rumour Witness',
    }
  }
  if (scores.boundary >= 70 && scores.awareness >= 62) {
    return {
      name: 'Healthy Boundary',
      quote: 'Understanding does not remove accountability.',
      summary: 'The team keeps the issue specific: Evan must notify changes, and the group must stop using personal labels.',
      overall,
      badge: 'Boundary Setter',
    }
  }
  if (overall >= 66) {
    return {
      name: 'Mutual Adjustment',
      quote: 'Belonging does not require sameness.',
      summary: 'Nobody becomes best friends, but the team creates enough trust and structure to keep working.',
      overall,
      badge: 'Perspective Builder',
    }
  }
  return {
    name: 'Forced Harmony',
    quote: 'Silence is not resolution.',
    summary: 'The meeting ends politely, but the real conflict continues underneath the surface.',
    overall,
    badge: 'First Run Complete',
  }
}
