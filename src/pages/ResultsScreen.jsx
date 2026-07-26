import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { calculateXpGain } from '../lib/progressionSystem.js'
import { updateStreak } from '../lib/progressionSystem.js'
import ScoreBreakdown from '../components/ScoreBreakdown.jsx'
import ScoreBar from '../components/ScoreBar.jsx'
import { useEffect } from 'react'

export default function ResultsScreen() {
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { currentScenario, currentScores, connectionMood, xp, level, streak, lastPlayedDate } = state

  // composite is stored directly on currentScores by ADD_SCORE_ENTRY
  const composite = currentScores.composite ?? 0
  const { scoringHistory } = state

  const tier = currentScenario?.difficultyTier ?? 'easy'
  const xpGain = calculateXpGain(composite, tier)

  // Award XP, update streak, and mark scenario complete — once on mount
  useEffect(() => {
    actions.addXp(xpGain)
    const { streak: newStreak, date } = updateStreak(lastPlayedDate, streak)
    actions.setStreak(newStreak, date)
    if (currentScenario?.id) {
      actions.completeScenario(currentScenario.id)
    }
  }, []) // eslint-disable-line

  const headline =
    composite >= 75 ? 'Great connection!' :
    composite >= 55 ? 'Good effort!'      :
    composite >= 35 ? 'Keep practising!'  : 'That was tough — try again?'

  function handlePlayAgain() {
    actions.endScenario()
    navigate('/select')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6 max-w-lg mx-auto">
      <h2 className="text-3xl font-bold font-display text-coral text-center">{headline}</h2>

      {currentScenario && (
        <p className="text-sm text-warm-white opacity-50 text-center">{currentScenario.title}</p>
      )}

      <ScoreBar label="Connection" value={connectionMood} color="#FF8B5E" />

      <ScoreBreakdown scores={currentScores} />

      <div
        className="rounded-2xl px-5 py-3 text-sm flex items-center gap-2"
        style={{ backgroundColor: 'rgba(78,205,196,0.12)', border: '1px solid rgba(78,205,196,0.25)' }}
      >
        <span className="text-teal-chrome font-semibold">+{xpGain} XP</span>
        <span className="text-warm-white opacity-60">earned this session</span>
      </div>

      <div className="flex gap-4 mt-2">
        <button
          onClick={() => navigate('/growth')}
          className="px-5 py-3 rounded-xl border text-sm text-teal-chrome"
          style={{ borderColor: '#4ECDC4' }}
        >
          Growth Report
        </button>
        <button
          onClick={handlePlayAgain}
          className="px-5 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
        >
          Play Again
        </button>
      </div>
    </div>
  )
}
