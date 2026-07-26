/**
 * progressionSystem.js
 * XP, levelling, and streak logic — pure functions.
 */

const XP_PER_LEVEL = 100

// ─── levelling ────────────────────────────────────────────────────────────────

/** @param {number} xp @returns {number} level */
export function xpToLevel(xp) {
  return Math.floor(xp / XP_PER_LEVEL) + 1
}

/** @param {number} xp @returns {number} 0-100 progress within current level */
export function levelProgress(xp) {
  return xp % XP_PER_LEVEL
}

// ─── XP gain ─────────────────────────────────────────────────────────────────

/**
 * Calculate XP awarded at end of a scenario.
 * @param {number} compositeScore  0-100
 * @param {'easy'|'medium'|'hard'} tier
 * @returns {number}
 */
export function calculateXpGain(compositeScore, tier) {
  const base = Math.round(compositeScore * 0.5)            // max 50 base
  const multiplier = { easy: 1, medium: 1.5, hard: 2 }[tier] ?? 1
  return Math.round(base * multiplier)
}

// ─── streak ───────────────────────────────────────────────────────────────────

/**
 * Determine new streak after a play session.
 * @param {string|null} lastPlayedDate  ISO date (YYYY-MM-DD) or null
 * @param {number}      currentStreak
 * @returns {{ streak: number, date: string }}
 */
export function updateStreak(lastPlayedDate, currentStreak) {
  const today = new Date().toISOString().slice(0, 10)
  if (!lastPlayedDate) return { streak: 1, date: today }

  const daysDiff =
    (new Date(today) - new Date(lastPlayedDate)) / (1000 * 60 * 60 * 24)

  if (daysDiff === 0) return { streak: currentStreak, date: today }
  if (daysDiff === 1) return { streak: currentStreak + 1, date: today }
  return { streak: 1, date: today } // broken
}
