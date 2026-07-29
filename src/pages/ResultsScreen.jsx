import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import { useLang, resolveField } from '../context/LanguageContext.jsx'
import { calculateXpGain } from '../lib/progressionSystem.js'
import { updateStreak } from '../lib/progressionSystem.js'
import { tickMissions } from '../lib/dailyMissions.js'
import ScoreBreakdown from '../components/ScoreBreakdown.jsx'
import ScoreBar from '../components/ScoreBar.jsx'
import { useEffect, useRef, useState } from 'react'

export default function ResultsScreen() {
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { lang, t } = useLang()
  const { currentScenario, currentScores, connectionMood, streak, lastPlayedDate } = state

  // composite is stored directly on currentScores by ADD_SCORE_ENTRY
  const composite = currentScores.composite ?? 0

  const tier   = currentScenario?.difficultyTier ?? 'easy'
  const xpGain = calculateXpGain(composite, tier)

  // Track which missions were newly completed this session for UI display
  const [newlyCompleted, setNewlyCompleted] = useState([])
  const didInit = useRef(false)

  // Award XP, update streak, mark scenario complete, save session, tick missions — once on mount
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true

    actions.saveSession()
    actions.addXp(xpGain)
    const { streak: newStreak, date } = updateStreak(lastPlayedDate, streak)
    actions.setStreak(newStreak, date)
    if (currentScenario?.id) {
      actions.completeScenario(currentScenario.id)
    }

    // ── Compute which missions fire ──
    const isNewScenario = currentScenario?.id
      ? !state.completedScenarios.includes(currentScenario.id)
      : false

    const scenariosCompletedToday =
      (state.dailyMissions.scenariosCompletedToday ?? 0) + 1

    const scenarioEvent = {
      type: 'SCENARIO_COMPLETE',
      scenarioId:              currentScenario?.id,
      tier,
      isNewScenario,
      connectionMood,
      scenariosCompletedToday,
    }
    const scoreEvent = {
      type:   'SCORE_RECORDED',
      scores: currentScores,
    }

    const fired = [
      ...tickMissions(state.dailyMissions.missions, scenarioEvent),
      ...tickMissions(state.dailyMissions.missions, scoreEvent),
    ]
    const uniqueFired = [...new Set(fired)]

    actions.tickMissions(scenarioEvent)
    actions.tickMissions(scoreEvent)

    if (uniqueFired.length > 0) {
      const missionXp = uniqueFired.reduce((sum, id) => {
        const m = state.dailyMissions.missions.find(m => m.def.id === id)
        return sum + (m?.def.xpReward ?? 0)
      }, 0)
      if (missionXp > 0) actions.addXp(missionXp)

      setNewlyCompleted(
        uniqueFired.map(id => state.dailyMissions.missions.find(m => m.def.id === id)?.def).filter(Boolean)
      )
    }
  }, []) // eslint-disable-line

  const headline =
    composite >= 75 ? t('results.headlines.great') :
    composite >= 55 ? t('results.headlines.good')  :
    composite >= 35 ? t('results.headlines.practice') : t('results.headlines.tough')

  function handlePlayAgain() {
    actions.endScenario()
    navigate('/')
  }

  const missionXpTotal = newlyCompleted.reduce((s, d) => s + (d.xpReward ?? 0), 0)

  // Resolve scenario title bilingually
  const scenarioTitle = currentScenario
    ? resolveField(currentScenario.title, lang)
    : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-10 gap-6 max-w-lg mx-auto">
      <h2 className="text-3xl font-bold font-display text-coral text-center">{headline}</h2>

      {scenarioTitle && (
        <p className="text-sm text-warm-white opacity-50 text-center">{scenarioTitle}</p>
      )}

      <ScoreBar label={t('results.connection')} value={connectionMood} color="#D4A574" />

      <ScoreBreakdown scores={currentScores} />

      {/* ── XP earned ── */}
      <div
        className="rounded-2xl px-5 py-3 text-sm flex items-center gap-2"
        style={{ backgroundColor: 'rgba(78,205,196,0.12)', border: '1px solid rgba(78,205,196,0.25)' }}
      >
        <span className="text-teal-chrome font-semibold">+{xpGain} XP</span>
        <span className="text-warm-white opacity-60">{t('results.xpEarned')}</span>
      </div>

      {/* ── Daily mission completions ── */}
      {newlyCompleted.length > 0 && (
        <div className="w-full flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-center" style={{ color: '#D4A574', opacity: 0.7 }}>
            {t('results.dailyTasksDone')}
          </p>
          {newlyCompleted.map(def => (
            <div
              key={def.id}
              className="rounded-xl px-4 py-3 flex items-center justify-between gap-3"
              style={{ backgroundColor: 'rgba(212,165,116,0.10)', border: '1px solid rgba(212,165,116,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6.5" stroke="#D4A574" strokeOpacity="0.6" />
                  <path d="M4 7.5L6.2 9.5L10 5" stroke="#D4A574" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span className="text-sm text-warm-white opacity-80">
                  {t(`missions.${def.id}`) !== `missions.${def.id}` ? t(`missions.${def.id}`) : def.label}
                </span>
              </div>
              <span className="text-xs font-bold text-coral flex-shrink-0">+{def.xpReward} XP</span>
            </div>
          ))}
          {missionXpTotal > 0 && (
            <p className="text-xs text-center text-warm-white opacity-40 mt-1">
              {t('results.bonusXp')(missionXpTotal)}
            </p>
          )}
        </div>
      )}

      <div className="flex gap-4 mt-2">
        <button
          onClick={() => navigate('/growth')}
          className="px-5 py-3 rounded-xl border text-sm text-teal-chrome"
          style={{ borderColor: '#8A8FA3' }}
        >
          {t('results.growthReport')}
        </button>
        <button
          onClick={handlePlayAgain}
          className="px-5 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: '#D4A574', color: '#1A1D29' }}
        >
          {t('results.playAgain')}
        </button>
      </div>
    </div>
  )
}
