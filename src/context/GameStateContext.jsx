import { createContext, useContext, useEffect, useReducer } from 'react'
import { loadProgress, saveProgress } from '../lib/persistence.js'

// ─── initial state ────────────────────────────────────────────────────────────

// Load persisted progress once at module evaluation time.
// (Safe: this file is only evaluated in the browser.)
const persisted = loadProgress()

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
      }
    }

    case 'END_SCENARIO':
      return { ...state, currentScenario: null, currentCharacter: null }

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
    })
  }, [
    state.xp,
    state.level,
    state.streak,
    state.lastPlayedDate,
    state.completedScenarios,
    state.currentScores,
  ])

  const actions = {
    startScenario:      (scenario, character) => dispatch({ type: 'START_SCENARIO', scenario, character }),
    addDialogueEntry:   (entry)  => dispatch({ type: 'ADD_DIALOGUE_ENTRY', entry }),
    addScoreEntry:      (entry)  => dispatch({ type: 'ADD_SCORE_ENTRY', entry }),
    updateScores:       (scores) => dispatch({ type: 'UPDATE_SCORES', scores }), // legacy alias
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
