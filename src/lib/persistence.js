/**
 * persistence.js
 *
 * Thin wrapper around localStorage for player progress.
 * Keeps only the fields that should survive a page refresh —
 * everything session-specific (dialogue history, current scenario, etc.)
 * is intentionally excluded.
 */

const KEY = 'alien_friends_progress'

/**
 * The shape of the persisted slice.
 * @typedef {Object} PersistedProgress
 * @property {number}   xp
 * @property {number}   level
 * @property {number}   streak
 * @property {string|null} lastPlayedDate
 * @property {string[]} completedScenarios
 * @property {{ clarity: number, politeness: number, empathy: number, expression: number }} currentScores
 */

const DEFAULTS = {
  xp:                 0,
  level:              1,
  streak:             0,
  lastPlayedDate:     null,
  completedScenarios: [],
  currentScores: {
    clarity:    0,
    politeness: 0,
    empathy:    0,
    expression: 0,
  },
}

/**
 * Load persisted progress from localStorage.
 * Returns DEFAULTS (merged) if nothing is stored or the data is corrupt.
 * @returns {PersistedProgress}
 */
export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw)
    // Merge with defaults so new fields added in future deploys always have a value
    return {
      ...DEFAULTS,
      ...parsed,
      currentScores: { ...DEFAULTS.currentScores, ...(parsed.currentScores ?? {}) },
      completedScenarios: Array.isArray(parsed.completedScenarios)
        ? parsed.completedScenarios
        : [],
    }
  } catch {
    return { ...DEFAULTS }
  }
}

/**
 * Persist the progress slice to localStorage.
 * @param {PersistedProgress} progress
 */
export function saveProgress(progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(progress))
  } catch {
    // Storage quota exceeded or private-mode restriction — fail silently
  }
}
