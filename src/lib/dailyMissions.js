/**
 * dailyMissions.js
 *
 * Pure functions for the Daily Missions system.
 * No side effects — all state lives in GameStateContext.
 */

// ─── Task pool ────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} MissionDef
 * @property {string}   id          stable ID used to look up completion logic
 * @property {string}   label       displayed text
 * @property {number}   xpReward    XP awarded on first completion
 * @property {Object}   [params]    optional numeric thresholds used by checkEvent
 */

/** @type {MissionDef[]} */
export const MISSION_POOL = [
  {
    id:       'complete_easy',
    label:    'Complete any easy-tier scenario',
    xpReward: 15,
  },
  {
    id:       'complete_medium',
    label:    'Complete any medium-tier scenario',
    xpReward: 20,
  },
  {
    id:       'complete_hard',
    label:    'Complete any hard-tier scenario',
    xpReward: 30,
  },
  {
    id:       'complete_any',
    label:    'Complete 2 scenarios today',
    xpReward: 25,
    params:   { required: 2 },
  },
  {
    id:       'score_empathy_70',
    label:    'Score 70+ empathy in one conversation',
    xpReward: 20,
    params:   { dim: 'empathy', threshold: 70 },
  },
  {
    id:       'score_clarity_70',
    label:    'Score 70+ clarity in one conversation',
    xpReward: 20,
    params:   { dim: 'clarity', threshold: 70 },
  },
  {
    id:       'score_composite_75',
    label:    'Achieve a composite score of 75 or higher',
    xpReward: 25,
    params:   { threshold: 75 },
  },
  {
    id:       'try_new_scenario',
    label:    'Try a scenario you haven\'t played before',
    xpReward: 20,
  },
  {
    id:       'free_text_twice',
    label:    'Use free-text input at least twice in one conversation',
    xpReward: 15,
    params:   { required: 2 },
  },
  {
    id:       'high_connection',
    label:    'Finish a scenario with connection mood above 65',
    xpReward: 20,
    params:   { threshold: 65 },
  },
]

// ─── Daily generation ─────────────────────────────────────────────────────────

/** Today's date as YYYY-MM-DD */
export function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Deterministically pick 4 missions for a given date string.
 * Uses a simple seeded shuffle so the same date always gives the same set
 * (but each new day gives a genuinely different selection).
 *
 * @param {string} dateKey  YYYY-MM-DD
 * @returns {MissionDef[]}
 */
export function generateMissionsForDate(dateKey) {
  // Simple deterministic seed from the date
  const seed = dateKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)

  // Seeded LCG shuffle (Fisher-Yates with pseudo-random sequence)
  const pool  = [...MISSION_POOL]
  let   state = seed

  function nextRand() {
    // LCG parameters from Numerical Recipes
    state = (state * 1664525 + 1013904223) & 0xffffffff
    return (state >>> 0) / 0xffffffff
  }

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(nextRand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]]
  }

  // Pick 4 tasks — a good number for the card without being overwhelming
  return pool.slice(0, 4)
}

// ─── Completion checking ───────────────────────────────────────────────────────

/**
 * @typedef {Object} GameEvent
 * @property {'SCENARIO_COMPLETE'|'SCORE_RECORDED'|'FREE_TEXT_USED'} type
 * @property {string}  [scenarioId]
 * @property {string}  [tier]           'easy' | 'medium' | 'hard'
 * @property {boolean} [isNewScenario]  true if player hadn't completed it before
 * @property {Object}  [scores]         { clarity, empathy, politeness, expression, composite }
 * @property {number}  [connectionMood] final mood value
 * @property {number}  [freeTextCount]  how many free-text turns used this session
 * @property {number}  [scenariosCompletedToday] running count for today
 */

/**
 * Given an in-progress mission and a game event, return true if the event
 * satisfies the mission's completion condition.
 *
 * @param {MissionDef}  mission
 * @param {GameEvent}   event
 * @returns {boolean}
 */
export function checkEvent(mission, event) {
  const p = mission.params ?? {}

  switch (mission.id) {
    case 'complete_easy':
      return event.type === 'SCENARIO_COMPLETE' && event.tier === 'easy'

    case 'complete_medium':
      return event.type === 'SCENARIO_COMPLETE' && event.tier === 'medium'

    case 'complete_hard':
      return event.type === 'SCENARIO_COMPLETE' && event.tier === 'hard'

    case 'complete_any':
      // requires completing p.required scenarios *today* — count is passed in event
      return event.type === 'SCENARIO_COMPLETE' && (event.scenariosCompletedToday ?? 0) >= (p.required ?? 2)

    case 'score_empathy_70':
      return event.type === 'SCORE_RECORDED' && (event.scores?.empathy ?? 0) >= (p.threshold ?? 70)

    case 'score_clarity_70':
      return event.type === 'SCORE_RECORDED' && (event.scores?.clarity ?? 0) >= (p.threshold ?? 70)

    case 'score_composite_75':
      return event.type === 'SCORE_RECORDED' && (event.scores?.composite ?? 0) >= (p.threshold ?? 75)

    case 'try_new_scenario':
      return event.type === 'SCENARIO_COMPLETE' && event.isNewScenario === true

    case 'free_text_twice':
      return event.type === 'FREE_TEXT_USED' && (event.freeTextCount ?? 0) >= (p.required ?? 2)

    case 'high_connection':
      return event.type === 'SCENARIO_COMPLETE' && (event.connectionMood ?? 0) >= (p.threshold ?? 65)

    default:
      return false
  }
}

/**
 * Given today's mission list and a game event, return the IDs of any
 * missions that the event newly satisfies (not already completed).
 *
 * @param {Array<{def: MissionDef, completed: boolean}>} missions
 * @param {GameEvent} event
 * @returns {string[]}  IDs of newly-completed missions
 */
export function tickMissions(missions, event) {
  return missions
    .filter(m => !m.completed && checkEvent(m.def, event))
    .map(m => m.def.id)
}
