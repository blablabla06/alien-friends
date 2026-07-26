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
 * A single completed-scenario summary stored in sessionLog.
 * @typedef {Object} SessionSummary
 * @property {string}   scenarioId
 * @property {string}   scenarioTitle
 * @property {string}   difficultyTier
 * @property {string}   playedAt         ISO timestamp
 * @property {number}   composite        overall average composite
 * @property {{ clarity: number, politeness: number, empathy: number, expression: number }} dimAverages
 * @property {Array<{ role: string, text: string, composite?: number, feedback?: string }>} turnLog
 *   Each entry is either a user turn with its score or an NPC turn (no score fields).
 */

/**
 * A single daily mission entry as stored in the persisted missions list.
 * @typedef {Object} PersistedMission
 * @property {import('./dailyMissions.js').MissionDef} def
 * @property {boolean} completed
 */

/**
 * The persisted daily-missions slice.
 * @typedef {Object} PersistedDailyMissions
 * @property {string}             generatedDate   YYYY-MM-DD the list was created
 * @property {PersistedMission[]} missions
 * @property {number}             scenariosCompletedToday  running count reset each day
 */

/**
 * The shape of the persisted slice.
 * @typedef {Object} PersistedProgress
 * @property {number}   xp
 * @property {number}   level
 * @property {number}   streak
 * @property {string|null} lastPlayedDate
 * @property {string[]} completedScenarios
 * @property {{ clarity: number, politeness: number, empathy: number, expression: number }} currentScores
 * @property {SessionSummary[]} sessionLog
 * @property {PersistedDailyMissions} dailyMissions
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
  // Cross-scenario history — up to 20 most recent sessions
  sessionLog: [],
  // Daily missions — reset each calendar day
  dailyMissions: {
    generatedDate:            '',   // forces regeneration on first load
    missions:                 [],
    scenariosCompletedToday:  0,
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
      sessionLog: Array.isArray(parsed.sessionLog)
        ? parsed.sessionLog
        : [],
      dailyMissions: {
        ...DEFAULTS.dailyMissions,
        ...(parsed.dailyMissions ?? {}),
        missions: Array.isArray(parsed.dailyMissions?.missions)
          ? parsed.dailyMissions.missions
          : [],
      },
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
