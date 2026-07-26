import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameState } from '../context/GameStateContext.jsx'

/**
 * Dedicated route for the scenario intro / story-plot screen.
 * Route: /intro/:scenarioId
 *
 * Replaces the StoryIntroOverlay that was rendered inside DialogueScreen.
 * Being a full route means DialogueScreen never mounts until the player
 * explicitly taps "Start Conversation" — eliminating the flash entirely.
 */
export default function ScenarioIntroPage() {
  const { scenarioId } = useParams()
  const navigate = useNavigate()
  const { state, actions } = useGameState()
  const { currentScenario: scenario, currentCharacter: character, connectionMood } = state

  // Guard: if context has no scenario loaded (e.g. direct URL access or
  // page refresh), send the player back to the select screen.
  useEffect(() => {
    if (!scenario || scenario.id !== scenarioId) {
      navigate('/select', { replace: true })
    }
  }, [scenario, scenarioId, navigate])

  if (!scenario || !character) return null

  const overlayColor =
    connectionMood >= 60
      ? 'rgba(255,139,94,0.18)'
      : connectionMood <= 35
      ? 'rgba(78,205,196,0.10)'
      : 'rgba(120,100,200,0.13)'

  function handleBack() {
    // Clear scenario from context so no stale state leaks back to /select.
    // No XP, scores, or dialogue were touched — conversation never started.
    actions.endScenario()
    navigate('/select', { replace: true })
  }

  function handleStart() {
    // Navigate to the dialogue route. DialogueScreen will pick up the
    // scenario already loaded in context and fire the opening line.
    navigate(`/dialogue/${scenarioId}`, { replace: true })
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center px-6"
      style={{ backgroundColor: '#1A1B3A' }}
    >
      {/* Mood overlay tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundColor: overlayColor, transition: 'background-color 0.6s ease' }}
      />

      <div className="relative z-10 max-w-sm w-full flex flex-col gap-6 text-center">
        {/* Back button — above tier badge */}
        <button
          onClick={handleBack}
          className="self-start flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
          style={{ color: '#4ECDC4', opacity: 0.75 }}
        >
          ← Back
        </button>

        {/* Tier badge */}
        <span
          className="self-center text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: '#4ECDC4' }}
        >
          {scenario.difficultyTier}
        </span>

        {/* Title */}
        <h1
          className="text-2xl font-bold leading-snug"
          style={{ color: '#F5F0E8', fontFamily: 'Quicksand, Nunito, sans-serif' }}
        >
          {scenario.title}
        </h1>

        {/* Location */}
        <p className="text-xs italic" style={{ color: '#F5F0E8', opacity: 0.45 }}>
          {scenario.locationRef}
        </p>

        {/* Divider */}
        <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />

        {/* Story plot */}
        <p
          className="text-sm leading-relaxed"
          style={{ color: '#F5F0E8', opacity: 0.82 }}
        >
          {scenario.storyPlot ?? scenario.setup}
        </p>

        {/* Primary CTA */}
        <button
          onClick={handleStart}
          className="w-full py-3 rounded-2xl text-sm font-semibold mt-2"
          style={{ backgroundColor: '#FF8B5E', color: '#1A1B3A' }}
        >
          Start Conversation →
        </button>
      </div>
    </div>
  )
}
