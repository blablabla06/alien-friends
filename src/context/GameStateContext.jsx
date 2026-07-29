import { createContext, useContext, useEffect, useReducer } from 'react'
import { loadProgress, saveProgress } from '../lib/persistence.js'
import { generateMissionsForDate, tickMissions, todayKey } from '../lib/dailyMissions.js'

// ─── initial state ────────────────────────────────────────────────────────────

// Load persisted progress once at module evaluation time.
// (Safe: this file is only evaluated in the browser.)
const persisted = loadProgress()

/** Ensure dailyMissions is fresh for today — regenerate if it's a new day */
function initDailyMissions(stored) {
  const today = todayKey()
  if (stored.generatedDate === today && stored.missions.length > 0) {
    return stored   // already up-to-date
  }
  // New day (or first run) — generate a fresh set
  const defs = generateMissionsForDate(today)
  return {
    generatedDate:           today,
    missions:                defs.map(def => ({ def, completed: false })),
    scenariosCompletedToday: 0,
  }
}

const initialState = {
  // ── Session fields (never persisted) ──
  currentScenario:  null,   // full scenario JSON object
  currentCharacter: null,   // full character JSON object
  dialogueHistory:  [],     // [{ role: 'user'|'npc', text, timestamp }]
  connectionMood:   50,     // 0-100, drives the MoodMeter
  turnCount:        0,
  helpUsed:         0,      // times the player requested suggestions manually this session

  // Per-turn scoring history — array of { clarity, politeness, empathy, expression, composite, feedback }
  // Each entry corresponds to one player turn, in order.
  scoringHistory:   [],

  // Running average across all scored turns (used by ResultsScreen / ScoreBreakdown)
  currentScores:      persisted.currentScores,

  // ── Persisted fields (restored from localStorage) ──
  xp:                 persisted.xp,
  level:              persisted.level,
  streak:             persisted.streak,
  lastPlayedDate:     persisted.lastPlayedDate,
  completedScenarios: persisted.completedScenarios,  // string[]

  // Cross-scenario history — array of SessionSummary objects, newest first, capped at 20
  sessionLog:         persisted.sessionLog,           // SessionSummary[]

  // Daily missions — regenerated each calendar day, persisted between sessions
  dailyMissions:      initDailyMissions(persisted.dailyMissions),
}

// ─── reducer ─────────────────────────────────────────────────────────────────

function reducer(state, action) {
  switch (action.type) {

    case 'START_SCENARIO':
      return {
        ...state,
        currentScenario:  action.scenario,
        currentCharacter: action.character,
        dialogueHistory:  [],
        scoringHistory:   [],
        currentScores: {
          clarity:    0,
          politeness: 0,
          empathy:    0,
          expression: 0,
          composite:  0,
        },
        connectionMood: 50,
        turnCount:      0,
        helpUsed:       0,
      }

    case 'INCREMENT_HELP':
      return { ...state, helpUsed: state.helpUsed + 1 }

    case 'ADD_DIALOGUE_ENTRY':
      return {
        ...state,
        dialogueHistory: [...state.dialogueHistory, action.entry],
        turnCount: state.turnCount + (action.entry.role === 'user' ? 1 : 0),
      }

    case 'ADD_SCORE_ENTRY': {
      // Append the new per-turn score entry
      const history = [...state.scoringHistory, action.entry]

      // Recompute running average across all turns
      const avg = (key) => Math.round(history.reduce((s, e) => s + (e[key] ?? 0), 0) / history.length)
      const updated = {
        clarity:    avg('clarity'),
        politeness: avg('politeness'),
        empathy:    avg('empathy'),
        expression: avg('expression'),
        composite:  avg('composite'),
      }

      // Nudge mood based on this turn's composite (not the running average)
      const thisComposite = action.entry.composite ?? updated.composite
      const nudge = thisComposite >= 60 ? 5 : thisComposite >= 40 ? 0 : -5
      const newMood = Math.max(0, Math.min(100, state.connectionMood + nudge))

      return { ...state, scoringHistory: history, currentScores: updated, connectionMood: newMood }
    }

    // Keep UPDATE_SCORES as a thin alias so any legacy callers still work
    case 'UPDATE_SCORES': {
      const updated = { ...state.currentScores, ...action.scores }
      return { ...state, currentScores: updated }
    }

    case 'SET_MOOD':
      return {
        ...state,
        connectionMood: Math.max(0, Math.min(100, action.mood)),
      }

    case 'SHIFT_MOOD': {
      const delta = action.shift === 'warmer' ? 8 : action.shift === 'cooler' ? -8 : 0
      return {
        ...state,
        connectionMood: Math.max(0, Math.min(100, state.connectionMood + delta)),
      }
    }

    case 'ADD_XP': {
      const newXp    = state.xp + action.amount
      const newLevel = Math.floor(newXp / 100) + 1
      return { ...state, xp: newXp, level: newLevel }
    }

    case 'SET_STREAK':
      return {
        ...state,
        streak: action.streak,
        lastPlayedDate: action.date ?? state.lastPlayedDate,
      }

    case 'COMPLETE_SCENARIO': {
      const id = action.scenarioId
      if (!id || state.completedScenarios.includes(id)) return state
      return {
        ...state,
        completedScenarios: [...state.completedScenarios, id],
        dailyMissions: {
          ...state.dailyMissions,
          scenariosCompletedToday: (state.dailyMissions.scenariosCompletedToday ?? 0) + 1,
        },
      }
    }

    case 'END_SCENARIO':
      return { ...state, currentScenario: null, currentCharacter: null }

    // Mark one or more missions complete by ID; also grant XP for each
    case 'COMPLETE_MISSION': {
      const { missionId } = action
      const dm = state.dailyMissions
      const missions = dm.missions.map(m =>
        m.def.id === missionId && !m.completed
          ? { ...m, completed: true }
          : m
      )
      return {
        ...state,
        dailyMissions: { ...dm, missions },
      }
    }

    // Evaluate a game event against all incomplete missions; mark any that pass
    case 'TICK_MISSIONS': {
      const dm  = state.dailyMissions
      const ids = tickMissions(dm.missions, action.event)
      if (!ids.length) return state
      const missions = dm.missions.map(m =>
        ids.includes(m.def.id) ? { ...m, completed: true } : m
      )
      return {
        ...state,
        dailyMissions: { ...dm, missions },
      }
    }

    case 'SAVE_SESSION': {
      // Build a compact SessionSummary from the current scenario + scoring data
      const { currentScenario: sc, currentScores: cs, scoringHistory: sh, dialogueHistory: dh } = state
      if (!sc) return state

      // Merge each scored turn with the corresponding user dialogue entry for the quote
      const userTurns   = dh.filter(e => e.role === 'user')
      const mergedTurns = sh.map((score, i) => ({
        ...score,
        text: userTurns[i]?.text ?? '',
      }))

      const summary = {
        scenarioId:    sc.id,
        scenarioTitle: sc.title,
        difficultyTier: sc.difficultyTier ?? 'easy',
        playedAt:      new Date().toISOString(),
        composite:     cs.composite ?? 0,
        dimAverages: {
          clarity:    cs.clarity    ?? 0,
          politeness: cs.politeness ?? 0,
          empathy:    cs.empathy    ?? 0,
          expression: cs.expression ?? 0,
        },
        turnLog: mergedTurns,
      }

      // Newest first, cap at 20 entries
      const updated = [summary, ...state.sessionLog].slice(0, 20)
      return { ...state, sessionLog: updated }
    }

    // Directly insert a pre-built SessionSummary (e.g. from AlienMainPage's
    // story mode which manages its own scoring outside the standard flow).
    case 'SAVE_ALIEN_SESSION': {
      const updated = [action.summary, ...state.sessionLog].slice(0, 20)
      return { ...state, sessionLog: updated }
    }

    default:
      return state
  }
}

