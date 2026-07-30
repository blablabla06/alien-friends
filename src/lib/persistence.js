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

// ─── Active session persistence ───────────────────────────────────────────────
// Stores the in-progress dialogue so a page refresh can resume where the player
// left off, instead of bouncing them back to the home screen.
// Uses a separate key so it never interferes with the long-term progress data.

const SESSION_KEY = 'alien_friends_active_session'

/** How long (ms) to keep an active session before treating it as stale.
 *  4 hours — generous enough for a real play session, short enough to avoid
 *  resurrecting a dialogue the player abandoned days ago. */
const SESSION_TTL_MS = 4 * 60 * 60 * 1000

/**
 * @typedef {Object} ActiveSession
 * @property {string}   scenarioId
 * @property {object}   scenario          full scenario JSON
 * @property {object}   character         full character JSON
 * @property {Array}    dialogueHistory
 * @property {Array}    scoringHistory
 * @property {object}   currentScores
 * @property {number}   connectionMood
 * @property {number}   turnCount
 * @property {number}   helpUsed
 * @property {number}   savedAt           Date.now() when snapshot was written
 */

/**
 * Persist the current in-progress dialogue session.
 * @param {ActiveSession} session
 */
export function saveActiveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, savedAt: Date.now() }))
  } catch {
    // Fail silently (quota / private mode)
  }
}

/**
 * Load the active session for a given scenarioId.
 * Returns null if nothing is stored, the session is expired, or the
 * scenarioId doesn't match (e.g. the player manually edited the URL).
 * @param {string} scenarioId
 * @returns {ActiveSession|null}
 */
export function loadActiveSession(scenarioId) {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    // Reject if expired
    if (!parsed.savedAt || Date.now() - parsed.savedAt > SESSION_TTL_MS) {
      localStorage.removeItem(SESSION_KEY)
      return null
    }
    // Reject if scenarioId doesn't match
    if (parsed.scenarioId !== scenarioId) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Remove the stored active session (call on scenario end / results screen).
 */
export function clearActiveSession() {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    // Fail silently
  }
}
