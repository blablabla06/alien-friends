import { useNavigate } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'
import scenarios from '../data/scenarios/index.js'
import characters from '../data/characters/index.js'

const TIERS = ['easy', 'medium', 'hard']
const TIER_LABELS = { easy: '🟢 Easy', medium: '🟡 Medium', hard: '🔴 Hard' }

export default function ScenarioSelectPage() {
  const navigate = useNavigate()
  const { actions } = useGameState()

  const grouped = TIERS.reduce((acc, t) => {
    acc[t] = scenarios.filter(s => s.difficultyTier === t)
    return acc
  }, {})

  function handleSelect(scenario) {
    const character = characters[scenario.npcRef]
    actions.startScenario(scenario, character)
    navigate(`/intro/${scenario.id}`)
  }

  return (
    <div className="min-h-screen px-5 py-10 max-w-lg mx-auto">
      <button
        onClick={() => navigate('/')}
        className="text-sm text-teal-chrome mb-6 block hover:underline"
      >
        ← Back
      </button>

      <h2 className="text-3xl font-bold font-display text-coral mb-8 text-center">
        Choose a Scenario
      </h2>

      {TIERS.map(tier => (
        <section key={tier} className="mb-8">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-teal-chrome mb-3">
            {TIER_LABELS[tier]}
          </h3>
          <div className="flex flex-col gap-3">
            {grouped[tier].map(scenario => (
              <button
                key={scenario.id}
                onClick={() => handleSelect(scenario)}
                className="w-full text-left px-5 py-4 rounded-xl border transition-all hover:scale-[1.02] hover:border-coral/50"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderColor: 'rgba(255,255,255,0.1)',
                }}
              >
                <div className="font-semibold font-display text-warm-white">
                  {scenario.title}
                </div>
                <div className="text-xs mt-1 text-warm-white opacity-50">
                  {scenario.locationRef?.split('.')[0]}
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