// ─── context ──────────────────────────────────────────────────────────────────

const GameStateContext = createContext(null)

export function GameStateProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // ── Persist whenever any tracked field changes ──
  useEffect(() => {
    saveProgress({
      xp:                 state.xp,
      level:              state.level,
      streak:             state.streak,
      lastPlayedDate:     state.lastPlayedDate,
      completedScenarios: state.completedScenarios,
      currentScores:      state.currentScores,
      sessionLog:         state.sessionLog,
      dailyMissions:      state.dailyMissions,
    })
  }, [
    state.xp,
    state.level,
    state.streak,
    state.lastPlayedDate,
    state.completedScenarios,
    state.currentScores,
    state.sessionLog,
    state.dailyMissions,
  ])

  const actions = {
    startScenario:      (scenario, character) => dispatch({ type: 'START_SCENARIO', scenario, character }),
    addDialogueEntry:   (entry)  => dispatch({ type: 'ADD_DIALOGUE_ENTRY', entry }),
    addScoreEntry:      (entry)  => dispatch({ type: 'ADD_SCORE_ENTRY', entry }),
    updateScores:       (scores) => dispatch({ type: 'UPDATE_SCORES', scores }), // legacy alias
    saveSession:        ()       => dispatch({ type: 'SAVE_SESSION' }),
    saveAlienSession:   (summary) => dispatch({ type: 'SAVE_ALIEN_SESSION', summary }),
    tickMissions:       (event)  => dispatch({ type: 'TICK_MISSIONS', event }),
    completeMission:    (missionId) => dispatch({ type: 'COMPLETE_MISSION', missionId }),
    setMood:            (mood)   => dispatch({ type: 'SET_MOOD', mood }),
    shiftMood:          (shift)  => dispatch({ type: 'SHIFT_MOOD', shift }),
    addXp:              (amount) => dispatch({ type: 'ADD_XP', amount }),
    setStreak:          (streak, date) => dispatch({ type: 'SET_STREAK', streak, date }),
    completeScenario:   (scenarioId)   => dispatch({ type: 'COMPLETE_SCENARIO', scenarioId }),
    endScenario:        ()       => dispatch({ type: 'END_SCENARIO' }),
    incrementHelp:      ()       => dispatch({ type: 'INCREMENT_HELP' }),
  }

  return (
    <GameStateContext.Provider value={{ state, actions }}>
      {children}
    </GameStateContext.Provider>
  )
}

export function useGameState() {
  const ctx = useContext(GameStateContext)
  if (!ctx) throw new Error('useGameState must be used within <GameStateProvider>')
  return ctx
}
